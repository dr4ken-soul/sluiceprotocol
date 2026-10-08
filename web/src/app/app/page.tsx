import { Suspense } from "react";
import { ConnectModalProvider } from "@/components/layout/ConnectModal";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Terminal } from "@/components/terminal/Terminal";

/**
 * The public risk terminal.
 *
 * The job is to show a holder what they own, what it is worth, and what is happening
 * to it. The structural answer is a value curve over a selectable range plus a
 * filterable holdings table, because those are the two questions a holder actually
 * asks.
 *
 * Static background, grain and hairlines only. No video on any `/app` route.
 */
export default function TerminalPage() {
  return (
    <ConnectModalProvider>
      <RouteErrorBoundary>
        <ProtectedRoute>
          {/* The disconnect toast reads the query string, so it needs a boundary. */}
          <Suspense fallback={null}>
            <Terminal />
          </Suspense>
        </ProtectedRoute>
      </RouteErrorBoundary>
    </ConnectModalProvider>
  );
}
