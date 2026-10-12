/**
 * `POST /api/waitlist`.
 *
 * The write path for the waitlist form. Server-side, validated, and stored in
 * Postgres, because a waitlist held in the browser is not a waitlist the project
 * has.
 *
 * Returns 201 on a new signup, 200 when the email was already on the list, and
 * 422 with the offending field when validation refused it. The client needs the
 * three apart: "you are already on it" is a success, not an error, and showing a
 * red field for it would push someone into re-entering a form they have completed.
 */

import { NextResponse } from "next/server";
import {
  AlreadyOnListError,
  isRejection,
  parseSignup,
  waitlistStore,
} from "@/lib/server/waitlist";

/** Never cached, and never statically evaluated: it is a POST with a side effect. */
export const dynamic = "force-dynamic";

/**
 * Refuses bodies that are obviously not a person filling in a form.
 *
 * The cap is on the raw body, before parsing, so it cannot be evaded by sending
 * the same fields in a different shape.
 */
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number.parseInt(declared, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: { field: "form", message: "That submission is too large." } },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: { field: "form", message: "That submission is too large." } },
        { status: 413 },
      );
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: { field: "form", message: "That submission could not be read." } },
      { status: 400 },
    );
  }

  const parsed = parseSignup(body);

  if (isRejection(parsed)) {
    return NextResponse.json({ error: parsed }, { status: 422 });
  }

  try {
    await waitlistStore().add(parsed);
    return NextResponse.json({ ok: true, alreadyOnList: false }, { status: 201 });
  } catch (cause) {
    /*
     * A duplicate is not a failure. Somebody who forgot they had already joined
     * is exactly who this feature has to be kind to, and they are still on the
     * list, which is all they came for.
     */
    if (cause instanceof AlreadyOnListError) {
      return NextResponse.json({ ok: true, alreadyOnList: true }, { status: 200 });
    }
    return NextResponse.json(
      {
        error: {
          field: "form",
          message:
            cause instanceof Error
              ? cause.message
              : "We could not save your place. Try again in a moment.",
        },
      },
      { status: 503 },
    );
  }
}
