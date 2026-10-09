/**
 * The landing page.
 *
 * Eight sections in the order `FRONTEND_SPEC.md` fixes, plus the footer as chrome.
 * Hero, Problem, Mechanism, Marketplace, Adjudication, Compliance, Metrics, Final CTA.
 *
 * Two eyebrows across the eight sections, on Mechanism and Compliance, with a gap of
 * at least two sections between them. Eight distinct layout families, none repeated.
 */

import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import { Hero } from "@/components/sections/Hero";
import { Problem } from "@/components/sections/Problem";
import { Mechanism } from "@/components/sections/Mechanism";
import { Marketplace } from "@/components/sections/Marketplace";
import { Adjudication } from "@/components/sections/Adjudication";
import { Compliance } from "@/components/sections/Compliance";
import { Metrics } from "@/components/sections/Metrics";
import { FinalCta } from "@/components/sections/FinalCta";
import { Footer } from "@/components/sections/Footer";

export default function LandingPage() {
  return (
      <RouteErrorBoundary>
        {/* The skip link targets this, so it is the one focusable landmark. */}
        <main id="main">
          <Hero />
          <Problem />
          <Mechanism />
          <Marketplace />
          <Adjudication />
          <Compliance />
          <Metrics />
          <FinalCta />
        </main>
        <Footer />
      </RouteErrorBoundary>
  );
}
