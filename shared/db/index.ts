/**
 * Public shared/db entrypoint consumed by the per-app Supabase adapters.
 *
 * `shared/db/` owns env-agnostic Supabase wiring: the browser client
 * factory and the small helper functions that depend only on a config
 * object. Per-app adapters (apps/web today, apps/site in M1 phase 1.3)
 * own env reading, the singleton lifecycle, and any framework-coupled
 * gates (prototype fallback, missing-config copy).
 */
export {
  createBrowserSupabaseClient,
  createSupabaseAuthHeaders,
  readSupabaseErrorMessage,
  type SupabaseConfig,
} from "./client.ts";
