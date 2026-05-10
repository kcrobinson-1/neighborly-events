-- Newsletter subscription split — see
-- docs/plans/newsletter-subscription-split.md.
--
-- Splits newsletter opt-in capture off the feedback_submissions row.
-- Lifecycle divergence motivated the split: the feedback row is bound
-- to one submission moment, while the consent record outlives it for
-- export downstream. Three changes ship together so the public anon
-- write path is consistent at every commit:
--
--   1. public.newsletter_opt_ins — append-only log of consent events
--      (one row per opt-in event, surrogate PK, no row-uniqueness
--      constraint). RLS-locked to organizer/admin reads; no anon
--      grant. Writes flow exclusively through the helper below.
--
--   2. public.subscribe_email(p_event_slug, p_email, p_source_surface)
--      — internal SECURITY DEFINER helper. EXECUTE revoked from
--      public, anon, authenticated. Reachable only from inside other
--      SECURITY DEFINER functions whose owner is the same role; the
--      surface-specific public RPCs hardcode their own
--      `p_source_surface` literal so source attribution is not
--      attacker-controllable.
--
--   3. public.submit_feedback — body extended to call subscribe_email
--      conditionally when the caller passed p_newsletter_opt_in =
--      true. The CHECK constraint
--      feedback_submissions_newsletter_opt_in_requires_email already
--      guarantees p_email is non-null in that branch, so the helper
--      receives a valid email without an in-RPC null check. The
--      `feedback_submissions.newsletter_opt_in` column persists as a
--      denormalized snapshot of "this attendee asserted opt-in at
--      this submission moment" (Decision 5).
--
-- No data-movement SQL: the maintainer's standing assumption is that
-- feedback_submissions has not yet served a real event, so the
-- forward-only path is sound (Decision 3). Revisiting that
-- assumption requires the implementing pass to query production row
-- count before merge; if rows trace to a real event, this migration
-- needs an Option F (backfill) or Option G' (truncate) addendum
-- before being applied.

-- ─── newsletter_opt_ins (append-only log) ────────────────────────────
create table public.newsletter_opt_ins (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null
    references public.feedback_enabled_events (slug) on delete restrict,
  email text not null,
  opted_in_at timestamptz not null default now(),
  source_surface text not null
    constraint newsletter_opt_ins_source_surface_known
    check (source_surface in ('feedback_form', 'standalone'))
);

-- Per-event export queries read by (event_slug, opted_in_at desc).
-- Non-unique by design: the same (event_slug, email) pair may produce
-- multiple rows over time (Decision 2 — log shape, not row-uniqueness).
create index newsletter_opt_ins_event_slug_opted_in_at_idx
  on public.newsletter_opt_ins (event_slug, opted_in_at desc);

alter table public.newsletter_opt_ins enable row level security;

-- No anon grants. Writes flow through public.subscribe_email (called
-- from inside SECURITY DEFINER public RPCs); reads are organizer/admin
-- only via the SELECT policy below.
revoke all on table public.newsletter_opt_ins from anon, authenticated;
grant select on table public.newsletter_opt_ins to authenticated;

-- Same shape as feedback_submissions' organizer/admin read policy:
-- resolve event_slug → game_events.id and gate on
-- is_organizer_for_event() or is_root_admin().
create policy "organizers and admins can read newsletter opt-ins"
  on public.newsletter_opt_ins
  for select
  to authenticated
  using (
    public.is_organizer_for_event(
      (select ge.id from public.game_events ge where ge.slug = newsletter_opt_ins.event_slug)
    )
    or public.is_root_admin()
  );

-- ─── subscribe_email (internal helper) ───────────────────────────────
-- Plain INSERT, no ON CONFLICT — every call records a real consent
-- event. Email is normalized at write time (lower(trim(...)))) so
-- export-time deduplication treats casing variants as the same
-- address (Decision 2).
create or replace function public.subscribe_email(
  p_event_slug text,
  p_email text,
  p_source_surface text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.newsletter_opt_ins (event_slug, email, source_surface)
  values (p_event_slug, lower(trim(p_email)), p_source_surface);
end;
$$;

-- Internal-only grant posture (Decision 4 / Option L-internal). Anon
-- and authenticated callers never reach this helper directly; they
-- reach it through surface-specific public SECURITY DEFINER RPCs
-- (submit_feedback today, a future submit_newsletter_signup) that
-- hardcode their own source_surface literal. Functions called from
-- inside another SECURITY DEFINER function execute under the outer
-- function's owner role, so this REVOKE leaves the in-RPC call path
-- untouched.
revoke execute on function public.subscribe_email(text, text, text)
  from public, anon, authenticated;

-- ─── submit_feedback — write through to subscribe_email ─────────────
-- Body now does two writes inside one transaction when the caller
-- opted in: the feedback row, and the capture-log row via the helper.
-- Helper failure rolls the feedback INSERT back, which matches user
-- expectation ("submit feedback with newsletter checked" should not
-- produce a feedback row claiming opt-in alongside a missing capture
-- row). p_source_surface is hardcoded inside the function body so
-- source attribution is not attacker-controllable.
--
-- The conditional is bare `if p_newsletter_opt_in then …` because the
-- existing CHECK constraint
-- feedback_submissions_newsletter_opt_in_requires_email guarantees
-- email is non-null whenever p_newsletter_opt_in = true (the feedback
-- INSERT above this branch would have errored otherwise).
create or replace function public.submit_feedback(
  p_event_slug text,
  p_ratings jsonb,
  p_email_declined boolean,
  p_newsletter_opt_in boolean,
  p_free_text text default null,
  p_email text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.feedback_submissions (
    event_slug,
    ratings,
    free_text,
    email,
    email_declined,
    newsletter_opt_in
  )
  values (
    p_event_slug,
    p_ratings,
    p_free_text,
    p_email,
    p_email_declined,
    p_newsletter_opt_in
  );

  if p_newsletter_opt_in then
    perform public.subscribe_email(p_event_slug, p_email, 'feedback_form');
  end if;
end;
$$;

-- The submit_feedback grant set (anon, authenticated) is unchanged
-- from 20260509000000; re-granting here is a no-op but keeps the
-- function definition self-describing under create-or-replace.
revoke all on function public.submit_feedback(
  text, jsonb, boolean, boolean, text, text
) from public;
grant execute on function public.submit_feedback(
  text, jsonb, boolean, boolean, text, text
) to anon, authenticated;

-- ─── Snapshot semantics on the surviving boolean ────────────────────
-- Decision 5 keeps newsletter_opt_in on feedback_submissions as a
-- denormalized snapshot of intent at submission time. The capture log
-- is canonical for "this email opted in at this moment"; the
-- feedback boolean answers a different question ("did this submitter
-- assert opt-in alongside this feedback row") and survives
-- independent purges of capture-log rows.
comment on column public.feedback_submissions.newsletter_opt_in is
  'Snapshot of opt-in intent at submission moment. Canonical consent record lives in public.newsletter_opt_ins; this column is durable on the feedback row for audit, independent of later capture-log purges. See docs/plans/newsletter-subscription-split.md Decision 5.';
