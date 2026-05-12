# DB Permissions Snapshot — Implementation Plan

## Status

Proposed.

## Context

Sibling to the scoping investigation at
[`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md).
The scoping pass — extended by mid-drafting review of a worked C3
example, which surfaced that C3 was largely redundant with good
inline prose on grant/policy migrations — settled on a two-layer
shape with a self-review audit binding it together:

- **B2** (comprehensive pgTAP coverage) — a single `permissions.test.sql`
  asserts the current expected state for every `public.*` table and
  function.
- **A1** (markdown snapshot) — a generated
  `shared/db/permissions.snapshot.md` is the human-readable per-table
  inventory, regenerated from a local DB.
- **(2)** (self-review audit) — the PR template carries an audit
  reminding the migration author to regenerate the snapshot AND
  ensure the migration's prose comments explain the post-state of
  every grant, policy, RLS-enabled, and `SECURITY`-mode change the
  migration makes. The comment-quality expectation lives on this
  layer rather than as a separate C3 format.

C1 (CI snapshot-drift gate) and C2 (CI coverage gate) were
considered and rejected as overbearing for the repo's migration
volume; B2's test failures are the safety net for state drift, and
(2) carries the doc-currency and comment-quality layers through
reviewer discipline.

The earlier draft of this plan included **C3** (a standardized
`-- Permissions after this migration:` trailing-comment format
on every grant/policy/SECURITY-touching migration). A worked
example on
[`20260509000000_add_submit_feedback_rpc.sql`](/supabase/migrations/20260509000000_add_submit_feedback_rpc.sql)
surfaced that C3 was a redundant third layer: the migration's
existing prose comments already named the post-state cleanly, and
the formal C3 block was structure over content that already
existed. The right enforcement mechanism is comment quality, which
folds into (2). The C3 rule is dropped; the worked example was
reverted.

This plan is the cross-cutting implementation contract that the
implementing PR consumes. It is not part of an epic.

## Goal

After this plan lands, a maintainer can answer "what grants, RLS
policies, RLS-enabled flag, function `SECURITY` mode, and function
`EXECUTE` grants are in force on table or function X today" by
reading the markdown snapshot at
`shared/db/permissions.snapshot.md` — a single regenerable
per-table-and-per-function inventory derived from the live DB
after all migrations apply. Grant/policy migrations carry inline
prose comments naming their post-state per the (2) audit, so a
reader opening a specific migration also sees the post-state
documented in plain prose adjacent to the SQL that produced it.

The pgTAP suite at `supabase/tests/database/permissions.test.sql`
becomes the machine-verifiable source of truth for the same state,
so divergence between the live schema and what the snapshot claims
surfaces as a test failure, not as silent doc drift.

## Cross-Cutting Invariants

Three invariants thread through the two artifacts and the
authoring discipline and bind them to the same end state:

- **The pgTAP test and the markdown snapshot describe the same end
  state for every public table and function.** Neither is
  authoritative over the other; they are two views of the live DB
  schema after migrations apply. Any disagreement is a bug.
- **The snapshot is regenerable from a local DB with no manual
  edits.** `npm run db:gen-permissions` reproduces the committed
  file deterministically; a committed file that does not match a
  fresh regeneration is drift.
- **Every `public.*` table and every `public.*` function with a
  `SECURITY` clause or an `EXECUTE` grant has a section in both
  `permissions.test.sql` and `permissions.snapshot.md`.** Coverage
  uniformity is the artifact's defining property — a missing
  section is a coverage gap, not a deliberate omission.

## Naming

- **Test file:** `supabase/tests/database/permissions.test.sql`
- **Snapshot file:** `shared/db/permissions.snapshot.md`
- **Generator SQL:** `scripts/db/dump-permissions.sql` — the SQL
  script that queries `pg_catalog` / `information_schema` and emits
  markdown.
- **npm script:** `db:gen-permissions` — invokes the generator
  against the local Supabase DB and writes the snapshot. Mirrors
  the existing `db:gen-types` shape in
  [`package.json`](/package.json). Verified by:
  [`package.json`](/package.json) `db:gen-types` script definition.

## Contracts

### `supabase/tests/database/permissions.test.sql`

Single consolidated pgTAP file. Sections, in order:

1. **Per-table assertions** — one section per `public.*` table in
   alphabetical order. Each section asserts:
   - `has_table_privilege(role, table, privilege)` for every
     `(role, privilege)` combination across `anon`, `authenticated`,
     `service_role` and `SELECT`, `INSERT`, `UPDATE`, `DELETE` —
     either positive or negative form depending on the expected
     state.
   - RLS-enabled flag via `pg_class.relrowsecurity`.
   - Per-policy presence assertion via `pg_policies`, naming each
     policy by exact `policyname` and asserting its `roles`, `cmd`,
     `qual`, and `with_check` shape.
2. **Per-function assertions** — one section per `public.*` function
   with a `SECURITY` clause or `EXECUTE` grant, in alphabetical
   order. Each section asserts:
   - `pg_proc.prosecdef` (TRUE for DEFINER, FALSE for INVOKER).
   - `has_function_privilege(role, function_signature, 'EXECUTE')`
     for every role.
3. **Per-view assertions** — `game_event_admin_status` view's grant
   shape (currently the only public view). Verified by:
   [`shared/db/types.ts`](/shared/db/types.ts) `Views:` block under
   `public:`.

The file uses flat-verbose form: one assertion per `(role, table,
privilege)` triple, no helper macros. Verbosity is the artifact's
readability mechanism.

### `shared/db/permissions.snapshot.md`

Generated markdown with deterministic ordering. Sections:

1. **Tables** — one subsection per `public.*` table in alphabetical
   order. Each subsection lists:
   - RLS-enabled flag.
   - Grants table: rows `(role, privilege, granted)`.
   - Policies table: rows `(policy name, applies to, command, using
     predicate, with-check predicate)`.
2. **Functions** — one subsection per `public.*` function with a
   `SECURITY` clause or `EXECUTE` grant. Each subsection lists:
   - `SECURITY DEFINER` or `SECURITY INVOKER`.
   - EXECUTE grants: rows `(role, granted)`.
3. **Views** — `game_event_admin_status` and any future views.

A header at the top names the source DB (local Supabase) and warns
that the file is generated by `npm run db:gen-permissions` — manual
edits are erased on regeneration.

### `scripts/db/dump-permissions.sql`

A single SQL script that queries `pg_catalog.pg_class`,
`pg_catalog.pg_policies`, `information_schema.role_table_grants`,
`pg_catalog.pg_proc`, and `information_schema.role_routine_grants`
and emits markdown to stdout via `\echo` or formatted `SELECT`s.
Deterministic ordering on every query (explicit `ORDER BY` on
table name, role name, privilege name, policy name, function name).

### `.github/pull_request_template.md` self-review addition

A new audit bullet under the existing Validation section (or a
sibling self-review section if one is added). The bullet binds
both the snapshot-currency expectation and the migration-prose
comment-quality expectation; both fire on the same trigger
(migration touching grants/policies/RLS-enabled/`SECURITY` mode).
Verified by:
[`.github/pull_request_template.md`](/.github/pull_request_template.md)
`## Validation` section. Wording:

> If this PR includes a migration that touches grants, policies,
> RLS-enabled, or function `SECURITY` mode: I regenerated
> `shared/db/permissions.snapshot.md` via
> `npm run db:gen-permissions`, the diff matches what the
> migration changed, and the migration's prose comments explain
> the post-state of every grant, policy, RLS-enabled, and
> `SECURITY`-mode change it makes (not just the delta).

## Files to touch — new

Estimate of new files the implementation will produce. The
implementer may adjust if a structural call requires it.

- `supabase/tests/database/permissions.test.sql` — the B2 pgTAP file.
- `shared/db/permissions.snapshot.md` — the A1 generated artifact.
- A generator under `scripts/db/` that emits the snapshot
  deterministically. Form (single SQL script invoked via psql,
  shell wrapper, TypeScript helper) is implementer's call as long
  as the determinism and ordering contracts in the Cross-Cutting
  Invariants hold.

## Files to touch — modify

Estimate of files the implementation will modify.

- `package.json` — add `db:gen-permissions` npm script.
- `.github/pull_request_template.md` — add the (2) self-review
  audit bullet.
- `shared/db/README.md` — link to the new snapshot file with a
  one-sentence pointer.
- `docs/backlog.md` — close out the Tier 5 entry once the plan
  lands; the entry's removal happens in the implementing PR
  alongside the Status flip on this plan, applying the same
  "terminal state in the same PR" pattern named in the Plan-to-PR
  Completion Gate at
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md).
- `docs/plans/db-permissions-snapshot.md` — append a Decision
  section naming the chosen shape (B2 + A1 + (2)) and pointing at
  this plan. The Decision should also record the C3 → comment-
  quality reshape so a future reader understands why the scoping
  doc names three candidate layers but the plan ships two.

## Files intentionally not touched

Estimate of files the implementation does not need to touch.

- The existing migrations under `supabase/migrations/`. The
  snapshot derives current state from the live DB after all
  migrations apply; the historical migrations remain as-written.
  Future grant/policy migrations carry the prose-comment
  expectation set by the (2) audit, but no retroactive rewrite of
  the existing set is in scope.
- `shared/db/types.ts`. Row shapes remain owned by `db:gen-types`;
  this work produces a sibling permission artifact, not an
  extension to types. Verified by:
  [`shared/db/types.ts`](/shared/db/types.ts) (Supabase-CLI-generated
  row types) and [`package.json`](/package.json) `db:gen-types`
  script.
- The existing per-feature pgTAP files
  (`game_authoring_phase{2,3,5_1}_*.test.sql`,
  `feedback_tables.test.sql`, etc.). The consolidated
  `permissions.test.sql` is additive coverage, not a replacement.
  De-duplicating overlapping grant assertions in the per-feature
  files is deferred to a follow-up cleanup PR if it surfaces
  signal at review. Verified by:
  [`supabase/tests/database/`](/supabase/tests/database/)
  (`feedback_tables.test.sql`, `submit_feedback_rpc.test.sql`,
  `game_authoring_phase2_auth.test.sql`,
  `game_authoring_phase3_publish_failure_permissions.test.sql`,
  `newsletter_opt_in_log.test.sql` all use `has_table_privilege`
  for grant assertions today).

## Execution Steps

Estimate of the contract-bearing shape of each step. Per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Plans describe contracts, not implementation," each step names
what must be accomplished; specific commands, ordering of
technique-level details, and file-write order are implementer's
call.

1. **Coverage audit.** Walk
   [`shared/db/types.ts`](/shared/db/types.ts) for the canonical
   table and function list; cross-reference against current pgTAP
   coverage. Output is the enumeration that subsequent steps
   consume; no committed artifact at this step.
2. **Write the generator.** Produce a deterministic markdown
   emitter querying `pg_catalog.pg_class`, `pg_policies`,
   `information_schema.role_table_grants`, `pg_proc`, and
   `information_schema.role_routine_grants`. The form (SQL script
   invoked via psql, shell wrapper, TypeScript helper) is
   implementer's call; the determinism contract is what's
   load-bearing.
3. **Generate and commit the initial snapshot.** Run the generator
   against the local DB and commit
   `shared/db/permissions.snapshot.md`. Verify byte-identical
   output across two consecutive runs before committing.
4. **Write `permissions.test.sql`.** One section per table, per
   function, per view, matching the snapshot's claims. Verify the
   test passes via `npm run test:db`.
5. **Wire the contributor-facing surfaces.** At PR-merge time, the
   following all hold: `db:gen-permissions` exists as an npm
   script in `package.json`; `.github/pull_request_template.md`
   carries the (2) audit bullet; `shared/db/README.md` links the
   snapshot; the Tier 5 entry in `docs/backlog.md` is removed;
   `docs/plans/db-permissions-snapshot.md` carries the Decision
   section naming B2 + A1 + (2) and the C3 reshape; this plan's
   Status is `Landed` per the Plan-to-PR Completion Gate. The
   order of these surface updates within the implementing PR is
   implementer's call.

## Commit Boundaries

Estimate of the commit shape that produces a readable history.
Per the "Plans describe contracts, not implementation" rule, the
contract is "each commit surfaces one cohesive review unit"; the
specific file grouping and the exact commit count are technique
and implementer's call.

Suggested cuts:

- **Snapshot generation** — the generator and the initial
  regenerated snapshot, reviewable as "what does our current
  state look like."
- **pgTAP coverage** — `permissions.test.sql`, reviewable as
  "what we assert is true."
- **Contributor surfaces** — npm script + PR template audit +
  README pointer + backlog close-out + scoping-doc Decision +
  plan Status flip, reviewable as "wiring + documentation."

Merge or split if a different boundary surfaces a clearer review
unit.

## Validation Gate

Pre-merge checks the implementing PR must satisfy:

- `npm run db:gen-permissions` produces a deterministic snapshot
  (run twice; diff is empty).
- `npm run lint` passes.
- `npm run test:db` passes — this is the pgTAP runner; the new
  `supabase/tests/database/permissions.test.sql` is exercised
  through it. `npm test` (Vitest) does not run pgTAP and is not
  load-bearing for this Validation Gate. Verified by:
  [`package.json`](/package.json) (`test:db` script invokes
  `scripts/testing/run-db-tests.cjs`) and
  [`scripts/testing/run-db-tests.cjs`](/scripts/testing/run-db-tests.cjs)
  (`logStep("Running pgTAP database tests")`).
- `npm test` passes (Vitest — covers any non-DB code touched by
  the implementing PR).
- `npm run test:functions` passes.
- `npm run build:web` passes.
- The committed `shared/db/permissions.snapshot.md` matches a
  fresh `npm run db:gen-permissions` run (no drift between commit
  and current generation).
- The pgTAP file's per-table and per-function sections enumerate
  the same set of tables and functions as the snapshot's sections
  (cross-artifact consistency check — manual self-review pass).

## Self-Review Audits

Audits the implementer runs before opening the PR:

- **Coverage uniformity (SQL).** Every `public.*` table named in
  `shared/db/types.ts` has a section in both
  `permissions.test.sql` and `permissions.snapshot.md`. Every
  `public.*` function with a `SECURITY` clause or `EXECUTE` grant
  appears in both. Verified by:
  [`shared/db/types.ts`](/shared/db/types.ts) `Tables:`, `Views:`,
  and `Functions:` blocks under `public:` (the canonical
  enumeration source).
- **Determinism (SQL).** Two consecutive `npm run db:gen-permissions`
  runs produce byte-identical output.
- **Snapshot accuracy (SQL).** Spot-check three tables and two
  functions: open the latest migration touching each, confirm the
  snapshot's claim matches the migration's post-state.
- **PR template integration (docs).** The new audit bullet is
  visible at PR-open time (renders in the GitHub PR creation
  form), and its wording is unambiguous about when it fires.
- **Backlog close-out (docs).** The Tier 5 entry at
  `docs/backlog.md` is removed, not just unchecked. This applies
  the same "leave the durable artifact in a terminal state in the
  same PR that implements the work" pattern the Plan-to-PR
  Completion Gate prescribes for plan Status flips. Verified by:
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  "Plan-to-PR Completion Gate" section.

## Documentation Currency PR Gate

Status-oriented doc surfaces updated in the implementing PR:

- `docs/plans/db-permissions-snapshot.md` — Decision section
  appended naming the chosen shape and linking to this plan.
- `docs/plans/db-permissions-snapshot-plan.md` — Status flipped
  from `In draft` (via `Proposed`) to `Landed` per the Plan-to-PR
  Completion Gate.
- `docs/backlog.md` — Tier 5 entry removed.
- `shared/db/README.md` — links to the new snapshot file.

## Out Of Scope

- A standardized C3 trailing-comment format on grant/policy
  migrations. Considered during plan drafting; dropped after a
  worked example showed it was a redundant third layer over
  inline migration prose that already documents post-state when
  authors are doing their job. The comment-quality expectation
  folds into the (2) self-review audit instead.
- Retroactive rewrite of existing migrations to add post-state
  prose where it's missing. Future migrations carry the
  expectation through the (2) audit; historical migrations are
  left as-written. The snapshot reaches the same reader anyway.
- De-duplicating overlapping grant assertions in the existing
  per-feature pgTAP files. The consolidated file is additive
  coverage. A cleanup pass is a candidate follow-up if review
  surfaces measurable noise from the duplication.
- Extending the snapshot to non-`public` schemas (`auth.*`,
  `storage.*`, etc.). The Supabase-managed schemas are out of our
  control surface; the snapshot covers the schema we own.
- A CI snapshot-drift gate (C1) or coverage gate (C2). Rejected at
  scoping time as overbearing for the repo's migration volume;
  B2's test layer + (2) self-review audit carry the weight.

## Risk Register

- **The snapshot regenerates non-deterministically across runs.**
  Mitigation: explicit `ORDER BY` clauses on every query in
  `dump-permissions.sql`; determinism is a Validation Gate
  bullet. If the issue surfaces during implementation, the root
  cause is almost always a missing sort key.
- **Author forgets to regenerate the snapshot after a
  grant-touching migration.** Mitigation: the PR-template self-
  review audit (2) is the primary check; reviewer enforcement at
  PR-review time is the secondary check. This follows the
  audit-vs-automation trade-off documented at
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — repo doctrine treats named audits and automated CI gates as
  alternatives, not supplements; an audit is dropped only when
  an automated check supersedes it. **B2's pgTAP does NOT catch
  this case**: B2 verifies pgTAP-vs-live-DB agreement, not
  snapshot-vs-live-DB agreement, so a stale snapshot with
  otherwise-correct pgTAP would pass B2 silently. Recovery path:
  a follow-up PR regenerates and commits the snapshot. Upgrade
  path: if migration volume grows to where audit-discipline
  fatigue becomes measurable, the documented next move is C1
  (CI snapshot-drift gate) per the catalog's drop rule.
- **A grant-touching migration ships with sparse or absent prose
  comments naming its post-state.** Mitigation: the same (2)
  audit covers the comment-quality expectation; reviewer
  enforcement at PR-review time is the secondary check. Recovery
  path: a follow-up PR amends the prose. Harm is bounded — B2's
  pgTAP failure is the safety net for state correctness (pgTAP
  asserts the live grant shape), separately from the prose-
  currency question.
- **A new public table or function lands without a corresponding
  section in `permissions.test.sql`.** Mitigation: the self-review
  audit for coverage uniformity is named explicitly above. If the
  audit is skipped, the gap is recoverable but the table's grants
  go unasserted until noticed.
- **The generator SQL emits markdown that GitHub renders
  awkwardly.** Mitigation: implementation step 2 verifies the
  emitted markdown renders cleanly in the GitHub preview before
  committing. If issues surface, the fix is in the SQL's emit
  layer, not in the snapshot file (which is generated).
- **The B2 file's flat-verbose form becomes hard to maintain when
  a table is added.** ~12 new assertion lines per new table is
  the marginal cost. Mitigation: the cost is bounded and falls
  squarely on the author of the new-table migration, who is also
  the author of the snapshot regen.

## Backlog Impact

The Tier 5 `db` entry at
[`docs/backlog.md`](/docs/backlog.md) — "Current grants and RLS
policies are knowable without reading every migration in order" —
is removed in the implementing PR, applying the same "terminal
state in the same PR" pattern the Plan-to-PR Completion Gate at
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
prescribes for plan Status flips. The scoping doc and this plan
together become the durable record of the deliberation and
contract; the backlog entry is no longer load-bearing once the
implementation ships. Verified by: the backlog entry quoted is
the current text of the Tier 5 entry in
[`docs/backlog.md`](/docs/backlog.md).
