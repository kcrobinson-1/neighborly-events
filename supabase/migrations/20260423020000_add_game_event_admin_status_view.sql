create or replace view public.game_event_admin_status
with (security_invoker = true)
as
with first_published as (
  select
    version.event_id,
    min(version.published_at) as first_published_at
  from public.game_event_versions as version
  group by version.event_id
),
status_rows as (
  select
    draft.id as event_id,
    draft.slug,
    draft.name,
    draft.event_code,
    draft.last_published_version_number,
    draft.last_published_at,
    first_published.first_published_at,
    draft.updated_at as draft_updated_at,
    case
      when draft.last_published_version_number is null then 'draft_only'
      when event.published_at is null then 'draft_only'
      when published_version.content is null then 'draft_only'
      when draft.content = published_version.content then 'live'
      else 'live_with_draft_changes'
    end as status
  from public.game_event_drafts as draft
  left join public.game_events as event
    on event.id = draft.id
  left join public.game_event_versions as published_version
    on published_version.event_id = draft.id
   and published_version.version_number = draft.last_published_version_number
  left join first_published
    on first_published.event_id = draft.id
)
select
  status_rows.event_id,
  status_rows.slug,
  status_rows.name,
  status_rows.event_code,
  status_rows.status,
  status_rows.status in ('live', 'live_with_draft_changes') as is_live,
  status_rows.last_published_version_number,
  status_rows.last_published_at,
  status_rows.first_published_at,
  status_rows.draft_updated_at
from status_rows;

comment on view public.game_event_admin_status is
  'Admin read model for current game-event authoring status. Status is content-derived: do not compare updated_at to last_published_at, because the draft audit trigger advances updated_at during publish and would misclassify a freshly published event as live_with_draft_changes.';

revoke all on public.game_event_admin_status from public;
revoke all on public.game_event_admin_status from anon;
revoke all on public.game_event_admin_status from authenticated;

grant select on public.game_event_admin_status to authenticated;
grant select on public.game_event_admin_status to service_role;
