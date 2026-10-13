/**
 * The indexer client.
 *
 * Every live figure the product shows comes through here. The frontend never
 * fabricates a number, and when the indexer is unreachable it says so rather than
 * substituting a plausible value. `FRONTEND_SPEC.md` §1.8 is explicit that a
 * terminal which silently falls back to plausible data is worse than one that
 * stops.
 */

import { INDEXER_CONFIGURED, INDEXER_URL } from "./env";
import type {
  Circle,
  Holding,
  LiveIssuance,
  MarketplaceSnapshot,
  ProtocolMetrics,
  StreamHealth,
  ValuePoint,
} from "./types";

/**
 * Why a read failed.
 *
 * Typed rather than a bare error string so the UI can distinguish "the indexer is
 * not configured", which is a deployment state, from "the indexer is down", which
 * is an incident.
 */
export class IndexerError extends Error {
  constructor(
    message: string,
    readonly kind: "unconfigured" | "unreachable" | "not-found" | "malformed",
  ) {
    super(message);
    this.name = "IndexerError";
  }
}

/** Performs a typed fetch against an indexer route. */
async function read<T>(path: string, signal?: AbortSignal): Promise<T> {
  if (!INDEXER_CONFIGURED) {
    throw new IndexerError(
      "No indexer is configured: set NEXT_PUBLIC_INDEXER_URL to the service that owns the live reads.",
      "unconfigured",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${INDEXER_URL}${path}`, {
      signal,
      headers: { accept: "application/json" },
      // The live data contract forbids a cache the chain does not back, so this
      // request is explicitly uncached and revalidated on every mount.
      cache: "no-store",
    });
  } catch (cause) {
    throw new IndexerError(
      `The indexer at ${INDEXER_URL} did not respond.`,
      "unreachable",
    );
  }

  if (response.status === 404) {
    throw new IndexerError(`No record at ${path}.`, "not-found");
  }
  if (!response.ok) {
    throw new IndexerError(
      `The indexer returned ${response.status} for ${path}.`,
      "unreachable",
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new IndexerError(`The indexer returned malformed JSON for ${path}.`, "malformed");
  }
}

/**
 * Reads the featured issuance, the visible issuances, the protocol metrics and the
 * stream health in one request.
 *
 * A single round trip rather than four, because the landing page renders all four
 * together and splitting them would let the page show figures from different slots
 * in time.
 */
export function fetchMarketplace(signal?: AbortSignal): Promise<MarketplaceSnapshot> {
  return read<MarketplaceSnapshot>("/api/marketplace", signal);
}

/** Reads every visible issuance. */
export function fetchIssuances(signal?: AbortSignal): Promise<LiveIssuance[]> {
  return read<LiveIssuance[]>("/api/issuances", signal);
}

/** Reads one issuance by ticker. */
export async function fetchIssuanceByTicker(
  ticker: string,
  signal?: AbortSignal,
): Promise<LiveIssuance> {
  const issuances = await fetchIssuances(signal);
  const needle = ticker.trim().toUpperCase();
  const found = issuances.find(
    (issuance) => issuance.ticker.trim().toUpperCase() === needle,
  );
  if (found === undefined) {
    throw new IndexerError(`No issuance carries the ticker ${ticker}.`, "not-found");
  }
  return found;
}

/** Reads the protocol counters. */
export function fetchMetrics(signal?: AbortSignal): Promise<ProtocolMetrics> {
  return read<ProtocolMetrics>("/api/metrics", signal);
}

/** Reads the stream health, which is how degradation stays visible. */
export function fetchHealth(signal?: AbortSignal): Promise<StreamHealth> {
  return read<StreamHealth>("/api/health", signal);
}

/** Reads a holder's positions. */
export function fetchHoldings(address: string, signal?: AbortSignal): Promise<Holding[]> {
  return read<Holding[]>(`/api/holdings/${address}`, signal);
}

/** Reads the portfolio value curve for a holder over a range. */
export function fetchValueSeries(
  address: string,
  range: string,
  signal?: AbortSignal,
): Promise<ValuePoint[]> {
  return read<ValuePoint[]>(`/api/series/${address}?range=${encodeURIComponent(range)}`, signal);
}

/** Saves an issuance draft to the server. Never to browser storage. */
export async function saveDraft(userId: string, draft: unknown): Promise<void> {
  if (!INDEXER_CONFIGURED) {
    throw new IndexerError("No draft store is configured.", "unconfigured");
  }
  const response = await fetch(`${INDEXER_URL}/api/drafts/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!response.ok) {
    throw new IndexerError(`The draft store returned ${response.status}.`, "unreachable");
  }
}

/** Reads a saved issuance draft, returning `null` when there is none. */
export async function loadDraft(userId: string): Promise<unknown | null> {
  const response = await fetch(`${INDEXER_URL}/api/drafts/${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new IndexerError(`The draft store returned ${response.status}.`, "unreachable");
  }
  return response.json();
}

/**
 * Reads the caller's circles.
 *
 * Groups is Phase 1 and the `circle` program is not deployed, so the indexer
 * answers with an empty list and a reason. That is passed through rather than
 * collapsed to `[]`, because an empty list and an unreadable list are different
 * states and `FRONTEND_SPEC.md` S14A.4 requires the section to distinguish them.
 */
export async function fetchCircles(signal?: AbortSignal): Promise<Circle[]> {
  const response = await read<{ circles: Circle[] }>("/api/circles", signal);
  return response.circles;
}