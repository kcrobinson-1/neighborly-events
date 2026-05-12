# DB Permissions Snapshot

## Status

Scoping investigation. Goal is to decide the class-of-solution
(generated artifact vs. CI gate vs. test-coverage tightening vs.
combination) before opening an implementation phase. The backlog
entry is at
[`docs/backlog.md` — Current grants and RLS policies are knowable without reading every migration in order](/docs/backlog.md).

## Goal

A maintainer can answer "what grants, RLS policies, RLS-enabled
flag, function `SECURITY DEFINER`/`INVOKER` setting, and function
`EXECUTE` grants are in force on table or function X today" by
reading a single in-repo source — not by walking every migration
in [`supabase/migrations/`](/supabase/migrations/) in order and
mentally applying the delta from later migrations.

This goal is **reader-facing**, not correctness-facing. The
current pgTAP test layer (see "Current State" below) already
encodes the correct post-revision state for tables it covers; the
problem is that a reader who needs to know "what is true for X
today" has no single navigable surface to consult.

## Current State

What exists today:

- **Row shapes** are captured by `shared/db/types.ts`, regenerated
  by `npm run db:gen-types` (see
  [`package.json`](/package.json) `db:gen-types` script). 769 lines
  at this writing, covers all `public` schema row types.
- **Migrations** under
  [`supabase/migrations/`](/supabase/migrations/) — 35 files at
  this writing, with grants/revokes, policy creates/drops, and
  function-grant changes layered across them. Counted occurrences:
  ~78 `grant`/`revoke` touches, ~53 `create policy`/`drop policy`
  touches, ~32 `security definer`/`security invoker` touches.
- **pgTAP tests** under [`supabase/tests/database/`](/supabase/tests/database/)
  use `has_table_privilege` and `pg_policies` queries to assert
  expected grants and policies for the tables they cover —
  [`game_authoring_phase2_auth.test.sql`](/supabase/tests/database/game_authoring_phase2_auth.test.sql),
  [`game_authoring_phase3_publish_failure_permissions.test.sql`](/supabase/tests/database/game_authoring_phase3_publish_failure_permissions.test.sql),
  [`newsletter_opt_in_log.test.sql`](/supabase/tests/database/newsletter_opt_in_log.test.sql),
  [`feedback_tables.test.sql`](/supabase/tests/database/feedback_tables.test.sql),
  [`submit_feedback_rpc.test.sql`](/supabase/tests/database/submit_feedback_rpc.test.sql).

What does not exist today:

- A single per-table inventory of current grants and policies.
- Uniform pgTAP coverage across all tables — some tables have
  comprehensive privilege assertions, others have none.
- Function-`EXECUTE`-grant inventory across all SECURITY DEFINER /
  INVOKER functions.
- An RLS-enabled-flag inventory naming every `public.*` table
  with its current `enable row level security` state.

## Concrete Failure Case

The feedback feature's anon-write posture changed across two
migrations. The original
[`20260506000000_add_feedback_tables.sql`](/supabase/migrations/20260506000000_add_feedback_tables.sql)
granted `INSERT` on `public.feedback_submissions` to `anon` and
added an `anon can insert feedback for registered events` policy.
The later
[`20260509000000_add_submit_feedback_rpc.sql`](/supabase/migrations/20260509000000_add_submit_feedback_rpc.sql)
revoked the `INSERT` grant from `anon`, dropped the policy, and
routed the write through a SECURITY DEFINER RPC. A reader who
opens the original migration in isolation sees the pre-revocation
shape; the truth lives in both files together.

The post-revision state IS asserted in pgTAP at
[`feedback_tables.test.sql:342`](/supabase/tests/database/feedback_tables.test.sql:342)
(`not has_table_privilege('anon', 'public.feedback_submissions', 'INSERT')`)
and at
[`submit_feedback_rpc.test.sql:54`](/supabase/tests/database/submit_feedback_rpc.test.sql:54).
So the tests are up to date — the gap is that a doc author asking
"what's the current shape" naturally opens the migration named for
the feature, not the named-per-rollout-phase test file.

This failure mode has already produced doc inaccuracies during
canonical-correction passes (the feedback RLS posture and the
event-code lock were described in pre-revision shapes for the
same reason).

## What's Settled

- **Migrations remain the authoritative changelog.** Whatever
  surface this work produces, it does not replace the migration
  series — the migrations are the durable history of how state
  got to where it is.
- **`shared/db/types.ts` remains row-shape-only.** Extending the
  Supabase-CLI-generated types file with non-row-shape content is
  out of scope; this work produces a sibling artifact or runtime
  helper, not modifications to the generated types.

## Options To Compare

Decompose each option into sub-shapes before scoring (per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Decompose options into shapes before analyzing"). The candidate
sub-shapes below are the starting set; the scoping pass that
picks this up may decompose further.

### Class A: Generated artifact sibling to `types.ts`

- **A1: Markdown snapshot.** A generated `shared/db/permissions.snapshot.md`
  with per-table sections listing `(role, privilege)` rows,
  per-table RLS-enabled flag, per-table policy list with `USING`
  and `WITH CHECK` predicate text, and a per-function section
  listing `SECURITY DEFINER`/`INVOKER` plus `EXECUTE` grants.
  Reviewable in PR diffs as plain text; the diff for a migration
  that revokes a grant shows the revocation as a removed line.
- **A2: TypeScript snapshot.** A generated
  `shared/db/permissions.snapshot.ts` exporting typed values for
  the same content. Importable by code that wants to assert
  against expected state at runtime, but heavier review surface
  than markdown and not naturally human-readable.
- **A3: Filtered SQL dump.** Output of `pg_dump --schema-only`
  filtered to grants, policies, and `SECURITY` clauses. Closest
  to migration syntax, so reviewable by readers already fluent in
  the migration shape, but verbose and includes ordering noise.

Common shape of Class A: the artifact is regenerated by running a
script against a fresh local DB after applying all migrations,
committed to the repo, and reviewed in the PR that introduces the
migration. Drift is detectable by a CI check (Class C).

### Class B: Runtime helper

- **B1: On-demand script.** An `npm run db:dump-permissions`
  command that queries the connected database via `pg_policies`,
  `information_schema.role_table_grants`, `pg_proc.prosecdef`, and
  `has_function_privilege`, and prints a human-readable inventory.
  Useful for live inspection but doesn't address the "reader on
  GitHub" failure case — a reader still needs to spin up a local
  DB to see the truth.
- **B2: Comprehensive pgTAP coverage.** Add a uniform per-table
  pgTAP test file that asserts the full grant + policy + RLS-
  enabled shape for every `public.*` table, plus a per-function
  test asserting `SECURITY` mode and `EXECUTE` grants. A reader
  navigating to `permissions.test.sql` could read the current
  expected shape from one file. Coverage gaps surface as missing
  assertions, not migrations.

### Class C: CI / migration gate

- **C1: Snapshot-drift gate.** A CI check that fails when a
  migration lands without an updated Class A artifact. Assumes a
  Class A artifact exists.
- **C2: Coverage gate.** A CI check that fails when a migration
  touches `grant`, `revoke`, `create policy`, `drop policy`, or
  function `SECURITY` mode without a matching pgTAP test update.
  Assumes a Class B coverage layer exists.
- **C3: Per-migration self-describing summary.** A convention
  that every migration touching grants/policies includes a
  trailing comment naming the final state (not the delta) for
  the affected tables and functions. No new tooling, but
  enforcement is by reviewer discipline, not by gate.

### Combinations to consider

- **A1 + C1** is the natural pair if reviewable text is the
  primary goal. The artifact is reviewable; the gate keeps it
  current.
- **B2 + C2** is the natural pair if tighter test coverage is
  the primary goal. The pgTAP tests become the readable source.
- **A1 + B2 + C1** layers both readability and test coverage.
  Heavier, but the markdown snapshot serves human readers and
  pgTAP coverage serves automated assertions.

## What To Investigate

Steps for the scoping session that picks this up:

1. **Confirm the dominant reader audience.** "Reader on GitHub
   doing doc canonicalization," "agent answering a contributor
   question without a local DB," and "implementer adding a new
   migration who wants to see prior shape" each weight the
   options differently. Identify which is the primary case before
   scoring.
2. **Audit current pgTAP grant-assertion coverage.** Walk every
   `public.*` table and every `public.*` SECURITY DEFINER /
   INVOKER function. For each, identify whether grants, policies,
   RLS-enabled, and `EXECUTE`-grant assertions exist in
   [`supabase/tests/database/`](/supabase/tests/database/). Output
   is a coverage matrix; this determines how much of the gap is
   "no readable surface" vs. "no test coverage at all." If
   coverage turns out to be near-complete and the gap is purely
   readability, Class A weighs heavier; if coverage is patchy,
   Class B carries its own value before any artifact decision.
3. **Evaluate Class A sub-shapes against a generator.** Pick one
   table and one function; sketch what each of A1, A2, A3 would
   produce. Score on: review diff readability when a grant
   changes, drift risk when manually edited, and generator
   complexity. The sketch is the deliverable, not deep
   implementation.
4. **Decide single-shape or combination.** Default to a single
   shape unless the audit in step 2 surfaces a coverage gap that
   a single-shape solution cannot close.
5. **Record decision in this doc.** Append a "Decision" section
   naming the chosen shape and rationale; the implementation
   moves to a sibling plan doc (cross-cutting plan, not phase) or
   directly to a PR depending on size.

## Out Of Scope

- Extending `shared/db/types.ts` itself. The Supabase CLI owns
  that file's shape; this work produces a sibling artifact or a
  separate tooling layer, not modifications to the generated row
  types.
- Replacing the migration series as the source of truth for how
  state evolves. The migrations remain the durable history.
- Generating runtime documentation for the admin UI. This is
  contributor-facing infrastructure, not product surface.
- Sweeping past doc inaccuracies caused by this failure mode.
  Canonical-correction passes that touched documents in those
  shapes are already merged; this scoping pass produces tooling
  to prevent the next round, not retroactive corrections.

## Cap

~3 hours of scoping work for the session that picks this up. Stop
and record the decision once the dominant reader audience (step 1)
and the pgTAP coverage shape (step 2) are named — those two
inputs are the load-bearing signal, and continued sketching of
artifact shapes past that point tends to produce diminishing
returns.

## Risk Register

- **Scoping picks a shape that the implementing session has to
  re-decompose.** Mitigation: the "Decompose options into shapes"
  rule is named explicitly in the Options section above, and step
  3 of the investigation requires a concrete sketch before
  locking the candidate.
- **Implementation produces an artifact that nobody reads.** A
  generated markdown file that lives in `shared/db/` but isn't
  linked from natural reading paths fails the user-observable
  goal even if it is technically correct. Mitigation: the
  implementing plan must name where the artifact is linked from
  (CLAUDE.md, the `shared/db/README.md`, the migrations directory
  README if one is added) and the linkage is part of the
  validation gate, not a follow-up.
- **Coverage gate (C2) produces false positives on cosmetic
  migrations.** A migration that renames a table reissues grants
  but doesn't change the effective grant shape; a naive gate
  would flag this. Mitigation: if Class C2 is chosen, scope the
  gate's trigger conditions in the implementing plan rather than
  using a coarse grep.
- **The runtime helper (B1) gets adopted as the primary surface
  and the readability goal silently shifts to "you can query the
  DB."** A maintainer who can't spin up a local DB has not
  recovered the original goal. Mitigation: if Class B1 is chosen
  as part of a combination, it serves the generator (A) or the
  test coverage (B2), not the reader.
