/**
 * `/app/circle/[address]`, the circle detail screen.
 *
 * `FRONTEND_SPEC.md` §14A.2 calls it the most important screen in Groups: it has to
 * answer where the rotation stands, what the member owes, and what happens on a
 * default, without the user having to work for any of it.
 *
 * The address is deliberately not read here. No circle program is deployed, so every
 * address is equally unresolvable and reading it would either 404 or invent. The
 * route exists so the nav and any shared link resolve, and `ComingNext` renders the
 * honest state.
 */

import { ComingNext } from "@/components/layout/ComingNext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function CircleDetailPage() {
  return (
    <RouteErrorBoundary>
      <ProtectedRoute>
        <main id="main" className="min-h-screen bg-[var(--bg-primary)] px-6 py-16 md:px-10">
          <ComingNext intent="You were looking at a specific circle." />
        </main>
      </ProtectedRoute>
    </RouteErrorBoundary>
  );
}
