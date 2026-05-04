import { expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type ProductionSmokeEnv = {
  serviceRoleKey: string;
  supabaseUrl: string;
};

type SeededEntitlement = {
  clientSessionId: string;
  id: string;
  suffix: string;
  verificationCode: string;
};

export type RedeemProductionSmokeFixture = {
  eventCode: string;
  eventId: string;
  eventSlug: string;
  magicLinkUrl: string;
  redeemSuffix: string;
  verificationCode: string;
};

export type RedemptionsProductionSmokeFixture = {
  eventCode: string;
  eventId: string;
  eventSlug: string;
  magicLinkUrl: string;
  organizerUserId: string;
  redeemedByMe: SeededEntitlement;
  redeemedByOther: SeededEntitlement;
  reversedByMe: SeededEntitlement;
};

type RedeemedEntitlementRow = {
  redeemed_at: string | null;
  redeemed_by_role: string | null;
  redemption_status: string;
  verification_code: string;
};

const defaultEventId = "production-smoke-event";
const defaultEventSlug = "production-smoke-event";
const defaultAgentEmail = "production-smoke-redeem-agent@example.com";
const defaultOrganizerEmail =
  "production-smoke-redemptions-organizer@example.com";
const defaultRedeemSuffix = "0427";
const defaultRedeemedByMeSuffix = "0701";
const defaultRedeemedByOtherSuffix = "0702";
const defaultReversedByMeSuffix = "0703";
const defaultClientSessionPrefix = "production-redemption-smoke-session";

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

function readProductionSmokeEnv(): ProductionSmokeEnv {
  return {
    serviceRoleKey: readRequiredEnv("TEST_SUPABASE_SERVICE_ROLE_KEY"),
    supabaseUrl: readRequiredEnv("TEST_SUPABASE_URL"),
  };
}

function createServiceRoleClient(env: ProductionSmokeEnv) {
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

function defaultRedirectUrl(nextPath: string) {
  const baseUrl = readOptionalEnv("PRODUCTION_SMOKE_BASE_URL")?.replace(
    /\/$/,
    "",
  );
  return baseUrl
    ? `${baseUrl}/auth/callback?next=${nextPath}`
    : `http://127.0.0.1:4173/auth/callback?next=${nextPath}`;
}

async function ensurePublishedSmokeEvent(
  serviceRoleClient: ReturnType<typeof createServiceRoleClient>,
  eventId: string,
  expectedEventSlug: string,
) {
  const { data: eventRow, error: eventError } = await serviceRoleClient
    .from("game_events")
    .select("event_code,id,published_at,slug")
    .eq("id", eventId)
    .maybeSingle<{
      event_code: string | null;
      id: string;
      published_at: string | null;
      slug: string;
    }>();

  if (eventError) {
    throw new Error(
      `Failed to read production smoke event: ${eventError.message}`,
    );
  }

  if (!eventRow) {
    throw new Error(
      `Production smoke event "${eventId}" does not exist. The admin production smoke fixture is the upstream that creates this row; run admin smoke first or seed the event manually before running redemption smoke.`,
    );
  }

  if (!eventRow.event_code) {
    throw new Error(
      `Production smoke event "${eventId}" is missing its event_code. The admin production smoke fixture allocates event_code; redemption smoke does not allocate it.`,
    );
  }

  if (eventRow.slug !== expectedEventSlug) {
    throw new Error(
      `Production smoke event expected slug "${expectedEventSlug}" but found "${eventRow.slug}".`,
    );
  }

  if (eventRow.published_at === null) {
    const { error: publishError } = await serviceRoleClient
      .from("game_events")
      .update({ published_at: new Date().toISOString() })
      .eq("id", eventId);

    if (publishError) {
      throw new Error(
        `Failed to re-publish production smoke event for redemption smoke: ${publishError.message}`,
      );
    }
  }

  return { eventCode: eventRow.event_code, slug: eventRow.slug };
}

async function generateMagicLink(
  serviceRoleClient: ReturnType<typeof createServiceRoleClient>,
  email: string,
  redirectTo: string,
  errorContext: string,
) {
  const { data: generatedLink, error: generateLinkError } =
    await serviceRoleClient.auth.admin.generateLink({
      email,
      options: {
        redirectTo,
        shouldCreateUser: true,
      },
      type: "magiclink",
    });

  if (generateLinkError) {
    throw new Error(
      `Failed to generate ${errorContext} magic link: ${generateLinkError.message}`,
    );
  }

  const magicLinkUrl = generatedLink.properties?.action_link;
  const userId = generatedLink.user?.id;

  if (!magicLinkUrl) {
    throw new Error(`Supabase did not return a ${errorContext} magic link.`);
  }

  if (!userId) {
    throw new Error(
      `Supabase did not return the ${errorContext} user id.`,
    );
  }

  maskValueForGitHubActions(magicLinkUrl);

  return { magicLinkUrl, userId };
}

async function upsertRoleAssignment(
  serviceRoleClient: ReturnType<typeof createServiceRoleClient>,
  eventId: string,
  role: "agent" | "organizer",
  userId: string,
) {
  await serviceRoleClient
    .from("event_role_assignments")
    .delete()
    .eq("event_id", eventId)
    .eq("role", role)
    .eq("user_id", userId);

  const { error: assignmentError } = await serviceRoleClient
    .from("event_role_assignments")
    .insert({ event_id: eventId, role, user_id: userId });

  if (assignmentError) {
    throw new Error(
      `Failed to upsert ${role} role assignment for production smoke: ${assignmentError.message}`,
    );
  }
}

export async function ensureRedeemProductionSmokeFixture(): Promise<RedeemProductionSmokeFixture> {
  const env = readProductionSmokeEnv();
  const serviceRoleClient = createServiceRoleClient(env);
  const eventId =
    readOptionalEnv("PRODUCTION_SMOKE_EVENT_ID") ?? defaultEventId;
  const expectedSlug =
    readOptionalEnv("PRODUCTION_SMOKE_EVENT_SLUG") ?? defaultEventSlug;
  const agentEmail =
    readOptionalEnv("PRODUCTION_SMOKE_REDEEM_AGENT_EMAIL") ?? defaultAgentEmail;
  const redeemSuffix =
    readOptionalEnv("PRODUCTION_SMOKE_REDEEM_SUFFIX") ?? defaultRedeemSuffix;
  const redirectUrl =
    readOptionalEnv("PRODUCTION_SMOKE_REDEEM_REDIRECT_URL") ??
    defaultRedirectUrl(`/event/${expectedSlug}/game/redeem`);
  const clientSessionId = `${defaultClientSessionPrefix}-redeem-${redeemSuffix}`;

  const { eventCode, slug } = await ensurePublishedSmokeEvent(
    serviceRoleClient,
    eventId,
    expectedSlug,
  );

  const { magicLinkUrl, userId: agentUserId } = await generateMagicLink(
    serviceRoleClient,
    agentEmail,
    redirectUrl,
    "redeem agent",
  );

  await upsertRoleAssignment(serviceRoleClient, eventId, "agent", agentUserId);

  const verificationCode = `${eventCode}-${redeemSuffix}`;

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
    throw new Error(
      `Failed to insert redeem production smoke entitlement: ${entitlementError.message}`,
    );
  }

  return {
    eventCode,
    eventId,
    eventSlug: slug,
    magicLinkUrl,
    redeemSuffix,
    verificationCode,
  };
}

export async function ensureRedemptionsProductionSmokeFixture(): Promise<RedemptionsProductionSmokeFixture> {
  const env = readProductionSmokeEnv();
  const serviceRoleClient = createServiceRoleClient(env);
  const eventId =
    readOptionalEnv("PRODUCTION_SMOKE_EVENT_ID") ?? defaultEventId;
  const expectedSlug =
    readOptionalEnv("PRODUCTION_SMOKE_EVENT_SLUG") ?? defaultEventSlug;
  const organizerEmail =
    readOptionalEnv("PRODUCTION_SMOKE_REDEMPTIONS_ORGANIZER_EMAIL") ??
    defaultOrganizerEmail;
  const redirectUrl =
    readOptionalEnv("PRODUCTION_SMOKE_REDEMPTIONS_REDIRECT_URL") ??
    defaultRedirectUrl(`/event/${expectedSlug}/game/redemptions`);

  const redeemedByMeSuffix =
    readOptionalEnv("PRODUCTION_SMOKE_REDEMPTIONS_REDEEMED_BY_ME_SUFFIX") ??
    defaultRedeemedByMeSuffix;
  const redeemedByOtherSuffix =
    readOptionalEnv("PRODUCTION_SMOKE_REDEMPTIONS_REDEEMED_BY_OTHER_SUFFIX") ??
    defaultRedeemedByOtherSuffix;
  const reversedByMeSuffix =
    readOptionalEnv("PRODUCTION_SMOKE_REDEMPTIONS_REVERSED_BY_ME_SUFFIX") ??
    defaultReversedByMeSuffix;

  const { eventCode, slug } = await ensurePublishedSmokeEvent(
    serviceRoleClient,
    eventId,
    expectedSlug,
  );

  const { magicLinkUrl, userId: organizerUserId } = await generateMagicLink(
    serviceRoleClient,
    organizerEmail,
    redirectUrl,
    "redemptions organizer",
  );

  await upsertRoleAssignment(
    serviceRoleClient,
    eventId,
    "organizer",
    organizerUserId,
  );

  const suffixes = [redeemedByMeSuffix, redeemedByOtherSuffix, reversedByMeSuffix];
  const verificationCodes = suffixes.map((suffix) => `${eventCode}-${suffix}`);
  const clientSessionIds = suffixes.map(
    (suffix) => `${defaultClientSessionPrefix}-redemptions-${suffix}`,
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
      `Failed to seed redeemedByMe production smoke entitlement: ${
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
      `Failed to seed redeemedByOther production smoke entitlement: ${
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
      `Failed to seed reversedByMe production smoke entitlement: ${
        reversedByMeError?.message ?? "no row returned"
      }`,
    );
  }

  return {
    eventCode,
    eventId,
    eventSlug: slug,
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

export async function assertRedeemOutcomePersisted(
  verificationCode: string,
  expectedResult: "already_redeemed" | "redeemed_now",
  eventId: string,
) {
  const env = readProductionSmokeEnv();
  const serviceRoleClient = createServiceRoleClient(env);

  const { data: entitlementRow, error: entitlementError } = await serviceRoleClient
    .from("game_entitlements")
    .select("redeemed_at,redeemed_by_role,redemption_status,verification_code")
    .eq("event_id", eventId)
    .eq("verification_code", verificationCode)
    .maybeSingle<RedeemedEntitlementRow>();

  if (entitlementError) {
    throw new Error(
      `Failed to read redeem entitlement state: ${entitlementError.message}`,
    );
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

export async function assertReversalPersisted(
  verificationCode: string,
  eventId: string,
  expectedReason: string,
) {
  const env = readProductionSmokeEnv();
  const serviceRoleClient = createServiceRoleClient(env);

  const { data: entitlementRow, error: entitlementError } = await serviceRoleClient
    .from("game_entitlements")
    .select(
      "redemption_status,redemption_reversed_at,redemption_reversed_by_role,redemption_reversal_reason,verification_code",
    )
    .eq("event_id", eventId)
    .eq("verification_code", verificationCode)
    .maybeSingle<{
      redemption_status: string;
      redemption_reversed_at: string | null;
      redemption_reversed_by_role: string | null;
      redemption_reversal_reason: string | null;
      verification_code: string;
    }>();

  if (entitlementError) {
    throw new Error(
      `Failed to read reversal entitlement state: ${entitlementError.message}`,
    );
  }

  expect(entitlementRow).not.toBeNull();
  expect(entitlementRow?.verification_code).toBe(verificationCode);
  expect(entitlementRow?.redemption_status).toBe("unredeemed");
  expect(entitlementRow?.redemption_reversed_at).not.toBeNull();
  expect(entitlementRow?.redemption_reversed_by_role).toBe("organizer");
  expect(entitlementRow?.redemption_reversal_reason).toBe(expectedReason);
}

