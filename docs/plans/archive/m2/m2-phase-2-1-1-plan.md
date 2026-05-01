# M2 Phase 2.1.1 — Database RLS Broadening

## Status

Landed.

**Parent phase:** [`m2-phase-2-1-plan.md`](/docs/plans/archive/m2/m2-phase-2-1-plan.md),
Milestone M2, Phase 2.1. Sibling sub-phase: 2.1.2 Edge Function
authorization migration + docs — Proposed (plan TBD). Sibling phases
2.2 / 2.3 / 2.4 / 2.5 — Proposed; M2 row in
[`event-platform-epic.md`](/docs/plans/event-platform-epic.md) stays `Proposed`
until 2.5 lands.

This sub-phase plan flips Status to `Landed` when its implementation
PR merges. The parent 2.1 plan flips when 2.1.2 lands (the terminal
sub-phase under the current sequencing), not by this PR.

**Scoping inputs:** the per-phase scoping doc this plan compressed
from (`docs/plans/scoping/m2-phase-2-1.md`, deleted in M2 phase
2.5.3 batch deletion — see git history for the pre-deletion
content);
[`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md)
"Cross-Phase Decisions" for the resolution and rejected alternatives
behind every cross-phase decision this plan depends on. The parent
2.1 plan is the authoritative source for cross-cutting invariants and
contracts; this sub-phase compresses the database slice and leaves
the Edge Function slice to 2.1.2 verbatim.

## Goal

Ship the database-layer broadening for M2 phase 2.1 in a single PR:

1. Replace the root-only SELECT policy on `public.game_event_drafts`
   with a two-branch policy that admits an authenticated caller who
   is an organizer for that draft's event (or root-admin).
2. Replace the root-only SELECT policy on `public.game_event_versions`
   with the same broadening shape so the
   `public.game_event_admin_status` security_invoker view works for
   organizer callers.
3. Replace the self-or-root SELECT policy on
   `public.event_role_assignments` with a three-branch policy that
   adds an organizer-for-event branch alongside the existing
   self-read and root-admin branches.
4. Add INSERT and DELETE policies on `public.event_role_assignments`
   gated by the broadening predicate, plus the matching `GRANT
   INSERT, DELETE` to `authenticated`. UPDATE stays revoked at the
   privilege layer.
5. Cover the broadening with two new pgTAP test files.

**Scope is narrow.** Earlier drafts of this plan broadened
INSERT/UPDATE/DELETE on most event-scoped tables (`game_events`,
`game_questions`, `game_question_options`, `game_event_drafts`,
`game_completions`, `game_entitlements`, `game_starts`). That scope
was wrong on two counts:

- **Authoring writes flow through Edge Functions.** `save-draft`,
  `publish-draft`, `unpublish-event`, and `generate-event-code`
  execute as `service_role`, which bypasses RLS entirely. The 2.1.2
  Edge Function helper migration is the load-bearing authorization
  point for organizer authoring writes; RLS write broadening on
  those tables had no consumer.
- **PostgreSQL applies SELECT during UPDATE/DELETE.** Rows must be
  SELECT-visible to be modifiable. Most authoring tables today have
  SELECT policies that exclude organizers — `is_admin()` only on
  drafts/versions; `published_at IS NOT NULL` on game_events /
  questions / options; no policy at all on completions / starts.
  UPDATE and DELETE broadening on those tables would silently no-op
  for organizers under direct PostgREST.

The corrected scope addresses what 2.2's per-event admin UI actually
needs (organizer reads of draft/version content via PostgREST and the
admin-status view) plus the post-epic agent-assignment surface
(organizer-driven role assignment via PostgREST against
`event_role_assignments`). The full deliberation is recorded in
[`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md)
"Cross-Phase Decisions" §1.

The Edge Function authorization migration (the new shared helper, the
four caller swaps, and the `docs/architecture.md` updates) is
deliberately out of scope and lands in 2.1.2.

## Cross-Cutting Invariants

These rules thread every diff line in this sub-phase. Self-review
walks each one against every changed file. The Edge Function
centralization invariant from the parent plan is deferred to 2.1.2
with the helper itself.

- **Broadening predicate is uniform.** Every policy added or replaced
  uses `public.is_organizer_for_event(<event-id-column>) OR
  public.is_root_admin()` (the `event_role_assignments` SELECT policy
  also keeps its self-read branch). Same helper signature
  (`event_id text`), same OR-shape, same case ordering.
- **Authoring writes stay through Edge Functions.** The four authoring
  Edge Functions are the only path organizer authoring writes take;
  no direct-PostgREST INSERT/UPDATE/DELETE policies are added for
  authoring tables. Organizer-driven `event_role_assignments`
  writes are the sole new direct-PostgREST write surface and are
  intentional (the post-epic agent-assignment feature consumes them).
- **Audit-log and versions invariant preserved.**
  `game_event_audit_log` and `game_event_versions` keep direct
  INSERT denied to non-service-role callers. Organizer publish and
  unpublish writes those rows transitively through
  `publish_game_event_draft()` / `unpublish_game_event()` exactly as
  root-admin writes do today — the broadened Edge Function gate
  (2.1.2) authorizes the caller, then invokes the RPC under
  service_role. The RPC bodies are not modified.
- **pgTAP per-privilege split.** `has_table_privilege(role, table,
  '<priv>')` is called once per privilege; comma-separated lists
  (`'SELECT,INSERT,DELETE'`) are banned because PostgreSQL's any-of
  semantics make them vacuous. Negative assertions are re-verified
  under the Supabase CLI baseline grants per the
  [self-review catalog's Privilege-test vacuous-pass audit](/docs/self-review-catalog.md).

## Naming

- The new SQL migration is `20260427010000_broaden_event_scoped_rls.sql`.
  The next free slot after the latest migration
  ([`20260423020000_add_game_event_admin_status_view.sql`](/supabase/migrations/20260423020000_add_game_event_admin_status_view.sql))
  under the repo's `YYYYMMDDHHMMSS_snake_case_description.sql`
  convention.
- New pgTAP files name the surface, not the phase, per
  [`AGENTS.md`](/AGENTS.md) anti-patterns:
  `authoring_reads_rls.test.sql` for the draft/version read
  broadening, and `event_role_assignments_rls.test.sql` for the
  staffing-table broadening.

The Edge Function helper file name (`event-organizer-auth.ts`) and
helper symbol name (`authenticateEventOrganizerOrAdmin`) are reserved
for 2.1.2 and not introduced here.

## Tables in scope

The migration broadens RLS on three tables. Each row names the policy
shape the migration ships.

| Table | Change | Notes |
| --- | --- | --- |
| `game_event_drafts` | SELECT policy replaced (root-only → organizer-or-root) | INSERT/UPDATE/DELETE policies stay root-only — authoring writes flow through `save-draft` under service_role |
| `game_event_versions` | SELECT policy replaced (root-only → organizer-or-root) | Required for the `game_event_admin_status` security_invoker view to compute correct status for organizers |
| `event_role_assignments` | SELECT policy replaced (self-or-root → self-or-organizer-or-root); INSERT and DELETE policies added | UPDATE stays revoked at the privilege layer; `GRANT INSERT, DELETE` to `authenticated` lands alongside the policies |

Deliberate non-touches (recorded so reviewer attention does not
relitigate them):

- `game_events`, `game_questions`, `game_question_options` — SELECT
  stays gated on `published_at IS NOT NULL` (anon + authenticated).
  Organizers read their unpublished events from
  `game_event_drafts.content` (JSONB); published events are already
  readable. No write policies added — authoring writes flow through
  `save-draft` / `publish-draft` / `unpublish-event` /
  `generate-event-code` under `service_role`.
- `game_completions`, `game_starts`, `game_entitlements` — SELECT and
  write policies stay as today. The existing "assigned operators can
  read event entitlements" policy (migration 20260421000500) already
  admits agents/organizers/root for `game_entitlements`. Completion
  and entitlement creation runs in
  `complete_game_and_award_entitlement` under service_role; redemption
  runs in `redeem_entitlement_by_code` under SECURITY DEFINER.
- `game_event_audit_log` — direct INSERT stays service-role-only.
  Audit rows continue to flow exclusively through
  `publish_game_event_draft()` / `unpublish_game_event()`.
- `publish_game_event_draft` / `unpublish_game_event` RPC bodies stay
  unchanged. Neither has an internal user-claims gate today and could
  not have a meaningful one added — the Edge Functions invoke the
  RPCs under the service-role key, so an in-RPC claims check would
  not see the caller.
- `admin_users` — platform-level, unchanged.
- `event_role_assignments` UPDATE — stays revoked at the privilege
  layer for both authenticated and service_role per the original A.1
  migration's "role changes are insert + delete, never in-place
  mutation" intent.

## Contracts

**Broadening predicate.** Every direct-table policy added or replaced
uses `is_organizer_for_event(<event-id-column>) OR is_root_admin()`
in its `using` and (where applicable) `with check` clauses. For
`game_event_drafts` whose `event_id` lives as the `id` column, the
predicate substitutes `id` for `event_id` directly — no subquery
against `game_events`. The `event_role_assignments` SELECT policy
also retains a `user_id = current_request_user_id()` self-read
branch.

**`game_event_drafts` SELECT.** The existing root-only "admins can
read drafts" policy is dropped; a new "organizers and admins can
read drafts" policy is created. INSERT, UPDATE, and DELETE policies
on this table remain root-only via the existing "admins can …"
policies — those policies are exercised by
[`game_authoring_phase2_auth.test.sql`](/supabase/tests/database/game_authoring_phase2_auth.test.sql)
and are not modified or re-asserted in this sub-phase.

**`game_event_versions` SELECT.** The existing root-only "admins can
read versions" policy is dropped; a new "organizers and admins can
read versions" policy is created. INSERT/UPDATE/DELETE on this table
were already service-role-only and remain so.

**`event_role_assignments` SELECT.** The existing self-or-root-only
"users can read their own role assignments" policy is dropped; a new
three-branch "users, organizers, and admins can read role
assignments" policy is created.

**`event_role_assignments` INSERT and DELETE.** Two new policies plus
a `GRANT INSERT, DELETE on table public.event_role_assignments to
authenticated`. UPDATE is deliberately omitted from the GRANT.

**`publish_game_event_draft` / `unpublish_game_event` RPCs are
unchanged.** No body, `SECURITY DEFINER`, `search_path`, or grant-list
edits. Audit and version rows the RPCs write continue to flow
exclusively through those functions, protected by `GRANT EXECUTE →
service_role` plus direct-INSERT denied via RLS, not by any in-body
check. The broadened Edge Function gate in 2.1.2 is the load-bearing
authorization point.

**`game_event_admin_status` view is unchanged.** The view's
`security_invoker = true` setting means it inherits the underlying
tables' RLS at read time. After the SELECT broadening on
`game_event_drafts` and `game_event_versions`, organizers reading the
view through PostgREST see status rows for events they organize — no
view-definition change needed.

**Existing SECURITY DEFINER helpers are unchanged.**
`is_organizer_for_event(text)`, `is_agent_for_event(text)`, and
`is_root_admin()` ship in
[`supabase/migrations/20260421000200_add_event_role_helpers.sql`](/supabase/migrations/20260421000200_add_event_role_helpers.sql);
this sub-phase consumes them and adds no new helper variant.

## Files to touch — new

- `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql` —
  single migration. Replaces the SELECT policies on
  `game_event_drafts`, `game_event_versions`, and
  `event_role_assignments`; adds INSERT and DELETE policies on
  `event_role_assignments` plus the matching grant; commits a
  leading comment that enumerates the table set, the deliberate
  non-touches, and the "earlier drafts had broader scope" historical
  note.
- `supabase/tests/database/authoring_reads_rls.test.sql` — covers
  the `game_event_drafts` and `game_event_versions` SELECT broadening
  plus the transitive read of `game_event_admin_status` via
  `security_invoker`. Reuses the role-switching pattern from
  [`supabase/tests/database/redemption_rls.test.sql`](/supabase/tests/database/redemption_rls.test.sql)
  (`set local role authenticated` plus
  `set_config('request.jwt.claims', ...)` per case). Role matrix:
  organizer-A own event, organizer-B own event, agent (denied;
  authoring is not an agent surface), unrelated authenticated
  (denied), root admin (sees all).
- `supabase/tests/database/event_role_assignments_rls.test.sql` —
  focused suite for the staffing-table broadening. Same fixture
  shape. Covers the three-branch SELECT policy (self, organizer,
  root); the new INSERT / DELETE policies (positive within own event,
  RLS-denied across events); the UPDATE privilege-layer denial for
  both `authenticated` and `service_role`.

## Files to touch — modify

- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.

The parent [`m2-phase-2-1-plan.md`](/docs/plans/archive/m2/m2-phase-2-1-plan.md) Status
line stays `Proposed` (or `In progress` if a sibling sub-phase is
mid-flight) until 2.1.2 lands. The implementing PR for 2.1.1 may
update the parent plan's "Sub-phases" entry under Status if needed
to reflect the corrected scope; that's the only allowed parent-plan
touch in this PR.

## Files intentionally not touched

- `supabase/functions/_shared/event-organizer-auth.ts` — the new
  shared helper introduces with 2.1.2 alongside its four callers, so
  the helper and its consumers ship as one reviewable diff.
- [`supabase/functions/save-draft/index.ts`](/supabase/functions/save-draft/index.ts),
  [`supabase/functions/publish-draft/index.ts`](/supabase/functions/publish-draft/index.ts),
  [`supabase/functions/unpublish-event/index.ts`](/supabase/functions/unpublish-event/index.ts),
  [`supabase/functions/generate-event-code/index.ts`](/supabase/functions/generate-event-code/index.ts)
  — caller migration is 2.1.2.
- [`supabase/functions/_shared/admin-auth.ts`](/supabase/functions/_shared/admin-auth.ts)
  — `authenticateQuizAdmin` is preserved as-is and remains the gate
  for all four authoring functions until 2.1.2.
- [`docs/architecture.md`](/docs/architecture.md) — doc update lands in
  2.1.2 so the trust-boundary text and Backend Surface list reflect
  the end-to-end organizer write capability (Edge Function gate +
  database read broadening) in one coherent edit.
- [`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)
  — the redeem RPC's gate stays
  `is_agent_for_event OR is_root_admin` per the resolved decision to
  defer organizer-redeem broadening
  ([`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md)
  "Cross-Phase Decisions" §2). Out of phase 2.1 entirely.
- `apps/web/*`, `apps/site/*`, `shared/*`, `vercel.json`,
  `supabase/config.toml` — no changes.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and the 2.1.1
   implementation feature branch (not `main`, not the doc-only
   branch that landed this plan). Confirm Node and Deno versions
   match [`mise.toml`](/mise.toml) (`mise exec` if the shell
   isn't activated). Read the latest sibling-phase scoping docs to
   confirm none have moved.
2. **Baseline validation.** Run `npm run lint`, `npm run build:web`,
   `npm run build:site`, `npm test`, `npm run test:functions`, and
   `npm run test:db` (the repo's pgTAP runner). All must pass before
   any edit.
3. **Write the migration.** Create
   `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql`.
   Migration body order: (a) leading comment enumerating the table
   set, the deliberate non-touches, and the historical note that
   earlier drafts had broader scope, (b) `game_event_drafts` SELECT
   replacement, (c) `game_event_versions` SELECT replacement,
   (d) `event_role_assignments` GRANT + SELECT replacement + INSERT
   policy + DELETE policy. Each policy carries an inline comment
   naming the broadening predicate.
4. **Apply locally.** `npm run test:db` (or `npx supabase db reset`
   followed by the pgTAP runner). The new migration must apply
   cleanly against the full local migration history.
5. **Write `authoring_reads_rls.test.sql`.** Reuse the fixture
   pattern from
   [`redemption_rls.test.sql`](/supabase/tests/database/redemption_rls.test.sql):
   `set local session_replication_role = 'replica'` for the duration
   of `auth.users`-FK-bypassing seeds, reset to `'origin'` before
   any trigger-dependent assertion (none in this file — all
   assertions are SELECTs), and use `set local role authenticated`
   plus `set_config('request.jwt.claims', ...)` per role under test.
6. **Write `event_role_assignments_rls.test.sql`.** Same fixture
   pattern. Covers the three-branch SELECT, the new INSERT/DELETE
   policies, and the UPDATE privilege-layer denial.
7. **Run the new tests in isolation, then full pgTAP.** First the
   two new test files alone via the repo's targeted-pgTAP path
   (`npm run test:db -- --include authoring_reads_rls.test.sql event_role_assignments_rls.test.sql`
   or the equivalent `supabase test db --linked --include …`), then
   the full `npm run test:db` sweep. Both must pass. The
   Privilege-test vacuous-pass audit is satisfied at this step:
   walk each negative assertion against "would this pass under
   bare-PostgreSQL with no baseline grants?" and split any
   comma-separated privilege list.
8. **Repeat full validation.** All baseline commands from step 2.
9. **Documentation currency check.** Walk the Doc Currency PR Gate
   triggers in [`AGENTS.md`](/AGENTS.md). For 2.1.1 the
   trust-boundary surface does not yet expose new user-reachable
   write behavior (Edge Functions still gate root-admin), so
   `docs/architecture.md` is intentionally untouched and lands with
   2.1.2. The read-broadening on drafts/versions is itself
   user-reachable but has no UI consumer until 2.2 ships, so the
   architecture-doc edit lands with 2.2 (not 2.1.x). Confirm no
   other tracked doc is affected.
10. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against the Cross-Cutting Invariants and
    each Self-Review Audit named below. Fix in place; commit
    review-fix changes separately when that clarifies history per
    [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.
11. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation Gate command, and Self-Review Audit named
    in this plan. Confirm each is satisfied or explicitly deferred
    in this plan with rationale. Flip Status from `Proposed` to
    `Landed` in the same PR.
12. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](/.github/pull_request_template.md).
    Title under 70 characters. Validation section lists every
    command actually run. Target Shape Evidence: name the three
    tables the migration touches against the two test files'
    coverage (1:1 mapping). UX Review: `N/A` (no user-visible
    behavior). Remaining Risk: organizer-redeem deferral; audit-log
    invariant preserved by `GRANT EXECUTE → service_role` plus
    direct-INSERT denied via RLS; Edge Function gates still
    root-admin until 2.1.2 (organizer reads are reachable but no
    UI consumer exists yet).

## Commit boundaries

Per [`AGENTS.md`](/AGENTS.md) "Planning Depth," commit slices
named upfront:

1. **Migration.** The single SQL migration (steps 3–4). Single
   commit, no other touch.
2. **pgTAP suite.** The two new test files (steps 5–7). Single
   commit; running tests is part of the validation gate, not a
   commit boundary.
3. **Review-fix commits.** As needed during step 10, kept distinct
   from the substantive implementation commits.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final. No apps/web
  source changes.
- `npm run build:site` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final.
- `npm run test:functions` — pass on baseline; pass on final. No
  Edge Function changes in 2.1.1, so the run is a paranoia check
  that no shared module the four authoring functions depend on
  regressed.
- `npm run test:db` — pass on baseline; pass on final. The two new
  files plus every existing test file in
  [`supabase/tests/database/`](/supabase/tests/database).
- **Manual organizer read-path exercise — deferred to human
  reviewer pre-merge.** With the local Supabase running, assign an
  `organizer` row for a fixture user against a test event, sign
  that user in via magic link, and confirm via the local Supabase
  client that direct PostgREST reads against `game_event_drafts`
  and `game_event_admin_status` succeed for the fixture event and
  return zero rows for an unrelated event. Repeat for an INSERT
  into `event_role_assignments` (own event vs. unrelated event).
  Recorded as the in-PR human gate rather than agent-driven because
  magic-link sign-in is not scriptable from the implementer's
  environment; pgTAP is the durable record but does not exercise
  the live PostgREST path.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) and
matched to this sub-phase's diff surfaces. The Edge Function audits
from the parent plan's "Edge Functions & deployment config" section
apply to 2.1.2's diff, not this one.

### SQL migrations & RPCs

- **Grant/body contract audit.** Every role named in a `GRANT
  EXECUTE` (none added in this sub-phase; `is_organizer_for_event` /
  `is_root_admin` keep their existing grants) and every role named
  in a new RLS policy must have a reachable success path. Walk
  organizer, agent, root-admin, unrelated-authenticated, and anon
  through each new policy; the pgTAP suite is the durable record.
- **Privilege-test vacuous-pass audit.** Per the Cross-Cutting
  Invariants. Every `has_table_privilege` call uses one privilege
  per call. Negative assertions are reasoned against the Supabase
  CLI baseline grants — specifically, the new tests assert that
  `service_role` does not have UPDATE on `event_role_assignments`,
  which under the Supabase baseline grant `grant all on all tables
  in schema public to service_role` requires a deliberate REVOKE in
  the underlying migration (already in place from
  20260421000100).
- **Legacy-data precheck for constraint tightening.** Does not
  apply: this sub-phase adds no CHECK, NOT NULL, UNIQUE, or FK
  tightening. Recorded here as a deliberate non-applicable rather
  than a forgotten audit.
- **pgTAP output-format stability audit.** New tests prefer
  `pg_policies` for structural assertions and rely on row-count
  semantics (`is(count, n)`) for behavioral assertions, avoiding
  pgTAP's `col_*` / `has_*` wrappers wherever output shape might
  shift across CLI versions.
- **Replica-mode trigger suppression audit.**
  `session_replication_role = 'replica'` is set only around fixture
  seeds that bypass `auth.users` FKs. All assertions in both new
  test files are SELECTs / INSERTs (which fire RLS but no
  triggers) / DELETEs (same), so no `'origin'` reset is required —
  but the audit walked it.
- **Supabase-owned-schema FK fragility.**
  `event_role_assignments.user_id → auth.users(id)` remains; the
  test fixture pattern reuses the existing replica-mode +
  synthetic-UUID approach from
  [`redemption_rls.test.sql`](/supabase/tests/database/redemption_rls.test.sql).
  No FK reshape attempted in this sub-phase.

### CI & testing infrastructure

- **CLI / tooling pinning audit.** Does not apply: no new
  dependencies, no CLI version bump.
- **Rename-aware diff classification.** Does not apply: this
  sub-phase adds and modifies, but does not rename across surfaces.
  Any `git diff --name-status` output should show pure `A`/`M`
  entries for the migration and test files.
- **Readiness-gate truthfulness audit.** Validation gate's manual
  organizer-read step must reflect a real run before merge; the PR
  records it as deferred-to-human and the human reviewer signs off
  rather than the agent claiming it from code reasoning.

## Documentation Currency PR Gate

Per [`AGENTS.md`](/AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- This plan — Status flips from `Proposed` to `Landed`.

Intentionally not updated by 2.1.1 (recorded so reviewer attention
doesn't relitigate them):

- [`docs/architecture.md`](/docs/architecture.md) — trust-boundary text
  and Backend Surface list update with 2.2's per-event admin UI
  (which makes the read-broadening user-reachable) and 2.1.2's Edge
  Function migration (which makes organizer write capability
  user-reachable). 2.1.1 ships an unconsumed read-broadening — the
  capability exists at the database layer but no consumer surface
  reaches it yet.
- [`docs/operations.md`](/docs/operations.md),
  [`docs/product.md`](/docs/product.md),
  [`docs/dev.md`](/docs/dev.md),
  [`docs/open-questions.md`](/docs/open-questions.md),
  [`docs/backlog.md`](/docs/backlog.md) — no change in 2.1.1 per the
  parent plan's Doc Currency walkthrough.

## Out Of Scope

Deliberately excluded from this sub-phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **Direct-PostgREST INSERT/UPDATE/DELETE policies on authoring
  tables (`game_events`, `game_questions`, `game_question_options`,
  `game_event_drafts`, `game_completions`, `game_starts`,
  `game_entitlements`).** Earlier drafts of this plan included these
  and were corrected: those writes flow through Edge Functions under
  service_role; direct-PostgREST broadening had no consumer and
  UPDATE/DELETE would have silently no-oped due to SELECT-visibility
  coupling. The Edge Function gate widening in 2.1.2 is the
  load-bearing change for organizer write capability.
- **Edge Function authorization migration.** Defers to 2.1.2: the
  new shared `authenticateEventOrganizerOrAdmin` helper, the four
  authoring-function caller swaps, the binding-module forbidden-
  branch copy update, and `npm run test:functions` mock drift fixes.
- **`docs/architecture.md` update.** Defers to 2.1.2 / 2.2 so the
  trust-boundary text describes the end-to-end organizer
  capability (DB read broadening + Edge Function gate widening + UI
  consumer) in one coherent edit.
- **Organizer-redeem RPC broadening.** Out of phase 2.1 entirely.
  The `redeem_entitlement_by_code` RPC's gate stays unchanged.
  Resolution in
  [`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md)
  "Cross-Phase Decisions" §2.
- **Direct organizer INSERT on `game_event_audit_log` and
  `game_event_versions`.** Resolution in
  [`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md)
  "Cross-Phase Decisions" §1: writes flow through the
  publish/unpublish RPCs, which are reachable only via
  `GRANT EXECUTE → service_role` from the broadened Edge Functions.
- **Combined SQL helper RPC
  `is_admin_or_organizer_for_event(eventId)`.** Resolution in
  [`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md)
  "Cross-Phase Decisions / Settled by default": no combined helper.
- **`event_role_assignments.created_by` capture on organizer
  insert.** Defers to the post-epic
  organizer-managed-agent-assignment follow-up.
- **Per-event admin UI** (M2 phase 2.2),
  **`/auth/callback` and `/` migration** (M2 phase 2.3),
  **platform-admin migration** (M2 phase 2.4),
  **operator URL migration** (M2 phase 2.5). All consume the
  broadened gates 2.1.x ships, but ship in their own PRs.

## Risk Register

- **Read broadening surfaces no consumer in M2 phase 2.1.x.** The
  new SELECT policies admit organizer reads of drafts/versions, but
  no apps/web or apps/site code constructs an organizer-JWT
  PostgREST client until 2.2 lands. Mitigation: confirm during
  step 9 that no current consumer would be affected by the
  broadening (the existing `useAuthSession`-driven admin UI gates
  on `is_admin()` and would not change behavior for non-admin
  authenticated users).
- **`event_role_assignments` direct-PostgREST INSERT under organizer
  JWT bypasses any application validation.** As soon as 2.1.1 lands,
  organizers can insert assignments directly via PostgREST without
  passing through any Edge Function. There is no application
  validation today (assignments are role + uuid; no business rules
  beyond the FK and the unique constraint). Mitigation: the unique
  constraint `(user_id, event_id, role)` and the
  `auth.users` FK are the load-bearing data-integrity guards; the
  RLS policy enforces event-scope. Surface any future business-rule
  drift as a follow-up rather than expanding 2.1.1's scope.
- **Comma-separated `has_table_privilege` lists pass vacuously.**
  Per the Privilege-test vacuous-pass audit. Mitigation: the
  Cross-Cutting Invariants ban the pattern; reviewer attention
  walks every assertion.
- **`auth.users` FK fixture instability across Supabase CLI
  versions.** Documented in the
  [self-review catalog's Supabase-owned-schema FK fragility entry](/docs/self-review-catalog.md).
  Mitigation: reuse the
  [`redemption_rls.test.sql`](/supabase/tests/database/redemption_rls.test.sql)
  fixture pattern verbatim — the same replica-mode + synthetic-UUID
  approach already proven against the current CLI pin.
- **`game_event_admin_status` view returns wrong status if the
  versions read silently fails.** The view's `published_version.content
  is null` branch maps to `'draft_only'`, which would misclassify a
  published event as unpublished if the organizer can't read versions.
  Mitigation: the new versions SELECT policy explicitly admits
  organizers; `authoring_reads_rls.test.sql` asserts the
  `'live'` status reads back correctly for organizer-B on event B.

## Backlog Impact

- "Organizer-managed agent assignment" (per the epic's "Items
  unblocked but not landed by this epic") becomes implementable on
  top of this sub-phase's `event_role_assignments` broadening with
  no further authorization work. The unblock is recorded in
  [`docs/backlog.md`](/docs/backlog.md) by M2's terminal PR (2.5), not
  by this sub-phase.

## Related Docs

- [`m2-phase-2-1-plan.md`](/docs/plans/archive/m2/m2-phase-2-1-plan.md) — parent phase
  plan; this sub-phase compresses its database slice.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) — parent
  epic; M2 paragraph at lines 544–669.
- [`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md) — M2
  milestone doc; cross-phase decisions, sequencing, invariants.
- `docs/plans/scoping/m2-phase-2-1.md` — scoping doc the parent
  plan compressed from (deleted in M2 phase 2.5.3 batch deletion;
  see git history for the pre-deletion content).
- `docs/plans/scoping/m2-phase-2-2.md` — scoping doc for the
  consumer phase whose UI relied on 2.1.x's broadening (deleted
  in M2 phase 2.5.3 batch deletion; see git history for the
  pre-deletion content). The consumer phase plan is
  [`m2-phase-2-2-plan.md`](/docs/plans/archive/m2/m2-phase-2-2-plan.md).
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](/AGENTS.md) — workflow rules, Plan-to-PR
  Completion Gate, Doc Currency PR Gate.
