# Madrona organizer-subdomain launch

**Status:** `Proposed`

Task plan with separated phase plan files, N = 4 phases plus one
independent data item. This doc owns the decomposition, the
constraints that bound what any phase may promise, and the close-out.
Everything else — contracts, file inventories, per-phase validation —
belongs to the phase plans, drafted just-in-time.

Scoping doc:
[`scoping/madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/scoping/madrona-organizer-subdomain-launch.md).

## Context

An event organizer has pointed their own domain at this platform.
`music.madrona.us` is a live alias on the `apps/site` Vercel project,
it is going into a newsletter and onto a stage, and today its root
serves the internal demo index — a page about the platform's test
events, not about Madrona. This plan makes that domain serve the
event it belongs to, and makes the event work when reached through
it.

The second half is the part that was not obvious. A per-event
organizer domain is a distinct browser origin, and two origin gates
break the event outright: the edge-function CORS allowlist rejects
the origin, so the quiz cannot mint a check-in code there even at the
long event path that already resolves on that host, and Supabase Auth
does not list the host as a valid redirect target, so sign-in
initiated there lands somewhere else. Both fail regardless of what
URL a visitor types. Short URLs are the visible goal; origin
admission is what makes them worth having.

This is the first real exercise of the per-event organizer subdomain
model the canonical-origin work left as each event's own launch
track, so the shapes chosen here become the template for the next
organizer.

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

What the plan does **not** promise is bounded by C1: short paths are
the form visitors arrive on, not an invariant that survives every
in-page tap.

## Cross-Phase Contracts

Three contracts, and each earns its place by binding more than one
phase or by bounding what the Goal can claim.

### C1. Short paths are an entry form, not a navigation invariant

`apps/site`'s event routes are statically generated — one HTML
document serves every host — so their server-rendered links and their
build-time metadata cannot vary by host. No phase may promise
behavior that requires crossing that ceiling.

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
ceiling means rendering the event routes dynamically, tracked in
[`docs/backlog.md`](/docs/backlog.md) rather than decided for one
event.

### C2. Origin admission precedes anything that depends on it

No phase claims a working quiz, or a working sign-in, on the
organizer host before that origin is admitted at the edge-function
and auth-configuration boundaries.

**Verified by:** the deployed `functions/_shared/cors.ts`, read from
the live `issue-session` bundle, carries no organizer origin, and
`getAllowedOrigin` admits only exact-string allowlist matches plus
apps/site Vercel preview aliases — neither of which an organizer
domain can satisfy. Supabase's Authentication → URL Configuration
sets Site URL to the apps/web alias, and no redirect entry matches
the organizer host.

### C3. Parse before emit, and emit only what is served

No surface emits a short path before the route matchers accept one —
that is what lets the parse-side phase land inert and makes the
emit-side phase the switch.

Separately and just as binding: the set of paths emitted as short
must equal the set the routing layer rewrites. A builder emitting a
short path nothing serves produces a 404, and the auth return leg is
the live case, since post-sign-in destinations navigate the full
document. A rewrite with no builder is dead config. Both sets change
in the same PR.

## Cross-Cutting Invariants

**I1. Every host but a mapped organizer host is unchanged.** Each
phase carries at least one assertion on the canonical alias, not only
on the organizer host. The failure this prevents is invisible to any
test that exercises only the new host.

**I2. The host→event mapping is authored once.** Every consumer reads
one source. If a phase finds that a single source cannot be shared
across the layers that need it, it says which side is canonical and
asserts the copies against each other — a mapping that silently
disagrees makes the rewrite and the emitted paths resolve different
events.

**I3. Short-path support is opt-in per host.** Nothing keys on "is
this a custom domain" or "is this not a `.vercel.app`." Only an exact
hostname in the mapping changes anything.

**I4. Admission is only as complete as the deploy.** Where a trust
boundary is compiled into more than one deployable unit, every unit
carrying it ships together, and membership is resolved from the
import graph rather than from a search for the module path. A partial
rollout reads as a working launch until someone reaches the surface
that was missed.

## Phases

Each phase plan is drafted before that phase's implementation, per
the just-in-time rule, and carries its own contracts, file inventory,
validation gate, and self-review audits. Drafted phase plans are
linked below; the rest are named with the outcome they own, so the
decomposition and ordering are reviewable now.

**Phase 1 — Origin admission at the edge-function boundary.**
[`phase-1-origin-admission-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-1-origin-admission-plan.md).
Admits the organizer origin to the edge functions, which makes the
quiz playable on that host at the long event path. Depends on
nothing, so it goes first.

**Phase 2 — Auth URL configuration.** Retargets Site URL to the
canonical site origin and admits the organizer host to the redirect
allowlist. Console-side plus the docs that record it; no application
code. Shares no surface with the other phases, so it can land
anywhere in the order.

**Phase 3 — Organizer host mapping in `apps/site`.**
[`phase-3-organizer-host-mapping-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-3-organizer-host-mapping-plan.md).
The organizer
host serves the event landing and feedback surfaces at short paths.
The quiz still resolves only at its long path, because the short form
depends on the route contract phase 4 introduces.

**Phase 4 — Mount-aware route contract.** Two PRs, split by direction
per C3:

- **4a — parse side.** The shared route layer learns that a session
  may be mounted at an event root, and matchers accept short paths.
  Nothing emits them, so rendered output is unchanged on every host.
  Reviewable as a pure contract-widening diff.
- **4b — emit side.** Builders, the event header bar, and the quiz's
  short-path rewrite ship together, because any subset breaks the
  quiz: a builder emitting a short path before the rewrite exists
  produces a 404, and the rewrite without the header change produces
  a header that walks visitors back off short paths.

**On the phase/task classification — settled by the stakeholder.**
Phases 1 and 2 each close a live defect and are technically
observable alone, which under a reading of the task/phase picker that
equates observability with value argues for calling them tasks. They
are phases. The picker asks whether what ships has independent
*stakeholder* value, and the stakeholder for this work has answered
directly: no value is realized until the organizer host is launched,
and intermediate states that are odd or partially working in the
meantime are acceptable. Technical observability was standing in as a
proxy for that question; the answer supersedes the proxy.

This also fixes the boundary the picker cares about: every phase here
realizes value only together, at launch. Recorded so the question
does not get re-litigated from the proxy.

**Independent — data hygiene.** `game_events` carries two rows with
the Madrona display name, and recent completions have gone to the
decoy. It is renamed rather than deleted, because it holds real
entitlement rows a delete would orphan, and a distinct name is enough
to prevent the failure that matters: verifying against the wrong
event.

The rename has to hold in **both** directions — in the database built
from migrations and in the already-migrated production database.
Fixing only the seed leaves production carrying both names, so the
production journeys this plan verifies would still be ambiguous;
fixing only production leaves every rebuilt environment restoring the
decoy. The mechanism is the implementing phase's call.

**Verified by:**
`supabase/migrations/20260406130000_add_published_quiz_content.sql`
seeds the decoy with the Madrona display name, under the table's
former name — the events and entitlements tables were renamed after
that migration, so the current names are what a new migration writes
against.

That insert also settles which identifier selects what, and the two
are not interchangeable: the row's `id` and its `slug` hold different
values, the event row is selectable by either, and the entitlement
rows reference the **id**. So a rename of the event row can key on
slug, while anything that has to find or preserve the decoy's
entitlements has to key on the id. An earlier draft of this plan said
a slug-based rename would match nothing, which was wrong and would
have steered an implementer off a perfectly good selector.

It gates no implementing phase and may ride in any of them, but it
**must land no later than phase 4b** — both because 4b's verification
depends on it, and because letting it trail 4b would make 4b not the
last implementing PR.

## Validation Gate

Each phase carries its own gate. This one is the acceptance walk for
the composition of the phases, run once at close-out, because no
phase plan owns "a visitor can do the whole thing on this host" and a
task whose phases each pass can still fail as a journey.

On production, in a private window, on a phone and a laptop:

- **The attendee journey, unbroken.** On the organizer host: arrive
  at the short root, reach the quiz, complete it, and receive an
  `MIP-####` code — without hitting a rejected origin, a 404, or a
  page that fails to load, at any step or on any surface the journey
  crosses.
- **The organizer journey.** Sign in from the organizer host, land
  back on it, then exercise an authoring action that calls an edge
  function. This is the only step that composes phase 1's admission
  with phase 2's redirect configuration; each phase verifies its own
  half, and only this verifies that real sign-in followed by real
  work succeeds.
- **The event is unambiguous.** Both the production database and a
  database built from migrations carry one row with the Madrona
  display name, and the decoy's entitlement rows remain reachable
  under their own event. This is what makes the journeys above
  evidence about the right event.
- **The canonical alias is unchanged (I1).** Its root still serves
  the demo index and the existing long event paths still work,
  including the quiz end to end. The organizer-host short paths are
  *expected* to fail here — this step distinguishes preserved
  behavior from short-path leakage, so it names the long entry points
  rather than reusing the organizer-host journey, which would fail at
  its first step by design.

This walk is post-merge by construction — see the constraint below —
so it gates the `Landed` flip rather than any PR.

## Status lifecycle and close-out

Phases 1 and 2 land first, phases 3 → 4a → 4b are strictly ordered,
and the data-hygiene item is bounded to land no later than 4b, so
phase 4b is the clearly-last-to-merge PR and carries the close-out.
The **Parallel implementing PRs** exception is not invoked; the data
item's ordering bound is what keeps it unnecessary.

Phase 4b's validation cannot run pre-merge, so the plan takes the
**Post-release validation** exception per
[`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
Gate For Plans With Post-Release Validation":

- `Proposed` → `In progress pending organizer-host verification` when
  phase 4b merges. That exact label is this plan's stable name for
  the check.
- `In progress pending organizer-host verification` → `Landed` in a
  follow-up doc-only commit once the Validation Gate above passes,
  recording the verification evidence. That commit deletes the
  scoping doc.

Each phase plan flips its own Status as its PR merges, per the
Plan-to-PR Completion Gate; this doc's flips with the last.

**Named constraint on every routing gate.** Host-conditional behavior
cannot be exercised on a preview URL, because it keys on a hostname
that resolves only to production. Any phase that changes
host-conditional routing is verified on production immediately
post-merge, with revert-by-single-commit as the rollback, and its
plan says so. A claim that a preview deploy validated such a phase is
false by construction.

## Documentation Currency PR Gate

Each phase updates the operator-facing docs its own change
invalidates. Across the task, the onboarding steps in
[`docs/dev.md`](/docs/dev.md) "Vercel" must end up naming every
requirement together — Vercel alias, mapping entry, and origin
admission plus redeploy — because satisfying only some of them is the
failure that produced this plan.

## Risk Register

Cross-phase and external risks only; risks scoped to one phase live
in that phase's plan.

**R1. Deployment protection.** Both Vercel projects carry SSO
protection scoped to all deployments except custom domains.
Production aliases serve publicly today and the site→plugin proxy
works, but `apps/web` has no custom domain of its own — tightening
that setting to cover all deployments would break the proxy with no
code change to blame. Record why it is set as it is before the event.

**R2. Auth email ceiling.** The built-in SMTP service is capped at
2 messages/hour project-wide and is documented as not for production
(https://supabase.com/docs/guides/auth/auth-smtp). Accepted as out of
scope by decision. It resurfaces the moment more than two magic-link
sign-ins are needed in one hour.

**R3. Free-plan project pause.** Assumption, not verified: that
inactivity-pause behavior on the free Supabase plan is not a risk for
a live event. The project is in daily use. Re-check before any event
that follows a long quiet period.

## Out Of Scope

- Retargeting `NEXT_PUBLIC_SITE_ORIGIN`. It feeds one site-wide
  metadata base, so pointing it at Madrona's domain would make every
  other event advertise URLs there too.
- Dynamically rendering the event routes to lift C1's ceiling.
  Tracked in [`docs/backlog.md`](/docs/backlog.md) rather than
  decided for one event.
- Adding a canonical link. The site emits none today; that is a new
  metadata surface, not something this launch needs, and it is filed
  separately because the fix is compatible with static rendering.
- A generic organizer-onboarding self-serve flow. One mapping entry
  per host is the deliberate ceiling for one organizer.
- Custom SMTP (R2).
- Relocating the game out of `apps/web` into `apps/site`. Considered
  during scoping as the alternative that removes the pathname
  coupling entirely; rejected as reopening the embedding mechanism
  the canonical-origin work settled.

## Backlog Impact

Three entries in [`docs/backlog.md`](/docs/backlog.md) were opened by
this work, all under "Tier 2 — Operational Confidence": the organizer
host's build-time ceiling (C1's constraint, on both the navigation
and metadata surfaces it touches, with the candidate shapes and their
tradeoffs); the absence of any canonical link, newly relevant once
two hosts serve identical content; and the game route's missing share
metadata, newly relevant once its short form is the one people paste.

## Related Docs

- [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
  — establishes the topology and assigns per-event subdomain
  onboarding to each event's launch track. This plan is that track
  for Madrona.
- [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  "Cross-app navigation" — binds the hard-navigation requirement any
  phase touching cross-app links inherits.
- [`docs/dev.md`](/docs/dev.md) "Vercel",
  [`docs/operations.md`](/docs/operations.md) "Supabase" — the
  operator-facing contracts this plan extends.
