import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetSharedEventsForTests,
} from "../../../shared/events/configure.ts";
import {
  configureSharedEvents,
  listPublishedGameSummaries,
  loadPublishedGameBySlug,
} from "../../../shared/events";
import { getGameById } from "../../../shared/game-config/sample-fixtures.ts";

const sampleGame = getGameById("madrona-music-2026");

if (!sampleGame) {
  throw new Error("Expected the featured sample game to exist for event API tests.");
}

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function createEventRow(overrides: Record<string, unknown> = {}) {
  return {
    allow_back_navigation: sampleGame.allowBackNavigation,
    allow_retake: sampleGame.allowRetake,
    entitlement_label: sampleGame.entitlementLabel,
    estimated_minutes: sampleGame.estimatedMinutes,
    feedback_mode: sampleGame.feedbackMode,
    id: sampleGame.id,
    intro: sampleGame.intro,
    location: sampleGame.location,
    name: sampleGame.name,
    slug: sampleGame.slug,
    summary: sampleGame.summary,
    ...overrides,
  };
}

function createQuestionRows() {
  return sampleGame.questions.map((question, index) => ({
    display_order: index + 1,
    event_id: sampleGame.id,
    explanation: question.explanation ?? null,
    id: question.id,
    prompt: question.prompt,
    selection_mode: question.selectionMode,
    sponsor: question.sponsor,
    sponsor_fact: question.sponsorFact ?? null,
  }));
}

function createOptionRows() {
  return sampleGame.questions.flatMap((question) =>
    question.options.map((option, index) => ({
      display_order: index + 1,
      event_id: sampleGame.id,
      id: option.id,
      is_correct: question.correctAnswerIds.includes(option.id),
      label: option.label,
      question_id: question.id,
    })),
  );
}

describe("shared/events published API", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    configureSharedEvents({
      getClient: () => {
        throw new Error("Published API tests should not read the Supabase client.");
      },
      getConfig: () => ({
        enabled: true,
        supabaseClientKey: "publishable-key",
        supabaseUrl: "https://example.supabase.co",
      }),
      getFeaturedGameSlug: () => sampleGame.slug,
      getMissingConfigMessage: () => "Missing Supabase config.",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    _resetSharedEventsForTests();
  });

  it("lists published summaries with the featured slug sorted first", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse([
        {
          feedback_mode: "immediate",
          id: "later-event",
          name: "A Later Event",
          slug: "later-event",
          summary: "Later summary",
        },
        {
          feedback_mode: sampleGame.feedbackMode,
          id: sampleGame.id,
          name: sampleGame.name,
          slug: sampleGame.slug,
          summary: sampleGame.summary,
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPublishedGameSummaries()).resolves.toEqual([
      {
        feedbackMode: sampleGame.feedbackMode,
        id: sampleGame.id,
        name: sampleGame.name,
        slug: sampleGame.slug,
        summary: sampleGame.summary,
      },
      {
        feedbackMode: "immediate",
        id: "later-event",
        name: "A Later Event",
        slug: "later-event",
        summary: "Later summary",
      },
    ]);

    const [url, options] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://example.supabase.co/rest/v1/game_events?published_at=not.is.null&select=id%2Cslug%2Cname%2Csummary%2Cfeedback_mode",
    );
    expect(options?.headers).toEqual({
      apikey: "publishable-key",
      Authorization: "Bearer publishable-key",
    });
  });

  it("loads published game content by slug from event, question, and option rows", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse([createEventRow()]))
      .mockResolvedValueOnce(createJsonResponse(createQuestionRows()))
      .mockResolvedValueOnce(createJsonResponse(createOptionRows()));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublishedGameBySlug(sampleGame.slug)).resolves.toEqual(sampleGame);

    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual([
      `https://example.supabase.co/rest/v1/game_events?published_at=not.is.null&select=id%2Cslug%2Cname%2Clocation%2Cestimated_minutes%2Centitlement_label%2Cintro%2Csummary%2Cfeedback_mode%2Callow_back_navigation%2Callow_retake&slug=eq.${sampleGame.slug}`,
      "https://example.supabase.co/rest/v1/game_questions?event_id=eq.madrona-music-2026&order=display_order.asc&select=event_id%2Cid%2Cdisplay_order%2Csponsor%2Cprompt%2Cselection_mode%2Cexplanation%2Csponsor_fact",
      "https://example.supabase.co/rest/v1/game_question_options?event_id=eq.madrona-music-2026&order=question_id.asc%2Cdisplay_order.asc&select=event_id%2Cquestion_id%2Cid%2Cdisplay_order%2Clabel%2Cis_correct",
    ]);
  });

  it("returns null when no published event row matches the slug", async () => {
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPublishedGameBySlug("missing")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("surfaces missing config and remote error messages", async () => {
    configureSharedEvents({
      getClient: () => {
        throw new Error("Published API tests should not read the Supabase client.");
      },
      getConfig: () => ({
        enabled: false,
        supabaseClientKey: "",
        supabaseUrl: "",
      }),
      getFeaturedGameSlug: () => sampleGame.slug,
      getMissingConfigMessage: () => "Missing Supabase config.",
    });

    await expect(listPublishedGameSummaries()).rejects.toThrow(
      "Missing Supabase config.",
    );

    configureSharedEvents({
      getClient: () => {
        throw new Error("Published API tests should not read the Supabase client.");
      },
      getConfig: () => ({
        enabled: true,
        supabaseClientKey: "publishable-key",
        supabaseUrl: "https://example.supabase.co",
      }),
      getFeaturedGameSlug: () => sampleGame.slug,
      getMissingConfigMessage: () => "Missing Supabase config.",
    });
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({ message: "PostgREST failed." }, 500),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPublishedGameSummaries()).rejects.toThrow(
      "PostgREST failed.",
    );
  });
});
