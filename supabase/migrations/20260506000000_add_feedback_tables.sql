-- Madrona feedback child epic / M1 / phase 1.1: DB foundation.
--
-- Creates two tables, locks RLS, and seeds the registry so the FK is
-- load-bearing from the moment this migration applies:
--
--   public.feedback_enabled_events  — slug-keyed registry; an event must
--     have a row here before any feedback row can reference it. Read by
--     authenticated organizers / root admins; service-role-only writes
--     (registry seeding flows through migrations).
--
--   public.feedback_submissions     — one row per attendee submission
--     for a registered event. Anon-insert so the form can submit without
--     auth; authenticated organizers / root admins read. Two CHECK
--     constraints encode the milestone-level consent invariants:
--       * email_declined ⇒ email is null
--       * newsletter_opt_in ⇒ a real, non-declined email is present
--
-- The `madrona` registry seed lives in the same migration so the FK
-- accepts feedback_submissions inserts for `madrona` from t=apply.
-- (Epic Cross-Cutting Invariant 6: DB-level integrity from the first
-- write.)

-- ─── feedback_enabled_events (registry, FK target) ─────────────────────
create table public.feedback_enabled_events (
  slug text primary key,
  enabled_at timestamptz not null default now()
);

alter table public.feedback_enabled_events enable row level security;

revoke all on table public.feedback_enabled_events from anon, authenticated;
grant select on table public.feedback_enabled_events to authenticated;

-- Authenticated organizers (for the slug's event) and root admins may
-- read the registry. The slug → event_id resolution joins through
-- game_events; aliasing the inner table avoids ambiguity between the
-- registry's `slug` column and game_events.slug.
create policy "organizers and admins can read feedback registry"
  on public.feedback_enabled_events
  for select
  to authenticated
  using (
    public.is_organizer_for_event(
      (select ge.id from public.game_events ge where ge.slug = feedback_enabled_events.slug)
    )
    or public.is_root_admin()
  );

-- ─── feedback_submissions (FK holder) ──────────────────────────────────
create table public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null
    references public.feedback_enabled_events (slug) on delete restrict,
  submitted_at timestamptz not null default now(),
  ratings jsonb not null,
  free_text text,
  email text,
  email_declined boolean not null default false,
  newsletter_opt_in boolean not null default false,
  constraint feedback_submissions_email_declined_implies_null_email
    check (email_declined = false or email is null),
  constraint feedback_submissions_newsletter_opt_in_requires_email
    check (
      newsletter_opt_in = false
      or (email is not null and email_declined = false)
    )
);

create index feedback_submissions_event_slug_submitted_at_idx
  on public.feedback_submissions (event_slug, submitted_at desc);

alter table public.feedback_submissions enable row level security;

revoke all on table public.feedback_submissions from anon, authenticated;
grant insert on table public.feedback_submissions to anon;
grant select on table public.feedback_submissions to authenticated;

-- Anon insert: the FK constraint is the load-bearing gate ("must be a
-- registered slug"). No `with check` predicate is added at the policy
-- level — application-layer validation owns the submission shape, and
-- ratings keys are content-authored (epic Invariant 3) so no enum the
-- policy could meaningfully validate against exists.
create policy "anon can insert feedback for registered events"
  on public.feedback_submissions
  for insert
  to anon
  with check (true);

create policy "organizers and admins can read event feedback"
  on public.feedback_submissions
  for select
  to authenticated
  using (
    public.is_organizer_for_event(
      (select ge.id from public.game_events ge where ge.slug = event_slug)
    )
    or public.is_root_admin()
  );

-- No update/delete policies. Submissions are immutable from the
-- application surface; service-role can purge via direct SQL if abuse
-- surfaces (epic Risk Register accepted risk).

-- ─── Madrona registry seed ────────────────────────────────────────────
-- Idempotent so re-applying the migration on a database that already
-- received it is a no-op.
insert into public.feedback_enabled_events (slug)
values ('madrona')
on conflict (slug) do nothing;
