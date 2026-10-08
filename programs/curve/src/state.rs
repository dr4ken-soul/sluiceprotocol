//! Accounts owned by the curve program.

use anchor_lang::prelude::*;

/// Classification of the underlying real-world asset.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum AssetClass {
    /// A claim on recurring revenue.
    Revenue = 0,
    /// A claim on royalties or licensing income.
    Royalty = 1,
    /// A claim on a specific invoice or receivable.
    Invoice = 2,
}

/// Lifecycle of an issuance.
///
/// The ordering matters: it is the only thing preventing a second tranche release
/// on an issuance already settled. `Settled` and `Redeeming` are terminal, and
/// there is no transition out of either.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum IssuanceState {
    /// Created, curve not yet derived. No deposits accepted.
    Draft = 0,
    /// Curve derived and open. Deposits accepted, no milestone yet.
    Funding = 1,
    /// Target reached. A milestone market may be open.
    Funded = 2,
    /// A milestone market is live and unresolved.
    Adjudicating = 3,
    /// The most recent milestone resolved yes and capital released.
    Settled = 4,
    /// The most recent milestone resolved no and capital routed to redemption.
    Redeeming = 5,
    /// Fully wound down. Terminal.
    Closed = 6,
}

impl IssuanceState {
    /// Whether the issuance accepts deposits along the curve.
    ///
    /// Deposits are free and permanently exempt from fees. This predicate is the
    /// only thing that opens the path, and it exists so that no future
    /// instruction can accidentally enable a fee on a deposit.
    #[must_use]
    pub const fn accepts_deposit(&self) -> bool {
        matches!(self, Self::Draft | Self::Funding)
    }

    /// Whether a milestone may still resolve against this issuance.
    #[must_use]
    pub const fn is_open(&self) -> bool {
        matches!(self, Self::Funding | Self::Funded | Self::Adjudicating)
    }
}

/// An issuance of claims on a real-world asset.
#[account]
#[derive(Debug, Default)]
pub struct Issuance {
    /// Authority that created the issuance and controls its configuration.
    pub issuer: Pubkey,
    /// Token mint traded for the claim.
    pub mint: Pubkey,
    /// Ticker, null padded.
    pub ticker: [u8; 8],
    /// `AssetClass` discriminant.
    pub asset_class: u8,
    /// Lower bound of the valuation band, in micro-units of the settlement asset.
    pub nav_low: u64,
    /// Upper bound of the valuation band.
    pub nav_high: u64,
    /// Most recent independently attested NAV.
    pub attested_nav: u64,
    /// Unix timestamp of the most recent attestation. Zero when never attested.
    pub attested_at: i64,
    /// The attestor that signed the most recent attestation.
    pub attestor: Pubkey,
    /// The curve config account for this issuance.
    pub curve_config: Pubkey,
    /// The compliance policy account.
    pub policy: Pubkey,
    /// The issuer bond vault.
    pub bond_vault: Pubkey,
    /// The settlement account holding raised capital.
    pub settlement: Pubkey,
    /// The redemption vault.
    pub redemption_vault: Pubkey,
    /// Capital raised so far, in micro-units.
    pub raised: u64,
    /// Issuer's raise target.
    pub target: u64,
    /// `IssuanceState` discriminant.
    pub state: u8,
    /// Unix timestamp of creation.
    pub created_at: i64,
    /// Bump seed.
    pub bump: u8,
}

impl Issuance {
    /// Account space, matching the field order exactly.
    pub const INIT_SPACE: usize = 32 * 5 // issuer, mint, curve_config, policy, bond_vault
        + 32 * 2 // settlement, redemption_vault, attestor
        + 8 // ticker
        + 1 // asset_class
        + 8 * 7 // nav_low, nav_high, attested_nav, raised, target
        + 8 // attested_at
        + 8 // created_at
        + 1; // state
}

/// The derived sixteen segment curve for one issuance.
#[account]
#[derive(Debug, Default)]
pub struct CurveConfigAccount {
    /// The issuance this curve belongs to.
    pub issuance: Pubkey,
    /// Price per token in each of the sixteen segments, micro-units.
    pub prices: [u64; 16],
    /// Token allocation per segment, whole tokens.
    pub allocation_per_segment: u64,
    /// Raise the curve realises on a full sell-out.
    pub realised_raise: u64,
    /// The preset this launch was configured from.
    pub preset: Pubkey,
    /// Whether the config has been written.
    pub is_initialised: bool,
    /// Bump seed.
    pub bump: u8,
}

impl CurveConfigAccount {
    /// Account space, matching the field order exactly.
    pub const INIT_SPACE: usize = 32 // issuance
        + 8 * 16 // prices
        + 8 * 2 // allocation, realised raise
        + 32 // preset
        + 1 // is_initialised
        + 1; // bump
}

/// Emitted when an issuance is created.
#[event]
pub struct IssuanceCreated {
    /// The new issuance.
    #[index]
    pub issuance: Pubkey,
    /// The issuer.
    pub issuer: Pubkey,
    /// The token mint.
    pub mint: Pubkey,
    /// Lower bound of the valuation band.
    pub nav_low: u64,
    /// Upper bound of the valuation band.
    pub nav_high: u64,
    /// Raise target.
    pub target: u64,
    /// Unix timestamp.
    pub timestamp: i64,
}

/// Emitted when the sixteen segment curve is written.
#[event]
pub struct CurveConfigured {
    /// The issuance.
    #[index]
    pub issuance: Pubkey,
    /// The curve config account.
    pub curve_config: Pubkey,
    /// Price of the first segment.
    pub opening_price: u64,
    /// Price of the final segment.
    pub closing_price: u64,
    /// Raise realised on a full sell-out.
    pub realised_raise: u64,
}

/// Emitted when the issuance opens for deposits.
#[event]
pub struct IssuanceOpened {
    /// The issuance.
    #[index]
    pub issuance: Pubkey,
    /// Unix timestamp.
    pub timestamp: i64,
}
