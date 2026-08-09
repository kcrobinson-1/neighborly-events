# Scoping: Madrona organizer-subdomain launch readiness

Scoping doc for the task plan at
[`madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md),
whose per-phase contracts live in sibling phase plan files.
Transient — deletes with its sibling plan at terminal PR.

## Context

`music.madrona.us` is CNAME'd and attached to the `apps/site` Vercel
project as a production alias, and it currently serves the platform
demo index. The work was originally framed as one routing change:
map the host's root and two short paths onto the Madrona event
routes. Investigation found the routing change is necessary but not
sufficient — the subdomain is not launch-ready across three
independent systems (Vercel routing, edge-function CORS, Supabase
Auth), and two of the three gaps break the event on that host
regardless of whether short paths ever ship. This scoping records
what was verified, what remains open, and how the work decomposes.

## Decisions made at scoping time

### D1. Scope is subdomain launch readiness, not short-path routing

The four gaps below were each verified independently and none is
downstream of the others. A plan covering only the short paths would
ship a URL that loads a page whose quiz cannot mint a code.

**Verified by:** D5, D6, D7 below, each with its own citation.

### D2. `/` and `/feedback` resolve by rewrite

Both are `apps/site` App Router pages that never read the request
path, so a rewrite is invisible to them.

**Verified by:** `apps/site/app/event/[slug]/page.tsx` and
`apps/site/app/event/[slug]/feedback/page.tsx` exist as App Router
pages; a local `next build` of `apps/site` plus a spoofed-`Host`
probe returned 200 with the Madrona event heading at `/` and the
feedback form at `/feedback`, with the request path unchanged.

### D3. `/game` cannot resolve by rewrite without a shared route-contract change

The long game path is not an `apps/site` page — it is a proxy
rewrite into the `apps/web` deployment. That SPA resolves its route
and event slug from the browser pathname, which under a rewrite
stays `/game` and carries no slug.

**Verified by:** `apps/site/next.config.ts` `rewrites()` maps the
per-slug game path to the apps/web origin;
`shared/urls/routes.ts` `matchGamePath` returns `null` for any path
without the `/event/<slug>/` prefix;
`apps/web/src/usePathnameNavigation.ts` reads
`window.location.pathname`; `apps/web/src/App.tsx` `getPageContent`
dispatches on that pathname.

**Rejected alternative — general prefix rewrite** mapping every
path under the organizer host into the Madrona event subtree: it
captures `_next` assets, the `/assets/*` prefix the apps/web proxy
owns, `/api` routes, and static files, which renders pages without
CSS. Rejected on that basis, not on effort.

### D4. Literal-path sources are the safe rewrite shape; asset parity was probed to confirm it

Any pattern-based source must anticipate every asset shape; a miss
turns a stylesheet request into an HTML document. Enumerating
literal paths means nothing outside the listed literals is rewritten
on any host.

**Verified by:** local probe — hashed `_next/static` CSS, an
`/assets/*` request, the Madrona OG image route, and `/favicon.ico`
returned identical status and content-type on the organizer host and
the canonical apps/site alias.

The probe ran against a middleware prototype, which D12 later
replaced with host-conditional config rewrites. The result carries
forward unchanged: it is evidence about which *sources* are safe to
match, not about the mechanism that matches them. The routing
phase's plan owns the literal-path constraint and re-runs this parity
check against a production build.

### D5. The edge-function CORS allowlist does not admit the subdomain, and nothing mitigates it

Every edge-function call from the organizer origin is rejected with
`403 Origin not allowed.` before handler logic runs. The quiz
cannot issue a session or mint a code on that host at any path —
including the long game path assumed to work today.

**Verified by:** the **deployed** `functions/_shared/cors.ts`
(retrieved from the live `issue-session` function, version 183)
carries `defaultAllowedOrigins` of four localhost hosts plus the
canonical apps/site alias only; the project's Edge Function Secrets
page lists exactly two custom secrets, `SESSION_SIGNING_SECRET` and
`APPS_SITE_VERCEL_SCOPE`, so `EXTRA_ALLOWED_ORIGINS` is unset;
`issue-session/index.ts` `createIssueSessionHandler` returns 403
when `getAllowedOrigin` yields null, ahead of every other branch.
The second admission path in the same file,
`matchesAppsSitePreviewAlias`, is live (its scope env var is set)
but is anchored to the apps/site project slug under `vercel.app`,
so it cannot admit an organizer domain either.

### D6. Supabase Auth URL configuration contradicts the canonical-origin topology

Site URL is the apps/web deployment alias, which the
canonical-origin plan states is not a customer-facing origin. The
redirect allowlist has 8 entries and none matches the organizer
subdomain, so a magic link initiated from the organizer host falls
back to the plugin host.

**Verified by:** Supabase dashboard → Authentication → URL
Configuration: Site URL as described; redirect URLs are the apps/web
alias, the apps/site alias, and six localhost variants.
[`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
Goal section states the plugin origin "is not advertised as a
customer-facing URL."

### D7. Built-in auth email is capped at 2 messages/hour project-wide

This is the volunteer and organizer sign-in path. Three volunteers
signing in at a check-in table exhausts the hour's budget on the
second person.

**Verified by:** Supabase dashboard → Authentication → Rate Limits
shows 2 emails/hour, field not editable on the current plan.
Supabase documents the built-in service as "provided as best-effort
only" and "not intended for production," and states custom SMTP
raises the initial limit to 30/hour, adjustable thereafter
(https://supabase.com/docs/guides/auth/auth-smtp).

### D8. No paid upgrade is required to close any gap in this scope

Custom domains, config rewrites, edge functions, auth redirect URLs,
and secrets are all in use on the current plans. The one item that
could cost money is transactional email, and the documented remedy
is custom SMTP rather than a plan upgrade.

**Verified by:** Supabase organization `kcrobinson` is on plan
`free` with the project `ACTIVE_HEALTHY`; Vercel team is Hobby with
`music.madrona.us` already attached and serving; the SMTP doc cited
in D7 names no tier restriction on custom SMTP.

**Assumption (not verified):** that a free Supabase project's
inactivity-pause behavior is not a risk for a live event. The
project is in daily use; a plan that schedules a long quiet period
before an event should re-check this. Carried into the task plan's
Risk Register.

### D9. `MIP-####` is data-driven, and a same-named lookalike event exists

The code prefix is not in the codebase because it is a column value.
A second event carries the same display name and has been receiving
recent completions.

**Verified by:** `game_events` row `slug='madrona'` has
`event_code='MIP'`; `game_entitlements` holds 12 `MIP-` codes for
`event_id='madrona'` (latest 2026-08-07). `game_events` row
`slug='first-sample'` also carries the Madrona display name with
`event_code='AAB'`, and `game_entitlements` holds 13 `AAB-` codes
under `event_id='madrona-music-2026'` (latest 2026-08-08).

**Not verified:** why the `AAB-` rows' `event_id` differs from the
decoy row's slug. Both values were read directly, but the column's
relationship to `game_events` was not read from the schema, so the
join key was an open question here. It is since settled — the seeding
migration cited under the task plan's data-hygiene item shows the row
carries an `id` distinct from its slug, and the id is what the
entitlement rows reference — so a rename targeting rows by slug would
match nothing.

### D10. Per-origin double-minting is real only where third-party cookies are dropped

Session identity is a cookie on the Supabase functions domain,
mirrored into `localStorage` for browsers that drop it. Where the
cookie survives, identity is shared across hostnames and the
entitlement constraint prevents a second code. Where it is dropped —
Safari/iOS default — the mirror is per-origin and the same person
can mint twice.

**Verified by:**
`supabase/functions/_shared/session-cookie.ts`
`createSignedSessionCookie` emits a cross-site-capable secure
cookie; `apps/web/src/lib/serverSessionToken.ts` mirrors the token
under a versioned `localStorage` key and derives the client session
id from it;
`supabase/migrations/20260403120000_complete_quiz_entitlements.sql`
constrains `raffle_entitlements` unique on event plus client
session id, with no other dedupe axis.

Note the originally-suspected key, the per-event game-session entry
in `apps/web/src/game/gameSessionPersistence.ts`, is device-local
game state, not the identity that keys entitlement.

### D11. The event header bar carries the same coupling as the route layer

`shared/masthead/mastheadContent.ts` holds a per-event table keyed by
slug whose destinations are hardcoded long paths — so a visitor who
arrives on a short path leaves it at the first header tap. Two
consequences: the header is in scope for any true-short-URL shape,
and `shared/` already owns a per-event URL table, which weakens the
objection that host-to-event mapping does not belong there.

**Verified by:** `mastheadContent.ts` `madronaMasthead` sets
`brand.homeHref` and `feedback.href` as absolute long-path literals,
while `quiz.href` already routes through the `routes` game builder;
`shared/masthead/EventMasthead.tsx` `PlainAnchor` renders plain
anchors (hard navigation), and `apps/web/src/App.tsx`
`resolveMasthead` renders it inside the SPA.

### D12. Host-conditional config rewrites replace the proxy/middleware shape

Next.js supports a host-typed condition on `next.config` rewrites,
and as of Next.js 16 the `middleware` file convention is deprecated
in favor of `proxy`. A declarative host-conditional rewrite
expresses the whole mapping with no request-time runtime, no matcher
to get wrong, and no new file written against a deprecated
convention.

**Verified by:**
https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites
"Header, Cookie, and Query Matching" documents the host-typed
condition with a worked example;
https://nextjs.org/docs/app/api-reference/file-conventions/proxy
"Migration to Proxy" documents the rename and deprecation;
`apps/site/package.json` pins `next@16.2.12`.

This supersedes the middleware shape a working prototype used during
scoping, and reframes D4 from a middleware-matcher decision to a
constraint on rewrite sources. The routing phase's plan owns the
final form.

## Open decisions to make at plan-drafting

**All resolved.** Recorded here as handoff outcomes; the durable
shapes live in the task plan and its phase plans, not here.

- **O1 — short-path shape for `/game`.** Resolved to the
  host-aware route contract (true short URL), not a redirect. The
  cheaper redirect shape was justified by schedule pressure that no
  longer applies, and D11 shows `shared/` already carries per-event
  URL data, so the architectural objection was weaker than scoped.
  Relocating the game into `apps/site` was rejected as reopening the
  embedding mechanism the canonical-origin plan settled. Sets a
  4-phase plan. Sub-decision — where host-to-slug lives — resolved
  to a static mapping authored **once**, per the task plan's I2; an
  earlier form of this decision prescribed a copy mirrored into
  `shared/`, which the plan no longer requires and the routing phase
  should not reintroduce. A `game_events` column is the migration
  path at the second organizer.
- **O2 — origin admission location.** Resolved to in-code
  `defaultAllowedOrigins`. An allowlist is authorization surface,
  not a secret; every admitted origin is echoed back in the response
  header regardless. It belongs where it is reviewed and diffable.
- **O3 — Site URL retarget.** Resolved to retarget. The Site URL is
  the fallback for redirects that do not match the allowlist, so
  pointing it at a deployment documented as not customer-facing
  means every fallback lands where users should not be. Low blast
  radius: real flows pass explicit allowlisted redirect URLs.
- **O4 — `NEXT_PUBLIC_SITE_ORIGIN`.** Resolved to leave it alone.
  It feeds one site-wide `metadataBase`, so retargeting it would
  make every other event advertise URLs on Madrona's domain.
  This scoping proposed a per-event metadata base as the
  replacement; plan review found that shape unbuildable at the
  plan's chosen cost, because the event routes are statically
  generated and `generateMetadata` therefore has no request host to
  branch on. The task plan's C1 records the outcome — metadata stays
  on the site origin for every host — and files per-host metadata
  with the dynamic-rendering tradeoff it shares with short-path
  navigation. Review also found that the canonical link this scoping
  assumed alongside `openGraph.url` is not emitted at all, so there
  was never one to retarget; that gap is filed separately, because
  fixing it is compatible with static rendering.
- **O5 — volunteer authentication.** Struck by decision; the
  2-messages/hour ceiling is accepted rather than solved. Carried
  into the plan's Risk Register with the condition that resurfaces
  it. Custom SMTP is therefore out of the plan's phase 2, which is
  auth *URL* configuration only.
- **O6 — lookalike-event cleanup.** Resolved to in scope, as an
  independent data item. It gates no *implementing* phase and may
  land in any of them, but the plan makes it a **required close-out
  boundary**: the `Landed` flip cannot claim a verified organizer
  host while two rows answer to the same display name, because that
  is exactly what would make the phase 4b verification untrustworthy.
  Not optional — see the plan's "Status lifecycle and close-out."

## Plan structure handoff

Outcome after the decisions above resolved — four phases plus one
independent data item, sequenced so each is independently
verifiable and independently revertible. The plan's Phases section
is authoritative; this records what handed over.

1. **Origin admission.** Closes D5, shaped by O2.
2. **Auth URL configuration.** Closes D6, shaped by O3. D7 is not
   closed — O5 struck it, and it carries into the plan's Risk
   Register instead.
3. **Host short paths in `apps/site`.** Closes D2 and applies D4's
   literal-source constraint. The `/game` row is not in this phase;
   O1 put it behind the route contract. O4's metadata half did not
   survive plan review — see O4 — so this phase carries routing
   only.
4. **Host-aware route contract.** Made unconditional by O1's
   resolution, and split into parse and emit PRs by the plan's
   parse-before-emit invariant. Closes D3, and closes D11 only for
   the browser-rendered masthead; the task plan's C1 explains why the
   server-rendered half stays on long paths.

The lookalike-event cleanup (D9) rides along per O6 rather than
being forced into a phase, but is a required close-out boundary
rather than an optional tidy-up. Phases 1 and 2 have no dependency
on the routing work.

## Reality-check inputs

Claims the plan must re-verify at drafting time, because they were
established under conditions the plan cannot assume persist:

- **Rewrite ordering — closed.** Next.js documents `beforeFiles`
  rewrites as running ahead of the filesystem check and `afterFiles`
  as running behind it, with a bare-array `rewrites()` return
  treated as `afterFiles`
  (https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites).
  D12's shape avoids relying on chaining at all — see the plan's
  Risk Register R1. The game proxy path could not be exercised
  locally (the authoring sandbox blocks the `apps/web` origin), so
  the destination still needs a real-deployment check.
- **Host-based behavior cannot be verified on a preview URL.** It
  keys on a hostname that resolves only to production. The plan
  names this as a constraint on its Validation Gate and takes the
  post-release-validation Status exception because of it.
- **Deployment protection.** Both Vercel projects have SSO
  protection scoped to all deployments except custom domains.
  Production aliases currently serve publicly and the site→plugin
  proxy works, so it is not biting — but `apps/web` has no custom
  domain, so tightening that setting would break the proxy with no
  code change to blame. Confirm the setting is understood before the
  event, and record why it is set as it is. Carried as plan R3.
- **Secret list.** D5's conclusion depends on `EXTRA_ALLOWED_ORIGINS`
  remaining unset. Re-read the secrets page at drafting time.
- **Which functions carry the allowlist.** D5 read the module, not
  the set of functions that bundle it. Resolve that set from the
  import graph rather than from a search for the module path —
  functions that reach it through a shared helper do not appear in
  such a search, and a partial redeploy leaves those origins
  rejected. The origin-admission phase plan states the contract that depends on
  this.
- **Deployed-vs-repo drift.** D5 cites the deployed function bundle,
  which matched `main` at the time of reading. Re-confirm if any
  function is deployed in the interim.

## Related docs

- [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
  — establishes the topology this work extends; its Goal section
  names per-event organizer subdomains as siblings of the canonical
  alias, and its Out-of-scope section assigns subdomain onboarding
  to each event's launch track. This scoping is that launch track
  for Madrona.
- [`docs/dev.md`](/docs/dev.md) "Vercel" — the deployment-side
  contract this work adds onboarding steps to.
- [`docs/operations.md`](/docs/operations.md) "Supabase" — owns the
  CORS-allowlist and secrets framing that O2 resolves.
