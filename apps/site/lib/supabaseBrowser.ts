import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createBrowserSupabaseClient,
  type Database,
  type SupabaseConfig,
} from "../../../shared/db";

let browserSupabaseClient: SupabaseClient<Database> | null = null;

/** Trims environment variables so empty-looking values are treated consistently. */
function getEnvironmentValue(value: string | undefined) {
  return value?.trim() ?? "";
}

/** Returns the browser-side Supabase configuration needed for shared auth. */
export function getSupabaseConfig(): SupabaseConfig {
  const supabaseUrl = getEnvironmentValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const supabaseClientKey = getEnvironmentValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  );

  return {
    enabled: Boolean(supabaseUrl && supabaseClientKey),
    supabaseClientKey,
    supabaseUrl,
  };
}

/** Returns the shared browser Supabase client used by apps/site client routes. */
export function getBrowserSupabaseClient() {
  const config = getSupabaseConfig();

  if (!config.enabled) {
    throw new Error(getMissingSupabaseConfigMessage());
  }

  if (!browserSupabaseClient) {
    browserSupabaseClient = createBrowserSupabaseClient(config);
  }

  return browserSupabaseClient;
}

/** Explains how to proceed when browser Supabase configuration is missing. */
export function getMissingSupabaseConfigMessage() {
  if (process.env.NODE_ENV === "production") {
    return "This game isn't available right now.";
  }

  return [
    "This game isn't available right now.",
    "If you're working locally, add `NEXT_PUBLIC_SUPABASE_URL` and",
    "`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` to apps/site/.env.local.",
  ].join(" ");
}
