import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuthorizeRedemptions,
  mockRefreshNowMs,
  mockRefreshRedemptions,
  mockRequestMagicLink,
  mockSetSearchInput,
  mockToggleChip,
  mockUseAuthSession,
  mockUseRedemptionsFilters,
  mockUseRedemptionsList,
} = vi.hoisted(() => ({
  mockAuthorizeRedemptions: vi.fn(),
  mockRefreshNowMs: vi.fn(),
  mockRefreshRedemptions: vi.fn(),
  mockRequestMagicLink: vi.fn(),
  mockSetSearchInput: vi.fn(),
  mockToggleChip: vi.fn(),
  mockUseAuthSession: vi.fn(),
  mockUseRedemptionsFilters: vi.fn(),
  mockUseRedemptionsList: vi.fn(),
}));

vi.mock("../../../apps/web/src/auth/useAuthSession.ts", () => ({
  useAuthSession: mockUseAuthSession,
}));

vi.mock("../../../apps/web/src/lib/authApi.ts", () => ({
  requestMagicLink: mockRequestMagicLink,
}));

vi.mock("../../../apps/web/src/redemptions/authorizeRedemptions.ts", () => ({
  authorizeRedemptions: mockAuthorizeRedemptions,
}));

vi.mock("../../../apps/web/src/redemptions/useRedemptionsList.ts", () => ({
  REDEMPTIONS_FETCH_LIMIT: 500,
  useRedemptionsList: mockUseRedemptionsList,
}));

vi.mock("../../../apps/web/src/redemptions/useRedemptionsFilters.ts", () => ({
  useRedemptionsFilters: mockUseRedemptionsFilters,
}));

import { EventRedemptionsPage } from "../../../apps/web/src/pages/EventRedemptionsPage.tsx";

describe("EventRedemptionsPage", () => {
  beforeEach(() => {
    mockAuthorizeRedemptions.mockReset();
    mockRefreshNowMs.mockReset();
    mockRefreshRedemptions.mockReset();
    mockRequestMagicLink.mockReset();
    mockSetSearchInput.mockReset();
    mockToggleChip.mockReset();
    mockUseAuthSession.mockReset();
    mockUseRedemptionsFilters.mockReset();
    mockUseRedemptionsList.mockReset();
    mockUseRedemptionsList.mockReturnValue({
      refresh: mockRefreshRedemptions,
      state: { status: "loading" },
    });
    mockUseRedemptionsFilters.mockReturnValue({
      chips: {
        byMe: false,
        last15m: false,
        redeemed: false,
        reversed: false,
      },
      nowMs: 0,
      refreshNowMs: mockRefreshNowMs,
      searchInput: "",
      setSearchInput: mockSetSearchInput,
      toggleChip: mockToggleChip,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the missing-config copy when Supabase is unavailable", () => {
    mockUseAuthSession.mockReturnValue({
      message: "This game isn't available right now.",
      status: "missing_config",
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    expect(
      screen.getAllByText("This game isn't available right now."),
    ).toHaveLength(2);
  });

  it("renders the locked sign-in copy when no session exists", () => {
    mockUseAuthSession.mockReturnValue({
      status: "signed_out",
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    expect(
      screen.getByRole("heading", { name: "Sign in to review redemptions" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("organizer@example.com"),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Send sign-in link" }),
    ).toBeTruthy();
  });

  it("requests a magic link that returns to the same monitoring route", async () => {
    mockUseAuthSession.mockReturnValue({
      status: "signed_out",
    });
    mockRequestMagicLink.mockResolvedValue(undefined);

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "organizer@example.com" },
    });
    fireEvent.submit(
      screen.getByRole("button", { name: "Send sign-in link" }),
    );

    await waitFor(() => {
      expect(mockRequestMagicLink).toHaveBeenCalledWith(
        "organizer@example.com",
        {
          next: "/event/madrona-music-2026/redemptions",
        },
      );
    });
    expect(
      screen.getByText("Check your email for the monitoring sign-in link."),
    ).toBeTruthy();
  });

  it("renders the authorized loading state with the locked event code", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions.mockResolvedValue({
      eventCode: "MAD",
      eventId: "event-1",
      status: "authorized",
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    await waitFor(() => {
      expect(screen.getByText("MAD")).toBeTruthy();
    });
    expect(screen.getByText("Loading redemptions...")).toBeTruthy();
  });

  it("renders the list and last-updated timestamp on a successful fetch", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions.mockResolvedValue({
      eventCode: "MAD",
      eventId: "event-1",
      status: "authorized",
    });
    mockUseRedemptionsList.mockReturnValue({
      refresh: mockRefreshRedemptions,
      state: {
        fetchedAt: new Date("2026-04-22T10:00:00Z"),
        rows: [
          {
            event_id: "event-1",
            id: "row-1",
            redeemed_at: "2026-04-22T09:50:00Z",
            redeemed_by: "user-a",
            redeemed_by_role: "agent",
            redemption_note: null,
            redemption_reversed_at: null,
            redemption_reversed_by: null,
            redemption_reversed_by_role: null,
            redemption_status: "redeemed",
            verification_code: "MAD-0001",
          },
        ],
        status: "success",
      },
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    await waitFor(() => {
      expect(screen.getByText("MAD-0001")).toBeTruthy();
    });
    expect(screen.getByText(/Last updated/)).toBeTruthy();
  });

  it("renders the 'showing most recent N' banner when the cached slice hits the cap", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions.mockResolvedValue({
      eventCode: "MAD",
      eventId: "event-1",
      status: "authorized",
    });

    const fiveHundredRows = Array.from({ length: 500 }, (_, index) => ({
      event_id: "event-1",
      id: `row-${index}`,
      redeemed_at: "2026-04-22T09:50:00Z",
      redeemed_by: "user-a",
      redeemed_by_role: "agent" as const,
      redemption_note: null,
      redemption_reversed_at: null,
      redemption_reversed_by: null,
      redemption_reversed_by_role: null,
      redemption_status: "redeemed" as const,
      verification_code: `MAD-${String(index).padStart(4, "0")}`,
    }));

    mockUseRedemptionsList.mockReturnValue({
      refresh: mockRefreshRedemptions,
      state: {
        fetchedAt: new Date(),
        rows: fiveHundredRows,
        status: "success",
      },
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Showing the most recent 500 redemption events/),
      ).toBeTruthy();
    });
  });

  it("renders the fetch-error banner with Retry, not the role-gate copy", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions.mockResolvedValue({
      eventCode: "MAD",
      eventId: "event-1",
      status: "authorized",
    });
    mockUseRedemptionsList.mockReturnValue({
      refresh: mockRefreshRedemptions,
      state: {
        message: "We couldn't load redemptions right now.",
        status: "error",
      },
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("We couldn't load redemptions right now."),
      ).toBeTruthy();
    });
    expect(
      screen.queryByText("Not available for this event."),
    ).toBeNull();
    expect(screen.getAllByRole("button", { name: "Retry" }).length).toBe(1);
  });

  it("disables the refresh button with 'You are offline' when navigator is offline", async () => {
    const onLineDescriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "onLine",
    );

    try {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        value: false,
      });

      mockUseAuthSession.mockReturnValue({
        email: "organizer@example.com",
        session: { user: { id: "user-organizer" } },
        status: "signed_in",
      });
      mockAuthorizeRedemptions.mockResolvedValue({
        eventCode: "MAD",
        eventId: "event-1",
        status: "authorized",
      });
      mockUseRedemptionsList.mockReturnValue({
        refresh: mockRefreshRedemptions,
        state: {
          fetchedAt: new Date(),
          rows: [],
          status: "success",
        },
      });

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      const offlineButton = await screen.findByRole("button", {
        name: "You are offline",
      });
      expect((offlineButton as HTMLButtonElement).disabled).toBe(true);
    } finally {
      if (onLineDescriptor) {
        Object.defineProperty(
          window.navigator,
          "onLine",
          onLineDescriptor,
        );
      } else {
        Object.defineProperty(window.navigator, "onLine", {
          configurable: true,
          value: true,
        });
      }
    }
  });

  it("returns focus to the row's View details button after the detail sheet closes", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions.mockResolvedValue({
      eventCode: "MAD",
      eventId: "event-1",
      status: "authorized",
    });
    mockUseRedemptionsList.mockReturnValue({
      refresh: mockRefreshRedemptions,
      state: {
        fetchedAt: new Date("2026-04-22T10:00:00Z"),
        rows: [
          {
            event_id: "event-1",
            id: "row-focus-target",
            redeemed_at: "2026-04-22T09:50:00Z",
            redeemed_by: "user-organizer",
            redeemed_by_role: "agent",
            redemption_note: null,
            redemption_reversed_at: null,
            redemption_reversed_by: null,
            redemption_reversed_by_role: null,
            redemption_status: "redeemed",
            verification_code: "MAD-0001",
          },
        ],
        status: "success",
      },
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    const viewDetailsButton = await screen.findByRole("button", {
      name: "View details",
    });
    expect(viewDetailsButton.id).toBe("redemption-view-button-row-focus-target");

    fireEvent.click(viewDetailsButton);
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    expect(document.activeElement).toBe(viewDetailsButton);
  });

  it("calls refresh when the explicit refresh button is clicked", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions.mockResolvedValue({
      eventCode: "MAD",
      eventId: "event-1",
      status: "authorized",
    });
    mockUseRedemptionsList.mockReturnValue({
      refresh: mockRefreshRedemptions,
      state: {
        fetchedAt: new Date(),
        rows: [],
        status: "success",
      },
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    const refreshButton = await screen.findByRole("button", {
      name: "Refresh",
    });
    fireEvent.click(refreshButton);

    expect(mockRefreshRedemptions).toHaveBeenCalledTimes(1);
    expect(mockRefreshNowMs).toHaveBeenCalledTimes(1);
  });

  it("advances the Last 15m cutoff alongside the refetch when the browser reconnects", async () => {
    const onLineDescriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "onLine",
    );

    try {
      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        value: false,
      });

      mockUseAuthSession.mockReturnValue({
        email: "organizer@example.com",
        session: { user: { id: "user-organizer" } },
        status: "signed_in",
      });
      mockAuthorizeRedemptions.mockResolvedValue({
        eventCode: "MAD",
        eventId: "event-1",
        status: "authorized",
      });
      mockUseRedemptionsList.mockReturnValue({
        refresh: mockRefreshRedemptions,
        state: {
          fetchedAt: new Date(),
          rows: [],
          status: "success",
        },
      });

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      await screen.findByRole("button", { name: "You are offline" });
      expect(mockRefreshRedemptions).toHaveBeenCalledTimes(0);
      expect(mockRefreshNowMs).toHaveBeenCalledTimes(0);

      Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        value: true,
      });
      fireEvent(window, new Event("online"));

      await waitFor(() => {
        expect(mockRefreshRedemptions).toHaveBeenCalledTimes(1);
      });
      expect(mockRefreshNowMs).toHaveBeenCalledTimes(1);
    } finally {
      if (onLineDescriptor) {
        Object.defineProperty(
          window.navigator,
          "onLine",
          onLineDescriptor,
        );
      } else {
        Object.defineProperty(window.navigator, "onLine", {
          configurable: true,
          value: true,
        });
      }
    }
  });

  it("collapses slug-not-found and role-held-none branches into identical role-gate DOM", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions.mockResolvedValueOnce({
      status: "role_gate",
    });

    const { asFragment: asFragmentSlugNotFound, unmount } = render(
      <EventRedemptionsPage onNavigate={() => {}} slug="missing-slug" />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Not available for this event."),
      ).toBeTruthy();
    });

    const slugNotFoundSnapshot = asFragmentSlugNotFound();
    unmount();

    mockAuthorizeRedemptions.mockResolvedValueOnce({
      status: "role_gate",
    });

    const { asFragment: asFragmentRoleHeldNone } = render(
      <EventRedemptionsPage onNavigate={() => {}} slug="missing-slug" />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Not available for this event."),
      ).toBeTruthy();
    });

    expect(asFragmentRoleHeldNone().isEqualNode(slugNotFoundSnapshot))
      .toBe(true);
  });

  it("renders the transient-error retry banner for a network/5xx resolver failure", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions.mockResolvedValueOnce({
      message: "Please retry once your connection is stable.",
      status: "transient_error",
    });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: "We couldn't verify monitoring access right now.",
        }),
      ).toBeTruthy();
    });
    expect(
      screen.getByText("Please retry once your connection is stable."),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Retry" }),
    ).toBeTruthy();
    expect(
      screen.queryByText("Not available for this event."),
    ).toBeNull();
  });

  it("transitions from transient-error retry to authorized on a successful retry", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
      session: { user: { id: "user-organizer" } },
      status: "signed_in",
    });
    mockAuthorizeRedemptions
      .mockResolvedValueOnce({
        message: "Please retry once your connection is stable.",
        status: "transient_error",
      })
      .mockResolvedValueOnce({
        eventCode: "MAD",
        eventId: "event-1",
        status: "authorized",
      });

    render(
      <EventRedemptionsPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    const retryButton = await screen.findByRole("button", { name: "Retry" });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("MAD")).toBeTruthy();
    });
    expect(mockAuthorizeRedemptions).toHaveBeenCalledTimes(2);
  });
});
