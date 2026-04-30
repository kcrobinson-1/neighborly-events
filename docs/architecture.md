# Neighborhood Game — Architecture

## Purpose

This document describes the system that currently exists in the repository and the architectural gaps that still remain before the project becomes an event-ready MVP.

Use it when you need:

- the current codebase shape
- runtime responsibilities and request flow
- trust boundaries and data ownership
- the architectural roadmap for the next phase

It focuses on:

- the current codebase structure
- runtime responsibilities and request flow
- where trust and data ownership live today
- which parts of the original MVP direction are already implemented
- which pieces are still deferred to later milestones

Tooling and local workflow live in `dev.md`. Product intent lives in `product.md`. UX goals live in `experience.md`. Platform setting ownership lives in `operations.md`.

## Current Architecture Summary

The current implementation is:

- two frontend apps deployed as separate Vercel projects from one
  monorepo: `apps/web` (Vite + React SPA, attendee game and per-event
  admin), and `apps/site` (Next.js 16 App Router, static platform
  landing, auth callback, platform admin at `/admin*`, and SSR/SSG
  public event landing pages — event landing remains a placeholder
  until M3 of the Event Platform Epic). `apps/web` is the primary
  Vercel project owning the production custom domain; cross-app routing
  is implemented as proxy-rewrites in `apps/web/vercel.json` and is
  **transitional** until M2 inverts the URL ownership balance
- a Supabase Auth-backed admin route for private draft visibility
- Supabase-backed published event content tables for routes and landing-page summaries
- private authoring draft, version, and event-role-assignment tables
  protected by RLS — root admins read everything; per-event organizers
  read drafts/versions for events they organize and can manage
  `event_role_assignments` for those events; the four authoring Edge
  Functions accept either organizer-for-event or root-admin JWTs
- a shared TypeScript domain module for game runtime shape, mapping, validation, and scoring
- Supabase edge functions for session bootstrap, trusted completion, and
  organizer-or-admin authoring transitions
- Supabase SQL migrations that store published content, record completion attempts, and award one game entitlement per event/session pair
- local browser state during game play, with the backend owning the final verification result

The core architectural principle already embodied in the code is:

Keep the game interaction local and fast, but make the completion state backend-backed and harder to spoof.

## Current Codebase Structure

### Top-Level Layout

- `apps/web`
  The attendee-facing Vite + React single-page application. Owns the
  `/event/:slug/game` and `/event/:slug/admin` namespaces.
- `apps/site`
  The Next.js 16 App Router app for the platform landing, auth
  callback, platform admin, and public event landing pages. Owns `/`,
  `/auth/callback`, `/admin*`, `/event/:slug`, and any other
  event-scoped path not carved out for `apps/web`. Event landing
  remains a placeholder until M3 of
  [the Event Platform Epic](./plans/event-platform-epic.md).
- `shared`
  Shared TypeScript domain logic used by both the browser and Supabase functions.
- `supabase/functions`
  Edge functions for session bootstrap and trusted completion.
- `supabase/migrations`
  SQL schema, tables, and RPC logic for game completion and entitlement behavior.
- `docs`
  Product, UX, architecture, and development documentation.

### Frontend Structure

The current frontend is still intentionally small, but the game flow is now
grouped into a dedicated `apps/web/src/game/` module:

- `apps/web/src/main.tsx`
  Browser entry point. Mounts the React app.
- `apps/web/src/App.tsx`
  Root shell and pathname-based route selection.
- `apps/web/src/routes.ts`
  Central route definitions plus pathname normalization and matching.
- `apps/web/src/usePathnameNavigation.ts`
  Minimal client-side navigation hook built on the History API for
  apps/web-owned routes, with document navigation for `/` now that the
  route is owned by apps/site.
- `apps/web/src/pages/EventRedeemPage.tsx`
  Event-scoped operator route for `/event/:slug/game/redeem`. Reuses the
  role-neutral auth shell, resolves event authorization, and renders the
  keypad-driven redemption UI.
- `apps/web/src/pages/EventRedemptionsPage.tsx`
  Event-scoped operator route for `/event/:slug/game/redemptions` (monitoring
  + reversal). Gates on `is_organizer_for_event` / `is_root_admin`,
  reads `game_entitlements` directly through the browser Supabase client
  (RLS-scoped, explicit event-id filter), and renders the sticky filter
  bar, bounded list, and bottom-sheet detail view. The sheet's
  confirmation step drives reversal through the
  `reverse-entitlement-redemption` Edge Function; after a successful
  reverse response the page fires a single-row re-read in parallel with
  the full bounded list refetch so the open sheet reconciles without
  waiting for the list refresh.
- `apps/web/src/pages/EventAdminPage.tsx`
  Event-scoped per-event admin route for `/event/:slug/admin`. Gates
  on `useOrganizerForEvent` (slug → event-id resolution + parallel
  `is_organizer_for_event` and `is_root_admin` RPCs); does **not**
  call `getGameAdminStatus`/`is_admin`, so an organizer who is not on
  the platform allowlist still reaches the authorized authoring
  state. Wraps every state branch (signed-out, loading, role-gate,
  transient-error, authorized) inside `<ThemeScope
  theme={getThemeForSlug(slug)}>`, with the wrapping centralized in
  the `App.tsx` routing dispatcher per the M1 phase 1.5 invariant.
  The authorized branch composes `EventAdminWorkspace` from the
  existing deep-editor primitives (`AdminEventDetailsForm`,
  `AdminQuestionEditor`, `AdminPublishPanel`) for the single
  slug-resolved draft.
- `apps/web/src/pages/GameRoutePage.tsx`
  Async route loader that resolves `/event/:slug/game` into published content
  before rendering the game shell.
- `apps/web/src/pages/GamePage.tsx`
  Game shell for an already-loaded event. It bootstraps the session, consumes
  the game hook, and renders game panels from the game module.
- `apps/web/src/pages/NotFoundPage.tsx`
  Fallback route.
- `apps/web/src/game/useGameSession.ts`
  Public game-session hook that coordinates reducer state, derived selectors,
  and completion submission.
- `apps/web/src/game/gameSessionState.ts`
  Internal pure reducer/state-machine logic for game progression and completion.
- `apps/web/src/game/gameSessionSelectors.ts`
  Internal pure derived-state selectors for React-facing game view state.
- `apps/web/src/game/gameUtils.ts`
  Public game-specific selection, label, and feedback helpers.
- `apps/web/src/game/components/`
  Game-specific intro, question, feedback, and completion panels extracted from
  the route shell.
- `apps/web/src/lib/gameApi.ts`
  Client-side session bootstrap and completion submission logic, including the local-development fallback.
- `apps/web/src/lib/authApi.ts`
  Role-neutral Supabase Auth helpers shared across every authenticated
  surface: session restore/subscribe, magic-link requests targeting
  `/auth/callback?next=…`, sign-out, and access-token retrieval.
- `apps/web/src/lib/adminGameApi.ts`
  Admin-status RPC, private draft reads, and authenticated authoring
  function calls. Draft reads now source summary/detail status from the
  `public.game_event_admin_status` view and read draft content from
  `game_event_drafts`, so the admin transport consumes a server-owned
  `status` plus transitional `isLive` signal without browser-side
  `game_events` fan-out. `last_published_version_number` is historical
  metadata only. Auth primitives live in `authApi.ts`;
  `callAuthoringFunction` reads the session access token through
  `getAccessToken()` there.
- `apps/web/src/auth/`
  Role-neutral sign-in surface consumed by every authenticated route:
  `validateNextPath`, `SignInForm`, `useAuthSession`,
  `useOrganizerForEvent` (per-event organizer-or-admin authorization
  hook re-exported from `shared/auth/`; consumed by the per-event
  admin route). The magic-link return handler now lives in apps/site
  and wraps the shared `AuthCallbackPage`.
- `apps/web/src/redeem/`
  Event redemption modules for the direct-entry operator flow:
  authorization resolution, keypad state, keypad UI, trusted submit, and
  result-card rendering.
- `apps/web/src/redemptions/`
  Event monitoring + reversal modules for the dispute-resolution
  surface: organizer authorization resolver, shared row-read helpers
  (two-query list fetch + single-row re-read) in `redemptionsData.ts`,
  client-side merge/dedupe/sort/truncate, filter state + pure search
  parser + pure chip filter, sticky filter bar, list row, the
  detail-sheet state machine (`details` + `confirmation` steps), the
  reverse-mutation hook that wraps `reverse-entitlement-redemption`
  (one automatic retry, stable/transient mapping, reason
  normalization), and the shared actor-hint formatter.
- `apps/web/src/lib/gameContentApi.ts`
  Browser reads for published event summaries and route content.
- `apps/web/src/lib/supabaseBrowser.ts`
  Shared browser-side Supabase env, auth-header, and error helpers used by
  public content reads, admin auth, and function calls.
- `apps/web/src/lib/session.ts`
  Small client id-generation helpers.
- `apps/web/src/admin/`
  Per-event admin authoring module consumed only by the
  `/event/:slug/admin` route. Hosts `EventAdminWorkspace` and
  `useEventAdminWorkspace` plus the shared deep-editor primitives
  (`AdminEventDetailsForm`, `AdminQuestionEditor`,
  `AdminQuestionList`, `AdminQuestionFields`, `AdminOptionEditor`,
  `AdminPublishPanel`, `useSelectedDraft`, plus
  `eventDetails.ts`, `publishChecklist.ts`, `questionBuilder.ts`,
  `questionFormMapping.ts`, `questionStructure.ts`). The per-event
  hook seeds a one-row dashboard state via
  `loadDraftEventSummary(eventId)` and composes `useSelectedDraft`
  for the load / save / publish / unpublish lifecycle. Platform-admin
  list / sign-in / draft-creation chrome is owned by apps/site.
- `apps/web/src/types/game.ts`
  Client-side types for completion payloads and results.
- `apps/web/src/data/games.ts`
  Re-export layer for shared game definitions.
- `apps/web/src/styles.scss`
  Frontend styling entrypoint.
- `apps/web/src/styles/`
  SCSS partials for tokens, mixins, layout, focused game UI
  component groups, admin UI, redeem UI, monitoring UI, and responsive
  rules.
- `apps/site/app/page.tsx`
  Static platform landing at `/`, with a CTA into `/admin`.
- `apps/site/app/(authenticated)/admin/page.tsx`
  Platform admin client route for `/admin*`. Hosts the in-place
  magic-link sign-in form, allowlist denial state, event-list
  workspace, draft creation, duplication, and lifecycle controls;
  hard-navigates to apps/web `/event/:slug/admin` for the per-event
  deep editor and to `/event/:slug/game` for the live game.
- `apps/site/app/(authenticated)/auth/callback/page.tsx`
  Client callback route for `/auth/callback`; wraps shared
  `AuthCallbackPage` and uses document navigation so post-auth
  destinations can cross back to apps/web.
- `apps/site/components/SharedClientBootstrap.tsx`
  Client boundary that registers apps/site's shared auth providers for
  routes in the `(authenticated)` group.
- `apps/site/lib/supabaseBrowser.ts` and `apps/site/lib/setupAuth.ts`
  Next.js client adapter for `shared/db/` and `shared/auth/`.

### Shared Domain Structure

The shared layer now exposes a stable entrypoint plus focused implementation modules:

- `shared/game-config.ts`
  Public compatibility entrypoint for existing imports.
- `shared/game-config/`
  Internal shared modules for types, published-row mapping, explicit sample
  fixtures, validation, and answer/scoring logic.
- `shared/redemption.ts`
  Transport contracts for the reward-redemption Edge Functions and their future
  callers. Owns request/response shapes for redeem, reverse, and attendee
  status without pulling fetch or UI concerns into the shared layer.
- `shared/db/`
  Env-agnostic Supabase wiring shared across `apps/web` and `apps/site`.
  Owns the browser client factory
  (`createBrowserSupabaseClient`), the auth-header helper
  (`createSupabaseAuthHeaders`), the response error-message reader
  (`readSupabaseErrorMessage`), the `SupabaseConfig` shape every
  per-app adapter passes in, and the generated `Database` type plus
  its `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`, `Json`, and
  `CompositeTypes` derivation helpers. The `Database` type lives in
  `shared/db/types.ts` as the verbatim output of
  `supabase gen types typescript --local --schema public` (see
  `npm run db:gen-types`); it is the source of truth for DB row
  shapes and is not edited by hand. The browser client factory is
  parameterized on `Database`, so PostgREST builders, RPC calls, and
  row results are typed at every consumer. Holds no env access and
  no singleton state — those stay in per-app adapters
  ([`apps/web/src/lib/supabaseBrowser.ts`](../apps/web/src/lib/supabaseBrowser.ts)
  and [`apps/site/lib/supabaseBrowser.ts`](../apps/site/lib/supabaseBrowser.ts)).
  The `PublishedGame*Row` types in
  `shared/game-config/db-content.ts` remain authoritative for the
  published-content surface during this phase; aligning them with
  the generated `Database` type is out of scope for M1 phase 1.1.
- `shared/urls/`
  Canonical route table, route matchers, and post-auth `next=`
  validation shared across `apps/web` and `apps/site`. Owns
  the `AppPath` literal-union type, the `routes` builder object
  (`home`, `admin`, `eventLanding(slug)`, `eventAdmin(slug)`,
  `game(slug)`, `gameRedeem(slug)`, `gameRedemptions(slug)`,
  `authCallback`), the pathname matchers consumed by the apps/web
  router and by `validateNextPath` (`matchEventAdminPath`,
  `matchGamePath`, `matchGameRedeemPath`,
  `matchGameRedemptionsPath`) plus the `normalizePathname` helper,
  the `AuthNextPath` type that excludes the transport-only callback
  route, and `validateNextPath` itself — the open-redirect defense
  for the raw `next` query parameter received at `/auth/callback`.
  `validateNextPath` reads `window.location.origin` and is therefore
  browser-only. apps/site's `/auth/callback` route is a client
  component, so no server-side `next` validation seam exists yet.
  Per-app code never composes route strings inline; the single
  remaining hardcoded URL family lives in the e2e Playwright
  fixtures, where the literal expresses the contract being tested.
- `shared/auth/`
  Env-agnostic Supabase Auth surface shared across `apps/web` and
  `apps/site`. Owns the role-neutral auth API
  (`getAuthSession`, `subscribeToAuthState`, `requestMagicLink`,
  `signOut`, `getAccessToken`), the role-neutral `useAuthSession`
  hook, the magic-link return handler `AuthCallbackPage` (with its
  load-bearing subscribe-before-getSession ordering and 10s timeout
  guard), the role-neutral `SignInForm`, and the associated
  `AuthSessionState`, `MagicLinkState`, `AuthCallbackPageProps`,
  `SignInFormCopy`, and `SignInFormProps` types. Per the parent
  epic's "Env access stays at the app boundary" invariant, this
  module never reads `import.meta.env.*` or `process.env.*`; each
  app calls `configureSharedAuth({ getClient, getConfigStatus })`
  exactly once at startup with its env-derived providers. apps/web
  registers them from
  [`apps/web/src/lib/setupAuth.ts`](../apps/web/src/lib/setupAuth.ts)
  (imported for side-effect by `apps/web/src/main.tsx`); apps/site
  registers them from
  [`apps/site/lib/setupAuth.ts`](../apps/site/lib/setupAuth.ts)
  through
  [`SharedClientBootstrap`](../apps/site/components/SharedClientBootstrap.tsx);
  the apps/web
  adapter at
  [`apps/web/src/lib/authApi.ts`](../apps/web/src/lib/authApi.ts) is
  a pure re-export so existing call sites keep importing from a
  stable apps/web path, and `apps/web/src/auth/index.ts` re-exports
  the components, hook, and types for the same reason. Session storage uses
  `@supabase/ssr`'s frontend-origin chunked cookie storage paired
  with `@supabase/supabase-js`'s `createClient` in
  [`shared/db/client.ts`](../shared/db/client.ts)'s
  `createBrowserSupabaseClient` (cookie name
  `sb-<project-ref>-auth-token`, chunked as `.0`/`.1` siblings when
  the JWT exceeds the per-cookie size limit; `Path=/`, `SameSite=Lax`,
  `Secure` on https, no `Domain=` so the cookie is host-only on the
  apps/web frontend domain). `flowType` is `"implicit"` because the
  production admin smoke fixture uses
  `auth.admin.generateLink({ type: "magiclink" })`, which is
  PKCE-incompatible (no client-side code-verifier). The cookie is
  visible to apps/site server-rendered routes through Vercel's
  proxy-rewrite — apps/site's placeholder at `/event/:slug` reads it
  via Next.js `cookies()` and renders a presence-only readout for
  verification.
- `shared/events/`
  Env-agnostic event-domain surface shared across `apps/web` and later
  `apps/site` consumers. Owns published event reads
  (`loadPublishedGameBySlug`, `listPublishedGameSummaries`), admin
  status/draft reads, authenticated authoring writes, and the
  projection types those flows return. It reads Supabase config, the
  typed browser client, the missing-config copy, and the featured
  published-event sort key through `configureSharedEvents(...)`.
  apps/web registers those providers from
  [`apps/web/src/lib/setupEvents.ts`](../apps/web/src/lib/setupEvents.ts),
  imported for side-effect by `apps/web/src/main.tsx`. The apps/web
  adapters at
  [`apps/web/src/lib/gameContentApi.ts`](../apps/web/src/lib/gameContentApi.ts)
  and
  [`apps/web/src/lib/adminGameApi.ts`](../apps/web/src/lib/adminGameApi.ts)
  preserve stable app import paths; `gameContentApi.ts` owns only the
  Vite-only prototype fixture fallback before delegating remote reads,
  and `adminGameApi.ts` is a pure re-export shim. `shared/events/`
  never reads `import.meta.env.*` or `process.env.*`, does not access
  `window`, holds no Supabase singleton, and imports no apps/web code.

- `shared/styles/`
  Platform theme model shared across `apps/web` and `apps/site`.
  Owns the `Theme` TypeScript type (binding output of the M1 phase
  1.5.1 token audit at [`docs/styling.md`](styling.md)), the
  universal `<ThemeScope>` React component (no `'use client'`, no
  effects, no state — SSR-safe), the `getThemeForSlug(slug)` resolver
  that returns the registered `Theme` for an event slug or the
  platform Sage Civic Theme as fallback, the platform Theme at
  [`shared/styles/themes/platform.ts`](../shared/styles/themes/platform.ts),
  and the per-event registry at
  [`shared/styles/themes/index.ts`](../shared/styles/themes/index.ts)
  (empty in M1 phase 1.5.2; M3 phase 3.2 adds test events; M4 phase
  4.1 adds Madrona). apps/site's root layout consumes the platform
  Theme via inline-style emission of CSS custom properties on
  `<html>` plus `next/font` for Inter (body) and Fraunces (heading);
  apps/web's `:root` block in
  [`apps/web/src/styles/_tokens.scss`](../apps/web/src/styles/_tokens.scss)
  carries today's warm-cream values byte-identically until M4 phase
  4.1 wires `<ThemeScope>` into apps/web event routes. Brand-tied
  derived shades (`--primary-surface`, etc.) are computed in each
  app's `:root` via `color-mix()` from the brand bases — they are
  not Theme fields. `shared/styles/` reads no env, holds no
  module-level singleton, and imports nothing app-specific.

Together they contain:

- shared game domain types
- DB-row mapping into `GameConfig`
- answer normalization
- scoring
- submitted-answer validation
- explicit sample fixtures for tests and the local-only prototype fallback

Published game content now lives in Supabase, but this shared layer is still
the source of truth for the in-memory game model and game correctness once that
content has been loaded.

### Backend Structure

The Supabase side is intentionally small:

- `supabase/functions/issue-session/index.ts`
  Creates or reuses the signed browser session credential. When an `event_id`
  is present in the POST body, also fires a best-effort upsert into
  `game_starts` to record the funnel denominator for analytics.
- `supabase/functions/complete-game/index.ts`
  Orchestrates trusted completion requests: origin and method gates, session
  verification, published content loading, shared validation and scoring, and
  final response mapping.
- `supabase/functions/complete-game/`
  Local helper modules for completion payload parsing, JSON responses,
  dependency wiring, and service-role RPC persistence used by the handler and
  function tests.
- `supabase/functions/redeem-entitlement/index.ts`
  Authenticated operator endpoint that validates `eventId` + 4-digit suffix,
  verifies the bearer token, forwards the caller JWT into
  `redeem_entitlement_by_code(...)`, and maps the stable SQL envelope to HTTP.
- `supabase/functions/reverse-entitlement-redemption/index.ts`
  Authenticated organizer/root-admin endpoint that validates `eventId`,
  4-digit suffix, and optional reason, then forwards the caller JWT into
  `reverse_entitlement_redemption(...)` and mirrors the SQL envelope through
  HTTP.
- `supabase/functions/get-redemption-status/index.ts`
  Session-bound attendee endpoint that accepts only `eventId`, verifies the
  signed browser session, and reads the current entitlement state by
  `(event_id, client_session_id)`.
- `supabase/functions/save-draft/index.ts`
  Authoring endpoint that validates canonical draft content and saves it to
  the private draft table. It also accepts an optional top-level `eventCode`,
  generates one server-side when needed, and preserves the database-owned
  event-code lock after publish. Authorizes the caller as either an organizer
  for the draft's event id or a root admin.
- `supabase/functions/generate-event-code/index.ts`
  Authoring endpoint that returns a non-persisted random 3-letter event-code
  suggestion for the named event. Save still happens through `save-draft`,
  which remains the persistence authority. Authorizes the caller as either
  an organizer for `eventId` or a root admin.
- `supabase/functions/publish-draft/index.ts`
  Authoring endpoint that validates a draft and calls the service-role
  publish RPC. Authorizes the caller as either an organizer for `eventId`
  or a root admin.
- `supabase/functions/unpublish-event/index.ts`
  Authoring endpoint that hides a live event without deleting draft or
  version history. Authorizes the caller as either an organizer for
  `eventId` or a root admin.
- `supabase/functions/_shared/admin-auth.ts`
  Shared Supabase Auth JWT and root-admin allowlist verification. Reserved
  for any future root-only authoring path; the four authoring endpoints
  above migrated to `event-organizer-auth.ts` in M2 phase 2.1.2.
- `supabase/functions/_shared/event-organizer-auth.ts`
  Shared Supabase Auth JWT verification plus per-event organizer-or-admin
  authorization for the four authoring endpoints. Calls
  `is_organizer_for_event(eventId)` and `is_root_admin()` and admits the
  caller on either OR-branch.
- `supabase/functions/_shared/authoring-http.ts`
  Shared CORS, method, configuration, and JSON response handling for
  authoring endpoints. Per-event authorization is the per-function
  handler's responsibility — each authoring function parses its payload,
  extracts the target eventId, and calls
  `authenticateEventOrganizerOrAdmin` directly.
- `supabase/functions/_shared/cors.ts`
  Shared CORS helpers.
- `supabase/functions/_shared/redemption-operator-auth.ts`
  Shared bearer-token verification for operator-facing redemption endpoints.
- `supabase/functions/_shared/published-game-loader.ts`
  Service-role loader that reads one published event from Supabase and maps it
  into the shared runtime model before trusted validation.
- `supabase/functions/_shared/session-cookie.ts`
  Session signing and verification helpers shared by both the cookie and header-fallback path.
- `supabase/migrations/20260403120000_complete_quiz_entitlements.sql`
  Historical filename; creates database objects that store completion attempts
  and ensure only one game entitlement is granted per event/session pair. The
  active SQL objects are renamed by later migrations.
- `supabase/migrations/20260405171549_fix_verification_code_pgcrypto_search_path.sql`
  Fixes the pgcrypto search path used for verification code generation.
- `supabase/migrations/20260405175756_harden_completion_backend.sql`
  Hardens the completion backend with additional server-side guards.
- `supabase/migrations/20260406130000_add_published_quiz_content.sql`
  Published event, question, and option tables plus demo-event backfill and
  public read policies.
- `supabase/migrations/20260406150000_add_quiz_authoring_drafts.sql`
  Private draft and version tables plus backfill from the current published
  demo events.
- `supabase/migrations/20260407103000_add_quiz_authoring_auth.sql`
  Admin allowlist table (`admin_users`), admin-status RPC (`is_admin()`),
  authoring RLS policies, and draft audit stamping.
- `supabase/migrations/20260410170000_add_quiz_authoring_publish_workflow.sql`
  Game event audit log plus service-role publish and unpublish RPCs that update
  the public runtime projection transactionally.
- `supabase/migrations/20260415000000_add_quiz_event_draft_slug_lock_trigger.sql`
  Database trigger that enforces slug immutability once an event is first
  published. The trigger fires under the row write lock so no concurrent
  publish can bypass the check; the application layer also validates this
  before upserting, but the trigger is the authoritative enforcement point.
- `supabase/migrations/20260415010000_make_sponsor_nullable.sql`
  Drops the `NOT NULL` constraint on `game_questions.sponsor` so unsponsored
  house questions can be modeled correctly. Required before analytics views
  can distinguish sponsored from unsponsored questions.
- `supabase/migrations/20260416000000_add_quiz_starts.sql`
  Adds the `game_starts` table (`event_id`, `client_session_id`, `issued_at`)
  with a unique constraint on `(event_id, client_session_id)` for idempotent
  inserts. RLS enabled; analytics-only, accessed via service role. Provides
  the funnel denominator (starts → completions → entitlements) that is
  permanently unrecoverable without this table in place before an event runs.
- `supabase/migrations/20260416010000_add_quiz_starts_event_fk.sql`
  Adds a foreign key from `game_starts.event_id` to `game_events(id) ON DELETE
  CASCADE`. Enforces referential integrity so `issue-session` cannot record
  start rows for nonexistent event IDs (which would pollute analytics), and
  ensures start rows are cleaned up if an event is hard-deleted.
- `supabase/migrations/20260418000000_rename_database_terminology_to_game.sql`
  Renames the persistent SQL contract from the historical quiz/raffle names to
  the current game/entitlement names. The active schema uses `game_events`,
  `game_questions`, `game_question_options`, `game_completions`,
  `game_entitlements`, `game_event_drafts`, `game_event_versions`,
  `game_event_audit_log`, `game_starts`, `admin_users`, `is_admin()`,
  `complete_game_and_award_entitlement()`, `publish_game_event_draft()`, and
  `unpublish_game_event()`.
- `supabase/migrations/20260418010000_rename_authoring_entitlement_label_json.sql`
  Renames authoring draft/version JSON from the historical `raffleLabel` key to
  `entitlementLabel` and updates `publish_game_event_draft()` so it projects
  draft content into `game_events.entitlement_label`.
- `supabase/migrations/20260418020000_update_demo_game_copy.sql`
  Updates seeded demo event, question, and answer-option copy to the Phase 4
  game/reward wording used by the frontend fixtures and browser tests.
- `supabase/migrations/20260418030000_add_event_code_columns.sql`
  Adds nullable `event_code` columns to private drafts and published events
  with uppercase 3-letter format checks.
- `supabase/migrations/20260418040000_backfill_event_code.sql`
  Backfills existing testing/demo rows deterministically, makes event codes
  required, adds unique indexes, and creates `generate_random_event_code()` for
  service-role generation.
- `supabase/migrations/20260418050000_lock_event_code_after_publish.sql`
  Adds the database trigger that prevents event-code changes after first
  publish.
- `supabase/migrations/20260418060000_project_event_code_on_publish.sql`
  Updates `publish_game_event_draft()` so the published `game_events` projection
  receives the draft event code.
- `supabase/migrations/20260421000000_add_redemption_columns.sql`
  Reward redemption Phase A.1: adds the inline `redeemed_*` and
  `redemption_reversed_*` columns to `game_entitlements`, the composite
  `game_entitlements_redeemed_shape_check` invariant, and the
  `(event_id, redeemed_at DESC NULLS LAST)` monitoring index.
- `supabase/migrations/20260421000100_add_event_role_assignments.sql`
  Reward redemption Phase A.1: creates the event-scoped
  `public.event_role_assignments` table (agent/organizer assignments keyed
  by user_id + event_id + role), with RLS enabled and service_role limited
  to select/insert/delete (UPDATE revoked).
- `supabase/migrations/20260421000200_add_event_role_helpers.sql`
  Reward redemption Phase A.1: permission helpers
  `public.is_agent_for_event(text)`,
  `public.is_organizer_for_event(text)`, and `public.is_root_admin()`
  (aliases `is_admin()`). Used by both the redeem/reverse RPCs and the
  scoped RLS read policies.
- `supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql`
  Reward redemption Phase A.2a: `public.redeem_entitlement_by_code(
  p_event_id text, p_code_suffix text)` as `SECURITY DEFINER`. Gated by
  `is_agent_for_event OR is_root_admin`, row-locks the target entitlement,
  returns the `{ outcome, result, ... }` envelope, and is idempotent on
  repeat calls against an already-redeemed row. Cross-event codes surface
  as `not_found`.
- `supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql`
  Reward redemption Phase A.2a: `public.reverse_entitlement_redemption(
  p_event_id text, p_code_suffix text, p_reason text)` as
  `SECURITY DEFINER`. Gated by `is_organizer_for_event OR is_root_admin`,
  clears the `redeemed_*` columns and records the reversing identity in
  the `redemption_reversed_*` columns. Optional reason stored verbatim in
  `redemption_note`.
- `supabase/migrations/20260421000500_add_redemption_rls_policies.sql`
  Reward redemption Phase A.2a: authenticated SELECT policy on
  `game_entitlements` that scopes rows to the caller's assigned events
  (agent, organizer, or root admin), and a self-read policy on
  `event_role_assignments` so a user can read their own assignment rows.
  Writes on both tables continue to flow through the service-role RPC
  path.

## What Is Implemented Now

### Database-backed published content with shared runtime logic

Published game event, question, and option records now live in Supabase.

Those rows are mapped into the shared `GameConfig` runtime shape before either
the browser or backend uses them.

That means:

- the frontend route loads and the backend completion path use the same
  canonical event content
- the frontend still renders from the same runtime shape that the backend
  validates
- score/review behavior cannot drift from server-side completion logic without a code change
- malformed published content fails fast during mapping and validation instead
  of becoming an implicit UI-only problem

### Browser-session trust for the no-login MVP

The backend issues a signed browser session through `issue-session`.

That credential is then used by `complete-game` to:

- associate completions with a backend-controlled browser session
- avoid trusting a client-generated session identifier
- allow repeat completions without minting repeat game entitlements

The preferred transport is still a secure cookie, but the frontend also stores the signed session token fallback and sends it explicitly when browsers refuse cross-site cookie round-trips.

That means the trust boundary is still backend-controlled, but it no longer depends on every browser accepting a third-party cookie round-trip between the Vercel-hosted SPA and the Supabase edge-function origin.

This is intentionally lighter than full user identity, but it is stronger than a purely client-rendered completion screen.

### Local game state with backend-owned completion

The player experience is client-driven until the end of the game.

Today:

- question flow, progress, pending answers, retries, and retakes are managed locally in the browser
- final verification is returned from Supabase
- the completion screen displays backend-produced verification data rather than an entirely local success state
- once completion succeeds, the attendee screen polls the session-bound
  `get-redemption-status` endpoint every 5 seconds while the completion
  result remains open and the tab is visible; polling pauses while hidden
  and runs one immediate refresh when visibility returns, so operator
  redemption is reflected back without a manual refresh

### Multiple game feedback modes

The current shared game model and frontend support more than one game behavior:

- `final_score_reveal`
- `instant_feedback_required`

This capability is implemented in both the shared config model and the `useGameSession` reducer flow.

### Admin event workspace for authoring access

The platform splits admin authoring across the two apps:

- apps/site owns `/admin*` — the platform-admin list view. Signs root
  admins in with Supabase Auth magic links, checks the private email
  allowlist through `public.is_admin()`, shows the event-centered draft
  list, lets admins create starter drafts and duplicate existing private
  drafts, and hard-navigates to apps/web's `/event/:slug/admin` for the
  per-event deep editor and to `/event/:slug/game` for the live game.
- apps/web owns `/event/:slug/admin` — the per-event deep editor.
  Resolves slug → event-id and authorizes through
  `useOrganizerForEvent` (parallel `is_organizer_for_event` and
  `is_root_admin` RPCs), so an organizer who is not on the platform
  allowlist still reaches the authorized authoring state. Lets admins
  edit event-level draft details, edit existing question text /
  sponsor attribution / selection mode / option labels / correct
  answers, add / duplicate / reorder / delete draft questions, add /
  delete draft answer options, and publish or unpublish the draft.

Both surfaces keep non-admin authenticated users out of the draft data
path: apps/site's platform list runs the `is_admin()` allowlist gate,
apps/web's per-event editor runs the `is_organizer_for_event OR
is_root_admin` gate.

The browser requests magic links with `requestMagicLink(email,
{ next: routes.admin })`, which transits the return trip through
`/auth/callback?next=/admin`. The Supabase Auth dashboard redirect URL
allowlist must include `<origin>/auth/callback` for every environment,
and the project Site URL should match the deployed web origin so email
links do not fall back to a local default. Adding a new authenticated
route in a later phase only requires extending `AppPath` and the
`validateNextPath` allow-list — no new dashboard entry is needed.

Both admin surfaces can create, duplicate, and update event-level,
question-level, and answer-option private draft content, but the backend API
surface owns validation and persistence:

- `save-draft` writes validated private draft JSON for allowlisted admins
- `publish-draft` validates the draft and updates the public event, question,
  and option tables through one database transaction
- `unpublish-event` clears the public event's `published_at` value while
  preserving private draft and version history
- `game_event_audit_log` records publish and unpublish transitions

The current scope still stops short of a preview route or AI authoring UI.

### Direct-entry operator redeem route

The web app now also includes an inert direct-entry route at
`/event/:slug/game/redeem`.

Today that route:

- accepts magic-link sign-in through the same role-neutral auth shell used by
  `/admin`, with `next=/event/:slug/game/redeem` validated through
  `validateNextPath`
- keeps signed-out, loading, missing-config, authorized, role-gated, and
  transient-error states explicit in the page shell
- resolves event context from `game_events.slug`, displays the locked
  `event_code` prefix, and never lets the caller edit that event context
- authorizes access with the existing readable surfaces only:
  `is_agent_for_event(...)`, `is_root_admin()`, and a non-leaking role-gate
  path shared by both unknown slugs and signed-in-but-unassigned users
- submits exactly `{ eventId, codeSuffix }` to the existing
  `redeem-entitlement` Edge Function with the caller's bearer token
- maps the trusted response envelope into local before/ready, success
  (`redeemed_now` / `already_redeemed`), rejected (`not_authorized` /
  `not_found`), and transient retryable states
- stays intentionally undiscoverable after merge: no nav link, no `/admin`
  link, and no role seeding. Attendee polling is now live on the
  completion screen; monitoring list behavior remains direct-entry only

### Direct-entry operator monitoring + reversal route

The web app also includes an inert direct-entry route at
`/event/:slug/game/redemptions` for dispute handling.

Today that route:

- accepts magic-link sign-in through the same role-neutral auth shell used
  by `/admin` and `/event/:slug/game/redeem`, with
  `next=/event/:slug/game/redemptions` validated through `validateNextPath`
- keeps signed-out, loading, missing-config, authorized, role-gated, and
  transient-error states explicit in the page shell, reusing the
  non-leaking role-gate copy the redeem route introduced
- authorizes access with the readable surfaces only:
  `is_organizer_for_event(...)` and `is_root_admin()` (agents have no
  read access to this route in MVP, per the parent design's role model)
- reads `game_entitlements` directly through the browser Supabase client
  as two bounded slices (redeemed + reversed) merged, deduped, and sorted
  client-side by `COALESCE(redemption_reversed_at, redeemed_at) DESC,
  id DESC` into the cached slice capped at 500 rows, protected by the
  A.2a RLS read policy and an explicit `.eq("event_id", ...)` scope
- renders the mobile monitoring surface: locked event-context badge,
  sticky filter bar (chips: `Last 15m`, `Redeemed`, `Reversed`,
  `By me`), suffix-first search, newest-first list, and a detail
  bottom sheet
- surfaces reversal only from inside the detail sheet: a redeemed row
  shows a `Reverse redemption` CTA for authorized callers; tapping it
  transitions the same sheet into a confirmation step with an optional
  single-line reason input (blank → `null`, mirroring the landed
  backend normalization), a `Back` control, and a `Confirm reversal`
  action whose pending label is `Reversing...`
- submits exactly `{ eventId, codeSuffix, reason }` to the landed
  `reverse-entitlement-redemption` Edge Function with the caller's
  bearer token and maps the A.2b envelope to visible sheet states:
  `reversed_now` / `already_unredeemed` successes, stable failures for
  `not_authorized` / `not_found`, and a transient failure with one
  automatic retry for network / 5xx / unexpected 401 / malformed 200
- reconciles on success by firing a single-row re-read in parallel with
  the full bounded list refetch so the open sheet reflects the
  canonical server state (updated status badge, reversed-at, reversed-by,
  stored reason) without waiting for the list refresh; the list-level
  `Last updated` timestamp stays anchored to the canonical list fetch,
  never to the single-row re-read
- expands `By me` to match rows where the current user appears as
  either the redeemer or the reverser, so a just-reversed row still
  surfaces in that chip
- stays intentionally undiscoverable after merge: no nav link, no
  `/admin` link, no role seeding, and no realtime subscription or
  auto-polling. Role seeding moves to a later phase

## Runtime Request Flow

The current system works like this:

1. A user lands on the frontend hosted on Vercel.
2. The React app resolves the pathname locally and, for `/event/:slug/game`,
   loads the published event content from Supabase with the publishable key.
3. The landing page likewise reads published demo summaries from Supabase.
4. Missing or unpublished event slugs render an explicit unavailable state
   without revealing which case occurred.
5. When the user starts a game, the browser calls the Supabase `issue-session`
   edge function with the `event_id` in the request body.
6. Supabase returns a signed browser session credential and attempts to set the
   secure session cookie. As a best-effort side effect, it upserts a row into
   `game_starts` so the event has a permanent record of this session starting.
7. The player completes the game entirely in local browser state.
8. At the end, the browser submits answers, duration, event id, and request id
   to `complete-game`.
9. The backend verifies the signed session credential, reloads the canonical
   published event by `eventId`, validates answers against the shared
   `game-config` runtime model, recomputes score, and executes the database RPC.
10. The RPC records the completion attempt, creates or reuses the game
    entitlement, and returns the official verification data.
11. The frontend renders the completion screen using that trusted response.
12. While the completion result remains in scope, the frontend polls
    `get-redemption-status` every 5 seconds with the signed browser
    session while the tab is visible, pauses while hidden, and performs
    one immediate refresh on hidden→visible. The attendee screen keeps
    the last known good state across transient failures and flips from
    ready-to-redeem to redeemed once an operator action updates the
    entitlement row.

This flow keeps question-to-question interaction fast while reserving the final trust decision for the backend.

## Current Backend Surface

The current implementation uses:

- `issue-session`
  Prepares the signed browser session credential used as the trust boundary
  for the no-login MVP. When `event_id` is present in the request body, also
  writes a best-effort start row to `game_starts` for analytics. A DB failure
  on the start write does not prevent the session response from returning —
  session issuance is the trust boundary; analytics is observability.
- `complete-game`
  Owns final validation, scoring, dedupe, and verification-code return.
- `get-redemption-status`
  Returns the current redeemed vs unredeemed state for the verified
  attendee session and lets the completion screen reconcile operator
  redemption without exposing any operator-only surface to the attendee.
- direct PostgREST reads for published `game_events`, `game_questions`, and
  `game_question_options`
  The browser uses the publishable key plus RLS-filtered reads for public event
  content, while the backend uses the same tables through the service-role key.
- direct authenticated PostgREST reads for private `game_event_drafts`
  The admin shell loads draft summaries through the authenticated browser
  session plus RLS.
- `save-draft`
  Authenticates the Supabase user, authorizes them as either an organizer for
  the draft's event id or a root admin via
  `authenticateEventOrganizerOrAdmin`, validates canonical draft content, and
  writes private draft rows with service-role privileges.
- `publish-draft`
  Same authorization as `save-draft` (organizer for `eventId` or root admin).
  Revalidates the draft through shared game logic and calls
  `public.publish_game_event_draft(...)` to update live public content in one
  transaction.
- `unpublish-event`
  Same authorization as `save-draft`. Calls `public.unpublish_game_event(...)`
  to hide a live event without deleting authoring history.
- `generate-event-code`
  Same authorization as `save-draft`. Returns a non-persisted random 3-letter
  event-code suggestion for the named event; persistence still flows through
  `save-draft`.
- `public.is_admin()` / `public.is_root_admin()`
  Security-definer SQL helpers that turn the current authenticated
  email/user context into one root-admin allowlist decision; `is_root_admin`
  is the alias the broadened authoring helper consumes alongside
  `is_organizer_for_event(text)`.
- `public.is_organizer_for_event(text)`
  Security-definer SQL helper that returns true when the current
  authenticated user holds an `organizer` row in
  `public.event_role_assignments` for the given event id. Consumed by
  `authenticateEventOrganizerOrAdmin` and by the broadened RLS policies
  installed in M2 phase 2.1.1.

There is still no custom general-purpose application API beyond those bounded
surfaces, and that is intentional. The system exposes only the reads and
trusted function endpoints needed by the attendee flow.

## Data Ownership Today

### Client-Owned During Play

The browser currently owns:

- published summary and event reads for public rendering
- the persisted Supabase Auth session for `/admin`
- current question index
- pending selection state
- submitted local answers
- transient feedback state
- local progress state during a run
- development-only fallback completion data when Supabase env vars are absent

### Backend-Owned For Completion And Authoring

Supabase currently owns:

- published event, question, and option records
- private authoring drafts, immutable versions, and audit rows
- draft save, publish, and unpublish transitions
- signed browser-session trust
- game start records (`game_starts`) for analytics funnel tracking
- final answer validation
- trusted score calculation
- completion attempt persistence
- game entitlement dedupe
- verification code return

## Current Deployment Shape

The current deployment model is:

- `Vercel` hosts the static frontend build from `apps/web`
- `Vite` produces that frontend build and powers local development
- `Supabase` hosts the database and edge functions

Those services have distinct roles:

- `Vite` is not a hosting platform. It is the frontend build tool and local dev server.
- `Vercel` is not the backend of record. It serves the built SPA and handles route rewrites for browser navigation.
- `Supabase` is not rendering the game UI. It stores data and runs the trusted completion/session logic.

In this repo, [apps/web/vercel.json](../apps/web/vercel.json) hosts both
the SPA route rewrites and the cross-app proxy rewrites that route
`apps/site`-owned URLs to the second Vercel project. See
"Vercel routing topology" below.

### Vercel routing topology

Routing is **transitional** through M2 of the
[Event Platform Epic](./plans/event-platform-epic.md). Today,
`apps/web` is the primary Vercel project owning the production custom
domain; its `vercel.json` proxy-rewrites the platform admin, the auth
callback, the platform landing, and event-scoped non-game/admin URLs
to the `apps/site` Vercel project. Vercel applies rewrites in file
order ("first match wins"), so most-specific rules must come first.

| # | Path pattern | Destination | Lifetime |
| --- | --- | --- | --- |
| 1 | `/event/:slug/game` | `apps/web` SPA | Permanent (event-scoped) |
| 2 | `/event/:slug/game/:path*` | `apps/web` SPA | Permanent (event-scoped); covers `/game/redeem` and `/game/redemptions` operator routes |
| 3 | `/event/:slug/admin` | `apps/web` SPA | Permanent (event-scoped); per-event admin shell |
| 4 | `/event/:slug/admin/:path*` | `apps/web` SPA | Permanent (event-scoped) |
| 5 | `/event/:slug` | `apps/site` Vercel project | Permanent (placeholder in 0.3; real landing page in M3) |
| 6 | `/event/:slug/:path*` | `apps/site` Vercel project | Permanent (catches every event-scoped path not carved out above) |
| 7 | `/event/:path*` (SPA fallback) | `apps/web` SPA | Transitional; narrows as event-scoped routes finalize |
| 8 | `/_next/:path*` | `apps/site` Vercel project | Permanent; covers apps/site asset path resolution |
| 9 | `/admin` | `apps/site` Vercel project | Permanent (platform admin) |
| 10 | `/admin/:path*` | `apps/site` Vercel project | Permanent (platform admin) |
| 11 | `/auth/callback` | `apps/site` Vercel project | Permanent auth callback route |
| 12 | `/` | `apps/site` Vercel project | Platform landing |

The cross-app destinations (rules 5, 6, 8, 9, 10, 11, and 12) point
at the production alias of the `apps/site` Vercel project via
Vercel's path-rewrite-to-URL syntax. Whether `apps/site` later
becomes the primary Vercel project (owning the custom domain) is a
routing-config decision belonging to M2 plan authors.

The rule 7 SPA fallback is explicitly transitional. M2 plan authors
are responsible for narrowing it as event-scoped routes finalize.

The current deployment discipline is simpler:

1. Develop and validate changes locally against the configured remote Supabase project or the explicit offline fallback.
2. Use pull requests and CI to review changes before merge.
3. Merge to `main`.
4. Let Vercel Git integration deploy the frontend from the merged repo state.
5. Let [`.github/workflows/release.yml`](../.github/workflows/release.yml) apply Supabase migrations and deploy Edge Functions to the production project from the same repo state.

This keeps deployment repo-driven without requiring hotfixes to start in production, and without introducing preview-branch infrastructure on the backend yet.

## Post-MVP Planned Work

The MVP milestone is complete. The following areas represent planned post-MVP
enhancements, deferred capabilities, and open operational questions that were
intentionally out of scope for the initial release.

### Organizer/admin tooling

The admin workspace ships create, duplicate, event-level edit, question and
option edit, publish, and unpublish. The deferred capabilities are:

- preview UI: let an admin see the attendee experience before publishing
- AI-assisted authoring entry points in the admin experience

### Analytics and reporting

The backend now persists both game start records (`game_starts`) and trusted
completion data (`game_completions`, `game_entitlements`). This gives the
full funnel: starts → completions → entitlements.

What is still missing:

- SQL views for completion rate, score distribution, and timing summaries
- organizer-visible event reporting surface in the admin workspace

### Production event lookup and publish model

Today, the web app includes a marketing/demo landing page and direct
`/event/:slug/game` routes backed by published event records.

What is missing for live operation:

- clean handling for draft, expired, or unknown event routes
- a production path where QR codes open directly into a live event flow without relying on the demo overview

### Stronger anti-abuse, if needed

Today, the trust boundary is:

- signed browser session credential
- one game entitlement per event/session pair

What is not yet implemented:

- person-level dedupe
- multi-device abuse controls
- more advanced operational fraud handling

This is an explicit product tradeoff, not an accidental omission.

## Roadmap

The most sensible next architectural steps are:

1. Add a staging or branch-based Supabase promotion path if local verification plus direct-to-production release stops feeling sufficient.
2. Add admin draft preview (Phase 4.5, deferred post-MVP) and AI-assisted
   authoring entry points (Phase 4.7, deferred post-MVP) on top of the shipped
   admin authoring surface.
3. Add lightweight analytics/reporting for live events.
4. Add richer publish behavior such as drafts, previews, or expiry windows if
   live operations need them.
5. Revisit abuse controls after observing live event behavior.
