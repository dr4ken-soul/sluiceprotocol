'use client';

/**
 * The disconnect toast.
 *
 * §2.1 requires it to slide down, auto-dismiss after four seconds, and clear the
 * router state after reading so a refresh does not bring it back. All three matter
 * because the alternative is a toast that reappears every time the user reloads
 * while wondering why.
 */

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function DisconnectToast() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [visible, setVisible] = useState(false);

  const flag = params.get("disconnected");

  useEffect(() => {
    if (flag !== "1") return;
    setVisible(true);

    // Clear the query so a refresh does not re-show the toast.
    router.replace(pathname, { scroll: false });

    const timer = window.setTimeout(() => setVisible(false), 4_000);
    return () => window.clearTimeout(timer);
  }, [flag, pathname, router]);

  /*
   * Two different events used to arrive under one flag, and only one of them is a
   * disconnection.
   *
   * `ProtectedRoute` redirects here after it decides there is no session. That is
   * true both when a wallet was connected and has since gone, and when there was
   * never a wallet at all, which is the common case for a visitor who clicked a
   * link before connecting. Telling the second group "Wallet disconnected. Your
   * positions stay on chain." is a false statement about state they never had.
   *
   * The gate now intercepts those clicks and opens the connect modal instead of
   * navigating, so this path is reached far less often. It is still reachable by
   * hand, so it is handled: `neverConnected` says which of the two happened.
   */
  const neverConnected = flag === "1" && params.get("hadSession") !== "1";

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          role="status"
          aria-live="polite"
          className="fixed left-1/2 top-20 z-toast -translate-x-1/2 rounded-full border border-[var(--border-default)] bg-[var(--bg-elevated)]/95 px-5 py-3 backdrop-blur-xl"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-body text-xs text-[var(--text-secondary)]">
            {neverConnected
              ? "Connect a wallet to open the terminal."
              : "Wallet disconnected, your positions stay on chain"}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
