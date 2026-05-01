# M2 Phase 2.1 — RLS Broadening With pgTAP Coverage

## Status

Landed.

**Parent epic:** [`event-platform-epic.md`](../../event-platform-epic.md),
Milestone M2, Phase 2.1. Sibling phases: 2.2 per-event admin shell —
Proposed; 2.3 `/auth/callback` and `/` migration — Proposed; 2.4
platform admin migration — Proposed; 2.5 `/game/*` URL migration —
Proposed. The epic's M2 row stays `Proposed` until 2.5 also lands.

**Sub-phases:** this plan shipped across two sub-phase PRs. 2.1.1
([`m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md)) — Landed —
shipped RLS read-broadening on the authoring surface (`game_event_drafts`
and `game_event_versions` SELECT replaced) plus the
`event_role_assignments` staffing-table RLS (3-branch SELECT plus
INSERT/DELETE), with two new pgTAP test files. The publish/unpublish
RPC bodies are unchanged; direct-PostgREST INSERT/UPDATE/DELETE on
authoring tables is intentionally not broadened (those writes flow
through Edge Functions under service_role). 2.1.2
([`m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md)) — Landed —
shipped the new `authenticateEventOrganizerOrAdmin` shared helper, the
four authoring-function caller swaps, the
[`docs/architecture.md`](../../../architecture.md) updates, and this parent
Status flip. The Files-to-touch, Execution steps, Commit boundaries,
and Validation Gate sections below describe the union of both
sub-phases; each sub-phase plan owns its own per-PR slicing record.

The epic's M2 row flip is owned by the last-merging M2 phase (2.5
under the current sequencing), not by this PR.

**Scoping inputs:** the per-phase scoping doc this plan compressed
from (`docs/plans/scoping/m2-phase-2-1.md`, deleted in M2 phase
2.5.3 batch deletion — see git history for the pre-deletion
content); [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
"Cross-Phase Decisions" for the resolution and rejected
alternatives behind every cross-phase decision this plan depends
on.

## Goal

Broaden authorization so an authenticated user with an `organizer`
row in `event_role_assignments` for a given event can:

- read draft and version content for events they organize via
  PostgREST (currently root-admin-only)
- read assignments for events they organize via PostgREST (currently
  self-or-root-only)
- insert and delete assignments for events they organize via
  PostgREST (currently service-role-only)
- save, publish, unpublish, and regenerate event codes for events
  they organize via the four authoring Edge Functions (currently
  root-admin-only)

The phase is the deliberate resolution of the "Post-MVP authoring
ownership" open question and the precondition for phase 2.2's
per-event admin route shell.

**Scope clarification.** Earlier drafts of this plan said RLS would
broaden every event-scoped table's INSERT/UPDATE/DELETE policies so
organizers could perform "every write root-admin can perform"
directly via PostgREST. That framing was wrong on two counts: (1)
authoring writes flow through Edge Functions executing as
`service_role`, which bypasses RLS entirely, so RLS write broadening
on those tables had no consumer; (2) PostgreSQL applies SELECT
during UPDATE/DELETE, and the affected tables' existing SELECT
policies exclude organizers, so UPDATE/DELETE broadening would
silently no-op. The corrected scope is **read-broadening on the
authoring surface plus the staffing table's RLS** — the load-bearing
changes 2.2 and the post-epic agent-assignment feature actually
consume. Full deliberation in
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
"Cross-Phase Decisions" §1.

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file.

- **Broadening predicate is uniform.** Every policy added or replaced
  uses the predicate
  `is_organizer_for_event(<event-id-column>) OR is_root_admin()`
  (the `event_role_assignments` SELECT policy keeps its existing
  self-read branch alongside). Same helper signature
  (`event_id text`), same OR-shape, same case ordering. No table,
  helper, or RPC writes its own variant.
- **Agent posture is unchanged.** Agents do not gain direct
  table writes. They also do not gain authoring-table reads
  (drafts/versions) — agent-reachable reads stay scoped to
  `game_entitlements` per the existing redemption RLS. The only
  agent-reachable write path stays the existing
  `redeem_entitlement_by_code` SECURITY DEFINER RPC at
  [`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`](../../../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql);
  its gate is not touched in this phase.
- **Authoring writes stay through Edge Functions.** No
  direct-PostgREST INSERT/UPDATE/DELETE policies are added to
  `game_events`, `game_questions`, `game_question_options`,
  `game_event_drafts`, `game_completions`, `game_starts`, or
  `game_entitlements`. Organizer authoring writes flow through the
  four authoring Edge Functions under `service_role` (which
  bypasses RLS); the broadened Edge Function gate in 2.1.2 is the
  load-bearing authorization point. Organizer-driven
  `event_role_assignments` writes are the sole new direct-PostgREST
  write surface and are intentional for the post-epic
  agent-assignment feature.
- **Audit-log and versions invariant preserved.**
  `game_event_audit_log` and `game_event_versions` keep direct
  INSERT denied to non-service-role callers. Organizer publish and
  unpublish writes those rows transitively through
  `publish_game_event_draft()` / `unpublish_game_event()` exactly
  as root-admin writes do today: the broadened Edge Function gate
  authorizes the caller, then invokes the RPC under service_role.
  The existing `GRANT EXECUTE → service_role` constraint is the
  load-bearing guard that keeps direct PostgREST callers off the
  RPC; no internal RPC authorization predicate is added or
  modified, because the RPCs do not (and have never) inspected
  user claims — they trust their service_role caller. Direct-INSERT
  policies for these two tables are deliberately not added.
- **pgTAP per-privilege split.** `has_table_privilege(role, table,
  '<priv>')` is called once per privilege; comma-separated lists
  (`'SELECT,INSERT,DELETE'`) are banned because PostgreSQL's
  any-of semantics make them vacuous. Negative assertions are
  re-verified under the Supabase CLI baseline grants per the
  [self-review catalog's Privilege-test vacuous-pass audit](../../../self-review-catalog.md).
- **Edge Function authorization is centralized.** All four
  authoring functions (`save-draft`, `publish-draft`,
  `unpublish-event`, `generate-event-code`) call the new shared
  helper `authenticateEventOrganizerOrAdmin(...)`; no per-function
  inline `is_admin() OR is_organizer_for_event(eventId)` composition.

## Naming

- The new SQL migration is `20260427010000_broaden_event_scoped_rls.sql`.
  The next free slot after the latest migration
  ([`20260423020000_add_game_event_admin_status_view.sql`](../../../../supabase/migrations/20260423020000_add_game_event_admin_status_view.sql))
  under the repo's `YYYYMMDDHHMMSS_snake_case_description.sql`
  convention.
- The new Edge Function helper is
  `authenticateEventOrganizerOrAdmin` and lives at
  `supabase/functions/_shared/event-organizer-auth.ts`. Mirrors the
  existing `authenticateQuizAdmin` shape from
  [`supabase/functions/_shared/admin-auth.ts`](../../../../supabase/functions/_shared/admin-auth.ts);
  `AdminAuthResult` type is reused.
- New pgTAP files name the surface, not the phase, per
  [`AGENTS.md`](../../../../AGENTS.md) anti-patterns: `authoring_reads_rls.test.sql`
  for the draft/version SELECT broadening, and
  `event_role_assignments_rls.test.sql` for the staffing-table
  SELECT/INSERT/DELETE broadening.

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
  the four authoring Edge Functions under `service_role`.
- `game_completions`, `game_starts`, `game_entitlements` — SELECT
  and write policies stay as today. The existing "assigned
  operators can read event entitlements" policy (migration
  20260421000500) already admits agents/organizers/root for
  `game_entitlements`. Completion and entitlement creation runs in
  `complete_game_and_award_entitlement` under service_role;
  redemption runs in `redeem_entitlement_by_code` under SECURITY
  DEFINER.
- `game_event_audit_log` — service-role-only INSERT; rows continue
  to flow exclusively through `publish_game_event_draft()` /
  `unpublish_game_event()`.
- `publish_game_event_draft` / `unpublish_game_event` RPC bodies —
  unchanged; see Contracts.
- `admin_users` — platform-level, unchanged.

## Contracts

**Broadening predicate.** Every policy added or replaced uses
`is_organizer_for_event(<event-id-column>) OR is_root_admin()` in
its `using` and (where applicable) `with check` clauses. The
`event_role_assignments` SELECT policy retains a
`user_id = current_request_user_id()` self-read branch alongside.
For `game_event_drafts` whose `event_id` lives as the `id` column,
the predicate substitutes `id` for `event_id` directly — no
subquery against `game_events`.

**`game_event_drafts` SELECT.** The existing root-only "admins can
read drafts" policy is dropped; a new "organizers and admins can
read drafts" policy is created. INSERT, UPDATE, and DELETE policies
on this table remain root-only via the existing "admins can …"
policies — those policies are exercised by
[`game_authoring_phase2_auth.test.sql`](../../../../supabase/tests/database/game_authoring_phase2_auth.test.sql)
and are not modified.

**`game_event_versions` SELECT.** The existing root-only "admins can
read versions" policy is dropped; a new "organizers and admins can
read versions" policy is created. Required for the
`game_event_admin_status` security_invoker view to compute the
correct status (`'live'` vs. `'live_with_draft_changes'` vs.
`'draft_only'`) for organizer callers — without it, the view's
versions join silently returns no rows under organizer JWT and the
status falls back to `'draft_only'`. INSERT/UPDATE/DELETE on this
table were already service-role-only and remain so.

**`event_role_assignments` SELECT.** The existing self-or-root-admin
SELECT policy at
[`supabase/migrations/20260421000500_add_redemption_rls_policies.sql`](../../../../supabase/migrations/20260421000500_add_redemption_rls_policies.sql)
is dropped; a new three-branch policy admits self-read,
organizer-for-event, and root-admin. Effect: an organizer can list
the agents and organizers assigned to events they organize.

**`event_role_assignments` INSERT and DELETE.** Two new policies
plus a `GRANT INSERT, DELETE on table public.event_role_assignments
to authenticated`. UPDATE stays revoked at the privilege layer for
both `authenticated` and `service_role` per the original A.1
migration's "role changes are insert + delete, never in-place
mutation" intent.

**`publish_game_event_draft` / `unpublish_game_event` RPCs are
unchanged.** No body, `SECURITY DEFINER`, `search_path`, or
grant-list edits. Audit and version rows the RPCs write continue
to flow exclusively through those functions, protected by
`GRANT EXECUTE → service_role` plus direct-INSERT denied via RLS,
not by any in-body check. The broadened Edge Function gate in
2.1.2 is the load-bearing authorization point.

**`game_event_admin_status` view is unchanged.** The view's
`security_invoker = true` setting means it inherits the underlying
tables' RLS at read time. After the SELECT broadening on
`game_event_drafts` and `game_event_versions`, organizers reading
the view through PostgREST see status rows for events they
organize — no view-definition change needed.

**Edge Function shared helper.**
`authenticateEventOrganizerOrAdmin(request, eventId, supabaseUrl, serviceRoleKey, supabaseClientKey) → Promise<AdminAuthResult>`.
Reads bearer token, exchanges it via service-role
`auth.getUser(token)`, then calls the user-scoped client's
`rpc("is_organizer_for_event", { target_event_id: eventId })` and
`rpc("is_root_admin")`, accepting on either OR-branch. Returns
`{ status: "ok", userId }` or
`{ status: "unauthenticated" | "forbidden", error }` — same
discriminated-union shape as `authenticateQuizAdmin`.

**Edge Function caller migration.** Each of `save-draft`,
`publish-draft`, `unpublish-event`, `generate-event-code` resolves
the target event identifier from its already-validated payload,
swaps `authenticateQuizAdmin` for the new helper, and threads the
`eventId` argument through. `save-draft`'s `id` field doubles as
`eventId` because the broadening predicate keys on
`event_role_assignments.event_id` which equals `game_events.id`.
Forbidden-branch user-facing copy moves from "not allowlisted for
game authoring" to a phrasing that covers either rejection cause
(suggested: "this account is not authorized to author this event"),
finalized in step 7.

**Existing SECURITY DEFINER helpers are unchanged.**
`is_organizer_for_event(text)`, `is_agent_for_event(text)`, and
`is_root_admin()` ship in
[`supabase/migrations/20260421000200_add_event_role_helpers.sql`](../../../../supabase/migrations/20260421000200_add_event_role_helpers.sql);
this phase consumes them and adds no new helper variant.

## Files to touch — new

- `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql`
  — single migration. Replaces the SELECT policies on
  `game_event_drafts`, `game_event_versions`, and
  `event_role_assignments`; adds INSERT and DELETE policies on
  `event_role_assignments` plus the matching grant. Migration's
  leading comment enumerates the table set, the deliberate
  non-touches, and the historical note that earlier drafts had
  broader scope.
- `supabase/tests/database/authoring_reads_rls.test.sql` — covers
  the `game_event_drafts` and `game_event_versions` SELECT
  broadening plus the transitive read of `game_event_admin_status`
  via `security_invoker`. Reuses the role-switching pattern from
  [`supabase/tests/database/redemption_rls.test.sql`](../../../../supabase/tests/database/redemption_rls.test.sql)
  (`set local role authenticated` plus
  `set_config('request.jwt.claims', ...)` per case). Role matrix:
  organizer-A own event, organizer-B own event, agent (denied;
  authoring is not an agent surface), unrelated authenticated
  (denied), root admin (sees all).
- `supabase/tests/database/event_role_assignments_rls.test.sql` —
  focused suite for the staffing-table broadening. Same fixture
  shape. Covers the three-branch SELECT (self, organizer, root);
  the new INSERT/DELETE policies (positive within own event,
  RLS-denied across events); the UPDATE privilege-layer denial for
  both `authenticated` and `service_role`.
- `supabase/functions/_shared/event-organizer-auth.ts` — the new
  shared helper. Lands in 2.1.2.

## Files to touch — modify

- [`supabase/functions/save-draft/index.ts`](../../../../supabase/functions/save-draft/index.ts)
  — swap `authenticateQuizAdmin` for the new helper; pass the
  draft's `id` as `eventId`.
- [`supabase/functions/publish-draft/index.ts`](../../../../supabase/functions/publish-draft/index.ts)
  — same swap; payload already carries the event id.
- [`supabase/functions/unpublish-event/index.ts`](../../../../supabase/functions/unpublish-event/index.ts)
  — same swap.
- [`supabase/functions/generate-event-code/index.ts`](../../../../supabase/functions/generate-event-code/index.ts)
  — same swap. The shared client signature for `generateEventCode`
  gains an `eventId` parameter; the apps/web call site already has
  the id in scope, so the change is mechanical (per the M2 phase
  2.4 scoping doc's Resolved Decisions —
  `docs/plans/scoping/m2-phase-2-4.md`, deleted in M2 phase 2.5.3
  batch deletion; see git history for the pre-deletion content).
- [`docs/architecture.md`](../../../architecture.md) — "Backend Structure",
  "What Is Implemented Now", and "Current Backend Surface" sections
  describe organizer write capability and the broadened authoring-
  function gates. The Vercel routing topology table is unchanged.
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.

## Files intentionally not touched

- [`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`](../../../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)
  — the redeem RPC's gate stays `is_agent_for_event OR is_root_admin`
  per the resolved decision to defer organizer-redeem broadening
  ([`m2-admin-restructuring.md`](./m2-admin-restructuring.md) "Cross-Phase Decisions" §2).
- [`supabase/functions/_shared/admin-auth.ts`](../../../../supabase/functions/_shared/admin-auth.ts)
  — `authenticateQuizAdmin` is preserved as-is; no callers remain
  inside this phase's diff but the function stays for reference and
  any future root-only path. Bearer-token reading is duplicated in
  the new helper rather than extracted, to keep this phase's diff
  small and the two helpers independently auditable.
- `apps/web/*`, `apps/site/*`, `shared/*`, `vercel.json` — no
  changes. Consumer surfaces (the per-event admin in 2.2, the
  platform-admin in 2.4) consume the broadened gates without
  needing 2.1 to wire any UI.
- `supabase/config.toml` — the four authoring functions already
  carry `verify_jwt = false`; no change.
- The `redeem-entitlement` and `reverse-entitlement-redemption`
  Edge Functions — their authorization layer is unchanged.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and a feature branch
   (not `main`). Confirm Node and Deno versions match
   [`mise.toml`](../../../../mise.toml). Read the latest sibling-phase
   scoping docs to confirm none have moved.
2. **Baseline validation.** Run `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`, and the repo's pgTAP runner of record
   (`supabase test db` per
   [`docs/dev.md`](../../../dev.md)). All must pass before any edit.
3. **Write the migration.** Create
   `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql`.
   Migration body order: (a) leading comment enumerating the table
   set, the deliberate non-touches, and the historical note that
   earlier drafts had broader scope, (b) `game_event_drafts` SELECT
   replacement, (c) `game_event_versions` SELECT replacement,
   (d) `event_role_assignments` GRANT + SELECT replacement + INSERT
   policy + DELETE policy. Each policy carries an inline comment
   naming the broadening predicate.
4. **Apply locally.** `npm run test:db` (or `supabase db reset` then
   the pgTAP runner). The new migration must apply cleanly against
   the full local migration history.
5. **Write `authoring_reads_rls.test.sql`.** Reuse the fixture
   pattern from
   [`redemption_rls.test.sql`](../../../../supabase/tests/database/redemption_rls.test.sql):
   `set local session_replication_role = 'replica'` for the
   duration of `auth.users`-FK-bypassing seeds, and use
   `set local role authenticated` plus `set_config('request.jwt.claims', ...)`
   per role under test. Role matrix per the file's coverage section.
6. **Write `event_role_assignments_rls.test.sql`.** Same fixture
   shape. Covers the three-branch SELECT, the new INSERT/DELETE
   policies, and the UPDATE privilege-layer denial.
7. **Run the new tests in isolation, then full pgTAP.** First the
   two new test files alone via the repo's targeted-pgTAP path, then
   the full `npm run test:db` sweep. Both must pass. The
   Privilege-test vacuous-pass audit
   (per [`docs/self-review-catalog.md`](../../../self-review-catalog.md))
   is satisfied at this step: walk each negative assertion against
   "would this pass under bare-PostgreSQL with no baseline grants?"
   and split any comma-separated privilege list.
8. **Create the Edge Function helper.** Write
   `supabase/functions/_shared/event-organizer-auth.ts`. Body
   structure mirrors
   [`admin-auth.ts`](../../../../supabase/functions/_shared/admin-auth.ts):
   read bearer token, service-role `auth.getUser`, user-scoped client
   running both RPC calls in sequence, return on either OR-branch.
   Forbidden-branch error copy: "this account is not authorized to
   author this event."
9. **Migrate the four authoring functions.** Edit each in turn:
   `save-draft` (resolves `eventId` from payload `id`),
   `publish-draft` (`eventId` from payload), `unpublish-event`
   (`eventId` from payload), `generate-event-code` (`eventId` from
   payload — call site already has it in scope per the resolved 2.4
   contract). Run `deno check` per file as you go.
10. **Run function tests.** `npm run test:functions`. Existing
    function-test mocks may need narrowing if any test stubbed
    `is_admin` directly; the per-test fix is to also stub
    `is_organizer_for_event` returning `false` so existing tests
    continue to assert root-admin behavior.
11. **Documentation update.** Update
    [`docs/architecture.md`](../../../architecture.md) per the "Files to
    touch — modify" entry. Walk the Doc Currency PR Gate triggers
    in [`AGENTS.md`](../../../../AGENTS.md): the trust-boundary text
    changes (organizer write capability is new); the Backend Surface
    list updates (organizer-or-admin gate on the four authoring
    functions); no operations / dev / open-questions / backlog
    impact in this phase. The epic's M2 row stays `Proposed` — its
    flip lands with 2.5.
12. **Repeat full validation.** All baseline commands from step 2,
    plus a manual exercise: assign an `organizer` row for a fixture
    user against a test event in the local Supabase, sign in as
    that user via magic link, and confirm via the local Supabase
    client that direct PostgREST reads against `game_event_drafts`
    and `game_event_admin_status` succeed for the fixture event and
    return zero rows for an unrelated event. Repeat for an INSERT
    into `event_role_assignments` (own event vs. unrelated event).
    Manual writes-via-Edge-Function exercise lands with 2.1.2's PR.
13. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against the Cross-Cutting Invariants and
    each Self-Review Audit named below. Fix in place; commit
    review-fix changes separately when that clarifies history per
    [`AGENTS.md`](../../../../AGENTS.md) Review-Fix Rigor.
14. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation Gate command, and Self-Review Audit named
    in this plan. Confirm each is satisfied or explicitly deferred
    in this plan with rationale. Flip Status from `Proposed` to
    `Landed` in the same PR.
15. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../../../.github/pull_request_template.md).
    Title under 70 characters. Validation section lists every
    command actually run. Target Shape Evidence: name the table
    set the migration broadens against the table set the pgTAP
    suite asserts (1:1 mapping). UX Review: `N/A` (no user-visible
    behavior). Remaining Risk: organizer-redeem deferral; audit-log
    invariant preserved by `GRANT EXECUTE → service_role` plus
    direct-INSERT denied via RLS, with the broadened Edge Function
    gate as the load-bearing authorization point.

## Commit boundaries

Per [`AGENTS.md`](../../../../AGENTS.md) "Planning Depth," commit slices
named upfront:

1. **Migration.** The single SQL migration (steps 3–4) — SELECT
   policy replacements on `game_event_drafts` and
   `game_event_versions` plus the `event_role_assignments`
   SELECT replacement, INSERT and DELETE policies, and the matching
   GRANT. No RPC body changes. Single commit, no other touch.
2. **pgTAP suite.** The two new test files (steps 5–7). Single
   commit; running tests is part of the validation gate, not a
   commit boundary.
3. **Edge Function helper + caller migration.** The new
   `event-organizer-auth.ts` plus the four caller swaps (steps 8–10).
   Single commit; the helper alone has no consumer and the four
   callers cannot land without it.
4. **Documentation update.** Architecture.md edits and Status flip
   (step 11). Single commit.
5. **Review-fix commits.** As needed during step 13, kept distinct
   from the substantive implementation commits.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final. No
  apps/web source changes; build pass confirms the binding modules
  haven't drifted.
- `npm run build:site` — pass on baseline; pass on final. No
  apps/site source changes.
- `npm test` — pass on baseline; pass on final. Function-test
  mocks for `is_admin` may need a paired
  `is_organizer_for_event → false` stub (step 10); update in place,
  no new test files in `tests/`.
- `npm run test:functions` — pass on baseline; pass on final.
- `deno check --no-lock` on each of the four edited functions plus
  the new shared helper. All pass.
- pgTAP full suite — pass on baseline; pass on final. The two new
  files plus every existing test file in
  [`supabase/tests/database/`](../../../../supabase/tests/database/).
- Manual organizer write-path exercise per step 12.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../../../self-review-catalog.md) and
matched to this phase's diff surfaces.

### SQL migrations & RPCs

- **Grant/body contract audit.** Every role named in a `GRANT
  EXECUTE` (none added in this phase; `is_organizer_for_event` /
  `is_root_admin` keep their existing grants) and every role named
  in a new RLS policy must have a reachable success path. Walk
  organizer, agent, root-admin, unrelated-authenticated, and anon
  through each new policy; the pgTAP suite is the durable record.
- **Privilege-test vacuous-pass audit.** Per the Cross-Cutting
  Invariants. Every `has_table_privilege` call uses one privilege
  per call. Negative assertions are reasoned against the Supabase
  CLI baseline grants.
- **Legacy-data precheck for constraint tightening.** Does not
  apply: this phase adds no CHECK, NOT NULL, UNIQUE, or FK
  tightening. Recorded here as a deliberate non-applicable rather
  than a forgotten audit.
- **pgTAP output-format stability audit.** New tests prefer
  `pg_policies` / `information_schema` over pgTAP's `col_*` /
  `has_*` wrappers wherever the output shape might shift across CLI
  versions; assertions about policy presence use catalog queries
  (see the existing
  [`redemption_rls.test.sql`](../../../../supabase/tests/database/redemption_rls.test.sql)
  pattern).
- **Replica-mode trigger suppression audit.**
  `session_replication_role = 'replica'` is set only around fixture
  seeds that bypass `auth.users` FKs and is reset to `'origin'`
  before any trigger-dependent assertion. Mirrors the
  [`redemption_rls.test.sql`](../../../../supabase/tests/database/redemption_rls.test.sql)
  discipline.
- **Supabase-owned-schema FK fragility.**
  `event_role_assignments.user_id → auth.users(id)` remains; the
  test fixture pattern reuses the existing replica-mode + synthetic-UUID
  approach from
  [`redemption_rls.test.sql`](../../../../supabase/tests/database/redemption_rls.test.sql).
  No FK reshape attempted in this phase.

### Edge Functions & deployment config

- **Platform-auth-gate config audit.** No new functions added; the
  four migrated functions already carry `[functions.<name>]
  verify_jwt = false` in
  [`supabase/config.toml`](../../../../supabase/config.toml). Re-confirm
  during the diff walk; the entries must remain present.
- **Error-surfacing for user-initiated mutations.** The forbidden
  branch's user-facing copy must surface honestly when the
  rejection reason is "not an organizer for this event" rather than
  "not allowlisted." The shared helper returns the new copy; the
  four callers' existing error-rendering paths surface it via the
  binding modules.

### CI & testing infrastructure

- **CLI / tooling pinning audit.** Does not apply: no new
  dependencies, no CLI version bump.
- **Rename-aware diff classification.** Does not apply: this phase
  adds and modifies, but does not rename across surfaces. Any
  `git diff --name-status` output should show pure `A`/`M` entries.
- **Readiness-gate truthfulness audit.** Validation gate's manual
  organizer-write step (step 12) must reflect a real run; do not
  claim it from code reasoning.

## Documentation Currency PR Gate

Per [`AGENTS.md`](../../../../AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/architecture.md`](../../../architecture.md) — trust boundary text
  reflects organizer write capability; the Backend Surface list
  reflects the broadened authoring-function gates.
- [`docs/operations.md`](../../../operations.md) — no change; the admin URL
  contract is owned by 2.3 / 2.4, and operator routes by 2.5.
- [`docs/product.md`](../../../product.md) — no change; the implemented
  capability set surfaces to users only when the per-event admin
  route lands in 2.2.
- [`docs/dev.md`](../../../dev.md) — no change; no new validation commands.
- [`docs/open-questions.md`](../../../open-questions.md) — no change;
  the post-MVP authoring-ownership entry closes with 2.5's terminal
  M2 PR per the epic's "Open Questions Resolved By This Epic"
  paragraph.
- [`docs/backlog.md`](../../../backlog.md) — no change; the
  organizer-managed-agent-assignment unblock is recorded with M2's
  terminal PR, not 2.1's.
- This plan — Status flips from `Proposed` to `Landed`.

## Out Of Scope

Deliberately excluded from this phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **Organizer-redeem RPC broadening.** The
  `redeem_entitlement_by_code` RPC's gate stays unchanged. Resolution
  in [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §2: defer to a focused post-M2 PR if and
  when a real organizer-redeem need surfaces.
- **Direct organizer INSERT on `game_event_audit_log` and
  `game_event_versions`.** Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §1: writes flow through the publish/unpublish
  RPCs, which widen in this phase.
- **Combined SQL helper RPC
  `is_admin_or_organizer_for_event(eventId)`.** Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions / Settled by default": no combined helper;
  RLS inlines the OR directly and clients compose the two existing
  helpers.
- **`event_role_assignments.created_by` capture on organizer
  insert.** Defer to the post-epic
  organizer-managed-agent-assignment follow-up.
- **Per-event admin UI** (M2 phase 2.2), **`/auth/callback` and
  `/` migration** (M2 phase 2.3), **platform-admin migration**
  (M2 phase 2.4), and **operator URL migration** (M2 phase 2.5).
  All consume the broadened gates this phase ships, but ship in
  their own PRs.

## Risk Register

- **RLS broadening silently re-grants writes to a deprecated
  table.** A misclassification of `admin_users` as event-scoped, or
  an accidental policy on `game_event_audit_log` /
  `game_event_versions`, would silently break invariants.
  Mitigation: the migration's leading comment enumerates the table
  set 1:1 with the pgTAP coverage; reviewer attention compares the
  two lists explicitly.
- **Organizers gain direct PostgREST write access to
  `game_event_drafts`, bypassing `save-draft`'s validation.** The
  Edge Function's validation must not become the only enforcement
  point. Mitigation: walk the existing CHECK constraints on
  `game_event_drafts` during the audit pass and surface any
  application-only validation as a follow-up; do not silently
  expand application validation into this PR.
- **Comma-separated `has_table_privilege` lists pass vacuously.**
  Per the Privilege-test vacuous-pass audit. Mitigation: the
  Cross-Cutting Invariants ban the pattern; reviewer attention
  walks every assertion.
- **`auth.users` FK fixture instability across Supabase CLI
  versions.** Documented in the
  [self-review catalog's Supabase-owned-schema FK fragility entry](../../../self-review-catalog.md).
  Mitigation: reuse the
  [`redemption_rls.test.sql`](../../../../supabase/tests/database/redemption_rls.test.sql)
  fixture pattern verbatim — the same replica-mode + synthetic-UUID
  approach already proven against the current CLI pin.
- **Forbidden-branch copy regression.** Existing root-only callers
  hit the forbidden branch with the old "not allowlisted" copy
  today; the new copy is broader. If any UI surface assertion or
  fixture matches the literal string, it must update. Mitigation:
  grep for the existing copy across `apps/web` and `tests/` during
  step 9; update any literal matches in the same commit.
- **Function-test mock drift.** Existing function tests that stub
  `is_admin` may now need a paired `is_organizer_for_event` stub.
  Mitigation: caught by `npm run test:functions` in step 10; the
  fix is local to each test file.

## Backlog Impact

- "Organizer-managed agent assignment" (per the epic's "Items
  unblocked but not landed by this epic") becomes implementable on
  top of this phase's RLS broadening with no further authorization
  work. The unblock is recorded in
  [`docs/backlog.md`](../../../backlog.md) by M2's terminal PR (2.5), not
  by this phase.

## Related Docs

- [`event-platform-epic.md`](../../event-platform-epic.md) — parent
  epic; M2 paragraph at lines 544–669.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  M2 milestone doc; cross-phase decisions, sequencing, invariants.
- `docs/plans/scoping/m2-phase-2-1.md` — scoping doc this plan
  compressed from (deleted in M2 phase 2.5.3 batch deletion; see
  git history for the pre-deletion content).
- `docs/plans/scoping/m2-phase-2-2.md` — scoping doc for the
  consumer phase whose UI relied on this broadening (deleted in
  M2 phase 2.5.3 batch deletion; see git history for the
  pre-deletion content). The consumer phase plan is
  [`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md).
- [`docs/self-review-catalog.md`](../../../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../../../AGENTS.md) — workflow rules, Plan-to-PR
  Completion Gate, Doc Currency PR Gate.
