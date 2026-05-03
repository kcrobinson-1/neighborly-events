import type { RedemptionRow } from "./types";

/**
 * Structural subset of RedemptionRow needed to compute activity
 * timestamps. Demo-mode read-only views (M3 phase 3.2) consume this
 * type instead of the full RedemptionRow so the demo Edge Function
 * does not need to leak operator PII fields (`redeemed_by`,
 * `redemption_note`, `redemption_reversed_by`) to unauthenticated
 * visitors.
 */
export type RedemptionActivityFields = Pick<
  RedemptionRow,
  "redeemed_at" | "redemption_reversed_at"
>;

/**
 * Returns the newer of a row's redemption activity timestamps.
 *
 * A re-redeemed row (redeemed → reversed → redeemed again) carries values
 * in both `redeemed_at` and `redemption_reversed_at` because the A.2a
 * `redeem_entitlement_by_code` RPC updates `redeemed_*` without clearing
 * `redemption_reversed_*`. Falling back to `redemption_reversed_at ??
 * redeemed_at` would sort and filter such rows by their prior reversal
 * timestamp (older), mis-ordering the list and excluding recent
 * re-redemptions from recency-based views.
 *
 * Both columns are ISO-8601 strings, so lexicographic comparison matches
 * chronological order.
 */
export function computeActivityTimestamp(
  row: RedemptionActivityFields,
): string | null {
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

/** True when the row is currently in the reversed state (status unredeemed with reversal metadata). */
export function isRowCurrentlyReversed(
  row: Pick<RedemptionRow, "redemption_status" | "redemption_reversed_at">,
): boolean {
  return (
    row.redemption_status === "unredeemed" &&
    row.redemption_reversed_at !== null
  );
}
