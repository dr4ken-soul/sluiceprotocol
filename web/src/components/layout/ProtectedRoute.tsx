"use client";

/**
 * The route gate.
 *
 * `/app` and every nested route render only while a session exists AND that
 * session's wallet is in the beta. Two rules from §2.1 drive the first half:
 *
 * - **Never redirect while `ready` or `isReconnecting` is true.** Both mean the
 *   answer is not known yet, and redirecting on "not known" is a false bounce that
 *   throws a connected user onto the landing page on every refresh.
 * - **After a confirmed disconnection, navigate away with the disconnect flag**, so
 *   the landing page can explain what happened rather than leaving the user on a
 *   route that immediately bounces them back.
 *
 * A direct deep link into a nested route with no session renders the branded
 * landing page rather than a host 404, which is why the redirect is a client
 * navigation and not a server 404.
 *
 * ## The second gate
 *
 * Connecting a wallet used to be sufficient. It no longer is: the site says it is
 * not open, so the wallet is not the same thing as a place. Access is now an
 * invite redeemed against that wallet, and this component asks `/api/beta/status`.
 *
 * Three states, not two, and the third is the one that matters:
 *
 * - **not connected** → the existing disconnect redirect, unchanged
 * - **connected, not in the beta** → `/waitlist`, because that is the honest place
 *   to send somebody who has a wallet but no invitation
 * - **connected, in the beta** → render
 *
 * "Unknown" is kept separate from "not in the beta" because they must not look the
 * same. A failed lookup redirects to the waitlist, and a person who *is* in the
 * beta then reads a page telling them they are not, which is both wrong and
 * indistinguishable from the truth to them. So an unknown lookup holds on a
 * skeleton and retries rather than redirecting. It also fails closed: an outage
 * does not open the app, it delays it.
 *
 * The lookup is keyed on the address and is not cached, so redeeming a code and
 * reloading lands in the app with no reload of a stale decision.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { GateSkeleton, useSession } from "./useSession";

/** What `/api/beta/status` can say about a wallet. */
type Access =
  | { readonly state: "unknown" }
  | { readonly state: "checking" }
  | { readonly state: "allowed" }
  | { readonly state: "denied"; readonly reason: string };

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  const [access, setAccess] = useState<Access>({ state: "unknown" });

  // A session is either known to exist, known not to exist, or not yet known. The
  // third case is the only one that must not trigger a redirect.
  const settled = session.ready && session.isReconnecting === false;
  const address = session.authenticated ? session.address : null;

  /**
   * Asks once per address, and clears the answer whenever the address changes so a
   * wallet swap cannot inherit the previous wallet's answer.
   */
  const check = useCallback(async (wallet: string) => {
    setAccess({ state: "checking" });
    try {
      const response = await fetch(`/api/beta/status?address=${encodeURIComponent(wallet)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { allowed?: boolean; reason?: string };
      setAccess(
        data.allowed === true
          ? { state: "allowed" }
          : { state: "denied", reason: data.reason ?? "not-activated" },
      );
    } catch {
      // A failed lookup is "unknown", not "denied". See the header: redirecting on a
      // failure would tell somebody in the beta that they are not in it.
      setAccess({ state: "unknown" });
    }
  }, []);

  useEffect(() => {
    if (!settled) return;
    if (session.authenticated) return;
    router.replace("/?disconnected=1");
  }, [settled, session.authenticated, router]);

  useEffect(() => {
    if (address === null) {
      setAccess({ state: "unknown" });
      return;
    }
    void check(address);
  }, [address, check]);

  // A lookup that failed retries rather than resolving to a denial. Bounded so a
  // database that is genuinely down does not become an infinite request loop, which
  // would be its own kind of outage.
  useEffect(() => {
    if (access.state !== "unknown" || address === null) return;
    const timer = setTimeout(() => void check(address), 3000);
    return () => clearTimeout(timer);
  }, [access.state, address, check]);

  /*
   * A connected wallet that has not redeemed an invite. Redirecting to the waitlist
   * is the honest destination: the site says it is not open, and this person has a
   * wallet but no invitation, so the waitlist is the page that resolves that.
   *
   * Declared with the other effects rather than next to the render that depends on
   * it, because a hook after an early return is called a different number of times
   * on the two paths and React is right to refuse it.
   */
  useEffect(() => {
    if (!settled || !session.authenticated) return;
    if (access.state !== "denied") return;
    router.replace("/waitlist?from=beta");
  }, [settled, session.authenticated, access.state, router]);

  if (!settled) {
    return (
      <GateSkeleton
        label={session.isReconnecting ? "Reconnecting your wallet" : "Restoring your session"}
      />
    );
  }

  if (!session.authenticated) {
    // Rendered for the frame between deciding and navigating, so the route does not
    // flash the gated content on its way out.
    return <GateSkeleton label="Signing you out" />;
  }

  if (access.state !== "allowed") {
    return <GateSkeleton label="Checking your access" />;
  }

  return <>{children}</>;
}
