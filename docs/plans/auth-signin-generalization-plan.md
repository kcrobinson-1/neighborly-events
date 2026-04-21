# Auth Sign-In Generalization Plan

**Status:** Proposed — not started.
**Parent context:** Prerequisite for
[`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md).
The redemption operator routes (`/event/:slug/redeem`,
`/event/:slug/redemptions`) need a signed-in Supabase Auth user, but the only
existing sign-in affordance in the app is labelled "Admin" and lives inside
the `/admin` shell. This plan generalizes the Supabase Auth surface so the
next phase consumes a role-neutral sign-in shell without inventing a second
auth system.
**Scope:** Behavior-preserving refactor. No backend change, no new auth
method, no change to allowlist semantics, no new migration.

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

This phase leaves Phase B.1's diff focused on redemption UX instead of
auth-plumbing cleanup, and gives Phase B.2 and any future authenticated
surface the same shared primitives.

## Summary

- Extract the magic-link sign-in view out of `admin/` into a role-neutral
  `auth/` module; rename to `SignInForm` and accept sign-in copy + redirect
  target via props.
- Rename `useAdminSession` → `useAuthSession`; move it to the new `auth/`
  module. Its implementation does not change.
- Split auth helpers out of `adminGameApi.ts` into a new `authApi.ts` under
  `apps/web/src/lib/`. Rename to `getAuthSession` / `subscribeToAuthState` /
  `requestMagicLink` / `signOut`. `requestMagicLink` takes the redirect
  target as an argument rather than hardcoding `routes.admin`.
- Update every current caller inside the admin shell to consume the renamed
  primitives. No user-visible admin behavior or copy changes.
- Validate with `npm run lint`, `npm test`, `npm run build:web`.

After this phase merges, `/admin` still looks and behaves exactly the same,
but the sign-in shell is ready to be consumed by `/event/:slug/redeem` and
`/event/:slug/redemptions` in the following phases.

## Goals

- `apps/web/src/auth/SignInForm.tsx` exists and is role-neutral: no admin
  copy, no admin-specific routing, no admin-specific error states.
- `apps/web/src/auth/useAuthSession.ts` exists and provides the same session
  state machine `useAdminSession` provided (`missing_config` / `loading` /
  `signed_out` / `signed_in`).
- `apps/web/src/lib/authApi.ts` exists and owns the four Supabase Auth
  helpers. Each helper has no hardcoded admin-specific behavior.
- `AdminSignInForm`, `useAdminSession`, `getAdminSession`,
  `subscribeToAdminAuthState`, `requestAdminMagicLink`, and `signOutAdmin`
  are removed from the tree; every caller now consumes the renamed
  primitives.
- `AdminMagicLinkState` either moves to `auth/` as `MagicLinkState` or stays
  admin-local only if it carries admin-specific fields (it does not today).
- `/admin` behavior, copy, and allowlist enforcement are unchanged.
- `npm run lint`, `npm test`, `npm run build:web` pass on a clean tree.

## Non-Goals

- Any behavior change for the admin workspace, admin dashboard, allowlist
  enforcement, or `is_admin()` semantics.
- Any change to Supabase Auth configuration, magic-link delivery, or
  redirect URL allowlists in the Supabase dashboard.
- Any new route, new page, new view, new role gate, or new Edge Function.
- Any change to `adminGameApi.ts` admin-specific helpers that deal with
  draft loading, event publish, magic-link allowlist checks, or similar
  admin-only operations. Only the four Supabase Auth helpers move.
- Any frontend work in `/event/:slug/redeem` or `/event/:slug/redemptions`.
  Those land in Phase B.1 and B.2.
- Any styling token rename, SCSS partial reorganization, or visual
  adjustment beyond what is strictly required to keep the admin sign-in
  screen looking identical after the rename.

## Locked Contracts

### `apps/web/src/auth/SignInForm.tsx`

- Props:

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

- Renders exactly the same DOM/class structure as the current
  `AdminSignInForm` so admin styling is preserved without SCSS edits.
- Does not read routes, admin allowlists, or role context. It is a
  presentation component.

### `apps/web/src/auth/useAuthSession.ts`

- Signature preserves the current state machine:

```ts
export type AuthSessionState =
  | { message: string; status: "missing_config" }
  | { status: "loading" }
  | { status: "signed_out" }
  | { email: string | null; session: Session; status: "signed_in" };

export function useAuthSession(): AuthSessionState;
```

- Internally calls `getAuthSession` + `subscribeToAuthState` from
  `authApi.ts`.

### `apps/web/src/lib/authApi.ts`

- Exports:

```ts
export function getAuthSession(): Promise<Session | null>;

export function subscribeToAuthState(
  onSessionChange: (session: Session | null) => void,
): () => void;

export function requestMagicLink(
  email: string,
  options: { redirectTo: string },
): Promise<void>;

export function signOut(): Promise<void>;
```

- Error messages are role-neutral (`"We couldn't restore your session right
  now."`, `"We couldn't sign out right now."`, etc.). Admin-specific error
  copy stays in the admin shell.
- `requestMagicLink` must not default `redirectTo`. Callers pass
  `routes.admin` or the redemption route explicitly.

### `MagicLinkState`

- Moves to `apps/web/src/auth/types.ts` (or colocated in
  `useAuthSession.ts`) as:

```ts
export type MagicLinkState = {
  message: string | null;
  status: "idle" | "error" | "pending" | "success";
};
```

- `AdminMagicLinkState` is removed in the same commit that introduces the
  new type. No parallel alias remains.

## Target Structure

```
apps/web/src/
├── auth/
│   ├── SignInForm.tsx          (new, generic)
│   ├── useAuthSession.ts       (new, generic)
│   └── types.ts                (new: MagicLinkState, AuthSessionState)
├── admin/
│   ├── AdminDashboardContent.tsx   (updated: consumes SignInForm + copy)
│   ├── useAdminDashboard.ts        (updated: consumes useAuthSession + authApi)
│   ├── AdminSignInForm.tsx         (deleted)
│   └── useAdminSession.ts          (deleted)
└── lib/
    ├── authApi.ts              (new: 4 Supabase Auth helpers)
    └── adminGameApi.ts         (updated: 4 auth helpers removed)
```

### What stays admin-specific

- `AdminPageShell`, `AdminDashboardContent`, `useAdminDashboard` (the hook
  is still admin-specific because it also coordinates the allowlist check
  and draft loading).
- Magic-link copy strings passed by the admin shell into `SignInForm`
  (e.g., `"Send a sign-in link to an admin email."`, `"admin@example.com"`)
  stay inside the admin shell.
- `signOutError` handling, `isSigningOut` state, and the admin "sign out"
  button wiring stay admin-specific for this phase. If Phase B.1 or B.2
  want the same pattern, they re-implement it against the same `signOut()`
  helper rather than sharing state.

## Rollout Sequence

1. **Baseline validation.** On a clean tree, run `npm run lint`,
   `npm test`, and `npm run build:web`. Stop and report any pre-existing
   failure before editing.
2. **Commit 1 — Introduce `authApi.ts`.** Add the four generic helpers
   and the `MagicLinkState` type colocated with a stub
   `apps/web/src/auth/types.ts`. Do **not** remove the admin versions yet.
   Validate with `npm run lint` and `npm run build:web`.
3. **Commit 2 — Introduce `useAuthSession` and `SignInForm`.** Add the
   role-neutral hook and component. Still do not touch the admin shell.
   Validate with `npm run lint` and `npm run build:web`.
4. **Commit 3 — Migrate admin consumers.** Update
   `AdminDashboardContent`, `useAdminDashboard`, and
   `AdminPage` to consume the new primitives. Pass admin copy into
   `SignInForm`. Remove `AdminSignInForm`, `useAdminSession`,
   `AdminMagicLinkState`, and the four auth helpers from
   `adminGameApi.ts`. Validate with `npm run lint`, `npm test`,
   `npm run build:web`.
5. **Automated code-review feedback loop.** Review the diff from a
   senior-engineer stance for: stray admin copy in the generic
   component, hardcoded `routes.admin` still reachable, unused exports
   left behind, admin-specific behavior silently dropped, missing error
   feedback, SCSS class rename drift, type exports no longer reachable.
   Land review-fix commits separately when it helps history readability.
6. **Structure review.** Confirm the new `auth/` directory has no
   admin-only code and that the admin shell has no direct Supabase Auth
   calls. If anything mixed in accidentally, split it back out in the
   same PR.
7. **Documentation currency sync.** Update
   [`docs/architecture.md`](../architecture.md) only if the frontend auth
   flow is described there. Update
   [`apps/web/src/admin/README.md`](../../apps/web/src/admin/README.md)
   if it references the removed files. Do not add docs that merely
   restate the directory layout.
8. **Final validation.** Run `npm run lint`, `npm test`,
   `npm run build:web` from a clean working tree.
9. **Manual verification.** Run `npm run dev:web` locally, visit
   `/admin`, request a magic link, follow it, confirm sign-in, confirm
   sign-out. No behavior should differ from `main`.
10. **PR preparation.** Open a PR against `main` using the repo PR
    template. Frame explicitly as a behavior-preserving refactor that
    unblocks the redemption operator routes.

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `refactor(web): add generic auth helpers module` | `npm run lint`, `npm run build:web` |
| 2 | `refactor(web): add generic auth session hook and sign-in form` | `npm run lint`, `npm run build:web` |
| 3 | `refactor(web): migrate admin shell to generic auth primitives` | `npm run lint`, `npm test`, `npm run build:web` |
| 4 | `docs: note auth surface generalization` *(if docs touched)* | `npm run lint` |

Review-fix commits, if any, land between 3 and 4.

## Tests

This is a behavior-preserving frontend refactor. Test expectations:

- `npm test` continues to pass without weakening any assertion. If a test
  imports `AdminSignInForm` or `useAdminSession` by name, update the import
  to the new module. Do not delete coverage.
- No new Playwright flow is added in this phase. The existing admin smoke
  and trusted-backend attendee smoke must still pass.
- If the existing Vitest suite does not already exercise
  `AdminSignInForm` / `useAdminSession`, do **not** add speculative tests
  here. The manual verification step and the existing admin smoke cover
  behavior continuity. Add a focused Vitest for `SignInForm` copy wiring
  only if the renaming introduces a new branch worth pinning.

## Self-Review Audits

Run the applicable named audits from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **Frontend/browser surface:** `Error-surfacing for user-initiated
  mutations` — every caller of `requestMagicLink` and `signOut` must still
  surface failures. The rename must not silently drop a `.catch` branch.
- **CI / testing infrastructure:** `Rename-aware diff classification` does
  not apply at implementation time (the audit is about CI logic), but
  reviewers should keep it in mind when reading the diff: a rename that
  deletes `adminGameApi.ts` exports must be traceable to new exports in
  `authApi.ts`, not silently dropped.

No SQL audit applies; no migration or RPC changes.

## Validation Expectations

- `npm run lint` — passes.
- `npm test` — passes; no assertion weakened.
- `npm run build:web` — passes.
- Manual `npm run dev:web` round-trip: visit `/admin`, request magic
  link, sign in, sign out. Document the outcome in the PR body.
- `deno check` is not required; no Edge Function source is touched.

## Risks And Mitigations

- **Silent copy drift in the admin sign-in view.** The extracted
  `SignInForm` must render byte-identical DOM and CSS classes under the
  admin copy props; otherwise the admin visual regression is subtle.
  Mitigation: the rollout keeps DOM/class structure locked; the manual
  verification step visits `/admin` before PR.
- **Hardcoded `routes.admin` redirect leaks.** If `requestMagicLink`
  defaults the redirect, an agent sign-in flow would silently bounce to
  `/admin`. Mitigation: make `redirectTo` a required parameter; add a
  type-level enforcement via the options object.
- **Broken import graph after rename.** Moving files out of `admin/` risks
  dangling imports in tests, Vite dev server, or screenshot scripts.
  Mitigation: commit 3 runs the full validation suite and an admin UI
  round-trip before the PR opens.
- **Accidental admin behavior loss.** The admin shell also coordinates
  allowlist error states and magic-link-sent confirmation copy. Moving
  the hook could drop one of those branches. Mitigation: keep
  `useAdminDashboard` as the owner of admin-specific message composition
  and allowlist checks; `useAuthSession` only exposes the generic session
  state.

## Rollback Plan

Rollback is code- and docs-only.

1. Revert the PR. The admin shell returns to its prior imports and
   filenames; no migration or Edge Function state needs undoing.
2. No database or Supabase Auth configuration change to reverse.
3. No follow-up consumer exists in `main` at the time this phase lands
   (Phase B.1 is not yet merged), so the revert does not break any other
   surface.

## Resolved Decisions

- **Names.** `SignInForm`, `useAuthSession`, `AuthSessionState`,
  `MagicLinkState`, `getAuthSession`, `subscribeToAuthState`,
  `requestMagicLink`, `signOut`.
- **Location.** New `apps/web/src/auth/` directory for components and
  hooks; new `apps/web/src/lib/authApi.ts` for Supabase Auth helpers.
- **Copy strategy.** Pass copy via a `copy` prop on `SignInForm` rather
  than baking a `context` enum into the component. Shells own their own
  labels.
- **Redirect target.** `requestMagicLink` takes `redirectTo` as a required
  option. No default.
- **Admin-specific pieces that stay admin-specific.** Magic-link
  allowlist message composition, `signOutError` wiring, draft loading.

Open questions blocking this phase: none.

## Handoff After This Phase

- `/admin` behaves exactly as before but now consumes generic auth
  primitives.
- [`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md)
  can schedule B.1 implementation against the new `SignInForm`,
  `useAuthSession`, and `requestMagicLink({ redirectTo })` primitives.
- The admin allowlist path and the redemption role-assignment path
  coexist cleanly: shared authentication, distinct authorization.
