import { describe, expect, it } from "vitest";

import { harvestBlockPartyContent } from "../../../apps/site/events/harvest-block-party.ts";
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

  it("returns null for unknown slugs", () => {
    expect(getEventContentBySlug("madrona")).toBeNull();
    expect(getEventContentBySlug("not-a-real-slug")).toBeNull();
    expect(getEventContentBySlug("")).toBeNull();
  });

  it("registered content's slug field matches its registry key", () => {
    // The page route's `Page` and `generateMetadata` resolve content
    // via `params.slug`; if the registered content's `slug` field
    // diverged from the registry key, every consumer reading
    // `content.slug` would see a different string from the URL.
    const content = getEventContentBySlug("harvest-block-party");
    expect(content?.slug).toBe("harvest-block-party");
  });
});

describe("registeredEventSlugs", () => {
  it("contains exactly the registered slugs", () => {
    expect(registeredEventSlugs.sort()).toEqual(["harvest-block-party"]);
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
