/** Application routes supported by the lightweight client-side router. */
export type AppPath =
  | "/"
  | "/admin"
  | `/admin/events/${string}`
  | `/event/${string}`
  | `/event/${string}/admin`
  | `/event/${string}/game`
  | `/event/${string}/redeem`
  | `/event/${string}/redemptions`
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
  adminEventsPrefix: "/admin/events",
  adminEvent: (eventId: string): AppPath =>
    `/admin/events/${encodeURIComponent(eventId)}`,
  gamePrefix: "/event",
  eventLanding: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}`,
  eventAdmin: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}/admin`,
  game: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}/game`,
  eventRedeem: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}/redeem`,
  eventRedemptions: (slug: string): AppPath =>
    `/event/${encodeURIComponent(slug)}/redemptions`,
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

/** Parses an admin event route and returns the decoded event id when matched. */
export function matchAdminEventPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const prefix = `${routes.adminEventsPrefix}/`;

  if (!normalizedPath.startsWith(prefix)) {
    return null;
  }

  const encodedEventId = normalizedPath.slice(prefix.length);

  if (!encodedEventId || encodedEventId.includes("/")) {
    return null;
  }

  try {
    const eventId = decodeURIComponent(encodedEventId);

    if (!eventId || eventId.includes("/")) {
      return null;
    }

    return {
      eventId,
    };
  } catch {
    return null;
  }
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

/** Parses a redeem route and returns the decoded slug when the path matches. */
export function matchEventRedeemPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const prefix = `${routes.gamePrefix}/`;
  const suffix = "/redeem";

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
export function matchEventRedemptionsPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const prefix = `${routes.gamePrefix}/`;
  const suffix = "/redemptions";

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
