import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RedeemResultCard } from "../../../apps/web/src/redeem/RedeemResultCard.tsx";

describe("RedeemResultCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the idle state with no next-code CTA", () => {
    render(
      <RedeemResultCard
        onClear={() => {}}
        onRedeemNextCode={() => {}}
        onRetry={() => {}}
        state={{ status: "idle" }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Enter a 4-digit code" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Redeem Next Code" })).toBeNull();
  });

  it("renders the redeemed_now success treatment", () => {
    const onRedeemNextCode = vi.fn();

    render(
      <RedeemResultCard
        onClear={() => {}}
        onRedeemNextCode={onRedeemNextCode}
        onRetry={() => {}}
        state={{
          redeemedAt: "2026-04-21T12:00:00.000Z",
          redeemedByRole: "agent",
          result: "redeemed_now",
          status: "success",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Redeemed" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Redeem Next Code" }));
    expect(onRedeemNextCode).toHaveBeenCalledTimes(1);
  });

  it("renders the already_redeemed success treatment", () => {
    render(
      <RedeemResultCard
        onClear={() => {}}
        onRedeemNextCode={() => {}}
        onRetry={() => {}}
        state={{
          redeemedAt: "2026-04-21T12:00:00.000Z",
          redeemedByRole: "root_admin",
          result: "already_redeemed",
          status: "success",
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Already redeemed" })).toBeTruthy();
  });

  it("renders the failure recovery actions", () => {
    const onClear = vi.fn();
    const onRetry = vi.fn();

    render(
      <RedeemResultCard
        onClear={onClear}
        onRedeemNextCode={() => {}}
        onRetry={onRetry}
        state={{
          result: "not_authorized",
          status: "failure",
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("disables the failure-state Try again button while a retry is pending", () => {
    const onRetry = vi.fn();

    render(
      <RedeemResultCard
        isSubmitting
        onClear={() => {}}
        onRedeemNextCode={() => {}}
        onRetry={onRetry}
        state={{
          result: "not_authorized",
          status: "failure",
        }}
      />,
    );

    const retryButton = screen.getByRole("button", { name: "Retrying..." });
    expect((retryButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(retryButton);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("renders the transient retry state", () => {
    render(
      <RedeemResultCard
        onClear={() => {}}
        onRedeemNextCode={() => {}}
        onRetry={() => {}}
        state={{
          isOffline: false,
          message: "Temporary failure.",
          status: "transient_error",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "We couldn't redeem this code right now.",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
