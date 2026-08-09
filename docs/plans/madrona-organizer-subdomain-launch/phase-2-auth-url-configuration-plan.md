# Phase 2 — Auth URL configuration

**Status:** `Proposed`

One PR, and no close-out commit. The `Proposed` → `Landed` flip happens
in that same PR rather than in a follow-up; C3 says why, and what the
ordering it implies requires.

## Context

Parent task plan:
[`madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md).
This phase satisfies the auth half of the parent's C2 (origin admission
precedes anything that depends on it) and inherits its I1.

An organizer's domain is a distinct browser origin, and Supabase Auth
decides where a sign-in link returns by matching the requested redirect
against a per-project allowlist. The organizer host is not on that list,
so a volunteer or organizer who signs in from the domain printed on the
event's materials is not returned to it. Separately, the project's Site
URL — the destination a sign-in defaults to when it requests none —
points at the plugin deployment, which the canonical-origin work
documented as not customer-facing, so the default is wrong on its own
terms. Whether the first failure routes through the second is vendor
behavior C1 pins down rather than assumes. Both halves are configuration,
both
are one console visit, and neither is visible in the repository. This
phase closes them and writes down what changed, because the repository's
description of this configuration is the only copy anyone can review.

**Scoping.** This phase does not carry its own scoping doc, and does not
need the narrow-surface carve-out to justify that: the task's scoping
doc already owns this phase's deliberation. D6 establishes that Site URL
names a deployment documented as not customer-facing and that no
redirect entry matches the organizer host; O3 resolves the retarget,
with its rationale and its blast-radius argument; O5 strikes the email
ceiling from this phase's scope. Those are the decisions a phase-2
scoping doc would have had to make, and restating them here would be the
scoping-restates-plan trap. What follows is the durable contract those
decisions imply, plus the phase-specific residue under Reality-check
inputs — claims that can drift between the task's scoping and this
phase's implementation because they describe a console, not a file.

## Goal

- A magic link requested from the organizer host returns to the
  organizer host.
- Site URL names the canonical site origin, so a redirect that falls
  back to it lands on a customer-facing host.
- Sign-in from every origin whose callback URL the allowlist admits
  behaves as it does today, and no origin gains or loses a working
  return leg. That is narrower than "every other origin": what happens
  on origins the allowlist does not admit turns on a vendor behavior
  this plan resolves by observation rather than assumption, and on one
  of the two outcomes it is a named exception to the parent's I1. C1
  carries both.
- The repository's operator-facing description of Auth URL configuration
  describes the configuration that is live.

Sign-in returning to the right origin is not the same as the organizer
journey working end to end; R2 below says what still separates them.

## Contracts

### C1. Site URL names the canonical site origin

Site URL is retargeted from the plugin deployment's alias to
`apps/site`'s canonical alias, per scoping O3.

Across every origin the allowlist admits, the change is bounded: there
an explicit redirect decides the destination, Site URL is the default
only for a flow that requests none, and every flow this repository
contains requests one. That is what keeps a project-wide setting from
being a project-wide behavior change. Origins the allowlist does not
admit are a separate case, two paragraphs down.

**Verified by:** Supabase documents Site URL as the default redirect
used when no explicit redirect is specified
(https://supabase.com/docs/guides/auth/redirect-urls). `requestMagicLink`
in [`shared/auth/api.ts`](/shared/auth/api.ts) composes an explicit
redirect against the current browser origin on every call, and it is the
only browser-side sign-in entry point: a search across the app, shared,
test, script, and edge-function source trees for the other Supabase
methods that can send or generate an auth link — password reset, OAuth,
invite, and sign-up — returns no call sites. The service-role links the
e2e fixtures generate also pass an explicit redirect
([`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts)
`generateMagicLink`). Dashboard-managed email templates are the one
consumer the repository cannot see; they are a reality-check input
below, not an assumption here.

**The bound is over allowlisted origins, which is narrower than "every
other origin."** An explicit redirect settles the destination only where
the allowlist admits it. For an origin whose callback URL is not
admitted — an `apps/site` preview alias is the live example — the
requested redirect is not honored, and what happens instead is vendor
behavior this plan has not established. The commonly reported shape is a
fall back to Site URL, which is the setting C1 retargets; the vendor's
own redirect-URL page does not state it. Neither shape is asserted here.

What holds under both shapes is one half of what the Goal claims: no
origin in that class returns to itself today, so none of them loses a
working return leg.

The other half — whether anything about that class changes at all —
depends on which shape is real, and the parent's I1 is what makes the
difference matter. Under the rejection shape, nothing changes and I1 is
untouched. Under the fallback shape, an unadmitted origin's sign-in
moves from landing on the plugin deployment to landing on the canonical
site origin: a non-organizer host behaving differently, which is what
I1 covers on its face. An earlier draft of this section argued I1 did
not reach that case because the affected origins have no working return
leg today. That substitutes the invariant's rationale for its text, and
the rationale points the same way regardless — collateral change on a
non-organizer host is precisely what a check exercising only the
organizer host would miss, which is the failure I1 names.

So this phase does not argue the exception away, and it does not narrow
I1 to fit. If the observation lands on the fallback shape, this is one
of the cases P3 gates: before the phase lands, either the exception is
recorded in the parent alongside I1 — naming the affected class and the
destination change — or the retarget is reshaped so the class is not
affected. Under the rejection shape there is nothing to record. The
change itself is the one O3 chose either way; what is conditional is the
bookkeeping I1 is owed.

**Verified by:** the allowlist snapshot the task's scoping recorded
under D6 carries the apps/web alias, the apps/site alias, and localhost
variants, with no preview-alias pattern — so preview aliases fall in the
unlisted class. That snapshot is a console read, and the Reality-check
inputs below require re-reading it; that read is what settles class
membership at implementation time. The vendor page
(https://supabase.com/docs/guides/auth/redirect-urls) documents Site URL
as the default when no redirect is specified and states nothing about a
redirect the allowlist does not admit, which is why this plan resolves
that question by test rather than by citation.

`apps/site`'s canonical alias is the same origin the edge functions
already treat as canonical, so this retarget aligns the two admission
surfaces rather than introducing a third answer. **Verified by:**
`defaultAllowedOrigins` in
[`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts)
carries that alias as the single non-localhost entry, and
[`docs/dev.md`](/docs/dev.md) "Vercel" names `apps/site`'s primary
`*.vercel.app` alias as the canonical site origin.

### C2. The organizer host is admitted by an exact-host entry with a wildcard path

A redirect-allowlist entry is added that names the organizer host
exactly and wildcards the path beneath it. The host is a literal; no
part of the hostname is patterned, so no host other than the organizer's
is admitted by it.

Supabase's glob syntax treats the dot and the slash as separators, which
is what makes the host/path split expressible: a pattern can widen the
path without widening the host. **Verified by:**
https://supabase.com/docs/guides/auth/redirect-urls "Use wildcards in
redirect URLs" defines the separator set and the two wildcard forms.

This is a deliberate widening of the repository's documented convention,
which is one exact callback-path entry per environment
([`docs/operations.md`](/docs/operations.md) "Manually Maintained
Settings", the Supabase subsection's Auth URL configuration bullets). The
narrower shape is available and is what the vendor recommends for
production; R1 records why the wider one is taken here and what it
costs. The docs this phase
ships record that the convention now admits two shapes and which one the
organizer host uses — a reader who finds a wildcard entry against a
doc that describes only exact paths has no way to tell a decision from a
mistake.

### C3. The configuration change lands before the PR, and Status flips in that PR

This phase flips `Proposed` → `Landed` in its own implementing PR — the
default under the Plan-to-PR Completion Gate. It does **not** take the
**Post-release validation** exception, and the reason it differs from
phase 1 is worth stating rather than inheriting.

Phase 1's checks run against deployed edge functions, and the code that
carries its change reaches the function runtime only after a merge to
`main`; the check is therefore structurally post-merge. This phase's
change is not carried by anything its PR ships. The configuration lives
in the Supabase project, takes effect when it is saved, and is reachable
in production from that moment — before the PR is opened, and
independent of whether it is ever merged. Every check this phase names
can therefore run before the PR exists, which is exactly the condition
the default same-PR flip is for. Reaching for the exception would claim
a post-merge dependency that does not exist.

**Verified by:** `supabase/config.toml` carries only per-function
sections and no auth block, so Auth URL configuration has no
representation in the repo;
[`docs/operations.md`](/docs/operations.md) "Manually Maintained
Settings" lists Auth URL configuration under its Supabase subsection;
and `.github/workflows/release.yml`'s Supabase job pushes migrations and
deploys functions without pushing configuration, so no merge to `main`
writes this setting.

What follows from the same fact is an ordering, and the ordering is
contract rather than trajectory: what the PR merges is a description,
and a description is only correct relative to a state that already
exists.

- **The prior values are captured before anything is edited.** The
  console keeps no history, so a rollback that is not recorded first is
  not available at all. This is the phase's only rollback mechanism —
  reverting the merged commit changes documentation and nothing else.
- **The checks in the Validation Gate run against the changed
  configuration, and pass, before the PR is opened.** Not before it is
  merged — before it is opened, because the PR body carries the
  evidence and a reviewer cannot re-run any of it.
- **Every statement the PR makes about Auth URL configuration is read
  back from the console after the change**, not written from the intent
  that produced it.

Between the console edit and the merge, the repository's description of
this configuration is stale. That window is the accepted cost of the
ordering, and it is the safe direction: documentation that lags a live
setting is wrong about the past, while documentation that leads one is
wrong about the present and has nothing to force it into agreement.

A reviewer who objects to the configuration itself is objecting to
something already in effect. The remedy in that case is another console
change plus an amended PR — the diff is not the lever, and treating it
as one would leave the docs describing a state nobody restored.

## Cross-Cutting Invariants

**P1. The console is the system of record; every copy is re-derived,
not remembered.** More than one operator-facing surface states what
Site URL points at and what shape the redirect allowlist takes, and
nothing checks them against the project. Each is written from a
post-change read of the console.

**P2. This phase only adds redirect entries.** No existing entry is
removed, narrowed, or reworded. Every already-admitted return leg —
including the localhost redirects the auth e2e fixtures depend on —
keeps working because nothing it matches against was touched. Origins
the allowlist does not admit are a separate question, answered in C1.
**Verified by:**
[`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts)
composes its callback redirect against a localhost base URL, so those
entries are load-bearing for the auth fixtures.

**P3. Every Site URL consumer the repository cannot see gets the same
gate.** Site URL has consumers outside the repo: dashboard-managed email
templates are the known one, and the unadmitted-redirect path in C1 may
be another. Each is discovered in the console at implementation time
rather than derived from code, so this plan cannot enumerate them and
does not try. Whichever turns up, the treatment is identical — if the
retarget changes what that consumer emits, or where it sends someone,
then before this phase lands **either** the I1 exception is recorded in
the parent naming the affected surface and class, **or** the retarget is
reshaped so that consumer's output does not change. Recording the
observation in the PR does not clear the gate on its own. Stating this
once is what keeps two structurally identical cases from carrying
different bars, which is how the email-template case came to be gated
more weakly than C1's.

The parent's I1 (every host but a mapped organizer host is unchanged)
binds this phase and is not restated here. The Validation Gate carries
its assertion for the admitted class; P3 carries every case that may
need an exception recorded against it.

## Reality-check inputs

Claims this phase rests on that describe a hosted console rather than a
file, and so can drift without any commit:

- **The current Site URL and the full redirect-allowlist contents.**
  Read at scoping time. Re-read them at implementation time and capture
  them as the rollback record per C3 — the same read serves both.
- **Whether any dashboard-managed email template interpolates Site
  URL.** Resolve it in the console before the change. If one does, the
  retarget changes what that template emits on every host, and P3's gate
  applies — the same bar C1's unadmitted-redirect case carries.
  Recording the observation in the PR does not clear it.
- **Supabase's redirect-URL matching semantics at implementation
  time.** C2's shape rests on the wildcard definitions cited above.
  Re-read the vendor page rather than trusting this plan's summary of
  it.
- **What Supabase does with an explicit redirect the allowlist does not
  admit.** C1 states its bound over allowlisted origins because this is
  unresolved, and the vendor documents it nowhere this plan could find.
  A service-role link requested against a deliberately unlisted redirect
  settles it in one attempt, whose outcome is either a link with a
  destination or a failure — the Validation Gate treats both as records
  rather than treating one as the only result. Resolve it before the PR
  claims anything about that class, and record which shape it is; the
  answer also decides whether C1's conditional I1 exception fires.

## Files to touch

*Estimate of the expected shape, not a binding rule. Implementation may
revise any row when a structural call requires it; deviations are
reported per the Plan-to-PR Completion Gate's Estimate Deviations
callout.*

The binding form of this section is the rule in the Documentation
Currency PR Gate below — every operator-facing statement of what Site
URL points at, and of what shape the redirect allowlist takes, describes
the post-change configuration. The rows below are where those statements
are expected to be found.

**Modify**

| file |
|---|
| `docs/operations.md` |
| `docs/dev.md` |
| `docs/architecture.md` |
| `docs/plans/madrona-organizer-subdomain-launch/phase-2-auth-url-configuration-plan.md` |

**Intentionally not touched**

- `supabase/config.toml`. Representing auth configuration in the repo
  is a separate change with its own blast radius — see Out Of Scope.
- Every application, shared, and edge-function source file. This phase
  changes no code; if a code change turns out to be required, the
  premise that this is a configuration-only phase was wrong and the
  plan needs revising before the deviation lands.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md). Its Tier 5 entry
  names Site URL and redirect-allowlist drift as a category without
  naming a target, so it stays true across this change. **Verified by:**
  that doc's "Tier 5 — Post-Release Production Smoke" opening paragraph.

## Validation Gate

Every step runs before the PR is opened, per C3. Nothing here is
post-merge.

- **`npm run lint`, reported for what it is.** This diff is
  documentation, and the lint command's file selection reaches source
  directories and the apps/site workspace, not markdown — so a pass is
  evidence that the branch is clean, not evidence about this change. It
  is run and reported as such rather than presented as a gate this diff
  passed. **Verified by:** the `lint` script in
  [`package.json`](/package.json) names source directories plus the
  apps/site workspace lint, and neither
  [`eslint.config.mjs`](/eslint.config.mjs) nor
  [`apps/site/eslint.config.mjs`](/apps/site/eslint.config.mjs)
  registers a markdown processor.
- **Sign-in from the organizer host returns to the organizer host.**
  Request a magic link on an authenticated surface reached on the
  organizer host, open the link, and confirm the browser lands back on
  that host — through the callback and on to the requested destination.
  Such a surface already resolves there: the apps/site routes that
  render the magic-link form and the callback are host-agnostic, and the
  organizer host is an alias of that same Vercel project. **Verified
  by:** the apps/site admin route renders the shared sign-in form and
  calls `requestMagicLink`, the apps/site auth-callback route renders
  the shared callback page, and
  [`apps/site/next.config.ts`](/apps/site/next.config.ts) declares no
  host condition on any rewrite, so neither route's resolution depends
  on which alias was requested.
  The falsifier does not depend on the open vendor question: if the new
  entry is absent or malformed, the organizer host's callback is not
  admitted, and an unadmitted callback either sends the visitor to some
  other host or produces no usable link at all. Neither outcome can be
  mistaken for the one this step looks for, so "landed back on the
  organizer host" cannot be produced by the failure it is meant to
  catch.
- **The Site URL retarget is observed, not read back.** Reading the
  field returns what was just typed into it and cannot distinguish a
  saved setting from an unsaved one, or a setting from its effect.
  Observe the documented default instead: a link generated with no
  explicit redirect lands on the canonical site alias. This is the one
  Site URL behavior the vendor does state, which is why it is the step
  that proves the retarget took.
- **Unchanged elsewhere (parent I1).** Run the Production Admin Smoke —
  `npm run test:e2e:admin:production-smoke`, or its workflow. It
  round-trips a real magic link generated against the production
  project's redirect allowlist for the production base URL, so it fails
  if an existing entry stopped matching, and it is independent of this
  branch because this branch deploys nothing. **Verified by:**
  [`tests/e2e/admin-production-smoke.spec.ts`](/tests/e2e/admin-production-smoke.spec.ts)
  runs under the admin auth fixture, whose `generateMagicLink` requests
  a service-role link with an explicit redirect;
  [`scripts/testing/run-production-admin-smoke.cjs`](/scripts/testing/run-production-admin-smoke.cjs)
  requires a production base URL and asserts a production guard on the
  Supabase env names it reads.
  - The local admin e2e wrapper is **not** a substitute here. It
    provisions a local Supabase stack, so it never touches the
    production project's Auth URL configuration and cannot fail on
    allowlist drift. **Verified by:**
    [`scripts/testing/run-admin-e2e-tests.cjs`](/scripts/testing/run-admin-e2e-tests.cjs)
    starts a local Supabase stack and a local functions runtime and
    passes that stack's API URL to the tests.
  - The smoke exercises the allowlist, not Site URL, because it passes
    an explicit redirect. C1's bound on the retarget is carried by the
    default-destination observation above and by the source-tree search
    cited under C1, not by this step.
  - It also covers only the admitted class, which is the class the Goal
    claims is unchanged. The unlisted class is the next step.
- **The unlisted-redirect class is observed, and what the PR claims
  about it matches.** Request a link against a redirect the allowlist
  does not admit, and record the outcome — which is one of two
  observables, not one. Either a link is produced and lands somewhere,
  and the destination is the record; or the request fails, and the error
  is the record. Naming only the first would leave the step with no
  observable at all under the shape C1 says is possible, so it could not
  discriminate the two candidates and would report the rejection shape
  as an inconclusive run.

  This resolves the open reality-check input and decides which shape the
  PR describes; leaving it open would put an unverified vendor-behavior
  claim in a durable doc. The phase lands under either outcome — but the
  outcome that changes what an unadmitted origin sees is one P3 gates,
  so landing then requires the parent-recorded I1 exception or a
  reshaped retarget first, not merely this record.
- **The docs match the console.** Walk every statement the diff makes
  about Auth URL configuration against a fresh console read, per P1.

The parent's named constraint on routing gates does not bind this phase:
it changes no host-conditional routing. The organizer-host step above
does run against production, for the unrelated reason that the organizer
host resolves only there — and it is still pre-merge, because what it
exercises is project configuration rather than anything this branch
deploys.

The parent's Validation Gate owns the composed organizer journey —
sign-in followed by an authoring action that calls an edge function.
That step is deliberately not duplicated here; it is the one check no
single phase can make.

## Self-Review Audits

From [`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- **Canonical-owner duplication audit** — this diff edits auth-surface
  prose in more than one canonical doc, which is the audit's trigger.
  The Doc Ownership table assigns the Supabase Auth surface to
  `docs/architecture.md`, and the repo-managed-versus-manual boundary
  plus the runbook to `docs/operations.md`; the audit is what keeps the
  update from expanding every touched doc in parallel instead of
  pointing the non-owners at the owner.
- **Phase-identifier and target-state-language audit** — the diff
  touches evergreen "what is" prose, and this phase's own vocabulary
  (phase numbering, "will admit," "once the organizer host launches")
  is exactly the rollout-layer language that audit exists to keep out
  of it.

## Risks

**R1. The wildcard path is wider than the vendor recommends.** Supabase
recommends an exact redirect path in production and reserves the
globstar for development and preview URLs
(https://supabase.com/docs/guides/auth/redirect-urls). C2 takes the
wider shape anyway: the console is the surface with no diff, no review,
and no test, so the cost of a return visit is real, and one entry covers
the host's return paths without another one. What it buys the wideness
with is the set of paths on that one host to which a sign-in token may
be delivered — bounded by the host being a literal, and by every path on
it being served by our own Vercel project. The narrower per-path entry
remains expressible in the same console field, so this is a reversible
call, not a fork.

**R2. Returning to the right origin is not a working organizer
journey.** This phase decides where a sign-in link lands. What the
organizer does after landing — authoring actions that call edge
functions — depends on phase 1's admission, and short paths on the
organizer host depend on phases 3 and 4. Nothing here should be read as
"the organizer host is launched."

**R3. The change has no automated guard.** Nothing in CI reads Auth URL
configuration, so drift after this phase is invisible until a sign-in
fails. The compensating control is the existing Tier 5 production smoke,
which names this configuration as one of the drift categories it exists
to catch. **Verified by:**
[`docs/testing-tiers.md`](/docs/testing-tiers.md) "Tier 5 — Post-Release
Production Smoke" names Supabase Auth Site URL and redirect-allowlist
drift.

## Documentation Currency PR Gate

Every operator-facing statement of what Site URL points at, and of what
shape the redirect allowlist takes, describes the post-change
configuration. The rule is stated over the category rather than over a
list of files because the failure it prevents is a surface that was
missed, and a list cannot name the one that was.

Two statements are load-bearing enough to name specifically:

- The organizer-subdomain onboarding requirements. Per the parent's
  Documentation Currency PR Gate, `docs/dev.md` "Vercel" must end up
  naming every requirement together; this phase contributes the Supabase
  Auth redirect entry, alongside the Vercel alias, the mapping entry,
  and the edge-function origin admission plus redeploy that other phases
  contribute. That list did not carry the redirect entry when this plan
  was drafted — the omission was found in review of this phase and fixed
  in the parent, since the parent owns the close-out the list gates.
- The convention the redirect allowlist follows, per C2 — that it now
  admits an exact-path shape and a wildcard-path shape, and which host
  uses which.

## Out Of Scope

- **Custom SMTP, and the built-in email ceiling behind it.** Struck from
  this phase by scoping O5 and carried as a task-level risk rather than
  a phase deliverable. **Verified by:** the parent task plan's Risk
  Register R2 states the acceptance and the condition that resurfaces
  it; the ceiling itself and the custom-SMTP remedy are documented at
  https://supabase.com/docs/guides/auth/auth-smtp.
- **Representing Auth URL configuration in the repository.** The
  Supabase CLI can express auth settings declaratively, but this
  repository has never done so and the release path does not push
  configuration, so adopting it would change how every environment's
  auth settings are managed — a platform-management decision that does
  not belong inside one organizer's launch. **Verified by:**
  `supabase/config.toml` carries only per-function sections, and
  `.github/workflows/release.yml`'s Supabase job pushes migrations and
  deploys functions with no configuration-push step. This phase opens no
  tracking entry for the alternative; it is recorded here as the
  considered-and-declined shape, and this plan is the durable record of
  that.
- **Retargeting `NEXT_PUBLIC_SITE_ORIGIN`.** A different setting on a
  different system that the parent already places out of scope for the
  whole task. **Verified by:** the parent task plan's Out Of Scope
  section, first entry.
- **Admitting any host other than the organizer's.** Preview and branch
  aliases reach the edge functions through a separate opt-in matcher and
  are not part of the auth-redirect question. **Verified by:**
  `matchesAppsSitePreviewAlias` in
  [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts)
  is an edge-function admission path with its own env-var opt-in, with
  no counterpart in Auth URL configuration.

## Related Docs

- [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
  — establishes that the plugin deployment is not advertised as a
  customer-facing origin, which is what makes the current Site URL the
  wrong target.
- [`docs/operations.md`](/docs/operations.md) "Manually Maintained
  Settings" — owns the boundary this phase's configuration sits on.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) "Tier 5" — owns the
  drift category R3 relies on.
