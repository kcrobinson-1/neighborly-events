import { formatActor } from "./formatActor";
import type { RedemptionRow as RedemptionRowType } from "./types";

type RedemptionRowProps = {
  currentUserId: string | null;
  eventCode: string;
  onView: (row: RedemptionRowType) => void;
  row: RedemptionRowType;
};

function formatActivityTimestamp(row: RedemptionRowType): string {
  const candidate = row.redemption_reversed_at ?? row.redeemed_at;
  if (candidate === null) {
    return "Unknown time";
  }
  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }
  try {
    return parsed.toLocaleString();
  } catch {
    return parsed.toISOString();
  }
}

function resolveStatus(
  row: RedemptionRowType,
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

function computeEventPrefixedCode(eventCode: string, verificationCode: string) {
  const expectedPrefix = `${eventCode}-`;
  if (verificationCode.startsWith(expectedPrefix)) {
    return verificationCode;
  }
  // Defense-in-depth signal for the list renderer.
  return null;
}

/** Single-row rendering for the B.2a monitoring list. */
export function RedemptionRow({
  currentUserId,
  eventCode,
  onView,
  row,
}: RedemptionRowProps) {
  const prefixedCode = computeEventPrefixedCode(eventCode, row.verification_code);
  if (prefixedCode === null) {
    return null;
  }

  const status = resolveStatus(row);
  const actor = status === "reversed"
    ? formatActor({
      by: row.redemption_reversed_by,
      currentUserId,
      role: row.redemption_reversed_by_role,
    })
    : formatActor({
      by: row.redeemed_by,
      currentUserId,
      role: row.redeemed_by_role,
    });

  return (
    <li className="redemptions-row">
      <div className="redemptions-row-primary">
        <span className="redemptions-row-code">{prefixedCode}</span>
        <span
          className={`redemptions-status-badge redemptions-status-badge-${status}`}
        >
          {status === "redeemed"
            ? "Redeemed"
            : status === "reversed"
            ? "Reversed"
            : "Unknown"}
        </span>
      </div>
      <div className="redemptions-row-meta">
        <span>{formatActivityTimestamp(row)}</span>
        <span>{actor}</span>
      </div>
      <button
        className="text-link"
        onClick={() => onView(row)}
        type="button"
      >
        View details
      </button>
    </li>
  );
}
