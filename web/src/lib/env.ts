/**
 * Runtime environment access.
 *
 * Every value is read through a helper that distinguishes "absent" from "set to
 * something wrong", because the difference decides whether a surface degrades
 * honestly or shows a fabricated figure. `FRONTEND_SPEC.md` §1.8 requires that no
 * figure is served that the chain does not back, and the only reliable way to
 * guarantee that is to make the absence of configuration impossible to mistake for
 * real data.
 */

/** Reads a public environment variable, treating blank as absent. */
function readPublic(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Base URL of the indexer, which owns the live reads. */
export const INDEXER_URL = readPublic("NEXT_PUBLIC_INDEXER_URL") ?? "";

/** Whether an indexer is configured at all. */
export const INDEXER_CONFIGURED = INDEXER_URL.length > 0;

/** Solana RPC endpoint, used for holder balances and transaction submission. */
export const SOLANA_RPC_URL =
  readPublic("NEXT_PUBLIC_SOLANA_RPC_URL") ?? "https://api.mainnet-beta.solana.com";

/** Cluster the app reads. */
export const SOLANA_NETWORK = readPublic("NEXT_PUBLIC_SOLANA_NETWORK") ?? "mainnet-beta";

/** Privy app ID. Absent means the issuer path is unavailable, not silently broken. */
export const PRIVY_APP_ID = readPublic("NEXT_PUBLIC_PRIVY_APP_ID");

/** Whether Privy is configured. */
export const PRIVY_CONFIGURED = PRIVY_APP_ID !== undefined;

/**
 * Whether the seeded fixture may be displayed.
 *
 * The flag is surfaced by the indexer on every snapshot and mirrored here only as
 * a fallback for the moment before the first read lands. The frontend never
 * invents a demo row; it renders the DEMO tag from the `isDemo` flag the indexer
 * returns.
 */
export const DEMO_MODE = readPublic("NEXT_PUBLIC_DEMO_MODE") !== "false";

/** Program IDs, absent until the programmes are deployed. */
export const PROGRAMS = {
  curve: readPublic("NEXT_PUBLIC_CURVE_PROGRAM_ID"),
  compliance: readPublic("NEXT_PUBLIC_COMPLIANCE_PROGRAM_ID"),
  bond: readPublic("NEXT_PUBLIC_BOND_PROGRAM_ID"),
  verifier: readPublic("NEXT_PUBLIC_VERIFIER_PROGRAM_ID"),
  settlement: readPublic("NEXT_PUBLIC_SETTLEMENT_PROGRAM_ID"),
  redemption: readPublic("NEXT_PUBLIC_REDEMPTION_PROGRAM_ID"),
  waterfall: readPublic("NEXT_PUBLIC_WATERFALL_PROGRAM_ID"),
  autopilot: readPublic("NEXT_PUBLIC_AUTOPILOT_PROGRAM_ID"),
  treasury: readPublic("NEXT_PUBLIC_TREASURY_ADDRESS"),
} as const;

/** Whether every programme ID is present. */
export const PROGRAMS_DEPLOYED = Object.values(PROGRAMS).every(
  (id) => typeof id === "string" && id.length >= 32,
);

/** Explorer base URL for the configured cluster. */
export const EXPLORER_URL =
  SOLANA_NETWORK === "mainnet-beta" ? "https://solscan.io" : `https://explorer.${SOLANA_NETWORK}.org`;

/** Builds an explorer link for an address. */
export function explorerAddress(address: string): string {
  return `${EXPLORER_URL}/account/${address}`;
}

/** Builds an explorer link for a transaction signature. */
export function explorerTransaction(signature: string): string {
  return `${EXPLORER_URL}/tx/${signature}`;
}

/**
 * Fixed fee rates, in basis points.
 *
 * These are the published, unchanging rates from `APP_BLUEPRINT.md`. They are read
 * from the environment rather than written into components, and they never step up
 * with volume or vary by user. Revenue grows because volume grows.
 */
export const FEES = {
  curveBps: Number(readPublic("NEXT_PUBLIC_FEE_CURVE_BPS") ?? 30),
  milestoneMarketBps: Number(readPublic("NEXT_PUBLIC_FEE_MILESTONEMKT_BPS") ?? 50),
  secondaryBps: Number(readPublic("NEXT_PUBLIC_FEE_SECONDARY_BPS") ?? 30),
  redemptionBps: Number(readPublic("NEXT_PUBLIC_FEE_REDEMPTION_BPS") ?? 25),
  waterfallBps: Number(readPublic("NEXT_PUBLIC_FEE_WATERFALL_BPS") ?? 50),
  bridgeBps: Number(readPublic("NEXT_PUBLIC_FEE_BRIDGE_BPS") ?? 15),
  issuanceFeeFlatUsd: Number(readPublic("NEXT_PUBLIC_ISSUANCE_FEE_FLAT_USD") ?? 200),
  issuanceFeeBps: Number(readPublic("NEXT_PUBLIC_ISSUANCE_FEE_BPS") ?? 25),
  presetFeeFlatUsd: Number(readPublic("NEXT_PUBLIC_PRESET_FEE_FLAT_USD") ?? 49),
  presetFeeBps: Number(readPublic("NEXT_PUBLIC_PRESET_FEE_BPS") ?? 25),
  attestationMarginBps: Number(readPublic("NEXT_PUBLIC_ATTESTATION_MARGIN_BPS") ?? 150),
} as const;

/**
 * The minimum raise, in whole currency units.
 *
 * Enforced on chain at issuance creation, and mirrored here so the wizard can
 * explain the rule before the user reaches it. A frontend check is a suggestion;
 * the program check is the rule.
 */
export const MINIMUM_RAISE_USD = 25_000;

/**
 * The issuance creation fee for a given target, in whole currency units.
 *
 * A flat floor of $200, or 0.25 percent of the target if that is greater. The floor
 * needs the minimum raise to sit against: without it a $200 target would pay a 100%
 * fee and a $1,000 target would pay 20%, neither of which can be defended.
 */
export function issuanceCreationFee(targetUsd: number): number {
  const flat = FEES.issuanceFeeFlatUsd;
  const proportional = targetUsd * (FEES.issuanceFeeBps / 10_000);
  return Math.max(flat, proportional);
}

/**
 * Whether a target is above the minimum raise.
 *
 * Below the floor the effective rate becomes indefensible, so the wizard blocks it
 * with the reason rather than letting the user submit and fail on chain.
 */
export function meetsMinimumRaise(targetUsd: number): boolean {
  return targetUsd >= MINIMUM_RAISE_USD;
}

/**
 * Whether test issuances are free on the configured cluster.
 *
 * A builder needs to exercise the wizard without paying. That path must be
 * impossible on mainnet, where the flat fee is the only thing detering spam.
 */
export function testIssuancesAreFree(): boolean {
  return SOLANA_NETWORK !== "mainnet-beta";
}

/** Configured features, surfaced honestly rather than assumed. */
export const FEATURES = {
  autopilot: false,
  presetMarketplace: false,
  meteredDataApi: false,
  crossChainBridge: false,
} as const;
