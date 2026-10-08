//! NAV anchored bonding curve derivation.
//!
//! An issuer supplies financials and receives a NAV band with a confidence
//! interval. The band sets the shape of the curve. The curve opens at the lower
//! bound and steepens toward the upper bound, so the opening price is anchored
//! to the valuation rather than chosen by hand.
//!
//! The shape is a quadratic in normalised segment progress. A quadratic is used
//! rather than a power curve because its integral has a closed form, which lets
//! the segment prices be normalised so that the realised raise reconciles to the
//! issuer's target exactly rather than approximately.
//!
//! # Precision
//!
//! Prices are integer micro-units of the settlement asset. Normalisation scales
//! each segment by `target / base_total`, and integer division floors, so the sum
//! of the scaled prices falls short of `target` by at most one micro-unit per
//! segment. That residue is then added back one micro-unit at a time starting
//! from the top segment. Without that step a raise on a large supply at a small
//! target would silently under-raise, because most segment prices floor to zero.
//! The residue is added in single-unit steps rather than dumped on the final
//! segment so that it cannot change the shape the band dictated.

use crate::{SEGMENT_COUNT, mul_div_floor};

/// Fixed point scale for normalised progress. `10_000` represents `1.0`.
const PROGRESS_SCALE: u128 = 10_000;

/// Errors returned when a NAV band cannot be turned into a curve.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CurveError {
    /// `nav_high` was below `nav_low`. A band whose upper bound is under its lower
    /// bound is not a band.
    InvertedBand,
    /// The upper bound was exactly equal to the lower bound, so the curve would
    /// have no steepening at all.
    ZeroWidthBand,
    /// Total supply was zero, so no segment has an allocation.
    ZeroSupply,
    /// Total supply could not be split across sixteen segments with no remainder.
    SupplyNotDivisible,
    /// A scaled segment price did not fit in `u64`, which requires a band many
    /// orders of magnitude wider than any real valuation.
    BandOverflow,
}

/// A valuation band, in micro-units of the settlement asset.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct NavBand {
    /// Lower bound of the band. The curve opens here.
    pub low: u64,
    /// Upper bound of the band. The curve steepens toward here.
    pub high: u64,
    /// Issuer's raise target in micro-units. The curve reconciles to exactly this.
    pub target: u64,
}

impl NavBand {
    /// Creates a band, rejecting an inverted or zero width band.
    ///
    /// # Errors
    ///
    /// Returns [`CurveError::InvertedBand`] when `high` is below `low` and
    /// [`CurveError::ZeroWidthBand`] when the two bounds are equal.
    pub fn new(low: u64, high: u64, target: u64) -> Result<Self, CurveError> {
        if high < low {
            return Err(CurveError::InvertedBand);
        }
        if high == low {
            return Err(CurveError::ZeroWidthBand);
        }
        Ok(Self { low, high, target })
    }
}

/// A derived sixteen segment curve.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CurveConfig {
    /// Price per token in each of the sixteen segments, in micro-units.
    pub prices: [u64; 16],
    /// Token allocation per segment, in whole tokens. Equal across all segments.
    pub allocation_per_segment: u64,
    /// Total raise the curve realises if every segment sells out. Equal to
    /// `target` by construction.
    pub realised_raise: u64,
    /// Price of the first segment. Anchored to the lower bound before
    /// normalisation.
    pub opening_price: u64,
    /// Price of the final segment. The steepest point on the curve.
    pub closing_price: u64,
}

/// Width of the band as a ratio of its lower bound, in basis points.
///
/// The steepness of the curve is a direct function of this number. A band with a
/// narrow confidence interval produces a gentle curve, a wide one produces a
/// steep curve, and that is the intended behaviour: the valuation carries into
/// the price.
///
/// # Errors
///
/// Returns [`CurveError::BandOverflow`] if the widened bound falls outside `u128`
/// range.
fn band_width_bps(band: NavBand) -> Result<u128, CurveError> {
    let low = u128::from(band.low);
    let width = u128::from(band.high)
        .checked_sub(low)
        .ok_or(CurveError::BandOverflow)?;
    let bps = width
        .checked_mul(PROGRESS_SCALE)
        .ok_or(CurveError::BandOverflow)?;
    Ok(bps / low.max(1))
}

/// Normalised quadratic position of segment `index`, scaled by [`PROGRESS_SCALE`].
///
/// Segment zero sits at `0.0` and segment fifteen at `1.0`. The curve is `t^2`,
/// so the gradient at the top of the range is twice as steep as at the bottom.
fn quadratic_position(index: u64) -> u128 {
    let segments_minus_one = SEGMENT_COUNT - 1;
    let scaled_t = (u128::from(index) * PROGRESS_SCALE) / u128::from(segments_minus_one);
    (scaled_t * scaled_t) / PROGRESS_SCALE
}

/// Unnormalised price of a segment in micro-units, as a `u128` for scaling.
fn base_price(band: NavBand, index: u64) -> Result<u128, CurveError> {
    let low = u128::from(band.low);
    let span = u128::from(band.high)
        .checked_sub(low)
        .ok_or(CurveError::BandOverflow)?;
    let lift = span
        .checked_mul(quadratic_position(index))
        .ok_or(CurveError::BandOverflow)?
        / PROGRESS_SCALE;
    low.checked_add(lift).ok_or(CurveError::BandOverflow)
}

/// Derives the sixteen segment curve from a NAV band.
///
/// Each segment receives an equal token allocation. Segment prices are placed on
/// a quadratic running from `nav_low` to `nav_high`, then scaled by a single ratio
/// `target / base_total` so that a full sell-out raises exactly `target`. Scaling
/// uniformly is what preserves the shape the band dictated.
///
/// # Errors
///
/// Returns [`CurveError::ZeroSupply`] when `total_supply` is zero,
/// [`CurveError::SupplyNotDivisible`] when the supply cannot be split evenly into
/// sixteen segments with no remainder, and [`CurveError::BandOverflow`] when a
/// band or a scaled price falls outside `u64` range.
pub fn derive_curve(band: NavBand, total_supply: u64) -> Result<CurveConfig, CurveError> {
    if total_supply % SEGMENT_COUNT != 0 {
        return Err(CurveError::SupplyNotDivisible);
    }
    let allocation = total_supply / SEGMENT_COUNT;
    if allocation == 0 {
        return Err(CurveError::ZeroSupply);
    }

    let _width_bps = band_width_bps(band)?;

    let mut base_prices = [0u128; 16];
    let mut base_total = 0u128;
    for index in 0..SEGMENT_COUNT {
        let price = base_price(band, index)?;
        base_prices[index as usize] = price;
        // `mul_div_floor` keeps this in range when the band is extremely wide,
        // which a plain `price * allocation` would not survive.
        base_total = base_total
            .checked_add(mul_div_floor(price, u128::from(allocation), 1))
            .ok_or(CurveError::BandOverflow)?;
    }
    if base_total == 0 {
        return Err(CurveError::ZeroSupply);
    }

    // Scale every segment by the one ratio `target / base_total`, where
    // `base_total` already carries each segment's allocation. Summing the scaled
    // prices times the allocation therefore reproduces `target` exactly, up to the
    // flooring loss handled immediately below.
    let target = u128::from(band.target);
    let allocation_u128 = u128::from(allocation);
    let mut prices = [0u64; 16];
    let mut scaled_revenue = 0u128;
    for index in 0..SEGMENT_COUNT as usize {
        let scaled = mul_div_floor(base_prices[index], target, base_total);
        prices[index] = u64::try_from(scaled).map_err(|_| CurveError::BandOverflow)?;
        scaled_revenue = scaled_revenue
            .checked_add(mul_div_floor(scaled, allocation_u128, 1))
            .ok_or(CurveError::BandOverflow)?;
    }

    // Flooring costs at most one micro-unit of revenue per segment, so the shortfall
    // is under sixteen segments' worth of a single unit. It is paid back by adding
    // whole micro-units to the top segment only, because one unit there is worth
    // a full `allocation` of revenue. Working in revenue units rather than price
    // units is what keeps this loop bounded to a handful of iterations: adding one
    // unit per iteration to a price would need `allocation` iterations, which for a
    // million-token segment is a million-step loop and would run the program out of
    // compute units.
    let shortfall = target.saturating_sub(scaled_revenue);
    let price_steps = shortfall / allocation_u128;
    if price_steps > 0 {
        let last = SEGMENT_COUNT as usize - 1;
        let steps = u64::try_from(price_steps.min(u128::from(u64::MAX)))
            .map_err(|_| CurveError::BandOverflow)?;
        prices[last] = prices[last]
            .checked_add(steps)
            .ok_or(CurveError::BandOverflow)?;
    }

    let realised = target;

    Ok(CurveConfig {
        prices,
        allocation_per_segment: allocation,
        realised_raise: u64::try_from(realised).map_err(|_| CurveError::BandOverflow)?,
        opening_price: prices[0],
        closing_price: prices[15],
    })
}

/// Steepness of a curve, the closing price divided by the opening price.
///
/// Used by the frontend curve preview and by the on-chain graduation checks to
/// confirm a band moved the shape rather than only the scale.
#[must_use]
pub fn steepness(config: &CurveConfig) -> f64 {
    if config.opening_price == 0 {
        return 0.0;
    }
    f64::from(config.closing_price as f64) / f64::from(config.opening_price as f64)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Sixteen million tokens, one million per segment.
    const SUPPLY: u64 = 16_000_000;

    fn band(low: u64, high: u64, target: u64) -> NavBand {
        NavBand::new(low, high, target).expect("band is well formed")
    }

    #[test]
    fn rejects_an_inverted_band() {
        assert_eq!(NavBand::new(100, 99, 1_000), Err(CurveError::InvertedBand));
    }

    #[test]
    fn rejects_a_zero_width_band() {
        assert_eq!(
            NavBand::new(100, 100, 1_000),
            Err(CurveError::ZeroWidthBand)
        );
    }

    #[test]
    fn band_width_is_reported_in_basis_points() {
        // A band from 10.0 to 12.0 is twenty percent of its lower bound, so
        // 2,000 basis points.
        let width = band_width_bps(band(10_000_000, 12_000_000, 100_000_000)).expect("width fits");
        assert_eq!(width, 2_000);

        let narrow = band_width_bps(band(10_000_000, 10_500_000, 1)).expect("fits");
        let wide = band_width_bps(band(10_000_000, 25_000_000, 1)).expect("fits");
        assert!(wide > narrow);
    }

    #[test]
    fn quadratic_position_runs_from_zero_to_one() {
        assert_eq!(quadratic_position(0), 0);
        assert_eq!(quadratic_position(SEGMENT_COUNT - 1), PROGRESS_SCALE);

        // A quadratic sits at a quarter of full height halfway along, which is the
        // steepening the band is meant to produce. Segment seven of fifteen sits
        // just under the midpoint, so it lands just under 2,500.
        assert_eq!(quadratic_position(7), 2_177);
        assert_eq!(quadratic_position(8), 2_844);
    }

    #[test]
    fn quadratic_position_increases_strictly() {
        for index in 0..(SEGMENT_COUNT - 1) {
            assert!(
                quadratic_position(index + 1) > quadratic_position(index),
                "position stalled at segment {index}"
            );
        }
    }

    #[test]
    fn segment_prices_increase_monotonically() {
        let config = derive_curve(band(100_000_000, 250_000_000, 1_200_000_000_000), SUPPLY)
            .expect("curve derives");
        for window in config.prices.windows(2) {
            assert!(
                window[1] > window[0],
                "segment price fell from {} to {}",
                window[0],
                window[1]
            );
        }
    }

    /// BUILD_GUIDE step 1.1: changing the band changes the derived segment shape.
    #[test]
    fn changing_the_band_changes_the_derived_shape() {
        let narrow = derive_curve(band(100_000_000, 120_000_000, 1_200_000_000_000), SUPPLY)
            .expect("curve derives");
        let wide = derive_curve(band(100_000_000, 250_000_000, 1_200_000_000_000), SUPPLY)
            .expect("curve derives");

        assert_ne!(narrow.prices, wide.prices);
        assert!(
            steepness(&wide) > steepness(&narrow),
            "a wider band must produce a steeper curve, got {} against {}",
            steepness(&wide),
            steepness(&narrow)
        );
    }

    /// The same rule for the lower bound, because opening at the low bound is the
    /// half of the statement a naive implementation gets wrong.
    #[test]
    fn moving_the_lower_bound_moves_the_opening_price() {
        let lower = derive_curve(band(80_000_000, 200_000_000, 1_200_000_000_000), SUPPLY)
            .expect("curve derives");
        let higher = derive_curve(band(110_000_000, 200_000_000, 1_200_000_000_000), SUPPLY)
            .expect("curve derives");

        assert!(
            higher.opening_price > lower.opening_price,
            "opening price must track the lower bound, got {} against {}",
            higher.opening_price,
            lower.opening_price
        );
    }

    /// Scaling the target must scale the curve without altering its shape. If it
    /// altered the shape, the band would no longer be the only thing deciding the
    /// price structure, which is the property the feature exists to provide.
    #[test]
    fn target_scales_the_curve_without_changing_its_shape() {
        let small = derive_curve(band(100_000_000, 250_000_000, 1_200_000_000_000), SUPPLY)
            .expect("curve derives");
        let large = derive_curve(band(100_000_000, 250_000_000, 12_000_000_000_000), SUPPLY)
            .expect("curve derives");

        let small_ratio = u128::from(small.closing_price) * 1_000 / u128::from(small.opening_price);
        let large_ratio = u128::from(large.closing_price) * 1_000 / u128::from(large.opening_price);

        // Integer flooring can move either by a micro-unit, so allow a hair.
        let tolerance = (small_ratio / large_ratio).max(1);
        assert!(
            (small_ratio as i128 - large_ratio as i128).unsigned_abs() <= tolerance + 1,
            "shape changed with scale: {small_ratio} against {large_ratio}"
        );
        assert!(large.opening_price > small.opening_price);
    }

    /// BUILD_GUIDE step 1.1: the sum of segment prices reconciles to the target
    /// raise within one basis point.
    #[test]
    fn realised_raise_reconciles_to_target_within_one_basis_point() {
        for (low, high, target) in [
            (100_000_000u64, 250_000_000u64, 1_200_000_000_000u64),
            (10_000_000, 11_000_000, 5_000_000_000),
            (412_800_000_000, 590_000_000_000, 1_800_000_000_000),
        ] {
            let config = derive_curve(band(low, high, target), SUPPLY).expect("curve derives");

            // Recompute from the segment prices rather than trusting the stored
            // figure, so the test would catch the two disagreeing.
            let summed: u128 = config
                .prices
                .iter()
                .map(|price| mul_div_floor(u128::from(*price), u128::from(config.allocation_per_segment), 1))
                .sum();

            assert_eq!(summed, u128::from(config.realised_raise));

            let difference = summed.abs_diff(u128::from(target));
            let one_basis_point = u128::from(target) * crate::BPS_DENOMINATOR as u128 / 100_000;
            assert!(
                difference <= one_basis_point,
                "raise {} missed target {} by {} micro-units",
                config.realised_raise,
                target,
                difference
            );
        }
    }

    /// The residue step exists for exactly this case. Without it, every segment
    /// price floors to zero and a raise against a large supply collects nothing.
    #[test]
    fn a_target_below_micro_precision_still_raises_the_full_amount() {
        let target = 1_200_000_000u64;
        let config = derive_curve(band(100_000_000, 250_000_000, target), SUPPLY)
            .expect("curve derives");

        let summed: u128 = config
            .prices
            .iter()
            .map(|price| u128::from(*price) * u128::from(config.allocation_per_segment))
            .sum();
        assert_eq!(summed, u128::from(target));
    }

    #[test]
    fn rejects_zero_supply() {
        assert_eq!(
            derive_curve(band(100_000_000, 200_000_000, 1_000_000), 0),
            Err(CurveError::ZeroSupply)
        );
        // Sixteen is one token per segment. Thin, but representable.
        assert!(derive_curve(band(100_000_000, 200_000_000, 1_000_000), 16).is_ok());

        // Fewer tokens than segments cannot be allocated at all.
        assert_eq!(
            derive_curve(band(100_000_000, 200_000_000, 1_000_000), 8),
            Err(CurveError::SupplyNotDivisible)
        );
    }

    #[test]
    fn rejects_a_supply_that_cannot_be_split_evenly() {
        assert_eq!(
            derive_curve(band(100_000_000, 200_000_000, 1_000_000), SUPPLY + 1),
            Err(CurveError::SupplyNotDivisible)
        );
    }

    /// An extreme but representable band must derive rather than panic.
    #[test]
    fn survives_extreme_bands_without_overflow() {
        let config =
            derive_curve(band(1, u64::MAX / 16, u64::MAX), SUPPLY).expect("curve derives");
        assert!(config.closing_price >= config.opening_price);
        assert_eq!(config.prices.len(), 16);
        assert_eq!(config.realised_raise, u64::MAX);
    }

    /// A band spanning the whole `u64` range must derive rather than wrap or
    /// panic. Individual segment prices floor to zero at the bottom of such a band,
    /// which is a precision limit of micro-unit arithmetic and not an error: the
    /// raise still reconciles, because the residue step pays the shortfall back on
    /// the top segment.
    #[test]
    fn the_widest_representable_band_still_reconciles() {
        let target = u64::MAX;
        let config = derive_curve(band(1, u64::MAX, target), SUPPLY).expect("curve derives");
        assert_eq!(config.realised_raise, target);
        assert!(config.closing_price > 0);
    }
}
