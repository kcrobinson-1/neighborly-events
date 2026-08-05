-- Standalone newsletter signup data model + submit_newsletter_signup
-- RPC tests (migration 20260805000000).
--
-- Covers:
--   Structural — newsletter_enabled_events shape, RLS, slug-format
--                CHECK, madrona seed; newsletter_opt_ins FK repoint to
--                the new registry; email-shape CHECK on the log.
--   Privilege  — anon/authenticated lack table grants on the registry;
--                anon and authenticated hold EXECUTE on
--                submit_newsletter_signup.
--   Behavioral — anon RPC call lands a normalized 'standalone' log row
--                (via the internal subscribe_email helper, no anon
--                grant on it — same posture reality-check as the
--                feedback write-through).
--              — repeat signup for the same (event_slug, email)
--                produces a second row (append-only shape preserved).
--              — unregistered slug surfaces the repointed FK violation
--                through the RPC.
--              — non-email-shaped input surfaces the CHECK violation
--                through the RPC.
--              — feedback write-through still works across the FK
--                repoint (madrona is seeded in the new registry).

begin;

create extension if not exists pgtap with schema extensions;

select plan(21);

-- ─── Structural: registry ────────────────────────────────────────────

select has_table(
  'public', 'newsletter_enabled_events',
  'newsletter_enabled_events table exists'
);

select ok(
  (select rowsecurity from pg_tables
    where schemaname = 'public' and tablename = 'newsletter_enabled_events'),
  'newsletter_enabled_events has RLS enabled'
);

select col_is_pk(
  'public', 'newsletter_enabled_events', 'slug',
  'newsletter_enabled_events.slug is the primary key'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'newsletter_enabled_events_slug_format'
  ),
  'named CHECK newsletter_enabled_events_slug_format exists'
);

select is(
  (select count(*)::int from public.newsletter_enabled_events
    where slug = 'madrona'),
  1,
  'newsletter_enabled_events is seeded with madrona'
);

-- ─── Structural: FK repoint + email CHECK on the log ─────────────────

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
        ilike '%references newsletter_enabled_events(slug)%'
  ),
  'newsletter_opt_ins FK on event_slug now targets newsletter_enabled_events.slug'
);

select ok(
  not exists (
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
  'newsletter_opt_ins no longer references feedback_enabled_events'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'newsletter_opt_ins_email_shape'
  ),
  'named CHECK newsletter_opt_ins_email_shape exists'
);

-- Direct INSERT as the test superuser (bypasses RLS): the CHECK is the
-- layer under test, independent of the RPC path.
select throws_ok(
  $$ insert into public.newsletter_opt_ins (event_slug, email, source_surface)
     values ('madrona', 'not-an-email', 'standalone') $$,
  '23514',
  null,
  'email-shape CHECK rejects a value without @ at the table layer'
);

-- ─── Privilege layer ─────────────────────────────────────────────────

select ok(
  not has_table_privilege('anon', 'public.newsletter_enabled_events', 'SELECT'),
  'anon does NOT have SELECT on newsletter_enabled_events'
);
select ok(
  not has_table_privilege('anon', 'public.newsletter_enabled_events', 'INSERT'),
  'anon does NOT have INSERT on newsletter_enabled_events'
);
select ok(
  has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'SELECT'),
  'authenticated has SELECT on newsletter_enabled_events (RLS-gated)'
);
select ok(
  not has_table_privilege('authenticated', 'public.newsletter_enabled_events', 'INSERT'),
  'authenticated does NOT have INSERT on newsletter_enabled_events'
);

select ok(
  has_function_privilege(
    'anon',
    'public.submit_newsletter_signup(text, text)',
    'EXECUTE'
  ),
  'anon has EXECUTE on submit_newsletter_signup'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.submit_newsletter_signup(text, text)',
    'EXECUTE'
  ),
  'authenticated has EXECUTE on submit_newsletter_signup'
);

-- ─── Behavioral: anon signup lands a normalized standalone row ───────

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select submit_newsletter_signup(
  p_event_slug => 'madrona',
  p_email => '  Neighbor@Example.COM '
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.newsletter_opt_ins
    where event_slug = 'madrona'
      and email = 'neighbor@example.com'
      and source_surface = 'standalone'),
  1,
  'anon submit_newsletter_signup wrote a normalized standalone log row'
);

-- ─── Behavioral: repeat signup appends (no dedupe at the DB layer) ──

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select submit_newsletter_signup(
  p_event_slug => 'madrona',
  p_email => 'neighbor@example.com'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.newsletter_opt_ins
    where event_slug = 'madrona'
      and email = 'neighbor@example.com'),
  2,
  'repeat signup for the same (event_slug, email) produced a second row'
);

-- ─── Behavioral: unregistered slug rejected via the repointed FK ────

select set_config(
  'request.jwt.claims',
  '{"role":"anon"}',
  true
);
set local role anon;

select throws_ok(
  $$ select submit_newsletter_signup(
       p_event_slug => 'unregistered-slug',
       p_email => 'neighbor@example.com'
     ) $$,
  '23503',
  null,
  'submit_newsletter_signup surfaces FK violation for an unregistered slug'
);

-- ─── Behavioral: malformed email rejected via the CHECK ─────────────

select throws_ok(
  $$ select submit_newsletter_signup(
       p_event_slug => 'madrona',
       p_email => 'no-at-sign'
     ) $$,
  '23514',
  null,
  'submit_newsletter_signup surfaces CHECK violation for a non-email value'
);

select throws_ok(
  $$ select submit_newsletter_signup(
       p_event_slug => 'madrona',
       p_email => '   '
     ) $$,
  '23514',
  null,
  'submit_newsletter_signup surfaces CHECK violation for whitespace-only input'
);

reset role;
select set_config('request.jwt.claims', '', true);

-- ─── Behavioral: feedback write-through survives the FK repoint ─────

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
  p_newsletter_opt_in => true,
  p_email => 'writethrough@example.com'
);

reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::int from public.newsletter_opt_ins
    where email = 'writethrough@example.com'
      and source_surface = 'feedback_form'),
  1,
  'submit_feedback opt-in still writes a capture row against the new FK target'
);

select * from finish();
rollback;
