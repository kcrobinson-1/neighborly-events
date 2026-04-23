import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_REDEMPTIONS_ERROR_MESSAGE,
  fetchRedemptionSlices,
} from "./redemptionsData";
import type { RedemptionRow } from "./types";

export { REDEMPTIONS_FETCH_LIMIT } from "./redemptionsData";

const AUTO_RETRY_DELAY_MS = 2_000;

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

/**
 * Drives the monitoring list's bounded two-query fetch.
 *
 * Runs the redeemed and reversed slice queries in parallel (via
 * `fetchRedemptionSlices` in `redemptionsData.ts`), merges them client-side
 * via `mergeRedemptionSlices`, and owns the one-retry envelope (2s backoff)
 * plus the "last updated at" timestamp. Refreshing is explicit — no
 * auto-poll, per design doc §8.
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
                : DEFAULT_REDEMPTIONS_ERROR_MESSAGE;
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
