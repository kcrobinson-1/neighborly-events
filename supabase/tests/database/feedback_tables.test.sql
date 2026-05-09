-- Madrona feedback child epic / M1 / phase 1.1 — DB foundation tests.
--
-- Validation gate per the phase plan's Validation Gate section. The
-- behavioral cases:
--   1. insert with unregistered slug → FK violation (23503)
--   2. email_declined = true with non-null email → CHECK violation
--   3. newsletter_opt_in = true with email = null → CHECK violation
--   4. newsletter_opt_in = true with email_declined = true and a
--      non-null email → CHECK violation (consent-record without
--      valid consent)
--   5. anon SELECT on submissions → 42501 (privilege revoked)
--   6. anon SELECT on registry → 42501 (privilege revoked)
--
-- The anon write path (insert from the public form) is exercised in
-- submit_feedback_rpc.test.sql; this file owns the table-level
-- structural and constraint surface.
--
-- Structural assertions confirm the table shapes, the FK, the index,
-- the named CHECK constraints, the RLS posture, and the named policies.
begin;

create extension if not exists pgtap with schema extensions;

select plan(37);

-- ─── Structural: tables exist with RLS enabled ────────────────────────

select has_table(
  'public', 'feedback_enabled_events',
  'feedback_enabled_events table exists'
);
select has_table(
  'public', 'feedback_submissions',
  'feedback_submissions table exists'
);

select ok(
  (select rowsecurity from pg_tables
    where schemaname = 'public' and tablename = 'feedback_enabled_events'),
  'feedback_enabled_events has RLS enabled'
);
select ok(
  (select rowsecurity from pg_tables
    where schemaname = 'public' and tablename = 'feedback_submissions'),
  'feedback_submissions has RLS enabled'
);

-- ─── Structural: column shapes ────────────────────────────────────────

select col_type_is(
  'public', 'feedback_enabled_events', 'slug', 'text',
  'feedback_enabled_events.slug is text'
);
select col_is_pk(
  'public', 'feedback_enabled_events', 'slug',
  'feedback_enabled_events.slug is the primary key'
);
select col_type_is(
  'public', 'feedback_enabled_events', 'enabled_at',
  'timestamp with time zone',
  'feedback_enabled_events.enabled_at is timestamptz'
);

select col_type_is(
  'public', 'feedback_submissions', 'id', 'uuid',
  'feedback_submissions.id is uuid'
);
select col_is_pk(
  'public', 'feedback_submissions', 'id',
  'feedback_submissions.id is the primary key'
);
select col_type_is(
  'public', 'feedback_submissions', 'event_slug', 'text',
  'feedback_submissions.event_slug is text'
);
select col_type_is(
  'public', 'feedback_submissions', 'ratings', 'jsonb',
  'feedback_submissions.ratings is jsonb'
);
select col_not_null(
  'public', 'feedback_submissions', 'ratings',
  'feedback_submissions.ratings is not null'
);

-- ─── Structural: FK + index + named CHECK constraints ─────────────────

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'feedback_submissions'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid)
        ilike '%references feedback_enabled_events(slug)%'
  ),
  'feedback_submissions has FK on event_slug → feedback_enabled_events.slug'
);

select has_index(
  'public', 'feedback_submissions',
  'feedback_submissions_event_slug_submitted_at_idx',
  'feedback_submissions_event_slug_submitted_at_idx exists'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'feedback_submissions_email_declined_implies_null_email'
  ),
  'named CHECK feedback_submissions_email_declined_implies_null_email exists'
);
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'feedback_submissions_newsletter_opt_in_requires_email'
  ),
  'named CHECK feedback_submissions_newsletter_opt_in_requires_email exists'
);

-- ─── Structural: RLS policies present (read paths only) ───────────────
-- The original anon-insert policy was dropped by 20260509000000 in
-- favor of the SECURITY DEFINER submit_feedback RPC; only the
-- organizer/admin SELECT policies remain on these tables.

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_submissions'
      and policyname = 'anon can insert feedback for registered events'
  ),
  'the legacy anon-insert policy on feedback_submissions is gone'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_submissions'
      and policyname = 'organizers and admins can read event feedback'
      and cmd = 'SELECT'
  ),
  'organizer/admin SELECT policy on feedback_submissions exists'
);
select ok(
  exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'feedback_enabled_events'
      and policyname = 'organizers and admins can read feedback registry'
      and cmd = 'SELECT'
  ),
  'organizer/admin SELECT policy on feedback_enabled_events exists'
);

-- ─── Registry seed: madrona pre-registered ────────────────────────────

select is(
  (select count(*)::int from public.feedback_enabled_events where slug = 'madrona'),
  1,
  'madrona is seeded into feedback_enabled_events'
);

-- ─── Seed a feedback_submissions row for the organizer read tests ────
--   Anon's table-level INSERT was revoked by 20260509000000; anon must
--   go through public.submit_feedback. Tests run under the test
--   superuser role, which bypasses RLS by default — direct INSERT here
--   is fine and is the cleanest way to seed.

insert into public.feedback_submissions (event_slug, ratings)
values ('madrona', '{"sound": 4, "venue": 5}'::jsonb);

-- ─── Behavioral case 1: insert with unregistered slug fails (FK) ─────
--   The FK is the load-bearing integrity gate, regardless of caller.

select throws_ok(
  $$ insert into public.feedback_submissions (event_slug, ratings)
     values ('nonexistent-slug', '{"sound": 3}'::jsonb) $$,
  '23503',
  null,
  'case 1: insert against an unregistered slug raises FK violation'
);

-- ─── Behavioral case 2: email_declined + non-null email rejected ─────

select throws_ok(
  $$ insert into public.feedback_submissions
       (event_slug, ratings, email, email_declined)
     values
       ('madrona', '{"sound": 3}'::jsonb,
        'attendee@example.com', true) $$,
  '23514',
  null,
  'case 2: email_declined=true with non-null email raises CHECK violation'
);

-- ─── Behavioral case 3: newsletter_opt_in + null email rejected ──────

select throws_ok(
  $$ insert into public.feedback_submissions
       (event_slug, ratings, email, newsletter_opt_in)
     values
       ('madrona', '{"sound": 3}'::jsonb, null, true) $$,
  '23514',
  null,
  'case 3: newsletter_opt_in=true with email=null raises CHECK violation'
);

-- ─── Behavioral case 4: newsletter_opt_in + email_declined + email ───
--   Consent record without valid consent. The plan calls this out as
--   load-bearing because either single-axis check alone would let it
--   through.

select throws_ok(
  $$ insert into public.feedback_submissions
       (event_slug, ratings, email, email_declined, newsletter_opt_in)
     values
       ('madrona', '{"sound": 3}'::jsonb,
        'attendee@example.com', true, true) $$,
  '23514',
  null,
  'case 4: newsletter_opt_in=true with email_declined=true raises CHECK violation'
);

-- ─── Behavioral case 5: anon SELECT on submissions denied ────────────

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select throws_ok(
  $$ select * from public.feedback_submissions $$,
  '42501',
  null,
  'case 5: anon SELECT on feedback_submissions is denied'
);

-- ─── Behavioral case 6: anon SELECT on registry denied ───────────────

select throws_ok(
  $$ select * from public.feedback_enabled_events $$,
  '42501',
  null,
  'case 6: anon SELECT on feedback_enabled_events is denied'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Behavioral: organizer SELECT path through helper ────────────────
-- Confirm the policy actually fires and the JOIN-through-game_events
-- shape parses (Risk Register: row-reference ambiguity in registry
-- SELECT body). Seed a game_events row matching the madrona slug so
-- the inner select returns a real id, then assign an organizer.

set local session_replication_role = 'replica';

-- The policy subquery (select ge.id from game_events ge where ge.slug = ...)
-- runs in the caller's RLS context, and game_events.SELECT for
-- authenticated requires published_at IS NOT NULL. Seeding with
-- published_at set is the only way the inner select returns a row when
-- the test impersonates an authenticated organizer. For real Madrona
-- this is fine — the event is published before feedback is collected;
-- the plan's Risk Register accepts the "no game_events row → no read"
-- edge for events without a game_events row, and the same path applies
-- to unpublished rows.
insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes, entitlement_label,
  intro, summary, feedback_mode, published_at
)
values (
  'madrona', 'madrona', 'MAD', 'Madrona Test',
  'Seattle', 2, 'reward', 'Intro', 'Summary', 'final_score_reveal', now()
)
on conflict (id) do nothing;

insert into public.event_role_assignments (user_id, event_id, role)
values
  ('cccccccc-cc00-4000-8000-0000000000cc'::uuid, 'madrona', 'organizer');

set local session_replication_role = 'origin';

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"cccccccc-cc00-4000-8000-0000000000cc"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.feedback_submissions
    where event_slug = 'madrona'),
  1,
  'organizer for madrona reads the seeded submission via SELECT policy'
);

select is(
  (select count(*)::int from public.feedback_enabled_events
    where slug = 'madrona'),
  1,
  'organizer for madrona reads the registry row via SELECT policy'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Behavioral: unrelated authenticated user sees nothing ───────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"dddddddd-dd00-4000-8000-0000000000dd"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.feedback_submissions),
  0,
  'unrelated authenticated user sees no feedback_submissions'
);

select is(
  (select count(*)::int from public.feedback_enabled_events),
  0,
  'unrelated authenticated user sees no feedback_enabled_events rows'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Privilege layer ─────────────────────────────────────────────────
-- The anon write path runs through public.submit_feedback (covered in
-- submit_feedback_rpc.test.sql). Anon must NOT hold direct INSERT on
-- the table.

select ok(
  not has_table_privilege('anon', 'public.feedback_submissions', 'INSERT'),
  'anon does NOT have INSERT privilege on feedback_submissions'
);
select ok(
  not has_table_privilege('anon', 'public.feedback_submissions', 'SELECT'),
  'anon does NOT have SELECT privilege on feedback_submissions'
);
select ok(
  not has_table_privilege('anon', 'public.feedback_enabled_events', 'SELECT'),
  'anon does NOT have SELECT privilege on feedback_enabled_events'
);
select ok(
  has_table_privilege('authenticated', 'public.feedback_submissions', 'SELECT'),
  'authenticated has SELECT privilege on feedback_submissions'
);
select ok(
  has_table_privilege('authenticated', 'public.feedback_enabled_events', 'SELECT'),
  'authenticated has SELECT privilege on feedback_enabled_events'
);
select ok(
  not has_table_privilege('authenticated', 'public.feedback_submissions', 'UPDATE'),
  'authenticated does NOT have UPDATE on feedback_submissions'
);
select ok(
  not has_table_privilege('authenticated', 'public.feedback_submissions', 'DELETE'),
  'authenticated does NOT have DELETE on feedback_submissions'
);

select * from finish();
rollback;
