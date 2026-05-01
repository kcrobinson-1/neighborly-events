import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { EventCTA } from "../../../apps/site/components/event/EventCTA.tsx";
import { EventFAQ } from "../../../apps/site/components/event/EventFAQ.tsx";
import { EventFooter } from "../../../apps/site/components/event/EventFooter.tsx";
import { EventHeader } from "../../../apps/site/components/event/EventHeader.tsx";
import { EventLandingPage } from "../../../apps/site/components/event/EventLandingPage.tsx";
import { EventLineup } from "../../../apps/site/components/event/EventLineup.tsx";
import { EventSchedule } from "../../../apps/site/components/event/EventSchedule.tsx";
import { EventSponsors } from "../../../apps/site/components/event/EventSponsors.tsx";
import { TestEventDisclaimer } from "../../../apps/site/components/event/TestEventDisclaimer.tsx";
import type { EventContent } from "../../../apps/site/lib/eventContent.ts";

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
});
