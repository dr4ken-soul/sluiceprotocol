/**
 * The footer.
 *
 * Site chrome rather than a content section, so it does not consume one of the eight
 * layout families the page is required to have.
 *
 * The regulatory line is stated here, at the bottom of every page, rather than
 * buried in terms. `APP_BLUEPRINT.md` is explicit that this is a product for
 * registered offerings and licensed operators, not a registered exchange, and that
 * the reader should not have to go looking for that.
 */

import Link from "next/link";
import { PROGRAMS_DEPLOYED } from "@/lib/env";

const LINKS = [
  { href: "/app", label: "Terminal" },
  { href: "/app/issue", label: "Issue" },
  { href: "https://github.com/dr4ken-soul/sluiceprotocol", label: "Github", external: true },
  { href: "/#adjudication", label: "Adjudication" },
  { href: "/#compliance", label: "Compliance" },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-6 py-14 md:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg font-bold text-[var(--text-primary)]">Sluice</p>
          <p className="mt-3 max-w-[42ch] font-body text-xs text-[var(--text-muted)]">
            Built for Colosseum Crypto World's Fair. Issuance on Meteora DBC, liquidity on
            DAMM v2 and DLMM.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {LINKS.map((link) => (
              <li key={link.href}>
                {link.external === true ? (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--accent-text)]"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--accent-text)]"
                  >
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-10 max-w-7xl border-t border-[var(--border-subtle)] pt-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row">
          <p className="font-mono text-[11px] text-[var(--text-muted)]">2026 Sluice</p>
          <p className="font-mono text-[11px] text-[var(--text-muted)]">
            {PROGRAMS_DEPLOYED
              ? "Deployed on Solana mainnet"
              : "Programmes pending deployment, figures not yet live"}
          </p>
        </div>

        <p className="mt-6 max-w-[80ch] font-body text-[11px] leading-relaxed text-[var(--text-muted)]">
          Sluice is compliance infrastructure for registered offerings and licensed
          operators. It is not a registered exchange and it does not provide legal
          advice. Embedded wallets split your key between you and the wallet provider.
          Funds at rest sit in program-owned accounts, the settlement account, the
          redemption vault and the waterfall vault, never in any wallet, embedded or
          self-custodied.
        </p>

        {/*
          The dependency list, because `APP_BLUEPRINT.md` requires it be published:
          "Users are entitled to know what they are exposed to, and a project that
          hides this is a project that has not thought about it." It states what is
          at risk and, more usefully, what is not.
        */}
        <div className="mt-8 border-t border-[var(--border-subtle)] pt-6">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Dependencies, and what they hold
          </h2>
          <dl className="mt-4 max-w-[80ch]">
            {DEPENDENCIES.map((entry) => (
              <div
                key={entry.name}
                className="flex flex-col gap-1 border-b border-[var(--border-subtle)] py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <dt className="font-mono text-[11px] text-[var(--text-secondary)]">
                  {entry.name}
                </dt>
                <dd className="max-w-[52ch] font-body text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {entry.blast}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 max-w-[80ch] font-body text-[11px] leading-relaxed text-[var(--text-muted)]">
            Sluice's own vaults are separate from its dependencies' pools. Sluice can
            halt new issuance and tranche release, and refuses to accept a resolution
            from a market too thin to trust. It cannot prevent an exploit of a
            dependency, cannot make a third-party market deep, and cannot insure
            deposits. The 8% insurance allocation is a protocol backstop and is not
            insurance coverage for holders.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** Each dependency, what it holds, and what Sluice loses if it is compromised. */
const DEPENDENCIES = [
  {
    name: "Meteora DBC",
    blast:
      "Holds capital in the curve pool during a raise. If compromised, funds in that pool are at risk; tranches already released, and anything in a Sluice vault, are not.",
  },
  {
    name: "Meteora DAMM v2",
    blast:
      "Holds post-graduation liquidity. If compromised, secondary liquidity and trading are affected; tokens in holder wallets, and balances in Sluice vaults, are not.",
  },
  {
    name: "Panta",
    blast:
      "Holds the binary market on each milestone. If compromised, the correctness of a tranche decision is at risk. Sluice's own programs are not, and funds move only on a resolved outcome.",
  },
  {
    name: "Privy",
    blast:
      "Holds issuer authentication. If compromised, that one issuer account is at risk. Protocol funds and every other issuer are not.",
  },
  {
    name: "USDC",
    blast:
      "The settlement currency. A depeg affects the value of USDC held across the protocol and nothing else.",
  },
  {
    name: "Solana",
    blast:
      "Liveness of the whole system. An outage stops transacting until it recovers, and no state is lost.",
  },
] as const;
