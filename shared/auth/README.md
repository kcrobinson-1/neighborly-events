# `shared/auth/`

Env-agnostic Supabase Auth surface shared across `apps/web` and
`apps/site`.

## What this module owns

- `configureSharedAuth({ getClient, getConfigStatus })` — the
  one-time startup hook each app calls to register its env-derived
  providers. Apps must call this before any other shared/auth/
  symbol is consumed.
- `getAuthSession`, `subscribeToAuthState`, `requestMagicLink`,
  `signOut`, `getAccessToken` — the role-neutral auth API.
- `useAuthSession()` — the role-neutral React hook that restores
  and subscribes to the browser auth session and surfaces a
  `missing_config` state when the app cannot wire a client at all.
- `AuthCallbackPage` — the magic-link return handler with the
  load-bearing subscribe-before-getSession ordering and 10s timeout
  guard.
- `SignInForm` — the role-neutral magic-link request form.
- `AuthSessionState`, `MagicLinkState`, `SharedAuthProviders`,
  `SharedAuthConfigStatus`, `SignInFormCopy`, `SignInFormProps`,
  `AuthCallbackPageProps` — the shared types.

## What stays in per-app adapters

- Env reading (`import.meta.env.*` for Vite,
  `process.env.*`/`NEXT_PUBLIC_*` for Next.js).
- The Supabase client singleton (apps/web) or per-request lifecycle
  (apps/site server components).
- The `configureSharedAuth` invocation, providing the per-app
  `getClient` and `getConfigStatus`.
- Framework-coupled gates: prototype-fallback flags,
  missing-config copy keyed off `import.meta.env.DEV`, etc.

The current adapter is
[`apps/web/src/lib/authApi.ts`](../../apps/web/src/lib/authApi.ts),
which calls `configureSharedAuth` at module-init and re-exports the
shared API surface so existing call sites keep importing from
`apps/web/src/lib/authApi`. The apps/web component, hook, and
type re-exports live at
[`apps/web/src/auth/index.ts`](../../apps/web/src/auth/index.ts).
The `apps/site` adapter lands in M2 phase 2.3.

## React DI mechanism

The shared API, hook, and components read the configured providers
through `readSharedAuthProviders()`. Module-level configuration was
chosen over props-based or context-based DI because it minimizes
existing-test-mock disruption: tests can either mock the api/hook
modules directly (today's pattern, with a path swap to
`shared/auth/`) or call `configureSharedAuth` in a `beforeEach`
with mock providers. A `_resetSharedAuthForTests()` helper exists
for tests that need a clean slate between cases.

The cost is hidden global state at startup. It is mitigated by
each app calling `configureSharedAuth` exactly once, in a single
startup module, before any call site reads — apps/web does this
inside `apps/web/src/lib/authApi.ts` at module-init.

## Plan reference

[`docs/plans/shared-auth-foundation.md`](../../docs/plans/shared-auth-foundation.md).
