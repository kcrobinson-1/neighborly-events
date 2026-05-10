/**
 * Stable hostname token of the apps/site Vercel project. Drives the
 * preview-alias matcher below — Vercel's generated preview and branch
 * URLs all start with `<project-slug>-` and end with `.vercel.app`.
 *
 * If the apps/site Vercel project is ever renamed, update this token
 * (and the canonical-origin entry in `defaultAllowedOrigins`) — a
 * project rename is a config event that warrants a CORS revisit per
 * the canonical-origin Phase 2 scoping decision.
 */
const APPS_SITE_PROJECT_SLUG = "neighborly-events-site";

/**
 * Matches Vercel-generated preview/branch aliases scoped to the
 * apps/site project. Two documented Vercel alias shapes are admitted:
 *
 * - `<project>-<unique-id>-<scope>.vercel.app` (per-deployment alias).
 *   The unique-id is a 9-character lowercase alphanumeric hash.
 * - `<project>-git-<branch>-<scope>.vercel.app` (per-branch alias).
 *
 * The unique-id-hash anchor and the literal `git-` anchor are what
 * isolate apps/site's preview aliases from a hypothetical sibling
 * Vercel project whose name extends apps/site's slug as a prefix
 * (e.g., `neighborly-events-site-extra-...`): such a sibling's alias
 * would have `extra` (or another non-hash, non-`git` segment) at the
 * position the matcher requires either `git` or a hash. The negative-
 * test branch in `tests/supabase/functions/cors.test.ts` is the
 * load-bearing falsifier for this isolation.
 *
 * Vendor reference: https://vercel.com/docs/deployments/generated-urls
 */
const APPS_SITE_PREVIEW_ALIAS_PATTERN = new RegExp(
  `^https://${APPS_SITE_PROJECT_SLUG}-(git-[a-z0-9-]+|[a-z0-9]{9})-[a-z0-9-]+\\.vercel\\.app$`,
);

/** Built-in origins allowed to call edge functions when env config is absent. */
const defaultAllowedOrigins = new Set([
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://localhost:5173",
  "https://neighborly-events-site.vercel.app",
]);

/** Returns the set of browser origins that may call the edge functions. */
function getAllowedOrigins() {
  const configuredOrigins = Deno.env.get("ALLOWED_ORIGINS");

  if (!configuredOrigins) {
    return defaultAllowedOrigins;
  }

  return new Set(
    configuredOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

/**
 * Returns true when the origin matches an apps/site Vercel preview /
 * branch alias. Applied alongside the exact-string allowlist so an
 * operator who pins origins via `ALLOWED_ORIGINS` still gets per-PR
 * preview-alias admission for the apps/site project automatically.
 */
function matchesAppsSitePreviewAlias(origin: string) {
  return APPS_SITE_PREVIEW_ALIAS_PATTERN.test(origin);
}

/** Returns the request origin only when it is explicitly allowed. */
export function getAllowedOrigin(request: Request) {
  const requestOrigin = request.headers.get("origin");

  if (!requestOrigin) {
    return null;
  }

  if (getAllowedOrigins().has(requestOrigin)) {
    return requestOrigin;
  }

  if (matchesAppsSitePreviewAlias(requestOrigin)) {
    return requestOrigin;
  }

  return null;
}

/** Creates the CORS headers shared by the edge functions. */
export function createCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-neighborly-session",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
  };
}
