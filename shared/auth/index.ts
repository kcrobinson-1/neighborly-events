/**
 * Public shared/auth entrypoint consumed by per-app auth adapters.
 *
 * `shared/auth/` owns the role-neutral Supabase Auth surface — the
 * session-restore primitives, the magic-link request and callback
 * flow, the in-place sign-in form, and the associated types — that
 * apps/web (today) and apps/site (after M2 phase 2.3) consume through
 * their per-app adapters. Per the parent epic's "Env access stays at
 * the app boundary" invariant, this module never reads
 * `import.meta.env.*` or `process.env.*`; each app supplies its
 * env-derived providers once at startup via `configureSharedAuth`.
 */

export {
  configureSharedAuth,
  readSharedAuthProviders,
  type SharedAuthConfigStatus,
  type SharedAuthProviders,
} from "./configure.ts";
export {
  getAccessToken,
  getAuthSession,
  requestMagicLink,
  signOut,
  subscribeToAuthState,
} from "./api.ts";
export { useAuthSession } from "./useAuthSession.ts";
export {
  useOrganizerForEvent,
  type UseOrganizerForEventState,
} from "./useOrganizerForEvent.ts";
export {
  AuthCallbackPage,
  type AuthCallbackPageProps,
} from "./AuthCallbackPage.tsx";
export {
  SignInForm,
  type SignInFormCopy,
  type SignInFormProps,
} from "./SignInForm.tsx";
export type { AuthSessionState, MagicLinkState } from "./types.ts";
