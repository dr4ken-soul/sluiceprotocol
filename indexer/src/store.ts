/**
 * In-memory projection of on-chain state, plus the derived views the API serves.
 *
 * The indexer keeps no off-chain mirror of balances in the sense `APP_BLUEPRINT.md`
 * warns against. Every record here was decoded from an account or an event on
 * this run, and the store is rebuilt from the chain on every restart. Nothing is
 * read from disk and nothing is served that the chain did not produce.
 */

import type {
  AssetClass,
  Holding,
  LiveIssuance,
  Milestone,
  ProtocolMetrics,
  StreamHealth,
  ValuePoint,
} from "./types.ts";
import { VISIBLE_STATES } from "./types.ts";

/** Maximum number of value points retained per address for the terminal curve. */
const MAX_VALUE_POINTS = 720;

/** Per-address value history, capped so a long session cannot grow unbounded. */
interface ValueSeries {
  readonly points: ValuePoint[];
}

/**
 * The indexer's view of the chain.
 *
 * Issuances are keyed by account address, which is also the query cache key the
 * frontend uses, so a reconnect refetches by the same key rather than inventing
 * one.
 */
export class IndexerStore {
  readonly #issuances = new Map<string, LiveIssuance>();
  readonly #series = new Map<string, ValueSeries>();
  #health: StreamHealth;
  readonly #startedAt = Date.now();

  constructor() {
    this.#health = {
      transport: "grpc",
      connected: false,
      lastUpdateAt: null,
      updates: 0,
      startedAt: this.#startedAt,
      note: "Awaiting first account update",
    };
  }

  /**
   * Records a transport change.
   *
   * Degradation is logged and surfaced rather than hidden. A terminal that
   * silently falls back to polling is worse than one that crashes, because nobody
   * notices until a number is wrong.
   */
  setTransport(transport: StreamHealth["transport"], connected: boolean, note: string): void {
    const previous = this.#health.transport;
    this.#health = { ...this.#health, transport, connected, note };
    if (previous !== transport) {
      console.warn(
        `[sluice] transport changed ${previous} -> ${transport}: ${note}. Figures may lag.`,
      );
    }
  }

  /** Marks the stream connected without changing which transport it is. */
  setConnected(connected: boolean, note?: string): void {
    this.#health = {
      ...this.#health,
      connected,
      note: note ?? this.#health.note,
    };
  }

  /** Current stream health. */
  health(): StreamHealth {
    return { ...this.#health };
  }

  /** Records that an account update landed, bumping the update counter. */
  recordUpdate(): void {
    this.#health = {
      ...this.#health,
      lastUpdateAt: Date.now(),
      updates: this.#health.updates + 1,
    };
  }

  /**
   * Inserts or replaces an issuance.
   *
   * Replaces rather than merges, so a field that moves on chain cannot survive in
   * the indexer after the chain has dropped it.
   */
  putIssuance(issuance: LiveIssuance): void {
    this.#issuances.set(issuance.address, issuance);
  }

  /** Removes an issuance. */
  removeIssuance(address: string): void {
    this.#issuances.delete(address);
  }

  /** Every known issuance, including draft and closed. */
  allIssuances(): LiveIssuance[] {
    return [...this.#issuances.values()];
  }

  /** Issuances in a state the marketplace or terminal will display. */
  visibleIssuances(): LiveIssuance[] {
    return this.allIssuances()
      .filter((issuance) => VISIBLE_STATES.includes(issuance.state))
      .sort((a, b) => {
        // Open issuances first, then soonest settlement, then largest raise.
        const rank = (state: string): number => (state === "settled" || state === "redeeming" ? 1 : 0);
        if (rank(a.state) !== rank(b.state)) return rank(a.state) - rank(b.state);
        const aClose = a.closesAt ?? Number.POSITIVE_INFINITY;
        const bClose = b.closesAt ?? Number.POSITIVE_INFINITY;
        if (aClose !== bClose) return aClose - bClose;
        return b.raised - a.raised;
      });
  }

  /** One issuance by address. */
  issuance(address: string): LiveIssuance | undefined {
    return this.#issuances.get(address);
  }

  /**
   * Looks up an issuance by ticker, case-insensitively.
   *
   * Ticker rather than address is the route parameter in
   * `/app/asset/:ticker`, so the lookup has to be case-insensitive to match what
   * a user types.
   */
  issuanceByTicker(ticker: string): LiveIssuance | undefined {
    const needle = ticker.trim().toUpperCase();
    return this.allIssuances().find(
      (issuance) => issuance.ticker.trim().toUpperCase() === needle,
    );
  }

  /** The most recent open milestone for an issuance. */
  openMilestone(issuance: LiveIssuance): Milestone | undefined {
    return issuance.milestones.find((milestone) => milestone.outcome === null);
  }

  /**
   * Protocol-wide counters.
   *
   * Demo rows are excluded from the money figures. A counter that included the
   * fixture would put a naira figure into a protocol total and overstate it, which
   * is precisely the kind of invented aggregate the spec forbids. The `isDemo`
   * flag tells the frontend to show the DEMO tag when nothing real exists yet.
   */
  metrics(): ProtocolMetrics {
    const real = this.allIssuances().filter((issuance) => !issuance.isDemo);
    const visible = real.filter((issuance) => VISIBLE_STATES.includes(issuance.state));

    let capitalCommitted = 0;
    let milestonesAdjudicated = 0;
    let capitalReleased = 0;
    for (const issuance of real) {
      capitalCommitted += issuance.raised;
      for (const milestone of issuance.milestones) {
        if (milestone.outcome === null) continue;
        milestonesAdjudicated += 1;
        if (milestone.outcome === true) capitalReleased += milestone.trancheSize;
      }
    }

    return {
      capitalCommitted,
      milestonesAdjudicated,
      capitalReleased,
      openIssuances: visible.length,
      isDemo: real.length === 0,
    };
  }

  /**
   * Appends a portfolio value point for an address.
   *
   * The cap drops the oldest point rather than refusing the new one, so the curve
   * always reflects the present.
   */
  pushValuePoint(address: string, value: number, t: number = Date.now()): void {
    const series = this.#series.get(address) ?? { points: [] };
    const points = [...series.points, { t, value }];
    while (points.length > MAX_VALUE_POINTS) points.shift();
    this.#series.set(address, { points });
  }

  /**
   * Value history for an address within a window.
   *
   * @param since Unix milliseconds, or `0` for the whole series.
   */
  valueSeries(address: string, since: number = 0): ValuePoint[] {
    const series = this.#series.get(address);
    if (!series) return [];
    return series.points.filter((point) => point.t >= since);
  }

  /**
   * Total marked value of a set of balances.
   *
   * Used to score the terminal's portfolio figure. Marking is against attested NAV
   * rather than a spot price, because an RWA token's value claim is the underlying
   * asset and not whatever the curve happens to quote this second.
   */
  portfolioValue(holdings: readonly Holding[]): number {
    return holdings.reduce((total, holding) => total + holding.valueUsdc, 0);
  }
}

/** Maps an on-chain asset class discriminant to its API spelling. */
export function decodeAssetClass(raw: number): AssetClass {
  switch (raw) {
    case 0:
      return "revenue";
    case 1:
      return "royalty";
    case 2:
      return "invoice";
    default:
      return "invoice";
  }
}

/** Every on-chain issuance state, in discriminant order. */
export const ISSUANCE_STATES: readonly LiveIssuance["state"][] = [
  "draft",
  "funding",
  "funded",
  "adjudicating",
  "settled",
  "redeeming",
  "closed",
] as const;

/**
 * Maps an on-chain issuance state discriminant to its API spelling.
 *
 * An out-of-range discriminant returns `draft`, which is the state that displays
 * nothing and accepts nothing. Defaulting to `draft` rather than to a visible
 * state means a corrupted account cannot render as a live issuance.
 */
export function decodeIssuanceState(raw: number): LiveIssuance["state"] {
  return ISSUANCE_STATES[raw] ?? "draft";
}
