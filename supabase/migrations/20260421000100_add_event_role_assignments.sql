-- Reward redemption Phase A.1: event-scoped role assignment table.
-- Holds agent and organizer assignments keyed by (user_id, event_id, role).
-- Root-admin identity lives in public.admin_users and is not modelled here.
-- The table is created empty; seeding is an operational step via the
-- supabase/role-management/ runbook, committed through reviewed PRs.
-- Note on auth.users coupling: user_id and created_by hold auth.users.id
-- values but do not declare a foreign key. The role-management runbook
-- (supabase/role-management/) validates that the target user exists at
-- insert time via email → auth.users lookup, which covers the practical
-- orphan-row concern. Skipping the FK keeps this table decoupled from
-- Supabase's internal auth schema (which varies across CLI versions) and
-- makes database-level testing straightforward. The trade-off: an
-- auth.users deletion won't cascade to assignment rows, which is
-- acceptable at MVP scale and is easily cleaned up with a periodic
-- anti-join sweep if it ever matters.
create table if not exists public.event_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_id text not null references public.game_events (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  created_by uuid,
  constraint event_role_assignments_role_check
    check (role in ('agent', 'organizer')),
  constraint event_role_assignments_unique
    unique (user_id, event_id, role)
);

create index if not exists event_role_assignments_event_role_idx
  on public.event_role_assignments (event_id, role);

alter table public.event_role_assignments enable row level security;

revoke all on table public.event_role_assignments from anon, authenticated;
-- Supabase's baseline `grant all on all tables in schema public to
-- service_role` would otherwise leave UPDATE enabled; revoke it explicitly
-- to enforce the "role changes are insert + delete, never in-place
-- mutation" intent.
revoke update on table public.event_role_assignments from service_role;
grant select, insert, delete on table public.event_role_assignments to service_role;
