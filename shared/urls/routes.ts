/** Application routes supported by the lightweight client-side router. */
export type AppPath =
  | "/"
  | "/admin"
  | `/event/${string}`
  | `/event/${string}/admin`
  | `/event/${string}/game`
  | `/event/${string}/game/redeem`
  | `/event/${string}/game/redemptions`
  | "/auth/callback";

/**
 * A subset of `AppPath` that is valid as a post-sign-in destination.
 * Transport-only routes like `/auth/callback` are excluded so the type
 * system prevents callback self-loops in `requestMagicLink` and
 * `validateNextPath`.
 *
 * Each phase that adds a new authenticated destination must extend
 * `AppPath` (for the router) and leave `AuthNextPath` unchanged; the
 * `Exclude` keeps the narrowing automatic.
 */
export type AuthNextPath = Exclude<AppPath, "/auth/callback">;

/** Central route definitions used by the pathname-based client router. */
export const routes = {
  home: "/",
  admin: "/admin",
  gamePrefix: "/event",
  eventLanding: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}`,
  eventAdmin: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}/admin`,
  game: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}/game`,
  gameRedeem: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}/game/redeem`,
  gameRedemptions: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}/game/redemptions`,
  authCallback: "/auth/callback",
} as const;

/** Removes trailing slashes so route comparisons stay stable. */
export function normalizePathname(pathname: string) {
  const normalizedPathname = pathname || routes.home;

  if (
    normalizedPathname.length > 1 &&
    normalizedPathname.endsWith("/")
  ) {
    return normalizedPathname.slice(0, -1);
  }

  return normalizedPathname;
}

/** Parses a game route and returns the decoded slug when the path matches. */
export function matchGamePath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const prefix = `${routes.gamePrefix}/`;
  const suffix = "/game";

  if (!normalizedPath.startsWith(prefix)) {
    return null;
  }

  if (!normalizedPath.endsWith(suffix)) {
    return null;
  }

  const encodedSlug = normalizedPath.slice(
    prefix.length,
    normalizedPath.length - suffix.length,
  );

  if (!encodedSlug || encodedSlug.includes("/")) {
    return null;
  }

  try {
    const slug = decodeURIComponent(encodedSlug);

    if (!slug || slug.includes("/")) {
      return null;
    }

    return {
      slug,
    };
  } catch {
    return null;
  }
}

/** Parses a per-event admin route and returns the decoded slug when the path matches. */
export function matchEventAdminPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const prefix = `${routes.gamePrefix}/`;
  const suffix = "/admin";

  if (!normalizedPath.startsWith(prefix)) {
    return null;
  }

  if (!normalizedPath.endsWith(suffix)) {
    return null;
  }

  const encodedSlug = normalizedPath.slice(
    prefix.length,
    normalizedPath.length - suffix.length,
  );

  if (!encodedSlug || encodedSlug.includes("/")) {
    return null;
  }

  try {
    const slug = decodeURIComponent(encodedSlug);

    if (!slug || slug.includes("/")) {
      return null;
    }

    return {
      slug,
    };
  } catch {
    return null;
  }
}

/** Parses a redeem route and returns the decoded slug when the path matches. */
export function matchGameRedeemPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const prefix = `${routes.gamePrefix}/`;
  const suffix = "/game/redeem";

  if (!normalizedPath.startsWith(prefix)) {
    return null;
  }

  if (!normalizedPath.endsWith(suffix)) {
    return null;
  }

  const encodedSlug = normalizedPath.slice(
    prefix.length,
    normalizedPath.length - suffix.length,
  );

  if (!encodedSlug || encodedSlug.includes("/")) {
    return null;
  }

  try {
    const slug = decodeURIComponent(encodedSlug);

    if (!slug || slug.includes("/")) {
      return null;
    }

    return {
      slug,
    };
  } catch {
    return null;
  }
}

/** Parses a redemptions-monitoring route and returns the decoded slug when the path matches. */
export function matchGameRedemptionsPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const prefix = `${routes.gamePrefix}/`;
  const suffix = "/game/redemptions";

  if (!normalizedPath.startsWith(prefix)) {
    return null;
  }

  if (!normalizedPath.endsWith(suffix)) {
    return null;
  }

  const encodedSlug = normalizedPath.slice(
    prefix.length,
    normalizedPath.length - suffix.length,
  );

  if (!encodedSlug || encodedSlug.includes("/")) {
    return null;
  }

  try {
    const slug = decodeURIComponent(encodedSlug);

    if (!slug || slug.includes("/")) {
      return null;
    }

    return {
      slug,
    };
  } catch {
    return null;
  }
}
