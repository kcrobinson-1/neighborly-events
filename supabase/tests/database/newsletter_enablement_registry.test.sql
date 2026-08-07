-- Newsletter enablement registry + the opt-in log's constraints
-- against it (migrations 20260805000000, 20260807000000).
--
-- "Newsletter" here names the database objects, which keep their
-- names: this registry and the log it gates are the consent store the
-- feedback form's opt-in checkbox writes to. It is not the
-- attendee-facing vocabulary — no surface in either app calls the
-- association's email list a newsletter, because the association's
-- newsletter is a printed mailer.
--
-- Covers:
--   Structural — newsletter_enabled_events shape, RLS, slug-format
--                CHECK, madrona seed; newsletter_opt_ins FK repoint to
--                the registry; email-shape CHECK on the log.
--   Privilege  — anon/authenticated lack table grants on the registry.
--   Behavioral — email-shape CHECK rejects a malformed address at the
--                table layer.
--              — feedback write-through works across the FK repoint
--                (madrona is seeded in the registry).
--
-- This file previously also covered submit_newsletter_signup — the
-- standalone signup surface's public RPC — through its grants and a
-- live anon call. Migration 20260807000000 dropped that function with
-- the route that was its only caller, so those cases went with it and
-- one absence case replaced them. The retained structures did not lose
-- coverage: normalization at write time, the append-only shape, and
-- the FK violation for an unregistered slug are all asserted through
-- the surviving writer in newsletter_opt_in_log.test.sql.

begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

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

-- ─── The dropped standalone RPC is gone, grants and all ─────────────
-- A dropped function takes its EXECUTE grants with it, so absence is
-- the whole assertion: there is no anon-callable signup function left
-- behind after its only caller was removed.

select hasnt_function(
  'public', 'submit_newsletter_signup', array['text', 'text'],
  'submit_newsletter_signup no longer exists (dropped with its only caller)'
);

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
