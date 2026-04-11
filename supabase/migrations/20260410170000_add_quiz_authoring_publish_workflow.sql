alter table public.quiz_event_drafts
  add column if not exists last_published_at timestamptz,
  add column if not exists last_published_by uuid,
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid;

create table if not exists public.quiz_event_live_transitions (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  action text not null,
  version_number integer,
  actor_user_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint quiz_event_live_transitions_action_check
    check (action in ('publish', 'archive')),
  constraint quiz_event_live_transitions_version_number_positive
    check (version_number is null or version_number > 0),
  constraint quiz_event_live_transitions_details_object
    check (jsonb_typeof(details) = 'object')
);

alter table public.quiz_event_live_transitions enable row level security;

revoke all on table public.quiz_event_live_transitions
  from anon, authenticated;

grant select, insert, update, delete on table public.quiz_event_live_transitions
  to service_role;

revoke insert, update, delete on table public.quiz_event_drafts
  from authenticated;

create or replace function public.set_quiz_event_draft_audit_fields()
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

create or replace function public.publish_quiz_event_draft(
  p_event_id text,
  p_expected_updated_at timestamptz,
  p_actor_user_id uuid,
  p_source text default 'admin_ui'
)
returns table (
  event_id text,
  version_number integer,
  published_at timestamptz,
  published_by uuid,
  live_version_number integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.quiz_event_drafts%rowtype;
  v_updated_draft public.quiz_event_drafts%rowtype;
  v_next_version integer;
  v_published_at timestamptz := now();
  v_source text := coalesce(nullif(btrim(p_source), ''), 'admin_ui');
begin
  if v_source not in ('admin_ui', 'ai_mcp') then
    raise exception 'invalid_source';
  end if;

  select *
  into v_draft
  from public.quiz_event_drafts
  where id = p_event_id
  for update;

  if not found then
    raise exception 'draft_not_found';
  end if;

  if p_expected_updated_at is null
    or v_draft.updated_at is distinct from p_expected_updated_at then
    raise exception 'stale_draft';
  end if;

  if v_draft.content ->> 'id' is distinct from v_draft.id
    or v_draft.content ->> 'slug' is distinct from v_draft.slug
    or v_draft.content ->> 'name' is distinct from v_draft.name then
    raise exception 'invalid_draft_identity';
  end if;

  if exists (
    select 1
    from public.quiz_events as event
    where event.slug = v_draft.slug
      and event.id <> v_draft.id
  ) then
    raise exception 'slug_collision';
  end if;

  select coalesce(max(version.version_number), 0) + 1
  into v_next_version
  from public.quiz_event_versions as version
  where version.event_id = v_draft.id;

  insert into public.quiz_event_versions (
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
    v_draft.content,
    v_published_at,
    p_actor_user_id
  );

  insert into public.quiz_events (
    id,
    slug,
    name,
    location,
    estimated_minutes,
    raffle_label,
    intro,
    summary,
    feedback_mode,
    allow_back_navigation,
    allow_retake,
    published_at
  )
  values (
    v_draft.id,
    v_draft.slug,
    v_draft.name,
    v_draft.content ->> 'location',
    (v_draft.content ->> 'estimatedMinutes')::integer,
    v_draft.content ->> 'raffleLabel',
    v_draft.content ->> 'intro',
    v_draft.content ->> 'summary',
    v_draft.content ->> 'feedbackMode',
    coalesce((v_draft.content ->> 'allowBackNavigation')::boolean, true),
    coalesce((v_draft.content ->> 'allowRetake')::boolean, true),
    v_published_at
  )
  on conflict (id) do update
  set slug = excluded.slug,
      name = excluded.name,
      location = excluded.location,
      estimated_minutes = excluded.estimated_minutes,
      raffle_label = excluded.raffle_label,
      intro = excluded.intro,
      summary = excluded.summary,
      feedback_mode = excluded.feedback_mode,
      allow_back_navigation = excluded.allow_back_navigation,
      allow_retake = excluded.allow_retake,
      published_at = excluded.published_at,
      updated_at = now();

  delete from public.quiz_questions
  where quiz_questions.event_id = v_draft.id;

  insert into public.quiz_questions (
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
  from jsonb_array_elements(v_draft.content -> 'questions') with ordinality as question(value, ordinality);

  insert into public.quiz_question_options (
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
  from jsonb_array_elements(v_draft.content -> 'questions') with ordinality as question(value, ordinality)
  cross join lateral jsonb_array_elements(question.value -> 'options') with ordinality as option(value, ordinality);

  update public.quiz_event_drafts
  set live_version_number = v_next_version,
      last_published_at = v_published_at,
      last_published_by = p_actor_user_id,
      archived_at = null,
      archived_by = null
  where id = v_draft.id
  returning *
  into v_updated_draft;

  insert into public.quiz_event_live_transitions (
    event_id,
    action,
    version_number,
    actor_user_id,
    details,
    created_at
  )
  values (
    v_draft.id,
    'publish',
    v_next_version,
    p_actor_user_id,
    jsonb_build_object('source', v_source, 'slug', v_draft.slug),
    v_published_at
  );

  return query
  select
    v_draft.id,
    v_next_version,
    v_published_at,
    p_actor_user_id,
    v_updated_draft.live_version_number,
    v_updated_draft.updated_at;
end;
$$;

create or replace function public.archive_quiz_event(
  p_event_id text,
  p_expected_live_version_number integer,
  p_actor_user_id uuid,
  p_source text default 'admin_ui'
)
returns table (
  event_id text,
  archived_at timestamptz,
  archived_by uuid,
  live_version_number integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_draft public.quiz_event_drafts%rowtype;
  v_updated_draft public.quiz_event_drafts%rowtype;
  v_archived_at timestamptz := now();
  v_source text := coalesce(nullif(btrim(p_source), ''), 'admin_ui');
begin
  if v_source not in ('admin_ui', 'ai_mcp') then
    raise exception 'invalid_source';
  end if;

  if p_expected_live_version_number is null
    or p_expected_live_version_number <= 0 then
    raise exception 'invalid_expected_live_version';
  end if;

  select *
  into v_draft
  from public.quiz_event_drafts
  where id = p_event_id
  for update;

  if not found then
    raise exception 'draft_not_found';
  end if;

  if v_draft.live_version_number is distinct from p_expected_live_version_number then
    raise exception 'stale_live_version';
  end if;

  update public.quiz_events
  set published_at = null,
      updated_at = now()
  where id = v_draft.id
    and published_at is not null;

  if not found then
    raise exception 'live_event_not_found';
  end if;

  update public.quiz_event_drafts
  set archived_at = v_archived_at,
      archived_by = p_actor_user_id
  where id = v_draft.id
  returning *
  into v_updated_draft;

  insert into public.quiz_event_live_transitions (
    event_id,
    action,
    version_number,
    actor_user_id,
    details,
    created_at
  )
  values (
    v_draft.id,
    'archive',
    v_draft.live_version_number,
    p_actor_user_id,
    jsonb_build_object('source', v_source, 'slug', v_draft.slug),
    v_archived_at
  );

  return query
  select
    v_draft.id,
    v_archived_at,
    p_actor_user_id,
    v_updated_draft.live_version_number,
    v_updated_draft.updated_at;
end;
$$;

revoke all on function public.publish_quiz_event_draft(text, timestamptz, uuid, text)
  from public;
revoke all on function public.archive_quiz_event(text, integer, uuid, text)
  from public;
revoke all on function public.publish_quiz_event_draft(text, timestamptz, uuid, text)
  from anon, authenticated;
revoke all on function public.archive_quiz_event(text, integer, uuid, text)
  from anon, authenticated;

grant execute on function public.publish_quiz_event_draft(text, timestamptz, uuid, text)
  to service_role;
grant execute on function public.archive_quiz_event(text, integer, uuid, text)
  to service_role;
