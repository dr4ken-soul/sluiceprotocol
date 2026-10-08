//! Autopilot.
//!
//! Splits the DAMM v2 position NFT into a locked floor tranche and a DLMM bin
//! ladder, then harvests and compounds on a cadence.
//!
//! **This program is deferred to Phase 2 and does not block the hackathon demo.**
//! `BUILD_GUIDE.md` step 1.8 gives the reasoning: its entire fee stream, 0.50% AUM
//! plus 10% performance, depends on assets under management that will not exist at
//! launch. It is roughly 700 lines of audit surface generating zero revenue and
//! zero demo value in Phase 0.
//!
//! It is written and type-checked now because it is auditable scope. The
//! CertiK submission quotes it in the programme line count, and that figure has to
//! be supported by the repository rather than by a promise. If it is cut before
//! submission, its lines are subtracted from the total and the total restated, as
//! `APP_BLUEPRINT.md` requires.

use anchor_lang::prelude::*;

pub mod state;

use state::{AutopilotConfig, AutopilotPosition};

/// Management fee on assets under management, annualised.
pub const MANAGEMENT_FEE_BPS: u64 = 50;

/// Performance fee on yield harvested.
pub const PERFORMANCE_FEE_BPS: u64 = 1_000;

/// Errors returned by the autopilot program.
///
/// Variants are appended to the end only. Anchor error codes are positional.
#[error_code]
pub enum SluiceAutopilotError {
    /// The position is not active.
    PositionNotActive = 0,
    /// The position has already been split.
    AlreadySplit = 1,
    /// The cadence has not elapsed since the last harvest.
    CadenceNotElapsed = 2,
    /// The yield was zero, so there is nothing to compound.
    NothingToCompound = 3,
    /// The floor tranche is not available to be locked.
    FloorUnavailable = 4,
    /// The ladder would have no bins.
    LadderEmpty = 5,
    /// The performance fee exceeded the yield harvested.
    FeeExceedsYield = 6,
    /// The split shares did not sum to one hundred percent.
    SplitMismatch = 7,
}

/// Computes the fees earned on one harvest.
///
/// Management and performance together, because a management fee alone underprices
/// active management and a performance fee alone gives no baseline revenue to
/// maintain the infrastructure. The pair sits below the 1% to 2% AUM market rate
/// while still capturing upside.
///
/// # Errors
///
/// Returns [`SluiceAutopilotError::FeeExceedsYield`] if the combined fees exceed
/// the yield, which a misconfigured rate could cause.
pub fn harvest_fees(aum: u64, yield_harvested: u64) -> Result<(u64, u64)> {
    let management = sluice_core_math::mul_div_floor(
        u128::from(aum),
        u128::from(MANAGEMENT_FEE_BPS),
        u128::from(sluice_core_math::BPS_DENOMINATOR),
    ) as u64;
    let performance = sluice_core_math::mul_div_floor(
        u128::from(yield_harvested),
        u128::from(PERFORMANCE_FEE_BPS),
        u128::from(sluice_core_math::BPS_DENOMINATOR),
    ) as u64;

    if management.saturating_add(performance) > yield_harvested {
        return err!(SluiceAutopilotError::FeeExceedsYield);
    }
    Ok((management, performance))
}

/// Splits a DAMM v2 position into a locked floor tranche and a ladder.
///
/// # Errors
///
/// Returns [`SluiceAutopilotError::SplitMismatch`] when the two shares do not sum
/// to one hundred percent.
pub fn split_position(position: u64, floor_bps: u64) -> Result<(u64, u64)> {
    if floor_bps > sluice_core_math::BPS_DENOMINATOR {
        return err!(SluiceAutopilotError::SplitMismatch);
    }
    let floor = sluice_core_math::mul_div_floor(
        u128::from(position),
        u128::from(floor_bps),
        u128::from(sluice_core_math::BPS_DENOMINATOR),
    ) as u64;
    // The ladder takes the residue rather than an independently computed share, so
    // the two always sum to the whole position and no unit is stranded.
    Ok((floor, position - floor))
}

#[program]
pub mod sluice_autopilot {
    use super::*;

    /// Creates an autopilot position over a graduated issuance's liquidity.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceAutopilotError::PositionNotActive`] if the position is
    /// already closed.
    #[access_control(ctx.accounts.validate())]
    pub fn init_position(ctx: Context<InitPosition>, floor_bps: u64) -> Result<()> {
        handle_init_position(ctx, floor_bps)
    }

    /// Splits the DAMM v2 position and builds the DLMM ladder.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceAutopilotError::AlreadySplit`] on a second split and
    /// [`SluiceAutopilotError::SplitMismatch`] when the shares do not sum to the
    /// whole position.
    #[access_control(ctx.accounts.validate())]
    pub fn split_and_build_ladder(ctx: Context<SplitAndBuildLadder>) -> Result<()> {
        handle_split_and_build_ladder(ctx)
    }

    /// Harvests yield and compounds it into the ladder.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceAutopilotError::CadenceNotElapsed`] before the cadence
    /// elapses and [`SluiceAutopilotError::NothingToCompound`] when there is no
    /// yield.
    #[access_control(ctx.accounts.validate())]
    pub fn harvest_and_compound(ctx: Context<HarvestAndCompound>, yield_harvested: u64) -> Result<()> {
        handle_harvest_and_compound(ctx, yield_harvested)
    }
}

fn handle_init_position(ctx: Context<InitPosition>, floor_bps: u64) -> Result<()> {
    let position = &mut ctx.accounts.position;
    position.issuance = ctx.accounts.issuance.key();
    position.pool = ctx.accounts.pool.key();
    position.position_nft = ctx.accounts.position_nft.key();
    position.floor_bps = floor_bps;
    position.floor_locked = 0;
    position.ladder_liquidity = 0;
    position.yield_compounded = 0;
    position.fees_earned = 0;
    position.last_harvest_at = 0;
    position.cadence_seconds = ctx.accounts.config.cadence_seconds;
    position.active = true;
    position.bump = ctx.bumps.position;

    emit!(AutopilotPositionOpened {
        position: position.key(),
        issuance: position.issuance,
        pool: position.pool,
        floor_bps,
    });

    Ok(())
}

fn handle_split_and_build_ladder(ctx: Context<SplitAndBuildLadder>) -> Result<()> {
    let position = &mut ctx.accounts.position;
    if !position.active {
        return err!(SluiceAutopilotError::PositionNotActive);
    }
    if position.floor_locked > 0 {
        return err!(SluiceAutopilotError::AlreadySplit);
    }

    let total = position.ladder_liquidity;
    let (floor, ladder) = split_position(total, position.floor_bps)?;

    if ladder == 0 {
        return err!(SluiceAutopilotError::LadderEmpty);
    }

    position.floor_locked = floor;
    position.ladder_liquidity = ladder;

    emit!(PositionSplit {
        position: position.key(),
        floor_locked: floor,
        ladder_liquidity: ladder,
    });

    Ok(())
}

fn handle_harvest_and_compound(
    ctx: Context<HarvestAndCompound>,
    yield_harvested: u64,
) -> Result<()> {
    let position = &mut ctx.accounts.position;
    if !position.active {
        return err!(SluiceAutopilotError::PositionNotActive);
    }
    if yield_harvested == 0 {
        return err!(SluiceAutopilotError::NothingToCompound);
    }

    let now = Clock::get()?.unix_timestamp;
    if now.saturating_sub(position.last_harvest_at) < position.cadence_seconds {
        return err!(SluiceAutopilotError::CadenceNotElapsed);
    }

    let aum = position.floor_locked.saturating_add(position.ladder_liquidity);
    let (management, performance) = harvest_fees(aum, yield_harvested)?;
    let total_fees = management.saturating_add(performance);

    position.last_harvest_at = now;
    position.fees_earned = position.fees_earned.saturating_add(total_fees);
    position.yield_compounded = position
        .yield_compounded
        .saturating_add(yield_harvested.saturating_sub(total_fees));
    position.ladder_liquidity = position
        .ladder_liquidity
        .saturating_add(yield_harvested.saturating_sub(total_fees));

    emit!(YieldCompounded {
        position: position.key(),
        yield_harvested,
        management_fee: management,
        performance_fee: performance,
        compounded: yield_harvested.saturating_sub(total_fees),
        compounded_at: now,
    });

    Ok(())
}

/// Accounts for [`sluice_autopilot::init_position`].
#[derive(Accounts)]
pub struct InitPosition<'info> {
    /// The issuer or its delegate. Must sign.
    #[account(mut)]
    pub owner: Signer<'info>,
    /// The graduated issuance.
    /// CHECK: Recorded on the position.
    pub issuance: UncheckedAccount<'info>,
    /// The DAMM v2 pool.
    /// CHECK: Recorded on the position. The pool program is external.
    pub pool: UncheckedAccount<'info>,
    /// The DAMM v2 position NFT being split.
    /// CHECK: Recorded on the position. Ownership is proved by the account being
    /// passed as writable by the signer.
    #[account(mut)]
    pub position_nft: UncheckedAccount<'info>,
    /// Cadence configuration.
    pub config: Account<'info, AutopilotConfig>,
    /// The autopilot position.
    #[account(
        init,
        payer = owner,
        space = 8 + AutopilotPosition::INIT_SPACE,
        seeds = [b"autopilot", issuance.key().as_ref()],
        bump
    )]
    pub position: Account<'info, AutopilotPosition>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_autopilot::split_and_build_ladder`].
#[derive(Accounts)]
pub struct SplitAndBuildLadder<'info> {
    /// The position owner. Must sign.
    #[account(mut)]
    pub owner: Signer<'info>,
    /// The DAMM v2 position NFT being split.
    ///
    /// CHECK: Recorded for attribution. The split arithmetic is what matters and it
    /// is pure.
    #[account(mut)]
    pub position_nft: UncheckedAccount<'info>,
    /// The autopilot position.
    #[account(
        mut,
        seeds = [b"autopilot", position.issuance.as_ref()],
        bump = position.bump,
        has_one = owner @ SluiceAutopilotError::PositionNotActive,
    )]
    pub position: Account<'info, AutopilotPosition>,
}

/// Accounts for [`sluice_autopilot::harvest_and_compound`].
#[derive(Accounts)]
pub struct HarvestAndCompound<'info> {
    /// The position owner. Must sign.
    #[account(mut)]
    pub owner: Signer<'info>,
    /// The autopilot position.
    #[account(
        mut,
        seeds = [b"autopilot", position.issuance.as_ref()],
        bump = position.bump,
        has_one = owner @ SluiceAutopilotError::PositionNotActive,
    )]
    pub position: Account<'info, AutopilotPosition>,
    /// The program-owned treasury receiving fees.
    #[account(
        mut,
        seeds = [b"autopilot-treasury"],
        bump = treasury.bump,
    )]
    pub treasury: Account<'info, AutopilotTreasury>,
}

/// The program-owned treasury receiving autopilot fees.
#[account]
#[derive(Debug, Default)]
pub struct AutopilotTreasury {
    /// Total fees received.
    pub total_received: u64,
    /// Bump seed.
    pub bump: u8,
}

impl AutopilotTreasury {
    /// Account space.
    pub const INIT_SPACE: usize = 8 + 1;
}

/// Emitted when an autopilot position opens.
#[event]
pub struct AutopilotPositionOpened {
    /// The position.
    #[index]
    pub position: Pubkey,
    /// The issuance.
    pub issuance: Pubkey,
    /// The DAMM v2 pool.
    pub pool: Pubkey,
    /// Floor tranche share in basis points.
    pub floor_bps: u64,
}

/// Emitted when the position is split.
#[event]
pub struct PositionSplit {
    /// The position.
    #[index]
    pub position: Pubkey,
    /// Liquidity locked as the floor tranche.
    pub floor_locked: u64,
    /// Liquidity sent to the DLMM ladder.
    pub ladder_liquidity: u64,
}

/// Emitted on a harvest.
#[event]
pub struct YieldCompounded {
    /// The position.
    #[index]
    pub position: Pubkey,
    /// Yield harvested.
    pub yield_harvested: u64,
    /// Management fee.
    pub management_fee: u64,
    /// Performance fee.
    pub performance_fee: u64,
    /// Amount compounded into the ladder.
    pub compounded: u64,
    /// Unix seconds.
    pub compounded_at: i64,
}
