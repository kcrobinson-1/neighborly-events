# Planning Doc Location

## Status

Two concerns recorded here:

- **In-repo layout convention** — settled 2026-05-01. See "In-Repo Layout
  Convention" below.
- **Whether discussion-style surfaces move out of the code repo** — open
  investigation. See "Goal" through "Risk Register" below.

## In-Repo Layout Convention

Effective 2026-05-01, in-repo plan docs follow this layout:

- `docs/plans/<name>.md` — cross-cutting plans not bound to a single epic
  (analytics, security, release-readiness, framework decisions, repo rename,
  the `shared-*-foundation` set, etc.).
- `docs/plans/epics/<epic-slug>/epic.md` — the epic-level overview for an
  epic-scoped body of work.
- `docs/plans/epics/<epic-slug>/m<N>-<short-slug>.md` — milestone doc
  (durable; only present when a milestone needs cross-phase coordination
  beyond the milestone shells in `epic.md`; see AGENTS.md "Milestone
  Planning Sessions"). Per-epic milestone numbering: each epic counts
  from M1 independently, and sibling epics may reuse the same milestone
  numbers without collision because the path's epic segment disambiguates.
- `docs/plans/epics/<epic-slug>/m<N>-phase-<X>-<Y>-plan.md` — per-phase
  plan doc (durable; survives the feature; see AGENTS.md "Phase Planning
  Sessions"). Sub-phase plans add another segment:
  `m<N>-phase-<X>-<Y>-<Z>-plan.md`.
- `docs/plans/epics/<epic-slug>/scoping/m<N>-phase-<X>-<Y>.md` — phase
  scoping doc (transient; deletes in batch with sibling scoping docs at
  the milestone-terminal PR; see AGENTS.md "Phase Planning Sessions").
- `docs/plans/archive/` — existing archive for superseded plans, unchanged.
  New epics adopt the in-place-as-archive pattern: once an epic is `Landed`,
  its `docs/plans/epics/<slug>/` folder remains in place as the durable
  record without bulk-moving into `archive/`.

Plans authored before this convention (the `event-platform-epic.md` set and
its M0–M3 phase plans) stay in their existing flat locations under
`docs/plans/`. Migration is deferred and would be a separate refactor that
does not block in-flight work.

The cross-cutting vs. epic-scoped split applies only to plan docs; this
convention does not change archive policy, the per-phase implementation
contract location ruled in by the hard constraints below, or the
discussion-style-surface investigation that follows.

## Goal

Decide whether and how to move parts of the per-phase planning workflow
out of the code repo, given the friction observed during M2:

- the `/docs/plans/archive/` set keeps growing as more milestones land
- plan-only PRs and plan-archive-maintenance PRs inflate the repo's PR
  count alongside code-shipping PRs
- plan PRs and code PRs benefit from different review styles (Codex
  against code for technical correctness vs. prose review for plan
  structure, scope, and contracts)

## Hard Constraints

Two constraints rule out the cheapest cross-repo solutions, so the
investigation does not need to re-evaluate them:

- **Claude Code is single-repo.** Telling the coding agent in the code
  repo to execute a plan from a sibling repo requires either a
  multi-checkout setup Claude Code does not natively support, or
  having the agent fetch the plan separately. Both lose the property
  the in-repo doc currently provides — agent reads plan and code in
  one navigable tree without prompting.
- **Codex review against the actual code is load-bearing.** Plan-time
  reality-check rules in [`AGENTS.md`](/AGENTS.md) — "Reality-check
  gate between scoping and plan," `Verified by:` annotations on
  load-bearing technical claims — depend on the reviewer being able
  to verify claims against in-repo code during plan review. A
  separated plan repo loses that grounding for plans that name code
  surfaces.

These rule out moving the **per-phase implementation contract** (the
plan doc that the implementing PR consumes) out of the code repo. That
location is settled; the investigation does not revisit it.

## What To Investigate

The remaining question is whether non-contract surfaces around the plan
— upstream epic framing, milestone shaping, deferred-decision
discussion, scoping back-and-forth — can move off PRs without losing
the protective checks they provide today.

Steps:

1. **Classify recent PRs.** Walk the last ~30 PRs and bucket each as
   plan-only, plan + code, code-only, or plan-archive-maintenance.
   Identify which class dominates the PR-count signal so the
   investigation targets the actual cause rather than a guessed one.
2. **Map plan surfaces to workflow stage.** For each current plan doc,
   identify the workflow stage it primarily serves (epic framing,
   milestone shaping, per-phase implementation contract, archive).
   Identify which stages could move off PRs without losing the
   protective check the PR review currently provides.
3. **Evaluate GitHub Discussions** as the candidate non-PR surface for
   discussion-style stages. Questions to answer:
    - Does it integrate with the current plan-review habit (Codex,
      reviewer comments, accept/defer)?
    - Can in-repo plan docs cite a Discussion thread durably (stable
      URL, survives renames, searchable later)?
    - What happens to a thread when the work it shaped lands — does
      the discussion archive cleanly or rot?
    - Does it support the pre-implementation reality-check pattern,
      or does that have to stay in-repo?
4. **Sketch one or two alternatives** (Linear / Notion / GitHub Issues
   with a planning label) for breadth. No deep evaluation — just
   enough to confirm Discussions is the right primary candidate or
   surface a clearly better one.
5. **Decide and record.** Status quo, partial move
   (discussion-only), or other shape. Capture decision and rationale
   in this doc; if status quo, capture what we learned so the
   question stays answered rather than re-opened.

## Out Of Scope

- Moving the per-phase implementation-contract plan doc out of the
  code repo. The hard constraints above settle that.
- Rewriting [`AGENTS.md`](/AGENTS.md)'s plan-to-PR workflow itself.
  Workflow tweaks are downstream of the location decision and may not
  be needed.
- Migrating already-archived plan docs out of `/docs/plans/archive/`.
  The archive is in-repo for `git log` / `git blame` reachability;
  pruning is a separate question handled if the archive size becomes
  the dominant friction.

## Cap

~2 hours of evaluation. Stop and record the decision when continued
investigation stops changing the recommendation, even if not all
alternatives are fully sketched. Decision stops being load-bearing
once the dominant friction class is named and the in-repo-vs-elsewhere
choice is made for that class.

## Risk Register

- **Investigation scope creep.** Easy to spend more on the meta-question
  than on the work it would optimize. Mitigation: the cap above; stop
  when the recommendation stabilizes.
- **Wrong friction class.** Step 1 (PR classification) is cheap and
  comes first specifically to avoid optimizing the wrong cause. If the
  PR-count signal turns out to be dominated by code-only PRs, the
  investigation ends with status quo and that is a valid outcome.
