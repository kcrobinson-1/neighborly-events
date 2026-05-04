import { assertEquals } from "jsr:@std/assert@1";
import type {
  ReverseEntitlementRedemptionRequest,
  ReverseEntitlementRedemptionRpcResponse,
} from "../../../shared/redemption.ts";
import type { DemoModeRejectionBody } from "../../../supabase/functions/_shared/demo-mode-rejection.ts";
import {
  createReverseEntitlementRedemptionHandler,
  defaultReverseHandlerDependencies,
  validateReversePayload,
} from "../../../supabase/functions/reverse-entitlement-redemption/index.ts";
import { createOriginRequest } from "./helpers.ts";

const noopEvaluateDemoModeRejection = async (): Promise<
  DemoModeRejectionBody | null
> => null;

Deno.test("validateReversePayload trims ids, normalizes blank reasons, and requires a 4-digit suffix", () => {
  assertEquals(
    validateReversePayload({
      codeSuffix: " 0427 ",
      eventId: " event-1 ",
      reason: " accidental tap ",
    }),
    {
      codeSuffix: "0427",
      eventId: "event-1",
      reason: "accidental tap",
    },
  );

  assertEquals(
    validateReversePayload({
      codeSuffix: "0427",
      eventId: "event-1",
      reason: "   ",
    }),
    {
      codeSuffix: "0427",
      eventId: "event-1",
      reason: null,
    },
  );

  assertEquals(
    validateReversePayload({
      codeSuffix: "42A7",
      eventId: "event-1",
    }),
    null,
  );
  assertEquals(
    validateReversePayload({
      codeSuffix: "0427",
      eventId: "event-1",
      reason: 42,
    }),
    null,
  );
  assertEquals(validateReversePayload({ codeSuffix: "0427", eventId: 1 }), null);
});

Deno.test("reverse-entitlement-redemption rejects unsupported methods after the origin gate", async () => {
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
  });

  const response = await handler(createOriginRequest("https://example.com"));

  assertEquals(response.status, 405);
  assertEquals(await response.json(), { error: "Method not allowed." });
});

Deno.test("reverse-entitlement-redemption returns the shared CORS response for OPTIONS", async () => {
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
  });

  const response = await handler(
    createOriginRequest("https://example.com", { method: "OPTIONS" }),
  );

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:4173");
});

Deno.test("reverse-entitlement-redemption rejects disallowed origins before auth", async () => {
  let authCalls = 0;
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    authenticateRedemptionOperator: async () => {
      authCalls += 1;
      return {
        status: "ok",
        token: "user-token",
        userId: "user-1",
      };
    },
    getAllowedOrigin: () => null,
  });

  const response = await handler(
    createOriginRequest("https://example.com", { method: "POST" }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), { error: "Origin not allowed." });
  assertEquals(authCalls, 0);
});

Deno.test("reverse-entitlement-redemption rejects missing server config", async () => {
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getSupabaseClientKey: () => undefined,
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ codeSuffix: "0427", eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    error: "Server-side redemption configuration is missing.",
  });
});

Deno.test("reverse-entitlement-redemption returns 401 when operator auth is missing or invalid", async () => {
  const cases = [
    "Operator authentication is required.",
    "Operator authentication is invalid.",
  ];

  for (const message of cases) {
    const handler = createReverseEntitlementRedemptionHandler({
      ...defaultReverseHandlerDependencies,
      authenticateRedemptionOperator: async () => ({
        error: message,
        status: "unauthenticated",
      }),
      getAllowedOrigin: () => "http://127.0.0.1:4173",
      getServiceRoleKey: () => "service-role-key",
      getSupabaseClientKey: () => "publishable-key",
      getSupabaseUrl: () => "http://127.0.0.1:54321",
      evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    });

    const response = await handler(
      createOriginRequest("https://example.com", {
        body: JSON.stringify({ codeSuffix: "0427", eventId: "event-1" }),
        method: "POST",
      }),
    );

    assertEquals(response.status, 401);
    assertEquals(await response.json(), { error: message });
  }
});

Deno.test("reverse-entitlement-redemption rejects malformed payloads before persistence", async () => {
  let reverseCalls = 0;
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      status: "ok",
      token: "user-token",
      userId: "user-1",
    }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    reverseEntitlementRedemption: async () => {
      reverseCalls += 1;
      return { data: null, error: null };
    },
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ codeSuffix: "427", eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), {
    error: "Invalid redemption reversal payload.",
  });
  assertEquals(reverseCalls, 0);
});

Deno.test("reverse-entitlement-redemption returns 200 for reverse success outcomes", async () => {
  const outcomes: ReverseEntitlementRedemptionRpcResponse[] = [
    {
      outcome: "success",
      result: "already_unredeemed",
    },
    {
      outcome: "success",
      reversed_at: "2026-04-21T12:30:00.000Z",
      reversed_by_role: "organizer",
      result: "reversed_now",
    },
  ];

  for (const outcome of outcomes) {
    const handler = createReverseEntitlementRedemptionHandler({
      ...defaultReverseHandlerDependencies,
      authenticateRedemptionOperator: async () => ({
        status: "ok",
        token: "user-token",
        userId: "user-1",
      }),
      getAllowedOrigin: () => "http://127.0.0.1:4173",
      getServiceRoleKey: () => "service-role-key",
      getSupabaseClientKey: () => "publishable-key",
      getSupabaseUrl: () => "http://127.0.0.1:54321",
      evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
      reverseEntitlementRedemption: async () => ({
        data: outcome,
        error: null,
      }),
    });

    const response = await handler(
      createOriginRequest("https://example.com", {
        body: JSON.stringify({
          codeSuffix: "0427",
          eventId: "event-1",
          reason: "accidental tap",
        }),
        method: "POST",
      }),
    );

    assertEquals(response.status, 200);
    assertEquals(await response.json(), outcome);
  }
});

Deno.test("reverse-entitlement-redemption maps RPC failure outcomes to HTTP statuses", async () => {
  const cases: Array<{
    expectedStatus: number;
    result: ReverseEntitlementRedemptionRpcResponse;
  }> = [
    {
      expectedStatus: 403,
      result: { outcome: "failure", result: "not_authorized" },
    },
    {
      expectedStatus: 404,
      result: { outcome: "failure", result: "not_found" },
    },
    {
      expectedStatus: 500,
      result: { outcome: "failure", result: "internal_error" },
    },
  ];

  for (const testCase of cases) {
    const handler = createReverseEntitlementRedemptionHandler({
      ...defaultReverseHandlerDependencies,
      authenticateRedemptionOperator: async () => ({
        status: "ok",
        token: "user-token",
        userId: "user-1",
      }),
      getAllowedOrigin: () => "http://127.0.0.1:4173",
      getServiceRoleKey: () => "service-role-key",
      getSupabaseClientKey: () => "publishable-key",
      getSupabaseUrl: () => "http://127.0.0.1:54321",
      evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
      reverseEntitlementRedemption: async () => ({
        data: testCase.result,
        error: null,
      }),
    });

    const response = await handler(
      createOriginRequest("https://example.com", {
        body: JSON.stringify({ codeSuffix: "0427", eventId: "event-1" }),
        method: "POST",
      }),
    );

    assertEquals(response.status, testCase.expectedStatus);
    assertEquals(await response.json(), {
      details: testCase.result.result,
      error: "Redemption reversal failed.",
    });
  }
});

Deno.test("reverse-entitlement-redemption treats persistence errors and null-data paths as internal errors", async () => {
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      status: "ok",
      token: "user-token",
      userId: "user-1",
    }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    reverseEntitlementRedemption: async () => ({
      data: null,
      error: { message: "rpc failed" },
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ codeSuffix: "0427", eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    details: "internal_error",
    error: "Redemption reversal failed.",
  });
});

Deno.test("reverse-entitlement-redemption forwards trimmed input and the caller token into the RPC client dependency", async () => {
  let capturedInput: ReverseEntitlementRedemptionRequest | null = null;
  let capturedKey: string | null = null;
  let capturedToken: string | null = null;
  let capturedUrl: string | null = null;
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      status: "ok",
      token: "user-token",
      userId: "user-1",
    }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    reverseEntitlementRedemption: async (
      input,
      token,
      supabaseUrl,
      supabaseClientKey,
    ) => {
      capturedInput = input;
      capturedKey = supabaseClientKey;
      capturedToken = token;
      capturedUrl = supabaseUrl;

      return {
        data: {
          outcome: "success",
          reversed_at: "2026-04-21T12:30:00.000Z",
          reversed_by_role: "root_admin",
          result: "reversed_now",
        },
        error: null,
      };
    },
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        codeSuffix: " 0427 ",
        eventId: " event-1 ",
        reason: " accidental tap ",
      }),
      headers: {
        Authorization: "Bearer ignored-by-stub",
      },
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(capturedInput, {
    codeSuffix: "0427",
    eventId: "event-1",
    reason: "accidental tap",
  });
  assertEquals(capturedToken, "user-token");
  assertEquals(capturedUrl, "http://127.0.0.1:54321");
  assertEquals(capturedKey, "publishable-key");
});

Deno.test("reverse-entitlement-redemption returns the demo-mode 403 short-circuit before authentication when helper rejects", async () => {
  let authCalls = 0;
  let reverseCalls = 0;
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    authenticateRedemptionOperator: async () => {
      authCalls += 1;
      throw new Error(
        "authenticateRedemptionOperator should not be called once the demo-mode helper rejects",
      );
    },
    evaluateDemoModeRejection: async () => ({
      error: "demo_mode_read_only",
      message: "Demo mode — sign in to make changes.",
    }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    reverseEntitlementRedemption: async () => {
      reverseCalls += 1;
      return { data: null, error: null };
    },
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ codeSuffix: "0427", eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "demo_mode_read_only",
    message: "Demo mode — sign in to make changes.",
  });
  assertEquals(authCalls, 0);
  assertEquals(reverseCalls, 0);
});

Deno.test("reverse-entitlement-redemption preserves the existing 401 when the demo-mode helper defers (anon caller on a non-allowlist slug)", async () => {
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      error: "Operator authentication is required.",
      status: "unauthenticated",
    }),
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ codeSuffix: "0427", eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 401);
  assertEquals(await response.json(), {
    error: "Operator authentication is required.",
  });
});

Deno.test("reverse-entitlement-redemption falls through to the existing auth gate when the demo-mode helper defers (signed-in caller on an allowlist slug)", async () => {
  let authCalls = 0;
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    authenticateRedemptionOperator: async () => {
      authCalls += 1;
      return {
        status: "ok",
        token: "user-token",
        userId: "user-1",
      };
    },
    evaluateDemoModeRejection: noopEvaluateDemoModeRejection,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    reverseEntitlementRedemption: async () => ({
      data: {
        outcome: "success",
        reversed_at: "2026-05-03T12:30:00.000Z",
        reversed_by_role: "organizer",
        result: "reversed_now",
      },
      error: null,
    }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ codeSuffix: "0427", eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(authCalls, 1);
});

Deno.test("reverse-entitlement-redemption surfaces the payload-validation 400 for an anon caller with an invalid payload (newly exposed by parse-then-auth reorder)", async () => {
  let authCalls = 0;
  let demoCalls = 0;
  const handler = createReverseEntitlementRedemptionHandler({
    ...defaultReverseHandlerDependencies,
    authenticateRedemptionOperator: async () => {
      authCalls += 1;
      throw new Error(
        "authenticateRedemptionOperator should not be called when payload validation rejects first",
      );
    },
    evaluateDemoModeRejection: async () => {
      demoCalls += 1;
      throw new Error(
        "evaluateDemoModeRejection should not be called when payload validation rejects first",
      );
    },
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ codeSuffix: "42A", eventId: "event-1" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), {
    error: "Invalid redemption reversal payload.",
  });
  assertEquals(authCalls, 0);
  assertEquals(demoCalls, 0);
});
