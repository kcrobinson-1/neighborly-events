-- Newsletter opt-in capture log + subscribe_email helper +
-- submit_feedback write-through tests.
--
-- Covers:
--   Structural — table shape, FK, index, RLS, source_surface CHECK.
--   Privilege  — anon/authenticated lack table grants and function
--                EXECUTE on subscribe_email.
--   Behavioral — submit_feedback with p_newsletter_opt_in = true
--                lands a capture-log row (the load-bearing helper-
--                grant-posture reality check: anon's call to the
--                public RPC reaches the internal helper without a
--                grant being issued to anon).
--              — submit_feedback with p_newsletter_opt_in = false
--                writes the feedback row but no capture row.
--              — repeat opt-ins for the same (event_slug, email)
--                produce multiple log rows (Decision 2 — append-only
--                shape, no row-uniqueness).
--              — email is normalized lower(trim(...)) at write time.
--              — FK on event_slug rejects unregistered slugs.
--              — source_surface CHECK rejects unknown literals.
--              — anon SELECT on newsletter_opt_ins is denied.
--              — organizer for the slug's event reads the log row.

begin;

create extension if not exists pgtap with schema extensions;

select plan(24);

-- ─── Structural assertions ───────────────────────────────────────────

select has_table(
  'public', 'newsletter_opt_ins',
  'newsletter_opt_ins table exists'
);

select ok(
  (select rowsecurity from pg_tables
    where schemaname = 'public' and tablename = 'newsletter_opt_ins'),
  'newsletter_opt_ins has RLS enabled'
);

select col_type_is(
  'public', 'newsletter_opt_ins', 'id', 'uuid',
  'newsletter_opt_ins.id is uuid'
);
select col_is_pk(
  'public', 'newsletter_opt_ins', 'id',
  'newsletter_opt_ins.id is the primary key'
);
select col_type_is(
  'public', 'newsletter_opt_ins', 'event_slug', 'text',
  'newsletter_opt_ins.event_slug is text'
);
select col_type_is(
  'public', 'newsletter_opt_ins', 'email', 'text',
  'newsletter_opt_ins.email is text'
);
select col_type_is(
  'public', 'newsletter_opt_ins', 'opted_in_at',
  'timestamp with time zone',
  'newsletter_opt_ins.opted_in_at is timestamptz'
);
select col_type_is(
  'public', 'newsletter_opt_ins', 'source_surface', 'text',
  'newsletter_opt_ins.source_surface is text'
);

select ok(
  exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'newsletter_opt_ins'
      and c.contype = 'f'
      and pg_get_constraintdef(c.oid)
        ilike '%references feedback_enabled_events(slug)%'
  ),
  'newsletter_opt_ins has FK on event_slug → feedback_enabled_events.slug'
);

select has_index(
  'public', 'newsletter_opt_ins',
  'newsletter_opt_ins_event_slug_opted_in_at_idx',
  'newsletter_opt_ins_event_slug_opted_in_at_idx exists'
);

-- Confirm the index is non-unique (log shape, multiple rows per
-- (event_slug, email) are expected).
select ok(
  not (
    select indisunique
      from pg_index
     where indexrelid = 'public.newsletter_opt_ins_event_slug_opted_in_at_idx'::regclass
  ),
  'newsletter_opt_ins_event_slug_opted_in_at_idx is non-unique'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'newsletter_opt_ins_source_surface_known'
  ),
  'named CHECK newsletter_opt_ins_source_surface_known exists'
);

-- ─── Privilege layer ─────────────────────────────────────────────────

select ok(
  not has_table_privilege('anon', 'public.newsletter_opt_ins', 'INSERT'),
  'anon does NOT have INSERT on newsletter_opt_ins'
);
select ok(
  not has_table_privilege('anon', 'public.newsletter_opt_ins', 'SELECT'),
  'anon does NOT have SELECT on newsletter_opt_ins'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.subscribe_email(text, text, text)',
    'EXECUTE'
  ),
  'anon does NOT have EXECUTE on subscribe_email (internal helper)'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.subscribe_email(text, text, text)',
    'EXECUTE'
  ),
  'authenticated does NOT have EXECUTE on subscribe_email'
);

-- ─── Behavioral case: anon submit_feedback writes through to log ────
-- This is the load-bearing reality check from Decision 4: anon calls
-- submit_feedback, which (as SECURITY DEFINER) calls subscribe_email
-- whose EXECUTE has been revoked from anon. The call must succeed
-- because PG resolves the inner function's EXECUTE check against the
-- current_user inside submit_feedback's body — i.e., the function
-- owner — not against the original anon caller. If this test fails,
-- the helper-grant posture is wrong and must be revisited; do NOT
-- silently grant EXECUTE to anon to make it work.

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select submit_feedback(
  p_event_slug => 'madrona',
  p_ratings => '{"sound": 4}'::jsonb,
  p_email_declined => false,
  p_newsletter_opt_in => true,
  p_email => 'Attendee@Example.COM'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.newsletter_opt_ins
    where event_slug = 'madrona'
      and email = 'attendee@example.com'
      and source_surface = 'feedback_form'),
  1,
  'submit_feedback with opt_in=true wrote a normalized capture-log row via subscribe_email'
);

-- ─── Behavioral case: opt_in=false writes feedback row but no log row ──

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select submit_feedback(
  p_event_slug => 'madrona',
  p_ratings => '{"sound": 5}'::jsonb,
  p_email_declined => false,
  p_newsletter_opt_in => false,
  p_email => 'noopt@example.com'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.newsletter_opt_ins
    where email = 'noopt@example.com'),
  0,
  'submit_feedback with opt_in=false did NOT write a capture-log row'
);

-- ─── Behavioral case: repeat opt-ins are append-only ────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select submit_feedback(
  p_event_slug => 'madrona',
  p_ratings => '{"sound": 4}'::jsonb,
  p_email_declined => false,
  p_newsletter_opt_in => true,
  p_email => 'attendee@example.com'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.newsletter_opt_ins
    where event_slug = 'madrona'
      and email = 'attendee@example.com'),
  2,
  'repeat opt-in for the same (event_slug, email) produced a second log row (append-only)'
);

-- ─── FK violation: unregistered slug rejected at the table layer ────
-- Direct INSERT here runs as the test superuser (bypasses RLS). The
-- FK is what we're exercising.

select throws_ok(
  $$ insert into public.newsletter_opt_ins (event_slug, email, source_surface)
     values ('nonexistent-slug', 'a@b.com', 'feedback_form') $$,
  '23503',
  null,
  'FK violation surfaces for unregistered event_slug'
);

-- ─── source_surface CHECK rejects unknown literals ──────────────────

select throws_ok(
  $$ insert into public.newsletter_opt_ins (event_slug, email, source_surface)
     values ('madrona', 'a@b.com', 'admin_console') $$,
  '23514',
  null,
  'CHECK violation surfaces for unknown source_surface'
);

-- ─── Anon SELECT on newsletter_opt_ins is denied ────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select throws_ok(
  $$ select * from public.newsletter_opt_ins $$,
  '42501',
  null,
  'anon SELECT on newsletter_opt_ins is denied (42501)'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Organizer SELECT path through helper ───────────────────────────
-- Seed a published game_events row so is_organizer_for_event resolves
-- through game_events.SELECT. Same pattern feedback_tables.test.sql
-- uses for the symmetric organizer read on feedback_submissions.

set local session_replication_role = 'replica';

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
  ('cccccccc-cc00-4000-8000-0000000000cc'::uuid, 'madrona', 'organizer')
on conflict do nothing;

set local session_replication_role = 'origin';

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"cccccccc-cc00-4000-8000-0000000000cc"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.newsletter_opt_ins
    where event_slug = 'madrona'),
  2,
  'organizer for madrona reads the log rows via SELECT policy'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- Unrelated authenticated user sees nothing.

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"dddddddd-dd00-4000-8000-0000000000dd"}',
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.newsletter_opt_ins),
  0,
  'unrelated authenticated user sees no newsletter_opt_ins rows'
);

reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
