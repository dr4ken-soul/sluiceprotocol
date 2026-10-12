/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /*
   * Deep links into `/app/asset/[ticker]` must render on a hard refresh, never a
   * host 404. `APP_BLUEPRINT.md` lists this as a release blocker and
   * `FRONTEND_SPEC.md` §2.1 calls it out as one, because it is the kind of thing
   * that only fails during a demo when someone bookmarks a route.
   *
   * Next.js serves real routes before consulting `rewrites`, so `/app` and its
   * nested routes resolve normally and this fallback only catches paths that match
   * no route at all.
   *
   * The previous form was `source: "/(.*)"`, which matches everything. That did not
   * just fail to catch unknown paths, it rewrote the real routes too, so `/app`,
   * `/app/issue` and `/app/asset/[ticker]` each served the landing page at their own
   * URL. The URL changed, the content did not, and `ProtectedRoute` never ran because
   * the gated route was never rendered. Verified against the deployment before the
   * fix: all three paths returned 200 with the landing page's content.
   *
   * `/:path*` alone was not enough. It fixed the two static app routes but the
   * dynamic `/app/asset/[ticker]` still resolved to the landing page, because a
   * catch-all matches a path with a dynamic segment the same as any other and the
   * rewrite does not wait to discover whether a route exists. Verified after that
   * deploy: `/app` and `/app/issue` served the gate, `/app/asset/LCC-01` served the
   * landing page.
   *
   * So the app prefix is excluded outright with a negative lookahead. Anything under
   * `/app` is a real route and is left alone; everything else falls back to the
   * branded page, which is what a host 404 would otherwise have replaced with an
   * ugly default.
   *
   * `/api` is excluded for the same reason, and it was missed at first, which is
   * worth recording because the failure was silent. Verified against the deployment:
   * `GET /api/drafts/<id>` answered 405 instead of the draft route's own 404-for-no-
   * draft. A rewrite that swallows the API does not throw, it returns whatever it
   * rewrote to, so the symptom is a write that appears to have succeeded and a read
   * that returns the wrong shape. Draft autosave was silently inoperative, and for a
   * form with no `localStorage` fallback that means a long issuance is lost on any
   * interruption.
   */
  async rewrites() {
    return [{ source: "/((?!app/|api/).*)", destination: "/" }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
