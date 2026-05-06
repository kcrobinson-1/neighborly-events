# M1 phase 1.1 — DB foundation: feedback tables and `madrona` registry seed

## Status

Proposed. This is a planning-only PR landing the scoping doc and
this plan doc; the migration + types regeneration + validation
gate run + Phase Status flip to `Landed` happen in a follow-up
implementing PR per the
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
Plan-to-PR Completion Gate.

## Context

Attendees who finish a Madrona '26 show have nowhere to tell the
organizer how it went. The Madrona feedback child epic builds the
form and storage that closes that gap; this phase ships the
storage half — a single Supabase migration that creates two new
tables, locks the row-level security that gates them, and seeds
`madrona` into the registry that makes the FK constraint
load-bearing from the moment the migration applies.

The phase is doing this *now* because the feedback child epic's
M1 sequencing graph puts data-layer foundations ahead of the type
extensions (1.2) and the form route (1.3); the form in 1.3 cannot
ship before the migration without forcing application-layer-only
enforcement of the integrity invariant the epic explicitly
forbids. The phase 1.1 / 1.2 split is independent (Supabase-only
vs. apps/site-only); 1.3 depends on both.

The surfaces this touches at the conceptual level: a Supabase
migration file (new), the generated TypeScript types
(`shared/db/types.ts`), and the parent milestone doc's Phase
Status row. No application code changes, no client-side surface,
no route. After the migration applies, the database accepts
anonymous inserts of feedback rows for `madrona` (and rejects
inserts against any other slug), and authenticated organizers /
root admins can read them — but no client surface reaches that
write or read path until phase 1.3 ships the form.

The deliberation behind the calls below — RLS predicate shape,
column types, CHECK constraints, registry seed location, single-file
migration shape, generated-types regeneration — lives in
[`scoping/m1-phase-1-1.md`](/docs/plans/epics/madrona-feedback/scoping/m1-phase-1-1.md).
That doc deletes in batch with sibling scoping docs at the M1
milestone-terminal PR.

## Goal

After this PR:

- a single migration file
  `supabase/migrations/<timestamp>_add_feedback_tables.sql` lives
  in `supabase/migrations/` (`<timestamp>` derived
  monotonically-after the latest migration on `main` at
  implementation time);
- the migration creates `public.feedback_enabled_events` (slug PK
  + `enabled_at` timestamp) and `public.feedback_submissions`
  (uuid PK, FK to the registry, ratings jsonb, free text, email
  pair with decline flag, newsletter opt-in flag, two CHECK
  constraints encoding the milestone-level invariants on consent
  posture);
- row-level security is enabled on both tables, with the policy
  set described in this plan's Contracts section: anon insert on
  submissions, organizer-or-admin read on submissions
  (predicate joins through `game_events` to resolve slug → id),
  organizer-or-admin read on registry, all other operations
  default-denied;
- `('madrona')` is inserted into `feedback_enabled_events` as the
  final step of the same migration so the FK is satisfied for
  Madrona from the moment the migration applies;
- `shared/db/types.ts` is regenerated against the new schema and
  committed; `npm run lint` and `npm run build:web` pass against
  the regenerated types;
- the migration has been applied locally and exercised by the
  validation gate (per-test details in this plan's Validation
  Gate); production application is the post-merge step the
  project's standard migration runbook covers, not this PR's
  scope;
- the M1 milestone doc's Phase Status row 1.1 flips to `Landed`
  and the PR link is recorded; no other Phase Status row moves.

This phase does **not** add any client code (form, route, or
section component — 1.2 / 1.3 scope), does **not** opt feedback
in on `apps/site/events/madrona.ts` (1.3 scope), does **not**
extend `EventContent` (1.2 scope), does **not** introduce
captcha / rate-limiting / dedupe (epic-level Resolved Decision),
does **not** assign organizer or agent roles for `madrona` to any
user (operational step covered by the existing role-assignment
runbook, not this plan), and does **not** introduce a
`is_organizer_for_event_by_slug` helper (rejected in scoping
Decision 1; deferred to the second use-case if one surfaces).

## Cross-Cutting Invariants

This phase binds the six parent-epic invariants
([epic.md:106-177](/docs/plans/epics/madrona-feedback/epic.md))
and the five M1 milestone-level invariants
([m1-form-and-storage-mvp.md:229-296](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md))
verbatim by reference; self-review walks each against this PR's
diff. Of those, the invariants this phase's diff actually moves
on:

- **Epic Invariant 6 (DB-level integrity from the first write).**
  The FK from `feedback_submissions.event_slug` to
  `feedback_enabled_events(slug)` lands inline in the same
  migration as both tables. Insert against an unregistered slug
  fails at the database, not only at application layer.
- **Milestone invariant: DB-level integrity from the first write.**
  Same shape as epic Invariant 6; restated at milestone level
  because phase 1.1's migration is what makes it true.
- **Milestone invariant: Newsletter opt-in is opt-in, not
  opt-out, and the consent context is stored alongside the
  submission.** The schema's `newsletter_opt_in boolean default
  false` plus the CHECK constraint binding it to a non-null,
  non-declined email plus the always-stored `submitted_at` and
  `event_slug` columns are the schema half of this invariant
  (the form is the other half, in 1.3).
- **Milestone invariant: Submit-without-email is a first-class
  path.** The `email_declined` column plus the CHECK constraint
  binding declined-implies-null-email are the schema half (form
  is 1.3).

The other M1 milestone invariants (test events render
byte-for-byte unchanged; disabled-event behavior is render-friendly,
not 404) are not exercised by this phase's diff.

## Naming

- Tables: `public.feedback_enabled_events`, `public.feedback_submissions`.
- FK column: `feedback_submissions.event_slug`.
- CHECK constraint names (explicit so error messages are
  diagnosable):
  `feedback_submissions_email_declined_implies_null_email`,
  `feedback_submissions_newsletter_opt_in_requires_email`.
- Index: `feedback_submissions_event_slug_submitted_at_idx`.
- RLS policy names:
  `"anon can insert feedback for registered events"` (insert),
  `"organizers and admins can read event feedback"` (select on
  submissions),
  `"organizers and admins can read feedback registry"` (select
  on registry).

The policy-name shape follows the redemption-RLS migration's
human-readable convention (`Verified by:`
[supabase/migrations/20260421000500_add_redemption_rls_policies.sql:16](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql)
for the `"assigned operators can read event entitlements"` style
that admits role-OR-admin in one policy).

## Contracts

### `feedback_enabled_events` (registry, FK target)

Columns:

- `slug text primary key`
- `enabled_at timestamptz not null default now()`

Grants and RLS:

- RLS enabled.
- `revoke all on table public.feedback_enabled_events from anon, authenticated;`
- `grant select on table public.feedback_enabled_events to authenticated;`
- Policy `"organizers and admins can read feedback registry"`
  on `select` to `authenticated` using
  `public.is_organizer_for_event((select id from public.game_events where slug = slug)) or public.is_root_admin()`.
  (Note the column reference `slug` here is `feedback_enabled_events.slug`;
  the policy body must qualify or alias the row reference if
  Postgres surfaces ambiguity at apply time. The plan's
  implementer audits this against the actual SQL parser
  diagnostic; one reasonable alias shape is
  `(select id from public.game_events ge where ge.slug = feedback_enabled_events.slug)`.)
- No insert / update / delete policies — service-role bypass
  handles registry seeding via migrations.

### `feedback_submissions` (FK holder)

Columns:

- `id uuid primary key default gen_random_uuid()`
- `event_slug text not null references public.feedback_enabled_events (slug) on delete restrict`
- `submitted_at timestamptz not null default now()`
- `ratings jsonb not null`
- `free_text text`
- `email text`
- `email_declined boolean not null default false`
- `newsletter_opt_in boolean not null default false`

Constraints:

- `constraint feedback_submissions_email_declined_implies_null_email check (email_declined = false or email is null)`
- `constraint feedback_submissions_newsletter_opt_in_requires_email check (newsletter_opt_in = false or (email is not null and email_declined = false))`

Index:

- `create index feedback_submissions_event_slug_submitted_at_idx on public.feedback_submissions (event_slug, submitted_at desc);`

Grants and RLS:

- RLS enabled.
- `revoke all on table public.feedback_submissions from anon, authenticated;`
- `grant insert on table public.feedback_submissions to anon;`
- `grant select on table public.feedback_submissions to authenticated;`
- Policy `"anon can insert feedback for registered events"`
  on `insert` to `anon` with `with check (true)`. The FK
  enforces "must be a registered slug"; no other application-layer
  check is added at the policy level because the form's submission
  shape is already application-validated and any extra check
  here would silently re-foreclose Invariant 3 (rating-dimension
  keys are content-authored, no enum the policy could validate
  against).
- Policy `"organizers and admins can read event feedback"` on
  `select` to `authenticated` using
  `public.is_organizer_for_event((select id from public.game_events ge where ge.slug = event_slug)) or public.is_root_admin()`.
- No update / delete policies — submissions are immutable from
  the application surface; service-role can purge via direct SQL
  if abuse surfaces (epic-level accepted risk).

### Registry seed

```
insert into public.feedback_enabled_events (slug)
values ('madrona')
on conflict (slug) do nothing;
```

Idempotent under re-run via `on conflict do nothing`.

## Files To Touch

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Plan content is a mix of rules and estimates"; the implementer
may deviate with rationale recorded as an Estimate Deviation.

### New

- `supabase/migrations/<timestamp>_add_feedback_tables.sql` —
  the single migration file containing both tables, RLS, policies,
  index, and the `madrona` seed insert per the Contracts section
  above.

### Modify

- `shared/db/types.ts` — regenerated to include the two new
  tables. The diff is the entire generated-types output for the
  new tables; the file's header continues to name it as
  auto-generated.
- `docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md` —
  Phase Status row 1.1 flips to `Landed` with the PR link. No
  other rows move; the milestone-level Status stays `Proposed`
  (the milestone-terminal PR flips to `Landed`).

### Intentionally not touched

- `apps/site/events/madrona.ts` — feedback opt-in is 1.3 scope.
- `apps/site/lib/eventContent.ts` — `feedback?` shape extension
  is 1.2 scope.
- `apps/site/components/event/EventLandingPage.tsx` — section
  composition change is 1.2 scope.
- `apps/web/vercel.json` — the existing `noindex` header on
  `/event/madrona/:path*` already covers the future
  `/event/madrona/feedback` path; no change.
- `docs/architecture.md`, `docs/product.md`, etc. — milestone-doc
  owner mapping puts these later; phase 1.1's plan re-verifies
  by grep at implementation time per the Documentation Currency
  PR Gate below.

## Execution Steps

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md);
the implementer may deviate with rationale recorded as an
Estimate Deviation.

1. Pull `main`. Verify the latest migration timestamp under
   `supabase/migrations/` and pick a strictly-greater prefix for
   the new file. Verify scoping doc reality-check inputs (helper
   signatures, `game_events` shape) have not drifted; if any
   has, update the scoping doc and this plan in the same PR.
2. Write the migration file per the Contracts section. Open with
   a leading comment block per project convention naming the
   epic / milestone / phase, the table set, and the load-bearing
   constraints. Include explicit GRANT / REVOKE statements per
   role.
3. Apply the migration locally against the project's Supabase
   Docker stack via the canonical wrapper. `npm run test:db`
   resets the local stack and applies migrations end-to-end as
   part of running pgTAP tests (`Verified by:`
   [scripts/testing/run-db-tests.cjs:42-58](/scripts/testing/run-db-tests.cjs)
   for the `ensureDockerRuntime` → `resetLocalSupabaseDatabase`
   → `runSupabase(["test", "db"])` sequence); the implementer
   may run that wrapper or the lower-level `supabase db reset`
   directly during iteration, but the validation gate uses the
   wrapper.
4. Regenerate `shared/db/types.ts` against the local-applied
   schema via `npm run db:gen-types` (`Verified by:` the
   `package.json` `scripts` entry that wraps
   `supabase gen types typescript --local --schema public > shared/db/types.ts`).
5. Run the validation gate (per Validation Gate section).
6. Run `npm run lint` and `npm run build:web` to confirm the
   regenerated types compile against existing code.
7. Update the milestone doc's Phase Status row 1.1: flip Status
   to `Landed`, add the PR link.
8. Commit, push, open PR using the project's PR template.

## Commit Boundaries

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md);
the implementer may deviate with rationale recorded as an
Estimate Deviation.

Two commits:

1. **`feat(db): add feedback_enabled_events + feedback_submissions tables`**
   — the migration file plus the regenerated `shared/db/types.ts`
   diff. Body explains the integrity invariant, the RLS posture,
   and the `madrona` seed.
2. **`docs(plans): flip M1 phase 1.1 status to Landed`** — the
   milestone-doc Phase Status row update. Separate commit because
   it is the close-out flip per the Plan-to-PR Completion Gate,
   distinct from the substrate change.

A reviewer-feedback fix-up commit (if any) lands as a third
commit, kept distinct per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"keep review-fix commits distinct."

## Validation Gate

The migration's load-bearing claims are constraint enforcement
(FK, two CHECKs) and policy enforcement (anon insert path, auth
read path, anon read denial on registry). Validation must
exercise each.

The plan-time call: run a focused SQL test against the
local-applied migration that:

1. Inserts a `feedback_submissions` row with `event_slug = 'madrona'`
   under the `anon` role; expects success.
2. Inserts a `feedback_submissions` row with `event_slug = 'nonexistent-slug'`
   under any role; expects FK violation.
3. Inserts a `feedback_submissions` row with `email_declined = true`
   and a non-null `email`; expects CHECK violation.
4. Inserts a `feedback_submissions` row with `newsletter_opt_in = true`
   and `email = null`; expects CHECK violation.
5. Inserts a `feedback_submissions` row with `newsletter_opt_in = true`,
   `email_declined = true`, and a non-null email; expects CHECK
   violation (consent record without valid consent).
6. Selects from `feedback_submissions` under the `anon` role;
   expects RLS denial (returns no rows or permission error).
7. Selects from `feedback_enabled_events` under the `anon` role;
   expects RLS denial.

The harness is a pgTAP fixture at
`supabase/tests/database/feedback_tables.test.sql` (filename a
phase-time call), exercised by `npm run test:db`. The
existing pgTAP suite under
[`supabase/tests/database/`](/supabase/tests/database/)
(see
[`event_role_assignments_rls.test.sql`](/supabase/tests/database/event_role_assignments_rls.test.sql)
for the closest precedent on RLS-policy testing and
[`redemption_data_model.test.sql`](/supabase/tests/database/redemption_data_model.test.sql)
for table-shape + constraint testing) is the canonical pattern
this fixture follows. `npm run test:db` resets the stack,
applies all migrations including the new one, and runs every
file under `supabase/tests/database/` (`Verified by:`
[scripts/testing/run-db-tests.cjs:58](/scripts/testing/run-db-tests.cjs)
for the `runSupabase(["test", "db"])` invocation).

The seven cases above are the falsifier set: each names a
specific observable that distinguishes "constraint fired" from
"constraint silent." If a test's expected outcome is "should
fail" and it succeeds, the migration is wrong; if "should
succeed" and it fails, also wrong. The cases collectively cover
every load-bearing claim the migration makes.

In addition:

- `npm run lint` — passes against the regenerated types.
- `npm run build:web` — passes (the SPA build consumes
  `shared/db/types.ts`).

`npm run build:site` is not required because this phase does
not touch `apps/site`. `npm test` (Vitest, per
[`package.json`](/package.json) `scripts.test`) is not relevant
to this phase's diff — Vitest covers TypeScript code, not SQL
or generated types whose compilability is exercised by
`build:web` above.

## Self-Review Audits

Audit names from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md);
implementer reads the catalog at implementation time and
matches audit names to the diff surfaces below.

- **SQL surface:** migration shape (single file; both tables,
  RLS, policies, index, seed in one transaction); FK declared
  inline; RLS enabled before policies created (some Postgres
  versions accept either order, but the standard pattern
  enables RLS first); GRANT / REVOKE explicit per role; CHECK
  constraints named.
- **Generated-types currency:** `shared/db/types.ts` re-runs
  cleanly against the new schema; the diff matches what the
  generator produces for the contract above (no manual edits
  to the generated file).
- **Plan-to-PR Completion Gate:** every Goal bullet is satisfied
  in the PR or explicitly deferred in the plan with rationale.
- **Doc currency:** the milestone-doc Phase Status row flips in
  this PR (gate below).
- **Verified-by citation walk:** every `Verified by:` annotation
  in the migration's leading comment block (if any cites an
  external service or another file) is retrieved fresh from a
  tool result in the same response that wrote it.

## Documentation Currency PR Gate

Doc updates this PR must land:

- [`docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md`](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)
  Phase Status row 1.1: flip to `Landed`, add PR link.

Doc updates this PR is **not** responsible for (per the
milestone doc's Documentation Currency map): `architecture.md`
data-model paragraph, `eventContent.ts` header comment, `madrona.ts`
header comment, `EventLandingPage.tsx` composition comment.
Those land with the phases that own them (1.2 / 1.3 per the
milestone doc).

The plan re-verifies at implementation time that
`docs/architecture.md` does not already name a `feedback_*` table
that would now drift; if it does, fix in this PR per the
"plan re-verifies by grep at phase-start" rule.

## Out Of Scope

- Captcha, rate-limiting, per-IP fingerprinting, per-session
  dedupe — epic Resolved Decision forbids in this epic and the
  launch epic absent a concrete abuse signal (`Verified by:`
  [docs/plans/epics/madrona-feedback/epic.md:479-481](/docs/plans/epics/madrona-feedback/epic.md)).
- An admin-UI flow for adding events to `feedback_enabled_events`
  — registry seed for non-Madrona events is a future-epic concern.
- Per-user submission deduplication (server-side) — same epic
  Resolved Decision forbids.
- A slug-keyed wrapper helper `is_organizer_for_event_by_slug`
  — rejected in scoping Decision 1; defer to the second use-case
  if one surfaces.
- Form copy, route logic, EventContent shape extension, and
  CTA component — phases 1.2 / 1.3 scope.
- Updating other documentation surfaces (architecture.md
  data-model paragraph, etc.) — phase ownership lives in the
  milestone doc's Documentation Currency map.

## Risk Register

- **JOIN through `game_events` returns no rows for slugs that
  have no game.** A future feedback-enabled event might have no
  corresponding `game_events` row (e.g., a non-game event opting
  feedback in). The policy returns false from
  `is_organizer_for_event` because the inner `select` returns
  no rows. **Accepted for M1:** Madrona has a `game_events` row,
  so the read path works for the only registered slug. If a
  future event opts in without a game row, that event's organizer
  will be unable to read the feedback via the auth'd path until
  the registry / RLS shape grows. Recorded for the launch epic
  / future-event scoping to revisit.
- **CHECK constraint name collision with future migrations.**
  The two CHECK names are scoped to `feedback_submissions`; a
  future migration would have to choose colliding names on a
  different table or shadow them via DROP CONSTRAINT, neither
  of which would land without explicit intent. **Mitigation:**
  none needed; the explicit naming is itself the mitigation
  against unhelpful auto-generated names in error messages.
- **Generated-types regeneration produces unrelated diff.** If
  the generator pulls in schema changes that landed on `main`
  between the last regen and this one, the PR's
  `shared/db/types.ts` diff carries those changes too.
  **Mitigation:** the implementer runs the regen against a
  freshly-`main`-rebased local stack so the only diff is the
  new tables; if extra diff surfaces, the implementer pauses
  and surfaces it as an Estimate Deviation per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md).
- **Row-reference ambiguity in registry SELECT policy body.**
  The policy body references `slug` (the column on
  `feedback_enabled_events`) inside a subquery that joins to
  `game_events.slug`. Postgres may surface this as ambiguous
  depending on subquery shape. **Mitigation:** name an alias
  explicitly in the implementation
  (`select id from public.game_events ge where ge.slug = feedback_enabled_events.slug`);
  validation gate exercises a real registry SELECT under the
  authenticated role to confirm the policy parses and fires.
- **Local-stack apply succeeds, production apply fails.** Some
  RLS / policy syntaxes have version-specific quirks across
  Postgres minor versions. **Mitigation:** the project's local
  Supabase image tracks production's Postgres version per the
  existing migration runbook; if the implementer surfaces a
  version mismatch, fix in this PR before merge.
- **Open Supabase REST surface for `madrona` between this PR
  ship and 1.3 ship.** Restated from the milestone doc's Risk
  Register: once this migration applies in production, anyone
  who discovers the feedback-enabled posture for `madrona` can
  insert via the REST endpoint before the form route exists.
  **Accepted:** same shape as the post-1.3 steady-state spam
  risk the epic's Risk Register accepts; `noindex` posture
  continues to apply; discovery requires reading client code
  that reveals the slug as feedback-enabled, and no such client
  code exists until 1.3 ships.

## Backlog Impact

- **Closed by this phase.** Nothing in
  [`docs/backlog.md`](/docs/backlog.md). The epic's Backlog
  Impact already established no attendee-feedback items live
  in the backlog.
- **Unblocked by this phase.** Phase 1.3 (route + form +
  content opt-in) gains the schema it ships against. Phase 1.2
  (EventContent shape + section component) is independent and
  may draft / implement in parallel.
- **Opened by this phase.** Anticipated candidates if
  implementation surfaces them: an admin-UI flow for opting
  events into `feedback_enabled_events` (deferred to a future
  epic); a slug-keyed `is_organizer_for_event_by_slug` wrapper
  if a sibling table surfaces the same slug → id resolution
  need. Implementer logs concrete entries with rationale per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  doc-currency rules if any are surfaced during implementation.

## Related Docs

- [`m1-form-and-storage-mvp.md`](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)
  — parent milestone doc; the "Settled by default" RLS posture
  and "Migration ships both tables together, plus the `madrona`
  registry seed" decisions this plan inherits.
- [`scoping/m1-phase-1-1.md`](/docs/plans/epics/madrona-feedback/scoping/m1-phase-1-1.md)
  — transient scoping doc; deliberation prose with rejected
  alternatives for the seven scoping-time decisions this plan's
  Contracts section locks.
- [`docs/plans/epics/madrona-feedback/epic.md`](/docs/plans/epics/madrona-feedback/epic.md)
  — parent epic; Cross-Cutting Invariant 6 (DB-level integrity
  enforcement) is the load-bearing constraint this phase ships.
- [`supabase/migrations/20260421000200_add_event_role_helpers.sql`](/supabase/migrations/20260421000200_add_event_role_helpers.sql)
  — defines `is_organizer_for_event` and `is_root_admin`
  helpers this phase's RLS predicates consume.
- [`supabase/migrations/20260427010000_broaden_event_scoped_rls.sql`](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql)
  — canonical broadened-predicate shape this phase inherits.
- [`supabase/migrations/20260421000500_add_redemption_rls_policies.sql`](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql)
  — single-policy-spanning-roles precedent on a sibling
  event-scoped table.
- [`shared/db/types.ts`](/shared/db/types.ts) — generated types
  this phase regenerates.
- [`AGENTS.md`](/AGENTS.md) — public-write-needs-DB-integrity
  rule the epic's Invariant 6 binds.
- [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
  — phase planning rules; PR-count branch test, scoping owns /
  plan owns split, reality-check gate, "prefer existing wrapper
  scripts" rule.
- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  — cross-level rules; `Verified by:` annotations,
  rules-vs-estimates labeling, Plan-to-PR Completion Gate.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — audit-name source for Self-Review Audits.
