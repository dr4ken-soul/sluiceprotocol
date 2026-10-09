/**
 * Tests for the Panta resolver.
 *
 * The property under test is the one `APP_BLUEPRINT.md` §"Thin market defence"
 * cares about: a milestone is released only when a market that can be trusted says
 * so. Every other path must fall back, and every fallback must end at no when the
 * verifier is silent, because the grace window exists precisely to stop capital
 * releasing on the absence of evidence.
 *
 * Each case pins a specific gate rather than a general shape, because the failure
 * mode this guards against is a single gate quietly removed.
 */

import { describe, expect, it } from "vitest";
import {
  attributeTrade,
  DEPTH_FLOOR_USDC,
  marketRequestFor,
  pantaConfigured,
  resolveFromMarket,
} from "../adjudication.ts";
import type { Config } from "../config.ts";
import { PantaClient, PantaError, type PantaMarket } from "../panta.ts";

const NOW = 1_789_000_000;

function config(overrides: Partial<Config["panta"]> = {}): Config {
  return {
    port: 8787,
    host: "0.0.0.0",
    rpcUrl: "https://example.invalid",
    network: "devnet",
    grpcEndpoint: null,
    grpcToken: null,
    programs: {
      curve: null,
      compliance: null,
      bond: null,
      verifier: null,
      settlement: null,
      redemption: null,
      waterfall: null,
      autopilot: null,
    },
    demoMode: false,
    panta: { apiKey: "pk_test_x", marketWallet: "Wallet111", category: "other", ...overrides },
    fees: {
      curveBps: 30,
      milestoneMarketBps: 50,
      secondaryBps: 30,
      redemptionBps: 25,
      waterfallBps: 50,
      issuanceFeeFlatUsd: 200,
      issuanceFeeBps: 25,
    },
  };
}

/** A fetch stub that answers the market route with one row. */
function stubFetch(market: Partial<PantaMarket>, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(market), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

function clientFor(market: Partial<PantaMarket>, status = 200): PantaClient {
  return new PantaClient({ apiKey: "pk_test_x", fetchImpl: stubFetch(market, status) });
}

const RESOLVED_YES: Partial<PantaMarket> = {
  marketId: "Mkt111",
  phase: "secondary",
  marketType: "standard",
  startTime: NOW - 10_000,
  endTime: NOW - 1_000,
  resolutionTime: NOW - 500,
  resolved: true,
  status: "resolved",
  yesPrice: "1.00",
  noPrice: "0.00",
  volumeUsdc: "5000.00",
};

describe("pantaConfigured", () => {
  it("is false without a key", () => {
    expect(pantaConfigured(config({ apiKey: null }))).toBe(false);
  });

  it("is false for a blank key", () => {
    expect(pantaConfigured(config({ apiKey: "" }))).toBe(false);
  });

  it("is true with a key", () => {
    expect(pantaConfigured(config())).toBe(true);
  });
});

describe("resolveFromMarket gates", () => {
  it("defaults to no when Panta is unconfigured and the verifier is silent", async () => {
    const decision = await resolveFromMarket({
      config: config({ apiKey: null }),
      client: clientFor(RESOLVED_YES),
      marketId: "Mkt111",
      verifierReported: null,
      now: NOW,
    });
    expect(decision.source).toBe("default-no");
    expect(decision.yes).toBe(false);
  });

  it("defaults to no when no market is attached", async () => {
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor(RESOLVED_YES),
      marketId: null,
      verifierReported: true,
      now: NOW,
    });
    expect(decision.source).toBe("default-no");
    expect(decision.yes).toBe(false);
  });

  it("falls back to the verifier when Panta errors", async () => {
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor({}, 503),
      marketId: "Mkt111",
      verifierReported: true,
      now: NOW,
    });
    expect(decision.source).toBe("verifier");
    expect(decision.yes).toBe(true);
    expect(decision.pantaError).toBe("HTTP_503");
  });

  it("falls back to the verifier when the market is unresolved", async () => {
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor({ ...RESOLVED_YES, resolved: false, status: "open", yesPrice: "0.62" }),
      marketId: "Mkt111",
      verifierReported: true,
      now: NOW,
    });
    expect(decision.source).toBe("verifier");
    expect(decision.yesPrice).toBe(0.62);
  });

  it("refuses a market whose resolution time is still in the future", async () => {
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor({ ...RESOLVED_YES, resolutionTime: NOW + 60 }),
      marketId: "Mkt111",
      verifierReported: null,
      now: NOW,
    });
    expect(decision.source).toBe("default-no");
    expect(decision.yes).toBe(false);
  });

  it("refuses a market below the depth floor even when it says yes", async () => {
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor({ ...RESOLVED_YES, volumeUsdc: "40.00" }),
      marketId: "Mkt111",
      verifierReported: null,
      now: NOW,
    });
    expect(decision.source).toBe("default-no");
    expect(decision.yes).toBe(false);
    expect(decision.reason).toContain(DEPTH_FLOOR_USDC);
  });

  it("refuses a resolved market quoting no winning side", async () => {
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor({ ...RESOLVED_YES, yesPrice: "0.50", noPrice: "0.50" }),
      marketId: "Mkt111",
      verifierReported: null,
      now: NOW,
    });
    expect(decision.source).toBe("default-no");
  });

  it("lets a deep resolved market decide yes", async () => {
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor(RESOLVED_YES),
      marketId: "Mkt111",
      verifierReported: null,
      now: NOW,
    });
    expect(decision.source).toBe("panta");
    expect(decision.yes).toBe(true);
  });

  it("lets a deep resolved market decide no", async () => {
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor({ ...RESOLVED_YES, yesPrice: "0.00", noPrice: "1.00" }),
      marketId: "Mkt111",
      verifierReported: true,
      now: NOW,
    });
    expect(decision.source).toBe("panta");
    expect(decision.yes).toBe(false);
  });

  it("is decisive only when the verifier and the market disagree on a trusted market", async () => {
    // The verifier says no, the market resolved deep on yes. The market is the
    // resolver in that case, which is the point of pricing it.
    const decision = await resolveFromMarket({
      config: config(),
      client: clientFor(RESOLVED_YES),
      marketId: "Mkt111",
      verifierReported: false,
      now: NOW,
    });
    expect(decision.source).toBe("panta");
    expect(decision.yes).toBe(true);
  });
});

describe("marketRequestFor", () => {
  const base = {
    wallet: "Wallet111",
    question: "Did the Q3 deliveries complete?",
    resolutionRule: "Verifier signs the delivery manifest hash",
    sourcesOfTruth: ["https://example.com/manifest.json"],
    startTime: NOW + 3_600,
    endTime: NOW + 86_400,
    resolutionTime: NOW + 90_000,
    imageUrl: "https://cdn.example.com/q3.png",
  };

  it("copies the fields a create-market quote needs", () => {
    const request = marketRequestFor(base);
    expect(request.question).toBe(base.question);
    expect(request.sourcesOfTruth).toEqual(base.sourcesOfTruth);
    expect(request.category).toBe("other");
  });

  it("copies the source array rather than aliasing it", () => {
    const sources = ["https://example.com/a"];
    const request = marketRequestFor({ ...base, sourcesOfTruth: sources });
    expect(request.sourcesOfTruth).not.toBe(sources);
  });
});

describe("attributeTrade", () => {
  it("reports a stored attribution", async () => {
    const client = new PantaClient({
      apiKey: "pk_test_x",
      fetchImpl: (async () =>
        new Response(JSON.stringify({ status: "processed", kind: "buy", side: "yes" }), {
          status: 200,
        })) as unknown as typeof fetch,
    });
    const result = await attributeTrade({
      client,
      signature: "sig1",
      wallet: "Wallet111",
      marketId: "Mkt111",
    });
    expect(result).toMatchObject({ ok: true, kind: "buy" });
  });

  it("returns the code rather than throwing when Panta rejects the report", async () => {
    const client = new PantaClient({
      apiKey: "pk_test_x",
      fetchImpl: (async () =>
        new Response(JSON.stringify({ code: "TX_MISMATCH", message: "not a trade" }), {
          status: 400,
        })) as unknown as typeof fetch,
    });
    const result = await attributeTrade({
      client,
      signature: "sig1",
      wallet: "Wallet111",
      marketId: "Mkt111",
    });
    expect(result).toMatchObject({ ok: false, code: "TX_MISMATCH" });
  });

  it("does not throw when the client is unconfigured", async () => {
    const client = new PantaClient({ apiKey: undefined });
    const result = await attributeTrade({
      client,
      signature: "sig1",
      wallet: "Wallet111",
      marketId: "Mkt111",
    });
    expect(result).toMatchObject({ ok: false, code: "UNCONFIGURED" });
  });
});

describe("PantaClient validation", () => {
  const client = new PantaClient({ apiKey: "pk_test_x" });

  it("rejects an empty question before any network call", async () => {
    await expect(
      client.quoteCreate({
        wallet: "W",
        question: "  ",
        resolutionRule: "r",
        sourcesOfTruth: ["https://a.example"],
        startTime: 1,
        endTime: 2,
        resolutionTime: 3,
        imageUrl: "https://a.example/i.png",
      }),
    ).rejects.toBeInstanceOf(PantaError);
  });

  it("rejects out-of-order timestamps", async () => {
    await expect(
      client.quoteCreate({
        wallet: "W",
        question: "q",
        resolutionRule: "r",
        sourcesOfTruth: ["https://a.example"],
        startTime: 3,
        endTime: 2,
        resolutionTime: 1,
        imageUrl: "https://a.example/i.png",
      }),
    ).rejects.toBeInstanceOf(PantaError);
  });

  it("rejects a non-public source of truth", async () => {
    await expect(
      client.quoteCreate({
        wallet: "W",
        question: "q",
        resolutionRule: "r",
        sourcesOfTruth: ["file:///etc/passwd"],
        startTime: 1,
        endTime: 2,
        resolutionTime: 3,
        imageUrl: "https://a.example/i.png",
      }),
    ).rejects.toBeInstanceOf(PantaError);
  });

  it("rejects an empty sources list", async () => {
    await expect(
      client.quoteCreate({
        wallet: "W",
        question: "q",
        resolutionRule: "r",
        sourcesOfTruth: [],
        startTime: 1,
        endTime: 2,
        resolutionTime: 3,
        imageUrl: "https://a.example/i.png",
      }),
    ).rejects.toBeInstanceOf(PantaError);
  });

  it("reports itself unconfigured rather than calling out", async () => {
    const bare = new PantaClient({ apiKey: undefined });
    expect(bare.configured).toBe(false);
    await expect(bare.fetchMarket("Mkt111")).rejects.toBeInstanceOf(PantaError);
  });
});
