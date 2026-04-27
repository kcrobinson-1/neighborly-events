import { createClient } from "jsr:@supabase/supabase-js@2.101.1";

import type { AdminAuthResult } from "./admin-auth.ts";

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

/**
 * Verifies the caller's Supabase Auth JWT and authorizes them as either an
 * organizer for the named event or a root admin. Mirrors the discriminated
 * union shape returned by `authenticateQuizAdmin` so binding modules can
 * surface 401 / 403 / 5xx through one path. Bearer-token reading is
 * duplicated rather than extracted from `admin-auth.ts` so the two helpers
 * stay independently auditable.
 */
export async function authenticateEventOrganizerOrAdmin(
  request: Request,
  eventId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
  supabaseClientKey: string,
): Promise<AdminAuthResult> {
  const token = readBearerToken(request);

  if (!token) {
    return {
      error: "Authentication is required to author this event.",
      status: "unauthenticated",
    };
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
  const { data: userData, error: userError } = await serviceClient.auth.getUser(
    token,
  );

  if (userError || !userData.user) {
    return {
      error: "Authentication is invalid.",
      status: "unauthenticated",
    };
  }

  // Use the caller's JWT for the authorization RPCs so the SQL helpers
  // evaluate the same request claims RLS uses.
  const userClient = createClient(supabaseUrl, supabaseClientKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Evaluate both branches of the organizer-or-admin predicate before
  // rejecting. Treat an RPC error on either branch as a non-positive signal
  // for that branch only — never as a hard deny — so a transient or
  // configuration error specific to is_organizer_for_event cannot incorrectly
  // forbid a root admin (and vice versa). The caller is admitted as soon as
  // either branch returns true; forbidden is returned only when both branches
  // return a definitive false or error without a positive signal.
  const { data: isOrganizer } = await userClient.rpc(
    "is_organizer_for_event",
    { target_event_id: eventId },
  );

  if (isOrganizer === true) {
    return {
      status: "ok",
      userId: userData.user.id,
    };
  }

  const { data: isRootAdmin } = await userClient.rpc("is_root_admin");

  if (isRootAdmin === true) {
    return {
      status: "ok",
      userId: userData.user.id,
    };
  }

  return {
    error: "This account is not authorized to author this event.",
    status: "forbidden",
  };
}
