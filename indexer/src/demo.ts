/**
 * The seeded demo fixture.
 *
 * `APP_BLUEPRINT.md` and `FRONTEND_SPEC.md` §1.8 both fix these figures: Lagos
 * Cold Chain Logistics, ticker LCC-01, NAV ₦412.8m, 68 percent of a ₦180m
 * target, YES at 74 cents, settling in eleven days.
 *
 * Two rules govern this file. It is served by the indexer behind
 * `featuredIssuance`, never hardcoded in the frontend, so switching demo mode
 * off is an indexer restart rather than a program redeploy. And every figure it
 * carries is flagged `isDemo: true`, which the frontend renders as a visible DEMO
 * tag. This is a product handling other people's money, and an unlabelled invented
 * figure is a compliance problem rather than a design one.
 */

import type { LiveIssuance, Milestone } from "./types.ts";

/** Base mainnet timestamp used to keep the fixture deterministic across restarts. */
const DEMO_EPOCH = 1_789_000_000;

/** Micro-units in one naira-anchored whole unit of the demo fixture. */
const N = 1_000_000;

/** The single milestone market behind the fixture. */
function demoMilestone(issuance: string, deadline: number): Milestone {
  return {
    issuance,
    index: 1,
    question:
      "Did the Port Harcourt to Lagos cold chain complete 480 contracted deliveries in the quarter ending 31 March 2027, as reported in the monthly fleet attestation?",
    verifier: "Atlas Assurance Partners",
    deadline,
    graceWindow: 86_400,
    trancheSize: 54_000_000 * N,
    market: "",
    outcome: null,
    resolvedAt: null,
  };
}

/**
 * Builds the fixture.
 *
 * @param now Unix seconds. The deadlines are derived from it so the countdown
 * ticks in a demo recorded at any time of day without the fixture going stale.
 */
export function buildDemoIssuance(now: number): LiveIssuance {
  const address = "DEMO0000000000000000000000000000000000000";
  const closesAt = now + 11 * 86_400;

  return {
    address,
    mint: "DEMO0000000000000000000000000000000000000",
    ticker: "LCC-01",
    issuerName: "Lagos Cold Chain Logistics",
    issuer: address,
    assetClass: "invoice",
    nav: 412_800_000 * N,
    navLow: 371_520_000 * N,
    navHigh: 495_360_000 * N,
    raised: 122_400_000 * N,
    target: 180_000_000 * N,
    yesCents: 74,
    noCents: 26,
    settlesInDays: 11,
    closesAt,
    // The specification's own label for the fixture is "FUNDED, MILESTONE OPEN",
    // so the state is `funded` and the open milestone is what the hero card's
    // "milestone open" wording refers to. Both are carried separately.
    state: "funded",
    attestedAt: now - 9 * 86_400,
    attestor: "Atlas Assurance Partners",
    milestones: [demoMilestone(address, closesAt)],
    isDemo: true,
  };
}

/** The fixture at its fixed epoch, for tests and for the empty-state snapshot. */
export const DEMO_ISSUANCE: LiveIssuance = buildDemoIssuance(DEMO_EPOCH);
