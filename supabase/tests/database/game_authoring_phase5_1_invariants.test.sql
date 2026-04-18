begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select ok(
  exists(
    select 1
    from public.game_events
    where id = 'madrona-music-2026'
      and published_at is not null
  ),
  'featured published event exists after local migration reset'
);

select ok(
  exists(
    select 1
    from public.game_events
    where id = 'madrona-sponsor-spotlight-2026'
      and published_at is not null
  ),
  'second published event exists after local migration reset'
);

select ok(
  exists(
    select 1
    from public.game_event_drafts
    where id = 'madrona-music-2026'
  ),
  'featured published event has a corresponding authoring draft row'
);

select ok(
  exists(
    select 1
    from public.game_event_drafts
    where id = 'madrona-sponsor-spotlight-2026'
  ),
  'second published event has a corresponding authoring draft row'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.game_event_drafts'::regclass),
  'game_event_drafts keeps row level security enabled'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.admin_users'::regclass),
  'admin_users keeps row level security enabled'
);

select ok(
  not has_table_privilege('authenticated', 'public.admin_users', 'SELECT'),
  'authenticated cannot read admin_users directly'
);

select ok(
  has_function_privilege('service_role', 'public.publish_game_event_draft(text, uuid)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.unpublish_game_event(text, uuid)', 'EXECUTE'),
  'service_role can execute publish and unpublish RPCs used by admin workflows'
);

select * from finish();
rollback;
