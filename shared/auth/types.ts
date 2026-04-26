import type { Session } from "@supabase/supabase-js";

export type MagicLinkState = {
  message: string | null;
  status: "idle" | "error" | "pending" | "success";
};

export type AuthSessionState =
  | { message: string; status: "missing_config" }
  | { status: "loading" }
  | { status: "signed_out" }
  | { email: string | null; session: Session; status: "signed_in" };
