//! Accounts owned by the autopilot program.

use anchor_lang::prelude::*;

/// Cadence and fee configuration for autopilot.
#[account]
#[derive(Debug, Default)]
pub struct AutopilotConfig {
    /// Seconds between harvests.
    pub cadence_seconds: i64,
    /// Management fee on assets under management, annualised, in basis points.
    pub management_fee_bps: u64,
    /// Performance fee on yield harvested, in basis points.
    pub performance_fee_bps: u64,
    /// Bump seed.
    pub bump: u8,
}

impl AutopilotConfig {
    /// Account space.
    pub const INIT_SPACE: usize = 8 * 3 + 1;
}

/// An autopilot position over a graduated issuance's liquidity.
#[account]
#[derive(Debug, Default)]
pub struct AutopilotPosition {
    /// The issuance.
    pub issuance: Pubkey,
    /// The DAMM v2 pool.
    pub pool: Pubkey,
    /// The DAMM v2 position NFT being split.
    pub position_nft: Pubkey,
    /// Position owner or delegate.
    pub owner: Pubkey,
    /// Floor tranche share in basis points.
    pub floor_bps: u64,
    /// Liquidity locked as the floor tranche, never traded.
    pub floor_locked: u64,
    /// Liquidity in the DLMM ladder.
    pub ladder_liquidity: u64,
    /// Cumulative yield compounded back into the ladder.
    pub yield_compounded: u64,
    /// Cumulative fees earned.
    pub fees_earned: u64,
    /// Unix seconds of the last harvest.
    pub last_harvest_at: i64,
    /// Seconds between harvests.
    pub cadence_seconds: i64,
    /// Whether the position is active.
    pub active: bool,
    /// Bump seed.
    pub bump: u8,
}

impl AutopilotPosition {
    /// Account space, matching the field order exactly.
    pub const INIT_SPACE: usize = 32 * 4 // issuance, pool, position_nft, owner
        + 8 * 6 // floor_bps, floor_locked, ladder, compounded, fees, last_harvest
        + 8 // cadence_seconds
        + 1 // active
        + 1; // bump
}
