# Admin Live Status — Slice 1 Execution Plan

**Status:** Landed in commit `8374ac7`

**Parent plan:** [admin-live-status-plan.md](./admin-live-status-plan.md)

**Scope:** Slice 1 only — add a current-live signal to admin reads that
matches public-route availability, gate admin badges, counts, status labels,
and the `Open live game` and `Unpublish` actions on that signal, and add
reload-aware regression coverage. Slice 2 (server-owned status view plus the
`live_version_number` → `last_published_version_number` rename) and Slice 3
(final non-live action UX) are explicitly out of scope and must not start
landing from this PR.

## Why Slice 1 Exists

Today a reload of `/admin` can show an event as `Live` with a working
`Open live game` action while the public route at `/event/:slug/game` returns
the unavailable state. Admin and public use two different definitions of live:

- admin reads derive live status from `game_event_drafts.live_version_number`
  ([apps/web/src/lib/adminGameApi.ts](../../../apps/web/src/lib/adminGameApi.ts)),
  consumed across the workspace in
  [apps/web/src/admin/AdminEventWorkspace.tsx](../../../apps/web/src/admin/AdminEventWorkspace.tsx)
  and [apps/web/src/admin/AdminPublishPanel.tsx](../../../apps/web/src/admin/AdminPublishPanel.tsx)
- public routing derives availability from `game_events.published_at is not null`

`public.unpublish_game_event` clears `game_events.published_at = null` but
leaves `game_event_drafts.live_version_number` intact. That column also
encodes "has ever been published" and is consumed by the slug-lock trigger,
the event-code-lock trigger, the publish RPC's version increment, and the
save-draft immutability flow — so unpublish cannot simply clear it without
leaking into unrelated invariants. Slice 1 fixes the divergence at the admin
read boundary without touching `live_version_number` semantics. Slice 2 will
collapse the read model durably.

The current admin in-memory state also manually clears `liveVersionNumber`
after unpublish ([apps/web/src/admin/useSelectedDraft.ts](../../../apps/web/src/admin/useSelectedDraft.ts)
around the save-flow update), which hides the bug until reload. The admin e2e
assertions today go directly to `/admin/events/{id}` and only check the
workspace detail label; they do not cover the event-list badge, the live
count, or the `Open live game` button after a fresh reload.

## Summary

1. Extend admin reads to return a per-event `isLive: boolean` derived from
   `game_events.published_at is not null`.
2. Switch every admin "live now" decision that currently depends on
   `liveVersionNumber` to consume `isLive`. Keep `liveVersionNumber` for the
   `Live vN` display suffix and for any save-flow parity that needs the
   version number specifically.
3. Gate `Open live game` on `isLive`. When `!isLive`, the button renders
   disabled and non-navigating with a semantic `disabled` attribute. Final
   visual treatment is Slice 3.
4. Add reload-aware regression coverage proving that a
   publish → unpublish → reload sequence shows non-live state on the event
   list, on the workspace detail, on `Open live game`, and on
   `/event/:slug/game`.
5. Do not touch migrations, RPCs, Edge Functions, `live_version_number`
   semantics, or other consumers of that field.

## Cross-Cutting Invariants

- Every admin "live now" decision site (list badge, live count,
  workspace status label, `Open live game`, `Unpublish` visibility) reads
  `isLive` for the gating decision, never `liveVersionNumber`.
- `liveVersionNumber` remains a "has ever been published" historical signal;
  its semantics in the slug-lock trigger, the event-code-lock trigger, the
  publish RPC, the unpublish audit log, and the save-draft flow are unchanged.
- The `isLive` value returned from admin reads matches what
  `/event/:slug/game` resolves from the same persisted data at the same
  moment.
- A reload-persisted admin view cannot show `Live` while the public route is
  unavailable — on the event list or on the workspace detail.
- Every local admin state write (post-save merge, post-publish patch,
  post-unpublish patch, initial load, create) sets `isLive` to match the
  publication-state truth at that moment: save re-reads the current live
  status from the backend after persistence, publish sets `true`, unpublish
  sets `false`. The save-path re-read is best-effort: if the follow-up read
  fails after persistence succeeds, the UI preserves the prior `isLive`
  value instead of surfacing the save as failed. In-session behavior after a
  mutation must match the reload-after-mutation behavior on the same event
  whenever the refresh read succeeds.

## Per-Surface Contracts

### Admin read transport — `apps/web/src/lib/adminGameApi.ts`

- `DraftEventSummary` and `DraftEventDetail` types gain `isLive: boolean`.
- `listDraftEventSummaries()` and `loadDraftEvent(eventId)` derive `isLive`
  from `game_events.published_at is not null`. Preferred mechanism, in order:
  1. a PostgREST embedded select against the existing admin-readable
     `game_events` row if current RLS already allows the admin client to
     read `published_at`
  2. otherwise a narrow read helper that issues a second `game_events` select
     keyed by event id and merges `published_at` into the returned rows
- Do not introduce a new Postgres view or server-owned status model — Slice 2
  owns that.
- The follow-up live-status read is best-effort for the initial dashboard list
  and draft-detail load. If the draft row(s) load successfully but the
  `game_events` lookup fails, keep the admin surface available and fall back to
  `isLive = false` until a later successful refresh.
- `liveVersionNumber` remains unchanged in shape and value on the returned
  records.
- The `saveDraftEvent()` response shape returned by
  `supabase/functions/save-draft/index.ts` is intentionally out of scope and
  does not gain `isLive`. Save never changes publication state, so the field
  is not derivable on the server for this slice's contract and must not be
  read from the save response. The client reconciliation contract in
  `useSelectedDraft.ts` below is what keeps `isLive` consistent across the
  save path.

### Admin event workspace — `apps/web/src/admin/AdminEventWorkspace.tsx`

- `getEventCounts(drafts)` live count switches from
  `draft.liveVersionNumber` to `draft.isLive`.
- `getStatusLabel(draft, hasDraftChanges)` gates the `Live vN` /
  `Draft changes not published` branch on `draft.isLive`. The vN suffix
  continues to source from `liveVersionNumber` for display.
- The event-list row `Live` badge uses `draft.isLive`.
- The `Open live game` button renders for every draft but is disabled and
  non-navigating when `!draft.isLive`. Link semantics (if rendered as an
  anchor) must degrade to a disabled-button semantic when not live, not to a
  navigating link with `onClick` prevented.

### Admin publish panel — `apps/web/src/admin/AdminPublishPanel.tsx`

- `Unpublish` button visibility gates on `draft.isLive`.

### Selected-draft hook — `apps/web/src/admin/useSelectedDraft.ts`

- Any `hasDraftChanges` derivation that currently references
  `liveVersionNumber` as a "currently live" proxy switches to `isLive`. The
  survey identified two sites around the post-save and post-publish branches.
  Confirm both and classify each as "live-gating" (switch to `isLive`) or
  "version-number display" (keep `liveVersionNumber`) before editing.
- **Post-save reconciliation.** When merging the `saveDraftEvent()` response
  into the list row and selected detail, the hook must re-read current live
  status from the backend and apply that refreshed boolean to both records.
  Save never changes publication state directly, but another admin can
  publish or unpublish the same event before the save returns. Do not treat a
  missing `isLive` on the save response as `false`; use a narrow follow-up
  read so the save path converges on the same truth as reload. If that
  follow-up read fails after the write already succeeded, fall back to the
  pre-save `isLive` value and keep the save in a success state.
- **Post-publish reconciliation.** Every local-state patch that currently
  sets `liveVersionNumber` after a successful publish must also set
  `isLive = true` in the same update, for both the list row and the selected
  draft detail. Without this, the event-list badge, live count, and
  `Open live game` button stay non-live between the publish action and the
  next reload.
- **Post-unpublish reconciliation.** Every local-state patch that currently
  clears or updates `liveVersionNumber` after a successful unpublish must
  also set `isLive = false` in the same update, for both the list row and
  the selected draft detail. This is what closes the "hides the bug until
  reload" behavior called out in the parent plan while leaving
  `liveVersionNumber` semantics untouched at the data layer.
- Every site that writes to local admin state (save, publish, unpublish,
  event creation, initial load) must set `isLive` explicitly rather than
  letting `undefined` bleed through the typed contract.

### Public route contract

Unchanged. This slice is admin-read only.

## Intended Commit Boundaries

1. **`feat(web): surface isLive in admin read transport.`**
   Extend types and queries in `adminGameApi.ts`. No UI consumers yet.
   Unit tests in `tests/web/lib/adminGameApi.test.ts` assert the derivation
   for three fixtures: never-published, currently-published, and
   published-then-unpublished.

2. **`fix(web): gate admin live decisions on isLive.`**
   Swap every consumer listed in Per-Surface Contracts. Update mocked
   fixtures in `tests/web/pages/AdminPage.test.tsx` and any supporting
   fixture helpers so they return `isLive`. Add targeted unit coverage for
   the three reconciliation paths in `useSelectedDraft.ts`: (a) saving a
   live event preserves `isLive === true` on the list row and selected
   detail, (b) publishing sets `isLive === true` in the in-session patch,
   (c) unpublishing sets `isLive === false` in the in-session patch without
   requiring a reload. Add a unit test that proves the `Open live game`
   button is rendered disabled when `isLive === false` and
   `liveVersionNumber !== null` (the post-unpublish persisted-row shape).

3. **`test(e2e): reload-aware publish→unpublish regression.`**
   Add a dedicated case in `tests/e2e/admin-workflow.admin.spec.ts` that
   (a) creates an event, publishes, unpublishes, (b) performs a full
   `page.reload()` on `/admin`, not only a `page.goto` to the workspace
   detail, (c) asserts the event-list `Live` count is zero,
   (d) asserts the event-list row does not show the `Live` badge,
   (e) asserts the workspace detail `Open live game` renders disabled,
   (f) asserts `/event/:slug/game` returns the unavailable state. Mirror
   the same reload-aware assertions in
   `tests/e2e/admin-production-smoke.spec.ts` so the production smoke fails
   loudly if the bug returns in deployed state.

4. **`docs: mark slice 1 landed and reconcile the parent plan state.`**
   Flip the Slice 1 `Status:` line in
   [admin-live-status-plan.md](./admin-live-status-plan.md) and in this file
   from `Proposed` to `Landed`, with the implementing commit SHAs recorded
   inline. Keep the parent plan marked `In progress` because Slice 2
   (read-model cleanup) and Slice 3 (non-live action UX) remain proposed.
   If `docs/backlog.md` still tracks the parent Tier 1 item, update its copy
   only as needed so it reflects "Slice 1 landed, parent plan still open"
   without inventing duplicate Tier 3 / Tier 5 items unless the parent plan
   is explicitly split later.
   Update `docs/architecture.md` only if the new admin transport field
   warrants a named mention at the admin-read-path level; if the current
   architecture doc does not name admin read transport explicitly, leave
   the durable structural description for Slice 2.

Keep review-fix commits separate from the feature commits above when
reviewer feedback surfaces corrections.

## Baseline Validation

Before the first edit, run and confirm green:

- `npm run lint`
- `npm run build:web`
- `npm run test -- adminGameApi AdminPage` (focused unit subset)
- `npm run test:e2e:admin` if the local runner is configured

Stop and report instead of editing if any baseline step fails.

This slice does not edit Supabase functions, migrations, or RPCs, so Deno
checks and pgTAP are not baseline-required. If the implementer's branch
accidentally touches `supabase/` that is a scope drift and a stop-and-report
moment.

## Named Self-Review Audits

From [docs/self-review-catalog.md](../../self-review-catalog.md), applied at
the commit boundary noted in parentheses:

- **Frontend — Complete call-site coverage** (commit 2): walk every
  `liveVersionNumber` consumer in `apps/web/src/admin/` and
  `apps/web/src/lib/adminGameApi.ts` and classify each as "gating decision
  → `isLive`" or "display string → `liveVersionNumber`". Separately walk
  every local-state write in `useSelectedDraft.ts` (post-save merge,
  post-publish patch, post-unpublish patch, initial load, create) and
  confirm each one sets `isLive` explicitly to the value named by the
  cross-cutting invariant. Do not rely on typecheck alone — both fields are
  booleans/numbers, so the compiler will not flag a misused site, and a
  spread merge of the save response can silently drop `isLive` without
  type errors.
- **Frontend — Fixture parity** (commit 2): every test fixture that returns
  `DraftEventSummary` or `DraftEventDetail` now supplies `isLive`, and no
  test accidentally relies on the old `liveVersionNumber`-as-live proxy.
- **Frontend — Accessibility regression** (commit 2): the disabled
  `Open live game` state exposes a semantic `disabled` attribute or
  `aria-disabled="true"`, not purely visual styling, so screen readers
  communicate non-availability.
- **CI — E2E runner inclusion** (commit 3): the new reload-aware cases are
  picked up by `npm run test:e2e:admin` and by the production smoke runner,
  and the existing publish→unpublish case still passes.
- **Runbook — Production smoke actuation** (commit 3): run the production
  smoke against the deployed environment after the reload-aware assertions
  are added, so the new assertions are exercised end to end, not only
  against local fixtures.

## Validation Commands Expected At Handoff

- `npm run lint`
- `npm run test`
- `npm run test:functions`
- `npm run build:web`
- `npm run test:e2e:admin`
- `npm run test:e2e:admin:production-smoke` against the deployed environment,
  or equivalent deployed verification that exercises the new reload-aware
  assertions

## Plan-to-PR Completion Gate

Slice 1 is `Landed` when all of the following hold:

- Every Goal, Required work, and Acceptance bar item in the parent plan's
  Slice 1 section is satisfied in the PR, or deferred in writing in this
  file with rationale.
- The Slice 1 `Status:` line in this file and in the parent plan is flipped
  from `Proposed` to `Landed` with the implementing commit SHAs recorded
  inline.
- The parent plan and `docs/backlog.md` now agree that Slice 1 landed while
  the broader admin live-status plan remains open for Slice 2 / Slice 3, with
  any deferral rationale written in the parent plan rather than implied by
  backlog drift.
- Every command listed in `Validation Commands Expected At Handoff` above
  ran with its result recorded in the PR body. Any command that could not
  run is called out explicitly with a reason, per the Validation Honesty
  rule.

## Non-Goals

- Creating a Postgres view, RPC, or Edge Function for admin event status
  (Slice 2).
- Renaming `live_version_number` to `last_published_version_number`
  (Slice 2).
- Separating historical publish metadata from current-live state in the
  data model (Slice 2).
- Finalizing the non-live `Open live game` visual treatment (Slice 3).
- Touching public attendee routing, transient health monitoring, scheduled
  publish, expiry windows, or inactive-event behavior beyond what the
  correctness fix requires.

## Rollback

If Slice 1 introduces a regression after deploy, revert the feature commits
in place. The slice adds a new field and swaps consumers to it; no
migrations or persistence changes are involved, so reverting the web
commits restores the prior admin behavior (including the known bug) without
data-shape consequences.
