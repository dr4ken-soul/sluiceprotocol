import { Suspense } from "react";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AssetDetail } from "@/components/asset/AssetDetail";

/**
 * `/app/asset/[ticker]`.
 *
 * A hard refresh on this route must render the page rather than a host 404, which
 * is why `next.config.mjs` carries the catch-all rewrite and why the page is a
 * client component behind the gate rather than a server-rendered route that would
 * 404 before the wallet had a chance to hydrate.
 */
export default function AssetDetailPage() {
  return (
      <RouteErrorBoundary>
        <ProtectedRoute>
          <Suspense fallback={null}>
            <AssetDetail />
          </Suspense>
        </ProtectedRoute>
      </RouteErrorBoundary>
  );
}
