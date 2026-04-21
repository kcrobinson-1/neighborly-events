import { assertEquals } from "jsr:@std/assert@1";
import type {
  RedeemEntitlementRequest,
  RedeemEntitlementRpcResponse,
} from "../../../shared/redemption.ts";
import {
  createRedeemEntitlementHandler,
  defaultRedeemHandlerDependencies,
  validateRedeemPayload,
} from "../../../supabase/functions/redeem-entitlement/index.ts";
import { createOriginRequest } from "./helpers.ts";

Deno.test("validateRedeemPayload trims ids and requires a 4-digit suffix", () => {
  assertEquals(
    validateRedeemPayload({
      codeSuffix: " 0427 ",
      eventId: " event-1 ",
    }),
    {
      codeSuffix: "0427",
      eventId: "event-1",
    },
  );

  assertEquals(
    validateRedeemPayload({
      codeSuffix: "42A7",
      eventId: "event-1",
    }),
    null,
  );
  assertEquals(validateRedeemPayload(null), null);
});

Deno.test("redeem-entitlement rejects unsupported methods after the origin gate", async () => {
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
  });

  const response = await handler(createOriginRequest("https://example.com"));

  assertEquals(response.status, 405);
  assertEquals(await response.json(), { error: "Method not allowed." });
});

Deno.test("redeem-entitlement returns the shared CORS response for OPTIONS", async () => {
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
  });

  const response = await handler(
    createOriginRequest("https://example.com", { method: "OPTIONS" }),
  );

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("access-control-allow-origin"), "http://127.0.0.1:4173");
});

Deno.test("redeem-entitlement rejects disallowed origins before auth", async () => {
  let authCalls = 0;
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
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
    createOriginRequest("https://example.com", {
      method: "POST",
    }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), { error: "Origin not allowed." });
  assertEquals(authCalls, 0);
});

Deno.test("redeem-entitlement rejects missing server config", async () => {
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => undefined,
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

Deno.test("redeem-entitlement returns 401 when operator auth is missing", async () => {
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      error: "Operator authentication is required.",
      status: "unauthenticated",
    }),
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

Deno.test("redeem-entitlement returns 401 when operator auth is invalid", async () => {
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      error: "Operator authentication is invalid.",
      status: "unauthenticated",
    }),
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
    error: "Operator authentication is invalid.",
  });
});

Deno.test("redeem-entitlement rejects malformed payloads before persistence", async () => {
  let redeemCalls = 0;
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      status: "ok",
      token: "user-token",
      userId: "user-1",
    }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    redeemEntitlement: async () => {
      redeemCalls += 1;
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
  assertEquals(await response.json(), { error: "Invalid redeem payload." });
  assertEquals(redeemCalls, 0);
});

Deno.test("redeem-entitlement returns 200 for redeem success outcomes", async () => {
  const outcomes: RedeemEntitlementRpcResponse[] = [
    {
      outcome: "success",
      redeemed_at: "2026-04-21T12:00:00.000Z",
      redeemed_by_role: "agent",
      result: "redeemed_now",
    },
    {
      outcome: "success",
      redeemed_at: "2026-04-21T12:00:00.000Z",
      redeemed_by_role: "root_admin",
      result: "already_redeemed",
    },
  ];

  for (const outcome of outcomes) {
    const handler = createRedeemEntitlementHandler({
      ...defaultRedeemHandlerDependencies,
      authenticateRedemptionOperator: async () => ({
        status: "ok",
        token: "user-token",
        userId: "user-1",
      }),
      getAllowedOrigin: () => "http://127.0.0.1:4173",
      getServiceRoleKey: () => "service-role-key",
      getSupabaseClientKey: () => "publishable-key",
      getSupabaseUrl: () => "http://127.0.0.1:54321",
      redeemEntitlement: async () => ({
        data: outcome,
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
    assertEquals(await response.json(), outcome);
  }
});

Deno.test("redeem-entitlement maps RPC failure outcomes to HTTP statuses", async () => {
  const cases: Array<{
    expectedStatus: number;
    result: RedeemEntitlementRpcResponse;
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
    const handler = createRedeemEntitlementHandler({
      ...defaultRedeemHandlerDependencies,
      authenticateRedemptionOperator: async () => ({
        status: "ok",
        token: "user-token",
        userId: "user-1",
      }),
      getAllowedOrigin: () => "http://127.0.0.1:4173",
      getServiceRoleKey: () => "service-role-key",
      getSupabaseClientKey: () => "publishable-key",
      getSupabaseUrl: () => "http://127.0.0.1:54321",
      redeemEntitlement: async () => ({
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
      error: "Redemption request failed.",
    });
  }
});

Deno.test("redeem-entitlement treats persistence errors and null-data paths as internal errors", async () => {
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      status: "ok",
      token: "user-token",
      userId: "user-1",
    }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    redeemEntitlement: async () => ({
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
    error: "Redemption request failed.",
  });
});

Deno.test("redeem-entitlement forwards the caller bearer token into the RPC client dependency", async () => {
  let capturedInput: RedeemEntitlementRequest | null = null;
  let capturedKey: string | null = null;
  let capturedToken: string | null = null;
  let capturedUrl: string | null = null;
  const handler = createRedeemEntitlementHandler({
    ...defaultRedeemHandlerDependencies,
    authenticateRedemptionOperator: async () => ({
      status: "ok",
      token: "user-token",
      userId: "user-1",
    }),
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    redeemEntitlement: async (input, token, supabaseUrl, supabaseClientKey) => {
      capturedInput = input;
      capturedKey = supabaseClientKey;
      capturedToken = token;
      capturedUrl = supabaseUrl;

      return {
        data: {
          outcome: "success",
          redeemed_at: "2026-04-21T12:00:00.000Z",
          redeemed_by_role: "agent",
          result: "redeemed_now",
        },
        error: null,
      };
    },
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ codeSuffix: "0427", eventId: "event-1" }),
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
  });
  assertEquals(capturedToken, "user-token");
  assertEquals(capturedUrl, "http://127.0.0.1:54321");
  assertEquals(capturedKey, "publishable-key");
});
