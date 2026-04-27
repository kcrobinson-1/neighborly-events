/**
 * Public shared/events entrypoint consumed by per-app event adapters.
 *
 * `shared/events/` owns event-domain reads, admin writes, and projection types.
 * Per-app adapters own env access, Supabase client lifecycle, and prototype
 * fallback behavior, then register providers once via `configureSharedEvents`.
 */

export {
  configureSharedEvents,
  readSharedEventsProviders,
  type SharedEventsProviders,
} from "./configure.ts";
export {
  listPublishedGameSummaries,
  loadPublishedGameBySlug,
  type PublishedGameSummary,
} from "./published.ts";
export {
  generateEventCode,
  getGameAdminStatus,
  listDraftEventSummaries,
  loadDraftEvent,
  loadDraftEventStatus,
  publishDraftEvent,
  saveDraftEvent,
  unpublishEvent,
  type AdminEventStatus,
  type DraftEventDetail,
  type DraftEventStatusSnapshot,
  type DraftEventSummary,
  type PublishDraftResult,
  type SaveDraftEventResult,
  type UnpublishEventResult,
} from "./admin.ts";
