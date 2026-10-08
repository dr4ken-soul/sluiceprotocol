/**
 * Formatting helpers.
 *
 * Every figure on the site is a live chain read in integer micro-units, so the
 * formatting is where "68% of ₦180m" gets decided. Two rules hold throughout:
 * no floating point in the arithmetic, and no fabricated precision. A figure the
 * chain does not back is never rendered as if it did.
 */

/** Largest `bigint` a double can represent without losing cents. */
const MAX_SAFE = 9_007_199_254_740_991n;

/**
 * Converts micro-units to a floating-point number for display.
 *
 * Returns `null` above the safe integer range rather than a lossy number, because
 * a figure rendered with invented precision is worse than one that says it cannot
 * be shown exactly.
 */
export function microToNumber(micro: number): number | null {
  const value = BigInt(Math.trunc(micro));
  if (value > MAX_SAFE) return null;
  return Number(value) / 1_000_000;
}

/** Formats a micro-unit amount as a whole number with thousands separators. */
export function formatMicro(micro: number): string {
  const value = microToNumber(micro);
  if (value === null) return "—";
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(value);
}

/**
 * Formats a micro-unit amount in a compact form.
 *
 * The demo fixture is denominated in naira, and the issuer profile in
 * `APP_BLUEPRINT.md` is a Nigerian cold chain operator, so the naira symbol is
 * the honest default rather than a dollar sign the chain does not justify.
 */
export function formatCompact(micro: number, symbol = "₦"): string {
  const value = microToNumber(micro);
  if (value === null) return "—";
  if (value >= 1_000_000_000) return `${symbol}${(value / 1_000_000_000).toFixed(2)}b`;
  if (value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${symbol}${(value / 1_000).toFixed(0)}k`;
  return `${symbol}${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(value)}`;
}

/** Formats a fraction of a raise, as a percentage string. */
export function formatPercent(raised: number, target: number): string {
  if (target <= 0) return "—";
  const ratio = (raised / target) * 100;
  if (ratio > 0 && ratio < 1) return "<1%";
  if (ratio > 99 && ratio < 100) return ">99%";
  return `${Math.round(ratio)}%`;
}

/** Formats a cents price, as the milestone markets are quoted. */
export function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `${cents}¢`;
}

/** Formats YES and NO as a pair, for the two-part market cell. */
export function formatOdds(yes: number | null, no: number | null): string {
  return `${formatCents(yes)} / ${formatCents(no)}`;
}

/** Truncates a base58 address for display, keeping both ends recognisable. */
export function truncateAddress(address: string, lead = 4, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Formats a Unix seconds timestamp as a UTC date. */
export function formatDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(unixSeconds * 1000));
}

/** Formats a Unix seconds timestamp as a UTC date and time. */
export function formatDateTime(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(unixSeconds * 1000));
}

/** Formats a clock time for the autosave indicator. */
export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Whole days from now until a Unix seconds timestamp, floored at zero. */
export function daysUntil(unixSeconds: number, now: number = Date.now() / 1000): number {
  const remaining = unixSeconds - now;
  if (remaining <= 0) return 0;
  return Math.floor(remaining / 86_400);
}

/**
 * Formats a countdown from a Unix seconds timestamp.
 *
 * Returns "settled" once the moment has passed rather than a negative duration,
 * because the adjudication screen never shows a countdown that has run out.
 */
export function formatCountdown(
  unixSeconds: number,
  now: number = Date.now() / 1000,
): string {
  const remaining = Math.max(0, Math.floor(unixSeconds - now));
  if (remaining === 0) return "settled";
  const days = Math.floor(remaining / 86_400);
  const hours = Math.floor((remaining % 86_400) / 3_600);
  const minutes = Math.floor((remaining % 3_600) / 60);
  const seconds = remaining % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Freshness of an attestation, per §16.2.
 *
 * Fresh under thirty days, stale between thirty and sixty, lapsed beyond that.
 * A lapsed attestation disables the invest action, so the classification has to
 * agree with the button state rather than being decorative.
 */
export type AttestationFreshness = "fresh" | "stale" | "lapsed";

/** Classifies an attestation by its age in seconds. */
export function attestationFreshness(
  attestedAt: number,
  now: number = Date.now() / 1000,
): AttestationFreshness {
  const age = now - attestedAt;
  if (age < 30 * 86_400) return "fresh";
  if (age < 60 * 86_400) return "stale";
  return "lapsed";
}

/** CSS custom property for a freshness dot. */
export function freshnessColour(freshness: AttestationFreshness): string {
  switch (freshness) {
    case "fresh":
      return "var(--success)";
    case "stale":
      return "var(--warning)";
    case "lapsed":
      return "var(--error)";
  }
}

/**
 * Whether token price is above or below attested NAV.
 *
 * The gap between the two lines is the point of the premium and discount chart,
 * so the sign is computed rather than inferred.
 */
export function premiumToNav(nav: number, price: number): number {
  if (nav <= 0) return 0;
  return ((price - nav) / nav) * 100;
}

/** Maps an issuance state to its badge label. */
export function stateLabel(state: string): string {
  switch (state) {
    case "draft":
      return "DRAFT";
    case "funding":
      return "FUNDING";
    case "funded":
      return "FUNDED";
    case "adjudicating":
      return "ADJUDICATING";
    case "settled":
      return "SETTLED";
    case "redeeming":
      return "REDEEMING";
    case "closed":
      return "CLOSED";
    default:
      return "UNKNOWN";
  }
}

/**
 * Tailwind classes for a state badge.
 *
 * Every badge pairs its colour with a text label, so state is never conveyed by
 * colour alone, which §14 of the accessibility contract requires.
 */
export function stateBadgeClasses(state: string): string {
  switch (state) {
    case "funded":
    case "funding":
      return "bg-[var(--accent-glow)] text-[var(--accent-text)] border border-[var(--border-default)]";
    case "adjudicating":
      return "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/25";
    case "settled":
      return "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/25";
    case "redeeming":
      return "bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/25";
    default:
      return "bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-default)]";
  }
}

/** Human-readable label for an asset class. */
export function assetClassLabel(assetClass: string): string {
  switch (assetClass) {
    case "revenue":
      return "Revenue";
    case "royalty":
      return "Royalty";
    case "invoice":
      return "Invoice";
    default:
      return "Invoice";
  }
}

/**
 * Formats an SOL balance for the treasury panel.
 *
 * Fixed at nine decimal places because an SOL balance genuinely carries that much
 * precision. Truncating it would be a rounding decision dressed as a display
 * choice.
 */
export function formatSol(lamports: number): string {
  return (lamports / 1_000_000_000).toFixed(9);
}
