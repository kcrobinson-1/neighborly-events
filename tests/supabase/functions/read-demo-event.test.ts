import { assertEquals } from "jsr:@std/assert@1";
import {
  createReadDemoEventHandler,
  defaultReadDemoEventHandlerDependencies,
  type DemoAdminPayload,
  type DemoRedemptionRow,
  validateReadDemoEventPayload,
} from "../../../supabase/functions/read-demo-event/index.ts";
import { createOriginRequest } from "./helpers.ts";

const ALLOWED_ORIGIN = "http://127.0.0.1:4173";

const ADMIN_FIXTURE: DemoAdminPayload = {
  eventCode: "ABC",
  hasBeenPublished: true,
  id: "event-1",
  isLive: true,
  lastPublishedVersionNumber: 3,
  name: "Harvest Block Party",
  slug: "harvest-block-party",
  status: "live",
  updatedAt: "2026-04-21T13:00:00.000Z",
};

const REDEMPTIONS_FIXTURE: DemoRedemptionRow[] = [
  {
    event_id: "event-1",
    id: "row-2",
    redeemed_at: "2026-04-21T13:00:00.000Z",
    redeemed_by: "agent@example.com",
    redeemed_by_role: "agent",
    redemption_note: null,
    redemption_reversed_at: null,
    redemption_reversed_by: null,
    redemption_reversed_by_role: null,
    redemption_status: "redeemed",
    verification_code: "EVT-0002",
  },
  {
    event_id: "event-1",
    id: "row-1",
    redeemed_at: "2026-04-21T12:00:00.000Z",
    redeemed_by: "agent@example.com",
    redeemed_by_role: "agent",
    redemption_note: null,
    redemption_reversed_at: null,
    redemption_reversed_by: null,
    redemption_reversed_by_role: null,
    redemption_status: "redeemed",
    verification_code: "EVT-0001",
  },
];

function buildHandler(
  overrides: Partial<typeof defaultReadDemoEventHandlerDependencies> = {},
) {
  return createReadDemoEventHandler({
    ...defaultReadDemoEventHandlerDependencies,
    getAllowedOrigin: () => ALLOWED_ORIGIN,
    getServiceRoleKey: () => "service-role-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    loadAdminPayload: async () => ({ data: ADMIN_FIXTURE, error: null }),
    loadRedemptionsPayload: async () => ({
      data: REDEMPTIONS_FIXTURE,
      error: null,
    }),
    ...overrides,
  });
}

Deno.test("validateReadDemoEventPayload accepts well-formed admin and redemptions bodies", () => {
  assertEquals(
    validateReadDemoEventPayload({
      slug: "harvest-block-party",
      surface: "admin",
    }),
    { slug: "harvest-block-party", surface: "admin" },
  );
  assertEquals(
    validateReadDemoEventPayload({
      slug: " riverside-jam ",
      surface: "redemptions",
    }),
    { slug: "riverside-jam", surface: "redemptions" },
  );
});

Deno.test("validateReadDemoEventPayload rejects malformed shapes", () => {
  assertEquals(
    validateReadDemoEventPayload(null),
    { reason: "invalid_request_body" },
  );
  assertEquals(
    validateReadDemoEventPayload({}),
    { reason: "invalid_request_body" },
  );
  assertEquals(
    validateReadDemoEventPayload({ slug: "", surface: "admin" }),
    { reason: "invalid_request_body" },
  );
  assertEquals(
    validateReadDemoEventPayload({
      slug: "harvest-block-party",
      surface: "redeem",
    }),
    { reason: "invalid_request_body" },
  );
  assertEquals(
    validateReadDemoEventPayload({ surface: "admin" }),
    { reason: "invalid_request_body" },
  );
});

Deno.test("read-demo-event rejects disallowed origins before any other work", async () => {
  let adminLoads = 0;
  const handler = createReadDemoEventHandler({
    ...defaultReadDemoEventHandlerDependencies,
    getAllowedOrigin: () => null,
    loadAdminPayload: async () => {
      adminLoads += 1;
      return { data: ADMIN_FIXTURE, error: null };
    },
    loadRedemptionsPayload: async () => ({
      data: REDEMPTIONS_FIXTURE,
      error: null,
    }),
  });

  const response = await handler(
    createOriginRequest("https://evil.example", { method: "POST" }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), { error: "Origin not allowed." });
  assertEquals(adminLoads, 0);
});

Deno.test("read-demo-event answers OPTIONS with the shared CORS body", async () => {
  const handler = buildHandler();
  const response = await handler(
    createOriginRequest("https://example.com", { method: "OPTIONS" }),
  );

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("access-control-allow-origin"),
    ALLOWED_ORIGIN,
  );
});

Deno.test("read-demo-event rejects unsupported methods", async () => {
  const handler = buildHandler();
  const response = await handler(
    createOriginRequest("https://example.com", { method: "GET" }),
  );

  assertEquals(response.status, 405);
  assertEquals(await response.json(), { error: "Method not allowed." });
});

Deno.test("read-demo-event rejects missing server config with HTTP 500", async () => {
  const handler = createReadDemoEventHandler({
    ...defaultReadDemoEventHandlerDependencies,
    getAllowedOrigin: () => ALLOWED_ORIGIN,
    getServiceRoleKey: () => undefined,
    getSupabaseUrl: () => "http://127.0.0.1:54321",
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        slug: "harvest-block-party",
        surface: "admin",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), {
    error: "Server-side demo-mode read configuration is missing.",
  });
});

Deno.test("read-demo-event returns 400 invalid_request_body before the allowlist gate", async () => {
  let allowlistChecks = 0;
  const handler = buildHandler({
    isTestEventSlug: ((slug: string): slug is "harvest-block-party" |
      "riverside-jam" => {
      allowlistChecks += 1;
      return slug === "harvest-block-party" || slug === "riverside-jam";
    }) as typeof defaultReadDemoEventHandlerDependencies.isTestEventSlug,
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({ surface: "admin" }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 400);
  assertEquals(await response.json(), {
    error: "invalid_request_body",
    message:
      "Demo-mode read requires { slug: string, surface: \"admin\" | \"redemptions\" }.",
  });
  assertEquals(allowlistChecks, 0);
});

Deno.test("read-demo-event returns 403 not_in_demo_allowlist for non-test slugs", async () => {
  let adminLoads = 0;
  let redemptionsLoads = 0;
  const handler = buildHandler({
    loadAdminPayload: async () => {
      adminLoads += 1;
      return { data: ADMIN_FIXTURE, error: null };
    },
    loadRedemptionsPayload: async () => {
      redemptionsLoads += 1;
      return { data: REDEMPTIONS_FIXTURE, error: null };
    },
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        slug: "madrona-launch-day",
        surface: "admin",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 403);
  assertEquals(await response.json(), {
    error: "not_in_demo_allowlist",
    message: "Demo-mode reads are only available for test events.",
  });
  assertEquals(adminLoads, 0);
  assertEquals(redemptionsLoads, 0);
});

Deno.test("read-demo-event returns 200 with the admin payload for a test slug", async () => {
  const handler = buildHandler();
  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        slug: "harvest-block-party",
        surface: "admin",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), ADMIN_FIXTURE);
});

Deno.test("read-demo-event returns 200 with redemption rows for a test slug", async () => {
  const handler = buildHandler();
  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        slug: "riverside-jam",
        surface: "redemptions",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { rows: REDEMPTIONS_FIXTURE });
});

Deno.test("read-demo-event returns 404 when the admin lookup is empty", async () => {
  const handler = buildHandler({
    loadAdminPayload: async () => ({ data: null, error: null }),
  });

  const response = await handler(
    createOriginRequest("https://example.com", {
      body: JSON.stringify({
        slug: "harvest-block-party",
        surface: "admin",
      }),
      method: "POST",
    }),
  );

  assertEquals(response.status, 404);
  assertEquals(await response.json(), {
    error: "not_found",
    message: "Demo event not found.",
  });
});

Deno.test("read-demo-event returns 500 when the admin loader errors", async () => {
  const originalConsoleError = console.error;
  const logged: string[] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  };

  const handler = buildHandler({
    loadAdminPayload: async () => ({
      data: null,
      error: { message: "db down" },
    }),
  });

  try {
    const response = await handler(
      createOriginRequest("https://example.com", {
        body: JSON.stringify({
          slug: "harvest-block-party",
          surface: "admin",
        }),
        method: "POST",
      }),
    );

    assertEquals(response.status, 500);
    assertEquals(await response.json(), {
      error: "read_failed",
      message: "Demo-mode read failed.",
    });
  } finally {
    console.error = originalConsoleError;
  }

  assertEquals(logged.length, 1);
  assertEquals(
    logged[0]?.includes("read-demo-event admin query failed"),
    true,
  );
});

Deno.test("read-demo-event returns 500 when the redemptions loader errors", async () => {
  const originalConsoleError = console.error;
  const logged: string[] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args.map(String).join(" "));
  };

  const handler = buildHandler({
    loadRedemptionsPayload: async () => ({
      data: null,
      error: { message: "db down" },
    }),
  });

  try {
    const response = await handler(
      createOriginRequest("https://example.com", {
        body: JSON.stringify({
          slug: "riverside-jam",
          surface: "redemptions",
        }),
        method: "POST",
      }),
    );

    assertEquals(response.status, 500);
    assertEquals(await response.json(), {
      error: "read_failed",
      message: "Demo-mode read failed.",
    });
  } finally {
    console.error = originalConsoleError;
  }

  assertEquals(logged.length, 1);
  assertEquals(
    logged[0]?.includes("read-demo-event redemptions query failed"),
    true,
  );
});
