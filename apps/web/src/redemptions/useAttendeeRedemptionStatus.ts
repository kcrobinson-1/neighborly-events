import { useEffect, useMemo, useState } from "react";
import type {
  AttendeeRedemptionStatus,
  RedemptionStatusResponse,
} from "../../../../shared/redemption";
import {
  createServerSessionHeaders,
  ensureServerSession,
} from "../lib/gameApi";
import {
  getSupabaseConfig,
  isPrototypeFallbackEnabled,
} from "../lib/supabaseBrowser";

const UNKNOWN_STATUS: AttendeeRedemptionStatus = { kind: "unknown" };
const POLL_DELAY_MS = 5_000;

function isRedemptionStatusResponse(
  payload: unknown,
): payload is RedemptionStatusResponse {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<RedemptionStatusResponse>;
  return (
    (candidate.redemptionStatus === "redeemed" ||
      candidate.redemptionStatus === "unredeemed") &&
    typeof candidate.verificationCode === "string" &&
    candidate.verificationCode.length > 0
  );
}

function mapStatus(
  payload: RedemptionStatusResponse,
): AttendeeRedemptionStatus {
  return payload.redemptionStatus === "redeemed"
    ? {
      kind: "redeemed",
      verificationCode: payload.verificationCode,
    }
    : {
      kind: "unredeemed",
      verificationCode: payload.verificationCode,
    };
}

async function fetchRedemptionStatus(
  eventId: string,
  signal: AbortSignal,
  retryOnUnauthorized = true,
): Promise<AttendeeRedemptionStatus> {
  const { supabaseClientKey, supabaseUrl } = getSupabaseConfig();
  const response = await fetch(
    `${supabaseUrl}/functions/v1/get-redemption-status`,
    {
      body: JSON.stringify({ eventId }),
      credentials: "include",
      headers: createServerSessionHeaders(supabaseClientKey),
      method: "POST",
      signal,
    },
  );

  if (response.status === 401 && retryOnUnauthorized) {
    await ensureServerSession(eventId);
    return fetchRedemptionStatus(eventId, signal, false);
  }

  if (!response.ok) {
    throw new Error(`get-redemption-status failed with ${response.status}`);
  }

  const payload = (await response.json()) as unknown;

  if (!isRedemptionStatusResponse(payload)) {
    throw new Error("Malformed redemption-status response.");
  }

  return mapStatus(payload);
}

/**
 * Polls the attendee redemption-status endpoint while a completed game result
 * is in scope, keeping the UI on the last known good state across transient
 * failures and stopping cleanly on unmount or event switches.
 */
export function useAttendeeRedemptionStatus(eventId: string | null) {
  const [status, setStatus] = useState<AttendeeRedemptionStatus>(UNKNOWN_STATUS);

  useEffect(() => {
    if (!eventId) {
      setStatus(UNKNOWN_STATUS);
      return;
    }

    const { enabled } = getSupabaseConfig();

    if (!enabled) {
      if (isPrototypeFallbackEnabled()) {
        setStatus(UNKNOWN_STATUS);
        return;
      }

      setStatus(UNKNOWN_STATUS);
      return;
    }

    let isCancelled = false;
    let timeoutId: number | null = null;
    let abortController: AbortController | null = null;
    let isInFlight = false;

    const clearPendingTimeout = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleNextPoll = () => {
      clearPendingTimeout();

      timeoutId = window.setTimeout(() => {
        if (isCancelled || isInFlight) {
          return;
        }

        void runPoll();
      }, POLL_DELAY_MS);
    };

    const runPoll = async () => {
      if (isCancelled || isInFlight) {
        return;
      }

      abortController = new AbortController();
      isInFlight = true;

      try {
        const nextStatus = await fetchRedemptionStatus(
          eventId,
          abortController.signal,
        );

        if (!isCancelled) {
          setStatus(nextStatus);
        }
      } catch (error: unknown) {
        const isAbortError =
          error instanceof DOMException && error.name === "AbortError";

        if (isCancelled || isAbortError) {
          return;
        }
      } finally {
        isInFlight = false;
        abortController = null;

        if (!isCancelled) {
          scheduleNextPoll();
        }
      }
    };

    void runPoll();

    return () => {
      isCancelled = true;
      clearPendingTimeout();
      abortController?.abort();
      abortController = null;
    };
  }, [eventId]);

  return useMemo(() => status, [status]);
}
