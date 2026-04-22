import { useState } from "react";
import type {
  RedeemEntitlementSuccessResponse,
  RedeemedByRole,
  RedemptionHttpErrorResponse,
} from "../../../../shared/redemption";
import { getAccessToken } from "../lib/authApi";
import {
  createSupabaseAuthHeaders,
  getSupabaseConfig,
} from "../lib/supabaseBrowser";

export type RedeemResultState =
  | { status: "idle" }
  | {
    redeemedAt: string;
    redeemedByRole: RedeemedByRole;
    result: "already_redeemed" | "redeemed_now";
    status: "success";
  }
  | {
    result: "not_authorized" | "not_found";
    status: "failure";
  }
  | {
    isOffline: boolean;
    message: string;
    status: "transient_error";
  };

type RedeemAttemptResult =
  | {
    redeemedAt: string;
    redeemedByRole: RedeemedByRole;
    result: "already_redeemed" | "redeemed_now";
    status: "success";
  }
  | { result: "not_authorized" | "not_found"; status: "failure" };

type ParsedHttpError = {
  details?: unknown;
  message: string;
};

const DEFAULT_TRANSIENT_MESSAGE = "Please retry once your connection is stable.";

function createFunctionUrl(functionName: string) {
  return `${getSupabaseConfig().supabaseUrl}/functions/v1/${functionName}`;
}

function isSuccessPayload(payload: unknown): payload is RedeemEntitlementSuccessResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<RedeemEntitlementSuccessResponse>;

  return (
    candidate.outcome === "success" &&
    typeof candidate.redeemed_at === "string" &&
    !Number.isNaN(new Date(candidate.redeemed_at).getTime()) &&
    (candidate.redeemed_by_role === "agent" ||
      candidate.redeemed_by_role === "root_admin") &&
    (candidate.result === "already_redeemed" ||
      candidate.result === "redeemed_now")
  );
}

async function parseHttpError(response: Response): Promise<ParsedHttpError> {
  try {
    const payload = (await response.json()) as RedemptionHttpErrorResponse;

    return {
      details: payload.details,
      message:
        payload.error ||
        DEFAULT_TRANSIENT_MESSAGE,
    };
  } catch {
    return {
      message: DEFAULT_TRANSIENT_MESSAGE,
    };
  }
}

function getOfflineStatus() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function submitRedeemAttempt(eventId: string, codeSuffix: string): Promise<RedeemAttemptResult> {
  const { enabled, supabaseClientKey } = getSupabaseConfig();

  if (!enabled) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  const accessToken = await getAccessToken();
  const response = await fetch(createFunctionUrl("redeem-entitlement"), {
    body: JSON.stringify({
      codeSuffix,
      eventId,
    }),
    credentials: "include",
    headers: {
      ...createSupabaseAuthHeaders(supabaseClientKey),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (response.ok) {
    const payload = (await response.json()) as unknown;

    if (!isSuccessPayload(payload)) {
      throw new Error(DEFAULT_TRANSIENT_MESSAGE);
    }

    return {
      redeemedAt: payload.redeemed_at,
      redeemedByRole: payload.redeemed_by_role,
      result: payload.result,
      status: "success",
    };
  }

  const parsedError = await parseHttpError(response);

  if (response.status === 403 && parsedError.details === "not_authorized") {
    return {
      result: "not_authorized",
      status: "failure",
    };
  }

  if (response.status === 404 && parsedError.details === "not_found") {
    return {
      result: "not_found",
      status: "failure",
    };
  }

  throw new Error(parsedError.message);
}

async function submitRedeemWithRetry(eventId: string, codeSuffix: string) {
  try {
    return await submitRedeemAttempt(eventId, codeSuffix);
  } catch {
    await wait(2_000);
    return await submitRedeemAttempt(eventId, codeSuffix);
  }
}

/** Owns redeem-entitlement submission, transient retry, and result-state mapping. */
export function useRedeemSubmit(eventId: string | null) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmittedCodeSuffix, setLastSubmittedCodeSuffix] = useState<string | null>(null);
  const [resultState, setResultState] = useState<RedeemResultState>({
    status: "idle",
  });

  const submitCode = async (codeSuffix: string): Promise<RedeemResultState> => {
    if (!eventId) {
      const transientResult: RedeemResultState = {
        isOffline: getOfflineStatus(),
        message: DEFAULT_TRANSIENT_MESSAGE,
        status: "transient_error",
      };
      setResultState(transientResult);
      return transientResult;
    }

    setIsSubmitting(true);
    setLastSubmittedCodeSuffix(codeSuffix);

    try {
      const attemptResult = await submitRedeemWithRetry(eventId, codeSuffix);

      if (attemptResult.status === "success") {
        const successResult: RedeemResultState = {
          redeemedAt: attemptResult.redeemedAt,
          redeemedByRole: attemptResult.redeemedByRole,
          result: attemptResult.result,
          status: "success",
        };
        setResultState(successResult);
        return successResult;
      }

      const failureResult: RedeemResultState = {
        result: attemptResult.result,
        status: "failure",
      };
      setResultState(failureResult);
      return failureResult;
    } catch (error: unknown) {
      const transientResult: RedeemResultState = {
        isOffline: getOfflineStatus(),
        message:
          error instanceof Error
            ? error.message
            : DEFAULT_TRANSIENT_MESSAGE,
        status: "transient_error",
      };
      setResultState(transientResult);
      return transientResult;
    } finally {
      setIsSubmitting(false);
    }
  };

  const retryLastSubmission = async () => {
    if (!lastSubmittedCodeSuffix) {
      return null;
    }

    return await submitCode(lastSubmittedCodeSuffix);
  };

  const resetResult = () => {
    setResultState({
      status: "idle",
    });
  };

  return {
    isSubmitting,
    resetResult,
    resultState,
    retryLastSubmission,
    submitCode,
  };
}
