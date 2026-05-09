import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { FeedbackMode } from "../../../../shared/game-config.ts";
import { GameIntroPanel } from "../../../../apps/web/src/game/components/GameIntroPanel.tsx";
import type { GameConfig } from "../../../../apps/web/src/data/games.ts";

function createGame(feedbackMode: FeedbackMode): GameConfig {
  return {
    id: "test-game",
    slug: "test-game",
    name: "Test Game",
    location: "Seattle",
    estimatedMinutes: 2,
    entitlementLabel: "reward ticket",
    intro: "Test intro",
    summary: "Test summary",
    feedbackMode,
    questions: [
      {
        id: "q1",
        sponsor: "Sponsor One",
        prompt: "Question one?",
        selectionMode: "single",
        correctAnswerIds: ["b"],
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
    ],
  };
}

describe("GameIntroPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it.each<{ feedbackMode: FeedbackMode; expected: string }>([
    {
      feedbackMode: "final_score_reveal",
      expected: "See your score after the last question.",
    },
    {
      feedbackMode: "instant_feedback_required",
      expected:
        "Answer correctly to unlock the next question and a quick sponsor fact.",
    },
    {
      feedbackMode: "instant_feedback_non_blocking",
      expected: "See the answer right after each question.",
    },
  ])(
    "renders mode-specific intro copy for $feedbackMode",
    ({ feedbackMode, expected }) => {
      render(
        <GameIntroPanel
          game={createGame(feedbackMode)}
          isStartingSession={false}
          onStart={() => {}}
          startError={null}
        />,
      );

      expect(screen.getByText(expected)).toBeTruthy();
    },
  );
});
