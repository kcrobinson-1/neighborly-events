import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadDraftEventSummary,
  type DraftEventSummary,
} from "../lib/adminGameApi";
import type { AuthSessionState } from "../auth";
import { useSelectedDraft } from "./useSelectedDraft";

export type EventAdminSeedState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; summary: DraftEventSummary }
  | { message: string; status: "error" };

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

type UseEventAdminWorkspaceOptions = {
  eventId: string;
  sessionState: AuthSessionState;
};

/**
 * Per-event admin workspace coordinator. Resolves a single seed
 * `DraftEventSummary` for one event id, then delegates the load /
 * edit / save / publish / unpublish lifecycle to the existing
 * [`useSelectedDraft`](./useSelectedDraft.ts) hook by synthesizing a
 * one-row `dashboardState`.
 *
 * Skips the global `getGameAdminStatus` / `is_admin` allowlist read
 * — `useOrganizerForEvent` upstream of this hook is the single
 * authorization gate. The synthesized dashboard shape carries
 * `status: "ready"` from the moment the seed read resolves so an
 * organizer who is not on the platform allowlist still reaches the
 * authorized authoring state.
 */
export function useEventAdminWorkspace({
  eventId,
  sessionState,
}: UseEventAdminWorkspaceOptions) {
  const [seedState, setSeedState] = useState<EventAdminSeedState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (sessionState.status !== "signed_in") {
      // React 18 batches synchronous setState calls inside effects, so there
      // is no cascade in practice. Mirrors the pattern in useSelectedDraft
      // for the same reset-when-idle shape.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeedState({ status: "loading" });
      return;
    }

    let isCancelled = false;
    setSeedState({ status: "loading" });

    void loadDraftEventSummary(eventId)
      .then((summary) => {
        if (isCancelled) {
          return;
        }
        if (!summary) {
          setSeedState({ status: "missing" });
          return;
        }
        setSeedState({ status: "ready", summary });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }
        setSeedState({
          message: getErrorMessage(
            error,
            "We couldn't load this event right now.",
          ),
          status: "error",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [eventId, reloadToken, sessionState]);

  const reloadSeed = useCallback(() => {
    setReloadToken((value) => value + 1);
  }, []);

  // Synthesized dashboard state for useSelectedDraft. The "ready"
  // shape carries the single resolved summary; every other seed
  // status maps to a non-"ready" dashboardState that puts
  // useSelectedDraft into idle.
  const dashboardState = useMemo(() => {
    if (seedState.status !== "ready" || sessionState.status !== "signed_in") {
      return { status: "idle" } as const;
    }
    return {
      drafts: [seedState.summary],
      email: sessionState.email,
      status: "ready" as const,
    };
  }, [seedState, sessionState]);

  const handleUpdateDraftsList = useCallback(
    (updater: (drafts: DraftEventSummary[]) => DraftEventSummary[]) => {
      setSeedState((current) => {
        if (current.status !== "ready") {
          return current;
        }
        const nextDrafts = updater([current.summary]);
        const nextSummary = nextDrafts.find(
          (draft) => draft.id === current.summary.id,
        );
        if (!nextSummary) {
          return current;
        }
        return { status: "ready", summary: nextSummary };
      });
    },
    [],
  );

  const selectedDraft = useSelectedDraft({
    dashboardState,
    onUpdateDraftsList: handleUpdateDraftsList,
    selectedEventId: eventId,
    sessionState,
  });

  return {
    ...selectedDraft,
    reloadSeed,
    seedState,
  };
}
