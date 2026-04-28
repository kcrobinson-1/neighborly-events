/**
 * apps/web re-export barrel for the shared/auth/ component, hook,
 * and type surface. Pure re-export — no side-effects. The
 * `configureSharedAuth` side-effect that wires apps/web's providers
 * lives in [`../lib/setupAuth`](../lib/setupAuth.ts) and runs once
 * at startup from `apps/web/src/main.tsx`.
 */
export {
  AuthCallbackPage,
  SignInForm,
  useAuthSession,
  useOrganizerForEvent,
  type AuthCallbackPageProps,
  type AuthSessionState,
  type MagicLinkState,
  type SignInFormCopy,
  type SignInFormProps,
  type UseOrganizerForEventState,
} from "../../../../shared/auth";
