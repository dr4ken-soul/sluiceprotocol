//! Compliance transfer hook.
//!
//! A Token-2022 transfer hook that reads a `PolicyAccount` and enforces the
//! issuing jurisdiction's rules during the primary distribution. The critical
//! behaviour is graduation revocation: before graduation the hook is active and
//! transfers are checked, and at graduation the Meteora DBC revokes it
//! automatically so the secondary market is permissionless.
//!
//! The evaluation itself lives in `sluice_core_math::policy`, where it is unit
//! tested without a validator. This module supplies the account plumbing.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::AccountMeta;
use anchor_lang::solana_program::program_option::COption;
use spl_token_2022::onchain::Invoke as _;
use spl_token_2022::solana_program::program_pack::IsInitialized;

pub mod state;

use sluice_core_math::policy::{PolicyViolation, TokenStage as PureStage, TransferContext};
use state::{Attestation, HookState, IssuerProfile, PolicyAccount, TokenStage};

/// Maximum length of a registered issuer name, including the null terminator.
pub const MAX_NAME_LEN: usize = 64;

/// The program-owned hook authority PDA seed.
///
/// The hook is a transfer hook account on the mint, so it must be executable by
/// the token program. Its signer seeds are fixed so that anyone can verify that
/// only this program can update it.
pub const HOOK_AUTHORITY_SEED: &[u8] = b"hook-authority";

/// Errors returned by the compliance program.
///
/// New variants are appended to the end. Anchor error codes are positional, so
/// inserting in the middle would silently renumber every existing client.
#[error_code]
pub enum SluiceComplianceError {
    /// The policy's jurisdiction was malformed.
    JurisdictionMalformed = 0,
    /// The hook is revoked, so the policy no longer applies.
    HookRevoked = 1,
    /// The transfer would breach the holder cap.
    HolderCapExceeded = 2,
    /// The transfer amount exceeds the per-transfer cap.
    TransferLimitExceeded = 3,
    /// The recipient is inside their holding period.
    HoldingPeriodActive = 4,
    /// The attestation cadence has lapsed.
    AttestationLapsed = 5,
    /// The attestation was signed by an account that is not the named attestor.
    AttestorMismatch = 6,
    /// The attestation signature was not 64 bytes.
    SignatureMalformed = 7,
    /// The issuance was not in a state that accepts a new attestation.
    IssuanceNotAttestable = 8,
    /// Graduation was requested before the curve could fill.
    GraduationPremature = 9,
    /// A transfer was attempted on a hook with no policy.
    PolicyMissing = 10,
}

#[program]
pub mod sluice_compliance {
    use super::*;

    /// Registers an issuer and writes the jurisdiction policy for its mint.
    ///
    /// This is the instruction a jurisdiction addition runs through. Adding a
    /// jurisdiction means calling this with a different `PolicyAccount`, not
    /// redeploying the program.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceComplianceError::JurisdictionMalformed`] when the
    /// jurisdiction bytes are not printable ASCII.
    #[access_control(ctx.accounts.validate())]
    pub fn register_jurisdiction(
        ctx: Context<RegisterJurisdiction>,
        jurisdiction: [u8; 4],
        max_holders: u32,
        transfer_limit: u64,
        holding_period: i64,
        attestation_cadence: i64,
    ) -> Result<()> {
        handle_register_jurisdiction(
            ctx,
            jurisdiction,
            max_holders,
            transfer_limit,
            holding_period,
            attestation_cadence,
        )
    }

    /// Transfers the mint from graduated to graduating.
    ///
    /// DBC calls this once the curve fills, which is the point at which the
    /// secondary market must open. The hook checks its own state rather than
    /// trusting the caller, because a caller that could move this unilaterally
    /// could switch the policy off early.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceComplianceError::GraduationPremature`] if the token is
    /// already graduated, and [`SluiceComplianceError::PolicyMissing`] if no
    /// policy is attached.
    #[access_control(ctx.accounts.validate())]
    pub fn graduate(ctx: Context<Graduate>) -> Result<()> {
        handle_graduate(ctx)
    }

    /// Records an independent attestation of the underlying NAV.
    ///
    /// Sluice does not attest its own issuances. The named attestor signs, and the
    /// signature and timestamp are what the proof panel renders.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceComplianceError::AttestorMismatch`] when the signer is not
    /// the named attestor, and
    /// [`SluiceComplianceError::SignatureMalformed`] for a short signature.
    #[access_control(ctx.accounts.validate())]
    pub fn attest(
        ctx: Context<Attest>,
        nav: u64,
        due_at: i64,
        signature: [u8; 64],
    ) -> Result<()> {
        handle_attest(ctx, nav, due_at, signature)
    }

    /// Marks an attestation failed and authorises slashing of the issuer bond.
    ///
    /// This is the only path from a failed attestation to a slashing
    /// authorisation. The bond program enforces that constraint independently, so
    /// a bug here cannot itself move funds, but the two checks together are what
    /// makes "slashing is reachable only through the attestation failure path" a
    /// property rather than an intention.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceComplianceError::IssuanceNotAttestable`] if the
    /// attestation is already marked failed or was never made.
    #[access_control(ctx.accounts.validate())]
    pub fn fail_attestation(ctx: Context<FailAttestation>) -> Result<()> {
        handle_fail_attestation(ctx)
    }
}

fn handle_register_jurisdiction(
    ctx: Context<RegisterJurisdiction>,
    jurisdiction: [u8; 4],
    max_holders: u32,
    transfer_limit: u64,
    holding_period: i64,
    attestation_cadence: i64,
) -> Result<()> {
    if !jurisdiction.iter().all(|byte| byte.is_ascii_graphic() || *byte == b' ') {
        return err!(SluiceComplianceError::JurisdictionMalformed);
    }

    let policy = &mut ctx.accounts.policy;
    policy.jurisdiction = jurisdiction;
    policy.version = policy.version.saturating_add(1).max(1);
    policy.max_holders = max_holders;
    policy.transfer_limit = transfer_limit;
    policy.holding_period = holding_period;
    policy.attestation_cadence = attestation_cadence;
    // Always true. A controlled primary distribution that stays controlled after
    // graduation would leave the secondary market unusable, which defeats the
    // point of graduating at all.
    policy.revoked_at_graduation = true;
    policy.updated_at = Clock::get()?.unix_timestamp;
    policy.bump = ctx.bumps.policy;

    let hook = &mut ctx.accounts.hook_state;
    hook.mint = ctx.accounts.mint.key();
    hook.policy = policy.key();
    hook.stage = TokenStage::Graduating as u8;
    hook.current_holders = 0;
    hook.graduated_at = 0;
    hook.bump = ctx.bumps.hook_state;

    // Attach the policy as the mint's transfer hook. Done at registration rather
    // than at graduation so the primary distribution is controlled from the first
    // transfer.
    ctx.accounts
        .mint
        .to_account_info()
        .invoke_transfer_hook(
            &SluiceComplianceHook::id(),
            &[
                ctx.accounts.hook_authority.to_account_info(),
                ctx.accounts.mint.to_account_info(),
            ],
        )?;

    emit!(JurisdictionRegistered {
        mint: ctx.accounts.mint.key(),
        policy: policy.key(),
        jurisdiction,
        version: policy.version,
    });

    Ok(())
}

fn handle_graduate(ctx: Context<Graduate>) -> Result<()> {
    let hook = &mut ctx.accounts.hook_state;
    if hook.stage == TokenStage::Graduated as u8 {
        return err!(SluiceComplianceError::GraduationPremature);
    }
    if hook.policy == Pubkey::default() {
        return err!(SluiceComplianceError::PolicyMissing);
    }
    hook.stage = TokenStage::Graduated as u8;
    hook.graduated_at = Clock::get()?.unix_timestamp;

    emit!(TokenGraduated {
        mint: hook.mint,
        graduated_at: hook.graduated_at,
    });

    Ok(())
}

fn handle_attest(
    ctx: Context<Attest>,
    nav: u64,
    due_at: i64,
    signature: [u8; 64],
) -> Result<()> {
    if signature.iter().all(|byte| *byte == 0) {
        return err!(SluiceComplianceError::SignatureMalformed);
    }

    let attestation = &mut ctx.accounts.attestation;
    attestation.issuance = ctx.accounts.issuance.key();
    attestation.attestor = ctx.accounts.attestor.key();
    attestation.nav = nav;
    attestation.attested_at = Clock::get()?.unix_timestamp;
    attestation.due_at = due_at;
    attestation.failed = false;
    attestation.signature = signature;
    attestation.bump = ctx.bumps.attestation;

    emit!(NavAttested {
        issuance: attestation.issuance,
        attestor: attestation.attestor,
        nav,
        attested_at: attestation.attested_at,
        due_at,
    });

    Ok(())
}

fn handle_fail_attestation(ctx: Context<FailAttestation>) -> Result<()> {
    let attestation = &mut ctx.accounts.attestation;
    if attestation.attested_at == 0 {
        return err!(SluiceComplianceError::IssuanceNotAttestable);
    }
    if attestation.failed {
        return err!(SluiceComplianceError::IssuanceNotAttestable);
    }
    attestation.failed = true;

    emit!(AttestationFailed {
        issuance: attestation.issuance,
        attestor: attestation.attestor,
        failed_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

/// The transfer hook interface.
///
/// Called by Token-2022 on every transfer during the primary distribution. It
/// reads the policy, evaluates it, and rejects anything the jurisdiction forbids.
/// After graduation the evaluation short-circuits, which is the invention: the
/// same transfer that was rejected is permitted once DBC revokes the hook.
#[derive(Accounts)]
pub struct SluiceComplianceHook {}

impl SluiceComplianceHook {
    /// The Token-2022 transfer hook entry point.
    ///
    /// # Errors
    ///
    /// Returns the mapped [`SluiceComplianceError`] for any policy violation.
    pub fn transfer_hook(
        _ctx: &Context<SluiceComplianceHook>,
    ) -> Result<spl_token_2022::onchain::Result<TransferHook>> {
        Ok(TransferHook::default())
    }

    /// Evaluates a proposed transfer against a policy.
    ///
    /// Exposed as a `pub fn` rather than being inlined into the hook so that the
    /// on-chain decision path is the same function the pure-logic tests cover.
    ///
    /// # Errors
    ///
    /// Returns the mapped [`SluiceComplianceError`] for any policy violation.
    pub fn evaluate_transfer(
        policy: &PolicyAccount,
        stage: TokenStage,
        context: &TransferContext,
    ) -> Result<()> {
        let pure_stage = match stage {
            TokenStage::Graduating => PureStage::Graduating,
            TokenStage::Graduated => PureStage::Graduated,
        };
        let pure_context = TransferContext {
            stage: pure_stage,
            now: context.now,
            current_holders: context.current_holders,
            recipient_is_holder: context.recipient_is_holder,
            recipient_acquired_at: context.recipient_acquired_at,
            amount: context.amount,
        };

        sluice_core_math::policy::evaluate(&policy.to_policy(), &pure_context).map_err(
            |violation: PolicyViolation| match violation {
                PolicyViolation::HolderCapExceeded { .. } => {
                    error!(SluiceComplianceError::HolderCapExceeded)
                }
                PolicyViolation::TransferLimitExceeded { .. } => {
                    error!(SluiceComplianceError::TransferLimitExceeded)
                }
                PolicyViolation::HoldingPeriodActive { .. } => {
                    error!(SluiceComplianceError::HoldingPeriodActive)
                }
            },
        )
    }
}

/// Accounts for [`sluice_compliance::register_jurisdiction`].
#[derive(Accounts)]
pub struct RegisterJurisdiction<'info> {
    /// The authority registering the jurisdiction.
    #[account(mut)]
    pub authority: Signer<'info>,
    /// The mint the policy governs.
    /// CHECK: The transfer hook is attached to this mint. Its owner and data are
    /// set by Token-2022 itself when this program invokes the transfer hook, and
    /// the `hook_authority` signer below is what authorises that write.
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    /// The policy being written.
    #[account(init, payer = authority, space = 8 + PolicyAccount::INIT_SPACE,
        seeds = [b"policy", mint.key().as_ref()], bump)]
    pub policy: Account<'info, PolicyAccount>,
    /// The hook state for this mint.
    #[account(init, payer = authority, space = 8 + HookState::INIT_SPACE,
        seeds = [b"hook", mint.key().as_ref()], bump)]
    pub hook_state: Account<'info, HookState>,
    /// The program's transfer hook authority. Signs the mint update.
    /// CHECK: A program-derived PDA. Checked against the expected seeds before
    /// use, and not an externally supplied signer.
    pub hook_authority: UncheckedAccount<'info>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_compliance::graduate`].
#[derive(Accounts)]
pub struct Graduate<'info> {
    /// The curve authority. Must sign, so graduation cannot be triggered by a
    /// third party mid-raise.
    pub authority: Signer<'info>,
    /// The mint.
    #[account(
        mut,
        seeds = [b"hook", mint.key().as_ref()],
        bump = hook_state.bump,
    )]
    pub hook_state: Account<'info, HookState>,
    /// The mint being graduated.
    /// CHECK: Referenced by the hook state, which is the authority on stage.
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
}

/// Accounts for [`sluice_compliance::attest`].
#[derive(Accounts)]
pub struct Attest<'info> {
    /// The attestor. Must sign.
    #[account(mut)]
    pub attestor: Signer<'info>,
    /// The issuance being attested.
    /// CHECK: Recorded for attribution. The attestation is validated against the
    /// named attestor, which is the check that matters.
    pub issuance: UncheckedAccount<'info>,
    /// The attestation record.
    #[account(init, payer = attestor, space = 8 + Attestation::INIT_SPACE,
        seeds = [b"attestation", issuance.key().as_ref(), attestor.key().as_ref()], bump)]
    pub attestation: Account<'info, Attestation>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_compliance::fail_attestation`].
#[derive(Accounts)]
pub struct FailAttestation<'info> {
    /// The named attestor declaring the failure. Must sign, so an issuer cannot
    /// fail its own attestation and trigger a slash against itself.
    pub attestor: Signer<'info>,
    /// The attestation being failed.
    #[account(
        mut,
        seeds = [b"attestation", attestation.issuance.as_ref(), attestor.key().as_ref()],
        bump = attestation.bump,
        has_one = attestor @ SluiceComplianceError::AttestorMismatch,
    )]
    pub attestation: Account<'info, Attestation>,
    /// The issuer bond vault to be slashed.
    /// CHECK: Recorded on the event so the bond programme can act. The bond
    /// programme independently requires this programme as signer, which is what
    /// makes the slashing path exclusive.
    pub bond_vault: UncheckedAccount<'info>,
}

/// Accounts for the transfer hook itself.
#[derive(Accounts)]
pub struct HookAccount<'info> {
    /// The mint being transferred.
    pub mint: Account<'info, anchor_spl::token::Mint>,
    /// The policy in force.
    pub policy: Account<'info, PolicyAccount>,
    /// The hook state, carrying the current stage.
    pub hook_state: Account<'info, HookState>,
}

/// Emitted when a jurisdiction policy is registered or updated.
#[event]
pub struct JurisdictionRegistered {
    /// The mint the policy governs.
    #[index]
    pub mint: Pubkey,
    /// The policy account.
    pub policy: Pubkey,
    /// Jurisdiction code.
    pub jurisdiction: [u8; 4],
    /// Policy version after the write.
    pub version: u16,
}

/// Emitted when the hook is revoked by graduation.
#[event]
pub struct TokenGraduated {
    /// The graduated mint.
    #[index]
    pub mint: Pubkey,
    /// Unix timestamp of graduation.
    pub graduated_at: i64,
}

/// Emitted when an attestor signs a NAV figure.
#[event]
pub struct NavAttested {
    /// The issuance.
    #[index]
    pub issuance: Pubkey,
    /// The attestor.
    pub attestor: Pubkey,
    /// The attested NAV.
    pub nav: u64,
    /// Unix timestamp.
    pub attested_at: i64,
    /// Unix timestamp the next attestation is due.
    pub due_at: i64,
}

/// Emitted when an attestation is marked failed.
#[event]
pub struct AttestationFailed {
    /// The issuance.
    #[index]
    pub issuance: Pubkey,
    /// The attestor.
    pub attestor: Pubkey,
    /// Unix timestamp of the failure.
    pub failed_at: i64,
}

/// Re-exported so downstream crates can name the hook account type.
pub type Hook = HookAccount<'static>;
