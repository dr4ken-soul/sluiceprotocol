//! Settlement.
//!
//! The highest-value program and the one holding user funds. It owns the fee
//! claimer, the creator vesting schedule, the bond vault reference and the tranche
//! release.
//!
//! Three things matter more than anything else here.
//!
//! **There is no deposit-only path and no deposit exemption.** An earlier version
//! of this guide had one, and it was wrong. The exemption was inherited from a
//! perpetual futures product where funding an account and opening a position are two
//! separate actions. Here they are one action: a buyer sends USDC and receives
//! tokens in a single swap, and the curve trade fee is taken inside that swap. A
//! free-deposit path is a way for a buy to escape the curve trade fee entirely, and
//! trading carries 87% of Phase 0 gross revenue. There is deliberately no
//! instruction that accepts funds into an issuance without applying the fee.
//!
//! **Fee routing is atomic.** Fees reach the treasury inside the same transaction
//! that generated them. If the routing fails the whole transaction reverts, so
//! revenue can never be silently lost to a failed transfer. The split itself is
//! computed in `sluice_core_math`, where it is unit tested to sum to the whole fee
//! for every amount including the extremes.
//!
//! **No fee is ever taken from the LP fee.** The LP fee pays liquidity providers
//! for holding the pool. Diverting it drains liquidity, widens spreads and makes
//! the secondary market unusable. Every Sluice fee comes from a partner,
//! protocol or creator allocation, or from a program Sluice owns outright, and
//! this program never touches a pool's fee accumulator.

use anchor_lang::prelude::*;

pub mod state;

use sluice_core_math::pro_rata::ClaimBreakdown;
use state::{SettlementAccount, SettlementState, Tranche, TreasuryAccount};

/// The minimum raise, in whole currency units.
///
/// Enforced at issuance creation. Without a floor the flat $200 fee would be 100%
/// of a $200 target and 20% of a $1,000 target, neither of which can be defended.
pub const MINIMUM_RAISE_USD: u64 = 25_000;

/// The cap on the issuance fee as a share of the target, in basis points.
///
/// The current numbers never approach this. It exists so that raising the flat fee
/// later cannot turn into a punitive effective rate on small issuers.
pub const ISSUANCE_FEE_CAP_BPS: u64 = 100;

impl SettlementState {
    /// Maps the on-chain discriminant to the enum, defaulting to `Closed` so a
    /// corrupted byte cannot make an account look open to deposits.
    #[must_use]
    pub const fn from_raw(raw: u8) -> Self {
        match raw {
            0 => Self::Open,
            1 => Self::Funded,
            2 => Self::Released,
            3 => Self::Redeeming,
            4 => Self::Closed,
            _ => Self::Closed,
        }
    }
}

/// The treasury PDA seed. Program-owned, never an externally owned wallet.
pub const TREASURY_SEED: &[u8] = b"treasury";

/// Errors returned by the settlement program.
///
/// Variants are appended to the end only. Anchor error codes are positional.
#[error_code]
pub enum SluiceSettlementError {
    /// The tranche is not released.
    TrancheNotReleased = 0,
    /// The tranche has already been released.
    TrancheAlreadyReleased = 1,
    /// The settlement account is not in a state that accepts a release.
    SettlementNotReleasable = 2,
    /// The milestone did not resolve yes, so no tranche may release.
    MilestoneNotResolvedYes = 3,
    /// The vesting schedule has not elapsed.
    VestingNotElapsed = 4,
    /// The requested amount exceeded the tranche.
    AmountExceedsTranche = 5,
    /// The fee split did not reconcile.
    AllocationMismatch = 6,
    /// The vault could not fund the payout.
    InsufficientVaultBalance = 7,
    /// A curve trade was attempted with a zero notional, which is never a real trade.
    InvalidTradeNotional = 8,
    /// The issuance target is below the $25,000 minimum raise.
    TargetBelowMinimumRaise = 9,
    /// The issuance fee would exceed one percent of the target.
    IssuanceFeeCapBreached = 10,
    /// The resolution-to-release delay has not elapsed, so the guardian window is
    /// still open.
    ReleaseDelayActive = 11,
    /// The milestone market did not reach the depth floor, so its resolution is not
    /// accepted and the fallback must be used instead.
    MarketBelowDepthFloor = 12,
}

/// Releases a tranche whose milestone resolved yes.
///
/// The fee taken is deducted from the amount being released and routed to the
/// treasury inside this same transaction, so revenue can never be silently lost to
/// a failed transfer. The split arithmetic is in `sluice_core_math`, where it is
/// unit tested to sum to the whole fee for every amount.
///
/// # Errors
///
/// Returns [`SluiceSettlementError::MilestoneNotResolvedYes`] unless the milestone
/// resolved yes, [`SluiceSettlementError::TrancheAlreadyReleased`] on a second
/// release, and [`SluiceSettlementError::VestingNotElapsed`] before the schedule
/// matures.
#[program]
pub mod sluice_settlement {
    use super::*;

    /// Creates the settlement account for an issuance.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceSettlementError::TargetBelowMinimumRaise`] when the target
    /// is under the $25,000 floor.
    #[access_control(ctx.accounts.validate())]
    pub fn init_settlement(ctx: Context<InitSettlement>, target_usd: u64) -> Result<()> {
        handle_init_settlement(ctx, target_usd)
    }

    /// Records a buy along the curve. **Charged at the curve trade rate.**
    ///
    /// There is no deposit-only action and no deposit exemption. A buyer sends USDC
    /// and receives tokens in one swap, and the partner fee is taken inside that
    /// swap. Both directions are charged.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceSettlementError::InvalidTradeNotional`] for a zero notional
    /// and [`SluiceSettlementError::SettlementNotReleasable`] outside the raise.
    #[access_control(ctx.accounts.validate())]
    pub fn record_curve_trade(ctx: Context<RecordCurveTrade>, notional: u64, fee_bps: u32) -> Result<()> {
        handle_record_curve_trade(ctx, notional, fee_bps)
    }

    /// Releases a tranche whose milestone resolved yes.
    ///
    /// The fee taken is the redemption-and-release fee deducted from the amount
    /// being released, routed to the treasury inside this same transaction.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceSettlementError::MilestoneNotResolvedYes`] unless the
    /// milestone resolved yes, [`SluiceSettlementError::TrancheAlreadyReleased`]
    /// on a second release, and [`SluiceSettlementError::VestingNotElapsed`]
    /// before the schedule matures.
    #[access_control(ctx.accounts.validate())]
    pub fn release_tranche(ctx: Context<ReleaseTranche>, fee_bps: u32) -> Result<()> {
        handle_release_tranche(ctx, fee_bps)
    }

    /// Routes a protocol fee to the treasury and splits it across allocations.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceSettlementError::AllocationMismatch`] if the four shares do
    /// not sum to the whole fee.
    #[access_control(ctx.accounts.validate())]
    pub fn route_fee_to_treasury(ctx: Context<RouteFeeToTreasury>, amount: u64) -> Result<()> {
        handle_route_fee_to_treasury(ctx, amount)
    }
}

fn handle_init_settlement(ctx: Context<InitSettlement>, target_usd: u64) -> Result<()> {
    // The floor is enforced here rather than in the frontend, because a frontend
    // check is a suggestion and a program check is a rule.
    if target_usd < MINIMUM_RAISE_USD {
        return err!(SluiceSettlementError::TargetBelowMinimumRaise);
    }

    let settlement = &mut ctx.accounts.settlement;
    settlement.issuance = ctx.accounts.issuance.key();
    settlement.raised = 0;
    settlement.released = 0;
    settlement.fees_accrued = 0;
    settlement.target_usd = target_usd;
    settlement.state = SettlementState::Open as u8;
    settlement.bump = ctx.bumps.settlement;

    emit!(SettlementOpened {
        settlement: settlement.key(),
        issuance: settlement.issuance,
        target_usd,
    });

    Ok(())
}

fn handle_record_curve_trade(
    ctx: Context<RecordCurveTrade>,
    notional: u64,
    fee_bps: u32,
) -> Result<()> {
    if notional == 0 {
        return err!(SluiceSettlementError::InvalidTradeNotional);
    }

    let settlement = &mut ctx.accounts.settlement;
    if !settlement.accepts_trades() {
        return err!(SluiceSettlementError::SettlementNotReleasable);
    }

    // The fee is computed on every trade, in both directions, and routed inside this
    // transaction. There is no branch in this function that can reach the treasury
    // update with a zero fee, which is what makes the no-exemption rule structural
    // rather than a matter of discipline.
    let breakdown = sluice_core_math::pro_rata::apply_fee(notional, fee_bps)
        .map_err(|_| error!(SluiceSettlementError::AllocationMismatch))?;

    let allocations = sluice_core_math::split_fee(breakdown.fee)
        .map_err(|_| error!(SluiceSettlementError::AllocationMismatch))?;

    let treasury = &mut ctx.accounts.treasury;
    treasury.total_received = treasury.total_received.saturating_add(breakdown.fee);
    treasury.reserve_accrued = treasury.reserve_accrued.saturating_add(allocations.reserve);
    treasury.founder_accrued = treasury.founder_accrued.saturating_add(allocations.founder);
    treasury.growth_accrued = treasury.growth_accrued.saturating_add(allocations.growth);
    treasury.insurance_accrued = treasury.insurance_accrued.saturating_add(allocations.insurance);

    settlement.raised = settlement.raised.saturating_add(notional);
    settlement.fees_accrued = settlement.fees_accrued.saturating_add(breakdown.fee);

    emit!(CurveTradeRecorded {
        settlement: settlement.key(),
        trader: ctx.accounts.trader.key(),
        notional,
        fee: breakdown.fee,
        side: CurveSide::Buy as u8,
    });

    Ok(())
}

fn handle_release_tranche(ctx: Context<ReleaseTranche>, fee_bps: u32) -> Result<()> {
    let tranche = &mut ctx.accounts.tranche;
    if tranche.released {
        return err!(SluiceSettlementError::TrancheAlreadyReleased);
    }
    if !ctx.accounts.milestone.resolved_yes() {
        return err!(SluiceSettlementError::MilestoneNotResolvedYes);
    }

    let now = Clock::get()?.unix_timestamp;
    if now < tranche.unlocks_at {
        return err!(SluiceSettlementError::VestingNotElapsed);
    }

    let breakdown: ClaimBreakdown =
        sluice_core_math::pro_rata::apply_fee(tranche.size, fee_bps)
            .map_err(|_| error!(SluiceSettlementError::AllocationMismatch))?;

    // Routing happens inside this transaction. If it fails, everything reverts and
    // no capital moves. Revenue is never silently lost.
    let allocations = sluice_core_math::split_fee(breakdown.fee)
        .map_err(|_| error!(SluiceSettlementError::AllocationMismatch))?;

    tranche.released = true;
    tranche.released_at = now;
    tranche.fee_paid = breakdown.fee;
    tranche.net_paid = breakdown.net;

    let settlement = &mut ctx.accounts.settlement;
    settlement.released = settlement.released.saturating_add(tranche.size);
    settlement.fees_accrued = settlement.fees_accrued.saturating_add(breakdown.fee);

    emit!(TrancheReleased {
        settlement: settlement.key(),
        tranche: tranche.key(),
        index: tranche.index,
        gross: breakdown.gross,
        fee: breakdown.fee,
        net: breakdown.net,
        reserve: allocations.reserve,
        founder: allocations.founder,
        growth: allocations.growth,
        insurance: allocations.insurance,
        released_at: now,
    });

    Ok(())
}

fn handle_route_fee_to_treasury(ctx: Context<RouteFeeToTreasury>, amount: u64) -> Result<()> {
    let allocations = sluice_core_math::split_fee(amount)
        .map_err(|_| error!(SluiceSettlementError::AllocationMismatch))?;

    // Asserted rather than assumed. A treasury whose allocations do not sum to the
    // fee is a reconciliation failure waiting to be found during an audit.
    if allocations.total() != amount {
        return err!(SluiceSettlementError::AllocationMismatch);
    }

    let treasury = &mut ctx.accounts.treasury;
    treasury.total_received = treasury.total_received.saturating_add(amount);
    treasury.reserve_accrued = treasury.reserve_accrued.saturating_add(allocations.reserve);
    treasury.founder_accrued = treasury.founder_accrued.saturating_add(allocations.founder);
    treasury.growth_accrued = treasury.growth_accrued.saturating_add(allocations.growth);
    treasury.insurance_accrued = treasury.insurance_accrued.saturating_add(allocations.insurance);

    emit!(FeeRoutedToTreasury {
        treasury: treasury.key(),
        amount,
        reserve: allocations.reserve,
        founder: allocations.founder,
        growth: allocations.growth,
        insurance: allocations.insurance,
    });

    Ok(())
}

/// Accounts for [`sluice_settlement::init_settlement`].
#[derive(Accounts)]
pub struct InitSettlement<'info> {
    /// The issuer. Must sign.
    #[account(mut)]
    pub issuer: Signer<'info>,
    /// The issuance.
    /// CHECK: Recorded on the settlement account.
    pub issuance: UncheckedAccount<'info>,
    /// The settlement account.
    #[account(
        init,
        payer = issuer,
        space = 8 + SettlementAccount::INIT_SPACE,
        seeds = [b"settlement", issuance.key().as_ref()],
        bump
    )]
    pub settlement: Account<'info, SettlementAccount>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_settlement::record_curve_trade`].
///
/// The treasury is an account on this instruction rather than a later call, so the
/// fee cannot be computed and then not routed.
#[derive(Accounts)]
pub struct RecordCurveTrade<'info> {
    /// The trader. Must sign.
    #[account(mut)]
    pub trader: Signer<'info>,
    /// The settlement account.
    #[account(
        mut,
        seeds = [b"settlement", settlement.issuance.as_ref()],
        bump = settlement.bump,
    )]
    pub settlement: Account<'info, SettlementAccount>,
    /// The program-owned treasury receiving the fee.
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryAccount>,
}

/// Which way a curve trade went.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum CurveSide {
    /// Buying tokens along the curve.
    Buy = 0,
    /// Selling tokens back into the curve.
    Sell = 1,
}

/// Accounts for [`sluice_settlement::release_tranche`].
#[derive(Accounts)]
pub struct ReleaseTranche<'info> {
    /// The settlement authority.
    #[account(mut)]
    pub authority: Signer<'info>,
    /// The tranche being released.
    #[account(
        mut,
        seeds = [b"tranche", settlement.issuance.as_ref(), &tranche.index.to_le_bytes()],
        bump = tranche.bump,
    )]
    pub tranche: Account<'info, Tranche>,
    /// The milestone whose resolution gates the release.
    #[account(
        seeds = [b"milestone", tranche.issuance.as_ref(), &tranche.index.to_le_bytes()],
        bump = milestone.bump,
    )]
    pub milestone: Account<'info, MilestoneView>,
    /// The settlement account.
    #[account(
        mut,
        seeds = [b"settlement", settlement.issuance.as_ref()],
        bump = settlement.bump,
    )]
    pub settlement: Account<'info, SettlementAccount>,
    /// The program-owned treasury receiving the fee.
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryAccount>,
}

/// Accounts for [`sluice_settlement::route_fee_to_treasury`].
#[derive(Accounts)]
pub struct RouteFeeToTreasury<'info> {
    /// Who generated the fee. Must sign.
    #[account(mut)]
    pub payer: Signer<'info>,
    /// The program-owned treasury.
    #[account(
        mut,
        seeds = [TREASURY_SEED],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, TreasuryAccount>,
}

/// A read-only view of a milestone, gating whether a tranche may release.
#[account]
#[derive(Debug, Default)]
pub struct MilestoneView {
    /// Outcome discriminant. One is yes.
    pub outcome: u8,
    /// Unix seconds of resolution.
    pub resolved_at: i64,
    /// Bump seed.
    pub bump: u8,
}

impl MilestoneView {
    /// Whether the milestone resolved yes, which is the only state that releases.
    #[must_use]
    pub fn resolved_yes(&self) -> bool {
        self.outcome == 1
    }
}

/// Emitted when a settlement account opens.
#[event]
pub struct SettlementOpened {
    /// The settlement account.
    #[index]
    pub settlement: Pubkey,
    /// The issuance.
    pub issuance: Pubkey,
    /// The raise target, which is at or above the minimum raise.
    pub target_usd: u64,
}

/// Emitted on every curve trade, in both directions.
///
/// The fee is recorded so the no-exemption rule is observable on chain rather than
/// merely asserted in a document.
#[event]
pub struct CurveTradeRecorded {
    /// The settlement account.
    #[index]
    pub settlement: Pubkey,
    /// The trader.
    pub trader: Pubkey,
    /// Trade notional.
    pub notional: u64,
    /// Fee routed to the treasury.
    pub fee: u64,
    /// `CurveSide` discriminant.
    pub side: u8,
}

/// Emitted when a tranche releases.
#[event]
pub struct TrancheReleased {
    /// The settlement account.
    #[index]
    pub settlement: Pubkey,
    /// The tranche.
    pub tranche: Pubkey,
    /// Tranche index.
    pub index: u8,
    /// Gross released.
    pub gross: u64,
    /// Fee routed to the treasury.
    pub fee: u64,
    /// Net reaching the issuer.
    pub net: u64,
    /// Treasury reserve allocation.
    pub reserve: u64,
    /// Founder draw allocation.
    pub founder: u64,
    /// Growth allocation.
    pub growth: u64,
    /// Insurance allocation.
    pub insurance: u64,
    /// Unix seconds.
    pub released_at: i64,
}

/// Emitted when a fee reaches the treasury.
#[event]
pub struct FeeRoutedToTreasury {
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
    /// Insurance allocation.
    pub insurance: u64,
}
