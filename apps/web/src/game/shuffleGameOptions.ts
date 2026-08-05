/** Pure per-attempt answer-order shuffling for the attendee game flow. */
import type { AnswerOption, GameConfig } from "../data/games";

/** Uniform-random source in [0, 1); injectable so tests can pin a permutation. */
export type RandomFn = () => number;

/**
 * Returns a copy of the game with each question's options in a random order.
 *
 * Authored option order can leak the correct answer, so the playable config
 * gets a fresh permutation per attempt. Grading is id-based end to end, which
 * makes option order pure presentation: ids, labels, and `correctAnswerIds`
 * all pass through untouched, and the source config is never mutated.
 */
export function shuffleGameOptions(
  game: GameConfig,
  random: RandomFn = Math.random,
): GameConfig {
  return {
    ...game,
    questions: game.questions.map((question) => ({
      ...question,
      options: shuffleOptions(question.options, random),
    })),
  };
}

/** Fisher–Yates shuffle over a copy of the options array. */
function shuffleOptions(
  options: readonly AnswerOption[],
  random: RandomFn,
): AnswerOption[] {
  const shuffled = [...options];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}
