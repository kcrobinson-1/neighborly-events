-- Reward redemption Phase A.2a: redeem_entitlement_by_code RPC behavior.
--
-- The reverse RPC will append its cases to this file in a later commit;
-- keep the structure extensible (fresh test UUIDs per concern, minimal
-- shared state between cases).
begin;

create extension if not exists pgtap with schema extensions;

select plan(28);

-- ─── Structural checks ──────────────────────────────────────────────────────

select ok(
  exists (
    select 1 from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'redeem_entitlement_by_code'
      and pg_get_function_arguments(pg_proc.oid)
        = 'p_event_id text, p_code_suffix text'
  ),
  'redeem_entitlement_by_code(text, text) exists'
);

select ok(
  has_function_privilege(
    'authenticated', 'public.redeem_entitlement_by_code(text, text)', 'EXECUTE'
  ),
  'authenticated can execute redeem_entitlement_by_code'
);

select ok(
  has_function_privilege(
    'service_role', 'public.redeem_entitlement_by_code(text, text)', 'EXECUTE'
  ),
  'service_role can execute redeem_entitlement_by_code'
);

select ok(
  has_function_privilege(
    'anon', 'public.redeem_entitlement_by_code(text, text)', 'EXECUTE'
  ),
  'anon is granted execute (Supabase baseline + A.1 precedent); the RPC '
  'rejects via the null-JWT guard rather than via privilege'
);

-- ─── Fixtures ──────────────────────────────────────────────────────────────
-- session_replication_role = 'replica' suppresses trigger firing for the
-- duration of the test so the RPC's UPDATE on
-- game_entitlements.redeemed_by does not collide with the auth.users FK
-- when v_user_id is a synthetic test UUID. The test rolls back at the end,
-- so this change is scoped to the transaction.
set local session_replication_role = 'replica';

insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes,
  entitlement_label, intro, summary, feedback_mode
)
values
  (
    'redeem-rpc-event-1', 'redeem-rpc-event-1', 'RRA',
    'Redeem RPC Event A', 'Seattle', 2, 'reward',
    'Intro', 'Summary', 'final_score_reveal'
  ),
  (
    'redeem-rpc-event-2', 'redeem-rpc-event-2', 'RRB',
    'Redeem RPC Event B', 'Seattle', 2, 'reward',
    'Intro', 'Summary', 'final_score_reveal'
  );

insert into public.game_entitlements (event_id, client_session_id, verification_code)
values
  ('redeem-rpc-event-1', 'session-a-happy',      'RRA-1111'),
  ('redeem-rpc-event-1', 'session-a-root',       'RRA-2222'),
  ('redeem-rpc-event-1', 'session-a-idempotent', 'RRA-3333'),
  ('redeem-rpc-event-2', 'session-b-crossevent', 'RRB-7777');

-- Agent for event A, agent for event B (for cross-event role test),
-- organizer for event A (agent negative test), and a seeded admin_users
-- row for the root-admin case. No real auth.users rows are needed — the
-- helpers read user_id/email straight from JWT claims.
insert into public.event_role_assignments (user_id, event_id, role)
values
  (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'redeem-rpc-event-1',
    'agent'
  ),
  (
    '22222222-2222-4222-8222-222222222222'::uuid,
    'redeem-rpc-event-2',
    'agent'
  ),
  (
    '33333333-3333-4333-8333-333333333333'::uuid,
    'redeem-rpc-event-1',
    'organizer'
  );

insert into public.admin_users (email)
values ('redeem-root@example.com');

-- ─── Case: null JWT → not_authorized ───────────────────────────────────────

select set_config('request.jwt.claims', '', true);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '1111'))->>'result',
  'not_authorized',
  'null JWT returns not_authorized'
);

-- ─── Case: authenticated but unassigned → not_authorized ───────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"44444444-4444-4444-8444-444444444444"}',
  true
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '1111'))->>'result',
  'not_authorized',
  'authenticated but unassigned returns not_authorized'
);

-- ─── Case: agent for a different event → not_authorized ───────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"22222222-2222-4222-8222-222222222222"}',
  true
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '1111'))->>'result',
  'not_authorized',
  'agent assigned to a different event cannot redeem'
);

-- ─── Case: organizer role on the event → not_authorized (redeem is agent-only) ─

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"33333333-3333-4333-8333-333333333333"}',
  true
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '1111'))->>'result',
  'not_authorized',
  'organizer role on the event cannot redeem (agent-only gate)'
);

-- ─── Case: agent assigned, unknown suffix → not_found ──────────────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}',
  true
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '9999'))->>'result',
  'not_found',
  'agent assigned but suffix does not exist returns not_found'
);

-- ─── Case: cross-event suffix → not_found ──────────────────────────────────
-- Suffix 7777 only exists on event B; agent for A tries to redeem it on A.

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '7777'))->>'result',
  'not_found',
  'cross-event suffix returns not_found (no leak of event B)'
);

-- Verify the envelope body for not_found is minimal (no stray fields that
-- could leak cross-event info in A.2b HTTP serialization).
select is(
  (
    select array_agg(k order by k)
      from jsonb_object_keys(
        public.redeem_entitlement_by_code('redeem-rpc-event-1', '7777')
      ) as k
  ),
  array['outcome', 'result']::text[],
  'not_found envelope exposes exactly outcome and result (no cross-event leak)'
);

-- ─── Case: agent redeems valid suffix → redeemed_now + row state ──────────

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '1111'))->>'result',
  'redeemed_now',
  'agent redeeming a valid suffix returns redeemed_now'
);

select is(
  (
    select redemption_status
      from public.game_entitlements
     where verification_code = 'RRA-1111'
  ),
  'redeemed',
  'redeemed row has redemption_status = redeemed'
);

select is(
  (
    select redeemed_by_role
      from public.game_entitlements
     where verification_code = 'RRA-1111'
  ),
  'agent',
  'redeemed row has redeemed_by_role = agent'
);

select is(
  (
    select redeemed_by
      from public.game_entitlements
     where verification_code = 'RRA-1111'
  ),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'redeemed row has redeemed_by = the agent user id'
);

select is(
  (
    select redeemed_event_id
      from public.game_entitlements
     where verification_code = 'RRA-1111'
  ),
  'redeem-rpc-event-1',
  'redeemed row has redeemed_event_id = event_id'
);

select isnt(
  (
    select redeemed_at
      from public.game_entitlements
     where verification_code = 'RRA-1111'
  ),
  null::timestamptz,
  'redeemed row has non-null redeemed_at'
);

-- ─── Case: root admin → redeemed_now with redeemed_by_role = root_admin ───

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated",'
  || '"email":"redeem-root@example.com",'
  || '"sub":"55555555-5555-4555-8555-555555555555"}',
  true
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '2222'))->>'result',
  'redeemed_now',
  'root admin redeem returns redeemed_now'
);

select is(
  (
    select redeemed_by_role
      from public.game_entitlements
     where verification_code = 'RRA-2222'
  ),
  'root_admin',
  'root admin redeem sets redeemed_by_role = root_admin'
);

-- ─── Case: second redeem on the same row → already_redeemed ───────────────

select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"11111111-1111-4111-8111-111111111111"}',
  true
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '1111'))->>'result',
  'already_redeemed',
  'second redeem on a redeemed row returns already_redeemed'
);

-- Confirm idempotency: the previously-recorded redeemer identity is preserved.
select is(
  (
    select redeemed_by
      from public.game_entitlements
     where verification_code = 'RRA-1111'
  ),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'already_redeemed does not overwrite redeemed_by'
);

-- ─── Case: repeated idempotent calls on a separate row ────────────────────

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '3333'))->>'result',
  'redeemed_now',
  'first redeem of AAA-3333 returns redeemed_now'
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '3333'))->>'result',
  'already_redeemed',
  'second redeem of AAA-3333 returns already_redeemed'
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '3333'))->>'result',
  'already_redeemed',
  'third redeem of AAA-3333 remains idempotent'
);

-- ─── Envelope outcome field ────────────────────────────────────────────────

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '3333'))->>'outcome',
  'success',
  'success envelope has outcome = success'
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '9999'))->>'outcome',
  'failure',
  'not_found envelope has outcome = failure'
);

-- ─── Envelope carries metadata on success ─────────────────────────────────

select isnt(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '3333'))->>'redeemed_at',
  null,
  'already_redeemed envelope includes redeemed_at'
);

select is(
  (public.redeem_entitlement_by_code('redeem-rpc-event-1', '3333'))->>'redeemed_by_role',
  'agent',
  'already_redeemed envelope echoes redeemed_by_role'
);

select * from finish();
rollback;
