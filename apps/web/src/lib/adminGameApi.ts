/**
 * apps/web admin event API binding. The implementation lives in
 * `shared/events/`; this shim preserves existing apps/web import paths.
 */

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
} from "../../../../shared/events";
