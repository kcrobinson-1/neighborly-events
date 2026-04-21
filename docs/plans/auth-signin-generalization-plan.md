# Auth Sign-In Generalization — Overview Plan

**Status:** Proposed — not started. This is a phase overview that names
the two sub-phase boundaries and their prerequisite ordering. Full
execution plans for each sub-phase are drafted separately, close to
their implementation time, following the Phase A precedent
([A.1](./reward-redemption-phase-a-1-plan.md),
[A.2a](./reward-redemption-phase-a-2-plan.md),
[A.2b](./reward-redemption-phase-a-2b-plan.md)).
**Parent context:** Prerequisite for
[`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md).
Both sub-phases must land before Phase B starts.

## Why This Plan Exists

There is exactly one authentication system today: Supabase Auth
magic-link. Every authorized caller — admins, future agents, future
organizers — is a Supabase Auth user. The only difference is
authorization (`is_admin()` vs. `is_agent_for_event(...)` vs.
`is_organizer_for_event(...)`), enforced in the DB and Edge Functions.

The frontend, however, still names the sign-in surface as if it belongs
to the admin workspace. [`AdminSignInForm`](../../apps/web/src/admin/AdminSignInForm.tsx),
[`useAdminSession`](../../apps/web/src/admin/useAdminSession.ts), and
the `getAdminSession` / `subscribeToAdminAuthState` /
`requestAdminMagicLink` / `signOutAdmin` helpers inside
[`adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts) are all
role-agnostic Supabase Auth wrappers dressed as admin surfaces. The
redeem and monitoring routes would either duplicate these or reach
across the `/admin` naming boundary. Both are worse than renaming.

Two secondary problems also need fixing:

- **Magic-link return URL coupling to Supabase config.** Today
  `requestAdminMagicLink` hardcodes `emailRedirectTo: routes.admin`,
  and every return URL has to be added to the Supabase Auth redirect
  URL allowlist in the dashboard. Adding dynamic routes like
  `/event/:slug/redeem` forces either wildcard allowlist entries per
  route shape or per-slug entries. A single `/auth/callback?next=...`
  route with strong allow-list validation of `next` decouples the
  return URL from app route shape entirely.
- **`getAdminAccessToken` is genuinely role-neutral** but sits in
  `adminGameApi.ts`. Phase B will need the identical helper for
  forwarding user bearer tokens to redemption Edge Functions.

## Why Two Sub-Phases

The work splits naturally along a security-review seam:

- **Phase 1 (security-critical foundation)** is the part that reviewers
  must walk line-by-line against the open-redirect bypass-vector test
  suite. Isolating it gives the validator review dedicated attention,
  undiluted by admin-shell migration noise — mirroring the A.2a /
  A.2b logic ("separate SQL review from HTTP wrapper review").
- **Phase 2 (integration)** is the part that actually consumes the
  Phase 1 primitives: the session hook, the sign-in form, the callback
  route, the SCSS partial, and the admin-shell migration. Review
  attention focuses on UI correctness, behavior preservation in the
  admin shell, and operational coordination of the Supabase Auth
  redirect URL allowlist update.

Keeping them in one PR would make the validator compete with the
admin-migration review. Splitting also yields cleaner rollback
granularity: if the validator ships a bug, rolling back Phase 2 without
touching Phase 1 (or vice versa) is straightforward.

## Sub-Phase Summary

| Sub-phase | Scope | Consumers at merge | Detail plan |
|-----------|-------|--------------------|-------------|
| **Phase 1** | `authApi.ts` (5 helpers), `validateNextPath`, `auth/types.ts`, bypass-vector tests | None — inert | [`auth-signin-generalization-phase-1-plan.md`](./auth-signin-generalization-phase-1-plan.md) |
| **Phase 2** | `useAuthSession`, `SignInForm`, `AuthCallbackPage`, `_signin.scss`, admin-shell migration, test mocks, docs | `/admin` uses all new primitives; `/auth/callback` lives in the router | drafted as `auth-signin-generalization-phase-2-plan.md` before Phase 2 implementation |

## Sub-Phase Scope Boundaries

### Phase 1 — Foundation

In scope:

- `apps/web/src/lib/authApi.ts` with `getAuthSession`,
  `subscribeToAuthState`, `requestMagicLink`, `signOut`,
  `getAccessToken`.
- `apps/web/src/auth/validateNextPath.ts` as a pure function returning
  `AuthNextPath` — the narrowed subset of `AppPath` that excludes
  transport-only routes like `/auth/callback`, so callback self-loops
  are blocked at compile time.
- `apps/web/src/auth/types.ts` with `MagicLinkState`,
  `AuthSessionState`, and `AuthNextPath`.
- `tests/web/auth/validateNextPath.test.ts` with exhaustive coverage
  of open-redirect bypass classes.

Out of scope for Phase 1:

- Any UI component, hook, or route.
- Any admin-shell change. The old admin helpers stay in
  `adminGameApi.ts`; the new `authApi.ts` is additive with no
  consumers.
- Any SCSS partial.
- Any Supabase Auth dashboard change. No route is reachable that
  would need a new allowlist entry.

Consumers at merge: **none**. The PR ships a stable, tested,
role-neutral auth primitive surface plus the validator, and nothing
imports them yet. Review focus is validator correctness and helper
signatures.

### Phase 2 — Integration

In scope:

- `apps/web/src/auth/SignInForm.tsx`, consumed by the admin shell.
- `apps/web/src/auth/useAuthSession.ts`.
- `apps/web/src/auth/AuthCallbackPage.tsx` and the `/auth/callback`
  route registration in `routes.ts` (extending the `AppPath` union
  with `"/auth/callback"`; `AuthNextPath`'s `Exclude` automatically
  keeps the callback out of valid post-sign-in destinations) and
  the top-level router.
- `apps/web/src/styles/_signin.scss` with neutral class names.
- Admin-shell migration: `AdminDashboardContent`, `useAdminDashboard`,
  `AdminPage` switch to the new primitives; `AdminSignInForm`,
  `useAdminSession`, `AdminMagicLinkState`, `getAdminAccessToken`,
  and the four renamed helpers leave the tree.
- [`apps/web/vercel.json`](../../apps/web/vercel.json): add
  `/auth/:path*` to the rewrites list so direct-load of the magic-link
  return URL resolves to the SPA shell instead of 404. The current
  rewrites only cover `/admin/:path*` and `/event/:path*`; without
  this update, production magic-link returns will 404 on direct load.
- Vitest mock migration in
  [`tests/web/pages/AdminPage.test.tsx`](../../tests/web/pages/AdminPage.test.tsx).
- e2e admin fixture update in
  [`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts):
  update `defaultAdminRedirectUrl` for the `/auth/callback?next=/admin`
  intermediate hop, and update any production smoke env var guidance
  that currently reads `/admin` (see docs list below).
- Docs updates — expanded surface from the initial draft:
  - [`docs/architecture.md`](../architecture.md) — add `/auth/callback`
    to any frontend route enumeration.
  - [`docs/operations.md:162`](../operations.md) — the
    "Auth URL configuration" block currently names
    "local `/admin` redirect URLs" and
    "deployed `/admin` redirect URLs"; rewrite to name
    `<origin>/auth/callback` as the single redirect URL per
    environment.
  - [`docs/dev.md:151`](../dev.md) — the paragraph that states magic
    links redirect back to `/admin` needs rewriting to describe the
    callback route.
  - [`README.md:129`](../../README.md) — the
    "admin authoring shell and authoring APIs also require" bullet
    list includes redirect URLs with `/admin` origins; rewrite to
    name the callback route.
  - [`docs/tracking/production-admin-smoke-tracking.md:88`](../tracking/production-admin-smoke-tracking.md)
    — `PRODUCTION_SMOKE_ADMIN_REDIRECT_URL` defaults to
    `<PRODUCTION_SMOKE_BASE_URL>/admin`. Decide whether to update the
    default to `/auth/callback?next=/admin` or keep the env var
    admin-scoped and add a separate callback URL. Smoke workflow
    must continue to work end to end.
  - [`apps/web/src/admin/README.md`](../../apps/web/src/admin/README.md)
    if it references removed files.
- Operational step coordinated at merge: add `<origin>/auth/callback`
  to the Supabase Auth redirect URL allowlist per environment. The
  existing `<origin>/admin` entry becomes redundant post-merge (no
  magic link will ever redirect there again) but can stay in place
  safely until a follow-up cleanup.

Out of scope for Phase 2:

- Any redemption route. Those land in Phase B.
- Any new validator bypass class. Phase 1 is the single home for
  `validateNextPath` logic; Phase 2 consumes it unchanged.
- Any role-gate code. Authorization stays admin-specific until
  Phase B adds event-scoped role checks.

Locked expectations the Phase 2 detail plan must honor (not open
items — decided now to avoid drift):

- **Session-establishment ordering in `AuthCallbackPage`.** The
  component must not call `replaceState` to the validated `next`
  path until Supabase has finished URL-based session detection.
  `detectSessionInUrl: true` is enabled globally in
  [`supabaseBrowser.ts:52`](../../apps/web/src/lib/supabaseBrowser.ts),
  but the hash consumption is asynchronous. Locked sequence:
  1. Mount.
  2. Call `getAuthSession()` to force Supabase client instantiation
     and trigger hash consumption.
  3. Await either a non-null session from the initial
     `getAuthSession()` result **or** a `SIGNED_IN` event from
     `subscribeToAuthState`, whichever resolves first. Set a
     reasonable timeout (e.g., 10 seconds) to guard against
     stuck-forever edge cases.
  4. Only then `replaceState` to the validated `next`. Never
     `pushState`.
  5. If the timeout fires or `getAuthSession()` resolves null
     without a subsequent `SIGNED_IN` event, render the neutral
     "sign-in link couldn't be used" state with a path back to
     home.
  
  Navigating before session restoration is a known race; the Phase
  2 detail plan will lock this as a test invariant rather than
  leave it as an implementation choice.

Open items the Phase 2 detail plan must settle before implementation:

- Exact `copy` props the admin shell passes into `SignInForm` (fall
  out of the current admin copy; should be a verbatim port).
- Whether `AuthCallbackPage` renders a minimal loading shell with a
  shared visual treatment or stays invisibly brief during the
  session-wait window.
- Whether `useAdminDashboard` should continue owning
  `signOutError` + `isSigningOut`, or whether those move into a thin
  shared hook now that Phase B will want the same pattern.
- Exact approach for `PRODUCTION_SMOKE_ADMIN_REDIRECT_URL`: update
  the default, introduce a sibling callback-URL env var, or let
  the smoke workflow resolve it from the same base URL. The answer
  drives the
  [`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts)
  fixture shape.

## Prerequisites

Phase 1 has no prerequisites beyond the current `main`. Phase 2 lands
after Phase 1 is in `main`. No backend or migration gate applies to
either sub-phase.

## Shared Concerns Across Phase 1 And Phase 2

- **Type surface.** Two distinct types at the auth boundary, not
  one:
  - `AppPath` (in [`routes.ts`](../../apps/web/src/routes.ts)) — the
    union of every path the client router can route to, including
    transport-only routes. Phase 2 extends this with
    `"/auth/callback"`; Phase B extends it with redemption routes.
  - `AuthNextPath` (in `auth/types.ts`, introduced in Phase 1) —
    `Exclude<AppPath, "/auth/callback">`. This is the type
    `requestMagicLink` and `validateNextPath` consume. Narrowing
    away transport-only routes at compile time prevents
    `next=/auth/callback` self-loops before they can be typed.
  
  Phase B sub-phases extend `AppPath` with their new routes; the
  `Exclude` keeps `AuthNextPath` in sync automatically. New
  transport-only routes (if any future ones appear) add both to
  `AppPath` and to `Exclude`'s excluded literal list.
- **Open-redirect defense.** Phase 1 owns `validateNextPath` end to
  end. Phase 2 consumes it in `AuthCallbackPage` without re-deriving
  any part of the allow-list. Phase B adds its own matchers into
  `validateNextPath`'s allow-list, not into a parallel validator.
- **SCSS scope.** `_admin.scss` stays admin-scoped with its current
  form primitives. Phase 2 introduces `_signin.scss` with neutral
  class names. Some CSS duplication between the two is accepted in
  exchange for separate evolution paths.
- **Error copy.** `authApi.ts` uses role-neutral error copy
  (`"We couldn't restore your session right now."`). Admin-specific
  copy stays in the admin shell; redemption-specific copy will stay
  in the redemption shells when Phase B lands.

## Rollout Sequence At The Phase Level

1. **Draft the Phase 1 detail plan** (done — see
   [`auth-signin-generalization-phase-1-plan.md`](./auth-signin-generalization-phase-1-plan.md)).
2. **Implement Phase 1.** Land the inert foundation with exhaustive
   validator tests. Review focus is open-redirect correctness.
3. **Draft the Phase 2 detail plan** close to implementation, using
   the same template as the Phase A sub-phase plans.
4. **Implement Phase 2.** Migrate the admin shell, ship the callback
   route, update Supabase Auth redirect URL allowlists, verify
   end-to-end admin round-trip on the deployed environment.
5. **Update Phase B overview** if either sub-phase changed the
   assumed primitive shape (unlikely, but called out for honesty).
6. **Hand off to Phase B.** Phase B.1's detail plan can then be
   drafted against the stable, role-neutral primitives.

## Deployment Gates At The Phase Level

- Phase 1: `npm run lint`, `npm test`, `npm run build:web` on a clean
  tree. No backend check applies. No manual browser round-trip
  required because nothing consumes the new code yet.
- Phase 2: same commands plus manual magic-link round-trip on
  `/admin` after updating the local Supabase Auth redirect URL
  allowlist. The round-trip must include a deliberate bypass-vector
  probe (e.g., `?next=https://evil.com/foo`) to confirm the validator
  falls back to `routes.home` in practice, not just in tests.
- Neither sub-phase introduces new Edge Functions, migrations, or
  RPCs. If implementation uncovers a need to, stop and report rather
  than widen either sub-phase.

## Self-Review Audits At The Phase Level

- **Frontend/browser surface:** `Error-surfacing for user-initiated
  mutations` applies to Phase 2's admin-shell migration.
- **Open-redirect validation** is the Phase 1 review lens. No catalog
  entry maps one-to-one today; the Phase 1 detail plan lists the
  exhaustive bypass-vector assertions reviewers walk against the
  implementation. A follow-up catalog entry may land if this pattern
  recurs on another auth-callback-like surface.

## Risks And Mitigations At The Phase Level

- **Open-redirect CVE.** Top risk. Contained to Phase 1 by design;
  Phase 2 cannot introduce a new bypass without touching
  `validateNextPath`. Mitigations in the Phase 1 detail plan.
- **Supabase Auth dashboard drift.** Phase 2 requires
  `/auth/callback` in the redirect URL allowlist across every
  environment. Not tracked in git. Mitigation: named explicitly in
  the Phase 2 PR description and documented in `docs/operations.md`.
- **Vercel rewrite drift.** `/auth/callback` must be added to the
  SPA rewrites in [`apps/web/vercel.json`](../../apps/web/vercel.json)
  in the same commit that adds the route; otherwise production
  magic-link returns 404 on direct load. Mitigation: named in the
  Phase 2 scope above; the production-smoke workflow will catch a
  missing rewrite in practice when it exercises the magic-link
  round-trip.
- **Callback session race.** Navigating away from
  `AuthCallbackPage` before Supabase finishes URL-based session
  detection leaves the target page in a transient `signed_out`
  state. Mitigation: the locked session-establishment ordering in
  the Phase 2 scope above; the Phase 2 detail plan will add a test
  that asserts the navigation does not fire before the session is
  available.
- **Validator/router drift.** If a Phase B sub-phase adds a new
  authenticated route but forgets to extend `validateNextPath`'s
  allow-list, magic-link redirects silently fall back to
  `routes.home`. Mitigation: each Phase B sub-phase plan will name
  the matcher update as a required step, and the corresponding
  Vitest addition is part of the sub-phase diff. `AuthNextPath`'s
  `Exclude` keeps the narrowing automatic so sub-phases only need
  to extend `AppPath` and `validateNextPath`'s allow-list, not
  maintain a parallel type.
- **Stale docs/smoke references to `/admin` redirect.** Several
  docs and smoke fixtures hardcode `/admin` as the magic-link
  return target
  ([`README.md:129`](../../README.md),
  [`docs/dev.md:151`](../dev.md),
  [`docs/operations.md:162`](../operations.md),
  [`docs/tracking/production-admin-smoke-tracking.md:88`](../tracking/production-admin-smoke-tracking.md),
  [`tests/e2e/admin-auth-fixture.ts:37`](../../tests/e2e/admin-auth-fixture.ts)).
  Mitigation: the Phase 2 scope enumerates each file; the PR
  reviewer walks the list before merge.

## Rollback Strategy

Phase 1 is additive. Rollback is a revert; nothing imports the new
surface. Phase 2 rollback is also a revert — the admin shell returns
to its previous imports, the callback route disappears, and the
hardcoded `emailRedirectTo: routes.admin` is restored. No migration
or Supabase Auth state needs reversing, though the operator may keep
the `/auth/callback` allowlist entry in place for faster re-roll.

## Resolved Decisions

- **Two sub-phases** along the security-review seam: foundation +
  integration.
- **Magic-link redirect policy:** single `/auth/callback?next=...`
  route (Phase 2) with `validateNextPath` allow-list defense
  (Phase 1).
- **Open-redirect defense:** pure allow-list using router matchers,
  typed as `AuthNextPath` at the API boundary —
  `Exclude<AppPath, "/auth/callback">`, narrower than `AppPath` so
  transport-only routes are rejected at compile time. No HMAC signing.
- **Naming `AuthNextPath`.** The type lives in `auth/types.ts`
  (Phase 1) and is consumed by `requestMagicLink` and
  `validateNextPath`. Sub-phases that add routes only extend
  `AppPath` and `validateNextPath`'s allow-list; `AuthNextPath`
  stays in sync automatically via `Exclude`.
- **SCSS scope:** `_signin.scss` (Phase 2) with neutral class names;
  admin form primitives stay in `_admin.scss`.
- **`getAccessToken`:** role-neutral helper in `authApi.ts` (Phase 1).
- **Naming:** `SignInForm`, `useAuthSession`, `AuthSessionState`,
  `MagicLinkState`, `AuthCallbackPage`, `validateNextPath`,
  `getAuthSession`, `subscribeToAuthState`, `requestMagicLink`,
  `signOut`, `getAccessToken`.

## Handoff After The Full Generalization

- `/admin` behaves as before but consumes role-neutral auth
  primitives.
- `/auth/callback` is a role-neutral magic-link return handler that
  consumes any validated `next: AuthNextPath`.
- [`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md)
  can schedule B.1 implementation against `SignInForm`,
  `useAuthSession`, `requestMagicLink({ next })`, `getAccessToken`,
  and `validateNextPath` — with zero Supabase Auth dashboard changes
  required to add the redemption routes.
- The admin allowlist path and the redemption role-assignment path
  coexist cleanly: shared authentication, distinct authorization.
