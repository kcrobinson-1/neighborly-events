import {
  assertEquals,
  assertExists,
} from "jsr:@std/assert@1";
import {
  normalizeSubmittedAnswers,
  scoreAnswers,
} from "../../../shared/game-config.ts";
import { getGameById } from "../../../shared/game-config/sample-fixtures.ts";
import {
  createCompleteGameHandler,
  defaultCompleteGameHandlerDependencies,
  validateCompletionPayload,
} from "../../../supabase/functions/complete-game/index.ts";
import { createOriginRequest } from "./helpers.ts";

const sampleGame = getGameById("madrona-music-2026");

if (!sampleGame) {
  throw new Error("Expected the featured sample game to exist for trust-path tests.");
}

Deno.test("validateCompletionPayload trims ids and rejects malformed completion input", () => {
  assertEquals(
    validateCompletionPayload({
      answers: { q1: ["a"] },
      durationMs: 1200,
      eventId: " madrona-music-2026 ",
      requestId: " req-123 ",
    }),
    {
      answers: { q1: ["a"] },
      durationMs: 1200,
      eventId: "madrona-music-2026",
      requestId: "req-123",
    },
  );

  assertEquals(
    validateCompletionPayload({
      answers: { q1: [1] },
      durationMs: 1200,
      eventId: "madrona-music-2026",
      requestId: "req-123",
    }),
    null,
  );
  assertEquals(validateCompletionPayload(null), null);
});

Deno.test("complete-game rejects invalid sessions before touching persistence", async () => {
  let persistCalls = 0;
  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => sampleGame,
    persistCompletion: async () => {
      persistCalls += 1;
      return { data: null, error: null };
    },
    readVerifiedSession: async () => null,
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["a"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-123",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 401);
  assertEquals(await response.json(), { error: "Session is missing or invalid." });
  assertEquals(persistCalls, 0);
});

Deno.test("complete-game rejects answers that fail shared validation", async () => {
  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => sampleGame,
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["invalid-option"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-123",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 400);
  assertExists((await response.json()).error);
});

Deno.test("complete-game returns the stored completion for a replayed request id after content drift", async () => {
  let loadCalls = 0;
  let persistCalls = 0;
  let capturedLookup:
    | { eventId: string; requestId: string; sessionId: string }
    | null = null;

  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async (input) => {
      capturedLookup = input;

      return {
        data: {
          attempt_number: 2,
          completion_id: "cmp-stored",
          entitlement_created_at: "2026-04-05T12:00:00.000Z",
          entitlement_status: "existing",
          message:
            "You already earned your reward entitlement. This retake does not create another one.",
          entitlement_eligible: false,
          score: 5,
          verification_code: "TST-1234",
        },
        error: null,
      };
    },
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => {
      loadCalls += 1;
      return sampleGame;
    },
    persistCompletion: async () => {
      persistCalls += 1;
      return { data: null, error: null };
    },
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  // "drifted-option" would fail validateSubmittedAnswers against the current
  // published content; the stored completion must win before validation runs.
  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["drifted-option"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-replayed",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    attemptNumber: 2,
    completionId: "cmp-stored",
    entitlement: {
      createdAt: "2026-04-05T12:00:00.000Z",
      status: "existing",
      verificationCode: "TST-1234",
    },
    message:
      "You already earned your reward entitlement. This retake does not create another one.",
    entitlementEligible: false,
    score: 5,
  });
  assertEquals(capturedLookup, {
    eventId: sampleGame.id,
    requestId: "req-replayed",
    sessionId: "session-id",
  });
  assertEquals(loadCalls, 0);
  assertEquals(persistCalls, 0);
});

Deno.test("complete-game still rejects drifted answers for a new request id", async () => {
  let persistCalls = 0;

  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => sampleGame,
    persistCompletion: async () => {
      persistCalls += 1;
      return { data: null, error: null };
    },
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["drifted-option"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-brand-new",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 400);
  assertExists((await response.json()).error);
  assertEquals(persistCalls, 0);
});

Deno.test("complete-game returns a retryable 500 when the replay lookup fails", async () => {
  let persistCalls = 0;

  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({
      data: null,
      error: { message: "completion lookup query failed" },
    }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => sampleGame,
    persistCompletion: async () => {
      persistCalls += 1;
      return { data: null, error: null };
    },
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["a"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-lookup-error",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    details: "completion lookup query failed",
    error: "We couldn't finalize your entitlement right now.",
  });
  assertEquals(persistCalls, 0);
});

Deno.test("complete-game returns 400 when published content is missing or unpublished", async () => {
  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => null,
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["a"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-123",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: "Game event was not found." });
});

Deno.test("complete-game returns a 500 when the published content loader fails", async () => {
  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => {
      throw new Error("published content query failed");
    },
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["a"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-123",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    details: "published content query failed",
    error: "We couldn't load this game event right now.",
  });
});

Deno.test("complete-game persists the trusted normalized payload and clamped duration", async () => {
  let capturedInput:
    | {
      durationMs: number;
      eventId: string;
      normalizedAnswers: Record<string, string[]>;
      requestId: string;
      sessionId: string;
      trustedScore: number;
    }
    | null = null;

  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => sampleGame,
    persistCompletion: async (input) => {
      capturedInput = input;

      return {
        data: {
          attempt_number: 1,
          completion_id: "cmp-123",
          entitlement_created_at: "2026-04-05T12:00:00.000Z",
          entitlement_status: "new",
          message: "Show your code at the booth to claim your reward.",
          entitlement_eligible: true,
          score: input.trustedScore,
          verification_code: "TST-1234",
        },
        error: null,
      };
    },
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: {
          q1: ["a"],
          q2: ["b"],
          q3: ["b"],
          q4: ["a"],
          q5: ["b"],
          q6: ["a"],
        },
        durationMs: -14.7,
        eventId: sampleGame.id,
        requestId: "req-123",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    attemptNumber: 1,
    completionId: "cmp-123",
    entitlement: {
      createdAt: "2026-04-05T12:00:00.000Z",
      status: "new",
      verificationCode: "TST-1234",
    },
    message: "Show your code at the booth to claim your reward.",
    entitlementEligible: true,
    score: 6,
  });
  assertEquals(capturedInput, {
    durationMs: 0,
    eventId: sampleGame.id,
    normalizedAnswers: normalizeSubmittedAnswers(sampleGame, {
      q1: ["a"],
      q2: ["b"],
      q3: ["b"],
      q4: ["a"],
      q5: ["b"],
      q6: ["a"],
    }),
    requestId: "req-123",
    sessionId: "session-id",
    trustedScore: scoreAnswers(
      sampleGame,
      normalizeSubmittedAnswers(sampleGame, {
        q1: ["a"],
        q2: ["b"],
        q3: ["b"],
        q4: ["a"],
        q5: ["b"],
        q6: ["a"],
      }),
    ),
  });
});

Deno.test("complete-game returns a 500 when trusted persistence fails", async () => {
  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => sampleGame,
    persistCompletion: async () => ({
      data: null,
      error: { message: "rpc failed" },
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: {
          q1: ["a"],
          q2: ["b"],
          q3: ["b"],
          q4: ["a"],
          q5: ["b"],
          q6: ["a"],
        },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-123",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    details: "rpc failed",
    error: "We couldn't finalize your entitlement right now.",
  });
});

Deno.test("complete-game returns 503 when entitlement_code_exhausted", async () => {
  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => sampleGame,
    persistCompletion: async () => ({
      data: null,
      error: { message: "entitlement_code_exhausted" },
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["a"], q2: ["b"], q3: ["b"], q4: ["a"], q5: ["b"], q6: ["a"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-exhausted",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 503);
  assertEquals(await response.json(), {
    details: "entitlement_code_exhausted",
    error: "We couldn't finalize your entitlement right now.",
  });
});

Deno.test("complete-game returns 500 when event_code_missing", async () => {
  const handler = createCompleteGameHandler({
    ...defaultCompleteGameHandlerDependencies,
    findCompletionByRequestId: async () => ({ data: null, error: null }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadPublishedGameById: async () => sampleGame,
    persistCompletion: async () => ({
      data: null,
      error: { message: "event_code_missing" },
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-id",
      sessionToken: "session-token",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        answers: { q1: ["a"], q2: ["b"], q3: ["b"], q4: ["a"], q5: ["b"], q6: ["a"] },
        durationMs: 1200,
        eventId: sampleGame.id,
        requestId: "req-missing-code",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    details: "event_code_missing",
    error: "We couldn't finalize your entitlement right now.",
  });
});
