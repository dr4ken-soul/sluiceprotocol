"use client";

/**
 * Section 5: The Ladder.
 *
 * `FRONTEND_SPEC.md` §5A. `CLAUDE.md` is explicit that this is the most important
 * section on the page: it is the only place the two products are shown as one
 * thing, and therefore the argument for Sluice being one protocol rather than two
 * apps. `APP_BLUEPRINT.md` §4.3 restates the same point, that Groups rebuilds the
 * circle and Issuance applies the idea elsewhere, and they share the track record.
 *
 * The spec forbids cutting it for length and forbids turning it into a feature list:
 * it is a sequence, and the sequence is the point. Four steps, one vertical rule,
 * no cards, no grid, no icons.
 *
 * Every string below is quoted from §5A rather than written here. That is deliberate
 * for this section specifically. The claim it makes, that a completed circle is the
 * evidence that lets someone raise capital, is the load-bearing claim of the whole
 * pitch, and paraphrase is how a claim drifts from what was reviewed.
 */

import { motion } from "motion/react";

/** One step. The copy is fixed by the spec and is not parameterised. */
interface LadderStep {
  /** Marker glyph. A numeral, never an icon and never an emoji, per §5A. */
  readonly marker: string;
  readonly title: string;
  readonly copy: string;
}

/** The four steps, in order. */
const STEPS: readonly LadderStep[] = [
  {
    marker: "1",
    title: "Join a circle",
    copy: "Contribute the same amount as everyone else, every cycle, and your locked bond starts at three times a contribution.",
  },
  {
    marker: "2",
    title: "Complete the rotation",
    copy: "Twenty cycles, one pot each. Miss one and the bond covers it, so the group keeps going without you having to be trusted.",
  },
  {
    marker: "3",
    title: "Your record updates",
    copy: "Four completed circles, zero defaults. That is on chain, under your control, and legible to anyone who asks.",
  },
  {
    marker: "4",
    title: "Raise as a business",
    copy: "The same record is what an issuer carries into a raise: milestones you clear add to it, and milestones you fail are on it too.",
  },
] as const;

export function Ladder() {
  return (
    <section
      data-section-name="TheLadder"
      className="relative overflow-hidden bg-[var(--bg-secondary)] py-24 md:py-32"
    >
      <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-10">
        <motion.div
          className="mb-14 max-w-3xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">
            Finish a circle, earn the right to raise
          </h2>
          <p className="mt-4 max-w-[58ch] font-body text-base leading-relaxed text-[var(--text-secondary)]">
            Every cycle you complete and every milestone an issuer clears writes to the
            same record. It is portable, it is yours, and no bureau issued it.
          </p>
        </motion.div>

        {/*
          The steps and the rule share one stacking context so the rule can sit behind
          every marker without a z-index on each one. `absolute` on the rule and
          `relative` on the steps is what makes "behind, never in front" structural
          rather than a value that can be undone by a later edit.
        */}
        <div className="relative">
          <motion.div
            aria-hidden="true"
            className="absolute left-[15px] top-2 bottom-2 w-px bg-[var(--border-default)]"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            style={{ transformOrigin: "top" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />

          <ol className="m-0 list-none p-0">
            {STEPS.map((step, index) => (
              <motion.li
                key={step.marker}
                className={`relative pl-14 ${index === STEPS.length - 1 ? "pb-0" : "pb-12"}`}
                initial={{ opacity: 0, filter: "blur(6px)", y: 12 }}
                whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)] font-mono text-xs text-[var(--text-secondary)]"
                >
                  {step.marker}
                </span>
                <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                  {step.title}
                </h3>
                <p className="mt-2 max-w-[52ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
                  {step.copy}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>

        <motion.p
          className="mt-12 max-w-[40ch] border-t border-[var(--border-subtle)] pt-6 font-display text-xl font-semibold text-[var(--text-primary)] md:text-2xl"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Savings to capital, on one ladder.
        </motion.p>
      </div>
    </section>
  );
}
