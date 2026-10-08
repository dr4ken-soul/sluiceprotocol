//! Milestone resolution, including the default-no path.
//!
//! A tranche carries one binary question with a named verifier and a deadline. At
//! the deadline the verifier reports and the market resolves. If the verifier
//! reports nothing inside the grace window, the tranche resolves **no**.
//!
//! Silence resolving no is the property that keeps a tranche from being stuck
//! forever, and it is the one most likely to be implemented as a special case
//! somewhere and then forgotten. It is therefore modelled here as an ordinary
//! transition rather than as an absence of one: `resolve` takes a report that may
//! be absent, and returns a resolved outcome either way.

/// How a milestone resolved.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Resolution {
    /// The verifier reported yes before the deadline.
    ReportedYes,
    /// The verifier reported no before the deadline.
    ReportedNo,
    /// The verifier said nothing inside the grace window. Resolves no.
    DefaultedNo,
}

impl Resolution {
    /// The settlement outcome. Both no variants resolve to false, which is what
    /// routes remaining capital to the redemption vault.
    #[must_use]
    pub const fn outcome(&self) -> bool {
        matches!(self, Self::ReportedYes)
    }

    /// Whether the verifier actually said anything.
    ///
    /// The adjudication record distinguishes the two, because "the verifier said
    /// no" and "the verifier said nothing" are different facts about the issuer
    /// even though they settle the same way.
    #[must_use]
    pub const fn was_reported(&self) -> bool {
        !matches!(self, Self::DefaultedNo)
    }
}

/// Errors returned when a milestone cannot resolve as asked.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResolveError {
    /// A report arrived before the deadline. Reports are only accepted once the
    /// deadline has passed, otherwise a verifier could resolve a market early and
    /// front-run the information it was supposed to be waiting for.
    ReportBeforeDeadline,
    /// The grace window has not closed, so silence has not yet become a no.
    GraceWindowStillOpen,
    /// The milestone has already resolved. A second resolution is rejected rather
    /// than overwriting the first.
    AlreadyResolved,
    /// A report arrived after the grace window closed, so the default already
    /// applies.
    ReportAfterDefault,
}

/// The inputs to a resolution attempt.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct MilestoneTiming {
    /// Unix seconds the market closed.
    pub deadline: i64,
    /// Unix seconds after the deadline before silence resolves no.
    pub grace_window: i64,
    /// Whether the milestone has already resolved.
    pub resolved: bool,
}

/// Resolves a milestone at time `now`, given whatever the verifier reported.
///
/// # Errors
///
/// Returns [`ResolveError::AlreadyResolved`] if the milestone is already settled.
/// Returns [`ResolveError::ReportBeforeDeadline`] if a report exists but `now` is
/// before the deadline, since that would let a verifier front-run its own
/// information. Otherwise returns the resolution, defaulting to no when `report`
/// is `None`.
///
/// # Panics
///
/// Never. A missing report is not an error condition, it is the ordinary path
/// that protects holders when a verifier goes quiet.
pub fn resolve(
    timing: MilestoneTiming,
    report: Option<bool>,
    now: i64,
) -> Result<Resolution, ResolveError> {
    if timing.resolved {
        return Err(ResolveError::AlreadyResolved);
    }

    let grace_ends = timing.deadline.saturating_add(timing.grace_window);

    match report {
        Some(yes) => {
            if now < timing.deadline {
                return Err(ResolveError::ReportBeforeDeadline);
            }
            // A late report loses to the default that already fired. Letting it
            // through would mean the outcome depended on when a keeper happened
            // to submit, which is exactly the discretion the mechanism removes.
            if now > grace_ends {
                return Err(ResolveError::ReportAfterDefault);
            }
            Ok(if yes { Resolution::ReportedYes } else { Resolution::ReportedNo })
        }
        None => {
            if now < grace_ends {
                return Err(ResolveError::GraceWindowStillOpen);
            }
            Ok(Resolution::DefaultedNo)
        }
    }
}

/// Whether an issuance may still resolve a milestone.
#[must_use]
pub const fn is_open(state_is_open: bool, has_open_milestone: bool) -> bool {
    state_is_open && has_open_milestone
}

#[cfg(test)]
mod tests {
    use super::*;

    const DEADLINE: i64 = 1_700_000_000;
    const GRACE: i64 = 86_400;

    fn timing() -> MilestoneTiming {
        MilestoneTiming {
            deadline: DEADLINE,
            grace_window: GRACE,
            resolved: false,
        }
    }

    #[test]
    fn a_report_of_yes_inside_the_window_resolves_yes() {
        let outcome = resolve(timing(), Some(true), DEADLINE).expect("resolves");
        assert_eq!(outcome, Resolution::ReportedYes);
        assert!(outcome.outcome());
        assert!(outcome.was_reported());
    }

    #[test]
    fn a_report_of_no_inside_the_window_resolves_no() {
        let outcome = resolve(timing(), Some(false), DEADLINE + 1).expect("resolves");
        assert_eq!(outcome, Resolution::ReportedNo);
        assert!(!outcome.outcome());
        assert!(outcome.was_reported());
    }

    /// BUILD_GUIDE step 1.4: verifier silence resolves no.
    #[test]
    fn silence_resolves_no_once_the_grace_window_closes() {
        let outcome = resolve(timing(), None, DEADLINE + GRACE).expect("resolves");
        assert_eq!(outcome, Resolution::DefaultedNo);
        assert!(!outcome.outcome());
        assert!(!outcome.was_reported());
    }

    #[test]
    fn silence_before_the_grace_window_closes_does_not_resolve() {
        assert_eq!(
            resolve(timing(), None, DEADLINE + GRACE - 1),
            Err(ResolveError::GraceWindowStillOpen)
        );
    }

    #[test]
    fn a_report_before_the_deadline_is_rejected() {
        assert_eq!(
            resolve(timing(), Some(true), DEADLINE - 1),
            Err(ResolveError::ReportBeforeDeadline)
        );
    }

    /// The outcome must not depend on when a keeper happened to submit a report.
    #[test]
    fn a_report_after_the_grace_window_is_rejected() {
        assert_eq!(
            resolve(timing(), Some(true), DEADLINE + GRACE + 1),
            Err(ResolveError::ReportAfterDefault)
        );
    }

    #[test]
    fn a_second_resolution_is_rejected() {
        let mut already = timing();
        already.resolved = true;
        assert_eq!(
            resolve(already, Some(true), DEADLINE + 1),
            Err(ResolveError::AlreadyResolved)
        );
        assert_eq!(
            resolve(already, None, DEADLINE + GRACE),
            Err(ResolveError::AlreadyResolved)
        );
    }

    /// The two routes to no must be distinguishable in the record while settling
    /// identically, because they say different things about the issuer.
    #[test]
    fn both_routes_to_no_settle_the_same_way() {
        let reported = resolve(timing(), Some(false), DEADLINE + 10).expect("resolves");
        let defaulted = resolve(timing(), None, DEADLINE + GRACE + 10).expect("resolves");
        assert_eq!(reported.outcome(), defaulted.outcome());
        assert_ne!(reported, defaulted);
    }

    #[test]
    fn a_clock_that_moves_backwards_does_not_open_the_window() {
        assert_eq!(
            resolve(timing(), None, i64::MIN),
            Err(ResolveError::GraceWindowStillOpen)
        );
    }

    #[test]
    fn a_zero_grace_window_resolves_immediately_at_the_deadline() {
        let mut immediate = timing();
        immediate.grace_window = 0;
        assert_eq!(resolve(immediate, None, DEADLINE), Ok(Resolution::DefaultedNo));
    }

    #[test]
    fn an_issuance_must_be_both_open_and_have_an_open_milestone() {
        assert!(is_open(true, true));
        assert!(!is_open(true, false));
        assert!(!is_open(false, true));
        assert!(!is_open(false, false));
    }
}
