/**
 * Tests for the deterministic featured-issuance rule and the seeded fixture.
 *
 * `BUILD_GUIDE.md` step 2.2 requires that promotion be a configuration change
 * rather than a deploy, so the demo-mode branch is tested here as a pure function
 * of its inputs. If this suite passes, flipping `NEXT_PUBLIC_DEMO_MODE` in the
 * environment is the whole change.
 */

import { describe, expect, it } from "vitest";
import { buildDemoIssuance } from "../demo.ts";
import { compareForFeatured, selectFeatured } from "../featured.ts";
import type { LiveIssuance, Milestone } from "../types.ts";

const NOW = 1_789_000_000;

function milestone(deadline: number, index = 1): Milestone {
  return {
    issuance: "",
    index,
    question: "Did the contracted deliveries complete in the quarter?",
    verifier: "Atlas Assurance Partners",
    deadline,
    graceWindow: 86_400,
    trancheSize: 1_000_000,
    market: "",
    outcome: null,
    resolvedAt: null,
  };
}

function issuance(overrides: Partial<LiveIssuance> & { address: string }): LiveIssuance {
  return {
    mint: overrides.address,
    ticker: "TST",
    issuerName: "Test Issuer",
    issuer: overrides.address,
    assetClass: "invoice",
    nav: 0,
    navLow: 0,
    navHigh: 0,
    raised: 0,
    target: 0,
    yesCents: 74,
    noCents: 26,
    settlesInDays: 11,
    closesAt: null,
    state: "adjudicating",
    attestedAt: NOW,
    attestor: "Atlas Assurance Partners",
    milestones: [milestone(NOW + 86_400)],
    isDemo: false,
    ...overrides,
  };
}

describe("selectFeatured", () => {
  it("returns null when there is nothing open and demo mode is off", () => {
    expect(selectFeatured([], false, NOW)).toBeNull();
  });

  it("serves the seeded fixture when nothing qualifies and demo mode is on", () => {
    const featured = selectFeatured([], true, NOW);
    expect(featured).not.toBeNull();
    expect(featured?.isDemo).toBe(true);
    expect(featured?.ticker).toBe("LCC-01");
  });

  it("prefers a real issuance over the fixture even when demo mode is on", () => {
    const real = issuance({ address: "Real1111111111111111111111111111111111111" });
    const featured = selectFeatured([real], true, NOW);
    expect(featured?.address).toBe(real.address);
    expect(featured?.isDemo).toBe(false);
  });

  it("ignores an issuance whose milestones have all resolved", () => {
    const resolved = issuance({
      address: "Done11111111111111111111111111111111111111",
      milestones: [{ ...milestone(NOW), outcome: true, resolvedAt: NOW }],
    });
    expect(selectFeatured([resolved], false, NOW)).toBeNull();
  });

  it("ignores an issuance with no milestones at all", () => {
    const none = issuance({
      address: "None111111111111111111111111111111111111111",
      milestones: [],
    });
    expect(selectFeatured([none], false, NOW)).toBeNull();
  });

  it("picks the soonest settlement when several are open", () => {
    const soon = issuance({
      address: "Soon11111111111111111111111111111111111111",
      milestones: [milestone(NOW + 3_600)],
    });
    const later = issuance({
      address: "Late111111111111111111111111111111111111111",
      raised: 99_000_000,
      milestones: [milestone(NOW + 90_000)],
    });
    expect(selectFeatured([later, soon], false, NOW)?.address).toBe(soon.address);
  });

  it("breaks a settlement tie on the larger raise", () => {
    const small = issuance({
      address: "Smal111111111111111111111111111111111111111",
      raised: 1_000,
      milestones: [milestone(NOW + 3_600)],
    });
    const large = issuance({
      address: "Larg111111111111111111111111111111111111111",
      raised: 900_000,
      milestones: [milestone(NOW + 3_600)],
    });
    expect(selectFeatured([small, large], false, NOW)?.address).toBe(large.address);
  });

  it("is stable across input ordering, which is what makes it reproducible", () => {
    const a = issuance({
      address: "Aaaa11111111111111111111111111111111111111",
      raised: 5_000,
      milestones: [milestone(NOW + 3_600)],
    });
    const b = issuance({
      address: "Bbbb11111111111111111111111111111111111111",
      raised: 5_000,
      milestones: [milestone(NOW + 3_600)],
    });
    expect(selectFeatured([a, b], false, NOW)?.address).toBe(
      selectFeatured([b, a], false, NOW)?.address,
    );
  });

  it("ranks on the soonest open milestone, not the first one listed", () => {
    // `two`'s first milestone is far off but its second is imminent. Ordering must
    // follow the imminent one, which makes it beat an issuance settling later.
    const two = issuance({
      address: "Two111111111111111111111111111111111111111111",
      milestones: [milestone(NOW + 500_000, 1), milestone(NOW + 3_600, 2)],
    });
    const later = issuance({
      address: "Oth111111111111111111111111111111111111111111",
      milestones: [milestone(NOW + 100_000)],
    });
    expect(compareForFeatured(two, later)).toBeLessThan(0);
    expect(selectFeatured([later, two], false, NOW)?.address).toBe(two.address);
  });

  it("ignores resolved milestones when choosing the settlement time", () => {
    // `mixed` settled its first tranche immediately, so only its second milestone,
    // 90,000s out, counts. `nearer` at 45,000s is therefore the sooner settlement.
    const mixed = issuance({
      address: "Mix11111111111111111111111111111111111111111111",
      milestones: [
        { ...milestone(NOW + 1_000, 1), outcome: false, resolvedAt: NOW },
        milestone(NOW + 90_000, 2),
      ],
    });
    const nearer = issuance({
      address: "Nar11111111111111111111111111111111111111111111",
      milestones: [milestone(NOW + 45_000)],
    });
    expect(selectFeatured([mixed, nearer], false, NOW)?.address).toBe(nearer.address);
  });

  it("treats a resolution inside the grace window as no, which is the default path", () => {
    // Silence resolves no rather than leaving the tranche stuck. A milestone whose
    // deadline has passed with `outcome: false` is settled, so it stops ranking.
    const defaultedNo = issuance({
      address: "Def11111111111111111111111111111111111111111111",
      milestones: [{ ...milestone(NOW - 10_000), outcome: false, resolvedAt: NOW - 5_000 }],
    });
    expect(selectFeatured([defaultedNo], false, NOW)).toBeNull();
  });
});

describe("buildDemoIssuance", () => {
  it("carries the figures fixed by the specification", () => {
    const demo = buildDemoIssuance(NOW);
    expect(demo.issuerName).toBe("Lagos Cold Chain Logistics");
    expect(demo.ticker).toBe("LCC-01");
    expect(demo.nav).toBe(412_800_000 * 1_000_000);
    expect(demo.target).toBe(180_000_000 * 1_000_000);
    expect(demo.raised / demo.target).toBeCloseTo(0.68, 5);
    expect(demo.yesCents).toBe(74);
    expect(demo.noCents).toBe(26);
    expect(demo.settlesInDays).toBe(11);
    expect(demo.state).toBe("funded");
  });

  it("is always flagged as demo so the tag is rendered", () => {
    expect(buildDemoIssuance(NOW).isDemo).toBe(true);
  });

  it("derives its deadline from the supplied clock, so a demo never goes stale", () => {
    expect(buildDemoIssuance(NOW).closesAt).toBe(NOW + 11 * 86_400);
    expect(buildDemoIssuance(NOW + 1_000).closesAt).toBe(NOW + 1_000 + 11 * 86_400);
  });

  it("keeps YES and NO summing to one hundred cents", () => {
    const demo = buildDemoIssuance(NOW);
    expect((demo.yesCents ?? 0) + (demo.noCents ?? 0)).toBe(100);
  });

  it("carries a named verifier and a grace window, as the adjudication screen shows", () => {
    const [first] = buildDemoIssuance(NOW).milestones;
    expect(first?.verifier).toBe("Atlas Assurance Partners");
    expect(first?.graceWindow).toBe(86_400);
    expect(first?.outcome).toBeNull();
  });
});
