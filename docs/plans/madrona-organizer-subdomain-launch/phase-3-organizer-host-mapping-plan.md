# Phase 3 — Organizer host mapping in `apps/site`

**Status:** `In progress pending organizer-host routing verification`

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

## PR shape and Status lifecycle

One PR, plus a doc-only close-out commit. **This phase is now the
routing change only** — the post-deploy probe runner it originally
carried moved to
[`phase-3b-post-deploy-routing-probes-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-3b-post-deploy-routing-probes-plan.md).

**Why the split, and why it is a phase boundary rather than two PRs
under one plan.** The stakeholder chose to ship the routing change
ahead of the runner, to get the organizer host serving sooner. The
reasoning below still describes that trade correctly and is left
standing rather than rewritten to agree with the outcome — the
split's cost was accepted, not disproven. But a deferral that leaves
a plan requirement outstanding after a merge has to carry its own
`Status`: this phase's label names the deployed verification, and a
reader querying it would not learn that the runner producing that
verification was unwritten. So the runner became phase 3b, with its
own lifecycle, rather than an untracked remainder of this one.

**Verified by:**
[`docs/agents/workflows/plan-implementation.md`](/docs/agents/workflows/plan-implementation.md)
"When the plan says X but reality is Y" requires a plan requirement
that cannot be fully satisfied in the intended PR to be split along a
phase boundary before partial work merges, so each phase's `Status`
can flip independently. Surfaced by Codex review on this phase's
implementing PR, against a first attempt that recorded the split in
this section's prose while leaving both slices under one `Status`.

This phase's `Landed` flip still waits on the run URL phase 3b's
runner produces. That is a dependency between the two phases, not a
shared Status: one passing run satisfies both, and a run that fails
distinguishes them — a runner defect leaves this phase unverified
rather than falsified.

**PR-count branch test**, as this phase now stands: a shared mapping
module, the routing config, a unit test, and the docs each of those
invalidates. The substantive logic is a mapping table and the
derivation that turns it into rewrite rows — well under the LOC
threshold, and one subsystem, since the mapping, test, and docs are
the routing config's own dependents rather than distinct subsystems.
One PR.

**The reasoning that argued against splitting is preserved below**,
because the split's cost was accepted rather than disproven. It was:
landing the mapping alone gives a module with no reader; landing the
probe runner separately gives a check with nothing to check before the
rewrites exist, or one that must merge after the change it validates —
and this phase's Status cannot reach `Landed` without the run that
runner produces, so the split puts the close-out artifact in a
different PR from the plan it closes out. All three still hold. The
first is answered by what shipped: the mapping landed with its reader,
and it is the runner that was deferred, not the mapping. The other two
are the accepted cost.

**Status lifecycle.** This phase's functional checks key on a hostname
that resolves only to production, so they are structurally post-merge
— the parent's named constraint on every routing gate. The phase
therefore takes the **Post-release validation** exception per
[`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed Gate
For Plans With Post-Release Validation":

- `Proposed` → `In progress pending organizer-host routing verification`
  when the implementing PR merges. That exact label is this phase's
  stable name for the check.
- `In progress pending organizer-host routing verification` → `Landed`
  in a follow-up doc-only commit once the post-deploy checks below
  pass, recording the validation run URL those checks produce.

**Why this is not the canonical prod-smoke label**, recorded so the
question is answered once rather than re-argued whenever someone reads
the workflow wiring. The canonical `In progress pending prod smoke`
belongs to plans whose pending check *is* the production smoke; the
gate's own instruction is to name the specific check, and it names two
non-smoke precedents for exactly this situation. Two further reasons
specific to this phase. The label has to be decidable at plan time,
and this plan deliberately leaves the implementer a choice between a
job in the existing deployed-surface workflow and a sibling workflow —
so a label inferred from which workflow file the job lands in would
not be stable, which is the property the gate is protecting. And one
label per plan is what makes the pending state attributable: two plans
pending simultaneously under the same canonical string are
indistinguishable, while the shared `In progress pending` prefix
already answers the cross-plan query the gate cites.

**Verified by:** [`docs/testing-tiers.md`](/docs/testing-tiers.md)
"Plan-to-Landed Gate For Plans With Post-Release Validation" step 1
requires a stable exact-match name for the specific check, names the
canonical prod-smoke string for that case, lists two non-smoke
precedents, and states that the shared prefix is what serves cross-plan
queries. In-repo precedent runs the same way:
[`docs/plans/canonical-origin-resolution-phase-2-plan.md`](/docs/plans/canonical-origin-resolution-phase-2-plan.md)
is a Vercel routing change verified against the deployed origin and
carries `In progress pending deployed-origin verification` rather than
the canonical string, which is the closest analogue to this phase.

**The post-deploy checks run from a committed entry point, so they
produce a run URL.** The canonical gate requires the close-out commit
to record one, on the reasoning that it is durable external evidence
rather than a soft post-merge promise — and a manually-walked probe
produces no such artifact. This phase therefore does not get to
substitute a weaker one or to argue itself an exception: its
post-deploy checks are committed as a runnable check in the
deployed-surface smoke family, dispatchable on demand and re-runnable
against any organizer host, and the URL of the run that passed is what
the close-out records.

This is a scope addition over an earlier draft of this plan, which had
the checks as a manual walk and recorded the production deployment URL
instead. It is worth its cost beyond satisfying the gate: this task is
the first exercise of the organizer-subdomain model and the shapes
chosen here are the template for the next organizer, so a check that
re-runs against a new host is the difference between a template and a
one-time walk-through. The **Files to touch** estimate carries the
surfaces this adds.

**Verified by:** [`docs/testing-tiers.md`](/docs/testing-tiers.md)
"Plan-to-Landed Gate For Plans With Post-Release Validation" step 2
requires the follow-up commit to record the validation run URL, and
[`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md)
"Plan-to-PR Completion Gate" states that a plan-specific carve-out
belongs in the canonical rule rather than in a plan's own Contracts
section — which is what rules out solving this locally.
`.github/workflows/production-admin-smoke.yml` is the existing seam:
it declares `workflow_dispatch` alongside a `workflow_run` trigger on
the Release workflow's completion, targets the `production`
environment, and reads its target origin from a repository variable
rather than a hardcoded host.

**What that seam does not bring with it** is a guarantee that the
deployment under test is live when the run starts — see the
deployment-identity bullet in the Validation Gate, which this phase's
runner has to satisfy on its own. Inheriting the seam's trigger and
its readiness helper without inheriting that gap is the mistake
available here.

This is the same exception phase 1 takes, for a different reason: phase
1's checks wait on the release workflow's function deploy, and this
phase's wait on a hostname that only production resolves. A claim that
a preview deploy validated this phase would be false by construction.

**Verified by:** the parent task plan's "Status lifecycle and
close-out" section, "Named constraint on every routing gate," states
the preview-URL constraint and requires each routing phase's plan to
say so.

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

**"Exact hostname" is a property of the match, not of how the mapping
is spelled.** The mechanism D12 chose compiles each host condition's
value as an anchored pattern rather than comparing it literally, so a
hostname written into the condition unchanged is not matched exactly —
every character in it that carries meaning in a pattern widens the
match. A domain name is mostly literal characters, but its separators
are not, and the resulting near-matches are themselves well-formed
hostnames rather than nonsense. The derivation from mapping to
condition therefore neutralizes the mapping's value so it matches the
hostname and nothing else. This is a property of the derivation, not
of the mapping: hostnames stay written in the mapping the way an
operator would type them.

The consequence if this is missed is a silent I3 violation rather than
a broken page — the mapped host still works, and an unmapped near-match
host silently starts serving the organizer's event. That is why the
Validation Gate's assertion is a **near-match hostname**, not the
mapped-and-canonical pair: a test that exercises only those two passes
either way, so it cannot be the check that catches this.

**Verified by:** `matchHas` in
`node_modules/next/dist/shared/lib/router/utils/prepare-destination.js`
resolves a `host`-typed condition to the lowercased request hostname
with any port stripped, then tests it with a `RegExp` constructed by
anchoring the condition's value at both ends — a construction, not a
string comparison. The emitted `apps/site/.next/routes-manifest.json`
from the drafting-time probe carries the condition's value through
verbatim, so nothing between the config and the matcher neutralizes it.
Surfaced by Codex review on this plan's PR.

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

### C4. Both rows ship ahead of their builders, which is the safe direction

The parent's C3 constrains a rewrite by asking what reaches it, not by
asking whether a builder exists yet, and its ordering rule is
directional: a builder must never ship ahead of the rewrite serving
its path, while a rewrite landing ahead of its builders is inert
rather than broken.

Both rows this phase adds are reached from the moment they ship — the
organizer's root and the feedback path are the two addresses going
into a newsletter and onto printed material, and the address bar is
what reaches them. Nothing emits either one in this phase, because the
parent's C1 ceiling keeps every server-rendered link on long paths and
this phase touches no builder.

**A builder does arrive for these two paths later, and that is
expected.** The emit-side phase makes the event header bar resolve
them on the organizer host, which is a builder arriving for a path
already served — the direction C3 protects. Nothing in this phase's
rows needs to be held back for it.

**What that phase cannot do is retarget the shared destinations in
place, and this plan records why so the constraint is not rediscovered
there.** The per-event masthead table is read by two consumers, not
one: the browser-rendered SPA masthead, and the server-rendered
`apps/site` event landing and feedback pages. Those pages are
statically generated — the parent's C1 ceiling — so one document
serves every host, and a short path written into the shared table
would be emitted on the canonical alias too, where the root is the
demo index and the short feedback path is not the event. That is an
I1 break on the host this phase promises to leave alone. So the
host-aware behavior has to live in the consumer that has a request
host to resolve against, and the shared table's literals stay valid
for the host that has none.

**Verified by:** `shared/masthead/mastheadContent.ts` sets the Madrona
masthead's home and feedback destinations as absolute long-path
literals while its quiz destination routes through the shared game
builder; `shared/masthead/EventMasthead.tsx` renders those
destinations directly as anchor hrefs; and both
`apps/site/app/event/[slug]/page.tsx` and
`apps/site/app/event/[slug]/feedback/page.tsx` call `getEventMasthead`
for the slug they render, so the table's server-rendered consumer is
`apps/site`, not only the SPA. Surfaced by Codex review on this plan's
PR, against an earlier draft of this contract that described the table
as browser-rendered only.

What this phase must not do is add a rewrite for a path whose builder
ships *before or with* it elsewhere. The quiz's short path is that
case: its consumers include the post-sign-in return leg, which
produces a URL and navigates the full document, and its rewrite
depends on a route contract that does not exist until the parse-side
phase. So the honoring check for each row is *what reaches this the
day it ships* — an answer of "nothing until a later phase" disqualifies
the row.

**Verified by:** the parent task plan's C3 carries the directional
ordering rule, and its Phases section assigns the quiz's short-path
rewrite to 4b together with its builders, naming the auth return leg
as the live case for the 404 direction.

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

## Cross-Cutting Invariants

The parent's I1, I2, and I3 bind this phase and are **not** restated
here — a phase plan cites its parent's invariants rather than copying
them. What follows is the layer the parent cannot see: rules that hold
*between the file surfaces this phase and phase 3b touch*. They became
necessary once a probe runner and workflow wiring joined the mapping,
config, test, and docs, and they stayed cross-phase when the runner
moved to 3b — which is the case they were written for, since a rule
holding between two files in one diff is easier to keep than one
holding across two merges. Each breaks silently, with every file
looking correct read on its own.

**L1. The mapping is the only place a hostname or slug is written.**
The config's rewrite rows, the unit test's expectations, the probe
runner's target list, and the topology table's rows all derive from it
or assert against it. The sharp edge is the test: one that hardcodes
the expected hostname passes while asserting nothing about the
derivation, which is worse than having no test, because it reports
coverage the phase does not have.

**L2. Every check surface carries a canonical-host assertion beside
its organizer-host one.** That means the unit test, the local parity
probe, and the production runner each — not one of the three standing
in for the others. They drift independently, and a surface that
exercises only the new host cannot observe the regression the parent's
I1 exists to prevent.

**L3. The emitted rewrite set and the documented topology are one
statement.** The config is authoritative and the topology table
describes it, including which phase each row runs in. A row added to
either alone leaves both internally consistent and jointly wrong.

**L4. Nothing this phase adds resolves a host by pattern.** The
condition matches its mapped hostname exactly (C2), and the runner
selects its targets from the mapping rather than by matching a shape.
An exact-match rule enforced at one surface and approximated at
another is indistinguishable from working until an unmapped near-match
host arrives.

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
independently. Each bullet carries what re-verification found.

**Re-verified: the leaf-module import resolves.** `next` is unchanged
since the drafting probe, and `npm run build:site` completed with the
mapping imported by relative path with a `.ts` extension. C1 holds as
written; the barrel remains unexercised and the implementation did not
need it.

**Re-verified: the standalone entrypoint assembles.** Located under
`.next/standalone` at the tracing-root-relative project path, which in
this worktree checkout is several levels below the top. With the
build's static output and public directory copied alongside it, a
hashed `_next/static` stylesheet returned `text/css` — the precondition
the parity results below rest on.

**Revised: `/assets/*` was reachable, so it carries a pre-merge
absolute assertion after all.** The bullet below anticipated that the
local environment might only manage parity on that class. It managed
more: a real apps/web asset path returned success with its expected
content type, identical on the organizer host, the canonical host, and
a near-match host. Nothing about this class is deferred to post-deploy
for want of local reach; the post-deploy run re-asserts it against the
real hostname, which is a different claim.

**Re-verified: the registered slug.** Read from the registry the
prerender list reads, and asserted against it by the unit test rather
than transcribed.

- **The single-module import still resolves.** C1's result came from a
  probe against the `next` version pinned today, importing a leaf
  module rather than the `shared/urls/index.ts` barrel. Re-run the
  build if `next` has been upgraded since, and treat a barrel import as
  unverified until the build says otherwise. If it stops resolving, the
  parent's I2 allows a second copy — but then this plan's C1 is wrong
  rather than merely inconvenient, and the PR revises it to name which
  side is canonical and to require a test asserting the copies against
  each other, per I2.
- **Serve the build through the generated standalone entrypoint, not
  through the start command.** `apps/site` builds with
  `output: "standalone"`, and the start command emits a caveat that it
  does not work with that setting — it nonetheless serves, which makes
  it an easy and unsupported thing to reach for. The build does emit a
  server entrypoint; it sits under `.next/standalone` at the project's
  path relative to the file-tracing root, which in a worktree checkout
  is several levels deeper than the top level. Locate it rather than
  assuming its depth.

  Two things that make a probe against it lie if skipped: the
  entrypoint needs the build's static output and the public directory
  copied alongside it, and without them **every `_next/static` request
  404s** — which reads as exactly the asset-parity failure this
  phase's gate is looking for, from a setup cause rather than a
  routing one. So the probes confirm they are talking to a
  correctly-assembled build first: a hashed asset under `_next/static`
  returning its stylesheet content type is the cheap confirmation, and
  it is a precondition of the parity result rather than part of it.

  **Verified by:** `apps/site/next.config.ts` sets
  `output: "standalone"`; a drafting-time run located the emitted
  `server.js` under `.next/standalone` at the tracing-root-relative
  project path, started it, and served the root, a hashed
  `_next/static` stylesheet, and the Madrona OG image route at 200
  with their expected content types under both a spoofed organizer
  host and the canonical host, after copying the static output and
  public directory alongside it. An earlier draft of this bullet
  asserted the entrypoint did not exist — a negative produced by a
  depth-limited search rather than by a real absence. Corrected after
  Codex review on this plan's PR.
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
callout. The runner rows this section originally carried moved out
with the runner, to
[`phase-3b-post-deploy-routing-probes-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-3b-post-deploy-routing-probes-plan.md).*

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
| `README.md` | its runtime summary carries the same topology, and became incomplete rather than wrong — a pointer to the owner, not a copy |

The topology table gained a host column and a phase column rather than
only new rows: every pre-existing row had to declare the phase it runs
in, because the phase is what the new rows depend on and a table that
named it for only some rows would read as though the rest had none.

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

## Execution Steps

*Estimate of the expected shape, not a binding rule. Implementation
may resequence when a structural call requires it; deviations are
reported per the Plan-to-PR Completion Gate's Estimate Deviations
callout.*

The repo's implementation workflow already owns the generic gates —
branch state before the first edit, commit boundaries named up front,
continuous validation rather than validation only at the end, an
automated code-review pass before documentation cleanup, docs updated
to describe the reviewed implementation, and a final whole-branch
self-review. Those are not restated here; restating a canonical
workflow inside each plan is how plan docs accrete without adding
constraint. **Verified by:**
[`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Full Structured Path" enumerates each of those gates, and
[`docs/agents/workflows/plan-implementation.md`](/docs/agents/workflows/plan-implementation.md)
carries the Plan-to-PR Completion Gate the implementing PR walks.

What follows is only what is specific to this phase, where getting the
order wrong produces a misleading result rather than a slower one.

1. **Assemble the production build before trusting any local probe.**
   The standalone entrypoint needs the build's static output and
   public directory copied alongside it. Confirm a hashed
   `_next/static` asset returns its stylesheet content type *before*
   running parity or behavior assertions — skipped, every such request
   404s and reads as the asset-parity failure the gate exists to
   catch. This precondition is why it is step one rather than a note
   inside the gate.
2. **Land the mapping, the config derivation, and the unit test
   together, and run the unit test against a deliberately wrong
   mapping once.** A test that passes whether or not the derivation
   reads the mapping is the L1 failure, and the only cheap way to know
   it fails is to make it fail.
3. **Update the topology table in the same commit as the config
   change**, not in the docs pass. They are one statement per L3, and
   separating them is what leaves both internally consistent and
   jointly wrong.

## Commit Boundaries

*Estimate of cohesive review chunks; the implementer can refine.*

Two slices, each reviewable on its own and each leaving the repo
working:

1. The mapping module, the config derivation, the unit test, and the
   topology-table update — the routing change and its proof.
2. The operator-facing doc updates and this plan's Status flip.

Review-fix commits stay distinct from these when that makes the
history easier to follow.

The probe runner, its script entry, and its workflow wiring were a
third slice here before they became phase 3b; the validation-command
lists went with them, because they describe a command that does not
exist until that phase lands.

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
  source (C2); that each host condition matches its mapped hostname and
  **fails to match a near-match hostname** — one that is a well-formed
  hostname differing from a mapped one only where a pattern would
  otherwise absorb the difference, asserted through the same matcher
  the runtime uses rather than by inspecting the condition's spelling
  (C2); and that the existing proxy rows are still in the
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

**Every pre-merge bullet above passed on the routing PR**, against the
standalone production build described in the Reality-check inputs. The
near-match host was probed alongside the mapped and canonical ones, so
the exact-hostname property is asserted at the served level and not
only in the unit test; and the emitted `routes-manifest.json` was read
directly for the phase assertion C3 requires. Two results worth
carrying forward rather than leaving to be re-derived: the proxy rows
still resolve through to the apps/web deployment after the phase
change, and no class had to be deferred to post-deploy for want of
local reach.

**Post-merge — these gate the `Landed` flip.** These run from a
committed entry point, not by hand, so the run that passes is the
artifact the close-out records. That entry point is phase 3b's
deliverable; this phase merges without it, which is what the
`In progress pending organizer-host routing verification` Status
records. The manual walk performed immediately after this phase's PR
merges is a rollback trigger, not a substitute — it produces no run
URL, and the close-out still requires one.

- **Establish deployment identity before any assertion counts.** The
  run confirms the origin is serving the commit under test, and until
  it has, a failing assertion means "not deployed yet" and the run
  keeps waiting within a bound rather than reporting failure. This is
  the discriminator the rest of the post-merge gate depends on: every
  assertion below fails identically against a stale build and against
  a genuinely wrong rewrite, and the plan attaches a rollback to that
  failure — so without an identity check the gate can trigger a revert
  for a deploy that was merely still propagating.

  Two specifics make this a real race rather than a theoretical one.
  The workflow this check joins triggers on the Release workflow's
  completion, and Release synchronizes Supabase only — it neither
  performs nor waits for the Vercel deployment, which the Git
  integration runs independently. And the readiness helper that
  workflow already uses treats any non-error status as ready, which
  the *previous* deployment returns for every path this phase does not
  change. Reusing that helper unchanged would satisfy readiness
  against the old build.

  **Verified by:** `.github/workflows/release.yml`'s only job is named
  for syncing Supabase and its steps link the project, push
  migrations, and deploy functions, with no Vercel step or wait;
  `waitForRouteReady` in
  `scripts/testing/run-production-admin-smoke.cjs` returns as soon as
  a response status is at least 200 and below 400, with its comment
  scoping that contract to transient 404s during propagation.
  Surfaced by Codex review on this plan's PR.
- The two bullets above, re-run against production: on the real
  organizer host, then on the canonical alias. This is the only run
  that exercises the real hostname, so it is the run that can fail for
  reasons a spoofed header cannot reproduce — DNS, alias attachment,
  and deployment protection among them.
- The absolute assertions the local environment could not make,
  including the `/assets/*` class and the existing long event paths
  on both hosts.
- The runner takes its hosts from the mapping and from the canonical
  origin rather than hardcoding either, so the same check re-runs
  against the next organizer host without an edit. A runner that
  passes because it silently probed nothing — an empty host list, a
  skipped class — is the failure this bullet exists to prevent, so it
  reports what it probed and fails on an empty set.
- Rollback if any of these fail **after deployment identity is
  established** is revert-by-single-commit, per the parent's named
  constraint on routing gates. A failure before that point is a
  not-yet-deployed signal and is not grounds for a revert.

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
- **Validation-command coupling audit** — the post-deploy probes add a
  script entry and change a workflow definition, both of which the
  audit's trigger names. Its check is that every doc cataloguing
  validation commands matches the authoritative source, which is why
  the docs listed under "Files to touch — modify" include the
  command-list docs and not only the routing-topology ones.

**Results.** The topology audit ran and pulled in one carrier this
plan had not listed: the root `README.md` summarizes the same
topology, and its summary had become incomplete rather than wrong. It
gained a pointer to the owner rather than a copy of the table, which
is the duplication audit's resolution applied to the same diff. The
validation-command audit's trigger does not fire on this phase — it
adds no script entry and no workflow change — so it moved to phase 3b
along with the command-list docs.

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
