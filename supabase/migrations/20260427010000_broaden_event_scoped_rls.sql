-- M2 phase 2.1.1: Broaden event-scoped RLS so an authenticated user with an
-- `organizer` row in public.event_role_assignments for an event can perform
-- the direct-table writes root-admin can perform on that event's data.
-- Replace the event_role_assignments SELECT policy with a three-branch
-- version that admits organizer reads for events they organize.
--
-- Broadening predicate (uniform across every direct-write policy added or
-- replaced below):
--   public.is_organizer_for_event(<event-id-column>) OR public.is_root_admin()
-- For tables whose event_id lives as the `id` column (game_events,
-- game_event_drafts), the predicate substitutes `id` for `event_id` directly.
--
-- Table set (1:1 with supabase/tests/database/event_scoped_writes_rls.test.sql
-- and supabase/tests/database/event_role_assignments_rls.test.sql):
--   game_events             — UPDATE, DELETE
--   game_questions          — INSERT, UPDATE, DELETE
--   game_question_options   — INSERT, UPDATE, DELETE
--   game_event_drafts       — INSERT, UPDATE, DELETE (replaces existing root-only)
--   game_completions        — INSERT, UPDATE, DELETE
--   game_entitlements       — UPDATE, DELETE
--   game_starts             — INSERT, UPDATE, DELETE
--   event_role_assignments  — INSERT, DELETE; SELECT replaced with 3-branch
--
-- Deliberate non-touches:
--   * game_event_audit_log / game_event_versions: direct INSERT stays
--     service-role-only. Audit-log and version rows continue to flow
--     exclusively through public.publish_game_event_draft() and
--     public.unpublish_game_event(); GRANT EXECUTE → service_role plus
--     direct-INSERT denied via RLS is the load-bearing guard.
--   * public.publish_game_event_draft() / public.unpublish_game_event()
--     bodies, SECURITY DEFINER attribute, search_path, and grant lists
--     stay unchanged. Neither has an internal user-claims gate today and
--     could not have a meaningful one added — the Edge Functions invoke
--     the RPCs under the service-role key, so an in-RPC claims check
--     would not see the caller. The broadened Edge Function gate in
--     M2 phase 2.1.2 is the load-bearing authorization point.
--   * public.admin_users: platform-level, unchanged.
--   * public.event_role_assignments UPDATE: stays revoked at the
--     privilege layer for both authenticated and service_role per the
--     original migration's "role changes are insert + delete, never
--     in-place mutation" intent.

-- ─── game_events: UPDATE, DELETE ────────────────────────────────────────
-- game_events.id is the event identifier (text PK; equals
-- event_role_assignments.event_id), so the predicate substitutes `id`
-- for `event_id`. INSERT remains service-role-only — event creation
-- is platform-admin (out of M2 phase 2.1 scope). Authenticated already
-- holds INSERT/UPDATE/DELETE privileges on game_events; the absence of
-- an INSERT policy keeps inserts denied at the RLS layer.
create policy "organizers and admins can update events"
  on public.game_events
  for update
  to authenticated
  using (public.is_organizer_for_event(id) or public.is_root_admin())
  with check (public.is_organizer_for_event(id) or public.is_root_admin());

create policy "organizers and admins can delete events"
  on public.game_events
  for delete
  to authenticated
  using (public.is_organizer_for_event(id) or public.is_root_admin());

-- ─── game_questions: INSERT, UPDATE, DELETE ─────────────────────────────
-- event_id is a direct column. Authenticated already holds the three
-- write privileges; only RLS policies are added.
create policy "organizers and admins can insert questions"
  on public.game_questions
  for insert
  to authenticated
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can update questions"
  on public.game_questions
  for update
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin())
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can delete questions"
  on public.game_questions
  for delete
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin());

-- ─── game_question_options: INSERT, UPDATE, DELETE ──────────────────────
-- event_id is a direct column. Authenticated already holds the three
-- write privileges; only RLS policies are added.
create policy "organizers and admins can insert question options"
  on public.game_question_options
  for insert
  to authenticated
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can update question options"
  on public.game_question_options
  for update
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin())
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can delete question options"
  on public.game_question_options
  for delete
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin());

-- ─── game_event_drafts: INSERT, UPDATE, DELETE ──────────────────────────
-- Replace the existing root-only "admins can …" write policies with the
-- broadened predicate. game_event_drafts.id is the event identifier
-- (text PK; equals game_events.id), so the predicate substitutes `id`
-- for `event_id`. The "admins can read drafts" SELECT policy stays
-- root-only — SELECT broadening is consumer surface (M2 phase 2.2) and
-- out of scope here. Authenticated has SELECT only today; grant the
-- three write privileges before the broadened policies become
-- reachable.
grant insert, update, delete on table public.game_event_drafts to authenticated;

drop policy "admins can insert drafts" on public.game_event_drafts;
drop policy "admins can update drafts" on public.game_event_drafts;
drop policy "admins can delete drafts" on public.game_event_drafts;

create policy "organizers and admins can insert drafts"
  on public.game_event_drafts
  for insert
  to authenticated
  with check (public.is_organizer_for_event(id) or public.is_root_admin());

create policy "organizers and admins can update drafts"
  on public.game_event_drafts
  for update
  to authenticated
  using (public.is_organizer_for_event(id) or public.is_root_admin())
  with check (public.is_organizer_for_event(id) or public.is_root_admin());

create policy "organizers and admins can delete drafts"
  on public.game_event_drafts
  for delete
  to authenticated
  using (public.is_organizer_for_event(id) or public.is_root_admin());

-- ─── game_completions: INSERT, UPDATE, DELETE ───────────────────────────
-- Reachable today only via the complete_game_and_award_entitlement
-- service-role RPC; broadening is symmetric with the rest of the
-- event-scoped write surface. Authenticated has no privileges on this
-- table today; grant the three write privileges before policies. SELECT
-- stays unchanged (out of scope for 2.1.1).
grant insert, update, delete on table public.game_completions to authenticated;

create policy "organizers and admins can insert completions"
  on public.game_completions
  for insert
  to authenticated
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can update completions"
  on public.game_completions
  for update
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin())
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can delete completions"
  on public.game_completions
  for delete
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin());

-- ─── game_entitlements: UPDATE, DELETE ──────────────────────────────────
-- INSERT remains service-role-only — entitlements are RPC-created via
-- public.complete_game_and_award_entitlement. Authenticated has SELECT
-- today via the existing "assigned operators can read event
-- entitlements" policy (untouched by this migration); grant UPDATE and
-- DELETE before the broadened policies become reachable.
grant update, delete on table public.game_entitlements to authenticated;

create policy "organizers and admins can update entitlements"
  on public.game_entitlements
  for update
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin())
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can delete entitlements"
  on public.game_entitlements
  for delete
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin());

-- ─── game_starts: INSERT, UPDATE, DELETE ────────────────────────────────
-- Analytics surface; broadening is symmetric with the rest of the
-- event-scoped write surface. event_id is a direct column.
-- Authenticated already holds the three write privileges; only RLS
-- policies are added.
create policy "organizers and admins can insert starts"
  on public.game_starts
  for insert
  to authenticated
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can update starts"
  on public.game_starts
  for update
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin())
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can delete starts"
  on public.game_starts
  for delete
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin());

-- ─── event_role_assignments: INSERT, DELETE + SELECT replacement ────────
-- The staffing table. UPDATE stays revoked at the privilege layer for
-- both authenticated and service_role (already enforced by migration
-- 20260421000100); this migration does not grant UPDATE to anyone.
-- Authenticated has SELECT today via the self-or-root-admin policy
-- below; grant INSERT and DELETE before the broadened write policies
-- become reachable. UPDATE is deliberately omitted from the GRANT.
grant insert, delete on table public.event_role_assignments to authenticated;

-- Replace the existing self-or-root-admin SELECT policy with a
-- three-branch version: a self-read branch (preserved verbatim), the
-- root-admin branch (preserved verbatim), and a new organizer branch
-- that admits reads of assignments for events the caller organizes.
-- An organizer can list the agents and organizers assigned to events
-- they organize without seeing assignments for other events.
drop policy "users can read their own role assignments"
  on public.event_role_assignments;

create policy "users, organizers, and admins can read role assignments"
  on public.event_role_assignments
  for select
  to authenticated
  using (
    user_id = public.current_request_user_id()
    or public.is_organizer_for_event(event_id)
    or public.is_root_admin()
  );

create policy "organizers and admins can insert role assignments"
  on public.event_role_assignments
  for insert
  to authenticated
  with check (public.is_organizer_for_event(event_id) or public.is_root_admin());

create policy "organizers and admins can delete role assignments"
  on public.event_role_assignments
  for delete
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin());
