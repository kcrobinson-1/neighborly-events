import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RedemptionDetailSheet,
  type RedemptionDetailSheetReversalProps,
} from "../../../apps/web/src/redemptions/RedemptionDetailSheet";
import type { RedemptionRow } from "../../../apps/web/src/redemptions/types";
import type { ReverseResultState } from "../../../apps/web/src/redemptions/useReverseRedemption";

function makeRow(overrides: Partial<RedemptionRow> = {}): RedemptionRow {
  return {
    event_id: "event-1",
    id: "row-1",
    redeemed_at: "2026-04-22T10:00:00Z",
    redeemed_by: "user-a",
    redeemed_by_role: "agent",
    redemption_note: null,
    redemption_reversed_at: null,
    redemption_reversed_by: null,
    redemption_reversed_by_role: null,
    redemption_status: "redeemed",
    verification_code: "MAD-0001",
    ...overrides,
  };
}

function makeReversal(
  overrides: Partial<RedemptionDetailSheetReversalProps> = {},
): RedemptionDetailSheetReversalProps {
  return {
    detailRefreshError: null,
    isReversible: true,
    mutationState: { status: "idle" } satisfies ReverseResultState,
    onBack: vi.fn(),
    onConfirmReversal: vi.fn(),
    onReasonInputChange: vi.fn(),
    onRetryDetailRefresh: vi.fn(),
    onRetryReversal: vi.fn(),
    onStartConfirmation: vi.fn(),
    reasonInput: "",
    step: "details",
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
        reversal={makeReversal()}
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
        reversal={makeReversal()}
        row={makeRow({})}
      />,
    );

    expect(screen.getByText("MAD-0001")).toBeTruthy();
    expect(screen.getByText("Redeemed")).toBeTruthy();
    expect(screen.getByText("Redeemed at")).toBeTruthy();
    expect(screen.getByText("Redeemed by")).toBeTruthy();
    expect(screen.getByText(/You \(agent\)/)).toBeTruthy();
  });

  it("exposes the event-prefixed code as the dialog's accessible name", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal()}
        row={makeRow({})}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "MAD-0001" }),
    ).toBeTruthy();
  });

  it("renders both redeemed and reversed sections when a prior reversal cycle exists", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal()}
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

  it("renders the Reason row when the selected row carries a redemption_note", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal()}
        row={makeRow({
          redemption_note: "disputed by attendee",
          redemption_reversed_at: "2026-04-22T09:30:00Z",
          redemption_reversed_by: "user-b",
          redemption_reversed_by_role: "organizer",
          redemption_status: "unredeemed",
        })}
      />,
    );

    expect(screen.getByText("Reason")).toBeTruthy();
    expect(screen.getByText("disputed by attendee")).toBeTruthy();
  });

  it("does not render the Reason row when the redemption_note is null", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal()}
        row={makeRow({})}
      />,
    );

    expect(screen.queryByText("Reason")).toBeNull();
  });

  it("renders the Reverse redemption CTA for a reversible row in the details step", () => {
    const onStartConfirmation = vi.fn();

    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          isReversible: true,
          onStartConfirmation,
        })}
        row={makeRow({})}
      />,
    );

    const button = screen.getByRole("button", { name: "Reverse redemption" });
    fireEvent.click(button);
    expect(onStartConfirmation).toHaveBeenCalledTimes(1);
  });

  it("hides the Reverse redemption CTA when the row is not reversible", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({ isReversible: false })}
        row={makeRow({
          redemption_reversed_at: "2026-04-22T09:30:00Z",
          redemption_reversed_by: "user-b",
          redemption_reversed_by_role: "organizer",
          redemption_status: "unredeemed",
        })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Reverse redemption" }),
    ).toBeNull();
  });

  it("hides the Reverse redemption CTA while a mutation is in a success state", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          isReversible: true,
          mutationState: {
            result: "reversed_now",
            reversedAt: "2026-04-22T10:05:00Z",
            reversedByRole: "organizer",
            status: "success",
          },
        })}
        row={makeRow({})}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Reverse redemption" }),
    ).toBeNull();
    expect(screen.getByText("Redemption reversed.")).toBeTruthy();
  });

  it("renders the idempotent success banner for already_unredeemed", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          mutationState: {
            result: "already_unredeemed",
            status: "success",
          },
        })}
        row={makeRow({})}
      />,
    );

    expect(
      screen.getByText("This redemption was already reversed."),
    ).toBeTruthy();
  });

  it("renders the detail-refresh warning with a retry affordance when set", () => {
    const onRetryDetailRefresh = vi.fn();

    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          detailRefreshError: "We couldn't refresh this row.",
          mutationState: {
            result: "reversed_now",
            reversedAt: "2026-04-22T10:05:00Z",
            reversedByRole: "organizer",
            status: "success",
          },
          onRetryDetailRefresh,
        })}
        row={makeRow({})}
      />,
    );

    expect(screen.getByText("We couldn't refresh this row.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Refresh details" }));
    expect(onRetryDetailRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders the confirmation step heading, summary, and reason input", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({ step: "confirmation" })}
        row={makeRow({})}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Reverse redemption?" }),
    ).toBeTruthy();
    expect(screen.getByText("Reason (optional)")).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Confirm reversal" }),
    ).toBeTruthy();
    expect(screen.getByText("MAD")).toBeTruthy();
    expect(screen.getByText("Prior status")).toBeTruthy();
  });

  it("confirm-reversal button calls the handler and forwards reason-input changes", () => {
    const onConfirmReversal = vi.fn();
    const onReasonInputChange = vi.fn();

    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          onConfirmReversal,
          onReasonInputChange,
          reasonInput: "initial",
          step: "confirmation",
        })}
        row={makeRow({})}
      />,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "final note" },
    });
    expect(onReasonInputChange).toHaveBeenCalledWith("final note");

    fireEvent.click(screen.getByRole("button", { name: "Confirm reversal" }));
    expect(onConfirmReversal).toHaveBeenCalledTimes(1);
  });

  it("disables the confirmation actions and swaps the confirm label during pending", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          mutationState: { status: "pending" },
          step: "confirmation",
        })}
        row={makeRow({})}
      />,
    );

    const confirmButton = screen.getByRole("button", { name: "Reversing..." });
    expect(confirmButton.hasAttribute("disabled")).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Back" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(
      true,
    );
  });

  it("renders the stable failure copy and disables confirm when mutation fails", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          mutationState: { result: "not_authorized", status: "failure" },
          step: "confirmation",
        })}
        row={makeRow({})}
      />,
    );

    expect(
      screen.getByText(
        "You aren't authorized to reverse this redemption.",
      ),
    ).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Confirm reversal" }) as
        HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("renders the not_found copy distinctly from not_authorized", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          mutationState: { result: "not_found", status: "failure" },
          step: "confirmation",
        })}
        row={makeRow({})}
      />,
    );

    expect(
      screen.getByText("This redemption could not be found."),
    ).toBeTruthy();
  });

  it("renders a Retry button for a transient mutation failure that calls the handler", () => {
    const onRetryReversal = vi.fn();

    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({
          mutationState: {
            isOffline: false,
            message: "Please retry once your connection is stable.",
            status: "transient_error",
          },
          onRetryReversal,
          step: "confirmation",
        })}
        row={makeRow({})}
      />,
    );

    expect(
      screen.getByText("Please retry once your connection is stable."),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetryReversal).toHaveBeenCalledTimes(1);
  });

  it("calls onBack when Back is clicked from the confirmation step", () => {
    const onBack = vi.fn();

    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal({ onBack, step: "confirmation" })}
        row={makeRow({})}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("moves focus to the Close button when the sheet opens", () => {
    render(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId={null}
        reversal={makeReversal()}
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
        reversal={makeReversal()}
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
        reversal={makeReversal()}
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
        reversal={makeReversal()}
        row={makeRow({})}
      />,
    );

    rerender(
      <RedemptionDetailSheet
        currentUserId="user-a"
        eventCode="MAD"
        onClose={() => {}}
        returnFocusTargetId="return-target"
        reversal={makeReversal()}
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
        reversal={makeReversal()}
        row={makeRow({})}
      />,
    );

    const focusableButtons = screen.getAllByRole("button");
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
