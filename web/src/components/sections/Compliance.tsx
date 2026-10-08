'use client';

/**
 * Section 6: Compliance.
 *
 * A `split-image-text` adapted: the image slot becomes a badge stack, because no
 * photography fits content that is entirely about configuration files. This is the
 * second and last eyebrow on the page.
 *
 * The closing paragraph states the regulatory position plainly rather than burying
 * it. Sluice is compliance infrastructure for registered offerings and licensed
 * operators; it is not a registered exchange and it does not provide legal advice.
 */

import { GlobeIcon, ShieldIcon, SignatureIcon, ClockIcon } from "@/components/ui";

interface Badge {
  icon: typeof ShieldIcon;
  label: string;
  value: string;
}

const BADGES: Badge[] = [
  {
    icon: ShieldIcon,
    label: "Transfer policy",
    value: "Token-2022 hook, revoked automatically on graduation",
  },
  {
    icon: SignatureIcon,
    label: "Attestation",
    value: "NAV attestation signed by a named attestor, timestamped",
  },
  {
    icon: ClockIcon,
    label: "Issuer bond",
    value: "Posted at issuance, slashable on a failed attestation",
  },
  {
    icon: GlobeIcon,
    label: "Jurisdiction",
    value: "Policy file per market, versioned and publicly readable",
  },
];

export function Compliance() {
  return (
    <section
      id="compliance"
      data-section-name="Compliance"
      className="bg-[var(--bg-secondary)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 md:gap-16 lg:grid-cols-2">
        <div
          data-reveal
          style={{ transitionDelay: "0.3s" }}
        >
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent-text)]">
            Compliance
          </p>
          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] leading-tight text-[var(--text-primary)] md:text-4xl lg:text-[2.75rem]">
            Jurisdiction is configuration, not code
          </h2>
          <p className="mt-5 max-w-[52ch] font-body text-base leading-relaxed text-[var(--text-secondary)]">
            Transfer rules live in a policy file, not in the program. A Nigerian SEC
            registered offering and a Reg D 506(c) offering run the same rail with
            different policy. Adding a jurisdiction means shipping a file, not redeploying
            a program.
          </p>
          <p className="mt-4 max-w-[52ch] font-body text-sm leading-relaxed text-[var(--text-muted)]">
            Sluice is compliance infrastructure for registered offerings and licensed
            operators. It does not provide legal advice and it is not a registered
            exchange.
          </p>
        </div>

        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          data-reveal
          style={{ transitionDelay: "0.5s" }}
        >
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.label}
                className="rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
              >
                <Icon label="" className="h-5 w-5 text-[var(--accent-text)]" />
                <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  {badge.label}
                </p>
                <p className="mt-1 font-body text-sm leading-snug text-[var(--text-primary)]">
                  {badge.value}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
