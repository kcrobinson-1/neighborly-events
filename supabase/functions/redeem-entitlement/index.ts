import { createClient } from "jsr:@supabase/supabase-js@2.101.1";
import type {
  RedeemEntitlementRequest,
  RedeemEntitlementRpcResponse,
  RedemptionFailureResult,
  RedemptionHttpErrorResponse,
} from "../../../shared/redemption.ts";
import {
  authenticateRedemptionOperator,
  type RedemptionOperatorAuthResult,
} from "../_shared/redemption-operator-auth.ts";
import { createCorsHeaders, getAllowedOrigin } from "../_shared/cors.ts";

type JsonBody = Record<string, unknown>;

type RedeemHandlerDependencies = {
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
  redeemEntitlement: (
    input: RedeemEntitlementRequest,
    token: string,
    supabaseUrl: string,
    supabaseClientKey: string,
  ) => Promise<{
    data: RedeemEntitlementRpcResponse | null;
    error: { message: string } | null;
  }>;
};

export const defaultRedeemHandlerDependencies: RedeemHandlerDependencies = {
  authenticateRedemptionOperator,
  createCorsHeaders,
  getAllowedOrigin,
  getServiceRoleKey: () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  getSupabaseClientKey: () =>
    Deno.env.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY"),
  getSupabaseUrl: () => Deno.env.get("SUPABASE_URL"),
  redeemEntitlement: async (input, token, supabaseUrl, supabaseClientKey) => {
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

    const { data, error } = await supabase.rpc("redeem_entitlement_by_code", {
      p_code_suffix: input.codeSuffix,
      p_event_id: input.eventId,
    });

    return {
      data: (data ?? null) as RedeemEntitlementRpcResponse | null,
      error: error ? { message: error.message } : null,
    };
  },
};

function jsonResponse(
  status: number,
  body: JsonBody,
  origin: string | null,
  createHeaders: RedeemHandlerDependencies["createCorsHeaders"],
) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...createHeaders(origin),
      "Content-Type": "application/json",
    },
    status,
  });
}

export function validateRedeemPayload(
  payload: unknown,
): RedeemEntitlementRequest | null {
  if (
    typeof payload !== "object" || payload === null || Array.isArray(payload)
  ) {
    return null;
  }

  const rawEventId = (payload as Partial<RedeemEntitlementRequest>).eventId;
  const rawCodeSuffix = (payload as Partial<RedeemEntitlementRequest>).codeSuffix;
  const eventId = typeof rawEventId === "string" ? rawEventId.trim() : "";
  const codeSuffix =
    typeof rawCodeSuffix === "string" ? rawCodeSuffix.trim() : "";

  if (!eventId || !/^[0-9]{4}$/.test(codeSuffix)) {
    return null;
  }

  return {
    codeSuffix,
    eventId,
  };
}

function createFailureBody(details: RedemptionFailureResult): RedemptionHttpErrorResponse {
  return {
    details,
    error: "Redemption request failed.",
  };
}

function mapRpcFailure(
  details: RedemptionFailureResult,
  origin: string | null,
  dependencies: RedeemHandlerDependencies,
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

/** Builds the request handler used by the operator-facing redeem endpoint. */
export function createRedeemEntitlementHandler(
  dependencies: RedeemHandlerDependencies = defaultRedeemHandlerDependencies,
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

    const payload = validateRedeemPayload(
      await request.json().catch(() => null),
    );

    if (!payload) {
      return jsonResponse(
        400,
        { error: "Invalid redeem payload." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const { data, error } = await dependencies.redeemEntitlement(
      payload,
      auth.token,
      supabaseUrl,
      supabaseClientKey,
    );

    if (error || !data) {
      return mapRpcFailure(
        "internal_error",
        origin,
        dependencies,
      );
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

/** Redeems an entitlement for an authenticated event operator. */
export const handleRedeemEntitlementRequest =
  createRedeemEntitlementHandler();

if (import.meta.main) {
  Deno.serve(handleRedeemEntitlementRequest);
}
