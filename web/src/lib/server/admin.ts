/**
 * Authentication for the admin surface.
 *
 * The admin route reads a list of who wants into the product, mints codes that
 * grant access to it, and sends mail. Any one of those three is enough reason to
 * not ship it without a gate, and the failure mode of getting it wrong is worse
 * than the route not existing: a public page that hands strangers beta invites.
 *
 * ## Why a passphrase and not a wallet
 *
 * A wallet gate would be nicer, but it puts the key that controls the waitlist
 * behind the same wallet that a beta invitee holds, which collapses "operator" and
 * "user" into one identity. That is the same mistake as letting a redemption claim
 * be authorised by the person being paid.
 *
 * ## What this does and does not protect against
 *
 * It stops an unauthenticated request. It does not stop a determined attacker who
 * has the passphrase, and it does not add a second factor. For a single operator on
 * a project with a handful of users, that is proportionate. The alternative worth
 * having later is a real identity provider, and the note is in `.env.example`.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** The cookie name. Namespaced so it cannot collide with the Privy session cookie. */
export const ADMIN_COOKIE = "sluice_admin";

/** How long an admin session lasts. A day is long enough to work, short enough to expire. */
const MAX_AGE_SECONDS = 60 * 60 * 24;

/**
 * Reads the passphrase.
 *
 * Throws rather than defaulting. An admin gate that falls back to a known string is
 * not a gate, and the failure looks exactly like a working one until somebody walks
 * in, which is the specific outcome this is preventing.
 */
function passphrase(): string {
  const value = process.env.ADMIN_PASSPHRASE;
  if (value === undefined || value.length < 16) {
    throw new Error(
      "ADMIN_PASSPHRASE is unset or shorter than 16 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(24).toString('base64url'))\"",
    );
  }
  return value;
}

/**
 * The signed value stored in the cookie.
 *
 * An HMAC over a fixed string rather than a random session id, because there is one
 * operator and no session table. A random id would need somewhere to store it, and
 * a place to revoke it, and neither is worth it for a single operator whose pass
 * phrase is the revocation.
 */
function signature(): string {
  return createHmac("sha256", passphrase()).update("sluice-admin-v1").digest("base64url");
}

/** Compares in constant time, so a mismatch does not leak where it differed. */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Checks a submitted pass phrase, and says which of two failures it was.
 *
 * A single boolean could not, and that cost an hour of debugging a gate that was
 * working exactly as written against a value that had not arrived.
 *
 * "unconfigured" is a server fault and is reported as 503, not 401. Collapsing the
 * two into one 401 tells an operator with the right phrase that they typed it
 * wrong, which sends them looking at their keyboard instead of at the environment.
 * It leaks nothing to an attacker: both cases still refuse the request, and neither
 * reveals anything about the value itself.
 */
export type PassphraseCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "unconfigured" }
  | { readonly ok: false; readonly reason: "wrong" };

export function checkPassphrase(candidate: string): PassphraseCheck {
  let stored: string;
  try {
    stored = passphrase();
  } catch {
    return { ok: false, reason: "unconfigured" };
  }
  /*
   * A constant time comparison of the submitted value against the stored one.
   *
   * This previously compared HMAC(secret, candidate) against HMAC(secret,
   * "sluice-admin-v1"), which is the value the session cookie carries. Those are two
   * different messages under the same key, so they never matched, and the gate was
   * impossible to open no matter what was typed. It looked like a configuration
   * problem and was read as one for a long time.
   *
   * The cookie signature stays, because a cookie is handed to the browser and has to
   * be unforgeable. This comparison does not, because nothing leaves the server.
   */
  return safeEqual(candidate, stored) ? { ok: true } : { ok: false, reason: "wrong" };
}
/** The cookie to set after a successful sign in. */
export function adminCookie(): string {
  return `${ADMIN_COOKIE}=${signature()}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${MAX_AGE_SECONDS}`;
}

/** The cookie that ends the session. Same attributes, zero lifetime. */
export function clearAdminCookie(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/** Whether the current request carries a valid admin session. */
export function isAdmin(request: Request): boolean {
  const header = request.headers.get("cookie");
  if (header === null) return false;
  const value = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1);
  if (value === undefined) return false;
  try {
    return safeEqual(value, signature());
  } catch {
    return false;
  }
}
