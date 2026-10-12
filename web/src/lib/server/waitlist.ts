/**
 * Waitlist storage and validation.
 *
 * Server-side, like every other write in this project. A waitlist that lived in
 * `localStorage` would be a waitlist the project does not have: it would be lost
 * when a browser is cleared, it would exist only on the machine that filled it in,
 * and there would be no way to invite anybody because there would be no list of
 * anybody.
 *
 * Validation lives here rather than in the form, because a form is a suggestion
 * and this is the boundary. Anything that reaches the table has passed through
 * {@link parseSignup}.
 */

/** The three roles from `APP_BLUEPRINT.md`, plus "all of it". */
export type WaitlistRole = "issuer" | "investor" | "member" | "all";

/** How much the person has used Solana. Decides beta onboarding depth. */
export type SolanaFamiliarity = "never" | "once" | "used" | "unknown";

/** A validated signup, ready to insert. */
export interface WaitlistSignup {
  readonly email: string;
  readonly role: WaitlistRole;
  readonly intent?: string;
  readonly region?: string;
  readonly mobileMoney?: string;
  readonly solanaFamiliarity: SolanaFamiliarity;
  readonly wallet?: string;
  readonly referrer?: string;
}

/** Why a signup was refused, and which field was at fault. */
export type SignupRejection =
  | { readonly field: "email"; readonly message: string }
  | { readonly field: "role"; readonly message: string }
  | { readonly field: string; readonly message: string };

const ROLES: readonly WaitlistRole[] = ["issuer", "investor", "member", "all"];
const FAMILIARITY: readonly SolanaFamiliarity[] = ["never", "once", "used", "unknown"];

/** Long enough for the free-text answers, short enough that nobody can paste a novel. */
const MAX_FREE_TEXT = 500;

/**
 * Deliberately conservative.
 *
 * A valid address is 32-44 characters of base58, which excludes `0`, `O`, `I` and
 * `l`. Rejecting those characters is the cheapest real check available and it
 * catches the commonest typo, which is pasting an Ethereum address. It is not
 * proof of control of a key, and nothing in this project should treat it as such:
 * the field is optional and is only ever used to pre-fill an invite.
 */
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** `local@domain`, with a dot in the domain. Enough; not RFC 5322. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trims, and drops an empty string to undefined so the column stays NULL. */
function optionalText(value: unknown, max = MAX_FREE_TEXT): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, max);
}

/**
 * Validates an untrusted body into a {@link WaitlistSignup}.
 *
 * Returns the rejection rather than throwing, so the route can put the message next
 * to the field that caused it instead of showing one generic error for the form.
 */
export function parseSignup(body: unknown): WaitlistSignup | SignupRejection {
  if (typeof body !== "object" || body === null) {
    return { field: "form", message: "Nothing was submitted." };
  }
  const raw = body as Record<string, unknown>;

  const email = optionalText(raw.email, 254)?.toLowerCase();
  if (email === undefined || !EMAIL.test(email)) {
    return { field: "email", message: "That email does not look right." };
  }

  const role = optionalText(raw.role, 16) as WaitlistRole | undefined;
  if (role === undefined || !ROLES.includes(role)) {
    return { field: "role", message: "Pick what you would use Sluice for." };
  }

  const rawFamiliarity = optionalText(raw.solanaFamiliarity, 16) ?? "unknown";
  const solanaFamiliarity = rawFamiliarity as SolanaFamiliarity;
  if (!FAMILIARITY.includes(solanaFamiliarity)) {
    return { field: "solanaFamiliarity", message: "Pick one of the options." };
  }

  const wallet = optionalText(raw.wallet, 64);
  if (wallet !== undefined && !SOLANA_ADDRESS.test(wallet)) {
    return {
      field: "wallet",
      message: "Leave it blank if you do not have one yet, or paste a Solana address beginning with a letter or 1-9.",
    };
  }

  return {
    email,
    role,
    solanaFamiliarity,
    ...(optionalText(raw.intent) === undefined ? {} : { intent: optionalText(raw.intent) }),
    ...(optionalText(raw.region) === undefined ? {} : { region: optionalText(raw.region) }),
    ...(optionalText(raw.mobileMoney) === undefined
      ? {}
      : { mobileMoney: optionalText(raw.mobileMoney) }),
    ...(wallet === undefined ? {} : { wallet }),
    ...(optionalText(raw.referrer, 200) === undefined
      ? {}
      : { referrer: optionalText(raw.referrer, 200) }),
  };
}

/** Narrows a validation result to its failure shape. */
export function isRejection(
  value: WaitlistSignup | SignupRejection,
): value is SignupRejection {
  return "field" in value;
}

/** Thrown when the same email joins twice. Carries no detail the caller can abuse. */
export class AlreadyOnListError extends Error {}

/** The write side of the waitlist. */
export interface WaitlistStore {
  /** Adds a signup, or throws {@link AlreadyOnListError}. */
  add(signup: WaitlistSignup): Promise<void>;
  /** Counts signups, for the "so far" figure. Never used to gate access. */
  count(): Promise<number>;
}

/**
 * Supabase-backed store.
 *
 * Uses PostgREST with the service role key, the same boundary as the draft store:
 * the key stays server-side and a thin fetch makes that obvious. The table is
 * created by `supabase/migrations/0003_waitlist.sql`.
 */
class SupabaseWaitlistStore implements WaitlistStore {
  constructor(
    private readonly url: string,
    private readonly serviceKey: string,
  ) {}

  async add(signup: WaitlistSignup): Promise<void> {
    const response = await fetch(`${this.url}/rest/v1/waitlist_signups`, {
      method: "POST",
      headers: {
        apikey: this.serviceKey,
        authorization: `Bearer ${this.serviceKey}`,
        "content-type": "application/json",
        // Return nothing. The response would be the whole row, and there is no
        // reason to echo a person's details back to them.
        prefer: "return=minimal",
      },
      body: JSON.stringify(signup),
    });

    // 23505 is the Postgres unique violation. PostgREST surfaces it as a conflict.
    if (response.status === 409) throw new AlreadyOnListError("already on the list");
    if (!response.ok) {
      throw new Error(
        `Waitlist store returned ${response.status}. Apply supabase/migrations/0003_waitlist.sql before using it.`,
      );
    }
  }

  async count(): Promise<number> {
    const response = await fetch(
      `${this.url}/rest/v1/waitlist_signups?select=id`,
      {
        method: "HEAD",
        headers: {
          apikey: this.serviceKey,
          authorization: `Bearer ${this.serviceKey}`,
          prefer: "count=exact",
          range: "0-0",
        },
      },
    );
    const header = response.headers.get("content-range");
    if (header === null) throw new Error("Waitlist store returned no count.");
    // "0-0/1234"
    const total = header.split("/")[1];
    return total === undefined ? 0 : Number.parseInt(total, 10);
  }
}

/**
 * Rejects rather than silently succeeding.
 *
 * A store that accepted a signup and dropped it would tell someone they are on a
 * list they are not on, and would do it silently, which is the one failure mode
 * this whole feature exists to avoid.
 */
class UnconfiguredWaitlistStore implements WaitlistStore {
  async add(): Promise<void> {
    throw new Error(
      "No waitlist store is configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  async count(): Promise<number> {
    return 0;
  }
}

let cached: WaitlistStore | null = null;

/** Resolves the configured store once and reuses it. */
export function waitlistStore(): WaitlistStore {
  if (cached !== null) return cached;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    supabaseUrl !== undefined &&
    supabaseUrl.length > 0 &&
    serviceKey !== undefined &&
    serviceKey.length > 0
  ) {
    cached = new SupabaseWaitlistStore(supabaseUrl.replace(/\/$/, ""), serviceKey);
    return cached;
  }

  cached = new UnconfiguredWaitlistStore();
  return cached;
}
