export type RedemptionActorRole =
  | "agent"
  | "organizer"
  | "root_admin"
  | null;

type FormatActorInput = {
  by: string | null;
  currentUserId: string | null;
  role: RedemptionActorRole;
};

function roleLabel(role: RedemptionActorRole): string {
  switch (role) {
    case "agent":
      return "Agent";
    case "organizer":
      return "Organizer";
    case "root_admin":
      return "Root admin";
    default:
      return "Unknown";
  }
}

function selfLabel(role: RedemptionActorRole): string {
  if (role === null) {
    return "You";
  }
  return `You (${roleLabel(role).toLowerCase()})`;
}

/**
 * Renders the actor hint for a redemption row.
 *
 * Role + self-vs-other, never an email lookup. The helper accepts the full
 * union of redeem and reverse roles so one function renders both the
 * redeemed-by and reversed-by sides of a row (A.2a redeem writes
 * `agent | root_admin`; A.2a reverse writes `organizer | root_admin`).
 */
export function formatActor({
  by,
  currentUserId,
  role,
}: FormatActorInput): string {
  if (by !== null && currentUserId !== null && by === currentUserId) {
    return selfLabel(role);
  }

  return roleLabel(role);
}
