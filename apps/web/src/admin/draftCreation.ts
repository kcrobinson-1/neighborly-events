/**
 * apps/web admin draft-creation binding. The implementation lives in
 * `shared/events/draftCreation.ts`; this shim preserves the existing
 * apps/web import path. Transitional through M2 phase 2.4.3, which
 * deletes the platform-admin module that consumes it.
 */

export {
  createDuplicatedDraftContent,
  createStarterDraftContent,
} from "../../../../shared/events";
