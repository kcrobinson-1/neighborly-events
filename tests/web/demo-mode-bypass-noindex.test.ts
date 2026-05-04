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
 * step in the plan's Validation Gate confirms the Vercel platform
 * honors the config. Together they form the noindex acceptance gate.
 *
 * The test reads `apps/web/vercel.json` as text + JSON and asserts:
 *   - exactly three `headers` entries, one per bypass-eligible
 *     surface (`/admin`, `/game/redeem`, `/game/redemptions`),
 *   - each entry emits `X-Robots-Tag: noindex, nofollow` and only
 *     that header,
 *   - each entry's `source` starts with `/event/:slug(` and the
 *     `:slug(...)` regex-constraint group is byte-equivalent to
 *     `TEST_EVENT_SLUGS` (after sorting both sides),
 *   - no other entry in `headers` carries `X-Robots-Tag` (no drift
 *     onto the gameplay route, the home page, the auth callback,
 *     or any non-test surface).
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

function loadVercelConfig(): VercelConfig {
  const raw = readFileSync(VERCEL_JSON_PATH, "utf8");
  return JSON.parse(raw) as VercelConfig;
}

describe("apps/web/vercel.json demo-mode noindex headers", () => {
  it("declares exactly three headers entries (one per bypass surface)", () => {
    const config = loadVercelConfig();
    expect(Array.isArray(config.headers)).toBe(true);
    expect(config.headers).toHaveLength(3);
  });

  it("each entry emits X-Robots-Tag: noindex, nofollow as its only header", () => {
    const config = loadVercelConfig();
    for (const entry of config.headers ?? []) {
      expect(entry.headers).toHaveLength(1);
      expect(entry.headers[0]).toEqual({
        key: "X-Robots-Tag",
        value: NOINDEX_VALUE,
      });
    }
  });

  it("each entry's source starts with /event/:slug(", () => {
    const config = loadVercelConfig();
    for (const entry of config.headers ?? []) {
      expect(entry.source.startsWith("/event/:slug(")).toBe(true);
    }
  });

  it("covers exactly the three bypass surfaces (admin, game/redeem, game/redemptions)", () => {
    const config = loadVercelConfig();
    const suffixes = (config.headers ?? [])
      .map((entry) => {
        const match = entry.source.match(/\/event\/:slug\([^)]+\)(.+)$/);
        return match ? match[1] : "";
      })
      .sort();
    expect(suffixes).toEqual(
      ["/admin", "/game/redeem", "/game/redemptions"].sort(),
    );
  });

  it("each :slug(...) regex constraint is byte-equivalent to TEST_EVENT_SLUGS", () => {
    const config = loadVercelConfig();
    const expected = [...TEST_EVENT_SLUGS].sort().join("|");
    for (const entry of config.headers ?? []) {
      const match = entry.source.match(SLUG_REGEX_GROUP);
      expect(match, `entry source "${entry.source}" should contain :slug(...)`)
        .not.toBeNull();
      const captured = (match as RegExpMatchArray)[1];
      const sorted = captured.split("|").sort().join("|");
      expect(sorted).toBe(expected);
    }
  });

  it("does not attach X-Robots-Tag to any other surface", () => {
    const config = loadVercelConfig();
    const sourcesWithNoindex = (config.headers ?? [])
      .filter((entry) =>
        entry.headers.some((header) => header.key === "X-Robots-Tag")
      )
      .map((entry) => entry.source);
    for (const source of sourcesWithNoindex) {
      expect(source.startsWith("/event/:slug(")).toBe(true);
      expect(source).not.toMatch(/\/event\/:slug\([^)]+\)\/game$/);
      expect(source).not.toMatch(/\/event\/:slug\([^)]+\)\/game\/?$/);
    }
  });
});
