import type { Session } from "@supabase/supabase-js";
import { routes, type AuthNextPath } from "../urls";
import { readSharedAuthProviders } from "./configure";

/**
 * Role-neutral Supabase Auth helpers shared across every authenticated
 * surface in apps/web (today) and apps/site (after M2 phase 2.3). The
 * helpers read the configured Supabase client through
 * `readSharedAuthProviders` rather than holding a singleton themselves;
 * each app's per-app adapter wires the provider once at startup.
 */

/** Restores the current browser auth session. */
export async function getAuthSession(): Promise<Session | null> {
  const client = readSharedAuthProviders().getClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error("We couldn't restore your session right now.");
  }

  return data.session;
}

/** Subscribes to browser auth state changes. */
export function subscribeToAuthState(
  onSessionChange: (session: Session | null) => void,
): () => void {
  const client = readSharedAuthProviders().getClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    onSessionChange(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

/** Requests a Supabase magic-link sign-in email. */
export async function requestMagicLink(
  email: string,
  options: { next: AuthNextPath },
): Promise<void> {
  const client = readSharedAuthProviders().getClient();
  const emailRedirectTo = new URL(
    `${routes.authCallback}?next=${encodeURIComponent(options.next)}`,
    window.location.origin,
  ).toString();

  const { error } = await client.auth.signInWithOtp({
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
  const client = readSharedAuthProviders().getClient();
  const { error } = await client.auth.signOut();

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
