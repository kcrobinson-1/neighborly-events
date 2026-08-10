# Madrona organizer-subdomain launch

**Status:** `Proposed`

Task plan with separated phase plan files — phases 1, 2, 3, and 3b —
plus one independent data item. This doc owns the decomposition, the
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
validation gate, and self-review audits. All four now have plan files;
each is linked below. A fifth phase was drafted at this level and
never got a plan file — it is dropped, and Out Of Scope records it.

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

**Phase 3b — Post-deploy organizer-host routing probes.**
[`phase-3b-post-deploy-routing-probes-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-3b-post-deploy-routing-probes-plan.md).
The committed entry point that runs phase 3's post-deploy checks
against the deployed surface and produces the run URL its close-out
records. It exists as its own phase because the stakeholder chose to
ship phase 3's routing change ahead of it, and a plan requirement
left outstanding after a merge carries its own `Status` rather than
hiding under the phase it was deferred from. It gates phase 3's
`Landed` flip, and it is the last implementing PR of the task — see
"Status lifecycle and close-out."

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
**must land no later than phase 3b's implementing PR** — both because
the Validation Gate below is only evidence about the right event once
the rename is live, and because letting it trail 3b would make 3b not
the last implementing PR.

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

This walk is post-merge by construction — see the constraint below.
What it is post-merge *to* is every PR that puts the behavior it walks
into production, not to whichever PR happens to be last: phase 3b adds
no production behavior for the walk to wait on. The close-out below
is what that distinction buys.

## Status lifecycle and close-out

Phase 1 has landed and phase 3's routing change has merged. Three
implementing PRs remain: phase 2's documentation of the redirect
entry, phase 3b's probe runner, and the data-hygiene rename. **Two
ordering bounds make phase 3b's the clearly-last-to-merge PR**, and it
carries the close-out:

- The data-hygiene rename lands no later than phase 3b's PR, per the
  bound stated above it.
- Phase 2's PR lands no later than phase 3b's PR. It contributes the
  redirect entry to the onboarding list the Documentation Currency PR
  Gate below requires to be complete together; a close-out that landed
  ahead of it would close the task with that list still short one
  requirement.

The **Parallel implementing PRs** exception is therefore not invoked.
It is the exception that fits when no PR is clearly last, and the
close-out lost its previous anchor when the phase that had been last
was dropped — but both remaining candidates have a real reason to
precede phase 3b, so declaring the order is honest rather than
contrived, and it avoids a separate close-out PR whose merge would
have to wait on a production walk it cannot bound.

**This plan's gate is the composed journey above, not phase 3b's probe
run** — two checks with two different subjects, and only the second is
structurally post-merge to phase 3b. The journey needs everything it
walks already live: phase 1's admission, phase 3's routing, phase 2's
redirect entry, and the data-hygiene rename. Each of those is another
PR's merge, and every one is bounded to land no later than phase 3b's,
so by the time that PR is ready the walk is runnable — while phase
3b's own runner adds nothing to production for the walk to wait on.

So the close-out has two branches, the same shape phase 3b's own
lifecycle carries and for the same reason:

- **If the Validation Gate above has passed at any point before phase
  3b's implementing PR merges**, `Proposed` → `Landed` in that PR,
  recording the verification evidence. That PR deletes the scoping
  doc. This is the default same-PR flip, available because the walk
  was runnable. The cutoff is the merge, not the PR's opening: a walk
  that passes while the PR is in review satisfies the gate just as
  fully, and treating it otherwise would manufacture a pending state
  and a follow-up commit for a plan whose validation was complete.
  Amending the PR to record late-arriving evidence is the normal
  course. Phase 3b's own lifecycle uses the same pre-merge cutoff, and
  so does the Plan-to-PR Completion Gate.
- **Otherwise** the plan takes the **Post-release validation**
  exception per [`docs/testing-tiers.md`](/docs/testing-tiers.md)
  "Plan-to-Landed Gate For Plans With Post-Release Validation":
  `Proposed` → `In progress pending organizer-host verification` when
  phase 3b's implementing PR merges — that exact label is this plan's
  stable name for the check — then → `Landed` in a follow-up doc-only
  commit once the walk passes, recording the evidence. That commit
  deletes the scoping doc.

The two branches are not a choice the implementer makes freely: the
first is taken whenever the walk has in fact passed, and reaching for
the second when it has is the drift the Plan-to-PR Completion Gate
forbids.

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

Three entries in [`docs/backlog.md`](/docs/backlog.md) were opened by
this work, all under "Tier 2 — Operational Confidence": the organizer
host's build-time ceiling (C1's constraint, on both the navigation
and metadata surfaces it touches, with the candidate shapes and their
tradeoffs); the absence of any canonical link, newly relevant once
two hosts serve identical content; and the game route's missing share
metadata, newly relevant once the quiz link is one people paste from
a host that is not the canonical alias.

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
