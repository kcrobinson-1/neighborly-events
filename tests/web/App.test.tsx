import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockUsePathnameNavigation } = vi.hoisted(() => ({
  mockUsePathnameNavigation: vi.fn(),
}));

vi.mock("../../apps/web/src/usePathnameNavigation.ts", () => ({
  usePathnameNavigation: mockUsePathnameNavigation,
}));

vi.mock("../../apps/web/src/pages/AdminPage.tsx", () => ({
  AdminPage: ({ selectedEventId }: { selectedEventId?: string }) => (
    <div>Admin Page{selectedEventId ? `: ${selectedEventId}` : ""}</div>
  ),
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

describe("App", () => {
  beforeEach(() => {
    mockUsePathnameNavigation.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the admin route when the pathname is /admin", () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/admin",
    });

    render(<App />);

    expect(screen.getByText("Admin Page")).toBeTruthy();
  });

  it("renders the admin event route with the selected event id", () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/admin/events/madrona-music-2026",
    });

    render(<App />);

    expect(screen.getByText("Admin Page: madrona-music-2026")).toBeTruthy();
  });

  it("renders the event redeem route with the selected slug", () => {
    mockUsePathnameNavigation.mockReturnValue({
      navigate: vi.fn(),
      pathname: "/event/madrona-music-2026/redeem",
    });

    render(<App />);

    expect(screen.getByText("Event Redeem Page: madrona-music-2026")).toBeTruthy();
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
});
