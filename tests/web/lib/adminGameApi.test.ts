import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGameById } from "../../../shared/game-config/sample-fixtures.ts";

const {
  mockCreateSupabaseAuthHeaders,
  mockGetBrowserSupabaseClient,
  mockGetSupabaseConfig,
  mockReadSupabaseErrorMessage,
} = vi.hoisted(() => ({
  mockCreateSupabaseAuthHeaders: vi.fn(),
  mockGetBrowserSupabaseClient: vi.fn(),
  mockGetSupabaseConfig: vi.fn(),
  mockReadSupabaseErrorMessage: vi.fn(),
}));

vi.mock("../../../apps/web/src/lib/supabaseBrowser.ts", () => ({
  createSupabaseAuthHeaders: mockCreateSupabaseAuthHeaders,
  getBrowserSupabaseClient: mockGetBrowserSupabaseClient,
  getSupabaseConfig: mockGetSupabaseConfig,
  readSupabaseErrorMessage: mockReadSupabaseErrorMessage,
}));

import {
  listDraftEventSummaries,
  loadDraftEvent,
  loadDraftEventStatus,
  publishDraftEvent,
  saveDraftEvent,
  unpublishEvent,
} from "../../../apps/web/src/lib/adminGameApi.ts";

const sampleDraft = getGameById("madrona-music-2026");

if (!sampleDraft) {
  throw new Error("Expected the featured sample game to exist for admin API tests.");
}

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
    status,
  });
}

function createSupabaseClientMock(
  options: {
    draftContentRow?: unknown;
    session?: { access_token: string } | null;
    statusMaybeSingleError?: { message: string } | null;
    statusRow?: unknown;
    statusRows?: unknown[];
  } = {},
) {
  const session = Object.hasOwn(options, "session")
    ? options.session
    : { access_token: "admin-token" };
  const statusMaybeSingle = vi.fn().mockResolvedValue({
    data: options.statusRow ?? null,
    error: options.statusMaybeSingleError ?? null,
  });
  const statusEq = vi.fn(() => ({
    maybeSingle: statusMaybeSingle,
  }));
  const statusOrder = vi.fn().mockResolvedValue({
    data: options.statusRows ?? [],
    error: null,
  });
  const statusSelect = vi.fn(() => ({
    eq: statusEq,
    order: statusOrder,
    maybeSingle: statusMaybeSingle,
  }));
  const draftMaybeSingle = vi.fn().mockResolvedValue({
    data: options.draftContentRow ?? null,
    error: null,
  });
  const draftEq = vi.fn(() => ({
    maybeSingle: draftMaybeSingle,
  }));
  const draftSelect = vi.fn(() => ({
    eq: draftEq,
    maybeSingle: draftMaybeSingle,
  }));
  const from = vi.fn((table: string) => ({
    select:
      table === "game_event_admin_status"
        ? statusSelect
        : draftSelect,
  }));
  const getSession = vi.fn().mockResolvedValue({
    data: {
      session,
    },
    error: null,
  });

  return {
    auth: {
      getSession,
    },
    draftEq,
    draftMaybeSingle,
    draftSelect,
    from,
    statusEq,
    statusMaybeSingle,
    statusOrder,
    statusSelect,
  };
}

function createStatusRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    draft_updated_at: "2026-04-08T12:00:00.000Z",
    event_code: "MMF",
    event_id: sampleDraft.id,
    is_live: true,
    last_published_version_number: 1,
    name: sampleDraft.name,
    slug: sampleDraft.slug,
    status: "live",
    ...overrides,
  };
}

describe("adminGameApi", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    mockCreateSupabaseAuthHeaders.mockReset();
    mockGetBrowserSupabaseClient.mockReset();
    mockGetSupabaseConfig.mockReset();
    mockReadSupabaseErrorMessage.mockReset();

    mockGetSupabaseConfig.mockReturnValue({
      enabled: true,
      supabaseClientKey: "publishable-key",
      supabaseUrl: "https://example.supabase.co",
    });
    mockCreateSupabaseAuthHeaders.mockReturnValue({
      apikey: "publishable-key",
      Authorization: "Bearer publishable-key",
    });
    mockReadSupabaseErrorMessage.mockResolvedValue("Function failed.");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads and parses one live draft event through the authenticated Supabase client", async () => {
    const client = createSupabaseClientMock({
      draftContentRow: {
        content: sampleDraft,
        created_at: "2026-04-07T12:00:00.000Z",
        id: sampleDraft.id,
        last_saved_by: "22222222-2222-4222-8222-222222222222",
      },
      statusRow: createStatusRow(),
    });
    mockGetBrowserSupabaseClient.mockReturnValue(client);

    await expect(loadDraftEvent(sampleDraft.id)).resolves.toEqual({
      content: sampleDraft,
      createdAt: "2026-04-07T12:00:00.000Z",
      eventCode: "MMF",
      hasBeenPublished: true,
      id: sampleDraft.id,
      isLive: true,
      lastSavedBy: "22222222-2222-4222-8222-222222222222",
      lastPublishedVersionNumber: 1,
      name: sampleDraft.name,
      slug: sampleDraft.slug,
      status: "live",
      updatedAt: "2026-04-08T12:00:00.000Z",
    });

    expect(client.from).toHaveBeenCalledWith("game_event_admin_status");
    expect(client.from).toHaveBeenCalledWith("game_event_drafts");
  });

  it("lists draft summaries from the admin status view", async () => {
    const client = createSupabaseClientMock({
      statusRows: [
        createStatusRow({
          draft_updated_at: "2026-04-11T12:00:00.000Z",
          event_code: "LIV",
          event_id: "live-event",
          is_live: true,
          last_published_version_number: 2,
          name: "Live Event",
          slug: "live-event",
          status: "live",
        }),
        createStatusRow({
          draft_updated_at: "2026-04-10T12:00:00.000Z",
          event_code: "PAU",
          event_id: "paused-event",
          is_live: false,
          last_published_version_number: 2,
          name: "Paused Event",
          slug: "paused-event",
          status: "draft_only",
        }),
        createStatusRow({
          draft_updated_at: "2026-04-09T12:00:00.000Z",
          event_code: "DRF",
          event_id: "draft-only-event",
          is_live: false,
          last_published_version_number: null,
          name: "Draft Only Event",
          slug: "draft-only-event",
          status: "draft_only",
        }),
      ],
    });
    mockGetBrowserSupabaseClient.mockReturnValue(client);

    await expect(listDraftEventSummaries()).resolves.toEqual([
      {
        eventCode: "LIV",
        hasBeenPublished: true,
        id: "live-event",
        isLive: true,
        lastPublishedVersionNumber: 2,
        name: "Live Event",
        slug: "live-event",
        status: "live",
        updatedAt: "2026-04-11T12:00:00.000Z",
      },
      {
        eventCode: "PAU",
        hasBeenPublished: true,
        id: "paused-event",
        isLive: false,
        lastPublishedVersionNumber: 2,
        name: "Paused Event",
        slug: "paused-event",
        status: "draft_only",
        updatedAt: "2026-04-10T12:00:00.000Z",
      },
      {
        eventCode: "DRF",
        hasBeenPublished: false,
        id: "draft-only-event",
        isLive: false,
        lastPublishedVersionNumber: null,
        name: "Draft Only Event",
        slug: "draft-only-event",
        status: "draft_only",
        updatedAt: "2026-04-09T12:00:00.000Z",
      },
    ]);
    expect(client.from).toHaveBeenCalledWith("game_event_admin_status");
  });

  it("saves drafts through the authenticated Edge Function with the user token", async () => {
    const client = createSupabaseClientMock({
      session: {
        access_token: "admin-access-token",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        hasBeenPublished: true,
        id: sampleDraft.id,
        lastPublishedVersionNumber: 2,
        name: sampleDraft.name,
        slug: sampleDraft.slug,
        updatedAt: "2026-04-11T12:00:00.000Z",
      }),
    );
    mockGetBrowserSupabaseClient.mockReturnValue(client);
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveDraftEvent(sampleDraft)).resolves.toEqual({
      hasBeenPublished: true,
      id: sampleDraft.id,
      lastPublishedVersionNumber: 2,
      name: sampleDraft.name,
      slug: sampleDraft.slug,
      updatedAt: "2026-04-11T12:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/save-draft",
      expect.objectContaining({
        body: JSON.stringify({ content: sampleDraft, eventCode: null }),
        credentials: "include",
        method: "POST",
      }),
    );
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({
      apikey: "publishable-key",
      Authorization: "Bearer admin-access-token",
      "Content-Type": "application/json",
    });
  });

  it("publishes and unpublishes through the dedicated authoring functions", async () => {
    const client = createSupabaseClientMock({
      session: {
        access_token: "admin-access-token",
      },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          eventId: sampleDraft.id,
          publishedAt: "2026-04-11T12:00:00.000Z",
          slug: sampleDraft.slug,
          versionNumber: 3,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          eventId: sampleDraft.id,
          unpublishedAt: "2026-04-11T12:05:00.000Z",
        }),
      );
    mockGetBrowserSupabaseClient.mockReturnValue(client);
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishDraftEvent(sampleDraft.id)).resolves.toEqual({
      eventId: sampleDraft.id,
      publishedAt: "2026-04-11T12:00:00.000Z",
      slug: sampleDraft.slug,
      versionNumber: 3,
    });
    await expect(unpublishEvent(sampleDraft.id)).resolves.toEqual({
      eventId: sampleDraft.id,
      unpublishedAt: "2026-04-11T12:05:00.000Z",
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      "https://example.supabase.co/functions/v1/publish-draft",
      "https://example.supabase.co/functions/v1/unpublish-event",
    ]);
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)))).toEqual([
      { eventId: sampleDraft.id },
      { eventId: sampleDraft.id },
    ]);
  });

  it("fails authoring function calls when no admin session is present", async () => {
    const client = createSupabaseClientMock({
      session: null,
    });
    const fetchMock = vi.fn();
    mockGetBrowserSupabaseClient.mockReturnValue(client);
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishDraftEvent(sampleDraft.id)).rejects.toThrow(
      "Sign-in is required.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces function error messages", async () => {
    const client = createSupabaseClientMock({
      session: {
        access_token: "admin-access-token",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(createJsonResponse({ error: "Nope" }, 409));
    mockReadSupabaseErrorMessage.mockResolvedValue("A game event already uses that slug.");
    mockGetBrowserSupabaseClient.mockReturnValue(client);
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveDraftEvent(sampleDraft)).rejects.toThrow(
      "A game event already uses that slug.",
    );
  });

  it("loads an unpublished previously-published draft with draft_only status", async () => {
    const client = createSupabaseClientMock({
      draftContentRow: {
        content: sampleDraft,
        created_at: "2026-04-07T12:00:00.000Z",
        id: sampleDraft.id,
        last_saved_by: "22222222-2222-4222-8222-222222222222",
      },
      statusRow: createStatusRow({
        is_live: false,
        status: "draft_only",
      }),
    });
    mockGetBrowserSupabaseClient.mockReturnValue(client);

    await expect(loadDraftEvent(sampleDraft.id)).resolves.toEqual({
      content: sampleDraft,
      createdAt: "2026-04-07T12:00:00.000Z",
      eventCode: "MMF",
      hasBeenPublished: true,
      id: sampleDraft.id,
      isLive: false,
      lastSavedBy: "22222222-2222-4222-8222-222222222222",
      lastPublishedVersionNumber: 1,
      name: sampleDraft.name,
      slug: sampleDraft.slug,
      status: "draft_only",
      updatedAt: "2026-04-08T12:00:00.000Z",
    });
  });

  it("loads the current status tuple for one draft event", async () => {
    const client = createSupabaseClientMock({
      statusRow: createStatusRow({
        event_id: sampleDraft.id,
        is_live: true,
        last_published_version_number: 2,
        status: "live_with_draft_changes",
      }),
    });
    mockGetBrowserSupabaseClient.mockReturnValue(client);

    await expect(loadDraftEventStatus(sampleDraft.id)).resolves.toEqual({
      isLive: true,
      lastPublishedVersionNumber: 2,
      status: "live_with_draft_changes",
    });
    expect(client.statusEq).toHaveBeenCalledWith("event_id", sampleDraft.id);

    client.statusMaybeSingle.mockResolvedValueOnce({
      data: createStatusRow({
        event_id: sampleDraft.id,
        is_live: false,
        last_published_version_number: 2,
        status: "draft_only",
      }),
      error: null,
    });

    await expect(loadDraftEventStatus(sampleDraft.id)).resolves.toEqual({
      isLive: false,
      lastPublishedVersionNumber: 2,
      status: "draft_only",
    });
  });
});
