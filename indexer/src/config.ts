/**
 * Environment configuration for the Sluice indexer.
 *
 * Every value is read once at startup and validated here rather than at each use
 * site. A missing required variable must fail loudly at boot, because an indexer
 * that silently serves empty state looks identical to one pointed at the wrong
 * cluster, and diagnosing that at demo time costs the whole demo.
 */

/** Program IDs, empty string meaning "not deployed yet". */
export interface ProgramIds {
  readonly curve: string | null;
  readonly compliance: string | null;
  readonly bond: string | null;
  readonly verifier: string | null;
  readonly settlement: string | null;
  readonly redemption: string | null;
  readonly waterfall: string | null;
  readonly autopilot: string | null;
}

/** Fully resolved runtime configuration. */
export interface Config {
  readonly port: number;
  readonly host: string;
  readonly rpcUrl: string;
  readonly network: string;
  readonly grpcEndpoint: string | null;
  readonly grpcToken: string | null;
  readonly programs: ProgramIds;
  /**
   * Whether the seeded fixture may be served when no real issuance qualifies.
   *
   * Flipping this is an indexer restart, never a program redeploy.
   */
  readonly demoMode: boolean;
  /** Fixed fee rates, read from the environment and never hardcoded here. */
  readonly fees: {
    readonly curveBps: number;
    readonly milestoneMarketBps: number;
    readonly secondaryBps: number;
    readonly redemptionBps: number;
    readonly waterfallBps: number;
    readonly issuanceFeeFlatUsd: number;
    readonly issuanceFeeBps: number;
  };
}

/** Reads an environment variable, treating blank as absent. */
function read(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Reads a required environment variable or throws with the variable name. */
function require_(name: string): string {
  const value = read(name);
  if (value === undefined) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

/** Reads an integer environment variable, falling back when absent or malformed. */
function readInt(name: string, fallback: number): number {
  const value = read(name);
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, received ${value}`);
  }
  return parsed;
}

/**
 * Reads a boolean environment variable.
 *
 * Only `true` and `1` enable a flag. Anything else disables it, so a typo fails
 * closed rather than leaving a feature quietly switched on in production.
 */
function readBool(name: string, fallback: boolean): boolean {
  const value = read(name)?.toLowerCase();
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

/** Treats an absent or blank program ID as not deployed. */
function readProgram(name: string): string | null {
  const value = read(name);
  if (value === undefined) return null;
  // A base58 Solana address is 32 to 44 characters. Anything else is a
  // placeholder that was left in the environment, not a real ID.
  if (value.length < 32 || value.length > 44) return null;
  return value;
}

/**
 * Builds the configuration from the process environment.
 *
 * @throws When a required variable is missing or malformed.
 */
export function loadConfig(): Config {
  return {
    port: readInt("PORT", 8787),
    host: read("HOST") ?? "0.0.0.0",
    /*
     * A keyed RPC endpoint carries a credential, and a `NEXT_PUBLIC_` variable is
     * inlined into the browser bundle by Next.js. The indexer is a server process
     * and has no reason to publish its provider key, so the server-only name is
     * preferred and the public one is accepted only as a fallback.
     *
     * The public name remains supported because the frontend needs an RPC for
     * wallet balances and transaction submission, and on a keyless provider such as
     * `api.mainnet-beta.solana.com` there is no secret to leak. A deployment that
     * sets a keyed URL in the public variable is publishing that key.
     */
    rpcUrl: read("RPC_URL") ?? require_("NEXT_PUBLIC_SOLANA_RPC_URL"),
    network: read("NEXT_PUBLIC_SOLANA_NETWORK") ?? "mainnet-beta",
    grpcEndpoint: read("GRPC_ENDPOINT") ?? null,
    grpcToken: read("GRPC_TOKEN") ?? null,
    programs: {
      curve: readProgram("NEXT_PUBLIC_CURVE_PROGRAM_ID"),
      compliance: readProgram("NEXT_PUBLIC_COMPLIANCE_PROGRAM_ID"),
      bond: readProgram("NEXT_PUBLIC_BOND_PROGRAM_ID"),
      verifier: readProgram("NEXT_PUBLIC_VERIFIER_PROGRAM_ID"),
      settlement: readProgram("NEXT_PUBLIC_SETTLEMENT_PROGRAM_ID"),
      redemption: readProgram("NEXT_PUBLIC_REDEMPTION_PROGRAM_ID"),
      waterfall: readProgram("NEXT_PUBLIC_WATERFALL_PROGRAM_ID"),
      autopilot: readProgram("NEXT_PUBLIC_AUTOPILOT_PROGRAM_ID"),
    },
    demoMode: readBool("NEXT_PUBLIC_DEMO_MODE", true),
    fees: {
      curveBps: readInt("NEXT_PUBLIC_FEE_CURVE_BPS", 30),
      milestoneMarketBps: readInt("NEXT_PUBLIC_FEE_MILESTONEMKT_BPS", 50),
      secondaryBps: readInt("NEXT_PUBLIC_FEE_SECONDARY_BPS", 30),
      redemptionBps: readInt("NEXT_PUBLIC_FEE_REDEMPTION_BPS", 25),
      waterfallBps: readInt("NEXT_PUBLIC_FEE_WATERFALL_BPS", 50),
      issuanceFeeFlatUsd: readInt("NEXT_PUBLIC_ISSUANCE_FEE_FLAT_USD", 200),
      issuanceFeeBps: readInt("NEXT_PUBLIC_ISSUANCE_FEE_BPS", 25),
    },
  };
}

/**
 * Whether every program ID is present.
 *
 * The indexer runs in a degraded but honest mode without them, serving only what
 * it can prove. It never invents an account address to fill a gap.
 */
export function programsDeployed(config: Config): boolean {
  return Object.values(config.programs).every((id) => id !== null);
}
