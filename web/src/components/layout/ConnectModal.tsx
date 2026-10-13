'use client';

/**
 * The wallet connection modal.
 *
 * `FRONTEND_SPEC.md` §2.1 is explicit: **every entry point opens this modal and
 * none of them connect directly.** Calling an adapter's `connect` from a button
 * click skips the intermediate states entirely, and the one the user actually needs
 * is the failure one, where a rejected approval needs an explanation and a retry
 * rather than a silent no-op.
 *
 * The four states are idle, connecting, pending, success and error. Connecting
 * disables the close control, because a user who aborts mid-approval leaves the
 * wallet in an ambiguous state that the next attempt then trips over.
 */

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import type { PublicKey } from "@solana/web3.js";
import { usePrivyLogin, useSession } from "./useSession";
import { CloseIcon } from "@/components/ui";

/** Which stage of the connection flow the modal is on. */
type Phase = "idle" | "connecting" | "success" | "error";

/** How the modal was opened, which decides whether it can be dismissed. */
interface ConnectModalContext {
  open: boolean;
  openModal: () => void;
  closeModal: () => void;
}

import { createContext, useContext } from "react";

const ConnectModalContext = createContext<ConnectModalContext>({
  open: false,
  openModal: () => undefined,
  closeModal: () => undefined,
});

/** Reads the connect modal's open state. */
export function useConnectModal(): ConnectModalContext {
  return useContext(ConnectModalContext);
}

/**
 * Provides the modal and renders it.
 *
 * Mounted once at the layout level so every entry point, in any section, opens the
 * same modal rather than each one owning a private copy.
 */
export function ConnectModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const value: ConnectModalContext = {
    open,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
  };

  return (
    <ConnectModalContext.Provider value={value}>
      {children}
      <ConnectModal open={open} onClose={() => setOpen(false)} />
    </ConnectModalContext.Provider>
  );
}

/**
 * The connection modal's first step: role.
 *
 * `PRODUCT_OPS.md` §12.4 is explicit about the order. **Role first, then method.**
 * "I'm raising" or "I'm investing", then Google, email, or connect a wallet.
 * Asking for a wallet before saying why makes it feel like a demand.
 *
 * Role is a *view preference*, not a permission. The same address is often both an
 * issuer and an investor, and most issuers hold positions in their own issuance.
 * Compliance eligibility is decided on chain by the transfer hook, never by a flag
 * chosen here.
 */
export type AuthRole = "raising" | "investing";

/** Which role the modal is currently showing methods for. */
type Step = "role" | "method";

function RoleStep({ onPick }: { onPick: (role: AuthRole) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 font-body text-xs text-[var(--text-secondary)]">
        What are you here to do? This only sets what you see first. It is not a
        permission, and you can do both.
      </p>
      <button
        type="button"
        onClick={() => onPick("raising")}
        className="flex min-h-[44px] flex-col items-start rounded-[--radius-md] border border-[var(--border-default)] px-4 py-3 text-left transition-colors duration-200 hover:border-[var(--accent)]"
      >
        <span className="font-body text-sm text-[var(--text-primary)]">I am raising</span>
        <span className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
          Issue an asset against a milestone
        </span>
      </button>
      <button
        type="button"
        onClick={() => onPick("investing")}
        className="flex min-h-[44px] flex-col items-start rounded-[--radius-md] border border-[var(--border-default)] px-4 py-3 text-left transition-colors duration-200 hover:border-[var(--accent)]"
      >
        <span className="font-body text-sm text-[var(--text-primary)]">I am investing</span>
        <span className="mt-0.5 font-mono text-[11px] text-[var(--text-muted)]">
          Buy into an issuance and follow its adjudication
        </span>
      </button>
    </div>
  );
}

/** The modal itself. */
function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { select, wallets, connecting } = useWallet();
  const session = useSession();
  const router = useRouter();
  const { login: privyLogin, ready: privyReady } = usePrivyLogin();
  const [phase, setPhase] = useState<Phase>("idle");
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<AuthRole>("investing");
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Reset on close so a previous failure does not greet the next attempt.
  useEffect(() => {
    if (open) {
      setPhase("idle");
      setStep("role");
      setError(null);
      triggerRef.current = document.activeElement as HTMLElement | null;
      // Focus moves into the dialog on open, per §14.
      window.setTimeout(() => dialogRef.current?.focus(), 0);
    }
  }, [open]);

  // Focus returns to whatever opened the modal.
  useEffect(() => {
    if (!open) {
      triggerRef.current?.focus();
    }
  }, [open]);

  const connect = useCallback(
    async (name: WalletName) => {
      const wallet = wallets.find((candidate) => candidate.adapter.name === name);
      if (wallet === undefined) {
        setPhase("error");
        setError(`${name} is not available in this browser. Try another wallet.`);
        return;
      }

      setPhase("connecting");
      setError(null);

      try {
        // Selected first, because the selection is what triggers the browser's
        // wallet prompt, then connected through the adapter.
        await select(name);

        /*
         * Some adapters resolve before the user has approved in the extension, so
         * the public key is awaited separately with a ceiling. The adapter object
         * is read through a narrow local type because the published `Wallet`
         * interface does not declare `publicKey` even though every adapter carries
         * it. Thirty seconds is long enough for a deliberate approval and short
         * enough that a dismissed dialog surfaces an error rather than hanging.
         */
        const adapter = wallet as unknown as { publicKey: PublicKey | null };
        await new Promise<void>((resolve, reject) => {
          const started = Date.now();
          const check = (): void => {
            if (adapter.publicKey !== null && adapter.publicKey !== undefined) {
              resolve();
              return;
            }
            if (Date.now() - started > 30_000) {
              reject(new Error("The wallet did not complete the connection within thirty seconds."));
              return;
            }
            window.setTimeout(check, 150);
          };
          check();
        });

        setPhase("success");
        window.setTimeout(() => {
          onClose();
          router.push("/app");
        }, 900);
      } catch (cause) {
        // A rejection is the common case, not the exceptional one. It becomes an
        // explicit in-app state with a retry rather than a bubble.
        const message =
          cause instanceof Error ? cause.message : "The wallet did not complete the request.";
        const lower = message.toLowerCase();
        setPhase("error");
        setError(
          lower.includes("reject") || lower.includes("denied") || lower.includes("declined")
            ? "The request was declined in your wallet, nothing was changed, and you can try again."
            : `${message} Nothing was changed, so you can try again.`,
        );
      }
    },
    [wallets, select, onClose, router],
  );

  /**
   * Signs in through Privy, which provisions an embedded wallet on first login.
   *
   * An issuer never sees a seed phrase, which is the entire reason Privy is in the
   * stack. The same path is offered to investors.
   */
  const connectWithPrivy = useCallback(
    async (provider: "email" | "google") => {
      if (privyLogin === null) {
        setPhase("error");
        setError(
          "Embedded sign-in is not configured. Set NEXT_PUBLIC_PRIVY_APP_ID, or connect a self-custody wallet instead.",
        );
        return;
      }
      setPhase("connecting");
      setError(null);
      try {
        if (provider === "google") {
          await privyLogin({ loginWith: "google" });
        } else {
          await privyLogin();
        }
        setPhase("success");
        window.setTimeout(() => {
          onClose();
          // Investors land on the marketplace rather than the terminal, because a
          // new investor holds nothing yet and the terminal would open empty.
          router.push(role === "raising" ? "/app/issue" : "/#marketplace");
        }, 900);
      } catch (cause) {
        setPhase("error");
        setError(
          cause instanceof Error
            ? `${cause.message} Nothing was changed, so you can try again.`
            : "Sign-in did not complete, nothing was changed, and you can try again.",
        );
      }
    },
    [privyLogin, onClose, router, role],
  );

  useEffect(() => {
    if (phase !== "connecting" && connecting !== true) return;
    if (connecting === false && phase === "connecting") {
      // The adapter finished without the modal observing a resolution, which means
      // it failed. Surfaced as an error rather than leaving the button spinning.
      setPhase("error");
      setError("The wallet did not complete the connection, but you can try again.");
    }
  }, [connecting, phase]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-modal flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[var(--bg-primary)]/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-title"
            tabIndex={-1}
            className="relative w-full max-w-md rounded-[--radius-xl] border border-[var(--border-default)] bg-[var(--bg-surface)] p-7 shadow-[0_24px_64px_-20px_oklch(0.16_0.008_250_/_0.7)]"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="connect-title"
                  className="font-display text-xl font-bold text-[var(--text-primary)]"
                >
                  Connect a wallet
                </h2>
                <p className="mt-2 max-w-[38ch] font-body text-xs leading-relaxed text-[var(--text-secondary)]">
                  Connecting signs nothing and moves nothing on its own. Sluice asks for
                  a signature only when you issue, invest or claim.
                </p>
              </div>
              {/*
                The close control is disabled while connecting so the user cannot
                abort mid-approval, which would leave the wallet in a state the next
                attempt trips over.
              */}
              <button
                type="button"
                onClick={onClose}
                disabled={phase === "connecting"}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-30"
              >
                <CloseIcon label="Close" className="h-4 w-4" />
              </button>
            </div>

            {phase === "idle" ? (
              step === "role" ? (
                <RoleStep
                  onPick={(picked) => {
                    setRole(picked);
                    setStep("method");
                  }}
                />
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("role")}
                    className="mb-1 self-start font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)] transition-colors duration-200 hover:text-[var(--text-primary)]"
                  >
                    {role === "raising" ? "Raising" : "Investing"}
                  </button>

                  {/*
                    Every method is offered identically to issuers and investors.
                    Withholding the easiest path from investors was a mistake in an
                    earlier version: an investor with no wallet had to leave, install
                    an extension, create a wallet, record a seed phrase, fund it and
                    come back before they could buy anything.
                  */}
                  {session.privyAvailable ? (
                    <>
                      <button
                        type="button"
                        disabled={privyReady === false}
                        onClick={() => void connectWithPrivy("email")}
                        className="flex min-h-[44px] items-center justify-between rounded-[--radius-md] border border-[var(--border-default)] px-4 py-3 font-body text-sm text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Continue with email
                        <span aria-hidden="true" className="text-[var(--text-muted)]">
                          Embedded wallet
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={privyReady === false}
                        onClick={() => void connectWithPrivy("google")}
                        className="flex min-h-[44px] items-center justify-between rounded-[--radius-md] border border-[var(--border-default)] px-4 py-3 font-body text-sm text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Continue with Google
                        <span aria-hidden="true" className="text-[var(--text-muted)]">
                          Embedded wallet
                        </span>
                      </button>
                    </>
                  ) : null}

                  <p className="mb-1 mt-2 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                    Self-custody wallet
                  </p>

                  {wallets.length === 0 ? (
                    <p className="font-body text-xs text-[var(--text-secondary)]">
                      No Solana wallet extension was detected in this browser. An embedded
                      wallet is provisioned automatically if email sign-in is available.
                    </p>
                  ) : (
                    wallets.map((wallet) => (
                      <button
                        key={wallet.adapter.name}
                        type="button"
                        onClick={() => void connect(wallet.adapter.name as WalletName)}
                        className="flex min-h-[44px] items-center justify-between rounded-[--radius-md] border border-[var(--border-default)] px-4 py-3 font-body text-sm text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)]"
                      >
                        {wallet.adapter.name}
                        <span aria-hidden="true" className="text-[var(--text-muted)]">
                          Connect
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )
            ) : null}

            {phase === "connecting" ? (
              <div className="flex flex-col items-center gap-4 py-8">
                {/*
                  A shimmer placeholder rather than a spinner. §1.8 bans spinners for
                  loading states, and a spinner gives the reader no sense of what is
                  arriving.
                */}
                <div className="relative h-1 w-40 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent" />
                </div>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  Waiting for your wallet
                </p>
              </div>
            ) : null}

            {phase === "success" ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <p className="font-body text-sm text-[var(--success)]">Connected.</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
                  Opening the terminal
                </p>
              </div>
            ) : null}

            {phase === "error" ? (
              <div className="flex flex-col gap-4">
                {/*
                  The error states the cause and the fix, per §14. "Invalid input"
                  style copy would leave the reader with nothing to act on.
                */}
                <div
                  role="alert"
                  className="rounded-[--radius-md] border border-[var(--error)]/30 bg-[var(--error)]/5 p-4"
                >
                  <p className="font-body text-xs leading-relaxed text-[var(--error)]">
                    {error}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("idle");
                      setError(null);
                    }}
                    className="min-h-[44px] flex-1 rounded-full border border-[var(--border-default)] px-5 py-2.5 font-mono text-xs text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)]"
                  >
                    Choose another
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhase("idle");
                      setError(null);
                      if (wallets[0] !== undefined) {
                        void connect(wallets[0].adapter.name as WalletName);
                      }
                    }}
                    className="min-h-[44px] flex-1 rounded-full bg-[var(--accent)] px-5 py-2.5 font-mono text-xs font-medium text-[var(--bg-primary)] transition-colors duration-200 hover:bg-[var(--accent-hover)]"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * The nav's Connect Wallet trigger.
 *
 * Opens the modal. Never calls `connect` itself, which is the rule §2.1 states twice
 * because getting it wrong is easy and looks fine until a user declines.
 */
export function ConnectButton({ label = "Connect wallet" }: { label?: string }) {
  const { openModal } = useConnectModal();
  return (
    <button
      type="button"
      onClick={openModal}
      className="min-h-[44px] rounded-full border border-[var(--border-default)] px-4 py-2 font-mono text-xs text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)] md:px-3.5"
    >
      {label}
    </button>
  );
}
