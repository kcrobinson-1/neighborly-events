import { scoreAnswers } from "../../../../shared/game-config";
import { getGameById } from "../../../../shared/game-config/sample-fixtures.ts";
import type {
  GameCompletionEntitlement,
  GameCompletionResult,
  SubmitGameCompletionInput,
} from "../types/game";
import { getLocalStorage } from "./browserStorage";
import { createOpaqueId } from "./session";

/**
 * Local-only prototype entitlement and completion store for the browser
 * when Supabase is not configured. Simulates the production backend just
 * well enough for the gameplay flow to render end-to-end during local
 * development without writing to a real backend.
 */
/** Browser storage key for prototype entitlement records. */
const localEntitlementStorageKey = "neighborly.local-entitlements.v1";
/** Browser storage key for per-session attempt counters. */
const localAttemptStorageKey = "neighborly.local-attempts.v1";
/** Browser storage key for idempotent completion results. */
const localCompletionStorageKey = "neighborly.local-completions.v1";
/** Browser storage key for the local-only prototype session identifier. */
const localPrototypeSessionStorageKey = "neighborly.local-session.v1";

/** Stored reward entitlement for a prototype browser session. */
type LocalEntitlementRecord = {
  createdAt: string;
  verificationCode: string;
};

/** Browser-side map of event/session keys to entitlement records. */
type LocalEntitlementsStore = Record<string, LocalEntitlementRecord>;
/** Browser-side attempt counter per event/session pair. */
type LocalAttemptsStore = Record<string, number>;
/** Browser-side cache of completion results keyed by request id. */
type LocalCompletionsStore = Record<string, GameCompletionResult>;

/** Builds a stable storage key for a specific event/session pair. */
function getStorageKey(eventId: string, prototypeSessionId: string) {
  return `${eventId}:${prototypeSessionId}`;
}

/** Creates the volunteer-facing verification code shown after completion. */
function createVerificationCode(eventCode: string): string {
  const fourDigits = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `${eventCode}-${fourDigits}`;
}

/** Reads and parses JSON from localStorage with a typed fallback value. */
function readStoredJson<T>(key: string, fallback: T) {
  const storage = getLocalStorage();

  if (!storage) {
    return fallback;
  }

  const rawValue = storage.getItem(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

/** Writes a JSON-serializable value to localStorage when available. */
function writeStoredJson<T>(key: string, value: T) {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  storage.setItem(key, JSON.stringify(value));
}

/** Returns the prototype session id, creating it on first use in the browser. */
function getOrCreateLocalPrototypeSessionId() {
  const storage = getLocalStorage();

  if (!storage) {
    return createOpaqueId("prototype-session");
  }

  const existingSessionId = storage.getItem(localPrototypeSessionStorageKey);

  if (existingSessionId) {
    return existingSessionId;
  }

  const sessionId = createOpaqueId("prototype-session");
  storage.setItem(localPrototypeSessionStorageKey, sessionId);
  return sessionId;
}

/** Returns the user-facing entitlement copy for a new or reused reward entry. */
function buildEntitlementMessage(status: GameCompletionEntitlement["status"]) {
  return status === "new"
    ? "You're checked in for the reward."
    : "You're still checked in for the reward. Playing again does not add another reward entry.";
}

/** Simulates the backend completion flow when running locally without Supabase. */
export function buildLocalCompletionResult(
  input: SubmitGameCompletionInput,
): GameCompletionResult {
  const prototypeSessionId = getOrCreateLocalPrototypeSessionId();
  const lookupKey = getStorageKey(input.eventId, prototypeSessionId);
  const completionLookupKey = `${lookupKey}:${input.requestId}`;
  const entitlements = readStoredJson<LocalEntitlementsStore>(
    localEntitlementStorageKey,
    {},
  );
  const attempts = readStoredJson<LocalAttemptsStore>(localAttemptStorageKey, {});
  const completions = readStoredJson<LocalCompletionsStore>(
    localCompletionStorageKey,
    {},
  );

  if (completions[completionLookupKey]) {
    return completions[completionLookupKey];
  }

  const game = getGameById(input.eventId);

  if (!game) {
    throw new Error("This game event could not be found.");
  }

  const nextAttemptNumber = (attempts[lookupKey] ?? 0) + 1;
  attempts[lookupKey] = nextAttemptNumber;

  let entitlement = entitlements[lookupKey];
  let entitlementStatus: GameCompletionEntitlement["status"] = "existing";

  if (!entitlement) {
    entitlement = {
      createdAt: new Date().toISOString(),
      // "LOC" identifies local-prototype codes as distinct from real event codes.
      verificationCode: createVerificationCode("LOC"),
    };
    entitlements[lookupKey] = entitlement;
    entitlementStatus = "new";
  }

  writeStoredJson(localEntitlementStorageKey, entitlements);
  writeStoredJson(localAttemptStorageKey, attempts);

  const result = {
    attemptNumber: nextAttemptNumber,
    completionId: createOpaqueId("cmp"),
    entitlement: {
      createdAt: entitlement.createdAt,
      status: entitlementStatus,
      verificationCode: entitlement.verificationCode,
    },
    message: buildEntitlementMessage(entitlementStatus),
    entitlementEligible: entitlementStatus === "new",
    score: scoreAnswers(game, input.answers),
  } satisfies GameCompletionResult;

  completions[completionLookupKey] = result;
  writeStoredJson(localCompletionStorageKey, completions);

  return result;
}
