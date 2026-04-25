import { act, cleanup, renderHook } from "@testing-library/react";
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

function setDocumentVisibility(state: DocumentVisibilityState | undefined) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: state,
    writable: true,
  });
}

function dispatchVisibilityChange() {
  document.dispatchEvent(new Event("visibilitychange"));
}

const originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(
  document,
  "visibilityState",
);

describe("useAttendeeRedemptionStatus", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    setDocumentVisibility("visible");

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
    cleanup();
    vi.clearAllTimers();
    fetchSpy.mockRestore();

    if (originalVisibilityStateDescriptor) {
      Object.defineProperty(
        document,
        "visibilityState",
        originalVisibilityStateDescriptor,
      );
    } else {
      setDocumentVisibility("visible");
    }

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

  it("defers the initial request when mounted hidden and fires once on the first visible transition", async () => {
    setDocumentVisibility("hidden");

    fetchSpy.mockResolvedValueOnce(
      createJsonResponse(200, {
        redeemedAt: null,
        redemptionReversedAt: null,
        redemptionStatus: "unredeemed",
        verificationCode: "EVT-0427",
      }),
    );

    const { result } = renderHook(() => useAttendeeRedemptionStatus("event-1"));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current).toEqual({ kind: "unknown" });

    setDocumentVisibility("visible");
    dispatchVisibilityChange();

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });
  });

  it("pauses while hidden by clearing pending timers and does not poll again until visible", async () => {
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
        createJsonResponse(200, {
          redeemedAt: "2026-04-22T18:00:00.000Z",
          redemptionReversedAt: null,
          redemptionStatus: "redeemed",
          verificationCode: "EVT-0427",
        }),
      );

    const { result } = renderHook(() => useAttendeeRedemptionStatus("event-1"));

    await flushAsyncWork();

    setDocumentVisibility("hidden");
    dispatchVisibilityChange();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });

    setDocumentVisibility("visible");
    dispatchVisibilityChange();

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({
      kind: "redeemed",
      verificationCode: "EVT-0427",
    });
  });

  it("suppresses a late timer callback that runs after hidden is observed", async () => {
    const scheduledCallbacks: Array<() => void> = [];
    const realSetTimeout = window.setTimeout;
    const setTimeoutSpy = vi
      .spyOn(window, "setTimeout")
      .mockImplementation((handler, timeout, ...args) => {
        if (typeof handler === "function") {
          scheduledCallbacks.push(handler);
        }

        return realSetTimeout(handler, timeout, ...args);
      });

    fetchSpy.mockResolvedValueOnce(
      createJsonResponse(200, {
        redeemedAt: null,
        redemptionReversedAt: null,
        redemptionStatus: "unredeemed",
        verificationCode: "EVT-0427",
      }),
    );

    renderHook(() => useAttendeeRedemptionStatus("event-1"));
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(scheduledCallbacks.length).toBeGreaterThan(0);

    setDocumentVisibility("hidden");
    dispatchVisibilityChange();

    await act(async () => {
      scheduledCallbacks.at(-1)?.();
      await Promise.resolve();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    setTimeoutSpy.mockRestore();
  });

  it("does not abort in-flight requests when hidden and does not reschedule while hidden", async () => {
    const firstRequest = createDeferredFetchResponse();
    let firstSignal: AbortSignal | undefined;

    fetchSpy.mockImplementationOnce((_, init) => {
      firstSignal = init?.signal as AbortSignal | undefined;
      return firstRequest.promise;
    });

    const { result } = renderHook(() => useAttendeeRedemptionStatus("event-1"));

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(firstSignal?.aborted).toBe(false);

    setDocumentVisibility("hidden");
    dispatchVisibilityChange();

    expect(firstSignal?.aborted).toBe(false);

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
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not start a duplicate request when visibility resumes while a poll is still in flight", async () => {
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

    renderHook(() => useAttendeeRedemptionStatus("event-1"));

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    setDocumentVisibility("hidden");
    dispatchVisibilityChange();
    setDocumentVisibility("visible");
    dispatchVisibilityChange();

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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("fires at most one immediate refire per real hidden-to-visible transition", async () => {
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
        createJsonResponse(200, {
          redeemedAt: null,
          redemptionReversedAt: null,
          redemptionStatus: "unredeemed",
          verificationCode: "EVT-0427",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          redeemedAt: "2026-04-22T18:00:00.000Z",
          redemptionReversedAt: null,
          redemptionStatus: "redeemed",
          verificationCode: "EVT-0427",
        }),
      );

    renderHook(() => useAttendeeRedemptionStatus("event-1"));
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    dispatchVisibilityChange();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    setDocumentVisibility("hidden");
    dispatchVisibilityChange();
    setDocumentVisibility("visible");
    dispatchVisibilityChange();
    await flushAsyncWork();

    dispatchVisibilityChange();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    setDocumentVisibility("hidden");
    dispatchVisibilityChange();
    setDocumentVisibility("visible");
    dispatchVisibilityChange();
    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(3);
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

    const { result } = renderHook(() => useAttendeeRedemptionStatus("event-1"));

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

  it("re-bootstraps once on 401 and avoids compound firing across hidden resume", async () => {
    fetchSpy
      .mockResolvedValueOnce(
        createJsonResponse(401, { error: "Session is missing or invalid." }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          redeemedAt: null,
          redemptionReversedAt: null,
          redemptionStatus: "unredeemed",
          verificationCode: "EVT-0427",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          redeemedAt: "2026-04-22T18:00:00.000Z",
          redemptionReversedAt: null,
          redemptionStatus: "redeemed",
          verificationCode: "EVT-0427",
        }),
      );

    const { result } = renderHook(() => useAttendeeRedemptionStatus("event-1"));

    setDocumentVisibility("hidden");
    dispatchVisibilityChange();

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(mockEnsureServerSession).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    setDocumentVisibility("visible");
    dispatchVisibilityChange();

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(result.current).toEqual({
      kind: "redeemed",
      verificationCode: "EVT-0427",
    });
  });

  it("resets to unknown when switching to a different event id before the new poll settles", async () => {
    const secondRequest = createDeferredFetchResponse();

    fetchSpy
      .mockResolvedValueOnce(
        createJsonResponse(200, {
          redeemedAt: "2026-04-22T18:00:00.000Z",
          redemptionReversedAt: null,
          redemptionStatus: "redeemed",
          verificationCode: "EVT-0427",
        }),
      )
      .mockReturnValueOnce(secondRequest.promise);

    const { result, rerender } = renderHook(
      ({ eventId }) => useAttendeeRedemptionStatus(eventId),
      {
        initialProps: { eventId: "event-1" },
      },
    );

    await flushAsyncWork();

    expect(result.current).toEqual({
      kind: "redeemed",
      verificationCode: "EVT-0427",
    });

    rerender({ eventId: "event-2" });

    expect(result.current).toEqual({ kind: "unknown" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      secondRequest.reject(new Error("transient failure"));
      await Promise.resolve();
    });

    expect(result.current).toEqual({ kind: "unknown" });
  });

  it("replaces the hidden cycle listener on event-id change", async () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    setDocumentVisibility("hidden");

    fetchSpy.mockResolvedValueOnce(
      createJsonResponse(200, {
        redeemedAt: null,
        redemptionReversedAt: null,
        redemptionStatus: "unredeemed",
        verificationCode: "EVT-2222",
      }),
    );

    const { rerender } = renderHook(
      ({ eventId }) => useAttendeeRedemptionStatus(eventId),
      {
        initialProps: { eventId: "event-1" },
      },
    );

    expect(fetchSpy).not.toHaveBeenCalled();

    rerender({ eventId: "event-2" });

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    setDocumentVisibility("visible");
    dispatchVisibilityChange();

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({
      body: JSON.stringify({ eventId: "event-2" }),
    });

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
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

    const { result } = renderHook(() => useAttendeeRedemptionStatus("event-1"));

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

  it("aborts in-flight work and clears scheduled timers on unmount, including hidden-state unmounts", async () => {
    const deferred = createDeferredFetchResponse();
    let requestSignal: AbortSignal | undefined;
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");

    fetchSpy.mockImplementationOnce((_, init) => {
      requestSignal = init?.signal as AbortSignal | undefined;
      return deferred.promise;
    });

    const { unmount } = renderHook(() => useAttendeeRedemptionStatus("event-1"));

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    setDocumentVisibility("hidden");
    dispatchVisibilityChange();

    unmount();

    expect(requestSignal?.aborted).toBe(true);
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    await act(async () => {
      deferred.reject(new DOMException("Aborted", "AbortError"));
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  it("returns stable unknown state and registers no visibility listener when backend polling is inactive", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    const { result, rerender } = renderHook(
      ({ eventId }) => useAttendeeRedemptionStatus(eventId),
      {
        initialProps: { eventId: null as string | null },
      },
    );

    expect(result.current).toEqual({ kind: "unknown" });
    expect(fetchSpy).not.toHaveBeenCalled();

    mockGetSupabaseConfig.mockReturnValue({
      enabled: false,
      supabaseClientKey: "client-key",
      supabaseUrl: "https://project.supabase.co",
    });

    rerender({ eventId: "event-1" });

    expect(result.current).toEqual({ kind: "unknown" });
    expect(fetchSpy).not.toHaveBeenCalled();

    mockIsPrototypeFallbackEnabled.mockReturnValue(true);
    rerender({ eventId: "event-2" });

    expect(result.current).toEqual({ kind: "unknown" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(addEventListenerSpy).not.toHaveBeenCalled();

    addEventListenerSpy.mockRestore();
  });

  it("falls back to always-visible polling when visibilityState is unavailable", async () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    setDocumentVisibility(undefined);

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
        createJsonResponse(200, {
          redeemedAt: "2026-04-22T18:00:00.000Z",
          redemptionReversedAt: null,
          redemptionStatus: "redeemed",
          verificationCode: "EVT-0427",
        }),
      );

    const { result } = renderHook(() => useAttendeeRedemptionStatus("event-1"));

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(addEventListenerSpy).not.toHaveBeenCalled();
    expect(result.current).toEqual({
      kind: "unredeemed",
      verificationCode: "EVT-0427",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    await flushAsyncWork();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current).toEqual({
      kind: "redeemed",
      verificationCode: "EVT-0427",
    });

    addEventListenerSpy.mockRestore();
  });
});
