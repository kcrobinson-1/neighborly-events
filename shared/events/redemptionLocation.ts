/**
 * Per-event registry naming the place an attendee takes their
 * check-in code. Content-shaped, like `completionCta.ts`,
 * `quizPageHead.ts`, and the per-event Theme registry — it catalogs
 * launch content, not policy.
 *
 * This exists because the place had three names. The quiz page head
 * said "the booth", the completion heading said "the volunteer
 * table", and the check-in code's instruction said "the volunteer" —
 * three surfaces, one physical table, and volunteers and printed
 * signage have to agree with whatever a player reads. Two of those
 * strings lived in `GameCompletionPanel`, which is the platform
 * renderer shared by every event, so the fix could not be a string
 * swap: other events redeem somewhere else entirely (riverside-jam's
 * content names the harbor stage bar). The name is event-owned
 * content, so it lives in a registry the renderer reads.
 *
 * Absent slugs resolve `null` and every consumer keeps its
 * pre-registry generic wording, so events without an entry render
 * exactly as before.
 *
 * Madrona's entry composes from `madrona-facts.ts` rather than
 * restating the booth name, because that module is already the one
 * place the booth is named for the landing page and the game seed —
 * and the drift this registry exists to fix is what happens when a
 * surface restates it instead.
 */

import { madronaFacts } from "./madrona-facts.ts";

/** How one event names its check-in location. */
export type RedemptionLocationContent = {
  /**
   * The location as it appears mid-sentence, article included, so
   * copy can drop it into "Show this screen at ___" without the
   * renderer guessing at "the" — some events redeem at a named bar
   * or tent where the article would be wrong.
   */
  name: string;
};

/**
 * Exported so `quizPageHead.ts` can compose its reward line from the
 * same value the completion panel resolves at runtime, without a
 * slug lookup and a fallback for a constant this module owns.
 */
export const madronaRedemptionLocation: RedemptionLocationContent = {
  name: `the ${madronaFacts.booth.shortName}`,
};

/** Slug → redemption location. Absent slugs keep generic wording. */
export const redemptionLocationBySlug: Record<
  string,
  RedemptionLocationContent
> = {
  "madrona": madronaRedemptionLocation,
  // The local-prototype demo fixture of the Madrona experience mirrors
  // the madrona entry, matching `completionCta.ts` and
  // `quizPageHead.ts`, so a reviewer on a bare Vite dev server sees
  // the copy that actually ships rather than a placeholder.
  "first-sample": madronaRedemptionLocation,
};

/** Resolves an event's redemption location, if it registers one. */
export function getRedemptionLocation(
  slug: string,
): RedemptionLocationContent | null {
  return redemptionLocationBySlug[slug] ?? null;
}
