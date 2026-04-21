-- This file is applied by a reviewed PR only. See README.md.
-- Assigns role = 'organizer' for one user on one event. Idempotent on
-- re-run (ON CONFLICT DO NOTHING) but fails loudly when the target
-- user or event does not exist, so operators can distinguish a typo
-- from an already-existing assignment.
--
-- Before applying, replace the two placeholders below. Do not modify
-- the body. Capture the notice output in the PR audit comment.

\set ON_ERROR_STOP on
\set user_email '''user@example.com'''
\set event_slug '''fall-fest-2026'''

do $$
declare
  v_user_id uuid;
  v_event_id text;
  v_inserted public.event_role_assignments%rowtype;
begin
  select id into v_user_id from auth.users where email = :user_email;
  if v_user_id is null then
    raise exception 'No auth.users row found for email %', :user_email;
  end if;

  select id into v_event_id from public.game_events where slug = :event_slug;
  if v_event_id is null then
    raise exception 'No public.game_events row found for slug %', :event_slug;
  end if;

  insert into public.event_role_assignments (user_id, event_id, role, created_by)
  values (v_user_id, v_event_id, 'organizer', public.current_request_user_id())
  on conflict on constraint event_role_assignments_unique do nothing
  returning * into v_inserted;

  if v_inserted.id is null then
    raise notice 'Assignment already existed: user=% event=% role=organizer (idempotent no-op)',
      v_user_id, v_event_id;
  else
    raise notice 'Assigned role organizer: id=% user=% event=% created_at=%',
      v_inserted.id, v_inserted.user_id, v_inserted.event_id, v_inserted.created_at;
  end if;
end $$;
