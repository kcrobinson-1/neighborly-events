import { assertEquals } from "jsr:@std/assert@1";
import {
  createGetRedemptionStatusHandler,
  defaultGetRedemptionStatusHandlerDependencies,
  validateGetRedemptionStatusPayload,
} from "../../../supabase/functions/get-redemption-status/index.ts";
import { createOriginRequest } from "./helpers.ts";

Deno.test("validateGetRedemptionStatusPayload trims ids and rejects malformed input", () => {
  assertEquals(
    validateGetRedemptionStatusPayload({ eventId: " event-1 " }),
    { eventId: "event-1" },
  );
  assertEquals(validateGetRedemptionStatusPayload({ eventId: "" }), null);
  assertEquals(validateGetRedemptionStatusPayload(null), null);
});

Deno.test("get-redemption-status rejects unsupported methods after the origin gate", async () => {
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
  });

  const response = await handler(createOriginRequest("https://example.com"));

  assertEquals(response.status, 405);
  assertEquals(await response.json(), { error: "Method not allowed." });
});

Deno.test("get-redemption-status returns the shared CORS response for OPTIONS", async () => {
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
  });

  const response = await handler(
    createOriginRequest("https://example.com", { method: "OPTIONS" }),
  );

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:4173");
});

Deno.test("get-redemption-status rejects disallowed origins before session lookup", async () => {
  let sessionReads = 0;
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => null,
    readVerifiedSession: async () => {
      sessionReads += 1;
      return {
        sessionId: "session-1",
        sessionToken: "token-1",
      };
    },
  });

  const response = await handler(
    createOriginRequest("https://example.com", { method: "POST" }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), { error: "Origin not allowed." });
  assertEquals(sessionReads, 0);
});

Deno.test("get-redemption-status rejects missing server config", async () => {
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getSigningSecret: () => undefined,
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    error: "Server-side redemption-status configuration is missing.",
  });
});

Deno.test("get-redemption-status rejects malformed payloads after session validation but before DB load", async () => {
  let sessionReads = 0;
  let loadCalls = 0;
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async () => {
      loadCalls += 1;
      return {
        data: null,
        error: null,
      };
    },
    readVerifiedSession: async () => {
      sessionReads += 1;
      return {
        sessionId: "session-1",
        sessionToken: "token-1",
      };
    },
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ eventId: "" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), {
    error: "Invalid redemption status payload.",
  });
  assertEquals(sessionReads, 1);
  assertEquals(loadCalls, 0);
});

Deno.test("get-redemption-status returns 401 when the signed session is missing or invalid", async () => {
  let loadCalls = 0;
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async () => {
      loadCalls += 1;
      return {
        data: null,
        error: null,
      };
    },
    readVerifiedSession: async () => null,
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 401);
  assertEquals(await response.json(), {
    error: "Session is missing or invalid.",
  });
  assertEquals(loadCalls, 0);
});

Deno.test("get-redemption-status returns 404 when the event-session pair has no entitlement", async () => {
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async () => ({
      data: null,
      error: null,
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-1",
      sessionToken: "token-1",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 404);
  assertEquals(await response.json(), {
    error: "Redemption status not found.",
  });
});

Deno.test("get-redemption-status returns 200 for an unredeemed entitlement", async () => {
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async () => ({
      data: {
        redeemed_at: null,
        redemption_reversed_at: null,
        redemption_status: "unredeemed",
        verification_code: "EVT-0427",
      },
      error: null,
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-1",
      sessionToken: "token-1",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    redeemedAt: null,
    redemptionReversedAt: null,
    redemptionStatus: "unredeemed",
    verificationCode: "EVT-0427",
  });
});

Deno.test("get-redemption-status returns 200 for a redeemed entitlement", async () => {
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async () => ({
      data: {
        redeemed_at: "2026-04-21T13:00:00.000Z",
        redemption_reversed_at: null,
        redemption_status: "redeemed",
        verification_code: "EVT-0427",
      },
      error: null,
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-1",
      sessionToken: "token-1",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    redeemedAt: "2026-04-21T13:00:00.000Z",
    redemptionReversedAt: null,
    redemptionStatus: "redeemed",
    verificationCode: "EVT-0427",
  });
});

Deno.test("get-redemption-status returns 200 for a reversed entitlement state snapshot", async () => {
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async () => ({
      data: {
        redeemed_at: null,
        redemption_reversed_at: "2026-04-21T13:10:00.000Z",
        redemption_status: "unredeemed",
        verification_code: "EVT-0427",
      },
      error: null,
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-1",
      sessionToken: "token-1",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    redeemedAt: null,
    redemptionReversedAt: "2026-04-21T13:10:00.000Z",
    redemptionStatus: "unredeemed",
    verificationCode: "EVT-0427",
  });
});

Deno.test("get-redemption-status enforces event scoping on the event-session lookup", async () => {
  let capturedEventId: string | null = null;
  let capturedSessionId: string | null = null;
  const handler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async (eventId, sessionId) => {
      capturedEventId = eventId;
      capturedSessionId = sessionId;

      return {
        data: null,
        error: null,
      };
    },
    readVerifiedSession: async () => ({
      sessionId: "session-1",
      sessionToken: "token-1",
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ eventId: "event-b" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 404);
  assertEquals(capturedEventId, "event-b");
  assertEquals(capturedSessionId, "session-1");
});

Deno.test("get-redemption-status treats query failures and malformed rows as 500", async () => {
  const originalConsoleError = console.error;
  const loggedErrors: string[] = [];
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map(String).join(" "));
  };

  const errorHandler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async () => ({
      data: null,
      error: { message: "query failed" },
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-1",
      sessionToken: "token-1",
    }),
  });

  const malformedRowHandler = createGetRedemptionStatusHandler({
    ...defaultGetRedemptionStatusHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSigningSecret: () => "session-secret",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadRedemptionStatus: async () => ({
      data: {
        redeemed_at: null,
        redemption_reversed_at: null,
        redemption_status: "unredeemed",
        verification_code: "",
      },
      error: null,
    }),
    readVerifiedSession: async () => ({
      sessionId: "session-1",
      sessionToken: "token-1",
    }),
  });

  try {
    for (const handler of [errorHandler, malformedRowHandler]) {
      const response = await handler(
        createOriginRequest("https://example.com", {
          body: JSON.stringify({ eventId: "event-1" }),
          method: "POST",
        }),
      );

      assertEquals(response.status, 500);
      assertEquals(await response.json(), {
        error: "Redemption status request failed.",
      });
    }
  } finally {
    console.error = originalConsoleError;
  }

  assertEquals(loggedErrors.length, 2);
  assertEquals(loggedErrors[0]?.includes("get-redemption-status query failed"), true);
  assertEquals(
    loggedErrors[1]?.includes("get-redemption-status returned malformed row"),
    true,
  );
});
