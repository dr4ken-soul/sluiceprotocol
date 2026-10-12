/**
 * `/admin`.
 *
 * Reads the waitlist, and mints and sends an invite from it. Three operations that
 * between them decide who can open the product, which is why the whole page is
 * behind a pass phrase and why no one of them is reachable without a session.
 *
 * It is `noindex` and it is not linked from anywhere. An unlinked, authenticated
 * page is the right shape for an operator surface: discoverable by you, not by a
 * crawler that happened to guess the path.
 *
 * The sign-in is a single shared pass phrase rather than an account, because there
 * is one operator. That is a deliberate limit and the note under the form says so,
 * rather than presenting a login screen as if it were a real identity system.
 */

import { cookies } from "next/headers";
import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { ADMIN_COOKIE } from "@/lib/server/admin";
import { canSend } from "@/lib/server/mailer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Waitlist",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  const signedIn = cookies().get(ADMIN_COOKIE) !== undefined;
  // Computed on the server so the console can say why the send button is disabled
  // instead of offering it and failing after the operator has clicked.
  const readiness = canSend();

  return (
    <main id="main" className="min-h-screen bg-[var(--bg-primary)] px-6 py-16 md:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
          Operator
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)]">
          Waitlist
        </h1>
        <AdminConsole signedIn={signedIn} mailReady={readiness.ready === true} mailDetail={readiness.ready === true ? "" : readiness.detail} />
      </div>
    </main>
  );
}
