import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameConfig } from "../../../apps/web/src/data/games.ts";
import type { GameCompletionResult } from "../../../apps/web/src/types/game.ts";
import { getQuizPageHead } from "../../../shared/events/quizPageHead.ts";

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
    continueFromAnswerReveal: vi.fn(),
    currentIndex: 0,
    currentQuestion: game.questions[0],
    feedbackKind: null,
    feedbackMessage: null,
    goBack: vi.fn(),
    isComplete: false,
    isCompletionPersisted: false,
    isShowingAnswerReveal: false,
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

    // The reward line names an event-owned redemption location, so
    // an event without a `quizPageHead` registry entry renders no
    // page-head subtext at all (today's look).
    expect(document.querySelector(".game-page-subtext")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start game" }));

    await waitFor(() => {
      expect(mockEnsureServerSession).toHaveBeenCalledTimes(1);
    });
    expect(mockUseAttendeeRedemptionStatus).toHaveBeenCalledWith(null);
    expect(sessionState.start).toHaveBeenCalledTimes(1);
  });

  it("renders the registry reward line with the config question count for registered events", () => {
    const game = createGame({ slug: "madrona" });
    mockUseGameSession.mockReturnValue(createSessionState(game));

    render(<GamePage game={game} onNavigate={() => {}} />);

    // The contract is the composition: config-derived count lead, then
    // the registry's reward line verbatim. Read the line from the
    // registry rather than restating it, so a copy edit there does not
    // fail this test while a broken composition still does.
    const rewardLine = getQuizPageHead("madrona")?.rewardLine;
    expect(rewardLine).toBeTruthy();
    expect(screen.getByText(`One question. ${rewardLine}`)).toBeTruthy();
  });

  it("keeps the demo-overview nav for events without a masthead", () => {
    const game = createGame();
    mockUseGameSession.mockReturnValue(createSessionState(game));

    const { container } = render(<GamePage game={game} onNavigate={() => {}} />);

    expect(
      screen.getByRole("button", { name: "Back to demo overview" }),
    ).toBeTruthy();
    expect(container.querySelector(".sample-nav")).not.toBeNull();
  });

  it("drops the demo-overview nav on events that render the shared masthead", () => {
    const game = createGame({ slug: "madrona" });
    mockUseGameSession.mockReturnValue(createSessionState(game));

    const { container } = render(<GamePage game={game} onNavigate={() => {}} />);

    // The bar (rendered above the shell by `App.tsx`) carries the way
    // out, and the "Featured demo" / "Demo flow" chip misdescribes a
    // real event — so the whole prototype nav goes.
    expect(
      screen.queryByRole("button", { name: "Back to demo overview" }),
    ).toBeNull();
    expect(container.querySelector(".sample-nav")).toBeNull();
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

  it("mounts the correct-answer panel during the answer-reveal phase when the player got it right", () => {
    const game = createGame({ feedbackMode: "instant_feedback_non_blocking" });
    const sessionState = createSessionState(game, {
      answers: { q1: ["b"] },
      feedbackKind: "correct",
      feedbackMessage: "Sponsor fact for the first answer.",
      isShowingAnswerReveal: true,
      isStarted: true,
      pendingSelection: ["b"],
    });
    mockUseGameSession.mockReturnValue(sessionState);

    render(<GamePage game={game} onNavigate={() => {}} />);

    expect(screen.getByText("Correct")).toBeTruthy();
    expect(screen.getByText("Sponsor fact for the first answer.")).toBeTruthy();
    expect(screen.queryByText("Not quite")).toBeNull();
  });

  it("mounts the answer-reveal panel during the reveal phase when the player got it wrong", () => {
    const game = createGame({ feedbackMode: "instant_feedback_non_blocking" });
    const sessionState = createSessionState(game, {
      answers: { q1: ["a"] },
      feedbackKind: "incorrect",
      feedbackMessage: "Explanation one.",
      isShowingAnswerReveal: true,
      isStarted: true,
      pendingSelection: ["a"],
    });
    mockUseGameSession.mockReturnValue(sessionState);

    render(<GamePage game={game} onNavigate={() => {}} />);

    expect(screen.getByText("Not quite")).toBeTruthy();
    // The reveal panel must surface the correct option label so the player
    // knows the right answer, not just that they were wrong.
    expect(
      screen.getByText("Option B", { exact: false, selector: "p" }),
    ).toBeTruthy();
    expect(screen.getByText("Explanation one.")).toBeTruthy();
    expect(screen.queryByText("Correct")).toBeNull();
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

    fireEvent.click(screen.getByRole("button", { name: "Retake the quiz" }));

    expect(mockUseAttendeeRedemptionStatus).toHaveBeenCalledWith(game.id);
    expect(screen.getByText("Volunteer check-in complete")).toBeTruthy();
    expect(screen.getByText("MMP-1234ABCD")).toBeTruthy();
    expect(sessionState.resetForRetake).toHaveBeenCalledTimes(1);
    // The durable completed state exposes no "Start over" escape hatch.
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
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
