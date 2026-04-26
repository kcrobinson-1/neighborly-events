import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAccessToken, mockGetSupabaseConfig } = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockGetSupabaseConfig: vi.fn(),
}));

vi.mock("../../../shared/auth/api", () => ({
  getAccessToken: mockGetAccessToken,
}));

vi.mock("../../../apps/web/src/lib/supabaseBrowser", () => ({
  createSupabaseAuthHeaders: (clientKey: string) => ({
    apikey: clientKey,
    "X-Client-Key": clientKey,
  }),
  getSupabaseConfig: mockGetSupabaseConfig,
}));

import { useReverseRedemption } from "../../../apps/web/src/redemptions/useReverseRedemption";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("useReverseRedemption", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockGetAccessToken.mockReset();
    mockGetSupabaseConfig.mockReset();
    mockGetSupabaseConfig.mockReturnValue({
      enabled: true,
      supabaseClientKey: "client-key",
      supabaseUrl: "https://project.supabase.co",
    });
    mockGetAccessToken.mockResolvedValue("jwt-token");
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("returns a transient failure immediately when eventId is missing", async () => {
    const { result } = renderHook(() =>
      useReverseRedemption(null, { retryDelayMs: 0 })
    );

    let outcome;
    await act(async () => {
      outcome = await result.current.submitReversal({
        codeSuffix: "0427",
        reason: "booth dispute",
      });
    });

    expect(outcome).toMatchObject({ status: "transient_error" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps reversed_now to a success state carrying the reversed_at and reversed_by_role", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        outcome: "success",
        result: "reversed_now",
        reversed_at: "2026-04-22T18:00:00.000Z",
        reversed_by_role: "organizer",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toEqual({
      result: "reversed_now",
      reversedAt: "2026-04-22T18:00:00.000Z",
      reversedByRole: "organizer",
      status: "success",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("maps already_unredeemed to an idempotent success state", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        outcome: "success",
        result: "already_unredeemed",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toEqual({
      result: "already_unredeemed",
      status: "success",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("maps 403/not_authorized to a stable failure without retrying", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(403, {
        details: "not_authorized",
        error: "Redemption reversal failed.",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toEqual({
      result: "not_authorized",
      status: "failure",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("maps 404/not_found to a stable failure without retrying", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(404, {
        details: "not_found",
        error: "Redemption reversal failed.",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toEqual({
      result: "not_found",
      status: "failure",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries once on network failure before settling into transient error", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network down"));
    fetchSpy.mockRejectedValueOnce(new Error("still down"));

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toMatchObject({
      status: "transient_error",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries once on 500 before settling into transient error", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(500, { error: "Redemption reversal failed." }),
    );
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(500, { error: "Redemption reversal failed." }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toMatchObject({
      status: "transient_error",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries once on an unexpected 401 before settling into transient error", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, { error: "Authorization required." }),
    );
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(401, { error: "Authorization required." }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toMatchObject({
      status: "transient_error",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries once on a malformed 200 body before settling into transient error", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, { outcome: "success" }),
    );
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, { outcome: "success" }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toMatchObject({
      status: "transient_error",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("recovers from a transient failure when the second attempt succeeds", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("transient"));
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        outcome: "success",
        result: "reversed_now",
        reversed_at: "2026-04-22T18:00:00.000Z",
        reversed_by_role: "root_admin",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toMatchObject({
      result: "reversed_now",
      status: "success",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("normalizes blank and whitespace-only reason input to null in the request body", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        outcome: "success",
        result: "already_unredeemed",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: "   ",
      });
    });

    const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(requestInit.body as string);
    expect(sentBody).toEqual({
      codeSuffix: "0427",
      eventId: "event-1",
      reason: null,
    });
  });

  it("forwards a trimmed reason and the eventId into the request body", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        outcome: "success",
        result: "reversed_now",
        reversed_at: "2026-04-22T18:00:00.000Z",
        reversed_by_role: "organizer",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: "   disputed by attendee   ",
      });
    });

    const [, requestInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(requestInit.body as string);
    expect(sentBody).toEqual({
      codeSuffix: "0427",
      eventId: "event-1",
      reason: "disputed by attendee",
    });
  });

  it("retryLastSubmission replays the last submitted suffix and reason", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(500, { error: "Redemption reversal failed." }),
    );
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(500, { error: "Redemption reversal failed." }),
    );
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        outcome: "success",
        result: "reversed_now",
        reversed_at: "2026-04-22T18:00:00.000Z",
        reversed_by_role: "organizer",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: "  initial note  ",
      });
    });

    expect(result.current.resultState).toMatchObject({
      status: "transient_error",
    });

    await act(async () => {
      await result.current.retryLastSubmission();
    });

    expect(result.current.resultState).toMatchObject({
      result: "reversed_now",
      status: "success",
    });

    const replayInit = fetchSpy.mock.calls[2]?.[1] as RequestInit;
    expect(JSON.parse(replayInit.body as string)).toEqual({
      codeSuffix: "0427",
      eventId: "event-1",
      reason: "initial note",
    });
  });

  it("discards a stale submission's result state when reset bumps the attempt id", async () => {
    let resolveSubmit: (value: Response) => void = () => {};
    fetchSpy.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveSubmit = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    let submitPromise: Promise<unknown> | undefined;
    await act(async () => {
      submitPromise = result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toEqual({ status: "pending" });

    await act(async () => {
      result.current.reset();
    });
    expect(result.current.resultState).toEqual({ status: "idle" });

    await act(async () => {
      resolveSubmit(
        new Response(
          JSON.stringify({
            outcome: "success",
            result: "reversed_now",
            reversed_at: "2026-04-22T18:00:00.000Z",
            reversed_by_role: "organizer",
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 200,
          },
        ),
      );
      await submitPromise;
    });

    // The reset bumped the attempt id, so the late success from the stale
    // submission must not leak back into the shared resultState.
    expect(result.current.resultState).toEqual({ status: "idle" });
  });

  it("reset returns the hook to idle and clears the last-submission memory", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(200, {
        outcome: "success",
        result: "already_unredeemed",
      }),
    );

    const { result } = renderHook(() =>
      useReverseRedemption("event-1", { retryDelayMs: 0 })
    );

    await act(async () => {
      await result.current.submitReversal({
        codeSuffix: "0427",
        reason: null,
      });
    });

    expect(result.current.resultState).toMatchObject({ status: "success" });

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.resultState).toEqual({ status: "idle" });

    await act(async () => {
      const replay = await result.current.retryLastSubmission();
      expect(replay).toBeNull();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
