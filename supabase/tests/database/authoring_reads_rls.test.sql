-- M2 phase 2.1.1 — RLS read broadening for the authoring surface.
--
-- Exercises the broadened authenticated-read paths on
-- public.game_event_drafts and public.game_event_versions, plus the
-- transitive read of public.game_event_admin_status (security_invoker
-- view that joins both). Each role context flips to `authenticated`
-- with the role's JWT claims around the SELECT so RLS actually
-- evaluates (pgTAP assertions themselves run as the test runner role,
-- which is a superuser and bypasses RLS).
--
-- Coverage:
--   * Structural — every broadened policy is present in pg_policies
--     and the dropped root-only policies are gone.
--   * Behavioral — exhaustive role matrix on both tables and the view:
--       organizer-A sees their own event, not event B
--       organizer-B sees their own event, not event A
--       agent-A is not admitted to drafts/versions (agents have no
--         authoring read access; their read path is game_entitlements)
--       unrelated-authenticated sees nothing
--       root-admin sees everything
--   * Anon is privilege-layer-denied (no SELECT grant on
--     game_event_drafts or game_event_versions) — no separate anon
--     assertion needed since the privilege denial is structural.
--
-- Writes are not asserted here; INSERT/UPDATE/DELETE on these tables
-- stay root-only via the existing "admins can …" policies, exercised
-- by game_authoring_phase2_auth.test.sql.
begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

-- ─── Structural ────────────────────────────────────────────────────────────

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_event_drafts'
      and policyname = 'organizers and admins can read drafts'
      and cmd = 'SELECT'
  ),
  'game_event_drafts has the broadened SELECT policy'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_event_drafts'
      and policyname = 'admins can read drafts'
  ),
  'game_event_drafts no longer has the root-only SELECT policy'
);

select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_event_versions'
      and policyname = 'organizers and admins can read versions'
      and cmd = 'SELECT'
  ),
  'game_event_versions has the broadened SELECT policy'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'game_event_versions'
      and policyname = 'admins can read versions'
  ),
  'game_event_versions no longer has the root-only SELECT policy'
);

-- ─── Fixtures ──────────────────────────────────────────────────────────────
-- Replica mode suppresses FK triggers so event_role_assignments can be
-- seeded with synthetic UUIDs that have no auth.users row. Reset to
-- 'origin' before any trigger-dependent assertion (none in this file —
-- all assertions are SELECTs).
set local session_replication_role = 'replica';

-- Two events for cross-event isolation. Event A is unpublished (only a
-- draft exists; no game_events row yet). Event B is published (draft +
-- game_events + game_event_versions). Covers the two states the admin
-- status view distinguishes.
insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes,
  entitlement_label, intro, summary, feedback_mode, published_at
)
values
  (
    'auth-rls-evt-b', 'auth-rls-evt-b', 'ARB',
    'Auth RLS Event B', 'Seattle', 2, 'reward',
    'Intro', 'Summary', 'final_score_reveal',
    now()
  );

insert into public.game_event_drafts (
  id, slug, event_code, name, content, last_published_version_number,
  last_published_at
)
values
  (
    'auth-rls-evt-a', 'auth-rls-evt-a', 'ARA',
    'Auth RLS Event A',
    '{"questions":[]}'::jsonb, null, null
  ),
  (
    'auth-rls-evt-b', 'auth-rls-evt-b', 'ARB',
    'Auth RLS Event B',
    '{"questions":[]}'::jsonb, 1, now()
  );

insert into public.game_event_versions (
  event_id, version_number, content, published_at
)
values
  (
    'auth-rls-evt-b', 1,
    '{"questions":[]}'::jsonb, now()
  );

-- Synthetic test UUIDs — organizer for event A, organizer for event B,
-- agent for event A (agents must not gain read access to drafts/versions),
-- unrelated authenticated user. Root admin via admin_users.
insert into public.event_role_assignments (user_id, event_id, role)
values
  (
    '11111111-1100-4000-8000-000000000001'::uuid,
    'auth-rls-evt-a',
    'organizer'
  ),
  (
    '22222222-2200-4000-8000-000000000002'::uuid,
    'auth-rls-evt-b',
    'organizer'
  ),
  (
    '33333333-3300-4000-8000-000000000003'::uuid,
    'auth-rls-evt-a',
    'agent'
  );

insert into public.admin_users (email)
values ('auth-rls-root@example.com');

-- ─── Organizer A reads event A only ────────────────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1100-4000-8000-000000000001"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.game_event_drafts
    where id = 'auth-rls-evt-a'),
  1,
  'organizer-A sees draft A via RLS'
);

select is(
  (select count(*)::int from public.game_event_drafts
    where id = 'auth-rls-evt-b'),
  0,
  'organizer-A does not see draft B (RLS filters out)'
);

select is(
  (select count(*)::int from public.game_event_versions
    where event_id = 'auth-rls-evt-b'),
  0,
  'organizer-A does not see versions for event B'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Organizer B reads event B only ────────────────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"22222222-2200-4000-8000-000000000002"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.game_event_drafts
    where id = 'auth-rls-evt-b'),
  1,
  'organizer-B sees draft B via RLS'
);

select is(
  (select count(*)::int from public.game_event_drafts
    where id = 'auth-rls-evt-a'),
  0,
  'organizer-B does not see draft A (RLS filters out)'
);

select is(
  (select count(*)::int from public.game_event_versions
    where event_id = 'auth-rls-evt-b'),
  1,
  'organizer-B sees version 1 of event B via RLS'
);

select is(
  (select count(*)::int from public.game_event_admin_status
    where event_id = 'auth-rls-evt-b'),
  1,
  'organizer-B sees event B status via the security_invoker view'
);

select is(
  (select status from public.game_event_admin_status
    where event_id = 'auth-rls-evt-b'),
  'live',
  'event B status reads as "live" for organizer-B (joins versions correctly)'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Agent A is not admitted to authoring reads ────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"33333333-3300-4000-8000-000000000003"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.game_event_drafts
    where id = 'auth-rls-evt-a'),
  0,
  'agent-A does not see draft A (agents have no authoring read access)'
);

select is(
  (select count(*)::int from public.game_event_versions
    where event_id = 'auth-rls-evt-b'),
  0,
  'agent-A does not see versions (agents have no authoring read access)'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Unrelated authenticated user sees nothing ─────────────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"99999999-9900-4000-8000-000000000099"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.game_event_drafts),
  0,
  'unrelated authenticated user sees no drafts'
);

select is(
  (select count(*)::int from public.game_event_versions),
  0,
  'unrelated authenticated user sees no versions'
);

select is(
  (select count(*)::int from public.game_event_admin_status),
  0,
  'unrelated authenticated user sees no rows in the admin status view'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Root admin sees everything ────────────────────────────────────────────
-- Stamp a request.jwt.claims with the email matching admin_users so
-- public.is_admin() / public.is_root_admin() resolves true.

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"auth-rls-root@example.com","sub":"99999999-9900-4000-8000-000000000088"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.game_event_drafts
    where id like 'auth-rls-%'),
  2,
  'root admin sees both drafts'
);

select is(
  (select count(*)::int from public.game_event_versions
    where event_id like 'auth-rls-%'),
  1,
  'root admin sees event B version'
);

select is(
  (select count(*)::int from public.game_event_admin_status
    where event_id like 'auth-rls-%'),
  2,
  'root admin sees both events in the admin status view'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Privilege-layer assertions ────────────────────────────────────────────
-- Single-privilege calls per the Privilege-test vacuous-pass audit. These
-- are baseline grants: the policies only fire when the privilege is held.

select ok(
  has_table_privilege('authenticated', 'public.game_event_drafts', 'SELECT'),
  'authenticated has SELECT privilege on game_event_drafts'
);

select ok(
  has_table_privilege('authenticated', 'public.game_event_versions', 'SELECT'),
  'authenticated has SELECT privilege on game_event_versions'
);

select * from finish();

rollback;
