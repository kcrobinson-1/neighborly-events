# Canonical Origin Resolution — Phase 2 Plan

## Status

In progress pending deployed-origin verification.

This is the durable per-phase plan for Phase 2 of the cross-cutting
plan at [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md).
The transient scoping doc was deleted on land per the
scoping-doc-transience convention; the decisions absorbed into this
plan and the cross-cutting plan's investigations-resolved section.

Per the Plan-to-Landed Gate for plans with post-release validation
([`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
Gate For Plans With Post-Release Validation"), the implementing PR
merges with this intermediate Status; a follow-up doc-only PR flips
to `Landed` after the operator runs the post-deploy validation
checklist (sign-in round-trip, OG-tag origin spot-check, plugin-path
proxy check, preview-alias CORS check) named in the Validation Gate
below. The follow-up PR also flips the cross-cutting plan's Status
to `Landed` in the same commit.

## Context

Phase 2 is the substantive flip of the canonical-origin plan. Today,
the platform routes traffic through bidirectional cross-app proxy
rewrites: [`apps/web/vercel.json`](/apps/web/vercel.json) carries 7
absolute-URL destinations into apps/site (the platform admin, the
auth callback, the platform landing, event-scoped non-game/admin
URLs, and the apps/site asset path); [`apps/site/next.config.ts`](/apps/site/next.config.ts)
carries 5 reverse-direction rewrites for the plugin-owned routes
(`/event/:slug/{game,admin}*`, `/assets/*`). Phase 2 strips the
cross-app proxy rewrites from `apps/web/vercel.json` (preserving the
SPA rewrites and the test-event `X-Robots-Tag` `headers` block at
[`apps/web/vercel.json:59-72`](/apps/web/vercel.json) untouched);
keeps [`apps/site/next.config.ts`](/apps/site/next.config.ts)'s
existing site → plugin rewrites as the canonical routing layer; flips
`NEXT_PUBLIC_SITE_ORIGIN`'s production value from apps/web's primary
alias to apps/site's; updates the Supabase Auth dashboard's redirect-
URL allowlist; updates [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts)
to admit apps/site's preview/branch aliases via the matching
mechanism chosen at scoping time; rewrites the `metadataBase`
resolver's inline prose to explain the apps/site-canonical world;
and lands the doc-currency sweep across `docs/dev.md`,
`docs/architecture.md`, and `apps/site/.env.example` so the repo
describes the post-flip topology rather than today's.

This is **why now**: Phase 1 verified that apps/site origin is
already self-sufficient end-to-end without depending on apps/web's
cross-app rewrites (per Phase 1's Audit Findings); the remaining
Phase 2 work is the topology flip itself plus the prose-currency
sweep that has been accumulating at every cross-cutting-plan
landing. Today's launched-state-zero posture means the cutover is a
single-step structural change rather than a coordinated rollout —
this plan operationalizes the cross-cutting plan for that reality
per Decision 2 of the scoping doc.

**What surfaces this touches** at the conceptual level: the Vercel
routing configuration of both projects, the apps/site root layout's
metadataBase resolver prose, the Edge Function CORS helper, three
operator-managed configurations (apps/site Vercel project's env vars,
the Supabase project's `ALLOWED_ORIGINS` secret, the Supabase Auth
dashboard's redirect-URL allowlist), and the doc set that describes
how all of this hangs together (`docs/dev.md`, `docs/architecture.md`,
`apps/site/.env.example`).

## Goal

Ship a single PR that:

- Strips the cross-app proxy rewrites from
  [`apps/web/vercel.json`](/apps/web/vercel.json) while preserving
  its SPA rewrites and the test-event `X-Robots-Tag` `headers`
  block at [`apps/web/vercel.json:59-72`](/apps/web/vercel.json).
- Leaves [`apps/site/next.config.ts`](/apps/site/next.config.ts)'s
  rewrite layer at its current site → plugin shape; the existing
  rewrites are exactly what the canonical-origin contract names.
  The `APPS_WEB_ORIGIN` constant stays (now framed as the plugin
  origin destination, not the cheap-unblock workaround target).
- Rewrites the `metadataBase` resolver's inline comment block
  ([`apps/site/app/layout.tsx:28-58`](/apps/site/app/layout.tsx)) and
  throw message ([`apps/site/app/layout.tsx:67-72`](/apps/site/app/layout.tsx))
  per scoping Decision 3 — apps/site-canonical framing replaces
  apps/web-canonical framing; the resolver function body is unchanged.
- Updates [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts):
  drops apps/web's primary alias from `defaultAllowedOrigins`,
  adds apps/site's primary alias, and extends the allowed-origin
  matching to admit apps/site's Vercel preview/branch aliases via
  the matching mechanism chosen at scoping time per Decision 1
  of the scoping doc.
- Lands the doc-currency sweep on `docs/dev.md`,
  `docs/architecture.md`, and `apps/site/.env.example` per
  Decisions 5 and 7 of the scoping doc.
- Cuts over the operator-managed surfaces at merge time:
  `NEXT_PUBLIC_SITE_ORIGIN` on apps/site Vercel production,
  `ALLOWED_ORIGINS` on the Supabase project, and the Supabase Auth
  dashboard redirect-URL allowlist. Per scoping Decision 2, the
  cutover is single-step with no coexistence window.
- Flips this plan's Status from `Proposed` to
  `In progress pending deployed-origin verification` in the
  implementing PR per the Plan-to-Landed Gate's two-phase pattern
  for post-release validation
  ([`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
  Gate For Plans With Post-Release Validation"). The Validation Gate
  below names operator-driven post-deploy checks that genuinely
  cannot run pre-merge (sign-in round-trip against the real Supabase
  Auth dashboard allowlist; OG meta-tag origin spot-check on the
  deployed canonical origin; preview-alias CORS round-trip), so the
  intermediate Status is mandatory rather than optional.
- Updates the cross-cutting plan
  [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)'s
  Phase 2 backlink to reflect this intermediate Status. The
  cross-cutting plan stays at `Proposed` until the same follow-up
  doc-only PR that flips this plan to `Landed` flips it to `Landed`
  alongside (Phase 2 is the cross-cutting plan's terminal phase —
  see the "No Phase 3" section at
  [`docs/plans/canonical-origin-resolution.md:333-349`](/docs/plans/canonical-origin-resolution.md)
  and the "No Phase 4" section at
  [`docs/plans/canonical-origin-resolution.md:351-363`](/docs/plans/canonical-origin-resolution.md)).

## Cross-Cutting Invariants

The cross-cutting invariants for this work are owned by the
cross-cutting plan's [`Cross-cutting invariants` section](/docs/plans/canonical-origin-resolution.md).
This phase plan does not restate them verbatim per the spirit of the
"Scoping does not restate plan-owned content" rule extended to
cross-cutting plan / phase plan; the four invariants are:

- Single canonical front door
- Origin-agnostic shared route table
- Test-event noindex parity across both apps
- Auth-callback origin equals canonical site origin

Phase 2 verifies all four hold post-flip and ships the topology change
that makes the canonical front door invariant *true* in production for
the first time. The other three invariants are preserved through the
flip:

- The shared route table at [`shared/urls/routes.ts`](/shared/urls/routes.ts)
  is unchanged.
- Test-event noindex parity is preserved by retaining the
  [`apps/web/vercel.json:59-72`](/apps/web/vercel.json) headers block
  through Phase 2; apps/site's `generateMetadata` `robots` emit is
  unchanged. Both surfaces continue to emit; the canonical-origin
  proxy from apps/site to apps/web for `/event/:slug/{game,admin}*`
  paths inherits apps/web's response headers (Vercel proxy rewrite
  semantics), so the parity holds at parity strength.
- Auth-callback origin becomes the canonical site origin in
  production by virtue of the topology flip plus the
  `NEXT_PUBLIC_SITE_ORIGIN` value flip plus the dashboard allowlist
  update.

## Naming

This plan introduces no new identifiers. Existing names referenced:

- `NEXT_PUBLIC_SITE_ORIGIN` — env var name, unchanged; production
  *value* flips per the env-var update.
- `ALLOWED_ORIGINS` — Supabase project secret name, unchanged;
  *value* flips per the operator-managed update.
- `APPS_WEB_ORIGIN` — the constant in
  [`apps/site/next.config.ts:53`](/apps/site/next.config.ts);
  retained.
- `defaultAllowedOrigins` — the Set in
  [`supabase/functions/_shared/cors.ts:2-8`](/supabase/functions/_shared/cors.ts);
  retained, contents updated.

## Contracts

### Contract 1: apps/web/vercel.json contains only SPA rewrites and the test-event headers block

After this PR, [`apps/web/vercel.json`](/apps/web/vercel.json)
contains:

- The 4 SPA rewrites at lines 9-25 plus the SPA fallback at lines
  34-37 (5 rewrite entries total): `/event/:slug/game`,
  `/event/:slug/game/:path*`, `/event/:slug/admin`,
  `/event/:slug/admin/:path*`, `/event/:path*` — all destinations
  pointing at `/index.html`.
- The test-event `X-Robots-Tag` `headers` block at the current
  lines 59-72 — unchanged.

The 7 cross-app proxy rewrites at lines 26-33 and lines 38-57
(rules 5, 6, 8, 9, 10, 11, 12 in the cross-cutting plan's pre-Phase-2
topology mapping) are removed. No absolute `*.vercel.app` URL appears
anywhere in the file post-Phase-2.

**Verified by:** [`apps/web/vercel.json:1-73`](/apps/web/vercel.json)
(file under contract, read this scoping pass).

### Contract 2: apps/site/next.config.ts retains its current rewrite layer

After this PR, [`apps/site/next.config.ts`](/apps/site/next.config.ts)
contains the 5 site → plugin rewrites at the current lines 63-86,
unchanged in destinations and source patterns. The `APPS_WEB_ORIGIN`
constant at line 53 retains its current value
(`https://neighborly-scavenger-game-web.vercel.app`).

The inline comment block at lines 26-52 has its prose framing rewritten
so the explanation describes the canonical-origin topology
(apps/site is canonical; apps/web is the plugin deployment reached
through site → plugin rewrites) rather than the cheap-unblock
workaround framing today's prose carries. The
`docs/backlog.md` cite to "Canonical-origin design conversation" at
the current line 49 is replaced with a cite to the cross-cutting
plan and to this phase plan.

**Verified by:** [`apps/site/next.config.ts:1-89`](/apps/site/next.config.ts)
(file under contract, read this scoping pass).

### Contract 3: metadataBase resolver inline prose is rewritten

After this PR, the resolver function body at
[`apps/site/app/layout.tsx:59-90`](/apps/site/app/layout.tsx) is
unchanged. The inline comment block at lines 28-58 and the throw
message at lines 67-72 are rewritten per scoping Decision 3:

- The comment explains that `NEXT_PUBLIC_SITE_ORIGIN` is the canonical
  user-facing site origin, that on Vercel production it must be set to
  apps/site's primary alias, and that on preview the env var or
  apps/site's `VERCEL_BRANCH_URL` / `VERCEL_URL` is used. The pre-
  Phase-2 explanation of why the value is apps/web-canonical (and the
  cite to the M3 phase 3.1.2 scoping doc that originated that
  rationale) is dropped.
- The throw message at lines 67-72 references the post-Phase-2
  `docs/dev.md` "apps/site environment variables" section as the
  operator-instruction source; the apps/web hostname language is
  removed.

**Verified by:** [`apps/site/app/layout.tsx:28-90`](/apps/site/app/layout.tsx)
(file under contract, read this scoping pass);
scoping Decision 3 in
the now-deleted Phase 2 scoping doc (decisions absorbed into this plan; git history preserves the original scoping prose).

### Contract 4: CORS helper admits apps/site canonical + preview/branch aliases

After this PR, [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts)
admits the following origin set:

- The 4 localhost variants currently in `defaultAllowedOrigins`
  (lines 3-6) — unchanged.
- apps/site's primary alias as a new exact-string entry; apps/web's
  primary alias is removed.
- apps/site's Vercel-generated preview and branch aliases via the
  matching mechanism chosen at scoping time (see
  scoping Decision 1 in the now-deleted Phase 2 scoping doc (git history preserves it)).
  The mechanism narrows admission to apps/site's project specifically;
  it does not admit unrelated `*.vercel.app` deployments. The
  implementation lands in this PR; the plan does not restate the
  mechanism shape here per the "Plan code minimalism" rule.

When `ALLOWED_ORIGINS` env var is set, it continues to take precedence
over `defaultAllowedOrigins` per today's helper shape — that path is
unchanged. The new pattern-matching applies to both code paths so an
operator who chooses to enumerate origins explicitly via
`ALLOWED_ORIGINS` still gets preview-alias admission for the apps/site
project.

**Verified by:** [`supabase/functions/_shared/cors.ts:1-46`](/supabase/functions/_shared/cors.ts)
(file under contract, read this scoping pass);
scoping Decision 1 in
the now-deleted Phase 2 scoping doc (decisions absorbed into this plan; git history preserves the original scoping prose);
[Vercel — Generated URLs](https://vercel.com/docs/deployments/generated-urls)
for the preview-alias hostname formats the matching mechanism
catches.

### Contract 5: docs/dev.md sections describe the post-Phase-2 topology

After this PR, [`docs/dev.md`](/docs/dev.md) reads coherently with
the post-flip topology:

- The "Vercel" subsection at the current lines 791-805 names
  apps/site as the project that owns customer-reachable URLs; the
  "primary project owns the production custom domain" framing is
  replaced with a description that explicitly notes no platform-
  owned domain exists today.
- The "Vercel two-project monorepo layout" subsection at the
  current lines 807-834 describes apps/site as canonical; the rule-
  precedence table inverts to describe apps/site as the routing
  authority with apps/web carved out only for the plugin paths.
- The "apps/site environment variables" subsection at the current
  lines 865-892 has its `NEXT_PUBLIC_SITE_ORIGIN` guidance flipped:
  "must be apps/site's primary alias (not apps/web's) because
  apps/site is canonical post-Phase-2." The cite to
  `apps/web/vercel.json` is dropped (the file no longer carries the
  cross-app proxy this paragraph cited).
- The "Cookie-boundary verification" subsection at the current
  lines 894-934 is reframed per scoping Decision 5: the
  `@supabase/ssr` cookie-adapter explanation stays as load-bearing
  onboarding content; the procedural verification steps and
  historical paragraph are updated to describe apps/site as the
  sign-in surface.

**Verified by:** [`docs/dev.md:791-934`](/docs/dev.md) (sections
under contract, read this scoping pass); scoping Decisions 5 in
the now-deleted Phase 2 scoping doc (decisions absorbed into this plan; git history preserves the original scoping prose).

### Contract 6: docs/architecture.md framing and topology table reflect post-Phase-2

After this PR, [`docs/architecture.md`](/docs/architecture.md) reads
coherently:

- The framing paragraph at the current lines 32-35 names apps/site
  as canonical; the "primary Vercel project owning the production
  custom domain" claim is replaced with a description that names no
  platform-owned domain today and notes the per-event-organizer-CNAME
  launch model from the cross-cutting plan's Goal section.
- The "Vercel routing topology" section at the current lines
  969-1002 has its 12-row table inverted: apps/site is canonical,
  the entries that were "transitional" become "Permanent" once the
  topology flip lands, and the SPA fallback row goes away (no more
  `/event/:path*` → apps/web fallback — apps/site owns the default).

**Verified by:** [`docs/architecture.md:25-90`](/docs/architecture.md),
[`docs/architecture.md:945-1002`](/docs/architecture.md) (sections
under contract, read this scoping pass); scoping Decision 7 in
the now-deleted Phase 2 scoping doc (decisions absorbed into this plan; git history preserves the original scoping prose).

### Contract 7: apps/site/.env.example comment describes post-Phase-2 semantics

After this PR, [`apps/site/.env.example`](/apps/site/.env.example) has
its 5-line comment at lines 3-7 rewritten so the prose describes
`NEXT_PUBLIC_SITE_ORIGIN` as the canonical user-facing site origin,
naming apps/site's primary alias as the production value rather than
apps/web's. The 3-var structure of the file is unchanged.

**Verified by:** [`apps/site/.env.example:1-9`](/apps/site/.env.example)
(file under contract, read this scoping pass).

### Contract 8: operator-managed cutover steps execute at merge time

The PR carries no diff for these surfaces (they live outside the
repo), but Phase 2's operational checklist names each step the
maintainer performs at cutover time:

- Set `NEXT_PUBLIC_SITE_ORIGIN` on the apps/site Vercel project's
  Production environment to apps/site's primary alias. This is the
  metadataBase value the post-Phase-2 topology requires.
- Update the Supabase project's `ALLOWED_ORIGINS` secret to drop
  apps/web's primary alias and add apps/site's primary alias.
  (The repo-side helper update from Contract 4 covers the default
  case; this update aligns the env-var override with the same set.)
- Add apps/site's `/auth/callback` to the Supabase Auth dashboard's
  redirect-URL allowlist; remove apps/web's `/auth/callback` per
  scoping Decision 2 (single-step cutover, no coexistence window).

The cutover runs in either order relative to merge — the most
defensive sequence is "configure new values first, then merge so
the deploys pick them up." If the new `NEXT_PUBLIC_SITE_ORIGIN`
value is missing on the apps/site Vercel production environment when
the post-merge deploy runs, the build throws at module-load time per
the resolver's design, which catches the misconfiguration loudly
rather than shipping localhost-shaped meta tags.

**Verified by:** [`apps/site/app/layout.tsx:65-72`](/apps/site/app/layout.tsx)
(the build-time throw on production with unset
`NEXT_PUBLIC_SITE_ORIGIN`); scoping Decisions 2 and 4 in
the now-deleted Phase 2 scoping doc (decisions absorbed into this plan; git history preserves the original scoping prose);
[`docs/plans/canonical-origin-resolution.md:108-113`](/docs/plans/canonical-origin-resolution.md)
(the binding contract on the post-Phase-2 allowlist contents).

## Files to touch

This is the planner's best guess at scoping time about scope shape;
implementation may revise when a structural call requires deviating
per the "Plan content is a mix of rules and estimates" rule.

### New

None. Phase 2 modifies existing files only.

### Modify

- [`apps/web/vercel.json`](/apps/web/vercel.json) — strip cross-app
  proxy rewrites (lines 26-33 and 38-57); preserve SPA rewrites and
  test-event headers block. Per Contract 1.
- [`apps/site/next.config.ts`](/apps/site/next.config.ts) — rewrite
  the inline comment block at lines 26-52 (framing flip); rewrites
  array unchanged. Per Contract 2.
- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) — rewrite
  the resolver comment block at lines 28-58 and throw message at
  lines 67-72. Per Contract 3.
- [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts) —
  swap apps/web → apps/site in `defaultAllowedOrigins`; add the
  matching mechanism chosen at scoping time. Per Contract 4.
- [`docs/dev.md`](/docs/dev.md) — four sections at the current lines
  791-805, 807-834, 865-892, 894-934. Per Contract 5.
- [`docs/architecture.md`](/docs/architecture.md) — two sections at
  the current lines 32-35 and 969-1002. Per Contract 6.
- [`apps/site/.env.example`](/apps/site/.env.example) — comment at
  lines 3-7. Per Contract 7.
- [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md) —
  Phase 2 backlink updated to reflect this plan's intermediate
  Status; the cross-cutting plan's own Status stays `Proposed` and
  flips to `Landed` in the same follow-up doc-only PR that flips
  this plan to `Landed` (see Goal for the two-phase pattern).
- This plan doc — Status flips `Proposed` →
  `In progress pending deployed-origin verification` in the
  implementing PR; flips to `Landed` in a follow-up doc-only PR
  after the operator runs the post-deploy checklist.

### Intentionally not touched

This is the planner's best guess at scoping time. The Files
Intentionally Not Touched list is an estimate, not a hard ban —
implementation may deviate when the right structural call requires
it, and any deviation ships under the PR's Estimate Deviations
callout.

- [`shared/urls/routes.ts`](/shared/urls/routes.ts) — origin-agnostic
  by invariant; Phase 2 verifies this and does not modify the file.
- [`shared/auth/api.ts`](/shared/auth/api.ts) — origin composition is
  via `window.location.origin`; the post-Phase-2 canonical origin
  flow exercises this path natively. No code change needed.
- [`docs/dev.md:836-863`](/docs/dev.md) — the "Local-dev story for
  `/auth/callback` e2e fixtures" subsection per scoping Decision 6.
  The local e2e proxy script's routing prose may need a separate
  flip; not in scope for Phase 2's doc-currency sweep.
- [`scripts/testing/run-auth-e2e-dev-server.cjs`](/scripts/testing/run-auth-e2e-dev-server.cjs) —
  out of scope per scoping Decision 6.
- The 3 test-event noindex regex constraints in
  [`apps/web/vercel.json:59-72`](/apps/web/vercel.json) — preserved
  per the cross-cutting plan's End State table row 11. The
  cross-cutting plan's Risk Register entry on per-plugin noindex
  maintenance cost (lines 593-610) records why this stays as-is
  through Phase 2.
- [`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/%28authenticated%29/auth/callback/page.tsx) —
  apps/site already owns the auth callback route physically; no
  source change needed for the Phase 2 flip.
- [`apps/web/`](/apps/web) source code (the SPA itself) — Phase 2
  changes routing config, not the SPA's behavior. The plugin
  deployment continues to render `/event/:slug/{game,admin}*`
  unchanged.

## Execution Steps

This is the planner's best guess at scoping time about ordering;
implementation may resequence when a structural call requires it.

1. Strip cross-app proxy rewrites from
   [`apps/web/vercel.json`](/apps/web/vercel.json); preserve SPA
   rewrites and headers block (Contract 1).
2. Rewrite the inline comment block in
   [`apps/site/next.config.ts`](/apps/site/next.config.ts) to describe
   the canonical-origin topology (Contract 2).
3. Rewrite the metadataBase resolver's comment block and throw
   message in [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx)
   (Contract 3).
4. Update [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts):
   swap canonical alias in `defaultAllowedOrigins` and add the
   pattern-matching mechanism (Contract 4).
5. Update [`apps/site/.env.example`](/apps/site/.env.example)
   comment (Contract 7).
6. Land the doc-currency sweep on
   [`docs/dev.md`](/docs/dev.md) and
   [`docs/architecture.md`](/docs/architecture.md) (Contracts 5
   and 6).
7. Run the Validation Gate (see below).
8. Open the PR; document the operator-managed cutover steps in the
   PR body's Documentation section.
9. Perform operator-managed cutover at merge time per Contract 8:
   set `NEXT_PUBLIC_SITE_ORIGIN` on apps/site Vercel production,
   update `ALLOWED_ORIGINS` Supabase secret, update Supabase Auth
   dashboard redirect-URL allowlist.
10. Merge; Vercel redeploys both projects; topology flips.
11. Operator runs the post-deploy validation checklist (sign-in,
    OG-tag spot-check, plugin-path proxy check, preview-alias CORS
    check). Once each falsifier passes, open a follow-up doc-only PR
    that flips this plan's Status from
    `In progress pending deployed-origin verification` to `Landed`
    and the cross-cutting plan's Status from `Proposed` to `Landed`,
    recording any external evidence (deploy URL, sign-in test
    timestamp) the operator captured.

## Commit Boundaries

This is the planner's best guess at scoping time about cohesive
commit chunks; the implementer may refine.

Suggested boundaries:

- **Commit 1: routing config flip** — apps/web/vercel.json strip,
  apps/site/next.config.ts comment-block rewrite. Both files are
  the routing-config layer; landing them together gives a coherent
  "topology flip" diff.
- **Commit 2: env-var prose flip** — apps/site/app/layout.tsx
  resolver prose, apps/site/.env.example comment. Both are
  metadataBase / `NEXT_PUBLIC_SITE_ORIGIN` prose surfaces.
- **Commit 3: CORS helper update** — supabase/functions/_shared/cors.ts.
  Isolated helper change.
- **Commit 4: doc-currency sweep** — docs/dev.md, docs/architecture.md.
  Pure prose updates that describe the post-Phase-2 world.
- **Commit 5: plan Status flips** — both plan docs to `Landed`. The
  Plan-to-PR Completion Gate close-out commit.

If a reviewer round produces fix-up commits, those land as their own
commits per the "Plan-to-Landed Gate" close-out discipline.

## Validation Gate

The PR is mostly config + docs with one helper-logic change (the
CORS pattern-matching). The gate is:

- **`npm run lint`** — covers the apps/site, apps/web, shared,
  supabase, scripts, and tests TypeScript surfaces (per
  [`package.json` scripts](/package.json) line 17). Catches any
  type or lint regression in the CORS helper change.
- **`npm run build:web`** — confirms the apps/web Vercel build
  succeeds with the stripped rewrites set. The SPA build itself
  is unchanged, but the build:web step exercises vercel.json
  validation.
- **`npm run build:site`** — confirms the apps/site Next.js build
  succeeds with the rewritten metadataBase resolver prose. The
  resolver function body is unchanged, but build:site exercises
  the module-load-time throw path against the build-environment
  values (the localhost fallback fires in CI).
- **`npm test`** — covers the CORS helper's behavior tests if any
  exist; covers nothing else net-new in this PR. Unit-level surface
  for the CORS pattern-matching is not currently covered by tests
  (today's helper has no test file under `supabase/functions/_shared/`),
  so the test command is a regression check against unrelated
  surfaces; the CORS change is verified by the post-deploy magic-link
  validation below.
- **Post-deploy validation (operator step at cutover time):**
  - Sign in to apps/site's `/admin` on the canonical origin and
    complete the magic-link round-trip. Falsifier: if the sign-in
    fails, the Supabase Auth dashboard redirect-URL allowlist did
    not get the canonical site origin's `/auth/callback` added,
    or `NEXT_PUBLIC_SITE_ORIGIN` is misset.
  - Open a per-event landing page on the canonical origin
    (`/event/harvest-block-party`) and inspect the rendered HTML
    for `og:image` and `og:url` meta tags. Falsifier: if either
    resolves against apps/web's hostname, the apps/site Vercel
    production env var did not flip.
  - Open a plugin path on the canonical origin
    (`/event/harvest-block-party/game`) and confirm it returns the
    apps/web SPA `index.html` shape. Falsifier: if the path 404s,
    the site → plugin rewrites in apps/site/next.config.ts are
    broken (or the apps/web deployment alias used as the rewrite
    destination has changed).
  - Open a preview-alias URL of apps/site (e.g., from a future
    PR's preview deploy) and call any deployed Edge Function from
    that origin via a credentialed fetch. Falsifier: if the call
    is rejected with a CORS error, the matching mechanism in
    cors.ts did not catch the preview alias.

The CORS helper change additionally carries a **branch-test
contract** the implementing PR must satisfy before merge:

- The helper admits the canonical site origin (exact-match path).
- The helper admits a representative apps/site preview-alias
  hostname (Vercel's documented `<project>-<unique>-<scope>.vercel.app`
  and `<project>-git-<branch>-<scope>.vercel.app` shapes against the
  apps/site project name).
- **Negative test (load-bearing isolation):** the helper rejects an
  alias from a hypothetical sibling Vercel project whose name shares
  apps/site's prefix (e.g., a deployment hostname that begins with
  the apps/site project name plus an additional suffix segment, then
  ends in `.vercel.app`). This test exists specifically to prove the
  matching strategy isolates the apps/site project rather than any
  project sharing its name prefix; it is the contract requirement
  that constrains the precise predicate spelling chosen at
  implementation time. Falsifier: if a sibling-prefix project's
  alias is admitted, the predicate is too loose and must be
  tightened (e.g., by anchoring on a delimiter after the project
  name, or by enumerating the exact allowed suffix shapes).

These three tests are the implementing PR's branch-level proof that
the helper change satisfies the cross-cutting plan's CORS contract.
The matching strategy chosen at scoping time
(the now-deleted Phase 2 scoping doc (decisions absorbed into this plan; git history preserves the original scoping prose)
Decision 1) is the planning-layer answer; these tests are the
correctness gate.

The post-deploy validation is operator-performed at cutover, not
CI-gated. It is named here as the load-bearing falsifier that
distinguishes "topology flipped successfully" from "topology
silently broken on production." This is acceptable because per
scoping Decision 2 today's reality is single-user with no in-flight
sessions to protect; if the post-deploy validation fails, the
maintainer fixes the misconfiguration in-session.

## Self-Review Audits

Drawn from [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
and applicable to this PR's diff surfaces:

- **Falsifiability check on each load-bearing claim** (per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)):
  walk every `Verified by:` annotation in this plan and the
  scoping doc against the cited source. Specifically: the
  Validation Gate's post-deploy steps each carry a discriminating
  falsifier per the falsifiability rule.
- **Plan-doc review stance** (per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)):
  this docs-only planning PR's body carries the canonical Review
  Stance section. The implementing PR's body covers the rule
  separately for its own diff surface.
- **Plan-to-PR Completion Gate** (per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)):
  walk Goal, Contracts, Validation Gate. This plan's Status flips
  `Proposed` → `In progress pending deployed-origin verification`
  in the implementing PR; the `Landed` flip and the cross-cutting
  plan's `Proposed` → `Landed` flip live in the follow-up doc-only
  PR that runs after operator validation, per the Plan-to-Landed
  Gate's two-phase pattern for post-release validation.
- **Estimate Deviations callout** (per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)):
  if implementation surfaces a structural call that requires
  touching an "intentionally not touched" file or skipping a
  "modify" file, the implementing PR's body lists the deviation.
- **Documentation Currency PR Gate** (per the cross-cutting
  plan's Phase 2 doc-currency requirement at
  [`docs/plans/canonical-origin-resolution.md:303-326`](/docs/plans/canonical-origin-resolution.md)):
  Contracts 5, 6, 7 satisfy this gate; the implementing PR
  reconciles each section against post-Phase-2 reality.

## Documentation Currency PR Gate

The cross-cutting plan's Phase 2 narrative names the doc-currency
sweep as a same-PR rule-shaped obligation per the Plan-to-PR
Completion Gate's documentation-current-state requirement. This
plan satisfies the gate via Contracts 5, 6, 7 (docs/dev.md,
docs/architecture.md, apps/site/.env.example).

The doc updates land **alongside** the implementing PR — not as a
follow-up doc-only PR. The implementing PR walks each section's
prose against the post-Phase-2 topology before merge.

## Out Of Scope

- The plugin-origin lockdown (308 redirect / 410 tombstone /
  passthrough). Cross-cutting plan removed Phase 3 explicitly per
  [`docs/plans/canonical-origin-resolution.md:333-349`](/docs/plans/canonical-origin-resolution.md).
- Custom-domain rollout. Cross-cutting plan removed Phase 4
  explicitly per
  [`docs/plans/canonical-origin-resolution.md:351-363`](/docs/plans/canonical-origin-resolution.md).
- Generic plugin-platform design beyond the game's case. Out of
  scope per the cross-cutting plan's Out Of Scope section.
- Per-event organizer subdomain onboarding (the Madrona launch and
  successor analogues). Each event's subdomain wiring is owned by
  that event's launch track, not by this plan.
- The local auth e2e proxy script's routing flip per scoping
  Decision 6.
- Centralizing test-event noindex emission in apps/site middleware.
  Cross-cutting plan's Risk Register at
  [`docs/plans/canonical-origin-resolution.md:593-610`](/docs/plans/canonical-origin-resolution.md)
  records the conditions that would justify this change; neither
  holds today.
- Test coverage for the new CORS pattern-matching mechanism.
  Today's helper has no test file; adding one is a separate
  concern that does not block the topology flip. The post-deploy
  validation step in the Validation Gate carries the falsifier
  for the new admission path.

## Risk Register

- **Stripped cross-app rewrites in apps/web/vercel.json leave a
  reachable apps/web origin with no routing for canonical-site
  paths.** Post-Phase-2, hitting
  `https://neighborly-scavenger-game-web.vercel.app/admin` or `/`
  on apps/web origin returns whatever the SPA's index.html catch-
  all returns (a blank SPA shell or a SPA 404). Mitigation: per the
  cross-cutting plan's Goal section, the plugin origin is reachable
  but not advertised; this is the accepted state of Phase 2's
  end. If the calculus changes (organic search picks up the URL,
  external links accumulate), a future plan adds a redirect or
  tombstone. **Verified by:**
  [`docs/plans/canonical-origin-resolution.md:92-100`](/docs/plans/canonical-origin-resolution.md).

- **Operator-managed Supabase Auth allowlist update is the load-
  bearing post-merge step.** If the maintainer forgets to add
  apps/site's `/auth/callback` to the allowlist before signing in
  on the canonical origin post-flip, magic-link sign-in fails.
  Mitigation: per scoping Decision 2, today's reality is single-
  user; the maintainer fixes the allowlist in-session if sign-in
  breaks. The Validation Gate names this as the post-deploy
  falsifier. **Verified by:**
  [`docs/plans/canonical-origin-resolution.md:557-565`](/docs/plans/canonical-origin-resolution.md),
  scoping Decision 2 in the now-deleted Phase 2 scoping doc (git history preserves it).

- **`NEXT_PUBLIC_SITE_ORIGIN` value flip is a metadata-correctness
  risk.** Misconfigured production env after the flip ships OG
  image / unfurl URLs pointing at the wrong origin. The resolver
  throws at build time when the var is unset on production
  ([`apps/site/app/layout.tsx:65-72`](/apps/site/app/layout.tsx)),
  so the missing-value misconfiguration is loud rather than silent.
  Mitigation: per Contract 8, the cutover sequence sets the new
  value before merge so the post-merge deploy picks it up
  immediately. The Validation Gate names a meta-tag spot-check as
  the post-deploy falsifier for misset (vs. the build-time throw
  for unset). **Verified by:**
  [`apps/site/app/layout.tsx:65-72`](/apps/site/app/layout.tsx),
  [`docs/plans/canonical-origin-resolution.md:582-592`](/docs/plans/canonical-origin-resolution.md).

- **CORS pattern-matching mechanism overmatches or undermatches.**
  The matching mechanism chosen at scoping time admits
  apps/site's preview/branch aliases. If the implementation
  overmatches (admits unrelated `*.vercel.app` deployments) the
  Edge Functions become reachable from origins they shouldn't be;
  if it undermatches (rejects valid apps/site preview aliases) PR
  preview e2e flows that hit Edge Functions break. Mitigation:
  the Validation Gate's preview-alias post-deploy step catches
  undermatching; overmatching is caught by reading the helper's
  matching logic against scoping Decision 1's spec — admit only
  origins whose hostname starts with the project token AND ends
  with `.vercel.app`. **Verified by:**
  scoping Decision 1 in the now-deleted Phase 2 scoping doc (git history preserves it),
  [`supabase/functions/_shared/cors.ts:1-46`](/supabase/functions/_shared/cors.ts).

- **Doc-currency sweep misses a section that drifts post-Phase-2.**
  docs/dev.md, docs/architecture.md, and apps/site/.env.example are
  large surfaces; this plan names specific line ranges per
  Contracts 5, 6, 7, but a section the plan didn't enumerate
  could carry stale apps/web-canonical framing. Mitigation:
  before merge, grep both doc files for `apps/web` and
  `neighborly-scavenger-game-web` and walk every hit against
  post-Phase-2 framing; non-mention hits are fine, framing-claim
  hits get reframed. The Self-Review Audits section's
  Documentation Currency PR Gate covers this. **Verified by:**
  [`docs/dev.md`](/docs/dev.md),
  [`docs/architecture.md`](/docs/architecture.md) (full surfaces
  the grep walks).

## Backlog Impact

The backlog entry "Canonical-origin design conversation" at
[`docs/backlog.md`](/docs/backlog.md) is resolved by the topology
flip this implementing PR ships. The entry's deletion travels with
the cross-cutting plan's `Landed` flip — i.e., it ships in the same
follow-up doc-only PR that flips both plan Statuses after the
operator runs the post-deploy validation checklist. Deferring the
deletion to the follow-up PR keeps the backlog entry visible until
the operator has confirmed the flip actually held in production
(rather than dropping the breadcrumb prematurely on a deploy that
might surface a misconfiguration).

**Verified by:** [`docs/backlog.md`](/docs/backlog.md) (the
backlog entry under deletion in the follow-up doc-only PR).
