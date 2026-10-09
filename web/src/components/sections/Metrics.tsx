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
import type { IndexerError } from "@/lib/api";

export function Metrics() {
  const { data, error, isLoading } = useMarketplace();
  const metrics = data?.metrics;

  /*
    §1.8 is explicit that a figure which cannot be read must stop rather than fall
    back to a plausible number, and the fixture rule in TEAM_OPS.md §1.2 says a
    placeholder is worse than an admission. Rendering `metrics?.x ?? 0` did exactly
    the prohibited thing: with no indexer configured every counter read `$0` and the
    footnote read "Read from 0 account updates over grpc", which looks like a
    protocol with no activity rather than a deployment with no data source behind it.
    Those are very different claims and only one of them was true.

    So the counters are replaced by the reason the read failed. The indexer error is
    typed precisely for this, and its `kind` distinguishes a deployment state from
    an incident.
  */
  const unavailable: IndexerError | null = error ?? null;

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

  /*
    The headline names the cluster the figures actually come from, read from the
    indexer rather than hardcoded.

    It said "Live on Solana mainnet" unconditionally, which is a false claim the
    moment the app is pointed at devnet: the figures would be devnet figures under a
    mainnet label, and the marketing checklist treats a mainnet claim as a
    verifiable assertion. Deriving it from `health.network` means the label cannot
    drift from the data, and a misconfigured deployment says what it actually is.
  */
  const cluster = data?.health.network;
  const heading =
    unavailable !== null
      ? "No live source"
      : cluster === "devnet"
        ? "Live on Solana devnet"
        : cluster === "testnet"
          ? "Live on Solana testnet"
          : cluster === "mainnet-beta"
            ? "Live on Solana mainnet"
            : "Live on Solana";

  if (unavailable !== null) {
    return (
      <section
        data-section-name="Metrics"
        className="relative overflow-hidden bg-[var(--bg-primary)] py-24 md:py-32"
      >
        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
          <p className="mb-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            {heading}
          </p>

          <div className="mx-auto max-w-2xl border-l border-[var(--border-subtle)] pl-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
              {unavailable.kind === "unconfigured"
                ? "No indexer configured"
                : "Live data unavailable"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {unavailable.kind === "unconfigured"
                ? "These four counters read from the indexer, which is not deployed yet. No figure is shown rather than a placeholder, because a zero here would read as a protocol with no activity instead of a deployment with no data source."
                : unavailable.message}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      data-section-name="Metrics"
      className="relative overflow-hidden bg-[var(--bg-primary)] py-24 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        <p className="mb-16 text-center font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          {heading}
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
