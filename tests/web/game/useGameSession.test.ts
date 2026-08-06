import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import type { GameConfig } from "../../../apps/web/src/data/games.ts";
import type { GameCompletionResult } from "../../../apps/web/src/types/game.ts";

const { mockCreateRequestId, mockReadActiveClientSessionId, mockSubmitGameCompletion } =
  vi.hoisted(() => {
    return {
      mockCreateRequestId: vi.fn(),
      mockReadActiveClientSessionId: vi.fn(),
      mockSubmitGameCompletion: vi.fn(),
    };
  });

// The reducer and side-effect orchestration are the behavior under test here,
// so we mock only the API boundary, the request-id generator, and the
// env-coupled session-identity resolver that gates device persistence.
vi.mock("../../../apps/web/src/lib/gameApi.ts", () => ({
  submitGameCompletion: mockSubmitGameCompletion,
}));

vi.mock("../../../apps/web/src/lib/session.ts", () => ({
  createRequestId: mockCreateRequestId,
}));

vi.mock("../../../apps/web/src/lib/clientSessionId.ts", () => ({
  readActiveClientSessionId: mockReadActiveClientSessionId,
}));

import { useGameSession } from "../../../apps/web/src/game/useGameSession.ts";

// Node's experimental webstorage global shadows jsdom's localStorage in the
// test runtime, so the suite installs the same in-memory Storage stand-in the
// gameApi tests use.
function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key) ?? null : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    get length() {
      return values.size;
    },
  };
}

function createCompletionResult(overrides: Partial<GameCompletionResult> = {}): GameCompletionResult {
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
    score: 2,
    ...overrides,
  };
}

// These fixtures are intentionally tiny so the tests can read like state-machine
// examples instead of repeating the full sample catalog.
function createFinalScoreGame(questionCount = 2): GameConfig {
  const questions = [
    {
      id: "q1",
      sponsor: "Sponsor One",
      prompt: "Question one?",
      selectionMode: "single" as const,
      correctAnswerIds: ["b"],
      options: [
        { id: "a", label: "Option A" },
        { id: "b", label: "Option B" },
      ],
    },
    {
      id: "q2",
      sponsor: "Sponsor Two",
      prompt: "Question two?",
      selectionMode: "multiple" as const,
      correctAnswerIds: ["a", "c"],
      options: [
        { id: "a", label: "Option A" },
        { id: "b", label: "Option B" },
        { id: "c", label: "Option C" },
      ],
    },
  ];

  return {
    id: "test-final-score",
    slug: "test-final-score",
    name: "Test Final Score",
    location: "Seattle",
    estimatedMinutes: 2,
    entitlementLabel: "reward ticket",
    intro: "Test intro",
    summary: "Test summary",
    feedbackMode: "final_score_reveal",
    questions: questions.slice(0, questionCount),
  };
}

function createNonBlockingGame(): GameConfig {
  return {
    id: "test-non-blocking",
    slug: "test-non-blocking",
    name: "Test Non Blocking",
    location: "Seattle",
    estimatedMinutes: 2,
    entitlementLabel: "reward ticket",
    intro: "Test intro",
    summary: "Test summary",
    feedbackMode: "instant_feedback_non_blocking",
    questions: [
      {
        id: "q1",
        sponsor: "Sponsor One",
        prompt: "Question one?",
        selectionMode: "single",
        correctAnswerIds: ["b"],
        explanation: "Explanation one.",
        sponsorFact: "Sponsor fact for the first answer.",
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
      {
        id: "q2",
        sponsor: "Sponsor Two",
        prompt: "Question two?",
        selectionMode: "single",
        correctAnswerIds: ["a"],
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
    ],
  };
}

function createInstantFeedbackGame(): GameConfig {
  return {
    id: "test-instant-feedback",
    slug: "test-instant-feedback",
    name: "Test Instant Feedback",
    location: "Seattle",
    estimatedMinutes: 2,
    entitlementLabel: "reward ticket",
    intro: "Test intro",
    summary: "Test summary",
    feedbackMode: "instant_feedback_required",
    questions: [
      {
        id: "q1",
        sponsor: "Sponsor One",
        prompt: "Question one?",
        selectionMode: "single",
        correctAnswerIds: ["b"],
        sponsorFact: "Sponsor fact for the first answer.",
        explanation: "Choose the right answer to move on.",
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
      {
        id: "q2",
        sponsor: "Sponsor Two",
        prompt: "Question two?",
        selectionMode: "single",
        correctAnswerIds: ["a"],
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
    ],
  };
}

describe("useGameSession", () => {
  beforeEach(() => {
    mockCreateRequestId.mockReset();
    mockReadActiveClientSessionId.mockReset();
    mockSubmitGameCompletion.mockReset();
    // A stable id makes the retry/idempotency assertions readable and matches
    // the product requirement that the same completion attempt reuses its key.
    mockCreateRequestId.mockReturnValue("req-123");
    // No session identity by default: persistence stays inert so the
    // state-machine tests exercise exactly the pre-persistence behavior.
    mockReadActiveClientSessionId.mockReturnValue(null);
    // Node's experimental webstorage global shadows jsdom's localStorage in
    // the test runtime, so install a fresh in-memory Storage stand-in.
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("submits the final-score flow and exposes the trusted completion result", async () => {
    const game = createFinalScoreGame();
    const completion = createCompletionResult();
    mockSubmitGameCompletion.mockResolvedValue(completion);

    const { result } = renderHook(() => useGameSession(game));

    act(() => {
      result.current.start();
      result.current.selectOption("b");
      result.current.submit();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.answers).toEqual({ q1: ["b"] });

    act(() => {
      result.current.selectOption("c");
      result.current.selectOption("a");
      result.current.submit();
    });

    expect(result.current.isSubmittingCompletion).toBe(true);

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });

    expect(result.current.latestCompletion).toEqual(completion);
    expect(result.current.score).toBe(completion.score);
    expect(mockSubmitGameCompletion).toHaveBeenCalledTimes(1);

    const submission = mockSubmitGameCompletion.mock.calls[0]?.[0];
    // The hook should submit canonical answer ordering because the backend and
    // persistence layer treat the shared config as the source of truth.
    expect(submission).toMatchObject({
      answers: {
        q1: ["b"],
        q2: ["a", "c"],
      },
      eventId: game.id,
      requestId: "req-123",
    });
    expect(submission?.durationMs).toEqual(expect.any(Number));
    expect(submission?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("keeps instant-feedback questions on the same step until the correct answer is submitted", () => {
    const { result } = renderHook(() => useGameSession(createInstantFeedbackGame()));

    act(() => {
      result.current.start();
      result.current.selectOption("a");
      result.current.submit();
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isShowingQuestion).toBe(true);
    expect(result.current.feedbackKind).toBe("incorrect");
    expect(result.current.feedbackMessage).toBe("Choose the right answer to move on.");
    expect(result.current.answers).toEqual({});

    act(() => {
      result.current.selectOption("b");
      result.current.submit();
    });

    expect(result.current.isShowingAnswerReveal).toBe(true);
    expect(result.current.feedbackKind).toBe("correct");
    expect(result.current.feedbackMessage).toBe("Sponsor fact for the first answer.");
    expect(result.current.answers).toEqual({ q1: ["b"] });

    act(() => {
      result.current.continueFromAnswerReveal();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isShowingQuestion).toBe(true);
    expect(result.current.feedbackKind).toBeNull();
  });

  it("stores the wrong answer and reveals the explanation in non-blocking mode, then advances", () => {
    const { result } = renderHook(() => useGameSession(createNonBlockingGame()));

    act(() => {
      result.current.start();
      result.current.selectOption("a");
      result.current.submit();
    });

    // Wrong answer in non-blocking mode lands on the reveal phase, persists
    // the player's submission (so backend scoring sees it), and surfaces the
    // explanation rather than the sponsor fact.
    expect(result.current.isShowingAnswerReveal).toBe(true);
    expect(result.current.feedbackKind).toBe("incorrect");
    expect(result.current.feedbackMessage).toBe("Explanation one.");
    expect(result.current.answers).toEqual({ q1: ["a"] });

    act(() => {
      result.current.continueFromAnswerReveal();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.isShowingQuestion).toBe(true);
    expect(result.current.feedbackKind).toBeNull();
  });

  it("routes correct submissions through the sponsor-fact precedence in non-blocking mode", () => {
    const { result } = renderHook(() => useGameSession(createNonBlockingGame()));

    act(() => {
      result.current.start();
      result.current.selectOption("b");
      result.current.submit();
    });

    expect(result.current.isShowingAnswerReveal).toBe(true);
    expect(result.current.feedbackKind).toBe("correct");
    expect(result.current.feedbackMessage).toBe("Sponsor fact for the first answer.");
    expect(result.current.answers).toEqual({ q1: ["b"] });
  });

  it("restores the saved answer when navigating back to a previous question", () => {
    const { result } = renderHook(() => useGameSession(createFinalScoreGame()));

    act(() => {
      result.current.start();
      result.current.selectOption("b");
      result.current.submit();
    });

    expect(result.current.currentIndex).toBe(1);
    expect(result.current.pendingSelection).toEqual([]);

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.pendingSelection).toEqual(["b"]);
    expect(result.current.canSubmit).toBe(true);
  });

  it("retries completion with the same request id after a failed submission", async () => {
    const game = createFinalScoreGame(1);
    const completion = createCompletionResult({ score: 1 });

    mockSubmitGameCompletion
      .mockRejectedValueOnce(new Error("Temporary backend problem."))
      .mockResolvedValueOnce(completion);

    const { result } = renderHook(() => useGameSession(game));

    act(() => {
      result.current.start();
      result.current.selectOption("b");
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.completionError).toBe("Temporary backend problem.");
    });

    expect(result.current.isComplete).toBe(true);
    expect(result.current.latestCompletion).toBeNull();

    act(() => {
      result.current.retryCompletionSubmission();
    });

    await waitFor(() => {
      expect(result.current.latestCompletion).toEqual(completion);
    });

    expect(mockSubmitGameCompletion).toHaveBeenCalledTimes(2);
    // This is one of the key trust-boundary behaviors from the testing strategy:
    // a retry should preserve idempotency rather than mint a new completion id.
    expect(mockSubmitGameCompletion.mock.calls[0]?.[0]).toMatchObject({
      requestId: "req-123",
    });
    expect(mockSubmitGameCompletion.mock.calls[1]?.[0]).toMatchObject({
      requestId: "req-123",
    });
  });

  describe("per-attempt option shuffling", () => {
    let randomSpy: MockInstance<() => number>;

    beforeEach(() => {
      // random() === 0 pins a known non-authored permutation; switching the
      // spy to just-below-1 afterward pins the identity permutation, which
      // lets tests tell "kept the attempt's order" apart from "re-shuffled".
      randomSpy = vi.spyOn(Math, "random").mockReturnValue(0);
    });

    afterEach(() => {
      randomSpy.mockRestore();
    });

    it("renders options in a shuffled order without touching the source config", () => {
      const game = createFinalScoreGame();
      const { result } = renderHook(() => useGameSession(game));

      act(() => {
        result.current.start();
      });

      // With random() === 0 the two-option question renders reversed.
      expect(result.current.currentQuestion?.options.map((o) => o.id)).toEqual([
        "b",
        "a",
      ]);
      expect(game.questions[0].options.map((o) => o.id)).toEqual(["a", "b"]);
    });

    it("keeps one permutation stable across submit and back-navigation", () => {
      const game = createFinalScoreGame();
      const { result } = renderHook(() => useGameSession(game));

      const shuffledIds = () =>
        result.current.currentQuestion?.options.map((o) => o.id);

      act(() => {
        result.current.start();
      });

      const firstQuestionOrder = shuffledIds();
      expect(firstQuestionOrder).toEqual(["b", "a"]);

      // Any re-shuffle from here on would produce the authored order instead.
      randomSpy.mockReturnValue(0.9999);

      act(() => {
        result.current.selectOption("b");
        result.current.submit();
      });

      expect(result.current.currentIndex).toBe(1);

      act(() => {
        result.current.goBack();
      });

      expect(shuffledIds()).toEqual(firstQuestionOrder);
    });

    it("grades a correct selection normally against the shuffled question", () => {
      const { result } = renderHook(() => useGameSession(createInstantFeedbackGame()));

      act(() => {
        result.current.start();
        result.current.selectOption("b");
        result.current.submit();
      });

      expect(result.current.feedbackKind).toBe("correct");
      expect(result.current.answers).toEqual({ q1: ["b"] });
    });

    it("draws a fresh permutation on retake", async () => {
      const game = createFinalScoreGame(1);
      mockSubmitGameCompletion.mockResolvedValue(createCompletionResult({ score: 1 }));

      const { result } = renderHook(() => useGameSession(game));

      act(() => {
        result.current.start();
      });

      expect(result.current.currentQuestion?.options.map((o) => o.id)).toEqual([
        "b",
        "a",
      ]);

      act(() => {
        result.current.selectOption("b");
        result.current.submit();
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      // The retake's draw uses the identity permutation, so a changed order
      // proves the attempt re-rolled rather than reusing the stored shuffle.
      randomSpy.mockReturnValue(0.9999);

      act(() => {
        result.current.resetForRetake();
      });

      expect(result.current.currentQuestion?.options.map((o) => o.id)).toEqual([
        "a",
        "b",
      ]);
    });
  });

  describe("device persistence", () => {
    const storageKey = (gameId: string) => `neighborly.game-session.v1.${gameId}`;

    function seedSnapshot(gameId: string, snapshot: unknown) {
      window.localStorage.setItem(
        storageKey(gameId),
        JSON.stringify({
          clientSessionId: "session-test",
          savedAt: "2026-08-06T12:00:00.000Z",
          snapshot,
        }),
      );
    }

    beforeEach(() => {
      mockReadActiveClientSessionId.mockReturnValue("session-test");
    });

    it("restores a completed snapshot on mount without resubmitting", () => {
      const game = createFinalScoreGame();
      const completion = createCompletionResult();
      seedSnapshot(game.id, {
        answers: { q1: ["b"], q2: ["a", "c"] },
        completion,
        kind: "complete",
      });

      const { result } = renderHook(() => useGameSession(game));

      expect(result.current.isComplete).toBe(true);
      expect(result.current.latestCompletion).toEqual(completion);
      expect(result.current.answers).toEqual({ q1: ["b"], q2: ["a", "c"] });
      expect(result.current.score).toBe(completion.score);
      expect(mockSubmitGameCompletion).not.toHaveBeenCalled();
    });

    it("restores an in-progress snapshot at the saved question with its option order", () => {
      const game = createFinalScoreGame();
      seedSnapshot(game.id, {
        answers: { q1: ["b"] },
        currentIndex: 1,
        kind: "in_progress",
        optionOrder: { q1: ["b", "a"], q2: ["c", "a", "b"] },
        startedAt: 1754500000000,
      });

      const { result } = renderHook(() => useGameSession(game));

      expect(result.current.isStarted).toBe(true);
      expect(result.current.isShowingQuestion).toBe(true);
      expect(result.current.currentIndex).toBe(1);
      expect(result.current.answers).toEqual({ q1: ["b"] });
      // The attempt's persisted permutation is re-applied, not re-rolled.
      expect(result.current.currentQuestion?.options.map((o) => o.id)).toEqual([
        "c",
        "a",
        "b",
      ]);

      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentQuestion?.options.map((o) => o.id)).toEqual([
        "b",
        "a",
      ]);
      expect(result.current.pendingSelection).toEqual(["b"]);
    });

    it("restores the saved answer as the pending selection for the current question", () => {
      const game = createFinalScoreGame();
      seedSnapshot(game.id, {
        answers: { q1: ["b"] },
        currentIndex: 0,
        kind: "in_progress",
        optionOrder: { q1: ["a", "b"], q2: ["a", "b", "c"] },
        startedAt: null,
      });

      const { result } = renderHook(() => useGameSession(game));

      expect(result.current.currentIndex).toBe(0);
      expect(result.current.pendingSelection).toEqual(["b"]);
      expect(result.current.canSubmit).toBe(true);
    });

    it("ignores a snapshot for a different client session", () => {
      const game = createFinalScoreGame();
      seedSnapshot(game.id, {
        answers: { q1: ["b"], q2: ["a", "c"] },
        completion: createCompletionResult(),
        kind: "complete",
      });
      mockReadActiveClientSessionId.mockReturnValue("session-other");

      const { result } = renderHook(() => useGameSession(game));

      expect(result.current.isStarted).toBe(false);
      expect(result.current.latestCompletion).toBeNull();
    });

    it("persists progress during play and the completion at the end", async () => {
      const game = createFinalScoreGame();
      const completion = createCompletionResult();
      mockSubmitGameCompletion.mockResolvedValue(completion);

      const { result } = renderHook(() => useGameSession(game));

      act(() => {
        result.current.start();
        result.current.selectOption("b");
        result.current.submit();
      });

      const storedMidRun = JSON.parse(
        window.localStorage.getItem(storageKey(game.id)) ?? "null",
      );
      expect(storedMidRun?.clientSessionId).toBe("session-test");
      expect(storedMidRun?.snapshot).toMatchObject({
        answers: { q1: ["b"] },
        currentIndex: 1,
        kind: "in_progress",
      });

      act(() => {
        result.current.selectOption("c");
        result.current.selectOption("a");
        result.current.submit();
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      const storedComplete = JSON.parse(
        window.localStorage.getItem(storageKey(game.id)) ?? "null",
      );
      expect(storedComplete?.snapshot).toMatchObject({
        completion,
        kind: "complete",
      });
      expect(result.current.isCompletionPersisted).toBe(true);
    });

    it("writes a submitting snapshot carrying the request id before the POST resolves", async () => {
      const game = createFinalScoreGame(1);
      let resolveSubmission!: (completion: GameCompletionResult) => void;
      mockSubmitGameCompletion.mockReturnValue(
        new Promise<GameCompletionResult>((resolve) => {
          resolveSubmission = resolve;
        }),
      );

      const { result } = renderHook(() => useGameSession(game));

      act(() => {
        result.current.start();
        result.current.selectOption("b");
        result.current.submit();
      });

      expect(result.current.isSubmittingCompletion).toBe(true);

      // The in-flight snapshot must hold the final answer AND the request id
      // so a reload replays the identical payload into the RPC's dedup.
      const storedSubmitting = JSON.parse(
        window.localStorage.getItem(storageKey(game.id)) ?? "null",
      );
      expect(storedSubmitting?.snapshot).toMatchObject({
        answers: { q1: ["b"] },
        completionRequestId: "req-123",
        kind: "submitting",
      });

      await act(async () => {
        resolveSubmission(createCompletionResult({ score: 1 }));
      });

      expect(result.current.isComplete).toBe(true);
    });

    it("restores an in-flight submission and replays the same request id", async () => {
      const game = createFinalScoreGame();
      const completion = createCompletionResult();
      seedSnapshot(game.id, {
        answers: { q1: ["b"], q2: ["a", "c"] },
        completionRequestId: "req-restored",
        kind: "submitting",
        startedAt: 1754500000000,
      });
      mockSubmitGameCompletion.mockResolvedValue(completion);

      const { result } = renderHook(() => useGameSession(game));

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(result.current.latestCompletion).toEqual(completion);
      expect(mockSubmitGameCompletion).toHaveBeenCalledTimes(1);
      // Same request id + same answers → the backend returns the original
      // attempt instead of recording a duplicate completion row.
      expect(mockSubmitGameCompletion.mock.calls[0]?.[0]).toMatchObject({
        answers: { q1: ["b"], q2: ["a", "c"] },
        eventId: game.id,
        requestId: "req-restored",
      });

      const storedComplete = JSON.parse(
        window.localStorage.getItem(storageKey(game.id)) ?? "null",
      );
      expect(storedComplete?.snapshot).toMatchObject({ kind: "complete" });
      expect(result.current.isCompletionPersisted).toBe(true);
    });

    it("reports the completion as not persisted when the snapshot write fails", async () => {
      const game = createFinalScoreGame(1);
      mockSubmitGameCompletion.mockResolvedValue(createCompletionResult({ score: 1 }));
      // No client session identity → persistence is disabled, so the CTA
      // links must keep their new-tab fallback.
      mockReadActiveClientSessionId.mockReturnValue(null);

      const { result } = renderHook(() => useGameSession(game));

      act(() => {
        result.current.start();
        result.current.selectOption("b");
        result.current.submit();
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(window.localStorage.getItem(storageKey(game.id))).toBeNull();
      expect(result.current.isCompletionPersisted).toBe(false);
    });

    it("marks a restored completed snapshot as durable", () => {
      const game = createFinalScoreGame();
      seedSnapshot(game.id, {
        answers: { q1: ["b"], q2: ["a", "c"] },
        completion: createCompletionResult(),
        kind: "complete",
      });

      const { result } = renderHook(() => useGameSession(game));

      expect(result.current.isCompletionPersisted).toBe(true);
    });

    it("clears the snapshot when the session resets to the intro", async () => {
      const game = createFinalScoreGame(1);
      mockSubmitGameCompletion.mockResolvedValue(createCompletionResult({ score: 1 }));

      const { result } = renderHook(() => useGameSession(game));

      act(() => {
        result.current.start();
        result.current.selectOption("b");
        result.current.submit();
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(window.localStorage.getItem(storageKey(game.id))).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(window.localStorage.getItem(storageKey(game.id))).toBeNull();
    });

    it("lets a restored completion retake and resubmit through the normal flow", async () => {
      const game = createFinalScoreGame(1);
      const replayCompletion = createCompletionResult({
        attemptNumber: 2,
        entitlement: {
          createdAt: "2026-08-06T12:00:00.000Z",
          status: "existing",
          verificationCode: "MMP-1234ABCD",
        },
        score: 1,
      });
      seedSnapshot(game.id, {
        answers: { q1: ["b"] },
        completion: createCompletionResult({ score: 1 }),
        kind: "complete",
      });
      mockSubmitGameCompletion.mockResolvedValue(replayCompletion);

      const { result } = renderHook(() => useGameSession(game));

      act(() => {
        result.current.resetForRetake();
      });

      expect(result.current.isComplete).toBe(false);
      expect(result.current.isShowingQuestion).toBe(true);

      act(() => {
        result.current.selectOption("b");
        result.current.submit();
      });

      await waitFor(() => {
        expect(result.current.latestCompletion).toEqual(replayCompletion);
      });

      // The retake resubmits and the backend returns the existing entitlement:
      // same code, no new reward entry.
      expect(
        result.current.latestCompletion?.entitlement.verificationCode,
      ).toBe("MMP-1234ABCD");
    });
  });

  it("resets state for a retake without leaving the active question flow", async () => {
    const game = createFinalScoreGame(1);
    const completion = createCompletionResult({ score: 1 });
    mockSubmitGameCompletion.mockResolvedValue(completion);

    const { result } = renderHook(() => useGameSession(game));

    act(() => {
      result.current.start();
      result.current.selectOption("b");
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.latestCompletion).toEqual(completion);
    });

    act(() => {
      result.current.resetForRetake();
    });

    expect(result.current.isStarted).toBe(true);
    expect(result.current.isShowingQuestion).toBe(true);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.answers).toEqual({});
    expect(result.current.latestCompletion).toBeNull();
    expect(result.current.pendingSelection).toEqual([]);
  });
});
