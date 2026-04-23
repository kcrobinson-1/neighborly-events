import { type ReactNode, useEffect, useRef } from "react";
import { formatActor } from "./formatActor";
import type { RedemptionRow } from "./types";
import type { ReverseResultState } from "./useReverseRedemption";

export type RedemptionDetailSheetStep = "details" | "confirmation";

export type RedemptionDetailSheetReversalProps = {
  detailRefreshError: string | null;
  isReversible: boolean;
  mutationState: ReverseResultState;
  onBack: () => void;
  onConfirmReversal: () => void;
  onReasonInputChange: (value: string) => void;
  onRetryDetailRefresh: () => void;
  onRetryReversal: () => void;
  onStartConfirmation: () => void;
  reasonInput: string;
  step: RedemptionDetailSheetStep;
};

type RedemptionDetailSheetProps = {
  currentUserId: string | null;
  eventCode: string;
  onClose: () => void;
  /**
   * When omitted, the sheet renders view-only (no reversal CTA, no
   * confirmation step). The page shell passes real reversal props once the
   * orchestration is wired up.
   */
  reversal?: RedemptionDetailSheetReversalProps;
  /** DOM id to return focus to when the sheet closes. */
  returnFocusTargetId: string | null;
  row: RedemptionRow | null;
};

const DEFAULT_REVERSAL_PROPS: RedemptionDetailSheetReversalProps = {
  detailRefreshError: null,
  isReversible: false,
  mutationState: { status: "idle" },
  onBack: () => {},
  onConfirmReversal: () => {},
  onReasonInputChange: () => {},
  onRetryDetailRefresh: () => {},
  onRetryReversal: () => {},
  onStartConfirmation: () => {},
  reasonInput: "",
  step: "details",
};

function formatActivityTimestamp(timestamp: string | null): string | null {
  if (timestamp === null) {
    return null;
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  try {
    return parsed.toLocaleString();
  } catch {
    return parsed.toISOString();
  }
}

function resolveStatus(
  row: RedemptionRow,
): "redeemed" | "reversed" | "unknown" {
  if (row.redemption_status === "redeemed") {
    return "redeemed";
  }
  if (
    row.redemption_status === "unredeemed" &&
    row.redemption_reversed_at !== null
  ) {
    return "reversed";
  }
  return "unknown";
}

function focusById(id: string | null) {
  if (id === null || typeof document === "undefined") {
    return;
  }
  const target = document.getElementById(id);
  if (target && typeof target.focus === "function") {
    target.focus();
  }
}

function resolveSuccessCopy(state: ReverseResultState): string | null {
  if (state.status !== "success") {
    return null;
  }
  return state.result === "reversed_now"
    ? "Redemption reversed."
    : "This redemption was already reversed.";
}

function resolveFailureCopy(state: ReverseResultState): string | null {
  if (state.status !== "failure") {
    return null;
  }
  return state.result === "not_authorized"
    ? "You aren't authorized to reverse this redemption."
    : "This redemption could not be found.";
}

/**
 * Bottom sheet for the redemption monitoring list.
 *
 * The sheet drives two internal steps through the `reversal.step` prop:
 * `details` (the B.2a view) and `confirmation` (the B.2b reversal
 * confirmation). The shell, focus trap, scrim close, and return-focus
 * behavior stay under one accessibility contract across both steps.
 *
 * The component is presentational: all mutation orchestration, state
 * transitions, and network calls live in the page shell. The sheet just
 * renders what the current props describe.
 */
export function RedemptionDetailSheet({
  currentUserId,
  eventCode,
  onClose,
  returnFocusTargetId,
  reversal: reversalProp,
  row,
}: RedemptionDetailSheetProps) {
  const reversal = reversalProp ?? DEFAULT_REVERSAL_PROPS;
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = row !== null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "Tab") {
        const sheet = sheetRef.current;
        if (!sheet) {
          return;
        }
        const focusable = Array.from(
          sheet.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => !element.hasAttribute("disabled"));

        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey && activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    focusById(returnFocusTargetId);
    // isOpen transitioning false → runs after the sheet unmounts, returning
    // focus to the list row's View details button.
  }, [isOpen, returnFocusTargetId]);

  if (!isOpen) {
    return null;
  }

  const status = resolveStatus(row);
  const prefixedCode = row.verification_code.startsWith(`${eventCode}-`)
    ? row.verification_code
    : row.verification_code;
  const redeemedAt = formatActivityTimestamp(row.redeemed_at);
  const reversedAt = formatActivityTimestamp(row.redemption_reversed_at);

  const redeemedActor =
    row.redeemed_by_role !== null || row.redeemed_by !== null
      ? formatActor({
        by: row.redeemed_by,
        currentUserId,
        role: row.redeemed_by_role,
      })
      : null;

  const reversedActor =
    row.redemption_reversed_by_role !== null ||
    row.redemption_reversed_by !== null
      ? formatActor({
        by: row.redemption_reversed_by,
        currentUserId,
        role: row.redemption_reversed_by_role,
      })
      : null;

  const isPending = reversal.mutationState.status === "pending";
  const successCopy = resolveSuccessCopy(reversal.mutationState);
  const failureCopy = resolveFailureCopy(reversal.mutationState);
  const transientCopy = reversal.mutationState.status === "transient_error"
    ? reversal.mutationState.message
    : null;

  // Defense in depth: never show the reversal CTA while a mutation has
  // already succeeded for this row, even if the page has not yet received
  // the refreshed row state that would flip `isReversible` to false.
  const showReverseCta =
    reversal.step === "details" &&
    reversal.isReversible &&
    reversal.mutationState.status !== "success";

  return (
    <div className="redemptions-sheet-container" ref={sheetRef}>
      <button
        aria-label="Close details"
        className="redemptions-sheet-scrim"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby="redemption-detail-sheet-title"
        aria-modal="true"
        className="redemptions-sheet"
        role="dialog"
      >
        <header className="redemptions-sheet-header">
          <div>
            <p className="eyebrow">Redemption details</p>
            <h2
              className="redemptions-sheet-code"
              id="redemption-detail-sheet-title"
            >
              {prefixedCode}
            </h2>
          </div>
          <button
            className="secondary-button"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            Close
          </button>
        </header>
        {reversal.step === "details"
          ? (
            <section className="redemptions-sheet-body">
              <RedemptionDetailRow label="Status">
                <span
                  className={`redemptions-status-badge redemptions-status-badge-${status}`}
                >
                  {status === "redeemed"
                    ? "Redeemed"
                    : status === "reversed"
                    ? "Reversed"
                    : "Unknown"}
                </span>
              </RedemptionDetailRow>
              {redeemedAt !== null
                ? (
                  <RedemptionDetailRow label="Redeemed at">
                    <span>{redeemedAt}</span>
                  </RedemptionDetailRow>
                )
                : null}
              {redeemedActor !== null
                ? (
                  <RedemptionDetailRow label="Redeemed by">
                    <span>{redeemedActor}</span>
                  </RedemptionDetailRow>
                )
                : null}
              {reversedAt !== null
                ? (
                  <RedemptionDetailRow label="Reversed at">
                    <span>{reversedAt}</span>
                  </RedemptionDetailRow>
                )
                : null}
              {reversedActor !== null
                ? (
                  <RedemptionDetailRow label="Reversed by">
                    <span>{reversedActor}</span>
                  </RedemptionDetailRow>
                )
                : null}
              {row.redemption_note !== null
                ? (
                  <RedemptionDetailRow label="Reason">
                    <span>{row.redemption_note}</span>
                  </RedemptionDetailRow>
                )
                : null}
              {successCopy !== null
                ? (
                  <p
                    className="redemptions-sheet-banner redemptions-sheet-banner-success"
                    role="status"
                  >
                    {successCopy}
                  </p>
                )
                : null}
              {reversal.detailRefreshError !== null
                ? (
                  <div
                    className="redemptions-sheet-banner redemptions-sheet-banner-warning"
                    role="alert"
                  >
                    <p>{reversal.detailRefreshError}</p>
                    <button
                      className="secondary-button"
                      onClick={reversal.onRetryDetailRefresh}
                      type="button"
                    >
                      Refresh details
                    </button>
                  </div>
                )
                : null}
              {showReverseCta
                ? (
                  <button
                    className="primary-button redemptions-sheet-reverse-cta"
                    onClick={reversal.onStartConfirmation}
                    type="button"
                  >
                    Reverse redemption
                  </button>
                )
                : null}
            </section>
          )
          : (
            <section className="redemptions-sheet-body redemptions-sheet-confirmation">
              <h3 className="redemptions-sheet-confirmation-heading">
                Reverse redemption?
              </h3>
              <div className="redemptions-sheet-confirmation-summary">
                <RedemptionDetailRow label="Code">
                  <span>{prefixedCode}</span>
                </RedemptionDetailRow>
                <RedemptionDetailRow label="Event">
                  <span>{eventCode}</span>
                </RedemptionDetailRow>
                <RedemptionDetailRow label="Prior status">
                  <span className="redemptions-status-badge redemptions-status-badge-redeemed">
                    Redeemed
                  </span>
                </RedemptionDetailRow>
                {redeemedAt !== null
                  ? (
                    <RedemptionDetailRow label="Redeemed at">
                      <span>{redeemedAt}</span>
                    </RedemptionDetailRow>
                  )
                  : null}
                {redeemedActor !== null
                  ? (
                    <RedemptionDetailRow label="Redeemed by">
                      <span>{redeemedActor}</span>
                    </RedemptionDetailRow>
                  )
                  : null}
              </div>
              <label className="redemptions-sheet-reason-label">
                <span className="redemptions-sheet-row-label">
                  Reason (optional)
                </span>
                <input
                  className="redemptions-sheet-reason-input"
                  disabled={isPending}
                  onChange={(event) =>
                    reversal.onReasonInputChange(event.target.value)}
                  type="text"
                  value={reversal.reasonInput}
                />
              </label>
              {failureCopy !== null
                ? (
                  <p
                    className="redemptions-sheet-banner redemptions-sheet-banner-error"
                    role="alert"
                  >
                    {failureCopy}
                  </p>
                )
                : null}
              {transientCopy !== null
                ? (
                  <div
                    className="redemptions-sheet-banner redemptions-sheet-banner-warning"
                    role="alert"
                  >
                    <p>{transientCopy}</p>
                    <button
                      className="secondary-button"
                      onClick={reversal.onRetryReversal}
                      type="button"
                    >
                      Retry
                    </button>
                  </div>
                )
                : null}
              <div className="redemptions-sheet-actions">
                <button
                  className="secondary-button"
                  disabled={isPending}
                  onClick={reversal.onBack}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="primary-button"
                  disabled={isPending ||
                    reversal.mutationState.status === "failure"}
                  onClick={reversal.onConfirmReversal}
                  type="button"
                >
                  {isPending ? "Reversing..." : "Confirm reversal"}
                </button>
              </div>
            </section>
          )}
      </div>
    </div>
  );
}

function RedemptionDetailRow(
  { label, children }: { children: ReactNode; label: string },
) {
  return (
    <div className="redemptions-sheet-row">
      <span className="redemptions-sheet-row-label">{label}</span>
      {children}
    </div>
  );
}
