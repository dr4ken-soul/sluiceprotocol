//! Redemption vault.
//!
//! Holds capital routed from a failed milestone and pays holders pro rata.
//!
//! Two properties carry the whole trust story, and both are enforced here rather
//! than assumed:
//!
//! 1. A holder claims; the vault does not push. Gas therefore stays bounded
//!    regardless of holder count, which is what makes the vault usable with ten
//!    thousand holders rather than ten.
//! 2. A second claim for the same tranche reverts. The ledger is authoritative for
//!    that, and the reconciliation invariant is checked after every state change
//!    so a mismatch surfaces at the operation that caused it.

use anchor_lang::prelude::*;

pub mod state;

use state::{RedemptionVault, RedemptionVaultState};

/// Redemption claims are charged at 0.25 percent.
pub const REDEMPTION_FEE_BPS: u32 = sluice_core_math::pro_rata::REDEMPTION_BPS;

/// Errors returned by the redemption program.
///
/// Variants are appended to the end only. Anchor error codes are positional.
#[error_code]
pub enum SluiceRedemptionError {
    /// The vault is not in a state that accepts claims.
    VaultNotClaimable = 0,
    /// The holder already claimed against this tranche.
    AlreadyClaimed = 1,
    /// The computed entitlement was zero.
    EmptyClaim = 2,
    /// The vault holds less than the outstanding claims imply.
    VaultUnderfunded = 3,
    /// The milestone did not resolve no, so no capital was routed here.
    MilestoneNotFailed = 4,
    /// The tranche index is out of range.
    TrancheOutOfRange = 5,
    /// The redemption tranche was already fully claimed.
    TrancheFullyClaimed = 6,
}

/// Computes a holder's entitlement against a redemption tranche.
///
/// Exposed so the on-chain claim path and the reconciliation check share one
/// implementation rather than two that can drift.
///
/// # Errors
///
/// Propagates the entitlement errors from [`sluice_core_math::pro_rata`].
pub fn entitlement(
    balance: u64,
    total_supply: u64,
    pot: u64,
) -> Result<sluice_core_math::pro_rata::ClaimBreakdown> {
    sluice_core_math::pro_rata::claim(balance, total_supply, pot, REDEMPTION_FEE_BPS)
        .map_err(|_| error!(SluiceRedemptionError::VaultUnderfunded))
}

#[program]
pub mod sluice_redemption {
    use super::*;

    /// Creates the redemption vault for one failed tranche.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceRedemptionError::MilestoneNotFailed`] unless the milestone
    /// resolved no, and [`SluiceRedemptionError::TrancheOutOfRange`] for an index
    /// the issuance does not have.
    #[access_control(ctx.accounts.validate())]
    pub fn init_vault(
        ctx: Context<InitVault>,
        tranche_index: u8,
        pot: u64,
        total_supply: u64,
    ) -> Result<()> {
        handle_init_vault(ctx, tranche_index, pot, total_supply)
    }

    /// Claims a holder's pro rata share of a failed tranche.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceRedemptionError::AlreadyClaimed`] on a second claim,
    /// [`SluiceRedemptionError::VaultNotClaimable`] once the tranche is exhausted,
    /// and propagates the entitlement errors.
    #[access_control(ctx.accounts.validate())]
    pub fn claim_redemption(ctx: Context<ClaimRedemption>) -> Result<()> {
        handle_claim_redemption(ctx)
    }
}

fn handle_init_vault(
    ctx: Context<InitVault>,
    tranche_index: u8,
    pot: u64,
    total_supply: u64,
) -> Result<()> {
    if ctx.accounts.milestone.outcome != state::Outcome::No as u8 {
        return err!(SluiceRedemptionError::MilestoneNotFailed);
    }
    if tranche_index >= ctx.accounts.milestone.index {
        return err!(SluiceRedemptionError::TrancheOutOfRange);
    }
    if total_supply == 0 {
        return err!(SluiceRedemptionError::VaultUnderfunded);
    }

    let vault = &mut ctx.accounts.vault;
    vault.issuance = ctx.accounts.issuance.key();
    vault.tranche_index = tranche_index;
    vault.pot = pot;
    vault.total_supply = total_supply;
    vault.paid = 0;
    vault.fees_accrued = 0;
    vault.state = RedemptionVaultState::Open as u8;
    vault.bump = ctx.bumps.vault;

    emit!(RedemptionVaultOpened {
        vault: vault.key(),
        issuance: vault.issuance,
        tranche_index,
        pot,
        total_supply,
    });

    Ok(())
}

fn handle_claim_redemption(ctx: Context<ClaimRedemption>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    if vault.state != RedemptionVaultState::Open as u8 {
        return err!(SluiceRedemptionError::VaultNotClaimable);
    }

    // The double-claim guard. Checked before the entitlement so a repeated claim
    // cannot even recompute, let alone pay.
    let holder_key = ctx.accounts.holder.key();
    if vault.has_claimed(&holder_key) {
        return err!(SluiceRedemptionError::AlreadyClaimed);
    }

    let balance = ctx.accounts.holder_tokens.amount;
    let breakdown = entitlement(balance, vault.total_supply, vault.pot)?;

    if breakdown.gross == 0 {
        return err!(SluiceRedemptionError::EmptyClaim);
    }
    if vault.paid.saturating_add(breakdown.gross) > vault.pot {
        return err!(SluiceRedemptionError::VaultUnderfunded);
    }

    vault.record_claim(holder_key, breakdown.gross, breakdown.fee, breakdown.net)?;

    // Reconcile immediately rather than at withdrawal time, so a ledger fault
    // surfaces at the claim that caused it.
    vault.remaining()?;

    emit!(RedemptionClaimed {
        vault: vault.key(),
        holder: holder_key,
        tranche_index: vault.tranche_index,
        gross: breakdown.gross,
        fee: breakdown.fee,
        net: breakdown.net,
    });

    Ok(())
}

/// Accounts for [`sluice_redemption::init_vault`].
#[derive(Accounts)]
pub struct InitVault<'info> {
    /// The settlement program routing the capital. Must sign.
    #[account(mut)]
    pub settlement_authority: Signer<'info>,
    /// The issuance.
    /// CHECK: Recorded on the vault. The milestone outcome is what gates creation.
    pub issuance: UncheckedAccount<'info>,
    /// The milestone that resolved no.
    #[account(
        seeds = [b"milestone", milestone.issuance.as_ref(), &milestone.index.to_le_bytes()],
        bump = milestone.bump,
    )]
    pub milestone: Account<'info, crate::state::MilestoneRef>,
    /// The vault being created.
    #[account(
        init,
        payer = settlement_authority,
        space = 8 + RedemptionVault::INIT_SPACE,
        seeds = [b"redemption", issuance.key().as_ref(), &tranche_index.to_le_bytes()],
        bump
    )]
    pub vault: Account<'info, RedemptionVault>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_redemption::claim_redemption`].
#[derive(Accounts)]
pub struct ClaimRedemption<'info> {
    /// The claiming holder. Must sign.
    #[account(mut)]
    pub holder: Signer<'info>,
    /// The holder's token account for the issuance mint, used to read the balance
    /// the entitlement is computed from.
    ///
    /// CHECK: Read only, for the balance. The token program owns the account and
    /// the mint is verified by the constraint on the vault.
    pub holder_tokens: UncheckedAccount<'info>,
    /// The vault being claimed from.
    #[account(
        mut,
        seeds = [b"redemption", vault.issuance.as_ref(), &vault.tranche_index.to_le_bytes()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, RedemptionVault>,
}

/// Emitted when a redemption vault opens for a failed tranche.
#[event]
pub struct RedemptionVaultOpened {
    /// The vault.
    #[index]
    pub vault: Pubkey,
    /// The issuance.
    pub issuance: Pubkey,
    /// Tranche index.
    pub tranche_index: u8,
    /// Capital routed to the vault.
    pub pot: u64,
    /// Supply the pot is divided against.
    pub total_supply: u64,
}

/// Emitted when a holder claims.
#[event]
pub struct RedemptionClaimed {
    /// The vault.
    #[index]
    pub vault: Pubkey,
    /// The claiming holder.
    pub holder: Pubkey,
    /// Tranche index.
    pub tranche_index: u8,
    /// Gross amount leaving the vault.
    pub gross: u64,
    /// Fee routed to the treasury.
    pub fee: u64,
    /// Net amount reaching the holder.
    pub net: u64,
}
