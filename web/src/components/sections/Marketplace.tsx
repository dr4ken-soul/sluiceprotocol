'use client';

/**
 * Section 4: Live Marketplace.
 *
 * A dense terminal table on desktop, cards below `md`. No eyebrow: §6 is explicit
 * that section 3 holds the eyebrow and this sits inside the two-section gap.
 *
 * The table is the product's proof surface, so its states are all distinct:
 * shimmer rows while loading, a table when populated, and an empty state with a
 * primary action when nothing qualifies and demo mode is off.
 */

import Link from "next/link";
import { useMarketplace } from "@/hooks/useLiveData";
import { EmptyState, ErrorState, LiveDot, PrimaryButton, Skeleton } from "@/components/ui";
import { IssuanceCardRow, IssuanceRow } from "./IssuanceCard";

export function Marketplace() {
  const { data, isLoading, isError, error, refetch } = useMarketplace();

  const issuances = data?.issuances ?? [];

  return (
    <section
      id="marketplace"
      data-section-name="Marketplace"
      className="bg-[var(--bg-secondary)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h2 className="font-display text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-3xl">
            Live issuances
          </h2>
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            <LiveDot />
            {data?.health.connected === true
              ? `Streaming from Solana over ${data.health.transport}`
              : "Connecting to the indexer"}
          </span>
        </div>

        {isError ? (
          <ErrorState
            title="The live feed did not load"
            detail={
              error?.message ??
              "Sluice has no data to show, and it will not substitute a plausible figure. Retry once the indexer is reachable."
            }
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <Skeleton rows={5} className="space-y-3" />
        ) : issuances.length === 0 ? (
          <EmptyState
            message="No open issuances yet. The first one appears here the moment it is funded."
            action={
              <Link href="/app/issue">
                <PrimaryButton>Issue an asset</PrimaryButton>
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop table. Hidden below md, where the card list takes over. */}
            <table className="hidden w-full border-collapse md:table">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {["Issuer", "NAV", "Raised", "Milestone", "Settles in", "State"].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="py-3 pr-6 text-left font-mono text-[11px] font-normal uppercase tracking-[0.15em] text-[var(--text-muted)]"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {issuances.map((issuance) => (
                  <IssuanceRow key={issuance.address} issuance={issuance} />
                ))}
              </tbody>
            </table>

            {/* Card list below md. */}
            <div className="md:hidden">
              {issuances.map((issuance) => (
                <IssuanceCardRow key={issuance.address} issuance={issuance} />
              ))}
            </div>
          </>
        )}

        {/*
          The transport note is rendered only when the stream has degraded. It is
          absent on the happy path, because a note nobody needs is noise, and present
          the moment it matters, because a silently degraded terminal is the failure
          mode this whole design is arranged against.
        */}
        {data !== undefined && data.health.connected === false && data.health.note !== "" ? (
          <p className="mt-6 border-l-2 border-[var(--warning)]/40 pl-4 font-mono text-[11px] leading-relaxed text-[var(--text-muted)]">
            {data.health.note}
          </p>
        ) : null}
      </div>
    </section>
  );
}
