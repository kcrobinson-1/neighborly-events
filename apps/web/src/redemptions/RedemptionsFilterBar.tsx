import type { RedemptionChipSelection } from "./filterRedemptions";

type RedemptionsFilterBarProps = {
  chips: RedemptionChipSelection;
  onChipToggle: (chipName: keyof RedemptionChipSelection) => void;
  onSearchInputChange: (value: string) => void;
  searchInput: string;
};

type FilterChipProps = {
  active: boolean;
  label: string;
  onClick: () => void;
};

function FilterChip({ active, label, onClick }: FilterChipProps) {
  return (
    <button
      aria-pressed={active}
      className={`redemptions-filter-chip${active ? " is-active" : ""}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

/** Sticky search + chip filter bar for the monitoring page. */
export function RedemptionsFilterBar({
  chips,
  onChipToggle,
  onSearchInputChange,
  searchInput,
}: RedemptionsFilterBarProps) {
  return (
    <div className="redemptions-filter-bar">
      <label
        className="redemptions-search-label"
        htmlFor="redemptions-search-input"
      >
        <span className="sr-only">Search redemptions by code</span>
        <input
          autoComplete="off"
          className="redemptions-search-input"
          id="redemptions-search-input"
          onChange={(event) => onSearchInputChange(event.target.value)}
          placeholder="Search by code (e.g. 0427 or MAD-0427)"
          type="search"
          value={searchInput}
        />
      </label>
      <div
        aria-label="Filter redemptions"
        className="redemptions-filter-chips"
        role="group"
      >
        <FilterChip
          active={chips.last15m}
          label="Last 15m"
          onClick={() => onChipToggle("last15m")}
        />
        <FilterChip
          active={chips.redeemed}
          label="Redeemed"
          onClick={() => onChipToggle("redeemed")}
        />
        <FilterChip
          active={chips.reversed}
          label="Reversed"
          onClick={() => onChipToggle("reversed")}
        />
        <FilterChip
          active={chips.byMe}
          label="By me"
          onClick={() => onChipToggle("byMe")}
        />
      </div>
    </div>
  );
}
