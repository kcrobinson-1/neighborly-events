import type { Question } from "../data/games";
import {
  answersMatch,
  normalizeOptionIds,
} from "../../../../shared/game-config";

export { answersMatch, normalizeOptionIds };

/** Updates the pending selection according to the question's selection mode. */
export function getNextSelection(
  currentSelection: string[],
  optionId: string,
  selectionMode: Question["selectionMode"],
) {
  if (selectionMode === "single") {
    return [optionId];
  }

  return currentSelection.includes(optionId)
    ? currentSelection.filter((selectedOptionId) => selectedOptionId !== optionId)
    : [...currentSelection, optionId];
}

const SMALL_COUNT_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];

/**
 * Builds the quiz page-head subtext (Madrona experience spec §4 quiz
 * wording). The question count comes from the published game config —
 * never hardcoded — and is spelled out for small counts ("Eight
 * questions.") with a numeral fallback for larger ones.
 */
export function getPageHeadSubtext(questionCount: number) {
  const countWord = SMALL_COUNT_WORDS[questionCount] ?? String(questionCount);
  const lead =
    questionCount === 1 ? "One question." : `${countWord} questions.`;

  return `${lead} Show your code at the booth when you're done to claim a reward.`;
}

/** Returns the helper copy shown above a question's answer choices. */
export function getSelectionLabel(question: Question) {
  return question.selectionMode === "multiple"
    ? "Select every answer that fits."
    : "Choose 1 answer.";
}

/** Resolves selected option ids back into display labels in the same order. */
export function getOptionLabels(question: Question, optionIds: string[]) {
  const optionsById = new Map(
    question.options.map((option) => [option.id, option.label]),
  );

  return optionIds.flatMap((optionId) => {
    const optionLabel = optionsById.get(optionId);
    return optionLabel ? [optionLabel] : [];
  });
}

/** Chooses the best explanation to show after a correct answer. */
export function getQuestionFeedbackMessage(question: Question) {
  return (
    question.sponsorFact ??
    question.explanation ??
    (question.sponsor
      ? `Correct. ${question.sponsor} is part of the neighborhood event experience.`
      : "Correct.")
  );
}

function joinCorrectAnswerLabels(labels: string[]) {
  if (labels.length === 0) {
    return "";
  }

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/** Builds the reveal copy shown after a wrong answer in non-blocking mode. */
export function getRevealedAnswerMessage(question: Question) {
  if (question.explanation) {
    return question.explanation;
  }

  const correctLabels = getOptionLabels(question, question.correctAnswerIds);
  const joined = joinCorrectAnswerLabels(correctLabels);

  if (!joined) {
    return "Here is the answer.";
  }

  return question.selectionMode === "multiple" && correctLabels.length > 1
    ? `The correct answers are ${joined}.`
    : `The correct answer is ${joined}.`;
}
