'use client';

/**
 * Section 3: Mechanism.
 *
 * A `stacked-card-reveal` of five stages. Each card is `sticky top-0`, so as one
 * settles the next slides up over it while the earlier cards scale down. The z-index
 * rises with the card order, which is what produces the stack.
 *
 * This is the first of only two sections on the page carrying an eyebrow. §15 caps
 * the total at two and requires a gap of at least two sections between them.
 */

import { motion, useReducedMotion } from "motion/react";

interface Stage {
  number: string;
  title: string;
  body: string;
}

const STAGES: Stage[] = [
  {
    number: "01",
    title: "Value",
    body:
      "The issuer's financials are valued against comparables, producing a NAV band. The band sets the shape of a sixteen segment bonding curve, so the opening price is anchored to something real rather than to a vibe.",
  },
  {
    number: "02",
    title: "Comply",
    body:
      "A Token-2022 transfer hook enforces the jurisdiction's policy, covering who may hold, what may be transferred and for how long, and the issuer posts a bond. On graduation the hook is revoked automatically and the market opens.",
  },
  {
    number: "03",
    title: "Raise",
    body:
      "Capital comes in along the curve in USDC or a tokenised stock. Partial fills, a market cap fee scheduler and a partner fee split are all configured on the same pool.",
  },
  {
    number: "04",
    title: "Adjudicate",
    body:
      "A binary market opens on a single machine-checkable question about the milestone, and anyone may trade it. The price is the protocol's only source of truth about whether the milestone happened.",
  },
  {
    number: "05",
    title: "Settle",
    body:
      "If the market resolves yes, tranched capital releases to the issuer on schedule. If it resolves no, remaining capital routes to a redemption vault and holders claim pro rata.",
  },
];

export function Mechanism() {
  const reduced = useReducedMotion();

  return (
    <section id="mechanism" data-section-name="Mechanism" className="relative bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-3xl px-6 pb-14 pt-28 text-left md:px-10">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent-text)]">
          The flow
        </p>
        <h2 className="font-display text-3xl font-bold tracking-[-0.02em] leading-tight text-[var(--text-primary)] md:text-4xl lg:text-5xl">
          Five stages from asset to settlement
        </h2>
        <p className="mt-4 max-w-[62ch] font-body text-base leading-relaxed text-[var(--text-secondary)]">
          Each stage writes to a program on Solana. Nothing in the chain depends on the
          issuer keeping a promise.
        </p>
      </div>

      {STAGES.map((stage, index) => (
        <div
          key={stage.number}
          className="sticky top-0 z-0 flex min-h-screen items-center justify-center px-6 py-16 md:px-10"
          // The z-index rises with the card order, which is what makes the stack
          // read as depth rather than as five separate panels.
          style={{ zIndex: index * 10 + 10 }}
        >
          <motion.article
            className="w-full max-w-3xl rounded-[--radius-xl] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 shadow-[0_24px_64px_-20px_oklch(0.16_0.008_250_/_0.7)] md:p-12"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.1 }}
            transition={{ duration: reduced ? 0.2 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="mb-4 font-mono text-xs tracking-[0.2em] text-[var(--text-muted)]">
              {stage.number}
            </p>
            <h3 className="font-display text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-3xl">
              {stage.title}
            </h3>
            <p className="mt-4 max-w-[55ch] font-body text-base leading-relaxed text-[var(--text-secondary)]">
              {stage.body}
            </p>
          </motion.article>
        </div>
      ))}
    </section>
  );
}
