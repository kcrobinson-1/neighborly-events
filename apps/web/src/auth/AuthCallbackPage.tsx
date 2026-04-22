import { useEffect, useRef, useState } from "react";
import { getAuthSession, subscribeToAuthState } from "../lib/authApi";
import { routes } from "../routes";
import type { AuthNextPath } from "./types";
import { validateNextPath } from "./validateNextPath";

export type AuthCallbackPageProps = {
  onNavigate: (
    path: AuthNextPath,
    options?: { replace?: boolean },
  ) => void;
};

const SESSION_WAIT_TIMEOUT_MS = 10_000;

/**
 * Role-neutral magic-link return handler.
 *
 * Mount ordering is load-bearing: we subscribe to auth state changes
 * before calling getAuthSession() so a SIGNED_IN event fired during
 * Supabase's URL-hash consumption is never dropped. A null result from
 * getAuthSession() does not end the wait — on a valid return the
 * initial getSession() can resolve null before the hash handler
 * finishes, and SIGNED_IN arrives moments later. Only a non-null
 * session from either source, or the 10s timeout, ends the wait.
 *
 * Navigation is a single mechanism: one onNavigate(next, { replace:
 * true }) call that collapses /auth/callback?next=... into the
 * destination in the history stack. The component never touches
 * window.history directly.
 */
export function AuthCallbackPage({ onNavigate }: AuthCallbackPageProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    const validatedNext = validateNextPath(
      new URLSearchParams(window.location.search).get("next"),
    );

    let isCancelled = false;

    const navigateOnce = () => {
      if (isCancelled || hasNavigatedRef.current) {
        return;
      }
      hasNavigatedRef.current = true;
      onNavigate(validatedNext, { replace: true });
    };

    const unsubscribe = subscribeToAuthState((session) => {
      if (session) {
        navigateOnce();
      }
    });

    void getAuthSession()
      .then((session) => {
        if (session) {
          navigateOnce();
        }
      })
      .catch(() => {
        // Session restoration failure falls through to the timeout guard;
        // the neutral timeout state is the user-visible failure surface.
      });

    const timeoutId = window.setTimeout(() => {
      if (isCancelled || hasNavigatedRef.current) {
        return;
      }
      setHasTimedOut(true);
    }, SESSION_WAIT_TIMEOUT_MS);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [onNavigate]);

  if (hasTimedOut) {
    return (
      <div className="signin-stack">
        <div className="section-heading">
          <p className="eyebrow">Sign-in link</p>
          <h2>We couldn&apos;t use this sign-in link.</h2>
        </div>
        <p>
          The link may have expired or already been used. Head back home to
          request a fresh one.
        </p>
        <button
          className="primary-button"
          onClick={() => onNavigate(routes.home, { replace: true })}
          type="button"
        >
          Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="signin-stack">
      <div className="section-heading">
        <h2>Signing you in…</h2>
      </div>
    </div>
  );
}
