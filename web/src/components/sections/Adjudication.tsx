'use client';

/**
 * Section 5: Adjudication.
 *
 * A `tabbed-feature-explorer` across four tabs, each pairing a claim with a coded
 * SVG. The panel swap uses `AnimatePresence mode="wait"`, and the exit is shorter
 * than the enter so the transition feels like a change of state rather than a
 * stall.
 */

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { tabVariants } from "@/lib/motion";
import {
  MarketVisual,
  QuestionVisual,
  ResolutionVisual,
  SettlementVisual,
} from "./AdjudicationVisuals";

interface Tab {
  id: string;
  label: string;
  title: string;
  body: string;
  Visual: typeof QuestionVisual;
}

const TABS: Tab[] = [
  {
    id: "question",
    label: "The question",
    title: "One question, answerable by a machine",
    body:
      "Each tranche is tied to a single binary question with a named verifier and a deadline. Did the fleet complete four hundred and eighty deliveries in the quarter. Did the royalty statement clear sixty thousand dollars. Ambiguous questions are rejected at issuance, because a market cannot price a question it cannot resolve.",
    Visual: QuestionVisual,
  },
  {
    id: "market",
    label: "The market",
    title: "Anyone may trade it, so the price means something",
    body:
      "A binary market opens on the question. YES and NO are priced in cents. There is no committee and no vote. The people closest to the asset carry the most information, and the price is where that information ends up.",
    Visual: MarketVisual,
  },
  {
    id: "resolution",
    label: "The resolution",
    title: "Resolution is mechanical, not discretionary",
    body:
      "At the deadline the verifier reports, the market resolves, and the result is written to the settlement account. If the verifier fails to report within the grace window, the tranche resolves no by default and capital routes to redemption. Silence is not ambiguity.",
    Visual: ResolutionVisual,
  },
  {
    id: "settlement",
    label: "The settlement",
    title: "Capital moves the moment it resolves",
    body:
      "On yes, the tranche releases to the issuer on its vesting schedule. On no, remaining capital goes to the redemption vault and holders claim pro rata against what they hold. No negotiation, no recovery process, no one to chase.",
    Visual: SettlementVisual,
  },
];

export function Adjudication() {
  const [active, setActive] = useState(TABS[0]?.id ?? "question");
  const current = TABS.find((tab) => tab.id === active) ?? TABS[0];
  const Visual = current?.Visual ?? QuestionVisual;

  return (
    <section
      id="adjudication"
      data-section-name="Adjudication"
      className="bg-[var(--bg-primary)] px-6 py-24 md:px-10 md:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-4xl">
            How a milestone is settled
          </h2>
          <p className="mt-4 max-w-[58ch] font-body text-base leading-relaxed text-[var(--text-secondary)]">
            One question, one market, one resolution. The outcome moves capital without
            anyone needing to be trusted.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="How a milestone is settled"
          className="mt-12 flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)]"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={active === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={`-mb-px whitespace-nowrap border-b-2 px-5 py-3 font-body text-sm font-medium transition-colors duration-200 ${
                active === tab.id
                  ? "border-[var(--accent)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            role="tabpanel"
            id={`panel-${active}`}
            aria-labelledby={`tab-${active}`}
            className="mt-12 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14"
            variants={tabVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div>
              <h3 className="font-display text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)] md:text-3xl">
                {current?.title}
              </h3>
              <p className="mt-4 max-w-[52ch] font-body text-base leading-relaxed text-[var(--text-secondary)]">
                {current?.body}
              </p>
            </div>

            <div className="overflow-hidden rounded-[--radius-lg] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <Visual className="h-auto w-full" />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
