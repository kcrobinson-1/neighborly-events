import { existsSync, readFileSync } from "node:fs";
import { join, normalize, resolve, sep } from "node:path";

/**
 * Reads a repo-committed SVG from apps/site's `public/` directory so
 * a Server Component can inline its markup (the day-of landing hero
 * inlines the masthead art per the Madrona spec — the vector scales
 * crisply and paints with the page instead of arriving as a second
 * request). The read happens at prerender time on statically
 * generated routes, so shipping pages never touch the filesystem at
 * request time.
 *
 * `publicPath` is the same `/`-prefixed URL-style path content
 * modules use for `<img src>` assets ("/events/madrona/masthead.svg"),
 * so content authors have exactly one path vocabulary. Two roots are
 * probed because the two callers run from different working
 * directories: `next build` / `next dev` run with `process.cwd()` at
 * `apps/site`, while vitest runs from the repo root. `import.meta`-
 * relative resolution is not an option — the compiled server bundle
 * relocates under `.next/`, where module-relative paths no longer
 * point at the source tree.
 *
 * Returns the markup with any leading XML declaration stripped
 * (`<?xml …?>` is not valid inside an HTML document), or `null` when
 * the file is missing or the path escapes `public/` — the caller
 * renders its degraded no-art state rather than crashing the page.
 * Content paths are repo-authored, so the traversal guard is a
 * tripwire for author typos, not a security boundary.
 */
export function readPublicSvg(publicPath: string): string | null {
  const roots = [
    join(process.cwd(), "public"),
    join(process.cwd(), "apps", "site", "public"),
  ];

  for (const root of roots) {
    if (!existsSync(root)) {
      continue;
    }

    const candidate = resolve(root, normalize(publicPath).replace(/^[/\\]+/, ""));
    if (!candidate.startsWith(root + sep) || !existsSync(candidate)) {
      return null;
    }

    return readFileSync(candidate, "utf8").replace(/^\s*<\?xml[^>]*\?>\s*/, "");
  }

  return null;
}
