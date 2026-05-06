---
name: event-code-and-slug locks survive unpublish — scoping
description: Class-of-solution scoping for the Tier 1 backlog item where slug + event_code locks remain enforced after unpublish, blocking organizer self-service rotation.
type: scoping
status: Draft
---

# Event-code and slug locks survive unpublish — scoping

## Status

Draft. This scoping doc resolves the Tier 1 backlog entry "Event-code
and slug locks survive unpublish (organizer UX gap)" in
[`docs/backlog.md`](/docs/backlog.md). Once decisions land here, the
follow-up plan ships as a standard fix PR; no epic structure.

## Problem

`game_event_draft_event_code_lock` and `game_event_draft_slug_lock`
fire on `old.last_published_version_number is not null`
([20260423010000_rename_live_version_number_to_last_published_version_number.sql:11-29](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql)).
That column is set on first publish
([:198](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql))
and **never cleared** —
`unpublish_game_event` ([:232-291](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql))
only nulls `game_events.published_at` and writes an audit row.

Net effect: once an event publishes, slug and event_code are
immutable forever, even after unpublish, even with zero
entitlements ever issued. The same pre-check sits in the Edge
Function path
([save-draft/index.ts:97-124](/supabase/functions/save-draft/index.ts)),
so the lock surfaces uniformly across PostgREST and the Edge.

Live evidence: Madrona M2 phase 2.1 close-out (2026-05-06) needed a
`MAD → MIP` event-code rotation on a beta event with one stale
unredeemed entitlement. The trigger blocked it; the operator
resolved via service-role
`update game_event_drafts set last_published_version_number = null`
followed by re-seed. The escape hatch is engineer-mediated SQL,
which is the gap.

## Why locking-while-live is still desirable

Locking is not vestigial. While an event is live:

- Entitlement `verification_code` values are stamped as
  `<event_code>-NNNN` at issue time
  ([20260418070000_rewrite_verification_code_generator.sql:155-198](/supabase/migrations/20260418070000_rewrite_verification_code_generator.sql)).
  Changing event_code mid-event makes already-issued codes
  unreachable through the redeem RPCs (see "What rotation does
  to unredeemed entitlements" below).
- Slug rotation while live breaks any QR / link / SMS already
  distributed.

The invariant the locks should enforce is **"locked while currently
live,"** not "locked forever after the first publish." The current
trigger is a strict superset.

## What rotation does to unredeemed entitlements

Slug and event_code have different entitlement coupling. An earlier
draft of this section asserted both were safe to rotate
post-unpublish; that was wrong on event_code. Codex review on PR
#207 caught the error; correcting here.

**Slug rotation is operationally safe.** Slug appears nowhere in
`game_entitlements` and is not a key into the redeem or reverse
RPCs. After unpublish, the only artifacts referencing the old slug
are external (QR codes, links, SMS). Changing the slug strands
those external artifacts but does not strand any DB row — every
existing entitlement is still reachable through the same RPCs
under the new slug.

**Event_code rotation strands unredeemed entitlements.** The redeem
and reverse RPCs do not look up by stored `verification_code`
directly. Each reads the *current* `event_code` from `game_events`
for the matching `id` and constructs the lookup as
`<current_event_code>-<suffix>`
([redeem_entitlement_by_code:47-62](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql),
[reverse_entitlement_redemption:44-59](/supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql)).
After rotating event_code from `MAD` to `MIP`, an entitlement
stored as `verification_code='MAD-0001'` no longer matches the
constructed key `MIP-0001`; the RPC returns `not_found`. The
existing rows are not deleted; they are unreachable through the
redeem path.

The Madrona MAD → MIP evidence cited in the Problem section was
misread. The operator manually cleared
`last_published_version_number`, rotated the code, and **re-seeded
the test entitlement under the new prefix**. The re-seed is
consistent with the strand behavior, not with the safety the
earlier draft inferred.

## Class-of-solution options

### (a) Clear `last_published_version_number` on unpublish

Make `unpublish_game_event` set
`game_event_drafts.last_published_version_number = null`. Trigger
WHEN clauses then read as "locked while currently live" by
construction; no trigger logic changes.

**Why rejected:** the column was renamed from `live_version_number`
to `last_published_version_number` on 2026-04-23 ([:1-9](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql))
specifically to *stop* implying "currently live" semantics. The
header comment on that migration:

> "Rename the historical publish pointer so admin/UI code stops
> implying 'currently live' semantics from a field that only tracks
> the last publish."

Clearing the column on unpublish reintroduces exactly the conflation
the rename corrected. Downstream consumers depend on the historical
reading: `hasBeenPublished: row.last_published_version_number !== null`
([shared/events/admin.ts:93](/shared/events/admin.ts), and parallel sites
in [save-draft:450](/supabase/functions/save-draft/index.ts) and
[read-demo-event:106](/supabase/functions/read-demo-event/index.ts)). After (a), `hasBeenPublished` would be a lie post-unpublish.
The admin status view's `first_published_at` derivation
([20260423020000_add_game_event_admin_status_view.sql:4-9](/supabase/migrations/20260423020000_add_game_event_admin_status_view.sql))
queries `game_event_versions` directly and would still resolve
correctly — but every other consumer of the column would need to
flip its mental model. Net: large semantic blast radius for a
small mechanical win.

### (b) Trigger reads `game_events.published_at` directly

Move the live-state check out of the trigger's `WHEN` clause and
into the trigger function body, where it can `EXISTS`-probe
`public.game_events` for `published_at is not null` on the matching
`id` and raise `event_code_locked` / `slug_locked` accordingly. The
trigger fires unconditionally on the column being distinct; the
function returns early when the event is not currently live. Locks read as "while currently live" by construction. Cost: one
extra index probe per draft update where the column is changing
(rare path; drafts typically update content, not slug/code).
`last_published_version_number` keeps its historical meaning.

Application-layer mirror in
[save-draft/index.ts:97-124](/supabase/functions/save-draft/index.ts)
needs the same shift: select `published_at` from `game_events`
joined to the draft row instead of reading
`last_published_version_number`.

### (c) Admin-only escape-hatch RPC

Add `admin_unlock_event_code(event_id)` /
`admin_unlock_event_slug(event_id)`, scoped to "no entitlements
redeemed yet" (or similar guard). Organizer flow stays blocked;
root admin or operator unlocks on demand.

**Why rejected as primary for slug:** the backlog item is explicitly
an *organizer UX gap*. (c) leaves the gap and adds operator
surface. For event_code, a "zero entitlements" guard re-emerges as
sub-option (b3) below, framed as a guard on the relaxed trigger
rather than a separate RPC.

## Decision: (b) for slug; event_code requires resolving redeem-RPC coupling

Slug ships under option (b) as scoped: trigger reads
`game_events.published_at`. Bounded migration scope; no entitlement
side-effect; restores the organizer UX without a new RPC.

Event_code does **not** ship under (b) alone, because (b) on its
own silently strands every unredeemed entitlement on the event the
moment an organizer rotates the code. The choice for event_code is
a sub-decision that needs organizer-input on whether mid-cycle
rotation is a feature or an organizer-error to prevent:

- **(b1) Relax trigger; accept stranding; surface a confirmation
  in the organizer UI naming the count of pending entitlements
  about to become unreachable.** Lowest migration scope. Trades
  database safety for UX warning. Risk: organizer click-throughs
  the warning and strands real attendees.
- **(b2) Relax trigger AND change the redeem and reverse RPCs to
  look up by stored `verification_code` directly,** dropping the
  current-event_code reconstruction. Restores prefix-independence;
  every previously issued code keeps redeeming. Touches the
  trust-boundary RPCs and their pgTAP coverage; widest migration
  scope. Cleanest invariant.
- **(b3) Relax trigger only when the event has zero
  entitlements.** Strict guard expressed in the trigger function.
  Covers the Madrona pre-launch use case (rotate brand label
  before any real attendee enrolls); blocks any rotation once
  test or real entitlements exist. Smallest blast radius; doesn't
  generalize to mid-cycle rotation if that ever becomes a need.

This scoping does not pick among (b1)/(b2)/(b3). That belongs in a
follow-up scoping pass once we know whether mid-cycle event_code
rotation is a real organizer need or a footgun to prevent. The
slug fix does not depend on the event_code resolution.

## Open questions for the slug fix

1. **Concurrency: republish race vs. concurrent draft update.**
   Operator unpublishes; organizer changes slug; another operator
   republishes. Trigger reads `published_at` at trigger time, so
   serialization is by row lock on `game_event_drafts` (the
   UPDATE) and a non-locking read on `game_events`. Worst case:
   organizer's update commits before republish; the republish
   ships the new slug. Acceptable. The plan should state this
   explicitly and not add cross-table locking.

2. **Edge Function pre-check: pre-check or rely on trigger?**
   The Edge pre-check exists so the API returns a structured
   error before the DB raises. The plan keeps the pre-check —
   shift it to read `game_events.published_at` for parity. The
   trigger remains the durable enforcement.

3. **Test surface.** pgTAP tests for the slug trigger: live →
   locked, unpublished → unlocked, never-published → unlocked.
   Existing `event_code_data_model.test.sql` covers event_code;
   slug coverage may need a sibling file or section. Plan should
   pick.

## Plan handoff

**This scoping resolves slug only.** Event_code is deferred to a
follow-up scoping pass that picks among (b1)/(b2)/(b3) above.

The slug fix PR should:

- Add a migration that recreates `enforce_game_event_draft_slug_lock`
  with the cross-table read on `game_events.published_at` and
  updates the trigger's `WHEN` to drop the
  `last_published_version_number` predicate. Leave the event_code
  trigger untouched pending the follow-up scoping.
- Update the slug pre-check in
  [save-draft/index.ts:97-124](/supabase/functions/save-draft/index.ts)
  to query `game_events.published_at`. Leave the event_code
  pre-check untouched.
- Add pgTAP coverage for the slug trigger: live → locked,
  unpublished → unlocked, never-published → unlocked.
- No frontend changes; the existing organizer UX surfaces the
  trigger's structured error already.
- Backlog entry stays in place; revise the entry text to reflect
  that slug is fixed and event_code is pending the follow-up
  scoping.

Estimated size: one migration + one Edge Function patch + three
pgTAP cases. One PR.

**Event_code follow-up scoping** lives as a separate doc once
organizer input clarifies whether mid-cycle event_code rotation is
a feature (drives toward b2) or an organizer-error to prevent
(drives toward b3).
