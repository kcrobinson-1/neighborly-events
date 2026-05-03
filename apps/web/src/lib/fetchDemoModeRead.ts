import type { TestEventSlug } from "../../../../shared/events/testEventAllowlist";
import {
  createSupabaseAuthHeaders,
  getMissingSupabaseConfigMessage,
  getSupabaseConfig,
  readSupabaseErrorMessage,
} from "./supabaseBrowser";

/**
 * Mirror of the demo-event admin payload the read-demo-event Edge
 * Function returns for `surface: "admin"`. Field shape matches
 * `DraftEventSummary` from `shared/events/admin.ts`.
 */
export type DemoEventAdminSummary = {
  eventCode: string | null;
  hasBeenPublished: boolean;
  id: string;
  isLive: boolean;
  lastPublishedVersionNumber: number | null;
  name: string;
  slug: string;
  status: "draft_only" | "live" | "live_with_draft_changes";
  updatedAt: string;
};

/**
 * Mirror of the demo-redemption row the read-demo-event Edge Function
 * returns for `surface: "redemptions"`. Strictly narrower than the
 * authenticated `RedemptionRow`: operator identifiers and free-text
 * notes are intentionally absent because read-demo-event is publicly
 * reachable (`verify_jwt = false` + allowlist gate) and surfacing
 * those fields would leak operator PII to unauthenticated visitors.
 */
export type DemoModeRedemptionRow = {
  id: string;
  redeemed_at: string | null;
  redemption_reversed_at: string | null;
  redemption_status: "redeemed" | "unredeemed";
  verification_code: string;
};

type AdminFetchArgs = {
  slug: TestEventSlug;
  surface: "admin";
};

type RedemptionsFetchArgs = {
  slug: TestEventSlug;
  surface: "redemptions";
};

type FetchArgs = AdminFetchArgs | RedemptionsFetchArgs;

type RedemptionsResponseBody = {
  rows: DemoModeRedemptionRow[];
};

const DEFAULT_DEMO_READ_ERROR_MESSAGE =
  "We couldn't load the demo data right now.";

/** Invokes the read-demo-event Edge Function for an unauthenticated bypass surface. */
export async function fetchDemoModeRead(
  args: AdminFetchArgs,
): Promise<DemoEventAdminSummary | null>;
export async function fetchDemoModeRead(
  args: RedemptionsFetchArgs,
): Promise<DemoModeRedemptionRow[]>;
export async function fetchDemoModeRead(
  args: FetchArgs,
): Promise<DemoEventAdminSummary | DemoModeRedemptionRow[] | null> {
  const { enabled, supabaseClientKey, supabaseUrl } = getSupabaseConfig();

  if (!enabled) {
    throw new Error(getMissingSupabaseConfigMessage());
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/read-demo-event`,
    {
      body: JSON.stringify(args),
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...createSupabaseAuthHeaders(supabaseClientKey),
      },
      method: "POST",
    },
  );

  if (response.status === 404 && args.surface === "admin") {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      await readSupabaseErrorMessage(response, DEFAULT_DEMO_READ_ERROR_MESSAGE),
    );
  }

  if (args.surface === "admin") {
    return (await response.json()) as DemoEventAdminSummary;
  }

  const body = (await response.json()) as RedemptionsResponseBody;
  return body.rows ?? [];
}
