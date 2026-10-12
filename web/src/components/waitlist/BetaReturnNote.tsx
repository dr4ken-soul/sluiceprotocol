"use client";

/**
 * The panel below the waitlist form, which differs depending on how the visitor
 * arrived.
 *
 * It is its own client component rather than part of `page.tsx` because it reads
 * `useSearchParams`, and a Server Component cannot. The split also means the branch
 * reads as a decision here, in one place, instead of as two similar blocks of copy in
 * the page that have to be kept in sync by eye.
 *
 * The reason the branch exists: `ProtectedRoute` sends a connected wallet with no
 * invitation to `/waitlist?from=beta`. The old page then offered them a link to the
 * terminal, which sent them straight back here. A loop, and an insulting one,
 * because they had already tried.
 */

import { useSearchParams } from "next/navigation";

export function BetaReturnNote() {
  const cameFromTheGate = useSearchParams().get("from") === "beta";

  if (cameFromTheGate) {
    return (
      <div className="mt-14 rounded-[--radius-lg] border border-[var(--accent)] bg-[var(--accent-glow)] p-6">
        <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
          Your wallet is connected, and that is not the same as being in
        </h2>
        <p className="mt-2 font-body text-xs leading-relaxed text-[var(--text-secondary)]">
          The beta is invite-only, so connecting a wallet does not open the terminal on
          its own. You need a code from us. If you asked to join the waitlist below,
          yours arrives by email when your place comes up, and it looks like a link to{" "}
          <span className="font-mono text-[var(--text-primary)]">
            sluice-beryl.vercel.app/invite/…
          </span>
        </p>
        <p className="mt-4 font-body text-xs leading-relaxed text-[var(--text-muted)]">
          Do not have a code and were expecting one? Put your address in the field below
          and say so in the intent field. That is faster than emailing.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-14 rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
      <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
        Already have an invite?
      </h2>
      <p className="mt-2 font-body text-xs leading-relaxed text-[var(--text-secondary)]">
        If you were sent a code, the link it arrived in opens the terminal. Codes are
        ten characters, never contain the letters I, L, O or U, and last fourteen days.
      </p>
      <p className="mt-4 font-mono text-[11px] leading-relaxed text-[var(--text-muted)]">
        /invite/XXXXXXXXXX
      </p>
    </div>
  );
}
