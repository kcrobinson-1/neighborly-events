import { assertEquals } from "jsr:@std/assert@1";
import { TEST_EVENT_SLUGS } from "../../../shared/events/testEventAllowlist.ts";
import {
  type DemoModeRejectionSupabaseAdmin,
  evaluateDemoModeRejection,
} from "../../../supabase/functions/_shared/demo-mode-rejection.ts";

const ALLOWLIST_SLUG = TEST_EVENT_SLUGS[0];

type FakeSelectResult = {
  data: { slug: string } | null;
  error: { message: string } | null;
};

function createFakeSupabaseAdmin(result: FakeSelectResult) {
  let capturedTable: string | null = null;
  let capturedSelect: string | null = null;
  let capturedColumn: string | null = null;
  let capturedValue: string | null = null;

  const client = {
    from(table: string) {
      capturedTable = table;
      return {
        select(columns: string) {
          capturedSelect = columns;
          return {
            eq(column: string, value: string) {
              capturedColumn = column;
              capturedValue = value;
              return {
                maybeSingle: <T>() =>
                  Promise.resolve(result as { data: T | null; error: typeof result.error }),
              };
            },
          };
        },
      };
    },
  };

  return {
    captured: () => ({
      column: capturedColumn,
      select: capturedSelect,
      table: capturedTable,
      value: capturedValue,
    }),
    client: client as unknown as DemoModeRejectionSupabaseAdmin,
  };
}

function createRequest(headers: Record<string, string> = {}) {
  return new Request("https://example.com", {
    headers: new Headers(headers),
    method: "POST",
  });
}

Deno.test("evaluateDemoModeRejection returns null when a Bearer token is present (skips slug lookup)", async () => {
  const fake = createFakeSupabaseAdmin({
    data: { slug: ALLOWLIST_SLUG },
    error: null,
  });

  const result = await evaluateDemoModeRejection({
    eventId: "event-1",
    request: createRequest({ Authorization: "Bearer user-token" }),
    supabaseAdmin: fake.client,
  });

  assertEquals(result, null);
  assertEquals(fake.captured(), {
    column: null,
    select: null,
    table: null,
    value: null,
  });
});

Deno.test("evaluateDemoModeRejection returns the structured body for an anon caller on an allowlist slug", async () => {
  const fake = createFakeSupabaseAdmin({
    data: { slug: ALLOWLIST_SLUG },
    error: null,
  });

  const result = await evaluateDemoModeRejection({
    eventId: "event-1",
    request: createRequest(),
    supabaseAdmin: fake.client,
  });

  assertEquals(result, {
    error: "demo_mode_read_only",
    message: "Demo mode — sign in to make changes.",
  });
  assertEquals(fake.captured(), {
    column: "id",
    select: "slug",
    table: "game_events",
    value: "event-1",
  });
});

Deno.test("evaluateDemoModeRejection returns null for an anon caller on a non-allowlist slug", async () => {
  const fake = createFakeSupabaseAdmin({
    data: { slug: "real-event-slug" },
    error: null,
  });

  const result = await evaluateDemoModeRejection({
    eventId: "event-1",
    request: createRequest(),
    supabaseAdmin: fake.client,
  });

  assertEquals(result, null);
});

Deno.test("evaluateDemoModeRejection returns null when the slug-lookup row is missing (defers to existing auth gate)", async () => {
  const fake = createFakeSupabaseAdmin({ data: null, error: null });

  const result = await evaluateDemoModeRejection({
    eventId: "missing-event",
    request: createRequest(),
    supabaseAdmin: fake.client,
  });

  assertEquals(result, null);
});

Deno.test("evaluateDemoModeRejection returns null when the slug-lookup query errors transiently (defers to existing auth gate)", async () => {
  const fake = createFakeSupabaseAdmin({
    data: null,
    error: { message: "transient db error" },
  });

  const result = await evaluateDemoModeRejection({
    eventId: "event-1",
    request: createRequest(),
    supabaseAdmin: fake.client,
  });

  assertEquals(result, null);
});

Deno.test("evaluateDemoModeRejection treats a non-Bearer Authorization scheme as no auth context", async () => {
  const fake = createFakeSupabaseAdmin({
    data: { slug: ALLOWLIST_SLUG },
    error: null,
  });

  const result = await evaluateDemoModeRejection({
    eventId: "event-1",
    request: createRequest({ Authorization: "Basic dXNlcjpwYXNz" }),
    supabaseAdmin: fake.client,
  });

  assertEquals(result, {
    error: "demo_mode_read_only",
    message: "Demo mode — sign in to make changes.",
  });
});
