import { getLocalStorage } from "./browserStorage";

/**
 * Browser storage for the signed server session token fallback.
 * The token is the cookie value (`<sessionId>.<signature>`) mirrored into
 * localStorage for browsers that drop third-party cookies; `gameApi` sends
 * it via the `x-neighborly-session` header, and the device-local game
 * persistence layer derives its session key from the id segment.
 */
/** Browser storage key for the signed server session token fallback. */
const serverSessionTokenStorageKey = "neighborly.server-session-token.v1";

/** Reads the signed backend session token fallback from browser storage. */
export function readStoredServerSessionToken() {
  const storage = getLocalStorage();

  if (!storage) {
    return "";
  }

  return storage.getItem(serverSessionTokenStorageKey)?.trim() ?? "";
}

/** Stores or clears the signed backend session token fallback. */
export function writeStoredServerSessionToken(sessionToken: string | null) {
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

/**
 * Extracts the opaque session id segment from the stored session token.
 * The signature stays private to the backend trust boundary; the id alone
 * is enough to key device-local state to the session that owns it.
 */
export function readStoredClientSessionId(): string | null {
  const sessionToken = readStoredServerSessionToken();
  const separatorIndex = sessionToken.indexOf(".");

  return separatorIndex > 0 ? sessionToken.slice(0, separatorIndex) : null;
}
