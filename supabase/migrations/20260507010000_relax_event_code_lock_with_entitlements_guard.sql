-- Relax the event_code lock with an entitlements guard.
--
-- Before: trigger WHEN clause keyed off `last_published_version_number is not
-- null`, which is set on first publish and never cleared. After unpublish,
-- event_code remained immutable forever — and additionally pre-launch
-- rotations were blocked once the draft had ever been published, even for
-- events with no issued entitlements.
--
-- After: trigger fires whenever event_code is distinct; the function probes
-- two conditions in order:
--   1. game_events row with published_at is not null → currently live →
--      raise event_code_locked.
--   2. any game_entitlements row for event_id = new.id → entitlements
--      already issued → raise event_code_locked_by_entitlements.
--
-- The two-condition shape is the (S) Strict outcome from
-- docs/plans/event-code-rotation-safety.md. Permitting rotation only when
-- both conditions are absent (Madrona pre-launch case) preserves the
-- redeem RPC's <event_code>-<suffix> reconstruction guarantee — once any
-- entitlement is issued, rotating event_code would silently strand it.
--
-- Concurrency: the trigger and the entitlement-creating completion path
-- serialize on the game_events row. The trigger takes FOR UPDATE before
-- counting entitlements; complete_game_and_award_entitlement takes FOR
-- SHARE before reading event_code and inserting an entitlement. This
-- closes the race where a count-of-zero check passes while a concurrent
-- completion is mid-flight inserting the first entitlement, which under
-- READ COMMITTED would otherwise leave the rotation through and strand
-- the entitlement.

create or replace function public.enforce_game_event_draft_event_code_lock()
returns trigger
language plpgsql
as $$
declare
  v_entitlement_count bigint;
begin
  -- Lock the game_events row to serialize with concurrent entitlement
  -- creation. complete_game_and_award_entitlement takes FOR SHARE on the
  -- same row before its insert, so a rotation in flight blocks new
  -- entitlements until it commits and a completion in flight blocks the
  -- count-check below from using a stale snapshot. No-op when no
  -- game_events row exists (never-published draft); see Case D in
  -- supabase/tests/database/event_code_lock.test.sql.
  perform 1
  from public.game_events as event
  where event.id = new.id
  for update;

  if exists (
    select 1
    from public.game_events as event
    where event.id = new.id
      and event.published_at is not null
  ) then
    raise exception 'event_code_locked'
      using detail = 'Event code cannot be changed while the event is currently live.';
  end if;

  select count(*)
  into v_entitlement_count
  from public.game_entitlements as entitlement
  where entitlement.event_id = new.id;

  if v_entitlement_count > 0 then
    raise exception 'event_code_locked_by_entitlements'
      using detail = format(
        'Event code cannot be changed while %s entitlement(s) exist for this event. Clear pending entitlements first.',
        v_entitlement_count
      );
  end if;

  return new;
end;
$$;

drop trigger if exists game_event_draft_event_code_lock on public.game_event_drafts;
create trigger game_event_draft_event_code_lock
  before update on public.game_event_drafts
  for each row
  when (new.event_code is distinct from old.event_code)
  execute function public.enforce_game_event_draft_event_code_lock();

-- Recreate complete_game_and_award_entitlement with FOR SHARE on the
-- game_events row. The function body is otherwise byte-for-byte identical
-- to the version installed by 20260418070000_rewrite_verification_code_generator.sql;
-- only the event_code lookup gains the FOR SHARE clause so the lock taken
-- by enforce_game_event_draft_event_code_lock above blocks new entitlement
-- creation while a rotation is in flight.

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

    -- Look up the event_code for the prefix, holding FOR SHARE on the
    -- game_events row so a concurrent event_code rotation (which takes
    -- FOR UPDATE in enforce_game_event_draft_event_code_lock) cannot
    -- commit while we are about to insert an entitlement under the
    -- current prefix. NOT NULL + backfill make the existence guard
    -- defence-in-depth.
    select e.event_code
    into v_event_code
    from public.game_events e
    where e.id = p_event_id
    for share;

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
