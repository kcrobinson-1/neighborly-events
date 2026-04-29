# M2 Phase 2.4 — Platform Admin Migration To apps/site

## Status

Proposed.

Will ship under the two-phase **Plan-to-Landed Gate For Plans That
Touch Production Smoke** from
[`docs/testing-tiers.md`](../testing-tiers.md). The implementing PR
merges with Status `In progress pending prod smoke` (the rule's exact
required string, not `Landed` and not a paraphrase); a doc-only
follow-up commit flips Status to `Landed` and records the post-release
`Production Admin Smoke` run URL once green. Both trigger clauses of
the gate apply to 2.4: (1) plans that **extend or modify production
smoke assertions** — the existing
[`admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
fixture's URL pattern changes from `/admin/events/${eventId}` to
`/event/${eventSlug}/admin` for the cross-app workspace handoff, and
its direct-load step retargets the same; (2) plans that **depend on
production smoke as final verification** — the apps/web → apps/site
proxy for `/admin*` is unverifiable pre-merge by construction
(`apps/web/vercel.json` destinations are absolute production URLs),
mirroring 2.3's cross-project verification deferral.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md),
Milestone M2, Phase 2.4. Sibling phases: 2.1 RLS broadening + Edge
Function organizer gate — Landed
([`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md),
[`m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md),
[`m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md)); 2.2 per-event
admin shell — Landed
([`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md)); 2.3
`/auth/callback` and `/` migration — Landed
([`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md)); 2.5 `/game/*`
URL migration — Proposed. The epic's M2 row stays `Proposed` until
2.5 also lands.

**Hard dependencies on landed siblings.** 2.2 (deep editor at
`/event/:slug/admin`) is the navigation target for `Open workspace`
and the only authoring surface that survives 2.4's apps/web `/admin`
removal. 2.3 ships the apps/site adapter pair
([`apps/site/lib/setupAuth.ts`](../../apps/site/lib/setupAuth.ts),
[`apps/site/lib/supabaseBrowser.ts`](../../apps/site/lib/supabaseBrowser.ts)),
the [`(authenticated)`](../../apps/site/app/(authenticated)/layout.tsx)
route group with
[`SharedClientBootstrap`](../../apps/site/components/SharedClientBootstrap.tsx),
and the apps/site → apps/web cross-app proxy pattern in
[`apps/web/vercel.json`](../../apps/web/vercel.json). 2.4 reuses every
one of those without contract change. 2.1.2 ships the
[`authenticateEventOrganizerOrAdmin`](../../supabase/functions/_shared/event-organizer-auth.ts)
gate which the platform admin (root-only) passes through the
`is_root_admin()` branch — observable behavior preserved.

**Single PR (plus the doc-only follow-up that flips Status to
`Landed`).** Branch-test sketch — apps/site: 2 new files
(`app/(authenticated)/admin/page.tsx`, `lib/setupEvents.ts`) plus
1 modify (`SharedClientBootstrap.tsx`); apps/web: 4 file deletes
(`pages/AdminPage.tsx`, `admin/AdminDashboardContent.tsx`,
`admin/AdminPageShell.tsx`, `admin/AdminEventWorkspace.tsx`,
`admin/useAdminDashboard.ts`) + 4 file edits
(`App.tsx`, `admin/draftCreation.ts`, `vercel.json`, SCSS prune);
shared: 1 new (`shared/events/draftCreation.ts`) + 3 edits
(`shared/events/index.ts`, `shared/urls/routes.ts`,
`shared/urls/validateNextPath.ts`); tests: 4 edits
(`tests/shared/urls/routes.test.ts`,
`tests/shared/urls/validateNextPath.test.ts`,
`tests/e2e/admin-workflow.admin.spec.ts`,
`tests/e2e/admin-production-smoke.spec.ts`); tooling: 2 edits
(`scripts/testing/run-auth-e2e-dev-server.cjs`,
`scripts/ui-review/capture-ui-review.cjs`); docs: 4 edits
(`docs/architecture.md`, `docs/operations.md`, `docs/dev.md`,
`docs/plans/m2-admin-restructuring.md`) + this plan's Status flip.
Estimated ~25 distinct files across ~4 subsystems (apps/site
admin scaffold, apps/web removal, shared/urls + tests, tooling +
docs); under AGENTS.md's >5-subsystem / >300-LOC split threshold.
The cutover is tightly coupled — flipping the Vercel proxy and
deleting apps/web's `/admin` handlers must happen in the same change
to avoid a broken intermediate state.

**Scoping inputs:**
[`scoping/m2-phase-2-4.md`](./scoping/m2-phase-2-4.md) for the file
inventory and contracts walkthrough;
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
"Cross-Phase Decisions" §3 (apps/site auth idiom + bootstrap seam, all
inherited from 2.3), §6 (`createStarterDraftContent` home →
`shared/events/`), §7 (fate of `/admin/events/:eventId` → 404 honestly),
"Settled by default" (apps/site primary-domain promotion deferred,
combined SQL helper RPC declined). Plan-time reality check ran against
the merged state of phases 2.1.1 / 2.1.2 / 2.2 / 2.3; results recorded
in the Risk Register.

## Goal

Migrate `/admin` from apps/web (Vite/React) to apps/site (Next.js
16 App Router) as the root-admin platform surface. The new platform
admin owns the event list, draft creation, and per-event lifecycle
controls (publish/unpublish, "Open live game", "Open workspace");
deep-editor functionality (event details, question/option authoring)
is no longer at `/admin` — it lives only at `/event/:slug/admin` in
apps/web from phase 2.2. apps/web's `/admin` route, the platform-admin
module, the legacy `/admin/events/:eventId` URL, and the supporting
Vercel SPA fallback are removed. After 2.4 lands, apps/web's URL
footprint is purely event-scoped: `/event/:slug/game/*` (attendee +
operator) and `/event/:slug/admin` (organizer authoring).

The phase consumes every durable seam 2.3 introduced — adapter pair,
bootstrap-providing route group, proxy-rewrite shape — without
contract changes. It adds one new shared seam:
[`shared/events/draftCreation.ts`](../../shared/events/draftCreation.ts)
(formerly apps/web-local) so apps/site and apps/web share the
canonical-starter-draft helper.

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file, not just the file that first
triggered the rule.

- **Bootstrap-seam idempotency preserved.** `SharedClientBootstrap`
  gains a second side-effect import
  (`import "../lib/setupEvents";`) alongside the existing
  `setupAuth` import. Both modules are idempotent — `configureSharedAuth`
  and `configureSharedEvents` overwrite-on-second-call by design,
  per
  [`shared/auth/configure.ts:35`](../../shared/auth/configure.ts#L35)
  and the equivalent in `shared/events/`. The bootstrap component
  must not gate either import behind state; both run unconditionally
  at module evaluation, before any descendant client component
  reads the providers.
- **ARIA / copy stability across the cross-app port.** The apps/site
  `/admin` event-list surface preserves the exact ARIA labels, role
  names, and visible copy that the existing
  [`tests/e2e/admin-workflow.admin.spec.ts`](../../tests/e2e/admin-workflow.admin.spec.ts)
  and
  [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
  assert against (`Game draft access` heading, `Event workspace
  summary` aria region, `${eventName} event` event-card label,
  `Open workspace` / `Open live game` / `Duplicate` buttons,
  `${liveCount} live` summary text, `Live v…` / `Draft only`
  status text, `aria-disabled` + `aria-describedby` discipline on
  the disabled-state "Open live game" button with the
  `Publish this event to open the live game.` reason). The only
  e2e diff is **URL pattern** (`/admin/events/${eventId}` →
  `/event/${eventSlug}/admin`); copy and ARIA are stable.
- **Deep-editor surface untouched.** apps/web's
  [`EventAdminPage`](../../apps/web/src/pages/EventAdminPage.tsx) and
  [`EventAdminWorkspace`](../../apps/web/src/admin/EventAdminWorkspace.tsx)
  (the 2.2 per-event admin) plus their dependency set
  (`AdminEventDetailsForm`, `AdminQuestionEditor`, `AdminQuestionList`,
  `AdminQuestionFields`, `AdminOptionEditor`, `AdminPublishPanel`,
  `useEventAdminWorkspace`, `useSelectedDraft`, `eventDetails.ts`,
  `publishChecklist.ts`, `questionBuilder.ts`,
  `questionFormMapping.ts`, `questionStructure.ts`) are
  not edited in this phase. The platform-admin port re-implements
  list / lifecycle UI; deep authoring is a hard navigation away.
- **Cross-app navigation uses hard navigation, never client-side
  navigation.** apps/site `/admin` → `/event/:slug/admin` (apps/web)
  on `Open workspace` and on post-create-draft success uses
  `window.location.assign(path)` or `window.location.replace(path)`,
  not `useRouter().replace` from `next/navigation`. Same trap that
  bit 2.3 — client-side navigation inside Next.js's router would
  resolve `/event/:slug/admin` against apps/site's route tree and
  miss the apps/web Vercel proxy entry. Verified by:
  [`apps/site/app/(authenticated)/auth/callback/page.tsx:12-14`](../../apps/site/app/(authenticated)/auth/callback/page.tsx#L12)
  uses `window.location.replace(path)` for the same reason.
- **URL contract progression.** This phase removes `/admin*` from
  apps/web's surface; 2.5 will retire the bare-path operator URLs.
  After this phase, apps/web's `vercel.json` rewrites array contains
  no `/admin*` SPA fallback, and the apps/site proxy rules cover
  `/admin` and `/admin/:path*`. The `/admin/events/:eventId` URL
  family (apps/web, legacy) is removed from
  [`shared/urls/routes.ts`](../../shared/urls/routes.ts) entirely;
  external bookmarks 404 honestly per
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  Cross-Phase Decisions §7.

## Naming

- New apps/site admin page:
  `apps/site/app/(authenticated)/admin/page.tsx`. `'use client'`
  Next.js page; lives inside the `(authenticated)` route group so
  `<SharedClientBootstrap>` has already run before
  `useAuthSession` mounts. The `(authenticated)` prefix is
  convention-only (Next.js route groups do not appear in URLs); the
  load-bearing structure is the layout-scoped bootstrap, not the
  URL prefix.
- New apps/site events setup module: `apps/site/lib/setupEvents.ts`.
  Module-level side effect that calls
  `configureSharedEvents({ getClient })` exactly once, mirroring
  [`apps/web/src/lib/setupEvents.ts`](../../apps/web/src/lib/setupEvents.ts)
  with the apps/site browser-Supabase singleton as the `getClient`
  source.
- New shared starter helper: `shared/events/draftCreation.ts`. Houses
  `createStarterDraftContent` (and `createDuplicatedDraftContent`,
  whose only consumer is also moving — see Files to touch). Both
  helpers re-export through
  [`shared/events/index.ts`](../../shared/events/index.ts) so apps/site
  and apps/web consume from one place.
- **Not created in 2.4:** `apps/site/components/admin/` directory or
  per-route admin sub-components beyond the page itself. The
  platform-admin surface is small enough (sign-in / loading /
  unauthorized / event-list with create + lifecycle controls) that
  splitting into separate component files mid-phase would be
  premature abstraction. Final implementation may split if a single
  `page.tsx` exceeds ~250 lines of substantive JSX; the plan does
  not lock the split shape, but the implementer records the
  decision in the PR body if it diverges from the single-file
  default.

## Contracts

**`apps/site/app/(authenticated)/admin/page.tsx`.** `'use client'`.
Default-exports the page component. Behavior:

- Renders skeleton ("Loading admin access…" or analogous) on first
  paint while `useAuthSession()` hydrates.
- `sessionState.status === "missing_config"` → renders the
  `getMissingSupabaseConfigMessage()` text in a state stack analogous
  to apps/web's
  [`AdminDashboardContent`](../../apps/web/src/admin/AdminDashboardContent.tsx)
  `missing_config` branch. Verified by:
  [`apps/web/src/admin/AdminDashboardContent.tsx:100-107`](../../apps/web/src/admin/AdminDashboardContent.tsx#L100).
- `sessionState.status === "loading"` → renders the same loading
  state apps/web emits ("Restoring admin session" + disabled
  "Checking session..." button). Verified by:
  [`apps/web/src/admin/AdminDashboardContent.tsx:109-118`](../../apps/web/src/admin/AdminDashboardContent.tsx#L109).
- `sessionState.status === "signed_out"` → renders `<SignInForm>`
  from
  [`shared/auth`](../../shared/auth) inline within the `/admin`
  shell with magic-link copy mirroring apps/web's
  `ADMIN_SIGN_IN_COPY` (`Magic-link sign-in` eyebrow,
  `Send a sign-in link to an admin email.` heading,
  `Email sign-in link` / `Sending sign-in link...` submit labels,
  `Admin email` field label, `admin-email` field id). The form's
  submit calls `requestMagicLink(email, { next: routes.admin })`.
  In-place auth invariant — no `/signin` page.
- `sessionState.status === "signed_in"` and dashboard
  `getGameAdminStatus()` resolves false → renders the existing
  "This account is not allowlisted for game authoring." copy
  (heading match required by
  [`tests/e2e/admin-production-smoke.spec.ts:51-55`](../../tests/e2e/admin-production-smoke.spec.ts#L51)).
- `sessionState.status === "signed_in"` and admin → renders the
  `Game draft access` heading + `Event workspace summary` aria
  region (with `${liveCount} live` text) + an event-card list
  per the ARIA stability invariant. Each card carries
  `aria-label="${eventName} event"`, exposes the live/draft status
  text (`Live v<N>` or `Draft only`), and renders three buttons:
  `Open live game` (disabled when not live, with
  `aria-disabled="true"` + `aria-describedby` pointing at the
  reason text `Publish this event to open the live game.`),
  `Open workspace`, and `Duplicate`. Plus a `Create draft`
  affordance (button or form, copy follows apps/web's existing
  pattern).
- **`Open workspace` click** → hard navigation
  (`window.location.assign(routes.eventAdmin(slug))`) to apps/web
  deep editor.
- **`Open live game` click (enabled state)** → hard navigation
  (`window.location.assign(routes.game(slug))`).
- **`Create draft` click** → `saveDraftEvent(createStarterDraftContent(existingDrafts))`,
  then on success hard navigation to `routes.eventAdmin(savedDraft.slug)`
  (apps/web). Mutation state surfaces inline ("Creating draft…" /
  error message) before the navigation fires; failure path stays on
  the list with an inline error message and does not navigate.
  Behavior diff vs. apps/web's existing `createDraft` (which merged
  the new draft into the dashboard list): the apps/site flow
  navigates to the deep editor immediately because that's now a
  separate app and "stay on `/admin` and click Open workspace" is
  redundant. The error path is identical (inline error,
  no navigation).
- **`Duplicate` click** → `loadDraftEvent(eventId)` →
  `saveDraftEvent(createDuplicatedDraftContent(source, existingDrafts))`,
  same hard-navigation success path as Create.
- **`Sign out` click** → `signOutAuth()`, error surfaced inline.
- Trust boundary stays at the database (`is_admin()` RPC + edge
  function admin-auth gate); the client gate is a UX gate, not the
  enforcement point.

The page does not exceed two top-level effect hooks: one for the
initial admin-status + drafts fetch on `signed_in` transition
(mirrors
[`useAdminDashboard.ts:88-143`](../../apps/web/src/admin/useAdminDashboard.ts#L88)
`isCancelled` cleanup pattern), one optional for retry coordination.
Inline mutation calls do not need their own effects — the
button handlers manage state directly.

**`apps/site/lib/setupEvents.ts`.** Mirrors
[`apps/web/src/lib/setupEvents.ts`](../../apps/web/src/lib/setupEvents.ts)
verbatim with apps/site's import paths. Module-level side effect
calling `configureSharedEvents({ getClient })` once with
`getClient` wired to `getBrowserSupabaseClient` from
[`apps/site/lib/supabaseBrowser.ts`](../../apps/site/lib/supabaseBrowser.ts).
No exports.

**`apps/site/components/SharedClientBootstrap.tsx` (modify).** Add
`import "../lib/setupEvents";` immediately after the existing
`import "../lib/setupAuth";` line. Order between the two does not
matter (both are idempotent, neither depends on the other);
co-locating them is the only contract.

**`shared/events/draftCreation.ts` (new).** Houses
`createStarterDraftContent(existingDrafts: DraftEventSummary[]):
AuthoringGameDraftContent` and
`createDuplicatedDraftContent(source: DraftEventDetail, existingDrafts:
DraftEventSummary[]): AuthoringGameDraftContent`. Body identical to
apps/web's current
[`apps/web/src/admin/draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)
modulo import paths (the helper consumes the
`AuthoringGameDraftContent` validator from `shared/game-config/`,
unchanged). The `DraftEventSummary` and `DraftEventDetail` types
must come from `shared/events/` (currently in
`apps/web/src/lib/adminGameApi.ts`); if they aren't already
exported from `shared/events/`, the plan accepts a thin re-export
through `shared/events/index.ts` rather than expanding the shared
surface mid-port. Verified by reading
[`shared/events/index.ts`](../../shared/events/index.ts) at
implementation time and naming the resolution in the PR body.

**`shared/events/index.ts` (modify).** Add re-exports for
`createStarterDraftContent` and `createDuplicatedDraftContent` (and
the `DraftEventSummary` / `DraftEventDetail` types if they aren't
already exported, per the resolution above).

**`apps/web/src/admin/draftCreation.ts` (modify).** Becomes a thin
binding-module shim: a single `export { createStarterDraftContent,
createDuplicatedDraftContent } from "../../../../shared/events/draftCreation";`
line (or equivalent re-export shape). Mirrors the binding-module
pattern from M1 phase 1.4's `lib/adminGameApi.ts` and
`lib/gameContentApi.ts` shims. Verified by:
[`apps/web/src/lib/adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts).
The shim exists so apps/web's existing imports
(`AdminEventWorkspace.tsx`, `useEventAdminWorkspace.ts`) continue
to resolve through the file path they already use, and so
`useAdminDashboard.ts` (which is being deleted) does not need
edit-then-delete churn.

**`shared/urls/routes.ts` (modify).** Remove three exports —
`routes.adminEventsPrefix`, `routes.adminEvent`, and
`matchAdminEventPath` — and the `/admin/events/${string}` branch
from the `AppPath` type. The deprecated route's only call sites are
all in apps/web files this phase deletes (verified by:
`grep -rn "matchAdminEventPath\|routes\.adminEvent" apps/web/src
shared/urls`); no shim needed. `routes.admin`, `routes.eventAdmin`,
and the rest of the `routes` table stay.

**`shared/urls/validateNextPath.ts` (modify).** Remove the
`matchAdminEventPath(pathname)` branch (currently lines 51-53).
`routes.admin` stays in the allow-list (still a valid post-sign-in
destination — it now resolves on apps/site through the proxy).
The `matchAdminEventPath` import drops from the file's import list.

**`shared/urls/index.ts` (modify).** Drop the
`matchAdminEventPath` re-export.

**`apps/web/vercel.json` (modify).** Apply two changes to the
rewrites array (current state per
[`apps/web/vercel.json`](../../apps/web/vercel.json)):

1. **Remove** the rule at array position 9: `{ "source":
   "/admin/:path*", "destination": "/index.html" }`.
2. **Add** two new proxy-rewrites for `/admin` (exact match) and
   `/admin/:path*`, both with destination
   `https://neighborly-events-site.vercel.app/...`. Position them
   adjacent to the existing apps/site cross-app proxies (after
   `/_next/:path*`, before or after `/auth/callback` / `/`). Exact
   placement is locked by the implementer at edit time; correctness
   does not depend on position because no other rule competes for
   `/admin*` after the SPA fallback removes. Verified by: tracing
   the post-edit array against the negative test "no earlier rule
   matches `/admin*`" with the existing rule set.

The `/_next/:path*` proxy (rule 11 pre-edit) already exists from
2.3 and covers apps/site's asset path resolution for the new
`/admin` page; no new asset-proxy rule is needed.

**Auth e2e proxy update (`scripts/testing/run-auth-e2e-dev-server.cjs`,
modify).** Update `isSiteRequest()` to include `/admin` and
`/admin/:path*` in the apps/site routing branch. Update
`handleReadyRequest()`'s upstream probe — currently
`requestUpstream("/admin", webPort)` — to probe apps/site at `/admin`
(the new owner) instead of apps/web. The branch-local apps/site dev
server (`next dev`) serves the new
`apps/site/app/(authenticated)/admin/page.tsx`, so probe success
confirms both apps/site and apps/web are up. Verified by:
[`scripts/testing/run-auth-e2e-dev-server.cjs:47-56`](../../scripts/testing/run-auth-e2e-dev-server.cjs#L47).
The proxy's existing apps/site → web routing for
`/_next/`, `/auth/callback`, `/` stays unchanged.

**E2E spec retargeting (`tests/e2e/admin-workflow.admin.spec.ts`,
modify; `tests/e2e/admin-production-smoke.spec.ts`, modify).** The
two specs walk identical paths through the apps/web
`/admin` → `/admin/events/${eventId}` → `/admin` cycle. After 2.4
the cycle becomes `/admin` (apps/site) →
`/event/${eventSlug}/admin` (apps/web) → `/admin` (apps/site).
Concrete edits each spec needs (file paths, line numbers from
plan-time state, edit at implementation time against then-current
state):

- Replace the `await expect(page).toHaveURL(new
  RegExp("/admin/events/${fixture.eventId}$"))` assertions
  ([`admin-workflow.admin.spec.ts:65,125`](../../tests/e2e/admin-workflow.admin.spec.ts#L65);
  [`admin-production-smoke.spec.ts:72,123`](../../tests/e2e/admin-production-smoke.spec.ts#L72))
  with `/event/${fixture.eventSlug}/admin$` regex. The `Open
  workspace` button click is the only navigation that produces
  this URL; the new URL is the apps/web deep-editor route.
- Replace the direct `page.goto("/admin/events/${fixture.eventId}")`
  calls
  ([`admin-workflow.admin.spec.ts:91`](../../tests/e2e/admin-workflow.admin.spec.ts#L91);
  [`admin-production-smoke.spec.ts:95`](../../tests/e2e/admin-production-smoke.spec.ts#L95))
  with `page.goto("/event/${fixture.eventSlug}/admin")`.
- Leave the `await page.goto("/admin")` calls
  ([`admin-workflow.admin.spec.ts:103`](../../tests/e2e/admin-workflow.admin.spec.ts#L103);
  [`admin-production-smoke.spec.ts:107`](../../tests/e2e/admin-production-smoke.spec.ts#L107))
  unchanged — the URL is the same, only the resolving framework
  changes.
- Leave every other assertion unchanged. The ARIA / copy stability
  invariant guarantees `Game draft access` heading,
  `Event workspace summary` aria region, `${eventName} event`
  card label, `Open workspace` / `Open live game` buttons,
  `${liveCount} live` summary text, `Live v…` / `Draft only`
  status text, `Status: Draft only` text, `Slug: ${eventSlug}` text
  (the latter on the apps/web deep-editor side, post-2.2,
  unchanged) all keep working. The implementer confirms each
  assertion still passes during step-12 e2e validation rather than
  at PR-review time.

**UI review capture script (`scripts/ui-review/capture-ui-review.cjs`,
modify).** Two adjustments:

- Captures of `/admin` (lines 567, 576, 600, 618, 906) survive the
  proxy unchanged — `baseUrl` continues to be the apps/web
  Vite-served origin, the proxy serves apps/site `/admin` through
  it. (For local runs, the script must point at the auth e2e
  proxy origin instead of `npm run dev:web` because plain
  `dev:web` no longer routes `/admin*` to apps/site; the
  implementer documents the local-run procedure in the script's
  inline comment header.)
- Captures of the legacy `/admin/events/:eventId` workspace URL
  (lines 634, 639-640, 835) retarget the apps/web deep editor at
  `/event/:slug/admin`. The "live workspace" / "draft-only
  workspace" capture states still exist there per phase 2.2.

## Cross-Cutting Invariants Touched

Beyond the per-phase invariants in the section above, the following
epic-level invariants apply:

- **Auth integration.** Verified by:
  [`shared/auth/configure.ts:35`](../../shared/auth/configure.ts#L35).
  apps/site's adapter pair already wired by 2.3; 2.4 adds the
  `setupEvents` side-effect import alongside.
- **URL contract.** Verified by:
  [`apps/web/vercel.json`](../../apps/web/vercel.json). 2.4 deletes
  one rule and adds two; the apps/web rewrites array shrinks by net
  one rule when `/admin/:path*` SPA fallback removes and two
  apps/site proxies appear.
- **Theme route scoping.** Verified by:
  [`apps/site/app/layout.tsx:46-60`](../../apps/site/app/layout.tsx#L46).
  The new `/admin` page is non-event-scoped, inherits the apps/site
  Sage Civic root-layout defaults, and does not wrap in
  `<ThemeScope>`. apps/web's `/event/:slug/admin` deep editor
  (target of cross-app navigation) wraps as it already does in 2.2.
- **Deferred ThemeScope wiring.** Not exercised. Both the new
  apps/site `/admin` and the apps/web deep editor are unchanged
  with respect to per-event Theme registration, which lands in M4
  phase 4.1.
- **Trust boundary.** Verified by:
  [`supabase/functions/_shared/event-organizer-auth.ts:24-101`](../../supabase/functions/_shared/event-organizer-auth.ts#L24).
  Every authoring write from apps/site `/admin` (save, publish,
  unpublish, generate-event-code) flows through the four authoring
  Edge Functions, each gated on
  `is_organizer_for_event(eventId) OR is_root_admin()`. The
  platform admin is a root caller and passes through the
  `is_root_admin()` branch. Observable behavior preserved post-2.4.
- **In-place auth.** Verified by: the new `/admin` renders
  `<SignInForm>` inline within its `<main>`-like shell when
  signed-out; no `/signin` page is introduced.
- **Per-event customization.** Not exercised. No per-event
  TypeScript or Theme code changes in this phase.
- **Token bucket discipline.** No new SCSS / CSS surface in
  apps/site for `/admin`. The platform admin reuses the existing
  globals.css typography (Inter / Fraunces via `next/font`) and
  the brand color tokens emitted by
  [`shared/styles/themeToStyle.ts`](../../shared/styles/themeToStyle.ts)
  on `<html>`. Any layout that needs distinct rules — event-card
  list spacing, sign-out button positioning — uses the
  `.primary-cta`, `.signin-stack`, `.section-heading` selectors
  from 2.3's globals.css extension or adds local raw values
  per AGENTS.md "Styling Token Discipline" "keep one-off layout
  values local" rule. No new structural-token surface in apps/site.

## Files to touch — new

- `apps/site/app/(authenticated)/admin/page.tsx` — `'use client'`.
  Default-exports the page component per the Contracts section
  above. The route group prefix (`(authenticated)`) does not
  appear in URLs; the page resolves at `/admin`.
- `apps/site/lib/setupEvents.ts` — module-level side effect calling
  `configureSharedEvents({ getClient })` per the Contracts section.
  No exports.
- `shared/events/draftCreation.ts` — `createStarterDraftContent`
  and `createDuplicatedDraftContent` helpers per the Contracts
  section. Body identical to apps/web's current
  `apps/web/src/admin/draftCreation.ts` modulo import paths.

## Files to touch — modify

- [`apps/site/components/SharedClientBootstrap.tsx`](../../apps/site/components/SharedClientBootstrap.tsx)
  — add `import "../lib/setupEvents";` immediately after the
  existing `setupAuth` side-effect import. No JSX or export
  changes.
- [`shared/events/index.ts`](../../shared/events/index.ts) — add
  re-exports for `createStarterDraftContent` and
  `createDuplicatedDraftContent` (and any `DraftEventSummary` /
  `DraftEventDetail` types not already exported, per the
  Contracts resolution).
- [`apps/web/src/admin/draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)
  — replace the file body with a thin re-export shim from
  `shared/events/draftCreation.ts`. apps/web call sites continue
  to import the existing path unchanged.
- [`shared/urls/routes.ts`](../../shared/urls/routes.ts) — remove
  the `routes.adminEventsPrefix` field, the `routes.adminEvent`
  builder, the `matchAdminEventPath` function, and the
  `/admin/events/${string}` branch from the `AppPath` union type.
- [`shared/urls/validateNextPath.ts`](../../shared/urls/validateNextPath.ts)
  — remove the `matchAdminEventPath` import (line 2) and the
  branch at lines 51-53.
- [`shared/urls/index.ts`](../../shared/urls/index.ts) — drop the
  `matchAdminEventPath` re-export (line 13).
- [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx) — drop the
  `pathname === routes.admin` branch (lines 24-25), the
  `matchAdminEventPath(pathname)` branch (lines 28-36), the
  `AdminPage` import, and the `matchAdminEventPath` import from
  `shared/urls`.
- [`apps/web/vercel.json`](../../apps/web/vercel.json) — remove
  the `/admin/:path*` SPA fallback rule (lines 36-38) and add
  `/admin` and `/admin/:path*` proxy-rewrites pointing at
  `https://neighborly-events-site.vercel.app/...` per the
  Contracts section.
- [`tests/shared/urls/routes.test.ts`](../../tests/shared/urls/routes.test.ts)
  — remove the entire `describe("admin event routes", …)` block
  at lines 11-27 and the `matchAdminEventPath` import on line 3.
- [`tests/shared/urls/validateNextPath.test.ts`](../../tests/shared/urls/validateNextPath.test.ts)
  — remove the two `it("accepts an admin event selection route", …)`
  / `it("accepts a URL-encoded admin event id", …)` cases (lines
  65-75) and add equivalent rejection cases (`/admin/events/some-id`
  and `/admin/events/id%20with%20spaces` should both fall through
  to `routes.home`) into the `rejectedInputs` list at the top of
  the file. The torture-test array at line 134 keeps `/admin`;
  no edit needed there since `routes.admin` still allow-lists.
- [`tests/e2e/admin-workflow.admin.spec.ts`](../../tests/e2e/admin-workflow.admin.spec.ts)
  — retarget the four URL references per the Contracts section
  ("E2E spec retargeting"). Lines 65, 91, 125 — replace
  `/admin/events/${eventId}` with `/event/${eventSlug}/admin`.
- [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
  — retarget the three URL references per the Contracts section.
  Lines 72, 95, 123 — replace `/admin/events/${eventId}` with
  `/event/${eventSlug}/admin`.
- [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
  — extend `isSiteRequest()` to include `/admin` and
  `/admin/...` paths in the apps/site routing branch (current
  lines 47-56); update `handleReadyRequest()`'s readiness probe
  on line 97 to target apps/site instead of apps/web for the
  `/admin` URL.
- [`scripts/ui-review/capture-ui-review.cjs`](../../scripts/ui-review/capture-ui-review.cjs)
  — retarget `/admin/events/:eventId` workspace captures to
  `/event/:slug/admin` (currently lines 634, 639-640, 835); add
  an inline comment header noting that local runs targeting
  `/admin*` must use the auth e2e proxy origin so the apps/site
  `/admin` resolves correctly.
- [`docs/architecture.md`](../architecture.md) — update URL
  ownership shape: apps/site now owns `/admin*` in addition to
  `/` and `/auth/callback` from 2.3; apps/web's transitional
  ownership shrinks to `/event/:slug/*` (game / admin / redeem /
  redemptions). Concrete edits — line 30 (transitional ownership
  parenthetical), line 61 (Vercel routing topology table), lines
  95-96 (apps/web `/admin` route adapter description — delete or
  rewrite as apps/site adapter), lines 190-195 (apps/web admin
  module description rewrite to describe only `EventAdminWorkspace`
  + the deep-editor reuse set), line 211 (apps/site landing
  description — extend with `/admin` ownership), lines 619-640
  (the "web app now includes a dedicated /admin route" section —
  rewrite to describe apps/site ownership and the `/auth/callback?next=/admin`
  flow). Add the apps/site `/admin` page to the layout / module-ownership
  section.
- [`docs/operations.md`](../operations.md) — update line 51
  (`SPA route rewrites for /admin, /event/:slug/game, …`) to drop
  `/admin` from the SPA list and note the apps/site cross-app
  proxy carries it; update lines 174-175 (the `next=` allow-list
  example) to drop `/admin/events/:eventId`; update line 261
  (production smoke `curl -I "${BASE_URL}/admin"` example —
  unchanged URL but call out that the response now resolves
  through apps/site); update line 289 (Supabase dashboard
  redirect-URL list — `/admin` URL unchanged; only the resolving
  framework changes).
- [`docs/dev.md`](../dev.md) — update the apps/web URL list,
  the Vercel two-project rule precedence walk-through (the
  rules added/removed by 2.4), and the auth e2e proxy
  sub-section (the proxy's `isSiteRequest` set widens to
  include `/admin*`). Concrete line edits identified at
  implementation time against the merged-in 2.3 state of dev.md.
- [`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  — Phase Status table row for 2.4 updates from `not yet drafted`
  / `Proposed` to the path of this plan when the plan-drafting
  commit lands; the same row updates to `In progress pending prod
  smoke` and gains a PR link when the implementing PR merges; the
  same row flips to `Landed` and gains a second PR link in the
  doc-only follow-up commit.
- This plan — Status flips from `Proposed` to `In progress pending
  prod smoke` in the implementing PR; flips to `Landed` in the
  doc-only follow-up commit per
  [`docs/testing-tiers.md`](../testing-tiers.md) "Plan-to-Landed
  Gate For Plans That Touch Production Smoke." The Status string
  is the rule's exact required label, not a paraphrase.

## Files to touch — delete

- [`apps/web/src/pages/AdminPage.tsx`](../../apps/web/src/pages/AdminPage.tsx)
  — platform-admin route adapter; sole consumer is the deleted
  `App.tsx` branches.
- [`apps/web/src/admin/AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx)
  — platform-admin content shell.
- [`apps/web/src/admin/AdminPageShell.tsx`](../../apps/web/src/admin/AdminPageShell.tsx)
  — platform-admin chrome (sign-out, navigate-home).
- [`apps/web/src/admin/AdminEventWorkspace.tsx`](../../apps/web/src/admin/AdminEventWorkspace.tsx)
  — platform-admin selected-event detail workspace. **Distinct
  from `EventAdminWorkspace.tsx`** (per-event admin from 2.2,
  stays). Names differ by word order (`AdminEvent…` vs.
  `EventAdmin…`); reviewers must classify the diff carefully.
- [`apps/web/src/admin/useAdminDashboard.ts`](../../apps/web/src/admin/useAdminDashboard.ts)
  — platform-admin state hook.
- [`tests/web/admin/AdminDashboardContent.test.tsx`](../../tests/web/admin/AdminDashboardContent.test.tsx)
  / [`AdminEventWorkspace.test.tsx`](../../tests/web/admin/AdminEventWorkspace.test.tsx)
  / [`useAdminDashboard.test.ts`](../../tests/web/admin/useAdminDashboard.test.ts)
  / [`AdminPageShell.test.tsx`](../../tests/web/admin/AdminPageShell.test.tsx)
  — corresponding tests for the deleted source files. Verified
  by `find tests/web/admin -name "*.test.*"` against the actual
  pre-edit tree at implementation time; if the file paths differ,
  the deletion list updates accordingly.

Admin-only SCSS partials under
[`apps/web/src/styles/`](../../apps/web/src/styles/) require a
grep audit at edit time. Selectors specific to the deleted
platform-admin components (`.admin-state-stack`, `.admin-signed-in-as`,
`.section-heading`, plus any platform-admin-specific layouts in
`_admin.scss` or similar) drop only if they have **zero**
surviving consumers post-delete (the deep editor reuses some of
the same selectors); preserve any selector that the per-event
`/event/:slug/admin` deep editor still depends on. Per AGENTS.md
"Styling Token Discipline," the audit is `grep -rn "<selector>"
apps/web/src` against the surviving file set, not a presumption.

## Files intentionally not touched

- `supabase/migrations/*` — no SQL change.
- `supabase/functions/*` — no Edge Function change. The four
  authoring functions are reached unchanged via the existing
  shared client; only the calling apps/site UI is new.
- [`supabase/config.toml`](../../supabase/config.toml) — the
  `verify_jwt = false` entries for the four authoring functions
  re-confirmed unchanged; no edit. Verified by:
  [`supabase/config.toml:9-19`](../../supabase/config.toml#L9).
- [`shared/auth/`](../../shared/auth/) — no API change. The
  apps/site `/admin` page is a new consumer of the existing
  browser-only surface.
- [`shared/events/`](../../shared/events/) — only adds the new
  `draftCreation.ts` module + index re-exports. Existing
  `getGameAdminStatus`, `listDraftEventSummaries`,
  `loadDraftEventStatus`, `saveDraftEvent`, `generateEventCode`,
  `publishDraftEvent`, `unpublishEvent` signatures unchanged.
- [`shared/db/`](../../shared/db/) — no change. apps/site's
  `getBrowserSupabaseClient` (shipped by 2.3) is the consumer.
- [`shared/styles/`](../../shared/styles/) — no change.
- [`shared/urls/routes.ts`](../../shared/urls/routes.ts)
  `routes.admin`, `routes.eventAdmin(slug)`, and the rest of the
  table — stay verbatim. Only the deprecated admin-event family
  removes.
- [`apps/site/lib/setupAuth.ts`](../../apps/site/lib/setupAuth.ts)
  / [`supabaseBrowser.ts`](../../apps/site/lib/supabaseBrowser.ts)
  / [`apps/site/app/(authenticated)/layout.tsx`](../../apps/site/app/(authenticated)/layout.tsx)
  / [`apps/site/app/(authenticated)/auth/callback/page.tsx`](../../apps/site/app/(authenticated)/auth/callback/page.tsx)
  — verbatim reuse from 2.3.
- apps/web's deep-editor file set per the per-phase invariant
  ("Deep-editor surface untouched"): `EventAdminPage.tsx`,
  `EventAdminWorkspace.tsx`, `useEventAdminWorkspace.ts`,
  `AdminEventDetailsForm.tsx`, `AdminQuestionEditor.tsx`,
  `AdminQuestionList.tsx`, `AdminQuestionFields.tsx`,
  `AdminOptionEditor.tsx`, `AdminPublishPanel.tsx`,
  `useSelectedDraft.ts`, `eventDetails.ts`, `publishChecklist.ts`,
  `questionBuilder.ts`, `questionFormMapping.ts`,
  `questionStructure.ts`, plus `tests/web/admin/*` for those
  files.
- [`apps/web/src/auth/index.ts`](../../apps/web/src/auth/index.ts)
  — no change. The existing `SignInForm`, `useAuthSession`,
  `MagicLinkState` re-exports are still consumed by the deep
  editor at `/event/:slug/admin`.
- [`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts)
  — no edit. The fixture's `/auth/callback?next=/admin` redirect
  URL is unchanged; only the resolving framework changes.
- [`apps/site/next.config.ts`](../../apps/site/next.config.ts) —
  no change. The `env` block from 2.3's
  [#120](https://github.com/kcrobinson-1/neighborly-events/pull/120)
  follow-up keeps inlining `NEXT_PUBLIC_SUPABASE_*` for the apps/site
  bundle the new `/admin` page is part of.
- [`apps/site/package.json`](../../apps/site/package.json) — no
  dependency add. The new `/admin` page consumes only existing
  apps/site dependencies plus the workspace's `shared/auth/` and
  `shared/events/` modules.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and a feature branch
   (not `main`). Re-read
   [`scoping/m2-phase-2-4.md`](./scoping/m2-phase-2-4.md),
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   "Cross-Phase Decisions" §3 / §6 / §7 / "Settled by default,"
   the M1 phase 1.4 binding-module precedent at
   [`apps/web/src/lib/adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts),
   and 2.3's apps/site adapter pair at
   [`apps/site/lib/setupAuth.ts`](../../apps/site/lib/setupAuth.ts) +
   [`apps/site/lib/supabaseBrowser.ts`](../../apps/site/lib/supabaseBrowser.ts)
   so the new `setupEvents.ts` module mirrors the established
   pattern verbatim.
2. **Baseline validation.** Run `npm run lint`, `npm test`,
   `npm run test:functions`, `npm run build:web`, and
   `npm run build:site`. All must pass before any edit. Capture a
   `npm run ui:review:capture:admin` snapshot of the existing
   apps/web `/admin` event-list and `/admin/events/${eventId}`
   workspace states so the PR description has a before reference.
3. **Shared starter helper extraction.** Create
   `shared/events/draftCreation.ts` with bodies copied from
   apps/web's
   [`apps/web/src/admin/draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts);
   adjust import paths. Add re-exports to
   [`shared/events/index.ts`](../../shared/events/index.ts).
   Replace
   [`apps/web/src/admin/draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)
   body with the binding-shim re-export. Run `npm run lint` +
   `npm run build:web` to confirm apps/web's existing call sites
   resolve unchanged.
4. **`shared/urls` deprecation.** Edit
   [`shared/urls/routes.ts`](../../shared/urls/routes.ts) to
   remove `adminEventsPrefix`, `adminEvent`,
   `matchAdminEventPath`, and the `/admin/events/${string}` `AppPath`
   branch. Edit
   [`shared/urls/validateNextPath.ts`](../../shared/urls/validateNextPath.ts)
   and [`shared/urls/index.ts`](../../shared/urls/index.ts) to
   drop the corresponding imports / re-exports. Update
   [`tests/shared/urls/routes.test.ts`](../../tests/shared/urls/routes.test.ts)
   (delete the "admin event routes" describe block) and
   [`tests/shared/urls/validateNextPath.test.ts`](../../tests/shared/urls/validateNextPath.test.ts)
   (move the two `/admin/events/...` cases into `rejectedInputs`).
   `npm test` confirms the suite stays green.
5. **apps/site setupEvents adapter + bootstrap update.** Create
   `apps/site/lib/setupEvents.ts` per the Contracts section; edit
   [`apps/site/components/SharedClientBootstrap.tsx`](../../apps/site/components/SharedClientBootstrap.tsx)
   to add the `import "../lib/setupEvents";` line. `npm run build:site`
   confirms the imports resolve.
6. **apps/site `/admin` page.** Create
   `apps/site/app/(authenticated)/admin/page.tsx` per the
   Contracts section. Implement the sign-in / loading / unauthorized
   / signed-in-allowlisted state stack with the ARIA / copy
   stability invariant in mind — every locator the existing e2e
   specs use must resolve. `npm run build:site` confirms the route
   compiles. Run `npm run dev:site` and visit
   `http://localhost:3000/admin` — confirm the signed-out
   in-place sign-in form renders with apps/site Sage Civic
   typography (Fraunces heading, Inter body) and apps/site brand
   colors (no `<ThemeScope>` wrap; root-layout defaults apply).
   The CTA buttons (`Open workspace`, `Open live game`) cannot be
   exercised in isolation because they target apps/web URLs the
   apps/site dev server doesn't serve — that's expected; production
   resolves them via the proxy-rewrite topology.
7. **Vercel proxy flip + apps/web `/admin` removal.** Edit
   [`apps/web/vercel.json`](../../apps/web/vercel.json) per the
   Contracts section: remove the `/admin/:path*` SPA rule, add
   `/admin` and `/admin/:path*` proxy-rewrites. Edit
   [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx) to drop the
   `routes.admin` and `matchAdminEventPath` branches and the
   `AdminPage` / `matchAdminEventPath` imports. Delete
   [`apps/web/src/pages/AdminPage.tsx`](../../apps/web/src/pages/AdminPage.tsx),
   [`apps/web/src/admin/AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx),
   [`apps/web/src/admin/AdminPageShell.tsx`](../../apps/web/src/admin/AdminPageShell.tsx),
   [`apps/web/src/admin/AdminEventWorkspace.tsx`](../../apps/web/src/admin/AdminEventWorkspace.tsx),
   and [`apps/web/src/admin/useAdminDashboard.ts`](../../apps/web/src/admin/useAdminDashboard.ts).
   Delete the corresponding test files under `tests/web/admin/`
   per the audit in "Files to touch — delete." `npm run build:web`
   confirms apps/web compiles without the deleted modules.
8. **SCSS prune (if applicable).** Grep
   [`apps/web/src/styles/`](../../apps/web/src/styles/) for the
   selectors used only by the deleted platform-admin components
   (`.admin-state-stack`, `.admin-signed-in-as`, plus any
   platform-admin-only layout selectors). For each selector
   confirm zero surviving consumers via `grep -rn`. Drop the
   selector / partial only when zero consumers remain. Selectors
   the deep editor still uses are preserved verbatim.
   `npm run build:web` confirms SCSS still compiles.
9. **E2E spec retargeting.** Edit
   [`tests/e2e/admin-workflow.admin.spec.ts`](../../tests/e2e/admin-workflow.admin.spec.ts)
   and
   [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
   per the Contracts section ("E2E spec retargeting"). Edit
   [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
   `isSiteRequest()` and `handleReadyRequest()` per the same
   section. Edit
   [`scripts/ui-review/capture-ui-review.cjs`](../../scripts/ui-review/capture-ui-review.cjs)
   to retarget legacy workspace URLs.
10. **Local e2e exercise.** With apps/site env vars set in
    `apps/site/.env.local` (see 2.3's
    [`docs/dev.md`](../dev.md) "apps/site environment variables"
    sub-section), run the auth e2e proxy:
    `npx playwright test --config playwright.admin.config.ts`.
    The auth e2e proxy starts apps/web (Vite, port 4173) and
    apps/site (Next dev), routing `/admin*` + `/auth/callback` +
    `/_next/*` + `/` to apps/site and everything else to apps/web.
    The `admin-workflow.admin.spec.ts` test exercises the full
    save / publish / unpublish round-trip through the post-2.4
    URL contract: `/admin` (apps/site) → `Open workspace`
    →  `/event/${slug}/admin` (apps/web) → save / publish /
    unpublish through the proxied authoring functions →
    `/admin` again. Confirms the cross-app navigation, ARIA /
    copy stability, and the `installAuthoringFunctionProxy`
    setup all work end-to-end on the local origins.
    Load-bearing pre-merge — exercises the new code in isolation
    where the cross-project proxy can be fully reproduced.
11. **Local apps/web smoke (pre-deploy).** Run `npm run dev:web`
    and visit `http://localhost:5173/event/${seeded-slug}/admin`
    directly. The deep editor must still render — phase 2.2
    surface is untouched, but the SCSS prune from step 8 could
    have inadvertently dropped a still-consumed selector.
    `npm run dev:site` and visit `/admin` directly to confirm
    the platform admin renders the in-place sign-in form (the
    apps/site dev server does not honor the apps/web Vercel
    proxy, so cross-app navigation buttons land on apps/site
    404s — that's expected; the auth e2e proxy from step 10
    is the integrated check).
12. **Validation re-run.** All baseline commands from step 2 must
    pass. `npm run lint` covers apps/site source. `npm run build:web`
    and `npm run build:site` confirm both apps compile.
    `npm test` confirms the unit + shared-suite changes.
    `npm run test:functions` — no Edge Function source change in
    this phase, but rerun for completeness.
13. **`vercel dev` rule-order regression check (negative-control
    procedure).** Same identity-fingerprint procedure 2.3
    established at
    [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) execution step
    14. The check **cannot** validate the new `/admin*` proxy
    rules end-to-end because
    [`apps/web/vercel.json`](../../apps/web/vercel.json)
    destinations are absolute production URLs; under `vercel dev`
    the proxy hits the deployed apps/site (still on main, no new
    `/admin` route yet pre-deploy), not the branch's local Next.js
    dev server. The check verifies (a) existing rules still fire
    correctly (e.g., `/event/community-checklist` still proxies
    to deployed apps/site, surviving rule reorder), (b) the new
    `/admin` and `/admin/:path*` rules fire (response carries the
    deployed-apps/site identity headers from 2.3's fingerprint
    capture, distinguishing "rule fired and reached deployed
    apps/site" from "local-no-match" and from "rule missing"),
    and (c) `/admin` no longer hits apps/web's SPA fallback (the
    deleted rule). Capture the curl outputs in the PR validation
    section as the load-bearing fingerprint.
14. **Comment + README hygiene.** Walk
    [`docs/architecture.md`](../architecture.md),
    [`docs/operations.md`](../operations.md), and
    [`docs/dev.md`](../dev.md) per the modify-list edits.
    [`README.md`](../../README.md) — confirm the route ownership
    summary still reads correctly post-2.4 (apps/web's footprint
    is now event-scoped only); update if any line still names
    `/admin` as apps/web-owned.
15. **Documentation pass.** Walk the
    [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate"
    triggers: `docs/architecture.md` updates because URL ownership
    + module ownership shifted; `docs/operations.md` updates
    because the Vercel routing topology shifted; `docs/dev.md`
    updates because the auth e2e proxy widens; `docs/product.md`
    does not update (no user-visible product capability change —
    the platform admin's framework changes, the capability set
    stays); `docs/backlog.md` does not update; `docs/open-questions.md`
    does not update (the post-MVP authoring-ownership entry closes
    with 2.5);
    [`event-platform-epic.md`](./event-platform-epic.md) M2 row
    stays `Proposed` (its flip lands with 2.5);
    [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
    Phase Status table row updates per the modify-list rules.
16. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against every Cross-Cutting Invariant
    above and every Self-Review Audit named below. Apply fixes in
    place; commit review-fix changes separately when that clarifies
    history per
    [`AGENTS.md`](../../AGENTS.md) Review-Fix Rigor.
17. **Plan-to-PR completion gate (in-progress).** Walk every Goal,
    Cross-Cutting Invariant, Validation Gate command, and
    Self-Review Audit named in this plan. Confirm each is either
    satisfied in the implementing PR, deferred in this plan with
    rationale, or marked as a deferred-to-production check that
    the post-release `Production Admin Smoke` run (step 19)
    satisfies. Flip Status from `Proposed` to **`In progress
    pending prod smoke`** in the same PR — the rule's exact
    required string per
    [`docs/testing-tiers.md`](../testing-tiers.md), not a
    paraphrase. The `Landed` flip lands in step 20's doc-only
    follow-up commit.
18. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters
    (suggested: `feat(m2-2.4): migrate /admin to apps/site`).
    Validation section lists every command actually run plus the
    step-13 rule-order regression check; explicitly notes that
    cross-project end-to-end verification of the new `/admin*`
    proxy rules is deferred to the post-release `Production
    Admin Smoke` run (step 19) per the two-phase Plan-to-Landed
    Gate. UX Review: include before/after screenshots of `/admin`
    (apps/web AdminPage → apps/site `/admin` page), captured
    by running the auth e2e proxy and walking the same fixture
    state for both. The deep-editor screenshots (apps/web
    `/event/:slug/admin`) do not need re-capture (phase 2.2
    surface unchanged). Remaining Risk: every cross-project
    end-to-end assertion is deferred to the post-release smoke
    run by construction; the doc-only follow-up commit (step 20)
    is the gate that actually flips Status to `Landed`.
19. **Post-release `Production Admin Smoke` run (release-owner
    activity — load-bearing gate).** After the PR merges and
    Vercel deploys both apps to production, the release owner
    triggers (or waits for) the `Production Admin Smoke`
    workflow run per the existing
    [`docs/tracking/production-admin-smoke-tracking.md`](../tracking/production-admin-smoke-tracking.md)
    procedure. The workflow runs the modified
    [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
    end-to-end on the production origin; this is the load-bearing
    verification of the cross-project `/admin*` proxy. The fixture
    cannot pass post-deploy unless the apps/web `vercel.json` proxy
    correctly routes `/admin` to apps/site, the auth cookie lands
    on apps/web's frontend host (preserved by 2.3's host-only
    cookie), the apps/site `/admin` page renders the workspace
    with the new ARIA / copy contract, the `Open workspace` button
    hard-navigates to `/event/${slug}/admin` (apps/web deep
    editor), the deep editor saves / publishes / unpublishes via
    the authoring functions, and direct navigation to
    `/event/${slug}/admin` reaches the deep editor. The smoke run
    URL is the durable external evidence the Plan-to-Landed Gate
    requires.

    If the smoke run fails, file a focused follow-up rather than
    treating Status as flippable. Step 20 cannot proceed without a
    green smoke run URL to record.
20. **Plan Status follow-up (doc-only commit).** Once the
    `Production Admin Smoke` run from step 19 passes green, open
    a doc-only commit on a follow-up branch that:
    - Flips this plan's Status from `In progress pending prod
      smoke` to `Landed`.
    - Records the smoke run URL inline in the Status section as
      the durable external evidence per
      [`docs/testing-tiers.md`](../testing-tiers.md). Mirrors the
      2.3 plan's "Production verification evidence" pattern.
    - Updates
      [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
      Phase Status table row for 2.4 to `Landed` with both PR
      links (the implementing PR and this doc-only follow-up).
    The follow-up commit's PR description references the smoke
    run URL as the source of truth.

## Commit boundaries

Per [`AGENTS.md`](../../AGENTS.md) "Planning Depth," commit slices
named upfront:

1. **Shared starter helper extraction + apps/web binding shim.**
   New `shared/events/draftCreation.ts`,
   [`shared/events/index.ts`](../../shared/events/index.ts) re-export
   additions, and the apps/web
   [`draftCreation.ts`](../../apps/web/src/admin/draftCreation.ts)
   shim. Single commit; behavior-preserving for apps/web; the new
   shared module has no apps/site consumer until commit 3.
2. **`shared/urls` deprecation + test cleanup.**
   [`shared/urls/routes.ts`](../../shared/urls/routes.ts) /
   [`validateNextPath.ts`](../../shared/urls/validateNextPath.ts) /
   [`index.ts`](../../shared/urls/index.ts) edits +
   [`tests/shared/urls/routes.test.ts`](../../tests/shared/urls/routes.test.ts)
   describe-block deletion +
   [`tests/shared/urls/validateNextPath.test.ts`](../../tests/shared/urls/validateNextPath.test.ts)
   case migration. Single commit; passes `npm test` because the
   only call sites of the deprecated routes (apps/web `App.tsx`
   admin branches, the deleted dashboard files) are removed in
   commit 4 — but **the build still passes here** because the
   `App.tsx` branches that consume `routes.adminEvent`,
   `matchAdminEventPath` are still present at this point and TypeScript
   would fail. **Therefore commit 2 lands together with commit 4
   in a single squash, or the rule-order is reversed**: lock the
   final order at edit time so every commit's tip passes
   `npm run build:web`. The implementer chooses whichever sequencing
   keeps each commit green; the recommended order is "delete
   apps/web `/admin` first (commit 4 below), then prune
   `shared/urls` (commit 2 above)" — but the README header on
   commit 2 explains the dependency.
3. **apps/site `/admin` scaffold.** New
   `apps/site/app/(authenticated)/admin/page.tsx`,
   `apps/site/lib/setupEvents.ts`, and the
   [`SharedClientBootstrap.tsx`](../../apps/site/components/SharedClientBootstrap.tsx)
   one-line edit. Single commit; the apps/site `/admin` route
   is reachable on the apps/site dev server but production behavior
   is unchanged because apps/web `vercel.json` still SPA-handles
   `/admin*` (the proxy flip is commit 5).
4. **apps/web platform-admin removal.** apps/web `/admin` route
   handler deletes (`AdminPage.tsx`,
   [`AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx),
   [`AdminPageShell.tsx`](../../apps/web/src/admin/AdminPageShell.tsx),
   [`AdminEventWorkspace.tsx`](../../apps/web/src/admin/AdminEventWorkspace.tsx),
   [`useAdminDashboard.ts`](../../apps/web/src/admin/useAdminDashboard.ts)),
   the [`App.tsx`](../../apps/web/src/App.tsx) branch removals,
   the corresponding `tests/web/admin/*` test deletions, and the
   SCSS prune. Single commit; this is one of two load-bearing
   cutover commits. **Sequencing note:** commit 2's `shared/urls`
   deprecation depends on this commit's `App.tsx` deletions
   landing first — if commit 2 lands first, `App.tsx`'s
   `matchAdminEventPath` import breaks. Implementer locks the
   actual order at edit time.
5. **Vercel proxy flip + tooling retarget.**
   [`apps/web/vercel.json`](../../apps/web/vercel.json) edit (delete
   SPA fallback, add proxy-rewrites),
   [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
   `isSiteRequest()` and ready-probe edits,
   [`tests/e2e/admin-workflow.admin.spec.ts`](../../tests/e2e/admin-workflow.admin.spec.ts)
   and
   [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
   URL retargeting, and the
   [`scripts/ui-review/capture-ui-review.cjs`](../../scripts/ui-review/capture-ui-review.cjs)
   workspace URL retarget. Single commit; this is the second
   load-bearing cutover commit. After this lands, local auth e2e
   exercises the full cross-app flow correctly.
6. **Documentation pass.**
   [`docs/architecture.md`](../architecture.md) /
   [`docs/operations.md`](../operations.md) /
   [`docs/dev.md`](../dev.md) edits per modify-list +
   [`README.md`](../../README.md) currency check + the
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   Phase Status row update + this plan's Status flip in this file
   from `Proposed` to **`In progress pending prod smoke`**. Single
   commit. **Not** the `Landed` flip — that ships in the step-20
   doc-only follow-up commit.
7. **Review-fix commits.** As needed during step 16, kept distinct
   from the substantive implementation commits per AGENTS.md
   Review-Fix Rigor.
8. **Doc-only Status follow-up (separate branch + PR).** Per
   step 20, lands after the post-release `Production Admin Smoke`
   run from step 19 passes green: this plan's Status flips to
   `Landed`, the smoke run URL is recorded inline as the durable
   external evidence,
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   Phase Status row flips to `Landed` and gains both PR links.
   Single commit on a follow-up branch; the implementing PR
   stays at `In progress pending prod smoke` until this commit
   merges.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. Test changes:
  `tests/shared/urls/routes.test.ts` describe block removed;
  `tests/shared/urls/validateNextPath.test.ts` two cases moved
  to rejected list; `tests/web/admin/*` files for the deleted
  apps/web platform-admin components removed.
- `npm run test:functions` — pass on baseline; pass on final. No
  Edge Function source change.
- `npm run build:web` — pass on baseline; pass on final. Verifies
  apps/web compiles after `/admin` route handler + module deletes
  and after `shared/urls` deprecation (whichever commit order the
  implementer chose).
- `npm run build:site` — pass on baseline; pass on final. The
  build verifies apps/site's TypeScript compiles, the new
  `/admin` page resolves inside the `(authenticated)` route group,
  and the `setupEvents` side-effect import does not violate
  Next.js 16 conventions.
- pgTAP suite — pass on baseline; pass on final via
  `npm run test:db`. No SQL change in this phase; the gate
  confirms 2.1.1's broadened policies still hold.
- Local auth e2e exercise per Execution step 10 — load-bearing
  pre-merge for the cross-app navigation contract +
  `Open workspace` retargeting + ARIA / copy stability. The auth
  e2e proxy reproduces the production cross-app proxy on local
  origins, exercising what `vercel dev` cannot reach. The full
  `admin-workflow.admin.spec.ts` save / publish / unpublish
  round-trip is the integration check.
- `vercel dev` rule-order regression check per Execution step 13
  — load-bearing pre-merge for "the new `/admin*` proxy rules
  don't shadow existing routes and actually fire (not local-no-match
  404)." Uses 2.3's identity-fingerprint procedure; the apps/site
  positive signature and the local-no-match negative control are
  the load-bearing assertions.
- **Post-release `Production Admin Smoke` run per Execution step 19
  — load-bearing gate, deferred to production by construction.**
  Per [`docs/testing-tiers.md`](../testing-tiers.md) "Plan-to-Landed
  Gate For Plans That Touch Production Smoke," 2.4 ships under the
  two-phase gate. **Both trigger clauses apply**: the rule's first
  clause ("plans that extend production smoke assertions") catches
  the URL retargeting in
  [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts);
  the second clause ("plans that depend on production smoke as
  final verification") catches the cross-project proxy that's
  unverifiable pre-merge. Either alone would suffice. The
  implementing PR merges with Status `In progress pending prod
  smoke`; the doc-only follow-up commit (Execution step 20)
  flips Status to `Landed` after the smoke run is green and
  records the run URL inline.
- Existing e2e fixtures
  ([`admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts),
  [`redeem-auth-fixture.ts`](../../tests/e2e/redeem-auth-fixture.ts),
  [`redemptions-auth-fixture.ts`](../../tests/e2e/redemptions-auth-fixture.ts))
  — must continue to pass. The fixtures' magic-link redirect URLs
  are unchanged; the auth e2e proxy widens to route `/admin*` to
  apps/site so the round-trip resolves correctly post-2.4.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md) and
matched to this phase's diff surfaces.

### Frontend (apps/site)

- **Silent-no-op on missing lookup**
  ([catalog §Silent-no-op on missing lookup audit](../self-review-catalog.md#L420)).
  Event list `listDraftEventSummaries()` empty result must render
  an empty-state message that distinguishes "no drafts exist" from
  "lookup failed." The apps/web `useAdminDashboard.ts` collapses
  load failure into a single error state; the new apps/site page
  keeps "empty result" and "lookup failed" separate. Reads /
  writes that depend on `getGameAdminStatus()` similarly distinguish
  "false (not allowlisted)" from "RPC failed."
- **Error-surfacing for user-initiated mutations**
  ([catalog §Error-surfacing for user-initiated mutations](../self-review-catalog.md#L266)).
  Create, duplicate, publish, and unpublish click handlers surface
  failures inline. Mirror the apps/web `AdminPublishPanel` pattern
  (`publishState: 'error'` with a message). Failure path does not
  navigate.
- **Effect cleanup audit**
  ([catalog §Effect cleanup audit](../self-review-catalog.md#L287)).
  The `signed_in` → admin-status-fetch → drafts-list-fetch effect
  uses the `isCancelled` pattern from
  [`useAdminDashboard.ts:88-143`](../../apps/web/src/admin/useAdminDashboard.ts#L88).
  Next.js's strict-mode double-mount must not produce two parallel
  fetches racing into `setDashboardState`.
- **Post-save reconciliation audit**
  ([catalog §Post-save reconciliation audit](../self-review-catalog.md#L227)).
  Publish / unpublish UI reconciles to the server-returned canonical
  state, not a locally optimistic flip. The new apps/site page
  inherits the discipline from
  [`AdminPublishPanel`](../../apps/web/src/admin/AdminPublishPanel.tsx)'s
  pattern; verify each lifecycle handler updates state from the
  server response, not from "pending success."

### Frontend (apps/web — removal)

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../self-review-catalog.md#L354)).
  apps/web platform-admin file deletes are pure deletes, not
  renames; the deep-editor files staying in place are non-edits
  (except `draftCreation.ts` becoming a binding shim — describe
  this explicitly so reviewers don't flag the file as rewritten);
  the apps/site `/admin` page is a fresh client-component
  implementation, not a copy of the apps/web component (different
  framework idioms — React Router → Next.js App Router; SCSS →
  global CSS; pure-React state hook → trimmed-scope state hook).
  Reviewers see one apps/web surface shrink + one apps/site surface
  grow + a shared starter helper extraction; the diff narrative
  for the PR is "platform admin migrates apps to apps/site,"
  not "apps/site grew an unrelated new feature."

### CI / build

- **CLI / tooling pinning audit**
  ([catalog §CLI / tooling pinning audit](../self-review-catalog.md#L331)).
  No new
  [`apps/site/package.json`](../../apps/site/package.json)
  dependencies. The new `/admin` page consumes only existing
  apps/site dependencies plus the workspace's shared modules.
  Audit confirms the lockfile does not drift.
- **Readiness-gate truthfulness audit**
  ([catalog §Readiness-gate truthfulness audit](../self-review-catalog.md#L373)).
  The validation gate's "cross-app `/admin` flow works end-to-end"
  claim references the post-release `Production Admin Smoke` run
  from step 19 as the load-bearing verification, not just code
  shape. Pre-merge, the claim reads as "code shape is consistent
  with the cross-app navigation invariant; production verification
  is the post-release smoke run, whose URL is recorded in the
  doc-only follow-up commit per step 20." The local auth e2e
  exercise (step 10) is the strongest pre-merge integration check
  because it reproduces the cross-app proxy on local origins.

### Runbook

- **Platform-auth-gate config audit**
  ([catalog §Platform-auth-gate config audit](../self-review-catalog.md#L446)).
  Three configuration surfaces pair with the `/admin` migration:
  - **`supabase/config.toml`** — re-confirmed unchanged. The four
    authoring functions (`save-draft`, `publish-draft`,
    `unpublish-event`, `generate-event-code`) keep
    `verify_jwt = false`. Verified by:
    [`supabase/config.toml:9-19`](../../supabase/config.toml#L9).
  - **Supabase Auth dashboard redirect-URL list** — the URL
    `/auth/callback?next=/admin` is unchanged; only the resolving
    framework for `/admin` changes. The dashboard's redirect-URL
    list matches against the apps/web frontend domain, which is
    still the entry point because the proxy-rewrite preserves
    host. No dashboard edit is required. The PR description names
    this assertion explicitly.
  - **apps/site Vercel project env vars.** Already set by 2.3's
    [#120](https://github.com/kcrobinson-1/neighborly-events/pull/120)
    for the `/auth/callback` and `/` deploy. The new `/admin`
    page consumes the same `NEXT_PUBLIC_SUPABASE_*` values; no
    additional env-var configuration required. Audit confirms
    the existing vars cover the new page's bundle.

## Documentation Currency PR Gate

Per [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/architecture.md`](../architecture.md) — URL ownership
  shape; Vercel routing topology; apps/site `/admin` ownership;
  apps/web admin module rewrites (delete platform-admin
  description; preserve deep-editor description).
- [`docs/operations.md`](../operations.md) — Vercel routing
  description; admin URL contract; production smoke `curl` example
  context.
- [`docs/dev.md`](../dev.md) — apps/web URL list, Vercel
  rule-precedence walk-through, auth e2e proxy `isSiteRequest`
  set widening; admin UI review path retargeting if applicable.
- [`README.md`](../../README.md) — route ownership summary
  currency check; update if any line still names `/admin` as
  apps/web-owned.
- [`docs/product.md`](../product.md) — no change. The platform
  admin's framework changes; the capability set stays.
- [`docs/open-questions.md`](../open-questions.md) — no change.
  The post-MVP authoring-ownership entry closes with 2.5.
- [`docs/backlog.md`](../backlog.md) — no change. The
  organizer-managed-agent-assignment unblock records with 2.5.
- [`event-platform-epic.md`](./event-platform-epic.md) — M2 row
  stays `Proposed`. Its flip lands with 2.5.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status table row for 2.4 updates from `not yet drafted` /
  `Proposed` to the path of this plan when the plan-drafting
  commit lands; the same row updates to `In progress pending
  prod smoke` (and gains a PR link) when the implementing PR
  merges; the same row flips to `Landed` (and gains a second PR
  link) in the doc-only follow-up commit per Execution step 20.
- This plan — Status flips from `Proposed` to `In progress pending
  prod smoke` in the implementing PR; flips to `Landed` in the
  doc-only follow-up commit.

## Out Of Scope

Deliberately excluded from this phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **`/admin/events/:eventId` redirect.** Resolved in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  Cross-Phase Decisions §7 — 404 honestly. apps/site does not
  install a slug-from-id redirect; the URL was admin-internal and
  lived a single development cycle, so the bookmark population is
  near-zero. If post-launch evidence surfaces a real bookmark
  population, a focused follow-up adds the redirect; default is
  no action.
- **`is_admin_or_organizer_for_event(eventId)` combined SQL helper.**
  Resolved in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Settled by default" — declined. Compose
  `is_root_admin()` + `is_organizer_for_event(eventId)` separately
  client-side; a third helper for one consumer is unjustified
  surface.
- **apps/site Vercel project primary-domain promotion.** Resolved
  in [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Settled by default": defer post-epic per
  [`site-scaffold-and-routing.md`](./site-scaffold-and-routing.md)
  "Primary-project ownership flip." M2 stays on apps/web-primary
  proxy-rewrite.
- **`generate-event-code` payload contract.** Already shipped by
  2.1.2 — `eventId` in payload. The shared
  `generateEventCode(eventId)` signature already takes the id; the
  Edge Function validates server-side. apps/site's "regenerate
  event code" call site has the id in scope. Resolved in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Settled by default" + 2.1.2's plan; no work in 2.4.
- **`createStarterDraftContent` / `createDuplicatedDraftContent`
  in apps/site (without sharing).** Rejected in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  Cross-Phase Decisions §6. Duplication risks silent drift when
  `parseAuthoringGameDraftContent` evolves; one app's "Create
  draft" silently breaks while the other works. Inline minimal
  create form with server-fills-defaults rejected for the same
  reason — pushes an authoring concern into trusted backend code.
- **Per-event Theme registration on the new `/admin` page.**
  Deferred to M4 phase 4.1 per the epic's "Deferred ThemeScope
  wiring" invariant. The new `/admin` is non-event-scoped, inherits
  apps/site Sage Civic root-layout defaults, and does not wrap in
  `<ThemeScope>`.
- **Splitting the apps/site `/admin` page into per-component files.**
  Deliberately deferred to a follow-up if the single-file shape
  exceeds ~250 lines of substantive JSX during implementation.
  The plan does not lock the split shape; implementer records the
  decision in the PR body if it diverges from single-file default.
  Per AGENTS.md "Don't add features … beyond what the task
  requires" — premature abstraction.

## Risk Register

- **Cross-project proxy unverifiable pre-merge for `/admin*`.**
  Same constraint that 2.3 hit:
  [`apps/web/vercel.json`](../../apps/web/vercel.json) destinations
  are absolute production URLs, so any local `vercel dev` run
  proxies `/admin` to *deployed* apps/site (still on main, no new
  `/admin` route), not to the branch's local Next.js dev server.
  End-to-end verification of the new `/admin*` rules can only
  happen post-deploy. Mitigation: 2.4 ships under the two-phase
  Plan-to-Landed Gate; the implementing PR merges with Status
  `In progress pending prod smoke`; Execution step 13 narrows its
  pre-merge claims to "rule-order regression check + identity-
  fingerprint proof that the new proxy rules fire"; Execution step
  10's local auth e2e exercise reproduces the cross-app proxy
  fully on local origins (the apps/web → apps/site routing is
  reproduced by the auth e2e dev server, not Vercel) — this is
  the strongest pre-merge integration check; the post-release
  `Production Admin Smoke` run (step 19) is the load-bearing
  end-to-end verification on production.
- **Vercel rule ordering mishap.**
  [`apps/web/vercel.json`](../../apps/web/vercel.json) deletes one
  rule and adds two; misordering would either shadow the new
  `/admin*` proxy with the deleted SPA fallback (defeating the
  cutover — `/admin` would still serve apps/web HTML on production)
  or shadow the surviving event-scoped rules. Mitigation:
  Contracts section pins the rule placement (after the
  `/_next/:path*` proxy from 2.3, parallel to the existing
  `/auth/callback` + `/` proxies); Execution step 13's identity-
  fingerprint check confirms each post-flip rule fires correctly;
  Execution step 19's post-deploy smoke run is the load-bearing
  verification.
- **`shared/urls` build sequencing.** The
  [`shared/urls/routes.ts`](../../shared/urls/routes.ts) deprecation
  cannot land in a tip that still has the apps/web `App.tsx` admin
  branches importing the deprecated symbols. Mitigation: commit
  boundaries 2 and 4 are listed with an explicit sequencing note;
  the implementer locks the actual order at edit time, with each
  commit tip required to pass `npm run build:web`. The recommended
  order is "delete apps/web admin handlers first, then prune
  `shared/urls`" but the inverse works if the apps/web `App.tsx`
  edit lands in commit 2 alongside the shared deprecation. Either
  order keeps the build green at every commit's tip.
- **ARIA / copy stability slip.** The apps/site `/admin` page must
  preserve every locator the existing e2e specs match against
  (`Game draft access` heading, `Event workspace summary` aria
  region, `${eventName} event` event-card label, `Open workspace`
  / `Open live game` / `Duplicate` button names,
  `${liveCount} live` summary text, `Live v…` / `Draft only`
  status text, `aria-disabled="true"` + `aria-describedby` reason
  pattern, `Publish this event to open the live game.` reason
  text). A typo or simplification in the port silently fails the
  e2e specs after the URL retarget. Mitigation: the per-phase
  invariant names ARIA stability explicitly; Execution step 10's
  local auth e2e exercise runs the full
  `admin-workflow.admin.spec.ts` round-trip, which is the
  load-bearing pre-merge check; reviewers diff the new page
  against [`AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx)'s
  copy verbatim (the strings that don't match get flagged).
- **Cross-app navigation client-side regression.** Using
  `useRouter().replace(href)` or `<Link href>` from
  `next/navigation` for the `Open workspace` / `Open live game`
  buttons would silently break in production: client-side
  navigation stays inside apps/site, never re-enters the apps/web
  Vercel proxy, lands on apps/site's 404 page. Same trap that bit
  M2 phase 2.3's first draft. Mitigation: Cross-Cutting
  Invariant "Cross-app navigation uses hard navigation, never
  client-side navigation" makes the rule explicit; the
  [`apps/site/app/(authenticated)/auth/callback/page.tsx`](../../apps/site/app/(authenticated)/auth/callback/page.tsx)
  precedent uses `window.location.replace`; reviewer diff check
  catches any `useRouter` import in the new `/admin` page.
- **Auth cookie domain mismatch.** Cookie is set host-only (no
  `Domain=` attribute, per
  [`shared/db/client.ts:48-66`](../../shared/db/client.ts#L48)).
  Same mitigation pattern as 2.3 — the post-release smoke run
  implicitly verifies because
  [`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts)'s
  end-to-end magic-link round-trip cannot complete unless the
  cookie lands on apps/web's frontend host.
- **SCSS prune over-deletion.** apps/web platform-admin SCSS
  selectors (`.admin-state-stack`, `.admin-signed-in-as`, etc.)
  may overlap with deep-editor selectors that survive in
  [`EventAdminWorkspace.tsx`](../../apps/web/src/admin/EventAdminWorkspace.tsx).
  Dropping a selector still consumed by the deep editor would
  silently regress the per-event admin page's appearance.
  Mitigation: Execution step 8 grep-audits each selector against
  the surviving file set before deletion; Execution step 11's
  local apps/web smoke (visit `/event/${slug}/admin` directly)
  catches visible regression.
- **e2e fixture readiness probe stale.**
  [`scripts/testing/run-auth-e2e-dev-server.cjs:97`](../../scripts/testing/run-auth-e2e-dev-server.cjs#L97)
  currently probes apps/web at `/admin`; after 2.4 the readiness
  probe must target apps/site. Wrong target leaves the
  Playwright `webServer` waiting forever (apps/site may be ready
  before apps/web). Mitigation: Execution step 9 names the probe
  edit explicitly; commit 5 lands it together with the proxy
  flip; Execution step 10's first run validates the readiness
  signal works correctly.
- **`createStarterDraftContent` binding shim drift.** The apps/web
  binding shim must keep both helper symbols
  (`createStarterDraftContent` and `createDuplicatedDraftContent`)
  re-exported. Future apps/web changes to either helper must
  update the shared module, not the shim. Mitigation: shim
  contains only the re-export, no logic; mirrors the M1 phase 1.4
  binding-module pattern.
- **Doc-currency drift across four docs.**
  [`docs/architecture.md`](../architecture.md),
  [`docs/operations.md`](../operations.md),
  [`docs/dev.md`](../dev.md), and
  [`README.md`](../../README.md) all reference apps/web `/admin`
  ownership in multiple places; the modify-list names concrete
  line numbers from plan-time state but the implementer must
  re-derive against actually-merged state. A missed edit silently
  lies about the as-shipped state. Mitigation: Execution step 14
  walks the modify-list as a checklist; AGENTS.md "Doc Currency
  Is a PR Gate" walk in step 17 is the second-pass safety net.

## Backlog Impact

- "Organizer-managed agent assignment" stays *unblocked but not
  landed*. 2.4 does not change the unblock recorded by 2.1.1's
  `event_role_assignments` policies; the entry in
  [`docs/backlog.md`](../backlog.md) is updated with M2's terminal
  PR (2.5) per the milestone doc.
- No new backlog items expected from this phase. If the
  post-release `Production Admin Smoke` run surfaces an issue
  with the cross-project `/admin*` proxy, that becomes a follow-up
  with explicit scope; through plan-drafting time no such issue
  is anticipated.

## Related Docs

- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M2 paragraph at lines 544–669.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone doc; Cross-Phase Decisions §3 (apps/site auth idiom +
  bootstrap seam — inherited from 2.3), §6
  (`createStarterDraftContent` home), §7 (fate of
  `/admin/events/:eventId`), "Settled by default" (combined SQL
  helper declined; primary-domain promotion deferred;
  `generate-event-code` payload contract).
- [`scoping/m2-phase-2-4.md`](./scoping/m2-phase-2-4.md) — scoping
  doc this plan compresses; transient (deletes in batch with the
  full M2 plan set per the milestone doc's "Output set"
  paragraph).
- [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) — sibling
  Landed plan; structural template for this plan; identity-
  fingerprint procedure for the rule-order regression check;
  apps/site adapter pair + `(authenticated)` route group pattern
  this plan inherits.
- [`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md) — sibling
  Landed plan; per-event admin deep editor at `/event/:slug/admin`
  is the navigation target for 2.4's `Open workspace`.
- [`m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md) — sibling
  Landed plan; the Edge Function helper migration the platform
  admin's writes pass through unchanged (root-admin caller in the
  `is_root_admin()` branch).
- [`shared-events-foundation.md`](./shared-events-foundation.md)
  — M1 phase 1.4 plan; binding-module pattern this plan inherits
  for the `draftCreation.ts` shim.
- [`docs/testing-tiers.md`](../testing-tiers.md) — Tier 5
  production smoke and the two-phase Plan-to-Landed Gate For
  Plans That Touch Production Smoke; 2.4 ships under this gate
  via both trigger clauses (extending smoke assertions + depending
  on production smoke as final verification).
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source for the Self-Review Audits section.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules, Plan-to-PR
  Completion Gate, Doc Currency PR Gate, Phase Planning Sessions.
