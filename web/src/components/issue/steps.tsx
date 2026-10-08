'use client';

/**
 * Wizard steps 1 to 6.
 *
 * Step 2 renders the NAV band as a sixteen segment curve preview, which is the whole
 * point of the valuation step: the issuer sees what they are committing to before
 * they commit to it. The sixteen segments and the quadratic shape are computed by
 * the same arithmetic the on-chain curve engine uses, so the preview cannot
 * disagree with what gets written.
 */

import { useMemo } from "react";
import type { AssetClass, IssuanceDraft } from "@/lib/types";
import { formatCompact } from "@/lib/format";
import { FEES, MINIMUM_RAISE_USD, meetsMinimumRaise } from "@/lib/env";
import { SelectInput, TextInput } from "./Field";

interface StepProps {
  draft: IssuanceDraft;
  update: (patch: Partial<IssuanceDraft>) => void;
}

/** Step 1: the asset. */
export function StepAsset({ draft, update }: StepProps) {
  return (
    <div>
      <p className="mb-8 max-w-[58ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        The asset being issued against. This is the claim holders receive, so it should
        describe something measurable rather than something aspirational.
      </p>

      <TextInput
        id="issuer-name"
        label="Issuer name"
        hint="The name shown across the terminal and in every market row."
        value={draft.issuerName}
        placeholder="Lagos Cold Chain Logistics"
        validate={(value) => {
          const trimmed = value.trim();
          if (trimmed.length === 0) {
            return "Enter the issuer's registered name. Holders see this on every screen, so leave it blank and the issuance will read as anonymous.";
          }
          if (trimmed.length < 3) {
            return "Three characters or more. A single or two character name is almost always an abbreviation rather than the registered name.";
          }
          return undefined;
        }}
        onCommit={(value) => update({ issuerName: value })}
      />

      <TextInput
        id="ticker"
        label="Ticker"
        hint="Eight characters or fewer, rendered in a monospace font across the terminal."
        value={draft.ticker}
        placeholder="LCC-01"
        validate={(value) => {
          const trimmed = value.trim();
          if (trimmed.length === 0) {
            return "Enter a ticker. Without one the issuance cannot be linked to from the terminal.";
          }
          if (trimmed.length > 8) {
            return `Shorten it to eight characters or fewer. The on-chain field holds eight bytes, and a longer value would be truncated on chain rather than rejected.`;
          }
          if (!/^[A-Za-z0-9 .-]+$/.test(trimmed)) {
            return "Use letters, digits, spaces, dots or hyphens only. Anything else will not render consistently in the monospace tables.";
          }
          return undefined;
        }}
        onCommit={(value) => update({ ticker: value })}
      />

      <SelectInput
        id="asset-class"
        label="Asset class"
        hint="Determines which comparables the valuation is drawn from."
        value={draft.assetClass}
        options={[
          { value: "revenue", label: "Revenue" },
          { value: "royalty", label: "Royalty" },
          { value: "invoice", label: "Invoice" },
        ]}
        onCommit={(value) => update({ assetClass: value as AssetClass })}
      />

      <TextInput
        id="underlying"
        label="Underlying"
        hint="What the claim is ultimately payable from, for example contracted receivables or a licence agreement."
        value={draft.underlying}
        placeholder="Contracted cold chain receivables, quarterly settlement"
        validate={(value) => {
          if (value.trim().length === 0) {
            return "Describe the underlying. A holder needs to know what they are actually buying a claim on, and an attestation cannot be scoped without it.";
          }
          return undefined;
        }}
        onCommit={(value) => update({ underlying: value })}
      />
    </div>
  );
}

/**
 * Step 2: the valuation, with the sixteen segment curve preview.
 *
 * The band returns a low and a high estimate rather than a single number, and that
 * band is what shapes the curve. The preview renders all sixteen segments with the
 * band overlaid, so changing the band visibly changes the shape.
 */
export function StepValuation({ draft, update }: StepProps) {
  const band = useMemo(() => {
    const low = draft.navLow ?? 0;
    const high = draft.navHigh ?? 0;
    if (low <= 0 || high <= low) return null;
    return { low, high };
  }, [draft.navLow, draft.navHigh]);

  const segments = useMemo(() => {
    if (band === null) return null;
    const supply = draft.supply ?? 16_000_000;
    const allocation = Math.floor(supply / 16);

    // The quadratic placement, matching `sluice_core_math::curve`: the curve opens at
    // the low bound and steepens toward the high one.
    const base = Array.from({ length: 16 }, (_, index) => {
      const t = index / 15;
      return band.low + (band.high - band.low) * t * t;
    });
    const baseTotal = base.reduce((total, price) => total + price * allocation, 0);
    const target = draft.target ?? 0;

    return base.map((price) => (baseTotal === 0 ? 0 : (price * target) / baseTotal));
  }, [band, draft.supply, draft.target]);

  return (
    <div>
      <p className="mb-8 max-w-[58ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        The valuation returns a NAV band, not a single number. The band sets the shape of
        a sixteen segment curve, so the opening price is anchored to the estimate rather
        than chosen by hand.
      </p>

      <TextInput
        id="nav-low"
        label="NAV, lower bound"
        hint="Micro-units of the settlement asset. One unit is 1,000,000."
        type="number"
        value={draft.navLow === null ? "" : String(draft.navLow)}
        placeholder="371520000000"
        validate={(value) => {
          const parsed = Number(value);
          if (value.trim().length === 0) {
            return "Enter the lower bound. A curve needs both bounds, and the band is what makes the opening price defensible.";
          }
          if (!Number.isFinite(parsed) || parsed <= 0) {
            return "Enter a positive number of micro-units. Zero would mean the asset is worth nothing, which cannot anchor a curve.";
          }
          return undefined;
        }}
        onCommit={(value) => update({ navLow: value === "" ? null : Number(value) })}
      />

      <TextInput
        id="nav-high"
        label="NAV, upper bound"
        hint="Must exceed the lower bound. The curve steepens toward this figure."
        type="number"
        value={draft.navHigh === null ? "" : String(draft.navHigh)}
        placeholder="495360000000"
        validate={(value) => {
          const parsed = Number(value);
          if (value.trim().length === 0) {
            return "Enter the upper bound. Without it the curve is flat, which carries no confidence interval at all.";
          }
          if (!Number.isFinite(parsed) || parsed <= 0) {
            return "Enter a positive number of micro-units.";
          }
          if ((draft.navLow ?? 0) >= parsed) {
            return `The upper bound must exceed the lower bound of ${draft.navLow}. An inverted band is rejected on chain.`;
          }
          return undefined;
        }}
        onCommit={(value) => update({ navHigh: value === "" ? null : Number(value) })}
      />

      <TextInput
        id="target"
        label="Raise target"
        hint={`Micro-units. The curve reconciles to exactly this figure. The minimum raise is $${MINIMUM_RAISE_USD.toLocaleString("en-GB")}.`}
        type="number"
        value={draft.target === null ? "" : String(draft.target)}
        placeholder="1800000000000"
        validate={(value) => {
          const parsed = Number(value);
          if (value.trim().length === 0) {
            return "Enter a raise target. The curve is normalised to it, so a target is what turns a shape into a raise.";
          }
          if (!Number.isFinite(parsed) || parsed <= 0) {
            return "Enter a positive number of micro-units.";
          }
          if (!meetsMinimumRaise(parsed / 1_000_000)) {
            return `The target must be at least $${MINIMUM_RAISE_USD.toLocaleString("en-GB")}. Below that the $${FEES.issuanceFeeFlatUsd} creation fee would exceed one percent of what you raise. It is rejected at creation on chain as well as here.`;
          }
          return undefined;
        }}
        onCommit={(value) => update({ target: value === "" ? null : Number(value) })}
      />

      <TextInput
        id="supply"
        label="Total supply"
        hint="Whole tokens. Must divide evenly into sixteen segments, or the curve cannot be configured."
        type="number"
        value={draft.supply === null ? "" : String(draft.supply)}
        placeholder="16000000"
        validate={(value) => {
          const parsed = Number(value);
          if (value.trim().length === 0) {
            return "Enter a total supply. Sixteen segments each need an equal token allocation, which the supply has to divide into.";
          }
          if (!Number.isFinite(parsed) || parsed <= 0) {
            return "Enter a positive whole number of tokens.";
          }
          if (parsed % 16 !== 0) {
            return `Reduce or increase the supply to a multiple of sixteen. ${parsed} leaves a remainder, and unequal segment allocations are not bookable on a DBC pool.`;
          }
          return undefined;
        }}
        onCommit={(value) => update({ supply: value === "" ? null : Number(value) })}
      />

      <CurvePreview segments={segments} band={band} target={draft.target ?? 0} />
    </div>
  );
}

/**
 * The sixteen segment curve preview.
 *
 * Each segment is a rounded bar whose height follows the curve shape, accent on
 * funded segments and the border colour on unfunded. The band is overlaid as a
 * shaded region with both bounds labelled, so the relationship between the estimate
 * and the price is visible rather than asserted.
 */
function CurvePreview({
  segments,
  band,
  target,
}: {
  segments: readonly number[] | null;
  band: { low: number; high: number } | null;
  target: number;
}) {
  if (segments === null || band === null) {
    return (
      <div className="mt-8 rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <p className="font-body text-sm text-[var(--text-secondary)]">
          Enter a lower and an upper NAV bound to see the sixteen segment curve this band
          produces.
        </p>
      </div>
    );
  }

  const max = Math.max(...segments, 1);

  return (
    <div className="mt-8 rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <h2 className="font-body text-sm font-semibold text-[var(--text-primary)]">
        Curve preview, sixteen segments
      </h2>

      <svg
        role="img"
        aria-label={`A sixteen segment curve preview. The band runs from ${formatCompact(
          band.low,
        )} to ${formatCompact(band.high)}, and the curve opens at the lower bound and steepens toward the upper bound.`}
        viewBox="0 0 480 180"
        className="mt-4 h-44 w-full"
        fill="none"
      >
        {/* The band overlay. */}
        <rect
          x="0"
          y={180 - (band.high / max) * 160}
          width="480"
          height={((band.high - band.low) / max) * 160}
          fill="var(--accent-glow)"
        />
        <text x="4" y={180 - (band.high / max) * 160 + 12} fill="var(--accent-text)" fontFamily="var(--font-mono)" fontSize="9">
          {formatCompact(band.high)}
        </text>
        <text x="4" y={180 - (band.low / max) * 160 - 4} fill="var(--accent-text)" fontFamily="var(--font-mono)" fontSize="9">
          {formatCompact(band.low)}
        </text>

        {segments.map((price, index) => {
          const height = Math.max(2, (price / max) * 160);
          const x = 8 + index * 29;
          return (
            <rect
              key={index}
              x={x}
              y={180 - height}
              width="22"
              height={height}
              rx="4"
              fill="var(--accent)"
              fillOpacity="0.9"
              stroke="var(--accent)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      <p className="mt-4 font-body text-xs leading-relaxed text-[var(--text-muted)]">
        The curve opens at the lower bound and steepens toward the upper bound. It is a
        range, not a promise.
      </p>
    </div>
  );
}

/** Step 3: the jurisdiction policy. */
export function StepCompliance({ draft, update }: StepProps) {
  // Falls back to the Nigerian policy, which is the beachhead market, rather than
  // leaving the step unreadable for an unrecognised jurisdiction code.
  const policy = POLICY[draft.jurisdiction] ?? POLICY.NG ?? UNKNOWN_POLICY;

  return (
    <div>
      <p className="mb-8 max-w-[58ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        Jurisdiction is configuration. Selecting one loads a policy file, it does not
        require a program change.
      </p>

      <SelectInput
        id="jurisdiction"
        label="Jurisdiction"
        hint="Loads the policy that governs holders, transfer limits and attestation cadence."
        value={draft.jurisdiction}
        options={Object.entries(POLICY).map(([code, entry]) => ({
          value: code,
          label: `${code}, ${entry.name}`,
        }))}
        onCommit={(value) => update({ jurisdiction: value })}
      />

      <div className="rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <h2 className="font-body text-sm font-semibold text-[var(--text-primary)]">
          {policy.name} policy, version {policy.version}
        </h2>
        <dl className="mt-4">
          {[
            ["Who may hold", policy.holders],
            ["Transfer restrictions", policy.transfers],
            ["Holding period", policy.holdingPeriod],
            ["Attestation cadence", policy.attestation],
            ["Revoked at graduation", policy.revocation],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] py-3 first:border-t"
            >
              <dt className="font-body text-xs text-[var(--text-secondary)]">{label}</dt>
              <dd className="max-w-[36ch] text-right font-mono text-xs text-[var(--text-primary)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Step 4: the curve configuration. */
export function StepCurve({ draft, update }: StepProps) {
  return (
    <div>
      <p className="mb-8 max-w-[58ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        The preset supplies the segment layout and the fee scheduler. The valuation band
        from step two still sets the shape, so a preset never overrides the NAV anchor.
      </p>

      <SelectInput
        id="preset"
        label="Curve preset"
        hint="Three presets ship with the protocol. A third-party marketplace is a later phase."
        value={draft.preset}
        options={PRESETS.map((preset) => ({ value: preset.id, label: preset.name }))}
        onCommit={(value) => update({ preset: value })}
      />

      <div className="rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <h2 className="font-body text-sm font-semibold text-[var(--text-primary)]">
          {PRESETS.find((preset) => preset.id === draft.preset)?.name ?? "Preset"}
        </h2>
        <p className="mt-2 max-w-[52ch] font-body text-xs leading-relaxed text-[var(--text-secondary)]">
          {PRESETS.find((preset) => preset.id === draft.preset)?.description}
        </p>
        <p className="mt-4 font-mono text-[11px] text-[var(--text-muted)]">
          Curve set from the band:{" "}
          {draft.navLow !== null && draft.navHigh !== null
            ? `${formatCompact(draft.navLow)} to ${formatCompact(draft.navHigh)}`
            : "no band entered yet"}
        </p>
      </div>
    </div>
  );
}

/** Step 5: the milestones a market will adjudicate. */
export function StepMilestones({ draft, update }: StepProps) {
  return (
    <div>
      <p className="mb-8 max-w-[58ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        Each tranche carries one binary question with a named verifier and a deadline. A
        question that cannot be resolved mechanically is rejected, because a market
        cannot price a question it cannot resolve.
      </p>

      {draft.milestones.map((milestone, index) => (
        <div
          key={index}
          className="mb-6 rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5"
        >
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Tranche {index + 1}
          </h2>

          <TextInput
            id={`question-${index}`}
            label="Question"
            hint="One binary question, answerable by a machine."
            value={milestone.question}
            placeholder="Did the fleet complete 480 contracted deliveries in the quarter?"
            validate={(value) => {
              const trimmed = value.trim();
              if (trimmed.length === 0) {
                return "Every tranche needs a question. A tranche without one cannot be adjudicated, so its capital would never release.";
              }
              if (trimmed.length < 20) {
                return "Make the question specific enough to be checkable. Name a number, a date and a source.";
              }
              const hasNumber = /\d/.test(trimmed);
              const hasDate = /quarter|month|year|day|week/i.test(trimmed);
              const hasSource = /report|statement|attestation|filing|audited|recorded/i.test(trimmed);
              if (!(hasNumber && hasDate && hasSource)) {
                return "A market cannot price a question it cannot resolve. Name a number, a date and a source.";
              }
              return undefined;
            }}
            onCommit={(value) => {
              const next = [...draft.milestones];
              next[index] = { ...next[index]!, question: value };
              update({ milestones: next });
            }}
          />

          <TextInput
            id={`verifier-${index}`}
            label="Named verifier"
            hint="The party accountable for the answer. Silence resolves the tranche no."
            value={milestone.verifier}
            placeholder="Atlas Assurance Partners"
            validate={(value) =>
              value.trim().length === 0
                ? "Name a verifier. Without one, silence is indistinguishable from an unresolved dispute, and the tranche would have nobody to hold to the grace window."
                : undefined
            }
            onCommit={(value) => {
              const next = [...draft.milestones];
              next[index] = { ...next[index]!, verifier: value };
              update({ milestones: next });
            }}
          />

          <TextInput
            id={`deadline-${index}`}
            label="Deadline"
            type="date"
            value={milestone.deadline}
            onCommit={(value) => {
              const next = [...draft.milestones];
              next[index] = { ...next[index]!, deadline: value };
              update({ milestones: next });
            }}
          />

          <TextInput
            id={`tranche-${index}`}
            label="Tranche size, micro-units"
            type="number"
            value={milestone.trancheSize === null ? "" : String(milestone.trancheSize)}
            validate={(value) =>
              value.trim().length > 0 && Number(value) <= 0
                ? "Enter a positive tranche size, or leave it empty to size tranches automatically."
                : undefined
            }
            onCommit={(value) => {
              const next = [...draft.milestones];
              next[index] = {
                ...next[index]!,
                trancheSize: value === "" ? null : Number(value),
              };
              update({ milestones: next });
            }}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          update({
            milestones: [
              ...draft.milestones,
              { question: "", verifier: "", deadline: "", trancheSize: null },
            ],
          })
        }
        className="min-h-[44px] w-full rounded-[--radius-lg] border border-dashed border-[var(--border-default)] px-5 py-4 font-body text-sm text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--accent)] hover:text-[var(--accent-text)]"
      >
        Add another tranche
      </button>
    </div>
  );
}

/** Step 6: the read-only review. */
export function StepReview({ draft, fee }: { draft: IssuanceDraft; fee: number }) {
  const rows: Array<[string, string]> = [
    ["Issuer", draft.issuerName || "Not entered"],
    ["Ticker", draft.ticker || "Not entered"],
    ["Asset class", draft.assetClass],
    ["Underlying", draft.underlying || "Not entered"],
    [
      "NAV band",
      draft.navLow !== null && draft.navHigh !== null
        ? `${formatCompact(draft.navLow)} to ${formatCompact(draft.navHigh)}`
        : "Not entered",
    ],
    ["Raise target", draft.target === null ? "Not entered" : formatCompact(draft.target)],
    ["Supply", draft.supply === null ? "Not entered" : draft.supply.toLocaleString("en-GB")],
    ["Jurisdiction", `${draft.jurisdiction}, ${POLICY[draft.jurisdiction]?.name ?? "Unknown"}`],
    ["Curve preset", PRESETS.find((preset) => preset.id === draft.preset)?.name ?? draft.preset],
    ["Tranches", String(draft.milestones.length)],
    ["Creation fee", `$${fee.toFixed(2)}`],
  ];

  return (
    <div>
      <p className="mb-8 max-w-[58ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
        The final read before signing. The curve configuration and the milestone
        questions cannot be changed after launch, so this is the last point at which
        either can be corrected.
      </p>

      <dl>
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] py-3 first:border-t"
          >
            <dt className="font-body text-xs text-[var(--text-secondary)]">{label}</dt>
            <dd className="max-w-[40ch] text-right font-mono text-xs text-[var(--text-primary)]">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 rounded-[--radius-lg] border border-[var(--warning)]/25 bg-[var(--warning)]/5 p-5">
        <h2 className="font-body text-sm font-semibold text-[var(--warning)]">
          Before you sign
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 font-body text-xs leading-relaxed text-[var(--text-secondary)]">
          <li>
            The curve configuration is written on chain at launch and cannot be changed
            afterwards.
          </li>
          <li>
            The milestone questions and their verifiers are fixed. A question that cannot
            be resolved mechanically would have been rejected at configuration time.
          </li>
          <li>
            A creation fee is deducted from the launch and routed to the treasury inside
            the same transaction.
          </li>
        </ul>

        <button
          type="button"
          disabled
          title="Requires a deployed settlement programme and a funded wallet"
          className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-[var(--accent)] px-7 py-3.5 font-mono text-sm font-medium text-[var(--bg-primary)] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Issue on Meteora DBC
        </button>
        <p className="mt-3 font-mono text-[11px] text-[var(--text-muted)]">
          Disabled. Issuing writes to the settlement programme, which must be deployed
          and the wallet funded. Set the programme IDs and try again.
        </p>
      </div>
    </div>
  );
}

/** Used when the jurisdiction code is not one this build ships a policy file for. */
const UNKNOWN_POLICY = {
  name: "Unrecognised jurisdiction",
  version: 0,
  holders: "Not published for this jurisdiction",
  transfers: "Not published for this jurisdiction",
  holdingPeriod: "Not published for this jurisdiction",
  attestation: "Not published for this jurisdiction",
  revocation: "Not published for this jurisdiction",
};

/** The jurisdiction policy files the compliance step loads. */
interface PolicyFile {
  readonly name: string;
  readonly version: number;
  readonly holders: string;
  readonly transfers: string;
  readonly holdingPeriod: string;
  readonly attestation: string;
  readonly revocation: string;
}

const POLICY: Record<string, PolicyFile> = {
  NG: {
    name: "Nigeria, registered offering",
    version: 1,
    holders: "Registered Nigerian investors, capped at five hundred",
    transfers: "Capped at ₦250m per transfer",
    holdingPeriod: "Ninety days from acquisition",
    attestation: "Every thirty days",
    revocation: "Yes, at graduation",
  },
  US: {
    name: "United States, Reg D 506(c)",
    version: 1,
    holders: "Accredited investors",
    transfers: "Uncapped during the raise",
    holdingPeriod: "None",
    attestation: "Every ninety days",
    revocation: "Yes, at graduation",
  },
  AE: {
    name: "United Arab Emirates, VARA",
    version: 1,
    holders: "Eligible investors under the VARA rulebook",
    transfers: "Capped per transfer, disclosed in the policy file",
    holdingPeriod: "Sixty days from acquisition",
    attestation: "Every sixty days",
    revocation: "Yes, at graduation",
  },
};

/** The three presets that ship with the protocol. */
const PRESETS = [
  {
    id: "standard",
    name: "Standard raise",
    description:
      "Sixteen evenly weighted segments with a linear market cap fee scheduler. The default for an invoice-backed raise.",
  },
  {
    id: "royalty",
    name: "Royalty forward",
    description:
      "A steeper curve with a longer tail, which suits a royalty claim where the cash arrives slowly and the tail matters.",
  },
  {
    id: "short",
    name: "Short raise",
    description:
      "A shallower curve that fills quickly. Suits an invoice whose delivery window is measured in weeks rather than quarters.",
  },
] as const;
