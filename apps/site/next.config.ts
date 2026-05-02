import type { NextConfig } from "next";

/**
 * `env` re-exposes the two `NEXT_PUBLIC_*` Supabase variables apps/site
 * reads through `apps/site/lib/supabaseBrowser.ts`. Source-level access
 * already uses the literal `process.env.NEXT_PUBLIC_*` pattern Next.js'
 * substitution requires, but Turbopack's bundler rewrites `process` to a
 * polyfilled module reference before the substitution pass sees it
 * (likely triggered by `@supabase/supabase-js`'s dependency graph
 * polyfilling Node's `process`). Once `process` is no longer the global
 * literal, Next.js' substitution can't pattern-match and the values stay
 * as runtime lookups against an empty polyfill.
 *
 * `env` runs in `next.config.ts` (Node, full `process.env` available
 * from Vercel) and tells Next.js to substitute the names via its own
 * definition pass that runs *before* the bundler's polyfill rewrite.
 * This is the documented escape hatch for cases where downstream
 * polyfilling breaks the literal-pattern match.
 *
 * Surfaced post-deploy by the Production Admin Smoke run after M2
 * phase 2.3 shipped — the bundle had `g.default.env.NEXT_PUBLIC_SUPABASE_URL`
 * (runtime lookup against polyfilled process) instead of the inlined
 * URL value, so the auth callback page failed to construct a Supabase
 * client and dropped to its timeout-state UI.
 */
/**
 * Cross-app proxy rewrites mirroring `apps/web/vercel.json`'s
 * apps/site rewrites in reverse direction. Visitors on apps/site
 * origin (preview URLs, the auto-generated `*.vercel.app` host, or
 * any domain mapped to the apps/site Vercel project) clicking the
 * home-page role-door links land on `/event/:slug/game`,
 * `/event/:slug/admin`, or their sub-paths — routes that exist only
 * on apps/web's SPA. Without these rewrites the navigations 404
 * on apps/site origin.
 *
 * `/assets/:path*` is also rewritten because apps/web's Vite build
 * emits its hashed JS/CSS bundles as root-relative `/assets/...`
 * references inside the SPA's `index.html`. Proxying only the HTML
 * routes without `/assets/*` would return 200 for the document but
 * 404 for every script and stylesheet, leaving the proxied pages
 * blank or unhydrated in a real browser. apps/site has no native
 * `/assets/*` route of its own (Next.js puts its build output under
 * `/_next/*`), so the rewrite is collision-free.
 *
 * The destination origin is hardcoded to apps/web's auto-generated
 * Vercel host, matching the precedent in `apps/web/vercel.json`
 * (which hardcodes apps/site's host the same way). Asymmetry vs.
 * the documented "apps/web is canonical" topology is tracked in
 * `docs/backlog.md` under "Canonical-origin design conversation"
 * — this rewrite is the cheapest unblock for the home-page
 * broken-links symptom, not a settled design.
 */
const APPS_WEB_ORIGIN = "https://neighborly-scavenger-game-web.vercel.app";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
    NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "",
  },
  async rewrites() {
    return [
      {
        source: "/event/:slug/game",
        destination: `${APPS_WEB_ORIGIN}/event/:slug/game`,
      },
      {
        source: "/event/:slug/game/:path*",
        destination: `${APPS_WEB_ORIGIN}/event/:slug/game/:path*`,
      },
      {
        source: "/event/:slug/admin",
        destination: `${APPS_WEB_ORIGIN}/event/:slug/admin`,
      },
      {
        source: "/event/:slug/admin/:path*",
        destination: `${APPS_WEB_ORIGIN}/event/:slug/admin/:path*`,
      },
      {
        source: "/assets/:path*",
        destination: `${APPS_WEB_ORIGIN}/assets/:path*`,
      },
    ];
  },
};

export default nextConfig;
