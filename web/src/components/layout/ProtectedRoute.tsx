'use client';

/**
 * The route gate.
 *
 * `/app` and every nested route render only while a session exists. Two rules from
 * §2.1 drive the whole component:
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
 */

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { GateSkeleton, useSession } from "./useSession";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  // A session is either known to exist, known not to exist, or not yet known. The
  // third case is the only one that must not trigger a redirect.
  const settled = session.ready && session.isReconnecting === false;

  useEffect(() => {
    if (!settled) return;
    if (session.authenticated) return;
    router.replace("/?disconnected=1");
  }, [settled, session.authenticated, router]);

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

  return <>{children}</>;
}
