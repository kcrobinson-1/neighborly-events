import type { RedemptionRow } from "./types";

function computeActivityTimestamp(row: RedemptionRow) {
  return row.redemption_reversed_at ?? row.redeemed_at;
}

/** Compare two rows by `COALESCE(redemption_reversed_at, redeemed_at) DESC, id DESC`. */
export function compareRedemptionRowsByActivity(
  first: RedemptionRow,
  second: RedemptionRow,
) {
  const firstTimestamp = computeActivityTimestamp(first);
  const secondTimestamp = computeActivityTimestamp(second);

  if (firstTimestamp === null && secondTimestamp === null) {
    return second.id.localeCompare(first.id);
  }
  if (firstTimestamp === null) {
    return 1;
  }
  if (secondTimestamp === null) {
    return -1;
  }

  if (firstTimestamp < secondTimestamp) {
    return 1;
  }
  if (firstTimestamp > secondTimestamp) {
    return -1;
  }
  return second.id.localeCompare(first.id);
}

/**
 * Merges the redeemed-slice and reversed-slice results into the monitoring
 * list's cached slice.
 *
 * PostgREST `.order()` accepts only a single column at a time, so B.2a issues
 * two bounded fetches — one sorted by `redeemed_at` and one by
 * `redemption_reversed_at`. This function dedupes rows that appear in both
 * slices (prefer the redeemed-slice record because it represents the current
 * cycle), sorts the combined set by
 * `COALESCE(redemption_reversed_at, redeemed_at) DESC, id DESC`, and truncates
 * to the bounded cap.
 */
export function mergeRedemptionSlices(
  redeemed: RedemptionRow[],
  reversed: RedemptionRow[],
  cap: number,
): RedemptionRow[] {
  const byId = new Map<string, RedemptionRow>();

  for (const row of redeemed) {
    byId.set(row.id, row);
  }
  for (const row of reversed) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
  }

  const merged = Array.from(byId.values());
  merged.sort(compareRedemptionRowsByActivity);

  if (cap < 0) {
    return [];
  }

  return merged.slice(0, cap);
}
