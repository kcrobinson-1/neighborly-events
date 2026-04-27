# M2 Phase 2.1.1 — Database RLS Broadening + pgTAP Coverage

## Status

Proposed.

**Parent phase:** [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md),
Milestone M2, Phase 2.1. Sibling sub-phase: 2.1.2 Edge Function
authorization migration + docs — Proposed (plan TBD). Sibling phases
2.2 / 2.3 / 2.4 / 2.5 — Proposed; M2 row in
[`event-platform-epic.md`](./event-platform-epic.md) stays `Proposed`
until 2.5 lands.

This sub-phase plan flips Status to `Landed` when its implementation PR
merges. The parent 2.1 plan flips when 2.1.2 lands (the terminal
sub-phase under the current sequencing), not by this PR.

**Scoping inputs:**
[`scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md) for the file
inventory and contracts walkthrough;
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md) "Cross-Phase
Decisions" for the resolution and rejected alternatives behind every
cross-phase decision this plan depends on. The parent 2.1 plan is the
authoritative source for cross-cutting invariants and contracts; this
sub-phase compresses the database slice and leaves the Edge Function
slice to 2.1.2 verbatim.

## Goal

Ship the database-layer broadening for M2 phase 2.1 in a single PR:

1. Add direct-write RLS policies on the eight event-scoped tables
   enumerated below using the broadening predicate
   `is_organizer_for_event(event_id) OR is_root_admin()`.
2. Replace the `event_role_assignments` SELECT policy with a
   three-branch version that admits organizer reads for events they
   organize, alongside the existing self-or-root-admin branches.
3. Widen the `publish_game_event_draft()` and `unpublish_game_event()`
   RPC authorization predicates from `is_admin()` to
   `is_admin() OR is_organizer_for_event(p_event_id)`. Audit-log and
   version rows continue to flow exclusively through these RPCs.
4. Cover every new policy and the SELECT-policy extension with
   per-table-per-privilege-per-role pgTAP assertions in two new test
   files.

The Edge Function authorization migration (the new shared helper, the
four caller swaps, and the `docs/architecture.md` updates) is
deliberately out of scope and lands in 2.1.2. With 2.1.1 alone in
`main`, no production caller reaches the broadened gates: the four
authoring Edge Functions still gate to `authenticateQuizAdmin`
(root-admin only), and direct PostgREST writes from organizer JWTs are
unblocked but have no UI consumer. This is intentional pre-paving — the
database side is self-contained, validates independently via pgTAP, and
ships its own PR so reviewer attention is concentrated on the SQL surface.

## Cross-Cutting Invariants

These rules thread every diff line in this sub-phase. Self-review walks
each one against every changed file. The Edge Function centralization
invariant from the parent plan is deferred to 2.1.2 with the helper
itself.

- **Broadening predicate is uniform.** Every event-scoped write policy
  added or replaced uses the predicate
  `is_organizer_for_event(event_id) OR public.is_root_admin()` — same
  helper signature (`event_id text`), same OR-shape, same case
  ordering. No table or RPC writes its own variant.
- **Agent write posture is unchanged.** Agents do not gain direct
  table writes. The only agent-reachable write path stays the existing
  `redeem_entitlement_by_code` SECURITY DEFINER RPC at
  [`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`](../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql);
  its gate is not touched in this sub-phase.
- **Audit-log and versions invariant preserved.**
  `game_event_audit_log` and `game_event_versions` keep direct INSERT
  denied to non-service-role callers. Organizer publish and unpublish
  writes those rows transitively through `publish_game_event_draft()`
  / `unpublish_game_event()`, whose authorization predicates widen in
  this sub-phase. Direct-INSERT policies for these two tables are
  deliberately not added.
- **pgTAP per-privilege split.** `has_table_privilege(role, table,
  '<priv>')` is called once per privilege; comma-separated lists
  (`'SELECT,INSERT,DELETE'`) are banned because PostgreSQL's any-of
  semantics make them vacuous. Negative assertions are re-verified
  under the Supabase CLI baseline grants per the
  [self-review catalog's Privilege-test vacuous-pass audit](../self-review-catalog.md).

## Naming

- The new SQL migration is `20260427010000_broaden_event_scoped_rls.sql`.
  The next free slot after the latest migration
  ([`20260423020000_add_game_event_admin_status_view.sql`](../../supabase/migrations/20260423020000_add_game_event_admin_status_view.sql))
  under the repo's `YYYYMMDDHHMMSS_snake_case_description.sql`
  convention.
- New pgTAP files name the surface, not the phase, per
  [`AGENTS.md`](../../AGENTS.md) anti-patterns:
  `event_scoped_writes_rls.test.sql` and
  `event_role_assignments_rls.test.sql`.

The Edge Function helper file name (`event-organizer-auth.ts`) and
helper symbol name (`authenticateEventOrganizerOrAdmin`) are reserved
for 2.1.2 and not introduced here.

## Tables in scope

The migration broadens write policies for the following event-scoped
tables. Each row names the policy shape the migration ships.

| Table | Direct write policies added | Notes |
| --- | --- | --- |
| `game_events` | UPDATE, DELETE — `WITH CHECK` and `USING` | INSERT stays service-role-only (event creation is platform-admin) |
| `game_questions` | INSERT, UPDATE, DELETE | `event_id` is a direct column |
| `game_question_options` | INSERT, UPDATE, DELETE | `event_id` is a direct column |
| `game_event_drafts` | INSERT, UPDATE, DELETE | Predicate references `id` (text PK that doubles as `event_id`) |
| `game_completions` | INSERT, UPDATE, DELETE | Reachable today only via service-role RPC; broadening is symmetric |
| `game_entitlements` | UPDATE, DELETE | INSERT stays service-role-only (entitlements are RPC-created); existing SELECT policy untouched |
| `game_starts` | INSERT, UPDATE, DELETE | Analytics surface; broadening is symmetric |
| `event_role_assignments` | INSERT, DELETE | UPDATE stays revoked at the privilege layer; SELECT gains an organizer branch (see Contracts) |

Direct-INSERT policies are **not** added for:

- `game_event_audit_log` — service-role-only INSERT; broadening flows
  through the publish/unpublish RPCs.
- `game_event_versions` — service-role-only INSERT; broadening flows
  through `publish_game_event_draft()`.

The `admin_users` table is platform-level and stays unchanged.

## Contracts

**Broadening predicate.** Every direct-write policy uses
`with check (public.is_organizer_for_event(event_id) OR public.is_root_admin())`
with a matching `using (...)` clause for UPDATE / DELETE. For
`game_event_drafts` whose `event_id` lives as the `id` column, the
predicate substitutes `id` for `event_id` directly — no subquery
against `game_events`.

**`event_role_assignments` SELECT policy extension.** The existing
self-or-root-admin SELECT policy at
[`supabase/migrations/20260421000500_add_redemption_rls_policies.sql`](../../supabase/migrations/20260421000500_add_redemption_rls_policies.sql)
is replaced with one that admits a third branch:
`is_organizer_for_event(event_id)`. Effect: an organizer can list the
agents and organizers assigned to events they organize. Self-read and
root-admin read continue to work.

**`event_role_assignments` write policies.** New INSERT and DELETE
policies use the broadening predicate. UPDATE stays revoked at the
privilege layer; the original migration deliberately omits the UPDATE
grant.

**`publish_game_event_draft` / `unpublish_game_event` RPC widening.**
Each function's internal `is_admin()` gate is replaced with
`is_admin() OR is_organizer_for_event(p_event_id)` (the parameter both
functions already receive). Their `SECURITY DEFINER`, `search_path`,
and grant lists are unchanged. The audit-log and version rows they
write continue to flow through the function bodies exclusively.

**Existing SECURITY DEFINER helpers are unchanged.**
`is_organizer_for_event(text)`, `is_agent_for_event(text)`, and
`is_root_admin()` ship in
[`supabase/migrations/20260421000200_add_event_role_helpers.sql`](../../supabase/migrations/20260421000200_add_event_role_helpers.sql);
this sub-phase consumes them and adds no new helper variant.

## Files to touch — new

- `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql` —
  single migration. Adds the eight tables' direct-write policies per
  the table above; replaces the `event_role_assignments` SELECT policy
  with the three-branch version; widens `publish_game_event_draft` and
  `unpublish_game_event` bodies. Migration's leading comment
  enumerates the table set 1:1 with the pgTAP coverage so reviewers
  can walk one against the other.
- `supabase/tests/database/event_scoped_writes_rls.test.sql` —
  per-table, per-privilege, per-role assertions for every direct-write
  policy this sub-phase adds. Reuses the role-switching pattern from
  [`supabase/tests/database/redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql)
  (`set local role authenticated` plus
  `set_config('request.jwt.claims', ...)` per case). Covers organizer
  positive (own event), organizer negative (other event), agent
  negative (no direct writes), unrelated-authenticated negative, anon
  negative (privilege layer denial), and root-admin positive.
- `supabase/tests/database/event_role_assignments_rls.test.sql` —
  focused suite for the staffing-table broadening. Same role matrix.
  Includes the SELECT-policy extension test (organizer can read
  assignments for their event but not for other events) and the
  privilege-layer assertion that UPDATE stays revoked from
  `authenticated` and `service_role`.

## Files to touch — modify

- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.

The parent [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) Status line
stays `Proposed` (or `In progress` if a sibling sub-phase is mid-flight)
until 2.1.2 lands. The implementing PR for 2.1.1 may add a one-line
"Sub-phases:" entry to the parent plan's Status block to make the split
discoverable; that's the only allowed parent-plan touch in this PR.

## Files intentionally not touched

- `supabase/functions/_shared/event-organizer-auth.ts` — the new
  shared helper introduces with 2.1.2 alongside its four callers, so
  the helper and its consumers ship as one reviewable diff.
- [`supabase/functions/save-draft/index.ts`](../../supabase/functions/save-draft/index.ts),
  [`supabase/functions/publish-draft/index.ts`](../../supabase/functions/publish-draft/index.ts),
  [`supabase/functions/unpublish-event/index.ts`](../../supabase/functions/unpublish-event/index.ts),
  [`supabase/functions/generate-event-code/index.ts`](../../supabase/functions/generate-event-code/index.ts)
  — caller migration is 2.1.2.
- [`supabase/functions/_shared/admin-auth.ts`](../../supabase/functions/_shared/admin-auth.ts)
  — `authenticateQuizAdmin` is preserved as-is and remains the gate
  for all four authoring functions until 2.1.2.
- [`docs/architecture.md`](../architecture.md) — doc update lands in
  2.1.2 so the trust-boundary text and Backend Surface list reflect
  the end-to-end organizer write capability (DB + Edge Functions) in
  one coherent edit, rather than describing a partial state after
  2.1.1.
- [`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`](../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)
  — the redeem RPC's gate stays
  `is_agent_for_event OR is_root_admin` per the resolved decision to
  defer organizer-redeem broadening
  ([`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §2). Out of phase 2.1 entirely.
- `apps/web/*`, `apps/site/*`, `shared/*`, `vercel.json`,
  `supabase/config.toml` — no changes. Consumer surfaces consume the
  broadened gates without needing 2.1 to wire any UI.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and the 2.1.1
   implementation feature branch (not `main`, not the doc-only branch
   that landed this plan). Confirm Node and Deno versions match
   [`mise.toml`](../../mise.toml) (`mise exec` if the shell isn't
   activated). Read the latest sibling-phase scoping docs to confirm
   none have moved.
2. **Baseline validation.** Run `npm run lint`, `npm run build:web`,
   `npm run build:site`, `npm test`, `npm run test:functions`, and
   `npm run test:db` (the repo's pgTAP runner; auto-starts the local
   Supabase stack via `npx supabase start` per
   [`docs/dev.md`](../dev.md) and stops it afterward if it owned the
   start). All must pass before any edit. If pgTAP is blocked because
   Docker is not running, start Docker before proceeding rather than
   skipping the gate.
3. **Write the migration.** Create
   `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql`.
   Migration body order: (a) leading comment enumerating the table
   set, (b) per-table direct-write policies in the order from the
   "Tables in scope" section, (c) `event_role_assignments` SELECT
   policy replacement, (d) `publish_game_event_draft` and
   `unpublish_game_event` body widening via
   `create or replace function`. Each policy carries an inline comment
   naming the broadening predicate so reviewer attention reads the
   predicate once per policy.
4. **Apply locally.** `npm run test:db` (or `npx supabase db reset`
   followed by the pgTAP runner). The new migration must apply
   cleanly against the full local migration history.
5. **Write `event_scoped_writes_rls.test.sql`.** Reuse the fixture
   pattern from
   [`redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql):
   `set local session_replication_role = 'replica'` only for the
   duration of `auth.users`-FK-bypassing seeds, reset to `'origin'`
   before any trigger-dependent assertion, and use
   `set local role authenticated` plus
   `set_config('request.jwt.claims', ...)` per role under test.
   Per-table-per-privilege-per-role cells; aim for explicit
   `pass`/`fail` assertions over count-based checks so a reviewer can
   see the truth table.
6. **Write `event_role_assignments_rls.test.sql`.** Same fixture
   shape. Cover the organizer SELECT extension explicitly: a fixture
   organizer for event A reads their own assignments for A and is
   denied reads for assignments belonging to event B.
7. **Run the new tests in isolation, then full pgTAP.** First the two
   new test files alone via the repo's targeted-pgTAP path
   (`npm run test:db -- --include event_scoped_writes_rls.test.sql event_role_assignments_rls.test.sql`
   or the equivalent `supabase test db --linked --include …`), then
   the full `npm run test:db` sweep. Both must pass. The
   Privilege-test vacuous-pass audit (per
   [`docs/self-review-catalog.md`](../self-review-catalog.md)) is
   satisfied at this step: walk each negative assertion against
   "would this pass under bare-PostgreSQL with no baseline grants?"
   and split any comma-separated privilege list.
8. **Repeat full validation.** All baseline commands from step 2.
9. **Documentation currency check.** Walk the Doc Currency PR Gate
   triggers in [`AGENTS.md`](../../AGENTS.md). For 2.1.1 the
   trust-boundary surface does not yet expose new user-reachable
   behavior (Edge Functions still gate root-admin), so
   `docs/architecture.md` is intentionally untouched and lands with
   2.1.2. Confirm no other tracked doc is affected — record the
   intentional non-touches in the PR body so reviewer attention
   doesn't relitigate them.
10. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against the Cross-Cutting Invariants and
    each Self-Review Audit named below. Fix in place; commit
    review-fix changes separately when that clarifies history per
    [`AGENTS.md`](../../AGENTS.md) Review-Fix Rigor.
11. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation Gate command, and Self-Review Audit named
    in this plan. Confirm each is satisfied or explicitly deferred in
    this plan with rationale. Flip Status from `Proposed` to `Landed`
    in the same PR.
12. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters. Validation section lists every command
    actually run; the manual organizer write-path exercise (Validation
    Gate below) is recorded as deferred-to-human pre-merge with a
    clear repro recipe. Target Shape Evidence: name the table set the
    migration broadens against the table set the pgTAP suite asserts
    (1:1 mapping). UX Review: `N/A` (no user-visible behavior).
    Remaining Risk: organizer-redeem deferral; audit-log invariant
    preserved by RPC widening rather than direct-INSERT; Edge
    Function gates still root-admin until 2.1.2.

## Commit boundaries

Per [`AGENTS.md`](../../AGENTS.md) "Planning Depth," commit slices
named upfront:

1. **Migration + RPC widening.** The single SQL migration (steps
   3–4). Single commit, no other touch.
2. **pgTAP suite.** The two new test files (steps 5–7). Single
   commit; running tests is part of the validation gate, not a commit
   boundary.
3. **Review-fix commits.** As needed during step 10, kept distinct
   from the substantive implementation commits.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final. No apps/web
  source changes; build pass confirms the binding modules haven't
  drifted.
- `npm run build:site` — pass on baseline; pass on final. No
  apps/site source changes.
- `npm test` — pass on baseline; pass on final.
- `npm run test:functions` — pass on baseline; pass on final. No
  Edge Function changes in 2.1.1, so the run is a paranoia check that
  no shared module the four authoring functions depend on regressed.
- `npm run test:db` — pass on baseline; pass on final. The two new
  files plus every existing test file in
  [`supabase/tests/database/`](../../supabase/tests/database/).
- **Manual organizer write-path exercise — deferred to human
  reviewer pre-merge.** With the local Supabase running, assign an
  `organizer` row for a fixture user against a test event, sign that
  user in via magic link, and confirm via the local Supabase client
  that direct PostgREST writes against `game_event_drafts` succeed
  for the fixture event and fail for an unrelated event. Repeat for
  `event_role_assignments` INSERT. Recorded as the in-PR human gate
  rather than agent-driven because magic-link sign-in is not
  scriptable from the implementer's environment; pgTAP is the
  durable record but does not exercise the live PostgREST path.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md) and matched
to this sub-phase's diff surfaces. The Edge Function audits from the
parent plan's "Edge Functions & deployment config" section apply to
2.1.2's diff, not this one.

### SQL migrations & RPCs

- **Grant/body contract audit.** Every role named in a `GRANT
  EXECUTE` (none added in this sub-phase; `is_organizer_for_event` /
  `is_root_admin` keep their existing grants) and every role named in
  a new RLS policy must have a reachable success path. Walk
  organizer, agent, root-admin, unrelated-authenticated, and anon
  through each new policy; the pgTAP suite is the durable record.
- **Privilege-test vacuous-pass audit.** Per the Cross-Cutting
  Invariants. Every `has_table_privilege` call uses one privilege per
  call. Negative assertions are reasoned against the Supabase CLI
  baseline grants.
- **Legacy-data precheck for constraint tightening.** Does not
  apply: this sub-phase adds no CHECK, NOT NULL, UNIQUE, or FK
  tightening. Recorded here as a deliberate non-applicable rather
  than a forgotten audit.
- **pgTAP output-format stability audit.** New tests prefer
  `pg_policies` / `information_schema` over pgTAP's `col_*` /
  `has_*` wrappers wherever the output shape might shift across CLI
  versions; assertions about policy presence use catalog queries
  (see the existing
  [`redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql)
  pattern).
- **Replica-mode trigger suppression audit.**
  `session_replication_role = 'replica'` is set only around fixture
  seeds that bypass `auth.users` FKs and is reset to `'origin'`
  before any trigger-dependent assertion. Mirrors the
  [`redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql)
  discipline.
- **Supabase-owned-schema FK fragility.**
  `event_role_assignments.user_id → auth.users(id)` remains; the
  test fixture pattern reuses the existing replica-mode +
  synthetic-UUID approach from
  [`redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql).
  No FK reshape attempted in this sub-phase.

### CI & testing infrastructure

- **CLI / tooling pinning audit.** Does not apply: no new
  dependencies, no CLI version bump.
- **Rename-aware diff classification.** Does not apply: this
  sub-phase adds and modifies, but does not rename across surfaces.
  Any `git diff --name-status` output should show pure `A`/`M`
  entries.
- **Readiness-gate truthfulness audit.** Validation gate's manual
  organizer-write step must reflect a real run before merge; the PR
  records it as deferred-to-human and the human reviewer signs off
  rather than the agent claiming it from code reasoning.

## Documentation Currency PR Gate

Per [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- This plan — Status flips from `Proposed` to `Landed`.
- The parent [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) — at
  most a one-line "Sub-phases:" pointer added under Status so the
  split is discoverable. The parent plan's Status flip stays with
  2.1.2.

Intentionally not updated by 2.1.1 (recorded so reviewer attention
doesn't relitigate them):

- [`docs/architecture.md`](../architecture.md) — trust-boundary text
  and Backend Surface list update with 2.1.2's Edge Function
  migration.
- [`docs/operations.md`](../operations.md),
  [`docs/product.md`](../product.md),
  [`docs/dev.md`](../dev.md),
  [`docs/open-questions.md`](../open-questions.md),
  [`docs/backlog.md`](../backlog.md) — no change in either sub-phase
  per the parent plan's Doc Currency walkthrough.

## Out Of Scope

Deliberately excluded from this sub-phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **Edge Function authorization migration.** Defers to 2.1.2: the new
  shared `authenticateEventOrganizerOrAdmin` helper, the four
  authoring-function caller swaps, the binding-module forbidden-branch
  copy update, and `npm run test:functions` mock drift fixes.
- **`docs/architecture.md` update.** Defers to 2.1.2 so the
  trust-boundary text describes the end-to-end organizer write
  capability (DB + Edge Functions) in one coherent edit.
- **Organizer-redeem RPC broadening.** Out of phase 2.1 entirely. The
  `redeem_entitlement_by_code` RPC's gate stays unchanged. Resolution
  in [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §2.
- **Direct organizer INSERT on `game_event_audit_log` and
  `game_event_versions`.** Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §1: writes flow through the
  publish/unpublish RPCs, which widen in this sub-phase.
- **Combined SQL helper RPC
  `is_admin_or_organizer_for_event(eventId)`.** Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions / Settled by default": no combined helper;
  RLS inlines the OR directly and clients compose the two existing
  helpers.
- **`event_role_assignments.created_by` capture on organizer
  insert.** Defers to the post-epic
  organizer-managed-agent-assignment follow-up.
- **Per-event admin UI** (M2 phase 2.2),
  **`/auth/callback` and `/` migration** (M2 phase 2.3),
  **platform-admin migration** (M2 phase 2.4),
  **operator URL migration** (M2 phase 2.5). All consume the
  broadened gates 2.1.x ships, but ship in their own PRs.

## Risk Register

- **RLS broadening silently re-grants writes to a deprecated
  table.** A misclassification of `admin_users` as event-scoped, or
  an accidental policy on `game_event_audit_log` /
  `game_event_versions`, would silently break invariants. Mitigation:
  the migration's leading comment enumerates the table set 1:1 with
  the pgTAP coverage; reviewer attention compares the two lists
  explicitly.
- **Organizers gain direct PostgREST write access to
  `game_event_drafts`, bypassing `save-draft`'s validation.** Direct
  PostgREST is reachable as soon as 2.1.1 lands, even though no UI
  surface invokes it yet. Mitigation: walk the existing CHECK
  constraints on `game_event_drafts` during the audit pass and surface
  any application-only validation as a follow-up; do not silently
  expand application validation into this PR.
- **Comma-separated `has_table_privilege` lists pass vacuously.**
  Per the Privilege-test vacuous-pass audit. Mitigation: the
  Cross-Cutting Invariants ban the pattern; reviewer attention walks
  every assertion.
- **`auth.users` FK fixture instability across Supabase CLI
  versions.** Documented in the
  [self-review catalog's Supabase-owned-schema FK fragility entry](../self-review-catalog.md).
  Mitigation: reuse the
  [`redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql)
  fixture pattern verbatim — the same replica-mode + synthetic-UUID
  approach already proven against the current CLI pin.
- **Pre-paving exposure window.** Between 2.1.1 and 2.1.2, the
  database accepts organizer writes via direct PostgREST while no
  authored Edge Function exposes the capability. Mitigation: confirm
  no `apps/web` or `apps/site` code path constructs an organizer-JWT
  PostgREST client before 2.1.2 — grep during step 9 and surface any
  hit. Expected result: zero hits, because organizer JWTs only
  materialize when the per-event admin UI lands in 2.2 (after 2.1.2).

## Backlog Impact

- "Organizer-managed agent assignment" (per the epic's "Items
  unblocked but not landed by this epic") becomes implementable on
  top of this sub-phase's RLS broadening with no further authorization
  work. The unblock is recorded in
  [`docs/backlog.md`](../backlog.md) by M2's terminal PR (2.5), not
  by this sub-phase.

## Related Docs

- [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) — parent phase
  plan; this sub-phase compresses its database slice.
- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M2 paragraph at lines 544–669.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone doc; cross-phase decisions, sequencing, invariants.
- [`scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md) — scoping
  doc the parent plan compresses.
- [`scoping/m2-phase-2-2.md`](./scoping/m2-phase-2-2.md) — the
  consumer phase whose UI relies on 2.1.x's broadening.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) — audit
  name source.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules, Plan-to-PR
  Completion Gate, Doc Currency PR Gate.
