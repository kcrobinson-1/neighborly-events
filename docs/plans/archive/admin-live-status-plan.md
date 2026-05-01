# Admin Live Status Fix Plan

**Status:** Landed — Slice 1 landed in commit `8374ac7`; Slice 2 landed in commits `ca62089`, `8f1cac8`, and `9480c4c`; Slice 3 landed in commits `f750be2`, `7630d88`, and `bbc0c84` (PR #80, merge commit `6bfab72`); production admin smoke verified at https://github.com/kcrobinson-1/neighborly-scavenger-game/actions/runs/24912902363/job/72961624016

**Scope:** Resolve the Tier 1 backlog item
`Admin live status must match public route availability`. The plan sequences
a correctness fix, a read-model cleanup, and a non-live action UX follow-up as
separate slices so each can land and be reviewed on its own.

## Purpose

This plan is the source of truth for the confirmed root cause, the intended
end state, the bounded fix slice, and the follow-up cleanup needed so this
mismatch does not return.

## Current State

As of `2026-04-21`:

- deployed `/admin` can show an event as `Live` while `Open live game` lands on
  the public unavailable state
- the mismatch is reproducible after an event has been published, unpublished,
  and then reloaded from persisted admin data
- the current test coverage proves the immediate in-memory post-unpublish UI
  state, but does not prove the reloaded admin dashboard state

## Why This Matters

- operators need `Live` to mean the public attendee route is actually available
  by product state
- `Open live game` cannot be a dead-end action on the live-event setup surface
- this is a live-event-readiness issue, not a cosmetic admin polish task

## Confirmed Root Cause

The current implementation uses two different definitions of "live":

- admin status derives from `game_event_drafts.live_version_number`
- public route availability derives from `game_events.published_at is not null`

That divergence is durable because unpublish clears only the public projection:

- `public.unpublish_game_event(...)` sets `game_events.published_at = null`
- it does not clear `game_event_drafts.live_version_number`
- `live_version_number` is also used as an "has ever been published" signal for
  slug and event-code locking, so the field currently carries both historical
  and current-state meaning

The immediate admin UI can hide the bug until reload because the React state
manually clears `liveVersionNumber` after unpublish, even though the persisted
draft row still carries the previous value.

## Long-Term End State

The durable target shape is:

- current public availability is owned by the same backend state that the
  public route uses
- historical publish metadata is modeled separately from current live status
- admin consumes a backend-defined status contract instead of inferring status
  in the browser from draft fields

The intended semantic split is:

- `live`
  the event is currently meant to be publicly reachable
- `draft_only`
  the event has never been published
- `live_with_draft_changes`
  the public route is live, and the draft has newer unpublished edits
- `paused`
  the event was previously live and the operator has temporarily taken the
  public route offline with intent to restore, distinct from plain unpublish

`Live` should mean "publicly available by product state," not "every runtime
dependency is healthy right this second." Operational health belongs in smoke
checks, diagnostics, and runbooks, not in the publication badge.

## Delivery Shape

This should land as a short sequence, not as one large cleanup PR.

### Slice 1: Correctness Fix

Status: Landed in commit `8374ac7`

Execution plan:
[admin-live-status-slice-1-plan.md](/docs/plans/archive/admin-live-status-slice-1-plan.md).

Goal:

- stop the admin dashboard from showing `Live` or offering a working
  `Open live game` action when the public route is unavailable by current
  publication state

Required work:

- expose a current-live signal for admin reads that matches public-route
  availability
- gate admin badges, counts, and `Open live game` on that signal
- add reload-aware tests that prove persisted admin state matches the public
  route after publish and unpublish

Acceptance bar:

- after unpublish, a fresh `/admin` load no longer shows the event as live
- `Open live game` is disabled and non-navigating when the public route is not
  currently available; final visual treatment is decided in Slice 3
- local admin e2e and production smoke cover the reloaded state, not only the
  inline optimistic state

### Slice 2: Read-Model Cleanup

Status: Landed in commits `ca62089`, `8f1cac8`, and `9480c4c`

Execution plan:
[admin-live-status-slice-2-plan.md](/docs/plans/archive/admin-live-status-slice-2-plan.md).

Goal:

- remove the status-model ambiguity that made the bug possible

Required work:

- define a server-owned admin event status read model as a Postgres view,
  instead of browser-side inference
- separate current-live status from historical publish metadata such as last
  published version and first/last publish timestamps
- rename `live_version_number` to `last_published_version_number` so its role
  is unambiguously historical, and stop consuming it as a current-state signal

Acceptance bar:

- one backend contract defines admin status labels and counts
- admin no longer needs to guess current status from draft-only fields
- the data model makes "ever published" and "currently live" impossible to
  confuse

### Slice 3: Non-Live Action UX Follow-Up

Status: Landed (implementation commits: `f750be2`, `7630d88`, `bbc0c84`; production admin smoke verified at https://github.com/kcrobinson-1/neighborly-scavenger-game/actions/runs/24912902363/job/72961624016)

Execution plan:
[admin-live-status-slice-3-plan.md](/docs/plans/archive/admin-live-status-slice-3-plan.md).

Goal:

- settle the non-live `Open live game` treatment once the status model is
  trustworthy

Required work:

- decide whether a non-live event should show disabled `Open live game`,
  alternate copy, or no action at all
- distinguish "not live" from "workspace busy" when `Open live game` is
  disabled, for example with helper copy, `aria-describedby`, or distinct
  visual treatment so operators can tell whether the event is unavailable or
  just mid-mutation

This slice can follow the correctness fix unless the chosen action treatment is
required for the first PR.

Because Slice 3 extends production-smoke assertions, completion follows
`docs/testing-tiers.md` "Plan-to-Landed Gate For Plans That Touch Production
Smoke": the merge-phase PR sets plan state to
`In progress pending prod smoke` (exact string), and the final `Landed` flip
happens only in a post-release docs commit that records a passing production
smoke workflow run URL.

## Deferred Follow-Up

- `paused` status is explicitly out of scope for this three-slice plan. It
  requires a distinct operator action and audit semantics beyond the existing
  publish/unpublish model. When prioritized, it lands as a separate product
  plan/PR rather than holding this Tier 1 live-status correctness plan open.

## Non-Goals

This plan does not change:

- public attendee routing contracts beyond making admin reflect them correctly
- general runtime-health monitoring or transient outage detection
- scheduled publish, expiry windows, or richer inactive-event behavior tracked
  elsewhere in the backlog

## Validation Required To Close The Tier 1 Item

Slices 1 and 2 satisfied the correctness fix and read-model cleanup. The
parent Tier 1 backlog item stays open only for the remaining Slice 3 non-live
action treatment.

Merge phase (Tiers 1-4, valid pre-merge gates):

- browser check from `/admin` list and selected workspace through the public
  route before and after unpublish
- `npm run test:e2e:admin`
- regression coverage for the exact publish -> unpublish -> reload mismatch
- production-smoke spec assertions are extended in the PR, but Tier 5 is not
  run as a contributor merge gate

Landed phase (Tier 5 post-release gate):

- production admin smoke passes against deployed production with the Slice 3
  assertions
- the follow-up docs commit records the production-smoke workflow run URL and
  flips plan status from `In progress pending prod smoke` to `Landed`

## Related Docs

- [docs/backlog.md](/docs/backlog.md)
- [docs/tracking/admin-ux-roadmap.md](/docs/tracking/admin-ux-roadmap.md)
- [docs/operations.md](/docs/operations.md)
- [docs/testing.md](/docs/testing.md)
- [docs/testing-tiers.md](/docs/testing-tiers.md)
