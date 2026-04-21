-- Reward redemption Phase A.2a: reverse_entitlement_redemption RPC.
--
-- Mirrors the redeem RPC's contract and trust boundary but flips the
-- transition direction (redeemed -> unredeemed) and uses the organizer
-- authorization helper instead of the agent helper. The inline
-- redeemed_* columns are cleared on reversal so a subsequent redeem
-- starts from a clean 'unredeemed' shape that satisfies the A.1 shape
-- check; the redemption_reversed_* columns capture only the most
-- recent cycle (parent design checklist item 4). The optional reason
-- is stored verbatim in redemption_note; A.2a does not validate reason
-- length or content.
create or replace function public.reverse_entitlement_redemption(
  p_event_id text,
  p_code_suffix text,
  p_reason text default null
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

  if not (public.is_organizer_for_event(p_event_id) or v_is_root) then
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

  if v_entitlement.redemption_status = 'unredeemed' then
    return jsonb_build_object(
      'outcome', 'success',
      'result', 'already_unredeemed'
    );
  end if;

  update public.game_entitlements
     set redemption_status = 'unredeemed',
         redeemed_at = null,
         redeemed_by = null,
         redeemed_by_role = null,
         redeemed_event_id = null,
         redemption_reversed_at = now(),
         redemption_reversed_by = v_user_id,
         redemption_reversed_by_role = case when v_is_root then 'root_admin' else 'organizer' end,
         redemption_note = p_reason
   where id = v_entitlement.id
   returning * into v_entitlement;

  return jsonb_build_object(
    'outcome', 'success',
    'result', 'reversed_now',
    'reversed_at', v_entitlement.redemption_reversed_at,
    'reversed_by_role', v_entitlement.redemption_reversed_by_role
  );

exception when others then
  raise log 'reverse_entitlement_redemption failed: % (event=%, suffix=%)',
    sqlerrm, p_event_id, p_code_suffix;
  return jsonb_build_object(
    'outcome', 'failure',
    'result', 'internal_error'
  );
end;
$$;

revoke all on function public.reverse_entitlement_redemption(text, text, text) from public;
grant execute on function public.reverse_entitlement_redemption(text, text, text)
  to anon, authenticated, service_role;
-- See redeem_entitlement_by_code migration for the rationale on granting
-- execute to anon (null-JWT guard + Supabase baseline consistency).
