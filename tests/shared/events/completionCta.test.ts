import { describe, expect, it } from "vitest";
import {
  completionCtaBySlug,
  getCompletionCta,
} from "../../../shared/events/completionCta.ts";

describe("getCompletionCta", () => {
  it("returns the Madrona launch entry with both CTA sections", () => {
    const cta = getCompletionCta("madrona");

    expect(cta).not.toBeNull();
    expect(cta?.heading).toBe("Enjoying Music in the Playfield?");
    expect(cta?.emailList?.buttonLabel).toBe("Join the email list");
    expect(cta?.emailList?.body).toBe(
      "Next week's lineup and neighborhood news, straight from the association.",
    );
    expect(cta?.emailList?.href).toBe(
      "https://mailchi.mp/madrona/madrona-neighborhood-association-community-email",
    );
    expect(cta?.donate?.buttonLabel).toBe("Support the Playfield");
    expect(cta?.donate?.href).toBe(
      "https://www.zeffy.com/en-US/donation-form/music-in-the-playfield--2026",
    );
  });

  it("mirrors the madrona entry on the first-sample demo fixture slug", () => {
    expect(getCompletionCta("first-sample")).toEqual(getCompletionCta("madrona"));
  });

  it("returns null for events without an entry", () => {
    expect(getCompletionCta("harvest-block-party")).toBeNull();
    expect(getCompletionCta("")).toBeNull();
  });

  it("keeps donation destinations on https so the completion screen never links out insecurely", () => {
    for (const [slug, cta] of Object.entries(completionCtaBySlug)) {
      if (cta.donate) {
        expect(cta.donate.href.startsWith("https://"), slug).toBe(true);
      }
    }
  });

  it("keeps every email-list destination an external https address that declares itself external", () => {
    // Replaces the invariant that required these hrefs to be on-site
    // `/event/<slug>/signup` paths. The platform no longer serves an
    // email-signup route, so the posture the registry now has to hold is
    // the opposite one: the destination belongs to whoever runs the
    // list, and the panel needs the `external` declaration to open it in
    // a new context. Asserting the scheme alone would not catch a
    // destination that leaves the platform without declaring it, which
    // would silently open the association's signup page in the same tab.
    for (const [slug, cta] of Object.entries(completionCtaBySlug)) {
      if (cta.emailList) {
        expect(
          cta.emailList.href.startsWith("https://"),
          `${slug} email-list href is https`,
        ).toBe(true);
        expect(
          cta.emailList.external,
          `${slug} email-list href declares externality`,
        ).toBe(true);
      }
    }
  });

  it("names no CTA section a newsletter — the association's newsletter is a printed mailer", () => {
    for (const [slug, cta] of Object.entries(completionCtaBySlug)) {
      for (const link of [cta.emailList, cta.donate]) {
        if (!link) continue;
        expect(link.buttonLabel.toLowerCase(), `${slug} button`).not.toContain(
          "newsletter",
        );
        expect(link.body.toLowerCase(), `${slug} body`).not.toContain(
          "newsletter",
        );
      }
    }
  });
});
