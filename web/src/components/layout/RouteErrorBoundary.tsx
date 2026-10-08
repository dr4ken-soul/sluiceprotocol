'use client';

/**
 * The route error boundary.
 *
 * §2.1 requires a branded recovery screen with retry and return-home actions, and
 * that it never renders a raw stack trace or a blank screen. A blank screen is the
 * worse of the two failures: it looks like the app crashed, whereas a stack trace
 * looks like it shipped broken.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors in the route subtree.
 *
 * `getDerivedStateFromError` records the failure and `componentDidCatch` logs it.
 * The message is deliberately not rendered, because an error message can carry
 * internal detail that has no business being on a public page.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Server-side log only. Never surfaced in the rendered tree.
    console.error("[sluice] route error", error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;

    if (error === null) return this.props.children;

    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Something went wrong
        </p>
        <h1 className="max-w-[24ch] font-display text-3xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
          This screen could not load
        </h1>
        <p className="max-w-[52ch] font-body text-sm leading-relaxed text-[var(--text-secondary)]">
          Nothing on chain has changed. Reload the screen, or go back to the landing page
          and try again from there.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="min-h-[44px] rounded-full bg-[var(--accent)] px-6 py-3 font-mono text-sm font-medium text-[var(--bg-primary)] transition-colors duration-200 hover:bg-[var(--accent-hover)]"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--border-default)] px-6 py-3 font-mono text-sm text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)]"
          >
            Return home
          </a>
        </div>
      </div>
    );
  }
}
