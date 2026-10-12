'use client';

/**
 * The Groups "coming next" state.
 *
 * `FRONTEND_SPEC.md` §14A.4 specifies this exactly, and the rules it lists are the
 * whole point of the component existing:
 *
 *   - No mockup. Not one rendered circle, not one example member
 *   - No fake numbers. Not a pot total, not a contribution amount
 *   - The nav item stays present and clickable. It must never 404
 *   - The state disappears automatically once Groups is live, not on a flag someone
 *     has to remember to flip
 *
 * The last rule is why this takes its state from the indexer rather than from a
 * constant. A `NEXT_PUBLIC_GROUPS_ENABLED` flag would satisfy the first three rules
 * and silently break the fourth: it would still be off after Groups shipped. Reading
 * it from `/api/circles` means the route starts rendering circles the moment the
 * programs exist, with no deploy to remember.
 */

import { motion } from "motion/react";
import { useCircles } from "@/hooks/useLiveData";
import { CircleRing } from "@/components/sections/CircleRing";

/** Props for {@link ComingNext}. */
interface ComingNextProps {
  /** What the user was trying to do, so the copy is not generic. */
  readonly intent: string;
}

/**
 * Renders the real circle list when there are circles, and the coming-next state
 * when there are none.
 *
 * Both branches live here so a route cannot accidentally render one when it should
 * render the other, and so the "disappears automatically" rule holds by
 * construction rather than by remembering to delete something.
 */
export function ComingNext({ intent }: ComingNextProps) {
  const { data, isLoading, error } = useCircles();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[46ch] text-center">
        <p className="font-mono text-xs text-[var(--text-muted)]">Reading from chain</p>
      </div>
    );
  }

  /*
   * A read failure is not a coming-next state and must not be dressed as one. It
   * says so, because a visitor who cannot tell "not built yet" from "the indexer is
   * down" will conclude the former and be wrong about why.
   */
  if (error !== null && error !== undefined) {
    return (
      <div className="mx-auto max-w-[46ch] text-center">
        <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Cannot read circles right now
        </h2>
        <p className="mt-4 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
          {error.message}
        </p>
      </div>
    );
  }

  const circles = data ?? [];

  // Live, once the programs exist. No flag involved.
  if (circles.length > 0) {
    return (
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          Your circles
        </h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {circles.map((circle) => (
            <li
              key={circle.address}
              className="rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-base font-semibold text-[var(--text-primary)]">
                    {circle.name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                    Cycle {circle.cycleIndex} of {circle.cyclesTotal}
                  </p>
                </div>
                <CircleRing circle={circle} size={48} animate={false} />
              </div>
              <div className="mt-4 h-[1.5px] w-full bg-[var(--bg-elevated)]">
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{
                    width: `${(circle.contributedThisCycle / Math.max(1, circle.memberCount)) * 100}%`,
                  }}
                />
              </div>
              <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">
                {circle.contributedThisCycle} of {circle.memberCount} contributed
              </p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-[46ch] text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      {/*
        The ring is here because the shape is the product and a wall of text does
        not convey it. It is the same component the landing section and the circle
        cards use, drawn with no figures because there are none to draw.
      */}
      <div className="mb-8 flex justify-center opacity-70">
        <CircleRing size={148} animate={false} />
      </div>

      <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">
        Groups ships next
      </h2>
      <p className="mt-4 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        Savings circles, rebuilt so they work between strangers. It needs mobile money
        rails first, because the people this is for are not buying SOL to pay gas.
      </p>
      <p className="mt-4 font-mono text-[11px] text-[var(--text-muted)]">{intent}</p>
      <p className="mt-6 font-body text-xs leading-relaxed text-[var(--text-muted)]">
        Read the{" "}
        <a
          href="https://github.com/dr4ken-soul/sluiceprotocol"
          target="_blank"
          rel="noreferrer noopener"
          className="text-[var(--accent-text)] underline underline-offset-4 hover:opacity-80"
        >
          specification
        </a>{" "}
        in the repository. Nothing on this screen is a mockup, because a circle with a
        pot and members would be invented, and invented is worse than absent.
      </p>
    </motion.div>
  );
}
