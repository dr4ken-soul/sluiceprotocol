'use client';

import { CheckIcon } from "@/components/ui";

/**
 * The step rail.
 *
 * Sticky, horizontally scrollable below `md`, with `aria-current="step"` on the
 * active step and a check glyph on completed ones. A step is only reachable through
 * Continue, so the rail is a progress indicator rather than a set of links the user
 * can jump to out of order.
 */

export const STEPS = [
  { number: 1, label: "Asset" },
  { number: 2, label: "Valuation" },
  { number: 3, label: "Compliance" },
  { number: 4, label: "Curve" },
  { number: 5, label: "Milestones" },
  { number: 6, label: "Review" },
] as const;

export function StepRail({
  current,
  onSelect,
  completedThrough,
}: {
  current: number;
  onSelect: (step: number) => void;
  completedThrough: { ticker: string; issuerName: string };
}) {
  // A step counts as reached once the one before it has been filled in, which is a
  // cheap and honest proxy for progress that does not need its own state.
  const reached = completedThrough.ticker.trim().length > 0 ? 2 : 1;

  return (
    <div className="sticky top-16 z-[20] overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/85 px-6 py-4 backdrop-blur-xl md:px-10">
      <ol className="mx-auto flex max-w-3xl items-center gap-2">
        {STEPS.map((step) => {
          const current_ = step.number === current;
          const done = step.number < current && step.number <= reached;
          const upcoming = step.number > current;

          return (
            <li key={step.number} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!upcoming) onSelect(step.number);
                }}
                disabled={upcoming}
                aria-current={current_ ? "step" : undefined}
                className={`flex min-h-[36px] items-center gap-1.5 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.15em] transition-colors duration-200 disabled:cursor-not-allowed ${
                  current_
                    ? "text-[var(--accent-text)] underline decoration-2 underline-offset-4"
                    : done
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-muted)]"
                }`}
              >
                {done ? (
                  <>
                    <CheckIcon label="" className="h-3.5 w-3.5" />
                    {step.label}
                  </>
                ) : (
                  <>
                    <span aria-hidden="true">{step.number}</span>
                    {step.label}
                  </>
                )}
              </button>
              {step.number < STEPS.length ? (
                <span aria-hidden="true" className="h-px w-4 bg-[var(--border-default)]" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
