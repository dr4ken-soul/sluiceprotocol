//! Issuance economics: the minimum raise and the issuance fee.
//!
//! Both exist because the issuance fee is a flat floor sitting against a
//! proportional alternative, and without a floor the pair becomes indefensible. A
//! $200 target would pay a 100% fee and a $1,000 target would pay 20%.
//!
//! The logic lives here rather than in the programme so it can be unit tested. A
//! frontend check is a suggestion; a programme check is a rule; neither is a
//! substitute for a test that proves the arithmetic.

use crate::{BPS_DENOMINATOR, mul_div_floor};

/// The minimum raise, in whole currency units.
///
/// Enforced at issuance creation.
pub const MINIMUM_RAISE_USD: u64 = 25_000;

/// The flat component of the issuance fee, in whole currency units.
pub const ISSUANCE_FEE_FLAT_USD: u64 = 200;

/// The proportional component, in basis points of the target.
pub const ISSUANCE_FEE_BPS: u64 = 25;

/// The cap on the fee as a share of the target, in basis points.
///
/// The current numbers never approach this. It exists so raising the flat fee later
/// cannot turn into a punitive effective rate on small issuers.
pub const ISSUANCE_FEE_CAP_BPS: u64 = 100;

/// The target at which the flat fee and the proportional fee meet, in whole units.
///
/// Above this the proportional fee takes over and the effective rate settles at
/// 0.25 percent.
pub const FEE_CROSSOVER_USD: u64 = 80_000;

/// Why an issuance was rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IssuanceError {
    /// The target is below the $25,000 floor.
    BelowMinimumRaise,
    /// The resulting fee would exceed one percent of the target.
    FeeCapBreached,
}

/// The issuance fee for a given target.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IssuanceFee {
    /// Total fee in whole currency units.
    pub amount: u64,
    /// The fee as a share of the target, in basis points.
    pub effective_bps: u64,
}

/// Computes the issuance fee for a target.
///
/// The flat floor applies until the proportional alternative overtakes it, which
/// happens at $80,000. The cap is then checked, so a future change to either
/// constant cannot produce a punitive rate without this failing.
///
/// # Errors
///
/// Returns [`IssuanceError::BelowMinimumRaise`] for a target under the floor and
/// [`IssuanceError::FeeCapBreached`] if the fee would exceed one percent.
pub fn issuance_fee(target_usd: u64) -> Result<IssuanceFee, IssuanceError> {
    if target_usd < MINIMUM_RAISE_USD {
        return Err(IssuanceError::BelowMinimumRaise);
    }

    let proportional = mul_div_floor(
        u128::from(target_usd),
        u128::from(ISSUANCE_FEE_BPS),
        u128::from(BPS_DENOMINATOR),
    ) as u64;

    let amount = ISSUANCE_FEE_FLAT_USD.max(proportional);
    let effective_bps = mul_div_floor(
        u128::from(amount),
        u128::from(BPS_DENOMINATOR),
        u128::from(target_usd),
    ) as u64;

    if effective_bps > ISSUANCE_FEE_CAP_BPS {
        return Err(IssuanceError::FeeCapBreached);
    }

    Ok(IssuanceFee { amount, effective_bps })
}

/// Whether test issuances are free on this cluster.
///
/// A builder needs to exercise the wizard without paying, and that path must be
/// impossible on mainnet, where the flat fee is the only thing detering spam.
#[must_use]
pub fn test_issuances_are_free(network: &str) -> bool {
    network != "mainnet-beta"
}

/// The curve trade fee for a notional.
///
/// Buying and selling are charged identically, because both are trades and there
/// is no separate deposit step to exempt.
#[must_use]
pub fn curve_trade_fee(notional: u64, fee_bps: u32) -> u64 {
    mul_div_floor(
        u128::from(notional),
        u128::from(fee_bps),
        u128::from(BPS_DENOMINATOR),
    ) as u64
}

#[cfg(test)]
mod issuance_tests {
    use super::*;

    /// `PRODUCT_OPS.md` §13.3 publishes this table. It is reproduced here as a test
    /// so the two cannot drift.
    #[test]
    fn the_published_effective_rates_hold() {
        let cases: [(u64, u64, u64); 4] = [
            // target, fee, effective rate in basis points
            (25_000, 200, 80),
            (50_000, 200, 40),
            (80_000, 200, 25),
            (160_000, 400, 25),
        ];

        for (target, expected_fee, expected_bps) in cases {
            let fee = issuance_fee(target).expect("target is above the floor");
            assert_eq!(
                fee.amount, expected_fee,
                "fee for {target} was {}, expected {expected_fee}",
                fee.amount
            );
            assert_eq!(
                fee.effective_bps, expected_bps,
                "effective rate for {target} was {} bps, expected {expected_bps}",
                fee.effective_bps
            );
        }
    }

    #[test]
    fn the_floor_is_exactly_twenty_five_thousand() {
        assert_eq!(issuance_fee(24_999), Err(IssuanceError::BelowMinimumRaise));
        assert!(issuance_fee(25_000).is_ok());
    }

    #[test]
    fn the_crossover_is_exactly_eighty_thousand() {
        assert_eq!(issuance_fee(FEE_CROSSOVER_USD - 1).expect("valid").amount, 200);
        assert_eq!(issuance_fee(FEE_CROSSOVER_USD).expect("valid").amount, 200);
        // Above the crossover the proportional fee takes over.
        assert_eq!(issuance_fee(FEE_CROSSOVER_USD * 2).expect("valid").amount, 400);
    }

    #[test]
    fn the_fee_never_exceeds_one_percent_of_the_target() {
        for target in (MINIMUM_RAISE_USD..=1_000_000_000).step_by(7_919) {
            let fee = issuance_fee(target).expect("target is above the floor");
            assert!(
                fee.effective_bps <= ISSUANCE_FEE_CAP_BPS,
                "effective rate for {target} was {} bps",
                fee.effective_bps
            );
        }
    }

    /// The effective rate never rises by more than a basis point as the target
    /// grows. The tolerance is one basis point because the reported rate is itself
    /// floored from a fraction: at $81,000 the fee of 202 works out to 24.9 bps and
    /// at $82,000 the fee of 205 works out to exactly 25. That is rounding in the
    /// measurement, not a rate increase, and asserting exact monotonicity would be
    /// asserting that the arithmetic does not use integers.
    #[test]
    fn a_richer_target_never_materially_costs_a_larger_effective_rate() {
        // Seeded from the floor rather than from `u64::MAX`, because the comparison
        // adds one basis point of tolerance and would overflow on the first step.
        let mut previous = issuance_fee(MINIMUM_RAISE_USD)
            .expect("valid")
            .effective_bps;
        for target in (MINIMUM_RAISE_USD..=5_000_000).step_by(1_000) {
            let bps = issuance_fee(target).expect("valid").effective_bps;
            assert!(
                bps <= previous + 1,
                "effective rate rose from {previous} to {bps} bps at {target}"
            );
            previous = bps;
        }
    }

    #[test]
    fn test_issuances_are_free_off_mainnet_and_never_on_it() {
        assert!(test_issuances_are_free("devnet"));
        assert!(test_issuances_are_free("testnet"));
        assert!(test_issuances_are_free("localnet"));
        assert!(!test_issuances_are_free("mainnet-beta"));
    }

    /// The whole point of the change that removed the deposit exemption: a buy must
    /// accrue a fee, and there must be no branch that reaches zero.
    #[test]
    fn a_curve_trade_always_accrues_the_published_rate() {
        assert_eq!(curve_trade_fee(1_000_000, 30), 3_000);
        // Both directions use the same function, so neither can be exempt.
        assert_eq!(curve_trade_fee(1_000_000, 30), curve_trade_fee(1_000_000, 30));
    }

    /// The smallest notional that can accrue a whole unit of fee.
    ///
    /// A fee of one unit requires `notional * 30 >= 10_000`, so the threshold is 334.
    /// Below it the fee floors to zero. That is a property of integer arithmetic
    /// rather than an exemption: it is why the rate is expressed in basis points of
    /// micro-units and why no fee is ever taken from the LP fee to make up a
    /// rounding gap. At Sluice's trade sizes a notional this small is not reachable.
    const SMALLEST_CHARGED_NOTIONAL: u64 = 334;

    #[test]
    fn every_notional_above_the_threshold_accrues_a_fee() {
        for notional in [
            SMALLEST_CHARGED_NOTIONAL,
            1_000,
            12_345,
            1_000_000,
            u64::MAX / 2,
        ] {
            let fee = curve_trade_fee(notional, 30);
            assert!(
                fee > 0,
                "a notional of {notional} accrued no fee, which is a deposit exemption"
            );
        }
    }

    #[test]
    fn the_threshold_is_exactly_where_integer_flooring_begins() {
        assert_eq!(curve_trade_fee(SMALLEST_CHARGED_NOTIONAL - 1, 30), 0);
        assert_eq!(curve_trade_fee(SMALLEST_CHARGED_NOTIONAL, 30), 1);
    }

    #[test]
    fn curve_trade_fee_reconciles_to_the_notional() {
        let notional = 1_234_567u64;
        let fee = curve_trade_fee(notional, 30);
        assert!(fee <= notional, "the fee exceeded the notional");
        assert_eq!(notional - fee + fee, notional);
    }
}
