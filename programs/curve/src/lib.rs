//! Curve engine.
//!
//! Holds the `Issuance` and `CurveConfig` accounts and writes the sixteen segment
//! shape derived from an issuer's NAV band. The arithmetic itself lives in
//! `sluice_core_math::curve`, where it is unit tested without a validator.

use anchor_lang::prelude::*;

pub mod state;

use state::{CurveConfigAccount, Issuance, IssuanceState};

/// Maximum length of a ticker in bytes, including the null terminator.
pub const MAX_TICKER_LEN: usize = 8;

/// Validation of the ticker string written to the issuance account.
///
/// # Errors
///
/// Returns [`SluiceCurveError::TickerTooLong`] when the ticker exceeds eight
/// bytes, or [`SluiceCurveError::TickerNotAscii`] when it contains a byte outside
/// printable ASCII. A ticker is rendered in a monospace font across the terminal,
/// the marketplace table and the adjudication table, and a non-ASCII byte would
/// render inconsistently between them.
pub fn validate_ticker(ticker: &[u8]) -> Result<()> {
    if ticker.len() > MAX_TICKER_LEN {
        return Err(SluiceCurveError::TickerTooLong.into());
    }
    if !ticker.iter().all(|byte| byte.is_ascii_graphic() || *byte == b' ') {
        return Err(SluiceCurveError::TickerNotAscii.into());
    }
    Ok(())
}

/// Errors returned by the curve program.
///
/// New variants are appended to the end. Anchor error codes are positional, so
/// inserting in the middle would silently renumber every existing client.
#[error_code]
pub enum SluiceCurveError {
    /// The band was not a band: the upper bound sat below the lower bound.
    BandInverted = 0,
    /// The band had zero width, so the curve could not steepen.
    BandZeroWidth = 1,
    /// Total supply was zero.
    SupplyZero = 2,
    /// Total supply did not divide evenly across sixteen segments.
    SupplyNotDivisible = 3,
    /// A scaled price or the realised raise exceeded `u64` range.
    ArithmeticOverflow = 4,
    /// The ticker exceeded eight bytes.
    TickerTooLong = 5,
    /// The ticker contained a byte outside printable ASCII.
    TickerNotAscii = 6,
    /// The curve config account was not initialised for this issuance.
    CurveConfigUninitialised = 7,
    /// The curve config account belongs to a different issuance.
    CurveConfigMismatch = 8,
    /// The issuance state does not permit a curve to be written.
    IssuanceNotInDraft = 9,
}

#[program]
pub mod sluice_curve {
    use super::*;

    /// Creates an issuance in `Draft` and stores the issuer's NAV band.
    ///
    /// The band is stored raw. No curve is derived until [`init_curve_config`] runs,
    /// which lets the issuer review the curve before committing to it.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceCurveError::BandInverted`] or
    /// [`SluiceCurveError::BandZeroWidth`] for a malformed band, and
    /// [`SluiceCurveError::TickerTooLong`] or [`SluiceCurveError::TickerNotAscii`]
    /// for a malformed ticker.
    #[access_control(ctx.accounts.validate())]
    pub fn create_issuance(
        ctx: Context<CreateIssuance>,
        ticker: [u8; MAX_TICKER_LEN],
        asset_class: u8,
        nav_low: u64,
        nav_high: u64,
        target: u64,
    ) -> Result<()> {
        handle_create_issuance(ctx, ticker, asset_class, nav_low, nav_high, target)
    }

    /// Derives the sixteen segment curve from the stored band and writes it.
    ///
    /// Rejects a non-zero `supply` that does not divide into sixteen equal
    /// allocations. Sixteen segments with unequal allocations would mean sixteen
    /// different clearing prices per token, which is not what a DBC pool books.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceCurveError::IssuanceNotInDraft`] if the issuance has already
    /// progressed, [`SluiceCurveError::SupplyZero`] or
    /// [`SluiceCurveError::SupplyNotDivisible`] for a bad supply, and
    /// [`SluiceCurveError::ArithmeticOverflow`] if the band cannot be scaled.
    #[access_control(ctx.accounts.validate())]
    pub fn init_curve_config(ctx: Context<InitCurveConfig>, supply: u64) -> Result<()> {
        handle_init_curve_config(ctx, supply)
    }

    /// Moves the issuance into `Funding`, which is the state in which deposits
    /// along the curve are accepted.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceCurveError::CurveConfigUninitialised`] if no curve was
    /// written, and [`SluiceCurveError::IssuanceNotInDraft`] otherwise.
    #[access_control(ctx.accounts.validate())]
    pub fn open_issuance(ctx: Context<OpenIssuance>) -> Result<()> {
        handle_open_issuance(ctx)
    }
}

fn handle_create_issuance(
    ctx: Context<CreateIssuance>,
    ticker: [u8; MAX_TICKER_LEN],
    asset_class: u8,
    nav_low: u64,
    nav_high: u64,
    target: u64,
) -> Result<()> {
    let ticker_len = ticker.iter().position(|byte| *byte == 0).unwrap_or(MAX_TICKER_LEN);
    validate_ticker(&ticker[..ticker_len])?;

    if nav_high < nav_low {
        return err!(SluiceCurveError::BandInverted);
    }
    if nav_high == nav_low {
        return err!(SluiceCurveError::BandZeroWidth);
    }
    let _band = sluice_core_math::curve::NavBand::new(nav_low, nav_high, target)
        .map_err(|error| match error {
            sluice_core_math::curve::CurveError::InvertedBand => SluiceCurveError::BandInverted,
            sluice_core_math::curve::CurveError::ZeroWidthBand => {
                SluiceCurveError::BandZeroWidth
            }
            sluice_core_math::curve::CurveError::ZeroSupply => SluiceCurveError::SupplyZero,
            sluice_core_math::curve::CurveError::SupplyNotDivisible => {
                SluiceCurveError::SupplyNotDivisible
            }
            _ => SluiceCurveError::ArithmeticOverflow,
        })?;

    let issuance = &mut ctx.accounts.issuance;
    issuance.issuer = ctx.accounts.issuer.key();
    issuance.mint = ctx.accounts.mint.key();
    issuance.ticker = ticker;
    issuance.asset_class = asset_class;
    issuance.nav_low = nav_low;
    issuance.nav_high = nav_high;
    issuance.target = target;
    issuance.raised = 0;
    issuance.state = IssuanceState::Draft;
    issuance.created_at = Clock::get()?.unix_timestamp;
    issuance.bump = ctx.bumps.issuance;

    emit!(IssuanceCreated {
        issuance: issuance.key(),
        issuer: issuance.issuer,
        mint: issuance.mint,
        nav_low,
        nav_high,
        target,
        timestamp: issuance.created_at,
    });

    Ok(())
}

fn handle_init_curve_config(ctx: Context<InitCurveConfig>, supply: u64) -> Result<()> {
    let issuance = &mut ctx.accounts.issuance;
    if issuance.state != IssuanceState::Draft {
        return err!(SluiceCurveError::IssuanceNotInDraft);
    }

    let band = sluice_core_math::curve::NavBand::new(issuance.nav_low, issuance.nav_high, issuance.target)
        .map_err(|_| error!(SluiceCurveError::ArithmeticOverflow))?;
    let derived = sluice_core_math::curve::derive_curve(band, supply).map_err(|error| match error {
        sluice_core_math::curve::CurveError::ZeroSupply => SluiceCurveError::SupplyZero,
        sluice_core_math::curve::CurveError::SupplyNotDivisible => {
            SluiceCurveError::SupplyNotDivisible
        }
        _ => SluiceCurveError::ArithmeticOverflow,
    })?;

    let curve = &mut ctx.accounts.curve_config;
    curve.issuance = issuance.key();
    curve.prices = derived.prices;
    curve.allocation_per_segment = derived.allocation_per_segment;
    curve.realised_raise = derived.realised_raise;
    curve.preset = ctx.accounts.preset.key();
    curve.is_initialised = true;
    curve.bump = ctx.bumps.curve_config;

    emit!(CurveConfigured {
        issuance: issuance.key(),
        curve_config: curve.key(),
        opening_price: derived.opening_price,
        closing_price: derived.closing_price,
        realised_raise: derived.realised_raise,
    });

    Ok(())
}

fn handle_open_issuance(ctx: Context<OpenIssuance>) -> Result<()> {
    let issuance = &mut ctx.accounts.issuance;
    if issuance.state != IssuanceState::Draft {
        return err!(SluiceCurveError::IssuanceNotInDraft);
    }
    if !ctx.accounts.curve_config.is_initialised {
        return err!(SluiceCurveError::CurveConfigUninitialised);
    }
    issuance.state = IssuanceState::Funding;
    emit!(IssuanceOpened {
        issuance: issuance.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}

/// Accounts for [`sluice_curve::create_issuance`].
#[derive(Accounts)]
pub struct CreateIssuance<'info> {
    /// The issuer. Must sign.
    pub issuer: Signer<'info>,
    /// The token mint the issuance will trade.
    /// CHECK: Read into the issuance at creation. The curve program does not mint,
    /// so it cannot verify the mint, but it stores the key for later reference by
    /// the settlement and compliance programs.
    pub mint: UncheckedAccount<'info>,
    /// The issuance being created.
    #[account(
        init,
        payer = issuer,
        space = 8 + Issuance::INIT_SPACE,
        seeds = [b"issuance", mint.key().as_ref()],
        bump
    )]
    pub issuance: Account<'info, Issuance>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_curve::init_curve_config`].
#[derive(Accounts)]
pub struct InitCurveConfig<'info> {
    /// The issuer. Must sign.
    pub issuer: Signer<'info>,
    /// The issuance the curve belongs to.
    #[account(
        mut,
        seeds = [b"issuance", issuance.mint.as_ref()],
        bump = issuance.bump,
        has_one = issuer @ SluiceCurveError::CurveConfigMismatch,
    )]
    pub issuance: Account<'info, Issuance>,
    /// The curve config being written.
    #[account(
        init,
        payer = issuer,
        space = 8 + CurveConfigAccount::INIT_SPACE,
        seeds = [b"curve", issuance.key().as_ref()],
        bump
    )]
    pub curve_config: Account<'info, CurveConfigAccount>,
    /// The preset this launch was configured from, if any.
    /// CHECK: Recorded for attribution only. The preset program is not yet live, so
    /// this is an unconstrained key rather than a validated account.
    pub preset: UncheckedAccount<'info>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_curve::open_issuance`].
#[derive(Accounts)]
pub struct OpenIssuance<'info> {
    /// The issuer. Must sign.
    pub issuer: Signer<'info>,
    /// The issuance being opened.
    #[account(
        mut,
        seeds = [b"issuance", issuance.mint.as_ref()],
        bump = issuance.bump,
        has_one = issuer @ SluiceCurveError::CurveConfigMismatch,
    )]
    pub issuance: Account<'info, Issuance>,
    /// The curve this issuance will raise along.
    #[account(
        seeds = [b"curve", issuance.key().as_ref()],
        bump = curve_config.bump,
        constraint = curve_config.issuance == issuance.key() @ SluiceCurveError::CurveConfigMismatch,
    )]
    pub curve_config: Account<'info, CurveConfigAccount>,
}
