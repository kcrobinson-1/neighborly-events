# Plan-Doc Taxonomy Revamp

## Status

Landed. Taxonomy revamp against `docs/agents/planning/` and the
sweep targets named in scoping completed across the implementing
PR sequence; this close-out PR flips Status, deletes the sibling
scoping doc, and removes the parent backlog entry in a single
change set per the terminal contract state below.

## Purpose

The Tier 5 backlog entry `Plan-doc taxonomy is ambiguous when
authoring a new planning doc` (since removed from
`docs/backlog.md` at the terminal state below) captured three
concrete handles motivating this work: the noun "plan" is
overloaded across the planning surface; doc-type selection
criteria either don't exist or didn't fire on a recent
misclassification; and the operational cost has surfaced as
one-finding-at-a-time review corrections on plans drafted at
the wrong grain.

This plan implements the revamp scoped in the sibling
`docs/plans/scoping/plan-doc-taxonomy.md` (since deleted at the
terminal state below; deliberation prose survives in git
history): four files in `docs/agents/planning/` (`shared.md`,
`epic.md`, `milestone.md`, `plan.md`), three doc-types in
practice (epic doc, milestone doc, task plan), compound-noun
discipline for "task" and "plan" in rule prose, the picker
discriminator (independent value vs. sequence steps), and the
named repo-wide sweep.

## Why This Plan

- The picker walked in scoping decision 7 against the
  operational case at
  [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
  correctly classifies it as a task plan, not an epic. The
  original mis-classification carried SQL-level posture in
  per-PR contracts and produced a series of review-time
  corrections; the picker (decision 7) plus the grain rules
  (decision 5's demotion) together would have caught both
  failure modes up front.
- Three rules in
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  (Planning Depth, Plan-to-PR Completion Gate,
  `` `In draft` → `Proposed` promotion gate ``) are
  phase/task-binding but read as universal because
  `shared.md` is loaded by every per-level file. Demoting
  them into `plan.md` shrinks `shared.md` to genuinely
  cross-level content and removes the "applies at the wrong
  level" trap when contributors read the rules at epic or
  milestone level.
- The implementation-layer files (current `phase.md` and the
  task-plan-specific content that would otherwise live in a
  hypothetical `task.md`) share most rules; a single merged
  `plan.md` avoids the duplication trap the scoping-vs-plan
  duplication rule already fought.

## Goal

A contributor authoring a new planning doc can answer (a) which
doc-type fits the effort (using the picker discriminator), (b)
what content grain applies at that doc-type (using the per-level
authority file), and (c) what the canonical term is for each type
(using the compound-noun discipline). After this plan lands:

- `docs/agents/planning/` contains four files: `shared.md`,
  `epic.md`, `milestone.md`, `plan.md`. `phase.md` is deleted.
- The three demoted rules live in `plan.md`, not in `shared.md`.
- The four grain-shifting rules in `shared.md`
  (`"Verified by:" annotations on load-bearing claims`,
  `Falsifiability check on each load-bearing claim`,
  `Cross-Cutting Invariants section`,
  `Plan-doc review stance`) carry closing cross-walk lines
  naming application at the three category-grains
  (epic / milestone / plan).
- Compound-noun discipline ("task plan," "phase plan,"
  "task-level") is documented in `plan.md`; bare "plan" in
  rule prose under `docs/agents/planning/` is treated as a
  structural issue reviewers may flag.
- The picker discriminator (independent value per unit vs.
  sequence steps toward one outcome) is documented in
  `plan.md` with the operational walk from scoping decision 7
  carried forward as a recurring-trap reference.
- The sweep targets named in scoping decision 9 are updated to
  reference the new structure.

## Out Of Scope

- Renaming `docs/plans/` directory (scoping decision 8).
- Retroactively rewriting active or archived plan docs to use
  the new compound-noun phrasing — the discipline binds rule
  prose under `docs/agents/planning/` and rule-bearing
  adjacent files; existing plan docs are not retroactively
  swept beyond path-reference updates.
- Drift-prevention catalog updates around plan-doc grain — the
  sibling Tier 5 backlog entry
  `Pre-push drift-prevention surfaces anchor on intended
  product state and right-grain contracts` covers this.
- Resolving the adjacent backlog entry
  `Investigate planning-doc location` — the decision 8
  no-rename conclusion does not pre-decide that entry's
  question about discussion-style surfaces.
- Sweeping `Status` blocks off existing non-conforming scoping
  docs (the rule named in `phase.md` "Scoping docs do NOT
  carry a Status block" predates several active scoping docs).
  Pre-existing scoping docs are not retroactively non-
  conforming; scoping docs opened from `plan.md`'s land
  forward follow the rule.

## Contract states

The plan reaches its goal through a series of contract-state
transitions. The implementer chooses how to decompose these into
commits or PRs, when to ship each, and which technique to use for
each verification check; the plan binds only the state transitions
themselves and the partial ordering required between them. The PR
decomposition pattern recommended in the sibling scoping doc's
`Plan structure handoff` is an estimate that the implementer may
revise.

**State 1 — Demote without orphaning.** Each demoted rule
(Planning Depth, Plan-to-PR Completion Gate, `` `In draft` →
`Proposed` promotion gate ``) arrives in `plan.md` in the same
change set that removes it from `shared.md`. No interim state
where a demoted rule exists in neither file. `shared.md` self-
references that targeted the removed sections (e.g., the rule's
cross-references to "see the Plan-to-PR Completion Gate above")
redirect to `plan.md` with section anchors in the same change
set.

**State 2 — `plan.md` exposes the three grains by section
header.** `plan.md`'s internal structure separates shared rules
/ task-plan-specific / phase-plan-specific / relationship
content under named top-level headings, so a reader can locate
per-grain content by section-header scan rather than line-by-
line filtering. The exact section names are implementer choice;
the contract is that the three grains are header-discoverable.

**State 3 — Cross-walk lines name application, not additional
binding.** The four grain-shifting rules in `shared.md`
(Verified-by, Falsifiability, Cross-Cutting Invariants, plan-doc
review stance) gain closing prose naming the rule's application
at the three category-grains (epic / milestone / plan). Framing
is "what this rule means at this level," not "what the rule
additionally requires at this level." The latter framing
accidentally re-introduces the rule-duplication trap the merged
`plan.md` was designed to avoid.

**State 4 — Reference resolution at every commit boundary.**
Every active in-repo reference to `docs/agents/planning/phase.md`
resolves to a valid file at every commit boundary on the
implementing branch. The implementer may achieve this by keeping
`phase.md` as a parallel reference until the sweep completes, or
by deleting `phase.md` in lock-step with reference updates.
Archive docs under `docs/plans/archive/**` are excluded from the
sweep per the existing no-retroactive-sweep discipline; archive
references to a deleted durable doc are accepted as historical
record, not as broken links requiring repair.

**State 5 — Sweep completeness before deletion.** Active in-repo
rule-bearing references to `phase.md` — the category being any
active rule-bearing file outside `docs/plans/archive/**` that
cites the path, including agent docs, workflow docs, the PR
template, the self-review catalog, root `AGENTS.md`, and active
plan docs — point at `plan.md` before `phase.md` is deleted.
The implementer enumerates the category at implementation time
by whichever technique surfaces it completely (`grep`, IDE
search, etc.); the contract is coverage of the category, not
exhaustion of any pre-named list.

**State 6 — Compound-noun discipline applied where ambiguous.**
Bare "plan" in rule prose under `docs/agents/planning/` and
adjacent rule-bearing files is upgraded to compound form ("task
plan," "phase plan") where the bare noun creates ambiguity.
Judgment per match, not blanket replacement; the rest of the
repo's bare-"plan" usage is unaffected.

**State 7 — Terminal close-out.** This plan reached `Landed`
Status in the same change set that deleted the sibling scoping
doc `docs/plans/scoping/plan-doc-taxonomy.md` and removed the
parent backlog entry from `docs/backlog.md`. None of the three
actions landed alone, per the Plan-to-PR Completion Gate and the
close-tracking-surfaces-in-PR rule.

**Required orderings between states:**

- State 1 precedes State 4 (the demoted-rule content must exist
  in `plan.md` before any redirect to `plan.md` resolves).
- State 5 precedes `phase.md` deletion (the sweep must finish
  while `phase.md` still exists as a parallel reference, or
  deletion and redirects must land in the same change set).
- State 7 is terminal — all prior states are satisfied when it
  lands.

Other inter-state orderings (e.g., whether cross-walk lines from
State 3 land before or after the sweep in State 5) are
implementer choice.

## Risk Register

- **Cross-walk line wording bleeds into per-level interpretation
  as binding sub-rules.** If the per-level shapes named in the
  cross-walks read as "at epic level it MUST be X," they
  accidentally re-introduce the rule-duplication trap the merged
  `plan.md` was designed to avoid. Mitigation: framing is the
  contract surface, not the specific wording — State 3 binds the
  "what this rule means at this level" framing, and the same
  self-review pass that lands State 3 checks each cross-walk
  line against that framing.
- **`phase.md` deletion orphans archive-plan references.**
  Archive plans at `docs/plans/archive/**` cite `phase.md` as a
  current-shape reference. Mitigation: archive plans are
  frozen-in-time and may carry stale references per the existing
  "no new active→archive links" discipline applied in the reverse
  direction — archive references to deleted durable docs are
  accepted as historical record, not as broken links that need
  repair. State 4 names this exclusion explicitly.
- **Bare-"plan" sweep false-positives.** The bare noun appears
  across the repo in many non-rule contexts (product-feature
  names, commit messages quoted in docs, prose where the bare
  noun is unambiguous). Mitigation: State 6 binds the sweep to
  rule prose under `docs/agents/planning/` and adjacent rule-
  bearing files; the rest of the repo's bare-"plan" usage is
  unaffected.
- **Section-anchor links drift if `plan.md` section names change
  mid-implementation.** If a downstream change set renames
  `plan.md` section headings that an earlier change set already
  cited by anchor, the links break. Mitigation: section names
  freeze when State 2 is satisfied; subsequent state transitions
  cite the frozen names. Any post-freeze rename requires a
  follow-up anchor sweep in the same change set.

## Resolved Decisions

The nine decisions resolved in the sibling scoping doc
`docs/plans/scoping/plan-doc-taxonomy.md` (since deleted at
terminal close-out; deliberation prose survives in git history):

1. Four-level taxonomy (epic → milestone → task → phase) with
   three doc-types in practice (epic doc, milestone doc, task
   plan); phase plans are structural sub-docs of N ≥ 2 task
   plans.
2. N = 1 collapse — task plan is the only doc when the task has
   exactly one phase; phase plans are not a standalone doc-type.
3. Naming — "task" is the level; compound-noun discipline
   ("task plan," "task-level") handles the collision with
   colloquial "task" usage; bare "plan" drops from rule prose.
4. Authority file structure — `docs/agents/planning/` carries
   four files: `shared.md`, `epic.md`, `milestone.md`,
   `plan.md`. `plan.md` absorbs current `phase.md` plus task-
   plan-specific sections.
5. Three rules demote from `shared.md` to `plan.md`: Planning
   Depth, Plan-to-PR Completion Gate, `` `In draft` → `Proposed`
   promotion gate ``.
6. Cross-walk closing lines added to the four grain-shifting
   rules in `shared.md` (Verified-by, Falsifiability, Cross-
   Cutting Invariants, Plan-doc review stance) naming
   application at the three category-grains.
7. Picker discriminator — independent value per unit vs.
   sequence steps toward one outcome, replacing the softer
   "launchable boundary" framing.
8. Directory layout unchanged — `docs/plans/` stays; the
   compound-noun discipline handles the noun overload in prose,
   not in paths.
9. Sweep targets named — the category bound by States 4–6 covers
   active rule-bearing in-repo files referencing `phase.md` or
   carrying bare-"plan" in rule prose; the implementer enumerates
   the category at implementation time using whichever technique
   surfaces it completely. The scoping doc's explicit file list
   is illustrative, not exhaustive.

## Related Docs

- `docs/plans/scoping/plan-doc-taxonomy.md` (deleted at
  terminal close-out) — sibling scoping doc; deliberation prose
  survives in git history.
- `docs/backlog.md` — parent backlog entry (`Plan-doc taxonomy
  is ambiguous when authoring a new planning doc`) removed at
  terminal close-out.
- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  — current location of the three demoted rules; edited as part
  of State 1.
- `docs/agents/planning/phase.md` (deleted at State 4–5
  completion) — content source for `plan.md`'s phase-plan-
  specific sections.
- [`docs/agents/planning/epic.md`](/docs/agents/planning/epic.md),
  [`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md)
  — referenced `phase.md` pre-revamp; redirected to `plan.md` as
  part of State 4.
- [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
  — operational case the picker (scoping decision 7) is walked
  against; structural precedent for the PR decomposition
  pattern the sibling scoping doc recommends.
