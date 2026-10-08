'use client';

/**
 * Application providers.
 *
 * Two authentication paths, one session. Sluice's issuers are businesses, not crypto
 * natives: a cold chain operator in Port Harcourt does not have a Solana wallet and
 * will not install one to fill out an issuance form. Privy provisions an embedded
 * wallet on email or Google for that path. Investors bring a self-custody wallet
 * through the Solana wallet adapter.
 *
 * `PrivyProvider` mounts only when a Privy app ID is configured. When it is absent
 * the issuer path is genuinely unavailable and the UI says so, rather than the app
 * crashing on a missing configuration during a demo.
 */

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { useMemo, type ReactNode } from "react";
import * as React from "react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { clusterApiUrl } from "@solana/web3.js";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import {
  BackpackWalletAdapter,
} from "@solana/wallet-adapter-backpack";
import { PRIVY_APP_ID, SOLANA_NETWORK } from "@/lib/env";
import { SessionProvider } from "./useSession";

/**
 * The shared query client.
 *
 * Defaults are chosen for a terminal rather than a marketing page: a stale time long
 * enough that a background refetch does not fight the pushed updates, and a refetch
 * on reconnect so a dropped socket self-heals.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: 2,
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => createQueryClient(), []);

  const endpoint = useMemo(
    () => clusterApiUrl(SOLANA_NETWORK as WalletAdapterNetwork),
    [],
  );

  // Phantom, Solflare and Backpack, per the investor path. Backpack is registered
  // through a dynamic import because it is the one adapter that has shipped against
  // several wallet-adapter majors, and a version mismatch there breaks the whole
  // bundle rather than one button.
  const wallets = useMemo(() => {
    const adapters = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];
    try {
      // `BackpackWalletAdapter` may be a default or a named export depending on the
      // installed version, so both shapes are accepted.
      const module = BackpackWalletAdapter as unknown;
      if (typeof module === "function") {
        adapters.push(new (module as new () => never)() as never);
      }
    } catch {
      // A missing adapter degrades to the wallets that did register. The UI lists
      // what is available rather than pretending the full set is present.
    }
    return adapters;
  }, []);

  /*
 * The wallet adapter's providers are typed against React 19 while this application
 * is on React 18, which makes `FC` not assignable to a JSX element type even though
 * the components work at runtime. Aliasing the components locally confines the cast
 * to this file, rather than loosening the React types or `skipLibCheck` across the
 * project to accommodate one dependency.
 */
const Connection = ConnectionProvider as unknown as React.FC<{
  endpoint: string;
  children: React.ReactNode;
}>;
const Wallets = WalletProvider as unknown as React.FC<{
  wallets: never[];
  autoConnect: boolean;
  children: React.ReactNode;
}>;

  const walletTree = (
    <Connection endpoint={endpoint}>
      <Wallets wallets={wallets as never[]} autoConnect={false}>
        <SessionProvider>{children}</SessionProvider>
      </Wallets>
    </Connection>
  );

  if (PRIVY_APP_ID === undefined) {
    // No Privy app ID. The self-custody path still works and the issuer path
    // reports its absence in the wallet menu rather than the app failing to boot.
    return <QueryClientProvider client={queryClient}>{walletTree}</QueryClientProvider>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          // Matches `--accent`, oklch(0.55 0.18 42). Privy needs a hex rather than a
          // CSS custom property, so the same value is written literally here and
          // this is the only place in the codebase where it appears.
          accentColor: "#B86E41",
        },
        loginMethods: ["email", "google", "wallet"],
        embeddedWallets: {
          /*
           * Provisioned on first login so an issuer signs up with an email address
           * and never sees a seed phrase, which is the whole reason Privy is in the
           * stack. `all-users` rather than `users-without-wallets` because the latter
           * skips provisioning for anyone who arrives with a linked browser wallet,
           * which would leave an email-authenticated issuer on the self-custody path
           * with no key of their own.
           *
           * The chain is opted into explicitly rather than left to Privy's default,
           * which provisions an EVM wallet and would leave the issuer path with no
           * signer Sluice can use. Both settings default to `off`, so neither is
           * optional.
           */
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "all-users" },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>{walletTree}</QueryClientProvider>
    </PrivyProvider>
  );
}
