'use client';

/**
 * The motion primitives every section shares.
 *
 * `FRONTEND_SPEC.md` §1.4 fixes these values, and the repeatability rule is not
 * negotiable: `once: true` is banned everywhere, zero exceptions, because a
 * one-shot reveal means a visitor who scrolls back up sees a blank section. The
 * default entrance is a blur-in rather than a plain fade-up, which is what gives
 * the site its front-loaded, precise feel.
 */

import { motion, useReducedMotion, type Variants } from "motion/react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The standard entrance for a section.
 *
 * Under `prefers-reduced-motion` the blur and translate are dropped and only a
 * crossfade remains, per §1.4.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduced ? { opacity: 0 } : { filter: "blur(10px)", opacity: 0, y: 20 }}
      whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.1 }}
      transition={{ duration: reduced ? 0.2 : 0.8, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * A word-by-word blur reveal.
 *
 * Used for the two display headlines where the reveal is the effect rather than a
 * decoration: the hero and the problem statement. Each word staggers by `stagger`
 * seconds from `baseDelay`.
 */
export function BlurReveal({
  text,
  className,
  baseDelay = 0.4,
  stagger = 0.09,
  duration = 0.7,
}: {
  text: string;
  className?: string;
  baseDelay?: number;
  stagger?: number;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, index) => (
        // Words are positional, so index is a stable identity here.
        <Fragment key={`${word}-${index}`}>
          <motion.span
            className="inline-block"
            initial={reduced ? { opacity: 0 } : { filter: "blur(10px)", opacity: 0, y: 24 }}
            animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            transition={{
              duration: reduced ? 0.2 : duration,
              ease: "easeOut",
              delay: reduced ? 0 : baseDelay + index * stagger,
            }}
          >
            {word}
          </motion.span>
          {/*
            The gap lives here, as a sibling of the animated spans, and never inside
            one of them. CSS strips trailing whitespace from inside an inline-block,
            so putting it in there renders every word flush against the next and the
            headline reads "Issuethe realasset."
          */}
          {index < words.length - 1 ? " " : ""}
        </Fragment>
      ))}
    </span>
  );
}

/**
 * A figure that counts between values rather than jumping.
 *
 * §1.8 requires every animated figure to transition over 600ms, and to be instant
 * under reduced motion. The interpolation runs on `requestAnimationFrame` and
 * cancels itself on completion, which is an animation rather than the polling the
 * live data contract forbids.
 */
export function CountUp({
  value,
  format,
  durationMs = 600,
  className,
}: {
  value: number;
  /** Renders the value. Called with the interpolated number. */
  format: (value: number) => string;
  durationMs?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const displayed = useNumberTransition(value, durationMs, reduced === true);

  return <span className={className}>{format(displayed)}</span>;
}

/**
 * Interpolates a number toward a target over `durationMs`.
 *
 * @param instant When true the value is adopted immediately, which is what
 * reduced motion requires.
 */
function useNumberTransition(target: number, durationMs: number, instant: boolean): number {
  const [displayed, setDisplayed] = useState(target);
  // The value the current animation started from. Held in a ref so the effect does
  // not need it as a dependency, which would restart the animation every frame.
  const fromRef = useRef(target);
  const frameRef = useRef(0);

  useEffect(() => {
    if (instant) {
      setDisplayed(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    if (from === target) return;

    let start: number | null = null;

    const tick = (timestamp: number): void => {
      start ??= timestamp;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      // An ease-out cubic, matching the character of
      // cubic-bezier(0.16, 1, 0.3, 1) closely enough at display rates.
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (target - from) * eased;
      setDisplayed(progress < 1 ? next : target);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs, instant]);

  return displayed;
}

/** Variants for the mechanism section's stacked card reveal. */
export const stackVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

/** Variants for a tab panel swap. Exit is shorter than enter, per §7. */
export const tabVariants: Variants = {
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -8, filter: "blur(4px)", transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] } },
};
