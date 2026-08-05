-- Standalone newsletter signup surface — DB foundation.
--
-- Gives the newsletter capture seam its own enablement registry so an
-- event can offer signup without offering feedback, and adds the
-- surface-specific public RPC the newsletter-subscription-split
-- migration (20260510000000) anticipated by name. Storage stays on the
-- existing canonical log: `public.newsletter_opt_ins` remains the one
-- consent store (append-only, per that migration's Decision 2), and the
-- new RPC reaches it only through the internal `subscribe_email` helper
-- with a hardcoded `'standalone'` source literal — the same
-- internal-helper posture `submit_feedback` uses. No sibling
-- "newsletter_signups" table is created; a second store would reopen
-- the copy-drift the split migration exists to prevent.
--
-- Four changes ship together so the public write path is consistent at
-- every commit:
--
--   1. public.newsletter_enabled_events — slug-keyed registry, the
--      enablement seam for newsletter capture on any surface. Seeded
--      from feedback_enabled_events (every feedback-registered event
--      keeps its working opt-in write-through) plus an explicit
--      `madrona` seed so the FK below is load-bearing from t=apply.
--
--   2. newsletter_opt_ins.event_slug FK repoint —
--      feedback_enabled_events(slug) → newsletter_enabled_events(slug).
--      The split migration left the FK on the feedback registry as the
--      v1 default and deferred the registry question to the standalone
--      surface's pass; this is that pass, and it mints the sibling
--      registry. Consequence: any surface writing a newsletter opt-in
--      (including the feedback form's checkbox) now requires the event
--      in newsletter_enabled_events — which is what enablement means.
--
--   3. Email-shape CHECK on newsletter_opt_ins.email — DB-level sanity
--      gate for the anon-reachable write path (AGENTS.md pre-edit gate:
--      constraints over app-layer validation). Mirrors the client-side
--      EMAIL_PATTERN ("structurally email-shaped", not RFC 5322):
--      non-empty local part, `@`, dot-separated domain, no whitespace.
--      Values arrive lower(trim())-normalized from subscribe_email, so
--      the pattern needs no case handling.
--
--   4. public.submit_newsletter_signup(p_event_slug, p_email) —
--      SECURITY DEFINER, returns void (no row leaks back; sidesteps
--      SELECT-for-RETURNING), EXECUTE granted to anon + authenticated.
--      Body is a single subscribe_email call: the repointed FK is the
--      registration gate (unregistered slug → foreign_key_violation)
--      and the CHECK above is the email gate, so the function carries
--      no app-layer validation of its own.
--
-- Dedupe posture (decision recorded per the signup handoff): the
-- append-only log shape is kept — no UNIQUE on (event_slug, email) and
-- no ON CONFLICT. Signing up twice records two consent events and
-- succeeds both times, which is behaviorally idempotent from the
-- attendee's side; export-time deduplication treats casing variants as
-- one address via the write-time normalization. A UNIQUE-and-ignore
-- shape was considered and rejected because it would contradict the
-- split migration's Decision 2 (each row is a real consent event) for
-- no attendee-visible benefit.

-- ─── newsletter_enabled_events (registry, FK target) ─────────────────
create table public.newsletter_enabled_events (
  slug text primary key
    constraint newsletter_enabled_events_slug_format
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$' and length(slug) <= 64),
  enabled_at timestamptz not null default now()
);

alter table public.newsletter_enabled_events enable row level security;

revoke all on table public.newsletter_enabled_events from anon, authenticated;
grant select on table public.newsletter_enabled_events to authenticated;

-- Same read posture as feedback_enabled_events: organizers of the
-- slug's event and root admins. Registry writes flow through
-- migrations under service-role.
create policy "organizers and admins can read newsletter registry"
  on public.newsletter_enabled_events
  for select
  to authenticated
  using (
    public.is_organizer_for_event(
      (select ge.id from public.game_events ge where ge.slug = newsletter_enabled_events.slug)
    )
    or public.is_root_admin()
  );

-- Seed: every feedback-registered event keeps its opt-in write-through
-- working across the FK repoint below, and `madrona` is guaranteed
-- present even on a database whose feedback registry was emptied.
insert into public.newsletter_enabled_events (slug)
select slug from public.feedback_enabled_events
on conflict (slug) do nothing;

insert into public.newsletter_enabled_events (slug)
values ('madrona')
on conflict (slug) do nothing;

-- ─── FK repoint: newsletter_opt_ins → newsletter_enabled_events ──────
alter table public.newsletter_opt_ins
  drop constraint newsletter_opt_ins_event_slug_fkey;

alter table public.newsletter_opt_ins
  add constraint newsletter_opt_ins_event_slug_fkey
  foreign key (event_slug)
  references public.newsletter_enabled_events (slug)
  on delete restrict;

-- ─── Email-shape sanity CHECK on the canonical log ───────────────────
-- Applies to every writer (feedback write-through and the standalone
-- RPC alike). Existing rows all came through subscribe_email's
-- normalization behind the same client-side pattern; if a production
-- row somehow violates this, the migration fails loudly rather than
-- silently discarding a consent record — resolve the row, then re-run.
alter table public.newsletter_opt_ins
  add constraint newsletter_opt_ins_email_shape
  check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and length(email) <= 320
  );

-- ─── submit_newsletter_signup (public RPC, standalone surface) ───────
-- Mirrors submit_feedback's trust posture: SECURITY DEFINER bypasses
-- RLS, the function-grant boundary gates access, and the table-level
-- constraints (FK + CHECK) are the integrity gate — the body carries no
-- validation of its own. `'standalone'` is hardcoded so source
-- attribution is not attacker-controllable (the split migration's
-- Option L-internal contract).
create or replace function public.submit_newsletter_signup(
  p_event_slug text,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.subscribe_email(p_event_slug, p_email, 'standalone');
end;
$$;

revoke all on function public.submit_newsletter_signup(text, text)
  from public;
grant execute on function public.submit_newsletter_signup(text, text)
  to anon, authenticated;
