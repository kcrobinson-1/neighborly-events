# Reward Redemption — Phase A.1 Execution Plan

**Status:** Completed — landed as part of PR #54 (`feat(db): reward
redemption Phase A.1 foundation` in commit `0536c73`, plus the
follow-up fixes `b2382d8`, `230d718`, `e52d0b3`, `36f2b4b`, `10817fe`
that hardened the shape check, cascade assertion, test catalog
queries, and service_role privileges). Successor phase A.2a landed
the mutation surface and scoped RLS read policies; see
[`reward-redemption-phase-a-2-plan.md`](/docs/plans/archive/reward-redemption-phase-a-2-plan.md).
**Parent design:** [`reward-redemption-mvp-design.md`](/docs/plans/reward-redemption-mvp-design.md)
**Scope:** Phase A.1 only — the inert backend foundation. No callers reference
the new columns, helpers, or role table at the end of this phase; the PR is
structural and ships safely on its own.

## Summary

Add the redemption data model, the event-scoped role assignment table, the
three permission helpers, and the `supabase/role-management/` runbook
skeleton. After this PR merges, the database knows how redemption is shaped
but nothing yet writes redemption state; that is Phase A.2.

## Goals

- `game_entitlements` grows the inline redemption and reversal columns from
  the design doc. Each new column is nullable or defaulted so the migration
  does not have to rewrite existing rows, and a partial CHECK constraint
  preserves the "redeemed rows have complete redemption metadata" invariant.
- A new B-tree index `(event_id, redeemed_at DESC NULLS LAST)` on
  `game_entitlements` exists to serve the default recent-first list on
  `/event/:slug/redemptions` (checklist item 5).
- A new `public.event_role_assignments` table exists and is empty, with RLS
  enabled and no authenticated policies (service_role only in A.1, matching
  the `public.admin_users` precedent).
- Three permission helpers exist:
  `public.is_agent_for_event(target_event_id text)`,
  `public.is_organizer_for_event(target_event_id text)`,
  `public.is_root_admin()`. All three return `boolean`, are
  `stable security definer`, and read identity from
  `public.current_request_user_id()` / `public.current_request_email()`.
  `is_root_admin()` aliases the existing `public.is_admin()` (renamed
  from `is_admin()` in the terminology migration).
- `supabase/role-management/` exists with a `README.md`, parameterized
  `assign-agent.sql`, `assign-organizer.sql`, and `revoke-assignment.sql`
  snippets, following checklist item 9.
- pgTAP coverage asserts column presence, CHECK behavior, index presence,
  role-table constraints, and helper truth tables.

## Non-Goals

- Writing any RPC that mutates redemption state. `redeem_entitlement_by_code`
  and `reverse_entitlement_redemption` are Phase A.2.
- Any RLS policy on `game_entitlements` that references the new columns or
  helpers. A.1 does not tighten or loosen existing entitlement read paths;
  that work lives with A.2 alongside the mutation surface.
- Any Edge Function change. No frontend surface, no admin UI, no agent UI.
- Seeding real role assignments. The role-assignment table is created
  empty; seeding is checklist item 10 step 7 (Phase D prep).

## Target Shape

### `game_entitlements` column additions

All additive and nullable/defaulted:

- `redeemed_at timestamptz null`
- `redeemed_by uuid null references auth.users(id) on delete set null`
- `redeemed_by_role text null check (redeemed_by_role in ('agent', 'root_admin'))`
- `redeemed_event_id text null` — duplicates `event_id` on redeem so the
  redemption is self-describing in logs and exports; populated by the
  A.2 redeem RPC.
- `redemption_status text not null default 'unredeemed' check (redemption_status in ('unredeemed', 'redeemed'))`
- `redemption_reversed_at timestamptz null`
- `redemption_reversed_by uuid null references auth.users(id) on delete set null`
- `redemption_reversed_by_role text null check (redemption_reversed_by_role in ('organizer', 'root_admin'))`
- `redemption_note text null`

CHECK: `game_entitlements_redeemed_shape_check` — a single constraint
guarding the redeemed-row invariants:

```
check (
  (redemption_status = 'unredeemed'
    and redeemed_at is null
    and redeemed_by is null
    and redeemed_by_role is null
    and redeemed_event_id is null)
  or
  (redemption_status = 'redeemed'
    and redeemed_at is not null
    and redeemed_by_role is not null
    and redeemed_event_id = event_id)
)
```

Notes:

- `redeemed_by` is allowed null even in the redeemed branch so that an
  `on delete set null` on the FK does not violate the constraint after a
  user deletion.
- Reversal fields (`redemption_reversed_*`) are intentionally **not**
  constrained here. After a reverse, `redemption_status` flips back to
  `unredeemed` and the inline fields capture only the most recent cycle
  (checklist item 4). A reversed row therefore has `redemption_status =
  'unredeemed'` with `redemption_reversed_*` populated; the shape check
  above accepts that because it only guards `redeemed_*`. No separate
  CHECK is needed for reversal metadata in A.1 — this decision is noted
  here so the A.2 reverse RPC is not surprised by it.

### Monitoring index

```
create index if not exists game_entitlements_event_redeemed_at_idx
  on public.game_entitlements (event_id, redeemed_at desc nulls last);
```

Covers the default list, the `Last 15m` filter, and the `Redeemed`
filter on `/event/:slug/redemptions` per checklist item 5. No other
indexes are added in A.1.

### `public.event_role_assignments`

```
create table if not exists public.event_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.game_events(id) on delete cascade,
  role text not null check (role in ('agent', 'organizer')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint event_role_assignments_unique unique (user_id, event_id, role)
);

alter table public.event_role_assignments enable row level security;

revoke all on table public.event_role_assignments from anon, authenticated;
-- Supabase's baseline `grant all on all tables in schema public to
-- service_role` would otherwise leave UPDATE enabled.
revoke update on table public.event_role_assignments from service_role;
grant select, insert, delete on table public.event_role_assignments to service_role;
```

Design notes:

- `role` is constrained to `('agent', 'organizer')` only. Root admin is
  not an event-scoped assignment — it lives in `public.admin_users`
  and is queried through `is_root_admin()`.
- UPDATE is explicitly revoked from `service_role` after the baseline
  `grant all` Supabase applies, so role changes must be an insert plus a
  delete. This keeps the row history append-only in practice and matches
  the runbook's insert/delete shape.
- RLS is enabled with no authenticated policies in A.1. The helpers in the
  next section are `security definer` so they see the table regardless.
  A.2 may add an authenticated read policy if a UI ever needs to show
  self-assignments; nothing in A.1 requires one.

### Permission helpers

All three live in `public`, match the shape of the existing
`public.is_admin()`, and use `public.current_request_user_id()` for
identity.

```
create or replace function public.is_agent_for_event(target_event_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_role_assignments as assignment
    where assignment.role = 'agent'
      and assignment.event_id = target_event_id
      and assignment.user_id = public.current_request_user_id()
  );
$$;

create or replace function public.is_organizer_for_event(target_event_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_role_assignments as assignment
    where assignment.role = 'organizer'
      and assignment.event_id = target_event_id
      and assignment.user_id = public.current_request_user_id()
  );
$$;

create or replace function public.is_root_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;
```

Grants mirror `is_admin`:

```
revoke all on function public.is_agent_for_event(text) from public;
revoke all on function public.is_organizer_for_event(text) from public;
revoke all on function public.is_root_admin() from public;

grant execute on function public.is_agent_for_event(text) to anon, authenticated, service_role;
grant execute on function public.is_organizer_for_event(text) to anon, authenticated, service_role;
grant execute on function public.is_root_admin() to anon, authenticated, service_role;
```

Signature deviation from the design doc: `text` instead of `uuid` to
match the actual type of `game_events.id` and `game_entitlements.event_id`.
The design doc is updated at the same time so the two stay in sync.

`is_root_admin` is a thin alias over `is_admin` in A.1. The alias
exists so downstream RPCs and RLS policies speak the vocabulary of the
redemption feature without coupling to the authoring allowlist name. If
a future product change separates authoring from redemption root-admin
privileges, the alias body is the one place that changes.

### `supabase/role-management/` runbook skeleton

Directory layout:

```
supabase/role-management/
  README.md
  assign-agent.sql
  assign-organizer.sql
  revoke-assignment.sql
```

`README.md` covers:

- role model (agent, organizer, root-admin) and where each lives
  (`event_role_assignments` vs `admin_users`)
- required inputs (user id or email, event slug or id, role)
- execution process: clone repo, edit a snippet, open a PR titled
  `role: <assign|revoke> <role> <email> for <event-slug>`, request review
  from `@kcrobinson`, apply through a Supabase branch project only after
  merge
- explicit statement that no role change is applied from a local-only
  script; the commit history is the audit trail

`assign-agent.sql` and `assign-organizer.sql` are parameterized with
clear `-- :user_email` / `-- :event_slug` placeholders, resolve the
user by email through `auth.users`, resolve the event by slug through
`public.game_events`, and use `insert … on conflict do nothing` so the
snippet is idempotent.

`revoke-assignment.sql` uses `delete … returning *` so the reviewer can
see exactly what was removed.

All three SQL files begin with `-- This file is applied by a reviewed
PR only. See README.md.` so accidental direct execution is discouraged.

## Rollout Sequence

Three migrations, one commit, one PR. The migrations are small enough
that a single combined file would also work, but splitting by concern
makes review and selective rollback cleaner and matches the event-code
precedent of one-concept-per-migration.

### Migration 1 — `20260421000000_add_redemption_columns.sql`

1. Add the nine new columns to `public.game_entitlements` with
   appropriate defaults and nullability (see Target Shape).
2. Add `game_entitlements_redeemed_shape_check`.
3. Create `game_entitlements_event_redeemed_at_idx`.

### Migration 2 — `20260421000100_add_event_role_assignments.sql`

1. Create `public.event_role_assignments` with the columns, unique
   constraint, and FKs described above.
2. `alter table … enable row level security`.
3. Revoke from `anon, authenticated`; grant `select, insert, delete` to
   `service_role`.

### Migration 3 — `20260421000200_add_event_role_helpers.sql`

1. Create `public.is_agent_for_event(text)`.
2. Create `public.is_organizer_for_event(text)`.
3. Create `public.is_root_admin()`.
4. Revoke from `public`; grant `execute` to `anon, authenticated,
   service_role` on each.

### Runbook skeleton

Committed in the same PR at `supabase/role-management/` with the files
listed above. No migration changes; the directory is operator-facing
documentation and parameterized snippets.

### Design-doc sync

The same PR updates `docs/plans/reward-redemption-mvp-design.md` in
checklist item 1 so the canonical helper signatures read `text` not
`uuid`, and adds a one-line note that `is_root_admin()` is an alias
over `is_admin()` in the MVP.

## Tests

### pgTAP additions under `supabase/tests/`

- Column presence, types, defaults, and nullability on
  `game_entitlements` match the Target Shape exactly.
- `game_entitlements_redeemed_shape_check`:
  - accepts default `unredeemed` row with all `redeemed_*` null
  - accepts a fully-populated redeemed row
  - rejects `redemption_status = 'redeemed'` with null `redeemed_at`
  - rejects `redemption_status = 'redeemed'` with
    `redeemed_event_id <> event_id`
  - accepts a reversed row (status back to `unredeemed`, reversal
    fields populated, `redeemed_*` cleared)
- `game_entitlements_event_redeemed_at_idx` exists and is a btree on
  `(event_id, redeemed_at desc nulls last)`.
- `event_role_assignments`:
  - unique `(user_id, event_id, role)` rejects duplicates
  - `role` CHECK rejects anything outside `('agent', 'organizer')`
  - FK to `auth.users` cascades on user delete
  - FK to `public.game_events` cascades on event delete
  - RLS is enabled; an `authenticated` role cannot select
- Helper truth tables, each seeded with a fresh `auth.users` row plus a
  `set_config('request.jwt.claims', …)` to impersonate:
  - `is_agent_for_event('evt-x')` returns true when the caller has an
    `('agent', 'evt-x')` assignment; false for a different event,
    different role, or missing assignment; false when no JWT is present
  - `is_organizer_for_event('evt-x')` mirrors the same four cases
  - `is_root_admin()` returns true when the caller is in
    `admin_users` with `active = true`; false otherwise; tracks
    `is_admin()` one-for-one

### Vitest additions

None. No TypeScript surface changes in A.1.

## Validation Expectations

- `npm run lint` — docs update touches markdown; keep it lint-clean.
- `npm run test:functions` — pgTAP must pass with the new cases.
- `npm test` — vitest runs unchanged; guard against regression from the
  design-doc update accidentally touching imported fixtures.
- `npm run build:web` — no web change, but the build is part of the
  standard pre-merge gate and verifies the docs edit did not break a
  markdown import in the web app.
- Manual: none. A.1 exposes no user-visible surface.

## Risks and Mitigations

- **`redeemed_event_id` is redundant with `event_id` on the same row.**
  Accepted cost. The column lets log pipelines and future partitioned
  exports carry a "this is the event the redemption belongs to" value
  without joining back to `game_entitlements`; the shape check forces
  equality so drift between the two is impossible.
- **Reversal does not have its own shape check.** Documented above as
  intentional. If A.2 surfaces a case where a partially-populated
  reversal row is possible, extend the shape check then, not now.
- **`is_root_admin` aliases `is_admin`, coupling the two concepts.**
  Accepted for MVP. The alias is the one place to change if the concepts
  diverge later; search/replace pain is low because nothing outside the
  redemption feature calls `is_root_admin` yet.
- **RLS on `event_role_assignments` blocks all authenticated reads.**
  Intentional. A.2 will add scoped read policies if the mutation-surface
  RPCs or any future UI need them; A.1's helpers are `security definer`
  and bypass RLS, so assignment lookup works through the helpers
  regardless.
- **New columns widen `game_entitlements` rows by ~64 bytes each.**
  Negligible at the MVP scale of hundreds to low-thousands of rows per
  event. Not worth a JSONB payload column.
- **Helper signatures change from the design doc.** The doc is updated
  in the same PR. Any consumer reading the doc between merge and the
  next design-doc edit would see the correct shape.

## Rollback Plan

Reverse of the forward sequence. Because A.1 adds only inert surfaces,
rollback is non-destructive:

1. Drop the three helper functions
   (`is_agent_for_event`, `is_organizer_for_event`, `is_root_admin`).
2. Drop `public.event_role_assignments`. It is empty by construction at
   the end of A.1; if somehow seeded before rollback, dump rows first.
3. Drop `game_entitlements_event_redeemed_at_idx`.
4. Drop `game_entitlements_redeemed_shape_check`.
5. Drop the nine new columns from `public.game_entitlements` in reverse
   order of addition. Values are null/default everywhere because A.1 has
   no writer, so dropping loses no data.
6. Remove `supabase/role-management/`.
7. Revert the design-doc signature fix.

A partial rollback that keeps the columns and drops only the helpers is
also safe — `game_entitlements` rows remain valid in their default
`unredeemed` shape.

## Resolved Decisions

- **Helper `target_event_id` type: `text`.** Matches the actual
  `game_events.id` and `game_entitlements.event_id` types. Supersedes
  the design doc's `uuid` signature.
- **`is_root_admin()` reuses `is_admin()` in MVP.** Aliasing keeps
  the redemption feature's vocabulary clean without inventing a second
  allowlist.
- **`redeemed_event_id` is nullable with a shape-check invariant.** The
  design doc's `not null` was not compatible with an additive migration
  over existing rows. The CHECK captures the intent
  (`redeemed_event_id = event_id when redeemed`) without blocking
  migration or requiring a backfill.
- **Role table stays singular (`event_role_assignments`) with a
  `role` discriminator.** One table keeps the helpers symmetric and
  makes revocation uniform. A per-role table would duplicate the
  `(user_id, event_id)` shape for no operational benefit at the MVP
  scale.
- **No authenticated policies on `event_role_assignments` in A.1.**
  Every read goes through a security-definer helper, so no policy is
  needed until A.2 introduces a direct-read use case.

No remaining open questions block execution of A.1.
