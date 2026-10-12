/**
 * Issues beta invite codes.
 *
 * A CLI rather than an admin page, on purpose. An admin route that mints invites is
 * an unauthenticated-by-default endpoint that grants access to the app, and every
 * one of those is a thing that ends up on the internet with a guessable path. This
 * needs the database credentials in the environment, which means running it on a
 * machine somebody has physical access to, which is the right bar for an operation
 * that decides who can open the app.
 *
 * Usage:
 *   node scripts/issue-invite.mjs --email someone@example.com
 *   node scripts/issue-invite.mjs --open --uses 2
 *   node scripts/issue-invite.mjs --email a@b.co --days 30
 *
 * Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and BETA_INVITE_SECRET from `.env`.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/** Minimal .env reader. No dependency, and it does not overwrite the process env. */
function loadEnv() {
  try {
    for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (match === null) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (process.env[match[1]] === undefined) process.env[match[1]] = value;
    }
  } catch {
    throw new Error("No .env found. Copy .env.example to .env and fill it in.");
  }
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}
function option(name, fallback) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

loadEnv();

const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BETA_INVITE_SECRET"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`Missing from the environment: ${missing.join(", ")}`);
  console.error(
    "Generate the invite secret with:\n  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
  );
  process.exit(1);
}

const email = option("email");
const open = flag("open");
const uses = Number.parseInt(option("uses", "1"), 10);
const days = Number.parseInt(option("days", "14"), 10);

if (!open && !email) {
  console.error("Give --email someone@example.com, or --open for a code with no email.");
  process.exit(1);
}
if (!Number.isInteger(uses) || uses < 1) {
  console.error("--uses must be a positive integer.");
  process.exit(1);
}
if (!Number.isInteger(days) || days < 1) {
  console.error("--days must be a positive integer.");
  process.exit(1);
}

// The signing logic is imported from the app rather than reimplemented, so a code
// minted here and one minted by the server are byte-identical. Two copies of an HMAC
// scheme is one more than there should ever be.
const { issueInvite } = await import("../web/src/lib/server/invites.ts");

const invite = await issueInvite({
  ...(email === undefined ? {} : { email }),
  maxUses: uses,
  ttlDays: days,
});

const origin = option("origin", "https://sluice-beryl.vercel.app");

console.log("");
console.log("  code     " + invite.code);
console.log("  link     " + origin + invite.url);
console.log("  bound to " + (invite.email ?? "nobody, open"));
console.log("  uses     " + uses);
console.log("  expires  " + invite.expiresAt);
console.log("");
console.log("  Give them the link. They connect a wallet and it binds to that wallet.");
console.log("");
