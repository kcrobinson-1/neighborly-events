import { getBrowserSupabaseClient } from "../lib/supabaseBrowser";
import { mergeRedemptionSlices } from "./mergeRedemptionSlices";
import type { RedemptionRow } from "./types";

export const REDEMPTIONS_FETCH_LIMIT = 500;

export const DEFAULT_REDEMPTIONS_ERROR_MESSAGE =
  "We couldn't load redemptions right now.";

const REDEMPTION_ROW_COLUMNS = [
  "id",
  "event_id",
  "verification_code",
  "redemption_status",
  "redeemed_at",
  "redeemed_by",
  "redeemed_by_role",
  "redemption_note",
  "redemption_reversed_at",
  "redemption_reversed_by",
  "redemption_reversed_by_role",
].join(",");

/**
 * Runs the two-slice monitoring fetch (redeemed + reversed) in parallel and
 * returns the merged, sorted, capped slice used by the monitoring list.
 *
 * PostgREST `.order()` accepts only one column at a time, so the redeemed
 * slice is sorted by `redeemed_at` and the reversed slice by
 * `redemption_reversed_at`. See `mergeRedemptionSlices` for the client-side
 * merge semantics.
 */
export async function fetchRedemptionSlices(
  eventId: string,
): Promise<RedemptionRow[]> {
  const client = getBrowserSupabaseClient();

  const [redeemedResponse, reversedResponse] = await Promise.all([
    client
      .from("game_entitlements")
      .select(REDEMPTION_ROW_COLUMNS)
      .eq("event_id", eventId)
      .eq("redemption_status", "redeemed")
      .order("redeemed_at", { ascending: false, nullsFirst: false })
      .limit(REDEMPTIONS_FETCH_LIMIT),
    client
      .from("game_entitlements")
      .select(REDEMPTION_ROW_COLUMNS)
      .eq("event_id", eventId)
      .not("redemption_reversed_at", "is", null)
      .order("redemption_reversed_at", { ascending: false, nullsFirst: false })
      .limit(REDEMPTIONS_FETCH_LIMIT),
  ]);

  if (redeemedResponse.error) {
    throw new Error(
      redeemedResponse.error.message || DEFAULT_REDEMPTIONS_ERROR_MESSAGE,
    );
  }
  if (reversedResponse.error) {
    throw new Error(
      reversedResponse.error.message || DEFAULT_REDEMPTIONS_ERROR_MESSAGE,
    );
  }

  const redeemed = (redeemedResponse.data ?? []) as unknown as RedemptionRow[];
  const reversed = (reversedResponse.data ?? []) as unknown as RedemptionRow[];

  return mergeRedemptionSlices(redeemed, reversed, REDEMPTIONS_FETCH_LIMIT);
}

/**
 * Reads a single entitlement row scoped to `(event_id, id)`.
 *
 * Used by the post-reversal refresh path (B.2b): after a successful reverse
 * mutation, the open detail sheet re-reads the affected row in parallel with
 * the full list refetch so the sheet can reflect the canonical server state
 * without waiting for the bounded list refresh to complete.
 *
 * Returns `null` when the row is not visible to the caller (RLS, event-scope
 * mismatch, or the row genuinely no longer exists).
 */
export async function fetchRedemptionRow(
  eventId: string,
  rowId: string,
): Promise<RedemptionRow | null> {
  const client = getBrowserSupabaseClient();

  const { data, error } = await client
    .from("game_entitlements")
    .select(REDEMPTION_ROW_COLUMNS)
    .eq("event_id", eventId)
    .eq("id", rowId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || DEFAULT_REDEMPTIONS_ERROR_MESSAGE);
  }

  return (data ?? null) as RedemptionRow | null;
}
