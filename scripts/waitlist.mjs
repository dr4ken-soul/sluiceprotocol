/**
 * Reads the waitlist and mints invites.
 *
 * A CLI rather than an admin page, for the same reason invites are a CLI: an
 * endpoint that grants access to the app is an endpoint that will end up with a
 * guessable path and no authentication on it. This needs the database credentials
 * in the environment, which means running it on a machine somebody has physical
 * access to. That is the right bar for the operation that decides who can open the
 * product.
 *
 * Reads SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and BETA_INVITE_SECRET from `.env`.
 *
 *   node scripts/waitlist.mjs list
 *   node scripts/waitlist.mjs list --role member
 *   node scripts/waitlist.mjs stats
 *   node scripts/waitlist.mjs invite someone@example.com
 *   node scripts/waitlist.mjs invite --role member --limit 5
 *   node scripts/waitlist.mjs invite --role member --limit 5 --dry-run
 *
 * `--dry-run` prints who would get a code and mints nothing. It is the default
 * instinct for a batch operation and it should be used at least once.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

/** Minimal .env reader. Never overwrites a variable already in the environment. */
function loadEnv() {
  const candidates = [resolve(root, ".env"), resolve(root, ".invite-secret")];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    if (path.endsWith(".invite-secret")) {
      if (!process.env.BETA_INVITE_SECRET) process.env.BETA_INVITE_SECRET = raw.trim();
      continue;
    }
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (match === null) continue;
      const value = match[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  }
}

function flag(name) {
  return process.argv.includes(`--${name}`);
}
function option(name, fallback = undefined) {
  const at = process.argv.indexOf(`--${name}`);
  return at === -1 ? fallback : process.argv[at + 1];
}

loadEnv();

const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "BETA_INVITE_SECRET"].filter(
  (name) => !process.env[name] || process.env[name].length === 0,
);
if (missing.length > 0) {
  console.error(`\n  Missing from the environment: ${missing.join(", ")}\n`);
  console.error("  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in your Supabase");
  console.error("  dashboard under Project Settings > API. Both are needed because the");
  console.error("  waitlist has row level security on with no policies, so only the");
  console.error("  service role can read it. That is the point of the policies.\n");
  console.error("  BETA_INVITE_SECRET is on Vercel. To run locally, put it in .env or");
  console.error("  in the .invite-secret file the tooling generates.\n");
  process.exit(1);
}

const url = process.env.SUPABASE_URL.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** One PostgREST query. Returns parsed rows, or throws with the server's own text. */
async function query(path, init = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  return response.json();
}

const ROLES = ["issuer", "investor", "member", "all"];
const ROLE_LABEL = { issuer: "issuer", investor: "investor", member: "member", all: "unsure" };

/** Truncates a free-text field so one long paragraph cannot wreck the table. */
const clip = (value, width) =>
  value === null || value === undefined || value === ""
    ? ""
    : value.length > width ? `${value.slice(0, width - 1)}\u2026` : value;

async function list() {
  const role = option("role");
  if (role !== undefined && !ROLES.includes(role)) {
    throw new Error(`--role must be one of: ${ROLES.join(", ")}`);
  }
  const filter = role === undefined ? "" : `&role=eq.${role}`;
  const rows = await query(
    `waitlist_signups${filter}` +
      `?select=email,role,region,mobile_money,solana_familiarity,wallet,invited_at,activated_at,created_at` +
      `&order=created_at.desc`,
  );

  if (rows.length === 0) {
    console.log("\n  Nobody yet.\n");
    return;
  }

  const pending = rows.filter((r) => r.activated_at === null).length;
  const invited = rows.filter((r) => r.invited_at !== null && r.activated_at === null).length;
  const active = rows.filter((r) => r.activated_at !== null).length;

  console.log("");
  console.log(`  ${rows.length} on the list   ${pending} never invited   ${invited} invited, not in   ${active} in the beta`);
  console.log("");
  for (const row of rows) {
    const state =
      row.activated_at !== null
        ? "IN"
        : row.invited_at !== null
          ? "invited"
          : "waiting";
    const extra = [row.region, row.mobile_money].filter(Boolean).join(" / ");
    console.log(
      `  [${state.padEnd(8)}] ${row.email.padEnd(34)} ${ROLE_LABEL[row.role] ?? row.role}` +
        `${extra === "" ? "" : `  ${clip(extra, 34)}`}`,
    );
    if (row.wallet !== null) console.log(`             wallet ${row.wallet}`);
  }
  console.log("");
  console.log(`  Invite someone:  node scripts/waitlist.mjs invite their@email`);
  console.log(`  Invite a cohort: node scripts/waitlist.mjs invite --role member --limit 5 --dry-run`);
  console.log("");
}

async function stats() {
  const rows = await query("waitlist_signups?select=role,region,mobile_money,activated_at");
  const byRole = new Map();
  const regions = new Map();
  const rails = new Map();
  for (const row of rows) {
    byRole.set(row.role, (byRole.get(row.role) ?? 0) + 1);
    if (row.region) regions.set(row.region, (regions.get(row.region) ?? 0) + 1);
    if (row.mobile_money) rails.set(row.mobile_money, (rails.get(row.mobile_money) ?? 0) + 1);
  }
  const show = (title, map) => {
    console.log(`\n  ${title}`);
    if (map.size === 0) return console.log("    (none recorded)");
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`    ${String(v).padStart(4)}  ${k}`));
  };
  console.log("");
  show(`total ${rows.length}`, byRole);
  show("region", regions);
  show("mobile money already held", rails);
  console.log("");
}

const { issueInvite } = await import("../web/src/lib/server/invites.ts");

async function invite() {
  // Imported here rather than at module load so `list` and `stats` do not pull in
  // the signing code, and so a signing problem cannot stop somebody reading their list.
  const { issueInvite } = await import("../web/src/lib/server/invites.ts");
  const dryRun = flag("dry-run");
  const limit = Number.parseInt(option("limit", "1"), 10);
  // argv[2] is the subcommand itself, so a positional address is argv[3]. Reading
  // argv[2] here silently stored the literal string "invite" as the bound email,
  // which produced a valid code that described itself as an open invite and was
  // therefore forwardable. The signature verified, so nothing failed loudly.
  const candidate = process.argv[3];
  const single = candidate === undefined || candidate.startsWith("--") ? undefined : candidate;

  /** Prints a code block ready to paste into the email template. */
  const emit = (entry, invite) => {
    const who = `${entry.email}${entry.region ? ` (${entry.region})` : ""}`;
    console.log(`\n  ${who}`);
    if (dryRun) {
      console.log("    DRY RUN, nothing was created");
      return;
    }
    console.log(`    code      ${invite.code}`);
    console.log(`    link      https://sluice-beryl.vercel.app${invite.url}`);
    console.log(`    uses      1, expires ${invite.expiresAt.slice(0, 10)}`);
  };

  if (single !== undefined && !single.startsWith("--")) {
    emit({ email: single }, await issueInvite({ email: single }));
    return;
  }

  const role = option("role");
  const targets = await query(
    "waitlist_signups?role=eq." +
      encodeURIComponent(role ?? "all") +
      "&invited_at=is.null&activated_at=is.null&select=email,region&order=created_at.asc&limit=" +
      limit,
  );
  if (targets.length === 0) {
    console.log("\n  Nobody matches. Nobody is promoted from a list that is not there to promote from.\n");
    return;
  }
  console.log(`\n  ${dryRun ? "Would invite" : "Inviting"} ${targets.length}:`);
  for (const target of targets) {
    emit(target, await issueInvite({ email: target.email }));
  }
}

const command = process.argv[2];

try {
  if (command === "list") await list();
  else if (command === "stats") await stats();
  else if (command === "invite") await invite();
  else {
    console.log("\n  node scripts/waitlist.mjs list [--role member]");
    console.log("  node scripts/waitlist.mjs stats");
    console.log("  node scripts/waitlist.mjs invite <email>");
    console.log("  node scripts/waitlist.mjs invite --role member --limit 5 [--dry-run]\n");
  }
} catch (cause) {
  console.error(`\n  ${cause instanceof Error ? cause.message : cause}\n`);
  process.exit(1);
}
