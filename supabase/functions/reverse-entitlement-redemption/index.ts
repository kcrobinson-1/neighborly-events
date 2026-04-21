import { createClient } from "jsr:@supabase/supabase-js@2.101.1";
import type {
  RedemptionFailureResult,
  RedemptionHttpErrorResponse,
  ReverseEntitlementRedemptionRequest,
  ReverseEntitlementRedemptionRpcResponse,
} from "../../../shared/redemption.ts";
import {
  authenticateRedemptionOperator,
  type RedemptionOperatorAuthResult,
} from "../_shared/redemption-operator-auth.ts";
import { createCorsHeaders, getAllowedOrigin } from "../_shared/cors.ts";

type JsonBody = Record<string, unknown>;

type ReverseHandlerDependencies = {
  authenticateRedemptionOperator: (
    request: Request,
    supabaseUrl: string,
    serviceRoleKey: string,
  ) => Promise<RedemptionOperatorAuthResult>;
  createCorsHeaders: typeof createCorsHeaders;
  getAllowedOrigin: typeof getAllowedOrigin;
  getServiceRoleKey: () => string | undefined;
  getSupabaseClientKey: () => string | undefined;
  getSupabaseUrl: () => string | undefined;
  reverseEntitlementRedemption: (
    input: ReverseEntitlementRedemptionRequest,
    token: string,
    supabaseUrl: string,
    supabaseClientKey: string,
  ) => Promise<{
    data: ReverseEntitlementRedemptionRpcResponse | null;
    error: { message: string } | null;
  }>;
};

export const defaultReverseHandlerDependencies: ReverseHandlerDependencies = {
  authenticateRedemptionOperator,
  createCorsHeaders,
  getAllowedOrigin,
  getServiceRoleKey: () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  getSupabaseClientKey: () =>
    Deno.env.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY"),
  getSupabaseUrl: () => Deno.env.get("SUPABASE_URL"),
  reverseEntitlementRedemption: async (
    input,
    token,
    supabaseUrl,
    supabaseClientKey,
  ) => {
    const supabase = createClient(supabaseUrl, supabaseClientKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data, error } = await supabase.rpc(
      "reverse_entitlement_redemption",
      {
        p_code_suffix: input.codeSuffix,
        p_event_id: input.eventId,
        p_reason: input.reason ?? null,
      },
    );

    return {
      data: (data ?? null) as ReverseEntitlementRedemptionRpcResponse | null,
      error: error ? { message: error.message } : null,
    };
  },
};

function jsonResponse(
  status: number,
  body: JsonBody,
  origin: string | null,
  createHeaders: ReverseHandlerDependencies["createCorsHeaders"],
) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...createHeaders(origin),
      "Content-Type": "application/json",
    },
    status,
  });
}

export function validateReversePayload(
  payload: unknown,
): ReverseEntitlementRedemptionRequest | null {
  if (
    typeof payload !== "object" || payload === null || Array.isArray(payload)
  ) {
    return null;
  }

  const rawEventId =
    (payload as Partial<ReverseEntitlementRedemptionRequest>).eventId;
  const rawCodeSuffix =
    (payload as Partial<ReverseEntitlementRedemptionRequest>).codeSuffix;
  const rawReason =
    (payload as Partial<ReverseEntitlementRedemptionRequest>).reason;
  const eventId = typeof rawEventId === "string" ? rawEventId.trim() : "";
  const codeSuffix =
    typeof rawCodeSuffix === "string" ? rawCodeSuffix.trim() : "";
  const reason =
    typeof rawReason === "string" ? rawReason.trim() || null : rawReason ?? null;

  if (
    !eventId ||
    !/^[0-9]{4}$/.test(codeSuffix) ||
    !(typeof reason === "string" || reason === null)
  ) {
    return null;
  }

  return {
    codeSuffix,
    eventId,
    reason,
  };
}

function createFailureBody(details: RedemptionFailureResult): RedemptionHttpErrorResponse {
  return {
    details,
    error: "Redemption reversal failed.",
  };
}

function mapRpcFailure(
  details: RedemptionFailureResult,
  origin: string | null,
  dependencies: ReverseHandlerDependencies,
) {
  const status =
    details === "not_authorized" ? 403 : details === "not_found" ? 404 : 500;

  return jsonResponse(
    status,
    createFailureBody(details),
    origin,
    dependencies.createCorsHeaders,
  );
}

/** Builds the request handler used by the organizer-facing reversal endpoint. */
export function createReverseEntitlementRedemptionHandler(
  dependencies: ReverseHandlerDependencies = defaultReverseHandlerDependencies,
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
    const supabaseClientKey = dependencies.getSupabaseClientKey();

    if (!supabaseUrl || !serviceRoleKey || !supabaseClientKey) {
      return jsonResponse(
        500,
        { error: "Server-side redemption configuration is missing." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const auth = await dependencies.authenticateRedemptionOperator(
      request,
      supabaseUrl,
      serviceRoleKey,
    );

    if (auth.status !== "ok") {
      return jsonResponse(
        401,
        { error: auth.error },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const payload = validateReversePayload(
      await request.json().catch(() => null),
    );

    if (!payload) {
      return jsonResponse(
        400,
        { error: "Invalid redemption reversal payload." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const { data, error } = await dependencies.reverseEntitlementRedemption(
      payload,
      auth.token,
      supabaseUrl,
      supabaseClientKey,
    );

    if (error || !data) {
      return mapRpcFailure("internal_error", origin, dependencies);
    }

    if (data.outcome === "failure") {
      return mapRpcFailure(data.result, origin, dependencies);
    }

    return jsonResponse(
      200,
      data,
      origin,
      dependencies.createCorsHeaders,
    );
  };
}

/** Reverses an entitlement redemption for an authenticated organizer. */
export const handleReverseEntitlementRedemptionRequest =
  createReverseEntitlementRedemptionHandler();

if (import.meta.main) {
  Deno.serve(handleReverseEntitlementRedemptionRequest);
}
