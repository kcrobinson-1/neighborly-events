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
    expect(masthead?.emailList.label).toBe("Email list");
    // Both external destinations carry the masthead campaign tags, and
    // the whole string is pinned rather than just the address: the tags
    // are what the association reads in Mailchimp's and Zeffy's own
    // reporting, and a wrong `utm_medium` misattributes silently — the
    // link still works, so nothing else would catch it.
    expect(masthead?.emailList.href).toBe(
      "https://mailchi.mp/madrona/madrona-neighborhood-association-community-email" +
        "?utm_source=neighborly&utm_medium=masthead&utm_campaign=madrona-2026",
    );
    expect(masthead?.emailList.external).toBe(true);
    expect(masthead?.feedback.href).toBe("/event/madrona/feedback");
    expect(masthead?.donate.href).toBe(
      "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026" +
        "?utm_source=neighborly&utm_medium=masthead&utm_campaign=madrona-2026",
    );
    expect(masthead?.donate.external).toBe(true);
  });

  it("names no affordance a newsletter — the association's newsletter is a printed mailer", () => {
    for (const [slug, masthead] of Object.entries(mastheadBySlug)) {
      for (const link of [
        masthead.quiz,
        masthead.emailList,
        masthead.feedback,
        masthead.donate,
      ]) {
        expect(link.label.toLowerCase(), `${slug} nav label`).not.toContain(
          "newsletter",
        );
      }
    }
  });

  it("declares externality on exactly the links that leave the platform", () => {
    // The invariant the renderer depends on: it opens a new browsing
    // context for every link carrying `external`, so a link that leaves
    // the platform without declaring it would open in the same tab, and
    // one that declares it without leaving would strand the reader in a
    // second tab on a page this platform serves.
    for (const [slug, masthead] of Object.entries(mastheadBySlug)) {
      for (const link of [
        masthead.quiz,
        masthead.emailList,
        masthead.feedback,
        masthead.donate,
      ]) {
        const leavesPlatform = /^https?:\/\//.test(link.href);
        expect(
          Boolean(link.external),
          `${slug} ${link.label} (${link.href})`,
        ).toBe(leavesPlatform);
      }
    }
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
