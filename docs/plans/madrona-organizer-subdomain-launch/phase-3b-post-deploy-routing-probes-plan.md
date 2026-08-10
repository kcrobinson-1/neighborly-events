# Phase 3b — Post-deploy organizer-host routing probes

**Status:** `In draft`

## Context

Phase 3 made the organizer host serve the organizer's event. Its
functional checks key on a hostname that resolves only to production,
so they are structurally post-merge — and the gate that lets a plan
merge ahead of its validation requires the validation to run from a
committed entry point, so the run URL it produces is durable evidence
rather than a soft promise. A manually-walked probe produces no such
artifact.

This phase is that entry point: a runner that probes an organizer
host's routing against the deployed surface, dispatchable on demand
and re-runnable against any organizer host, wired into the
deployed-surface smoke family.

It exists as its own phase because phase 3's implementation was split
across two PRs by stakeholder decision, to get the organizer host
serving sooner. The routing change merged without the runner, so the
runner is a plan requirement outstanding after a merge — and that has
to carry its own `Status` rather than hide under phase 3's, which
names only the deployed verification. Splitting here is what keeps the
outstanding work attributable instead of tracked informally.

**Verified by:**
[`docs/agents/workflows/plan-implementation.md`](/docs/agents/workflows/plan-implementation.md)
"When the plan says X but reality is Y" requires a plan requirement
that cannot be fully satisfied in the intended PR to be split along a
phase boundary before partial work merges, so each phase's `Status`
can flip independently. Surfaced by Codex review on phase 3's
implementing PR, against a first attempt that recorded the split in
phase 3's prose while leaving both slices under one `Status`.

Parent task plan:
[`madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md).
Sibling:
[`phase-3-organizer-host-mapping-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-3-organizer-host-mapping-plan.md),
which owns the routing change this runner probes and states the
assertions the runner makes.

**Scoping is required, and this doc is `In draft` until it exists.**
The narrow-surface carve-out does not apply: its fifth criterion is
"no novel mechanism," and C2 below needs one. Proving that an origin
is serving the commit under test has no established pattern in this
repo — nothing under `scripts/`, `apps/site/`, or `.github/workflows/`
reads a deployed commit marker, and the readiness helper the existing
seam uses answers a different question, as C2 records. Until that
mechanism is resolved, C2 states a requirement without naming how it
is met, and the runner cannot reliably tell a stale deployment from a
broken rewrite — the discriminator its rollback gate depends on.

**Verified by:**
[`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md)
"Narrow-surface plans may skip the scoping doc" requires all five
criteria to hold and routes a novel mechanism to the
"Spike before plan for novel mechanisms" rule; a grep for a deployed
commit marker across `scripts/`, `apps/site/app/`, `apps/site/lib/`,
and `.github/workflows/` returns nothing. Surfaced by Codex review on
phase 3's implementing PR, against a first draft of this doc that
claimed the carve-out and carried `Proposed`.

**The pending input**, per the promotion gate: what proves deployment
identity. The candidates a scoping pass weighs are an
application-served commit marker on apps/site, the deployment
metadata Vercel exposes for the alias under test, and a content
fingerprint of a route this phase's own change alters. Each differs
in what it proves and in what it costs the routing phase — the first
adds a surface phase 3 deliberately did not add. `In draft` → `Proposed`
follows that resolution and the promotion gate's self-review walk.

What is *not* open, and does not need re-deliberating: what the probes
assert, why they run from a committed entry point, and which workflow
seam they join. Phase 3 settled those.

The rest of this doc is the structure that scoping resolves into, laid
out now so the deferral is legible rather than a placeholder.

## Goal

- The post-merge bullets of phase 3's Validation Gate run from a
  committed entry point, on the deployed surface, and produce a run
  URL.
- The runner takes its hosts from the host→event mapping and its
  canonical origin from configuration, so the same check re-runs
  against the next organizer host without an edit.
- Phase 3 can reach `Landed`, recording the URL of the run that
  passed.

Not in this phase's goal: any change to what the organizer host
serves. This phase adds no rewrite and touches no routing config. If
a probe fails, the fix belongs in a revert or a follow-up to phase 3,
not here.

## PR shape and Status lifecycle

One PR.

Its own validation is satisfiable pre-merge in part and post-merge in
full, which is the same shape phase 3 has and for the same reason:
the organizer-host rows resolve only on production. The runner's own
correctness — argument handling, host selection from the mapping, the
empty-set guard, assertion wiring — is exercisable pre-merge against
the canonical alias, which resolves today.

- `Proposed` → `Landed` in the implementing PR if a dispatched run
  against production passes before merge, recording that run's URL.
- Otherwise `Proposed` → `In progress pending organizer-host probe
  run` on merge, → `Landed` in a follow-up doc-only commit recording
  the run URL, per
  [`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
  Gate For Plans With Post-Release Validation".

**This phase's `Landed` flip and phase 3's are separate events with a
shared trigger.** One passing run satisfies both, but they are
different claims — that the check exists and runs, and that the
routing it checks is correct on the real hostname — and a run that
fails distinguishes them: a runner defect leaves phase 3 unverified
rather than falsified.

## Contracts

### C1. The runner reads its targets, and fails rather than passing empty

Organizer hosts come from
[`shared/urls/organizerHosts.ts`](/shared/urls/organizerHosts.ts) and
the canonical origin from configuration, not from literals in the
runner. A run reports what it probed, and an empty host list or a
skipped assertion class is a failure, not a pass. A runner that passes
because it silently probed nothing is the failure this contract
exists to prevent.

This is phase 3's L1 and L4 applied to the check surface: an
exact-match rule enforced in the routing layer and approximated in the
runner is indistinguishable from working until an unmapped near-match
host arrives.

### C2. Deployment identity is established before any assertion counts

**Not decision-complete — this is the contract the pending input
resolves, and the reason this doc is `In draft`.** What follows states
the requirement and why it binds; *how* identity is proven is the open
question named in Context, and promotion to `Proposed` means this
contract names a mechanism.

The run confirms the origin is serving the commit under test. Until it
has, a failing assertion means "not deployed yet" and the run keeps
waiting within a bound rather than reporting failure.

This is the discriminator the rest of the gate depends on. Every
assertion fails identically against a stale build and against a
genuinely wrong rewrite, and phase 3 attaches a rollback to that
failure — so without an identity check the gate can trigger a revert
for a deploy that was merely still propagating.

Two specifics make this a real race rather than a theoretical one, and
they are why the existing seam cannot be inherited unchanged:

- The workflow this check joins triggers on the Release workflow's
  completion, and Release synchronizes Supabase only — it neither
  performs nor waits for the Vercel deployment, which the Git
  integration runs independently.
- The readiness helper that workflow already uses treats any non-error
  status as ready, which the *previous* deployment returns for every
  path phase 3 does not change.

**Verified by:** `.github/workflows/release.yml`'s only job is named
for syncing Supabase and its steps link the project, push migrations,
and deploy functions, with no Vercel step or wait; `waitForRouteReady`
in `scripts/testing/run-production-admin-smoke.cjs` returns as soon as
a response status is at least 200 and below 400, with its comment
scoping that contract to transient 404s during propagation.

### C3. Every probed class carries a canonical-host assertion beside its organizer-host one

The parent's I1 — every host but a mapped organizer host is unchanged
— is invisible to any surface that exercises only the new host. The
runner asserts both, on the same run, rather than inferring the
canonical result from the organizer-host one.

## Files to touch

*Estimate of the expected shape, not a binding rule.*

**New**

| file | why |
|---|---|
| a runner under `scripts/testing/` | the post-deploy host-routing probes, as a committed entry point that produces a run URL |

**Modify**

| file | why |
|---|---|
| `package.json` | the script entry the runner is invoked through |
| `.github/workflows/production-admin-smoke.yml` | where the probes run on the deployed surface — a new job there, or a sibling workflow if the environment or trigger shape does not fit |
| `docs/dev.md` | the validation-command list |
| `docs/testing.md` | the validation-command list, per the validation-command coupling audit |
| `phase-3-organizer-host-mapping-plan.md` | its `Landed` flip, in the follow-up doc-only commit that records the run URL |

**Intentionally not touched**

- `apps/site/next.config.ts`, `shared/urls/organizerHosts.ts`, and
  the routing-topology prose. This phase checks phase 3's routing; it
  does not change it.
- Every surface phase 3 lists as not touched. Nothing here widens
  that boundary.

## Validation Gate

**Pre-merge.**

- `npm run lint`, `npm test`.
- The runner exercised against the canonical alias, which resolves
  today. Its organizer-host rows do not resolve until phase 3's change
  is deployed, but the runner's own correctness does not depend on
  them. Without this the runner ships never having run, and its first
  execution is the one phase 3's close-out depends on.
- The empty-set guard exercised by running against a mapping with no
  matching host, confirming the run fails rather than passing.

**Post-merge — these gate the `Landed` flip.**

- A dispatched run against production passes, having first
  established deployment identity per C2.
- The run's assertions are phase 3's post-merge Validation Gate
  bullets: the organizer host's root and short feedback path, the
  canonical alias's root and long event paths, the asset classes, and
  the near-match host receiving none of the organizer rows.
- The run URL is recorded in phase 3's close-out commit and this
  phase's own.

## Self-Review Audits

From [`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- **Validation-command coupling audit** — this diff adds a script
  entry and changes a workflow definition, both of which the audit's
  trigger names. Its check is that every doc cataloguing validation
  commands matches the authoritative source, which is why the
  command-list docs are in the file inventory above.

## Risks

**R1. The runner is the artifact two plans' close-outs depend on.**
Phase 3 cannot reach `Landed` without it, so a defect here blocks a
merged change from closing out. The compensating control is the
pre-merge exercise against the canonical alias: the runner does not
ship never having run.

**R2. A probe that fails for a deployment-propagation reason reads as
a routing failure.** C2 is the control; R1 of phase 3 is the
neighbouring case where a compensating control had to read emitted
structure rather than served results for the same reason.

## Related Docs

- [`phase-3-organizer-host-mapping-plan.md`](/docs/plans/madrona-organizer-subdomain-launch/phase-3-organizer-host-mapping-plan.md)
  — owns the routing change this runner probes, and the post-merge
  assertions it makes.
- [`madrona-organizer-subdomain-launch.md`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md)
  — parent task plan; owns I1 and the named constraint on every
  routing gate.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) — the
  Plan-to-Landed gate for plans with post-release validation.
