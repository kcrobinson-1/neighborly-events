# Madrona organizer-subdomain launch

**Status:** `Proposed`

Task plan with separated phase plan files — phases 1, 2, and 3 — plus
one independent data item. This doc owns the decomposition, the
constraints that bound what any phase may promise, and the close-out.
Everything else — contracts, file inventories, per-phase validation —
belongs to the phase plans, drafted just-in-time.

The decomposition has been trimmed twice since drafting, both times by
stakeholder decision: the mount-aware route contract that would have
put the quiz at a short path is dropped, and phase 2 is reduced to its
redirect-allowlist half. Out Of Scope records both, with what each
would have bought and why that was not worth its cost.

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

- Someone who types the organizer host reaches the Madrona landing,
  and the feedback form is reachable at a short path below it. The
  quiz is reached from there, at its long event path.
- The quiz completes and mints an `MIP-####` code on that origin.
- Organizer and volunteer sign-in initiated from that origin returns
  to that origin.
- Every other host — the canonical `*.vercel.app` alias, preview
  aliases, localhost — behaves exactly as it does today, including
  the demo index at `/` and the existing long event paths.

What the plan does **not** promise is bounded by C1: short paths are
the form visitors arrive on, not an invariant that survives every
in-page tap. That is the end state, not a stage on the way to one —
the phase that would have given the quiz a short path of its own, and
kept the quiz's own in-browser links on short paths, is dropped, per
Out Of Scope.

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
alias, because the site→plugin rewrite is host-agnostic. What is lost
is address-bar consistency after the first tap, not reachability.

That loss is accepted rather than deferred. Closing it means lifting
the ceiling, which is the work Out Of Scope declines; the residual
inconsistency is filed in [`docs/backlog.md`](/docs/backlog.md)
alongside the metadata symptom that shares its cause.

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

**Verified by:** at scoping time the deployed
`functions/_shared/cors.ts`, read from the live `issue-session`
bundle, carried no organizer origin, and `getAllowedOrigin` admits
only exact-string allowlist matches plus apps/site Vercel preview
aliases — neither of which an organizer domain can satisfy. Supabase's
Authentication → URL Configuration carried no redirect entry matching
the organizer host. Both are the defects the phases close, so both
citations are scoping-time reads rather than claims about the current
configuration; phase 2 owns the console read-back for the auth half.

### C3. Emit only what is served

**Directional**: no builder ships ahead of the rewrite that serves the
path it emits, and no rewrite ships that nothing reaches. A builder
emitting a short path nothing serves produces a 404, and the auth
return leg is the live case, since post-sign-in destinations navigate
the full document. The reverse order carries no such failure — a
rewrite that lands before its builders serves a path nothing yet links
to, which is inert, not broken.

So the constraint on a rewrite is not "does a builder exist yet" but
**"does anything reach it."** An entry path — one a visitor types,
scans off print, or pastes — is reached by the address bar from the
moment it ships, and stays reached after builders arrive for it later.
A phase adding a rewrite therefore names what reaches it, and a phase
adding a builder confirms the rewrite is already live. Where a rewrite
and its builders land together, both sets change in the same PR.

The ordering this produced across the phases here: the routing phase
shipped the landing and feedback rewrites, reached from that moment by
the address bar, and no phase emits either path. The quiz's short path
has the opposite shape — its live consumer is the auth return leg,
which produces a URL and navigates the full document — and no rewrite
for it may ship without the builders that reach it. That pairing is
what the dropped phase owned, and is part of why dropping it is a
clean removal rather than a partial one: nothing in the remaining
phases emits a path that is not already served.

An earlier form of this contract stated the equality unconditionally,
which made the routing phase's visitor-typed entry paths read as dead
config. That failure was not about the intent, which has always been
the 404: emit-before-serve is the direction that breaks.

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
validation gate, and self-review audits. All three have plan files; each
is linked below. Two further phases were drafted and dropped — see Out
Of Scope.

**Phase 1 — Origin admission at the edge-function boundary.**
[`phase-1-origin-admission-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-1-origin-admission-plan.md).
Admits the organizer origin to the edge functions, which makes the
quiz playable on that host at the long event path. Depends on
nothing, so it goes first.

**Phase 2 — Auth URL configuration.**
[`phase-2-auth-url-configuration-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-2-auth-url-configuration-plan.md).
Admits the organizer host to the Supabase Auth redirect allowlist.
Console-side plus the docs that record it; no application code. Shares
no surface with the other phases. Trimmed from two halves to one — the
Site URL retarget it also carried is dropped, per Out Of Scope.

**Phase 3 — Organizer host mapping in `apps/site`.**
[`phase-3-organizer-host-mapping-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-3-organizer-host-mapping-plan.md).
The organizer host serves the event landing and feedback surfaces at
short paths. The quiz resolves only at its long path, which is where
it stays.

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
  crosses. The address bar moving to the long event path on the tap
  into the quiz is the expected behavior per C1, not a failure of
  this step; what the step watches for is a surface that does not
  work, not a URL that is not short.
- **The organizer journey.** Sign in from the organizer host, land
  back on it, then exercise an authoring action that calls an edge
  function. This is the only step that composes phase 1's admission
  with phase 2's redirect-allowlist entry; each phase verifies its own
  half, and only this verifies that real sign-in followed by real
  work succeeds. Nothing here depends on Site URL — every flow in this
  repository requests an explicit redirect, which is the asymmetry
  that took the retarget out of scope.

  **Partly walked on 2026-08-09.** A fresh magic-link sign-in on the
  organizer host returned to it, and a redemption then committed from
  that origin. That discharges the sign-in leg and shows one edge
  function admitting the organizer origin under a real session.
  **Verified by:** `submitRedeemAttempt` in
  [`apps/web/src/redeem/useRedeemSubmit.ts`](/apps/web/src/redeem/useRedeemSubmit.ts)
  POSTs to the `redeem-entitlement` function URL with a bearer access
  token. Recorded here because it cannot be re-run: the entitlement row
  it consumed was test data and has since been cleared.

  **It does not discharge the authoring leg, and I4 is why that
  distinction is not pedantry.** Redemption is the volunteer path —
  `redeem-entitlement` — not an authoring action, which reaches
  `save-draft` and `publish-draft` instead. Origin admission is
  compiled into each deployed function separately, so a redeem call
  succeeding is evidence about `redeem-entitlement` and about nothing
  else; a partial rollout that missed the authoring functions would
  look exactly like this. That is the failure I4 names. The close-out
  still runs an authoring action on the organizer host, and it is the
  step that would catch it.
- **The event under test is identified by slug, not by display name.**
  Each journey above is walked against `music.madrona.us`, whose
  host→event mapping names the `madrona` slug, and the codes it mints
  carry the `MIP` prefix. Both are unambiguous. A second `game_events`
  row shares the Madrona display name — the seeded demo sample, on the
  `first-sample` slug with the `AAC` prefix — and that collision does
  not reach these journeys, because nothing in this platform resolves an
  event by name. **Verified by:** `name` appears in no lookup across the
  app, shared, edge-function, and migration trees; the admin event
  picker renders `Slug: {draft.slug}` beside the heading it draws from
  `draft.name`
  ([`apps/site/app/(authenticated)/admin/page.tsx`](/apps/site/app/%28authenticated%29/admin/page.tsx));
  and redemption authorization takes the slug from the URL rather than
  any display string.
- **The canonical alias is unchanged (I1).** Its root still serves
  the demo index and the existing long event paths still work,
  including the quiz end to end. The organizer-host short paths are
  *expected* to fail here — this step distinguishes preserved
  behavior from short-path leakage, so it names the long entry points
  rather than reusing the organizer-host journey, which would fail at
  its first step by design.

This walk is post-merge by construction — see the constraint below. It
is post-merge to every PR that puts the behavior it walks into
production, and all of those have landed, so it is runnable now.

## Status lifecycle and close-out

Phases 1, 2, and 3 have landed, and with the probe runner and the decoy
rename both out of scope there is no implementing PR left. Everything
this plan promises is in production; what remains is verifying it.

So the close-out is a single doc-only commit: `Proposed` → `Landed` once
the Validation Gate above passes, recording the verification evidence.
That commit deletes the scoping doc. Neither named exception to the
Plan-to-PR Completion Gate applies — **Parallel implementing PRs** has
nothing to order, and **Post-release validation** describes an
implementing PR that merges ahead of its check, which is not the shape
left here. What remains is the residue of a plan whose implementing work
finished before its verification, and the gate's default — flip when the
plan is satisfied — is what covers it.

**Phase 3's `Landed` flip is not resolved by this amendment, and the
gap is named rather than assumed away.** Phase 3 merged under the
**Post-release validation** exception, whose close-out is defined as a
follow-up commit that *records the validation run URL* — durable
external evidence, explicitly distinguished from anything already in
git. The probe runner was to produce that URL. With it dropped, a
manual walk produces the observations but no artifact, so phase 3
cannot exit the exception on the terms the exception sets.

That is a conflict with a canonical rule, and the canonical rule says a
plan-specific carve-out belongs in the rule rather than in a plan's own
Contracts section. So this plan does not grant itself one. Phase 3 stays
at `In progress pending organizer-host routing verification` until
either a runnable check yielding a run URL exists, or
[`docs/testing-tiers.md`](/docs/testing-tiers.md)'s gate is amended to
cover post-release checks that have no automatable artifact. Surfaced by
review of the phase-3b drop.

Phases 1 and 2 flipped their own Status in their implementing PRs, per
the Plan-to-PR Completion Gate. Phase 3 is the exception and it is
unresolved — see the note above it.

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
requirement together — Vercel alias, mapping entry, edge-function
origin admission plus redeploy, and the Supabase Auth redirect entry —
because satisfying only some of them is the failure that produced this
plan. The auth redirect belongs on that list for the same reason the
others do: an organizer host that is aliased, mapped, and admitted at
the edge still cannot complete a sign-in without it, and nothing about
the first three requirements surfaces the fourth.

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

### No phase 4 (the short quiz path is dropped)

Earlier drafts carried a fourth phase, in two PRs: a parse side that
taught the shared route layer a session may be mounted at an event
root, and an emit side that shipped the quiz's short-path rewrite
together with the builders and the event header bar that would emit
short paths. Dropped by stakeholder decision, and dropped outright
rather than deferred to a later plan.

The goal was that someone typing `music.madrona.us` sees the site, and
phases 1 through 3 deliver that. What phase 4 would have added on top
is cosmetic: a shorter URL for the quiz, one a visitor could type or
paste, plus short links inside the quiz itself. It would not have
fixed the first tap out of the landing page — that is C1's ceiling,
which no phase of this task was going to lift. What it would have cost
is an edit to the repository's most shared URL surface — the route
table and builders in `shared/urls/`, read by both deployables — plus
host-aware resolution in the masthead consumers, in service of an
event that works without any of it. The address bar moving to
`/event/madrona/game` after a visitor taps through is the accepted end
state.

Two consequences of the drop are recorded rather than left implicit.
The residual navigation inconsistency, and the metadata symptom that
shares its cause, are filed in
[`docs/backlog.md`](/docs/backlog.md) — they are the same entry the
C1 ceiling already pointed at, and nothing about the drop makes them
more urgent. And the constraint the emit side would have run into is
worth keeping, because it is the non-obvious part and a future reader
should not have to rediscover it: **the per-event masthead table
cannot be retargeted in place.** It has two consumers — the
browser-rendered SPA masthead, which has a request host, and the
server-rendered `apps/site` event pages, which do not, because they
are statically generated per C1. A short path written into the shared
destinations is therefore emitted on the canonical alias too, where
the root is the demo index and the short feedback path is not the
event: an I1 break. Host-aware resolution belongs in the consumer that
has a host to resolve against. **Verified by:**
`shared/masthead/EventMasthead.tsx` renders the table's destinations
directly as anchor hrefs, and both
`apps/site/app/event/[slug]/page.tsx` and its `feedback/page.tsx`
sibling call `getEventMasthead` for the slug they render.

### No decoy rename (the shared display name is accepted)

`game_events` carries a second row with the Madrona display name — the
demo sample seeded on the `first-sample` slug. This plan carried
renaming it as an independent data item, on the stated rationale that
two rows answering to one name would make the close-out journeys
ambiguous about which event they exercised. That rationale does not
survive contact with the code.

Nothing resolves an event by display name. `id` and `slug` are the
identifiers, they were never in collision, and every surface that shows
the name shows the slug beside it — including the admin event picker,
which was the one place a person chooses between events. The journeys
this plan verifies reach the event through a host→event mapping keyed on
slug and produce codes carrying a per-event prefix. There is no step at
which the display name decides anything.

What is accepted, stated rather than waved past: two event cards in the
admin picker carry identical `aria-label` values, so a screen-reader
user hears the same accessible name twice and has to enter the card to
tell them apart. The visible slug and the card's own readable content
disambiguate, which keeps this a wrinkle rather than a barrier. If it
ever matters, the fix is in the label rather than the data — include the
slug in the `aria-label` — and it is independent of anything here.

The rename would have cost a forward migration plus a production
`UPDATE`, both cheap. It is dropped not because it is expensive but
because the defect it was written against does not exist: the plan
asserted a hazard, the code disagreed, and amending the assertion is
the honest resolution rather than doing work to satisfy it.

### No phase 3b (the committed probe runner is dropped)

Phase 3b was to be a runner under `scripts/testing/` that probed an
organizer host's routing against the deployed surface, wired into the
deployed-surface smoke family, producing a run URL that would let phase
3 flip to `Landed`. It reached `In draft` and is dropped without being
built.

What it was for is the tell. Its entire product is *evidence for a plan
status* — the routing it would check has been live and working since
phase 3 merged, and nothing about the runner changes what a visitor
sees. That is a real thing to want when a check must recur, and it does
not recur here: the organizer-host routing is verified once at launch,
and the mapping-driven generality that would let it re-run against the
next organizer host is infrastructure for a fleet of one until a second
organizer exists.

It also carried an unresolved mechanism. Its C2 required proving that
the origin under test is serving the commit under test, because every
assertion fails identically against a stale build and a genuinely wrong
rewrite, and phase 3 attaches a rollback to that failure. No pattern for
that exists in this repo, so the phase needed a scoping pass and a spike
before it could leave `In draft`. Paying that to produce a status flip
inverts the cost.

**What replaces it:** phase 3's post-merge Validation Gate is walked by
hand against production and recorded in phase 3's plan — the same
assertions, the same host pair, without a committed entry point. That
is weaker in exactly one way, and the way is worth naming: a manual walk
leaves no artifact a future reader can re-run, so the record is the
claim. For a check that runs once, at a launch that has already
happened, that is the honest trade rather than a corner cut.

If a second organizer host arrives, this decision should be revisited
before the second launch rather than after — two hosts is the point
where "verify by hand at launch" stops scaling, and the runner's design
is recorded in this plan's git history.

### No Site URL retarget (phase 2 trimmed to its redirect half)

Phase 2 was drafted with two halves: add the organizer host to the
redirect allowlist, and retarget the project's Site URL from the
plugin deployment's alias to `apps/site`'s canonical alias. Only the
first survives, by stakeholder decision.

The asymmetry is the whole argument. The redirect entry fixes
something real and specific: `EventRedeemPage`,
`EventRedemptionsPage`, and `EventAdminPage` each request a magic link
with a redirect composed against the current origin, so a volunteer
who opens the redeem page on the organizer host has no working return
leg until that host is admitted. **Verified by:** `requestMagicLink`
in [`shared/auth/api.ts`](/shared/auth/api.ts) builds
`emailRedirectTo` against `window.location.origin`, and
`EventRedeemPage.tsx`, `EventRedemptionsPage.tsx`, and
`EventAdminPage.tsx` under `apps/web/src/pages/` each call it — those
pages are served on the organizer host through the host-agnostic
site→plugin rewrite.

The Site URL retarget, by contrast, changes a project-wide default
that every flow in this repository overrides with an explicit
redirect — so it buys this event nothing — and it carries the two
vendor questions phase 2 recorded and could not resolve from
documentation: what Supabase does with a redirect the allowlist does
not admit, and whether any dashboard-managed email template
interpolates Site URL. Paying an unresolved blast radius for no gain
is the trade that was declined.

This also removes a conditional exception the plan carried. Phase 2's
retarget had one outcome under which an origin the allowlist does not
admit — an `apps/site` preview alias is the live example — would have
started landing somewhere new, which is an I1 break needing an
exception recorded at both levels. With no retarget, the Goal's claim
that preview aliases behave exactly as they do today holds
unconditionally.

## Backlog Impact

Entries in [`docs/backlog.md`](/docs/backlog.md) opened by this work,
all under "Tier 2 — Operational Confidence": the organizer
host's build-time ceiling (C1's constraint, on both the navigation
and metadata surfaces it touches, with the candidate shapes and their
tradeoffs); the absence of any canonical link, newly relevant once
two hosts serve identical content; the game route's missing share
metadata, newly relevant once the quiz link is one people paste from
a host that is not the canonical alias; and the breadth of the Supabase
Auth redirect allowlist, where every entry wildcards its whole path —
opened by phase 2, which found the shape while documenting the
organizer host's entry and found that the repository had been
recommending a narrower shape that does not work.

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
