# Auth Sign-In Generalization Plan

**Status:** Proposed — not started.
**Parent context:** Prerequisite for
[`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md).
The redemption operator routes (`/event/:slug/redeem`,
`/event/:slug/redemptions`) need a signed-in Supabase Auth user, but the only
existing sign-in affordance in the app is labelled "Admin" and lives inside
the `/admin` shell. This plan generalizes the Supabase Auth surface so the
next phase consumes a role-neutral sign-in shell without inventing a second
auth system and without requiring Supabase dashboard changes for every new
authenticated route.
**Scope:** Behavior-preserving refactor **plus** a new `/auth/callback`
route that lets magic-link sign-in work for any future authenticated route
without per-route Supabase Auth redirect-URL allowlist changes. No backend
change, no new auth method, no change to allowlist semantics, no new
migration.

## Why This Plan Exists

There is exactly one authentication system today: Supabase Auth magic-link.
Every authorized caller — admins, future agents, future organizers — is a
Supabase Auth user. The only difference is authorization (`is_admin()` vs.
`is_agent_for_event(...)` vs. `is_organizer_for_event(...)`), which is
enforced in the DB layer and the Edge Functions.

The frontend, however, still names the sign-in surface as if it belongs to
the admin workspace. [`AdminSignInForm`](../../apps/web/src/admin/AdminSignInForm.tsx),
[`useAdminSession`](../../apps/web/src/admin/useAdminSession.ts), and the
`getAdminSession` / `subscribeToAdminAuthState` / `requestAdminMagicLink` /
`signOutAdmin` helpers inside
[`adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts) are all
role-agnostic Supabase Auth wrappers dressed as admin surfaces. The redeem
and monitoring routes would either duplicate these or reach across the
`/admin` naming boundary. Both are worse than renaming.

Two secondary problems also need fixing in this phase:

- **Magic-link return URL coupling to Supabase config.** Today
  `requestAdminMagicLink` hardcodes `emailRedirectTo: routes.admin`, and
  every return URL has to be added to the Supabase Auth allowlist in the
  dashboard. Adding dynamic routes like `/event/:slug/redeem` forces either
  wildcard allowlist entries per route shape or per-slug entries (not
  scalable). A single `/auth/callback?next=...` route, with strong
  allow-list validation of `next`, decouples the return URL from app
  route shape entirely.
- **`getAdminAccessToken` is genuinely role-neutral** (reads the current
  session, throws if absent) but sits in `adminGameApi.ts`. Phase B.1 and
  B.2 will need the identical helper for forwarding user bearer tokens to
  the redemption Edge Functions. Leaving it admin-local would force
  duplication.

This phase leaves Phase B.1's diff focused on redemption UX instead of
auth-plumbing cleanup, and gives Phase B.2 and any future authenticated
surface the same shared primitives.

## Summary

- Extract the magic-link sign-in view out of `admin/` into a role-neutral
  `auth/` module; rename to `SignInForm` and accept sign-in copy + intended
  next path via props.
- Rename `useAdminSession` → `useAuthSession`; move it to the new `auth/`
  module. Implementation unchanged.
- Split auth helpers out of `adminGameApi.ts` into a new `authApi.ts` under
  `apps/web/src/lib/`. Rename to `getAuthSession` / `subscribeToAuthState` /
  `requestMagicLink` / `signOut`, and add the role-neutral
  `getAccessToken` helper that Phase B will also consume.
- Add a new `/auth/callback` route whose sole job is to consume the
  Supabase magic-link return hash, validate `?next=`, and client-route
  the user to the validated destination.
- Add a pure `validateNextPath` function with an exhaustive test suite
  covering open-redirect bypass vectors.
- Extract a small `_signin.scss` partial with neutral class names so the
  new `SignInForm` does not depend on admin-scoped SCSS classes. Admin
  form primitives stay inside `_admin.scss` — they belong to the admin
  experience.
- Update every current caller inside the admin shell to consume the
  renamed primitives. No user-visible admin behavior or copy changes.
- Validate with `npm run lint`, `npm test`, `npm run build:web`.

After this phase merges, `/admin` still looks and behaves exactly the same,
but the sign-in shell and magic-link return are ready to be consumed by
`/event/:slug/redeem`, `/event/:slug/redemptions`, and any future
authenticated surface without Supabase Auth dashboard changes.

## Goals

- `apps/web/src/auth/SignInForm.tsx` exists and is role-neutral: no admin
  copy, no admin-specific routing, no admin-specific error states.
- `apps/web/src/auth/useAuthSession.ts` exists and provides the same session
  state machine `useAdminSession` provided (`missing_config` / `loading` /
  `signed_out` / `signed_in`).
- `apps/web/src/auth/AuthCallbackPage.tsx` exists. It mounts the Supabase
  client (so `detectSessionInUrl: true` consumes the magic-link hash),
  validates `?next=` through `validateNextPath`, and client-routes to the
  validated destination.
- `apps/web/src/auth/validateNextPath.ts` exists as a pure function that
  returns an `AppPath`. Invalid input falls through to `routes.home`.
- `apps/web/src/lib/authApi.ts` exists and owns five Supabase Auth helpers:
  `getAuthSession`, `subscribeToAuthState`, `requestMagicLink`, `signOut`,
  `getAccessToken`.
- `apps/web/src/styles/_signin.scss` exists with neutral class names for
  the sign-in surface. `_admin.scss` keeps the admin form primitives.
- `AdminSignInForm`, `useAdminSession`, `getAdminSession`,
  `subscribeToAdminAuthState`, `requestAdminMagicLink`, `signOutAdmin`, and
  `getAdminAccessToken` are removed from the tree; every caller consumes
  the renamed primitives.
- `AdminMagicLinkState` is removed; `MagicLinkState` lives in the `auth/`
  module.
- `/admin` behavior, copy, and allowlist enforcement are unchanged.
- `npm run lint`, `npm test`, `npm run build:web` pass on a clean tree.

## Non-Goals

- Any behavior change for the admin workspace, admin dashboard, allowlist
  enforcement, or `is_admin()` semantics.
- Any change to Supabase Auth configuration in the dashboard other than
  adding `/auth/callback` as a redirect URL. That is an operational step
  documented in this plan's handoff section, not a code change.
- Any new role gate, new Edge Function, new migration, or new backend
  contract.
- Any frontend work in `/event/:slug/redeem` or `/event/:slug/redemptions`.
  Those land in Phase B.1 and B.2.
- Any role-specific sign-in branding. `SignInForm` is caller-driven via
  `copy` props; each shell owns its own labels.
- Any change to `adminGameApi.ts` admin-specific helpers that deal with
  draft loading, event publish, magic-link allowlist checks, or similar
  admin-only operations. Only the Supabase Auth helpers move.
- Any broad SCSS token rename. Only the handful of sign-in-specific
  classes move, and neutral equivalents are duplicated rather than
  coercing the admin form primitives to become generic.

## Locked Contracts

### `apps/web/src/auth/SignInForm.tsx`

Props:

```ts
type SignInFormProps = {
  copy: {
    eyebrow: string;
    heading: string;
    emailLabel: string;
    emailPlaceholder: string;
    submitIdleLabel: string;
    submitPendingLabel: string;
  };
  emailInput: string;
  magicLinkState: MagicLinkState;
  onEmailInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};
```

Renders with neutral `signin-*` class names from `_signin.scss`. Does not
read routes, admin allowlists, or role context. It is a presentation
component.

### `apps/web/src/auth/useAuthSession.ts`

```ts
export type AuthSessionState =
  | { message: string; status: "missing_config" }
  | { status: "loading" }
  | { status: "signed_out" }
  | { email: string | null; session: Session; status: "signed_in" };

export function useAuthSession(): AuthSessionState;
```

Internally calls `getAuthSession` + `subscribeToAuthState` from
`authApi.ts`. Behavior is identical to the current `useAdminSession`
except for the neutral error copy.

### `apps/web/src/auth/validateNextPath.ts`

```ts
export function validateNextPath(rawNext: string | null): AppPath;
```

- Parses `rawNext` with `new URL(rawNext, window.location.origin)`.
- Rejects anything whose parsed `.origin` does not equal
  `window.location.origin` (catches `https://evil.com/...`,
  `//evil.com/...`, `javascript:...`, `data:...`, `mailto:...`,
  scheme-mismatched same-host URLs).
- Matches the parsed `.pathname` against an allow-list built from the
  router's own path matchers:
  - `routes.home`
  - `routes.admin`
  - `matchAdminEventPath`
  - `matchGamePath`
  - future: `matchEventRedeemPath`, `matchEventRedemptionsPath` (added in
    Phase B)
- Returns `routes.home` for any input that does not match the allow-list,
  including `null`, empty string, whitespace, unknown paths, and
  normalized-but-unrecognized paths.
- Uses only `.pathname` from the validated URL; never `.href`, never
  `.search`, never `.hash`. Trailing query/hash from `rawNext` is dropped.

### `apps/web/src/auth/AuthCallbackPage.tsx`

- Route: `/auth/callback` (added to `routes.ts` `AppPath` union).
- Responsibilities:
  - Mount the Supabase client so `detectSessionInUrl: true` consumes the
    magic-link hash fragment (already globally enabled in
    [`supabaseBrowser.ts:56`](../../apps/web/src/lib/supabaseBrowser.ts)).
  - Read `?next=` from the URL query, pass it through `validateNextPath`.
  - Replace history with the validated destination as soon as the session
    finishes restoring (do **not** push; the callback URL should not be
    in the back-stack).
  - If the session is not restored (bad link, expired token), show a
    neutral "sign-in link couldn't be used" state with a path back to
    the home route.
- Does not render the admin shell or any admin copy.
- Does not re-emit the hash fragment into the next navigation; the
  callback strips it.

### `apps/web/src/lib/authApi.ts`

```ts
export function getAuthSession(): Promise<Session | null>;

export function subscribeToAuthState(
  onSessionChange: (session: Session | null) => void,
): () => void;

export function requestMagicLink(
  email: string,
  options: { next: AppPath },
): Promise<void>;

export function signOut(): Promise<void>;

export function getAccessToken(): Promise<string>;
```

- Error messages are role-neutral (`"We couldn't restore your session right
  now."`, `"We couldn't sign out right now."`, etc.). Admin-specific error
  copy stays in the admin shell.
- `requestMagicLink` **always** sets
  `emailRedirectTo = new URL("/auth/callback?next=" + encodeURIComponent(next), window.location.origin).toString()`.
  The `next` parameter is typed as `AppPath` — callers cannot pass raw
  strings, and the union type is the type-level gate that makes it
  safe to embed in the redirect URL.
- `getAccessToken` returns the current access token or throws if no
  session. Used by admin authoring calls **and**, after Phase B lands, by
  redemption Edge Function calls. Neutral error copy:
  `"Sign-in is required."`.

### `MagicLinkState`

Moves to `apps/web/src/auth/types.ts` (or colocated in
`useAuthSession.ts`) as:

```ts
export type MagicLinkState = {
  message: string | null;
  status: "idle" | "error" | "pending" | "success";
};
```

`AdminMagicLinkState` is removed in the same commit that introduces
the new type. No parallel alias remains.

### `_signin.scss`

- New partial at `apps/web/src/styles/_signin.scss`, imported from
  `apps/web/src/styles.scss` after `_admin.scss`.
- Owns class names used only by the sign-in surface:
  `.signin-stack`, `.signin-form`, `.signin-field`, `.signin-field-label`,
  `.signin-input`, `.signin-message`, `.signin-message-error`,
  `.signin-message-success`, `.signin-message-info`.
- Style values may duplicate the corresponding admin form primitives.
  That duplication is intentional — admin and sign-in are separate
  experiences with separate evolution paths, and ~15 lines of duplicated
  basic form styling is cheaper than a cross-surface abstraction.
- `_admin.scss` is unchanged aside from dropping any classes that are
  truly sign-in-only (there are none today; the classes are shared with
  other admin forms and stay admin-scoped).

## Target Structure

```
apps/web/src/
├── auth/
│   ├── SignInForm.tsx          (new, generic)
│   ├── useAuthSession.ts       (new, generic)
│   ├── AuthCallbackPage.tsx    (new, magic-link return handler)
│   ├── validateNextPath.ts     (new, pure open-redirect defense)
│   └── types.ts                (new: MagicLinkState, AuthSessionState)
├── admin/
│   ├── AdminDashboardContent.tsx   (updated: consumes SignInForm + copy)
│   ├── useAdminDashboard.ts        (updated: consumes useAuthSession + authApi)
│   ├── AdminSignInForm.tsx         (deleted)
│   └── useAdminSession.ts          (deleted)
├── lib/
│   ├── authApi.ts              (new: 5 Supabase Auth helpers)
│   └── adminGameApi.ts         (updated: 4 auth helpers removed, getAdminAccessToken removed)
├── styles/
│   └── _signin.scss            (new)
└── routes.ts                   (updated: AppPath adds "/auth/callback")
```

### What stays admin-specific

- `AdminPageShell`, `AdminDashboardContent`, `useAdminDashboard` (the hook
  still coordinates the allowlist check and draft loading).
- Magic-link copy strings passed by the admin shell into `SignInForm`
  (e.g., `"Send a sign-in link to an admin email."`, `"admin@example.com"`)
  stay inside the admin shell.
- Admin form primitives (`.admin-form`, `.admin-field`, `.admin-input`,
  `.admin-message*`) stay in `_admin.scss`; they're shared by multiple
  admin forms and belong to the admin experience.
- `signOutError` handling, `isSigningOut` state, and the admin
  "sign out" button wiring stay admin-specific. Phase B.1 and B.2 will
  re-implement the same pattern against the shared `signOut()` helper
  rather than share state.
- The `is_admin()` RPC call in
  [`adminGameApi.ts:167`](../../apps/web/src/lib/adminGameApi.ts:167)
  stays admin-specific.

## Rollout Sequence

1. **Baseline validation.** On a clean tree, run `npm run lint`,
   `npm test`, and `npm run build:web`. Stop and report any pre-existing
   failure before editing.
2. **Commit 1 — Generic auth helpers + validator.** Add `authApi.ts`
   with all five helpers, `auth/types.ts` with `MagicLinkState` and
   `AuthSessionState`, and `auth/validateNextPath.ts` with its
   exhaustive Vitest suite covering bypass vectors. Add `/auth/callback`
   to the `AppPath` union. Do **not** remove the admin versions yet.
   Validate with `npm run lint`, `npm test`, `npm run build:web`.
3. **Commit 2 — Auth session hook, sign-in form, callback route.** Add
   `useAuthSession`, `SignInForm`, `AuthCallbackPage`, and
   `_signin.scss`. Wire `/auth/callback` into the top-level router.
   Still do not touch the admin shell. Validate with `npm run lint`,
   `npm test`, `npm run build:web`.
4. **Commit 3 — Migrate admin consumers.** Update
   `AdminDashboardContent`, `useAdminDashboard`, and `AdminPage` to
   consume the new primitives. Pass admin copy into `SignInForm`.
   Rewire `callAuthoringFunction` in `adminGameApi.ts` to use the new
   `getAccessToken`. Update `tests/web/pages/AdminPage.test.tsx` mocks
   to target the new module paths and symbol names (see Tests
   section). Remove `AdminSignInForm`, `useAdminSession`,
   `AdminMagicLinkState`, `getAdminAccessToken`, and the four renamed
   helpers from the admin surface. Validate with `npm run lint`,
   `npm test`, `npm run build:web`.
5. **Automated code-review feedback loop.** Review the diff from a
   senior-engineer stance for: open-redirect bypasses that test suite
   did not pin, stray admin copy in the generic component, hardcoded
   `routes.admin` still reachable, unused exports left behind,
   admin-specific behavior silently dropped, missing error feedback,
   SCSS class drift, type exports no longer reachable, mocks still
   pointing at deleted symbols, `tests/e2e/admin-*` assertions about
   `/admin` as a post-magic-link landing URL that now need to accept
   the callback hop. Land review-fix commits separately when it helps
   history readability.
6. **Structure review.** Confirm `auth/` has no admin-only code and
   the admin shell has no direct Supabase Auth calls. Confirm
   `_signin.scss` is not reaching into `_admin.scss` selectors. If
   anything mixed in accidentally, split it back out in the same PR.
7. **Documentation currency sync.** Update
   [`docs/architecture.md`](../architecture.md) if the frontend auth
   flow is described there; add the `/auth/callback` route to any
   frontend route listing. Update
   [`docs/operations.md`](../operations.md) §"Supabase Auth Site URL"
   to note that `/auth/callback` is the single redirect URL to
   allowlist per environment. Update
   [`apps/web/src/admin/README.md`](../../apps/web/src/admin/README.md)
   if it references the removed files. Update
   [`docs/dev.md`](../dev.md) §241 if it still reads
   "include your local `/admin` origin" — after this phase, the local
   allowlist entry is `/auth/callback`.
8. **Final validation.** Run `npm run lint`, `npm test`,
   `npm run build:web` from a clean working tree.
9. **Manual verification.** Run `npm run dev:web` locally after
   adding `/auth/callback` to the local Supabase Auth redirect URL
   allowlist. Visit `/admin`, request a magic link, follow it, confirm
   the callback route consumes the hash and lands on `/admin`, confirm
   sign-in persisted, confirm sign-out. Repeat with
   `?next=https://evil.com/foo` appended manually to a callback URL
   and confirm it falls back to `/`. Document the outcomes in the PR
   body.
10. **PR preparation.** Open a PR against `main` using the repo PR
    template. Frame explicitly as: behavior-preserving auth
    generalization that adds one new route (`/auth/callback`), changes
    the magic-link return URL pattern, and unblocks the redemption
    operator routes. Call out the operational step (Supabase Auth
    redirect URL allowlist update) required at merge time.

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `refactor(web): add generic auth helpers and next-path validator` | `npm run lint`, `npm test`, `npm run build:web` |
| 2 | `refactor(web): add auth session hook, sign-in form, callback route` | `npm run lint`, `npm test`, `npm run build:web` |
| 3 | `refactor(web): migrate admin shell to generic auth primitives` | `npm run lint`, `npm test`, `npm run build:web` |
| 4 | `docs: note auth surface generalization and callback route` | `npm run lint` |

Review-fix commits, if any, land between 3 and 4.

## Tests

### `tests/web/auth/validateNextPath.test.ts` (new)

Must prove the validator returns `routes.home` for every entry in the
bypass-vector list and returns the round-tripped path for every valid
entry. Minimum coverage:

**Rejected (return `routes.home`)**:

- `"https://evil.com/anything"`
- `"http://evil.com/anything"`
- `"//evil.com/anything"` (protocol-relative)
- `"/\\evil.com"` (backslash path)
- `"javascript:alert(1)"`
- `"JavaScript:alert(1)"` (case variant)
- `"data:text/html,<script>..."`
- `"mailto:x@y.com"`
- `"/admin/../evil"` (path traversal)
- `"/admin%00/evil"` (null byte)
- `"/unknown/route"` (not in allow-list)
- `""`, `null`, single space, `"   "`
- `"http://" + window.location.host + "/admin"` when serving from
  `https://` (scheme mismatch)

**Accepted (return unchanged)**:

- `"/"`
- `"/admin"`
- `"/admin/events/some-id"`
- `"/event/some-slug/game"`

The suite runs under Vitest with `window.location.origin` stubbed to a
fixed `https://example.test`.

### `tests/web/auth/AuthCallbackPage.test.tsx` (new)

Must prove:

- Component reads `?next=` from the URL, passes it through
  `validateNextPath`, and calls the navigation prop with the validated
  result.
- Component handles the "no session yet" state without throwing when
  the magic-link hash is absent or malformed.
- Component does not render admin copy.
- Component uses `history.replaceState` (or equivalent) rather than
  `pushState` for the post-callback navigation.

### `tests/web/pages/AdminPage.test.tsx` (migration)

Update the `vi.mock` targets:

- `"../../../apps/web/src/admin/useAdminSession.ts"` →
  `"../../../apps/web/src/auth/useAuthSession.ts"`
- `"../../../apps/web/src/lib/adminGameApi.ts"` still mocked, but with
  the admin auth helpers dropped — only `generateEventCode`,
  `getGameAdminStatus`, `listDraftEventSummaries`, `loadDraftEvent`,
  `publishDraftEvent`, `saveDraftEvent`, `unpublishEvent`.
- Add a new `vi.mock` for `"../../../apps/web/src/lib/authApi.ts"`
  with `requestMagicLink`, `signOut`.
- Keep the `"Admin email"` label assertions — the admin shell still
  passes admin copy into `SignInForm`, so the label text is unchanged.

### No new backend or e2e tests in this phase

The existing admin smoke (`tests/e2e/admin-workflow.admin.spec.ts`)
must still pass unchanged. If its fixture at
`tests/e2e/admin-auth-fixture.ts` asserts a specific post-magic-link
URL, update the fixture to accept the `/auth/callback?next=/admin`
intermediate hop before the admin shell renders.

## Self-Review Audits

Run the applicable named audits from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **Frontend/browser surface:** `Error-surfacing for user-initiated
  mutations` — every caller of `requestMagicLink` and `signOut` must
  still surface failures. The rename must not silently drop a `.catch`
  branch.
- **Open-redirect validation (new audit-worthy surface).** No existing
  catalog entry maps one-to-one to `next`-param validation. Reviewers
  should walk each entry in the `validateNextPath` bypass-vector list
  against the test file and the implementation. If this phase recurs as
  a pattern (another auth-callback-like surface), consider adding a
  dedicated catalog entry in a follow-up.
- **CI / testing infrastructure:** `Rename-aware diff classification`
  does not apply at implementation time, but reviewers should keep it
  in mind: a rename that deletes `adminGameApi.ts` exports must be
  traceable to new exports in `authApi.ts`, not silently dropped.

No SQL audit applies; no migration or RPC changes.

## Validation Expectations

- `npm run lint` — passes.
- `npm test` — passes; `validateNextPath.test.ts` and
  `AuthCallbackPage.test.tsx` added; `AdminPage.test.tsx` mocks migrated.
- `npm run build:web` — passes.
- Manual `npm run dev:web` round-trip:
  - `/admin` → request magic link → follow → lands on `/auth/callback?next=/admin`
    → client-routes to `/admin` → signed in.
  - Append `?next=https://evil.com/foo` to a fresh callback URL manually;
    confirm fallback to `/`.
  - `/admin` sign-out works and clears the session.
- `deno check` is not required; no Edge Function source is touched.

## Risks And Mitigations

- **Open-redirect CVE.** The top risk. A `next`-param validator that
  misses a bypass ships a phishing-friendly hole. Mitigation: pure
  allow-list implementation using the router's own matchers, exhaustive
  Vitest coverage of known bypass classes, manual same-origin spot-check
  in the verification step, senior-engineer review walking each test
  entry against the implementation.
- **Silent copy drift in the admin sign-in view.** The extracted
  `SignInForm` must render the admin copy identically. Mitigation: the
  admin shell still passes all six `copy` props; the Vitest suite
  asserts the admin labels; manual `/admin` visit before PR.
- **Hardcoded `routes.admin` redirect leaks.** If `requestMagicLink`
  accepted a raw string, an agent sign-in flow could silently bounce to
  `/admin`. Mitigation: `next` is typed `AppPath` at the API boundary;
  the type system enforces matcher-known paths.
- **Supabase Auth dashboard drift.** Adding `/auth/callback` to
  allowlists is an operational step not tracked in git. Mitigation:
  named explicitly in the PR description, called out in
  `docs/operations.md` and `docs/dev.md` updates, and the manual
  verification step will fail loudly if the allowlist is missing.
- **Hash consumption on a non-`/admin` page.** `detectSessionInUrl: true`
  is set globally in
  [`supabaseBrowser.ts:56`](../../apps/web/src/lib/supabaseBrowser.ts),
  but the callback page must mount the Supabase client for the detection
  to fire. Mitigation: `AuthCallbackPage` calls `getAuthSession()` on
  mount to force client instantiation, and the manual round-trip
  verifies the hash is consumed.
- **Accidental admin behavior loss.** The admin shell also coordinates
  allowlist error states and magic-link-sent confirmation copy. Moving
  the hook could drop one of those branches. Mitigation: keep
  `useAdminDashboard` as the owner of admin-specific message composition
  and allowlist checks; `useAuthSession` exposes only the generic
  session state.
- **e2e admin fixture breakage.** `tests/e2e/admin-auth-fixture.ts` may
  assert a specific post-magic-link URL. Mitigation: the code-review
  feedback loop step explicitly calls out this file.
- **Sign-out semantics.** `signOut()` ends the Supabase Auth session
  globally for the current user across all authenticated surfaces. This
  is correct (one identity) but unchanged from today; document it in
  the handoff so Phase B expectations stay aligned.

## Rollback Plan

Rollback is code- and docs-only.

1. Revert the PR. The admin shell returns to its prior imports and
   filenames; `/auth/callback` disappears from the router. Existing
   `/admin` magic-link URLs continue to work because the old
   `emailRedirectTo: routes.admin` is restored by the revert.
2. No migration, Edge Function, or Supabase Auth configuration change
   needs undoing, but the Supabase Auth allowlist entry for
   `/auth/callback` can be left in place (harmless) or removed per
   operator preference.
3. No follow-up consumer exists in `main` at the time this phase lands
   (Phase B.1 is not yet merged), so the revert does not break any other
   surface.

## Resolved Decisions

- **Names.** `SignInForm`, `useAuthSession`, `AuthSessionState`,
  `MagicLinkState`, `AuthCallbackPage`, `validateNextPath`,
  `getAuthSession`, `subscribeToAuthState`, `requestMagicLink`,
  `signOut`, `getAccessToken`.
- **Location.** New `apps/web/src/auth/` directory for components,
  hooks, and the next-path validator; new `apps/web/src/lib/authApi.ts`
  for Supabase Auth helpers; new `apps/web/src/styles/_signin.scss`.
- **Copy strategy.** Pass copy via a `copy` prop on `SignInForm` rather
  than baking a `context` enum into the component. Shells own their own
  labels.
- **Magic-link redirect policy.** Single `/auth/callback` route with a
  validated `?next=AppPath` parameter. Allowlist one URL per environment
  in Supabase Auth config (`<origin>/auth/callback`); app-side route
  changes never require dashboard changes again.
- **Open-redirect defense.** Pure allow-list via router matchers, typed
  at the API boundary as `AppPath`, with exhaustive Vitest bypass-vector
  coverage. No HMAC signing; allow-list is sufficient at this scale.
- **SCSS scope.** `_signin.scss` owns sign-in-surface styles with
  neutral class names; admin form primitives stay in `_admin.scss`.
  Duplicated CSS is intentional — the two surfaces have distinct
  evolution paths.
- **`getAccessToken` placement.** In `authApi.ts` as a fifth helper.
  Phase B.1 and B.2 will consume it for redemption Edge Function calls.
- **Admin-specific pieces that stay admin-specific.** Magic-link
  allowlist message composition, `signOutError` wiring, draft loading,
  `is_admin()` RPC call.

Open questions blocking this phase: none.

## Operational Step At Merge Time

Before merging this PR:

1. Add `<origin>/auth/callback` to the Supabase Auth redirect URL
   allowlist for every environment (local, preview, production). The
   existing `<origin>/admin` entry can be removed after merge, but it
   is harmless to leave.
2. Verify the manual round-trip from the verification step works on
   the deployed environment before closing the PR.

The operational step is named in the PR description so the reviewer
knows to coordinate it rather than discover it at magic-link time.

## Handoff After This Phase

- `/admin` behaves exactly as before but now consumes generic auth
  primitives and routes through `/auth/callback` on sign-in.
- `/auth/callback` is a role-neutral magic-link return handler that
  can be consumed by any future authenticated route by passing
  `next: AppPath` to `requestMagicLink`.
- [`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md)
  can schedule B.1 implementation against `SignInForm`, `useAuthSession`,
  `requestMagicLink({ next })`, and `getAccessToken` — with zero
  Supabase Auth dashboard changes required to add the redemption
  routes.
- The admin allowlist path and the redemption role-assignment path
  coexist cleanly: shared authentication, distinct authorization.
