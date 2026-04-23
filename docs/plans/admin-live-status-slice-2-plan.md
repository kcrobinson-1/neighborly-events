# Admin Live Status — Slice 2 Execution Plan

**Status:** Proposed

**Parent plan:** [admin-live-status-plan.md](./admin-live-status-plan.md)

**Scope:** Slice 2 only — replace the browser-side status inference with a
server-owned admin event status read model exposed as a Postgres view,
separate current-live status from historical publish metadata at the data
layer, and rename `game_event_drafts.live_version_number` to
`last_published_version_number` so its role is unambiguously historical.
Slice 3 (final non-live action UX) is explicitly out of scope and must not
start landing from this PR. The `paused` status value named in the parent
plan's long-term end state is **deferred** (see Non-Goals) — it requires a
new operator action distinct from unpublish, which is product behavior,
not read-model cleanup.

## Why Slice 2 Exists

Slice 1 stopped the reload mismatch at the admin read boundary by deriving a
per-event `isLive: boolean` from a second `game_events` query keyed on
`published_at is not null`
([apps/web/src/lib/adminGameApi.ts](../../apps/web/src/lib/adminGameApi.ts)).
That fixed the bug but left three structural issues that the parent plan
requires cleanup for before the Tier 1 backlog item can close:

- Admin status is still inferred in the browser from a fan-out of fields
  (`isLive` from one query, `liveVersionNumber !== null` for "has ever been
  published," client-only `hasDraftChanges` for dirty-form state, and the
  `Live vN` label assembled from two of those). A single read model owned by
  the server removes that inference.
- `live_version_number` still double-encodes "has ever been published" (the
  slug-lock and event-code-lock invariants) and "what version was last
  published" (the display suffix). Its name implies "currently live." The
  rename to `last_published_version_number` makes the role unambiguously
  historical so no future reader re-invents a current-live interpretation.
- Historical publish metadata (last published version, first/last publish
  timestamps) is scattered: `last_published_at` and `last_published_by`
  already exist on the draft row, `first_published_at` is not modelled at
  all, and `live_version_number` is the only version signal. A view can
  expose the full historical tuple as one contract so admin never needs to
  guess.

This slice does **not** introduce new operator actions, new public routing
contracts, or any change to how unpublish/publish behave. It is a data-model
cleanup plus one additive read view, driven by the structural issues above.

## Summary

1. Rename `game_event_drafts.live_version_number` →
   `last_published_version_number` in one migration, together with every
   SQL, Edge Function, frontend, test, fixture, and doc reference to the
   old name. Null-vs-non-null semantics are unchanged (still
   "has ever been published"); only the name moves. The slug-lock and
   event-code-lock triggers and the save-draft application-layer check are
   redefined against the new column name in the same migration.
2. Add a Postgres view `public.game_event_admin_status` that joins
   `game_event_drafts`, `game_events`, and an aggregate over
   `game_event_versions`, and returns one row per draft with the derived
   status, the historical publish metadata, and the display fields admin
   needs today. Grant read access to the roles that already read
   `game_event_drafts`.
3. Switch `apps/web/src/lib/adminGameApi.ts` to source admin reads from
   the view. Drop the separate `game_events` query added in Slice 1. Expose
   a `status: AdminEventStatus` field through the transport alongside the
   existing `isLive`, `liveVersionNumber`, and `hasBeenPublished` fields.
4. Swap admin UI consumers that currently derive status from a combination
   of `isLive` + client-only `hasDraftChanges` over to read the server
   `status` value where the decision is a persistence-level question.
   Keep the client-only `hasDraftChanges` signal for unsaved-form dirty
   state, which is a UI concern the server cannot see.
5. Update architecture docs, pgTAP coverage, unit fixtures, and the UI
   review capture fixture for the new column name and the new view.
6. Do not introduce a `paused` status value, a pause action, or any
   change to unpublish/publish behavior — those belong in Slice 3 or a
   later product slice. Do not change public attendee routing.

## Cross-Cutting Invariants

- Every consumer of the old column name (SQL migrations, RPCs, triggers,
  pgTAP tests, Edge Functions, frontend transport, UI fixtures, e2e
  fixtures, UI-review capture, architecture docs) flips to
  `last_published_version_number` in the same PR. A partial rename breaks
  the slug-lock and event-code-lock triggers, so the rename is atomic
  across layers, not staged.
- `last_published_version_number` remains a historical "has ever been
  published" signal. Its null-vs-non-null meaning is unchanged at the
  slug-lock trigger, the event-code-lock trigger, the publish RPC, the
  unpublish audit log, and the save-draft application-layer check.
- Admin status is derived once, server-side, by the view. No admin UI
  surface reinterprets `published_at`, `last_published_version_number`, or
  `updated_at` fan-out to compute persistence-level status. Client-only
  form-dirty state (`hasDraftChanges`) remains client-owned and is
  combined with server `status` only in the label layer.
- The view's `status` value and the view's `is_live` column must match
  what `/event/:slug/game` resolves from the same persisted data at the
  same moment — Slice 1's correctness invariant is preserved, not
  regressed. Any call site that previously read `isLive` still reads a
  value that equals `published_at is not null` for that event.
- The view is additive. The existing `game_event_drafts` and `game_events`
  tables, their RLS policies, the publish and unpublish RPCs, and the
  save-draft Edge Function continue to work unchanged after Slice 2. If
  the view is dropped, the previous admin reads would still be usable with
  the Slice 1 code path; this is the rollback property called out below.

## Per-Surface Contracts

### Column rename — `supabase/migrations/<new>_rename_live_version_number.sql`

- `alter table public.game_event_drafts rename column live_version_number
  to last_published_version_number;`
- `alter table public.game_event_drafts rename constraint
  game_event_drafts_live_version_number_positive to
  game_event_drafts_last_published_version_number_positive;` (the check
  constraint body is unchanged; only the identifier moves).
- Redefine `public.publish_game_event_draft(text, uuid)`,
  `public.unpublish_game_event(text, uuid)`, the slug-lock trigger
  function, and the event-code-lock trigger function to reference the new
  column name. No behavior change — the update-set list and trigger
  predicates read the renamed column on both sides of the rename.
- The migration runs as a single transaction; a partial apply leaves
  triggers referencing a missing column, so there is no intermediate
  state to tolerate.

### Status view — `supabase/migrations/<new>_add_game_event_admin_status_view.sql`

- `create view public.game_event_admin_status` returning one row per
  `game_event_drafts.id` with these columns (names final at review time,
  shape stable):
  - `event_id text`
  - `slug text`
  - `name text`
  - `event_code text`
  - `status text` — one of `draft_only`, `live`, `live_with_draft_changes`
  - `is_live boolean` — equal to `status in ('live',
    'live_with_draft_changes')`; preserved for the transitional period
    while callers migrate off the Slice 1 boolean contract, and removed in
    a later slice once no caller reads it
  - `last_published_version_number integer`
  - `last_published_at timestamptz`
  - `first_published_at timestamptz` — derived as
    `min(game_event_versions.published_at)` joined on
    `event_id = game_event_drafts.id`; null when no versions exist
  - `draft_updated_at timestamptz` — the `game_event_drafts.updated_at`
    value, so the client can continue to render "last saved" without a
    second query
- Status derivation rule, documented in the view comment:
  - `draft_only` when `last_published_version_number is null`
  - `live` when `game_events.published_at is not null`
    and `game_event_drafts.updated_at <= game_event_drafts.last_published_at`
  - `live_with_draft_changes` when `game_events.published_at is not null`
    and `game_event_drafts.updated_at > game_event_drafts.last_published_at`
  - The combination "`last_published_version_number is not null` and
    `game_events.published_at is null`" (previously-published-then-
    unpublished) returns `draft_only` under this slice. The parent plan's
    `paused` state is the intended future label for this row; it is not
    introduced here because distinguishing a "paused with intent to
    restore" unpublish from a plain unpublish requires a new operator
    action. See Non-Goals.
- Grants: the view is `security_invoker = on` (or the equivalent
  `with (security_invoker = true)` view option on PG ≥ 15) so row
  visibility honors the existing RLS on `game_event_drafts` and
  `game_events`. Grant `select` to the roles that already read
  `game_event_drafts` (today: `authenticated`). Do not grant `select` to
  `anon`.
- Do not create any RPC, trigger, or materialized view. The view is a
  plain `create view`.

### Admin read transport — `apps/web/src/lib/adminGameApi.ts`

- `DraftEventRow` drops `live_version_number` and reads from the view
  instead of `game_event_drafts`. Replace the two-query pattern
  (`game_event_drafts` + `listPublishedGameEventIds` /
  `loadPublishedGameEvent`) with one select against
  `game_event_admin_status`. Remove `listPublishedGameEventIds` and
  `loadPublishedGameEvent` helpers; they are dead after the switch.
- `DraftEventSummary` gains `status: AdminEventStatus` where
  `AdminEventStatus = "draft_only" | "live" | "live_with_draft_changes"`.
  `isLive`, `liveVersionNumber`, `hasBeenPublished` remain on the type
  for now — Slice 2 does not drop them, so existing consumers that were
  swapped in Slice 1 continue to compile.
- `DraftEventDetail` gains the same `status` field. `content` still comes
  from the `game_event_drafts.content` column; the view does not carry
  the JSON payload because it is not needed for the status contract and
  a detail read can select `content` from the underlying table via a
  second query keyed on the event id, or the view can be extended later
  to include it if measured to be cheaper. Prefer the current two-query
  shape (one view read, one `content` read for the detail route) to keep
  the view narrow.
- `SaveDraftEventResult = Omit<DraftEventSummary, "isLive" | "status">`.
  The save-draft Edge Function does not change publication state and
  cannot emit a server-derived status; the client reconciliation rule in
  `useSelectedDraft.ts` preserves the prior `status` across a save, the
  same way Slice 1 preserves `isLive`.

### Admin save-draft Edge Function — `supabase/functions/save-draft/index.ts`

- The two slug-lock and event-code-lock checks flip from
  `existing.live_version_number !== null` to
  `existing.last_published_version_number !== null`. No behavior change.
- `ExistingDraftRow` and `DraftSaveRow` types rename the field. The
  `select` list in the existing-row query renames accordingly. The
  response rows returned to the client rename the field in the mapped
  shape.

### Admin UI consumers — `apps/web/src/admin/*`

- `AdminEventWorkspace.tsx` `getStatusLabel(draft, hasDraftChanges)` is
  rewritten to consume `draft.status` as the primary signal and combine
  it with the client `hasDraftChanges` only for the "user is typing but
  has not saved" branch:
  - `draft.status === "draft_only"` → `"Draft only"`
  - `draft.status === "live_with_draft_changes"` → `"Draft changes not
    published"`
  - `draft.status === "live"` and `!hasDraftChanges` → `` `Live v${draft.lastPublishedVersionNumber}` ``
  - `draft.status === "live"` and `hasDraftChanges` → `"Draft changes not
    published"`
- `getEventCounts(drafts)` keeps the live count semantics from Slice 1:
  `drafts.filter((draft) => draft.status !== "draft_only").length`.
  Confirm this equals the previous `drafts.filter((draft) => draft.isLive)`
  count exactly, on the three pgTAP fixture cases and the unit fixtures.
- `AdminPublishPanel.tsx` `Unpublish` button visibility continues to gate
  on `isLive`-equivalent semantics. It may read either `draft.isLive` or
  `draft.status !== "draft_only"` — the per-file self-review step chooses
  one and the cross-cutting invariant above keeps them equivalent.
- `useSelectedDraft.ts` reconciliation patches set `status` alongside
  `isLive` on every local-state write:
  - post-save: preserve the prior `status` and prior
    `lastPublishedVersionNumber` (save does not change publication state)
  - post-publish: set `status = "live"` and
    `lastPublishedVersionNumber = result.versionNumber`; `isLive = true`
    is kept for the transition
  - post-unpublish: set `status = "draft_only"` and `isLive = false`;
    `lastPublishedVersionNumber` is preserved (historical)
  - event creation: `status = "draft_only"`,
    `lastPublishedVersionNumber = null`, `isLive = false`
  - initial load: the value comes from the view, no client derivation

### Fixture surfaces

- `tests/web/lib/adminGameApi.test.ts` — every fixture returns `status`
  and `lastPublishedVersionNumber`. At least one fixture per status
  value, including the "previously published then unpublished" row
  that returns `draft_only` under this slice.
- `tests/web/pages/AdminPage.test.tsx` — fixtures gain `status`.
- `tests/e2e/admin-auth-fixture.ts` — the seeded draft row uses the new
  column name. The e2e fixture does not need to exercise the view
  directly if its assertions continue to run through the admin UI; the
  view's inputs come from the same rows the fixture already seeds.
- `scripts/ui-review/capture-ui-review.cjs` — the Playwright route
  mocks that intercept `game_event_drafts` now intercept
  `game_event_admin_status`, the mocked row shape matches the view's
  output, and the referenced fixture field renames from
  `live_version_number` to `last_published_version_number`.
- `shared/game-config/draft-content.ts` — the shared draft-row type
  renames the field.

### Public attendee route

Unchanged. This slice is admin-owned.

## Intended Commit Boundaries

1. **`refactor(db): rename live_version_number to last_published_version_number.`**
   One migration that renames the column and its constraint, redefines
   the publish/unpublish RPCs and the two lock triggers against the new
   name, and updates every consumer in the same commit:
   - `supabase/functions/save-draft/index.ts` (types + lock checks)
   - `apps/web/src/lib/adminGameApi.ts` (query select + row type)
   - `apps/web/src/admin/AdminEventWorkspace.tsx` (display suffix)
   - `apps/web/src/admin/useSelectedDraft.ts` (reconciliation field name)
   - `shared/game-config/draft-content.ts`
   - `tests/web/lib/adminGameApi.test.ts`
   - `tests/web/pages/AdminPage.test.tsx`
   - `tests/e2e/admin-auth-fixture.ts`
   - `scripts/ui-review/capture-ui-review.cjs`
   - pgTAP: `event_code_data_model.test.sql`,
     `game_authoring_phase3_publish_failure_permissions.test.sql`,
     `game_authoring_phase3_publish_projection.test.sql`
   - `docs/architecture.md` (the `adminGameApi.ts` paragraph replaces
     "without reinterpreting `live_version_number`" with the new name;
     the view reference is added in commit 3's doc pass, not here)

   This commit is larger than typical because the rename is atomic: any
   partial state leaves triggers referencing a missing column. Review
   effort is bounded because every change maps mechanically to
   "old name → new name."

2. **`feat(db): add game_event_admin_status view.`**
   Migration that adds the view, its comment, the grants, and the pgTAP
   file `supabase/tests/database/game_event_admin_status.test.sql` that
   exercises the three status cases plus the previously-published-then-
   unpublished row. No frontend changes in this commit; the view is
   unused until commit 3.

3. **`refactor(web): consume admin status contract from the view.`**
   Swap `adminGameApi.ts` reads to `game_event_admin_status`, add
   `status` to the transport types, remove the
   `listPublishedGameEventIds` / `loadPublishedGameEvent` helpers, and
   wire `AdminEventWorkspace.tsx` and `useSelectedDraft.ts` to the
   server status per the per-surface contracts above. Update unit
   fixtures to carry `status`. Update
   `scripts/ui-review/capture-ui-review.cjs` to mock the view endpoint.
   Update `docs/architecture.md` to describe the view-backed admin read
   path.

4. **`docs: land slice 2 and reconcile parent plan.`**
   Flip this file's Status from `Proposed` to `Landed` with the
   implementing commit SHAs recorded inline. Flip the parent plan's
   Slice 2 Status to `Landed` with the same SHAs. Keep the parent plan
   `In progress` because Slice 3 remains proposed. Update
   `docs/backlog.md` only as needed so the Tier 1 entry reflects "Slice 1
   and Slice 2 landed, parent plan still open for Slice 3," without
   inventing duplicate tracking items. No code changes in this commit.

Keep review-fix commits distinct from the feature commits above when
reviewer feedback surfaces corrections.

## Baseline Validation

Before the first edit, run and confirm green:

- `npm run lint`
- `npm run test -- adminGameApi AdminPage`
- `npm run build:web`
- `npm run test:functions` (exercises the save-draft function's
  application-layer lock check)
- `npm run test:e2e:admin` if the local runner is configured
- Local pgTAP run for the three test files that reference the old column
  name, to confirm they currently pass before the rename

Stop and report instead of editing if any baseline step fails.

## Named Self-Review Audits

From [docs/self-review-catalog.md](../self-review-catalog.md), applied at
the commit boundary noted in parentheses:

- **SQL — Rename-aware diff classification** (commit 1): walk every
  occurrence of `live_version_number` and `liveVersionNumber` surfaced
  in the full-repo grep before the first edit, and confirm each appears
  in the diff as the renamed identifier. The atomic rename cannot
  tolerate a missed site.
- **SQL — CHECK-constraint NULL-handling audit** (commit 1): the
  renamed `check (... is null or ... > 0)` constraint preserves the
  null-permitted semantic. Verify the rename keeps both branches.
- **SQL — pgTAP output-format stability audit** (commit 1 + commit 2):
  the three existing pgTAP tests still match their expected output
  after the column rename, and the new view pgTAP test uses the same
  assertion style as existing data-model tests
  (`event_code_data_model.test.sql`).
- **SQL — Grant/body contract audit** (commit 2): the `grant select` on
  the new view matches what the view body actually returns under the
  `security_invoker` policy. Confirm `anon` is not granted select, and
  that an `authenticated` caller without admin allowlist sees zero rows
  because the underlying `game_event_drafts` RLS already filters them
  out.
- **Frontend — Complete call-site coverage** (commit 3): every consumer
  of the Slice 1 `isLive` signal is classified as "kept for transition"
  or "moved to `status`." Every write site in `useSelectedDraft.ts`
  (save, publish, unpublish, create, initial load) sets both `isLive`
  and `status` explicitly to the value named in the cross-cutting
  invariants.
- **Frontend — Fixture parity** (commit 3): every test fixture and UI
  review fixture returns `status` alongside `isLive`, and no test
  accidentally relies on the absence of the field.
- **Frontend — Post-save reconciliation audit** (commit 3): the
  save-draft response merge preserves `status` and
  `lastPublishedVersionNumber` on both the list row and the selected
  detail — a spread merge that drops either one silently regresses
  Slice 1 and Slice 2 at once.
- **CI — E2E runner inclusion** (commit 3): the reload-aware cases
  added in Slice 1 still pass after the transport swap. The production
  smoke runner still exercises the same assertions.
- **Runbook — Production smoke actuation** (commit 3): run the
  production admin smoke against the deployed environment so the new
  transport path is exercised end to end, not only against local
  fixtures.

## Validation Commands Expected At Handoff

- `npm run lint`
- `npm run test`
- `npm run test:functions`
- `npm run build:web`
- `npm run test:e2e:admin`
- `npm run test:e2e:admin:production-smoke` against the deployed
  environment, or equivalent deployed verification that exercises the
  reload-aware Slice 1 assertions through the new view-backed transport
- Local pgTAP run for the three renamed tests plus the new
  `game_event_admin_status.test.sql`

## Plan-to-PR Completion Gate

Slice 2 is `Landed` when all of the following hold:

- Every Goal, Required work, and Acceptance bar item in the parent
  plan's Slice 2 section is satisfied in the PR, or deferred in writing
  in this file with rationale.
- The Slice 2 Status line in this file and in the parent plan is
  flipped from `Proposed` to `Landed` with the implementing commit
  SHAs recorded inline.
- The parent plan and `docs/backlog.md` agree that Slice 1 and Slice 2
  have landed while the broader admin live-status plan remains open
  for Slice 3, with any deferral rationale written in the parent plan
  rather than implied by backlog drift.
- Every command listed in `Validation Commands Expected At Handoff`
  above ran with its result recorded in the PR body. Any command that
  could not run is called out explicitly with a reason, per the
  Validation Honesty rule.

## Non-Goals

- Introducing a `paused` status value, a pause operator action, or any
  new product behavior distinct from the existing publish/unpublish
  flow. `paused` is named in the parent plan's long-term end state and
  is deferred here because it requires a new operator action with its
  own audit semantics, and read-model cleanup alone cannot define the
  "intent to restore" signal that separates paused from plain unpublish.
  A follow-up slice (or a product PR) introduces it by adding an
  operator action and extending the view's status derivation.
- Finalizing the non-live `Open live game` visual treatment (Slice 3).
- Creating RPCs, triggers, or Edge Functions around the status view.
  The view is a plain `create view` with grants; it does not introduce
  a new trust boundary.
- Dropping the `isLive`, `liveVersionNumber`, or `hasBeenPublished`
  fields from the admin transport. They are kept during the
  transition. A later cleanup slice removes them once no consumer reads
  them, outside this plan.
- Changing public attendee routing, transient health monitoring,
  scheduled publish, expiry windows, or inactive-event behavior beyond
  what the read-model cleanup requires.
- Touching the `game_event_versions` write path. The view reads from
  it; the publish and unpublish RPCs that write it are redefined only
  insofar as the column rename forces it.

## Rollback

If Slice 2 introduces a regression after deploy, the three commits roll
back independently:

- Revert commit 3 to restore the Slice 1 two-query admin transport; the
  view still exists unused, which is safe.
- Revert commit 2 to drop the view; no frontend references it after
  commit 3 is reverted.
- Revert commit 1 only if the column rename is implicated. A rename
  revert is a second `alter table ... rename column` in the opposite
  direction plus the mirrored redefinition of the affected RPCs and
  triggers. Because the rename is pure metadata, there is no data loss
  on either direction of the revert.

The view is additive and carries no persistence state, so dropping it
does not orphan data. The column rename is reversible with one mirrored
migration.

## Related Docs

- [docs/plans/admin-live-status-plan.md](./admin-live-status-plan.md)
- [docs/plans/admin-live-status-slice-1-plan.md](./admin-live-status-slice-1-plan.md)
- [docs/backlog.md](../backlog.md)
- [docs/architecture.md](../architecture.md)
- [docs/self-review-catalog.md](../self-review-catalog.md)
