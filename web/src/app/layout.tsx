import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import { Providers } from "@/components/layout/Providers";
import { ConnectModalProvider } from "@/components/layout/ConnectModal";
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
  // The gate mark from Logo/, cut out of its own gradient background and trimmed to
  // its bounding box. A favicon is the one piece of brand a visitor sees before they
  // decide whether to read anything, so it is the real mark rather than a generated
  // placeholder.
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
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
          {/*
            The connect modal is mounted here, in the root layout, and not in each
            page.

            It has to wrap the chrome as well as the page content, because the nav's
            "Connect wallet" button is the one entry point most visitors use and it
            lives in `Nav`, above any page-level provider. The provider was mounted in
            each `page.tsx`, so the nav button resolved `useConnectModal` against the
            default context whose `openModal` is a no-op. Clicking it did nothing at
            all, silently, with no error anywhere.

            A provider that a button above it cannot see is a provider in the wrong
            place, and mounting it once at the root also means the modal is a single
            instance shared across client navigations rather than one per route.
          */}
          <ConnectModalProvider>
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
          </ConnectModalProvider>
        </Providers>
      </body>
    </html>
  );
}
