import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RedemptionDetailSheet } from "../../../apps/web/src/redemptions/RedemptionDetailSheet";
import type { RedemptionRow } from "../../../apps/web/src/redemptions/types";

function makeRow(overrides: Partial<RedemptionRow> = {}): RedemptionRow {
  return {
    event_id: "event-1",
    id: "row-1",
    redeemed_at: "2026-04-22T10:00:00Z",
    redeemed_by: "user-a",
    redeemed_by_role: "agent",
    redemption_reversed_at: null,
    redemption_reversed_by: null,
    redemption_reversed_by_role: null,
    redemption_status: "redeemed",
    verification_code: "MAD-0001",
    ...overrides,
  };
}

describe("RedemptionDetailSheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when row is null", () => {
    const { container } = render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        row={null}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders the full event-prefixed code, status, timestamp, and actor hints", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        row={makeRow({})}
      />,
    );

    expect(screen.getByText("MAD-0001")).toBeTruthy();
    expect(screen.getByText("Redeemed")).toBeTruthy();
    expect(screen.getByText("Redeemed at")).toBeTruthy();
    expect(screen.getByText("Redeemed by")).toBeTruthy();
    expect(screen.getByText(/You \(agent\)/)).toBeTruthy();
  });

  it("renders both redeemed and reversed sections when a prior reversal cycle exists", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        row={makeRow({
          redemption_reversed_at: "2026-04-22T09:30:00Z",
          redemption_reversed_by: "user-b",
          redemption_reversed_by_role: "organizer",
        })}
      />,
    );

    expect(screen.getByText("Redeemed at")).toBeTruthy();
    expect(screen.getByText("Reversed at")).toBeTruthy();
    expect(screen.getByText("Reversed by")).toBeTruthy();
    expect(screen.getByText("Organizer")).toBeTruthy();
  });

  it("never renders a Reverse button in B.2a (view-only contract)", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        row={makeRow({})}
      />,
    );

    expect(screen.queryByRole("button", { name: /reverse/i })).toBeNull();
  });

  it("moves focus to the Close button when the sheet opens", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        row={makeRow({})}
      />,
    );

    const closeButton = screen.getByRole("button", { name: "Close" });
    expect(document.activeElement).toBe(closeButton);
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();

    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={onClose}
        returnFocusTargetId={null}
        row={makeRow({})}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on scrim click", () => {
    const onClose = vi.fn();

    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={onClose}
        returnFocusTargetId={null}
        row={makeRow({})}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close details" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("returns focus to the returnFocusTargetId element when the sheet closes", () => {
    const existingButton = document.createElement("button");
    existingButton.id = "return-target";
    existingButton.textContent = "Original trigger";
    document.body.appendChild(existingButton);

    const { rerender } = render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId="return-target"
        row={makeRow({})}
      />,
    );

    // Simulate close by passing row={null}
    rerender(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId="return-target"
        row={null}
      />,
    );

    expect(document.activeElement).toBe(existingButton);
    document.body.removeChild(existingButton);
  });

  it("traps tab focus within the sheet", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        row={makeRow({})}
      />,
    );

    const focusableButtons = screen.getAllByRole("button");
    // Expect at least the scrim ("Close details") and the Close header button.
    expect(focusableButtons.length).toBeGreaterThanOrEqual(2);

    const first = focusableButtons[0];
    const last = focusableButtons[focusableButtons.length - 1];

    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    first.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
