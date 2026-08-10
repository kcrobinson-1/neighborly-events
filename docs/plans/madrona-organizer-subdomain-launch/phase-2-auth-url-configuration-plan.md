# Phase 2 — Auth URL configuration

**Status:** `Proposed`

One PR, and no close-out commit. The `Proposed` → `Landed` flip happens
in that same PR rather than in a follow-up; C2 says why, and what the
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
event's materials is not returned to it. That is configuration, it is
one console visit, and it is not visible in the repository. This phase
closes it and writes down what changed, because the repository's
description of this configuration is the only copy anyone can review.

**This phase was trimmed to that one half.** It was drafted with a
second: retargeting the project's Site URL from the plugin deployment's
alias to `apps/site`'s canonical alias. The stakeholder dropped it, and
the parent's Out Of Scope owns the reasoning — in short, every flow in
this repository passes an explicit redirect, so the retarget buys this
event nothing, while carrying two vendor questions this plan could not
resolve from documentation. What that removes from this plan is a
contract, an invariant, two validation steps, and a conditional
exception against the parent's I1; what remains is the entry, and the
docs that describe it.

**Scoping.** This phase does not carry its own scoping doc, and does not
need the narrow-surface carve-out to justify that: the task's scoping
doc already owns this phase's deliberation. D6 establishes that no
redirect entry matches the organizer host; O5 strikes the email ceiling
from this phase's scope. (D6's Site URL half and O3, which resolved the
retarget, are superseded by the drop above.) Those are the decisions a
phase-2 scoping doc would have had to make, and restating them here
would be the scoping-restates-plan trap. What follows is the durable
contract those decisions imply, plus the phase-specific residue under
Reality-check inputs — claims that can drift between the task's scoping
and this phase's implementation because they describe a console, not a
file.

## Goal

- A magic link requested from the organizer host returns to the
  organizer host.
- Sign-in from every origin the allowlist admitted *before* this phase
  behaves as it does today, and none of them loses a working return leg.
  The organizer host is the one origin whose behavior this phase changes,
  and gaining a return leg there is the point of the bullet above — the
  preservation claim is about the set that already worked, not about
  every admitted origin after the change.
- Origins the allowlist does not admit are unaffected. This phase only
  adds an entry, so nothing about how an unadmitted redirect is treated
  changes, whatever that treatment is. P2 carries this.
- The repository's operator-facing description of Auth URL configuration
  describes the configuration that is live.

Sign-in returning to the right origin is not the same as the organizer
journey working end to end; R2 below says what still separates them.

## Contracts

### C1. The organizer host is admitted by an exact-host entry with a wildcard path

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

### C2. The configuration change lands before the PR, and Status flips in that PR

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
  The console edit is the stakeholder's to make and is not gated on
  this plan, so it may already have happened when this phase is
  implemented. Where it has, this bullet is spent: no pre-change
  snapshot can be reconstructed, and the rollback record is the
  post-change read plus the fact that the entry this phase adds is the
  only one it added. Record that rather than implying a snapshot
  exists — the entry is additive and P2 bounds what removing it again
  would affect, which is what keeps the spent capture survivable
  rather than merely regrettable.
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
shape the redirect allowlist takes, and nothing checks them against the
project. Each is written from a post-change read of the console.

**P2. This phase only adds redirect entries.** No existing entry is
removed, narrowed, or reworded. Every already-admitted return leg —
including the localhost redirects the auth e2e fixtures depend on —
keeps working because nothing it matches against was touched.
**Verified by:**
[`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts)
composes its callback redirect against a localhost base URL, so those
entries are load-bearing for the auth fixtures.

**This is also what makes the unadmitted class a non-question.** What
Supabase does with an explicit redirect the allowlist does not admit —
an `apps/site` preview alias is the live example — is a vendor
behavior this plan never established and the vendor's redirect-URL page
does not state. It does not need establishing: whatever that treatment
is, it is a function of the allowlist not matching, and no origin's
match result changes here except the organizer host's, which goes from
unmatched to matched. This was an open question only while the phase
also retargeted Site URL, which is the setting an unadmitted redirect
was suspected of falling back to. The drop removed both the retarget
and the question, along with the conditional exception against the
parent's I1 that hung on it.

The parent's I1 (every host but a mapped organizer host is unchanged)
binds this phase and is not restated here. The Validation Gate carries
its assertion for the previously-admitted class; the paragraph above
carries the unadmitted one.

## Reality-check inputs

Claims this phase rests on that describe a hosted console rather than a
file, and so can drift without any commit:

- **The full redirect-allowlist contents.** Read at scoping time.
  Re-read at implementation time; that read is what every statement the
  PR makes about the allowlist is written from, and it doubles as the
  rollback record per C2. Do not write the entry's shape into the docs
  from the shape this plan specifies — C1 says what to ask for, the
  console says what is there, and the docs describe the console.
- **Supabase's redirect-URL matching semantics at implementation
  time.** C1's shape rests on the wildcard definitions cited above.
  Re-read the vendor page rather than trusting this plan's summary of
  it.

## Files to touch

*Estimate of the expected shape, not a binding rule. Implementation may
revise any row when a structural call requires it; deviations are
reported per the Plan-to-PR Completion Gate's Estimate Deviations
callout.*

The binding form of this section is the rule in the Documentation
Currency PR Gate below — every operator-facing statement of what shape
the redirect allowlist takes describes the post-change configuration.
The rows below are where those statements are expected to be found.

**Modify**

| file |
|---|
| `docs/operations.md` |
| `docs/dev.md` |
| `docs/architecture.md` |
| `docs/plans/madrona-organizer-subdomain-launch/phase-2-auth-url-configuration-plan.md` |

**Intentionally not touched**

- **Every existing operator-facing statement about Site URL** — in
  `docs/architecture.md`, `docs/operations.md`, and `docs/dev.md`
  alike. Site URL is not retargeted, so those statements stay true, and
  editing them would be the diff describing a change nobody made. This
  row exists because the earlier two-half version of this phase would
  have touched all of them, so the temptation to sweep them is a
  leftover from a scope that no longer applies.
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

Every step runs before the PR is opened, per C2. Nothing here is
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
  The falsifier does not depend on what Supabase does with an
  unadmitted redirect: if the new entry is absent or malformed, the
  organizer host's callback is not admitted, and an unadmitted callback
  either sends the visitor to some other host or produces no usable
  link at all. Neither outcome can be mistaken for the one this step
  looks for, so "landed back on the organizer host" cannot be produced
  by the failure it is meant to catch.

  **This step is also the only proof the entry took.** Reading the
  console field back confirms what it says, not that it matches; a
  malformed pattern reads exactly like a working one. The round trip is
  what distinguishes them, which is why the read-back required by C2
  and P1 governs what the *docs* say and this step governs whether the
  configuration *works*.
- **Unchanged elsewhere (parent I1), asserted on the canonical apps/site
  alias by name.** I1 is about that alias specifically, so the gate is
  a magic-link round trip whose callback is the canonical alias's, and
  the step is satisfied by observing that round trip — not by observing
  that some production round trip passed.

  The Production Admin Smoke — `npm run test:e2e:admin:production-smoke`,
  or its workflow — is the right vehicle **only if its configured target
  is that alias.** Its base URL and its callback override are repository
  *variables*, not repository files, so which entry it exercises cannot
  be read from this branch: the checked-in example documents the base
  URL as a web deployment, and the callback can be pointed somewhere
  else again independently of it. Read both configured values first. If
  they resolve to the canonical alias and a matching callback, the smoke
  discharges this step; if they do not, run the canonical-alias round
  trip directly and treat the smoke as covering a different origin.
  Skipping that read would let the step pass while the apps/site
  redirect entry was broken during the console edit, which is the
  regression it exists to catch. **Verified by:**
  [`tests/e2e/admin-production-smoke.spec.ts`](/tests/e2e/admin-production-smoke.spec.ts)
  runs under the admin auth fixture, whose `generateMagicLink` requests
  a service-role link with an explicit redirect;
  [`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts)
  composes that redirect from `PRODUCTION_SMOKE_BASE_URL` but lets
  `TEST_ADMIN_REDIRECT_URL` replace it outright;
  [`.github/workflows/production-admin-smoke.yml`](/.github/workflows/production-admin-smoke.yml)
  supplies both from repository variables; and
  [`scripts/.env.example`](/scripts/.env.example) documents the base URL
  as a web-deployment origin.
  - The local admin e2e wrapper is **not** a substitute here. It
    provisions a local Supabase stack, so it never touches the
    production project's Auth URL configuration and cannot fail on
    allowlist drift. **Verified by:**
    [`scripts/testing/run-admin-e2e-tests.cjs`](/scripts/testing/run-admin-e2e-tests.cjs)
    starts a local Supabase stack and a local functions runtime and
    passes that stack's API URL to the tests.
  - The smoke exercises the allowlist, because it passes an explicit
    redirect — which is exactly the surface this phase changes, so it
    is the right instrument rather than an approximate one.
  - It covers only the previously-admitted class, which is the class
    the Goal claims is unchanged — not the organizer host, whose
    admission is the intended change and whose round trip is the step
    above.
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
(https://supabase.com/docs/guides/auth/redirect-urls). C1 takes the
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
functions — depends on phase 1's admission, and the organizer host's
short paths on phase 3. Nothing here should be read as "the organizer
host is launched."

**R3. The change has no automated guard.** Nothing in CI reads Auth URL
configuration, so drift after this phase is invisible until a sign-in
fails. The compensating control is the existing Tier 5 production smoke,
which names this configuration as one of the drift categories it exists
to catch. **Verified by:**
[`docs/testing-tiers.md`](/docs/testing-tiers.md) "Tier 5 — Post-Release
Production Smoke" names Supabase Auth Site URL and redirect-allowlist
drift.

## Documentation Currency PR Gate

Every operator-facing statement of what shape the redirect allowlist
takes describes the post-change configuration. The rule is stated over
the category rather than over a list of files because the failure it
prevents is a surface that was missed, and a list cannot name the one
that was. Statements about Site URL are outside the category now that
the retarget is dropped — they are unchanged and stay that way, per
Files to touch.

Two statements are load-bearing enough to name specifically:

- The organizer-subdomain onboarding requirements. Per the parent's
  Documentation Currency PR Gate, `docs/dev.md` "Vercel" must end up
  naming every requirement together; this phase contributes the Supabase
  Auth redirect entry, alongside the Vercel alias, the mapping entry,
  and the edge-function origin admission plus redeploy that other phases
  contribute. That list did not carry the redirect entry when this plan
  was drafted — the omission was found in review of this phase and fixed
  in the parent, since the parent owns the close-out the list gates.
- The convention the redirect allowlist follows, per C1 — that it now
  admits an exact-path shape and a wildcard-path shape, and which host
  uses which.

## Out Of Scope

- **Retargeting Site URL.** Drafted as this phase's second half and
  dropped by the stakeholder; the parent's Out Of Scope, "No Site URL
  retarget," is the durable record of the reasoning and this phase does
  not restate it. What it means here is narrow and worth being blunt
  about: this phase does not touch Site URL, so whatever it points at
  it keeps pointing at — a default nothing in this repository reaches,
  since every flow passes an explicit redirect — and every doc that
  describes it today stays as it is.
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
  customer-facing origin, which is what made Site URL's target look
  wrong on its own terms. That reading stands; what changed is that
  correcting it was judged not worth its cost for this event.
- [`docs/operations.md`](/docs/operations.md) "Manually Maintained
  Settings" — owns the boundary this phase's configuration sits on.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) "Tier 5" — owns the
  drift category R3 relies on.
