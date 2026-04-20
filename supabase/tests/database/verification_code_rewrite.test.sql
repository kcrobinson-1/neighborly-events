begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

-- ─── generate_neighborly_verification_code ────────────────────────────────────

select matches(
  public.generate_neighborly_verification_code('ABC'),
  '^ABC-[0-9]{4}$',
  'generate_neighborly_verification_code returns ABC-NNNN format'
);

select matches(
  public.generate_neighborly_verification_code('ZZZ'),
  '^ZZZ-[0-9]{4}$',
  'generate_neighborly_verification_code works for any valid event code'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.generate_neighborly_verification_code(text)',
    'EXECUTE'
  ),
  'service_role can execute generate_neighborly_verification_code'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.generate_neighborly_verification_code(text)',
    'EXECUTE'
  ),
  'authenticated cannot execute generate_neighborly_verification_code'
);

-- ─── complete_game_and_award_entitlement returns new code format ───────────────

-- Insert a game_events row so the RPC can look up the event_code.
insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes, entitlement_label,
  intro, summary, feedback_mode
)
values (
  'vc-test-event', 'vc-test-event', 'TST', 'VC Test Event',
  'Seattle', 2, 'reward ticket', 'Intro', 'Summary', 'final_score_reveal'
);

create temp table vc_first_attempt as
select *
from public.complete_game_and_award_entitlement(
  'vc-test-event',
  'vc-test-session',
  'vc-request-1',
  '{"q1":["a"]}'::jsonb,
  5,
  1200
);

select matches(
  (select verification_code from vc_first_attempt),
  '^TST-[0-9]{4}$',
  'complete_game_and_award_entitlement returns verification_code in <event_code>-NNNN format'
);

-- ─── game_entitlements_event_code_unique constraint ───────────────────────────

select ok(
  exists (
    select 1
    from pg_constraint
    where conname = 'game_entitlements_event_code_unique'
      and contype = 'u'
  ),
  'game_entitlements_event_code_unique unique constraint exists'
);

-- ─── entitlement_code_exhausted after all slots filled ────────────────────────

-- Insert a second event with a dedicated event_code for the exhaustion test.
insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes, entitlement_label,
  intro, summary, feedback_mode
)
values (
  'exhaust-event', 'exhaust-event', 'EXH', 'Exhaustion Test Event',
  'Seattle', 2, 'reward ticket', 'Intro', 'Summary', 'final_score_reveal'
);

-- Pre-seed all 10,000 slots for this event so every code collides.
insert into public.game_entitlements (event_id, client_session_id, verification_code)
select
  'exhaust-event',
  'seed-session-' || n,
  'EXH-' || lpad(n::text, 4, '0')
from generate_series(0, 9999) as n;

select throws_ok(
  $$
    select *
    from public.complete_game_and_award_entitlement(
      'exhaust-event',
      'new-session',
      'exhaust-request-1',
      '{"q1":["a"]}'::jsonb,
      5,
      1200
    )
  $$,
  'P0001',
  'entitlement_code_exhausted',
  'RPC raises entitlement_code_exhausted when all 10,000 slots are taken'
);

-- ─── RPC succeeds when exactly one slot remains ───────────────────────────────

insert into public.game_events (
  id, slug, event_code, name, location, estimated_minutes, entitlement_label,
  intro, summary, feedback_mode
)
values (
  'one-slot-event', 'one-slot-event', 'ONE', 'One Slot Event',
  'Seattle', 2, 'reward ticket', 'Intro', 'Summary', 'final_score_reveal'
);

-- Fill 9,999 of 10,000 slots (0001–9999), leaving 0000 open.
insert into public.game_entitlements (event_id, client_session_id, verification_code)
select
  'one-slot-event',
  'seed-session-' || n,
  'ONE-' || lpad(n::text, 4, '0')
from generate_series(1, 9999) as n;

-- Force the RPC to land on the one open slot by making generate_neighborly_verification_code
-- deterministic for this test: replace it temporarily to always return ONE-0000.
create or replace function public.generate_neighborly_verification_code(p_event_code text)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select p_event_code || '-0000';
$$;

create temp table one_slot_result as
select *
from public.complete_game_and_award_entitlement(
  'one-slot-event',
  'one-slot-session',
  'one-slot-request-1',
  '{"q1":["a"]}'::jsonb,
  5,
  1200
);

select is(
  (select verification_code from one_slot_result),
  'ONE-0000',
  'RPC succeeds and returns the last open slot when exactly one slot remains'
);

select * from finish();
rollback;
