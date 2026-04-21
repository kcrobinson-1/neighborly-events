import { createClient } from "jsr:@supabase/supabase-js@2.101.1";
import type {
  GetRedemptionStatusRequest,
  RedemptionStatus,
  RedemptionStatusResponse,
} from "../../../shared/redemption.ts";
import { createCorsHeaders, getAllowedOrigin } from "../_shared/cors.ts";
import { readVerifiedSession } from "../_shared/session-cookie.ts";

type JsonBody = Record<string, unknown>;

type RedemptionStatusRow = {
  redeemed_at: string | null;
  redemption_reversed_at: string | null;
  redemption_status: RedemptionStatus;
  verification_code: string;
};

type GetRedemptionStatusHandlerDependencies = {
  createCorsHeaders: typeof createCorsHeaders;
  getAllowedOrigin: typeof getAllowedOrigin;
  getServiceRoleKey: () => string | undefined;
  getSigningSecret: () => string | undefined;
  getSupabaseUrl: () => string | undefined;
  loadRedemptionStatus: (
    eventId: string,
    sessionId: string,
    supabaseUrl: string,
    serviceRoleKey: string,
  ) => Promise<{
    data: RedemptionStatusRow | null;
    error: { code?: string; message: string } | null;
  }>;
  readVerifiedSession: typeof readVerifiedSession;
};

export const defaultGetRedemptionStatusHandlerDependencies:
  GetRedemptionStatusHandlerDependencies = {
    createCorsHeaders,
    getAllowedOrigin,
    getServiceRoleKey: () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    getSigningSecret: () => Deno.env.get("SESSION_SIGNING_SECRET"),
    getSupabaseUrl: () => Deno.env.get("SUPABASE_URL"),
    loadRedemptionStatus: async (eventId, sessionId, supabaseUrl, serviceRoleKey) => {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          persistSession: false,
        },
      });

      const { data, error } = await supabase
        .from("game_entitlements")
        .select(
          "verification_code,redemption_status,redeemed_at,redemption_reversed_at",
        )
        .eq("event_id", eventId)
        .eq("client_session_id", sessionId)
        .maybeSingle<RedemptionStatusRow>();

      return {
        data: data ?? null,
        error: error ? { code: error.code, message: error.message } : null,
      };
    },
    readVerifiedSession,
  };

function jsonResponse(
  status: number,
  body: JsonBody,
  origin: string | null,
  createHeaders: GetRedemptionStatusHandlerDependencies["createCorsHeaders"],
) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...createHeaders(origin),
      "Content-Type": "application/json",
    },
    status,
  });
}

export function validateGetRedemptionStatusPayload(
  payload: unknown,
): GetRedemptionStatusRequest | null {
  if (
    typeof payload !== "object" || payload === null || Array.isArray(payload)
  ) {
    return null;
  }

  const rawEventId = (payload as Partial<GetRedemptionStatusRequest>).eventId;
  const eventId = typeof rawEventId === "string" ? rawEventId.trim() : "";

  if (!eventId) {
    return null;
  }

  return { eventId };
}

function mapRowToResponse(row: RedemptionStatusRow): RedemptionStatusResponse | null {
  if (
    (row.redemption_status !== "redeemed" &&
      row.redemption_status !== "unredeemed") ||
    typeof row.verification_code !== "string" ||
    row.verification_code.length === 0
  ) {
    return null;
  }

  return {
    redeemedAt: row.redeemed_at,
    redemptionReversedAt: row.redemption_reversed_at,
    redemptionStatus: row.redemption_status,
    verificationCode: row.verification_code,
  };
}

/** Builds the request handler used by the attendee redemption-status endpoint. */
export function createGetRedemptionStatusHandler(
  dependencies: GetRedemptionStatusHandlerDependencies =
    defaultGetRedemptionStatusHandlerDependencies,
) {
  return async (request: Request) => {
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
    const signingSecret = dependencies.getSigningSecret();

    if (!supabaseUrl || !serviceRoleKey || !signingSecret) {
      return jsonResponse(
        500,
        { error: "Server-side redemption-status configuration is missing." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const session = await dependencies.readVerifiedSession(request, signingSecret);

    if (!session) {
      return jsonResponse(
        401,
        { error: "Session is missing or invalid." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const payload = validateGetRedemptionStatusPayload(
      await request.json().catch(() => null),
    );

    if (!payload) {
      return jsonResponse(
        400,
        { error: "Invalid redemption status payload." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const { data, error } = await dependencies.loadRedemptionStatus(
      payload.eventId,
      session.sessionId,
      supabaseUrl,
      serviceRoleKey,
    );

    if (error) {
      console.error(
        "get-redemption-status query failed",
        JSON.stringify({
          code: error.code ?? null,
          eventId: payload.eventId,
          message: error.message,
          sessionId: session.sessionId,
        }),
      );
      return jsonResponse(
        500,
        { error: "Redemption status request failed." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    if (!data) {
      return jsonResponse(
        404,
        { error: "Redemption status not found." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const response = mapRowToResponse(data);

    if (!response) {
      console.error(
        "get-redemption-status returned malformed row",
        JSON.stringify({
          eventId: payload.eventId,
          sessionId: session.sessionId,
        }),
      );
      return jsonResponse(
        500,
        { error: "Redemption status request failed." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    return jsonResponse(
      200,
      response,
      origin,
      dependencies.createCorsHeaders,
    );
  };
}

/** Returns the current redemption state for a verified attendee session. */
export const handleGetRedemptionStatusRequest =
  createGetRedemptionStatusHandler();

if (import.meta.main) {
  Deno.serve(handleGetRedemptionStatusRequest);
}
