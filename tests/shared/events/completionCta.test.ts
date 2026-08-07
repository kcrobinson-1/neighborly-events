import { describe, expect, it } from "vitest";
import {
  completionCtaBySlug,
  getCompletionCta,
} from "../../../shared/events/completionCta.ts";
import { madronaFacts } from "../../../shared/events/madrona-facts.ts";
import { madronaContent } from "../../../apps/site/events/madrona.ts";

describe("getCompletionCta", () => {
  it("returns the Madrona launch entry with all three CTA sections", () => {
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
    expect(cta?.volunteer?.buttonLabel).toBe("Volunteer");
    expect(cta?.volunteer?.href).toBe("https://madrona.us/volunteers/");
  });

  it("sends the completion panel and the landing page to one volunteer address", () => {
    // Both surfaces compose from `madronaFacts.volunteerHref`. Asserted
    // because they are edited in different files by different changes,
    // and a second copy of this URL is exactly the drift the facts
    // module exists to prevent.
    expect(getCompletionCta("madrona")?.volunteer?.href).toBe(
      madronaFacts.volunteerHref,
    );
    expect(madronaContent.landing?.volunteer?.yearRound.href).toBe(
      madronaFacts.volunteerHref,
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

  it("keeps every email-list destination an external https address", () => {
    // Replaces the invariant that required these hrefs to be on-site
    // `/event/<slug>/signup` paths. The platform no longer serves an
    // email-signup route, so the posture the registry now has to hold is
    // the opposite one: the destination belongs to whoever runs the list.
    for (const [slug, cta] of Object.entries(completionCtaBySlug)) {
      if (cta.emailList) {
        expect(
          cta.emailList.href.startsWith("https://"),
          `${slug} email-list href is https`,
        ).toBe(true);
      }
    }
  });

  it("declares externality on exactly the links that leave the platform", () => {
    // Registry-wide, not per-section. The panel opens a new browsing
    // context for every link carrying `external`, so a link that leaves
    // the platform without declaring it opens in the same tab — taking
    // the screen holding the attendee's check-in code with it — and one
    // that declares it without leaving strands the reader in a second
    // tab on a page this platform serves.
    //
    // Scoped per-section rather than registry-wide, this missed the
    // donation link: it was the pre-existing off-platform CTA and
    // nothing re-checked it when the rule it now obeys was introduced.
    for (const [slug, cta] of Object.entries(completionCtaBySlug)) {
      for (const [section, link] of Object.entries(cta)) {
        if (typeof link !== "object" || link === null) continue;
        const leavesPlatform = /^https?:\/\//.test(link.href);
        expect(
          Boolean(link.external),
          `${slug} ${section} (${link.href})`,
        ).toBe(leavesPlatform);
      }
    }
  });

  it("keeps every CTA body free of clock times — this block has no date gate", () => {
    // `GameCompletionPanel` reads no clock and `getCompletionCta` takes
    // no date: the block renders on every completion for as long as the
    // quiz route is up, including long after a season ends. Copy naming
    // a time of day therefore cannot expire, so it must not be written.
    //
    // The day-of landing's volunteer section is the deliberate contrast
    // — it may be time-specific precisely because it resolves against
    // the event clock and drops its night-of ask with the season.
    for (const [slug, cta] of Object.entries(completionCtaBySlug)) {
      for (const [section, link] of Object.entries(cta)) {
        if (typeof link !== "object" || link === null) continue;
        expect(link.body, `${slug} ${section} body names a clock time`).not.toMatch(
          /\b\d{1,2}:\d{2}\b/,
        );
      }
    }
  });

  it("names no CTA section a newsletter — the association's newsletter is a printed mailer", () => {
    for (const [slug, cta] of Object.entries(completionCtaBySlug)) {
      for (const link of [cta.emailList, cta.donate, cta.volunteer]) {
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
