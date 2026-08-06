import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { scoreAnswers } from "../../../../shared/game-config";
import type { GameConfig } from "../data/games";
import { submitGameCompletion } from "../lib/gameApi";
import { createRequestId } from "../lib/session";
import {
  getGameSessionScore,
  getGameSessionViewState,
} from "./gameSessionSelectors";
import {
  applyOptionOrder,
  clearPersistedGameSnapshot,
  computeContentFingerprint,
  extractOptionOrder,
  readPersistedGameSnapshot,
  writePersistedGameSnapshot,
} from "./gameSessionPersistence";
import {
  createCompletionRequestId,
  createGameState,
  createRestoredCompleteState,
  createRestoredInProgressState,
  createRestoredSubmittingState,
  gameReducer,
} from "./gameSessionState";
import { shuffleGameOptions } from "./shuffleGameOptions";

/** Manages the complete game session lifecycle for a single game instance. */
export function useGameSession(game: GameConfig) {
  // A persisted snapshot (same device, same client session) restores the quiz
  // to the state the attendee left — mid-run or completed — so navigating away
  // or reloading never costs progress or the check-in code. Restore is
  // mount-only by design: later snapshot writes originate from this hook.
  const [restoredSnapshot] = useState(() => readPersistedGameSnapshot(game));
  const [state, dispatch] = useReducer(gameReducer, undefined, () => {
    if (restoredSnapshot?.kind === "complete") {
      return createRestoredCompleteState(
        restoredSnapshot.answers,
        restoredSnapshot.completion,
      );
    }

    if (restoredSnapshot?.kind === "submitting") {
      return createRestoredSubmittingState(
        restoredSnapshot.answers,
        restoredSnapshot.completionRequestId,
        // Back-date startedAt by the persisted duration so the replayed
        // request reports the original elapsed time, not one inflated by
        // however long the page was gone.
        Date.now() - restoredSnapshot.durationMs,
      );
    }

    if (restoredSnapshot?.kind === "in_progress") {
      return createRestoredInProgressState(
        restoredSnapshot.answers,
        restoredSnapshot.currentIndex,
        restoredSnapshot.startedAt,
        game.questions[restoredSnapshot.currentIndex]?.id ?? null,
      );
    }

    return createGameState();
  });
  const handledSubmissionRequestId = useRef<string | null>(null);
  // True only while the completed state is confirmed written to device
  // storage. A completed snapshot restored from storage is durable by
  // construction; otherwise the submission callback records the write's
  // outcome, and reset/retake clear it. Consumers use this to keep the
  // new-tab link fallback when the in-memory state is the only copy of the
  // verification code.
  const [isCompletionPersisted, setIsCompletionPersisted] = useState(
    () => restoredSnapshot?.kind === "complete",
  );
  // Answer options render in a per-attempt random order so the authored order
  // cannot leak the correct answer. The shuffled copy lives in state so one
  // permutation stays stable for the whole attempt (back-navigation included);
  // only a game change or a retake draws a fresh one. Keyed by game.id — the
  // same key the reset effect below uses — because the game object's identity
  // is not stable across renders in every caller. A restored in-progress
  // attempt re-applies its persisted permutation instead of re-rolling.
  const [shuffled, setShuffled] = useState(() => ({
    gameId: game.id,
    game:
      restoredSnapshot?.kind === "in_progress"
        ? applyOptionOrder(game, restoredSnapshot.optionOrder)
        : shuffleGameOptions(game),
  }));

  if (shuffled.gameId !== game.id) {
    setShuffled({ gameId: game.id, game: shuffleGameOptions(game) });
  }

  const shuffledGame = shuffled.gameId === game.id ? shuffled.game : game;

  // Reset only when the mounted hook is handed a different game; running on
  // mount as well would discard the snapshot restored above.
  const activeGameIdRef = useRef(game.id);

  useEffect(() => {
    if (activeGameIdRef.current === game.id) {
      return;
    }

    activeGameIdRef.current = game.id;
    dispatch({ type: "reset" });
    handledSubmissionRequestId.current = null;
  }, [game.id]);

  const questions = shuffledGame.questions;
  const localScore = useMemo(
    () => scoreAnswers(shuffledGame, state.answers),
    [shuffledGame, state.answers],
  );
  const score = getGameSessionScore(state.latestCompletion, localScore);
  const viewState = getGameSessionViewState(shuffledGame, state);
  const {
    allowRetake,
    canGoBack,
    canSubmit,
    currentQuestion,
    isComplete,
    isShowingAnswerReveal,
    isShowingQuestion,
    isStarted,
    isSubmittingCompletion,
    progressValue,
  } = viewState;

  useEffect(() => {
    if (state.phase !== "submitting_completion" || !state.completionRequestId) {
      return;
    }

    // We intentionally guard this side effect by request id so React re-renders
    // or local state changes cannot accidentally create duplicate completion
    // submissions for the same attempt.
    if (handledSubmissionRequestId.current === state.completionRequestId) {
      return;
    }

    const requestId = state.completionRequestId;
    handledSubmissionRequestId.current = requestId;

    const durationMs =
      state.startedAt === null ? 0 : Math.max(0, Date.now() - state.startedAt);
    let isCancelled = false;

    void submitGameCompletion({
      answers: state.answers,
      durationMs,
      eventId: game.id,
      requestId,
    })
      .then((completion) => {
        if (!isCancelled) {
          // The completed snapshot is written here, in the async completion
          // callback, rather than in the write-through effect below: the
          // write's success feeds `isCompletionPersisted`, and updating that
          // state synchronously inside an effect would cascade renders.
          setIsCompletionPersisted(
            writePersistedGameSnapshot(game.id, {
              answers: state.answers,
              completion,
              kind: "complete",
            }),
          );
          dispatch({ type: "completeCompletionSubmit", completion });
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          dispatch({
            type: "failCompletionSubmit",
            message:
              error instanceof Error
                ? error.message
                : "We couldn't finish your reward check-in right now.",
          });
        }
      });

    return () => {
      isCancelled = true;
      // Release the request-id guard for the handler this cleanup cancels.
      // Without this, StrictMode's dev-only mount→cleanup→mount cycle on a
      // restored submitting snapshot would strand the screen: the first
      // setup's response is cancelled and the second setup sees the id as
      // already handled. Re-submitting the same request id is safe — the
      // backend dedupes it into one completion. Covered by the e2e
      // StrictMode test, not jsdom: Vitest resolves the production React
      // build, which never double-invokes effects.
      if (handledSubmissionRequestId.current === requestId) {
        handledSubmissionRequestId.current = null;
      }
    };
  }, [
    game.id,
    state.answers,
    state.completionRequestId,
    state.phase,
    state.startedAt,
  ]);

  useEffect(() => {
    // Write-through persistence per phase. The completed snapshot is written
    // by the submission callback above (its success feeds
    // `isCompletionPersisted`); a completed snapshot restored from storage
    // needs no rewrite. A failed submission (`complete` without a result)
    // intentionally keeps the `submitting` snapshot, so a reload — like the
    // on-screen retry — replays the identical request id.
    if (state.phase === "intro") {
      clearPersistedGameSnapshot(game.id);
      return;
    }

    if (state.phase === "question" || state.phase === "answer_revealed") {
      writePersistedGameSnapshot(game.id, {
        answers: state.answers,
        // The fingerprint is shuffle-invariant, so the shuffled copy and the
        // source config produce the same value.
        contentFingerprint: computeContentFingerprint(shuffledGame),
        currentIndex: state.currentIndex,
        kind: "in_progress",
        optionOrder: extractOptionOrder(shuffledGame),
        startedAt: state.startedAt,
      });
      return;
    }

    if (state.phase === "submitting_completion" && state.completionRequestId) {
      // Written before the POST's outcome is known: a reload mid-submission
      // restores straight into this phase and resubmits the same request id,
      // which the completion RPC dedupes into the original attempt. The
      // duration is frozen here so a later restore replays the original
      // elapsed time.
      writePersistedGameSnapshot(game.id, {
        answers: state.answers,
        completionRequestId: state.completionRequestId,
        durationMs:
          state.startedAt === null
            ? 0
            : Math.max(0, Date.now() - state.startedAt),
        kind: "submitting",
      });
    }
  }, [game.id, shuffledGame, state]);

  const start = () => {
    dispatch({ type: "start", startedAt: Date.now() });
  };

  const reset = () => {
    setIsCompletionPersisted(false);
    dispatch({ type: "reset" });
  };

  const selectOption = (optionId: string) => {
    if (!currentQuestion) {
      return;
    }

    dispatch({
      type: "selectOption",
      optionId,
      selectionMode: currentQuestion.selectionMode,
    });
  };

  const submit = () => {
    if (!currentQuestion) {
      return;
    }

    const nextQuestion = questions[state.currentIndex + 1];
    const completionRequestId = createCompletionRequestId(
      state.currentIndex,
      questions.length,
    );

    if (game.feedbackMode === "final_score_reveal") {
      dispatch({
        type: "submitFinalScore",
        completionRequestId,
        nextQuestionId: nextQuestion?.id ?? null,
        question: currentQuestion,
        questionCount: questions.length,
      });
      return;
    }

    if (game.feedbackMode === "instant_feedback_non_blocking") {
      dispatch({
        type: "submitNonBlocking",
        question: currentQuestion,
      });
      return;
    }

    dispatch({
      type: "submitRequired",
      question: currentQuestion,
    });
  };

  const continueFromAnswerReveal = () => {
    const nextQuestion = questions[state.currentIndex + 1];
    const completionRequestId = createCompletionRequestId(
      state.currentIndex,
      questions.length,
    );

    dispatch({
      type: "goForwardAfterFeedback",
      completionRequestId,
      nextQuestionId: nextQuestion?.id ?? null,
      questionCount: questions.length,
    });
  };

  const goBack = () => {
    const previousQuestion = questions[state.currentIndex - 1];

    if (!previousQuestion) {
      return;
    }

    dispatch({
      type: "goBack",
      previousQuestionId: previousQuestion.id,
    });
  };

  const resetForRetake = () => {
    setIsCompletionPersisted(false);
    handledSubmissionRequestId.current = null;
    setShuffled({ gameId: game.id, game: shuffleGameOptions(game) });
    dispatch({
      type: "resetForRetake",
      startedAt: Date.now(),
    });
  };

  const retryCompletionSubmission = () => {
    // Retrying must reuse the same request id when we have one. That preserves
    // backend idempotency in the common case where the first submission may
    // have succeeded but the response was interrupted.
    const retryRequestId = state.completionRequestId ?? createRequestId();
    handledSubmissionRequestId.current = null;
    dispatch({
      type: "beginCompletionSubmit",
      completionRequestId: retryRequestId,
    });
  };

  return {
    answers: state.answers,
    allowRetake,
    canGoBack,
    canSubmit,
    completionError: state.completionError,
    currentIndex: state.currentIndex,
    currentQuestion,
    feedbackKind: state.feedbackKind,
    feedbackMessage: state.feedbackMessage,
    goBack,
    isComplete,
    isCompletionPersisted,
    isShowingAnswerReveal,
    isShowingQuestion,
    isStarted,
    isSubmittingCompletion,
    latestCompletion: state.latestCompletion,
    pendingSelection: state.pendingSelection,
    progressValue,
    reset,
    resetForRetake,
    retryCompletionSubmission,
    score,
    selectOption,
    start,
    submit,
    continueFromAnswerReveal,
  };
}
