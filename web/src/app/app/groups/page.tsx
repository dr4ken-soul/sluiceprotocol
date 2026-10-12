/**
 * `/app/groups`.
 *
 * `APP_BLUEPRINT.md` §routes and `FRONTEND_SPEC.md` §14A.1. Rendered behind the
 * gate like every other app route, and behind `ComingNext`, which renders circles
 * when the programs exist and the coming-next state until they do.
 *
 * The rule that matters here is "never a route that 404s from the nav". A nav item
 * that leads nowhere is worse than no nav item, because it teaches a visitor that
 * the product's promises are not kept.
 */

import { ComingNext } from "@/components/layout/ComingNext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function GroupsPage() {
  return (
    <RouteErrorBoundary>
      <ProtectedRoute>
        <main id="main" className="min-h-screen bg-[var(--bg-primary)] px-6 py-16 md:px-10">
          <ComingNext intent="You were looking for your circles." />
        </main>
      </ProtectedRoute>
    </RouteErrorBoundary>
  );
}
