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
  getGameAdminStatus,
  listDraftEventSummaries,
  loadDraftEvent,
  loadDraftEventStatus,
  loadDraftEventSummary,
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
export {
  createDuplicatedDraftContent,
  createStarterDraftContent,
} from "./draftCreation.ts";
export type { GameSeedConfig } from "./seed-config.ts";
export { seedConfig as madronaDemoSeedConfig } from "./madrona-demo-game-content.ts";
export { seedConfig as harvestBlockPartyDemoSeedConfig } from "./harvest-block-party-game-content.ts";
export { seedConfig as riversideJamDemoSeedConfig } from "./riverside-jam-game-content.ts";
