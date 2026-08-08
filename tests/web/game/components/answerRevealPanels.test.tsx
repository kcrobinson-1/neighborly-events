import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AnswerRevealPanel } from "../../../../apps/web/src/game/components/AnswerRevealPanel.tsx";
import { CorrectAnswerPanel } from "../../../../apps/web/src/game/components/CorrectAnswerPanel.tsx";
import type { Question } from "../../../../apps/web/src/data/games.ts";

/**
 * The two panels that present an answer as settled during play. They differ
 * in chrome — chip, heading, the correct-answer line — and agree on the one
 * thing asserted here: the narrative under the answer comes from
 * `QuestionNarrative`, so a question's sources reach both.
 */
const REVEAL_PANELS = [
  { Panel: AnswerRevealPanel, name: "AnswerRevealPanel" },
  { Panel: CorrectAnswerPanel, name: "CorrectAnswerPanel" },
];

function createQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: "q1",
    sponsor: null,
    prompt: "Question one?",
    selectionMode: "single",
    correctAnswerIds: ["b"],
    options: [
      { id: "a", label: "Option A" },
      { id: "b", label: "Option B" },
    ],
    ...overrides,
  };
}

describe.each(REVEAL_PANELS)("$name", ({ Panel }) => {
  afterEach(() => {
    cleanup();
  });

  it("renders the question's sources beneath the reveal copy", () => {
    render(
      <Panel
        feedbackMessage="The sculpture was installed in 1974."
        isLastQuestion={false}
        onContinue={() => {}}
        question={createQuestion({
          sources: ["[Seattle Municipal Archives](https://example.org/record)"],
        })}
      />,
    );

    const list = screen.getByRole("list", { name: "Sources" });
    expect(list).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Seattle Municipal Archives" }),
    ).toBeTruthy();

    // Beneath the copy, not above it.
    const copy = screen.getByText("The sculpture was installed in 1974.");
    expect(
      copy.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the reveal copy unchanged when the question has no sources", () => {
    render(
      <Panel
        feedbackMessage="The sculpture was installed in 1974."
        isLastQuestion={false}
        onContinue={() => {}}
        question={createQuestion()}
      />,
    );

    expect(screen.getByText("The sculpture was installed in 1974.")).toBeTruthy();
    expect(screen.queryByText("Sources")).toBeNull();
  });

  it("shows the copy it is given rather than the question's explanation", () => {
    // `feedbackMessage` is resolved upstream in `gameUtils` and is not always
    // the explanation — on a correct answer with no explanation it is a bare
    // "Correct." Neither panel may reach past it into the question.
    render(
      <Panel
        feedbackMessage="Correct."
        isLastQuestion={true}
        onContinue={() => {}}
        question={createQuestion({ explanation: "A different explanation." })}
      />,
    );

    expect(screen.getByText("Correct.")).toBeTruthy();
    expect(screen.queryByText("A different explanation.")).toBeNull();
  });
});
