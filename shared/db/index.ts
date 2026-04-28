/**
 * Public shared/db entrypoint consumed by the per-app Supabase adapters.
 *
 * `shared/db/` owns env-agnostic Supabase wiring: the browser client
 * factory, the small helper functions that depend only on a config
 * object, and the generated `Database` type plus its row/insert/update
 * derivation helpers. Per-app adapters (apps/web today, apps/site in
 * M1 phase 1.3) own env reading, the singleton lifecycle, and any
 * framework-coupled gates (prototype fallback, missing-config copy).
 * apps/web and apps/site both consume the browser-client factory through
 * their own adapter modules.
 */
export {
  createBrowserSupabaseClient,
  createSupabaseAuthHeaders,
  readSupabaseErrorMessage,
  type SupabaseConfig,
} from "./client.ts";
export type {
  CompositeTypes,
  Database,
  Enums,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
} from "./types.ts";

import type { Tables } from "./types.ts";

/**
 * Projection of `game_events` used by the redeem and redemptions
 * authorization lookups: both look up the event by slug and read only
 * `id` plus `event_code` to gate downstream authorization. Consolidated
 * here to remove the byte-identical duplicates that previously lived in
 * `apps/web/src/redeem/authorizeRedeem.ts` and
 * `apps/web/src/redemptions/authorizeRedemptions.ts`.
 */
export type EventCodeLookupRow = Pick<
  Tables<"game_events">,
  "id" | "event_code"
>;
