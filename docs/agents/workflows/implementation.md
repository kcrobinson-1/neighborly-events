# Implementation Workflow

Per-session-type playbook for code-touching work that does not consume
a documented plan from [`docs/plans/`](/docs/plans/). For
plan-implementing sessions, layer
[`plan-implementation.md`](./plan-implementation.md) on top of this
file.

This workflow assumes the **universal rules** in
[`AGENTS.md`](/AGENTS.md) (pre-edit gate, scope guardrails,
sub-agent delegation, stop-and-report, anti-patterns, change
boundaries) and routes into the reference files below at the
appropriate session moment.

## Reference-file routing

| Reference file | Load at | Trigger |
|---|---|---|
| [`reference/architecture-guardrails.md`](../reference/architecture-guardrails.md) | **Pre-edit gate** (before the first edit) — read end-to-end, not skimmed | Diff surface intersects `apps/web/`, `apps/site/`, `shared/`, `supabase/`, or styling. **Mandatory**, not optional. |
| [`reference/validation.md`](../reference/validation.md) | Mid-session before each commit on multi-file or non-trivial work; end-of-session at PR Readiness | Any code-touching session |
| [`reference/documentation-currency.md`](../reference/documentation-currency.md) | Mid-session as code changes; end-of-session at the Doc Currency PR Gate | Diff intersects any named durable doc (`README.md`, `docs/architecture.md`, `docs/dev.md`, `docs/open-questions.md`, etc.) |
| [`reference/pr-template.md`](../reference/pr-template.md) | Per-commit (Conventional Commits); end-of-session (PR body template) | Every commit; every PR open |

## Lightweight vs full structured

Work should follow the repo process even when the prompt only describes the end state.

A change qualifies for the **lightweight path** when ALL of these hold:

1. **≤ 5 files touched** (excluding generated types).
2. **Single subsystem.** Touches one of: a UI surface (route, section, component) or backend logic (RPC, edge function). Changes spanning more than one are multi-subsystem. Data-model changes (tables, migrations) always route to the full path per criterion 4 below; they're excluded from the lightweight subsystem set even when otherwise single-subsystem.
3. **No public-API contract change.** No new or modified RPC, no auth / authz change, no route addition or removal.
4. **No schema change.** Migrations of any kind (additive or otherwise) require the full path; the schema is the persistence contract and changes to it warrant the full discipline.
5. **Test surface is local.** Added or updated tests cover only the touched files; no new e2e, integration, or cross-file fixture work.

If ANY of these fails, use the **full structured path**. The classes that recurringly need the full path: multi-file refactors, architectural changes, anything introducing a new mechanism or cross-cutting invariant, anything touching workflow / validation / build / CI surfaces.

The thresholds here are deliberately stricter than the narrow-surface criteria in [`docs/agents/planning/phase.md`](../planning/phase.md) "Narrow-surface phases may skip the scoping doc." That rule governs whether a *planned phase* writes a scoping doc; this rule governs whether *unplanned implementation work* uses lightweight or full execution discipline. A change that qualifies as narrow-surface for phase planning may still need the full structured path here — phase planning's narrow-surface threshold is about scoping artifact necessity, not about commit/validation discipline.

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
   Run the relevant checks before each commit and after any risky structural step. See [`reference/validation.md`](../reference/validation.md) "Continuous Validation."
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
   See [`reference/documentation-currency.md`](../reference/documentation-currency.md).
10. Before handoff, delete temporary execution-plan/checklist docs or convert
   them into durable reference docs. Do not leave running-state planning docs in
   the repo after their phase has landed.
11. Self-review each commit-sized diff, then self-review the final branch as a whole before handing off or opening a PR.

If you discover that the current docs no longer describe the code accurately, fix the docs in the same change when practical.

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

## Refactor Completion Proof

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

## Feature-Time Cleanup And Refactor Debt Capture

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
  bounded follow-up in [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

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

## Versioning And Dependency Discipline

Choose versions deliberately when you add or update libraries, actions, CLIs, or other tooling that pulls in libraries.

- prefer current stable versions that are compatible with the repo's runtime and framework constraints
- do not use floating values such as `latest`, broad unpinned ranges, or moving tags when a reproducible pinned version is practical
- when an action or tool installs another dependency under the hood, verify the installed version is compatible with the repo and the surrounding runtime
- when Deno, npm, JSR, GitHub Actions, or other package systems interact, make sure their resolved versions do not drift silently across environments
- update lockfiles and any version-carrying config in the same change
- prefer upgrading intentionally with a clear validation pass over opportunistic version bumps mixed into unrelated work

## Self-Review Checklist

Before finishing, walk the named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) that match
the diff's surfaces — for plan-implementing PRs, the plan step
named them upfront (see [`plan-implementation.md`](./plan-implementation.md)).
The general review items below are layered on top of that pass, not a
substitute for it.

Before finishing, review your own work for:

- correctness
- regressions in the existing attendee flow
- readability and maintainability
- duplicated logic
- stale inline comments or stale docs — walk the
  [`reference/documentation-currency.md`](../reference/documentation-currency.md)
  "Doc Currency Is a PR Gate" triggers and confirm every relevant named doc was updated
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

For UI changes, see [`ui-review.md`](./ui-review.md) "UI self-review"
for the mobile-first / direct-route-loading / completion-state checks.

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
