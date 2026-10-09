/**
 * Domain types shared across the frontend.
 *
 * These mirror the indexer's `src/types.ts` and, through it, the on-chain accounts
 * in `APP_BLUEPRINT.md` under Data Structures. A field exists here only if it is
 * readable from an account or an event. There is no off-chain mirror of balances.
 */

/** Classification of the underlying real-world asset. */
export type AssetClass = "revenue" | "royalty" | "invoice";

/** Lifecycle of an issuance, mirroring the on-chain `IssuanceState`. */
export type IssuanceState =
  | "draft"
  | "funding"
  | "funded"
  | "adjudicating"
  | "settled"
  | "redeeming"
  | "closed";

/** A milestone question and the market adjudicating it. */
export interface Milestone {
  readonly issuance: string;
  readonly index: number;
  readonly question: string;
  readonly verifier: string;
  readonly deadline: number;
  readonly graceWindow: number;
  readonly trancheSize: number;
  readonly market: string;
  /** `null` while unresolved. Silence resolves false rather than staying null. */
  readonly outcome: boolean | null;
  readonly resolvedAt: number | null;
}

/** An issuance as the frontend consumes it. */
export interface LiveIssuance {
  readonly address: string;
  readonly mint: string;
  readonly ticker: string;
  readonly issuerName: string;
  readonly issuer: string;
  readonly assetClass: AssetClass;
  readonly nav: number;
  readonly navLow: number;
  readonly navHigh: number;
  readonly raised: number;
  readonly target: number;
  readonly yesCents: number | null;
  readonly noCents: number | null;
  readonly settlesInDays: number | null;
  readonly closesAt: number | null;
  readonly state: IssuanceState;
  readonly attestedAt: number;
  readonly attestor: string;
  readonly milestones: readonly Milestone[];
  /** Whether this row is the seeded fixture. Drives the visible DEMO tag. */
  readonly isDemo: boolean;
}

/** Protocol-wide counters. */
export interface ProtocolMetrics {
  readonly capitalCommitted: number;
  readonly milestonesAdjudicated: number;
  readonly capitalReleased: number;
  readonly openIssuances: number;
  readonly isDemo: boolean;
}

/** A position held by the connected wallet. */
export interface Holding {
  readonly mint: string;
  readonly ticker: string;
  readonly balance: number;
  readonly valueUsdc: number;
  readonly assetClass: AssetClass;
  readonly state: IssuanceState;
}

/** A point on the terminal's value curve. */
export interface ValuePoint {
  readonly t: number;
  readonly value: number;
}

/** Health of the upstream subscription. */
export interface StreamHealth {
  readonly transport: "grpc" | "websocket" | "poll";
  readonly connected: boolean;
  readonly lastUpdateAt: number | null;
  readonly updates: number;
  readonly startedAt: number;
  readonly note: string;
  /**
   * The cluster these figures came from, as the indexer reports it.
   *
   * Absent on the dedicated health route's own payload in older indexer builds, so
   * it is optional. The metrics section reads it to label the figures, and a
   * deployment that predates this field falls back to a generic heading rather than
   * asserting a cluster it cannot confirm.
   */
  readonly network?: string;
}

/** The featured issuance, plus everything the landing page needs in one read. */
export interface MarketplaceSnapshot {
  readonly featured: LiveIssuance | null;
  readonly issuances: readonly LiveIssuance[];
  readonly metrics: ProtocolMetrics;
  readonly health: StreamHealth;
  /** Unix seconds the snapshot was taken. */
  readonly asOf: number;
}

/** The payload `POST /api/drafts` stores and restores. */
export interface IssuanceDraft {
  /** Step one: the asset itself. */
  issuerName: string;
  ticker: string;
  assetClass: AssetClass;
  underlying: string;
  /** Step two: the valuation. */
  navLow: number | null;
  navHigh: number | null;
  target: number | null;
  supply: number | null;
  /** Step three: the jurisdiction policy. */
  jurisdiction: string;
  /** Step four: the curve configuration. */
  preset: string;
  /** Step five: the milestones. */
  milestones: DraftMilestone[];
  /** Step six is read only and derives from the rest. */
  step: number;
}

/** One milestone row inside the issuance draft. */
export interface DraftMilestone {
  question: string;
  verifier: string;
  deadline: string;
  trancheSize: number | null;
}

/** An empty draft, used as the initial form state. */
export function emptyDraft(): IssuanceDraft {
  return {
    issuerName: "",
    ticker: "",
    assetClass: "invoice",
    underlying: "",
    navLow: null,
    navHigh: null,
    target: null,
    supply: null,
    jurisdiction: "NG",
    preset: "standard",
    milestones: [{ question: "", verifier: "", deadline: "", trancheSize: null }],
    step: 1,
  };
}
