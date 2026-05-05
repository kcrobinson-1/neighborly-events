# Documentation Currency

Stub — content will land in a follow-up commit per
[`docs/plans/agents-md-restructure.md`](/docs/plans/agents-md-restructure.md)
Execution Step 3.

This file will carry: the doc-update triggers ([`README.md`](/README.md)
when capabilities / setup / repo structure change;
[`docs/architecture.md`](/docs/architecture.md) when code ownership
/ runtime flow / trust boundaries change;
[`docs/dev.md`](/docs/dev.md) when local workflow / validation /
tooling changes;
[`docs/open-questions.md`](/docs/open-questions.md) when material
uncertainties open or close;
[`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
when a docs improvement pass closes an item; inline comments and
function/type documentation when behavior changes non-obviously),
the status-oriented-section update rule (any touched doc with a
"Current State" / "Current status" / phase status section gets
updated in the same change), the per-phase plan-doc status update
rule, the keep-each-completed-phase-PR-ready rule, and the Doc
Currency PR Gate (walk every named doc trigger before opening or
updating a PR; doc updates belong in the same branch). Loaded
mid-session as code changes and at end-of-session (Doc Currency
PR Gate) by workflows/.
