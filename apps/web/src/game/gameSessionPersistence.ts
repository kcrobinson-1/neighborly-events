import type { GameConfig } from "../data/games";
import { getLocalStorage } from "../lib/browserStorage";
import { readActiveClientSessionId } from "../lib/clientSessionId";
import type { Answers, GameCompletionResult } from "../types/game";

/**
 * Device-local persistence for the attendee quiz session, keyed by event id
 * and bound to the active client session id. This is what makes the quiz a
 * single destination with three durable states (not started / in progress /
 * completed): navigating away or reloading restores the saved state instead
 * of discarding the run, so the completed screen — including the check-in
 * code — is recoverable without retaking.
 *
 * The cached completion is the recovery mechanism, not a re-fetch through the
 * completion RPC's replay path. Replaying the RPC requires resending the same
 * request id, answers, score, and duration — the exact payload this module
 * would have to persist anyway — so a re-fetch adds a network dependency at
 * an outdoor event without shrinking the persisted surface. The backend still
 * owns the entitlement: retakes resubmit through the normal flow and the RPC
 * returns the existing entitlement, which is why retaking never changes the
 * code or the reward entry.
 *
 * Snapshots are validated on read: an envelope written by a different client
 * session, malformed JSON, or an in-progress snapshot that no longer matches
 * the published question content is discarded, falling back to a fresh run.
 * Completed snapshots survive content drift because the check-in code stays
 * valid regardless of later question edits.
 */

/** Per-question shuffled option order, keyed by question id. */
export type PersistedOptionOrder = Record<string, string[]>;

/** Resumable session snapshot: an unfinished run or a completed result. */
export type PersistedGameSnapshot =
  | {
      kind: "in_progress";
      answers: Answers;
      currentIndex: number;
      optionOrder: PersistedOptionOrder;
      startedAt: number | null;
    }
  | {
      kind: "complete";
      answers: Answers;
      completion: GameCompletionResult;
    };

/** Stored wrapper binding a snapshot to the client session that wrote it. */
type PersistedEnvelope = {
  clientSessionId: string;
  savedAt: string;
  snapshot: PersistedGameSnapshot;
};

/** Builds the per-event storage key for the persisted session snapshot. */
function getStorageKey(eventId: string) {
  return `neighborly.game-session.v1.${eventId}`;
}

/** Narrow structural check for a submitted-answers record. */
function isAnswers(value: unknown): value is Answers {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (selection) =>
      Array.isArray(selection) &&
      selection.every((optionId) => typeof optionId === "string"),
  );
}

/** Narrow structural check for a persisted backend completion result. */
function isCompletionResult(value: unknown): value is GameCompletionResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const completion = value as Partial<GameCompletionResult>;
  const entitlement = completion.entitlement;

  return (
    typeof completion.attemptNumber === "number" &&
    typeof completion.completionId === "string" &&
    typeof completion.message === "string" &&
    typeof completion.entitlementEligible === "boolean" &&
    typeof completion.score === "number" &&
    typeof entitlement === "object" &&
    entitlement !== null &&
    typeof entitlement.createdAt === "string" &&
    (entitlement.status === "new" || entitlement.status === "existing") &&
    typeof entitlement.verificationCode === "string"
  );
}

/** True when the two id lists contain exactly the same members. */
function isPermutationOf(candidate: unknown, expectedIds: string[]) {
  return (
    Array.isArray(candidate) &&
    candidate.length === expectedIds.length &&
    new Set(candidate).size === candidate.length &&
    candidate.every(
      (id) => typeof id === "string" && expectedIds.includes(id),
    )
  );
}

/**
 * Validates an in-progress snapshot against the current game content.
 * Any drift (question set, option ids, out-of-range index) invalidates the
 * snapshot: resuming a run against edited content would misgrade answers.
 */
function isValidInProgressSnapshot(
  game: GameConfig,
  snapshot: Extract<PersistedGameSnapshot, { kind: "in_progress" }>,
) {
  if (
    !Number.isInteger(snapshot.currentIndex) ||
    snapshot.currentIndex < 0 ||
    snapshot.currentIndex >= game.questions.length
  ) {
    return false;
  }

  if (snapshot.startedAt !== null && typeof snapshot.startedAt !== "number") {
    return false;
  }

  if (!isAnswers(snapshot.answers)) {
    return false;
  }

  const questionIds = new Set(game.questions.map((question) => question.id));

  if (!Object.keys(snapshot.answers).every((id) => questionIds.has(id))) {
    return false;
  }

  if (
    typeof snapshot.optionOrder !== "object" ||
    snapshot.optionOrder === null
  ) {
    return false;
  }

  return game.questions.every((question) =>
    isPermutationOf(
      snapshot.optionOrder[question.id],
      question.options.map((option) => option.id),
    ),
  );
}

/** Validates and narrows a parsed envelope into a usable snapshot. */
function parseSnapshot(
  game: GameConfig,
  value: unknown,
): PersistedGameSnapshot | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const snapshot = value as Partial<PersistedGameSnapshot>;

  if (snapshot.kind === "complete") {
    return isAnswers(snapshot.answers) && isCompletionResult(snapshot.completion)
      ? {
          answers: snapshot.answers,
          completion: snapshot.completion,
          kind: "complete",
        }
      : null;
  }

  if (snapshot.kind === "in_progress") {
    const candidate = snapshot as Extract<
      PersistedGameSnapshot,
      { kind: "in_progress" }
    >;

    return isValidInProgressSnapshot(game, candidate)
      ? {
          answers: candidate.answers,
          currentIndex: candidate.currentIndex,
          kind: "in_progress",
          optionOrder: candidate.optionOrder,
          startedAt: candidate.startedAt,
        }
      : null;
  }

  return null;
}

/**
 * Reads the persisted snapshot for a game, or null when nothing usable is
 * stored. Snapshots written by a different client session are ignored so a
 * fresh session on a shared device starts clean.
 */
export function readPersistedGameSnapshot(
  game: GameConfig,
): PersistedGameSnapshot | null {
  const storage = getLocalStorage();
  const clientSessionId = readActiveClientSessionId();

  if (!storage || !clientSessionId) {
    return null;
  }

  const rawValue = storage.getItem(getStorageKey(game.id));

  if (!rawValue) {
    return null;
  }

  let envelope: Partial<PersistedEnvelope>;

  try {
    envelope = JSON.parse(rawValue) as Partial<PersistedEnvelope>;
  } catch {
    return null;
  }

  if (
    typeof envelope !== "object" ||
    envelope === null ||
    envelope.clientSessionId !== clientSessionId
  ) {
    return null;
  }

  return parseSnapshot(game, envelope.snapshot);
}

/**
 * Persists the snapshot for a game. Returns true only when the write went
 * through; false means the state lives only in memory (no storage, no
 * session identity, quota or privacy-mode rejection) and callers must not
 * treat the session as durable — e.g. the completion screen keeps its
 * new-tab link fallback so navigation cannot destroy the only copy of the
 * verification code.
 */
export function writePersistedGameSnapshot(
  eventId: string,
  snapshot: PersistedGameSnapshot,
): boolean {
  const storage = getLocalStorage();
  const clientSessionId = readActiveClientSessionId();

  if (!storage || !clientSessionId) {
    return false;
  }

  const envelope: PersistedEnvelope = {
    clientSessionId,
    savedAt: new Date().toISOString(),
    snapshot,
  };

  try {
    storage.setItem(getStorageKey(eventId), JSON.stringify(envelope));
    return true;
  } catch {
    // Quota or privacy-mode write failures degrade to the pre-persistence
    // behavior (state lives only in memory); gameplay must not break.
    return false;
  }
}

/** Removes the persisted snapshot for a game, if any. */
export function clearPersistedGameSnapshot(eventId: string) {
  getLocalStorage()?.removeItem(getStorageKey(eventId));
}

/** Captures the per-question option order of a shuffled game config. */
export function extractOptionOrder(game: GameConfig): PersistedOptionOrder {
  return Object.fromEntries(
    game.questions.map((question) => [
      question.id,
      question.options.map((option) => option.id),
    ]),
  );
}

/**
 * Re-applies a persisted option order to the source config so a resumed
 * attempt renders the same permutation it started with. Callers must have
 * validated the order via `readPersistedGameSnapshot` first.
 */
export function applyOptionOrder(
  game: GameConfig,
  optionOrder: PersistedOptionOrder,
): GameConfig {
  return {
    ...game,
    questions: game.questions.map((question) => {
      const orderedIds = optionOrder[question.id] ?? [];
      const optionsById = new Map(
        question.options.map((option) => [option.id, option]),
      );
      const orderedOptions = orderedIds.flatMap((optionId) => {
        const option = optionsById.get(optionId);
        return option ? [option] : [];
      });

      return {
        ...question,
        options:
          orderedOptions.length === question.options.length
            ? orderedOptions
            : question.options,
      };
    }),
  };
}
