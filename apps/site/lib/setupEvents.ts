import { configureSharedEvents } from "../../../shared/events";
import { featuredGameSlug } from "../../../shared/game-config/constants";
import {
  getBrowserSupabaseClient,
  getMissingSupabaseConfigMessage,
  getSupabaseConfig,
} from "./supabaseBrowser";

/**
 * apps/site's per-app `shared/events/` setup. Imported for side-effect by
 * SharedClientBootstrap before any shared events consumer renders.
 *
 * `getFeaturedGameSlug` resolves to the shared constant directly because
 * apps/site has no app-local data module mirroring apps/web's
 * `apps/web/src/data/games.ts` re-export. The provider only feeds the
 * published-summary sort in `shared/events/published.ts`; today's apps/site
 * `/admin` consumer reads draft summaries, not published, but supplying the
 * provider keeps the shared-module contract honored without inventing an
 * apps/site-specific featured-slug concept.
 */
configureSharedEvents({
  getClient: getBrowserSupabaseClient,
  getConfig: getSupabaseConfig,
  getFeaturedGameSlug: () => featuredGameSlug,
  getMissingConfigMessage: getMissingSupabaseConfigMessage,
});
