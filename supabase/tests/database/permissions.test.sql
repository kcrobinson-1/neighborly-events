-- Consolidated permissions surface for `public.*`.
--
-- Pair with `shared/db/permissions.snapshot.md` — the snapshot and
-- this file are two views on the same end state (see CCI-3 in
-- docs/plans/db-permissions-snapshot.md). The snapshot catches drift
-- between committed inventory and the live DB at regeneration time;
-- this file catches drift between expected assertions and the live DB
-- at test-run time. Together they bound the answer to "what RLS state,
-- grants, policies, function SECURITY mode, and function EXECUTE
-- access are in force on `public.X` today."
--
-- Form: flat-verbose. Every assertion is written out per
-- (role, target, privilege) rather than generated through helpers, so
-- a reader can grep the file for any (table-or-function, role,
-- privilege) cell and find the explicit expectation. Inventory matches
-- shared/db/types.ts (public:Tables, public:Views, public:Functions).
--
-- Per-role coverage spans anon, authenticated, service_role, and the
-- PUBLIC pseudo-role. Per-relation privileges cover the SQL-standard
-- grantable set: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES,
-- TRIGGER. Per-function privilege: EXECUTE.
--
-- Trigger functions (return type `trigger`) are excluded because
-- public:Functions in shared/db/types.ts excludes them; they are
-- internal machinery rather than callable API surface.
--
-- Overlap with existing per-feature pgTAP files (feedback_tables,
-- game_authoring_phase*, redemption_*, etc.) is intentional and
-- additive per the plan; de-dup is a follow-up.

begin;

create extension if not exists pgtap with schema extensions;

-- Mirror the snapshot generator's search_path so policy quals fetched
-- below schema-qualify references the same way (canonical form).
-- Public is intentionally not on the search_path so pg_get_expr (the
-- source of pg_policies.qual / with_check) emits explicit `public.`
-- prefixes; extensions stays on so pgTAP's plan/ok/is/has_* resolve.
set local search_path = extensions, pg_catalog;

select plan(609);

-- ────────────────────────────────────────────────────────────────────
-- Tables
-- ────────────────────────────────────────────────────────────────────

-- ─── public.admin_users ─────────────────────────────────────────────

select has_table('public', 'admin_users', 'public.admin_users exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'admin_users'),
  'public.admin_users has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.admin_users', 'SELECT'),     'anon SELECT on public.admin_users is denied');
select ok(not has_table_privilege('anon',          'public.admin_users', 'INSERT'),     'anon INSERT on public.admin_users is denied');
select ok(not has_table_privilege('anon',          'public.admin_users', 'UPDATE'),     'anon UPDATE on public.admin_users is denied');
select ok(not has_table_privilege('anon',          'public.admin_users', 'DELETE'),     'anon DELETE on public.admin_users is denied');
select ok(not has_table_privilege('anon',          'public.admin_users', 'TRUNCATE'),   'anon TRUNCATE on public.admin_users is denied');
select ok(not has_table_privilege('anon',          'public.admin_users', 'REFERENCES'), 'anon REFERENCES on public.admin_users is denied');
select ok(not has_table_privilege('anon',          'public.admin_users', 'TRIGGER'),    'anon TRIGGER on public.admin_users is denied');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'SELECT'),     'authenticated SELECT on public.admin_users is denied');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'INSERT'),     'authenticated INSERT on public.admin_users is denied');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'UPDATE'),     'authenticated UPDATE on public.admin_users is denied');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'DELETE'),     'authenticated DELETE on public.admin_users is denied');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'TRUNCATE'),   'authenticated TRUNCATE on public.admin_users is denied');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'REFERENCES'), 'authenticated REFERENCES on public.admin_users is denied');
select ok(not has_table_privilege('authenticated', 'public.admin_users', 'TRIGGER'),    'authenticated TRIGGER on public.admin_users is denied');
select ok(    has_table_privilege('service_role',  'public.admin_users', 'SELECT'),     'service_role SELECT on public.admin_users is granted');
select ok(    has_table_privilege('service_role',  'public.admin_users', 'INSERT'),     'service_role INSERT on public.admin_users is granted');
select ok(    has_table_privilege('service_role',  'public.admin_users', 'UPDATE'),     'service_role UPDATE on public.admin_users is granted');
select ok(    has_table_privilege('service_role',  'public.admin_users', 'DELETE'),     'service_role DELETE on public.admin_users is granted');
select ok(    has_table_privilege('service_role',  'public.admin_users', 'TRUNCATE'),   'service_role TRUNCATE on public.admin_users is granted');
select ok(    has_table_privilege('service_role',  'public.admin_users', 'REFERENCES'), 'service_role REFERENCES on public.admin_users is granted');
select ok(    has_table_privilege('service_role',  'public.admin_users', 'TRIGGER'),    'service_role TRIGGER on public.admin_users is granted');
select ok(not has_table_privilege('public',        'public.admin_users', 'SELECT'),     'public SELECT on public.admin_users is denied');
select ok(not has_table_privilege('public',        'public.admin_users', 'INSERT'),     'public INSERT on public.admin_users is denied');
select ok(not has_table_privilege('public',        'public.admin_users', 'UPDATE'),     'public UPDATE on public.admin_users is denied');
select ok(not has_table_privilege('public',        'public.admin_users', 'DELETE'),     'public DELETE on public.admin_users is denied');
select ok(not has_table_privilege('public',        'public.admin_users', 'TRUNCATE'),   'public TRUNCATE on public.admin_users is denied');
select ok(not has_table_privilege('public',        'public.admin_users', 'REFERENCES'), 'public REFERENCES on public.admin_users is denied');
select ok(not has_table_privilege('public',        'public.admin_users', 'TRIGGER'),    'public TRIGGER on public.admin_users is denied');

select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'admin_users'),
  0,
  'public.admin_users has no policies'
);

-- ─── public.event_role_assignments ──────────────────────────────────

select has_table('public', 'event_role_assignments', 'public.event_role_assignments exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'event_role_assignments'),
  'public.event_role_assignments has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.event_role_assignments', 'SELECT'),     'anon SELECT on public.event_role_assignments is denied');
select ok(not has_table_privilege('anon',          'public.event_role_assignments', 'INSERT'),     'anon INSERT on public.event_role_assignments is denied');
select ok(not has_table_privilege('anon',          'public.event_role_assignments', 'UPDATE'),     'anon UPDATE on public.event_role_assignments is denied');
select ok(not has_table_privilege('anon',          'public.event_role_assignments', 'DELETE'),     'anon DELETE on public.event_role_assignments is denied');
select ok(not has_table_privilege('anon',          'public.event_role_assignments', 'TRUNCATE'),   'anon TRUNCATE on public.event_role_assignments is denied');
select ok(not has_table_privilege('anon',          'public.event_role_assignments', 'REFERENCES'), 'anon REFERENCES on public.event_role_assignments is denied');
select ok(not has_table_privilege('anon',          'public.event_role_assignments', 'TRIGGER'),    'anon TRIGGER on public.event_role_assignments is denied');
select ok(    has_table_privilege('authenticated', 'public.event_role_assignments', 'SELECT'),     'authenticated SELECT on public.event_role_assignments is granted');
select ok(    has_table_privilege('authenticated', 'public.event_role_assignments', 'INSERT'),     'authenticated INSERT on public.event_role_assignments is granted');
select ok(not has_table_privilege('authenticated', 'public.event_role_assignments', 'UPDATE'),     'authenticated UPDATE on public.event_role_assignments is denied');
select ok(    has_table_privilege('authenticated', 'public.event_role_assignments', 'DELETE'),     'authenticated DELETE on public.event_role_assignments is granted');
select ok(not has_table_privilege('authenticated', 'public.event_role_assignments', 'TRUNCATE'),   'authenticated TRUNCATE on public.event_role_assignments is denied');
select ok(not has_table_privilege('authenticated', 'public.event_role_assignments', 'REFERENCES'), 'authenticated REFERENCES on public.event_role_assignments is denied');
select ok(not has_table_privilege('authenticated', 'public.event_role_assignments', 'TRIGGER'),    'authenticated TRIGGER on public.event_role_assignments is denied');
select ok(    has_table_privilege('service_role',  'public.event_role_assignments', 'SELECT'),     'service_role SELECT on public.event_role_assignments is granted');
select ok(    has_table_privilege('service_role',  'public.event_role_assignments', 'INSERT'),     'service_role INSERT on public.event_role_assignments is granted');
select ok(not has_table_privilege('service_role',  'public.event_role_assignments', 'UPDATE'),     'service_role UPDATE on public.event_role_assignments is denied');
select ok(    has_table_privilege('service_role',  'public.event_role_assignments', 'DELETE'),     'service_role DELETE on public.event_role_assignments is granted');
select ok(    has_table_privilege('service_role',  'public.event_role_assignments', 'TRUNCATE'),   'service_role TRUNCATE on public.event_role_assignments is granted');
select ok(    has_table_privilege('service_role',  'public.event_role_assignments', 'REFERENCES'), 'service_role REFERENCES on public.event_role_assignments is granted');
select ok(    has_table_privilege('service_role',  'public.event_role_assignments', 'TRIGGER'),    'service_role TRIGGER on public.event_role_assignments is granted');
select ok(not has_table_privilege('public',        'public.event_role_assignments', 'SELECT'),     'public SELECT on public.event_role_assignments is denied');
select ok(not has_table_privilege('public',        'public.event_role_assignments', 'INSERT'),     'public INSERT on public.event_role_assignments is denied');
select ok(not has_table_privilege('public',        'public.event_role_assignments', 'UPDATE'),     'public UPDATE on public.event_role_assignments is denied');
select ok(not has_table_privilege('public',        'public.event_role_assignments', 'DELETE'),     'public DELETE on public.event_role_assignments is denied');
select ok(not has_table_privilege('public',        'public.event_role_assignments', 'TRUNCATE'),   'public TRUNCATE on public.event_role_assignments is denied');
select ok(not has_table_privilege('public',        'public.event_role_assignments', 'REFERENCES'), 'public REFERENCES on public.event_role_assignments is denied');
select ok(not has_table_privilege('public',        'public.event_role_assignments', 'TRIGGER'),    'public TRIGGER on public.event_role_assignments is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_role_assignments'
      and policyname = 'organizers and admins can delete role assignments'
      and cmd = 'DELETE' and roles = '{authenticated}'),
  'event_role_assignments policy "organizers and admins can delete role assignments" exists FOR DELETE TO authenticated'
);
select is(
  (select qual from pg_policies
    where schemaname = 'public' and tablename = 'event_role_assignments'
      and policyname = 'organizers and admins can delete role assignments'),
  '(public.is_organizer_for_event(event_id) OR public.is_root_admin())',
  'event_role_assignments delete policy USING shape matches snapshot'
);
select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_role_assignments'
      and policyname = 'organizers and admins can insert role assignments'
      and cmd = 'INSERT' and roles = '{authenticated}'),
  'event_role_assignments policy "organizers and admins can insert role assignments" exists FOR INSERT TO authenticated'
);
select is(
  (select with_check from pg_policies
    where schemaname = 'public' and tablename = 'event_role_assignments'
      and policyname = 'organizers and admins can insert role assignments'),
  '(public.is_organizer_for_event(event_id) OR public.is_root_admin())',
  'event_role_assignments insert policy WITH CHECK shape matches snapshot'
);
select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'event_role_assignments'
      and policyname = 'users, organizers, and admins can read role assignments'
      and cmd = 'SELECT' and roles = '{authenticated}'),
  'event_role_assignments policy "users, organizers, and admins can read role assignments" exists FOR SELECT TO authenticated'
);
select is(
  (select qual from pg_policies
    where schemaname = 'public' and tablename = 'event_role_assignments'
      and policyname = 'users, organizers, and admins can read role assignments'),
  '((user_id = public.current_request_user_id()) OR public.is_organizer_for_event(event_id) OR public.is_root_admin())',
  'event_role_assignments select policy USING shape matches snapshot'
);

-- ─── public.feedback_enabled_events ─────────────────────────────────

select has_table('public', 'feedback_enabled_events', 'public.feedback_enabled_events exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'feedback_enabled_events'),
  'public.feedback_enabled_events has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.feedback_enabled_events', 'SELECT'),     'anon SELECT on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.feedback_enabled_events', 'INSERT'),     'anon INSERT on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.feedback_enabled_events', 'UPDATE'),     'anon UPDATE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.feedback_enabled_events', 'DELETE'),     'anon DELETE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.feedback_enabled_events', 'TRUNCATE'),   'anon TRUNCATE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.feedback_enabled_events', 'REFERENCES'), 'anon REFERENCES on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.feedback_enabled_events', 'TRIGGER'),    'anon TRIGGER on public.feedback_enabled_events is denied');
select ok(    has_table_privilege('authenticated', 'public.feedback_enabled_events', 'SELECT'),     'authenticated SELECT on public.feedback_enabled_events is granted');
select ok(not has_table_privilege('authenticated', 'public.feedback_enabled_events', 'INSERT'),     'authenticated INSERT on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_enabled_events', 'UPDATE'),     'authenticated UPDATE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_enabled_events', 'DELETE'),     'authenticated DELETE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_enabled_events', 'TRUNCATE'),   'authenticated TRUNCATE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_enabled_events', 'REFERENCES'), 'authenticated REFERENCES on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_enabled_events', 'TRIGGER'),    'authenticated TRIGGER on public.feedback_enabled_events is denied');
select ok(    has_table_privilege('service_role',  'public.feedback_enabled_events', 'SELECT'),     'service_role SELECT on public.feedback_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_enabled_events', 'INSERT'),     'service_role INSERT on public.feedback_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_enabled_events', 'UPDATE'),     'service_role UPDATE on public.feedback_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_enabled_events', 'DELETE'),     'service_role DELETE on public.feedback_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_enabled_events', 'TRUNCATE'),   'service_role TRUNCATE on public.feedback_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_enabled_events', 'REFERENCES'), 'service_role REFERENCES on public.feedback_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_enabled_events', 'TRIGGER'),    'service_role TRIGGER on public.feedback_enabled_events is granted');
select ok(not has_table_privilege('public',        'public.feedback_enabled_events', 'SELECT'),     'public SELECT on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.feedback_enabled_events', 'INSERT'),     'public INSERT on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.feedback_enabled_events', 'UPDATE'),     'public UPDATE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.feedback_enabled_events', 'DELETE'),     'public DELETE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.feedback_enabled_events', 'TRUNCATE'),   'public TRUNCATE on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.feedback_enabled_events', 'REFERENCES'), 'public REFERENCES on public.feedback_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.feedback_enabled_events', 'TRIGGER'),    'public TRIGGER on public.feedback_enabled_events is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback_enabled_events'
      and policyname = 'organizers and admins can read feedback registry'
      and cmd = 'SELECT' and roles = '{authenticated}'),
  'feedback_enabled_events policy "organizers and admins can read feedback registry" exists FOR SELECT TO authenticated'
);
select is(
  regexp_replace(
    (select qual from pg_policies
      where schemaname = 'public' and tablename = 'feedback_enabled_events'
        and policyname = 'organizers and admins can read feedback registry'),
    '\s+', ' ', 'g'),
  '(public.is_organizer_for_event(( SELECT ge.id FROM public.game_events ge WHERE (ge.slug = feedback_enabled_events.slug))) OR public.is_root_admin())',
  'feedback_enabled_events read policy USING shape matches snapshot'
);

-- ─── public.feedback_submissions ────────────────────────────────────

select has_table('public', 'feedback_submissions', 'public.feedback_submissions exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'feedback_submissions'),
  'public.feedback_submissions has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.feedback_submissions', 'SELECT'),     'anon SELECT on public.feedback_submissions is denied');
select ok(not has_table_privilege('anon',          'public.feedback_submissions', 'INSERT'),     'anon INSERT on public.feedback_submissions is denied');
select ok(not has_table_privilege('anon',          'public.feedback_submissions', 'UPDATE'),     'anon UPDATE on public.feedback_submissions is denied');
select ok(not has_table_privilege('anon',          'public.feedback_submissions', 'DELETE'),     'anon DELETE on public.feedback_submissions is denied');
select ok(not has_table_privilege('anon',          'public.feedback_submissions', 'TRUNCATE'),   'anon TRUNCATE on public.feedback_submissions is denied');
select ok(not has_table_privilege('anon',          'public.feedback_submissions', 'REFERENCES'), 'anon REFERENCES on public.feedback_submissions is denied');
select ok(not has_table_privilege('anon',          'public.feedback_submissions', 'TRIGGER'),    'anon TRIGGER on public.feedback_submissions is denied');
select ok(    has_table_privilege('authenticated', 'public.feedback_submissions', 'SELECT'),     'authenticated SELECT on public.feedback_submissions is granted');
select ok(not has_table_privilege('authenticated', 'public.feedback_submissions', 'INSERT'),     'authenticated INSERT on public.feedback_submissions is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_submissions', 'UPDATE'),     'authenticated UPDATE on public.feedback_submissions is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_submissions', 'DELETE'),     'authenticated DELETE on public.feedback_submissions is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_submissions', 'TRUNCATE'),   'authenticated TRUNCATE on public.feedback_submissions is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_submissions', 'REFERENCES'), 'authenticated REFERENCES on public.feedback_submissions is denied');
select ok(not has_table_privilege('authenticated', 'public.feedback_submissions', 'TRIGGER'),    'authenticated TRIGGER on public.feedback_submissions is denied');
select ok(    has_table_privilege('service_role',  'public.feedback_submissions', 'SELECT'),     'service_role SELECT on public.feedback_submissions is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_submissions', 'INSERT'),     'service_role INSERT on public.feedback_submissions is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_submissions', 'UPDATE'),     'service_role UPDATE on public.feedback_submissions is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_submissions', 'DELETE'),     'service_role DELETE on public.feedback_submissions is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_submissions', 'TRUNCATE'),   'service_role TRUNCATE on public.feedback_submissions is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_submissions', 'REFERENCES'), 'service_role REFERENCES on public.feedback_submissions is granted');
select ok(    has_table_privilege('service_role',  'public.feedback_submissions', 'TRIGGER'),    'service_role TRIGGER on public.feedback_submissions is granted');
select ok(not has_table_privilege('public',        'public.feedback_submissions', 'SELECT'),     'public SELECT on public.feedback_submissions is denied');
select ok(not has_table_privilege('public',        'public.feedback_submissions', 'INSERT'),     'public INSERT on public.feedback_submissions is denied');
select ok(not has_table_privilege('public',        'public.feedback_submissions', 'UPDATE'),     'public UPDATE on public.feedback_submissions is denied');
select ok(not has_table_privilege('public',        'public.feedback_submissions', 'DELETE'),     'public DELETE on public.feedback_submissions is denied');
select ok(not has_table_privilege('public',        'public.feedback_submissions', 'TRUNCATE'),   'public TRUNCATE on public.feedback_submissions is denied');
select ok(not has_table_privilege('public',        'public.feedback_submissions', 'REFERENCES'), 'public REFERENCES on public.feedback_submissions is denied');
select ok(not has_table_privilege('public',        'public.feedback_submissions', 'TRIGGER'),    'public TRIGGER on public.feedback_submissions is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feedback_submissions'
      and policyname = 'organizers and admins can read event feedback'
      and cmd = 'SELECT' and roles = '{authenticated}'),
  'feedback_submissions policy "organizers and admins can read event feedback" exists FOR SELECT TO authenticated'
);
select is(
  regexp_replace(
    (select qual from pg_policies
      where schemaname = 'public' and tablename = 'feedback_submissions'
        and policyname = 'organizers and admins can read event feedback'),
    '\s+', ' ', 'g'),
  '(public.is_organizer_for_event(( SELECT ge.id FROM public.game_events ge WHERE (ge.slug = feedback_submissions.event_slug))) OR public.is_root_admin())',
  'feedback_submissions read policy USING shape matches snapshot'
);

-- ─── public.game_completions ────────────────────────────────────────

select has_table('public', 'game_completions', 'public.game_completions exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_completions'),
  'public.game_completions has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.game_completions', 'SELECT'),     'anon SELECT on public.game_completions is denied');
select ok(not has_table_privilege('anon',          'public.game_completions', 'INSERT'),     'anon INSERT on public.game_completions is denied');
select ok(not has_table_privilege('anon',          'public.game_completions', 'UPDATE'),     'anon UPDATE on public.game_completions is denied');
select ok(not has_table_privilege('anon',          'public.game_completions', 'DELETE'),     'anon DELETE on public.game_completions is denied');
select ok(not has_table_privilege('anon',          'public.game_completions', 'TRUNCATE'),   'anon TRUNCATE on public.game_completions is denied');
select ok(not has_table_privilege('anon',          'public.game_completions', 'REFERENCES'), 'anon REFERENCES on public.game_completions is denied');
select ok(not has_table_privilege('anon',          'public.game_completions', 'TRIGGER'),    'anon TRIGGER on public.game_completions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_completions', 'SELECT'),     'authenticated SELECT on public.game_completions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_completions', 'INSERT'),     'authenticated INSERT on public.game_completions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_completions', 'UPDATE'),     'authenticated UPDATE on public.game_completions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_completions', 'DELETE'),     'authenticated DELETE on public.game_completions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_completions', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_completions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_completions', 'REFERENCES'), 'authenticated REFERENCES on public.game_completions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_completions', 'TRIGGER'),    'authenticated TRIGGER on public.game_completions is denied');
select ok(    has_table_privilege('service_role',  'public.game_completions', 'SELECT'),     'service_role SELECT on public.game_completions is granted');
select ok(    has_table_privilege('service_role',  'public.game_completions', 'INSERT'),     'service_role INSERT on public.game_completions is granted');
select ok(    has_table_privilege('service_role',  'public.game_completions', 'UPDATE'),     'service_role UPDATE on public.game_completions is granted');
select ok(    has_table_privilege('service_role',  'public.game_completions', 'DELETE'),     'service_role DELETE on public.game_completions is granted');
select ok(    has_table_privilege('service_role',  'public.game_completions', 'TRUNCATE'),   'service_role TRUNCATE on public.game_completions is granted');
select ok(    has_table_privilege('service_role',  'public.game_completions', 'REFERENCES'), 'service_role REFERENCES on public.game_completions is granted');
select ok(    has_table_privilege('service_role',  'public.game_completions', 'TRIGGER'),    'service_role TRIGGER on public.game_completions is granted');
select ok(not has_table_privilege('public',        'public.game_completions', 'SELECT'),     'public SELECT on public.game_completions is denied');
select ok(not has_table_privilege('public',        'public.game_completions', 'INSERT'),     'public INSERT on public.game_completions is denied');
select ok(not has_table_privilege('public',        'public.game_completions', 'UPDATE'),     'public UPDATE on public.game_completions is denied');
select ok(not has_table_privilege('public',        'public.game_completions', 'DELETE'),     'public DELETE on public.game_completions is denied');
select ok(not has_table_privilege('public',        'public.game_completions', 'TRUNCATE'),   'public TRUNCATE on public.game_completions is denied');
select ok(not has_table_privilege('public',        'public.game_completions', 'REFERENCES'), 'public REFERENCES on public.game_completions is denied');
select ok(not has_table_privilege('public',        'public.game_completions', 'TRIGGER'),    'public TRIGGER on public.game_completions is denied');

select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'game_completions'),
  0,
  'public.game_completions has no policies'
);

-- ─── public.game_entitlements ───────────────────────────────────────

select has_table('public', 'game_entitlements', 'public.game_entitlements exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_entitlements'),
  'public.game_entitlements has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.game_entitlements', 'SELECT'),     'anon SELECT on public.game_entitlements is denied');
select ok(not has_table_privilege('anon',          'public.game_entitlements', 'INSERT'),     'anon INSERT on public.game_entitlements is denied');
select ok(not has_table_privilege('anon',          'public.game_entitlements', 'UPDATE'),     'anon UPDATE on public.game_entitlements is denied');
select ok(not has_table_privilege('anon',          'public.game_entitlements', 'DELETE'),     'anon DELETE on public.game_entitlements is denied');
select ok(not has_table_privilege('anon',          'public.game_entitlements', 'TRUNCATE'),   'anon TRUNCATE on public.game_entitlements is denied');
select ok(not has_table_privilege('anon',          'public.game_entitlements', 'REFERENCES'), 'anon REFERENCES on public.game_entitlements is denied');
select ok(not has_table_privilege('anon',          'public.game_entitlements', 'TRIGGER'),    'anon TRIGGER on public.game_entitlements is denied');
select ok(    has_table_privilege('authenticated', 'public.game_entitlements', 'SELECT'),     'authenticated SELECT on public.game_entitlements is granted');
select ok(not has_table_privilege('authenticated', 'public.game_entitlements', 'INSERT'),     'authenticated INSERT on public.game_entitlements is denied');
select ok(not has_table_privilege('authenticated', 'public.game_entitlements', 'UPDATE'),     'authenticated UPDATE on public.game_entitlements is denied');
select ok(not has_table_privilege('authenticated', 'public.game_entitlements', 'DELETE'),     'authenticated DELETE on public.game_entitlements is denied');
select ok(not has_table_privilege('authenticated', 'public.game_entitlements', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_entitlements is denied');
select ok(not has_table_privilege('authenticated', 'public.game_entitlements', 'REFERENCES'), 'authenticated REFERENCES on public.game_entitlements is denied');
select ok(not has_table_privilege('authenticated', 'public.game_entitlements', 'TRIGGER'),    'authenticated TRIGGER on public.game_entitlements is denied');
select ok(    has_table_privilege('service_role',  'public.game_entitlements', 'SELECT'),     'service_role SELECT on public.game_entitlements is granted');
select ok(    has_table_privilege('service_role',  'public.game_entitlements', 'INSERT'),     'service_role INSERT on public.game_entitlements is granted');
select ok(    has_table_privilege('service_role',  'public.game_entitlements', 'UPDATE'),     'service_role UPDATE on public.game_entitlements is granted');
select ok(    has_table_privilege('service_role',  'public.game_entitlements', 'DELETE'),     'service_role DELETE on public.game_entitlements is granted');
select ok(    has_table_privilege('service_role',  'public.game_entitlements', 'TRUNCATE'),   'service_role TRUNCATE on public.game_entitlements is granted');
select ok(    has_table_privilege('service_role',  'public.game_entitlements', 'REFERENCES'), 'service_role REFERENCES on public.game_entitlements is granted');
select ok(    has_table_privilege('service_role',  'public.game_entitlements', 'TRIGGER'),    'service_role TRIGGER on public.game_entitlements is granted');
select ok(not has_table_privilege('public',        'public.game_entitlements', 'SELECT'),     'public SELECT on public.game_entitlements is denied');
select ok(not has_table_privilege('public',        'public.game_entitlements', 'INSERT'),     'public INSERT on public.game_entitlements is denied');
select ok(not has_table_privilege('public',        'public.game_entitlements', 'UPDATE'),     'public UPDATE on public.game_entitlements is denied');
select ok(not has_table_privilege('public',        'public.game_entitlements', 'DELETE'),     'public DELETE on public.game_entitlements is denied');
select ok(not has_table_privilege('public',        'public.game_entitlements', 'TRUNCATE'),   'public TRUNCATE on public.game_entitlements is denied');
select ok(not has_table_privilege('public',        'public.game_entitlements', 'REFERENCES'), 'public REFERENCES on public.game_entitlements is denied');
select ok(not has_table_privilege('public',        'public.game_entitlements', 'TRIGGER'),    'public TRIGGER on public.game_entitlements is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_entitlements'
      and policyname = 'assigned operators can read event entitlements'
      and cmd = 'SELECT' and roles = '{authenticated}'),
  'game_entitlements policy "assigned operators can read event entitlements" exists FOR SELECT TO authenticated'
);
select is(
  (select qual from pg_policies
    where schemaname = 'public' and tablename = 'game_entitlements'
      and policyname = 'assigned operators can read event entitlements'),
  '(public.is_agent_for_event(event_id) OR public.is_organizer_for_event(event_id) OR public.is_root_admin())',
  'game_entitlements read policy USING shape matches snapshot'
);

-- ─── public.game_event_audit_log ────────────────────────────────────

select has_table('public', 'game_event_audit_log', 'public.game_event_audit_log exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_event_audit_log'),
  'public.game_event_audit_log has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.game_event_audit_log', 'SELECT'),     'anon SELECT on public.game_event_audit_log is denied');
select ok(not has_table_privilege('anon',          'public.game_event_audit_log', 'INSERT'),     'anon INSERT on public.game_event_audit_log is denied');
select ok(not has_table_privilege('anon',          'public.game_event_audit_log', 'UPDATE'),     'anon UPDATE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('anon',          'public.game_event_audit_log', 'DELETE'),     'anon DELETE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('anon',          'public.game_event_audit_log', 'TRUNCATE'),   'anon TRUNCATE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('anon',          'public.game_event_audit_log', 'REFERENCES'), 'anon REFERENCES on public.game_event_audit_log is denied');
select ok(not has_table_privilege('anon',          'public.game_event_audit_log', 'TRIGGER'),    'anon TRIGGER on public.game_event_audit_log is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_audit_log', 'SELECT'),     'authenticated SELECT on public.game_event_audit_log is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_audit_log', 'INSERT'),     'authenticated INSERT on public.game_event_audit_log is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_audit_log', 'UPDATE'),     'authenticated UPDATE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_audit_log', 'DELETE'),     'authenticated DELETE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_audit_log', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_audit_log', 'REFERENCES'), 'authenticated REFERENCES on public.game_event_audit_log is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_audit_log', 'TRIGGER'),    'authenticated TRIGGER on public.game_event_audit_log is denied');
select ok(    has_table_privilege('service_role',  'public.game_event_audit_log', 'SELECT'),     'service_role SELECT on public.game_event_audit_log is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_audit_log', 'INSERT'),     'service_role INSERT on public.game_event_audit_log is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_audit_log', 'UPDATE'),     'service_role UPDATE on public.game_event_audit_log is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_audit_log', 'DELETE'),     'service_role DELETE on public.game_event_audit_log is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_audit_log', 'TRUNCATE'),   'service_role TRUNCATE on public.game_event_audit_log is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_audit_log', 'REFERENCES'), 'service_role REFERENCES on public.game_event_audit_log is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_audit_log', 'TRIGGER'),    'service_role TRIGGER on public.game_event_audit_log is granted');
select ok(not has_table_privilege('public',        'public.game_event_audit_log', 'SELECT'),     'public SELECT on public.game_event_audit_log is denied');
select ok(not has_table_privilege('public',        'public.game_event_audit_log', 'INSERT'),     'public INSERT on public.game_event_audit_log is denied');
select ok(not has_table_privilege('public',        'public.game_event_audit_log', 'UPDATE'),     'public UPDATE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('public',        'public.game_event_audit_log', 'DELETE'),     'public DELETE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('public',        'public.game_event_audit_log', 'TRUNCATE'),   'public TRUNCATE on public.game_event_audit_log is denied');
select ok(not has_table_privilege('public',        'public.game_event_audit_log', 'REFERENCES'), 'public REFERENCES on public.game_event_audit_log is denied');
select ok(not has_table_privilege('public',        'public.game_event_audit_log', 'TRIGGER'),    'public TRIGGER on public.game_event_audit_log is denied');

select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'game_event_audit_log'),
  0,
  'public.game_event_audit_log has no policies'
);

-- ─── public.game_event_drafts ───────────────────────────────────────

select has_table('public', 'game_event_drafts', 'public.game_event_drafts exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_event_drafts'),
  'public.game_event_drafts has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.game_event_drafts', 'SELECT'),     'anon SELECT on public.game_event_drafts is denied');
select ok(not has_table_privilege('anon',          'public.game_event_drafts', 'INSERT'),     'anon INSERT on public.game_event_drafts is denied');
select ok(not has_table_privilege('anon',          'public.game_event_drafts', 'UPDATE'),     'anon UPDATE on public.game_event_drafts is denied');
select ok(not has_table_privilege('anon',          'public.game_event_drafts', 'DELETE'),     'anon DELETE on public.game_event_drafts is denied');
select ok(not has_table_privilege('anon',          'public.game_event_drafts', 'TRUNCATE'),   'anon TRUNCATE on public.game_event_drafts is denied');
select ok(not has_table_privilege('anon',          'public.game_event_drafts', 'REFERENCES'), 'anon REFERENCES on public.game_event_drafts is denied');
select ok(not has_table_privilege('anon',          'public.game_event_drafts', 'TRIGGER'),    'anon TRIGGER on public.game_event_drafts is denied');
select ok(    has_table_privilege('authenticated', 'public.game_event_drafts', 'SELECT'),     'authenticated SELECT on public.game_event_drafts is granted');
select ok(not has_table_privilege('authenticated', 'public.game_event_drafts', 'INSERT'),     'authenticated INSERT on public.game_event_drafts is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_drafts', 'UPDATE'),     'authenticated UPDATE on public.game_event_drafts is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_drafts', 'DELETE'),     'authenticated DELETE on public.game_event_drafts is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_drafts', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_event_drafts is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_drafts', 'REFERENCES'), 'authenticated REFERENCES on public.game_event_drafts is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_drafts', 'TRIGGER'),    'authenticated TRIGGER on public.game_event_drafts is denied');
select ok(    has_table_privilege('service_role',  'public.game_event_drafts', 'SELECT'),     'service_role SELECT on public.game_event_drafts is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_drafts', 'INSERT'),     'service_role INSERT on public.game_event_drafts is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_drafts', 'UPDATE'),     'service_role UPDATE on public.game_event_drafts is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_drafts', 'DELETE'),     'service_role DELETE on public.game_event_drafts is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_drafts', 'TRUNCATE'),   'service_role TRUNCATE on public.game_event_drafts is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_drafts', 'REFERENCES'), 'service_role REFERENCES on public.game_event_drafts is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_drafts', 'TRIGGER'),    'service_role TRIGGER on public.game_event_drafts is granted');
select ok(not has_table_privilege('public',        'public.game_event_drafts', 'SELECT'),     'public SELECT on public.game_event_drafts is denied');
select ok(not has_table_privilege('public',        'public.game_event_drafts', 'INSERT'),     'public INSERT on public.game_event_drafts is denied');
select ok(not has_table_privilege('public',        'public.game_event_drafts', 'UPDATE'),     'public UPDATE on public.game_event_drafts is denied');
select ok(not has_table_privilege('public',        'public.game_event_drafts', 'DELETE'),     'public DELETE on public.game_event_drafts is denied');
select ok(not has_table_privilege('public',        'public.game_event_drafts', 'TRUNCATE'),   'public TRUNCATE on public.game_event_drafts is denied');
select ok(not has_table_privilege('public',        'public.game_event_drafts', 'REFERENCES'), 'public REFERENCES on public.game_event_drafts is denied');
select ok(not has_table_privilege('public',        'public.game_event_drafts', 'TRIGGER'),    'public TRIGGER on public.game_event_drafts is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'admins can delete drafts'
      and cmd = 'DELETE' and roles = '{authenticated}'),
  'game_event_drafts policy "admins can delete drafts" exists FOR DELETE TO authenticated'
);
select is(
  (select qual from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'admins can delete drafts'),
  'public.is_admin()',
  'game_event_drafts delete policy USING shape matches snapshot'
);
select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'admins can insert drafts'
      and cmd = 'INSERT' and roles = '{authenticated}'),
  'game_event_drafts policy "admins can insert drafts" exists FOR INSERT TO authenticated'
);
select is(
  (select with_check from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'admins can insert drafts'),
  'public.is_admin()',
  'game_event_drafts insert policy WITH CHECK shape matches snapshot'
);
select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'admins can update drafts'
      and cmd = 'UPDATE' and roles = '{authenticated}'),
  'game_event_drafts policy "admins can update drafts" exists FOR UPDATE TO authenticated'
);
select is(
  (select qual from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'admins can update drafts'),
  'public.is_admin()',
  'game_event_drafts update policy USING shape matches snapshot'
);
select is(
  (select with_check from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'admins can update drafts'),
  'public.is_admin()',
  'game_event_drafts update policy WITH CHECK shape matches snapshot'
);
select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'organizers and admins can read drafts'
      and cmd = 'SELECT' and roles = '{authenticated}'),
  'game_event_drafts policy "organizers and admins can read drafts" exists FOR SELECT TO authenticated'
);
select is(
  (select qual from pg_policies
    where schemaname = 'public' and tablename = 'game_event_drafts'
      and policyname = 'organizers and admins can read drafts'),
  '(public.is_organizer_for_event(id) OR public.is_root_admin())',
  'game_event_drafts read policy USING shape matches snapshot'
);

-- ─── public.game_event_versions ─────────────────────────────────────

select has_table('public', 'game_event_versions', 'public.game_event_versions exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_event_versions'),
  'public.game_event_versions has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.game_event_versions', 'SELECT'),     'anon SELECT on public.game_event_versions is denied');
select ok(not has_table_privilege('anon',          'public.game_event_versions', 'INSERT'),     'anon INSERT on public.game_event_versions is denied');
select ok(not has_table_privilege('anon',          'public.game_event_versions', 'UPDATE'),     'anon UPDATE on public.game_event_versions is denied');
select ok(not has_table_privilege('anon',          'public.game_event_versions', 'DELETE'),     'anon DELETE on public.game_event_versions is denied');
select ok(not has_table_privilege('anon',          'public.game_event_versions', 'TRUNCATE'),   'anon TRUNCATE on public.game_event_versions is denied');
select ok(not has_table_privilege('anon',          'public.game_event_versions', 'REFERENCES'), 'anon REFERENCES on public.game_event_versions is denied');
select ok(not has_table_privilege('anon',          'public.game_event_versions', 'TRIGGER'),    'anon TRIGGER on public.game_event_versions is denied');
select ok(    has_table_privilege('authenticated', 'public.game_event_versions', 'SELECT'),     'authenticated SELECT on public.game_event_versions is granted');
select ok(not has_table_privilege('authenticated', 'public.game_event_versions', 'INSERT'),     'authenticated INSERT on public.game_event_versions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_versions', 'UPDATE'),     'authenticated UPDATE on public.game_event_versions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_versions', 'DELETE'),     'authenticated DELETE on public.game_event_versions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_versions', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_event_versions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_versions', 'REFERENCES'), 'authenticated REFERENCES on public.game_event_versions is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_versions', 'TRIGGER'),    'authenticated TRIGGER on public.game_event_versions is denied');
select ok(    has_table_privilege('service_role',  'public.game_event_versions', 'SELECT'),     'service_role SELECT on public.game_event_versions is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_versions', 'INSERT'),     'service_role INSERT on public.game_event_versions is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_versions', 'UPDATE'),     'service_role UPDATE on public.game_event_versions is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_versions', 'DELETE'),     'service_role DELETE on public.game_event_versions is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_versions', 'TRUNCATE'),   'service_role TRUNCATE on public.game_event_versions is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_versions', 'REFERENCES'), 'service_role REFERENCES on public.game_event_versions is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_versions', 'TRIGGER'),    'service_role TRIGGER on public.game_event_versions is granted');
select ok(not has_table_privilege('public',        'public.game_event_versions', 'SELECT'),     'public SELECT on public.game_event_versions is denied');
select ok(not has_table_privilege('public',        'public.game_event_versions', 'INSERT'),     'public INSERT on public.game_event_versions is denied');
select ok(not has_table_privilege('public',        'public.game_event_versions', 'UPDATE'),     'public UPDATE on public.game_event_versions is denied');
select ok(not has_table_privilege('public',        'public.game_event_versions', 'DELETE'),     'public DELETE on public.game_event_versions is denied');
select ok(not has_table_privilege('public',        'public.game_event_versions', 'TRUNCATE'),   'public TRUNCATE on public.game_event_versions is denied');
select ok(not has_table_privilege('public',        'public.game_event_versions', 'REFERENCES'), 'public REFERENCES on public.game_event_versions is denied');
select ok(not has_table_privilege('public',        'public.game_event_versions', 'TRIGGER'),    'public TRIGGER on public.game_event_versions is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_event_versions'
      and policyname = 'organizers and admins can read versions'
      and cmd = 'SELECT' and roles = '{authenticated}'),
  'game_event_versions policy "organizers and admins can read versions" exists FOR SELECT TO authenticated'
);
select is(
  (select qual from pg_policies
    where schemaname = 'public' and tablename = 'game_event_versions'
      and policyname = 'organizers and admins can read versions'),
  '(public.is_organizer_for_event(event_id) OR public.is_root_admin())',
  'game_event_versions read policy USING shape matches snapshot'
);

-- ─── public.game_events ─────────────────────────────────────────────
-- All-roles grants reflect Supabase's default GRANT ALL on public
-- tables; RLS is the load-bearing gate.

select has_table('public', 'game_events', 'public.game_events exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_events'),
  'public.game_events has RLS enabled'
);

select ok(    has_table_privilege('anon',          'public.game_events', 'SELECT'),     'anon SELECT on public.game_events is granted');
select ok(    has_table_privilege('anon',          'public.game_events', 'INSERT'),     'anon INSERT on public.game_events is granted');
select ok(    has_table_privilege('anon',          'public.game_events', 'UPDATE'),     'anon UPDATE on public.game_events is granted');
select ok(    has_table_privilege('anon',          'public.game_events', 'DELETE'),     'anon DELETE on public.game_events is granted');
select ok(    has_table_privilege('anon',          'public.game_events', 'TRUNCATE'),   'anon TRUNCATE on public.game_events is granted');
select ok(    has_table_privilege('anon',          'public.game_events', 'REFERENCES'), 'anon REFERENCES on public.game_events is granted');
select ok(    has_table_privilege('anon',          'public.game_events', 'TRIGGER'),    'anon TRIGGER on public.game_events is granted');
select ok(    has_table_privilege('authenticated', 'public.game_events', 'SELECT'),     'authenticated SELECT on public.game_events is granted');
select ok(    has_table_privilege('authenticated', 'public.game_events', 'INSERT'),     'authenticated INSERT on public.game_events is granted');
select ok(    has_table_privilege('authenticated', 'public.game_events', 'UPDATE'),     'authenticated UPDATE on public.game_events is granted');
select ok(    has_table_privilege('authenticated', 'public.game_events', 'DELETE'),     'authenticated DELETE on public.game_events is granted');
select ok(    has_table_privilege('authenticated', 'public.game_events', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_events is granted');
select ok(    has_table_privilege('authenticated', 'public.game_events', 'REFERENCES'), 'authenticated REFERENCES on public.game_events is granted');
select ok(    has_table_privilege('authenticated', 'public.game_events', 'TRIGGER'),    'authenticated TRIGGER on public.game_events is granted');
select ok(    has_table_privilege('service_role',  'public.game_events', 'SELECT'),     'service_role SELECT on public.game_events is granted');
select ok(    has_table_privilege('service_role',  'public.game_events', 'INSERT'),     'service_role INSERT on public.game_events is granted');
select ok(    has_table_privilege('service_role',  'public.game_events', 'UPDATE'),     'service_role UPDATE on public.game_events is granted');
select ok(    has_table_privilege('service_role',  'public.game_events', 'DELETE'),     'service_role DELETE on public.game_events is granted');
select ok(    has_table_privilege('service_role',  'public.game_events', 'TRUNCATE'),   'service_role TRUNCATE on public.game_events is granted');
select ok(    has_table_privilege('service_role',  'public.game_events', 'REFERENCES'), 'service_role REFERENCES on public.game_events is granted');
select ok(    has_table_privilege('service_role',  'public.game_events', 'TRIGGER'),    'service_role TRIGGER on public.game_events is granted');
select ok(not has_table_privilege('public',        'public.game_events', 'SELECT'),     'public SELECT on public.game_events is denied');
select ok(not has_table_privilege('public',        'public.game_events', 'INSERT'),     'public INSERT on public.game_events is denied');
select ok(not has_table_privilege('public',        'public.game_events', 'UPDATE'),     'public UPDATE on public.game_events is denied');
select ok(not has_table_privilege('public',        'public.game_events', 'DELETE'),     'public DELETE on public.game_events is denied');
select ok(not has_table_privilege('public',        'public.game_events', 'TRUNCATE'),   'public TRUNCATE on public.game_events is denied');
select ok(not has_table_privilege('public',        'public.game_events', 'REFERENCES'), 'public REFERENCES on public.game_events is denied');
select ok(not has_table_privilege('public',        'public.game_events', 'TRIGGER'),    'public TRIGGER on public.game_events is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_events'
      and policyname = 'published game events are readable'
      and cmd = 'SELECT' and roles = '{anon,authenticated}'),
  'game_events policy "published game events are readable" exists FOR SELECT TO anon, authenticated'
);
select is(
  (select qual from pg_policies
    where schemaname = 'public' and tablename = 'game_events'
      and policyname = 'published game events are readable'),
  '(published_at IS NOT NULL)',
  'game_events read policy USING shape matches snapshot'
);

-- ─── public.game_question_options ───────────────────────────────────

select has_table('public', 'game_question_options', 'public.game_question_options exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_question_options'),
  'public.game_question_options has RLS enabled'
);

select ok(    has_table_privilege('anon',          'public.game_question_options', 'SELECT'),     'anon SELECT on public.game_question_options is granted');
select ok(    has_table_privilege('anon',          'public.game_question_options', 'INSERT'),     'anon INSERT on public.game_question_options is granted');
select ok(    has_table_privilege('anon',          'public.game_question_options', 'UPDATE'),     'anon UPDATE on public.game_question_options is granted');
select ok(    has_table_privilege('anon',          'public.game_question_options', 'DELETE'),     'anon DELETE on public.game_question_options is granted');
select ok(    has_table_privilege('anon',          'public.game_question_options', 'TRUNCATE'),   'anon TRUNCATE on public.game_question_options is granted');
select ok(    has_table_privilege('anon',          'public.game_question_options', 'REFERENCES'), 'anon REFERENCES on public.game_question_options is granted');
select ok(    has_table_privilege('anon',          'public.game_question_options', 'TRIGGER'),    'anon TRIGGER on public.game_question_options is granted');
select ok(    has_table_privilege('authenticated', 'public.game_question_options', 'SELECT'),     'authenticated SELECT on public.game_question_options is granted');
select ok(    has_table_privilege('authenticated', 'public.game_question_options', 'INSERT'),     'authenticated INSERT on public.game_question_options is granted');
select ok(    has_table_privilege('authenticated', 'public.game_question_options', 'UPDATE'),     'authenticated UPDATE on public.game_question_options is granted');
select ok(    has_table_privilege('authenticated', 'public.game_question_options', 'DELETE'),     'authenticated DELETE on public.game_question_options is granted');
select ok(    has_table_privilege('authenticated', 'public.game_question_options', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_question_options is granted');
select ok(    has_table_privilege('authenticated', 'public.game_question_options', 'REFERENCES'), 'authenticated REFERENCES on public.game_question_options is granted');
select ok(    has_table_privilege('authenticated', 'public.game_question_options', 'TRIGGER'),    'authenticated TRIGGER on public.game_question_options is granted');
select ok(    has_table_privilege('service_role',  'public.game_question_options', 'SELECT'),     'service_role SELECT on public.game_question_options is granted');
select ok(    has_table_privilege('service_role',  'public.game_question_options', 'INSERT'),     'service_role INSERT on public.game_question_options is granted');
select ok(    has_table_privilege('service_role',  'public.game_question_options', 'UPDATE'),     'service_role UPDATE on public.game_question_options is granted');
select ok(    has_table_privilege('service_role',  'public.game_question_options', 'DELETE'),     'service_role DELETE on public.game_question_options is granted');
select ok(    has_table_privilege('service_role',  'public.game_question_options', 'TRUNCATE'),   'service_role TRUNCATE on public.game_question_options is granted');
select ok(    has_table_privilege('service_role',  'public.game_question_options', 'REFERENCES'), 'service_role REFERENCES on public.game_question_options is granted');
select ok(    has_table_privilege('service_role',  'public.game_question_options', 'TRIGGER'),    'service_role TRIGGER on public.game_question_options is granted');
select ok(not has_table_privilege('public',        'public.game_question_options', 'SELECT'),     'public SELECT on public.game_question_options is denied');
select ok(not has_table_privilege('public',        'public.game_question_options', 'INSERT'),     'public INSERT on public.game_question_options is denied');
select ok(not has_table_privilege('public',        'public.game_question_options', 'UPDATE'),     'public UPDATE on public.game_question_options is denied');
select ok(not has_table_privilege('public',        'public.game_question_options', 'DELETE'),     'public DELETE on public.game_question_options is denied');
select ok(not has_table_privilege('public',        'public.game_question_options', 'TRUNCATE'),   'public TRUNCATE on public.game_question_options is denied');
select ok(not has_table_privilege('public',        'public.game_question_options', 'REFERENCES'), 'public REFERENCES on public.game_question_options is denied');
select ok(not has_table_privilege('public',        'public.game_question_options', 'TRIGGER'),    'public TRIGGER on public.game_question_options is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_question_options'
      and policyname = 'published game options are readable'
      and cmd = 'SELECT' and roles = '{anon,authenticated}'),
  'game_question_options policy "published game options are readable" exists FOR SELECT TO anon, authenticated'
);
select is(
  regexp_replace(
    (select qual from pg_policies
      where schemaname = 'public' and tablename = 'game_question_options'
        and policyname = 'published game options are readable'),
    '\s+', ' ', 'g'),
  '(EXISTS ( SELECT 1 FROM public.game_events WHERE ((game_events.id = game_question_options.event_id) AND (game_events.published_at IS NOT NULL))))',
  'game_question_options read policy USING shape matches snapshot'
);

-- ─── public.game_questions ──────────────────────────────────────────

select has_table('public', 'game_questions', 'public.game_questions exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_questions'),
  'public.game_questions has RLS enabled'
);

select ok(    has_table_privilege('anon',          'public.game_questions', 'SELECT'),     'anon SELECT on public.game_questions is granted');
select ok(    has_table_privilege('anon',          'public.game_questions', 'INSERT'),     'anon INSERT on public.game_questions is granted');
select ok(    has_table_privilege('anon',          'public.game_questions', 'UPDATE'),     'anon UPDATE on public.game_questions is granted');
select ok(    has_table_privilege('anon',          'public.game_questions', 'DELETE'),     'anon DELETE on public.game_questions is granted');
select ok(    has_table_privilege('anon',          'public.game_questions', 'TRUNCATE'),   'anon TRUNCATE on public.game_questions is granted');
select ok(    has_table_privilege('anon',          'public.game_questions', 'REFERENCES'), 'anon REFERENCES on public.game_questions is granted');
select ok(    has_table_privilege('anon',          'public.game_questions', 'TRIGGER'),    'anon TRIGGER on public.game_questions is granted');
select ok(    has_table_privilege('authenticated', 'public.game_questions', 'SELECT'),     'authenticated SELECT on public.game_questions is granted');
select ok(    has_table_privilege('authenticated', 'public.game_questions', 'INSERT'),     'authenticated INSERT on public.game_questions is granted');
select ok(    has_table_privilege('authenticated', 'public.game_questions', 'UPDATE'),     'authenticated UPDATE on public.game_questions is granted');
select ok(    has_table_privilege('authenticated', 'public.game_questions', 'DELETE'),     'authenticated DELETE on public.game_questions is granted');
select ok(    has_table_privilege('authenticated', 'public.game_questions', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_questions is granted');
select ok(    has_table_privilege('authenticated', 'public.game_questions', 'REFERENCES'), 'authenticated REFERENCES on public.game_questions is granted');
select ok(    has_table_privilege('authenticated', 'public.game_questions', 'TRIGGER'),    'authenticated TRIGGER on public.game_questions is granted');
select ok(    has_table_privilege('service_role',  'public.game_questions', 'SELECT'),     'service_role SELECT on public.game_questions is granted');
select ok(    has_table_privilege('service_role',  'public.game_questions', 'INSERT'),     'service_role INSERT on public.game_questions is granted');
select ok(    has_table_privilege('service_role',  'public.game_questions', 'UPDATE'),     'service_role UPDATE on public.game_questions is granted');
select ok(    has_table_privilege('service_role',  'public.game_questions', 'DELETE'),     'service_role DELETE on public.game_questions is granted');
select ok(    has_table_privilege('service_role',  'public.game_questions', 'TRUNCATE'),   'service_role TRUNCATE on public.game_questions is granted');
select ok(    has_table_privilege('service_role',  'public.game_questions', 'REFERENCES'), 'service_role REFERENCES on public.game_questions is granted');
select ok(    has_table_privilege('service_role',  'public.game_questions', 'TRIGGER'),    'service_role TRIGGER on public.game_questions is granted');
select ok(not has_table_privilege('public',        'public.game_questions', 'SELECT'),     'public SELECT on public.game_questions is denied');
select ok(not has_table_privilege('public',        'public.game_questions', 'INSERT'),     'public INSERT on public.game_questions is denied');
select ok(not has_table_privilege('public',        'public.game_questions', 'UPDATE'),     'public UPDATE on public.game_questions is denied');
select ok(not has_table_privilege('public',        'public.game_questions', 'DELETE'),     'public DELETE on public.game_questions is denied');
select ok(not has_table_privilege('public',        'public.game_questions', 'TRUNCATE'),   'public TRUNCATE on public.game_questions is denied');
select ok(not has_table_privilege('public',        'public.game_questions', 'REFERENCES'), 'public REFERENCES on public.game_questions is denied');
select ok(not has_table_privilege('public',        'public.game_questions', 'TRIGGER'),    'public TRIGGER on public.game_questions is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'game_questions'
      and policyname = 'published game questions are readable'
      and cmd = 'SELECT' and roles = '{anon,authenticated}'),
  'game_questions policy "published game questions are readable" exists FOR SELECT TO anon, authenticated'
);
select is(
  regexp_replace(
    (select qual from pg_policies
      where schemaname = 'public' and tablename = 'game_questions'
        and policyname = 'published game questions are readable'),
    '\s+', ' ', 'g'),
  '(EXISTS ( SELECT 1 FROM public.game_events WHERE ((game_events.id = game_questions.event_id) AND (game_events.published_at IS NOT NULL))))',
  'game_questions read policy USING shape matches snapshot'
);

-- ─── public.game_starts ─────────────────────────────────────────────

select has_table('public', 'game_starts', 'public.game_starts exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'game_starts'),
  'public.game_starts has RLS enabled'
);

select ok(    has_table_privilege('anon',          'public.game_starts', 'SELECT'),     'anon SELECT on public.game_starts is granted');
select ok(    has_table_privilege('anon',          'public.game_starts', 'INSERT'),     'anon INSERT on public.game_starts is granted');
select ok(    has_table_privilege('anon',          'public.game_starts', 'UPDATE'),     'anon UPDATE on public.game_starts is granted');
select ok(    has_table_privilege('anon',          'public.game_starts', 'DELETE'),     'anon DELETE on public.game_starts is granted');
select ok(    has_table_privilege('anon',          'public.game_starts', 'TRUNCATE'),   'anon TRUNCATE on public.game_starts is granted');
select ok(    has_table_privilege('anon',          'public.game_starts', 'REFERENCES'), 'anon REFERENCES on public.game_starts is granted');
select ok(    has_table_privilege('anon',          'public.game_starts', 'TRIGGER'),    'anon TRIGGER on public.game_starts is granted');
select ok(    has_table_privilege('authenticated', 'public.game_starts', 'SELECT'),     'authenticated SELECT on public.game_starts is granted');
select ok(    has_table_privilege('authenticated', 'public.game_starts', 'INSERT'),     'authenticated INSERT on public.game_starts is granted');
select ok(    has_table_privilege('authenticated', 'public.game_starts', 'UPDATE'),     'authenticated UPDATE on public.game_starts is granted');
select ok(    has_table_privilege('authenticated', 'public.game_starts', 'DELETE'),     'authenticated DELETE on public.game_starts is granted');
select ok(    has_table_privilege('authenticated', 'public.game_starts', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_starts is granted');
select ok(    has_table_privilege('authenticated', 'public.game_starts', 'REFERENCES'), 'authenticated REFERENCES on public.game_starts is granted');
select ok(    has_table_privilege('authenticated', 'public.game_starts', 'TRIGGER'),    'authenticated TRIGGER on public.game_starts is granted');
select ok(    has_table_privilege('service_role',  'public.game_starts', 'SELECT'),     'service_role SELECT on public.game_starts is granted');
select ok(    has_table_privilege('service_role',  'public.game_starts', 'INSERT'),     'service_role INSERT on public.game_starts is granted');
select ok(    has_table_privilege('service_role',  'public.game_starts', 'UPDATE'),     'service_role UPDATE on public.game_starts is granted');
select ok(    has_table_privilege('service_role',  'public.game_starts', 'DELETE'),     'service_role DELETE on public.game_starts is granted');
select ok(    has_table_privilege('service_role',  'public.game_starts', 'TRUNCATE'),   'service_role TRUNCATE on public.game_starts is granted');
select ok(    has_table_privilege('service_role',  'public.game_starts', 'REFERENCES'), 'service_role REFERENCES on public.game_starts is granted');
select ok(    has_table_privilege('service_role',  'public.game_starts', 'TRIGGER'),    'service_role TRIGGER on public.game_starts is granted');
select ok(not has_table_privilege('public',        'public.game_starts', 'SELECT'),     'public SELECT on public.game_starts is denied');
select ok(not has_table_privilege('public',        'public.game_starts', 'INSERT'),     'public INSERT on public.game_starts is denied');
select ok(not has_table_privilege('public',        'public.game_starts', 'UPDATE'),     'public UPDATE on public.game_starts is denied');
select ok(not has_table_privilege('public',        'public.game_starts', 'DELETE'),     'public DELETE on public.game_starts is denied');
select ok(not has_table_privilege('public',        'public.game_starts', 'TRUNCATE'),   'public TRUNCATE on public.game_starts is denied');
select ok(not has_table_privilege('public',        'public.game_starts', 'REFERENCES'), 'public REFERENCES on public.game_starts is denied');
select ok(not has_table_privilege('public',        'public.game_starts', 'TRIGGER'),    'public TRIGGER on public.game_starts is denied');

select is(
  (select count(*)::int from pg_policies
     where schemaname = 'public' and tablename = 'game_starts'),
  0,
  'public.game_starts has no policies'
);

-- ─── public.newsletter_enabled_events ───────────────────────────────

select has_table('public', 'newsletter_enabled_events', 'public.newsletter_enabled_events exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'newsletter_enabled_events'),
  'public.newsletter_enabled_events has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.newsletter_enabled_events', 'SELECT'),     'anon SELECT on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_enabled_events', 'INSERT'),     'anon INSERT on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_enabled_events', 'UPDATE'),     'anon UPDATE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_enabled_events', 'DELETE'),     'anon DELETE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_enabled_events', 'TRUNCATE'),   'anon TRUNCATE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_enabled_events', 'REFERENCES'), 'anon REFERENCES on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_enabled_events', 'TRIGGER'),    'anon TRIGGER on public.newsletter_enabled_events is denied');
select ok(    has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'SELECT'),     'authenticated SELECT on public.newsletter_enabled_events is granted');
select ok(not has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'INSERT'),     'authenticated INSERT on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'UPDATE'),     'authenticated UPDATE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'DELETE'),     'authenticated DELETE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'TRUNCATE'),   'authenticated TRUNCATE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'REFERENCES'), 'authenticated REFERENCES on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'TRIGGER'),    'authenticated TRIGGER on public.newsletter_enabled_events is denied');
select ok(    has_table_privilege('service_role',  'public.newsletter_enabled_events', 'SELECT'),     'service_role SELECT on public.newsletter_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_enabled_events', 'INSERT'),     'service_role INSERT on public.newsletter_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_enabled_events', 'UPDATE'),     'service_role UPDATE on public.newsletter_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_enabled_events', 'DELETE'),     'service_role DELETE on public.newsletter_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_enabled_events', 'TRUNCATE'),   'service_role TRUNCATE on public.newsletter_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_enabled_events', 'REFERENCES'), 'service_role REFERENCES on public.newsletter_enabled_events is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_enabled_events', 'TRIGGER'),    'service_role TRIGGER on public.newsletter_enabled_events is granted');
select ok(not has_table_privilege('public',        'public.newsletter_enabled_events', 'SELECT'),     'public SELECT on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.newsletter_enabled_events', 'INSERT'),     'public INSERT on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.newsletter_enabled_events', 'UPDATE'),     'public UPDATE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.newsletter_enabled_events', 'DELETE'),     'public DELETE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.newsletter_enabled_events', 'TRUNCATE'),   'public TRUNCATE on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.newsletter_enabled_events', 'REFERENCES'), 'public REFERENCES on public.newsletter_enabled_events is denied');
select ok(not has_table_privilege('public',        'public.newsletter_enabled_events', 'TRIGGER'),    'public TRIGGER on public.newsletter_enabled_events is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'newsletter_enabled_events'
      and policyname = 'organizers and admins can read newsletter registry'
      and cmd = 'SELECT' and roles = '{authenticated}'),
  'newsletter_enabled_events policy "organizers and admins can read newsletter registry" exists FOR SELECT TO authenticated'
);
select is(
  regexp_replace(
    (select qual from pg_policies
      where schemaname = 'public' and tablename = 'newsletter_enabled_events'
        and policyname = 'organizers and admins can read newsletter registry'),
    '\s+', ' ', 'g'),
  '(public.is_organizer_for_event(( SELECT ge.id FROM public.game_events ge WHERE (ge.slug = newsletter_enabled_events.slug))) OR public.is_root_admin())',
  'newsletter_enabled_events read policy USING shape matches snapshot'
);

-- ─── public.newsletter_opt_ins ──────────────────────────────────────

select has_table('public', 'newsletter_opt_ins', 'public.newsletter_opt_ins exists');
select ok(
  (select relrowsecurity from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'newsletter_opt_ins'),
  'public.newsletter_opt_ins has RLS enabled'
);

select ok(not has_table_privilege('anon',          'public.newsletter_opt_ins', 'SELECT'),     'anon SELECT on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_opt_ins', 'INSERT'),     'anon INSERT on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_opt_ins', 'UPDATE'),     'anon UPDATE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_opt_ins', 'DELETE'),     'anon DELETE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_opt_ins', 'TRUNCATE'),   'anon TRUNCATE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_opt_ins', 'REFERENCES'), 'anon REFERENCES on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('anon',          'public.newsletter_opt_ins', 'TRIGGER'),    'anon TRIGGER on public.newsletter_opt_ins is denied');
select ok(    has_table_privilege('authenticated', 'public.newsletter_opt_ins', 'SELECT'),     'authenticated SELECT on public.newsletter_opt_ins is granted');
select ok(not has_table_privilege('authenticated', 'public.newsletter_opt_ins', 'INSERT'),     'authenticated INSERT on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_opt_ins', 'UPDATE'),     'authenticated UPDATE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_opt_ins', 'DELETE'),     'authenticated DELETE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_opt_ins', 'TRUNCATE'),   'authenticated TRUNCATE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_opt_ins', 'REFERENCES'), 'authenticated REFERENCES on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('authenticated', 'public.newsletter_opt_ins', 'TRIGGER'),    'authenticated TRIGGER on public.newsletter_opt_ins is denied');
select ok(    has_table_privilege('service_role',  'public.newsletter_opt_ins', 'SELECT'),     'service_role SELECT on public.newsletter_opt_ins is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_opt_ins', 'INSERT'),     'service_role INSERT on public.newsletter_opt_ins is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_opt_ins', 'UPDATE'),     'service_role UPDATE on public.newsletter_opt_ins is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_opt_ins', 'DELETE'),     'service_role DELETE on public.newsletter_opt_ins is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_opt_ins', 'TRUNCATE'),   'service_role TRUNCATE on public.newsletter_opt_ins is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_opt_ins', 'REFERENCES'), 'service_role REFERENCES on public.newsletter_opt_ins is granted');
select ok(    has_table_privilege('service_role',  'public.newsletter_opt_ins', 'TRIGGER'),    'service_role TRIGGER on public.newsletter_opt_ins is granted');
select ok(not has_table_privilege('public',        'public.newsletter_opt_ins', 'SELECT'),     'public SELECT on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('public',        'public.newsletter_opt_ins', 'INSERT'),     'public INSERT on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('public',        'public.newsletter_opt_ins', 'UPDATE'),     'public UPDATE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('public',        'public.newsletter_opt_ins', 'DELETE'),     'public DELETE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('public',        'public.newsletter_opt_ins', 'TRUNCATE'),   'public TRUNCATE on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('public',        'public.newsletter_opt_ins', 'REFERENCES'), 'public REFERENCES on public.newsletter_opt_ins is denied');
select ok(not has_table_privilege('public',        'public.newsletter_opt_ins', 'TRIGGER'),    'public TRIGGER on public.newsletter_opt_ins is denied');

select ok(
  exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'newsletter_opt_ins'
      and policyname = 'organizers and admins can read newsletter opt-ins'
      and cmd = 'SELECT' and roles = '{authenticated}'),
  'newsletter_opt_ins policy "organizers and admins can read newsletter opt-ins" exists FOR SELECT TO authenticated'
);
select is(
  regexp_replace(
    (select qual from pg_policies
      where schemaname = 'public' and tablename = 'newsletter_opt_ins'
        and policyname = 'organizers and admins can read newsletter opt-ins'),
    '\s+', ' ', 'g'),
  '(public.is_organizer_for_event(( SELECT ge.id FROM public.game_events ge WHERE (ge.slug = newsletter_opt_ins.event_slug))) OR public.is_root_admin())',
  'newsletter_opt_ins read policy USING shape matches snapshot'
);

-- ────────────────────────────────────────────────────────────────────
-- Views
-- ────────────────────────────────────────────────────────────────────

-- ─── public.game_event_admin_status ─────────────────────────────────

select has_view('public', 'game_event_admin_status', 'public.game_event_admin_status exists');

select ok(not has_table_privilege('anon',          'public.game_event_admin_status', 'SELECT'),     'anon SELECT on public.game_event_admin_status is denied');
select ok(not has_table_privilege('anon',          'public.game_event_admin_status', 'INSERT'),     'anon INSERT on public.game_event_admin_status is denied');
select ok(not has_table_privilege('anon',          'public.game_event_admin_status', 'UPDATE'),     'anon UPDATE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('anon',          'public.game_event_admin_status', 'DELETE'),     'anon DELETE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('anon',          'public.game_event_admin_status', 'TRUNCATE'),   'anon TRUNCATE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('anon',          'public.game_event_admin_status', 'REFERENCES'), 'anon REFERENCES on public.game_event_admin_status is denied');
select ok(not has_table_privilege('anon',          'public.game_event_admin_status', 'TRIGGER'),    'anon TRIGGER on public.game_event_admin_status is denied');
select ok(    has_table_privilege('authenticated', 'public.game_event_admin_status', 'SELECT'),     'authenticated SELECT on public.game_event_admin_status is granted');
select ok(not has_table_privilege('authenticated', 'public.game_event_admin_status', 'INSERT'),     'authenticated INSERT on public.game_event_admin_status is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_admin_status', 'UPDATE'),     'authenticated UPDATE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_admin_status', 'DELETE'),     'authenticated DELETE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_admin_status', 'TRUNCATE'),   'authenticated TRUNCATE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_admin_status', 'REFERENCES'), 'authenticated REFERENCES on public.game_event_admin_status is denied');
select ok(not has_table_privilege('authenticated', 'public.game_event_admin_status', 'TRIGGER'),    'authenticated TRIGGER on public.game_event_admin_status is denied');
select ok(    has_table_privilege('service_role',  'public.game_event_admin_status', 'SELECT'),     'service_role SELECT on public.game_event_admin_status is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_admin_status', 'INSERT'),     'service_role INSERT on public.game_event_admin_status is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_admin_status', 'UPDATE'),     'service_role UPDATE on public.game_event_admin_status is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_admin_status', 'DELETE'),     'service_role DELETE on public.game_event_admin_status is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_admin_status', 'TRUNCATE'),   'service_role TRUNCATE on public.game_event_admin_status is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_admin_status', 'REFERENCES'), 'service_role REFERENCES on public.game_event_admin_status is granted');
select ok(    has_table_privilege('service_role',  'public.game_event_admin_status', 'TRIGGER'),    'service_role TRIGGER on public.game_event_admin_status is granted');
select ok(not has_table_privilege('public',        'public.game_event_admin_status', 'SELECT'),     'public SELECT on public.game_event_admin_status is denied');
select ok(not has_table_privilege('public',        'public.game_event_admin_status', 'INSERT'),     'public INSERT on public.game_event_admin_status is denied');
select ok(not has_table_privilege('public',        'public.game_event_admin_status', 'UPDATE'),     'public UPDATE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('public',        'public.game_event_admin_status', 'DELETE'),     'public DELETE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('public',        'public.game_event_admin_status', 'TRUNCATE'),   'public TRUNCATE on public.game_event_admin_status is denied');
select ok(not has_table_privilege('public',        'public.game_event_admin_status', 'REFERENCES'), 'public REFERENCES on public.game_event_admin_status is denied');
select ok(not has_table_privilege('public',        'public.game_event_admin_status', 'TRIGGER'),    'public TRIGGER on public.game_event_admin_status is denied');

-- ────────────────────────────────────────────────────────────────────
-- Functions
-- ────────────────────────────────────────────────────────────────────

-- ─── public.complete_game_and_award_entitlement ─────────────────────

select has_function('public', 'complete_game_and_award_entitlement', 'public.complete_game_and_award_entitlement exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'complete_game_and_award_entitlement'),
  'DEFINER',
  'complete_game_and_award_entitlement is SECURITY DEFINER'
);
select ok(not has_function_privilege('anon',          'public.complete_game_and_award_entitlement(text, text, text, jsonb, integer, integer)', 'EXECUTE'), 'anon EXECUTE on complete_game_and_award_entitlement is denied');
select ok(not has_function_privilege('authenticated', 'public.complete_game_and_award_entitlement(text, text, text, jsonb, integer, integer)', 'EXECUTE'), 'authenticated EXECUTE on complete_game_and_award_entitlement is denied');
select ok(    has_function_privilege('service_role',  'public.complete_game_and_award_entitlement(text, text, text, jsonb, integer, integer)', 'EXECUTE'), 'service_role EXECUTE on complete_game_and_award_entitlement is granted');
select ok(not has_function_privilege('public',        'public.complete_game_and_award_entitlement(text, text, text, jsonb, integer, integer)', 'EXECUTE'), 'public EXECUTE on complete_game_and_award_entitlement is denied');

-- ─── public.current_request_email ───────────────────────────────────

select has_function('public', 'current_request_email', 'public.current_request_email exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'current_request_email'),
  'INVOKER',
  'current_request_email is SECURITY INVOKER'
);
select ok(has_function_privilege('anon',          'public.current_request_email()', 'EXECUTE'), 'anon EXECUTE on current_request_email is granted (via PUBLIC)');
select ok(has_function_privilege('authenticated', 'public.current_request_email()', 'EXECUTE'), 'authenticated EXECUTE on current_request_email is granted (via PUBLIC)');
select ok(has_function_privilege('service_role',  'public.current_request_email()', 'EXECUTE'), 'service_role EXECUTE on current_request_email is granted (via PUBLIC)');
select ok(has_function_privilege('public',        'public.current_request_email()', 'EXECUTE'), 'public EXECUTE on current_request_email is granted');

-- ─── public.current_request_user_id ─────────────────────────────────

select has_function('public', 'current_request_user_id', 'public.current_request_user_id exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'current_request_user_id'),
  'INVOKER',
  'current_request_user_id is SECURITY INVOKER'
);
select ok(has_function_privilege('anon',          'public.current_request_user_id()', 'EXECUTE'), 'anon EXECUTE on current_request_user_id is granted (via PUBLIC)');
select ok(has_function_privilege('authenticated', 'public.current_request_user_id()', 'EXECUTE'), 'authenticated EXECUTE on current_request_user_id is granted (via PUBLIC)');
select ok(has_function_privilege('service_role',  'public.current_request_user_id()', 'EXECUTE'), 'service_role EXECUTE on current_request_user_id is granted (via PUBLIC)');
select ok(has_function_privilege('public',        'public.current_request_user_id()', 'EXECUTE'), 'public EXECUTE on current_request_user_id is granted');

-- ─── public.generate_neighborly_verification_code ───────────────────

select has_function('public', 'generate_neighborly_verification_code', array['text'], 'public.generate_neighborly_verification_code(text) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'generate_neighborly_verification_code'),
  'DEFINER',
  'generate_neighborly_verification_code is SECURITY DEFINER'
);
select ok(not has_function_privilege('anon',          'public.generate_neighborly_verification_code(text)', 'EXECUTE'), 'anon EXECUTE on generate_neighborly_verification_code is denied');
select ok(not has_function_privilege('authenticated', 'public.generate_neighborly_verification_code(text)', 'EXECUTE'), 'authenticated EXECUTE on generate_neighborly_verification_code is denied');
select ok(    has_function_privilege('service_role',  'public.generate_neighborly_verification_code(text)', 'EXECUTE'), 'service_role EXECUTE on generate_neighborly_verification_code is granted');
select ok(not has_function_privilege('public',        'public.generate_neighborly_verification_code(text)', 'EXECUTE'), 'public EXECUTE on generate_neighborly_verification_code is denied');

-- ─── public.generate_random_event_code ──────────────────────────────

select has_function('public', 'generate_random_event_code', 'public.generate_random_event_code exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'generate_random_event_code'),
  'INVOKER',
  'generate_random_event_code is SECURITY INVOKER'
);
select ok(not has_function_privilege('anon',          'public.generate_random_event_code()', 'EXECUTE'), 'anon EXECUTE on generate_random_event_code is denied');
select ok(not has_function_privilege('authenticated', 'public.generate_random_event_code()', 'EXECUTE'), 'authenticated EXECUTE on generate_random_event_code is denied');
select ok(    has_function_privilege('service_role',  'public.generate_random_event_code()', 'EXECUTE'), 'service_role EXECUTE on generate_random_event_code is granted');
select ok(not has_function_privilege('public',        'public.generate_random_event_code()', 'EXECUTE'), 'public EXECUTE on generate_random_event_code is denied');

-- ─── public.is_admin ────────────────────────────────────────────────

select has_function('public', 'is_admin', 'public.is_admin exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_admin'),
  'DEFINER',
  'is_admin is SECURITY DEFINER'
);
select ok(    has_function_privilege('anon',          'public.is_admin()', 'EXECUTE'), 'anon EXECUTE on is_admin is granted');
select ok(    has_function_privilege('authenticated', 'public.is_admin()', 'EXECUTE'), 'authenticated EXECUTE on is_admin is granted');
select ok(    has_function_privilege('service_role',  'public.is_admin()', 'EXECUTE'), 'service_role EXECUTE on is_admin is granted');
select ok(not has_function_privilege('public',        'public.is_admin()', 'EXECUTE'), 'public EXECUTE on is_admin is denied');

-- ─── public.is_agent_for_event ──────────────────────────────────────

select has_function('public', 'is_agent_for_event', array['text'], 'public.is_agent_for_event(text) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_agent_for_event'),
  'DEFINER',
  'is_agent_for_event is SECURITY DEFINER'
);
select ok(    has_function_privilege('anon',          'public.is_agent_for_event(text)', 'EXECUTE'), 'anon EXECUTE on is_agent_for_event is granted');
select ok(    has_function_privilege('authenticated', 'public.is_agent_for_event(text)', 'EXECUTE'), 'authenticated EXECUTE on is_agent_for_event is granted');
select ok(    has_function_privilege('service_role',  'public.is_agent_for_event(text)', 'EXECUTE'), 'service_role EXECUTE on is_agent_for_event is granted');
select ok(not has_function_privilege('public',        'public.is_agent_for_event(text)', 'EXECUTE'), 'public EXECUTE on is_agent_for_event is denied');

-- ─── public.is_organizer_for_event ──────────────────────────────────

select has_function('public', 'is_organizer_for_event', array['text'], 'public.is_organizer_for_event(text) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_organizer_for_event'),
  'DEFINER',
  'is_organizer_for_event is SECURITY DEFINER'
);
select ok(    has_function_privilege('anon',          'public.is_organizer_for_event(text)', 'EXECUTE'), 'anon EXECUTE on is_organizer_for_event is granted');
select ok(    has_function_privilege('authenticated', 'public.is_organizer_for_event(text)', 'EXECUTE'), 'authenticated EXECUTE on is_organizer_for_event is granted');
select ok(    has_function_privilege('service_role',  'public.is_organizer_for_event(text)', 'EXECUTE'), 'service_role EXECUTE on is_organizer_for_event is granted');
select ok(not has_function_privilege('public',        'public.is_organizer_for_event(text)', 'EXECUTE'), 'public EXECUTE on is_organizer_for_event is denied');

-- ─── public.is_root_admin ───────────────────────────────────────────

select has_function('public', 'is_root_admin', 'public.is_root_admin exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'is_root_admin'),
  'DEFINER',
  'is_root_admin is SECURITY DEFINER'
);
select ok(    has_function_privilege('anon',          'public.is_root_admin()', 'EXECUTE'), 'anon EXECUTE on is_root_admin is granted');
select ok(    has_function_privilege('authenticated', 'public.is_root_admin()', 'EXECUTE'), 'authenticated EXECUTE on is_root_admin is granted');
select ok(    has_function_privilege('service_role',  'public.is_root_admin()', 'EXECUTE'), 'service_role EXECUTE on is_root_admin is granted');
select ok(not has_function_privilege('public',        'public.is_root_admin()', 'EXECUTE'), 'public EXECUTE on is_root_admin is denied');

-- ─── public.publish_game_event_draft ────────────────────────────────

select has_function('public', 'publish_game_event_draft', array['text', 'uuid'], 'public.publish_game_event_draft(text, uuid) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'publish_game_event_draft'),
  'DEFINER',
  'publish_game_event_draft is SECURITY DEFINER'
);
select ok(not has_function_privilege('anon',          'public.publish_game_event_draft(text, uuid)', 'EXECUTE'), 'anon EXECUTE on publish_game_event_draft is denied');
select ok(not has_function_privilege('authenticated', 'public.publish_game_event_draft(text, uuid)', 'EXECUTE'), 'authenticated EXECUTE on publish_game_event_draft is denied');
select ok(    has_function_privilege('service_role',  'public.publish_game_event_draft(text, uuid)', 'EXECUTE'), 'service_role EXECUTE on publish_game_event_draft is granted');
select ok(not has_function_privilege('public',        'public.publish_game_event_draft(text, uuid)', 'EXECUTE'), 'public EXECUTE on publish_game_event_draft is denied');

-- ─── public.redeem_entitlement_by_code ──────────────────────────────

select has_function('public', 'redeem_entitlement_by_code', array['text', 'text'], 'public.redeem_entitlement_by_code(text, text) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'redeem_entitlement_by_code'),
  'DEFINER',
  'redeem_entitlement_by_code is SECURITY DEFINER'
);
select ok(    has_function_privilege('anon',          'public.redeem_entitlement_by_code(text, text)', 'EXECUTE'), 'anon EXECUTE on redeem_entitlement_by_code is granted');
select ok(    has_function_privilege('authenticated', 'public.redeem_entitlement_by_code(text, text)', 'EXECUTE'), 'authenticated EXECUTE on redeem_entitlement_by_code is granted');
select ok(not has_function_privilege('service_role',  'public.redeem_entitlement_by_code(text, text)', 'EXECUTE'), 'service_role EXECUTE on redeem_entitlement_by_code is denied');
select ok(not has_function_privilege('public',        'public.redeem_entitlement_by_code(text, text)', 'EXECUTE'), 'public EXECUTE on redeem_entitlement_by_code is denied');

-- ─── public.reverse_entitlement_redemption ──────────────────────────

select has_function('public', 'reverse_entitlement_redemption', array['text', 'text', 'text'], 'public.reverse_entitlement_redemption(text, text, text) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'reverse_entitlement_redemption'),
  'DEFINER',
  'reverse_entitlement_redemption is SECURITY DEFINER'
);
select ok(    has_function_privilege('anon',          'public.reverse_entitlement_redemption(text, text, text)', 'EXECUTE'), 'anon EXECUTE on reverse_entitlement_redemption is granted');
select ok(    has_function_privilege('authenticated', 'public.reverse_entitlement_redemption(text, text, text)', 'EXECUTE'), 'authenticated EXECUTE on reverse_entitlement_redemption is granted');
select ok(not has_function_privilege('service_role',  'public.reverse_entitlement_redemption(text, text, text)', 'EXECUTE'), 'service_role EXECUTE on reverse_entitlement_redemption is denied');
select ok(not has_function_privilege('public',        'public.reverse_entitlement_redemption(text, text, text)', 'EXECUTE'), 'public EXECUTE on reverse_entitlement_redemption is denied');

-- ─── public.submit_feedback ─────────────────────────────────────────

select has_function('public', 'submit_feedback', array['text', 'jsonb', 'boolean', 'boolean', 'text', 'text'], 'public.submit_feedback(text, jsonb, boolean, boolean, text, text) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'submit_feedback'),
  'DEFINER',
  'submit_feedback is SECURITY DEFINER'
);
select ok(    has_function_privilege('anon',          'public.submit_feedback(text, jsonb, boolean, boolean, text, text)', 'EXECUTE'), 'anon EXECUTE on submit_feedback is granted');
select ok(    has_function_privilege('authenticated', 'public.submit_feedback(text, jsonb, boolean, boolean, text, text)', 'EXECUTE'), 'authenticated EXECUTE on submit_feedback is granted');
select ok(    has_function_privilege('service_role',  'public.submit_feedback(text, jsonb, boolean, boolean, text, text)', 'EXECUTE'), 'service_role EXECUTE on submit_feedback is granted');
select ok(not has_function_privilege('public',        'public.submit_feedback(text, jsonb, boolean, boolean, text, text)', 'EXECUTE'), 'public EXECUTE on submit_feedback is denied');

-- public.submit_newsletter_signup was dropped by migration
-- 20260807000000 along with the on-site signup route that was its only
-- caller, so it has no grants to snapshot here. Its absence is asserted
-- in newsletter_enablement_registry.test.sql, which owned its coverage.

-- ─── public.subscribe_email ─────────────────────────────────────────

select has_function('public', 'subscribe_email', array['text', 'text', 'text'], 'public.subscribe_email(text, text, text) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'subscribe_email'),
  'DEFINER',
  'subscribe_email is SECURITY DEFINER'
);
select ok(not has_function_privilege('anon',          'public.subscribe_email(text, text, text)', 'EXECUTE'), 'anon EXECUTE on subscribe_email is denied');
select ok(not has_function_privilege('authenticated', 'public.subscribe_email(text, text, text)', 'EXECUTE'), 'authenticated EXECUTE on subscribe_email is denied');
select ok(    has_function_privilege('service_role',  'public.subscribe_email(text, text, text)', 'EXECUTE'), 'service_role EXECUTE on subscribe_email is granted');
select ok(not has_function_privilege('public',        'public.subscribe_email(text, text, text)', 'EXECUTE'), 'public EXECUTE on subscribe_email is denied');

-- ─── public.unpublish_game_event ────────────────────────────────────

select has_function('public', 'unpublish_game_event', array['text', 'uuid'], 'public.unpublish_game_event(text, uuid) exists');
select is(
  (select case when p.prosecdef then 'DEFINER' else 'INVOKER' end
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'unpublish_game_event'),
  'DEFINER',
  'unpublish_game_event is SECURITY DEFINER'
);
select ok(not has_function_privilege('anon',          'public.unpublish_game_event(text, uuid)', 'EXECUTE'), 'anon EXECUTE on unpublish_game_event is denied');
select ok(not has_function_privilege('authenticated', 'public.unpublish_game_event(text, uuid)', 'EXECUTE'), 'authenticated EXECUTE on unpublish_game_event is denied');
select ok(    has_function_privilege('service_role',  'public.unpublish_game_event(text, uuid)', 'EXECUTE'), 'service_role EXECUTE on unpublish_game_event is granted');
select ok(not has_function_privilege('public',        'public.unpublish_game_event(text, uuid)', 'EXECUTE'), 'public EXECUTE on unpublish_game_event is denied');

-- ────────────────────────────────────────────────────────────────────
-- Coverage-uniformity audit (CCI-1).
-- These assertions guard the inventory itself: if a new table, view,
-- or callable function lands in `public.*` without a section above,
-- the count check below catches it.
-- ────────────────────────────────────────────────────────────────────

select is(
  (select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'),
  15,
  'public has exactly 15 tables (every table covered above)'
);
select is(
  (select count(*)::int from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'),
  1,
  'public has exactly 1 view (every view covered above)'
);
select is(
  (select count(*)::int from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.prorettype <> 'pg_catalog.trigger'::regtype),
  16,
  'public has exactly 16 callable (non-trigger) functions (every function covered above)'
);

select * from finish();
rollback;
