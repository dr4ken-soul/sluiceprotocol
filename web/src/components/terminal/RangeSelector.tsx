'use client';

/**
 * The range selector.
 *
 * A pill group with `role="tablist"` and `aria-selected` on the active option, per
 * §16.1. Shared by the terminal and the asset detail chart so both offer the same
 * ranges and the same treatment.
 */

import type { ValueRange } from "@/hooks/useLiveData";

export function RangeSelector({
  options,
  value,
  onChange,
}: {
  options: readonly ValueRange[];
  value: ValueRange;
  onChange: (next: ValueRange) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Select a date range"
      className="mt-6 inline-flex gap-1 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] p-1"
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(option)}
            className={`min-h-[32px] rounded-full px-3.5 py-1.5 font-mono text-xs transition-colors duration-200 ${
              active
                ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
