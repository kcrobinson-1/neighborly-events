import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockAuthorizeRedemptions,
  mockFetchRedemptionRow,
  mockRefreshNowMs,
  mockRefreshRedemptions,
  mockRequestMagicLink,
  mockResetReversal,
  mockRetryLastSubmission,
  mockSetSearchInput,
  mockSubmitReversal,
  mockToggleChip,
  mockUseAuthSession,
  mockUseRedemptionsFilters,
  mockUseRedemptionsList,
  mockUseReverseRedemption,
} = vi.hoisted(() => ({
  mockAuthorizeRedemptions: vi.fn(),
  mockFetchRedemptionRow: vi.fn(),
  mockRefreshNowMs: vi.fn(),
  mockRefreshRedemptions: vi.fn(),
  mockRequestMagicLink: vi.fn(),
  mockResetReversal: vi.fn(),
  mockRetryLastSubmission: vi.fn(),
  mockSetSearchInput: vi.fn(),
  mockSubmitReversal: vi.fn(),
  mockToggleChip: vi.fn(),
  mockUseAuthSession: vi.fn(),
  mockUseRedemptionsFilters: vi.fn(),
  mockUseRedemptionsList: vi.fn(),
  mockUseReverseRedemption: vi.fn(),
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

vi.mock("../../../apps/web/src/redemptions/useReverseRedemption.ts", () => ({
  useReverseRedemption: mockUseReverseRedemption,
}));

vi.mock("../../../apps/web/src/redemptions/redemptionsData.ts", () => ({
  REDEMPTIONS_FETCH_LIMIT: 500,
  DEFAULT_REDEMPTIONS_ERROR_MESSAGE: "We couldn't load redemptions right now.",
  fetchRedemptionRow: mockFetchRedemptionRow,
  fetchRedemptionSlices: vi.fn(),
}));

import { EventRedemptionsPage } from "../../../apps/web/src/pages/EventRedemptionsPage.tsx";
import type { ReverseResultState } from "../../../apps/web/src/redemptions/useReverseRedemption";

let reverseResultState: ReverseResultState = { status: "idle" };

describe("EventRedemptionsPage", () => {
  beforeEach(() => {
    mockAuthorizeRedemptions.mockReset();
    mockFetchRedemptionRow.mockReset();
    mockRefreshNowMs.mockReset();
    mockRefreshRedemptions.mockReset();
    mockRequestMagicLink.mockReset();
    mockResetReversal.mockReset();
    mockRetryLastSubmission.mockReset();
    mockSetSearchInput.mockReset();
    mockSubmitReversal.mockReset();
    mockToggleChip.mockReset();
    mockUseAuthSession.mockReset();
    mockUseRedemptionsFilters.mockReset();
    mockUseRedemptionsList.mockReset();
    mockUseReverseRedemption.mockReset();
    reverseResultState = { status: "idle" };
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
    mockUseReverseRedemption.mockImplementation(() => ({
      reset: mockResetReversal,
      resultState: reverseResultState,
      retryLastSubmission: mockRetryLastSubmission,
      submitReversal: mockSubmitReversal,
    }));
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

  describe("B.2b reversal wiring", () => {
    function authorizeOrganizerWithRedeemedRow() {
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
              redeemed_by: "user-b",
              redeemed_by_role: "agent",
              redemption_note: null,
              redemption_reversed_at: null,
              redemption_reversed_by: null,
              redemption_reversed_by_role: null,
              redemption_status: "redeemed",
              verification_code: "MAD-0427",
            },
          ],
          status: "success",
        },
      });
    }

    async function openDetailSheet() {
      const viewButton = await screen.findByRole("button", {
        name: "View details",
      });
      fireEvent.click(viewButton);
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeTruthy();
      });
    }

    it("selecting a redeemed row shows the Reverse redemption CTA", async () => {
      authorizeOrganizerWithRedeemedRow();

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      await openDetailSheet();

      expect(
        screen.getByRole("button", { name: "Reverse redemption" }),
      ).toBeTruthy();
    });

    it("confirm reversal calls submitReversal with the eventId, suffix, and trimmed reason", async () => {
      authorizeOrganizerWithRedeemedRow();
      mockSubmitReversal.mockResolvedValue({
        isOffline: false,
        message: "pending — will not resolve in this test",
        status: "transient_error",
      });

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      await openDetailSheet();
      fireEvent.click(
        screen.getByRole("button", { name: "Reverse redemption" }),
      );

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "  disputed by attendee  " },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Confirm reversal" }),
      );

      await waitFor(() => {
        expect(mockSubmitReversal).toHaveBeenCalledTimes(1);
      });
      expect(mockSubmitReversal).toHaveBeenCalledWith({
        codeSuffix: "0427",
        reason: "  disputed by attendee  ",
      });
    });

    it("on reverse success, runs the single-row re-read and list refetch in parallel", async () => {
      authorizeOrganizerWithRedeemedRow();
      mockSubmitReversal.mockResolvedValue({
        result: "reversed_now",
        reversedAt: "2026-04-22T10:05:00Z",
        reversedByRole: "organizer",
        status: "success",
      });
      mockFetchRedemptionRow.mockResolvedValue({
        event_id: "event-1",
        id: "row-1",
        redeemed_at: null,
        redeemed_by: null,
        redeemed_by_role: null,
        redemption_note: "disputed by attendee",
        redemption_reversed_at: "2026-04-22T10:05:00Z",
        redemption_reversed_by: "user-organizer",
        redemption_reversed_by_role: "organizer",
        redemption_status: "unredeemed",
        verification_code: "MAD-0427",
      });

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      await openDetailSheet();
      fireEvent.click(
        screen.getByRole("button", { name: "Reverse redemption" }),
      );
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "disputed by attendee" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Confirm reversal" }),
      );

      await waitFor(() => {
        expect(mockFetchRedemptionRow).toHaveBeenCalledWith("event-1", "row-1");
      });
      expect(mockRefreshRedemptions).toHaveBeenCalledTimes(1);

      // The re-read overrides the selectedRow with the fresh reversed row, so
      // the sheet reflects the reversed state even before the list refetch
      // resolves. Scope the assertion inside the sheet to avoid matching the
      // Reversed filter chip in the page toolbar.
      await waitFor(() => {
        expect(
          within(screen.getByRole("dialog")).getByText("Reversed"),
        ).toBeTruthy();
      });
      expect(
        within(screen.getByRole("dialog")).getByText("disputed by attendee"),
      ).toBeTruthy();
    });

    it("surfaces the detail-refresh error when the re-read fails after a successful reverse", async () => {
      authorizeOrganizerWithRedeemedRow();
      mockSubmitReversal.mockResolvedValue({
        result: "reversed_now",
        reversedAt: "2026-04-22T10:05:00Z",
        reversedByRole: "organizer",
        status: "success",
      });
      mockFetchRedemptionRow.mockRejectedValue(
        new Error("row lookup failed"),
      );

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      await openDetailSheet();
      fireEvent.click(
        screen.getByRole("button", { name: "Reverse redemption" }),
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Confirm reversal" }),
      );

      await waitFor(() => {
        expect(screen.getByText("row lookup failed")).toBeTruthy();
      });
      // The full list refetch still runs even when the single-row re-read
      // fails, so the list-level `Last updated` timestamp can still catch up.
      expect(mockRefreshRedemptions).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole("button", { name: "Refresh details" }),
      ).toBeTruthy();
    });

    it("retry reversal calls retryLastSubmission and reconciles on a successful retry", async () => {
      authorizeOrganizerWithRedeemedRow();
      reverseResultState = {
        isOffline: false,
        message: "Please retry once your connection is stable.",
        status: "transient_error",
      };
      mockRetryLastSubmission.mockResolvedValue({
        result: "reversed_now",
        reversedAt: "2026-04-22T10:05:00Z",
        reversedByRole: "organizer",
        status: "success",
      });
      mockFetchRedemptionRow.mockResolvedValue({
        event_id: "event-1",
        id: "row-1",
        redeemed_at: null,
        redeemed_by: null,
        redeemed_by_role: null,
        redemption_note: null,
        redemption_reversed_at: "2026-04-22T10:05:00Z",
        redemption_reversed_by: "user-organizer",
        redemption_reversed_by_role: "organizer",
        redemption_status: "unredeemed",
        verification_code: "MAD-0427",
      });

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      await openDetailSheet();
      fireEvent.click(
        screen.getByRole("button", { name: "Reverse redemption" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));

      await waitFor(() => {
        expect(mockRetryLastSubmission).toHaveBeenCalledTimes(1);
      });
      await waitFor(() => {
        expect(mockFetchRedemptionRow).toHaveBeenCalledWith("event-1", "row-1");
      });
      expect(mockRefreshRedemptions).toHaveBeenCalledTimes(1);
    });

    it("Back clears the draft reason and mutation state for the same row", async () => {
      authorizeOrganizerWithRedeemedRow();

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      await openDetailSheet();
      fireEvent.click(
        screen.getByRole("button", { name: "Reverse redemption" }),
      );
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "draft reason" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Back" }));

      // Back returns the sheet to the details step for the same row; the hook
      // reset is what the page test can observe directly.
      expect(mockResetReversal).toHaveBeenCalled();

      // Re-entering confirmation for the same row starts from an empty reason,
      // not from the prior draft.
      fireEvent.click(
        screen.getByRole("button", { name: "Reverse redemption" }),
      );
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
    });

    it("row switch resets the prior row's draft reason and mutation state", async () => {
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
              id: "row-a",
              redeemed_at: "2026-04-22T09:50:00Z",
              redeemed_by: "user-b",
              redeemed_by_role: "agent",
              redemption_note: null,
              redemption_reversed_at: null,
              redemption_reversed_by: null,
              redemption_reversed_by_role: null,
              redemption_status: "redeemed",
              verification_code: "MAD-0427",
            },
            {
              event_id: "event-1",
              id: "row-b",
              redeemed_at: "2026-04-22T09:51:00Z",
              redeemed_by: "user-c",
              redeemed_by_role: "agent",
              redemption_note: null,
              redemption_reversed_at: null,
              redemption_reversed_by: null,
              redemption_reversed_by_role: null,
              redemption_status: "redeemed",
              verification_code: "MAD-0428",
            },
          ],
          status: "success",
        },
      });

      render(
        <EventRedemptionsPage
          onNavigate={() => {}}
          slug="madrona-music-2026"
        />,
      );

      const viewButtons = await screen.findAllByRole("button", {
        name: "View details",
      });
      fireEvent.click(viewButtons[0]);
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeTruthy();
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Reverse redemption" }),
      );
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "stale reason" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).toBeNull();
      });

      // Close triggers a reset; opening row A again should not show the
      // prior draft reason.
      expect(mockResetReversal).toHaveBeenCalled();

      const refreshedViewButtons = screen.getAllByRole("button", {
        name: "View details",
      });
      fireEvent.click(refreshedViewButtons[1]);
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeTruthy();
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Reverse redemption" }),
      );
      expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
    });
  });
});
