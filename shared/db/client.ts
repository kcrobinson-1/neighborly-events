import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.ts";

/** Minimal error payload shape returned by Supabase-backed browser requests. */
type SupabaseBrowserErrorPayload = {
  error?: string;
  message?: string;
};

/** Runtime Supabase configuration provided by the per-app adapter. */
export type SupabaseConfig = {
  enabled: boolean;
  supabaseClientKey: string;
  supabaseUrl: string;
};

/**
 * Builds a fresh browser Supabase client from configuration.
 *
 * The caller is responsible for the singleton lifecycle and for any
 * env-source reading. This factory is env-agnostic so the same wiring
 * is reusable from a Vite (apps/web) adapter and a Next.js (apps/site)
 * adapter without leaking framework-specific globals into shared code.
 *
 * The returned client is parameterized on the generated `Database` type
 * so PostgREST builders, RPC calls, and row results are typed at every
 * consumer.
 *
 * Session storage is `@supabase/ssr`'s frontend-origin cookie adapter
 * (cookie name `sb-<project-ref>-auth-token`, chunked as `.0`/`.1`
 * when the JWT exceeds the per-cookie size limit). The factory pins
 * `Path=/` and `SameSite=Lax` so apps/site can read the cookie via
 * Next.js `cookies()` through the Vercel proxy-rewrite. `Secure` is
 * set when the page is served over `https` (Vercel production /
 * preview) and omitted on `http` (local dev) so browsers do not
 * silently refuse the write. `@supabase/ssr` 0.10.x does not
 * auto-detect `Secure`, so the factory sets it explicitly here. No
 * `Domain=` attribute means the cookie is host-only on the apps/web
 * frontend domain. `HttpOnly` is impossible because apps/web is a
 * SPA writing from JS — same exposure surface as the prior
 * `localStorage` path.
 */
export function createBrowserSupabaseClient(
  config: SupabaseConfig,
): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    config.supabaseUrl,
    config.supabaseClientKey,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure:
          typeof window !== "undefined" &&
          window.location.protocol === "https:",
      },
    },
  );
}

/** Builds the shared auth headers for browser reads and function calls. */
export function createSupabaseAuthHeaders(supabaseClientKey: string) {
  return {
    apikey: supabaseClientKey,
    Authorization: `Bearer ${supabaseClientKey}`,
  };
}

/** Extracts a useful error message from a Supabase-backed browser response. */
export async function readSupabaseErrorMessage(
  response: Response,
  fallback: string,
) {
  try {
    const payload = (await response.json()) as SupabaseBrowserErrorPayload;
    return payload.error ?? payload.message ?? fallback;
  } catch {
    return fallback;
  }
}
