# Plan-Doc Taxonomy Revamp

## Status

Proposed. Four-PR taxonomy revamp against `docs/agents/planning/`
and the sweep targets named in scoping. Closes out on PR 4 by
flipping this doc's Status to `Landed` in place at
`docs/plans/plan-doc-taxonomy.md`, deleting the sibling scoping
doc at
[`docs/plans/scoping/plan-doc-taxonomy.md`](/docs/plans/scoping/plan-doc-taxonomy.md),
and removing the parent backlog entry from
[`docs/backlog.md`](/docs/backlog.md) in the same PR.

## Purpose

The Tier 5 backlog entry `Plan-doc taxonomy is ambiguous when
authoring a new planning doc` (currently around line 367 of
[`docs/backlog.md`](/docs/backlog.md)) captured three concrete
handles motivating this work: the noun "plan" is overloaded
across the planning surface; doc-type selection criteria either
don't exist or didn't fire on a recent misclassification; and
the operational cost has surfaced as one-finding-at-a-time
review corrections on plans drafted at the wrong grain.

This plan implements the revamp scoped in
[`docs/plans/scoping/plan-doc-taxonomy.md`](/docs/plans/scoping/plan-doc-taxonomy.md):
four files in `docs/agents/planning/` (`shared.md`, `epic.md`,
`milestone.md`, `plan.md`), three doc-types in practice (epic
doc, milestone doc, task plan), compound-noun discipline for
"task" and "plan" in rule prose, the picker discriminator
(independent value vs. sequence steps), and the named
repo-wide sweep.

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

## PR Sequence

The four-PR sequence below is estimate-shaped per
`docs/agents/planning/shared.md` "Plan content is a mix of rules
and estimates — label which is which." The shape of each PR's
content is contract-grain (what changes, what gets verified); the
specific prose, exact diff hunks, and inter-PR boundaries may
shift during implementation and reconcile via the Estimate
Deviations callout in each PR body.

### PR 1 — Open `plan.md`, demote rules, update `shared.md`

**Shape:**

- New file `docs/agents/planning/plan.md`. Absorbs current
  `docs/agents/planning/phase.md` content as the shared-rules
  base; adds task-plan-specific sections (cross-PR
  coordination, N ≥ 2 trigger, status flip when the last
  phase lands); adds phase-plan-specific sections (PR-count
  branch test, bans-on-surface, per-PR shapes); adds a
  Relationship section covering N = 1 collapse, the
  N = 1 → N ≥ 2 transition guidance, and how a phase plan
  cites its parent task plan. Absorbs the three demoted
  rules from `shared.md` (Planning Depth, Plan-to-PR
  Completion Gate, `` `In draft` → `Proposed` promotion gate ``)
  into the appropriate shared / task / phase section.
- `docs/agents/planning/shared.md` edits: remove the three
  demoted sections; add closing cross-walk lines to the four
  grain-shifting rules naming application at the three
  category-grains; update any self-references that targeted
  the removed sections (e.g., "see the Plan-to-PR Completion
  Gate above") to point at `plan.md` with section anchors.
- `docs/agents/planning/phase.md`, `epic.md`, `milestone.md`:
  unchanged in this PR. `phase.md` stays as a parallel
  reference so cross-links from other docs still resolve;
  it deletes in PR 2.

**Contract:**

- After this PR, the four files at
  `docs/agents/planning/{shared,epic,milestone,plan}.md` plus
  the unchanged `phase.md` together carry the full ruleset
  with no rule lost in the demote.
- `plan.md`'s internal structure separates shared / task-
  plan-specific / phase-plan-specific / relationship sections
  by top-level heading, so a reader can locate per-grain
  content by section-header scan rather than line-by-line
  filtering.
- `shared.md`'s cross-walk lines on the four grain-shifting
  rules are framed as "what this rule means at this level,"
  not as additional binding sub-rules — the framing is the
  protective check against re-introducing the rule-
  duplication trap merged `plan.md` was designed to avoid.

**Verification:**

- `npm run lint` passes.
- Diff inspection confirms every rule that left `shared.md`
  lands in `plan.md` (no rule dropped, none silently re-
  scoped).
- `shared.md` self-references point at `plan.md` after the
  edit; no broken `shared.md` → `shared.md` self-link
  targets the removed sections.

### PR 2 — Delete `phase.md`, update agent-doc references

**Shape:**

- Delete `docs/agents/planning/phase.md`.
- Update path references from `docs/agents/planning/phase.md`
  to `docs/agents/planning/plan.md` in the agent-doc surface:
  `docs/agents/planning/epic.md`,
  `docs/agents/planning/milestone.md`,
  `docs/agents/AGENTS.md`,
  `docs/agents/workflows/implementation.md`,
  `docs/agents/workflows/plan-implementation.md`,
  `docs/agents/reference/pr-template.md`. Section-anchor
  references update to the corresponding section name in
  `plan.md`.

**Contract:**

- No link in the agent-docs surface (`docs/agents/**`)
  points at `docs/agents/planning/phase.md`. All references
  redirect to `docs/agents/planning/plan.md` with appropriate
  section anchors.
- Section-anchor updates preserve the cited rule's identity
  — e.g., a reference to the Reality-check gate in `phase.md`
  now points at the same gate in `plan.md`, not at a
  similarly-named but different section.

**Verification:**

- `grep -rln 'docs/agents/planning/phase\.md' docs/agents/`
  returns no matches.
- `npm run lint` passes.
- Each updated section anchor in the edited files resolves
  to a real heading in `plan.md`.

### PR 3 — Repo-wide sweep

**Shape:**

- Update path references and rule-prose compound-noun usage
  across the named sweep targets (per scoping decision 9):
  root [`AGENTS.md`](/AGENTS.md),
  [`.github/pull_request_template.md`](/.github/pull_request_template.md),
  [`docs/backlog.md`](/docs/backlog.md),
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md),
  [`docs/testing-tiers.md`](/docs/testing-tiers.md),
  [`docs/dev.md`](/docs/dev.md),
  [`docs/tracking/agentic-practice-roadmap.md`](/docs/tracking/agentic-practice-roadmap.md),
  and active plan docs in `docs/plans/` (non-archive) that
  cite `docs/agents/planning/phase.md`.
- Bare-"plan" upgrades in rule prose under
  `docs/agents/planning/` where ambiguous (judgment per
  match, not blanket replacement).
- Archive docs at `docs/plans/archive/**` are not swept; the
  no-retroactive-sweep rule applies.

**Contract:**

- `grep -rln 'docs/agents/planning/phase\.md' .` returns
  matches only inside `docs/plans/archive/` (frozen) and any
  citation surfaces (commit messages, PR descriptions) that
  are not durable docs.
- The taxonomy backlog entry (parent of this plan) is
  updated to reflect that scoping has resolved into this
  plan; final entry removal lands in PR 4 close-out.
- The drift-prevention backlog entry and the planning-doc-
  location backlog entry are updated for any path/term
  references that drifted during this revamp; their goals
  and detail links are unchanged.

**Verification:**

- `grep -rln 'docs/agents/planning/phase\.md' .` returns only
  archive matches.
- `npm run lint` passes.
- A pass against the sweep targets confirms each compound-
  noun upgrade is locally unambiguous (compound form used
  where the bare noun would create ambiguity; bare noun kept
  where the surrounding prose anchors it).

### PR 4 — Close-out

**Shape:**

- Flip this plan doc's `## Status` from `Proposed` (or
  `In progress`) to `Landed`.
- Delete
  [`docs/plans/scoping/plan-doc-taxonomy.md`](/docs/plans/scoping/plan-doc-taxonomy.md)
  (sibling scoping doc, transient per the scoping doc's
  leading prose).
- Remove the parent backlog entry from
  [`docs/backlog.md`](/docs/backlog.md) in the same PR per
  the close-tracking-surfaces-in-PR rule.

**Contract:**

- The plan reaches terminal state (`Landed`) in the same PR
  that satisfies its goals.
- The transient scoping artifact deletes when the plan
  closes out, leaving the durable record in the plan plus
  the absorbed decisions in `docs/agents/planning/plan.md`.

**Verification:**

- `npm run lint` passes.
- `grep -rln 'docs/agents/planning/phase\.md' .` returns
  archive-only matches.
- `docs/plans/scoping/plan-doc-taxonomy.md` no longer
  exists.
- The plan-doc-taxonomy entry is no longer present in
  `docs/backlog.md` Tier 5.

## Ordering Rationale

PR 1 lands the central content edit (new `plan.md` + `shared.md`
demotion). This is the largest content PR and is self-contained:
`phase.md` stays in place as a parallel reference, so cross-
links from other docs (active plans, agent workflows, root
`AGENTS.md`) still resolve to a valid file. Reviewers see the
demotion shape and the new `plan.md` structure together rather
than spread across PRs.

PR 2 deletes `phase.md` once `plan.md` is in place and all in-
agent-doc references can be swept in the same PR. Deletion is
deferred to its own PR because (a) the agent-doc updates are a
distinct concern from the central content edit, (b) splitting
keeps each PR reviewable in one sitting, and (c) the
docs-canonical-corrections precedent (also a task plan with
four PRs) uses a similar split between content edits and
inventory deletions.

PR 3 sweeps the repo. Sequenced after PR 2 because the sweep
targets reference `phase.md` and `plan.md` paths; running the
sweep before PR 2 would orphan some references. The bare-
"plan" compound-noun upgrades happen here because they require
judgment per match and benefit from being concentrated in one
review pass rather than spread across PR 1 and PR 2.

PR 4 closes out per the Plan-to-PR Completion Gate. The
four-PR sequence mirrors the docs-canonical-corrections precedent
([`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md))
which the picker walk in scoping decision 7 confirmed is the
right shape for a sequence-step task without independent value
per PR.

## Risk Register

- **Cross-walk line wording (decision 6) bleeds into per-level
  interpretation as binding sub-rules.** If the per-level shapes
  named in the cross-walks read as "at epic level it MUST be X,"
  they accidentally re-introduce the rule-duplication trap the
  merged `plan.md` was designed to avoid. Mitigation: PR 1's
  self-review explicitly checks each cross-walk line for "what
  this rule means" framing rather than "what the rule additionally
  requires at this level."
- **`phase.md` deletion in PR 2 orphans archive-plan
  references.** Archive plans at `docs/plans/archive/**` cite
  `phase.md` as a current-shape reference. Mitigation: archive
  plans are frozen-in-time and may carry stale references per
  the existing "no new active→archive links" discipline applied
  in the reverse direction — archive references to deleted
  durable docs are accepted as historical record, not as broken
  links that need repair.
- **Bare-"plan" sweep in PR 3 false-positives.** A `grep` on
  `\bplan\b` returns many matches across the repo (the word is
  common in product-feature names, commit messages quoted in
  docs, and prose where the bare noun is unambiguous).
  Mitigation: the sweep is judgment-per-match, scoped only to
  rule prose under `docs/agents/planning/` and adjacent rule-
  bearing files (named in scoping decision 9); the rest of the
  repo's bare-"plan" usage is unaffected.
- **Section-anchor links in PR 2 drift if `plan.md` section
  names change post-PR-1.** If PR 1 lands with section headings
  that get renamed in PR 2 (e.g., during the agent-doc
  reference updates), section anchors break. Mitigation: PR 1
  freezes the `plan.md` section names; PR 2's anchor updates
  cite the frozen names. Any post-PR-1 renaming requires a
  follow-up sweep in the same PR.

## Resolved Decisions

The nine decisions resolved in the sibling scoping doc at
[`docs/plans/scoping/plan-doc-taxonomy.md`](/docs/plans/scoping/plan-doc-taxonomy.md):

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
9. Sweep targets named — the implementing PRs (2 and 3) walk
   the explicit list from scoping decision 9 plus any
   additional candidates surfaced by `grep` at plan-drafting
   time.

## Related Docs

- [`docs/plans/scoping/plan-doc-taxonomy.md`](/docs/plans/scoping/plan-doc-taxonomy.md)
  — sibling scoping doc; deletes on PR 4 close-out.
- [`docs/backlog.md`](/docs/backlog.md) — parent backlog entry
  (`Plan-doc taxonomy is ambiguous when authoring a new planning
  doc`); removes on PR 4 close-out.
- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  — current location of the three demoted rules; edited in PR 1.
- [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
  — content source for `plan.md`'s phase-plan-specific sections;
  deletes in PR 2.
- [`docs/agents/planning/epic.md`](/docs/agents/planning/epic.md),
  [`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md)
  — reference `phase.md` today; updated to reference `plan.md`
  in PR 2.
- [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
  — operational case the picker (scoping decision 7) is walked
  against; structural precedent for this plan's four-PR
  sequence.
