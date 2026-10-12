/**
 * `GET /api/beta/status?address=...`.
 *
 * The one question `ProtectedRoute` asks: is this wallet in the beta?
 *
 * Answers `allowed: false` on a database failure as well as on a genuine "no". That
 * is the whole point of the endpoint. The alternative — fail open so a blip does
 * not lock people out — means an outage silently opens the app to anyone who can
 * reach it, which inverts the purpose of a gate. A gate that fails open is not a
 * gate.
 *
 * The response is per-address and never cached, because it changes the moment
 * somebody redeems a code.
 */

import { NextResponse } from "next/server";
import { checkAccess } from "@/lib/server/invites";

export const dynamic = "force-dynamic";

/** Same shape the redeem route accepts. */
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(request: Request): Promise<NextResponse> {
  const address = new URL(request.url).searchParams.get("address");

  if (address === null || !SOLANA_ADDRESS.test(address)) {
    return NextResponse.json(
      { allowed: false, reason: "not-activated" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const decision = await checkAccess(address.trim());

  return NextResponse.json(decision, {
    // Never cached. The same address flips from false to true the moment a code is
    // redeemed, and a cached "no" would look exactly like a rejection.
    headers: { "cache-control": "no-store" },
  });
}
