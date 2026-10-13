"use client";

/**
 * The operator console.
 *
 * Shows the waitlist, and one button per person that mints a code and emails it in
 * a single request. The button is disabled, with the reason shown above it, when the
 * mailer is not configured, because a button that mints a code and then fails to
 * send it burns the single use of an invite nobody received.
 *
 * Sent state is per row rather than a global toast, because the useful question
 * after inviting five people is "which five", and a single message that says
 * "invited" does not answer it. The code stays on screen after sending so it can be
 * forwarded by hand if the mail bounces.
 */

import { useCallback, useEffect, useState } from "react";

/** A signup as this page needs it. Mirrors the table, nothing more. */
interface Signup {
  readonly email: string;
  readonly role: string;
  readonly region: string | null;
  readonly mobile_money: string | null;
  readonly intent: string | null;
  readonly invited_at: string | null;
  readonly activated_at: string | null;
}

/** What a row is doing right now. */
type RowState = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; code: string } | { kind: "failed"; message: string };

const FIELD =
  "w-full rounded-[--radius-md] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 font-body text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none";

export function AdminConsole({
  signedIn,
  mailReady,
  mailDetail,
}: {
  signedIn: boolean;
  mailReady: boolean;
  mailDetail: string;
}) {
  const [authenticated, setAuthenticated] = useState(signedIn);
  const [passphrase, setPassphrase] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/admin/waitlist", { cache: "no-store" });
      if (!response.ok) throw new Error(`The list did not load (${response.status}).`);
      const data = (await response.json()) as { signups: Signup[] };
      setSignups(data.signups);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "The list did not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) void load();
  }, [authenticated, load]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setSignInError(null);
    const response = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "login", passphrase }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setSignInError(data.error ?? "That is not it.");
      return;
    }
    setPassphrase("");
    setAuthenticated(true);
  }

  async function invite(email: string) {
    setRows((previous) => ({ ...previous, [email]: { kind: "sending" } }));
    try {
      const response = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "invite", email }),
      });
      const data = (await response.json()) as { code?: string; url?: string; error?: string };
      if (!response.ok) {
        setRows((previous) => ({ ...previous, [email]: { kind: "failed", message: data.error ?? "That did not send." } }));
        return;
      }
      setRows((previous) => ({ ...previous, [email]: { kind: "sent", code: data.code ?? "" } }));
      void load();
    } catch {
      setRows((previous) => ({ ...previous, [email]: { kind: "failed", message: "Could not reach the server." } }));
    }
  }

  if (!authenticated) {
    return (
      <form onSubmit={signIn} className="mt-10 flex max-w-sm flex-col gap-3">
        <label htmlFor="admin-pass" className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Pass phrase
        </label>
        <input
          id="admin-pass"
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          autoComplete="current-password"
          className={FIELD}
        />
        <button
          type="submit"
          className="rounded-[--radius-md] bg-[var(--accent)] px-5 py-3 font-mono text-xs text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          Sign in
        </button>
        {signInError !== null && (
          <p role="alert" className="font-mono text-xs text-[var(--accent-text)]">
            {signInError}
          </p>
        )}
        <p className="mt-2 font-body text-xs leading-relaxed text-[var(--text-muted)]">
          One shared pass phrase, not an account. There is one operator, so there is
          nothing to log into as, and a login screen that implied otherwise would be
          pretending.
        </p>
      </form>
    );
  }

  const pending = signups.filter((s) => s.activated_at === null);

  return (
    <div className="mt-8 flex flex-col gap-8">
      {/*
        The mailer status, above everything.

        Shown whether it is ready or not, because a silent disabled button is the
        kind of thing an operator clicks twice and then files a bug about.
      */}
      <div
        className={`rounded-[--radius-lg] border p-5 ${
          mailReady
            ? "border-[var(--border-default)] bg-[var(--bg-surface)]"
            : "border-[var(--accent)] bg-[var(--accent-glow)]"
        }`}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
          {mailReady ? "Mail ready" : "Mail not configured"}
        </p>
        <p className="mt-2 font-body text-xs leading-relaxed text-[var(--text-secondary)]">
          {mailReady
            ? "Inviting mints a code and sends the email in one step; codes are single use and last fourteen days."
            : `${mailDetail} Codes will not be minted while this is unresolved, because a code that cannot be emailed is a code that gets spent on nobody.`}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-[var(--text-muted)]">
          {loading ? "Reading" : `${pending.length} not in the beta, ${signups.length} total`}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="font-mono text-xs text-[var(--accent-text)] underline underline-offset-4 hover:opacity-80"
        >
          Refresh
        </button>
      </div>

      {loadError !== null && (
        <p role="alert" className="font-mono text-xs text-[var(--accent-text)]">
          {loadError}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {signups.map((signup) => {
          const state = rows[signup.email] ?? { kind: "idle" as const };
          const alreadyIn = signup.activated_at !== null;
          const alreadyInvited = signup.invited_at !== null;
          return (
            <li
              key={signup.email}
              className="rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-[var(--text-primary)]">{signup.email}</p>
                  <p className="mt-1 font-mono text-[11px] text-[var(--text-muted)]">
                    {signup.role}
                    {signup.region !== null && ` / ${signup.region}`}
                    {signup.mobile_money !== null && ` / ${signup.mobile_money}`}
                  </p>
                  {signup.intent !== null && (
                    <p className="mt-2 max-w-prose font-body text-xs leading-relaxed text-[var(--text-secondary)]">
                      {signup.intent}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  {alreadyIn ? (
                    <span className="font-mono text-[11px] text-[var(--accent-text)]">in the beta</span>
                  ) : state.kind === "sent" ? (
                    <span className="font-mono text-[11px] text-[var(--accent-text)]">
                      sent, code {state.code}
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={!mailReady || state.kind === "sending"}
                      onClick={() => void invite(signup.email)}
                      className="rounded-[--radius-sm] border border-[var(--accent)] px-4 py-2 font-mono text-[11px] text-[var(--accent-text)] transition-colors hover:bg-[var(--accent-glow)] disabled:cursor-not-allowed disabled:border-[var(--border-default)] disabled:text-[var(--text-muted)]"
                    >
                      {state.kind === "sending" ? "sending" : alreadyInvited ? "Re-invite" : "Invite"}
                    </button>
                  )}
                </div>
              </div>

              {state.kind === "failed" && (
                <p role="alert" className="mt-3 font-mono text-[11px] text-[var(--accent-text)]">
                  {state.message}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
