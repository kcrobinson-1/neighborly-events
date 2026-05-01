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

Respect the current split of responsibilities:

- Put visual and interaction changes in `apps/web/src`
- Keep shared styling tokens, mixins, and page/component styles in `apps/web/src/styles.scss` and `apps/web/src/styles/`
- Put quiz definitions, catalog, validation, and scoring changes in `shared/game-config.ts` and `shared/game-config/`
- Put trust, session, persistence, and entitlement logic in `supabase/functions` and `supabase/migrations`

Do not casually duplicate business rules across frontend and backend.

If quiz correctness, scoring, or answer validation changes, make sure the shared source of truth still drives both the UI and the backend completion path.

Do not treat the local browser-only completion fallback as production backend behavior.
Do not default to the local browser-only completion fallback when a remote Supabase integration run is feasible.

### Styling Token Discipline

Every styling token belongs to one of two buckets: **per-event brand
themable** (CSS custom property; overridable by a per-event `Theme`)
or **platform-shared structural** (SCSS variable; constant across
events). [`docs/styling.md`](/docs/styling.md) is the binding
classification — use it before adding or moving a token.

- **Themable.** Brand bases, brand-tied gradient stops and admin
  surfaces, brand typography, themable radii, and the brand-tied
  derived shades that follow them. Defined as CSS custom properties
  in `apps/web/src/styles/_tokens.scss`'s `:root` block (apps/web
  defaults), in `shared/styles/themes/platform.ts` (Sage Civic
  defaults consumed by apps/site's root layout), and overridable
  per-event via `<ThemeScope theme={…}>`. Consumed in SCSS as
  `var(--…)`. Brand-tied derived shades (`--primary-surface`,
  `--secondary-focus`, etc.) are computed in `:root` via
  `color-mix()` from the brand bases — they are not Theme fields and
  per-event themes do not override them directly; see `docs/styling.md`.
- **Structural.** Status palette (`$color-success`, `$color-status-*`),
  neutral drop-shadow color, modal scrim, spacing scale, font
  weights, control sizes, motion timing, focus-ring metrics, pill
  radius, and composite shadow / focus recipes that combine
  structural metrics with themable color slots via `var(--…)`.
  Defined as `$…` SCSS variables in `apps/web/src/styles/_tokens.scss`.
  Consumed in SCSS as `$…`.

When you add or move a token:

- decide its bucket against the binding classification in
  `docs/styling.md`; classifying a token wrong silently weakens the
  brand-only skin model (themable status) or pulls platform contracts
  into the per-event surface (structural brand bases)
- add a new semantic token when a value is repeated, represents a
  reusable surface, state, interaction, or layout role, or should
  change consistently across multiple components
- name tokens by UI role or intent, such as `--primary-surface` or
  `$space-7`, rather than by vague appearance names; themable
  tokens use the flat `--token-name` convention (no `--theme-`
  prefix), structural tokens use `$token-name`
- keep one-off layout values local when a token would add indirection
  without improving readability or future change cost
- do not introduce broad token rewrites inside unrelated feature
  work; add a bounded checklist item when token cleanup is useful
  but not required for the feature
- for behavior-preserving token refactors, compare compiled CSS
  before and after when practical, in addition to running
  `npm run build:web`

## Expected Workflow

Work should follow the repo process even when the prompt only describes the end state.

Use the lightweight path only when the change is small and low-risk, for example:

- a single-file fix
- a narrow copy or style adjustment
- a small test update that does not change structure

Use the full structured path when the change is multi-file, architectural, refactor-heavy, or changes tests, validation, documentation, or workflow.

### Planning Depth

When asked to make a plan, do not compress the workflow to an arbitrary short
step count.

- include every execution gate that materially affects quality, even if that
  makes the plan longer than five steps
- keep baseline validation, branch hygiene, implementation, automated
  code-review feedback, documentation cleanup, final validation, and PR
  preparation as separate steps when they are all relevant
- for implementation plans, include an explicit documentation-current-state gate:
  identify which docs with status-oriented sections (for example `Current
  State`, `Current status`, rollout status, or phase status) are affected, and
  include updating them as a required step before handoff
- do not merge steps just to keep the plan visually compact
- if a new required step is added, insert it at the correct point in the
  sequence without weakening or collapsing the surrounding steps
- for implementation plans, make the plan decision-complete enough that another
  engineer or agent can execute it without inventing missing gates, validation,
  or handoff work
- for PR-sized work, name the intended commit boundaries before editing when
  practical, and keep review-fix commits distinct when they clarify the history
- name the self-review audits that apply to this PR's diff surfaces, drawn
  from [`docs/self-review-catalog.md`](/docs/self-review-catalog.md). The
  plan should list audit names by surface (SQL / frontend / CI / runbook)
  so the implementer runs them at commit boundaries rather than
  rediscovering review feedback at PR-review time
- keep plans at the level of contracts and prose, not implementation
  detail. One-line function signatures, short type declarations, and
  short file-path references are fine; full function bodies, multi-line
  shell pipelines, SCSS rule bodies, or any code block longer than
  roughly five lines is implementation that belongs in the PR, not the
  plan. Plans attract code review; every bug in a code snippet inside a
  plan costs a review round on the plan doc itself before the
  implementation even starts, which is pure churn
- **Code shapes in plans are directional pseudocode.** Whatever code-
  shaped content the five-line rule above admits — a backticked
  field-value pair, a one-line type signature, a short expression — is
  *shape*, not source. It communicates contract structure (what field
  exists where, what shape it takes, how it relates to other fields),
  not exact syntax. The implementer translates shapes into
  syntactically-correct code at PR time, against the surrounding prose
  that frames the shape. Agents reviewing a plan-doc PR (Claude,
  Codex, similar bots, human reviewers) apply this stance directly
  from this rule: focus on shape-level questions — is the right field
  named? does the shape match what the prose around it describes? is
  the contract self-consistent? — not on syntax-level findings
  (template-literal quotes, shell precedence, missing imports,
  semicolons). The five-line rule caps how much code-shaped content
  lives here even under this framing; this rule shifts the reviewer's
  stance on whatever content the cap admits.
- list the cross-cutting invariants that thread through multiple files
  in their own `## Cross-Cutting Invariants` subsection, distinct from
  per-file contracts. Per-file contracts describe what one module does;
  cross-cutting invariants describe relationships that must hold
  simultaneously at every call site and break silently when one site
  drifts (examples: "a shared reference clock advances on every
  user action that changes filtered output," "every dialog exposes
  an accessible name via `aria-label` or `aria-labelledby`," "derived
  state for modal return-focus must survive the close transition,
  not null out with the trigger state"). Aim for 2–4 one-line
  invariants. Without naming these, implementer self-review checks
  each file in isolation and misses bugs that only appear when two
  sites disagree about the same rule; reviewer rounds then rediscover
  the gap one call site at a time. The plan's job is to name the rule
  once so self-review can walk every site against it
- when a reviewer comment targets a code snippet inside a plan, the
  correction is to **remove or summarize the snippet**, not to fix the
  code in place. Code-correctness iteration belongs in the PR that
  implements the plan. Exception: if the comment surfaces a genuine
  design flaw whose phrasing happens to be code (e.g. an ordering
  race, an invariant violation), fix the *prose contract* in the plan
  and move the code to the implementation PR — don't fix both in the
  plan

### Plan-to-PR Completion Gate

A PR that implements a plan must leave the plan in a terminal state.
"Most of the plan" is not "the plan." A plan doc that still says
`Proposed` or `In progress` after its implementation merges is drift,
and drift compounds into follow-up PRs that re-review the same
decisions.

- before opening the PR, walk every Goal, Test, Validation step, and
  Self-Review audit named in the plan; for each one confirm it is
  either satisfied in the PR or explicitly deferred **in the plan
  itself** with written rationale. Deferrals live in the plan, not in
  the PR body, not in an issue, not as an unwritten promise
- flip the plan's Status line from `Proposed` / `In progress` to
  `Landed` in the same PR that implements it. Do not record commit
  SHAs in the Status block — `git log` and `git blame` are
  authoritative for navigating from plan to history, and recording
  SHAs creates a chicken-and-egg problem (the SHA isn't known until
  after merge, which forces a follow-up commit whose only purpose is
  to record the previous commit's SHA). Same-PR flip is the default
  whenever the plan's Validation Gate can be fully satisfied pre-merge.
  Exception: plans whose Validation Gate names a check that can only
  run post-release (Tier 5 production smoke is the canonical case)
  land in two phases per [`docs/testing-tiers.md`](/docs/testing-tiers.md)
  "Plan-to-Landed Gate For Plans With Post-Release Validation" — the
  implementing PR merges with Status `In progress pending <validation-name>`,
  where the name is a stable, exact-match label for the specific check
  (the canonical Tier 5 case is exactly `In progress pending prod smoke`;
  see testing-tiers.md for non-smoke precedents); a follow-up doc-only
  commit flips Status to `Landed` and records the post-release
  validation run URL once the post-release run passes. The run URL is
  durable external evidence, unlike a commit SHA which is already in
  git. This is the single authoritative status rule for that case; do
  not invent additional states or leave the flip to an informal
  post-merge promise
- ban soft-commitment words in plans: "optional but recommended,"
  "consider adding," "nice to have," "probably should." A requirement
  is either in-scope or deferred — there is no third option. Soft
  commitments silently relax under review pressure and reappear as
  reviewer findings after merge
- if a reviewer flags a gap that should have been named at plan time,
  fix the plan first (tighten the requirement or defer with rationale),
  then address the gap. Do not carry the gap as a post-merge follow-up
  without updating the plan
- if a plan requirement cannot be fully satisfied in the intended PR,
  split the plan along a phase boundary before merging partial work so
  each phase's Status can flip independently, rather than merging a
  partially-satisfied plan and tracking the remainder informally
- **Call out estimate deviations in the PR body, and update the
  plan to match what shipped.** When implementation diverges from
  an estimate-shaped section of the plan ("Files intentionally not
  touched" ended up touched, "Files to touch — new" missed a file,
  contract bullets gained a requirement, intended commit boundaries
  reshuffled, an execution step was unnecessary or had to be
  split), two things must happen in the same PR:
  - The **PR body** names the deviation explicitly under a
    `## Estimate Deviations` heading inserted immediately after
    `## Documentation` (or `N/A` if no deviations). Each entry is
    one or two sentences naming the estimative section, the
    actual outcome, and why the call was the right one — enough
    that a reviewer can audit the deviation without reading the
    diff cold. This is the rationale and audit trail.
  - The **plan doc** is updated so its estimate-shaped sections
    describe what actually shipped, not the pre-implementation
    guess. Walk every estimate-shaped section ("Files to touch —
    new / modify / intentionally not touched," per-module
    Contracts, Execution steps, Commit boundaries) and reconcile
    each against the merged diff. A plan that says "Files
    intentionally not touched: X" after we shipped an X edit is
    the same shape of drift the Status-flip rule already forbids
    — the plan must describe the implemented system, not the
    pre-implementation guess. The PR body says *why we deviated*;
    the plan says *what shipped*.
  Distinct from the rule-deviation path above: rule deviations
  (a Cross-Cutting Invariant turning out to be wrong, a contract
  that can't be satisfied, a Validation Gate command that doesn't
  exercise what it claims) require the plan rule itself to be
  rewritten in the same PR; estimate deviations require the
  estimate-shaped section to be updated to match reality, plus
  the PR-body callout. Pre-existing PR templates do not need the
  Estimate Deviations heading until they are next edited; PRs
  opened from this point forward must include the section, and
  plan-implementing PRs must reconcile the plan with what shipped
  per the bullet above

### Epic Drafting

Epics scope the *what* and *why* of a multi-milestone arc:
capability targets, cross-cutting invariants, milestone
sequencing rationale, milestone-level risks, and the open
questions the epic resolves or opens. Epics should *not*
prescribe per-milestone phase counts, per-phase content,
per-phase PR counts, validation-gate specifics, documentation
lists, or self-review audit sets. Those details belong to the
milestone planning session for each milestone, against
actually-merged code at milestone-start.

When an epic does name per-milestone details (during initial
epic drafting, before the milestone planning sessions have run),
tag them explicitly as estimates pending milestone planning, not
as binding specs. Sizing summaries in epics carry the same
caveat: per-milestone phase and PR counts are early estimates,
not commitments.

The milestone planning session re-derives the actual phase
shape and the milestone doc supersedes the epic's estimates.
The milestone doc PR also reconciles the epic's prescriptive
paragraphs — either rewriting them to match the milestone-doc
shape, or marking them as pre-milestone-planning estimates and
pointing to the milestone doc as canonical. Pre-existing epics
written before this rule are not retroactively non-conforming;
the rule applies to epic drafting and to milestone planning
PRs from this point forward.

### Milestone Planning Sessions

A milestone planning session establishes durable cross-phase
coordination for a multi-phase milestone (M2, M3, M4 in the Event
Platform Epic). Run this session once at the start of a milestone,
before any per-phase planning.

- **Goal.** Produce the milestone doc
  (`docs/plans/m<N>-<short-slug>.md`): restated milestone goal, phase
  sequencing with dependency rationale, cross-phase invariants that
  thread multiple phases, cross-phase decisions that lock contracts
  between phases, milestone-level risks, doc-currency map across the
  milestone set
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
  between the scoping doc and the plan doc per "Phase Planning
  Sessions → Scoping owns / plan owns" below) belong to the
  phase planning session for each phase, against actually-merged
  earlier phases. Scoping any phase in the milestone session —
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
  session re-derives the actual PR count using the rule below;
  splitting a phase into sub-phases at plan time is normal, not a
  process failure

### Phase Planning Sessions

A phase planning session produces the per-phase plan that an
implementing PR consumes. Run this session just-in-time before a
phase's implementation starts, **after** prior phases have shipped
(not in batch alongside their planning).

- **Goal.** Produce two artifacts that split ownership cleanly
  rather than co-cover the same content: a phase scoping doc
  (`docs/plans/scoping/m<N>-phase-<X>-<Y>.md`, transient — deletes
  in batch with sibling scoping docs at the milestone-terminal PR)
  and a phase plan doc
  (`docs/plans/m<N>-phase-<X>-<Y>-plan.md`, durable — survives
  the feature). The next bullet specifies what each owns; both
  docs may carry a Status block and a one-paragraph phase summary
  for orientation, and that is the only intentional overlap.
- **Scoping owns / plan owns.** Because scoping deletes at
  milestone-terminal PR, the durable plan must end up with
  everything worth persisting in record after the feature
  launches; restating the same content in scoping during the
  scoping doc's lifetime burns drafting time and creates drift
  risk every time one side updates without the other.
  - **Scoping owns** the deliberation prose with rejected
    alternatives (the "Decisions made at scoping time" section,
    each decision carrying `Verified by:` code citations), the
    open decisions to make at plan-drafting (handoff), the
    plan-structure handoff, and the reality-check inputs the
    plan must verify (handoff). This content has no audience
    after the plan lands — exactly why it lives somewhere
    transient.
  - **Plan owns** Status (Proposed → Landed lifecycle), Context
    preamble (per the rule below), Goal, Cross-Cutting
    Invariants, Naming, Contracts (full final shape), Files to
    touch (new / modify / intentionally not touched), Execution
    Steps, Commit Boundaries, Validation Gate, Self-Review
    Audits, Documentation Currency PR Gate, Out Of Scope (final,
    not deliberation), Risk Register, and Backlog Impact.
  - **Scoping does not restate plan-owned content.** Where a
    scoping decision touches the file inventory, a contract, an
    invariant, a validation procedure, or a risk, scoping
    references the plan's section by name ("the `EventContent`
    type defined in the plan…"); it does not duplicate the
    artifact. The reality-check gate (named below) operates on
    scoping's decisions — load-bearing technical claims that
    reality-check verifies — not on duplicated contract text.
  - Recurring trap from M3 phase 3.1's first drafts: scoping +
    plan together ran ~4,300 lines because both docs carried the
    full file inventory, full Contracts, full Cross-Cutting
    Invariants, full Risk Register, and (in 3.1.2) full
    Self-Review Audits — roughly 60% duplication for the same
    coverage, with drift risk every time one side updated
    without the other. Existing landed phase plans (M2 phases
    2.1 through 2.5, M3 phase 3.1.1) predate this rule and are
    not retroactively non-conforming. Live phase docs
    mid-flight when this rule lands (M3 phase 3.1.2 is the
    in-flight case at land time) are not retroactively
    non-conforming either; the rule applies to phase planning
    sessions opened from this point forward, though authors of
    mid-flight scoping docs may opt to trim duplicated content
    into "see the plan" references if the scoping has not yet
    been promoted to a merged implementing PR
- **Scoping precedes plan drafting; check before starting plan
  draft.** Before opening the plan doc to write, verify the
  scoping doc exists at
  `docs/plans/scoping/m<N>-phase-<X>-<Y>.md` with substantive
  scoping-owned content per the rule above — at minimum, a
  "Decisions made at scoping time" section with at least one
  decision carrying a `Verified by:` code citation, plus
  whichever of "Open decisions to make at plan-drafting,"
  "Plan structure handoff," and "Reality-check inputs" the
  phase needs. Not empty, not a stub, not a placeholder
  paragraph saying "scoping pending." If the scoping doc does
  not exist or is a stub, do scoping first as its own artifact;
  plan-drafting cannot start without it. Without scoping
  content, the reality-check gate below has nothing to operate
  on, and plan-drafting silently collapses into
  scoping-during-drafting — exactly what scoping exists to
  separate from drafting. The substantive-content list named
  here is the falsifier for that gate; it intentionally tracks
  scoping's owned content per "Scoping owns / plan owns"
  above, not the plan-owned content (file inventory, contracts,
  validation surface, risks) that earlier drafts of this rule
  asked scoping to also carry. The check is a simple
  file-existence + first-paragraph read, takes seconds, and
  protects against the most common procedural skip when phase
  planning starts in a fresh agent session that did not produce
  the scoping doc
- **Plan opens with a plain-language context preamble.** Before any
  implementation specifics (file paths, framework names, function
  signatures, phase-numbering shorthand), the plan must contain
  1–3 paragraphs that name three things in plain English: **what
  this phase is** (the surface or capability under change, not the
  file paths), **why it's being done now** in human terms ("closes
  the loose end of apps/web still owning non-event-scoped URLs
  after 2.3 landed," "lays the foundation for organizer self-serve
  work in a future phase"), and **what surfaces this touches** at
  the conceptual level (admin pages, routing layer, e2e fixtures,
  docs — not file paths). Phase-numbering prose ("depends on 2.2 +
  2.3," "prerequisite for 2.5") describes the dependency graph,
  not the motivation, and does not satisfy "why now." The preamble
  can live at the top of `## Goal` or in a separate `## Context`
  section before Goal; structure is implementer choice. The
  protective check this rule enforces: a reader who hasn't read
  the epic, milestone, or scoping doc can understand what problem
  this phase solves and why anyone should care after reading the
  plan's first ~250 words. Implementation-detail-first openings
  are the recurring trap that motivates this rule — M2 phase 2.4's
  first draft opened with "Migrate /admin from apps/web (Vite/React)
  to apps/site (Next.js 16 App Router) as the root-admin platform
  surface," which is true, complete, mechanical, and silent on why
  anyone other than the plan author should care. Existing landed
  plans (M2 phases 2.1, 2.2, 2.3) predate this rule and are not
  retroactively non-conforming; the rule applies to plans drafted
  from this point forward
- **Reality-check gate between scoping and plan.** Before promoting
  the scoping doc to plan-drafting, do a forced reality-check pass on
  every load-bearing technical claim. For SQL contracts: read the
  actual migration files for named tables, policies, RPCs; confirm
  the predicates, grants, and constraints exist as scoped. For RPC
  behavior claims: read the function body — if the scoping says
  "widen the X gate," confirm the gate exists. For PostgreSQL
  semantics claims: write one sentence that would falsify the claim
  and check whether it falsifies (recurring trap: PostgreSQL applies
  SELECT during UPDATE/DELETE, so write policies don't fire if the
  row isn't SELECT-visible). For TypeScript / Edge Function
  contracts: read the function signature and at least one real call
  site. For *validation-procedure* claims ("`vercel dev` will
  validate X," "the existing fixture covers Y," "`npm test` will
  catch Z"), trace whether the procedure actually exercises the
  surface it claims. For dev-tool semantics specifically (Vercel
  CLI, Next.js dev server, Vite, Playwright), read the project's
  actual config (`vercel.json`, `next.config.ts`, `vite.config.ts`)
  before claiming runtime behavior — these tools are
  config-dependent and general knowledge will not catch
  project-specific overrides. Recurring trap: `apps/web/vercel.json`
  destinations are absolute production URLs, so `vercel dev`
  proxies to deployed apps/site rather than the branch's local
  Next.js dev server; "vercel dev validates the new local routes"
  was a wrong claim because the config's absolute destinations were
  never checked. If the reality-check finds a discrepancy, fix the
  scoping before drafting the plan; do not carry wrong premises
  into plan time
- **When a URL retarget changes which component renders, re-audit
  every assertion the test makes after the retarget — not just URL
  strings.** A test's locator inventory before and after a URL
  change can differ even when the URL is the only line edited. A
  test that called `getByRole("button", { name: "Foo" })` on the
  old URL's component may find a different component (with no
  "Foo" button) on the new URL. Locator-stability invariants on
  the *new* page (e.g., the apps/site `/admin` event-list surface
  in M2 phase 2.4.2) cover what that page must preserve; the
  per-phase plan must additionally walk the test against the *new*
  component reached at every navigation step in the test, not just
  the entrypoint. Cite the target component file for each
  navigation step the test takes, and verify the assertions
  resolve against that component's actual markup. Recurring trap:
  M2 phase 2.4.2's plan listed `Back to all events` in its
  stability set, but after `Open workspace`'s URL retargeted from
  `/admin/events/:eventId` (legacy `AdminEventWorkspace`) to
  `/event/:slug/admin` (deep-editor `EventAdminWorkspace`), the
  test reached a different component with no `Back to all events`
  button — surfaced as a mid-validation Playwright timeout, not at
  plan time. The plan's "every other assertion stays unchanged"
  claim was wrong because it audited the entrypoint surface only,
  not the post-navigation surface
- **Prefer existing wrapper scripts over lower-level CLI invocations
  in plan validation steps.** Before naming a validation command in
  a plan, search `package.json` `scripts` and `scripts/testing/` for
  an existing wrapper. If a wrapper exists, name it — the wrapper is
  what future contributors will run, and naming the lower-level
  invocation silently skips meaningful orchestration the wrapper
  does (local Docker Supabase stack, DB reset, function runtime,
  env-var sourcing, fixture seeding). The lower-level command
  usually still works, but it forces the implementer to reinvent
  setup the wrapper already handles, which is a parallel-track
  procedure rather than the project's canonical local path. This
  rule is distinct from the reality-check gate above: that one asks
  "does the named procedure exercise the right surface;" this one
  asks "is the named procedure the canonical entry point, or am I
  reinventing orchestration the project already wrapped." Recurring
  trap: M2 phase 2.4.2's plan named
  `npx playwright test --config playwright.admin.config.ts` for the
  local auth e2e exercise, missing the canonical
  `npm run test:e2e:admin` wrapper that provisions a local Supabase
  Docker stack and forwards `SERVICE_ROLE_KEY` from it
  automatically. The lower-level command worked, but it forced the
  implementer to source a production service-role key into a tmp
  file as a workaround — exactly the kind of operational drift the
  wrapper exists to prevent
- **Spike before plan for novel mechanisms.** When the phase
  introduces a new mechanism (a new authorization shape, a new
  cross-app boundary, a new SECURITY DEFINER pattern, a new
  framework idiom), build a 30-minute throwaway spike that exercises
  the mechanism end-to-end before writing the plan. The spike's job
  is to find dealbreakers — wrong assumptions about runtime
  semantics, missing constraints, hidden coupling. **Worktree
  handling for spikes** (resolves the conflict with the Pre-Edit
  Gate's clean-worktree rule): create a throwaway branch named
  `spike/<phase-or-mechanism>` off the planning branch; commit
  freely on the spike branch; do not merge it. When the spike
  concludes, either delete the branch (`git branch -D spike/...`)
  or leave it dangling for reference and continue plan-drafting on
  the original branch with a clean worktree. Spike code is never
  promoted into the implementation PR — the plan describes the
  contract, the implementation PR builds it from scratch. If a
  scratch script or non-code artifact would help, write it under
  `tmp/spikes/<phase>/` (already git-ignored under `tmp/`)
- **PR-count predictions need a branch test.** Before declaring "1
  PR" in the plan's Status block, create the branch and sketch the
  file list. If the diff would touch >5 distinct subsystems or >300
  LOC of substantive logic, split. Either ship as sub-phases
  (`m<N>-phase-<X>-<Y>-<Z>-plan.md`) or justify the size with
  concrete review-coherence reasoning. The milestone doc's PR-count
  estimate does not bind the phase plan
- **Plan content is a mix of rules and estimates — label which is
  which.** A plan doc carries two kinds of content: **rules** that
  bind the implementation (Cross-Cutting Invariants, Contracts,
  Validation Gate, Self-Review Audits, Out Of Scope deferrals) and
  **estimates** of what the implementation will look like (file
  inventory under "Files to touch — new / modify / intentionally
  not touched," step counts, commit boundaries, sometimes
  per-section LOC predictions). Estimates are the planner's best
  guess at plan time about scope shape; reality during
  implementation may surface that an estimate was wrong without
  any rule being wrong. Plan authors **must** structure the doc
  so the distinction is visible to both human reviewers and
  implementing agents:
  - Sections that bind (Cross-Cutting Invariants, Contracts,
    Validation Gate, Goal, Self-Review Audits, Risk Register
    mitigations, Out Of Scope) are rule-shaped by section name and
    don't need extra labeling.
  - Sections that estimate ("Files to touch — new," "Files to
    touch — modify," "Files intentionally not touched," "Execution
    steps" sequencing, "Commit boundaries") **must** carry a one-
    line preface naming them as estimates of the expected shape,
    explicitly admitting that implementation may revise them when
    a structural call requires deviating. The list `Files
    intentionally not touched` is the recurring trap — its name
    reads as a hard prohibition but the underlying claim is
    "we don't expect to need to touch these," not "implementation
    must not touch these." Same for "intended commit boundaries":
    the planner's split is an estimate of cohesive review chunks;
    the implementer can refine.
  - Implementers reading a plan: distinguish before deviating.
    Deviating from a rule means the rule is wrong and the plan
    needs to be revised in this PR before the deviation lands;
    deviating from an estimate is normal and is handled via the
    "Estimate Deviations" callout in the PR body (see
    Plan-to-PR Completion Gate). When the call is unclear, ask.
  - Recurring trap (M3 phase 3.1.2 implementation, 2026-05-01):
    implementer initially read "Files intentionally not touched:
    section components" as a hard ban and inlined a duplicated
    25-line date formatter inside the new OG image helper rather
    than extract it from `EventHeader.tsx` into a shared util
    consumed by both. User correction landed mid-implementation;
    the formatter was extracted in a follow-up commit. Pre-existing
    plans drafted before this rule are not retroactively non-
    conforming; plans drafted from this point forward must label
    their estimative sections per the bullet above
- **"Verified by:" annotations on technical claims.** Load-bearing
  technical claims in the plan **must** carry an inline "Verified
  by:" reference to the code citation that proves them — file path
  and line number, not "per scoping doc" or "per epic." Claims that
  cannot carry a verification reference are re-phrased as assumptions
  (clearly tagged as such) or removed. This is not formatting
  preference — it is the protective check this section exists to
  enforce, so the reality-check gate above does not get rolled back
  during plan-drafting
- **Quote labels whose enforcement depends on exact-match
  matching, with line citations.** When a plan references a label
  whose value is checked or queried by exact-string match (Status
  strings used for plan-state tracking, branch naming conventions
  automation watches for, exact phrases a rule forbids paraphrasing
  of), copy-paste from the source with a `path:line` citation
  rather than retyping. Paraphrasing silently weakens rules whose
  enforcement value depends on the exact string. Recurring trap:
  [`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
  Gate" requires Status `In progress pending prod smoke` and
  explicitly forbids paraphrase ("this exact string, not `Landed`
  and not a paraphrase"); plan authors retyping have produced
  descriptive variants that break the rule's queryability
  invariant. Ordinary identifiers (env-var names, file paths,
  function names, fixture names) do not need this treatment —
  code blocks and adjacent file references already carry the
  spelling, and citing every identifier adds noise without
  protective value. Citation is required only when the plan claims
  something specific about an identifier's wording, when the plan
  is the artifact introducing it, or when downstream automation or
  status tracking depends on its exact spelling. Apply the same
  exact-match discipline to trigger clauses: when citing a rule's
  trigger ("the trigger that catches this plan"), read every
  clause and quote the one that catches your case, not the first
  one that looks relevant
- **Falsifiability check on each load-bearing claim (exercise,
  not always recorded).** For every claim the plan presents as
  load-bearing pre-merge proof ("step N validates Z," "fixture X
  covers Y," "passing `build:web` confirms Q"), walk through the
  falsifier in your head: what observation would prove the claim
  wrong, and could the named procedure surface that observation?
  If the exercise reveals the validation is ambiguous (multiple
  causes produce the same observation, the named procedure cannot
  distinguish them), tighten the procedure and record the
  tightened version with its discriminator. If the falsifier is
  obvious and the procedure clearly catches it, the exercise is
  its own reward — no recording needed; most validation bullets
  fall in this category. Recurring trap that *should* have been
  caught and recorded: "`/auth/callback` returning 404 from
  `vercel dev` proves the new proxy rule fires" had no
  discriminating falsifier — every other failure mode (rule
  missing, malformed rewrite, local-no-match) also produces 404,
  so the test could not distinguish the desired signal from the
  failures it was meant to catch. The fix was an identity-
  fingerprint procedure that captures positive + negative response
  signatures and asserts against both. The load-bearing case is
  exactly when the exercise changes the procedure
- **Bans on surface require rendering the consequence.** When a
  plan writes "no X" / "minimum surface" / "intentionally not
  done" for a user-visible or operationally-important surface,
  state in concrete terms what the absence looks like. For UX
  surfaces, render it: run the dev server and look at the page
  before declaring minimum sufficient. Optimizing for diff size
  produces plans that ship regressed UX. Recurring trap: M2 phase
  2.3 first drafted "no SCSS, no module CSS" for the new apps/site
  landing without checking that
  [`apps/site/app/globals.css`](/apps/site/app/globals.css)
  provided no button styling — the public-facing CTA would have
  rendered as a default-browser link. The discipline is not
  "always add CSS" but "before banning the surface, prove the no-X
  outcome is acceptable by looking at it"

  For routing/proxy/CDN config changes specifically, run the
  consequence check against a *production build* of the
  destination app, not its dev server: `next build && next start`
  at the destination, `vercel dev` (or equivalent edge emulator)
  at the source app proxying at it. Dev servers self-serve their
  own asset paths (`/_next/*` for Next, `/@vite/*` for Vite,
  etc.), which hides cross-project gaps the production proxy
  exposes — dev returns the asset, production 404s. Recurring
  trap: M2 phase 2.3's `apps/web/vercel.json` migrated
  `/auth/callback` and `/` to apps/site; the plan's local check
  ran `npm run dev:site` and never exercised the apps/web proxy
  against a production-built apps/site, so the missing
  `/_next/:path*` proxy rule stayed invisible until Codex review
  caught it pre-merge. Hydration on the `'use client'` callback
  route would have broken in production.
- **Cross-app destinations need hard navigation, not client-side
  navigation.** Client-side navigation APIs (also called soft
  navigation: `useRouter().replace(href)` / `router.push` from
  `next/navigation`, `<Link href>` components,
  `history.pushState` / `replaceState`, react-router's
  `navigate(path)`) update the URL in the browser without
  triggering a full document load, so the upstream routing layer
  (Vercel rewrites, CDN, ingress proxy) never re-evaluates.
  That's correct for in-app destinations and broken for
  destinations served by a *different* app behind a same-origin
  proxy rule — the SPA stays on itself, the proxy never fires,
  and the user lands on a 404 or a stale page. Cross-app
  destinations need hard navigation
  (`window.location.replace` / `assign`) that exits the SPA and
  re-enters the routing layer. The same trap shows up in reverse
  when a route migrates *out* of an SPA: existing client-side
  navigation tooling that still produces the migrated URL (button
  handlers, `<Link>`s, `pushState` callers) must be audited and
  converted to hard navigation; the URL is generated correctly
  but the SPA never leaves itself, so the proxy never fires. When
  a plan specifies any of these APIs as a contract, walk every
  destination and classify in-app vs. cross-app. Recurring traps
  from M2 phase 2.3: the plan contract specified
  `useRouter().replace(path)` for the apps/site `/auth/callback`
  page, but the `next=/admin` destination is owned by apps/web —
  implementer corrected to `window.location.replace(path)` so the
  apps/web Vercel rewrite layer fires. Same class: apps/web's
  `usePathnameNavigation` used `history.pushState` for
  `routes.home`, which kept users in the SPA after `/` migrated
  to apps/site; implementer added a hard-navigation seam scoped
  to `routes.home`.
- **Cap.** ~90 minutes for scope + plan combined for a typical
  phase. If you're at 3+ hours and still drafting, diminishing
  returns have hit — stop, reality-check the actual scope size, and
  either ship what's clearly right or escalate
- **Cross-phase coordination is thin.** When this phase's plan needs
  something from a sibling phase that hasn't shipped yet, write down
  the assumption and tag it for verification at sibling-merge time.
  Don't wait for the sibling phase to catch up; don't pre-coordinate
  every detail. Recording assumptions to verify-on-merge is more
  honest than committing to a contract neither side has built yet
- **Anti-pattern: planning artifacts that only cite each other.** If
  the plan, scoping doc, and milestone doc all cite each other for
  the same technical claim, the claim is unverified. Fluent
  cross-doc citation is not verification. Each load-bearing claim
  needs at least one citation to actual code, generated test
  output, or already-merged sibling artifact

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

Feature work should leave the touched code coherent, but it should not expand
into opportunistic refactors that are not required for the feature.

During implementation:

- prefer small local cleanup when it directly improves the feature diff, reduces
  immediate duplication, or prevents confusing ownership in the touched files
- do not restructure unrelated code just because nearby code could be cleaner
- do not block a feature on broad cleanup unless the existing structure makes
  the feature hard to implement safely
- if a file or module becomes noticeably harder to review because of the
  feature, decide whether a small extraction belongs in the same PR
- if the cleanup is useful but not necessary for the feature, record it as a
  bounded follow-up in `docs/tracking/code-refactor-checklist.md`

Before handoff, run a post-implementation structure review:

- identify any touched file that grew large, mixed responsibilities, duplicated
  logic, or became harder to test because of the change
- fix the issue in the same PR only when it is small, directly related, and does
  not obscure the feature being implemented
- otherwise add a checklist item with the specific file or module, the concrete
  responsibility problem, the desired target shape, and the minimum validation
  command
- do not add checklist items for cosmetic preferences, speculative abstraction,
  or general "clean up this area" work

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

1. Read the relevant code and matching docs before editing.
2. Make the smallest coherent change that solves the task.
3. Update any touched tests and docs in the same pass when they would otherwise drift.
4. Review the diff before finishing.
5. Run the relevant validation commands before handing off.

### Full Structured Path

1. Ground in the current code and docs before making structural decisions.
2. Check branch state before editing.
   If you are on `main`, create or switch to a feature branch before the first repo edit.
3. Write down the execution plan before editing.
   Use a local README, checklist, or equivalent in the relevant area when the work spans multiple files or steps.
4. Define the target structure and file responsibilities up front so the refactor is constraint-driven, not improvised file by file.
5. Define the intended commit boundaries up front.
   For multi-step work, note the planned commit slices before the first code change so implementation does not collapse into one large commit by accident.
6. Execute in small, reversible commits.
   Each commit should leave the repo working, keep tests aligned with code, and preserve a reviewable intermediate state.
7. Validate continuously, not just at the end.
   Run the relevant checks before each commit and after any risky structural step.
8. Run an automated code-review feedback loop before documentation cleanup.
   Review the diff from a senior-engineer/code-review stance, identify concrete
   bugs, behavior drift, weak tests, stale copy, accessibility or usability
   regressions, misplaced abstractions, and docs drift. Apply the best fixes,
   rerun the focused validation, and commit review fixes separately when that
   makes the history easier to review.
9. Keep documentation current as the work progresses.
   Do not save README or architecture updates for the very end if the structure is already changing underneath them.
   After the code-review feedback loop, update durable docs so they describe
   the reviewed implementation rather than the first implementation pass.
10. Before handoff, delete temporary execution-plan/checklist docs or convert
   them into durable reference docs. Do not leave running-state planning docs in
   the repo after their phase has landed.
11. Self-review each commit-sized diff, then self-review the final branch as a whole before handing off or opening a PR.

If you discover that the current docs no longer describe the code accurately, fix the docs in the same change when practical.

### Review-Fix Rigor

Review-fix commits do not get a lighter diligence standard than the original
implementation. Treat them as full-quality engineering work, not as quick
patches.

- run the same design and self-review depth on a review fix that you would run
  on the original implementation for the same surface area
- do not accept a review fix that introduces a new bug at a higher severity
  than the issue being addressed; explicitly check for that before committing
- when a fix adds a new async step, follow-up read, fallback path, or external
  dependency, review the success path, the originally reported bug, the inverse
  case, transient failure of the new dependency, and partial-success semantics
- after fixing a reviewer-surfaced defect, audit the rest of the plan or diff
  for siblings of the same class before committing the fix. Reviewer feedback
  usually surfaces one instance of a recurring mistake; the same mistake often
  lives in places the reviewer didn't reach. Ask: "what category of mistake is
  this, and where else might that category live?" — then check those places.
  Recurring trap: M2 phase 2.3's `vercel dev` claim was fixed in one paragraph,
  but the same "treating tool output as proof without checking what it proves"
  defect lived two paragraphs later in the 404-fingerprint check; catching the
  second pre-emptively saves the next reviewer round
- if a write already succeeded, do not let a best-effort follow-up read or
  reconciliation step make the overall operation appear failed unless the plan
  explicitly says the flow is atomic
- add or update focused coverage for the new edge introduced by the fix, not
  only for the reviewer's reported reproduction
- before committing a review fix, answer: "What new bug could this fix create?"
  and "Could this make a successful operation look failed?"

When the user asks you to address pull-request review feedback, keep the GitHub
thread state readable for humans:

- after pushing a fix for a specific review thread, reply on that exact GitHub
  thread with a short summary of what changed and the commit SHA that addressed
  it
- if a thread is pushback or defer rather than a code fix, reply on the thread
  with the rationale instead of leaving the decision only in local handoff text
- do not resolve threads, submit a review, or mark conversations resolved
  unless the user explicitly asks for that write action
- when summarizing PR review state to the user, distinguish clearly between
  live GitHub review threads and pasted review text supplied in chat

## Execution Rules

Prefer constraint-driven execution over open-ended refactoring.

- decide the intended module boundaries before moving files around
- prefer extracting one seam at a time over broad rewrites
- keep code, tests, and docs moving together
- externalize plan state when the work spans multiple steps so later decisions do not depend on memory
- prefer adding focused tests for newly exposed pure seams instead of relying only on higher-level coverage

For multi-step work, do not batch everything into one large uncommitted transformation.

- create or maintain a local checklist in the relevant area when it helps track structure, responsibilities, or remaining work
- update that checklist or README as steps are completed
- remove or finalize that checklist before handoff so canonical docs, not
  stale running state, describe the implemented system
- keep intermediate states understandable to the next engineer or agent
- if the work started from `main`, do not leave implementation only in the working tree on `main`; move it onto a feature branch before substantial edits accumulate
- if the change spans backend, frontend, tests, and docs, assume it should land as multiple commits unless there is a specific reason not to

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

For checklist, cleanup, split, extraction, or other behavior-preserving refactor
tasks, passing tests is necessary but not sufficient. Before marking the task
complete, prove that the requested target shape was actually achieved.

- define the target shape before editing, including what responsibilities should
  remain in the original file or module and what responsibilities should move
- verify the final diff against every concrete clause in the checklist item or
  prompt, not just against the task title
- report the final responsibility split in the handoff for any split or
  extraction task
- include before/after size or ownership evidence when file size, reviewability,
  or local ownership is the reason for the task
- do not mark a checklist item complete merely because some helper was extracted
  or some code moved; the remaining code must match the requested shape
- if substantial duplicated logic, mixed responsibilities, or unclear ownership
  remains, either finish the refactor or leave the checklist item open and
  explain the blocker
- if validation passes but the target shape is not met, treat the task as
  incomplete
- if the refactor does not clearly improve reviewability, ownership, risk
  reduction, or future change cost, stop and report instead of marking it
  complete

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

When a validation step (CI, a local test, a runtime assertion) fails, the next
action must be informed by the actual error, not by a hypothesis about what
the error might be.

- If CI logs are accessible (local run, attached output, pasted excerpt), read
  them before making any change.
- If CI logs are not accessible from inside the session, stop after at most
  one speculative attempt and ask the human for the log content before
  continuing. Stacked guess-and-push attempts pollute the PR history with
  commits that later need to be reverted and waste both agent time and human
  review attention.
- When you do push a fix whose connection to the observed failure is not
  directly traceable to a specific line of error output, say so in the commit
  body and flag that the commit may need to be reverted if the real cause
  turns out to be elsewhere.
- After finding the real cause, undo speculative commits from the same
  debugging session instead of leaving them in the tree. A clean final tree
  is more valuable than a clean history: a forward-revert commit that
  restores the pre-speculation state is acceptable; a rewritten history via
  force-push is acceptable only with explicit human permission.
- When a local test passes but CI fails, verify the local environment
  actually exercises the same baseline state CI does. Two gotchas this
  repository has already hit:
  - `has_table_privilege('service_role', ..., 'UPDATE')` assertions pass
    vacuously in a bare PostgreSQL shell because `service_role` has no
    grants at all; the real CI environment applies Supabase's baseline
    `grant all on all tables in schema public to service_role`, which
    flips the assertion. When asserting "role X does not have privilege
    Y," reproduce the baseline grant locally before trusting a green run.
  - pgTAP's `has_table_privilege(role, table, 'SELECT,INSERT,DELETE')`
    returns true if **any** of the privileges are held, not all. Split
    into per-privilege checks when the intent is "all of these are
    granted."

### Versioning And Dependency Discipline

Choose versions deliberately when you add or update libraries, actions, CLIs, or other tooling that pulls in libraries.

- prefer current stable versions that are compatible with the repo's runtime and framework constraints
- do not use floating values such as `latest`, broad unpinned ranges, or moving tags when a reproducible pinned version is practical
- when an action or tool installs another dependency under the hood, verify the installed version is compatible with the repo and the surrounding runtime
- when Deno, npm, JSR, GitHub Actions, or other package systems interact, make sure their resolved versions do not drift silently across environments
- update lockfiles and any version-carrying config in the same change
- prefer upgrading intentionally with a clear validation pass over opportunistic version bumps mixed into unrelated work

## Documentation Expectations

Keep documentation synchronized with the implementation.

For structural or multi-file work, documentation is part of the execution loop, not a final polish pass.

- maintain or create a local README or equivalent in the relevant area when the change introduces or reorganizes module structure
- document file responsibilities and intended ownership when the structure is non-obvious
- update area docs as changes are made so the written structure never lags far behind the code
- when a touched doc contains a status-oriented section (for example `Current
  State`, `Current status`, rollout status, or phase status), update that
  section in the same change so it reflects the implemented state
- if a repo plan doc tracks phased work, keep its phase status current as implementation lands
- when a tracked phase is complete in the branch, mark it complete in the relevant plan doc before handoff
- unless the work is explicitly exploratory, keep each completed phase in a PR-ready state that could merge to `main` without waiting for a later phase

Update `README.md` when:

- the current capabilities change
- setup or deployment steps change
- the platform responsibilities or repo structure change

Update `docs/architecture.md` when:

- code ownership or runtime flow changes
- trust boundaries or data ownership change
- new backend surfaces or major modules are added

Update `docs/dev.md` when:

- local workflow changes
- validation commands change
- tooling choices or deployment steps change

Update `docs/open-questions.md` when:

- you discover an unresolved product, UX, architecture, or operations decision that materially affects future work
- a previously open question has been answered in code, docs, or platform configuration

Update `docs/tracking/documentation-quality-checklist.md` when:

- a docs improvement pass completes a checklist item
- a new recurring docs debt pattern shows up in review or handoff

Update inline comments and function/type documentation when:

- behavior changes in a non-obvious way
- new logic would be hard to understand without context
- a documented function, type, or data structure changes meaningfully
- phase implementation adds new trust, persistence, migration, or workflow
  boundaries that a future maintainer would otherwise need to infer from tests

Do not add comments that merely restate the code.

### Doc Currency Is a PR Gate

Before opening or updating a PR, verify that every named doc that the branch
should have touched actually reflects the implemented state, not the pre-implementation state.

Walk through the triggers above and confirm each relevant update was made:

- `docs/architecture.md` — correct if any of these changed: new migration, new
  edge function behavior, new table, new data ownership, changed runtime flow,
  changed trust boundary
- `docs/product.md` — correct if the implemented capability set changed
- `docs/backlog.md` — mark items complete or add follow-ups if the branch
  closes or creates tracked work
- `docs/plans/analytics-strategy.md` (or the relevant detail doc) — mark phases or
  decisions resolved when the branch lands the described work
- `README.md` — correct if setup, capabilities, or repo structure changed
- `docs/dev.md` — correct if workflow, validation commands, or tooling changed
- `docs/open-questions.md` — close answered questions; open new unresolved ones

A PR is not ready to open if any of these docs still describe the state before
the branch's changes rather than after them. Doc updates belong in the same
branch, not in a follow-up.

## Commit Message Expectations

Use the Conventional Commits convention for commit messages in this repo.

## Validation Expectations

Run the checks relevant to the area you changed.

For frontend or shared TypeScript changes, run:

```bash
npm run lint
npm run build:web
```

For frontend style changes, also make sure the SCSS entrypoint still builds through the normal frontend build:

```bash
npm run build:web
```

For Supabase edge function changes, run:

```bash
deno check --no-lock supabase/functions/issue-session/index.ts
deno check --no-lock supabase/functions/complete-game/index.ts
```

If you changed both frontend/shared code and Supabase code, run both sets of checks.

If you could not run a relevant check, say so explicitly and explain why.

For pull requests into `main`, expect GitHub CI to run the same validation via `.github/workflows/ci.yml`.

### Validation Honesty

Do not overstate what was validated.

- Run the validation commands named by the task or checklist before handoff.
- If you added a new test command, validation surface, or workflow step, prefer to run it locally before opening or updating a PR.
- If you added a new top-level validation path, run the integrated repo command that is supposed to cover it, not just the new subcommand in isolation.
- If a validation command depends on local services or runners, exercise it from a clean start when practical, not only from a warm reused state.
- If a new validation step cannot be run locally, call out the exact blocker in the handoff and PR description.
- Do not describe a branch as fully validated if any newly introduced check has not been exercised end to end.
- If docs describe a test as covering the "real" backend or browser path, make sure the implementation actually does that. If the test runs in fallback or mocked mode, document that precisely.
- If baseline validation failed and the task was stopped before edits, report
  that as a baseline failure, not as a failed implementation.

### Continuous Validation

Do not wait until the end of a large change to discover that the branch drifted.

- for multi-file or non-trivial work, run the relevant checks before each commit, not only before handoff
- when code movement changes test layout, confirm the normal repo runners still pick up the affected tests
- when adding a new test file pattern or directory, make sure the configured runner includes it
- if a step cannot yet pass validation, shrink the step until it can

### PR Readiness

Treat pull requests as reviewable engineering work, not speculative drafts with known unverified edges hidden inside them.

- Before opening or updating a PR, confirm that all docs the branch should have touched are current (see "Doc Currency Is a PR Gate" above).
- Before opening or updating a PR, make sure every new script or validation command added by the branch is runnable by a contributor following repo docs.
- If a PR is intentionally still exploratory, keep it clearly framed as draft work and do not present it as merge-ready.
- For new test runners or test directories, confirm the existing runners do not accidentally pick them up or conflict with them.
- If a helper script depends on local tools such as Docker, Deno, Playwright, or the Supabase CLI, either make the script self-checking with clear failure messages or document the setup in the same change.
- For new helper scripts that start local services or background processes, validate teardown as well as setup so CI cannot hang after the assertions already passed.
- Prefer fixing local workflow blockers in the repo when reasonable instead of relying on CI to be the first real execution environment.

#### PR Body Template

Every pull request body **must** use the following section structure, taken
verbatim from `.github/pull_request_template.md`. Fill every section; do not
omit, rename, or reorder them.

```markdown
## Summary

-

## Why This Is Worth Merging

Name the concrete maintainability, correctness, user, or operational value that
outweighs the added diff and review cost.

## User Behavior

Describe what a user can now do differently or what flow behaves differently.
If this is behavior-preserving, say that explicitly.

## Contract And Scope

Call out whether this changes public API contracts, status codes, response
bodies, database schema or semantics, authentication or authorization rules,
routing, production platform configuration, or generated artifacts.

## Target Shape Evidence

For behavior-preserving refactors or checklist work, describe the final
responsibility split and include concrete evidence such as before/after size or
ownership boundaries. For other changes, write `N/A`.

## Documentation

List docs or checklist updates. If none are needed, explain why.

## Estimate Deviations

When implementation diverged from an estimate-shaped plan section
("Files intentionally not touched" ended up touched, intended commit
boundaries reshuffled, etc.), name the deviation, the actual outcome,
and why the call was right. Rule deviations are not handled here —
they require a plan-doc change in the same PR per AGENTS.md
"Plan-to-PR Completion Gate." Write `N/A` if no estimate deviated.

## UX Review

For UX, layout, interaction, or user-facing copy changes, include before/after
screenshots or explain why browser screenshots were not feasible. For non-UX
changes, write `N/A`.

## Validation

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:functions`
- [ ] `npm run build:web`

List any additional checks run, and state any relevant checks that could not be
run.

## Remaining Risk

Name residual risk, blockers, or follow-up work. If none are known, say so.
```

Section-specific rules:

- **Estimate Deviations**: For plan-implementing PRs, name every place
  the diff diverged from an estimate-shaped plan section ("Files
  intentionally not touched" ended up touched, "Files to touch — new"
  missed a file, intended commit boundaries reshuffled, etc.) per
  AGENTS.md "Phase Planning Sessions → Plan content is a mix of rules
  and estimates" and "Plan-to-PR Completion Gate → Call out estimate
  deviations." Write `N/A` if no estimate deviated. Rule deviations
  do not belong here — they require a same-PR plan-doc edit per the
  Completion Gate.
- **UX Review**: For PRs that create or materially modify UX, layout,
  interaction flow, or user-facing copy, follow the screenshot requirements in
  `docs/dev.md`: include uploaded screenshots or explicitly state why
  screenshots were not captured.
- **Validation**: Check off every item you actually ran. Add rows for any
  extra commands run. Explicitly list any named check that could not be run and
  why.
- **Remaining Risk**: Never leave this blank. Write "None known." if there are
  no residual risks.

### Regression Discipline

When a change touches testing infrastructure, validation commands, CI, or local setup, review it for operational regressions in addition to product regressions.

- make sure new validation commands do not silently depend on undeclared local state
- make sure new validation commands work from both fresh-start and warm-start local states when that distinction matters
- make sure browser tests are deterministic about which backend path they exercise
- make sure helper scripts are safe to rerun and fail with actionable guidance
- make sure helper scripts emit enough progress logging and bounded timeouts to debug CI stalls
- make sure CI does not pay heavyweight setup costs earlier than necessary
- make sure local validation steps do not mutate workspace state in ways that break later commands

### Testing Tiers Discipline

Plan authors and reviewers must distinguish tiers that are valid pre-merge
gates from tiers that are not. The full tier map lives in
[`docs/testing-tiers.md`](/docs/testing-tiers.md).

The two rules that trip up plan authors most often:

- **Plans may gate merge only on tiers the implementer can actually execute
  against the pre-merge state of the code.** Production smoke (Tier 5) runs
  against the deployed origin. Any new smoke assertion a plan adds cannot
  pass against production until the plan's code is deployed. Plans that
  extend production smoke assertions land in two phases: code merged with
  plan `In progress pending prod smoke`, then plan flipped to `Landed`
  after the post-release smoke run is green. Do not gate the merge on a
  check that can only pass post-deploy. The same two-phase gate applies
  to any other plan whose Validation Gate names a check that can only
  run post-release; see [`docs/testing-tiers.md`](/docs/testing-tiers.md)
  "Plan-to-Landed Gate For Plans With Post-Release Validation."
- **Plans must not require contributors to configure production credentials
  on local laptops.** `PRODUCTION_SMOKE_*` env vars, production admin
  fixture emails, and production service-role keys live in the GitHub
  `production` environment per
  [`docs/tracking/production-admin-smoke-tracking.md`](/docs/tracking/production-admin-smoke-tracking.md).
  They are owned by the release/ops owner. A plan that implicitly requires
  them on the implementer's laptop is misrouting validation — the fix is
  to adjust the plan's validation section, not to provision production
  secrets to developers.

## UI Review Runs

If you validate the UI by running the app locally and taking screenshots:

- use Playwright rather than code-only visual guesses whenever browser automation is feasible
- prefer a real browser pass over code-only visual guesses
- use a mobile viewport first because the attendee flow is mobile-first
- confirm direct route loading as well as the main click-through flow
- capture the key states you are reviewing, not just the landing page

If a change modifies UX, layout, interaction flow, or user-facing copy in a meaningful way:

- capture relevant before screenshots before editing when browser automation is feasible
- capture matching after screenshots after the implementation is complete
- use the same routes, states, viewport, and scroll context for the before/after pair whenever practical
- include a before/after comparison in the pull request description, not just a prose summary
- treat this as part of the expected review flow for UX-facing pull requests, not as an optional polish step

Prefer the reusable capture workflow already in the repo:

- keep reusable automation logic in `scripts/ui-review/`
- use `scripts/ui-review/capture-ui-review.cjs` as the default screenshot workflow
- extend that script when future verification needs new routes, states, or capture scenarios instead of creating one-off temp scripts unless the task is truly experimental

Expected setup and execution:

- start the web app locally, usually on `http://127.0.0.1:4173`
- make sure Playwright and its browser dependency are available
- if Chromium has not been installed yet, run `npx playwright install chromium`
- run `npm run ui:review:capture`
- for admin-facing PRs, run `npm run ui:review:capture:admin` instead;
  it intercepts Supabase requests with Playwright route mocks so no
  production data is read or written. Setup and captured states are
  documented in `docs/dev.md` "Admin UI review."

Backend nuance:

- prefer remote Supabase-backed UI review when the project env vars are configured locally
- the normal backend-backed review path is a configured remote Supabase project tested from a local frontend via `npm run dev:web` or `npm run dev:web:local`
- if you use remote Supabase from a local web app, make sure the project `ALLOWED_ORIGINS` secret includes the local origin you are using
- if `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are not configured locally, run UI review against the Vite dev server, not a production preview build
- the browser-only completion fallback is development-only and should only be used when explicitly enabled with `VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK=true`
- when you need a fixed host and port for Playwright, prefer `npm run dev:web:local`

Deployment expectations:

- use pull requests plus GitHub CI before merging to `main`
- treat dashboard-only production edits as out of bounds unless they are immediately reconciled back into repo migrations or function source

The capture script supports future reuse:

- it writes screenshots into a timestamped folder under `tmp/ui-review/`
- it accepts `--base-url` when the local app is running on a different origin
- it accepts `--output-dir` when a task needs a specific artifact location

Recommended UX-change screenshot process:

1. Run the capture flow before making changes and save the images in a dedicated timestamped folder such as `tmp/ui-review/<timestamp>-before/`.
2. Make the UX change.
3. Run the same capture flow again and save the images in a separate folder such as `tmp/ui-review/<timestamp>-after/`.
4. Select the key comparison images for the PR, usually mobile-first screens and any important error, completion, or edge states touched by the change.
5. Keep the raw screenshots in `tmp/` only; do not move them into tracked repo paths.

Treat screenshot artifacts as temporary analysis output.

- write screenshots under `tmp/`
- do not commit generated screenshots
- make sure the output path is ignored by git before finishing

Do not let one screenshot run overwrite or mix with another accidentally.

The default expectation is one timestamped subfolder per run. Only reuse an existing output directory if the task explicitly benefits from overwriting a prior capture set.

Before finishing a UI-review task, make sure you do not leave behind ambiguous mixed runs that make later analysis harder.

## Pull Request Screenshot Process

When a PR should show screenshots, do not satisfy that by committing image artifacts into the repository.

Use this process instead:

1. Capture the images into `tmp/ui-review/` as described above.
2. Upload only the selected PR images to an external image host so the PR description can reference them by URL.
3. A working example used in this repo is:

```bash
curl -F "reqtype=fileupload" -F "fileToUpload=@tmp/ui-review/<run>/<image>.png" \
  https://catbox.moe/user/api.php
```

4. Paste the returned image URLs into the PR body with normal Markdown image syntax.
5. Keep the local screenshots untracked and temporary; do not add them to git, and do not create tracked docs-only image folders just to support the PR description.

This keeps the repo aligned with the rule that generated screenshots live under `tmp/` and are not committed, while still making before/after comparisons visible in review.

## Self-Review Checklist

Before finishing, walk the named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) that match
the diff's surfaces — the plan step named them upfront. Then walk the
plan's `Cross-Cutting Invariants` section (if the plan has one) against
every call site the diff touches, not just the site the invariant was
first triggered by. The general review items below are layered on top
of both of those passes, not a substitute for them.

Before finishing, review your own work for:

- correctness
- regressions in the existing attendee flow
- readability and maintainability
- duplicated logic
- stale inline comments or stale docs — walk the "Doc Currency Is a PR Gate" triggers and confirm every relevant named doc was updated
- missing validation
- complete call-site coverage: when a function signature changes or a new
  parameter is added, audit every call site including error, retry, and fallback
  paths — not just the primary happy path
- accessibility or usability regressions in the mobile flow
- whether the final change is still positive value for the codebase and should
  be merged, rather than being needless churn or adding noise that offsets its
  benefit

For any bounded checklist or refactor task, also confirm:

- the final diff stays inside the requested scope
- the checklist item or prompt can be mapped to concrete changed files
- any checklist status change is backed by target-shape evidence, not only by
  passing tests
- the handoff says whether behavior changed; for behavior-preserving tasks, the
  answer should be "no" or should explain why the task stopped
- the handoff lists validation actually run, files changed, follow-up tasks
  added, and any remaining risk or blocker

For UI changes, confirm:

- the flow still feels mobile-first and one-step-at-a-time
- direct route loading still works
- progress, answer selection, submission, and completion states still make sense
- browser tests still use realistic interactions unless there is a documented reason not to

For backend or trust-related changes, confirm:

- client input is still validated defensively
- shared quiz logic is still the source of truth where appropriate
- completion verification and entitlement behavior remain coherent
- every new DB write reachable from a public or origin-gated endpoint has
  referential integrity or a constraint enforcing what values are valid — not
  just application-layer checks that a future code path could skip

For testing and tooling changes, confirm:

- the new or changed commands work locally with the documented setup
- docs and PR descriptions accurately describe what the tests do and do not prove
- new validation paths are included in the self-review, not delegated entirely to CI

For multi-commit work, also review:

- whether each commit would make sense to a reviewer on its own
- whether a later commit silently fixed issues introduced by an earlier one
- whether any structural change remains undocumented

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
