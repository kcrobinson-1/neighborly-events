# Framework Decision — `apps/site`

## Status

Landed.

**Parent epic:** [`event-platform-epic.md`](/docs/plans/event-platform-epic.md),
Milestone M0, Phase 0.2. M0's milestone Status remains `Proposed` until
phase 0.3 lands.

## Decision

`apps/site` is built on **Next.js 16.2.4 LTS (App Router)**. The decision
is final for the duration of the Event Platform Epic. Subsequent phases
(M0.3 through M4) implement against this choice.

## Candidates Evaluated

Two candidates, named in the parent epic:

- **Next.js 16.2.4 LTS** (App Router). Released 2026-04-15. Active LTS;
  v15 also under LTS support through 2026-10-21.
- **React Router 7.14.2** (framework mode). Latest stable. Framework Mode
  is stable; **RSC Framework Mode is unstable as of 7.14.x and not
  recommended for production**, so this evaluation treated the stable
  loader / action / `meta` paradigm as "RR7."

A broader search outside this candidate list was explicitly out of scope
per the epic's risk register. The research did not surface evidence
strong enough to invoke the "framework spike outcome" escalation path,
so the decision was made between the two named candidates.

## Research Posture

This decision is based on **documentation and accepted community
consensus only**. No spike code was built. The framework choice was made
by walking each candidate's official documentation, vendor-specific
integration guides (Supabase, Vercel), and framework-team
changelogs/blog posts symmetrically across ten dimensions.

Production-reality verification — cookie boundary across path-routed
apps on the production domain, cross-app token-refresh visibility
between `apps/web`'s browser-side auto-refresh and `apps/site`'s
middleware-driven refresh, and unfurl-preview behavior end-to-end — is
owned by **M0 phase 0.3**, which is the first phase that runs the
chosen framework against the production domain. Claims in this doc that depend on
runtime behavior are therefore **hypotheses for phase 0.3 to confirm**,
not facts. Open questions surfaced during research that the docs could
not close are listed below.

## Criteria

The ten dimensions, locked before evidence was gathered, in the order
the parent epic and the spike plan named them:

1. Auth integration (Supabase server-side helpers and seam shape)
2. Supabase data loading (server-context calling pattern, types,
   caching)
3. SSR/SSG ergonomics (request-time HTML, metadata APIs, server-rendered
   theme wrappers)
4. Deploy cost on Vercel (monorepo integration, function bundling,
   built-in batteries)
5. Team familiarity (distance from the current Vite + React 19 SPA
   baseline)
6. Theme rendering posture (CSS custom properties, FOUC behavior)
7. Cross-app navigation and cookie domain (path-routed apps under one
   domain)
8. Test story (Playwright + server-rendered route tests)
9. Consumption shape for `shared/` (module idioms imposed on the
   foundation layer)
10. Future flexibility (lock-in for `apps/web` as a Vite consumer; RSC
    forward path)

## Evidence Per Dimension

Each dimension lists per-candidate observations with source and
confidence tag, then a relative verdict.

### 1. Auth integration

- **Next.js.** Supabase publishes a Next.js-specific server-side guide:
  `@supabase/ssr` with `createServerClient` (server) and
  `createBrowserClient` (browser). Cookie reads/writes are routed
  through a Next.js Proxy/middleware. Server Components cannot set
  cookies — Supabase recommends `try/catch` on `setAll` and lets the
  Proxy rewrite cookies on response. `supabase.auth.getClaims()` is the
  recommended verification primitive (validates JWT signature against
  the project's published public keys per request); `getSession()` is
  explicitly called out as not safe in server code. (`from vendor`,
  [Supabase Next.js SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs))
- **RR7.** Supabase's general SSR guide treats Remix and RR7 framework
  mode identically: `@supabase/ssr` with `parseCookieHeader` to read,
  `serializeCookieHeader` to write, server client created per request
  inside loader/action. No proxy/middleware intermediation required.
  (`from vendor`,
  [Supabase SSR creating-a-client](https://supabase.com/docs/guides/auth/server-side/creating-a-client))
- **Verdict:** Documentation parity. Both have first-class
  Supabase-published integrations. The Next.js seam is a
  Next.js-specific Proxy-shaped helper; the RR7 seam is closer to
  standard Web Fetch primitives. Neither is decisive for the decision —
  both work.

### 2. Supabase data loading

- **Next.js.** Async Server Components `await` data inline. `fetch`
  calls are auto-memoized within `generateMetadata`,
  `generateStaticParams`, Layouts, Pages, and Server Components
  (request-scoped). `'use cache'` directive (Cache Components feature)
  for non-request-specific data. Streaming via `Suspense`. (`from
  docs`, [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components),
  [generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata))
- **RR7.** Three loading strategies: server `loader`, `clientLoader`,
  build-time `prerender`. `loader` removed from client bundles
  automatically; safe to use server-only APIs. `defer()` + `<Await>` +
  `<Suspense>` for progressive rendering. No fetch-level memoization;
  loaders run once per route per request. Cache via `headers()` route
  export setting `Cache-Control`. (`from docs`,
  [RR7 data loading](https://reactrouter.com/start/framework/data-loading))
- **Verdict:** Parity for our use case. Both serve `EventContent`-shaped
  data fine. Next.js's auto-memoization is a small ergonomic win when
  the same data is read by `generateMetadata` and the page body.

### 3. SSR/SSG ergonomics

- **Next.js.** Per-route metadata via static `metadata` export or
  dynamic `generateMetadata` async function (receives `params`,
  `searchParams`, `parent`). Returns a typed `Metadata` object covering
  `title` (with template), `description`, full `openGraph` (title,
  description, url, images, videos, locale, type), full `twitter` (card,
  title, description, images, creator, app), `icons`, `alternates`,
  `robots`, `verification`, `appleWebApp`, `metadataBase`, etc.
  Streaming metadata (since 15.2) appends meta to `<body>` after
  initial UI for fast TTFB; HTML-limited bots auto-detected by
  user-agent and given full `<head>` metadata. File-based metadata
  conventions (`opengraph-image.tsx`, `twitter-image.tsx`, `icon.tsx`,
  `sitemap.ts`, `robots.ts`) auto-resolve with hashed asset URLs.
  `next/og` (`ImageResponse`) is built into App Router for dynamic OG
  image generation. (`from docs`,
  [generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata),
  [Metadata files](https://nextjs.org/docs/app/api-reference/file-conventions/metadata),
  `from vendor`,
  [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs))
- **RR7.** Per-route metadata via `meta` function. Returns an array of
  meta-tag descriptors. Receives loader data so per-event meta can be
  derived from loader output. Rendered server-side via `<Meta />` in the
  root layout. Three rendering strategies: `ssr: true` (default), SPA
  (`ssr: false`), `prerender(): string[]`. No file-based metadata
  convention; everything in `meta` and `links` exports. No
  framework-integrated OG image generator equivalent to `next/og` —
  Vercel's `@vercel/og` works in a route handler but is not
  RR7-integrated. (`from docs`,
  [RR7 route module](https://reactrouter.com/start/framework/route-module),
  [RR7 rendering](https://reactrouter.com/start/framework/rendering),
  [Vercel OG](https://vercel.com/docs/og-image-generation))
- **Verdict: Next.js better.** Both produce valid SSR HTML with meta
  tags. Next.js's metadata API is richer (typed `Metadata` object with
  full unfurl/canonical/twitter/locale fields), file-based convention
  reduces boilerplate, `next/og` ships in-the-box, and streaming-bot
  detection is handled automatically. For an epic whose explicit goal
  is "proper meta tags and link-unfurl previews" (M3 phase 3.1 per
  [m3-site-rendering.md](/docs/plans/m3-site-rendering.md), M4
  phase 4.3), this dimension materially favors Next.js.

### 4. Deploy cost on Vercel monorepo

- **Next.js.** Native Vercel framework, zero-config deploy. Built-in:
  ISR with global CDN persistence, `next/image`, `next/font`
  (build-time download, no runtime requests to Google), `next/og`,
  draft mode, middleware, web analytics, speed insights, web vitals
  API. Vercel monorepo support via per-project Root Directory; the
  repo's existing npm workspaces qualify for "skip unaffected projects"
  optimization. (`from vendor`,
  [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs),
  [Vercel monorepos](https://vercel.com/docs/monorepos))
- **RR7.** Supported via `vercelPreset()` from
  `@vercel/react-router/vite` in `react-router.config.ts`. Without the
  preset, deploys still work but lose function-level per-route config
  and accurate deployment summaries. No Vercel-side equivalent of
  `next/image`, `next/font`, `next/og` integrated at the framework
  level. Same monorepo support. (`from vendor`,
  [RR on Vercel](https://vercel.com/docs/frameworks/frontend/react-router),
  [Vercel changelog: support for RR7](https://vercel.com/changelog/support-for-react-router-v7))
- **Multi-app on one domain (both candidates).** Three options:
  proxy-project `vercel.json` rewrites (lightweight, no extra cost),
  Next.js Multi Zones (Next.js-only), Vercel Microfrontends
  (`microfrontends.json`, dedicated pricing — Hobby gets 50K
  requests/month and 2 projects free, Pro/Enterprise get unlimited
  with $2/1M requests beyond inclusions, $250/project/month past 2).
  For our path-routed model
  (`/event/:slug/game/*` → `apps/web`,
  `/event/:slug/*` → `apps/site`), the proxy-project rewrite is the
  default path; Microfrontends is the upgrade if independent CDN
  routing is needed later. (`from vendor`,
  [Vercel multi-project KB](https://vercel.com/kb/guide/how-can-i-serve-multiple-projects-under-a-single-domain),
  [Vercel Microfrontends](https://vercel.com/docs/microfrontends))
- **Verdict: Next.js better.** Function-bundling, edge support, and
  monorepo behavior are parity. The differential is the bundle of
  built-in vendor primitives (`next/og`, `next/image`, `next/font`).
  Each one is non-trivial to reproduce on RR7 and each one directly
  serves an epic milestone (M3 unfurl previews, M4 Madrona launch
  performance).

### 5. Team familiarity

- **Next.js.** Default bundler in v16 is **Turbopack**, not Vite.
  Webpack opt-in via `--webpack`. New mental model for a Vite SPA
  team: server components, `'use client'` boundary, `'use server'`
  boundary, server actions, `cookies()` from `next/headers`, file-system
  routing under `app/`, file-based metadata conventions. Effectively a
  rewrite of routing/layout/data-fetching from the current SPA.
  (`from changelog`, [Next.js 16 blog](https://nextjs.org/blog/next-16))
- **RR7.** Uses **Vite** as its bundler via `@react-router/dev/vite`.
  Same dev-server ergonomics, same plugin ecosystem
  (`@vitejs/plugin-react`, Tailwind/PostCSS, etc.). Existing
  `apps/web/src/usePathnameNavigation.ts` and `routes.ts` map cleanly
  onto RR7's route configuration. (`from docs`,
  [RR7 installation](https://reactrouter.com/start/framework/installation))
- **Verdict: RR7 better.** Continuity wins on bundler, plugin, and
  routing-shape. **Not decisive at this stage** of the epic — `apps/site`
  is greenfield, the team is small, and the Next.js ramp is a one-time
  cost rather than a recurring per-PR cost.

### 6. Theme rendering posture

- **Next.js.** Tailwind CSS v4, CSS Modules, Sass, global CSS, external
  stylesheets, CSS-in-JS supported. CSS imports server-rendered into
  initial HTML. CSS custom properties on a server-rendered wrapper for
  `/event/[slug]` render in the HTML output — no FOUC for theme-by-slug.
  React Context theme providers must be `'use client'` and wrap
  `{children}`; CSS-custom-property injection on a server wrapper avoids
  Context entirely and aligns with the epic's "Theme route scoping"
  invariant. (`from docs`, [Next.js CSS](https://nextjs.org/docs/app/getting-started/css))
- **RR7.** Uses Vite's CSS pipeline. Same stylesheet patterns the team
  already uses in `apps/web`. Three approaches: side-effect imports,
  `links()` route export, React 19 direct `<link>` hoisting. CSS custom
  properties on a server-rendered route wrapper — no FOUC. (`from docs`,
  [RR7 styling](https://reactrouter.com/explanation/styling))
- **Verdict:** Parity. Both server-render CSS variables on a wrapper.
  Both support Sass. The epic's "themable tokens are CSS custom
  properties" invariant works identically on both.

### 7. Cross-app navigation and cookie domain

- **Next.js.** Cookies read in server context via `cookies()` from
  `next/headers`. Supabase Proxy (Next.js middleware) handles cookie
  refresh on every request. Server Components cannot set cookies. (`from
  vendor`, [Supabase Next.js SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs))
- **RR7.** Cookies read/written via Web-Fetch `Headers` in
  loaders/actions. (`from vendor`,
  [Supabase SSR client](https://supabase.com/docs/guides/auth/server-side/creating-a-client))
- **Cross-app on same domain (both).** Cookies set on `example.com/`
  with path=`/` are sent on every request under that domain regardless
  of which Vercel project handles a path, by browser invariant. Vercel's
  KB explicitly does not document cookie behavior across path-routed
  multi-project rewrites — flagged as a doc gap below. (`from
  consensus`, [Vercel multi-project KB](https://vercel.com/kb/guide/how-can-i-serve-multiple-projects-under-a-single-domain))
- **Verdict:** Documentation parity, with a doc gap on Vercel-specific
  multi-project behavior. M0 phase 0.3 owns verification.

### 8. Test story

- **Next.js.** Dedicated guides for Cypress, Playwright, Vitest, Jest.
  Async Server Components: framework explicitly recommends **E2E over
  unit tests** because tooling does not fully support unit testing
  async server components. Existing Playwright tiers in this repo
  carry forward unchanged. (`from docs`,
  [Next.js testing](https://nextjs.org/docs/app/guides/testing))
- **RR7.** `createRoutesStub` API for unit-testing components that
  consume router context (`useLoaderData`, `useActionData`, `<Link>`).
  Recommends integration/E2E (Playwright, Cypress) for full route
  components due to type alignment with `Route.ComponentProps`.
  Vitest gotcha: `reactRouter()` Vite plugin must be conditionally
  disabled in `vite.config.ts` when `process.env.VITEST` is set. (`from
  docs`, [RR7 testing](https://reactrouter.com/start/framework/testing))
- **Verdict:** Parity. Both recommend Playwright for full route tests;
  both have a unit-test path for client/router-context components.

### 9. Consumption shape for `shared/`

- **Next.js.** Server Component imports cannot reach client-only code at
  build time. Enforcement: `server-only` and `client-only` packages,
  framework-honored. `'use client'` is a **module-graph boundary** —
  marking a single file makes the whole subgraph rooted at that file
  part of the client bundle. `shared/auth/` for Next.js consumers must
  split into a server entry (uses `cookies()` from `next/headers` or
  accepts a cookie adapter) and a client entry (uses
  `createBrowserClient` and React hooks). React Context is not
  supported in Server Components, so theme providers must be client
  components. (`from docs`,
  [Server and Client Components — Preventing environment poisoning](https://nextjs.org/docs/app/getting-started/server-and-client-components))
- **RR7.** `.server.ts` / `.server/` and `.client.ts` / `.client/`
  conventions enforce the boundary at build time. Route modules cannot
  themselves be `.server` or `.client`. Seam is closer to standard Web
  Fetch primitives — `shared/auth/` can ship a server entry that takes
  a `Request`, returns a server client, and contributes response
  headers, with no framework-specific cookie helper required. (`from
  docs`, [.server modules](https://reactrouter.com/api/framework-conventions/server-modules))
- **Verdict: RR7 better.** Universal modules are easier under RR7's
  Web-Fetch-shaped seam; Next.js imposes a specific cookie-adapter
  shape on `shared/auth/`'s public API. **Not decisive** — preference,
  not requirement, given that `shared/` is a foundation we control and
  can shape to either consumer model.

### 10. Future flexibility

- **Next.js.** Locks `apps/site` into Turbopack-built RSC architecture.
  `shared/` modules using `server-only` / `client-only` markers are
  forward-compatible with RR7's RSC mode if the platform ever
  re-evaluates. `apps/web` (Vite) cannot import Next.js Server
  Components or `next/*` runtime APIs — `shared/` must keep `next/*`
  imports out of any module `apps/web` consumes. Repo-split
  optionality: high. (`from consensus`, [Next.js 16 blog](https://nextjs.org/blog/next-16))
- **RR7.** Same Vite bundler as `apps/web`, same plugin ecosystem.
  Universal modules work in both apps without adapter layers. RSC
  Framework Mode is unstable in 7.14.x but has a documented forward
  path with `@vitejs/plugin-rsc` markers. Repo-split optionality: high.
  (`from docs`, [RR7 RSC](https://reactrouter.com/how-to/react-server-components))
- **Verdict: RR7 better** for bundler continuity. **Not decisive** —
  `apps/web` is not migrating, and the cost of Next.js's bundler
  divergence is contained inside `apps/site`.

## Rationale

The investigation question that opened this phase was: *given that
Next.js is the established Vercel-native React framework, has something
materially better-suited for the Event Platform's
multi-event-landing-page use case emerged that should override the
default?* The research answer is **no**.

The dimensions where RR7 wins (5 — team familiarity, 9 — `shared/`
shape, 10 — future flexibility) are all forms of developer-side
continuity with the existing Vite + React 19 SPA. None of them are
end-user-facing capabilities. At the epic's current stage —
greenfield `apps/site`, small team, the team familiarity ramp is a
one-time cost, the `shared/` shape is a preference about a foundation
layer we control, and the future flexibility argument cuts both ways
(Next.js's RSC stability vs. RR7's bundler continuity) — none rises to
"decisive."

The dimensions where Next.js wins (3 — SSR/SSG ergonomics, 4 — deploy
cost / built-in batteries) are end-user-facing and directly serve the
epic's goals. M3 phase 3.1's SSR meta and unfurl validation (per
[m3-site-rendering.md](/docs/plans/m3-site-rendering.md); the
original 4-phase epic estimate placed this in a since-superseded
phase 3.4) benefits from `generateMetadata`'s typed object and
streaming-metadata bot detection. M4 phase 4.3's launch readiness benefits from `next/og`
for sponsor-logo OG images, `next/image` for sponsor-logo
optimization, and `next/font` for build-time-downloaded webfont
performance. Each of these is non-trivial to reproduce on RR7.

The dimensions where the candidates are at parity (1 — auth, 2 — data
loading, 6 — theme, 7 — cookies, 8 — tests) do not differentiate.

The decision rests on the asymmetry: RR7's wins are developer-side
preferences, Next.js's wins are user-facing capabilities the epic
explicitly targets. Sticking with the established solution is the
correct call when the alternative does not rise to "much more suited."

## Implications For Downstream Milestones

### M0 Phase 0.3 — `apps/site` scaffold and Vercel routing

- Scaffold uses `npx create-next-app@16.2.4` against the App Router.
  TypeScript, Sass, ESLint align with the existing repo conventions.
- Bundler is Turbopack by default. Document the Turbopack vs.
  `apps/web`'s Vite divergence in `docs/dev.md` as part of the scaffold
  PR.
- `vercel.json` rewrite topology lives in a dedicated proxy project at
  the repo root (or in `apps/web`'s existing `vercel.json` if
  `apps/web` becomes the proxy in addition to handling `/admin*`,
  `/auth/callback`, `/`, and the `/event/:slug/game/*` and
  `/event/:slug/admin/*` namespaces). The choice between
  proxy-rewrite-only and Vercel Microfrontends is captured as an open
  question for phase 0.3 to resolve based on routing-feature needs.
- Cookie-boundary verification on the production domain is the
  central acceptance criterion. Phase 0.3 must confirm that a session
  cookie set in `apps/web` (under the production domain, path=`/`) is
  visible to `apps/site` server-rendered routes. This closes the doc
  gap below.

### M1 — Foundation extraction

- **`shared/db/`** ships as a universal module exposing the Supabase
  client factory (parameterized by an auth-cookie adapter), generated
  TypeScript types, and Zod schemas. No framework imports.
- **`shared/auth/`** ships two entry points: a server entry that
  accepts a Next.js-style cookie adapter (or a Web-Fetch
  `Request`/`Headers` adapter for portability) and uses
  `@supabase/ssr`'s `createServerClient`; a client entry that uses
  `createBrowserClient` and ships hooks. The server entry is marked
  with the `server-only` package; the client entry with `client-only`.
- **`shared/urls/`** is universal — pure functions, no runtime imports.
- **`shared/events/`** is universal where possible; lookup helpers that
  perform Supabase reads accept a client argument rather than
  importing one.
- **`shared/styles/`** ships the `Theme` type, the theme registry, and
  CSS-custom-property injection helpers. The server-rendered
  `<ThemeScope>` wrapper is universal (just sets CSS custom
  properties on a `<div>` or `<html>` element); a `'use client'`
  variant is provided only if a runtime theme switch is later needed.

### M3 — Site rendering infrastructure

- `apps/site/events/` modules are TypeScript-imported by
  `app/event/[slug]/page.tsx`. `generateStaticParams` enumerates the
  test events for build-time prerendering; SSR handles dynamic slugs.
- Per-event meta tags use `generateMetadata` with full `openGraph` and
  `twitter` fields. The doc gap on streaming-metadata behavior for
  `facebookexternalhit` should be confirmed during M3 phase 3.1 unfurl
  validation (per
  [m3-site-rendering.md](/docs/plans/m3-site-rendering.md)) rather
  than treated as solved.
- Per-event OG images use `next/og` `ImageResponse` at
  `app/event/[slug]/opengraph-image.tsx`. This was a major factor in
  the decision.
- Cross-app navigation polish (M3 phase 3.3) uses the standard `<a>`
  navigation across the app boundary; in-app navigation uses
  Next.js's `<Link>` inside `apps/site` and the existing pathname
  navigation in `apps/web`.

### M4 — Madrona launch

- `next/font` carries Madrona's typography choice with build-time
  downloaded webfonts and zero layout shift.
- `next/image` carries sponsor logos with on-demand Vercel
  optimization.
- `app/event/madrona/opengraph-image.tsx` produces the Madrona unfurl
  card programmatically, removing a hand-authored asset from the
  launch checklist.

## Open Questions Opened

The following items the documentation could not close. They are
mirrored into [`docs/open-questions.md`](/docs/open-questions.md) in the
same PR that lands this decision.

- **Cookie boundary across path-routed Vercel projects on the same
  production domain.** Vercel's KB does not document this; web-platform
  fundamentals say cookies on `example.com/` are sent regardless of
  which project handles a path, but the interaction with Vercel's
  rewrite/Microfrontends header rewriting is unverified. M0 phase 0.3
  owns end-to-end verification.
- **Cross-app token-refresh visibility.** `apps/web` (Vite SPA)
  refreshes Supabase JWTs via the browser-side `@supabase/supabase-js`
  auto-refresh; `apps/site` (Next.js) refreshes JWTs via a
  `@supabase/ssr` Next.js middleware on each request to `apps/site`.
  Each refresh path writes the auth cookie independently. The risk is
  that one app's refresh is not observable by the other on the next
  cross-app navigation. Phase 0.3 verifies that a token refreshed in
  either app is observable by a subsequent read in the other.
- **Streaming-metadata behavior for HTML-limited bots in production.**
  Next.js auto-detects `facebookexternalhit` and similar; the
  behavioral envelope (which bots, which fields) is not exhaustively
  documented. M3 phase 3.1 owns validation against at least one
  real unfurl client (per
  [m3-site-rendering.md](/docs/plans/m3-site-rendering.md); the
  original 4-phase epic estimate placed unfurl validation in a
  since-superseded phase 3.4).
- **Proxy-rewrite project vs. Vercel Microfrontends as the routing
  model.** The proxy-rewrite path is documented and lower-cost; the
  Microfrontends path is documented and adds CDN-level routing
  observability and per-project deploy independence. M0 phase 0.3
  owns the choice; this decision doc does not pre-commit.

## Risks Accepted

- **Documentation over-promises.** The accepted residual risk of
  documentation-only research. Every claim above carries a source and
  confidence tag; M0 phase 0.3 verifies the load-bearing ones.
- **Turbopack divergence from `apps/web`'s Vite bundler.** A one-time
  ramp cost. Mitigated by `apps/web` and `apps/site` living as separate
  workspace projects with independent build pipelines.
- **`shared/auth/` carries a Next.js-shaped cookie adapter on its
  server entry.** A non-zero adapter cost for any future Vite-shaped
  consumer. Mitigated by also exposing a Web-Fetch
  `Request`/`Headers`-shaped overload that the Next.js entry composes
  on top of, keeping the universal shape the primary public surface.
- **Version drift.** Next.js ships frequently. M0 phase 0.3 may need to
  bump from 16.2.4 within the same major. The version pin in this doc
  is a starting point, not a freeze.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) — parent epic
- [`docs/architecture.md`](/docs/architecture.md) — current SPA shape;
  updated in later milestones
- [`docs/dev.md`](/docs/dev.md) — current contributor workflow; updated
  in M0 phase 0.3 when `npm run build:site` is added
- [`docs/open-questions.md`](/docs/open-questions.md) — log of doc-gap
  questions surfaced by this research
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) — audits
  named in the spike plan
