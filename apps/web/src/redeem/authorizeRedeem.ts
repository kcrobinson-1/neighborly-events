import { getBrowserSupabaseClient } from "../lib/supabaseBrowser";

type RedeemEventRow = {
  event_code: string | null;
  id: string;
};

export type RedeemAuthorizationResult =
  | { eventCode: string; eventId: string; status: "authorized" }
  | { status: "role_gate" }
  | { message: string; status: "transient_error" };

type AuthorizeRedeemOptions = {
  retryDelayMs?: number;
};

const DEFAULT_TRANSIENT_MESSAGE = "Please retry once your connection is stable.";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : DEFAULT_TRANSIENT_MESSAGE;
}

function isEventCode(value: string | null): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function attemptAuthorizeRedeem(slug: string) {
  const client = getBrowserSupabaseClient();
  const eventResponse = await client
    .from("game_events")
    .select("id,event_code")
    .eq("slug", slug)
    .maybeSingle<RedeemEventRow>();

  if (eventResponse.error) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  if (!eventResponse.data) {
    return {
      status: "role_gate" as const,
    };
  }

  if (!isEventCode(eventResponse.data.event_code)) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  const [agentResponse, rootAdminResponse] = await Promise.all([
    client.rpc("is_agent_for_event", {
      target_event_id: eventResponse.data.id,
    }),
    client.rpc("is_root_admin"),
  ]);

  if (agentResponse.error || rootAdminResponse.error) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  if (
    typeof agentResponse.data !== "boolean" ||
    typeof rootAdminResponse.data !== "boolean"
  ) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  if (agentResponse.data || rootAdminResponse.data) {
    return {
      eventCode: eventResponse.data.event_code,
      eventId: eventResponse.data.id,
      status: "authorized" as const,
    };
  }

  return {
    status: "role_gate" as const,
  };
}

/** Resolves one signed-in caller into authorized, role-gated, or transient-error redeem access. */
export async function authorizeRedeem(
  slug: string,
  options: AuthorizeRedeemOptions = {},
): Promise<RedeemAuthorizationResult> {
  const retryDelayMs = options.retryDelayMs ?? 2_000;

  try {
    return await attemptAuthorizeRedeem(slug);
  } catch {
    await wait(retryDelayMs);

    try {
      return await attemptAuthorizeRedeem(slug);
    } catch (error: unknown) {
      return {
        message: getErrorMessage(error),
        status: "transient_error",
      };
    }
  }
}
