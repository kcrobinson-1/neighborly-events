import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGameById } from "../../../shared/game-config/sample-fixtures.ts";

const {
  mockIsPrototypeFallbackEnabled,
  mockListRemotePublishedGameSummaries,
  mockLoadRemotePublishedGameBySlug,
} = vi.hoisted(() => ({
  mockIsPrototypeFallbackEnabled: vi.fn(),
  mockListRemotePublishedGameSummaries: vi.fn(),
  mockLoadRemotePublishedGameBySlug: vi.fn(),
}));

vi.mock("../../../apps/web/src/lib/supabaseBrowser.ts", () => ({
  isPrototypeFallbackEnabled: mockIsPrototypeFallbackEnabled,
}));

vi.mock("../../../shared/events", async () => {
  const actual = await vi.importActual<typeof import("../../../shared/events")>(
    "../../../shared/events",
  );

  return {
    ...actual,
    listPublishedGameSummaries: mockListRemotePublishedGameSummaries,
    loadPublishedGameBySlug: mockLoadRemotePublishedGameBySlug,
  };
});

import {
  listPublishedGameSummaries,
  loadPublishedGameBySlug,
} from "../../../apps/web/src/lib/gameContentApi.ts";

const sampleGame = getGameById("madrona-music-2026");

if (!sampleGame) {
  throw new Error("Expected the featured sample game to exist for event API tests.");
}

describe("apps/web gameContentApi binding", () => {
  beforeEach(() => {
    mockIsPrototypeFallbackEnabled.mockReset();
    mockListRemotePublishedGameSummaries.mockReset();
    mockLoadRemotePublishedGameBySlug.mockReset();
  });

  it("uses local fixtures when prototype fallback is enabled", async () => {
    mockIsPrototypeFallbackEnabled.mockReturnValue(true);

    await expect(loadPublishedGameBySlug(sampleGame.slug)).resolves.toEqual(sampleGame);
    await expect(listPublishedGameSummaries()).resolves.toContainEqual({
      feedbackMode: sampleGame.feedbackMode,
      id: sampleGame.id,
      name: sampleGame.name,
      slug: sampleGame.slug,
      summary: sampleGame.summary,
    });

    expect(mockLoadRemotePublishedGameBySlug).not.toHaveBeenCalled();
    expect(mockListRemotePublishedGameSummaries).not.toHaveBeenCalled();
  });

  it("delegates to shared events when prototype fallback is disabled", async () => {
    mockIsPrototypeFallbackEnabled.mockReturnValue(false);
    mockLoadRemotePublishedGameBySlug.mockResolvedValue(sampleGame);
    mockListRemotePublishedGameSummaries.mockResolvedValue([
      {
        feedbackMode: sampleGame.feedbackMode,
        id: sampleGame.id,
        name: sampleGame.name,
        slug: sampleGame.slug,
        summary: sampleGame.summary,
      },
    ]);

    await expect(loadPublishedGameBySlug(sampleGame.slug)).resolves.toEqual(sampleGame);
    await expect(listPublishedGameSummaries()).resolves.toEqual([
      {
        feedbackMode: sampleGame.feedbackMode,
        id: sampleGame.id,
        name: sampleGame.name,
        slug: sampleGame.slug,
        summary: sampleGame.summary,
      },
    ]);

    expect(mockLoadRemotePublishedGameBySlug).toHaveBeenCalledWith(sampleGame.slug);
    expect(mockListRemotePublishedGameSummaries).toHaveBeenCalledWith();
  });
});
