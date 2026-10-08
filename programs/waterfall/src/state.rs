//! Accounts owned by the waterfall program.

use anchor_lang::prelude::*;

/// The waterfall vault for one issuance, holding converted underlying cash.
#[account]
#[derive(Debug, Default)]
pub struct WaterfallVault {
    /// The issuance.
    pub issuance: Pubkey,
    /// Underlying cash deposited and not yet distributed.
    pub cash_balance: u64,
    /// Cumulative gross distributed across all snapshots.
    pub distributed: u64,
    /// Fees accrued to the treasury.
    pub fees_accrued: u64,
    /// Number of snapshots taken.
    pub next_period: u64,
    /// Bump seed.
    pub bump: u8,
}

impl WaterfallVault {
    /// Account space, matching the field order exactly.
    pub const INIT_SPACE: usize = 32 + 8 * 4 + 1;
}

/// One snapshot's distributable cash.
///
/// Both the pot and the supply are fixed here. A holder therefore cannot claim
/// against a pot that grew after they bought, and cannot dilute their own share by
/// waiting, which is what makes the claim safe to run permissionless.
#[account]
#[derive(Debug, Default)]
pub struct Distribution {
    /// The vault this distribution came from.
    pub vault: Pubkey,
    /// Snapshot period, monotonic per vault.
    pub period: u64,
    /// Gross pot at the snapshot.
    pub pot: u64,
    /// Total supply at the snapshot, in whole tokens.
    pub total_supply: u64,
    /// Fee taken once at snapshot time.
    pub fee: u64,
    /// Net amount distributable to holders.
    pub net: u64,
    /// Net amount claimed so far.
    pub claimed: u64,
    /// Number of claims recorded.
    pub claim_count: u32,
    /// Most recent claimer.
    pub last_claimant: Pubkey,
    /// Bump seed.
    pub bump: u8,
}

impl Distribution {
    /// Account space, matching the field order exactly.
    pub const INIT_SPACE: usize = 32 // vault
        + 8 * 5 // period, pot, total_supply, fee, net
        + 8 // claimed
        + 4 // claim_count
        + 32 // last_claimant
        + 1; // bump

    /// Whether a holder has already claimed this distribution.
    #[must_use]
    pub fn has_claimed(&self, holder: &Pubkey) -> bool {
        self.claim_count > 0 && self.last_claimant == *holder
    }

    /// Net amount still outstanding.
    #[must_use]
    pub fn remaining(&self) -> u64 {
        self.net.saturating_sub(self.claimed)
    }
}
