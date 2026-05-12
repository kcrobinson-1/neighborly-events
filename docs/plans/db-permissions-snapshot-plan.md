# DB Permissions Snapshot — Implementation Plan

## Status

In draft.

## Context

Sibling to the scoping investigation at
[`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md).
The scoping pass settled on a three-layer shape with a self-review
audit binding it together:

- **B2** (comprehensive pgTAP coverage) — a single `permissions.test.sql`
  asserts the current expected state for every `public.*` table and
  function.
- **A1** (markdown snapshot) — a generated
  `shared/db/permissions.snapshot.md` is the human-readable per-table
  inventory, regenerated from a local DB.
- **C3** (per-migration trailing comment) — migrations touching
  grants, policies, RLS-enabled, or function `SECURITY` mode include
  a trailing comment naming the post-migration end state for affected
  tables and functions.
- **(2)** (self-review audit) — the PR template carries an audit
  reminding the migration author to regenerate the snapshot and
  write the C3 comment when their migration touches the
  grant/policy surface.

C1 (CI snapshot-drift gate) and C2 (CI coverage gate) were
considered and rejected as overbearing for the repo's migration
volume; B2's test failures are the safety net for state drift, and
(2) carries the doc-currency layer through reviewer discipline.

This plan is the cross-cutting implementation contract that the
implementing PR consumes. It is not part of an epic.

## Goal

After this plan lands, a maintainer can answer "what grants, RLS
policies, RLS-enabled flag, function `SECURITY` mode, and function
`EXECUTE` grants are in force on table or function X today" by
reading either of two single in-repo sources — the markdown
snapshot at `shared/db/permissions.snapshot.md` (when they want the
full inventory) or the trailing comment in the most recent
migration touching X (when they have a specific migration open).

The pgTAP suite at `supabase/tests/database/permissions.test.sql`
becomes the machine-verifiable source of truth for the same state,
so divergence between the live schema and what the snapshot claims
surfaces as a test failure, not as silent doc drift.

## Cross-Cutting Invariants

Three invariants thread through the three artifacts and bind them
to the same end state:

- **The pgTAP test, the markdown snapshot, and the C3 trailing
  comment on the latest migration touching X all describe the same
  post-state for X.** None of the three is authoritative over the
  other; they are three views of the live DB schema after migrations
  apply. Any disagreement is a bug.
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
  [`package.json`](/package.json).
- **C3 trailing-comment marker:** every migration touching grants,
  policies, RLS-enabled, or function `SECURITY` mode ends with a
  `-- Permissions after this migration:` section listing the
  affected tables and functions with their post-state. Standardized
  format defined in the Contracts section below.

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
   shape (currently the only public view).

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

### C3 trailing-comment format

Standard format every grant/policy/SECURITY-touching migration
ends with:

> `-- Permissions after this migration:`
>
> `-- public.<table_or_function>: <one-line summary of grant/policy
> shape post-migration>`
>
> (one entry per affected table or function; long entries may wrap
> with hanging-indent continuation lines as in any SQL prose
> comment block)

The summary names the effective post-state, not the delta. For a
revoke migration, the line says "anon has no INSERT," not "INSERT
revoked from anon."

The comment is human-prose and not parsed by tooling — its job is
reader orientation, not machine verification. B2's pgTAP layer is
the machine-verifiable source.

**Worked example shipping with this plan.** The C3 block on
[`supabase/migrations/20260509000000_add_submit_feedback_rpc.sql`](/supabase/migrations/20260509000000_add_submit_feedback_rpc.sql)
is a single illustrative application of this format — applied to
the migration the scoping doc cites as the concrete failure case
(the one that revoked anon's `INSERT` on `feedback_submissions`
and added the SECURITY DEFINER RPC). Reviewers can read the
worked example alongside the format contract above to confirm the
shape is what the plan describes. The example is the only
retroactive C3 application this plan ships; the rest of the
existing migrations remain untouched per the Out Of Scope rule
below.

### `.github/pull_request_template.md` self-review addition

A new audit bullet under the existing Validation section (or a
sibling self-review section if one is added). Wording:

> If this PR includes a migration that touches grants, policies,
> RLS-enabled, or function `SECURITY` mode: I regenerated
> `shared/db/permissions.snapshot.md` via `npm run db:gen-permissions`,
> wrote the `-- Permissions after this migration:` trailing comment
> in the migration body, and the diff in `permissions.snapshot.md`
> matches what the migration changed.

## Files to touch — new

Estimate of new files the implementation will produce. The
implementer may adjust if a structural call requires it.

- `supabase/tests/database/permissions.test.sql` — the B2 pgTAP file.
- `shared/db/permissions.snapshot.md` — the A1 generated artifact.
- `scripts/db/dump-permissions.sql` — the generator SQL.

## Files to touch — modify

Estimate of files the implementation will modify.

- `package.json` — add `db:gen-permissions` npm script.
- `.github/pull_request_template.md` — add the (2) self-review
  audit bullet.
- `shared/db/README.md` — link to the new snapshot file with a
  one-sentence pointer.
- `docs/backlog.md` — close out the Tier 5 entry once the plan
  lands; the entry's removal is part of the implementing PR per
  the "Close out tracking surfaces in the implementing PR" rule.
- `docs/plans/db-permissions-snapshot.md` — append a Decision
  section naming the chosen shape (B2 + A1 + C3 + audit) and
  pointing at this plan.

Touched in *this plan's PR* (not in the implementing PR):

- `supabase/migrations/20260509000000_add_submit_feedback_rpc.sql`
  — apply the C3 trailing-comment format to this single
  migration as a worked example shipping alongside the plan
  contract. The format is what the plan describes; the worked
  example is one concrete instance for reviewers to inspect.

## Files intentionally not touched

Estimate of files the implementation does not need to touch.

- The 35 existing migrations under `supabase/migrations/`. C3 is
  forward-looking — backfilling trailing comments to historical
  migrations adds toil for limited benefit, since the snapshot
  reaches the same reader. New migrations from this point forward
  carry the C3 comment per the PR-template audit.
- `shared/db/types.ts`. Row shapes remain owned by `db:gen-types`;
  this work produces a sibling permission artifact, not an
  extension to types.
- The existing per-feature pgTAP files
  (`game_authoring_phase{2,3,5_1}_*.test.sql`,
  `feedback_tables.test.sql`, etc.). The consolidated
  `permissions.test.sql` is additive coverage, not a replacement.
  De-duplicating overlapping grant assertions in the per-feature
  files is deferred to a follow-up cleanup PR if it surfaces
  signal at review.

## Execution Steps

Estimate of the order the implementing PR will follow. The
implementer may resequence if a structural call requires.

1. **Coverage audit.** Walk
   [`shared/db/types.ts`](/shared/db/types.ts) for the canonical
   table and function list; cross-reference against current pgTAP
   coverage. Output is the enumeration that step 2 consumes; no
   committed artifact at this step.
2. **Write the generator SQL.** `scripts/db/dump-permissions.sql`
   queries the introspection sources and emits markdown with
   deterministic ordering. Run against the local DB; verify output
   is stable across two consecutive runs.
3. **Generate and commit the initial snapshot.** Run
   `npm run db:gen-permissions` and commit
   `shared/db/permissions.snapshot.md`.
4. **Write `permissions.test.sql`.** One section per table, per
   function, per view, matching the snapshot's claims. Verify the
   test passes via `npm test`.
5. **Wire the npm script and self-review audit.** Add
   `db:gen-permissions` to `package.json`; add the audit bullet to
   `.github/pull_request_template.md`.
6. **Documentation pass.** Update `shared/db/README.md` to link
   the snapshot; append the Decision section to the scoping doc;
   close out the backlog entry; flip this plan's Status to Landed
   per the Plan-to-PR Completion Gate.

## Commit Boundaries

Estimate of the commit shape that produces a readable history.
Implementer may merge or split if a different boundary is clearer.

- **Commit 1:** Generator SQL + initial snapshot. The diff is
  the snapshot file alone (plus the script that produced it),
  reviewable as "what does our current state look like."
- **Commit 2:** `permissions.test.sql`. The diff is the test file
  alone, reviewable as "what we assert is true."
- **Commit 3:** PR template + npm script + README pointer +
  backlog entry close-out + scoping-doc Decision section + this
  plan's Status flip. The infrastructure and documentation pass.

## Validation Gate

Pre-merge checks the implementing PR must satisfy:

- `npm run db:gen-permissions` produces a deterministic snapshot
  (run twice; diff is empty).
- `npm run lint` passes.
- `npm test` passes — includes the new
  `supabase/tests/database/permissions.test.sql`.
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
  appears in both.
- **Determinism (SQL).** Two consecutive `npm run db:gen-permissions`
  runs produce byte-identical output.
- **Snapshot accuracy (SQL).** Spot-check three tables and two
  functions: open the latest migration touching each, confirm the
  snapshot's claim matches the migration's post-state.
- **PR template integration (docs).** The new audit bullet is
  visible at PR-open time (renders in the GitHub PR creation
  form), and its wording is unambiguous about when it fires.
- **Backlog close-out (docs).** The Tier 5 entry at
  `docs/backlog.md` is removed, not just unchecked. The entry's
  removal sequence matches the "Close out tracking surfaces in
  the implementing PR" rule.

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

- Backfilling C3 trailing comments to the existing migrations.
  The snapshot serves the same reader; backfill cost outweighs
  benefit at this volume. Exception: the single worked example
  on
  [`20260509000000_add_submit_feedback_rpc.sql`](/supabase/migrations/20260509000000_add_submit_feedback_rpc.sql)
  shipping with this plan PR — that is one illustrative
  application of the format, not the start of a backfill pass.
  Implementing-PR migrations from this point forward carry the
  C3 block per the PR-template audit.
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
- Automating the C3 comment shape via a parser. The comment is
  prose for reader orientation; machine verification lives in the
  B2 pgTAP layer.

## Risk Register

- **The snapshot regenerates non-deterministically across runs.**
  Mitigation: explicit `ORDER BY` clauses on every query in
  `dump-permissions.sql`; determinism is a Validation Gate
  bullet. If the issue surfaces during implementation, the root
  cause is almost always a missing sort key.
- **Author forgets to regenerate the snapshot after a
  grant-touching migration.** Mitigation: the PR-template self-
  review audit (2) is the primary check. Recovery path: a
  follow-up PR regenerates and commits the snapshot. The harm is
  bounded — B2's pgTAP failure surfaces state divergence the same
  PR.
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
  the author of the corresponding C3 comment and snapshot regen.

## Backlog Impact

The Tier 5 `db` entry at
[`docs/backlog.md`](/docs/backlog.md) — "Current grants and RLS
policies are knowable without reading every migration in order" —
is removed in the implementing PR per the "Close out tracking
surfaces in the implementing PR" rule. The scoping doc and this
plan together become the durable record of the deliberation and
contract; the backlog entry is no longer load-bearing once the
implementation ships.
