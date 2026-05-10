# Canonical Origin Resolution — Phase 1 Plan

## Status

Landed.

This is the durable per-phase plan for Phase 1 of the cross-cutting
plan at [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md).
The transient scoping doc lives at
[`docs/plans/scoping/canonical-origin-resolution-phase-1.md`](/docs/plans/scoping/canonical-origin-resolution-phase-1.md).

## Context

Today the platform routes traffic between two Vercel projects through
bidirectional proxy rewrites: apps/web carries the bulk of the cross-
app rewrites in
[`apps/web/vercel.json`](/apps/web/vercel.json), and apps/site carries
reverse-direction rewrites in
[`apps/site/next.config.ts`](/apps/site/next.config.ts) for the
plugin-owned routes (`/event/:slug/{game,admin}*`, `/assets/*`).
The cross-cutting plan's end state inverts the canonical pointer:
apps/site becomes the customer-advertised origin and apps/web is
reached only through one-direction proxy rewrites from the canonical
origin. **Phase 2** ships that flip; **Phase 1's job** is to verify
that the apps/site origin already renders every customer-visible
surface end-to-end on its own — without depending on apps/web's
cross-app rewrites covering for it — so Phase 2's flip doesn't
surface a latent leak in production.

This is the read-mostly preparation phase. Nothing customer-visible
changes. The cheap-unblock reverse rewrites already in
[`apps/site/next.config.ts:64-86`](/apps/site/next.config.ts) stay in
place. The audit walks each customer-visible surface on the apps/site
origin and either finds the surface complete or surfaces a
production-code gap that Phase 1 patches in the same PR. The audit
outcome surfaced here is the **no-op** shape the parent plan's
"Phase 1 likely covers" section names as one of the two valid
outcomes — no production code changes were needed.

## Goal

Ship a single PR that:

- Records the audit findings in this plan's "Audit Findings" section
  with `Verified by:` citations for each claim, retrieved during the
  audit session.
- Contains zero production code changes (the no-op shape; see Audit
  Findings for why).
- Flips this plan's Status from `Proposed` (the In-draft → Proposed
  promotion gate ran during this PR's drafting) to `Landed` in the
  same PR per the Plan-to-PR Completion Gate.
- Leaves the cross-cutting plan at
  [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
  at `Proposed` (the cross-cutting plan flips when the whole
  sequence — Phase 1 + Phase 2 — has landed).

## Cross-Cutting Invariants

Inherited verbatim from the cross-cutting plan's
[`Cross-cutting invariants`](/docs/plans/canonical-origin-resolution.md)
section. Phase 1 verifies these hold today on apps/site origin and
does not modify them:

- **Single canonical front door.** apps/site's primary alias is the
  only customer-advertised origin; plugin origins remain technically
  reachable but are never advertised, hardcoded, or surfaced as link
  destinations.
- **Origin-agnostic shared route table.** Both apps consume
  `shared/urls/routes.ts`; per-app code never composes route strings
  inline against a hardcoded origin.
- **Test-event noindex parity across both apps.** `noindex, nofollow`
  coverage on `harvest-block-party`, `riverside-jam`, `madrona` is
  paired: apps/site emits via `generateMetadata` `robots`, apps/web
  emits via the headers block at
  [`apps/web/vercel.json:59-72`](/apps/web/vercel.json). Both must
  hold simultaneously.
- **Auth-callback origin equals canonical site origin.**
  `requestMagicLink` composes `emailRedirectTo` against
  `window.location.origin` per
  [`shared/auth/api.ts:44-49`](/shared/auth/api.ts); the Supabase
  Auth dashboard's redirect-URL allowlist must list that exact origin.

## Audit Findings

The audit walked every customer-visible surface on
`https://neighborly-events-site.vercel.app` (today's apps/site
origin) plus the cross-cutting invariants above. Each finding below
carries a `Verified by:` annotation retrieved during the audit
session (either a code citation or a live HTTP response).

### Finding 1: All native apps/site routes return 200 on apps/site origin

The four native customer-visible apps/site routes resolve correctly
on apps/site origin without depending on apps/web for any rewrite
favor:

- `/` — home (with RoleDoors, TwoEventShowcase, HarvestNarrative,
  HomeHero).
- `/admin` — platform admin client route.
- `/event/harvest-block-party` — event landing (SSR per slug).
- `/event/harvest-block-party/feedback` — feedback form (prerendered
  per registered slug).
- `/auth/callback` — auth callback (client component).

**Verified by:** `curl -sI` against each path returned `HTTP/2 200`
with `server: Vercel` and `x-nextjs-prerender: 1` (or the equivalent
client-render headers for `/admin` and `/auth/callback`) during the
audit session;
[`apps/site/app/page.tsx`](/apps/site/app/page.tsx),
[`apps/site/app/(authenticated)/admin/page.tsx`](/apps/site/app/%28authenticated%29/admin/page.tsx),
[`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx),
[`apps/site/app/event/[slug]/feedback/page.tsx`](/apps/site/app/event/%5Bslug%5D/feedback/page.tsx),
[`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/%28authenticated%29/auth/callback/page.tsx).

### Finding 2: OG/Twitter image routes return 200 with correct content-type

The file-convention metadata routes resolve under apps/site origin
and return PNG image responses, exercising the `ImageResponse`
prerender path end-to-end:

- `/event/harvest-block-party/opengraph-image` — `200 OK`,
  `content-type: image/png`.
- `/event/harvest-block-party/twitter-image` — `200 OK`,
  `content-type: image/png`.

**Verified by:** `curl -sI` against each path during the audit
session;
[`apps/site/app/event/[slug]/opengraph-image.tsx`](/apps/site/app/event/%5Bslug%5D/opengraph-image.tsx),
[`apps/site/app/event/[slug]/twitter-image.tsx`](/apps/site/app/event/%5Bslug%5D/twitter-image.tsx).

### Finding 3: Reverse cheap-unblock rewrites resolve to apps/web SPA on apps/site origin

The reverse rewrites at
[`apps/site/next.config.ts:64-86`](/apps/site/next.config.ts) cover
the home-page role-door target paths (`/event/:slug/game*` and
`/event/:slug/admin*`). All three role-door destinations resolve
to the apps/web SPA `index.html` when accessed through apps/site
origin:

- `/event/harvest-block-party/game` — `200 OK`,
  `content-disposition: inline; filename="index.html"`.
- `/event/harvest-block-party/admin` — same.
- `/event/harvest-block-party/game/redeem` — same.

**Verified by:** `curl -sI` against each path during the audit
session;
[`apps/site/next.config.ts:64-86`](/apps/site/next.config.ts).

### Finding 4: Test-event `X-Robots-Tag` header propagates through reverse rewrite

The proxy rewrites preserve the destination's response headers. The
apps/web headers block at
[`apps/web/vercel.json:59-72`](/apps/web/vercel.json) emits
`X-Robots-Tag: noindex, nofollow` for the three test-event slug
patterns; this header is observable on the response when the path is
fetched through apps/site origin. Concretely,
`curl -sI https://neighborly-events-site.vercel.app/event/harvest-block-party/game`
returned `x-robots-tag: noindex, nofollow` during the audit session.
The native apps/site landing page paired emit (via
`generateMetadata.robots`) ships in the rendered HTML rather than as
a header, per the Cross-Cutting Invariants section above and
[`apps/site/app/event/[slug]/page.tsx:77-80`](/apps/site/app/event/%5Bslug%5D/page.tsx).

**Verified by:** `curl -sI` response captured during the audit
session;
[`apps/web/vercel.json:59-72`](/apps/web/vercel.json),
[`apps/site/app/event/[slug]/page.tsx:77-80`](/apps/site/app/event/%5Bslug%5D/page.tsx).

### Finding 5: No hardcoded apps/web origin in apps/site application code other than the documented constant

A repo-wide search across `apps/site` for both the literal
`vercel.app` substring and the hostnames
`neighborly-scavenger-game-web` / `neighborly-events-site` returned
exactly **one** non-comment hit: the documented `APPS_WEB_ORIGIN`
constant at
[`apps/site/next.config.ts:53`](/apps/site/next.config.ts), which
is the rewrite-destination constant the cheap-unblock reverse
rewrites use. Phase 2 strips this constant when it inverts the
topology; Phase 1 leaves it in place. All other apps/web references
in apps/site are documentation comments (named in the audit's grep
output as comment lines under `apps/site/app/layout.tsx`,
`apps/site/components/event/*.tsx`, `apps/site/components/home/*.tsx`,
`apps/site/lib/setupEvents.ts`, and
`apps/site/app/(authenticated)/admin/page.tsx`).

**Verified by:** `grep -rn "neighborly-scavenger-game-web\|neighborly-events-site"
apps/site shared` returned only
[`apps/site/next.config.ts:53`](/apps/site/next.config.ts) during
the audit session;
[`apps/site/next.config.ts:26-53`](/apps/site/next.config.ts) (the
constant's inline documentation explains the deliberate hardcoding).

### Finding 6: All customer-clickable hrefs in apps/site rendered HTML are origin-relative

Inspection of the home page's rendered HTML on apps/site origin
returned only origin-relative hrefs in customer-clickable links:
`/event/harvest-block-party`, `/event/harvest-block-party/admin`,
`/event/harvest-block-party/game`, `/event/harvest-block-party/game/redeem`,
`/event/riverside-jam`, plus the asset paths under `/_next/*`. No
href values resolve against apps/web's origin. This is a direct
consequence of every apps/site component composing routes through
`shared/urls/routes.ts` (origin-agnostic) plus relative-path
literals (e.g.,
[`apps/site/app/event/[slug]/feedback/page.tsx:96-100`](/apps/site/app/event/%5Bslug%5D/feedback/page.tsx),
[`apps/site/components/event/EventFeedbackCTA.tsx:41-46`](/apps/site/components/event/EventFeedbackCTA.tsx)).

**Verified by:**
`curl -s https://neighborly-events-site.vercel.app/ | grep -oE 'href="[^"]*"' | sort -u`
during the audit session;
[`shared/urls/routes.ts:27-42`](/shared/urls/routes.ts),
[`apps/site/components/event/EventCTA.tsx:24`](/apps/site/components/event/EventCTA.tsx),
[`apps/site/components/event/EventHeader.tsx:52`](/apps/site/components/event/EventHeader.tsx),
[`apps/site/components/event/EventFooter.tsx:25-27`](/apps/site/components/event/EventFooter.tsx),
[`apps/site/components/home/RoleDoors.tsx:42-61`](/apps/site/components/home/RoleDoors.tsx).

### Finding 7: OG/Twitter unfurl URLs resolve against apps/web origin in production output

This is the one observation that is **not** rendering correctly for
the post-Phase-2 topology. The `metadataBase` resolver at
[`apps/site/app/layout.tsx:59-90`](/apps/site/app/layout.tsx) reads
`NEXT_PUBLIC_SITE_ORIGIN`, currently set to apps/web's hostname per
the documented Phase 2 doc-currency entry. As a result, the
production page's `og:url`, `og:image`, and `twitter:image` meta
tags resolve against `neighborly-scavenger-game-web.vercel.app`
rather than the apps/site origin. Concretely, fetching the rendered
HTML returned an `og:image` whose value pointed at apps/web's
hostname during the audit session.

This is **expected current behavior**, explicitly the env-var flip
Phase 2 ships per
[`docs/plans/canonical-origin-resolution.md:114-122`](/docs/plans/canonical-origin-resolution.md)
and the doc-currency update set at
[`docs/plans/canonical-origin-resolution.md:303-326`](/docs/plans/canonical-origin-resolution.md).
Phase 1 records the observation and defers the fix to Phase 2;
patching it in Phase 1 would smuggle Phase-2-shaped work
(env-var change on Vercel + `apps/site/.env.example` comment update)
into the audit PR.

**Phase 1 finding deferred to Phase 2.**

**Verified by:**
[`apps/site/app/layout.tsx:59-90`](/apps/site/app/layout.tsx),
[`apps/site/.env.example:3-9`](/apps/site/.env.example),
[`docs/plans/canonical-origin-resolution.md:114-122`](/docs/plans/canonical-origin-resolution.md);
`curl -s https://neighborly-events-site.vercel.app/event/harvest-block-party | grep og:image`
during the audit session.

### Finding 8: Auth-callback verification is structural

The `/auth/callback` route is owned physically by apps/site at
[`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/%28authenticated%29/auth/callback/page.tsx)
and returns 200 on apps/site origin (Finding 1). `requestMagicLink`
composes the redirect URL against `window.location.origin` at
[`shared/auth/api.ts:44-49`](/shared/auth/api.ts), so a sign-in
flow initiated on apps/site origin returns to apps/site origin,
which is the route's physical owner. The end-to-end magic-link
round-trip on apps/site origin is implicitly already exercised today
by anyone who signs in to `/admin` on a preview-deploy URL — the
flow has worked in that shape.

This finding records that the verification is structural rather
than a live magic-link send, which is out of audit scope (real
allowlisted email + manual click required).

**Verified by:**
[`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/%28authenticated%29/auth/callback/page.tsx),
[`shared/auth/api.ts:44-49`](/shared/auth/api.ts);
Finding 1 above for the 200-response observation.

## Files to touch

This is the planner's best guess at scoping time about scope shape; if
the audit had surfaced a production-code gap, additional files would
have been added below. The audit outcome was no-op, so only docs
ship.

### New

- [`docs/plans/scoping/canonical-origin-resolution-phase-1.md`](/docs/plans/scoping/canonical-origin-resolution-phase-1.md) —
  transient scoping doc.
- [`docs/plans/canonical-origin-resolution-phase-1-plan.md`](/docs/plans/canonical-origin-resolution-phase-1-plan.md) —
  this plan doc.

### Modify

- This plan doc's Status flips `Proposed` → `Landed` in the same PR.

### Intentionally not touched

This is the planner's best guess at scoping time. The Files Intentionally
Not Touched list is an estimate, not a hard ban — implementation may
deviate when the right structural call requires it, and any deviation
ships under the PR's Estimate Deviations callout.

- [`apps/web/vercel.json`](/apps/web/vercel.json) — Phase 2 strips
  cross-app proxy rewrites; the headers block at lines 59-72 is
  preserved through Phase 2 and untouched here.
- [`apps/site/next.config.ts`](/apps/site/next.config.ts) — Phase 2
  reshapes the rewrite layer; cheap-unblock reverse rewrites stay in
  place through Phase 1.
- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) — Finding 7
  is deferred to Phase 2; resolver shape is unchanged here.
- [`apps/site/.env.example`](/apps/site/.env.example) — explicitly
  named in Phase 2's doc-currency update set; out of scope for
  Phase 1.
- [`docs/dev.md`](/docs/dev.md),
  [`docs/architecture.md`](/docs/architecture.md) — explicitly named
  in Phase 2's doc-currency update set; out of scope for Phase 1.
- [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts) —
  Phase 2's CORS allowlist update; out of scope for Phase 1.
- [`shared/urls/routes.ts`](/shared/urls/routes.ts),
  [`shared/auth/api.ts`](/shared/auth/api.ts) — origin-agnostic by
  invariant; no audit finding flagged either.

## Validation Gate

Phase 1 is a docs-only PR with zero production-code changes. The gate
is twofold:

- **Build gates that always run on docs-touching PRs:** `npm run lint`
  and `npm run build:web` and `npm run build:site` (the third per the
  memory rule about `build:site` whenever apps/site is touched, which
  this PR doesn't directly touch but the parent plan's surface
  involves apps/site so the gate ships defensively). `npm test` is
  intentionally skipped because no code changes; the test rule binds
  when code ships.
- **Audit-content falsifier:** every `Verified by:` citation in this
  plan's Audit Findings section was retrieved in the same audit
  session that produced the finding. The protective check is the
  "Verified by: annotations on load-bearing claims" rule in
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md);
  reviewers can re-walk each citation against the cited source to
  confirm. Falsifier: any cited path:line that doesn't match the
  claim, or any HTTP-response claim that doesn't reproduce against
  apps/site origin, surfaces a wrong audit finding rather than a
  silent gap.

## Self-Review Audits

This is a docs-only PR. The relevant audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) are the
plan-doc structural ones:

- **Falsifiability check on each load-bearing claim** (in
  [`shared.md`](/docs/agents/planning/shared.md)): walked against
  every `Verified by:` annotation in Audit Findings.
- **Plan-doc review stance** (in
  [`shared.md`](/docs/agents/planning/shared.md)): the PR body carries
  the canonical Review Stance section.
- **Plan-to-PR Completion Gate** (in
  [`shared.md`](/docs/agents/planning/shared.md)): walked Goal, Audit
  Findings, Validation Gate; this plan's Status flips `Proposed` →
  `Landed` in the implementing PR.

## Out Of Scope

- Any rewrite reshape in
  [`apps/web/vercel.json`](/apps/web/vercel.json) or
  [`apps/site/next.config.ts`](/apps/site/next.config.ts) — Phase 2.
- Any env-var flip on Vercel projects — Phase 2.
- Any CORS helper update — Phase 2.
- Any Supabase Auth dashboard change — Phase 2.
- The doc-currency update set
  ([`docs/dev.md`](/docs/dev.md),
  [`docs/architecture.md`](/docs/architecture.md),
  [`apps/site/.env.example`](/apps/site/.env.example)) — Phase 2.
- Any change to
  [`apps/web/vercel.json:59-72`](/apps/web/vercel.json) headers block
  — preserved through Phase 2 too.
- The Finding 7 fix (OG/Twitter unfurl URLs pointing at apps/web
  origin) — Phase 2 owns this via the env-var flip.
- Re-flipping the cross-cutting plan's Status — that flips when the
  whole sequence (Phase 1 + Phase 2) lands.

## Risk Register

- **Risk:** the audit missed a customer-visible surface on apps/site
  origin and Phase 2 ships against a latent gap.
  **Mitigation:** the Audit Findings section enumerates the surfaces
  walked, retrieved against the cross-cutting plan's End State table
  at
  [`docs/plans/canonical-origin-resolution.md:144-160`](/docs/plans/canonical-origin-resolution.md).
  A reviewer can re-walk that table against this plan's findings to
  catch any surface not covered.
- **Risk:** the live HTTP responses captured during the audit reflect
  caching behavior that doesn't generalize (e.g., the proxied
  game route returned `x-vercel-cache: PRERENDER` and the
  `X-Robots-Tag` value was a cached emit, not a fresh apps/web
  response).
  **Mitigation:** the `X-Robots-Tag` header value (`noindex, nofollow`)
  matches the apps/web vercel.json rule's emit literally; cache
  staleness would only be a risk if apps/web's headers block had
  recently changed and the cache hadn't warmed against it. The rule
  is ancient by repo-time standards (lands ~2026-05-04 per the
  test-event-noindex-uniformity plan), so cache-vs-fresh is not a
  load-bearing risk here.

## Backlog Impact

No backlog entry to delete. The cross-cutting plan
[`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
already resolves backlog entry "Canonical-origin design conversation"
at
[`docs/backlog.md:80-93`](/docs/backlog.md); that closure happens when
the cross-cutting plan reaches Landed (after Phase 2), not now.
