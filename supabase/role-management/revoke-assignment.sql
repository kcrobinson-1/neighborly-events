-- This file is applied by a reviewed PR only. See README.md.
-- Revokes a single (user_id, event_id, role) assignment. Fails loudly
-- if the target user, event, or assignment does not exist so operators
-- can distinguish a typo from an already-revoked assignment.
--
-- Before applying, replace the three placeholders below. Do not modify
-- the body. Capture the notice output in the PR audit comment.

\set ON_ERROR_STOP on
\set user_email '''user@example.com'''
\set event_slug '''fall-fest-2026'''
\set role_to_revoke '''agent'''

do $$
declare
  v_user_id uuid;
  v_event_id text;
  v_deleted public.event_role_assignments%rowtype;
begin
  select id into v_user_id from auth.users where email = :user_email;
  if v_user_id is null then
    raise exception 'No auth.users row found for email %', :user_email;
  end if;

  select id into v_event_id from public.game_events where slug = :event_slug;
  if v_event_id is null then
    raise exception 'No public.game_events row found for slug %', :event_slug;
  end if;

  delete from public.event_role_assignments
  where user_id = v_user_id
    and event_id = v_event_id
    and role = :role_to_revoke
  returning * into v_deleted;

  if v_deleted.id is null then
    raise exception 'No matching assignment to revoke: user=% event=% role=%',
      v_user_id, v_event_id, :role_to_revoke;
  end if;

  raise notice 'Revoked assignment: id=% user=% event=% role=% created_at=%',
    v_deleted.id, v_deleted.user_id, v_deleted.event_id, v_deleted.role, v_deleted.created_at;
end $$;
