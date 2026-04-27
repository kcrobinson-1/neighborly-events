-- Reward redemption Phase A.2a: scoped RLS read policies.
--
-- Exercises the authenticated read path on game_entitlements and
-- event_role_assignments. Each case flips to role `authenticated` around
-- the SELECT so RLS actually evaluates (pgTAP assertions themselves run
-- as the test runner role). Writes are verified to stay denied; those
-- paths go through the SECURITY DEFINER RPCs covered in
-- redemption_rpc.test.sql.
begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- ─── Structural ────────────────────────────────────────────────────────────

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_entitlements'
      and policyname = 'assigned operators can read event entitlements'
      and cmd = 'SELECT'
  ),
  'game_entitlements has the "assigned operators can read" SELECT policy'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'event_role_assignments'
      and policyname = 'users, organizers, and admins can read role assignments'
      and cmd = 'SELECT'
  ),
  'event_role_assignments has the three-branch SELECT policy '
  '(self / organizer / root-admin) installed by M2 phase 2.1.1'
);

select ok(
  has_table_privilege(
    'authenticated', 'public.game_entitlements', 'SELECT'
  ),
  'authenticated has SELECT privilege on game_entitlements'
);

select ok(
  has_table_privilege(
    'authenticated', 'public.event_role_assignments', 'SELECT'
  ),
  'authenticated has SELECT privilege on event_role_assignments'
);

-- ─── Fixtures ──────────────────────────────────────────────────────────────
-- session_replication_role = 'replica' suppresses FK triggers for the
-- duration of this transaction so event_role_assignments can be seeded
-- with synthetic UUIDs that have no auth.users row. The test rolls back
-- at the end, so the change is scoped. The setting persists across the
-- `set local role authenticated` switches below because `set local`
-- bindings are transaction-scoped regardless of role.
set local session_replication_role = 'replica';

insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes,
  entitlement_label, intro, summary, feedback_mode
)
values
  (
    'rls-event-1', 'rls-event-1', 'RLA',
    'RLS Event 1', 'Seattle', 2, 'reward',
    'Intro', 'Summary', 'final_score_reveal'
  ),
  (
    'rls-event-2', 'rls-event-2', 'RLB',
    'RLS Event 2', 'Seattle', 2, 'reward',
    'Intro', 'Summary', 'final_score_reveal'
  );

insert into public.game_entitlements (
  event_id, client_session_id, verification_code
)
values
  ('rls-event-1', 'rls-session-1', 'RLA-1111'),
  ('rls-event-2', 'rls-session-2', 'RLB-2222');

-- Synthetic test UUIDs — agent for event 1, organizer for event 2.
insert into public.event_role_assignments (user_id, event_id, role)
values
  (
    '10000000-1000-4000-8000-000000000001'::uuid,
    'rls-event-1',
    'agent'
  ),
  (
    '20000000-2000-4000-8000-000000000002'::uuid,
    'rls-event-2',
    'organizer'
  );

insert into public.admin_users (email)
values ('rls-root@example.com');

-- ─── Agent for event 1 sees event 1 rows only ─────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-1000-4000-8000-000000000001"}',
  true
);

set local role authenticated;

select is(
  (
    select count(*)::int
      from public.game_entitlements
     where event_id = 'rls-event-1'
  ),
  1,
  'agent for event 1 sees event 1 entitlement via RLS'
);

select is(
  (
    select count(*)::int
      from public.game_entitlements
     where event_id = 'rls-event-2'
  ),
  0,
  'agent for event 1 does not see event 2 entitlement (RLS filters out)'
);

-- Agent reads their own assignment but not the organizer's.
select is(
  (
    select count(*)::int
      from public.event_role_assignments
     where user_id = '10000000-1000-4000-8000-000000000001'::uuid
  ),
  1,
  'agent sees their own event_role_assignments row'
);

select is(
  (
    select count(*)::int
      from public.event_role_assignments
     where user_id = '20000000-2000-4000-8000-000000000002'::uuid
  ),
  0,
  'agent cannot see the organizer''s event_role_assignments row'
);

reset role;

-- ─── Organizer for event 2 sees event 2 rows only ─────────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"20000000-2000-4000-8000-000000000002"}',
  true
);

set local role authenticated;

select is(
  (
    select count(*)::int
      from public.game_entitlements
     where event_id = 'rls-event-2'
  ),
  1,
  'organizer for event 2 sees event 2 entitlement via RLS'
);

select is(
  (
    select count(*)::int
      from public.game_entitlements
     where event_id = 'rls-event-1'
  ),
  0,
  'organizer for event 2 does not see event 1 entitlement'
);

reset role;

-- ─── Unassigned authenticated user sees no entitlements ────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"99999999-9999-4999-8999-999999999999"}',
  true
);

set local role authenticated;

select is(
  (
    select count(*)::int from public.game_entitlements
  ),
  0,
  'unassigned authenticated user sees no entitlements'
);

select is(
  (
    select count(*)::int from public.event_role_assignments
  ),
  0,
  'unassigned authenticated user sees no role assignments'
);

reset role;

-- ─── anon has no SELECT grant on either table ─────────────────────────────
-- Stronger than an RLS-filtered zero-row read: anon is denied at the
-- privilege layer, so even a malformed query cannot reach RLS.

select ok(
  not has_table_privilege('anon', 'public.game_entitlements', 'SELECT'),
  'anon has no SELECT privilege on game_entitlements'
);

select ok(
  not has_table_privilege('anon', 'public.event_role_assignments', 'SELECT'),
  'anon has no SELECT privilege on event_role_assignments'
);

-- ─── Root admin sees both entitlements and both assignment rows ───────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated",'
  || '"email":"rls-root@example.com",'
  || '"sub":"30000000-3000-4000-8000-000000000003"}',
  true
);

set local role authenticated;

select is(
  (
    select count(*)::int from public.game_entitlements
     where event_id in ('rls-event-1', 'rls-event-2')
  ),
  2,
  'root admin sees all event_id-scoped entitlements via RLS'
);

select is(
  (
    select count(*)::int from public.event_role_assignments
     where event_id in ('rls-event-1', 'rls-event-2')
  ),
  2,
  'root admin sees all event_role_assignments rows via RLS'
);

reset role;

-- ─── Writes stay denied for authenticated ─────────────────────────────────
-- Fresh agent claims; authenticated role; assert write attempts throw.

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-1000-4000-8000-000000000001"}',
  true
);

set local role authenticated;

select throws_ok(
  $$
    insert into public.game_entitlements (
      event_id, client_session_id, verification_code
    )
    values ('rls-event-1', 'rls-attempt-insert', 'RLA-9999')
  $$,
  '42501',
  null,
  'authenticated cannot INSERT into game_entitlements (no write policy, '
  'no INSERT grant)'
);

select throws_ok(
  $$
    update public.game_entitlements
       set redemption_status = 'redeemed'
     where verification_code = 'RLA-1111'
  $$,
  '42501',
  null,
  'authenticated cannot UPDATE game_entitlements'
);

select throws_ok(
  $$
    insert into public.event_role_assignments (user_id, event_id, role)
    values (
      '40000000-4000-4000-8000-000000000004'::uuid,
      'rls-event-1',
      'agent'
    )
  $$,
  '42501',
  null,
  'agent cannot INSERT into event_role_assignments under broadened RLS '
  '(WITH CHECK denial fires because agent is not organizer for event 1)'
);

delete from public.event_role_assignments
 where user_id = '10000000-1000-4000-8000-000000000001'::uuid;

select is(
  (
    select count(*)::int
      from public.event_role_assignments
     where user_id = '10000000-1000-4000-8000-000000000001'::uuid
  ),
  1,
  'agent DELETE on event_role_assignments affects zero rows under '
  'broadened RLS (row still present)'
);

reset role;

select * from finish();
rollback;
