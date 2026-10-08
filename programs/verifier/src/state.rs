//! Accounts owned by the verifier program.

use anchor_lang::prelude::*;

/// Milestone question validation, resolution and the default-no path.
///
/// Re-exported from the verifier's state module so the redemption program can
/// read a milestone outcome without depending on the verifier's instruction set.
pub use crate::state::{Outcome, ResolverKind};

/// A milestone question and the market adjudicating it.
#[account]
#[derive(Debug, Default)]
pub struct Milestone {
    /// The issuance this milestone belongs to.
    pub issuance: Pubkey,
    /// Zero-based tranche index.
    pub index: u8,
    /// The binary question, null padded.
    pub question: [u8; 160],
    /// The named verifier accountable for the answer.
    pub verifier: Pubkey,
    /// Unix seconds the market closes.
    pub deadline: i64,
    /// Unix seconds after the deadline before silence resolves no.
    pub grace_window: i64,
    /// Tranche size in micro-units.
    pub tranche_size: u64,
    /// The adjudication market.
    pub market: Pubkey,
    /// Outcome discriminant. Zero unresolved, one yes, two no.
    pub outcome: u8,
    /// Unix seconds at which it resolved, or zero.
    pub resolved_at: i64,
    /// Which resolver produced the outcome.
    pub resolver: u8,
    /// Bump seed.
    pub bump: u8,
}

impl Milestone {
    /// Account space, matching the field order exactly.
    pub const INIT_SPACE: usize = 32 * 3 // issuance, verifier, market
        + 1 // index
        + 160 // question
        + 8 * 3 // deadline, grace_window, tranche_size
        + 1 // outcome
        + 8 // resolved_at
        + 1 // resolver
        + 1; // bump

    /// The question, trimmed of its null padding.
    #[must_use]
    pub fn question_text(&self) -> String {
        let end = self.question.iter().position(|byte| *byte == 0).unwrap_or(160);
        String::from_utf8_lossy(&self.question[..end]).trim().to_string()
    }
}

/// The outcome a milestone resolves to.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum Outcome {
    /// Unresolved. Silence does not stay here: the default-no path sets No.
    Unresolved = 0,
    /// Resolved yes, the tranche releases.
    Yes = 1,
    /// Resolved no, remaining capital routes to redemption.
    No = 2,
}

impl Outcome {
    /// Maps the on-chain discriminant to the enum, defaulting to unresolved.
    ///
    /// Defaulting to unresolved rather than to a settled value means a corrupted
    /// byte cannot make a tranche look released.
    #[must_use]
    pub const fn from_raw(raw: u8) -> Self {
        match raw {
            1 => Self::Yes,
            2 => Self::No,
            _ => Self::Unresolved,
        }
    }
}

/// Which resolver produced a resolution.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ResolverKind {
    /// The external default, Panta.
    External = 0,
    /// The internal fallback market, used when the external one is thin.
    Internal = 1,
    /// The default-no path, verifier silence.
    DefaultNo = 2,
}

/// Resolver configuration for the protocol.
#[account]
#[derive(Debug, Default)]
pub struct VerifierConfig {
    /// The resolver expected to report before the deadline.
    pub resolver: u8,
    /// Whether the internal fallback market is enabled.
    pub internal_fallback: bool,
    /// Bump seed.
    pub bump: u8,
}

impl VerifierConfig {
    /// Account space.
    pub const INIT_SPACE: usize = 1 + 1 + 1;
}

/// A read-only view of a milestone, used by the redemption program.
#[account]
#[derive(Debug, Default)]
pub struct MilestoneRef {
    /// Outcome discriminant.
    pub outcome: u8,
    /// Unix seconds the market closed.
    pub deadline: i64,
    /// Tranche index.
    pub index: u8,
}
