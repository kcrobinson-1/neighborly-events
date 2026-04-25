import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
 */
export function createBrowserSupabaseClient(
  config: SupabaseConfig,
): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseClientKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
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
