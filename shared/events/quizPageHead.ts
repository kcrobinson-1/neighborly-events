/**
 * Per-event quiz page-head copy registry for apps/web's `GamePage`.
 * Content-shaped, like `completionCta.ts` and the per-event Theme
 * registry: it catalogs launch content, not policy.
 *
 * The page-head subtext pairs a config-derived question count with a
 * reward line naming the event's redemption location ("Show your
 * code at the MNA booth…"). The location is event-owned content —
 * other events direct attendees elsewhere (riverside-jam's content
 * names the harbor stage bar) — so the line renders only for slugs
 * registered here; absent slugs render no subtext, matching the
 * pre-registry page-head exactly.
 *
 * The location name itself comes from `redemptionLocation.ts` rather
 * than being written out here. This line used to say "the booth"
 * while the completion screen said "the volunteer table" — one table,
 * two names, and volunteers and printed signage have to match what a
 * player reads. Composing both from one registry is what keeps them
 * from drifting apart again.
 *
 * `first-sample` is the local-prototype demo fixture of the Madrona
 * experience and mirrors the `madrona` entry (see the rationale in
 * `completionCta.ts`).
 */

import { madronaRedemptionLocation } from "./redemptionLocation.ts";

/** Quiz page-head copy for a single event. */
export type QuizPageHeadContent = {
  /**
   * Sentence naming where to redeem the code, appended after the
   * question-count lead ("Eight questions. <rewardLine>").
   */
  rewardLine: string;
};

const madronaQuizPageHead: QuizPageHeadContent = {
  rewardLine:
    `Show your code at ${madronaRedemptionLocation.name} when you're done to claim a reward.`,
};

/** Slug → quiz page-head copy. Absent slugs render no subtext. */
export const quizPageHeadBySlug: Record<string, QuizPageHeadContent> = {
  "madrona": madronaQuizPageHead,
  "first-sample": madronaQuizPageHead,
};

/** Resolves the quiz page-head copy for an event slug, if any. */
export function getQuizPageHead(slug: string): QuizPageHeadContent | null {
  return quizPageHeadBySlug[slug] ?? null;
}
