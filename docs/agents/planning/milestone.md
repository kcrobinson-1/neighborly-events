# Milestone Planning Sessions

Per-level planning playbook for **milestone-planning** sessions.
Loads [`shared.md`](./shared.md) for cross-level planning rules
(`Verified by:` annotations, falsifiability check, rules-vs-
estimates labeling, plans-describe-contracts-not-implementation
(structural code minimalism plus contract-altitude discipline
across all plan content), plan-doc review stance, planning-
artifacts-cite-each-other anti-pattern, exact-match label quoting). This file covers what is unique to the
milestone level.

A milestone planning session establishes durable cross-phase
coordination for a multi-phase milestone (M2, M3, M4 in the Event
Platform Epic). Run this session once at the start of a milestone,
before any per-phase planning.

- **Goal.** Produce the milestone doc: restated milestone goal, phase
  sequencing with dependency rationale, cross-phase invariants that
  thread multiple phases, cross-phase decisions that lock contracts
  between phases, milestone-level risks, doc-currency map across the
  milestone set. Path follows the epic's in-repo plan layout (see
  the path-conventions paragraph in [`epic.md`](./epic.md)):
  `docs/plans/epics/<epic-slug>/m<N>-<short-slug>.md` for epics under
  the epic-folder convention, or `docs/plans/m<N>-<short-slug>.md` for
  pre-convention epics
- **Phase dependency graph.** The milestone doc's "Sequencing"
  section opens with a Mermaid `flowchart LR` block: each phase
  is a node, "blocks" relationships are arrows (an `A --> B`
  edge means A blocks B / B depends on A), the upstream
  milestone (e.g. M1 for an M2 doc) appears as a
  dependency-only node so prerequisites are explicit. Phase
  numbering reflects intended ship order, **not** strict
  dependency — readers default-assume `N.k` depends on
  `N.(k-1)`, which silently wastes time when phases are
  independent and could draft or ship in parallel. The graph
  makes parallelism visible at a glance instead of buried in
  prose; the prose still carries rationale (which phase ships
  first and why, terminal-PR conventions, cross-phase coupling
  beyond hard dependencies). See the "Sequencing" section of
  [`docs/plans/archive/m2/m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md)
  for a concrete example
- **Anti-goal: do not scope any phase in this session.** Phase
  scoping and plan-drafting (the per-phase deliberation,
  contracts, file inventory, risks, and execution steps — split
  between the scoping doc and the plan doc per
  [`plan.md`](./plan.md) "Scoping owns / plan owns")
  belong to the phase planning session for each phase, run per
  the timing and pending-input rules in
  [`plan.md`](./plan.md)
  (which permit drafting in parallel with the prior phase's
  implementation or review under explicit citation requirements,
  but still bar scoping during the milestone session itself).
  Scoping any phase in the milestone session —
  even the first — risks recording assumptions that won't
  survive contact with merged code, and produces
  confident-feeling artifacts that may or may not be grounded. When phase A's scoping cites phase B's "Inputs From
  Siblings" section, both docs feel verified; neither is. Earlier
  drafts of this rule allowed first-phase scoping in the milestone
  session "so the milestone doc has at least one grounded scoping
  reference"; the practical risk outweighed the grounding benefit,
  and grounding now lives in the per-cross-phase-decision
  verification rule below ("read the actual code that would be
  affected by each option")
- **Output set.** Milestone doc — durable; survives all phase
  work. Single output of this session. Phase scoping docs are
  produced by their respective phase planning sessions, not here;
  they delete in batch when the milestone's full set of plans
  exists (not as each plan lands), as part of the milestone's
  terminal PR or a focused cleanup PR. The reason: sibling
  scoping docs reference each other, so deleting one early
  creates link rot elsewhere. The milestone doc may override the
  batch-deletion rule for an unusual lifecycle, but should record
  the override explicitly. Cross-phase decision record lives
  inside the milestone doc, not as a separate file
- **Cap.** ~10-15% of estimated total milestone implementation
  time (lower than the previous 15-20% because first-phase
  scoping no longer lives in this session). Fallback when no
  credible implementation estimate exists yet (typical at
  milestone-start): cap milestone planning at ~3 hours of session
  time end-to-end, and stop when iteration without ending hits —
  repeated rewrites of the same section, cross-phase decisions
  that re-open after being marked resolved, or new docs spawning
  without resolving existing ones. That iteration signal is the
  real diminishing-returns indicator; remaining value comes from
  doing the work, not from more planning content
- **Verify before recording any cross-phase decision.** For each
  cross-phase decision, read the actual code that would be affected
  by each option, not summaries from a research subagent. A decision
  recorded with options/pros/cons but without code-grounded option
  generation is a guess dressed as rigor — the option set itself can
  be wrong if the underlying mental model is wrong
- **Defer rather than over-resolve.** If a cross-phase decision can
  be made later by the affected phase's planner without blocking
  earlier phases, mark it deferred with a clear "decide when phase N
  drafts" note. Premature resolution of deferrable decisions is a
  major source of wrong premises that propagate through the doc set
- **PR-count predictions are not contracts.** Per-phase PR counts
  named in the milestone doc are estimates. The phase planning
  session re-derives the actual PR count using the rule in
  [`plan.md`](./plan.md) "PR-count predictions need a branch
  test"; splitting a phase into sub-phases at plan time is
  normal, not a process failure
