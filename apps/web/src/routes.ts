export const routes = {
  home: "/",
  gamePrefix: "/game",
  game: (slug: string) => `/game/${slug}`,
} as const;

export function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function matchGamePath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  const prefix = `${routes.gamePrefix}/`;

  if (!normalizedPath.startsWith(prefix)) {
    return null;
  }

  const slug = normalizedPath.slice(prefix.length);

  if (!slug || slug.includes("/")) {
    return null;
  }

  return {
    slug,
  };
}
