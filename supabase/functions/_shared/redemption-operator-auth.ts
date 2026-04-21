import { createClient } from "jsr:@supabase/supabase-js@2.101.1";

export type RedemptionOperatorAuthResult =
  | {
    status: "ok";
    token: string;
    userId: string;
  }
  | {
    error: string;
    status: "unauthenticated";
  };

function readBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(/\s+/, 2);

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

/** Verifies that the request carries a real Supabase Auth bearer token. */
export async function authenticateRedemptionOperator(
  request: Request,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<RedemptionOperatorAuthResult> {
  const token = readBearerToken(request);

  if (!token) {
    return {
      error: "Operator authentication is required.",
      status: "unauthenticated",
    };
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
  const { data, error } = await serviceClient.auth.getUser(token);

  if (error || !data.user) {
    return {
      error: "Operator authentication is invalid.",
      status: "unauthenticated",
    };
  }

  return {
    status: "ok",
    token,
    userId: data.user.id,
  };
}
