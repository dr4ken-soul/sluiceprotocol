/**
 * Draft storage route.
 *
 * `FRONTEND_SPEC.md` §2.2 resolves the conflict between the general frontend
 * guidance to autosave long forms to `localStorage` and this project's ban on it:
 * drafts go to the server, keyed by user id, and never to the browser.
 *
 * The store is the indexer, because that is the backend this architecture already
 * has. Two adapters are provided: Supabase Postgres for production, and a
 * filesystem store for local development. Both are server-side. Neither is
 * browser storage, and a draft written through either is restorable from another
 * device.
 */

import { NextResponse } from "next/server";
import { draftStore } from "@/lib/server/drafts";

/** Never cached. A draft is per-user mutable state. */
export const dynamic = "force-dynamic";

/**
 * Reads a draft.
 *
 * Returns 404 when there is none, which the client treats as "start empty" rather
 * than as an error.
 */
export async function GET(
  _request: Request,
  { params }: { params: { userId: string } },
): Promise<NextResponse> {
  try {
    const draft = await draftStore().read(params.userId);
    if (draft === null) {
      return NextResponse.json({ error: "no draft" }, { status: 404 });
    }
    return NextResponse.json(draft, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "draft read failed" },
      { status: 503 },
    );
  }
}

/** Writes a draft, replacing any previous one for the same user. */
export async function PUT(
  request: Request,
  { params }: { params: { userId: string } },
): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();
    await draftStore().write(params.userId, body);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "draft write failed" },
      { status: 400 },
    );
  }
}

/** Removes a draft, so an abandoned issuance does not linger forever. */
export async function DELETE(
  _request: Request,
  { params }: { params: { userId: string } },
): Promise<NextResponse> {
  try {
    await draftStore().remove(params.userId);
    return NextResponse.json({ ok: true });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "draft delete failed" },
      { status: 503 },
    );
  }
}
