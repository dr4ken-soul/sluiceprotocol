//! Jurisdiction policy evaluation for the Token-2022 transfer hook.
//!
//! A policy is a file, not code. This module is the interpreter that reads it.
//! Adding a jurisdiction means shipping a new [`Policy`] value, not redeploying a
//! program, which is the whole claim the compliance section of the product makes.
//!
//! The single most important property in this file is graduation revocation.
//! Before graduation the transfer hook is active and the primary distribution is
//! controlled. At graduation DBC revokes the hook automatically, and the same
//! transfer that was rejected a moment earlier must succeed. That behaviour is
//! the invention, so it is covered by its own named test.

/// Maximum length of a jurisdiction code, in bytes. `NG` and `US` both fit.
pub const MAX_JURISDICTION_LEN: usize = 4;

/// A jurisdiction policy, versioned and publicly readable.
///
/// Field layout mirrors the `Policy` struct in `APP_BLUEPRINT.md` so that the
/// account written by the compliance program and the value evaluated here cannot
/// drift apart.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Policy {
    /// Jurisdiction code as raw ASCII bytes, for example `b"NG"`.
    pub jurisdiction: [u8; MAX_JURISDICTION_LEN],
    /// Monotonic policy version. Bumped on every policy change.
    pub version: u16,
    /// Ceiling on simultaneous holders. `0` means unlimited.
    pub max_holders: u32,
    /// Ceiling on a single transfer, in micro-units. `0` means unlimited.
    pub transfer_limit: u64,
    /// Minimum seconds a token must be held before it can be transferred again.
    /// `0` means no lock.
    pub holding_period: i64,
    /// Seconds between required NAV attestations.
    pub attestation_cadence: i64,
    /// Whether the transfer hook is revoked at graduation. Always true for a
    /// Sluice policy, because a controlled primary distribution that stays
    /// controlled after graduation would leave the secondary market unusable.
    pub revoked_at_graduation: bool,
}

/// The current lifecycle position of the token, as the hook sees it.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenStage {
    /// Primary distribution is running. The hook is enforced.
    Graduating,
    /// The curve filled and DBC has migrated the pool. The hook is revoked.
    Graduated,
}

/// Everything the evaluator needs to know about one proposed transfer.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TransferContext {
    /// The stage the token is in.
    pub stage: TokenStage,
    /// Unix timestamp at which the transfer is executed.
    pub now: i64,
    /// Number of holders before the transfer.
    pub current_holders: u32,
    /// Whether the recipient already holds the token.
    pub recipient_is_holder: bool,
    /// Unix timestamp at which the recipient last acquired the token.
    pub recipient_acquired_at: i64,
    /// Amount being transferred, in micro-units.
    pub amount: u64,
}

/// Why a transfer was refused.
///
/// Every variant maps to a policy field, so the on-chain error and the reason
/// shown to a holder describe the same thing.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PolicyViolation {
    /// The transfer would take the holder count past `max_holders`.
    HolderCapExceeded {
        /// The cap from the policy.
        limit: u32,
        /// The count the transfer would produce.
        attempted: u32,
    },
    /// The transfer amount exceeds `transfer_limit`.
    TransferLimitExceeded {
        /// The cap from the policy.
        limit: u64,
        /// The amount that was attempted.
        attempted: u64,
    },
    /// The recipient is inside their holding period.
    HoldingPeriodActive {
        /// Seconds still to wait.
        remaining: i64,
    },
}

impl PolicyViolation {
    /// Stable machine-readable code, surfaced in events and in the risk terminal.
    #[must_use]
    pub const fn code(&self) -> u8 {
        match self {
            Self::HolderCapExceeded { .. } => 0,
            Self::TransferLimitExceeded { .. } => 1,
            Self::HoldingPeriodActive { .. } => 2,
        }
    }
}

/// Evaluates a proposed transfer against a policy.
///
/// Graduation is checked first and short-circuits every other rule. A revoked
/// hook permits the transfer unconditionally, because after graduation the
/// secondary market has to be permissionless for the pool to work at all.
///
/// # Errors
///
/// Returns the first [`PolicyViolation`] the transfer trips, in holder cap,
/// transfer limit then holding period order.
pub fn evaluate(policy: &Policy, context: &TransferContext) -> Result<(), PolicyViolation> {
    if context.stage == TokenStage::Graduated && policy.revoked_at_graduation {
        return Ok(());
    }

    if policy.max_holders > 0 && !context.recipient_is_holder {
        let attempted = context
            .current_holders
            .checked_add(1)
            .unwrap_or(u32::MAX);
        if attempted > policy.max_holders {
            return Err(PolicyViolation::HolderCapExceeded {
                limit: policy.max_holders,
                attempted,
            });
        }
    }

    if policy.transfer_limit > 0 && context.amount > policy.transfer_limit {
        return Err(PolicyViolation::TransferLimitExceeded {
            limit: policy.transfer_limit,
            attempted: context.amount,
        });
    }

    if policy.holding_period > 0 {
        let acquired = context.recipient_acquired_at;
        let elapsed = context.now.saturating_sub(acquired);
        if elapsed < policy.holding_period {
            return Err(PolicyViolation::HoldingPeriodActive {
                remaining: policy
                    .holding_period
                    .saturating_sub(elapsed.max(0)),
            });
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn policy() -> Policy {
        Policy {
            jurisdiction: *b"NG\0\0",
            version: 1,
            max_holders: 500,
            transfer_limit: 250_000_000,
            holding_period: 0,
            attestation_cadence: 86_400,
            revoked_at_graduation: true,
        }
    }

    fn context() -> TransferContext {
        TransferContext {
            stage: TokenStage::Graduating,
            now: 1_700_000_000,
            current_holders: 12,
            recipient_is_holder: false,
            recipient_acquired_at: 0,
            amount: 1_000_000,
        }
    }

    #[test]
    fn allows_a_transfer_inside_every_rule() {
        assert_eq!(evaluate(&policy(), &context()), Ok(()));
    }

    #[test]
    fn rejects_a_transfer_that_breaches_the_holder_cap() {
        let mut ctx = context();
        ctx.current_holders = 500;
        assert_eq!(
            evaluate(&policy(), &ctx),
            Err(PolicyViolation::HolderCapExceeded {
                limit: 500,
                attempted: 501
            })
        );
    }

    #[test]
    fn an_existing_holder_is_not_blocked_by_the_cap() {
        let mut ctx = context();
        ctx.current_holders = 500;
        ctx.recipient_is_holder = true;
        assert_eq!(evaluate(&policy(), &ctx), Ok(()));
    }

    #[test]
    fn a_zero_cap_means_unlimited() {
        let mut p = policy();
        p.max_holders = 0;
        let mut ctx = context();
        ctx.current_holders = u32::MAX - 1;
        assert_eq!(evaluate(&p, &ctx), Ok(()));
    }

    #[test]
    fn rejects_a_transfer_above_the_limit() {
        let mut ctx = context();
        ctx.amount = 250_000_001;
        assert_eq!(
            evaluate(&policy(), &ctx),
            Err(PolicyViolation::TransferLimitExceeded {
                limit: 250_000_000,
                attempted: 250_000_001
            })
        );
    }

    #[test]
    fn a_transfer_exactly_at_the_limit_is_allowed() {
        let mut ctx = context();
        ctx.amount = 250_000_000;
        assert_eq!(evaluate(&policy(), &ctx), Ok(()));
    }

    #[test]
    fn rejects_a_transfer_inside_the_holding_period() {
        let mut p = policy();
        p.holding_period = 1_800;
        let mut ctx = context();
        ctx.now = 1_700_000_000;
        ctx.recipient_acquired_at = 1_700_000_000 - 600;
        assert_eq!(
            evaluate(&p, &ctx),
            Err(PolicyViolation::HoldingPeriodActive { remaining: 1_200 })
        );
    }

    #[test]
    fn allows_a_transfer_after_the_holding_period_elapses() {
        let mut p = policy();
        p.holding_period = 1_800;
        let mut ctx = context();
        ctx.now = 1_700_000_000;
        ctx.recipient_acquired_at = 1_700_000_000 - 1_800;
        assert_eq!(evaluate(&p, &ctx), Ok(()));
    }

    /// BUILD_GUIDE step 1.2: this single property is the invention, so it gets its
    /// own named test rather than being folded into a general case.
    #[test]
    fn transfer_rejected_before_graduation_succeeds_after_it() {
        let p = policy();
        let mut ctx = context();
        ctx.amount = 400_000_000;

        // Before graduation the same transfer breaches the per-transfer limit.
        assert_eq!(
            evaluate(&p, &ctx),
            Err(PolicyViolation::TransferLimitExceeded {
                limit: 250_000_000,
                attempted: 400_000_000
            })
        );

        // After graduation DBC revokes the hook and the identical transfer lands.
        ctx.stage = TokenStage::Graduated;
        assert_eq!(evaluate(&p, &ctx), Ok(()));
    }

    #[test]
    fn graduation_does_not_help_a_policy_that_does_not_revoke() {
        let mut p = policy();
        p.revoked_at_graduation = false;
        let mut ctx = context();
        ctx.amount = 400_000_000;
        ctx.stage = TokenStage::Graduated;
        assert!(evaluate(&p, &ctx).is_err());
    }

    #[test]
    fn violation_codes_are_distinct() {
        assert_eq!(PolicyViolation::HolderCapExceeded { limit: 1, attempted: 2 }.code(), 0);
        assert_eq!(PolicyViolation::TransferLimitExceeded { limit: 1, attempted: 2 }.code(), 1);
        assert_eq!(PolicyViolation::HoldingPeriodActive { remaining: 1 }.code(), 2);
    }

    #[test]
    fn a_clock_that_moves_backwards_cannot_bypass_the_holding_period() {
        let mut p = policy();
        p.holding_period = 86_400;
        let mut ctx = context();
        ctx.now = 1_700_000_000;
        ctx.recipient_acquired_at = 1_700_000_000 + 10_000;
        assert!(evaluate(&p, &ctx).is_err());
    }
}
