import { describe, expect, it } from "vitest";
import {
  getNextSelection,
  getOptionLabels,
  getPageHeadSubtext,
  getQuestionFeedbackMessage,
  getRevealedAnswerMessage,
  getSelectionLabel,
} from "../../../apps/web/src/game/gameUtils.ts";

const singleSelectQuestion = {
  id: "q1",
  sponsor: "Sponsor One",
  prompt: "Question one?",
  selectionMode: "single" as const,
  correctAnswerIds: ["b"],
  options: [
    { id: "a", label: "Option A" },
    { id: "b", label: "Option B" },
  ],
};

const multiSelectQuestion = {
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
};

describe("gameUtils", () => {
  it("updates pending selection differently for single and multiple questions", () => {
    expect(getNextSelection(["a"], "b", "single")).toEqual(["b"]);
    expect(getNextSelection([], "a", "multiple")).toEqual(["a"]);
    expect(getNextSelection(["a"], "c", "multiple")).toEqual(["a", "c"]);
    expect(getNextSelection(["a", "c"], "a", "multiple")).toEqual(["c"]);
  });

  it("returns the expected selection hint copy for each question mode", () => {
    expect(getSelectionLabel(singleSelectQuestion)).toBe("Choose 1 answer.");
    expect(getSelectionLabel(multiSelectQuestion)).toBe(
      "Select every answer that fits.",
    );
  });

  it("maps stored option ids back to labels in the original id order", () => {
    expect(getOptionLabels(multiSelectQuestion, ["c", "a", "missing"])).toEqual([
      "Option C",
      "Option A",
    ]);
  });

  it("prefers sponsor fact, then explanation, then sponsor fallback for feedback copy", () => {
    expect(
      getQuestionFeedbackMessage({
        ...singleSelectQuestion,
        sponsorFact: "Sponsor fact first.",
        explanation: "Explanation second.",
      }),
    ).toBe("Sponsor fact first.");

    expect(
      getQuestionFeedbackMessage({
        ...singleSelectQuestion,
        explanation: "Explanation second.",
      }),
    ).toBe("Explanation second.");

    expect(getQuestionFeedbackMessage(singleSelectQuestion)).toBe(
      "Correct. Sponsor One is part of the neighborhood event experience.",
    );
  });

  it("returns generic fallback copy when sponsor is null and no fact or explanation", () => {
    expect(
      getQuestionFeedbackMessage({ ...singleSelectQuestion, sponsor: null }),
    ).toBe("Correct.");
  });

  it("prefers the question explanation for the revealed-answer message", () => {
    expect(
      getRevealedAnswerMessage({
        ...singleSelectQuestion,
        explanation: "Explanation only.",
      }),
    ).toBe("Explanation only.");
  });

  it("never routes a sponsor fact into the revealed-answer message", () => {
    expect(
      getRevealedAnswerMessage({
        ...singleSelectQuestion,
        sponsorFact: "Sponsor brag that does not belong on a wrong answer.",
      }),
    ).toBe("The correct answer is Option B.");
  });

  it("falls back to a labelled correct-answer copy when no explanation is set", () => {
    expect(getRevealedAnswerMessage(singleSelectQuestion)).toBe(
      "The correct answer is Option B.",
    );
  });

  it("renders the full correct option set for multi-select questions in the fallback copy", () => {
    expect(getRevealedAnswerMessage(multiSelectQuestion)).toBe(
      "The correct answers are Option A and Option C.",
    );
  });

  const rewardLine =
    "Show your code at the booth when you're done to claim a reward.";

  it("spells out the question count in the page-head subtext", () => {
    expect(getPageHeadSubtext(8, rewardLine)).toBe(
      "Eight questions. Show your code at the booth when you're done to claim a reward.",
    );
  });

  it("uses singular page-head copy for a one-question game", () => {
    expect(getPageHeadSubtext(1, rewardLine)).toBe(
      "One question. Show your code at the booth when you're done to claim a reward.",
    );
  });

  it("falls back to a numeral for counts beyond the spelled-out range", () => {
    expect(getPageHeadSubtext(13, rewardLine)).toBe(
      "13 questions. Show your code at the booth when you're done to claim a reward.",
    );
  });
});
