'use client';

/**
 * Section 8: Final CTA.
 *
 * A centred crescendo. The hero loop returns here as a fixed background layer,
 * mounted as a second instance of the same component at low opacity with no scroll
 * transforms, which §10 requires be reused rather than reimplemented.
 */

import { useRouter } from "next/navigation";
import { Reveal } from "@/lib/motion";
import { useSession } from "@/components/layout/useSession";
import { useConnectModal } from "@/components/layout/ConnectModal";
import { HeroVideo } from "./HeroVideo";

export function FinalCta() {
  const router = useRouter();
  const session = useSession();
  const { openModal } = useConnectModal();

  const openTerminal = (): void => {
    if (session.authenticated) {
      router.push("/app");
    } else {
      openModal();
    }
  };

  return (
    <section
      data-section-name="Final CTA"
      className="relative flex items-center justify-center overflow-hidden bg-[var(--bg-primary)] py-32 md:py-44"
    >
      <HeroVideo subdued />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-6 text-center">
        <Reveal>
          <h2 className="text-balance font-display text-4xl font-extrabold tracking-[-0.03em] leading-[0.95] text-[var(--text-primary)] md:text-5xl lg:text-[3.5rem]">
            Put your first asset on the rail
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mt-5 max-w-md font-body text-base leading-relaxed text-[var(--text-secondary)]">
            Connect a wallet, value an asset, and issue against a market that checks the
            work before it releases the money.
          </p>
        </Reveal>

        <Reveal delay={0.4}>
          <button
            type="button"
            onClick={openTerminal}
            className="mt-9 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-9 py-4 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_0_30px_oklch(0.55_0.18_42_/_0.22)]"
          >
            Open the terminal
          </button>
        </Reveal>
      </div>
    </section>
  );
}
