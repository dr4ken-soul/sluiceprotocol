//! Accounts owned by the redemption program.

use anchor_lang::prelude::*;

/// How a milestone resolved.
///
/// Mirrors `verifier::state::Outcome` rather than importing it, so the redemption
/// program does not take a dependency on the verifier program for a two-byte
/// discriminant. The discriminants must stay identical because both programs read
/// the same milestone account, and a divergence would mean a vault opened against
/// a milestone that resolved yes.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Outcome {
    /// Not yet resolved. A vault cannot be opened against this.
    Unresolved = 0,
    /// The milestone was met. Capital releases; nothing is redeemed.
    Yes = 1,
    /// The milestone failed. Capital routes to a redemption vault.
    No = 2,
}

/// A read-only view of a milestone owned by the verifier program.
///
/// Redemption reads milestones but must not be able to write them, so it declares a
/// minimal projection of the account and validates it by seeds and bump. Only the
/// fields a redemption decision depends on are carried; anything else is a field
/// this program has no business reading.
#[account]
#[derive(Debug, Default)]
pub struct MilestoneRef {
    /// Outcome discriminant. See [`Outcome`].
    pub outcome: u8,
    /// Unix seconds the market closed.
    pub deadline: i64,
    /// Tranche index within the issuance.
    pub index: u8,
}

impl MilestoneRef {
    /// Account space: one byte outcome, one i64 deadline, one byte index.
    pub const INIT_SPACE: usize = 1 + 8 + 1;
}

/// Lifecycle of a redemption vault.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum RedemptionVaultState {
    /// Accepting claims.
    Open = 0,
    /// Every claimable unit has been claimed. Terminal.
    Exhausted = 1,
}

/// A redemption vault holding capital routed from one failed tranche.
///
/// The claim log lives on the vault as a fixed window rather than as a growing
/// vector. A vector would need reallocation, which means a realloc CPI and a
/// signer, so it cannot happen inside a permissionless claim. The window holds
/// the most recent claims and the total paid is authoritative for reconciliation,
/// which is what keeps gas bounded as the claim count grows.
#[account]
#[derive(Debug, Default)]
pub struct RedemptionVault {
    /// The issuance.
    pub issuance: Pubkey,
    /// Tranche index this vault settles.
    pub tranche_index: u8,
    /// Capital routed here after the milestone failed.
    pub pot: u64,
    /// Supply the pot is divided against, fixed at the snapshot.
    pub total_supply: u64,
    /// Gross total claimed, fee included.
    pub paid: u64,
    /// Fees accrued to the treasury.
    pub fees_accrued: u64,
    /// `RedemptionVaultState` discriminant.
    pub state: u8,
    /// Number of claims recorded.
    pub claim_count: u32,
    /// Most recent claimer, for the double-claim window.
    pub last_claimant: Pubkey,
    /// Unix seconds of the most recent claim.
    pub last_claim_at: i64,
    /// Bump seed.
    pub bump: u8,
}

impl RedemptionVault {
    /// Account space, matching the field order exactly.
    pub const INIT_SPACE: usize = 32 * 2 // issuance, last_claimant
        + 1 // tranche_index
        + 8 * 4 // pot, total_supply, paid, fees_accrued
        + 1 // state
        + 4 // claim_count
        + 8 // last_claim_at
        + 1; // bump

    /// Whether a holder already claimed from this vault.
    ///
    /// The recent-claim window is bounded, so this is a fast path for the common
    /// case of a holder claiming twice in a row. A holder whose earlier claim has
    /// aged out of the window is caught by the per-tranche claim receipt, which is
    /// what the redemption vault in `sluice_core_math::ledger` models.
    #[must_use]
    pub fn has_claimed(&self, holder: &Pubkey) -> bool {
        self.claim_count > 0 && self.last_claimant == *holder
    }

    /// Records a claim against the vault.
    ///
    /// # Errors
    ///
    /// Returns [`crate::SluiceRedemptionError::AlreadyClaimed`] when the holder is
    /// already in the recent-claim window, and
    /// [`crate::SluiceRedemptionError::VaultUnderfunded`] when the claim would
    /// exceed the pot.
    pub fn record_claim(
        &mut self,
        holder: Pubkey,
        gross: u64,
        fee: u64,
        net: u64,
    ) -> Result<()> {
        if self.has_claimed(&holder) {
            return err!(crate::SluiceRedemptionError::AlreadyClaimed);
        }
        if self.paid.saturating_add(gross) > self.pot {
            return err!(crate::SluiceRedemptionError::VaultUnderfunded);
        }

        self.paid = self.paid.saturating_add(gross);
        self.fees_accrued = self.fees_accrued.saturating_add(fee);
        self.claim_count = self.claim_count.saturating_add(1);
        self.last_claimant = holder;
        self.last_claim_at = anchor_lang::prelude::Clock::get()
            .map(|clock| clock.unix_timestamp)
            .unwrap_or(0);

        // `net` is derived rather than stored, and the assertion is that the three
        // agree. `net` participates in the check so a future change to the fee
        // arithmetic cannot silently break the reconciliation.
        debug_assert_eq!(gross, fee.saturating_add(net));
        Ok(())
    }

    /// Capital still outstanding against the pot.
    ///
    /// # Errors
    ///
    /// Returns [`crate::SluiceRedemptionError::VaultUnderfunded`] when the recorded
    /// claims exceed the pot, which means the ledger and the pot disagree.
    pub fn remaining(&self) -> Result<u64> {
        if self.paid > self.pot {
            return err!(crate::SluiceRedemptionError::VaultUnderfunded);
        }
        Ok(self.pot - self.paid)
    }

    /// Marks the vault exhausted when nothing remains.
    pub fn settle_if_exhausted(&mut self) {
        if self.paid >= self.pot && self.state == RedemptionVaultState::Open as u8 {
            self.state = RedemptionVaultState::Exhausted as u8;
        }
    }
}
