begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select ok(
  has_table_privilege('authenticated', 'public.game_event_admin_status', 'SELECT'),
  'authenticated can read game_event_admin_status'
);

select ok(
  not has_table_privilege('anon', 'public.game_event_admin_status', 'SELECT'),
  'anon cannot read game_event_admin_status'
);

insert into public.game_event_drafts (
  id,
  slug,
  event_code,
  name,
  content,
  updated_at
)
values (
  'draft-only-event',
  'draft-only-event',
  'DOE',
  'Draft Only Event',
  jsonb_build_object(
    'id', 'draft-only-event',
    'slug', 'draft-only-event',
    'name', 'Draft Only Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  '2026-04-23T10:00:00Z'::timestamptz
);

insert into public.game_event_drafts (
  id,
  slug,
  event_code,
  name,
  content,
  last_published_version_number,
  last_published_at,
  updated_at
)
values
(
  'live-event',
  'live-event',
  'LIV',
  'Live Event',
  jsonb_build_object(
    'id', 'live-event',
    'slug', 'live-event',
    'name', 'Live Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  1,
  '2026-04-23T11:00:00Z'::timestamptz,
  '2026-04-23T11:00:01Z'::timestamptz
),
(
  'live-with-draft-changes',
  'live-with-draft-changes',
  'LWC',
  'Live With Draft Changes',
  jsonb_build_object(
    'id', 'live-with-draft-changes',
    'slug', 'live-with-draft-changes',
    'name', 'Live With Draft Changes',
    'location', 'Seattle',
    'estimatedMinutes', 3,
    'entitlementLabel', 'ticket',
    'intro', 'Updated intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  1,
  '2026-04-23T12:00:00Z'::timestamptz,
  '2026-04-23T12:05:00Z'::timestamptz
),
(
  'paused-event',
  'paused-event',
  'PAU',
  'Paused Event',
  jsonb_build_object(
    'id', 'paused-event',
    'slug', 'paused-event',
    'name', 'Paused Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  1,
  '2026-04-23T13:00:00Z'::timestamptz,
  '2026-04-23T13:05:00Z'::timestamptz
),
(
  'missing-version-event',
  'missing-version-event',
  'MIS',
  'Missing Version Event',
  jsonb_build_object(
    'id', 'missing-version-event',
    'slug', 'missing-version-event',
    'name', 'Missing Version Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  2,
  '2026-04-23T14:00:00Z'::timestamptz,
  '2026-04-23T14:05:00Z'::timestamptz
);

insert into public.game_event_versions (
  event_id,
  version_number,
  schema_version,
  content,
  published_at
)
values
(
  'live-event',
  1,
  1,
  jsonb_build_object(
    'id', 'live-event',
    'slug', 'live-event',
    'name', 'Live Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  '2026-04-23T11:00:00Z'::timestamptz
),
(
  'live-with-draft-changes',
  1,
  1,
  jsonb_build_object(
    'id', 'live-with-draft-changes',
    'slug', 'live-with-draft-changes',
    'name', 'Live With Draft Changes',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  '2026-04-23T12:00:00Z'::timestamptz
),
(
  'paused-event',
  1,
  1,
  jsonb_build_object(
    'id', 'paused-event',
    'slug', 'paused-event',
    'name', 'Paused Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  '2026-04-23T13:00:00Z'::timestamptz
),
(
  'paused-event',
  2,
  1,
  jsonb_build_object(
    'id', 'paused-event',
    'slug', 'paused-event',
    'name', 'Paused Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'ticket',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'questions', '[]'::jsonb
  ),
  '2026-04-23T13:10:00Z'::timestamptz
);

insert into public.game_events (
  id,
  slug,
  event_code,
  name,
  location,
  estimated_minutes,
  entitlement_label,
  intro,
  summary,
  feedback_mode,
  published_at
)
values
(
  'live-event',
  'live-event',
  'LIV',
  'Live Event',
  'Seattle',
  2,
  'ticket',
  'Intro',
  'Summary',
  'final_score_reveal',
  '2026-04-23T11:00:00Z'::timestamptz
),
(
  'live-with-draft-changes',
  'live-with-draft-changes',
  'LWC',
  'Live With Draft Changes',
  'Seattle',
  2,
  'ticket',
  'Intro',
  'Summary',
  'final_score_reveal',
  '2026-04-23T12:00:00Z'::timestamptz
),
(
  'paused-event',
  'paused-event',
  'PAU',
  'Paused Event',
  'Seattle',
  2,
  'ticket',
  'Intro',
  'Summary',
  'final_score_reveal',
  null
),
(
  'missing-version-event',
  'missing-version-event',
  'MIS',
  'Missing Version Event',
  'Seattle',
  2,
  'ticket',
  'Intro',
  'Summary',
  'final_score_reveal',
  '2026-04-23T14:00:00Z'::timestamptz
);

select results_eq(
  $$
    select event_id, status, is_live
    from public.game_event_admin_status
    where event_id = 'draft-only-event'
  $$,
  $$ values ('draft-only-event'::text, 'draft_only'::text, false) $$,
  'never-published drafts read as draft_only and non-live'
);

select results_eq(
  $$
    select event_id, status, is_live
    from public.game_event_admin_status
    where event_id = 'live-event'
  $$,
  $$ values ('live-event'::text, 'live'::text, true) $$,
  'published drafts with matching content read as live'
);

select results_eq(
  $$
    select event_id, status, is_live
    from public.game_event_admin_status
    where event_id = 'live-with-draft-changes'
  $$,
  $$ values ('live-with-draft-changes'::text, 'live_with_draft_changes'::text, true) $$,
  'published drafts with edited content read as live_with_draft_changes'
);

select results_eq(
  $$
    select event_id, status, is_live
    from public.game_event_admin_status
    where event_id = 'paused-event'
  $$,
  $$ values ('paused-event'::text, 'draft_only'::text, false) $$,
  'previously published but currently unpublished drafts collapse to draft_only'
);

select results_eq(
  $$
    select event_id, status, is_live
    from public.game_event_admin_status
    where event_id = 'missing-version-event'
  $$,
  $$ values ('missing-version-event'::text, 'draft_only'::text, false) $$,
  'missing version rows degrade to draft_only instead of crashing reads'
);

select is(
  (
    select last_published_version_number
    from public.game_event_admin_status
    where event_id = 'live-event'
  ),
  1,
  'view exposes the historical last_published_version_number'
);

select is(
  (
    select first_published_at
    from public.game_event_admin_status
    where event_id = 'paused-event'
  ),
  '2026-04-23T13:00:00Z'::timestamptz,
  'first_published_at is the earliest version timestamp'
);

select is(
  (
    select draft_updated_at
    from public.game_event_admin_status
    where event_id = 'live-event'
  ),
  (
    select updated_at
    from public.game_event_drafts
    where id = 'live-event'
  ),
  'draft_updated_at mirrors the draft row updated_at value'
);

select * from finish();
rollback;
