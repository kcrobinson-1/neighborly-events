# Plan-Implementation Workflow

Per-session-type playbook for implementing a documented plan from
[`docs/plans/`](/docs/plans/) or
[`docs/plans/epics/`](/docs/plans/epics/). Layer this on top of
[`implementation.md`](./implementation.md), which carries the
base lightweight + full structured paths, execution rules, refactor
completion proof, and reference-file routing (pre-edit gate /
mid-session validation / mid-session doc-currency / per-commit
PR-template). This file does **not** duplicate that routing —
plan-implementing sessions inherit it.

The sequence below is the additional discipline a plan-implementing
session adds on top of `implementation.md`.

## Read the plan in full before the first edit

The plan-implementing session's first move is to read the plan
end-to-end, even if the prompt only names a subset of work.

- Read `Status`, `Goal`, `Cross-Cutting Invariants`, `Contracts`
  (and per-module sections), `Files to touch — new / modify /
  intentionally not touched`, `Execution Steps`, `Commit Boundaries`,
  `Validation Gate`, `Self-Review Audits`, `Documentation Currency
  PR Gate`, and `Risk Register`.
- The plan's `Self-Review Audits` section names which audits from
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  apply to which surface — load the named audits at the matching
  commit boundaries, not as a final pass.
- The plan's `Cross-Cutting Invariants` section binds rules that
  must hold simultaneously across multiple files. Walk every call
  site the diff touches against each invariant, not just the site
  the invariant was first triggered by.

## Distinguish rule deviations from estimate deviations

A plan carries two kinds of content (see
[`planning/shared.md`](../planning/shared.md) "Plan content is a
mix of rules and estimates"):

- **Rule-shaped sections** (`Cross-Cutting Invariants`, `Contracts`,
  `Validation Gate`, `Goal`, `Self-Review Audits`,
  `Risk Register` mitigations, `Out Of Scope`) bind the
  implementation. Deviating from a rule means the rule is wrong;
  the plan must be revised in the same PR before the deviation
  lands.
- **Estimate-shaped sections** (`Files to touch — new / modify /
  intentionally not touched`, `Execution Steps` sequencing,
  `Commit Boundaries`, sometimes per-section LOC predictions)
  estimate the expected shape. Deviating from an estimate is
  normal; record it in the PR body's `Estimate Deviations`
  section per [`reference/pr-template.md`](../reference/pr-template.md)
  "Section-specific rules" and reconcile the plan-doc estimate
  to match what shipped per
  [`planning/plan-to-pr.md`](../planning/plan-to-pr.md) "Call
  out estimate deviations."

When the call between rule and estimate is unclear, ask. Do not
treat an estimate as a hard ban or treat a rule as discretionary.

## Plan-to-PR Completion Gate

Before opening or updating the plan-implementing PR, walk the gate
in [`planning/plan-to-pr.md`](../planning/plan-to-pr.md):

- Walk every Goal, Test, Validation step, and Self-Review audit
  named in the plan; each is satisfied or explicitly deferred **in
  the plan itself** with written rationale.
- Flip the plan's `Status` line per the lifecycle rule (same-PR
  flip is the default; the post-release-validation exception
  splits the flip into two phases — see plan-to-pr.md and
  [`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
  Gate For Plans With Post-Release Validation").
- Reconcile every estimate-shaped plan section against the merged
  diff so the plan describes what shipped, not the pre-implementation
  guess.
- Write the `Estimate Deviations` callout in the PR body per
  [`reference/pr-template.md`](../reference/pr-template.md).

## When the plan says X but reality is Y

If a reality-check during implementation finds that a plan rule is
wrong (a Cross-Cutting Invariant turning out to be wrong, a contract
that can't be satisfied, a Validation Gate command that doesn't
exercise what it claims), fix the plan in the same PR before the
implementation deviation lands. This is distinct from estimate
deviations: rule deviations require a plan-doc rewrite, estimate
deviations require a PR-body callout plus a plan-doc reconciliation
to match what shipped.

If a reviewer flags a gap that should have been named at plan time,
fix the plan first (tighten the requirement or defer with rationale),
then address the gap. Do not carry the gap as a post-merge follow-up
without updating the plan.

If a plan requirement cannot be fully satisfied in the intended PR,
split the plan along a phase boundary before merging partial work so
each phase's `Status` can flip independently, rather than merging a
partially-satisfied plan and tracking the remainder informally.
