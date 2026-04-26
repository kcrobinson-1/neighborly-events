import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAccessToken,
  getAuthSession,
  requestMagicLink,
  signOut,
} from "../../../shared/auth/api.ts";
import {
  _resetSharedAuthForTests,
  configureSharedAuth,
} from "../../../shared/auth/configure.ts";
import type { Database } from "../../../shared/db";

const TEST_ORIGIN = "https://example.test";

function createAuthClientMock(overrides: {
  getSession?: unknown;
  onAuthStateChange?: unknown;
  signInWithOtp?: unknown;
  signOut?: unknown;
} = {}) {
  return {
    auth: {
      getSession: overrides.getSession ?? vi.fn(),
      onAuthStateChange:
        overrides.onAuthStateChange ??
        vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      signInWithOtp: overrides.signInWithOtp ?? vi.fn(),
      signOut: overrides.signOut ?? vi.fn(),
    },
  };
}

function configureWith(client: ReturnType<typeof createAuthClientMock>) {
  configureSharedAuth({
    getClient: () => client as unknown as SupabaseClient<Database>,
    getConfigStatus: () => ({ enabled: true }),
  });
}

describe("shared/auth api", () => {
  const originalLocation = Object.getOwnPropertyDescriptor(window, "location");

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL(TEST_ORIGIN),
      writable: true,
    });
  });

  afterEach(() => {
    _resetSharedAuthForTests();
    if (originalLocation) {
      Object.defineProperty(window, "location", originalLocation);
    }
  });

  describe("requestMagicLink URL composition", () => {
    it("composes emailRedirectTo as /auth/callback?next=<encoded> against the current origin", async () => {
      const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
      configureWith(createAuthClientMock({ signInWithOtp }));

      await requestMagicLink("admin@example.com", { next: "/admin" });

      expect(signInWithOtp).toHaveBeenCalledTimes(1);
      const call = signInWithOtp.mock.calls[0]?.[0] as {
        email: string;
        options: { emailRedirectTo: string };
      };
      expect(call.email).toBe("admin@example.com");
      expect(call.options.emailRedirectTo).toBe(
        "https://example.test/auth/callback?next=%2Fadmin",
      );
    });

    it("URL-encodes slashes in next so round-trip decoding is unambiguous", async () => {
      const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
      configureWith(createAuthClientMock({ signInWithOtp }));

      await requestMagicLink("admin@example.com", {
        next: "/admin/events/id-with-dashes",
      });

      const call = signInWithOtp.mock.calls[0]?.[0] as {
        options: { emailRedirectTo: string };
      };
      expect(call.options.emailRedirectTo).toBe(
        "https://example.test/auth/callback?next=%2Fadmin%2Fevents%2Fid-with-dashes",
      );

      const parsed = new URL(call.options.emailRedirectTo);
      expect(parsed.searchParams.get("next")).toBe(
        "/admin/events/id-with-dashes",
      );
    });

    it("trims whitespace from the email before calling Supabase", async () => {
      const signInWithOtp = vi.fn().mockResolvedValue({ error: null });
      configureWith(createAuthClientMock({ signInWithOtp }));

      await requestMagicLink("  admin@example.com\n", { next: "/admin" });

      expect(signInWithOtp.mock.calls[0]?.[0]).toMatchObject({
        email: "admin@example.com",
      });
    });

    it("preserves the Supabase-provided error message when one is present", async () => {
      const signInWithOtp = vi
        .fn()
        .mockResolvedValue({ error: { message: "Rate limit exceeded." } });
      configureWith(createAuthClientMock({ signInWithOtp }));

      await expect(
        requestMagicLink("admin@example.com", { next: "/admin" }),
      ).rejects.toThrow("Rate limit exceeded.");
    });

    it("falls back to the role-neutral error copy when Supabase omits a message", async () => {
      const signInWithOtp = vi
        .fn()
        .mockResolvedValue({ error: { message: "" } });
      configureWith(createAuthClientMock({ signInWithOtp }));

      await expect(
        requestMagicLink("admin@example.com", { next: "/admin" }),
      ).rejects.toThrow("We couldn't send the sign-in link.");
    });
  });

  describe("getAuthSession", () => {
    it("returns the session when Supabase resolves one", async () => {
      const session = { access_token: "token-123" };
      const getSession = vi
        .fn()
        .mockResolvedValue({ data: { session }, error: null });
      configureWith(createAuthClientMock({ getSession }));

      await expect(getAuthSession()).resolves.toBe(session);
    });

    it("throws role-neutral copy when Supabase returns an error", async () => {
      const getSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: { message: "Underlying detail." },
      });
      configureWith(createAuthClientMock({ getSession }));

      await expect(getAuthSession()).rejects.toThrow(
        "We couldn't restore your session right now.",
      );
    });
  });

  describe("signOut", () => {
    it("throws role-neutral copy when Supabase returns an error", async () => {
      const supabaseSignOut = vi
        .fn()
        .mockResolvedValue({ error: { message: "Network failure." } });
      configureWith(createAuthClientMock({ signOut: supabaseSignOut }));

      await expect(signOut()).rejects.toThrow(
        "We couldn't sign out right now.",
      );
    });
  });

  describe("getAccessToken", () => {
    it("returns the token when a session is present", async () => {
      const getSession = vi.fn().mockResolvedValue({
        data: { session: { access_token: "token-abc" } },
        error: null,
      });
      configureWith(createAuthClientMock({ getSession }));

      await expect(getAccessToken()).resolves.toBe("token-abc");
    });

    it("throws the sign-in-required copy when no session exists", async () => {
      const getSession = vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null });
      configureWith(createAuthClientMock({ getSession }));

      await expect(getAccessToken()).rejects.toThrow("Sign-in is required.");
    });
  });

  describe("configure guardrail", () => {
    it("throws a clear error when the auth API is consumed before configureSharedAuth runs", async () => {
      _resetSharedAuthForTests();

      await expect(getAuthSession()).rejects.toThrow(
        /shared\/auth\/ used before configureSharedAuth/,
      );
    });
  });
});
