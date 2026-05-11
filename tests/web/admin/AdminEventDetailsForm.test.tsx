import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminEventDetailsForm } from "../../../apps/web/src/admin/AdminEventDetailsForm";
import { getGameById } from "../../../shared/game-config/sample-fixtures";
import type { DraftEventDetail } from "../../../apps/web/src/lib/adminGameApi";

const sampleGame = getGameById("madrona-music-2026");

if (!sampleGame) {
  throw new Error("Expected the Madrona sample game to exist.");
}

function makeDraft(overrides: Partial<DraftEventDetail> = {}): DraftEventDetail {
  return {
    content: sampleGame,
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
    ...overrides,
  };
}

function renderForm(draft: DraftEventDetail) {
  return render(
    <AdminEventDetailsForm
      disabled={false}
      draft={draft}
      isSaving={false}
      message={null}
      messageKind="info"
      onSave={async () => null}
    />,
  );
}

describe("AdminEventDetailsForm event_code lock", () => {
  afterEach(() => {
    cleanup();
  });

  it("enables the event_code input when the event is not currently live", () => {
    renderForm(
      makeDraft({
        hasBeenPublished: true,
        isLive: false,
        lastPublishedVersionNumber: 1,
        status: "draft_only",
      }),
    );

    const input = screen.getByLabelText("Event code") as HTMLInputElement;
    expect(input.disabled).toBe(false);
  });

  it("disables the event_code input when the event is currently live", () => {
    renderForm(
      makeDraft({
        hasBeenPublished: true,
        isLive: true,
        lastPublishedVersionNumber: 1,
        status: "live",
      }),
    );

    const input = screen.getByLabelText("Event code") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("does not render a Regenerate button", () => {
    renderForm(makeDraft());

    expect(screen.queryByRole("button", { name: /regenerate/i })).toBeNull();
  });

  it("keeps the slug input locked once the event has been published, regardless of live state", () => {
    renderForm(
      makeDraft({
        hasBeenPublished: true,
        isLive: false,
        lastPublishedVersionNumber: 1,
        status: "draft_only",
      }),
    );

    const slugInput = screen.getByLabelText("Slug") as HTMLInputElement;
    expect(slugInput.disabled).toBe(true);
  });
});
