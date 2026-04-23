import { useCallback, useState } from "react";
import type { RedemptionChipSelection } from "./filterRedemptions";

const INITIAL_CHIPS: RedemptionChipSelection = {
  byMe: false,
  last15m: false,
  redeemed: false,
  reversed: false,
};

/**
 * Client-side filter state for the monitoring page.
 *
 * Owns the four chip toggles, the search input, and the reference clock
 * snapshot used by the `Last 15m` chip. The clock advances on every
 * filter-state change (chip toggle, search input edit, explicit refresh,
 * or post-reconnect reconcile) — this is the load-bearing invariant that
 * keeps `Last 15m` accurate without an auto-ticking timer. If a future
 * caller bypasses the wrapped setter and exposes a raw `setSearchInput`,
 * the cutoff will grow stale during normal typing and the chip contract
 * breaks.
 */
export function useRedemptionsFilters() {
  const [chips, setChips] = useState<RedemptionChipSelection>(INITIAL_CHIPS);
  const [searchInput, setSearchInputState] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const toggleChip = useCallback(
    (chipName: keyof RedemptionChipSelection) => {
      setChips((current) => ({
        ...current,
        [chipName]: !current[chipName],
      }));
      setNowMs(Date.now());
    },
    [],
  );

  const setSearchInput = useCallback((value: string) => {
    setSearchInputState(value);
    setNowMs(Date.now());
  }, []);

  const refreshNowMs = useCallback(() => {
    setNowMs(Date.now());
  }, []);

  return {
    chips,
    nowMs,
    refreshNowMs,
    searchInput,
    setSearchInput,
    toggleChip,
  };
}
