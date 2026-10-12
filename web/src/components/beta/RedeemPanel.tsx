"use client";

/**
 * The redeem half of `/invite/[code]`.
 *
 * The server already verified the code and passed its verdict down as props, so
 * nothing here decides whether a code is valid. This component's only jobs are to
 * show the verdict in words a person can act on, to let them connect a wallet, and
 * to bind that wallet to the code.
 *
 * The order matters and is the whole flow: connect first, redeem second. Redeeming
 * before connecting would bind nothing, and a single-use invite would be spent on
 * an empty attempt.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/layout/useSession";
import { ConnectButton } from "@/components/layout/ConnectModal";
import { motion } from "motion/react";

/** Props, carrying the server's verdict rather than re-deriving it in the browser. */
interface RedeemPanelProps {
  /** The code as typed in the URL. Never re-derived; the server used this one. */
  readonly code: string;
  /** The email it is bound to, or null for an open invite. */
  readonly email: string | null;
  /** Remaining redemptions, so an open invite's cap is visible rather than implied. */
  readonly remainingUses: number;
}

export function RedeemPanel({ code, email, remainingUses }: RedeemPanelProps) {
  const router = useRouter();
  const session = useSession();
  const [phase, setPhase] = useState<"idle" | "redeeming" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function redeem(): Promise<void> {
    if (phase === "redeeming" || session.address === null) return;
    setPhase("redeeming");
    setError(null);
    try {
      const response = await fetch("/api/beta/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, address: session.address }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: { message?: string } };
        setError(data.error?.message ?? "That code could not be redeemed.");
        setPhase("idle");
        return;
      }
      setPhase("done");
      // Straight into the app, because the whole reason to redeem is to get there.
      router.push("/app");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setPhase("idle");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mt-10 flex flex-col gap-6"
    >
      {/*
        What this code is, before asking for anything.

        Telling somebody their code works, and who it is bound to, is what makes the
        next screen feel like a step rather than a wall.
      */}
      <div className="rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {email === null ? "Open invite" : "Your invite"}
        </p>
        <p className="mt-2 font-mono text-sm tracking-[0.14em] text-[var(--text-primary)]">
          {code}
        </p>
        <p className="mt-3 font-body text-xs leading-relaxed text-[var(--text-secondary)]">
          {email === null
            ? `This one can be used ${remainingUses === 1 ? "once" : `${remainingUses} more time${remainingUses === 1 ? "" : "s"}`}. It was not tied to an email, so whoever you gave it to can use it.`
            : `Tied to ${email}. It will not work for any other address, which is what stops it being forwarded.`}
        </p>
      </div>

      {session.authenticated && session.address !== null ? (
        <div className="flex flex-col gap-4">
          <p className="font-body text-sm leading-relaxed text-[var(--text-secondary)]">
            Connected as{" "}
            <span className="font-mono text-xs text-[var(--text-primary)]">
              {session.address.slice(0, 4)}…{session.address.slice(-4)}
            </span>
            . Redeeming binds this code to that wallet, permanently. Use the wallet you
            want to be in the beta with.
          </p>
          <button
            type="button"
            onClick={redeem}
            disabled={phase === "redeeming"}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-8 py-3.5 font-mono text-sm text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {phase === "redeeming" ? "Binding your wallet" : "Enter the beta"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-body text-sm leading-relaxed text-[var(--text-secondary)]">
            One step left. Connect the wallet you want to use Sluice with, and this
            code binds to it.
          </p>
          {/*
            A devnet wallet is fine and is what most people in the beta will have. The
            waitlist form already told them a wallet is optional and that we would
            help, so this screen cannot turn round and demand one exists first.
          */}
          <div className="flex flex-wrap items-center gap-3">
            <ConnectButton />
            <span className="font-mono text-[11px] text-[var(--text-muted)]">
              Phantom, Solflare or Backpack. Devnet is fine.
            </span>
          </div>
          <p className="font-body text-xs leading-relaxed text-[var(--text-muted)]">
            No wallet yet?{" "}
            <a href="/waitlist" className="text-[var(--accent-text)] underline underline-offset-4">
              Join the waitlist
            </a>{" "}
            and we will help you make one during the beta.
          </p>
        </div>
      )}

      {error !== null && (
        <p role="alert" className="rounded-[--radius-md] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 font-body text-sm text-[var(--accent-text)]">
          {error}
        </p>
      )}
    </motion.div>
  );
}
