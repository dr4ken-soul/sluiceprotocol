/**
 * `POST /api/admin/invite`, and `DELETE /api/admin/session` for signing out.
 *
 * The one route that mints a code and sends mail. It refuses unless the caller
 * carries a valid admin session, which is checked on every request rather than
 * trusted from a middleware, because a middleware that is forgotten on one route is
 * an open endpoint.
 */

import { NextResponse } from "next/server";
import { clearAdminCookie, isAdmin, passphraseIsValid, adminCookie } from "@/lib/server/admin";
import { issueInvite } from "@/lib/server/invites";
import { canSend, sendInvite } from "@/lib/server/mailer";

export const dynamic = "force-dynamic";

/** Signs in. The only unauthenticated route here, and it changes nothing. */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Could not read that." }, { status: 400 });
  }

  const { action, passphrase, email } = (body ?? {}) as {
    action?: string;
    passphrase?: string;
    email?: string;
  };

  if (action === "login") {
    if (typeof passphrase !== "string" || !passphraseIsValid(passphrase)) {
      /*
       * 401 with the same message for a wrong pass phrase and an unset one. The
       * distinction is useful to an attacker and to nobody else.
       */
      return NextResponse.json({ error: "That is not it." }, { status: 401 });
    }
    return NextResponse.json({ ok: true }, { headers: { "set-cookie": adminCookie() } });
  }

  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  if (action === "invite") {
    if (typeof email !== "string" || email.length === 0) {
      return NextResponse.json({ error: "No address supplied." }, { status: 422 });
    }

    /*
     * The readiness check comes BEFORE the code is minted, and that ordering is the
     * whole point. Minting first would consume the single use of an invite that
     * then fails to send, leaving a person told they were in and locked out with
     * their one code already spent.
     */
    const readiness = canSend();
    if (readiness.ready === false) {
      return NextResponse.json({ error: readiness.detail }, { status: 503 });
    }

    const invite = await issueInvite({ email });
    const sent = await sendInvite(invite.email ?? email, invite.code);

    if ("reason" in sent) {
      return NextResponse.json(
        { error: `${sent.reason}: ${sent.detail}`, code: invite.code },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, code: invite.code, url: invite.url });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

/** Signs out. */
export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json({ ok: true }, { headers: { "set-cookie": clearAdminCookie() } });
}
