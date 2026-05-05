# Agent Instructions

This file is the **router** for AI coding agents working in this repo.
It carries the rules every session needs (pre-edit gate, scope
guardrails, sub-agent delegation, stop-and-report, anti-patterns,
change boundaries), the session-type routing table that names which
files an agent reads for the work at hand, and pointers to the
contributor-workflow source of truth.

Per-session-type playbooks, planning meta-process, and topic-
organized constraint sets live under [`docs/agents/`](/docs/agents/);
see [`docs/agents/README.md`](/docs/agents/README.md) for the
directory map.

## Repo orientation

This repository currently contains a prototype-to-MVP attendee quiz experience:

- [`apps/web`](/apps/web/) is the Vite + React frontend
- [`apps/web/src/styles.scss`](/apps/web/src/styles.scss) is the SCSS entrypoint, backed by focused partials in [`apps/web/src/styles/`](/apps/web/src/styles/)
- [`shared/game-config.ts`](/shared/game-config.ts) is the shared quiz public entrypoint, backed by focused modules in [`shared/game-config/`](/shared/game-config/)
- [`supabase/functions`](/supabase/functions/) contains the trusted backend edge functions
- [`supabase/migrations`](/supabase/migrations/) contains the database schema and RPC logic
- [`docs`](/docs/) explains the current system, tooling, and roadmap

Before making major architectural assumptions, read:

- [`README.md`](/README.md)
- [`docs/architecture.md`](/docs/architecture.md)
- [`docs/dev.md`](/docs/dev.md)
- [`docs/open-questions.md`](/docs/open-questions.md)

Use [`docs/product.md`](/docs/product.md) and [`docs/experience.md`](/docs/experience.md)
as product and UX targets, not as proof that every planned feature already exists.
When the repo leaves a decision unresolved, capture that uncertainty in
[`docs/open-questions.md`](/docs/open-questions.md) instead of inventing an answer.

## Development workflow source of truth

For any repository change beyond a trivial read-only answer, treat
[`docs/dev.md`](/docs/dev.md) as the development workflow source of truth.

To find the highest-priority next task, start with [`docs/backlog.md`](/docs/backlog.md).
It is the single priority-ordered list of post-MVP follow-up work across all
concern areas, with links to the detail file for each item.

Before editing, read the relevant `docs/dev.md` sections for:

- local setup and environment assumptions
- validation commands
- Supabase, Deno, Vercel, and Playwright workflow notes
- release and pull request expectations
- troubleshooting for the area being changed

`AGENTS.md` defines agent behavior and decision discipline. `docs/dev.md`
defines the current contributor workflow. Follow both. If they conflict, stop
and report the conflict instead of guessing.

## Session-type routing

Pick the row that best fits the work at hand and read the named files.
Universal rules below apply to every session and are not enumerated in
the table.

| If your session is… | Read these files |
|---|---|
| Implementation work (lightweight or full structured path), no plan doc to consume | [`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md) |
| Implementing a documented plan from [`docs/plans/`](/docs/plans/) | [`docs/agents/workflows/implementation.md`](/docs/agents/workflows/implementation.md) + [`docs/agents/workflows/plan-implementation.md`](/docs/agents/workflows/plan-implementation.md) + the plan's own `Cross-Cutting Invariants` and `Self-Review Audits` |
| Drafting an epic | [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md) + [`docs/agents/planning/epic.md`](/docs/agents/planning/epic.md) |
| Drafting a milestone doc (sequencing, cross-phase invariants, cross-phase decisions) | [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md) + [`docs/agents/planning/milestone.md`](/docs/agents/planning/milestone.md) |
| Drafting a phase scoping doc or phase plan doc | [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md) + [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md) + [`docs/agents/planning/plan-to-pr.md`](/docs/agents/planning/plan-to-pr.md) |
| Plan-to-Landed close-out PR (Status flip after post-release validation) | [`docs/agents/planning/plan-to-pr.md`](/docs/agents/planning/plan-to-pr.md) |
| Addressing PR review feedback | [`docs/agents/workflows/review-fixes.md`](/docs/agents/workflows/review-fixes.md) |
| Capturing UI screenshots / building PR screenshot evidence | [`docs/agents/workflows/ui-review.md`](/docs/agents/workflows/ui-review.md) |
| Debugging a failing validation, CI run, or local test | [`docs/agents/workflows/debugging.md`](/docs/agents/workflows/debugging.md) |

Reference files under [`docs/agents/reference/`](/docs/agents/reference/)
are topic-organized **constraint sets** (not optional lookups) that
workflow files route to at the appropriate session moment (pre-edit
gate, mid-session, per-commit, PR open). The workflow file you load
above names the trigger. The "Mandatory pre-edit reads" section below
calls out the constraint that fires before any other workflow step.

## Mandatory pre-edit reads

[`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
is a **mandatory pre-edit read** for any session whose diff surface
intersects:

- [`apps/web/`](/apps/web/), [`apps/site/`](/apps/site/),
  [`shared/`](/shared/), [`supabase/`](/supabase/) — the
  responsibility-split rules and the no-business-rule-duplication /
  shared-source-of-truth-for-quiz-correctness / no-production-fallback
  constraints
- styling surfaces — [`apps/web/src/styles.scss`](/apps/web/src/styles.scss),
  [`apps/web/src/styles/`](/apps/web/src/styles/),
  [`shared/styles/`](/shared/styles/), or any SCSS / CSS custom
  property definition site — the Styling Token Discipline rules

Read end-to-end before the first edit. The file lives under
`reference/` because that is where topic-organized constraint sets
live; it is not an optional lookup.

## Pre-Edit Gate

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

## Scope Guardrails

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

## Sub-Agent Delegation

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

## Stop-And-Report Conditions

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
