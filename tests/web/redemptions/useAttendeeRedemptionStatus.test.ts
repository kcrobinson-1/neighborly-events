import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockCreateServerSessionHeaders,
  mockEnsureServerSession,
  mockGetSupabaseConfig,
  mockIsPrototypeFallbackEnabled,
} = vi.hoisted(() => ({
  mockCreateServerSessionHeaders: vi.fn(),
  mockEnsureServerSession: vi.fn(),
  mockGetSupabaseConfig: vi.fn(),
  mockIsPrototypeFallbackEnabled: vi.fn(),
}));

vi.mock("../../../apps/web/src/lib/gameApi.ts", () => ({
  createServerSessionHeaders: mockCreateServerSessionHeaders,
  ensureServerSession: mockEnsureServerSession,
}));

vi.mock("../../../apps/web/src/lib/supabaseBrowser.ts", () => ({
  getSupabaseConfig: mockGetSupabaseConfig,
  isPrototypeFallbackEnabled: mockIsPrototypeFallbackEnabled,
}));

import { useAttendeeRedemptionStatus } from "../../../apps/web/src/redemptions/useAttendeeRedemptionStatus.ts";

function createJsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function createDeferredFetchResponse() {
  let reject: ((reason?: unknown) => void) | null = null;
  let resolve: ((response: Response) => void) | null = null;
  const promise = new Promise<Response>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return {
    promise,
    reject: (reason?: unknown) => reject?.(reason),
    resolve: (response: Response) => resolve?.(response),
  };
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useAttendeeRedemptionStatus", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    mockCreateServerSessionHeaders.mockReset();
    mockEnsureServerSession.mockReset();
    mockGetSupabaseConfig.mockReset();
    mockIsPrototypeFallbackEnabled.mockReset();
    mockCreateServerSessionHeaders.mockReturnValue({
      Authorization: "Bearer client-key",
      apikey: "client-key",
      "Content-Type": "application/json",
    });
    mockEnsureServerSession.mockResolvedValue(undefined);
    mockGetSupabaseConfig.mockReturnValue({
      enabled: true,
      supabaseClientKey: "client-key",
      supabaseUrl: "https://project.supabase.co",
    });
    mockIsPrototypeFallbackEnabled.mockReturnValue(false);
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.useRealTimers();
  });

  it("stays inert for null event ids and starts polling once a completion-backed event id appears", async () => {
    fetchSpy.mockResolvedValueOnce(
      createJsonResponse(200, {
        redeemedAt: null,
        redemptionReversedAt: null,
        redemptionStatus: "unredeemed",
        verificationCode: "EVT-0427",
      }),
    );

    const { result, rerender } = renderHook(
      ({ eventId }) => useAttendeeRedemptionStatus(eventId),
      {
        initialProps: { eventId: null as string | null },
      },
    );

    expect(result.current).toEqual({ kind: "unknown" });
    expect(fetchSpy).not.toHaveBeenCalled();

    rerender({ eventId: "event-1" });

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });
  });

  it("schedules the next poll only after the prior request settles", async () => {
    const firstRequest = createDeferredFetchResponse();

    fetchSpy
      .mockReturnValueOnce(firstRequest.promise)
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          redeemedAt: "2026-04-22T18:00:00.000Z",
          redemptionReversedAt: null,
          redemptionStatus: "redeemed",
          verificationCode: "EVT-0427",
        }),
      );

    const { result } = renderHook(() =>
      useAttendeeRedemptionStatus("event-1")
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstRequest.resolve(
        createJsonResponse(200, {
          redeemedAt: null,
          redemptionReversedAt: null,
          redemptionStatus: "unredeemed",
          verificationCode: "EVT-0427",
        }),
      );
      await Promise.resolve();
    });

    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_999);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({
      kind: "redeemed",
      verificationCode: "EVT-0427",
    });
  });

  it("re-bootstraps once on 401 and holds the prior state on a second 401 in the same tick", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          redeemedAt: null,
          redemptionReversedAt: null,
          redemptionStatus: "unredeemed",
          verificationCode: "EVT-0427",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(401, { error: "Session is missing or invalid." }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(401, { error: "Session is missing or invalid." }),
      );

    const { result } = renderHook(() =>
      useAttendeeRedemptionStatus("event-1")
    );

    await flushAsyncWork();

    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(mockEnsureServerSession).toHaveBeenCalledTimes(1);
    expect(mockEnsureServerSession).toHaveBeenCalledWith("event-1");
    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });
  });

  it("holds the prior state across malformed responses, 500s, and re-bootstrap failure", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          redeemedAt: null,
          redemptionReversedAt: null,
          redemptionStatus: "unredeemed",
          verificationCode: "EVT-0427",
        }),
      )
      .mockResolvedValueOnce(createJsonResponse(200, { outcome: "success" }))
      .mockResolvedValueOnce(
        createJsonResponse(500, { error: "Redemption status request failed." }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(401, { error: "Session is missing or invalid." }),
      );
    mockEnsureServerSession.mockRejectedValueOnce(
      new Error("bootstrap failed"),
    );

    const { result } = renderHook(() =>
      useAttendeeRedemptionStatus("event-1")
    );

    await flushAsyncWork();

    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });

    for (let tick = 0; tick < 3; tick += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(result.current).toEqual({
        kind: "unredeemed",
        verificationCode: "EVT-0427",
      });
    }
  });

  it("aborts the prior request when the event id changes and starts a new loop", async () => {
    const firstRequest = createDeferredFetchResponse();
    let firstSignal: AbortSignal | undefined;

    fetchSpy
      .mockImplementationOnce((_, init) => {
        firstSignal = init?.signal as AbortSignal | undefined;
        return firstRequest.promise;
      })
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          redeemedAt: "2026-04-22T18:00:00.000Z",
          redemptionReversedAt: null,
          redemptionStatus: "redeemed",
          verificationCode: "EVT-9999",
        }),
      );

    const { result, rerender } = renderHook(
      ({ eventId }) => useAttendeeRedemptionStatus(eventId),
      {
        initialProps: { eventId: "event-1" },
      },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    rerender({ eventId: "event-2" });

    expect(firstSignal?.aborted).toBe(true);
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({
      kind: "redeemed",
      verificationCode: "EVT-9999",
    });
  });

  it("aborts in-flight work and clears scheduled timers on unmount", async () => {
    const deferred = createDeferredFetchResponse();
    let requestSignal: AbortSignal | undefined;

    fetchSpy.mockImplementationOnce((_, init) => {
      requestSignal = init?.signal as AbortSignal | undefined;
      return deferred.promise;
    });

    const { unmount } = renderHook(() =>
      useAttendeeRedemptionStatus("event-1")
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    unmount();

    expect(requestSignal?.aborted).toBe(true);

    await act(async () => {
      deferred.reject(new DOMException("Aborted", "AbortError"));
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns stable unknown state and schedules no work when the backend is disabled", () => {
    mockGetSupabaseConfig.mockReturnValue({
      enabled: false,
      supabaseClientKey: "client-key",
      supabaseUrl: "https://project.supabase.co",
    });

    const { result, rerender } = renderHook(
      ({ eventId }) => useAttendeeRedemptionStatus(eventId),
      {
        initialProps: { eventId: "event-1" },
      },
    );

    expect(result.current).toEqual({ kind: "unknown" });
    expect(fetchSpy).not.toHaveBeenCalled();

    mockIsPrototypeFallbackEnabled.mockReturnValue(true);
    rerender({ eventId: "event-2" });

    expect(result.current).toEqual({ kind: "unknown" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
