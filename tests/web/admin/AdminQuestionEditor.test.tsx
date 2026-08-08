import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminQuestionEditor } from "../../../apps/web/src/admin/AdminQuestionEditor";
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
