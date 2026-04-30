import { expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type RedeemEnv = {
  serviceRoleKey: string;
  supabaseUrl: string;
};

type RedeemFixture = {
  eventCode: string;
  eventId: string;
  eventSlug: string;
  magicLinkUrl: string;
  redeemSuffix: string;
  verificationCode: string;
};

type RedeemedEntitlementRow = {
  redeemed_at: string | null;
  redeemed_by_role: string | null;
  redemption_status: string;
  verification_code: string;
};

const defaultAgentEmail = "redeem-smoke-agent@example.com";
const defaultEventId = "madrona-music-2026";
const defaultEventSlug = "first-sample";
const defaultRedeemSuffix = "0427";
const defaultRedirectUrl =
  "http://127.0.0.1:4173/auth/callback?next=/event/first-sample/game/redeem";
const defaultClientSessionId = "redeem-smoke-session";

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

function readRedeemEnv(): RedeemEnv {
  return {
    serviceRoleKey: readRequiredEnv("TEST_SUPABASE_SERVICE_ROLE_KEY"),
    supabaseUrl: readRequiredEnv("TEST_SUPABASE_URL"),
  };
}

function createServiceRoleClient(env: RedeemEnv) {
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

export async function ensureRedeemE2eFixture(): Promise<RedeemFixture> {
  const env = readRedeemEnv();
  const serviceRoleClient = createServiceRoleClient(env);
  const eventId = readOptionalEnv("TEST_REDEEM_EVENT_ID") ?? defaultEventId;
  const eventSlug = readOptionalEnv("TEST_REDEEM_EVENT_SLUG") ?? defaultEventSlug;
  const redeemSuffix = readOptionalEnv("TEST_REDEEM_SUFFIX") ?? defaultRedeemSuffix;
  const agentEmail = readOptionalEnv("TEST_REDEEM_AGENT_EMAIL") ?? defaultAgentEmail;
  const redirectUrl = readOptionalEnv("TEST_REDEEM_REDIRECT_URL") ?? defaultRedirectUrl;
  const clientSessionId =
    readOptionalEnv("TEST_REDEEM_CLIENT_SESSION_ID") ?? defaultClientSessionId;

  const { data: eventRow, error: eventError } = await serviceRoleClient
    .from("game_events")
    .select("event_code,id,slug")
    .eq("id", eventId)
    .maybeSingle<{ event_code: string | null; id: string; slug: string }>();

  if (eventError) {
    throw new Error(`Failed to read redeem smoke event: ${eventError.message}`);
  }

  if (!eventRow?.event_code) {
    throw new Error("Redeem smoke event is missing its event_code.");
  }

  if (eventRow.slug !== eventSlug) {
    throw new Error(
      `Redeem smoke fixture expected slug "${eventSlug}" but found "${eventRow.slug}".`,
    );
  }

  const { data: generatedLink, error: generateLinkError } =
    await serviceRoleClient.auth.admin.generateLink({
      email: agentEmail,
      options: {
        redirectTo: redirectUrl,
        shouldCreateUser: true,
      },
      type: "magiclink",
    });

  if (generateLinkError) {
    throw new Error(`Failed to generate redeem magic link: ${generateLinkError.message}`);
  }

  const magicLinkUrl = generatedLink.properties?.action_link;
  const agentUserId = generatedLink.user?.id;

  if (!magicLinkUrl) {
    throw new Error("Supabase did not return a redeem magic link.");
  }

  if (!agentUserId) {
    throw new Error("Supabase did not return the redeem agent user id.");
  }

  maskValueForGitHubActions(magicLinkUrl);

  await serviceRoleClient
    .from("event_role_assignments")
    .delete()
    .eq("event_id", eventId)
    .eq("role", "agent")
    .eq("user_id", agentUserId);

  const { error: assignmentError } = await serviceRoleClient
    .from("event_role_assignments")
    .insert({
      event_id: eventId,
      role: "agent",
      user_id: agentUserId,
    });

  if (assignmentError) {
    throw new Error(`Failed to upsert redeem agent role assignment: ${assignmentError.message}`);
  }

  const verificationCode = `${eventRow.event_code}-${redeemSuffix}`;

  await serviceRoleClient
    .from("game_entitlements")
    .delete()
    .eq("event_id", eventId)
    .eq("verification_code", verificationCode);

  await serviceRoleClient
    .from("game_entitlements")
    .delete()
    .eq("event_id", eventId)
    .eq("client_session_id", clientSessionId);

  const { error: entitlementError } = await serviceRoleClient
    .from("game_entitlements")
    .insert({
      client_session_id: clientSessionId,
      event_id: eventId,
      verification_code: verificationCode,
    });

  if (entitlementError) {
    throw new Error(`Failed to insert redeem entitlement fixture: ${entitlementError.message}`);
  }

  return {
    eventCode: eventRow.event_code,
    eventId,
    eventSlug,
    magicLinkUrl,
    redeemSuffix,
    verificationCode,
  };
}

export async function assertRedeemOutcomePersisted(
  verificationCode: string,
  expectedResult: "already_redeemed" | "redeemed_now",
  eventId = defaultEventId,
) {
  const env = readRedeemEnv();
  const serviceRoleClient = createServiceRoleClient(env);

  const { data: entitlementRow, error: entitlementError } = await serviceRoleClient
    .from("game_entitlements")
    .select("redeemed_at,redeemed_by_role,redemption_status,verification_code")
    .eq("event_id", eventId)
    .eq("verification_code", verificationCode)
    .maybeSingle<RedeemedEntitlementRow>();

  if (entitlementError) {
    throw new Error(`Failed to read redeem entitlement state: ${entitlementError.message}`);
  }

  expect(entitlementRow).not.toBeNull();
  expect(entitlementRow?.verification_code).toBe(verificationCode);
  expect(entitlementRow?.redemption_status).toBe("redeemed");
  expect(entitlementRow?.redeemed_at).not.toBeNull();
  expect(["agent", "root_admin"]).toContain(entitlementRow?.redeemed_by_role);

  if (expectedResult === "redeemed_now") {
    expect(entitlementRow?.redeemed_by_role).toBe("agent");
  }
}

export async function installRedeemFunctionProxy(page: Page) {
  const env = readRedeemEnv();
  const baseUrl = env.supabaseUrl.replace(/\/$/, "");
  const functionNames = new Set(["redeem-entitlement"]);

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
    const headers = {
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
