# Admin Live Status — Slice 3 Execution Plan

**Status:** Proposed

**Parent plan:** [admin-live-status-plan.md](./admin-live-status-plan.md)

**Scope:** Slice 3 only — settle the non-live `Open live game` treatment
now that the server-owned status contract from Slice 2 is trustworthy.
Distinguish "not live" from "workspace busy" semantically and visually at
every `Open live game` call site. No backend, migration, RPC, Edge
Function, or transport change; no new operator action; no change to
publish/unpublish behavior. The `paused` status value named in the
parent plan's long-term end state is **deferred** — it requires a new
operator action with its own audit semantics, which is product behavior
distinct from the UX of the existing statuses. A later product slice
introduces it by adding an operator action and extending the view's
derivation; when it lands it adds one more reason string to this
slice's pattern, not a restructuring of it.

## Why Slice 3 Exists

Slice 1 closed the correctness bug by gating `Open live game` on a
current-live signal. Slice 2 replaced client-side status inference with
a server-owned `status` contract on the admin read path. Both slices
deliberately deferred the non-live action treatment:

- today `Open live game` uses the native `disabled` attribute driven by
  `isWorkspaceBusy || !selectedDraft.isLive` at
  [apps/web/src/admin/AdminEventWorkspace.tsx:225](../../apps/web/src/admin/AdminEventWorkspace.tsx)
  and [apps/web/src/admin/AdminEventWorkspace.tsx:368](../../apps/web/src/admin/AdminEventWorkspace.tsx).
  The same visual state is emitted for two very different operator
  situations ("event is not published" and "the workspace is mid-save"),
  and the only signal distinguishing them is the mutation message
  elsewhere on the page.
- native `disabled` removes the button from the tab order, so AT users
  cannot reach any explanation of why the action is unavailable. The
  only `aria-describedby` precedent in the repo today is
  [apps/web/src/game/components/CurrentQuestionPanel.tsx:110](../../apps/web/src/game/components/CurrentQuestionPanel.tsx);
  admin has no equivalent pattern yet.
- the parent plan's Slice 3 acceptance bar explicitly names this
  distinction as the remaining gap before the Tier 1 backlog item can
  close.

This slice exists to close that gap with the smallest coherent UX
change that satisfies the parent plan's Slice 3 goal, keeps the two
call sites consistent, and establishes the `aria-disabled` + reason-
text pattern as a reusable admin convention.

## Summary

1. Swap the `Open live game` button at both call sites from native
   `disabled` to `aria-disabled="true"` so the button stays in the tab
   order and AT users can reach the reason. The button's `onClick`
   guards navigation when `aria-disabled` is true.
2. Render a single reason per disabled cause, wired through
   `aria-describedby` to a stable helper-text span adjacent to the
   button:
   - not-live (`draft.status === "draft_only"`): `"Publish this event
     to open the live game."`
   - workspace busy: `"Working..."`
   - `live_with_draft_changes`: button stays enabled; no reason.
3. Add a `.secondary-button.is-disabled` (or equivalent `[aria-disabled="true"]`
   selector) SCSS rule so the visual disabled treatment is driven by
   class/attribute rather than the `:disabled` pseudo-class. Reuse
   existing tokens from `apps/web/src/styles/_tokens.scss` rather than
   introducing new colors or opacities.
4. Extend the reload-aware admin e2e to assert tab-reachability,
   `aria-disabled="true"`, and the helper-text content on the
   `draft_only` path. Extend the unit-test fixtures so every disabled
   assertion is paired with its reason text.
5. Flip this file's Status and the parent plan's Slice 3 Status to
   `Landed` in the same PR that lands the code. Close the Tier 1
   backlog entry for `Admin live status must match public route
   availability` in the same PR, since Slice 3 is the final remaining
   requirement.

## Cross-Cutting Invariants

- Every `Open live game` call site (workspace detail button, event-
  list row button) uses the same disabled-state mechanism:
  `aria-disabled="true"` + `aria-describedby` + click guard. Native
  `disabled` is not used at these two sites after this slice.
- The reason string is derived from a single helper so the not-live
  copy cannot drift between call sites. `draft_only` → not-live reason;
  `isWorkspaceBusy` → busy reason; otherwise no reason and no disabled
  state.
- Busy and not-live are never both rendered as reasons on the same
  button at the same time. If both conditions hold simultaneously the
  busy reason wins, because busy is transient and resolves on its own
  while not-live reflects persistent state the operator has to act on.
- Visual disabled styling is driven by `[aria-disabled="true"]`, not
  by the `:disabled` pseudo-class, at the `Open live game` sites.
  Other admin buttons that use native `disabled` keep that mechanism;
  this slice does not migrate them.
- The reason text is present in the rendered DOM (not only in an
  `aria-label` or tooltip) so unit tests can assert it by text query
  and mobile users without pointer hover still see it.

## Per-Surface Contracts

### Admin workspace component — `apps/web/src/admin/AdminEventWorkspace.tsx`

- Introduce one local helper, roughly:
  `function getOpenLiveGameReason(draft, isWorkspaceBusy): { disabled: boolean; reasonId: string | null; reason: string | null }`.
  Single source of truth for both call sites. Returns `null` reason
  when the button should be enabled.
- Both `Open live game` buttons change from
  `disabled={isWorkspaceBusy || !selectedDraft.isLive}` /
  `disabled={isWorkspaceBusy || !draft.isLive}` to
  `aria-disabled` + `aria-describedby` wired from the helper. Add an
  `onClick` guard that short-circuits when the helper returns
  `disabled: true`.
- Helper-text span is a sibling of the action row (or inside it as a
  non-button child), not a tooltip. Its `id` is stable per call site
  (workspace detail: `open-live-game-reason-workspace`; event-list
  row: `open-live-game-reason-${draft.id}`) so `aria-describedby`
  resolves reliably and the span can co-exist across multiple rows
  without id collisions.
- `getOpenLiveGameReason` reads `draft.status === "draft_only"` for
  not-live, not `!draft.isLive`. The two are equivalent per Slice 2's
  cross-cutting invariant, and preferring `status` keeps this slice
  aligned with the server-owned contract rather than the transitional
  `isLive` field.
- `getStatusLabel` is unchanged. `getEventCounts` is unchanged. The
  chip text already carries "draft only" and "draft changes not
  published"; the button's reason text is additive.
- `AdminPublishPanel` is **not** touched. Hiding `Unpublish` on non-
  live is semantically correct (nothing to unpublish) and consistent
  with how hidden-vs-disabled applies to an action that has no
  meaning off-state. Naming this explicitly closes the consistency
  question without scope creep.

### Admin styles — `apps/web/src/styles/_admin.scss`

- Add a `[aria-disabled="true"]` selector scoped to
  `.secondary-button` (or a `.secondary-button.is-disabled` class,
  chosen at implementation time — plan commits to the *rule shape*,
  not the selector) that matches the existing native-`:disabled`
  browser rendering: reduced opacity, non-interactive cursor, no
  hover transform.
- Values must come from existing tokens. Do not introduce new color
  or opacity tokens; if no suitable opacity token exists, keep the
  value local with a one-line comment rather than adding a token
  for a single use.
- The rule applies to any `.secondary-button[aria-disabled="true"]`,
  not only inside the admin action row, so future admin buttons that
  adopt the pattern inherit it automatically. If that breadth proves
  too wide at review time, narrow the selector to the action-row
  ancestor.

### Helper-text span copy

- Not-live reason: `Publish this event to open the live game.` —
  trailing period to match sentence-style copy elsewhere in admin
  messages.
- Busy reason: `Working...` — single generic string, not
  branch-by-mutation (not `Saving...` vs `Publishing...`). The
  distinction between mutation kinds is already carried by the
  existing workspace mutation message; duplicating it here would
  drift over time.
- Copy lives as string constants in the same module as
  `getOpenLiveGameReason`. No new i18n infrastructure; the repo
  does not use a translation layer today.

### Unit tests — `tests/web/pages/AdminPage.test.tsx`

- For every existing `draft_only` fixture case, add assertions that
  the button is rendered, is keyboard-reachable (tab order), has
  `aria-disabled="true"`, and that the helper text
  `Publish this event to open the live game.` is present and
  referenced by the button's `aria-describedby`.
- For a workspace-busy fixture (e.g. a save-in-flight state), assert
  the button has `aria-disabled="true"` and the helper text
  `Working...` is present. One representative busy state is enough;
  do not enumerate every mutation kind.
- For a `live` fixture, assert the button has no `aria-disabled`
  attribute (or `aria-disabled="false"`) and no helper-text element
  is referenced.
- For a `live_with_draft_changes` fixture, assert the button is
  enabled (same as `live`) and the chip carries the existing
  `Draft changes not published` label from
  `getStatusLabel` — this guards against a reviewer asking whether
  draft-dirty should also disable the button.

### Unit tests — `tests/web/admin/useSelectedDraft.test.ts` (if the file already exists)

- No new cases required. The reconciliation rules from Slice 2 already
  ensure `status` refreshes after save/publish/unpublish; the reason
  text is a derived display value with no new state.

### E2E — `tests/e2e/admin-workflow.admin.spec.ts`

- Extend the existing reload-aware publish → unpublish → reload
  scenario with assertions that after unpublish the `Open live game`
  button:
  - is present
  - is tab-reachable (tab focus lands on it in sequence, i.e. it is
    not skipped the way a native-`disabled` element would be)
  - has `aria-disabled="true"`
  - has an `aria-describedby` whose target text is
    `Publish this event to open the live game.`
- Extend the post-publish assertion branch to confirm the same
  button no longer has `aria-disabled` and the helper-text element
  for that row is absent (or empty and unreferenced).
- Do not add a separate a11y test file. Co-locating the assertions in
  the existing reload-aware spec keeps coverage next to the behavior
  it regresses.

### UI review — `scripts/ui-review/capture-ui-review.cjs`

- If the existing capture already walks a `draft_only` admin state,
  no change is required. If it only captures `live`, add one
  `draft_only` capture so before/after screenshots for this PR show
  the new helper text. Implementer verifies at commit time; if the
  script needs a fixture change, that is an in-scope adjustment for
  this slice.

### Public attendee route

Unchanged. This slice is admin-owned.

## Intended Commit Boundaries

1. **`refactor(web): introduce aria-disabled reason pattern for Open
   live game.`** Implements the `getOpenLiveGameReason` helper, swaps
   both call sites from `disabled` to `aria-disabled` +
   `aria-describedby`, adds the helper-text spans, and adds the
   click guard. Adds the `_admin.scss` rule for the class-driven
   disabled visual. Updates the unit-test fixtures in the same
   commit because the behavior and tests must stay synchronized.
2. **`test(web): extend reload-aware admin e2e for non-live reason
   text.`** Adds the e2e assertions in
   `tests/e2e/admin-workflow.admin.spec.ts` for tab-reachability,
   `aria-disabled`, and the helper-text content. Kept separate from
   commit 1 so the e2e extension can be reviewed on its own and so a
   bisect can tell unit-level regressions apart from e2e-level
   regressions.
3. **`docs: land slice 3 and close the admin live-status plan.`**
   Flip this file's Status from `Proposed` to `Landed` with the
   implementing commit SHAs recorded inline. Flip the parent plan's
   Slice 3 Status to `Landed` and flip the parent plan's overall
   Status from `In progress` to `Landed` in the same commit. Remove
   the Tier 1 backlog entry `Admin live status must match public
   route availability` from `docs/backlog.md`. Update
   `docs/tracking/admin-ux-roadmap.md` so the
   `Align admin live status with public-route availability` section
   points to the landed state rather than an in-progress plan. No
   code changes in this commit.

Keep review-fix commits distinct from the feature commits above when
reviewer feedback surfaces corrections.

## Baseline Validation

Before the first edit, run and confirm green:

- `npm run lint`
- `npm run test -- AdminPage adminGameApi`
- `npm run build:web`
- `npm run test:e2e:admin` if the local runner is configured

Stop and report instead of editing if any baseline step fails.

## Named Self-Review Audits

From [docs/self-review-catalog.md](../self-review-catalog.md), applied
at the commit boundary noted in parentheses:

- **Frontend — Post-save reconciliation audit** (commit 1): the reason
  text is derived from `draft.status` and `isWorkspaceBusy`. Confirm
  no new client-side fan-out is introduced: after a save completes,
  the refreshed `status` from `loadSavedDraftStatus` must be what
  `getOpenLiveGameReason` sees on the next render, not a cached
  pre-save value.

Audits not in the catalog but required by this slice's surfaces,
listed under the frontend surface so the implementer runs them at the
commit boundary rather than rediscovering them at review time:

- **Frontend — Complete call-site coverage** (commit 1): both
  `Open live game` sites (workspace detail and event-list row) use
  the helper, both use `aria-disabled`, both wire `aria-describedby`
  to a stable id, and both include the click guard. A drift between
  the two sites reopens the exact bug this slice closes for one of
  them.
- **Frontend — Disabled-state accessibility audit** (commit 1): every
  disabled `Open live game` instance is tab-reachable,
  `aria-disabled="true"` is present, the associated helper text is
  in the DOM and referenced by `aria-describedby`, and the click
  handler does not navigate when the helper reports `disabled: true`.
  Verified in unit tests and in the e2e extension.
- **Frontend — Fixture parity** (commit 1): every existing admin
  fixture that covers a `draft_only` or busy state asserts the new
  reason text, not only the (now-removed) native `disabled`
  attribute. Fixtures that covered `live` state confirm the button
  has no `aria-disabled` attribute on the positive path.
- **CI — E2E runner inclusion** (commit 2): the extended spec is
  picked up by the admin e2e runner without configuration changes,
  and the existing reload-aware assertions continue to pass after
  the additions.
- **Runbook — Production smoke actuation** (commit 2): the existing
  production admin smoke covers the status round-trip end to end. No
  new smoke assertion is added — the helper-text UI is verified by
  local unit tests and the local e2e extension. Naming this here
  records the deferral so "smoke wasn't updated" is not a reviewer
  finding.

## Validation Commands Expected At Handoff

- `npm run lint`
- `npm run test`
- `npm run test:functions`
- `npm run build:web`
- `npm run test:e2e:admin`
- `npm run test:e2e:admin:production-smoke` against the deployed
  environment, or equivalent deployed verification that exercises the
  reload-aware assertions through the new reason-text UI

If `test:e2e:admin:production-smoke` cannot be run locally, call out
the exact blocker in the PR body per the Validation Honesty rule.

## UX Review Screenshots

This slice changes user-facing copy and visual disabled treatment at
two admin call sites. Per `docs/dev.md`, capture before/after
screenshots:

- before capture: current `draft_only` workspace detail and event-
  list row with the native-`disabled` button
- after capture: the same two routes and states showing the new
  helper text and class-driven disabled visual
- mobile viewport first, matching the attendee-flow convention even
  though this surface is admin-only

Screenshots live under `tmp/ui-review/` per repo convention, are
uploaded externally, and are referenced by URL in the PR body. No
image files are committed.

## Plan-to-PR Completion Gate

Slice 3 is `Landed` when all of the following hold:

- Every Goal, Required work, and Acceptance bar item in the parent
  plan's Slice 3 section is satisfied in the PR, or deferred in
  writing in this file with rationale.
- This file's Status line is flipped from `Proposed` to `Landed`
  with the implementing commit SHAs recorded inline, and the parent
  plan's Slice 3 Status is flipped to `Landed` with the same SHAs.
- The parent plan's overall Status line is flipped from
  `In progress` to `Landed`, since Slice 3 is the final slice.
- The Tier 1 backlog entry `Admin live status must match public
  route availability` in `docs/backlog.md` is removed (or moved to a
  landed-items section if one exists) in the same PR.
- `docs/tracking/admin-ux-roadmap.md` reflects the landed state of
  the admin live-status alignment, not the in-progress plan link.
- Every command listed in `Validation Commands Expected At Handoff`
  above ran with its result recorded in the PR body. Any command
  that could not run is called out explicitly with a reason.
- Before/after UX screenshots for both call sites are linked in the
  PR body.

## Non-Goals

- Introducing a `paused` status value, a pause operator action, or
  any new product behavior distinct from the existing publish/
  unpublish flow. `paused` is named in the parent plan's long-term
  end state and is deferred here for the same reason Slice 2
  deferred it: it requires a new operator action with its own audit
  semantics, and a non-live UX slice alone cannot define the
  "intent to restore" signal that separates paused from plain
  unpublish. When a later slice adds it, this slice's reason-text
  pattern is extended with one more string, not restructured.
- Migrating other admin buttons that use native `disabled` to the
  `aria-disabled` + helper-text pattern. Only the two `Open live
  game` sites are in scope. If the pattern proves useful elsewhere
  a separate slice generalizes it.
- Changing `AdminPublishPanel.tsx` `Unpublish` visibility semantics.
  Hidden-on-non-live is semantically correct for that action; this
  slice records that decision rather than changing it.
- Introducing an i18n or translation layer for the reason strings.
  The repo does not use one today, so string constants live inline.
- Changing the `status` contract, the view, the transport, or any
  RLS/RPC/migration. Slice 3 is UI-only.
- Dropping the transitional `isLive` and `hasBeenPublished` fields
  from the admin transport. Slice 2 deferred that cleanup; a later
  slice removes them once no consumer reads them.

## Rollback

If Slice 3 introduces a regression after deploy, revert the three
feature commits in reverse order (3 → 2 → 1). Each step leaves the
repo in a working state:

- Revert commit 3 first. This restores `Proposed` status on this
  file and on the parent plan's Slice 3 entry, restores the parent
  plan's overall `In progress` status, restores the Tier 1 backlog
  entry, and restores the admin-ux-roadmap pointer. No code change.
- Revert commit 2 next. This drops the extended e2e assertions. The
  existing reload-aware coverage from Slice 1/Slice 2 still passes.
- Revert commit 1 last. This restores the Slice 2 shape: native
  `disabled` on both `Open live game` sites driven by
  `isWorkspaceBusy || !selectedDraft.isLive`, no helper text, no
  `aria-describedby`, no class-driven disabled visual. The
  SCSS rule drop is a pure delete; no styles downstream depend on
  it.

Commit 1 is all-or-nothing across both call sites and the SCSS rule:
partial revert (e.g. only one of the two sites) would reintroduce the
cross-site drift the slice is designed to prevent.

## Related Docs

- [docs/plans/admin-live-status-plan.md](./admin-live-status-plan.md)
- [docs/plans/admin-live-status-slice-1-plan.md](./admin-live-status-slice-1-plan.md)
- [docs/plans/admin-live-status-slice-2-plan.md](./admin-live-status-slice-2-plan.md)
- [docs/backlog.md](../backlog.md)
- [docs/tracking/admin-ux-roadmap.md](../tracking/admin-ux-roadmap.md)
- [docs/self-review-catalog.md](../self-review-catalog.md)
