import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUsePathnameNavigation } = vi.hoisted(() => ({
  mockUsePathnameNavigation: vi.fn(),
}));

vi.mock("../../apps/web/src/usePathnameNavigation.ts", () => ({
  usePathnameNavigation: mockUsePathnameNavigation,
}));

vi.mock("../../apps/web/src/pages/GameRoutePage.tsx", () => ({
  GameRoutePage: () => <div>Game Route Page</div>,
}));

vi.mock("../../apps/web/src/pages/EventRedeemPage.tsx", () => ({
  EventRedeemPage: ({ slug }: { slug: string }) => (
    <div>Event Redeem Page: {slug}</div>
  ),
}));

vi.mock("../../apps/web/src/pages/EventAdminPage.tsx", () => ({
  EventAdminPage: ({ slug }: { slug: string }) => (
    <div>Event Admin Page: {slug}</div>
  ),
}));

vi.mock("../../apps/web/src/pages/NotFoundPage.tsx", () => ({
  NotFoundPage: () => <div>Not Found Page</div>,
}));

import App from "../../apps/web/src/App.tsx";
import { getThemeForSlug } from "../../shared/styles";

describe("App", () => {
  beforeEach(() => {
    mockUsePathnameNavigation.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the event redeem route with the selected slug", async () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/event/madrona-music-2026/game/redeem",
    });

    render(<App />);

    expect(
      await screen.findByText("Event Redeem Page: madrona-music-2026"),
    ).toBeTruthy();
  });

  it("renders the per-event admin route inside a ThemeScope wrapper", () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/event/madrona-music-2026/admin",
    });

    const { container } = render(<App />);

    expect(
      screen.getByText("Event Admin Page: madrona-music-2026"),
    ).toBeTruthy();

    // The dispatcher wraps the per-event admin in `<ThemeScope>` per the
    // M1 phase 1.5 centralization invariant. Asserting the wrapper element
    // is present prevents the wrap from regressing back into the page
    // component or being dropped entirely.
    const themeScope = container.querySelector(".theme-scope");
    expect(themeScope).not.toBeNull();
    expect(themeScope?.textContent).toContain(
      "Event Admin Page: madrona-music-2026",
    );
  });

  it("syncs the document canvas with the event theme and clears it off event routes", () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/event/madrona-music-2026/game",
    });

    const { unmount } = render(<App />);

    // `body` is an ancestor of `<ThemeScope>`, so the elastic
    // overscroll canvas is synced imperatively to the resolved
    // Theme's flat `bg` (this slug is unregistered, so it resolves
    // the platform Theme). A probe element normalizes the color the
    // same way the style engine normalized the body's value.
    const probe = document.createElement("div");
    probe.style.background = getThemeForSlug("madrona-music-2026").bg;
    expect(probe.style.background).not.toBe("");
    expect(document.body.style.background).toBe(probe.style.background);

    unmount();
    expect(document.body.style.background).toBe("");
  });

  it("renders the shared masthead above the shell on a registered event's quiz route", () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/event/madrona/game",
    });

    const { container } = render(<App />);

    const masthead = container.querySelector(".event-masthead");
    expect(masthead).not.toBeNull();

    // Inside the themed scope (the bar's colors and display face are
    // Theme tokens) and immediately above the shell, which is what the
    // `.event-masthead + .site-shell` flush rule keys on.
    expect(masthead?.closest(".theme-scope")).not.toBeNull();
    expect(masthead?.nextElementSibling?.className).toBe("site-shell");

    // The quiz is this route, so its item carries the active marking.
    const quiz = screen.getByRole("link", { name: "Quiz" });
    expect(quiz.className).toContain("event-masthead-link-active");
    expect(quiz.getAttribute("aria-current")).toBe("page");

    // No link components are injected in apps/web: every destination
    // is site-owned and has to hard-navigate through the proxy
    // origin, which the shared component's plain anchors do.
    for (const name of ["Quiz", "Newsletter", "Feedback"]) {
      expect(screen.getByRole("link", { name }).tagName).toBe("A");
    }
  });

  it("renders no masthead for an event that registers none", () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/event/harvest-block-party/game",
    });

    const { container } = render(<App />);

    expect(screen.getByText("Game Route Page")).toBeTruthy();
    expect(container.querySelector(".event-masthead")).toBeNull();
  });

  it("keeps the attendee masthead off the operator routes of a registered event", () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/event/madrona/admin",
    });

    const { container } = render(<App />);

    expect(screen.getByText("Event Admin Page: madrona")).toBeTruthy();
    expect(container.querySelector(".event-masthead")).toBeNull();
  });
});
