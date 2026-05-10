# Canonical Origin Resolution — Phase 1 Scoping

## Status

In draft.

This is the transient scoping doc for Phase 1 of the cross-cutting plan
at [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md).
The durable phase plan lives at
[`docs/plans/canonical-origin-resolution-phase-1-plan.md`](/docs/plans/canonical-origin-resolution-phase-1-plan.md).
This scoping doc deletes whenever the cross-cutting plan reaches its
terminal state (after Phase 2 lands), per the scoping-doc transience
convention.

## One-paragraph summary

Phase 1 verifies that the apps/site origin
(`https://neighborly-events-site.vercel.app`) renders every customer-
visible surface end-to-end on its own — without depending on apps/web's
cross-app rewrites covering for it — so Phase 2 can flip the canonical
pointer to apps/site without surfacing latent leaks. This is read-mostly
audit work; nothing customer-visible changes; nothing in Phase 2's
scope (rewrite reshape, env-var flip, CORS update, doc-currency sweep)
is in Phase 1's scope.

## Decisions made at scoping time

### Decision 1: Plan-doc location for cross-cutting-plan phases

The in-repo plan layout convention at
[`docs/plans/planning-doc-location.md:14-40`](/docs/plans/planning-doc-location.md)
explicitly names cross-cutting plans (`docs/plans/<name>.md`) and
epic-scoped phase plans
(`docs/plans/epics/<epic-slug>/m<N>-phase-<X>-<Y>-plan.md`). The
convention is silent on **cross-cutting plan phases**.

Chose: durable plan at
`docs/plans/canonical-origin-resolution-phase-1-plan.md` (sibling of the
parent plan), transient scoping at
`docs/plans/scoping/canonical-origin-resolution-phase-1.md`. Reasoning:
(a) the parent plan is itself flat under `docs/plans/`, not under an
epic folder, so following the epic-scoped layout would create a folder
just for this one plan's phases; (b) sibling-of-parent puts the phase
plan where a reader of the parent plan will look first; (c) the
`scoping/` subdirectory matches the pre-convention scoping path named
in [`docs/agents/planning/phase.md:48-52`](/docs/agents/planning/phase.md).
The convention question itself is open per the parent plan's "Related
docs" reference and `planning-doc-location.md`'s "Goal" section; this
scoping pass picked reasonably and moved on rather than re-litigating.

**Verified by:**
[`docs/plans/planning-doc-location.md:14-40`](/docs/plans/planning-doc-location.md),
[`docs/agents/planning/phase.md:46-52`](/docs/agents/planning/phase.md).

### Decision 2: Audit scope is the customer-clickable surface set, not internal asset paths

The cross-cutting plan's End State table enumerates customer-visible
routes ( `/`, `/admin*`, `/auth/callback`, `/event/:slug`,
`/event/:slug/feedback`, `/event/:slug/{game,admin}*`, OG/Twitter image
routes). Phase 1's audit walks each of these on the apps/site origin
and confirms they render. Internal asset-path proxying (`/_next/*`,
`/assets/*`) is not separately audited because the page-level audits
implicitly exercise both — a landing page that returns 200 with a
hydrated DOM transitively confirms `/_next/*` resolves; a proxied game
route that returns the SPA `index.html` transitively confirms
`/assets/*` resolves once the SPA boots in a browser.

**Verified by:**
[`docs/plans/canonical-origin-resolution.md:144-160`](/docs/plans/canonical-origin-resolution.md).

### Decision 3: OG/Twitter unfurl URLs pointing at apps/web origin is current behavior, not a Phase 1 finding

The `metadataBase` resolver at
[`apps/site/app/layout.tsx:59-90`](/apps/site/app/layout.tsx) reads
`NEXT_PUBLIC_SITE_ORIGIN` (currently set to apps/web's hostname per
the documented Phase 2 doc-currency entry at
[`apps/site/.env.example:3-9`](/apps/site/.env.example)). All
URL-shaped Open Graph fields (`og:url`, `og:image`, `twitter:image`)
therefore resolve against apps/web's origin in production output. This
is **expected current behavior**, explicitly the env-var flip Phase 2
ships per
[`docs/plans/canonical-origin-resolution.md:114-122`](/docs/plans/canonical-origin-resolution.md).
Phase 1 records the observation; Phase 2 fixes it.

**Verified by:**
[`apps/site/app/layout.tsx:59-90`](/apps/site/app/layout.tsx),
[`apps/site/.env.example:3-9`](/apps/site/.env.example),
production response observation: `curl -s
https://neighborly-events-site.vercel.app/event/harvest-block-party | grep og:url`
returned an `og:url` whose value resolves against
`neighborly-scavenger-game-web.vercel.app` (the apps/web origin).

### Decision 4: Auth-callback verification is structural, not flow-end-to-end

Verifying that the magic-link sign-in round-trip works end-to-end on
the apps/site origin requires sending a real magic-link email, which
is out of audit scope (it would need a real allowlisted email,
operator coordination, and a manual click). Phase 1 verifies
**structurally**: that the `/auth/callback` page returns 200 on
apps/site origin (it owns the route physically) and that
`requestMagicLink` composes against `window.location.origin` (so a
sign-in flow initiated on apps/site origin returns to apps/site
origin). The end-to-end magic-link flow on apps/site origin is
implicitly already exercised today by anyone who signs in to
`/admin` on a preview-deploy URL — the flow has worked in that shape.

**Verified by:**
[`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/%28authenticated%29/auth/callback/page.tsx),
[`shared/auth/api.ts:44-49`](/shared/auth/api.ts).

### Decision 5: No production code changes in Phase 1

The audit found no customer-visible gap requiring a fix. The single
non-trivial finding (OG/Twitter URLs point at apps/web origin) is
explicitly Phase 2's concern per the cross-cutting plan. Phase 1 ships
docs only — the scoping doc + phase plan doc with audit findings.
Plan Status flips `Proposed` → `Landed` in the same PR; this is the
"no-op audit" outcome the parent plan's "Phase 1 likely covers"
section names as a possible shape.

**Verified by:**
audit findings section of the phase plan doc.

## Reality-check inputs the plan verifies

The phase plan's Audit Findings section pins the following observations
to in-session retrieval. Each is verified by either a code citation
read in this scoping pass or a live HTTP response captured in this
scoping pass. None are hypothetical:

- Production responses on the apps/site origin for the customer-
  visible surfaces (`/`, `/admin`, `/event/harvest-block-party`,
  `/event/harvest-block-party/feedback`, `/auth/callback`, the OG
  image and twitter-image routes, the proxied
  `/event/harvest-block-party/{game,admin,game/redeem}` paths).
- Header propagation through the apps/site → apps/web reverse
  rewrites (specifically `X-Robots-Tag` propagation, which is the
  test-event noindex pairing's load-bearing surface).
- Hardcoded-URL absence in apps/site application code other than the
  documented `APPS_WEB_ORIGIN` rewrite-destination constant.
- Origin-agnostic shape of all customer-clickable hrefs in apps/site
  (no absolute-URL leaks into apps/web's origin from rendered HTML).

## Plan structure handoff

The phase plan owns: Status, Context, Goal, Cross-Cutting Invariants
(inherited from parent plan), Audit Findings (the load-bearing
content), Files to touch, Validation Gate, Self-Review Audits, Out
Of Scope, Risk Register, Backlog Impact. This scoping doc does not
duplicate any of those sections; the phase plan is the durable
artifact.
