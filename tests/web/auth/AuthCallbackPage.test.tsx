import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Session } from "@supabase/supabase-js";

const { mockGetAuthSession, mockSubscribeToAuthState } = vi.hoisted(() => ({
  mockGetAuthSession: vi.fn(),
  mockSubscribeToAuthState: vi.fn(),
}));

vi.mock("../../../apps/web/src/lib/authApi.ts", () => ({
  getAuthSession: mockGetAuthSession,
  subscribeToAuthState: mockSubscribeToAuthState,
}));

import { AuthCallbackPage } from "../../../apps/web/src/auth/AuthCallbackPage";
import { routes } from "../../../shared/urls";

const TEST_ORIGIN = "https://example.test";

function fakeSession(): Session {
  // Only the truthiness matters for AuthCallbackPage; fields are unused.
  return { access_token: "token" } as unknown as Session;
}

function setLocationSearch(search: string) {
  // validateNextPath reads window.location.origin, and AuthCallbackPage reads
  // window.location.search; replacing window.location with a URL object keeps
  // both stable for the test while preserving jsdom's other globals.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: new URL(`${TEST_ORIGIN}/auth/callback${search}`),
    writable: true,
  });
}

describe("AuthCallbackPage", () => {
  const originalLocation = Object.getOwnPropertyDescriptor(window, "location");
  let unsubscribeSpy: ReturnType<typeof vi.fn>;
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockGetAuthSession.mockReset();
    mockSubscribeToAuthState.mockReset();
    unsubscribeSpy = vi.fn();
    mockSubscribeToAuthState.mockImplementation(() => unsubscribeSpy);
    pushStateSpy = vi.spyOn(window.history, "pushState");
    replaceStateSpy = vi.spyOn(window.history, "replaceState");
  });

  afterEach(() => {
    cleanup();
    pushStateSpy.mockRestore();
    replaceStateSpy.mockRestore();
    vi.useRealTimers();
    if (originalLocation) {
      Object.defineProperty(window, "location", originalLocation);
    }
  });

  it("navigates to the validated next from the initial getAuthSession result", async () => {
    setLocationSearch("?next=/admin");
    mockGetAuthSession.mockResolvedValue(fakeSession());
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledWith("/admin", { replace: true });
  });

  it("navigates from a SIGNED_IN event after an initial null, and stays silent until then", async () => {
    setLocationSearch("?next=/admin");
    mockGetAuthSession.mockResolvedValue(null);
    let capturedListener: ((session: Session | null) => void) | null = null;
    mockSubscribeToAuthState.mockImplementation(
      (listener: (session: Session | null) => void) => {
        capturedListener = listener;
        return unsubscribeSpy;
      },
    );
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    // Flush the initial getAuthSession promise resolution.
    await Promise.resolve();
    await Promise.resolve();

    // Invariant (a): between the null resolution and the SIGNED_IN event,
    // onNavigate must not fire on its own.
    expect(onNavigate).not.toHaveBeenCalled();

    // Invariant (b): subscribeToAuthState was registered before
    // getAuthSession() was called — ordering prevents missing a SIGNED_IN
    // fired during hash consumption.
    const subscribeOrder =
      mockSubscribeToAuthState.mock.invocationCallOrder[0];
    const getSessionOrder = mockGetAuthSession.mock.invocationCallOrder[0];
    expect(subscribeOrder).toBeLessThan(getSessionOrder);

    // Now fire the SIGNED_IN event.
    expect(capturedListener).not.toBeNull();
    capturedListener?.(fakeSession());

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledWith("/admin", { replace: true });
  });

  it("redirects cross-origin next values to home", async () => {
    setLocationSearch("?next=https%3A%2F%2Fevil.com%2Ffoo");
    mockGetAuthSession.mockResolvedValue(fakeSession());
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledWith(routes.home, { replace: true });
    expect(onNavigate).not.toHaveBeenCalledWith(
      expect.stringContaining("evil.com"),
      expect.anything(),
    );
  });

  it("redirects a /auth/callback self-loop to home", async () => {
    setLocationSearch("?next=%2Fauth%2Fcallback");
    mockGetAuthSession.mockResolvedValue(fakeSession());
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledWith(routes.home, { replace: true });
  });

  it("redirects to home when the next query is missing", async () => {
    setLocationSearch("");
    mockGetAuthSession.mockResolvedValue(fakeSession());
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
    expect(onNavigate).toHaveBeenCalledWith(routes.home, { replace: true });
  });

  it("renders the neutral timeout state after 10 seconds with no session", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    setLocationSearch("?next=/admin");
    mockGetAuthSession.mockResolvedValue(null);
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    // Flush the initial getAuthSession(null) resolution without advancing
    // fake setTimeouts.
    await Promise.resolve();
    await Promise.resolve();

    expect(onNavigate).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(
      screen.getByRole("heading", {
        name: /couldn.t use this sign-in link/i,
      }),
    ).toBeTruthy();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not navigate before getAuthSession resolves", async () => {
    setLocationSearch("?next=/admin");
    let resolveSession: ((session: Session | null) => void) | null = null;
    mockGetAuthSession.mockImplementation(
      () =>
        new Promise<Session | null>((resolve) => {
          resolveSession = resolve;
        }),
    );
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    // validateNextPath has returned synchronously during render; still,
    // until getAuthSession resolves, no navigation should have fired.
    await Promise.resolve();
    expect(onNavigate).not.toHaveBeenCalled();

    resolveSession?.(fakeSession());
    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));
  });

  it("never calls onNavigate more than once on success", async () => {
    setLocationSearch("?next=/admin");
    mockGetAuthSession.mockResolvedValue(fakeSession());
    let capturedListener: ((session: Session | null) => void) | null = null;
    mockSubscribeToAuthState.mockImplementation(
      (listener: (session: Session | null) => void) => {
        capturedListener = listener;
        return unsubscribeSpy;
      },
    );
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));

    // Fire a second SIGNED_IN event — the single-call invariant must hold.
    capturedListener?.(fakeSession());
    await Promise.resolve();

    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("does not call window.history.pushState or replaceState directly", async () => {
    setLocationSearch("?next=/admin");
    mockGetAuthSession.mockResolvedValue(fakeSession());
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledTimes(1));

    expect(pushStateSpy).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it("stops listening after timeout so a late SIGNED_IN event cannot redirect off the failure state", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    setLocationSearch("?next=/admin");
    mockGetAuthSession.mockResolvedValue(null);
    let capturedListener: ((session: Session | null) => void) | null = null;
    mockSubscribeToAuthState.mockImplementation(
      (listener: (session: Session | null) => void) => {
        capturedListener = listener;
        return unsubscribeSpy;
      },
    );
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    // Flush the initial getAuthSession(null) resolution.
    await Promise.resolve();
    await Promise.resolve();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(
      screen.getByRole("heading", {
        name: /couldn.t use this sign-in link/i,
      }),
    ).toBeTruthy();
    // Timeout path must have unsubscribed from auth state.
    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);

    // A late SIGNED_IN event must not redirect off the failure state.
    capturedListener?.(fakeSession());
    await Promise.resolve();

    expect(onNavigate).not.toHaveBeenCalled();
    expect(
      screen.getByRole("heading", {
        name: /couldn.t use this sign-in link/i,
      }),
    ).toBeTruthy();
  });

  it("renders the neutral failure state when subscribeToAuthState throws synchronously", async () => {
    setLocationSearch("?next=/admin");
    mockSubscribeToAuthState.mockImplementation(() => {
      throw new Error("Supabase env vars are missing.");
    });
    mockGetAuthSession.mockResolvedValue(null);
    const onNavigate = vi.fn();

    render(<AuthCallbackPage onNavigate={onNavigate} />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", {
          name: /couldn.t use this sign-in link/i,
        }),
      ).toBeTruthy(),
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("unsubscribes from auth state on unmount", async () => {
    setLocationSearch("?next=/admin");
    mockGetAuthSession.mockResolvedValue(null);
    const onNavigate = vi.fn();

    const { unmount } = render(<AuthCallbackPage onNavigate={onNavigate} />);

    unmount();

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });
});
