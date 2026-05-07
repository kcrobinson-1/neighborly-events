---
name: event-code rotation safety — phase 2 scoping
description: Phase 2 scoping for the Tier 1 unpublish-locks parent. Resolves the design space for relaxing the event_code lock without silently stranding unredeemed entitlements. Decision deferred pending a permissibility call: should the system explicitly block event_code changes after the event goes live, or allow them as a permissive side-effect that is undocumented and untested?
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

Implication for phase 2: a sub-option that wanted prefix-aware
redemption after a rotation would have to change the keypad
input flow or carry the prefix server-side from somewhere it
already knows it. The keypad today gives the operator no place
to indicate which prefix a card was issued under. This finding
contributed to rejecting "post-launch rotation as a feature"
from the active sub-option set (see "Considered and rejected"
below).

The verification_code generator
([20260418070000:14-22](/supabase/migrations/20260418070000_rewrite_verification_code_generator.sql))
draws a random 4-digit suffix per insert (not a per-event
sequence). On a single event_id, after rotation, the same
suffix can legitimately appear under two prefixes — e.g.
`MAD-0001` issued pre-rotation and `MIP-0001` randomly drawn
post-rotation. The unique constraint allows both because they
are distinct verification_code values. Any "ignore prefix and
match by suffix only" lookup is non-deterministic in that case.

## Open question (iii) — permissibility call needed

**Goal:** organizers must be able to change `event_code` *before*
the event goes live. That's the actual requirement; the Madrona
MAD → MIP rotation that triggered this whole backlog item is a
pre-launch case (beta event, one stale test entitlement, no real
attendee artifact to invalidate).

**Question:** do we *explicitly block* `event_code` changes
*after* the event goes live, or do we *allow them as a
permissive side-effect* because not handling that scenario is
simpler?

This is not a question about whether to support mid-cycle
rotation as a feature. No concrete use case for treating
post-launch rotation as a real, designed feature has been
identified at scoping time. The earlier framing of this question
manufactured a false design tension by reaching for
post-launch-feature scenarios that don't actually map to
`event_code`'s purpose (sponsor data lives on questions, brand
identity drives slug not event_code).

**The two real shapes:**

- **Strict.** Trigger refuses post-launch rotation. Pre-launch
  rotation works. The system actively prevents the risky case.
- **Permissive.** Trigger only checks "not currently live."
  Post-launch rotation succeeds; nobody designs or tests for it;
  if an organizer does it, codes silently break. Documented
  behavior: "don't rotate event_code after going live."

A third hedge — **Permissive + warning** — sits between them
and is worth naming because it's cheap.

This scoping doc waits on a call between Strict and Permissive.
The Decision section below is empty until it resolves.

## Sub-option analysis

### (S) Strict — block post-launch rotation when entitlements exist

Trigger relaxes only when no entitlements have been issued for
the event:
`not exists (select 1 from game_entitlements where event_id =
new.id)`. The Madrona-class pre-launch case (rotate brand label
before any entitlement is issued) succeeds; any rotation after
the first entitlement is issued raises a structured error
(e.g. `event_code_locked_by_entitlements`).

- Migration scope: smallest (one trigger function, one extra
  `EXISTS` probe vs. phase 1's slug pattern).
- pgTAP scope: add the entitlements-exist case alongside the
  phase 1 cases.
- Operator surface: organizer must clear test entitlements
  before rotating. That's a separate authoring UX concern; it
  pushes a small piece of work into the authoring surface.
- Tradeoff: blocks the Madrona-shape case as it actually
  happened (one stale test entitlement made rotation fail until
  manual cleanup). Acceptable if test-entitlement clearing is
  a normal pre-launch step.

### (P) Permissive — trigger only checks `published_at`

Trigger mirrors phase 1's slug pattern verbatim (function-body
`EXISTS`-probe on `game_events.published_at`). Pre-launch
rotation works. Post-launch rotation also succeeds and silently
strands every entitlement issued under the old prefix.

- Migration scope: cheapest (copy phase 1's pattern for the
  event_code trigger).
- pgTAP scope: phase-1-equivalent cases (live → locked,
  unpublished → unlocked, never-published → unlocked).
- Documented behavior: "do not rotate `event_code` after the
  event goes live; doing so will make already-issued codes
  unreachable through the redeem path."
- Tradeoff: untested path. If an organizer rotates post-launch,
  the system permits it with no warning and codes break.
  Recovery requires either restoring the prior `event_code` or
  the engineer-mediated SQL workaround that motivated phase 1.

### (P+W) Permissive + organizer UI warning

Same trigger as (P), plus the authoring UI surfaces "rotating
`event_code` after going live will make N pending entitlement
codes unreachable; continue?" before issuing the update.

- Migration scope: same as (P) (one trigger function).
- UI scope: medium (`game_entitlements` count query + a
  confirmation modal + copy).
- Tradeoff: same untested-path concern as (P), but with a
  guardrail at the moment the organizer would do the wrong
  thing. Click-through risk remains: organizer can blow past
  the warning. Better than silent.

## Considered and rejected: post-launch rotation as a feature

Earlier sub-option drafts proposed reshaping the redemption
RPCs and the operator keypad so that rotation never strands
codes — wrapper accepts full `[A-Z]{3}-[0-9]{4}` code, RPC
matches stored `verification_code` verbatim, keypad UX captures
or hints the prefix. Rejected from the active set because:

- No concrete use case requires it. The motivating Madrona
  evidence is a pre-launch case; sponsor / brand / tier
  scenarios I initially listed don't actually drive event_code
  rotation in this product (sponsor lives on questions, brand
  identity drives slug not event_code).
- Surface is large: trust-boundary RPC change with pgTAP
  coverage refresh, Edge Function wrapper input-shape
  redefinition, operator keypad rework.
- An RPC fallback variant (try current prefix, fall back to
  any-prefix-on-this-event-id) is non-deterministic given the
  random 4-digit suffix generator (see finding (ii)) — same
  suffix can legitimately exist under two prefixes on one
  event_id post-rotation.

Recorded here so a future scoping pass that re-encounters this
question doesn't have to re-derive it. If a real post-launch
rotation use case surfaces, this section is the starting brief
for a separate "event_code rotation as a feature" scoping pass.

## Decision: deferred pending (iii)

Cannot pick between (S), (P), and (P+W) without the
permissibility call. Cost ordering:

- **(S)** small migration; pgTAP adds one case; pushes a
  small piece of work into authoring UI for test-entitlement
  cleanup.
- **(P)** cheapest; relies on documentation and operator
  discipline to avoid the broken path.
- **(P+W)** same migration as (P) plus a UI confirmation
  surface; hedges the discipline reliance.

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
