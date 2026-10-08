//! Accounts owned by the compliance program.

use anchor_lang::prelude::*;

/// A jurisdiction policy, versioned and publicly readable.
///
/// The field order mirrors `sluice_core_math::policy::Policy` exactly, so the
/// value read off chain and the value evaluated by the pure logic cannot drift.
/// `#[repr(C)]` is not used because Anchor serialises borsh, and the mapping is
/// asserted in the program's unit tests instead.
#[account]
#[derive(Debug, Default)]
pub struct PolicyAccount {
    /// Jurisdiction code as raw ASCII bytes.
    pub jurisdiction: [u8; 4],
    /// Monotonic policy version.
    pub version: u16,
    /// Simultaneous holder ceiling. Zero means unlimited.
    pub max_holders: u32,
    /// Per-transfer ceiling in micro-units. Zero means unlimited.
    pub transfer_limit: u64,
    /// Minimum seconds between acquisition and transfer. Zero means no lock.
    pub holding_period: i64,
    /// Seconds between required NAV attestations.
    pub attestation_cadence: i64,
    /// Whether the hook is revoked at graduation. Always true for a Sluice
    /// policy, because a controlled primary that stays controlled after
    /// graduation would leave the secondary market unusable.
    pub revoked_at_graduation: bool,
    /// Unix timestamp the policy was written.
    pub updated_at: i64,
    /// Bump seed.
    pub bump: u8,
}

impl PolicyAccount {
    /// Account space, matching the field order exactly.
    pub const INIT_SPACE: usize = 4 // jurisdiction
        + 2 // version
        + 4 // max_holders
        + 8 // transfer_limit
        + 8 // holding_period
        + 8 // attestation_cadence
        + 1 // revoked_at_graduation
        + 8 // updated_at
        + 1; // bump

    /// Converts to the pure-logic representation the evaluator works on.
    ///
    /// The mapping is the whole point of the module: adding a jurisdiction means
    /// shipping a new `PolicyAccount`, not changing this function.
    #[must_use]
    pub fn to_policy(&self) -> sluice_core_math::policy::Policy {
        sluice_core_math::policy::Policy {
            jurisdiction: self.jurisdiction,
            version: self.version,
            max_holders: self.max_holders,
            transfer_limit: self.transfer_limit,
            holding_period: self.holding_period,
            attestation_cadence: self.attestation_cadence,
            revoked_at_graduation: self.revoked_at_graduation,
        }
    }
}

/// The recorded lifecycle stage of a token, as the hook sees it.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum TokenStage {
    /// Primary distribution running, hook enforced.
    Graduating = 0,
    /// Curve filled, DBC migrated the pool, hook revoked.
    Graduated = 1,
}

/// Records the hook's view of one mint.
#[account]
#[derive(Debug, Default)]
pub struct HookState {
    /// The mint this state governs.
    pub mint: Pubkey,
    /// The policy in force.
    pub policy: Pubkey,
    /// Current lifecycle stage.
    pub stage: u8,
    /// Holders seen at the last observation. Used for the `max_holders` rule.
    pub current_holders: u32,
    /// Unix timestamp of graduation, or zero while still graduating.
    pub graduated_at: i64,
    /// Bump seed.
    pub bump: u8,
}

impl HookState {
    /// Account space.
    pub const INIT_SPACE: usize = 32 * 2 + 4 + 4 + 8 + 1;
}

/// An independent attestation of a NAV figure.
#[account]
#[derive(Debug, Default)]
pub struct Attestation {
    /// The issuance being attested.
    pub issuance: Pubkey,
    /// The attestor who signed.
    pub attestor: Pubkey,
    /// The attested NAV in micro-units.
    pub nav: u64,
    /// Unix timestamp of the attestation.
    pub attested_at: i64,
    /// Unix timestamp by which the next attestation is due.
    pub due_at: i64,
    /// Whether this attestation was marked failed.
    pub failed: bool,
    /// Ed25519 signature over the attestation payload.
    pub signature: [u8; 64],
    /// Bump seed.
    pub bump: u8,
}

impl Attestation {
    /// Account space.
    pub const INIT_SPACE: usize = 32 * 3 + 8 * 4 + 1 + 64 + 1;
}

/// A registered issuer, which holds the issuer name the frontend renders.
#[account]
#[derive(Debug, Default)]
pub struct IssuerProfile {
    /// The issuer authority.
    pub authority: Pubkey,
    /// Registered name, null padded.
    pub name: [u8; 64],
    /// The jurisdiction the issuer operates under.
    pub jurisdiction: [u8; 4],
    /// Whether the offering is registered with the local regulator.
    pub registered: bool,
    /// Unix timestamp of registration.
    pub registered_at: i64,
    /// Bump seed.
    pub bump: u8,
}

impl IssuerProfile {
    /// Account space.
    pub const INIT_SPACE: usize = 32 * 2 + 64 + 4 + 1 + 8 + 1;
}
