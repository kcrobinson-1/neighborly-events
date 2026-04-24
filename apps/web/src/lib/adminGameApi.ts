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
  created_at?: string;
  content?: AuthoringGameDraftContent;
  id: string;
  last_saved_by?: string | null;
};

type DraftEventStatusRow = {
  draft_updated_at: string;
  event_code: string | null;
  event_id: string;
  is_live: boolean;
  last_published_version_number: number | null;
  name: string;
  slug: string;
  status: AdminEventStatus;
};

export type AdminEventStatus =
  | "draft_only"
  | "live"
  | "live_with_draft_changes";

export type DraftEventSummary = {
  eventCode: string | null;
  hasBeenPublished: boolean;
  id: string;
  isLive: boolean;
  lastPublishedVersionNumber: number | null;
  name: string;
  slug: string;
  status: AdminEventStatus;
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

export type SaveDraftEventResult = Omit<DraftEventSummary, "isLive" | "status">;

export type DraftEventStatusSnapshot = Pick<
  DraftEventSummary,
  "isLive" | "lastPublishedVersionNumber" | "status"
>;

function mapDraftSummary(row: DraftEventStatusRow): DraftEventSummary {
  return {
    eventCode: row.event_code ?? null,
    hasBeenPublished: row.last_published_version_number !== null,
    id: row.event_id,
    isLive: row.is_live,
    lastPublishedVersionNumber: row.last_published_version_number,
    name: row.name,
    slug: row.slug,
    status: row.status,
    updatedAt: row.draft_updated_at,
  };
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
    .from("game_event_admin_status")
    .select("draft_updated_at,event_code,event_id,is_live,last_published_version_number,name,slug,status")
    .order("draft_updated_at", { ascending: false });

  if (error) {
    throw new Error("We couldn't load the draft events right now.");
  }

  return ((data ?? []) as DraftEventStatusRow[]).map(mapDraftSummary);
}

/** Loads one private draft event document for an authenticated game admin. */
export async function loadDraftEvent(eventId: string): Promise<DraftEventDetail | null> {
  const { data: statusRow, error: statusError } = await getBrowserSupabaseClient()
    .from("game_event_admin_status")
    .select("draft_updated_at,event_code,event_id,is_live,last_published_version_number,name,slug,status")
    .eq("event_id", eventId)
    .maybeSingle<DraftEventStatusRow>();

  if (statusError) {
    throw new Error("We couldn't load the draft event right now.");
  }

  if (!statusRow) {
    return null;
  }

  const { data, error } = await getBrowserSupabaseClient()
    .from("game_event_drafts")
    .select("content,created_at,id,last_saved_by")
    .eq("id", eventId)
    .maybeSingle<DraftEventRow>();

  if (error) {
    throw new Error("We couldn't load the draft event right now.");
  }

  if (!data) {
    return null;
  }

  return {
    ...mapDraftSummary(statusRow),
    content: parseAuthoringGameDraftContent(data.content),
    createdAt: data.created_at ?? statusRow.draft_updated_at,
    lastSavedBy: data.last_saved_by ?? null,
  };
}

/** Re-reads the server-owned admin status tuple for one draft event. */
export async function loadDraftEventStatus(
  eventId: string,
): Promise<DraftEventStatusSnapshot> {
  const { data, error } = await getBrowserSupabaseClient()
    .from("game_event_admin_status")
    .select("event_id,is_live,last_published_version_number,status")
    .eq("event_id", eventId)
    .maybeSingle<DraftEventStatusRow>();

  if (error || !data) {
    throw new Error("We couldn't load the draft event status right now.");
  }

  return {
    isLive: data.is_live,
    lastPublishedVersionNumber: data.last_published_version_number,
    status: data.status,
  };
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
