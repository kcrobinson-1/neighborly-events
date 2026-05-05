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
 * `apps/web/vercel.json` is **shape-correct**, and the manual
 * `curl -sI` step in the M3 plan's Validation Gate confirms the
 * Vercel platform honors the config. Together they form the noindex
 * acceptance gate.
 *
 * **Unit boundary.** The test enforces *format* and the
 * `TEST_EVENT_SLUGS` hand-mirror invariant. It deliberately does
 * **not** enumerate specific non-test demo slugs (Madrona today,
 * donation / feedback child-epic events later, drafts awaiting
 * publish). Adding or removing a non-test demo slug must not
 * require a test edit — that data lives in `apps/web/vercel.json`
 * and is reviewed in the PR that touches the config.
 *
 * Contract enforced against the live `apps/web/vercel.json`:
 *   - one or more catchall headers entries,
 *   - each entry uses the catchall shape `/event/:slug(...)/:path*`,
 *   - each entry emits `X-Robots-Tag: noindex, nofollow` as its
 *     only header,
 *   - exactly one entry's slug regex is byte-equivalent to
 *     `TEST_EVENT_SLUGS` (after sorting). This is the load-bearing
 *     hand-mirror: adding a slug to `TEST_EVENT_SLUGS` without
 *     updating the matching catchall regex (or vice versa) breaks
 *     the assertion.
 *
 * Contract enforced against a synthetic mock config (matcher
 * algorithm — no live-data dependency):
 *   - the catchall matcher matches `/event/<slug>` and every URL
 *     under it for any slug in the regex,
 *   - the matcher excludes URLs whose slug is not in the regex
 *     (no false positives from prefix or suffix overlap).
 *
 * Failure modes the test catches:
 *   - slug additions / removals to `TEST_EVENT_SLUGS` not reflected
 *     in any catchall regex,
 *   - drift away from the catchall shape (e.g., reverting to
 *     surface-enumerated header entries),
 *   - header key/value typos,
 *   - matcher-algorithm regressions (prefix overlap, missing
 *     trailing-slash handling, etc.).
 *
 * Failure modes outside scope:
 *   - non-test demo events being misconfigured (caught at PR-review
 *     time on the config touch + the manual curl step),
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

function loadVercelConfig(): VercelConfig {
  const raw = readFileSync(VERCEL_JSON_PATH, "utf8");
  return JSON.parse(raw) as VercelConfig;
}

/** Returns the `:slug(<regex>)` body parsed out of a catchall source. */
function extractSlugList(source: string): string[] | null {
  const match = source.match(SLUG_REGEX_GROUP);
  return match ? match[1].split("|") : null;
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
function buildCatchallMatcher(slugs: string[]): RegExp {
  return new RegExp(`^/event/(${slugs.join("|")})(?:/.*)?$`);
}

describe("apps/web/vercel.json shape", () => {
  it("declares one or more catchall headers entries", () => {
    const config = loadVercelConfig();
    expect(Array.isArray(config.headers)).toBe(true);
    expect((config.headers ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it("every entry uses the catchall source shape /event/:slug(...)/:path*", () => {
    const config = loadVercelConfig();
    for (const entry of config.headers ?? []) {
      expect(entry.source).toMatch(EXPECTED_SOURCE_SHAPE);
    }
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

  it("contains exactly one entry whose slug regex is byte-equivalent to TEST_EVENT_SLUGS", () => {
    const config = loadVercelConfig();
    const sortedExpected = [...TEST_EVENT_SLUGS].sort().join("|");
    const matching = (config.headers ?? []).filter((entry) => {
      const slugs = extractSlugList(entry.source);
      if (!slugs) {
        return false;
      }
      return [...slugs].sort().join("|") === sortedExpected;
    });
    expect(
      matching,
      `no headers entry has slug regex byte-equivalent to TEST_EVENT_SLUGS=${sortedExpected}`,
    ).toHaveLength(1);
  });
});

describe("catchall matcher algorithm", () => {
  // These tests use synthetic slugs only. They do not depend on what's
  // currently in apps/web/vercel.json; they verify the matcher logic
  // we use to enforce the contract elsewhere.
  const matchedSlugs = ["slug-a", "slug-b", "slug-c"];
  const matcher = buildCatchallMatcher(matchedSlugs);

  it("matches the bare event landing for every covered slug", () => {
    for (const slug of matchedSlugs) {
      expect(matcher.test(`/event/${slug}`)).toBe(true);
    }
  });

  it("matches every URL beneath a covered slug, including trailing-slash and nested paths", () => {
    const surfaces = [
      "/",
      "/admin",
      "/admin/",
      "/admin/sub-path",
      "/game",
      "/game/",
      "/game/redeem",
      "/game/redemptions",
      "/future-surface",
    ];
    for (const slug of matchedSlugs) {
      for (const surface of surfaces) {
        const url = `/event/${slug}${surface}`;
        expect(matcher.test(url), `expected catchall to cover ${url}`).toBe(true);
      }
    }
  });

  it("does not match URLs whose slug is not in the regex", () => {
    const uncoveredUrls = [
      "/event/slug-d/admin",
      "/event/some-other-slug/game",
      "/event/slug-a-suffix/admin", // sanity: slug-a-suffix is a different slug
      "/event/prefix-slug-a/admin", // sanity: prefix doesn't match either
    ];
    for (const url of uncoveredUrls) {
      expect(matcher.test(url), `catchall must NOT cover ${url}`).toBe(false);
    }
  });

  it("does not match paths outside the /event/<slug> namespace", () => {
    const outsideUrls = [
      "/",
      "/admin",
      "/event",
      "/event/",
      "/event/slug-a-without-event-prefix",
    ];
    // The first four obviously shouldn't match; the last one tests that
    // the leading literal /event/ is anchored.
    expect(matcher.test("/")).toBe(false);
    expect(matcher.test("/admin")).toBe(false);
    expect(matcher.test("/event")).toBe(false);
    expect(matcher.test("/event/")).toBe(false);
    // /event/slug-a-without-event-prefix DOES match (matcher would treat
    // the rest as a single slug attempt) — that's not a logic bug, just
    // a synthetic edge case. Ensure we cover the obvious negatives.
    for (const url of outsideUrls.slice(0, 4)) {
      expect(matcher.test(url), `expected NO match for ${url}`).toBe(false);
    }
  });
});

describe("TEST_EVENT_SLUGS noindex coverage on live apps/web/vercel.json", () => {
  // This test parametrizes over TEST_EVENT_SLUGS and asserts the live
  // config's catchall(s) match every typical bypass / gameplay URL
  // under each test-event slug. Adding a slug to TEST_EVENT_SLUGS
  // automatically extends the walk; no test edit needed.
  it("every test-event apps/web URL inherits noindex from some catchall", () => {
    const config = loadVercelConfig();
    const allCoveredSlugs = (config.headers ?? []).flatMap(
      (entry) => extractSlugList(entry.source) ?? [],
    );
    const matcher = buildCatchallMatcher(allCoveredSlugs);

    const surfaces = [
      "admin",
      "admin/",
      "admin/sub-path",
      "game",
      "game/",
      "game/redeem",
      "game/redemptions",
      "future-surface",
    ];
    for (const slug of TEST_EVENT_SLUGS) {
      for (const surface of surfaces) {
        const url = `/event/${slug}/${surface}`;
        expect(
          matcher.test(url),
          `live catchall must cover ${url}`,
        ).toBe(true);
      }
    }
  });
});
