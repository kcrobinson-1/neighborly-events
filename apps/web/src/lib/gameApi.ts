import type {
  GameCompletionResult,
  SubmitGameCompletionInput,
} from "../types/game";
import { getLocalStorage } from "./browserStorage";
import { buildLocalCompletionResult } from "./localGameFallback";
import {
  createSupabaseAuthHeaders,
  getMissingSupabaseConfigMessage,
  getSupabaseConfig,
  isPrototypeFallbackEnabled,
  readSupabaseErrorMessage,
} from "./supabaseBrowser";

/**
 * Browser game-session API boundary for attendee gameplay.
 * Owns the trusted session bootstrap and completion submission calls to
 * Supabase. The local-only prototype fallback lives in
 * `./localGameFallback` and is dispatched into from `submitGameCompletion`
 * when Supabase is unconfigured and the explicit prototype gate is on.
 */
/** Browser storage key for the signed server session token fallback. */
const serverSessionTokenStorageKey = "neighborly.server-session-token.v1";

/** Response shape returned when the backend prepares the signed session. */
type IssueSessionResponse = {
  issuedNewSession: boolean;
  sessionReady: boolean;
  sessionToken?: string;
};

/** Reads the signed backend session token fallback from browser storage. */
function readStoredServerSessionToken() {
  const storage = getLocalStorage();

  if (!storage) {
    return "";
  }

  return storage.getItem(serverSessionTokenStorageKey)?.trim() ?? "";
}

/** Stores or clears the signed backend session token fallback. */
function writeStoredServerSessionToken(sessionToken: string | null) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  if (sessionToken) {
    storage.setItem(serverSessionTokenStorageKey, sessionToken);
    return;
  }

  storage.removeItem(serverSessionTokenStorageKey);
}

/** Converts the completion response into a typed result or throws a helpful error. */
async function handleCompletionResponse(response: Response) {
  if (!response.ok) {
    const errorMessage = await readSupabaseErrorMessage(
      response,
      "We couldn't finish your reward check-in right now.",
    );

    throw Object.assign(new Error(errorMessage), { status: response.status });
  }

  return (await response.json()) as GameCompletionResult;
}

/** Builds the shared fetch headers for backend session-aware requests. */
export function createServerSessionHeaders(supabaseClientKey: string) {
  const sessionToken = readStoredServerSessionToken();

  return {
    "Content-Type": "application/json",
    ...createSupabaseAuthHeaders(supabaseClientKey),
    ...(sessionToken ? { "x-neighborly-session": sessionToken } : {}),
  };
}

/** Ensures the signed server session cookie exists before gameplay begins. */
export async function ensureServerSession(eventId?: string) {
  const { enabled, supabaseClientKey, supabaseUrl } = getSupabaseConfig();

  if (!enabled) {
    if (isPrototypeFallbackEnabled()) {
      return;
    }

    throw new Error(getMissingSupabaseConfigMessage());
  }

  // We bootstrap the signed server session before gameplay starts so the
  // entitlement flow fails early and recoverably on the intro screen instead
  // of only surfacing a problem after the user finishes the game.
  const response = await fetch(`${supabaseUrl}/functions/v1/issue-session`, {
    method: "POST",
    headers: createServerSessionHeaders(supabaseClientKey),
    credentials: "include",
    body: JSON.stringify(eventId ? { event_id: eventId } : {}),
  });

  if (!response.ok) {
    throw new Error(
      await readSupabaseErrorMessage(
        response,
        "We couldn't get the game ready right now.",
      ),
    );
  }

  const payload = (await response.json()) as IssueSessionResponse;
  writeStoredServerSessionToken(payload.sessionToken ?? null);
}

/** Submits game completion to Supabase and retries once after a 401 response. */
async function submitGameCompletionToSupabase(
  input: SubmitGameCompletionInput,
  retryOnUnauthorized = true,
) {
  const { supabaseClientKey, supabaseUrl } = getSupabaseConfig();
  const response = await fetch(`${supabaseUrl}/functions/v1/complete-game`, {
    method: "POST",
    headers: createServerSessionHeaders(supabaseClientKey),
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (response.status === 401 && retryOnUnauthorized) {
    // If the cookie expired or was never set, we re-bootstrap the server
    // session once and replay the same request. The request id must stay the
    // same so the backend can dedupe safely. Pass eventId so the re-bootstrap
    // also records a start row — without it, a 401-retry path would produce a
    // completion row with no corresponding game_starts entry.
    await ensureServerSession(input.eventId);
    return submitGameCompletionToSupabase(input, false);
  }

  return handleCompletionResponse(response);
}

/** Finalizes game completion using Supabase or the local prototype fallback. */
export async function submitGameCompletion(input: SubmitGameCompletionInput) {
  if (!getSupabaseConfig().enabled) {
    if (isPrototypeFallbackEnabled()) {
      return buildLocalCompletionResult(input);
    }

    throw new Error(getMissingSupabaseConfigMessage());
  }

  return submitGameCompletionToSupabase(input);
}
