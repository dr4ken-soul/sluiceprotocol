'use client';

/**
 * The six step issuance wizard.
 *
 * The step rail is mandatory rather than optional: `FRONTEND_SPEC.md` §16.3 notes
 * that a multi-step flow over two steps must show progress, and this one has six.
 *
 * Drafts autosave to the **server**, never to the browser. `FRONTEND_SPEC.md` §2.2
 * resolves a conflict between the general frontend guidance to autosave long forms to
 * `localStorage` and this project's ban on it, and the server wins. A draft is
 * keyed by user id, so it is restorable from another device and survives a cleared
 * browser.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/layout/useSession";
import { useDraftAutosave } from "@/hooks/useLiveData";
import { emptyDraft, type IssuanceDraft } from "@/lib/types";
import { formatClock } from "@/lib/format";
import { issuanceCreationFee } from "@/lib/env";
import { loadDraft } from "@/lib/api";
import { PrimaryButton, SecondaryButton } from "@/components/ui";
import { StepRail, STEPS } from "./StepRail";
import {
  StepAsset,
  StepCompliance,
  StepCurve,
  StepMilestones,
  StepReview,
  StepValuation,
} from "./steps";

export function IssueWizard() {
  const session = useSession();
  const [draft, setDraft] = useState<IssuanceDraft>(emptyDraft);
  const [step, setStep] = useState(1);
  const [restored, setRestored] = useState(false);

  // The draft is saved on step change and on blur, so a half-finished long form is
  // recoverable without a manual save button.
  const { status, savedAt } = useDraftAutosave(
    session.authenticated ? session.address : null,
    draft,
    true,
  );

  // Restore the draft on first load. Server only, never browser storage.
  useEffect(() => {
    if (session.address === null || restored) return;
    let cancelled = false;
    void loadDraft(session.address)
      .then((saved) => {
        if (cancelled || saved === null) return;
        const parsed = saved as Partial<IssuanceDraft>;
        if (typeof parsed !== "object") return;
        setDraft((current) => ({ ...current, ...parsed }));
        if (typeof parsed.step === "number") {
          setStep(Math.min(STEPS.length, Math.max(1, parsed.step)));
        }
        setRestored(true);
      })
      .catch(() => {
        // A failed restore is not worth blocking the wizard for. The user starts
        // from an empty draft and the autosave will overwrite on the next change.
        setRestored(true);
      });
    return () => {
      cancelled = true;
    };
  }, [session.address, restored]);

  const update = useCallback((patch: Partial<IssuanceDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const goTo = useCallback((next: number) => {
    setStep(Math.min(STEPS.length, Math.max(1, next)));
    update({ step: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [update]);

  const autosaveLabel = useMemo(() => {
    if (status === "saving") return "Saving";
    if (status === "error") return "Draft not saved";
    if (savedAt !== null) return `Draft saved ${formatClock(savedAt)}`;
    return "Draft autosaves to the server";
  }, [status, savedAt]);

  const fee = useMemo(
    () => issuanceCreationFee(draft.target ?? 0),
    [draft.target],
  );

  return (
    <main id="main">
      <StepRail current={step} onSelect={goTo} completedThrough={draft} />

      <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)] md:text-3xl">
            {STEPS[step - 1]?.label ?? "Issue"}
          </h1>
          <p
            aria-live="polite"
            className="font-mono text-[11px] text-[var(--text-muted)]"
            style={{ color: status === "error" ? "var(--error)" : undefined }}
          >
            {autosaveLabel}
          </p>
        </div>

        {step === 1 ? <StepAsset draft={draft} update={update} /> : null}
        {step === 2 ? <StepValuation draft={draft} update={update} /> : null}
        {step === 3 ? <StepCompliance draft={draft} update={update} /> : null}
        {step === 4 ? <StepCurve draft={draft} update={update} /> : null}
        {step === 5 ? <StepMilestones draft={draft} update={update} /> : null}
        {step === 6 ? <StepReview draft={draft} fee={fee} /> : null}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            disabled={step === 1}
            className="min-h-[44px] font-mono text-sm text-[var(--text-secondary)] transition-colors duration-200 hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          {step < STEPS.length ? (
            <PrimaryButton onClick={() => goTo(step + 1)}>Continue</PrimaryButton>
          ) : (
            <SecondaryButton onClick={() => goTo(step - 1)}>Back to milestones</SecondaryButton>
          )}
        </div>
      </div>
    </main>
  );
}
