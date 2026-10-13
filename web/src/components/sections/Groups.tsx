"use client";

/**
 * Section 3: Groups.
 *
 * `FRONTEND_SPEC.md` §4A. Layout family `app-preview`, split feature and detail,
 * with the visual above the text below `lg` because the shape is the hook.
 *
 * **Why this section carries no numbers.** §4A's mockup describes a cycle ring with
 * "Cycle 3 of 20" and "3 of 20 contributed this cycle" in it, and §4A's own copy
 * rules two hundred lines later say the opposite: "never with invented numbers. No
 * example member counts, contribution amounts or pot totals unless they are the
 * protocol's own defaults." `BUILD_GUIDE.md` and `APP_BLUEPRINT.md` both say the
 * same thing a third time, and `TEAM_OPS.md` §1.2 makes invented figures a
 * documentation-level violation rather than a style question.
 *
 * So the ring is drawn, because the shape is the argument, and it carries no
 * pot amount, no member count and no cycle index. It is labelled as a diagram
 * rather than presented as a reading. Three rules outvote one mockup, and the
 * mockup is the one that is wrong: a savings circle with twenty members and a
 * $1,000 pot is a fabricated customer on the front page of a submission.
 *
 * The section states what Groups is and what it is not, and links to the product
 * reference. It does not pretend the product exists.
 */

import { motion } from "motion/react";
import { useCircles } from "@/hooks/useLiveData";
import { CircleRing } from "@/components/sections/CircleRing";

/** One of the three rows. Icon paths are inline SVG; no icon package is installed. */
interface Row {
  readonly path: string;
  readonly title: string;
  readonly copy: string;
}

/**
 * The three rows, copy quoted from §4A.
 *
 * The second row states the graduated bond. The multipliers are the protocol's own
 * defaults from `APP_BLUEPRINT.md` §bond sizing, so they are facts about the design
 * rather than invented figures, which is what §4A's copy rule permits.
 */
const ROWS: readonly Row[] = [
  {
    path: "M12 3 4 6v5c0 4.5 3.4 8.6 8 9.8 4.6-1.2 8-5.3 8-9.8V6l-8-3Z",
    title: "A bond instead of shame",
    copy: "Everyone locks a deposit: miss a contribution and part of it is slashed to cover the group, so the circle continues instead of collapsing.",
  },
  {
    path: "M4 18h16M4 18V9m5 9V9m6 9V9m5 9V9M3 6h18",
    title: "The bond falls as you build history",
    copy: "Three times a contribution with no history, halving to half a contribution after five completed circles: a credit file, earned rather than issued.",
  },
  {
    path: "M12 3 7 6v6c0 3.3 2.1 6.3 5 7 2.9-.7 5-3.7 5-7V6l-5-3ZM9.5 12l1.8 1.8 3.4-3.6",
    title: "The pot is held by a program, not a person",
    copy: "No organiser collects anything. Nobody can run off with it.",
  },
] as const;


export function Groups() {
  /*
   * Live circles, read through the same hook and the same degradation as every other
   * figure on the page. Groups is Phase 1 so this is empty today; when the `circle`
   * program ships the section fills in with no change to this file's logic.
   */
  const { data: circles } = useCircles();
  const featured = circles?.[0];

  return (
    <section
      data-section-name="Groups"
      className="relative overflow-hidden bg-[var(--bg-primary)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div>
          {/* The first of exactly two eyebrows on the page. See §4A. */}
          <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent-text)]">
            The circle
          </p>

          <motion.h2
            className="max-w-[20ch] font-display text-3xl font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            The circle, rebuilt so it works between strangers
          </motion.h2>

          <motion.p
            className="mt-5 max-w-[54ch] font-body text-base leading-relaxed text-[var(--text-secondary)]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            Twenty people. One fixed contribution. One person takes the pot each cycle,
            in rotation. Same shape it has always had. What changes is what holds it
            together.
          </motion.p>

          <div className="mt-10 space-y-6">
            {ROWS.map((row, index) => (
              <motion.div
                key={row.title}
                className="flex gap-4"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--bg-elevated)]">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--accent-text)]"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d={row.path} />
                  </svg>
                </span>
                <div>
                  <h3 className="font-body text-sm font-semibold text-[var(--text-primary)]">
                    {row.title}
                  </h3>
                  <p className="mt-1 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
                    {row.copy}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/*
            The Phase 1 statement, quoted from §4A. This is what makes the section
            honest rather than promotional: it says on the page that the product does
            not exist yet, in the section that would otherwise be hiding it.
          */}
          <motion.p
            className="mt-8 border-t border-[var(--border-subtle)] pt-5 font-body text-[11px] leading-relaxed text-[var(--text-muted)]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            Groups is Phase 1. Contributions settle in USDC, never a volatile asset.
          </motion.p>
        </div>

        {/*
          The cycle ring. Drawn as a diagram and labelled as one, with no figures in
          it. The nodes fill in sequence on enter at 60ms, once, and the ring itself
          never rotates, per §4A.
        */}
        <motion.figure
          className="order-first m-0 lg:order-last"
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="overflow-hidden rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <div className="flex items-center justify-center p-8">
              {/*
                Live circles render their real figures here. There are none yet
                because Groups is Phase 1, so the ring draws the shape alone rather
                than a fixture, and the caption says which is which.
              */}
              <CircleRing circle={featured} size={264} />
            </div>

            {featured ? (
              <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                <p className="font-mono text-sm text-[var(--text-primary)]">
                  {featured.contributedThisCycle} of {featured.memberCount} contributed
                  this cycle
                </p>
                <div className="mt-3 h-[1.5px] w-full bg-[var(--bg-elevated)]">
                  <div
                    className="h-full bg-[var(--accent)]"
                    style={{
                      width: `${(featured.contributedThisCycle / Math.max(1, featured.memberCount)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <figcaption className="border-t border-[var(--border-subtle)] px-5 py-4">
                <p className="font-body text-[11px] leading-relaxed text-[var(--text-muted)]">
                  Diagram. A live circle would show its cycle, its pot and who has
                  contributed. Those are read from chain, so nothing is drawn here that
                  Sluice cannot prove.
                </p>
              </figcaption>
            )}
          </div>
        </motion.figure>
      </div>
    </section>
  );
}
