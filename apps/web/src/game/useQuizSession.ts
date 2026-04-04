import { useEffect, useMemo, useReducer } from "react";
import type { GameConfig, Question } from "../data/games";
import {
  answersMatch,
  getQuestionFeedbackMessage,
  getNextSelection,
  normalizeOptionIds,
  type Answers,
} from "./quizUtils";

type QuizPhase = "intro" | "question" | "correct_feedback" | "complete";

type QuizState = {
  answers: Answers;
  currentIndex: number;
  feedbackKind: "correct" | "incorrect" | null;
  feedbackMessage: string | null;
  pendingSelection: string[];
  phase: QuizPhase;
};

type QuizAction =
  | { type: "continue"; questionCount: number }
  | { type: "reset" }
  | {
      type: "selectOption";
      optionId: string;
      selectionMode: Question["selectionMode"];
    }
  | { type: "start" }
  | { type: "submitFinalScore"; question: Question; questionCount: number }
  | { type: "submitRequired"; question: Question };

function createQuizState(phase: QuizPhase = "intro"): QuizState {
  return {
    answers: {},
    currentIndex: 0,
    feedbackKind: null,
    feedbackMessage: null,
    pendingSelection: [],
    phase,
  };
}

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "start":
      return createQuizState("question");
    case "reset":
      return createQuizState();
    case "selectOption":
      if (state.phase !== "question") {
        return state;
      }

      return {
        ...state,
        feedbackKind: null,
        feedbackMessage: null,
        pendingSelection: getNextSelection(
          state.pendingSelection,
          action.optionId,
          action.selectionMode,
        ),
      };
    case "submitFinalScore": {
      if (state.phase !== "question" || state.pendingSelection.length === 0) {
        return state;
      }

      const submittedSelection = normalizeOptionIds(state.pendingSelection);
      const nextIndex = state.currentIndex + 1;
      const isComplete = nextIndex >= action.questionCount;

      return {
        answers: {
          ...state.answers,
          [action.question.id]: submittedSelection,
        },
        currentIndex: nextIndex,
        feedbackKind: null,
        feedbackMessage: null,
        pendingSelection: [],
        phase: isComplete ? "complete" : "question",
      };
    }
    case "submitRequired": {
      if (state.phase !== "question" || state.pendingSelection.length === 0) {
        return state;
      }

      const submittedSelection = normalizeOptionIds(state.pendingSelection);

      if (!answersMatch(submittedSelection, action.question.correctAnswerIds)) {
        return {
          ...state,
          feedbackKind: "incorrect",
          feedbackMessage:
            action.question.explanation ??
            "Not quite. Adjust your selection and try again.",
        };
      }

      return {
        ...state,
        answers: {
          ...state.answers,
          [action.question.id]: submittedSelection,
        },
        feedbackKind: "correct",
        feedbackMessage: getQuestionFeedbackMessage(action.question),
        phase: "correct_feedback",
      };
    }
    case "continue": {
      if (state.phase !== "correct_feedback") {
        return state;
      }

      const nextIndex = state.currentIndex + 1;
      const isComplete = nextIndex >= action.questionCount;

      return {
        ...state,
        currentIndex: nextIndex,
        feedbackKind: null,
        feedbackMessage: null,
        pendingSelection: [],
        phase: isComplete ? "complete" : "question",
      };
    }
    default:
      return state;
  }
}

export function useQuizSession(game: GameConfig) {
  const [state, dispatch] = useReducer(quizReducer, undefined, () => createQuizState());

  useEffect(() => {
    dispatch({ type: "reset" });
  }, [game.id]);

  const questions = game.questions;
  const currentQuestion = questions[state.currentIndex];
  const isComplete = state.phase === "complete";
  const isStarted = state.phase !== "intro";
  const isShowingCorrectFeedback = state.phase === "correct_feedback";
  const isShowingQuestion = state.phase === "question";
  const canSubmit = state.pendingSelection.length > 0;

  const score = useMemo(
    () =>
      questions.reduce((total, question) => {
        return total + Number(answersMatch(state.answers[question.id] ?? [], question.correctAnswerIds));
      }, 0),
    [questions, state.answers],
  );

  const answerCount = Object.keys(state.answers).length.toString().padStart(2, "0");
  const completionCode = `MMP-${answerCount}${game.id.slice(-2).toUpperCase()}`;
  const progressValue =
    questions.length === 0
      ? 100
      : isComplete
        ? 100
        : ((state.currentIndex + 1) / questions.length) * 100;

  const start = () => {
    dispatch({ type: "start" });
  };

  const reset = () => {
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

    dispatch(
      game.feedbackMode === "final_score_reveal"
        ? {
            type: "submitFinalScore",
            question: currentQuestion,
            questionCount: questions.length,
          }
        : {
            type: "submitRequired",
            question: currentQuestion,
          },
    );
  };

  const continueFromCorrectFeedback = () => {
    dispatch({
      type: "continue",
      questionCount: questions.length,
    });
  };

  return {
    answers: state.answers,
    completionCode,
    currentIndex: state.currentIndex,
    currentQuestion,
    feedbackKind: state.feedbackKind,
    feedbackMessage: state.feedbackMessage,
    canSubmit,
    isComplete,
    isShowingCorrectFeedback,
    isShowingQuestion,
    isStarted,
    pendingSelection: state.pendingSelection,
    progressValue,
    score,
    continueFromCorrectFeedback,
    reset,
    selectOption,
    start,
    submit,
  };
}
