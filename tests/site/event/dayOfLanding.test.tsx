import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { EventLandingPage } from "../../../apps/site/components/event/EventLandingPage.tsx";
import { LandingTonightSections } from "../../../apps/site/components/event/LandingTonightSections.tsx";
import { harvestBlockPartyContent } from "../../../apps/site/events/harvest-block-party.ts";
import { madronaContent } from "../../../apps/site/events/madrona.ts";
import { riversideJamContent } from "../../../apps/site/events/riverside-jam.ts";
import { getEventMasthead } from "../../../shared/masthead/index.ts";

/**
 * Day-of landing layout (`EventDayOfLanding` +
 * `LandingTonightSections`) rendered through `EventLandingPage`
 * against the real madrona content — these tests double as launch-
 * content assertions, the same stance the nights content suite
 * takes.
 *
 * The clock is faked per test (`vi.setSystemTime`) because the
 * layout is a function of "now" twice over: the server pass bakes
 * `Date.now()` into `initialNowMs`, and the client component's mount
 * effect re-resolves against `new Date()`. Faking both keeps every
 * assertion deterministic on any CI date, including after the season
 * ends.
 */

const SVG_FIXTURE = "<svg viewBox=\"0 0 10 10\"><path d=\"M0 0\" /></svg>";

function renderMadrona(mastheadSvgMarkup: string | null = SVG_FIXTURE) {
  return render(
    <EventLandingPage
      content={madronaContent}
      slug="madrona"
      masthead={getEventMasthead("madrona")}
      mastheadSvgMarkup={mastheadSvgMarkup}
    />,
  );
}

function setClock(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("EventDayOfLanding — madrona on a concert Tuesday", () => {
  it("renders the day-of layout instead of the generic section stack", () => {
    setClock("2026-08-11T19:00:00Z"); // Tue Aug 11, noon PT
    const { container } = renderMadrona();

    expect(container.querySelector("main.event-landing")).not.toBeNull();
    expect(container.querySelector("main.event-shell")).toBeNull();
    // Generic-template sections must not render alongside.
    expect(screen.queryByRole("heading", { name: "Schedule" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Lineup" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Sponsors" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Ready to play?" })).toBeNull();
  });

  it("keeps the shared masthead bar as the sibling above <main>", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();
    const bar = container.querySelector(".event-masthead");
    expect(bar).not.toBeNull();
    expect((bar as Element).nextElementSibling).toBe(
      container.querySelector("main.event-landing"),
    );
  });

  it("inlines the hero art as an SVG under a labeled img role, with the welcome line", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();
    const art = screen.getByRole("img", {
      name: "Madrona Music in the Playfield",
    });
    expect(art.querySelector("svg")).not.toBeNull();
    expect(
      container.querySelector(".event-landing-welcome")?.textContent,
    ).toBe("Welcome to the playfield — here’s tonight.");
  });

  it("degrades to the no-art hero when the SVG markup is unavailable", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona(null);
    expect(container.querySelector(".event-landing-hero-art")).toBeNull();
    expect(container.querySelector(".event-landing-welcome")).not.toBeNull();
  });

  it("renders the four action tiles with renderer-owned destinations", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();
    const actions = within(
      container.querySelector(".event-landing-actions") as HTMLElement,
    );

    const quiz = actions.getByRole("link", { name: /Take the quiz/ });
    expect(quiz.getAttribute("href")).toBe("/event/madrona/game");
    const newsletter = actions.getByRole("link", { name: /Newsletter/ });
    expect(newsletter.getAttribute("href")).toBe("/event/madrona/signup");
    const feedback = actions.getByRole("link", { name: /Feedback/ });
    expect(feedback.getAttribute("href")).toBe("/event/madrona/feedback");
    const donate = actions.getByRole("link", { name: /Donate/ });
    expect(donate.getAttribute("href")).toBe(madronaContent.donate?.href);
    expect(donate.getAttribute("target")).toBe("_blank");
    expect(donate.getAttribute("rel")).toBe("noopener");
  });

  it("renders Tonight with the night's date line and starred main-set rows", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();

    expect(screen.getByRole("heading", { name: "Tonight" })).toBeTruthy();
    expect(
      container.querySelector(".event-landing-tonight-date")?.textContent,
    ).toBe("Tuesday, August 11 · Opening Night");

    const rows = container.querySelectorAll(".event-landing-sched-row");
    expect(rows).toHaveLength(5);
    expect(rows[0].textContent).toContain("Gathering opens");
    // Opening night runs true 45s — no Meter slot, music ends 7:45.
    expect(container.querySelector(".event-landing-sched")?.textContent).not
      .toContain("Meter");
    const mainRows = container.querySelectorAll(
      ".event-landing-sched-row-main",
    );
    expect(mainRows).toHaveLength(2);
    expect(mainRows[0].textContent).toContain("Miller Campbell — first set");
    expect(
      container.querySelectorAll(".event-landing-sched-star"),
    ).toHaveLength(2);
  });

  it("renders the presenting-sponsor band above On stage", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();
    const band = container.querySelector(".event-landing-presenting");
    expect(band).not.toBeNull();
    expect(band?.textContent).toContain("Presenting sponsor");
    expect(
      within(band as HTMLElement)
        .getByRole("img", { name: "Meter Music School logo" })
        .getAttribute("src"),
    ).toBe("/events/madrona/sponsors/meter-music-school-navy.png");
    // Document order: band sits between Tonight and On stage.
    const onStage = screen.getByRole("heading", { name: "On stage" });
    expect(
      band!.compareDocumentPosition(onStage) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders tonight's artist On stage with tagline, bio, chips, and the headliner credit", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();

    expect(
      screen.getByRole("heading", { name: "Miller Campbell", level: 3 }),
    ).toBeTruthy();
    expect(
      container.querySelector(".event-landing-band-tagline")?.textContent,
    ).toContain("heartland rock");
    expect(
      container.querySelectorAll(".event-landing-band-bio").length,
    ).toBeGreaterThan(1);

    // All seven verified Miller Campbell links, in fixed slot order.
    const chips = Array.from(
      container.querySelectorAll(".event-landing-band-links a"),
    );
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "Website",
      "Spotify",
      "Apple Music",
      "Instagram",
      "Facebook",
      "YouTube",
      "Bandcamp",
    ]);
    for (const chip of chips) {
      expect(chip.getAttribute("target")).toBe("_blank");
      expect(chip.getAttribute("rel")).toBe("noopener noreferrer");
    }

    const credit = container.querySelector(".event-landing-headliner");
    expect(credit?.textContent).toContain(
      "Miller Campbell’s performance is brought to you by",
    );
    expect(
      within(credit as HTMLElement)
        .getByRole("img", { name: "Poppie logo" })
        .getAttribute("src"),
    ).toBe("/events/madrona/sponsors/poppie.png");
  });

  it("renders the This-season strip with tonight's card featured", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();

    expect(screen.getByRole("heading", { name: "This season" })).toBeTruthy();
    const cards = container.querySelectorAll(".event-landing-season-card");
    expect(cards).toHaveLength(3);
    expect(cards[0].textContent).toContain("Aug 11");
    expect(cards[0].textContent).toContain("Miller Campbell");
    expect(cards[0].classList.contains("event-landing-season-card-now")).toBe(
      true,
    );
    expect(cards[1].textContent).toContain("Jacqueline Tabor");
    expect(cards[1].classList.contains("event-landing-season-card-now")).toBe(
      false,
    );
    expect(cards[2].textContent).toContain("Frames in Motion");
  });

  it("renders the trimmed FAQ (no what-is-this entry) and the footer band", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();

    expect(screen.getByRole("heading", { name: "Questions" })).toBeTruthy();
    expect(
      screen.queryByText("What is Music in the Playfield?"),
    ).toBeNull();
    expect(
      screen.getByText("Why is there no concert on Tuesday, August 4?"),
    ).toBeTruthy();

    const footer = container.querySelector(".event-landing-footer");
    expect(footer?.textContent).toContain(
      "★ Your neighborhood · Your music · Your park ★",
    );
    expect(footer?.textContent).toContain(
      "Run entirely by Madrona Neighborhood Association volunteers",
    );
    expect(
      within(footer as HTMLElement)
        .getByRole("link", { name: "musicintheplayfield@madrona.us" })
        .getAttribute("href"),
    ).toBe("mailto:musicintheplayfield@madrona.us");
  });
});

describe("EventDayOfLanding — between concerts", () => {
  it("retitles the section Next concert and features the upcoming night", () => {
    setClock("2026-08-13T19:00:00Z"); // Thu Aug 13, noon PT
    const { container } = renderMadrona();

    expect(screen.getByRole("heading", { name: "Next concert" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Tonight" })).toBeNull();
    expect(
      container.querySelector(".event-landing-tonight-date")?.textContent,
    ).toBe("Tuesday, August 18 · Mid-Series");

    // Same layout, next night's data: Tabor on stage, Cambium credit,
    // the Meter opener row, and the Aug 18 season card featured.
    expect(
      screen.getByRole("heading", { name: "Jacqueline Tabor", level: 3 }),
    ).toBeTruthy();
    expect(
      container.querySelector(".event-landing-sched")?.textContent,
    ).toContain("Meter Music School");
    expect(
      within(
        container.querySelector(".event-landing-headliner") as HTMLElement,
      ).getByRole("img", { name: "Cambium logo" }),
    ).toBeTruthy();
    const cards = container.querySelectorAll(".event-landing-season-card");
    expect(cards[1].classList.contains("event-landing-season-card-now")).toBe(
      true,
    );
    expect(cards[0].classList.contains("event-landing-season-card-now")).toBe(
      false,
    );
  });
});

describe("EventDayOfLanding — season wrap", () => {
  it("replaces the Tonight group with the wrap section after the final night", () => {
    setClock("2026-08-26T19:00:00Z"); // Wed Aug 26, noon PT
    const { container } = renderMadrona();

    expect(
      screen.getByRole("heading", { name: "That’s a wrap on 2026" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Tonight" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Next concert" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "On stage" })).toBeNull();
    expect(container.querySelector(".event-landing-presenting")).toBeNull();
    expect(container.querySelector(".event-landing-sched")).toBeNull();

    // Newsletter + Donate emphasized; the quiz tile stays available
    // in the action grid above.
    const wrapActions = container.querySelector(".event-landing-wrap-actions");
    const newsletter = within(wrapActions as HTMLElement).getByRole("link", {
      name: "Newsletter",
    });
    expect(newsletter.getAttribute("href")).toBe("/event/madrona/signup");
    const donate = within(wrapActions as HTMLElement).getByRole("link", {
      name: "Donate",
    });
    expect(donate.getAttribute("href")).toBe(madronaContent.donate?.href);
    expect(
      within(
        container.querySelector(".event-landing-actions") as HTMLElement,
      ).getByRole("link", { name: /Take the quiz/ }),
    ).toBeTruthy();

    // The season strip survives as the series record, no card
    // featured.
    expect(
      container.querySelectorAll(".event-landing-season-card"),
    ).toHaveLength(3);
    expect(
      container.querySelectorAll(".event-landing-season-card-now"),
    ).toHaveLength(0);
  });
});

describe("LandingTonightSections — sponsor links and duplicate dates", () => {
  const landingFixture = {
    ...madronaContent.landing!,
    presentingSponsor: {
      name: "Linked Sponsor",
      logoSrc: "/synthetic/linked-sponsor.png",
      logoAlt: "Linked Sponsor logo",
      href: "https://sponsor.example.org",
    },
  };

  function renderSections(nights: NonNullable<typeof madronaContent.nights>) {
    return render(
      <LandingTonightSections
        nights={nights}
        lineup={madronaContent.lineup}
        landing={landingFixture}
        slug="madrona"
        donateHref={null}
        hasNewsletter={false}
        initialNowMs={Date.now()}
      />,
    );
  }

  it("wraps sponsor logos in external anchors when the content supplies an href", () => {
    setClock("2026-08-11T19:00:00Z");
    const nights = {
      timezone: "America/Los_Angeles",
      nights: [
        {
          ...madronaContent.nights!.nights[0],
          headlinerSponsor: {
            name: "Poppie",
            logoSrc: "/events/madrona/sponsors/poppie.png",
            logoAlt: "Poppie logo",
            href: "https://poppie.example.org",
          },
        },
      ],
    };
    const { container } = renderSections(nights);

    const presentingLink = container.querySelector(
      ".event-landing-presenting a",
    );
    expect(presentingLink?.getAttribute("href")).toBe(
      "https://sponsor.example.org",
    );
    expect(presentingLink?.getAttribute("target")).toBe("_blank");
    expect(presentingLink?.getAttribute("rel")).toBe("noopener noreferrer");

    const headlinerLink = container.querySelector(
      ".event-landing-headliner a",
    );
    expect(headlinerLink?.getAttribute("href")).toBe(
      "https://poppie.example.org",
    );
  });

  it("renders href-less sponsor logos as plain images (madrona's launch content)", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();
    expect(container.querySelector(".event-landing-presenting a")).toBeNull();
    expect(container.querySelector(".event-landing-headliner a")).toBeNull();
  });

  it("features only the resolver's pick when two nights share a date", () => {
    setClock("2026-08-11T19:00:00Z");
    const [opening, ...rest] = madronaContent.nights!.nights;
    const nights = {
      timezone: "America/Los_Angeles",
      nights: [
        opening,
        { ...opening, label: "Duplicate-Date Night" },
        ...rest,
      ],
    };
    const { container } = renderSections(nights);

    const cards = container.querySelectorAll(".event-landing-season-card");
    expect(cards).toHaveLength(4);
    // Earliest-listed duplicate wins in resolveTonight; only that
    // object's card is featured.
    expect(
      container.querySelectorAll(".event-landing-season-card-now"),
    ).toHaveLength(1);
    expect(cards[0].classList.contains("event-landing-season-card-now")).toBe(
      true,
    );
    expect(cards[1].classList.contains("event-landing-season-card-now")).toBe(
      false,
    );
  });
});

describe("EventDayOfLanding — omission guards", () => {
  it("test events do not opt in to landing and keep the generic template", () => {
    // Structural falsifier, matching the nights suite's stance.
    expect(Object.hasOwn(harvestBlockPartyContent, "landing")).toBe(false);
    expect(Object.hasOwn(riversideJamContent, "landing")).toBe(false);

    for (const content of [harvestBlockPartyContent, riversideJamContent]) {
      const { container, unmount } = render(
        <EventLandingPage
          content={content}
          slug={content.slug}
          masthead={getEventMasthead(content.slug)}
        />,
      );
      expect(container.querySelector("main.event-shell")).not.toBeNull();
      expect(container.querySelector("main.event-landing")).toBeNull();
      unmount();
    }
  });
});
