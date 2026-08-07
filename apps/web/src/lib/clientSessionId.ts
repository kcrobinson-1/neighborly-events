import { getOrCreateLocalPrototypeSessionId } from "./localGameFallback";
import { readStoredClientSessionId } from "./serverSessionToken";
import { getSupabaseConfig, isPrototypeFallbackEnabled } from "./supabaseBrowser";

/**
 * Resolves the client session identity that keys device-local game state.
 * Mirrors the backend-selection branch in `gameApi.submitGameCompletion`:
 * the Supabase path derives the id from the signed server session token,
 * the prototype fallback uses its own stable local id, and an unconfigured
 * browser has no session identity, which disables persistence entirely.
 * Never throws: this runs during mount, and privacy modes whose storage
 * methods reject must degrade to "no identity" (persistence off), not
 * crash the page.
 */
export function readActiveClientSessionId(): string | null {
  try {
    if (getSupabaseConfig().enabled) {
      return readStoredClientSessionId();
    }

    if (isPrototypeFallbackEnabled()) {
      return getOrCreateLocalPrototypeSessionId();
    }
  } catch {
    return null;
  }

  return null;
}
