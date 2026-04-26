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
  mockUseRedeemSubmit,
  mockUseAuthSession,
} = vi.hoisted(() => ({
  mockAuthorizeRedeem: vi.fn(),
  mockRequestMagicLink: vi.fn(),
  mockUseRedeemSubmit: vi.fn(),
  mockUseAuthSession: vi.fn(),
}));

vi.mock("../../../shared/auth/useAuthSession.ts", () => ({
  useAuthSession: mockUseAuthSession,
}));

vi.mock("../../../shared/auth/api.ts", () => ({
  requestMagicLink: mockRequestMagicLink,
}));

vi.mock("../../../apps/web/src/redeem/authorizeRedeem.ts", () => ({
  authorizeRedeem: mockAuthorizeRedeem,
}));

vi.mock("../../../apps/web/src/redeem/useRedeemSubmit.ts", () => ({
  useRedeemSubmit: mockUseRedeemSubmit,
}));

import { EventRedeemPage } from "../../../apps/web/src/pages/EventRedeemPage.tsx";

describe("EventRedeemPage", () => {
  beforeEach(() => {
    mockAuthorizeRedeem.mockReset();
    mockRequestMagicLink.mockReset();
    mockUseRedeemSubmit.mockReset();
    mockUseAuthSession.mockReset();
    mockUseRedeemSubmit.mockReturnValue({
      isSubmitting: false,
      resetResult: vi.fn(),
      resultState: { status: "idle" },
      retryLastSubmission: vi.fn(),
      submitCode: vi.fn().mockResolvedValue({ status: "idle" }),
    });
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

    expect(await screen.findByLabelText("Code preview")).toBeTruthy();
    expect(screen.getByLabelText("Code preview").textContent).toBe("MMF••••");
    expect(screen.getByRole("button", { name: "Redeem code" })).toBeTruthy();
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

  it("role-gate renders identical DOM for unknown-slug and no-role inputs", async () => {
    mockUseAuthSession.mockReturnValue({
      email: "agent@example.com",
      session: { access_token: "token" },
      status: "signed_in",
    });
    mockAuthorizeRedeem.mockResolvedValue({ status: "role_gate" });

    const unknownSlugRender = render(
      <EventRedeemPage onNavigate={() => {}} slug="absent-event" />,
    );
    await screen.findByRole("heading", { name: "Not available for this event." });
    const unknownSlugHtml = unknownSlugRender.container.innerHTML;
    unknownSlugRender.unmount();

    mockAuthorizeRedeem.mockResolvedValue({ status: "role_gate" });

    const noRoleRender = render(
      <EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );
    await screen.findByRole("heading", { name: "Not available for this event." });
    const noRoleHtml = noRoleRender.container.innerHTML;

    expect(noRoleHtml).toBe(unknownSlugHtml);
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
    expect(await screen.findByLabelText("Code preview")).toBeTruthy();
  });

  it("submits the entered 4-digit suffix through the redeem submit hook", async () => {
    const submitCode = vi.fn().mockResolvedValue({
      redeemedAt: "2026-04-21T12:00:00.000Z",
      redeemedByRole: "agent",
      result: "redeemed_now",
      status: "success",
    });

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
    mockUseRedeemSubmit.mockReturnValue({
      isSubmitting: false,
      resetResult: vi.fn(),
      resultState: { status: "idle" },
      retryLastSubmission: vi.fn(),
      submitCode,
    });

    render(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    await screen.findByLabelText("Code preview");

    fireEvent.click(screen.getByRole("button", { name: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.click(screen.getByRole("button", { name: "Redeem code" }));

    await waitFor(() => {
      expect(submitCode).toHaveBeenCalledWith("1234");
    });
  });

  it("disables keypad inputs and ignores keyboard digits while a redeem is in flight", async () => {
    const submitCode = vi.fn();

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
    mockUseRedeemSubmit.mockReturnValue({
      isSubmitting: true,
      resetResult: vi.fn(),
      resultState: { status: "idle" },
      retryLastSubmission: vi.fn(),
      submitCode,
    });

    render(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    const preview = await screen.findByLabelText("Code preview");
    expect(preview.textContent).toBe("MMF••••");

    for (const label of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) {
      expect(
        (screen.getByRole("button", { name: label }) as HTMLButtonElement).disabled,
      ).toBe(true);
    }
    expect(
      (screen.getByRole("button", { name: "Clear" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Backspace" }) as HTMLButtonElement).disabled,
    ).toBe(true);

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Backspace" });

    expect(preview.textContent).toBe("MMF••••");
  });

  it("clears stale access state across sign-out and re-sign-in with the same slug+email", async () => {
    let resolveSecondAuthorize: (value: {
      eventCode: string;
      eventId: string;
      status: "authorized";
    }) => void = () => {};
    const secondAuthorizePromise = new Promise<{
      eventCode: string;
      eventId: string;
      status: "authorized";
    }>((resolve) => {
      resolveSecondAuthorize = resolve;
    });

    mockUseAuthSession.mockReturnValue({
      email: "agent@example.com",
      session: { access_token: "token" },
      status: "signed_in",
    });
    mockAuthorizeRedeem
      .mockResolvedValueOnce({
        eventCode: "MMF",
        eventId: "madrona-music-2026",
        status: "authorized",
      })
      .mockReturnValueOnce(secondAuthorizePromise);

    const { rerender } = render(
      <EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />,
    );

    expect(await screen.findByLabelText("Code preview")).toBeTruthy();

    mockUseAuthSession.mockReturnValue({ status: "signed_out" });
    rerender(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    expect(
      await screen.findByRole("heading", { name: "Sign in to redeem codes" }),
    ).toBeTruthy();

    mockUseAuthSession.mockReturnValue({
      email: "agent@example.com",
      session: { access_token: "token" },
      status: "signed_in",
    });
    rerender(<EventRedeemPage onNavigate={() => {}} slug="madrona-music-2026" />);

    expect(await screen.findByText("Checking event access...")).toBeTruthy();
    expect(screen.queryByLabelText("Code preview")).toBeNull();

    resolveSecondAuthorize({
      eventCode: "MMF",
      eventId: "madrona-music-2026",
      status: "authorized",
    });

    expect(await screen.findByLabelText("Code preview")).toBeTruthy();
  });
});
