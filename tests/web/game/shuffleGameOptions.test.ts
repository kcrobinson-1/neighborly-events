import { describe, expect, it } from "vitest";
import type { GameConfig } from "../../../apps/web/src/data/games.ts";
import {
  shuffleGameOptions,
  type RandomFn,
} from "../../../apps/web/src/game/shuffleGameOptions.ts";

/** Small deterministic LCG so tests can pin an exact permutation. */
function createSeededRandom(seed: number): RandomFn {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function createGame(): GameConfig {
  return {
    id: "test-shuffle",
    slug: "test-shuffle",
    name: "Test Shuffle",
    location: "Seattle",
    estimatedMinutes: 2,
    entitlementLabel: "reward ticket",
    intro: "Test intro",
    summary: "Test summary",
    feedbackMode: "final_score_reveal",
    questions: [
      {
        id: "q1",
        sponsor: "Sponsor One",
        prompt: "Question one?",
        selectionMode: "single",
        correctAnswerIds: ["a"],
        explanation: "Explanation one.",
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
          { id: "c", label: "Option C" },
          { id: "d", label: "Option D" },
        ],
      },
      {
        id: "q2",
        sponsor: null,
        prompt: "Question two?",
        selectionMode: "multiple",
        correctAnswerIds: ["a", "c"],
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
          { id: "c", label: "Option C" },
        ],
      },
    ],
  };
}

describe("shuffleGameOptions", () => {
  it("permutes each question's options without adding, dropping, or editing any", () => {
    const game = createGame();
    const shuffled = shuffleGameOptions(game, createSeededRandom(7));

    expect(shuffled.questions).toHaveLength(game.questions.length);

    shuffled.questions.forEach((question, index) => {
      const source = game.questions[index];

      // Bijection over the same option set: same members, possibly new order.
      expect([...question.options].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
        [...source.options].sort((a, b) => a.id.localeCompare(b.id)),
      );
      expect(new Set(question.options.map((option) => option.id)).size).toBe(
        source.options.length,
      );
    });
  });

  it("leaves correctAnswerIds and every non-option field untouched", () => {
    const game = createGame();
    const shuffled = shuffleGameOptions(game, createSeededRandom(7));

    shuffled.questions.forEach((question, index) => {
      const source = game.questions[index];
      expect(question.correctAnswerIds).toBe(source.correctAnswerIds);
      expect({ ...question, options: undefined }).toEqual({
        ...source,
        options: undefined,
      });
    });

    expect({ ...shuffled, questions: undefined }).toEqual({
      ...game,
      questions: undefined,
    });
  });

  it("is deterministic under a fixed seed", () => {
    const game = createGame();

    const first = shuffleGameOptions(game, createSeededRandom(42));
    const second = shuffleGameOptions(game, createSeededRandom(42));

    expect(first.questions.map((question) => question.options.map((o) => o.id))).toEqual(
      second.questions.map((question) => question.options.map((o) => o.id)),
    );
  });

  it("produces a non-authored order for a known random sequence", () => {
    const game = createGame();

    // random() === 0 swaps every position toward index 0, so the authored
    // order cannot survive for any question with two or more options.
    const shuffled = shuffleGameOptions(game, () => 0);

    expect(shuffled.questions[0].options.map((option) => option.id)).not.toEqual(
      game.questions[0].options.map((option) => option.id),
    );
    expect(shuffled.questions[1].options.map((option) => option.id)).not.toEqual(
      game.questions[1].options.map((option) => option.id),
    );
  });

  it("never mutates the source config", () => {
    const game = createGame();
    const authoredOptionIds = game.questions.map((question) =>
      question.options.map((option) => option.id),
    );

    const shuffled = shuffleGameOptions(game, createSeededRandom(9));

    expect(shuffled).not.toBe(game);
    expect(shuffled.questions).not.toBe(game.questions);
    shuffled.questions.forEach((question, index) => {
      expect(question.options).not.toBe(game.questions[index].options);
    });
    expect(
      game.questions.map((question) => question.options.map((option) => option.id)),
    ).toEqual(authoredOptionIds);
  });
});
