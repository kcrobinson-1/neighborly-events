# M1 phase 1.1 — Scoping

## Status

Active.

This scoping doc is the transient artifact for phase 1.1 of the
Madrona feedback child epic, M1. Per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Phase Planning Sessions" it owns the deliberation prose with
rejected alternatives, the open decisions handed to plan-drafting,
the plan-structure handoff, and the reality-check inputs the plan
must verify. The durable record of this phase lives in
[`m1-phase-1-1-plan.md`](/docs/plans/epics/madrona-feedback/m1-phase-1-1-plan.md).
This scoping doc deletes in batch with sibling scoping docs at the
M1 milestone-terminal PR per the milestone doc's
batch-deletion commitment
([`m1-form-and-storage-mvp.md`](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)).

## Phase Summary

Land the data-layer foundation for the feedback MVP: a single
Supabase migration that creates `feedback_enabled_events`
(registry, FK target) and `feedback_submissions` (the FK holder)
with row-level security and the `madrona` row seeded into the
registry — the moment the migration ships, the database enforces
"submissions accept only registered slugs" by FK, per epic
Cross-Cutting Invariant 6.

The phase ships no client code, no route, no form component, and
does not opt madrona feedback in on `EventContent` (1.3's scope).
After 1.1, no application surface reaches the table; the migration
is dormant infrastructure that the form ships against in 1.3.

## Decisions Made At Scoping Time

Per
[`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md)
"Verify before recording any cross-phase decision," each decision
below cites the actual code / migration / type that grounds the
call. Rejected alternatives stay recorded so the plan doc inherits
the option-set without re-deriving.

### Decision 1: RLS read-predicate shape — JOIN through `game_events`

The milestone doc deferred three options for resolving the
slug-keyed `feedback_submissions.event_slug` column to the
event-id-keyed `is_organizer_for_event(target_event_id text)`
helper:

**(a) Add `event_id` column alongside `event_slug`** on
`feedback_submissions`, with two FKs (one to
`feedback_enabled_events`, one to `game_events`), and key the RLS
predicate on `event_id`.

**(b) JOIN through `game_events` inside the policy:**
`using (public.is_organizer_for_event((select id from public.game_events where slug = event_slug)) or public.is_root_admin())`.

**(c) Slug-keyed wrapper helper** —
`is_organizer_for_event_by_slug(text)` that internally does the
slug → id lookup and delegates to `is_organizer_for_event`.

**Decision: (b) JOIN through `game_events` in the policy.**

The schema stays minimal: one event-keyed column (`event_slug`)
that doubles as the integrity FK to `feedback_enabled_events`. No
denormalized `event_id` column to keep aligned with `event_slug`
(option a's hidden cost is a CHECK constraint or trigger to forbid
slug/id drift, since two FKs to the same event taken via different
keys is a constraint problem the database doesn't catch
automatically). No new helper function in the public schema (option
c's cost is a parallel auth predicate that future tables might
adopt or might not, fragmenting the pattern the broadened-RLS
migration already established).

The trade option (b) accepts is one extra subquery in the read
policy. The cost is bounded: organizer reads of feedback
submissions are low-frequency (an event organizer reads through
post-event, not per-second), `game_events.slug` carries a unique
index from the M2-era backfill migration (`Verified by:`
[supabase/migrations/20260418040000_backfill_event_code.sql:60](/supabase/migrations/20260418040000_backfill_event_code.sql)
for the analogous `event_code` unique index pattern; slug
uniqueness is implicit in the `game_events` row shape at
[shared/db/types.ts:291-308](/shared/db/types.ts) where `slug` is
non-nullable and serves as the human-stable identifier the page
route resolves), and the planner can hash-join on `slug`. Reads
that miss (slug not in `game_events`) return false from
`is_organizer_for_event` because the inner `select` returns no
rows; that produces "no organizer authorization" which is the
correct outcome for a slug that has no game.

The choice keeps the door open for option (c) later if a sibling
table (donations, post-event surveys, ...) ends up needing
slug-keyed organizer auth: the wrapper helper extracts cleanly
from option (b)'s policy body. Picking (c) preemptively would lock
in a parallel predicate before the second use case actually
exists.

(`Verified by:` the helper signature at
[supabase/migrations/20260421000200_add_event_role_helpers.sql:23-37](/supabase/migrations/20260421000200_add_event_role_helpers.sql);
the broadened-predicate shape this M1 inherits at
[supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:31-32](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql);
the `game_events` row shape with both `id` and `slug` columns at
[shared/db/types.ts:291-308](/shared/db/types.ts))

### Decision 2: `feedback_enabled_events` registry shape — minimal slug PK plus enabled timestamp

The epic's "Data Shape" sketch named `slug` as the load-bearing
column with "additional columns deferred to milestone planning,
e.g. `enabled_at`, opt-in metadata" (`Verified by:`
[docs/plans/epics/madrona-feedback/epic.md:280-282](/docs/plans/epics/madrona-feedback/epic.md)).
The milestone doc passed the column shape to phase 1.1.

Two options:

**(a) Slug-only PK.** Single column. Operationally minimal; loses
the audit trail of when each slug was enabled.

**(b) Slug PK + `enabled_at timestamptz default now()`.** One
extra column, write-once at insert, gives an audit trail of when
each event opted into feedback collection.

**Decision: (b).**

The marginal cost of one auto-populated timestamp column is
trivial (one default expression, no client code touches it). The
benefit is permanent and read-only: the M2 organizer surface and
any future audit query can answer "when did `madrona` opt in"
without reading git history of seed migrations. The column is
strictly informational — no policy or trigger reads it — so it
doesn't widen the contract surface phase 1.3 ships against.

Rejected: adding richer opt-in metadata fields (`opted_in_by`
referencing `auth.users`, `notes` text, etc.). Those would be
useful for an M2-era admin opt-in flow, but the M1 registry
inserts are migration-time / runbook-time, not user-action-time,
so attributing to a `auth.users` row would be either wrong (a
user clicked nothing) or a synthetic admin actor that isn't
load-bearing. Defer richer metadata to whichever epic introduces
admin-driven opt-in.

(`Verified by:` epic Data Shape sketch at
[docs/plans/epics/madrona-feedback/epic.md:276-282](/docs/plans/epics/madrona-feedback/epic.md);
the precedent for `default now()` audit columns on event-scoped
tables at
[supabase/migrations/20260421000100_add_event_role_assignments.sql:11](/supabase/migrations/20260421000100_add_event_role_assignments.sql))

### Decision 3: `feedback_submissions` column shape and constraints

The epic's "Data Shape" sketch named the column set; phase 1.1
locks the types and the cross-column CHECK constraints that
encode the milestone-level invariants.

Columns:

- `id uuid primary key default gen_random_uuid()` — synthetic PK,
  matches the existing convention for tables that don't have a
  natural-key candidate. (Existing precedent: `event_role_assignments.id`
  is `uuid` per
  [supabase/migrations/20260421000100_add_event_role_assignments.sql:7](/supabase/migrations/20260421000100_add_event_role_assignments.sql).)
- `event_slug text not null references public.feedback_enabled_events(slug)
  on delete restrict` — the FK that enforces Invariant 6.
  `on delete restrict` because deleting a registry row while
  submissions reference it would silently lose the consent
  context per the M1 milestone-level invariant on newsletter
  consent.
- `submitted_at timestamptz not null default now()` — required
  for the newsletter-consent record per the M1 milestone-level
  invariant; default `now()` so client code does not spell it.
- `ratings jsonb not null` — per-dimension key → `1..5 | "n/a"`.
  Schema-shape validation is application-layer (form code) rather
  than DB-layer; per Invariant 3 the keys are content-authored
  and a future event author may pick keys phase 1.1 cannot
  predict, so a CHECK against a key allowlist would re-foreclose
  Invariant 3.
- `free_text text` — nullable. No length limit at the DB layer
  (defer to application-layer length cap if abuse becomes a real
  signal — out of M1 scope per epic Risk Register).
- `email text` — nullable. Format validation is application-layer
  per epic Resolved Decision (light client-side check); no
  CITEXT, no domain validation.
- `email_declined boolean not null default false` — explicit
  decline flag distinguishing "declined to share" from "left
  blank by accident" per the M1 milestone-level invariant.
- `newsletter_opt_in boolean not null default false` — opt-in
  column per the M1 milestone-level invariant on consent posture.

CHECK constraints (encoding milestone-level invariants at the DB
layer so the schema stays the load-bearing enforcement surface
even if the form regresses):

- `check (email_declined = false or email is null)` — when the
  attendee declined, no email row is stored, encoding the
  decline-as-first-class-path invariant. Without this, the form
  could submit a declined-yet-populated email and the row would
  be ambiguous to the M2 organizer surface.
- `check (newsletter_opt_in = false or (email is not null and email_declined = false))` —
  the newsletter consent record requires a non-declined email
  per the M1 milestone-level invariant. Without this, a form
  bug could store a true opt-in flag with a null email, breaking
  the consent record's usefulness.

Index:

- `create index feedback_submissions_event_slug_submitted_at_idx
  on public.feedback_submissions (event_slug, submitted_at desc);`
  — the read-path index for the M2 organizer surface, which
  reads per-event in submission order. The index leads with
  `event_slug` so per-event queries narrow first; `submitted_at desc`
  matches the expected scroll order. Sized correctly even at
  10,000 rows (the demo audience is far smaller; the launch epic
  may revisit indexing if real volume changes the read shape).

Rejected: a unique index across `(event_slug, email, submitted_at)`
or per-IP fingerprint columns to prevent dupes. The epic's
Resolved Decisions explicitly forbid dedupe / rate-limiting in
this epic (`Verified by:`
[docs/plans/epics/madrona-feedback/epic.md:479-481](/docs/plans/epics/madrona-feedback/epic.md));
adding either would silently relax a stated trade.

(`Verified by:` epic Data Shape sketch at
[docs/plans/epics/madrona-feedback/epic.md:284-303](/docs/plans/epics/madrona-feedback/epic.md);
M1 milestone-level invariants on newsletter consent + decline-as-first-class-path
at
[docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md:263-285](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md);
existing UUID-PK precedent at
[supabase/migrations/20260421000100_add_event_role_assignments.sql:6](/supabase/migrations/20260421000100_add_event_role_assignments.sql))

### Decision 4: RLS policy set — three policies on submissions, two on registry

`feedback_submissions`:

- Anon `INSERT`: allowed against any `event_slug` value; the FK
  enforces "must be a registered slug" at the DB layer.
- Authenticated `SELECT`: allowed when the row's `event_slug`
  resolves (via the JOIN from Decision 1) to an event for which
  the caller is an organizer, or when the caller is a root admin.
- All other operations: denied (no policy admits them; default-deny
  applies once RLS is enabled).

`feedback_enabled_events`:

- Anon `SELECT`: denied. The form does not need to enumerate
  registered slugs — the user lands on `/event/<slug>/feedback`
  and either submits (slug is registered → FK satisfied) or sees
  the disabled-event state (route-level branching from
  `EventContent.feedback`'s presence). Allowing anon to enumerate
  the registry would surface which events accept feedback, which
  is information bounded by the `noindex` posture today but
  there's no reason to widen the surface.
- Authenticated `SELECT`: allowed for organizers (via the same
  predicate shape) and root admins. Useful for the M2 organizer
  surface to confirm the event is in the registry and to read
  `enabled_at`.
- `INSERT` / `UPDATE` / `DELETE`: denied at the policy layer for
  every role except `service_role` (which bypasses RLS by
  construction). Registry writes flow through migrations or
  service-role scripts, not user actions.

Rationale for default-deny on writes to the registry: the rule
"opting an event in is a registry insert" (epic Invariant 6) is
satisfied by migrations + future service-role admin paths; an
authenticated organizer-or-admin path for inserting registry rows
is not load-bearing for M1 and adds a write surface that needs
its own validation gate. Defer to whichever future epic
introduces admin-UI opt-in.

(`Verified by:` the broadened-RLS migration's policy-shape
precedent at
[supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:67-137](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql);
the redemption RLS migration's "single policy spanning roles"
pattern at
[supabase/migrations/20260421000500_add_redemption_rls_policies.sql:14-24](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql))

### Decision 5: `madrona` registry seed lives in the same migration file

The epic's Invariant 6 binds the seed to "the M1 migration"
that creates the schema (`Verified by:`
[docs/plans/epics/madrona-feedback/epic.md:155-177](/docs/plans/epics/madrona-feedback/epic.md)).
The milestone doc's Settled-by-default "Migration ships both
tables together, plus the `madrona` registry seed" decision
binds the same shape (`Verified by:`
[docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md:316-331](/docs/plans/epics/madrona-feedback/m1-form-and-storage-mvp.md)).
This decision records the resulting migration shape:

```
1. create table public.feedback_enabled_events (...)
2. create table public.feedback_submissions (...)
3. enable RLS on both tables
4. create policies (per Decision 4)
5. create indexes (per Decision 3)
6. insert into public.feedback_enabled_events (slug) values ('madrona')
```

The seed runs as the final step so the table + RLS + policies
exist before the row lands. The seed is idempotent under re-run
via `on conflict (slug) do nothing` — production migrations run
exactly once, but local-dev resets and CI re-runs are common
enough that idempotency is cheap insurance.

Rejected: a separate seed migration (`20260507000001_seed_madrona_feedback.sql`).
That shape would technically satisfy the "same M1 PR" criterion
but violate the epic's literal "in that migration" wording, and
would create a window between the schema migration's apply and
the seed migration's apply where Madrona's feedback-route
infrastructure exists but the slug isn't registered. No production
process exposes that window today — migrations apply
sequentially — but the wording shouldn't drift from the epic
without rationale. Phase 1.1's plan inherits the single-file
shape.

### Decision 6: Migration filename convention

Filename: `20260507000000_add_feedback_tables.sql`.

The numeric prefix follows the existing convention (UTC date +
sequence). The current latest migration on `main` is
`20260427010000_broaden_event_scoped_rls.sql` (`Verified by:`
[`ls supabase/migrations/`](/supabase/migrations/) at scoping
time); 1.1's plan re-verifies the latest at plan-drafting and
re-derives the prefix if a sibling migration lands meanwhile.
Per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Quote labels whose enforcement depends on exact-match matching,"
the filename is illustrative — the load-bearing claim is "single
migration file, monotonically-after the existing prefix" — not
the literal date.

Body name `add_feedback_tables` keeps the migration discoverable
via `grep feedback supabase/migrations/`.

### Decision 7: Generated types regeneration is plan-time, not 1.1's deliverable

`shared/db/types.ts` is generated from the deployed Supabase
schema (`Verified by:` the file's header that names it as
auto-generated; the regeneration command is part of the project's
existing migration runbook). Phase 1.1's plan binds the
regeneration as a Documentation Currency PR Gate item: the PR
that ships the migration must also include the regenerated
`shared/db/types.ts` reflecting the two new tables. Without this,
TypeScript code in 1.3 has no compile-time visibility into the
new tables.

The regeneration is mechanical (run the project's regen command
against a local-applied migration) and plan-time, not
scoping-time, because the actual generated diff depends on the
migration body. The plan binds the action; the implementer runs
it.

(`Verified by:` the existing `shared/db/types.ts` header, which
names regeneration provenance.)

## Open Decisions To Make At Plan-Drafting

None blocking promotion to plan. The decisions above resolve the
deferrals the milestone doc named for phase 1.1; the plan-drafting
step turns these into the durable Contract section.

The plan doc owns these implementation-detail decisions
plan-drafting picks:

- The exact GRANT/REVOKE statements per role on each new table
  (the policy shape is fixed by Decision 4; the GRANT statements
  are mechanical from the policy needs).
- The exact CHECK-constraint names (Postgres auto-names if
  unspecified, but explicit names make migration error messages
  more diagnosable; a phase-1.1 plan-time call).
- The migration file's leading comment block following the project
  convention seen in
  [supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:1-66](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql).

## Plan Structure Handoff

The plan doc opens with a 1–3-paragraph Context preamble per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Plan opens with a plain-language context preamble," names the
Goal, restates the seven decisions above as the Contract section,
and adds standard Files To Touch / Execution Steps / Validation
Gate / Self-Review Audits / Documentation Currency PR Gate /
Out Of Scope / Risk Register / Backlog Impact sections. Cross-Cutting
Invariants reference the parent epic's six and the M1 milestone's
five by reference (no restatement).

Validation Gate names a local-stack apply + test that exercises:
(1) the FK rejects insert against an unregistered slug; (2) the
CHECK constraints reject the encoded violations (declined-with-email,
opt-in-without-email); (3) the RLS predicate admits an authorized
organizer's read and rejects an anon read; (4) anon insert works
against the registered `madrona` slug. Plan-drafting picks the
exact tier — likely the local Supabase Docker stack via
`npm run test:functions` or a pgTAP fixture, depending on what
already covers RLS in the codebase.

## Reality-Check Inputs

Per
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
"Reality-check gate between scoping and plan," the plan doc's
load-bearing claims must verify against current code. Inputs the
plan must re-confirm at plan-drafting time:

- The latest migration on `main` (used to derive Decision 6's
  filename prefix). At scoping time:
  `20260427010000_broaden_event_scoped_rls.sql`. Plan-drafting
  re-verifies via `ls supabase/migrations/`.
- `is_organizer_for_event(target_event_id text)` and
  `is_root_admin()` exist with the cited signatures and grants.
  At scoping time: present at
  [supabase/migrations/20260421000200_add_event_role_helpers.sql:23-54](/supabase/migrations/20260421000200_add_event_role_helpers.sql).
  Plan-drafting re-verifies (file shouldn't change, but the
  reality-check gate is cheap insurance).
- `game_events` has `id` (text PK) and `slug` (text, unique)
  columns. At scoping time: confirmed at
  [shared/db/types.ts:291-308](/shared/db/types.ts). The slug
  uniqueness is implicit in the row shape; plan-drafting confirms
  by reading the original `game_events` schema migration if a
  unique-index claim is named in the plan's Validation Gate.
- The RLS-broadened-event-scoped pattern at
  [supabase/migrations/20260427010000_broaden_event_scoped_rls.sql:67-137](/supabase/migrations/20260427010000_broaden_event_scoped_rls.sql)
  is the canonical shape phase 1.1 inherits.
- The redemption RLS migration's "single policy spanning roles"
  precedent at
  [supabase/migrations/20260421000500_add_redemption_rls_policies.sql:14-24](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql).
- `shared/db/types.ts` regeneration command: plan-drafting names
  the canonical wrapper (`npm run` something) by reading
  `package.json` `scripts` per the
  [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
  "Prefer existing wrapper scripts" rule. At scoping time the
  exact wrapper hasn't been verified; plan-drafting closes this.
- `npm run test:functions` semantics: does it run pgTAP, or only
  Edge Function tests? Plan-drafting reads
  [`scripts/testing/`](/scripts/testing/) and `package.json` to
  pick the right Validation Gate tier and command shape.

If any of these reality-checks fail (file moved, helper signature
changed, type generation pipeline shifted), the plan doc records
the discrepancy and adjusts the affected decision before
promoting to `Proposed`.
