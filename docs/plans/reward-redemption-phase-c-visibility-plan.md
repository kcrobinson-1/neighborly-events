# Reward Redemption — Phase C-Visibility Execution Plan

**Status:** Proposed
**Parent design:** [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md)
**Predecessors:**
[`reward-redemption-phase-c-1-plan.md`](./archive/reward-redemption-phase-c-1-plan.md)
— landed.
**Scope:** Visibility-aware pause/resume only. Pause the
`useAttendeeRedemptionStatus` poll while the tab is hidden, fire one
immediate refresh on hidden→visible, and otherwise leave the C.1
polling spine, transport contract, and copy axes unchanged. No manual
refresh affordance, no timestamp formatting, no freshness UI, no
reversal-aware copy, no `navigator.onLine` integration, no realtime,
no backend change.

## Why This Phase Exists

C.1 landed the polling spine but explicitly deferred Page Visibility
API integration as a [Non-Goal](./archive/reward-redemption-phase-c-1-plan.md)
and as the first item in its [Handoff After C.1](./archive/reward-redemption-phase-c-1-plan.md)
list. The design's behavior contract in
[`reward-redemption-mvp-design.md` §"visibility/offline/error retry behavior"](./reward-redemption-mvp-design.md)
states that the attendee 5-second poll **must** pause on
`document.visibilityState === "hidden"` and resume with one immediate
refresh on `visibilitychange` to `"visible"`. The current hook polls
unconditionally, so a completion screen left open in a hidden tab
fires twelve requests per minute indefinitely against
`get-redemption-status`. That is wasted attendee bandwidth, wasted Edge
Function invocations, and a discoverable load pattern in any future
event with thousands of attendees. The phase closes the gap between
the design contract and the implementation, and removes the
"Background-tab poll volume" risk called out explicitly in
[C.1's Risks and Mitigations](./archive/reward-redemption-phase-c-1-plan.md).

The phase is intentionally frontend-only and intentionally narrow. If
implementation discovers it needs a backend, RPC, shared-type, or
auth-helper change, that is a stop-and-report moment, not scope
expansion.

## Summary

Extend the existing
[`apps/web/src/redemptions/useAttendeeRedemptionStatus.ts`](../../apps/web/src/redemptions/useAttendeeRedemptionStatus.ts)
hook with a Page Visibility API integration that:

- registers a single `visibilitychange` listener on `document` inside
  the existing polling effect when the hook is active (non-null
  `eventId`, backend enabled, prototype fallback inactive)
- on hidden, clears any pending `setTimeout` and skips rescheduling
  from the next settle handler; an in-flight request is allowed to
  finish so its result lands in state for the user's return
- on hidden→visible, fires one immediate refresh if no request is in
  flight, then resumes the existing 5-second chained-after-settle
  cadence; if a request is already in flight at resume time, no second
  request is started — the in-flight settle path returns to normal
  scheduling
- treats mount-while-hidden as "deferred initial fetch": the first
  request is held until the first visible event, matching the design
  contract's "paused when hidden" intent
- continues to clean up the listener, the timer, and the abort
  controller on every unmount path, including unmount during a hidden
  tab

The hook's transport contract, response mapping, 401 single-retry
posture, prototype-fallback inertness, and discriminated status union
are unchanged. `GamePage` and `GameCompletionPanel` do not change at
all.

## Cross-Cutting Invariants

- **Visibility source is canonical.** The hook reads visibility from
  `document.visibilityState` only and listens to `visibilitychange`
  only. It does not derive visibility from `focus`/`blur`,
  `pageshow`/`pagehide`, or any other proxy. If `document` or
  `visibilityState` is unavailable (SSR, JSDOM without polyfill), the
  hook treats the environment as always-visible — current C.1
  behavior is preserved.
- **In-flight requests are inviolable across visibility flips.** A
  hidden transition does not abort an in-flight request; the response
  settles and updates state so the next visible render shows fresh
  data. Only unmount and `eventId` change abort.
- **Single concurrency gate.** The existing in-flight guard remains
  the sole defense against overlapping requests. Visibility transitions
  must never start a second concurrent request, including when a
  visible transition fires while a poll is in flight.
- **Resume refire fires once per real hidden→visible transition.**
  The handler compares the new `visibilityState` against the captured
  previous state; spurious `visibilitychange` events that report the
  same state do not refire. Per-render state observation does not
  refire either — refire is event-driven, not state-derived.
- **Cleanup contract still owns every exit.** Unmount, `eventId`
  change, and effect re-run all remove the visibility listener, clear
  the timer, abort the in-flight controller, and signal the cancel
  flag. No exit path leaves a listener on `document` after the hook
  is gone.
- **Hidden gate is layered, not point-in-time.** No fire-eligible
  site may rely on a single hidden check upstream. The hidden flag is
  re-read at the settle handler (skip scheduling), inside the timer
  callback (skip execution — `clearTimeout` cannot evict a callback
  already queued on the macrotask), and at `runPoll` entry
  (idempotent late check). Any future call site that can lead to a
  request must add the same re-check or be routed through `runPoll`.

## Goals

- The hook registers a `visibilitychange` listener on `document` when
  it activates (non-null `eventId`, backend enabled), and removes it on
  every cleanup path.
- When `document.visibilityState` is `"hidden"` while the hook is
  active, no new requests are scheduled and any pending `setTimeout`
  is cleared. An in-flight request is allowed to finish; its settle
  handler observes the hidden flag and skips rescheduling.
- On the first `visibilitychange` event whose new `visibilityState` is
  `"visible"` after a `"hidden"` interval, the hook fires one
  immediate request if no request is in flight; otherwise it lets the
  in-flight settle path resume normal scheduling.
- The hook activating with the tab already hidden does not fire the
  initial mount request. The first request is the first visible event
  after activation.
- Resume refire fires exactly once per hidden→visible transition.
  Multiple `visibilitychange` events without a hidden state in
  between do not produce additional refires.
- Unmount during a hidden tab clears the listener, the timer, and any
  in-flight abort, with no post-unmount `setState`.
- The hook's prototype-fallback / disabled-backend / null-`eventId`
  inertness is preserved: when the hook does not poll, it also does
  not register the visibility listener.
- The hook's transport contract, response mapping, 401 single-retry,
  and discriminated status union are unchanged.
- Focused Vitest coverage pins every Goal above as an assertion and
  fails on regression.
- The existing `GameCompletionPanel.test.tsx` and `GamePage.test.tsx`
  remain green without modification, proving the visibility wiring is
  encapsulated in the hook.
- Durable docs that describe the attendee polling surface
  (`docs/architecture.md`,
  [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md))
  are updated in the same PR to describe the visibility-aware behavior
  rather than the unconditional C.1 behavior.
- This plan doc flips `Status` to `Landed in commits <SHA list>.` in
  the same PR that implements it.
- [`docs/backlog.md`](../backlog.md) drops the "Visibility-aware
  attendee redemption polling" item in the same PR.

## Non-Goals

- Manual `Refresh status` affordance. Still a separate backlog item.
- Formatted "Redeemed at 2:14 PM" copy. Still a separate backlog item.
- Visible "last updated at" stamp on the attendee surface.
- Visible attendee-facing error UI for transient failures. C.1's
  silent-absorb posture is preserved.
- Reversal-aware copy.
- `navigator.onLine` integration or any offline-detection logic. The
  design's offline contract is a separate surface from the visibility
  contract; mixing them inflates this phase.
- `pageshow` / `pagehide` BFCache integration. The hook's lifetime is
  tied to React mount; BFCache restoration carries its own semantics
  that should be evaluated separately if a BFCache-related bug ever
  surfaces.
- `focus`/`blur` window events as a visibility proxy. The design names
  the Page Visibility API specifically.
- Cadence changes (jitter, backoff, slower hidden polling). Hidden is
  fully paused; visible is the existing 5-second chained cadence.
- Aborting in-flight requests on hidden transition. In-flight requests
  always settle; the settle handler is responsible for not
  rescheduling.
- Any change to `GamePage`, `GameCompletionPanel`, the panel's copy
  axes, the entitlement-status sub-meta line, or the verification-code
  block.
- Any change to operator-side surfaces, the redemptions monitoring
  route, the redeem route, or the agent workspace.
- Any new shared utility, custom hook abstraction, or polling base
  class. The visibility logic stays inside the one hook that needs it
  until a second polling site exists.
- Any backend, SQL, RPC, migration, grant, Edge Function, or shared
  type change. C.1's "Hidden backend drift" risk applies verbatim
  here.

## Locked Contracts

### Visibility lifecycle

- The hook listens to `document.addEventListener("visibilitychange",
  handler)` exactly once per active effect cycle, registered alongside
  the existing polling setup and removed in the existing cleanup path.
- The handler reads `document.visibilityState` directly and compares
  against the previously captured state held in a closure-local
  variable. A transition where new and previous state agree is a
  no-op.
- Hidden→visible transition while the hook is active and not in flight
  fires `runPoll()` immediately. Hidden→visible while in flight is a
  no-op; the in-flight settle path handles rescheduling.
- Visible→hidden transition clears any pending `setTimeout` and sets
  the closure-local hidden flag so the next settle handler observes
  it. An in-flight request continues; its settle path checks the
  hidden flag and does not reschedule.
- Effect re-run on `eventId` change clears the prior listener before
  the new effect cycle attaches its own.

### Initial-fetch gating

- When the hook activates (effect run with non-null `eventId`, backend
  enabled), the initial fetch fires synchronously **only if**
  `document.visibilityState !== "hidden"` at activation time. If the
  tab is hidden at activation, the initial fetch is deferred until the
  first hidden→visible transition.
- "Hook activates" includes both first mount with non-null `eventId`
  and the `null → non-null` `eventId` transition that happens when
  `complete-game` resolves.

### Settle-handler scheduling

- The existing settle handler reschedules the next tick via chained
  `setTimeout(POLL_DELAY_MS)`. The visibility extension adds one gate:
  if the hidden flag is set at settle time, no timer is scheduled.
- The hidden→visible handler itself takes responsibility for
  restarting the loop via `runPoll()`. It does not schedule a timer.
- The hidden flag is re-checked at three layers, in order:
  1. **At settle.** Skip scheduling the next timer if hidden.
  2. **Inside the timer callback.** Re-read the hidden flag (alongside
     the existing cancel and in-flight checks) before calling
     `runPoll`. This is the canonical correctness guarantee, because
     `clearTimeout` does not remove a callback that has already been
     placed on the macrotask queue — a hidden transition that fires
     between the queue placement and the callback execution must not
     produce a request.
  3. **At `runPoll` entry.** Idempotent late check so any future call
     site that bypasses the timer cannot leak a hidden-state request.
- The visibility handler still calls `clearTimeout` on the pending
  timer as defensive cleanup, but the contract does not depend on
  `clearTimeout` removing a queued callback. Correctness comes from
  the hidden re-check inside the callback body, not from the timer
  cancellation succeeding.

### Re-fire boundedness

- The hidden→visible refire fires `runPoll()` directly, not through
  `setTimeout(0)`. The in-flight guard inside `runPoll` is the single
  point that decides whether the call becomes a real request.
- The handler updates the previous-state closure variable **before**
  calling `runPoll`, so a re-entrant `visibilitychange` event observed
  during the synchronous portion of the handler cannot cause a second
  refire.

### SSR / non-browser environments

- If `typeof document === "undefined"` or `document.visibilityState`
  is `undefined`, the hook treats the environment as always-visible:
  no listener is registered, no hidden flag is set, and the C.1
  behavior is preserved exactly. This branch matters for Vitest's
  default JSDOM (which does support visibility) and for any future
  SSR seam that imports the hook.

### Cleanup ordering

- The cleanup function:
  1. signals the cancel flag
  2. removes the `visibilitychange` listener
  3. clears any pending `setTimeout`
  4. aborts any in-flight `AbortController`
- Removing the listener before clearing the timer prevents a
  visibility event delivered after cleanup begins from observing a
  half-torn-down state.

### Hook ownership boundary

- All visibility *runtime behavior* lives inside
  [`apps/web/src/redemptions/useAttendeeRedemptionStatus.ts`](../../apps/web/src/redemptions/useAttendeeRedemptionStatus.ts).
  No other runtime/source file under `apps/web/src/`,
  `supabase/functions/`, `supabase/migrations/`, or `shared/` changes
  in this phase, and no new file is added under
  `apps/web/src/redemptions/`.
- This boundary is about runtime behavior, not the diff envelope. The
  PR is still expected to update the test file
  ([`tests/web/redemptions/useAttendeeRedemptionStatus.test.ts`](../../tests/web/redemptions/useAttendeeRedemptionStatus.test.ts))
  and the durable docs named in § "Rollout Sequence" step 5
  (`docs/architecture.md`,
  [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md),
  [`docs/backlog.md`](../backlog.md), and this plan doc itself). Those
  test and doc edits are required deliverables, not scope drift.

## Target Structure

### `apps/web/src/redemptions/useAttendeeRedemptionStatus.ts`

- extend the existing effect with the visibility lifecycle described
  above
- the closure-local state expands by exactly two variables: a hidden
  flag and a previous-`visibilityState` snapshot
- export shape is unchanged: `useAttendeeRedemptionStatus(eventId)`
  still returns the discriminated `AttendeeRedemptionStatus`
- imports do not change beyond what the visibility logic requires; in
  particular, no new dependency on `gameApi`, `supabaseBrowser`, or
  shared types is introduced

### `apps/web/src/pages/GamePage.tsx`

- no change

### `apps/web/src/game/components/GameCompletionPanel.tsx`

- no change

### `shared/redemption.ts`

- no change. The discriminated status union and transport types are
  reused as-is.

### `apps/web/src/styles/`

- no change. Visibility is a behavior-only phase; no copy variants and
  no chip variants are added.

### Tests

- extend `tests/web/redemptions/useAttendeeRedemptionStatus.test.ts`
  with the visibility cases enumerated in § "Tests" below
- no other test file changes; `GamePage.test.tsx` and
  `GameCompletionPanel.test.tsx` must remain green unmodified, which
  is the encapsulation evidence

### Playwright

- the existing attendee mobile smoke is **not** extended. Headless
  visibility-event simulation is fragile across browsers and harnesses,
  and the unit-test surface above pins the contract deterministically.
  This is an explicit deferral, not a soft commitment: do not promise
  "consider adding" a Playwright case in PR review.

## Rollout Sequence

1. **Pre-edit gate.** Confirm the worktree is clean and the branch is
   not `main`. Run `npm run lint`, `npm test`, and `npm run build:web`
   on the branch before the first implementation edit. Stop and report
   on any pre-existing failure.
2. **Commit 1 — visibility-aware hook + tests.** Extend the hook with
   the listener, the hidden flag, the deferred-initial-fetch gate, the
   settle-handler hidden gate, and the resume refire path. Extend the
   hook test suite with every case enumerated in § "Tests" below.
   Validate with `npm run lint`, `npm test`, and `npm run build:web`.
3. **Automated code-review feedback loop.** Review the diff from a
   senior-engineer/code-review stance, explicitly checking for:
   - listener leaks on every early-return path
   - resume refire firing more than once per real hidden→visible
     transition
   - hidden→visible refire starting a duplicate request while the
     prior tick is still in flight
   - mount-while-hidden firing a request anyway
   - in-flight requests being aborted by visibility transitions
   - settle handlers calling `setState` after unmount
   - silent `void` promises in the new handler bodies
   - any change to the hook's transport contract, response mapping,
     401 retry, or discriminated status union (scope alarm)
   - any runtime/source file edit outside
     `apps/web/src/redemptions/useAttendeeRedemptionStatus.ts` (scope
     alarm). Test edits in
     `tests/web/redemptions/useAttendeeRedemptionStatus.test.ts` and
     doc edits in the named docs from § "Rollout Sequence" step 5 are
     expected and not alarms.
   - any backend file edit (scope alarm — stop and report)

   Land review-fix commits separately if that makes the history easier
   to audit.
4. **Self-review audits.** Walk the audits listed in § "Self-Review
   Audits" against the implementation commits.
5. **Documentation current-state gate.** Update in the same PR:
   - this plan doc — flip `Status` to `Landed in commits <SHA list>.`
   - [`docs/architecture.md`](../architecture.md) — update the
     attendee/completion description so the polling sentence reads as
     "5-second polling against `get-redemption-status` while the
     completion panel is mounted and the tab is visible, paused on
     hidden with one immediate refresh on resume, with one-time 401
     re-bootstrap"
   - [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md)
     — confirm the §"visibility/offline/error retry behavior" wording
     still matches the implementation; if it diverges, update the
     attendee bullet to point to the implementing plan
   - [`docs/backlog.md`](../backlog.md) — remove the "Visibility-aware
     attendee redemption polling" Tier 4 entry, since the work has
     landed
6. **Final validation.** On a clean tree, run `npm run lint`,
   `npm test`, `npm run test:functions`, and `npm run build:web`.
   `npm run test:functions` must pass; this phase changes no backend
   code, so a regression there indicates an unintended diff and must
   be investigated, not waived.
7. **Plan-to-PR completion gate.** Walk every Goal, Non-Goal,
   Locked Contract, Test, and Self-Review audit in this plan. Each is
   either satisfied in the PR or explicitly deferred in this plan doc
   with written rationale before merge. Do not move deferrals to the
   PR body, an issue, or an unwritten promise.
8. **PR preparation.** Open a PR against `main` using the required
   template. The PR body must say that:
   - the phase implements the visibility contract from
     [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md)
     §"visibility/offline/error retry behavior"
   - polling is paused on hidden, with one immediate refresh on
     hidden→visible, and is otherwise unchanged from C.1
   - mount-while-hidden defers the initial fetch until visible
   - in-flight requests are not aborted by visibility transitions
   - no manual refresh, no timestamp formatting, no error UI, no
     `navigator.onLine` integration ship in this phase
   - the backend contract is unchanged from A.2b / C.1
   - Playwright is not extended; the contract is pinned in vitest

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `feat(web): pause attendee redemption polling when tab is hidden` | `npm run lint`, `npm test`, `npm run build:web` |
| 2 | `docs: mark visibility-aware redemption polling landed and sync architecture` | `npm run lint`, `npm test`, `npm run build:web` |

Review-fix commits, if needed, land between 1 and 2 so the docs commit
captures the post-review SHAs.

## Tests

### `tests/web/redemptions/useAttendeeRedemptionStatus.test.ts`

What the extended suite must prove. Each bullet is one assertion the
suite owns; the implementer may group them into shared `describe`
blocks but must not collapse two distinct contracts into one
assertion.

- mounting with `document.visibilityState === "visible"` and a
  non-null `eventId` fires the initial request synchronously
  (regression guard for the C.1 contract under the new gating)
- mounting with `document.visibilityState === "hidden"` and a non-null
  `eventId` fires no request; the next request fires only after a
  `visibilitychange` event whose new state is `"visible"`
- a `visibilitychange` to `"hidden"` after the initial request settles
  clears the pending 5-second timer; no request fires for the
  duration of hidden state, even after the would-be 5-second mark
- a hidden transition that arrives between the timer scheduling and
  the timer callback's execution does not produce a request. The
  contract is behavioral: `fetch` is not called, regardless of whether
  the test exercises this via fake timers, manual callback invocation,
  spying on the timer callback directly, or another deterministic
  mechanism. The implementer chooses the reproduction technique; the
  plan does not lock one. What the plan locks is that the test must
  exercise the *post-clearTimeout / pre-execution* window, not only
  the simpler "hidden transition before timer fires at all" path
- a `visibilitychange` to `"hidden"` while a request is in flight does
  not abort the request; the response settles and updates state, and
  the settle handler does not schedule the next timer
- a `visibilitychange` to `"visible"` while the hook is paused fires
  exactly one request immediately (not delayed by 5 seconds) and
  resumes the chained cadence from that response's settle
- a `visibilitychange` to `"visible"` while a request is in flight
  starts no second request; the in-flight settle reschedules per
  normal rules (preserves the single concurrency gate)
- a sequence of `hidden → visible → hidden → visible`
  visibilitychanges produces at most one resume refire per real
  hidden→visible transition
- a `visibilitychange` event whose new `visibilityState` matches the
  previous captured state (no real transition) is a no-op: no request
  fires, no timer is scheduled, no timer is cleared
- unmount during hidden state removes the `visibilitychange` listener,
  clears any pending timer, and aborts any in-flight controller
- unmount immediately after a hidden→visible refire that has not yet
  settled aborts the in-flight request and prevents post-unmount
  `setState`
- changing `eventId` while hidden terminates the prior listener before
  the new effect's listener is attached; subsequent visibility events
  do not affect the abandoned cycle
- prototype-fallback active, backend disabled, and null `eventId`
  paths each register no `visibilitychange` listener and schedule no
  work (preserves C.1 inertness contract)
- a 401 retry inside a tick that completes during hidden state does
  not stack with a resume refire; the resume refire still fires once
  on the next visible transition (no compound-firing path)
- when `document.visibilityState` is `undefined` (simulated by
  deleting the property on the test `document`), the hook behaves
  identically to C.1: no listener attached, initial fetch fires on
  mount, chained cadence resumes normally

### `tests/web/pages/GamePage.test.tsx`

- no new assertions. The existing `GamePage` wiring tests must remain
  green without edits, which is the proof that visibility is fully
  encapsulated in the hook.

### `tests/web/game/components/GameCompletionPanel.test.tsx`

- no new assertions. The panel does not branch on visibility; the
  status-axis matrix from C.1 stands unchanged.

### Attendee mobile Playwright smoke

- not extended. Visibility-event simulation is fragile in headless
  browsers and the unit-test surface above pins the contract
  deterministically. This is an explicit deferral, not a soft
  commitment.

## Self-Review Audits

Run the named audits from
[`docs/self-review-catalog.md`](../self-review-catalog.md) that match
this phase's surfaces, plus the plan-local audits listed below.

- **Effect cleanup audit** (catalog). The diff modifies a `useEffect`
  that already schedules a recurring side effect, and adds a
  `document` event-listener subscription whose lifetime must match
  the effect cycle. Walk the four guarantees from the catalog entry
  against every exit path: cleanup removes the listener and clears
  the timer and aborts the in-flight request and signals the cancel
  flag; post-unmount settle does not call `setState`; effect re-run
  on `eventId` change tears down the prior listener before the new
  one attaches; a callback already on the macrotask queue when
  `clearTimeout` fires must observe **both** the cancel flag and the
  hidden flag inside its body, since `clearTimeout` cannot evict a
  queued callback and the hidden case is just as much a "must not
  fire" condition as the cancelled case.
- **Plan-local — visibility-listener leak audit.** Walk every
  early-return inside the effect (null `eventId`, backend disabled,
  prototype fallback, `document` undefined) and confirm one of two
  invariants holds: either no listener was registered before the
  return, or cleanup removes a listener that may have been registered.
  The dangerous pattern is a future edit that registers the listener
  before an early return that forgets to remove it.
- **Plan-local — resume-refire boundedness audit.** Confirm the
  hidden→visible refire fires exactly once per real transition. Walk
  three scenarios: (a) `visible → hidden → visible` produces one
  refire; (b) `visible → visible` (spurious event) produces zero
  refires; (c) `hidden → visible → hidden → visible` produces two
  refires (one per real transition), not four. The previous-state
  closure variable must be updated before the refire call so a
  synchronous re-entrant event cannot cascade.
- **Plan-local — in-flight inviolability audit.** Confirm that a
  hidden transition during an in-flight request does not call
  `abortController.abort()`. The only call sites of `.abort()` should
  remain unmount and `eventId` change. A new abort-on-hidden path
  would silently regress the "in-flight requests are inviolable"
  invariant.
- **Frontend forms & save paths — `Post-save reconciliation audit`**
  (catalog). The panel's redeemed state must still come from server
  response only. Confirm no visibility code path flips the panel into
  `redeemed` without a successful hook response. This audit is the
  same one C.1 ran; re-running it here is the regression guard.
- **CI / validation surface — `Readiness-gate truthfulness audit`**
  (catalog). N/A — no new CI step or readiness probe is added by this
  phase. Documented explicitly so the absence is a deliberate
  decision, not an oversight.
- **SQL surface sentinel — `Grant/body contract audit`** (catalog).
  Stop-and-report alarm. This phase changes no SQL. If implementation
  starts to drift toward a backend edit, stop and reopen the earlier
  phase boundary instead of widening this plan.

## Validation Expectations

- `npm run lint` — passes
- `npm test` — passes with the new visibility cases in
  `tests/web/redemptions/useAttendeeRedemptionStatus.test.ts`
- `npm run test:functions` — passes; this phase modifies no backend
  code, so a regression here indicates unintended diff and must be
  investigated, not waived
- `npm run build:web` — passes
- Manual sanity (local stack):
  - complete a game as an attendee in the local stack and confirm the
    completion screen renders unredeemed copy with the verification
    code
  - switch to a different browser tab for ~30 seconds, then return,
    and confirm exactly one network request to
    `/functions/v1/get-redemption-status` was issued during the hidden
    interval (none) and one was issued immediately on return (the
    resume refire), via DevTools Network panel
  - while hidden, redeem the entitlement from a second browser; on
    return, confirm the attendee screen reflects the redeemed copy on
    the resume refire without waiting a full 5 seconds
  - hard-stop the local Edge Function process, switch to a different
    tab for ~15 seconds, restart the Edge Function, return to the
    attendee tab, and confirm the screen recovers on the resume refire

If any validation cannot be run locally, say exactly why in the PR
body.

## Risks and Mitigations

- **Listener leak on early-return path.** A future edit that registers
  the listener before an early-return that forgets cleanup leaks a
  reference to `document`. Mitigation: visibility-listener leak audit
  + explicit test asserting cleanup on every prototype-fallback /
  disabled-backend / null-`eventId` path.
- **Resume burst.** A visible transition that fires while a request
  is in flight could start a duplicate request. Mitigation: the
  in-flight guard inside `runPoll` is the single concurrency gate;
  the test suite asserts the duplicate path is suppressed.
- **Spurious visibilitychange events.** Some browsers fire
  `visibilitychange` without a real state transition (e.g., during
  prerender or iframe focus changes). Mitigation: handler compares
  against captured previous state and treats no-op transitions as
  no-ops.
- **Mount-while-hidden missing the first poll.** A user who opens the
  completion screen in a background tab and never foregrounds it
  would see a permanently `unknown` status. Mitigation: this is the
  intended behavior — the design contract pauses polling while
  hidden, and the attendee cannot read a status they are not looking
  at. The next visible event becomes the first request.
- **Macrotask race on hidden transition.** A `setTimeout` callback
  already on the queue when hidden takes effect cannot be removed by
  `clearTimeout` and will fire. The contract therefore does not
  depend on `clearTimeout` succeeding. Mitigation: the timer callback
  body re-reads the hidden flag (alongside the existing cancel and
  in-flight checks) before calling `runPoll` and returns early if
  hidden, the in-flight settle handler re-checks the hidden flag
  before scheduling the next timer, and `runPoll` re-checks at entry.
  `clearTimeout` is retained as a defensive cleanup that avoids the
  cost of an enqueued no-op callback when the cancellation wins the
  race, not as the correctness guarantee.
- **Test-environment visibility quirks.** JSDOM's
  `document.visibilityState` is mutable but not driven by real tab
  focus. Mitigation: tests stub `visibilityState` via
  `Object.defineProperty` and dispatch `visibilitychange` events
  directly, which is the standard pattern for this API in unit tests
  and is deterministic.
- **BFCache restoration.** A page restored from BFCache fires
  `pageshow` with `persisted: true` but does not always fire
  `visibilitychange`. This phase does not handle BFCache; if
  attendees report stale completion screens after back-button
  navigation, that is a separate backlog item, not a soft commitment
  to handle here.
- **Hidden backend drift.** As with C.1, it is easy to smuggle a
  "small" backend change into the branch when a UI edge appears.
  Mitigation: any backend diff is a scope alarm; stop and report
  rather than widening the phase.

## Rollback Plan

If this phase regresses in QA or live testing, rollback is a pure
frontend revert of the hook diff:

- revert
  [`apps/web/src/redemptions/useAttendeeRedemptionStatus.ts`](../../apps/web/src/redemptions/useAttendeeRedemptionStatus.ts)
  to its C.1 shape
- revert
  [`tests/web/redemptions/useAttendeeRedemptionStatus.test.ts`](../../tests/web/redemptions/useAttendeeRedemptionStatus.test.ts)
  to its C.1 shape
- restore the backlog entry in
  [`docs/backlog.md`](../backlog.md) and the prior wording in
  [`docs/architecture.md`](../architecture.md)
- flip this plan's `Status` back to `Proposed` with a one-line
  rationale appended

No schema, RPC, Edge Function, shared-type, or operator-side rollback
is part of this plan because none of those surfaces change.

## Resolved Decisions

- The Page Visibility API (`document.visibilityState`,
  `visibilitychange`) is the canonical signal. `pageshow`/`pagehide`
  and `focus`/`blur` are explicitly out of scope.
- In-flight requests are not aborted on hidden transitions. They
  settle and the settle handler skips rescheduling.
- Mount-while-hidden defers the initial fetch until the first
  visible event.
- Resume refire fires `runPoll()` directly (not through
  `setTimeout(0)`) and the previous-state closure variable updates
  before the call.
- Cleanup order is: cancel flag → remove listener → clear timer →
  abort controller.
- The visibility logic stays inside the existing hook. No shared
  utility, no `usePolling` extraction, no second hook.
- Playwright is not extended in this phase. Vitest pins the contract.
- `navigator.onLine` integration is a separate phase, not bundled
  here.
- BFCache (`pageshow.persisted`) is a separate phase, not bundled
  here.

## Open Questions Blocking This Phase

None at plan-draft time. The Page Visibility API is universally
supported across the target browsers, the C.1 hook already owns the
lifecycle this phase extends, and no new contract field, endpoint, or
auth helper is required.

## Handoff After This Phase

If this phase lands as planned, the attendee polling spine matches
the design contract end-to-end and the "Background-tab poll volume"
risk noted in C.1 is closed. The remaining backlog items from
[C.1's "Handoff After C.1" list](./archive/reward-redemption-phase-c-1-plan.md)
are unchanged in priority and ownership:

- **Manual refresh affordance.** Promote next if telemetry or QA
  shows attendees waiting through the 5-second tick after a known
  redemption event.
- **Timestamped redeemed copy.** Locale and timezone handling for
  "Redeemed at 2:14 PM."
- **Freshness and error UI.** Visible "last updated at" stamp and a
  surfaced transient-failure indicator.
- **Reversal-aware copy.** Distinct messaging for a row that flipped
  `redeemed → unredeemed` mid-session.
- **`navigator.onLine` integration.** Offline-detection contract from
  the design doc.

This plan does not depend on any of them, and none of them depend on
this plan.
