'use client';

/**
 * Asset detail, five tabs.
 *
 * The job is to let a holder act on one asset and verify it is real. Three things
 * have to be true on this screen: the holder can act, they can see what the asset is
 * worth against its NAV, and they can see the milestone being adjudicated right now.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useIssuance } from "@/hooks/useLiveData";
import {
  assetClassLabel,
  attestationFreshness,
  formatCompact,
  formatPercent,
  truncateAddress,
} from "@/lib/format";
import { PROGRAMS, explorerAddress } from "@/lib/env";
import type { LiveIssuance } from "@/lib/types";
import { CopyIcon, DemoTag, ErrorState, LiveDot, Skeleton } from "@/components/ui";
import { AdjudicationTable } from "./AdjudicationTable";
import { AttestationPanel } from "./AttestationPanel";
import { PremiumToNavChart } from "./PremiumToNavChart";
import { RangeSelector } from "@/components/terminal/RangeSelector";
import type { ValueRange } from "@/hooks/useLiveData";

const TABS = ["Overview", "Adjudication", "Attestation", "Integrations", "Contracts"] as const;
type Tab = (typeof TABS)[number];

export function AssetDetail() {
  const params = useParams<{ ticker: string }>();
  const ticker = decodeURIComponent(params.ticker ?? "");
  const { data, isLoading, isError, error, refetch } = useIssuance(ticker);
  const [tab, setTab] = useState<Tab>("Adjudication");
  const [range, setRange] = useState<ValueRange>("1M");

  return (
    <main id="main">
      {isError ? (
        <div className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-10">
          <ErrorState
            title={`No issuance carries the ticker ${ticker}`}
            detail={
              error?.message ??
              "Ticker lookups are case-insensitive against the issuances on chain. Check the spelling, or browse the marketplace."
            }
            onRetry={() => void refetch()}
          />
          <div className="mt-6 text-center">
            <Link href="/app" className="font-mono text-xs text-[var(--accent-text)]">
              Back to the terminal
            </Link>
          </div>
        </div>
      ) : isLoading || data === undefined ? (
        <div className="mx-auto max-w-7xl px-6 pb-24 pt-28 md:px-10 md:pt-32">
          <Skeleton rows={8} className="space-y-3" />
        </div>
      ) : (
        <>
          <ActionBar issuance={data} />
          <HeaderStats issuance={data} />

          <div className="mx-auto max-w-7xl px-6 md:px-10">
            <section aria-label="Price against NAV" className="mt-8">
              <h2 className="font-body text-sm font-semibold text-[var(--text-primary)]">
                Price against NAV
              </h2>
              <PremiumToNavChart issuance={data} range={range} />
              <div className="mt-4">
                <RangeSelector
                  options={["1D", "1W", "1M", "3M", "1Y", "ALL"]}
                  value={range}
                  onChange={setRange}
                />
              </div>
            </section>

            <div
              role="tablist"
              aria-label="Asset detail sections"
              className="mt-10 flex gap-6 overflow-x-auto border-b border-[var(--border-subtle)]"
            >
              {TABS.map((name) => {
                const active = tab === name;
                return (
                  <button
                    key={name}
                    role="tab"
                    type="button"
                    aria-selected={active}
                    onClick={() => setTab(name)}
                    className={`-mb-px whitespace-nowrap border-b-2 px-1 py-3 font-body text-sm font-medium transition-colors duration-200 ${
                      active
                        ? "border-[var(--accent)] text-[var(--text-primary)]"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <div role="tabpanel" className="mt-8 pb-24">
              {tab === "Overview" ? <OverviewTab issuance={data} /> : null}
              {tab === "Adjudication" ? <AdjudicationTable milestones={data.milestones} /> : null}
              {tab === "Attestation" ? <AttestationPanel issuance={data} /> : null}
              {tab === "Integrations" ? <IntegrationsTab /> : null}
              {tab === "Contracts" ? <ContractsTab issuance={data} /> : null}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

/**
 * The sticky action bar.
 *
 * Redeem is disabled unless the asset is actually redeemable, and Invest is
 * disabled once the attestation has lapsed. Both states are load-bearing: enabling
 * an action that cannot complete is worse than disabling one that could.
 */
function ActionBar({ issuance }: { issuance: LiveIssuance }) {
  const redeemable = issuance.state === "redeeming";
  const lapsed = attestationFreshness(issuance.attestedAt) === "lapsed";
  const investing = issuance.state === "funding" || issuance.state === "funded";

  return (
    <div className="sticky top-16 z-[20] border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/85 px-6 py-4 backdrop-blur-xl md:px-10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="font-display text-lg font-bold text-[var(--text-primary)]">
            {issuance.issuerName}
          </p>
          <span className="font-mono text-xs tracking-[0.15em] text-[var(--text-muted)]">
            {issuance.ticker}
          </span>
          {issuance.isDemo ? <DemoTag /> : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!investing || lapsed}
            title={lapsed ? "Attestation lapsed, refresh it before investing" : undefined}
            className="min-h-[40px] rounded-full bg-[var(--accent)] px-5 py-2.5 font-mono text-xs font-medium text-[var(--bg-primary)] transition-colors duration-200 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Invest
          </button>
          <button
            type="button"
            disabled={!redeemable}
            title={redeemable ? undefined : "This asset is not in a redeemable state"}
            className="min-h-[40px] rounded-full border border-[var(--border-default)] px-5 py-2.5 font-mono text-xs text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Redeem
          </button>
          {/*
            Bridge is Phase 3. It renders because the design calls for it, and it says
            plainly that it links out rather than pretending to move anything.
          */}
          <a
            href="https://docs.meteora.ag"
            target="_blank"
            rel="noreferrer noopener"
            className="min-h-[40px] px-1 py-2.5 font-mono text-xs text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--accent-text)]"
          >
            Bridge
          </a>
        </div>
      </div>
    </div>
  );
}

/** The four header stats. */
function HeaderStats({ issuance }: { issuance: LiveIssuance }) {
  // Token price is marked against the attested NAV, because an RWA token's value
  // claim is the underlying asset rather than the curve's last print.
  const price = issuance.nav > 0 ? issuance.nav : 0;
  const yieldFigure =
    issuance.milestones.length > 0 && issuance.nav > 0
      ? (issuance.milestones.reduce((total, m) => total + m.trancheSize, 0) / issuance.nav) * 100
      : 0;

  const stats = [
    { label: "NAV", value: formatCompact(issuance.nav) },
    { label: "Token price", value: formatCompact(price) },
    { label: "Tranches", value: formatPercent(yieldFigure * 100_000, 100_000) },
    { label: "Network", value: "Solana" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 pb-6 pt-8 md:px-10">
      <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
              {stat.label}
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-[var(--text-primary)] md:text-3xl">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Tab 1: the issuer's description and the fact table. */
function OverviewTab({ issuance }: { issuance: LiveIssuance }) {
  const facts: Array<[string, string]> = [
    ["Issuer", issuance.issuerName],
    ["Asset type", assetClassLabel(issuance.assetClass)],
    ["Underlying", assetClassLabel(issuance.assetClass)],
    ["Attestor", issuance.attestor],
    ["Min investment", "Not published"],
    ["Liquidity", issuance.state === "settled" ? "Post-graduation" : "Along the curve"],
    ["Eligibility", issuance.isDemo ? "Demonstration record" : "Registered offering"],
    ["Accepted stablecoins", "USDC"],
    ["Settlement asset", issuance.isDemo ? "Naira, on the rail" : "USDC"],
  ];

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr]">
      <p className="max-w-[62ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        {issuance.issuerName} raises against contracted receivables on the Sluice rail.
        Capital sits behind a gate until a binary market confirms the milestone, and
        resolves no if the verifier does not report, so the issuer cannot reach money
        the market has not released.
      </p>

      <dl>
        {facts.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] py-3 first:border-t"
          >
            <dt className="font-body text-xs text-[var(--text-secondary)]">{label}</dt>
            <dd className="font-mono text-xs text-[var(--text-primary)]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Tab 4: the integrations table. */
function IntegrationsTab() {
  const rows: Array<[string, string, string]> = [
    ["Meteora DBC", "Solana", "Issuance"],
    ["Meteora DAMM v2", "Solana", "Liquidity"],
    ["Meteora DLMM", "Solana", "Liquidity"],
    ["Panta", "Solana", "Adjudication"],
    ["Yellowstone gRPC", "Solana", "Data"],
  ];

  return (
    <table className="w-full max-w-2xl border-collapse">
      <thead>
        <tr className="border-b border-[var(--border-default)]">
          {["Protocol", "Network", "Type"].map((heading) => (
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
        {rows.map(([protocol, network, type]) => (
          <tr key={protocol} className="border-b border-[var(--border-subtle)]">
            <td className="py-4 pr-6 font-body text-sm text-[var(--text-primary)]">
              {protocol}
            </td>
            <td className="py-4 pr-6 font-mono text-sm text-[var(--text-secondary)]">
              {network}
            </td>
            <td className="py-4 pr-6 font-mono text-sm text-[var(--text-secondary)]">
              {type}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Tab 5: the contracts table.
 *
 * The audit row reads "Audit pending, not yet published" until one exists. It never
 * fabricates an audit status, which `CLAUDE.md` lists under the things never to do.
 */
function ContractsTab({ issuance }: { issuance: LiveIssuance }) {
  const rows: Array<[string, string | null]> = [
    ["Mint", issuance.mint],
    ["Settlement account", PROGRAMS.settlement ?? null],
    ["Redemption vault", PROGRAMS.redemption ?? null],
    ["Waterfall vault", PROGRAMS.waterfall ?? null],
    ["Bond vault", PROGRAMS.bond ?? null],
    ["Curve config", PROGRAMS.curve ?? null],
    ["Policy file", PROGRAMS.compliance ?? null],
  ];

  return (
    <div>
      <dl className="max-w-2xl">
        {rows.map(([label, address]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] py-3 first:border-t"
          >
            <dt className="font-body text-xs text-[var(--text-secondary)]">{label}</dt>
            <dd className="flex items-center gap-2">
              {address === null ? (
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  Not deployed
                </span>
              ) : (
                <>
                  <a
                    href={explorerAddress(address)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-xs text-[var(--text-primary)] underline-offset-4 hover:underline"
                  >
                    {truncateAddress(address, 6, 6)}
                  </a>
                  <CopyIcon label={`Copy ${label}`} className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-8 max-w-[62ch] font-body text-xs leading-relaxed text-[var(--text-muted)]">
        Independent audits:{" "}
        <span className="text-[var(--text-secondary)]">
          Audit pending, not yet published
        </span>
        . A CertiK audit credit has been applied for. No audit has been completed, so no
        audit status is claimed here.
      </p>

      {issuance.isDemo ? (
        <p className="mt-4 flex items-center gap-2 font-mono text-[11px] text-[var(--text-muted)]">
          <LiveDot colour="var(--warning)" />
          Seeded demonstration record
        </p>
      ) : null}
    </div>
  );
}
