# AGENTS.md Restructure

## Status

`Proposed` — alternatives evaluated, target shape settled, three
initial open decisions resolved by user direction (see "User
Direction" below), and the `In draft` → `Proposed` promotion gate
walked per AGENTS.md "Phase Planning Sessions" (end-to-end coherence
read, decision-completeness on Contracts, `Verified by:` walk on
load-bearing claims, reality-check inputs re-confirmed against
current AGENTS.md). Promotion-gate findings:

- **Contradictions resolved.** Earlier draft named "~250 lines" as a
  root-router target in the Goal and Files-To-Modify sections, which
  contradicted user direction #3 ("No fixed root-router target
  size"). Both occurrences rewritten to point at the size-smell
  check in the Validation Gate.
- **Deferral resolved.** Routing-logic prose said "drafted, not yet
  final wording," which deferred the table contract to plan-drafting
  itself. Tightened: the table *shape* (which session → which file
  set) is the decision-complete contract; row-label and column-
  header *prose* is execution-time polish.
- **`Verified by:` walk.** Citations to AGENTS.md line ranges
  (801-824 Verified-by, 850-871 falsifiability, 714-758 rules-vs-
  estimates, 825-849 exact-match label quoting, 943-950 planning-
  artifacts-cite-each-other) verified against current AGENTS.md
  section starts. Section names match exactly; line ranges are
  approximate (off by ≤1 against current section bounds, which is
  expected because the source file accretes whitespace) and stay
  load-bearing-by-name not by-line.
- **Reality-check inputs.** AGENTS.md line count (1,727), referenced
  doc paths (`docs/plans/planning-doc-location.md`, `docs/dev.md`,
  `docs/architecture.md`, `docs/styling.md`, `docs/testing-tiers.md`,
  `docs/self-review-catalog.md`, `docs/operations.md`,
  `README.md`, `.github/pull_request_template.md`), and the
  `docs/plans/epics/` tree all re-confirmed present.

Per user direction, restructure execution does **not** start at this
flip — execution begins on explicit go-ahead. This `Proposed` flip
records that the plan is ready for code review.

The restructure ships as a single PR on this branch
([PR #190](https://github.com/kcrobinson-1/neighborly-events/pull/190)):
plan-doc commits are up; restructure execution will land on this
branch as additional commits when started; PR description rewrites
before merge to cover the full diff; plan flips to `Landed` in the
final commit per AGENTS.md "Plan-to-PR Completion Gate."

This is a cross-cutting plan (not bound to a single epic) and lives at
`docs/plans/agents-md-restructure.md` per the in-repo layout convention
in [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md).

## Context

[`AGENTS.md`](/AGENTS.md) has grown to **1,727 lines** (~95KB) and now
does several distinct jobs at once: repository orientation, workflow
doctrine for implementation sessions, planning meta-process across
three planning levels (epic, milestone, phase), the Plan-to-PR
completion gate, and mechanical reference material (PR template,
validation commands, screenshot workflow, commit conventions). Every
session-type loads the entire file even though it only needs a fraction
of it — a phase-implementation session reads detailed epic-drafting
rules it will never apply, and a phase-planning session reads
PR-template and screenshot-capture rules irrelevant to its output.

The goal of this refactor is to restructure the agent guidance so that
any given session loads only what's relevant to its work, while
preserving every rule, recurring-trap anecdote, and load-bearing
constraint currently in the file. No content is silently dropped; if
something is removed, it must be because it is redundant with another
rule, not because it seemed unimportant.

This phase touches one root file ([`AGENTS.md`](/AGENTS.md)), creates
a new `docs/agents/` tree, and updates incoming references from other
docs (the per-phase plans and `docs/dev.md` reference AGENTS.md
sections by name). It is doc-only; no code or migration changes.

## Goal

After this refactor:

- **A reader doing implementation work can ignore planning meta-process
  entirely** without missing anything that applies to them. The full
  reading list for a non-plan-implementing session is one workflow file
  plus the universal rules in the root router.
- **A planning session loads only the planning shared rules plus the
  per-level file** for its planning level (epic / milestone / phase /
  plan-to-PR close-out). It does not load PR-template, screenshot, or
  validation-command reference material until it transitions to
  implementation.
- **The root [`AGENTS.md`](/AGENTS.md) is a thin router** carrying
  repo orientation, the universal rules every session needs (pre-edit
  gate, scope guardrails, sub-agent delegation, stop-and-report,
  anti-patterns, change boundaries), and a session-type routing table
  pointing to the right files for the work at hand. No fixed line
  target — the size-smell check in the Validation Gate covers
  whether the file ends up doing the right amount of work for its
  declared scope.
- **Cross-cutting planning rules live in one place** — the shared
  planning file — so the `Verified by:` annotation rule, falsifiability
  check, rules-vs-estimates distinction, plan-code-minimalism
  (5-line cap), planning-artifacts-cite-each-other anti-pattern, and
  related load-bearing rules cannot drift across epic / milestone /
  phase files because they are referenced, not duplicated.
- **Every existing section has a destination** in the new layout (see
  the mapping table below). Where two sections merge, the rationale
  for merging is named. No rule, anecdote, or recurring-trap example
  from the current AGENTS.md is dropped.

The protective check this refactor must not weaken: the `Verified by:`
gate, the reality-check gate, the Plan-to-PR Completion Gate, and the
estimate-deviation reconciliation rule are load-bearing across the
project's planning + implementation workflow today; the restructured
files must carry every clause of those rules verbatim or as a tightened
re-statement, not as a compressed paraphrase.

## Cross-Cutting Invariants

1. **No silent rule loss.** Every load-bearing rule, recurring-trap
   anecdote, and exception clause currently in [`AGENTS.md`](/AGENTS.md)
   has a named destination in the new layout. The mapping table below
   is the falsifier — if a current section name does not appear in the
   "Source section" column with a destination, the table is incomplete
   and must be fixed before execution.
2. **Universal rules live exactly once.** Rules every session needs
   (pre-edit gate, scope guardrails, sub-agent delegation,
   stop-and-report, anti-patterns, change boundaries) live in the root
   router and are not duplicated into workflow / planning / reference
   files. Workflow / planning files may *cite* universal rules by
   section name from the root, but do not restate them.
3. **Planning shared rules live exactly once.** The cross-level
   planning rules (`Verified by:` annotations, falsifiability check,
   rules-vs-estimates labeling, 5-line code cap in plans, "planning
   artifacts that only cite each other" anti-pattern, exact-match
   label quoting, plan-code-reviewer-response rule) live in
   `docs/agents/planning/shared.md` and are referenced — not
   duplicated — by the per-level planning files.
4. **Routing is explicit, not implicit.** The root router carries a
   session-type routing table that names every file a session must
   read for its work. We do not rely solely on Claude Code's nested
   AGENTS.md auto-discovery (which other agent tools may not honor
   and which only fires when files are *read* in a directory, not
   when files are *written*).

## Naming

- New tree root: `docs/agents/` — chosen over root-level `agent-docs/`
  because `docs/` is the existing convention for project documentation
  in this repo (see [`docs/dev.md`](/docs/dev.md),
  [`docs/architecture.md`](/docs/architecture.md), the
  [`docs/plans/`](/docs/plans/) tree). Co-locating agent guidance under
  `docs/agents/` keeps the docs/ namespace coherent.
- Subdirectory split: `workflows/` (per-session-type playbooks),
  `planning/` (planning meta-process across levels), `reference/`
  (mechanical reference material).
- File names use kebab-case `.md`, mirroring the rest of `docs/`.
- The root file stays at [`AGENTS.md`](/AGENTS.md) (not renamed). It
  becomes the router; subdirectory content is reachable from there.

## Decisions Made At Planning Time

### Three candidate structures evaluated

**Candidate A — Flat per-session files, no shared content.**

```
docs/agents/
  implementation.md
  plan-implementation.md
  epic-drafting.md
  milestone-planning.md
  phase-planning.md
  review-fixes.md
  ui-review.md
  debugging.md
  reference-pr-template.md
  reference-validation.md
  reference-architecture.md
  reference-anti-patterns.md
```

Each session reads exactly one file. Cross-cutting rules
(`Verified by:`, falsifiability, rules-vs-estimates) get duplicated
across `epic-drafting.md`, `milestone-planning.md`, and
`phase-planning.md`. (`Verified by:` rule itself is currently nested
under "Phase Planning Sessions" in
[AGENTS.md:801-824](/AGENTS.md) but the rule body says it binds
"any load-bearing claim about the codebase or supporting services" —
it applies to all three planning levels, not just phase.)

- session-type fit: ✓ one file per session
- discoverability: ✓ file names map directly to sessions
- drift resistance: ✗ a `Verified by:` rule edit must touch three
  planning files; one author skipping one of them silently weakens
  the rule for that level
- update friction: ✗ same — the most-load-bearing rules require the
  most file edits

**Candidate B — Workflows / planning / reference split with shared
planning content.**

```
docs/agents/
  workflows/
    implementation.md
    plan-implementation.md
    review-fixes.md
    ui-review.md
    debugging.md
  planning/
    shared.md
    epic.md
    milestone.md
    phase.md
    plan-to-pr.md
  reference/
    pr-template.md
    validation.md
    architecture-guardrails.md
    documentation-currency.md
```

Cross-cutting planning rules live in `planning/shared.md` once.
Per-level files (`epic.md`, `milestone.md`, `phase.md`) describe only
the work that is unique to that level and reference shared.md for
content that binds across levels.

- session-type fit: ✓ implementation reads `workflows/implementation.md`
  + root universal rules; phase planning reads `planning/shared.md` +
  `planning/phase.md` + root universal rules
- discoverability: ✓ router names the file set per session type;
  directory split (workflows / planning / reference) carries semantic
  weight on its own
- drift resistance: ✓ shared planning rules live once
- update friction: ✓ rule changes touch one file (or two when a rule
  has a per-level specialization)

**Candidate C — Cursor-style atomic rule files with metadata-driven
inclusion.**

```
docs/agents/rules/
  verified-by-annotations.md
  falsifiability-check.md
  rules-vs-estimates.md
  plan-code-minimalism.md
  pre-edit-gate.md
  ... (30+ files)
```

Each rule lives in its own file with frontmatter naming which
session types it applies to. This mirrors Cursor's
[`.cursor/rules/*.mdc`](https://cursor.com/docs/context/rules) model.

- session-type fit: ✗ even one session reads 8-12 atomic files
- discoverability: ✓ each rule has its own descriptive filename
- drift resistance: ✓ one rule per file makes drift impossible by
  construction
- update friction: ✓ single-file edits
- *but*: Claude Code does not auto-trigger by frontmatter the way
  Cursor does (Cursor matches glob patterns; Claude Code's nested
  AGENTS.md discovery is path-based, not metadata-based — see
  [the Claude Code docs](https://code.claude.com/docs/en/overview)).
  Without frontmatter-triggering, the router becomes a giant
  if/else listing dozens of files per session — re-introducing the
  same context-bloat problem this refactor is solving.

### Chosen structure: Candidate B

Candidate B wins because it is the only structure that simultaneously
keeps the per-session reading list short (1-2 workflow + planning
files), avoids drift on cross-cutting rules, and works with a single
explicit router file (not a metadata-triggered system this repo's
agent tools don't all honor).

The directory split (workflows / planning / reference) carries
information on its own — a reader can tell at a glance whether a file
is a session playbook, a planning meta-rule, or a reference lookup.
This shape is consistent with the
[HumanLayer recommendation](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
("CLAUDE.md as index, separate task-specific files in `agent_docs/`,
prefer pointers to copies") and with
[the nested-AGENTS.md monorepo pattern](https://dev.to/datadog-frontend-dev/steering-ai-agents-in-monorepos-with-agentsmd-13g0)
("root AGENTS.md as a map, pointing agents to only read the relevant
document based on their task"). Both sources independently arrive at
the router-plus-leaf-files shape.

### Routing logic

The root [`AGENTS.md`](/AGENTS.md) carries a session-type routing
table covering the session types below. The table's *shape* — which
session type maps to which file set — is the decision-complete
contract; the row-label and column-header *prose* is editorial polish
to be tightened at execution-time. The shape:

| If your session is… | Read these files |
|---|---|
| Implementation work (lightweight or full structured path), no plan doc to consume | `docs/agents/workflows/implementation.md` |
| Implementing a documented plan from `docs/plans/` | `docs/agents/workflows/implementation.md` + `docs/agents/workflows/plan-implementation.md` + the plan's own `Cross-Cutting Invariants` and `Self-Review Audits` |
| Drafting an epic | `docs/agents/planning/shared.md` + `docs/agents/planning/epic.md` |
| Drafting a milestone doc (sequencing, cross-phase invariants, cross-phase decisions) | `docs/agents/planning/shared.md` + `docs/agents/planning/milestone.md` |
| Drafting a phase scoping doc or phase plan doc | `docs/agents/planning/shared.md` + `docs/agents/planning/phase.md` + `docs/agents/planning/plan-to-pr.md` |
| Plan-to-Landed close-out PR (Status flip after post-release validation) | `docs/agents/planning/plan-to-pr.md` |
| Addressing PR review feedback | `docs/agents/workflows/review-fixes.md` |
| Capturing UI screenshots / building PR screenshot evidence | `docs/agents/workflows/ui-review.md` |
| Debugging a failing validation, CI run, or local test | `docs/agents/workflows/debugging.md` |

Universal rules in the root file (pre-edit gate, scope guardrails,
sub-agent delegation, stop-and-report, anti-patterns, change
boundaries) apply to every session and are not enumerated in the
table.

### Reference files are topic-organized constraint sets, not lookups

The `reference/` directory is **not** a stash of optional lookup
material. Every file under `reference/` is a topic-organized
*constraint set* that fires at a specific session moment:

| Reference file | Fires at | Triggered by |
|---|---|---|
| `reference/architecture-guardrails.md` | **Pre-edit gate** (before the first edit) | Diff surface intersects `apps/`, `shared/`, `supabase/`, or styling |
| `reference/validation.md` | Mid-session (Continuous Validation: before each commit on multi-file work) and end-of-session (PR Readiness, Validation Honesty) | Any code-touching session; the "before each commit" cadence is mid-session, not PR-time only |
| `reference/documentation-currency.md` | Mid-session (doc-update triggers as code changes) and end-of-session (Doc Currency PR Gate) | Diff surface includes any of the named docs (`README.md`, `docs/architecture.md`, `docs/dev.md`, etc.) |
| `reference/pr-template.md` | Per-commit (Conventional Commits) and end-of-session (PR body template) | Every commit; every PR open |

The router does not enumerate reference files in the session-type
routing table because the *triggering* logic lives in the workflow
file (which is what tells you "you are now at the pre-edit gate;
load `architecture-guardrails.md`"). The workflow file's role is
orchestration; reference files carry the binding rule content.

Earlier draft of this plan called reference files "lookups, not
session-scoped playbooks." That framing was wrong — it would let an
implementation session skip
`reference/architecture-guardrails.md` entirely and miss
pre-edit-time constraints like "Do not casually duplicate business
rules across frontend and backend" and the styling-token bucket
discipline. Reframed here as constraint sets so the reading
discipline matches what each file actually does.

### Mandatory pre-edit reference reads

`reference/architecture-guardrails.md` is a **mandatory pre-edit
read** for any session whose diff surface intersects:

- `apps/web/`, `apps/site/`, `shared/`, `supabase/` (the
  responsibility-split rules and the "do not duplicate business
  rules" / "shared source of truth drives both" constraints)
- styling surfaces — `apps/web/src/styles.scss`,
  `apps/web/src/styles/`, `shared/styles/`, or any SCSS / CSS
  custom property definition site (the Styling Token Discipline
  rules)

`workflows/implementation.md` and `workflows/plan-implementation.md`
both name this routing in their pre-edit-gate sections: "Before
the first edit to a file matching the surface set above, read
`docs/agents/reference/architecture-guardrails.md` end-to-end." The
read is not negotiable — it is the same shape of pre-edit gate the
root router carries for the universal rules.

This pattern generalizes for any future reference file whose
content is pre-edit binding (vs. PR-time lookup): the workflow
file names the trigger surface and the mandatory read; the
reference file lives under `reference/` because that is where
topic-organized constraint sets live in this layout.

### Single-file Plan-to-PR rule placement

The Plan-to-PR Completion Gate currently nested under "Expected
Workflow" in [AGENTS.md:201-287](/AGENTS.md) is load-bearing across:

- **Plan-implementing sessions** — must flip Status, walk every Goal /
  Test / Audit, write Estimate Deviations callout
- **Phase-planning sessions** — the gate's two-phase post-release-
  validation exception ("In progress pending prod smoke") informs how
  the Validation Gate is scoped at plan-drafting time
- **Plan-to-Landed close-out sessions** — the doc-only PR that flips
  Status after a post-release validation passes

To avoid duplicating it across `workflows/plan-implementation.md`,
`planning/phase.md`, and a third close-out file, the rule lives in
`planning/plan-to-pr.md` and is referenced from all three. The
close-out session-type entry in the routing table points directly to
`planning/plan-to-pr.md` because that is its only required reading.

### "Verified by:" rule placement

Currently nested under "Phase Planning Sessions" in
[AGENTS.md:801-824](/AGENTS.md), but its body explicitly binds
"any load-bearing claim about the codebase or supporting services."
Move to `planning/shared.md` so it applies to epic + milestone + phase
+ plan-to-pr docs uniformly. The phase file references the shared
rule; it does not restate it.

Same treatment for the falsifiability check
([AGENTS.md:850-871](/AGENTS.md)), the rules-vs-estimates distinction
([AGENTS.md:714-758](/AGENTS.md)), the planning-artifacts-cite-each-
other anti-pattern ([AGENTS.md:943-950](/AGENTS.md)), and the
exact-match label quoting rule ([AGENTS.md:825-849](/AGENTS.md)).

### Subdirectory AGENTS.md auto-loading: in-scope, conditional, late commit

Claude Code auto-loads subdirectory `AGENTS.md` / `CLAUDE.md` files
when reading files in that directory. Per user direction, thin
nested AGENTS.md files land near the end of this PR — but only if
they carry non-duplicative content. The explicit router in the root
[`AGENTS.md`](/AGENTS.md) remains the primary, portable mechanism;
nested files are a Claude-Code-specific safety net that fires when
an agent reads a file in (e.g.) `docs/plans/` without first re-reading
the root router.

Candidate locations and the duplication test for each:

- **`docs/plans/AGENTS.md`** — fires when an agent reads or edits any
  plan doc. Non-duplicative content: a one-paragraph reminder that
  planning sessions should load `docs/agents/planning/shared.md` plus
  the per-level file (`epic.md` / `milestone.md` / `phase.md` /
  `plan-to-pr.md`), with the canonical pointers. This is a *router
  fragment*, not a copy of the planning rules — duplication-free by
  construction.
- **`docs/agents/AGENTS.md`** — fires when an agent reads any file in
  the new `docs/agents/` tree. Non-duplicative content: a one-line
  pointer to `docs/agents/README.md` for directory orientation. The
  README itself is the durable map; `AGENTS.md` here is just the
  hook that makes Claude Code load the README on directory entry.
  Duplication test: pass — pointer only.
- **`apps/web/AGENTS.md`, `apps/site/AGENTS.md`, `supabase/AGENTS.md`,
  `shared/AGENTS.md`** — *not* added in this PR. The
  per-app guidance currently in the root file's Architecture
  Guardrails moves to `docs/agents/reference/architecture-guardrails.md`,
  not into per-app nested files. Adding per-app nested files would
  duplicate that content and would expand the scope of this refactor
  beyond restructuring agent guidance into restructuring per-app
  documentation. Out of scope here; can land separately if the
  duplication-free version emerges.

Each candidate above is re-confirmed against the "non-duplicative"
test at execution time before its commit lands. If a candidate's
content cannot be expressed without restating something already in
the root router or a leaf file, the candidate is dropped from this
PR with a one-line note in the PR body.

## Files To Touch — New

*Estimate of expected file inventory; per AGENTS.md "Plan content is a
mix of rules and estimates," implementation may revise.*

- `docs/agents/workflows/implementation.md` — full structured path,
  lightweight path, execution rules, refactor completion proof,
  feature-time cleanup, versioning discipline. Plus self-review
  checklist (general items not specific to plan-implementation).
  Pre-edit gate explicitly names the mandatory routing into
  `reference/architecture-guardrails.md` for diff surfaces in
  `apps/`, `shared/`, `supabase/`, or styling — read end-to-end
  before the first edit. Continuous Validation and Validation
  Honesty load from `reference/validation.md` mid-session before
  each commit on multi-file work; doc-update triggers from
  `reference/documentation-currency.md` fire as code changes; PR
  template + Conventional Commits from `reference/pr-template.md`
  apply per-commit and at PR open.
- `docs/agents/workflows/plan-implementation.md` — plan-implementer
  extras: walking the plan's contracts, distinguishing rule vs
  estimate deviations, running plan's named self-review audits, the
  "When the plan says X but reality is Y" deviation handling. Points
  at `planning/plan-to-pr.md` for the Status-flip rules. Inherits
  every pre-edit / mid-session / PR-time reference-file routing from
  `workflows/implementation.md` — does not duplicate it. Adds the
  plan's own `Cross-Cutting Invariants` walk and the named
  self-review audits per surface.
- `docs/agents/workflows/review-fixes.md` — review-fix rigor, GH
  thread reply rules, the "audit siblings of the same class" rule.
- `docs/agents/workflows/ui-review.md` — UI review runs, capture
  workflow, PR screenshot process, mobile-first viewport rules,
  before/after evidence.
- `docs/agents/workflows/debugging.md` — debugging discipline, CI
  failure comment reading, speculative-commit-undo rule, local-vs-CI
  baseline gotchas (service_role grants, pgTAP `has_table_privilege`
  semantics).
- `docs/agents/planning/shared.md` — `Verified by:` annotations,
  falsifiability check, rules-vs-estimates distinction, 5-line code
  cap in plans (plan-code-minimalism), directional-pseudocode
  framing, planning-artifacts-cite-each-other anti-pattern, exact-
  match label quoting, plan-code-reviewer-response rule (remove
  the snippet, don't fix the code), Cross-Cutting Invariants section
  requirement.
- `docs/agents/planning/epic.md` — epic drafting (capability targets
  vs. per-milestone prescription, sizing summaries as estimates,
  per-epic milestone numbering, in-place-as-archive pattern).
- `docs/agents/planning/milestone.md` — milestone planning sessions
  (Mermaid sequencing graph, anti-goal: don't scope phases here,
  output-set rules, cap of 10-15% of milestone implementation time,
  defer-rather-than-over-resolve, PR-count-predictions-are-not-
  contracts).
- `docs/agents/planning/phase.md` — phase planning sessions: scoping
  doc + plan doc split (Scoping owns / Plan owns), reality-check
  gate, "In draft" → "Proposed" promotion gate, parallel-drafting
  during prior-phase implementation rules, doc-only-decision-phase
  carve-out, plain-language context preamble requirement, spike-
  before-plan, PR-count branch test, the URL-retarget assertion-
  audit rule, the cross-app destinations / hard-navigation rule,
  the "Bans on surface require rendering the consequence" rule,
  the prefer-existing-wrapper-scripts rule, cross-phase coordination
  rules.
- `docs/agents/planning/plan-to-pr.md` — Plan-to-PR Completion Gate,
  Status lifecycle (`In draft` → `Proposed` → `Landed`, post-release
  exception), Estimate Deviations PR-body callout, deferral-in-plan
  rule, soft-commitment-words ban.
- `docs/agents/reference/pr-template.md` — PR body template verbatim,
  section-specific rules, commit message conventions (Conventional
  Commits is one line — folded in here for proximity to the PR
  template).
- `docs/agents/reference/validation.md` — validation expectations,
  `npm run lint` / `build:web` / `build:site` commands, validation
  honesty, continuous validation, regression discipline, PR
  readiness, testing-tiers discipline.
- `docs/agents/reference/architecture-guardrails.md` — architecture
  guardrails, the apps/web vs apps/site vs supabase split, styling
  token discipline, the cross-app hard-navigation guidance (a
  pointer; rule body lives in `planning/phase.md` because that is
  where it binds at plan-drafting time). **Mandatory pre-edit
  read** for any session whose diff surface intersects `apps/`,
  `shared/`, `supabase/`, or styling — see "Mandatory pre-edit
  reference reads" under Routing logic. Despite living under
  `reference/`, this file is *not* an optional lookup; the rules
  it carries (no business-rule duplication across frontend and
  backend, themable-vs-structural token bucket discipline,
  shared-source-of-truth for quiz correctness / scoring /
  validation, no production-fallback drift) bind before the first
  edit, not at PR-open time.
- `docs/agents/reference/documentation-currency.md` — Doc Currency
  Is a PR Gate, the README / architecture / dev.md / open-questions
  / backlog update triggers.
- `docs/agents/README.md` — one-page map of the directory: what each
  subdirectory is for, what the file set covers. Counterpart to the
  router in [`AGENTS.md`](/AGENTS.md) for a reader who navigated to
  `docs/agents/` directly.

## Files To Touch — Modify

*Estimate; reality at execution may revise.*

- [`AGENTS.md`](/AGENTS.md) — rewrite as router. Keeps Purpose
  orientation, universal rules, session-type routing table, pointer
  to [`docs/dev.md`](/docs/dev.md). Drops everything else. No fixed
  size target; size-smell check at Validation Gate time.
- [`docs/dev.md`](/docs/dev.md) — has at least one reference to
  AGENTS.md sections by name; verify no broken section references.
- Per-phase plan docs under [`docs/plans/`](/docs/plans/) — verify
  no broken `AGENTS.md` section anchors. Plans cite AGENTS.md
  sections by name (e.g., "per AGENTS.md 'Phase Planning Sessions'");
  if a section name moves, the citation may need to update to point
  to the new file. Reality-check at execution time: scan with
  `grep -rn 'AGENTS.md' docs/` and audit each hit.
- [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md) —
  references "AGENTS.md 'Phase Planning Sessions'" in its hard-
  constraints block; update to point at the new
  `docs/agents/planning/phase.md` location.
- [`README.md`](/README.md) — verify no AGENTS.md references break.
- [`.github/pull_request_template.md`](/.github/pull_request_template.md)
  — verify alignment with restructured PR template reference; rule
  is the template is verbatim, so changes likely none.

## Files Intentionally Not Touched

*Estimate; per AGENTS.md "Files intentionally not touched" is an
estimate, not a ban — a structural call may require deviation, in
which case the deviation goes in the PR body's Estimate Deviations
section.*

- The plan docs themselves under [`docs/plans/`](/docs/plans/) and
  [`docs/plans/epics/`](/docs/plans/epics/) — content unchanged
  except for the `AGENTS.md` reference updates noted above.
- [`docs/architecture.md`](/docs/architecture.md),
  [`docs/styling.md`](/docs/styling.md),
  [`docs/testing-tiers.md`](/docs/testing-tiers.md),
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md),
  [`docs/operations.md`](/docs/operations.md) — these are the
  authoritative content sources that AGENTS.md cites; they are not
  rewritten, only cited from the new location.
- All code under [`apps/`](/apps/), [`shared/`](/shared/),
  [`supabase/`](/supabase/), [`scripts/`](/scripts/),
  [`.github/workflows/`](/.github/workflows/) — pure docs refactor.

## Content Mapping Table

Every section in the current [`AGENTS.md`](/AGENTS.md) maps to a
destination. This is the falsifier for invariant 1 — if a section
is missing from this table, the table is incomplete.

| Source section (current `AGENTS.md`) | Lines | Destination |
|---|---|---|
| Header preamble | 1-6 | Root router (orientation) |
| Development Workflow Source Of Truth | 7-26 | Root router (pointer to `docs/dev.md`) |
| Purpose | 28-47 | Root router (condensed orientation) |
| Architecture Guardrails | 49-63 | `reference/architecture-guardrails.md` |
| Styling Token Discipline | 65-112 | `reference/architecture-guardrails.md` (subsection) |
| Expected Workflow (intro) | 114-125 | `workflows/implementation.md` (lightweight vs full intro) |
| Planning Depth | 127-199 | Split: planning meta-process (5-line cap, directional pseudocode, code-shapes-as-pseudocode, plan-code-reviewer-response, Cross-Cutting Invariants requirement) → `planning/shared.md`. The "include every gate" guidance for naming validation and self-review steps → folded into `workflows/implementation.md` and `planning/phase.md` per their respective audiences. |
| Plan-to-PR Completion Gate | 201-287 | `planning/plan-to-pr.md` |
| Epic Drafting | 289-336 | `planning/epic.md` |
| Milestone Planning Sessions | 338-428 | `planning/milestone.md` |
| Phase Planning Sessions | 430-950 | `planning/phase.md` (per-phase rules), with these subsections promoted to `planning/shared.md` because they bind across levels: `Verified by:` annotations (801-824), falsifiability check (850-871), rules-vs-estimates distinction (714-758), exact-match label quoting (825-849), planning-artifacts-cite-each-other anti-pattern (943-950). The "Bans on surface require rendering the consequence" rule (872-901) and the "Cross-app destinations need hard navigation" rule (902-932) stay in `planning/phase.md` because they bind at plan-drafting time, but a pointer is added in `reference/architecture-guardrails.md` for implementation-time discoverability. |
| Scope Guardrails | 952-972 | Root router (universal — applies to every session) |
| Feature-Time Cleanup And Refactor Debt Capture | 974-1001 | `workflows/implementation.md` |
| Pre-Edit Gate | 1003-1029 | Root router (universal) |
| Lightweight Path | 1031-1037 | `workflows/implementation.md` |
| Full Structured Path | 1039-1068 | `workflows/implementation.md` |
| Review-Fix Rigor | 1070-1111 | `workflows/review-fixes.md` |
| Execution Rules (intro + bullets) | 1113-1131 | `workflows/implementation.md` |
| Sub-Agent Delegation | 1133-1161 | Root router (universal — every session may delegate) |
| Refactor Completion Proof | 1163-1186 | `workflows/implementation.md` |
| Stop-And-Report Conditions | 1188-1210 | Root router (universal) |
| Debugging Discipline | 1212-1256 | `workflows/debugging.md` |
| Versioning And Dependency Discipline | 1258-1267 | `workflows/implementation.md` |
| Documentation Expectations (intro + per-doc-update triggers) | 1269-1322 | `reference/documentation-currency.md` |
| Doc Currency Is a PR Gate | 1323-1344 | `reference/documentation-currency.md` |
| Commit Message Expectations | 1346-1348 | `reference/pr-template.md` (one line, folded with PR template for proximity) |
| Validation Expectations (intro + commands) | 1350-1378 | `reference/validation.md` |
| Validation Honesty | 1380-1392 | `reference/validation.md` |
| Continuous Validation | 1394-1402 | `reference/validation.md` |
| PR Readiness (intro) | 1404-1414 | `reference/validation.md` |
| PR Body Template | 1416-1502 | `reference/pr-template.md` |
| Regression Discipline | 1504-1513 | `reference/validation.md` |
| Testing Tiers Discipline | 1515-1543 | `reference/validation.md` (with pointer to `planning/plan-to-pr.md` for the two-phase post-release-validation exception) |
| UI Review Runs | 1545-1617 | `workflows/ui-review.md` |
| Pull Request Screenshot Process | 1619-1637 | `workflows/ui-review.md` |
| Self-Review Checklist | 1639-1702 | Split: general bullets (correctness, regressions, accessibility, etc.) → `workflows/implementation.md`; UI-specific subset → `workflows/ui-review.md`; backend / trust-related subset → `workflows/implementation.md`. The plan-named-self-review-audit walk → `workflows/plan-implementation.md`. |
| Anti-Patterns | 1704-1720 | Root router (universal warnings) |
| Change Boundaries | 1722-1727 | Root router (universal) |

Sections that merge (and rationale):

- **"Planning Depth" section is split** — it currently mixes
  planning meta-process (5-line cap, directional pseudocode, etc.)
  with implementation-session guidance ("include every execution
  gate that materially affects quality"). The split is intentional:
  planning meta-process binds plan authoring; implementation
  guidance binds plan-implementing sessions. They are different
  audiences and live in different files.
- **"Commit Message Expectations" merges into `reference/pr-template.md`** —
  one sentence ("Use Conventional Commits"). Standalone file is
  excessive for one rule, and the PR template page is the natural
  place a PR-author looks for commit-message guidance.
- **"Self-Review Checklist" splits across three files** — the
  checklist is itself a multi-audience block: general items belong
  in `workflows/implementation.md`, UI-specific items belong in
  `workflows/ui-review.md`, the plan-named-self-review-audit walk
  belongs in `workflows/plan-implementation.md`. Co-locating each
  subset with the workflow it binds is more useful than keeping a
  single mixed checklist no session reads in full.

## Execution Steps

The refactor is doc-only and can land in one PR with multiple commits,
each commit standing alone as a coherent step. Estimated commit
boundaries (per AGENTS.md "intended commit boundaries are an estimate;
implementer may refine"):

1. **Plan doc lands as commit 1 of this PR** (already shipped:
   commit `89ccb86`). Plan-review pass(es) land as additional
   commits on this branch before execution begins; the plan flips
   from `In draft` → `Proposed` after the plan-review walk per
   AGENTS.md "`In draft` → `Proposed` promotion gate" — that
   walk is what gates the start of execution.
2. **Create the new `docs/agents/` tree with empty stubs.** Empty
   files with a one-line description at the top of each. Verifies
   the directory layout before any content moves. Includes
   `docs/agents/README.md`.
3. **Move reference content.** Carve out
   `reference/pr-template.md` (PR template + commit conventions),
   `reference/validation.md` (validation commands + honesty +
   continuous + regression + testing tiers),
   `reference/architecture-guardrails.md` (architecture + styling
   tokens), `reference/documentation-currency.md` (doc-update
   triggers + PR gate). Each commit moves one reference file's
   content out of `AGENTS.md` into the new file, keeping the
   AGENTS.md section in place temporarily as a pointer ("see
   `docs/agents/reference/<file>.md`") so plans/PRs that cite the
   section by name still resolve.
4. **Move workflow content.** Same shape as step 3 for
   `workflows/implementation.md`, `workflows/plan-implementation.md`,
   `workflows/review-fixes.md`, `workflows/ui-review.md`,
   `workflows/debugging.md`. One commit per file.
5. **Move planning content.** Same shape for `planning/shared.md`
   first (so per-level files can reference it), then `planning/epic.md`,
   `planning/milestone.md`, `planning/phase.md`, `planning/plan-to-pr.md`.
   One commit per file.
6. **Rewrite root `AGENTS.md` as router.** Drop the temporary
   pointer-stubs left behind by steps 3-5. Add the routing table
   and verify it covers every session type from the proposed list.
   No fixed target size; the size-smell check in the validation gate
   covers this.
7. **Update incoming references.** `grep -rn 'AGENTS.md' .` and
   audit every hit. Update plan docs / `docs/dev.md` / `README.md` /
   `docs/plans/planning-doc-location.md` references that point at
   moved sections. The convention going forward is to cite section
   *names* (which carry across the move) plus the new file path.
8. **Add nested AGENTS.md files (conditional).** For each candidate
   in the "Subdirectory AGENTS.md auto-loading" decision above,
   re-confirm the non-duplicative test against the now-final leaf
   files. If a candidate passes, add it as its own commit. If a
   candidate fails the test, drop it from this PR with a one-line
   note in the PR body; the candidate can land separately if a
   duplication-free version emerges later.
9. **Self-review pass.** Walk the cross-cutting invariants above
   against the final tree. Confirm every source section in the
   mapping table has actually landed in its destination. Run the
   "no silent rule loss" check by diffing the bullet-by-bullet
   content of each source section against the destination file.
   Run the size-smell check from the validation gate.
10. **Update PR description and flip plan Status to `Landed`.**
    The PR was opened plan-only at commit 1; before merge, the
    description is rewritten to cover the full restructure diff
    (Summary, Why, Validation, etc. all updated to reflect the
    expanded scope). Plan Status flips from `Proposed` →
    `Landed` in the final commit, per AGENTS.md "Plan-to-PR
    Completion Gate."

## Validation Gate

Doc-only refactor — no `npm run` or `deno check` exercises the
changed surface directly. Validation is structural:

- [ ] **No silent rule loss.** Diff each source section in the
  content mapping table against the destination file. Use a
  side-by-side comparison; every bullet, every recurring-trap
  anecdote, every exception clause from the source must appear
  in the destination (verbatim or as a tightened restatement
  that does not weaken the rule).
- [ ] **File sizes pass a smell check.** No fixed line target
  (per user direction; stretching or squashing a file's content
  to hit a number is itself an anti-pattern). Instead: examine
  every file in the new tree against its declared scope. A file
  much shorter than expected for its scope is a smell that the
  scope was over-claimed or content is missing; a file much
  longer than expected is a smell that the file is doing more
  than one job and should split, or that universal-rule content
  leaked in. Confirm each outlier (in either direction) makes
  sense in its case before signing off.
- [ ] **Routing table covers every session type.** Walk the
  routing table against the session-type list in this plan's
  "Routing logic" section; every row has a destination.
- [ ] **Incoming references resolve.** `grep -rn 'AGENTS.md' .`
  in the merged worktree returns zero hits that point at section
  names that no longer exist in the root file. Section names that
  moved have their citing docs updated to point at the new file.
- [ ] **`npm run lint`** still passes (defensive — should be
  unaffected, but cheap to confirm).
- [ ] **`npm run build:web`** still passes (same — defensive).

## Self-Review Audits

Per AGENTS.md "name the self-review audits that apply to this PR's
diff surfaces":

- **Documentation surface audit.** Confirm every named doc that
  AGENTS.md touched still has a current pointer in the new layout
  (`docs/dev.md`, `docs/architecture.md`, `docs/testing-tiers.md`,
  `docs/self-review-catalog.md`, `docs/styling.md`,
  `docs/operations.md`, `docs/plans/planning-doc-location.md`).
- **Plan-doc citation audit.** Walk every plan doc under
  `docs/plans/` and `docs/plans/epics/` — `grep -rn 'AGENTS.md'
  docs/plans/`. Each citation either survives intact (section name
  unchanged, even if file moved) or is updated.
- **`Verified by:` rule placement audit.** Confirm the rule body
  appears once in `planning/shared.md` and is referenced (not
  restated) from `planning/epic.md`, `planning/milestone.md`,
  `planning/phase.md`. Same audit for falsifiability check,
  rules-vs-estimates distinction, planning-artifacts-cite-each-
  other anti-pattern, exact-match label quoting.
- **Plan-to-PR Completion Gate placement audit.** Confirm the rule
  body appears once in `planning/plan-to-pr.md` and is referenced
  from `workflows/plan-implementation.md` and the close-out routing
  entry.
- **Universal-rule placement audit.** Confirm pre-edit gate, scope
  guardrails, sub-agent delegation, stop-and-report, anti-patterns,
  and change boundaries appear in the root router only — not
  duplicated into any workflow / planning / reference file.
- **Reference-file routing audit.** Confirm `workflows/implementation.md`
  names the mandatory pre-edit read of
  `reference/architecture-guardrails.md` for diff surfaces in
  `apps/`, `shared/`, `supabase/`, or styling — explicit, not
  buried in prose. Confirm the pre-edit-gate section in
  `workflows/implementation.md` walks reads from each
  reference file at the right moment (architecture-guardrails
  pre-edit; validation mid-session before each commit;
  documentation-currency mid-session as code changes; pr-template
  per-commit and at PR open). Confirm `workflows/plan-implementation.md`
  inherits this routing without duplicating it.

## Documentation Currency PR Gate

Walk the triggers from AGENTS.md "Doc Currency Is a PR Gate":

- `docs/architecture.md` — N/A; no migration / function / table /
  data-ownership / runtime-flow / trust-boundary changes.
- `docs/product.md` — N/A; no implemented capability changes.
- `docs/backlog.md` — N/A; no backlog items closed or created.
- `docs/plans/planning-doc-location.md` — needs an update to point
  at the new `docs/agents/planning/phase.md` location for its
  hard-constraints reference. Confirmed in the "Files To Touch —
  Modify" section above.
- `README.md` — verify no AGENTS.md references break (likely none;
  README cites AGENTS.md as "follow AGENTS.md," not by section name).
- `docs/dev.md` — verify section-name references resolve under the
  new structure.
- `docs/open-questions.md` — N/A; no answered or new questions.

## Out Of Scope

- Migrating the `In draft` planning-doc-location investigation
  question (whether discussion-style surfaces move off PRs to
  GitHub Discussions). That is its own open investigation tracked
  in [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md);
  this restructure does not touch it.
- Per-app nested AGENTS.md files (`apps/web/AGENTS.md`,
  `apps/site/AGENTS.md`, `supabase/AGENTS.md`, `shared/AGENTS.md`).
  Per the "Subdirectory AGENTS.md auto-loading" decision under
  "Routing logic" above — these would duplicate the content moving
  to `docs/agents/reference/architecture-guardrails.md`. The two
  in-scope nested AGENTS.md candidates (`docs/plans/AGENTS.md` and
  `docs/agents/AGENTS.md`) are router fragments / pointers, not
  content copies, so they pass the duplication test by construction
  and are in scope per the same decision.
- Migrating pre-convention plan docs (the
  [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  set and its M0–M3 phase plans) into the
  `docs/plans/epics/<slug>/` shape. That is its own deferred
  refactor per
  [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md).
- Any rule-content changes. This refactor is structural only —
  every rule moves verbatim or as a tightened restatement that does
  not weaken the rule. New rules, removed rules, or behavior changes
  to existing rules are out of scope and would land separately.

## Risk Register

- **Silent rule loss during the move.** The largest risk; the
  source file is 1,727 lines and rule density is high. Mitigation:
  the content mapping table above is the source of truth; the
  validation gate's first check is a side-by-side diff of every
  source section against its destination. The execution-step
  ordering (one commit per file move) keeps each diff small enough
  to actually review.
- **Citation rot in plan docs.** Existing plan docs cite AGENTS.md
  sections by name. Section names move with their content (see
  "Decisions Made At Planning Time → Routing logic"), so most
  citations still resolve textually. The plan-doc citation audit in
  the self-review catches the rest. Mitigation: prefer to keep
  section names stable across the move; rename only when a section
  changes shape on the way (e.g., "Phase Planning Sessions" stays
  named "Phase Planning Sessions" inside `planning/phase.md`).
- **Drift between root router and leaf files.** The router will
  describe each leaf file briefly. If a leaf file's content shifts
  later (e.g., adding a new rule), the router description may
  silently lag. Mitigation: keep the router's per-file descriptions
  to one-line "what does this file cover" summaries — the leaf
  filename + section list inside should be self-explanatory enough
  that the router does not need to describe content. Drift becomes
  obvious when the router's one-liner stops matching the file's
  table of contents.
- **Workflow disruption mid-flight.** This refactor lands while
  active phase plans (M2 demo-expansion phase 2.x, Madrona M2
  in-flight) are mid-implementation. Implementer agents reading
  AGENTS.md mid-session would be partway through a session-load
  invalidation. Mitigation: the doc is a snapshot of the rules,
  not a runtime config — agents in active sessions continue from
  whatever they loaded; new sessions get the new structure. The
  rule content does not change, so an agent that loaded the old
  AGENTS.md is not following different rules from one that loads
  the new structure.
- **Subdirectory AGENTS.md nested-discovery confusion.** Future
  contributors may not realize subdirectory AGENTS.md auto-loading
  is intentionally not used here. Mitigation: the root router
  explicitly says "explicit routing table is the mechanism; do not
  rely on nested-AGENTS.md discovery from other agent tools."

## Backlog Impact

No backlog items closed or opened. This refactor is mechanical
restructuring of agent guidance, not product or platform work.

## User Direction (Resolved)

The three initial open decisions resolved by user direction; recorded
here so the rationale survives if the doc is read cold later.

- **Delivery shape: single PR.** Plan-doc commit is already up on
  this branch as commit 1. Plan-review pass(es) happen here as
  additional commits before execution begins. Once the plan is
  signed off, restructure execution lands as additional commits on
  this same branch; the PR description is updated to cover the full
  diff before flipping the plan to `Landed`. Two-PR shape was
  available; single-PR was chosen for keeping the plan-review and
  the restructure in one reviewable history.
- **Nested AGENTS.md files: in-scope, conditional, late commit.**
  Thin nested AGENTS.md files land near the end of this PR if and
  only if their content is non-duplicative against the root router
  and the leaf files. See "Subdirectory AGENTS.md auto-loading:
  in-scope, conditional, late commit" under "Decisions Made At
  Planning Time → Routing logic" above for the per-candidate
  duplication test. Earlier draft of this plan deferred them; user
  direction reverses that and adds them late in the sequence with a
  per-candidate gate.
- **No fixed root-router target size.** Stretching or squashing a
  file's content to hit a number is an anti-pattern. The validation
  gate examines each file in the new tree for size as a *smell* —
  a file disproportionately short for its declared scope is a smell
  that scope was over-claimed or content is missing; a file
  disproportionately long is a smell that it is doing more than one
  job or that universal-rule content leaked in. Outliers (in either
  direction) get audited individually before sign-off.
