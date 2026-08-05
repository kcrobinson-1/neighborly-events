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
    expect(cta?.newsletter?.buttonLabel).toBe("Sign up for updates");
    expect(cta?.newsletter?.href).toBe("/event/madrona/signup");
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

  it("keeps newsletter destinations on same-origin signup paths for newsletter-enabled events", () => {
    // The set of slugs with a standalone signup surface: apps/site's
    // EventContent registry entries carrying `newsletterSignup`, backed
    // by newsletter_enabled_events.
    const newsletterEnabledSlugs = new Set(["madrona"]);

    for (const [slug, cta] of Object.entries(completionCtaBySlug)) {
      if (cta.newsletter) {
        const match = cta.newsletter.href.match(/^\/event\/([^/]+)\/signup$/);
        expect(match, `${slug} newsletter href shape`).not.toBeNull();
        expect(
          newsletterEnabledSlugs.has(match![1]),
          `${slug} newsletter href targets a newsletter-enabled event`,
        ).toBe(true);
      }
    }
  });
});
