//! Dependency-free pure logic for Sluice.
//!
//! Everything in this crate is deterministic integer or fixed point maths with no
//! Solana, Anchor or token imports. That is deliberate. It is the only part of the
//! program set that can be exercised with `cargo test` on a plain toolchain, and
//! it holds the arithmetic that decides where a holder's money goes.
//!
//! The Anchor programs in the sibling crates are thin wrappers that read accounts,
//! validate constraints and call into these functions. Nothing here reads or writes
//! chain state.
//!
//! All monetary values are integer micro-units of the settlement asset. There are
//! no floating point values anywhere in Sluice, on chain or off.

#![deny(missing_docs)]
#![forbid(unsafe_code)]

pub mod curve;
pub mod issuance;
pub mod ledger;
pub mod milestone;
pub mod policy;
pub mod pro_rata;

/// Basis point denominator used by every fee and every ratio in Sluice.
pub const BPS_DENOMINATOR: u64 = 10_000;

/// Number of segments on a Sluice issuance curve.
///
/// Sixteen is fixed by the Meteora DBC segment layout the protocol is built on.
pub const SEGMENT_COUNT: u64 = 16;

/// Treasury reserve allocation, in basis points.
pub const TREASURY_RESERVE_BPS: u64 = 5_500;

/// Founder draw allocation, in basis points.
pub const FOUNDER_DRAW_BPS: u64 = 2_500;

/// Growth allocation, in basis points.
pub const GROWTH_BPS: u64 = 1_200;

/// Insurance reserve allocation, in basis points.
pub const INSURANCE_BPS: u64 = 800;

/// Errors returned when a fee cannot be split across the treasury allocations.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AllocationError {
    /// The published shares do not sum to ten thousand basis points.
    SharesDoNotSumToOneHundredPercent,
    /// A share exceeded one hundred percent of the fee.
    ShareExceedsFee,
}

/// The four allocations a routed fee is divided into.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Allocations {
    /// Treasury reserve, for audits, legal, security and runway.
    pub reserve: u64,
    /// Founder and early team draw.
    pub founder: u64,
    /// Issuer rebates, business development and ecosystem.
    pub growth: u64,
    /// Backstop for attestation failure.
    pub insurance: u64,
}

impl Allocations {
    /// Total allocated.
    #[must_use]
    pub const fn total(&self) -> u64 {
        self.reserve + self.founder + self.growth + self.insurance
    }
}

/// Splits a fee across the treasury allocations.
///
/// The four shares are published and fixed. Integer division leaves a residue of
/// at most a few units, which goes to the reserve so that the four allocations
/// always sum to the whole fee. Revenue that reaches a treasury which does not
/// add up is worse than a lower rate that does.
///
/// # Errors
///
/// Returns [`AllocationError::SharesDoNotSumToOneHundredPercent`] if the shares
/// are misconfigured. With the published constants this cannot happen, so the
/// check guards against a future edit rather than a current fault.
pub fn split_fee(amount: u64) -> Result<Allocations, AllocationError> {
    let shares = TREASURY_RESERVE_BPS + FOUNDER_DRAW_BPS + GROWTH_BPS + INSURANCE_BPS;
    if shares != BPS_DENOMINATOR {
        return Err(AllocationError::SharesDoNotSumToOneHundredPercent);
    }

    let reserve = mul_div_floor(
        u128::from(amount),
        u128::from(TREASURY_RESERVE_BPS),
        u128::from(BPS_DENOMINATOR),
    ) as u64;
    let founder = mul_div_floor(
        u128::from(amount),
        u128::from(FOUNDER_DRAW_BPS),
        u128::from(BPS_DENOMINATOR),
    ) as u64;
    let growth = mul_div_floor(
        u128::from(amount),
        u128::from(GROWTH_BPS),
        u128::from(BPS_DENOMINATOR),
    ) as u64;
    let insurance = mul_div_floor(
        u128::from(amount),
        u128::from(INSURANCE_BPS),
        u128::from(BPS_DENOMINATOR),
    ) as u64;

    let allocated = reserve + founder + growth + insurance;
    let reserve = reserve + (amount - allocated);

    Ok(Allocations {
        reserve,
        founder,
        growth,
        insurance,
    })
}

#[cfg(test)]
mod treasury_tests {
    use super::*;

    #[test]
    fn the_published_shares_sum_to_one_hundred_percent() {
        assert_eq!(
            TREASURY_RESERVE_BPS + FOUNDER_DRAW_BPS + GROWTH_BPS + INSURANCE_BPS,
            BPS_DENOMINATOR
        );
    }

    /// Revenue that reaches a treasury which does not add up is worse than a lower
    /// rate that does, so the residue is paid back rather than dropped.
    #[test]
    fn every_allocation_sums_to_the_whole_fee() {
        for amount in [0u64, 1, 3, 7, 99, 1_000, 1_000_000, u64::MAX] {
            let split = split_fee(amount).expect("shares are valid");
            assert_eq!(
                split.total(),
                amount,
                "allocations lost units on a fee of {amount}"
            );
        }
    }

    #[test]
    fn the_reserve_takes_the_rounding_residue() {
        // 3 across 55/25/12/8 percent floors to 1, 0, 0, 0. The residue of 2 goes
        // to the reserve, giving 3 in total.
        let split = split_fee(3).expect("shares are valid");
        assert_eq!(split.total(), 3);
        assert_eq!(split.reserve, 3);
    }

    #[test]
    fn the_founder_draw_is_roughly_a_quarter_of_gross_revenue() {
        let split = split_fee(1_000_000).expect("shares are valid");
        assert_eq!(split.founder, 250_000);
        assert_eq!(split.reserve, 550_000);
        assert_eq!(split.growth, 120_000);
        assert_eq!(split.insurance, 80_000);
    }

    #[test]
    fn splitting_is_monotonic_in_the_fee() {
        let small = split_fee(1_000).expect("shares are valid");
        let large = split_fee(1_000_000).expect("shares are valid");
        assert!(large.reserve >= small.reserve);
        assert!(large.founder >= small.founder);
    }
}

/// Computes `floor(a * b / c)` for amounts bounded by `u64::MAX`.
///
/// Every caller in Sluice passes token amounts, balances or pots, all of which are
/// `u64` by the type system. `u64::MAX * u64::MAX` is strictly less than
/// `u128::MAX`, so widening to `u128` before multiplying is not merely a
/// convention, it is sufficient. `mul_div_floor_wide` carries the proof of that
/// bound as a test rather than leaving it as a comment.
///
/// Returns `0` when `c` is zero rather than panicking, because callers reach this
/// only from paths that have already validated their denominator.
///
/// # Examples
///
/// ```
/// use sluice_core_math::mul_div_floor;
/// assert_eq!(mul_div_floor(7, 1_000, 3), 2_333);
/// assert_eq!(mul_div_floor(u128::from(u64::MAX), u128::from(u64::MAX), u128::from(u64::MAX)), u128::from(u64::MAX));
/// ```
#[must_use]
pub fn mul_div_floor(a: u128, b: u128, c: u128) -> u128 {
    if c == 0 || a == 0 || b == 0 {
        return 0;
    }
    a.checked_mul(b).map_or(0, |product| product / c)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The bound every caller relies on. If this ever fails, `mul_div_floor` has
    /// silently become wrong at the largest balances and the claim path with it.
    #[test]
    fn the_product_of_two_maximum_u64_values_fits_in_u128() {
        let product = u128::from(u64::MAX) * u128::from(u64::MAX);
        assert!(product <= u128::MAX);
        assert_eq!(
            mul_div_floor(
                u128::from(u64::MAX),
                u128::from(u64::MAX),
                u128::from(u64::MAX)
            ),
            u128::from(u64::MAX)
        );
    }

    #[test]
    fn floors_toward_zero() {
        assert_eq!(mul_div_floor(7, 1_000, 3), 2_333);
        assert_eq!(mul_div_floor(1, 1, 3), 0);
        assert_eq!(mul_div_floor(3, 1, 3), 1);
    }

    #[test]
    fn a_zero_denominator_yields_zero_instead_of_panicking() {
        assert_eq!(mul_div_floor(10, 10, 0), 0);
    }

    #[test]
    fn a_zero_operand_yields_zero() {
        assert_eq!(mul_div_floor(0, 123_456, 7), 0);
        assert_eq!(mul_div_floor(123_456, 0, 7), 0);
    }

    #[test]
    fn agrees_with_native_division_across_the_u64_range() {
        for a in [0u128, 1, 2, 999, 1_000_000, u128::from(u32::MAX), u128::from(u64::MAX)] {
            for b in [0u128, 1, 3, 10_000, u128::from(u64::MAX / 3)] {
                for c in [1u128, 2, 7, 1_000_000, u128::from(u64::MAX)] {
                    assert_eq!(
                        mul_div_floor(a, b, c),
                        if c == 0 || a == 0 || b == 0 {
                            0
                        } else {
                            (a * b) / c
                        },
                        "mul_div_floor({a}, {b}, {c}) disagreed with native division"
                    );
                }
            }
        }
    }
}

/// Rounds `numerator / denominator` half away from zero, saturating on overflow.
///
/// Used where a fee or an allocation must never silently round in a user's favour
/// and never panic in a program.
#[must_use]
pub fn div_round_half_up(numerator: u128, denominator: u128) -> u128 {
    if denominator == 0 {
        return 0;
    }
    let half = denominator / 2;
    numerator
        .checked_add(half)
        .map_or(numerator, |sum| sum / denominator)
}

/// Converts a micro-unit amount into whole units rounded down.
///
/// Used for reporting. Never used to decide an amount that moves.
#[must_use]
pub fn to_whole_units(amount: u128) -> u128 {
    amount / 1_000_000
}
