import { createClient } from "jsr:@supabase/supabase-js@2.101.1";
import {
  isTestEventSlug,
  type TestEventSlug,
} from "../../../shared/events/testEventAllowlist.ts";
import { createCorsHeaders, getAllowedOrigin } from "../_shared/cors.ts";

type JsonBody = Record<string, unknown>;

export type DemoEventSurface = "admin" | "redemptions";

export type ReadDemoEventRequest = {
  slug: TestEventSlug;
  surface: DemoEventSurface;
};

type AdminEventStatus = "draft_only" | "live" | "live_with_draft_changes";

export type DemoAdminPayload = {
  eventCode: string | null;
  hasBeenPublished: boolean;
  id: string;
  isLive: boolean;
  lastPublishedVersionNumber: number | null;
  name: string;
  slug: string;
  status: AdminEventStatus;
  updatedAt: string;
};

/**
 * Public response shape for `surface: "redemptions"`.
 *
 * `read-demo-event` runs with `verify_jwt = false` and answers any
 * caller on an allowlisted slug, so the response cannot include
 * operator PII (`redeemed_by`, `redemption_note`,
 * `redemption_reversed_by`, the per-actor role labels). The demo
 * monitoring view only renders verification code, status, and
 * activity timestamp — exactly the fields surfaced here.
 */
export type DemoRedemptionRow = {
  id: string;
  redeemed_at: string | null;
  redemption_reversed_at: string | null;
  redemption_status: "redeemed" | "unredeemed";
  verification_code: string;
};

type AdminStatusRow = {
  draft_updated_at: string;
  event_code: string | null;
  event_id: string;
  is_live: boolean;
  last_published_version_number: number | null;
  name: string;
  slug: string;
  status: AdminEventStatus;
};

type EventLookupRow = {
  id: string;
};

const REDEMPTIONS_FETCH_LIMIT = 500;

// Operator identifiers and free-text notes are intentionally excluded
// because the demo Edge Function is publicly reachable
// (`verify_jwt = false` + allowlist gate) and surfacing them would
// leak PII to unauthenticated visitors. Mirrors the field set the
// DemoModeRedemptionsView actually renders.
const REDEMPTION_ROW_COLUMNS = [
  "id",
  "verification_code",
  "redemption_status",
  "redeemed_at",
  "redemption_reversed_at",
].join(",");

export type ReadDemoEventHandlerDependencies = {
  createCorsHeaders: typeof createCorsHeaders;
  getAllowedOrigin: typeof getAllowedOrigin;
  getServiceRoleKey: () => string | undefined;
  getSupabaseUrl: () => string | undefined;
  isTestEventSlug: (slug: string) => slug is TestEventSlug;
  loadAdminPayload: (
    slug: string,
    supabaseUrl: string,
    serviceRoleKey: string,
  ) => Promise<{
    data: DemoAdminPayload | null;
    error: { code?: string; message: string } | null;
  }>;
  loadRedemptionsPayload: (
    slug: string,
    supabaseUrl: string,
    serviceRoleKey: string,
  ) => Promise<{
    data: DemoRedemptionRow[] | null;
    error: { code?: string; message: string } | null;
  }>;
};

function mapAdminStatusRow(row: AdminStatusRow): DemoAdminPayload {
  return {
    eventCode: row.event_code ?? null,
    hasBeenPublished: row.last_published_version_number !== null,
    id: row.event_id,
    isLive: row.is_live,
    lastPublishedVersionNumber: row.last_published_version_number,
    name: row.name,
    slug: row.slug,
    status: row.status,
    updatedAt: row.draft_updated_at,
  };
}

function computeActivityTimestamp(row: DemoRedemptionRow): string | null {
  // Newer of the two timestamps. A re-redeemed row (redeemed → reversed
  // → redeemed again) carries values in both fields because the
  // redeem_entitlement_by_code RPC updates redeemed_* without clearing
  // redemption_reversed_*. `redemption_reversed_at ?? redeemed_at` would
  // sort such rows by the older reversal time and risk dropping them
  // from the top-N cap. Mirrors apps/web/src/redemptions/activityTimestamp.ts.
  const redeemedAt = row.redeemed_at;
  const reversedAt = row.redemption_reversed_at;
  if (redeemedAt === null) {
    return reversedAt;
  }
  if (reversedAt === null) {
    return redeemedAt;
  }
  return reversedAt > redeemedAt ? reversedAt : redeemedAt;
}

function compareRowsByActivity(
  first: DemoRedemptionRow,
  second: DemoRedemptionRow,
): number {
  const firstTs = computeActivityTimestamp(first);
  const secondTs = computeActivityTimestamp(second);

  if (firstTs === null && secondTs === null) {
    return second.id.localeCompare(first.id);
  }
  if (firstTs === null) {
    return 1;
  }
  if (secondTs === null) {
    return -1;
  }
  if (firstTs < secondTs) {
    return 1;
  }
  if (firstTs > secondTs) {
    return -1;
  }
  return second.id.localeCompare(first.id);
}

export function mergeRedemptionSlices(
  redeemed: DemoRedemptionRow[],
  reversed: DemoRedemptionRow[],
  cap: number,
): DemoRedemptionRow[] {
  const byId = new Map<string, DemoRedemptionRow>();
  for (const row of redeemed) {
    byId.set(row.id, row);
  }
  for (const row of reversed) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
  }
  const merged = Array.from(byId.values());
  merged.sort(compareRowsByActivity);
  if (cap < 0) {
    return [];
  }
  return merged.slice(0, cap);
}

export const defaultReadDemoEventHandlerDependencies:
  ReadDemoEventHandlerDependencies = {
    createCorsHeaders,
    getAllowedOrigin,
    getServiceRoleKey: () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    getSupabaseUrl: () => Deno.env.get("SUPABASE_URL"),
    isTestEventSlug,
    loadAdminPayload: async (slug, supabaseUrl, serviceRoleKey) => {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      const { data, error } = await supabase
        .from("game_event_admin_status")
        .select(
          "draft_updated_at,event_code,event_id,is_live,last_published_version_number,name,slug,status",
        )
        .eq("slug", slug)
        .maybeSingle<AdminStatusRow>();

      if (error) {
        return {
          data: null,
          error: { code: error.code, message: error.message },
        };
      }
      if (!data) {
        return { data: null, error: null };
      }
      return { data: mapAdminStatusRow(data), error: null };
    },
    loadRedemptionsPayload: async (slug, supabaseUrl, serviceRoleKey) => {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });

      const eventResponse = await supabase
        .from("game_events")
        .select("id")
        .eq("slug", slug)
        .maybeSingle<EventLookupRow>();

      if (eventResponse.error) {
        return {
          data: null,
          error: {
            code: eventResponse.error.code,
            message: eventResponse.error.message,
          },
        };
      }
      if (!eventResponse.data) {
        return { data: [], error: null };
      }

      const eventId = eventResponse.data.id;

      const [redeemedResponse, reversedResponse] = await Promise.all([
        supabase
          .from("game_entitlements")
          .select(REDEMPTION_ROW_COLUMNS)
          .eq("event_id", eventId)
          .eq("redemption_status", "redeemed")
          .order("redeemed_at", { ascending: false, nullsFirst: false })
          .limit(REDEMPTIONS_FETCH_LIMIT),
        supabase
          .from("game_entitlements")
          .select(REDEMPTION_ROW_COLUMNS)
          .eq("event_id", eventId)
          .not("redemption_reversed_at", "is", null)
          .order("redemption_reversed_at", {
            ascending: false,
            nullsFirst: false,
          })
          .limit(REDEMPTIONS_FETCH_LIMIT),
      ]);

      if (redeemedResponse.error) {
        return {
          data: null,
          error: {
            code: redeemedResponse.error.code,
            message: redeemedResponse.error.message,
          },
        };
      }
      if (reversedResponse.error) {
        return {
          data: null,
          error: {
            code: reversedResponse.error.code,
            message: reversedResponse.error.message,
          },
        };
      }

      const redeemed =
        (redeemedResponse.data ?? []) as unknown as DemoRedemptionRow[];
      const reversed =
        (reversedResponse.data ?? []) as unknown as DemoRedemptionRow[];

      return {
        data: mergeRedemptionSlices(redeemed, reversed, REDEMPTIONS_FETCH_LIMIT),
        error: null,
      };
    },
  };

function jsonResponse(
  status: number,
  body: JsonBody,
  origin: string | null,
  createHeaders: ReadDemoEventHandlerDependencies["createCorsHeaders"],
): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      ...createHeaders(origin),
      "Content-Type": "application/json",
    },
    status,
  });
}

export function validateReadDemoEventPayload(
  payload: unknown,
): ReadDemoEventRequest | { reason: "invalid_request_body" } {
  if (
    typeof payload !== "object" || payload === null || Array.isArray(payload)
  ) {
    return { reason: "invalid_request_body" };
  }

  const rawSlug = (payload as Partial<ReadDemoEventRequest>).slug;
  const rawSurface = (payload as Partial<ReadDemoEventRequest>).surface;

  if (typeof rawSlug !== "string" || rawSlug.trim().length === 0) {
    return { reason: "invalid_request_body" };
  }
  if (rawSurface !== "admin" && rawSurface !== "redemptions") {
    return { reason: "invalid_request_body" };
  }

  return {
    slug: rawSlug.trim() as TestEventSlug,
    surface: rawSurface,
  };
}

/** Builds the request handler used by the demo-mode read shim. */
export function createReadDemoEventHandler(
  dependencies: ReadDemoEventHandlerDependencies =
    defaultReadDemoEventHandlerDependencies,
) {
  return async (request: Request): Promise<Response> => {
    const origin = dependencies.getAllowedOrigin(request);

    if (!origin) {
      return jsonResponse(
        403,
        { error: "Origin not allowed." },
        null,
        dependencies.createCorsHeaders,
      );
    }

    if (request.method === "OPTIONS") {
      return new Response("ok", {
        headers: dependencies.createCorsHeaders(origin),
      });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        405,
        { error: "Method not allowed." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const supabaseUrl = dependencies.getSupabaseUrl();
    const serviceRoleKey = dependencies.getServiceRoleKey();

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        500,
        { error: "Server-side demo-mode read configuration is missing." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const validation = validateReadDemoEventPayload(
      await request.json().catch(() => null),
    );

    if ("reason" in validation) {
      return jsonResponse(
        400,
        {
          error: "invalid_request_body",
          message:
            "Demo-mode read requires { slug: string, surface: \"admin\" | \"redemptions\" }.",
        },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    if (!dependencies.isTestEventSlug(validation.slug)) {
      return jsonResponse(
        403,
        {
          error: "not_in_demo_allowlist",
          message: "Demo-mode reads are only available for test events.",
        },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    if (validation.surface === "admin") {
      const { data, error } = await dependencies.loadAdminPayload(
        validation.slug,
        supabaseUrl,
        serviceRoleKey,
      );

      if (error) {
        console.error(
          "read-demo-event admin query failed",
          JSON.stringify({
            code: error.code ?? null,
            message: error.message,
            slug: validation.slug,
          }),
        );
        return jsonResponse(
          500,
          { error: "read_failed", message: "Demo-mode read failed." },
          origin,
          dependencies.createCorsHeaders,
        );
      }

      if (!data) {
        return jsonResponse(
          404,
          { error: "not_found", message: "Demo event not found." },
          origin,
          dependencies.createCorsHeaders,
        );
      }

      return jsonResponse(
        200,
        data as unknown as JsonBody,
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const { data, error } = await dependencies.loadRedemptionsPayload(
      validation.slug,
      supabaseUrl,
      serviceRoleKey,
    );

    if (error) {
      console.error(
        "read-demo-event redemptions query failed",
        JSON.stringify({
          code: error.code ?? null,
          message: error.message,
          slug: validation.slug,
        }),
      );
      return jsonResponse(
        500,
        { error: "read_failed", message: "Demo-mode read failed." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    // Defense-in-depth whitelist. The default loader's SELECT already
    // restricts the column set, but a future loader change must not be
    // able to leak operator PII through the public response. Mapping
    // each row to the explicit DemoRedemptionRow shape pins the public
    // contract regardless of what the loader returned.
    const safeRows: DemoRedemptionRow[] = (data ?? []).map((row) => ({
      id: row.id,
      redeemed_at: row.redeemed_at,
      redemption_reversed_at: row.redemption_reversed_at,
      redemption_status: row.redemption_status,
      verification_code: row.verification_code,
    }));

    return jsonResponse(
      200,
      { rows: safeRows },
      origin,
      dependencies.createCorsHeaders,
    );
  };
}

/** Returns demo-mode read payloads for unauthenticated visitors on test-event slugs. */
export const handleReadDemoEventRequest = createReadDemoEventHandler();

if (import.meta.main) {
  Deno.serve(handleReadDemoEventRequest);
}
