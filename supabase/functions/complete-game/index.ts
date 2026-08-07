import { type GameConfig } from "../../../shared/game-config.ts";
import {
  type CompleteGameHandlerDependencies,
  defaultCompleteGameHandlerDependencies,
} from "./dependencies.ts";
import { type CompletionRpcRow } from "./persistence.ts";
import { validateCompletionPayload } from "./payload.ts";
import { jsonResponse } from "./response.ts";

export {
  type CompleteGameHandlerDependencies,
  defaultCompleteGameHandlerDependencies,
} from "./dependencies.ts";
export type {
  CompletionLookupInput,
  CompletionPersistenceInput,
  CompletionPersistenceResult,
  CompletionRpcRow,
} from "./persistence.ts";
export {
  type CompletionRequestBody,
  validateCompletionPayload,
} from "./payload.ts";

/** Maps a stored or freshly persisted completion row to the API response body. */
function completionResponseBody(data: CompletionRpcRow) {
  return {
    attemptNumber: data.attempt_number,
    completionId: data.completion_id,
    entitlement: {
      createdAt: data.entitlement_created_at,
      status: data.entitlement_status,
      verificationCode: data.verification_code,
    },
    message: data.message,
    entitlementEligible: data.entitlement_eligible,
    score: data.score,
  };
}

/** Builds the request handler used by the trusted completion function. */
export function createCompleteGameHandler(
  dependencies: CompleteGameHandlerDependencies =
    defaultCompleteGameHandlerDependencies,
) {
  return async (request: Request) => {
    const origin = dependencies.getAllowedOrigin(request);

    // We require an allowed browser origin here because this function issues
    // entitlements. The signed cookie is the main trust primitive, and the
    // origin gate keeps that cookie flow scoped to the product's own surfaces.
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

    const payload = validateCompletionPayload(
      await request.json().catch(() => null),
    );

    if (!payload) {
      return jsonResponse(
        400,
        { error: "Invalid completion payload." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const signingSecret = dependencies.getSigningSecret();
    const supabaseUrl = dependencies.getSupabaseUrl();
    const serviceRoleKey = dependencies.getServiceRoleKey();

    if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        500,
        { error: "Server-side completion configuration is missing." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const session = await dependencies.readVerifiedSession(
      request,
      signingSecret,
    );

    if (!session) {
      return jsonResponse(
        401,
        { error: "Session is missing or invalid." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    // Resolve a completion this request id already produced BEFORE validating
    // against current published content. Published content can drift between
    // the original attempt and a client replay (question added, option
    // removed); the stored completion is authoritative for a landed request
    // id, so validation against today's content must not block its recovery.
    const existing = await dependencies.findCompletionByRequestId(
      {
        eventId: payload.eventId,
        requestId: payload.requestId,
        sessionId: session.sessionId,
      },
      supabaseUrl,
      serviceRoleKey,
    );

    // A lookup failure returns a retryable 500 rather than falling through:
    // falling through would let a drifted replay hit validation's terminal
    // 400, which tells the client to give up on a completion that landed.
    if (existing.error) {
      return jsonResponse(
        500,
        {
          error: "We couldn't finalize your entitlement right now.",
          details: existing.error.message,
        },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    if (existing.data) {
      return jsonResponse(
        200,
        completionResponseBody(existing.data),
        origin,
        dependencies.createCorsHeaders,
      );
    }

    let game: GameConfig | null;

    try {
      game = await dependencies.loadPublishedGameById(
        payload.eventId,
        supabaseUrl,
        serviceRoleKey,
      );
    } catch (error: unknown) {
      return jsonResponse(
        500,
        {
          details: error instanceof Error ? error.message : undefined,
          error: "We couldn't load this game event right now.",
        },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    if (!game) {
      return jsonResponse(
        400,
        { error: "Game event was not found." },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    const validation = dependencies.validateSubmittedAnswers(
      game,
      payload.answers,
    );

    if (!validation.ok) {
      return jsonResponse(
        400,
        { error: validation.error },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    // The browser sends answers, but the server owns the authoritative result.
    // We normalize the payload, recompute score from trusted published content,
    // and only then persist the attempt through the RPC.
    const normalizedAnswers = dependencies.normalizeSubmittedAnswers(
      game,
      payload.answers,
    );
    const trustedScore = dependencies.scoreAnswers(game, normalizedAnswers);

    const { data, error } = await dependencies.persistCompletion(
      {
        durationMs: Math.max(0, Math.round(payload.durationMs)),
        eventId: payload.eventId,
        normalizedAnswers,
        requestId: payload.requestId,
        sessionId: session.sessionId,
        trustedScore,
      },
      supabaseUrl,
      serviceRoleKey,
    );

    if (error || !data) {
      const status = error?.message === "entitlement_code_exhausted" ? 503 : 500;
      return jsonResponse(
        status,
        {
          error: "We couldn't finalize your entitlement right now.",
          details: error?.message,
        },
        origin,
        dependencies.createCorsHeaders,
      );
    }

    return jsonResponse(
      200,
      completionResponseBody(data),
      origin,
      dependencies.createCorsHeaders,
    );
  };
}

/** Finalizes a game attempt and awards or reuses the entitlement. */
export const handleCompleteGameRequest = createCompleteGameHandler();

if (import.meta.main) {
  Deno.serve(handleCompleteGameRequest);
}
