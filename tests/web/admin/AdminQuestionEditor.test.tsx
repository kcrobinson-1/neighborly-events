import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminQuestionEditor } from "../../../apps/web/src/admin/AdminQuestionEditor";
import { prepareQuestionContentForSave } from "../../../apps/web/src/admin/questionFormMapping";
import { getGameById } from "../../../shared/game-config/sample-fixtures";
import type { DraftEventDetail } from "../../../apps/web/src/lib/adminGameApi";

const sampleGame = getGameById("madrona-music-2026");

if (!sampleGame) {
  throw new Error("Expected the Madrona sample game to exist.");
}

const focusedQuestionId = sampleGame.questions[0].id;

function makeDraft(sources?: string[]): DraftEventDetail {
  return {
    content: {
      ...sampleGame,
      questions: [
        {
          ...sampleGame.questions[0],
          ...(sources ? { sources } : {}),
        },
        ...sampleGame.questions.slice(1),
      ],
    },
    createdAt: "2026-05-01T00:00:00.000Z",
    eventCode: "MAD",
    hasBeenPublished: false,
    id: "madrona-test-draft",
    isLive: false,
    lastPublishedVersionNumber: null,
    lastSavedBy: null,
    name: sampleGame.name,
    slug: sampleGame.slug,
    status: "draft_only",
    updatedAt: "2026-05-01T00:00:00.000Z",
  };
}

function renderEditor(draft: DraftEventDetail, onSave = vi.fn(async () => null)) {
  render(
    <AdminQuestionEditor
      disabled={false}
      draft={draft}
      focusedQuestionId={focusedQuestionId}
      isSaving={false}
      message={null}
      messageKind="info"
      onFocusQuestion={() => {}}
      onSave={onSave}
    />,
  );

  return { onSave };
}

function getSourcesField() {
  return screen.getByLabelText("Sources") as HTMLTextAreaElement;
}

/**
 * These render the real editor rather than the mapping helpers on purpose.
 * `npm run test:e2e:admin` needs a Docker runtime this machine does not have
 * and is in no workflow, so nothing else exercises the path from the textarea
 * through the change handler into draft content. A field that renders but is
 * never wired to `onUpdateTextValue` passes every mapping-level test in
 * `questionBuilder.test.ts` and reaches production doing nothing.
 */
describe("AdminQuestionEditor source authoring", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the focused question's stored source lines, one per line", () => {
    renderEditor(
      makeDraft(["[First](https://example.org/one)", "[Second](https://example.org/two)"]),
    );

    expect(getSourcesField().value).toBe(
      "[First](https://example.org/one)\n[Second](https://example.org/two)",
    );
  });

  it("carries a typed edit into draft content and out through save", async () => {
    const { onSave } = renderEditor(makeDraft());

    fireEvent.change(getSourcesField(), {
      target: { value: "[Seattle Municipal Archives](https://example.org/record)" },
    });

    // The field re-reads its value from draft content, so an edit that never
    // reached the handler would show the old value back.
    expect(getSourcesField().value).toBe(
      "[Seattle Municipal Archives](https://example.org/record)",
    );
    expect(screen.getByText("Unsaved question changes.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Save question changes" }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [savedContent, savedQuestionId] = onSave.mock.calls[0];
    expect(savedQuestionId).toBe(focusedQuestionId);
    expect(savedContent.questions[0].sources).toEqual([
      "[Seattle Municipal Archives](https://example.org/record)",
    ]);
  });

  /**
   * Typed one character at a time, reading the field back between keystrokes.
   * The distinction matters: the textarea is controlled from draft content, so
   * a normalizing round trip is invisible to a test that sets a complete value
   * in one `change` — which is how the original coverage here missed that
   * trimming on every keystroke made the field impossible to type in.
   */
  function type(field: HTMLTextAreaElement, text: string) {
    for (const character of text) {
      fireEvent.change(field, { target: { value: field.value + character } });
    }
  }

  it("keeps the spaces between words while a title is being typed", () => {
    renderEditor(makeDraft());
    const field = getSourcesField();

    type(field, "Seattle Times");

    expect(field.value).toBe("Seattle Times");
  });

  it("keeps a newline so a second source can be started", () => {
    renderEditor(makeDraft());
    const field = getSourcesField();

    type(field, "First\nSecond");

    expect(field.value).toBe("First\nSecond");
  });

  it("hands the working text over verbatim and normalizes it downstream", () => {
    // Trailing whitespace and blank lines are legitimate mid-edit state — the
    // organizer's cursor position, not content. They survive in the field and
    // in what the editor hands to `onSave`; `prepareQuestionContentForSave`,
    // which `useSelectedDraft` applies to that payload before persisting, is
    // where they are dropped. Composed here rather than assumed, so the pair
    // is covered end to end even though the editor is not the normalizer.
    const working =
      "  [One](https://example.org/one)  \n\n\n[Two](https://example.org/two)\n";
    const { onSave } = renderEditor(makeDraft());
    const field = getSourcesField();

    fireEvent.change(field, { target: { value: working } });
    expect(field.value).toBe(working);

    fireEvent.click(screen.getByRole("button", { name: "Save question changes" }));

    const handedOver = onSave.mock.calls[0][0];
    expect(handedOver.questions[0].sources).toEqual([
      "  [One](https://example.org/one)  ",
      "",
      "",
      "[Two](https://example.org/two)",
      "",
    ]);
    expect(
      prepareQuestionContentForSave(handedOver).questions[0].sources,
    ).toEqual([
      "[One](https://example.org/one)",
      "[Two](https://example.org/two)",
    ]);
  });

  it("does not invent a sources field when another field is edited", () => {
    // A question with no sources must stay that way through an unrelated edit,
    // or the empty textarea writes `[""]` into content and the dirty check
    // reports a change the organizer never made.
    const { onSave } = renderEditor(makeDraft());

    fireEvent.change(screen.getByLabelText("Sponsor fact"), {
      target: { value: "A new sponsor fact." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save question changes" }));

    expect("sources" in onSave.mock.calls[0][0].questions[0]).toBe(false);
  });

  it("clears the field back to no sources at all", () => {
    const { onSave } = renderEditor(makeDraft(["[First](https://example.org/one)"]));

    fireEvent.change(getSourcesField(), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save question changes" }));

    expect("sources" in onSave.mock.calls[0][0].questions[0]).toBe(false);
  });

  it("leaves other questions' source lines untouched by an edit", () => {
    const draft = makeDraft(["[First](https://example.org/one)"]);
    const draftWithSecond: DraftEventDetail = {
      ...draft,
      content: {
        ...draft.content,
        questions: [
          draft.content.questions[0],
          {
            ...draft.content.questions[1],
            sources: ["[Other question's source](https://example.org/other)"],
          },
          ...draft.content.questions.slice(2),
        ],
      },
    };
    const { onSave } = renderEditor(draftWithSecond);

    fireEvent.change(getSourcesField(), {
      target: { value: "[Replaced](https://example.org/replaced)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save question changes" }));

    expect(onSave.mock.calls[0][0].questions[1].sources).toEqual([
      "[Other question's source](https://example.org/other)",
    ]);
  });

  it("describes the source grammar on the field itself", () => {
    renderEditor(makeDraft());

    const describedBy = getSourcesField().getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)?.textContent).toContain(
      "One source per line",
    );
  });
});
