import { useEffect, useState } from "react";
import type { TestEventSlug } from "../../../../shared/events/testEventAllowlist";
import {
  fetchDemoModeRead,
  type DemoEventAdminSummary,
} from "../lib/fetchDemoModeRead";

type DemoModeAdminViewProps = {
  slug: TestEventSlug;
};

type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; summary: DemoEventAdminSummary }
  | { message: string; status: "error" };

const STATUS_LABELS: Record<DemoEventAdminSummary["status"], string> = {
  draft_only: "Draft only",
  live: "Live",
  live_with_draft_changes: "Live with draft changes",
};

function formatTimestamp(value: string): string {
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

/**
 * Read-only admin variant rendered on the bypass-rendered surface.
 *
 * Renders the published-event metadata the demo-mode read shim
 * returns. Mutation controls (Save, Publish, Unpublish, draft
 * editing) are intentionally absent — phase 3.3 introduces the
 * disabled-state shape per the milestone doc's read-side / write-
 * side seam.
 */
export function DemoModeAdminView({ slug }: DemoModeAdminViewProps) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isCancelled = false;
    // React 18 batches synchronous setState calls inside effects, so the
    // reset-to-loading on slug change does not cascade in practice.
    // Mirrors the pattern in useEventAdminWorkspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: "loading" });

    void fetchDemoModeRead({ slug, surface: "admin" })
      .then((summary) => {
        if (isCancelled) {
          return;
        }
        if (!summary) {
          setState({ status: "missing" });
          return;
        }
        setState({ status: "ready", summary });
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }
        setState({
          message: error instanceof Error
            ? error.message
            : "We couldn't load the demo data right now.",
          status: "error",
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div className="admin-state-stack">
        <button className="secondary-button" disabled type="button">
          Loading event workspace...
        </button>
      </div>
    );
  }

  if (state.status === "missing") {
    return (
      <div className="admin-state-stack">
        <div className="section-heading">
          <h2>This event isn&apos;t available right now.</h2>
        </div>
        <p>
          We couldn&apos;t find an authoring record for this event yet.
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="admin-state-stack">
        <div className="section-heading">
          <h2>We couldn&apos;t load this event right now.</h2>
        </div>
        <p>{state.message}</p>
      </div>
    );
  }

  const { summary } = state;

  return (
    <div className="admin-state-stack">
      <div className="section-heading">
        <p className="eyebrow">Demo workspace preview</p>
        <h2>{summary.name}</h2>
      </div>
      <dl className="demo-mode-summary-list">
        <div className="demo-mode-summary-row">
          <dt>Status</dt>
          <dd>{STATUS_LABELS[summary.status]}</dd>
        </div>
        <div className="demo-mode-summary-row">
          <dt>Live to attendees</dt>
          <dd>{summary.isLive ? "Yes" : "No"}</dd>
        </div>
        <div className="demo-mode-summary-row">
          <dt>Event code</dt>
          <dd>{summary.eventCode ?? "Not assigned"}</dd>
        </div>
        <div className="demo-mode-summary-row">
          <dt>Last published version</dt>
          <dd>
            {summary.lastPublishedVersionNumber === null
              ? "Never published"
              : `v${summary.lastPublishedVersionNumber}`}
          </dd>
        </div>
        <div className="demo-mode-summary-row">
          <dt>Last updated</dt>
          <dd>{formatTimestamp(summary.updatedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}
