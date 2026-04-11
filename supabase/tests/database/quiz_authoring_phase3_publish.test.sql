begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

select has_column(
  'public',
  'quiz_event_drafts',
  'last_published_at',
  'drafts track last publish time'
);

select has_column(
  'public',
  'quiz_event_drafts',
  'last_published_by',
  'drafts track last publisher'
);

select has_column(
  'public',
  'quiz_event_drafts',
  'archived_at',
  'drafts track archive time'
);

select has_column(
  'public',
  'quiz_event_drafts',
  'archived_by',
  'drafts track archive actor'
);

select has_table(
  'public',
  'quiz_event_live_transitions',
  'live transition audit table exists'
);

select ok(
  exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'quiz_event_live_transitions'
      and rowsecurity
  ),
  'live transition audit table keeps row level security enabled'
);

select ok(
  not has_table_privilege('anon', 'public.quiz_event_live_transitions', 'SELECT'),
  'anon cannot read live transition audit rows'
);

select ok(
  not has_table_privilege('authenticated', 'public.quiz_event_live_transitions', 'SELECT'),
  'authenticated cannot read live transition audit rows directly'
);

select ok(
  has_table_privilege('service_role', 'public.quiz_event_live_transitions', 'SELECT,INSERT,UPDATE,DELETE'),
  'service_role can manage live transition audit rows'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.publish_quiz_event_draft(text, timestamptz, uuid, text)',
    'EXECUTE'
  ),
  'service_role can execute publish_quiz_event_draft'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.publish_quiz_event_draft(text, timestamptz, uuid, text)',
    'EXECUTE'
  ),
  'anon cannot execute publish_quiz_event_draft'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.publish_quiz_event_draft(text, timestamptz, uuid, text)',
    'EXECUTE'
  ),
  'authenticated cannot execute publish_quiz_event_draft'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.archive_quiz_event(text, integer, uuid, text)',
    'EXECUTE'
  ),
  'service_role can execute archive_quiz_event'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.archive_quiz_event(text, integer, uuid, text)',
    'EXECUTE'
  ),
  'anon cannot execute archive_quiz_event'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.archive_quiz_event(text, integer, uuid, text)',
    'EXECUTE'
  ),
  'authenticated cannot execute archive_quiz_event'
);

set local role service_role;

insert into public.quiz_event_drafts (
  id,
  slug,
  name,
  content
)
values (
  'phase3-event',
  'phase3-event',
  'Phase 3 Event',
  '{
    "id": "phase3-event",
    "slug": "phase3-event",
    "name": "Phase 3 Event",
    "location": "Seattle",
    "estimatedMinutes": 4,
    "raffleLabel": "phase ticket",
    "intro": "Intro for Phase 3.",
    "summary": "Published from a private draft.",
    "feedbackMode": "final_score_reveal",
    "allowBackNavigation": false,
    "allowRetake": true,
    "questions": [
      {
        "id": "q1",
        "sponsor": "Sponsor One",
        "prompt": "First prompt?",
        "selectionMode": "single",
        "correctAnswerIds": ["a"],
        "options": [
          { "id": "a", "label": "Alpha" },
          { "id": "b", "label": "Beta" }
        ],
        "explanation": "Alpha is correct."
      },
      {
        "id": "q2",
        "sponsor": "Sponsor Two",
        "prompt": "Second prompt?",
        "selectionMode": "multiple",
        "correctAnswerIds": ["c", "d"],
        "options": [
          { "id": "c", "label": "Gamma" },
          { "id": "d", "label": "Delta" },
          { "id": "e", "label": "Epsilon" }
        ],
        "sponsorFact": "Sponsor fact."
      }
    ]
  }'::jsonb
);

create temp table phase3_draft_before as
select updated_at
from public.quiz_event_drafts
where id = 'phase3-event';

create temp table phase3_publish_result as
select *
from public.publish_quiz_event_draft(
  'phase3-event',
  (select updated_at from phase3_draft_before),
  '33333333-3333-4333-8333-333333333333',
  'ai_mcp'
);

select is(
  (select version_number from phase3_publish_result),
  1,
  'first publish creates version 1'
);

select is(
  (
    select count(*)
    from public.quiz_event_versions
    where event_id = 'phase3-event'
      and version_number = 1
      and published_by = '33333333-3333-4333-8333-333333333333'
  ),
  1::bigint,
  'publish creates an immutable version row with the actor'
);

select is(
  (
    select summary
    from public.quiz_events
    where id = 'phase3-event'
      and published_at is not null
  ),
  'Published from a private draft.',
  'publish upserts the public event projection'
);

select is(
  (
    select string_agg(id || ':' || display_order::text, ',' order by display_order)
    from public.quiz_questions
    where event_id = 'phase3-event'
  ),
  'q1:1,q2:2',
  'publish maps question array order into display order'
);

select is(
  (
    select string_agg(id || ':' || display_order::text || ':' || is_correct::text, ',' order by question_id, display_order)
    from public.quiz_question_options
    where event_id = 'phase3-event'
  ),
  'a:1:true,b:2:false,c:1:true,d:2:true,e:3:false',
  'publish maps option order and correct-answer membership'
);

select is(
  (
    select live_version_number
    from public.quiz_event_drafts
    where id = 'phase3-event'
      and last_published_by = '33333333-3333-4333-8333-333333333333'
      and archived_at is null
  ),
  1,
  'publish stamps draft live metadata'
);

select is(
  (
    select count(*)
    from public.quiz_event_live_transitions
    where event_id = 'phase3-event'
      and action = 'publish'
      and version_number = 1
      and details ->> 'source' = 'ai_mcp'
  ),
  1::bigint,
  'publish records an audit transition'
);

select throws_ok(
  $$
    select *
    from public.publish_quiz_event_draft(
      'phase3-event',
      (select updated_at from phase3_draft_before),
      '33333333-3333-4333-8333-333333333333',
      'admin_ui'
    )
  $$,
  'P0001',
  'stale_draft',
  'publish rejects stale expectedUpdatedAt values'
);

insert into public.quiz_events (
  id,
  slug,
  name,
  location,
  estimated_minutes,
  raffle_label,
  intro,
  summary,
  feedback_mode,
  published_at
)
values (
  'collision-live-event',
  'collision-route',
  'Collision Live Event',
  'Seattle',
  2,
  'ticket',
  'Intro',
  'Summary',
  'final_score_reveal',
  now()
);

insert into public.quiz_event_drafts (
  id,
  slug,
  name,
  content
)
values (
  'collision-draft-event',
  'collision-route',
  'Collision Draft Event',
  '{
    "id": "collision-draft-event",
    "slug": "collision-route",
    "name": "Collision Draft Event",
    "location": "Seattle",
    "estimatedMinutes": 2,
    "raffleLabel": "ticket",
    "intro": "Intro",
    "summary": "Summary",
    "feedbackMode": "final_score_reveal",
    "questions": [
      {
        "id": "q1",
        "sponsor": "Sponsor",
        "prompt": "Prompt?",
        "selectionMode": "single",
        "correctAnswerIds": ["a"],
        "options": [
          { "id": "a", "label": "A" }
        ]
      }
    ]
  }'::jsonb
);

select throws_ok(
  $$
    select *
    from public.publish_quiz_event_draft(
      'collision-draft-event',
      (select updated_at from public.quiz_event_drafts where id = 'collision-draft-event'),
      '33333333-3333-4333-8333-333333333333',
      'admin_ui'
    )
  $$,
  'P0001',
  'slug_collision',
  'publish rejects public route slug collisions'
);

create temp table phase3_archive_result as
select *
from public.archive_quiz_event(
  'phase3-event',
  1,
  '33333333-3333-4333-8333-333333333333',
  'admin_ui'
);

select isnt(
  (select archived_at from phase3_archive_result),
  null,
  'archive returns an archived timestamp'
);

select is(
  (
    select published_at
    from public.quiz_events
    where id = 'phase3-event'
  ),
  null,
  'archive hides the public route by clearing published_at'
);

select is(
  (
    select count(*)
    from public.quiz_event_versions
    where event_id = 'phase3-event'
  ),
  1::bigint,
  'archive preserves version history'
);

select is(
  (
    select count(*)
    from public.quiz_event_live_transitions
    where event_id = 'phase3-event'
      and action = 'archive'
      and version_number = 1
  ),
  1::bigint,
  'archive records an audit transition'
);

select throws_ok(
  $$
    select *
    from public.archive_quiz_event(
      'phase3-event',
      2,
      '33333333-3333-4333-8333-333333333333',
      'admin_ui'
    )
  $$,
  'P0001',
  'stale_live_version',
  'archive rejects stale expected live versions'
);

select * from finish();
rollback;
