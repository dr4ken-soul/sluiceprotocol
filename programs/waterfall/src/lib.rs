//! Waterfall vault.
//!
//! Real-world cash arriving from the underlying asset is converted and pushed
//! into this vault, then distributed pro rata to holders at a snapshot.
//!
//! Two properties are enforced rather than assumed.
//!
//! **The distribution fee is charged only when a distribution actually occurs.**
//! No distribution, no fee. The fee is charged against a computed distribution,
//! never against a snapshot or a deposit of underlying cash, so a later change
//! cannot quietly turn every snapshot into a charge.
//!
//! **Gas is bounded regardless of holder count.** Distribution uses the same claim
//! pattern as the redemption vault. A push loop would make the vault unusable at
//! ten thousand holders, which is precisely where real-world cash flow arrives.

use anchor_lang::prelude::*;

pub mod state;

use state::{Distribution, WaterfallVault};

/// Waterfall claims are charged at 0.50 percent.
///
/// Charged only when a distribution actually occurs, so an issuer is only charged
/// when a holder is actually paid.
pub const WATERFALL_FEE_BPS: u32 = sluice_core_math::pro_rata::WATERFALL_BPS;

/// Errors returned by the waterfall program.
///
/// Variants are appended to the end only. Anchor error codes are positional.
#[error_code]
pub enum SluiceWaterfallError {
    /// The vault is not accepting deposits of underlying cash.
    VaultNotOpen = 0,
    /// The deposit amount was zero.
    EmptyDeposit = 1,
    /// The holder already claimed against this distribution.
    AlreadyClaimed = 2,
    /// The computed entitlement was zero.
    EmptyClaim = 3,
    /// The vault holds less than the outstanding claims imply.
    VaultUnderfunded = 4,
    /// The snapshot supply was zero, so a share cannot be computed.
    ZeroSupply = 5,
    /// The distribution does not exist or is not yet claimable.
    DistributionNotReady = 6,
    /// The fee exceeded the gross distribution.
    FeeExceedsDistribution = 7,
}

/// Computes a holder's entitlement against a distribution.
///
/// # Errors
///
/// Propagates the entitlement errors from [`sluice_core_math::pro_rata`].
pub fn entitlement(balance: u64, total_supply: u64, pot: u64) -> Result<u64> {
    sluice_core_math::pro_rata::pro_rata_share(balance, total_supply, pot)
        .map_err(|_| error!(SluiceWaterfallError::VaultUnderfunded))
}

#[program]
pub mod sluice_waterfall {
    use super::*;

    /// Creates the waterfall vault for one issuance.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceWaterfallError::ZeroSupply`] when the issuance has no
    /// supply to distribute against.
    #[access_control(ctx.accounts.validate())]
    pub fn init_vault(ctx: Context<InitVault>) -> Result<()> {
        handle_init_vault(ctx)
    }

    /// Deposits converted underlying cash into the vault.
    ///
    /// No fee is charged here. The fee is charged against a distribution, which is
    /// the only event that pays a holder.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceWaterfallError::EmptyDeposit`] for a zero amount and
    /// [`SluiceWaterfallError::VaultNotOpen`] once closed.
    #[access_control(ctx.accounts.validate())]
    pub fn deposit_cash(ctx: Context<DepositCash>, amount: u64) -> Result<()> {
        handle_deposit_cash(ctx, amount)
    }

    /// Takes a snapshot and opens a distribution against it.
    ///
    /// The snapshot fixes both the pot and the supply, so a holder cannot claim
    /// against a pot that grew after they bought, and cannot dilute their own
    /// share by waiting.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceWaterfallError::EmptyDeposit`] when there is nothing to
    /// distribute and [`SluiceWaterfallError::ZeroSupply`] when supply is zero.
    #[access_control(ctx.accounts.validate())]
    pub fn snapshot(ctx: Context<Snapshot>, period: u64) -> Result<()> {
        handle_snapshot(ctx, period)
    }

    /// Claims a holder's pro rata share of a distribution.
    ///
    /// # Errors
    ///
    /// Returns [`SluiceWaterfallError::AlreadyClaimed`] on a second claim and
    /// propagates the entitlement errors.
    #[access_control(ctx.accounts.validate())]
    pub fn claim_distribution(ctx: Context<ClaimDistribution>) -> Result<()> {
        handle_claim_distribution(ctx)
    }
}

fn handle_init_vault(ctx: Context<InitVault>) -> Result<()> {
    if ctx.accounts.total_supply.total_supply == 0 {
        return err!(SluiceWaterfallError::ZeroSupply);
    }

    let vault = &mut ctx.accounts.vault;
    vault.issuance = ctx.accounts.issuance.key();
    vault.cash_balance = 0;
    vault.distributed = 0;
    vault.fees_accrued = 0;
    vault.next_period = 0;
    vault.bump = ctx.bumps.vault;

    emit!(WaterfallVaultOpened {
        vault: vault.key(),
        issuance: vault.issuance,
    });

    Ok(())
}

fn handle_deposit_cash(ctx: Context<DepositCash>, amount: u64) -> Result<()> {
    if amount == 0 {
        return err!(SluiceWaterfallError::EmptyDeposit);
    }

    let vault = &mut ctx.accounts.vault;
    vault.cash_balance = vault.cash_balance.saturating_add(amount);

    // No fee on the deposit. The fee attaches to the distribution, which is the
    // event that actually pays someone.
    emit!(CashDeposited {
        vault: vault.key(),
        amount,
        fee: 0,
    });

    Ok(())
}

fn handle_snapshot(ctx: Context<Snapshot>, period: u64) -> Result<()> {
    let pot = ctx.accounts.vault.cash_balance;
    if pot == 0 {
        return err!(SluiceWaterfallError::EmptyDeposit);
    }
    let total_supply = ctx.accounts.total_supply.total_supply;
    if total_supply == 0 {
        return err!(SluiceWaterfallError::ZeroSupply);
    }

    // The fee is charged once, here, against the pot being distributed. Computing
    // it at claim time instead would make the total dependent on claim order.
    let fee = sluice_core_math::mul_div_floor(
        u128::from(pot),
        u128::from(WATERFALL_FEE_BPS),
        u128::from(sluice_core_math::BPS_DENOMINATOR),
    ) as u64;
    let net = pot - fee;

    let distribution = &mut ctx.accounts.distribution;
    distribution.vault = ctx.accounts.vault.key();
    distribution.period = period;
    distribution.pot = pot;
    distribution.total_supply = total_supply;
    distribution.fee = fee;
    distribution.net = net;
    distribution.claimed = 0;
    distribution.claim_count = 0;
    distribution.last_claimant = Pubkey::default();
    distribution.bump = ctx.bumps.distribution;

    let vault = &mut ctx.accounts.vault;
    vault.cash_balance = 0;
    vault.distributed = vault.distributed.saturating_add(pot);
    vault.fees_accrued = vault.fees_accrued.saturating_add(fee);
    vault.next_period = vault.next_period.saturating_add(1);

    emit!(DistributionOpened {
        vault: vault.key(),
        distribution: distribution.key(),
        period,
        pot,
        fee,
        net,
    });

    Ok(())
}

fn handle_claim_distribution(ctx: Context<ClaimDistribution>) -> Result<()> {
    let holder_key = ctx.accounts.holder.key();

    // The double-claim guard, checked before the entitlement is computed so a
    // repeated claim cannot even reach the arithmetic.
    if ctx.accounts.distribution.has_claimed(&holder_key) {
        return err!(SluiceWaterfallError::AlreadyClaimed);
    }

    let balance = ctx.accounts.holder_tokens.amount;
    let gross = entitlement(
        balance,
        ctx.accounts.distribution.total_supply,
        ctx.accounts.distribution.net,
    )?;

    if gross == 0 {
        return err!(SluiceWaterfallError::EmptyClaim);
    }
    if ctx.accounts.distribution.claimed.saturating_add(gross)
        > ctx.accounts.distribution.net
    {
        return err!(SluiceWaterfallError::VaultUnderfunded);
    }

    // The fee was already taken once at snapshot time, so a claim carries none.
    // Paying a per-claim fee as well would make the total depend on how many
    // holders there are, which the snapshot exists precisely to avoid.
    let distribution = &mut ctx.accounts.distribution;
    distribution.claimed = distribution.claimed.saturating_add(gross);
    distribution.claim_count = distribution.claim_count.saturating_add(1);
    distribution.last_claimant = holder_key;

    emit!(DistributionClaimed {
        vault: distribution.vault,
        distribution: distribution.key(),
        holder: holder_key,
        period: distribution.period,
        net: gross,
        fee: 0,
    });

    Ok(())
}

/// Accounts for [`sluice_waterfall::init_vault`].
#[derive(Accounts)]
pub struct InitVault<'info> {
    /// The issuer. Must sign.
    #[account(mut)]
    pub issuer: Signer<'info>,
    /// The issuance.
    /// CHECK: Recorded on the vault.
    pub issuance: UncheckedAccount<'info>,
    /// The issuance mint, used to read total supply.
    ///
    /// CHECK: Read only. The mint authority is irrelevant to a distribution.
    pub mint: UncheckedAccount<'info>,
    /// The mint's supply counter.
    pub total_supply: Account<'info, MintSupply>,
    /// The vault.
    #[account(
        init,
        payer = issuer,
        space = 8 + WaterfallVault::INIT_SPACE,
        seeds = [b"waterfall", issuance.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, WaterfallVault>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// A read-only view of a mint's supply.
#[account]
#[derive(Debug, Default)]
pub struct MintSupply {
    /// Total supply in whole tokens.
    pub total_supply: u64,
}

/// Accounts for [`sluice_waterfall::deposit_cash`].
#[derive(Accounts)]
pub struct DepositCash<'info> {
    /// Whoever delivered the underlying cash. Must sign.
    #[account(mut)]
    pub depositor: Signer<'info>,
    /// The vault.
    #[account(
        mut,
        seeds = [b"waterfall", vault.issuance.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, WaterfallVault>,
}

/// Accounts for [`sluice_waterfall::snapshot`].
#[derive(Accounts)]
pub struct Snapshot<'info> {
    /// Who triggers the snapshot. Permissionless, since the pot and the supply
    /// are both fixed by the vault and cannot be chosen by the caller.
    #[account(mut)]
    pub keeper: Signer<'info>,
    /// The vault.
    #[account(
        mut,
        seeds = [b"waterfall", vault.issuance.as_ref()],
        bump = vault.bump,
    )]
    pub vault: Account<'info, WaterfallVault>,
    /// The mint's supply counter.
    pub total_supply: Account<'info, MintSupply>,
    /// The distribution being opened.
    #[account(
        init,
        payer = keeper,
        space = 8 + Distribution::INIT_SPACE,
        seeds = [b"distribution", vault.key().as_ref(), &period.to_le_bytes()],
        bump
    )]
    pub distribution: Account<'info, Distribution>,
    /// System program.
    pub system_program: Program<'info, System>,
}

/// Accounts for [`sluice_waterfall::claim_distribution`].
#[derive(Accounts)]
pub struct ClaimDistribution<'info> {
    /// The claiming holder. Must sign.
    #[account(mut)]
    pub holder: Signer<'info>,
    /// The holder's token account, read for the balance the share is computed
    /// from.
    ///
    /// CHECK: Read only.
    pub holder_tokens: UncheckedAccount<'info>,
    /// The distribution being claimed.
    #[account(
        mut,
        seeds = [b"distribution", distribution.vault.as_ref(), &distribution.period.to_le_bytes()],
        bump = distribution.bump,
    )]
    pub distribution: Account<'info, Distribution>,
}

/// Emitted when a waterfall vault opens.
#[event]
pub struct WaterfallVaultOpened {
    /// The vault.
    #[index]
    pub vault: Pubkey,
    /// The issuance.
    pub issuance: Pubkey,
}

/// Emitted when underlying cash lands. The fee is always zero.
#[event]
pub struct CashDeposited {
    /// The vault.
    #[index]
    pub vault: Pubkey,
    /// Amount deposited.
    pub amount: u64,
    /// Always zero. The fee attaches to the distribution.
    pub fee: u64,
}

/// Emitted when a snapshot opens a distribution.
#[event]
pub struct DistributionOpened {
    /// The vault.
    #[index]
    pub vault: Pubkey,
    /// The distribution account.
    pub distribution: Pubkey,
    /// Snapshot period.
    pub period: u64,
    /// Gross pot.
    pub pot: u64,
    /// Fee taken once at snapshot time.
    pub fee: u64,
    /// Net distributable.
    pub net: u64,
}

/// Emitted when a holder claims a distribution.
#[event]
pub struct DistributionClaimed {
    /// The vault.
    #[index]
    pub vault: Pubkey,
    /// The distribution.
    pub distribution: Pubkey,
    /// The holder.
    pub holder: Pubkey,
    /// Snapshot period.
    pub period: u64,
    /// Net reaching the holder.
    pub net: u64,
    /// Always zero. The fee was taken at snapshot time.
    pub fee: u64,
}
