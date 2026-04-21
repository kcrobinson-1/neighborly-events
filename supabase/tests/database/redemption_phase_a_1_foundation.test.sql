begin;

create extension if not exists pgtap with schema extensions;

select plan(54);

-- ─── game_entitlements column additions ──────────────────────────────────────

select col_type_is(
  'public', 'game_entitlements', 'redeemed_at', 'timestamp with time zone',
  'game_entitlements.redeemed_at is timestamptz'
);
select col_is_null(
  'public', 'game_entitlements', 'redeemed_at',
  'game_entitlements.redeemed_at is nullable'
);

select col_type_is(
  'public', 'game_entitlements', 'redeemed_by', 'uuid',
  'game_entitlements.redeemed_by is uuid'
);
select col_is_null(
  'public', 'game_entitlements', 'redeemed_by',
  'game_entitlements.redeemed_by is nullable'
);

select col_type_is(
  'public', 'game_entitlements', 'redeemed_by_role', 'text',
  'game_entitlements.redeemed_by_role is text'
);
select col_is_null(
  'public', 'game_entitlements', 'redeemed_by_role',
  'game_entitlements.redeemed_by_role is nullable'
);

select col_type_is(
  'public', 'game_entitlements', 'redeemed_event_id', 'text',
  'game_entitlements.redeemed_event_id is text'
);
select col_is_null(
  'public', 'game_entitlements', 'redeemed_event_id',
  'game_entitlements.redeemed_event_id is nullable'
);

select col_type_is(
  'public', 'game_entitlements', 'redemption_status', 'text',
  'game_entitlements.redemption_status is text'
);
select col_not_null(
  'public', 'game_entitlements', 'redemption_status',
  'game_entitlements.redemption_status is not null'
);
select is(
  (
    select pg_get_expr(pg_attrdef.adbin, pg_attrdef.adrelid)
    from pg_attribute
    join pg_attrdef on pg_attrdef.adrelid = pg_attribute.attrelid
      and pg_attrdef.adnum = pg_attribute.attnum
    where pg_attribute.attrelid = 'public.game_entitlements'::regclass
      and pg_attribute.attname = 'redemption_status'
  ),
  '''unredeemed''::text',
  'game_entitlements.redemption_status defaults to unredeemed'
);

select col_type_is(
  'public', 'game_entitlements', 'redemption_reversed_at', 'timestamp with time zone',
  'game_entitlements.redemption_reversed_at is timestamptz'
);
select col_type_is(
  'public', 'game_entitlements', 'redemption_reversed_by', 'uuid',
  'game_entitlements.redemption_reversed_by is uuid'
);
select col_type_is(
  'public', 'game_entitlements', 'redemption_reversed_by_role', 'text',
  'game_entitlements.redemption_reversed_by_role is text'
);
select col_type_is(
  'public', 'game_entitlements', 'redemption_note', 'text',
  'game_entitlements.redemption_note is text'
);

-- ─── Monitoring index ────────────────────────────────────────────────────────

select has_index(
  'public', 'game_entitlements', 'game_entitlements_event_redeemed_at_idx',
  'game_entitlements_event_redeemed_at_idx exists'
);

-- ─── Shape-check fixtures ────────────────────────────────────────────────────

insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes, entitlement_label,
  intro, summary, feedback_mode
)
values (
  'redemption-a1-event', 'redemption-a1-event', 'RED', 'Redemption A.1 Event',
  'Seattle', 2, 'reward ticket', 'Intro', 'Summary', 'final_score_reveal'
);

-- Default insert produces a valid unredeemed row.
insert into public.game_entitlements (event_id, client_session_id, verification_code)
values ('redemption-a1-event', 'unredeemed-session', 'RED-0001');

select is(
  (select redemption_status from public.game_entitlements where client_session_id = 'unredeemed-session'),
  'unredeemed',
  'new entitlement row defaults redemption_status to unredeemed'
);

select is(
  (select redeemed_at from public.game_entitlements where client_session_id = 'unredeemed-session'),
  null::timestamptz,
  'new entitlement row has null redeemed_at'
);

-- A fully-populated redeemed row passes the shape check.
insert into public.game_entitlements (
  event_id,
  client_session_id,
  verification_code,
  redemption_status,
  redeemed_at,
  redeemed_by_role,
  redeemed_event_id
)
values (
  'redemption-a1-event',
  'redeemed-session',
  'RED-0002',
  'redeemed',
  now(),
  'agent',
  'redemption-a1-event'
);

select is(
  (select redemption_status from public.game_entitlements where client_session_id = 'redeemed-session'),
  'redeemed',
  'fully-populated redeemed row is accepted'
);

-- A reversed row (status flipped back to unredeemed, reversal fields set, redeemed_* cleared)
-- passes the shape check too.
insert into public.game_entitlements (
  event_id,
  client_session_id,
  verification_code,
  redemption_status,
  redemption_reversed_at,
  redemption_reversed_by_role
)
values (
  'redemption-a1-event',
  'reversed-session',
  'RED-0003',
  'unredeemed',
  now(),
  'organizer'
);

select is(
  (select redemption_reversed_by_role from public.game_entitlements where client_session_id = 'reversed-session'),
  'organizer',
  'reversed row retains reversal metadata while status is back to unredeemed'
);

-- Shape check rejects: redeemed status with null redeemed_at.
select throws_ok(
  $$
    insert into public.game_entitlements (
      event_id, client_session_id, verification_code,
      redemption_status, redeemed_by_role, redeemed_event_id
    )
    values (
      'redemption-a1-event', 'invalid-missing-at', 'RED-1001',
      'redeemed', 'agent', 'redemption-a1-event'
    )
  $$,
  '23514',
  null,
  'shape check rejects redeemed status with null redeemed_at'
);

-- Shape check rejects: redeemed status with mismatched redeemed_event_id.
select throws_ok(
  $$
    insert into public.game_entitlements (
      event_id, client_session_id, verification_code,
      redemption_status, redeemed_at, redeemed_by_role, redeemed_event_id
    )
    values (
      'redemption-a1-event', 'invalid-mismatch', 'RED-1002',
      'redeemed', now(), 'agent', 'some-other-event'
    )
  $$,
  '23514',
  null,
  'shape check rejects redeemed status with redeemed_event_id != event_id'
);

-- Shape check rejects: unredeemed status with non-null redeemed_at.
select throws_ok(
  $$
    insert into public.game_entitlements (
      event_id, client_session_id, verification_code,
      redemption_status, redeemed_at
    )
    values (
      'redemption-a1-event', 'invalid-unredeemed-with-at', 'RED-1003',
      'unredeemed', now()
    )
  $$,
  '23514',
  null,
  'shape check rejects unredeemed status with a populated redeemed_at'
);

-- redemption_status CHECK rejects anything outside the whitelist.
select throws_ok(
  $$
    insert into public.game_entitlements (
      event_id, client_session_id, verification_code, redemption_status
    )
    values (
      'redemption-a1-event', 'invalid-status', 'RED-1004', 'pending'
    )
  $$,
  '23514',
  null,
  'redemption_status CHECK rejects out-of-whitelist values'
);

-- redeemed_by_role CHECK rejects 'organizer' (reversal-only role).
select throws_ok(
  $$
    insert into public.game_entitlements (
      event_id, client_session_id, verification_code,
      redemption_status, redeemed_at, redeemed_by_role, redeemed_event_id
    )
    values (
      'redemption-a1-event', 'invalid-role', 'RED-1005',
      'redeemed', now(), 'organizer', 'redemption-a1-event'
    )
  $$,
  '23514',
  null,
  'redeemed_by_role CHECK rejects organizer'
);

-- redemption_reversed_by_role CHECK rejects 'agent' (forward-only role).
select throws_ok(
  $$
    insert into public.game_entitlements (
      event_id, client_session_id, verification_code,
      redemption_reversed_at, redemption_reversed_by_role
    )
    values (
      'redemption-a1-event', 'invalid-reversal-role', 'RED-1006',
      now(), 'agent'
    )
  $$,
  '23514',
  null,
  'redemption_reversed_by_role CHECK rejects agent'
);

-- ─── event_role_assignments table structure ─────────────────────────────────

select has_table('public', 'event_role_assignments', 'event_role_assignments exists');

select ok(
  (select rowsecurity from pg_tables where schemaname = 'public' and tablename = 'event_role_assignments'),
  'event_role_assignments has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.event_role_assignments', 'SELECT'),
  'anon cannot read event_role_assignments'
);

select ok(
  not has_table_privilege('authenticated', 'public.event_role_assignments', 'SELECT'),
  'authenticated cannot read event_role_assignments directly'
);

select ok(
  has_table_privilege('service_role', 'public.event_role_assignments', 'SELECT,INSERT,DELETE'),
  'service_role can select/insert/delete event_role_assignments'
);

select ok(
  not has_table_privilege('service_role', 'public.event_role_assignments', 'UPDATE'),
  'service_role cannot update event_role_assignments (insert+delete only)'
);

-- role CHECK rejects values outside ('agent', 'organizer').
-- Bypass the auth.users FK trigger for this isolated structural test.
set local session_replication_role = 'replica';

select throws_ok(
  $$
    insert into public.event_role_assignments (user_id, event_id, role)
    values (
      '33333333-3333-4333-8333-333333333333'::uuid,
      'redemption-a1-event',
      'root_admin'
    )
  $$,
  '23514',
  null,
  'event_role_assignments.role CHECK rejects root_admin'
);

-- Unique constraint rejects duplicate (user_id, event_id, role).
insert into public.event_role_assignments (user_id, event_id, role)
values (
  '44444444-4444-4444-8444-444444444444'::uuid,
  'redemption-a1-event',
  'agent'
);

select throws_ok(
  $$
    insert into public.event_role_assignments (user_id, event_id, role)
    values (
      '44444444-4444-4444-8444-444444444444'::uuid,
      'redemption-a1-event',
      'agent'
    )
  $$,
  '23505',
  null,
  'event_role_assignments unique constraint rejects duplicate (user_id, event_id, role)'
);

-- Seed a cascade fixture. The event_role_assignments insert still needs
-- FK-bypass because user_id points at a fake auth.users row, but the
-- cascade delete assertion itself must run with FK triggers re-enabled
-- — in 'replica' mode the ON DELETE CASCADE trigger on game_events does
-- not fire, which would pass the assertion for the wrong reason.
insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes, entitlement_label,
  intro, summary, feedback_mode
)
values (
  'redemption-a1-cascade', 'redemption-a1-cascade', 'CAS', 'Cascade Event',
  'Seattle', 2, 'reward ticket', 'Intro', 'Summary', 'final_score_reveal'
);

insert into public.event_role_assignments (user_id, event_id, role)
values (
  '55555555-5555-4555-8555-555555555555'::uuid,
  'redemption-a1-cascade',
  'organizer'
);

set local session_replication_role = 'origin';

delete from public.game_events where id = 'redemption-a1-cascade';

select is(
  (select count(*) from public.event_role_assignments where event_id = 'redemption-a1-cascade'),
  0::bigint,
  'deleting a game_events row cascades to event_role_assignments'
);

-- ─── Permission helpers: existence and privileges ────────────────────────────

select ok(
  exists (
    select 1 from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'is_agent_for_event'
      and pg_get_function_arguments(pg_proc.oid) = 'target_event_id text'
  ),
  'is_agent_for_event(text) exists'
);
select ok(
  exists (
    select 1 from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'is_organizer_for_event'
      and pg_get_function_arguments(pg_proc.oid) = 'target_event_id text'
  ),
  'is_organizer_for_event(text) exists'
);
select ok(
  exists (
    select 1 from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'is_root_admin'
      and pg_get_function_arguments(pg_proc.oid) = ''
  ),
  'is_root_admin() exists'
);

select ok(
  has_function_privilege('authenticated', 'public.is_agent_for_event(text)', 'EXECUTE'),
  'authenticated can execute is_agent_for_event'
);
select ok(
  has_function_privilege('authenticated', 'public.is_organizer_for_event(text)', 'EXECUTE'),
  'authenticated can execute is_organizer_for_event'
);
select ok(
  has_function_privilege('authenticated', 'public.is_root_admin()', 'EXECUTE'),
  'authenticated can execute is_root_admin'
);

-- ─── Permission helpers: truth tables ────────────────────────────────────────
-- Seed assignments (FK-suppressed) then impersonate each scenario via JWT
-- claims and assert the helper verdicts.

set local session_replication_role = 'replica';

insert into public.event_role_assignments (user_id, event_id, role)
values
  ('66666666-6666-4666-8666-666666666666'::uuid, 'redemption-a1-event', 'agent'),
  ('77777777-7777-4777-8777-777777777777'::uuid, 'redemption-a1-event', 'organizer');

set local session_replication_role = 'origin';

-- Impersonate the agent user.
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"66666666-6666-4666-8666-666666666666"}',
  true
);

select ok(
  public.is_agent_for_event('redemption-a1-event'),
  'is_agent_for_event returns true when caller has matching agent assignment'
);

select ok(
  not public.is_agent_for_event('some-other-event'),
  'is_agent_for_event returns false for a different event'
);

select ok(
  not public.is_organizer_for_event('redemption-a1-event'),
  'is_organizer_for_event returns false when caller is only an agent'
);

-- Impersonate the organizer user.
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"77777777-7777-4777-8777-777777777777"}',
  true
);

select ok(
  public.is_organizer_for_event('redemption-a1-event'),
  'is_organizer_for_event returns true when caller has matching organizer assignment'
);

select ok(
  not public.is_agent_for_event('redemption-a1-event'),
  'is_agent_for_event returns false when caller is only an organizer'
);

-- Impersonate an unassigned authenticated user.
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"88888888-8888-4888-8888-888888888888"}',
  true
);

select ok(
  not public.is_agent_for_event('redemption-a1-event'),
  'is_agent_for_event returns false for an unassigned authenticated user'
);

select ok(
  not public.is_organizer_for_event('redemption-a1-event'),
  'is_organizer_for_event returns false for an unassigned authenticated user'
);

-- Anonymous caller (no JWT) returns false.
select set_config('request.jwt.claims', '', true);

select ok(
  not public.is_agent_for_event('redemption-a1-event'),
  'is_agent_for_event returns false when no JWT claims are present'
);

select ok(
  not public.is_organizer_for_event('redemption-a1-event'),
  'is_organizer_for_event returns false when no JWT claims are present'
);

-- ─── is_root_admin tracks is_admin ──────────────────────────────────────────

insert into public.admin_users (email)
values ('root-admin@example.com');

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"root-admin@example.com","sub":"99999999-9999-4999-8999-999999999999"}',
  true
);

select ok(
  public.is_root_admin(),
  'is_root_admin returns true for an allowlisted admin'
);

select is(
  public.is_root_admin(),
  public.is_admin(),
  'is_root_admin tracks is_admin for the admin case'
);

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","email":"not-an-admin@example.com","sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}',
  true
);

select ok(
  not public.is_root_admin(),
  'is_root_admin returns false for a non-allowlisted user'
);

select is(
  public.is_root_admin(),
  public.is_admin(),
  'is_root_admin tracks is_admin for the non-admin case'
);

select * from finish();
rollback;
