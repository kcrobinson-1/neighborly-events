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
const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
    NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "",
  },
};

export default nextConfig;
