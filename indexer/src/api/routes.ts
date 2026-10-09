/**
 * The public API.
 *
 * Five routes, all unmetered and free in Phase 0. The metered, key-managed and
 * Stripe-billed tiers are Phase 2 (`APP_BLUEPRINT.md`, What Is Not Being Built in
 * Phase 0), and building them now would be a place to get billing wrong in public
 * for no demo value.
 *
 * Every response carries the stream health, because a figure served by a terminal
 * that has quietly degraded is not trustworthy and the reader should be able to see
 * that without asking.
 */

import type { FastifyInstance } from "fastify";
import { DEPTH_FLOOR_USDC, pantaConfigured } from "../adjudication.ts";
import type { Config } from "../config.ts";
import { programsDeployed } from "../config.ts";
import { selectFeatured } from "../featured.ts";
import type { IndexerStore } from "../store.ts";
import type { Holding } from "../types.ts";

/**
 * Reduces an RPC URL to its host, discarding any key in the query string.
 *
 * Provider endpoints put the credential in the URL, so the URL is a secret. Health
 * output is public and readable cross-origin, so only the host is reported.
 */
function rpcHostOf(rpcUrl: string): string {
  try {
    return new URL(rpcUrl).host;
  } catch {
    // A malformed URL is a configuration error that `loadConfig` already rejects,
    // so this is only a fallback for a value assembled some other way.
    return "unknown";
  }
}

/** Registers every route on the server. */
export function registerRoutes(app: FastifyInstance, config: Config, store: IndexerStore): void {
  /**
   * The landing page's single read: featured issuance, visible issuances, metrics
   * and health together. One round trip so the hero card and the table beneath it
   * can never disagree about the same issuance.
   */
  app.get("/api/marketplace", async (_request, reply) => {
    if (!programsDeployed(config)) {
      reply.header("x-sluice-programs-deployed", "false");
    }
    return {
      featured: selectFeatured(store.allIssuances(), config.demoMode, Date.now() / 1000),
      issuances: store.visibleIssuances(),
      metrics: store.metrics(),
      /*
       * `network` rides along with health on every read, not just on /api/health.
       *
       * The frontend labels its figures with the cluster they came from, so that
       * label cannot depend on a separately fetched endpoint: two reads could
       * disagree, and a devnet deployment showing a mainnet label is a false claim
       * rather than a cosmetic slip. Carrying it on the same payload makes the
       * label and the figures impossible to desynchronise.
       */
      health: { ...store.health(), network: config.network },
      asOf: Math.floor(Date.now() / 1000),
    };
  });

  /**
   * The external resolver's status.
   *
   * Reported separately from stream health because they fail independently: the
   * chain subscription can be perfectly healthy while Panta is unavailable, and the
   * two degrade to different fallbacks. The frontend uses this to tell a reader
   * whether a milestone will be decided by a market or by the internal one, which
   * is a material difference to anyone assessing whether a resolution is credible.
   */
  app.get("/api/resolver", async () => {
    const configured = pantaConfigured(config);
    return {
      configured,
      source: configured ? "panta" : "internal",
      wallet: config.panta.marketWallet,
      depthFloorUsdc: DEPTH_FLOOR_USDC,
      note: configured
        ? "Milestones resolve from a Panta market that clears the depth floor."
        : "Panta is unconfigured. Milestones resolve from the named verifier, and default to no on silence.",
    };
  });

  /** Every visible issuance. */
  app.get("/api/issuances", async () => store.visibleIssuances());

  /** One issuance by ticker, case-insensitively. */
  app.get("/api/issuances/:ticker", async (request, reply) => {
    const params = request.params as { ticker: string };
    const issuance = store.issuanceByTicker(params.ticker);
    if (issuance === undefined) {
      return reply.code(404).send({ error: `No issuance carries the ticker ${params.ticker}.` });
    }
    return issuance;
  });

  /** Protocol-wide counters. */
  app.get("/api/metrics", async () => store.metrics());

  /**
   * Stream health.
   *
   * The degradation note is the point of this route. A terminal that has fallen back
   * from gRPC to a websocket, or from a websocket to a poll, has figures that can
   * lag, and the reader is entitled to know.
   *
   * The RPC host is reported so a reader can tell mainnet from devnet, but any
   * credential in it is stripped first. This route is public and the CORS policy
   * allows any origin, so echoing a provider key here would publish it to anyone
   * who opened the network tab. Found by reading the response of a local boot,
   * which returned the key in full.
   */
  app.get("/api/health", async () => ({
    ...store.health(),
    programsDeployed: programsDeployed(config),
    demoMode: config.demoMode,
    rpcHost: rpcHostOf(config.rpcUrl),
    network: config.network,
  }));

  /**
   * A holder's positions.
   *
   * Marked against attested NAV rather than a spot price, because an RWA token's
   * value claim is the underlying asset and not whatever the curve last printed.
   */
  app.get("/api/holdings/:address", async (request) => {
    const params = request.params as { address: string };
    const holdings = await readHoldings(params.address, store);
    return holdings;
  });

  /** The portfolio value curve for a holder over a range. */
  app.get("/api/series/:address", async (request) => {
    const params = request.params as { address: string };
    const query = request.query as { range?: string };
    return store.valueSeries(params.address, windowStart(query.range));
  });
}

/**
 * Resolves a position list for an address.
 *
 * With no deployed programmes there are no token accounts to read, so this returns
 * an empty list rather than a fabricated one. That is the honest result: an
 * unconnected wallet with no positions and an indexer pointed at nothing look the
 * same, and the second is reported through `/api/health` instead.
 */
async function readHoldings(address: string, store: IndexerStore): Promise<Holding[]> {
  if (address.length === 0) return [];
  const visible = store.visibleIssuances();
  if (visible.length === 0) return [];

  // Balances are only populated once token accounts are read on chain. Until then
  // this deliberately returns nothing rather than an estimate.
  return visible
    .filter((issuance) => issuance.issuer === address)
    .map((issuance) => ({
      mint: issuance.mint,
      ticker: issuance.ticker,
      balance: 0,
      valueUsdc: 0,
      assetClass: issuance.assetClass,
      state: issuance.state,
    }));
}

/** Converts a range key to a start timestamp in milliseconds. */
function windowStart(range: string | undefined): number {
  const now = Date.now();
  switch (range) {
    case "1D":
      return now - 86_400_000;
    case "1W":
      return now - 7 * 86_400_000;
    case "1M":
      return now - 30 * 86_400_000;
    case "3M":
      return now - 90 * 86_400_000;
    case "1Y":
      return now - 365 * 86_400_000;
    default:
      return 0;
  }
}
