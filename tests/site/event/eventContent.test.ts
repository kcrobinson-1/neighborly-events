import { describe, expect, it } from "vitest";

import { harvestBlockPartyContent } from "../../../apps/site/events/harvest-block-party.ts";
import { madronaContent } from "../../../apps/site/events/madrona.ts";
import { riversideJamContent } from "../../../apps/site/events/riverside-jam.ts";
import {
  getEventContentBySlug,
  parseEventDate,
  registeredEventSlugs,
} from "../../../apps/site/lib/eventContent.ts";

describe("getEventContentBySlug", () => {
  it("returns the registered content for the harvest-block-party slug", () => {
    // Referential identity (`toBe`), not deep-equal: the test fails
    // if the registry is rewired to a copy or alias.
    expect(getEventContentBySlug("harvest-block-party")).toBe(
      harvestBlockPartyContent,
    );
  });

  it("returns the registered content for the riverside-jam slug", () => {
    // M3 phase 3.2 registered the second test event. Same
    // referential-identity stance as the harvest case above.
    expect(getEventContentBySlug("riverside-jam")).toBe(riversideJamContent);
  });

  it("returns the registered content for the madrona slug", () => {
    // The Madrona demo-build epic M1 phase 1.1 registered Madrona as
    // the first non-test entry. Referential identity again.
    expect(getEventContentBySlug("madrona")).toBe(madronaContent);
  });

  it("returns null for unknown slugs", () => {
    expect(getEventContentBySlug("not-a-real-slug")).toBeNull();
    expect(getEventContentBySlug("")).toBeNull();
  });
});

describe("registeredEventSlugs", () => {
  it("is non-empty", () => {
    // Sanity floor — `generateStaticParams` reads from this list and
    // an empty list would silently zero out the prerender set.
    expect(registeredEventSlugs.length).toBeGreaterThan(0);
  });

  it("every slug resolves via getEventContentBySlug, and the resolved content's slug matches the registry key", () => {
    // The page route's `Page` and `generateMetadata` resolve content
    // via `params.slug`; if a registered content's `slug` field
    // diverged from its registry key, every consumer reading
    // `content.slug` would see a different string from the URL. This
    // walk also catches a registry entry whose value is `null`,
    // `undefined`, or a stale alias.
    for (const slug of registeredEventSlugs) {
      const content = getEventContentBySlug(slug);
      expect(content, `expected content for slug=${slug}`).not.toBeNull();
      expect(content?.slug, `slug field should match registry key for ${slug}`).toBe(slug);
    }
  });
});

describe("madrona launch content", () => {
  // Walks every string in the content tree. Guards the whole
  // placeholder sweep at once: any example.com URL reintroduced
  // anywhere in madrona's content (sponsor hrefs, social links,
  // band externalLinks) fails here. The feedback email placeholder
  // ("you@example.com") is not a URL and deliberately passes.
  function collectStrings(value: unknown): string[] {
    if (typeof value === "string") {
      return [value];
    }
    if (Array.isArray(value)) {
      return value.flatMap(collectStrings);
    }
    if (value !== null && typeof value === "object") {
      return Object.values(value).flatMap(collectStrings);
    }
    return [];
  }

  it("contains no example.com placeholder URLs", () => {
    const offenders = collectStrings(madronaContent).filter((text) =>
      /https?:\/\/example\.com/.test(text),
    );
    expect(offenders).toEqual([]);
  });

  it("is indexable (no robots noindex) — launch posture", () => {
    // The demo-phase `meta.robots: "noindex"` was removed when the
    // real 2026 content landed; reintroducing it would silently pull
    // the launch page out of search.
    expect(madronaContent.meta.robots).toBeUndefined();
  });

  it("carries the donate CTA pointing at the association's donation form", () => {
    expect(madronaContent.donate?.href).toBe(
      "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026",
    );
  });
});

describe("parseEventDate", () => {
  it("parses well-formed ISO yyyy-mm-dd dates", () => {
    expect(parseEventDate("2026-09-26")).toEqual({
      year: 2026,
      month: 9,
      day: 26,
    });
    expect(parseEventDate("2024-02-29")).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
    expect(parseEventDate("2026-12-31")).toEqual({
      year: 2026,
      month: 12,
      day: 31,
    });
  });

  it("rejects strings that do not match the strict yyyy-mm-dd shape", () => {
    expect(parseEventDate("2026-9-26")).toBeNull();
    expect(parseEventDate("2026/09/26")).toBeNull();
    expect(parseEventDate("26-09-26")).toBeNull();
    expect(parseEventDate("")).toBeNull();
    expect(parseEventDate("not-a-date")).toBeNull();
    expect(parseEventDate("2026-09-26T12:00:00")).toBeNull();
  });

  it("rejects out-of-range months and days", () => {
    expect(parseEventDate("2026-13-05")).toBeNull();
    expect(parseEventDate("2026-00-20")).toBeNull();
    expect(parseEventDate("2026-09-32")).toBeNull();
    expect(parseEventDate("2026-09-00")).toBeNull();
  });

  it("rejects month-specific day overflow (Apr 31, Feb 30)", () => {
    expect(parseEventDate("2026-04-31")).toBeNull();
    expect(parseEventDate("2026-02-30")).toBeNull();
    expect(parseEventDate("2026-06-31")).toBeNull();
  });

  it("rejects Feb 29 in non-leap years and accepts it in leap years", () => {
    expect(parseEventDate("2026-02-29")).toBeNull();
    expect(parseEventDate("2024-02-29")).toEqual({
      year: 2024,
      month: 2,
      day: 29,
    });
  });
});
