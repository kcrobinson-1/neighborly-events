"use client";

import { useCallback } from "react";

import {
  AuthCallbackPage,
  type AuthCallbackPageProps,
} from "../../../../../../shared/auth";

export default function AuthCallbackRoute() {
  const onNavigate = useCallback<AuthCallbackPageProps["onNavigate"]>(
    (path) => {
      window.location.replace(path);
    },
    [],
  );

  return (
    <main className="auth-callback-shell">
      <AuthCallbackPage onNavigate={onNavigate} />
    </main>
  );
}
