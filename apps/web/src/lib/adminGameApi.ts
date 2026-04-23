import {
  parseAuthoringGameDraftContent,
  type AuthoringGameDraftContent,
} from "../../../../shared/game-config";
import { getAccessToken } from "./authApi";
import {
  createSupabaseAuthHeaders,
  getBrowserSupabaseClient,
  getSupabaseConfig,
  readSupabaseErrorMessage,
} from "./supabaseBrowser";

/**
 * Browser admin authoring API boundary for `/admin`.
 * Owns auth session restoration, allowlist checks, draft reads, and authenticated
 * authoring function calls using the signed-in admin JWT.
 */
type DraftEventRow = {
  content?: AuthoringGameDraftContent;
  created_at?: string;
  event_code?: string | null;
  id: string;
  last_saved_by?: string | null;
  live_version_number: number | null;
  name: string;
  slug: string;
  updated_at: string;
};

type PublishedGameEventRow = {
  id: string;
};

export type DraftEventSummary = {
  eventCode: string | null;
  hasBeenPublished: boolean;
  id: string;
  isLive: boolean;
  liveVersionNumber: number | null;
  name: string;
  slug: string;
  updatedAt: string;
};

export type DraftEventDetail = DraftEventSummary & {
  content: AuthoringGameDraftContent;
  createdAt: string;
  lastSavedBy: string | null;
};

export type PublishDraftResult = {
  eventId: string;
  publishedAt: string;
  slug: string;
  versionNumber: number;
};

export type UnpublishEventResult = {
  eventId: string;
  unpublishedAt: string;
};

export type SaveDraftEventResult = Omit<DraftEventSummary, "isLive">;

function mapDraftSummary(row: DraftEventRow, isLive: boolean): DraftEventSummary {
  return {
    eventCode: row.event_code ?? null,
    hasBeenPublished: row.live_version_number !== null,
    id: row.id,
    isLive,
    liveVersionNumber: row.live_version_number,
    name: row.name,
    slug: row.slug,
    updatedAt: row.updated_at,
  };
}

async function listPublishedGameEventIds(
  eventIds: string[],
): Promise<Set<string>> {
  if (eventIds.length === 0) {
    return new Set();
  }

  const { data, error } = await getBrowserSupabaseClient()
    .from("game_events")
    .select("id")
    .in("id", eventIds)
    .not("published_at", "is", null);

  if (error) {
    throw new Error("We couldn't load the live event status right now.");
  }

  return new Set(
    (data ?? []).map((row: PublishedGameEventRow) => row.id),
  );
}

async function loadPublishedGameEvent(
  eventId: string,
): Promise<PublishedGameEventRow | null> {
  const { data, error } = await getBrowserSupabaseClient()
    .from("game_events")
    .select("id")
    .eq("id", eventId)
    .not("published_at", "is", null)
    .maybeSingle<PublishedGameEventRow>();

  if (error) {
    throw new Error("We couldn't load the live event status right now.");
  }

  return data ?? null;
}

function createFunctionUrl(functionName: string) {
  return `${getSupabaseConfig().supabaseUrl}/functions/v1/${functionName}`;
}

async function callAuthoringFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  fallbackMessage: string,
): Promise<T> {
  const { enabled, supabaseClientKey } = getSupabaseConfig();

  if (!enabled) {
    throw new Error("Admin authoring needs Supabase configuration.");
  }

  const accessToken = await getAccessToken();
  const response = await fetch(createFunctionUrl(functionName), {
    body: JSON.stringify(body),
    credentials: "include",
    headers: {
      ...createSupabaseAuthHeaders(supabaseClientKey),
      // Authoring functions need the signed-in admin's JWT, not the publishable
      // key bearer token used for public PostgREST reads.
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(await readSupabaseErrorMessage(response, fallbackMessage));
  }

  return (await response.json()) as T;
}

/** Checks whether the current authenticated session is allowlisted for game authoring. */
export async function getGameAdminStatus() {
  const { data, error } = await getBrowserSupabaseClient().rpc("is_admin");

  if (error) {
    throw new Error("We couldn't verify admin access right now.");
  }

  return Boolean(data);
}

/** Lists the private draft events visible to an authenticated game admin. */
export async function listDraftEventSummaries(): Promise<DraftEventSummary[]> {
  const { data, error } = await getBrowserSupabaseClient()
    .from("game_event_drafts")
    .select("id,live_version_number,name,slug,updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("We couldn't load the draft events right now.");
  }

  const draftRows = (data ?? []) as DraftEventRow[];
  let publishedGameEventIds = new Set<string>();

  try {
    publishedGameEventIds = await listPublishedGameEventIds(
      draftRows.map((row) => row.id),
    );
  } catch {
    // Draft rows already loaded successfully. If the follow-up live-status read
    // fails, keep the dashboard available and degrade `isLive` to false until
    // the next successful refresh.
  }

  return draftRows.map((row) =>
    mapDraftSummary(row, publishedGameEventIds.has(row.id)),
  );
}

/** Loads one private draft event document for an authenticated game admin. */
export async function loadDraftEvent(eventId: string): Promise<DraftEventDetail | null> {
  const { data, error } = await getBrowserSupabaseClient()
    .from("game_event_drafts")
    .select("content,created_at,event_code,id,last_saved_by,live_version_number,name,slug,updated_at")
    .eq("id", eventId)
    .maybeSingle<DraftEventRow>();

  if (error) {
    throw new Error("We couldn't load the draft event right now.");
  }

  if (!data) {
    return null;
  }

  let publishedGameEvent: PublishedGameEventRow | null = null;

  try {
    publishedGameEvent = await loadPublishedGameEvent(eventId);
  } catch {
    // The draft row itself loaded successfully. Treat the live-status read as
    // best-effort so the workspace still opens with a conservative non-live
    // fallback instead of blocking editing on a transient status lookup error.
  }

  return {
    ...mapDraftSummary(data, publishedGameEvent !== null),
    content: parseAuthoringGameDraftContent(data.content),
    createdAt: data.created_at ?? data.updated_at,
    lastSavedBy: data.last_saved_by ?? null,
  };
}

/** Re-reads whether a draft currently has a published public game row. */
export async function loadDraftEventLiveStatus(eventId: string): Promise<boolean> {
  return (await loadPublishedGameEvent(eventId)) !== null;
}

/** Saves a private game draft through the authenticated authoring function. */
export async function saveDraftEvent(
  content: AuthoringGameDraftContent,
  eventCode?: string | null,
): Promise<SaveDraftEventResult> {
  return await callAuthoringFunction<SaveDraftEventResult>(
    "save-draft",
    { content, eventCode: eventCode ?? null },
    "We couldn't save the draft right now.",
  );
}

/** Requests a server-generated random 3-letter event code. */
export async function generateEventCode(): Promise<string> {
  const result = await callAuthoringFunction<{ eventCode: string }>(
    "generate-event-code",
    {},
    "We couldn't generate an event code right now.",
  );
  return result.eventCode;
}

/** Publishes a private draft into the live attendee-facing game projection. */
export async function publishDraftEvent(eventId: string): Promise<PublishDraftResult> {
  return await callAuthoringFunction<PublishDraftResult>(
    "publish-draft",
    { eventId },
    "We couldn't publish the draft right now.",
  );
}

/** Unpublishes a live game event without deleting draft or version history. */
export async function unpublishEvent(eventId: string): Promise<UnpublishEventResult> {
  return await callAuthoringFunction<UnpublishEventResult>(
    "unpublish-event",
    { eventId },
    "We couldn't unpublish the event right now.",
  );
}
