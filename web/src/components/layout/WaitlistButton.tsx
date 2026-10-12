/**
 * The nav's primary call to action.
 *
 * Sluice is not open. The terminal runs on devnet, the groups surface does not
 * exist, and a site that puts "Connect wallet" in the nav is telling a visitor
 * something untrue about what is there to connect to.
 *
 * So the nav leads to the waitlist rather than to a wallet prompt, and the wallet
 * prompt moves to where a wallet is actually needed: inside `/app`, behind the
 * gate. Somebody already in the beta who has connected before still finds their
 * wallet in the app exactly where they left it.
 *
 * Deliberately a link and not a button that opens a modal. A modal is the shape
 * for "choose from things you already have", and this is not that: it is one
 * destination, and a link says so, gets middle-click, works without JavaScript, and
 * survives being opened before hydration.
 */

export function WaitlistButton({ label = "Join waitlist" }: { label?: string }) {
  return (
    <a
      href="/waitlist"
      className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--accent)] bg-[var(--accent-glow)] px-4 py-2 font-mono text-xs text-[var(--accent-text)] transition-colors duration-200 hover:bg-[var(--accent)] hover:text-[var(--bg-primary)] md:px-3.5"
    >
      {label}
    </a>
  );
}
