import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { getAuthSession, subscribeToAuthState } from "../lib/authApi";
import {
  getMissingSupabaseConfigMessage,
  getSupabaseConfig,
} from "../lib/supabaseBrowser";
import type { AuthSessionState } from "./types";

function mapSessionState(session: Session | null): AuthSessionState {
  if (!session) {
    return { status: "signed_out" };
  }

  return {
    email: session.user.email ?? null,
    session,
    status: "signed_in",
  };
}

/** Restores and subscribes to the browser auth session for any role-neutral surface. */
export function useAuthSession(): AuthSessionState {
  const [state, setState] = useState<AuthSessionState>(() => {
    if (!getSupabaseConfig().enabled) {
      return {
        message: getMissingSupabaseConfigMessage(),
        status: "missing_config",
      };
    }

    return { status: "loading" };
  });

  useEffect(() => {
    if (!getSupabaseConfig().enabled) {
      return;
    }

    let isCancelled = false;

    void getAuthSession()
      .then((session) => {
        if (!isCancelled) {
          setState(mapSessionState(session));
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setState(
            error instanceof Error
              ? {
                  message: error.message,
                  status: "missing_config",
                }
              : {
                  message: "We couldn't restore your session right now.",
                  status: "missing_config",
                },
          );
        }
      });

    const unsubscribe = subscribeToAuthState((session) => {
      if (!isCancelled) {
        setState(mapSessionState(session));
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
