'use client';

/**
 * The app-interior wallet pill and its menu.
 *
 * `FRONTEND_SPEC.md` §2.1 and §2.2 specify this closely, and two behaviours are
 * called out because they are easy to get wrong:
 *
 * - Clicking the pill opens the menu. It must never disconnect immediately, because
 *   that reads as a mis-click and loses the session.
 * - Disconnect navigates to `/` first, then revokes the connection, so the user is
 *   moved off the gated route before the state that gated it goes away.
 */

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "./useSession";
import { explorerAddress, SOLANA_NETWORK } from "@/lib/env";
import { truncateAddress } from "@/lib/format";
import {
  CheckCircleIcon,
  ChevronIcon,
  CopyIcon,
  ExternalIcon,
  LiveDot,
} from "@/components/ui";

export function WalletPill() {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Outside pointerdown closes the menu. There is deliberately no backdrop div,
  // because one would swallow pointer events meant for the page behind it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent): void => {
      if (
        containerRef.current !== null &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const copyAddress = async (): Promise<void> => {
    if (session.address === null) return;
    try {
      await navigator.clipboard.writeText(session.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      // Clipboard access can be refused. The address is on screen, so the user can
      // still select it manually, and a failure here is not worth an alert.
    }
  };

  const disconnect = async (): Promise<void> => {
    setOpen(false);
    // Navigate first, then revoke. Doing it the other way round leaves the gated
    // route rendering for a frame with no session, which is the false bounce.
    router.push("/?disconnected=1");
    await session.disconnect();
  };

  if (session.address === null) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--border-default)] bg-[var(--bg-surface)] px-3.5 py-2 transition-colors duration-200 hover:border-[var(--accent)]"
      >
        <LiveDot />
        <span className="font-mono text-xs text-[var(--text-primary)]">
          {truncateAddress(session.address)}
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="text-[var(--text-muted)]"
        >
          <ChevronIcon label="" className="h-3.5 w-3.5" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            className="absolute right-0 top-[calc(100%+0.5rem)] w-72 rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-elevated)]/95 p-2 shadow-[0_20px_50px_-20px_oklch(0.16_0.008_250_/_0.7)] backdrop-blur-xl"
            style={{ transformOrigin: "top right" }}
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <LiveDot />
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                Wallet connected
              </span>
            </div>

            <dl className="mt-1 border-t border-[var(--border-subtle)] px-3 py-3">
              <div className="flex items-center justify-between gap-3 py-1">
                <dt className="font-body text-xs text-[var(--text-secondary)]">Address</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-[var(--text-primary)]">
                    {truncateAddress(session.address, 6, 6)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyAddress()}
                    aria-label={copied ? "Address copied" : "Copy address"}
                    className="flex h-8 w-8 items-center justify-center rounded-[--radius-sm] text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text-primary)]"
                  >
                    {copied ? (
                      <CheckCircleIcon label="Copied" className="h-4 w-4 text-[var(--success)]" />
                    ) : (
                      <CopyIcon label="Copy address" className="h-4 w-4" />
                    )}
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <dt className="font-body text-xs text-[var(--text-secondary)]">Network</dt>
                <dd className="font-mono text-xs text-[var(--text-primary)]">Solana</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <dt className="font-body text-xs text-[var(--text-secondary)]">Cluster</dt>
                <dd className="font-mono text-xs text-[var(--text-primary)]">
                  {SOLANA_NETWORK}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <dt className="font-body text-xs text-[var(--text-secondary)]">Status</dt>
                <dd className="font-mono text-xs text-[var(--success)]">Active</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <dt className="font-body text-xs text-[var(--text-secondary)]">Signed in with</dt>
                <dd className="font-mono text-xs text-[var(--text-primary)]">
                  {session.method === "privy-email"
                    ? "Email"
                    : session.method === "privy-google"
                      ? "Google"
                      : "Self-custody wallet"}
                </dd>
              </div>
            </dl>

            <div className="border-t border-[var(--border-subtle)] pt-2">
              <a
                href={explorerAddress(session.address)}
                target="_blank"
                rel="noreferrer noopener"
                role="menuitem"
                className="flex min-h-[44px] items-center justify-between rounded-[--radius-sm] px-3 font-body text-xs text-[var(--text-secondary)] transition-colors duration-200 hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
              >
                View on the explorer
                <ExternalIcon label="" className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => void disconnect()}
                role="menuitem"
                className="flex min-h-[44px] w-full items-center rounded-[--radius-sm] px-3 font-body text-xs text-[var(--error)] transition-colors duration-200 hover:bg-[var(--error)]/10"
              >
                Disconnect wallet
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
