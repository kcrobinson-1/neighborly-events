begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

-- One draft with two questions: one carrying source lines, one omitting the
-- key entirely. Publishing projects both, and the difference between them is
-- what the first two assertions below check.
insert into public.game_event_drafts (
  id,
  slug,
  event_code,
  name,
  content
)
values (
  'sources-projection-event',
  'sources-projection',
  'SPA',
  'Sources Projection Event',
  jsonb_build_object(
    'id', 'sources-projection-event',
    'slug', 'sources-projection',
    'name', 'Sources Projection Event',
    'location', 'Seattle',
    'estimatedMinutes', 2,
    'entitlementLabel', 'quiz reward',
    'intro', 'Intro',
    'summary', 'Summary',
    'feedbackMode', 'final_score_reveal',
    'allowBackNavigation', false,
    'allowRetake', true,
    'questions', jsonb_build_array(
      jsonb_build_object(
        'id', 'q1',
        'sponsor', null,
        'prompt', 'First prompt?',
        'selectionMode', 'single',
        'correctAnswerIds', jsonb_build_array('a'),
        'explanation', 'Because A is right.',
        'sources', jsonb_build_array(
          'First source line',
          'Second source line'
        ),
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'Option A'),
          jsonb_build_object('id', 'b', 'label', 'Option B')
        )
      ),
      jsonb_build_object(
        'id', 'q2',
        'sponsor', null,
        'prompt', 'Second prompt?',
        'selectionMode', 'single',
        'correctAnswerIds', jsonb_build_array('a'),
        'explanation', 'Because A is right again.',
        'options', jsonb_build_array(
          jsonb_build_object('id', 'a', 'label', 'Option A'),
          jsonb_build_object('id', 'b', 'label', 'Option B')
        )
      )
    )
  )
);

select public.publish_game_event_draft('sources-projection-event', null);

select is(
  (
    select sources
    from public.game_questions
    where event_id = 'sources-projection-event'
      and id = 'q1'
  ),
  '["First source line", "Second source line"]'::jsonb,
  'publishing projects a question''s source lines in their authored order'
);

-- Absent key, not null. A projection using coalesce alone would satisfy this
-- assertion and still fail the json-null case below, which is why both exist.
select is(
  (
    select sources
    from public.game_questions
    where event_id = 'sources-projection-event'
      and id = 'q2'
  ),
  '[]'::jsonb,
  'a question with no sources key projects an empty array rather than null'
);

-- The json-null case. `->` on a key whose value is JSON null returns jsonb
-- 'null', which coalesce does not replace; the projection must branch on the
-- value's type instead. Getting this wrong aborts the entire publish
-- transaction for every event, not only the one being edited.
update public.game_event_drafts
set content = jsonb_set(
  content,
  '{questions,1,sources}',
  'null'::jsonb,
  true
)
where id = 'sources-projection-event';

select lives_ok(
  $$select public.publish_game_event_draft('sources-projection-event', null)$$,
  'publishing survives a question whose sources key holds a json null'
);

select is(
  (
    select sources
    from public.game_questions
    where event_id = 'sources-projection-event'
      and id = 'q2'
  ),
  '[]'::jsonb,
  'a json-null sources key projects an empty array rather than aborting'
);

-- The constraint. The first case is what any shape check catches; the second
-- is the one a constraint validating only the outer type would let through.
select throws_ok(
  $$update public.game_questions
    set sources = '"not an array"'::jsonb
    where event_id = 'sources-projection-event' and id = 'q1'$$,
  '23514',
  null,
  'the constraint rejects a sources value that is not an array'
);

select throws_ok(
  $$update public.game_questions
    set sources = '["fine", 42]'::jsonb
    where event_id = 'sources-projection-event' and id = 'q1'$$,
  '23514',
  null,
  'the constraint rejects an array containing a non-string member'
);

select * from finish();

rollback;
