# Reward Redemption — Phase C.1 Execution Plan

**Status:** Landed — implemented in commits `f690524`
(`feat(web): add attendee redemption status polling hook`), `c9dc424`
(`feat(web): render redemption status on completion screen`), `a145a79`
(`fix(web): preserve fallback completion copy`), and `6dfd5e2`
(`test(e2e): cover attendee redemption status reflection`).
**Parent design:** [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md)
**Predecessors:**
[`reward-redemption-phase-a-2b-plan.md`](./archive/reward-redemption-phase-a-2b-plan.md),
[`reward-redemption-phase-b-1-plan.md`](./reward-redemption-phase-b-1-plan.md),
[`reward-redemption-phase-b-2a-plan.md`](./reward-redemption-phase-b-2a-plan.md),
[`reward-redemption-phase-b-2b-plan.md`](./reward-redemption-phase-b-2b-plan.md)
— landed.
**Scope:** Phase C.1 only — the bare-bones attendee completion-screen
status surface that consumes the landed `get-redemption-status` Edge
Function and reflects redeemed vs unredeemed state via interval polling
while a completion result is in scope. No visibility-API lifecycle
work, no manual `Refresh status` affordance, no formatted-timestamp
copy, no error UI beyond holding the last-known state, no realtime
subscription.

## Why C.1 Exists

Phase A.2b landed the attendee read endpoint and Phase B landed the
operator redeem/reverse surfaces, so a redemption now writes durable
state that an attendee session can legally read back. The attendee
completion screen still does not consume that read. Without this
phase the end-to-end MVP loop in
[`reward-redemption-mvp-design.md` §"End-to-End MVP Flow"](./reward-redemption-mvp-design.md)
step 7 cannot complete: the volunteer redeems but the attendee's screen
never updates.

C.1 is the smallest slice that closes the loop and lets the design's
validation signal — "attendees consistently see redeemed state within 5
seconds while the completion screen is open" — be measured at all. It
deliberately ships only the polling spine and the redeemed-vs-unredeemed
display difference; everything else listed in
[`reward-redemption-mvp-design.md` §"Completion Screen Status (attendee)"](./reward-redemption-mvp-design.md)
becomes a backlog item, not a pre-planned sub-phase.

The phase is intentionally frontend-only. If implementation discovers
that C.1 needs a new endpoint result code, a new payload field, an
auth-helper change, or any backend edit, that is a Phase A boundary
reopen and a stop-and-report moment, not scope for this plan.

## Summary

Add an attendee-only redemption-status read path that polls the landed
`get-redemption-status` Edge Function on a 5-second interval while a
completion result is in scope, and render the resulting status inside
the existing `GameCompletionPanel` so the attendee sees a visible
difference between unredeemed and redeemed.

- a new `useAttendeeRedemptionStatus(eventId)` hook owns transport,
  interval scheduling, mount/unmount cleanup, and one-time 401
  re-bootstrap of the signed session
- the hook seeds with an "unknown" state on first mount and never
  blocks the existing completion-screen first paint
- polling is gated on `complete-game` having returned successfully —
  the hook does not fire during the `isSubmittingCompletion` phase,
  because no entitlement row exists yet and `get-redemption-status`
  would 404 on every pre-completion tick
- the panel renders distinct copy for `unredeemed`, `redeemed`, and
  `unknown`; copy reuses the panel's existing typography and chip
  components
- the panel keeps two orthogonal copy axes: redemption status drives
  the chip, headline, and main body sentence; entitlement-status
  (new vs existing replay) drives the verification-code sub-meta line
  only — the "checked in" terminology that currently encodes
  entitlement.status moves wholly to the redemption-status axis
- when the Supabase backend is disabled and the prototype fallback is
  active, the hook does not poll and the panel renders the existing
  pre-C.1 unredeemed copy unchanged
- transient network failures, 5xx responses, and one stable 401 retry
  failure are silently absorbed so the next tick can recover; no
  attendee-facing error banner ships in C.1

C.1 does not alter the completion-submit flow, the verification-code
display, the answer-review section, or any operator-side surface. The
existing entitlement-status copy is rephrased on the chip/headline/
body axis to free the "checked in" wording for redemption status, but
the entitlement-status distinction itself remains visible on the
verification-code sub-meta line.

## Cross-Cutting Invariants

- Canonical display state comes from the server only. The panel never
  derives `redeemed` from local actions or from the verification code
  itself; it derives it exclusively from the latest successful
  `get-redemption-status` response.
- Polling is gated on entitlement existence, not on panel mount. The
  hook is inert until `complete-game` has returned a completion result
  for the current attempt, because the panel mounts during
  `isSubmittingCompletion` (before any entitlement row exists) and the
  endpoint returns 404 in that window. Unmounting the panel — including
  via game reset — must clear the interval and any in-flight request
  before the next render commits.
- Redemption status and entitlement.status are orthogonal axes on the
  panel. The chip, headline, and main body sentence encode redemption
  status only. The verification-code sub-meta line encodes
  entitlement.status only. No element encodes both.
- The hook is the single owner of the request/response envelope. The
  panel receives a discriminated status union, not raw response fields,
  so future envelope additions do not leak into presentational code.
- Failure absorption is bounded. A 401 triggers exactly one
  re-bootstrap-and-replay per failure; it does not loop. All other
  failure classes hold the last known state and wait for the next
  scheduled tick.
- C.1 introduces the first interval-based fetch in the web app. Its
  cleanup contract is part of the test surface from day one so later
  phases that add visibility handling do not have to retrofit cleanup
  guarantees.

## Goals

- A new `useAttendeeRedemptionStatus(eventId)` hook polls
  `get-redemption-status` every 5 seconds while a non-null `eventId`
  is supplied, and exposes a discriminated
  `{ kind: "unknown" | "unredeemed" | "redeemed" }` status state plus
  the latest server `verificationCode` for cross-check.
- The hook does not fire when `eventId` is null/empty, when the
  Supabase backend is disabled, or when prototype fallback is active.
- `GamePage` passes `eventId` as `latestCompletion ? game.id : null`,
  so the hook is inert during `isSubmittingCompletion` and only begins
  polling once `complete-game` has returned a completion result.
- The hook performs an immediate fetch on mount, then schedules
  recurring fetches at 5-second intervals from the completion of the
  prior tick (not on a fixed wall-clock cadence), so a slow response
  cannot pile up overlapping requests.
- The hook performs at most one in-flight request at a time. If a tick
  fires while a prior request is still pending, the tick is dropped.
- A 401 response triggers exactly one call to `ensureServerSession`
  followed by one replay of the same request, mirroring the landed
  `submitGameCompletionToSupabase` posture in
  [`apps/web/src/lib/gameApi.ts`](../../apps/web/src/lib/gameApi.ts).
  A second 401 in the same tick is treated as a transient failure for
  that tick.
- Transient failures (network error, 5xx, malformed 200, second 401)
  hold the prior status state and wait for the next tick.
- `GameCompletionPanel` renders distinct copy for
  `unknown` vs `unredeemed` vs `redeemed`; the existing verification
  code remains visible across all three states.
- The panel's `unknown` rendering matches the panel's pre-C.1
  unredeemed appearance so the first paint is no worse than today.
- Unmounting the panel clears the interval and aborts any in-flight
  request before the next React commit.
- Focused Vitest coverage pins the hook's lifecycle, transport
  mapping, 401 single-retry, drop-overlap behavior, prototype-fallback
  inertness, and the panel's status-driven copy switch.
- The existing attendee mobile Playwright smoke grows to prove the
  completion screen renders the redeemed copy after an organizer
  redemption against local Supabase plus local Edge Functions.
- The Phase C.1 plan doc flips `Status` to `Landed in commits <SHA
  list>.` in the same PR that implements it.
- The implementation PR updates the matching durable docs in the same
  branch: this plan doc, `README.md`, `docs/architecture.md`,
  `docs/product.md`, and any other touched current-state docs so they
  describe the landed attendee polling surface rather than the pre-C.1
  read-free state.

## Non-Goals

- Page Visibility API pause/resume. The interval keeps running while
  the tab is hidden in C.1; visibility-aware pause is a backlog item.
- Manual `Refresh status` button. The design doc lists it; C.1 does
  not ship it.
- Formatted "Redeemed at 2:14 PM" copy. C.1 ships state-only copy; a
  follow-up cycle owns timestamp formatting and locale handling.
- Visible "Last updated at" stamp on the attendee surface. C.1 does
  not surface freshness metadata.
- Visible attendee-facing error UI for transient failures, 404
  not_found, or repeated 401s. C.1 absorbs failures silently and waits
  for the next tick.
- Reversal-specific copy or transitions. The discriminated status
  union covers `redeemed` and `unredeemed`; a row that flips
  `redeemed → unredeemed` mid-session simply re-renders as
  `unredeemed`. Reversal-aware messaging is a backlog item.
- Realtime / Supabase channel subscriptions. The MVP decision in
  [`reward-redemption-mvp-design.md` §"MVP decision"](./reward-redemption-mvp-design.md)
  remains polling-only.
- Any new Edge Function, RPC, migration, grant, or shared-type field.
- Any change to operator surfaces, the redemptions monitoring route,
  the redeem route, or the agent workspace.
- Any change to `GameCompletionPanel`'s answer-review section,
  verification-code display, chip-state mapping for entitlement
  creation, or focus/scroll behavior.
- Any change to the prototype-fallback completion flow beyond keeping
  it visually identical to today.
- Any extraction of a shared "interval polling" utility. C.1 owns one
  hook; abstraction waits until a second polling site exists.

## Locked Contracts

### Polling lifecycle

- The hook starts polling on mount when `eventId` is non-empty and
  the Supabase backend is enabled. A null/empty `eventId` keeps the
  hook inert; when `eventId` later transitions from null to non-null
  (e.g., `complete-game` resolves), the hook starts the loop at that
  point and not earlier.
- The first fetch fires synchronously inside the mount effect; it is
  not delayed by 5 seconds.
- Subsequent fetches are scheduled 5 seconds after the previous
  request settles (success or failure), via `setTimeout` chained off
  the response handler. The hook does not use `setInterval`.
- A pending request blocks scheduling. If a settle handler runs while
  the component is unmounted, no further timer is scheduled.
- Unmount must:
  - clear any pending `setTimeout`
  - signal an `AbortController` for any in-flight `fetch`
  - prevent any post-unmount `setState` via the standard cancel-flag
    pattern already used in `useGameSession`
- The hook resets internal state when `eventId` changes. The previous
  event's poll loop must terminate before the new one begins.

### Transport contract

- Endpoint:
  `POST <supabaseUrl>/functions/v1/get-redemption-status`
- Request headers: the existing `createServerSessionHeaders` helper
  from [`apps/web/src/lib/gameApi.ts`](../../apps/web/src/lib/gameApi.ts).
  C.1 does not introduce a parallel header builder.
- Request body: `{ eventId: string }`, matching
  `GetRedemptionStatusRequest` in
  [`shared/redemption.ts`](../../shared/redemption.ts).
- `credentials: "include"` so the signed session cookie travels.
- Response mapping uses the landed `RedemptionStatusResponse` type.
  The hook maps:
  - `200 + redemptionStatus === "redeemed"` → `{ kind: "redeemed",
    verificationCode }`
  - `200 + redemptionStatus === "unredeemed"` → `{ kind: "unredeemed",
    verificationCode }`
  - `401` → one re-bootstrap + replay (see auth contract below)
  - `403`, `404`, `400`, `5xx`, network failure, malformed `200` →
    transient failure for this tick; prior state is held
- The hook does not inspect `redeemedAt`, `redemptionReversedAt`, or
  any other field in C.1. They are reserved for a follow-up cycle that
  ships timestamp copy.

### Auth and 401 retry

- Auth is the signed `neighborly_session` cookie issued by
  `issue-session`. The same cookie that gates `complete-game` gates
  `get-redemption-status`.
- A 401 response triggers exactly one call to `ensureServerSession`
  followed by exactly one replay of the same request, identical in
  shape and behavior to
  [`apps/web/src/lib/gameApi.ts:300`](../../apps/web/src/lib/gameApi.ts:300).
- A second 401 within the same tick — or a `ensureServerSession`
  failure — is treated as a transient failure for that tick. The hook
  does not surface a sign-out, prompt, or banner in C.1.
- C.1 does not introduce a separate "session expired" state on the
  attendee surface. The completion screen continues to display the
  last known status until the next successful tick recovers.

### Prototype fallback behavior

- When `getSupabaseConfig().enabled === false` and
  `isPrototypeFallbackEnabled() === true`, the hook returns a stable
  `{ kind: "unknown" }` state and schedules no work.
- When `getSupabaseConfig().enabled === false` and prototype fallback
  is also disabled, the hook still returns `{ kind: "unknown" }` and
  schedules no work; surfacing a missing-config error remains the
  responsibility of the existing pre-completion paths.
- The panel's render for `kind === "unknown"` is visually identical to
  today's pre-C.1 unredeemed render so prototype-mode QA does not
  regress.

### Status-driven panel render

- The panel receives a `status: AttendeeRedemptionStatus` prop from
  `GamePage` (which owns the hook), not by calling the hook itself.
  Keeping the hook one level up preserves the panel's existing
  presentational posture and keeps the test seam stable.
- The panel renders three branches:
  - `unknown`: copy matches today's pre-C.1 appearance for the
    completion-arrived, no-redemption-yet case
  - `unredeemed`: copy matches today's pre-C.1 appearance with the
    "checked in" wording reworked per the copy axes contract below
  - `redeemed`: distinct headline copy and chip state indicating
    check-in is complete; verification code remains visible
- The branch switch must not unmount or remount the verification-code
  block. Copy and chip state change in place.
- The panel does not render a "checking..." spinner during in-flight
  requests in C.1.

### Copy axes: redemption status vs entitlement.status

Today's [`GameCompletionPanel`](../../apps/web/src/game/components/GameCompletionPanel.tsx)
uses `completion.entitlement.status` (`"new"` vs `"existing"`) to drive
the chip text (`"Reward entry ready"` vs `"Already checked in"`) and
the main body sentence (`"You're checked in for the reward."` vs
`"You're still checked in..."`). That `"checked in"` vocabulary is
about whether the entitlement record was created or reused — not about
operator redemption. C.1 introduces a real redemption-state axis, so
the two concepts must stop sharing vocabulary on the same surface.

C.1 locks the assignment of UI elements to axes:

- **Chip text and chip variant** — encode redemption status only.
  - `unknown` / `unredeemed`: a single chip variant indicating "ready
    to be checked in by the volunteer." The current new-vs-existing
    chip distinction collapses on this axis.
  - `redeemed`: a chip variant indicating "checked in by the
    volunteer."
- **Headline (`<h2>`)** — encodes redemption status only.
  - `unknown` / `unredeemed`: the existing
    `"Show this screen at the volunteer table"` instruction.
  - `redeemed`: a new headline indicating check-in is complete.
- **Main body sentence (`<p>` directly under the headline)** —
  encodes redemption status only. The current `"You're checked in..."`
  / `"You're still checked in..."` strings are replaced with copy
  that does not use the `"checked in"` metaphor for the unredeemed
  state, freeing that wording for the redeemed state.
- **Verification-code sub-meta line (the `.token-meta` span)** —
  encodes entitlement.status only. The current new-vs-existing
  distinction (`"Your reward entry is now recorded"` vs
  `"Your earlier reward entry still counts. This replay does not add
  another one."`) stays here verbatim. This element does not
  branch on redemption status.
- **Verification code itself, `.token-instruction`, answer-review
  block, accessibility roles** — unchanged.

Exact wording for the new chip / headline / body strings is a PR-time
decision. The axes contract is what C.1 locks.

### Hook ownership boundary

- `useAttendeeRedemptionStatus` lives under
  `apps/web/src/redemptions/` rather than `apps/web/src/game/` so
  attendee and operator redemption code share one folder. This is a
  filing convention; the hook does not import from or expose anything
  to operator-side modules in C.1.
- The hook is consumed only by `GamePage`. Other surfaces must not
  import it.

## Target Structure

Define the file responsibilities before implementation so the C.1 diff
does not dissolve into ad hoc edits across `game/` and `redemptions/`.

### `apps/web/src/redemptions/useAttendeeRedemptionStatus.ts` (new)

- own the polling lifecycle, transport, and 401-retry flow described
  above
- export a discriminated status union plus a memoized stable identity
  for the current status object so consumers can rely on referential
  equality across no-op renders
- depend on `gameApi.createServerSessionHeaders`,
  `gameApi.ensureServerSession`, `getSupabaseConfig`,
  `isPrototypeFallbackEnabled`, and `shared/redemption` types only

### `apps/web/src/game/components/GameCompletionPanel.tsx`

- accept a new `status: AttendeeRedemptionStatus` prop
- branch the existing chip state and headline copy on `status.kind`
  without restructuring the panel layout
- preserve all existing answer-review rendering, verification-code
  block, and accessibility behavior

### `apps/web/src/pages/GamePage.tsx`

- call `useAttendeeRedemptionStatus(latestCompletion ? game.id : null)`
  so the hook is inert during `isSubmittingCompletion` (panel is
  mounted, but no entitlement row exists yet) and only begins polling
  once `complete-game` has resolved with a completion result
- pass the status into `GameCompletionPanel`
- not introduce any new orchestration beyond the gated hook call and
  the prop pass-through

### `apps/web/src/types/game.ts`

- no changes in C.1. The status type lives in `shared/redemption.ts`
  alongside the existing `RedemptionStatus` literal so attendee and
  operator code share one source of truth.

### `apps/web/src/styles/`

- add only the rules required to switch the completion-panel chip and
  headline appearance between unredeemed and redeemed states
- do not introduce a new attendee-specific token family

### Tests

- add a focused hook test for `useAttendeeRedemptionStatus`
- extend `GameCompletionPanel.test.tsx` with the three status branches
- extend `GamePage.test.tsx` with the page-level wiring
- extend the attendee mobile Playwright smoke rather than creating a
  second runner

## Rollout Sequence

1. **Baseline validation.** On the C.1 feature branch before the
   first implementation edit, run `npm run lint`, `npm test`,
   `npm run test:functions`, and `npm run build:web`. Stop and report
   on any pre-existing failure.
2. **Commit 1 — polling hook.** Add
   `useAttendeeRedemptionStatus.ts` with focused tests for the mount
   fetch, the 5-second chained reschedule, the in-flight drop-overlap
   guard, the unmount cleanup (timer cleared, abort fired,
   post-unmount setState suppressed), the 401 single-retry, the
   transient-failure hold-prior-state behavior, the prototype-fallback
   inertness, and the `eventId` change reset. Validate with
   `npm run lint`, `npm test`, and `npm run build:web`.
3. **Commit 2 — panel + page wiring.** Add the `status` prop on
   `GameCompletionPanel`, branch its chip and headline copy, instantiate
   the hook in `GamePage`, and pass the status through. Update the
   panel and page Vitest suites in the same commit so the wiring
   contract is pinned. Validate with `npm run lint`, `npm test`, and
   `npm run build:web`.
4. **Commit 3 — Playwright extension.** Extend the attendee mobile
   smoke (Playwright config selected by the existing trusted-backend
   runner) so a single happy path proves: attendee completes a game,
   the completion screen renders the unredeemed copy, an operator
   redeems via the local stack, and the attendee screen reflects the
   redeemed copy on a subsequent poll tick. Validate with
   `npm run lint`, `npm test`, `npm run test:functions`, and the
   relevant attendee e2e command (chosen at implementation time from
   the existing Playwright configs; do not invent a new runner).
5. **Automated code-review feedback loop.** Review the branch from a
   senior-engineer/code-review stance, explicitly checking for:
   - polling that survives panel unmount
   - overlapping in-flight requests during a slow response
   - 401 retries that loop instead of capping at one
   - prototype-fallback paths that still hit the network
   - panel rendering that derives `redeemed` from local actions or
     from the verification code rather than the hook's status
   - silent `void` promises in the hook body
   - operator-side imports of the new attendee hook
   - backend file drift; any SQL / Edge Function edit is a scope alarm
   Land review-fix commits separately if that makes the history easier
   to audit.
6. **Self-review audits.** Walk the named audits listed in
   § "Self-Review Audits" below against the implementation commits.
7. **Documentation current-state gate.** Update in the same PR:
   - this plan doc — flip `Status` to `Landed in commits <SHA list>.`
   - [`docs/architecture.md`](../architecture.md) — update the
     attendee/completion description from "no status read" to
     "5-second polling against `get-redemption-status` while the
     completion panel is mounted, with one-time 401 re-bootstrap"
   - [`README.md`](../../README.md) — update the current capability
     summary so the attendee surface no longer reads as
     redemption-status-blind
   - [`docs/product.md`](../product.md) — update any current-state
     language that still treats attendee status visibility as deferred

   `docs/backlog.md` is in scope for this PR for the deferred items
   listed under § "Handoff After C.1" so the backlog reflects the
   post-C.1 reality before merge.
8. **Final validation.** On a clean tree, run `npm run lint`,
   `npm test`, `npm run test:functions`, `npm run build:web`, and the
   attendee e2e command selected in step 4.
9. **Plan-to-PR completion gate.** Walk every Goal, Test, Validation
   expectation, and Self-Review audit in this plan. Each must be
   either satisfied in the PR or explicitly deferred in this plan doc
   with written rationale before merge.
10. **PR preparation.** Open a PR against `main` using the required
    template. The PR body must say that:
    - C.1 is the first attendee-facing redemption-status surface
    - polling is gated on `complete-game` having returned a
      completion result; it does not fire during the
      `isSubmittingCompletion` window
    - polling runs unconditionally once gated on; visibility-API
      pause is deferred
    - no manual refresh, no timestamp formatting, no error UI ship
      in C.1
    - the existing entitlement-status copy on the verification-code
      sub-meta line is preserved verbatim; chip / headline / body
      copy is reworked to encode redemption status only
    - the backend contract is unchanged from A.2b

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `feat(web): add attendee redemption status polling hook` | `npm run lint`, `npm test`, `npm run build:web` |
| 2 | `feat(web): render redemption status on completion screen` | `npm run lint`, `npm test`, `npm run build:web` |
| 3 | `test(e2e): cover attendee redemption status reflection` | `npm run lint`, `npm test`, `npm run test:functions`, attendee e2e command |
| 4 | `docs: mark phase c.1 landed and sync architecture` | `npm run lint`, `npm test`, `npm run build:web` |

Review-fix commits, if needed, land between 3 and 4.

## Tests

### `tests/web/redemptions/useAttendeeRedemptionStatus.test.ts` (new)

What the suite must prove:

- the hook fires its first request synchronously on mount when
  `eventId` is non-empty and the backend is enabled
- the hook does not fire any request when `eventId` is null/empty,
  even after multiple re-renders
- the hook starts the loop the first time `eventId` transitions from
  null to non-null mid-mount (the entitlement-resolved transition)
- subsequent requests are scheduled 5 seconds after the prior
  request settles, not on a fixed wall-clock cadence
- a tick that would fire while a prior request is still pending is
  dropped, not queued
- unmount clears the pending timer and aborts the in-flight request
- post-unmount settle handlers do not call `setState`
- a 200 response with `redemptionStatus === "redeemed"` updates the
  exposed status to `{ kind: "redeemed", verificationCode }`
- a 200 response with `redemptionStatus === "unredeemed"` updates the
  exposed status to `{ kind: "unredeemed", verificationCode }`
- a 401 response triggers exactly one `ensureServerSession` call and
  exactly one replay of the same request
- a second 401 within the same tick holds the prior state without
  looping
- network failure, 5xx, malformed 200, and `ensureServerSession`
  failure all hold the prior state
- changing `eventId` terminates the prior loop and starts a new one
- the hook returns a stable `{ kind: "unknown" }` and schedules no
  work when the backend is disabled, both with and without prototype
  fallback enabled

### `tests/web/game/components/GameCompletionPanel.test.tsx`

What the updated suite must prove, walking the full
redemption-status × entitlement.status matrix so the copy-axes
contract is pinned and the existing new-vs-existing-replay distinction
is not silently lost:

- `unknown` × `new`: chip + headline + body show the unredeemed
  variant; `.token-meta` shows the new-entry phrasing
- `unknown` × `existing`: chip + headline + body show the unredeemed
  variant; `.token-meta` shows the replay phrasing
- `unredeemed` × `new`: same as `unknown × new` for chip + headline +
  body; `.token-meta` shows the new-entry phrasing
- `unredeemed` × `existing`: same as `unknown × existing` for chip +
  headline + body; `.token-meta` shows the replay phrasing
- `redeemed` × `new`: chip + headline + body show the redeemed
  variant; `.token-meta` still shows the new-entry phrasing
- `redeemed` × `existing`: chip + headline + body show the redeemed
  variant; `.token-meta` still shows the replay phrasing
- the chip and headline strings for the redeemed variant are
  distinct from any unredeemed-variant string, so the test fails if
  redeemed-state copy regresses to entitlement-status copy
- transitioning from `unredeemed` to `redeemed` does not unmount or
  remount the verification-code block
- transitioning from `redeemed` to `unredeemed` re-renders the
  unredeemed copy (covering the reversal case at the rendering layer
  even though no reversal-specific copy ships)

### `tests/web/pages/GamePage.test.tsx`

What the updated suite must prove:

- the page mounts the polling hook with `game.id` while the
  completion panel is mounted
- the page passes `null` as the hook's `eventId` while
  `latestCompletion` is null (i.e., during `isSubmittingCompletion`),
  so the hook fires no requests in the pre-completion window
- the page passes `game.id` as the hook's `eventId` once
  `latestCompletion` becomes non-null, and the hook begins its loop
  at that transition rather than at panel mount
- the page passes the hook's current status into the panel
- changing the active game resets the polling loop

### Attendee mobile Playwright smoke

What the extended spec must prove, under a mobile viewport against
local Supabase + local Edge Functions:

- an attendee completes a game and lands on the completion screen
  with unredeemed copy
- an organizer redeems the entitlement via the local redemptions
  surface (or a direct Edge Function call from the test fixture)
- within a bounded wait, the attendee completion screen re-renders
  the redeemed copy without a manual refresh

If the existing attendee runner cannot reach a real organizer redeem
path inside the e2e harness, the spec issues the redeem via direct
fixture-side call to the landed `redeem-entitlement` Edge Function
rather than orchestrating two browser sessions. Either path proves
the polling tick reflects backend state; the harness choice does not
change the C.1 contract.

## Self-Review Audits

Run the applicable named audits from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **Plan-local — recurring-effect cleanup check.** Not in
  [`docs/self-review-catalog.md`](../self-review-catalog.md); checked
  here because C.1 introduces the first interval-based fetch in the
  web app. The closest prior art is the `isCancelled` pattern in
  [`apps/web/src/game/useGameSession.ts`](../../apps/web/src/game/useGameSession.ts),
  which guards a single completion submit; the polling case
  generalizes the same discipline to a recurring loop. Walk every
  mount, unmount, and `eventId` transition against four guarantees:
  1. The cleanup function clears any pending `setTimeout`, aborts
     any in-flight `fetch` via `AbortController`, and signals the
     `isCancelled` flag.
  2. Post-unmount settlement of an in-flight request does not call
     `setState`. The settle handler must re-check the cancel signal
     after every `await`.
  3. The effect keyed on `eventId` terminates the prior cycle before
     the new one begins. Two polling loops must never run concurrently
     for the same hook instance.
  4. A scheduled callback that fires after `clearTimeout` due to the
     macrotask race must itself observe the cancellation (re-check
     the cancel flag inside the callback body), since `clearTimeout`
     does not stop a callback already on the queue.

  Promote this check to the catalog if a second interval/subscription
  site appears or if a late-`setState` warning surfaces in production.
- **Plan-local — retry boundedness check.** Not in
  [`docs/self-review-catalog.md`](../self-review-catalog.md); checked
  here because C.1 is the second site in the codebase to implement an
  on-401 re-bootstrap-and-replay (after
  [`apps/web/src/lib/gameApi.ts`](../../apps/web/src/lib/gameApi.ts))
  and the first to do so inside a recurring loop. Walk the hook
  against four guarantees:
  1. The 401 retry path is capped at exactly one
     `ensureServerSession` + one replay per tick, enforced by a
     parameter or counter — not by a "this won't happen twice"
     assumption.
  2. A second 401 within the same tick (including a 401 returned by
     the replay itself, or an `ensureServerSession` failure) settles
     the tick as a transient failure rather than re-entering the
     retry path.
  3. The per-tick retry does not stack with the 5-second polling
     cadence into an unbounded request stream during a sustained
     outage. The next tick is scheduled from the prior settle, not
     from the prior request start, so a retry inside one tick cannot
     overlap the next tick's fetch.
  4. The transient-failure settle holds the prior status state
     visibly unchanged; it does not flip the panel into a perpetual
     "retrying..." view that would hide a real outage from the
     attendee.

  Promote this check to the catalog if a third polling/retry site
  appears or if a sustained-outage incident exposes a gap.
- **Frontend/forms surface — `Post-save reconciliation audit`.** The
  panel's redeemed state must come from server response only, never
  from a local action or the verification code itself. Confirm no
  code path flips the panel into `redeemed` without a successful
  hook response.
- **CI / validation surface — `Readiness-gate truthfulness audit`.**
  Extending the attendee Playwright runner means re-checking that
  its local-stack readiness gate covers the `get-redemption-status`
  function path and does not pass when that function is unavailable.
- **SQL surface sentinel — `Grant/body contract audit`.** C.1 is
  frontend-only. If implementation discovers a need to touch SQL
  grants, helper bodies, or RPC auth logic, stop and reopen the
  earlier phase boundary instead of widening C.1.

## Validation Expectations

- `npm run lint` — passes
- `npm test` — passes with the new and updated suites
- `npm run test:functions` — passes; C.1 does not modify backend
  code, but it consumes the landed `get-redemption-status` contract
  and must not regress that validation surface
- `npm run build:web` — passes
- The attendee e2e command selected at step 4 — passes against local
  Supabase plus local Edge Functions, proving one redeem-to-display
  reflection through the real frontend route and the real read
  endpoint
- Manual sanity:
  - complete a game as an attendee in the local stack and confirm
    the completion screen renders the unredeemed copy with the
    verification code
  - redeem the entitlement from the operator surface in a second
    browser and confirm the attendee screen re-renders the redeemed
    copy within ~5 seconds without manual refresh
  - reverse the redemption from the operator surface and confirm the
    attendee screen re-renders the unredeemed copy on the next tick
  - hard-stop the local Edge Function process for ~15 seconds, then
    restart it, and confirm the attendee screen recovers without a
    page reload

If any validation cannot be run locally, say exactly why in the PR
body.

## Risks and Mitigations

- **Pre-completion poll noise.** The completion panel mounts during
  `isSubmittingCompletion`, before any entitlement row exists. If the
  hook polled on panel mount alone, every normal submit would generate
  guaranteed 404s and possible 401 re-bootstrap churn before
  `complete-game` returned. Mitigation: gate the hook's `eventId` on
  `latestCompletion`, encoded as both a Cross-Cutting Invariant and a
  page-level test that asserts no requests during the submitting
  window.
- **Background-tab poll volume.** Without visibility-API pause, a tab
  left open all day fires a request every 5 seconds. Mitigation:
  C.1's audience is the in-event completion screen, which is
  short-lived per attendee; pre-emptive pause is the first backlog
  item to promote if telemetry shows long idle sessions.
- **Overlapping requests during a slow response.** A 6-second
  response with a fixed 5-second cadence would otherwise stack.
  Mitigation: the chained-`setTimeout`-after-settle contract plus the
  in-flight drop-overlap guard both encoded in the hook's tests.
- **Stale render after reversal.** A row reversed mid-session must
  flip back to unredeemed without operator action. Mitigation: the
  panel test covers `redeemed → unredeemed` re-render and the hook
  test covers the underlying response branch.
- **Silent failure misleading the user.** Absorbing every transient
  failure means a long backend outage shows last-known state without
  warning. Mitigation: explicit non-goal in C.1; promoted as a
  backlog item with a defined surface (small inline freshness
  warning) once the polling spine is proven stable.
- **401 loop.** A naive 401 retry could ping `ensureServerSession`
  every tick. Mitigation: cap at exactly one re-bootstrap-and-replay
  per tick, asserted in the hook test.
- **Hidden backend drift.** Because C.1 consumes a landed endpoint,
  it is easy to smuggle "small" backend changes into the branch when
  a UI edge appears. Mitigation: treat any backend diff as a scope
  alarm and stop rather than widening the phase.

## Rollback Plan

If C.1 regresses in QA or live dry-run testing, rollback is a pure
frontend revert:

- remove the `useAttendeeRedemptionStatus` hook and its tests
- revert `GameCompletionPanel` and `GamePage` to their pre-C.1
  prop shapes
- keep the `get-redemption-status` Edge Function and shared types
  intact

No schema, RPC, or Edge Function rollback is part of the C.1 plan
because C.1 must not change those surfaces.

## Resolved Decisions

- Polling cadence is 5 seconds, chained off the prior request settle,
  matching the design doc and avoiding overlapping requests.
- Polling is gated on `complete-game` having returned a completion
  result, not on completion-panel mount; `GamePage` passes
  `latestCompletion ? game.id : null` so the hook is inert during
  `isSubmittingCompletion` and the endpoint is never called before an
  entitlement row exists.
- The chip, headline, and main body sentence on `GameCompletionPanel`
  encode redemption status only. The verification-code sub-meta line
  encodes entitlement.status only. The current "checked in" wording
  on the entitlement-status axis is reworked so the metaphor is free
  to belong to redemption status.
- The hook lives in `apps/web/src/redemptions/` and is consumed only
  by `GamePage`; `GameCompletionPanel` stays presentational.
- 401 retry mirrors the landed `submitGameCompletionToSupabase`
  pattern: one `ensureServerSession` + one replay per tick.
- Prototype fallback returns a stable `unknown` status and schedules
  no work; the panel render for `unknown` matches today's pre-C.1
  appearance.
- Visibility-API pause, manual refresh, formatted timestamps, "last
  updated at" stamps, and error UI are all explicit non-goals; each
  becomes a backlog candidate enumerated in § "Handoff After C.1".

## Open Questions Blocking C.1

None at plan-draft time. The landed `get-redemption-status` envelope
already carries every field C.1 consumes, the auth model is
identical to `complete-game`, and `eventId` is already in scope at
`GamePage` via `game.id`.

## Handoff After C.1

If C.1 lands as planned, the attendee end of the MVP loop is closed
and the design doc's validation signal (redeemed state visible
within 5 seconds while the completion screen is open) becomes
measurable end to end.

The following are explicitly deferred to follow-up cycles. Each is a
single backlog entry, not a pre-numbered sub-phase, and each gets
promoted to its own `reward-redemption-phase-c-<topic>-plan.md` only
when picked up:

- **Visibility-aware polling.** Page Visibility API pause when the
  tab is hidden, with one immediate refresh on resume, matching the
  contract in
  [`reward-redemption-mvp-design.md` §"visibility/offline/error retry behavior"](./reward-redemption-mvp-design.md).
  Promote first if telemetry shows long idle completion sessions.
- **Manual refresh affordance.** A `Refresh status` control plus the
  associated freshness messaging.
- **Timestamped redeemed copy.** "Redeemed at 2:14 PM" and
  associated locale/timezone handling.
- **Freshness and error UI.** Visible "last updated at" stamp and a
  surfaced transient-failure indicator that does not panic the
  attendee.
- **Reversal-aware copy.** Distinct messaging for a row that flipped
  `redeemed → unredeemed` mid-session, beyond the C.1 default of
  re-rendering as unredeemed.

These items are added to [`docs/backlog.md`](../backlog.md) in the
same PR that lands C.1 so the backlog reflects post-C.1 reality
before merge. Phase D (role seeding and volunteer dry run) does not
depend on any of them.
