import { useCallback, useRef, useState } from "react";
import type {
  RedemptionHttpErrorResponse,
  ReverseEntitlementRedemptionSuccessResponse,
  ReversedByRole,
} from "../../../../shared/redemption";
import { getAccessToken } from "../lib/authApi";
import {
  createSupabaseAuthHeaders,
  getSupabaseConfig,
} from "../lib/supabaseBrowser";

export type ReverseRedemptionInput = {
  codeSuffix: string;
  reason: string | null;
};

export type ReverseResultState =
  | { status: "idle" }
  | { status: "pending" }
  | { result: "already_unredeemed"; status: "success" }
  | {
    result: "reversed_now";
    reversedAt: string;
    reversedByRole: ReversedByRole;
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

type ReverseAttemptResult =
  | { result: "already_unredeemed"; status: "success" }
  | {
    result: "reversed_now";
    reversedAt: string;
    reversedByRole: ReversedByRole;
    status: "success";
  }
  | { result: "not_authorized" | "not_found"; status: "failure" };

type ParsedHttpError = {
  details?: unknown;
  message: string;
};

const AUTO_RETRY_DELAY_MS = 2_000;
const DEFAULT_TRANSIENT_MESSAGE =
  "Please retry once your connection is stable.";

function createFunctionUrl(functionName: string) {
  return `${getSupabaseConfig().supabaseUrl}/functions/v1/${functionName}`;
}

function normalizeReason(reason: string | null): string | null {
  if (reason === null) {
    return null;
  }
  const trimmed = reason.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function isReverseSuccessPayload(
  payload: unknown,
): payload is ReverseEntitlementRedemptionSuccessResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<
    ReverseEntitlementRedemptionSuccessResponse
  >;

  if (candidate.outcome !== "success") {
    return false;
  }

  if (candidate.result === "already_unredeemed") {
    return true;
  }

  if (candidate.result === "reversed_now") {
    const reversedNow = candidate as {
      reversed_at?: unknown;
      reversed_by_role?: unknown;
    };
    return (
      typeof reversedNow.reversed_at === "string" &&
      !Number.isNaN(new Date(reversedNow.reversed_at).getTime()) &&
      (reversedNow.reversed_by_role === "organizer" ||
        reversedNow.reversed_by_role === "root_admin")
    );
  }

  return false;
}

async function parseHttpError(response: Response): Promise<ParsedHttpError> {
  try {
    const payload = (await response.json()) as RedemptionHttpErrorResponse;

    return {
      details: payload.details,
      message: payload.error || DEFAULT_TRANSIENT_MESSAGE,
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

async function submitReverseAttempt(
  eventId: string,
  input: ReverseRedemptionInput,
): Promise<ReverseAttemptResult> {
  const { enabled, supabaseClientKey } = getSupabaseConfig();

  if (!enabled) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  const accessToken = await getAccessToken();
  const response = await fetch(
    createFunctionUrl("reverse-entitlement-redemption"),
    {
      body: JSON.stringify({
        codeSuffix: input.codeSuffix,
        eventId,
        reason: input.reason,
      }),
      credentials: "include",
      headers: {
        ...createSupabaseAuthHeaders(supabaseClientKey),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (response.ok) {
    const payload = (await response.json()) as unknown;

    if (!isReverseSuccessPayload(payload)) {
      throw new Error(DEFAULT_TRANSIENT_MESSAGE);
    }

    if (payload.result === "reversed_now") {
      return {
        result: "reversed_now",
        reversedAt: payload.reversed_at,
        reversedByRole: payload.reversed_by_role,
        status: "success",
      };
    }

    return {
      result: "already_unredeemed",
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

async function submitReverseWithRetry(
  eventId: string,
  input: ReverseRedemptionInput,
  retryDelayMs: number,
): Promise<ReverseAttemptResult> {
  try {
    return await submitReverseAttempt(eventId, input);
  } catch {
    await wait(retryDelayMs);
    return await submitReverseAttempt(eventId, input);
  }
}

type UseReverseRedemptionOptions = {
  retryDelayMs?: number;
};

/**
 * Owns `reverse-entitlement-redemption` submission, transient retry, and
 * result-state mapping for the B.2b reversal flow.
 *
 * The hook mirrors `useRedeemSubmit`'s posture: one automatic retry at ~2s
 * backoff for transient failures (network, 5xx, unexpected 401, malformed
 * 200), stable mapping for 403/not_authorized and 404/not_found, and
 * `retryLastSubmission()` that replays the last submitted `(suffix, reason)`
 * pair. Blank or whitespace-only reason input is normalized to `null` so the
 * request body matches the landed backend normalization contract.
 */
export function useReverseRedemption(
  eventId: string | null,
  { retryDelayMs = AUTO_RETRY_DELAY_MS }: UseReverseRedemptionOptions = {},
) {
  const [resultState, setResultState] = useState<ReverseResultState>({
    status: "idle",
  });
  const lastSubmissionRef = useRef<ReverseRedemptionInput | null>(null);

  const submitReversal = useCallback(
    async (input: ReverseRedemptionInput): Promise<ReverseResultState> => {
      const normalized: ReverseRedemptionInput = {
        codeSuffix: input.codeSuffix,
        reason: normalizeReason(input.reason),
      };

      if (!eventId) {
        const transientResult: ReverseResultState = {
          isOffline: getOfflineStatus(),
          message: DEFAULT_TRANSIENT_MESSAGE,
          status: "transient_error",
        };
        setResultState(transientResult);
        return transientResult;
      }

      lastSubmissionRef.current = normalized;
      setResultState({ status: "pending" });

      try {
        const attempt = await submitReverseWithRetry(
          eventId,
          normalized,
          retryDelayMs,
        );

        if (attempt.status === "success") {
          const successResult: ReverseResultState =
            attempt.result === "reversed_now"
              ? {
                result: "reversed_now",
                reversedAt: attempt.reversedAt,
                reversedByRole: attempt.reversedByRole,
                status: "success",
              }
              : {
                result: "already_unredeemed",
                status: "success",
              };
          setResultState(successResult);
          return successResult;
        }

        const failureResult: ReverseResultState = {
          result: attempt.result,
          status: "failure",
        };
        setResultState(failureResult);
        return failureResult;
      } catch (error: unknown) {
        const transientResult: ReverseResultState = {
          isOffline: getOfflineStatus(),
          message: error instanceof Error
            ? error.message
            : DEFAULT_TRANSIENT_MESSAGE,
          status: "transient_error",
        };
        setResultState(transientResult);
        return transientResult;
      }
    },
    [eventId, retryDelayMs],
  );

  const retryLastSubmission = useCallback(async () => {
    const previous = lastSubmissionRef.current;
    if (!previous) {
      return null;
    }
    return await submitReversal(previous);
  }, [submitReversal]);

  const reset = useCallback(() => {
    lastSubmissionRef.current = null;
    setResultState({ status: "idle" });
  }, []);

  return {
    reset,
    resultState,
    retryLastSubmission,
    submitReversal,
  };
}
