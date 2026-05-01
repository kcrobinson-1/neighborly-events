# Reward Redemption — Phase B.1 Execution Plan

**Status:** Landed in commits `5ca8d4d`, `5971a5e`, `30cb2ba`, `95062cb`, `f6422c7`, and `fc37ea5`.
**Parent overview:** [`reward-redemption-phase-b-plan.md`](/docs/plans/archive/reward-redemption-phase-b-plan.md)
**Parent design:** [`reward-redemption-mvp-design.md`](/docs/plans/reward-redemption-mvp-design.md)
**Predecessors (all landed):**
[`auth-signin-generalization-plan.md`](/docs/plans/auth-signin-generalization-plan.md),
[`reward-redemption-phase-a-2b-plan.md`](/docs/plans/archive/reward-redemption-phase-a-2b-plan.md),
[`event-code-prerequisite-plan.md`](/docs/plans/archive/event-code-prerequisite-plan.md).
**Scope:** Phase B.1 only — the `/event/:slug/redeem` mobile operator
route that consumes the landed A.2b `redeem-entitlement` Edge Function
through the landed role-neutral sign-in shell. No monitoring list, no
reversal, no attendee polling, no role seeding, no new Edge Function /
RPC / migration.

## Why B.1 Exists

A.2b shipped `redeem-entitlement` with nothing calling it. The auth
generalization shipped `SignInForm`, `useAuthSession`, `authApi`, and
`/auth/callback` with only the admin shell as a consumer. B.1 wires
the two together into the event-scoped redeem route the design doc
locks at `/event/:slug/redeem` — the first user-visible surface of
the redemption MVP.

B.1 ships inert: no nav link, no `/admin` link, no role seeding. It
becomes usable only after Phase D seeds agent assignments through the
[`supabase/role-management/`](/supabase/role-management/README.md)
runbook. The only user who can complete a redemption on day one is a
root admin, and only when they happen to type the URL. This matches
the overview's unadvertised-entry deployment posture and keeps rollout
control in Phase D.

## Summary

Add one new client route, `/event/:slug/redeem`, gated by the
generalized sign-in shell. When an authenticated caller is an agent
for the slug's event (or a root admin), render a mobile split-screen
redeem surface: locked event-context badge, 4-digit code preview and
result card on top, persistent numeric keypad on the bottom. Submit
calls `redeem-entitlement` with `{ eventId, codeSuffix }` using the
caller's bearer token. Map the A.2b envelope to the three view states
the design doc names (before/ready, success, rejected).

When an authenticated caller is not an agent or root admin for the
slug, render a role-gate state that does not disclose whether the
event exists. When no caller is signed in, render `SignInForm` with
redemption-specific copy and return through `/auth/callback?next=`
pointing back at the redeem route.

After this phase merges, the operator redeem flow is reachable by
direct URL. Phase B.2 adds the monitoring surface; Phase C adds
attendee polling; Phase D seeds roles so real agents can use B.1.

## Goals

- `/event/:slug/redeem` renders correctly for authorized callers on a
  mobile viewport, including the before-state keypad, success state,
  and the three rejected-state variants.
- Unauthenticated callers see `SignInForm` with redemption-specific
  copy; magic-link return lands on `/auth/callback?next=` and routes
  back to the same `/event/:slug/redeem`.
- Authenticated-but-unassigned callers see an in-place role-gate
  state whose copy does not reveal whether the event exists.
- Authenticated callers whose authorization resolver fails with a
  transient error (network / 5xx / shape) see a retryable inline
  banner instead of the role-gate copy, so a temporary
  Supabase/PostgREST outage does not misreport a valid agent as
  permission-denied.
- Submit calls `redeem-entitlement` with the caller's bearer token
  forwarded; the A.2b envelope is mapped deterministically to the
  three view states named in the design doc §"UX philosophy for
  `/event/:slug/redeem`".
- `AppPath`, `routes`, and `validateNextPath` recognize the new route
  so the sign-in return round-trip works and cannot open-redirect.
- A focused Vitest file pins keypad state-machine behavior; a
  mobile-viewport Playwright smoke exercises the dominant flow (sign
  in, enter 4 digits, submit, observe success) against local Supabase
  plus local Edge Functions with a seeded agent fixture.
- The Phase B.1 plan doc flips `Status` to `Landed` in the same PR
  that implements it, with the implementing commit SHAs recorded.
- Touched docs (`docs/architecture.md`, `docs/backlog.md`, the Phase B
  overview's sub-phase summary) reflect the implemented state before
  handoff.

## Non-Goals

- Monitoring list, filters, suffix search, bottom-sheet detail view,
  reversal flow — all B.2.
- Attendee completion-screen polling or `Refresh status` affordance —
  Phase C, against the landed `get-redemption-status` endpoint.
- Role seeding, runbook execution, volunteer dry run — Phase D.
- Any new Edge Function, RPC, migration, or SQL change. If B.1
  discovers a need, stop and reopen the A.2a/A.2b boundary.
- Any realtime subscription, offline queue, or service worker.
- Any multi-event picker or cross-event list.
- Any nav entry, admin link, or marketing surface pointing at
  `/event/:slug/redeem`.
- Any attempt to distinguish "event does not exist" from "you are not
  authorized" in UI copy. Both collapse into one role-gate state.

## Locked Contracts

### Route surface

- `AppPath` gains `` `/event/${string}/redeem` `` alongside the
  existing `` `/event/${string}/game` `` literal.
- `routes` gains `eventRedeem(slug: string): AppPath`, mirroring the
  shape of `routes.game(slug)` (percent-encoded slug segment).
- A new matcher `matchEventRedeemPath(pathname: string)` returns
  `{ slug } | null`, mirroring `matchGamePath`.
- `validateNextPath` adds a positive branch for the new matcher so
  `/event/:slug/redeem` is an accepted post-sign-in destination.
  `AuthNextPath`'s `Exclude<AppPath, "/auth/callback">` narrowing
  picks up the new literal automatically; no parallel type is
  introduced.

No Supabase Auth dashboard change is required. `/auth/callback` is
already in the redirect URL allowlist and the magic-link redirect is
computed at call time from `routes.authCallback` plus the validated
`next`.

### Sign-in copy

`SignInForm` is consumed unchanged with B.1-specific copy:

- `eyebrow`: "Redemption"
- `heading`: "Sign in to redeem codes"
- `emailLabel`: "Email"
- `emailPlaceholder`: "agent@example.com"
- `emailInputId`: `redeem-signin-email`
- `submitLabelIdle`: "Send sign-in link"
- `submitLabelPending`: "Sending..."

The exact strings are part of the contract so the Playwright smoke
can assert them directly rather than pinning component internals.

### Authorization gate

For an authenticated caller and a URL slug, the route resolves
exactly one of three verdicts before any keypad input is accepted.
The three-verdict shape is load-bearing: collapsing transient
failures into the role-gate would tell a valid agent "Not available
for this event" during a temporary Supabase/PostgREST outage,
contradicting the design doc §8 contract that transient operator
read failures show a retryable inline banner with a single
automatic retry.

- **authorized** — the `game_events` read by slug returns a row
  **and** `public.is_agent_for_event(event_id)` or
  `public.is_root_admin()` returns true. Keypad active; event badge
  shows the locked event acronym from `game_events.event_code`.
- **role_gate** — a definitive "no" answer: the `game_events` read
  succeeds but returns no row for the slug, **or** the read returns
  a row and both role RPCs return false. Renders the single
  non-leaking copy block below. Both definitive-no branches share
  one render path so the design doc §6 non-leakage policy and the
  Phase B overview's "does not disclose whether the event exists"
  rule hold.

  > **Not available for this event.** Your account is not set up to
  > redeem codes here. If you think this is a mistake, check with the
  > event organizer.

- **transient_error** — the `game_events` read or either role RPC
  fails with a network error, timeout, 5xx response, or a
  shape-unexpected body. Renders the inline retry banner described
  in the `rejected — network/5xx/401` view-state row below with a
  single automatic retry at ~2s backoff before the banner persists.
  Never renders the role-gate copy; a transient failure must not be
  reported as a permission denial.

The authorization gate runs client-side against existing surfaces
only. No new Edge Function, RPC, or migration lands in B.1. The
implementer consumes existing readable surfaces: a `game_events`
read for `(event_id, event_code)` resolution by slug, plus
`public.is_agent_for_event(text)` and `public.is_root_admin()` RPCs
through the Supabase browser client with the caller's JWT. If any
existing surface cannot distinguish definitive-no from transient
failure (for example, a read path that conflates "no row" and
"RLS-filtered" in a way the client cannot tell apart), that is a
stop-and-report moment and the A.2b boundary reopens rather than
Phase B widening into a new backend surface.

### Code input

- The acronym prefix is derived from `game_events.event_code` for the
  resolved event and is **displayed**, never user-entered.
- The caller enters exactly four ASCII digits through the on-screen
  numeric keypad. Physical-keyboard digit entry is also accepted for
  desktop testing, but the keypad is the primary input surface and
  does not rely on the OS keyboard.
- The input is normalized to `^\d{4}$` before enabling Submit.
  Non-matching shapes disable Submit rather than producing an error
  message — the keypad prevents entry of the wrong shape at the
  affordance level.
- The request body sent to `redeem-entitlement` is exactly
  `{ eventId, codeSuffix }` per the A.2b contract; no `reason` field,
  no client-side rewriting of the prefix.

### View-state mapping

The three states come directly from the design doc §"UX philosophy for
`/event/:slug/redeem`":

| State | Trigger | Observable behavior |
|-------|---------|---------------------|
| **before/ready** | Authorized, no pending request, no prior result, or "Redeem Next Code" pressed | Event badge + 4-digit preview + idle result card; keypad active; Submit disabled until exactly four digits are entered |
| **success — `redeemed_now`** | `redeem-entitlement` returns `{ outcome: "success", result: "redeemed_now", redeemed_at, redeemed_by_role }` | Strong success treatment, "Redeemed" copy, localized `redeemed_at` timestamp, `redeemed_by_role` hint, "Redeem Next Code" primary CTA |
| **success — `already_redeemed`** | Same envelope with `result: "already_redeemed"` | Same success treatment; copy reads "Already redeemed"; same timestamp/actor/CTA |
| **rejected — `not_authorized`** | HTTP 403 with `{ error, details: "not_authorized" }` | "Not authorized for this code" copy; "Clear" and "Try again" recovery actions; does not reveal whether the code exists in any other event |
| **rejected — `not_found`** | HTTP 404 with `{ error, details: "not_found" }` | "Code not found" copy (generic, non-leaking); "Clear" and "Try again" recovery actions |
| **rejected — network/5xx/401** | Network failure, `500`, or an unexpected `401` mid-session | Non-dismissive inline banner with "Retry" action; one automatic retry with ~2s backoff per the design doc §8 contract before the banner persists; "You are offline" disabled-primary-action treatment on `navigator.onLine === false` |

On **success**, the keypad input is cleared and the result card
persists until the operator taps "Redeem Next Code" (or starts
entering new digits, which resets the result card to idle). This
matches the design doc's "accelerate transition to the next attendee"
goal without the operator losing the prior outcome record on-screen.

### Styling tokens

- Reuse existing tokens from
  [`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
  for colors, spacing, radii, and shadows wherever a token exists.
- Introduce new tokens only for values that will be reused by B.2
  (result-card surfaces, status-badge palettes for redeemed /
  reversed / error). New tokens land in B.1 when they are needed
  here first; B.2 reuses rather than re-defines.
- Layout values that are genuinely one-off for the redeem screen
  (e.g. keypad tap-target dimensions) stay local to the new SCSS
  partial and are not promoted to tokens unless B.2 also needs them.
- New tokens and the reasoning for each go in the commit message of
  the commit that introduces them, not buried in the general
  implementation commit.

## Target Structure

Define responsibilities up front so implementation does not sprawl.

### `apps/web/src/routes.ts`

- extend `AppPath` with the new literal
- add `routes.eventRedeem(slug)` helper
- add `matchEventRedeemPath(pathname)` matcher following the shape of
  `matchGamePath`

### `apps/web/src/auth/validateNextPath.ts`

- add the positive branch that accepts `/event/:slug/redeem` via the
  new matcher
- no change to the bypass-vector reject list

### `apps/web/src/pages/EventRedeemPage.tsx` (new)

- matches the `/event/:slug/redeem` route from `App.tsx` and owns the
  page shell
- composes `useAuthSession` with the authorization resolver and the
  keypad surface
- renders exactly one of: missing-config state, loading state,
  signed-out `SignInForm`, role-gate state, authorized redeem
  surface

### `apps/web/src/redeem/` (new directory)

- `RedeemKeypad.tsx` — the persistent numeric keypad component,
  stateless except for `disabled` / `loading` handling
- `useRedeemKeypadState.ts` — the 0–4 digit buffer, clear/backspace
  transitions, submit-gating predicate (pure, testable)
- `RedeemResultCard.tsx` — renders the idle, success, and rejected
  view states from the mapping table above
- `useRedeemSubmit.ts` — wraps the `redeem-entitlement` fetch, owns
  the 2s-backoff single automatic retry on transient failures, and
  returns a discriminated-union result for `RedeemResultCard`
- `authorizeRedeem.ts` — resolves the slug and caller session into
  one of the three verdicts defined above (`authorized`,
  `role_gate`, `transient_error`); returns
  `{ eventId, eventCode }` only on `authorized`, distinguishes
  definitive-no from transient failure, and owns the single
  automatic 2s-backoff retry before surfacing `transient_error`

If any of these files grows past the size where review becomes hard,
extract further within the B.1 diff rather than widening the phase.

### `apps/web/src/styles/_redeem.scss` (new)

- imports and composes existing tokens
- owns the split-screen mobile layout, keypad tap targets, and
  result-card visual states
- is imported from `apps/web/src/styles.scss` alongside the other
  feature partials

### `apps/web/src/App.tsx`

- route table gains a `matchEventRedeemPath` branch that renders
  `EventRedeemPage`
- no other pages change

### Tests

- `tests/web/routes.test.ts` — add cases for `routes.eventRedeem`,
  `matchEventRedeemPath` round-trip, and URL-encoded slugs
- `tests/web/auth/validateNextPath.test.ts` — add positive cases for
  `/event/:slug/redeem` and a URL-encoded variant
- `tests/web/redeem/useRedeemKeypadState.test.ts` — covers digit
  append, backspace, clear, submit-gating, and the
  "new digit resets idle result" transition
- `tests/web/redeem/RedeemResultCard.test.tsx` — snapshot-free
  assertion on copy and role-check for each view state
- `tests/web/pages/EventRedeemPage.test.tsx` — signed-out renders
  `SignInForm` with the locked copy; authorized caller renders the
  keypad; role-gate caller renders the non-leaking copy block; the
  `next` parameter on the magic-link request round-trips back to
  `/event/:slug/redeem`
- `tests/e2e/mobile-smoke.redeem.spec.ts` (new Playwright spec,
  mobile viewport) — sign in as a seeded agent, enter a 4-digit code
  for a seeded redeemable entitlement, submit, observe the
  `redeemed_now` success treatment, tap "Redeem Next Code", return
  to before/ready.

Playwright harness — B.1 **adds** a dedicated backend-backed
harness rather than reusing `npm run test:e2e`. The default
`npm run test:e2e` (backed by `playwright.config.ts`) matches only
`**/mobile-smoke.spec.ts` and forces
`VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK=true`, so it will not pick up
the new spec and would exercise the frontend against the
browser-only fallback rather than the real `redeem-entitlement`
endpoint. B.1 follows the existing backend-backed wrapper pattern
used by `playwright.admin.config.ts` and
`playwright.attendee-trusted-backend.config.ts`:

- `playwright.redeem.config.ts` (new) — `testDir: "./tests/e2e"`,
  `testMatch: "**/mobile-smoke.redeem.spec.ts"`, `iPhone 13` device,
  `VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK=false`, forwards
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  from the environment;
- `scripts/testing/run-redeem-e2e-tests.cjs` (new) — follows the
  shape of `scripts/testing/run-admin-e2e-tests.cjs`: ensures local
  Supabase is running, starts `functions serve` with the redemption
  envs, applies the seeded-agent fixture, runs
  `playwright --config=playwright.redeem.config.ts`, tears down;
- `package.json` gains `"test:e2e:redeem":
  "node scripts/testing/run-redeem-e2e-tests.cjs"`.

The seeded-agent fixture reuses the landed A.2b seeding machinery —
an event row with an `event_code`, an entitlement row with a known
4-digit suffix, and an `event_role_assignments` row granting the
test user `agent` on the event. If the fixture requires anything
beyond inserts into already-landed tables (a new Edge Function, a
new RPC, or a migration), stop and reopen the Phase A boundary
rather than widening B.1.

## Rollout Sequence

1. **Baseline validation.** On the feature branch before the first
   implementation edit, run `npm run lint`, `npm test`,
   `npm run test:functions`, and `npm run build:web`. Stop and
   report on any pre-existing failure.
2. **Commit 1 — Route surface.** Extend `AppPath`, add
   `routes.eventRedeem`, add `matchEventRedeemPath`, extend
   `validateNextPath`, add the matching Vitest cases. Validate with
   `npm run lint`, `npm test`, and `npm run build:web`.
3. **Commit 2 — Page shell + auth gate.** Add `EventRedeemPage`,
   wire it into `App.tsx`, render the signed-out `SignInForm` with
   the locked copy and `next=/event/:slug/redeem`. Authorized and
   role-gate branches render placeholder content at this commit.
   Validate with `npm run lint`, `npm test`, and `npm run build:web`.
   The Vitest coverage for the signed-out path lands with this
   commit.
4. **Commit 3 — Authorization resolver.** Add `authorizeRedeem.ts`,
   produce `{ eventId, eventCode, verdict: "authorized" | "role_gate" | "transient_error" }`
   from the slug and the auth session, and land the role-gate copy
   block plus the retry-banner handling for the transient branch.
   Validate that the role-gate state is rendered only for definitive
   failures (slug returns no row, roles definitively absent) and
   that the transient-error state is rendered for network / 5xx /
   shape failures. Includes the Vitest coverage for both branches in
   `EventRedeemPage.test.tsx`. Validate with `npm run lint`,
   `npm test`, and `npm run build:web`.
5. **Commit 4 — Keypad + state.** Add `RedeemKeypad`,
   `useRedeemKeypadState`, the new SCSS partial, and the focused
   Vitest suite for the keypad state machine. The authorized branch
   of `EventRedeemPage` now renders the keypad but Submit is a
   no-op. Validate with `npm run lint`, `npm test`, and
   `npm run build:web`.
6. **Commit 5 — Redeem integration.** Add `useRedeemSubmit`,
   `RedeemResultCard`, and wire them into `EventRedeemPage`. Submit
   now calls `redeem-entitlement` with `{ eventId, codeSuffix }` and
   the caller's bearer token. Map the envelope to the view-state
   table. Land the `RedeemResultCard` Vitest coverage and the
   `EventRedeemPage` authorized-happy-path test. Validate with
   `npm run lint`, `npm test`, and `npm run build:web`.
7. **Commit 6 — Playwright mobile smoke.** Add
   `tests/e2e/mobile-smoke.redeem.spec.ts`,
   `playwright.redeem.config.ts`,
   `scripts/testing/run-redeem-e2e-tests.cjs`, and the
   `test:e2e:redeem` entry in `package.json`. Land the seeded-agent
   fixture as inserts into already-landed tables only
   (`game_events`, `game_entitlements`, `event_role_assignments`).
   Exercise it end-to-end locally against local Supabase and local
   Edge Functions via `npm run test:e2e:redeem`. Stop and report if
   the fixture requires a new Edge Function, RPC, or migration —
   that is a Phase A boundary reopen, not a B.1 step.
8. **Automated code-review feedback loop.** Review the branch diff
   from a senior-engineer stance for:
   - open-redirect drift in `validateNextPath`,
   - any code path that distinguishes "event not found" from "not
     authorized" in a way the user sees,
   - silent `void promise` chains in click handlers,
   - missing `Retry` / `Clear` affordances on the rejected states,
   - stale microcopy referring to "admin" vocabulary on the redeem
     surface,
   - token drift against `_tokens.scss`.
   Land review-fix commits separately when that makes the history
   easier to audit.
9. **Self-review audits.** Walk the named audits from
   [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) that
   apply to this diff's surfaces (see § "Self-Review Audits" below).
10. **Documentation currency sync.** Update in-branch, not in a
    follow-up:
    - this plan doc — flip `Status` from `Proposed — not started.`
      to `Landed in commits <SHA list>.` and replace "Proposed" /
      "not started" in every reference to current phase state;
    - [`reward-redemption-phase-b-plan.md`](/docs/plans/archive/reward-redemption-phase-b-plan.md)
      sub-phase summary row for B.1 — the overview already links to
      this plan with a `(Proposed)` marker; flip that marker to
      `(Landed)` and verify no other prose in the overview still
      describes B.1 as "not started";
    - [`docs/architecture.md`](/docs/architecture.md) — add the new
      route under the runtime-flow section and note the unadvertised
      entry posture;
    - [`docs/product.md`](/docs/product.md) — only if the implemented
      capability set actually changed from the pre-branch narrative;
      otherwise leave unchanged and say so in the PR body.

    `docs/backlog.md` is intentionally not in the update list: as of
    this plan's draft, the backlog holds no Phase B.1 entry (phase
    status for redemption lives in the plan docs, not the backlog).
    If a backlog item has been added by the time B.1 merges, update
    it then; if not, add no backlog churn.
11. **Final validation.** On a clean tree, run `npm run lint`,
    `npm test`, `npm run test:functions`, and `npm run build:web`.
    Run the new Playwright spec with `npm run test:e2e:redeem`
    against a local Supabase plus local Edge Functions stack with
    the seeded agent fixture. Do not substitute `npm run test:e2e`:
    that default runner targets `**/mobile-smoke.spec.ts` under the
    prototype-fallback env and would skip the redeem spec while
    reporting success. If any validation cannot be run locally,
    state the blocker explicitly in the PR's Validation section.
12. **Plan-to-PR completion gate.** Walk every Goal, Test, and
    Self-Review audit in this plan and confirm each is either
    satisfied in the PR or explicitly deferred **in this plan doc**
    with written rationale. No soft-commitment language ("optional
    but recommended", "nice to have", "consider adding") remains in
    this plan by merge time.
13. **PR preparation.** Open a PR against `main` using the template
    in [`.github/pull_request_template.md`](/.github/pull_request_template.md).
    State explicitly that B.1 is inert: direct URL works, no nav
    link is added, root admin is the only caller who can complete a
    redemption until Phase D seeds an agent.

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `feat(web): add /event/:slug/redeem route surface` | `npm run lint`, `npm test`, `npm run build:web` |
| 2 | `feat(web): add EventRedeemPage sign-in gate` | `npm run lint`, `npm test`, `npm run build:web` |
| 3 | `feat(web): add redeem authorization resolver` | `npm run lint`, `npm test`, `npm run build:web` |
| 4 | `feat(web): add redeem keypad + state` | `npm run lint`, `npm test`, `npm run build:web` |
| 5 | `feat(web): wire redeem-entitlement into redeem page` | `npm run lint`, `npm test`, `npm run build:web` |
| 6 | `test(e2e): add mobile smoke for /event/:slug/redeem` | `npm run lint`, `npm test`, `npm run test:e2e:redeem` |
| 7 | `docs: flip phase b.1 status and sync architecture` | `npm run lint`, `npm test`, `npm run build:web` |

Review-fix commits, if any, land between 6 and 7.

## Tests

### `tests/web/routes.test.ts`

What the suite must prove:

- `routes.eventRedeem(slug)` returns `` `/event/${encoded slug}/redeem` ``.
- `matchEventRedeemPath` returns `{ slug }` for a valid path and
  `null` for admin, game, home, and malformed paths.
- URL-encoded slugs round-trip through `routes.eventRedeem` +
  `matchEventRedeemPath` without double encoding.

### `tests/web/auth/validateNextPath.test.ts`

What the suite must prove:

- `/event/some-slug/redeem` round-trips as an accepted
  `AuthNextPath`.
- A URL-encoded slug variant round-trips.
- None of the existing bypass vectors start passing because of the
  new branch (re-run the full rejected-inputs table; no new
  allow-list additions beyond the named one).

### `tests/web/redeem/useRedeemKeypadState.test.ts`

What the suite must prove:

- empty buffer + digit → length 1
- length 3 + digit → length 4 and submit-enabled predicate returns
  true
- length 4 + digit → length stays 4 (extra digits are ignored)
- backspace at any length drops exactly one character; backspace at
  length 0 is a no-op
- clear resets to empty and disables submit
- a new digit after a resolved result resets the result to idle

### `tests/web/redeem/RedeemResultCard.test.tsx`

What the suite must prove:

- idle state renders the locked "enter a 4-digit code" copy and no
  "Redeem Next Code" CTA.
- `redeemed_now` renders the success treatment, the formatted
  timestamp, the `redeemed_by_role` hint, and the "Redeem Next Code"
  CTA.
- `already_redeemed` renders the same success treatment with
  "Already redeemed" copy.
- `not_authorized` renders the non-leaking rejection copy and the
  "Clear" / "Try again" recovery actions.
- `not_found` renders the same non-leaking rejection copy shape with
  the "Code not found" heading and the same recovery actions.
- `network` / 5xx renders the `Retry` banner and respects the
  `navigator.onLine === false` disabled-primary-action treatment.

### `tests/web/pages/EventRedeemPage.test.tsx`

What the suite must prove:

- missing-config state renders the locked missing-config copy
  (inherited from `useAuthSession`).
- signed-out renders `SignInForm` with the B.1 copy block verbatim
  and requests a magic link with `next=/event/<slug>/redeem`.
- authorized caller renders the keypad and the locked event badge
  with the resolved `event_code`.
- role-gate caller renders exactly the locked role-gate copy block
  and renders no keypad, no event-existence hint, and no link to
  `/admin`. A test fixture for a slug whose `game_events` read
  returns no row and a separate fixture for a signed-in caller who
  holds neither role both produce identical DOM — the non-leakage
  contract is proven, not asserted by inspection.
- transient-error caller (resolver read fails with a network /
  5xx / shape error) renders the retry banner with a visible
  `Retry` action and does **not** render the role-gate copy block.
  After one simulated automatic retry success, the page transitions
  to the authorized keypad state without a manual reload.
- submitting a 4-digit code invokes `redeem-entitlement` exactly
  once with `{ eventId, codeSuffix }` and the caller's bearer
  token; `redeemed_now` drives the success state.
- "Redeem Next Code" returns the page to before/ready with the
  keypad cleared.

### `tests/e2e/mobile-smoke.redeem.spec.ts`

What the spec must prove, under a mobile viewport against local
Supabase + local Edge Functions with a seeded agent fixture:

- Direct URL load of `/event/<slug>/redeem` renders `SignInForm`.
- Magic-link sign-in (stubbed through the existing e2e harness for
  `/auth/callback`, matching the admin e2e fixture pattern) lands
  on `/event/<slug>/redeem` authorized.
- Entering four digits and submitting calls `redeem-entitlement`
  and renders the `redeemed_now` success treatment.
- "Redeem Next Code" returns to before/ready.
- A second submission of the same code renders the `already_redeemed`
  success treatment — idempotency is user-observable.

## Self-Review Audits

Run the applicable named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- **Frontend/browser surface — `Error-surfacing for user-initiated
  mutations`.** Every redeem submission and every authorization
  probe is a user-initiated async action; every failure path must
  surface visibly with a recovery affordance. Walk the click
  handlers and resolver call sites for silent `void promise`
  chains.
- **Frontend/browser surface — `Post-save reconciliation audit`.**
  After a successful redeem, the result card must reconcile from
  the `redeem-entitlement` response body (`redeemed_at`,
  `redeemed_by_role`, `result`), not from the submitted payload or
  a client clock. Reject any code path that constructs the success
  state from client-local values.
- **CI / validation surface — `Readiness-gate truthfulness audit`.**
  If the new Playwright spec introduces a readiness probe for the
  local Edge Function stack, confirm the probe returns negative
  when the stack is not ready rather than accepting any response
  (including 404) as "ready".
- **SQL surface sentinel — `Grant/body contract audit`.** If
  implementation unexpectedly touches any SQL GRANT, RPC body, or
  migration, stop and reopen the A.2a/A.2b boundary. B.1 is a
  frontend-only phase.

The `Dirty-state tracked-inputs audit` does not apply: the redeem
page has one canonical input (the 4-digit suffix) and a few derived
display values; there is no multi-field form state to reconcile.

## Validation Expectations

- `npm run lint` — passes.
- `npm test` — passes with the new Vitest files.
- `npm run test:functions` — passes; B.1 should not regress the
  landed A.2b Deno suite even though it adds no new function tests.
- `npm run build:web` — passes.
- `npm run test:e2e:redeem` — passes against local Supabase + local
  Edge Functions with the seeded agent fixture, exercising
  `mobile-smoke.redeem.spec.ts` under `playwright.redeem.config.ts`
  with `VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK=false`. `npm run test:e2e`
  alone is insufficient: its config does not match the redeem spec
  and it forces the prototype fallback on.
- Manual sanity: on a local dev server, direct-load
  `/event/<slug>/redeem` while signed out and confirm the sign-in
  copy; sign in as a non-agent and confirm the role-gate copy block
  renders and no event-existence hint leaks; simulate a transient
  read failure (e.g. briefly block the Supabase origin) and confirm
  the retry banner renders instead of the role-gate copy.

If any named validation cannot be run locally, call out the exact
blocker in the PR's Validation section rather than claiming success.

## Risks and Mitigations

- **Role-gate copy leaks event existence.** Any divergence between
  the "slug not readable" branch and the "not authorized" branch is a
  non-leakage regression. Mitigation: one copy block, one render
  path, and a `EventRedeemPage.test.tsx` assertion that walks both
  failure modes and expects identical DOM.
- **Open-redirect regression via `next`.** Any allow-list expansion
  in `validateNextPath` is a security boundary change. Mitigation:
  the new branch goes through `matchEventRedeemPath` only; the full
  bypass-vector table from
  [`validateNextPath.test.ts`](/tests/web/auth/validateNextPath.test.ts)
  is re-run unchanged with no new accepted input beyond the named
  route.
- **Keypad focus loss on submit.** A full-page re-render after a
  resolved submit can steal focus away from the keypad and break
  one-handed operation. Mitigation: `useRedeemKeypadState` retains
  the keypad's mount identity across result transitions; the
  focused Vitest suite covers the reset-on-new-digit transition.
- **401 drift mid-session.** A caller whose Supabase session expires
  between sign-in and submit will see a raw 401 from
  `redeem-entitlement`. Mitigation: the `network/5xx/401` rejected
  state treats 401 as a transient failure with a `Retry` action and
  a single automatic retry, and falls through to the sign-in surface
  if the retry fails — not a silent crash.
- **Playwright smoke drifts from the real flow.** A smoke that stubs
  `redeem-entitlement` rather than calling the real handler passes
  for the wrong reason. Mitigation: the spec runs against local
  Supabase + local Edge Functions with a seeded agent fixture, and
  the PR's Validation section states this explicitly. If the local
  harness cannot be stood up, that is a blocker, not an excuse to
  ship a stubbed spec.
- **Token creep.** Adding many redemption-specific tokens inside B.1
  risks cross-sub-phase collision with B.2. Mitigation: introduce
  tokens only for values that B.2 will reuse (result-card surfaces,
  status-badge palettes); keep one-off layout values local to
  `_redeem.scss`.
- **Scope drift into Phase C or D.** A reviewer asking for "just a
  small attendee refresh" or "just a seeded role in this PR" reopens
  the phase boundary. Mitigation: both are explicit non-goals above;
  stop-and-report if either request lands.

## Rollback Plan

B.1 is frontend-only and deploys inert.

1. Revert the merge commit (or the B.1 PR commit range). The admin
   shell, game route, and auth callback all keep working because the
   new route is additive and the `validateNextPath` change is
   purely an allow-list extension.
2. No database rollback is required: B.1 does not change schema,
   RPCs, RLS, or Edge Functions.
3. No Supabase dashboard change is required: `/auth/callback` is
   already in the redirect URL allowlist and no new entry is
   introduced by B.1.
4. If the revert leaves `routes.eventRedeem` or the new matcher
   unused, that is acceptable: the admin consumer of `SignInForm`,
   `useAuthSession`, and `authApi` still justifies the
   generalization on its own, and the new matcher is a trivial
   follow-up to remove if it genuinely has no remaining consumer.

## Resolved Decisions

- **B.1 ships a focused Vitest suite for keypad state.** Pure
  state-machine logic is cheap to test at the unit level and expensive
  to debug through Playwright; the unit suite is in-scope.
- **B.1 ships its own mobile-viewport Playwright smoke.** Combining
  smokes across B.1 and B.2 delays feedback and mixes reversal UX
  with redemption UX. The two specs remain separate files; a later
  phase can consolidate if the overlap grows.
- **Role-gate uses a single non-leaking copy block.** "No row for
  slug" and "row read but neither role held" share one render path
  and one string.
- **Transient resolver failures are not role-gate failures.** The
  authorization resolver emits three verdicts
  (`authorized`, `role_gate`, `transient_error`); transient failures
  render the retry banner per design doc §8, not the role-gate copy.
- **Acronym prefix is display-only.** The caller enters only four
  digits; the acronym comes from `game_events.event_code` and is
  never echoed back in a user-submittable field.
- **B.1 does not advertise the route.** No nav link, no `/admin`
  link, no marketing surface. Phase D is the only rollout trigger.
- **B.1 does not introduce a shared client cache between routes.**
  The redeem page holds no cross-code lookup cache; each submit is
  independent.

## Open Questions Blocking B.1

None. If implementation discovers that the contracts above cannot
be delivered against the landed A.2b surface without a new Edge
Function, RPC, migration, or SQL grant, stop and reopen the Phase B
overview plus A.2b rather than widening B.1.

## Handoff After B.1

- `/event/:slug/redeem` is reachable by direct URL, deploys inert,
  and renders correctly for authorized, role-gated, and
  signed-out callers on a mobile viewport.
- B.2 can build the monitoring surface against the same sign-in
  shell and the same event-context resolver pattern.
- Phase C can ship the attendee polling surface at any time; it
  shares no UI surface with B.1.
- Phase D can seed a pilot event's agent assignments through the
  runbook once B.2 also lands, after which a real agent can
  complete the full redeem flow from sign-in to success on a
  phone.
