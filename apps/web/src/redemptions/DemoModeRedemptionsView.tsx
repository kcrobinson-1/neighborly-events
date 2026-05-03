import { useEffect, useState } from "react";
import type { TestEventSlug } from "../../../../shared/events/testEventAllowlist";
import {
  computeActivityTimestamp,
  isRowCurrentlyReversed,
} from "./activityTimestamp";
import {
  fetchDemoModeRead,
  type DemoModeRedemptionRow,
} from "../lib/fetchDemoModeRead";

type DemoModeRedemptionsViewProps = {
  slug: TestEventSlug;
};

type LoadState =
  | { status: "loading" }
  | { rows: DemoModeRedemptionRow[]; status: "ready" }
  | { message: string; status: "error" };

function formatTimestamp(value: string | null): string {
  if (value === null) {
    return "Unknown time";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  try {
    return parsed.toLocaleString();
  } catch {
    return parsed.toISOString();
  }
}

function resolveStatusLabel(row: DemoModeRedemptionRow): string {
  if (row.redemption_status === "redeemed") {
    return "Redeemed";
  }
  if (isRowCurrentlyReversed(row)) {
    return "Reversed";
  }
  return "Unredeemed";
}

/**
 * Read-only redemptions variant rendered on the bypass-rendered
 * surface.
 *
 * Renders the merged redeemed-and-reversed row list the demo-mode
 * read shim returns; row-detail mutation affordances (the reverse
 * action, the detail-sheet's reverse button) are intentionally
 * absent. Phase 3.3 reintroduces them in the chosen disabled-state
 * shape per the milestone doc's read-side / write-side seam.
 */
export function DemoModeRedemptionsView({
  slug,
}: DemoModeRedemptionsViewProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    // React 18 batches synchronous setState calls inside effects, so the
    // reset-to-loading on slug change does not cascade in practice.
    // Mirrors the pattern in useEventAdminWorkspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });

    void fetchDemoModeRead({ slug, surface: "redemptions" })
      .then((rows) => {
        if (isCancelled) {
          return;
        }
        setState({ rows, status: "ready" });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }
        setState({
          message: error instanceof Error
            ? error.message
            : "We couldn't load redemptions right now.",
          status: "error",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div className="signin-stack demo-mode-stack">
        <button className="secondary-button" disabled type="button">
          Loading redemptions...
        </button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="signin-stack demo-mode-stack">
        <div className="section-heading">
          <h2>We couldn&apos;t load redemptions right now.</h2>
        </div>
        <p>{state.message}</p>
      </div>
    );
  }

  if (state.rows.length === 0) {
    return (
      <div className="signin-stack demo-mode-stack">
        <div className="section-heading">
          <h2>No redemptions yet.</h2>
        </div>
        <p>
          A signed-in organizer at this event would see redeemed and
          reversed entitlements appear here as volunteers run the
          booth.
        </p>
      </div>
    );
  }

  return (
    <div className="signin-stack demo-mode-stack">
      <div className="section-heading">
        <p className="eyebrow">Demo monitoring view</p>
        <h2>{state.rows.length} redemption{state.rows.length === 1 ? "" : "s"}</h2>
      </div>
      <ul className="redemptions-list demo-mode-redemptions-list">
        {state.rows.map((row) => (
          <li className="redemptions-row" key={row.id}>
            <div className="redemptions-row-primary">
              <span className="redemptions-row-code">{row.verification_code}</span>
              <span className="redemptions-row-status">{resolveStatusLabel(row)}</span>
            </div>
            <div className="redemptions-row-secondary">
              <span>{formatTimestamp(computeActivityTimestamp(row))}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
