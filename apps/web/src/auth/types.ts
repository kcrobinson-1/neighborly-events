import type { Session } from "@supabase/supabase-js";
import type { AppPath } from "../routes";

export type MagicLinkState = {
  message: string | null;
  status: "idle" | "error" | "pending" | "success";
};

export type AuthSessionState =
  | { message: string; status: "missing_config" }
  | { status: "loading" }
  | { status: "signed_out" }
  | { email: string | null; session: Session; status: "signed_in" };

/**
 * A subset of `AppPath` that is valid as a post-sign-in destination.
 * Transport-only routes like `/auth/callback` (added in Phase 2) are
 * excluded so the type system prevents callback self-loops in
 * `requestMagicLink` and `validateNextPath`.
 *
 * Each Phase B sub-phase that adds a new authenticated destination
 * must extend `AppPath` (for the router) and leave `AuthNextPath`
 * unchanged; the `Exclude` keeps the narrowing automatic.
 */
export type AuthNextPath = Exclude<AppPath, "/auth/callback">;
