import { describe, expect, it } from "vitest";

import { harvestBlockPartyContent } from "../../../apps/site/events/harvest-block-party.ts";
import {
  getEventContentBySlug,
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
