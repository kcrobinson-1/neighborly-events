import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockLoadDraftEventSummary,
  mockUseSelectedDraft,
} = vi.hoisted(() => ({
  mockLoadDraftEventSummary: vi.fn(),
  mockUseSelectedDraft: vi.fn(),
}));

vi.mock("../../../apps/web/src/lib/adminGameApi.ts", () => ({
  loadDraftEventSummary: mockLoadDraftEventSummary,
}));

vi.mock("../../../apps/web/src/admin/useSelectedDraft.ts", () => ({
  useSelectedDraft: mockUseSelectedDraft,
}));

import { useEventAdminWorkspace } from "../../../apps/web/src/admin/useEventAdminWorkspace.ts";
import type { AuthSessionState } from "../../../shared/auth";

const SIGNED_IN_SESSION = {
  email: "organizer@example.com",
  session: {
    access_token: "token",
    user: { id: "user-1" },
  },
  status: "signed_in",
} as unknown as AuthSessionState;

const SIGNED_OUT_SESSION: AuthSessionState = { status: "signed_out" };

const SUMMARY = {
  eventCode: "MMF",
  hasBeenPublished: true,
  id: "evt-1",
  isLive: true,
  lastPublishedVersionNumber: 1,
  name: "Madrona Music",
  slug: "madrona-music-2026",
  status: "live" as const,
  updatedAt: "2026-04-08T12:00:00.000Z",
};

describe("useEventAdminWorkspace", () => {
  beforeEach(() => {
    mockLoadDraftEventSummary.mockReset();
    mockUseSelectedDraft.mockReset();
    mockUseSelectedDraft.mockReturnValue({
      cancelUnpublish: vi.fn(),
      confirmUnpublish: vi.fn(),
      focusedQuestionId: null,
      hasDraftChanges: false,
      publishEvent: vi.fn(),
      publishState: { status: "idle" },
      questionSaveState: { message: null, status: "idle" },
      saveSelectedEventDetails: vi.fn(),
      saveSelectedQuestionContent: vi.fn(),
      selectedDraftState: { status: "idle" },
      setFocusedQuestionId: vi.fn(),
      startUnpublish: vi.fn(),
      unpublishState: { status: "idle" },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("seeds a single-draft dashboardState from the summary read", async () => {
    mockLoadDraftEventSummary.mockResolvedValue(SUMMARY);

    const { result } = renderHook(() =>
      useEventAdminWorkspace({
        eventId: "evt-1",
        sessionState: SIGNED_IN_SESSION,
      }),
    );

    await waitFor(() => {
      expect(result.current.seedState.status).toBe("ready");
    });
    if (result.current.seedState.status === "ready") {
      expect(result.current.seedState.summary).toEqual(SUMMARY);
    }
    expect(mockLoadDraftEventSummary).toHaveBeenCalledWith("evt-1");

    const lastCallArgs = mockUseSelectedDraft.mock.calls.at(-1)?.[0];
    expect(lastCallArgs).toBeDefined();
    expect(lastCallArgs.dashboardState).toEqual({
      drafts: [SUMMARY],
      email: "organizer@example.com",
      status: "ready",
    });
    expect(lastCallArgs.selectedEventId).toBe("evt-1");
  });

  it("transitions to missing when the seed read returns null", async () => {
    mockLoadDraftEventSummary.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useEventAdminWorkspace({
        eventId: "evt-1",
        sessionState: SIGNED_IN_SESSION,
      }),
    );

    await waitFor(() => {
      expect(result.current.seedState.status).toBe("missing");
    });
  });

  it("transitions to error and exposes reloadSeed when the seed read throws", async () => {
    mockLoadDraftEventSummary.mockRejectedValueOnce(new Error("Network down."));

    const { result } = renderHook(() =>
      useEventAdminWorkspace({
        eventId: "evt-1",
        sessionState: SIGNED_IN_SESSION,
      }),
    );

    await waitFor(() => {
      expect(result.current.seedState.status).toBe("error");
    });
    if (result.current.seedState.status === "error") {
      expect(result.current.seedState.message).toBe("Network down.");
    }

    mockLoadDraftEventSummary.mockResolvedValueOnce(SUMMARY);
    result.current.reloadSeed();

    await waitFor(() => {
      expect(result.current.seedState.status).toBe("ready");
    });
  });

  it("does not call loadDraftEventSummary when the session is not signed in", () => {
    renderHook(() =>
      useEventAdminWorkspace({
        eventId: "evt-1",
        sessionState: SIGNED_OUT_SESSION,
      }),
    );

    expect(mockLoadDraftEventSummary).not.toHaveBeenCalled();
  });

  it("forwards onUpdateDraftsList updates back into the seed summary", async () => {
    mockLoadDraftEventSummary.mockResolvedValue(SUMMARY);

    const { result } = renderHook(() =>
      useEventAdminWorkspace({
        eventId: "evt-1",
        sessionState: SIGNED_IN_SESSION,
      }),
    );

    await waitFor(() => {
      expect(result.current.seedState.status).toBe("ready");
    });

    const lastCallArgs = mockUseSelectedDraft.mock.calls.at(-1)?.[0];
    const onUpdateDraftsList = lastCallArgs.onUpdateDraftsList as (
      updater: (drafts: typeof SUMMARY[]) => typeof SUMMARY[],
    ) => void;

    onUpdateDraftsList((drafts) =>
      drafts.map((draft) => ({ ...draft, name: "Renamed Event" })),
    );

    await waitFor(() => {
      if (result.current.seedState.status === "ready") {
        expect(result.current.seedState.summary.name).toBe("Renamed Event");
      } else {
        throw new Error("expected seed state to remain ready");
      }
    });
  });
});
