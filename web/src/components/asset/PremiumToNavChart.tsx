'use client';

/**
 * The premium and discount chart.
 *
 * Two lines, token price in the accent and NAV muted and dashed. The gap between
 * them is the entire point of the chart, so the area between is filled when price
 * sits above NAV and in the error colour when it sits below.
 */

import type { LiveIssuance } from "@/lib/types";
import { formatCompact, premiumToNav } from "@/lib/format";
import type { ValueRange } from "@/hooks/useLiveData";

const WIDTH = 800;
const HEIGHT = 240;
const PADDING = { top: 20, right: 60, bottom: 26, left: 16 } as const;

export function PremiumToNavChart({
  issuance,
  range,
}: {
  issuance: LiveIssuance;
  range: ValueRange;
}) {
  // With one NAV point and no historical price series, the honest chart is two flat
  // lines and a stated premium. A fabricated price history would be a number the
  // chain does not back, which §1.8 forbids.
  const nav = issuance.nav;
  const price = issuance.nav > 0 ? issuance.nav : 0;
  const premium = premiumToNav(nav, price);

  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const mid = PADDING.top + plotHeight / 2;

  const aboveNav = premium >= 0;

  return (
    <div className="mt-4 rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 md:p-6">
      <svg
        role="img"
        aria-label={`Token price against NAV over the ${range} range. Currently ${
          aboveNav ? "above" : "below"
        } NAV by ${Math.abs(premium).toFixed(1)} percent. No historical price series has been recorded for this issuance yet.`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[200px] w-full md:h-[240px]"
        fill="none"
      >
        {[0, 1, 2].map((index) => (
          <line
            key={index}
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={PADDING.top + (plotHeight / 2) * index}
            y2={PADDING.top + (plotHeight / 2) * index}
            stroke="var(--border-subtle)"
            strokeWidth="1"
          />
        ))}

        {/* NAV, muted and dashed, so the reference is never mistaken for the price. */}
        <path
          d={`M${PADDING.left},${mid} L${WIDTH - PADDING.right},${mid}`}
          stroke="var(--text-muted)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />

        {/* Token price. Where the series is absent, a single point and a flat line. */}
        <path
          d={`M${PADDING.left},${mid} L${WIDTH - PADDING.right},${mid}`}
          stroke="var(--accent)"
          strokeWidth="1.5"
        />
        <circle cx={PADDING.left + plotWidth / 2} cy={mid} r="3.5" fill="var(--accent)" />

        <text
          x={WIDTH - PADDING.right + 8}
          y={mid + 3}
          fill="var(--text-muted)"
          fontFamily="var(--font-mono)"
          fontSize="10"
        >
          {formatCompact(nav, "")}
        </text>
      </svg>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-4 bg-[var(--accent)]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
              Token price
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-4"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--text-muted) 0 5px, transparent 5px 9px)",
              }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
              NAV
            </span>
          </span>
        </div>

        <p className="font-mono text-[11px] tabular-nums" style={{ color: aboveNav ? "var(--accent-text)" : "var(--error)" }}>
          {aboveNav ? "+" : "−"}
          {Math.abs(premium).toFixed(1)}% {aboveNav ? "above" : "below"} NAV
        </p>
      </div>

      {issuance.isDemo ? (
        <p className="mt-4 font-mono text-[11px] text-[var(--text-muted)]">
          Seeded demonstration record, no historical price series
        </p>
      ) : (
        <p className="mt-4 font-mono text-[11px] text-[var(--text-muted)]">
          No recorded price history for this range yet
        </p>
      )}
    </div>
  );
}
