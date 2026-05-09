-- submit_feedback RPC tests.
--
-- Behavioral cases:
--   1. anon CAN call submit_feedback() and the row lands.
--   2. anon CANNOT INSERT directly into feedback_submissions (table-grant
--      revoked by this migration).
--   3. anon CANNOT SELECT from feedback_submissions (privilege unchanged
--      from 20260506000000; re-asserted to lock the writes-only posture).
--   4. CHECK + FK invariants still fire when the call goes through the
--      RPC (the RPC body is a plain INSERT that must surface them, not
--      swallow them).
--
-- Privilege-layer assertions confirm the function-grant boundary.

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- ─── Structural: RPC exists with the expected signature ──────────────

select has_function(
  'public', 'submit_feedback',
  array['text', 'jsonb', 'boolean', 'boolean', 'text', 'text'],
  'submit_feedback(text, jsonb, boolean, boolean, text, text) exists'
);

select function_returns(
  'public', 'submit_feedback',
  array['text', 'jsonb', 'boolean', 'boolean', 'text', 'text'],
  'void',
  'submit_feedback returns void'
);

select is_definer(
  'public', 'submit_feedback',
  array['text', 'jsonb', 'boolean', 'boolean', 'text', 'text'],
  'submit_feedback is SECURITY DEFINER'
);

-- ─── Privilege layer ─────────────────────────────────────────────────

select ok(
  has_function_privilege(
    'anon',
    'public.submit_feedback(text, jsonb, boolean, boolean, text, text)',
    'EXECUTE'
  ),
  'anon has EXECUTE on submit_feedback'
);

select ok(
  not has_table_privilege('anon', 'public.feedback_submissions', 'INSERT'),
  'anon does NOT have INSERT on feedback_submissions (table-grant revoked)'
);

select ok(
  not has_table_privilege('anon', 'public.feedback_submissions', 'SELECT'),
  'anon does NOT have SELECT on feedback_submissions'
);

-- The anon-insert RLS policy was dropped by this migration.
select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_submissions'
      and policyname = 'anon can insert feedback for registered events'
  ),
  'the "anon can insert feedback for registered events" policy is gone'
);

-- ─── Behavioral case 1: anon calls the RPC and the row lands ─────────

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

-- Named-arg call so the test stays robust to parameter ordering and
-- exercises the `default null` path for p_free_text and p_email.
select submit_feedback(
  p_event_slug => 'madrona',
  p_ratings => '{"sound": 4}'::jsonb,
  p_email_declined => true,
  p_newsletter_opt_in => false
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.feedback_submissions
    where event_slug = 'madrona'),
  1,
  'case 1: anon submission via submit_feedback landed a row'
);

-- ─── Behavioral case 2: anon direct INSERT is denied ─────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select throws_ok(
  $$ insert into public.feedback_submissions (event_slug, ratings)
     values ('madrona', '{"sound": 3}'::jsonb) $$,
  '42501',
  null,
  'case 2: anon direct INSERT into feedback_submissions is denied (42501)'
);

-- ─── Behavioral case 3: anon SELECT is still denied ──────────────────

select throws_ok(
  $$ select * from public.feedback_submissions $$,
  '42501',
  null,
  'case 3: anon SELECT on feedback_submissions is denied (42501)'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Behavioral case 4: CHECK + FK still fire through the RPC ────────
--   The RPC body is a plain INSERT, so the table's invariants surface
--   as the RPC's error. email_declined=true with non-null email ⇒
--   CHECK violation (23514).

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select throws_ok(
  $$ select submit_feedback(
       p_event_slug => 'madrona',
       p_ratings => '{"sound": 3}'::jsonb,
       p_email_declined => true,
       p_newsletter_opt_in => false,
       p_email => 'attendee@example.com'
     ) $$,
  '23514',
  null,
  'case 4: CHECK violation surfaces through submit_feedback (email_declined + non-null email)'
);

-- FK violation for an unregistered slug.
select throws_ok(
  $$ select submit_feedback(
       p_event_slug => 'nonexistent-slug',
       p_ratings => '{"sound": 3}'::jsonb,
       p_email_declined => true,
       p_newsletter_opt_in => false
     ) $$,
  '23503',
  null,
  'case 4: FK violation surfaces through submit_feedback (unregistered slug)'
);

reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
