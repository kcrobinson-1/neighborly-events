# PR Template And Commit Conventions

Topic-organized constraint set covering: the verbatim PR body
template every PR must use, section-specific rules for filling each
template section, and the commit-message convention.

Loaded **per-commit** (Conventional Commits convention) and **at PR
open** (PR body template) by [`workflows/implementation.md`](../workflows/implementation.md)
and [`workflows/plan-implementation.md`](../workflows/plan-implementation.md).

## Commit Message Expectations

Use the Conventional Commits convention for commit messages in this repo.

## PR Body Template

Every pull request body **must** use the following section structure, taken
verbatim from [`.github/pull_request_template.md`](/.github/pull_request_template.md).
Fill every section; do not omit, rename, or reorder them.

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
they require a plan-doc change in the same PR per
[`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md)
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

### Section-specific rules

- **Estimate Deviations**: For plan-implementing PRs, name every place
  the diff diverged from an estimate-shaped plan section ("Files
  intentionally not touched" ended up touched, "Files to touch — new"
  missed a file, intended commit boundaries reshuffled, etc.) per
  [`planning/shared.md`](../planning/shared.md) "Plan content is a
  mix of rules and estimates" and [`planning/plan.md`](../planning/plan.md)
  "Plan-to-PR Completion Gate." Write `N/A` if no estimate deviated.
  Rule deviations do not belong here — they require a same-PR
  plan-doc edit per the Completion Gate.
- **UX Review**: For PRs that create or materially modify UX, layout,
  interaction flow, or user-facing copy, follow the screenshot requirements in
  [`docs/dev.md`](/docs/dev.md): include uploaded screenshots or explicitly
  state why screenshots were not captured.
- **Validation**: Check off every item you actually ran. Add rows for any
  extra commands run. Explicitly list any named check that could not be run and
  why.
- **Remaining Risk**: Never leave this blank. Write "None known." if there are
  no residual risks.
