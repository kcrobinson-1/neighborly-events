-- Reward redemption Phase A.1: inert data-model additions on game_entitlements.
-- All columns are nullable or defaulted so existing rows remain valid with no
-- backfill. The shape check enforces the redeemed-row invariant from
-- docs/plans/reward-redemption-phase-a-1-plan.md; the monitoring index serves
-- the recent-first list on /event/:slug/redemptions.
alter table public.game_entitlements
  add column if not exists redeemed_at timestamptz,
  add column if not exists redeemed_by uuid references auth.users (id) on delete set null,
  add column if not exists redeemed_by_role text,
  add column if not exists redeemed_event_id text,
  add column if not exists redemption_status text not null default 'unredeemed',
  add column if not exists redemption_reversed_at timestamptz,
  add column if not exists redemption_reversed_by uuid references auth.users (id) on delete set null,
  add column if not exists redemption_reversed_by_role text,
  add column if not exists redemption_note text;

alter table public.game_entitlements
  add constraint game_entitlements_redemption_status_check
  check (redemption_status in ('unredeemed', 'redeemed'));

alter table public.game_entitlements
  add constraint game_entitlements_redeemed_by_role_check
  check (redeemed_by_role is null or redeemed_by_role in ('agent', 'root_admin'));

alter table public.game_entitlements
  add constraint game_entitlements_reversed_by_role_check
  check (
    redemption_reversed_by_role is null
    or redemption_reversed_by_role in ('organizer', 'root_admin')
  );

-- Composite invariant: an unredeemed row must have all redeemed_* metadata
-- null; a redeemed row must have redeemed_at and redeemed_by_role populated
-- and redeemed_event_id equal to the entitlement's event_id. Reversal
-- metadata is intentionally unconstrained here because a reversed row flips
-- status back to 'unredeemed' with redeemed_* cleared; the reversal columns
-- then hold the most recent reverse cycle's identity and timestamp.
alter table public.game_entitlements
  add constraint game_entitlements_redeemed_shape_check
  check (
    (
      redemption_status = 'unredeemed'
      and redeemed_at is null
      and redeemed_by is null
      and redeemed_by_role is null
      and redeemed_event_id is null
    )
    or (
      redemption_status = 'redeemed'
      and redeemed_at is not null
      and redeemed_by_role is not null
      and redeemed_event_id = event_id
    )
  );

create index if not exists game_entitlements_event_redeemed_at_idx
  on public.game_entitlements (event_id, redeemed_at desc nulls last);
