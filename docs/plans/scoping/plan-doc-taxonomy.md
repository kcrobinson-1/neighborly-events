# Scoping — Plan-doc taxonomy revamp

Transient scoping artifact per `docs/agents/planning/phase.md`
"Phase Planning Sessions"; deletes when the sibling task plan's
implementing PR closes out. Per the same file's "Scoping docs do
NOT carry a Status block" rule, this doc has no Status — the
sibling task plan carries it.

## Summary

This scoping pass resolves the taxonomy gap captured by the Tier 5
backlog entry [`Plan-doc taxonomy is ambiguous when authoring a new
planning doc`](/docs/backlog.md) (around line 367 of the active
backlog). The work product is a task plan that revamps
`docs/agents/planning/` and sweeps "plan" references across the
repo so a contributor opening a new planning effort can pick the
right doc-type, know the content grain that applies, and use the
canonical term without ambiguity.

The scoping below decomposes the decision space into three
clusters (taxonomy shape, picker criteria, implementation scope),
records the decisions resolved in this pass with `Verified by:`
citations, and hands off plan-structure for the implementing task
plan. Per `docs/agents/planning/phase.md` "Doc-only decision
phases satisfy the substantive-content gate via cited
open-question constraints, not resolved decisions," this is
explicitly a doc-only effort — no code ships, no contracts get
implemented; the durable artifact is recorded decisions plus
rejected alternatives, absorbed into the sibling task plan.

## Decisions made at scoping time

### 1. Doc-type taxonomy — four levels, three doc-types [Resolved]

**Decision:** the canonical taxonomy has four conceptual levels and
three doc-types in practice. Levels: epic, milestone, task, phase.
Doc-types: epic doc, milestone doc, task plan. Phase plans exist
only as structural sub-docs of a task plan when the task has
N ≥ 2 phases (one file per phase). A task with N = 1 phase ships
as a single task plan doc with phase content absorbed inline; no
separate phase plan file exists for the N = 1 case.

**Discriminator between levels** (used by the picker, decision 6):

- *Single phase:* N = 1 PR; work fits the existing narrow-surface
  criteria in `docs/agents/planning/phase.md`. The task plan IS
  the phase plan, content-wise.
- *Task plan:* N ≥ 2 PRs forming a sequence of steps toward one
  outcome. PRs do not have independent stakeholder-facing value
  in their own right.
- *Milestone:* N ≥ 2 tasks (or N ≥ 2 PRs at task grain) where each
  task has independent stakeholder-facing value within the
  milestone's scope.
- *Epic:* N ≥ 2 milestones where each milestone has independent
  stakeholder-facing value relative to its siblings.

Verified by: current `docs/agents/planning/epic.md` "Path
conventions" naming the `epic → milestone → phase → subphase(PR)`
hierarchy; the shorter `plan → phase(PR)` shape referenced in
`docs/agents/planning/shared.md` rules without a fourth authority
doc; the operational case at
[`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
(four ordered PRs, no milestones, sequence-toward-one-outcome —
correctly task-shape, originally mis-labeled epic per the commit
message at `7d56f75`).

### 2. N = 1 collapse — task plan is the single doc [Resolved]

**Decision:** when a task has exactly one phase, the task plan IS
the only doc; no separate phase plan file is created. Phase plans
are structural sub-docs of multi-phase tasks, not a standalone
doc-type. When a task started as N = 1 and a second PR enters
scope mid-flight (the N = 1 → N ≥ 2 transition), the task plan
gains a `Phases` section describing per-phase scope and (if the
phase content needs the full apparatus) the phase plan files are
split out at that point. Whether the original PR's contracts get
edited in-place vs. supersession is a call made at the moment N
grows, not pre-locked here.

Verified by: the operational shape of
[`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
— a four-PR task plan with PR sketches inline rather than as
separate phase plan files; the existing narrow-surface carve-out
in `docs/agents/planning/phase.md` "Narrow-surface phases may skip
the scoping doc" establishes precedent for compressing the form
when the scope doesn't warrant the full apparatus.

### 3. Naming — "task" with compound-noun discipline [Resolved]

**Decision:** the level smaller than a milestone and larger than a
single phase is named **task**. The corresponding doc-type is
**task plan**. The compound-noun pattern parallels existing
"phase plan" usage in the repo and handles the collision between
"task" the planning-level and "task" the colloquial / TodoWrite /
issue-tracker term.

**Compound-noun rules** (apply in rule prose under
`docs/agents/planning/` and across the planning surface; bare
nouns remain fine in clearly-anchored prose):

- "task plan" — the doc-type at this level. Use whenever the doc
  artifact is the subject.
- "task-level" — adjectival form. Use for cross-cutting
  invariants, review stance, etc. that bind at this level.
- "m\<N\> task \<slug\>" / "the \<slug\> task" — specific instance,
  anchored by milestone or by descriptive slug.
- Bare "task" — only inside prose that has already anchored the
  term within the prior sentence or two. Default to compounding.

**Bare "plan" drops from rule prose.** The original noun overload
("plan" meaning both any doc in the plan tree AND a specific
narrower doc-type) is resolved by always compounding: "task plan"
or "phase plan." Bare "plan" in rule prose under
`docs/agents/planning/` is treated as a structural issue
reviewers may flag. The directory name `docs/plans/` is a
category label and stays unchanged; the noun discipline binds
prose, not paths.

**Fallback condition:** if in practice contributors repeatedly
write bare "task" where they mean TodoWrite items or agent
prompts, and the compound-noun rule needs a new self-review
audit to enforce it, that's the signal the disambiguation isn't
doing its job and the term gets re-opened (alternates considered
at scoping time: track, rollup, deliverable, work item, feature
— none beat "task" on its own merits; the fallback re-opens the
comparison against operational evidence).

Verified by: existing compound-noun usage of "phase plan,"
"phase-level" in `docs/agents/planning/phase.md` and
`docs/agents/planning/shared.md`; the operational overload risk
named in this scoping doc's parent backlog entry.

### 4. Authority file structure — `plan.md` absorbs task + phase [Resolved]

**Decision:** the four files under `docs/agents/planning/` are
`shared.md`, `epic.md`, `milestone.md`, and `plan.md` — not a
five-file set with separate `task.md` and `phase.md`. The new
`plan.md` absorbs current `phase.md` content plus task-plan-
specific sections; phase plans and task plans share most rules
(execution gates, scoping ownership, reality-check, context
preamble), and the few rules that differ (PR-count branch test,
bans-on-surface, cross-PR coordination, N = 1 collapse) are
articulated as task-specific or phase-specific sections inside
`plan.md`.

**Rationale:** epic and milestone are coordination-layer docs (no
code lands directly under them); task and phase are
implementation-layer docs (code lands under one or the other).
Asymmetry between the two categories is principled. Separate
`task.md` + `phase.md` files would duplicate the shared content
(the same trap the scoping-vs-plan duplication rule fought) or
introduce a "per-level file loads sibling per-level file"
cross-reference pattern that doesn't exist today.

**`plan.md` internal structure** (estimate, refined at plan-
drafting):

1. Shared rules (most of current `phase.md` content + absorbed
   demoted rules from `shared.md` per decision 5).
2. Task-plan-specific (cross-PR coordination, N ≥ 2 trigger,
   status flip when the last phase lands).
3. Phase-plan-specific (PR-count branch test, bans-on-surface,
   per-PR shapes).
4. Relationship (N = 1 collapse, N = 1 → N ≥ 2 transition, how a
   phase plan cites its parent task plan).

Verified by: current `docs/agents/planning/phase.md` (~440 lines
covering scoping vs. plan ownership, reality-check gate, spike-
before-plan, narrow-surface criteria, context preamble,
cross-app navigation traps, PR-count branch test, bans-on-
surface); current `docs/agents/planning/shared.md` (~565 lines)
holding the three rules to demote per decision 5.

### 5. Three rules demote from `shared.md` to `plan.md` [Resolved]

**Decision:** the following three sections currently in
`docs/agents/planning/shared.md` are phase/task-binding, not
universal, and move into the new `plan.md`:

- **`Planning Depth`** (shared.md, opening section). Mandates the
  execution gates a plan must include — baseline validation,
  branch hygiene, automated review feedback, documentation
  cleanup, PR prep, self-review audits drawn from
  `docs/self-review-catalog.md`. Phase/task-binding because
  epics and milestones don't prescribe execution gates per
  `docs/agents/planning/epic.md` "Scope: what an epic does and
  does not say."
- **`Plan-to-PR Completion Gate`** (shared.md, near end of file).
  Status flip in the implementing PR, soft-commitment ban,
  estimate-deviation callouts. Phase/task-binding because epics
  and milestones don't land via a single implementing PR.
- **`` `In draft` → `Proposed` promotion gate ``** (shared.md, mid-
  file). Multi-pass drafting walk — decision-completeness on
  Contracts, Verified-by walk, reality-check refresh.
  Phase/task-binding because the gate fires at a "ready for
  implementation" point that epics/milestones don't have.

The three sections currently look universal because phases are
the most-trafficked planning level and the rules were drafted
from phase shapes; at epic/milestone level they either don't
apply or pull contributors into the wrong grain. After
demotion, `shared.md` shrinks substantially and contains only
genuinely cross-level rules.

Verified by: `docs/agents/planning/epic.md` "Scope: what an epic
does and does not say" already says "Epics should not prescribe
per-milestone phase counts, per-phase content, per-phase PR
counts, validation-gate specifics, documentation lists, or
self-review audit sets" — the three demoted rules contradict
that scope when read as universal.

### 6. Cross-walk lines for grain-shifting rules [Resolved]

**Decision:** four rules in `shared.md` that genuinely apply at
every level but mean different things at each get a closing
cross-walk line naming application at the three category-grains
(epic / milestone / plan). Affected rules:

- `"Verified by:" annotations on load-bearing claims`
- `Falsifiability check on each load-bearing claim`
- `Cross-Cutting Invariants section`
- `Plan-doc review stance`

The cross-walk is one short line per rule, not a separate
section. Avoids duplicating the rule into each per-level file;
avoids a separate cross-walk table that contributors might
miss. The line attaches to the existing rule body so a
contributor reading the rule sees the per-level shape inline.

Example shape (for Verified-by, not the exact wording — that
lands at plan-drafting): "At epic level, citations target
capability framing and external constraints; at milestone
level, cross-phase coordination decisions; at plan level, code
citations, generated test output, or vendor docs."

Verified by: `docs/agents/planning/shared.md` rule bodies for the
four named rules already implicitly carry grain shifts in their
examples but never explicitly cross-walk them.

### 7. Picker discriminator — independent value vs. sequence steps [Resolved]

**Decision:** the picker uses "independent value per unit vs.
sequence steps toward one outcome" as the operational
discriminator between adjacent levels, rather than the softer
"launchable boundary mid-effort" framing. Applied as:

- Each milestone of an epic has independent stakeholder-facing
  value relative to siblings (a contributor can imagine stopping
  after M1, M2, etc. and shipping something coherent).
- Each task of a milestone has independent stakeholder-facing
  value within the milestone's scope.
- Phases of a task lack independent value — they're sequence
  steps toward the task's one outcome; stopping after phase 1
  ships nothing coherent.

The picker question for a new effort: "if I shipped half of
this, would what shipped have independent value, or is value
realized only when the sequence completes?" Independent-value
shape implies the level above; sequence-step shape implies the
level below.

**Walked against the operational case.** Applied to
[`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
(originally mis-labeled epic, corrected to task plan): the four
PRs are sequence steps in an audit-response — partial completion
is "fewer corrections landed," not "a different shippable
thing." Picker correctly classifies as task plan. Applied to
`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`
(correctly labeled milestone-within-epic): M3's four phases lack
independent value (3.1 without 3.3.2 ships nothing), so M3 is
task-shape internally; M3 as a whole has independent value
relative to M1/M2/M4 in the parent epic, so M3 is milestone-
shape externally. Both grains hold under the discriminator.

Verified by: the structural shape of
[`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
"PR Sequence" subsections (PR 1 through PR 4, sequenced); the
structural shape of `docs/plans/epics/demo-expansion/epic.md`
"Milestone Structure" (M1 through M6, each with its own
capability target).

### 8. Directory layout — no rename, conventions clarified [Resolved]

**Decision:** `docs/plans/` stays as the planning-artifact root.
The directory name is a category label, parallel to the
filename-as-category-label pattern of `epic.md` / `milestone.md`
/ `plan.md`. The compound-noun discipline (decision 3) handles
the noun overload in prose; the directory name does not
participate in that disambiguation.

**Path conventions** (codified in `plan.md` at implementation):

- Standalone task plan (no epic wrapper, single doc, any N):
  `docs/plans/<task-slug>.md`. Existing example:
  [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md).
- Task plan with separated phase plan files (N ≥ 2 where each
  phase needs the full apparatus): `docs/plans/<task-slug>/<task-
  slug>.md` plus `docs/plans/<task-slug>/<phase-slug>-plan.md`.
  Mirrors how epic folders organize per-phase plans today.
- Epic + nested levels: existing
  `docs/plans/epics/<epic-slug>/...` convention unchanged.
- Scoping doc for a task plan: `docs/plans/scoping/<task-slug>.md`
  (this file's location), or under the task folder for the
  separated-phase variant.

Verified by: existing layout under `docs/plans/` —
[`docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
(flat task plan), `epics/madrona-feedback/` (epic folder with
milestone + phase docs), `epics/demo-expansion/scoping/`
(scoping under epic folder).

### 9. Sweep targets named, line-level changes deferred to plan [Resolved]

**Decision:** the implementing task plan sweeps "plan"
references across a named set of files. The exact line-level
changes are estimate-shaped (per-file diffs are estimates at
plan-drafting, refined at implementation). Sweep targets:

- `docs/agents/planning/*.md` — primary surface; rules and
  cross-references updated.
- `docs/agents/AGENTS.md` — top-level planning workflow opening.
- `docs/agents/workflows/plan-implementation.md` — consumes the
  Plan-to-PR Completion Gate after demotion.
- `docs/agents/workflows/implementation.md` — references
  `docs/agents/planning/phase.md` path.
- `docs/agents/reference/pr-template.md` — references planning
  rules.
- `AGENTS.md` (repo root) — planning workflow opening.
- `.github/pull_request_template.md` — Estimate Deviations
  section references `shared.md` and `plan-to-pr.md`.
- `docs/backlog.md` — planning-doc-location entry, taxonomy
  entry, drift-prevention entry all reference current shape.
- `docs/self-review-catalog.md` — referenced from Planning
  Depth's demotion target.
- `docs/testing-tiers.md` — Plan-to-Landed Gate references.
- `docs/dev.md` — planning surface mentions.
- `docs/tracking/agentic-practice-roadmap.md` — references
  `shared.md`'s "Plans describe contracts, not implementation"
  rule rationale (consolidated form of the prior
  plan-code-minimalism rule, per the rule body's own context).
- Active (non-archive) plan docs in `docs/plans/` that cite
  `docs/agents/planning/phase.md` as a path or rule reference.
  Archive docs (`docs/plans/archive/**`) are not retroactively
  swept per the existing "no new active→archive links"
  discipline; archive docs may continue to reference the old
  shape since they're frozen-in-time.

Two grep patterns identify candidates at plan-drafting time:

- Path references: search for the literal
  `docs/agents/planning/phase\.md` across the repo.
- Bare "plan" inside rule prose: search for `\bplan\b` in
  `docs/agents/planning/` and adjacent rule-bearing files;
  judgment per match (compound-form upgrade vs. leave-as-is).

Verified by: `grep -rln 'docs/agents/planning/phase\.md' .`
returns the active set (run at scoping time;
re-run at plan-drafting time for the canonical list).

## Reality-check inputs the task plan must verify

These are the load-bearing claims about current code/docs that
the task plan walks before flipping `In draft` → `Proposed`. Each
must re-confirm against current state at plan-drafting time
(line numbers and section structures may shift between this
scoping pass and plan-drafting):

- The three demoted rules in
  `docs/agents/planning/shared.md` exist with the section
  headings named in decision 5 (`Planning Depth`,
  `Plan-to-PR Completion Gate`,
  `` `In draft` → `Proposed` promotion gate ``). Confirm none
  have been renamed or merged between scoping and plan-
  drafting.
- The four grain-shifting rules named in decision 6
  (`"Verified by:" annotations on load-bearing claims`,
  `Falsifiability check on each load-bearing claim`,
  `Cross-Cutting Invariants section`,
  `Plan-doc review stance`) exist with those exact section
  headings.
- `docs/agents/planning/phase.md` content categorization for
  the `plan.md` migration: each existing section is tagged
  shared (moves to `plan.md` general) / task-specific (rare;
  most of phase.md is shared) / phase-specific (PR-count
  branch test, bans-on-surface, etc.). Tag at plan-drafting,
  confirm against the current file.
- The active sweep target list in decision 9 against
  `grep -rln 'docs/agents/planning/phase\.md' .` run at
  plan-drafting time. Files that didn't exist at scoping
  time may have appeared.
- The operational case classification
  ([`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
  as task plan) against the doc's current shape. If the doc
  was restructured between scoping and plan-drafting, the
  picker walk in decision 7 needs a refresh.
- Existing scoping doc Status-block divergence: several
  active scoping docs currently carry Status blocks despite
  `docs/agents/planning/phase.md` "Scoping docs do NOT carry
  a Status block." Confirm the rule's current wording and
  whether the implementing plan should sweep existing Status
  blocks off scoping docs or leave them per the "Pre-existing
  scoping docs are not retroactively non-conforming" clause
  that lives in adjacent rules.

## Plan structure handoff

**Recommended task plan shape:** flat task plan at
`docs/plans/plan-doc-taxonomy.md`, four PRs sequenced as:

- PR 1 — Open `plan.md`, demote the three rules into it from
  `shared.md`, add task-plan-specific sections, add Relationship
  section. `shared.md` loses the demoted blocks; cross-walk
  lines added to the four grain-shifting rules. `phase.md`
  remains untouched in this PR. (Largest content PR;
  self-contained.)
- PR 2 — Delete `phase.md`. Update `epic.md` and `milestone.md`
  references from `phase.md` → `plan.md`. Update
  `docs/agents/AGENTS.md`, `docs/agents/workflows/*.md`, and
  `docs/agents/reference/pr-template.md` references. Active
  plan docs under `docs/plans/` updated for path references.
- PR 3 — Repo-level sweep: root `AGENTS.md`,
  `.github/pull_request_template.md`, `docs/backlog.md`,
  `docs/self-review-catalog.md`, `docs/testing-tiers.md`,
  `docs/dev.md`, `docs/tracking/agentic-practice-roadmap.md`.
  Compound-noun upgrades on bare "plan" in rule prose where
  ambiguous.
- PR 4 — Close-out: flip task plan Status to `Landed`, delete
  this scoping doc, remove the backlog entry. Active-effort
  pointer removal if the implementing PRs spawned one.

**Alternative shape considered:** single PR. Rejected because the
diff would span all four target sets (planning docs proper,
agent docs, repo-wide sweep, close-out) and reviewers benefit
from seeing each layer separately. The four-PR sequence
mirrors the docs-canonical-corrections pattern, which the
operational walk in decision 7 confirmed is task-shape rather
than epic-shape.

**Open decisions to make at plan-drafting:**

- Exact wording of the cross-walk lines on the four grain-
  shifting rules (decision 6). Each cross-walk is one short
  line, but the exact phrasing benefits from being drafted
  alongside the demotion edits rather than pre-locked here.
- Exact handling of the N = 1 → N ≥ 2 transition in `plan.md`'s
  Relationship section. Decision 2 sets the principle (graceful
  default, no pre-locked retroactive-absorption vs. sit-on-top
  stance); the prose framing lands at plan-drafting.
- Whether to sweep Status blocks off existing scoping docs in
  the same task or defer (see reality-check inputs above).
- Whether `phase.md` deletion in PR 2 leaves a redirect stub
  for two weeks or removes outright. Default: outright; in-repo
  references all update in the same PR sequence.

## Rejected alternatives

- **Status quo.** Keeps three mis-filed rules in `shared.md`,
  keeps "plan" overloaded, keeps the misclassification trap.
  Rejected: the docs-canonical-corrections incident is concrete
  evidence the trap costs review rounds.
- **Demote rules to per-level files with duplication
  (D2 from earlier deliberation).** A rule that applies at both
  task and phase levels gets copied into `task.md` and
  `phase.md`. Rejected: same drift trap the scoping-vs-plan
  duplication rule already fights.
- **Demote rules via cross-reference between per-level files
  (D3).** `task.md` cross-references `phase.md` for shared
  rules. Rejected: introduces a "per-level loads per-level"
  pattern that doesn't exist today; indirection without clear
  benefit when one merged file accomplishes the same goal.
- **Separate `task.md` and `phase.md` files (without merging
  into `plan.md`).** Rejected on the same duplication grounds
  as D2; the implementation-layer files share most rules.
- **Rename `docs/plans/` directory** (e.g., `docs/planning/`).
  Rejected: compound-noun discipline handles the noun overload
  in prose where it matters; renaming the directory is a high-
  cost sweep without proportional benefit, and the directory
  name being a category label is consistent with the filename
  pattern (`epic.md`, `plan.md`).
- **Alternative names for the level: "track," "rollup,"
  "deliverable," "work item," "feature."** Each considered;
  none beats "task" on its own merits given the repo's
  concrete-verb-noun bias. "Task" with compound-noun
  discipline accepted as the working choice; the fallback
  re-opens the comparison if compound-noun discipline doesn't
  hold (decision 3).
- **Capitalized disambiguation ("Task" vs. "task").** Rejected
  explicitly during scoping deliberation: brittle in prose,
  gets lost in casual conversation, looks weird.

## Related Docs

- [`docs/backlog.md`](/docs/backlog.md) — parent backlog entry
  (the `infra` Tier 5 item around line 367 of the current file).
- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  — current location of the three rules slated for demotion.
- [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
  — content source for `plan.md`'s phase-side; deletes when the
  task plan implements.
- [`docs/agents/planning/epic.md`](/docs/agents/planning/epic.md)
  — references `phase.md`; updated to reference `plan.md`.
- [`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md)
  — same.
- [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
  — operational case the picker (decision 7) is walked against.
- [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
  — adjacent open question on plan-doc location; out of scope
  for this task but the sibling backlog entry's
  resolution should not break the conventions decision 8
  locks in.
