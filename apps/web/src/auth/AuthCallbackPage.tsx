import { useEffect } from "react";
import { routes } from "../routes";
import type { AuthNextPath } from "./types";

export type AuthCallbackPageProps = {
  onNavigate: (
    path: AuthNextPath,
    options?: { replace?: boolean },
  ) => void;
};

/**
 * Stub placeholder for the role-neutral magic-link return handler.
 * Commit 2 replaces this with the real session-establishment sequence
 * (subscribe → getAuthSession → wait for non-null → navigate). Today
 * it collapses the transport URL to home so the route wiring in
 * commit 1 is a safe no-op if production ever loads it before the
 * follow-up commit lands.
 */
export function AuthCallbackPage({ onNavigate }: AuthCallbackPageProps) {
  useEffect(() => {
    onNavigate(routes.home, { replace: true });
  }, [onNavigate]);

  return (
    <div className="signin-stack">
      <h2>Signing you in…</h2>
    </div>
  );
}
