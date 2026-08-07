import { readFileSync } from "node:fs";
import { join, normalize } from "node:path";

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
 * so content authors have exactly one path vocabulary.
 *
 * The single `readFileSync(join(process.cwd(), "public", …))`
 * expression is deliberate: Next's build-time file tracing (NFT)
 * treats `path.join(process.cwd(), '<literal subfolder>', dynamic)`
 * as statically scoped to that subtree, whereas root-probing or
 * `resolve()` gymnastics make the tracer give up and pull the whole
 * project into the `output: "standalone"` artifact. Callers run with
 * `process.cwd()` at `apps/site` (`next build` / `next dev`); tests
 * running from the repo root `chdir` into `apps/site` first.
 *
 * Returns the markup with any leading XML declaration stripped
 * (`<?xml …?>` is not valid inside an HTML document), or `null` when
 * the file is missing or the path tries to escape `public/` — the
 * caller renders its degraded no-art state rather than crashing the
 * page. Content paths are repo-authored, so the traversal guard is a
 * tripwire for author typos, not a security boundary.
 */
export function readPublicSvg(publicPath: string): string | null {
  const cleaned = normalize(publicPath).replace(/^[/\\]+/, "");
  if (cleaned === ".." || cleaned.startsWith("../") || cleaned.startsWith("..\\")) {
    return null;
  }

  try {
    return readFileSync(join(process.cwd(), "public", cleaned), "utf8").replace(
      /^\s*<\?xml[^>]*\?>\s*/,
      "",
    );
  } catch {
    return null;
  }
}
