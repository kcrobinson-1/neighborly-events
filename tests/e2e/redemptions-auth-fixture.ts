import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type RedemptionsEnv = {
  serviceRoleKey: string;
  supabaseUrl: string;
};

type SeededEntitlement = {
  clientSessionId: string;
  id: string;
  suffix: string;
  verificationCode: string;
};

export type RedemptionsFixture = {
  eventCode: string;
  eventId: string;
  eventSlug: string;
  magicLinkUrl: string;
  organizerUserId: string;
  redeemedByMe: SeededEntitlement;
  redeemedByOther: SeededEntitlement;
  reversedByMe: SeededEntitlement;
};

const defaultOrganizerEmail = "redemptions-smoke-organizer@example.com";
const defaultEventId = "madrona-music-2026";
const defaultEventSlug = "first-sample";
const defaultRedirectUrl =
  "http://127.0.0.1:4173/auth/callback?next=/event/first-sample/game/redemptions";
const defaultClientSessionPrefix = "redemptions-smoke-session";

function readRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readOptionalEnv(name: string) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function readRedemptionsEnv(): RedemptionsEnv {
  return {
    serviceRoleKey: readRequiredEnv("TEST_SUPABASE_SERVICE_ROLE_KEY"),
    supabaseUrl: readRequiredEnv("TEST_SUPABASE_URL"),
  };
}

function createServiceRoleClient(env: RedemptionsEnv) {
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function maskValueForGitHubActions(value: string | undefined) {
  if (!value || process.env.GITHUB_ACTIONS !== "true") {
    return;
  }

  console.log(`::add-mask::${value}`);
}

export async function ensureRedemptionsE2eFixture(): Promise<RedemptionsFixture> {
  const env = readRedemptionsEnv();
  const serviceRoleClient = createServiceRoleClient(env);
  const eventId = readOptionalEnv("TEST_REDEMPTIONS_EVENT_ID") ?? defaultEventId;
  const eventSlug =
    readOptionalEnv("TEST_REDEMPTIONS_EVENT_SLUG") ?? defaultEventSlug;
  const organizerEmail =
    readOptionalEnv("TEST_REDEMPTIONS_ORGANIZER_EMAIL") ?? defaultOrganizerEmail;
  const redirectUrl =
    readOptionalEnv("TEST_REDEMPTIONS_REDIRECT_URL") ?? defaultRedirectUrl;
  const clientSessionPrefix =
    readOptionalEnv("TEST_REDEMPTIONS_CLIENT_SESSION_PREFIX") ??
    defaultClientSessionPrefix;

  const { data: eventRow, error: eventError } = await serviceRoleClient
    .from("game_events")
    .select("event_code,id,slug")
    .eq("id", eventId)
    .maybeSingle<{ event_code: string | null; id: string; slug: string }>();

  if (eventError) {
    throw new Error(
      `Failed to read redemptions smoke event: ${eventError.message}`,
    );
  }

  if (!eventRow?.event_code) {
    throw new Error("Redemptions smoke event is missing its event_code.");
  }

  if (eventRow.slug !== eventSlug) {
    throw new Error(
      `Redemptions smoke fixture expected slug "${eventSlug}" but found "${eventRow.slug}".`,
    );
  }

  const { data: generatedLink, error: generateLinkError } =
    await serviceRoleClient.auth.admin.generateLink({
      email: organizerEmail,
      options: {
        redirectTo: redirectUrl,
        shouldCreateUser: true,
      },
      type: "magiclink",
    });

  if (generateLinkError) {
    throw new Error(
      `Failed to generate redemptions magic link: ${generateLinkError.message}`,
    );
  }

  const magicLinkUrl = generatedLink.properties?.action_link;
  const organizerUserId = generatedLink.user?.id;

  if (!magicLinkUrl) {
    throw new Error("Supabase did not return a redemptions magic link.");
  }

  if (!organizerUserId) {
    throw new Error("Supabase did not return the redemptions organizer user id.");
  }

  maskValueForGitHubActions(magicLinkUrl);

  await serviceRoleClient
    .from("event_role_assignments")
    .delete()
    .eq("event_id", eventId)
    .eq("role", "organizer")
    .eq("user_id", organizerUserId);

  const { error: assignmentError } = await serviceRoleClient
    .from("event_role_assignments")
    .insert({
      event_id: eventId,
      role: "organizer",
      user_id: organizerUserId,
    });

  if (assignmentError) {
    throw new Error(
      `Failed to upsert redemptions organizer role assignment: ${assignmentError.message}`,
    );
  }

  const redeemedByMeSuffix =
    readOptionalEnv("TEST_REDEMPTIONS_REDEEMED_BY_ME_SUFFIX") ?? "0701";
  const redeemedByOtherSuffix =
    readOptionalEnv("TEST_REDEMPTIONS_REDEEMED_BY_OTHER_SUFFIX") ?? "0702";
  const reversedByMeSuffix =
    readOptionalEnv("TEST_REDEMPTIONS_REVERSED_BY_ME_SUFFIX") ?? "0703";

  const suffixes = [redeemedByMeSuffix, redeemedByOtherSuffix, reversedByMeSuffix];
  const verificationCodes = suffixes.map(
    (suffix) => `${eventRow.event_code}-${suffix}`,
  );
  const clientSessionIds = suffixes.map(
    (suffix) => `${clientSessionPrefix}-${suffix}`,
  );

  for (const verificationCode of verificationCodes) {
    await serviceRoleClient
      .from("game_entitlements")
      .delete()
      .eq("event_id", eventId)
      .eq("verification_code", verificationCode);
  }
  for (const clientSessionId of clientSessionIds) {
    await serviceRoleClient
      .from("game_entitlements")
      .delete()
      .eq("event_id", eventId)
      .eq("client_session_id", clientSessionId);
  }

  const redeemedAt = new Date().toISOString();
  const reversedAt = new Date().toISOString();

  const { data: redeemedByMeRow, error: redeemedByMeError } =
    await serviceRoleClient
      .from("game_entitlements")
      .insert({
        client_session_id: clientSessionIds[0],
        event_id: eventId,
        redeemed_at: redeemedAt,
        redeemed_by: organizerUserId,
        redeemed_by_role: "agent",
        redeemed_event_id: eventId,
        redemption_status: "redeemed",
        verification_code: verificationCodes[0],
      })
      .select("id")
      .single<{ id: string }>();

  if (redeemedByMeError || !redeemedByMeRow) {
    throw new Error(
      `Failed to seed redeemedByMe entitlement: ${
        redeemedByMeError?.message ?? "no row returned"
      }`,
    );
  }

  const { data: redeemedByOtherRow, error: redeemedByOtherError } =
    await serviceRoleClient
      .from("game_entitlements")
      .insert({
        client_session_id: clientSessionIds[1],
        event_id: eventId,
        redeemed_at: redeemedAt,
        redeemed_by: null,
        redeemed_by_role: "agent",
        redeemed_event_id: eventId,
        redemption_status: "redeemed",
        verification_code: verificationCodes[1],
      })
      .select("id")
      .single<{ id: string }>();

  if (redeemedByOtherError || !redeemedByOtherRow) {
    throw new Error(
      `Failed to seed redeemedByOther entitlement: ${
        redeemedByOtherError?.message ?? "no row returned"
      }`,
    );
  }

  const { data: reversedByMeRow, error: reversedByMeError } =
    await serviceRoleClient
      .from("game_entitlements")
      .insert({
        client_session_id: clientSessionIds[2],
        event_id: eventId,
        redemption_reversed_at: reversedAt,
        redemption_reversed_by: organizerUserId,
        redemption_reversed_by_role: "organizer",
        redemption_status: "unredeemed",
        verification_code: verificationCodes[2],
      })
      .select("id")
      .single<{ id: string }>();

  if (reversedByMeError || !reversedByMeRow) {
    throw new Error(
      `Failed to seed reversedByMe entitlement: ${
        reversedByMeError?.message ?? "no row returned"
      }`,
    );
  }

  return {
    eventCode: eventRow.event_code,
    eventId,
    eventSlug,
    magicLinkUrl,
    organizerUserId,
    redeemedByMe: {
      clientSessionId: clientSessionIds[0],
      id: redeemedByMeRow.id,
      suffix: redeemedByMeSuffix,
      verificationCode: verificationCodes[0],
    },
    redeemedByOther: {
      clientSessionId: clientSessionIds[1],
      id: redeemedByOtherRow.id,
      suffix: redeemedByOtherSuffix,
      verificationCode: verificationCodes[1],
    },
    reversedByMe: {
      clientSessionId: clientSessionIds[2],
      id: reversedByMeRow.id,
      suffix: reversedByMeSuffix,
      verificationCode: verificationCodes[2],
    },
  };
}

/**
 * Installs a Playwright page-route proxy for the reversal Edge Function.
 *
 * The local Supabase stack's Kong gateway responds to OPTIONS preflights
 * with `Access-Control-Allow-Origin: *` and no `Allow-Credentials: true`,
 * which fails Chromium's credentialed-fetch CORS check before the function
 * ever runs. The proxy fulfills the preflight locally with the correct
 * credentialed headers and forwards the non-OPTIONS body through a Node
 * `fetch` so the browser-facing semantics match the deployed environment.
 * This mirrors the B.1 redeem-e2e workaround.
 */
export async function installRedemptionsFunctionProxy(page: Page) {
  const env = readRedemptionsEnv();
  const baseUrl = env.supabaseUrl.replace(/\/$/, "");
  const functionNames = new Set(["reverse-entitlement-redemption"]);

  await page.route(`${baseUrl}/functions/v1/**`, async (route) => {
    const request = route.request();
    const requestUrl = new URL(request.url());
    const functionName = requestUrl.pathname.split("/").at(-1) ?? "";

    if (!functionNames.has(functionName)) {
      await route.continue();
      return;
    }

    if (request.method() === "OPTIONS") {
      const requestedHeaders = await request.headerValue(
        "access-control-request-headers",
      );
      await route.fulfill({
        headers: {
          "access-control-allow-credentials": "true",
          "access-control-allow-headers":
            requestedHeaders ??
            "authorization,apikey,content-type,x-client-info",
          "access-control-allow-methods": "POST,OPTIONS",
          "access-control-allow-origin": "http://127.0.0.1:4173",
          vary: "Origin",
        },
        status: 200,
      });
      return;
    }

    const requestApikey = await request.headerValue("apikey");
    const requestAuthorization = await request.headerValue("authorization");
    const requestContentType = await request.headerValue("content-type");
    const headers: Record<string, string> = {
      origin: "http://127.0.0.1:4173",
    };

    if (requestApikey) {
      headers.apikey = requestApikey;
    }

    if (requestAuthorization) {
      headers.Authorization = requestAuthorization;
    }

    if (requestContentType) {
      headers["Content-Type"] = requestContentType;
    }

    const response = await fetch(request.url(), {
      body: request.postData() ?? undefined,
      headers,
      method: request.method(),
    });

    await route.fulfill({
      body: await response.text(),
      contentType: response.headers.get("content-type") ?? "application/json",
      status: response.status,
    });
  });
}
