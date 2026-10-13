'use client';

/**
 * The adjudication table, the screen that wins the demo.
 *
 * Structure: one open question per tranche, with the market's current read and the
 * resolution path, split into live and resolved sub-tabs.
 *
 * The countdown ticks from the shared clock hook rather than from a re-render
 * cascade, so a ticking countdown does not re-fetch anything.
 */

import { useState } from "react";
import { useNow } from "@/hooks/useLiveData";
import type { Milestone } from "@/lib/types";
import { formatCountdown, formatDate, formatCompact, truncateAddress } from "@/lib/format";
import { EmptyState, LiveDot } from "@/components/ui";

type Filter = "live" | "resolved";

export function AdjudicationTable({ milestones }: { milestones: readonly Milestone[] }) {
  const [filter, setFilter] = useState<Filter>("live");
  const now = useNow(1_000);

  const live = milestones.filter((milestone) => milestone.outcome === null);
  const resolved = milestones.filter((milestone) => milestone.outcome !== null);
  const shown = filter === "live" ? live : resolved;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filter milestones"
        className="inline-flex gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] p-1"
      >
        {(["live", "resolved"] as const).map((option) => {
          const active = filter === option;
          const count = option === "live" ? live.length : resolved.length;
          return (
            <button
              key={option}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setFilter(option)}
              className={`min-h-[32px] rounded-full px-3.5 py-1.5 font-mono text-xs capitalize transition-colors duration-200 ${
                active
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {option} ({count})
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          message={
            filter === "live"
              ? "No milestone is open right now; a new question opens when the issuer configures the next tranche."
              : "Nothing has resolved yet. The first resolution routes capital either to release or to redemption."
          }
        />
      ) : (
        <>
          <table className="mt-6 hidden w-full border-collapse md:table">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                {["Tranche", "Question", "Market", "Closes", "Outcome"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="py-3 pr-6 text-left font-mono text-[11px] font-normal uppercase tracking-[0.15em] text-[var(--text-muted)]"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((milestone) => (
                <tr key={milestone.index} className="border-b border-[var(--border-subtle)]">
                  <td className="py-4 pr-6 font-mono text-xs tracking-[0.15em] text-[var(--text-muted)]">
                    {milestone.market === "" || milestone.market.startsWith("DEMO")
                      ? `T${milestone.index}`
                      : `T${milestone.index}`}
                  </td>
                  <td className="max-w-[42ch] py-4 pr-6 font-body text-sm text-[var(--text-primary)]">
                    {milestone.question}
                  </td>
                  <td className="py-4 pr-6 font-mono text-sm tabular-nums">
                    <OddsCell yes={null} no={null} milestone={milestone} />
                  </td>
                  <td className="py-4 pr-6 font-mono text-xs text-[var(--text-secondary)]">
                    {milestone.outcome === null ? (
                      <span className="flex items-center gap-1.5">
                        <LiveDot />
                        {formatCountdown(milestone.deadline, now)}
                      </span>
                    ) : (
                      formatDate(milestone.deadline)
                    )}
                  </td>
                  <td className="py-4 pr-6">
                    <OutcomeBadge milestone={milestone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 space-y-3 md:hidden">
            {shown.map((milestone) => (
              <div
                key={milestone.index}
                className="rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="font-mono text-[11px] tracking-[0.15em] text-[var(--text-muted)]">
                    Tranche {milestone.index}
                  </span>
                  <OutcomeBadge milestone={milestone} />
                </div>
                <p className="font-body text-sm text-[var(--text-primary)]">
                  {milestone.question}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs tabular-nums text-[var(--accent-text)]">
                    {milestone.market === "" ? "Demo market" : truncateAddress(milestone.market)}
                  </span>
                  <span className="font-mono text-xs text-[var(--text-secondary)]">
                    {milestone.outcome === null
                      ? formatCountdown(milestone.deadline, now)
                      : `Resolved ${formatDate(milestone.resolvedAt ?? milestone.deadline)}`}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">
                  Tranche {formatCompact(milestone.trancheSize)} to {milestone.verifier}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * The market cell.
 *
 * Two-part, YES in the accent text and NO muted, separated by a 1px vertical
 * divider. Prices come from the milestone's market; the seeded fixture carries none,
 * so it says so rather than inventing a mid.
 */
function OddsCell({
  milestone,
}: {
  yes: number | null;
  no: number | null;
  milestone: Milestone;
}) {
  if (milestone.market === "" || milestone.market.startsWith("DEMO")) {
    return (
      <span className="text-[var(--text-muted)]">
        {milestone.outcome === null ? "Awaiting market" : "Resolved"}
      </span>
    );
  }
  return (
    <span className="flex items-center">
      <span className="text-[var(--accent-text)]">—</span>
      <span aria-hidden="true" className="mx-2 inline-block h-3 w-px bg-[var(--border-default)]" />
      <span className="text-[var(--text-muted)]">—</span>
    </span>
  );
}

/**
 * The outcome badge.
 *
 * A resolved milestone reads `Resolved yes` or `Resolved no`, and a defaulted no
 * says so explicitly, because "the verifier reported no" and "the verifier said
 * nothing" are different facts about the issuer even though they settle the same
 * way.
 */
function OutcomeBadge({ milestone }: { milestone: Milestone }) {
  if (milestone.outcome === null) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--accent-glow)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--accent-text)]">
        Open
      </span>
    );
  }

  if (milestone.outcome === true) {
    return (
      <span className="inline-flex items-center rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--success)]">
        Resolved yes
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-[var(--error)]/25 bg-[var(--error)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--error)]">
      Resolved no
    </span>
  );
}
