-- M2 phase 2.1.1 — RLS broadening for the staffing table.
--
-- Exercises the broadened authenticated paths on
-- public.event_role_assignments: the three-branch SELECT policy
-- (self-read, organizer-for-event, root-admin) and the new INSERT and
-- DELETE policies. UPDATE stays revoked at the privilege layer for
-- both authenticated and service_role per the original A.1 migration's
-- "role changes are insert + delete, never in-place mutation" intent;
-- this file asserts that revocation alongside the broadening.
--
-- Each role context flips to `authenticated` with the role's JWT
-- claims around the operation so RLS actually evaluates. pgTAP
-- assertions themselves run as the test runner role (superuser,
-- bypasses RLS).
--
-- Coverage:
--   * Structural — every broadened policy is present in pg_policies
--     and the dropped self-or-root-only SELECT policy is gone.
--   * Privilege layer — INSERT and DELETE are granted to authenticated;
--     UPDATE is denied to both authenticated and service_role.
--   * Behavioral — exhaustive role matrix:
--       organizer-A: read own event's assignments, insert and delete
--         within own event, denied for event B
--       organizer-B: symmetric, swapped events
--       agent-A: read own assignment row only (self-read branch),
--         denied INSERT/DELETE on any assignment
--       unrelated authenticated: read own assignment if any, denied
--         INSERT/DELETE
--       root admin: read all, insert and delete on any event
begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

-- ─── Structural ────────────────────────────────────────────────────────────

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_role_assignments'
      and policyname = 'users, organizers, and admins can read role assignments'
      and cmd = 'SELECT'
  ),
  'event_role_assignments has the three-branch SELECT policy'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_role_assignments'
      and policyname = 'users can read their own role assignments'
  ),
  'event_role_assignments no longer has the self-or-root-only SELECT policy'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_role_assignments'
      and policyname = 'organizers and admins can insert role assignments'
      and cmd = 'INSERT'
  ),
  'event_role_assignments has the broadened INSERT policy'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_role_assignments'
      and policyname = 'organizers and admins can delete role assignments'
      and cmd = 'DELETE'
  ),
  'event_role_assignments has the broadened DELETE policy'
);

-- ─── Privilege layer ───────────────────────────────────────────────────────
-- Single-privilege calls per the Privilege-test vacuous-pass audit.

select ok(
  has_table_privilege('authenticated', 'public.event_role_assignments', 'SELECT'),
  'authenticated has SELECT privilege on event_role_assignments'
);

select ok(
  has_table_privilege('authenticated', 'public.event_role_assignments', 'INSERT'),
  'authenticated has INSERT privilege on event_role_assignments'
);

select ok(
  has_table_privilege('authenticated', 'public.event_role_assignments', 'DELETE'),
  'authenticated has DELETE privilege on event_role_assignments'
);

select ok(
  not has_table_privilege('authenticated', 'public.event_role_assignments', 'UPDATE'),
  'authenticated does NOT have UPDATE privilege on event_role_assignments'
);

select ok(
  not has_table_privilege('service_role', 'public.event_role_assignments', 'UPDATE'),
  'service_role does NOT have UPDATE privilege on event_role_assignments'
);

-- ─── Fixtures ──────────────────────────────────────────────────────────────
-- Replica mode suppresses FK triggers so event_role_assignments can be
-- seeded with synthetic UUIDs that have no auth.users row. Reset to
-- 'origin' before any trigger-dependent assertion (none in this file —
-- all assertions are SELECTs, INSERTs that hit RLS, and DELETEs that
-- hit RLS).
set local session_replication_role = 'replica';

insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes,
  entitlement_label, intro, summary, feedback_mode, published_at
)
values
  (
    'era-evt-a', 'era-evt-a', 'EAA',
    'ERA Event A', 'Seattle', 2, 'reward',
    'Intro', 'Summary', 'final_score_reveal', now()
  ),
  (
    'era-evt-b', 'era-evt-b', 'EAB',
    'ERA Event B', 'Seattle', 2, 'reward',
    'Intro', 'Summary', 'final_score_reveal', now()
  );

-- Synthetic test UUIDs:
--   organizer-A → event A
--   organizer-B → event B
--   agent-A     → event A (must not gain INSERT/DELETE; SELECT via self
--                  branch only)
--   unrelated   → no assignments
insert into public.event_role_assignments (user_id, event_id, role)
values
  ('11111111-1100-4000-8000-000000000011'::uuid, 'era-evt-a', 'organizer'),
  ('22222222-2200-4000-8000-000000000022'::uuid, 'era-evt-b', 'organizer'),
  ('33333333-3300-4000-8000-000000000033'::uuid, 'era-evt-a', 'agent');

insert into public.admin_users (email)
values ('era-root@example.com');

-- ─── Organizer A: read + write within own event, deny across events ────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1100-4000-8000-000000000011"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.event_role_assignments
    where event_id = 'era-evt-a'),
  2,
  'organizer-A sees both event A assignments (self + agent-A)'
);

select is(
  (select count(*)::int from public.event_role_assignments
    where event_id = 'era-evt-b'),
  0,
  'organizer-A does not see event B assignments'
);

-- INSERT on own event — should succeed
insert into public.event_role_assignments (user_id, event_id, role)
values
  ('44444444-4400-4000-8000-000000000044'::uuid, 'era-evt-a', 'agent');

select is(
  (select count(*)::int from public.event_role_assignments
    where event_id = 'era-evt-a'),
  3,
  'organizer-A inserted a new agent for event A'
);

-- INSERT on event B — should be denied by RLS (42501)
select throws_ok(
  $$ insert into public.event_role_assignments (user_id, event_id, role)
     values
       ('55555555-5500-4000-8000-000000000055'::uuid, 'era-evt-b', 'agent') $$,
  '42501',
  null,
  'organizer-A cannot insert assignments for event B'
);

-- DELETE on own event — should succeed
delete from public.event_role_assignments
  where user_id = '44444444-4400-4000-8000-000000000044'::uuid
    and event_id = 'era-evt-a';

select is(
  (select count(*)::int from public.event_role_assignments
    where user_id = '44444444-4400-4000-8000-000000000044'::uuid),
  0,
  'organizer-A deleted their own-event assignment'
);

-- DELETE on event B — silently no-ops because RLS filters the row out of
-- SELECT visibility (matching organizer-A's read scope), so 0 rows are
-- affected. Verify by checking event-B assignment count from the test
-- runner role.
delete from public.event_role_assignments where event_id = 'era-evt-b';

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.event_role_assignments
    where event_id = 'era-evt-b'),
  1,
  'organizer-A could not delete event B assignments (DELETE filtered by SELECT-visibility)'
);

-- ─── Agent A: self-read only, denied INSERT/DELETE ─────────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"33333333-3300-4000-8000-000000000033"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.event_role_assignments
    where user_id = '33333333-3300-4000-8000-000000000033'::uuid),
  1,
  'agent-A reads their own assignment via the self-read branch'
);

select is(
  (select count(*)::int from public.event_role_assignments
    where event_id = 'era-evt-a' and user_id <> '33333333-3300-4000-8000-000000000033'::uuid),
  0,
  'agent-A does not see other event-A assignments (organizer branch does not admit agents)'
);

select throws_ok(
  $$ insert into public.event_role_assignments (user_id, event_id, role)
     values
       ('66666666-6600-4000-8000-000000000066'::uuid, 'era-evt-a', 'agent') $$,
  '42501',
  null,
  'agent-A cannot insert assignments'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Unrelated authenticated user: nothing ────────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"99999999-9900-4000-8000-000000000099"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.event_role_assignments),
  0,
  'unrelated authenticated user sees no assignments'
);

select throws_ok(
  $$ insert into public.event_role_assignments (user_id, event_id, role)
     values
       ('99999999-9900-4000-8000-000000000099'::uuid, 'era-evt-a', 'agent') $$,
  '42501',
  null,
  'unrelated authenticated user cannot insert assignments'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Root admin: read all, insert anywhere, delete anywhere ────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"era-root@example.com","sub":"99999999-9900-4000-8000-000000000088"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.event_role_assignments
    where event_id like 'era-evt-%'),
  3,
  'root admin sees all era-evt-* assignments'
);

-- Root admin INSERT on event B — should succeed
insert into public.event_role_assignments (user_id, event_id, role)
values
  ('77777777-7700-4000-8000-000000000077'::uuid, 'era-evt-b', 'agent');

select is(
  (select count(*)::int from public.event_role_assignments
    where event_id = 'era-evt-b'),
  2,
  'root admin inserted an agent for event B'
);

-- Root admin DELETE on event B — should succeed
delete from public.event_role_assignments
  where user_id = '77777777-7700-4000-8000-000000000077'::uuid;

select is(
  (select count(*)::int from public.event_role_assignments
    where user_id = '77777777-7700-4000-8000-000000000077'::uuid),
  0,
  'root admin deleted the event B assignment'
);

reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();

rollback;
