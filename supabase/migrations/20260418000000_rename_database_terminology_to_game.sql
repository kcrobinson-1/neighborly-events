-- Phase 2 terminology migration: move persistent SQL contracts from
-- quiz/raffle names to game/entitlement names without changing behavior.

alter table public.quiz_events rename to game_events;
alter table public.quiz_questions rename to game_questions;
alter table public.quiz_question_options rename to game_question_options;
alter table public.quiz_completions rename to game_completions;
alter table public.raffle_entitlements rename to game_entitlements;
alter table public.quiz_event_drafts rename to game_event_drafts;
alter table public.quiz_event_versions rename to game_event_versions;
alter table public.quiz_admin_users rename to admin_users;
alter table public.quiz_event_audit_log rename to game_event_audit_log;
alter table public.quiz_starts rename to game_starts;

alter table public.game_events
  rename column raffle_label to entitlement_label;

alter function public.is_quiz_admin()
  rename to is_admin;
alter function public.complete_quiz_and_award_entitlement(text, text, text, jsonb, integer, integer)
  rename to complete_game_and_award_entitlement;
alter function public.publish_quiz_event_draft(text, uuid)
  rename to publish_game_event_draft;
alter function public.unpublish_quiz_event(text, uuid)
  rename to unpublish_game_event;
alter function public.set_quiz_event_draft_audit_fields()
  rename to set_game_event_draft_audit_fields;
alter function public.enforce_quiz_event_draft_slug_lock()
  rename to enforce_game_event_draft_slug_lock;

alter trigger set_quiz_event_draft_audit_fields
  on public.game_event_drafts
  rename to set_game_event_draft_audit_fields;
alter trigger quiz_event_draft_slug_lock
  on public.game_event_drafts
  rename to game_event_draft_slug_lock;

alter table public.admin_users
  rename constraint quiz_admin_users_pkey to admin_users_pkey;
alter table public.admin_users
  rename constraint quiz_admin_users_user_id_key to admin_users_user_id_key;
alter table public.admin_users
  rename constraint quiz_admin_users_user_id_fkey to admin_users_user_id_fkey;
alter table public.admin_users
  rename constraint quiz_admin_users_email_normalized to admin_users_email_normalized;

alter table public.game_events
  rename constraint quiz_events_pkey to game_events_pkey;
alter table public.game_events
  rename constraint quiz_events_slug_key to game_events_slug_key;
alter table public.game_events
  rename constraint quiz_events_estimated_minutes_positive to game_events_estimated_minutes_positive;
alter table public.game_events
  rename constraint quiz_events_feedback_mode_check to game_events_feedback_mode_check;

alter table public.game_questions
  rename constraint quiz_questions_pkey to game_questions_pkey;
alter table public.game_questions
  rename constraint quiz_questions_event_id_fkey to game_questions_event_id_fkey;
alter table public.game_questions
  rename constraint quiz_questions_display_order_positive to game_questions_display_order_positive;
alter table public.game_questions
  rename constraint quiz_questions_selection_mode_check to game_questions_selection_mode_check;
alter table public.game_questions
  rename constraint quiz_questions_event_display_order_unique to game_questions_event_display_order_unique;

alter table public.game_question_options
  rename constraint quiz_question_options_pkey to game_question_options_pkey;
alter table public.game_question_options
  rename constraint quiz_question_options_display_order_positive to game_question_options_display_order_positive;
alter table public.game_question_options
  rename constraint quiz_question_options_event_question_display_order_unique to game_question_options_event_question_display_order_unique;
alter table public.game_question_options
  rename constraint quiz_question_options_question_fk to game_question_options_question_fk;

alter table public.game_entitlements
  rename constraint raffle_entitlements_pkey to game_entitlements_pkey;
alter table public.game_entitlements
  rename constraint raffle_entitlements_status_check to game_entitlements_status_check;
alter table public.game_entitlements
  rename constraint raffle_entitlements_event_session_unique to game_entitlements_event_session_unique;
alter table public.game_entitlements
  rename constraint raffle_entitlements_first_completion_fk to game_entitlements_first_completion_fk;

alter table public.game_completions
  rename constraint quiz_completions_pkey to game_completions_pkey;
alter table public.game_completions
  rename constraint quiz_completions_entitlement_id_fkey to game_completions_entitlement_id_fkey;
alter table public.game_completions
  rename constraint quiz_completions_attempt_positive to game_completions_attempt_positive;
alter table public.game_completions
  rename constraint quiz_completions_duration_non_negative to game_completions_duration_non_negative;
alter table public.game_completions
  rename constraint quiz_completions_event_session_attempt_unique to game_completions_event_session_attempt_unique;
alter table public.game_completions
  rename constraint quiz_completions_event_session_request_unique to game_completions_event_session_request_unique;

alter table public.game_event_drafts
  rename constraint quiz_event_drafts_pkey to game_event_drafts_pkey;
alter table public.game_event_drafts
  rename constraint quiz_event_drafts_slug_key to game_event_drafts_slug_key;
alter table public.game_event_drafts
  rename constraint quiz_event_drafts_schema_version_positive to game_event_drafts_schema_version_positive;
alter table public.game_event_drafts
  rename constraint quiz_event_drafts_live_version_number_positive to game_event_drafts_live_version_number_positive;
alter table public.game_event_drafts
  rename constraint quiz_event_drafts_content_object to game_event_drafts_content_object;

alter table public.game_event_versions
  rename constraint quiz_event_versions_pkey to game_event_versions_pkey;
alter table public.game_event_versions
  rename constraint quiz_event_versions_schema_version_positive to game_event_versions_schema_version_positive;
alter table public.game_event_versions
  rename constraint quiz_event_versions_version_number_positive to game_event_versions_version_number_positive;
alter table public.game_event_versions
  rename constraint quiz_event_versions_content_object to game_event_versions_content_object;

alter table public.game_event_audit_log
  rename constraint quiz_event_audit_log_pkey to game_event_audit_log_pkey;
alter table public.game_event_audit_log
  rename constraint quiz_event_audit_log_action_check to game_event_audit_log_action_check;
alter table public.game_event_audit_log
  rename constraint quiz_event_audit_log_version_number_positive to game_event_audit_log_version_number_positive;
alter table public.game_event_audit_log
  rename constraint quiz_event_audit_log_metadata_object to game_event_audit_log_metadata_object;

alter table public.game_starts
  rename constraint quiz_starts_pkey to game_starts_pkey;
alter table public.game_starts
  rename constraint quiz_starts_event_id_client_session_id_key to game_starts_event_id_client_session_id_key;
alter table public.game_starts
  rename constraint quiz_starts_event_id_fkey to game_starts_event_id_fkey;

alter index if exists public.quiz_completions_event_session_idx
  rename to game_completions_event_session_idx;
alter index if exists public.quiz_completions_entitlement_id_idx
  rename to game_completions_entitlement_id_idx;
alter index if exists public.raffle_entitlements_first_completion_id_idx
  rename to game_entitlements_first_completion_id_idx;

drop policy if exists "published quiz events are readable"
  on public.game_events;
drop policy if exists "published quiz questions are readable"
  on public.game_questions;
drop policy if exists "published quiz options are readable"
  on public.game_question_options;
drop policy if exists "quiz admins can read drafts"
  on public.game_event_drafts;
drop policy if exists "quiz admins can insert drafts"
  on public.game_event_drafts;
drop policy if exists "quiz admins can update drafts"
  on public.game_event_drafts;
drop policy if exists "quiz admins can delete drafts"
  on public.game_event_drafts;
drop policy if exists "quiz admins can read versions"
  on public.game_event_versions;

create policy "published game events are readable"
on public.game_events
for select
to anon, authenticated
using (published_at is not null);

create policy "published game questions are readable"
on public.game_questions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.game_events
    where public.game_events.id = public.game_questions.event_id
      and public.game_events.published_at is not null
  )
);

create policy "published game options are readable"
on public.game_question_options
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.game_events
    where public.game_events.id = public.game_question_options.event_id
      and public.game_events.published_at is not null
  )
);

create policy "admins can read drafts"
on public.game_event_drafts
for select
to authenticated
using (public.is_admin());

create policy "admins can insert drafts"
on public.game_event_drafts
for insert
to authenticated
with check (public.is_admin());

create policy "admins can update drafts"
on public.game_event_drafts
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins can delete drafts"
on public.game_event_drafts
for delete
to authenticated
using (public.is_admin());

create policy "admins can read versions"
on public.game_event_versions
for select
to authenticated
using (public.is_admin());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users as admin_user
    where admin_user.active
      and (
        admin_user.email = public.current_request_email()
        or (
          admin_user.user_id is not null
          and admin_user.user_id = public.current_request_user_id()
        )
      )
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

create or replace function public.set_game_event_draft_audit_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_request_user_id uuid;
begin
  new.updated_at = clock_timestamp();
  v_request_user_id = public.current_request_user_id();

  if v_request_user_id is not null then
    new.last_saved_by = v_request_user_id;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_game_event_draft_slug_lock()
returns trigger
language plpgsql
as $$
begin
  raise exception 'slug_locked'
    using detail = 'Slug cannot be changed after the event has been published.';
  return new;
end;
$$;

create or replace function public.complete_game_and_award_entitlement(
  p_event_id text,
  p_client_session_id text,
  p_request_id text,
  p_submitted_answers jsonb,
  p_score integer,
  p_duration_ms integer
)
returns table (
  completion_id uuid,
  attempt_number integer,
  score integer,
  entitlement_status text,
  verification_code text,
  entitlement_created_at timestamptz,
  raffle_eligible boolean,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_completion public.game_completions%rowtype;
  v_entitlement public.game_entitlements%rowtype;
  v_completion public.game_completions%rowtype;
  v_attempt_number integer;
  v_entitlement_status text;
begin
  -- Serialize writes per event/session so concurrent completions cannot race
  -- entitlement creation or attempt-number assignment.
  perform pg_advisory_xact_lock(
    hashtextextended(p_event_id || ':' || p_client_session_id, 0)
  );

  -- Idempotency guard: if this request_id already produced a completion, return
  -- the stored result instead of creating another completion row.
  select *
  into v_existing_completion
  from public.game_completions
  where event_id = p_event_id
    and client_session_id = p_client_session_id
    and request_id = p_request_id;

  if found then
    select *
    into v_entitlement
    from public.game_entitlements
    where id = v_existing_completion.entitlement_id;

    return query
    select
      v_existing_completion.id,
      v_existing_completion.attempt_number,
      v_existing_completion.score,
      case
        when v_existing_completion.entitlement_awarded then 'new'
        else 'existing'
      end,
      v_existing_completion.verification_code,
      v_entitlement.created_at,
      v_existing_completion.entitlement_awarded,
      case
        when v_existing_completion.entitlement_awarded then 'You earned your raffle entry.'
        else 'You already earned your raffle entry. This retake does not create another ticket.'
      end;

    return;
  end if;

  select *
  into v_entitlement
  from public.game_entitlements
  where event_id = p_event_id
    and client_session_id = p_client_session_id;

  if found then
    v_entitlement_status := 'existing';
  else
    v_entitlement_status := 'new';

    insert into public.game_entitlements (
      event_id,
      client_session_id,
      verification_code
    )
    values (
      p_event_id,
      p_client_session_id,
      public.generate_neighborly_verification_code()
    )
    returning *
    into v_entitlement;
  end if;

  select coalesce(max(gc.attempt_number), 0) + 1
  into v_attempt_number
  from public.game_completions gc
  where gc.event_id = p_event_id
    and gc.client_session_id = p_client_session_id;

  insert into public.game_completions (
    event_id,
    client_session_id,
    request_id,
    attempt_number,
    submitted_answers,
    score,
    duration_ms,
    verification_code,
    entitlement_awarded,
    entitlement_id
  )
  values (
    p_event_id,
    p_client_session_id,
    p_request_id,
    v_attempt_number,
    p_submitted_answers,
    p_score,
    p_duration_ms,
    v_entitlement.verification_code,
    v_entitlement_status = 'new',
    v_entitlement.id
  )
  returning *
  into v_completion;

  -- Persist the first completion id once so later retakes cannot rewrite it.
  if v_entitlement.first_completion_id is null then
    update public.game_entitlements
    set first_completion_id = v_completion.id
    where id = v_entitlement.id
    returning *
    into v_entitlement;
  end if;

  return query
  select
    v_completion.id,
    v_completion.attempt_number,
    v_completion.score,
    v_entitlement_status,
    v_entitlement.verification_code,
    v_entitlement.created_at,
    v_entitlement_status = 'new',
    case
      when v_entitlement_status = 'new' then 'You earned your raffle entry.'
      else 'You already earned your raffle entry. This retake does not create another ticket.'
    end;
end;
$$;

create or replace function public.publish_game_event_draft(
  p_event_id text,
  p_published_by uuid
)
returns table (
  event_id text,
  slug text,
  version_number integer,
  published_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.game_event_drafts%rowtype;
  v_content jsonb;
  v_next_version integer;
  v_published_at timestamptz := now();
begin
  -- Lock the draft row so concurrent publishes cannot reuse the same version
  -- number or interleave public projection updates.
  select *
  into v_draft
  from public.game_event_drafts
  where id = p_event_id
  for update;

  if not found then
    raise exception 'draft_not_found';
  end if;

  v_content = v_draft.content;

  if v_content ->> 'id' is distinct from v_draft.id
    or v_content ->> 'slug' is distinct from v_draft.slug
    or v_content ->> 'name' is distinct from v_draft.name then
    raise exception 'invalid_draft_identity';
  end if;

  if exists (
    select 1
    from public.game_events as event
    where event.slug = v_draft.slug
      and event.id <> v_draft.id
  ) then
    raise exception 'slug_collision';
  end if;

  select coalesce(max(version.version_number), 0) + 1
  into v_next_version
  from public.game_event_versions as version
  where version.event_id = v_draft.id;

  insert into public.game_event_versions (
    event_id,
    version_number,
    schema_version,
    content,
    published_at,
    published_by
  )
  values (
    v_draft.id,
    v_next_version,
    v_draft.schema_version,
    v_content,
    v_published_at,
    p_published_by
  );

  insert into public.game_events (
    id,
    slug,
    name,
    location,
    estimated_minutes,
    entitlement_label,
    intro,
    summary,
    feedback_mode,
    allow_back_navigation,
    allow_retake,
    published_at,
    created_at,
    updated_at
  )
  values (
    v_draft.id,
    v_draft.slug,
    v_draft.name,
    v_content ->> 'location',
    (v_content ->> 'estimatedMinutes')::integer,
    v_content ->> 'raffleLabel',
    v_content ->> 'intro',
    v_content ->> 'summary',
    v_content ->> 'feedbackMode',
    coalesce((v_content ->> 'allowBackNavigation')::boolean, true),
    coalesce((v_content ->> 'allowRetake')::boolean, true),
    v_published_at,
    coalesce(v_draft.created_at, v_published_at),
    v_published_at
  )
  on conflict (id) do update
  set
    slug = excluded.slug,
    name = excluded.name,
    location = excluded.location,
    estimated_minutes = excluded.estimated_minutes,
    entitlement_label = excluded.entitlement_label,
    intro = excluded.intro,
    summary = excluded.summary,
    feedback_mode = excluded.feedback_mode,
    allow_back_navigation = excluded.allow_back_navigation,
    allow_retake = excluded.allow_retake,
    published_at = excluded.published_at,
    updated_at = excluded.updated_at;

  delete from public.game_questions
  where game_questions.event_id = v_draft.id;

  -- Replace the question and option projection from the draft JSON in this
  -- function's transaction; any constraint failure rolls the whole publish back.
  insert into public.game_questions (
    event_id,
    id,
    display_order,
    sponsor,
    prompt,
    selection_mode,
    explanation,
    sponsor_fact
  )
  select
    v_draft.id,
    question.value ->> 'id',
    question.ordinality::integer,
    question.value ->> 'sponsor',
    question.value ->> 'prompt',
    question.value ->> 'selectionMode',
    question.value ->> 'explanation',
    question.value ->> 'sponsorFact'
  from jsonb_array_elements(v_content -> 'questions') with ordinality as question(value, ordinality);

  insert into public.game_question_options (
    event_id,
    question_id,
    id,
    display_order,
    label,
    is_correct
  )
  select
    v_draft.id,
    question.value ->> 'id',
    option.value ->> 'id',
    option.ordinality::integer,
    option.value ->> 'label',
    exists (
      select 1
      from jsonb_array_elements_text(question.value -> 'correctAnswerIds') as correct_answer(id)
      where correct_answer.id = option.value ->> 'id'
    )
  from jsonb_array_elements(v_content -> 'questions') with ordinality as question(value, question_ordinality)
  cross join lateral jsonb_array_elements(question.value -> 'options') with ordinality as option(value, ordinality);

  update public.game_event_drafts
  set
    live_version_number = v_next_version,
    last_published_at = v_published_at,
    last_published_by = p_published_by
  where id = v_draft.id;

  insert into public.game_event_audit_log (
    event_id,
    action,
    actor_id,
    version_number,
    metadata,
    created_at
  )
  values (
    v_draft.id,
    'publish',
    p_published_by,
    v_next_version,
    jsonb_build_object(
      'slug', v_draft.slug,
      'schemaVersion', v_draft.schema_version
    ),
    v_published_at
  );

  return query
  select
    v_draft.id,
    v_draft.slug,
    v_next_version,
    v_published_at;
end;
$$;

create or replace function public.unpublish_game_event(
  p_event_id text,
  p_actor_id uuid
)
returns table (
  event_id text,
  unpublished_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.game_event_drafts%rowtype;
  v_unpublished_at timestamptz := now();
begin
  -- Lock the draft row so unpublish records the live version that was current
  -- when the public route was hidden.
  select *
  into v_draft
  from public.game_event_drafts
  where id = p_event_id
  for update;

  if not found then
    raise exception 'draft_not_found';
  end if;

  update public.game_events
  set
    published_at = null,
    updated_at = v_unpublished_at
  where id = v_draft.id
    and published_at is not null;

  if not found then
    raise exception 'live_event_not_found';
  end if;

  insert into public.game_event_audit_log (
    event_id,
    action,
    actor_id,
    version_number,
    metadata,
    created_at
  )
  values (
    v_draft.id,
    'unpublish',
    p_actor_id,
    v_draft.live_version_number,
    jsonb_build_object('slug', v_draft.slug),
    v_unpublished_at
  );

  return query
  select
    v_draft.id,
    v_unpublished_at;
end;
$$;

revoke all on function public.complete_game_and_award_entitlement(
  text,
  text,
  text,
  jsonb,
  integer,
  integer
)
from public, anon, authenticated;

grant execute on function public.complete_game_and_award_entitlement(
  text,
  text,
  text,
  jsonb,
  integer,
  integer
)
to service_role;

revoke all on function public.publish_game_event_draft(text, uuid)
  from public;
revoke all on function public.unpublish_game_event(text, uuid)
  from public;
revoke all on function public.publish_game_event_draft(text, uuid)
  from anon, authenticated;
revoke all on function public.unpublish_game_event(text, uuid)
  from anon, authenticated;

grant execute on function public.publish_game_event_draft(text, uuid)
  to service_role;
grant execute on function public.unpublish_game_event(text, uuid)
  to service_role;
