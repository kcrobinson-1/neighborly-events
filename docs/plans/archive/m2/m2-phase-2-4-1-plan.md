# M2 Phase 2.4.1 — Add Platform Admin Page On apps/site

## Status

Landed. Tier 1–4 gate (no production smoke); production behavior
unchanged through this PR.

Sub-phase of M2 phase 2.4 — see
[`m2-phase-2-4-plan.md`](/docs/plans/archive/m2/m2-phase-2-4-plan.md) (umbrella) for the
phase-level context, sequencing rationale, cross-sub-phase
invariants, phase-level Out of Scope, and cross-sub-phase risks.
This plan covers the per-PR contract for sub-phase 2.4.1 only.

**Position in sequence.** First of three serial sub-phases. Strictly
additive: this PR builds the new apps/site `/admin` page and the
supporting shared modules, but does not change Vercel routing, does
not touch e2e fixtures, and does not delete any apps/web code.
Production `/admin` continues to resolve to the legacy apps/web
`AdminPage` because
[`apps/web/vercel.json`](/apps/web/vercel.json) still SPA-handles
`/admin/:path*` until 2.4.2's cutover.

**Single PR.** Branch-test sketch — apps/site: 2 new files
(`app/(authenticated)/admin/page.tsx`,
`lib/setupEvents.ts`) plus 2 modifies
(`components/SharedClientBootstrap.tsx`,
`app/globals.css` extension per the Token bucket discipline
contract); shared: 1 new (`shared/events/draftCreation.ts`) + 1
modify (`shared/events/index.ts`); apps/web: 1 modify
(`src/admin/draftCreation.ts` → transitional binding shim, deleted
by 2.4.3); tests: 1 move
(`tests/web/admin/draftCreation.test.ts` →
`tests/shared/events/draftCreation.test.ts`, Git rename with the
import path updated) plus a conditional 1 modify
(`vitest.config.ts` if its include pattern doesn't already cover
`tests/shared/**`). **~8-9 files total** across 5 subsystems
(apps/site page source, apps/site CSS, shared/events extraction,
apps/web binding, test relocation), all additive or
behavior-preserving for apps/web. Substantive logic LOC is moderate
— the new admin page is ~200-250 lines of JSX + state; the
globals.css extension is ~80-150 lines; the shared helper is a
copy-then-shim with no logic change. The PR is at the upper edge
of what AGENTS.md "PR-count predictions need a branch test" treats
as one cohesive sub-phase; the work is tightly coupled (page +
CSS ship together so the dev-server render the
[`AGENTS.md`](/AGENTS.md) "Bans on surface require rendering
the consequence" rule mandates is observable in this single bisect
target), so further splitting would fragment one verb across two
PRs without review-coherence gain.

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
rules (test-asserted-locator stability, manual side-by-side review,
deep-editor surface untouched, URL contract progression,
build-sequencing constraint).

- **Bootstrap-seam idempotency preserved.** The
  `<SharedClientBootstrap>` component gains a second side-effect
  import (`import "../lib/setupEvents";`) alongside the existing
  `setupAuth` import. Both modules are idempotent — `configureSharedAuth`
  and `configureSharedEvents` overwrite-on-second-call by design,
  per
  [`shared/auth/configure.ts:35`](/shared/auth/configure.ts#L35).
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
  [`apps/site/app/(authenticated)/auth/callback/page.tsx:12-14`](/apps/site/app/(authenticated)/auth/callback/page.tsx#L12).
  Note: the navigation targets resolve to apps/web in production via
  the proxy-rewrite topology, but apps/web doesn't own those URLs
  yet through 2.4.1 — they go through the existing apps/web SPA
  routes for the deep editor at `/event/:slug/admin` and the game
  at `/event/:slug/game`, both of which are unchanged from 2.2.
- **Trust boundary preserved.** Authoring writes (Create draft,
  Duplicate draft, Publish, Unpublish) flow through the four
  Edge Functions gated on
  [`authenticateEventOrganizerOrAdmin`](/supabase/functions/_shared/event-organizer-auth.ts);
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
  [`SharedEventsProviders`](/shared/events/configure.ts#L9)
  shape — `{ getClient, getConfig, getMissingConfigMessage,
  getFeaturedGameSlug }`. Mirrors
  [`apps/web/src/lib/setupEvents.ts`](/apps/web/src/lib/setupEvents.ts);
  the only apps/site-specific wiring is the `featuredGameSlug` import
  source — see Contracts section.
- New shared starter helper:
  `shared/events/draftCreation.ts`. Houses
  `createStarterDraftContent` and `createDuplicatedDraftContent`
  (both currently in
  [`apps/web/src/admin/draftCreation.ts`](/apps/web/src/admin/draftCreation.ts)).
  Re-exported through
  [`shared/events/index.ts`](/shared/events/index.ts).

**Not created in 2.4.1:** per-component split of the apps/site
`/admin` page. The plan defers split until the file exceeds
~250 lines of substantive JSX during implementation; if it stays
under, single `page.tsx` is the shipped shape per AGENTS.md
"Don't add features … beyond what the task requires."

## Contracts

**`apps/site/app/(authenticated)/admin/page.tsx`.** `'use client'`.
Default-exports the page component. The page renders inside a
top-level `<div className="admin-shell">` (or analogous wrapping
element) — the wrapper class is the load-bearing scope hook for the
`apps/site/app/globals.css` extension below; without it the page
renders unstyled (raw browser default for the form, the buttons,
and the layout) because every admin-relevant rule in globals.css
is scoped under `.admin-shell` per the Token bucket discipline
section.

State machine mirrors
[`apps/web/src/admin/AdminDashboardContent.tsx`](/apps/web/src/admin/AdminDashboardContent.tsx)'s
top-level branches at the structural level — same status branches,
same overall page shape. The umbrella's
**test-asserted-locator stability** invariant pins the specific
strings the e2e fixtures match against (re-derive from the spec
files at pre-edit gate); the rest is **best-effort fidelity**, with
apps/web's copy as the default unless an apps/site idiom argues
otherwise. The state branches:

- `sessionState.status === "missing_config"` → renders the
  `getMissingSupabaseConfigMessage()` text in a state stack.
  Modeled on
  [`apps/web/src/admin/AdminDashboardContent.tsx:100-107`](/apps/web/src/admin/AdminDashboardContent.tsx#L100).
- `sessionState.status === "loading"` → renders a "session
  restoring" state stack with a disabled placeholder button.
  Modeled on
  [`apps/web/src/admin/AdminDashboardContent.tsx:109-118`](/apps/web/src/admin/AdminDashboardContent.tsx#L109).
- `sessionState.status === "signed_out"` → renders `<SignInForm>`
  from [`shared/auth`](/shared/auth) inline with magic-link
  copy modeled on apps/web's `ADMIN_SIGN_IN_COPY`
  ([`AdminDashboardContent.tsx:20-28`](/apps/web/src/admin/AdminDashboardContent.tsx#L20)).
  Submit calls `requestMagicLink(email, { next: routes.admin })`.
- `sessionState.status === "signed_in"` and
  `getGameAdminStatus()` resolves false → renders the heading
  **`This account is not allowlisted for game authoring.`**
  (test-asserted-locator; exact-match required per
  [`tests/e2e/admin-production-smoke.spec.ts:51-55`](/tests/e2e/admin-production-smoke.spec.ts#L51)).
- `sessionState.status === "signed_in"` and admin → renders the
  workspace surface. **Test-asserted locators (exact-match
  required)**: the `Game draft access` heading, the `Event
  workspace summary` aria region, `${eventName} event` card
  aria-labels, `Open workspace` and `Open live game` button names,
  `${liveCount} live` summary text, `Live v…` / `Draft only`
  status strings, the `aria-disabled="true"` +
  `aria-describedby` discipline on the disabled `Open live game`
  button, and the `Publish this event to open the live game.`
  reason text. **Other surface (best-effort)**: a third button per
  card for duplicating drafts (apps/web names this `Duplicate
  draft`; implementer chooses between matching apps/web verbatim
  or shortening to `Duplicate` based on what reads better in
  apps/site idiom — no e2e assertion pins the label), a `Create
  draft` affordance for the empty state and toolbar, and a
  sign-out control in the page chrome.

Re-derive the test-asserted-locator list against the merged-in
spec files at the pre-edit gate; the lists in this contract are
plan-time accurate but the spec files are the source of truth and
2.4.2 will edit them.

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
- **Duplicate-draft button click** (label per implementer choice
  — see best-effort note above) → `loadDraftEvent(eventId)` →
  `saveDraftEvent(createDuplicatedDraftContent(source, existingDrafts))`,
  same success-path hard navigation as Create.
- **`Sign out` click** → `signOutAuth()`, error surfaced inline.

State management: a single hook (sub-phase-local helper, e.g.,
`useAdminEventList`) that mirrors the relevant slice of apps/web's
[`useAdminDashboard.ts`](/apps/web/src/admin/useAdminDashboard.ts)
without the deep-editor selected-draft state (no `useSelectedDraft`,
no inline event-detail editing — those are in apps/web's deep
editor at `/event/:slug/admin`). The effect that fetches admin
status + drafts on `signed_in` transition uses the `isCancelled`
pattern from
[`useAdminDashboard.ts:88-143`](/apps/web/src/admin/useAdminDashboard.ts#L88).
Next.js's strict-mode double-mount must not produce two parallel
fetches racing into `setDashboardState`.

**`apps/site/lib/setupEvents.ts`.** Module-level side effect calling
`configureSharedEvents(...)` once with the full
[`SharedEventsProviders`](/shared/events/configure.ts#L9) shape
(verified by:
[`shared/events/configure.ts:9-18`](/shared/events/configure.ts#L9)
— all four fields are required; `configureSharedEvents({ getClient })`
fails type-check). The four providers wire as follows:

- `getClient` → `getBrowserSupabaseClient` from
  [`apps/site/lib/supabaseBrowser.ts`](/apps/site/lib/supabaseBrowser.ts)
  (shipped by 2.3).
- `getConfig` → `getSupabaseConfig` from the same module.
- `getMissingConfigMessage` → `getMissingSupabaseConfigMessage` from
  the same module.
- `getFeaturedGameSlug` → `() => featuredGameSlug` where
  `featuredGameSlug` imports from
  [`shared/game-config/constants.ts`](/shared/game-config/constants.ts#L2)
  (the source of truth — apps/web's
  [`setupEvents.ts:2`](/apps/web/src/lib/setupEvents.ts#L2)
  resolves to the same constant via its
  [`apps/web/src/data/games.ts`](/apps/web/src/data/games.ts)
  re-export, but apps/site has no equivalent app-local data module
  and importing the shared constant directly is the right layering).

The provider exists on apps/site even though no apps/site consumer
calls `listPublishedGameSummaries` today — the new `/admin` page calls
`listDraftEventSummaries`, not the published variant, and the
`getFeaturedGameSlug` provider only feeds the published-summary sort
in
[`shared/events/published.ts:67`](/shared/events/published.ts#L67).
Supplying it satisfies the shared-module contract without inventing
an apps/site-specific featured-slug concept; if a future apps/site
surface ever lists published events, the sort is already wired.

Mirrors
[`apps/web/src/lib/setupEvents.ts`](/apps/web/src/lib/setupEvents.ts)
in shape; the only apps/site-specific wiring is the
`featuredGameSlug` import source. No exports.

**`apps/site/components/SharedClientBootstrap.tsx` (modify).** Add
`import "../lib/setupEvents";` immediately after the existing
`import "../lib/setupAuth";` line. No JSX or export changes. Order
between the two imports does not matter (both idempotent, neither
depends on the other).

**`apps/site/app/globals.css` (extension).** Adds a scoped CSS
surface for the new admin page. Without this extension the page
renders mostly unstyled — the existing 2.3 globals.css scopes its
sign-in selectors to `.auth-callback-shell` (verified by:
[`apps/site/app/globals.css:64,74,88,104`](/apps/site/app/globals.css#L64))
and has no admin-specific rules at all, so the shared
[`<SignInForm>`](/shared/auth/SignInForm.tsx) classes
(`.signin-stack`, `.section-heading`, `.signin-form`,
`.signin-field`, `.signin-input`, `.primary-button`) plus the
admin-only state and event-card layout would render with browser
defaults. The "render the consequence" check (Execution step 6)
confirms the styled outcome before merge per
[`AGENTS.md`](/AGENTS.md) "Bans on surface require rendering
the consequence."

Selectors the extension adds, scoped under `.admin-shell` so the
new surface stays isolated from the existing landing / auth-callback
surfaces:

- `.admin-shell` — outer container (full-height padded shell). Same
  shape as the existing `.landing-shell` / `.auth-callback-shell`
  rule at
  [`apps/site/app/globals.css:52-56`](/apps/site/app/globals.css#L52);
  extend the comma-list to add `.admin-shell` rather than duplicate
  the rule body.
- Sign-in branch reuse — extend the existing scoped sign-in selectors
  ([`apps/site/app/globals.css:64,74,88,104,123,128`](/apps/site/app/globals.css#L64)
  — `.signin-stack`, `.section-heading p`, `.primary-button`,
  hover, focus-visible) to also match `.admin-shell .…` so the
  signed-out branch's `<SignInForm>` renders identically to the
  `/auth/callback` shell. No body duplication; comma-list extension
  only.
- `.admin-shell .signin-form` / `.signin-field` / `.signin-field-label`
  / `.signin-input` — minimal field layout for the form body.
  These selectors are not styled by the existing 2.3 globals.css
  (the auth-callback flow doesn't render a form interactively
  pre-merge, so 2.3 didn't need to ship rules); 2.4.1 ships them
  here because the admin page does render the form interactively.
  Implementer chooses property values that match the apps/web
  pattern enough to read as the same product (input border, focus
  ring, label spacing).
- `.admin-shell .admin-state-stack` — vertical stack for `loading` /
  `unauthorized` / `error` state branches. Centered, gap between
  heading and supporting copy / button.
- `.admin-shell .admin-signed-in-as` — small "Signed in as <email>"
  label.
- `.admin-shell .admin-summary-region` (or whichever class wraps
  the `Event workspace summary` aria region — implementer locks the
  selector at edit time) — heading + `${liveCount} live` summary
  + grid container for the event-card list.
- `.admin-shell .event-card` — event-card box (status, name,
  buttons row). Single-column on mobile; flexible row on wider
  viewports.
- `.admin-shell .event-card-status` — the `Live v…` / `Draft only`
  status text.
- `.admin-shell .event-card-buttons` — button row holding the
  three per-card actions (Open workspace, Open live game,
  duplicate-draft).
- `.admin-shell .secondary-button` — secondary-button styling
  (smaller / outlined alternative to `.primary-button`). Used by
  the three per-card actions and the sign-out control.
- `.admin-shell .secondary-button[aria-disabled="true"]` —
  disabled visual state matching apps/web's pattern at
  [`apps/web/src/styles/_admin.scss`](/apps/web/src/styles/_admin.scss)
  (the `.secondary-button[aria-disabled="true"]` rule), so the
  disabled `Open live game` button reads as disabled rather than
  identical to enabled.
- `.admin-shell .admin-action-reason` — the reason text that
  `aria-describedby` points at when `Open live game` is disabled
  (`Publish this event to open the live game.`).

Token discipline per
[`docs/styling.md`](/docs/styling.md) "Themable vs structural
classification":

- **Themable** values consumed via `var(--…)`: `--primary` (button
  background), `--secondary` (focus ring + eyebrow), `--bg`,
  `--text`, `--muted`, `--font-body`, `--font-heading`,
  `--radius-control`, `--white-warm`. All already emitted on
  `<html>` by
  [`shared/styles/themeToStyle.ts`](/shared/styles/themeToStyle.ts)
  via the apps/site root layout's
  [`platformTheme`](/apps/site/app/layout.tsx) wiring.
- **Structural** tokens: not introduced. apps/site has no SCSS,
  no `$…` variable system, and no status palette consumer in this
  surface. Per
  [`AGENTS.md`](/AGENTS.md) "Styling Token Discipline" "keep
  one-off layout values local when a token would add indirection
  without improving readability or future change cost," one-off
  layout dimensions (event-card padding, button-row gap, summary
  grid gap) stay as raw CSS values rather than introducing a
  per-app structural-token surface.
- **No status colors** (`$color-success`, `$color-status-*`)
  consumed. Mutation errors render as inline text using `--text`
  or `--muted` — matching the apps/web pattern but without the
  status-palette dependency apps/web carries.

The contract pins selectors and intent; the implementer picks the
exact property values that satisfy "reads as the same product as
apps/web" without copying apps/web's full SCSS surface verbatim.
Property bodies are PR scope; the plan does not lock them.

**`shared/events/draftCreation.ts` (new).** Houses
`createStarterDraftContent(existingDrafts: DraftEventSummary[]):
AuthoringGameDraftContent` and
`createDuplicatedDraftContent(source: DraftEventDetail, existingDrafts:
DraftEventSummary[]): AuthoringGameDraftContent`. Body identical to
apps/web's current
[`apps/web/src/admin/draftCreation.ts`](/apps/web/src/admin/draftCreation.ts)
modulo import paths (the helper consumes the
`AuthoringGameDraftContent` validator from
[`shared/game-config/`](/shared/game-config), unchanged). The
`DraftEventSummary` and `DraftEventDetail` types must be reachable
from `shared/events/`; if they aren't already exported, this PR adds
a re-export through `shared/events/index.ts` rather than expanding
the shared surface mid-port. Verified by reading
[`shared/events/index.ts`](/shared/events/index.ts) at
implementation time and recording the resolution in the PR body.

**`shared/events/index.ts` (modify).** Add re-exports for
`createStarterDraftContent` and `createDuplicatedDraftContent` (and
the type re-exports per the resolution above).

**`apps/web/src/admin/draftCreation.ts` (modify, transitional shim
through 2.4.3).** Replace the file body with a thin binding-module
shim:
`export { createStarterDraftContent, createDuplicatedDraftContent }
from "../../../../shared/events/draftCreation";` (or equivalent
re-export shape). Mirrors the binding-module pattern from M1 phase
1.4's
[`apps/web/src/lib/adminGameApi.ts`](/apps/web/src/lib/adminGameApi.ts).

The shim's only purpose is keeping
[`useAdminDashboard.ts:17-19`](/apps/web/src/admin/useAdminDashboard.ts#L17)
resolvable through 2.4.1's diff so this PR stays purely
behavior-preserving for apps/web. `useAdminDashboard.ts` is the
**only apps/web source consumer** (verified by:
`grep -rn "from \"./draftCreation\"\|from \"\.\./admin/draftCreation\"" apps/web/src`)
and deletes in 2.4.3 alongside the rest of the platform-admin
module. The deep editor and its dependency set do not import
draftCreation — both helpers are platform-admin scope (Create
draft on the list view, Duplicate draft on the list view); the
deep editor only edits already-loaded drafts. After 2.4.3 deletes
useAdminDashboard.ts, the shim becomes orphan source and 2.4.3
deletes it too — see 2.4.3's Files To Touch.

**`tests/web/admin/draftCreation.test.ts` → `tests/shared/events/draftCreation.test.ts`
(move).** The test file moves from the apps/web admin tests
directory to a new path under `tests/shared/events/` because the
function under test now lives at `shared/events/draftCreation.ts`;
the test follows the source-of-truth rather than continuing to
import through the apps/web shim. The move is a Git rename in a
single commit (test bodies unchanged; only the import path at
[`tests/web/admin/draftCreation.test.ts:11`](/tests/web/admin/draftCreation.test.ts#L11)
updates from `../../../apps/web/src/admin/draftCreation` to
`../../../shared/events/draftCreation` or similar — implementer
locks the relative path at edit time). Vitest config picks up
`tests/shared/**/*.test.ts` already (verified by:
[`vitest.config.ts`](/vitest.config.ts) at edit time); if
the directory pattern is narrower than expected, this PR widens
it. After the move, no apps/web test imports through the shim
either, and the shim is exclusively kept alive for
useAdminDashboard.ts's import — until 2.4.3 deletes both.

## Files To Touch

### New

- `apps/site/app/(authenticated)/admin/page.tsx` — apps/site admin
  page per the Contracts section.
- `apps/site/lib/setupEvents.ts` — apps/site events adapter.
- `shared/events/draftCreation.ts` — extracted starter helpers.

### Modify

- [`apps/site/components/SharedClientBootstrap.tsx`](/apps/site/components/SharedClientBootstrap.tsx)
  — add `setupEvents` side-effect import.
- [`apps/site/app/globals.css`](/apps/site/app/globals.css)
  — extend with the `.admin-shell` outer container, the comma-list
  extension on the existing scoped sign-in selectors, the
  `.signin-form` / `.signin-field` / `.signin-input` rules, the
  admin state-stack / event-card / button selectors, and the
  disabled-state / action-reason rules per the Contracts section.
  Token discipline per the Contracts section's "Token discipline"
  block.
- [`shared/events/index.ts`](/shared/events/index.ts) — add
  re-exports for the new helpers and any type re-exports needed by
  the shared module.
- [`apps/web/src/admin/draftCreation.ts`](/apps/web/src/admin/draftCreation.ts)
  — replace body with a binding-module shim re-exporting from
  `shared/events/draftCreation.ts`. Transitional through 2.4.3,
  which deletes the shim alongside its sole remaining consumer
  ([`useAdminDashboard.ts`](/apps/web/src/admin/useAdminDashboard.ts)).

### Move

- [`tests/web/admin/draftCreation.test.ts`](/tests/web/admin/draftCreation.test.ts)
  → `tests/shared/events/draftCreation.test.ts`. Test file follows
  the function it tests to its new shared location; the import at
  line 11 updates to point at `shared/events/draftCreation`
  directly rather than through the apps/web shim. Confirm at edit
  time that
  [`vitest.config.ts`](/vitest.config.ts) picks up
  `tests/shared/**/*.test.ts`; widen the include pattern if not.

### Files intentionally not touched

Reserved for sibling sub-phases:

- [`apps/web/vercel.json`](/apps/web/vercel.json) — 2.4.2.
- [`tests/e2e/admin-workflow.admin.spec.ts`](/tests/e2e/admin-workflow.admin.spec.ts),
  [`tests/e2e/admin-production-smoke.spec.ts`](/tests/e2e/admin-production-smoke.spec.ts),
  [`scripts/testing/run-auth-e2e-dev-server.cjs`](/scripts/testing/run-auth-e2e-dev-server.cjs),
  [`scripts/ui-review/capture-ui-review.cjs`](/scripts/ui-review/capture-ui-review.cjs)
  — 2.4.2.
- [`apps/web/src/pages/AdminPage.tsx`](/apps/web/src/pages/AdminPage.tsx)
  + the `apps/web/src/admin/Admin*.tsx` /
  `useAdminDashboard.ts` platform-admin module + its tests +
  [`apps/web/src/App.tsx`](/apps/web/src/App.tsx) admin
  route branches — 2.4.3.
- [`shared/urls/`](/shared/urls) deprecation +
  [`tests/shared/urls/`](/tests/shared/urls) cleanup — 2.4.3.
- apps/web SCSS prune — 2.4.3.
- [`docs/architecture.md`](/docs/architecture.md),
  [`docs/operations.md`](/docs/operations.md),
  [`docs/dev.md`](/docs/dev.md),
  [`README.md`](/README.md) URL-ownership and module-ownership
  edits — 2.4.2 (URL ownership) and 2.4.3 (module ownership).

Sibling files referenced verbatim from 2.3:

- [`apps/site/lib/setupAuth.ts`](/apps/site/lib/setupAuth.ts)
  / [`supabaseBrowser.ts`](/apps/site/lib/supabaseBrowser.ts)
  / [`apps/site/app/(authenticated)/layout.tsx`](/apps/site/app/(authenticated)/layout.tsx)
  — verbatim reuse from 2.3; no edit.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree and a feature branch
   (not `main`). Re-read
   [`m2-phase-2-4-plan.md`](/docs/plans/archive/m2/m2-phase-2-4-plan.md) (umbrella;
   the per-phase scoping doc, `docs/plans/scoping/m2-phase-2-4.md`,
   was deleted in M2 phase 2.5.3 batch deletion — see git history
   if needed), and 2.3's
   apps/site adapter pair at
   [`apps/site/lib/setupAuth.ts`](/apps/site/lib/setupAuth.ts) +
   [`apps/site/lib/supabaseBrowser.ts`](/apps/site/lib/supabaseBrowser.ts)
   so the new `setupEvents.ts` mirrors the established pattern.
   Re-read apps/web's
   [`AdminDashboardContent.tsx`](/apps/web/src/admin/AdminDashboardContent.tsx)
   for the exact ARIA / copy contract the new page must preserve.
2. **Baseline validation.** Run `npm run lint`, `npm test`,
   `npm run test:functions`, `npm run build:web`, and
   `npm run build:site`. All must pass before any edit.
3. **Shared starter helper extraction + test move.** Create
   `shared/events/draftCreation.ts` with bodies copied from
   apps/web's
   [`draftCreation.ts`](/apps/web/src/admin/draftCreation.ts);
   adjust import paths. Add re-exports to
   [`shared/events/index.ts`](/shared/events/index.ts);
   include any type re-exports needed by the shared module.
   Replace
   [`apps/web/src/admin/draftCreation.ts`](/apps/web/src/admin/draftCreation.ts)
   body with a binding-module shim (transitional — 2.4.3 deletes
   it). Move
   [`tests/web/admin/draftCreation.test.ts`](/tests/web/admin/draftCreation.test.ts)
   to `tests/shared/events/draftCreation.test.ts` (Git rename;
   update the import path to point at `shared/events/draftCreation`
   directly). Confirm
   [`vitest.config.ts`](/vitest.config.ts) picks up
   `tests/shared/**/*.test.ts` (widen the include pattern if not).
   Run `npm run lint` + `npm test` + `npm run build:web` to
   confirm the moved test still runs and apps/web's existing call
   sites resolve unchanged through the shim.
4. **apps/site setupEvents adapter + bootstrap update.** Create
   `apps/site/lib/setupEvents.ts` per the Contracts section; edit
   [`apps/site/components/SharedClientBootstrap.tsx`](/apps/site/components/SharedClientBootstrap.tsx)
   to add the `import "../lib/setupEvents";` line.
   `npm run build:site` confirms the imports resolve.
5. **apps/site `/admin` page + globals.css extension.** Create
   `apps/site/app/(authenticated)/admin/page.tsx` per the Contracts
   section, wrapped in the `.admin-shell` container class. Extend
   [`apps/site/app/globals.css`](/apps/site/app/globals.css)
   per the Contracts section: add `.admin-shell` to the existing
   `.landing-shell, .auth-callback-shell` outer-container rule;
   comma-extend the existing scoped sign-in selectors so they match
   under `.admin-shell` too; add the new `.admin-shell .…` rules
   for the form fields, state-stack, event-card, and button
   surfaces. Implement the sign-in / loading / unauthorized /
   signed-in-allowlisted state stack with the umbrella's
   test-asserted-locator stability invariant in mind — every
   string and ARIA attribute pinned by the e2e specs must resolve;
   strings outside that set are best-effort. `npm run build:site`
   confirms the route compiles and globals.css is well-formed.
6. **Local apps/site exercise (load-bearing render-the-consequence
   check).** Run `npm run dev:site` and visit
   `http://localhost:3000/admin`. Walk every state branch and
   confirm the page is recognizably styled (not browser-default).
   Per [`AGENTS.md`](/AGENTS.md) "Bans on surface require
   rendering the consequence," this step is the load-bearing
   pre-merge check that the globals.css extension actually styles
   what the page renders, not just that it compiles:
   - Signed-out: confirm in-place sign-in form renders with apps/site
     Sage Civic typography (Fraunces heading, Inter body), apps/site
     brand colors, and a styled pill button (not a default-browser
     submit) — match the `/auth/callback` shell's visual register
     by direct comparison (`http://localhost:3000/auth/callback`
     in another tab). Walk the test-asserted locators
     (re-derived list from
     [`tests/e2e/admin-workflow.admin.spec.ts`](/tests/e2e/admin-workflow.admin.spec.ts)
     and
     [`tests/e2e/admin-production-smoke.spec.ts`](/tests/e2e/admin-production-smoke.spec.ts))
     and confirm each resolves; for non-pinned strings, sanity-check
     against
     [`apps/web/src/admin/AdminDashboardContent.tsx:120-130`](/apps/web/src/admin/AdminDashboardContent.tsx#L120)
     for "reads as the same product" without insisting on
     character-by-character match. Confirm the input field has a
     visible border + focus ring rather than browser-default inset.
   - Signed-in non-admin: confirm the test-asserted heading
     `This account is not allowlisted for game authoring.` renders
     exactly (this string is pinned by the smoke spec) inside a
     styled state stack with consistent vertical rhythm.
   - Signed-in admin: confirm the workspace surface renders with
     every test-asserted locator resolving (`Game draft access`
     heading, `Event workspace summary` aria region, `${eventName}
     event` cards, `Open workspace` and `Open live game` button
     names, `${liveCount} live` summary text, `Live v…` /
     `Draft only` status strings, `aria-disabled="true"` +
     `aria-describedby` on the disabled live-game button, the
     `Publish this event to open the live game.` reason text)
     AND visible card layout (border / background / padding
     distinguish the card from the page background; status text
     reads as secondary; button row reads as a button row not a
     default wrap). Confirm the disabled `Open live game` reads
     as visually disabled (reduced-opacity / muted color), not
     identical to enabled. Confirm the action-reason text is
     visible adjacent to the disabled button. Click `Open
     workspace` and `Open live game` to verify the buttons fire
     `window.location.assign(...)` (the navigation will hit
     apps/site 404 because the apps/site dev server doesn't proxy
     to apps/web — that's expected; production resolves via the
     proxy topology).
   - The cross-app navigation buttons cannot be exercised end-to-end
     in the apps/site dev server alone; that's the integration
     surface 2.4.2 will cover.

   Capture a screenshot per state branch (mobile viewport, then
   desktop) for the PR's UX Review section. The PR is not
   ready-to-merge if any branch reads as browser-default.
7. **Validation re-run.** All baseline commands from step 2 must
   pass. `npm test` confirms the moved
   `tests/shared/events/draftCreation.test.ts` runs from its new
   location and the test count is unchanged (one test file moved,
   none added or dropped).
8. **Code-review feedback loop.** Walk the diff from a
   senior-reviewer stance against every Cross-Cutting Invariant
   above and every Self-Review Audit named below. Apply fixes in
   place; commit review-fix changes separately when that clarifies
   history per
   [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.
9. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
   Invariant Touched, Validation Gate command, and Self-Review Audit
   named in this plan. Confirm each is satisfied in the PR or
   deferred with rationale. Flip Status from `Proposed` to `Landed`
   in the same PR — this sub-phase has no production-smoke gate so
   the regular Plan-to-PR Completion Gate applies. Update the
   umbrella's Sub-phase Status table row for 2.4.1 to `Landed` with
   the PR link.
10. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](/.github/pull_request_template.md).
    Title under 70 characters
    (suggested: `feat(m2-2.4.1): add platform admin page on apps/site`).
    Validation section lists every command actually run.
    Remaining Risk: production behavior unchanged through this PR;
    apps/site `/admin` is reachable only on the apps/site dev
    server until 2.4.2's cutover.

## Commit Boundaries

Per [`AGENTS.md`](/AGENTS.md) "Planning Depth":

1. **Shared starter helper extraction + apps/web binding shim +
   test move.** New `shared/events/draftCreation.ts`,
   [`shared/events/index.ts`](/shared/events/index.ts) re-export
   additions, the apps/web
   [`draftCreation.ts`](/apps/web/src/admin/draftCreation.ts)
   shim, and the
   [`tests/web/admin/draftCreation.test.ts`](/tests/web/admin/draftCreation.test.ts)
   → `tests/shared/events/draftCreation.test.ts` move (Git rename
   with the import path updated). Single commit; behavior-preserving
   for apps/web. The test moves with the source-of-truth so
   `tests/web/admin/` no longer references draftCreation by the end
   of this commit, even though apps/web's source still does
   (through useAdminDashboard.ts, deleted in 2.4.3).
2. **apps/site `/admin` scaffold + globals.css extension.** New
   `apps/site/app/(authenticated)/admin/page.tsx`,
   `apps/site/lib/setupEvents.ts`,
   [`apps/site/app/globals.css`](/apps/site/app/globals.css)
   extension per Contracts, and the
   [`SharedClientBootstrap.tsx`](/apps/site/components/SharedClientBootstrap.tsx)
   one-line edit. Single commit (the page and its styles ship
   together so the diff stays one bisect target — landing the page
   without its CSS would mean a tip with browser-default rendering;
   landing the CSS without the page would mean unconsumed selectors).
   Production behavior unchanged because apps/web `vercel.json`
   still SPA-handles `/admin*`.
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
  load-bearing pre-merge for two distinct invariants:
  (1) **Test-asserted-locator resolution** — the exercise walks
  every locator pinned by the umbrella's test-asserted-locator
  stability invariant (re-derived from the e2e specs at pre-edit
  gate) and confirms each resolves on every state branch; this
  is the strongest pre-merge check for the cross-sub-phase
  invariant, and 2.4.2's e2e exercise depends on this being
  correct. Best-effort fidelity for non-pinned strings is
  sanity-checked here but not gated; the umbrella's manual
  side-by-side review in 2.4.2 is the load-bearing check for
  best-effort surface.
  (2) **Render-the-consequence** — the exercise confirms the
  globals.css extension actually styles every state branch (form
  fields have visible borders, buttons read as buttons not
  default-browser submits, event cards have card-like layout, the
  disabled `Open live game` reads as visually disabled, etc.) per
  [`AGENTS.md`](/AGENTS.md) "Bans on surface require rendering
  the consequence." The PR is not ready-to-merge if any branch
  reads as browser-default; screenshots per state branch (mobile +
  desktop) ship in the PR body's UX Review section as durable
  evidence the check ran.

**No production smoke gate.** Production `/admin` continues to
resolve to the legacy apps/web `AdminPage` through this PR.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md).

### Frontend (apps/site)

- **Silent-no-op on missing lookup**
  ([catalog §Silent-no-op on missing lookup audit](/docs/self-review-catalog.md#L420)).
  Event list `listDraftEventSummaries()` empty result must render
  an empty-state message that distinguishes "no drafts exist" from
  "lookup failed." `getGameAdminStatus()` similarly distinguishes
  "false (not allowlisted)" from "RPC failed."
- **Error-surfacing for user-initiated mutations**
  ([catalog §Error-surfacing for user-initiated mutations](/docs/self-review-catalog.md#L266)).
  Create / duplicate click handlers surface failures inline. The
  failure path does not navigate.
- **Effect cleanup audit**
  ([catalog §Effect cleanup audit](/docs/self-review-catalog.md#L287)).
  The `signed_in` → admin-status-fetch → drafts-list-fetch effect
  uses the `isCancelled` pattern from
  [`useAdminDashboard.ts:88-143`](/apps/web/src/admin/useAdminDashboard.ts#L88).
  Next.js strict-mode double-mount must not produce parallel fetches
  racing into `setDashboardState`.
- **Token bucket discipline.** The
  [`apps/site/app/globals.css`](/apps/site/app/globals.css)
  extension consumes themable values exclusively via `var(--…)`
  for color / typography / radius / focus ring (`--primary`,
  `--secondary`, `--bg`, `--text`, `--muted`, `--font-body`,
  `--font-heading`, `--radius-control`, `--white-warm` —
  enumerated in the Contracts section); raw CSS values appear only
  for one-off layout dimensions (event-card padding, button-row
  gap, summary grid gap) per
  [`AGENTS.md`](/AGENTS.md) "Styling Token Discipline" "keep
  one-off layout values local when a token would add indirection
  without improving readability or future change cost."
  Audit walks: no themable color is hardcoded; no status palette
  selector (`$color-success`, `$color-status-*`) appears (status
  palette is structural and apps/site has no consumer in this
  surface — mutation errors render via `--text` / `--muted`); the
  focus-ring pattern uses `var(--secondary)` matching the apps/web
  precedent and the 2.3 globals.css precedent at
  [`apps/site/app/globals.css:128-130`](/apps/site/app/globals.css#L128).
  No new structural-token surface (no `$…` SCSS variables — apps/site
  has no SCSS).
- **Bans on surface require rendering the consequence.** The
  earlier draft of this plan claimed "no new SCSS / CSS surface"
  on the assumption that 2.3's globals.css would carry the new
  page. The reality-check found that 2.3 scoped its sign-in
  selectors to `.auth-callback-shell` only, leaving the admin page
  unstyled if the claim shipped as-written. The fix is the
  globals.css extension contract above. Audit walks: every
  selector the page consumes (`<SignInForm>` classes, `.admin-shell`
  layout, event-card, button row, disabled state, action-reason)
  has a rule under `.admin-shell .…`; Execution step 6's
  render-the-consequence check is the load-bearing pre-merge
  verification that no surface ships unstyled.

### CI / build

- **CLI / tooling pinning audit**
  ([catalog §CLI / tooling pinning audit](/docs/self-review-catalog.md#L331)).
  No new
  [`apps/site/package.json`](/apps/site/package.json)
  dependencies. The new admin page consumes only existing apps/site
  dependencies plus shared modules.
- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](/docs/self-review-catalog.md#L354)).
  `shared/events/draftCreation.ts` is a copy-then-shim, not a Git
  rename — describe in the PR body so reviewers don't flag the
  apps/web file as rewritten. The new apps/site page is a fresh
  implementation, not a copy of the apps/web component (different
  framework idioms; same ARIA / copy contract).

## Documentation Currency PR Gate

This sub-phase's surface is internal — no URL ownership change, no
module ownership change. Doc updates this branch carries:

- [`shared/events/README.md`](/shared/events/README.md) — if
  the README documents the public surface, add the new
  `createStarterDraftContent` / `createDuplicatedDraftContent`
  entries. If not, no edit.
- [`docs/architecture.md`](/docs/architecture.md) — no edit.
  URL-ownership and module-ownership shifts land in 2.4.2 / 2.4.3.
- [`docs/operations.md`](/docs/operations.md),
  [`docs/dev.md`](/docs/dev.md),
  [`README.md`](/README.md) — no edits.
- [`m2-phase-2-4-plan.md`](/docs/plans/archive/m2/m2-phase-2-4-plan.md) (umbrella) —
  Sub-phase Status table row for 2.4.1 updates to `Landed` with
  the PR link when this PR merges.
- [`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md) —
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

- **Test-asserted-locator slip.** A typo or wrong attribute on any
  string the umbrella's "test-asserted-locator stability" invariant
  pins (re-derived from the e2e specs at pre-edit gate) silently
  fails 2.4.2's e2e spec retargeting — after the URL flip, those
  locators won't match. Mitigation: Execution step 6's local
  exercise walks every test-asserted locator and confirms it
  resolves; reviewer diff check matches the pinned strings exactly.
  Best-effort copy outside the pinned set (e.g., the duplicate-draft
  button label) is not at risk for e2e but is covered by 2.4.2's
  manual side-by-side review per the umbrella's invariant.
- **Cross-app navigation client-side regression.** Using
  `useRouter().replace(href)` or `<Link href>` from
  `next/navigation` would silently break in production. Mitigation:
  invariant locked above; the
  [`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/(authenticated)/auth/callback/page.tsx)
  precedent uses `window.location.replace`; reviewer catches any
  `useRouter` import in the new page.
- **`createStarterDraftContent` binding shim drift (transitional).**
  The apps/web shim must keep both helper symbols re-exported
  through 2.4.3, even though only useAdminDashboard.ts consumes
  it (and useAdminDashboard.ts deletes in 2.4.3). Mitigation:
  shim contains only the re-export, no logic; the shim's bounded
  lifetime is named in 2.4.1's Contract section so reviewers don't
  expand its scope. 2.4.3 deletes the shim — see 2.4.3's plan.
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

- [`m2-phase-2-4-plan.md`](/docs/plans/archive/m2/m2-phase-2-4-plan.md) — umbrella;
  cross-sub-phase context, sequencing rationale, cross-sub-phase
  invariants and risks.
- [`m2-phase-2-4-2-plan.md`](/docs/plans/archive/m2/m2-phase-2-4-2-plan.md) — sibling
  sub-phase (cutover); this sub-phase's ARIA / copy contract is the
  pre-condition for 2.4.2's e2e retargeting.
- [`m2-phase-2-4-3-plan.md`](/docs/plans/archive/m2/m2-phase-2-4-3-plan.md) — sibling
  sub-phase (deletion).
- [`m2-phase-2-3-plan.md`](/docs/plans/archive/m2/m2-phase-2-3-plan.md) — Landed sibling;
  apps/site adapter pair, `(authenticated)` route group, and
  `<SharedClientBootstrap>` precedent this sub-phase extends.
- [`shared-events-foundation.md`](/docs/plans/shared-events-foundation.md) —
  M1 phase 1.4 plan; binding-module pattern for the
  `apps/web/src/admin/draftCreation.ts` shim.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](/AGENTS.md) — workflow rules.
