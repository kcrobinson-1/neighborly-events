begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

select ok(
  exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'game_event_drafts'
      and rowsecurity
  ),
  'game_event_drafts keeps row level security enabled'
);

select ok(
  exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'game_event_versions'
      and rowsecurity
  ),
  'game_event_versions keeps row level security enabled'
);

select ok(
  exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'admin_users'
      and rowsecurity
  ),
  'admin_users exists with row level security enabled'
);

select ok(
  not has_table_privilege('anon', 'public.admin_users', 'SELECT'),
  'anon cannot read admin_users directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_users', 'SELECT'),
  'authenticated cannot read admin_users directly'
);

select ok(
  has_table_privilege('service_role', 'public.admin_users', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role can manage admin_users'
);

select ok(
  not has_table_privilege('anon', 'public.game_event_drafts', 'SELECT'),
  'anon cannot read authoring drafts'
);

select ok(
  not has_table_privilege('anon', 'public.game_event_versions', 'SELECT'),
  'anon cannot read authoring versions'
);

select ok(
  has_table_privilege('authenticated', 'public.game_event_drafts', 'SELECT'),
  'authenticated can read authoring drafts through admin RLS'
);

-- M2 phase 2.1.1 grants INSERT / UPDATE / DELETE on game_event_drafts to
-- authenticated so the broadened RLS policies become reachable; per-row
-- gating moves to the WITH CHECK / USING predicate
-- (is_organizer_for_event(id) OR is_root_admin()).
select ok(
  has_table_privilege('authenticated', 'public.game_event_drafts', 'INSERT'),
  'authenticated has INSERT privilege on game_event_drafts (RLS gates writes)'
);

select ok(
  has_table_privilege('authenticated', 'public.game_event_drafts', 'UPDATE'),
  'authenticated has UPDATE privilege on game_event_drafts (RLS gates writes)'
);

select ok(
  has_table_privilege('authenticated', 'public.game_event_drafts', 'DELETE'),
  'authenticated has DELETE privilege on game_event_drafts (RLS gates writes)'
);

select ok(
  has_table_privilege('authenticated', 'public.game_event_versions', 'SELECT'),
  'authenticated can read authoring versions through RLS'
);

select ok(
  not has_table_privilege('authenticated', 'public.game_event_versions', 'INSERT'),
  'authenticated cannot insert authoring versions'
);

select ok(
  has_table_privilege('service_role', 'public.game_event_drafts', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role can manage authoring drafts'
);

select ok(
  has_table_privilege('service_role', 'public.game_event_versions', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role can manage authoring versions'
);

insert into public.admin_users (email)
values ('admin@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"viewer@example.com","sub":"11111111-1111-4111-8111-111111111111"}',
  true
);

select ok(
  not public.is_admin(),
  'is_admin returns false for an authenticated non-admin'
);

select is(
  (select count(*) from public.game_event_drafts),
  0::bigint,
  'authenticated non-admin cannot read any drafts through RLS'
);

select is(
  (select count(*) from public.game_event_versions),
  0::bigint,
  'authenticated non-admin cannot read any versions through RLS'
);

-- The non-admin viewer is neither organizer for 'viewer-test-event' nor a
-- root-admin, so the broadened "organizers and admins can insert drafts"
-- policy's WITH CHECK denies the row at RLS evaluation. event_code is
-- supplied so the NOT NULL check passes and RLS is the actual denier.
select throws_ok(
  $$
    insert into public.game_event_drafts (id, slug, event_code, name, content)
    values (
      'viewer-test-event',
      'viewer-test-event',
      'VTE',
      'Viewer Test Event',
      jsonb_build_object(
        'id', 'viewer-test-event',
        'slug', 'viewer-test-event',
        'name', 'Viewer Test Event',
        'location', 'Seattle',
        'estimatedMinutes', 2,
        'entitlementLabel', 'raffle ticket',
        'intro', 'Intro',
        'summary', 'Summary',
        'feedbackMode', 'final_score_reveal',
        'questions', '[]'::jsonb
      )
    )
  $$,
  '42501',
  null,
  'authenticated non-admin cannot insert drafts (RLS WITH CHECK denial under '
  'broadened "organizers and admins can insert drafts" policy)'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"admin@example.com","sub":"22222222-2222-4222-8222-222222222222"}',
  true
);

select ok(
  public.is_admin(),
  'is_admin returns true for an allowlisted admin'
);

select is(
  (select count(*) from public.game_event_drafts),
  3::bigint,
  'authenticated admin can read all draft events'
);

select is(
  (select count(*) from public.game_event_versions),
  3::bigint,
  'authenticated admin can read all draft versions'
);

-- M2 phase 2.1.1 broadens game_event_drafts INSERT to organizers and
-- root-admins via RLS. Root-admin satisfies is_root_admin() and the WITH
-- CHECK predicate evaluates to true, so the direct INSERT now succeeds —
-- a deliberate model change in 2.1.1 (preserved invariant: only the
-- publish/unpublish RPCs write game_event_audit_log + game_event_versions,
-- not draft creation). Edge Function `save-draft` remains the canonical
-- ingress for payload validation.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values (
  'admin-test-event',
  'admin-test-event',
  'ATE',
  'Admin Test Event',
  jsonb_build_object(
    'id', 'admin-test-event',
    'slug', 'admin-test-event',
    'name', 'Admin Test Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'raffle ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1',
        'sponsor', 'Sponsor',
        'prompt', 'Prompt?',
        'selectionMode', 'single',
        'correctAnswerIds', jsonb_build_array('a'),
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'Option A')
        )
      )
    )
  )
);

select is(
  (
    select count(*)::int
      from public.game_event_drafts
     where id = 'admin-test-event'
  ),
  1,
  'authenticated admin can insert drafts directly under broadened RLS '
  '(M2 phase 2.1.1)'
);

select throws_ok(
  $$
    insert into public.game_event_versions (
      event_id,
      version_number,
      content
    )
    values (
      'admin-test-event',
      1,
      '{}'::jsonb
    )
  $$,
  '42501',
  null,
  'authenticated admin cannot insert versions'
);

select * from finish();
rollback;
