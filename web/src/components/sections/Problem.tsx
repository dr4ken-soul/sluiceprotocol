'use client';

/**
 * Section 2: Problem.
 *
 * A `full-width-statement` typography section. Deliberately no images, no cards and
 * no calls to action: §4 asks for a breath between two dense sections, and every
 * element added here is one that breaks that.
 */

import { BlurReveal } from "@/lib/motion";

export function Problem() {
  return (
    <section
      data-section-name="Problem"
      className="flex items-center bg-[var(--bg-primary)] py-32 md:py-44"
    >
      <div className="w-full px-6 md:px-10">
        <p className="max-w-[20ch] text-balance text-left font-display text-[clamp(2.5rem,8vw,8rem)] font-extrabold leading-[0.95] tracking-tighter text-[var(--text-primary)]">
          <BlurReveal text="Capital should follow proof, not promises." duration={0.6} />
        </p>

        <p className="mt-8 max-w-[52ch] font-mono text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Most real-world assets never reach a market. The ones that do are settled on
          trust alone.
        </p>
      </div>
    </section>
  );
}
