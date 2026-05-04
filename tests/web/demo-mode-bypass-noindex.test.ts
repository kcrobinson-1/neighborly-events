import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TEST_EVENT_SLUGS } from "../../shared/events/testEventAllowlist";

/**
 * Load-bearing CI gate for the apps/web demo-mode noindex emit.
 *
 * The Playwright demo-mode-bypass fixture runs against the Vite dev
 * server (`npm run dev:web:test`), which cannot emit Vercel `headers`
 * — so the platform-emit guarantee is layered as: this test asserts
 * `apps/web/vercel.json` is shape-correct, and the manual `curl -sI`
 * step in the M3 plan's Validation Gate confirms the Vercel platform
 * honors the config. Together they form the noindex acceptance gate.
 *
 * Per the post-M3 `test-event-noindex-uniformity` decision (Option B),
 * the apps/web headers config collapses to a single catchall entry
 * covering every URL under a test-event slug. The catchall is the
 * load-bearing slug-list hand-mirror surface; one regex constraint
 * expression (`:slug(harvest-block-party|riverside-jam)`) appearing
 * in one source, byte-equivalent to `TEST_EVENT_SLUGS`.
 *
 * The test reads `apps/web/vercel.json` as text + JSON and asserts:
 *   - exactly one `headers` entry,
 *   - that entry emits `X-Robots-Tag: noindex, nofollow` and only
 *     that header,
 *   - the entry's `source` is the catchall shape
 *     `/event/:slug(...)/:path*`,
 *   - the `:slug(...)` regex-constraint group is byte-equivalent to
 *     `TEST_EVENT_SLUGS` (after sorting both sides),
 *   - the catchall covers all the bypass surfaces and the gameplay
 *     route under a test slug (positive coverage walk against
 *     concrete test paths).
 *
 * Failure modes the test catches:
 *   - slug additions to `TEST_EVENT_SLUGS` not reflected in the
 *     vercel.json regex,
 *   - accidental non-test-event-slug additions to the regex
 *     constraint,
 *   - header key/value typos,
 *   - drift away from the catchall shape (e.g., reverting to a
 *     surface-enumerated list without explicit re-decision).
 *
 * Failure modes outside scope (covered by the manual curl step):
 *   - the Vercel platform deciding to ignore the config,
 *   - rewrite-vs-headers precedence regressions on the platform
 *     side.
 */

type VercelHeaderEntry = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

type VercelConfig = {
  rewrites?: Array<{ source: string; destination: string }>;
  headers?: VercelHeaderEntry[];
};

const VERCEL_JSON_PATH = resolve(__dirname, "../../apps/web/vercel.json");
const NOINDEX_VALUE = "noindex, nofollow";
const SLUG_REGEX_GROUP = /:slug\(([^)]+)\)/;
const EXPECTED_SOURCE_SHAPE = /^\/event\/:slug\([^)]+\)\/:path\*$/;

/**
 * Concrete test paths that must all be covered by the single catchall.
 * Spans bypass surfaces (admin, redeem, redemptions), the gameplay
 * route, trailing-slash variants, and a future-bypass-surface placeholder.
 * Any drift away from the catchall shape would leave one of these
 * uncovered; the suffix-shape assertion is the load-bearing falsifier.
 */
const PATHS_THAT_MUST_INHERIT_NOINDEX = [
  "/event/harvest-block-party/admin",
  "/event/harvest-block-party/admin/",
  "/event/harvest-block-party/admin/sub-path",
  "/event/harvest-block-party/game",
  "/event/harvest-block-party/game/",
  "/event/harvest-block-party/game/redeem",
  "/event/harvest-block-party/game/redemptions",
  "/event/harvest-block-party/future-surface",
  "/event/riverside-jam/admin",
  "/event/riverside-jam/game",
];

/**
 * Concrete paths the catchall must NOT cover. Real-event slugs and
 * non-test-event paths stay indexable by virtue of the regex
 * constraint excluding their slugs.
 */
const PATHS_THAT_MUST_NOT_INHERIT_NOINDEX = [
  "/event/madrona-launch-day/admin",
  "/event/madrona-launch-day/game",
  "/event/madrona-launch-day/game/redeem",
];

function loadVercelConfig(): VercelConfig {
  const raw = readFileSync(VERCEL_JSON_PATH, "utf8");
  return JSON.parse(raw) as VercelConfig;
}

function getCatchallSlugRegexLiteral(): string | null {
  const config = loadVercelConfig();
  if (!config.headers || config.headers.length !== 1) {
    return null;
  }
  const match = config.headers[0].source.match(SLUG_REGEX_GROUP);
  return match ? match[1] : null;
}

/**
 * Synthesizes the runtime regex the Vercel platform compiles for the
 * catchall source. The vercel.json `source` uses path-to-regexp; for
 * the assertion-side we emulate the relevant subset:
 *   - `:slug(...)` is the inline regex-constrained named param,
 *   - `:path*` is zero-or-more path segments after a separator.
 *
 * The synthesis is deliberately conservative: it MUST match what
 * Vercel matches; it MAY accept slightly more, in which case the
 * positive-coverage assertions still pass and the negative ones
 * still fail correctly because the slug regex constraint is the
 * authoritative gate.
 */
function buildCatchallMatcher(): RegExp | null {
  const slugRegex = getCatchallSlugRegexLiteral();
  if (slugRegex === null) {
    return null;
  }
  // Mirrors `/event/:slug(<slugRegex>)/:path*` semantics:
  //   - leading literal `/event/`
  //   - slug constraint (group 1)
  //   - optional trailing `/` + zero or more path segments (group 2)
  return new RegExp(`^/event/(${slugRegex})(?:/.*)?$`);
}

describe("apps/web/vercel.json demo-mode noindex headers", () => {
  it("declares exactly one headers entry (single catchall per Option B)", () => {
    const config = loadVercelConfig();
    expect(Array.isArray(config.headers)).toBe(true);
    expect(config.headers).toHaveLength(1);
  });

  it("emits X-Robots-Tag: noindex, nofollow as the entry's only header", () => {
    const config = loadVercelConfig();
    const entry = (config.headers ?? [])[0];
    expect(entry.headers).toHaveLength(1);
    expect(entry.headers[0]).toEqual({
      key: "X-Robots-Tag",
      value: NOINDEX_VALUE,
    });
  });

  it("uses the catchall source shape /event/:slug(...)/:path*", () => {
    const config = loadVercelConfig();
    const entry = (config.headers ?? [])[0];
    expect(entry.source).toMatch(EXPECTED_SOURCE_SHAPE);
  });

  it("the :slug(...) regex constraint is byte-equivalent to TEST_EVENT_SLUGS", () => {
    const captured = getCatchallSlugRegexLiteral();
    expect(captured, "catchall source must contain :slug(...)").not.toBeNull();
    const sortedActual = (captured as string).split("|").sort().join("|");
    const sortedExpected = [...TEST_EVENT_SLUGS].sort().join("|");
    expect(sortedActual).toBe(sortedExpected);
  });

  it("matches every test-event apps/web URL that must inherit noindex", () => {
    const matcher = buildCatchallMatcher();
    expect(matcher).not.toBeNull();
    for (const path of PATHS_THAT_MUST_INHERIT_NOINDEX) {
      expect(
        (matcher as RegExp).test(path),
        `catchall must cover ${path}`,
      ).toBe(true);
    }
  });

  it("does not match non-test-event URLs (real-event slugs stay indexable)", () => {
    const matcher = buildCatchallMatcher();
    expect(matcher).not.toBeNull();
    for (const path of PATHS_THAT_MUST_NOT_INHERIT_NOINDEX) {
      expect(
        (matcher as RegExp).test(path),
        `catchall must NOT cover ${path}`,
      ).toBe(false);
    }
  });
});
