# Phase 3 — Organizer host mapping in `apps/site`

**Status:** `Proposed`

One PR, plus a doc-only close-out commit.

**PR-count branch test.** The branch exists and the file list is
sketched below under "Files to touch": one new shared module, one
routing config, one test file, two canonical docs. Four surfaces, none
of them a new subsystem, and the substantive logic is a mapping table
plus the derivation that turns it into rewrite rows. Well under the
split thresholds, and splitting mapping from config would land a
module with no reader.

**Status lifecycle.** This phase's functional checks key on a hostname
that resolves only to production, so they are structurally post-merge
— the parent's named constraint on every routing gate. The phase
therefore takes the **Post-release validation** exception per
[`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed Gate
For Plans With Post-Release Validation":

- `Proposed` → `In progress pending organizer-host routing` when the
  implementing PR merges. That exact label is this phase's stable name
  for the check.
- `In progress pending organizer-host routing` → `Landed` in a
  follow-up doc-only commit once the post-deploy checks below pass,
  recording the production deployment URL the checks ran against.

This is the same exception phase 1 takes, for a different reason: phase
1's checks wait on the release workflow's function deploy, and this
phase's wait on a hostname that only production resolves. A claim that
a preview deploy validated this phase would be false by construction.

**Verified by:** the parent task plan's "Status lifecycle and
close-out" section, "Named constraint on every routing gate," states
the preview-URL constraint and requires each routing phase's plan to
say so.

## Context

`music.madrona.us` already resolves to the `apps/site` Vercel project,
and today its root serves the platform demo index — a page about the
platform's sample events. This phase is the change that makes the
organizer's own domain serve the organizer's own event: its root
becomes the Madrona landing page, and one path below it becomes the
Madrona feedback form. Those are the two addresses that go into a
newsletter and onto printed material, and they are short enough to say
out loud.

It happens now because the domain is live and about to be advertised,
and because the two surfaces it covers are the ones that can move
without touching anything else. The quiz's short address needs a change
to the route contract shared between the two apps, which is a later
phase; these two need only the routing layer to know which event this
host belongs to.

Conceptually this touches three things: the routing layer of the
public site, a small piece of shared data saying which hostname stands
for which event, and the operator-facing docs that describe the
routing topology. It changes nothing a visitor sees on any other
hostname.

Parent task plan:
[`madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md).
This phase is bound by its C1 (the static-generation ceiling) and C3
(parse before emit, and emit only what is served), and inherits its
I1, I2, and I3.

**Scoping.** This phase does not carry its own scoping doc and does
not need the narrow-surface carve-out to justify that — the same
position phase 1 takes, and for the same reason: the task's scoping
doc already owns this phase's deliberation. D2 establishes that the
landing and feedback routes resolve by rewrite because neither reads
the request path; D4 establishes that literal-path sources are the
safe rewrite shape and records the asset-parity probe behind that
conclusion; D12 establishes host-conditional config rewrites as the
mechanism, rather than a proxy or middleware file, because the
`middleware` convention is deprecated as of Next.js 16. Those are
exactly the decisions a phase-3 scoping doc would have had to make.
The Reality-check inputs section below is the phase-specific residue —
claims that can drift between the task's scoping and this phase's
implementation, plus the two the drafting session resolved by running
the check.

## Goal

- On the organizer host, the root serves the Madrona event landing and
  one short path below it serves the Madrona feedback form, with the
  requested path unchanged in the address bar.
- On every other host — the canonical `*.vercel.app` alias, preview
  aliases, localhost — nothing changes: the root still serves the demo
  index, the existing long event paths still serve, and the
  plugin-owned proxy rewrites still resolve.
- Which hostname stands for which event is written down once, and the
  routing layer reads it rather than restating it.

Not in this phase's goal, and named here so the phase is not read as
delivering them: the quiz's short address, and any per-host page
metadata. Both are recorded under Out Of Scope with where they go
instead.

## Contracts

### C1. The host→event mapping is one module, and the rewrite set is derived from it

A single module under `shared/urls/` holds the hostname-to-event
mapping. `apps/site/next.config.ts` imports it and derives its
host-conditional rewrite rows from it; it does not restate any
hostname or slug alongside the import. This satisfies the parent's I2
without invoking I2's second-copy allowance.

**Whether one module could serve both sides was an open question at
drafting time, and it was resolved by running the check rather than by
reasoning about it.** `apps/site/next.config.ts` imports only a type
today, so whether Next's config loader resolves this repo's
extension-ful relative-import convention was untested. It does.

**Verified by:** a drafting-time build probe — a throwaway module at
`shared/urls/` imported into `apps/site/next.config.ts` by relative
path with a `.ts` extension, its data mapped into a host-conditional
rewrite row. `npm run build:site` completed (including the build's
TypeScript pass), `npm run lint` passed, and the mapping's hostname and
slug appeared in the emitted `apps/site/.next/routes-manifest.json`.
The probe was reverted; the working tree carries no trace of it. Two
bounds on that result, carried into Reality-check inputs: the probe
imported a **leaf module**, not the `shared/urls/index.ts` barrel, and
it ran against the `next` version `apps/site/package.json` pins today.

### C2. Literal sources, exact hostnames, and nothing else moves

Every rewrite row this phase adds names a **literal path** as its
source — never a pattern, a prefix, or a parameterized segment. Every
row carries an exact-hostname condition drawn from the mapping, so
nothing keys on a host's shape or on "is this not the canonical
alias." The two together are what make the blast radius exactly the
listed literals on exactly the listed hosts: a request that is not one
of those literals is not rewritten on any host, and a request on an
unmapped host is not rewritten at all.

This is D4's constraint and the parent's I3, applied to the mechanism
D12 chose. D4's rejected alternative — a general prefix rewrite
mapping everything under the organizer host into the event subtree —
is what the literal-source rule exists to prevent: it captures asset
prefixes and turns a stylesheet request into an HTML document.

**Verified by:** `apps/site/next.config.ts` `rewrites()` currently
carries parameterized proxy sources for the plugin-owned prefixes and
for `/assets/:path*`, so the asset prefixes a pattern source could
capture are live routing surface, not hypothetical; the scoping doc's
D3 records the prefix-rewrite rejection and D4 the literal-source
conclusion, each with its own probe.

### C3. The new rows run ahead of the filesystem check; the existing rows do not move

The organizer root has to resolve to the event landing even though the
root is a real route on this app, so the new rows run in the
`beforeFiles` phase. Reaching that phase means returning the object
form from `rewrites()` rather than the bare array it returns today,
and the contract on that change is conservative: the existing proxy
rows keep the phase and the relative order they have now. This
phase adds rows; it does not relocate them.

The falsifier is worth naming because it is quiet: if the existing
rows silently changed phase, the plugin-owned routes and the
`/assets/*` proxy would still work in most probes, and the failure
would surface only where a real file or route shadows a proxied path.
The Validation Gate therefore asserts the emitted phase of the
existing rows, not just their presence.

**Verified by:** `apps/site/app/page.tsx` exports a default `Home`
component, so the root is a real route that an `afterFiles` rewrite
would never reach; the drafting-time probe's emitted
`apps/site/.next/routes-manifest.json` placed every existing proxy row
plus the probe row under `afterFiles` with `beforeFiles` empty,
which is the bare-array return's documented treatment
(https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites).

### C4. These rows are served-but-unemitted on purpose, and that is not dead config

The parent's C3 requires that the set of paths emitted as short equal
the set the routing layer rewrites, and calls a rewrite with no builder
dead config. This phase's two rows have no builder and are not dead
config, because their consumer is the address bar: a visitor types,
scans, or pastes them, and the parent's C1 has already established
that nothing server-rendered will link to them. The set of *emitted*
short paths stays empty in this phase, which is the parse-before-emit
direction C3 permits.

The same reasoning does not extend to the quiz's short path, and that
asymmetry is why it waits. Its consumers include the post-sign-in
return leg and the event header bar, both of which produce a URL rather
than receiving one — so for that row, a rewrite without its builders,
or builders without the rewrite, is the failure C3 describes. This
phase must not add that row on the theory that it is the same shape as
these two.

**Verified by:** the parent task plan's C3 and its phase 4b
description, which requires the builders, the header bar, and the
quiz's short-path rewrite to ship together for exactly this reason.

### C5. Every claim this phase makes about routing is a claim about a production build

Any check that concludes something about how these rewrites behave runs
against a production build of `apps/site` served locally, or against
production itself. A dev server is not an acceptable substitute for any
of them, because it self-serves its own asset paths and would hide the
cross-project asset gap this phase's rewrites could open — the failure
mode the "Bans on surface require rendering the consequence" rule
records for routing and proxy changes.

**Verified by:** [`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md)
"Bans on surface require rendering the consequence" binds routing,
proxy, and CDN config changes to a production build of the destination
app and records the M2 phase 2.3 case where a dev-server check hid a
missing asset proxy rule until pre-merge review.

## Naming

The mapping module is `shared/urls/organizerHosts.ts`. `shared/urls/`
is the home rather than `shared/events/` because the mapping is URL
topology — which hostname stands for which event's route subtree — and
`shared/urls/` already owns the canonical route table and matchers that
phase 4 will extend to read this same mapping. Whether the module is
re-exported from `shared/urls/index.ts` is an implementation call; the
drafting-time probe exercised the leaf-module import only.

**Verified by:** `shared/urls/index.ts`'s module header states that
`shared/urls/` owns the canonical route table, route matchers, and
pathname normalization, and that the exported route object is the
single source of truth for every cross-app URL family;
`shared/events/index.ts`'s header scopes that package to event-domain
reads, admin writes, and projection types.

## Reality-check inputs

Claims this phase rests on, to re-verify at implementation time
because they were established against surfaces that move
independently.

- **The single-module import still resolves.** C1's result came from a
  probe against the `next` version pinned today, importing a leaf
  module rather than the `shared/urls/index.ts` barrel. Re-run the
  build if `next` has been upgraded since, and treat a barrel import as
  unverified until the build says otherwise. If it stops resolving, the
  parent's I2 allows a second copy — but then this plan's C1 is wrong
  rather than merely inconvenient, and the PR revises it to name which
  side is canonical and to require a test asserting the copies against
  each other, per I2.
- **Serving a production build locally is not the obvious command.**
  `apps/site` builds with `output: "standalone"`, and at drafting time
  the start command printed a caveat that it does not work with that
  setting while nonetheless serving the built output, and the
  standalone directory the build produced carried no server entrypoint
  to use instead. So the parity and behavior probes below first confirm
  they are talking to build output — a hashed asset under
  `_next/static` returning its stylesheet content type is the cheap
  confirmation — before any of their results are trusted. **Verified
  by:** `apps/site/next.config.ts` sets `output: "standalone"`; the
  drafting-time build log and the resulting `.next/standalone`
  directory listing are the source of the caveat and the missing
  entrypoint.
- **The `/assets/*` destination may be unreachable from the
  implementer's environment.** It proxies to the apps/web deployment,
  and the scoping doc records that the game proxy path could not be
  exercised from the authoring sandbox. This does not invalidate the
  parity comparison — see the discriminator in the Validation Gate —
  but it does mean the absolute assertion on that class lands
  post-deploy rather than pre-merge.
- **The event's registered slug.** The mapping's value has to be the
  slug `apps/site` prerenders the event under, not the event's display
  name and not the identifier the entitlement rows carry. The parent's
  data-hygiene item records that a second row answers to the same
  display name, and that a row's slug and id hold different values.
  Read the slug from the registry the prerender list reads.

## Files to touch

*Estimate of the expected shape, not a binding rule. Implementation
may revise any row when a structural call requires it; deviations are
reported per the Plan-to-PR Completion Gate's Estimate Deviations
callout.*

**New**

| file | why |
|---|---|
| `shared/urls/organizerHosts.ts` | the mapping, per C1 and Naming |
| `tests/shared/urls/organizerHosts.test.ts` | the assertions named in the Validation Gate |

**Modify**

| file | why |
|---|---|
| `apps/site/next.config.ts` | the host-conditional rows, per C2 and C3 |
| `docs/architecture.md` | "Vercel routing topology" — the routing authority's prose |
| `docs/dev.md` | "Vercel" — the onboarding step this phase contributes |

**Intentionally not touched**

- `shared/masthead/` and `shared/urls/routes.ts`. The header bar's
  hardcoded long paths and the route matchers are phase 4's surface;
  touching either here would emit or accept short paths ahead of the
  phase that owns both directions.
- Every metadata surface — the root layout's metadata base, the event
  routes' metadata emit, and the file-convention image routes. Per the
  parent's C1 these do not vary by host, and this phase must not
  promise that they do.
- `apps/web` and its Vite config. Nothing in this phase changes what
  the plugin deployment serves or how it is reached.
- `apps/site/vercel.json`. It carries deployment-enablement settings,
  not routing; the routing authority is the Next config.
- `supabase/functions/`. Origin admission is phase 1's surface.

## Validation Gate

**Pre-merge — these gate the PR.**

- `npm run lint`.
- `npm run build:site`. This phase touches `apps/site`, and
  `npm run build:web` is workspace-scoped to the Vite SPA, so it does
  not cover this diff. **Verified by:** the root `package.json`
  `scripts` entry for `build:web` targets the `@neighborly/web`
  workspace and `build:site` targets `@neighborly/site`.
- `npm test`. The new test asserts, against the rewrite set the config
  actually produces: that every host-conditional row's hostname and
  destination trace back to a mapping entry and none is written
  alongside it; that every mapped slug is a registered event slug; that
  every row this phase adds carries a host condition and a literal
  source (C2); and that the existing proxy rows are still in the
  `afterFiles` phase in the emitted order (C3). **Verified by:** a
  drafting-time probe — a throwaway test under `tests/site/` imported
  `apps/site/next.config.ts` and awaited its `rewrites()` under
  `npx vitest run`, which passed; the probe was reverted.
  `tests/site/event/eventRoutes.test.ts` is the existing precedent for
  a test that reads `apps/site` structure directly rather than rendered
  output.
- **Asset parity against a production build.** With `apps/site` built
  and served as a production build per C5, and the request host spoofed
  in turn to the organizer host and to the canonical host: a hashed
  stylesheet under `_next/static`, a request under the `/assets/*`
  prefix, and the Madrona OG image route each return **identical status
  and content-type on both hosts**. This is the check that the literal
  sources did not capture an asset shape.
  - **Parity alone is not sufficient, and the gate says why.** Two
    hosts can compare equal by failing identically — a `/assets/*`
    request whose destination the local environment cannot reach
    returns the same error on both, and parity passes while proving
    nothing about the rewrite. The gate therefore also requires an
    **absolute** assertion on every class the local environment can
    serve: expected success status and expected content type, not
    merely agreement. Classes that cannot carry an absolute assertion
    locally are named in the PR body and carry it post-deploy instead.
- **Short-path behavior against the same production build.** With the
  host spoofed to the organizer host, the root returns the Madrona
  landing and the short feedback path returns the Madrona feedback
  form, each at success status with the requested path unchanged. With
  the host spoofed to the canonical host, the root still returns the
  demo index and the short feedback path does **not** resolve to the
  event — the parent's I1, asserted on the same run rather than assumed
  from the organizer-host result.

**Post-merge — these gate the `Landed` flip.**

- The two bullets above, re-run against production: on the real
  organizer host, then on the canonical alias. This is the only run
  that exercises the real hostname, so it is the run that can fail for
  reasons a spoofed header cannot reproduce — DNS, alias attachment,
  and deployment protection among them.
- The absolute assertions the local environment could not make,
  including the `/assets/*` class and the existing long event paths
  on both hosts.
- Rollback if any of these fail is revert-by-single-commit, per the
  parent's named constraint on routing gates.

## Self-Review Audits

From [`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- **Route or topology coupling audit** — its trigger is a commit that
  touches Next.js routing configuration, which is this diff's center.
  The audit's dangerous pattern is prose describing one topology while
  the config encodes another, and this diff makes the topology
  host-dependent for the first time.
- **Canonical-owner duplication audit** — this diff edits two canonical
  docs on the same topic. The audit's resolution is to expand the
  table-named owner and leave the non-owner pointing at it, which is
  the shape those two docs already have for routing today.

## Risks

**R1. The phase change is the part a probe can miss.** Moving from the
bare-array return to the object form is a one-line structural change
that could silently relocate the existing proxy rows. Most probes would
still pass, because those routes have no file shadowing them. The
compensating control is the manifest assertion in the Validation Gate,
which reads the emitted phase rather than the served result.

**R2. This phase's mapping has exactly one consumer today.** C1's
single-source claim is cheap to hold with one reader and gets tested
for real in phase 4, when the route layer reads the same module from a
different app's build. If it turns out it cannot, that is the moment
the parent's I2 second-copy allowance applies — in phase 4's plan, with
its canonical side named and its copies asserted against each other.
Nothing in this phase should pre-commit that decision.

**R3. Landing this phase does not launch the host.** The organizer host
serves two surfaces at short paths after this merges. The quiz's short
path does not exist, and in-page navigation still walks a visitor onto
long paths at the first tap — the parent's C1, accepted deliberately.
Nothing here should be read as "the organizer host is launched."

## Documentation Currency PR Gate

- [`docs/architecture.md`](/docs/architecture.md) "Vercel routing
  topology" describes a topology whose rules are host-independent and
  whose table has no host column. This phase makes that false. The
  table gains the host-conditional rows, and the surrounding prose
  gains the phase distinction the first-match-wins note does not
  currently make — `beforeFiles` rows are matched ahead of the
  filesystem, which is what lets a rewrite win against a real route.
- [`docs/dev.md`](/docs/dev.md) "Vercel" carries the onboarding steps
  for the two-project layout and today names the alias and the proxy
  rewrites. This phase adds the mapping-entry step. The parent's
  Documentation Currency gate requires that section to name every
  organizer-onboarding requirement together — alias, mapping entry, and
  origin admission plus redeploy; this phase contributes the middle
  one, and phases 1 and 2 contribute the others. Per the canonical-owner
  audit, the topology detail stays in `docs/architecture.md` and this
  section links to it.

**Verified by:** `docs/architecture.md` "Vercel routing topology"
carries a path/destination/lifetime table whose rows are all
host-independent, and states that rewrites apply in file order with
most-specific first; `docs/dev.md` "Vercel two-project monorepo layout"
already delegates the full topology to that section rather than
restating it.

## Out Of Scope

Boundary calls recorded as final answers; each names where the work
actually goes.

- **The quiz's short path.** It ships in phase 4b and never before
  phase 4a, per the parent's C3 and this plan's C4. **Verified by:**
  the parent task plan's Phases section defines 4a as the parse side
  and 4b as the emit side, and requires the builders, the header bar,
  and the rewrite to ship together in 4b.
- **Per-host page metadata.** No metadata is retargeted per host, and
  no canonical link is added. The event routes are statically
  generated, so the metadata function has no request host to branch on
  — the parent's C1 records this as a ceiling, not an omission. The
  navigation-and-share-metadata pair is filed in
  [`docs/backlog.md`](/docs/backlog.md) as "Organizer hosts can't get
  host-specific paths or share metadata," with its candidate
  shapes and their tradeoffs; the absent canonical link is filed
  separately as "No page emits a canonical link, and two hosts now
  serve the same content," because that fix is compatible with static
  rendering and independent of the ceiling. **Verified by:** both
  entries exist under "Tier 2 — Operational Confidence" in
  `docs/backlog.md` with the headings quoted above.
- **In-page navigation staying on short paths.** Same ceiling, same
  backlog entry as above. What this phase delivers is the entry form,
  which is what the parent's C1 already renders as the accepted
  consequence.
- **A general prefix rewrite for the organizer host.** Rejected at
  scoping on the asset-capture grounds C2 restates, not on effort.
  **Verified by:** the task's scoping doc D3 records the rejection with
  the captured prefixes named.
- **A second organizer host, and any self-serve onboarding for one.**
  The mapping's shape admits more entries, but nothing in this phase
  generalizes beyond adding one. The parent's Out Of Scope names one
  mapping entry per host as the deliberate ceiling for one organizer,
  and the scoping doc's O1 names a `game_events` column as the
  migration path at the second organizer.

## Related Docs

- [`madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md)
  — parent task plan; owns C1, C3, I1, I2, I3 and the close-out.
- [`scoping/madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/scoping/madrona-organizer-subdomain-launch.md)
  — owns this phase's deliberation at D2, D4, and D12.
- [`phase-1-origin-admission-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-1-origin-admission-plan.md)
  — the sibling phase this one is ordering-independent of. Neither
  surface this phase routes calls an edge function: the landing page
  is server-rendered, and the feedback form submits through a Supabase
  RPC rather than a function, so phase 1's origin admission is not a
  prerequisite for either. It is a prerequisite for the quiz, which is
  phase 4's surface. **Verified by:** the feedback form component under
  `apps/site/app/event/[slug]/feedback/` submits via a Supabase client
  RPC call; the landing and feedback route modules carry no
  `"use client"` directive at their page level.
- [`docs/architecture.md`](/docs/architecture.md) "Vercel routing
  topology" — the canonical prose this phase's config change must stay
  true to.
