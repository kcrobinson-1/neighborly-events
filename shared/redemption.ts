/** Transport contracts shared by redemption edge functions and future callers. */

export type RedeemEntitlementRequest = {
  codeSuffix: string;
  eventId: string;
};

export type ReverseEntitlementRedemptionRequest = {
  codeSuffix: string;
  eventId: string;
  reason?: string | null;
};

export type GetRedemptionStatusRequest = {
  eventId: string;
};

export type RedemptionFailureResult =
  | "internal_error"
  | "not_authorized"
  | "not_found";

export type RedemptionFailureEnvelope = {
  outcome: "failure";
  result: RedemptionFailureResult;
};

export type RedeemedByRole = "agent" | "root_admin";
export type ReversedByRole = "organizer" | "root_admin";

export type RedeemEntitlementSuccessResponse = {
  outcome: "success";
  redeemed_at: string;
  redeemed_by_role: RedeemedByRole;
  result: "already_redeemed" | "redeemed_now";
};

export type ReverseEntitlementRedemptionSuccessResponse =
  | {
    outcome: "success";
    result: "already_unredeemed";
  }
  | {
    outcome: "success";
    result: "reversed_now";
    reversed_at: string;
    reversed_by_role: ReversedByRole;
  };

export type RedeemEntitlementRpcResponse =
  | RedeemEntitlementSuccessResponse
  | RedemptionFailureEnvelope;

export type ReverseEntitlementRedemptionRpcResponse =
  | ReverseEntitlementRedemptionSuccessResponse
  | RedemptionFailureEnvelope;

/** Shared error envelope for authorized redemption failures. Unauthenticated 401 responses use `{ error }` only. */
export type RedemptionHttpErrorResponse = {
  details: RedemptionFailureResult;
  error: string;
};

export type RedemptionStatus = "redeemed" | "unredeemed";

export type RedemptionStatusResponse = {
  redeemedAt: string | null;
  redemptionReversedAt: string | null;
  redemptionStatus: RedemptionStatus;
  verificationCode: string;
};
