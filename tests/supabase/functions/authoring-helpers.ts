import { getGameById } from "../../../shared/game-config/sample-fixtures.ts";
import {
  type AuthoringHttpDependencies,
  defaultAuthoringHttpDependencies,
} from "../../../supabase/functions/_shared/authoring-http.ts";
import type { DemoModeRejectionBody } from "../../../supabase/functions/_shared/demo-mode-rejection.ts";
import { createOriginRequest } from "./helpers.ts";

export const sampleDraft = getGameById("madrona-music-2026");
export const adminUserId = "22222222-2222-4222-8222-222222222222";

/**
 * Default stub for `evaluateDemoModeRejection` used by tests that exercise
 * paths past the demo-mode short-circuit. Returning `null` defers to the
 * test's existing auth-gate stub. Tests that exercise the demo-mode path
 * itself override with their own return value.
 */
export const noopEvaluateDemoModeRejection = async (): Promise<
  DemoModeRejectionBody | null
> => null;

if (!sampleDraft) {
  throw new Error(
    "Expected the featured sample game to exist for authoring tests.",
  );
}

export function createAuthoringRequest(body: unknown) {
  return createOriginRequest("https://example.com", {
    body: JSON.stringify(body),
    headers: {
      Authorization: "Bearer user-token",
    },
    method: "POST",
  });
}

export function createAuthoringHttpDependencies(
  overrides: Partial<AuthoringHttpDependencies> = {},
): AuthoringHttpDependencies {
  return {
    ...defaultAuthoringHttpDependencies,
    getAllowedOrigin: () => "http://127.0.0.1:4173",
    getServiceRoleKey: () => "service-role-key",
    getSupabaseClientKey: () => "publishable-key",
    getSupabaseUrl: () => "http://127.0.0.1:54321",
    ...overrides,
  };
}
