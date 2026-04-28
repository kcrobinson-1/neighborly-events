import type { DraftEventDetail, DraftEventSummary } from "../lib/adminGameApi";
import { routes } from "../../../../shared/urls";
import { AdminEventDetailsForm } from "./AdminEventDetailsForm";
import { AdminPublishPanel } from "./AdminPublishPanel";
import { AdminQuestionEditor } from "./AdminQuestionEditor";
import type {
  AdminPublishState,
  AdminQuestionSaveState,
  AdminSelectedDraftState,
  AdminUnpublishState,
} from "./useAdminDashboard";
import type { AdminEventDetailsFormValues } from "./eventDetails";

const openLiveGameNotLiveReason = "Publish this event to open the live game.";
const openLiveGameBusyReason = "Working...";

type EventAdminWorkspaceProps = {
  focusedQuestionId: string | null;
  hasDraftChanges: boolean;
  onCancelUnpublish: () => void;
  onConfirmUnpublish: () => void;
  onFocusQuestion: (questionId: string) => void;
  onNavigate: (path: string) => void;
  onPublish: () => void;
  onSaveSelectedEventDetails: (
    values: AdminEventDetailsFormValues,
    eventCode: string | null,
  ) => Promise<DraftEventSummary | null>;
  onSaveSelectedQuestionContent: (
    content: DraftEventDetail["content"],
    questionId: string,
  ) => Promise<DraftEventSummary | null>;
  onUnpublish: () => void;
  publishState: AdminPublishState;
  questionSaveState: AdminQuestionSaveState;
  selectedDraftState: AdminSelectedDraftState;
  summary: DraftEventSummary;
  unpublishState: AdminUnpublishState;
};

function formatSavedAt(timestamp: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function getStatusLabel(draft: DraftEventSummary, hasDraftChanges = false) {
  if (draft.status === "draft_only") {
    return "Draft only";
  }

  if (draft.status === "live_with_draft_changes" || hasDraftChanges) {
    return "Draft changes not published";
  }

  return `Live v${draft.lastPublishedVersionNumber}`;
}

function getSelectedDraftMessageKind(
  state: AdminSelectedDraftState,
): "error" | "info" | "success" {
  if (state.status === "save_error") {
    return "error";
  }

  if (state.status === "success") {
    return "success";
  }

  return "info";
}

function getQuestionMessageKind(
  state: AdminQuestionSaveState,
): "error" | "info" | "success" {
  if (state.status === "save_error") {
    return "error";
  }

  if (state.status === "success") {
    return "success";
  }

  return "info";
}

type OpenLiveGameState = {
  disabled: boolean;
  reason: string | null;
  reasonId: string | null;
};

function getOpenLiveGameState(
  draft: DraftEventSummary,
  isWorkspaceBusy: boolean,
  reasonId: string,
): OpenLiveGameState {
  if (isWorkspaceBusy) {
    return {
      disabled: true,
      reason: openLiveGameBusyReason,
      reasonId,
    };
  }

  if (draft.status === "draft_only") {
    return {
      disabled: true,
      reason: openLiveGameNotLiveReason,
      reasonId,
    };
  }

  return {
    disabled: false,
    reason: null,
    reasonId: null,
  };
}

/**
 * Per-event workspace for `/event/:slug/admin`. Renders the event-details
 * form, focused-question editor, and publish panel for one slug-resolved
 * draft. Smaller than `AdminEventWorkspace` because the per-event surface
 * has no draft list, no create / duplicate, and no "back to all events"
 * affordance — it serves a single event the organizer is already
 * authorized for.
 */
export function EventAdminWorkspace({
  focusedQuestionId,
  hasDraftChanges,
  onCancelUnpublish,
  onConfirmUnpublish,
  onFocusQuestion,
  onNavigate,
  onPublish,
  onSaveSelectedEventDetails,
  onSaveSelectedQuestionContent,
  onUnpublish,
  publishState,
  questionSaveState,
  selectedDraftState,
  summary,
  unpublishState,
}: EventAdminWorkspaceProps) {
  const isSelectedSaving = selectedDraftState.status === "saving";
  const isQuestionSavePending = questionSaveState.status === "saving";
  const isWorkspaceBusy =
    isSelectedSaving ||
    isQuestionSavePending ||
    publishState.status === "publishing" ||
    unpublishState.status === "unpublishing";

  const openLiveGameState = getOpenLiveGameState(
    summary,
    isWorkspaceBusy,
    "open-live-game-reason-event-admin",
  );

  return (
    <div className="admin-workspace-detail">
      <div className="admin-workspace-heading">
        <div>
          <p className="eyebrow">Event workspace</p>
          <h3>{summary.name}</h3>
        </div>
        <span className="chip">Draft actions</span>
      </div>
      <p>Status: {getStatusLabel(summary, hasDraftChanges)}</p>
      <p>Slug: {summary.slug}</p>
      <p>Last saved: {formatSavedAt(summary.updatedAt)}</p>
      <div className="admin-action-row">
        <button
          aria-describedby={openLiveGameState.reasonId ?? undefined}
          aria-disabled={openLiveGameState.disabled ? "true" : undefined}
          className="secondary-button"
          onClick={() => {
            if (openLiveGameState.disabled) {
              return;
            }

            onNavigate(routes.game(summary.slug));
          }}
          type="button"
        >
          Open live game
        </button>
      </div>
      {openLiveGameState.reason ? (
        <span
          className="admin-action-reason"
          id={openLiveGameState.reasonId ?? undefined}
        >
          {openLiveGameState.reason}
        </span>
      ) : null}
      {selectedDraftState.status === "loading" ? (
        <p className="admin-message admin-message-info">
          Loading event details...
        </p>
      ) : null}
      {selectedDraftState.status === "error" ? (
        <p className="admin-message admin-message-error">
          {selectedDraftState.message}
        </p>
      ) : null}
      {selectedDraftState.status === "ready" ||
      selectedDraftState.status === "saving" ||
      selectedDraftState.status === "save_error" ||
      selectedDraftState.status === "success" ? (
        <AdminEventDetailsForm
          disabled={isWorkspaceBusy}
          draft={selectedDraftState.draft}
          isSaving={isSelectedSaving}
          message={selectedDraftState.message}
          messageKind={getSelectedDraftMessageKind(selectedDraftState)}
          onSave={onSaveSelectedEventDetails}
        />
      ) : null}
      {focusedQuestionId &&
      (selectedDraftState.status === "ready" ||
        selectedDraftState.status === "saving" ||
        selectedDraftState.status === "save_error" ||
        selectedDraftState.status === "success") ? (
        <AdminQuestionEditor
          disabled={isWorkspaceBusy}
          draft={selectedDraftState.draft}
          focusedQuestionId={focusedQuestionId}
          isSaving={isQuestionSavePending}
          key={`${selectedDraftState.draft.id}-${selectedDraftState.draft.updatedAt}`}
          message={questionSaveState.message}
          messageKind={getQuestionMessageKind(questionSaveState)}
          onFocusQuestion={onFocusQuestion}
          onSave={onSaveSelectedQuestionContent}
        />
      ) : null}
      {selectedDraftState.status === "ready" ||
      selectedDraftState.status === "saving" ||
      selectedDraftState.status === "save_error" ||
      selectedDraftState.status === "success" ? (
        <AdminPublishPanel
          disabled={isWorkspaceBusy}
          draft={selectedDraftState.draft}
          onCancelUnpublish={onCancelUnpublish}
          onConfirmUnpublish={onConfirmUnpublish}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          publishState={publishState}
          unpublishState={unpublishState}
        />
      ) : null}
    </div>
  );
}
