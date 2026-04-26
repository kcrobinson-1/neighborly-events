import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../db";

/**
 * Status of an app's Supabase configuration. The shared/auth/ hook surface
 * uses this to surface the `missing_config` `AuthSessionState` when an app
 * cannot wire a client at all (typically a missing-env dev case).
 */
export type SharedAuthConfigStatus =
  | { enabled: true }
  | { enabled: false; message: string };

/**
 * Per-app providers the shared/auth/ surface reads through. Each app
 * supplies its env-derived getters once at startup via
 * `configureSharedAuth`. Per the parent epic's "Env access stays at the
 * app boundary" invariant, shared/auth/ never reads `import.meta.env.*`
 * or `process.env.*` directly.
 */
export type SharedAuthProviders = {
  /** Returns the app's configured browser Supabase client. */
  getClient: () => SupabaseClient<Database>;
  /** Returns the app's current Supabase configuration status. */
  getConfigStatus: () => SharedAuthConfigStatus;
};

let providers: SharedAuthProviders | null = null;

/**
 * Registers the per-app providers used by shared/auth/. Apps call this
 * exactly once at startup. Calling more than once overwrites the prior
 * configuration (intended for tests that want to swap providers between
 * cases).
 */
export function configureSharedAuth(next: SharedAuthProviders): void {
  providers = next;
}

/**
 * Reads the configured providers. Throws when shared/auth/ is consumed
 * before `configureSharedAuth` has run so ordering bugs surface loudly
 * instead of silently producing undefined behaviour.
 */
export function readSharedAuthProviders(): SharedAuthProviders {
  if (!providers) {
    throw new Error(
      "shared/auth/ used before configureSharedAuth() ran. Each app must call configureSharedAuth at startup before any shared/auth/ symbol is consumed.",
    );
  }
  return providers;
}

/** Test helper: clears the configured providers. Not part of the public surface. */
export function _resetSharedAuthForTests(): void {
  providers = null;
}
