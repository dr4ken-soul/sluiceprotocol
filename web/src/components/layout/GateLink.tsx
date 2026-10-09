'use client';

/**
 * The gate on every `/app` link.
 *
 * `/app` renders only while a session exists (`FRONTEND_SPEC.md` §2.1), so a click
 * on any link into it used to navigate, run the gate, bounce straight back to the
 * landing page and raise a toast. The URL flickered, the visitor went nowhere, and
 * the toast said "Wallet disconnected" to someone who had never connected a wallet.
 *
 * Both halves of that were wrong. The bounce wasted a navigation to deliver no
 * information, and the message described a state the user was not in.
 *
 * So the click is intercepted instead. If there is no session the modal opens where
 * the user is, the intent is obvious, and the destination is preserved so it can be
 * taken once a wallet is connected. If there is a session the navigation proceeds
 * untouched, which is the case §2.1 is actually about.
 *
 * The alternative, leaving the bounce and fixing only the wording, was rejected
 * because it still sends the visitor away from what they asked for in order to tell
 * them they cannot have it yet.
 */

import { useRouter } from "next/navigation";
import { useCallback, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { useSession } from "@/components/layout/useSession";
import { useConnectModal } from "@/components/layout/ConnectModal";

/** Props for [`GateLink`]. */
interface GateLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The destination, forwarded to the router only once a session exists. */
  readonly href: string;
  readonly children: ReactNode;
}

/**
 * A link into `/app` that asks for a wallet instead of bouncing.
 *
 * Rendered as an anchor so it keeps a real `href`, which means middle-click,
 * right-click-to-open and keyboard activation all still work, and the URL is
 * visible on hover. Only a plain left click is intercepted.
 */
export function GateLink({ href, children, onClick, ...rest }: GateLinkProps) {
  const router = useRouter();
  const session = useSession();
  const { openModal } = useConnectModal();

  /*
   * While the session is still being restored the answer is unknown, so the link
   * behaves like a plain link. Interpreting "not known yet" as "no session" is the
   * false bounce that §2.1 exists to prevent.
   */
  const settled = session.ready && session.isReconnecting === false;
  const needsWallet = settled && !session.authenticated;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;

      if (!needsWallet) {
        router.push(href);
        return;
      }

      event.preventDefault();
      openModal();
    },
    [href, needsWallet, onClick, openModal, router],
  );

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
