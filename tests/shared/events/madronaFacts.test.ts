import { describe, expect, it } from "vitest";

import {
  madronaFacts,
  withSource,
} from "../../../shared/events/madrona-facts.ts";

describe("withSource", () => {
  it("tags a destination with the campaign triple", () => {
    const tagged = new URL(withSource("https://example.test/donate", "landing"));

    expect(tagged.searchParams.get("utm_source")).toBe("neighborly");
    expect(tagged.searchParams.get("utm_medium")).toBe("landing");
    expect(tagged.searchParams.get("utm_campaign")).toBe("madrona-2026");
  });

  it("varies only the medium across surfaces", () => {
    const surfaces = ["masthead", "landing", "completion"] as const;

    const mediums = surfaces.map((surface) =>
      new URL(withSource("https://example.test/donate", surface)).searchParams
        .get("utm_medium")
    );

    expect(mediums).toEqual([...surfaces]);
  });

  it("preserves the destination's own path and existing query", () => {
    const tagged = new URL(
      withSource("https://example.test/en-US/form?ref=poster", "completion"),
    );

    expect(tagged.origin).toBe("https://example.test");
    expect(tagged.pathname).toBe("/en-US/form");
    expect(tagged.searchParams.get("ref")).toBe("poster");
  });

  it("overwrites rather than duplicates a parameter it owns", () => {
    const tagged = withSource(
      "https://example.test/donate?utm_source=stale",
      "masthead",
    );

    expect(tagged.match(/utm_source=/g)).toHaveLength(1);
    expect(new URL(tagged).searchParams.get("utm_source")).toBe("neighborly");
  });

  it("returns an unparseable href unchanged instead of throwing", () => {
    // These calls run at module load. A throw would take down every
    // surface that states the destination, to save one link's tags.
    expect(withSource("/event/madrona/feedback", "landing")).toBe(
      "/event/madrona/feedback",
    );
    expect(withSource("", "landing")).toBe("");
  });

  it("leaves the untagged facts as the bare destinations", () => {
    // The facts are the addresses; the tags are added by consumers, so
    // a surface that has no campaign to declare still has an href.
    for (
      const href of [
        madronaFacts.donateHref,
        madronaFacts.emailListHref,
        madronaFacts.volunteerHref,
      ]
    ) {
      expect(href).not.toContain("utm_");
      expect(href.startsWith("https://")).toBe(true);
    }
  });
});
