'use client';

/**
 * The portfolio value curve.
 *
 * A coded SVG line chart, no charting library. §16.1 fixes the treatment: stroke
 * 1.5px in the accent, area fill in the accent glow, three hairline baselines, five
 * y-axis ticks in mono, and `role="img"` with an aria-label summarising the range and
 * the change.
 *
 * A charting library would be several hundred kilobytes to draw one line, and the
 * visual language here is specific enough that it would need overriding anyway.
 */

import type { ValuePoint } from "@/lib/types";
import type { ValueRange } from "@/hooks/useLiveData";
import { formatCompact } from "@/lib/format";

interface Props {
  points: readonly ValuePoint[];
  loading: boolean;
  range: ValueRange;
}

/** Chart geometry. The viewBox is fixed and the SVG scales to its container. */
const WIDTH = 800;
const HEIGHT = 280;
const PADDING = { top: 16, right: 56, bottom: 28, left: 16 } as const;

export function ValueChart({ points, loading, range }: Props) {
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  if (loading) {
    return (
      <div className="rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 md:p-6">
        <div className="h-[220px] w-full animate-shimmer rounded-[--radius-md] bg-[var(--bg-elevated)] md:h-[280px]" />
      </div>
    );
  }

  // An empty range is a flat baseline with the empty-state copy over it, which is
  // the treatment §16.1 specifies rather than a zeroed chart.
  if (points.length < 2) {
    return (
      <div className="rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 md:p-6">
        <svg
          role="img"
          aria-label={`No portfolio value history over the selected ${range} range.`}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[220px] w-full md:h-[280px]"
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
          <line
            x1={PADDING.left}
            x2={WIDTH - PADDING.right}
            y1={PADDING.top + plotHeight / 2}
            y2={PADDING.top + plotHeight / 2}
            stroke="var(--border-default)"
            strokeWidth="1.5"
          />
        </svg>
        <p className="mt-4 text-center font-body text-sm text-[var(--text-secondary)]">
          No value history over this range yet. The curve fills in as the market
          reprices the milestones you hold.
        </p>
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  // A flat series would divide by zero. Padding the range keeps the line centred
  // instead of collapsing it onto an axis.
  const lower = span === 0 ? min * 0.98 - 1 : min;
  const upper = span === 0 ? max * 1.02 + 1 : max;
  const range_ = upper - lower === 0 ? 1 : upper - lower;

  const xAt = (index: number): number =>
    PADDING.left + (index / (points.length - 1)) * plotWidth;
  const yAt = (value: number): number =>
    PADDING.top + plotHeight - ((value - lower) / range_) * plotHeight;

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index).toFixed(2)},${yAt(point.value).toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L${xAt(points.length - 1).toFixed(2)},${(PADDING.top + plotHeight).toFixed(2)} L${xAt(0).toFixed(2)},${(PADDING.top + plotHeight).toFixed(2)} Z`;

  const first = points[0];
  const last = points[points.length - 1];
  const change = first !== undefined && last !== undefined ? last.value - first.value : 0;

  // Five y-axis ticks.
  const ticks = Array.from({ length: 5 }, (_, index) => lower + (range_ / 4) * index);

  return (
    <div className="rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 md:p-6">
      <svg
        role="img"
        aria-label={`Portfolio value over the ${range} range. ${
          change >= 0 ? "Up" : "Down"
        } ${formatCompact(Math.abs(change), "dollars")}, ending at ${formatCompact(
          last?.value ?? 0,
          "dollars",
        )}.`}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[220px] w-full md:h-[280px]"
        fill="none"
      >
        <defs>
          <linearGradient id="value-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Three hairline baselines. */}
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

        <path d={areaPath} fill="url(#value-area)" />
        <path d={linePath} stroke="var(--accent)" strokeWidth="1.5" />

        {ticks.map((tick) => (
          <text
            key={tick}
            x={WIDTH - PADDING.right + 8}
            y={yAt(tick) + 3}
            fill="var(--text-muted)"
            fontFamily="var(--font-mono)"
            fontSize="10"
          >
            {formatCompact(tick, "")}
          </text>
        ))}
      </svg>
    </div>
  );
}
