import type { AdminAuthResult } from "./admin-auth.ts";
import { createCorsHeaders, getAllowedOrigin } from "./cors.ts";

/**
 * Shared authoring HTTP boundary for authoring write functions.
 * Owns origin/method/config gates and consistent JSON response wiring so each
 * authoring endpoint can focus on payload validation and per-event
 * authorization. Authentication moved into the per-function handler in
 * M2 phase 2.1.2 so each function can resolve its target eventId from its
 * own validated payload before calling
 * authenticateEventOrganizerOrAdmin.
 */
type JsonBody = Record<string, unknown>;

/** Injectable dependencies for the shared authoring HTTP handler factory. */
export type AuthoringHttpDependencies = {
  createCorsHeaders: typeof createCorsHeaders;
  getAllowedOrigin: typeof getAllowedOrigin;
  getServiceRoleKey: () => string | undefined;
  getSupabaseClientKey: () => string | undefined;
  getSupabaseUrl: () => string | undefined;
};

/** Trusted context passed to one authoring request handler. */
export type AuthoringRequestContext = {
  jsonResponse: (status: number, body: JsonBody) => Response;
  serviceRoleKey: string;
  supabaseClientKey: string;
  supabaseUrl: string;
};

export const defaultAuthoringHttpDependencies: AuthoringHttpDependencies = {
  createCorsHeaders,
  getAllowedOrigin,
  getServiceRoleKey: () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  getSupabaseClientKey: () =>
    Deno.env.get("SUPABASE_PUBLISHABLE_DEFAULT_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY"),
  getSupabaseUrl: () => Deno.env.get("SUPABASE_URL"),
};

/**
 * Maps a non-ok AdminAuthResult to the canonical authoring HTTP response.
 * Returns 401 for unauthenticated callers and 403 for forbidden callers.
 * Callers branch on `auth.status === 'ok'` themselves and only invoke this
 * helper on the failure path.
 */
export function createAuthErrorResponse(
  auth: Extract<AdminAuthResult, { status: "unauthenticated" | "forbidden" }>,
  context: AuthoringRequestContext,
): Response {
  return context.jsonResponse(
    auth.status === "unauthenticated" ? 401 : 403,
    { error: auth.error },
  );
}

/** Builds one JSON response with shared authoring CORS headers applied. */
export function createAuthoringJsonResponse(
  status: number,
  body: JsonBody,
  origin: string | null,
  createHeaders: AuthoringHttpDependencies["createCorsHeaders"],
) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...createHeaders(origin),
      "Content-Type": "application/json",
    },
    status,
  });
}

/**
 * Creates a POST-only authoring handler with shared trust checks.
 * The returned handler enforces allowed origin, CORS preflight, server config,
 * and JSON response wiring before executing `handleRequest`. Per-event
 * authorization is the per-function handler's responsibility (the function
 * parses its payload, extracts the target eventId, and calls
 * authenticateEventOrganizerOrAdmin from `_shared/event-organizer-auth.ts`).
 */
export function createAuthoringPostHandler(
  dependencies: AuthoringHttpDependencies,
  handleRequest: (
    request: Request,
    context: AuthoringRequestContext,
  ) => Response | Promise<Response>,
) {
  return async (request: Request) => {
    const origin = dependencies.getAllowedOrigin(request);

    if (!origin) {
      return createAuthoringJsonResponse(
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
      return createAuthoringJsonResponse(
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
      return createAuthoringJsonResponse(
        500,
        { error: "Server-side authoring configuration is missing." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    return await handleRequest(request, {
      jsonResponse: (status, body) =>
        createAuthoringJsonResponse(
          status,
          body,
          origin,
          dependencies.createCorsHeaders,
        ),
      serviceRoleKey,
      supabaseClientKey,
      supabaseUrl,
    });
  };
}
