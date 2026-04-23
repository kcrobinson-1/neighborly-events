import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AttendeeRedemptionStatus } from "../../../../shared/redemption.ts";
import { GameCompletionPanel } from "../../../../apps/web/src/game/components/GameCompletionPanel.tsx";
import type { GameConfig } from "../../../../apps/web/src/data/games.ts";
import type { GameCompletionResult } from "../../../../apps/web/src/types/game.ts";

function createGame(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    id: "test-game",
    slug: "test-game",
    name: "Test Game",
    location: "Seattle",
    estimatedMinutes: 2,
    entitlementLabel: "reward ticket",
    intro: "Test intro",
    summary: "Test summary",
    feedbackMode: "final_score_reveal",
    questions: [
      {
        id: "q1",
        sponsor: "Sponsor One",
        prompt: "Question one?",
        selectionMode: "single",
        correctAnswerIds: ["b"],
        explanation: "Sponsor note one.",
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
    ],
    ...overrides,
  };
}

function createCompletionResult(
  overrides: Partial<GameCompletionResult> = {},
): GameCompletionResult {
  return {
    attemptNumber: 1,
    completionId: "cmp-123",
    entitlement: {
      createdAt: "2026-04-05T12:00:00.000Z",
      status: "new",
      verificationCode: "MMP-1234ABCD",
    },
    message: "You're checked in for the reward.",
    entitlementEligible: true,
    score: 1,
    ...overrides,
  };
}

function createStatus(
  kind: AttendeeRedemptionStatus["kind"],
  verificationCode = "MMP-1234ABCD",
): AttendeeRedemptionStatus {
  return kind === "unknown"
    ? { kind }
    : { kind, verificationCode };
}

describe("GameCompletionPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      completion: createCompletionResult(),
      expectedMeta: "Your reward entry is now recorded.",
      expectedStatusKind: "unknown" as const,
    },
    {
      completion: createCompletionResult({
        entitlement: {
          createdAt: "2026-04-05T12:00:00.000Z",
          status: "existing",
          verificationCode: "MMP-1234ABCD",
        },
      }),
      expectedMeta:
        "Your earlier reward entry still counts. This replay does not add another one.",
      expectedStatusKind: "unknown" as const,
    },
    {
      completion: createCompletionResult(),
      expectedMeta: "Your reward entry is now recorded.",
      expectedStatusKind: "unredeemed" as const,
    },
    {
      completion: createCompletionResult({
        entitlement: {
          createdAt: "2026-04-05T12:00:00.000Z",
          status: "existing",
          verificationCode: "MMP-1234ABCD",
        },
      }),
      expectedMeta:
        "Your earlier reward entry still counts. This replay does not add another one.",
      expectedStatusKind: "unredeemed" as const,
    },
    {
      completion: createCompletionResult(),
      expectedMeta: "Your reward entry is now recorded.",
      expectedStatusKind: "redeemed" as const,
    },
    {
      completion: createCompletionResult({
        entitlement: {
          createdAt: "2026-04-05T12:00:00.000Z",
          status: "existing",
          verificationCode: "MMP-1234ABCD",
        },
      }),
      expectedMeta:
        "Your earlier reward entry still counts. This replay does not add another one.",
      expectedStatusKind: "redeemed" as const,
    },
  ])(
    "renders the copy axes for $expectedStatusKind + $completion.entitlement.status",
    ({ completion, expectedMeta, expectedStatusKind }) => {
      render(
        <GameCompletionPanel
          answers={{ q1: ["a"] }}
          completion={completion}
          completionError={null}
          game={createGame()}
          isSubmitting={false}
          onReset={() => {}}
          onRetake={() => {}}
          onRetrySubmission={() => {}}
          score={1}
          showRetake={true}
          status={createStatus(expectedStatusKind)}
        />,
      );

      expect(screen.getByText("MMP-1234ABCD")).toBeTruthy();
      expect(screen.getByText("Final score")).toBeTruthy();
      expect(screen.getByText("Your answer:", { exact: false })).toBeTruthy();
      expect(screen.getByText("Correct answer:", { exact: false })).toBeTruthy();
      expect(screen.getByText(expectedMeta)).toBeTruthy();
      expect(screen.getByRole("button", { name: "Play again" })).toBeTruthy();

      if (expectedStatusKind === "redeemed") {
        expect(screen.getByText("Volunteer check-in complete")).toBeTruthy();
        expect(
          screen.getByRole("heading", { name: "Your volunteer check-in is complete" }),
        ).toBeTruthy();
        expect(
          screen.getByText("A volunteer has redeemed this code. You're all set."),
        ).toBeTruthy();
      } else {
        expect(screen.getByText("Ready for volunteer check-in")).toBeTruthy();
        expect(
          screen.getByRole("heading", {
            name: "Show this screen at the volunteer table",
          }),
        ).toBeTruthy();
        expect(
          screen.getByText(
            "Your reward entry is ready. Show this screen and code to the volunteer.",
          ),
        ).toBeTruthy();
      }
    },
  );

  it("keeps the verification code block mounted while redemption status changes", () => {
    const { container, rerender } = render(
      <GameCompletionPanel
        answers={{ q1: ["a"] }}
        completion={createCompletionResult()}
        completionError={null}
        game={createGame()}
        isSubmitting={false}
        onReset={() => {}}
        onRetake={() => {}}
        onRetrySubmission={() => {}}
        score={1}
        showRetake={true}
        status={createStatus("unredeemed")}
      />,
    );

    const originalTokenBlock = container.querySelector(".token-block");
    expect(originalTokenBlock).not.toBeNull();

    rerender(
      <GameCompletionPanel
        answers={{ q1: ["a"] }}
        completion={createCompletionResult()}
        completionError={null}
        game={createGame()}
        isSubmitting={false}
        onReset={() => {}}
        onRetake={() => {}}
        onRetrySubmission={() => {}}
        score={1}
        showRetake={true}
        status={createStatus("redeemed")}
      />,
    );

    expect(container.querySelector(".token-block")).toBe(originalTokenBlock);
    expect(screen.getByText("Volunteer check-in complete")).toBeTruthy();
    expect(screen.getByText("MMP-1234ABCD")).toBeTruthy();
  });

  it("shows retry actions when completion failed", () => {
    const onReset = vi.fn();
    const onRetrySubmission = vi.fn();

    render(
      <GameCompletionPanel
        answers={{}}
        completion={null}
        completionError="Temporary backend problem."
        game={createGame()}
        isSubmitting={false}
        onReset={onReset}
        onRetake={() => {}}
        onRetrySubmission={onRetrySubmission}
        score={0}
        showRetake={true}
        status={createStatus("unknown")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(onRetrySubmission).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.getByText("We couldn't load your check-in code")).toBeTruthy();
  });
});
