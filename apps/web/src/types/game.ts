import type { SubmittedAnswers } from "../../../../shared/game-config";

/** Client alias for the canonical shared answers payload. */
export type Answers = SubmittedAnswers;

/** Indicates whether the session earned a new raffle entitlement or reused an old one. */
export type EntitlementStatus = "new" | "existing";

/** Verification data returned after the backend finalizes quiz completion. */
export type GameCompletionEntitlement = {
  createdAt: string;
  status: EntitlementStatus;
  verificationCode: string;
};

/** Official completion record returned by the prototype fallback or backend. */
export type GameCompletionResult = {
  attemptNumber: number;
  completionId: string;
  entitlement: GameCompletionEntitlement;
  message: string;
  entitlementEligible: boolean;
  score: number;
};

/** Browser payload sent when the player finishes a quiz attempt. */
export type SubmitGameCompletionInput = {
  answers: Answers;
  durationMs: number;
  eventId: string;
  requestId: string;
};
