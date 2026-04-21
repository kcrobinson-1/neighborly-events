-- Reward redemption Phase A.1: permission helpers.
-- Mirror the shape of public.is_admin(): security definer so the helpers see
-- the role assignment table regardless of the caller's RLS scope, stable so
-- PostgREST can cache them within a request. is_root_admin() aliases
-- is_admin() in the MVP; the alias is the single point of change if the
-- authoring and redemption root-admin concepts diverge later.
create or replace function public.is_agent_for_event(target_event_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_role_assignments as assignment
    where assignment.role = 'agent'
      and assignment.event_id = target_event_id
      and assignment.user_id = public.current_request_user_id()
  );
$$;

create or replace function public.is_organizer_for_event(target_event_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.event_role_assignments as assignment
    where assignment.role = 'organizer'
      and assignment.event_id = target_event_id
      and assignment.user_id = public.current_request_user_id()
  );
$$;

create or replace function public.is_root_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin();
$$;

revoke all on function public.is_agent_for_event(text) from public;
revoke all on function public.is_organizer_for_event(text) from public;
revoke all on function public.is_root_admin() from public;

grant execute on function public.is_agent_for_event(text) to anon, authenticated, service_role;
grant execute on function public.is_organizer_for_event(text) to anon, authenticated, service_role;
grant execute on function public.is_root_admin() to anon, authenticated, service_role;
