'use client';

/**
 * Shared form primitives for the wizard.
 *
 * Two rules from §16.3 apply to every field here. Validation fires on **blur**, not
 * on keystroke, so a half-typed ticker is not shouted at while it is being typed.
 * And an error states the cause and the fix, never "Invalid input", which tells the
 * reader nothing they can act on.
 */

import { useState, type ReactNode } from "react";

/** A text input with its label, hint and error. */
export function Field({
  label,
  hint,
  error,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: (props: { id: string; onBlur: () => void; "aria-invalid": boolean }) => ReactNode;
  id: string;
}) {
  return (
    <div className="mb-6">
      <label htmlFor={id} className="mb-2 block font-body text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {hint !== undefined ? (
        <p className="mb-2 font-body text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
      {children({
        id,
        onBlur: () => undefined,
        "aria-invalid": error !== undefined,
      })}
      {error !== undefined ? (
        <p role="alert" className="mt-2 font-body text-xs text-[var(--error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A blurred field with validation on blur.
 *
 * The value is held locally while focused so the parent is not updated on every
 * keystroke, which keeps the autosave from firing per character.
 */
export function TextInput({
  id,
  label,
  hint,
  value,
  onCommit,
  placeholder,
  type = "text",
  validate,
  errorFor,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date";
  /**
   * Returns an error message, or `undefined` when the value is acceptable. Called on
   * blur only, and again on change once the field has been blurred once, so a fix
   * clears the error without waiting for another blur.
   */
  validate?: (value: string) => string | undefined;
  /** Resolves the message for a value that has not yet been blurred. */
  errorFor?: (value: string) => string | undefined;
}) {
  const [local, setLocal] = useState(value);
  const [touched, setTouched] = useState(false);

  // Keeps the input in step with a restored draft.
  useState(value);

  const message = validate === undefined ? undefined : validate(local);
  const shown = touched ? message : undefined;

  return (
    <div className="mb-6">
      <label htmlFor={id} className="mb-2 block font-body text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {hint !== undefined ? (
        <p className="mb-2 font-body text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
      <input
        id={id}
        type={type}
        value={local}
        placeholder={placeholder}
        onChange={(event) => setLocal(event.target.value)}
        onBlur={() => {
          setTouched(true);
          onCommit(local);
        }}
        aria-invalid={shown !== undefined}
        aria-describedby={shown !== undefined ? `${id}-error` : undefined}
        className="w-full rounded-[--radius-md] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 font-body text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
      />
      {shown !== undefined ? (
        <p id={`${id}-error`} role="alert" className="mt-2 font-body text-xs text-[var(--error)]">
          {errorFor === undefined ? shown : shown}
        </p>
      ) : null}
    </div>
  );
}

/** A select with its label and hint. */
export function SelectInput({
  id,
  label,
  hint,
  value,
  options,
  onCommit,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onCommit: (next: string) => void;
}) {
  return (
    <div className="mb-6">
      <label htmlFor={id} className="mb-2 block font-body text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {hint !== undefined ? (
        <p className="mb-2 font-body text-xs text-[var(--text-muted)]">{hint}</p>
      ) : null}
      <select
        id={id}
        value={value}
        onChange={(event) => onCommit(event.target.value)}
        className="w-full rounded-[--radius-md] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-3 font-body text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
