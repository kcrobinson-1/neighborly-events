# Plan-to-PR Completion Gate

The gate that an implementing PR walks before merge, and the
Status lifecycle that gate produces. Loaded by:

- [`workflows/plan-implementation.md`](../workflows/plan-implementation.md)
  for the implementing-PR walk
- [`phase.md`](./phase.md) at plan-drafting time when the plan's
  Validation Gate is scoped (the post-release-validation
  exception below informs how Validation Gate is named)
- The Plan-to-Landed close-out session (the doc-only follow-up PR
  that flips Status when post-release validation passes)

A PR that implements a plan must leave the plan in a terminal state.
"Most of the plan" is not "the plan." A plan doc that still says
`Proposed` or `In progress` after its implementation merges is drift,
and drift compounds into follow-up PRs that re-review the same
decisions.

- before opening the PR, walk every Goal, Test, Validation step, and
  Self-Review audit named in the plan; for each one confirm it is
  either satisfied in the PR or explicitly deferred **in the plan
  itself** with written rationale. Deferrals live in the plan, not in
  the PR body, not in an issue, not as an unwritten promise
- flip the plan's Status line from `Proposed` / `In progress` to
  `Landed` in the same PR that implements it. Plans in active
  multi-pass drafting may carry an interim `In draft` Status before
  `Proposed`; the `In draft` → `Proposed` flip is gated by the
  promotion-gate rule in [`shared.md`](./shared.md)
  "`In draft` → `Proposed` promotion gate." Do not
  record commit SHAs in the Status block — `git log` and `git blame`
  are authoritative for navigating from plan to history, and recording
  SHAs creates a chicken-and-egg problem (the SHA isn't known until
  after merge, which forces a follow-up commit whose only purpose is
  to record the previous commit's SHA). Same-PR flip is the default
  whenever the plan's Validation Gate can be fully satisfied pre-merge.
  Exception: plans whose Validation Gate names a check that can only
  run post-release (Tier 5 production smoke is the canonical case)
  land in two phases per [`docs/testing-tiers.md`](/docs/testing-tiers.md)
  "Plan-to-Landed Gate For Plans With Post-Release Validation" — the
  implementing PR merges with Status `In progress pending <validation-name>`,
  where the name is a stable, exact-match label for the specific check
  (the canonical Tier 5 case is exactly `In progress pending prod smoke`;
  see testing-tiers.md for non-smoke precedents); a follow-up doc-only
  commit flips Status to `Landed` and records the post-release
  validation run URL once the post-release run passes. The run URL is
  durable external evidence, unlike a commit SHA which is already in
  git. This is the single authoritative status rule for that case; do
  not invent additional states or leave the flip to an informal
  post-merge promise
- ban soft-commitment words in plans: "optional but recommended,"
  "consider adding," "nice to have," "probably should." A requirement
  is either in-scope or deferred — there is no third option. Soft
  commitments silently relax under review pressure and reappear as
  reviewer findings after merge
- if a reviewer flags a gap that should have been named at plan time,
  fix the plan first (tighten the requirement or defer with rationale),
  then address the gap. Do not carry the gap as a post-merge follow-up
  without updating the plan
- if a plan requirement cannot be fully satisfied in the intended PR,
  split the plan along a phase boundary before merging partial work so
  each phase's Status can flip independently, rather than merging a
  partially-satisfied plan and tracking the remainder informally
- **Call out estimate deviations in the PR body, and update the
  plan to match what shipped.** When implementation diverges from
  an estimate-shaped section of the plan ("Files intentionally not
  touched" ended up touched, "Files to touch — new" missed a file,
  contract bullets gained a requirement, intended commit boundaries
  reshuffled, an execution step was unnecessary or had to be
  split), two things must happen in the same PR:
  - The **PR body** names the deviation explicitly under a
    `## Estimate Deviations` heading inserted immediately after
    `## Documentation` (or `N/A` if no deviations). Each entry is
    one or two sentences naming the estimative section, the
    actual outcome, and why the call was the right one — enough
    that a reviewer can audit the deviation without reading the
    diff cold. This is the rationale and audit trail.
  - The **plan doc** is updated so its estimate-shaped sections
    describe what actually shipped, not the pre-implementation
    guess. Walk every estimate-shaped section ("Files to touch —
    new / modify / intentionally not touched," per-module
    Contracts, Execution steps, Commit boundaries) and reconcile
    each against the merged diff. A plan that says "Files
    intentionally not touched: X" after we shipped an X edit is
    the same shape of drift the Status-flip rule already forbids
    — the plan must describe the implemented system, not the
    pre-implementation guess. The PR body says *why we deviated*;
    the plan says *what shipped*.
  Distinct from the rule-deviation path above: rule deviations
  (a Cross-Cutting Invariant turning out to be wrong, a contract
  that can't be satisfied, a Validation Gate command that doesn't
  exercise what it claims) require the plan rule itself to be
  rewritten in the same PR; estimate deviations require the
  estimate-shaped section to be updated to match reality, plus
  the PR-body callout. Pre-existing PR templates do not need the
  Estimate Deviations heading until they are next edited; PRs
  opened from this point forward must include the section, and
  plan-implementing PRs must reconcile the plan with what shipped
  per the bullet above
