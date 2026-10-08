'use client';

/**
 * The live issuance card.
 *
 * Rendered in the hero and reused by the terminal. Every figure comes from the
 * indexer's pushed snapshot, and the card carries a visible DEMO tag whenever the
 * snapshot's `isDemo` flag is set. `FRONTEND_SPEC.md` §1.8 is explicit that
 * unlabelled invented figures are a compliance problem in a product handling other
 * people's money, so the tag is never suppressed for aesthetic reasons.
 */

import Link from "next/link";
import type { LiveIssuance } from "@/lib/types";
import { formatCompact, formatDate, formatOdds, formatPercent } from "@/lib/format";
import { DemoTag, PrimaryButton, Skeleton, StateBadge } from "@/components/ui";

interface Props {
  /** The issuance to show. `null` while loading or when the surface is empty. */
  issuance: LiveIssuance | null;
  loading: boolean;
  /** Called by the primary action. Navigates when connected, opens the modal otherwise. */
  onPrimary?: () => void;
}

export function IssuanceCard({ issuance, loading, onPrimary }: Props) {
  if (loading) {
    return (
      <div className="w-full max-w-[420px] rounded-[--radius-xl] border border-[var(--border-default)] bg-[var(--bg-surface)]/70 p-6 backdrop-blur-xl md:p-7">
        <Skeleton rows={5} />
      </div>
    );
  }

  if (issuance === null) {
    return (
      <div className="w-full max-w-[420px] rounded-[--radius-xl] border border-[var(--border-default)] bg-[var(--bg-surface)]/70 p-6 backdrop-blur-xl md:p-7">
        <p className="font-body text-sm text-[var(--text-secondary)]">
          No open issuance to show right now. The first one appears here the moment it is
          funded.
        </p>
        <div className="mt-6">
          <Link
            href="/app/issue"
            className="inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-6 py-3 font-mono text-sm font-medium text-[var(--bg-primary)] transition-colors duration-200 hover:bg-[var(--accent-hover)]"
          >
            Issue an asset
          </Link>
        </div>
      </div>
    );
  }

  const yesCents = issuance.yesCents ?? 0;
  const hasMarket = issuance.yesCents !== null;

  return (
    <div className="w-full max-w-[420px] rounded-[--radius-xl] border border-[var(--border-default)] bg-[var(--bg-surface)]/70 p-6 shadow-[0_20px_60px_-15px_oklch(0.16_0.008_250_/_0.6)] backdrop-blur-xl md:p-7">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-body text-sm font-semibold text-[var(--text-primary)]">
            {issuance.issuerName}
          </p>
          <p className="mt-1 font-mono text-xs tracking-[0.15em] text-[var(--text-muted)]">
            {issuance.ticker}
          </p>
        </div>
        {issuance.isDemo ? <DemoTag /> : null}
      </div>

      <div className="mb-5 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--accent-glow)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--accent-text)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-[var(--accent)]" />
          {issuance.state === "funded" ? "Funded, milestone open" : "Adjudicating"}
        </span>
        <StateBadge state={issuance.state} />
      </div>

      <dl>
        <Row label="NAV" value={formatCompact(issuance.nav)} />
        <Row
          label="Raised"
          value={`${formatPercent(issuance.raised, issuance.target)} of ${formatCompact(issuance.target)}`}
        />
        <Row
          label="Milestone"
          value={hasMarket ? formatOdds(issuance.yesCents, issuance.noCents) : "No market open"}
        />
        <Row
          label="Settles in"
          value={
            issuance.closesAt === null
              ? "Not scheduled"
              : `${Math.max(0, Math.round((issuance.closesAt * 1000 - Date.now()) / 86_400_000))} days`
          }
        />
        <Row label="Attested" value={formatDate(issuance.attestedAt)} last />
      </dl>

      {/*
        The probability bar is decorative. The numeric odds above it are the
        accessible source of truth, so it carries aria-hidden.
      */}
      {hasMarket ? (
        <div
          aria-hidden="true"
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]"
        >
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-600"
            style={{
              width: `${yesCents}%`,
              transitionTimingFunction: "var(--ease-sluice)",
            }}
          />
        </div>
      ) : null}

      <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 font-body text-[11px] leading-relaxed text-[var(--text-muted)]">
        {issuance.isDemo
          ? "Seeded demonstration record. Toggle demo mode off to show only live issuances."
          : "Every figure below is read live from the settlement account."}
      </p>

      <div className="mt-5">
        <Link
          href={`/app/asset/${encodeURIComponent(issuance.ticker)}`}
          className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-[var(--border-default)] px-6 py-2.5 font-mono text-xs text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)]"
        >
          Open the adjudication screen
        </Link>
      </div>

      {onPrimary ? (
        <div className="mt-3">
          <PrimaryButton className="w-full" onClick={onPrimary}>
            Open the terminal
          </PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}

/** One label and value row. */
function Row({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 ${
        last ? "" : "border-b border-[var(--border-subtle)]"
      }`}
    >
      <dt className="font-body text-xs text-[var(--text-secondary)]">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

/**
 * The marketplace table row variant.
 *
 * Shares the badge and label treatment with the hero card but adds the ticker under
 * the issuer name, per §6.
 */
export function IssuanceRow({ issuance }: { issuance: LiveIssuance }) {
  return (
    <Link
      href={`/app/asset/${encodeURIComponent(issuance.ticker)}`}
      className="block transition-colors duration-200 hover:bg-[var(--bg-elevated)]"
    >
      <tr className="border-b border-[var(--border-subtle)]">
        <td className="py-4 pr-6">
          <span className="font-body text-sm font-semibold text-[var(--text-primary)]">
            {issuance.issuerName}
          </span>
          <span className="mt-0.5 block font-mono text-[11px] text-[var(--text-muted)]">
            {issuance.ticker}
            {issuance.isDemo ? (
              <span className="ml-2 uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Demo
              </span>
            ) : null}
          </span>
        </td>
        <td className="py-4 pr-6 font-mono text-sm tabular-nums text-[var(--text-secondary)]">
          {formatCompact(issuance.nav)}
        </td>
        <td className="py-4 pr-6 font-mono text-sm tabular-nums text-[var(--text-secondary)]">
          {formatPercent(issuance.raised, issuance.target)}
        </td>
        <td className="py-4 pr-6 font-mono text-sm tabular-nums">
          <span className="text-[var(--accent-text)]">{issuance.yesCents ?? "—"}¢</span>
          <span aria-hidden="true" className="mx-2 inline-block h-3 w-px bg-[var(--border-default)]" />
          <span className="text-[var(--text-muted)]">{issuance.noCents ?? "—"}¢</span>
        </td>
        <td className="py-4 pr-6 font-mono text-xs text-[var(--text-secondary)]">
          {issuance.closesAt === null
            ? "—"
            : formatDate(issuance.closesAt)}
        </td>
        <td className="py-4 pr-6">
          <StateBadge state={issuance.state} />
        </td>
      </tr>
    </Link>
  );
}

/**
 * The marketplace card variant for below `md`.
 *
 * §6 requires the table to become cards rather than scroll, because a horizontally
 * scrolling table on a phone hides the state column, which is the column that
 * matters.
 */
export function IssuanceCardRow({ issuance }: { issuance: LiveIssuance }) {
  return (
    <Link
      href={`/app/asset/${encodeURIComponent(issuance.ticker)}`}
      className="mb-3 block rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 transition-colors duration-200 hover:border-[var(--accent)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-body text-sm font-semibold text-[var(--text-primary)]">
            {issuance.issuerName}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
            {issuance.ticker}
          </p>
        </div>
        <StateBadge state={issuance.state} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-body text-[11px] text-[var(--text-muted)]">NAV</p>
          <p className="mt-0.5 font-mono text-sm tabular-nums text-[var(--text-primary)]">
            {formatCompact(issuance.nav)}
          </p>
        </div>
        <div>
          <p className="font-body text-[11px] text-[var(--text-muted)]">Raised</p>
          <p className="mt-0.5 font-mono text-sm tabular-nums text-[var(--text-primary)]">
            {formatPercent(issuance.raised, issuance.target)}
          </p>
        </div>
      </div>

      {issuance.yesCents !== null ? (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] text-[var(--text-muted)]">Milestone</span>
            <span className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
              <span className="text-[var(--accent-text)]">{issuance.yesCents}¢</span>
              <span className="mx-1.5 text-[var(--text-muted)]">/</span>
              <span className="text-[var(--text-muted)]">{issuance.noCents}¢</span>
            </span>
          </div>
          <div
            aria-hidden="true"
            className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${issuance.yesCents}%` }}
            />
          </div>
        </div>
      ) : null}

      {issuance.isDemo ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Demo record
        </p>
      ) : null}
    </Link>
  );
}
