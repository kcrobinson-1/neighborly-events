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

create or replace function public.enforce_game_event_draft_event_code_lock()
returns trigger
language plpgsql
as $$
declare
  v_entitlement_count bigint;
begin
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
