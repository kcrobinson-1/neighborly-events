import { useEffect, useState } from "react";
import { readSharedAuthProviders } from "./configure";

/**
 * Per-event organizer-or-admin authorization hook. Resolves the slug to
 * an event id, then runs `is_organizer_for_event` and `is_root_admin`
 * in parallel against the configured Supabase client. Either RPC
 * branch returning `true` collapses to the `authorized` state.
 *
 * Per-branch error semantics:
 *
 * - Either RPC branch returning a transport-level error → `transient_error`
 *   (one automatic retry, then a user-visible `retry` callback).
 * - Either RPC branch returning a non-boolean payload → `transient_error`
 *   (treated as a wire-format failure, not silently coerced).
 * - Both branches returning `false` → `role_gate` (signed-in but not
 *   assigned to this event).
 *
 * Slug-leaking cases — unknown slug, hard-deleted event, missing
 * `auth.users` row — collapse to the same `role_gate` so an attacker
 * cannot enumerate event existence by URL.
 *
 * Mirrors the [`authorizeRedemptions.ts`](../../apps/web/src/redemptions/authorizeRedemptions.ts)
 * / [`authorizeRedeem.ts`](../../apps/web/src/redeem/authorizeRedeem.ts)
 * precedent so reviewer attention does not relitigate the shape.
 *
 * Browser-only — depends on `shared/auth/`'s configured Supabase
 * client; assumes the caller renders the hook only when
 * `useAuthSession` reports `signed_in`.
 */

const DEFAULT_TRANSIENT_MESSAGE = "Please retry once your connection is stable.";
const DEFAULT_RETRY_DELAY_MS = 2_000;

export type UseOrganizerForEventState =
  | { status: "loading" }
  | { eventCode: string; eventId: string; status: "authorized" }
  | { status: "role_gate" }
  | { message: string; retry: () => void; status: "transient_error" };

type UseOrganizerForEventOptions = {
  retryDelayMs?: number;
};

type EventLookupRow = {
  id: string;
  event_code: string;
};

function isEventCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

async function attemptAuthorize(
  slug: string,
): Promise<
  | { eventCode: string; eventId: string; status: "authorized" }
  | { status: "role_gate" }
> {
  const client = readSharedAuthProviders().getClient();
  const eventResponse = await client
    .from("game_events")
    .select("id,event_code")
    .eq("slug", slug)
    .maybeSingle<EventLookupRow>();

  if (eventResponse.error) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  if (!eventResponse.data) {
    return { status: "role_gate" };
  }

  if (!isEventCode(eventResponse.data.event_code)) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  const [organizerResponse, rootAdminResponse] = await Promise.all([
    client.rpc("is_organizer_for_event", {
      target_event_id: eventResponse.data.id,
    }),
    client.rpc("is_root_admin"),
  ]);

  if (organizerResponse.error || rootAdminResponse.error) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  if (
    typeof organizerResponse.data !== "boolean" ||
    typeof rootAdminResponse.data !== "boolean"
  ) {
    throw new Error(DEFAULT_TRANSIENT_MESSAGE);
  }

  if (organizerResponse.data || rootAdminResponse.data) {
    return {
      eventCode: eventResponse.data.event_code,
      eventId: eventResponse.data.id,
      status: "authorized",
    };
  }

  return { status: "role_gate" };
}

/**
 * React hook resolving a slug into one organizer-or-admin authorization
 * outcome. See module JSDoc for the per-branch error contract.
 */
export function useOrganizerForEvent(
  slug: string,
  options: UseOrganizerForEventOptions = {},
): UseOrganizerForEventState {
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const [state, setState] = useState<UseOrganizerForEventState>({
    status: "loading",
  });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;

    setState({ status: "loading" });

    const runWithRetry = async () => {
      try {
        const result = await attemptAuthorize(slug);
        if (!isCancelled) {
          setState(result);
        }
      } catch {
        if (isCancelled) {
          return;
        }
        retryTimeoutId = setTimeout(() => {
          retryTimeoutId = null;
          if (isCancelled) {
            return;
          }
          void attemptAuthorize(slug)
            .then((result) => {
              if (!isCancelled) {
                setState(result);
              }
            })
            .catch((error: unknown) => {
              if (isCancelled) {
                return;
              }
              setState({
                message:
                  error instanceof Error ? error.message : DEFAULT_TRANSIENT_MESSAGE,
                retry: () => setReloadToken((value) => value + 1),
                status: "transient_error",
              });
            });
        }, retryDelayMs);
      }
    };

    void runWithRetry();

    return () => {
      isCancelled = true;
      if (retryTimeoutId !== null) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
    };
  }, [reloadToken, retryDelayMs, slug]);

  return state;
}
