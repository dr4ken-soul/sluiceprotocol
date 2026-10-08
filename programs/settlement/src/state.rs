//! Accounts owned by the settlement program.

use anchor_lang::prelude::*;

/// Lifecycle of a settlement account.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum SettlementState {
    /// Accepting deposits. The only state a deposit may occur in.
    Open = 0,
    /// Target reached, milestones adjudicating.
    Funded = 1,
    /// A milestone resolved yes and a tranche released.
    Released = 2,
    /// A milestone resolved no and capital routed to redemption.
    Redeeming = 3,
    /// Fully wound down. Terminal.
    Closed = 4,
}

impl SettlementState {
    /// Whether curve trades are accepted.
    ///
    /// The single predicate that opens the trading path. Named for trades rather
    /// than deposits because Sluice has no deposit-only action and no deposit
    /// exemption: buying along the curve is a trade and is always charged.
    #[must_use]
    pub const fn accepts_trades(&self) -> bool {
        matches!(self, Self::Open)
    }
}

/// The settlement account for one issuance.
#[account]
#[derive(Debug, Default)]
pub struct SettlementAccount {
    /// The issuance.
    pub issuance: Pubkey,
    /// Capital raised, in micro-units. Curve trades only ever add to this.
    pub raised: u64,
    /// Capital released to the issuer across all tranches.
    pub released: u64,
    /// Fees accrued to the treasury.
    pub fees_accrued: u64,
    /// The raise target in whole currency units, recorded so the minimum-raise check
    /// is auditable after the fact rather than only at creation.
    pub target_usd: u64,
    /// `SettlementState` discriminant.
    pub state: u8,
    /// Bump seed.
    pub bump: u8,
}

impl SettlementAccount {
    /// Account space.
    pub const INIT_SPACE: usize = 32 + 8 * 4 + 1 + 1;

    /// Whether the account accepts curve trades.
    ///
    /// Named for trades rather than deposits on purpose. There is no deposit-only
    /// path in Sluice, and calling this `accepts_deposit` would reintroduce the idea
    /// that one exists.
    #[must_use]
    pub fn accepts_trades(&self) -> bool {
        SettlementState::from_raw(self.state).accepts_trades()
    }
}

/// A tranche of capital released against one milestone.
#[account]
#[derive(Debug, Default)]
pub struct Tranche {
    /// The issuance.
    pub issuance: Pubkey,
    /// Zero-based tranche index.
    pub index: u8,
    /// Tranche size in micro-units.
    pub size: u64,
    /// Unix seconds before which the tranche may not release.
    pub unlocks_at: i64,
    /// Whether the tranche has released.
    pub released: bool,
    /// Unix seconds of release.
    pub released_at: i64,
    /// Fee paid on release.
    pub fee_paid: u64,
    /// Net received by the issuer.
    pub net_paid: u64,
    /// Bump seed.
    pub bump: u8,
}

impl Tranche {
    /// Account space.
    pub const INIT_SPACE: usize = 32 + 1 + 8 * 2 + 1 + 8 + 8 * 2 + 1;
}

/// The program-owned treasury.
///
/// A program-owned account rather than an externally owned wallet, so no single
/// private key can drain it.
#[account]
#[derive(Debug, Default)]
pub struct TreasuryAccount {
    /// The treasury token account.
    pub vault: Pubkey,
    /// Total fees received.
    pub total_received: u64,
    /// Treasury reserve allocation, for audits, legal, security and runway.
    pub reserve_accrued: u64,
    /// Founder and early team draw.
    pub founder_accrued: u64,
    /// Growth allocation.
    pub growth_accrued: u64,
    /// Insurance reserve, the backstop for attestation failure.
    pub insurance_accrued: u64,
    /// Unix seconds of the last founder sweep.
    pub last_sweep_period: i64,
    /// Bump seed.
    pub bump: u8,
}

impl TreasuryAccount {
    /// Account space.
    pub const INIT_SPACE: usize = 32 + 8 * 6 + 1;

    /// Period key for a timestamp, making the monthly sweep idempotent.
    ///
    /// Keyed on the month rather than recomputed from a calendar service, so
    /// running the sweep twice in one period pays nothing the second time. That is
    /// the whole idempotency mechanism, and it does not depend on an external
    /// clock.
    #[must_use]
    pub const fn period_key(now: i64) -> i64 {
        // Seconds per hour, then hours per 730-day month, floored.
        (now / 3_600) / 17_520
    }
}
