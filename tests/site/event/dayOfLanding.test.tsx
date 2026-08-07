import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";

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

  it("inlines the hero art as an SVG under a labeled img role, with the orientation line", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();
    const art = screen.getByRole("img", {
      name: "Madrona Music in the Playfield",
    });
    expect(art.querySelector("svg")).not.toBeNull();
    expect(
      container.querySelector(".event-landing-welcome")?.textContent,
    ).toBe(
      "Everything for tonight — the schedule, the quiz, and who’s playing.",
    );
  });

  it("degrades to the no-art hero when the SVG markup is unavailable", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona(null);
    expect(container.querySelector(".event-landing-hero-art")).toBeNull();
    expect(container.querySelector(".event-landing-welcome")).not.toBeNull();
  });

  it("renders the four action tiles, three renderer-owned and the email list content-owned", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();
    const actions = within(
      container.querySelector(".event-landing-actions") as HTMLElement,
    );

    const quiz = actions.getByRole("link", { name: /Take the quiz/ });
    expect(quiz.getAttribute("href")).toBe("/event/madrona/game");
    const feedback = actions.getByRole("link", { name: /Feedback/ });
    expect(feedback.getAttribute("href")).toBe("/event/madrona/feedback");
    const donate = actions.getByRole("link", { name: /Donate/ });
    expect(donate.getAttribute("href")).toBe(madronaContent.donate?.href);
    expect(donate.getAttribute("target")).toBe("_blank");
    expect(donate.getAttribute("rel")).toBe("noopener");

    // The email-list tile's destination is content-owned rather than
    // composed from the slug, and it leaves the platform — so the
    // destination and the new-context attributes are asserted in one
    // case: a correct address opened in the same tab would still drop
    // the reader out of the day-of page mid-concert.
    const emailList = actions.getByRole("link", { name: /Email list/ });
    expect(emailList.getAttribute("href")).toBe(
      "https://mailchi.mp/madrona/madrona-neighborhood-association-community-email",
    );
    expect(emailList.getAttribute("target")).toBe("_blank");
    expect(emailList.getAttribute("rel")).toBe("noopener");
    expect(emailList.textContent).toContain(
      "neighborhood news from the association",
    );
  });

  it("omits the email-list tile and wrap action for an event that authors no destination", () => {
    // Render-when-present: the platform serves no email-signup route to
    // derive a destination from, so an event that authors none offers no
    // email-list affordance at all rather than a tile pointing nowhere.
    // Asserted at both consumers, because the season-wrap action gates
    // on the same field from a different component.
    setClock("2026-08-11T19:00:00Z");
    const { container } = render(
      <EventLandingPage
        content={{
          ...madronaContent,
          landing: {
            ...madronaContent.landing!,
            actions: {
              ...madronaContent.landing!.actions,
              emailList: { label: "Email list", subtitle: "unreachable" },
            },
          },
        }}
        slug="madrona"
        masthead={getEventMasthead("madrona")}
        mastheadSvgMarkup={SVG_FIXTURE}
      />,
    );

    expect(
      within(
        container.querySelector(".event-landing-actions") as HTMLElement,
      ).queryByRole("link", { name: /Email list/ }),
    ).toBeNull();
    // The three renderer-owned tiles are untouched by the omission.
    expect(
      container.querySelectorAll(".event-landing-action"),
    ).toHaveLength(3);
  });

  it("names no attendee-facing affordance a newsletter", () => {
    // The association's newsletter is a printed mailer delivered in the
    // mail. Asserting over the rendered page rather than over the
    // content module catches a renderer-owned string too.
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();

    expect(container.textContent?.toLowerCase()).not.toContain("newsletter");
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

  it("renders no FAQ section", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();

    expect(screen.queryByRole("heading", { name: "Questions" })).toBeNull();
    expect(container.querySelector(".event-landing-faq")).toBeNull();
    // The entries the page used to carry, by their own text: a
    // heading-only assertion would still pass if the section rendered
    // headless.
    expect(
      screen.queryByText("Why is there no concert on Tuesday, August 4?"),
    ).toBeNull();
    expect(screen.queryByText("Where do I park?")).toBeNull();
  });

  it("still renders a day-of FAQ for an event that authors one", () => {
    // The capability outlives madrona's content: the renderer and the
    // four `.event-landing-faq-*` rules are kept for the next event on
    // this layout that has something to answer. Without this case the
    // section could be deleted outright and nothing would fail.
    setClock("2026-08-11T19:00:00Z");
    const { container } = render(
      <EventLandingPage
        content={{
          ...madronaContent,
          faq: [{ question: "Is there parking?", answer: "Street only." }],
        }}
        slug="madrona"
        masthead={getEventMasthead("madrona")}
        mastheadSvgMarkup={SVG_FIXTURE}
      />,
    );

    expect(screen.getByRole("heading", { name: "Questions" })).toBeTruthy();
    expect(container.querySelector(".event-landing-faq-list")).not.toBeNull();
    expect(screen.getByText("Is there parking?")).toBeTruthy();
  });

  it("renders the footer band", () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();

    const footer = container.querySelector(".event-landing-footer");
    expect(footer?.textContent).toContain(
      "★ Your neighborhood · Your music · Your park ★",
    );
    expect(
      within(footer as HTMLElement)
        .getByRole("link", { name: "musicintheplayfield@madrona.us" })
        .getAttribute("href"),
    ).toBe("mailto:musicintheplayfield@madrona.us");
    // The band carries two lines now. Its volunteer credit moved into
    // the volunteer section, which makes the same point with an
    // action attached — see the "asks once" case below.
    expect(
      container.querySelectorAll(".event-landing-footer-line"),
    ).toHaveLength(1);
  });

  it("renders the footer's volunteer credit for an event that authors one", () => {
    // `volunteerLine` went optional rather than away; madrona omits
    // it. Without this case the field could be dropped from the
    // renderer and only madrona's own omission would hide it.
    setClock("2026-08-11T19:00:00Z");
    const { container } = render(
      <EventLandingPage
        content={{
          ...madronaContent,
          landing: {
            ...madronaContent.landing!,
            footer: {
              ...madronaContent.landing!.footer,
              volunteerLine: "Put on by the neighbors of Anytown.",
            },
          },
        }}
        slug="madrona"
        masthead={getEventMasthead("madrona")}
        mastheadSvgMarkup={SVG_FIXTURE}
      />,
    );

    const footer = container.querySelector(".event-landing-footer");
    expect(footer?.textContent).toContain("Put on by the neighbors of Anytown.");
    expect(
      container.querySelectorAll(".event-landing-footer-line"),
    ).toHaveLength(2);
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

    // Email list + Donate emphasized; the quiz tile stays available
    // in the action grid above.
    const wrapActions = container.querySelector(".event-landing-wrap-actions");
    const emailList = within(wrapActions as HTMLElement).getByRole("link", {
      name: "Email list",
    });
    expect(emailList.getAttribute("href")).toBe(
      "https://mailchi.mp/madrona/madrona-neighborhood-association-community-email",
    );
    expect(emailList.getAttribute("target")).toBe("_blank");
    expect(emailList.getAttribute("rel")).toBe("noopener");
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

  it("omits the wrap's email-list action for an event that authors no destination", () => {
    setClock("2026-08-26T19:00:00Z");
    const { container } = render(
      <EventLandingPage
        content={{
          ...madronaContent,
          landing: {
            ...madronaContent.landing!,
            actions: {
              ...madronaContent.landing!.actions,
              emailList: { label: "Email list", subtitle: "unreachable" },
            },
          },
        }}
        slug="madrona"
        masthead={getEventMasthead("madrona")}
        mastheadSvgMarkup={SVG_FIXTURE}
      />,
    );

    const wrapActions = container.querySelector(".event-landing-wrap-actions");
    expect(
      within(wrapActions as HTMLElement).queryByRole("link", {
        name: "Email list",
      }),
    ).toBeNull();
    // Donate survives the omission — the two actions gate independently.
    expect(
      within(wrapActions as HTMLElement).getByRole("link", { name: "Donate" }),
    ).toBeTruthy();
  });
});

describe("EventDayOfLanding — volunteer section", () => {
  const CONCERT_DAY = "2026-08-11T19:00:00Z";
  const POST_SEASON = "2026-08-26T19:00:00Z";

  function withoutVolunteer() {
    const landing = { ...madronaContent.landing! };
    delete landing.volunteer;
    return { ...madronaContent, landing };
  }

  it("renders both asks on a concert day, each to its own destination", () => {
    setClock(CONCERT_DAY);
    const { container } = renderMadrona();

    const section = container.querySelector(".event-landing-volunteer");
    expect(section).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Lend a hand" })).toBeTruthy();
    expect(section?.textContent).toContain(
      "Music in the Playfield is put on by neighbors.",
    );

    const asks = within(section as HTMLElement);
    // Night-of: routed to the organizer address the event already
    // authors on the footer, not to a second copy of it.
    expect(
      asks.getByRole("heading", { name: "Help at a concert" }),
    ).toBeTruthy();
    const nightOf = asks.getByRole("link", { name: "Email the organizers" });
    expect(nightOf.getAttribute("href")).toBe(
      "mailto:musicintheplayfield@madrona.us",
    );
    // A mailto stays in place; new-context attributes would be wrong.
    expect(nightOf.getAttribute("target")).toBeNull();

    // Year-round: external, so destination and new-context attributes
    // are asserted together — the right address opened in the same tab
    // would still drop a reader out of the page mid-concert.
    expect(asks.getByRole("heading", { name: "Help year-round" })).toBeTruthy();
    const yearRound = asks.getByRole("link", {
      name: "Volunteer with the association",
    });
    expect(yearRound.getAttribute("href")).toBe("https://madrona.us/volunteers/");
    expect(yearRound.getAttribute("target")).toBe("_blank");
    expect(yearRound.getAttribute("rel")).toBe("noopener");
  });

  it("drops the night-of ask once the season has ended, keeping the year-round one", () => {
    // The load-bearing case. A concert-day-only test cannot surface a
    // time-specific ask that outlives the concerts: on Aug 26 the page
    // has already swapped the run-of-show for the season wrap, and an
    // ask to help at 4:30 would be the one thing left on it still
    // talking about a show that is not coming.
    setClock(POST_SEASON);
    const { container } = renderMadrona();

    // The wrap state really is the one being asserted against.
    expect(
      screen.getByRole("heading", { name: "That’s a wrap on 2026" }),
    ).toBeTruthy();

    const section = container.querySelector(".event-landing-volunteer");
    expect(section).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Lend a hand" })).toBeTruthy();

    const asks = within(section as HTMLElement);
    expect(
      asks.queryByRole("heading", { name: "Help at a concert" }),
    ).toBeNull();
    expect(
      asks.queryByRole("link", { name: "Email the organizers" }),
    ).toBeNull();
    // By its copy too: a heading-only assertion would still pass if
    // the ask rendered headless.
    expect(section?.textContent).not.toContain("Setup starts at 4:30");

    expect(asks.getByRole("heading", { name: "Help year-round" })).toBeTruthy();
    expect(
      asks.getByRole("link", { name: "Volunteer with the association" }),
    ).toBeTruthy();
  });

  it("renders no section for an event that authors no volunteer block", () => {
    // Render-when-present, asserted at both clocks because the section
    // is built in the resolver's component and returned from two
    // separate branches.
    for (const clock of [CONCERT_DAY, POST_SEASON]) {
      setClock(clock);
      const { container } = render(
        <EventLandingPage
          content={withoutVolunteer()}
          slug="madrona"
          masthead={getEventMasthead("madrona")}
          mastheadSvgMarkup={SVG_FIXTURE}
        />,
      );

      expect(container.querySelector(".event-landing-volunteer")).toBeNull();
      expect(screen.queryByRole("heading", { name: "Lend a hand" })).toBeNull();
      cleanup();
    }
  });

  it("makes the volunteer ask once — the footer band does not restate it", () => {
    setClock(CONCERT_DAY);
    const { container } = renderMadrona();

    const footer = container.querySelector(".event-landing-footer");
    expect(footer?.textContent).not.toMatch(/volunteer/i);
    expect(
      container.querySelector(".event-landing-volunteer")?.textContent,
    ).toMatch(/volunteer/i);
  });

  it("leaves the presenting band's position relative to On stage alone", () => {
    // The volunteer section lands after This season, below both. The
    // plan asked for this to be confirmed rather than assumed.
    setClock(CONCERT_DAY);
    const { container } = renderMadrona();

    const band = container.querySelector(".event-landing-presenting");
    const onStage = screen.getByRole("heading", { name: "On stage" });
    expect(
      band!.compareDocumentPosition(onStage) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    // And the section itself sits between This season and the footer.
    const volunteer = container.querySelector(".event-landing-volunteer")!;
    const season = screen.getByRole("heading", { name: "This season" });
    const footer = container.querySelector(".event-landing-footer")!;
    expect(
      season.compareDocumentPosition(volunteer) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      volunteer.compareDocumentPosition(footer) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

describe("LandingTonightSections — stays live across event-local midnight", () => {
  it("flips from Tonight to the next night when the event-local day rolls over", async () => {
    // Tue Aug 11, 23:58 PT — a page open on a blanket after the show.
    setClock("2026-08-12T06:58:00Z");
    renderMadrona();
    expect(screen.getByRole("heading", { name: "Tonight" })).toBeTruthy();

    // Cross local midnight into Wed Aug 12 and let one tick land.
    await act(async () => {
      vi.setSystemTime(new Date("2026-08-12T07:01:00Z"));
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(screen.getByRole("heading", { name: "Next concert" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Tonight" })).toBeNull();
    expect(
      document.querySelector(".event-landing-tonight-date")?.textContent,
    ).toBe("Tuesday, August 18 · Mid-Series");
  });

  it("flips to the season wrap after the final night's local midnight", async () => {
    // Tue Aug 25, 23:58 PT — the closing night, still Tonight.
    setClock("2026-08-26T06:58:00Z");
    renderMadrona();
    expect(screen.getByRole("heading", { name: "Tonight" })).toBeTruthy();

    await act(async () => {
      vi.setSystemTime(new Date("2026-08-26T07:01:00Z"));
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(
      screen.getByRole("heading", { name: "That’s a wrap on 2026" }),
    ).toBeTruthy();
  });

  it("does not re-render while the event-local date is unchanged", async () => {
    setClock("2026-08-11T19:00:00Z");
    const { container } = renderMadrona();
    const before = container.querySelector(".event-landing-sched");

    await act(async () => {
      vi.setSystemTime(new Date("2026-08-11T19:30:00Z"));
      await vi.advanceTimersByTimeAsync(5 * 60_000);
    });

    // Same node identity: the tick resolved to the same calendar date
    // and returned the previous state, so React never re-rendered.
    expect(container.querySelector(".event-landing-sched")).toBe(before);
    expect(screen.getByRole("heading", { name: "Tonight" })).toBeTruthy();
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
