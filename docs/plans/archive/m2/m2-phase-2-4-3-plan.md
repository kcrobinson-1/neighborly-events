# M2 Phase 2.4.3 — Delete Legacy apps/web Platform Admin

## Status

Landed. Tier 1–4 gate (no production smoke); deleted
already-unreachable code.

Sub-phase of M2 phase 2.4 — see
[`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella) for the
phase-level context, sequencing rationale, cross-sub-phase invariants,
phase-level Out of Scope, and cross-sub-phase risks.

**Position in sequence.** Third and final sub-phase. Cannot draft or
merge until 2.4.2 has flipped to `Landed` (post-smoke green) — see
the umbrella's "2.4.2 reverted but 2.4.3 already merged" risk.
Strict-serial sequencing is enforced at PR-open time: the
implementer confirms the umbrella's Sub-phase Status row for 2.4.2
reads `Landed` before opening this PR.

**Single PR.** Branch-test sketch — apps/web: 6 file deletes
(`pages/AdminPage.tsx`, `admin/AdminDashboardContent.tsx`,
`admin/AdminPageShell.tsx`, `admin/AdminEventWorkspace.tsx`,
`admin/useAdminDashboard.ts`, plus the transitional
`admin/draftCreation.ts` shim landed in 2.4.1) + ~4 corresponding
test deletes under `tests/web/admin/` + 2-3 modifies (`App.tsx`,
possibly SCSS partials, possibly `apps/web/src/admin/README.md`
if it mentions the deleted helpers); shared: 3 modifies
(`shared/urls/routes.ts`, `shared/urls/validateNextPath.ts`,
`shared/urls/index.ts`); tests: 2 modifies
(`tests/shared/urls/routes.test.ts`,
`tests/shared/urls/validateNextPath.test.ts`); docs: 1-2 modifies
(`docs/architecture.md` apps/web admin module description rewrite,
plus README currency check). ~18 files total. Pure deletion of dead
code post-cutover; no observable production behavior change.

## Context

This is the cleanup PR. After 2.4.2 flipped production `/admin*` to
apps/site, the legacy apps/web `AdminPage` and its supporting module
(`AdminDashboardContent`, `AdminPageShell`, `AdminEventWorkspace`,
`useAdminDashboard`) became dead code — still in source, still
compiled, still type-checked, but unreachable through the proxy.
This PR removes them, along with the deprecated route family in
`shared/urls/` (`routes.adminEvent`, `routes.adminEventsPrefix`,
`matchAdminEventPath`, the `/admin/events/${string}` `AppPath`
branch) that those files were the last consumers of, and any SCSS
partials whose only consumers were the deleted components.

This is the third PR because it can't safely land without the
production cutover (2.4.2) being verifiably green first. If 2.4.2
revealed a problem post-deploy and was reverted, the legacy
apps/web `AdminPage` would need to remain in source as the working
implementation. Splitting the deletion out as its own PR — one that
only opens after 2.4.2 is `Landed` — preserves that revert path.

What this PR touches:

- The apps/web platform-admin module — deletes the page-level
  `AdminPage`, the dashboard content shell, the chrome shell, the
  selected-event workspace, the dashboard state hook, and the
  transitional `draftCreation.ts` binding shim landed in 2.4.1
  (orphan after `useAdminDashboard.ts` deletes — the test that
  imported through it already moved to `tests/shared/events/`
  in 2.4.1). The per-event admin (`EventAdminPage` /
  `EventAdminWorkspace` from phase 2.2) is **untouched** — the
  names differ by word order (`AdminEventWorkspace` deletes;
  `EventAdminWorkspace` stays).
- apps/web's [`App.tsx`](../../../../apps/web/src/App.tsx) — the
  `pathname === routes.admin` and `matchAdminEventPath` branches
  remove, along with the `AdminPage` and `matchAdminEventPath`
  imports.
- `shared/urls/` — the deprecated admin-event route family removes
  (matchers, builder, prefix constant, and the corresponding
  `AppPath` union branch). The `validateNextPath` allow-list loses
  its `matchAdminEventPath` branch.
- The `shared/urls` test files — the "admin event routes" describe
  block deletes from `routes.test.ts`; the two
  `/admin/events/...` accept-list cases in
  `validateNextPath.test.ts` move to the rejected-inputs list (the
  new behavior is "fall through to `routes.home`").
- apps/web SCSS partials — any selector whose only consumer was
  the deleted platform-admin components prunes; selectors the
  per-event deep editor still uses stay verbatim.
- [`docs/architecture.md`](../../../architecture.md) — the apps/web
  admin module description rewrites to describe only the
  per-event deep editor (the platform-admin description deletes).

What this PR doesn't touch: any apps/site source (the new admin
page is owned by 2.4.1; routing was flipped by 2.4.2);
`apps/web/vercel.json` (already correct post-2.4.2); the e2e specs
(already retargeted in 2.4.2); the auth e2e proxy (already widened
in 2.4.2); UI review script (already retargeted in 2.4.2); Edge
Functions; migrations.

## Goal

Delete the apps/web platform-admin module and the `shared/urls`
deprecated admin-event route family, leaving apps/web's URL
footprint purely event-scoped (`/event/:slug/game/*` and
`/event/:slug/admin`). The legacy `/admin/events/:eventId` URL family
404s honestly post-PR per
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
Cross-Phase Decisions §7. No production behavior change beyond the
already-unreachable dead code being removed.

## Cross-Cutting Invariants Touched

These are sub-phase-local. See the umbrella for cross-sub-phase
rules.

- **`shared/urls` / apps/web `App.tsx` build-sequencing
  constraint.** The
  [`shared/urls/routes.ts`](../../../../shared/urls/routes.ts) deprecation
  cannot land in a tip that still has apps/web `App.tsx` importing
  the deprecated symbols. The implementer locks the commit order at
  edit time so every commit's tip passes `npm run build:web`.
  Recommended order: delete apps/web admin handlers first (which
  removes `App.tsx`'s `matchAdminEventPath` import), then prune
  `shared/urls`. The inverse works if the apps/web `App.tsx` edit
  lands in the same commit as the shared deprecation. Either order
  keeps every commit green.
- **Deep-editor surface untouched.** The per-event admin
  ([`EventAdminPage`](../../../../apps/web/src/pages/EventAdminPage.tsx) +
  [`EventAdminWorkspace`](../../../../apps/web/src/admin/EventAdminWorkspace.tsx)
  + the dependency set named in the umbrella) is not edited or
  deleted. Self-review confirms no file from that set appears in
  the deletion list. The platform-admin
  `AdminEventWorkspace.tsx` deletes; the per-event
  `EventAdminWorkspace.tsx` stays. Names differ by word order; this
  is the recurring trap to watch.
- **SCSS prune over-deletion guard.** Any SCSS selector deleted
  must have zero surviving consumers. The grep audit (`grep -rn
  "<selector>" apps/web/src` against the surviving file set) is
  the load-bearing check. Selectors the per-event deep editor still
  consumes stay verbatim.

## Naming

No new files. All edits are to files that already exist, plus
deletions.

## Contracts

**`shared/urls/routes.ts` (modify).** Remove three exports —
`routes.adminEventsPrefix`, `routes.adminEvent`, and
`matchAdminEventPath` — and the `/admin/events/${string}` branch
from the `AppPath` type. `routes.admin`, `routes.eventAdmin`, and
the rest of the table stay. Verified by:
[`shared/urls/routes.ts:29-31,61-88`](../../../../shared/urls/routes.ts#L29).

**`shared/urls/validateNextPath.ts` (modify).** Remove the
`matchAdminEventPath` import (line 2) and the branch at lines 51-53.
`routes.admin` stays in the allow-list. Verified by:
[`shared/urls/validateNextPath.ts:1-9,51-53`](../../../../shared/urls/validateNextPath.ts#L1).

**`shared/urls/index.ts` (modify).** Drop the `matchAdminEventPath`
re-export. Verified by:
[`shared/urls/index.ts:13`](../../../../shared/urls/index.ts#L13).

**`apps/web/src/App.tsx` (modify).** Drop the
`pathname === routes.admin` branch (currently lines 24-25, the
`AdminPage` render path), the `matchAdminEventPath(pathname)` branch
(currently lines 28-36, the `/admin/events/:eventId` legacy URL
branch), and the corresponding `AdminPage` and `matchAdminEventPath`
imports. Verified by:
[`apps/web/src/App.tsx:9,24-36`](../../../../apps/web/src/App.tsx#L9).

**Apps/web platform-admin file deletions.**

- [`apps/web/src/pages/AdminPage.tsx`](../../../../apps/web/src/pages/AdminPage.tsx)
  — sole consumer was `App.tsx`'s removed admin branches.
- [`apps/web/src/admin/AdminDashboardContent.tsx`](../../../../apps/web/src/admin/AdminDashboardContent.tsx)
  — sole consumer was `AdminPage.tsx`.
- [`apps/web/src/admin/AdminPageShell.tsx`](../../../../apps/web/src/admin/AdminPageShell.tsx)
  — sole consumer was `AdminPage.tsx`.
- [`apps/web/src/admin/AdminEventWorkspace.tsx`](../../../../apps/web/src/admin/AdminEventWorkspace.tsx)
  — platform-admin selected-event workspace; sole consumer was
  `AdminDashboardContent.tsx`. **Distinct from
  `EventAdminWorkspace.tsx`** (per-event admin from 2.2, stays).
- [`apps/web/src/admin/useAdminDashboard.ts`](../../../../apps/web/src/admin/useAdminDashboard.ts)
  — sole consumer of the hook value is `AdminPage.tsx`. The file
  *also* re-exports four types (`AdminPublishState`,
  `AdminQuestionSaveState`, `AdminSelectedDraftState`,
  `AdminUnpublishState`) from `./useSelectedDraft` per a transitional
  shim landed alongside the 2.2 selected-draft extraction; the
  surviving `EventAdminWorkspace.tsx` and `AdminPublishPanel.tsx`
  import those types through the re-export. The deletion forces a
  forced behavior-preserving import-path bump in those two files
  (the type-only imports point at `./useSelectedDraft` directly).
  This is the only deep-editor surface edit in this PR; the umbrella's
  "deep-editor surface untouched" invariant is otherwise honored.

**Apps/web platform-admin test deletions.** Walk
`tests/web/admin/*` at edit time to find tests of the deleted
source files. Expected (verified at edit time against the merged-in
state, not necessarily exhaustive):

- `tests/web/admin/AdminDashboardContent.test.tsx`
- `tests/web/admin/AdminEventWorkspace.test.tsx`
- `tests/web/admin/useAdminDashboard.test.ts`
- `tests/web/admin/AdminPageShell.test.tsx` (if present)

Tests of files that stay (`useEventAdminWorkspace.test.ts`,
`useSelectedDraft.test.ts`, `eventDetails.test.ts`,
`questionBuilder.test.ts`, etc.) are **not deleted**.

**`tests/shared/urls/routes.test.ts` (modify).** Delete the entire
"admin event routes" describe block at lines 11-27 and the
`matchAdminEventPath` import on line 3. Verified by:
[`tests/shared/urls/routes.test.ts:1-27`](../../../../tests/shared/urls/routes.test.ts#L1).

**`tests/shared/urls/validateNextPath.test.ts` (modify).** Delete
the two `it("accepts an admin event selection route", …)` /
`it("accepts a URL-encoded admin event id", …)` cases at lines
65-75 and add equivalent rejection cases (`/admin/events/some-id`
and `/admin/events/id%20with%20spaces` should both fall through to
`routes.home`) into the `rejectedInputs` list at the top of the
file. The torture-test array at line 134 keeps `/admin` (still a
valid allow-listed path); no edit there. Verified by:
[`tests/shared/urls/validateNextPath.test.ts:65-75`](../../../../tests/shared/urls/validateNextPath.test.ts#L65).

**Apps/web SCSS prune (audit-driven).** Selectors used only by the
deleted platform-admin components prune. The audit procedure:

1. Identify selectors in the deleted source files (grep `class=` or
   `className=` patterns in the deleted `.tsx` files at pre-edit
   time; record the candidate set).
2. For each candidate selector, run `grep -rn "<selector>"
   apps/web/src` against the surviving file set (post-deletion).
3. Selector with zero surviving consumers → delete from its SCSS
   partial (or delete the entire partial if no selector survives).
4. Selector with surviving consumers (typically the deep editor
   reuses some — `.section-heading`, `.admin-state-stack` may or
   may not depend on the deep editor's surviving usage) → keep.
5. Update [`apps/web/src/styles.scss`](../../../../apps/web/src/styles.scss)
   to drop any `@use` for a fully-deleted partial.

The candidate set is determined at edit time, not pre-locked in
this plan, because the apps/web SCSS structure can shift between
plan-drafting and implementation. The audit procedure is the
load-bearing rule.

**`docs/architecture.md` (modify).** The apps/web admin module
description (currently lines 190-195, "Hosts the admin event-list
shell, sign-in, and event-workspace pieces consumed by the
platform-admin route … under `/admin`. Also hosts
`EventAdminWorkspace` and the per-event hook…") rewrites to
describe only the per-event deep-editor surface. The
platform-admin sentences delete; the per-event-admin sentences
stay. Other apps/web admin module references (line 30 for
transitional ownership, line 95 for the `/admin` route adapter,
lines 619-640 for the "web app now includes a dedicated /admin
route" section) — most of these are URL-ownership references that
2.4.2 owned; this PR re-checks them against the merged-in state
and updates any line that still describes apps/web platform-admin
ownership. Concrete line edits identified at edit time against the
merged state.

**`README.md` (currency check).** Confirm no surviving line
describes apps/web as owning `/admin`. If 2.4.2 missed any, fix in
this PR.

## Files To Touch

### Delete (apps/web source)

- [`apps/web/src/pages/AdminPage.tsx`](../../../../apps/web/src/pages/AdminPage.tsx)
- [`apps/web/src/admin/AdminDashboardContent.tsx`](../../../../apps/web/src/admin/AdminDashboardContent.tsx)
- [`apps/web/src/admin/AdminPageShell.tsx`](../../../../apps/web/src/admin/AdminPageShell.tsx)
- [`apps/web/src/admin/AdminEventWorkspace.tsx`](../../../../apps/web/src/admin/AdminEventWorkspace.tsx)
- [`apps/web/src/admin/useAdminDashboard.ts`](../../../../apps/web/src/admin/useAdminDashboard.ts)
- [`apps/web/src/admin/draftCreation.ts`](../../../../apps/web/src/admin/draftCreation.ts)
  — transitional binding shim landed in 2.4.1; sole apps/web source
  consumer (`useAdminDashboard.ts`) deletes in this same commit;
  the test that imported through the shim moved to
  `tests/shared/events/draftCreation.test.ts` in 2.4.1; nothing
  else references the shim. Confirm with
  `grep -rn "from \"./draftCreation\"\|from \"\.\./admin/draftCreation\"\|from \".*apps/web/src/admin/draftCreation\"" .`
  at pre-edit gate; the only hits should be the about-to-delete
  `useAdminDashboard.ts` and the
  [`apps/web/src/admin/README.md:38`](../../../../apps/web/src/admin/README.md#L38)
  descriptive mention (handle the README mention as a doc edit
  in this PR).

### Delete (apps/web tests)

- `tests/web/admin/AdminDashboardContent.test.tsx`
- `tests/web/admin/AdminEventWorkspace.test.tsx`
- `tests/web/admin/useAdminDashboard.test.ts`
- `tests/web/admin/AdminPageShell.test.tsx` (if present)

The exact set is determined by `find tests/web/admin -name
"*.test.*"` at edit time; if a test file imports from any of the
deleted source files, it deletes; if it imports only from surviving
deep-editor source, it stays.

### Modify

- [`apps/web/src/App.tsx`](../../../../apps/web/src/App.tsx) — remove
  admin route branches and imports.
- [`shared/urls/routes.ts`](../../../../shared/urls/routes.ts) — remove
  deprecated route family.
- [`shared/urls/validateNextPath.ts`](../../../../shared/urls/validateNextPath.ts)
  — remove `matchAdminEventPath` import + branch.
- [`shared/urls/index.ts`](../../../../shared/urls/index.ts) — drop
  re-export.
- [`tests/shared/urls/routes.test.ts`](../../../../tests/shared/urls/routes.test.ts)
  — drop describe block + import.
- [`tests/shared/urls/validateNextPath.test.ts`](../../../../tests/shared/urls/validateNextPath.test.ts)
  — move two cases to rejected list.
- [`apps/web/src/styles/`](../../../../apps/web/src/styles/) — SCSS
  prune per the audit.
- [`apps/web/src/styles.scss`](../../../../apps/web/src/styles.scss) —
  drop `@use` for any fully-deleted partial.
- [`apps/web/src/admin/README.md`](../../../../apps/web/src/admin/README.md)
  — update or scrub any line that names the deleted platform-admin
  files (`AdminPage`, `AdminDashboardContent`, `AdminPageShell`,
  `AdminEventWorkspace`, `useAdminDashboard`, `draftCreation`).
  Line 38 currently mentions `draftCreation.ts` as part of
  starter-content responsibility; rewrite to describe the surviving
  per-event admin scope. Audit the rest of the README for
  platform-admin references at edit time.
- [`docs/architecture.md`](../../../architecture.md) — apps/web admin
  module description rewrite + URL-ownership currency check.
- [`README.md`](../../../../README.md) — currency check.
- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella) —
  Sub-phase Status table row for 2.4.3 updates to `Landed` with
  PR link; umbrella's Status flips from `Proposed` to `Landed`
  (all three sub-phases now landed).
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status table row for 2.4 flips to `Landed` and gains a PR
  link (the umbrella's terminal sub-phase carries the
  phase-row flip).
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.

### Files intentionally not touched

- Apps/site source — owned by 2.4.1; no edit.
- [`apps/web/vercel.json`](../../../../apps/web/vercel.json) — already
  correct post-2.4.2.
- Auth e2e proxy / e2e specs / UI review script — already
  retargeted by 2.4.2.
- Apps/web deep-editor surface (`EventAdminPage.tsx`,
  `EventAdminWorkspace.tsx`, `useEventAdminWorkspace.ts`,
  `AdminEventDetailsForm.tsx`, `AdminQuestionEditor.tsx`,
  `AdminQuestionList.tsx`, `AdminQuestionFields.tsx`,
  `AdminOptionEditor.tsx`, `AdminPublishPanel.tsx`,
  `useSelectedDraft.ts`, `eventDetails.ts`, `publishChecklist.ts`,
  `questionBuilder.ts`, `questionFormMapping.ts`,
  `questionStructure.ts`, plus `tests/web/admin/*` for those
  files) — preserved verbatim.
- (Removed from "not touched" — see Delete list. The shim's only
  apps/web source consumer was `useAdminDashboard.ts` deleted by
  this PR; the test that imported through the shim moved to
  `tests/shared/events/draftCreation.test.ts` in 2.4.1; nothing
  else imports it.)
- Edge Functions, migrations,
  [`shared/auth/`](../../../../shared/auth),
  [`shared/db/`](../../../../shared/db),
  [`shared/events/`](../../../../shared/events) — no change.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree, feature branch (not
   `main`), and that **2.4.2 has flipped to `Landed`** (post-smoke
   green) per the umbrella's Sub-phase Status table. Re-read the
   umbrella, 2.4.2's plan, and the M2 milestone Cross-Phase
   Decision §7 ("404 honestly"). Re-run the reality-check gate:
   confirm no surviving file outside the deletion list still
   imports from any of the about-to-delete files (`grep -rn`); the
   only expected importers are `App.tsx` (which deletes its imports
   in this PR) and the about-to-delete `AdminPage.tsx` chain.
2. **Baseline validation.** Run `npm run lint`, `npm test`,
   `npm run test:functions`, `npm run build:web`, and
   `npm run build:site`. All must pass before any edit.
3. **Apps/web platform-admin source + test deletes + App.tsx edit.**
   Delete the six source files (the five Admin* / useAdminDashboard
   files plus the transitional
   [`apps/web/src/admin/draftCreation.ts`](../../../../apps/web/src/admin/draftCreation.ts)
   shim), the corresponding test files (audited per "Files To
   Touch — Delete (apps/web tests)"), and edit
   [`apps/web/src/App.tsx`](../../../../apps/web/src/App.tsx) to remove
   the two admin branches and the `AdminPage` /
   `matchAdminEventPath` imports. `npm run build:web` confirms
   apps/web compiles.

   **Sequencing note for the next step.** This commit's tip removes
   the only call sites of `matchAdminEventPath`; commit 4's
   `shared/urls` deprecation can then land cleanly. Inverse order
   (deprecate `shared/urls` first) is also valid if the implementer
   bundles the `App.tsx` edit into the same commit; either way,
   every commit's tip must pass `npm run build:web`.
4. **`shared/urls` deprecation + test cleanup.** Edit
   [`shared/urls/routes.ts`](../../../../shared/urls/routes.ts) to remove
   `adminEventsPrefix`, `adminEvent`, `matchAdminEventPath`, and
   the `/admin/events/${string}` `AppPath` branch. Edit
   [`shared/urls/validateNextPath.ts`](../../../../shared/urls/validateNextPath.ts)
   and [`shared/urls/index.ts`](../../../../shared/urls/index.ts) to
   drop the corresponding imports / re-exports. Update
   [`tests/shared/urls/routes.test.ts`](../../../../tests/shared/urls/routes.test.ts)
   (delete the "admin event routes" describe block) and
   [`tests/shared/urls/validateNextPath.test.ts`](../../../../tests/shared/urls/validateNextPath.test.ts)
   (move the two `/admin/events/...` cases into `rejectedInputs`).
   `npm test` confirms the suite stays green.
5. **SCSS prune.** Run the audit per the Contracts section:
   identify candidate selectors in the deleted source files,
   `grep -rn` each against the surviving file set, delete
   zero-consumer selectors and any fully-emptied partials, drop
   `@use` lines for fully-deleted partials from
   [`apps/web/src/styles.scss`](../../../../apps/web/src/styles.scss).
   Selectors with surviving consumers (typically the deep editor
   reuses some) stay verbatim. `npm run build:web` confirms SCSS
   still compiles and no surviving consumer references a deleted
   selector.
6. **Local apps/web smoke (visit deep editor).** Run
   `npm run dev:web` and visit
   `http://localhost:5173/event/${seeded-slug}/admin` directly. The
   deep editor must still render — phase 2.2 surface is untouched,
   but the SCSS prune from step 5 could have inadvertently dropped
   a still-consumed selector. Compare visible appearance to a
   pre-edit screenshot if any visual change is suspected.
7. **Validation re-run.** All baseline commands from step 2 must
   pass. `npm test` confirms the unit + shared-suite changes.
   `npm run build:web` confirms apps/web compiles after deletes.
   `npm run build:site` confirms apps/site is unaffected.
8. **Documentation pass.** Edit
   [`docs/architecture.md`](../../../architecture.md) per the Contracts
   section: rewrite the apps/web admin module description to
   describe only the per-event deep editor; URL-ownership
   currency-check (most should already be correct from 2.4.2).
   Check [`README.md`](../../../../README.md) similarly. Walk the
   [`AGENTS.md`](../../../../AGENTS.md) "Doc Currency Is a PR Gate"
   triggers — apps/web module ownership shifted, so
   `docs/architecture.md` updates here; URL ownership shifted
   already in 2.4.2; product / dev / operations / open-questions /
   backlog do not change in this PR.
9. **Update umbrella + milestone Status.** Edit
   [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella):
   Sub-phase Status row for 2.4.3 updates to `Landed` with the PR
   link; umbrella's top-level Status flips from `Proposed` to
   `Landed` because all three sub-phases will be landed when this
   PR merges. Edit
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md):
   Phase Status table row for 2.4 flips to `Landed` and gains the
   PR link. The epic's M2 row stays `Proposed` (its flip lands
   with 2.5).
10. **Code-review feedback loop.** Walk the diff against every
    Cross-Cutting Invariant Touched and every Self-Review Audit
    named below. Apply fixes; commit review-fix changes separately
    per AGENTS.md Review-Fix Rigor.
11. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation Gate command, and Self-Review Audit.
    Confirm each is satisfied or deferred with rationale. Flip
    Status from `Proposed` to `Landed` in this PR per the regular
    Plan-to-PR Completion Gate (no production-smoke gate).
12. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../../../.github/pull_request_template.md).
    Title under 70 characters
    (suggested: `feat(m2-2.4.3): delete legacy apps/web platform admin`).
    Validation section lists every command run.
    Target Shape Evidence: this is a deletion PR — describe the
    final responsibility split (apps/web admin module is now
    per-event-only; `shared/urls` no longer carries the deprecated
    family). Include before/after file count or LOC for the
    apps/web admin module if useful (e.g.,
    `apps/web/src/admin/` shrank from N files to M).
    Remaining Risk: the SCSS prune is the highest-risk piece of
    this PR — name the audit procedure ran and what selectors
    pruned.

## Commit Boundaries

1. **Apps/web platform-admin deletes + `App.tsx` edit.** The six
   source deletes (five Admin* / useAdminDashboard files plus the
   transitional `draftCreation.ts` shim), the corresponding test
   deletes, and the `App.tsx` admin-branch / import removals.
   Single commit; this is the load-bearing legacy-removal commit.
   The shim deletes alongside its sole consumer
   (`useAdminDashboard.ts`) so the tip stays buildable.
2. **`shared/urls` deprecation + test cleanup.**
   [`shared/urls/routes.ts`](../../../../shared/urls/routes.ts),
   [`validateNextPath.ts`](../../../../shared/urls/validateNextPath.ts),
   [`index.ts`](../../../../shared/urls/index.ts) edits +
   [`tests/shared/urls/routes.test.ts`](../../../../tests/shared/urls/routes.test.ts)
   describe-block delete +
   [`tests/shared/urls/validateNextPath.test.ts`](../../../../tests/shared/urls/validateNextPath.test.ts)
   case migration. Single commit; depends on commit 1's `App.tsx`
   edit having removed the last call sites of the deprecated
   symbols.
3. **SCSS prune.** Selector deletes from SCSS partials, `@use`
   line drops from `styles.scss`, and any fully-deleted partial
   files. Single commit.
4. **Documentation pass + umbrella + milestone Status.**
   [`docs/architecture.md`](../../../architecture.md) apps/web admin
   module description rewrite, [`README.md`](../../../../README.md)
   currency check, umbrella's Sub-phase row update + top-level
   Status flip to `Landed`,
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   Phase Status row flip to `Landed` with PR link, this plan's
   Status flip from `Proposed` to `Landed`. Single commit.
5. **Review-fix commits.** As needed, kept distinct per AGENTS.md
   Review-Fix Rigor.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. The
  `tests/shared/urls/*` and `tests/web/admin/*` changes must pass
  the suite.
- `npm run test:functions` — pass on baseline; pass on final
  (unchanged).
- `npm run build:web` — pass on baseline; pass on final at every
  commit's tip (the build-sequencing constraint).
- `npm run build:site` — pass on baseline; pass on final
  (unchanged; apps/site is independent).
- pgTAP suite — pass on baseline; pass on final via
  `npm run test:db`. No SQL change.
- **Local apps/web deep-editor smoke per Execution step 6** —
  load-bearing pre-merge for the SCSS prune. Visible regression
  on the per-event admin (`/event/:slug/admin`) is the failure
  mode the SCSS audit guards against; the local visit catches it
  before merge.

**No production smoke gate.** Production behavior was already
unchanged after 2.4.2's cutover; this PR deletes already-unreachable
code. The Tier 1–4 gate is sufficient.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../../../self-review-catalog.md).

### Frontend (apps/web removal)

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../../../self-review-catalog.md#L354)).
  apps/web platform-admin file deletes are pure deletes, not
  renames; the deep-editor files staying in place are non-edits.
  The PR description names this so the diff narrative is "legacy
  apps/web admin module deletes; deep-editor stays" rather than
  "apps/web admin module rewrites." Flag the
  `AdminEventWorkspace.tsx` (deletes) vs.
  `EventAdminWorkspace.tsx` (stays) distinction explicitly —
  reviewers must classify each file by name carefully.

### CI / build

- **Rename-aware diff classification.** (Already covered above
  but worth repeating for the CI-side: `tests/web/admin/*`
  deletes are pure deletes; the surviving tests are non-edits.)

### Runbook

- **Silent-no-op on missing lookup audit**
  ([catalog §Silent-no-op on missing lookup audit](../../../self-review-catalog.md#L420)).
  The SCSS prune is the silent-no-op risk in this PR: dropping a
  selector with a surviving consumer would visually regress the
  per-event admin without any test failure. Mitigation: the audit
  procedure is `grep -rn` per candidate selector; Execution step 6
  visits the deep editor in the dev server and confirms visual
  parity.

## Documentation Currency PR Gate

- [`docs/architecture.md`](../../../architecture.md) — apps/web admin
  module description rewrite (delete platform-admin sentences;
  preserve deep-editor sentences); URL-ownership currency check.
- [`README.md`](../../../../README.md) — currency check; edit only if
  needed.
- [`docs/operations.md`](../../../operations.md),
  [`docs/dev.md`](../../../dev.md),
  [`docs/product.md`](../../../product.md),
  [`docs/open-questions.md`](../../../open-questions.md),
  [`docs/backlog.md`](../../../backlog.md) — no edit. URL ownership
  shifts already documented by 2.4.2; backlog impact records with
  M2's terminal PR (2.5).
- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella) —
  Sub-phase Status row for 2.4.3 updates to `Landed` with PR
  link; umbrella's top-level Status flips from `Proposed` to
  `Landed`.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status row for 2.4 flips to `Landed` and gains a PR link.
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR per the regular Plan-to-PR Completion Gate.

## Out Of Scope

Sub-phase-local exclusions. See umbrella for phase-level Out of
Scope.

- **Vercel proxy edits.** 2.4.2 (already merged before this PR
  drafts).
- **e2e spec changes.** 2.4.2.
- **apps/site source.** 2.4.1 (already merged).
- **`/admin/events/:eventId` redirect.** Resolved 404-honestly per
  Cross-Phase Decisions §7; no slug-from-id redirect added.
- **`shared/urls` further restructuring.** Only the deprecated
  admin-event family removes in this PR; the rest of the module
  stays as 2.4.2 left it.

## Risk Register

Sub-phase-local risks. See umbrella for cross-sub-phase risks.

- **2.4.2 reverted but 2.4.3 already merged.** This PR's
  Pre-Edit Gate enforces strict-serial sequencing: confirm 2.4.2's
  Sub-phase Status row reads `Landed` (post-smoke) before opening
  this PR. If 2.4.2 reverts post-2.4.3 merge, the legacy apps/web
  `AdminPage` is gone and the cutover can't be reverted to the
  legacy state. Mitigation: do not open this PR until 2.4.2 is
  `Landed`. The umbrella's Status table is the source of truth
  for sequencing.
- **SCSS prune over-deletion silently regresses the deep editor.**
  Apps/web platform-admin SCSS selectors may overlap with
  deep-editor selectors that survive in
  [`EventAdminWorkspace.tsx`](../../../../apps/web/src/admin/EventAdminWorkspace.tsx)
  and friends. Dropping a selector still consumed by the deep
  editor would silently regress the per-event admin's appearance
  without any test failure. Mitigation: Contracts section pins the
  audit procedure (`grep -rn` per candidate selector against the
  surviving file set); Execution step 6's local apps/web smoke
  visits the deep editor and catches visible regression before
  merge.
- **Build-sequencing slip leaves a commit with broken types.** If
  the implementer reorders commits 1 and 2 carelessly,
  `shared/urls` deprecation could land while apps/web `App.tsx`
  still imports the deprecated symbols, and a bisect tip would
  fail `npm run build:web`. Mitigation: Contracts section names
  the constraint; the recommended order is "delete apps/web admin
  handlers + `App.tsx` edit first, then prune `shared/urls`";
  CI runs `npm run build:web` on every commit pushed.
- **`AdminEventWorkspace.tsx` vs. `EventAdminWorkspace.tsx`
  word-order confusion.** The platform-admin
  `AdminEventWorkspace.tsx` deletes; the per-event
  `EventAdminWorkspace.tsx` stays. A careless implementer could
  delete the wrong one. Mitigation: Cross-Cutting Invariant
  Touched names the trap explicitly; reviewer diff check sees
  both filenames and confirms which one moved out of the diff.

## Backlog Impact

- "Organizer-managed agent assignment" stays *unblocked but not
  landed*. Records with M2's terminal PR (2.5) per the milestone
  doc; this PR does not edit
  [`docs/backlog.md`](../../../backlog.md).
- No new backlog items expected from this PR.

## Related Docs

- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) — umbrella;
  this PR's Status flip + umbrella's terminal flip.
- [`m2-phase-2-4-1-plan.md`](./m2-phase-2-4-1-plan.md) — sibling
  Landed sub-phase (added the new page).
- [`m2-phase-2-4-2-plan.md`](./m2-phase-2-4-2-plan.md) — sibling
  Landed sub-phase (cutover; must be Landed before this PR
  drafts).
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone; Phase Status row for 2.4 flips to `Landed` in this
  PR's PR.
- [`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md) — Landed sibling;
  the per-event deep-editor surface this PR must not delete.
- [`docs/self-review-catalog.md`](../../../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../../../AGENTS.md) — workflow rules.
