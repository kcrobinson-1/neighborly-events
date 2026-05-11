# Epic Drafting

Per-level planning playbook for **epic-drafting** sessions. Loads
[`shared.md`](./shared.md) for cross-level planning rules
(`Verified by:` annotations, falsifiability check, rules-vs-
estimates labeling, plan-code minimalism, plan-doc review
stance, planning-artifacts-cite-each-other anti-pattern, exact-
match label quoting). This file covers what is unique to the
epic level.

## Scope: what an epic does and does not say

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

## Path conventions

Path conventions for plan docs follow the in-repo plan layout
(see
[`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)).
Going-forward shape: an epic gets its own folder
`docs/plans/epics/<epic-slug>/`, with the epic-level doc at
`docs/plans/epics/<epic-slug>/epic.md` and per-milestone /
per-phase plans nested inside (paths named in
[`milestone.md`](./milestone.md) and [`phase.md`](./phase.md)).
Per-epic milestone numbering is canonical: each epic counts from
M1 independently, and sibling epics may reuse the same milestone
numbers without collision because the path's epic segment
disambiguates. The path templates in milestone.md and phase.md name
both shapes — the going-forward epic-folder shape and the older
flat shape that some pre-convention plans use — so authors of
either pick the right one for the epic they're working in.
