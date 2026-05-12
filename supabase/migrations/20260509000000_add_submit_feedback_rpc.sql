-- Madrona feedback hardening: route the anon write through a SECURITY
-- DEFINER RPC instead of a direct INSERT.
--
-- The original 20260506000000 shape granted INSERT to anon and gated the
-- write through an RLS with-check policy. PostgREST's default INSERT
-- handler emits `RETURNING *`, which requires SELECT — and anon's SELECT
-- is intentionally absent (writes-only public posture). PR #235
-- worked around this client-side by setting `Prefer: return=minimal`,
-- which is a hint PostgREST may, per RFC 7240, ignore. The structural
-- fix is the RPC pattern this codebase already uses for trusted
-- mutations (redeem_entitlement_by_code, complete_game_and_award_entitlement):
-- the function bypasses RLS, returns void so no row leaks back, and
-- gates trust at the function-grant boundary instead of the table-grant
-- boundary.
--
-- The CHECK constraints and FK on feedback_submissions remain the
-- DB-level integrity gate. The RPC body is a simple INSERT — no shape
-- validation inside the function (rating keys are content-authored
-- per epic Invariant 3, no platform-defined enum).

-- p_free_text and p_email default to null so the supabase-js type
-- generator marks them optional (the generator drops nullability for
-- required text params, which would force the form to satisfy
-- `string`, not `string | null`). Callers that omit these keys land a
-- null in the column; the existing CHECK constraints still enforce
-- the consent invariants.
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
end;
$$;

revoke all on function public.submit_feedback(
  text, jsonb, boolean, boolean, text, text
) from public;
grant execute on function public.submit_feedback(
  text, jsonb, boolean, boolean, text, text
) to anon, authenticated;

-- Now that the RPC owns the write path, retire the table-level INSERT
-- grant and the anon-insert RLS policy. Submissions are reachable from
-- anon only via submit_feedback().
drop policy "anon can insert feedback for registered events"
  on public.feedback_submissions;

revoke insert on public.feedback_submissions from anon;

-- The organizer/admin SELECT policy on feedback_submissions and the
-- registry SELECT policy on feedback_enabled_events are unchanged.

-- Permissions after this migration:
-- public.submit_feedback(text, jsonb, boolean, boolean, text, text):
--   SECURITY DEFINER; EXECUTE granted to anon and authenticated;
--   public has no privileges.
-- public.feedback_submissions: anon has no INSERT; "anon can insert
--   feedback for registered events" policy removed; other grants and
--   policies on this table unchanged.
