import { type ReactNode, useEffect, useRef } from "react";
import { formatActor } from "./formatActor";
import type { RedemptionRow } from "./types";

type RedemptionDetailSheetProps = {
  currentUserId: string | null;
  eventCode: string;
  onClose: () => void;
  /** DOM id to return focus to when the sheet closes. */
  returnFocusTargetId: string | null;
  row: RedemptionRow | null;
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

/**
 * View-only bottom sheet for the redemption monitoring list.
 *
 * Contract (see reward-redemption-phase-b-2a-plan.md § Detail bottom sheet):
 * - Focus-trap tab traversal inside the sheet
 * - `Escape` closes
 * - Scrim click closes
 * - On mount, focus the Close button
 * - On close, focus returns to `returnFocusTargetId`
 * - No Reverse button in B.2a — B.2b will mount action buttons inside this
 *   same shell without changing the contract here
 */
export function RedemptionDetailSheet({
  currentUserId,
  eventCode,
  onClose,
  returnFocusTargetId,
  row,
}: RedemptionDetailSheetProps) {
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
          {redeemedAt !== null ? (
            <RedemptionDetailRow label="Redeemed at">
              <span>{redeemedAt}</span>
            </RedemptionDetailRow>
          ) : null}
          {redeemedActor !== null ? (
            <RedemptionDetailRow label="Redeemed by">
              <span>{redeemedActor}</span>
            </RedemptionDetailRow>
          ) : null}
          {reversedAt !== null ? (
            <RedemptionDetailRow label="Reversed at">
              <span>{reversedAt}</span>
            </RedemptionDetailRow>
          ) : null}
          {reversedActor !== null ? (
            <RedemptionDetailRow label="Reversed by">
              <span>{reversedActor}</span>
            </RedemptionDetailRow>
          ) : null}
        </section>
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
