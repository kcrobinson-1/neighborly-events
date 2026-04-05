import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  getGameById,
  normalizeSubmittedAnswers,
  scoreAnswers,
  validateSubmittedAnswers,
} from "../../../shared/game-config.ts";
import { createCorsHeaders, getAllowedOrigin } from "../_shared/cors.ts";
import { readVerifiedSession } from "../_shared/session-cookie.ts";

/** Shape returned by the completion RPC before it is mapped to the API response. */
type CompletionRpcRow = {
  attempt_number: number;
  completion_id: string;
  entitlement_created_at: string;
  entitlement_status: "existing" | "new";
  message: string;
  raffle_eligible: boolean;
  score: number;
  verification_code: string;
};

/** Request payload accepted by the completion endpoint. */
type CompletionRequestBody = {
  answers: Record<string, string[]>;
  durationMs: number;
  eventId: string;
  requestId: string;
};

/** Creates a JSON response with the shared CORS policy applied. */
function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  origin: string | null,
) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...createCorsHeaders(origin),
      "Content-Type": "application/json",
    },
    status,
  });
}

/** Type guard for the answers object sent by the browser. */
function isAnswersRecord(value: unknown): value is Record<string, string[]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(
    (optionIds) =>
      Array.isArray(optionIds) &&
      optionIds.every((optionId) => typeof optionId === "string"),
  );
}

/** Validates and normalizes the completion request payload. */
function validatePayload(payload: unknown): CompletionRequestBody | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as Partial<CompletionRequestBody>;

  const eventId =
    typeof candidate.eventId === "string" ? candidate.eventId.trim() : "";
  const requestId =
    typeof candidate.requestId === "string" ? candidate.requestId.trim() : "";

  if (
    typeof candidate.durationMs !== "number" ||
    !Number.isFinite(candidate.durationMs) ||
    eventId.length === 0 ||
    requestId.length === 0 ||
    !isAnswersRecord(candidate.answers)
  ) {
    return null;
  }

  return {
    answers: candidate.answers,
    durationMs: candidate.durationMs,
    eventId,
    requestId,
  };
}

/** Finalizes a quiz attempt and awards or reuses the raffle entitlement. */
Deno.serve(async (request) => {
  const origin = getAllowedOrigin(request);

  // We require an allowed browser origin here because this function issues
  // raffle entitlements. The signed cookie is the main trust primitive, and the
  // origin gate keeps that cookie flow scoped to the product's own surfaces.
  if (!origin) {
    return jsonResponse(403, { error: "Origin not allowed." }, null);
  }

  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: createCorsHeaders(origin),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." }, origin);
  }

  const payload = validatePayload(await request.json().catch(() => null));

  if (!payload) {
    return jsonResponse(400, { error: "Invalid completion payload." }, origin);
  }

  const signingSecret = Deno.env.get("SESSION_SIGNING_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!signingSecret || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      500,
      { error: "Server-side completion configuration is missing." },
      origin,
    );
  }

  const session = await readVerifiedSession(request, signingSecret);

  if (!session) {
    return jsonResponse(401, { error: "Session is missing or invalid." }, origin);
  }

  const game = getGameById(payload.eventId);

  if (!game) {
    return jsonResponse(400, { error: "Quiz event was not found." }, origin);
  }

  const validation = validateSubmittedAnswers(game, payload.answers);

  if (!validation.ok) {
    return jsonResponse(400, { error: validation.error }, origin);
  }

  // The browser sends answers, but the server owns the authoritative result.
  // We normalize the payload, recompute score from trusted config, and only
  // then persist the attempt through the RPC.
  const normalizedAnswers = normalizeSubmittedAnswers(game, payload.answers);
  const trustedScore = scoreAnswers(game, normalizedAnswers);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .rpc("complete_quiz_and_award_entitlement", {
      p_client_session_id: session.sessionId,
      p_duration_ms: Math.max(0, Math.round(payload.durationMs)),
      p_event_id: payload.eventId,
      p_request_id: payload.requestId,
      p_score: trustedScore,
      p_submitted_answers: normalizedAnswers,
    })
    .single<CompletionRpcRow>();

  if (error || !data) {
    return jsonResponse(
      500,
      {
        error: "We couldn't finalize your raffle entry right now.",
        details: error?.message,
      },
      origin,
    );
  }

  return jsonResponse(
    200,
    {
      attemptNumber: data.attempt_number,
      completionId: data.completion_id,
      entitlement: {
        createdAt: data.entitlement_created_at,
        status: data.entitlement_status,
        verificationCode: data.verification_code,
      },
      message: data.message,
      raffleEligible: data.raffle_eligible,
      score: data.score,
    },
    origin,
  );
});
