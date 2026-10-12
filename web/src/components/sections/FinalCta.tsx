'use client';

/**
 * Section 10: Final CTA.
 *
 * A centred crescendo. The hero loop returns here as a fixed background layer,
 * mounted as a second instance of the same component at low opacity with no scroll
 * transforms, which §10 requires be reused rather than reimplemented.
 *
 * The copy and the button order both changed when the waitlist shipped. This
 * section used to open with "Connect a wallet" as the only action, which is a
 * promise that the product is available, and it is not. It now leads with the
 * waitlist, which is the true state, and keeps the terminal as a secondary link
 * for someone who already has a devnet wallet and does not want to wait. Removing
 * that link entirely would be its own kind of dishonesty: it would claim Sluice is
 * closed to the people already inside it.
 */

import { Reveal } from "@/lib/motion";
import { HeroVideo } from "./HeroVideo";

export function FinalCta() {
  return (
    <section
      data-section-name="Final CTA"
      className="relative flex items-center justify-center overflow-hidden bg-[var(--bg-primary)] py-32 md:py-44"
    >
      <HeroVideo subdued />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
        <Reveal>
          <h2 className="text-balance font-display text-4xl font-extrabold tracking-[-0.03em] leading-[0.95] text-[var(--text-primary)] md:text-5xl lg:text-[3.5rem]">
            Put your first asset on the rail
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-5 max-w-md font-body text-base leading-relaxed text-[var(--text-secondary)]">
            Value an asset, issue against it, and let a market check the work before
            the money moves. It runs on devnet today and opens to everyone one
            surface at a time.
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <a
            href="/waitlist"
            className="mt-9 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-9 py-4 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_0_30px_oklch(0.55_0.18_42_/_0.22)]"
          >
            Join the waitlist
          </a>
        </Reveal>

        <Reveal delay={0.5}>
          <p className="mt-6 font-mono text-[11px] text-[var(--text-muted)]">
            Already in the beta?{" "}
            <a
              href="/app"
              className="text-[var(--accent-text)] underline underline-offset-4 hover:opacity-80"
            >
              Open the terminal
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
