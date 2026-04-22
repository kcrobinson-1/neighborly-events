import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetBrowserSupabaseClient } = vi.hoisted(() => ({
  mockGetBrowserSupabaseClient: vi.fn(),
}));

vi.mock("../../../apps/web/src/lib/supabaseBrowser.ts", () => ({
  getBrowserSupabaseClient: mockGetBrowserSupabaseClient,
}));

import { authorizeRedeem } from "../../../apps/web/src/redeem/authorizeRedeem.ts";

function createEventQuery(response: { data: unknown; error: unknown }) {
  return {
    eq: vi.fn(() => ({
      maybeSingle: vi.fn().mockResolvedValue(response),
    })),
    select: vi.fn().mockReturnThis(),
  };
}

function createBrowserClient(config: {
  agentResult?: { data: unknown; error: unknown };
  eventResponse: { data: unknown; error: unknown };
  rootResult?: { data: unknown; error: unknown };
}) {
  const query = createEventQuery(config.eventResponse);

  return {
    from: vi.fn(() => query),
    rpc: vi.fn((name: string) => {
      if (name === "is_agent_for_event") {
        return Promise.resolve(
          config.agentResult ?? { data: false, error: null },
        );
      }

      if (name === "is_root_admin") {
        return Promise.resolve(
          config.rootResult ?? { data: false, error: null },
        );
      }

      throw new Error(`Unexpected rpc call: ${name}`);
    }),
  };
}

describe("authorizeRedeem", () => {
  beforeEach(() => {
    mockGetBrowserSupabaseClient.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns role_gate when no event row is readable for the slug", async () => {
    mockGetBrowserSupabaseClient.mockReturnValue(
      createBrowserClient({
        eventResponse: {
          data: null,
          error: null,
        },
      }),
    );

    await expect(authorizeRedeem("missing-event", { retryDelayMs: 0 })).resolves.toEqual({
      status: "role_gate",
    });
  });

  it("returns role_gate when the caller is signed in but holds neither role", async () => {
    mockGetBrowserSupabaseClient.mockReturnValue(
      createBrowserClient({
        agentResult: { data: false, error: null },
        eventResponse: {
          data: {
            event_code: "MMF",
            id: "madrona-music-2026",
          },
          error: null,
        },
        rootResult: { data: false, error: null },
      }),
    );

    await expect(authorizeRedeem("madrona-music-2026", { retryDelayMs: 0 })).resolves.toEqual({
      status: "role_gate",
    });
  });

  it("returns authorized when the caller is an agent for the event", async () => {
    mockGetBrowserSupabaseClient.mockReturnValue(
      createBrowserClient({
        agentResult: { data: true, error: null },
        eventResponse: {
          data: {
            event_code: "MMF",
            id: "madrona-music-2026",
          },
          error: null,
        },
        rootResult: { data: false, error: null },
      }),
    );

    await expect(authorizeRedeem("madrona-music-2026", { retryDelayMs: 0 })).resolves.toEqual({
      eventCode: "MMF",
      eventId: "madrona-music-2026",
      status: "authorized",
    });
  });

  it("retries once before surfacing a transient error", async () => {
    mockGetBrowserSupabaseClient
      .mockReturnValueOnce(
        createBrowserClient({
          eventResponse: {
            data: null,
            error: { message: "Temporary failure." },
          },
        }),
      )
      .mockReturnValueOnce(
        createBrowserClient({
          agentResult: { data: true, error: null },
          eventResponse: {
            data: {
              event_code: "MMF",
              id: "madrona-music-2026",
            },
            error: null,
          },
          rootResult: { data: false, error: null },
        }),
      );

    await expect(authorizeRedeem("madrona-music-2026", { retryDelayMs: 0 })).resolves.toEqual({
      eventCode: "MMF",
      eventId: "madrona-music-2026",
      status: "authorized",
    });
    expect(mockGetBrowserSupabaseClient).toHaveBeenCalledTimes(2);
  });
});
