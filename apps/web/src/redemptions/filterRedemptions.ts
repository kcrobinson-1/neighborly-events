import {
  computeActivityTimestamp,
  isRowCurrentlyReversed,
} from "./activityTimestamp";
import type { SearchParseResult } from "./parseSearchInput";
import type { RedemptionRow } from "./types";

/** Active selection of the four monitoring-page filter chips. */
export type RedemptionChipSelection = {
  byMe: boolean;
  last15m: boolean;
  redeemed: boolean;
  reversed: boolean;
};

type FilterRedemptionsOptions = {
  chips: RedemptionChipSelection;
  currentUserId: string | null;
  nowMs: number;
  rows: RedemptionRow[];
  searchResult: SearchParseResult;
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function getActivityTimestampMs(row: RedemptionRow): number | null {
  const candidate = computeActivityTimestamp(row);
  if (candidate === null) {
    return null;
  }
  const parsed = Date.parse(candidate);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Applies the monitoring-page filter chips and suffix search against the
 * cached slice. Pure — no network or clock access; `nowMs` is passed in so
 * callers control the reference clock.
 *
 * "By me" matches rows where the current user appears as either the redeemer
 * or the reverser, so a row an organizer just reversed still surfaces when
 * they toggle the chip — even when it was originally redeemed by someone
 * else.
 */
export function filterRedemptions({
  chips,
  currentUserId,
  nowMs,
  rows,
  searchResult,
}: FilterRedemptionsOptions): RedemptionRow[] {
  if (searchResult.type === "cross_event_mismatch") {
    return [];
  }

  return rows.filter((row) => {
    if (chips.last15m) {
      const activityMs = getActivityTimestampMs(row);
      if (activityMs === null) {
        return false;
      }
      if (nowMs - activityMs >= FIFTEEN_MINUTES_MS) {
        return false;
      }
    }

    if (chips.redeemed && row.redemption_status !== "redeemed") {
      return false;
    }

    if (chips.reversed && !isRowCurrentlyReversed(row)) {
      return false;
    }

    if (chips.byMe) {
      if (currentUserId === null) {
        return false;
      }
      if (
        row.redeemed_by !== currentUserId &&
        row.redemption_reversed_by !== currentUserId
      ) {
        return false;
      }
    }

    if (searchResult.type === "suffix_match") {
      if (!row.verification_code.endsWith(searchResult.suffix)) {
        return false;
      }
    }

    return true;
  });
}
