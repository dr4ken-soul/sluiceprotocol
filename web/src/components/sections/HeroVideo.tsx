'use client';

/**
 * The hero's ambient loop.
 *
 * `FRONTEND_SPEC.md` §1.6, Gate 3 option 1b. **The one rule that must not be
 * broken: the video owns its own timeline.** It autoplays and loops continuously,
 * and scroll position never touches `video.currentTime`. Scroll drives four
 * properties only: scale, opacity, y and filter blur.
 *
 * Writing `video.currentTime = anything` would build a scroll-scrubbed video, which
 * is a different technique and not this project. `grep -rn "currentTime" web/src`
 * must return nothing, and `BUILD_GUIDE.md` step 3.6 makes that an explicit check.
 */

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/** Props for the hero loop. */
interface HeroVideoProps {
  /**
   * Caps the layer's opacity and disables the scroll transforms.
   *
   * The final CTA mounts this same component a second time at low opacity, and
   * §10 says to reuse it rather than reimplement it.
   */
  subdued?: boolean;
}

export function HeroVideo({ subdued = false }: HeroVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [posterOnly, setPosterOnly] = useState(false);

  // Fallback 2 from §1.6: a connection slower than 4g gets the poster and never
  // mounts the video, because an ambient loop on a metered connection is a cost the
  // visitor did not ask for.
  useEffect(() => {
    if (reduced) {
      setPosterOnly(true);
      return;
    }
    const connection = (
      navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean };
      }
    ).connection;

    if (connection === undefined) return;
    const type = connection.effectiveType ?? "";
    if (connection.saveData === true || (type !== "" && /^(slow-)?[23]g$/.test(type))) {
      setPosterOnly(true);
    }
  }, [reduced]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const opacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.7, 0.3]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const blurValue = useTransform(scrollYProgress, [0, 0.5, 1], [0, 0, 4]);
  const filter = useTransform(blurValue, (value) => `blur(${value}px)`);

  // Fallback 1: reduced motion renders the poster as a static image and the video
  // element is never mounted at all.
  if (posterOnly) {
    return (
      <div
        ref={containerRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 overflow-hidden bg-[var(--bg-primary)]"
        style={{ opacity: subdued ? 0.18 : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-video.webp"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 z-0 overflow-hidden bg-[var(--bg-primary)]"
    >
      <motion.video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/hero-video.webp"
        // The scroll transforms are suppressed on the subdued mount, which is what
        // §10 asks for, and the whole layer is capped at low opacity there.
        style={
          subdued
            ? { opacity: 0.18 }
            : { scale, opacity, y, filter }
        }
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setPosterOnly(true)}
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </motion.video>
    </div>
  );
}
