# M2 Phase 2.4.1 — Add Platform Admin Page On apps/site

## Status

Proposed. Tier 1–4 gate (no production smoke); production behavior
unchanged through this PR.

Sub-phase of M2 phase 2.4 — see
[`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella) for the
phase-level context, sequencing rationale, cross-sub-phase
invariants, phase-level Out of Scope, and cross-sub-phase risks.
This plan covers the per-PR contract for sub-phase 2.4.1 only.

**Position in sequence.** First of three serial sub-phases. Strictly
additive: this PR builds the new apps/site `/admin` page and the
supporting shared modules, but does not change Vercel routing, does
not touch e2e fixtures, and does not delete any apps/web code.
Production `/admin` continues to resolve to the legacy apps/web
`AdminPage` because
[`apps/web/vercel.json`](../../apps/web/vercel.json) still SPA-handles
`/admin/:path*` until 2.4.2's cutover.

**Single PR.** Branch-test sketch — apps/site: 2 new files
(`app/(authenticated)/admin/page.tsx`,
`lib/setupEvents.ts`) plus 1 modify
(`components/SharedClientBootstrap.tsx`); shared: 1 new
(`shared/events/draftCreation.ts`) + 1 modify
(`shared/events/index.ts`); apps/web: 1 modify
(`src/admin/draftCreation.ts` → binding shim). ~6 files total, all
additive or behavior-preserving (the apps/web shim re-exports the
extracted helpers from the same import path apps/web call sites
already use).

## Context

This is the first of three PRs that move the platform admin from
apps/web to apps/site. It builds the new admin page on apps/site
and lays down the supporting wiring, but does not yet change which
implementation production serves. After this PR lands, both
implementations of `/admin` exist in source: the legacy apps/web
`AdminPage` is still what production resolves through the Vercel
SPA fallback, and the new apps/site `/admin` is reachable on the
apps/site dev server but not from production. The next PR (2.4.2)
flips the Vercel proxy to make apps/site the live one.

The split exists so the production cutover (2.4.2, the only PR
under the production-smoke gate) can be reviewed and reverted in
isolation from the new-page implementation. Bundling them would
mean a regression in either piece of work blocks the other; keeping
them apart means each PR has one verb and one bisect target.

What this PR touches:

- The new admin page on apps/site — a fresh client-component
  implementation that mirrors the apps/web `AdminDashboardContent`
  state machine (sign-in, loading, unauthorized, signed-in
  workspace) but uses Next.js client-component idioms, plain CSS,
  and a slimmer state hook (deep-editing already moved to
  `/event/:slug/admin` in phase 2.2 and is reached by hard
  navigation).
- The apps/site bootstrap — gains a `setupEvents` side-effect import
  alongside the existing `setupAuth` import, so `shared/events/`
  providers register before the new page mounts.
- The starter-content helper — moves from apps/web-local to a
  shared module so both apps consume from one place. apps/web's
  existing import path keeps working through a thin re-export shim.

What this PR doesn't touch: Vercel routing, e2e fixtures, the
auth e2e proxy, the legacy apps/web admin module, `shared/urls`,
or any documentation that names URL ownership (the URL ownership
hasn't shifted yet — that's 2.4.2).

## Goal

Add the apps/site `/admin` page, the apps/site `setupEvents`
adapter, and the shared starter-content helper without changing
production routing or deleting any apps/web code. After this PR,
the apps/site `/admin` page renders correctly when visited on the
apps/site dev server (sign-in form when signed-out, "not allowlisted"
copy for non-admin users, event-list workspace for admin users)
with apps/site Sage Civic typography, and the page's ARIA / copy
matches the apps/web `AdminDashboardContent` baseline so the e2e
fixtures that 2.4.2 will retarget continue to find their locators.

## Cross-Cutting Invariants Touched

These are sub-phase-local. See the umbrella for cross-sub-phase
rules (ARIA / copy stability, deep-editor surface untouched, URL
contract progression, build-sequencing constraint).

- **Bootstrap-seam idempotency preserved.** The
  `<SharedClientBootstrap>` component gains a second side-effect
  import (`import "../lib/setupEvents";`) alongside the existing
  `setupAuth` import. Both modules are idempotent — `configureSharedAuth`
  and `configureSharedEvents` overwrite-on-second-call by design,
  per
  [`shared/auth/configure.ts:35`](../../shared/auth/configure.ts#L35).
  The bootstrap component must not gate either import behind state;
  both run unconditionally at module evaluation, before any
  descendant client component reads the providers.
- **Cross-app navigation uses hard navigation, never client-side
  navigation.** The new page's `Open workspace` and `Open live
  game` button handlers call
  `window.location.assign(routes.eventAdmin(slug))` /
  `window.location.assign(routes.game(slug))`, never
  `useRouter().replace(href)` or `<Link href>` from
  `next/navigation`. Same trap that bit M2 phase 2.3's first draft.
  The apps/site `/auth/callback` page uses `window.location.replace`
  for the same reason — see
  [`apps/site/app/(authenticated)/auth/callback/page.tsx:12-14`](../../apps/site/app/(authenticated)/auth/callback/page.tsx#L12).
  Note: the navigation targets resolve to apps/web in production via
  the proxy-rewrite topology, but apps/web doesn't own those URLs
  yet through 2.4.1 — they go through the existing apps/web SPA
  routes for the deep editor at `/event/:slug/admin` and the game
  at `/event/:slug/game`, both of which are unchanged from 2.2.
- **Trust boundary preserved.** Authoring writes (Create draft,
  Duplicate draft, Publish, Unpublish) flow through the four
  Edge Functions gated on
  [`authenticateEventOrganizerOrAdmin`](../../supabase/functions/_shared/event-organizer-auth.ts);
  the platform admin passes through the `is_root_admin()` branch.
  The new apps/site page's client gate (`useAuthSession()` +
  `getGameAdminStatus()`) is a UX gate, not the enforcement point.

## Naming

- New apps/site admin page:
  `apps/site/app/(authenticated)/admin/page.tsx`. `'use client'`
  Next.js page; lives inside the `(authenticated)` route group so
  `<SharedClientBootstrap>` has already run before
  `useAuthSession` mounts. The `(authenticated)` prefix is
  convention-only (Next.js route groups do not appear in URLs).
- New apps/site events setup module:
  `apps/site/lib/setupEvents.ts`. Module-level side effect that
  calls `configureSharedEvents(...)` once with the full
  [`SharedEventsProviders`](../../shared/events/configure.ts#L9)
  shape — `{ getClient, getConfig, getMissingConfigMessage,
  getFeaturedGameSlug }`. Mirrors
  [`apps/web/src/lib/setupEvents.ts`](../../apps/web/src/lib/setupEvents.ts);
  the only apps/site-specific wiring is the `featuredGameSlug` import
  source — see Contracts section.
- New shared starter helper:
  `shared/events/draftCreation.ts`. Houses
  `createStarterDraftContent` and `createDuplicatedDraftContent`
  (both currently in
  [`apps/web/src/admin/draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)).
  Re-exported through
  [`shared/events/index.ts`](../../shared/events/index.ts).

**Not created in 2.4.1:** per-component split of the apps/site
`/admin` page. The plan defers split until the file exceeds
~250 lines of substantive JSX during implementation; if it stays
under, single `page.tsx` is the shipped shape per AGENTS.md
"Don't add features … beyond what the task requires."

## Contracts

**`apps/site/app/(authenticated)/admin/page.tsx`.** `'use client'`.
Default-exports the page component. State machine mirrors
[`apps/web/src/admin/AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx)'s
top-level branches verbatim because the e2e specs that 2.4.2 will
retarget assert against the visible copy and ARIA roles each branch
emits:

- `sessionState.status === "missing_config"` → renders the
  `getMissingSupabaseConfigMessage()` text in a state stack.
  Verified by:
  [`apps/web/src/admin/AdminDashboardContent.tsx:100-107`](../../apps/web/src/admin/AdminDashboardContent.tsx#L100).
- `sessionState.status === "loading"` → renders "Restoring admin
  session" + disabled "Checking session..." button. Verified by:
  [`apps/web/src/admin/AdminDashboardContent.tsx:109-118`](../../apps/web/src/admin/AdminDashboardContent.tsx#L109).
- `sessionState.status === "signed_out"` → renders `<SignInForm>`
  from [`shared/auth`](../../shared/auth) inline with magic-link
  copy mirroring apps/web's `ADMIN_SIGN_IN_COPY`
  ([`AdminDashboardContent.tsx:20-28`](../../apps/web/src/admin/AdminDashboardContent.tsx#L20)).
  Submit calls `requestMagicLink(email, { next: routes.admin })`.
- `sessionState.status === "signed_in"` and
  `getGameAdminStatus()` resolves false → renders the heading
  `This account is not allowlisted for game authoring.` Required
  by
  [`tests/e2e/admin-production-smoke.spec.ts:51-55`](../../tests/e2e/admin-production-smoke.spec.ts#L51).
- `sessionState.status === "signed_in"` and admin → renders the
  `Game draft access` heading + the `Event workspace summary`
  aria region (with `${liveCount} live` text) + the event-card
  list. Each card carries `aria-label="${eventName} event"`,
  exposes the live/draft status text (`Live v<N>` or `Draft only`),
  and renders three buttons: `Open live game` (disabled when not
  live, with `aria-disabled="true"` + `aria-describedby` pointing
  at reason text `Publish this event to open the live game.`),
  `Open workspace`, and `Duplicate`. Plus a `Create draft`
  affordance.

Button handler contracts:

- **`Open workspace` click** →
  `window.location.assign(routes.eventAdmin(slug))`. Hard
  navigation; the apps/web deep editor (phase 2.2) handles
  the URL.
- **`Open live game` click (enabled state)** →
  `window.location.assign(routes.game(slug))`. Hard navigation.
- **`Create draft` click** →
  `saveDraftEvent(createStarterDraftContent(existingDrafts))`,
  then on success
  `window.location.assign(routes.eventAdmin(savedDraft.slug))`.
  Failure path stays on the list with an inline error message
  and does not navigate. Behavior diff vs. apps/web's existing
  `createDraft` (which merged the new draft into the dashboard
  list and let the user click Open workspace afterward): the
  apps/site flow navigates immediately because the deep editor is
  now a separate app and "stay on /admin and click Open workspace"
  is a redundant extra click. The error path is identical.
- **`Duplicate` click** → `loadDraftEvent(eventId)` →
  `saveDraftEvent(createDuplicatedDraftContent(source, existingDrafts))`,
  same success-path hard navigation as Create.
- **`Sign out` click** → `signOutAuth()`, error surfaced inline.

State management: a single hook (sub-phase-local helper, e.g.,
`useAdminEventList`) that mirrors the relevant slice of apps/web's
[`useAdminDashboard.ts`](../../apps/web/src/admin/useAdminDashboard.ts)
without the deep-editor selected-draft state (no `useSelectedDraft`,
no inline event-detail editing — those are in apps/web's deep
editor at `/event/:slug/admin`). The effect that fetches admin
status + drafts on `signed_in` transition uses the `isCancelled`
pattern from
[`useAdminDashboard.ts:88-143`](../../apps/web/src/admin/useAdminDashboard.ts#L88).
Next.js's strict-mode double-mount must not produce two parallel
fetches racing into `setDashboardState`.

**`apps/site/lib/setupEvents.ts`.** Module-level side effect calling
`configureSharedEvents(...)` once with the full
[`SharedEventsProviders`](../../shared/events/configure.ts#L9) shape
(verified by:
[`shared/events/configure.ts:9-18`](../../shared/events/configure.ts#L9)
— all four fields are required; `configureSharedEvents({ getClient })`
fails type-check). The four providers wire as follows:

- `getClient` → `getBrowserSupabaseClient` from
  [`apps/site/lib/supabaseBrowser.ts`](../../apps/site/lib/supabaseBrowser.ts)
  (shipped by 2.3).
- `getConfig` → `getSupabaseConfig` from the same module.
- `getMissingConfigMessage` → `getMissingSupabaseConfigMessage` from
  the same module.
- `getFeaturedGameSlug` → `() => featuredGameSlug` where
  `featuredGameSlug` imports from
  [`shared/game-config/constants.ts`](../../shared/game-config/constants.ts#L2)
  (the source of truth — apps/web's
  [`setupEvents.ts:2`](../../apps/web/src/lib/setupEvents.ts#L2)
  resolves to the same constant via its
  [`apps/web/src/data/games.ts`](../../apps/web/src/data/games.ts)
  re-export, but apps/site has no equivalent app-local data module
  and importing the shared constant directly is the right layering).

The provider exists on apps/site even though no apps/site consumer
calls `listPublishedGameSummaries` today — the new `/admin` page calls
`listDraftEventSummaries`, not the published variant, and the
`getFeaturedGameSlug` provider only feeds the published-summary sort
in
[`shared/events/published.ts:67`](../../shared/events/published.ts#L67).
Supplying it satisfies the shared-module contract without inventing
an apps/site-specific featured-slug concept; if a future apps/site
surface ever lists published events, the sort is already wired.

Mirrors
[`apps/web/src/lib/setupEvents.ts`](../../apps/web/src/lib/setupEvents.ts)
in shape; the only apps/site-specific wiring is the
`featuredGameSlug` import source. No exports.

**`apps/site/components/SharedClientBootstrap.tsx` (modify).** Add
`import "../lib/setupEvents";` immediately after the existing
`import "../lib/setupAuth";` line. No JSX or export changes. Order
between the two imports does not matter (both idempotent, neither
depends on the other).

**`shared/events/draftCreation.ts` (new).** Houses
`createStarterDraftContent(existingDrafts: DraftEventSummary[]):
AuthoringGameDraftContent` and
`createDuplicatedDraftContent(source: DraftEventDetail, existingDrafts:
DraftEventSummary[]): AuthoringGameDraftContent`. Body identical to
apps/web's current
[`apps/web/src/admin/draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)
modulo import paths (the helper consumes the
`AuthoringGameDraftContent` validator from
[`shared/game-config/`](../../shared/game-config), unchanged). The
`DraftEventSummary` and `DraftEventDetail` types must be reachable
from `shared/events/`; if they aren't already exported, this PR adds
a re-export through `shared/events/index.ts` rather than expanding
the shared surface mid-port. Verified by reading
[`shared/events/index.ts`](../../shared/events/index.ts) at
implementation time and recording the resolution in the PR body.

**`shared/events/index.ts` (modify).** Add re-exports for
`createStarterDraftContent` and `createDuplicatedDraftContent` (and
the type re-exports per the resolution above).

**`apps/web/src/admin/draftCreation.ts` (modify).** Replace the file
body with a thin binding-module shim:
`export { createStarterDraftContent, createDuplicatedDraftContent }
from "../../../../shared/events/draftCreation";` (or equivalent
re-export shape). Mirrors the binding-module pattern from M1 phase
1.4's
[`apps/web/src/lib/adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts).
The shim exists so apps/web's existing imports (currently
[`useAdminDashboard.ts:17-19`](../../apps/web/src/admin/useAdminDashboard.ts#L17),
deleted in 2.4.3, and any other call site) continue to resolve
through the same path and 2.4.1 stays purely behavior-preserving
for apps/web.

## Files To Touch

### New

- `apps/site/app/(authenticated)/admin/page.tsx` — apps/site admin
  page per the Contracts section.
- `apps/site/lib/setupEvents.ts` — apps/site events adapter.
- `shared/events/draftCreation.ts` — extracted starter helpers.

### Modify

- [`apps/site/components/SharedClientBootstrap.tsx`](../../apps/site/components/SharedClientBootstrap.tsx)
  — add `setupEvents` side-effect import.
- [`shared/events/index.ts`](../../shared/events/index.ts) — add
  re-exports for the new helpers and any type re-exports needed by
  the shared module.
- [`apps/web/src/admin/draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)
  — replace body with a binding-module shim re-exporting from
  `shared/events/draftCreation.ts`.

### Files intentionally not touched

Reserved for sibling sub-phases:

- [`apps/web/vercel.json`](../../apps/web/vercel.json) — 2.4.2.
- [`tests/e2e/admin-workflow.admin.spec.ts`](../../tests/e2e/admin-workflow.admin.spec.ts),
  [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts),
  [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs),
  [`scripts/ui-review/capture-ui-review.cjs`](../../scripts/ui-review/capture-ui-review.cjs)
  — 2.4.2.
- [`apps/web/src/pages/AdminPage.tsx`](../../apps/web/src/pages/AdminPage.tsx)
  + the `apps/web/src/admin/Admin*.tsx` /
  `useAdminDashboard.ts` platform-admin module + its tests +
  [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx) admin
  route branches — 2.4.3.
- [`shared/urls/`](../../shared/urls) deprecation +
  [`tests/shared/urls/`](../../tests/shared/urls) cleanup — 2.4.3.
- apps/web SCSS prune — 2.4.3.
- [`docs/architecture.md`](../architecture.md),
  [`docs/operations.md`](../operations.md),
  [`docs/dev.md`](../dev.md),
  [`README.md`](../../README.md) URL-ownership and module-ownership
  edits — 2.4.2 (URL ownership) and 2.4.3 (module ownership).

Sibling files referenced verbatim from 2.3:

- [`apps/site/lib/setupAuth.ts`](../../apps/site/lib/setupAuth.ts)
  / [`supabaseBrowser.ts`](../../apps/site/lib/supabaseBrowser.ts)
  / [`apps/site/app/(authenticated)/layout.tsx`](../../apps/site/app/(authenticated)/layout.tsx)
  — verbatim reuse from 2.3; no edit.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree and a feature branch
   (not `main`). Re-read
   [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella),
   [`scoping/m2-phase-2-4.md`](./scoping/m2-phase-2-4.md), and 2.3's
   apps/site adapter pair at
   [`apps/site/lib/setupAuth.ts`](../../apps/site/lib/setupAuth.ts) +
   [`apps/site/lib/supabaseBrowser.ts`](../../apps/site/lib/supabaseBrowser.ts)
   so the new `setupEvents.ts` mirrors the established pattern.
   Re-read apps/web's
   [`AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx)
   for the exact ARIA / copy contract the new page must preserve.
2. **Baseline validation.** Run `npm run lint`, `npm test`,
   `npm run test:functions`, `npm run build:web`, and
   `npm run build:site`. All must pass before any edit.
3. **Shared starter helper extraction.** Create
   `shared/events/draftCreation.ts` with bodies copied from
   apps/web's
   [`draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts);
   adjust import paths. Add re-exports to
   [`shared/events/index.ts`](../../shared/events/index.ts);
   include any type re-exports needed by the shared module.
   Replace
   [`apps/web/src/admin/draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)
   body with a binding-module shim. Run `npm run lint` +
   `npm run build:web` to confirm apps/web's existing call sites
   resolve unchanged.
4. **apps/site setupEvents adapter + bootstrap update.** Create
   `apps/site/lib/setupEvents.ts` per the Contracts section; edit
   [`apps/site/components/SharedClientBootstrap.tsx`](../../apps/site/components/SharedClientBootstrap.tsx)
   to add the `import "../lib/setupEvents";` line.
   `npm run build:site` confirms the imports resolve.
5. **apps/site `/admin` page.** Create
   `apps/site/app/(authenticated)/admin/page.tsx` per the Contracts
   section. Implement the sign-in / loading / unauthorized /
   signed-in-allowlisted state stack with the ARIA / copy stability
   invariant in mind — every locator the existing e2e specs use
   must resolve. `npm run build:site` confirms the route compiles.
6. **Local apps/site exercise.** Run `npm run dev:site` and visit
   `http://localhost:3000/admin`. Walk every state branch:
   - Signed-out: confirm in-place sign-in form renders with apps/site
     Sage Civic typography (Fraunces heading, Inter body) and apps/site
     brand colors. Diff the visible copy + ARIA against
     [`apps/web/src/admin/AdminDashboardContent.tsx:120-130`](../../apps/web/src/admin/AdminDashboardContent.tsx#L120) —
     heading text, eyebrow, button labels, field id all match.
   - Signed-in non-admin: confirm `This account is not allowlisted
     for game authoring.` heading renders.
   - Signed-in admin: confirm `Game draft access` heading + `Event
     workspace summary` aria region + event cards all render with
     the labels specified in the Contracts section. Click `Open
     workspace` and `Open live game` to verify the buttons fire
     `window.location.assign(...)` (the navigation will hit
     apps/site 404 because the apps/site dev server doesn't proxy to
     apps/web — that's expected; production resolves via the proxy
     topology).
   - The cross-app navigation buttons cannot be exercised end-to-end
     in the apps/site dev server alone; that's the integration
     surface 2.4.2 will cover.
7. **Validation re-run.** All baseline commands from step 2 must
   pass. `npm test` confirms unit + shared-suite changes (the
   shared starter helper extraction may need a tiny test reshuffle
   if a unit test imports from the apps/web path; the binding shim
   keeps the path live, so usually no edit is needed).
8. **Code-review feedback loop.** Walk the diff from a
   senior-reviewer stance against every Cross-Cutting Invariant
   above and every Self-Review Audit named below. Apply fixes in
   place; commit review-fix changes separately when that clarifies
   history per
   [`AGENTS.md`](../../AGENTS.md) Review-Fix Rigor.
9. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
   Invariant Touched, Validation Gate command, and Self-Review Audit
   named in this plan. Confirm each is satisfied in the PR or
   deferred with rationale. Flip Status from `Proposed` to `Landed`
   in the same PR — this sub-phase has no production-smoke gate so
   the regular Plan-to-PR Completion Gate applies. Update the
   umbrella's Sub-phase Status table row for 2.4.1 to `Landed` with
   the PR link.
10. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters
    (suggested: `feat(m2-2.4.1): add platform admin page on apps/site`).
    Validation section lists every command actually run.
    Remaining Risk: production behavior unchanged through this PR;
    apps/site `/admin` is reachable only on the apps/site dev
    server until 2.4.2's cutover.

## Commit Boundaries

Per [`AGENTS.md`](../../AGENTS.md) "Planning Depth":

1. **Shared starter helper extraction + apps/web binding shim.**
   New `shared/events/draftCreation.ts`,
   [`shared/events/index.ts`](../../shared/events/index.ts) re-export
   additions, and the apps/web
   [`draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)
   shim. Single commit; behavior-preserving for apps/web.
2. **apps/site `/admin` scaffold.** New
   `apps/site/app/(authenticated)/admin/page.tsx`,
   `apps/site/lib/setupEvents.ts`, and the
   [`SharedClientBootstrap.tsx`](../../apps/site/components/SharedClientBootstrap.tsx)
   one-line edit. Single commit. Production behavior unchanged
   because apps/web `vercel.json` still SPA-handles `/admin*`.
3. **Review-fix commits.** As needed during step 8, kept distinct
   from the substantive implementation commits.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final.
- `npm run test:functions` — pass on baseline; pass on final
  (unchanged Edge Function source).
- `npm run build:web` — pass on baseline; pass on final
  (verifies apps/web binding shim resolves).
- `npm run build:site` — pass on baseline; pass on final
  (verifies new apps/site admin page compiles, route group
  resolves, setupEvents side-effect import is well-formed).
- pgTAP suite — pass on baseline; pass on final via
  `npm run test:db`. No SQL change in this PR.
- **Local apps/site exercise per Execution step 6** —
  load-bearing pre-merge for ARIA / copy stability. The exercise
  diffs the new page's visible copy and ARIA roles against
  [`apps/web/src/admin/AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx)
  per state branch. This is the strongest pre-merge integration
  check for the cross-sub-phase ARIA-stability invariant; 2.4.2's
  e2e exercise depends on this being correct.

**No production smoke gate.** Production `/admin` continues to
resolve to the legacy apps/web `AdminPage` through this PR.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md).

### Frontend (apps/site)

- **Silent-no-op on missing lookup**
  ([catalog §Silent-no-op on missing lookup audit](../self-review-catalog.md#L420)).
  Event list `listDraftEventSummaries()` empty result must render
  an empty-state message that distinguishes "no drafts exist" from
  "lookup failed." `getGameAdminStatus()` similarly distinguishes
  "false (not allowlisted)" from "RPC failed."
- **Error-surfacing for user-initiated mutations**
  ([catalog §Error-surfacing for user-initiated mutations](../self-review-catalog.md#L266)).
  Create / duplicate click handlers surface failures inline. The
  failure path does not navigate.
- **Effect cleanup audit**
  ([catalog §Effect cleanup audit](../self-review-catalog.md#L287)).
  The `signed_in` → admin-status-fetch → drafts-list-fetch effect
  uses the `isCancelled` pattern from
  [`useAdminDashboard.ts:88-143`](../../apps/web/src/admin/useAdminDashboard.ts#L88).
  Next.js strict-mode double-mount must not produce parallel fetches
  racing into `setDashboardState`.
- **Token bucket discipline.** No new SCSS / CSS surface in
  apps/site for the new admin page. Layout reuses the existing
  globals.css typography (`next/font` Inter / Fraunces) and the
  brand tokens emitted by `themeToStyle.ts` on `<html>`. Local
  raw values for one-off layout dimensions (event-card spacing,
  sign-out button positioning) per AGENTS.md "keep one-off layout
  values local" — no new structural-token surface.

### CI / build

- **CLI / tooling pinning audit**
  ([catalog §CLI / tooling pinning audit](../self-review-catalog.md#L331)).
  No new
  [`apps/site/package.json`](../../apps/site/package.json)
  dependencies. The new admin page consumes only existing apps/site
  dependencies plus shared modules.
- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../self-review-catalog.md#L354)).
  `shared/events/draftCreation.ts` is a copy-then-shim, not a Git
  rename — describe in the PR body so reviewers don't flag the
  apps/web file as rewritten. The new apps/site page is a fresh
  implementation, not a copy of the apps/web component (different
  framework idioms; same ARIA / copy contract).

## Documentation Currency PR Gate

This sub-phase's surface is internal — no URL ownership change, no
module ownership change. Doc updates this branch carries:

- [`shared/events/README.md`](../../shared/events/README.md) — if
  the README documents the public surface, add the new
  `createStarterDraftContent` / `createDuplicatedDraftContent`
  entries. If not, no edit.
- [`docs/architecture.md`](../architecture.md) — no edit.
  URL-ownership and module-ownership shifts land in 2.4.2 / 2.4.3.
- [`docs/operations.md`](../operations.md),
  [`docs/dev.md`](../dev.md),
  [`README.md`](../../README.md) — no edits.
- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella) —
  Sub-phase Status table row for 2.4.1 updates to `Landed` with
  the PR link when this PR merges.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status table row for 2.4 stays `Proposed` (the umbrella
  flips when all three sub-phases land).
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR per the regular Plan-to-PR Completion Gate.

## Out Of Scope

Sub-phase-local exclusions. See umbrella for phase-level Out of
Scope (which applies here too).

- **Vercel proxy flip.** 2.4.2.
- **e2e spec retargeting + auth e2e proxy widening + UI review
  retargeting.** 2.4.2.
- **apps/web platform-admin deletion.** 2.4.3.
- **`shared/urls` deprecation.** 2.4.3.
- **URL-ownership / module-ownership doc edits.** 2.4.2 / 2.4.3.

## Risk Register

Sub-phase-local risks. See umbrella for cross-sub-phase risks.

- **ARIA / copy stability slip.** A typo or simplification in the
  new page's copy or aria attributes silently fails 2.4.2's e2e
  spec retargeting (after the URL flip, the locators won't match).
  Mitigation: Execution step 6's local exercise diffs every state
  branch against
  [`apps/web/src/admin/AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx);
  reviewer diff check matches the exact strings.
- **Cross-app navigation client-side regression.** Using
  `useRouter().replace(href)` or `<Link href>` from
  `next/navigation` would silently break in production. Mitigation:
  invariant locked above; the
  [`apps/site/app/(authenticated)/auth/callback/page.tsx`](../../apps/site/app/(authenticated)/auth/callback/page.tsx)
  precedent uses `window.location.replace`; reviewer catches any
  `useRouter` import in the new page.
- **`createStarterDraftContent` binding shim drift.** The apps/web
  shim must keep both helper symbols re-exported. Future apps/web
  changes to either helper must update the shared module, not the
  shim. Mitigation: shim contains only the re-export, no logic.
- **`shared/events/` type re-export over-expansion.** If
  `DraftEventSummary` / `DraftEventDetail` types aren't already
  exported from `shared/events/`, this PR adds re-exports through
  `shared/events/index.ts`. Risk is over-exporting types that the
  shared layer doesn't intend to make public. Mitigation: add
  re-exports only for types the new helpers' signatures require;
  document the resolution in the PR body so the next reviewer
  understands why the surface widened.

## Backlog Impact

- No backlog entries open or close in this PR. The
  organizer-managed-agent-assignment unblock records with M2's
  terminal PR (2.5).

## Related Docs

- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) — umbrella;
  cross-sub-phase context, sequencing rationale, cross-sub-phase
  invariants and risks.
- [`m2-phase-2-4-2-plan.md`](./m2-phase-2-4-2-plan.md) — sibling
  sub-phase (cutover); this sub-phase's ARIA / copy contract is the
  pre-condition for 2.4.2's e2e retargeting.
- [`m2-phase-2-4-3-plan.md`](./m2-phase-2-4-3-plan.md) — sibling
  sub-phase (deletion).
- [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) — Landed sibling;
  apps/site adapter pair, `(authenticated)` route group, and
  `<SharedClientBootstrap>` precedent this sub-phase extends.
- [`shared-events-foundation.md`](./shared-events-foundation.md) —
  M1 phase 1.4 plan; binding-module pattern for the
  `apps/web/src/admin/draftCreation.ts` shim.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules.
