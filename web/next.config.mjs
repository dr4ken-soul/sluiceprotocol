/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Deep links into `/app/asset/[ticker]` must render on a hard refresh, never a
  // host 404. `APP_BLUEPRINT.md` lists this as a release blocker and
  // `FRONTEND_SPEC.md` §2.1 calls it out as one, because it is the kind of thing
  // that only fails during a demo when someone bookmarks a route.
  async rewrites() {
    return [{ source: "/(.*)", destination: "/" }];
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
