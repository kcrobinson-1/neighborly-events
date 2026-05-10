/**
 * Stable hostname token of the apps/site Vercel project. The
 * `<project>-` prefix is the first half of the apps/site preview-
 * alias matcher below.
 *
 * If the apps/site Vercel project is ever renamed, update this token
 * (and the canonical-origin entry in `defaultAllowedOrigins`) — a
 * project rename is a config event that warrants a CORS revisit per
 * the canonical-origin Phase 2 scoping decision.
 */
const APPS_SITE_PROJECT_SLUG = "neighborly-events-site";

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

/** Escape a string for safe use as a literal inside a RegExp source. */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds the apps/site preview-alias matcher when the operator has
 * opted in via `APPS_SITE_VERCEL_SCOPE`. Returns `null` when the env
 * var is unset — in that case no preview/branch aliases are admitted
 * (only the explicit allowlist applies).
 *
 * Two documented Vercel alias shapes match:
 *
 * - `<project>-<unique-id>-<scope>.vercel.app` (per-deployment alias).
 *   The unique-id is a 9-character lowercase alphanumeric hash.
 * - `<project>-git-<branch>-<scope>.vercel.app` (per-branch alias).
 *
 * The trailing `<scope>` segment is **pinned to the configured value**
 * — Vercel uses the team or personal-account slug here, and projects
 * with the same name on a different team produce hostnames with a
 * different `<scope>`. Pinning isolates apps/site's previews from
 * any other Vercel team (including ones that might create a
 * same-named project deliberately or accidentally).
 *
 * Both `APPS_SITE_PROJECT_SLUG` and the configured scope are
 * regex-escaped before insertion so unexpected characters in either
 * configuration value cannot widen the pattern.
 *
 * Vendor reference: https://vercel.com/docs/deployments/generated-urls
 */
function getAppsSitePreviewAliasPattern(): RegExp | null {
  const scope = Deno.env.get("APPS_SITE_VERCEL_SCOPE");
  if (!scope) {
    return null;
  }
  return new RegExp(
    `^https://${escapeRegex(APPS_SITE_PROJECT_SLUG)}-` +
      `(git-[a-z0-9-]+|[a-z0-9]{9})-` +
      `${escapeRegex(scope)}\\.vercel\\.app$`,
  );
}

/**
 * Returns true when the origin matches an apps/site Vercel preview /
 * branch alias scoped to the configured Vercel team. Always returns
 * false when `APPS_SITE_VERCEL_SCOPE` is unset.
 */
function matchesAppsSitePreviewAlias(origin: string) {
  return getAppsSitePreviewAliasPattern()?.test(origin) ?? false;
}

/**
 * Returns the request origin only when it is explicitly allowed.
 *
 * Two independent admission paths:
 *
 * 1. **Explicit allowlist.** Either the in-code `defaultAllowedOrigins`
 *    set (when `ALLOWED_ORIGINS` is unset) or the operator-pinned
 *    `ALLOWED_ORIGINS` set (when set). Exact-string membership.
 * 2. **apps/site preview-alias matcher.** Active only when
 *    `APPS_SITE_VERCEL_SCOPE` is set. Admits Vercel preview/branch
 *    aliases for the apps/site project under the configured team.
 *    The two env vars are independent: setting `ALLOWED_ORIGINS`
 *    does **not** silently enable the preview matcher, and unsetting
 *    `APPS_SITE_VERCEL_SCOPE` disables preview admission regardless
 *    of `ALLOWED_ORIGINS`. The operator's explicit configuration is
 *    respected on both axes.
 */
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
