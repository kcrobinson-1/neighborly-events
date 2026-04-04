import type { Question } from "../data/games";

export type Answers = Record<string, string[]>;

export function normalizeOptionIds(optionIds: string[]) {
  return [...new Set(optionIds)].sort();
}

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

export function answersMatch(selectedOptionIds: string[], correctAnswerIds: string[]) {
  const selected = normalizeOptionIds(selectedOptionIds);
  const correct = normalizeOptionIds(correctAnswerIds);

  if (selected.length !== correct.length) {
    return false;
  }

  return selected.every((optionId, index) => optionId === correct[index]);
}

export function getSelectionLabel(question: Question) {
  return question.selectionMode === "multiple"
    ? "Select all that apply."
    : "Choose one answer.";
}

export function getOptionLabels(question: Question, optionIds: string[]) {
  return question.options
    .filter((option) => optionIds.includes(option.id))
    .map((option) => option.label);
}

export function getQuestionFeedbackMessage(question: Question) {
  return (
    question.sponsorFact ??
    question.explanation ??
    `Correct. ${question.sponsor} is part of the neighborhood event experience.`
  );
}
