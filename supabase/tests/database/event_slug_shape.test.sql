begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- Insert helpers for game_event_drafts (event_code required, content jsonb).
-- Reject cases share the same plumbing as event_code_data_model.test.sql.

select throws_ok(
  format(
    $$
      insert into public.game_event_drafts (id, slug, event_code, name, content)
      values (
        'bad-slug-draft-%s',
        %L,
        'AAA',
        'Bad Slug Draft',
        '{}'::jsonb
      )
    $$,
    invalid_case.ordinality,
    invalid_case.slug
  ),
  '23514',
  null,
  format('game_event_drafts rejects invalid slug: %s', invalid_case.label)
)
from (
  select
    slug,
    label,
    row_number() over () as ordinality
  from (
    values
      ('', 'empty'),
      ('-leading', 'leading hyphen'),
      ('trailing-', 'trailing hyphen'),
      ('UPPER', 'uppercase'),
      ('has space', 'whitespace'),
      ('with_underscore', 'underscore'),
      ('with/slash', 'reserved url char'),
      ('with.dot', 'dot'),
      (repeat('a', 65), 'over length cap')
  ) as cases(slug, label)
) as invalid_case;

select throws_ok(
  format(
    $$
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
        feedback_mode
      )
      values (
        'bad-slug-event',
        %L,
        'AAB',
        'Bad Slug Event',
        'Seattle',
        2,
        'reward ticket',
        'Intro',
        'Summary',
        'final_score_reveal'
      )
    $$,
    'Bad Slug'
  ),
  '23514',
  null,
  'game_events rejects invalid slug (uppercase + whitespace)'
);

select throws_ok(
  $$
    insert into public.feedback_enabled_events (slug) values ('Bad Slug')
  $$,
  '23514',
  null,
  'feedback_enabled_events rejects invalid slug (uppercase + whitespace)'
);

select * from finish();
rollback;
