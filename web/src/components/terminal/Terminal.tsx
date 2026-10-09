
'use client';

import { GateLink } from "@/components/layout/GateLink";

/**
 * The terminal screen.
 *
 * Two things a holder actually asks: what am I worth, and what is happening to it.
 * The first is a value curve over a selectable range, the second a filterable
 * holdings table.
 *
 * Density 9: every figure is live, and the streaming health is shown because a
 * terminal that has quietly degraded should say so.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { useHoldings, useValueSeries, type ValueRange } from "@/hooks/useLiveData";
import { useSession } from "@/components/layout/useSession";
import { assetClassLabel, formatCompact, stateBadgeClasses, stateLabel } from "@/lib/format";
import { CountUp } from "@/lib/motion";
import {
  EmptyState,
  ErrorState,
  PrimaryButton,
  Skeleton,
} from "@/components/ui";
import { ValueChart } from "./ValueChart";
import { RangeSelector } from "./RangeSelector";

const RANGES: ValueRange[] = ["1D", "1W", "1M", "3M", "1Y", "ALL"];

export function Terminal() {
  const session = useSession();
  const [range, setRange] = useState<ValueRange>("1W");
  const [classFilter, setClassFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");

  const holdings = useHoldings(session.address);
  const series = useValueSeries(session.address, range);

  const filtered = useMemo(
    () =>
      (holdings.data ?? []).filter(
        (holding) =>
          (classFilter === "all" || holding.assetClass === classFilter) &&
          (stateFilter === "all" || holding.state === stateFilter),
      ),
    [holdings.data, classFilter, stateFilter],
  );

  const portfolio = useMemo(
    () => filtered.reduce((total, holding) => total + holding.valueUsdc, 0),
    [filtered],
  );

  // The change line compares the first and last point of the selected range, which
  // is what a holder means by "over the selected range".
  const change = useMemo(() => {
    const points = series.data ?? [];
    const first = points[0];
    const last = points[points.length - 1];
    if (first === undefined || last === undefined) return 0;
    return last.value - first.value;
  }, [series.data]);

  return (
    <main id="main" className="mx-auto max-w-7xl px-6 pb-24 pt-28 md:px-10 md:pb-32 md:pt-32">
      <header className="pb-8">
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
          Welcome, {session.displayName}
        </h1>
        <p className="mt-2 font-display text-4xl font-extrabold tabular-nums text-[var(--text-primary)] md:text-5xl">
          {holdings.isLoading ? (
            <span className="inline-block h-12 w-40 animate-shimmer rounded-[--radius-md] bg-[var(--bg-elevated)]" />
          ) : (
            <CountUp value={portfolio} format={(value) => formatCompact(value, "$")} />
          )}
        </p>
        <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">
          {series.data !== undefined && series.data.length > 1 ? (
            <>
              <span style={{ color: change >= 0 ? "var(--success)" : "var(--error)" }}>
                {change >= 0 ? "+" : "−"}
                {formatCompact(Math.abs(change), "$")}
              </span>{" "}
              over the selected range
            </>
          ) : (
            "No range history yet for this wallet"
          )}
        </p>
      </header>

      <RangeSelector options={RANGES} value={range} onChange={setRange} />

      <section aria-label="Portfolio value" className="mt-6">
        <ValueChart points={series.data ?? []} loading={series.isLoading} range={range} />
      </section>

      <section aria-labelledby="holdings-heading" className="mt-10">
        <h2 id="holdings-heading" className="font-display text-xl font-bold text-[var(--text-primary)]">
          My holdings
        </h2>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="sr-only" htmlFor="filter-class">
            Filter by asset class
          </label>
          <select
            id="filter-class"
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            className="rounded-[--radius-md] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]"
          >
            <option value="all">All classes</option>
            <option value="revenue">Revenue</option>
            <option value="royalty">Royalty</option>
            <option value="invoice">Invoice</option>
          </select>

          <label className="sr-only" htmlFor="filter-state">
            Filter by state
          </label>
          <select
            id="filter-state"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value)}
            className="rounded-[--radius-md] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 font-mono text-xs text-[var(--text-secondary)]"
          >
            <option value="all">All states</option>
            <option value="funded">Funded</option>
            <option value="adjudicating">Adjudicating</option>
            <option value="settled">Settled</option>
            <option value="redeeming">Redeeming</option>
          </select>
        </div>

        <div className="mt-6">
          {holdings.isError ? (
            <ErrorState
              title="Holdings did not load"
              detail={
                holdings.error?.message ??
                "Positions are read from the chain. Nothing was changed; retry when the indexer is reachable."
              }
              onRetry={() => void holdings.refetch()}
            />
          ) : holdings.isLoading ? (
            <Skeleton rows={4} className="space-y-3" />
          ) : filtered.length === 0 ? (
            <EmptyState
              message="No holdings yet. Once you invest in an issuance it appears here, and the value updates as the market repriced the milestone."
              action={
                <Link href="/#marketplace">
                  <PrimaryButton>Browse issuances</PrimaryButton>
                </Link>
              }
            />
          ) : (
            <>
              <table className="hidden w-full border-collapse md:table">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    {["Asset", "Class", "Balance", "Value", "NAV", "State"].map((heading) => (
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
                  {filtered.map((holding) => (
                    <tr
                      key={holding.mint}
                      className="border-b border-[var(--border-subtle)] transition-colors duration-200 hover:bg-[var(--bg-elevated)]"
                    >
                      <td className="py-4 pr-6">
                        <Link
                          href={`/app/asset/${encodeURIComponent(holding.ticker)}`}
                          className="font-body text-sm font-semibold text-[var(--text-primary)]"
                        >
                          {holding.ticker}
                        </Link>
                      </td>
                      <td className="py-4 pr-6 font-body text-xs text-[var(--text-secondary)]">
                        {assetClassLabel(holding.assetClass)}
                      </td>
                      <td className="py-4 pr-6 font-mono text-sm tabular-nums text-[var(--text-secondary)]">
                        {holding.balance.toLocaleString("en-GB", { maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 pr-6 font-mono text-sm tabular-nums text-[var(--text-primary)]">
                        {formatCompact(holding.valueUsdc, "$")}
                      </td>
                      <td className="py-4 pr-6 font-mono text-sm tabular-nums text-[var(--text-secondary)]">
                        {holding.valueUsdc > 0
                          ? formatCompact(holding.valueUsdc, "$")
                          : "—"}
                      </td>
                      <td className="py-4 pr-6">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${stateBadgeClasses(holding.state)}`}
                        >
                          {stateLabel(holding.state)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-3 md:hidden">
                {filtered.map((holding) => (
                  <Link
                    key={holding.mint}
                    href={`/app/asset/${encodeURIComponent(holding.ticker)}`}
                    className="block rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-body text-sm font-semibold text-[var(--text-primary)]">
                        {holding.ticker}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${stateBadgeClasses(holding.state)}`}
                      >
                        {stateLabel(holding.state)}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-body text-[11px] text-[var(--text-muted)]">Balance</p>
                        <p className="mt-0.5 font-mono text-sm tabular-nums text-[var(--text-primary)]">
                          {holding.balance.toLocaleString("en-GB", { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="font-body text-[11px] text-[var(--text-muted)]">Value</p>
                        <p className="mt-0.5 font-mono text-sm tabular-nums text-[var(--text-primary)]">
                          {formatCompact(holding.valueUsdc, "$")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="issue-heading" className="mt-16 border-t border-[var(--border-subtle)] pt-10">
        <h2 id="issue-heading" className="font-display text-xl font-bold text-[var(--text-primary)]">
          Issue a real-world asset
        </h2>
        <p className="mt-3 max-w-[62ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
          Value an asset against comparables, load a jurisdiction policy, configure the
          curve, and set the milestones a market will adjudicate before any capital
          releases.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <GateLink href="/app/issue">
            <PrimaryButton>Start an issuance</PrimaryButton>
          </GateLink>
        </div>
      </section>
    </main>
  );
}
