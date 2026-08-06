import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameConfig } from "../../../apps/web/src/data/games.ts";
import type { GameCompletionResult } from "../../../apps/web/src/types/game.ts";

const { mockReadActiveClientSessionId } = vi.hoisted(() => ({
  mockReadActiveClientSessionId: vi.fn(),
}));

// The session-identity resolver is env-coupled (Supabase config vs prototype
// fallback), so tests pin it directly; storage behavior stays real via jsdom.
vi.mock("../../../apps/web/src/lib/clientSessionId.ts", () => ({
  readActiveClientSessionId: mockReadActiveClientSessionId,
}));

import {
  applyOptionOrder,
  clearPersistedGameSnapshot,
  extractOptionOrder,
  readPersistedGameSnapshot,
  writePersistedGameSnapshot,
  type PersistedGameSnapshot,
} from "../../../apps/web/src/game/gameSessionPersistence.ts";

// Node's experimental webstorage global shadows jsdom's localStorage in the
// test runtime, so the suite installs the same in-memory Storage stand-in the
// gameApi tests use.
function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.has(key) ? values.get(key) ?? null : null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    get length() {
      return values.size;
    },
  };
}

function createGame(): GameConfig {
  return {
    id: "test-persisted",
    slug: "test-persisted",
    name: "Test Persisted",
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
        selectionMode: "single" as const,
        correctAnswerIds: ["b"],
        options: [
          { id: "a", label: "Option A" },
          { id: "b", label: "Option B" },
        ],
      },
      {
        id: "q2",
        sponsor: "Sponsor Two",
        prompt: "Question two?",
        selectionMode: "multiple" as const,
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

function createCompletionResult(): GameCompletionResult {
  return {
    attemptNumber: 1,
    completionId: "cmp-123",
    entitlement: {
      createdAt: "2026-08-06T12:00:00.000Z",
      status: "new",
      verificationCode: "MMP-1234",
    },
    message: "You're checked in for the reward.",
    entitlementEligible: true,
    score: 2,
  };
}

function createInProgressSnapshot(): PersistedGameSnapshot {
  return {
    answers: { q1: ["b"] },
    currentIndex: 1,
    kind: "in_progress",
    optionOrder: { q1: ["b", "a"], q2: ["c", "a", "b"] },
    startedAt: 1754500000000,
  };
}

const storageKey = "neighborly.game-session.v1.test-persisted";

describe("gameSessionPersistence", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: createMemoryStorage(),
    });
    mockReadActiveClientSessionId.mockReset();
    mockReadActiveClientSessionId.mockReturnValue("session-test");
  });

  it("round-trips an in-progress snapshot", () => {
    const game = createGame();
    const snapshot = createInProgressSnapshot();

    writePersistedGameSnapshot(game.id, snapshot);

    expect(readPersistedGameSnapshot(game)).toEqual(snapshot);
  });

  it("round-trips a completed snapshot", () => {
    const game = createGame();
    const snapshot: PersistedGameSnapshot = {
      answers: { q1: ["b"], q2: ["a", "c"] },
      completion: createCompletionResult(),
      kind: "complete",
    };

    writePersistedGameSnapshot(game.id, snapshot);

    expect(readPersistedGameSnapshot(game)).toEqual(snapshot);
  });

  it("neither reads nor writes without a client session identity", () => {
    const game = createGame();
    mockReadActiveClientSessionId.mockReturnValue(null);

    writePersistedGameSnapshot(game.id, createInProgressSnapshot());
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        clientSessionId: "session-test",
        savedAt: "2026-08-06T12:00:00.000Z",
        snapshot: createInProgressSnapshot(),
      }),
    );
    expect(readPersistedGameSnapshot(game)).toBeNull();
  });

  it("ignores a snapshot written by a different client session", () => {
    const game = createGame();

    writePersistedGameSnapshot(game.id, createInProgressSnapshot());
    mockReadActiveClientSessionId.mockReturnValue("session-other");

    expect(readPersistedGameSnapshot(game)).toBeNull();
  });

  it("ignores malformed stored values", () => {
    const game = createGame();

    window.localStorage.setItem(storageKey, "{not json");
    expect(readPersistedGameSnapshot(game)).toBeNull();

    window.localStorage.setItem(storageKey, JSON.stringify({ snapshot: 42 }));
    expect(readPersistedGameSnapshot(game)).toBeNull();
  });

  it("discards an in-progress snapshot when the question content drifted", () => {
    const game = createGame();
    const snapshot = createInProgressSnapshot();

    writePersistedGameSnapshot(game.id, {
      ...snapshot,
      optionOrder: { ...snapshot.optionOrder, q2: ["c", "a", "zz"] },
    });
    expect(readPersistedGameSnapshot(game)).toBeNull();

    writePersistedGameSnapshot(game.id, {
      ...snapshot,
      answers: { "q-removed": ["b"] },
    });
    expect(readPersistedGameSnapshot(game)).toBeNull();
  });

  it("discards an in-progress snapshot with an out-of-range index", () => {
    const game = createGame();

    writePersistedGameSnapshot(game.id, {
      ...createInProgressSnapshot(),
      currentIndex: 2,
    });

    expect(readPersistedGameSnapshot(game)).toBeNull();
  });

  it("keeps a completed snapshot even when question content drifted", () => {
    const game = createGame();
    const snapshot: PersistedGameSnapshot = {
      // The answer review degrades gracefully for unknown ids; the check-in
      // code must survive content republishes.
      answers: { "q-removed": ["x"] },
      completion: createCompletionResult(),
      kind: "complete",
    };

    writePersistedGameSnapshot(game.id, snapshot);

    expect(readPersistedGameSnapshot(game)).toEqual(snapshot);
  });

  it("clears the stored snapshot", () => {
    const game = createGame();

    writePersistedGameSnapshot(game.id, createInProgressSnapshot());
    clearPersistedGameSnapshot(game.id);

    expect(window.localStorage.getItem(storageKey)).toBeNull();
    expect(readPersistedGameSnapshot(game)).toBeNull();
  });

  it("extracts and re-applies a per-question option order", () => {
    const game = createGame();
    const order = { q1: ["b", "a"], q2: ["c", "a", "b"] };

    const reordered = applyOptionOrder(game, order);

    expect(
      reordered.questions.map((question) => question.options.map((o) => o.id)),
    ).toEqual([
      ["b", "a"],
      ["c", "a", "b"],
    ]);
    expect(extractOptionOrder(reordered)).toEqual(order);
    // The source config is never mutated.
    expect(game.questions[0].options.map((o) => o.id)).toEqual(["a", "b"]);
  });
});
