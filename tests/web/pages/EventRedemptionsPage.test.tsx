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
  mockRequestMagicLink,
  mockUseAuthSession,
} = vi.hoisted(() => ({
  mockAuthorizeRedemptions: vi.fn(),
  mockRequestMagicLink: vi.fn(),
  mockUseAuthSession: vi.fn(),
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

import { EventRedemptionsPage } from "../../../apps/web/src/pages/EventRedemptionsPage.tsx";

describe("EventRedemptionsPage", () => {
  beforeEach(() => {
    mockAuthorizeRedemptions.mockReset();
    mockRequestMagicLink.mockReset();
    mockUseAuthSession.mockReset();
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

  it("renders the authorized placeholder with the locked event code", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
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
    expect(
      screen.getByText("Monitoring list loads in the next commit."),
    ).toBeTruthy();
  });

  it("collapses slug-not-found and role-held-none branches into identical role-gate DOM", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "organizer@example.com",
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
