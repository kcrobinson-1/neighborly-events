import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrentQuestionPanel } from "../../../../apps/web/src/game/components/CurrentQuestionPanel.tsx";

function createQuestion(overrides = {}) {
  return {
    id: "q1",
    sponsor: "Sponsor One",
    prompt: "Question one?",
    selectionMode: "single" as const,
    correctAnswerIds: ["b"],
    options: [
      { id: "a", label: "Option A" },
      { id: "b", label: "Option B" },
    ],
    ...overrides,
  };
}

describe("CurrentQuestionPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the active question and wires answer selection and submit", () => {
    const onGoBack = vi.fn();
    const onOptionSelect = vi.fn();
    const onSubmit = vi.fn();

    render(
      <CurrentQuestionPanel
        canGoBack={true}
        canSubmit={true}
        currentIndex={0}
        feedbackKind="incorrect"
        feedbackMessage="Try the sponsor fact again."
        onGoBack={onGoBack}
        onOptionSelect={onOptionSelect}
        onSubmit={onSubmit}
        pendingSelection={["a"]}
        question={createQuestion()}
        questionCount={2}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Back to the previous question" }));
    fireEvent.click(screen.getByRole("radio", { name: "Option B" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(onGoBack).toHaveBeenCalledTimes(1);
    expect(onOptionSelect).toHaveBeenCalledWith("b");
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Try again.")).toBeTruthy();
    expect(screen.getByText("Try the sponsor fact again.")).toBeTruthy();
  });

  it("uses the multi-select submit label for multiple-answer questions", () => {
    render(
      <CurrentQuestionPanel
        canGoBack={false}
        canSubmit={false}
        currentIndex={1}
        feedbackKind={null}
        feedbackMessage={null}
        onGoBack={() => {}}
        onOptionSelect={() => {}}
        onSubmit={() => {}}
        pendingSelection={[]}
        question={createQuestion({
          selectionMode: "multiple",
          options: [
            { id: "a", label: "Option A" },
            { id: "b", label: "Option B" },
            { id: "c", label: "Option C" },
          ],
        })}
        questionCount={2}
      />,
    );

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: "Submit answers" }).disabled,
    ).toBe(true);
  });

  it("does not cite sources in the retry banner", () => {
    // The retry banner is the fourth surface that shows a question's
    // explanation, and the only one where the answer is not settled: the
    // player is still choosing. A citation there would be evidence attached
    // to an open question. Nothing is lost by withholding it — this mode
    // always reaches the correct-answer reveal, and the results review now
    // renders in every feedback mode. Asserted because it is exactly the kind
    // of thing a later change adds for symmetry.
    render(
      <CurrentQuestionPanel
        canGoBack={false}
        canSubmit={true}
        currentIndex={0}
        feedbackKind="incorrect"
        feedbackMessage="That one is not right yet."
        onGoBack={() => {}}
        onOptionSelect={() => {}}
        onSubmit={() => {}}
        pendingSelection={["a"]}
        question={createQuestion({
          sources: ["[Seattle Municipal Archives](https://example.org/record)"],
        })}
        questionCount={2}
      />,
    );

    expect(screen.getByText("That one is not right yet.")).toBeTruthy();
    expect(screen.queryByText("Sources")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
