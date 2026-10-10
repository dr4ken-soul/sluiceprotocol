//! Pro rata claim and distribution arithmetic for the redemption and waterfall vaults.
//!
//! Both vaults use the same shape: a pot is shared among holders in proportion to
//! what they hold, and the protocol fee is a deduction taken before the holder is
//! paid. Both use a claim pattern rather than a push loop, so gas stays bounded
//! regardless of holder count.
//!
//! The invariant that matters is that `net + fee == gross` exactly, for every
//! claim, with no residue. A vault whose balance does not reconcile to the sum of
//! outstanding claims is broken in a way a holder will notice and a protocol cannot
//! argue about, so the split is asserted directly in the tests.

use crate::{BPS_DENOMINATOR, mul_div_floor};

/// Errors returned when a claim cannot be computed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ClaimError {
    /// Total supply was zero, so a share cannot be computed.
    ZeroSupply,
    /// The requested amount exceeded what is available.
    InsufficientPot,
    /// A holder's balance exceeded the total supply it was measured against,
    /// which means the snapshot and the supply are inconsistent.
    BalanceExceedsSupply,
    /// The fee exceeded the gross amount, which can only happen if a rate above
    /// one hundred percent was configured.
    FeeExceedsGross,
}

/// The result of splitting a pot between the protocol and a holder.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ClaimBreakdown {
    /// Amount leaving the vault.
    pub gross: u64,
    /// Amount routed to the treasury PDA.
    pub fee: u64,
    /// Amount reaching the holder.
    pub net: u64,
}

/// Computes a holder's pro rata entitlement to a pot.
///
/// The multiplication runs in `u128` and divides once, so the standard
/// intermediate overflow that plagues naive `u64` share maths cannot occur and
/// there is no rounding step to lose a unit to.
///
/// The balance is checked against the supply first. A holder cannot own more than
/// the whole supply, and letting that through would produce an entitlement larger
/// than the pot itself, which is the signature of a stale snapshot rather than a
/// real claim.
///
/// # Errors
///
/// Returns [`ClaimError::ZeroSupply`] when `total_supply` is zero,
/// [`ClaimError::BalanceExceedsSupply`] when `balance` exceeds `total_supply`, and
/// [`ClaimError::InsufficientPot`] when the entitlement does not fit in `u64`.
#[must_use]
pub fn pro_rata_share(balance: u64, total_supply: u64, pot: u64) -> Result<u64, ClaimError> {
    if total_supply == 0 {
        return Err(ClaimError::ZeroSupply);
    }
    if balance > total_supply {
        return Err(ClaimError::BalanceExceedsSupply);
    }
    // `mul_div_floor` rather than `balance * pot / total_supply`, because the direct
    // form overflows `u128` for two large but perfectly plausible `u64` amounts.
    let share = mul_div_floor(u128::from(balance), u128::from(pot), u128::from(total_supply));
    let share = u64::try_from(share).map_err(|_| ClaimError::InsufficientPot)?;
    if share > pot {
        return Err(ClaimError::InsufficientPot);
    }
    Ok(share)
}

/// Splits a gross amount into the protocol fee and the holder's net amount.
///
/// The fee is floored, so rounding never moves a unit out of the holder's share,
/// and `fee + net` always equals `gross` exactly. Rates above one hundred percent
/// are rejected rather than clamped, because a misconfigured rate should fail a
/// transaction, not silently pay someone a negative amount.
///
/// # Errors
///
/// Returns [`ClaimError::FeeExceedsGross`] when `fee_bps` exceeds 10,000.
pub fn apply_fee(gross: u64, fee_bps: u32) -> Result<ClaimBreakdown, ClaimError> {
    if u64::from(fee_bps) > BPS_DENOMINATOR {
        return Err(ClaimError::FeeExceedsGross);
    }
    let fee = u64::try_from(mul_div_floor(
        u128::from(gross),
        u128::from(fee_bps),
        u128::from(BPS_DENOMINATOR),
    ))
    .map_err(|_| ClaimError::FeeExceedsGross)?;
    Ok(ClaimBreakdown {
        gross,
        fee,
        net: gross - fee,
    })
}

/// Convenience wrapper: entitlement and fee split in one call.
///
/// This is the exact call the redemption and waterfall claim instructions make.
///
/// # Errors
///
/// Propagates [`pro_rata_share`] and [`apply_fee`].
pub fn claim(
    balance: u64,
    total_supply: u64,
    pot: u64,
    fee_bps: u32,
) -> Result<ClaimBreakdown, ClaimError> {
    let gross = pro_rata_share(balance, total_supply, pot)?;
    apply_fee(gross, fee_bps)
}

/// Total of a set of breakdowns, used to reconcile a vault against its claims.
///
/// Sums in `u128` and only returns `None` if the caller has supplied figures that
/// cannot describe a real vault, rather than panicking mid-settlement.
#[must_use]
pub fn reconcile(breakdowns: &[ClaimBreakdown]) -> Option<u128> {
    let mut total = 0u128;
    for entry in breakdowns {
        total = total.checked_add(u128::from(entry.net))?;
        total = total.checked_add(u128::from(entry.fee))?;
    }
    Some(total)
}

/// Redemption claims are charged at 0.25 percent, the lowest percentage fee in
/// the protocol on purpose. This user's milestone just failed.
///
/// Not behind `#[cfg(test)]`. `redemption/src/lib.rs` imports this for a non-test
/// build to price a claim, and an attribute here binds to the *next* item, so
/// marking this one test-only left it undefined in release and silently extended the
/// attribute to the const below it. `tsc`-equivalent checks do not catch it because
/// the crate has never been compiled for the SBF target.
pub const REDEMPTION_BPS: u32 = 25;

/// Waterfall claims are charged at 0.50 percent, and only when a distribution
/// actually occurs.
pub const WATERFALL_BPS: u32 = 50;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_a_zero_supply() {
        assert_eq!(
            pro_rata_share(100, 0, 1_000),
            Err(ClaimError::ZeroSupply)
        );
    }

    #[test]
    fn rejects_a_balance_larger_than_the_supply() {
        assert_eq!(
            pro_rata_share(1_001, 1_000, 10_000),
            Err(ClaimError::BalanceExceedsSupply)
        );
    }

    #[test]
    fn shares_are_proportional() {
        assert_eq!(pro_rata_share(250, 1_000, 4_000).expect("share"), 1_000);
        assert_eq!(pro_rata_share(500, 1_000, 4_000).expect("share"), 2_000);
        assert_eq!(pro_rata_share(1_000, 1_000, 4_000).expect("share"), 4_000);
    }

    #[test]
    fn a_holding_nothing_claims_nothing() {
        assert_eq!(pro_rata_share(0, 1_000, 4_000).expect("share"), 0);
    }

    /// Required by BUILD_GUIDE step 1.6: the vault balance must reconcile to the
    /// sum of outstanding claims after every operation.
    #[test]
    fn a_fully_distributed_pot_reconciles_exactly() {
        let pot = 1_000_000u64;
        let supply = 1_000_000u64;
        let holdings = [250_000u64, 400_000u64, 300_000u64, 50_000u64];

        let breakdowns: Vec<ClaimBreakdown> = holdings
            .iter()
            .map(|balance| claim(*balance, supply, pot, REDEMPTION_BPS).expect("claim computes"))
            .collect();

        let total = reconcile(&breakdowns).expect("no overflow");
        assert_eq!(total, u128::from(pot));
    }

    #[test]
    fn net_plus_fee_equals_gross_for_every_rate() {
        for bps in [0u32, 15, 25, 30, 50, 150, 2_500, 10_000] {
            for gross in [0u64, 1, 7, 999, 1_000_000, u32::MAX.into(), 1_000_000_000_000] {
                let split = apply_fee(gross, bps).expect("rate is valid");
                assert_eq!(
                    u64::from(split.fee) + split.net,
                    gross,
                    "split did not reconcile at {} bps on {}",
                    bps,
                    gross
                );
            }
        }
    }

    #[test]
    fn a_hundred_percent_rate_pays_the_holder_nothing() {
        let split = apply_fee(1_000_000, 10_000).expect("rate is valid");
        assert_eq!(split.fee, 1_000_000);
        assert_eq!(split.net, 0);
    }

    #[test]
    fn rejects_a_rate_above_one_hundred_percent() {
        assert_eq!(
            apply_fee(1_000, 10_001),
            Err(ClaimError::FeeExceedsGross)
        );
    }

    #[test]
    fn the_redemption_fee_is_a_quarter_of_one_percent() {
        let split = apply_fee(1_000_000, REDEMPTION_BPS).expect("rate is valid");
        assert_eq!(split.fee, 2_500);
        assert_eq!(split.net, 997_500);
    }

    #[test]
    fn the_waterfall_fee_is_half_of_one_percent() {
        let split = apply_fee(1_000_000, WATERFALL_BPS).expect("rate is valid");
        assert_eq!(split.fee, 5_000);
        assert_eq!(split.net, 995_000);
    }

    /// BUILD_GUIDE step 1.7: the waterfall fee is charged only when a distribution
    /// actually occurs. No distribution, no fee. This is the guard that stops a
    /// later change quietly turning every snapshot into a charge.
    #[test]
    fn no_distribution_means_no_fee() {
        let empty = claim(0, 1_000_000, 0, WATERFALL_BPS).expect("claim computes");
        assert_eq!(empty.gross, 0);
        assert_eq!(empty.fee, 0);
        assert_eq!(empty.net, 0);
    }

    /// BUILD_GUIDE step 1.7: a holder claiming after a later snapshot does not
    /// receive the earlier distribution, because each snapshot is a fixed pot
    /// divided by the supply as at that snapshot.
    #[test]
    fn a_later_snapshot_cannot_reach_an_earlier_distribution() {
        let first_pot = 1_000_000u64;
        let late_holder_balance = 100u64;
        let first = claim(late_holder_balance, 1_000_000, first_pot, REDEMPTION_BPS)
            .expect("claim computes");
        assert_eq!(first.gross, 100);

        // The second snapshot distributes a fresh pot. The late holder's share of
        // it depends only on this pot and the supply at this snapshot.
        let second = claim(late_holder_balance, 1_000_000, 500_000, REDEMPTION_BPS)
            .expect("claim computes");
        assert_eq!(second.gross, 50);
    }

    #[test]
    fn large_holdings_do_not_overflow() {
        let share = pro_rata_share(u64::MAX, u64::MAX, u64::MAX).expect("share");
        assert_eq!(share, u64::MAX);
    }

    #[test]
    fn a_share_never_exceeds_the_pot() {
        let pot = u64::MAX;
        let supply = u64::MAX;
        for balance in [0u64, 1, 1_000, 1_000_000, u32::MAX.into(), u64::MAX] {
            let share = pro_rata_share(balance, supply, pot).expect("share");
            assert!(share <= pot, "share {share} exceeded the pot");
        }
    }

    /// `balance * pot` is roughly `1.7e38` here, close to the `u128` ceiling. This
    /// is the case that makes the widening load-bearing rather than decorative.
    #[test]
    fn large_amounts_do_not_overflow_the_intermediate_product() {
        let share = pro_rata_share(u64::MAX, u64::MAX, u64::MAX).expect("share computes");
        assert_eq!(share, u64::MAX);

        let breakdown = claim(u64::MAX, u64::MAX, u64::MAX, REDEMPTION_BPS).expect("claim computes");
        assert_eq!(breakdown.gross, u64::MAX);
        assert_eq!(u64::from(breakdown.fee) + breakdown.net, u64::MAX);
    }
}
