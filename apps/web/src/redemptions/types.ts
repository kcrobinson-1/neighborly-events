/** Redemption row shape consumed by the B.2a monitoring list and detail sheet. */
export type RedemptionRow = {
  event_id: string;
  id: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
  redeemed_by_role: "agent" | "root_admin" | null;
  redemption_reversed_at: string | null;
  redemption_reversed_by: string | null;
  redemption_reversed_by_role: "organizer" | "root_admin" | null;
  redemption_status: "redeemed" | "unredeemed";
  verification_code: string;
};
