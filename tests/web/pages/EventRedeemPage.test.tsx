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
  mockRequestMagicLink,
  mockUseAuthSession,
} = vi.hoisted(() => ({
  mockRequestMagicLink: vi.fn(),
  mockUseAuthSession: vi.fn(),
}));

vi.mock("../../../apps/web/src/auth/useAuthSession.ts", () => ({
  useAuthSession: mockUseAuthSession,
}));

vi.mock("../../../apps/web/src/lib/authApi.ts", () => ({
  requestMagicLink: mockRequestMagicLink,
}));

import { EventRedeemPage } from "../../../apps/web/src/pages/EventRedeemPage.tsx";

describe("EventRedeemPage", () => {
  beforeEach(() => {
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
});
