# M2 Phase 2.1 — RLS Broadening With pgTAP Coverage

## Status

Proposed.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md),
Milestone M2, Phase 2.1. Sibling phases: 2.2 per-event admin shell —
Proposed; 2.3 `/auth/callback` and `/` migration — Proposed; 2.4
platform admin migration — Proposed; 2.5 `/game/*` URL migration —
Proposed. The epic's M2 row stays `Proposed` until 2.5 also lands.

**Sub-phases:** this plan ships across two sub-phase PRs. 2.1.1
([`m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md)) — Proposed —
ships the SQL migration (RLS broadening only — the publish/unpublish
RPC bodies stay unchanged; see Contracts) and the pgTAP suite. 2.1.2
(plan TBD) — Proposed — ships the new
`authenticateEventOrganizerOrAdmin` shared helper, the four authoring-
function caller swaps, the `docs/architecture.md` updates, and the
parent Status flip. The Files-to-touch, Execution steps, Commit
boundaries, and Validation Gate sections below describe the union of
both sub-phases; each sub-phase plan owns per-PR slicing, commit
boundaries, and the deferred / not-touched record for its own diff.

This plan flips to `Landed` when 2.1.2 (the terminal sub-phase under
the current sequencing) merges. The epic's M2 row flip is owned by the
last-merging M2 phase (2.5 under the current sequencing), not by this
PR.

**Scoping inputs:** [`scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md)
for the file inventory and contracts walkthrough;
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md) "Cross-Phase
Decisions" for the resolution and rejected alternatives behind every
cross-phase decision this plan depends on.

## Goal

Broaden Postgres RLS so an authenticated user with an `organizer` row
in `event_role_assignments` for a given event can perform every write
that root-admin can perform on that event's data — including writes
to `event_role_assignments` itself. Extend pgTAP coverage so each
privilege is asserted independently per role (organizer, agent,
root-admin, unrelated-authenticated, anon) per event. Migrate the
four authoring Edge Functions plus a new shared helper to accept
organizer callers in addition to root-admin. Audit-log and version
rows continue to flow exclusively through `publish_game_event_draft()`
/ `unpublish_game_event()`; organizers gain the ability to publish and
unpublish via the broadened Edge Function gate, which calls those
RPCs under service_role exactly as the root-admin path does today.

The phase is the deliberate resolution of the
"Post-MVP authoring ownership" open question and the precondition for
phase 2.2's per-event admin route shell.

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file.

- **Broadening predicate is uniform.** Every event-scoped write
  policy added or replaced uses the predicate
  `is_organizer_for_event(event_id) OR is_root_admin()` — same
  helper signature (`event_id text`), same OR-shape, same case
  ordering. No table, helper, or RPC writes its own variant.
- **Agent write posture is unchanged.** Agents do not gain direct
  table writes. The only agent-reachable write path stays the
  existing `redeem_entitlement_by_code` SECURITY DEFINER RPC at
  [`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`](../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql);
  its gate is not touched in this phase.
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
  [self-review catalog's Privilege-test vacuous-pass audit](../self-review-catalog.md).
- **Edge Function authorization is centralized.** All four
  authoring functions (`save-draft`, `publish-draft`,
  `unpublish-event`, `generate-event-code`) call the new shared
  helper `authenticateEventOrganizerOrAdmin(...)`; no per-function
  inline `is_admin() OR is_organizer_for_event(eventId)` composition.

## Naming

- The new SQL migration is `20260427010000_broaden_event_scoped_rls.sql`.
  The next free slot after the latest migration
  ([`20260423020000_add_game_event_admin_status_view.sql`](../../supabase/migrations/20260423020000_add_game_event_admin_status_view.sql))
  under the repo's `YYYYMMDDHHMMSS_snake_case_description.sql`
  convention.
- The new Edge Function helper is
  `authenticateEventOrganizerOrAdmin` and lives at
  `supabase/functions/_shared/event-organizer-auth.ts`. Mirrors the
  existing `authenticateQuizAdmin` shape from
  [`supabase/functions/_shared/admin-auth.ts`](../../supabase/functions/_shared/admin-auth.ts);
  `AdminAuthResult` type is reused.
- New pgTAP files name the surface, not the phase, per
  [`AGENTS.md`](../../AGENTS.md) anti-patterns: `event_scoped_writes_rls.test.sql`
  and `event_role_assignments_rls.test.sql`.

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

- `game_event_audit_log` — service-role-only INSERT; broadening
  flows through the publish/unpublish RPCs.
- `game_event_versions` — service-role-only INSERT; broadening
  flows through `publish_game_event_draft()`.

The `admin_users` table is platform-level and stays unchanged.

## Contracts

**Broadening predicate.** Every direct-write policy uses
`with check (public.is_organizer_for_event(event_id) OR public.is_root_admin())`
with a matching `using (...)` clause for UPDATE / DELETE. For
`game_event_drafts` whose `event_id` lives as the `id` column,
the predicate substitutes `id` for `event_id` directly — no
subquery against `game_events`.

**`event_role_assignments` SELECT policy extension.** The existing
self-or-root-admin SELECT policy at
[`supabase/migrations/20260421000500_add_redemption_rls_policies.sql`](../../supabase/migrations/20260421000500_add_redemption_rls_policies.sql)
is replaced with one that admits a third branch:
`is_organizer_for_event(event_id)`. Effect: an organizer can list
the agents and organizers assigned to events they organize. Self-read
and root-admin read continue to work.

**`event_role_assignments` write policies.** New INSERT and DELETE
policies use the broadening predicate. UPDATE stays revoked at the
privilege layer; the original migration deliberately omits the UPDATE
grant.

**`publish_game_event_draft` / `unpublish_game_event` RPCs are
unchanged.** Earlier drafts of this plan said these RPCs would have
their internal `is_admin()` gate widened. That was a misreading of
the existing security model: neither RPC has an internal `is_admin()`
gate today, `GRANT EXECUTE` is to `service_role` only, and the Edge
Functions invoke the RPCs under the service-role key (the user JWT
is not propagated, so an internal claims check would not see the
caller). The audit-log/versions invariant is preserved by the
existing privilege-layer setup — `GRANT EXECUTE → service_role` plus
direct-INSERT denied via RLS — combined with the Edge Function gate
becoming the load-bearing authorization point. The RPC bodies, their
`SECURITY DEFINER`, `search_path`, and grant lists stay exactly as
they are today.

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
[`supabase/migrations/20260421000200_add_event_role_helpers.sql`](../../supabase/migrations/20260421000200_add_event_role_helpers.sql);
this phase consumes them and adds no new helper variant.

## Files to touch — new

- `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql`
  — single migration. Adds the eight tables' direct-write policies
  per the table above; replaces the `event_role_assignments` SELECT
  policy with the three-branch version. Does **not** modify
  `publish_game_event_draft` or `unpublish_game_event` bodies (see
  Contracts: those RPCs stay unchanged because they have no
  internal authorization predicate to widen). Migration's leading
  comment enumerates the table set 1:1 with the pgTAP coverage so
  reviewers can walk one against the other.
- `supabase/tests/database/event_scoped_writes_rls.test.sql` —
  per-table, per-privilege, per-role assertions for every direct-write
  policy this phase adds. Reuses the role-switching pattern from
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
- `supabase/functions/_shared/event-organizer-auth.ts` — the new
  shared helper.

## Files to touch — modify

- [`supabase/functions/save-draft/index.ts`](../../supabase/functions/save-draft/index.ts)
  — swap `authenticateQuizAdmin` for the new helper; pass the
  draft's `id` as `eventId`.
- [`supabase/functions/publish-draft/index.ts`](../../supabase/functions/publish-draft/index.ts)
  — same swap; payload already carries the event id.
- [`supabase/functions/unpublish-event/index.ts`](../../supabase/functions/unpublish-event/index.ts)
  — same swap.
- [`supabase/functions/generate-event-code/index.ts`](../../supabase/functions/generate-event-code/index.ts)
  — same swap. The shared client signature for `generateEventCode`
  gains an `eventId` parameter; the apps/web call site already has
  the id in scope, so the change is mechanical (per
  [`scoping/m2-phase-2-4.md`](./scoping/m2-phase-2-4.md) Resolved
  Decisions).
- [`docs/architecture.md`](../architecture.md) — "Backend Structure",
  "What Is Implemented Now", and "Current Backend Surface" sections
  describe organizer write capability and the broadened authoring-
  function gates. The Vercel routing topology table is unchanged.
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.

## Files intentionally not touched

- [`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`](../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)
  — the redeem RPC's gate stays `is_agent_for_event OR is_root_admin`
  per the resolved decision to defer organizer-redeem broadening
  ([`m2-admin-restructuring.md`](./m2-admin-restructuring.md) "Cross-Phase Decisions" §2).
- [`supabase/functions/_shared/admin-auth.ts`](../../supabase/functions/_shared/admin-auth.ts)
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
   [`mise.toml`](../../mise.toml). Read the latest sibling-phase
   scoping docs to confirm none have moved.
2. **Baseline validation.** Run `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`, and the repo's pgTAP runner of record
   (`supabase test db` per
   [`docs/dev.md`](../dev.md)). All must pass before any edit.
3. **Write the migration.** Create
   `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql`.
   Migration body order: (a) leading comment enumerating the table
   set and noting the deliberate non-touches (`game_event_audit_log`
   and `game_event_versions` direct-INSERT, the publish/unpublish
   RPC bodies), (b) per-table direct-write policies in the order
   from the "Tables in scope" section, (c) `event_role_assignments`
   SELECT policy replacement. Each policy carries an inline comment
   naming the broadening predicate so reviewer attention reads the
   predicate once per policy.
4. **Apply locally.** `supabase db reset` (or the repo's
   reset-then-replay command). The new migration must apply cleanly
   against the full local migration history.
5. **Write `event_scoped_writes_rls.test.sql`.** Reuse the fixture
   pattern from
   [`redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql):
   `set local session_replication_role = 'replica'` only for the
   duration of `auth.users`-FK-bypassing seeds, reset to `'origin'`
   before any trigger-dependent assertion, and use
   `set local role authenticated` plus `set_config('request.jwt.claims', ...)`
   per role under test. Per-table-per-privilege-per-role cells; aim
   for explicit `pass`/`fail` assertions over count-based checks so
   a reviewer can see the truth table.
6. **Write `event_role_assignments_rls.test.sql`.** Same fixture
   shape. Cover the organizer SELECT extension explicitly: a fixture
   organizer for event A reads their own assignments for A and is
   denied reads for assignments belonging to event B.
7. **Run the new tests in isolation, then full pgTAP.** First
   `supabase test db --linked --include event_scoped_writes_rls.test.sql event_role_assignments_rls.test.sql`
   (or the repo's targeted-pgTAP equivalent), then the full pgTAP
   sweep. Both must pass. The Privilege-test vacuous-pass audit
   (per [`docs/self-review-catalog.md`](../self-review-catalog.md))
   is satisfied at this step: walk each negative assertion against
   "would this pass under bare-PostgreSQL with no baseline grants?"
   and split any comma-separated privilege list.
8. **Create the Edge Function helper.** Write
   `supabase/functions/_shared/event-organizer-auth.ts`. Body
   structure mirrors
   [`admin-auth.ts`](../../supabase/functions/_shared/admin-auth.ts):
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
    [`docs/architecture.md`](../architecture.md) per the "Files to
    touch — modify" entry. Walk the Doc Currency PR Gate triggers
    in [`AGENTS.md`](../../AGENTS.md): the trust-boundary text
    changes (organizer write capability is new); the Backend Surface
    list updates (organizer-or-admin gate on the four authoring
    functions); no operations / dev / open-questions / backlog
    impact in this phase. The epic's M2 row stays `Proposed` — its
    flip lands with 2.5.
12. **Repeat full validation.** All baseline commands from step 2,
    plus a manual exercise: assign an `organizer` row for a fixture
    user against a test event in the local Supabase, sign in as
    that user via magic link, and confirm via the local Supabase
    client that direct PostgREST writes against `game_event_drafts`
    succeed for the fixture event and fail for an unrelated event.
    Repeat for `event_role_assignments` INSERT.
13. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against the Cross-Cutting Invariants and
    each Self-Review Audit named below. Fix in place; commit
    review-fix changes separately when that clarifies history per
    [`AGENTS.md`](../../AGENTS.md) Review-Fix Rigor.
14. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation Gate command, and Self-Review Audit named
    in this plan. Confirm each is satisfied or explicitly deferred
    in this plan with rationale. Flip Status from `Proposed` to
    `Landed` in the same PR.
15. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters. Validation section lists every
    command actually run. Target Shape Evidence: name the table
    set the migration broadens against the table set the pgTAP
    suite asserts (1:1 mapping). UX Review: `N/A` (no user-visible
    behavior). Remaining Risk: organizer-redeem deferral; audit-log
    invariant preserved by `GRANT EXECUTE → service_role` plus
    direct-INSERT denied via RLS, with the broadened Edge Function
    gate as the load-bearing authorization point.

## Commit boundaries

Per [`AGENTS.md`](../../AGENTS.md) "Planning Depth," commit slices
named upfront:

1. **Migration.** The single SQL migration (steps 3–4) — RLS
   broadening on the eight tables plus the `event_role_assignments`
   SELECT-policy extension. No RPC body changes. Single commit, no
   other touch.
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
  [`supabase/tests/database/`](../../supabase/tests/database/).
- Manual organizer write-path exercise per step 12.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md) and
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
  test fixture pattern reuses the existing replica-mode + synthetic-UUID
  approach from
  [`redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql).
  No FK reshape attempted in this phase.

### Edge Functions & deployment config

- **Platform-auth-gate config audit.** No new functions added; the
  four migrated functions already carry `[functions.<name>]
  verify_jwt = false` in
  [`supabase/config.toml`](../../supabase/config.toml). Re-confirm
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

Per [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/architecture.md`](../architecture.md) — trust boundary text
  reflects organizer write capability; the Backend Surface list
  reflects the broadened authoring-function gates.
- [`docs/operations.md`](../operations.md) — no change; the admin URL
  contract is owned by 2.3 / 2.4, and operator routes by 2.5.
- [`docs/product.md`](../product.md) — no change; the implemented
  capability set surfaces to users only when the per-event admin
  route lands in 2.2.
- [`docs/dev.md`](../dev.md) — no change; no new validation commands.
- [`docs/open-questions.md`](../open-questions.md) — no change;
  the post-MVP authoring-ownership entry closes with 2.5's terminal
  M2 PR per the epic's "Open Questions Resolved By This Epic"
  paragraph.
- [`docs/backlog.md`](../backlog.md) — no change; the
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
  [self-review catalog's Supabase-owned-schema FK fragility entry](../self-review-catalog.md).
  Mitigation: reuse the
  [`redemption_rls.test.sql`](../../supabase/tests/database/redemption_rls.test.sql)
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
  [`docs/backlog.md`](../backlog.md) by M2's terminal PR (2.5), not
  by this phase.

## Related Docs

- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M2 paragraph at lines 544–669.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  M2 milestone doc; cross-phase decisions, sequencing, invariants.
- [`scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md) — scoping
  doc this plan compresses.
- [`scoping/m2-phase-2-2.md`](./scoping/m2-phase-2-2.md) — the
  consumer phase whose UI relies on this broadening.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules, Plan-to-PR
  Completion Gate, Doc Currency PR Gate.
