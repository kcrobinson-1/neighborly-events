# Planning Doc Discovery Hint

You are reading or editing a file under [`docs/plans/`](/docs/plans/).
This is a **router fragment** — it does not carry rule content.

## If you are drafting or editing a plan

Load the planning rules from [`docs/agents/planning/`](/docs/agents/planning/):

- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md) —
  cross-level rules every plan-drafting session needs (`Verified by:`
  annotations, falsifiability check, rules-vs-estimates labeling,
  plan-code minimalism, planning-artifacts-cite-each-other anti-pattern,
  exact-match label quoting, `In draft` → `Proposed` promotion gate,
  Cross-Cutting Invariants section requirement)
- Plus the per-level file for the plan's level:
  - Epic-level docs (`docs/plans/epics/<slug>/epic.md`):
    [`docs/agents/planning/epic.md`](/docs/agents/planning/epic.md)
  - Milestone-level docs
    (`docs/plans/epics/<slug>/m<N>-<short-slug>.md` or pre-convention
    `docs/plans/m<N>-<short-slug>.md`):
    [`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md)
  - Phase-level docs (`docs/plans/epics/<slug>/m<N>-phase-<X>-<Y>-plan.md`
    and the matching scoping doc under `scoping/`, or pre-convention
    `docs/plans/m<N>-phase-<X>-<Y>-plan.md` and
    `docs/plans/scoping/m<N>-phase-<X>-<Y>.md`):
    [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)

The Plan-to-PR Completion Gate (Status lifecycle, Estimate Deviations
PR-body callout, soft-commitment ban) lives inside `shared.md` as a
cross-level section — no separate file to load.

## If you are implementing a plan

Load [`docs/agents/workflows/plan-implementation.md`](/docs/agents/workflows/plan-implementation.md)
on top of [`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md).

## File-layout convention

[`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
defines the in-repo layout for plan docs (cross-cutting plans,
epic-folder convention, pre-convention flat layout, archive policy).

The root [`AGENTS.md`](/AGENTS.md) router carries the full session-type
routing table; this file fires on file-read in `docs/plans/` as a
Claude-Code-specific safety net so a session that opens a plan doc
without first re-reading the root router still loads the right files.
