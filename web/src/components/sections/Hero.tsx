'use client';

/**
 * Section 1: Hero.
 *
 * Gate 6, asymmetric editorial with a live issuance card. The headline sits on
 * columns 1 to 6 and is deliberately offset downward; the card sits on columns 7
 * to 12 and is pulled upward, so the two never share a baseline.
 *
 * Below `lg` the grid stacks and the card **leads**, so live proof is the first
 * thing a judge sees on a phone. That is a deliberate inversion of the desktop
 * order rather than an accident of flexbox.
 */

import { useRouter } from "next/navigation";
import { BlurReveal } from "@/lib/motion";
import { useMarketplace } from "@/hooks/useLiveData";
import { useSession } from "@/components/layout/useSession";
import { useConnectModal } from "@/components/layout/ConnectModal";
import { HeroVideo } from "./HeroVideo";
import { IssuanceCard } from "./IssuanceCard";

export function Hero() {
  const router = useRouter();
  const session = useSession();
  const { openModal } = useConnectModal();
  const { data, isLoading } = useMarketplace();

  /**
   * The primary action.
   *
   * Navigates when a session exists, opens the modal when one does not. It never
   * connects directly, because §2.1 requires every entry point to go through the
   * modal so the intermediate states exist.
   */
  const openTerminal = (): void => {
    if (session.authenticated) {
      router.push("/app");
    } else {
      openModal();
    }
  };

  return (
    <section
      data-section-name="Hero"
      className="relative min-h-[100dvh] overflow-hidden bg-[var(--bg-primary)]"
    >
      {/* z-0: the ambient loop. */}
      <HeroVideo />

      {/*
        z-2: the text scrim. Guarantees headline contrast on any frame of the loop
        without constraining how the video is generated.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            "linear-gradient(to right, var(--bg-primary) 0%, color-mix(in oklab, var(--bg-primary) 72%, transparent) 38%, transparent 68%)",
        }}
      />

      {/*
        The grid holds both columns directly. On mobile the source order is reversed
        with `order-*` so the card leads; on desktop the grid columns place the
        headline left and the card right, and `lg:-mt-16` pulls the card up so the
        two never share a baseline.
      */}
      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-20 pt-32 md:px-10 lg:grid-cols-12 lg:gap-10 lg:pb-28 lg:pt-40">
        {/* z-10: the headline block, deliberately offset downward. */}
        <div className="order-2 lg:order-1 lg:col-span-6 lg:flex lg:flex-col lg:justify-center lg:pt-16">
          <h1 className="max-w-[16ch] text-balance font-display text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-[var(--text-primary)]">
            <BlurReveal text="Issue the real asset." className="block" />
            <BlurReveal
              text="The market decides if you keep the money."
              baseDelay={0.55}
              className="block"
            />
          </h1>

          <p className="mt-6 max-w-[46ch] font-body text-base leading-relaxed text-[var(--text-secondary)] md:text-lg">
            Sluice issues invoices, royalties and revenue as tokens on Meteora. A binary
            market checks every milestone, and capital releases only when it resolves in
            your favour.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={openTerminal}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3.5 font-mono text-sm font-medium tracking-wide text-[var(--bg-primary)] transition-all duration-200 hover:bg-[var(--accent-hover)] hover:shadow-[0_0_30px_oklch(0.55_0.18_42_/_0.22)]"
            >
              Open the terminal
            </button>
            <a
              href="#mechanism"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[var(--border-default)] px-7 py-3.5 font-mono text-sm text-[var(--text-primary)] transition-colors duration-200 hover:border-[var(--accent)]"
            >
              See how settlement works
            </a>
          </div>
        </div>

        {/* z-20: the live card, pulled upward on desktop. */}
        <div className="order-1 z-20 flex items-center justify-center lg:order-2 lg:col-span-6 lg:-mt-16">
          <IssuanceCard
            issuance={data?.featured ?? null}
            loading={isLoading}
            onPrimary={openTerminal}
          />
        </div>
      </div>
    </section>
  );
}
