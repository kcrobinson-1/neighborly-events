import type { GameConfig } from "../data/games";
import { getLocalStorage } from "../lib/browserStorage";
import { readActiveClientSessionId } from "../lib/clientSessionId";
import type { Answers, GameCompletionResult } from "../types/game";
import { computeContentFingerprint } from "./contentFingerprint";

/**
 * Device-local persistence for the attendee quiz session, keyed by event id
 * and bound to the active client session id. This is what makes the quiz a
 * single destination with three durable states (not started / in progress /
 * completed): navigating away or reloading restores the saved state instead
 * of discarding the run, so the completed screen — including the check-in
 * code — is recoverable without retaking.
 *
 * The cached completion is the recovery mechanism, not a re-fetch through the
 * completion function's replay path. What it actually saves is one network
 * round trip at restore: the completed screen renders from local state rather
 * than re-POSTing to `complete-game`.
 *
 * Two stronger rationales appeared in earlier versions of this comment. Both
 * were wrong; they are recorded so they do not get reintroduced.
 *   - "A re-fetch would have to persist the same payload anyway." False.
 *     `complete-game` resolves a landed attempt from (eventId, requestId,
 *     sessionId) alone, and the request carries no score at all (the server
 *     recomputes it from trusted content), so a replay-based recovery would
 *     need only two ids persisted.
 *   - "The completed screen re-renders with no network." False. `GameRoutePage`
 *     awaits `loadPublishedGameBySlug` and renders the quiz only after that
 *     remote read resolves, so a return visit needs the network either way.
 *     This is a saved request, not offline capability.
 *
 * The backend still owns the entitlement: retakes resubmit through the normal
 * flow and the RPC returns the existing entitlement, which is why retaking
 * never changes the code or the reward entry.
 *
 * Snapshots are validated on read: an envelope written by a different client
 * session, malformed JSON, or an in-progress snapshot that no longer matches
 * the published question content is discarded, falling back to a fresh run.
 * Completed snapshots survive content drift because the check-in code stays
 * valid regardless of later question edits.
 */

/** Per-question shuffled option order, keyed by question id. */
export type PersistedOptionOrder = Record<string, string[]>;

/**
 * Resumable session snapshot: an unfinished run, an in-flight completion
 * submission, or a completed result. The `submitting` kind carries the
 * submission's request id so a reload mid-POST resubmits the identical
 * payload and the backend's request-id dedup returns the original attempt
 * instead of recording a duplicate completion row.
 */
export type PersistedGameSnapshot =
  | {
      kind: "in_progress";
      answers: Answers;
      /**
       * Fingerprint of the grading-relevant content the run was played
       * against; a mismatch on restore starts a fresh attempt instead of
       * resuming answers chosen under different questions.
       */
      contentFingerprint: string;
      currentIndex: number;
      /**
       * Active elapsed time when the snapshot was written (null before the
       * run's clock starts). Restore rebases `startedAt` from this so time
       * spent away from the page never counts toward the run's duration.
       */
      elapsedMs: number | null;
      optionOrder: PersistedOptionOrder;
    }
  | {
      kind: "submitting";
      answers: Answers;
      completionRequestId: string;
      /**
       * Same fingerprint as in-progress runs. The reason this comment used
       * to give for enforcing it here was false: `complete-game` resolves a
       * landed attempt from (eventId, requestId, sessionId) and returns
       * *before* loading or validating content, so a drifted replay can
       * recover rather than only 400. A mismatch still discards the snapshot
       * today — a known gap tracked in `docs/backlog.md`, not something the
       * server contract requires. The per-session entitlement returns the
       * same code on the new completion, which is what keeps the current
       * behavior costly (a retake) rather than harmful (a lost code).
       */
      contentFingerprint: string;
      /**
       * Duration computed when the submission began, so a much-later
       * restore replays the original elapsed time instead of inflating
       * completion-time analytics with the offline gap.
       */
      durationMs: number;
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

export { computeContentFingerprint };

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
 * Any grading-relevant drift — question set, prompts, correct answers,
 * option ids or labels, selection or feedback mode (via the content
 * fingerprint), plus an out-of-range index — invalidates the snapshot:
 * resuming a run against edited content would grade answers the attendee
 * chose under different questions.
 */
function isValidInProgressSnapshot(
  game: GameConfig,
  snapshot: Extract<PersistedGameSnapshot, { kind: "in_progress" }>,
) {
  if (snapshot.contentFingerprint !== computeContentFingerprint(game)) {
    return false;
  }

  if (
    !Number.isInteger(snapshot.currentIndex) ||
    snapshot.currentIndex < 0 ||
    snapshot.currentIndex >= game.questions.length
  ) {
    return false;
  }

  if (
    snapshot.elapsedMs !== null &&
    (typeof snapshot.elapsedMs !== "number" ||
      !Number.isFinite(snapshot.elapsedMs) ||
      snapshot.elapsedMs < 0)
  ) {
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

/**
 * Validates a submitting snapshot, including the content fingerprint.
 *
 * This comment previously justified the fingerprint check by claiming the
 * completion endpoint validates answers against current content before its
 * request-id dedup, so a drifted replay could only 400. That is backwards:
 * `complete-game` looks up (eventId, requestId, sessionId) and returns
 * before loading content, specifically so drifted replays recover.
 * Discarding a drifted `submitting` snapshot therefore throws away a request
 * id the server would still honor — a known gap tracked in
 * `docs/backlog.md`, not a requirement.
 *
 * Behavior is deliberately unchanged here: the per-session entitlement
 * returns the same verification code on the new completion, so today's cost
 * is a retake rather than a lost code, and changing the discard rule wants
 * its own change with a test rather than riding along in a docs pass.
 */
function isValidSubmittingSnapshot(
  game: GameConfig,
  snapshot: Extract<PersistedGameSnapshot, { kind: "submitting" }>,
) {
  if (snapshot.contentFingerprint !== computeContentFingerprint(game)) {
    return false;
  }

  if (
    typeof snapshot.completionRequestId !== "string" ||
    snapshot.completionRequestId.length === 0
  ) {
    return false;
  }

  if (
    typeof snapshot.durationMs !== "number" ||
    !Number.isFinite(snapshot.durationMs) ||
    snapshot.durationMs < 0
  ) {
    return false;
  }

  if (!isAnswers(snapshot.answers)) {
    return false;
  }

  const questionIds = new Set(game.questions.map((question) => question.id));

  return Object.keys(snapshot.answers).every((id) => questionIds.has(id));
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

  if (snapshot.kind === "submitting") {
    const candidate = snapshot as Extract<
      PersistedGameSnapshot,
      { kind: "submitting" }
    >;

    return isValidSubmittingSnapshot(game, candidate)
      ? {
          answers: candidate.answers,
          completionRequestId: candidate.completionRequestId,
          contentFingerprint: candidate.contentFingerprint,
          durationMs: candidate.durationMs,
          kind: "submitting",
        }
      : null;
  }

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
          contentFingerprint: candidate.contentFingerprint,
          currentIndex: candidate.currentIndex,
          elapsedMs: candidate.elapsedMs,
          kind: "in_progress",
          optionOrder: candidate.optionOrder,
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

  let envelope: Partial<PersistedEnvelope>;

  try {
    // getItem sits inside the guard too: some privacy modes expose a storage
    // object whose methods throw, and this runs during mount, where an
    // uncaught throw would blank the page instead of degrading.
    const rawValue = storage.getItem(getStorageKey(game.id));

    if (!rawValue) {
      return null;
    }

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
 * Reads the attempt number of a completed snapshot stored by the active
 * client session, or null when none is stored. Backbone of the monotonic
 * write checks below; never throws.
 */
function readStoredCompletedAttemptNumber(
  storage: Storage,
  eventId: string,
  clientSessionId: string,
): number | null {
  try {
    const rawValue = storage.getItem(getStorageKey(eventId));

    if (!rawValue) {
      return null;
    }

    const envelope = JSON.parse(rawValue) as Partial<PersistedEnvelope>;

    return typeof envelope === "object" &&
      envelope !== null &&
      envelope.clientSessionId === clientSessionId &&
      envelope.snapshot?.kind === "complete" &&
      isCompletionResult(envelope.snapshot.completion)
      ? envelope.snapshot.completion.attemptNumber
      : null;
  } catch {
    return null;
  }
}

/** Options for `writePersistedGameSnapshot`. */
export type WriteSnapshotOptions = {
  /**
   * Snapshot writes are monotonic across tabs by default: a non-complete
   * snapshot never silently replaces a stored completed one, so a stale
   * second tab still mid-run cannot destroy the results and code another
   * tab already earned. Pass true only on an explicit restart (reset or
   * retake) in the writing tab.
   */
  allowReplaceComplete?: boolean;
};

/**
 * Persists the snapshot for a game. Returns true only when the write went
 * through; false means the state lives only in memory (no storage, no
 * session identity, quota or privacy-mode rejection, or a monotonicity
 * skip) and callers must not treat the session as durable — e.g. the
 * completion screen keeps its new-tab link fallback so navigation cannot
 * destroy the only copy of the verification code.
 */
export function writePersistedGameSnapshot(
  eventId: string,
  snapshot: PersistedGameSnapshot,
  { allowReplaceComplete = false }: WriteSnapshotOptions = {},
): boolean {
  const storage = getLocalStorage();
  const clientSessionId = readActiveClientSessionId();

  if (!storage || !clientSessionId) {
    return false;
  }

  const storedCompletedAttemptNumber = readStoredCompletedAttemptNumber(
    storage,
    eventId,
    clientSessionId,
  );

  if (
    snapshot.kind !== "complete" &&
    !allowReplaceComplete &&
    storedCompletedAttemptNumber !== null
  ) {
    return false;
  }

  // Completed snapshots are monotonic by attempt number: if two tabs finish
  // attempts for the same session and the older response lands last, its
  // write must not roll the stored score and answer review back to the
  // earlier attempt. Equal attempts may rewrite (idempotent replays).
  if (
    snapshot.kind === "complete" &&
    storedCompletedAttemptNumber !== null &&
    snapshot.completion.attemptNumber < storedCompletedAttemptNumber
  ) {
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

/** Removes the persisted snapshot for a game, if any. Never throws. */
export function clearPersistedGameSnapshot(eventId: string) {
  try {
    getLocalStorage()?.removeItem(getStorageKey(eventId));
  } catch {
    // Method-level storage rejection degrades the same way as a failed
    // write: the snapshot simply outlives its usefulness until validation
    // discards it.
  }
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
