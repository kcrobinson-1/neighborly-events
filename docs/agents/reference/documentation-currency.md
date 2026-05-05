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

### Ephemeral Identifiers In Durable Docs

Durable docs (plan docs, milestone docs, epic docs, README, AGENTS.md and
its fragments under [`docs/agents/`](/docs/agents/), code comments, and any
other tracked file outside `docs/plans/**/scoping/`) must not embed PR
numbers, commit IDs, or other ephemeral coordination identifiers. Those
references rot:

- a PR number cited inline becomes meaningless when the PR is closed and
  reopened, when a fork / mirror replaces it, or when a contributor reading
  the doc has no GitHub access to chase the link
- "as of commit `abc123`" goes stale on the first rebase or squash-merge
- "see PR #X for context" sends the reader off-platform to find what the
  doc itself should already explain

What to use instead in durable docs:

- file paths + line numbers (`apps/web/vercel.json:54`)
- function / module / decision-doc names
  ([`docs/plans/test-event-noindex-uniformity.md`](/docs/plans/test-event-noindex-uniformity.md),
  `publish_game_event_draft`)
- the rule or contract by name, not by where it shipped
- date of resolution (`Resolved 2026-05-04`) when historical timing matters
- a section heading or doc-internal anchor when one self-contained doc
  contains the answer

Where ephemeral identifiers are acceptable:

- **scoping docs** under `docs/plans/**/scoping/` — these are transient,
  deleted at milestone-terminal PR per the milestone batch-deletion rule,
  so PR / commit references in them carry no long-term rot risk
- **PR descriptions** — live on GitHub, not in tracked file content
- **commit messages** — immutable history; point-in-time references are
  expected
- **the contributor's local `~/.claude/` memory or other local-only notes** —
  outside the repo

Phase Status tables and similar audit-trail rows that record where each
phase landed are a special case: prefer the dated form (`Landed 2026-05-04`)
over the PR-number form (`Landed in PR #NNN`). The PR number adds nothing
the merge date and the plan-doc link don't already convey, and it ages
into noise. If review traceability is genuinely useful, attach the link in
the PR description, not in the milestone doc.

Recurring trap: a milestone-doc Phase Status row references "this PR"
before the PR number is known, then the author goes back to fill in the
number, then closes that PR and reopens as a different number, then has
to chase every reference. The simplest fix is not to write the PR number
at all — the merge date plus the plan-doc link survive any churn.

Before opening or updating a PR, scan the diff for ephemeral coordination
identifiers in tracked files outside `docs/plans/**/scoping/`. The check
is semantic, not pattern-based — distinguish identifiers used as
**citations** (PR / issue numbers, commit hashes, "this PR" placeholders,
GitHub PR or issue links, branch-name references tied to a specific work
cycle, Linear / Jira ticket IDs, Slack permalinks, and similar) from
identifiers used as **load-bearing data** (UUIDs in fixtures, hex color
codes, ETags, `event_code` / slug values, hashes in test inputs, content
that the runtime actually consumes). Citations in tracked durable docs
are boundary violations and should be rewritten using one of the durable
forms above; load-bearing data is content and stays.

This is an agent-judgment pass, not a deterministic grep. Greps can flag
the obvious citation forms efficiently but they false-positive on
legitimate hex / numeric content and they miss novel leak shapes — a
contributor inventing a new coordination identifier (a fresh ticket
system's ID format, a different chat platform's permalink) won't match
any pre-defined regex. The semantic walk catches both the obvious shapes
and the unforeseen ones; greps remain useful as an efficiency aid for the
common cases but are not the rule.
