import { normalizeOptionIds } from "./answers.ts";
import { parseSourceLine } from "./questionNarrative.ts";
import type { GameConfig, Question } from "./types.ts";

/** Throws immediately when sample data reuses an identifier that must be unique. */
function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: ${value}`);
    }

    seen.add(value);
  }
}

/**
 * Rejects source lines that cannot be rendered safely.
 *
 * Two grounds, and the second is the one that is easy to miss. Refusing only
 * the targets inside recognised link markup leaves a hole: an unclosed link
 * matches no markup at all, falls through to the renderer's plain-text path,
 * and prints its address on screen. Authoring-time rejection is what closes
 * it; the renderer's degrade path cannot.
 *
 * Neither message repeats the offending text back. In the hostile case it is
 * attacker-supplied and the message surfaces in the admin UI; in the realistic
 * case the author needs to know the fix, not what they typed.
 */
function assertSourcesRenderable(question: Question, gameId: string) {
  (question.sources ?? []).forEach((line, index) => {
    const position = `source ${index + 1}`;

    if (!line.trim()) {
      throw new Error(
        `Question "${question.id}" in game "${gameId}" ${position} must not be blank.`,
      );
    }

    const { bareAddresses, rejectedLinkTargets } = parseSourceLine(line);

    if (rejectedLinkTargets.length > 0) {
      throw new Error(
        `Question "${question.id}" in game "${gameId}" ${position} links to an unsupported target. Use an http or https address.`,
      );
    }

    if (bareAddresses.length > 0) {
      throw new Error(
        `Question "${question.id}" in game "${gameId}" ${position} has a web address outside a link. Write it as [Title](address).`,
      );
    }
  });
}

/** Validates a single game config regardless of where its content originated. */
export function validateGameConfig(game: GameConfig) {
  if (game.questions.length === 0) {
    throw new Error(`Game "${game.id}" must include at least one question.`);
  }

  assertUnique(
    game.questions.map((question) => question.id),
    `question id in game "${game.id}"`,
  );

  for (const question of game.questions) {
    if (question.options.length === 0) {
      throw new Error(
        `Question "${question.id}" in game "${game.id}" must include at least one option.`,
      );
    }

    if (question.correctAnswerIds.length === 0) {
      throw new Error(
        `Question "${question.id}" in game "${game.id}" must include at least one correct answer.`,
      );
    }

    if (
      question.selectionMode === "single" &&
      normalizeOptionIds(question.correctAnswerIds).length !== 1
    ) {
      throw new Error(
        `Single-select question "${question.id}" in game "${game.id}" must have exactly one correct answer.`,
      );
    }

    assertUnique(
      question.options.map((option) => option.id),
      `option id in question "${question.id}"`,
    );

    const optionIds = new Set(question.options.map((option) => option.id));

    for (const correctAnswerId of question.correctAnswerIds) {
      if (!optionIds.has(correctAnswerId)) {
        throw new Error(
          `Question "${question.id}" in game "${game.id}" references unknown correct answer "${correctAnswerId}".`,
        );
      }
    }

    assertSourcesRenderable(question, game.id);
  }
}

/** Validates a whole game collection before collection-level lookups are built. */
export function validateGames(games: GameConfig[]) {
  assertUnique(
    games.map((game) => game.id),
    "game id",
  );
  assertUnique(
    games.map((game) => game.slug),
    "game slug",
  );
  games.forEach(validateGameConfig);
}
