/**
 * The Panta integration.
 *
 * `APP_BLUEPRINT.md` §7 makes Panta the default resolver for a milestone market,
 * with an internal market as the fallback, because an external market can be thin
 * and a thin market can be moved cheaply. This module is the seam between the two.
 *
 * The design rule is that Panta is never on the critical path to a payout. A
 * milestone resolves through Panta only when Panta can be trusted *and* has
 * reported; every other path resolves through the verifier or defaults to no. That
 * is why every function here returns a decision carrying its provenance rather than
 * a bare boolean, so the on-chain event can record which resolver actually decided.
 */

import type { Config } from "./config.ts";
import {
  type MilestoneMarketRequest,
  PantaClient,
  PantaError,
  type PantaMarket,
  resolveCategory,
} from "./panta.ts";

/**
 * The depth floor from `APP_BLUEPRINT.md` §"Thin market defence".
 *
 * A resolution is only accepted from a Panta market that reached this volume. Below
 * it the answer falls back to the verifier report, because the cost of moving a
 * market with 40 USDC of volume is low enough that a determined attacker can do it,
 * and the consequence is a tranche releasing capital it should not have.
 *
 * Read in whole USDC as a decimal string, matching Panta's own format, so no
 * precision is lost to a float on a threshold that guards money.
 */
export const DEPTH_FLOOR_USDC = "500";

/** Which resolver produced a decision. Mirrors `ResolverKind` in the programme. */
export type ResolverSource = "panta" | "verifier" | "default-no";

/** The outcome of asking for a milestone decision. */
export interface ResolutionDecision {
  /** True only when a resolver positively reported. Silence is false. */
  readonly yes: boolean;
  readonly source: ResolverSource;
  /** Why this source was chosen. Surfaced on the health route, never swallowed. */
  readonly reason: string;
  /** YES price 0..1, when a market was read. Null when it was not. */
  readonly yesPrice: number | null;
  /** Cumulative market volume, when read. */
  readonly volumeUsdc: string | null;
  /** The Panta error code, when the source is `verifier` because Panta failed. */
  readonly pantaError?: string;
}

/** Reads a USDC decimal string into a number, for display and comparison only. */
function toNumber(value: string | null | undefined): number | null {
  if (value === undefined || value === null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Builds the Panta client from configuration. */
export function pantaClient(config: Config): PantaClient {
  return new PantaClient({ apiKey: config.panta.apiKey ?? undefined });
}

/** Whether the external resolver is usable at all. */
export function pantaConfigured(config: Config): boolean {
  return config.panta.apiKey !== null && config.panta.apiKey.length > 0;
}

/**
 * Translates a milestone into a Panta market request.
 *
 * The question is phrased as a yes/no about a verifiable fact, because Panta markets
 * are binary and a question that cannot be answered yes or no cannot be opened on
 * one. `sourcesOfTruth` must be the machine-checkable artefact the verifier will
 * later read, so the market and the verifier are looking at the same evidence
 * rather than at two different accounts of the same fact.
 */
export function marketRequestFor(input: {
  wallet: string;
  question: string;
  resolutionRule: string;
  sourcesOfTruth: readonly string[];
  startTime: number;
  endTime: number;
  resolutionTime: number;
  imageUrl: string;
  description?: string;
  /**
   * The configured catalog category.
   *
   * Defaults to `other`, which is the honest label for a milestone on an asset, but
   * is routed through `resolveCategory` rather than hardcoded so a key whose
   * taxonomy omits it degrades to an accepted label instead of failing the quote.
   */
  category?: string;
}): MilestoneMarketRequest {
  return {
    wallet: input.wallet,
    question: input.question,
    resolutionRule: input.resolutionRule,
    sourcesOfTruth: [...input.sourcesOfTruth],
    startTime: input.startTime,
    endTime: input.endTime,
    resolutionTime: input.resolutionTime,
    imageUrl: input.imageUrl,
    description: input.description,
    category: resolveCategory(input.category ?? "other"),
  };
}

/**
 * Decides a milestone from a Panta market.
 *
 * Four gates, in order, each of which falls back rather than fails:
 *
 *   1. Unconfigured, or the market id is absent -> `default-no`. A protocol that
 *      promised adjudication must not silently adjudicate nothing.
 *   2. Panta unreachable, erroring, or the market unreadable -> `verifier`, using
 *      whatever the named verifier reported. An outage in a third party must not
 *      decide a tranche.
 *   3. The market has not resolved -> `verifier`. Before the deadline the market is
 *      a price, not an answer.
 *   4. Volume below the depth floor -> `verifier`. A market thin enough to move
 *      cheaply is not evidence of anything.
 *
 * Only when all four pass does the market decide.
 *
 * `verifierReported` is `null` when the verifier said nothing. Passing `null` with a
 * trusted market yields a yes, because the market is the resolver in that case. With
 * an untrusted market it yields `default-no`, which is the whole point of the
 * grace window.
 */
export async function resolveFromMarket(input: {
  config: Config;
  client: PantaClient;
  /** Panta event address for this milestone's market. */
  marketId: string | null;
  /** What the named verifier reported inside the grace window. Null is silence. */
  verifierReported: boolean | null;
  /** Unix seconds, used only to decide whether the market has had time to resolve. */
  now: number;
}): Promise<ResolutionDecision> {
  const { config, client, marketId, verifierReported, now } = input;

  if (!pantaConfigured(config) || marketId === null) {
    return {
      yes: false,
      source: "default-no",
      reason:
        marketId === null
          ? "No adjudication market is attached to this milestone"
          : "Panta is not configured, so the external resolver is unavailable",
      yesPrice: null,
      volumeUsdc: null,
    };
  }

  let market: PantaMarket;
  try {
    market = await client.fetchMarket(marketId);
  } catch (error) {
    const code = error instanceof PantaError ? error.code : "UNKNOWN";
    return {
      yes: verifierReported === true,
      source: verifierReported === null ? "default-no" : "verifier",
      reason: `Panta market could not be read (${code}), fell back to the verifier`,
      yesPrice: null,
      volumeUsdc: null,
      pantaError: code,
    };
  }

  const yesPrice = toNumber(market.yesPrice);
  const volumeUsdc = market.volumeUsdc ?? null;
  const volume = toNumber(volumeUsdc);

  if (!market.resolved) {
    return {
      yes: verifierReported === true,
      source: verifierReported === null ? "default-no" : "verifier",
      reason: `Panta market has not resolved (status ${market.status}), verifier decides`,
      yesPrice,
      volumeUsdc,
    };
  }

  if (market.resolutionTime > now) {
    // A market marked resolved ahead of its own resolution time is either a clock
    // skew or a bad read. Neither is a reason to release capital.
    return {
      yes: verifierReported === true,
      source: verifierReported === null ? "default-no" : "verifier",
      reason: "Panta market resolution time is in the future, treated as unresolved",
      yesPrice,
      volumeUsdc,
    };
  }

  if (volume === null || volume < Number.parseFloat(DEPTH_FLOOR_USDC)) {
    return {
      yes: verifierReported === true,
      source: verifierReported === null ? "default-no" : "verifier",
      reason: `Market volume ${volumeUsdc ?? "unknown"} USDC is below the ${DEPTH_FLOOR_USDC} depth floor, verifier decides`,
      yesPrice,
      volumeUsdc,
    };
  }

  /*
   * A resolved, deep market. The outcome token pays $1 on yes and $0 on no, so the
   * winning side's price at resolution is the answer. Both are read rather than
   * inferred, and the pair is checked: a resolved market quoting neither side at 1
   * is a bad read and is not allowed to decide.
   */
  const yesWon = yesPrice !== null && yesPrice >= 0.99;
  const noWon = market.noPrice !== null && Number.parseFloat(market.noPrice) >= 0.99;

  if (!yesWon && !noWon) {
    return {
      yes: verifierReported === true,
      source: verifierReported === null ? "default-no" : "verifier",
      reason: "Resolved market quotes no winning side at 1, treated as unreadable",
      yesPrice,
      volumeUsdc,
    };
  }

  return {
    yes: yesWon,
    source: "panta",
    reason: `Resolved market above the depth floor with ${volumeUsdc} USDC volume`,
    yesPrice,
    volumeUsdc,
  };
}

/**
 * Attributes a trade to Sluice.
 *
 * `MARKETING.md` lists trade attribution as a Phase 0 requirement and Panta's own
 * criteria weight it above market creation. It is also how Sluice earns the creator
 * fee on its own markets, per `APP_BLUEPRINT.md` §Revenue.
 *
 * Best-effort by design. Attribution failing must never fail the trade that
 * triggered it, because the buy has already settled on chain by the time this runs
 * and reporting a settled trade as failed would be a lie in the other direction. So
 * the error is returned for the health surface and the caller decides, rather than
 * being thrown from here.
 */
export async function attributeTrade(input: {
  client: PantaClient;
  signature: string;
  wallet: string;
  marketId: string;
  quoteId?: string;
  clientOrderId?: string;
  userId?: string;
}): Promise<
  | { ok: true; status: string; kind: string; side: string | null }
  | { ok: false; code: string; message: string }
> {
  try {
    const result = await input.client.reportTrade({
      signature: input.signature,
      wallet: input.wallet,
      marketId: input.marketId,
      ...(input.quoteId === undefined ? {} : { quoteId: input.quoteId }),
      ...(input.clientOrderId === undefined ? {} : { clientOrderId: input.clientOrderId }),
      ...(input.userId === undefined ? {} : { userId: input.userId }),
    });
    return { ok: true, status: result.status, kind: result.kind, side: result.side };
  } catch (error) {
    if (error instanceof PantaError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return {
      ok: false,
      code: "UNKNOWN",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
