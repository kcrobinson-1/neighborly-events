-- Reward redemption Phase A.2a: redeem_entitlement_by_code RPC.
--
-- Trusted mutation path for marking an entitlement redeemed. Runs as
-- SECURITY DEFINER so the authorization helpers (is_agent_for_event,
-- is_root_admin) gate the write regardless of the caller's RLS scope.
-- Row-level locking serializes concurrent redeems on the same entitlement.
-- The event_id scope on the lookup turns cross-event codes into not_found
-- without leaking which other event owns the suffix (parent design
-- checklist item 6).
--
-- Envelope: { outcome: 'success' | 'failure', result: <code>, ... }.
-- Implementation detail (exact verification_code match via event_code
-- lookup rather than LIKE) is the only guard against wildcard characters
-- in p_code_suffix reaching the row store; the Edge Function wrapper in
-- A.2b is the primary input-shape validator.
create or replace function public.redeem_entitlement_by_code(
  p_event_id text,
  p_code_suffix text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := public.current_request_user_id();
  v_is_root boolean;
  v_event_code text;
  v_entitlement public.game_entitlements%rowtype;
begin
  if v_user_id is null then
    return jsonb_build_object(
      'outcome', 'failure',
      'result', 'not_authorized'
    );
  end if;

  v_is_root := public.is_root_admin();

  if not (public.is_agent_for_event(p_event_id) or v_is_root) then
    return jsonb_build_object(
      'outcome', 'failure',
      'result', 'not_authorized'
    );
  end if;

  select event_code into v_event_code
    from public.game_events
   where id = p_event_id;

  if v_event_code is null then
    return jsonb_build_object(
      'outcome', 'failure',
      'result', 'not_found'
    );
  end if;

  select *
    into v_entitlement
    from public.game_entitlements
   where event_id = p_event_id
     and verification_code = v_event_code || '-' || p_code_suffix
   for update;

  if not found then
    return jsonb_build_object(
      'outcome', 'failure',
      'result', 'not_found'
    );
  end if;

  if v_entitlement.redemption_status = 'redeemed' then
    return jsonb_build_object(
      'outcome', 'success',
      'result', 'already_redeemed',
      'redeemed_at', v_entitlement.redeemed_at,
      'redeemed_by_role', v_entitlement.redeemed_by_role
    );
  end if;

  update public.game_entitlements
     set redemption_status = 'redeemed',
         redeemed_at = now(),
         redeemed_by = v_user_id,
         redeemed_by_role = case when v_is_root then 'root_admin' else 'agent' end,
         redeemed_event_id = event_id
   where id = v_entitlement.id
   returning * into v_entitlement;

  return jsonb_build_object(
    'outcome', 'success',
    'result', 'redeemed_now',
    'redeemed_at', v_entitlement.redeemed_at,
    'redeemed_by_role', v_entitlement.redeemed_by_role
  );

exception when others then
  raise log 'redeem_entitlement_by_code failed: % (event=%, suffix=%)',
    sqlerrm, p_event_id, p_code_suffix;
  return jsonb_build_object(
    'outcome', 'failure',
    'result', 'internal_error'
  );
end;
$$;

revoke all on function public.redeem_entitlement_by_code(text, text) from public;
revoke execute on function public.redeem_entitlement_by_code(text, text)
  from service_role;
grant execute on function public.redeem_entitlement_by_code(text, text)
  to anon, authenticated;
-- service_role execute is revoked deliberately: the RPC is authenticated
-- by the JWT sub + assignment-backed helpers, so a service-role client
-- (no user JWT forwarded) would fall through to not_authorized even with
-- the grant. Edge Function wrappers in A.2b must create their Supabase
-- client with the caller's bearer token forwarded so current_request_user_id
-- resolves to the real agent or organizer. Admin debugging from the SQL
-- editor can still exercise the RPC by setting request.jwt.claims via
-- set_config (see supabase/tests/database/redemption_rpc.test.sql for the
-- pattern). anon is granted execute because the null-JWT guard makes that
-- path safe and it matches the A.1 helper grants.
