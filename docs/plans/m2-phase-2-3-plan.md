# M2 Phase 2.3 — `/auth/callback` And `/` Migration To apps/site

## Status

In progress pending prod smoke. Ships under the **two-phase Plan-to-Landed Gate For
Plans That Touch Production Smoke** from
[`docs/testing-tiers.md`](../testing-tiers.md): the implementing PR
merges with Status `In progress pending prod smoke` (the rule's
exact required string, not a paraphrase); a doc-only follow-up
commit flips Status to `Landed` and records the post-release
`Production Admin Smoke` run URL as the durable external evidence.
The gate trigger is the second clause of the rule's trigger —
*"plans that depend on production smoke as final verification."*
2.3 fits cleanly: the existing `Production Admin Smoke` workflow
(`.github/workflows/production-admin-smoke.yml`) exercises
[`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts)
end-to-end through `/auth/callback`. After 2.3 deploys, that
fixture run becomes the load-bearing verification of the
cross-project proxy: the fixture cannot pass unless the proxy
correctly routes `/auth/callback` to the new apps/site route and
the auth cookie lands on apps/web's frontend host. The cross-project
proxy is also unverifiable pre-merge by construction —
[`apps/web/vercel.json`](../../apps/web/vercel.json) destinations
are absolute production URLs
(`https://neighborly-events-site.vercel.app/...`), so any
`vercel dev` run from the workspace root proxies `/auth/callback`
and `/` to the deployed apps/site (still on main, no new routes
yet) rather than to the branch's local Next.js dev server. M1
phase 1.3.2's cookie-boundary verification is the precedent for
the deferral.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md),
Milestone M2, Phase 2.3. Sibling phases: 2.1 RLS broadening + Edge
Function organizer gate — Landed
([`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md)); 2.2 per-event admin
shell — Landed ([`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md)); 2.4
platform admin migration — Proposed; 2.5 `/game/*` URL migration —
Proposed. The epic's M2 row stays `Proposed` until 2.5 also lands.

**No hard dependency on 2.1 or 2.2.** Per
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md) "Sequencing,"
2.3 depends only on M1 (foundation extraction) and could have shipped
in parallel with 2.1 or 2.2. The recommended order puts 2.3 third
because 2.4 inherits the apps/site adapter modules and bootstrap seam
this phase introduces; 2.4 cannot draft against unmerged 2.3 deliverables.

**Single PR (plus the doc-only follow-up that flips Status to
`Landed`).** Branch-test sketch (apps/site: 5 new files + package.json
edit; apps/web: 1 page delete + 4 file edits + SCSS prune; vercel.json:
1 edit; docs: 3 edits; plan Status records the in-progress state):
~3 distinct subsystems (apps/site adapter, apps/web removal,
routing/docs), well under AGENTS.md's >5-subsystem / >300-LOC split
threshold per
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md) "Phase
Planning Sessions." The work is also tightly coupled — flipping the
Vercel proxy and deleting apps/web's route handlers must happen in the
same change to avoid a broken intermediate state.

**Scoping inputs:**
[`scoping/m2-phase-2-3.md`](./scoping/m2-phase-2-3.md) for the file
inventory and cross-app contracts walkthrough;
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md) "Cross-Phase
Decisions" §3 (apps/site auth idiom + bootstrap seam), §4 (local auth
e2e proxy story), §5 (subsume landing shape), and "Settled by default"
(apps/site primary-domain promotion deferred) for the deliberation
behind every cross-phase decision this plan consumes.

## Goal

Migrate the `/auth/callback` magic-link return handler and the bare `/`
landing from apps/web to apps/site as a hard cutover. apps/site becomes
the first non-event-scoped consumer of [shared/auth/](../../shared/auth/).
The new `/auth/callback` is a `'use client'` Next.js page that wraps
the existing role-neutral
[`AuthCallbackPage`](../../shared/auth/AuthCallbackPage.tsx) component;
the new `/` is a static "Neighborly Events" platform landing with a
CTA into apps/site's future `/admin` (still apps/web through 2.4).
[apps/web/vercel.json](../../apps/web/vercel.json) gains explicit
proxy-rewrites for both paths and apps/web's
[LandingPage](../../apps/web/src/pages/LandingPage.tsx) plus its `/`
and `/auth/callback` route branches in
[App.tsx](../../apps/web/src/App.tsx) are removed. After 2.3 lands,
apps/web's only top-level surface is `/admin*` (retired by 2.4).

The phase establishes three durable seams that 2.4 inherits without
contract changes: the apps/site adapter pair
(`apps/site/lib/setupAuth.ts` + `apps/site/lib/supabaseBrowser.ts`),
the bootstrap-providing route group
(`apps/site/app/(authenticated)/layout.tsx` +
`SharedClientBootstrap`), and the proxy-rewrite shape for top-level
URL migration.

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file, not just the file that first
triggered the rule.

- **Single source of `shared/auth/` providers per app.**
  `configureSharedAuth` is called exactly once per app at
  client-boundary mount via `<SharedClientBootstrap>`, and never
  more than once on a given page render. Idempotency follows from
  [`shared/auth/configure.ts`](../../shared/auth/configure.ts): a
  second call overwrites the providers reference (intended for
  tests). The bootstrap component must not reset providers
  conditionally — the call is unconditional, side-effect on every
  client mount, but apps/site's only mount path runs through the
  `(authenticated)` layout group, so the providers are written
  before any consumer (`useAuthSession`, `subscribeToAuthState`,
  `getAuthSession`) reads them.
- **Browser-only `shared/auth/` and `validateNextPath`.** No
  server-side variant of either lands in this phase. The
  `'use client'` boundary is the load-bearing guard — server
  components inside the route group are limited to the layout shell
  itself, which renders `<SharedClientBootstrap>` (a client
  component) and its `children` (whatever page lives at the URL).
  No server component reads `validateNextPath` or any `shared/auth/`
  symbol. `next=` is consumed only at `/auth/callback`, which is a
  client component, so the browser-only constraint never bites.
- **Auth-cookie boundary preserved by the proxy.** The Vercel
  proxy-rewrite from apps/web's frontend domain to apps/site
  preserves the request host so `Set-Cookie` lands on apps/web's
  origin (host-only, no `Domain=`) per
  [`shared/db/client.ts:48-66`](../../shared/db/client.ts#L48). The
  apps/site Next.js handler never sees a different origin from
  apps/web's perspective. Cookie-boundary verification re-runs
  post-deploy because the route handler moved across frameworks
  (the M1 phase 1.3.2 verification pattern is the precedent).
- **No `<ThemeScope>` on apps/site routes outside `/event/:slug/*`.**
  Per the epic's "Theme route scoping" invariant, `/auth/callback`
  and `/` render against apps/site's root-layout Sage Civic
  defaults
  ([`apps/site/app/layout.tsx:46-60`](../../apps/site/app/layout.tsx#L46))
  with no `<ThemeScope>` wrap. Through M3, `getThemeForSlug`
  returns the platform Sage Civic Theme regardless, so the absence
  of a wrap is observably equivalent to a wrap; the rule matters
  for M4 phase 4.1 when per-event Themes register.
- **URL contract progression.** This phase removes `/` and
  `/auth/callback` from apps/web's surface; 2.4 will remove
  `/admin*`; 2.5 will retire the bare-path operator URLs. After
  this phase, apps/web's only top-level route is `/admin*` and
  every `apps/web/vercel.json` entry that mentioned `/auth/:path*`
  or relied on `/` falling through is gone.

## Naming

- New apps/site route-group layout: `apps/site/app/(authenticated)/layout.tsx`.
  Server component; renders `<SharedClientBootstrap>` around its
  `children`. The `(authenticated)` prefix is convention-only — Next.js
  route groups do not appear in URLs per
  [`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`](../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md).
  The load-bearing structure is the layout-scoped bootstrap, not
  the URL prefix. The group covers every apps/site route that
  consumes `shared/auth/` or `shared/events/`; 2.4's `/admin` lives
  inside it.
- New apps/site auth callback page:
  `apps/site/app/(authenticated)/auth/callback/page.tsx`. `'use
  client'` wrapper around the shared
  [`AuthCallbackPage`](../../shared/auth/AuthCallbackPage.tsx)
  component. Lives inside the `(authenticated)` route group so the
  bootstrap runs before `getAuthSession()` /
  `subscribeToAuthState()` execute.
- New apps/site landing: `apps/site/app/page.tsx`. Server component;
  static "Neighborly Events" platform landing with a CTA to `/admin`.
  Lives **outside** the `(authenticated)` group because it consumes
  no `shared/auth/` or `shared/events/` symbol.
- New bootstrap component:
  `apps/site/components/SharedClientBootstrap.tsx`. `'use client'`
  component whose body imports the side-effect `setupAuth` module
  exactly once at module evaluation. Renders `children`. Idempotent
  per [`shared/auth/configure.ts`](../../shared/auth/configure.ts).
- New apps/site Supabase adapter:
  `apps/site/lib/supabaseBrowser.ts`. Next.js-coupled adapter
  mirroring
  [`apps/web/src/lib/supabaseBrowser.ts`](../../apps/web/src/lib/supabaseBrowser.ts);
  reads `process.env.NEXT_PUBLIC_SUPABASE_URL` and
  `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  instead of `import.meta.env.VITE_*`. Owns the singleton
  lifecycle.
- New apps/site auth setup module:
  `apps/site/lib/setupAuth.ts`. Side-effect import calling
  `configureSharedAuth({ getClient, getConfigStatus })` mirroring
  [`apps/web/src/lib/setupAuth.ts`](../../apps/web/src/lib/setupAuth.ts).
- **Not created in 2.3:** `apps/site/lib/setupEvents.ts`. The new
  `/` consumes no `shared/events/` data per the resolved
  landing-shape decision; phase 2.4 owns its creation alongside
  `/admin`'s `listDraftEventSummaries` consumer.

## Contracts

**`apps/site/app/(authenticated)/layout.tsx`.** Server component.
Receives `children: React.ReactNode` and returns
`<SharedClientBootstrap>{children}</SharedClientBootstrap>`. No props
from Next.js besides `children`. No metadata override — the root
layout's metadata applies.

**`apps/site/app/(authenticated)/auth/callback/page.tsx`.**
`'use client'`. Renders
`<AuthCallbackPage onNavigate={navigateAdapter} />` where the adapter
uses document-level `window.location.replace(path)` rather than
`next/navigation`. Verified by:
[`apps/web/vercel.json`](../../apps/web/vercel.json). The
load-bearing `next=/admin` destination remains owned by apps/web
through 2.4, so client-router navigation inside apps/site would try
to resolve `/admin` against the apps/site route tree and bypass the
apps/web Vercel routing layer.
No `searchParams` prop is read — the shared component reads
`window.location.search` per its existing contract
([`shared/auth/AuthCallbackPage.tsx:35-37`](../../shared/auth/AuthCallbackPage.tsx#L35)).
The page exports nothing else.

**`apps/site/app/page.tsx`.** Server component (no `'use client'`).
Static markup: an `<h1>` with the platform name, a one-line
tagline, a primary-action `<a href="/admin">` CTA. Uses semantic
markup (`<main>`, `<section>`, `<a class="primary-cta">`) plus
the small landing styling surface in
[`apps/site/app/globals.css`](../../apps/site/app/globals.css)
described below; no SCSS imports (apps/site is plain CSS); no
client-side state. The "subsume" landing shape from
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
"Cross-Phase Decisions" §5 is intentional: minimum surface,
single CTA, no demo-events list — but minimum-surface ≠
unstyled-default. The CTA is the public-facing platform front
door and must render as a recognizable button, not a
browser-default link.

**`apps/site/app/globals.css` (extension).** Adds three small
selector groups for the landing surface, sibling to the
existing `body` / `h1`–`h6` rules. Token discipline per
[`docs/styling.md`](../styling.md) "Themable vs structural
classification": brand color, typography, and radius come from
`var(--…)` themable tokens already emitted on `<html>` by
[`shared/styles/themeToStyle.ts`](../../shared/styles/themeToStyle.ts);
one-off layout dimensions (page max-width, CTA padding) stay
local raw values rather than introducing a new structural-token
surface in apps/site for one consumer.

- `.landing-shell` — page container. `max-width: 640px`,
  centered, vertical padding to roughly center the hero on
  typical viewports. Single column.
- `.landing-shell h1` (or `.landing-shell .landing-headline`,
  whichever reads cleaner during implementation) — adjusts the
  `<h1>` size to landing-page proportions (root `h1` rule from
  globals.css doesn't size). `font-family` already inherits
  Fraunces via the existing `h1`–`h6` rule.
- `.primary-cta` and `.auth-callback-shell .primary-button` — pill button styling. `background:
  var(--primary)`; `color: var(--white-warm)` (or `#ffffff`
  fallback if `--white-warm` is not exposed by `themeToStyle`
  — verify at implementation time);
  `border-radius: var(--radius-control)`;
  `padding: 12px 20px`; `font-family: var(--font-body)`;
  `font-weight: 600`; `text-decoration: none`; `display:
  inline-block`; `:hover` and `:focus-visible` states using
  `var(--primary)` with `color-mix(...)` shading per the
  pattern in apps/web's
  [`apps/web/src/styles/_admin.scss`](../../apps/web/src/styles/_admin.scss)
  `.primary-button` rule (verify the apps/web pattern at
  implementation time and adapt to plain CSS — apps/site has no
  Sass mixins). The implementer is welcome to use `:focus-visible`
  with the existing `--secondary` brand for the focus ring,
  matching the apps/web focus discipline; if that surfaces a
  contrast question against the primary button background, use
  a `2px` outline at `var(--secondary)` with `2px` offset.

The contract names selectors and intent; the implementer picks
the exact property values that satisfy "recognizable platform
button" without introducing structural-token surface that 2.4
would have to coordinate with.

**`apps/site/components/SharedClientBootstrap.tsx`.**

```ts
'use client'
import "../lib/setupAuth";
export function SharedClientBootstrap({ children }: { children: React.ReactNode }): React.ReactNode
```

The side-effect import runs at module evaluation, before the first
render. `configureSharedAuth` is therefore registered before any
descendant client component reads
[`readSharedAuthProviders`](../../shared/auth/configure.ts). Renders
`children` unmodified.

**`apps/site/lib/supabaseBrowser.ts`.** Mirrors apps/web's adapter
shape ([`apps/web/src/lib/supabaseBrowser.ts`](../../apps/web/src/lib/supabaseBrowser.ts))
with three exports:

- `getSupabaseConfig(): SupabaseConfig` — reads
  `process.env.NEXT_PUBLIC_SUPABASE_URL` and
  `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`,
  trims, returns `{ enabled, supabaseUrl, supabaseClientKey }`.
  No fallback to a legacy anon-key name (apps/web carries one;
  apps/site's surface is new and does not need it).
- `getBrowserSupabaseClient(): SupabaseClient<Database>` — singleton,
  throws via `getMissingSupabaseConfigMessage()` when
  `enabled === false`. SSR / RSC callers are not expected to invoke
  this; the only caller is `<SharedClientBootstrap>`'s downstream
  client surface. The function does not check `typeof window`
  defensively — callers are statically client components.
- `getMissingSupabaseConfigMessage(): string` — returns a fixed
  string in production builds and a longer guidance string in
  development, mirroring apps/web's pattern but referencing the
  `NEXT_PUBLIC_SUPABASE_*` names instead of the `VITE_*` ones.

**`apps/site/lib/setupAuth.ts`.** Module-level side effect that
calls `configureSharedAuth({ getClient, getConfigStatus })` once,
wiring `getClient` to `getBrowserSupabaseClient` and
`getConfigStatus` to a closure over `getSupabaseConfig` /
`getMissingSupabaseConfigMessage`. Mirrors
[`apps/web/src/lib/setupAuth.ts`](../../apps/web/src/lib/setupAuth.ts)
verbatim except for the import paths. No exports.

**`apps/web/vercel.json` rule order (top to bottom).** The full final
rewrites array, in order:

1. `/event/:slug/game` → `/index.html` (apps/web SPA)
2. `/event/:slug/game/:path*` → `/index.html`
3. `/event/:slug/admin` → `/index.html`
4. `/event/:slug/admin/:path*` → `/index.html`
5. `/event/:slug/redeem` → `/index.html` (transitional; retired by 2.5)
6. `/event/:slug/redemptions` → `/index.html` (transitional)
7. `/event/:slug` → `https://neighborly-events-site.vercel.app/event/:slug`
8. `/event/:slug/:path*` → `https://neighborly-events-site.vercel.app/event/:slug/:path*`
9. `/admin/:path*` → `/index.html` (transitional; retired by 2.4)
10. `/event/:path*` → `/index.html` (catch-all; retired alongside 2.5's bare-path retirement)
11. **(new)** `/_next/:path*` → `https://neighborly-events-site.vercel.app/_next/:path*`
12. **(new)** `/auth/callback` → `https://neighborly-events-site.vercel.app/auth/callback`
13. **(new)** `/` → `https://neighborly-events-site.vercel.app/`
14. **(removed)** `/auth/:path*` → `/index.html` *(was rule 11 pre-2.3; the more-specific proxy-rewrite at #12 supersedes the only `/auth/*` URL apps/web ever served, and `/auth/callback` is the only path under `/auth/` the app routes)*

The bare `/` rule (#13) is the first top-level catch-all the rule
stack has shipped. Vercel evaluates rewrites in order with first-match
semantics, so any `/admin*`, `/event/*`, or `/auth/*` URL hits a
specific rule above #13 before falling through to the bare-path proxy.
The plan locks this exact order; the validation gate exercises every
ownership combination on the deployed origin.

Rule #11 (`/_next/:path*`) is the load-bearing proxy for Next.js's
asset path. apps/site's HTML responses reference
`/_next/static/chunks/...js`, `/_next/static/css/...css`, and
`/_next/static/media/...` (the latter served by `next/font` for
Inter + Fraunces, per
[`apps/site/app/layout.tsx:3`](../../apps/site/app/layout.tsx#L3)).
Without this rule, asset requests hit apps/web's static dist (a Vite
SPA with no `/_next/` directory) and 404, breaking hydration on the
`'use client'` `/auth/callback` route — the magic-link round-trip
silently fails because `AuthCallbackPage`'s `useEffect` never runs to
read `window.location.hash` and exchange the implicit-flow token. The
existing `/event/<slug>` placeholder happens to survive without the
rule today because it is a server component with no client
interactivity, but is fragile to any future M3 client-component or
CSS-via-globals change. Position is between rules #10 and #12 to keep
the apps/site asset proxy adjacent to the apps/site HTML proxies it
supports; correctness does not depend on position because no other
rule competes for `/_next/...`.

## Cross-Cutting Invariants Touched

Beyond the per-phase invariants in the section above, the following
epic-level invariants apply:

- **Auth integration.** Verified by:
  [`shared/auth/configure.ts:35`](../../shared/auth/configure.ts#L35).
  apps/site's adapter pair is the second consumer (after apps/web)
  to call `configureSharedAuth`; the function's overwrite-on-second-call
  semantics are intended.
- **URL contract.** Verified by:
  [`apps/web/vercel.json`](../../apps/web/vercel.json). 2.3 inverts
  two rules in the apps/web rewrites array; no other URL contract
  changes in this phase.
- **Theme route scoping.** Verified by:
  [`apps/site/app/layout.tsx:46-60`](../../apps/site/app/layout.tsx#L46).
  Both new apps/site routes inherit the platform Sage Civic Theme
  via inline-style on `<html>`; neither wraps in `<ThemeScope>`.
- **Deferred ThemeScope wiring.** Not exercised. Both new routes
  are non-event-scoped.
- **Trust boundary.** Verified by:
  [`shared/db/client.ts:48-66`](../../shared/db/client.ts#L48). Auth
  cookies stay on apps/web's frontend host because the proxy-rewrite
  preserves the request host (no `Domain=` attribute is set on the
  cookie). The cookie-boundary verification re-runs post-deploy.
- **In-place auth.** Verified by: the new `/auth/callback` is the
  only auth-distinct URL and remains a client component reading the
  URL hash; no `/signin` page is introduced.
- **Per-event customization.** Not exercised. No per-event TypeScript
  or Theme code changes in this phase.
- **Token bucket discipline.** Verified by:
  [`docs/styling.md`](../styling.md) "Themable vs structural
  classification." The
  [`apps/site/app/globals.css`](../../apps/site/app/globals.css)
  extension consumes themable tokens (`--primary`, `--font-body`,
  `--radius-control`, `--secondary`) via `var(--…)`; structural
  tokens (status palette, spacing scale) are not introduced in
  apps/site because the landing surface has no consumer for them
  and a per-app structural-token system would be unjustified
  surface for one page.

## Files to touch — new

- `apps/site/app/(authenticated)/layout.tsx` — server component;
  renders `<SharedClientBootstrap>{children}</SharedClientBootstrap>`.
  No metadata override; root layout's metadata applies.
- `apps/site/app/(authenticated)/auth/callback/page.tsx` —
  `'use client'`. Default-exports the page component. Calls
  `window.location.replace(path)` from a stable `onNavigate`
  adapter, renders `<AuthCallbackPage onNavigate={onNavigate} />`.
  No `searchParams` prop — the shared component reads
  `window.location.search` directly. Do not use
  `next/navigation` here: cross-project destinations such as
  `/admin` must re-enter Vercel's routing table instead of staying
  inside apps/site's client router.
- `apps/site/app/page.tsx` — server component; static markup for
  the new `/`. Headings, one-line tagline, primary-action link
  to `/admin` carrying the `.primary-cta` class defined in the
  globals.css extension below. No client-state, no data fetching.
  Lives **outside** the `(authenticated)` route group because it
  consumes no `shared/auth/` or `shared/events/` symbol.
- `apps/site/components/SharedClientBootstrap.tsx` — `'use client'`.
  `import "../lib/setupAuth";` at the top of the file (after the
  `'use client'` directive); exports a single named component
  `SharedClientBootstrap` that returns its `children` unmodified.
- `apps/site/lib/supabaseBrowser.ts` — Next.js-coupled adapter per
  the contract above. Exports
  `{ getSupabaseConfig, getBrowserSupabaseClient,
  getMissingSupabaseConfigMessage }`.
- `apps/site/lib/setupAuth.ts` — module-level side effect calling
  `configureSharedAuth(...)` per the contract above. No exports.

## Files to touch — modify

- [`apps/site/app/globals.css`](../../apps/site/app/globals.css)
  — extend with `.landing-shell` (page container with
  `max-width` + centering + vertical padding), a `.landing-shell h1`
  size override, `.auth-callback-shell` layout, shared auth-copy
  selectors (`.signin-stack`, `.section-heading`, `.eyebrow`), and
  `.primary-cta` / `.auth-callback-shell .primary-button`
  pill-button rules per the
  Contracts section. All themable values via `var(--…)`
  (`--primary`, `--font-body`, `--radius-control`, `--secondary`
  for the focus ring); raw values for one-off layout dimensions.
  Existing `body` / `h1`–`h6` rules unchanged. Sibling additions
  only — no rewriting of existing selectors. Per
  [`docs/styling.md`](../styling.md) "Themable vs structural
  classification": brand color/typography/radius are themable
  (CSS custom properties); the one-off layout dimensions stay
  local because introducing a structural-token surface in
  apps/site for one consumer would be unjustified per
  [`AGENTS.md`](../../AGENTS.md) "Styling Token Discipline."
- [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx) — drop the
  `pathname === routes.authCallback` and `pathname === routes.home`
  branches, drop the `AuthCallbackPage` import line, drop the
  `LandingPage` import line. The `routes.home` still exists in
  [`shared/urls/routes.ts`](../../shared/urls/routes.ts) (as
  `validateNextPath`'s default fallback) and is not removed.
- [`apps/web/src/usePathnameNavigation.ts`](../../apps/web/src/usePathnameNavigation.ts)
  — route `routes.home` through document-level navigation
  (`window.location.assign` / `replace`) instead of SPA
  `history.pushState`. Existing apps/web affordances that navigate
  home must leave the SPA after `/` moves to apps/site. Keep
  surviving apps/web paths on the existing history-based navigation
  path.
- [`apps/web/src/auth/index.ts`](../../apps/web/src/auth/index.ts)
  — remove the `AuthCallbackPage` and `AuthCallbackPageProps`
  re-exports (lines 9 and 13 in the current file). Keep
  `SignInForm`, `SignInFormCopy`, `SignInFormProps`,
  `useAuthSession`, `AuthSessionState`, `MagicLinkState` re-exports
  intact — apps/web still has consumers for all of them.
- [`apps/web/src/pages/LandingPage.tsx`](../../apps/web/src/pages/LandingPage.tsx)
  — delete.
- [`tests/web/App.test.tsx`](../../tests/web/App.test.tsx) — remove
  the `vi.mock("../../apps/web/src/pages/LandingPage.tsx", ...)`
  block (lines 13–15). The file has no test case asserting on
  `routes.home` or `routes.authCallback` rendering today, so no
  test cases need modification — just the dead mock.
- [`tests/web/pages/LandingPage.test.tsx`](../../tests/web/pages/LandingPage.test.tsx)
  — delete (sole consumer is the deleted page).
- [`tests/web/usePathnameNavigation.test.ts`](../../tests/web/usePathnameNavigation.test.ts)
  — add coverage that home navigation uses document-level navigation
  and does not update SPA history.
- [`apps/web/src/styles/_landing.scss`](../../apps/web/src/styles/_landing.scss)
  — delete the entire file. Verified zero non-LandingPage
  consumers for: `.landing-hero`, `.hero-copy`, `.hero-body`,
  `.hero-actions`, `.feature-grid`, `.feature-card`, `.flow-grid`,
  `.flow-step`, `.landing-flow`, `.sample-games-panel`,
  `.sample-games-list`, `.sample-game-row`, `.sample-game-copy`,
  `.sample-game-heading`, `.sample-game-button`. The `.sample-nav`
  and `.sponsor-label` selectors live in **other** partials
  (`_responsive.scss` for `.sample-nav` mobile; `_responsive.scss`
  again for `.sample-game-row` mobile padding) and survive the
  deletion. `_landing.scss` itself defines no surviving selector.
- [`apps/web/src/styles/_layout.scss`](../../apps/web/src/styles/_layout.scss)
  — drop `.landing-layout` from the comma-list at lines 31–34
  and from the standalone block at lines 39–42. The remaining
  list keeps `.admin-layout`, `.game-layout`, `.not-found-layout`.
  Confirmed by grep: zero non-LandingPage consumers of
  `.landing-layout`.
- [`apps/web/src/styles/_responsive.scss`](../../apps/web/src/styles/_responsive.scss)
  — drop `.landing-hero`, `.feature-grid`, `.flow-grid` from the
  `@media (max-width: 860px)` rule at lines 4–7 (the rule
  collapses; if no other selectors join it the entire `@media`
  block deletes). Drop `.sample-game-row` from the
  `@media (max-width: 640px)` block at lines 36–38. Keep
  `.sample-nav` in the same media block (consumed by 5 surviving
  pages: AdminPageShell, EventAdminPage, EventRedemptionsPage,
  EventRedeemPage, GamePage, GameRoutePage).
- [`apps/web/src/styles.scss`](../../apps/web/src/styles.scss) —
  remove the `@use "./styles/landing";` (or equivalent
  `@use "./landing";` / `@import` whichever the entrypoint uses;
  confirm at implementation time) line that pulls
  `_landing.scss` into the build.
- [`apps/web/vercel.json`](../../apps/web/vercel.json) — replace the
  current 11-rule rewrites array with the 13-rule final array
  specified in the Contracts section above. Concretely: remove the
  existing `/auth/:path*` SPA rewrite, append three new
  proxy-rewrites for `/_next/:path*`, `/auth/callback`, and `/` to
  `https://neighborly-events-site.vercel.app/...` at the bottom of
  the array, in that order. The `/_next/:path*` rule is load-bearing
  for hydration of the apps/site `'use client'` `/auth/callback`
  route — without it, asset requests fall through to apps/web's
  static dist and break magic-link sign-in end-to-end.
- [`tests/e2e/mobile-smoke.spec.ts`](../../tests/e2e/mobile-smoke.spec.ts)
  — start the featured attendee flow at `/event/first-sample/game`
  instead of the removed apps/web landing CTA.
- [`scripts/ui-review/capture-ui-review.cjs`](../../scripts/ui-review/capture-ui-review.cjs)
  — remove apps/web landing captures and start the featured-flow
  capture directly at `/event/first-sample/game`. The apps/site
  landing is verified manually in this phase.
- [`apps/site/package.json`](../../apps/site/package.json) — add
  exact-pinned `@supabase/ssr@0.10.0` and `@supabase/supabase-js`
  matching apps/web's resolved version (currently `2.101.1` per
  the workspace lockfile; pin to that exact version, not the `^`
  range apps/web carries — apps/site is greenfield and per
  [`AGENTS.md`](../../AGENTS.md) "Versioning And Dependency
  Discipline" should pin reproducibly). Run
  `npm install --workspace @neighborly/site` after the edit so
  the workspace lockfile resolves correctly. Verify post-install
  that the same `@supabase/supabase-js` version is hoisted to the
  workspace root for both apps (the existing dedup behavior
  should hold; if it doesn't, pin both apps to the exact same
  string).
- [`shared/db/client.ts`](../../shared/db/client.ts) — drop the
  outdated parenthetical at line 64
  (`apps/site's future createServerClient (M2 phase 2.3) will read`).
  Phase 2.3 lands `createBrowserClient`-shaped consumption (not
  `createServerClient`); the comment no longer reflects intent.
  Replace with a one-line note that 2.3's apps/site adapter
  consumes the same `createBrowserSupabaseClient` factory and
  the same chunked-cookie format on the apps/web origin via the
  Vercel proxy.
- [`shared/urls/README.md`](../../shared/urls/README.md) — at
  lines 32–36 (the parenthetical mentioning a future server-side
  `validateNextPath` seam for 2.3's `/auth/callback`), drop the
  conditional clause. 2.3 closes the question with **no seam**
  per the scoping doc's "Closed: server-side `validateNextPath`
  seam not needed."
- [`docs/dev.md`](../dev.md):
  - Line 225 (the parenthetical "Server-side `next` validation
    lands as a separate seam if and when M2 phase 2.3's
    `/auth/callback` migration to apps/site needs it") — replace
    with a one-line statement that 2.3 confirmed no server-side
    seam is needed.
  - Line 253 (the line "The apps/site adapter lands in M2 phase
    2.3") — replace with a description of the apps/site adapter
    pair (`apps/site/lib/supabaseBrowser.ts` +
    `apps/site/lib/setupAuth.ts`) and the bootstrap pattern
    (`<SharedClientBootstrap>` inside an `(authenticated)` route
    group), mirroring the apps/web adapter description above it.
  - Line 300 (the `apps/site's future createServerClient (M2 phase
    2.3) will read` parenthetical) — match the
    `shared/db/client.ts` edit above; rewrite to describe the
    actually-shipped browser-client pattern.
  - Lines 791–807 ("Vercel two-project monorepo layout" —
    rule precedence walk) — update rule 5 to reflect that
    `/auth/callback` and `/` are no longer SPA-handled, and add
    the new bottom-of-stack proxy rules for them.
  - Add a new sub-section **"Local-dev story for `/auth/callback`
    e2e fixtures"** under the Vercel layout section, documenting
    the resolution from
    [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
    "Cross-Phase Decisions" §4: most local work continues on
    `npm run dev:web` / `npm run dev:web:local` (or the test
    variant `npm run dev:web:test`), but the three e2e fixtures
    that round-trip through `/auth/callback`
    ([`admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts),
    [`redeem-auth-fixture.ts`](../../tests/e2e/redeem-auth-fixture.ts),
    [`redemptions-auth-fixture.ts`](../../tests/e2e/redemptions-auth-fixture.ts))
    use `scripts/testing/run-auth-e2e-dev-server.cjs` so
    `/` and `/auth/callback` resolve to branch-local apps/site while
    the browser origin remains `127.0.0.1:4173`. Document that the
    proxy maps the apps/web `VITE_SUPABASE_*` env values to apps/site's
    `NEXT_PUBLIC_SUPABASE_*` values and exposes a proxy-owned readiness
    endpoint that waits for both apps/site and apps/web.
  - Add a new sub-section **"apps/site environment variables"**
    documenting `NEXT_PUBLIC_SUPABASE_URL` and
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` as the two
    new env vars the apps/site Vercel project needs (mirror the
    apps/web `VITE_SUPABASE_*` values), plus the local
    `apps/site/.env.local` file recipe for auth e2e proxy runs.
    The apps/site `.env*` files are ignored by the repo's existing
    `.gitignore`; confirm at implementation time and add an
    apps/site-specific entry only if not already covered.
- [`docs/architecture.md`](../architecture.md) — update URL
  ownership shape: apps/site now owns `/` and `/auth/callback`;
  apps/web's transitional ownership shrinks to `/admin*` (still
  apps/web through 2.4) and the event-scoped namespaces. Add
  the apps/site adapter modules
  (`apps/site/lib/supabaseBrowser.ts`,
  `apps/site/lib/setupAuth.ts`,
  `apps/site/components/SharedClientBootstrap.tsx`) to the layout
  / module-ownership section. Update the Vercel routing topology
  table.
- [`docs/operations.md`](../operations.md) — update the Vercel
  routing description to reflect the new rule order. The
  Supabase Auth dashboard's redirect-URL list does **not** change
  (verified: the URL `/auth/callback` stays the same; only the
  origin domain that resolves it changes — the redirect-URL list
  matches against the apps/web frontend domain, which is still
  the entry point because the proxy-rewrite preserves host).
- [`README.md`](../../README.md) — update the repo overview,
  route ownership summary, and environment setup to include the
  apps/site `/` and `/auth/callback` routes plus the new
  `NEXT_PUBLIC_SUPABASE_*` variables.
- This plan — Status flips from `Proposed` to `In progress pending
  prod smoke` in the implementing PR; a doc-only follow-up commit
  flips Status from `In progress pending prod smoke` to `Landed`
  and records the post-release `Production Admin Smoke` run URL
  per the two-phase Plan-to-Landed Gate from
  [`docs/testing-tiers.md`](../testing-tiers.md). The Status
  string is the rule's exact required label, not a paraphrase.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status table row for 2.3 updates from `not yet drafted`
  to the path of this plan when the plan-drafting commit lands;
  the same row updates to `In progress pending prod smoke` and
  gains a PR link when the implementing PR merges; the same row
  flips to `Landed` in the doc-only follow-up commit.

## Files intentionally not touched

- `supabase/migrations/*` — no SQL change in this phase.
- `supabase/functions/*` — no Edge Function change. The
  `/auth/callback` handler is a frontend route; the Supabase Auth
  endpoint that issues magic-link tokens is dashboard-configured,
  not Edge-Function-served.
- [`shared/auth/AuthCallbackPage.tsx`](../../shared/auth/AuthCallbackPage.tsx)
  / [`configure.ts`](../../shared/auth/configure.ts)
  / [`api.ts`](../../shared/auth/api.ts) — verbatim reuse. The
  `'use client'` wrapper does not modify the shared component;
  the contract was designed for both apps/web and apps/site
  consumption.
- [`shared/urls/routes.ts`](../../shared/urls/routes.ts) /
  [`validateNextPath.ts`](../../shared/urls/validateNextPath.ts) —
  no API change. The matchers and allow-list extensions all
  shipped in earlier phases (M1 phase 1.2, M2 phase 2.2).
- [`shared/db/client.ts`](../../shared/db/client.ts) factory body —
  the `createBrowserSupabaseClient` factory itself is unchanged;
  only the misleading "future createServerClient (M2 phase 2.3)"
  comment is corrected (per the modify list above).
- [`shared/styles/`](../../shared/styles/) and per-event Theme
  registry — no change. Both new routes inherit the existing
  apps/site Sage Civic root-layout defaults.
- [`apps/web/src/lib/supabaseBrowser.ts`](../../apps/web/src/lib/supabaseBrowser.ts)
  / [`setupAuth.ts`](../../apps/web/src/lib/setupAuth.ts) /
  [`setupEvents.ts`](../../apps/web/src/lib/setupEvents.ts) — no
  change. apps/web continues to bootstrap its own providers
  through these modules.
- [`apps/web/src/data/games.ts`](../../apps/web/src/data/games.ts) —
  no change. `featuredGameSlug` retains 5 surviving consumers
  (`NotFoundPage`, `GamePage`, `GameRoutePage`, `gameContentApi`,
  `setupEvents`) after `LandingPage` deletes; no orphan re-export
  results.
- e2e fixtures
  ([`admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts),
  [`redeem-auth-fixture.ts`](../../tests/e2e/redeem-auth-fixture.ts),
  [`redemptions-auth-fixture.ts`](../../tests/e2e/redemptions-auth-fixture.ts))
  — URLs unchanged. The fixtures continue to round-trip through
  `127.0.0.1:4173/auth/callback?next=...`; the resolved auth e2e
  proxy rewrites those URLs to the branch-local apps/site origin
  during local runs without restoring apps/web root or callback routes.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and a feature branch
   (not `main`). Re-read
   [`scoping/m2-phase-2-3.md`](./scoping/m2-phase-2-3.md),
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   "Cross-Phase Decisions" §3-5, and the M1 phase 1.3.2
   cookie-boundary verification record in
   [`docs/plans/shared-auth-foundation.md`](./shared-auth-foundation.md)
   so the post-deploy verification step has a precedent to follow.
2. **Baseline validation.** Run `npm run lint`, `npm test`,
   `npm run test:functions`, `npm run build:web`, and
   `npm run build:site`. All must pass before any edit. Capture a
   `npm run ui:review:capture` snapshot of the existing apps/web
   `/` (LandingPage) and `/auth/callback` (the timeout-state shell
   only — capturing the in-flight state requires a real magic-link
   flow) so the PR description has a before reference.
3. **apps/site adapter pair.** Create
   `apps/site/lib/supabaseBrowser.ts` and `apps/site/lib/setupAuth.ts`
   per the Contracts section. The two files land together; neither
   has a consumer until step 4. Add the exact-pinned
   `@supabase/ssr@0.10.0` and `@supabase/supabase-js@2.101.1` to
   [`apps/site/package.json`](../../apps/site/package.json) in the
   same commit; run `npm install` from the workspace root and
   verify the lockfile updates without dragging apps/web's
   `@supabase/supabase-js` to a different version. Type-check via
   `npm run build:site` confirms the imports resolve.
4. **Bootstrap component + route group layout.** Create
   `apps/site/components/SharedClientBootstrap.tsx` and
   `apps/site/app/(authenticated)/layout.tsx` per the Contracts
   section. The layout has no observable behavior yet (no page
   inside the group); `npm run build:site` confirms the route
   group is structurally valid (it appears in the route manifest
   but matches no URL until a child page lands).
5. **Auth callback page.** Create
   `apps/site/app/(authenticated)/auth/callback/page.tsx` per the
   Contracts section. The page is reachable at
   `/auth/callback` from this commit forward (the route group
   prefix does not appear in URLs). The shared
   `<AuthCallbackPage>` component is rendered with the
   document-navigation adapter. `npm run build:site`
   confirms the route compiles; the route is not yet exercised
   end-to-end because the apps/web vercel.json still SPA-handles
   `/auth/callback`.
6. **Landing page + globals.css extension.** Create
   `apps/site/app/page.tsx` per the Contracts section. Static
   markup; CTA links to `/admin` carrying the `.primary-cta`
   class (still apps/web through 2.4 — the proxy-rewrite
   topology handles the cross-app navigation transparently).
   In the same commit, extend
   [`apps/site/app/globals.css`](../../apps/site/app/globals.css)
   with the `.landing-shell` / `.landing-shell h1` /
   `.primary-cta` selectors per the Contracts section. Verify
   in the local apps/site dev server (`npm run dev:site`) that
   the CTA renders as a recognizable button (Sage Civic
   primary background, rounded corners, no browser-default
   underline) before moving on; a default-link CTA is the
   regression mode this step's styling exists to prevent.
   `npm run build:site` confirms both files compile.
7. **vercel.json proxy flip.** Edit
   [`apps/web/vercel.json`](../../apps/web/vercel.json) per the
   Contracts section: remove the `/auth/:path*` SPA rule, append
   the new `/_next/:path*`, `/auth/callback`, and `/`
   proxy-rewrites at the bottom of the array (in that order).
   The order in the file is the order Vercel evaluates; do not
   reorder existing rules.
8. **apps/web removal.** Delete
   [`apps/web/src/pages/LandingPage.tsx`](../../apps/web/src/pages/LandingPage.tsx)
   and [`tests/web/pages/LandingPage.test.tsx`](../../tests/web/pages/LandingPage.test.tsx).
   Edit [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx) to
   drop the `routes.authCallback` and `routes.home` branches and
   the now-unused `AuthCallbackPage` / `LandingPage` imports.
   Edit [`apps/web/src/auth/index.ts`](../../apps/web/src/auth/index.ts)
   to drop the `AuthCallbackPage` / `AuthCallbackPageProps`
   re-exports. Edit
   [`tests/web/App.test.tsx`](../../tests/web/App.test.tsx) to
   drop the `LandingPage` mock block.
9. **SCSS prune.** Delete
   [`apps/web/src/styles/_landing.scss`](../../apps/web/src/styles/_landing.scss).
   Edit
   [`apps/web/src/styles.scss`](../../apps/web/src/styles.scss) to
   drop the `landing` `@use` line. Edit
   [`apps/web/src/styles/_layout.scss`](../../apps/web/src/styles/_layout.scss)
   to drop `.landing-layout` from the two blocks specified in
   "Files to touch — modify." Edit
   [`apps/web/src/styles/_responsive.scss`](../../apps/web/src/styles/_responsive.scss)
   to drop `.landing-hero` / `.feature-grid` / `.flow-grid` from
   the 860px media block (collapse the rule to its surviving
   selectors, or delete the rule if no selectors survive) and
   drop `.sample-game-row` from the 640px block.
   `npm run build:web` confirms the SCSS still compiles and no
   surviving consumer references a deleted selector.
10. **Comment + README hygiene.** Edit
    [`shared/db/client.ts:64`](../../shared/db/client.ts#L64) and
    [`shared/urls/README.md:32-36`](../../shared/urls/README.md#L32)
    per the modify list — drop the conditional / future-tense
    framing and replace with the as-shipped reality.
11. **Documentation pass.** Edit
    [`docs/dev.md`](../dev.md) per the modify list — five edits:
    line 225, line 253, line 300, the rule-precedence walk
    (lines 791–807), the new "Local-dev story for /auth/callback
    e2e fixtures" sub-section, and the new "apps/site environment
    variables" sub-section. Edit
    [`docs/architecture.md`](../architecture.md) for URL ownership
    + Vercel routing table + apps/site adapter module entries.
    Edit [`docs/operations.md`](../operations.md) for the Vercel
    routing description. Walk the
    [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate"
    triggers: `docs/architecture.md` updates because runtime flow
    + URL ownership shape changed; `docs/operations.md` updates
    because the Vercel routing topology shifted;
    `docs/dev.md` updates because new env vars + a new local-dev
    prerequisite (auth e2e proxy) ships; `docs/product.md` does not
    update (no user-visible capability change — the new `/`
    landing is platform chrome, not a product capability);
    `docs/backlog.md` does not update; `docs/open-questions.md`
    does not update (the post-MVP authoring-ownership entry
    closes with 2.5);
    [`event-platform-epic.md`](./event-platform-epic.md) M2 row
    stays `Proposed` (its flip lands with 2.5).
12. **Validation re-run.** All baseline commands from step 2 must
    still pass. `npm run lint` covers the apps/site source under
    the workspace ESLint config (apps/site's own
    `eslint-config-next` is invoked via the workspace lint
    script's tail). `npm run build:web` and `npm run build:site`
    confirm both apps still compile. `npm test` confirms the
    deleted LandingPage test and the App.test.tsx mock removal
    leave the suite green.
13. **Local apps/site exercise (pre-deploy).** With apps/site env
    vars set in `apps/site/.env.local`, run `npm run dev:site` and
    visit `http://localhost:3000/`. Confirm the new landing
    renders with Sage Civic typography (Fraunces heading, Inter
    body) and the CTA points at `/admin` (which 404s in the
    apps/site dev server because `/admin` is still apps/web —
    that's expected; production resolves it via the proxy-rewrite
    topology in the opposite direction). Visit
    `http://localhost:3000/auth/callback` directly with no hash
    fragment; the shared component should show the "Signing
    you in…" state for 10 seconds, then surface the timeout
    state. The exercise verifies the route renders, the bootstrap
    seam executed (no
    `shared/auth/ used before configureSharedAuth() ran` throw),
    and Next.js's strict-mode double-mount does not break the
    shared component's effect cleanup.
14. **Local Vercel-proxy exercise (rule-order regression check
    only).** Install Vercel CLI if not already present
    (`npm install -g vercel`); link both projects locally with
    `vercel link` per [`docs/dev.md`](../dev.md) "Vercel"
    sub-section. Run `vercel dev` from the workspace root.
    **Scope:** this exercise verifies rule precedence didn't
    break existing routes. It **cannot** validate the new
    apps/site routes end-to-end because
    [`apps/web/vercel.json`](../../apps/web/vercel.json) destinations
    are absolute production URLs
    (`https://neighborly-events-site.vercel.app/...`); the proxy
    hits the deployed apps/site (still on main, no new routes
    yet), not the branch's local Next.js dev server.

    **Identity-fingerprint procedure.** A bare 404 status code
    cannot distinguish "rule fired and deployed apps/site 404'd"
    from "local `vercel dev` no-match returned its own 404" or
    "rewrite is malformed and didn't actually proxy." Establish
    the apps/site response signature first by hitting the deployed
    origin directly with `curl -i`; record which response headers
    distinguish a deployed-Vercel response from a local
    `vercel dev` no-match. Candidate identifying headers from
    Vercel's deployed-response stack (verify empirically — Vercel
    can change them): `server: Vercel`, `x-vercel-id`,
    `x-vercel-cache`. The implementer captures the actual header
    set during the run and pins them in the PR validation
    section as the load-bearing fingerprint, rather than this
    plan committing to a header name that may not exist at
    implementation time.

    Procedure:
    a. **Capture the apps/site fingerprint.** Run
       `curl -i https://neighborly-events-site.vercel.app/`
       and note headers present that are unique to deployed
       Vercel (e.g., `x-vercel-id: ...`,
       `server: Vercel`). This is the response signature any
       proxied-to-deployed-apps/site response should carry.
    b. **Capture the apps/site 404 fingerprint.** Run
       `curl -i https://neighborly-events-site.vercel.app/this-route-does-not-exist`
       and note the 404 response carries the same identifying
       headers. This proves "404 from deployed apps/site" is a
       distinct signature, not just a status code.
    c. **Capture the local-no-match negative control.** Run
       `curl -i http://localhost:<vercel-dev-port>/this-rule-does-not-match-any-vercel-json-rule`
       under `vercel dev`. The response should have *fewer* of
       the deployed-Vercel headers (`vercel dev` is the local
       CLI, not the Vercel CDN, so headers like `x-vercel-id`
       are absent or differently shaped). This is the negative
       fingerprint.
    d. **Walk the new rules with `curl -i` against
       `vercel dev`** and assert each response matches the
       expected fingerprint:
       - `curl -i http://localhost:<vercel-dev-port>/admin`
         → 200 + apps/web SPA HTML (no deployed-Vercel headers
         from apps/site; this is apps/web's SPA fallback served
         by the local `vercel dev`, not a proxy hit). Proves
         rule #9 isn't pre-empted.
       - `curl -i http://localhost:<vercel-dev-port>/event/community-checklist`
         → 200 + body containing the apps/site event placeholder
         markup ("Event placeholder", per
         [`apps/site/app/event/[slug]/page.tsx`](../../apps/site/app/event/[slug]/page.tsx))
         + the apps/site identifying headers from step (a).
         Proves rule #7 still proxies to apps/site.
       - `curl -i http://localhost:<vercel-dev-port>/auth/callback`
         → 404 + the apps/site 404 fingerprint from step (b)
         (same identifying headers + body matching apps/site's
         404 page, *not* matching the negative control from
         step (c)). Proves the new proxy rule fires and reaches
         deployed apps/site (which 404s pre-deploy because the
         new route isn't on main yet) — falsifies "rule
         missing" and "local no-match."
       - `curl -i http://localhost:<vercel-dev-port>/`
         → 404 + apps/site 404 fingerprint, same reasoning as
         `/auth/callback`.

    The **load-bearing pre-merge signal** is that the
    `/auth/callback` and `/` responses carry the apps/site
    fingerprint from step (a)/(b), not the negative control
    fingerprint from step (c). Record the captured header sets
    (apps/site signature + negative control) and the four
    `curl -i` invocations + their observed headers in the PR
    validation section so the assertion is reproducible and
    falsifiable. End-to-end "the new apps/site routes serve the
    right content" remains deferred to step 18.
15. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against the Cross-Cutting Invariants
    above and each Self-Review Audit named below. Apply fixes
    in place; commit review-fix changes separately when that
    clarifies history per
    [`AGENTS.md`](../../AGENTS.md) Review-Fix Rigor.
16. **Plan-to-PR completion gate (in-progress).** Walk every Goal,
    Cross-Cutting Invariant, Validation Gate command, and
    Self-Review Audit named in this plan. Confirm each is either
    satisfied in the implementing PR, deferred in this plan with
    rationale, or marked as a deferred-to-production check that
    the post-release `Production Admin Smoke` run (step 18)
    satisfies. Flip Status from `Proposed` to
    **`In progress pending prod smoke`** in the same PR — the
    rule's exact required string per
    [`docs/testing-tiers.md`](../testing-tiers.md), not a
    paraphrase. The `Landed` flip lands in step 19's doc-only
    follow-up commit.
17. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters
    (suggested: `feat(m2-2.3): migrate /auth/callback and / to apps/site`).
    Validation section lists every command actually run plus the
    step-14 rule-order regression check; explicitly notes that
    cross-project end-to-end verification of the new routes is
    deferred to the post-release `Production Admin Smoke` run
    (step 18) per the two-phase Plan-to-Landed Gate. UX Review:
    include before/after screenshots of `/` (apps/web LandingPage
    → apps/site platform landing), captured by running both dev
    servers in isolation (`npm run dev:web` for the before,
    `npm run dev:site` for the after) — not via `vercel dev`,
    which can't reach the branch's local apps/site for the after
    capture; for `/auth/callback`, capture only the timeout-state
    shell from `npm run dev:site` (the in-flight state requires
    a real magic-link flow and is exercised by the post-deploy
    smoke run, not pre-merge). Remaining Risk: every cross-project
    end-to-end assertion is deferred to the post-release smoke
    run by construction; the apps/site Vercel project must have
    `NEXT_PUBLIC_SUPABASE_URL` and
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` set before
    the deploy succeeds; the doc-only follow-up commit (step 19)
    is the gate that actually flips Status to `Landed`.
18. **Post-release `Production Admin Smoke` run (release-owner
    activity — load-bearing gate).** After the PR merges and
    Vercel deploys both apps to production, the release owner
    triggers (or waits for) the `Production Admin Smoke`
    workflow run per the existing
    [`docs/tracking/production-admin-smoke-tracking.md`](../tracking/production-admin-smoke-tracking.md)
    procedure. The workflow runs
    [`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts)
    end-to-end on the production origin; this is the
    load-bearing verification of the cross-project proxy because
    the fixture cannot pass unless `/auth/callback` is correctly
    routed to the new apps/site route by `apps/web/vercel.json`'s
    proxy rule and the auth cookie lands on apps/web's frontend
    host. The smoke run URL is the durable external evidence the
    Plan-to-Landed Gate requires; the cookie boundary is
    implicitly verified by the fixture passing.

    Optional supplementary spot-check the release owner may
    capture in the deploy comment thread (not the gate; the
    smoke run is the gate):
    - Visit production `/`, `/auth/callback`, `/admin`,
      `/event/community-checklist` directly and note observed
      behavior matches the rule-stack contract (apps/site
      landing renders; `/auth/callback` reaches apps/site;
      apps/web still serves `/admin`; apps/site still serves
      the event placeholder).

    If the smoke run fails, file a focused follow-up rather
    than treating Status as flippable. Step 19 cannot proceed
    without a green smoke run URL to record.
19. **Plan Status follow-up (doc-only commit).** Once the
    `Production Admin Smoke` run from step 18 passes green,
    open a doc-only commit on a follow-up branch that:
    - Flips this plan's Status from `In progress pending prod
      smoke` to `Landed`.
    - Records the smoke run URL inline in the Status section
      as the durable external evidence per
      [`docs/testing-tiers.md`](../testing-tiers.md)'s rule
      ("the run URL is durable external evidence; commit SHAs
      are not recorded because `git log` is authoritative for
      that"). Mirrors the 2.2 plan's "Production verification
      evidence" pattern but with the smoke run URL as the
      load-bearing artifact rather than a hand-written
      observation.
    - Updates
      [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
      Phase Status table row for 2.3 to `Landed` with both PR
      links (the implementing PR and this doc-only follow-up).
    The follow-up commit's PR description references the smoke
    run URL as the source of truth.

## Commit boundaries

Per [`AGENTS.md`](../../AGENTS.md) "Planning Depth," commit slices
named upfront:

1. **apps/site adapter pair + package.json pin.** New
   `apps/site/lib/supabaseBrowser.ts`, `apps/site/lib/setupAuth.ts`,
   the [`apps/site/package.json`](../../apps/site/package.json)
   exact-pin additions, and the workspace lockfile update.
   Single commit; the adapter has no consumer until commit 2.
2. **Bootstrap + route group + auth callback page.**
   `apps/site/components/SharedClientBootstrap.tsx`,
   `apps/site/app/(authenticated)/layout.tsx`, and
   `apps/site/app/(authenticated)/auth/callback/page.tsx`.
   Single commit; the page is reachable from this commit forward
   but the apps/web vercel.json still SPA-handles `/auth/callback`,
   so production behavior is unchanged.
3. **Landing page + globals.css extension.**
   `apps/site/app/page.tsx` and the `.landing-shell` /
   `.landing-shell h1` / `.primary-cta` additions to
   [`apps/site/app/globals.css`](../../apps/site/app/globals.css).
   Single commit; the route is reachable on the apps/site dev
   server from this commit forward and renders with a recognizable
   button-shaped CTA, not a default-browser link.
4. **Vercel proxy flip + apps/web removal.**
   [`apps/web/vercel.json`](../../apps/web/vercel.json) edit, the
   apps/web `LandingPage` deletion, the App.tsx / auth/index.ts
   edits, and the App.test.tsx mock removal. Single commit; this
   is the load-bearing cutover commit. Bisect-friendly: any test
   regression caused by the cutover surfaces in this single commit.
5. **SCSS prune.** `_landing.scss` deletion, `_layout.scss` /
   `_responsive.scss` selector drops, `styles.scss` import
   removal. Single commit; visual regressions to surviving
   pages would surface here in `npm run build:web` failures or
   the Playwright captures.
6. **Comment + README + docs hygiene.** `shared/db/client.ts:64`
   and `shared/urls/README.md` line edits; the
   [`docs/dev.md`](../dev.md) /
   [`docs/architecture.md`](../architecture.md) /
   [`docs/operations.md`](../operations.md) updates; the
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   Phase Status row update to `In progress pending prod smoke`;
   the plan Status flip in this file from `Proposed` to the same
   in-progress state. Single commit. **Not** the `Landed` flip —
   that ships in the step-19 doc-only follow-up commit on a
   separate branch.
7. **Review-fix commits.** As needed during step 15, kept
   distinct from the substantive implementation commits per
   AGENTS Review-Fix Rigor.
8. **Doc-only Status follow-up (separate branch + PR).** Per
   step 19, lands after the post-release `Production Admin Smoke`
   run from step 18 passes green: this plan's Status flips to
   `Landed`, the smoke run URL is recorded inline as the durable
   external evidence,
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   Phase Status row flips to `Landed` and gains both PR links.
   Single commit on a follow-up branch; the implementing PR
   stays at `In progress pending prod smoke` until this commit
   merges.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. The
  `tests/shared/auth/AuthCallbackPage.test.tsx` and
  `tests/shared/urls/validateNextPath.test.ts` suites are
  unchanged (the shared component's contract did not change);
  the only test deletions are the apps/web `LandingPage` test
  file and the App.test.tsx `LandingPage` mock block.
- `npm run test:functions` — pass on baseline; pass on final. No
  Edge Function source change.
- `npm run build:web` — pass on baseline; pass on final.
- `npm run build:site` — pass on baseline; pass on final. The
  build verifies apps/site's TypeScript compiles, the new route
  group resolves, and the new pages do not violate Next.js 16
  conventions (server vs. client component boundaries).
- pgTAP suite — pass on baseline; pass on final via
  `npm run test:db`. No SQL change in this phase; the gate
  confirms 2.1.1's broadened policies still hold.
- Local apps/site exercise per Execution step 13
  (`npm run dev:site`) — load-bearing pre-merge for the
  `'use client'` boundary + bootstrap-seam wiring; proves the
  *new code itself* renders correctly in isolation.
- `vercel dev` rule-order regression check per Execution step 14
  — load-bearing pre-merge for "the new rules don't shadow
  existing routes" *and* "the new proxy rules actually fire and
  reach deployed apps/site (not local-no-match)." This check
  **cannot** validate the new apps/site routes end-to-end because
  [`apps/web/vercel.json`](../../apps/web/vercel.json)'s
  destinations are absolute production URLs; under `vercel dev`
  the proxy hits the deployed apps/site, not the branch's local
  Next.js dev server. The check uses the identity-fingerprint
  procedure in step 14 (capture deployed apps/site response
  headers as the positive signature, capture local
  `vercel dev` no-match response as the negative control, then
  assert each new-rule response matches the positive signature
  via `curl -i`) so a 404 from "rule missing" or "local
  no-match" cannot pass as proof.
- **Post-release `Production Admin Smoke` run per Execution
  step 18 — load-bearing gate, deferred to production by
  construction.** Per
  [`docs/testing-tiers.md`](../testing-tiers.md) "Plan-to-Landed
  Gate For Plans That Touch Production Smoke," 2.3 ships under
  the two-phase gate. The trigger that catches 2.3 is the
  rule's second clause — *"plans that depend on production
  smoke as final verification"* — not the first clause about
  extending smoke assertions (no new fixture lands). The
  existing `Production Admin Smoke` workflow exercises
  [`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts)
  end-to-end through `/auth/callback`; that fixture cannot
  pass post-deploy unless the cross-project proxy correctly
  routes `/auth/callback` to the new apps/site route and the
  auth cookie lands on apps/web's frontend host. The smoke
  run URL is therefore the durable external evidence the rule
  requires; the cookie boundary is implicitly verified by
  fixture passing. The implementing PR merges with Status
  `In progress pending prod smoke`; the doc-only follow-up
  commit (Execution step 19) flips Status to `Landed` after
  the smoke run is green and records the run URL inline.
- Existing e2e fixtures
  ([`admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts),
  [`redeem-auth-fixture.ts`](../../tests/e2e/redeem-auth-fixture.ts),
  [`redemptions-auth-fixture.ts`](../../tests/e2e/redemptions-auth-fixture.ts))
  — must continue to pass. Per the resolved local-dev decision,
  they require the auth e2e proxy for local runs (the URLs themselves
  do not change). The post-deploy
  `Production Admin Smoke` workflow run exercises
  `admin-auth-fixture.ts` against the deployed origin and is
  the Tier 5 verification.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md) and
matched to this phase's diff surfaces.

### Frontend

- **Effect cleanup audit** ([catalog §Effect cleanup audit](../self-review-catalog.md#L287)).
  The `'use client'` page wrapper introduces no new effects of
  its own — it renders the shared `<AuthCallbackPage>` which
  already handles subscribe/unsubscribe, timeout clear, and the
  `isCancelled` flag (verified by:
  [`shared/auth/AuthCallbackPage.tsx:34-111`](../../shared/auth/AuthCallbackPage.tsx#L34)).
  The audit confirms Next.js's strict-mode double-mount does not
  break the shared component's cleanup discipline (the existing
  effect runs on mount, unmount, and re-mount; the
  `hasNavigatedRef` guard plus `safeUnsubscribe` idempotence
  cover the double-mount case).
- **Composed auth predicate per-branch error semantics**
  ([catalog reference per the M2 epic invariants list]). Not
  exercised — 2.3 introduces no new composed-RPC gate.
- **Silent-no-op on missing lookup audit.** The new `/` landing
  has no lookup; the new `/auth/callback` defers all lookup to
  the shared component. The audit confirms the apps/site adapter
  pair surfaces the `getMissingSupabaseConfigMessage()` text
  when `getSupabaseConfig().enabled === false` rather than
  throwing during component render.
- **Token bucket discipline audit** ([`docs/styling.md`](../styling.md)
  "Themable vs structural classification" + AGENTS.md "Styling
  Token Discipline"). The `apps/site/app/globals.css` extension
  consumes themable values exclusively via `var(--…)`
  (brand color, typography, themable radius); raw values appear
  only for one-off layout dimensions where introducing a
  structural-token surface in apps/site would be unjustified
  per the "keep one-off layout values local when a token would
  add indirection without improving readability or future change
  cost" rule. Audit walks: no themable color is hardcoded; no
  status color (`$color-success`, etc.) appears (status palette
  is structural and apps/site has no consumer); the focus-ring
  pattern uses `var(--secondary)` matching the apps/web
  precedent.

### CI & testing infrastructure

- **CLI / tooling pinning audit** ([catalog §CLI / tooling
  pinning audit](../self-review-catalog.md#L331)). The new
  apps/site dependencies (`@supabase/ssr@0.10.0`,
  `@supabase/supabase-js@2.101.1`) are exact-pinned (no `^` or
  `~`) per AGENTS.md "Versioning And Dependency Discipline" and
  per the M2 epic's "CLI / tooling pinning" reference. The
  workspace lockfile updates in the same commit. The
  apps/site/package.json edit is the load-bearing pin record.
- **Rename-aware diff classification** ([catalog
  §Rename-aware diff classification](../self-review-catalog.md#L354)).
  The route handler "moves" cross-app and cross-framework — `git`
  will not detect a rename because the file paths and the runtime
  (Vite/React → Next.js/React) both change. Reviewers classify
  per surface: apps/site grew a new client-component page;
  apps/web shrank by one route plus a SCSS partial. The PR
  description names this so the diff does not read as "apps/site
  grew an unrelated new feature."

### Runbook

- **Readiness-gate truthfulness audit** ([catalog
  §Readiness-gate truthfulness audit](../self-review-catalog.md#L373)).
  The validation gate's "magic-link sign-in works end-to-end"
  claim references the post-release `Production Admin Smoke`
  run from step 18 as the load-bearing verification, not just
  code shape. Pre-merge, the claim reads as "code shape is
  consistent with the cookie-boundary invariant; production
  verification is the post-release smoke run, whose URL is
  recorded in the doc-only follow-up commit per step 19." The
  smoke run URL is the durable external evidence per
  [`docs/testing-tiers.md`](../testing-tiers.md); hand-captured
  observations (URLs walked, cookie name) are supplementary
  context the release owner may add but are not the gate.
- **Platform-auth-gate config audit** ([catalog §Platform-auth-gate
  config audit](../self-review-catalog.md#L446)). Two
  configuration surfaces pair with the new route handler:
  - **Supabase Auth dashboard redirect-URL list.** Verified
    unchanged — the URL `/auth/callback` is unchanged; only the
    framework that resolves it changes. The dashboard's
    redirect-URL list matches against the apps/web frontend
    domain, which remains the entry point because the
    proxy-rewrite preserves host. No dashboard edit is required.
    The PR description names this assertion explicitly.
  - **apps/site Vercel project env vars.**
    `NEXT_PUBLIC_SUPABASE_URL` and
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` must be set
    on the apps/site Vercel project before the deploy succeeds.
    The PR description names these as a deploy-time prerequisite
    the release owner must check.

## Documentation Currency PR Gate

Per [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/architecture.md`](../architecture.md) — URL ownership
  shape; Vercel routing topology; apps/site adapter modules.
- [`docs/operations.md`](../operations.md) — Vercel routing
  description.
- [`docs/dev.md`](../dev.md) — five edits per the modify list:
  three parenthetical conversions (lines 225, 253, 300), the
  rule-precedence walk update, and two new sub-sections
  (apps/site env vars, local auth e2e proxy story for the e2e
  fixtures).
- [`shared/db/client.ts`](../../shared/db/client.ts) inline
  comment at line 64 — corrected from future-tense to as-shipped.
- [`shared/urls/README.md`](../../shared/urls/README.md) lines
  32–36 — conditional clause dropped.
- [`docs/product.md`](../product.md) — no change. The new `/`
  landing is platform chrome, not a product capability change.
- [`docs/open-questions.md`](../open-questions.md) — no change.
  The post-MVP authoring-ownership entry closes with 2.5.
- [`docs/backlog.md`](../backlog.md) — no change. The
  organizer-managed-agent-assignment unblock records with 2.5.
- [`README.md`](../../README.md) — update route ownership and setup
  guidance. The repo-level README names `/`, `/auth/callback`, Vercel
  app ownership, and contributor env vars.
- [`event-platform-epic.md`](./event-platform-epic.md) — M2 row
  stays `Proposed`. Its flip lands with 2.5.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status table row for 2.3 updates from `not yet drafted`
  to the path of this plan when the plan-drafting commit lands;
  the same row updates to `In progress pending prod smoke` (and
  gains a PR link) when the implementing PR merges; the same row
  flips to `Landed` (and gains a second PR link) in the doc-only
  follow-up commit per Execution step 19.
- This plan — Status flips from `Proposed` to `In progress pending
  prod smoke` in the implementing PR; flips to `Landed` in the
  doc-only follow-up commit.

## Out Of Scope

Deliberately excluded from this phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **Server-side `validateNextPath` variant.** Resolved in the
  scoping doc's "Closed: server-side validateNextPath seam not
  needed." `next=` is consumed only at `/auth/callback`, which
  is a `'use client'` component, so the browser-only function
  is sufficient. The conditional clauses in
  [`shared/db/client.ts:64`](../../shared/db/client.ts#L64) and
  [`shared/urls/README.md:32-36`](../../shared/urls/README.md#L32)
  are corrected, not extended into a new seam.
- **`apps/site/lib/setupEvents.ts` adapter.** Resolved in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §5: 2.4 owns its creation alongside
  `/admin`'s `listDraftEventSummaries` consumer. 2.3's `/`
  consumes no `shared/events/` data per the subsumed landing
  shape.
- **apps/site Vercel project primary-domain promotion.** Resolved
  in [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions / Settled by default": defer post-epic
  per [`site-scaffold-and-routing.md`](./site-scaffold-and-routing.md)
  "Primary-project ownership flip." M2 stays on apps/web-primary
  proxy-rewrite.
- **New Tier 5 production smoke fixture.** No new fixture lands
  in this phase — the URL contract for `/auth/callback` is
  unchanged, so the existing `admin-auth-fixture.ts` continues
  to cover it without modification. The two-phase Plan-to-Landed
  Gate **still applies** because the rule's trigger has two
  clauses; 2.3 is caught by the second one ("plans that depend
  on production smoke as final verification"), not the first
  ("plans that extend production smoke assertions"). The
  existing `Production Admin Smoke` run becomes the load-bearing
  verification that the cross-project proxy works end-to-end
  post-deploy. The first clause is correctly out of scope for
  2.3 — only the second clause triggers.
- **Demo-events list on the new `/`.** Resolved in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §5: dropped from `/` per the
  "subsume" landing shape. Demo events remain reachable via
  direct URL (`/event/<slug>/game`).
- **`featuredGameSlug` re-export removal.** Verified unnecessary:
  5 surviving consumers exist after `LandingPage` deletes
  (`NotFoundPage`, `GamePage`, `GameRoutePage`, `gameContentApi`,
  `setupEvents`). The scoping doc's risk note about
  `featuredGameSlug` orphaning is dropped during plan-drafting
  because grep refuted it.
- **Per-event Theme registration.** Deferred to M4 phase 4.1 per
  the epic's "Deferred ThemeScope wiring" invariant. Both new
  apps/site routes are non-event-scoped, so no `<ThemeScope>`
  wrap arises in this phase.

## Risk Register

- **Cross-project proxy unverifiable pre-merge.**
  [`apps/web/vercel.json`](../../apps/web/vercel.json) destinations
  are absolute production URLs
  (`https://neighborly-events-site.vercel.app/...`), so any local
  `vercel dev` run proxies `/auth/callback` and `/` to the
  *deployed* apps/site (still on main, no new routes), not to the
  branch's local Next.js dev server. End-to-end verification of
  the new routes through the proxy can only happen post-deploy.
  Mitigation: 2.3 ships under the two-phase Plan-to-Landed Gate
  from [`docs/testing-tiers.md`](../testing-tiers.md) (caught by
  the rule's second-clause trigger, "plans that depend on
  production smoke as final verification"); the implementing PR
  merges with Status `In progress pending prod smoke`; Execution
  step 14 narrows its pre-merge claims to "rule-order regression
  check + identity-fingerprint proof that the new proxy rules
  fire"; the post-release `Production Admin Smoke` run (step 18)
  is the load-bearing end-to-end verification; Execution step
  19's doc-only follow-up commit records the smoke run URL and
  flips Status to `Landed`.
- **Vercel rule ordering pre-empts the bare `/` rule.** First
  top-level bare-path proxy-rewrite the rule stack has shipped;
  misordering would send every unmatched apps/web request to
  apps/site (sending `/admin` to apps/site's 404 page). Mitigation:
  the Contracts section locks the exact 13-rule ordered array;
  Execution step 14's `vercel dev` rule-order regression check
  catches misorder of *existing* routes pre-merge (e.g., `/admin`
  no longer reaching apps/web SPA) and uses the identity-fingerprint
  procedure to confirm the new bottom rules actually proxy (rather
  than falling through to a local-no-match 404 that would also
  surface as a 404 status code); Execution step 18's post-deploy
  walk is the load-bearing verification for the new rules'
  end-to-end behavior.
- **Identity-fingerprint headers shift under future Vercel CLI
  upgrades.** Step 14's procedure captures deployed-Vercel
  response headers empirically rather than hardcoding their
  names because Vercel can change them. If a future contributor
  finds the captured set has shifted (e.g., `x-vercel-id`
  renamed or removed), they should re-derive the positive +
  negative fingerprints by repeating step 14 sub-steps (a)–(c)
  before relying on the comparison. Mitigation: step 14
  documents the procedure as "capture, then assert against the
  capture," not "assert against this header name."
- **Cross-app asset proxy must follow the HTML proxy.** When
  apps/web's vercel.json proxies an HTML route to apps/site
  (rules #7-8, #12-13), apps/site's response references
  framework-specific asset paths (`/_next/static/chunks/*.js`,
  `/_next/static/css/*.css`, `/_next/static/media/*` for
  `next/font`). Without a paired `/_next/:path*` proxy, the
  browser requests those paths from apps/web, hits the static
  dist (a Vite SPA with no `/_next/` directory), and 404s. For
  `'use client'` routes like `/auth/callback`, this breaks
  hydration and silently fails the magic-link round-trip. For
  server-only routes the impact is cosmetic (no styles, no
  custom fonts) but still observable. Mitigation: rule #11
  (`/_next/:path*` → apps/site) ships in this phase. The
  pre-existing `/event/<slug>` placeholder (rule #7) survives
  today only because it has no client interactivity; rule #11
  protects it from any future M3 client-component or
  CSS-via-globals change. Plan-process lesson worth recording
  in [`AGENTS.md`](../../AGENTS.md) the next time it updates:
  when narrowing a proxy ruleset, render the consequence in
  *production-emulating* mode (apps/site `next build &&
  next start` plus apps/web `vercel dev` proxying at it), not
  framework-dev mode (`next dev`), because dev servers
  self-serve their own asset paths and hide cross-project gaps.
- **Implicit-flow URL hash lost in server-side handler.**
  Magic-link tokens arrive as `#access_token=...` in the URL
  fragment per
  [`shared/db/client.ts:60-67`](../../shared/db/client.ts#L60);
  only the browser sees them. A future reader unfamiliar with
  implicit flow may try to handle `/auth/callback` server-side
  and silently lose every return. Mitigation: the
  `'use client'` directive at the top of
  `apps/site/app/(authenticated)/auth/callback/page.tsx` is
  load-bearing; the file's first line is the directive plus a
  one-line comment naming why server-side handling cannot work.
- **Auth cookie domain mismatch through proxy.** Cookie is set
  host-only (no `Domain=` attribute, per
  [`shared/db/client.ts:48-66`](../../shared/db/client.ts#L48)).
  If a proxy implementation surprise rewrites the host header,
  `Set-Cookie` would land on the apps/site Vercel hostname
  instead of apps/web's frontend domain and signed-in users
  would appear signed-out on apps/web. Mitigation: the
  post-release `Production Admin Smoke` run (step 18) implicitly
  verifies the cookie boundary because
  [`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts)
  cannot complete its end-to-end magic-link round-trip unless
  the cookie lands on the right host. The M1 phase 1.3.2
  verification record is the precedent.
- **Playwright auth fixtures fail under `npm run dev:web`.** The
  three fixtures hardcoded for `127.0.0.1:4173/auth/callback`
  now require the auth e2e proxy per the resolved local-dev decision.
  Contributors who run them under `dev:web` get a 404 on
  `/auth/callback` because the apps/web SPA fallback no longer
  catches the URL. Mitigation: the new `docs/dev.md`
  sub-section documents the split; the validation step in
  Execution step 14 is named so the implementer hits this
  themselves before merge; the existing fixtures are not
  modified to avoid coupling the local-dev tool requirement
  into Playwright config.
- **`shared/auth` consumed before `configureSharedAuth` runs.**
  Wrong bootstrap-seam choice surfaces as the loud error
  [`shared/auth/configure.ts:46`](../../shared/auth/configure.ts#L46)
  throws — hard fail rather than silent. The `(authenticated)`
  route group + `<SharedClientBootstrap>` design ensures the
  side-effect `setupAuth` import runs at module evaluation
  before any descendant client component reads the providers.
  Mitigation: Execution step 13's local exercise hits the
  failure mode if the bootstrap is misordered; the test is to
  visit `/auth/callback` with no hash and watch for the
  `configureSharedAuth` throw.
- **apps/site env vars unset on Vercel project.** First deploy
  after the PR merges would 500 on `/auth/callback` because
  `getSupabaseConfig()` returns `enabled: false`. Mitigation:
  the PR description names
  `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` as a
  deploy-time prerequisite; the
  `getMissingSupabaseConfigMessage()` text surfaces in the dev
  console with the env var names so a misconfigured deploy is
  diagnosable in 30 seconds; the release owner sets the env
  vars on the apps/site Vercel project before the merge.
- **Doc-currency drift.** Six docs touch in this phase
  ([`docs/architecture.md`](../architecture.md),
  [`docs/operations.md`](../operations.md),
  [`docs/dev.md`](../dev.md),
  [`shared/db/client.ts`](../../shared/db/client.ts) inline,
  [`shared/urls/README.md`](../../shared/urls/README.md), this
  plan). A missed edit silently lies about the as-shipped
  state. Mitigation: Execution step 11 walks every modify-list
  entry as a checklist; the
  [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate"
  walk in step 16 is the second-pass safety net.

## Backlog Impact

- "Organizer-managed agent assignment" stays *unblocked but not
  landed*. 2.3 does not change the unblock recorded by 2.1.1's
  `event_role_assignments` policies; the entry in
  [`docs/backlog.md`](../backlog.md) is updated with M2's terminal
  PR (2.5) per the milestone doc.
- No new backlog items expected from this phase. If the
  post-release `Production Admin Smoke` run surfaces an issue
  with the proxy-rewrite host preservation (the fixture would
  fail on the magic-link round-trip), that becomes a follow-up
  with explicit scope; through the plan-drafting time no such
  issue is anticipated.

## Related Docs

- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M2 paragraph at lines 544–669.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone doc; cross-phase decisions §3-5 + Settled by default
  drive every resolved decision this plan consumes.
- [`scoping/m2-phase-2-3.md`](./scoping/m2-phase-2-3.md) — scoping
  doc this plan compresses; transient (deletes in batch with the
  full M2 plan set per the milestone doc's "Output set"
  paragraph).
- [`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md) — sibling
  Landed plan; structural template for this plan (Status, Goal,
  Cross-Cutting Invariants, Files-to-touch, Execution steps,
  Commit boundaries, Validation Gate, Self-Review Audits, etc.).
- [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) /
  [`m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md) /
  [`m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md) — Landed
  M2 phase 2.1 set; precedent for the plan-doc structure this
  plan inherits.
- [`shared-auth-foundation.md`](./shared-auth-foundation.md) —
  M1 phase 1.3 plan; cookie-boundary verification record from
  1.3.2 is the precedent for Execution step 18.
- [`site-scaffold-and-routing.md`](./site-scaffold-and-routing.md)
  — M0 phase 0.3 plan; original Vercel two-project topology
  decision and the deferred apps/site primary-domain promotion.
- [`docs/testing-tiers.md`](../testing-tiers.md) — Tier 5
  production smoke and the two-phase Plan-to-Landed Gate For
  Plans That Touch Production Smoke; 2.3 ships under this gate
  via the rule's second-clause trigger ("plans that depend on
  production smoke as final verification"), not the first
  clause about extending smoke assertions. See the Status block
  and Validation Gate for the concrete in-progress / Landed flip.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source for the Self-Review Audits section.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules, Plan-to-PR
  Completion Gate, Doc Currency PR Gate, Phase Planning Sessions.
