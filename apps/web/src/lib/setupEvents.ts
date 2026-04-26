import { configureSharedEvents } from "../../../../shared/events";
import { featuredGameSlug } from "../data/games";
import {
  getBrowserSupabaseClient,
  getMissingSupabaseConfigMessage,
  getSupabaseConfig,
} from "./supabaseBrowser";

/**
 * apps/web's per-app `shared/events/` setup. Imported for side-effect by
 * `apps/web/src/main.tsx` exactly once at startup, before any shared event
 * API is consumed. Prototype fallback remains in the apps/web binding module;
 * these providers expose only the remote Supabase path.
 */

configureSharedEvents({
  getClient: getBrowserSupabaseClient,
  getConfig: getSupabaseConfig,
  getFeaturedGameSlug: () => featuredGameSlug,
  getMissingConfigMessage: getMissingSupabaseConfigMessage,
});
