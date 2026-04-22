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
  mockAuthorizeRedeem,
  mockRequestMagicLink,
  mockUseAuthSession,
} = vi.hoisted(() => ({
  mockAuthorizeRedeem: vi.fn(),
  mockRequestMagicLink: vi.fn(),
  mockUseAuthSession: vi.fn(),
}));

vi.mock("../../../apps/web/src/auth/useAuthSession.ts", () => ({
  useAuthSession: mockUseAuthSession,
}));

vi.mock("../../../apps/web/src/lib/authApi.ts", () => ({
  requestMagicLink: mockRequestMagicLink,
}));

vi.mock("../../../apps/web/src/redeem/authorizeRedeem.ts", () => ({
  authorizeRedeem: mockAuthorizeRedeem,
}));

import { EventRedeemPage } from "../../../apps/web/src/pages/EventRedeemPage.tsx";

describe("EventRedeemPage", () => {
  beforeEach(() => {
    mockAuthorizeRedeem.mockReset();
    mockRequestMagicLink.mockReset();
    mockUseAuthSession.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the locked sign-in copy when no session exists", () => {
    mockUseAuthSession.mockReturnValue({
      status: "signed_out",
    });

    render(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    expect(
      screen.getByRole("heading", { name: "Sign in to redeem codes" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Send sign-in link" }),
    ).toBeTruthy();
  });

  it("requests a magic link that returns to the same redeem route", async () => {
    mockUseAuthSession.mockReturnValue({
      status: "signed_out",
    });
    mockRequestMagicLink.mockResolvedValue(undefined);

    render(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "agent@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Send sign-in link" }));

    await waitFor(() => {
      expect(mockRequestMagicLink).toHaveBeenCalledWith("agent@example.com", {
        next: "/event/madrona-music-2026/redeem",
      });
    });
    expect(
      screen.getByText("Check your email for the redemption sign-in link."),
    ).toBeTruthy();
  });

  it("renders the authorized placeholder state with the locked event code", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "agent@example.com",
      session: { access_token: "token" },
      status: "signed_in",
    });
    mockAuthorizeRedeem.mockResolvedValue({
      eventCode: "MMF",
      eventId: "madrona-music-2026",
      status: "authorized",
    });

    render(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    expect(await screen.findByText("Event code MMF")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Loading redemption tools..." })).toBeTruthy();
  });

  it("renders the role-gate copy without revealing event existence", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "agent@example.com",
      session: { access_token: "token" },
      status: "signed_in",
    });
    mockAuthorizeRedeem.mockResolvedValue({
      status: "role_gate",
    });

    render(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    expect(
      await screen.findByRole("heading", { name: "Not available for this event." }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Your account is not set up to redeem codes here. If you think this is a mistake, check with the event organizer.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/Event code/)).toBeNull();
  });

  it("renders a retryable transient authorization error and retries on demand", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "agent@example.com",
      session: { access_token: "token" },
      status: "signed_in",
    });
    mockAuthorizeRedeem
      .mockResolvedValueOnce({
        message: "We couldn't verify redeem access right now.",
        status: "transient_error",
      })
      .mockResolvedValueOnce({
        eventCode: "MMF",
        eventId: "madrona-music-2026",
        status: "authorized",
      });

    render(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    expect(
      await screen.findByRole("heading", {
        name: "We couldn't verify redeem access right now.",
      }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(mockAuthorizeRedeem).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByText("Event code MMF")).toBeTruthy();
  });
});
