import { createClient, type SupabaseClient } from "@supabase/supabase-js";
// Deep import: @supabase/ssr 0.10.0's `cookies` module is not re-exported
// from the package index but is the supported path for using
// `@supabase/ssr`'s chunked cookie storage independently of
// `createBrowserClient`. We avoid `createBrowserClient` itself because
// it hardcodes `flowType: "pkce"` after spreading user options, which
// is incompatible with the `auth.admin.generateLink({ type: "magiclink" })`
// flow the production admin smoke fixture relies on (no client-side
// PKCE code-verifier exists for admin-generated links). Pairing
// `@supabase/supabase-js`'s `createClient` with `@supabase/ssr`'s
// browser cookie storage gives us implicit-flow magic-link support
// while keeping the chunked-cookie format apps/site's future
// `createServerClient` (M2 phase 2.3) will read.
//
// `@supabase/ssr` is exact-pinned at 0.10.0 in apps/web/package.json so
// this deep import path is stable. If the pin moves, re-verify the
// path before upgrading.
import { createStorageFromOptions } from "@supabase/ssr/dist/module/cookies";
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
 * Session storage is `@supabase/ssr`'s frontend-origin cookie storage
 * (cookie name `sb-<project-ref>-auth-token` derived by Supabase Auth
 * from the URL, chunked as `.0`/`.1` siblings when the JWT exceeds the
 * per-cookie size limit). The factory pins `Path=/`, `SameSite=Lax`,
 * and `Secure` when `window.location.protocol === "https:"` so apps/site
 * can read the cookie via Next.js `cookies()` through the Vercel
 * proxy-rewrite. No `Domain=` attribute means the cookie is host-only.
 * `HttpOnly` is impossible from JS — same exposure surface as the
 * prior `localStorage` path.
 *
 * `flowType` is set to `"implicit"` (matching `@supabase/supabase-js`'s
 * default) because the production admin smoke fixture uses
 * `auth.admin.generateLink({ type: "magiclink" })`, which has no
 * client-side PKCE verifier. The PKCE flow that
 * `@supabase/ssr`'s `createBrowserClient` would have forced is
 * incompatible with admin-generated magic links — the auth-js client
 * would throw `AuthPKCEGrantCodeExchangeError("Not a valid PKCE flow
 * url.")` on the implicit-style hash fragment that Supabase's verify
 * endpoint redirects with. M2 phase 2.3 (auth-callback in apps/site)
 * may revisit the flow choice if server-side PKCE exchange becomes
 * necessary; for now implicit flow keeps both real magic-link
 * sign-ins and the production smoke fixture working.
 */
export function createBrowserSupabaseClient(
  config: SupabaseConfig,
): SupabaseClient<Database> {
  const isHttps =
    typeof window !== "undefined" &&
    window.location.protocol === "https:";

  const { storage } = createStorageFromOptions(
    {
      cookieEncoding: "base64url",
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: isHttps,
      },
    },
    /* isServerClient */ false,
  );

  return createClient<Database>(config.supabaseUrl, config.supabaseClientKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
      persistSession: true,
      storage,
    },
  });
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
