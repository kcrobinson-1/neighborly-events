# Reward Redemption — Phase B.2b Execution Plan

**Status:** Landed in commits `68a73c8`, `8201d28`, `9332e2e`, `4b61cc5`,
`6da7aa4`, `026f8b9`, plus the implementing merge commit.
**Parent overview:** [`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md)
**Parent design:** [`reward-redemption-mvp-design.md`](../reward-redemption-mvp-design.md)
**Predecessors:**
[`auth-signin-generalization-plan.md`](../auth-signin-generalization-plan.md),
[`reward-redemption-phase-a-2b-plan.md`](./reward-redemption-phase-a-2b-plan.md),
[`reward-redemption-phase-b-1-plan.md`](./reward-redemption-phase-b-1-plan.md),
[`event-code-prerequisite-plan.md`](./event-code-prerequisite-plan.md)
— landed.
[`reward-redemption-phase-b-2a-plan.md`](./reward-redemption-phase-b-2a-plan.md)
— landed.
**Scope:** Phase B.2b only — add organizer/root-admin reversal to the
existing `/event/:slug/redemptions` monitoring route. No new route, no
new auth surface, no new Edge Function / RPC / migration, no attendee
polling, no role seeding.

## Why B.2b Exists

B.2a gave organizers a read-only dispute-resolution view, which removes
the need to read `game_entitlements` directly in SQL during a booth
issue. It does not yet let them fix the issue in the same workflow. The
current reversal escape hatch is still the manual SQL/runbook path,
which is slower, easier to get wrong under pressure, and detached from
the operator context the monitoring route already resolved.

B.2b closes that gap by adding the smallest mutation surface that the
parent design requires:

- reversal stays inside `/event/:slug/redemptions`
- reversal is never available from the list row itself
- reversal is only available from the existing detail sheet
- the operator sees an explicit confirmation step before the write
- the UI reflects idempotent outcomes without inventing new backend
  states

The phase is intentionally frontend-only. If implementation discovers
that B.2b needs a new HTTP result code, a new SQL function, a schema
change, or a new authorization helper, that is a Phase A/B boundary
reopen and a stop-and-report moment, not scope for this plan.

## Summary

Extend the existing B.2a bottom-sheet detail view so a redeemed row can
be reversed by an authorized organizer or root admin. The sheet remains
the single entry point:

- view state shows row metadata plus a `Reverse redemption` CTA only
  when the selected row is currently reversible
- tapping the CTA transitions the same sheet into a confirmation step,
  not a second modal
- confirmation includes code, event context, prior status summary, and
  an optional single-line reason input
- submit calls the landed `reverse-entitlement-redemption` Edge
  Function with the caller's bearer token and maps the stable A.2b
  envelope to UI states
- after a successful reverse response, the sheet fires the single-row
  re-read and the existing bounded list refetch in parallel; the sheet
  consumes the re-read while the list and `Last updated` timestamp
  reconcile through the full refetch
- the `By me` chip expands from `redeemed_by === currentUserId` to
  `redeemed_by === currentUserId OR redemption_reversed_by ===
  currentUserId`

B.2b does not alter route gating, list fetch shape, suffix search,
filter chips, or B.2a's mobile information architecture beyond the new
detail-sheet reversal states and the `By me` predicate expansion.

## Cross-Cutting Invariants

- Canonical display state comes from the server only: the reverse
  success envelope plus the single-row re-read drive the sheet, never a
  locally reconstructed row from `selectedRow` plus typed reason.
- Reason-input and mutation-result lifecycle is scoped to the selected
  row: row switch, sheet close, and `Back` all reset both.
- Reversal eligibility is one rule across all call sites:
  `currentRow.status === "redeemed"` plus already-authorized organizer /
  root-admin page context; CTA render and submit guard must agree.
- Every mutation click path (`Confirm reversal`, `Retry`) surfaces
  failure with a visible recovery affordance; no unhandled or `void`
  promise path is allowed.

## Goals

- A selected row with `redemption_status = 'redeemed'` shows a visible
  `Reverse redemption` CTA inside the detail sheet for authorized
  organizers and root admins.
- Rows already in the reversed state never show the reversal CTA, even
  if they still carry prior redeem metadata from an earlier cycle.
- The confirmation flow stays inside the existing detail sheet and
  includes code, locked event context, current status summary, and an
  optional single-line reason input.
- The reason input mirrors the landed backend normalization contract:
  leading/trailing whitespace trims, blank becomes `null`, and the UI
  does not invent a max-length restriction that the backend does not
  enforce.
- Submit calls `reverse-entitlement-redemption` with the caller's JWT
  and maps:
  - success `reversed_now`
  - success `already_unredeemed`
  - failure `not_authorized`
  - failure `not_found`
  - transient failure (network / 5xx / unexpected 401 / malformed 200)
  to explicit sheet states with recovery actions.
- After a success response, the sheet re-reads the single row by `id`
  in parallel with the full list refetch, so the selected-row badge,
  timestamps, actor, and optional note do not wait for the list refresh
  to complete while the list still reconciles through its canonical
  bounded refetch path.
- The existing list refresh remains the source of truth for the page's
  `Last updated` timestamp; the single-row re-read does not fake a list
  freshness change.
- `filterRedemptions` expands `By me` so a row reversed by the current
  organizer now matches the chip even when it was originally redeemed by
  someone else.
- B.2b remains frontend-only. No migration, RPC body, grant, or Edge
  Function contract changes land in this phase.
- Focused Vitest coverage pins the new detail-sheet state machine, the
  reverse-mutation result mapping, the expanded `By me` chip predicate,
  and the page-level re-read/refetch behavior.
- The existing mobile Playwright smoke for `/event/:slug/redemptions`
  grows to prove one successful reversal end to end against local
  Supabase plus local Edge Functions.
- The Phase B.2b plan doc flips `Status` to `Landed in commits <SHA
  list>.` in the same PR that implements it.
- The implementation PR updates the matching durable docs in the same
  branch: this plan doc, the Phase B overview, `README.md`,
  `docs/architecture.md`, and any other touched current-state docs so
  they describe the landed reversal surface rather than the pre-B.2b
  read-only state.

## Non-Goals

- Any new route, route matcher, `AppPath` literal, or `validateNextPath`
  change. B.2a already owns the route surface.
- Any change to organizer-vs-agent access. Agents still do not reach
  `/event/:slug/redemptions` in MVP.
- Any backend contract change. If the landed reverse endpoint is
  insufficient, stop and reopen A.2b.
- Any multi-row or bulk reversal flow.
- Any undo/redo of a reversal.
- Any realtime subscription, auto-polling, or cross-device cache sync.
- Any rewrite of the B.2a list query model, search parser, chip list, or
  sticky layout.
- Any extraction of a shared event-context authorization helper from
  `authorizeRedeem.ts` / `authorizeRedemptions.ts`. That remains a
  post-B.2b cleanup candidate.
- Any new local-prototype fallback behavior for reversal. This remains a
  real-backend-only path.
- Any new nav entry, `/admin` link, or public discoverability change for
  `/event/:slug/redemptions`.

## Locked Contracts

### Route and auth surface stay unchanged

- `/event/:slug/redemptions` remains the only route touched by B.2b.
- The existing B.2a organizer/root-admin route gate remains the only
  authorization gate needed before the page renders.
- B.2b does not introduce a second page-level auth probe or a separate
  per-row role fetch. Reversal eligibility is determined from the
  already-authorized page context plus the selected row's current state.
- Signed-out copy, role-gate copy, and transient route-auth copy remain
  the B.2a strings and are not reworded in B.2b.

### Detail sheet becomes a two-step state machine

The existing `RedemptionDetailSheet` evolves from a view-only sheet into
one sheet with two internal steps:

1. **Details step**
   - current B.2a metadata remains visible
   - if the row is reversible, render a visible `Reverse redemption`
     action below the metadata
   - if the row is already reversed or otherwise non-reversible, render
     no reversal CTA and no disabled fake CTA
2. **Confirmation step**
   - heading: `Reverse redemption?`
   - summary includes:
     - the full event-prefixed code
     - the locked event acronym
     - the prior status badge (`Redeemed`)
     - the existing redeemed timestamp and actor when available
   - reason field:
     - label: `Reason (optional)`
     - single-line text input
     - blank or whitespace-only input is submitted as `null`
   - actions:
     - `Back`
     - `Confirm reversal`
     - pending label: `Reversing...`
3. **Post-success refresh-warning sub-state**
   - entered when the reverse mutation succeeds but the single-row
     re-read fails
   - preserves the success outcome from the mutation response
   - adds a visible detail-refresh warning with a retry affordance for
     the selected row
   - does not suppress the parallel full-list refetch

The confirmation step lives in the same sheet shell so close, scrim, and
focus-return behavior stay under one accessibility contract rather than
stacking a second modal on top of the first.

### Reversal eligibility

A row is reversible if and only if both are true:

- the page is already in the authorized organizer/root-admin branch
- the selected row's current state resolves to `redeemed`

Rows with `redemption_status = 'unredeemed'` and a non-null
`redemption_reversed_at` are treated as already reversed, not
reversible. Rows in any `unknown` defensive state are also not
reversible.

This is a UX affordance gate, not the trust boundary. The backend RPC
remains authoritative and may still return `already_unredeemed`,
`not_authorized`, or `not_found`.

### Mutation transport contract

- Transport remains the landed Edge Function:
  `reverse-entitlement-redemption`
- Request body shape remains exactly:
  `{ eventId, codeSuffix, reason? }`
- Caller auth remains the current browser session JWT via the existing
  Supabase publishable-key headers plus `Authorization: Bearer <token>`
- No request body includes row `id`, event slug, or any client-derived
  event prefix. The suffix continues to come from the selected row's
  `verification_code`.

Map the landed response contract as follows:

- `200 + { outcome: "success", result: "reversed_now", reversed_at,
  reversed_by_role }`
  - success banner in the sheet
  - run the single-row re-read
  - trigger the list refetch
- `200 + { outcome: "success", result: "already_unredeemed" }`
  - success/idempotent banner in the sheet
  - run the single-row re-read
  - trigger the list refetch
- `403 + { details: "not_authorized" }`
  - visible non-leaking sheet error
  - no retry loop
- `404 + { details: "not_found" }`
  - visible non-leaking sheet error
  - no retry loop
- network failure, `500`, unexpected `401`, or malformed `200`
  - transient sheet error with `Retry`
  - one automatic retry at ~2s backoff, matching the B.1/B.2a operator
    error-handling posture
- reverse success + single-row re-read failure
  - keep the reversal success outcome visible in the sheet
  - surface a distinct detail-refresh error with visible retry / refresh
    affordance for the selected row
  - still issue the full list refetch so page-level state and the
    `Last updated` timestamp reconcile even if the sheet-specific
    follow-up read fails

### Single-row re-read and list refetch

B.2b adds one direct row read after a successful mutation:

- read source: browser Supabase client against `public.game_entitlements`
- scope: `.eq("event_id", eventId).eq("id", rowId).maybeSingle()`
- selected columns: the existing B.2a row columns plus `redemption_note`

The re-read exists to update the open sheet immediately, especially for:

- `already_unredeemed`, whose success envelope does not carry timestamp
  or actor metadata
- the newly visible `redemption_note`
- any server-side timestamp normalization

After a successful reverse response, fire the single-row re-read and the
existing full list refresh via `useRedemptionsList().refresh()` in
parallel. The sheet consumes the single-row result; the list ordering,
chip results, and `Last updated` timestamp reconcile through the full
bounded refetch.

No optimistic local list patch is allowed in place of the full refresh.
The list remains owned by the landed B.2a bounded fetch model.

### `By me` filter expansion

B.2a intentionally scoped `By me` to `redeemed_by = currentUserId`
only. B.2b expands it to:

- `redeemed_by = currentUserId`
  **OR**
- `redemption_reversed_by = currentUserId`

This expansion is required so the row the organizer just reversed still
surfaces when they immediately toggle `By me`.

### `redemption_note` visibility

B.2a intentionally did not select or render `redemption_note`. B.2b
does both:

- list queries and the single-row re-read include `redemption_note`
- the detail sheet renders a `Reason` row only when
  `redemption_note !== null`

The list row remains compact and does not show the note inline.

### Styling-token discipline

- Reuse the B.2a status-badge tokens already introduced for redeemed and
  reversed states.
- Keep confirmation-step layout, note-field spacing, and success/error
  banners local to `_redemptions.scss` unless a value clearly becomes a
  shared semantic token.
- Do not introduce a destructive-button token family as part of B.2b
  unless multiple surfaces need it. One route-local confirmation action
  is not sufficient reason for a repo-wide token expansion.

## Target Structure

Define the file responsibilities before implementation so the B.2b diff
does not dissolve into ad hoc edits across the B.2a modules.

### `apps/web/src/redemptions/types.ts`

- add `redemption_note: string | null` to the runtime row shape
- keep the row type aligned with the direct `game_entitlements` select
  surfaces used by both the list fetch and the single-row re-read

### `apps/web/src/redemptions/redemptionsData.ts` (new)

- own the shared selected-column string for B.2a/B.2b row reads
- export the direct browser-client helpers for:
  - the existing redeemed-slice + reversed-slice fetch
  - the new single-row re-read by `event_id` + `id`
- keep raw Supabase read concerns out of the page component and out of
  the mutation hook

### `apps/web/src/redemptions/useRedemptionsList.ts`

- continue to own list state, `Last updated`, automatic retry, and the
  explicit `refresh()` API
- stop owning inline query constants or raw Supabase select strings once
  `redemptionsData.ts` exists

### `apps/web/src/redemptions/useReverseRedemption.ts` (new)

- own `reverse-entitlement-redemption` submission
- mirror the B.1 hook posture:
  - access-token fetch
  - one automatic retry for transient failures
  - deterministic mapping of the HTTP envelope into UI result states
- export enough state for the sheet/page shell to render:
  - idle / pending / success / stable failure / transient failure
  - retry of the last submission
  - reset when the selected row changes or the sheet closes

### `apps/web/src/redemptions/filterRedemptions.ts`

- expand `By me` to include `redemption_reversed_by`
- keep the function pure and clock-free except for the injected `nowMs`

### `apps/web/src/redemptions/RedemptionDetailSheet.tsx`

- remain a presentational sheet component with focus-trap, close, and
  focus-return ownership
- grow from "view-only details" to "details + confirmation + mutation
  feedback" without taking over fetch/mutation orchestration
- receive reversal props from the page shell rather than reading auth or
  firing network requests directly

### `apps/web/src/pages/EventRedemptionsPage.tsx`

- continue to own page orchestration:
  - selected row
  - filter/search state
  - list refresh
  - detail-sheet open/close
- add B.2b orchestration:
  - confirmation-step entry/exit
  - note input state
  - wiring to `useReverseRedemption`
  - post-success single-row re-read
  - list refresh after success
- do not take raw fetch details back out of the helper modules

### `apps/web/src/styles/_redemptions.scss`

- add the confirmation-step layout, note input, action group, and
  success/error banner rules
- preserve the B.2a list/filter layout and mobile-first shell

### Tests

- extend existing redemptions suites where the contract grows
- add a focused hook test for the new reverse-mutation helper rather
  than forcing page tests to prove every transport mapping
- extend the existing redemptions Playwright runner instead of creating
  a second route-specific runner

## Rollout Sequence

1. **Baseline validation.** On the B.2b feature branch before the first
   implementation edit, run `npm run lint`, `npm test`,
   `npm run test:functions`, and `npm run build:web`. Stop and report on
   any pre-existing failure.
2. **Dependency gate.** Confirm B.2a has landed to `main` before the
   first implementation commit. If it is still only in review, pause
   implementation and rebase this plan branch after merge instead of
   forking B.2b code from a moving review target.
3. **Commit 1 — shared row-read surface.** Add `redemptionsData.ts`,
   move the shared select columns there, and keep
   `useRedemptionsList` runtime-rendered output unchanged while it swaps
   to the shared helper. Do **not** add `redemption_note` to the shared
   select columns yet; that column lands in Commit 3 when the detail
   sheet first needs it. Validate with `npm run lint`, `npm test`, and
   `npm run build:web`.
4. **Commit 2 — reverse mutation hook.** Add
   `useReverseRedemption.ts` with focused tests for payload
   normalization, success mapping, stable-failure mapping, transient
   retry, and last-submission retry. Validate with `npm run lint`,
   `npm test`, and `npm run build:web`.
5. **Commit 3 — sheet state machine.** Expand
   `RedemptionDetailSheet.tsx` from view-only to details + confirmation
   + mutation-feedback rendering, still driven entirely by props. Add
   `redemption_note` to the shared row shape and shared select columns
   in this commit, because this is the first commit that renders it.
   Update the sheet tests in the same commit. Validate with
   `npm run lint`, `npm test`, and `npm run build:web`.
6. **Commit 4 — page orchestration + `By me`.** Wire the page to the
   new mutation hook, add note-input state, run the single-row re-read
   on success, trigger the list refresh, and expand
   `filterRedemptions` for reversal authorship. Land the page-level
   tests in the same commit so the orchestration contract is pinned.
   Validate with `npm run lint`, `npm test`, and `npm run build:web`.
7. **Commit 5 — Playwright extension.** Extend
   `tests/e2e/mobile-smoke.redemptions.spec.ts` and the supporting
   fixture so the same local redemptions runner proves a real organizer
   reversal against local Supabase + local Edge Functions. This commit
   also updates `scripts/testing/run-redemptions-e2e-tests.cjs` to boot
   `supabase functions serve` and tightens its readiness probe so it
   verifies the reverse-function path rather than only the B.2a
   read-only surfaces. Validate with `npm run lint`, `npm test`,
   `npm run test:functions`, and `npm run test:e2e:redemptions`.
8. **Automated code-review feedback loop.** Review the branch from a
   senior-engineer/code-review stance, explicitly checking for:
   - reversal CTA visible on already-reversed rows
   - success paths that do not refresh the selected row before or during
     list reconciliation
   - list refresh replaced by a local optimistic patch
   - missing `redemption_note` select in the row re-read
   - stale note text leaking from one row into the next selected row
   - silent mutation failures from unawaited promises
   - `By me` still ignoring `redemption_reversed_by`
   - copy or error states that distinguish cross-event mismatch from
     not-found
   - backend file drift; any SQL / Edge Function edit is a scope alarm
   Land review-fix commits separately if that makes the history easier
   to audit.
9. **Self-review audits.** Walk the named audits listed in
   § "Self-Review Audits" below against the implementation commits.
10. **Documentation current-state gate.** Update in the same PR:
    - this plan doc — flip `Status` to `Landed in commits <SHA list>.`
    - [`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md)
      — mark B.2b as landed in the sub-phase summary and remove any
      prose that still describes reversal as "not started"
    - [`docs/architecture.md`](../../architecture.md) — update the
      `EventRedemptionsPage` description from read-only monitoring to
      monitoring + organizer/root-admin reversal via the landed Edge
      Function, including the detail-sheet mutation path and the
      single-row re-read + list-refetch synchronization model
    - [`README.md`](../../../README.md) — update the current milestone /
      capability summary so it no longer describes the operator
      monitoring route as read-only once B.2b lands
    - [`docs/product.md`](../../product.md) — update any current-state or
      capability language that still treats organizer reversal as
      deferred once the feature has actually landed

    `docs/backlog.md` is not automatically in scope. Update it only if
    the implementation creates a concrete follow-up task or closes an
    existing tracked item.
11. **Final validation.** On a clean tree, run `npm run lint`,
    `npm test`, `npm run test:functions`, `npm run build:web`, and
    `npm run test:e2e:redemptions`. Do not substitute the generic
    `npm run test:e2e`, which uses the wrong config and fallback
    posture.
12. **Plan-to-PR completion gate.** Walk every Goal, Test, Validation
    expectation, and Self-Review audit in this plan. Each must be
    either satisfied in the PR or explicitly deferred in this plan doc
    with written rationale before merge.
13. **PR preparation.** Open a PR against `main` using the required
    template. The PR body must say that:
    - B.2b is still direct-URL only
    - route access remains organizer/root-admin only
    - the backend contract is unchanged from A.2b
    - the reversal flow is sheet-only, not list-row one-tap

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `refactor(web): share redemptions row reads` | `npm run lint`, `npm test`, `npm run build:web` |
| 2 | `feat(web): add reverse redemption mutation hook` | `npm run lint`, `npm test`, `npm run build:web` |
| 3 | `feat(web): add reversal confirmation to redemption details` | `npm run lint`, `npm test`, `npm run build:web` |
| 4 | `feat(web): wire reversal refresh flow into redemptions page` | `npm run lint`, `npm test`, `npm run build:web` |
| 5 | `test(e2e): cover organizer reversal in redemptions smoke` | `npm run lint`, `npm test`, `npm run test:functions`, `npm run test:e2e:redemptions` |
| 6 | `docs: mark phase b.2b landed and sync architecture` | `npm run lint`, `npm test`, `npm run build:web` |

Review-fix commits, if needed, land between 5 and 6.

## Tests

### `tests/web/redemptions/useReverseRedemption.test.ts` (new)

What the suite must prove:

- missing `eventId` returns a transient failure state immediately
- a successful `reversed_now` response maps to the expected UI success
  state with `reversedAt` and `reversedByRole`
- a successful `already_unredeemed` response maps to the expected
  idempotent success state
- `403/not_authorized` and `404/not_found` map to stable failure states,
  not transient retry
- network failure, `500`, malformed `200`, and unexpected `401` trigger
  one automatic retry before settling into transient failure
- blank reason input is normalized to `null`
- `retryLastSubmission()` resubmits the last suffix/reason pair

### `tests/web/redemptions/filterRedemptions.test.ts`

What the updated suite must prove:

- `By me` still matches rows redeemed by the current user
- `By me` now also matches rows reversed by the current user
- a row redeemed by another user but reversed by the current user stays
  in the filtered result
- a row with both actor fields null still does not match

### `tests/web/redemptions/RedemptionDetailSheet.test.tsx`

What the updated suite must prove:

- a redeemed row renders the `Reverse redemption` CTA in the details
  step
- a reversed row renders no reversal CTA
- clicking `Reverse redemption` transitions to the confirmation step in
  the same dialog
- the confirmation step renders the code, status summary, optional
  reason field, `Back`, and `Confirm reversal`
- `Back` returns to the details step and clears any sheet-level
  transient mutation message
- pending submit disables the actions and swaps the confirm label to
  `Reversing...`
- success state can render both `reversed_now` and `already_unredeemed`
  outcomes without closing the sheet
- when the selected row includes `redemption_note`, the sheet renders a
  `Reason` row
- existing focus-trap, Escape-close, scrim-close, and focus-return
  behavior still hold

### `tests/web/pages/EventRedemptionsPage.test.tsx`

What the updated suite must prove:

- selecting a redeemed row and confirming reversal calls the mutation
  hook with the current `eventId`, the selected row's 4-digit suffix,
  and the trimmed optional reason
- after a successful reverse result, the page re-reads the selected row
  and triggers the list refresh
- the selected-row sheet updates from the re-read result even before the
  list refresh resolves
- if the row re-read fails after a successful reverse response, the page
  surfaces a visible detail-refresh error while still issuing the full
  list refresh
- stable failure (`not_authorized`, `not_found`) renders in the sheet
  without closing it
- transient failure renders `Retry`, and retry reuses the last selected
  row + reason
- switching from one selected row to another clears the prior row's
  draft reason and mutation result state

### `tests/e2e/mobile-smoke.redemptions.spec.ts`

What the updated spec must prove, under a mobile viewport against local
Supabase + local Edge Functions:

- organizer sign-in still lands on `/event/<slug>/redemptions`
- opening a redeemed row shows the `Reverse redemption` CTA
- entering an optional reason and confirming reversal updates the open
  sheet to a reversed state
- closing the sheet and toggling `By me` keeps the just-reversed row in
  view
- re-opening the reversed row shows no `Reverse redemption` CTA and, when
  a reason was entered, shows the stored reason

No second redemptions Playwright runner is added. Extend the landed
runner and fixture instead of splitting coverage across two almost-
identical entry points.

## Self-Review Audits

Run the applicable named audits from
[`docs/self-review-catalog.md`](../../self-review-catalog.md):

- **Frontend/browser surface — `Error-surfacing for user-initiated
  mutations`.** B.2b introduces the highest-risk user-initiated mutation
  on the route. Walk every click/submit path (`Reverse redemption`,
  `Confirm reversal`, `Retry`) for silent failure swallowing and confirm
  each failure class has visible feedback and a recovery action.
- **Frontend/forms surface — `Dirty-state tracked-inputs audit`.** The
  confirmation flow now spans multiple state holders: selected row,
  confirmation-step toggle, reason input, pending state, and mutation
  result. Confirm row switches, close/reopen, and `Back` do not leave a
  stale reason or stale success/error banner attached to the wrong row.
- **Frontend/forms surface — `Post-save reconciliation audit`.** The UI
  must reconcile reversal state from the server response and re-read
  result, not from the pre-submit selected row plus the locally typed
  reason. Confirm the post-success detail view reflects canonical server
  state.
- **CI / validation surface — `Readiness-gate truthfulness audit`.**
  Extending the redemptions Playwright runner means re-checking that its
  local-stack readiness gate still verifies the real reverse-function
  path and does not pass when the route or function is unavailable.
- **SQL surface sentinel — `Grant/body contract audit`.** B.2b is
  frontend-only. If implementation discovers a need to touch SQL grants,
  helper bodies, or RPC auth logic, stop and reopen the earlier phase
  boundary instead of widening B.2b.

## Validation Expectations

- `npm run lint` — passes
- `npm test` — passes with the updated redemptions suites
- `npm run test:functions` — passes; B.2b does not modify backend code,
  but it consumes the landed reverse-function contract and must not
  regress that validation surface
- `npm run build:web` — passes
- `npm run test:e2e:redemptions` — passes against local Supabase plus
  local Edge Functions, proving one organizer reversal through the real
  frontend route and the real reverse endpoint
- Manual sanity:
  - signed in as an organizer, reverse a redeemed row with no reason and
    confirm the sheet updates to `Reversed`
  - reverse a second row with a note and confirm the reopened detail
    sheet shows the stored `Reason`
  - while one organizer browser has the sheet open, reverse the same row
    in a second browser and confirm the first browser surfaces the
    `already_unredeemed` success path rather than a hard error
  - toggle `By me` after reversing a row originally redeemed by another
    user and confirm the row still appears

If any validation cannot be run locally, say exactly why in the PR body.

## Risks and Mitigations

- **Stale selected-row detail after success.** If the UI only flips a
  local badge after success, `already_unredeemed` and stored reasons can
  remain wrong until the list refresh finishes. Mitigation: require the
  single-row re-read and test the page-level orchestration.
- **Accidental double submission.** Reversal is a high-risk write and a
  noisy-booth interaction. Mitigation: confirmation step inside the
  sheet plus disabled pending controls and an idempotent success mapping
  for `already_unredeemed`.
- **Reason text leaking between rows.** The operator may inspect one row,
  type a note, back out, then inspect another row. Mitigation: make row
  switch / close reset behavior part of the page-level test contract and
  the `Dirty-state tracked-inputs audit`.
- **False confidence from optimistic list patching.** A local list patch
  could miss server-side sort order, actor data, or note changes.
  Mitigation: forbid optimistic list replacement and keep the full
  bounded refetch as the list source of truth.
- **Hidden backend drift.** Because B.2b consumes a landed endpoint, it
  is easy to smuggle "small" backend changes into the branch when a UI
  edge appears. Mitigation: treat any backend diff as a scope alarm and
  stop rather than widening the phase.

## Rollback Plan

If B.2b regresses in QA or live dry-run testing, rollback is a pure
frontend revert:

- remove the detail-sheet reversal CTA and confirmation step
- remove the new mutation hook and single-row re-read wiring
- keep the B.2a read-only monitoring route intact

No schema, RPC, or Edge Function rollback is part of the B.2b plan
because B.2b must not change those surfaces.

## Resolved Decisions

- B.2b uses the existing detail sheet as the confirmation container;
  there is no second modal.
- The reason field is optional, single-line, blank-trimmed to `null`,
  and has no new UI-only max-length cap.
- `redemption_note` becomes visible in the detail sheet in B.2b and is
  still omitted from the compact list row.
- Success reconciliation uses both a single-row re-read and the existing
  full list refresh; it does not rely on a local optimistic row patch.
- `By me` expands to include `redemption_reversed_by`.

## Open Questions Blocking B.2b

None at plan-draft time. The only gating dependency is B.2a landing to
`main` before B.2b implementation begins.

## Handoff After B.2b

If B.2b lands as planned:

- Phase B is complete from the operator-UI standpoint
- Phase C can focus purely on attendee completion-screen polling
- Phase D can focus on role seeding / dry-run operations without still
  depending on SQL-only reversal
- the shared event-context resolver extraction remains a bounded
  post-B.2b refactor candidate rather than work folded into this phase
