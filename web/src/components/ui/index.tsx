/**
 * Small shared primitives.
 *
 * Icons are inline SVG or Material Icons only. `FRONTEND_SPEC.md` §1.7 bans emoji
 * as UI elements, bans third-party icon libraries including Lucide and Heroicons,
 * and requires an `aria-label` on every icon-only button, which is why these are
 * components with names rather than raw SVG pasted at each call site.
 */

import type { ReactNode } from "react";
import type { LiveIssuance } from "@/lib/types";
import { stateBadgeClasses, stateLabel } from "@/lib/format";

/** Props shared by every icon. */
interface IconProps {
  /** Accessible name. Required by §14 for any icon carrying meaning. */
  label: string;
  className?: string;
}

function Svg({ label, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      role="img"
      aria-label={label}
      className={className ?? "h-5 w-5"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={false}
    >
      {children}
    </svg>
  );
}

/** A tick, for completed steps. */
export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

/** A chevron, for disclosures and the wallet menu. */
export function ChevronIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  );
}

/** A copy affordance. */
export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

/** A confirmed copy state, shown for 1.8s after copying. */
export function CheckCircleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Svg>
  );
}

/** An external link, for the explorer. */
export function ExternalIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Svg>
  );
}

/** A shield, for the compliance transfer hook. */
export function ShieldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 4 6v6c0 4.5 3.2 8.2 8 9 4.8-.8 8-4.5 8-9V6l-8-3Z" />
    </Svg>
  );
}

/** A signature, for the attestation panel. */
export function SignatureIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 17c3-1 4-10 6-10s2 8 4 8 2-5 4-5 1 4 4 3" />
    </Svg>
  );
}

/** A clock, for a settlement cadence. */
export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

/** A globe, for a jurisdiction. */
export function GlobeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
    </Svg>
  );
}

/** A close affordance, for the connection modal and mobile overlay. */
export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  );
}

/**
 * A state badge.
 *
 * The label is always rendered beside the colour, because §14 forbids conveying
 * state by colour alone.
 */
export function StateBadge({ state }: { state: LiveIssuance["state"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${stateBadgeClasses(state)}`}
    >
      {stateLabel(state)}
    </span>
  );
}

/**
 * The DEMO tag.
 *
 * Rendered wherever a figure comes from the seeded fixture. `FRONTEND_SPEC.md` §1.8
 * is explicit that unlabelled invented figures are a compliance problem in a product
 * handling other people's money, so this is never conditional on aesthetics.
 */
export function DemoTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border-default)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
      Demo
    </span>
  );
}

/** A live indicator dot. */
export function LiveDot({ colour = "var(--success)" }: { colour?: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse-dot rounded-full"
      style={{ backgroundColor: colour }}
    />
  );
}

/**
 * A shimmer placeholder.
 *
 * §1.8 requires a skeleton shimmer for loading and bans spinners, because a
 * spinner tells the reader nothing about the shape of what is arriving.
 */
export function Skeleton({
  className = "",
  rows = 1,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="relative overflow-hidden rounded-[--radius-md] bg-[var(--bg-elevated)]"
          style={{ height: "3.5rem" }}
        >
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-[var(--bg-surface)] to-transparent" />
        </div>
      ))}
    </div>
  );
}

/**
 * An empty state.
 *
 * Rendered when a surface genuinely has nothing, never as a stand-in for an error.
 * The distinction matters: an empty marketplace and a broken indexer look identical
 * if both render this, so the error path has its own component.
 */
export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="py-16 text-center">
      <p className="mx-auto max-w-[46ch] font-body text-sm text-[var(--text-secondary)]">{message}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/**
 * An explicit error state.
 *
 * Distinct from {@link EmptyState} on purpose, and it says what failed and what to
 * do next. §14 requires errors to state the cause and the fix, and §1.8 requires
 * that a surface never present stale or absent data as if it were real.
 */
export function ErrorState({
  title,
  detail,
  onRetry,
}: {
  title: string;
  detail: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[--radius-lg] border border-[var(--error)]/30 bg-[var(--error)]/5 p-6 text-center"
    >
      <p className="font-body text-sm font-semibold text-[var(--error)]">{title}</p>
      <p className="mx-auto mt-2 max-w-[52ch] font-body text-xs text-[var(--text-secondary)]">
        {detail}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center rounded-full border border-[var(--border-default)] px-4 py-2 font-mono text-xs text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)]"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

/**
 * The primary call to action.
 *
 * One component so the accent usage stays under the ten percent of surface the
 * colour strategy allows. Accent text on dark surfaces uses `--accent-text`,
 * because `--accent` alone does not clear 4.5:1 against `--bg-primary`.
 */
export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3.5 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_0_30px_oklch(0.55_0.18_42_/_0.22)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** A secondary call to action, outlined rather than filled. */
export function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--border-default)] px-7 py-3.5 font-mono text-sm text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

/** A text-only button, for tertiary actions. */
export function TextButton({
  children,
  onClick,
  className = "",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`min-h-[44px] font-mono text-xs text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--accent-text)] ${className}`}
    >
      {children}
    </button>
  );
}
