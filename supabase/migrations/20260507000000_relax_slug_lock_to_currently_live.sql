-- Relax the slug lock to fire only while the event is currently live.
--
-- Before: trigger WHEN clause keyed off `last_published_version_number is not
-- null`, which is set on first publish and never cleared. After unpublish, slug
-- remained immutable forever, blocking organizer self-service rotation before
-- relaunch (Tier 1 backlog item; phase 1 of two-phase fix).
--
-- After: trigger fires whenever slug is distinct; the function probes
-- `public.game_events.published_at` for the matching id and raises only when
-- the event is currently live. `last_published_version_number` keeps its
-- "historical publish pointer" semantics introduced on 2026-04-23.
--
-- Phase 2 (event_code) is intentionally untouched here — its rotation
-- semantics differ (verification-code reconstruction strands unredeemed
-- entitlements) and are scoped separately.

create or replace function public.enforce_game_event_draft_slug_lock()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.game_events as event
    where event.id = new.id
      and event.published_at is not null
  ) then
    raise exception 'slug_locked'
      using detail = 'Slug cannot be changed while the event is currently live.';
  end if;

  return new;
end;
$$;

drop trigger if exists game_event_draft_slug_lock on public.game_event_drafts;
create trigger game_event_draft_slug_lock
  before update on public.game_event_drafts
  for each row
  when (new.slug is distinct from old.slug)
  execute function public.enforce_game_event_draft_slug_lock();
