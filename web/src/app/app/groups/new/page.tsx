/**
 * `/app/groups/new`, the create-a-circle wizard.
 *
 * `FRONTEND_SPEC.md` §14A.3. Four steps: basics, size, cadence, review.
 *
 * Not built in Phase 0. `BUILD_GUIDE.md` is explicit that nothing in the Groups
 * checklist starts before Issuance ships, and §14A.3's review step exists to state
 * a real bond in a real number before anyone locks funds. Rendering a four-step form
 * that cannot submit would be a mockup of the exact screen where a member commits
 * money, which is the last place to fake anything.
 *
 * The route exists and answers, so the nav item never 404s.
 */

import { ComingNext } from "@/components/layout/ComingNext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function NewCirclePage() {
  return (
    <RouteErrorBoundary>
      <ProtectedRoute>
        <main id="main" className="min-h-screen bg-[var(--bg-primary)] px-6 py-16 md:px-10">
          <ComingNext intent="You were looking to create a circle." />
        </main>
      </ProtectedRoute>
    </RouteErrorBoundary>
  );
}
