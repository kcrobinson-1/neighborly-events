# M2 Phase 2.4 — Scoping

## Goal

Migrate `/admin` from [apps/web](apps/web) to [apps/site](apps/site) as
the root-admin platform surface. The new platform admin owns the event
list, event creation, and per-event lifecycle controls
(publish/unpublish), consuming [shared/auth](shared/auth) for
authentication, [shared/events](shared/events) for event-domain reads
and lifecycle writes, and [shared/db](shared/db) for the Supabase
client and generated types. Deep-editor functionality (event details,
question/option authoring) is no longer at `/admin` — it lives only
at `/event/:slug/admin` in apps/web from phase 2.2. apps/web's
`/admin` route, the platform-admin module, and the supporting Vercel
SPA fallback are removed in this phase.

## Inputs From Siblings

- **Phase 2.1 (RLS broadening).** Soft dependency on 2.1.2 (Landed).
  After 2.1.2's helper swap, the four authoring edge functions
  (`save-draft`, `publish-draft`, `unpublish-event`,
  `generate-event-code`) gate on
  `is_organizer_for_event(eventId) OR is_root_admin()` via
  [supabase/functions/_shared/event-organizer-auth.ts](../../../supabase/functions/_shared/event-organizer-auth.ts),
  not on `public.is_admin()` via the legacy `admin-auth.ts`. The
  platform admin is root-only, and `is_root_admin()` aliases
  `is_admin()` per
  [supabase/migrations/20260421000200_add_event_role_helpers.sql](../../../supabase/migrations/20260421000200_add_event_role_helpers.sql),
  so observable behavior for the root-admin caller is preserved — but
  the on-disk gate has shifted shape, and 2.4 must pass `eventId` in
  every payload because the broadened helper requires it. Of the four
  functions, only `generate-event-code` lacked an `eventId` field
  before 2.1.2; the shared `generateEventCode(eventId)` signature has
  already moved with 2.1.2's merge (see Resolved Decisions for the
  follow-up disposition).
- **Phase 2.2 (per-event admin).** The deep-editor surface must be
  reachable at `/event/:slug/admin` before 2.4 removes apps/web
  `/admin`. Per [m2-phase-2-2.md](m2-phase-2-2.md), 2.2's
  `EventAdminPage` / `EventAdminWorkspace` reuse the existing
  authoring components (`AdminEventDetailsForm`, `AdminQuestionList`,
  `AdminQuestionEditor`, `AdminPublishPanel`, `useSelectedDraft`,
  plus the `eventDetails` / `publishChecklist` / `questionBuilder` /
  `questionFormMapping` / `questionStructure` helpers) **in place
  under `apps/web/src/admin/`** — 2.4 must leave those files intact.
  2.4's "Open workspace" link targets `routes.eventAdmin(slug)`,
  owned by 2.2.
- **Phase 2.3 (`/auth/callback` and `/` migration).** Per
  [m2-phase-2-3.md](m2-phase-2-3.md), 2.3 lands the apps/site
  adapter modules ([apps/site/lib/setupAuth.ts](apps/site/lib/setupAuth.ts),
  [apps/site/lib/supabaseBrowser.ts](apps/site/lib/supabaseBrowser.ts),
  optionally `apps/site/lib/setupEvents.ts`), exact-pinned
  `@supabase/supabase-js` and `@supabase/ssr` in
  [apps/site/package.json](apps/site/package.json), the proxy-rewrite
  pattern in [apps/web/vercel.json](apps/web/vercel.json), and a
  `'use client'` wrapper around the shared `<AuthCallbackPage>`.
  2.4 reuses every one of those. **Bootstrap seam resolved**: 2.3
  ships `apps/site/components/SharedClientBootstrap.tsx` and the
  `app/(authenticated)/layout.tsx` route group that renders it; 2.4's
  `/admin` lives inside that group at
  `apps/site/app/(authenticated)/admin/page.tsx` and inherits the
  bootstrap. **Auth-shell idiom resolved**: `'use client'` boundary
  with `useAuthSession` + `getGameAdminStatus`, mirroring apps/web's
  current `AdminPage`. The "brief unauthenticated-shell flash before
  hydration" trade-off is accepted in 2.3 to keep `shared/auth/`
  browser-only across M2.
- **M1 phase 1.4 ([shared/events](shared/events)).** Already exposes
  every lifecycle read/write 2.4 needs (`getGameAdminStatus`,
  `listDraftEventSummaries`, `loadDraftEventStatus`, `saveDraftEvent`,
  `generateEventCode`, `publishDraftEvent`, `unpublishEvent`).
  **Lifecycle write API audit: no new shared/events surface
  required.** See Open Questions for the starter-content helper
  still in apps/web.
- **M1 phase 1.2 ([shared/urls](shared/urls)).** `routes.admin` and
  `routes.eventAdmin(slug)` already exist; the deprecated
  `routes.adminEvent(id)` family covers `/admin/events/:eventId` —
  see Open Questions.
- **M1 phase 1.5.2 ([shared/styles](shared/styles)).** apps/site
  root layout already emits Sage Civic via inline-style plus
  `next/font` Inter/Fraunces; `/admin` inherits, no `<ThemeScope>`.

## Outputs Other Siblings Need

None. Phase 2.5 is a pure URL rename inside apps/web; M3 / M4 are
independent surfaces.

## File Inventory

### `apps/site` (create)

- `apps/site/app/(authenticated)/admin/page.tsx` — create.
  `'use client'` root-admin platform surface; consumes
  `useAuthSession` + `getGameAdminStatus` for the gate, renders
  event list / create form / lifecycle controls. Lives inside the
  `(authenticated)` route group 2.3 establishes so the
  `SharedClientBootstrap` wrapper is already in scope.
- Optional `apps/site/app/(authenticated)/admin/layout.tsx` — only
  if shared chrome (sign-out, "back to /") is reused across multiple
  admin sub-routes.
- Admin presentational components under
  `apps/site/app/(authenticated)/admin/_components/` or
  `apps/site/components/admin/`. Final placement follows Next.js 16
  App Router conventions (read `node_modules/next/dist/docs/` per
  [apps/site/AGENTS.md](apps/site/AGENTS.md)).
- `apps/site/lib/setupEvents.ts` — create. apps/site's
  `configureSharedEvents(...)` call site. Per the resolved
  landing-shape decision in 2.3, 2.3 does not create this; 2.4 owns
  it as `/admin`'s `listDraftEventSummaries` consumer is the first
  apps/site call into `shared/events/`. Imported for side effect by
  the `(authenticated)` route group's `<SharedClientBootstrap>`
  (2.3 lands the bootstrap component; 2.4's plan author confirms
  that adding `setupEvents` to it doesn't regress the bootstrap
  contract).
- [apps/site/lib/setupAuth.ts](apps/site/lib/setupAuth.ts),
  [apps/site/lib/supabaseBrowser.ts](apps/site/lib/supabaseBrowser.ts)
  — created by 2.3; 2.4 only confirms they cover the
  authoring-function call surface (auth headers, error reader).

### `apps/web` (delete)

Per [m2-phase-2-2.md](m2-phase-2-2.md), 2.2's `EventAdminWorkspace`
reuses the deep-editor components in place — those files **stay**.
2.4 deletes only the platform-admin scaffold:

- [apps/web/src/pages/AdminPage.tsx](apps/web/src/pages/AdminPage.tsx).
- Platform-admin pieces in
  [apps/web/src/admin/](apps/web/src/admin/):
  `AdminDashboardContent.tsx`, `AdminPageShell.tsx`,
  `AdminEventWorkspace.tsx`, `useAdminDashboard.ts`. Note:
  `draftCreation.ts` does **not** delete; per the resolved
  starter-helper home decision, its `createStarterDraftContent`
  helper moves to `shared/events/` as a deliberate follow-up to M1
  phase 1.4 and apps/web binds the new shared location.
- **Stays** (consumed by 2.2's `EventAdminWorkspace`):
  `AdminEventDetailsForm.tsx`, `AdminQuestionEditor.tsx`,
  `AdminQuestionList.tsx`, `AdminQuestionFields.tsx`,
  `AdminOptionEditor.tsx`, `AdminPublishPanel.tsx`,
  `eventDetails.ts`, `publishChecklist.ts`, `questionBuilder.ts`,
  `questionFormMapping.ts`, `questionStructure.ts`,
  `useSelectedDraft.ts`.
- Admin route entries in
  [apps/web/src/App.tsx](apps/web/src/App.tsx): `routes.admin` and
  `matchAdminEventPath` branches.
- Admin-only SCSS partials under
  [apps/web/src/styles/](apps/web/src/styles/) — confirm by grepping
  `.admin-` selectors against the surviving deep-editor files
  before delete.

### `shared/events` (create + edit)

Per the resolved starter-helper home decision, the canonical-starter
helper moves out of apps/web:

- `shared/events/draftCreation.ts` — create. Houses
  `createStarterDraftContent` (the helper formerly at
  [apps/web/src/admin/draftCreation.ts](../../../apps/web/src/admin/draftCreation.ts)).
- [shared/events/index.ts](../../../shared/events/index.ts) — edit.
  Re-export `createStarterDraftContent` so apps/site and apps/web
  consume from the same surface.
- [apps/web/src/admin/draftCreation.ts](../../../apps/web/src/admin/draftCreation.ts)
  — edit. Becomes a thin re-export from `shared/events/`, mirroring
  the binding-module pattern M1 phase 1.4 already established for
  the apps/web `lib/adminGameApi.ts` and `lib/gameContentApi.ts`
  shims. apps/web call sites continue to import the existing path
  unchanged through 2.4.

### `shared/urls` (edit)

[shared/urls/routes.ts](../../../shared/urls/routes.ts) —
`routes.admin` stays (now points at apps/site). Per the resolved
`/admin/events/:eventId` fate ("404 honestly"),
`routes.adminEvent`, `routes.adminEventsPrefix`, and
`matchAdminEventPath` are **removed**, along with their
[validateNextPath](../../../shared/urls/validateNextPath.ts)
allow-list branch and any orphaned re-exports in
[shared/urls/index.ts](../../../shared/urls/index.ts).

### `apps/web/vercel.json` (edit)

Remove `/admin/:path*` from the SPA fallback rule. Add
proxy-rewrites for `/admin` and `/admin/:path*` → apps/site, ordered
parallel to the existing `/event/:slug` proxies. First match wins —
order matters.

### `supabase/config.toml`

No new function; no edit. Existing `verify_jwt = false` entries for
the four authoring functions re-confirmed for the audit only.

### `docs` (edit)

- [docs/architecture.md](docs/architecture.md) — Vercel routing
  table; URL ownership shape; admin event workspace section rewritten
  to describe the apps/site platform admin plus the apps/web
  `/event/:slug/admin` deep editor split.
- [docs/operations.md](docs/operations.md) — admin URL contract.
- [docs/dev.md](docs/dev.md) — admin UI review path if existing
  Playwright in [scripts/ui-review/](scripts/ui-review/) targets
  `/admin` against apps/web.

## Contracts

- **`apps/site` `/admin` page.** `'use client'` page (resolved
  upstream in 2.3): renders skeleton on first paint, calls
  `useAuthSession` + `getGameAdminStatus` on hydration, branches into
  signed-out → in-place `<SignInForm>`, signed-in-not-allowlisted →
  inline "not allowlisted" copy, signed-in-allowlisted → workspace.
  Trust boundary stays at the database (`is_admin()` RPC and
  edge-function admin-auth gate); the client gate is a UX gate, not
  the enforcement point. Lives inside the `(authenticated)` route
  group so `<SharedClientBootstrap>` has already run before
  `useAuthSession` mounts.
- **Event list.** `listDraftEventSummaries(): Promise<DraftEventSummary[]>`
  from [shared/events](shared/events). Empty array with no error must
  render an empty-state message that distinguishes "no drafts exist"
  from "lookup failed" (Silent-no-op audit).
- **Event creation.** `saveDraftEvent(content, eventCode?)` from
  [shared/events](shared/events) returns `SaveDraftEventResult`.
  Starter content shape is the `AuthoringGameDraftContent` validator
  contract from [shared/game-config](shared/game-config); helper that
  produces the starter document is currently in apps/web (Open
  Questions). On success, navigate to `routes.eventAdmin(slug)`
  (apps/web).
- **Lifecycle.** `publishDraftEvent(eventId)` →
  `PublishDraftResult`; `unpublishEvent(eventId)` →
  `UnpublishEventResult`. UI reconciles to the server-returned
  canonical state (Post-save reconciliation discipline).
- **Auth gate.** Signed-out users render `SignInForm` from
  [shared/auth](shared/auth) inline within the `/admin` shell
  (in-place auth invariant). Magic-link uses
  `requestMagicLink(email, { next: routes.admin })`; `validateNextPath`
  (or its server-side variant — Open Questions) returns
  `routes.admin` after callback.
- **Cross-app navigation.** Platform admin links to
  `/event/:slug/admin` (apps/web) for deep editing; same-origin
  proxy-rewrite makes the navigation seamless.

## Cross-Cutting Invariants Touched

- **Auth integration.** Session and role only via
  [shared/auth](shared/auth) and `getGameAdminStatus()`; apps/site
  never instantiates a Supabase client outside [shared/db](shared/db).
- **URL contract.** `/admin*` flips to apps/site; apps/web's URL
  footprint becomes purely event-scoped after 2.4.
- **Theme route scoping.** `/admin` is outside `/event/:slug/*`,
  renders against apps/site Sage Civic `:root`; no `<ThemeScope>`
  wrap anywhere in the admin tree.
- **Deferred ThemeScope wiring.** Not exercised.
- **Trust boundary.** Every write flows through an authoring edge
  function that re-verifies the JWT against
  `is_organizer_for_event(eventId) OR is_root_admin()` via
  [supabase/functions/_shared/event-organizer-auth.ts](../../../supabase/functions/_shared/event-organizer-auth.ts)
  (post-2.1.2). The platform admin is a root-admin caller, so it
  passes through the `is_root_admin()` branch — observable behavior
  preserved, gate broader than 2.4 strictly needs. New client, same
  trust boundary.
- **In-place auth.** Signed-out `/admin` renders `SignInForm` inline;
  no `/signin` page.

## Validation Gate

- `npm run lint`, `npm run build:web` (apps/web compiles after admin
  removal), `npm run build:site` (apps/site Next.js 16 build with
  the new `/admin` route).
- `deno check` on the four authoring functions — only if 2.4 touches
  their source; otherwise called out as not-rerun.
- Existing vitest suite under
  [tests/shared/events/](tests/shared/events/) passes — the
  lifecycle surface contracts the apps/site UI now consumes.
- Manual / Playwright (root-admin): signed-out `/admin` renders the
  in-place sign-in form against apps/site Sage Civic; magic-link
  callback returns to `/admin` (apps/site); event list loads
  non-empty for a seeded admin; `Create draft` → new draft,
  navigates to `/event/:slug/admin` (apps/web) with no flash or
  auth disruption; `Publish` / `Unpublish` flip status to the
  server-returned canonical state; `/admin/events/:eventId` URL
  behaves per the Open Questions decision.
- Manual (non-admin authenticated): `/admin` renders "not
  allowlisted" inline, not a silent empty list.
- Manual (Vercel routing): `/admin` and `/admin/<x>` return apps/site
  HTML, not apps/web's SPA fallback.

## Self-Review Audits

### Frontend (apps/site)

- **Silent-no-op on missing lookup.** Event list and per-event
  status reads surface "event not found" / "lookup failed" / "no
  drafts exist" as distinct states. `useAdminDashboard` collapses
  load failure into one error state; the new surface keeps "empty
  result" and "lookup failed" separate.
- **Error-surfacing for user-initiated mutations.** Create, publish,
  and unpublish click handlers surface failures inline. Mirror the
  apps/web `AdminPublishPanel` pattern (`publishState: 'error'`
  with a message).
- **Effect cleanup audit.** Any event-list `useEffect` follows the
  `isCancelled` pattern from `useAdminDashboard.ts`.

### Frontend (apps/web — removal)

- **Rename-aware diff classification.** Platform-admin file
  deletions are pure deletes; the deep-editor files staying in
  place are a non-edit. Reviewers should see one apps/web surface
  shrink, not a noisy partial rename.

### CI / build

- **CLI / tooling pinning audit.** Any
  [apps/site/package.json](apps/site/package.json) additions beyond
  what 2.3 pinned are exact-pinned and mirror apps/web's versions
  for shared packages; lockfile updated in the same commit.

### Runbook

- **Platform-auth-gate config audit.** Config-vs-code consistency
  check: every authoring function the new platform admin calls
  already has `[functions.<name>] verify_jwt = false` in
  [supabase/config.toml](supabase/config.toml). 2.4's plan
  re-asserts this so a future config-clean commit cannot quietly
  flip the default and 401 the admin.

## Resolved Decisions

All open questions for 2.4 are settled. See
[m2-admin-restructuring.md](../m2-admin-restructuring.md)
"Cross-Phase Decisions" for the full deliberation; this section
records the resolutions and the rejected alternatives.

- **`generate-event-code` payload contract → `eventId` in payload
  (already shipped by 2.1.2).** The shared `generateEventCode(eventId)`
  signature already takes `eventId` per
  [shared/events/admin.ts](../../../shared/events/admin.ts); the Edge
  Function validates it server-side per
  [supabase/functions/generate-event-code/index.ts](../../../supabase/functions/generate-event-code/index.ts).
  2.4's "regenerate event code" call site already has the id in scope,
  so the change is fully mechanical at the call site — no signature
  work remains.
  *No alternative considered — payload field followed from 2.1's
  helper signature; resolution recorded retrospectively.*
- **`createStarterDraftContent` home → `shared/events/`.** The helper
  moves from
  [apps/web/src/admin/draftCreation.ts](../../../apps/web/src/admin/draftCreation.ts)
  to a new location under `shared/events/`. Both apps/web (still uses
  it through phase 2.2's deep-editor entry until 2.4 finishes) and
  apps/site `/admin`'s create form import from the shared module.
  The extraction is a deliberate follow-up to M1 phase 1.4.
  *Rejected: duplicate in apps/site — silent-drift risk when
  `parseAuthoringGameDraftContent` evolves; one app's "Create draft"
  silently breaks while the other works. Inline minimal create form
  with server-fills-defaults — pushes an authoring concern into
  trusted backend code; behavior change to a stable edge function
  for marginal benefit.*
- **Fate of `/admin/events/:eventId` → 404 honestly.** apps/site does
  not handle the legacy URL; it returns the apps/site 404 page.
  `routes.adminEvent`, `routes.adminEventsPrefix`, and
  `matchAdminEventPath` are removed from
  [shared/urls](../../../shared/urls/) in 2.4. Pre-launch the URL was
  admin-internal and lived for a single development cycle; bookmark
  population is near-zero.
  *Rejected: redirect after slug-from-id resolution — every dead-URL
  hit costs a Supabase read for a vanishing population. Preserve
  matcher-as-historical-comment — adds no user value; 404 is
  equivalent observable behavior.*
- **apps/site Vercel project primary-domain promotion → defer
  post-epic.** 2.4 inherits the unchanged "apps/web is primary"
  topology. Same disposition as
  [m2-phase-2-3.md](./m2-phase-2-3.md) and the epic risk register.
  *Rejected: flip in M2 — adds routing churn beyond what M2 requires.*

## Risks

- **SPA fallback shadows the new proxy.** Wrong rule order in
  `apps/web/vercel.json` lets the apps/web `/admin/:path*` fallback
  shadow the new apps/site proxy, leaving `/admin` rendering apps/web's
  empty SPA. Verify against the deployed origin before flipping the
  M2 row.
- **Hydration-window flash.** Per the resolved client-gate idiom,
  the page renders a skeleton on first paint before `useAuthSession`
  resolves. The flash is the accepted trade-off for keeping
  `shared/auth/` browser-only across M2; mitigation is an explicit
  `loading` skeleton state that does not leak the workspace shell
  to unauthenticated viewers.
- **Allowlist false positive on stale client state.** A stale or
  misrouted Supabase client during the gate read could let a
  non-allowlisted user see the admin shell briefly while every write
  is correctly rejected — trust boundary holds, UX is confusing.
- **Starter-draft binding-module drift.** Per the resolved
  starter-helper home decision, `createStarterDraftContent` moves to
  `shared/events/` and apps/web's
  [draftCreation.ts](../../../apps/web/src/admin/draftCreation.ts)
  becomes a thin re-export. Risk is the binding shim drifting from
  the shared API at the next change. Mitigation: mirror the existing
  apps/web binding-module pattern from M1 phase 1.4 verbatim.
- **Cross-app link target invalidation.** "Open workspace" must
  point at `routes.eventAdmin(slug)`, not the now-removed
  `routes.adminEvent(id)`. Copy/paste from the old workspace would
  silently 404 on the dead `/admin/events/:eventId` URL.
- **CORS misread.** apps/site reaches the browser through apps/web's
  proxy-rewrite, so the request origin remains apps/web's domain — no
  `ALLOWED_ORIGINS` update is needed unless topology changes.
