# Madrona organizer-subdomain launch

**Status:** `Proposed`

Standalone task plan, N = 4 phases (5 implementing PRs) plus one
independent data item.
Scoping doc:
[`docs/plans/scoping/madrona-organizer-subdomain-launch.md`](/docs/plans/scoping/madrona-organizer-subdomain-launch.md).

## Context

An event organizer has pointed their own domain at this platform.
`music.madrona.us` is a live alias on the `apps/site` Vercel project,
it is going into a newsletter and onto a stage, and today it serves
the internal demo index — a page about two test events. This plan
makes that domain serve the event it belongs to, and makes the event
actually work when reached through it.

The second half is the part that was not obvious. A per-event
organizer domain is a distinct browser origin, and three systems
gate behavior by origin: the edge-function CORS allowlist rejects
it, Supabase Auth does not list it as a valid redirect target, and
the site's page metadata advertises a different origin entirely. All
three fail on that host today regardless of what URL path a visitor
types, so the quiz cannot mint a check-in code there even at the
long `/event/madrona/game` path that already circulates. Short URLs
are the visible goal; origin admission is what makes them worth
having.

Conceptually this touches the site's routing layer, the shared route
and header contracts both apps render from, the attendee game SPA's
notion of where it is mounted, the edge-function trust boundary, and
platform auth configuration. It is the first real exercise of the
per-event organizer subdomain model the canonical-origin work left
as each event's own launch track, so the shapes chosen here become
the template for the next organizer.

## Goal

After all phases land:

- `music.madrona.us/`, `/game`, and `/feedback` serve the Madrona
  event landing, quiz, and feedback form, with the short path
  remaining in the address bar in each case.
- In-page navigation between those three surfaces keeps visitors on
  short paths rather than dropping them onto `/event/madrona/*` at
  the first tap.
- The quiz completes and mints an `MIP-####` code on that origin.
- Organizer and volunteer sign-in initiated from that origin returns
  to that origin.
- Pages served on that origin advertise it as their canonical and
  Open Graph URL.
- Every other host — the canonical `*.vercel.app` alias, preview
  aliases, localhost — behaves exactly as it does today, including
  the demo index at `/` and the existing long event paths.

## Contracts

### C1. Organizer host mapping (apps/site)

A single table maps an organizer hostname to the event slug it
serves. It has one entry today: `music.madrona.us` maps to the
`madrona` event.

The table has exactly one home in `apps/site`, and three consumers
read it: the short-path rewrites (C2), the per-event metadata base
(C4), and — mirrored per C5 — the client route layer.

The module carries no imports, because `next.config.ts` reads it at
config-evaluation time (see R6).

### C2. Short paths resolve via host-conditional config rewrites, not proxy/middleware

`next.config.ts` `rewrites()` gains `beforeFiles` entries, each
conditioned on the request host matching a mapped organizer
hostname:

| source | destination | phase |
|---|---|---|
| `/` | the Madrona event landing route | 3 |
| `/feedback` | the Madrona event feedback route | 3 |
| `/game` | the apps/web deployment's Madrona game route, addressed directly | 4b |

All three are rewrites. No redirect. Sources are literal paths, so
no asset, `_next`, `/api`, or `/assets/*` request can match.

**Verified by:** Next.js documents a `host`-typed condition on
`rewrites` entries, with a worked example conditioning a rewrite on
a literal hostname
(https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites,
"Header, Cookie, and Query Matching").

**Why not a proxy/middleware file:** as of Next.js 16 the
`middleware` convention is deprecated and renamed to `proxy`
(https://nextjs.org/docs/app/api-reference/file-conventions/proxy,
"Migration to Proxy"; the repo is on `next@16.2.12` per
`apps/site/package.json`). Writing a new file against a deprecated
convention is avoidable here: config rewrites express the same
mapping declaratively, add no request-time runtime, sit beside the
existing site→plugin proxy rewrites they compose with, and carry no
matcher to get wrong. `apps/site` has no `middleware.*` or `proxy.*`
file today, so this decision adds no runtime file rather than
replacing one. A proxy file remains the right tool if the mapping
ever needs request-time logic (a DB lookup per R2's migration path);
it is not needed for a static table.

### C3. `/game` renders from the short path, not a redirect

The address bar reads `music.madrona.us/game` after load. This
requires C5's parse side; the C2 row for `/game` ships in phase 4b,
never before 4a.

### C4. Per-event metadata base

Event pages served on a mapped organizer host emit that host in
`openGraph.url` and the canonical link. The site-wide
`NEXT_PUBLIC_SITE_ORIGIN` remains the default for every page not on
a mapped host, and is not retargeted.

**Verified by:** `apps/site/app/layout.tsx` sets a single
`metadataBase` from `resolveMetadataBaseOrigin()`;
`apps/site/app/event/[slug]/page.tsx` `generateMetadata` emits
`openGraph.url` as a relative event path, which resolves against
that one base for every event. Retargeting the global would make
`harvest-block-party` and `riverside-jam` pages advertise URLs on
Madrona's domain.

### C5. The client route layer gains a mount point

`shared/urls` learns that a browsing session may be mounted at an
event root rather than at the site root. The contract splits by
direction, and the two directions ship in separate PRs:

- **Parse side (4a).** Matchers (`matchGamePath` and siblings)
  resolve a path relative to the mount, so a bare `/game` on a
  mapped host matches with the `madrona` slug. Purely additive:
  nothing emits short paths yet, so no rendered output changes.
- **Emit side (4b).** `routes.*` builders emit paths relative to the
  mount, so the game-route builder yields `/game` on the organizer
  host and `/event/madrona/game` everywhere else.
- The mount resolves from the browser's current host against a
  mirror of C1's table. Static table, mirroring the per-event table
  that already lives in `shared/masthead/mastheadContent.ts`.
- Off a mapped host, every matcher and builder behaves
  byte-identically to today.

**Verified by:** `shared/urls/routes.ts` `matchGamePath` requires the
`/event/<slug>/` prefix and returns `null` without it;
`apps/web/src/usePathnameNavigation.ts` reads
`window.location.pathname`; `apps/web/src/App.tsx` `getPageContent`
dispatches on that pathname. The SPA is a static Vite bundle served
through a proxy rewrite, so it cannot be handed request-time
configuration — the browser URL is its only input, which is why the
mount must resolve client-side from the host.

### C6. The event header bar follows the mount

`shared/masthead/mastheadContent.ts` stops hardcoding absolute long
paths and emits its internal destinations through `routes.*`, so the
header's Home, Quiz, and Feedback links stay on short paths for a
visitor who arrived on one. External links (`donate`, `emailList`)
are unaffected. Links remain plain anchors — hard navigation — so
the site→plugin rewrite re-evaluates on each crossing.

**Verified by:** `mastheadContent.ts` `madronaMasthead` sets
`brand.homeHref` and `feedback.href` as absolute long-path literals
while `quiz.href` already goes through the `routes` game builder;
`shared/masthead/EventMasthead.tsx` `PlainAnchor` is the default
renderer and is documented as hard navigation, consistent with
[`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
"Cross-app navigation"; `apps/web/src/App.tsx` `resolveMasthead`
renders it inside the SPA.

### C7. Launched organizer origins are admitted in code

The organizer origin joins `defaultAllowedOrigins` in
`supabase/functions/_shared/cors.ts`. `EXTRA_ALLOWED_ORIGINS`
remains for local and temporary extras only.

**Verified by:** the deployed `functions/_shared/cors.ts` (live
`issue-session`, version 183) carries no organizer origin; the
project's Edge Function Secrets page lists only
`SESSION_SIGNING_SECRET` and `APPS_SITE_VERCEL_SCOPE`, so no env var
mitigates it. `getAllowedOrigin` has two admission paths and the
organizer host reaches neither: the explicit allowlist matches by
exact string, and the preview-alias matcher
(`matchesAppsSitePreviewAlias`, active because
`APPS_SITE_VERCEL_SCOPE` is set) is anchored to the apps/site
project slug under `vercel.app`, which no organizer domain can
satisfy.

### C8. Auth URL configuration names the canonical site origin

Site URL becomes the `apps/site` canonical alias. The organizer host
joins the redirect allowlist as a wildcard-path entry.

**Verified by:** Supabase dashboard → Authentication → URL
Configuration currently sets Site URL to the apps/web
`*.vercel.app` alias with 8 redirect URLs, none matching the
organizer host.
[`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
Goal names the apps/web origin as not customer-facing.

## Cross-Cutting Invariants

**I1. Every host but a mapped organizer host is unchanged.** Each
phase carries at least one assertion on the canonical `.vercel.app`
alias, not only on the organizer host. The failure this prevents is
invisible in any test that exercises only the new host.

**I2. The host→event mapping has one authoring site per layer.**
C1 in `apps/site`, C5's mirror in `shared/`. Two entries, not five.
A third consumer reads an existing one rather than adding a table.

**I3. Short-path support is opt-in per host.** No behavior keys on
"is this a custom domain" or "is this not a `.vercel.app`." Only an
exact hostname in the table changes anything.

**I4. Origin admission precedes anything that depends on it.** No
phase claims a working quiz on the organizer host before C7 is
deployed.

**I5. Parse before emit.** No surface emits a short path before the
matchers accept it. This is what makes 4a inert and 4b the switch.

## Naming

- `eventHostMappings` — the C1 table.
- `resolveEventMount(host)` — C5's host→mount resolution.
- Prose term for a mapped host: **organizer host**. Not "custom
  domain" (Vercel's term for a superset), not "subdomain" (true of
  Madrona, not guaranteed of the next organizer).

## Files to touch

*Estimate of the expected shape at plan time, not a binding rule.
Implementation may revise any row — including moving a file out of
"intentionally not touched" — when a structural call requires it;
deviations are reported per the Plan-to-PR Completion Gate's
Estimate Deviations callout.*

**New**

| file | phase |
|---|---|
| `apps/site/lib/eventHostRouting.ts` | 3 |
| `tests/site/eventHostRouting.test.ts` | 3 |
| `tests/site/event/eventMetadataOrigin.test.ts` | 3 |
| `shared/urls/eventMount.ts` | 4a |
| `tests/shared/urls/eventMount.test.ts` | 4a |

**Modify**

| file | phase |
|---|---|
| `supabase/functions/_shared/cors.ts` | 1 |
| `tests/supabase/functions/cors.test.ts` | 1 |
| `apps/site/next.config.ts` | 3 (root, `/feedback`), 4b (`/game`) |
| `apps/site/app/event/[slug]/page.tsx` | 3 |
| `shared/urls/routes.ts` | 4a (matchers), 4b (builders) |
| `shared/urls/index.ts` | 4a |
| `tests/shared/urls/*` | 4a, 4b |
| `shared/masthead/mastheadContent.ts` | 4b |
| `tests/web/*` (masthead + route render) | 4b |
| `docs/architecture.md`, `docs/dev.md`, `docs/operations.md` | 1, 2, 3 |
| This plan (Status flips) and its scoping doc (deleted) | 4b, close-out |

**Intentionally not touched**

- `apps/web/vercel.json` — the plugin project's own config has no
  role in host mapping.
- Quiz copy, answer key, option order, scoring, check-in-code
  mechanic.
- `NEXT_PUBLIC_SITE_ORIGIN` — per C4.
- DNS, Vercel domain settings, deployment protection.
- `madrona.us/musicintheplayfield` — separate site, separate host.

## Phases

**Phase 1 — Origin admission.** C7. One code line, one test, an
edge-function redeploy. Independently verifiable: a credentialed
request from the organizer origin returns an
`Access-Control-Allow-Origin` echo instead of 403. Unblocks the long
path immediately, before any routing work exists.

**Phase 2 — Auth URL configuration.** C8. Console-side plus the doc
updates that record it. No application code. Independent of every
other phase.

**Phase 3 — Organizer host mapping in apps/site.** C1, C2 (root and
`/feedback` rows), C4. The organizer host serves the event landing
and feedback form on short paths, with correct share metadata.
`/game` still resolves only at its long path.

**Phase 4 — Mount-aware route contract.** Two PRs, split by
direction per I5:

- **4a — parse side.** C5 parse side. `shared/urls` gains the mount
  concept and matchers accept short paths. Nothing emits them, so
  rendered output is unchanged on every host including the organizer
  host. Reviewable as a pure contract-widening diff.
- **4b — emit side.** C5 emit side, C6, C3, and C2's `/game` row,
  shipped together because any subset of them breaks the quiz: a
  builder emitting `/game` before the rewrite exists produces a 404,
  and the rewrite without the masthead change produces a header that
  walks visitors off the short path.

**Branch test on the 4a/4b split** (per the PR-count rule): 4a
touches `shared/urls` plus its tests — 2 subsystems. 4b touches
`shared/urls`, `shared/masthead`, `apps/site/next.config.ts`, and
`apps/web` tests — 4 subsystems, none of them large. Both are under
the >5-subsystem / >300-LOC split threshold, and splitting 4b
further would ship a knowingly broken intermediate state.

**Independent — data hygiene.** `game_events` carries two rows named
"Madrona Music in the Playfield" (`slug='madrona'`, code `MIP`;
`slug='first-sample'`, code `AAB`), and recent completions have gone
to the second. The decoy is **renamed**, not deleted: it holds
`AAB-` entitlement rows, so removing it would orphan real
completion records, and the failure this item prevents is
verification against the wrong event — a distinct name is
sufficient for that. Sequence anywhere; it gates nothing.

## Status lifecycle and close-out

The plan ships across five implementing PRs whose merge order is
knowable in advance (1 and 2 are independent and land first; 3 →
4a → 4b are strictly ordered), so phase 4b is the clearly-last-to-
merge PR and carries the close-out. The **Parallel implementing
PRs** exception is not invoked.

Phase 4b's Validation Gate names checks that structurally cannot
run pre-merge (see "Named constraint on the gate" below), so the
plan takes the **Post-release validation** exception per
[`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
Gate For Plans With Post-Release Validation":

- `Proposed` → `In progress pending organizer-host verification`
  when phase 4b merges. That exact label is this plan's stable
  name for the check; it is used verbatim wherever the status is
  written.
- `In progress pending organizer-host verification` → `Landed` in a
  follow-up doc-only commit once the phase 3 and 4b production
  checks pass, recording the verification evidence. That same
  commit deletes the scoping doc.

## Self-Review Audits

Audits from [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
that map to this plan's diff surfaces, by phase:

- **Platform-auth-gate config audit** (phases 1, 2) — the CORS
  allowlist change and the auth URL configuration are both
  admission-boundary edits.
- **Canonical-owner duplication audit** (phases 3, 4a) — I2
  deliberately accepts two authoring sites for one mapping; this
  audit is the check that the duplication stays bounded and that
  each site is named as a mirror rather than an independent owner.
- **Route or topology coupling audit** (phases 3, 4b) — the
  rewrites and the mount-aware builders both change what URL
  families the platform serves, which is the coupling this audit
  walks against the docs that describe the topology.
- **Validation-command coupling audit** (phases 1, 3, 4b) — the
  gate below names commands and production checks; this audit
  confirms each one exercises the surface it claims.

## Validation Gate

Per phase, `npm run lint` plus the checks below.

**Phase 1:** `npm run test:functions` (the Deno suite covering
`cors.ts`), run from the main checkout — worktrees have no
`node_modules` and the Deno suite cannot resolve there. Post-deploy:
a credentialed `OPTIONS` and `POST` to `issue-session` with the
organizer origin returns that origin echoed in
`Access-Control-Allow-Origin`; the same request from an unlisted
origin still returns 403.

**Phase 2:** magic-link sign-in initiated from the organizer host
returns to the organizer host; sign-in from the canonical alias is
unchanged.

**Phase 3:** `npm test` plus `npm run build:site`. On production:
`/` and `/feedback` on the organizer host return the Madrona pages
with the path unchanged; `/event/madrona*` still resolves; the
canonical alias still serves the demo index at `/` and still 404s
`/feedback`; the event page's `og:url` and canonical link name the
organizer host on that host and the site origin on the canonical
alias.

**Phase 4a:** `npm test` plus `npm run build:web`. The gate for an
inert change is evidence of inertness: rendered output and emitted
hrefs are unchanged on both hosts.

**Phase 4b:** `npm test` plus `npm run build:web` and
`npm run build:site`. On production: the quiz is playable end to
end from the organizer host's `/game` with the address bar
unchanged, mints an `MIP-####` code, and the header bar navigates
between Home, Quiz, and Feedback without leaving short paths. On
the canonical alias, `/event/madrona/game` is unchanged and `/game`
still 404s.

**Asset consequence check (phases 3 and 4b).** Per the
routing/proxy rule in
[`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md)
"Bans on surface require rendering the consequence": verify against
a *production build*, never a dev server, because dev servers
self-serve their own asset paths and hide exactly the cross-project
gap this plan's rewrites could open. A stylesheet under
`_next/static/*`, an `/assets/*` request, and the OG image route
must return identical status and content-type on the organizer host
and the canonical alias.

Phones and laptop both, at ~390px and desktop width, in a private
window.

**Named constraint on the gate:** host-conditional behavior cannot
be exercised on a preview URL, because it keys on a hostname that
resolves only to production. Phases 3 and 4b are verified on
production immediately post-merge, with revert-by-single-commit as
the rollback. Any claim that a preview deploy validated these phases
is false by construction. This constraint is what puts the plan on
the Post-release validation exception recorded above.

## Documentation Currency PR Gate

- Phase 1 updates [`docs/operations.md`](/docs/operations.md)'s
  `EXTRA_ALLOWED_ORIGINS` framing, which currently describes the
  defaults as the canonical alias plus localhost.
- Phase 2 updates the auth-configuration surface in
  [`docs/dev.md`](/docs/dev.md).
- Phase 3 adds the organizer-host onboarding steps to
  [`docs/dev.md`](/docs/dev.md) "Vercel" and the short-path mapping
  to [`docs/architecture.md`](/docs/architecture.md)'s "Vercel
  routing topology".
- Onboarding steps must name all three requirements together —
  Vercel alias, host mapping entry, CORS default plus redeploy —
  because shipping two of three is the failure that produced this
  plan.

## Risk Register

**R1. Rewrite chaining under the `/game` row.** Phase 4b rewrites
`/game` straight to the apps/web deployment, avoiding a chain. If an
implementation instead rewrites to the internal long path and relies
on the existing site→plugin rewrite to fire afterward, note that
Next.js documents `beforeFiles` rewrites as running ahead of the
filesystem check and `afterFiles` rewrites as running behind it,
and that a `rewrites()` function returning a bare array is treated
as `afterFiles`
(https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites).
A `beforeFiles` entry chaining into an `afterFiles` entry is
plausible but unverified here — prefer the direct destination.

**R2. SPA mount resolution is client-side.** C5 resolves the mount
from the browser's host, so the table is duplicated between
`apps/site` and `shared/`. I2 bounds it to two sites; a `game_events`
column with a resolve-by-host path is the migration when a second
organizer arrives, and is deliberately not built now for one host.

**R3. Deployment protection.** Both Vercel projects carry SSO
protection scoped to all deployments except custom domains.
Production aliases serve publicly today and the site→plugin proxy
works, but `apps/web` has no custom domain of its own — tightening
that setting to cover all deployments would break the proxy with no
code change to blame. Record why it is set as it is before the
event.

**R4. Auth email ceiling.** The built-in SMTP service is capped at
2 messages/hour project-wide and is documented as not for production
(https://supabase.com/docs/guides/auth/auth-smtp). Accepted as out
of scope by decision. It resurfaces the moment more than two
magic-link sign-ins are needed in one hour.

**R5. Free-plan project pause.** Assumption, not verified: that
inactivity-pause behavior on the free Supabase plan is not a risk
for a live event. The project is in daily use. Re-check before any
event that follows a long quiet period.

**R6. `next.config.ts` importing a local module is new here.**
Today it imports only the `NextConfig` type from `next`, so C1's
table is the first runtime local import into the config. Next
evaluates the config in Node before the app bundle exists, so the
module must stay dependency-free, and the repo's extension-ful
import convention needs a build check at implementation time.
Fallback if resolution fails: inline the table in `next.config.ts`
and have `apps/site/lib/` import *it*, keeping one authoring site
per I2.

**R7. The decoy event's entitlement rows are keyed by a value that
does not match its slug.** Scoping observed `AAB-` codes under an
`event_id` that is not the decoy row's slug. That is consistent
with `event_id` being an identifier other than the slug, but the
relationship was not read from the schema. The data-hygiene item
re-derives the actual key column before renaming anything, so the
rename does not silently miss the rows it is meant to disambiguate.

## Out Of Scope

- Retargeting `NEXT_PUBLIC_SITE_ORIGIN` (C4 supersedes).
- A generic organizer-onboarding self-serve flow. Two table entries
  per host is the deliberate ceiling for one organizer.
- Custom SMTP (R4).
- The quiz column width on desktop. Untouched and not newly visible.
- Relocating the game out of `apps/web` into `apps/site`. Considered
  during scoping as the alternative that removes the pathname
  coupling entirely; rejected as reopening the embedding mechanism
  the canonical-origin work settled.

## Backlog Impact

**Missing OG tags on `/game` become newly relevant.** An earlier
draft of this plan listed them as "not newly visible," which the
promotion self-review found to be wrong: phase 4b makes the
organizer host's `/game` the short, memorable, shareable form of
the quiz URL, which is exactly the URL people paste into messages.
The absence of OG tags on that route goes from a latent gap to the
rendering of the link people share most.

No backlog entry covered this before now. One is now tracked in
[`docs/backlog.md`](/docs/backlog.md) under "Tier 2 — Operational
Confidence," scoped to the game route's share metadata and naming
this plan as what made it visible. Closing it stays out of this
plan's scope — C4 covers event-page metadata, not the game route's,
and the game route is served by `apps/web` from a single static
document.

## Related Docs

- [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
  — establishes the topology; assigns per-event subdomain onboarding
  to each event's launch track. This plan is that track for Madrona.
- [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  "Cross-app navigation" — binds C6's hard-navigation requirement.
- [`docs/dev.md`](/docs/dev.md) "Vercel",
  [`docs/operations.md`](/docs/operations.md) "Supabase" — the
  operator-facing contracts this plan extends.
