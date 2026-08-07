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
});
