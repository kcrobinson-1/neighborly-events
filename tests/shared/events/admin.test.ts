import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureSharedAuth,
  _resetSharedAuthForTests,
} from "../../../shared/auth/configure.ts";
import type { Database } from "../../../shared/db";
import { _resetSharedEventsForTests } from "../../../shared/events/configure.ts";
import {
  configureSharedEvents,
  generateEventCode,
  getGameAdminStatus,
  listDraftEventSummaries,
  loadDraftEvent,
  loadDraftEventStatus,
  publishDraftEvent,
  saveDraftEvent,
  unpublishEvent,
} from "../../../shared/events";
import { getGameById } from "../../../shared/game-config/sample-fixtures.ts";

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
    isAdminData?: boolean;
    isAdminError?: { message: string } | null;
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
  const rpc = vi.fn().mockResolvedValue({
    data: options.isAdminData ?? true,
    error: options.isAdminError ?? null,
  });

  return {
    auth: {
      getSession,
    },
    draftEq,
    draftMaybeSingle,
    draftSelect,
    from,
    rpc,
    statusEq,
    statusMaybeSingle,
    statusOrder,
    statusSelect,
  };
}

function createStatusRow(overrides: Record<string, unknown> = {}) {
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

describe("shared/events admin API", () => {
  let client: ReturnType<typeof createSupabaseClientMock>;

  beforeEach(() => {
    vi.unstubAllGlobals();
    client = createSupabaseClientMock();

    configureSharedEvents({
      getClient: () => client as unknown as SupabaseClient<Database>,
      getConfig: () => ({
        enabled: true,
        supabaseClientKey: "publishable-key",
        supabaseUrl: "https://example.supabase.co",
      }),
      getFeaturedGameSlug: () => sampleDraft.slug,
      getMissingConfigMessage: () => "Missing Supabase config.",
    });
    configureSharedAuth({
      getClient: () => client as unknown as SupabaseClient<Database>,
      getConfigStatus: () => ({ enabled: true }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    _resetSharedAuthForTests();
    _resetSharedEventsForTests();
  });

  it("checks admin access through the configured Supabase client", async () => {
    client = createSupabaseClientMock({ isAdminData: true });

    await expect(getGameAdminStatus()).resolves.toBe(true);
    expect(client.rpc).toHaveBeenCalledWith("is_admin");

    client = createSupabaseClientMock({ isAdminError: { message: "Nope" } });

    await expect(getGameAdminStatus()).rejects.toThrow(
      "We couldn't verify admin access right now.",
    );
  });

  it("loads and parses one live draft event through the authenticated Supabase client", async () => {
    client = createSupabaseClientMock({
      draftContentRow: {
        content: sampleDraft,
        created_at: "2026-04-07T12:00:00.000Z",
        id: sampleDraft.id,
        last_saved_by: "22222222-2222-4222-8222-222222222222",
      },
      statusRow: createStatusRow(),
    });

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
    client = createSupabaseClientMock({
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
    client = createSupabaseClientMock({
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

  it("generates event codes through the dedicated authoring function", async () => {
    client = createSupabaseClientMock({
      session: {
        access_token: "admin-access-token",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        eventCode: "ABC",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateEventCode()).resolves.toBe("ABC");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.supabase.co/functions/v1/generate-event-code",
      expect.objectContaining({
        body: JSON.stringify({}),
        credentials: "include",
        method: "POST",
      }),
    );
  });

  it("publishes and unpublishes through the dedicated authoring functions", async () => {
    client = createSupabaseClientMock({
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
    client = createSupabaseClientMock({
      session: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(publishDraftEvent(sampleDraft.id)).rejects.toThrow(
      "Sign-in is required.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces function error messages", async () => {
    client = createSupabaseClientMock({
      session: {
        access_token: "admin-access-token",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({ error: "A game event already uses that slug." }, 409),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveDraftEvent(sampleDraft)).rejects.toThrow(
      "A game event already uses that slug.",
    );
  });

  it("loads an unpublished previously-published draft with draft_only status", async () => {
    client = createSupabaseClientMock({
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
    client = createSupabaseClientMock({
      statusRow: createStatusRow({
        event_id: sampleDraft.id,
        is_live: true,
        last_published_version_number: 2,
        status: "live_with_draft_changes",
      }),
    });

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
