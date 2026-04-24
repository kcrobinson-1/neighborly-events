-- Rename the historical publish pointer so admin/UI code stops implying
-- "currently live" semantics from a field that only tracks the last publish.

alter table public.game_event_drafts
  rename column live_version_number to last_published_version_number;

alter table public.game_event_drafts
  rename constraint game_event_drafts_live_version_number_positive
  to game_event_drafts_last_published_version_number_positive;

drop trigger if exists game_event_draft_slug_lock on public.game_event_drafts;
create trigger game_event_draft_slug_lock
  before update on public.game_event_drafts
  for each row
  when (
    old.last_published_version_number is not null
    and new.slug is distinct from old.slug
  )
  execute function public.enforce_game_event_draft_slug_lock();

drop trigger if exists game_event_draft_event_code_lock on public.game_event_drafts;
create trigger game_event_draft_event_code_lock
  before update on public.game_event_drafts
  for each row
  when (
    old.last_published_version_number is not null
    and new.event_code is distinct from old.event_code
  )
  execute function public.enforce_game_event_draft_event_code_lock();

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
    event_code,
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
    v_draft.event_code,
    v_draft.name,
    v_content ->> 'location',
    (v_content ->> 'estimatedMinutes')::integer,
    v_content ->> 'entitlementLabel',
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
    event_code = excluded.event_code,
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
    last_published_version_number = v_next_version,
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
    v_draft.last_published_version_number,
    jsonb_build_object('slug', v_draft.slug),
    v_unpublished_at
  );

  return query
  select
    v_draft.id,
    v_unpublished_at;
end;
$$;
