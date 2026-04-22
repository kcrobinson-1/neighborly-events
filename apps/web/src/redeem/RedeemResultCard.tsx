import type { RedeemResultState } from "./useRedeemSubmit";

type RedeemResultCardProps = {
  isSubmitting?: boolean;
  onClear: () => void;
  onRedeemNextCode: () => void;
  onRetry: () => void;
  state: RedeemResultState;
};

function formatRedeemedByRole(role: "agent" | "root_admin") {
  return role === "root_admin" ? "Redeemed by root admin." : "Redeemed by agent.";
}

function formatRedeemedAt(isoString: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}

/** Presents the redeem route's idle, success, rejected, and transient-result states. */
export function RedeemResultCard({
  isSubmitting = false,
  onClear,
  onRedeemNextCode,
  onRetry,
  state,
}: RedeemResultCardProps) {
  if (state.status === "success") {
    return (
      <div className="redeem-status-card redeem-status-card-success">
        <p className="chip chip-success">Code checked</p>
        <h2>{state.result === "redeemed_now" ? "Redeemed" : "Already redeemed"}</h2>
        <p className="redeem-status-meta">{formatRedeemedAt(state.redeemedAt)}</p>
        <p>{formatRedeemedByRole(state.redeemedByRole)}</p>
        <button className="primary-button" onClick={onRedeemNextCode} type="button">
          Redeem Next Code
        </button>
      </div>
    );
  }

  if (state.status === "failure") {
    return (
      <div className="redeem-status-card redeem-status-card-error">
        <p className="chip chip-error">Try again</p>
        <h2>
          {state.result === "not_authorized"
            ? "Not authorized for this code"
            : "Code not found"}
        </h2>
        <p>
          {state.result === "not_authorized"
            ? "This code can't be redeemed from your current operator session."
            : "Check the 4-digit suffix and try again."}
        </p>
        <div className="redeem-result-actions">
          <button className="secondary-button" onClick={onClear} type="button">
            Clear
          </button>
          <button
            className="primary-button"
            disabled={isSubmitting}
            onClick={onRetry}
            type="button"
          >
            {isSubmitting ? "Retrying..." : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  if (state.status === "transient_error") {
    return (
      <div className="redeem-status-card redeem-status-card-error">
        <p className="chip chip-error">Connection issue</p>
        <h2>We couldn&apos;t redeem this code right now.</h2>
        <p>{state.message}</p>
        <button
          className="primary-button"
          disabled={state.isOffline || isSubmitting}
          onClick={onRetry}
          type="button"
        >
          {state.isOffline ? "You are offline" : isSubmitting ? "Retrying..." : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div className="redeem-status-card">
      <p className="redeem-code-preview-label">Enter the 4-digit code suffix.</p>
      <h2>Enter a 4-digit code</h2>
      <p>The keypad stays on-screen so the next attendee is fast to process.</p>
    </div>
  );
}
