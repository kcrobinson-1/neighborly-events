-- M2 phase 2.1.1: Broaden event-scoped RLS so an authenticated user with an
-- `organizer` row in public.event_role_assignments for an event can reach
-- the surfaces M2 phase 2.2 and the post-epic organizer-managed agent
-- assignment feature consume.
--
-- Scope is **read-broadening on authoring tables plus the event_role_assignments
-- staffing surface**, not "every direct-table write root-admin can perform."
-- Earlier drafts of this migration broadened INSERT/UPDATE/DELETE on most
-- event-scoped tables; that scope was wrong on two counts:
--
--   1. Organizer authoring writes flow through the four authoring Edge
--      Functions (save-draft / publish-draft / unpublish-event /
--      generate-event-code), which execute as service_role and bypass RLS
--      entirely. The Edge Function gate widening in M2 phase 2.1.2 is the
--      load-bearing authorization point. RLS write broadening on those
--      tables had no consumer.
--   2. PostgreSQL applies the SELECT policy during UPDATE and DELETE — rows
--      must be SELECT-visible to be modifiable. Most authoring tables today
--      have SELECT policies that exclude organizers (is_admin only on
--      drafts/versions; published_at IS NOT NULL on game_events/_questions/
--      _options; no policy at all on game_completions/_starts). UPDATE and
--      DELETE broadening on those tables would silently no-op for
--      organizers under direct PostgREST.
--
-- The corrected scope addresses what M2 phase 2.2's per-event admin UI
-- actually needs (organizer reads of draft/version content via PostgREST
-- and the security_invoker game_event_admin_status view) plus the
-- post-epic agent-assignment surface (organizer-driven role assignment
-- via PostgREST).
--
-- Broadening predicate (uniform across every policy added or replaced):
--   public.is_organizer_for_event(<event-id-column>) OR public.is_root_admin()
--
-- Tables in scope (1:1 with the pgTAP coverage):
--   game_event_drafts       — SELECT replaced; INSERT/UPDATE/DELETE unchanged
--   game_event_versions     — SELECT replaced
--   event_role_assignments  — SELECT replaced (3-branch); INSERT, DELETE added
--
-- Deliberate non-touches:
--   * game_events / game_questions / game_question_options: SELECT stays
--     gated on published_at IS NOT NULL (anon + authenticated). Organizers
--     read their unpublished events from game_event_drafts.content (JSONB);
--     published events are already readable. No write policies are added —
--     authoring writes flow through save-draft / publish-draft /
--     unpublish-event / generate-event-code under service_role.
--   * game_completions / game_starts / game_entitlements: SELECT and write
--     policies stay as today. Completion + entitlement creation runs in
--     complete_game_and_award_entitlement under service_role; redemption
--     runs in redeem_entitlement_by_code under SECURITY DEFINER. The
--     existing "assigned operators can read event entitlements" policy
--     (migration 20260421000500) already admits agents/organizers/root.
--   * game_event_audit_log: direct INSERT stays service-role-only. Audit
--     rows continue to flow exclusively through publish_game_event_draft()
--     / unpublish_game_event(); GRANT EXECUTE → service_role plus
--     direct-INSERT denied via RLS is the load-bearing guard.
--   * publish_game_event_draft / unpublish_game_event RPC bodies stay
--     unchanged. Neither has an internal user-claims gate today and could
--     not have a meaningful one added — the Edge Functions invoke the RPCs
--     under the service-role key, so an in-RPC claims check would not see
--     the caller. The broadened Edge Function gate in M2 phase 2.1.2 is
--     the load-bearing authorization point.
--   * admin_users: platform-level, unchanged.
--   * event_role_assignments UPDATE: stays revoked at the privilege layer
--     for both authenticated and service_role per the original migration's
--     "role changes are insert + delete, never in-place mutation" intent.

-- ─── game_event_drafts: SELECT replacement ─────────────────────────────
-- Replace the existing root-only "admins can read drafts" SELECT policy
-- with a two-branch version that admits organizers for events they
-- organize. The id column is the event identifier (text PK; equals
-- game_events.id and event_role_assignments.event_id), so the predicate
-- substitutes `id` for `event_id` directly. INSERT/UPDATE/DELETE policies
-- on this table stay root-only — authoring writes flow through save-draft
-- under service_role, not direct PostgREST.
drop policy "admins can read drafts" on public.game_event_drafts;

create policy "organizers and admins can read drafts"
  on public.game_event_drafts
  for select
  to authenticated
  using (public.is_organizer_for_event(id) or public.is_root_admin());

-- ─── game_event_versions: SELECT replacement ───────────────────────────
-- Replace the existing root-only "admins can read versions" SELECT policy
-- with a two-branch version. The game_event_admin_status view
-- (security_invoker = true) joins game_event_versions; without this
-- broadening, organizers reading the view would see "draft_only" status
-- on their published events because the version-row join would silently
-- return zero rows. event_id is a direct column on this table.
drop policy "admins can read versions" on public.game_event_versions;

create policy "organizers and admins can read versions"
  on public.game_event_versions
  for select
  to authenticated
  using (public.is_organizer_for_event(event_id) or public.is_root_admin());

-- ─── event_role_assignments: SELECT replacement + INSERT, DELETE ───────
-- The staffing table. UPDATE stays revoked at the privilege layer for
-- both authenticated and service_role (already enforced by migration
-- 20260421000100's "role changes are insert + delete, never in-place
-- mutation" intent); this migration does not grant UPDATE to anyone.
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
