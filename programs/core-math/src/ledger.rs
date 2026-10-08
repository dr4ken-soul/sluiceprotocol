//! Claim ledger for the redemption and waterfall vaults.
//!
//! Both vaults share the same requirement from `BUILD_GUIDE.md`: a holder claims
//! their share, a second claim for the same tranche reverts, and the vault
//! balance reconciles to the sum of outstanding claims after every operation.
//!
//! The ledger is modelled as an append-only record rather than a mutable balance,
//! because the invariant that matters is about the *history* of claims. A balance
//! can be made to look correct while the history behind it is not, whereas a
//! ledger can be replayed and checked.

/// Errors returned when a claim is rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LedgerError {
    /// The holder already claimed against this tranche or distribution. A second
    /// claim reverts rather than silently paying twice.
    AlreadyClaimed,
    /// The vault holds less than the computed entitlement, which would mean the
    /// ledger and the pot disagree.
    VaultUnderfunded,
    /// The claimed amount was zero, which is never a real claim.
    EmptyClaim,
}

/// One recorded claim.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ClaimRecord {
    /// Which tranche or distribution this claim belongs to.
    pub period: u64,
    /// The claiming holder.
    pub holder: [u8; 32],
    /// Gross amount leaving the vault, fee included.
    pub gross: u64,
    /// Amount routed to the treasury.
    pub fee: u64,
    /// Amount reaching the holder.
    pub net: u64,
}

/// An append-only record of claims against one vault.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ClaimLedger {
    records: Vec<ClaimRecord>,
    /// Gross total claimed.
    paid: u64,
    /// Fee total accrued to the treasury.
    fees: u64,
}

impl ClaimLedger {
    /// An empty ledger.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Records a claim.
    ///
    /// # Errors
    ///
    /// Returns [`LedgerError::AlreadyClaimed`] when the holder already claimed
    /// against this period, which is the double-claim guard, and
    /// [`LedgerError::EmptyClaim`] for a zero amount.
    pub fn record(
        &mut self,
        period: u64,
        holder: [u8; 32],
        breakdown: crate::pro_rata::ClaimBreakdown,
    ) -> Result<(), LedgerError> {
        if breakdown.gross == 0 {
            return Err(LedgerError::EmptyClaim);
        }
        if self.has_claimed(period, &holder) {
            return Err(LedgerError::AlreadyClaimed);
        }
        self.paid = self.paid.saturating_add(breakdown.gross);
        self.fees = self.fees.saturating_add(breakdown.fee);
        self.records.push(ClaimRecord {
            period,
            holder,
            gross: breakdown.gross,
            fee: breakdown.fee,
            net: breakdown.net,
        });
        Ok(())
    }

    /// Whether a holder has already claimed against a period.
    #[must_use]
    pub fn has_claimed(&self, period: u64, holder: &[u8; 32]) -> bool {
        self.records
            .iter()
            .any(|record| record.period == period && record.holder == *holder)
    }

    /// Every recorded claim, in order.
    #[must_use]
    pub fn records(&self) -> &[ClaimRecord] {
        &self.records
    }

    /// Gross total claimed so far.
    #[must_use]
    pub fn paid(&self) -> u64 {
        self.paid
    }

    /// Fee total accrued to the treasury.
    #[must_use]
    pub fn fees(&self) -> u64 {
        self.fees
    }

    /// Outstanding claims against a pot of `pot`.
    ///
    /// The vault must still hold the unclaimed remainder. A pot that has been
    /// over-claimed is a hard failure rather than a rounded-down payout, because
    /// a shortfall means the ledger is wrong and paying the shortfall would hide
    /// that from the next holder.
    ///
    /// # Errors
    ///
    /// Returns [`LedgerError::VaultUnderfunded`] when the recorded claims exceed
    /// the pot.
    pub fn outstanding(&self, pot: u64) -> Result<u64, LedgerError> {
        if self.paid > pot {
            return Err(LedgerError::VaultUnderfunded);
        }
        Ok(pot - self.paid)
    }

    /// Checks the ledger against a pot.
    ///
    /// # Errors
    ///
    /// Propagates [`ClaimLedger::outstanding`]. Called after every state change so
    /// a mismatch surfaces at the operation that caused it rather than at
    /// withdrawal time.
    pub fn reconcile(&self, pot: u64) -> Result<u64, LedgerError> {
        self.outstanding(pot)
    }

    /// Number of recorded claims.
    #[must_use]
    pub fn len(&self) -> usize {
        self.records.len()
    }

    /// Whether nothing has been claimed.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.records.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pro_rata::{REDEMPTION_BPS, WATERFALL_BPS, apply_fee};

    const POT: u64 = 1_000_000;

    fn holder(seed: u8) -> [u8; 32] {
        [seed; 32]
    }

    fn split(gross: u64, bps: u32) -> crate::pro_rata::ClaimBreakdown {
        apply_fee(gross, bps).expect("rate is valid")
    }

    /// BUILD_GUIDE step 1.6: a holder claims their share.
    #[test]
    fn a_holder_can_claim_their_share() {
        let mut ledger = ClaimLedger::new();
        ledger
            .record(1, holder(1), split(250_000, REDEMPTION_BPS))
            .expect("claim records");
        assert_eq!(ledger.paid(), 250_000);
        assert_eq!(ledger.len(), 1);
    }

    /// BUILD_GUIDE step 1.6: a second claim for the same tranche reverts.
    #[test]
    fn a_second_claim_for_the_same_tranche_is_rejected() {
        let mut ledger = ClaimLedger::new();
        ledger
            .record(1, holder(1), split(250_000, REDEMPTION_BPS))
            .expect("first claim records");
        assert_eq!(
            ledger.record(1, holder(1), split(250_000, REDEMPTION_BPS)),
            Err(LedgerError::AlreadyClaimed)
        );
        assert_eq!(ledger.len(), 1, "the rejected claim must not be recorded");
        assert_eq!(ledger.paid(), 250_000);
    }

    #[test]
    fn the_same_holder_may_claim_a_later_period() {
        let mut ledger = ClaimLedger::new();
        ledger.record(1, holder(1), split(100_000, REDEMPTION_BPS)).expect("records");
        ledger.record(2, holder(1), split(100_000, REDEMPTION_BPS)).expect("records");
        assert_eq!(ledger.len(), 2);
        assert_eq!(ledger.paid(), 200_000);
    }

    #[test]
    fn different_holders_may_claim_the_same_period() {
        let mut ledger = ClaimLedger::new();
        ledger.record(1, holder(1), split(100_000, REDEMPTION_BPS)).expect("records");
        ledger.record(1, holder(2), split(100_000, REDEMPTION_BPS)).expect("records");
        assert_eq!(ledger.len(), 2);
    }

    #[test]
    fn an_empty_claim_is_rejected() {
        let mut ledger = ClaimLedger::new();
        assert_eq!(
            ledger.record(1, holder(1), split(0, REDEMPTION_BPS)),
            Err(LedgerError::EmptyClaim)
        );
    }

    /// BUILD_GUIDE step 1.6: the vault balance reconciles to the sum of
    /// outstanding claims after every operation.
    #[test]
    fn the_vault_reconciles_after_every_operation() {
        let holdings = [250_000u64, 400_000, 300_000, 50_000];
        let mut ledger = ClaimLedger::new();
        let mut expected_remaining = POT;

        for (index, balance) in holdings.iter().enumerate() {
            let gross = balance / 1_000;
            ledger
                .record(1, holder(index as u8 + 1), split(gross, REDEMPTION_BPS))
                .expect("claim records");
            expected_remaining -= gross;
            assert_eq!(ledger.reconcile(POT).expect("vault funded"), expected_remaining);
        }
    }

    #[test]
    fn an_overclaimed_vault_is_a_hard_failure() {
        let mut ledger = ClaimLedger::new();
        ledger.record(1, holder(1), split(POT + 1, REDEMPTION_BPS)).expect("records");
        assert_eq!(ledger.reconcile(POT), Err(LedgerError::VaultUnderfunded));
    }

    #[test]
    fn fees_accumulate_separately_from_payouts() {
        let mut ledger = ClaimLedger::new();
        ledger.record(1, holder(1), split(1_000_000, WATERFALL_BPS)).expect("records");
        assert_eq!(ledger.paid(), 1_000_000);
        assert_eq!(ledger.fees(), 5_000);
    }

    /// BUILD_GUIDE step 1.7: the distribution fee is charged only when a
    /// distribution actually occurs, so a zero gross claim is refused outright
    /// rather than recording a zero-value fee.
    #[test]
    fn no_distribution_records_no_fee() {
        let mut ledger = ClaimLedger::new();
        assert!(ledger.record(1, holder(1), split(0, WATERFALL_BPS)).is_err());
        assert_eq!(ledger.fees(), 0);
    }

    #[test]
    fn records_preserve_submission_order() {
        let mut ledger = ClaimLedger::new();
        for seed in 1..=3u8 {
            ledger.record(1, holder(seed), split(1_000, REDEMPTION_BPS)).expect("records");
        }
        let order: Vec<u8> = ledger.records().iter().map(|record| record.holder[0]).collect();
        assert_eq!(order, vec![1, 2, 3]);
    }
}
