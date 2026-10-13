/**
 * `/invite/[code]`.
 *
 * Where an approved person's code lands. It verifies on the server, renders the
 * verdict, and hands off to {@link RedeemPanel} to connect and bind a wallet.
 *
 * Verification is server-side on purpose. A page that checked a code in the browser
 * would ship the list of valid codes to everyone who asked, and the only thing
 * stopping a forged answer would be a devtools panel. The database is the only
 * thing that gets to decide.
 *
 * Each rejection gets its own message rather than a shared "invalid code". Somebody
 * with a code that expired deserves to know it expired: they will ask for a new one
 * and that is a normal thing to do. Somebody with a typo deserves to be told the
 * code was not recognised, because nine of ten times that is what happened and they
 * will otherwise assume the invite was withdrawn.
 */

import type { Metadata } from "next";
import { RedeemPanel } from "@/components/beta/RedeemPanel";
import { verifyInvite } from "@/lib/server/invites";

export const metadata: Metadata = {
  title: "Your Sluice beta invite",
  description: "Connect a wallet to redeem your Sluice beta invite.",
  // An invite is personal. It should not be indexed, and the referral it may carry
  // is not something to hand to a crawler.
  robots: { index: false, follow: false },
};

/** Never cached: a single-use invite must not be served stale to the second person. */
export const dynamic = "force-dynamic";

/** Copy per rejection. Specific, because each one has a different next step. */
const REJECTION_COPY: Record<string, { title: string; body: string }> = {
  unknown: {
    title: "That code is not one of ours.",
    body: "Check it against the message it was sent in. Codes are ten characters and never contain the letters I, L, O or U, which are the ones that get misread.",
  },
  revoked: {
    title: "That code has been withdrawn.",
    body: "It was issued and then cancelled; ask for a fresh one and it will work.",
  },
  expired: {
    title: "That code has expired.",
    body: "Codes last fourteen days so a screenshot cannot be used months later. Ask for a new one.",
  },
  exhausted: {
    title: "That code has already been used.",
    body: "It was single-use and it is spent. If that was you, your wallet is already bound and /app will open. If it was not, ask for a fresh code.",
  },
  tampered: {
    title: "That code is not valid.",
    body: "It has been altered since it was issued, so we are not going to honour it.",
  },
};

/**
 * The copy for a reason, with a guaranteed fallback.
 *
 * `Record<string, ...>` types an absent key as `undefined` under `noUncheckedIndexed
 * Access`, which is correct: the reason strings come from a union in another module
 * and this map is keyed by hand. Falling back to `unknown` means an unmapped reason
 * still renders a sentence rather than a blank page.
 */
function copyFor(reason: string): { title: string; body: string } {
  return REJECTION_COPY[reason] ?? {
    title: "That code is not valid.",
    body: "Ask for a fresh one and it will work.",
  };
}

export default async function InvitePage({
  params,
}: {
  params: { code: string };
}) {
  let verdict: Awaited<ReturnType<typeof verifyInvite>>;

  try {
    verdict = await verifyInvite(params.code);
  } catch (cause) {
    // A database failure must not render as "this code is not one of ours". That
    // would tell somebody their invite does not exist when in fact the project
    // cannot read its own table right now.
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6">
        <div className="mx-auto max-w-[46ch] text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            We cannot check that code right now
          </h1>
          <p className="mt-4 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
            {cause instanceof Error
              ? cause.message
              : "Something went wrong reading the invite list."}{" "}
            Try again in a moment. Your code has not been used.
          </p>
        </div>
      </main>
    );
  }

  if ("reason" in verdict) {
    const copy = copyFor(verdict.reason);
    return (
      <main id="main" className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)] px-6">
        <div className="mx-auto max-w-[46ch] text-center">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            {copy.title}
          </h1>
          <p className="mt-4 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
            {copy.body}
          </p>
          <a
            href="/waitlist"
            className="mt-8 inline-block font-mono text-xs text-[var(--accent-text)] underline underline-offset-4 hover:opacity-80"
          >
            Join the waitlist instead
          </a>
        </div>
      </main>
    );
  }

  return (
    <main id="main" className="min-h-screen bg-[var(--bg-primary)] px-6 py-20 md:px-10 md:py-24">
      <div className="mx-auto max-w-[52ch]">
        <img src="/sluice-symbol.png" alt="" width={44} height={44} className="h-11 w-11" />

        <p className="mt-10 font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent-text)]">
          You are in
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)]">
          Your code works.
        </h1>
        <p className="mt-5 font-body text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Bind it to a wallet and the terminal opens. Devnet only, so nothing here can
          cost you money and no token you see is worth anything. You will be the first
          to know when the next surface opens.
        </p>

        <RedeemPanel
          code={verdict.code}
          email={verdict.email}
          remainingUses={verdict.remainingUses}
        />
      </div>
    </main>
  );
}
