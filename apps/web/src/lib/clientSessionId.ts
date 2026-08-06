import { getOrCreateLocalPrototypeSessionId } from "./localGameFallback";
import { readStoredClientSessionId } from "./serverSessionToken";
import { getSupabaseConfig, isPrototypeFallbackEnabled } from "./supabaseBrowser";

/**
 * Resolves the client session identity that keys device-local game state.
 * Mirrors the backend-selection branch in `gameApi.submitGameCompletion`:
 * the Supabase path derives the id from the signed server session token,
 * the prototype fallback uses its own stable local id, and an unconfigured
 * browser has no session identity, which disables persistence entirely.
 */
export function readActiveClientSessionId(): string | null {
  if (getSupabaseConfig().enabled) {
    return readStoredClientSessionId();
  }

  if (isPrototypeFallbackEnabled()) {
    return getOrCreateLocalPrototypeSessionId();
  }

  return null;
}
