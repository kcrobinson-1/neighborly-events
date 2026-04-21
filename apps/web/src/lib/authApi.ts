import type { Session } from "@supabase/supabase-js";
import type { AuthNextPath } from "../auth/types";
import { getBrowserSupabaseClient } from "./supabaseBrowser";

/**
 * Role-neutral Supabase Auth helpers shared across every authenticated
 * surface. The admin shell, future redemption routes, and any other
 * authenticated view consume these helpers rather than duplicating
 * Supabase client calls.
 */

/** Restores the current browser auth session. */
export async function getAuthSession(): Promise<Session | null> {
  const { data, error } = await getBrowserSupabaseClient().auth.getSession();

  if (error) {
    throw new Error("We couldn't restore your session right now.");
  }

  return data.session;
}

/** Subscribes to browser auth state changes. */
export function subscribeToAuthState(
  onSessionChange: (session: Session | null) => void,
): () => void {
  const { data } = getBrowserSupabaseClient().auth.onAuthStateChange(
    (_event, session) => {
      onSessionChange(session);
    },
  );

  return () => {
    data.subscription.unsubscribe();
  };
}

/** Requests a Supabase magic-link sign-in email. */
export async function requestMagicLink(
  email: string,
  options: { next: AuthNextPath },
): Promise<void> {
  const emailRedirectTo = new URL(
    `/auth/callback?next=${encodeURIComponent(options.next)}`,
    window.location.origin,
  ).toString();

  const { error } = await getBrowserSupabaseClient().auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    throw new Error(error.message || "We couldn't send the sign-in link.");
  }
}

/** Signs the current browser session out. */
export async function signOut(): Promise<void> {
  const { error } = await getBrowserSupabaseClient().auth.signOut();

  if (error) {
    throw new Error("We couldn't sign out right now.");
  }
}

/** Returns the current session's access token, or throws when signed out. */
export async function getAccessToken(): Promise<string> {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error("Sign-in is required.");
  }

  return session.access_token;
}
