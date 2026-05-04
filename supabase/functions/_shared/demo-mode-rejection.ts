import { createClient } from "jsr:@supabase/supabase-js@2.101.1";

import { isTestEventSlug } from "../../../shared/events/testEventAllowlist.ts";

/**
 * Subset of the Supabase admin client used by the helper. Defined
 * structurally so test fakes can stand in without importing the full
 * `SupabaseClient` generic — the helper only needs `.from(...)` to reach
 * the four-step query chain below.
 */
export type DemoModeRejectionSupabaseAdmin = Pick<
  ReturnType<typeof createClient>,
  "from"
>;

/**
 * Body shape returned by `evaluateDemoModeRejection` when the request must
 * be short-circuited as a demo-mode read-only rejection. The `error` field
 * is the contract clients switch on; the `message` field is human-readable
 * and may evolve.
 */
export type DemoModeRejectionBody = {
  error: "demo_mode_read_only";
  message: string;
};

type GameEventSlugRow = {
  slug: string;
};

const READ_ONLY_MESSAGE = "Demo mode — sign in to make changes.";

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

/**
 * Evaluates whether a mutation Edge Function request should be rejected as
 * a demo-mode read-only attempt. Returning `null` means the caller should
 * continue to its existing auth gate; returning a `DemoModeRejectionBody`
 * means the caller should wrap it in HTTP 403 using its own response
 * composition (the helper intentionally punts response shaping to the
 * caller because the five mutation functions use two different CORS
 * patterns).
 *
 * The Bearer-token check fires first as a cheap escape hatch — most
 * authenticated requests skip the slug-resolution SELECT entirely. The
 * SELECT only fires when no Bearer token is present, which already
 * implies the request would fail the existing auth gate. On missing-row
 * or query-error, the helper returns `null` and defers to the auth gate's
 * fail-closed behavior.
 *
 * Bearer-token reading is duplicated rather than extracted from the
 * sibling `*-auth.ts` helpers so this helper stays independently
 * auditable; same pattern used by `event-organizer-auth.ts` against
 * `admin-auth.ts`.
 */
export async function evaluateDemoModeRejection(args: {
  request: Request;
  eventId: string;
  supabaseAdmin: DemoModeRejectionSupabaseAdmin;
}): Promise<DemoModeRejectionBody | null> {
  if (readBearerToken(args.request) !== null) {
    return null;
  }

  const { data, error } = await args.supabaseAdmin
    .from("game_events")
    .select("slug")
    .eq("id", args.eventId)
    .maybeSingle<GameEventSlugRow>();

  if (error || !data) {
    return null;
  }

  if (!isTestEventSlug(data.slug)) {
    return null;
  }

  return {
    error: "demo_mode_read_only",
    message: READ_ONLY_MESSAGE,
  };
}
