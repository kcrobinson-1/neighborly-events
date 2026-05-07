begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

-- Case A: event currently live (game_events.published_at is not null) →
-- event_code change must raise event_code_locked.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values
  ('ec-lock-live', 'ec-lock-live', 'ECA', 'Event Code Lock Live', '{}'::jsonb);

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
    'ec-lock-live',
    'ec-lock-live',
    'ECA',
    'Event Code Lock Live',
    'Seattle',
    2,
    'reward ticket',
    'Intro',
    'Summary',
    'final_score_reveal',
    now()
  );

update public.game_event_drafts
set last_published_version_number = 1
where id = 'ec-lock-live';

select throws_ok(
  $$
    update public.game_event_drafts
    set event_code = 'ECZ'
    where id = 'ec-lock-live'
  $$,
  'P0001',
  'event_code_locked',
  'event_code cannot change while the event is currently live'
);

-- Case B: previously published, currently unpublished, has entitlements →
-- event_code change must raise event_code_locked_by_entitlements.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values
  ('ec-lock-unpub-ent', 'ec-lock-unpub-ent', 'ECB', 'Event Code Lock Unpub Ent', '{}'::jsonb);

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
    'ec-lock-unpub-ent',
    'ec-lock-unpub-ent',
    'ECB',
    'Event Code Lock Unpub Ent',
    'Seattle',
    2,
    'reward ticket',
    'Intro',
    'Summary',
    'final_score_reveal',
    null
  );

update public.game_event_drafts
set last_published_version_number = 1
where id = 'ec-lock-unpub-ent';

insert into public.game_entitlements (event_id, client_session_id, verification_code)
values
  ('ec-lock-unpub-ent', 'session-ec-lock-unpub-ent', 'ECB-0001');

select throws_ok(
  $$
    update public.game_event_drafts
    set event_code = 'ECY'
    where id = 'ec-lock-unpub-ent'
  $$,
  'P0001',
  'event_code_locked_by_entitlements',
  'event_code cannot change while entitlements exist for an unpublished event'
);

-- Case C: previously published, currently unpublished, no entitlements →
-- event_code change must succeed. The Madrona-shape rotation case.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values
  ('ec-lock-unpub-clean', 'ec-lock-unpub-clean', 'ECC', 'Event Code Lock Unpub Clean', '{}'::jsonb);

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
    'ec-lock-unpub-clean',
    'ec-lock-unpub-clean',
    'ECC',
    'Event Code Lock Unpub Clean',
    'Seattle',
    2,
    'reward ticket',
    'Intro',
    'Summary',
    'final_score_reveal',
    null
  );

update public.game_event_drafts
set last_published_version_number = 1
where id = 'ec-lock-unpub-clean';

select lives_ok(
  $$
    update public.game_event_drafts
    set event_code = 'ECX'
    where id = 'ec-lock-unpub-clean'
  $$,
  'event_code can change after unpublish when no entitlements exist'
);

-- Case D: never-published, no entitlements → event_code change must succeed.
-- Brand-new draft path.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values
  ('ec-lock-never', 'ec-lock-never', 'ECD', 'Event Code Lock Never', '{}'::jsonb);

select lives_ok(
  $$
    update public.game_event_drafts
    set event_code = 'ECW'
    where id = 'ec-lock-never'
  $$,
  'event_code can change on a never-published draft'
);

-- Case E: never-published, but has entitlements → defensive case. The enroll
-- path requires a live event so this shouldn't arise in practice, but the
-- trigger must still block it.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values
  ('ec-lock-never-ent', 'ec-lock-never-ent', 'ECE', 'Event Code Lock Never Ent', '{}'::jsonb);

insert into public.game_entitlements (event_id, client_session_id, verification_code)
values
  ('ec-lock-never-ent', 'session-ec-lock-never-ent', 'ECE-0001');

select throws_ok(
  $$
    update public.game_event_drafts
    set event_code = 'ECV'
    where id = 'ec-lock-never-ent'
  $$,
  'P0001',
  'event_code_locked_by_entitlements',
  'event_code cannot change on a never-published draft when entitlements exist'
);

select * from finish();
rollback;
