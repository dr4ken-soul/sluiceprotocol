'use client';

/**
 * Section 7: Metrics.
 *
 * Four protocol counters, each a live read. The counters animate on entry and the
 * `whileInView` viewport is repeatable, so scrolling back up replays the animation
 * while the number itself only counts from its previous value rather than from zero.
 */

import { useMarketplace } from "@/hooks/useLiveData";
import { CountUp, Reveal } from "@/lib/motion";
import { formatCompact, formatMicro } from "@/lib/format";
import { DemoTag } from "@/components/ui";

export function Metrics() {
  const { data, isLoading } = useMarketplace();
  const metrics = data?.metrics;

  const entries = [
    {
      label: "Capital committed",
      value: metrics?.capitalCommitted ?? 0,
      format: (value: number) => formatCompact(value, "$"),
    },
    {
      label: "Milestones adjudicated",
      value: metrics?.milestonesAdjudicated ?? 0,
      format: (value: number) => formatMicro(value * 1_000_000).replace(/\.00$/, ""),
    },
    {
      label: "Capital released",
      value: metrics?.capitalReleased ?? 0,
      format: (value: number) => formatCompact(value, "$"),
    },
    {
      label: "Open issuances",
      value: metrics?.openIssuances ?? 0,
      format: (value: number) => String(Math.round(value)),
    },
  ];

  return (
    <section
      data-section-name="Metrics"
      className="relative overflow-hidden bg-[var(--bg-primary)] py-24 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        <p className="mb-16 text-center font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Live on Solana mainnet
        </p>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {entries.map((entry, index) => (
            <Reveal key={entry.label} delay={index * 0.2}>
              {/*
                The hairline divider is desktop-only, so the grid stays a single
                column on a phone without three orphaned vertical rules.
              */}
              <div className="lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
                <p className="font-display text-4xl font-extrabold leading-none tabular-nums text-[var(--text-primary)] md:text-5xl">
                  {isLoading ? (
                    <span className="inline-block h-10 w-28 animate-shimmer rounded-[--radius-md] bg-[var(--bg-elevated)]" />
                  ) : (
                    <CountUp value={entry.value} format={entry.format} durationMs={1500} />
                  )}
                </p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  {entry.label}
                </p>
                {metrics?.isDemo === true ? (
                  <div className="mt-2">
                    <DemoTag />
                  </div>
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>

        {/*
          The count-up reads the live figure, so the label says so. A counter that
          looks authoritative and is not is the exact failure this product exists to
          argue against.
        */}
        <p className="mt-10 text-center font-mono text-[11px] text-[var(--text-muted)]">
          {isLoading
            ? "Reading from the chain"
            : (metrics?.isDemo ?? false)
              ? "Seeded demonstration figures, not live issuances"
              : `Read from ${data?.health.updates ?? 0} account updates over ${data?.health.transport ?? "grpc"}`}
        </p>
      </div>
    </section>
  );
}
