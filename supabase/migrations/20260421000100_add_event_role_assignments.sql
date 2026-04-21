-- Reward redemption Phase A.1: event-scoped role assignment table.
-- Holds agent and organizer assignments keyed by (user_id, event_id, role).
-- Root-admin identity lives in public.admin_users and is not modelled here.
-- The table is created empty; seeding is an operational step via the
-- supabase/role-management/ runbook, committed through reviewed PRs.
create table if not exists public.event_role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id text not null references public.game_events (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
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
