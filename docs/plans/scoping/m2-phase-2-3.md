# M2 Phase 2.3 — Scoping

## Goal

Migrate `/auth/callback` and `/` from apps/web to apps/site as a hard
cutover. apps/site becomes the first non-event-scoped consumer of
[shared/auth/](../../../shared/auth/) and (conditionally)
[shared/events/](../../../shared/events/). The magic-link return
handler renders as a Next.js client component wrapping the existing
shared `AuthCallbackPage`; post-auth `next=` validation continues
through the browser-only
[shared/urls/validateNextPath.ts](../../../shared/urls/validateNextPath.ts);
the new landing renders the demo-overview content (or a small
platform landing that subsumes it) against apps/site's Sage Civic
`:root` defaults — no `<ThemeScope>` because neither route is
event-scoped. [apps/web/vercel.json](../../../apps/web/vercel.json)
adds proxy-rewrites for both paths and the apps/web route handlers
are removed. After 2.3 lands, apps/web's only top-level surface is
`/admin*` (retired by 2.4).

## Inputs From Siblings

- **From M0 phase 0.3 (Landed).**
  [apps/web/vercel.json](../../../apps/web/vercel.json) routing
  topology with `/auth/:path*` and the implicit `/` catch-all
  rewriting to apps/web's `index.html`. 2.3 inverts both: explicit
  `/auth/callback` and `/` proxy-rewrites to
  `https://neighborly-events-site.vercel.app`.
- **From M1 phase 1.3 (Landed).**
  [shared/auth/AuthCallbackPage.tsx](../../../shared/auth/AuthCallbackPage.tsx)
  (subscribe-before-getSession ordering, 10s timeout),
  [shared/auth/configure.ts](../../../shared/auth/configure.ts), and
  [shared/db/client.ts](../../../shared/db/client.ts)'s
  `createBrowserSupabaseClient` with `flowType: "implicit"` and
  `@supabase/ssr` chunked cookie storage. The client comment names
  2.3 as the consumer that "may revisit flow choice if server-side
  PKCE exchange becomes necessary" — implicit-flow's URL-hash token
  delivery forces 2.3's callback route to be a client component.
- **From M1 phase 1.5.2 (Landed).**
  [apps/site/app/layout.tsx](../../../apps/site/app/layout.tsx)
  already wires `next/font` and emits the Sage Civic platform Theme
  as inline-style CSS custom properties on `<html>`. Both new routes
  inherit those defaults.
- **From M1 phase 1.4 (Landed).**
  [shared/events/published.ts](../../../shared/events/published.ts)'s
  `listPublishedGameSummaries` — needed only if the new landing
  preserves the demo-events list (see open question).
- **From M1 phase 1.2 (Landed).**
  [shared/urls/validateNextPath.ts](../../../shared/urls/validateNextPath.ts)
  already covers every M2-current `next=` destination. No allow-list
  edits in 2.3.
- **From phases 2.1, 2.2.** Nothing.

## Outputs Other Siblings Need

- **apps/site adapter pattern for `shared/db/` and `shared/auth/`.**
  First apps/site surface that needs a Supabase client and the
  configured `shared/auth/` providers. The Next.js-coupled adapter
  (`process.env.NEXT_PUBLIC_*` reads, client singleton,
  `configureSharedAuth` invocation) is established here and reused
  by phase 2.4 (`/admin`) and M3 phase 3.1 (event landing). Phase
  2.4's scoping doc lists
  [apps/site/lib/setupAuth.ts](apps/site/lib/setupAuth.ts) and
  [apps/site/lib/supabaseBrowser.ts](apps/site/lib/supabaseBrowser.ts)
  as "created by phase 2.3" — 2.3's plan must land both regardless
  of the landing-shape decision below.
- **`configureSharedEvents` adapter ownership.** Per the resolved
  landing-shape decision, 2.3's new `/` doesn't consume
  `shared/events/`, so `apps/site/lib/setupEvents.ts` is **not**
  created in 2.3. Phase 2.4 owns its creation alongside `/admin`'s
  `listDraftEventSummaries` consumer. The 2.4 scoping doc's File
  Inventory has been updated to reflect this.
- **Closed: server-side `validateNextPath` seam not needed.**
  [docs/plans/scoping/m2-phase-2-4.md:273–277](../../../docs/plans/scoping/m2-phase-2-4.md#L273)
  raises this as a 2.3 deliverable ("Phase 2.3 owns either
  parameterizing `validateNextPath` on the origin or introducing a
  server-side variant. 2.4 reuses whatever 2.3 lands."). 2.3 closes
  the question with **no seam**: implicit-flow's URL-hash token
  delivery forces the callback route to a `'use client'`
  component, which calls today's browser-only function unchanged.
  `next=` is consumed only at `/auth/callback`, so server-side
  callers never need it. The conditional clauses in
  [shared/db/client.ts:64](../../../shared/db/client.ts#L64),
  [shared/urls/README.md:32–36](../../../shared/urls/README.md#L32),
  and [docs/dev.md:225](../../../docs/dev.md#L225) are removed in
  2.3's docs pass.
- **Resolved: bootstrap seam pattern.** Dedicated client-component
  bootstrap wrapper (`<SharedClientBootstrap>`) inside an
  `app/(authenticated)/layout.tsx` route group. The group covers
  every apps/site route that consumes `shared/auth/` or
  `shared/events/` — initially `/auth/callback`; 2.4 places `/admin`
  inside it; M3's public event landing stays outside (M3 will add
  whatever scoping it needs for `shared/events/` consumption). The
  group name is convention only — the load-bearing structure is the
  layout-scoped bootstrap component, not the URL prefix (route
  groups don't appear in URLs). Per-route side-effect imports were
  rejected for silent-skip risk; root-layout import was rejected to
  let M3's public landing opt out structurally.
- **Resolved: authenticated-shell idiom for apps/site is `'use client'`.**
  2.4's `/admin` will use the `'use client'` boundary +
  `useAuthSession` + `getGameAdminStatus` pattern, mirroring
  apps/web's [AdminPage.tsx](../../../apps/web/src/pages/AdminPage.tsx).
  Trade-off accepted: brief unauthenticated-shell flash before
  hydration, in exchange for keeping `shared/auth/` browser-only and
  not introducing a server-side variant in M2. Future SSR-heavy
  organizer surfaces can revisit. `/auth/callback` is transport-only
  (no gate state) so the idiom does not arise in 2.3 itself; 2.3
  ships the wrapper and route group so 2.4 inherits the seam.
- **Vercel proxy-rewrite pattern for top-level URL migration.** Rule
  shape and ordering 2.3 ships for `/auth/callback` and `/` is
  reused by 2.4 for `/admin*`.
- **No URL-contract changes for downstream phases.** Both paths stay
  identical at the URL level; Supabase Auth Site URL and
  redirect-URL list are unchanged.

## File Inventory

### apps/site

- `apps/site/app/(authenticated)/layout.tsx` — create. Server
  component that renders `<SharedClientBootstrap>` around its
  children. The route-group prefix does not appear in URLs.
- `apps/site/app/(authenticated)/auth/callback/page.tsx` — create.
  `'use client'` wrapper around `<AuthCallbackPage>`.
- `apps/site/app/page.tsx` — create. New `/` landing. Static
  platform landing with a CTA into `/admin` per the resolved
  landing-shape decision; consumes no `shared/events/` data, so no
  per-route `setupEvents` import needed. Lives outside the
  `(authenticated)` group.
- `apps/site/components/SharedClientBootstrap.tsx` — create.
  `'use client'` component whose body runs the side-effect imports
  for `setupAuth` (and `setupEvents` if landing-shape decision
  preserves the events surface). Renders `children`. Idempotent per
  [shared/auth/configure.ts](../../../shared/auth/configure.ts).
- `apps/site/lib/supabaseBrowser.ts` — create. Next.js-coupled
  adapter mirroring
  [apps/web/src/lib/supabaseBrowser.ts](../../../apps/web/src/lib/supabaseBrowser.ts).
- `apps/site/lib/setupAuth.ts` — create. Side-effect import calling
  `configureSharedAuth`.
- `apps/site/lib/setupEvents.ts` — **not created in 2.3**. Per the
  resolved landing-shape decision, the new `/` doesn't consume
  `shared/events/`; phase 2.4 creates `setupEvents.ts` alongside
  `/admin`'s event-list consumer.
- [apps/site/package.json](../../../apps/site/package.json) — edit.
  Add exact-pinned `@supabase/supabase-js` and `@supabase/ssr`
  matching apps/web's lockfile entries.

### apps/web

- [apps/web/src/App.tsx](../../../apps/web/src/App.tsx) — edit. Drop
  `routes.authCallback` and `routes.home` cases plus imports.
- [apps/web/src/pages/LandingPage.tsx](../../../apps/web/src/pages/LandingPage.tsx)
  — delete.
- [apps/web/src/auth/index.ts](../../../apps/web/src/auth/index.ts) —
  edit. Drop `AuthCallbackPage` / `AuthCallbackPageProps`
  re-exports; keep `SignInForm` / `useAuthSession` / related types.
- [apps/web/src/styles/](../../../apps/web/src/styles/) partials —
  edit. Drop `landing-*`, `feature-grid`, `sample-games-*` rules
  with zero remaining consumers; keep `signin-stack`.
- `tests/web/` — edit. Drop LandingPage-only test files.

### vercel.json

- [apps/web/vercel.json](../../../apps/web/vercel.json) — edit.
  Remove `/auth/:path*`. Add `/auth/callback` and `/` proxy-rewrites
  to the apps/site origin, ordered such that the bare `/` rule does
  not pre-empt `/admin/:path*` (still apps/web until 2.4) or any
  `/event/...` rule.

### docs

- [docs/architecture.md](../../../docs/architecture.md) — edit.
  Update URL ownership shape (apps/site owns `/` and
  `/auth/callback`; apps/web's transitional ownership shrinks to
  `/admin*` only). Add the apps/site adapter modules to the layout
  section.
- [docs/operations.md](../../../docs/operations.md) — edit. Update
  Vercel routing description; redirect-URL list at lines 162–167
  stays unchanged.
- [docs/dev.md](../../../docs/dev.md) — edit. Add apps/site adapter
  description; flip the "apps/site adapter lands in M2 phase 2.3"
  line at [docs/dev.md:253](../../../docs/dev.md#L253).

### Out of scope

SQL, Edge Functions, pgTAP, `shared/db/` or `shared/auth/` API
changes, `<ThemeScope>` wiring, `validateNextPath` allow-list
extensions, Supabase dashboard config.

## Contracts

- `apps/site/app/auth/callback/page.tsx` — `'use client'`. Renders
  `<AuthCallbackPage onNavigate={adapter}>` where `adapter` calls
  `useRouter().replace(path)`. No props from Next.js (no
  searchParams — shared component reads `window.location.search`
  per its existing contract).
- `apps/site/app/page.tsx` — server or `'use client'` per
  landing-shape decision. If it consumes `listPublishedGameSummaries`
  via the existing browser fetch path it is `'use client'`; a
  server-rendered list would need a new server-side data path not
  yet in `shared/events/`.
- `apps/site/lib/supabaseBrowser.ts` — exports
  `getBrowserSupabaseClient`, `getSupabaseConfig`,
  `getMissingSupabaseConfigMessage`. Client-side singleton; SSR/RSC
  callers must surface `enabled: false` rather than throw.
- `apps/site/lib/setupAuth.ts` — module-level
  `configureSharedAuth({ getClient, getConfigStatus })` mirroring
  apps/web's setup.
- `apps/web/vercel.json` rule order (top to bottom): apps/web
  event-scoped namespaces → apps/site `/event/:slug` proxies →
  apps/web `/admin/:path*` (transitional) → apps/web `/event/:path*`
  catch-all → apps/site `/auth/callback` proxy → apps/site `/`
  proxy. Plan locks the exact order since the bare `/` proxy is the
  catch-all interaction the rule stack has not faced before.

## Cross-Cutting Invariants Touched

- **Auth integration.** New callback route consumes only
  `shared/auth/` and the apps/site-configured Supabase client. No
  second client instantiated.
- **URL contract.** `/auth/callback` and `/` move from apps/web to
  apps/site; paths unchanged. After 2.3, apps/web's only top-level
  surface is `/admin*`.
- **In-place auth.** Preserved. `/auth/callback` remains the single
  auth-distinct URL; new `/` is unauthenticated.
- **Theme route scoping.** Neither route is under `/event/:slug/*`,
  so neither wraps in `<ThemeScope>`. Both render against
  apps/site's Sage Civic `:root` defaults.
- **Deferred ThemeScope wiring.** Confirms the interim split:
  apps/web event routes stay on warm-cream until M4; apps/site's
  non-event-scoped surfaces (now including `/` and `/auth/callback`)
  inherit Sage Civic.
- **Trust boundary.** Auth-cookie path unchanged: the proxy-rewrite
  preserves the request host so `Set-Cookie` lands on apps/web's
  frontend domain. Cookie-boundary verification re-runs post-deploy
  because the route handler moved.
- **Theme token discipline.** Any new landing CSS consumes
  `var(--…)` for themable tokens; status colors and structural
  tokens stay platform-shared.

## Validation Gate

- `npm run lint`, `npm run build:web`, `npm run build:site` — all
  green.
- `npm test` — `tests/shared/auth/AuthCallbackPage.test.tsx` and
  `tests/shared/urls/validateNextPath.test.ts` continue passing
  (shared component untouched).
- Manual cookie-boundary round-trip on the deployed Vercel project:
  request a magic link from apps/web `/admin`, confirm
  `/auth/callback` is served by apps/site (Sage Civic visual,
  `next/font` typography), confirm the auth cookie lands on the
  apps/web frontend host, and confirm the redirect lands on `/admin`
  in apps/web with the session present.
- Manual: visit `/` on the deployed project, confirm apps/site
  serves it (Sage Civic visual) and any preserved demo links
  navigate into apps/web's `/event/:slug/game`.
- Manual: visit `/admin` on the deployed project, confirm apps/web
  still serves it — proves rule order does not pre-empt apps/web's
  transitional ownership.
- Tier 5 production smoke: existing
  [tests/e2e/admin-auth-fixture.ts](../../../tests/e2e/admin-auth-fixture.ts)
  exercises the full magic-link round-trip through `/auth/callback`;
  must pass post-deploy.
- Local-dev procedure for exercising `/auth/callback` documented per
  the open question below.

## Self-Review Audits

From [docs/self-review-catalog.md](../../../docs/self-review-catalog.md):

- **Frontend.** Effect cleanup audit — the `'use client'` wrapper
  introduces no additional effects around the shared
  `AuthCallbackPage`; the existing cleanup (subscribe/unsubscribe,
  timeout clear, `isCancelled` flag) must survive Next.js
  strict-mode double-mount.
- **CI.** Rename-aware diff classification — route handlers move
  cross-app and cross-framework, not as `git`-detectable renames;
  reviewers classify per surface so the auth-callback move does not
  read as "apps/site grew a new client component." CLI / tooling
  pinning audit — apps/site's new `@supabase/*` deps are
  exact-pinned to the same versions apps/web carries.
- **Runbook.** Readiness-gate truthfulness audit — the validation
  gate's "magic-link sign-in works end-to-end" claim must reference
  an actual run (or fixture URL) post-deploy, not be asserted from
  code shape. Platform-auth-gate config audit — Supabase Auth Site
  URL and redirect-URL list must still resolve correctly after the
  route move; no config change is needed but the assertion must be
  walked.

## Resolved Decisions

All open questions for 2.3 are settled. See
[m2-admin-restructuring.md](../m2-admin-restructuring.md)
"Cross-Phase Decisions" for the full deliberation; this section
records the resolutions and the rejected alternatives.

- **Local-dev story for `/auth/callback` → `vercel dev` for
  auth-flow e2e runs.** Most local work continues on
  `npm run dev:web` (or `dev:web:local`); fixtures at
  [admin-auth-fixture.ts](../../../tests/e2e/admin-auth-fixture.ts),
  [redeem-auth-fixture.ts](../../../tests/e2e/redeem-auth-fixture.ts),
  and [redemptions-auth-fixture.ts](../../../tests/e2e/redemptions-auth-fixture.ts)
  retain their `127.0.0.1:4173/auth/callback?next=...` URLs and run
  under `vercel dev`, which proxy-rewrites `/auth/callback` to
  apps/site exactly like production. The split is documented in
  [docs/dev.md](../../dev.md) as part of 2.3's docs pass.
  *Rejected: rewrite fixtures to apps/site dev origin — risks
  cookie-boundary fidelity drift between local and production. Thin
  apps/web shim — contradicts the "hard cutover" framing and carries
  dead apps/web code into M3.*
- **Landing-shape → subsume into platform landing.** New `/` ships a
  small static "Neighborly Events" platform landing with a CTA into
  `/admin`. The demo-events list is dropped from `/`; demo events
  stay reachable via direct URL. **Consequence:**
  `apps/site/lib/setupEvents.ts` is **not** created in 2.3 — phase
  2.4 owns its creation alongside `/admin`'s `listDraftEventSummaries`
  consumer. The 2.4 scoping doc's "From phase 2.3" notes are updated
  accordingly.
  *Rejected: literal port — pulls demo-events SCSS across the
  framework boundary and reads as "we ported the prototype" for
  what should be a platform front door. Hybrid (static landing with
  hardcoded demo link) — bakes a per-event slug into apps/site code,
  contradicting the "Per-event customization" invariant.*
- **apps/site Vercel project primary-domain promotion → defer
  post-epic.** 2.3 stays on the apps/web-primary proxy-rewrite
  pattern. Same disposition recorded in
  [m2-phase-2-4.md](./m2-phase-2-4.md) and the epic risk register.
  *Rejected: flip in M2 — adds routing churn beyond what M2's admin
  restructuring requires.*

## Risks

- **Vercel rule ordering pre-empts the bare `/` rule.** First
  top-level bare-path proxy-rewrite the rule stack has shipped;
  misordering sends every unmatched apps/web request to apps/site
  and breaks `/admin*`.
- **Implicit-flow URL hash lost in server-side handler.** Magic-link
  tokens arrive as `#access_token=...` in the fragment; only the
  browser sees them. A reader unfamiliar with implicit flow may try
  to handle `/auth/callback` server-side and silently lose every
  return.
- **Auth cookie domain mismatch through proxy.** Cookie is set
  host-only (no `Domain=`). If proxy implementation surprises
  (host-header rewriting), `Set-Cookie` lands on the apps/site
  Vercel hostname instead of apps/web's frontend domain and
  signed-in users appear signed-out on apps/web.
- **Playwright auth fixtures fail under `npm run dev:web`.** The
  three fixtures hardcoded for `127.0.0.1:4173/auth/callback` now
  require `vercel dev` per the resolved local-dev decision.
  Contributors who run them under `dev:web` get a confusing failure
  before reaching the redirect destination. Mitigation: 2.3's
  `docs/dev.md` pass documents the split clearly, and the fixtures
  themselves include a comment pointing at the runbook.
- **SCSS deletion pulls live styles by accident.** `landing-*` and
  `feature-*` partials may be referenced by `/event/:slug/game`
  shells or by phase 2.2's `/event/:slug/admin` shell landing in
  parallel. Trim only rules with zero remaining consumers.
- **`shared/auth` consumed before `configureSharedAuth` runs.** Wrong
  bootstrap-seam choice surfaces as the loud error
  [shared/auth/configure.ts:46](../../../shared/auth/configure.ts#L46)
  throws — hard fail rather than silent, but breaks the auth flow
  on first paint.
- **`featuredGameSlug` orphan re-export.** Per the resolved
  landing-shape decision, the new `/` drops the demo-events list, so
  [apps/web/src/data/games.ts](../../../apps/web/src/data/games.ts)
  still re-exports a value with a vanishing apps/web consumer. Verify
  [apps/web/src/lib/setupEvents.ts](../../../apps/web/src/lib/setupEvents.ts)
  still consumes it before trimming; if the only consumer was the
  apps/web `LandingPage`, drop the re-export with the LandingPage
  deletion.
