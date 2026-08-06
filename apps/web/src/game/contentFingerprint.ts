import type { GameConfig } from "../data/games";

/**
 * Canonical fingerprint of the grading-relevant question content: prompts,
 * selection modes, correct answers, option ids and labels, and feedback
 * mode. Options and correct-answer ids are sorted so the per-attempt
 * shuffle does not affect the value; question order stays significant.
 * Cosmetic-only fields outside grading (intro, summary, sponsor facts) are
 * deliberately excluded so copy tweaks do not discard attendee progress.
 *
 * Lives in its own env-free module (no storage or Supabase imports) so the
 * Playwright suite can compute fingerprints Node-side when seeding
 * persistence snapshots.
 */
export function computeContentFingerprint(game: GameConfig): string {
  return JSON.stringify([
    game.feedbackMode,
    game.questions.map((question) => [
      question.id,
      question.prompt,
      question.selectionMode,
      [...question.correctAnswerIds].sort(),
      [...question.options]
        .sort((left, right) => left.id.localeCompare(right.id))
        .map((option) => [option.id, option.label]),
    ]),
  ]);
}
