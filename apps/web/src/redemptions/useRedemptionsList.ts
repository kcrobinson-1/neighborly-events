import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "../lib/supabaseBrowser";
import { mergeRedemptionSlices } from "./mergeRedemptionSlices";
import type { RedemptionRow } from "./types";

export const REDEMPTIONS_FETCH_LIMIT = 500;

const AUTO_RETRY_DELAY_MS = 2_000;
const DEFAULT_ERROR_MESSAGE = "We couldn't load redemptions right now.";

const SELECT_COLUMNS = [
  "id",
  "event_id",
  "verification_code",
  "redemption_status",
  "redeemed_at",
  "redeemed_by",
  "redeemed_by_role",
  "redemption_reversed_at",
  "redemption_reversed_by",
  "redemption_reversed_by_role",
].join(",");

export type RedemptionsListState =
  | { status: "loading" }
  | {
    fetchedAt: Date;
    rows: RedemptionRow[];
    status: "success";
  }
  | { message: string; status: "error" };

type UseRedemptionsListOptions = {
  eventId: string;
  retryDelayMs?: number;
};

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fetchRedemptionSlices(
  eventId: string,
): Promise<RedemptionRow[]> {
  const client = getBrowserSupabaseClient();

  const [redeemedResponse, reversedResponse] = await Promise.all([
    client
      .from("game_entitlements")
      .select(SELECT_COLUMNS)
      .eq("event_id", eventId)
      .eq("redemption_status", "redeemed")
      .order("redeemed_at", { ascending: false, nullsFirst: false })
      .limit(REDEMPTIONS_FETCH_LIMIT),
    client
      .from("game_entitlements")
      .select(SELECT_COLUMNS)
      .eq("event_id", eventId)
      .not("redemption_reversed_at", "is", null)
      .order("redemption_reversed_at", { ascending: false, nullsFirst: false })
      .limit(REDEMPTIONS_FETCH_LIMIT),
  ]);

  if (redeemedResponse.error) {
    throw new Error(redeemedResponse.error.message || DEFAULT_ERROR_MESSAGE);
  }
  if (reversedResponse.error) {
    throw new Error(reversedResponse.error.message || DEFAULT_ERROR_MESSAGE);
  }

  const redeemed = (redeemedResponse.data ?? []) as unknown as RedemptionRow[];
  const reversed = (reversedResponse.data ?? []) as unknown as RedemptionRow[];

  return mergeRedemptionSlices(redeemed, reversed, REDEMPTIONS_FETCH_LIMIT);
}

/**
 * Drives the monitoring list's bounded two-query fetch.
 *
 * Runs the redeemed and reversed slice queries in parallel, merges them
 * client-side via `mergeRedemptionSlices`, and owns the one-retry envelope
 * (2s backoff) plus the "last updated at" timestamp. Refreshing is explicit
 * — no auto-poll, per design doc §8.
 */
export function useRedemptionsList({
  eventId,
  retryDelayMs = AUTO_RETRY_DELAY_MS,
}: UseRedemptionsListOptions) {
  const [state, setState] = useState<RedemptionsListState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const runFetch = async () => {
      try {
        const rows = await fetchRedemptionSlices(eventId);
        if (!isCancelled) {
          setState({
            fetchedAt: new Date(),
            rows,
            status: "success",
          });
        }
      } catch (initialError: unknown) {
        await wait(retryDelayMs);
        if (isCancelled) {
          return;
        }

        try {
          const rows = await fetchRedemptionSlices(eventId);
          if (!isCancelled) {
            setState({
              fetchedAt: new Date(),
              rows,
              status: "success",
            });
          }
        } catch (retryError: unknown) {
          if (!isCancelled) {
            const message =
              retryError instanceof Error
                ? retryError.message
                : initialError instanceof Error
                ? initialError.message
                : DEFAULT_ERROR_MESSAGE;
            setState({
              message,
              status: "error",
            });
          }
        }
      }
    };

    void runFetch();

    return () => {
      isCancelled = true;
    };
  }, [eventId, reloadToken, retryDelayMs]);

  return { refresh, state };
}
