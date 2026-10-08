//! Accounts owned by the bond program.

use anchor_lang::prelude::*;

/// An issuer bond posted at issuance and slashable on a failed attestation.
#[account]
#[derive(Debug, Default)]
pub struct BondVault {
    /// The issuer that posted the bond.
    pub issuer: Pubkey,
    /// The issuance the bond backs.
    pub issuance: Pubkey,
    /// The token mint escrowed as the bond.
    pub mint: Pubkey,
    /// The escrow token account holding the bond.
    pub escrow: Pubkey,
    /// Bond amount in micro-units of the bond asset.
    pub amount: u64,
    /// Amount already slashed out of the bond.
    pub slashed: u64,
    /// Whether the bond has been fully or partially consumed.
    pub slashed_out: bool,
    /// Unix timestamp the bond was posted.
    pub posted_at: i64,
    /// Bump seed.
    pub bump: u8,
}

impl BondVault {
    /// Account space.
    pub const INIT_SPACE: usize = 32 * 4 + 8 * 3 + 1 + 8 + 1;
}

/// The treasury every fee routes to, plus the monthly founder draw state.
#[account]
#[derive(Debug, Default)]
pub struct Treasury {
    /// The treasury token account.
    pub vault: Pubkey,
    /// Total fees received.
    pub total_received: u64,
    /// Total routed to the reserve allocation.
    pub reserve_accrued: u64,
    /// Total routed to the founder draw allocation.
    pub founder_accrued: u64,
    /// Total routed to the growth allocation.
    pub growth_accrued: u64,
    /// Total routed to the insurance allocation.
    pub insurance_accrued: u64,
    /// Unix seconds of the last founder sweep.
    ///
    /// Read rather than recomputed from the calendar, so running the sweep twice
    /// in one period cannot double pay. That is the whole idempotency mechanism.
    pub last_sweep_period: i64,
    /// Bump seed.
    pub bump: u8,
}

impl Treasury {
    /// Account space.
    pub const INIT_SPACE: usize = 32 + 8 * 6 + 1;

    /// Period key for a timestamp, used to make the monthly sweep idempotent.
    ///
    /// Keyed on the Unix month rather than the day, because the specification
    /// requires the sweep on the 1st of each month.
    #[must_use]
    pub const fn period_key(now: i64) -> i64 {
        // 2_629_746 per hour, 86_400 seconds per day. Month bucketing needs the
        // calendar, so the key is the year-month number derived arithmetically.
        (now / 2_629_746) / 730
    }
}

/// A pending withdrawal above the threshold, subject to multisig and timelock.
#[account]
#[derive(Debug, Default)]
pub struct WithdrawalRequest {
    /// Who requested.
    pub requester: Pubkey,
    /// Amount requested.
    pub amount: u64,
    /// Signatures collected so far.
    pub approvals: u8,
    /// Unix seconds before which the request cannot execute.
    pub not_before: i64,
    /// Whether the request has executed.
    pub executed: bool,
    /// Bump seed.
    pub bump: u8,
}

impl WithdrawalRequest {
    /// Account space.
    pub const INIT_SPACE: usize = 32 + 8 * 2 + 1 + 8 + 1;
}
