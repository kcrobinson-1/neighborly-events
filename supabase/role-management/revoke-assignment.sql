-- This file is applied by a reviewed PR only. See README.md.
-- Revokes a single (user_id, event_id, role) assignment.
--
-- Before applying, replace the three placeholders below. Do not modify the
-- body. Capture the `returning *` output in the PR audit comment — an empty
-- result means no matching assignment existed and nothing was removed.

\set user_email '''user@example.com'''
\set event_slug '''fall-fest-2026'''
\set role_to_revoke '''agent'''

delete from public.event_role_assignments as assignment
where assignment.user_id = (select id from auth.users where email = :user_email)
  and assignment.event_id = (select id from public.game_events where slug = :event_slug)
  and assignment.role = :role_to_revoke
returning id, user_id, event_id, role, created_at, created_by;
