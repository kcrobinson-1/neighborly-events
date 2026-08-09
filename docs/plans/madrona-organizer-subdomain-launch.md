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
organizer domain is a distinct browser origin, and several systems
gate behavior by origin. Two of them break the event outright: the
edge-function CORS allowlist rejects the origin, so the quiz cannot
mint a check-in code there even at the long `/event/madrona/game`
path that already circulates, and Supabase Auth does not list the
host as a valid redirect target, so sign-in initiated there lands
somewhere else. Both fail regardless of what URL a visitor types.
Short URLs are the visible goal; origin admission is what makes them
worth having.

A third origin-coupled surface — the site's page metadata, which
advertises one origin for every host — turns out **not** to be
fixable at this plan's chosen cost, because the event routes are
statically generated. C4 and C4b record why, and what the plan
accepts instead.

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
- Short paths are the **entry** form: what a visitor types, scans
  off a poster, or pastes into a message. Once inside, links
  rendered by the statically-generated site pages use the long
  path, which resolves identically on the organizer host; the quiz
  SPA's own header keeps short paths because it resolves its mount
  in the browser. See "Short paths are an entry form, not a
  navigation invariant" below for why, and for what the long-path
  tap actually looks like.
- The quiz completes and mints an `MIP-####` code on that origin.
- Organizer and volunteer sign-in initiated from that origin returns
  to that origin.
- Page metadata is unchanged: canonical and Open Graph URLs name the
  site origin on every host, per C4. Retargeting them per host needs
  the same dynamic rendering C4b defers, so it is not in this plan.
- Every other host — the canonical `*.vercel.app` alias, preview
  aliases, localhost — behaves exactly as it does today, including
  the demo index at `/` and the existing long event paths.

## Contracts

### C1. Organizer host mapping (apps/site)

A single table maps an organizer hostname to the event slug it
serves. It has one entry today: `music.madrona.us` maps to the
`madrona` event.

The table has exactly one home in `apps/site`, and two consumers
read it: the short-path rewrites (C2) and — mirrored per C5 — the
client route layer. Metadata is not a consumer, per C4.

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

### C4. Page metadata stays on the canonical site origin

Metadata is **not** retargeted per host. Event pages emit the
site-wide origin in `openGraph.url` and the canonical link on every
host, including the organizer host, and `NEXT_PUBLIC_SITE_ORIGIN`
is not changed.

This is the same constraint C4b names, applied to metadata:
`generateMetadata` runs at build time for a statically generated
route, so it has no request host to branch on. A per-event metadata
base could advertise the organizer host on *both* aliases or the
site origin on both — it cannot advertise a different origin per
host. Only dynamic rendering can, which C4b defers.

**What this costs, stated plainly:** a link shared from the
organizer host renders its preview with the canonical alias as the
URL. Title, description, and image are unaffected, so the preview
is correct in everything except the domain it displays.

**What it does not cost:** the canonical link naming one origin
across both hosts is the behavior `rel="canonical"` exists for — it
tells search engines the two hosts are one page rather than
splitting them as duplicates. Retargeting it per host would have
been the less correct choice on that axis.

**Verified by:** `apps/site/app/layout.tsx` sets a single
`metadataBase` from `resolveMetadataBaseOrigin()`;
`apps/site/app/event/[slug]/page.tsx` `generateMetadata` emits
`openGraph.url` as a relative event path, which resolves against
that one base for every event, and the same file declares
`generateStaticParams` — so both the base and the relative path are
fixed at build time. Retargeting the global instead would make
`harvest-block-party` and `riverside-jam` pages advertise URLs on
Madrona's domain.

### C4b. Short paths are an entry form, not a navigation invariant

The mount resolves from the browser's host, so only code that runs
in the browser can consume it. `apps/site`'s event routes are
statically generated: one HTML document serves every host, and its
link-bearing components render on the server with no host to read.
Those links therefore emit long paths on every host, and this plan
accepts that rather than working around it.

**Verified by:** `apps/site/app/event/[slug]/page.tsx` declares
`generateStaticParams`; `apps/site/components/event/EventHeader.tsx`,
`EventCTA.tsx`, and `EventDayOfLanding.tsx` call the `routes` game
builder, and `EventFeedbackCTA.tsx` and `EventDayOfLanding.tsx`
compose the feedback path, all without a `"use client"` directive —
so all five render on the server.

**The consequence, rendered** (per the "Bans on surface require
rendering the consequence" rule): a visitor opens
`music.madrona.us/`, taps Quiz, and the address bar reads
`music.madrona.us/event/madrona/game`. The page loads, the quiz
plays, and the code mints — the long path is served on the
organizer host exactly as on the canonical alias, because the
site→plugin rewrite is host-agnostic. Once in the quiz the masthead
is rendered by `apps/web` in the browser, so its links return to
short paths. What is lost is address-bar consistency after the
first tap, not reachability.

This is the cheaper of two shapes. Making the event routes
dynamically rendered would let the server read the request host,
which buys **two** things at once: short paths through in-page
navigation, and the per-host canonical and Open Graph URLs C4
declines for the same reason. Both are blocked by the same
constraint and unblocked by the same change, which is why they are
one backlog entry rather than two. The cost is per-request
rendering on the day-of attendee landing page. That trade is
deliberately not taken for one event and is tracked in
[`docs/backlog.md`](/docs/backlog.md) instead.

### C5. The client route layer gains a mount point

`shared/urls` learns that a browsing session may be mounted at an
event root rather than at the site root. The contract splits by
direction, and the two directions ship in separate PRs:

- **Parse side (4a).** Matchers (`matchGamePath` and siblings)
  resolve a path relative to the mount, so a bare `/game` on a
  mapped host matches with the `madrona` slug. Purely additive:
  nothing emits short paths yet, so no rendered output changes.
- **Emit side (4b).** Builders for the route family C2 actually
  rewrites — the event landing, feedback, and game routes — emit
  paths relative to the mount, so the game-route builder yields
  `/game` on the organizer host and `/event/madrona/game`
  everywhere else. **Every other builder keeps emitting long
  paths on every host**, including the per-event admin, redeem,
  and redemptions routes. Those three are valid post-sign-in
  destinations (`AuthNextPath` excludes only the callback route),
  and the auth callback navigates the full document; a
  mount-relative builder would send an organizer to a short path
  C2 does not serve, producing a 404 on the return leg of
  sign-in. Widening the emit set and widening C2's rewrite table
  are the same decision and must move together.
- The mount resolves from the browser's current host against a
  mirror of C1's table. Static table, mirroring the per-event table
  that already lives in `shared/masthead/mastheadContent.ts`.
- **Only `apps/web` consumes the emit side.** `shared/urls` is
  imported by both apps, so the mount must be absent-safe: with no
  browser host to read — every `apps/site` server render — builders
  fall back to long paths rather than throwing or guessing. That
  fallback is what makes C4b's behavior the default instead of a
  bug.
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
header's Home, Quiz, and Feedback links follow the mount wherever a
mount is readable. Per C4b that means the masthead rendered inside
the quiz keeps a visitor on short paths, while the same masthead
rendered by `apps/site` on the landing and feedback pages emits long
paths. External links (`donate`, `emailList`) are unaffected. Links
remain plain anchors — hard navigation — so the site→plugin rewrite
re-evaluates on each crossing.

The landing page's own in-content actions
(`EventDayOfLanding.tsx`, `EventFeedbackCTA.tsx`) are **not**
converted. They are server-rendered, so converting them would change
nothing per C4b, and leaving them as literals keeps the plan from
implying a short-path guarantee it cannot deliver there.

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

**The allowlist is bundled per function, so admission is only as
complete as the redeploy.** **Every edge function the project has —
all ten — bundles `_shared/cors.ts`**, and Supabase deploys them one
at a time. All ten are redeployed together. The contract is
therefore "redeploy the whole function set," not a list to
maintain: any future function reaches the allowlist the moment it
gates on origin, and a list would go stale silently.

Redeploying only the function a probe exercises is the specific
failure this names, and it has two distinct shapes. An attendee on
the organizer host would pass `issue-session`, play the whole quiz,
and take a 403 at completion — the exact "cannot mint a code"
symptom this phase exists to remove, reintroduced one function
later. An organizer signing in on that host would then find that
saving a draft, generating a code, publishing, and unpublishing all
403 as well.

**Verified by:** all ten function directories reach `cors.ts`, by
three different routes — six import it directly in `index.ts`
(`issue-session`, `read-demo-event`, `redeem-entitlement`,
`reverse-entitlement-redemption`, `get-redemption-status`, and
`complete-game` via its own `dependencies.ts` and `response.ts`),
and the remaining four (`save-draft`, `generate-event-code`,
`publish-draft`, `unpublish-event`) reach it indirectly through
`_shared/authoring-http.ts`, which imports `createCorsHeaders` and
`getAllowedOrigin` from it. `createCompleteGameHandler` returns 403
on an unrecognized origin ahead of every other branch.
[`docs/dev.md`](/docs/dev.md) documents deployment as one
`functions deploy` invocation per function, with no all-functions
wrapper in `package.json` or `scripts/`.

The indirect four are the reason this contract names the whole set
rather than an enumeration: a grep for the direct import path finds
six and misses them, which is the error this wording exists to
prevent from recurring.

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

**I6. The set of mount-relative builders equals the set of
rewritten sources.** C2's rewrite table and C5's emit set are two
authoring sites for one answer to "which paths are short on an
organizer host." A builder that emits a short path C2 does not
serve produces a 404; a rewrite with no builder is dead config.
Changing either set changes both in the same PR.

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
| `shared/urls/eventMount.ts` | 4a |
| `tests/shared/urls/eventMount.test.ts` | 4a |

**Modify**

| file | phase |
|---|---|
| `supabase/functions/_shared/cors.ts` | 1 |
| `tests/supabase/functions/cors.test.ts` | 1 |
| `apps/site/next.config.ts` | 3 (root, `/feedback`), 4b (`/game`) |
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
- `apps/site/components/event/EventDayOfLanding.tsx` and
  `EventFeedbackCTA.tsx` — per C6, converting their literal paths
  would change no rendered output while implying a guarantee C4b
  says the plan does not make.

## Phases

**Phase 1 — Origin admission.** C7. One code line, one test, and a
redeploy of **the entire function set** — see C7 for why that is all
ten and not one. Independently verifiable: a credentialed request
from the organizer origin returns an `Access-Control-Allow-Origin`
echo instead of 403. Unblocks the long path immediately, before any
routing work exists.

**Phase 2 — Auth URL configuration.** C8. Console-side plus the doc
updates that record it. No application code. Independent of every
other phase.

**Phase 3 — Organizer host mapping in apps/site.** C1 and C2's root
and `/feedback` rows. The organizer host serves the event landing
and feedback form on short paths. `/game` still resolves only at
its long path. C4 is a no-op contract here — it records that
metadata is deliberately not retargeted, so it adds no work to this
phase.

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
sufficient for that.

It gates no *implementing* phase and may land in any of them or in
its own PR, but it is a required close-out boundary: the failure it
prevents is verifying phase 4b against the wrong event, so the
`Landed` flip cannot claim a verified organizer host while two rows
still answer to the same name. Its validation is part of the
close-out walk — a query of `game_events` returns exactly one row
carrying the Madrona display name, and the decoy's entitlement rows
are still reachable under their own event after the rename (per
R7, the join key is re-derived before the rename targets anything).

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
  checks pass **and the data-hygiene item's validation passes**,
  recording the verification evidence. That same commit deletes the
  scoping doc.

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
a credentialed `OPTIONS` and `POST` from the organizer origin
returns that origin echoed in `Access-Control-Allow-Origin`, and the
same request from an unlisted origin still returns 403 — probed
against **every deployed function**, not only `issue-session`. A
per-function probe is the only check that distinguishes "the
allowlist is right" from "the allowlist is right and every function
has it," and those two states differ by a live 403 at quiz
completion. Enumerating the function set from the filesystem rather
than from a written list is what keeps the probe complete as
functions are added.

**Phase 2:** magic-link sign-in initiated from the organizer host
returns to the organizer host; sign-in from the canonical alias is
unchanged.

**Phase 3:** `npm test` plus `npm run build:site`. On production:
`/` and `/feedback` on the organizer host return the Madrona pages
with the path unchanged; `/event/madrona*` still resolves; the
canonical alias still serves the demo index at `/` and still 404s
`/feedback`. Per C4 the event page's `og:url` and canonical link
name the site origin on **both** hosts; the assertion is that they
are identical across the two, which is the check that would fail if
someone later retargeted `NEXT_PUBLIC_SITE_ORIGIN` to close the
metadata gap the cheap way and pointed the other two events at
Madrona's domain.

**Phase 4a:** `npm test` plus `npm run build:web`. The gate for an
inert change is evidence of inertness: rendered output and emitted
hrefs are unchanged on both hosts.

**Phase 4b:** `npm test` plus `npm run build:web` and
`npm run build:site`. On production: the quiz is playable end to
end from the organizer host's `/game` with the address bar
unchanged, and mints an `MIP-####` code.

Navigation is asserted per C4b's split, not as a blanket
short-path claim — the two legs differ and only one is a short-path
guarantee:

- **From the quiz**, whose masthead renders in the browser: tapping
  Home lands on the organizer host's `/` and Feedback on its
  `/feedback`, both short.
- **From the landing or feedback page**, whose masthead and
  in-content actions render on the server: taps land on
  `/event/madrona/*` and the pages resolve normally. This is the
  accepted behavior, so the assertion is that it *works*, not that
  it is short.

On the canonical alias, `/event/madrona/game` is unchanged and
`/game` still 404s.

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
  defaults as the canonical alias plus localhost, and records that
  an allowlist edit is not live until every function bundling it is
  redeployed (C7). An operator who reads only the code diff has no
  way to infer the deploy scope from it.
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

- Retargeting `NEXT_PUBLIC_SITE_ORIGIN`. It feeds one site-wide
  `metadataBase`, so pointing it at Madrona's domain would make
  `harvest-block-party` and `riverside-jam` advertise URLs there
  too. Per-host metadata needs dynamic rendering, not a retargeted
  global (C4).
- A generic organizer-onboarding self-serve flow. Two table entries
  per host is the deliberate ceiling for one organizer.
- Custom SMTP (R4).
- Dynamically rendering the event routes so server-side code can
  read the request host (C4b). It would make short paths hold
  through in-page navigation, and it costs per-request rendering on
  the day-of attendee landing page. Deferred to
  [`docs/backlog.md`](/docs/backlog.md) rather than decided for one
  event.
- The quiz column width on desktop. Untouched and not newly visible.
- Relocating the game out of `apps/web` into `apps/site`. Considered
  during scoping as the alternative that removes the pathname
  coupling entirely; rejected as reopening the embedding mechanism
  the canonical-origin work settled.

## Backlog Impact

**Short paths not surviving in-page navigation is filed rather than
solved.** C4b records the constraint and the accepted behavior; the
two shapes that would remove it — dynamic rendering, or a
prerendered per-host variant — are tracked in
[`docs/backlog.md`](/docs/backlog.md) under "Tier 2 — Operational
Confidence." The entry names the tradeoff on each shape so the call
can be made against a second organizer rather than for this one.

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
plan's scope: the game route is served by `apps/web` from a single
static document, and C4 leaves event-page metadata unchanged
rather than extending it anywhere.

## Related Docs

- [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
  — establishes the topology; assigns per-event subdomain onboarding
  to each event's launch track. This plan is that track for Madrona.
- [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  "Cross-app navigation" — binds C6's hard-navigation requirement.
- [`docs/dev.md`](/docs/dev.md) "Vercel",
  [`docs/operations.md`](/docs/operations.md) "Supabase" — the
  operator-facing contracts this plan extends.
