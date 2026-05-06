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
([20260423010000_rename_live_version_number_to_last_published_version_number.sql:11-29](supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql)).
That column is set on first publish
([:198](supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql))
and **never cleared** —
`unpublish_game_event` ([:232-291](supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql))
only nulls `game_events.published_at` and writes an audit row.

Net effect: once an event publishes, slug and event_code are
immutable forever, even after unpublish, even with zero
entitlements ever issued. The same pre-check sits in the Edge
Function path
([save-draft/index.ts:97-124](supabase/functions/save-draft/index.ts)),
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
  ([20260418070000_rewrite_verification_code_generator.sql:155-198](supabase/migrations/20260418070000_rewrite_verification_code_generator.sql)).
  Changing event_code mid-event would not invalidate already-issued
  codes (they remain a literal column value), but printed/scanned
  attendee artifacts referencing the old prefix would diverge from
  newly-generated codes — operationally messy.
- Slug rotation while live breaks any QR / link / SMS already
  distributed.

The invariant the locks should enforce is **"locked while currently
live,"** not "locked forever after the first publish." The current
trigger is a strict superset.

## Why post-unpublish rotation is safe

After unpublish:

- `game_events.published_at` is `null`, so attendee surfaces 404
  the slug ([read-demo-event](supabase/functions/read-demo-event/index.ts)
  and the SPA event routes gate on live state).
- Already-issued `<old_code>-NNNN` entitlements remain redeemable
  by exact `verification_code` match — redemption looks up by
  `(event_id, verification_code)`
  ([20260421000300_add_redeem_entitlement_rpc.sql:47-62](supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)),
  so prefix change does not strand them. Confirmed by the
  Madrona MAD → MIP rotation: the stale entitlement remained
  redeemable through the manual workaround.
- `game_entitlements_event_code_unique` is `(event_id,
  verification_code)`
  ([20260418070000:62-63](supabase/migrations/20260418070000_rewrite_verification_code_generator.sql)),
  so old + new prefix can coexist on one event_id without collision.

So the constraint "live = locked, unpublished = unlocked"
is operationally sound.

## Class-of-solution options

### (a) Clear `last_published_version_number` on unpublish

Make `unpublish_game_event` set
`game_event_drafts.last_published_version_number = null`. Trigger
WHEN clauses then read as "locked while currently live" by
construction; no trigger logic changes.

**Why rejected:** the column was renamed from `live_version_number`
to `last_published_version_number` on 2026-04-23 ([:1-9](supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql))
specifically to *stop* implying "currently live" semantics. The
header comment on that migration:

> "Rename the historical publish pointer so admin/UI code stops
> implying 'currently live' semantics from a field that only tracks
> the last publish."

Clearing the column on unpublish reintroduces exactly the conflation
the rename corrected. Downstream consumers depend on the historical
reading: `hasBeenPublished: row.last_published_version_number !== null`
([shared/events/admin.ts:93](shared/events/admin.ts), and parallel sites
in [save-draft:450](supabase/functions/save-draft/index.ts) and
[read-demo-event:106](supabase/functions/read-demo-event/index.ts)). After (a), `hasBeenPublished` would be a lie post-unpublish.
The admin status view's `first_published_at` derivation
([20260423020000_add_game_event_admin_status_view.sql:4-9](supabase/migrations/20260423020000_add_game_event_admin_status_view.sql))
queries `game_event_versions` directly and would still resolve
correctly — but every other consumer of the column would need to
flip its mental model. Net: large semantic blast radius for a
small mechanical win.

### (b) Trigger reads `game_events.published_at` directly

Replace the WHEN-clause column check with a function-body cross-table
read:

```sql
create or replace function public.enforce_game_event_draft_event_code_lock()
returns trigger language plpgsql as $$
begin
  if new.event_code is distinct from old.event_code
     and exists (
       select 1 from public.game_events
       where id = new.id and published_at is not null
     ) then
    raise exception 'event_code_locked' using detail = '...';
  end if;
  return new;
end;
$$;
create trigger ... before update ... for each row
  execute function public.enforce_game_event_draft_event_code_lock();
```

Locks read as "while currently live" by construction. Cost: one
extra index probe per draft update where the column is changing
(rare path; drafts typically update content, not slug/code).
`last_published_version_number` keeps its historical meaning.

Application-layer mirror in
[save-draft/index.ts:97-124](supabase/functions/save-draft/index.ts)
needs the same shift: select `published_at` from `game_events`
joined to the draft row instead of reading
`last_published_version_number`.

### (c) Admin-only escape-hatch RPC

Add `admin_unlock_event_code(event_id)` /
`admin_unlock_event_slug(event_id)`, scoped to "no entitlements
redeemed yet" (or similar guard). Organizer flow stays blocked;
root admin or operator unlocks on demand.

**Why rejected as primary:** the backlog item is explicitly an
*organizer UX gap*. (c) leaves the gap and adds operator surface.
The "no entitlements redeemed" guard is also stricter than the
operational reality (Madrona rotation succeeded *with* a stale
unredeemed entitlement). Reasonable as a defense-in-depth
follow-up if (b) ever proves too permissive, but doesn't solve
the user-facing problem.

## Decision: (b) Trigger reads `game_events.published_at`

Restores correct semantics with bounded surface:

- Two trigger functions changed (`enforce_game_event_draft_event_code_lock`,
  `enforce_game_event_draft_slug_lock`).
- WHEN clauses simplify (drop the `last_published_version_number`
  predicate; keep only `is distinct from`).
- One Edge-Function pre-check shifted to read live state.
- `last_published_version_number` semantics preserved — downstream
  `hasBeenPublished` consumers untouched.
- No new RPC, no admin surface.

## Open questions for the plan

1. **Should "live + has unredeemed entitlements" stay locked?**
   Live state already locks (no change). Unpublished state with
   stale entitlements unlocks. Answer per Madrona evidence:
   unlocked is correct. Plan should not add an entitlement-count
   guard.

2. **Concurrency: republish race vs. concurrent draft update.**
   Operator unpublishes; organizer changes code; another operator
   republishes. Trigger reads `published_at` at trigger time, so
   serialization is by row lock on `game_event_drafts` (the
   UPDATE) and a non-locking read on `game_events`. Worst case:
   organizer's update commits before republish; new entitlements
   get the new prefix. Acceptable. The plan should state this
   explicitly and not add cross-table locking.

3. **Edge Function pre-check: pre-check or rely on trigger?**
   The Edge pre-check exists so the API returns a structured
   error before the DB raises. The plan keeps the pre-check —
   shift it to read `game_events.published_at` for parity. The
   trigger remains the durable enforcement.

4. **Test surface.** pgTAP tests for the trigger: live → locked,
   unpublished → unlocked, never-published → unlocked. Existing
   `event_code_data_model.test.sql` is the home; add cases rather
   than a new file.

## Plan handoff

The fix PR should:

- Add a new migration `<date>_relax_lock_to_currently_live.sql`
  that recreates both `enforce_*_lock` functions with the
  cross-table read and updates the triggers' WHEN clauses.
- Update [save-draft/index.ts:91-124](supabase/functions/save-draft/index.ts)
  to query `game_events.published_at` for the live check.
- Add pgTAP coverage in
  [supabase/tests/database/event_code_data_model.test.sql](supabase/tests/database/event_code_data_model.test.sql)
  and the slug equivalent for the unpublish-then-rotate case.
- No frontend changes; the existing organizer UX surfaces the
  trigger's structured error already.
- Backlog entry deletes from `docs/backlog.md` Tier 1 in the same
  PR per the "remove on landing" rule.

Estimated size: one migration + one Edge Function patch + two
pgTAP cases. One PR.
