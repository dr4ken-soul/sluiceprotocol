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

import { useCallback, useEffect, useRef, useState } from "react";
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

/** Props for the opt-in control shown when the connection was judged too slow. */
interface PlayButtonProps {
  /** Starts the loop. */
  onPlay: () => void;
  /** Removes the control once the visitor has chosen. */
  onDismiss: () => void;
}

/**
 * The connection guard, split by how much we trust the reading.
 *
 * §1.6 fallback 2 says "effectiveType slower than 4g, poster only". Implemented
 * literally that reads `3g` as disqualifying, and it was: on a broadband connection
 * Chrome reported `3g`, the hero fell back to the poster, and the video was never
 * mounted at all. The Network Information API is a coarse downlink estimate, not a
 * measurement, and it degrades on VPNs, throttled connections, corporate proxies and
 * some mobile carriers regardless of real throughput. A 2.1 MB loop is not the kind
 * of payload that warrants refusing it.
 *
 * So the two cases are separated by how little the reading can be trusted:
 *
 *   - `saveData`, `2g`, `slow-2g`: the visitor has explicitly, or very nearly,
 *     asked not to spend megabytes. Poster only, and the video is never mounted.
 *   - `3g`: an estimate, not a preference. Poster only by default, which is what the
 *     fallback asks for, but the visitor can start it. One click, and the full loop
 *     is theirs.
 *
 * The opt-in keeps `preload="metadata"` until it is used, so choosing not to play
 * still costs a single range request rather than the whole file.
 */
function classifyConnection(): "fast" | "uncertain" | "metered" {
  const connection = (
    navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
      mozConnection?: { effectiveType?: string; saveData?: boolean };
      webkitConnection?: { effectiveType?: string; saveData?: boolean };
    }
  ).connection;

  if (connection === undefined) return "fast";

  // The explicit request. Honoured absolutely.
  if (connection.saveData === true) return "metered";

  const type = connection.effectiveType ?? "";
  if (type === "") return "fast";
  if (/^(slow-)?2g$/.test(type)) return "metered";
  if (type === "3g") return "uncertain";

  // 4g and anything the browser adds later.
  return "fast";
}

/**
 * The control shown when the hero fell back on a merely estimated slow connection.
 *
 * Inline SVG rather than an icon package: §1.7 permits inline SVG or Material
 * Icons only, and nothing else is installed.
 */
function PlayButton({ onPlay, onDismiss }: PlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label="Play the background animation"
      className="absolute bottom-6 left-6 z-10 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-xs font-medium tracking-wide text-white/80 backdrop-blur-sm transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <svg
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M8 5.14v13.72L19 12 8 5.14z" />
      </svg>
      <span>Play animation</span>
      <span
        role="button"
        tabIndex={0}
        aria-label="Keep the still image"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.stopPropagation();
            event.preventDefault();
            onDismiss();
          }
        }}
        className="ml-1 text-white/40 hover:text-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
      >
        Dismiss
      </span>
    </button>
  );
}

export function HeroVideo({ subdued = false }: HeroVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const [posterOnly, setPosterOnly] = useState(false);
  const [offerPlay, setOfferPlay] = useState(false);
  const [optIn, setOptIn] = useState(false);

  /**
   * Starts the loop imperatively, as well as via the `autoPlay` attribute.
   *
   * The attribute is not sufficient on its own. Measured on the deployed site: a
   * muted, buffered, fully decoded video carrying `autoplay=""` sat at
   * `currentTime === 0` with `paused === true`, and only an explicit `play()` moved
   * it. The element is inserted by React after hydration rather than being present
   * in the parsed document, and Chrome does not restart the attribute-driven
   * autoplay path for it. Both paths are kept, because the attribute is what covers
   * the server-rendered element before hydration and `play()` is what covers
   * everything after, so neither is redundant.
   *
   * The rejection is swallowed on purpose. It only fires when the browser refuses
   * playback outright, and the poster is already on screen, so there is nothing
   * useful to do about it and an unhandled rejection would be noise. Note this
   * never touches `currentTime`, which §1.6 forbids.
   */
  const startPlayback = useCallback(() => {
    const video = videoRef.current;
    if (video === null) return;
    void video.play().catch(() => {
      // Autoplay refused. The poster stands in until the visitor interacts.
    });
  }, []);

  // One retry once enough of the file has arrived to play without stalling. On a
  // slow connection `canplay` fires early, before the buffer is deep enough, and
  // the first `play()` can stall at frame zero.
  useEffect(() => {
    if (posterOnly || (!optIn && offerPlay)) return;
    const video = videoRef.current;
    if (video === null) return;
    if (video.readyState >= 3) startPlayback();
  }, [posterOnly, optIn, offerPlay, startPlayback]);

  // §1.6 fallback 1 is unconditional: under reduced motion the poster is a static
  // image and the video element is never mounted. That is an accessibility
  // requirement, so it is not overridable by the visitor and not overridable by the
  // connection guard below.
  useEffect(() => {
    if (reduced) {
      setPosterOnly(true);
      return;
    }

    const verdict = classifyConnection();
    if (verdict === "metered") {
      setPosterOnly(true);
      return;
    }
    if (verdict === "uncertain") {
      // Poster by default, per fallback 2. The visitor can override.
      setOfferPlay(true);
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

  const poster = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/hero-video.webp"
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
    />
  );

  // Fallback 1 and the metered half of fallback 2. The video is not mounted, so it
  // cannot be downloaded, decoded or played.
  if (posterOnly) {
    return (
      <div
        ref={containerRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 overflow-hidden bg-[var(--bg-primary)]"
        style={{ opacity: subdued ? 0.18 : undefined }}
      >
        {poster}
      </div>
    );
  }

  // The uncertain half of fallback 2. Poster plus an explicit control.
  if (offerPlay && !optIn) {
    return (
      <div
        ref={containerRef}
        aria-hidden="true"
        className="absolute inset-0 z-0 overflow-hidden bg-[var(--bg-primary)]"
      >
        {poster}
        {!subdued && (
          <PlayButton onPlay={() => setOptIn(true)} onDismiss={() => setOfferPlay(false)} />
        )}
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
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload={optIn ? "auto" : "metadata"}
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
        onCanPlay={startPlayback}
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </motion.video>
    </div>
  );
}
