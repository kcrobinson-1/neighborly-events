import type { SupabaseClient } from "@supabase/supabase-js";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  _resetSharedAuthForTests,
  configureSharedAuth,
} from "../../../shared/auth/configure.ts";
import { useOrganizerForEvent } from "../../../shared/auth/useOrganizerForEvent.ts";
import type { Database } from "../../../shared/db";

type DraftResponse = { data: unknown; error: unknown };
type RpcResponse = { data: unknown; error: unknown };

function createClientMock(config: {
  draftResponse?: DraftResponse | DraftResponse[];
  organizerResult?: RpcResponse | RpcResponse[];
  rootAdminResult?: RpcResponse | RpcResponse[];
}) {
  const draftResponses = Array.isArray(config.draftResponse)
    ? [...config.draftResponse]
    : [config.draftResponse ?? { data: null, error: null }];
  const organizerResults = Array.isArray(config.organizerResult)
    ? [...config.organizerResult]
    : [config.organizerResult ?? { data: false, error: null }];
  const rootAdminResults = Array.isArray(config.rootAdminResult)
    ? [...config.rootAdminResult]
    : [config.rootAdminResult ?? { data: false, error: null }];

  const maybeSingle = vi.fn().mockImplementation(async () => {
    return draftResponses.shift() ?? { data: null, error: null };
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn((table: string) => {
    if (table !== "game_event_drafts") {
      throw new Error(
        `useOrganizerForEvent must resolve slugs via game_event_drafts, not ${table}.`,
      );
    }
    return { select };
  });
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
        draftResponse: { data: null, error: null },
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
        draftResponse: {
          data: { id: "evt-1" },
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
        draftResponse: {
          data: { id: "evt-1" },
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
    }
  });

  it("returns authorized when the caller is root-admin only", async () => {
    configureWith(
      createClientMock({
        draftResponse: {
          data: { id: "evt-1" },
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

  it("returns authorized for a draft-only event the root-admin caller is authorized for", async () => {
    // Regression: before the production-verification fix, the slug was
    // resolved against game_events, which only contains published rows.
    // Draft-only events therefore role-gated even root admins. The fix
    // resolves the slug via game_event_drafts (always-present row),
    // which is what the test mock simulates here — id present, no
    // event-code constraint, root-admin RPC says yes.
    configureWith(
      createClientMock({
        draftResponse: {
          data: { id: "draft-only-evt" },
          error: null,
        },
        organizerResult: { data: false, error: null },
        rootAdminResult: { data: true, error: null },
      }),
    );

    const { result } = renderHook(() =>
      useOrganizerForEvent("community-checklist-2026", { retryDelayMs: 0 }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("authorized");
    });
    if (result.current.status === "authorized") {
      expect(result.current.eventId).toBe("draft-only-evt");
    }
  });

  it("treats a non-boolean RPC payload as transient_error", async () => {
    configureWith(
      createClientMock({
        draftResponse: [
          { data: { id: "evt-1" }, error: null },
          { data: { id: "evt-1" }, error: null },
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
        draftResponse: [
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
        draftResponse: [
          { data: null, error: { message: "Flaky." } },
          { data: { id: "evt-1" }, error: null },
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
        draftResponse: [
          { data: { id: "evt-1" }, error: null },
          { data: { id: "evt-1" }, error: null },
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
});
