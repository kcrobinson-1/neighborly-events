import type { NextConfig } from "next";

import { organizerHostRoutes } from "../../shared/urls/organizerHosts.ts";

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
 * Site → plugin proxy rewrites. apps/site is the canonical user-facing
 * origin: every customer-visible URL resolves on apps/site's Vercel
 * project (or a per-event organizer subdomain CNAME'd to it), and the
 * plugin-owned routes (`/event/:slug/game*`, `/event/:slug/admin*`,
 * `/assets/*`) are routed from apps/site into the apps/web plugin
 * deployment via these proxy rewrites. apps/web's Vercel project is
 * reachable directly at its own `*.vercel.app` host, but is not
 * advertised as a customer-facing origin.
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
 * `APPS_WEB_ORIGIN` names the plugin deployment's Vercel-generated
 * host as the proxy destination. The canonical-origin contract is
 * documented in [`docs/plans/canonical-origin-resolution.md`](../../docs/plans/canonical-origin-resolution.md)
 * and the topology flip that established this shape ships per
 * [`docs/plans/canonical-origin-resolution-phase-2-plan.md`](../../docs/plans/canonical-origin-resolution-phase-2-plan.md).
 */
const APPS_WEB_ORIGIN = "https://neighborly-scavenger-game-web.vercel.app";

/**
 * Escapes every character a regular expression would read as syntax,
 * so a value survives being compiled into one as a literal.
 *
 * Next.js compiles a `has` condition's `value` by anchoring it into a
 * `RegExp` — a construction, not a string comparison. A hostname
 * written through unchanged is therefore *not* matched exactly: a
 * domain name is mostly literal characters, but its separators are
 * not, so a host differing only at a separator still matches — and
 * that near-match is itself a well-formed hostname someone else can
 * register. The failure is silent — the mapped host keeps working
 * while an unmapped near-match quietly starts serving the organizer's
 * event — so the escaping happens here rather than in the mapping,
 * which stays spelled the way an operator would type it.
 */
function escapeRegExpLiteral(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.-]/g, "\\$&");
}

/**
 * Host-conditional rewrites derived from the organizer host→event
 * mapping in
 * [`shared/urls/organizerHosts.ts`](../../shared/urls/organizerHosts.ts).
 * Every row names a literal source and carries an exact-hostname
 * condition, so the blast radius is exactly the mapped literals on
 * exactly the mapped hosts: no other path is rewritten on an organizer
 * host, and no path at all is rewritten on an unmapped one.
 *
 * These run in the `beforeFiles` phase. The organizer root has to
 * resolve to the event landing even though `/` is a real route on this
 * app, and an `afterFiles` rewrite is only consulted after the
 * filesystem check, so it would never reach it.
 */
function organizerHostRewrites() {
  return organizerHostRoutes().map(({ hostname, shortPath, longPath }) => ({
    source: shortPath,
    destination: longPath,
    has: [
      {
        type: "host" as const,
        value: escapeRegExpLiteral(hostname),
      },
    ],
  }));
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
    NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "",
  },
  async rewrites() {
    // The object form is what reaches `beforeFiles`. The proxy rows
    // below keep the phase the bare-array return gave them — Next.js
    // treats a returned array as `afterFiles` — so adding the
    // organizer rows does not silently relocate them.
    return {
      beforeFiles: organizerHostRewrites(),
      afterFiles: [
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
      ],
    };
  },
};

export default nextConfig;
