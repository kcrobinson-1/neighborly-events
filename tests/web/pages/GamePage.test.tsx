import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameConfig } from "../../../apps/web/src/data/games.ts";
import type { GameCompletionResult } from "../../../apps/web/src/types/game.ts";

const {
  mockEnsureServerSession,
  mockUseAttendeeRedemptionStatus,
  mockUseGameSession,
} = vi.hoisted(() => ({
  mockEnsureServerSession: vi.fn(),
  mockUseAttendeeRedemptionStatus: vi.fn(),
  mockUseGameSession: vi.fn(),
}));

vi.mock("../../../apps/web/src/lib/gameApi.ts", () => ({
  ensureServerSession: mockEnsureServerSession,
}));

vi.mock("../../../apps/web/src/redemptions/useAttendeeRedemptionStatus.ts", () => ({
  useAttendeeRedemptionStatus: mockUseAttendeeRedemptionStatus,
}));

vi.mock("../../../apps/web/src/game/useGameSession.ts", () => ({
  useGameSession: mockUseGameSession,
}));

import { GamePage } from "../../../apps/web/src/pages/GamePage.tsx";

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
        explanation: "Explanation one.",
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

function createSessionState(game: GameConfig, overrides = {}) {
  return {
    answers: {},
    allowRetake: true,
    canGoBack: false,
    canSubmit: false,
    completionError: null,
    continueFromCorrectFeedback: vi.fn(),
    currentIndex: 0,
    currentQuestion: game.questions[0],
    feedbackKind: null,
    feedbackMessage: null,
    goBack: vi.fn(),
    isComplete: false,
    isShowingCorrectFeedback: false,
    isShowingQuestion: false,
    isStarted: false,
    isSubmittingCompletion: false,
    latestCompletion: null,
    pendingSelection: [],
    progressValue: 100,
    reset: vi.fn(),
    resetForRetake: vi.fn(),
    retryCompletionSubmission: vi.fn(),
    score: 0,
    selectOption: vi.fn(),
    start: vi.fn(),
    submit: vi.fn(),
    ...overrides,
  };
}

describe("GamePage", () => {
  beforeEach(() => {
    mockEnsureServerSession.mockReset();
    mockUseAttendeeRedemptionStatus.mockReset();
    mockUseGameSession.mockReset();
    mockUseAttendeeRedemptionStatus.mockReturnValue({ kind: "unknown" });
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the intro state and starts the server session before gameplay", async () => {
    const game = createGame();
    const sessionState = createSessionState(game);
    mockEnsureServerSession.mockResolvedValue(undefined);
    mockUseGameSession.mockReturnValue(sessionState);

    render(<GamePage game={game} onNavigate={() => {}} />);

    expect(screen.getByText(`Finish to earn your ${game.entitlementLabel}`)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    await waitFor(() => {
      expect(mockEnsureServerSession).toHaveBeenCalledTimes(1);
    });
    expect(mockUseAttendeeRedemptionStatus).toHaveBeenCalledWith(null);
    expect(sessionState.start).toHaveBeenCalledTimes(1);
  });

  it("shows the start-screen error when the backend session bootstrap fails", async () => {
    const game = createGame();
    const sessionState = createSessionState(game);
    mockEnsureServerSession.mockRejectedValue(new Error("Backend is unavailable."));
    mockUseGameSession.mockReturnValue(sessionState);

    render(<GamePage game={game} onNavigate={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    expect(await screen.findByText("Backend is unavailable.")).toBeTruthy();
    expect(mockUseAttendeeRedemptionStatus).toHaveBeenCalledWith(null);
    expect(sessionState.start).not.toHaveBeenCalled();
  });

  it("renders the active question state and forwards question actions to the hook", () => {
    const game = createGame();
    const sessionState = createSessionState(game, {
      canSubmit: true,
      isShowingQuestion: true,
      isStarted: true,
      pendingSelection: ["a"],
      progressValue: 100,
    });
    mockUseGameSession.mockReturnValue(sessionState);

    render(<GamePage game={game} onNavigate={() => {}} />);

    fireEvent.click(screen.getByRole("radio", { name: "Option B" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(screen.getAllByText("Question 1 of 1")).toHaveLength(2);
    expect(mockUseAttendeeRedemptionStatus).toHaveBeenCalledWith(null);
    expect(
      screen.getByRole("heading", { name: game.questions[0].prompt }),
    ).toBeTruthy();
    expect(sessionState.selectOption).toHaveBeenCalledWith("b");
    expect(sessionState.submit).toHaveBeenCalledTimes(1);
  });

  it("keeps the attendee status hook inert during completion submission", () => {
    const game = createGame();
    const sessionState = createSessionState(game, {
      currentQuestion: undefined,
      isStarted: true,
      isSubmittingCompletion: true,
      latestCompletion: null,
    });
    mockUseGameSession.mockReturnValue(sessionState);

    render(<GamePage game={game} onNavigate={() => {}} />);

    expect(mockUseAttendeeRedemptionStatus).toHaveBeenCalledWith(null);
    expect(
      screen.getByRole("heading", { name: "Generating your check-in code" }),
    ).toBeTruthy();
  });

  it("renders the completion state, activates polling with game.id, and forwards completion actions to the hook", () => {
    const game = createGame();
    const sessionState = createSessionState(game, {
      answers: { q1: ["a"] },
      currentQuestion: undefined,
      isComplete: true,
      isStarted: true,
      latestCompletion: createCompletionResult(),
      score: 1,
    });
    mockUseAttendeeRedemptionStatus.mockReturnValue({
      kind: "redeemed",
      verificationCode: "MMP-1234ABCD",
    });
    mockUseGameSession.mockReturnValue(sessionState);

    render(<GamePage game={game} onNavigate={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    expect(mockUseAttendeeRedemptionStatus).toHaveBeenCalledWith(game.id);
    expect(screen.getByText("Volunteer check-in complete")).toBeTruthy();
    expect(screen.getByText("MMP-1234ABCD")).toBeTruthy();
    expect(sessionState.resetForRetake).toHaveBeenCalledTimes(1);
    expect(sessionState.reset).toHaveBeenCalledTimes(1);
  });

  it("updates the polling hook input when the active game changes after completion", () => {
    const firstGame = createGame();
    const secondGame = createGame({
      id: "test-game-2",
      name: "Second Game",
      slug: "second-game",
    });
    const sessionState = createSessionState(firstGame, {
      currentQuestion: undefined,
      isComplete: true,
      isStarted: true,
      latestCompletion: createCompletionResult(),
      score: 1,
    });
    mockUseGameSession.mockReturnValue(sessionState);

    const { rerender } = render(
      <GamePage game={firstGame} onNavigate={() => {}} />,
    );

    rerender(<GamePage game={secondGame} onNavigate={() => {}} />);

    expect(mockUseAttendeeRedemptionStatus).toHaveBeenNthCalledWith(1, firstGame.id);
    expect(mockUseAttendeeRedemptionStatus).toHaveBeenNthCalledWith(2, secondGame.id);
  });
});
