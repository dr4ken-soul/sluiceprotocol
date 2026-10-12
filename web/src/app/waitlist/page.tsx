/**
 * `/waitlist`.
 *
 * This page exists because the honest description of Sluice right now is "a devnet
 * beta, opening one surface at a time", and a site that says so has to be able to
 * act on it. Taking names is the smallest real thing that statement implies.
 *
 * The copy is the argument. It does not apologise for the product not being open,
 * because a beta is a normal thing to be and pretending otherwise would mean
 * pretending the programs ship, which they do not yet. `FRONTEND_SPEC.md` §1.3
 * bans unlabelled invented figures; the same rule applied to posture means no
 * urgency, no seat count and no claim that the product is live.
 */

import { WaitlistForm } from "@/components/waitlist/WaitlistForm";

export const metadata = {
  title: "Join the waitlist. Sluice",
  description:
    "Sluice is a devnet beta, opening one surface at a time. Join the waitlist and hear when the next piece opens.",
};

export default function WaitlistPage() {
  return (
    <main id="main" className="min-h-screen bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-[62ch] px-6 py-20 md:px-10 md:py-28">
        {/*
          The symbol, because the page is the product's front door and the mark is
          the one piece of identity that carries across every state it is in.
        */}
        <img
          src="/sluice-symbol.png"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11"
        />

        <p className="mt-10 font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent-text)]">
          Devnet beta
        </p>

        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-[-0.02em] text-[var(--text-primary)] md:text-5xl">
          Sluice is not open yet. Here is what that means and what you get.
        </h1>

        {/*
          The three paragraphs below are the whole pitch for why someone should leave
          their email. Each one states something specific and checkable, because a
          waitlist page that only says "early access, be first" is indistinguishable
          from one selling something it does not have.
        */}
        <div className="mt-8 flex flex-col gap-4 font-body text-[15px] leading-relaxed text-[var(--text-secondary)]">
          <p>
            The programs exist and the money is not real. Issuance runs on Solana
            devnet, the milestones are adjudicated by a live binary market, and every
            figure you see is denominated in devnet tokens that are worth nothing.
            We would rather say that plainly than take a deposit against a promise.
          </p>
          <p>
            It opens one surface at a time, starting with issuance. Groups waits
            because savings circles need mobile money rails first, and building the
            rotation before the payment path would ship the hard part to nobody. You
            will hear about each release before it is announced anywhere else.
          </p>
          <p>
            This is a small beta. People in it will be asked to do real things and
            will be able to break things, and that is the point: the bugs you find
            now are the ones a launch would have.
          </p>
        </div>

        <div className="my-12 h-px w-full bg-[var(--border-subtle)]" />

        <WaitlistForm />

        {/*
          The alternative to the form is stated, not implied.

          Someone with a devnet wallet and no patience for a list should be able to
          just go and use the thing. Hiding that behind the form would be treating
          everyone as if they could not make that choice for themselves.
        */}
        <div className="mt-14 rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
          <h2 className="font-display text-sm font-semibold text-[var(--text-primary)]">
            Already have a devnet wallet?
          </h2>
          <p className="mt-2 font-body text-xs leading-relaxed text-[var(--text-secondary)]">
            You do not need to wait. Everything that has been built so far runs today
            on devnet and the terminal will walk you through it.
          </p>
          <a
            href="/app"
            className="mt-4 inline-block font-mono text-xs text-[var(--accent-text)] underline underline-offset-4 hover:opacity-80"
          >
            Open the terminal
          </a>
        </div>
      </div>
    </main>
  );
}
