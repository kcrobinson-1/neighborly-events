# Madrona Launch Epic

## Status

Proposed. Stub only — full epic content (Goal, Cross-Cutting
Invariants, Milestone Structure, Sizing Summary, Risk Register) is
deferred to this epic's scoping session. The stub exists so that
sibling epics and surviving doc surfaces have a concrete path to
point at when they reference "the future Madrona-launch epic."

## Purpose

This epic owns Madrona Music in the Playfield's launch as the
platform's first real (non-test) public event. It picks up the M4
work that
[`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
deferred on 2026-05-01.

## Why This Epic

[`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
landed at M3 with the platform's multi-event rendering capability
proven against two test events. Its M4 (Madrona launch) was deferred
to prioritize the demo-expansion epic
([`epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md))
intervening between M3 and Madrona's relaunch. Demo-expansion ships
the apps/web ThemeScope wiring infrastructure that the original M4
phase 4.1 was scoped to ship; this epic inherits that work and
focuses on Madrona-specific Theme registration, content authoring,
and launch readiness.

The M4 paragraphs preserved in
[`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
under "M4 — Madrona Launch" remain as the pre-milestone-planning
historical estimate at the time of deferral. Per AGENTS.md "Epic
Drafting," this epic's milestone planning session re-derives phase
shape against actually-merged code; the historical M4 paragraphs
are not binding on this epic's phase structure.

## Open Questions

Full epic shape (Goal, Out Of Scope, Cross-Cutting Invariants,
Milestone Structure, Backlog Impact, Documentation Currency PR
Gate, Sizing Summary, Risk Register) is pending this epic's
scoping session. Specific decisions deferred to that session
include whether to start scoping before or after demo-expansion's
first iteration lands, milestone count, and whether the original
M4 phase shape (theme palette / content authoring / launch
readiness) survives re-derivation against merged code.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  predecessor epic; M4 paragraphs are the historical estimate this
  epic supersedes
- [`epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  intervening sibling epic; ships apps/web ThemeScope wiring this
  epic inherits
- [`planning-doc-location.md`](/docs/plans/planning-doc-location.md) —
  records the in-repo plan layout convention this epic uses
  (`docs/plans/epics/<slug>/`)
- `AGENTS.md` — agent behavior, planning depth rules, doc currency
  PR gate, epic drafting rules
