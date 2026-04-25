import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createBrowserSupabaseClient,
  createSupabaseAuthHeaders,
  readSupabaseErrorMessage,
  type Database,
  type SupabaseConfig,
} from "../../../../shared/db";

/**
 * Vite-coupled adapter over `shared/db/`. Owns the singleton lifecycle,
 * env reading via `import.meta.env`, and the prototype-fallback gate.
 * The SDK-level wiring (factory + auth-header helper + error-message
 * reader) lives in `shared/db/` so `apps/site` can reuse it through
 * its own Next.js-coupled adapter in M1 phase 1.3.
 */

export {
  createSupabaseAuthHeaders,
  readSupabaseErrorMessage,
  type SupabaseConfig,
};

let browserSupabaseClient: SupabaseClient<Database> | null = null;

/** Returns true when a Vite env flag explicitly enables a behavior. */
export function isEnabledFlag(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(getEnvironmentValue(value).toLowerCase());
}

/** Trims environment variables so empty-looking values are treated consistently. */
export function getEnvironmentValue(value: string | undefined) {
  return value?.trim() ?? "";
}

/** Returns the browser-side Supabase configuration needed for public reads and functions. */
export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = getEnvironmentValue(import.meta.env.VITE_SUPABASE_URL);
  const supabasePublishableKey = getEnvironmentValue(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  );
  const legacyAnonKey = getEnvironmentValue(import.meta.env.VITE_SUPABASE_ANON_KEY);
  const supabaseClientKey = supabasePublishableKey || legacyAnonKey;

  return {
    enabled: Boolean(supabaseUrl && supabaseClientKey),
    supabaseClientKey,
    supabaseUrl,
  };
}

/** Returns the shared browser Supabase client used by admin auth and data reads. */
export function getBrowserSupabaseClient() {
  const config = getSupabaseConfig();

  if (!config.enabled) {
    throw new Error(getMissingSupabaseConfigMessage());
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createBrowserSupabaseClient(config);
  }

  return browserSupabaseClient;
}

/** Enables the local-only fallback only when explicitly requested in development. */
export function isPrototypeFallbackEnabled() {
  return (
    import.meta.env.DEV &&
    !getSupabaseConfig().enabled &&
    isEnabledFlag(import.meta.env.VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK)
  );
}

/** Explains how to proceed when browser Supabase configuration is missing. */
export function getMissingSupabaseConfigMessage() {
  if (!import.meta.env.DEV) {
    return "This game isn't available right now.";
  }

  return [
    "This game isn't available right now.",
    "If you're working locally, add `VITE_SUPABASE_URL` and",
    "`VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, or set",
    "`VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK=true` to run the local-only prototype flow.",
  ].join(" ");
}
