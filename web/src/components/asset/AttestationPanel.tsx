'use client';

/**
 * The proof-of-NAV panel.
 *
 * A NAV figure is only worth something if someone signed it and you can see who and
 * when. The freshness indicator is load-bearing rather than decorative: a lapsed
 * attestation disables the invest action, so the dot and the button state have to
 * agree.
 */

import { useEffect, useState } from "react";
import {
  attestationFreshness,
  formatCompact,
  formatDate,
  formatDateTime,
  freshnessColour,
  truncateAddress,
  type AttestationFreshness,
} from "@/lib/format";
import type { LiveIssuance } from "@/lib/types";
import { CheckCircleIcon, CopyIcon, SignatureIcon } from "@/components/ui";

const FRESHNESS_LABEL: Record<AttestationFreshness, string> = {
  fresh: "Fresh",
  stale: "Stale",
  lapsed: "Lapsed",
};

const FRESHNESS_DETAIL: Record<AttestationFreshness, string> = {
  fresh: "Attested within thirty days.",
  stale: "Over thirty days since attestation, so a refresh is due.",
  lapsed: "Over sixty days since attestation, and investing is disabled until it is refreshed.",
};

export function AttestationPanel({ issuance }: { issuance: LiveIssuance }) {
  // Computed once per render rather than in an effect, because the freshness of a
  // timestamp is a pure function of now and the attestation time.
  const freshness = attestationFreshness(issuance.attestedAt);
  const cadence = 30 * 86_400;

  return (
    <div className="rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 md:p-8">
      <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">
        Proof of NAV
      </h3>
      <p className="mt-2 max-w-[54ch] font-body text-sm text-[var(--text-secondary)]">
        Independent attestation of the underlying asset value. Sluice does not attest its
        own issuances.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-3">
        <Metric label="Latest attested NAV" value={formatCompact(issuance.nav)} />
        <Metric label="Attested at" value={formatDateTime(issuance.attestedAt)} />
        <Metric
          label="Next attestation due"
          value={formatDate(issuance.attestedAt + cadence)}
        />
      </dl>

      <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-body text-sm font-semibold text-[var(--text-primary)]">
              {issuance.attestor}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
              Named attestor, registered to this jurisdiction
            </p>
          </div>
          <SignatureField value={issuance.attestor} />
        </div>
      </div>

      <div className="mt-6 flex items-start gap-2 border-t border-[var(--border-subtle)] pt-6">
        <span
          aria-hidden="true"
          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: freshnessColour(freshness) }}
        />
        <div>
          <p
            className="font-mono text-[11px] uppercase tracking-[0.15em]"
            style={{ color: freshnessColour(freshness) }}
          >
            {FRESHNESS_LABEL[freshness]}
          </p>
          <p className="mt-1 max-w-[52ch] font-body text-xs text-[var(--text-muted)]">
            {FRESHNESS_DETAIL[freshness]}
          </p>
        </div>
      </div>

      {issuance.isDemo ? (
        <p className="mt-6 border-t border-[var(--border-subtle)] pt-6 font-mono text-[11px] text-[var(--text-muted)]">
          Seeded demonstration record. No attestor has signed this figure.
        </p>
      ) : null}
    </div>
  );
}

/** One label and value pair. */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-sm tabular-nums text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}

/** The signature, truncated, with a copy action. */
function SignatureField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1_800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="flex items-center gap-2">
      <SignatureIcon label="" className="h-4 w-4 text-[var(--text-muted)]" />
      <span className="font-mono text-xs text-[var(--text-secondary)]">
        {truncateAddress(value, 8, 8)}
      </span>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard
            .writeText(value)
            .then(() => setCopied(true))
            .catch(() => undefined);
        }}
        aria-label={copied ? "Signature copied" : "Copy signature"}
        className="flex h-8 w-8 items-center justify-center rounded-[--radius-sm] text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text-primary)]"
      >
        {copied ? (
          <CheckCircleIcon label="Copied" className="h-4 w-4 text-[var(--success)]" />
        ) : (
          <CopyIcon label="Copy signature" className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
