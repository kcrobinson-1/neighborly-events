# M2 Phase 2.1.2 — Edge Function Authorization Migration

## Status

Landed.

**Parent phase:** [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md),
Milestone M2, Phase 2.1. Sibling sub-phase: 2.1.1 — Landed (database
RLS read-broadening + staffing-table writes). Sibling phases
2.2 / 2.3 / 2.4 / 2.5 — Proposed; M2 row in
[`event-platform-epic.md`](./event-platform-epic.md) stays `Proposed`
until 2.5 lands.

This sub-phase plan flips Status to `Landed` when its implementation
PR merges. The parent 2.1 plan also flips with this PR — 2.1.2 is the
terminal sub-phase under the current sequencing.

**Scoping inputs:**
[`scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md) for the file
inventory and contracts walkthrough;
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
"Cross-Phase Decisions" for the resolution and rejected alternatives
behind every cross-phase decision this plan depends on. The parent
2.1 plan is the authoritative source for cross-cutting invariants and
contracts; this sub-phase compresses the Edge Function slice and
inherits 2.1.1's database-side broadening.

## Goal

Migrate the four authoring Edge Functions (`save-draft`,
`publish-draft`, `unpublish-event`, `generate-event-code`) to accept
organizer JWTs in addition to root-admin JWTs by introducing a shared
`authenticateEventOrganizerOrAdmin` helper that gates on
`is_organizer_for_event(eventId) OR is_root_admin()`. Update the
apps/web caller for `generate-event-code` to pass `eventId` (the only
of the four functions whose payload doesn't already carry it). Update
the user-facing forbidden-branch copy to phrasing that covers either
rejection cause. Update `docs/architecture.md` to reflect the
broadened authoring trust boundary. Flip the parent 2.1 plan Status
from `Proposed` to `Landed` (terminal sub-phase under the current
sequencing).

After this PR lands, the end-to-end organizer authoring path is
user-reachable: an organizer JWT can call the four authoring Edge
Functions for events they organize; the per-event admin UI in
M2 phase 2.2 will be the first consumer surface that exercises this
path.

## Cross-Cutting Invariants

These rules thread every diff line in this sub-phase. Self-review
walks each one against every changed file.

- **Edge Function authorization is centralized.** All four authoring
  functions call `authenticateEventOrganizerOrAdmin` from
  `_shared/event-organizer-auth.ts`. No per-function inline
  `is_admin OR is_organizer_for_event` composition.
- **Forbidden-branch user-facing copy is uniform.** A single message
  string sourced from the helper covers both rejection causes
  ("not allowlisted as root-admin" + "not organizer for this event").
- **Every authoring function migrates.** No function is left on
  `authenticateQuizAdmin`. `authenticateQuizAdmin` itself is preserved
  as a reference symbol with no remaining callers (per the parent
  plan's Files-intentionally-not-touched record).
- **Test stub migration is per-test.** Every test that previously
  stubbed `authenticateQuizAdmin` now stubs
  `authenticateEventOrganizerOrAdmin` with the eventId-aware
  signature; the dependency-injection pattern is preserved so the
  existing test shapes adapt in place.

## Naming

- New helper file: `supabase/functions/_shared/event-organizer-auth.ts`.
- Helper symbol: `authenticateEventOrganizerOrAdmin`.
- Reuses the `AdminAuthResult` discriminated-union type from
  [`_shared/admin-auth.ts`](../../supabase/functions/_shared/admin-auth.ts).

## Contracts

**`authenticateEventOrganizerOrAdmin` shape.** Signature:
`(request, eventId, supabaseUrl, serviceRoleKey, supabaseClientKey) → Promise<AdminAuthResult>`.
Body: read bearer token; service-role
[`auth.getUser(token)`](https://supabase.com/docs/reference/javascript/auth-getuser)
to verify the user; user-scoped client (configured with the bearer
token in the Authorization header) calls
`rpc('is_organizer_for_event', { target_event_id: eventId })` AND
`rpc('is_root_admin')`; returns `{ status: 'ok', userId }` if either
returns true, otherwise `{ status: 'forbidden', error }`. Returns
`{ status: 'unauthenticated', error }` if the bearer token is missing
or the service-role `auth.getUser` rejects. Bearer-token reading is
duplicated from `admin-auth.ts` rather than extracted, per the parent
plan's "two helpers independently auditable" rationale.

**Forbidden-branch error copy.** "This account is not authorized to
author this event." Replaces the prior
"This account is not allowlisted for game authoring." emitted by
`authenticateQuizAdmin`.

**Per-function eventId source:**

- `save-draft`: `body.content.id` — the draft id, which equals the
  event id since `game_event_drafts.id = game_events.id =
  event_role_assignments.event_id`. Already extracted by the existing
  `parseAuthoringGameDraftContent` validator before any persistence
  call.
- `publish-draft`: `body.eventId` — already a top-level field in the
  validated payload.
- `unpublish-event`: `body.eventId` — same.
- `generate-event-code`: `body.eventId` — added by this sub-phase.
  The validator gains an `eventId` requirement; missing or non-string
  → 400.

**`shared/events/admin.ts` `generateEventCode` signature.** Gains an
`eventId: string` parameter and forwards it as the request body
field. Mirrors the existing `publishDraftEvent(eventId)` /
`unpublishEvent(eventId)` shape. Single call site:
[`apps/web/src/admin/AdminEventDetailsForm.tsx`](../../apps/web/src/admin/AdminEventDetailsForm.tsx)
`handleRegenerateEventCode` passes `draft.id` (already in scope on
the form via the `draft` prop).

**`_shared/authoring-http.ts` shared wrapper.** The wrapper drops the
`authenticateQuizAdmin` call (and the `authenticateQuizAdmin`
injection in `AuthoringHttpDependencies`); each function's
`handleRequest` parses its payload, extracts `eventId`, then calls
`authenticateEventOrganizerOrAdmin` directly via its own dependency-
injection slot. The wrapper retains origin/CORS/method/env-config
gating and exposes `supabaseClientKey` in `AuthoringRequestContext`
so functions can thread it into the helper. The `admin` field in
`AuthoringRequestContext` is removed; functions read `userId` from
the helper's return value.

**Existing helpers and config are unchanged.**
`is_organizer_for_event(text)` and `is_root_admin()` ship in
[`supabase/migrations/20260421000200_add_event_role_helpers.sql`](../../supabase/migrations/20260421000200_add_event_role_helpers.sql);
this sub-phase consumes them and adds no new SQL helper. The four
authoring functions' `[functions.<name>] verify_jwt = false` entries
in [`supabase/config.toml`](../../supabase/config.toml) stay as today.

## Files to touch — new

- `supabase/functions/_shared/event-organizer-auth.ts` — the new
  shared helper.

## Files to touch — modify

- [`supabase/functions/_shared/authoring-http.ts`](../../supabase/functions/_shared/authoring-http.ts)
  — drop `authenticateQuizAdmin` from `AuthoringHttpDependencies` and
  the call in `createAuthoringPostHandler`; drop `admin` from
  `AuthoringRequestContext`; add `supabaseClientKey` to the context.
- [`supabase/functions/save-draft/index.ts`](../../supabase/functions/save-draft/index.ts)
  — extract eventId from `body.content.id`; call the new helper after
  payload validation; thread `userId` from the auth result into the
  persistence call.
- [`supabase/functions/publish-draft/index.ts`](../../supabase/functions/publish-draft/index.ts)
  — extract eventId from `body.eventId`; same shape.
- [`supabase/functions/unpublish-event/index.ts`](../../supabase/functions/unpublish-event/index.ts)
  — same.
- [`supabase/functions/generate-event-code/index.ts`](../../supabase/functions/generate-event-code/index.ts)
  — add `eventId` payload requirement; same shape.
- [`shared/events/admin.ts`](../../shared/events/admin.ts) —
  `generateEventCode(eventId: string)` signature and body forwarding.
- [`apps/web/src/admin/AdminEventDetailsForm.tsx`](../../apps/web/src/admin/AdminEventDetailsForm.tsx)
  — pass `draft.id` to `generateEventCode`.
- [`tests/supabase/functions/save-draft.test.ts`](../../tests/supabase/functions/save-draft.test.ts)
  — migrate stubs from `authenticateQuizAdmin` to
  `authenticateEventOrganizerOrAdmin`.
- [`tests/supabase/functions/publish-draft.test.ts`](../../tests/supabase/functions/publish-draft.test.ts)
  — same.
- [`tests/supabase/functions/unpublish-event.test.ts`](../../tests/supabase/functions/unpublish-event.test.ts)
  — same.
- [`tests/supabase/functions/generate-event-code.test.ts`](../../tests/supabase/functions/generate-event-code.test.ts)
  — same; also adds `eventId` to test payloads.
- [`tests/supabase/functions/authoring-helpers.ts`](../../tests/supabase/functions/authoring-helpers.ts)
  — adapt the shared dependency factory to the migrated wrapper shape.
- [`docs/architecture.md`](../architecture.md) — trust-boundary text
  and "Current Backend Surface" list reflect the broadened authoring
  gate (organizer-or-admin) on the four functions.
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.
- [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) — Status flips
  from `Proposed` to `Landed` (terminal sub-phase under the current
  sequencing).

## Files intentionally not touched

- [`supabase/functions/_shared/admin-auth.ts`](../../supabase/functions/_shared/admin-auth.ts)
  — `authenticateQuizAdmin` is preserved as a reference; no remaining
  callers after this PR. Bearer-token reading stays duplicated rather
  than extracted, per the parent plan.
- The migration `20260427010000_broaden_event_scoped_rls.sql` and the
  two pgTAP files
  ([`authoring_reads_rls.test.sql`](../../supabase/tests/database/authoring_reads_rls.test.sql),
  [`event_role_assignments_rls.test.sql`](../../supabase/tests/database/event_role_assignments_rls.test.sql))
  — landed in 2.1.1.
- [`supabase/config.toml`](../../supabase/config.toml) — the four
  authoring functions already carry `verify_jwt = false`; no change.
- [`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`](../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)
  and the redeem / reverse Edge Functions — out of phase 2.1 entirely.
- `apps/site/*`, `vercel.json`, other apps/web files beyond the one
  call-site change — no other consumer of the four authoring
  functions today.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and the 2.1.2
   implementation feature branch (not `main`, not a doc-only branch).
   Confirm Node and Deno versions match
   [`mise.toml`](../../mise.toml) (`mise exec` if the shell isn't
   activated). Re-read 2.1.1's plan to confirm the database surface
   is in the expected post-2.1.1 state.
2. **Baseline validation.** Run `npm run lint`, `npm run build:web`,
   `npm run build:site`, `npm test`, `npm run test:functions`, and
   `npm run test:db`. All must pass before any edit.
3. **Write the helper.** Create
   `supabase/functions/_shared/event-organizer-auth.ts`. Body
   structure mirrors `_shared/admin-auth.ts`: read bearer token,
   service-role `auth.getUser`, user-scoped client running both RPC
   calls in sequence (organizer first, then root-admin), return on
   either OR-branch.
4. **Migrate the wrapper.** Update
   `_shared/authoring-http.ts`: drop `authenticateQuizAdmin` from
   `AuthoringHttpDependencies`; drop the auth call in
   `createAuthoringPostHandler`; drop `admin` from
   `AuthoringRequestContext`; add `supabaseClientKey` to the context.
5. **Migrate the four authoring functions.** Edit each in turn:
   `save-draft` (extract `body.content.id`), `publish-draft`
   (`body.eventId`), `unpublish-event` (`body.eventId`),
   `generate-event-code` (`body.eventId`, payload validator gains the
   field). Each function adds an `authenticateEventOrganizerOrAdmin`
   slot to its `*HandlerDependencies` type, calls the helper after
   payload validation, and threads the auth result's `userId` where
   the function previously read `context.admin.userId`. Run
   `deno check --no-lock` per file as you go.
6. **Update the apps/web side.** Edit
   [`shared/events/admin.ts`](../../shared/events/admin.ts) so
   `generateEventCode(eventId: string)` forwards `{ eventId }` as the
   request body. Edit
   [`apps/web/src/admin/AdminEventDetailsForm.tsx`](../../apps/web/src/admin/AdminEventDetailsForm.tsx)
   so `handleRegenerateEventCode` passes `draft.id` to
   `generateEventCode`.
7. **Migrate function tests.** Update each of the four test files
   plus [`authoring-helpers.ts`](../../tests/supabase/functions/authoring-helpers.ts):
   replace `authenticateQuizAdmin` stubs with
   `authenticateEventOrganizerOrAdmin` stubs at the per-function
   dependency level; update expected error messages to the new
   forbidden copy where they assert against it; add `eventId` to
   `generate-event-code` test payloads. Run `npm run test:functions`.
8. **Update `docs/architecture.md`.** Walk the doc's "Backend
   Structure", "What Is Implemented Now", and "Current Backend
   Surface" sections; reflect that the four authoring functions
   accept organizer JWTs (the broadened gate), the new helper file
   path, and the trust-boundary widening. Walk the Doc Currency PR
   Gate triggers in [`AGENTS.md`](../../AGENTS.md): the trust-boundary
   text changes (organizer write capability is new); the Backend
   Surface list updates (organizer-or-admin gate on the four
   authoring functions). No operations / dev / open-questions /
   backlog impact in this sub-phase.
9. **Repeat full validation.** All baseline commands from step 2.
10. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against the Cross-Cutting Invariants and
    each Self-Review Audit named below. Fix in place; commit
    review-fix changes separately when that clarifies history per
    [`AGENTS.md`](../../AGENTS.md) Review-Fix Rigor.
11. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation Gate command, and Self-Review Audit named
    in this plan. Confirm each is satisfied or explicitly deferred in
    this plan with rationale. Flip Status from `Proposed` to `Landed`
    on this plan AND on the parent 2.1 plan in the same PR.
12. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters. Validation section lists every command
    actually run. Target Shape Evidence: name the four migrated
    functions and the new helper file (1:1 mapping with the four
    test-file migrations). UX Review: `N/A` (no user-visible behavior
    on the existing root-admin path; organizer path has no UI
    consumer until 2.2). Remaining Risk: organizer-redeem deferral;
    Edge Function gates now organizer-or-admin; the per-event admin
    UI in 2.2 is the first consumer surface for the broadened gate.

## Commit boundaries

Per [`AGENTS.md`](../../AGENTS.md) "Planning Depth," commit slices
named upfront:

1. **Helper + caller migration.** The new
   `_shared/event-organizer-auth.ts`, the wrapper change, the four
   authoring-function caller swaps, the `shared/events/admin.ts`
   signature change, the `AdminEventDetailsForm` call-site change,
   the four function test migrations, and the `authoring-helpers.ts`
   adapt (steps 3–7). Single commit; the helper alone has no
   consumer and the four callers cannot land without it (per the
   parent plan).
2. **Documentation update + Status flips.** `docs/architecture.md`
   edits and Status flips on this plan AND parent 2.1 plan
   (steps 8 + 11). Single commit.
3. **Review-fix commits.** As needed during step 10, kept distinct
   from the substantive implementation commits.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final. The
  `generateEventCode` signature change is the only apps/web touch
  beyond the one-line caller update; the build pass confirms the
  binding modules haven't drifted.
- `npm run build:site` — pass on baseline; pass on final. No
  apps/site source change.
- `npm test` — pass on baseline; pass on final. No vitest tests
  exercise the migrated paths directly today; this is a paranoia
  check that no shared module the apps/web bundle depends on
  regressed.
- `npm run test:functions` — pass on baseline; pass on final. The
  four function-test migrations land here.
- `npm run test:db` — pass on baseline; pass on final. No DB change
  in this sub-phase; existing 312 tests stay green.
- `deno check --no-lock` on each of the four edited Edge Functions
  plus the new shared helper — all pass.
- **Manual organizer authoring exercise — deferred to human reviewer
  pre-merge.** With the local Supabase running, assign an `organizer`
  row for a fixture user against a test event, sign that user in via
  magic link, and exercise the four authoring Edge Functions for the
  fixture event via the admin UI: save a draft (succeeds), publish
  it (succeeds), unpublish it (succeeds), regenerate the event code
  (succeeds). Repeat for an unrelated event id where the user is not
  organizer (each function returns 403 with the new forbidden copy).
  Recorded as the in-PR human gate rather than agent-driven because
  magic-link sign-in is not scriptable from the implementer's
  environment.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md) and
matched to this sub-phase's diff surfaces. The SQL audits from the
parent plan apply to 2.1.1's diff, not this one.

### Edge Functions & deployment config

- **Platform-auth-gate config audit.** Re-confirm during the diff
  walk that all four functions still carry
  `[functions.<name>] verify_jwt = false` in
  [`supabase/config.toml`](../../supabase/config.toml). The entries
  must remain present and unchanged.
- **Error-surfacing for user-initiated mutations.** The forbidden
  branch's user-facing copy must surface honestly when the rejection
  reason is "not an organizer for this event" rather than
  "not allowlisted." The shared helper returns the new copy; the
  four callers' existing error-rendering paths surface it via the
  binding modules. Walk apps/web for any literal hard-coded match
  against the old "not allowlisted" string.
- **Bearer-token duplicate audit.** The new helper duplicates bearer-
  token reading from `admin-auth.ts`. Confirm the duplicate is
  intentional (per the parent plan) and that any future token-format
  change touches both files. Recorded here as a deliberate choice
  rather than a forgotten extraction.

### apps/web TypeScript

- **Call-site coverage.** `generateEventCode` is now invoked with
  one positional argument; grep apps/web for every call site and
  confirm each passes a valid `eventId`. Today there is exactly one
  call site
  ([`AdminEventDetailsForm.tsx`](../../apps/web/src/admin/AdminEventDetailsForm.tsx));
  the audit confirms no second caller has appeared since plan time.
- **Type discipline.** `AuthoringGameDraftContent.id` is the source
  of truth for `save-draft`'s eventId — no separate field added.
  Confirm the parsed payload's `id` flows into the helper call
  without intermediate copies that could drift.

### CI & testing infrastructure

- **CLI / tooling pinning audit.** Does not apply: no new
  dependencies, no CLI version bump.
- **Rename-aware diff classification.** Does not apply: this
  sub-phase adds and modifies, but does not rename across surfaces.
  Any `git diff --name-status` output should show pure `A`/`M`
  entries.
- **Function-test mock drift audit.** Every test that previously
  stubbed `authenticateQuizAdmin` now stubs
  `authenticateEventOrganizerOrAdmin`. Verify by grepping
  `tests/supabase/functions/` for the old name post-migration —
  expected zero hits.
- **Readiness-gate truthfulness audit.** The manual organizer
  authoring exercise must reflect a real run before merge; the PR
  records it as deferred-to-human and the human reviewer signs off
  rather than the agent claiming it from code reasoning.

## Documentation Currency PR Gate

Per [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/architecture.md`](../architecture.md) — trust-boundary text
  reflects organizer write capability via the broadened authoring
  functions; Backend Surface list reflects the broadened gates and
  the new shared helper file.
- This plan — Status flips from `Proposed` to `Landed`.
- [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) — Status flips
  from `Proposed` to `Landed` (terminal sub-phase).

Intentionally not updated by 2.1.2 (recorded so reviewer attention
doesn't relitigate them):

- [`docs/operations.md`](../operations.md) — no operator runbook
  change; the per-event admin URL contract is owned by 2.3 / 2.4.
- [`docs/product.md`](../product.md) — no implemented capability
  surfaces to users yet; the organizer-authoring path becomes
  user-reachable when the per-event admin UI lands in 2.2.
- [`docs/dev.md`](../dev.md) — no new validation commands.
- [`docs/open-questions.md`](../open-questions.md) — the post-MVP
  authoring-ownership entry closes with M2's terminal PR (2.5),
  not 2.1.2's.
- [`docs/backlog.md`](../backlog.md) — the
  organizer-managed-agent-assignment unblock is recorded with M2's
  terminal PR (2.5), not 2.1.2's.

## Out Of Scope

- **Per-event admin UI** (M2 phase 2.2),
  **`/auth/callback` and `/` migration** (M2 phase 2.3),
  **platform-admin migration** (M2 phase 2.4),
  **operator URL migration** (M2 phase 2.5). The per-event admin UI
  in 2.2 is the first consumer surface for the broadened gate.
- **Organizer-redeem RPC broadening.** Out of phase 2.1 entirely.
  The `redeem_entitlement_by_code` RPC's gate stays unchanged.
  Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §2.
- **Bearer-token extraction shared between `admin-auth.ts` and
  `event-organizer-auth.ts`.** Preserve the duplicate per the parent
  plan; revisit post-epic if a third caller emerges.
- **`apps/web` admin URL routing changes.** The existing
  `/admin/*` URL surface stays as today; the per-event admin URL
  lands in 2.2.

## Risk Register

- **`generate-event-code` payload change is a breaking contract.**
  The Edge Function rejects `{}` payloads after the migration; the
  apps/web caller must land in the same PR or the regenerate-code
  button breaks in production. Mitigation: shared client signature
  + apps/web call-site update is in scope; the validator change
  surfaces clearly in `npm run test:functions` if a fixture drifts.
- **Forbidden-branch copy regression.** The new copy is broader than
  the old "not allowlisted" string. Any UI surface assertion or
  fixture matching the literal string must update. Mitigation: grep
  apps/web and `tests/` for the old copy during step 7; update any
  literal matches in the same commit.
- **Function-test mock drift not caught locally.** Each test file
  that stubbed `authenticateQuizAdmin` needs the new helper name and
  the eventId-aware signature. Mitigation: caught by
  `npm run test:functions` in step 9; the diff records each
  migrated test file.
- **Wrapper migration ripple.** Dropping `authenticateQuizAdmin`
  from `AuthoringHttpDependencies` and `admin` from
  `AuthoringRequestContext` ripples to every authoring function and
  every authoring test. Mitigation: the four functions are the only
  callers of the wrapper; grep confirms the blast radius is bounded.
- **Manual authoring exercise is the in-PR human gate.** Function
  tests cover mock paths but not the live magic-link → admin UI →
  Edge Function path. The repro recipe is in the Validation Gate.

## Backlog Impact

- "Organizer-managed agent assignment" (per the epic's "Items
  unblocked but not landed by this epic") becomes implementable on
  top of 2.1.1's `event_role_assignments` broadening with no further
  authorization work needed from 2.1.2. The unblock is recorded in
  [`docs/backlog.md`](../backlog.md) by M2's terminal PR (2.5), not
  by this sub-phase.

## Related Docs

- [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) — parent phase
  plan; this sub-phase compresses its Edge Function slice and flips
  the parent Status to `Landed`.
- [`m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md) — sibling
  sub-phase that landed the database side.
- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M2 paragraph at lines 544–669.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone doc; cross-phase decisions, sequencing, invariants.
- [`scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md) — scoping
  doc the parent plan compresses.
- [`scoping/m2-phase-2-2.md`](./scoping/m2-phase-2-2.md) — the
  consumer phase whose UI is the first user-reachable consumer of
  this sub-phase's broadening.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules, Plan-to-PR
  Completion Gate, Doc Currency PR Gate.
