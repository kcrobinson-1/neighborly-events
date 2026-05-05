# Documentation Currency

Topic-organized constraint set covering: when to update each named
durable doc as code changes, the status-oriented-section update
rule, the per-phase plan-doc status update rule, the keep-each-
completed-phase-PR-ready rule, and the Doc Currency PR Gate.

Loaded **mid-session** (doc-update triggers fire as code changes —
not deferred to PR-open) and **at end-of-session** (Doc Currency
PR Gate before opening or updating a PR) by
[`workflows/implementation.md`](../workflows/implementation.md)
and [`workflows/plan-implementation.md`](../workflows/plan-implementation.md).

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

Update [`README.md`](/README.md) when:

- the current capabilities change
- setup or deployment steps change
- the platform responsibilities or repo structure change

Update [`docs/architecture.md`](/docs/architecture.md) when:

- code ownership or runtime flow changes
- trust boundaries or data ownership change
- new backend surfaces or major modules are added

Update [`docs/dev.md`](/docs/dev.md) when:

- local workflow changes
- validation commands change
- tooling choices or deployment steps change

Update [`docs/open-questions.md`](/docs/open-questions.md) when:

- you discover an unresolved product, UX, architecture, or operations decision that materially affects future work
- a previously open question has been answered in code, docs, or platform configuration

Update [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md) when:

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

- [`docs/architecture.md`](/docs/architecture.md) — correct if any of these changed: new migration, new
  edge function behavior, new table, new data ownership, changed runtime flow,
  changed trust boundary
- [`docs/product.md`](/docs/product.md) — correct if the implemented capability set changed
- [`docs/backlog.md`](/docs/backlog.md) — mark items complete or add follow-ups if the branch
  closes or creates tracked work
- [`docs/plans/analytics-strategy.md`](/docs/plans/analytics-strategy.md) (or the relevant detail doc) — mark phases or
  decisions resolved when the branch lands the described work
- [`README.md`](/README.md) — correct if setup, capabilities, or repo structure changed
- [`docs/dev.md`](/docs/dev.md) — correct if workflow, validation commands, or tooling changed
- [`docs/open-questions.md`](/docs/open-questions.md) — close answered questions; open new unresolved ones

A PR is not ready to open if any of these docs still describe the state before
the branch's changes rather than after them. Doc updates belong in the same
branch, not in a follow-up.
