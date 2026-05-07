---
name: event-code rotation safety — phase 2 scoping
description: Phase 2 scoping for the Tier 1 unpublish-locks parent. Resolves the design space for relaxing the event_code lock without silently stranding unredeemed entitlements. Decision deferred pending product call on whether mid-cycle rotation is a feature or a footgun.
type: scoping
status: Draft
---

# Event-code rotation safety — phase 2 scoping

## Status

Draft. **Phase 2 scoping (event_code only)** for the Tier 1
backlog entry "Event-code and slug locks survive unpublish
(organizer UX gap)" in [`docs/backlog.md`](/docs/backlog.md). The
backlog entry is the parent that holds the full picture.

Phase 1 (slug) is scoped at
[`docs/plans/event-code-slug-unpublish-locks.md`](/docs/plans/event-code-slug-unpublish-locks.md)
and ships independently — slug has no entitlement coupling and
the two phases share no implementation surface.

This doc resolves what phase 2 needs to know about the design
space. **It does not pick a sub-option** — that requires a
product call on open question (iii) (feature-vs-footgun) that
this scoping pass cannot make. When (iii) resolves, this doc
moves to Active and picks the sub-option; the implementation
handoff is then a single follow-up PR.

## Problem (carryover from phase 1)

The redeem and reverse RPCs construct lookup keys as
`<current_event_code>-<suffix>`
([redeem_entitlement_by_code:47-62](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql),
[reverse_entitlement_redemption:44-59](/supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql)).
Rotating event_code from `MAD` to `MIP` after entitlements have
been issued under the `MAD` prefix makes those entitlements
unreachable through the redeem path — the row still exists with
`verification_code='MAD-0001'`, but the RPC builds `MIP-0001`
and returns `not_found`.

Phase 1 scoping discovered this; the doc was reshaped
accordingly. Phase 2 has to resolve the design space the
discovery opened up.

## Findings — open question (i): security rationale

The redeem RPC migration header cites the `<event_code>-<suffix>`
construction as "the only guard against wildcard characters in
`p_code_suffix` reaching the row store"
([20260421000300:11-15](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)).

Adversarial read: the actual wildcard guard is the `=` operator
(versus `LIKE`). The prefix construction is a literal string
concat that `=` matches against; it doesn't gate wildcard
expansion — `=` already does that, regardless of what string
sits on the right side. The prefix bound is doing **namespacing**
(suffix `0001` matches only this event's MAD-0001, not any row
ending in `-0001`), but `event_id = p_event_id` already provides
that namespace. Confirmed by `game_entitlements_event_code_unique`
being `(event_id, verification_code)`
([20260418070000:62-63](/supabase/migrations/20260418070000_rewrite_verification_code_generator.sql)).

So the migration header's framing is mildly misleading: any RPC
shape that uses `=` (not `LIKE`) preserves the wildcard guard.
The choice between "match `<current_event_code>-<suffix>`" and
"match stored `verification_code` directly" is a correctness/UX
question, not a security question. The Edge Function wrapper's
input-shape validation
([redeem-entitlement/index.ts:121](/supabase/functions/redeem-entitlement/index.ts) —
`^[0-9]{4}$`) is the primary input-shape defense and stays under
any sub-option.

## Findings — open question (ii): printed-card / operator flow shape

The printed/scanned artifact carries the full `<EVENT_CODE>-NNNN`
form (e.g. `MAD-0001`). The redemption operator UI keypad **only
captures the 4-digit suffix**
([redeem/useRedeemKeypadState.ts:20-21](/apps/web/src/redeem/useRedeemKeypadState.ts) —
`/^\d{4}$/.test(codeSuffix)`); the prefix on the printed card is
informational. The Edge Function wrapper validates
`^[0-9]{4}$`
([redeem-entitlement/index.ts:121](/supabase/functions/redeem-entitlement/index.ts))
and passes that suffix to the RPC.

Implication for phase 2: any sub-option that wants prefix-aware
redemption after a rotation must change the keypad input flow or
carry the prefix server-side from somewhere it already knows it.
The keypad today gives the operator no place to indicate which
prefix a card was issued under. The (b2) variants below have to
address this directly.

The verification_code generator
([20260418070000:14-22](/supabase/migrations/20260418070000_rewrite_verification_code_generator.sql))
draws a random 4-digit suffix per insert (not a per-event
sequence). On a single event_id, after rotation, the same
suffix can legitimately appear under two prefixes — e.g.
`MAD-0001` issued pre-rotation and `MIP-0001` randomly drawn
post-rotation. The unique constraint allows both because they
are distinct verification_code values. Any "ignore prefix and
match by suffix only" lookup is non-deterministic in that case.

## Open question (iii) — product call needed

**Is mid-cycle event_code rotation a feature or an
organizer-error to prevent?**

- **Feature:** organizers might legitimately need to rotate a
  code mid-event (sponsor change, brand update). The
  post-rotation system must keep all already-printed codes
  working, which forces (b2a) below — wrapper accepts full
  code, keypad UI changes, RPC matches stored verification_code
  verbatim.
- **Footgun:** organizers should rotate event_code only before
  any attendee artifact has been printed/distributed. Mid-cycle
  rotation is operator error. The system can either prevent it
  (b3 — relax trigger only when zero entitlements exist) or warn
  loudly (b1 — relax trigger + UI confirmation showing pending
  entitlement count).

The Madrona MAD → MIP evidence is consistent with **footgun**:
the rotation happened on a beta event with one stale unredeemed
test entitlement that the operator re-seeded under the new
prefix; not a real attendee, no real printed card to invalidate.
But that's one data point on an internal beta event; product
input is what makes the call.

This scoping doc waits on (iii). The Decision section below is
empty until it resolves.

## Sub-option analysis

### (b1) Relax trigger + UI confirmation

**Footgun-shape solution.** Trigger relaxes per phase 1 pattern
(function-body `EXISTS`-probe on `game_events.published_at`).
Organizer UI surfaces "rotating event_code will make N pending
entitlement codes unreachable, continue?" before allowing the
change.

- Migration scope: small (one trigger function).
- UI scope: medium (count query against `game_entitlements`,
  confirmation modal, copy with stranded-count).
- Implementation risk: low.
- Tradeoff: organizer can click-through and strand real cards.
  Acceptable if organizer is trusted to read the warning;
  unacceptable if cards are mass-printed before the organizer
  would notice.

### (b2a) Relax trigger + change RPC and keypad to use full code

**Feature-shape solution.** Trigger relaxes. Edge Function
wrapper accepts the full `[A-Z]{3}-[0-9]{4}` code; RPC matches
`verification_code = p_full_code`. Keypad UI changes from
4-digit-only to full-code entry (or the keypad still captures
suffix and the UI joins it with a per-card prefix hint surfaced
by the printed artifact).

- Migration scope: medium (RPC signature change, wrapper
  validation, keypad component).
- Trust-boundary RPC change requires pgTAP coverage refresh.
- Tradeoff: cleanest invariant — rotation never strands, every
  printed code keeps redeeming. Highest implementation surface.
  Changes operator muscle memory.

### (b2b) Relax trigger + RPC fallback lookup

**Hybrid.** Trigger relaxes. Wrapper still passes suffix; RPC
tries `<current_event_code>-<suffix>` first; on `not_found`,
falls back to looking for any verification_code on this event_id
ending in `-<suffix>`.

- Generator's randomness (see (ii)) creates non-zero probability
  that the same suffix exists under two prefixes on the same
  event_id, making fallback non-deterministic.
- Possible mitigation: fallback succeeds only when exactly one
  row matches; otherwise return a structured `ambiguous_code`
  error.
- Migration scope: small (RPC change only). UI unchanged.
- Tradeoff: small surface, but fallback ambiguity is an
  unprincipled corner — operationally rare but not impossible,
  and hard to defend in a security review.

### (b3) Relax trigger only when zero entitlements exist

**Strict footgun-shape solution.** Trigger relaxes only when
`not exists (select 1 from game_entitlements where event_id =
new.id)`. The Madrona pre-launch case (rotate brand label before
any entitlement issued) succeeds; any rotation after the first
entitlement is issued blocks at the trigger with a structured
error.

- Migration scope: smallest (one trigger function, one extra
  `EXISTS` probe).
- Tradeoff: blocks the Madrona case as it actually happened (one
  stale test entitlement made the rotation fail). Organizer
  must clear test entitlements before rotating, which they need
  a UI surface for — pushes work into authoring tooling.

## Decision: deferred pending (iii)

Cannot pick among (b1)/(b2a)/(b2b)/(b3) without an answer to
(iii). Cost ordering, given the findings above:

- **(b3)** cheapest if footgun-shape is acceptable AND
  organizers get a way to clear pre-launch test entitlements.
- **(b1)** mid-cost; trades safety for organizer UX flexibility.
- **(b2a)** most expensive but only fully safe option if
  mid-cycle rotation must work for printed/distributed cards.
- **(b2b)** small surface but unprincipled; not recommended.

## Plan handoff (empty until (iii) resolves)

Empty. When (iii) resolves:

1. This doc's Status moves to Active and the picked sub-option
   becomes the Decision.
2. The picked sub-option's implementation handoff becomes the
   plan (touchpoints, migration filename, test surface).
3. One PR ships the change; the backlog parent entry closes
   (both phases landed).

Until then, this scoping doc is parked in Draft. The parent
backlog entry remains open and is the durable surface for (iii)
to anyone asking why phase 2 hasn't scoped a decision yet.
