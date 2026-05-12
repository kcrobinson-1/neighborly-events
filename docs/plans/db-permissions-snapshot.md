# DB Permissions Snapshot

## Status

Proposed.

## Context

Today a maintainer who wants to know "what grants, RLS policies,
RLS-enabled state, function `SECURITY` mode, and function `EXECUTE`
grants are in force on table or function X right now" has no single
in-repo source to consult. The migrations under
[`supabase/migrations/`](/supabase/migrations/) are the durable
changelog but read as a series of deltas: the truth for any object
is the layered result of every migration that touched it. This has
already produced doc inaccuracies during canonical-correction passes
where pre-revocation shapes were treated as current. The pgTAP suite
under [`supabase/tests/database/`](/supabase/tests/database/) encodes
the correct post-revision state for the tables it covers, but
coverage is feature-scoped rather than uniform across `public.*`, so
a reader can't rely on it as a navigable surface.

This plan lands a uniform per-object snapshot of the live `public`
schema's permissions posture (a human-readable markdown file sibling
to `shared/db/types.ts`), a uniform pgTAP suite that asserts the
same state, and a PR-template self-review audit that binds both
artifacts to grant- or policy-touching migrations. The scoping pass
at
[`docs/plans/scoping/db-permissions-snapshot.md`](/docs/plans/scoping/db-permissions-snapshot.md)
settled the class-of-solution choice (B2 + A1 + (2); C1/C2 CI gates
rejected; C3 trailing-comment format folded into the (2) audit's
comment-quality expectation). Now is the right time because the
canonical-corrections work
([`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md))
just landed several findings whose root cause was exactly this
missing surface.

This is an N = 1 task plan per
[`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md) "N = 1
task plan: phase content absorbed inline."

## Goal

A maintainer answers "what's in force on table or function X today"
by opening `shared/db/permissions.snapshot.md` and finding the answer
in that single file. The two drift axes the system catches and where
each catches them are stated in CCI-3 below; coverage scope,
determinism, and the audit-vs-automation choice are stated in CCI-1,
CCI-2, and CCI-4. Downstream sections cite the invariants by name
rather than restating.

## Cross-Cutting Invariants

Four invariants bind the snapshot, the pgTAP suite, the generator,
and the PR-template audit. Downstream sections cite by name; they do
not restate.

- **CCI-1 (coverage).** Both `permissions.snapshot.md` and
  `permissions.test.sql` cover the same object inventory and the
  same per-object content axes:
  - *Object inventory:* every `public.*` table, every callable
    `public.*` function (regardless of `SECURITY` mode, regardless
    of whether access flows through named-role grants or through
    `PUBLIC`), and every `public.*` view. Canonical source:
    [`shared/db/types.ts`](/shared/db/types.ts) `Tables:`,
    `Views:`, and `Functions:` blocks under `public:`.
  - *Per-table content:* RLS-enabled state; the grant matrix
    spanning every grantable privilege × every role; every active
    policy by exact name and predicate shape.
  - *Per-function content:* `SECURITY` mode; `EXECUTE` access per
    role.
  - *Per-view content:* the grant matrix spanning every grantable
    privilege × every role.
  Verified by: [`shared/db/types.ts`](/shared/db/types.ts)
  (Supabase-CLI generated; the row-shape source this snapshot is
  sibling to).

- **CCI-2 (determinism).** Two consecutive runs of
  `npm run db:gen-permissions` against the same DB state produce
  byte-identical output. Ordering, formatting, and
  presence/absence rules are load-bearing; the specific
  introspection sources and emission technique that satisfy this
  are implementer's call.

- **CCI-3 (two views, one state).** The snapshot and the pgTAP
  suite describe the same end state for every covered object;
  neither is authoritative over the other. The pgTAP suite catches
  drift between assertions and the live DB; the snapshot catches
  drift between committed inventory and the live DB at PR-author
  regeneration time. The third axis — snapshot vs. pgTAP without
  a live-DB run — is reached only by the (2) audit binding both
  regeneration steps to the same migration (see CCI-4).

- **CCI-4 (audit-vs-automation).** The PR-template (2) audit is
  the chosen mechanism for snapshot currency AND migration-prose
  comment quality on grant / policy / RLS-enabled / `SECURITY`-mode
  changes. C1 snapshot-drift and C2 coverage CI gates were
  considered at scoping time and rejected as overbearing for the
  repo's migration volume. Per
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  "Contributing," a named audit drops only when an automated check
  supersedes it; the (2) audit stays in place until measured
  audit-fatigue or migration-volume growth triggers the drop.
  Verified by:
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  "Contributing" (`Drop an audit when: An automated check (linter,
  type system, CI gate) now enforces it`).

## Naming

- **Snapshot:** `shared/db/permissions.snapshot.md`
- **pgTAP file:** `supabase/tests/database/permissions.test.sql`
- **Generator:** under `scripts/db/` (form is implementer's call)
- **npm script:** `db:gen-permissions` — mirrors the
  `db:gen-types` shape. Verified by:
  [`package.json`](/package.json) `db:gen-types` script.

## Contracts

Each contract is described at coverage altitude. Specific catalog
views, `has_*_privilege` calls, and command sequences are
implementer's call as long as the cited invariants hold.

### `shared/db/permissions.snapshot.md`

Generated markdown organized as one subsection per object covered
by CCI-1, surfacing the per-object content axes named in CCI-1 in
human-readable form. The file header names the generator script and
warns that manual edits are erased on regeneration. Output
satisfies CCI-2.

### `supabase/tests/database/permissions.test.sql`

Single consolidated pgTAP file with one assertion block per object
covered by CCI-1, asserting the per-object content axes named in
CCI-1. The file uses flat-verbose form — assertions written out per
`(role, target, privilege)` rather than generated through helpers —
and the specific pgTAP wrappers used are implementer's call.
Verified by:
[`supabase/tests/database/feedback_tables.test.sql`](/supabase/tests/database/feedback_tables.test.sql)
(existing per-feature pgTAP file demonstrating flat-verbose form
in this codebase).

### Generator under `scripts/db/`

Queries Postgres introspection sources sufficient to satisfy CCI-1
and emits markdown that satisfies CCI-2. The generator's form
(single SQL script invoked via psql, shell wrapper, TypeScript
helper, or layered approach) and the specific introspection sources
are implementer's call.

### `.github/pull_request_template.md` self-review (2) audit

A new bullet under the existing `## Validation` section. The bullet
binds both the snapshot-regeneration expectation AND the
migration-prose post-state-comment-quality expectation per CCI-4;
both fire on the same trigger (a migration touching grants, revokes,
policies, RLS-enabled, or function `SECURITY` mode). Verified by:
[`.github/pull_request_template.md`](/.github/pull_request_template.md)
`## Validation` section (existing surface this rule extends).

## Files to touch

The three lists below are **estimates** of expected scope per the
"Plan content is a mix of rules and estimates" rule in
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md);
the implementer adjusts if a structural call requires it, calling
out the deviation under the PR body's `## Estimate Deviations`
section per the Plan-to-PR Completion Gate.

### New

- `shared/db/permissions.snapshot.md`
- `supabase/tests/database/permissions.test.sql`
- A generator under `scripts/db/`

### Modify

- `package.json` — add `db:gen-permissions`.
- `.github/pull_request_template.md` — add the (2) audit bullet.
- `shared/db/README.md` — pointer to the snapshot.
- `docs/backlog.md` — Tier 5 entry removed per Backlog Impact.
- This plan — Status flipped to `Landed`.
- The scoping doc at
  [`docs/plans/scoping/db-permissions-snapshot.md`](/docs/plans/scoping/db-permissions-snapshot.md)
  — deleted per "Scoping owns / plan owns" (scoping deletes at the
  plan's terminal PR).

### Intentionally not touched

- Existing migrations under `supabase/migrations/`. The snapshot
  derives from the live DB after all migrations apply.
- [`shared/db/types.ts`](/shared/db/types.ts). Row shapes remain
  owned by `db:gen-types`; this work is a sibling artifact.
- Existing per-feature pgTAP files under
  `supabase/tests/database/`. The consolidated file is additive;
  de-dup is a follow-up if review surfaces measurable noise.

## Execution Steps

Each step names the contract-state transition the step must
produce; trajectory between transitions (command sequences,
catalog-view choices, file-write ordering) is implementer's call.

1. **Coverage inventory ready.** The object set in scope per CCI-1
   is enumerated from
   [`shared/db/types.ts`](/shared/db/types.ts) and consumed by
   later steps. No committed artifact.
2. **Generator satisfies CCI-1 and CCI-2.** The generator under
   `scripts/db/` exists, `db:gen-permissions` is wired in
   `package.json`, and a fresh run produces output covering every
   in-scope object and byte-identical to a second consecutive run.
3. **Initial snapshot committed.**
   `shared/db/permissions.snapshot.md` is the output of step 2 at
   the PR's HEAD migration set.
4. **pgTAP file satisfies CCI-1 and CCI-3.**
   `supabase/tests/database/permissions.test.sql` covers the same
   inventory and passes via the `test:db` runner.
5. **Contributor surfaces wired.** At PR-merge time, all hold:
   the (2) audit bullet is in the PR template per the audit
   contract; `shared/db/README.md` links the snapshot; the Tier 5
   entry in [`docs/backlog.md`](/docs/backlog.md) is removed; the
   scoping doc is deleted; this plan's Status is `Landed`.

## Commit Boundaries

Estimate of the commit shape that produces a readable history; the
implementer refines and calls out deviation under
`## Estimate Deviations`.

- **Snapshot generation** — generator + initial committed
  snapshot.
- **pgTAP coverage** — `permissions.test.sql`.
- **Contributor wiring** — npm script + PR-template audit + README
  pointer + backlog removal + scoping-doc deletion + Status flip.

## Validation Gate

Pre-merge checks; each cites the invariant it verifies.

- `npm run db:gen-permissions` run twice; second-run diff is empty
  (CCI-2).
- The committed snapshot equals a fresh `db:gen-permissions` run
  at HEAD (CCI-3's snapshot-vs-live-DB axis).
- `npm run test:db` passes (CCI-3's pgTAP-vs-live-DB axis). The
  pgTAP runner is the canonical entry point per
  [`scripts/testing/run-db-tests.cjs`](/scripts/testing/run-db-tests.cjs)
  (`logStep("Running pgTAP database tests")`); `npm test` (Vitest)
  does not run pgTAP. Verified by:
  [`package.json`](/package.json) `test:db` script and
  [`scripts/testing/run-db-tests.cjs`](/scripts/testing/run-db-tests.cjs)
  `logStep("Running pgTAP database tests")`.
- `npm run lint`, `npm test`, `npm run test:functions`, and
  `npm run build:web` pass (baseline gates from
  [`.github/pull_request_template.md`](/.github/pull_request_template.md)
  `## Validation`).

## Self-Review Audits

Audits the implementer runs at commit boundaries per the
"Planning Depth" rule in
[`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md).

- **Coverage uniformity (SQL).** Sections in the snapshot equal
  sections in the pgTAP file equal the
  [`shared/db/types.ts`](/shared/db/types.ts) inventory. Verifies
  CCI-1.
- **Determinism (SQL).** Second-run diff is empty per Validation
  Gate. Verifies CCI-2.
- **Snapshot accuracy spot-check (SQL).** Three tables + two
  functions: latest migration touching each matches the
  snapshot's claim. Verifies CCI-3.
- **PR-template audit wording (docs).** The new bullet renders
  inside the GitHub PR creation form; its trigger clause is
  unambiguous. Verifies the audit contract.
- **Backlog close-out (docs).** Tier 5 entry at
  [`docs/backlog.md`](/docs/backlog.md) removed (not unchecked)
  per the terminal-state rule in the Plan-to-PR Completion Gate.

## Documentation Currency PR Gate

Status-oriented surfaces updated in the implementing PR:

- This plan — Status `Landed`.
- [`docs/backlog.md`](/docs/backlog.md) — Tier 5 entry removed.
- [`shared/db/README.md`](/shared/db/README.md) — snapshot pointer
  added.
- [`docs/plans/scoping/db-permissions-snapshot.md`](/docs/plans/scoping/db-permissions-snapshot.md)
  — deleted.

## Out Of Scope

- A standardized C3 trailing-comment format. Folded into the (2)
  audit's comment-quality expectation per CCI-4.
- Retroactive rewrite of historical migrations to backfill
  post-state prose.
- De-duplicating overlapping grant assertions in existing
  per-feature pgTAP files.
- Extending the snapshot to non-`public` schemas (`auth.*`,
  `storage.*`).
- CI snapshot-drift (C1) or coverage (C2) gates per CCI-4.

## Risk Register

Each risk names the invariant whose violation produces the harm and
the mitigation surface that catches it.

- **Generator output is non-deterministic.** Harm: CCI-2 fails.
  Mitigation: the determinism audit + the second-run-diff check
  under Validation Gate; the root cause is almost always a missing
  sort key.
- **Migration author forgets to regenerate the snapshot.** Harm:
  CCI-3's snapshot-vs-live-DB axis drifts silently — the pgTAP
  file may still pass against a live DB that no longer matches the
  snapshot. Mitigation: the (2) audit per CCI-4 (primary) and
  reviewer enforcement (secondary). Escalation path if measured
  audit-fatigue surfaces: the audit-to-automation drop rule in
  CCI-4 names C1 as the next move.
- **Grant-touching migration ships with sparse post-state prose
  comments.** Harm: CCI-4's comment-quality half isn't satisfied.
  Mitigation: same (2) audit. CCI-3's pgTAP layer is the safety
  net for state correctness, bounding harm.
- **A new public table or function lands without a corresponding
  section.** Harm: CCI-1 fails. Mitigation: the coverage-uniformity
  audit under Self-Review Audits.
- **Generator emits markdown that GitHub renders awkwardly.**
  Harm: CCI-1 coverage is technically met but reader-facing value
  degrades. Mitigation: visual check of the rendered output before
  committing the initial snapshot (step 3).
- **Flat-verbose pgTAP form becomes maintenance-heavy.** Harm:
  per-table marginal cost on new-table migrations. Mitigation:
  bounded cost (~12 assertion lines per new table per the current
  per-feature pattern) borne by the migration author — same author
  who runs the (2) audit.

## Backlog Impact

The Tier 5 `db` entry at
[`docs/backlog.md`](/docs/backlog.md) — "Current grants and RLS
policies are knowable without reading every migration in order" —
is removed in the implementing PR per the Plan-to-PR Completion
Gate's terminal-state rule. The durable record lives in this plan;
the (transient) scoping doc deletes alongside.
