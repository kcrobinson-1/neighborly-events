/**
 * Per-event heading for the quiz intro panel in apps/web.
 * Content-shaped, like `completionCta.ts`, `redemptionLocation.ts`,
 * and the per-event Theme registry — it catalogs launch content, not
 * policy.
 *
 * The heading is event-owned because no platform template can write
 * it. The page title above the panel is the event's `name` ("Madrona
 * Music in the Playfield"), which names the concert series, not the
 * quiz — so a derived "Take the <name> quiz" would read as the wrong
 * invitation at the wrong length. The event says what to call its own
 * quiz.
 *
 * This replaces a platform-authored heading that composed the
 * entitlement label ("Finish to earn your reward"). That one restated
 * the reward a third time on a screen that had already promised it in
 * the page-head subtext and again in the event's intro paragraph, and
 * being written once for every event, no event could make it say
 * anything true of itself.
 *
 * Absent slugs render no heading, so events without an entry are
 * unaffected — the panel is then the intro paragraph and the start
 * button, which is what every event rendered before this registry.
 */

/** How one event titles its quiz intro panel. */
export type QuizIntroContent = {
  /** Heading shown above the event's `intro` paragraph. */
  heading: string;
};

const madronaQuizIntro: QuizIntroContent = {
  heading: "Take the Madrona Quiz",
};

/** Slug → intro-panel heading. Absent slugs render no heading. */
export const quizIntroBySlug: Record<string, QuizIntroContent> = {
  "madrona": madronaQuizIntro,
  // The local-prototype demo fixture of the Madrona experience mirrors
  // the madrona entry, matching `completionCta.ts` and
  // `redemptionLocation.ts`, so a reviewer on a bare Vite dev server
  // sees the copy that actually ships rather than a placeholder.
  "first-sample": madronaQuizIntro,
};

/** Resolves an event's intro-panel heading, if it registers one. */
export function getQuizIntro(slug: string): QuizIntroContent | null {
  return quizIntroBySlug[slug] ?? null;
}
