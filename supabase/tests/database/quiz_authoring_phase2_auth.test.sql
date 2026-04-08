begin;

create extension if not exists pgtap with schema extensions;

select plan(26);

select ok(
  exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'quiz_event_drafts'
      and rowsecurity
  ),
  'quiz_event_drafts keeps row level security enabled'
);

select ok(
  exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'quiz_event_versions'
      and rowsecurity
  ),
  'quiz_event_versions keeps row level security enabled'
);

select ok(
  exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'quiz_admin_users'
      and rowsecurity
  ),
  'quiz_admin_users exists with row level security enabled'
);

select ok(
  not has_table_privilege('anon', 'public.quiz_admin_users', 'SELECT'),
  'anon cannot read quiz_admin_users directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.quiz_admin_users', 'SELECT'),
  'authenticated cannot read quiz_admin_users directly'
);

select ok(
  has_table_privilege('service_role', 'public.quiz_admin_users', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role can manage quiz_admin_users'
);

select ok(
  not has_table_privilege('anon', 'public.quiz_event_drafts', 'SELECT'),
  'anon cannot read authoring drafts'
);

select ok(
  not has_table_privilege('anon', 'public.quiz_event_versions', 'SELECT'),
  'anon cannot read authoring versions'
);

select ok(
  has_table_privilege('authenticated', 'public.quiz_event_drafts', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated has the draft table privileges needed for admin RLS access'
);

select ok(
  has_table_privilege('authenticated', 'public.quiz_event_versions', 'SELECT'),
  'authenticated can read authoring versions through RLS'
);

select ok(
  not has_table_privilege('authenticated', 'public.quiz_event_versions', 'INSERT'),
  'authenticated cannot insert authoring versions'
);

select ok(
  has_table_privilege('service_role', 'public.quiz_event_drafts', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role can manage authoring drafts'
);

select ok(
  has_table_privilege('service_role', 'public.quiz_event_versions', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role can manage authoring versions'
);

insert into public.quiz_admin_users (email)
values ('admin@example.com');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"viewer@example.com","sub":"11111111-1111-4111-8111-111111111111"}',
  true
);

select ok(
  not public.is_quiz_admin(),
  'is_quiz_admin returns false for an authenticated non-admin'
);

select is(
  (select count(*) from public.quiz_event_drafts),
  0::bigint,
  'authenticated non-admin cannot read any drafts through RLS'
);

select is(
  (select count(*) from public.quiz_event_versions),
  0::bigint,
  'authenticated non-admin cannot read any versions through RLS'
);

select throws_ok(
  $$
    insert into public.quiz_event_drafts (id, slug, name, content)
    values (
      'viewer-test-event',
      'viewer-test-event',
      'Viewer Test Event',
      jsonb_build_object(
        'id', 'viewer-test-event',
        'slug', 'viewer-test-event',
        'name', 'Viewer Test Event',
        'location', 'Seattle',
        'estimatedMinutes', 2,
        'raffleLabel', 'raffle ticket',
        'intro', 'Intro',
        'summary', 'Summary',
        'feedbackMode', 'final_score_reveal',
        'questions', '[]'::jsonb
      )
    )
  $$,
  '42501',
  null,
  'authenticated non-admin cannot insert drafts'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"admin@example.com","sub":"22222222-2222-4222-8222-222222222222"}',
  true
);

select ok(
  public.is_quiz_admin(),
  'is_quiz_admin returns true for an allowlisted admin'
);

select is(
  (select count(*) from public.quiz_event_drafts),
  3::bigint,
  'authenticated admin can read all draft events'
);

select is(
  (select count(*) from public.quiz_event_versions),
  3::bigint,
  'authenticated admin can read all draft versions'
);

select lives_ok(
  $$
    insert into public.quiz_event_drafts (id, slug, name, content)
    values (
      'admin-test-event',
      'admin-test-event',
      'Admin Test Event',
      jsonb_build_object(
        'id', 'admin-test-event',
        'slug', 'admin-test-event',
        'name', 'Admin Test Event',
        'location', 'Seattle',
        'estimatedMinutes', 2,
        'raffleLabel', 'raffle ticket',
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
    )
  $$,
  'authenticated admin can insert drafts'
);

select is(
  (
    select last_saved_by::text
    from public.quiz_event_drafts
    where id = 'admin-test-event'
  ),
  '22222222-2222-4222-8222-222222222222',
  'admin draft insert stamps last_saved_by from the auth session'
);

select lives_ok(
  $$
    update public.quiz_event_drafts
    set name = 'Updated Admin Test Event'
    where id = 'admin-test-event'
  $$,
  'authenticated admin can update drafts'
);

select is(
  (
    select last_saved_by::text
    from public.quiz_event_drafts
    where id = 'admin-test-event'
  ),
  '22222222-2222-4222-8222-222222222222',
  'admin draft update keeps the authenticated audit attribution'
);

select throws_ok(
  $$
    insert into public.quiz_event_versions (
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

select lives_ok(
  $$ delete from public.quiz_event_drafts where id = 'admin-test-event' $$,
  'authenticated admin can delete drafts'
);

select * from finish();
rollback;
