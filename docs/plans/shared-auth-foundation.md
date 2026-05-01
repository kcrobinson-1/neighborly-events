# `shared/auth/` Foundation Extraction

## Status

Landed.

**Parent epic:** [`event-platform-epic.md`](/docs/plans/event-platform-epic.md),
Milestone M1, Phase 1.3. The epic's M1 row stays `Proposed` until every
phase 1.x plan flips to `Landed`. Sibling phases:
[`shared-db-foundation.md`](/docs/plans/shared-db-foundation.md) (1.1, Landed),
[`shared-urls-foundation.md`](/docs/plans/shared-urls-foundation.md) (1.2,
Landed), 1.4 `shared/events/`, 1.5 `shared/styles/` — each owns its
own plan.

This plan flips to `Landed` after both subphases below land. Each
subphase is its own PR; each subphase's status row inside this plan
flips when its PR merges. Same two-subphase pattern phase 1.1 used,
for the same reason: the two deliverables have different risk
profiles. Subphase 1.3.1 is a behavior-preserving extraction across
the apps/web auth surface; subphase 1.3.2 is a session-storage
migration verified against production. Reviewers walk those surfaces
with different attention; bundling them dilutes both.

| Subphase | Scope | Status |
| --- | --- | --- |
| 1.3.1 | `shared/auth/` extraction (behavior-preserving, localStorage stays) | Landed |
| 1.3.2 | `@supabase/ssr` cookie adapter, apps/site presence-check readout, production cookie-boundary verification | Landed |

This plan inherits the **production cookie-boundary verification gate**
originally scoped to M0 phase 0.3. See
[`site-scaffold-and-routing.md`](/docs/plans/site-scaffold-and-routing.md)
"Verification Evidence" for why that gate was deferred. The gate is
the readiness criterion for subphase 1.3.2 only; subphase 1.3.1 has no
production-verification dependency.

## Goal

Stand up `shared/auth/` as the canonical home for the role-neutral
Supabase Auth surface — the API, the session-restore hook, the
magic-link callback page, the in-place sign-in form, and the
associated types — that today live in
[`apps/web/src/lib/authApi.ts`](/apps/web/src/lib/authApi.ts) and
[`apps/web/src/auth/`](/apps/web/src/auth). After this phase
lands, no app holds a duplicate Supabase Auth wrapper or duplicate
session-state primitive. `apps/web` (today) and `apps/site` (in M2)
consume the same module.

In the same phase, migrate Supabase Auth's session storage from
browser `localStorage` to a frontend-origin cookie via
[`@supabase/ssr`](https://github.com/supabase/ssr)'s
`createBrowserClient`. The cookie is set on the `apps/web` frontend
domain and is visible to `apps/site` server-rendered routes through
Vercel's proxy-rewrite. Verify the cookie boundary on production.

Behavior-preserving for `apps/web` user-facing flows in 1.3.1.
Storage-mechanism change in 1.3.2 with one deliberate user-visible
consequence: existing `localStorage` sessions become unreadable, so
currently-signed-in admins re-sign-in once via the existing
in-place magic-link shell.

## Cross-Cutting Invariants

These rules thread through every diff line in every subphase.
Self-review walks each one against every changed file in every PR,
not only the file that first triggered the rule.

- **Auth integration through `shared/auth/`.** The only legal way
  to acquire a Supabase session, resolve a viewer's role, or
  initiate sign-in is through `shared/auth/`. No app instantiates
  its own Supabase Auth wrapper; no app duplicates session-restore
  or magic-link logic. (Parent epic invariant; this phase makes it
  enforceable.)
- **Env access stays at the app boundary.** `shared/auth/` never
  reads `import.meta.env.*` or `process.env.*` directly. Each app
  supplies its env-derived client and config-status to the shared
  surface through a per-app adapter. Same precedent as
  [`shared/db/`](/shared/db).
- **No new framework-specific dependencies inside `shared/auth/`.**
  Anything imported from `shared/auth/` must be Vite-safe **and**
  Next.js-safe. No Vite-only globals, no Next.js-only imports, no
  `"use client"` directives. The React components and hooks in
  `shared/auth/` are framework-agnostic React, not coupled to
  either bundler.
- **Cookie storage replaces `localStorage` in 1.3.2.** Once the
  `@supabase/ssr` cookie adapter lands, Supabase Auth tokens stop
  being written to `localStorage`. Existing `localStorage`
  sessions become unreadable; affected users (admins) re-sign-in
  once via the existing in-place magic-link shell. This is a
  deliberate one-time cost named explicitly in the subphase 1.3.2
  PR's User Behavior section.
- **Cookie attributes (1.3.2).** Auth cookies are written with
  `Path=/`, `SameSite=Lax`, `Secure` in production, and **no
  `Domain=` attribute** (host-only, scoped to the apps/web
  frontend domain). `HttpOnly` is impossible because apps/web is a
  SPA writing from JS; the auth token is JS-readable today via
  `localStorage`, so this is not a regression. The cookie name
  follows `@supabase/ssr`'s default
  (`sb-<project-ref>-auth-token`, chunked as
  `sb-<project-ref>-auth-token.0`, `.1` if needed for
  large JWTs).
- **Cookie boundary is proven, not assumed (1.3.2).** A
  documented production-verification procedure (in `docs/dev.md`)
  must run end-to-end against the real frontend-origin auth
  cookie before subphase 1.3.2's row flips `Landed`. Two-phase
  Plan-to-Landed per
  [`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
  Gate For Plans That Touch Production Smoke." Same pattern
  [`site-scaffold-and-routing.md`](/docs/plans/site-scaffold-and-routing.md)
  used.

## Decisions Resolved In This Plan

These resolve scoping questions raised during planning. They are
recorded here so reviewer attention does not relitigate them.

- **Cookie storage adapter: `@supabase/ssr`.** Adopted over a
  custom cookie storage adapter because `@supabase/ssr` handles
  JWT chunking (Supabase auth tokens routinely exceed the 4KB
  single-cookie limit), cross-tab refresh, and is the canonical
  Supabase pattern for cross-app cookie sharing. The bundle cost
  (~6KB gzipped) and one new pinned dependency are accepted. A
  custom adapter would reinvent `@supabase/ssr`'s chunking,
  refresh, and storage-shape compatibility for the cost of
  avoiding one dependency — the inversion of effort the
  AGENTS.md "don't reinvent" guidance flags.
- **Cookie name: `@supabase/ssr` default
  (`sb-<project-ref>-auth-token`).** Overriding the default name
  to `neighborly_*` was considered for naming-family consistency
  with the existing `neighborly_session` cookie and
  `x-neighborly-session` header (preserved per
  [`repo-rename.md`](/docs/plans/repo-rename.md)). Rejected: the default is
  a stable Supabase contract that `@supabase/ssr`'s
  `createServerClient` (used in M2 phase 2.3 and 2.4) reads by
  default, so overriding the name would force apps/site to know
  two name patterns instead of one for no operational benefit.
  The `neighborly_*` family stays reserved for the
  signed-by-edge-function game-session cookie, which is a
  different concern.
- **Cookie attributes per the cross-cutting invariant above.**
- **`apps/site` does not install `@supabase/ssr` in this phase.**
  The verification gate is presence-check, not session
  deserialization. apps/site reads the cookie name(s) via Next.js
  `cookies()` directly. `@supabase/ssr` lands in apps/site in M2
  phase 2.3 (auth-callback migration: needs `createServerClient`
  to exchange a magic-link code and write the session) and M2
  phase 2.4 (platform admin: needs `createServerClient` to gate
  server-side reads). Both M2 phases have real consumers;
  installing `@supabase/ssr` in apps/site in 1.3.2 with no
  consumer beyond a presence check would be speculative scope per
  AGENTS.md "don't add features beyond what the task requires."
- **Forced re-sign-in for currently-signed-in admins is
  accepted.** A `localStorage`-to-cookie session-migration shim
  was considered — read the existing `sb-<ref>-auth-token` from
  `localStorage` on first load, write it to the cookie, clear
  `localStorage`. Rejected: the affected user set is small (the
  root-admin team), the in-place magic-link shell handles
  re-sign-in cleanly, and a one-off shim is code that lives
  forever after solving a one-off problem.
- **React DI mechanism for `shared/auth/`: module-level
  configuration.** `shared/auth/` exports a `configureSharedAuth`
  function that apps call once at startup with their bound
  client-getter and config-status getter. The shared API,
  components, and hook read the configured providers internally.
  Rationale: minimizes existing-test-mock disruption (mocks of
  `apps/web`-side modules continue to work because the
  shared layer reads through getters), keeps call-site
  signatures stable, and matches the same module-level
  configuration shape the rest of the repo's shared layer uses.
  Cost: hidden global state at startup. Mitigated by configuring
  exactly once per app, in a single startup file, before any
  call site reads.

## Subphase 1.3.1 — `shared/auth/` Extraction

**Status:** Landed.

### Implementation Notes

These record where the as-built shape differs from or extends the
contract above. The contract is otherwise honored verbatim.

- **`configureSharedAuth` lives in a dedicated startup module, not
  inside the apps/web binding.** apps/web's `configureSharedAuth`
  side-effect lives in
  [`apps/web/src/lib/setupAuth.ts`](/apps/web/src/lib/setupAuth.ts),
  imported once for side-effect by
  [`apps/web/src/main.tsx`](/apps/web/src/main.tsx). The plan's
  Responsibility Split named eager configuration inside
  [`apps/web/src/lib/authApi.ts`](/apps/web/src/lib/authApi.ts)
  as the recommended starting point but explicitly allowed a
  dedicated startup module. The dedicated module was chosen because
  the eager-inside-authApi shape made authApi.ts import
  `getBrowserSupabaseClient` from `supabaseBrowser`, which broke
  vitest tests that partially mock `supabaseBrowser` (mock-export
  validation rejected the unmocked imports). With configure isolated
  in `setupAuth.ts`, `apps/web/src/lib/authApi.ts` becomes a pure
  re-export module with no `supabaseBrowser` import, and tests that
  don't load `setupAuth.ts` simply don't trigger the configure side
  effect — they either mock `shared/auth/api` directly or call
  `configureSharedAuth` themselves with mock providers.
- **Vitest gains `esbuild: { jsx: "automatic" }`.**
  [`vitest.config.ts`](/vitest.config.ts) gains an explicit
  esbuild JSX option so `.tsx` files in `shared/auth/` transform
  with the automatic JSX runtime, matching the `jsx: "react-jsx"`
  setting apps/web's tsconfig already declares. apps/web's tsconfig
  include glob covers only `shared/**/*.ts` (not `.tsx`), so
  shared-side React components were transforming with the classic
  runtime under vitest before this change.
- **Test mock-path updates extend beyond the two named files.** In
  addition to moving
  [`tests/web/lib/authApi.test.ts`](/tests/web/lib) and
  [`tests/web/auth/AuthCallbackPage.test.tsx`](/tests/web/auth) to
  [`tests/shared/auth/`](/tests/shared/auth), four additional
  test files were updated to point their `vi.mock` paths at the new
  `shared/auth/` modules:
  [`tests/web/pages/AdminPage.test.tsx`](/tests/web/pages/AdminPage.test.tsx),
  [`tests/web/pages/EventRedemptionsPage.test.tsx`](/tests/web/pages/EventRedemptionsPage.test.tsx),
  [`tests/web/pages/EventRedeemPage.test.tsx`](/tests/web/pages/EventRedeemPage.test.tsx),
  and
  [`tests/web/redemptions/useReverseRedemption.test.ts`](/tests/web/redemptions/useReverseRedemption.test.ts) —
  each moved its mock from `apps/web/src/auth/useAuthSession.ts`
  and/or `apps/web/src/lib/authApi.ts` to the corresponding
  `shared/auth/` path.
  [`tests/web/lib/adminGameApi.test.ts`](/tests/web/lib/adminGameApi.test.ts)
  was tightened to call `configureSharedAuth` in its `beforeEach`,
  wiring the existing `mockGetBrowserSupabaseClient` as the shared
  client-getter so adminGameApi's `getAccessToken` calls resolve
  through the same mock the test already controlled. None of these
  changes alter assertion bodies; only mock paths and one
  setup-block addition.
- **`shared/auth/configure.ts` exports `_resetSharedAuthForTests`.**
  A test-only helper that clears the configured providers, used by
  `tests/shared/auth/api.test.ts` to test the
  "thrown-when-not-configured" guardrail. Not part of the public
  surface; named with the `_` prefix to flag intent.

### Subphase goal

Move the role-neutral Supabase Auth surface from
[`apps/web/src/auth/`](/apps/web/src/auth) and
[`apps/web/src/lib/authApi.ts`](/apps/web/src/lib/authApi.ts)
into `shared/auth/`, with the per-app adapter pattern matching
[`shared/db/`](/shared/db) and
[`shared/urls/`](/shared/urls). Migrate every existing
apps/web consumer. Behavior-preserving: storage stays as
`localStorage` in 1.3.1; the cookie migration is 1.3.2's job.

### Responsibility split

- **`shared/auth/api.ts`** owns the role-neutral auth API:
  `getAuthSession`, `subscribeToAuthState`, `requestMagicLink`,
  `signOut`, `getAccessToken`. Each reads the Supabase client
  through the configured client-getter (see DI decision above).
  No env access; no React.
- **`shared/auth/useAuthSession.ts`** owns the role-neutral
  session-restore hook. Reads the configured client-getter for
  session restore/subscribe and the configured config-status
  getter for the `missing_config` discriminant of
  `AuthSessionState`. Returns `AuthSessionState`.
- **`shared/auth/AuthCallbackPage.tsx`** owns the magic-link
  return handler. The component takes its `onNavigate` callback
  as a prop (today's shape) and reads the configured client-getter
  internally for `getAuthSession` and `subscribeToAuthState`. The
  load-bearing mount-ordering invariant (subscribe before
  `getSession()`, terminal-failure path stops listening) is
  preserved verbatim.
- **`shared/auth/SignInForm.tsx`** owns the role-neutral
  presentational sign-in form. Verbatim move; already pure
  presentational with no auth-API or env coupling.
- **`shared/auth/types.ts`** owns `AuthSessionState` and
  `MagicLinkState`. Verbatim move. The `Session` re-export from
  `@supabase/supabase-js` stays.
- **`shared/auth/configure.ts`** owns the
  `configureSharedAuth({ getClient, getConfigStatus })` startup
  hook plus the module-level providers the rest of `shared/auth/`
  reads through. Single source of the configured state.
- **`shared/auth/index.ts`** is the public barrel. Re-exports
  `configureSharedAuth`, the API functions, `useAuthSession`,
  `AuthCallbackPage`, `AuthCallbackPageProps`, `SignInForm`,
  `SignInFormCopy`, `SignInFormProps`, `AuthSessionState`,
  `MagicLinkState`.
- **`shared/auth/README.md`** is the ownership note in the same
  shape as
  [`shared/db/README.md`](/shared/db/README.md) and
  [`shared/urls/README.md`](/shared/urls/README.md): what
  `shared/auth/` owns, the env-agnostic boundary, the
  `configureSharedAuth` startup contract, the per-app adapter
  pattern, and a link back to this plan.
- **apps/web per-app adapter
  ([`apps/web/src/lib/authApi.ts`](/apps/web/src/lib/authApi.ts)
  becomes the binding module).** The file narrows to: import the
  shared API + `configureSharedAuth`, call
  `configureSharedAuth({ getClient: getBrowserSupabaseClient,
  getConfigStatus })` from a startup-side import path, and
  re-export the shared API surface so existing call sites'
  imports continue to resolve unchanged. The choice between
  configuring inside this file (eager) or in a dedicated startup
  module is an implementer choice; eager configuration on first
  import is the simpler pattern and the recommended starting
  point.
- **apps/web call sites.** Existing imports of
  `getAuthSession`, `subscribeToAuthState`, `requestMagicLink`,
  `signOut`, `getAccessToken` from
  `apps/web/src/lib/authApi` continue to resolve unchanged
  through the apps/web binding module's re-exports. Imports of
  the components, hook, and types switch from
  `apps/web/src/auth/*` to a thin apps/web re-export module
  (`apps/web/src/auth/index.ts` or similar) that re-exports the
  shared symbols. The minimum-churn path is: keep the existing
  apps/web import paths, change the modules they resolve to.

### Tightening of the epic phase 1.3 paragraph

The epic phase 1.3 paragraph names `useOrganizerForEvent` and
`useIsRootAdmin` as role-resolution hooks to extract. The scoping
investigation surfaced that those hooks **do not exist** in
apps/web today — role resolution is via direct
`client.rpc("is_organizer_for_event", ...)`,
`client.rpc("is_root_admin")`, and `client.rpc("is_agent_for_event", ...)`
calls inside
[`apps/web/src/redemptions/authorizeRedemptions.ts`](/apps/web/src/redemptions/authorizeRedemptions.ts)
and
[`apps/web/src/redeem/authorizeRedeem.ts`](/apps/web/src/redeem/authorizeRedeem.ts).
Per AGENTS.md "don't add features beyond what the task requires,"
1.3.1 does not create new hook abstractions speculatively. The
hooks are created in the phases that have a real consumer — M2
phase 2.2 (per-event admin route shell) is the natural home for
`useOrganizerForEvent`. The epic phase 1.3 paragraph is tightened
in the same PR as 1.3.1 to clarify this.

The surface-specific authorization helpers
(`authorizeRedemptions`, `authorizeRedeem`) stay in apps/web in
1.3.1 — they bundle slug-to-event-row lookup with role checks, so
they're not role-neutral primitives. They may move to
[`shared/events/`](#) (M1 phase 1.4) or stay in apps/web; that
decision belongs to phase 1.4's plan, not this one.

### Files to touch — new

- `shared/auth/api.ts`
- `shared/auth/useAuthSession.ts`
- `shared/auth/AuthCallbackPage.tsx`
- `shared/auth/SignInForm.tsx`
- `shared/auth/types.ts`
- `shared/auth/configure.ts`
- `shared/auth/index.ts`
- `shared/auth/README.md`

### Files to touch — modify

- [`apps/web/src/lib/authApi.ts`](/apps/web/src/lib/authApi.ts) —
  narrows to the apps/web binding module: imports the shared API
  and `configureSharedAuth`, calls configure with apps/web's
  `getBrowserSupabaseClient` and a config-status getter that
  wraps `getSupabaseConfig` + `getMissingSupabaseConfigMessage`,
  re-exports the shared API surface so existing call sites are
  unaffected.
- [`apps/web/src/auth/AuthCallbackPage.tsx`](/apps/web/src/auth/AuthCallbackPage.tsx) —
  deleted (moved to `shared/auth/`).
- [`apps/web/src/auth/SignInForm.tsx`](/apps/web/src/auth/SignInForm.tsx) —
  deleted (moved to `shared/auth/`).
- [`apps/web/src/auth/useAuthSession.ts`](/apps/web/src/auth/useAuthSession.ts) —
  deleted (moved to `shared/auth/`, with config-status read
  through the configured getter).
- [`apps/web/src/auth/types.ts`](/apps/web/src/auth/types.ts) —
  deleted (moved to `shared/auth/`).
- New `apps/web/src/auth/index.ts` (or equivalent re-export
  module) — re-exports the shared components, hook, and types so
  existing apps/web call sites can keep importing from
  `apps/web/src/auth/*` without churn.
- The apps/web call sites enumerated by the scoping investigation
  ([`AdminPageShell`](/apps/web/src/admin/AdminPageShell.tsx),
  [`AdminDashboardContent`](/apps/web/src/admin/AdminDashboardContent.tsx),
  [`useAdminDashboard`](/apps/web/src/admin/useAdminDashboard.ts),
  [`AdminPage`](/apps/web/src/pages/AdminPage.tsx), and any
  router entry that mounts the auth-callback route) — verify
  imports still resolve through the apps/web re-export module;
  no logic changes.
- [`tests/web/auth/AuthCallbackPage.test.tsx`](/tests/web/auth/AuthCallbackPage.test.tsx) —
  moved to `tests/shared/auth/AuthCallbackPage.test.tsx`. Mock
  paths update from
  `vi.mock("../../../apps/web/src/lib/authApi.ts", ...)` to
  `vi.mock("../../../shared/auth/configure", ...)` (or
  equivalent — the implementer picks the mock seam matching the
  module-level configuration pattern). Test bodies stay intact;
  the assertions about session-resolve and timeout behavior do
  not change.
- [`tests/web/lib/authApi.test.ts`](/tests/web/lib/authApi.test.ts) —
  moved to `tests/shared/auth/api.test.ts`. Same mock-path
  treatment. Test bodies stay intact.
- [`docs/architecture.md`](/docs/architecture.md) — add the
  `shared/auth/` shared-layer bullet describing the auth surface,
  the env-agnostic boundary, and the per-app adapter pattern.
  Mirrors the bullets added in phases 1.1 and 1.2.
- [`docs/dev.md`](/docs/dev.md) — add a contributor note that
  Supabase Auth code goes through `shared/auth/` consumed via the
  per-app adapter, not directly. No new validation command in
  1.3.1.
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  phase 1.3 paragraph tightened on three points: (1) name
  subphases 1.3.1 and 1.3.2 in place of "One PR"; (2) clarify
  that role-resolution hooks (`useOrganizerForEvent`,
  `useIsRootAdmin`) do not exist as hooks today and are created
  in the phases with a real consumer (M2 phase 2.2 for
  `useOrganizerForEvent`); (3) note that the cookie-adapter
  migration is the substantive 1.3.2 work and that subphase
  1.3.2 inherits the M0 phase 0.3 cookie-boundary verification
  gate. Update Sizing Summary line for M1 from `5 phases (phase
  1.1 and phase 1.5 each contain 2 subphases as separate PRs), 7
  PRs` to `5 phases (phase 1.1, phase 1.3, and phase 1.5 each
  contain 2 subphases as separate PRs), 8 PRs`. Update epic
  total from `20 phases, 21 PRs` to `20 phases, 22 PRs`. M1 row
  stays `Proposed`.
- This plan — flip subphase 1.3.1's row to `Landed` in the same
  PR. Plan-level Status stays `Proposed` until subphase 1.3.2
  also lands.

### Files intentionally not touched

- [`apps/web/src/redemptions/authorizeRedemptions.ts`](/apps/web/src/redemptions/authorizeRedemptions.ts)
  and
  [`apps/web/src/redeem/authorizeRedeem.ts`](/apps/web/src/redeem/authorizeRedeem.ts) —
  surface-specific authorization helpers (slug + event-code
  lookup bundled with role checks). Not role-neutral. Phase 1.4
  decides whether to move them.
- [`apps/web/src/admin/useAdminDashboard.ts`](/apps/web/src/admin/useAdminDashboard.ts) —
  apps/web admin-shell orchestration. Stays.
- [`apps/web/src/lib/supabaseBrowser.ts`](/apps/web/src/lib/supabaseBrowser.ts) —
  the apps/web Supabase client adapter. Stays exactly as
  phase 1.1.1 left it. Subphase 1.3.2 modifies the underlying
  factory in `shared/db/client.ts`, not this adapter.
- [`apps/site/`](/apps/site) — does not consume
  `shared/auth/` in 1.3.1. Subphase 1.3.2 wires the apps/site
  placeholder readout using native Next.js `cookies()`, not
  `shared/auth/`.
- [`supabase/functions/`](/supabase/functions) — server-side
  Deno auth concerns are a separate seam. Out of scope.
- E2E auth fixtures
  ([`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts),
  [`tests/e2e/redeem-auth-fixture.ts`](/tests/e2e/redeem-auth-fixture.ts),
  [`tests/e2e/redemptions-auth-fixture.ts`](/tests/e2e/redemptions-auth-fixture.ts)) —
  exercise auth flows end-to-end through the browser; the
  internal-import moves don't affect them. Validation step 7
  confirms.
- Runtime identifiers (`neighborly_session` cookie,
  `x-neighborly-session` header, `neighborly.local-*` storage
  keys, `@neighborly/web` workspace scope) — preserved per
  [`repo-rename.md`](/docs/plans/repo-rename.md).

### Execution steps

1. **Pre-edit gate.** Confirm clean worktree, on a feature branch
   (not `main`).
2. **Baseline validation.** Run `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`. All must pass before any edits.
3. **Create `shared/auth/`.** Add the eight new files per "Files
   to touch — new" with the responsibility split above.
   `configureSharedAuth` is the single entry point apps call at
   startup; the API functions, hook, and components read the
   configured providers internally.
4. **Narrow `apps/web/src/lib/authApi.ts` to the binding
   module.** Import the shared API and `configureSharedAuth`.
   Call configure with apps/web's `getBrowserSupabaseClient` and
   a config-status getter wrapping `getSupabaseConfig` and
   `getMissingSupabaseConfigMessage`. Re-export the shared API
   surface so existing call sites resolve unchanged.
5. **Add `apps/web/src/auth/index.ts` re-export module.**
   Re-exports the shared components (`AuthCallbackPage`,
   `SignInForm`), the hook (`useAuthSession`), and the types
   (`AuthSessionState`, `MagicLinkState`,
   `AuthCallbackPageProps`, `SignInFormCopy`, `SignInFormProps`)
   so existing apps/web call sites that import from
   `apps/web/src/auth/*` keep working.
6. **Delete the old apps/web auth files.** Remove
   `apps/web/src/auth/AuthCallbackPage.tsx`,
   `apps/web/src/auth/SignInForm.tsx`,
   `apps/web/src/auth/useAuthSession.ts`,
   `apps/web/src/auth/types.ts` in the same commit as the
   re-export module so apps/web call sites resolve at every
   intermediate state.
7. **Move tests.** Move
   `tests/web/auth/AuthCallbackPage.test.tsx` to
   `tests/shared/auth/AuthCallbackPage.test.tsx`. Move
   `tests/web/lib/authApi.test.ts` to
   `tests/shared/auth/api.test.ts`. Update mock paths to mock
   `shared/auth/configure` (or the configured-getter seam) so
   the existing test bodies resolve. Run
   `npm test -- AuthCallbackPage` and `npm test -- api` (or the
   moved file's discriminant); both must pass without rewriting
   assertion bodies.
8. **Documentation update.** Update
   [`docs/architecture.md`](/docs/architecture.md),
   [`docs/dev.md`](/docs/dev.md), the parent epic's phase 1.3
   paragraph and Sizing Summary line, and this plan's subphase
   1.3.1 status row. Doc currency is a PR gate per AGENTS.md.
9. **Repeat full validation.** `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`. All must pass.
10. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance. Confirm: no `import.meta.env` or
    `process.env` reference inside `shared/auth/`; no Vite-only or
    Next.js-only import inside `shared/auth/`; no `"use client"`
    directive in `shared/auth/`; the `configureSharedAuth` call
    happens exactly once on apps/web startup; the auth-callback
    component's load-bearing mount-ordering invariant
    (subscribe-before-getSession, terminal-failure stops listening)
    survives the move verbatim; the sign-in form's prop API is
    unchanged; every existing apps/web consumer's imports still
    resolve; no apps/site source touched.
11. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation step, and Self-Review audit named in
    this subphase. Confirm each is satisfied or explicitly
    deferred in this plan with rationale. Flip subphase 1.3.1's
    row to `Landed`. Plan-level Status stays `Proposed` until
    subphase 1.3.2 lands.
12. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](/.github/pull_request_template.md).
    Title under 70 chars. Validation section lists `npm run lint`,
    `npm test`, `npm run test:functions`, `npm run build:web`,
    `npm run build:site` — all run. Target Shape Evidence
    section names the responsibility split (env-agnostic
    `shared/auth/`, apps/web binding module) and references this
    plan. UX Review section is `N/A` (no user-visible behavior
    changes; storage mechanism and call sites are unchanged).
    User Behavior section is `Behavior-preserving`. Remaining
    Risk: the module-level `configureSharedAuth` pattern's
    test-mock surface change is the load-bearing concern;
    verified by the moved test files passing without rewriting
    assertions.

### Validation gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final. The
  build's strict TypeScript pass is the load-bearing check that
  the binding module's re-export shape preserves the existing
  apps/web call-site type contracts.
- `npm run build:site` — pass on baseline; pass on final (no
  apps/site source touched, but the build must still work).
- `npm test` — pass on baseline; pass on final. The moved
  `AuthCallbackPage` and `authApi` test surfaces specifically
  must continue to cover every path.
- `npm run test:functions` — pass on baseline; pass on final
  (no edge-function source touched).

### Self-review audits

Drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- **Rename-aware diff classification.** This subphase moves four
  files from `apps/web/src/auth/` and one file's contents from
  `apps/web/src/lib/authApi.ts` into `shared/auth/`, plus moves
  two test files from `tests/web/` into `tests/shared/auth/`.
  The diff must classify as rename-vs-edit so reviewers see
  content changes (the configure-pattern wiring of
  `configureSharedAuth`, the parameterization of
  `useAuthSession`'s config status, the binding-module
  re-export shape, the test mock-path updates), not move noise.
  Where a function or component moved verbatim, the PR
  description names that explicitly.
- **Effect cleanup audit.** The auth subscription primitive
  (`subscribeToAuthState`) and `AuthCallbackPage`'s effect with
  subscription + 10s timeout + `safeUnsubscribe` are relocated
  to `shared/auth/`. Cleanup paths
  (`return () => unsubscribe()`, `clearTimeout`, the
  `safeUnsubscribe` gate, the `isCancelled` guard against late
  resolutions, the `hasNavigatedRef` guard against double
  navigation) must remain intact. The mount-ordering invariant
  (subscribe before `getSession()`) is load-bearing and named
  explicitly in this audit.
- **Error-surfacing for user-initiated mutations.**
  `requestMagicLink`, `signOut`, and `getAccessToken` all throw
  on Supabase errors with specific user-facing messages. The
  factory + binding pattern must preserve these
  error-surfacing behaviors (callers see the same `Error.message`
  strings). The audit walks each error path explicitly.
- **CLI / tooling pinning audit.** No new CLI or framework
  dependency in 1.3.1. Named for completeness; nothing
  actionable.

## Subphase 1.3.2 — `@supabase/ssr` Cookie Adapter, apps/site Readout, Production Verification

**Status:** Landed.

### Implementation Notes

These record where the as-built shape differs from or extends the
contract above. The contract is otherwise honored verbatim.

- **`@supabase/ssr` pinned at `0.10.0`, not `0.10.2`.** The plan
  said the version "is picked at write-time for compatibility with
  `@supabase/supabase-js` `^2.101.1` already in the repo." The
  current `0.10.2` patch declares peer `@supabase/supabase-js`
  `^2.102.1`, which would force a transitive bump of supabase-js
  (the existing caret pin already in the repo allows it but the
  resolved version would silently shift). `0.10.0` declares peer
  `^2.100.1`, satisfied by the existing 2.101.1 resolution with no
  lockfile drift. Per AGENTS.md "Versioning And Dependency
  Discipline" — make sure resolved versions do not drift silently
  across environments — `0.10.0` was chosen.
- **Cookie attributes set explicitly: `path: "/"`, `sameSite: "lax"`,
  `secure: <protocol-derived>`.** Inspection of
  `@supabase/ssr@0.10.0`'s `DEFAULT_COOKIE_OPTIONS`
  ([`node_modules/@supabase/ssr/dist/module/utils/constants.js`](/node_modules/@supabase/ssr/dist/module/utils/constants.js))
  surfaced that the package does **not** auto-detect `Secure` — its
  defaults are `path: "/"`, `sameSite: "lax"`, `httpOnly: false`,
  `maxAge: 400 days` only. The plan invariant called for `Secure` in
  production. The factory therefore sets `secure` explicitly to
  `window.location.protocol === "https:"` (with a `typeof window`
  guard for non-browser contexts) so production https serves
  `Secure` cookies and local http dev does not silently refuse the
  write. `Domain=` is omitted so the cookie is host-only.
  `HttpOnly` is impossible from JS so it is not set. The `cookies`
  accessor parameter is left to the package default — per the
  createBrowserClient docstring, "in most cases you should not
  configure the `options.cookies` object, as this is automatically
  handled for you."
- **`createClient` from `@supabase/supabase-js` paired with
  `@supabase/ssr`'s deep-imported chunked cookie storage, NOT
  `createBrowserClient`.** The plan's original shape called for
  `createBrowserClient` from `@supabase/ssr` directly. Post-merge
  production smoke surfaced that
  [`createBrowserClient`](/node_modules/@supabase/ssr/dist/module/createBrowserClient.js)
  hardcodes `flowType: "pkce"` **after** spreading user
  `options.auth` (the option is unoverridable through the public
  API). PKCE is incompatible with the production admin smoke
  fixture, which uses
  `auth.admin.generateLink({ type: "magiclink" })` — admin-generated
  links have no client-side PKCE code-verifier, so when the user
  visits the action URL, Supabase's verify endpoint redirects with
  an implicit-style hash fragment and auth-js throws
  `AuthPKCEGrantCodeExchangeError("Not a valid PKCE flow url.")`.
  Both production smoke tests (denies-non-allowlisted and
  covers-save-publish-unpublish) failed at the post-magic-link
  navigation gate.

  The forward fix uses `@supabase/supabase-js`'s `createClient` with
  `flowType: "implicit"` explicitly, paired with `@supabase/ssr`'s
  internal `createStorageFromOptions` (deep imported from
  `@supabase/ssr/dist/module/cookies`) to keep the chunked-cookie
  format intact. The deep import is supported by `@supabase/ssr`'s
  package layout (no `exports` field gate) and the exact-pin on
  0.10.0 means the path is stable for this repo. The auth options
  the original shape implicitly inherited
  (`autoRefreshToken: true`, `detectSessionInUrl: true`,
  `persistSession: true`) are now passed explicitly because
  `createClient` does not set them by default the way
  `createBrowserClient` did. M2 phase 2.3 (auth-callback in
  apps/site) may revisit the flow choice if it adopts server-side
  PKCE exchange; the cookie format is independent of `flowType` so
  the storage stays compatible either way.
- **e2e fixtures unchanged.** A grep for `auth-token`,
  `localStorage`, and `persistSession` against `tests/e2e/` showed
  the only matches are service-role fixture clients with
  `persistSession: false` — they don't depend on the SPA's auth
  storage shape and need no update.
- **Stage 1 status flip recorded here.** Per the two-phase
  Plan-to-Landed pattern, the implementing PR merges with subphase
  1.3.2's row at `In progress pending prod smoke`. Stage 2 (a tiny
  doc-only follow-up after the post-deploy verification run) flips
  the row to `Landed` and the plan-level Status to `Landed`, and
  pastes the verification evidence into a `## Verification
  Evidence` subsection.

### Subphase goal

Migrate Supabase Auth's session storage from browser
`localStorage` to a frontend-origin cookie by replacing the
`createClient` call from `@supabase/supabase-js` with
`createBrowserClient` from `@supabase/ssr` inside
[`shared/db/client.ts`](/shared/db/client.ts). Replace the
[`apps/site` placeholder's deferral
notice](../../apps/site/app/event/[slug]/page.tsx) with a native
Next.js `cookies()` presence-check readout for the new auth
cookie. Verify the cookie boundary against production via Tier 5
production smoke. Two-phase Plan-to-Landed per
[`docs/testing-tiers.md`](/docs/testing-tiers.md).

### Responsibility split

- **[`shared/db/client.ts`](/shared/db/client.ts)** —
  `createBrowserSupabaseClient(config)` swaps the
  `@supabase/supabase-js` `createClient` call for
  `createBrowserClient` from `@supabase/ssr`. Function
  signature, return type (`SupabaseClient<Database>`), and
  config shape stay byte-identical — every existing call site,
  including `shared/auth/api.ts`'s configured client-getter,
  continues to work unchanged. Cookie attributes per the
  cross-cutting invariant are passed through `@supabase/ssr`'s
  `cookieOptions` parameter. The function is still env-agnostic;
  `shared/db/`'s rule that env access stays at the app boundary
  is unaffected.
- **[`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx)** —
  the `cookies()` call already wired by the M0 phase 0.3 +
  Stage 2 follow-up is repointed at the new auth cookie name.
  The deferral notice paragraph is replaced with a presence-only
  readout: "Auth cookie present" / "Auth cookie not present" —
  never the cookie value. The page stays a server component;
  no `"use client"` directive; no Supabase import.
- **apps/site cookie name resolution.** apps/site checks for any
  cookie matching the strict regex `^sb-[^-]+-auth-token(\.\d+)?$`
  via `cookies()`. The regex is intentionally narrow:
  `[^-]+` matches the project ref (no embedded hyphens), and
  the optional `\.\d+` suffix matches `@supabase/ssr`'s
  chunked-cookie pattern. Adopting an env var on apps/site
  (`NEXT_PUBLIC_SUPABASE_URL` to derive the project ref) was
  considered; rejected for this presence-only check because
  `^sb-[^-]+-auth-token` has no other source in this repo's
  cookie families and adding an apps/site env var for one
  verification gate is speculative. M2 phase 2.3 introduces
  apps/site's Supabase env wiring when it has a real consumer.
- **No changes to `shared/auth/`.** The cookie adapter swap is
  invisible at the auth-API level: `getAuthSession`,
  `subscribeToAuthState`, `requestMagicLink`, `signOut`,
  `getAccessToken` all continue to work as before. The change
  is the underlying token storage backend.

### Files to touch — new

None.

### Files to touch — modify

- [`apps/web/package.json`](/apps/web/package.json) — add
  `@supabase/ssr` as an exact-pinned dependency. The version
  pin is picked at write-time for compatibility with
  `@supabase/supabase-js` `^2.101.1` already in the repo. No
  caret, no tilde.
- [`package-lock.json`](/package-lock.json) — regenerated
  by `npm install` in the same commit.
- [`shared/db/client.ts`](/shared/db/client.ts) — swap
  `createClient` from `@supabase/supabase-js` for
  `createBrowserClient` from `@supabase/ssr`. Pass cookie
  options matching the cross-cutting invariant. Keep the
  function signature and return type identical.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx) —
  replace the deferral notice paragraph with the presence-check
  readout. Use the regex above against `cookies().getAll()`.
  Render presence-only ("present" / "not present") — never
  echo the cookie value.
- [`docs/dev.md`](/docs/dev.md) — replace the cookie-boundary
  verification procedure originally documented in M0 phase 0.3
  (which referenced the `neighborly_session` cookie) with the
  current procedure: sign in to apps/web on the production
  domain → confirm the `sb-<project-ref>-auth-token` cookie is
  set on the apps/web frontend origin → navigate to a
  `/event/:slug` route → confirm the apps/site placeholder
  reports "Auth cookie present." Document the
  `@supabase/ssr` cookie attributes (`Path=/`,
  `SameSite=Lax`, `Secure`, no `Domain=`, no `HttpOnly`) for
  contributor reference. Document that admins are forced to
  re-sign-in once when this PR deploys.
- [`docs/architecture.md`](/docs/architecture.md) — update the
  auth trust-boundary description: Supabase Auth session is
  stored in a frontend-origin cookie set by `@supabase/ssr`,
  visible to apps/site server-rendered routes through Vercel's
  proxy-rewrite. The earlier `localStorage` description is
  replaced, not appended.
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  strike the M1 phase 1.3 inheritance language pointing at the
  M0 phase 0.3 deferred verification (the gate has now run);
  flip subphase 1.3.2's row in this plan's status table to
  `In progress pending prod smoke` in Stage 1, then to
  `Landed` in Stage 2. The epic's M1 row stays `Proposed`
  pending phases 1.4 and 1.5.
- This plan — flip subphase 1.3.2's row to
  `In progress pending prod smoke` in the implementing PR's
  doc commit; flip plan-level Status from `Proposed` to
  `Landed` and subphase 1.3.2 from
  `In progress pending prod smoke` to `Landed` in the
  Stage 2 doc-only follow-up after the production smoke run is
  green. Paste the verification evidence into a new
  Verification Evidence subsection in this plan in Stage 2.

### Files intentionally not touched

- [`apps/site/package.json`](/apps/site/package.json) —
  does not gain `@supabase/ssr` in 1.3.2. Deferred to M2
  phase 2.3 (auth-callback migration) and M2 phase 2.4
  (platform admin), where it has real consumers.
- [`shared/auth/`](/shared/auth) — the cookie adapter
  swap is invisible at the auth-API level. No `shared/auth/`
  source change in 1.3.2.
- [`apps/web/src/lib/supabaseBrowser.ts`](/apps/web/src/lib/supabaseBrowser.ts) —
  the apps/web Supabase client adapter. Singleton lifecycle and
  env reading unchanged. The factory it calls now uses
  `@supabase/ssr` internally, but the adapter doesn't see the
  difference.
- [`docs/plans/site-scaffold-and-routing.md`](/docs/plans/site-scaffold-and-routing.md) —
  the M0 phase 0.3 plan stays as historical record. Its
  Verification Evidence subsection documents why the original
  `neighborly_session` gate was unworkable; that record is
  durable. The current verification status lives in this plan
  going forward.
- Edge functions
  ([`supabase/functions/_shared/session-cookie.ts`](/supabase/functions/_shared/session-cookie.ts) etc.)
  — the `neighborly_session` game-session cookie is a separate
  concern; edge functions still issue it from the Supabase
  origin and still validate it via the `x-neighborly-session`
  header. Out of scope.
- Runtime identifiers (`neighborly_session` cookie,
  `x-neighborly-session` header, `neighborly.local-*` storage
  keys, `@neighborly/web` workspace scope) — preserved per
  [`repo-rename.md`](/docs/plans/repo-rename.md).

### Execution steps

1. **Pre-edit gate.** Confirm clean worktree, on a feature branch
   (not `main`). Confirm subphase 1.3.1 has merged.
2. **Baseline validation.** `npm run lint`, `npm run build:web`,
   `npm run build:site`, `npm test`, `npm run test:functions`.
   All must pass.
3. **Add `@supabase/ssr`.** `npm install` `@supabase/ssr` at an
   exact-pinned version compatible with `@supabase/supabase-js`
   `^2.101.1`. Regenerate `package-lock.json` in the same
   commit. Confirm the CLI / tooling pinning audit (no caret,
   no tilde).
4. **Swap `shared/db/client.ts`.** Replace
   `createClient` with `createBrowserClient` from
   `@supabase/ssr`. Pass cookie options per the cross-cutting
   invariant. Run `npm run build:web` immediately to confirm
   the strict TypeScript pass still narrows
   `SupabaseClient<Database>` correctly.
5. **Local validation.** `npm test`, `npm run test:functions`,
   `npm run build:web`, `npm run build:site`. The shared/auth
   tests (moved into `tests/shared/auth/` in subphase 1.3.1)
   should pass without modification — the cookie adapter is
   invisible at the API level. If any test depended on
   Supabase's `localStorage` internals, fix the test.
6. **Update the apps/site placeholder.** Replace the deferral
   notice with the presence-check readout. The page stays a
   server component; no Supabase import. Run
   `npm run build:site` to confirm the route compiles.
7. **Local cookie sanity check.** Run `npm run dev:web` (or
   `npm run dev:web:local`) against a configured Supabase
   project, sign in via the in-place admin shell, and confirm
   browser DevTools shows the `sb-<project-ref>-auth-token`
   cookie on the apps/web frontend origin with `Path=/`,
   `SameSite=Lax`, `Secure` (if HTTPS), and no `Domain`
   attribute. Confirm `localStorage` does not gain a
   `sb-<ref>-auth-token` key. If chunking is triggered (large
   JWT), confirm the `.0`, `.1` siblings appear.
8. **E2E auth fixture verification.** Walk
   [`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts),
   [`tests/e2e/redeem-auth-fixture.ts`](/tests/e2e/redeem-auth-fixture.ts),
   [`tests/e2e/redemptions-auth-fixture.ts`](/tests/e2e/redemptions-auth-fixture.ts).
   Confirm the cookie-jar-based auth flow still works with the
   new cookie name. Update fixture cookie expectations if a
   fixture explicitly named the old `localStorage` key or
   asserted on cookie shape.
9. **Documentation update.** Update
   [`docs/dev.md`](/docs/dev.md) (new cookie-boundary verification
   procedure with the new cookie name and the cookie attributes
   reference; admin re-sign-in note),
   [`docs/architecture.md`](/docs/architecture.md) (auth trust
   boundary: cookie storage),
   [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md)
   (strike the M1 phase 1.3 inheritance language; mark
   subphase 1.3.2 row in this plan as
   `In progress pending prod smoke`), and this plan's subphase
   1.3.2 status row.
10. **Repeat full validation.** `npm run lint`,
    `npm run build:web`, `npm run build:site`, `npm test`,
    `npm run test:functions`. All must pass.
11. **Automated code-review feedback loop.** Walk the diff.
    Confirm: `@supabase/ssr` is exact-pinned in
    `apps/web/package.json` and `package-lock.json` is
    regenerated in the same commit; cookie attributes match
    the cross-cutting invariant exactly; no `Domain=`
    attribute is set; the apps/site readout is presence-only
    (no cookie value echoed); the apps/site placeholder no
    longer carries the M0 deferral notice; `docs/dev.md`
    cookie-boundary procedure points at the new cookie name;
    the existing `shared/auth/` tests still pass without
    modification; no `shared/auth/` source touched (the 1.3.1
    contract is preserved); no apps/site Supabase dependency
    added.
12. **Plan Status flip — Stage 1.** In the implementing PR's
    doc commit, flip this plan's subphase 1.3.2 row to
    `In progress pending prod smoke`. Plan-level Status stays
    `Proposed` pending Stage 2. M1 row in the parent epic
    stays `Proposed`.
13. **PR preparation.** Use the PR template. Title under 70
    chars. Validation section lists all five commands run.
    User Behavior section names: "Currently-signed-in admins
    are forced to re-sign-in once via the existing in-place
    magic-link shell. Subsequent sessions persist via cookies
    instead of localStorage; user-visible flow is otherwise
    unchanged." UX Review section: capture before/after
    Playwright screenshots of the admin sign-in flow if
    practical (the in-place auth shell visual is unchanged
    but the underlying mechanism is new — a captured
    pair documents that the UI continues to work). Contract
    And Scope section names: introduces a new third-party
    dependency (`@supabase/ssr`); changes session storage
    backend from `localStorage` to frontend-origin cookie;
    no API contract, status code, RLS, or routing change.
    Remaining Risk: production cookie-boundary verification
    is the live residual gate; the two-phase Plan-to-Landed
    pattern keeps it honest.
14. **Post-merge: production deploy.** Vercel auto-deploys
    apps/web and apps/site on merge to `main`. Confirm both
    deployments are green.
15. **Post-merge: production cookie-boundary verification.**
    Execute the procedure documented in
    [`docs/dev.md`](/docs/dev.md) updated in step 9: sign in to
    apps/web at `/admin` (or `/event/:slug/admin` for any
    seeded event the admin can author) on the production
    domain → confirm the `sb-<project-ref>-auth-token` cookie
    is set on the apps/web frontend origin (browser DevTools
    Application → Cookies) → navigate to `/event/test-slug`
    (apps/site through proxy) → confirm the placeholder
    reports "Auth cookie present." Capture the verification
    evidence (screenshot of the apps/site placeholder showing
    "present," plus a screenshot of the cookie set on the
    frontend origin) for the Stage 2 commit.
16. **Plan Status flip — Stage 2.** Doc-only follow-up commit
    (or tiny PR per branch protection): flip this plan's
    subphase 1.3.2 row from
    `In progress pending prod smoke` to `Landed`; flip
    plan-level Status from `Proposed` to `Landed`; add a new
    `## Verification Evidence` subsection to this plan
    pasting the screenshots or a transcript link. M1 row in
    the parent epic stays `Proposed` pending phases 1.4 and
    1.5.

### Validation gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final.
- `npm run build:site` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. The
  `shared/auth/` test surface (moved in subphase 1.3.1) is the
  load-bearing local check that the cookie adapter swap is
  API-invisible.
- `npm run test:functions` — pass on baseline; pass on final.
- **Production cookie-boundary verification** — must pass
  post-deploy before subphase 1.3.2's row flips `Landed`. The
  procedure is documented in `docs/dev.md`; the evidence
  pastes into this plan's Verification Evidence subsection in
  Stage 2.

### Self-review audits

Drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- **CLI / tooling pinning audit.** Adding `@supabase/ssr` is
  the substantive new dependency. Confirm exact-version pin
  in `apps/web/package.json` (no `^`, no `~`); confirm
  `package-lock.json` is regenerated in the same commit;
  confirm the chosen `@supabase/ssr` version is compatible
  with `@supabase/supabase-js` `^2.101.1` already in the
  repo (peer dependency check).
- **Readiness-gate truthfulness audit.** The cookie-boundary
  verification is the readiness gate for this subphase. The
  verification procedure documented in `docs/dev.md` must
  fail closed: the apps/site placeholder reports "Auth
  cookie not present" loudly when the cookie is missing,
  not silently passes. Walk what-if scenarios: what if
  Vercel's proxy strips cookies in the request direction?
  What if the apps/site Vercel project is not redeployed
  alongside apps/web? What if the cookie's `Path` or
  `SameSite` attribute is wrong and the browser refuses to
  send it on the proxy-rewrite request? Each scenario must
  produce a "not present" readout, not a vacuous pass.
- **Effect cleanup audit.** No new effects added by 1.3.2;
  the cookie adapter swap is internal to the client factory.
  The audit applies if any subscription's lifecycle
  accidentally crosses into the cookie adapter (for example,
  a window-storage event listener for cross-tab sync added
  by `@supabase/ssr`'s default behavior). Verify no leaked
  listeners during local dev sanity check (step 7).
- **Rename-aware diff classification.** No file moves in
  1.3.2. Named for completeness; nothing actionable.

### Verification Evidence

The inherited M0 phase 0.3 cookie-boundary gate is satisfied in two
parts, both run against the production deployment of commit
[`5af99f4`](https://github.com/kcrobinson-1/neighborly-events/commit/5af99f4)
(PR #99 merge — combining PR #98's `createClient` + `@supabase/ssr`
deep-import + implicit-flow fix with PR #99's `waitFor` flake fix).
Per the plan's invariant, both the cookie-write half (apps/web
origin) and the cookie-read half (apps/site through Vercel's
proxy-rewrite) had to verify before subphase 1.3.2 could flip
`Landed`.

**Cookie-write half — Production Admin Smoke workflow (automated).**
The smoke workflow exercises the magic-link admin auth flow
end-to-end against the deployed origin: it calls
`auth.admin.generateLink({ type: "magiclink" })`, drives a real
browser to the resulting action URL, and asserts the admin shell
renders with the `"Game draft access"` heading after the auth
round-trip. A passing run requires the auth cookie to be written on
the apps/web frontend origin and resolved by `/admin`'s session
read.

| Run | Commit | Result | Notes |
| --- | --- | --- | --- |
| [24948433190](https://github.com/kcrobinson-1/neighborly-events/actions/runs/24948433190) | `28ffbff` (PR #97 merge: `createBrowserClient` + PKCE) | ❌ failure | Symmetric evidence — the PKCE-incompatibility failure mode this subphase fixed. |
| [24949203798](https://github.com/kcrobinson-1/neighborly-events/actions/runs/24949203798) | `5af99f4` (PR #99 merge: `createClient` + implicit + deep-import storage) | ✅ success | The cookie-write half of the cross-app gate. |

**Cookie-read half — manual cross-app verification.** The automated
smoke does not exercise the apps/web → apps/site proxy-rewrite cookie
forwarding (it stays on apps/web's `/admin`). The plan's gate
specifically requires the cross-app path because M0 phase 0.3's
original failure mode was a cookie that worked on one origin but not
through the proxy. Per the procedure documented in
[`docs/dev.md`](/docs/dev.md) "Cookie-boundary verification," the
following manual run on `5af99f4` covers it:

| Step | Observation |
| --- | --- |
| Sign in via apps/web `/admin` (production custom domain `neighborly-scavenger-game-web.vercel.app`) | Magic-link round-trip completed; admin shell rendered with `"Game draft access"`. |
| DevTools → Application → Cookies (apps/web origin) | Cookie `sb-hekluyblchppujdctodc-auth-token` present. Path `/`. SameSite `Lax`. Secure ✓. HttpOnly unset (expected — SPA-set). Domain host-only on `neighborly-scavenger-game-web.vercel.app`. Size 2992 (single unchunked cookie; chunking via `.0`/`.1` siblings remains available if a future JWT exceeds the per-cookie limit). Expires 2027-05-31 (~400 days, matching `@supabase/ssr`'s `DEFAULT_COOKIE_OPTIONS.maxAge`). |
| Same browser session → navigate to `/event/sponsor-spotlight` | apps/site placeholder rendered (proxy-rewrite forwarded the request). |
| Read placeholder readout | `Auth cookie:` **`present`** — the apps/site Next.js `cookies()` saw `sb-hekluyblchppujdctodc-auth-token` through the proxy-rewrite. |

The manual run is reproducible from any production origin via the
`docs/dev.md` procedure; it does not require this plan's evidence to
be re-captured for routine re-verification.

## Validation Gate (Phase-Wide)

The phase-wide validation gate is the union of each subphase's
gate. A subphase's PR cannot merge until its own gate passes;
the plan-level Status flip to `Landed` requires both subphase
rows to read `Landed`.

- `npm run lint`
- `npm run build:web`
- `npm run build:site`
- `npm test`
- `npm run test:functions`
- Production cookie-boundary verification (subphase 1.3.2 only,
  post-deploy, two-phase Plan-to-Landed)

## Documentation Currency PR Gate

Across the two subphases, these named docs must reflect the
implemented state by the time each subphase's PR opens:

- [`README.md`](/README.md) — touched only if the
  monorepo-structure prose names the new `shared/auth/`
  directory at the layout level. If the existing README's
  `shared` bullet covers it without naming sub-directories,
  no edit is required.
- [`docs/architecture.md`](/docs/architecture.md) — updated in
  1.3.1 (`shared/auth/` shared-layer bullet, env-agnostic
  boundary) and 1.3.2 (auth trust boundary: cookie storage
  replaces localStorage; cookie visible to apps/site through
  proxy-rewrite).
- [`docs/dev.md`](/docs/dev.md) — updated in 1.3.1 (per-app auth
  adapter pattern note) and 1.3.2 (cookie-boundary
  verification procedure with the new cookie name; cookie
  attributes reference; admin re-sign-in note).
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  updated in 1.3.1 (phase 1.3 paragraph subphased; role-resolution
  hook clarification; Sizing Summary line and epic total
  updated). Updated in 1.3.2 (strike the M1 phase 1.3
  inheritance from M0 phase 0.3 once the gate is satisfied).
  M1 row stays `Proposed` throughout (phases 1.4 and 1.5
  remain).
- [`docs/plans/site-scaffold-and-routing.md`](/docs/plans/site-scaffold-and-routing.md) —
  not touched in 1.3.x. The M0 phase 0.3 deferral language
  is historical record.
- [`AGENTS.md`](/AGENTS.md) — not touched by phase 1.3
  (styling-token-discipline is M1 phase 1.5).
- This plan — each subphase's row flips on its own PR;
  plan-level Status flips to `Landed` in subphase 1.3.2's
  Stage 2 doc-only follow-up after production verification.

## Out Of Scope

Captured here so reviewer attention does not relitigate them.

- **Role-resolution hooks (`useOrganizerForEvent`,
  `useIsRootAdmin`, equivalents).** The epic phase 1.3
  paragraph names these; the scoping investigation surfaced
  they do not exist as hooks today. Per AGENTS.md "don't
  add features beyond what the task requires," they're
  created in the phases that have a real consumer (M2 phase
  2.2 per-event admin is the natural home for
  `useOrganizerForEvent`). The epic paragraph is tightened
  in 1.3.1's PR to record this.
- **Surface-specific authorization helpers
  (`authorizeRedemptions`, `authorizeRedeem`).** Stay in
  apps/web. Surface-specific (slug + event_code lookup
  bundled with role checks), not role-neutral primitives.
  May move to a future shared module when phase 1.4
  (`shared/events/`) lands; that decision belongs to the
  1.4 plan, not this one.
- **Admin-shell orchestration
  ([`useAdminDashboard`](/apps/web/src/admin/useAdminDashboard.ts)).**
  apps/web-specific orchestration of the admin route family.
  Stays.
- **`apps/site` `@supabase/ssr` adoption with
  `createServerClient`.** Deferred to M2 phase 2.3
  (auth-callback migration: needs `createServerClient` to
  exchange a magic-link code and write the session) and M2
  phase 2.4 (platform admin: needs `createServerClient` to
  gate server-side reads). 1.3.2 uses native Next.js
  `cookies()` for presence-check verification only. The
  presence-check is the M0 phase 0.3 gate honored; full
  server-side session resolution is post-M1.
- **Server-side Supabase auth flows in apps/site
  (magic-link callback exchange, session writes from
  server, cookie-bound server reads).** All M2.
- **`/auth/callback` migration to apps/site.** M2 phase 2.3.
  In 1.3.2 the route stays on apps/web; the cookie adapter
  swap doesn't change the route's location, just its
  storage backend.
- **Cross-tab session sync.** `localStorage` today fires
  `storage` events for cross-tab sync; `@supabase/ssr`'s
  cookie adapter handles cross-tab differently (cookies are
  read fresh on every request). The implementer verifies
  cross-tab behavior during 1.3.2 step 7 sanity check;
  no explicit sync code is added.
- **Edge function auth changes.** Edge functions today
  validate Supabase JWTs via the `Authorization` header
  (the apps/web client supplies it from the session
  client-side). The cookie adapter doesn't change what the
  edge function sees — apps/web still sends the
  `Authorization` header on RPC and edge function calls.
  Out of scope.
- **The `neighborly_session` game-session cookie.** Issued
  by `supabase/functions/issue-session/` on the Supabase
  Edge Function origin; consumed via the
  `x-neighborly-session` header on subsequent edge function
  calls. Different cookie family, different concern. Out of
  scope. (This is exactly the cookie M0 phase 0.3 chose for
  its verification gate before discovering the
  cross-origin scoping problem; M1 phase 1.3.2 does not
  re-touch it.)
- **`localStorage`-to-cookie session-migration shim.** A
  one-time shim to read existing `localStorage` sessions
  and write them to the cookie was considered; rejected as
  one-off code that lives forever. Forced re-sign-in is
  accepted.
- **Migration of `apps/web`'s in-place admin shell to a
  themed shell.** M1 phase 1.5 introduces theming; M2
  phase 2.2 mounts the per-event admin route under
  `<ThemeScope>`. apps/web's existing `/admin` shell stays
  unthemed in 1.3.x.
- **Service-role client used by
  [`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts).**
  Different concern from the browser auth client; not
  migrated.
- **Runtime identifiers (`neighborly_session` cookie,
  `x-neighborly-session` header, `neighborly.local-*`
  storage keys, `@neighborly/web` workspace scope).**
  Preserved per [`repo-rename.md`](/docs/plans/repo-rename.md).

## Risk Register

- **Cookie boundary fails on production (1.3.2).** The
  plan's central acceptance criterion. Mitigation: two-phase
  Plan-to-Landed pattern keeps the gate honest — failure
  surfaces as the plan staying
  `In progress pending prod smoke`, not silently as a merged
  plan that pretends to pass. Recovery path: a follow-up
  plan addressing the failure mode (for example, an
  explicit cookie `Domain=` attribute, a primary-project
  flip to apps/site, or a rewrite-mode change).
- **JWT chunking misbehavior in `@supabase/ssr` (1.3.2).**
  Supabase auth tokens commonly exceed the 4KB single-cookie
  limit. `@supabase/ssr` handles chunking via `auth-token.0`,
  `.1` siblings. Mitigation: the local sanity check in step
  7 inspects browser cookies after sign-in and confirms
  chunking behavior under the chosen `@supabase/ssr`
  version. If chunking misbehaves, the version pin is
  adjusted before merge.
- **Forced re-sign-in surprises admins (1.3.2).**
  `localStorage` sessions become unreadable when the cookie
  adapter takes over. Mitigation: PR body's User Behavior
  section names this explicitly; affected users (root-admin
  team) are notified out-of-band; the in-place magic-link
  shell on `/admin` and `/event/:slug/admin` handles
  re-sign-in cleanly. The forced-signout is one-time per
  affected user.
- **Module-level `configureSharedAuth` startup ordering
  (1.3.1).** If a call site reads from `shared/auth/`
  before `configureSharedAuth` has run, the configured
  getter is undefined and the call throws or returns
  garbage. Mitigation: the apps/web binding module
  configures eagerly on first import, before re-exporting
  the shared API; any apps/web call site that imports the
  re-exports has triggered the configure side-effect. The
  audit step 10 walks for any direct `shared/auth/` import
  in apps/web that bypasses the binding module.
- **Test-mock churn from `shared/auth/` reorganization
  (1.3.1).** The existing `tests/web/auth/AuthCallbackPage`
  and `tests/web/lib/authApi` tests mock
  `apps/web/src/lib/authApi` by module path. Moving the
  module changes the mock seam. Mitigation: the moved test
  files mock `shared/auth/configure` (or the configured-getter
  module); test bodies and assertions stay intact. Step 7
  validates by running both moved tests after the move.
- **Vitest include glob does not pick up
  `tests/shared/auth/` (1.3.1).** Phase 1.2 already widened
  the include glob to cover `tests/shared/**`. Mitigation:
  the focused test runs in step 7 catch glob misses
  immediately after the move.
- **`@supabase/ssr` behavior diverges from
  `@supabase/supabase-js` auth-client behavior (1.3.2).** The
  two libraries are intended to be drop-in replacements at
  the auth API surface, but subtle differences in
  session-restore timing, auto-refresh behavior, or
  hash-fragment consumption could surface. Mitigation:
  1.3.2's existing test surface
  (`AuthCallbackPage`, `api`) is the front line; the e2e
  fixtures are the second line; production smoke is the
  final gate. If the behavior diverges in a way the gates
  catch, the failure surfaces honestly and the version pin
  is reconsidered.
- **Vercel proxy-rewrite drops cookies (1.3.2).**
  Theoretically possible if the rewrite is misconfigured.
  Mitigation: the production cookie-boundary verification
  step explicitly tests this. If the rewrite drops cookies,
  the gate fails and the plan stays
  `In progress pending prod smoke` until fixed. The
  rewrite ordering and same-origin proxy contract were
  validated in M0 phase 0.3 production smoke for everything
  except cookies; the cookie path is the residual.
- **apps/site presence-check regex matches a non-Supabase
  cookie (1.3.2).** The strict regex
  `^sb-[^-]+-auth-token(\.\d+)?$` is intentionally narrow.
  No other cookie family in this repo matches. If a future
  third-party library introduces a cookie matching this
  pattern, the regex would need to tighten. Mitigation: the
  regex is documented in `docs/dev.md` and in this plan's
  Decisions section; a future contributor introducing a
  collision-pattern cookie would surface the conflict.
- **Tests passing locally but failing in CI due to cookie
  behavior (1.3.2).** Browser cookie behavior in Vitest
  jsdom is different from a real browser. Mitigation: e2e
  fixtures (Playwright) use real browser cookies; production
  smoke is the final gate. Local unit-test passing is not
  sufficient evidence that the cookie path works on real
  browsers.
- **Doc-only Stage 2 follow-up violates branch protection
  (1.3.2).** Solo-safe branch protection per
  [`docs/dev.md`](/docs/dev.md) permits direct push to `main`
  for the maintainer; if branch protection has tightened,
  the doc-only flip becomes a tiny follow-up PR rather than
  a direct push. Mitigation: cosmetic only; either path
  lands the same edit.

## Backlog Impact

Phase 1.3 closes no backlog items, opens no new ones, and
unblocks none directly. Backlog impact accumulates at the M1
gate per the parent epic.

The cookie-adapter migration in 1.3.2 unblocks the M2 phase
2.3 (`/auth/callback` migration to apps/site) and M2 phase
2.4 (platform admin in apps/site) work, both of which require
a frontend-origin auth cookie. Tracking that unblocking
relationship lives in the parent epic, not this plan.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  parent epic; M1 milestone owns the foundation extraction;
  sibling phases 1.1, 1.2, 1.4, 1.5 own their own plans
- [`shared-db-foundation.md`](/docs/plans/shared-db-foundation.md) —
  sibling phase 1.1 plan; precedent for module layout, README
  ownership note, per-app adapter pattern, two-subphase
  structure with different risk profiles
- [`shared-urls-foundation.md`](/docs/plans/shared-urls-foundation.md) —
  sibling phase 1.2 plan; precedent for `tests/shared/`
  migration and Vitest include-glob expansion
- [`site-scaffold-and-routing.md`](/docs/plans/site-scaffold-and-routing.md) —
  sibling phase 0.3 plan; cookie-boundary verification gate
  inherited from there; "Verification Evidence" subsection
  documents why the M0 attempt was unworkable and why the
  gate folded into M1 phase 1.3.2
- [`repo-rename.md`](/docs/plans/repo-rename.md) —
  runtime-identifier preservation rules govern which cookie
  and storage names this plan may not change
- [`AGENTS.md`](/AGENTS.md) — planning depth, plan-to-PR
  completion gate, doc currency, validation honesty, scope
  guardrails, two-phase Plan-to-Landed for plans that touch
  production smoke
- [`docs/dev.md`](/docs/dev.md) — current contributor workflow;
  updated by both subphases
- [`docs/architecture.md`](/docs/architecture.md) — current
  shape; updated by both subphases
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  named audits applied at every subphase's gate
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) — Tier 5
  production smoke and the Plan-to-Landed Gate For Plans With
  Post-Release Validation
