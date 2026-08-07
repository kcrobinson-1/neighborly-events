import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { EventMasthead } from "../../../shared/masthead/EventMasthead.tsx";
import type {
  EventMastheadContent,
  EventMastheadLinkProps,
} from "../../../shared/masthead/index.ts";

afterEach(cleanup);

const mastheadFixture: EventMastheadContent = {
  brand: {
    name: "SYNTHETIC",
    tagline: "EVENT HEADER FIXTURE",
    homeHref: "/event/synthetic-event",
  },
  quiz: { label: "Quiz", href: "/event/synthetic-event/game" },
  newsletter: { label: "Newsletter", href: "/event/synthetic-event/signup" },
  feedback: { label: "Feedback", href: "/event/synthetic-event/feedback" },
  donate: {
    label: "Donate",
    href: "https://donations.example.org/synthetic-form",
  },
};

describe("EventMasthead", () => {
  it("renders the brand lockup as the Home link plus the four nav links with config-owned hrefs", () => {
    render(<EventMasthead masthead={mastheadFixture} />);

    const brand = screen.getByRole("link", {
      name: "SYNTHETIC EVENT HEADER FIXTURE",
    });
    expect(brand.getAttribute("href")).toBe("/event/synthetic-event");

    expect(
      screen.getByRole("navigation", { name: "Event pages" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Quiz" }).getAttribute("href")).toBe(
      "/event/synthetic-event/game",
    );
    expect(
      screen.getByRole("link", { name: "Newsletter" }).getAttribute("href"),
    ).toBe("/event/synthetic-event/signup");
    expect(
      screen.getByRole("link", { name: "Feedback" }).getAttribute("href"),
    ).toBe("/event/synthetic-event/feedback");
    expect(
      screen.getByRole("link", { name: "Donate" }).getAttribute("href"),
    ).toBe("https://donations.example.org/synthetic-form");
  });

  it("opens only the donate pill in a new tab with rel=noopener", () => {
    render(<EventMasthead masthead={mastheadFixture} />);

    const donate = screen.getByRole("link", { name: "Donate" });
    expect(donate.getAttribute("target")).toBe("_blank");
    expect(donate.getAttribute("rel")).toContain("noopener");
    expect(donate.className).toContain("event-masthead-donate");

    for (const name of ["Quiz", "Newsletter", "Feedback"]) {
      expect(
        screen.getByRole("link", { name }).getAttribute("target"),
      ).toBeNull();
    }
  });

  it("marks the active item with the active class and aria-current=page", () => {
    render(<EventMasthead masthead={mastheadFixture} active="newsletter" />);

    const newsletter = screen.getByRole("link", { name: "Newsletter" });
    expect(newsletter.className).toContain("event-masthead-link-active");
    expect(newsletter.getAttribute("aria-current")).toBe("page");

    for (const name of ["Quiz", "Feedback", "Donate"]) {
      const link = screen.getByRole("link", { name });
      expect(link.className).not.toContain("event-masthead-link-active");
      expect(link.getAttribute("aria-current")).toBeNull();
    }
  });

  it("renders no active underline and no aria-current when active is unset", () => {
    const { container } = render(<EventMasthead masthead={mastheadFixture} />);

    expect(container.querySelector(".event-masthead-link-active")).toBeNull();
    expect(container.querySelector("[aria-current]")).toBeNull();
  });

  it("renders injected link components for home and nav items but never for donate", () => {
    function StubLink({
      href,
      className,
      children,
      "aria-current": ariaCurrent,
    }: EventMastheadLinkProps) {
      return (
        <a
          className={className}
          href={href}
          aria-current={ariaCurrent}
          data-injected="true"
        >
          {children}
        </a>
      );
    }

    render(
      <EventMasthead
        masthead={mastheadFixture}
        active="feedback"
        linkComponents={{ home: StubLink, newsletter: StubLink, feedback: StubLink }}
      />,
    );

    const brand = screen.getByRole("link", {
      name: "SYNTHETIC EVENT HEADER FIXTURE",
    });
    expect(brand.getAttribute("data-injected")).toBe("true");
    expect(
      screen
        .getByRole("link", { name: "Newsletter" })
        .getAttribute("data-injected"),
    ).toBe("true");

    // Injection preserves the active marking.
    const feedback = screen.getByRole("link", { name: "Feedback" });
    expect(feedback.getAttribute("data-injected")).toBe("true");
    expect(feedback.getAttribute("aria-current")).toBe("page");

    // Un-injected items fall back to the plain anchor…
    expect(
      screen.getByRole("link", { name: "Quiz" }).getAttribute("data-injected"),
    ).toBeNull();
    // …and donate is not injectable at all (external new-tab anchor).
    expect(
      screen.getByRole("link", { name: "Donate" }).getAttribute("data-injected"),
    ).toBeNull();
  });
});
