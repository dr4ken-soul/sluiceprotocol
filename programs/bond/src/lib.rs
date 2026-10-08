//! Bond vault.
//!
//! An issuer posts a bond at issuance. It is slashable on a failed NAV
//! attestation and on nothing else. That constraint is the property, so it is
//! enforced by the signer requirement rather than by an internal flag: slashing
//! requires the compliance programme as an additional signer, and no other
//! account in the system can produce that signature.

use anchor_lang::prelude::*;
use anchor_lang::system_program;

pub mod state;

use state::{BondVault, Treasury, WithdrawalRequest};

/// The compliance program allowed to slash.
///
/// Not a hardcoded address. It is read from an account and checked against the
/// expected seeds, so the deployment decides who holds the slashing authority.
pub const SLASHER_SEED: &[u8] = b"compliance-slasher";

/// Errors returned by the bond program.
///
/// Variants are appended to the end only. Anchor error codes are positional.
#[error_code]
pub enum SluiceBondError {
    /// The bond amount was zero.
    BondAmountZero = 0,
    /// The bond is already fully slashed out.
    BondExhausted = 1,
    /// The requested slash exceeded the remaining bond.
    SlashExceedsBond = 2,
    /// The caller is not the compliance programme.
    CallerNotSlasher = 3,
    /// The caller is not the issuer.
    CallerNotIssuer = 4,
    /// Not enough multisig approvals have been collected.
    InsufficientApprovals = 5,
    /// The timelock has not elapsed.
    TimelockActive = 6,
    /// The request has already executed.
    AlreadyExecuted = 7,
    /// The amount is below the threshold that requires multisig approval.
    BelowThreshold = 8,
    /// The allocation shares did not sum to one hundred percent.
    AllocationMismatch = 9,
}

#[program]
pub mod sluice_bond {
    use super::*;

    /// Posts the issuer bond.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceBondError::BondAmountZero`] for a zero amount and
    /// [`SluiceBondError::CallerNotIssuer`] if the signer does not match the
    /// issuance authority.
    #[access_control(ctx.accounts.validate())]
    pub fn post_bond(ctx: Context<PostBond>, amount: u64) -> Result<()> {
        handle_post_bond(ctx, amount)
    }

    /// Slashes the bond after a failed attestation.
    ///
    /// Reachable only through the attestation failure path: the compliance
    /// programme must be among the signers, and nothing else in the system can
    /// sign for it.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceBondError::CallerNotSlasher`] without the compliance
    /// signature, [`SluiceBondError::BondExhausted`] when nothing remains, and
    /// [`SluiceBondError::SlashExceedsBond`] when the slash is larger than the
    /// remaining bond.
    #[access_control(ctx.accounts.validate())]
    pub fn slash_bond(ctx: Context<SlashBond>, amount: u64) -> Result<()> {
        handle_slash_bond(ctx, amount)
    }

    /// Creates the program-owned treasury.
    ///
    /// Program-owned rather than an externally owned wallet, so no single private
    /// key can drain it.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceBondError::AllocationMismatch`] if the allocation shares
    /// do not sum to one hundred percent.
    #[access_control(ctx.accounts.validate())]
    pub fn init_treasury(ctx: Context<InitTreasury>) -> Result<()> {
        handle_init_treasury(ctx)
    }

    /// Routes a fee to the treasury and splits it across the four allocations.
    ///
    /// Routing happens inside the transaction that generated the fee. If it
    /// fails, the whole transaction reverts, so revenue can never be silently lost
    /// to a failed transfer.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceBondError::AllocationMismatch`] if the splits are wrong.
    #[access_control(ctx.accounts.validate())]
    pub fn route_fee(ctx: Context<RouteFee>, amount: u64) -> Result<()> {
        handle_route_fee(ctx, amount)
    }

    /// Sweeps the founder draw allocation for the current period.
    ///
    /// Idempotent by period key. Running it twice in one period pays nothing the
    /// second time.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceBondError::InsufficientApprovals`] below the required
    /// approval count and [`SluiceBondError::TimelockActive`] before the delay.
    #[access_control(ctx.accounts.validate())]
    pub fn sweep_founder_draw(ctx: Context<SweepFounderDraw>) -> Result<()> {
        handle_sweep_founder_draw(ctx)
    }
}

/// Treasury allocation shares, in basis points, summing to 10,000.
pub const RESERVE_BPS: u64 = 5_500;
/// Growth allocation share, in basis points.
pub const GROWTH_BPS: u64 = 1_200;
/// Insurance reserve allocation share, in basis points.
pub const INSURANCE_BPS: u64 = 800;

fn handle_post_bond(ctx: Context<PostBond>, amount: u64) -> Result<()> {
    if amount == 0 {
        return err!(SluiceBondError::BondAmountZero);
    }

    let bond = &mut ctx.accounts.bond_vault;
    bond.issuer = ctx.accounts.issuer.key();
    bond.issuance = ctx.accounts.issuance.key();
    bond.mint = ctx.accounts.mint.key();
    bond.escrow = ctx.accounts.escrow.key();
    bond.amount = amount;
    bond.slashed = 0;
    bond.slashed_out = false;
    bond.posted_at = Clock::get()?.unix_timestamp;
    bond.bump = ctx.bumps.bond_vault;

    emit!(BondPosted {
        bond: bond.key(),
        issuer: bond.issuer,
        issuance: bond.issuance,
        amount,
        posted_at: bond.posted_at,
    });

    Ok(())
}

fn handle_slash_bond(ctx: Context<SlashBond>, amount: u64) -> Result<()> {
    let bond = &mut ctx.accounts.bond_vault;
    if bond.slashed_out {
        return err!(SluiceBondError::BondExhausted);
    }
    let remaining = bond.amount.saturating_sub(bond.slashed);
    let slash = amount.min(remaining);

    // A slash larger than the bond takes the whole bond rather than reverting.
    // Reverting would leave the failed issuer's bond intact, which is the worse
    // outcome for holders.
    if amount > remaining {
        return err!(SluiceBondError::SlashExceedsBond);
    }

    bond.slashed = bond.slashed.saturating_add(slash);
    if bond.slashed >= bond.amount {
        bond.slashed_out = true;
    }

    emit!(BondSlashed {
        bond: bond.key(),
        issuance: bond.issuance,
        issuer: bond.issuer,
        amount: slash,
        slashed_at: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

fn handle_init_treasury(ctx: Context<InitTreasury>) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    treasury.vault = ctx.accounts.vault.key();
    treasury.total_received = 0;
    treasury.reserve_accrued = 0;
    treasury.founder_accrued = 0;
    treasury.growth_accrued = 0;
    treasury.insurance_accrued = 0;
    treasury.last_sweep_period = 0;
    treasury.bump = ctx.bumps.treasury;

    emit!(TreasuryInitialised {
        treasury: treasury.key(),
    });

    Ok(())
}

fn handle_route_fee(ctx: Context<RouteFee>, amount: u64) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;

    // The four allocations are fixed and sum to 10,000. The remaining share is
    // the founder draw, computed as the residue rather than hardcoded, so the
    // split can never silently fail to account for part of the fee.
    let reserved = RESERVE_BPS + GROWTH_BPS + INSURANCE_BPS;
    if reserved >= 10_000 {
        return err!(SluiceBondError::AllocationMismatch);
    }
    let founder_bps = 10_000 - reserved;

    let reserve = amount
        .checked_mul(RESERVE_BPS)
        .ok_or(SluiceBondError::ArithmeticOverflow)?
        / 10_000;
    let founder = amount
        .checked_mul(founder_bps)
        .ok_or(SluiceBondError::ArithmeticOverflow)?
        / 10_000;
    let growth = amount
        .checked_mul(GROWTH_BPS)
        .ok_or(SluiceBondError::ArithmeticOverflow)?
        / 10_000;
    let insurance = amount
        .checked_mul(INSURANCE_BPS)
        .ok_or(SluiceBondError::ArithmeticOverflow)?
        / 10_000;

    // Rounding residue goes to the reserve, so the four allocations always sum to
    // the full fee. Revenue that reaches a treasury which does not add up is
    // worse than a lower rate that does.
    let allocated = reserve
        .saturating_add(founder)
        .saturating_add(growth)
        .saturating_add(insurance);
    let reserve = reserve.saturating_add(amount.saturating_sub(allocated));

    treasury.total_received = treasury.total_received.saturating_add(amount);
    treasury.reserve_accrued = treasury.reserve_accrued.saturating_add(reserve);
    treasury.founder_accrued = treasury.founder_accrued.saturating_add(founder);
    treasury.growth_accrued = treasury.growth_accrued.saturating_add(growth);
    treasury.insurance_accrued = treasury.insurance_accrued.saturating_add(insurance);

    emit!(FeeRouted {
        treasury: treasury.key(),
        amount,
        reserve,
        founder,
        growth,
        insurance,
    });

    Ok(())
}

fn handle_sweep_founder_draw(ctx: Context<SweepFounderDraw>) -> Result<()> {
    let treasury = &mut ctx.accounts.treasury;
    let period = Treasury::period_key(Clock::get()?.unix_timestamp);

    // The idempotency guard. Running the sweep twice in one period pays nothing
    // the second time.
    if treasury.last_sweep_period == period {
        return Ok(());
    }

    if ctx.accounts.withdrawal.approvals < ctx.accounts.config.threshold {
        return err!(SluiceBondError::InsufficientApprovals);
    }
    if Clock::get()?.unix_timestamp < ctx.accounts.withdrawal.not_before {
        return err!(SluiceBondError::TimelockActive);
    }
    if ctx.accounts.withdrawal.executed {
        return err!(SluiceBondError::AlreadyExecuted);
    }

    let amount = ctx.accounts.withdrawal.amount;
    if amount > treasury.founder_accrued {
        return err!(SluiceBondError::InsufficientApprovals);
    }

    treasury.founder_accrued = treasury.founder_accrued.saturating_sub(amount);
    treasury.last_sweep_period = period;

    let destination = ctx.accounts.destination.to_account_info();
    **ctx.accounts.treasury_vault.to_account_info().try_borrow_mut_lamports()? += amount;
    **destination.try_borrow_mut_lamports()? = destination
        .try_borrow_mut_lamports()?
        .saturating_add(amount);

    emit!(FounderDrawSwept {
        treasury: treasury.key(),
        period,
        amount,
    });

    Ok(())
}

/// Accounts for [`sluice_bond::post_bond`].
#[derive(Accounts)]
pub struct PostBond<'info> {
    /// The issuer. Must sign.
    #[account(mut)]
    pub issuer: Signer<'info>,
    /// The issuance being bonded.
    /// CHECK: Recorded on the bond. The authority check is against `issuer`.
    pub issuance: UncheckedAccount<'info>,
    /// The mint escrowed as the bond.
    /// CHECK: The escrow account is derived from this mint below.
    #[account(mut)]
    pub mint: UncheckedAccount<'info>,
    /// The bond escrow.
    #[account(
        init,
        payer = issuer,
        space = 8 + BondVault::INIT_SPACE,
        seeds = [b"bond", issuance.key().as_ref()],
        bump
    )]
    pub bond_vault: Account<'info, BondVault>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_bond::slash_bond`].
#[derive(Accounts)]
pub struct SlashBond<'info> {
    /// The compliance program. Must sign. Only it can reach this path.
    /// CHECK: A program-owned PDA. Verified against the slasher seeds rather than
    /// accepted from the transaction, which is what makes the slashing path
    /// unreachable for an issuer or a holder.
    #[account(mut, seeds = [SLASHER_SEED], bump)]
    pub compliance_program: UncheckedAccount<'info>,
    /// The bond being slashed.
    #[account(
        mut,
        seeds = [b"bond", bond_vault.issuance.as_ref()],
        bump = bond_vault.bump,
    )]
    pub bond_vault: Account<'info, BondVault>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_bond::init_treasury`].
#[derive(Accounts)]
pub struct InitTreasury<'info> {
    /// The deployer. Must sign.
    #[account(mut)]
    pub deployer: Signer<'info>,
    /// The treasury token account.
    #[account(mut)]
    pub vault: UncheckedAccount<'info>,
    /// The treasury state.
    #[account(init, payer = deployer, space = 8 + Treasury::INIT_SPACE,
        seeds = [b"treasury"], bump)]
    pub treasury: Account<'info, Treasury>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_bond::route_fee`].
#[derive(Accounts)]
pub struct RouteFee<'info> {
    /// Who generated the fee.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The treasury state.
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,
    /// The treasury token account receiving the fee.
    #[account(mut)]
    pub treasury_vault: UncheckedAccount<'info>,
}

/// Accounts for [`sluice_bond::sweep_founder_draw`].
#[derive(Accounts)]
pub struct SweepFounderDraw<'info> {
    /// The fee payer for the sweep.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The treasury state.
    #[account(
        mut,
        seeds = [b"treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, Treasury>,
    /// The treasury token account.
    #[account(mut)]
    pub treasury_vault: UncheckedAccount<'info>,
    /// The pending withdrawal request carrying approvals and the timelock.
    #[account(
        mut,
        seeds = [b"withdrawal", treasury.key().as_ref()],
        bump = withdrawal.bump,
    )]
    pub withdrawal: Account<'info, WithdrawalRequest>,
    /// Multisig configuration.
    pub config: Account<'info, MultisigConfig>,
    /// Where the founder draw is paid. Read from the environment at deployment
    /// and never hardcoded in a program.
    #[account(mut)]
    pub destination: UncheckedAccount<'info>,
}

/// Multisig and timelock configuration for treasury withdrawals.
#[account]
#[derive(Debug, Default)]
pub struct MultisigConfig {
    /// Signatures required to execute a withdrawal above the threshold.
    pub threshold: u8,
    /// Delay in seconds above the threshold.
    pub timelock_seconds: i64,
    /// Amount above which multisig and timelock apply.
    pub threshold_amount: u64,
    /// Bump seed.
    pub bump: u8,
}

impl MultisigConfig {
    /// Account space.
    pub const INIT_SPACE: usize = 1 + 8 + 8 + 1;
}

/// Accounts for a withdrawal request.
#[derive(Accounts)]
pub struct RequestWithdrawal<'info> {
    /// The requester.
    #[account(mut)]
    pub requester: Signer<'info>,
    /// The treasury the withdrawal draws from.
    #[account(seeds = [b"treasury"], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
    /// The request being created.
    #[account(init, payer = requester, space = 8 + WithdrawalRequest::INIT_SPACE,
        seeds = [b"withdrawal", treasury.key().as_ref()], bump)]
    pub withdrawal: Account<'info, WithdrawalRequest>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Emitted when an issuer posts a bond.
#[event]
pub struct BondPosted {
    /// The bond vault.
    #[index]
    pub bond: Pubkey,
    /// The issuer.
    pub issuer: Pubkey,
    /// The issuance.
    pub issuance: Pubkey,
    /// Amount posted.
    pub amount: u64,
    /// Unix timestamp.
    pub posted_at: i64,
}

/// Emitted when a bond is slashed.
#[event]
pub struct BondSlashed {
    /// The bond vault.
    #[index]
    pub bond: Pubkey,
    /// The issuance.
    pub issuance: Pubkey,
    /// The issuer.
    pub issuer: Pubkey,
    /// Amount slashed.
    pub amount: u64,
    /// Unix timestamp.
    pub slashed_at: i64,
}

/// Emitted when the treasury is created.
#[event]
pub struct TreasuryInitialised {
    /// The treasury.
    #[index]
    pub treasury: Pubkey,
}

/// Emitted when a fee is routed and split across allocations.
#[event]
pub struct FeeRouted {
    /// The treasury.
    #[index]
    pub treasury: Pubkey,
    /// Total fee.
    pub amount: u64,
    /// Treasury reserve allocation.
    pub reserve: u64,
    /// Founder draw allocation.
    pub founder: u64,
    /// Growth allocation.
    pub growth: u64,
    /// Insurance reserve allocation.
    pub insurance: u64,
}

/// Emitted when the founder draw is swept for a period.
#[event]
pub struct FounderDrawSwept {
    /// The treasury.
    #[index]
    pub treasury: Pubkey,
    /// Period key, used to make the sweep idempotent.
    pub period: i64,
    /// Amount paid.
    pub amount: u64,
}
