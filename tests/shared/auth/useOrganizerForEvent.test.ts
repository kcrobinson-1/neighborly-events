import type { SupabaseClient } from "@supabase/supabase-js";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  _resetSharedAuthForTests,
  configureSharedAuth,
} from "../../../shared/auth/configure.ts";
import { useOrganizerForEvent } from "../../../shared/auth/useOrganizerForEvent.ts";
import type { Database } from "../../../shared/db";

type EventResponse = { data: unknown; error: unknown };
type RpcResponse = { data: unknown; error: unknown };

function createClientMock(config: {
  eventResponse?: EventResponse | EventResponse[];
  organizerResult?: RpcResponse | RpcResponse[];
  rootAdminResult?: RpcResponse | RpcResponse[];
}) {
  const eventResponses = Array.isArray(config.eventResponse)
    ? [...config.eventResponse]
    : [config.eventResponse ?? { data: null, error: null }];
  const organizerResults = Array.isArray(config.organizerResult)
    ? [...config.organizerResult]
    : [config.organizerResult ?? { data: false, error: null }];
  const rootAdminResults = Array.isArray(config.rootAdminResult)
    ? [...config.rootAdminResult]
    : [config.rootAdminResult ?? { data: false, error: null }];

  const maybeSingle = vi.fn().mockImplementation(async () => {
    return eventResponses.shift() ?? { data: null, error: null };
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn((name: string) => {
    if (name === "is_organizer_for_event") {
      return Promise.resolve(
        organizerResults.shift() ?? { data: false, error: null },
      );
    }
    if (name === "is_root_admin") {
      return Promise.resolve(
        rootAdminResults.shift() ?? { data: false, error: null },
      );
    }
    throw new Error(`Unexpected rpc call: ${name}`);
  });

  return { from, rpc, select, eq, maybeSingle };
}

function configureWith(client: ReturnType<typeof createClientMock>) {
  configureSharedAuth({
    getClient: () => client as unknown as SupabaseClient<Database>,
    getConfigStatus: () => ({ enabled: true }),
  });
}

describe("useOrganizerForEvent", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    _resetSharedAuthForTests();
    vi.useRealTimers();
  });

  it("collapses an unknown slug to role_gate without leaking", async () => {
    configureWith(
      createClientMock({
        eventResponse: { data: null, error: null },
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("missing-slug", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("role_gate");
    });
  });

  it("collapses signed-in-but-unassigned to role_gate", async () => {
    configureWith(
      createClientMock({
        eventResponse: {
          data: { id: "evt-1", event_code: "MMF" },
          error: null,
        },
        organizerResult: { data: false, error: null },
        rootAdminResult: { data: false, error: null },
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("madrona-music-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("role_gate");
    });
  });

  it("returns authorized when the caller is an organizer for the event", async () => {
    configureWith(
      createClientMock({
        eventResponse: {
          data: { id: "evt-1", event_code: "MMF" },
          error: null,
        },
        organizerResult: { data: true, error: null },
        rootAdminResult: { data: false, error: null },
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("madrona-music-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("authorized");
    });
    if (result.current.status === "authorized") {
      expect(result.current.eventId).toBe("evt-1");
      expect(result.current.eventCode).toBe("MMF");
    }
  });

  it("returns authorized when the caller is root-admin only", async () => {
    configureWith(
      createClientMock({
        eventResponse: {
          data: { id: "evt-1", event_code: "MMF" },
          error: null,
        },
        organizerResult: { data: false, error: null },
        rootAdminResult: { data: true, error: null },
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("madrona-music-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("authorized");
    });
  });

  it("treats a non-boolean RPC payload as transient_error", async () => {
    configureWith(
      createClientMock({
        eventResponse: [
          { data: { id: "evt-1", event_code: "MMF" }, error: null },
          { data: { id: "evt-1", event_code: "MMF" }, error: null },
        ],
        organizerResult: [
          { data: "not-a-bool", error: null },
          { data: "not-a-bool", error: null },
        ],
        rootAdminResult: [
          { data: false, error: null },
          { data: false, error: null },
        ],
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("madrona-music-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("transient_error");
    });
  });

  it("retries once on a transport error and surfaces transient_error on the second failure", async () => {
    configureWith(
      createClientMock({
        eventResponse: [
          { data: null, error: { message: "Temporary failure." } },
          { data: null, error: { message: "Temporary failure." } },
        ],
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("madrona-music-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("transient_error");
    });
    if (result.current.status === "transient_error") {
      expect(typeof result.current.retry).toBe("function");
    }
  });

  it("recovers when the second attempt succeeds after a transport error", async () => {
    configureWith(
      createClientMock({
        eventResponse: [
          { data: null, error: { message: "Flaky." } },
          { data: { id: "evt-1", event_code: "MMF" }, error: null },
        ],
        organizerResult: { data: true, error: null },
        rootAdminResult: { data: false, error: null },
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("madrona-music-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("authorized");
    });
  });

  it("transitions to transient_error when an RPC branch returns an error", async () => {
    configureWith(
      createClientMock({
        eventResponse: [
          { data: { id: "evt-1", event_code: "MMF" }, error: null },
          { data: { id: "evt-1", event_code: "MMF" }, error: null },
        ],
        organizerResult: [
          { data: false, error: { message: "rpc fail" } },
          { data: false, error: { message: "rpc fail" } },
        ],
        rootAdminResult: [
          { data: false, error: null },
          { data: false, error: null },
        ],
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("madrona-music-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("transient_error");
    });
  });

  it("rejects a malformed event_code payload by retrying then surfacing transient_error", async () => {
    configureWith(
      createClientMock({
        eventResponse: [
          { data: { id: "evt-1", event_code: "lowercase" }, error: null },
          { data: { id: "evt-1", event_code: "lowercase" }, error: null },
        ],
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("madrona-music-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("transient_error");
    });
  });
});
