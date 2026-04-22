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
 * snapshot used by the `Last 15m` chip. The clock snapshot is captured on
 * mount and refreshed whenever any chip toggles — matching the design doc
 * §5 contract ("reference clock refreshes on every page render" is
 * operationalized here as "on every filter-state change," which is the only
 * time the cutoff can meaningfully advance without an auto-ticking timer).
 */
export function useRedemptionsFilters() {
  const [chips, setChips] = useState<RedemptionChipSelection>(INITIAL_CHIPS);
  const [searchInput, setSearchInput] = useState("");
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
