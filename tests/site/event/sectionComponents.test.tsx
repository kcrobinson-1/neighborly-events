import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { EventCTA } from "../../../apps/site/components/event/EventCTA.tsx";
import { EventDonateCTA } from "../../../apps/site/components/event/EventDonateCTA.tsx";
import { EventFAQ } from "../../../apps/site/components/event/EventFAQ.tsx";
import { EventFeedbackCTA } from "../../../apps/site/components/event/EventFeedbackCTA.tsx";
import { EventFooter } from "../../../apps/site/components/event/EventFooter.tsx";
import { EventHeader } from "../../../apps/site/components/event/EventHeader.tsx";
import { EventLandingPage } from "../../../apps/site/components/event/EventLandingPage.tsx";
import { EventLineup } from "../../../apps/site/components/event/EventLineup.tsx";
import { EventMasthead } from "../../../apps/site/components/event/EventMasthead.tsx";
import { EventSchedule } from "../../../apps/site/components/event/EventSchedule.tsx";
import { EventSponsors } from "../../../apps/site/components/event/EventSponsors.tsx";
import { TestEventDisclaimer } from "../../../apps/site/components/event/TestEventDisclaimer.tsx";
import { harvestBlockPartyContent } from "../../../apps/site/events/harvest-block-party.ts";
import { riversideJamContent } from "../../../apps/site/events/riverside-jam.ts";
import type { EventContent } from "../../../apps/site/lib/eventContent.ts";

const feedbackFixture: NonNullable<EventContent["feedback"]> = {
  cta: {
    heading: "How was the show?",
    body: "Tell us what you liked or didn't.",
  },
  ratingDimensions: [
    { key: "music", label: "Music choice" },
    { key: "overall", label: "Overall" },
  ],
  freeTextPrompt: "Anything specific you'd like the organizer to hear?",
  emailCopy: {
    label: "Email — so we can follow up",
    newsletterOptInLabel: "Add me to the newsletter",
  },
  thankYouMessage: "Thanks — we read every response.",
};

const mastheadFixture: NonNullable<EventContent["masthead"]> = {
  quiz: { label: "Quiz", href: "/event/synthetic-event/game" },
  feedback: { label: "Feedback", href: "/event/synthetic-event/feedback" },
  signup: { label: "Sign up", href: "/event/synthetic-event/signup" },
  donate: {
    label: "Donate",
    href: "https://donations.example.org/synthetic-form",
  },
};

const donateFixture: NonNullable<EventContent["donate"]> = {
  heading: "Keep the show free",
  body: "Neighbors chip in to cover the costs.",
  buttonLabel: "Donate now",
  href: "https://donations.example.org/synthetic-form",
};

afterEach(cleanup);

const baseContent: EventContent = {
  slug: "synthetic-event",
  themeSlug: "synthetic-event",
  meta: {
    title: "Synthetic Event",
    description: "Synthetic event for unit tests.",
  },
  hero: {
    name: "Synthetic Event Title",
    tagline: "A synthetic tagline",
    dates: { start: "2026-09-26", end: "2026-09-27" },
    location: "Synthetic Location",
  },
  schedule: {
    days: [
      {
        date: "2026-09-26",
        label: "Day One",
        sessions: [
          { time: "10:00 AM", title: "Opening session" },
          {
            time: "12:00 PM",
            title: "Lunch session",
            description: "A short description",
          },
        ],
      },
    ],
  },
  lineup: [
    {
      slug: "synthetic-performer",
      name: "Synthetic Performer",
      bio: "Synthetic performer bio",
      setTimes: [{ day: "2026-09-26", time: "2:00 PM" }],
    },
  ],
  sponsors: [
    {
      name: "Synthetic Sponsor",
      logoSrc: "/test-events/synthetic/synthetic-sponsor.svg",
      logoAlt: "Synthetic Sponsor logo",
      href: "https://example.com/synthetic-sponsor",
      tier: "Headline",
    },
    {
      name: "Other Sponsor",
      logoSrc: "/test-events/synthetic/other-sponsor.svg",
      logoAlt: "Other Sponsor logo",
      href: "https://example.com/other-sponsor",
      tier: "Supporting",
    },
  ],
  faq: [
    {
      question: "Is this real?",
      answer: "No, it's a synthetic test fixture.",
    },
  ],
  cta: { label: "Play the synthetic game", sublabel: "A synthetic sublabel" },
  footer: { attribution: "Synthetic attribution." },
};

describe("EventHeader", () => {
  it("renders the hero name, formatted dates, location, and CTA", () => {
    render(<EventHeader content={baseContent} slug={baseContent.slug} />);
    expect(
      screen.getByRole("heading", { name: "Synthetic Event Title", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByText("A synthetic tagline")).toBeTruthy();
    expect(screen.getByText("Synthetic Location")).toBeTruthy();
    expect(screen.getByText("Sep 26-27, 2026")).toBeTruthy();
    const cta = screen.getByRole("link", { name: "Play the synthetic game" });
    expect(cta.getAttribute("href")).toBe("/event/synthetic-event/game");
  });

  it("formats date ranges that span months and years", () => {
    const crossMonth: EventContent = {
      ...baseContent,
      hero: {
        ...baseContent.hero,
        dates: { start: "2026-09-30", end: "2026-10-01" },
      },
    };
    render(<EventHeader content={crossMonth} slug={crossMonth.slug} />);
    expect(screen.getByText("Sep 30 – Oct 1, 2026")).toBeTruthy();
  });

  it("falls back to raw date strings when an endpoint fails calendar validity", () => {
    // Guards against a content-author typo (e.g. month 13, Feb 30)
    // rendering broken output like `undefined 5, 2026` in the hero.
    const invalidContent: EventContent = {
      ...baseContent,
      hero: {
        ...baseContent.hero,
        dates: { start: "2026-13-05", end: "2026-13-06" },
      },
    };
    render(<EventHeader content={invalidContent} slug={invalidContent.slug} />);
    expect(screen.getByText("2026-13-05 – 2026-13-06")).toBeTruthy();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });
});

describe("EventSchedule", () => {
  it("renders day labels and session titles", () => {
    render(<EventSchedule schedule={baseContent.schedule} />);
    expect(screen.getByText("Day One")).toBeTruthy();
    expect(screen.getByText("Opening session")).toBeTruthy();
    expect(screen.getByText("Lunch session")).toBeTruthy();
    expect(screen.getByText("A short description")).toBeTruthy();
  });
});

describe("EventLineup", () => {
  it("renders performer names, bios, and set times", () => {
    render(<EventLineup lineup={baseContent.lineup} />);
    expect(screen.getByText("Synthetic Performer")).toBeTruthy();
    expect(screen.getByText("Synthetic performer bio")).toBeTruthy();
    expect(screen.getByText("2026-09-26 — 2:00 PM")).toBeTruthy();
  });

  it("renders nothing for absent depth fields", () => {
    const { container } = render(
      <EventLineup lineup={baseContent.lineup} />,
    );
    expect(container.querySelector(".event-lineup-image")).toBeNull();
    expect(container.querySelector(".event-lineup-extended-bio")).toBeNull();
    expect(container.querySelector(".event-lineup-quote")).toBeNull();
    expect(container.querySelector(".event-lineup-external-links")).toBeNull();
  });

  it("renders the band image with explicit alt text when imageSrc and imageAlt are present", () => {
    const lineup: EventContent["lineup"] = [
      {
        ...baseContent.lineup[0],
        imageSrc: "/test/band.jpg",
        imageAlt: "Synthetic Performer band photo",
      },
    ];
    render(<EventLineup lineup={lineup} />);
    const image = screen.getByRole("img", {
      name: "Synthetic Performer band photo",
    });
    expect(image.getAttribute("src")).toBe("/test/band.jpg");
  });

  it("falls back to the performer name for image alt when imageAlt is omitted", () => {
    const lineup: EventContent["lineup"] = [
      {
        ...baseContent.lineup[0],
        imageSrc: "/test/band.jpg",
      },
    ];
    render(<EventLineup lineup={lineup} />);
    const image = screen.getByRole("img", { name: "Synthetic Performer" });
    expect(image.getAttribute("src")).toBe("/test/band.jpg");
  });

  it("splits extendedBio into paragraphs on \\n\\n", () => {
    const lineup: EventContent["lineup"] = [
      {
        ...baseContent.lineup[0],
        extendedBio:
          "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
      },
    ];
    const { container } = render(<EventLineup lineup={lineup} />);
    const paragraphs = container.querySelectorAll(
      ".event-lineup-extended-bio p",
    );
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].textContent).toBe("First paragraph.");
    expect(paragraphs[1].textContent).toBe("Second paragraph.");
    expect(paragraphs[2].textContent).toBe("Third paragraph.");
  });

  it("filters empty extendedBio paragraphs from triple-newline runs", () => {
    const lineup: EventContent["lineup"] = [
      {
        ...baseContent.lineup[0],
        extendedBio: "First.\n\n\n\nSecond.",
      },
    ];
    const { container } = render(<EventLineup lineup={lineup} />);
    const paragraphs = container.querySelectorAll(
      ".event-lineup-extended-bio p",
    );
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("First.");
    expect(paragraphs[1].textContent).toBe("Second.");
  });

  it("renders featuredQuote with both text and attribution when present", () => {
    const lineup: EventContent["lineup"] = [
      {
        ...baseContent.lineup[0],
        featuredQuote: {
          text: "A quote about the band.",
          attribution: "Some Reviewer",
        },
      },
    ];
    const { container } = render(<EventLineup lineup={lineup} />);
    expect(screen.getByText("A quote about the band.")).toBeTruthy();
    expect(screen.getByText("Some Reviewer")).toBeTruthy();
    expect(container.querySelector(".event-lineup-quote cite")).not.toBeNull();
  });

  it("renders featuredQuote text without a cite when attribution is omitted", () => {
    const lineup: EventContent["lineup"] = [
      {
        ...baseContent.lineup[0],
        featuredQuote: { text: "An unattributed quote." },
      },
    ];
    const { container } = render(<EventLineup lineup={lineup} />);
    expect(screen.getByText("An unattributed quote.")).toBeTruthy();
    expect(container.querySelector(".event-lineup-quote cite")).toBeNull();
  });

  it("renders externalLinks as labeled anchors with target=_blank rel=noopener noreferrer", () => {
    const lineup: EventContent["lineup"] = [
      {
        ...baseContent.lineup[0],
        externalLinks: [
          { label: "Spotify", href: "https://example.com/spotify" },
          { label: "Bandcamp", href: "https://example.com/bandcamp" },
        ],
      },
    ];
    render(<EventLineup lineup={lineup} />);
    const spotify = screen.getByRole("link", { name: "Spotify" });
    expect(spotify.getAttribute("href")).toBe("https://example.com/spotify");
    expect(spotify.getAttribute("target")).toBe("_blank");
    expect(spotify.getAttribute("rel")).toBe("noopener noreferrer");
    expect(
      screen.getByRole("link", { name: "Bandcamp" }).getAttribute("href"),
    ).toBe("https://example.com/bandcamp");
  });
});

describe("EventSponsors", () => {
  it("renders each sponsor as a link with the logo's alt text and href", () => {
    render(<EventSponsors sponsors={baseContent.sponsors} />);
    const link = screen.getByRole("link", { name: "Synthetic Sponsor logo" });
    expect(link.getAttribute("href")).toBe(
      "https://example.com/synthetic-sponsor",
    );
    const logo = within(link).getByRole("img", {
      name: "Synthetic Sponsor logo",
    });
    expect(logo.getAttribute("src")).toBe(
      "/test-events/synthetic/synthetic-sponsor.svg",
    );
  });

  it("groups sponsors by tier when any sponsor sets a tier", () => {
    render(<EventSponsors sponsors={baseContent.sponsors} />);
    expect(screen.getByRole("heading", { name: "Headline" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Supporting" })).toBeTruthy();
  });

  it("renders sponsors flat when no sponsor sets a tier", () => {
    const flatSponsors: EventContent["sponsors"] = [
      {
        name: "Untiered Sponsor",
        logoSrc: "/test-events/synthetic/untiered.svg",
        logoAlt: "Untiered Sponsor logo",
        href: "https://example.com/untiered",
      },
    ];
    render(<EventSponsors sponsors={flatSponsors} />);
    // No tier headings — only the section heading exists.
    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe("Sponsors");
  });

  it("renders nothing for absent depth fields", () => {
    const { container } = render(
      <EventSponsors sponsors={baseContent.sponsors} />,
    );
    expect(
      container.querySelector(".event-sponsors-short-description"),
    ).toBeNull();
    expect(container.querySelector(".event-sponsors-social-links")).toBeNull();
  });

  it("renders shortDescription when present", () => {
    const sponsors: EventContent["sponsors"] = [
      {
        ...baseContent.sponsors[0],
        shortDescription: "A short sponsor blurb for unit tests.",
      },
    ];
    render(<EventSponsors sponsors={sponsors} />);
    expect(
      screen.getByText("A short sponsor blurb for unit tests."),
    ).toBeTruthy();
  });

  it("renders socialLinks as labeled anchors with target=_blank rel=noopener noreferrer", () => {
    const sponsors: EventContent["sponsors"] = [
      {
        ...baseContent.sponsors[0],
        socialLinks: [
          { label: "Instagram", href: "https://example.com/instagram" },
          { label: "LinkedIn", href: "https://example.com/linkedin" },
        ],
      },
    ];
    render(<EventSponsors sponsors={sponsors} />);
    const ig = screen.getByRole("link", { name: "Instagram" });
    expect(ig.getAttribute("href")).toBe("https://example.com/instagram");
    expect(ig.getAttribute("target")).toBe("_blank");
    expect(ig.getAttribute("rel")).toBe("noopener noreferrer");
    expect(
      screen.getByRole("link", { name: "LinkedIn" }).getAttribute("href"),
    ).toBe("https://example.com/linkedin");
  });
});

describe("EventFAQ", () => {
  it("renders each FAQ question inside a <summary>", () => {
    const { container } = render(<EventFAQ faq={baseContent.faq} />);
    const summary = container.querySelector("summary");
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toBe("Is this real?");
    expect(screen.getByText("No, it's a synthetic test fixture.")).toBeTruthy();
  });
});

describe("EventCTA", () => {
  it("renders a link to routes.game(slug) with the CTA label and sublabel", () => {
    render(<EventCTA cta={baseContent.cta} slug={baseContent.slug} />);
    const cta = screen.getByRole("link", { name: "Play the synthetic game" });
    expect(cta.getAttribute("href")).toBe("/event/synthetic-event/game");
    expect(screen.getByText("A synthetic sublabel")).toBeTruthy();
  });
});

describe("EventFooter", () => {
  it("renders the attribution and a link back to /", () => {
    render(<EventFooter footer={baseContent.footer} />);
    expect(screen.getByText("Synthetic attribution.")).toBeTruthy();
    const homeLink = screen.getByRole("link", {
      name: "Back to Neighborly Events",
    });
    expect(homeLink.getAttribute("href")).toBe("/");
  });

  it("falls back to the platform attribution when none is provided", () => {
    render(<EventFooter />);
    expect(screen.getByText("Hosted on Neighborly Events.")).toBeTruthy();
  });
});

describe("TestEventDisclaimer", () => {
  it("renders the demo-event disclaimer copy", () => {
    render(<TestEventDisclaimer />);
    expect(screen.getByText("Demo event for platform testing.")).toBeTruthy();
    expect(screen.getByText("Not a real public event.")).toBeTruthy();
  });
});

describe("EventFeedbackCTA", () => {
  it("renders the heading, optional body, and a feedback link with the slug-keyed href", () => {
    render(
      <EventFeedbackCTA feedback={feedbackFixture} slug="any-slug" />,
    );
    expect(
      screen.getByRole("heading", { name: "How was the show?" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Tell us what you liked or didn't."),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: "Share feedback" });
    expect(link.getAttribute("href")).toBe("/event/any-slug/feedback");
  });

  it("omits the body paragraph when feedback.cta.body is absent", () => {
    const noBody: NonNullable<EventContent["feedback"]> = {
      ...feedbackFixture,
      cta: { heading: "How was the show?" },
    };
    const { container } = render(
      <EventFeedbackCTA feedback={noBody} slug="any-slug" />,
    );
    expect(
      screen.getByRole("heading", { name: "How was the show?" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Share feedback" })).toBeTruthy();
    expect(container.querySelector(".event-feedback-cta-body")).toBeNull();
  });

  it("URL-encodes slugs containing reserved characters in the href", () => {
    // Mirrors the encoding discipline at shared/urls/routes.ts:30-38.
    // Defensive against future slugs that slip past authoring-layer
    // validation (no slug-format CHECK exists today; tracked in
    // docs/backlog.md Tier 1). For canonical kebab-case ASCII slugs,
    // encodeURIComponent is a no-op.
    render(
      <EventFeedbackCTA feedback={feedbackFixture} slug="my event/slug" />,
    );
    const link = screen.getByRole("link", { name: "Share feedback" });
    expect(link.getAttribute("href")).toBe(
      "/event/my%20event%2Fslug/feedback",
    );
  });
});

describe("EventDonateCTA", () => {
  it("renders the heading, optional body, and an external donate link opening in a new tab", () => {
    render(<EventDonateCTA donate={donateFixture} />);
    expect(
      screen.getByRole("heading", { name: "Keep the show free" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Neighbors chip in to cover the costs."),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: "Donate now" });
    expect(link.getAttribute("href")).toBe(
      "https://donations.example.org/synthetic-form",
    );
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("omits the body paragraph when donate.body is absent", () => {
    const noBody: NonNullable<EventContent["donate"]> = {
      heading: "Keep the show free",
      buttonLabel: "Donate now",
      href: "https://donations.example.org/synthetic-form",
    };
    const { container } = render(<EventDonateCTA donate={noBody} />);
    expect(
      screen.getByRole("heading", { name: "Keep the show free" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Donate now" })).toBeTruthy();
    expect(container.querySelector(".event-donate-cta-body")).toBeNull();
  });
});

describe("EventMasthead", () => {
  it("renders a labelled nav with each configured link's config-owned href", () => {
    render(<EventMasthead masthead={mastheadFixture} />);
    expect(
      screen.getByRole("navigation", { name: "Event quick links" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Quiz" }).getAttribute("href"),
    ).toBe("/event/synthetic-event/game");
    expect(
      screen.getByRole("link", { name: "Feedback" }).getAttribute("href"),
    ).toBe("/event/synthetic-event/feedback");
    expect(
      screen.getByRole("link", { name: "Sign up" }).getAttribute("href"),
    ).toBe("/event/synthetic-event/signup");
    expect(
      screen.getByRole("link", { name: "Donate" }).getAttribute("href"),
    ).toBe("https://donations.example.org/synthetic-form");
  });

  it("opens the donate link in a new tab with rel=noopener; the in-app links stay same-tab", () => {
    render(<EventMasthead masthead={mastheadFixture} />);
    const donate = screen.getByRole("link", { name: "Donate" });
    expect(donate.getAttribute("target")).toBe("_blank");
    expect(donate.getAttribute("rel")).toContain("noopener");
    for (const name of ["Quiz", "Feedback", "Sign up"]) {
      expect(
        screen.getByRole("link", { name }).getAttribute("target"),
      ).toBeNull();
    }
  });

  it("omits absent slots without rendering placeholders", () => {
    render(
      <EventMasthead
        masthead={{ quiz: { label: "Quiz", href: "/event/x/game" } }}
      />,
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Feedback" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign up" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Donate" })).toBeNull();
  });
});

describe("EventLandingPage", () => {
  it("composes all sections and shows the disclaimer for test events", () => {
    const testContent: EventContent = { ...baseContent, testEvent: true };
    render(
      <EventLandingPage content={testContent} slug={testContent.slug} />,
    );
    expect(screen.getByText("Demo event for platform testing.")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Synthetic Event Title", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Schedule" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Lineup" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Sponsors" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Frequently asked questions" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ready to play?" })).toBeTruthy();
  });

  it("hides the disclaimer for non-test events", () => {
    render(
      <EventLandingPage content={baseContent} slug={baseContent.slug} />,
    );
    expect(screen.queryByText("Demo event for platform testing.")).toBeNull();
  });

  it("omits empty sections (lineup, sponsors, faq) without rendering their headings", () => {
    const sparseContent: EventContent = {
      ...baseContent,
      lineup: [],
      sponsors: [],
      faq: [],
    };
    render(
      <EventLandingPage content={sparseContent} slug={sparseContent.slug} />,
    );
    expect(screen.queryByRole("heading", { name: "Lineup" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Sponsors" })).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "Frequently asked questions" }),
    ).toBeNull();
    // Header, schedule, CTA still render.
    expect(
      screen.getByRole("heading", { name: "Synthetic Event Title", level: 1 }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Schedule" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ready to play?" })).toBeTruthy();
  });

  it("omits the schedule section when no days are present", () => {
    const noScheduleContent: EventContent = {
      ...baseContent,
      schedule: { days: [] },
    };
    render(
      <EventLandingPage
        content={noScheduleContent}
        slug={noScheduleContent.slug}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Schedule" })).toBeNull();
  });

  it("renders the EventFeedbackCTA section when content.feedback is set", () => {
    const optedIn: EventContent = {
      ...baseContent,
      feedback: feedbackFixture,
    };
    const { container } = render(
      <EventLandingPage content={optedIn} slug={optedIn.slug} />,
    );
    expect(container.querySelector(".event-feedback-cta")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "How was the show?" }),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: "Share feedback" });
    expect(link.getAttribute("href")).toBe(
      `/event/${optedIn.slug}/feedback`,
    );
  });

  it("omits the EventFeedbackCTA section when content.feedback is absent (baseContent)", () => {
    const { container } = render(
      <EventLandingPage content={baseContent} slug={baseContent.slug} />,
    );
    expect(container.querySelector(".event-feedback-cta")).toBeNull();
    expect(screen.queryByText("Share feedback")).toBeNull();
  });

  it("renders the EventDonateCTA section when content.donate is set", () => {
    const optedIn: EventContent = {
      ...baseContent,
      donate: donateFixture,
    };
    const { container } = render(
      <EventLandingPage content={optedIn} slug={optedIn.slug} />,
    );
    expect(container.querySelector(".event-donate-cta")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Keep the show free" }),
    ).toBeTruthy();
    const link = screen.getByRole("link", { name: "Donate now" });
    expect(link.getAttribute("href")).toBe(
      "https://donations.example.org/synthetic-form",
    );
  });

  it("omits the EventDonateCTA section when content.donate is absent (baseContent)", () => {
    const { container } = render(
      <EventLandingPage content={baseContent} slug={baseContent.slug} />,
    );
    expect(container.querySelector(".event-donate-cta")).toBeNull();
    expect(screen.queryByText("Donate now")).toBeNull();
  });

  it("renders the EventMasthead nav above the hero when content.masthead is set", () => {
    const optedIn: EventContent = {
      ...baseContent,
      masthead: mastheadFixture,
    };
    const { container } = render(
      <EventLandingPage content={optedIn} slug={optedIn.slug} />,
    );
    const nav = screen.getByRole("navigation", { name: "Event quick links" });
    const hero = container.querySelector(".event-hero");
    expect(hero).not.toBeNull();
    // Document order: the masthead precedes the hero header.
    expect(
      nav.compareDocumentPosition(hero as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Sign up" }).getAttribute("href"),
    ).toBe("/event/synthetic-event/signup");
  });

  it("omits the EventMasthead nav when content.masthead is absent (baseContent)", () => {
    const { container } = render(
      <EventLandingPage content={baseContent} slug={baseContent.slug} />,
    );
    expect(container.querySelector(".event-masthead")).toBeNull();
    expect(
      screen.queryByRole("navigation", { name: "Event quick links" }),
    ).toBeNull();
  });

  it("renders no feedback CTA, donate CTA, or masthead on the test events (same-section-set invariant)", () => {
    // Falsifies the milestone-level rule that test events render the
    // same set of sections — no new section sprouts after this phase.
    // Markup-level drift inside an existing section's body is not
    // bound by this assertion; only the *presence* of the new
    // feedback / donate / masthead sections on test events would
    // falsify the invariant.
    for (const content of [harvestBlockPartyContent, riversideJamContent]) {
      const { container, unmount } = render(
        <EventLandingPage content={content} slug={content.slug} />,
      );
      expect(container.querySelector(".event-feedback-cta")).toBeNull();
      expect(screen.queryByText("Share feedback")).toBeNull();
      expect(container.querySelector(".event-donate-cta")).toBeNull();
      expect(container.querySelector(".event-masthead")).toBeNull();
      unmount();
    }
  });
});
