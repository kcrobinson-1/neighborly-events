# Auth Sign-In Generalization — Phase 2 Execution Plan

**Status:** Proposed — not started.
**Parent overview:** [`auth-signin-generalization-plan.md`](./auth-signin-generalization-plan.md)
**Predecessor:** [`auth-signin-generalization-phase-1-plan.md`](./auth-signin-generalization-phase-1-plan.md).
Phase 1 is **partially landed**:

- [PR #64](https://github.com/kcrobinson-1/neighborly-scavenger-game/pull/64)
  shipped the two inert-foundation commits (`b16fa24`
  `feat(web): add role-neutral auth api helpers` and `adc4f3f`
  `feat(web): add validateNextPath with bypass-vector tests`).
- The `requestMagicLink` URL-shape and error-copy unit suite at
  `tests/web/lib/authApi.test.ts` — required by the Phase 1 plan as
  its Commit 3 in response to a security-adjacent reviewer flag — is
  **not yet on `main`**. Phase 2 implementation **must not begin
  until that test commit lands**; the suite's assertions are the
  guardrail that `requestMagicLink`'s URL composition (which Phase 2
  exercises end-to-end through the admin shell and the new
  `/auth/callback` route) cannot silently regress.

Phase 2's first step in § Rollout Sequence explicitly checks for that
commit on `main` as a prerequisite before editing.
**Scope:** Phase 2 only — the integration phase that wires the Phase 1
primitives into a user-reachable flow. Ships the `/auth/callback`
route, the role-neutral sign-in form and session hook, the admin-shell
migration onto the new primitives, the matching SCSS partial, the
Vercel rewrite, the production-smoke/e2e fixture updates, and the docs
rewrites. The four helper functions and their types that land today
in `apps/web/src/admin/` and `apps/web/src/lib/adminGameApi.ts` come
out of the tree in this phase.

## Why Phase 2 Exists

Phase 1 shipped the auth primitives inert so reviewers could walk the
open-redirect validator line-by-line against the bypass-vector table
without admin-shell migration noise. Phase 2 is the integration that
makes the primitives reachable. It ships three things together:

- the role-neutral **sign-in surface** (`SignInForm`, `useAuthSession`,
  `AuthCallbackPage`, `_signin.scss`) consuming the Phase 1 primitives;
- the **admin-shell migration** off `AdminSignInForm`, `useAdminSession`,
  `AdminMagicLinkState`, and the four admin auth helpers in
  `adminGameApi.ts`;
- the **operational coordination** — a new `/auth/callback` entry in the
  Supabase Auth redirect URL allowlist per environment, a new SPA
  rewrite in `vercel.json`, and rewritten docs for every surface that
  currently documents the hardcoded `/admin` redirect.

Keeping all three in one PR is intentional: the migration is a behavior
preservation exercise that needs to land atomically with the route
registration, because otherwise either the admin shell keeps its old
behavior against a new Supabase config (breaking sign-in) or the new
callback exists with no producer (dead code). Phase B depends on both
halves.

## Summary

Add `apps/web/src/auth/SignInForm.tsx`, `apps/web/src/auth/useAuthSession.ts`,
and `apps/web/src/auth/AuthCallbackPage.tsx`. Register `/auth/callback`
in `apps/web/src/routes.ts` (extending `AppPath` with `"/auth/callback"`)
and wire it into `apps/web/src/App.tsx`. Add
`apps/web/src/styles/_signin.scss` with neutral class names. Migrate
`AdminPage`, `AdminDashboardContent`, and `useAdminDashboard` onto the
new primitives; delete `AdminSignInForm`, `useAdminSession`,
`AdminMagicLinkState`, `AdminSessionState`, and the four admin auth
helpers (`getAdminSession`, `subscribeToAdminAuthState`,
`requestAdminMagicLink`, `signOutAdmin`, and the private
`getAdminAccessToken`). Update `apps/web/vercel.json` so
`/auth/:path*` rewrites to `/index.html`. Update
`tests/web/pages/AdminPage.test.tsx` mocks and
`tests/e2e/admin-auth-fixture.ts` redirect composition. Rewrite
five docs surfaces that name `/admin` as the magic-link return target.
Coordinate the Supabase Auth dashboard update (add
`<origin>/auth/callback`) at merge time.

After this PR merges, `/admin` behaves identically to today from the
user's perspective — the only visible change is that the magic-link
return URL transits through `/auth/callback` before redirecting to
`/admin`. Every authenticated destination now goes through one
role-neutral sign-in surface, and Phase B can schedule redemption
routes against the stable primitive shape.

## Goals

- `apps/web/src/auth/SignInForm.tsx` exists and accepts a `copy` prop
  plus the same `(emailInput, magicLinkState, onEmailInputChange,
  onSubmit)` tuple `AdminSignInForm` accepts today. All admin-specific
  strings move into the admin shell's `copy` prop; no admin-specific
  wording lives in the form itself.
- `apps/web/src/auth/useAuthSession.ts` exists and exports
  `useAuthSession()` returning `AuthSessionState` (the Phase 1 type).
  Its behavior matches the existing `useAdminSession` exactly except
  for (1) the role-neutral fallback copy and (2) the swapped helper
  imports (`getAuthSession` / `subscribeToAuthState` from
  `authApi.ts`).
- `apps/web/src/auth/AuthCallbackPage.tsx` exists and implements the
  overview-locked session-establishment ordering: mount → force
  `getAuthSession()` → await a session (initial or via
  `subscribeToAuthState`'s `SIGNED_IN`) with a 10-second timeout →
  `onNavigate(validatedNext, { replace: true })` (a single call;
  never combined with a direct `history.replaceState`) → on timeout
  or persistent `signed_out`, render the neutral
  "sign-in link couldn't be used" state with a link back to
  `routes.home`.
- `apps/web/src/routes.ts` extends `AppPath` with `"/auth/callback"`
  and exposes `routes.authCallback = "/auth/callback" as AppPath`.
  The `AuthNextPath` excludes `"/auth/callback"` via the Phase 1
  `Exclude` (no hand-editing required).
- `apps/web/src/App.tsx` resolves `/auth/callback` to
  `<AuthCallbackPage onNavigate={navigate} />` before any other
  pathname branch fires. `AuthCallbackPage` uses `onNavigate`
  exactly once — with `{ replace: true }` — for the final
  post-validation transition. It does not call `window.history`
  directly; the single navigation mechanism is the locked
  transport.
- `apps/web/src/styles/_signin.scss` exists, is imported by the
  project's SCSS entry, and defines neutral class names
  (`signin-stack`, `signin-form`, `signin-field`, `signin-input`,
  `signin-message`, `signin-message-error`, `signin-message-success`).
- The admin shell — `AdminPage`, `AdminDashboardContent`,
  `useAdminDashboard` — consumes the new primitives. The four admin
  auth helpers plus `AdminMagicLinkState`, `AdminSessionState`, and
  the private `getAdminAccessToken` are deleted. The authoring
  helpers (`getGameAdminStatus`, `listDraftEventSummaries`,
  `loadDraftEvent`, `saveDraftEvent`, `generateEventCode`,
  `publishDraftEvent`, `unpublishEvent`) stay in
  `adminGameApi.ts`; `callAuthoringFunction` now calls
  `getAccessToken()` from `authApi.ts`.
- `apps/web/vercel.json` includes `/auth/:path*` in the rewrites
  list. Without this, the production direct-load of
  `/auth/callback?next=…` 404s.
- `tests/web/pages/AdminPage.test.tsx` swaps its mocks:
  `mockUseAdminSession` → `mockUseAuthSession` mocking
  `apps/web/src/auth/useAuthSession.ts`; `mockRequestAdminMagicLink` /
  `mockSignOutAdmin` → mocks on `apps/web/src/lib/authApi.ts`'s
  `requestMagicLink` / `signOut`. Behavior parity: every test that
  passes today passes after the migration with only the mock import
  paths and function names changed.
- `tests/e2e/admin-auth-fixture.ts` composes the magic-link redirect
  as `/auth/callback?next=/admin` instead of `/admin`.
- `apps/web/src/admin/README.md`, `docs/architecture.md`,
  `docs/operations.md:162` area, `docs/dev.md:151` area,
  `README.md:129` area, and `docs/tracking/production-admin-smoke-tracking.md:88`
  all name `<origin>/auth/callback` as the single magic-link return
  URL per environment.
- `npm run lint`, `npm test`, `npm run build:web` pass on a clean
  tree.
- Manual magic-link round-trip on `/admin` against a local Supabase
  project (with `<origin>/auth/callback` added to the redirect URL
  allowlist) succeeds. The round-trip includes a deliberate
  bypass-vector probe (`?next=https://evil.com/foo`) to confirm the
  validator falls back to `routes.home` in practice.

## Non-Goals

- Any redemption route, role helper, or attendee/agent-facing
  authenticated surface. Those land in Phase B.
- Any new `validateNextPath` bypass-class assertion. Phase 1 is the
  single home for validator logic; Phase 2 consumes it unchanged. A
  single new positive-case test for `/auth/callback` handling is
  acceptable only inside `AuthCallbackPage.test.tsx`, not inside
  `validateNextPath.test.ts`.
- Any change to `is_admin()` or to the admin allowlist semantics.
  Authorization stays where it is.
- Any extraction of `signOutError` + `isSigningOut` into a shared
  hook. That stays inside `useAdminDashboard` for this phase; Phase B
  can extract when it has a second concrete consumer.
- Any refactor of `_admin.scss` beyond removing the selectors that
  only the deleted `AdminSignInForm` used. The event-workspace styles
  and shared form primitives (`.admin-field`, `.admin-input`,
  `.admin-message*`) stay. `_signin.scss` duplicates the subset the
  sign-in form needs; the cost of duplication buys independent
  evolution of the sign-in visual language.
- Any migration, Edge Function, or RPC change.
- Any change to the `callAuthoringFunction` authoring helpers beyond
  the `getAccessToken()` import swap.

## Locked Contracts

### `apps/web/src/auth/SignInForm.tsx`

```ts
export type SignInFormCopy = {
  eyebrow: string;
  heading: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailInputId: string;
  submitLabelIdle: string;
  submitLabelPending: string;
};

export type SignInFormProps = {
  copy: SignInFormCopy;
  emailInput: string;
  magicLinkState: MagicLinkState;
  onEmailInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SignInForm(props: SignInFormProps): JSX.Element;
```

- The form body mirrors today's `AdminSignInForm.tsx:18-60` JSX with
  admin-specific strings replaced by `copy.*` and admin-specific
  class names replaced by the `_signin.scss` neutral names.
- The admin shell passes a verbatim port of today's admin copy:

  ```ts
  const ADMIN_SIGN_IN_COPY: SignInFormCopy = {
    emailInputId: "admin-email",
    emailLabel: "Admin email",
    emailPlaceholder: "admin@example.com",
    eyebrow: "Magic-link sign-in",
    heading: "Send a sign-in link to an admin email.",
    submitLabelIdle: "Email sign-in link",
    submitLabelPending: "Sending sign-in link...",
  };
  ```

  Success-banner and error-banner copy continue to live in
  `magicLinkState.message`, just as today.

### `apps/web/src/auth/useAuthSession.ts`

```ts
export function useAuthSession(): AuthSessionState;
```

- Implementation is a near-verbatim port of
  `apps/web/src/admin/useAdminSession.ts`, with:
  - `getAdminSession` / `subscribeToAdminAuthState` replaced by
    `getAuthSession` / `subscribeToAuthState` from `authApi.ts`;
  - fallback error copy `"We couldn't restore the admin session right now."`
    replaced by `"We couldn't restore your session right now."`;
  - return type name `AdminSessionState` replaced by `AuthSessionState`
    (structurally identical — Phase 1 locked the shape).
- The `missing_config` branch keeps using
  `getMissingSupabaseConfigMessage()` unchanged.

### `apps/web/src/auth/AuthCallbackPage.tsx`

```ts
export type AuthCallbackPageProps = {
  onNavigate: (path: AuthNextPath) => void;
};

export function AuthCallbackPage(props: AuthCallbackPageProps): JSX.Element;
```

Locked session-establishment sequence (from the overview plan's
"Locked expectations" block, lines 177–199):

1. On mount, parse `validateNextPath(new URLSearchParams(
   window.location.search).get("next"))` once. Store the result; it
   never changes for this component's lifetime.
2. Call `getAuthSession()` to force Supabase client instantiation and
   trigger hash-based session detection
   (`detectSessionInUrl: true` is set at
   [`supabaseBrowser.ts:56`](../../apps/web/src/lib/supabaseBrowser.ts)
   and stays there).
3. Race three promises: the initial `getAuthSession()` result, a
   `SIGNED_IN` event delivered through `subscribeToAuthState`, and a
   10-second `setTimeout` guard.
4. On session resolved (either source), perform the final
   transition through a **single navigation mechanism**. The current
   `usePathnameNavigation.navigate`
   ([`usePathnameNavigation.ts:33-47`](../../apps/web/src/usePathnameNavigation.ts))
   always calls `history.pushState`, which would leave
   `/auth/callback?next=…` in the back-stack; combining it with a
   pre-emptive `replaceState` would duplicate the destination entry
   and make back-button behavior inconsistent (user hits back on
   `/admin`, lands on `/admin` again, then on the previous page).
   Both are disallowed.

   **Locked mechanism:** extend `usePathnameNavigation` with a
   `replace` option — `navigate(path, { replace: true })` — that
   internally uses `history.replaceState` instead of `pushState` and
   still updates the hook's pathname state in one call.
   `AuthCallbackPage` invokes this once:

   ```ts
   onNavigate(validatedNext, { replace: true });
   ```

   where the prop is typed

   ```ts
   onNavigate: (path: AuthNextPath, options?: { replace?: boolean }) => void;
   ```

   `AuthCallbackPage` never touches `window.history` directly. No
   other call site changes behavior: every existing caller of
   `navigate(path)` keeps `pushState` semantics by default. This is
   the only navigation-contract change Phase 2 introduces, and it
   lives in commit 1 (route + rewrite scaffolding) so subsequent
   commits consume the new signature.

   Invariant: at most one history entry exists for the magic-link
   round-trip, and it is the destination (`validatedNext`), not
   `/auth/callback?next=…`.
5. On timeout or persistent `signed_out`, render the neutral
   "sign-in link couldn't be used" state with a link to
   `routes.home`.
6. `AuthCallbackPage` never calls `requestMagicLink` or `signOut`.
   It is a pure consumer of Phase 1 primitives.

Visual treatment during the session-wait window: a minimal
`signin-stack` with a `heading` of "Signing you in…" and no spinner
chrome. Not invisible — the overview's session-wait can be several
seconds on a slow connection, and a blank screen looks broken.

### `apps/web/src/routes.ts`

Add `"/auth/callback"` to the `AppPath` union:

```ts
export type AppPath =
  | "/"
  | "/admin"
  | `/admin/events/${string}`
  | `/event/${string}/game`
  | "/auth/callback";
```

Add `routes.authCallback = "/auth/callback" as AppPath`. No new
matcher function is required; `/auth/callback` is an exact-match path.

At this point `AuthNextPath = Exclude<AppPath, "/auth/callback">`
becomes structurally narrower than `AppPath` (the Phase 1 `Exclude`
activates). No change to `validateNextPath` or to `authApi.ts`'s
`requestMagicLink` signature is required — they were already typed
against `AuthNextPath` in Phase 1.

### `apps/web/vercel.json`

```json
{
  "rewrites": [
    { "source": "/admin/:path*", "destination": "/index.html" },
    { "source": "/event/:path*", "destination": "/index.html" },
    { "source": "/auth/:path*", "destination": "/index.html" }
  ]
}
```

Without the `/auth/:path*` rewrite, production direct-load of
`/auth/callback?next=/admin` returns a 404 at the Vercel edge before
the SPA shell loads.

### `apps/web/src/admin/useAdminDashboard.ts` — migrated

- Replace imports from `./useAdminSession` with imports from
  `../auth/useAuthSession`.
- Replace imports of `requestAdminMagicLink` / `signOutAdmin` from
  `../lib/adminGameApi` with `requestMagicLink` / `signOut` from
  `../lib/authApi`.
- `requestMagicLink` now takes `({ next: routes.admin })` as its
  options argument, matching the Phase 1 contract.
- Rename the local `AdminMagicLinkState` type alias to re-export
  `MagicLinkState` from `../auth/types`, or drop the admin alias
  entirely and consume `MagicLinkState` directly. The hook's return
  shape keeps `magicLinkState` as the field name so
  `AdminDashboardContent` and `AdminPage` don't need prop renames.
- `signOutError` + `isSigningOut` remain in `useAdminDashboard`
  unchanged (see Non-Goals).

### `apps/web/src/admin/AdminDashboardContent.tsx` — migrated

- Replace `import { AdminSignInForm } from "./AdminSignInForm"` with
  `import { SignInForm } from "../auth/SignInForm"` and the admin
  copy constant.
- At the `sessionState.status === "signed_out"` branch
  (`AdminDashboardContent.tsx:107`), render
  `<SignInForm copy={ADMIN_SIGN_IN_COPY} emailInput={emailInput}
  magicLinkState={magicLinkState} onEmailInputChange={onEmailInputChange}
  onSubmit={onSubmitMagicLink} />`.
- Replace the `AdminMagicLinkState` and `AdminSessionState` imports
  with `MagicLinkState` and `AuthSessionState` from `../auth/types`.

### `apps/web/src/pages/AdminPage.tsx` — unchanged

The file does not import any of the deleted symbols; the session hook
is consumed inside `useAdminDashboard`, not here. Verify zero diff.

### `apps/web/src/lib/adminGameApi.ts` — trimmed

- Delete `getAdminSession`, `subscribeToAdminAuthState`,
  `requestAdminMagicLink`, `signOutAdmin`, and the private
  `getAdminAccessToken` function.
- Replace the `getAdminAccessToken` call inside
  `callAuthoringFunction` with `getAccessToken()` from
  `../lib/authApi` (swap the error message `"Admin sign-in is
  required."` for Phase 1's `"Sign-in is required."`).
- Keep `getGameAdminStatus`, `listDraftEventSummaries`,
  `loadDraftEvent`, `saveDraftEvent`, `generateEventCode`,
  `publishDraftEvent`, `unpublishEvent`, `DraftEventRow`,
  `DraftEventSummary`, `DraftEventDetail`, `PublishDraftResult`,
  `UnpublishEventResult`, `mapDraftSummary`, `createFunctionUrl`.

### `apps/web/src/styles/_signin.scss`

Neutral selectors (no `admin-` prefix). Minimal scope — only what
`SignInForm.tsx` and `AuthCallbackPage.tsx` use. The file imports the
same tokens and mixins as `_admin.scss`:

```scss
@use "./mixins" as *;
@use "./tokens" as *;

.signin-stack { @include stack(16px); }
.signin-form { @include stack($space-6); }
.signin-field { @include stack($space-3); }
.signin-field-label { font-weight: $font-weight-bold; color: var(--text); }
.signin-input { /* mirror .admin-input rules */ }
.signin-input:focus-visible { outline: $focus-ring; outline-offset: 2px; }
.signin-message { /* mirror .admin-message */ }
.signin-message-error { /* mirror .admin-message-error */ }
.signin-message-success { /* mirror .admin-message-success */ }
```

Duplication of admin form-primitive rules is intentional and accepted
(overview plan § SCSS scope). The `_admin.scss` selectors that only
`AdminSignInForm` used (`.admin-form` at
[`_admin.scss:32`](../../apps/web/src/styles/_admin.scss) plus any
`.admin-state-stack`-only branches for the sign-in path) may be
trimmed if no remaining admin view uses them — verify before deleting.

### `tests/web/pages/AdminPage.test.tsx` — mock migration

Current mocks (from
[`AdminPage.test.tsx:12-50`](../../tests/web/pages/AdminPage.test.tsx)):

- `mockUseAdminSession` mocking
  `apps/web/src/admin/useAdminSession.ts` →
  `mockUseAuthSession` mocking
  `apps/web/src/auth/useAuthSession.ts`.
- `mockRequestAdminMagicLink` on `apps/web/src/lib/adminGameApi.ts` →
  `mockRequestMagicLink` on `apps/web/src/lib/authApi.ts`.
- `mockSignOutAdmin` on `apps/web/src/lib/adminGameApi.ts` →
  `mockSignOut` on `apps/web/src/lib/authApi.ts`.
- `adminGameApi.ts` mock body keeps the authoring helpers
  (`generateEventCode`, `getGameAdminStatus`,
  `listDraftEventSummaries`, `loadDraftEvent`, `publishDraftEvent`,
  `saveDraftEvent`, `unpublishEvent`) and drops the four deleted
  helpers.
- The `mockRequestAdminMagicLink.toHaveBeenCalledWith(...)` assertion
  at
  [`AdminPage.test.tsx:213`](../../tests/web/pages/AdminPage.test.tsx)
  becomes `mockRequestMagicLink.toHaveBeenCalledWith(
    "admin@example.com", { next: "/admin" })` — the `{ next }`
  options argument is new per the Phase 1 contract.

Every other assertion in the file stays put. The test count stays at
61; no new tests are added to `AdminPage.test.tsx`.

### `tests/e2e/admin-auth-fixture.ts` — redirect migration

At
[`admin-auth-fixture.ts:37`](../../tests/e2e/admin-auth-fixture.ts):

```ts
const defaultAdminRedirectUrl =
  "http://127.0.0.1:4173/auth/callback?next=/admin";
```

At
[`admin-auth-fixture.ts:71-73`](../../tests/e2e/admin-auth-fixture.ts):

```ts
adminRedirectUrl:
  readOptionalEnv("TEST_ADMIN_REDIRECT_URL") ??
  (baseUrl ? `${baseUrl}/auth/callback?next=/admin` : defaultAdminRedirectUrl),
```

`PRODUCTION_SMOKE_ADMIN_REDIRECT_URL` default changes in lockstep
(see docs updates below).

## Target Structure

```
apps/web/src/
├── auth/
│   ├── AuthCallbackPage.tsx   (new)
│   ├── SignInForm.tsx          (new)
│   ├── useAuthSession.ts       (new)
│   ├── validateNextPath.ts     (Phase 1, unchanged)
│   └── types.ts                (Phase 1, unchanged)
├── admin/
│   ├── AdminDashboardContent.tsx   (migrated: imports SignInForm, MagicLinkState, AuthSessionState)
│   ├── AdminPage*.tsx              (unchanged)
│   ├── useAdminDashboard.ts        (migrated: imports useAuthSession, requestMagicLink, signOut)
│   ├── AdminSignInForm.tsx         DELETED
│   └── useAdminSession.ts          DELETED
├── lib/
│   ├── authApi.ts              (Phase 1, unchanged)
│   └── adminGameApi.ts         (trimmed: four helpers + getAdminAccessToken deleted)
├── pages/
│   └── AdminPage.tsx           (unchanged)
├── styles/
│   ├── _admin.scss             (trimmed: sign-in-only selectors removed if unused elsewhere)
│   └── _signin.scss            (new)
├── App.tsx                      (extended: /auth/callback branch before other matchers)
└── routes.ts                    (extended: AppPath includes "/auth/callback"; routes.authCallback)

apps/web/
└── vercel.json                  (extended: /auth/:path* rewrite)

tests/web/
├── auth/
│   ├── validateNextPath.test.ts        (Phase 1, unchanged)
│   └── AuthCallbackPage.test.tsx       (new)
└── pages/
    └── AdminPage.test.tsx              (mock migration)

tests/e2e/
└── admin-auth-fixture.ts               (redirect URL migration)

docs/
├── architecture.md                      (rewrite: route enumeration + magic-link paragraph)
├── dev.md                               (rewrite: :151 paragraph)
├── operations.md                        (rewrite: :162 Auth URL block, :184 checklist step)
└── tracking/production-admin-smoke-tracking.md  (rewrite: :88 default)

apps/web/src/admin/README.md             (rewrite: references to AdminSignInForm/useAdminSession)
README.md                                (rewrite: :129 bullet list)
```

Files created: 4. Files deleted: 2. Files migrated: 6. Files rewritten
for docs: 5. Total surface: roughly 200 lines of net new code, a
similar amount of deleted code, and concentrated doc edits.

## Rollout Sequence

1. **Baseline validation.** `npm run lint`, `npm test`,
   `npm run build:web` on a clean tree pulled from `main`. Stop and
   report any pre-existing failure before editing. Also confirm the
   Phase 1 follow-up test file is present on `main` as the
   prerequisite gate:

   ```sh
   test -f tests/web/lib/authApi.test.ts && \
     npx vitest run tests/web/lib/authApi.test.ts
   ```

   If the file is missing, stop — land the Phase 1 Commit 3 on
   `main` first, then restart Phase 2. See the Phase 1 plan's
   § Status and § Tests for the required assertion set.
2. **Commit 1 — route + rewrite scaffolding + navigate replace
   option.** Extend `AppPath`, add `routes.authCallback`, wire the
   `/auth/callback` branch into `App.tsx` rendering a stub
   `AuthCallbackPage` that simply calls
   `onNavigate(routes.home, { replace: true })`, add the Vercel
   rewrite. Extend `usePathnameNavigation.navigate` with the
   `{ replace?: boolean }` option described in § AuthCallbackPage
   step 4: `replace: true` uses `history.replaceState`;
   default/absent stays on `history.pushState` so every existing
   caller keeps today's semantics. This commit is where the
   navigation-contract change lives so subsequent commits consume
   the new signature. Add a focused Vitest case for the
   `usePathnameNavigation` extension asserting
   `history.replaceState` is called when `replace: true` and
   `pushState` is not. Validate.
3. **Commit 2 — auth primitives: SignInForm, useAuthSession,
   AuthCallbackPage.** Implement the three new files against the
   locked contracts above. Replace the stub callback with the real
   implementation (race `getAuthSession()` / `SIGNED_IN` / 10s
   timeout → `onNavigate(validatedNext, { replace: true })`). Add
   `tests/web/auth/AuthCallbackPage.test.tsx` with the invariants
   listed under § Tests. Validate.
4. **Commit 3 — SCSS partial.** Add `_signin.scss` and ensure it is
   imported from the project's SCSS entry. Trim `_admin.scss`
   selectors that only `AdminSignInForm` used once usage analysis
   confirms they are unreferenced elsewhere. Validate (visual parity
   is covered by the manual round-trip in step 7, not here).
5. **Commit 4 — admin-shell migration.** Migrate
   `AdminDashboardContent`, `useAdminDashboard` onto the new
   primitives. Delete `AdminSignInForm.tsx`, `useAdminSession.ts`,
   and the four helpers + `getAdminAccessToken` from
   `adminGameApi.ts`. Update `tests/web/pages/AdminPage.test.tsx`
   mocks and the `toHaveBeenCalledWith` assertion at line 213 for the
   new `{ next: "/admin" }` argument shape. Validate — all 61 admin
   tests still pass.
6. **Commit 5 — e2e + production smoke.** Update
   `tests/e2e/admin-auth-fixture.ts` redirect composition. Update
   `docs/tracking/production-admin-smoke-tracking.md:88` default.
7. **Commit 6 — docs rewrite.** Rewrite the five listed docs to
   name `<origin>/auth/callback` as the magic-link return URL. Run
   the lint/build on a clean tree to confirm no code change slipped
   into the docs commit.
8. **Manual magic-link round-trip.** On a local Supabase project:
   add `<origin>/auth/callback` to the Supabase Auth redirect URL
   allowlist, start the dev server, request a magic link from
   `/admin`, follow the email link, confirm the flow lands on
   `/admin` with a signed-in session. Then deliberately open
   `/auth/callback?next=https://evil.com/foo` and confirm it
   redirects to `routes.home` instead of leaving the user on
   `evil.com`. Capture a short note of the two round-trips for the
   PR body.
9. **Automated code-review feedback loop.** Review from a
   senior-engineer / security-review stance for:
   - admin-specific wording leaked into `SignInForm` or
     `AuthCallbackPage`;
   - a missed Vercel rewrite (CI and local dev both work without
     the rewrite because Vite serves `index.html` for any path —
     the gap only surfaces in Vercel deployments);
   - `AuthCallbackPage` navigating before the session is available
     (race window);
   - `AuthCallbackPage` calling `onNavigate` more than once, or
     reaching into `window.history` directly — both violate the
     single-mechanism contract;
   - `navigate(path, { replace: true })` forgetting to preserve
     the pathname encoding for admin-event routes;
   - `callAuthoringFunction` accidentally being called before
     session restoration in a test env, now that the error message
     changed from `"Admin sign-in is required."` to
     `"Sign-in is required."`;
   - any remaining reference to the deleted admin helpers, via a
     single alternation search against the code surface only (the
     plan docs themselves name these symbols, so `docs/` is excluded
     by design):

     ```sh
     rg -n \
       'getAdminSession|subscribeToAdminAuthState|requestAdminMagicLink|signOutAdmin|getAdminAccessToken|AdminMagicLinkState|AdminSessionState' \
       apps/web/src tests
     ```

     Expected exit code: `1` (no matches). A non-empty result blocks
     merge.

   Land review-fix commits separately when they clarify history.
10. **Structure review.** Confirm `apps/web/src/auth/` imports no
    admin symbol. Confirm `apps/web/src/admin/` imports auth
    primitives only from `../auth/*` and `../lib/authApi`, never from
    `../lib/adminGameApi` for auth (only for authoring). Confirm
    `apps/web/src/lib/adminGameApi.ts` no longer exports the four
    deleted helpers and no external consumer broke.
11. **Documentation currency sync.** Walk the docs-update checklist
    against the actual content changed. Verify
    `docs/architecture.md` frontend route enumeration now includes
    `/auth/callback`; verify the Runtime Request Flow paragraph at
    `:388` no longer says "explicit `/admin` redirect."
12. **Final validation.** `npm run lint`, `npm test`,
    `npm run build:web` from a clean working tree.
13. **PR preparation.** Open a PR against `main` using the repo PR
    template. PR body must name the Supabase Auth dashboard step
    (add `<origin>/auth/callback` to the redirect URL allowlist per
    environment) as a **merge-time operational action**, not a
    post-merge follow-up.

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `feat(web): register /auth/callback route` | lint, test, build:web |
| 2 | `feat(web): add SignInForm, useAuthSession, AuthCallbackPage` | lint, test, build:web |
| 3 | `feat(web): add _signin.scss neutral sign-in styles` | lint, test, build:web |
| 4 | `refactor(web): migrate admin shell to role-neutral auth primitives` | lint, test, build:web |
| 5 | `chore(tests): point admin e2e fixture at /auth/callback redirect` | lint, test, build:web |
| 6 | `docs: rewrite magic-link return URL references to /auth/callback` | lint, build:web |

Review-fix commits, if any, land after commit 6.

## Tests

### `tests/web/auth/AuthCallbackPage.test.tsx` (new)

Vitest + React Testing Library. Passes a mock `onNavigate`
(`vi.fn()`) into `AuthCallbackPage` and asserts against its calls.
Mocks `apps/web/src/lib/authApi.ts` (`getAuthSession`,
`subscribeToAuthState`) and `apps/web/src/auth/validateNextPath.ts`
(spy through to the real implementation so positive cases exercise
the real validator). `window.location.search` is stubbed per test.

Required assertions:

1. **Validated `next` from initial `getAuthSession`.** `getAuthSession`
   resolves to a truthy session, `next=/admin`. Expect `onNavigate`
   to have been called exactly once with
   `("/admin", { replace: true })`, and the component to render
   nothing user-visible once redirected.
2. **Validated `next` from `SIGNED_IN` event.** `getAuthSession`
   resolves null, `subscribeToAuthState` fires `SIGNED_IN` with a
   session. Expect `onNavigate` called once with
   `("/admin", { replace: true })`.
3. **Bypass vector rejected.** `next=https://evil.com/foo`. Expect
   `onNavigate` called once with `(routes.home, { replace: true })`,
   never with `evil.com`.
4. **`/auth/callback` self-loop rejected.** `next=/auth/callback`.
   Expect `onNavigate` called once with
   `(routes.home, { replace: true })`.
5. **Missing `next`.** No `next` query. Expect `onNavigate` called
   once with `(routes.home, { replace: true })`.
6. **Timeout.** `getAuthSession` resolves null; `subscribeToAuthState`
   never fires. After the 10s guard fires (fake timers), expect the
   neutral "sign-in link couldn't be used" rendered state with a
   link to `routes.home`, and **no** `onNavigate` call.
7. **No navigation before session.** Even after `validateNextPath`
   returns, if `getAuthSession` has not yet resolved, `onNavigate`
   must not fire. Enforce by intercepting the promise resolution and
   asserting `onNavigate.mock.calls.length === 0` at that point.
8. **Single-call invariant.** Across every success path, assert
   `onNavigate.mock.calls.length === 1` — never 0 (silent stall) and
   never 2 (the double-navigation bug the single-mechanism
   contract prevents).
9. **No direct `window.history` writes.** Spy on
   `window.history.pushState` and `window.history.replaceState`
   and assert both remain un-called by `AuthCallbackPage`'s own
   code. `usePathnameNavigation`'s mock is separate; the point is
   that the component itself never reaches into `window.history`.
10. **Unsubscribes on unmount.** Unmount mid-wait and assert
    `subscribeToAuthState`'s returned unsubscribe fn was called.

### `tests/web/usePathnameNavigation.test.ts` (new, for the
`{ replace }` option)

Add focused coverage for the navigation-contract extension landed
in commit 1:

- `navigate(path)` without options calls `window.history.pushState`,
  not `replaceState` — preserves today's behavior for every
  existing call site.
- `navigate(path, { replace: true })` calls
  `window.history.replaceState` and does not call `pushState`.
- Both variants update the hook's `pathname` state so React
  rerenders pick up the new route.
- `navigate(path, { replace: false })` is equivalent to the
  no-options call (uses `pushState`).

### `tests/web/pages/AdminPage.test.tsx` (migrated)

No new test cases. Mock identity migration only. Every existing
assertion passes after the migration; the single behavior-visible
change is the `{ next: "/admin" }` argument to `requestMagicLink`,
asserted at the equivalent of line 213.

### `tests/web/auth/validateNextPath.test.ts` (Phase 1, unchanged)

No edits. The `/auth/callback` self-loop case already exists in the
Phase 1 suite and keeps asserting the right thing now that
`AuthNextPath`'s `Exclude` becomes structurally narrower than
`AppPath`.

### `tests/e2e/admin-auth-fixture.ts`

No new tests; the existing e2e suite continues to exercise the
admin-auth fixture. The redirect URL change is the behavior change
the e2e suite validates end-to-end.

## Self-Review Audits

Apply the named audits from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **§ Error-surfacing for user-initiated mutations
  ([`self-review-catalog.md:266`](../self-review-catalog.md)).**
  Walk every user-initiated mutation in the migrated admin shell:
  `requestMagicLink` submit, `signOut` click. Both must surface a
  visible failure banner on rejection. The admin shell already does;
  the migration must not regress that. Also walk
  `AuthCallbackPage`'s timeout path — the "sign-in link couldn't be
  used" state is the failure-feedback surface for the callback,
  and it must include a path back to home.
- **§ Frontend forms & save paths (parent section).** The admin
  sign-in form does not send server-side writes, but the parent
  section still applies because the migrated `callAuthoringFunction`
  now reads `getAccessToken()` from `authApi.ts`. Confirm the error
  surface on the draft-save flow still works when the session is
  missing (the error message changed from `"Admin sign-in is
  required."` to `"Sign-in is required."`).
- **Open-redirect round-trip probe (from overview plan § Deployment
  Gates).** The manual magic-link round-trip in step 8 of the
  rollout includes a deliberate `?next=https://evil.com/foo` probe
  on the deployed local build. This is the operational counterpart
  to the Phase 1 Vitest coverage; reviewers walk it once against
  the live build.

No SQL audit applies. No migration, grant, or RPC change.

## Validation Expectations

- `npm run lint` — passes.
- `npm test` — passes; `validateNextPath.test.ts` unchanged,
  `AuthCallbackPage.test.tsx` adds its new assertions,
  `AdminPage.test.tsx` migrated mocks keep 61 passing tests.
- `npm run build:web` — passes, including the `tsc -b` step that
  proves `AuthNextPath`'s `Exclude` actually narrows now that
  `AppPath` includes `"/auth/callback"`.
- `deno check` — not required; no Edge Function source touched.
- Manual verification — required. Two magic-link round-trips on the
  local build, per step 8 above. Capture the outcomes in the PR body.

## Risks and Mitigations

- **Callback session race.** Navigating before Supabase finishes
  URL-based session detection leaves the target page in a transient
  `signed_out` state, which can bounce the user right back to the
  sign-in form. Mitigated by the locked session-establishment
  sequence (step 3: race `getAuthSession` / `SIGNED_IN` / timeout)
  and by the `AuthCallbackPage.test.tsx` "no navigation before
  session" invariant. Review focus in commit 2.
- **Double-navigation on callback completion.** Combining
  `window.history.replaceState` with `usePathnameNavigation.navigate`
  (which calls `pushState`) would leave two destination entries in
  the history stack, so the user's back button cycles on the same
  page. Mitigated by the locked single-mechanism contract
  (§ AuthCallbackPage step 4): `AuthCallbackPage` calls
  `onNavigate(validatedNext, { replace: true })` exactly once and
  never touches `window.history` directly. The Tests section adds
  a single-call invariant and a "no direct history writes" spy
  assertion. Navigation-contract extension lives in commit 1 so
  subsequent commits consume the new signature.
- **Missed Vercel rewrite.** Local dev never notices the missing
  rewrite (Vite serves `index.html` for any path); the gap only
  surfaces on production direct-loads of the magic-link return URL.
  Mitigated by the explicit commit in the rollout, and by the
  production smoke workflow exercising the actual magic-link
  round-trip on the deployed build once post-merge.
- **Supabase Auth dashboard drift.** Phase 2 requires
  `<origin>/auth/callback` in the redirect URL allowlist across
  every environment. Not tracked in git. Mitigated by naming it in
  the PR body as a merge-time operational action, and by
  `docs/operations.md` rewriting to describe the new allowlist
  entry as the single source of truth per environment. Reviewers
  should coordinate the dashboard update before clicking merge.
- **Forgotten admin import.** After commit 4, the following
  alternation search must return zero hits (exit code `1`) against
  the code surface — the plan documents themselves name these
  symbols, so `docs/` is excluded by design:

  ```sh
  rg -n \
    'getAdminSession|subscribeToAdminAuthState|requestAdminMagicLink|signOutAdmin|getAdminAccessToken|AdminMagicLinkState|AdminSessionState' \
    apps/web/src tests
  ```

  Mitigated by a pre-push verification step in the rollout (see
  § Rollout Sequence step 9), which runs this exact command.
- **SCSS regressions.** Duplicating admin form primitives into
  `_signin.scss` risks visual drift vs. today's admin shell.
  Mitigated by the manual round-trip (step 8); the test suite does
  not check SCSS pixel output.
- **AuthCallbackPage dead-states.** If `validateNextPath` returns
  `routes.home` but the user was trying to reach an event workspace,
  the behavior is "land on home." That is deliberate — same-origin
  unmatched paths fall through to home. Mitigated by the Phase 1
  bypass-vector suite; Phase 2 inherits it unchanged.
- **e2e fixture drift.** If `tests/e2e/admin-auth-fixture.ts` is
  updated but the corresponding GitHub Actions env var is not
  coordinated, the production-admin-smoke job fails with a redirect
  URL mismatch. Mitigated by the single-commit change to the
  fixture plus the tracking doc update in commit 5.

## Rollback Plan

Phase 2 rollback is a straight revert. The new `/auth/callback` route
disappears, the admin shell returns to the old helpers, and the
hardcoded `emailRedirectTo: routes.admin` is restored. No migration
to reverse. The Supabase Auth dashboard `<origin>/auth/callback`
allowlist entry can stay in place safely (it just becomes unused),
which means a re-land after fixes does not require re-coordinating
the dashboard.

Phase 1 stays in place through any Phase 2 rollback — the primitive
surface is still useful to Phase B even if Phase 2's consumers go
away temporarily.

If a post-merge production incident requires rapid rollback (magic
links broken for admins), the revert PR targets commits 1 through 6
inclusive. Do not partial-revert: the admin migration (commit 4)
depends on commits 1–3 and vice versa.

## Resolved Decisions

Inherited from the overview plan § Resolved Decisions, applied at
Phase 2 granularity:

- **Magic-link return URL.** Single `/auth/callback?next=…` per
  environment. No admin-specific redirect.
- **Validator consumer.** `AuthCallbackPage` consumes
  `validateNextPath` unchanged. No parallel validation.
- **Type surface.** `AppPath` gains `"/auth/callback"`;
  `AuthNextPath`'s `Exclude` keeps sync automatic.
- **SCSS scope.** `_signin.scss` with neutral names; admin form
  primitives stay where they are in `_admin.scss`. Duplication
  accepted.
- **`getAccessToken` location.** Role-neutral in `authApi.ts` (Phase
  1). Admin authoring migrates to it.

Phase-local decisions (previously open; resolved in this plan):

- **SignInForm `copy` shape.** Seven fields (`eyebrow`, `heading`,
  `emailLabel`, `emailPlaceholder`, `emailInputId`,
  `submitLabelIdle`, `submitLabelPending`). Admin shell passes a
  verbatim port of today's admin copy; success/error strings stay
  inside `magicLinkState.message`, not in `copy`.
- **`AuthCallbackPage` visual treatment during session-wait.**
  Minimal neutral shell with a "Signing you in…" heading — not
  invisible. A multi-second blank screen looks broken; a small
  shared treatment keeps the UX coherent.
- **`signOutError` + `isSigningOut` ownership.** Stay inside
  `useAdminDashboard` for Phase 2. Extraction is deferred until
  Phase B has a concrete second consumer.
- **`PRODUCTION_SMOKE_ADMIN_REDIRECT_URL`.** Update the default to
  `<PRODUCTION_SMOKE_BASE_URL>/auth/callback?next=/admin`. Keep the
  env var name — the smoke workflow is admin-scoped and the
  suffix `_ADMIN_REDIRECT_URL` still describes intent. No sibling
  env var is added.

Open questions blocking Phase 2: none.

## Handoff After Phase 2

- `/admin` behaves identically from the user's perspective, but
  sign-in transits `/auth/callback?next=/admin` on the return
  trip.
- `/auth/callback` is a role-neutral magic-link return handler that
  consumes any `AuthNextPath` and rejects everything else.
- `SignInForm`, `useAuthSession`, `AuthCallbackPage`, and
  `requestMagicLink({ next })` are the stable, tested primitives
  Phase B (and any future authenticated surface) consumes without
  re-deciding shape.
- The Supabase Auth redirect URL allowlist has one entry per
  environment (`<origin>/auth/callback`). Adding a new authenticated
  route in Phase B requires zero dashboard coordination — only
  extending `AppPath` and the `validateNextPath` allow-list.
- [`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md)
  can schedule B.1 implementation against the stable primitive
  surface.
