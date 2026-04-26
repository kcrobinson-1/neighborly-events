/**
 * apps/web re-export module for the role-neutral `shared/auth/` API.
 *
 * This module holds no logic of its own — it exists so existing apps/web
 * call sites can keep importing `getAccessToken`, `getAuthSession`,
 * `requestMagicLink`, `signOut`, and `subscribeToAuthState` from a
 * stable apps/web path while the underlying implementation lives in
 * `shared/auth/`. The `configureSharedAuth` side-effect that wires
 * apps/web's Supabase client and config-status providers lives in
 * [`./setupAuth`](./setupAuth.ts) and is invoked exactly once at
 * startup from `apps/web/src/main.tsx`.
 */

export {
  getAccessToken,
  getAuthSession,
  requestMagicLink,
  signOut,
  subscribeToAuthState,
} from "../../../../shared/auth";
