import { Suspense } from "react";
import { ConnectModalProvider } from "@/components/layout/ConnectModal";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { IssueWizard } from "@/components/issue/IssueWizard";

/** `/app/issue`, the six step issuance wizard. */
export default function IssueWizardPage() {
  return (
    <ConnectModalProvider>
      <RouteErrorBoundary>
        <ProtectedRoute>
          <Suspense fallback={null}>
            <IssueWizard />
          </Suspense>
        </ProtectedRoute>
      </RouteErrorBoundary>
    </ConnectModalProvider>
  );
}
