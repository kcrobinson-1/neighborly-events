import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SupabaseConfig } from "../db";

/**
 * Per-app providers the shared/events/ surface reads through. Each app supplies
 * its env-derived getters once at startup via `configureSharedEvents`, keeping
 * framework-specific env and singleton concerns out of the shared module.
 */
export type SharedEventsProviders = {
  /** Returns the app's configured browser Supabase client. */
  getClient: () => SupabaseClient<Database>;
  /** Returns the app's current browser Supabase configuration. */
  getConfig: () => SupabaseConfig;
  /** Returns the app-specific missing-Supabase-config message. */
  getMissingConfigMessage: () => string;
  /** Returns the slug that sorts first in published event summary lists. */
  getFeaturedGameSlug: () => string;
};

let providers: SharedEventsProviders | null = null;

/**
 * Registers the per-app providers used by shared/events/. Apps call this
 * exactly once at startup. Calling more than once overwrites the prior
 * configuration, which keeps tests simple when swapping providers per case.
 */
export function configureSharedEvents(next: SharedEventsProviders): void {
  providers = next;
}

/**
 * Reads the configured providers. Throws when shared/events/ is consumed before
 * `configureSharedEvents` has run so startup ordering bugs fail loudly.
 */
export function readSharedEventsProviders(): SharedEventsProviders {
  if (!providers) {
    throw new Error(
      "shared/events/ used before configureSharedEvents() ran. Each app must call configureSharedEvents at startup before any shared/events/ symbol is consumed.",
    );
  }
  return providers;
}

/** Test helper: clears the configured providers. Not part of the public surface. */
export function _resetSharedEventsForTests(): void {
  providers = null;
}
