/**
 * Shared domain types for the Sluice indexer.
 *
 * These mirror the on-chain accounts in `APP_BLUEPRINT.md` under Data Structures.
 * They are the boundary type between the transport, which produces raw bytes, and
 * everything that renders. A field is only present here if it is readable from an
 * account or an event. There is no off-chain mirror of balances, so anything
 * absent from this file does not exist as far as the frontend is concerned.
 */

/** Classification of the underlying real-world asset. */
export type AssetClass = "revenue" | "royalty" | "invoice";

/** Lifecycle of an issuance, mirroring the on-chain `IssuanceState` enum. */
export type IssuanceState =
  | "draft"
  | "funding"
  | "funded"
  | "adjudicating"
  | "settled"
  | "redeeming"
  | "closed";

/**
 * Issuance states that appear in the marketplace and terminal.
 *
 * `draft` is deliberately excluded. A draft has no live curve and no figure worth
 * showing, and listing it would invite someone to look at an issuance nobody can
 * yet invest in.
 */
export const VISIBLE_STATES: readonly IssuanceState[] = [
  "funding",
  "funded",
  "adjudicating",
  "settled",
  "redeeming",
] as const;

/** A milestone question and the market adjudicating it. */
export interface Milestone {
  /** The issuance this milestone belongs to. */
  readonly issuance: string;
  /** Zero-based tranche index. */
  readonly index: number;
  /** The binary question, verbatim from the chain. */
  readonly question: string;
  /** The named verifier accountable for the answer. */
  readonly verifier: string;
  /** Unix seconds at which the market closes. */
  readonly deadline: number;
  /** Unix seconds after the deadline before silence resolves the tranche no. */
  readonly graceWindow: number;
  /** Tranche size in micro-units of the settlement asset. */
  readonly trancheSize: number;
  /** Adjudication market address. */
  readonly market: string;
  /**
   * Resolution outcome. `null` while unresolved.
   *
   * Silence is not `null` forever: the default-no path sets it to `false`, so a
   * resolved no and an unresolved milestone are distinguishable states.
   */
  readonly outcome: boolean | null;
  /** Unix seconds at which it resolved, or `null`. */
  readonly resolvedAt: number | null;
}

/** An issuance as the frontend consumes it. */
export interface LiveIssuance {
  /** Issuance PDA. */
  readonly address: string;
  /** Token mint. */
  readonly mint: string;
  /** Null-padded ticker, trimmed. */
  readonly ticker: string;
  /** Registered issuer name, resolved from the issuer profile. */
  readonly issuerName: string;
  /** Issuer authority. */
  readonly issuer: string;
  readonly assetClass: AssetClass;
  /** Attested NAV in micro-units. */
  readonly nav: number;
  /** Lower bound of the valuation band. */
  readonly navLow: number;
  /** Upper bound of the valuation band. */
  readonly navHigh: number;
  /** Capital raised in micro-units. */
  readonly raised: number;
  /** Raise target in micro-units. */
  readonly target: number;
  /** YES price in cents, or `null` when no market is open. */
  readonly yesCents: number | null;
  /** NO price in cents, or `null` when no market is open. */
  readonly noCents: number | null;
  /** Days until settlement, or `null` when the issuance is not settling. */
  readonly settlesInDays: number | null;
  /** Unix seconds the current milestone closes. */
  readonly closesAt: number | null;
  readonly state: IssuanceState;
  /** Unix seconds of the most recent NAV attestation. */
  readonly attestedAt: number;
  /** The attestor that signed it. */
  readonly attestor: string;
  /** Milestones for this issuance, ordered by tranche index. */
  readonly milestones: readonly Milestone[];
  /**
   * Whether this row is the seeded fixture rather than a real issuance.
   *
   * The frontend renders a visible DEMO tag from this flag. Unlabelled invented
   * figures would be a compliance problem, not a design one.
   */
  readonly isDemo: boolean;
}

/** A position held by the connected wallet. */
export interface Holding {
  readonly mint: string;
  readonly ticker: string;
  /** Token balance in whole tokens. */
  readonly balance: number;
  /** Marked value in micro-units of the settlement asset. */
  readonly valueUsdc: number;
  readonly assetClass: AssetClass;
  readonly state: IssuanceState;
}

/** Protocol-wide counters shown in the metrics section. */
export interface ProtocolMetrics {
  /** Sum of `raised` across every non-demo issuance, micro-units. */
  readonly capitalCommitted: number;
  /** Count of resolved milestones. */
  readonly milestonesAdjudicated: number;
  /** Capital released on yes resolutions, micro-units. */
  readonly capitalReleased: number;
  /** Count of issuances in a visible, open state. */
  readonly openIssuances: number;
  /** Whether any figure is sourced from the seeded fixture. */
  readonly isDemo: boolean;
}

/** A point on the terminal's value curve. */
export interface ValuePoint {
  /** Unix milliseconds. */
  readonly t: number;
  /** Portfolio value in micro-units. */
  readonly value: number;
}

/** Health of the upstream subscription, surfaced on the risk terminal. */
export interface StreamHealth {
  /** Which transport is live. */
  readonly transport: "grpc" | "websocket" | "poll";
  /** Whether the stream is currently connected. */
  readonly connected: boolean;
  /** Unix milliseconds of the last account update. */
  readonly lastUpdateAt: number | null;
  /** Count of updates received since start. */
  readonly updates: number;
  /** Unix milliseconds at which the service started. */
  readonly startedAt: number;
  /** Human-readable note about the last transport change. */
  readonly note: string;
}
