# Madrona organizer-subdomain launch

**Status:** `Proposed`

Task plan with separated phase plan files, N = 4 phases plus one
independent data item. Per-phase contracts, file inventories, and
per-phase validation live in the phase plans, which are drafted
just-in-time before each phase's implementation; this doc owns what
has to hold *across* phases, including the acceptance walk under
Validation Gate that no single phase can run.

Scoping doc:
[`scoping/madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/scoping/madrona-organizer-subdomain-launch.md).

## Context

An event organizer has pointed their own domain at this platform.
`music.madrona.us` is a live alias on the `apps/site` Vercel project,
it is going into a newsletter and onto a stage, and today it serves
the internal demo index — a page about the platform's test events,
not about Madrona at all. This plan makes that domain serve the event
it belongs to, and makes the event actually work when reached
through it.

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

Conceptually this touches the site's routing layer, the shared route
and header contracts both apps render from, the attendee game SPA's
notion of where it is mounted, the edge-function trust boundary, and
platform auth configuration. It is the first real exercise of the
per-event organizer subdomain model the canonical-origin work left
as each event's own launch track, so the shapes chosen here become
the template for the next organizer.

## Goal

After all phases land:

- The organizer host serves the Madrona landing, quiz, and feedback
  surfaces at short paths, and those paths stay in the address bar
  when a visitor arrives on one.
- The quiz completes and mints an `MIP-####` code on that origin.
- Organizer and volunteer sign-in initiated from that origin returns
  to that origin.
- Every other host — the canonical `*.vercel.app` alias, preview
  aliases, localhost — behaves exactly as it does today, including
  the demo index at `/` and the existing long event paths.

What the plan deliberately does **not** promise is bounded by C2
below: short paths are the form visitors arrive on, not an invariant
that survives every in-page tap.

## Cross-Phase Contracts

Only contracts that bind more than one phase live here. Everything
scoped to a single phase — rewrite sources, builder signatures,
masthead destinations, function deploy mechanics, metadata fields —
belongs to that phase's plan.

### C1. The host→event mapping has one authoring site

An organizer hostname maps to the event slug it serves. That mapping
is authored **once**. Every consumer — the routing layer's rewrites
and the client route layer's mount resolution — reads that one
source rather than restating it.

**A single shared module is the target shape**, and the routing
phase's plan owns proving it. `shared/` is the natural home: it is
already imported by both apps, and `shared/masthead/mastheadContent.ts`
already carries a per-event table there. The open question is whether
Next's config loader resolves a `shared/` import under the repo's
extension-ful convention, since `apps/site/next.config.ts` imports
only the `NextConfig` type today and has never pulled in a local
module. That is a build check, not a design question, and it belongs
to the phase that writes the import.

**If and only if that resolution fails**, the fallback is a second
copy — and it is a copy under an explicit no-drift obligation, not
an independent owner: the phase that introduces it says which side is
canonical and asserts the two against each other in tests. A
duplicated mapping that silently disagrees would let the rewrite and
the emitted paths resolve different events, which is why the
single-source shape is the target rather than merely the tidier
option.

When a second organizer arrives, a `game_events` column with a
resolve-by-host path replaces whatever shape this lands on; it is not
built now for one host.

**Verified by:** `apps/site/app/event/[slug]/page.tsx` imports
`shared/masthead`, `shared/styles`, and `shared/urls` by relative
path with `.ts` extensions, so app-layer code already consumes
`shared/`; `apps/site/next.config.ts` imports only a type today, so
the config loader's behavior on such an import is untested here
rather than known to fail.

### C2. Short paths are an entry form, not a navigation invariant

The mount resolves from the browser's host, so only code running in
the browser can consume it. `apps/site`'s event routes are statically
generated — one HTML document serves every host — so their
server-rendered links and their build-time metadata cannot vary by
host. This plan accepts that ceiling rather than working around it,
and no phase may promise behavior that requires crossing it.

**The consequence, rendered** (per the "Bans on surface require
rendering the consequence" rule): a visitor opens the organizer
host's root, taps Quiz, and the address bar moves to the long event
path. The page loads, the quiz plays, and the code mints — the long
path is served on the organizer host exactly as on the canonical
alias, because the site→plugin rewrite is host-agnostic. Inside the
quiz, whose header renders in the browser, links return to short
paths. What is lost is address-bar consistency after the first tap,
not reachability.

The same ceiling applies to page metadata, which is why no phase
retargets `openGraph.url` per host and none adds a canonical link.

**Verified by:** `apps/site/app/event/[slug]/page.tsx` declares
`generateStaticParams` and its `generateMetadata` emits
`openGraph.url` as a relative path against the single `metadataBase`
set in `apps/site/app/layout.tsx`; the event landing and CTA
components under `apps/site/components/event/` carry no
`"use client"` directive, so they render on the server. Lifting the
ceiling means rendering the event routes dynamically, which is
tracked in [`docs/backlog.md`](/docs/backlog.md) rather than decided
for one event.

### C3. Origin admission precedes anything that depends on it

No phase may claim a working quiz, or a working sign-in, on the
organizer host before that origin is admitted at the edge-function
and auth-configuration boundaries. This is a sequencing contract, not
a routing one: the admission phases are independent of every routing
change and land first.

**Verified by:** the deployed `functions/_shared/cors.ts`, read from
the live `issue-session` bundle, carries no organizer origin, and
`getAllowedOrigin` admits only exact-string allowlist matches plus
apps/site Vercel preview aliases — neither of which an organizer
domain can satisfy. Supabase's Authentication → URL Configuration
sets Site URL to the apps/web alias, and no redirect entry matches
the organizer host.

### C4. Parse before emit

No surface emits a short path before the route matchers accept one.
This is what lets the parse-side phase land inert and makes the
emit-side phase the switch.

### C5. The set of mount-relative builders equals the set of rewritten sources

The routing layer's rewrite table and the route layer's emit set are
two authoring sites for one answer to "which paths are short on an
organizer host." A builder that emits a short path the rewrites do
not serve produces a 404 — the auth return leg is the live case,
since post-sign-in destinations navigate the full document. A
rewrite with no builder is dead config. Changing either set changes
both, in the same PR.

## Cross-Cutting Invariants

**I1. Every host but a mapped organizer host is unchanged.** Each
phase carries at least one assertion on the canonical `.vercel.app`
alias, not only on the organizer host. The failure this prevents is
invisible in any test that exercises only the new host.

**I2. Short-path support is opt-in per host.** No behavior keys on
"is this a custom domain" or "is this not a `.vercel.app`." Only an
exact hostname in the mapping changes anything.

**I3. Admission is only as complete as the deploy.** Where a trust
boundary is compiled into more than one deployable unit, every unit
that carries it is redeployed together, and membership is resolved
from the import graph rather than from a search for the module path.
A partial rollout leaves the origin rejected on whichever surface was
missed, which reads as a working launch until someone reaches that
surface.

## Naming

- **Organizer host** — a hostname mapped to an event. Not "custom
  domain" (Vercel's term for a superset), not "subdomain" (true of
  Madrona, not guaranteed of the next organizer).
- **Mount** — the path prefix a browsing session is rooted at: the
  event root on an organizer host, the site root everywhere else.

## Phases

Each phase's plan file is drafted before that phase's implementation
starts, per the just-in-time rule, and carries its own Contracts,
Files to touch, Validation Gate, and Self-Review Audits. Phase 1's
plan is drafted; the rest are named here with the outcome they own so
the sequencing is reviewable now.

**Phase 1 — Origin admission at the edge-function boundary.**
[`phase-1-origin-admission-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-1-origin-admission-plan.md).
Admits the organizer origin to the edge functions. Independently
verifiable and independently revertible, and it depends on nothing
else, which is why it goes first.

It is **not** independently valuable, and an earlier draft of this
plan said it was. Nobody reaches the organizer host for Madrona until
phase 3 makes it serve the event — the host still returns the demo
index until then — so admitting the origin ships no outcome a visitor
or organizer can observe on its own. That is what keeps it a phase
under the task/phase picker rather than a task in its own right: it
is a sequence step toward one outcome, not a unit with standalone
stakeholder value. The same holds for phase 2, whose auth
configuration is unobservable until there is a reason to sign in from
that host.

**Phase 2 — Auth URL configuration.** Retargets Site URL to the
canonical site origin and admits the organizer host to the redirect
allowlist. Console-side plus the docs that record it; no application
code. Orderable independently of every other phase — it shares no
surface with them — which is a statement about sequencing freedom,
not about standalone value.

**Phase 3 — Organizer host mapping in `apps/site`.** The organizer
host serves the event landing and feedback surfaces at short paths.
The quiz still resolves only at its long path, because the short form
depends on the route contract phase 4 introduces.

**Phase 4 — Mount-aware route contract.** Splits into two PRs by
direction, per C4:

- **4a — parse side.** The shared route layer gains the mount concept
  and matchers accept short paths. Nothing emits them, so rendered
  output is unchanged on every host. Reviewable as a pure
  contract-widening diff.
- **4b — emit side.** Builders, the event header bar, and the quiz's
  short-path rewrite ship together, because any subset breaks the
  quiz: a builder emitting a short path before the rewrite exists
  produces a 404, and the rewrite without the header change produces
  a header that walks visitors back off short paths.

**Sizing note.** The 4a/4b split is set by the parse-before-emit
contract rather than by diff size; both sit well under the
subsystem and LOC thresholds the PR-count rule uses, and splitting
4b further would ship a knowingly broken intermediate state. Each
phase plan runs its own branch test against the code as it stands
when that plan is drafted — the counts here are not carried forward
as estimates.

**Independent — data hygiene.** `game_events` carries two rows with
the Madrona display name, and recent completions have gone to the
decoy. It is renamed rather than deleted, because it holds real
entitlement rows that a delete would orphan and a distinct name is
enough to prevent the failure that matters: verifying a phase against
the wrong event.

**The rename has to be durable, not applied to production only.** The
decoy is seeded by a migration, so any environment rebuilt from
migrations restores the duplicate name — a dashboard edit would
satisfy a production check while every fresh database immediately
reintroduces the condition. The durable outcome this item owns is
that a database built from migrations has one row carrying the
Madrona display name; the mechanism is the implementing phase's call.

**Verified by:**
`supabase/migrations/20260406130000_add_published_quiz_content.sql`
inserts the `first-sample` row with the Madrona display name. The
same insert also answers R5: it sets an `id` distinct from the slug,
which is the value the entitlement rows key off.

It gates no implementing phase and may ride in any of them, but it
**must land no later than phase 4b** — both because 4b's verification
depends on it, and because letting it trail 4b would make 4b not the
last implementing PR.

## Validation Gate

Each phase carries its own gate; this one is the acceptance walk for
the task as a whole, run once at close-out. It exists because the
Goal's outcomes are the *composition* of the phases — no single phase
plan owns "a visitor can do the whole thing on this host," and a task
whose phases each pass individually can still fail as a journey.

On production, on the organizer host, in a private window, on a phone
and a laptop:

- **The attendee journey, unbroken.** Arrive at the short root, reach
  the quiz, complete it, and receive an `MIP-####` code — without
  hitting a rejected origin, a 404, or a page that fails to load, at
  any step and on any of the surfaces the journey crosses.
- **The organizer journey.** Sign in from that host and land back on
  it, then exercise an authoring action that calls an edge function.
  This is the check that composes phase 1's admission with phase 2's
  redirect configuration; each phase verifies its own half, and only
  this step verifies that a real sign-in followed by real work
  succeeds end to end.
- **The event is unambiguous.** A database built from migrations has
  one row carrying the Madrona display name, so the checks above are
  known to have run against the right event.
- **Every other host is untouched (I1).** The same attendee journey
  on the canonical alias behaves as it does today, and that alias
  still serves the demo index at its root.

**Named constraint.** This walk is post-merge by construction — see
the constraint below — so it gates the `Landed` flip rather than any
PR.

## Status lifecycle and close-out

Every implementing PR's position in the merge order is knowable in
advance: phases 1 and 2 are independent of the routing work and land
first, phases 3 → 4a → 4b are strictly ordered, and the data-hygiene
item is bounded to land no later than 4b. Phase 4b is therefore the
clearly-last-to-merge PR and carries the close-out, and the
**Parallel implementing PRs** exception is not invoked — that
exception exists for plans where no PR is clearly last, which the
data item's ordering bound is what prevents here.

Phase 4b's validation cannot run pre-merge (see "Named constraint on
every routing gate" below), so the plan takes the **Post-release
validation** exception per
[`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
Gate For Plans With Post-Release Validation":

- `Proposed` → `In progress pending organizer-host verification`
  when phase 4b merges. That exact label is this plan's stable name
  for the check, used verbatim wherever the status is written.
- `In progress pending organizer-host verification` → `Landed` in a
  follow-up doc-only commit once the production checks and the
  data-hygiene validation pass **and the task-level Validation Gate
  above passes**, recording the verification evidence.
  That same commit deletes the scoping doc. The data-hygiene check is
  satisfied against a database built from migrations, not against
  production alone — per that item, a production-only edit does not
  close it.

Each phase plan flips its own Status as its PR merges, per the
Plan-to-PR Completion Gate; this doc's Status flips with the last.

**Named constraint on every routing gate.** Host-conditional
behavior cannot be exercised on a preview URL, because it keys on a
hostname that resolves only to production. Any phase that changes
host-conditional routing is verified on production immediately
post-merge, with revert-by-single-commit as the rollback, and its
plan says so. A claim that a preview deploy validated such a phase is
false by construction.

## Documentation Currency PR Gate

Each phase updates the operator-facing docs its change invalidates,
in the PR that makes the change. Across the whole task, the
onboarding steps in [`docs/dev.md`](/docs/dev.md) "Vercel" must end
up naming every requirement together — Vercel alias, host mapping
entry, and origin admission plus redeploy — because satisfying only
some of them is the failure that produced this plan.

## Risk Register

Cross-phase risks only; risks scoped to one phase live in that
phase's plan.

**R1. The mapping may end up duplicated.** C1 targets a single shared
module, but that rests on a config-loader resolution check the
routing phase has to run. If it fails, the fallback is a second copy,
and two copies drift silently — a disagreement makes the rewrite and
the emitted paths resolve different events, with nothing failing
loudly. The phase that introduces a second copy owns the no-drift
assertion; this risk is closed either by the single-module shape
landing or by that assertion existing.

**R2. Deployment protection.** Both Vercel projects carry SSO
protection scoped to all deployments except custom domains.
Production aliases serve publicly today and the site→plugin proxy
works, but `apps/web` has no custom domain of its own — tightening
that setting to cover all deployments would break the proxy with no
code change to blame. Record why it is set as it is before the event.

**R3. Auth email ceiling.** The built-in SMTP service is capped at
2 messages/hour project-wide and is documented as not for production
(https://supabase.com/docs/guides/auth/auth-smtp). Accepted as out of
scope by decision. It resurfaces the moment more than two magic-link
sign-ins are needed in one hour.

**R4. Free-plan project pause.** Assumption, not verified: that
inactivity-pause behavior on the free Supabase plan is not a risk for
a live event. The project is in daily use. Re-check before any event
that follows a long quiet period.

**R5. The decoy's entitlement rows key off its id, not its slug.**
Scoping observed the decoy's codes under an `event_id` that is not
its slug and left the relationship unread. The seeding migration
cited under the data-hygiene item resolves it — the row carries an
`id` distinct from its slug, and that id is what the entitlement rows
reference. The residual risk is narrower than it was: a rename that
targets rows by slug would match nothing. Confirm the key column
against the generated types before writing the change.

## Out Of Scope

- Retargeting `NEXT_PUBLIC_SITE_ORIGIN`. It feeds one site-wide
  metadata base, so pointing it at Madrona's domain would make every
  other event advertise URLs there too.
- Dynamically rendering the event routes to lift C2's ceiling.
  Tracked in [`docs/backlog.md`](/docs/backlog.md) rather than
  decided for one event.
- Adding a canonical link. The site emits none today; that is a new
  metadata surface, not a change this launch needs, and it is filed
  separately because the fix is compatible with static rendering.
- A generic organizer-onboarding self-serve flow. Adding a mapping
  entry per C1 is the deliberate ceiling for one organizer.
- Custom SMTP (R3).
- Relocating the game out of `apps/web` into `apps/site`. Considered
  during scoping as the alternative that removes the pathname
  coupling entirely; rejected as reopening the embedding mechanism
  the canonical-origin work settled.

## Backlog Impact

Three entries in [`docs/backlog.md`](/docs/backlog.md) were opened by
this work, all under "Tier 2 — Operational Confidence":

- **The organizer host's build-time ceiling.** C2's constraint, on
  both surfaces it touches — in-page navigation and share metadata.
  One change unblocks both, so it is one entry rather than two, and
  it names the tradeoff on each candidate shape.
- **No page emits a canonical link.** Latent while each page had one
  URL; newly relevant once two hosts serve identical content.
  Separate entry because the fix is static-compatible and so has a
  different cause from the ceiling above.
- **The game route emits no share metadata.** Latent while the quiz
  URL was a long per-slug path nobody typed from memory; phase 4b
  makes the short form the one people paste.

## Related Docs

- [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
  — establishes the topology; assigns per-event subdomain onboarding
  to each event's launch track. This plan is that track for Madrona.
- [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  "Cross-app navigation" — binds the hard-navigation requirement any
  phase touching cross-app links inherits.
- [`docs/dev.md`](/docs/dev.md) "Vercel",
  [`docs/operations.md`](/docs/operations.md) "Supabase" — the
  operator-facing contracts this plan extends.
