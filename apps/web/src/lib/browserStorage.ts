/**
 * Null-safe access to `window.localStorage` for browser-side persistence.
 * Returns null in non-browser environments (SSR, tests without a DOM) or
 * when storage is unavailable, so callers can degrade gracefully instead
 * of throwing on access.
 */
export function getLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
