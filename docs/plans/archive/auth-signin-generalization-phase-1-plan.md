# Auth Sign-In Generalization — Phase 1 Execution Plan

**Status:** Landed. Three commits on `main` satisfy this plan:

- `b16fa24` `feat(web): add role-neutral auth api helpers`
  (landed via [PR #64](https://github.com/kcrobinson-1/neighborly-scavenger-game/pull/64))
- `adc4f3f` `feat(web): add validateNextPath with bypass-vector tests`
  (landed via PR #64)
- `48b3167` `test(web): pin requestMagicLink URL shape and error copy`
  (landed via the PR opened from branch `tests/authApi-url-shape`;
  this is the Commit 3 URL-shape unit suite the plan requires)

Phase 2 is now unblocked; its detail plan's Rollout Sequence step 1
prerequisite check against `main` will pass.
**Parent overview:** [`auth-signin-generalization-plan.md`](../auth-signin-generalization-plan.md)
**Successor:** [`auth-signin-generalization-phase-2-plan.md`](../auth-signin-generalization-phase-2-plan.md)
lands the session hook, sign-in form, callback route, and admin-shell
migration against the Phase 1 foundation.
**Scope:** Phase 1 only — the inert auth primitive surface and the
open-redirect validator. Nothing in `main` consumes any of this at
the end of the phase; the PR is structural and ships safely on its
own.

## Why Phase 1 Exists

Splitting the generalization along a security-review seam isolates
the open-redirect validator from admin-shell migration noise.
Reviewers walk Phase 1 line by line against the bypass-vector test
suite; Phase 2 is then a pure integration review against a stable,
tested surface. This mirrors the A.2a / A.2b logic used for the
redemption work.

A second reason: Phase 1 surfaces are genuinely reusable outside the
immediate admin/redemption split. `authApi.ts`, `validateNextPath`,
and `AuthSessionState` are the primitives any future authenticated
route will consume. Landing them inert means future features do not
have to wait for a parallel behavior change to reuse the shape.

## Summary

Add the role-neutral Supabase Auth helper module, the pure
`validateNextPath` function, the shared `MagicLinkState` and
`AuthSessionState` types, and the exhaustive Vitest coverage of
open-redirect bypass classes. After this PR merges, the codebase has
a tested auth-primitive surface and a tested next-path validator,
but nothing calls any of it.

## Goals

- `apps/web/src/lib/authApi.ts` exists and exports five helpers:
  `getAuthSession`, `subscribeToAuthState`, `requestMagicLink`,
  `signOut`, `getAccessToken`. Each is role-neutral (no admin copy,
  no hardcoded admin routes).
- `apps/web/src/auth/validateNextPath.ts` exists as a pure function
  `(rawNext: string | null) => AuthNextPath`. Given any input, it
  either returns a router-matcher-known path that is a valid
  post-sign-in destination or falls through to `routes.home`. It
  has no side effects.
- `apps/web/src/auth/types.ts` exists and exports `MagicLinkState`,
  `AuthSessionState`, and `AuthNextPath`. `MagicLinkState` and
  `AuthSessionState` mirror the shape the existing admin code uses
  today so Phase 2's migration is purely rename. `AuthNextPath` is a
  new type that narrows `AppPath` to the subset of paths that are
  valid post-sign-in destinations — specifically excluding transport
  routes like `/auth/callback` (added in Phase 2) — so the type
  system prevents callback self-loops at compile time.
- `tests/web/auth/validateNextPath.test.ts` exists and asserts the
  validator's behavior against every bypass class named in this
  plan plus the positive round-trip cases for every currently-valid
  `AppPath`.
- `tests/web/lib/authApi.test.ts` exists and pins the
  `requestMagicLink` URL-shape contract (origin composition,
  `encodeURIComponent` on `next`, round-trip decoding) plus the
  locked error-copy strings for `getAuthSession`, `signOut`,
  `requestMagicLink`, and `getAccessToken`.
- `npm run lint`, `npm test`, `npm run build:web` pass on a clean
  tree.
- At the end of Phase 1, nothing in `apps/web/src` imports anything
  from `apps/web/src/auth/` or from `apps/web/src/lib/authApi.ts`.
  The admin surface is untouched.

## Non-Goals

- Any UI component, hook, or route. `useAuthSession`, `SignInForm`,
  and `AuthCallbackPage` are Phase 2.
- Any admin-shell change. `AdminSignInForm`, `useAdminSession`, and
  the admin helpers in `adminGameApi.ts` remain in place. The duplicate
  naming is temporary and intentional.
- Any SCSS partial. `_signin.scss` is Phase 2.
- Any Supabase Auth redirect URL allowlist change. No new route is
  reachable, so no dashboard coordination applies.
- Any migration, Edge Function, RPC, or backend change.
- Any change to `routes.ts` beyond what `AppPath` already includes.
  Phase 2 adds `/auth/callback` to the union; Phase 1 does not
  reach into routes.

## Locked Contracts

### `apps/web/src/lib/authApi.ts`

```ts
export async function getAuthSession(): Promise<Session | null>;

export function subscribeToAuthState(
  onSessionChange: (session: Session | null) => void,
): () => void;

export async function requestMagicLink(
  email: string,
  options: { next: AuthNextPath },
): Promise<void>;

export async function signOut(): Promise<void>;

export async function getAccessToken(): Promise<string>;
```

- All helpers use the existing `getBrowserSupabaseClient()` from
  [`supabaseBrowser.ts`](../../../apps/web/src/lib/supabaseBrowser.ts).
- `requestMagicLink` always composes
  `emailRedirectTo = new URL("/auth/callback?next=" + encodeURIComponent(next), window.location.origin).toString()`.
  No admin-specific behavior; `next` is typed as `AuthNextPath` —
  not `AppPath` — so callers cannot pass `/auth/callback` (or any
  future transport-only route) as a post-sign-in destination, and
  the type system rejects arbitrary strings.
- `getAccessToken` returns the current session's access token or
  throws `new Error("Sign-in is required.")` when there is no session.
- Error messages are role-neutral:
  - `getAuthSession`: `"We couldn't restore your session right now."`
  - `signOut`: `"We couldn't sign out right now."`
  - `requestMagicLink`: preserves the Supabase-provided error message
    when present, falling back to
    `"We couldn't send the sign-in link."`.
- None of the helpers reads or references `routes.admin`,
  `is_admin`, or any other admin-specific symbol.

### `apps/web/src/auth/validateNextPath.ts`

```ts
export function validateNextPath(rawNext: string | null): AuthNextPath;
```

Implementation contract:

1. If `rawNext` is `null`, empty, or whitespace-only, return
   `routes.home`.
2. Parse with `new URL(rawNext, window.location.origin)`. If parsing
   throws, return `routes.home`.
3. If `parsed.origin !== window.location.origin`, return
   `routes.home`. This rejects absolute cross-origin URLs,
   protocol-relative `//` URLs, and non-http(s) schemes
   (`javascript:`, `data:`, `mailto:`, etc.) because their parsed
   `.origin` will not match.
4. Match `parsed.pathname` against an allow-list of valid
   post-sign-in destinations:
   - `routes.home` → return `routes.home`.
   - `routes.admin` → return `routes.admin`.
   - `matchAdminEventPath(parsed.pathname)` non-null → return
     `parsed.pathname as AuthNextPath`.
   - `matchGamePath(parsed.pathname)` non-null → return
     `parsed.pathname as AuthNextPath`.
5. Any unmatched pathname → return `routes.home`. This includes
   `/auth/callback` after Phase 2 adds it to `AppPath`:
   transport-only routes are deliberately outside the validator's
   allow-list, so `next=/auth/callback` falls through to home and
   cannot self-loop.
6. Never read or return `parsed.search`, `parsed.hash`, or
   `parsed.href`.

The function does not reach into Phase B route matchers; those get
added to the allow-list as part of each Phase B sub-phase diff, not
here. Sub-phases extend `AppPath` in `routes.ts` and add matcher
branches to `validateNextPath`'s allow-list; `AuthNextPath` stays in
sync automatically via `Exclude<AppPath, "/auth/callback">` and must
not be hand-edited per sub-phase.

### `apps/web/src/auth/types.ts`

```ts
import type { Session } from "@supabase/supabase-js";
import type { AppPath } from "../routes";

export type MagicLinkState = {
  message: string | null;
  status: "idle" | "error" | "pending" | "success";
};

export type AuthSessionState =
  | { message: string; status: "missing_config" }
  | { status: "loading" }
  | { status: "signed_out" }
  | { email: string | null; session: Session; status: "signed_in" };

/**
 * A subset of `AppPath` that is valid as a post-sign-in destination.
 * Transport-only routes like `/auth/callback` (added in Phase 2) are
 * excluded so the type system prevents callback self-loops in
 * `requestMagicLink` and `validateNextPath`.
 *
 * Each Phase B sub-phase that adds a new authenticated destination
 * must extend both `AppPath` (for the router) and leave `AuthNextPath`
 * unchanged; the `Exclude` keeps the narrowing automatic.
 */
export type AuthNextPath = Exclude<AppPath, "/auth/callback">;
```

`MagicLinkState` and `AuthSessionState` are verbatim ports of the
existing `AdminMagicLinkState` and `AdminSessionState` so Phase 2's
migration is a pure rename on the consumer side. `AuthNextPath` is
new; at Phase 1 merge time, `AppPath` does not yet include
`"/auth/callback"`, so `AuthNextPath` is structurally equal to
`AppPath`. The `Exclude` becomes active in Phase 2 when `AppPath`
gains the callback literal.

## Target Structure

```
apps/web/src/
├── auth/
│   ├── validateNextPath.ts     (new, pure)
│   └── types.ts                (new)
└── lib/
    └── authApi.ts              (new)

tests/web/auth/
└── validateNextPath.test.ts    (new)

tests/web/lib/
└── authApi.test.ts             (new — pins URL-shape + error copy)
```

No existing file is modified in Phase 1. `adminGameApi.ts`,
`useAdminSession.ts`, `AdminSignInForm.tsx`, `routes.ts`, and every
admin consumer stay untouched.

## Rollout Sequence

1. **Baseline validation.** On a clean tree, run `npm run lint`,
   `npm test`, and `npm run build:web`. Stop and report any
   pre-existing failure before editing.
2. **Commit 1 — Types and authApi helpers.** Add
   `apps/web/src/auth/types.ts` and `apps/web/src/lib/authApi.ts`
   with the five helpers. Validate with `npm run lint`,
   `npm run build:web`, `npm test`. No consumer imports; the
   TypeScript compile proves the signatures are valid.
3. **Commit 2 — validateNextPath and its test suite.** Add
   `apps/web/src/auth/validateNextPath.ts` and
   `tests/web/auth/validateNextPath.test.ts` with the full
   bypass-vector + positive-case suite described below. Validate
   with `npm run lint`, `npm test`, `npm run build:web`.
4. **Commit 3 — authApi URL-shape and error-copy unit suite.** Add
   `tests/web/lib/authApi.test.ts` pinning the `requestMagicLink`
   URL composition invariant, the `encodeURIComponent` round-trip,
   the email-trim behavior, and every locked error string in
   `authApi.ts`. URL composition is security-adjacent; the suite is
   required in Phase 1, not deferred. Validate with `npm run lint`,
   `npm test`, `npm run build:web`.
5. **Automated code-review feedback loop.** Review from a
   senior-engineer / security-review stance for:
   - bypass classes that should be in the test suite but are not
   - validator logic that branches on string shape rather than on
     the parsed URL's `.origin`
   - accidental use of `.href` or string concatenation for the
     validated result
   - helper methods in `authApi.ts` that still carry admin copy or
     admin routes
   - `requestMagicLink` constructing a malformed callback URL for
     edge-case `next` values (commit 3 pins the happy path; the
     review loop is where reviewers probe whether the suite's
     assertion set is complete)
   - `getAccessToken` error copy that leaks admin-specific wording

   Land review-fix commits separately when they clarify history.
6. **Structure review.** Confirm `apps/web/src/auth/` contains no
   admin-only code and `authApi.ts` imports no admin symbol. Confirm
   no existing file has been modified.
6. **Documentation currency sync.** Walk every repo-policy doc
   surface and record explicitly why each did or did not change in
   Phase 1. No surface is skipped on the "most triggers don't fire"
   vibe; the check is itself the deliverable. Expected resolution for
   Phase 1:

   | Doc | Checked? | Change in Phase 1? | Why |
   |-----|----------|---------------------|-----|
   | [`README.md`](../../../README.md) | yes | no | Phase 1 adds no setup step, env var, or user-facing flow. |
   | [`AGENTS.md`](../../../AGENTS.md) | yes | no | No new agent conventions, planning rules, or debugging norms introduced. |
   | [`docs/architecture.md`](../../architecture.md) | yes | no | Module enumeration at `:60-108` describes live surfaces. The Phase 1 files are inert and unconsumed; describing them alongside live code would mislead. Phase 2 adds them when they become load-bearing in the architecture. |
   | [`docs/operations.md`](../../operations.md) | yes | no | No change to Supabase Auth URL settings, deploy surface, or platform-managed config yet. Phase 2 rewrites the `:162` Auth URL block when the new redirect URL goes live. |
   | [`docs/dev.md`](../../dev.md) | yes | no | Dev loop unchanged; magic-link return URL still targets `/admin` until Phase 2. |
   | [`apps/web/src/admin/README.md`](../../../apps/web/src/admin/README.md) | yes | no | Admin module untouched in Phase 1. |
   | [`docs/self-review-catalog.md`](../../self-review-catalog.md) | yes | no | No new recurring audit pattern yet; catalog entry may land after Phase 2 ships per this plan's Self-Review Audits section. |
   | `docs/tracking/*` | yes | no | No activity-log entry required for an inert foundation PR; the PR body itself is the trace. |

   If any row would flip to "yes" during implementation, stop and add
   the doc edit to this PR rather than carrying doc drift forward
   into Phase 2.
7. **Final validation.** Run `npm run lint`, `npm test`,
   `npm run build:web` from a clean working tree.
8. **PR preparation.** Open a PR against `main` using the repo PR
   template. Frame explicitly as inert foundation: new auth
   primitives plus open-redirect validator, no consumer changes, no
   Supabase Auth dashboard coordination required.

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `feat(web): add role-neutral auth api helpers` | `npm run lint`, `npm test`, `npm run build:web` |
| 2 | `feat(web): add validateNextPath with bypass-vector tests` | `npm run lint`, `npm test`, `npm run build:web` |
| 3 | `test(web): pin requestMagicLink URL shape and error copy` | `npm run lint`, `npm test`, `npm run build:web` |

Review-fix commits, if any, land after commit 3.

## Tests

### `tests/web/auth/validateNextPath.test.ts`

Vitest with `window.location.origin` stubbed to a fixed
`https://example.test`.

**Rejected — must return `routes.home`:**

| Input | Bypass class |
|-------|--------------|
| `"https://evil.com/anything"` | Absolute cross-origin |
| `"http://evil.com/anything"` | Absolute cross-origin + scheme variant |
| `"//evil.com/anything"` | Protocol-relative |
| `"/\\evil.com"` | Backslash path |
| `"javascript:alert(1)"` | `javascript:` scheme |
| `"JavaScript:alert(1)"` | Case variant of `javascript:` |
| `"JAVASCRIPT:alert(1)"` | Uppercase `javascript:` |
| `"data:text/html,<script>..."` | `data:` scheme |
| `"mailto:x@y.com"` | `mailto:` scheme |
| `"file:///etc/passwd"` | `file:` scheme |
| `"/admin/../evil"` | Path traversal (URL normalizes; pin behavior) |
| `"/admin%00/evil"` | Null byte injection |
| `"/unknown/route"` | Not in allow-list |
| `""` | Empty |
| `null` | Null |
| `"   "` | Whitespace only |
| `"http://example.test/admin"` when origin is `https://example.test` | Scheme mismatch |
| `"\u202e/admin"` | RTL override prefix |

**Accepted — must return the unchanged pathname as `AuthNextPath`:**

| Input | Notes |
|-------|-------|
| `"/"` | Home |
| `"/admin"` | Admin dashboard |
| `"/admin/events/some-id"` | Admin event selection |
| `"/admin/events/id%20with%20spaces"` | URL-encoded admin event id |
| `"/event/some-slug/game"` | Attendee game route |
| `"/event/some-slug/game?foo=bar"` | Query is dropped; pathname round-trips |

**Callback self-loop guard:**

A dedicated assertion asserts that `validateNextPath("/auth/callback")`
returns `routes.home`. This is belt-and-suspenders: `AuthNextPath`'s
`Exclude` already prevents callers from typing `/auth/callback` as a
literal `next`, but the validator must also reject it when an
attacker crafts a raw `?next=/auth/callback` query parameter that
bypasses the type system. The assertion lives next to the other
rejected-path entries so reviewers see it alongside the rest of the
defense.

The suite must also assert that `validateNextPath` does not throw
on any input, including intentionally malformed strings.

### `tests/web/lib/authApi.test.ts`

Vitest with `window.location.origin` stubbed to
`https://example.test` and `getBrowserSupabaseClient` mocked via
`vi.hoisted`. The suite mirrors the existing
[`tests/web/lib/adminGameApi.test.ts`](../../../tests/web/lib/adminGameApi.test.ts)
mock pattern for consistency.

**`requestMagicLink` URL composition (required):**

- `next=/admin` → `emailRedirectTo === "https://example.test/auth/callback?next=%2Fadmin"`.
- `next=/admin/events/id-with-dashes` → every `/` is percent-encoded,
  and `new URL(emailRedirectTo).searchParams.get("next")` round-trips
  to the original path.
- Email input is trimmed before the Supabase call.

**Error-copy contracts (pin each locked string):**

- `requestMagicLink`: preserves `error.message` when Supabase
  provides one; falls back to `"We couldn't send the sign-in link."`
  when the message is empty.
- `getAuthSession`: throws
  `"We couldn't restore your session right now."` on error.
- `signOut`: throws `"We couldn't sign out right now."` on error.
- `getAccessToken`: returns the session token when present; throws
  `"Sign-in is required."` when no session exists.

No other test file is added in Phase 1.

## Self-Review Audits

Run the applicable named audits from
[`docs/self-review-catalog.md`](../../self-review-catalog.md):

- **Frontend/browser surface — error-surfacing for user-initiated
  mutations:** `requestMagicLink` and `signOut` must reject with a
  non-empty `Error`. The catalog entry's check applies at every
  call site, but Phase 1 has no call sites yet; the audit mostly
  pins the primitive's contract so Phase 2 inherits it cleanly.
- **Open-redirect validation (phase-specific, no catalog entry
  yet):** reviewers walk every row of the bypass-vector table above
  against the implementation. The expectation is that each entry is
  a Vitest assertion, not just a comment. A follow-up catalog entry
  may land after Phase 2 ships if this pattern recurs.

No SQL audit applies; no migration, grant, or RPC changes.

## Validation Expectations

- `npm run lint` — passes.
- `npm test` — passes; `validateNextPath.test.ts` asserts every
  bypass vector and every positive case, and `authApi.test.ts`
  asserts the `requestMagicLink` URL-shape contract and each locked
  error string.
- `npm run build:web` — passes.
- `deno check` — not required; no Edge Function source touched.
- Manual verification — not required. Nothing is reachable from a
  browser yet.

## Risks And Mitigations

- **A bypass vector gets missed.** The Phase 1 test suite is the
  single place that pins open-redirect defense. Mitigation: the
  table above is the checklist; reviewers walk each row against the
  test file; missing rows are a blocker for merge. Commit 2 is the
  smallest reviewable unit for this.
- **Validator relies on string prefix instead of parsed `.origin`.**
  Historical bypasses in similar validators almost always trace to
  string-prefix checks. Mitigation: the locked contract forbids
  string-prefix checks; the implementation pulls `parsed.origin`
  from the URL API.
- **`requestMagicLink` composes a malformed callback URL.** If
  `encodeURIComponent(next)` is forgotten or the origin is composed
  incorrectly, spaces or slashes in `next` could break the round-trip
  — or worse, a misplaced `//` could cross origins. URL composition
  is security-adjacent, so a deterministic unit suite is **required**
  in Phase 1, not optional. Landing file:
  [`tests/web/lib/authApi.test.ts`](../../../tests/web/lib/authApi.test.ts).
  Required assertions:
  - `emailRedirectTo` equals
    `"https://example.test/auth/callback?next=%2Fadmin"` for
    `next=/admin` and `window.location.origin = "https://example.test"`.
  - Every `/` in `next` is percent-encoded (e.g.
    `/admin/events/id-with-dashes` → `%2Fadmin%2Fevents%2Fid-with-dashes`)
    and the round-trip parse via `URL`/`searchParams.get("next")`
    returns the original unencoded path.
  - Email input is trimmed before the Supabase call.
  - Supabase-provided error messages are preserved; a missing
    Supabase message falls back to the locked role-neutral copy.
  The suite also covers the `getAuthSession` / `signOut` /
  `getAccessToken` error contracts so the entire `authApi.ts`
  surface has at least one pinned assertion per locked error string.
- **Type drift between `AuthSessionState` and the admin consumers.**
  Phase 2 expects a verbatim port. If Phase 1 tightens or alters a
  field, Phase 2's migration becomes a behavior change rather than
  a rename. Mitigation: the locked contract in this plan ties the
  shape to the existing admin types, and Phase 2 is responsible for
  asserting behavior parity at migration time.

## Rollback Plan

Phase 1 is purely additive. Rollback is a revert; nothing imports
anything that would break.

1. Revert the Phase 1 PR.
2. No Supabase Auth configuration change to reverse (none was
   made).
3. No migration, Edge Function, or RPC to reverse.

A rollback also safely precedes a re-land with fixes — the inert
surface means a second attempt can land without depending on the
first.

## Resolved Decisions

All decisions in this plan are inherited from the
[overview plan](../auth-signin-generalization-plan.md) § Resolved
Decisions and applied at the Phase 1 granularity:

- Helper signatures and error copy are role-neutral.
- `requestMagicLink` always targets `/auth/callback?next=...`.
- `validateNextPath` uses a pure router-matcher allow-list with no
  HMAC signing.
- `AuthNextPath` at the API boundary is the type-level gate that
  makes `next` handling safe, narrower than `AppPath` to exclude
  transport-only routes.

Phase-local decisions:

- **Single `requestMagicLink` URL-encoding strategy.**
  `encodeURIComponent(next)` applied to the serialized path before
  composing the callback URL. No double-encoding; no alternative
  serializer.
- **`routes.home` as the safe fallback.** Any rejected input,
  parse failure, or unmatched path returns `routes.home` rather
  than an error or empty string. Callers never see `undefined`.

Open questions blocking Phase 1: none.

## Handoff After Phase 1

- `apps/web/src/lib/authApi.ts` is the stable, tested role-neutral
  helper surface.
- `apps/web/src/auth/validateNextPath.ts` is the stable, tested
  open-redirect defense.
- `apps/web/src/auth/types.ts` shapes match the existing admin
  types verbatim.
- Phase 2's detail plan can lock the session hook, sign-in form,
  callback route, SCSS partial, and admin-shell migration against
  this stable foundation without re-deciding any primitive shape.
- The admin shell continues to use the old helpers unchanged until
  Phase 2 migrates it.
