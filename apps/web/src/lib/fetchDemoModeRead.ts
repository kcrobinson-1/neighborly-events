import type { TestEventSlug } from "../../../../shared/events/testEventAllowlist";
import type { RedemptionRow } from "../redemptions/types";
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
  rows: RedemptionRow[];
};

const DEFAULT_DEMO_READ_ERROR_MESSAGE =
  "We couldn't load the demo data right now.";

/** Invokes the read-demo-event Edge Function for an unauthenticated bypass surface. */
export async function fetchDemoModeRead(
  args: AdminFetchArgs,
): Promise<DemoEventAdminSummary | null>;
export async function fetchDemoModeRead(
  args: RedemptionsFetchArgs,
): Promise<RedemptionRow[]>;
export async function fetchDemoModeRead(
  args: FetchArgs,
): Promise<DemoEventAdminSummary | RedemptionRow[] | null> {
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
