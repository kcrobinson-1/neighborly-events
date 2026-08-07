import { describe, expect, it } from "vitest";

import {
  getEventMasthead,
  mastheadBySlug,
} from "../../../shared/masthead/mastheadContent.ts";

describe("getEventMasthead", () => {
  it("returns the Madrona entry with config-owned destinations", () => {
    const masthead = getEventMasthead("madrona");

    expect(masthead).not.toBeNull();
    expect(masthead?.brand.name).toBe("MADRONA");
    expect(masthead?.brand.tagline).toBe("MUSIC IN THE PLAYFIELD");
    expect(masthead?.brand.homeHref).toBe("/event/madrona");
    expect(masthead?.quiz.href).toBe("/event/madrona/game");
    expect(masthead?.newsletter.href).toBe("/event/madrona/signup");
    expect(masthead?.newsletter.label).toBe("Newsletter");
    expect(masthead?.feedback.href).toBe("/event/madrona/feedback");
    expect(masthead?.donate.href).toBe(
      "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026",
    );
  });

  it("returns null for events without an entry (test events render no bar)", () => {
    for (const slug of ["harvest-block-party", "riverside-jam", "unknown"]) {
      expect(getEventMasthead(slug)).toBeNull();
    }
  });

  it("registers only launch events", () => {
    expect(Object.keys(mastheadBySlug)).toEqual(["madrona"]);
  });
});
