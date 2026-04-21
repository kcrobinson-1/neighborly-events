-- Reward redemption Phase A.2a: scoped RLS read policies.
--
-- Existing entitlement and role-assignment reads travel through
-- service-role-executed edge functions and therefore bypass RLS — the
-- policies below add a new authenticated read path without altering that
-- behavior. Writes continue to flow through the SECURITY DEFINER redeem
-- and reverse RPCs; no authenticated write policy is added here.
--
-- public.game_entitlements: authenticated callers who are an agent or
-- organizer for the row's event (or a root admin) may read it. A single
-- policy spanning all three roles keeps the truth table symmetric with
-- the write-path authorization helpers and is easier to audit than three
-- narrower policies would be.
grant select on table public.game_entitlements to authenticated;

create policy "assigned operators can read event entitlements"
  on public.game_entitlements
  for select
  to authenticated
  using (
    public.is_agent_for_event(event_id)
    or public.is_organizer_for_event(event_id)
    or public.is_root_admin()
  );

-- public.event_role_assignments: authenticated callers may read their
-- own assignment rows; root admins may read any. Writes remain
-- service-role-only (see A.1 migration 000100) and UPDATE stays revoked
-- from service_role — A.2a changes neither.
grant select on table public.event_role_assignments to authenticated;

create policy "users can read their own role assignments"
  on public.event_role_assignments
  for select
  to authenticated
  using (
    user_id = public.current_request_user_id()
    or public.is_root_admin()
  );
