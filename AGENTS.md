# Agent Instructions

This file gives repository-specific guidance to AI coding agents working in this project.

Use it as a practical checklist for making changes that stay aligned with the current architecture, documentation, and product stage.

## Development Workflow Source Of Truth

For any repository change beyond a trivial read-only answer, treat
`docs/dev.md` as the development workflow source of truth.

To find the highest-priority next task, start with `docs/backlog.md`. It is the
single priority-ordered list of post-MVP follow-up work across all concern areas,
with links to the detail file for each item.

Before editing, read the relevant `docs/dev.md` sections for:

- local setup and environment assumptions
- validation commands
- Supabase, Deno, Vercel, and Playwright workflow notes
- release and pull request expectations
- troubleshooting for the area being changed

`AGENTS.md` defines agent behavior and decision discipline. `docs/dev.md`
defines the current contributor workflow. Follow both. If they conflict, stop
and report the conflict instead of guessing.

## Purpose

This repository currently contains a prototype-to-MVP attendee quiz experience:

- `apps/web` is the Vite + React frontend
- `apps/web/src/styles.scss` is the SCSS entrypoint, backed by focused partials in `apps/web/src/styles/`
- `shared/game-config.ts` is the shared quiz public entrypoint, backed by focused modules in `shared/game-config/`
- `supabase/functions` contains the trusted backend edge functions
- `supabase/migrations` contains the database schema and RPC logic
- `docs` explains the current system, tooling, and roadmap

Before making major architectural assumptions, read:

- `README.md`
- `docs/architecture.md`
- `docs/dev.md`
- `docs/open-questions.md`

Use `docs/product.md` and `docs/experience.md` as product and UX targets, not as proof that every planned feature already exists.
When the repo leaves a decision unresolved, capture that uncertainty in `docs/open-questions.md` instead of inventing an answer.

## Architecture Guardrails

See [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
for the responsibility split (apps/web, shared/, supabase/), the
no-business-rule-duplication rule, the shared-source-of-truth-for-
quiz-correctness rule, the no-production-fallback-drift rule, and
the full Styling Token Discipline (themable vs structural buckets,
naming, when to add a token vs keep it local). **Mandatory
pre-edit read** for any diff surface intersecting `apps/`,
`shared/`, `supabase/`, or styling. Content moved per the AGENTS.md
restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## Expected Workflow

The lightweight-vs-full-structured-path intro lives in
[`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Lightweight vs full structured" — content moved per the AGENTS.md
restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Planning Depth

See [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Planning Depth," "Plan code minimalism," "Cross-Cutting Invariants
section," and the surrounding cross-level planning rules — content
moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Plan-to-PR Completion Gate

See [`docs/agents/planning/plan-to-pr.md`](/docs/agents/planning/plan-to-pr.md) —
content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Epic Drafting

See [`docs/agents/planning/epic.md`](/docs/agents/planning/epic.md) —
content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Milestone Planning Sessions

See [`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md) —
content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Phase Planning Sessions

See [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md) —
content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Scope Guardrails

Treat broad checklist, cleanup, or refactor requests as a queue of PR-sized tasks, not as permission to work through everything in one thread.

- prefer one checklist item, one feature slice, or one tightly related file family per branch and handoff
- combine multiple items only when they share the same files, the same validation surface, and still produce a small reviewable diff
- if a user asks for many checklist items at once, record or confirm the sequence, then execute only the first bounded slice unless the user explicitly asks only for planning
- if the work grows beyond one clean PR, stop after updating the checklist or plan with smaller follow-up tasks
- stop and report instead of expanding scope when the task starts requiring behavior changes, unrelated production edits, mixed backend/frontend/UI work, or validation outside the originally relevant surface
- prefer a fresh thread or fresh branch for the next checklist item when the previous slice has been committed and handed off

When a prompt identifies a specific checklist item, issue, file family, feature
slice, or validation command, treat that as the active boundary. Do not work on
adjacent cleanup, nearby checklist items, opportunistic dependency upgrades, or
unrelated docs unless they are necessary to keep the requested change correct
and validated.

If the requested task is behavior-preserving, keep it behavior-preserving. Stop
and report instead of proceeding if the implementation appears to require
changing product behavior, public contracts, persistence semantics, authorization
rules, routing, generated artifacts, or unrelated production code.

### Feature-Time Cleanup And Refactor Debt Capture

See [`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Feature-Time Cleanup And Refactor Debt Capture" — content moved per
the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Pre-Edit Gate

Before editing for any non-trivial task:

- make sure the worktree does not contain unrelated uncommitted changes; if it
  does, stop and ask how to proceed
- make sure you are not doing substantial implementation work on `main`; create
  or switch to an appropriately named feature branch first
- read the relevant docs, tests, and neighboring implementation before deciding
  the target shape
- confirm the requested change is expected to be positive value for the codebase:
  it should reduce real risk, duplication, confusion, operational friction, or
  product/user pain enough to justify its diff and review cost
- stop and report instead of editing if the change appears needless, mostly
  cosmetic, or likely to introduce more noise than value
- run the task's specified baseline validation commands before editing when the
  prompt or checklist names them
- if a required baseline validation fails before edits, stop and report the
  failure instead of changing files
- if no baseline command is specified, identify the smallest relevant validation
  surface before editing and run it when practical
- for any change that adds or modifies a backend write reachable from a public
  or origin-gated endpoint, answer before writing code: what prevents a caller
  from writing arbitrary or nonexistent data? Prefer DB-level referential
  integrity and constraints over application-layer validation — the database is
  the authoritative enforcement point and cannot be bypassed by a future code
  path. If no enforcement exists yet, add it in the same change.

### Lightweight Path

See [`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Lightweight Path" — content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Full Structured Path

See [`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Full Structured Path" — content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Review-Fix Rigor

See [`docs/agents/workflows/review-fixes.md`](/docs/agents/workflows/review-fixes.md)
"Review-Fix Rigor" and "GitHub thread state discipline" — content
moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## Execution Rules

The Execution Rules intro and bullets live in
[`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Execution Rules" — content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6. Universal subsections
(Sub-Agent Delegation, Stop-And-Report Conditions) remain inline below
until step 6 promotes them into the root router proper.

### Sub-Agent Delegation

Sub-agents spawned via delegation tools do not inherit this file. They only
know what is explicitly included in their prompt.

When delegating to a sub-agent, choose one of two approaches and apply it
strictly:

**Narrow scope — AGENTS.md is not relevant.**
Keep the sub-agent's task purely mechanical and self-contained: reading files,
searching the codebase, running a specific named command, or implementing a
single isolated pure function. If the task is scoped tightly enough that the
process rules here would not apply to a human doing the same work, no
additional guidance is needed.

**Broader scope — include the relevant rules directly.**
If the sub-agent will edit files, run validation, or make structural decisions,
include the applicable rules from this file verbatim in the prompt. Do not
write "follow AGENTS.md" — the sub-agent cannot read it. Copy the specific
sections that govern the work being delegated.

Workflow gates belong in the orchestrating session, not in sub-agents.
Branch creation, committing, PR creation, doc updates, and self-review are
high-risk steps that require the full process context. Keep these in the main
session. Delegate only the implementation or research slice.

If a delegated task grew beyond its original scope during execution, the
orchestrating session is responsible for catching the drift and applying
the missing gates before treating the work as done.

### Refactor Completion Proof

See [`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Refactor Completion Proof" — content moved per the AGENTS.md
restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Stop-And-Report Conditions

Stop and report instead of continuing when any of these happen:

- the worktree has unrelated uncommitted changes that could be mixed into the
  task
- required baseline validation fails before edits
- the requested change appears needless, mostly cosmetic, or likely to introduce
  more noise than value after reviewing the current code and docs
- the requested bounded task starts expanding into unrelated frontend, backend,
  database, workflow, dependency, or documentation changes
- a behavior-preserving task appears to require behavior changes
- the change would alter public API contracts, status codes, response bodies,
  database schema or semantics, authentication or authorization rules, routing,
  or production platform configuration outside the stated scope
- preserving coverage would require deleting or weakening assertions instead of
  moving, updating, or adding equivalent coverage
- the task becomes larger than one clean reviewable PR
- the target shape cannot be met without a broader design decision

When stopping, leave the worktree clean when practical. If stopping after
partial edits, clearly identify the touched files, what remains incomplete, and
whether any validation was run.

### Debugging Discipline

See [`docs/agents/workflows/debugging.md`](/docs/agents/workflows/debugging.md)
"Debugging Discipline" — content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

### Versioning And Dependency Discipline

See [`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Versioning And Dependency Discipline" — content moved per the
AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## Documentation Expectations

See [`docs/agents/reference/documentation-currency.md`](/docs/agents/reference/documentation-currency.md)
for the full documentation-currency reference: doc-update triggers
for `README.md`, `docs/architecture.md`, `docs/dev.md`,
`docs/open-questions.md`,
`docs/tracking/documentation-quality-checklist.md`, inline comments
and function/type documentation; the status-oriented-section update
rule; the per-phase plan-doc status update rule; and the Doc
Currency PR Gate. Content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## Commit Message Expectations

See [`docs/agents/reference/pr-template.md`](/docs/agents/reference/pr-template.md)
"Commit Message Expectations" — content moved per the AGENTS.md
restructure ([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## Validation Expectations

See [`docs/agents/reference/validation.md`](/docs/agents/reference/validation.md)
for the full validation reference: per-area validation commands
(`npm run lint`, `npm run build:web`, `deno check supabase/...`),
Validation Honesty, Continuous Validation, PR Readiness, Regression
Discipline, and Testing Tiers Discipline. Content moved per the
AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## UI Review Runs

See [`docs/agents/workflows/ui-review.md`](/docs/agents/workflows/ui-review.md)
"UI Review Runs" — content moved per the AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## Pull Request Screenshot Process

See [`docs/agents/workflows/ui-review.md`](/docs/agents/workflows/ui-review.md)
"Pull Request Screenshot Process" — content moved per the AGENTS.md
restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## Self-Review Checklist

The general / refactor / backend-trust / testing-tooling / multi-
commit subsets and the walk-named-audits preamble live in
[`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md)
"Self-Review Checklist." The UI subset lives in
[`docs/agents/workflows/ui-review.md`](/docs/agents/workflows/ui-review.md)
"UI self-review." The walk-the-plan's-Cross-Cutting-Invariants
preamble lives in
[`docs/agents/workflows/plan-implementation.md`](/docs/agents/workflows/plan-implementation.md)
"Read the plan in full before the first edit." Content moved per the
AGENTS.md restructure
([`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md));
this section persists as a pointer until the root file is rewritten
as a router in restructure step 6.

## Anti-Patterns

Avoid these unless the task explicitly requires them:

- large one-shot refactors with no written plan or intermediate checkpoints
- letting tests lag behind renamed, moved, or restructured code
- deferring all validation until the final step of a long change
- undocumented module splits, file moves, or ownership changes
- combining unrelated cleanup with the requested change
- using a final commit to clean up drift that should have been caught in earlier self-review
- treating a prompt as permission to skip the repo workflow
- naming living test or code files after the rollout phase that produced them
  (for example `foo_phase3_bar.test.sql`); name by the feature or surface under
  test so the filename still makes sense after the phase ships, matching the
  `<feature>_<aspect>.test.sql` convention established by
  `event_code_data_model.test.sql` and `redemption_data_model.test.sql`

## Change Boundaries

Prefer targeted fixes over speculative refactors.

Do not introduce new frameworks, new backend services, or broad architecture rewrites unless the task clearly calls for that.

This repository is still in a focused MVP stage. Favor clarity, reliability, and maintainable incremental progress over premature platform expansion.
