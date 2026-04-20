-- Migration D: rewrite verification code generator and entitlement RPC.
-- Switches entitlement codes from MMP-XXXXXXXX to <event_code>-NNNN and adds
-- per-event uniqueness enforcement with a bounded retry loop.

-- Drop zero-arg signature so the new text-arg version takes over cleanly.
drop function public.generate_neighborly_verification_code();

create function public.generate_neighborly_verification_code(p_event_code text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return p_event_code
    || '-'
    || lpad(
         ((('x' || encode(gen_random_bytes(2), 'hex'))::bit(16)::int % 10000))::text,
         4,
         '0'
       );
end;
$$;

revoke execute on function public.generate_neighborly_verification_code(text)
from public, anon, authenticated;

grant execute on function public.generate_neighborly_verification_code(text)
to service_role;

-- Per-event uniqueness on verification codes. The 4-digit token space (10,000
-- slots) is safe at MVP event sizes but the retry loop below handles collisions
-- as the space fills up.
alter table public.game_entitlements
  add constraint game_entitlements_event_code_unique
  unique (event_id, verification_code);

-- Rewrite the completion RPC to:
-- 1. Look up event_code from game_events (raises event_code_missing if absent).
-- 2. Generate a <event_code>-NNNN verification code inside a bounded retry loop
--    (up to 10 attempts) that retries on per-event unique_violation.
-- 3. Raise entitlement_code_exhausted if all 10 attempts collide.
-- 4. Preserve idempotency: a replayed request_id short-circuits the retry loop.
create or replace function public.complete_game_and_award_entitlement(
  p_event_id text,
  p_client_session_id text,
  p_request_id text,
  p_submitted_answers jsonb,
  p_score integer,
  p_duration_ms integer
)
returns table (
  completion_id uuid,
  attempt_number integer,
  score integer,
  entitlement_status text,
  verification_code text,
  entitlement_created_at timestamptz,
  entitlement_eligible boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_completion public.game_completions%rowtype;
  v_entitlement public.game_entitlements%rowtype;
  v_completion public.game_completions%rowtype;
  v_attempt_number integer;
  v_entitlement_status text;
  v_event_code text;
  v_verification_code text;
  v_retry_count integer;
begin
  -- Serialize writes per event/session so concurrent completions cannot race
  -- entitlement creation or attempt-number assignment.
  perform pg_advisory_xact_lock(
    hashtextextended(p_event_id || ':' || p_client_session_id, 0)
  );

  -- Idempotency guard: if this request_id already produced a completion, return
  -- the stored result instead of creating another completion row.
  select *
  into v_existing_completion
  from public.game_completions
  where event_id = p_event_id
    and client_session_id = p_client_session_id
    and request_id = p_request_id;

  if found then
    select *
    into v_entitlement
    from public.game_entitlements
    where id = v_existing_completion.entitlement_id;

    return query
    select
      v_existing_completion.id,
      v_existing_completion.attempt_number,
      v_existing_completion.score,
      case
        when v_existing_completion.entitlement_awarded then 'new'
        else 'existing'
      end,
      v_existing_completion.verification_code,
      v_entitlement.created_at,
      v_existing_completion.entitlement_awarded,
      case
        when v_existing_completion.entitlement_awarded then 'You earned your raffle entry.'
        else 'You already earned your raffle entry. This retake does not create another ticket.'
      end;

    return;
  end if;

  select *
  into v_entitlement
  from public.game_entitlements
  where event_id = p_event_id
    and client_session_id = p_client_session_id;

  if found then
    v_entitlement_status := 'existing';
  else
    v_entitlement_status := 'new';

    -- Look up the event_code for the prefix. NOT NULL + backfill make this
    -- safe in practice; the guard is here for defence-in-depth.
    select e.event_code
    into v_event_code
    from public.game_events e
    where e.id = p_event_id;

    if not found or v_event_code is null then
      raise exception 'event_code_missing'
        using detail = 'game_events row for this event_id has no event_code.';
    end if;

    -- Bounded retry: up to 10 attempts on per-event code collision.
    v_retry_count := 0;
    loop
      v_retry_count := v_retry_count + 1;
      if v_retry_count > 10 then
        raise exception 'entitlement_code_exhausted'
          using detail = 'All 10 verification code generation attempts collided for this event.';
      end if;

      v_verification_code :=
        public.generate_neighborly_verification_code(v_event_code);

      begin
        insert into public.game_entitlements (
          event_id,
          client_session_id,
          verification_code
        )
        values (
          p_event_id,
          p_client_session_id,
          v_verification_code
        )
        returning *
        into v_entitlement;

        exit; -- insert succeeded; exit retry loop
      exception
        when unique_violation then
          -- Only retry on the per-event code uniqueness constraint.
          -- Any other unique violation (e.g. event+session) should propagate.
          if sqlerrm not like '%game_entitlements_event_code_unique%' then
            raise;
          end if;
          -- Collision on (event_id, verification_code): loop and try again.
      end;
    end loop;
  end if;

  select coalesce(max(gc.attempt_number), 0) + 1
  into v_attempt_number
  from public.game_completions gc
  where gc.event_id = p_event_id
    and gc.client_session_id = p_client_session_id;

  insert into public.game_completions (
    event_id,
    client_session_id,
    request_id,
    attempt_number,
    submitted_answers,
    score,
    duration_ms,
    verification_code,
    entitlement_awarded,
    entitlement_id
  )
  values (
    p_event_id,
    p_client_session_id,
    p_request_id,
    v_attempt_number,
    p_submitted_answers,
    p_score,
    p_duration_ms,
    v_entitlement.verification_code,
    v_entitlement_status = 'new',
    v_entitlement.id
  )
  returning *
  into v_completion;

  -- Persist the first completion id once so later retakes cannot rewrite it.
  if v_entitlement.first_completion_id is null then
    update public.game_entitlements
    set first_completion_id = v_completion.id
    where id = v_entitlement.id
    returning *
    into v_entitlement;
  end if;

  return query
  select
    v_completion.id,
    v_completion.attempt_number,
    v_completion.score,
    v_entitlement_status,
    v_entitlement.verification_code,
    v_entitlement.created_at,
    v_entitlement_status = 'new',
    case
      when v_entitlement_status = 'new' then 'You earned your raffle entry.'
      else 'You already earned your raffle entry. This retake does not create another ticket.'
    end;
end;
$$;
