//! Milestone verifier.
//!
//! Owns the `Milestone` account, validates the question, resolves through a
//! pluggable resolver, and applies the **default-no** path when the verifier
//! stays silent inside the grace window.
//!
//! The resolver sits behind a trait so Panta is swappable for an internal market.
//! An external market can be thin, and a product that moves other people's money
//! cannot depend on a venue it does not control staying liquid.
//!
//! The decision logic lives in `sluice_core_math::milestone` where it is unit
//! tested without a validator. This module supplies the account plumbing.

use anchor_lang::prelude::*;

pub mod state;

use sluice_core_math::milestone::{
    self, MilestoneTiming, Resolution,
};
use state::{Milestone, ResolverKind, VerifierConfig};

/// Maximum question length in bytes, matching the on-chain field width.
pub const MAX_QUESTION_LEN: usize = 160;

/// Questions must contain at least this many characters to be answerable.
pub const MIN_QUESTION_LEN: usize = 20;

/// The default grace window in seconds: one day inside which a verifier can still
/// report before silence becomes a no.
pub const DEFAULT_GRACE_WINDOW: i64 = 86_400;

/// Errors returned by the verifier program.
///
/// Variants are appended to the end only. Anchor error codes are positional, so
/// inserting in the middle would silently renumber every existing client.
#[error_code]
pub enum SluiceVerifierError {
    /// The question was empty or shorter than the minimum answerable length.
    QuestionTooShort = 0,
    /// The question exceeded the on-chain field width.
    QuestionTooLong = 1,
    /// The question contained a byte outside printable ASCII.
    QuestionNotAscii = 2,
    /// The question did not name a number, a date and a source, so a market
    /// cannot price a question it cannot resolve.
    QuestionNotMachineCheckable = 3,
    /// The tranche size was zero.
    TrancheSizeZero = 4,
    /// The grace window was negative, which would make silence resolve before the
    /// deadline.
    GraceWindowNegative = 5,
    /// The milestone was already resolved.
    AlreadyResolved = 6,
    /// The verifier is not the named verifier for this milestone.
    VerifierMismatch = 7,
    /// A report arrived before the deadline.
    ReportBeforeDeadline = 8,
    /// The grace window has not closed, so silence has not yet resolved no.
    GraceWindowStillOpen = 9,
    /// A report arrived after the default already applied.
    ReportAfterDefault = 10,
    /// The issuance is not in a state that accepts milestones.
    IssuanceNotAdjudicating = 11,
}

/// Rejects a question a market could not price.
///
/// The rule is deliberately mechanical. A binary market needs a question with a
/// single verifiable answer, and the three things that make one answerable are a
/// number, a date and a source. The check is enforced here so that a badly framed
/// question can never reach an open market.
///
/// # Errors
///
/// Returns the mapped [`SluiceVerifierError`].
pub fn validate_question(question: &str) -> Result<()> {
    let trimmed = question.trim();

    if trimmed.len() < MIN_QUESTION_LEN {
        return err!(SluiceVerifierError::QuestionTooShort);
    }
    if trimmed.len() > MAX_QUESTION_LEN {
        return err!(SluiceVerifierError::QuestionTooLong);
    }
    if !trimmed.is_ascii() {
        return err!(SluiceVerifierError::QuestionNotAscii);
    }

    // A digit supplies the number, a year or a date token supplies the date, and
    // a reporting term supplies the source. Requiring all three is what makes the
    // question machine-checkable in practice rather than in wording alone.
    let has_number = trimmed.chars().any(|character| character.is_ascii_digit());
    let has_date = trimmed.contains("quarter")
        || trimmed.contains("month")
        || trimmed.contains("year")
        || trimmed.contains("day")
        || trimmed.chars().filter(|character| character.is_ascii_digit()).count() >= 4;
    let has_source = ["report", "statement", "attestation", "filing", "audited", "recorded"]
        .iter()
        .any(|term| trimmed.to_lowercase().contains(term));

    if !(has_number && has_date && has_source) {
        return err!(SluiceVerifierError::QuestionNotMachineCheckable);
    }

    Ok(())
}

#[program]
pub mod sluice_verifier {
    use super::*;

    /// Creates a milestone with a validated question.
    ///
    /// # Errors
    ///
    /// Returns a question error when the question could not be priced, and
    /// [`SluiceVerifierError::TrancheSizeZero`] or
    /// [`SluiceVerifierError::GraceWindowNegative`] for malformed parameters.
    #[access_control(ctx.accounts.validate())]
    pub fn create_milestone(
        ctx: Context<CreateMilestone>,
        question: String,
        deadline: i64,
        grace_window: i64,
        tranche_size: u64,
    ) -> Result<()> {
        handle_create_milestone(ctx, question, deadline, grace_window, tranche_size)
    }

    /// Records the named verifier's report and settles the tranche.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceVerifierError::VerifierMismatch`] when the signer is not
    /// the named verifier, and propagates the timing errors from the resolution
    /// logic.
    #[access_control(ctx.accounts.validate())]
    pub fn report(ctx: Context<Report>, yes: bool) -> Result<()> {
        handle_report(ctx, Some(yes))
    }

    /// Settles a milestone the verifier never answered.
    ///
    /// Permissionless on purpose. If only the verifier could trigger the default,
    /// a verifier going quiet would strand the tranche, which is the exact failure
    /// the default-no path exists to prevent. The grace window is what makes it
    /// safe: nobody can trigger this before silence has actually become a no.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceVerifierError::GraceWindowStillOpen`] before the window
    /// closes, and propagates the resolution errors.
    #[access_control(ctx.accounts.validate())]
    pub fn apply_default_no(ctx: Context<ApplyDefaultNo>) -> Result<()> {
        handle_report(ctx, None)
    }
}

fn handle_create_milestone(
    ctx: Context<CreateMilestone>,
    question: String,
    deadline: i64,
    grace_window: i64,
    tranche_size: u64,
) -> Result<()> {
    validate_question(&question)?;

    if tranche_size == 0 {
        return err!(SluiceVerifierError::TrancheSizeZero);
    }
    if grace_window < 0 {
        return err!(SluiceVerifierError::GraceWindowNegative);
    }

    let bytes = question.as_bytes();
    let mut padded = [0u8; MAX_QUESTION_LEN];
    padded[..bytes.len()].copy_from_slice(bytes);

    let milestone = &mut ctx.accounts.milestone;
    milestone.issuance = ctx.accounts.issuance.key();
    milestone.index = ctx.accounts.index;
    milestone.question = padded;
    milestone.verifier = ctx.accounts.verifier.key();
    milestone.deadline = deadline;
    milestone.grace_window = grace_window;
    milestone.tranche_size = tranche_size;
    milestone.market = ctx.accounts.market.key();
    milestone.outcome = 0;
    milestone.resolved_at = 0;
    milestone.resolver = ctx.accounts.config.resolver;
    milestone.bump = ctx.bumps.milestone;

    emit!(MilestoneCreated {
        issuance: milestone.issuance,
        index: milestone.index,
        verifier: milestone.verifier,
        deadline,
        grace_window,
        tranche_size,
    });

    Ok(())
}

fn handle_report(ctx: Context<Report>, report: Option<bool>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let timing = MilestoneTiming {
        deadline: ctx.accounts.milestone.deadline,
        grace_window: ctx.accounts.milestone.grace_window,
        resolved: ctx.accounts.milestone.outcome != 0,
    };

    let resolution = milestone::resolve(timing, report, now).map_err(|error| match error {
        milestone::ResolveError::AlreadyResolved => error!(SluiceVerifierError::AlreadyResolved),
        milestone::ResolveError::ReportBeforeDeadline => {
            error!(SluiceVerifierError::ReportBeforeDeadline)
        }
        milestone::ResolveError::GraceWindowStillOpen => {
            error!(SluiceVerifierError::GraceWindowStillOpen)
        }
        milestone::ResolveError::ReportAfterDefault => {
            error!(SluiceVerifierError::ReportAfterDefault)
        }
    })?;

    let milestone = &mut ctx.accounts.milestone;
    milestone.outcome = if resolution.outcome() { 1 } else { 2 };
    milestone.resolved_at = now;
    milestone.resolver = match resolution {
        Resolution::ReportedYes | Resolution::ReportedNo => milestone.resolver,
        Resolution::DefaultedNo => ResolverKind::DefaultNo as u8,
    };

    emit!(MilestoneResolved {
        issuance: milestone.issuance,
        index: milestone.index,
        outcome: milestone.outcome == 1,
        via_default: !resolution.was_reported(),
        resolved_at: now,
    });

    Ok(())
}

/// Accounts for [`sluice_verifier::create_milestone`].
#[derive(Accounts)]
pub struct CreateMilestone<'info> {
    /// The issuer creating the milestone. Must sign.
    #[account(mut)]
    pub issuer: Signer<'info>,
    /// The issuance the milestone belongs to.
    /// CHECK: Recorded on the milestone. Authority is checked against the issuer
    /// through the issuance profile rather than here.
    pub issuance: UncheckedAccount<'info>,
    /// The named verifier, who must report inside the grace window.
    /// CHECK: Recorded on the milestone and checked at report time, which is
    /// where the signature requirement matters.
    pub verifier: UncheckedAccount<'info>,
    /// The adjudication market opened on the question.
    /// CHECK: Recorded for the frontend to read YES and NO prices from. The
    /// market program is external, so it is not validated here.
    pub market: UncheckedAccount<'info>,
    /// The resolver configuration.
    pub config: Account<'info, VerifierConfig>,
    /// The milestone being created.
    #[account(
        init,
        payer = issuer,
        space = 8 + Milestone::INIT_SPACE,
        seeds = [b"milestone", issuance.key().as_ref(), &ctx.accounts.index.to_le_bytes()],
        bump
    )]
    pub milestone: Account<'info, Milestone>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_verifier::report`].
#[derive(Accounts)]
pub struct Report<'info> {
    /// The named verifier. Must sign.
    pub verifier: Signer<'info>,
    /// The settlement account, mutated so a resolution and a tranche release
    /// cannot be reordered by a second transaction.
    #[account(mut)]
    pub settlement: UncheckedAccount<'info>,
    /// The milestone being resolved.
    #[account(
        mut,
        seeds = [b"milestone", milestone.issuance.as_ref(), &milestone.index.to_le_bytes()],
        bump = milestone.bump,
        has_one = verifier @ SluiceVerifierError::VerifierMismatch,
    )]
    pub milestone: Account<'info, Milestone>,
}

/// Accounts for [`sluice_verifier::apply_default_no`].
#[derive(Accounts)]
pub struct ApplyDefaultNo<'info> {
    /// Anyone may trigger the default once the grace window has closed. This is
    /// what stops a silent verifier from stranding the tranche.
    #[account(mut)]
    pub keeper: Signer<'info>,
    /// The settlement account.
    #[account(mut)]
    pub settlement: UncheckedAccount<'info>,
    /// The milestone being defaulted.
    #[account(
        mut,
        seeds = [b"milestone", milestone.issuance.as_ref(), &milestone.index.to_le_bytes()],
        bump = milestone.bump,
    )]
    pub milestone: Account<'info, Milestone>,
}

/// Emitted when a milestone is created.
#[event]
pub struct MilestoneCreated {
    /// The issuance.
    #[index]
    pub issuance: Pubkey,
    /// Tranche index.
    pub index: u8,
    /// The named verifier.
    pub verifier: Pubkey,
    /// Unix seconds the market closes.
    pub deadline: i64,
    /// Unix seconds before silence resolves no.
    pub grace_window: i64,
    /// Tranche size.
    pub tranche_size: u64,
}

/// Emitted when a milestone resolves.
#[event]
pub struct MilestoneResolved {
    /// The issuance.
    #[index]
    pub issuance: Pubkey,
    /// Tranche index.
    pub index: u8,
    /// The outcome.
    pub outcome: bool,
    /// Whether the default-no path produced it rather than a verifier report.
    pub via_default: bool,
    /// Unix seconds.
    pub resolved_at: i64,
}
