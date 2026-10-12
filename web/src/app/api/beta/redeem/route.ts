/**
 * `POST /api/beta/redeem`.
 *
 * Binds a connected wallet to an invite. This is the step that turns "somebody
 * with a code" into "this specific signer", and it is the only step where a wallet
 * address and an invite ever meet.
 *
 * Rejects rather than softens. A redeem that half-succeeded would leave an invite
 * consumed with no wallet bound to it, which loses the person's only way in and
 * burns one of a single-use code's single uses. So the use is only consumed once
 * the invite has already verified, and the activation failing loudly is preferred
 * to a quiet partial state.
 */

import { NextResponse } from "next/server";
import { redeemInvite } from "@/lib/server/invites";

export const dynamic = "force-dynamic";

/** A Solana address is 32-44 base58 characters with no 0, O, I or l. */
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Human wording for each rejection, so the page never has to invent one. */
const MESSAGES: Record<string, string> = {
  unknown: "That code is not one of ours.",
  revoked: "That code has been withdrawn.",
  expired: "That code has expired. Ask for a fresh one.",
  exhausted: "That code has already been used.",
  tampered: "That code is not valid.",
  unconfigured: "Invites are not switched on yet.",
};

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { field: "form", message: "That submission could not be read." } },
      { status: 400 },
    );
  }

  const { code, address } = (body ?? {}) as { code?: unknown; address?: unknown };

  if (typeof code !== "string" || code.trim().length === 0) {
    return NextResponse.json(
      { error: { field: "code", message: "No code was supplied." } },
      { status: 422 },
    );
  }
  if (typeof address !== "string" || !SOLANA_ADDRESS.test(address.trim())) {
    // Deliberately not echoed back. Telling a caller that their address "looks
    // wrong" teaches them the shape, which is all an attacker needs to enumerate.
    return NextResponse.json(
      {
        error: {
          field: "address",
          message: "Connect a Solana wallet and try again. A devnet address is fine.",
        },
      },
      { status: 422 },
    );
  }

  try {
    const result = await redeemInvite(code.trim(), address.trim());
    if ("reason" in result) {
      return NextResponse.json(
        { error: { field: "code", message: MESSAGES[result.reason] ?? MESSAGES.unknown } },
        { status: 403 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return NextResponse.json(
      {
        error: {
          field: "form",
          message: cause instanceof Error ? cause.message : "Could not redeem that code.",
        },
      },
      { status: 503 },
    );
  }
}
