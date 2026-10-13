"use client";

/**
 * The waitlist form.
 *
 * Three rules shape this component, and all three come from the same place: this
 * is the screen where somebody decides to trust the project with an email address,
 * so it may not ask for anything the project cannot yet honour.
 *
 * 1. **No wallet, ever, as a requirement.** Sluice's Groups design exists because
 *    the people it is for are not buying SOL to pay gas. Requiring a wallet address
 *    to join a list would exclude exactly the audience the product is built for,
 *    before they have seen a single thing worth using. The field is there and it is
 *    clearly optional, because a person who already has an address should not have
 *    to type it twice.
 * 2. **No countdown, no counter, no scarcity.** The standard waitlist pattern is a
 *    number that goes up and a seat count that goes down, both invented. A fabricated
 *    figure on the one screen a visitor reads before deciding whether this is real is
 *    the exact thing this project should not do.
 * 3. **Nothing stored in the browser.** No draft in `localStorage`, so a half-filled
 *    form is lost on refresh. This is deliberate and it is the same call the
 *    issuance drafts make for the same reason: the list is the project's only record
 *    of who wanted in, and it belongs somewhere that survives the browser.
 */

import { useState } from "react";
import { motion } from "motion/react";

/** The four choices, worded as what you want to do rather than as a job title. */
const ROLES = [
  {
    value: "issuer",
    title: "Get funded",
    body: "You are owed money and you want it financed against the invoice, royalty or revenue, not a bank.",
  },
  {
    value: "investor",
    title: "Fund a claim",
    body: "You back someone else's receivable and want the return adjudicated by a market rather than by trust.",
  },
  {
    value: "member",
    title: "Save with your people",
    body: "You save in a group already, and you want the discipline of the rotation with capital your friends cannot take.",
  },
  {
    value: "all",
    title: "All of it",
    body: "You do not know yet, which is a real answer and the most common one.",
  },
] as const;

/** Solana familiarity. Wording avoids "beginner", which reads as a grade. */
const FAMILIARITY = [
  { value: "never", label: "Never used it" },
  { value: "once", label: "Tried it once" },
  { value: "used", label: "Use it regularly" },
] as const;

/** One field error, or none. */
type FieldErrors = Partial<Record<"email" | "role" | "wallet" | "form", string>>;

/** What the form is doing, so the button can say so. */
type Phase = "idle" | "submitting" | "done" | "already";

/** Shared input styling. Matches the issuance form's field treatment in §3.2. */
const FIELD =
  "w-full rounded-[--radius-md] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 font-body text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none";

export function WaitlistForm() {
  const [role, setRole] = useState<string>("");
  const [email, setEmail] = useState("");
  const [intent, setIntent] = useState("");
  const [region, setRegion] = useState("");
  const [mobileMoney, setMobileMoney] = useState("");
  const [familiarity, setFamiliarity] = useState<string>("");
  const [wallet, setWallet] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});

  /**
   * Hidden from people, visible to naive bots.
   *
   * Nothing here reads the field, and nothing should: a bot that fills it in is
   * ignored by the `if (website.length > 0) return;` below. A visible CAPTCHA
   * would put a wall in front of every real person to stop a problem that is one
   * line of code to avoid.
   */
  const [website, setWebsite] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "submitting") return;

    // Silently accepted, visibly ignored. See above.
    if (website.length > 0) return;

    setPhase("submitting");
    setErrors({});

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          intent,
          region,
          mobileMoney,
          solanaFamiliarity: familiarity,
          wallet,
          // Read at submit rather than on mount, so it survives a shared link.
          referrer: document.referrer === "" ? undefined : document.referrer,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { alreadyOnList?: boolean };
        setPhase(data.alreadyOnList === true ? "already" : "done");
        return;
      }

      const data = (await response.json()) as { error?: { field?: string; message?: string } };
      const field = data.error?.field ?? "form";
      const message = data.error?.message ?? "Something went wrong. Try again.";
      setErrors({ [field]: message } as FieldErrors);
      setPhase("idle");
    } catch {
      // A network failure is not a validation failure and must not be styled as one.
      setErrors({ form: "We could not reach the server. Check your connection and try again." });
      setPhase("idle");
    }
  }

  if (phase === "done" || phase === "already") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-[--radius-lg] border border-[var(--border-default)] bg-[var(--bg-surface)] p-8"
      >
        <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
          {phase === "done" ? "You are on the list." : "You were already on the list."}
        </h2>
        <p className="mt-4 font-body text-sm leading-relaxed text-[var(--text-secondary)]">
          {phase === "done"
            ? "We are releasing Sluice one surface at a time on devnet, starting with issuance. You will hear when the next piece opens, and you will hear before anyone else does."
            : "Nothing was lost and nothing was charged. We already had that address, so there was no reason to add it twice."}
        </p>
        <p className="mt-6 font-mono text-[11px] text-[var(--text-muted)]">
          Devnet only. Nothing here spends real money and no token you see is worth anything.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      {/*
        Role first, and as cards rather than a select.

        It is the question that decides everything after it, so it is asked before
        anybody has typed anything. Cards rather than a dropdown because a select
        hides its options behind a click, and this needs to be readable at a glance
        by someone deciding whether any of it applies to them.
      */}
      <fieldset className="flex flex-col gap-3">
        <legend className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          What would you use Sluice for
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((option) => {
            const selected = role === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-[--radius-md] border p-4 transition-colors ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-glow)]"
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--border-default)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                {/* Native radio, kept for keyboard and screen readers, taken out of the layout. */}
                <input
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={selected}
                  onChange={() => setRole(option.value)}
                  onClick={(event) => {
                    // A native radio ignores a click on an option it has already
                    // checked, so `onChange` never fires and the card cannot be
                    // turned off. Preventing the default here and clearing the state
                    // is what makes it a toggle rather than a one-way door. Verified:
                    // without it, the only way to unselect was to pick a different
                    // card, which is not a thing anyone should have to discover.
                    if (selected) {
                      event.preventDefault();
                      setRole("");
                    }
                  }}
                  className="sr-only"
                />
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-3.5 w-3.5 shrink-0 rounded-full border ${
                      selected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--border-default)]"
                    }`}
                  />
                  <span className="font-display text-sm font-semibold text-[var(--text-primary)]">
                    {option.title}
                  </span>
                </span>
                <span className="mt-2 block font-body text-xs leading-relaxed text-[var(--text-secondary)]">
                  {option.body}
                </span>
              </label>
            );
          })}
        </div>
        {errors.role !== undefined && (
          <p role="alert" className="font-mono text-xs text-[var(--accent-text)]">
            {errors.role}
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="wl-email" className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Email
        </label>
        <input
          id="wl-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          aria-invalid={errors.email !== undefined}
          className={FIELD}
        />
        {errors.email !== undefined && (
          <p role="alert" className="font-mono text-xs text-[var(--accent-text)]">
            {errors.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="wl-intent" className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          What would you issue or fund <span className="normal-case">(optional)</span>
        </label>
        <textarea
          id="wl-intent"
          name="intent"
          rows={3}
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          placeholder="An invoice from a logistics company. Royalty from a record. Rent owed by a tenant."
          className={`${FIELD} resize-y`}
        />
      </div>

      {/*
        Region is free text, not a country picker.

        The groups design depends on which mobile money rails exist where someone
        actually lives, and that map changes faster than a dropdown should. Asking
        for a place rather than a nationality also keeps this usable for someone
        whose funds move along a different route than the one they were born in,
        which for a diaspora savings product is the normal case, not the exception.
      */}
      <div className="flex flex-col gap-2">
        <label htmlFor="wl-region" className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Where you are <span className="normal-case">(town or country, optional)</span>
        </label>
        <input
          id="wl-region"
          name="region"
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          placeholder="Lagos, Nigeria"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="wl-mm" className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Mobile money you already use <span className="normal-case">(optional)</span>
        </label>
        <input
          id="wl-mm"
          name="mobileMoney"
          value={mobileMoney}
          onChange={(event) => setMobileMoney(event.target.value)}
          placeholder="M-Pesa, MTN MoMo, Airtel, none"
          className={FIELD}
        />
        <p className="font-body text-xs leading-relaxed text-[var(--text-muted)]">
          This one is the reason we ask. Saving circles already work because the trust is there; moving the money is the part nobody has solved, so the rail you hold already decides whether any of this is usable by you at all.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Have you used Solana
        </legend>
        <div className="flex flex-wrap gap-2">
          {FAMILIARITY.map((option) => {
            const selected = familiarity === option.value;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-full border px-4 py-2 font-body text-xs transition-colors ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--text-primary)]"
                    : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                }`}
              >
                <input
                  type="radio"
                  name="solanaFamiliarity"
                  value={option.value}
                  checked={selected}
                  onChange={() => setFamiliarity(option.value)}
                  onClick={(event) => {
                    // Same reason as the role cards: a checked native radio swallows
                    // the click, so this is what lets a choice be taken back.
                    if (selected) {
                      event.preventDefault();
                      setFamiliarity("");
                    }
                  }}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/*
        The wallet field, and the reasoning above it.

        Optional, and placed near the end rather than first, because leading with it
        would tell every visitor that Sluice is for people who already have one. It
        is validated for shape on the server and it is never used to authorise
        anything.
      */}
      <div className="flex flex-col gap-2">
        <label htmlFor="wl-wallet" className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Solana wallet <span className="normal-case">(leave blank if you do not have one)</span>
        </label>
        <input
          id="wl-wallet"
          name="wallet"
          value={wallet}
          onChange={(event) => setWallet(event.target.value)}
          placeholder="Optional, and we will help you make one during the beta."
          aria-invalid={errors.wallet !== undefined}
          className={FIELD}
        />
        {errors.wallet !== undefined && (
          <p role="alert" className="font-mono text-xs text-[var(--accent-text)]">
            {errors.wallet}
          </p>
        )}
      </div>

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="wl-website">Website</label>
        <input
          id="wl-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
        />
      </div>

      {errors.form !== undefined && (
        <p role="alert" className="rounded-[--radius-md] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 font-body text-sm text-[var(--accent-text)]">
          {errors.form}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={phase === "submitting"}
          className="rounded-[--radius-md] bg-[var(--accent)] px-6 py-3.5 font-display text-sm font-bold text-[var(--bg-primary)] transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === "submitting" ? "Saving your place" : "Join the waitlist"}
        </button>
        <p className="font-body text-xs leading-relaxed text-[var(--text-muted)]">
          One email, when the next piece opens, nothing else: no newsletter, no sequence, no drip campaign. Reply to it and you are removed, immediately.
        </p>
      </div>
    </form>
  );
}
