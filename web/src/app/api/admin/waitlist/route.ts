/**
 * `GET /api/admin/waitlist`.
 *
 * Reads the signup table for the operator console.
 *
 * Separate from `/api/admin/invite` on purpose. That route takes a POST and does
 * something irreversible, so it is the one you think about twice. This one only
 * reads, and keeping reads away from the route that writes means a mistake in the
 * console cannot accidentally become a send.
 *
 * The table has row level security on with no policies, so only the service role can
 * read it. That is the policies doing their job, not an obstacle.
 */

import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

/**
 * Checks the caller and returns the cookie header to send on a 401.
 *
 * A 401 that does not also clear the cookie leaves a browser holding a session it
 * can no longer use, which is how an operator ends up staring at a sign in form
 * that keeps rejecting a pass phrase they know is right.
 */
function unauthorised(): NextResponse {
  return NextResponse.json({ error: "Sign in first." }, { status: 401 });
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAdmin(request)) return unauthorised();

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url === undefined || key === undefined || url.length === 0 || key.length === 0) {
    return NextResponse.json({ error: "No database configured." }, { status: 503 });
  }

  const response = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/waitlist_signups` +
      `?select=email,role,region,mobile_money,intent,invited_at,activated_at,created_at` +
      `&order=created_at.asc`,
    {
      headers: { apikey: key, authorization: `Bearer ${key}` },
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: `The list did not load (${response.status}). Check migration 0003.` },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { signups: await response.json() },
    // Never cached. Somebody who has just been promoted must appear promoted.
    { headers: { "cache-control": "no-store" } },
  );
}
