# Event Platform Epic

## Status

Landed at M3 — M4 deferred 2026-05-01.

## Milestone Status

Update each row when the implementing PR for that milestone merges. Per
AGENTS.md "Plan-to-PR Completion Gate," every implementing PR is responsible
for flipping the corresponding row's status in the same change. Commit
SHAs are not recorded — `git log` is authoritative for navigating from
plan to history.

| Milestone | Status |
| --- | --- |
| M0 — Framework decision and platform skeleton | Landed |
| M1 — Foundation extraction | Landed |
| M2 — Admin restructuring and authorization broadening | Landed |
| M3 — Site rendering infrastructure with test events | Landed |
| M4 — Madrona launch | Deferred |

M0–M3 landed as recorded above; M4 (Madrona launch) was deferred
2026-05-01 to a future sibling epic. The demo-expansion epic intervenes
between this epic and Madrona's relaunch (see
[`epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md));
a future Madrona-launch epic will own the deferred M4 work when its
scoping begins. The top-level Status above is flipped to
`Landed at M3 — M4 deferred` in this PR; closure does not depend on M4.
Reframing of Goal, Why This Epic, Backlog Impact, and Sizing Summary
sections to reflect "epic finished without Madrona" is intentionally out
of scope for the change that recorded the deferral; those sections
remain as historical record of the original plan and a separate
follow-up may revisit them once the demo-expansion or Madrona-launch
epic motivates the rewrite.

## Purpose

This document is the canonical plan for migrating the repo from a single-app
attendee quiz into a multi-app event platform. It covers the architectural
shape of the new platform, the milestone sequence to get there, the
cross-cutting invariants that must hold across the work, and the doc and
backlog impact at each gate.

The epic produces:

- a new SSR/SSG-capable app at `apps/site` for public event landing pages
- a shared library layer at `shared/` consumed by both apps
- a restructured admin namespace separating platform-admin from per-event admin
- a theme injection seam supporting per-event styling
- Madrona Music in the Playfield as the first public event on the platform

The repo, `neighborly-events`, is the platform repo for events whose first
surface is a quiz game. M0 phase 0.1 renamed the repo from
`neighborly-scavenger-game` to its current name to reflect the platform
scope; see [`repo-rename.md`](/docs/plans/repo-rename.md) for the executed contract.

## Why This Epic

The current repo serves a single attendee quiz at `/event/:slug/game`. Madrona
Music in the Playfield needs more than the game — it needs a public event
landing page with schedule, lineup, sponsors, FAQ, and a CTA into the game.
SEO and link-unfurl behavior matter for sponsor visibility and word-of-mouth
sharing. Per-event styling is imminent. The current Vite + React SPA cannot
deliver SSR/SSG without bolt-on plumbing, and adding more product surface to a
single app couples concerns that should diverge.

The epic builds a platform shape that supports many events, multiple authoring
teams, and multi-surface deploys. Madrona is the first customer of the
platform, not its architect.

## Goal

Ship a platform that:

- serves `/event/madrona` as a server-rendered landing page with proper meta
  tags and link-unfurl previews
- renders multiple events with distinct themes through one rendering pipeline,
  demonstrated via test events
- supports per-event admin authoring under `/event/:slug/admin` for any
  organizer of the event
- preserves all existing attendee, agent, and operator flows without behavior
  drift outside the explicit URL migrations named in M2
- positions the codebase for clean repo splits later by establishing tight
  internal boundaries now

## Out Of Scope

This epic does not ship:

- per-event theme content authoring through admin; themes are TypeScript
  modules in this epic and the admin theme editor is post-epic
- sponsor, schedule, lineup, or FAQ data tables and authoring UI; content for
  Madrona and test events is hardcoded TypeScript in this epic
- self-serve event creation by non-root-admin users; root-admin creates
  events and the broad RLS supports the future direction
- organizer-managed agent assignment UI; this lands as a post-epic follow-up
  riding on M2's broad RLS without further authorization work
- marketing or corporate site separate from event-specific pages
- white-label embeddable game widget
- remote staging Supabase project; validation stays on local Supabase plus
  pgTAP plus production through this epic

## Cross-Cutting Invariants

These invariants hold simultaneously at every site the epic touches. They are
the rules self-review must walk against every diff, not only the diff that
first triggered the rule.

**Auth integration.** The only legal way to acquire a Supabase session,
resolve a viewer's role, or initiate sign-in is through `shared/auth/`. No
app instantiates its own Supabase client and no app duplicates role-resolution
logic.

**URL contract.** Within `/event/:slug/`, the `game/*` and `admin/*`
namespaces route to `apps/web`; all other paths under `/event/:slug/` route
to `apps/site`. Outside `/event/:slug/`, `apps/site` owns all top-level
surfaces — `/`, `/admin*`, `/auth/callback`, and any future top-level
routes. `apps/web`'s URL footprint is purely event-scoped; it owns no
non-event-scoped URLs. The transition between today's state (where
`apps/web` owns `/`, `/admin*`, and `/auth/callback`) and the final
contract is staged across M0 (transitional Vercel routing) and M2 (final
migration). Operator URLs migrating into the `/game/*` namespace are
listed in M2 with explicit before/after pairs; no other URL contracts
change in this epic.

**Per-event customization.** Events are configured through data and theme,
not code. Per-event content lives in the shared `EventContent` model and
the theme registry. Per-event custom code is reserved for cases the
content model genuinely cannot express, and requires written justification
before being added. Route templates in `apps/site` render any event from
data; per-event-coded folders are an explicit exception, not the default.

**Theme token discipline.** Themable visual tokens (colors, typography family,
accent radius, hero gradient stops) are exposed as CSS custom properties and
consumed via `var(--token-name)`. Structural tokens (spacing scale,
breakpoints, shadows that do not theme, motion durations, z-index layers)
stay as SCSS variables. Themable tokens are enumerated by the `Theme`
TypeScript type. New visual properties added during the epic are classified
into one or the other; no token is split across both.

**Theme route scoping.** A `<ThemeScope>` wrapper (or framework-equivalent
server-side wrapper) wraps content only on routes under `/event/:slug/*`,
and not on every such route until M4 — see "Deferred ThemeScope wiring"
below. Routes outside the `/event/:slug/*` namespace render against the
host app's `:root` defaults, not against any per-event Theme: apps/site's
`:root` carries the Sage Civic platform palette (M1 phase 1.5.2);
apps/web's `:root` carries today's warm-cream legacy values until M4
phase 4.1. The platform-admin at `/admin` and the demo-overview landing
at `/` are not per-event themed.

**Deferred ThemeScope wiring.** During scoping the apps/web event-route
`<ThemeScope>` wiring and Madrona's `Theme` registration both moved
from M1 phase 1.5.2 to M4 phase 4.1, to avoid a placeholder-Madrona
double pass and align the warm-cream → Madrona visual transition with
the brand launch. As a consequence, between M1 phase 1.5.2 and M4
phase 4.1, apps/web event routes (game, redeem after 2.5's rename,
redemptions after 2.5's rename) render against apps/web's warm-cream
`:root` defaults rather than inside `<ThemeScope>`; per-event admin
from M2 phase 2.2 wraps in `<ThemeScope>` but resolves to the platform
Sage Civic `Theme` for any slug because no per-event `Theme` is
registered until M4. M3 phase 3.2's per-event test Themes therefore
apply only on apps/site, not on apps/web, until M4 lands. This is an
intentional interim state called out in M2 phase 2.2, M2 phase 2.5,
M3 phase 3.3, and M4 phase 4.1.

*Partial closure (2026-05-01).* Demo-expansion epic M1 phase 1.1
wires `<ThemeScope>` into apps/web event-route shells (game,
redeem, redemptions) ahead of the deferred-Madrona schedule, so
the apps/web wrapping infrastructure now ships and resolves
per-event Themes for the test events (`harvest-block-party`,
`riverside-jam`). The invariant remains open for non-test-event
slugs (Madrona) until the future Madrona-launch epic registers a
non-test-event Theme — at which point the wrapping that
demo-expansion M1 ships picks up the new Theme automatically. M4
phase 4.1 below trims its scope accordingly: only Madrona's `Theme`
registration remains; the wrapping is no longer M4 phase 4.1's
deliverable.

**Trust boundary.** Every backend write reachable from a public or
origin-gated endpoint enforces authorization at the database layer (RLS or
constraints), not only at the application layer. M2's broadening of
organizer-scoped writes follows this rule and pgTAP coverage is extended to
prove the new model.

**In-place auth.** Protected routes render their unauthenticated state inline
within the route's themed shell. There is no dedicated `/signin` page.
`/auth/callback` is the only auth-related URL with a distinct path.

## Open Questions Resolved By This Epic

**Post-MVP authoring ownership and permission model**
(`docs/open-questions.md`). Resolved in M2: the platform direction is
self-serve, and organizers have full write access to their event-scoped data
via permissive RLS. The corresponding entry in `docs/open-questions.md` moves
from open to resolved as part of M2's documentation update.

**Event landing route model** (referenced from `docs/open-questions.md` and
`docs/backlog.md`). Resolved by M3 (rendering infrastructure) and M4 (Madrona
content): `/event/:slug` is a server-rendered landing page in `apps/site`.

## Open Questions Newly Opened

The epic does not knowingly open new open questions. Any unresolved decisions
surfaced during execution are logged in `docs/open-questions.md` in the same
PR that surfaces them.

## Milestone Structure

**Phase-level paragraphs below are pre-milestone-planning estimates.**
Per AGENTS.md "Epic Drafting," milestone planning sessions own the
canonical phase shape, validation gate, documentation list, and
self-review audit set for each milestone. The per-milestone paragraphs
below predate the rule (M0/M1/M2) or were written before the milestone
planning session ran (M3/M4); they are preserved as the estimate that
informed each milestone planning session, not as binding specs. Where a
milestone doc exists, that doc is canonical; the epic paragraph is
historical record.

- M0, M1, M2 — landed; per-phase paragraphs are historical record of
  shipped work
- M3 — milestone doc at
  [m3-site-rendering.md](/docs/plans/m3-site-rendering.md) is
  canonical; the M3 paragraphs below are pre-milestone-planning estimate
- M4 — no milestone doc yet; the M4 paragraphs below are estimates
  pending its milestone planning session

### M0 — Framework Decision And Platform Skeleton

**Goal.** Lock the framework choice for `apps/site`, rename the repo to
reflect platform scope, and stand up `apps/site` as a deployable empty shell
with Vercel routing wired for the long-term URL contract. No product
behavior changes during M0.

**Phase 0.1 — Repo rename.**
**Status:** Landed. **Plan:** [`repo-rename.md`](/docs/plans/repo-rename.md).
Rename the GitHub repo from `neighborly-scavenger-game` to
`neighborly-events` and update every current-state textual reference
inside the codebase. PR scope (current-state references actually
present in the repo): root `package.json` `name`, `package-lock.json`
regenerated, `apps/web/index.html` `<title>` and meta description,
`README.md` title and lead paragraph, `supabase/config.toml`
`project_id`, the platform-repo intro line in this plan, this phase's
own paragraph, `docs/plans/release-readiness.md` first paragraph, and
`docs/plans/analytics-strategy.md` Document Role plus End Goal
paragraphs. The GitHub repo rename itself is a `gh repo rename`
operator step executed post-merge. Deliberately preserved with rationale
in [`repo-rename.md`](/docs/plans/repo-rename.md): the `@neighborly/web` workspace
package name (brand prefix kept), the `neighborly` runtime identifier
prefix on cookies, headers, storage keys, env vars, and the
`generate_neighborly_verification_code` DB function (preserving these
keeps the rename behavior-preserving — renaming any of them would be a
session-invalidating migration). No CI workflow file or `AGENTS.md`
change was required (neither file referenced the old repo name).
Historical commit and PR URLs in `docs/self-review-catalog.md` and
`docs/plans/archive/*.md` are out of scope; GitHub auto-redirects them.
No code logic changes. One PR. Executed contract:
[`repo-rename.md`](/docs/plans/repo-rename.md).

**Phase 0.2 — Framework research and decision.**
**Status:** Landed. **Plan:** [`framework-decision.md`](/docs/plans/framework-decision.md).
A bounded two-day documentation- and consensus-based research pass comparing
Next.js App Router and Remix (React Router 7 framework mode) for the
`apps/site` use case. No spike code is built; the investigation relies on
official framework docs, vendor (Supabase, Vercel) integration guides, and
framework-team changelogs/blog posts. The deliverable is a decision doc
landed in `docs/plans/framework-decision.md` covering the candidate
frameworks evaluated, the evaluation criteria (auth integration, Supabase
data loading, SSR/SSG ergonomics, deploy cost, team familiarity, and
secondary dimensions named in the doc), the chosen framework, and the
rationale. Production-reality verification (cookie boundary on the
production domain, etc.) is owned by phase 0.3. One PR (the decision doc).

**Phase 0.3 — `apps/site` scaffold and Vercel routing.**
**Status:** Landed. **Plan:** [`site-scaffold-and-routing.md`](/docs/plans/site-scaffold-and-routing.md).
Stand up `apps/site` as an empty deployable app in the chosen framework.
Configure Vercel as a monorepo project with transitional path-based
rewrite rules. The `apps/web` carve-outs under `/event/:slug/` are full
namespaces, not bare paths: `/event/:slug/game` and `/event/:slug/game/*`
route to `apps/web` (covers the existing bare game route and reserves the
sub-paths the operator URLs migrate into during M2 phase 2.5);
`/event/:slug/admin` and `/event/:slug/admin/*` reserve the future
per-event admin namespace for `apps/web` (route added in M2 phase 2.2).
The existing bare-path operator routes `/event/:slug/redeem` and
`/event/:slug/redemptions` route to `apps/web` until M2 phase 2.5 retires
them. `/event/:slug` and all other paths under `/event/:slug/` route to
`apps/site`. Everything else continues routing to `apps/web` exactly as
today, including `/`, `/admin*`, and `/auth/callback`. The final routing
topology in which `apps/site` also owns `/`, `/admin*`, and `/auth/callback`
is reached in M2 as those surfaces migrate. The skeleton renders a
placeholder page at `/event/:slug` for any slug. **Cookie-boundary
verification originally scoped to this phase was deferred to M1 phase
1.3** — the `neighborly_session` cookie chosen for the gate is set on
the Supabase Edge Function origin, not the apps/web frontend domain,
so the gate cannot pass against the existing code. The verification
inherits into M1 phase 1.3 alongside the Supabase Auth cookie-adapter
migration that introduces a real frontend-origin cookie. See the
plan's "Verification Evidence" subsection. One PR.

**Validation gate.** `npm run lint`, `npm run build:web`, `npm run build:site`,
framework-specific checks. Manual verification that the placeholder renders
at a test slug, that `/event/madrona/game`, `/admin`, and `/auth/callback`
still work, and that sign-in still works end-to-end.

**Documentation.** `README.md` (repo rename and structure overview),
`docs/dev.md` (new validation commands, monorepo structure, Vercel routing
topology), `docs/architecture.md` (top-level summary noting two apps and
shared layer), this plan with M0 status flipped on completion.

**Self-review audits.** From `docs/self-review-catalog.md`:
Rename-aware diff classification (M0 phase 0.1 is a repo rename),
CLI / tooling pinning audit (new framework dependencies introduced in
phase 0.3), Readiness-gate truthfulness audit (cookie-boundary verification
claims in phase 0.3 must match what was actually exercised).

### M1 — Foundation Extraction

**Goal.** Lift cross-cutting concerns from `apps/web` into `shared/` packages
so both apps consume the same primitives. Behavior preserving for `apps/web`;
`apps/site` becomes capable of consuming the foundation.

**Phase 1.1 — `shared/db/`.**
**Plan:** [`shared-db-foundation.md`](/docs/plans/shared-db-foundation.md).
Extract the Supabase client factory, generated TypeScript types for shared
domain shapes (event, draft, organizer/agent role records), and any
existing typed query helpers. `apps/web` migrated to import from
`shared/db/`. No app holds a duplicate Supabase client or duplicate type
definitions. Runtime validation schemas (Zod or equivalent) are not
introduced in this phase; they are a separate decision motivated by
specific runtime-validation gaps (e.g., edge function input validation),
landed as a focused follow-up if and when the need is concrete. Two PRs:
subphase 1.1.1 extracts the env-agnostic client factory into
`shared/db/` and narrows the apps/web adapter to Vite-coupled state
only; subphase 1.1.2 generates the canonical Supabase TypeScript types
and threads them through the existing call sites.

**Phase 1.2 — `shared/urls/`.**
**Status:** Landed. **Plan:** [`shared-urls-foundation.md`](/docs/plans/shared-urls-foundation.md).
Extract the route table, route matchers, and post-auth `next=`
validation into `shared/urls/`. The exported builder object is named
`routes` (the `urls.*` shorthand in earlier drafts of this paragraph
was illustrative, not a contract). The phase ships builder entries
for `routes.home`, `routes.admin`, `routes.adminEvent(id)`,
`routes.eventLanding(slug)`, `routes.eventAdmin(slug)`,
`routes.game(slug)`, `routes.eventRedeem(slug)`,
`routes.eventRedemptions(slug)`, and `routes.authCallback`, plus the
matchers and `normalizePathname` consumed by the apps/web router and
by `validateNextPath`. The operator-route builders keep their
today-shape names (`eventRedeem`/`eventRedemptions`) and today-shape
URLs in this phase; the rename to `gameRedeem`/`gameRedemptions`
lands with the URL change in M2 phase 2.5 so builder name and URL
stay aligned at every gate. The `eventLanding` and `eventAdmin`
builder entries are present for forward-compatibility; their
matchers and `validateNextPath` allow-list entries land with their
consumers (M3 for `eventLanding`, M2 phase 2.2 for `eventAdmin`).
All hardcoded URL strings in `apps/web` source migrated; the e2e
Playwright fixtures retain their literal URL strings as test data
expressing the contract under test. One PR.

**Phase 1.3 — `shared/auth/`.**
**Plan:** [`shared-auth-foundation.md`](/docs/plans/shared-auth-foundation.md).
Two subphases with different risk profiles, each its own PR.

*Subphase 1.3.1 — `shared/auth/` extraction.* Extract the role-neutral
Supabase Auth client wiring (`getAuthSession`, `subscribeToAuthState`,
`requestMagicLink`, `signOut`, `getAccessToken`), the
`useAuthSession` hook, the `AuthCallbackPage` magic-link return
handler, the `SignInForm`, and the associated types from
`apps/web/src/auth/` and `apps/web/src/lib/authApi.ts` into
`shared/auth/`. apps/web migrated to import from `shared/auth/` via
the binding modules at
[`apps/web/src/lib/authApi.ts`](/apps/web/src/lib/authApi.ts) and
[`apps/web/src/auth/index.ts`](/apps/web/src/auth/index.ts).
Behavior-preserving for apps/web; storage stays as `localStorage` in
this subphase. Role-resolution hooks (`useOrganizerForEvent`,
`useIsRootAdmin`) named in earlier drafts of this paragraph **do not
exist as hooks** in apps/web today — role resolution lives inline in
[`apps/web/src/redemptions/authorizeRedemptions.ts`](/apps/web/src/redemptions/authorizeRedemptions.ts)
and
[`apps/web/src/redeem/authorizeRedeem.ts`](/apps/web/src/redeem/authorizeRedeem.ts) —
so 1.3.1 does not create them. M2 phase 2.2 (per-event admin) is the
natural home for `useOrganizerForEvent` when it has a real consumer.

*Subphase 1.3.2 — Cookie adapter, apps/site readout, production
verification.* Adopt `@supabase/ssr`'s `createBrowserClient` inside
`shared/db/client.ts` to migrate Supabase Auth from `localStorage` to
a frontend-origin cookie. Replace the apps/site placeholder's
deferral notice with a native Next.js `cookies()` presence check.
Verify the cookie boundary against production via Tier 5 production
smoke (two-phase Plan-to-Landed per
[`docs/testing-tiers.md`](/docs/testing-tiers.md)).

**Inherited from M0 phase 0.3 (subphase 1.3.2): satisfied.** The
cross-app cookie-boundary verification gate originally scoped to
[`site-scaffold-and-routing.md`](/docs/plans/site-scaffold-and-routing.md)
was deferred when implementation surfaced that phase 0.3's chosen
`neighborly_session` cookie lives on the Supabase Edge Function
origin, not the apps/web frontend domain. Subphase 1.3.2 introduced
the `@supabase/ssr` cookie adapter that sets a real frontend-origin
cookie. The gate verified in two parts on commit
[`5af99f4`](https://github.com/kcrobinson-1/neighborly-events/commit/5af99f4):
the **cookie-write half** via the post-deploy Production Admin Smoke
run ([24949203798](https://github.com/kcrobinson-1/neighborly-events/actions/runs/24949203798))
exercising the magic-link auth round-trip on apps/web's origin, and
the **cookie-read half** via a manual cross-app run that signed in
on apps/web, navigated to `/event/sponsor-spotlight`, and confirmed
apps/site's `cookies()` read the auth cookie through the
proxy-rewrite ("Auth cookie: present"). See
[`shared-auth-foundation.md`](/docs/plans/shared-auth-foundation.md)
"Verification Evidence" for the full record. The apps/site
placeholder's deferral notice (added when M0 flipped Landed) was
replaced with the presence-check readout in 1.3.2; the
`docs/dev.md` cookie-boundary verification procedure documents the
on-demand re-run path against any production origin.

**Phase 1.4 — `shared/events/`.**
**Status:** Landed. **Plan:** [`shared-events-foundation.md`](/docs/plans/shared-events-foundation.md).
Extract event-domain operations into `shared/events/` so both apps consume
the same event-scoped reads, writes, and projections. The actual current
homes of the code being moved:

- read-side projections from `apps/web/src/lib/gameContentApi.ts`:
  `loadPublishedGameBySlug`, `listPublishedGameSummaries`, and the
  associated `PublishedGameSummary` type
- admin reads and writes from `apps/web/src/lib/adminGameApi.ts`:
  `getGameAdminStatus`, `listDraftEventSummaries`, `loadDraftEvent`,
  `loadDraftEventStatus`, `saveDraftEvent`, `generateEventCode`,
  `publishDraftEvent`, `unpublishEvent`, plus the related
  `AdminEventStatus`, `DraftEventSummary`, `DraftEventDetail`,
  `PublishDraftResult`, `UnpublishEventResult`, `SaveDraftEventResult`,
  and `DraftEventStatusSnapshot` types

`GameRoutePage` is a consumer of `loadPublishedGameBySlug`, not an owner;
no extraction work happens there. It keeps importing from
`apps/web/src/lib/gameContentApi.ts` per the binding-module pattern.
The `featuredGameSlug` and prototype-fallback usages of
`shared/game-config/sample-fixtures.ts` stay where they are — those are
fixture concerns, not event-domain logic.

What is **not** extracted in this phase, because the code does not exist
today:

- slug-format validation (no `validateSlug` / `isValidSlug` exists in
  `apps/web/src` or `shared/`; format is enforced by convention and the
  DB column's uniqueness). If a future phase needs a client-side
  validator (M3 phase 3.1 is the most likely caller), it is defined
  there with a real consumer to shape the contract.
- publish-window logic (no scheduled-publish or expiry feature exists in
  code; the only "is published" gate is `published_at IS NOT NULL` on
  PostgREST reads). Scheduled-publish remains post-epic.

Test layout follows the code: the portions of
`tests/web/lib/adminGameApi.test.ts` covering moved reads and writes
relocate to `tests/shared/events/` (split into focused files as the diff
warrants — for example `tests/shared/events/admin.test.ts` for the
admin write surface and `tests/shared/events/published.test.ts` for the
public read surface). Whatever stays in `apps/web/src/lib/` keeps a
correspondingly-trimmed test file or the file is removed if nothing
remains. The existing `vitest.config.ts` include glob
(`tests/**/*.test.{ts,tsx}`) already covers `tests/shared/events/`, so
no config change is required. `apps/web` call sites keep their
existing import paths; `apps/web/src/lib/gameContentApi.ts` and
`apps/web/src/lib/adminGameApi.ts` become thin binding modules that
delegate to `shared/events/`, following the
`apps/web/src/lib/authApi.ts` precedent from phase 1.3.1. Behavior
preserving. One PR.

**Phase 1.5 — `shared/styles/` and theme groundwork.**
**Plan:** [`shared-styles-foundation.md`](/docs/plans/shared-styles-foundation.md).
Two subphases. The earlier draft of this paragraph put Madrona's
placeholder `Theme` and the apps/web event-route `<ThemeScope>` wiring
in 1.5.2; both were deferred to M4 phase 4.1 during scoping to avoid a
"placeholder Madrona = today's values" double pass. 1.5.2 ships pure
infrastructure plus apps/site's platform identity; M4 phase 4.1 lands
Madrona's real `Theme` and wires `<ThemeScope>` into apps/web event
routes as the intentional brand-launch visual transition. Per-event
admin in M2 phase 2.2 and operator-route renames in M2 phase 2.5
inherit the deferred wiring rule and are updated below to match.

*Subphase 1.5.1 — Token audit.* Walk
[`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
and classify every token as **per-event brand themable** (overridable by a
`Theme` object) or **platform-shared structural** (stays as a SCSS
variable). The brand-only skin model is the framing: events configure
brand colors, body and heading font families, accent radii, and hero
gradient stops; status colors, neutral shadows, structural spacing,
motion, and z-index stay platform-shared. Audit also lands the
color-derivation policy — whether `Theme` exposes only brand bases (and
CSS derives tints via `color-mix()`) or enumerates every shade as its
own field. Land a new `docs/styling.md` documenting the classification
table, the derivation policy, the `Theme` model, and the procedure for
adding a new theme. One PR (doc only).

*Subphase 1.5.2 — `shared/styles/` infrastructure and Sage Civic
platform palette.* Migrate themable tokens from SCSS variables to CSS
custom properties on apps/web's `:root`, with default values encoded
byte-identically to today's warm-cream values so apps/web routes render
unchanged. Define the `Theme` type in `shared/styles/`, the platform
`Theme` at `shared/styles/themes/platform.ts` carrying the Sage Civic
values below, an empty per-event registry at `shared/styles/themes/`
(no `madrona.ts` yet — that lands in M4), `getThemeForSlug` returning
the platform Theme for any unregistered slug, and the universal
`<ThemeScope>` React component (no `'use client'`; inline-style
emission of CSS custom properties on a wrapper element, SSR-safe).
Adopt the platform palette as apps/site's root layout visual identity
via `next/font` (Inter body + Fraunces heading) and inline-style
emission on the root element — this is the first apps/site surface
with real visual identity. **Do not wire `<ThemeScope>` into any
apps/web route in this phase**; M2 phase 2.2 is the first apps/web
consumer (per-event admin), M3 phase 3.1 is the first apps/site
consumer (event landing), M4 phase 4.1 wires the existing apps/web
event-route shells. ThemeScope placement in apps/web is centralized in
the [`App.tsx`](/apps/web/src/App.tsx) routing dispatcher — not
per-page — so the M2/M4 wiring sites are symmetric. Component tests at
`tests/shared/styles/` pass synthetic test themes and verify rendered
CSS custom properties change accordingly. `AGENTS.md` "Styling Token
Discipline" section reorganized to introduce themable/structural
classification before the existing "use a token" guidance, pointing at
`docs/styling.md` for the binding table. One PR.

*Sage Civic platform palette (1.5.2 ships these values in
`shared/styles/themes/platform.ts` and apps/site's root layout).*

```
Colors
  bg          #f3f4ee   warm pale sage
  surface     #ffffff   panels
  text        #232a26   charcoal-green
  muted       #5d6862
  primary     #2c5e4f   deep forest
  accent      #c46f3e   rust
  success     #3a7d4d
  border      rgba(35,42,38,0.10)
  hero-start  rgba(243,244,238,1)
  hero-end    rgba(232,236,228,0.96)

Typography (apps/site, via next/font)
  body        Inter (variable)
  heading     Fraunces (variable)

Radii (themable subset)
  panel       16px
  card        12px
  control     10px
  pill        999px (structural — stays as SCSS, not in Theme)
```

apps/web keeps today's `$font-stack` (Avenir Next system stack) and
today's chunky panel/card/control radii through 1.5.2 — they are part
of today's warm-cream apps/web visual that the no-visual-diff gate
preserves. Madrona's M4 `Theme` decides whether to keep or replace
those.

**Validation gate.** `npm run lint`, `npm run build:web`,
`npm run build:site`, full existing test suite passes, no visual diff
on existing apps/web routes verified via UI review capture before/after
in 1.5.2, component tests covering ThemeScope CSS-variable emission
pass. **Production cookie-boundary verification inherited from M0
phase 0.3** was already satisfied in phase 1.3 subphase 1.3.2 against
the real frontend-origin auth cookie (see
[`shared-auth-foundation.md`](/docs/plans/shared-auth-foundation.md) "Verification
Evidence"). The 1.5.2 PR cites that evidence when flipping the M1 row
to `Landed` — no additional cookie-boundary run required because no
1.5 change touches authentication.

**Documentation.** `docs/architecture.md` describes the shared layer and each
package's responsibilities. `docs/styling.md` (new) documents themable vs.
structural tokens and how to add a theme. `AGENTS.md` "Styling Token
Discipline" updated. This plan with M1 status flipped on completion.

**Self-review audits.** From `docs/self-review-catalog.md`:
Rename-aware diff classification (1.5.2 introduces bulk renames from
`$color-…` to `var(--…)` across 13 apps/web SCSS partials; reviewer
attention should land on the small content diffs — the new shared
module, the `:root` block, the apps/site root layout — not on the bulk
renames), Effect cleanup audit (`<ThemeScope>` ships with no effects
in the inline-style approach; if the implementation introduces React
state or effects, cleanup paths must be verified), Readiness-gate
truthfulness audit (the "no visual diff" gate claim must reflect actual
UI-review captures; the inherited cookie-boundary gate citation must
reference 1.3.2's actual evidence run), CLI / tooling pinning audit
(`next/font` is part of `next` but Inter and Fraunces resolve through
`next/font/google` — verify deterministic version pinning per Next.js
16's behavior; any new shared-package dependency introduced is pinned).

### M2 — Admin Restructuring And Authorization Broadening

**Milestone doc.** [`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md)
holds the M2 sequencing, cross-phase invariants, cross-phase
decisions with rejected alternatives, and milestone-level risks.
Per-phase plans live alongside it as they draft. The paragraphs
below remain the canonical phase descriptions inside the epic.

**Goal.** Split the existing `/admin` into platform-admin and per-event
admin, broaden RLS so organizers can write any event-scoped data for their
event, and migrate operator URLs into the `/game/*` namespace.

**Phase 2.1 — Authorization broadening for organizers.**
Resolves the post-MVP authoring-ownership question by broadening
authorization so an organizer (a row in `event_role_assignments` with
`role = 'organizer'` for the event) can read draft and version content
via PostgREST, can save / publish / unpublish / regenerate event codes
for their event via the four authoring Edge Functions, and can insert
and delete assignments for their event via PostgREST (supporting the
post-epic agent-assignment feature). Splits across two sub-phase PRs
to isolate review surfaces: 2.1.1 lands the SQL migration (SELECT
broadening on `game_event_drafts` and `game_event_versions`; SELECT
replacement plus INSERT and DELETE on `event_role_assignments`) and
the pgTAP coverage; 2.1.2 lands the new
`authenticateEventOrganizerOrAdmin` shared helper, the four
authoring-function caller swaps, and the `docs/architecture.md`
update. The mechanism settled during scoping: authoring writes flow
through Edge Functions executing as `service_role` (which bypasses
RLS), so the load-bearing change is the Edge Function gate widening
in 2.1.2; RLS write broadening on the authoring tables is
deliberately not added because PostgreSQL's SELECT-visibility
coupling would silently no-op UPDATE/DELETE for organizers. The
audit-log "rows reflect real state transitions" invariant is
preserved by `GRANT EXECUTE → service_role` on
`publish_game_event_draft()` / `unpublish_game_event()` plus
direct-INSERT denied via RLS — no RPC body changes. pgTAP coverage
proves organizer reads succeed for their event and return zero rows
for other events; agent and unrelated-authenticated reads stay
denied; root-admin retains all powers. See
[m2-admin-restructuring.md](/docs/plans/archive/m2/m2-admin-restructuring.md) "Cross-Phase
Decisions" §1 for the full deliberation. Two PRs.

**Phase 2.2 — Per-event admin route shell in apps/web at `/event/:slug/admin`.**
New route shell at `/event/:slug/admin` in apps/web. Authorization resolved
via `is_organizer_for_event(slug)` OR `is_root_admin()`. Renders the
existing game-content authoring UI (question editor, draft management,
publish/unpublish for the event's draft) inside the event's themed shell
wrapped in `<ThemeScope theme={getThemeForSlug(slug)}>`. Authorization-gated
states render inside the themed shell, preserving in-place auth behavior.
Until M4 phase 4.1 registers Madrona's `Theme` in
`shared/styles/themes/`, `getThemeForSlug` returns the platform Sage
Civic Theme for any slug, so per-event admin renders Sage Civic-themed
for all events through M2 and M3 — this is intentional, not a bug.
M4's PR registers Madrona's Theme and the visual transition to
Madrona's brand for `slug=madrona` happens at that PR's merge. The
existing apps/web `/admin` deep-editor experience remains accessible
during this phase as a redundant entry point, and is removed in phase
2.4 when `/admin` migrates to apps/site. One PR.

**Phase 2.3 — `/auth/callback` and `/` migration to apps/site.**
Migrate `/auth/callback` from apps/web to apps/site as the auth flow
handler in the new framework, validating tokens via `shared/auth/` and
validating the `next=` redirect target via `validateNextPath` from
`shared/urls/`. Migrate `/` from apps/web to apps/site, preserving the
demo-overview content (or a small platform landing page that subsumes
it). Both run against apps/site's Sage Civic `:root` defaults; neither
is event-scoped so neither wraps in `<ThemeScope>`. Vercel routing updated to send these
paths to apps/site. The corresponding apps/web routes are removed. Hard
cutover. One PR.

**Phase 2.4 — Platform admin migration to apps/site at `/admin`.**
Migrate `/admin` from apps/web to apps/site. The new platform admin in
apps/site is the root-admin surface for event lifecycle: inline event list
as one section of the landing page, event creation form, publish/unpublish
controls, and any other platform-level controls currently exposed under
apps/web's `/admin`. Built in the chosen Next.js or Remix conventions
(server/client component split or loader/action model), consuming
`shared/auth/` for authentication, `shared/events/` for event-domain
reads and lifecycle writes (event list, create, publish, unpublish,
status), and `shared/db/` for the underlying Supabase client and
generated types. Renders
against apps/site's Sage Civic `:root` defaults. Vercel routing updated to send `/admin*`
to apps/site. The apps/web `/admin` route is removed in this phase,
completing the platform-admin migration. Deep-editor functionality is no
longer at `/admin`; it lives only at `/event/:slug/admin` in apps/web (from
phase 2.2). Hard cutover. One PR.

**Phase 2.5 — `/game/*` URL migration for operator routes.**
`/event/:slug/redeem` moves to `/event/:slug/game/redeem`.
`/event/:slug/redemptions` moves to `/event/:slug/game/redemptions`.
The migrated route shells are **not** wrapped in `<ThemeScope>` in
this phase — that wrapping was deferred from M1 phase 1.5.2 to M4
phase 4.1 alongside Madrona's `Theme` registration. Phase 2.5 stays a
pure URL migration: file moves, matcher updates, `validateNextPath`
patterns, documentation references. No visual change to the operator
routes; they continue to consume apps/web's `:root` warm-cream values
directly. Vercel rules updated: the now-defunct `/event/:slug/redeem`
and `/event/:slug/redemptions` carve-outs are removed (the migrated
URLs are already covered by the `/event/:slug/game/*` namespace
carve-out established in M0 phase 0.3, so no new namespace rule is
needed). Hard cutover: no backward-compat redirects. One PR.

**Validation gate.** `npm run lint`, `npm run build:web`,
`npm run build:site`, full pgTAP suite, `deno check` on edge functions,
Playwright captures covering organizer authentication and authorization
on the new per-event admin route, Playwright captures covering
root-admin authentication and the platform admin's
event-list/create/lifecycle flows in apps/site, screenshot validation
of routes consistent with the deferred-Madrona rollout: per-event
admin from phase 2.2 wraps in `<ThemeScope>` and renders against the
platform Sage Civic Theme (per-event Themes apply after M4 phase 4.1
registers them); operator routes from phase 2.5 render against
apps/web's `:root` warm-cream defaults (their `<ThemeScope>` wiring is
deferred to M4); the platform admin from phase 2.4 and the migrated
`/` and `/auth/callback` from phase 2.3 render against apps/site's
Sage Civic `:root` defaults. Manual verification that magic-link
sign-in flows through `/auth/callback` in apps/site and lands on the
requested destination across both apps.

**Documentation.** `docs/architecture.md` updated for new trust boundary,
two-app URL ownership shape, and route family.
`docs/operations.md` updated for the new admin URL contract and the final
Vercel routing topology. `docs/open-questions.md` closes the post-MVP
authoring ownership entry. `docs/backlog.md` marks "Organizer-managed
agent assignment" unblocked. `docs/product.md` updates the implemented
capability set. This plan with M2 status flipped on completion.

**Self-review audits.** From `docs/self-review-catalog.md`:
Grant/body contract audit (M2 phase 2.1 RLS changes must align grants and
function-body guards), Privilege-test vacuous-pass audit (pgTAP assertions
in 2.1 must split per-privilege so "all of these are granted" intent is
honestly tested), Legacy-data precheck for constraint tightening (apply if
2.1 tightens any existing CHECK or FK), pgTAP output-format stability audit
(if 2.1 alters pgTAP output formatting), Platform-auth-gate config audit
(applies to phase 2.2's new per-event admin auth gate and phase 2.4's
new platform admin auth gate; each route's allowlist and redirect targets
must match the production auth-gate config), Silent-no-op on missing
lookup audit (event lookup in phase 2.2's per-event admin and phase 2.4's
platform admin event list must surface "event not found" rather than
silently rendering empty shells), Error-surfacing for user-initiated
mutations (admin write paths exposed under the broadened authorization in
phases 2.2 and 2.4 must surface errors honestly), Rename-aware diff
classification (phases 2.3, 2.4, and 2.5 each migrate URLs and rename or
remove route files; the diffs must classify rename-vs-edit so reviewers
see content changes, not move noise), CLI / tooling pinning audit (phase
2.4 introduces apps/site dependencies for the platform admin surface;
those dependencies are pinned).

### M3 — Site Rendering Infrastructure With Test Events

**Milestone doc.** [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
is canonical for M3's phase shape (3 phases, not the 4 estimated below),
phase sequencing, cross-phase invariants, cross-phase decisions, and
milestone-level risks. The phase paragraphs below are the
pre-milestone-planning estimate that informed the milestone session;
the per-phase content described below was reorganized by the milestone
session into the structure recorded in the milestone doc. Per AGENTS.md
"Epic Drafting," consult the milestone doc for the canonical M3 plan;
treat the paragraphs below as historical estimate.

**Goal.** `apps/site` becomes capable of rendering any `/event/:slug` from
data, with multi-theme rendering proven via test events, and SSR/SSG output
verified for unfurl previews.

**Phase 3.1 — Event content data shape and rendering pipeline.**
Define the `EventContent` TypeScript type for hardcoded TS event modules
(title, dates, status, schedule items, lineup entries, sponsor records, FAQ
blocks, CTA copy, theme slug). Implement event content lookup by slug
reading from a `apps/site/events/` directory of TS modules. Build the page
template that renders an `EventContent` object — sections for header,
schedule, lineup, sponsors, FAQ, footer with CTA into game. SSR/SSG output
configured per the framework chosen in M0. One PR.

**Phase 3.2 — Test events with distinct themes.**
Define two or three test events in `apps/site/events/` with placeholder
content and visibly distinct themes registered in `shared/styles/themes/`.
Each test event includes `<meta name="robots" content="noindex">` and a
"demo event for platform testing" disclaimer banner. Test events are
publicly reachable URLs but do not appear on any event-discovery surface.
One PR.

**Phase 3.3 — Cross-app navigation polish.**
Verify and polish cross-app navigation: site CTA buttons that link into
`/event/:slug/game` work without flash or auth disruption; game routes
back to the site's event page work correctly; auth cookie state
preserved across the boundary. **Cross-app theme continuity is not a
phase 3.3 gate** — apps/site routes resolve their per-event Theme via
ThemeScope (registered in M3 phase 3.2's test events), while apps/web
event routes remain on warm-cream `:root` defaults until M4 phase 4.1
wires their ThemeScope per the deferred-Madrona rollout (see the
"Deferred ThemeScope wiring" cross-cutting invariant). The interim
cross-app visual jump on test events is acceptable because test events
are noindex'd with the "demo event for platform testing" disclaimer
banner from phase 3.2; cross-app continuity verification lands at M4
alongside Madrona. One PR.

**Phase 3.4 — SSR/SSG meta tags and unfurl validation.**
Implement per-event meta tags (title, description, og:image, twitter:card)
populated from `EventContent`. Validate by inspecting raw HTML output and by
manual unfurl test in Slack or iMessage on at least one test event. One PR.

**Validation gate.** `npm run lint`, `npm run build:web`,
`npm run build:site`, all existing tests pass, manual rendering check on each
test event slug, manual unfurl check on at least one test event, screenshot
validation of multi-theme rendering across test events.

**Documentation.** `docs/architecture.md` updated for the rendering pipeline
and `apps/site` responsibilities. `README.md` updated for current capabilities
(multi-event rendering, test events as platform validation). This plan with
M3 status flipped on completion.

**Self-review audits.** From `docs/self-review-catalog.md`:
Effect cleanup audit (any effects added in `apps/site` rendering components
must clean up correctly across SSR and client hydration boundaries),
Readiness-gate truthfulness audit (claims in M3's validation gate about
SSR/SSG output and unfurl previews must match what was actually exercised
end-to-end), CLI / tooling pinning audit (any new dependencies introduced
by `apps/site` page rendering or meta-tag handling are pinned).

### M4 — Madrona Launch

**Status.** Deferred 2026-05-01. Madrona launch is moving to its own
future sibling epic; the demo-expansion epic
([`epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md))
intervenes between this epic and Madrona's relaunch. The phase
paragraphs below remain as historical record of the
pre-milestone-planning estimate at the time of deferral; they are not
a canonical plan for Madrona launch. The Madrona-launch epic will
draft fresh content against actually-merged code when its scoping
begins.

**Milestone doc.** Not yet drafted — M4's milestone planning session
runs after M3 lands. Per AGENTS.md "Epic Drafting," the phase
paragraphs below are pre-milestone-planning estimates pending that
session. Phase counts, per-phase content, validation gate, and
documentation list will be re-derived against actually-merged M3 code
when M4 milestone planning begins; the milestone doc that session
produces will be canonical and will supersede the paragraphs below.

**Goal.** Madrona Music in the Playfield goes live as the first public event
on the platform.

**Phase 4.1 — Madrona theme palette definition.**
Hold the Madrona theme discussion as its own task at the start of M4:
pick approximately ten color values, the typography choice, and the
accent treatment for Madrona's brand. Create
`shared/styles/themes/madrona.ts` (the file does not exist before M4 —
M1 phase 1.5.2 deliberately deferred Madrona's `Theme` to this phase to
avoid a placeholder-Madrona double pass) and register it in the
`shared/styles/themes/` registry. **Apps/web event-route ThemeScope
wiring is no longer this phase's deliverable** — demo-expansion epic
M1 phase 1.1 (2026-05-01) shipped the wrap ahead of schedule, so the
`<ThemeScope>` wraps already exist on `GameRoutePage`,
`EventRedeemPage`, `EventRedemptionsPage`, and `EventAdminPage` in
the central [`App.tsx`](/apps/web/src/App.tsx) routing dispatcher.
Once Madrona's registry entry lands, the existing wraps automatically
pick up Madrona's `Theme` for `slug=madrona` — no per-consumer change
required. **This is the brand-launch visual transition**: apps/web
event routes shift from today's warm-cream defaults (the
`getThemeForSlug` fallback for unregistered slugs) to Madrona's real
palette at this PR's merge. UI-review captures cover the warm-cream →
Madrona transition explicitly so the launch visual is signed off
intentionally rather than landing as review surprise. The cross-app
theme-continuity check originally deferred from M3 phase 3.3 was
satisfied for the test events by demo-expansion epic M1 phase 1.1; M4
phase 4.1 extends it to `slug=madrona` with a UI-review pair
confirming that `/event/madrona` (apps/site) and `/event/madrona/game`
(apps/web) render the same Madrona `Theme`. One PR.

**Phase 4.2 — Madrona event content authoring.**
Author Madrona's event content as a TypeScript module at
`apps/site/events/madrona.ts` matching the `EventContent` type defined in
M3: title, dates, schedule, lineup with set times, sponsor list with logos
and links, FAQ, CTA copy, theme slug. Hardcoded for v1; admin-authored
content is post-epic. One PR.

**Phase 4.3 — Launch readiness.**
Non-engineering preparation: volunteer training, QR posters pointing at
`/event/madrona/game` and `/event/madrona`, sponsor logo links verified,
unfurl preview verified for `/event/madrona`, redemption agent assignment
verified, production smoke run against the full Madrona path (landing page →
game → completion → redeem booth flow). Checklist execution; no PR for the
checklist itself.

**Validation gate.** Full Madrona path rendered correctly end-to-end.
Production smoke per `docs/testing-tiers.md` Tier 5 with a Madrona-specific
assertion set. Volunteer dry run completed. Unfurl preview verified in at
least one client.

**Documentation.** `docs/product.md` updated to reflect Madrona launched.
`docs/backlog.md` closes "Event landing page for `/event/:slug`".
`README.md` updated. This plan flipped from `Proposed` to `Landed` in the
final PR. M4 follows the two-phase Plan-to-Landed pattern from
`docs/testing-tiers.md` if the production smoke assertions added in M4
must run post-deploy.

**Self-review audits.** From `docs/self-review-catalog.md`:
Readiness-gate truthfulness audit (production smoke claims for the
Madrona path must reflect runs actually executed against production
after deploy; the warm-cream → Madrona visual transition must be
verified against captured before/after UI-review evidence, not
asserted by code reasoning), Rename-aware diff classification (phase
4.1 wraps existing event-route shells in `<ThemeScope>` in the central
[`App.tsx`](/apps/web/src/App.tsx) dispatcher — the wrap is a
content addition around an unchanged child, not a move), Effect
cleanup audit (any new content components added for Madrona-specific
rendering must clean up correctly). M4 also follows the
Plan-to-Landed Gate For Plans With Post-Release Validation from
`docs/testing-tiers.md` if the production smoke assertions added in M4
must run post-deploy.

## Backlog Impact

Items closed by this epic:

- "Event landing page for `/event/:slug`" — implemented in M3 (infrastructure)
  and M4 (Madrona content)
- "Post-MVP authoring ownership and permission model" — resolved in M2 with
  permissive organizer RLS and the recorded direction toward self-serve

Items unblocked but not landed by this epic:

- "Organizer-managed agent assignment" — feasible after M2 with no RLS work;
  lands as a focused post-epic follow-up

Items added by this epic for post-epic work:

- per-event theme content authoring through admin (Supabase-stored themes
  with admin editor)
- sponsor, schedule, lineup, FAQ data tables and authoring UI
- self-serve event creation
- remote staging Supabase environment

## Documentation Currency PR Gate

Every PR in this epic verifies the relevant doc is updated in the same
change. The complete list of docs that must reflect the implemented state by
epic completion:

- `README.md` — repo name, capabilities, monorepo structure
- `AGENTS.md` — token discipline rule update (M1)
- `docs/architecture.md` — two-app shape, shared layer, theme model, new
  trust boundary, rendering pipeline
- `docs/operations.md` — Vercel routing topology, new admin URL contract
- `docs/product.md` — capability set after each milestone, Madrona launched
- `docs/dev.md` — new validation commands (`npm run build:site`), monorepo
  structure, framework-specific dev workflow
- `docs/open-questions.md` — close authoring ownership entry; log any new
  questions surfaced during execution
- `docs/backlog.md` — close completed items, mark unblocked items, add
  post-epic items
- `docs/styling.md` — new doc; themable vs. structural tokens, theme
  registry, how to add a theme
- `docs/plans/framework-decision.md` — new doc; M0 spike outcome
- This plan — flipped from `Proposed` to `Landed` in the same PR that
  lands M4

## Sizing Summary

Counting rule: phases are counted at the top level only. Subphases are PR
boundaries inside a parent phase, not separate phases. A milestone's phase
count is the count of `Phase X.N` entries in its body; subphases (`Phase
X.N.M`) contribute to the PR count but not the phase count.

**Counts below are pre-milestone-planning estimates for milestones that
have not yet had their milestone planning session.** Per AGENTS.md "Epic
Drafting," each milestone's actual phase count and PR count are
re-derived by its milestone planning session against merged-in code.
M0/M1/M2 counts are historical fact (those milestones landed). M3's
count was re-derived by its milestone session — see
[m3-site-rendering.md](/docs/plans/m3-site-rendering.md) for the
canonical M3 shape. M4's count is pending its own milestone planning
session.

Phases per milestone, with PR counts:

- M0 — 3 phases, 3 PRs (landed)
- M1 — 5 phases (phase 1.1, phase 1.3, and phase 1.5 each contain 2 subphases as separate PRs), 8 PRs (landed)
- M2 — 5 phases, 5 PRs (landed; actually shipped 13 PRs once subphase splits were re-derived during phase planning — see [m2-admin-restructuring.md](/docs/plans/archive/m2/m2-admin-restructuring.md) phase status table)
- M3 — pre-milestone-planning estimate: 4 phases, 4 PRs. Milestone-planning re-derived: 3 phases, 3 PRs (3.1 may split into 2). Canonical: [m3-site-rendering.md](/docs/plans/m3-site-rendering.md)
- M4 — pre-milestone-planning estimate: 3 phases, 2 PRs (phase 4.3 is checklist execution, not a PR). Milestone planning pending.

Epic total: pre-milestone-planning estimate of 20 phases, 22 PRs;
actuals will diverge as each milestone planning session and each phase
planning session re-derive against merged-in code.

The above is written under the assumption "one engineer focused on the epic
with no parallel tracks." Reader scales relative weight from the phase and
PR counts; no engineer-day or t-shirt sizing is assigned.

## Risk Register

**Framework spike outcome.** The M0 spike could surface unexpected friction
with either candidate. If neither feels viable, the spike escalates into a
broader framework re-evaluation rather than forcing a choice under deadline.
Mitigation: the spike is bounded to two days; if it overruns, M0 stops and
the epic re-plans rather than proceeding with an uncomfortable choice.

**Auth cookie boundary across two apps.** Many subtle bugs hide here that
pass in development but fail in production. Mitigation: M0 phase 0.3
explicitly verifies the cookie boundary on the production domain before M1
starts.

**Token audit surface area.** The audit may surface more themable tokens than
expected, expanding M1 phase 1.5. Mitigation: the audit is its own
PR-deliverable subphase 1.5.1, isolated for review attention before code
migration begins.

**Madrona content authoring time.** Real design and copy decisions may take
longer than expected. Mitigation: content lives as hardcoded TS modules in
M4 phase 4.2 rather than blocking on a CMS layer; the engineering surface is
small even if content polish iterates.

**M2 RLS edge cases.** Trust-boundary work tends to surface unanticipated
cases during pgTAP authoring. Mitigation: M2 phase 2.1 lands as its own PR
distinct from the URL migration work so RLS review attention is not
diluted.

**Platform admin framework migration.** Phase 2.4 rebuilds the existing
apps/web `/admin` event list, event creation, and lifecycle controls in
the chosen Next.js or Remix conventions. Subtle behavior differences
(form submission patterns, auth gating semantics, server vs. client
component split, route guard timing) may surface during the migration.
Mitigation: phase 2.4 lands as its own PR distinct from the simpler
`/auth/callback` and `/` migration in phase 2.3 so review attention is
focused on the substantive surface; phase 2.2 (per-event admin in
apps/web) lands first so deep-editor functionality is preserved at
`/event/:slug/admin` before apps/web `/admin` is removed; Playwright
captures cover root-admin flows in the new app before merging; the
in-place auth pattern from `shared/auth/` is verified working on the new
surface during phase 2.4's validation.

## Related Docs

- `AGENTS.md` — agent behavior, planning depth rules, doc currency PR gate,
  validation honesty
- `docs/dev.md` — contributor workflow source of truth
- `docs/architecture.md` — current system shape and trust boundaries
- `docs/product.md` — product overview and definition of success
- `docs/experience.md` — UX targets across attendee, volunteer, and organizer
- `docs/operations.md` — platform configuration ownership
- `docs/open-questions.md` — unresolved decisions
- `docs/backlog.md` — priority-ordered follow-up
- `docs/testing.md` — test strategy and coverage snapshot
- `docs/testing-tiers.md` — testing tiers including production smoke
- `docs/self-review-catalog.md` — named self-review audits per surface
