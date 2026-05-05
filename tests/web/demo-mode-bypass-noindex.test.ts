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
 * the apps/web headers config collapsed from six per-surface entries
 * to a single catchall covering every URL under a test-event slug.
 *
 * The Madrona demo-build epic M2 phase 2.1 post-merge audit
 * (PR #191) extended the shape: per-event noindex is no longer
 * test-event-only. Non-test demo events (Madrona today; donation /
 * feedback child epics or draft events in future) get their own
 * per-event catchall rule, keeping the test-event regex byte-
 * equivalent to `TEST_EVENT_SLUGS` while letting non-test demo slugs
 * sit in their own rule(s). The contract this test enforces is now:
 *   - one or more catchall headers entries,
 *   - each entry uses the catchall shape `/event/:slug(...)/:path*`
 *     and emits `X-Robots-Tag: noindex, nofollow` as its only header,
 *   - the union of slugs across all entries is byte-equivalent to
 *     `TEST_EVENT_SLUGS ∪ NON_TEST_NOINDEX_SLUGS` (after sorting),
 *   - positive coverage: each test-event and non-test-noindex path
 *     is matched by some entry,
 *   - negative coverage: real-event slugs (`madrona-launch-day` and
 *     other not-yet-existing future event slugs) are not matched.
 *
 * Failure modes the test catches:
 *   - slug additions to `TEST_EVENT_SLUGS` not reflected in the
 *     vercel.json regex,
 *   - new non-test demo events not added here AND in vercel.json,
 *   - accidental real-event additions to any catchall regex,
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
 * Non-test demo / non-launch event slugs that share the test-event
 * noindex posture but are not in `TEST_EVENT_SLUGS`. Madrona is in
 * demo-build phase (per the Madrona demo-build epic) until the
 * future Madrona-launch epic flips it to indexable. Future entries:
 * donation / feedback child-epic events if they get their own slug,
 * draft events awaiting publish, etc.
 */
const NON_TEST_NOINDEX_SLUGS: readonly string[] = ["madrona"];

/**
 * Concrete test paths that must all be covered by some catchall.
 * Spans bypass surfaces (admin, redeem, redemptions), the gameplay
 * route, trailing-slash variants, a future-bypass-surface placeholder,
 * and the Madrona demo surfaces. Any drift away from the catchall
 * shape would leave one of these uncovered; the suffix-shape
 * assertion is the load-bearing falsifier.
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
  "/event/madrona/admin",
  "/event/madrona/game",
  "/event/madrona/game/redeem",
  "/event/madrona/game/redemptions",
  "/event/madrona/future-surface",
];

/**
 * Concrete paths the catchall must NOT cover. Real-event slugs and
 * non-test-event paths stay indexable by virtue of the regex
 * constraint excluding their slugs. `madrona-launch-day` is the
 * future Madrona-launch sibling epic's slug; demo-build does not
 * extend noindex to it.
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

/**
 * Returns `[{ source, slugs }]` for every catchall headers entry.
 * Each entry's `slugs` is the inline regex-constrained list parsed
 * out of `:slug(...)`. An entry whose `source` does not contain a
 * `:slug(...)` group returns an empty `slugs` array, which the
 * source-shape test catches independently.
 */
function loadCatchallEntries(): Array<{ source: string; slugs: string[] }> {
  const config = loadVercelConfig();
  return (config.headers ?? []).map((entry) => {
    const match = entry.source.match(SLUG_REGEX_GROUP);
    const slugs = match ? match[1].split("|") : [];
    return { source: entry.source, slugs };
  });
}

function getAllCoveredSlugs(): string[] {
  return loadCatchallEntries().flatMap((entry) => entry.slugs);
}

/**
 * Synthesizes a runtime regex covering the union of every catchall
 * source's `:slug(...)` constraint. The vercel.json `source` uses
 * path-to-regexp; for the assertion-side we emulate the relevant
 * subset:
 *   - `:slug(...)` is the inline regex-constrained named param,
 *   - `:path*` is zero-or-more path segments after a separator.
 *
 * The synthesis is deliberately conservative: it MUST match what
 * Vercel matches; it MAY accept slightly more, in which case the
 * positive-coverage assertions still pass and the negative ones
 * still fail correctly because the slug regex constraint is the
 * authoritative gate.
 */
function buildUnionMatcher(): RegExp | null {
  const slugs = getAllCoveredSlugs();
  if (slugs.length === 0) {
    return null;
  }
  const unionSlugRegex = slugs.join("|");
  return new RegExp(`^/event/(${unionSlugRegex})(?:/.*)?$`);
}

describe("apps/web/vercel.json demo-mode noindex headers", () => {
  it("declares one or more catchall headers entries", () => {
    const config = loadVercelConfig();
    expect(Array.isArray(config.headers)).toBe(true);
    expect((config.headers ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("every entry emits X-Robots-Tag: noindex, nofollow as its only header", () => {
    const config = loadVercelConfig();
    for (const entry of config.headers ?? []) {
      expect(entry.headers, `entry source=${entry.source}`).toHaveLength(1);
      expect(entry.headers[0]).toEqual({
        key: "X-Robots-Tag",
        value: NOINDEX_VALUE,
      });
    }
  });

  it("every entry uses the catchall source shape /event/:slug(...)/:path*", () => {
    const config = loadVercelConfig();
    for (const entry of config.headers ?? []) {
      expect(entry.source).toMatch(EXPECTED_SOURCE_SHAPE);
    }
  });

  it("union of slug regexes is byte-equivalent to TEST_EVENT_SLUGS ∪ NON_TEST_NOINDEX_SLUGS", () => {
    const captured = getAllCoveredSlugs();
    expect(
      captured.length,
      "every entry's source must contain :slug(...)",
    ).toBeGreaterThan(0);
    const sortedActual = [...captured].sort().join("|");
    const sortedExpected = [...TEST_EVENT_SLUGS, ...NON_TEST_NOINDEX_SLUGS]
      .sort()
      .join("|");
    expect(sortedActual).toBe(sortedExpected);
  });

  it("matches every apps/web URL that must inherit noindex", () => {
    const matcher = buildUnionMatcher();
    expect(matcher).not.toBeNull();
    for (const path of PATHS_THAT_MUST_INHERIT_NOINDEX) {
      expect(
        (matcher as RegExp).test(path),
        `catchall must cover ${path}`,
      ).toBe(true);
    }
  });

  it("does not match non-noindex URLs (real-event slugs stay indexable)", () => {
    const matcher = buildUnionMatcher();
    expect(matcher).not.toBeNull();
    for (const path of PATHS_THAT_MUST_NOT_INHERIT_NOINDEX) {
      expect(
        (matcher as RegExp).test(path),
        `catchall must NOT cover ${path}`,
      ).toBe(false);
    }
  });
});
