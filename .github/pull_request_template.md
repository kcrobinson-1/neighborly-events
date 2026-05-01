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
