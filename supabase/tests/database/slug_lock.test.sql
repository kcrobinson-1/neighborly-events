begin;

create extension if not exists pgtap with schema extensions;

select plan(3);

-- Case A: event currently live (game_events.published_at is not null) →
-- slug change must raise slug_locked.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values
  ('slug-lock-live', 'slug-lock-live', 'SLA', 'Slug Lock Live', '{}'::jsonb);

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
    'slug-lock-live',
    'slug-lock-live',
    'SLA',
    'Slug Lock Live',
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
where id = 'slug-lock-live';

select throws_ok(
  $$
    update public.game_event_drafts
    set slug = 'slug-lock-live-renamed'
    where id = 'slug-lock-live'
  $$,
  'P0001',
  'slug_locked',
  'slug cannot change while the event is currently live'
);

-- Case B: event previously published but currently unpublished
-- (game_events row exists with published_at = null) → slug change must succeed.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values
  ('slug-lock-unpublished', 'slug-lock-unpublished', 'SLB', 'Slug Lock Unpublished', '{}'::jsonb);

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
    'slug-lock-unpublished',
    'slug-lock-unpublished',
    'SLB',
    'Slug Lock Unpublished',
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
where id = 'slug-lock-unpublished';

select lives_ok(
  $$
    update public.game_event_drafts
    set slug = 'slug-lock-unpublished-renamed'
    where id = 'slug-lock-unpublished'
  $$,
  'slug can change after unpublish even when last_published_version_number is set'
);

-- Case C: never-published draft (no game_events row at all) → slug change
-- must succeed. Covers the brand-new-draft path.
insert into public.game_event_drafts (id, slug, event_code, name, content)
values
  ('slug-lock-never', 'slug-lock-never', 'SLC', 'Slug Lock Never', '{}'::jsonb);

select lives_ok(
  $$
    update public.game_event_drafts
    set slug = 'slug-lock-never-renamed'
    where id = 'slug-lock-never'
  $$,
  'slug can change on a never-published draft'
);

select * from finish();
rollback;
