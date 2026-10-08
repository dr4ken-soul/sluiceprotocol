/**
 * Deterministic featured-issuance selection.
 *
 * `FRONTEND_SPEC.md` §1.8 requires the featured card to be chosen by a stated
 * rule rather than by whatever the indexer happened to see first, so the hero
 * card is reproducible and testable.
 *
 * The rule, in order:
 *
 * 1. The issuance must have a milestone still open.
 * 2. Soonest settlement timestamp wins, so the card shows the most immediate
 *    adjudication on the protocol.
 * 3. Ties break on amount raised, larger first, so the card is not decided by
 *    account ordering.
 *
 * When nothing qualifies and demo mode is on, the seeded fixture is served with
 * `isDemo: true`. The surface is never empty while any open issuance exists.
 */

import { buildDemoIssuance } from "./demo.ts";
import type { LiveIssuance } from "./types.ts";

/** Whether the issuance has a milestone that has not yet resolved. */
function hasOpenMilestone(issuance: LiveIssuance): boolean {
  return issuance.milestones.some((milestone) => milestone.outcome === null);
}

/**
 * Settlement timestamp used for ordering.
 *
 * The soonest open milestone deadline is the settlement event a holder is waiting
 * on, so it is what the card should surface. An issuance with no open milestone
 * returns `null` and is filtered out before comparison.
 */
function settlementTime(issuance: LiveIssuance): number | null {
  const open = issuance.milestones
    .filter((milestone) => milestone.outcome === null)
    .map((milestone) => milestone.deadline);
  if (open.length === 0) return null;
  return Math.min(...open);
}

/**
 * Compares two qualifying issuances, returning a negative number when `a` should
 * be featured.
 *
 * Exported so the ordering can be tested directly rather than only through
 * [`selectFeatured`].
 */
export function compareForFeatured(a: LiveIssuance, b: LiveIssuance): number {
  const aTime = settlementTime(a) ?? Number.POSITIVE_INFINITY;
  const bTime = settlementTime(b) ?? Number.POSITIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;
  if (a.raised !== b.raised) return b.raised - a.raised;
  // Final tiebreak on address, so the result is stable across restarts rather
  // than dependent on subscription order.
  return a.address.localeCompare(b.address);
}

/**
 * Selects the issuance to feature.
 *
 * @param issuances Every known issuance, demo rows included.
 * @param demoMode Whether the seeded fixture may be served.
 * @param now Unix seconds, used to date the fixture's deadlines.
 */
export function selectFeatured(
  issuances: readonly LiveIssuance[],
  demoMode: boolean,
  now: number,
): LiveIssuance | null {
  const qualifying = issuances.filter((issuance) => hasOpenMilestone(issuance));
  if (qualifying.length > 0) {
    return [...qualifying].sort(compareForFeatured)[0] ?? null;
  }
  if (demoMode) {
    return buildDemoIssuance(now);
  }
  return null;
}
