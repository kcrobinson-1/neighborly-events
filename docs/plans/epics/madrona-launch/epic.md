# Madrona Launch Epic

## Status

Proposed. Stub only — full epic content (Goal, Out Of Scope,
Cross-Cutting Invariants, Milestone Structure, Backlog Impact,
Documentation Currency PR Gate, finalized Sizing Summary,
finalized Risk Register) is deferred to this epic's scoping
session. The M4 phase paragraphs preserved below carry forward
verbatim from
[`event-platform-epic.md`](/docs/plans/event-platform-epic.md) at
the time of deferral (2026-05-01); they are
pre-milestone-planning estimate, not binding spec. Per AGENTS.md
"Epic Drafting," this epic's milestone planning session
re-derives phase shape against actually-merged code.

## Purpose

This epic owns Madrona Music in the Playfield's launch as the
platform's first real (non-test) public event. It picks up the M4
work that
[`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
deferred on 2026-05-01.

## Why This Epic

[`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
landed at M3 with the platform's multi-event rendering capability
proven against two test events. Its M4 (Madrona launch) was
deferred to prioritize the demo-expansion epic
([`epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md))
intervening between M3 and Madrona's relaunch. Demo-expansion
ships the apps/web ThemeScope wiring infrastructure that the
original M4 phase 4.1 was scoped to ship; this epic inherits that
work and focuses on Madrona-specific Theme registration, content
authoring, and launch readiness.

## Inherited Context

**Apps/web ThemeScope wiring already shipped (demo-expansion epic
M1 phase 1.1, 2026-05-01).** The `<ThemeScope>` wraps now exist on
`GameRoutePage`, `EventRedeemPage`, `EventRedemptionsPage`, and
`EventAdminPage` in the central
[`App.tsx`](/apps/web/src/App.tsx) routing dispatcher. Once
Madrona's registry entry lands, the existing wraps automatically
pick up Madrona's `Theme` for `slug=madrona` — no per-consumer
change required. Phase 4.1 below was originally scoped to wire
those wraps; that scope is now closed before this epic begins,
and phase 4.1 trims to Theme registration only.

**Cross-app theme-continuity already verified for test events
(demo-expansion epic M1 phase 1.1).** The cross-app
theme-continuity check originally deferred from event-platform-epic
M3 phase 3.3 to M4 phase 4.1 was satisfied for the test events
during demo-expansion M1; M4 phase 4.1 below extends it to
`slug=madrona`.

**Madrona's `Theme` was deferred from M1 phase 1.5.2 to M4 phase
4.1.** Event-platform-epic phase 1.5.2 shipped the platform Sage
Civic palette and an empty per-event registry at
`shared/styles/themes/`; no `madrona.ts` exists today. This
deferral was deliberate, to avoid a "placeholder Madrona =
today's values" double pass and align the warm-cream → Madrona
visual transition with the brand launch.

**Apps/web `:root` warm-cream defaults remain in place for
non-test-event slugs until this epic's M4 phase 4.1 lands.** Until
Madrona's `Theme` registers, `getThemeForSlug` returns the
platform Sage Civic Theme for `slug=madrona`.

## Pre-Milestone-Planning Historical Estimate (M4 paragraphs)

The paragraphs in this section carry forward verbatim from
[`event-platform-epic.md`](/docs/plans/event-platform-epic.md) at
the time of deferral. Per AGENTS.md "Epic Drafting," they are
pre-milestone-planning estimate; phase counts, per-phase content,
validation gate, and documentation list will be re-derived
against actually-merged code when this epic's milestone planning
begins. The milestone doc that session produces will be canonical
and will supersede the paragraphs below.

**Goal.** Madrona Music in the Playfield goes live as the first
public event on the platform.

**Phase 4.1 — Madrona theme palette definition.** Hold the
Madrona theme discussion as its own task at the start of this
epic: pick approximately ten color values, the typography choice,
and the accent treatment for Madrona's brand. Create
`shared/styles/themes/madrona.ts` (the file does not exist before
this phase — event-platform-epic M1 phase 1.5.2 deliberately
deferred Madrona's `Theme` to this phase to avoid a
placeholder-Madrona double pass) and register it in the
`shared/styles/themes/` registry. **Apps/web event-route
ThemeScope wiring is no longer this phase's deliverable** —
demo-expansion epic M1 phase 1.1 (2026-05-01) shipped the wrap
ahead of schedule, so the `<ThemeScope>` wraps already exist on
`GameRoutePage`, `EventRedeemPage`, `EventRedemptionsPage`, and
`EventAdminPage` in the central
[`App.tsx`](/apps/web/src/App.tsx) routing dispatcher. Once
Madrona's registry entry lands, the existing wraps automatically
pick up Madrona's `Theme` for `slug=madrona` — no per-consumer
change required. **This is the brand-launch visual transition**:
apps/web event routes shift from today's warm-cream defaults (the
`getThemeForSlug` fallback for unregistered slugs) to Madrona's
real palette at this PR's merge. UI-review captures cover the
warm-cream → Madrona transition explicitly so the launch visual is
signed off intentionally rather than landing as review surprise.
The cross-app theme-continuity check originally deferred from
event-platform-epic M3 phase 3.3 was satisfied for the test events
by demo-expansion epic M1 phase 1.1; phase 4.1 here extends it to
`slug=madrona` with a UI-review pair confirming that
`/event/madrona` (apps/site) and `/event/madrona/game` (apps/web)
render the same Madrona `Theme`. One PR.

**Phase 4.2 — Madrona event content authoring.** Author Madrona's
event content as a TypeScript module at
`apps/site/events/madrona.ts` matching the `EventContent` type
defined in event-platform-epic M3: title, dates, schedule, lineup
with set times, sponsor list with logos and links, FAQ, CTA copy,
theme slug. Hardcoded for v1; admin-authored content is
post-epic. One PR.

**Phase 4.3 — Launch readiness.** Non-engineering preparation:
volunteer training, QR posters pointing at `/event/madrona/game`
and `/event/madrona`, sponsor logo links verified, unfurl preview
verified for `/event/madrona`, redemption agent assignment
verified, production smoke run against the full Madrona path
(landing page → game → completion → redeem booth flow). Checklist
execution; no PR for the checklist itself.

**Validation gate.** Full Madrona path rendered correctly
end-to-end. Production smoke per
[`docs/testing-tiers.md`](/docs/testing-tiers.md) Tier 5 with a
Madrona-specific assertion set. Volunteer dry run completed.
Unfurl preview verified in at least one client.

**Documentation.** [`docs/product.md`](/docs/product.md) updated
to reflect Madrona launched.
[`docs/backlog.md`](/docs/backlog.md) closes "Event landing page
for `/event/:slug`". [`README.md`](/README.md) updated. This plan
flipped from `Proposed` to `Landed` in the final PR. This epic
follows the two-phase Plan-to-Landed pattern from
[`docs/testing-tiers.md`](/docs/testing-tiers.md) if the
production smoke assertions added must run post-deploy.

**Self-review audits.** From
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md):
Readiness-gate truthfulness audit (production smoke claims for
the Madrona path must reflect runs actually executed against
production after deploy; the warm-cream → Madrona visual
transition must be verified against captured before/after
UI-review evidence, not asserted by code reasoning),
Rename-aware diff classification (phase 4.1 wraps existing
event-route shells in `<ThemeScope>` in the central
[`App.tsx`](/apps/web/src/App.tsx) dispatcher — the wrap is a
content addition around an unchanged child, not a move; this
audit description carried forward from the original M4 paragraphs
even though demo-expansion M1 phase 1.1 already shipped the
wraps, because milestone planning re-derives the audit set
against actually-merged code), Effect cleanup audit (any new
content components added for Madrona-specific rendering must
clean up correctly). This epic also follows the Plan-to-Landed
Gate For Plans With Post-Release Validation from
[`docs/testing-tiers.md`](/docs/testing-tiers.md) if the
production smoke assertions added must run post-deploy.

**Sizing estimate (carried forward).** 3 phases, 2 PRs (phase 4.3
is checklist execution, not a PR). Milestone planning pending;
the actual phase count, per-phase content, and PR count will be
re-derived against actually-merged code when the milestone
planning session runs.

**Risk: Madrona content authoring time.** Real design and copy
decisions may take longer than expected. Mitigation: content
lives as hardcoded TS modules in phase 4.2 rather than blocking
on a CMS layer; the engineering surface is small even if content
polish iterates.

## Open Questions

Full epic shape (Goal, Out Of Scope, Cross-Cutting Invariants,
finalized Milestone Structure, Backlog Impact, Documentation
Currency PR Gate, finalized Sizing Summary, finalized Risk
Register) is pending this epic's scoping session. Specific
decisions deferred to that session include whether to start
scoping before or after demo-expansion's first iteration lands,
milestone count, the milestone numbering this epic adopts (per
AGENTS.md per-epic milestone numbering, the historical "M4 phase
4.1" numbering above is supplied by the predecessor epic and is
not binding on this epic — milestone planning may renumber to M1
phase 1.x), and whether the original M4 phase shape (theme
palette / content authoring / launch readiness) survives
re-derivation against merged code.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  predecessor epic; M4 paragraphs above carried forward from its
  pre-milestone-planning estimate at the time of deferral
- [`epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  intervening sibling epic; ships apps/web ThemeScope wiring this
  epic inherits
- [`planning-doc-location.md`](/docs/plans/planning-doc-location.md) —
  records the in-repo plan layout convention this epic uses
  (`docs/plans/epics/<slug>/`)
- [`AGENTS.md`](/AGENTS.md) — agent behavior, planning depth
  rules, doc currency PR gate, epic drafting rules
