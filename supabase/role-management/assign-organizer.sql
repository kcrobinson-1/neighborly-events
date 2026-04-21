-- This file is applied by a reviewed PR only. See README.md.
-- Assigns role = 'organizer' for one user on one event. Idempotent.
--
-- Before applying, replace the two placeholders below. Do not modify the
-- body. Capture the `returning *` output in the PR audit comment.

\set user_email '''user@example.com'''
\set event_slug '''fall-fest-2026'''

insert into public.event_role_assignments (user_id, event_id, role, created_by)
select
  target_user.id,
  target_event.id,
  'organizer',
  public.current_request_user_id()
from
  (select id from auth.users where email = :user_email) as target_user,
  (select id from public.game_events where slug = :event_slug) as target_event
on conflict on constraint event_role_assignments_unique do nothing
returning id, user_id, event_id, role, created_at, created_by;
