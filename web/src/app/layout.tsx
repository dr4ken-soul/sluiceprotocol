import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { Providers } from "@/components/layout/Providers";
import { Nav } from "@/components/layout/Nav";
import { GrainOverlay } from "@/components/layout/GrainOverlay";
import { DisconnectToast } from "@/components/layout/DisconnectToast";
import "@/styles/globals.css";

/**
 * Root layout.
 *
 * The grain overlay is mounted exactly once here, per §1.5. Mounting it per section
 * would stack several noise layers and change the effective opacity of every one of
 * them, which is a bug that looks like a taste decision.
 */
export const metadata: Metadata = {
  title: "Sluice, Issue the real asset. The market decides if you keep the money.",
  description:
    "Sluice issues invoices, royalties and revenue as tokens on Meteora. A binary market checks every milestone, and capital releases only when it resolves in the issuer's favour.",
  applicationName: "Sluice",
  // No favicon is supplied yet. The slot is left empty rather than filled with a
  // generated icon, because a placeholder mark reads as an unfinished build.
  // favicon slot: replace with public/favicon.ico once provided
  robots: { index: true, follow: true },
  openGraph: {
    title: "Sluice",
    description:
      "Issue claims on real-world cash flow as tokens on Solana, where a binary event market adjudicates every milestone.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#191A1E",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased">
        <Providers>
          {/* Skip to main content. First focusable element on every page, per §14. */}
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <Nav />
          <GrainOverlay />
          {children}
          {/*
            The toast reads the query string to know whether a disconnect just
            happened. Reading search params opts a tree out of static rendering, so
            it is behind a boundary. Without one, every route would be forced to
            render at request time purely to service a toast that is almost never
            shown.
          */}
          <Suspense fallback={null}>
            <DisconnectToast />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
