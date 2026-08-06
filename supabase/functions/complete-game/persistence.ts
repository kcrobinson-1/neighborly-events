import { createClient } from "jsr:@supabase/supabase-js@2.101.1";

/** Shape returned by the completion RPC before it is mapped to the API response. */
export type CompletionRpcRow = {
  attempt_number: number;
  completion_id: string;
  entitlement_created_at: string;
  entitlement_status: "existing" | "new";
  message: string;
  entitlement_eligible: boolean;
  score: number;
  verification_code: string;
};

export type CompletionPersistenceInput = {
  durationMs: number;
  eventId: string;
  normalizedAnswers: Record<string, string[]>;
  requestId: string;
  sessionId: string;
  trustedScore: number;
};

export type CompletionPersistenceResult = {
  data: CompletionRpcRow | null;
  error: { message: string } | null;
};

export type CompletionLookupInput = {
  eventId: string;
  requestId: string;
  sessionId: string;
};

/** Row shape selected by the replay lookup, including the joined entitlement. */
type StoredCompletionRow = {
  attempt_number: number;
  entitlement: { created_at: string } | null;
  entitlement_awarded: boolean;
  id: string;
  score: number;
  verification_code: string;
};

/**
 * Resolves a completion already stored for this (event, session, request id).
 * `data` and `error` both null means no stored completion exists and the
 * caller should run the normal validate-and-persist flow.
 */
export async function findCompletionByRequestId(
  input: CompletionLookupInput,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<CompletionPersistenceResult> {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const { data, error } = await supabase
    .from("game_completions")
    .select(
      "id, attempt_number, score, verification_code, entitlement_awarded, entitlement:game_entitlements!game_completions_entitlement_id_fkey(created_at)",
    )
    .eq("event_id", input.eventId)
    .eq("client_session_id", input.sessionId)
    .eq("request_id", input.requestId)
    .maybeSingle<StoredCompletionRow>();

  if (error) {
    return { data: null, error: { message: error.message } };
  }

  if (!data) {
    return { data: null, error: null };
  }

  // entitlement_id is NOT NULL with a foreign key, so a missing join row is a
  // data-integrity failure rather than a "not found" outcome.
  if (!data.entitlement) {
    return { data: null, error: { message: "completion_entitlement_missing" } };
  }

  // Mirrors the RPC's idempotency short-circuit so a replayed request id gets
  // the same response whether it is resolved here or inside the RPC.
  return {
    data: {
      attempt_number: data.attempt_number,
      completion_id: data.id,
      entitlement_created_at: data.entitlement.created_at,
      entitlement_status: data.entitlement_awarded ? "new" : "existing",
      message: data.entitlement_awarded
        ? "You earned your raffle entry."
        : "You already earned your raffle entry. This retake does not create another ticket.",
      entitlement_eligible: data.entitlement_awarded,
      score: data.score,
      verification_code: data.verification_code,
    },
    error: null,
  };
}

export async function persistCompletion(
  input: CompletionPersistenceInput,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<CompletionPersistenceResult> {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  return await supabase
    .rpc("complete_game_and_award_entitlement", {
      p_client_session_id: input.sessionId,
      p_duration_ms: input.durationMs,
      p_event_id: input.eventId,
      p_request_id: input.requestId,
      p_score: input.trustedScore,
      p_submitted_answers: input.normalizedAnswers,
    })
    .single<CompletionRpcRow>();
}
