import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { QuestionNarrative } from "../../../../apps/web/src/game/components/QuestionNarrative.tsx";
import type { Question } from "../../../../apps/web/src/data/games.ts";

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

function getSourcesList() {
  return screen.getByRole("list", { name: "Sources" });
}

describe("QuestionNarrative", () => {
  afterEach(() => {
    cleanup();
  });

  describe("copy", () => {
    it("renders the copy it is handed rather than the question's explanation", () => {
      // The reveal panels hand over a message the reducer resolved, which can
      // be a sponsor fact or a bare fallback. A renderer that read
      // `question.explanation` instead would show the wrong text on the very
      // surfaces this component exists for.
      render(
        <QuestionNarrative
          copy="Correct."
          question={createQuestion({ explanation: "The long explanation." })}
        />,
      );

      expect(screen.getByText("Correct.")).toBeTruthy();
      expect(screen.queryByText("The long explanation.")).toBeNull();
    });

    it("splits the copy into paragraphs on blank lines", () => {
      const { container } = render(
        <QuestionNarrative
          copy={"First paragraph.\n\nSecond paragraph."}
          question={createQuestion()}
        />,
      );

      const paragraphs = container.querySelectorAll(".question-narrative > p");
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0].textContent).toBe("First paragraph.");
      expect(paragraphs[1].textContent).toBe("Second paragraph.");
    });

    it("renders nothing at all when there is neither copy nor a source", () => {
      const { container } = render(
        <QuestionNarrative copy={null} question={createQuestion()} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders the sources when there is no copy to sit above them", () => {
      render(
        <QuestionNarrative
          copy={null}
          question={createQuestion({
            sources: ["[Only source](https://example.org)"],
          })}
        />,
      );

      expect(getSourcesList()).toBeTruthy();
    });
  });

  describe("sources", () => {
    it("renders each source as a list entry under a visible label", () => {
      render(
        <QuestionNarrative
          copy="Explanation."
          question={createQuestion({
            sources: [
              "[First source](https://example.org/one)",
              "[Second source](https://example.org/two)",
            ],
          })}
        />,
      );

      // The label is visible text, and it names the list programmatically —
      // `getByRole("list", { name })` only resolves if both are true.
      expect(screen.getByText("Sources")).toBeTruthy();
      expect(within(getSourcesList()).getAllByRole("listitem")).toHaveLength(2);
    });

    it("renders a source link as its title, never as a bare address", () => {
      render(
        <QuestionNarrative
          copy="Explanation."
          question={createQuestion({
            sources: ["[Seattle Municipal Archives](https://example.org/record)"],
          })}
        />,
      );

      const link = screen.getByRole("link", { name: "Seattle Municipal Archives" });
      expect(link.getAttribute("href")).toBe("https://example.org/record");
      expect(getSourcesList().textContent).not.toContain("https://");
    });

    it("opens source links in a new context with opener protections", () => {
      render(
        <QuestionNarrative
          copy="Explanation."
          question={createQuestion({
            sources: ["[A source](https://example.org/record)"],
          })}
        />,
      );

      const link = screen.getByRole("link", { name: "A source" });
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    });

    it("marks a PDF target inside the link name, so it is known before the tap", () => {
      render(
        <QuestionNarrative
          copy="Explanation."
          question={createQuestion({
            sources: [
              "[Landmark report](https://example.org/report.pdf)",
              "[Web page](https://example.org/page)",
            ],
          })}
        />,
      );

      // Accessible name, not a sibling element: a reader deciding whether to
      // follow the link has to learn it is a PDF from the link itself.
      expect(screen.getByRole("link", { name: "Landmark report PDF" })).toBeTruthy();
      expect(screen.getByRole("link", { name: "Web page" })).toBeTruthy();
    });

    it("renders emphasis inside a source line", () => {
      const { container } = render(
        <QuestionNarrative
          copy="Explanation."
          question={createQuestion({
            sources: ["*Seattle Times*, March 1974"],
          })}
        />,
      );

      const emphasis = container.querySelector(".question-sources-list em");
      expect(emphasis?.textContent).toBe("Seattle Times");
    });

    it("degrades an unsupported link target to its label text", () => {
      // The renderer is the second line of defence — draft validation refuses
      // these at authoring time. Content that predates the rule still must not
      // produce an anchor to a non-web target.
      render(
        <QuestionNarrative
          copy="Explanation."
          question={createQuestion({
            sources: ["[Not a web link](javascript:alert(1))"],
          })}
        />,
      );

      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("Not a web link", { exact: false })).toBeTruthy();
    });

    it("keeps the label and list out of the DOM when the question has no sources", () => {
      render(<QuestionNarrative copy="Explanation." question={createQuestion()} />);

      expect(screen.queryByText("Sources")).toBeNull();
      expect(screen.queryByRole("list")).toBeNull();
    });

    it("gives each rendered instance its own label association", () => {
      // Every question on the results screen renders one of these. Two lists
      // sharing a label id would make one of them point at the other's label.
      render(
        <>
          <QuestionNarrative
            copy="One."
            question={createQuestion({
              id: "q1",
              sources: ["[First](https://example.org/one)"],
            })}
          />
          <QuestionNarrative
            copy="Two."
            question={createQuestion({
              id: "q2",
              sources: ["[Second](https://example.org/two)"],
            })}
          />
        </>,
      );

      const [firstList, secondList] = screen.getAllByRole("list", {
        name: "Sources",
      });
      expect(firstList.getAttribute("aria-labelledby")).not.toBe(
        secondList.getAttribute("aria-labelledby"),
      );
      expect(within(firstList).getByRole("link", { name: "First" })).toBeTruthy();
      expect(within(secondList).getByRole("link", { name: "Second" })).toBeTruthy();
    });
  });
});
