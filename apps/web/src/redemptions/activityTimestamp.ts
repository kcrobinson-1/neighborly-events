import type { RedemptionRow } from "./types";

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
export function computeActivityTimestamp(row: RedemptionRow): string | null {
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
export function isRowCurrentlyReversed(row: RedemptionRow): boolean {
  return (
    row.redemption_status === "unredeemed" &&
    row.redemption_reversed_at !== null
  );
}
