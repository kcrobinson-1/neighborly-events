# Demo Expansion Epic

## Status

Proposed.

## Milestone Status

Update each row when the implementing PR for that milestone merges. Per
AGENTS.md "Plan-to-PR Completion Gate," every implementing PR is
responsible for flipping the corresponding row's status in the same
change. Commit SHAs are not recorded — `git log` is authoritative for
navigating from plan to history.

| Milestone | First-Iteration Scope | Status |
| --- | --- | --- |
| M1 — apps/web ThemeScope wiring | In | Landed |
| M2 — Home-page rebuild | In | Proposed |
| M3 — Demo-mode auth bypass for test-event slugs | In | Proposed |
| M4 — Role-door surfaces and redemption seeding | Out | Deferred |
| M5 — Configuration tour | Out | Deferred |
| M6 — Behind-the-scenes, roadmap, polish, epic close | Out | Deferred |

When M1–M3 show `Landed`, the first-iteration scope is complete. M4–M6
are explicit deferrals at the time of epic drafting; reopening them is a
separate scoping decision (a second-iteration pass against what M1–M3
actually delivered) and the top-level Status of this epic does not flip
to `Landed` from first-iteration close alone.

## Purpose

This document is the canonical plan for expanding the marketing/demo
surface of the platform so internal partners can experience the
multi-event, multi-themed capabilities delivered by event-platform-epic
M3 end-to-end. It covers the shape of the demo experience, the milestone
sequence to ship its first iteration, the cross-cutting invariants that
hold across the work, and the doc and backlog impact at each gate.

The epic produces (across full scope, including deferred milestones):

- a rebuilt home page at `apps/site/app/page.tsx` that surfaces the two
  test events with theme-distinct previews and frames the platform
  honestly for an internal-partner audience
- per-event Theme rendering on apps/web event-route shells
  (`/event/:slug/{game,admin,game/redeem,game/redemptions}`), pulling
  forward the wiring originally scoped to event-platform-epic M4 phase
  4.1
- demo-mode auth bypass on test-event slugs (`harvest-block-party` and
  `riverside-jam`) that makes admin / redeem / redemptions surfaces
  reachable without sign-in
- demo-mode redemption flow with seeded codes and a reset story that
  keeps the booth runnable across visitors (M4, deferred)
- a configuration tour walking through the admin authoring UI (M5,
  deferred; mechanism decided during M5 scoping)
- a behind-the-scenes section explaining roles, theme registry, and
  what is real vs stubbed (M6, deferred)

## Why This Epic

event-platform-epic M3 delivered the platform's multi-event rendering
capability with two themed test events (`harvest-block-party`,
`riverside-jam`). The events are URL-reachable but not surfaced from any
home page or navigation, and the platform's other surfaces — admin
authoring, volunteer redemption booth, organizer redemption monitoring,
the quiz game itself — exist in apps/web but require auth and are not
linked from anything an unauthenticated visitor can reach.

Internal partners need to walk through the platform end-to-end to
evaluate it, demo it to others, and decide what to invest in next. That
requires a marketing/demo surface that surfaces the test events, threads
visitors through attendee/organizer/volunteer roles, and exposes the
configuration story honestly.

Madrona launch (event-platform-epic M4) was paused on 2026-05-01 to
prioritize this demo expansion. After demo expansion's first iteration
lands, Madrona reopens as its own sibling epic.

## Goal

Ship a marketing/demo experience that:

- surfaces the two test events from a redesigned home page with
  theme-distinct previews and an end-to-end Harvest narrative
- renders apps/web event-route shells against per-event Themes so the
  attendee/admin/redeem/redemptions experience visually matches the
  event landing page
- provides demo-mode access to admin / redeem / redemptions surfaces
  for test-event slugs without sign-in (M3+; surfaces become reachable
  in M3, the experience around them lands in M4)
- preserves test-event noindex and disclaimers, and stays honest about
  what is shipped vs stubbed at each iteration boundary

First-iteration goal scope: M1–M3. Goals tied to M4–M6 are deferred.

## Out Of Scope

This epic does not ship:

- public indexing or marketing of the home page or test events; noindex
  and the existing test-event disclaimer banner stay in place
- a generalized demo-mode framework for non-test events; demo-mode
  bypass is strictly scoped to `harvest-block-party` and `riverside-jam`
  by slug allowlist
- new test events beyond the two that landed in event-platform-epic M3
- per-event admin theme editor UI (deferred from event-platform-epic;
  remains post-the-Madrona-epic)
- admin-authored sponsor/schedule/lineup/FAQ data tables (deferred from
  event-platform-epic; same reasoning)
- self-serve event creation by non-root-admin users
- production-grade billing, account management, or organization shapes
  for the platform — internal-partner audience does not require them

## Cross-Cutting Invariants

These invariants hold simultaneously at every site the epic touches.
They are the rules self-review must walk against every diff, not only
the diff that first triggered the rule.

**Test-event slug allowlist for demo-mode.** Demo-mode auth bypass
introduced in M3 applies only to slugs `harvest-block-party` and
`riverside-jam`. Real events (any future Madrona-class event) never
receive auth bypass under any code path. The allowlist is declared once
in code and consumed at every guard site — no per-site slug literal
duplication.

**Internal-partner audience.** The home page and test events stay
noindex through this epic. Surfaces exposed by this epic are honest
about their demo status — copy says what is real vs stubbed, the
test-event disclaimer banner remains visible on landing pages, and
demo-mode entry points are signposted as such.

**Cross-app theme-continuity check.** The cross-app theme-continuity
check originally deferred from event-platform-epic M3 phase 3.3 to M4
phase 4.1 lands inside M1 of this epic instead, scoped to the test
events. UI-review pairs confirm `/event/<slug>` (apps/site) and
`/event/<slug>/game` (apps/web) render the same per-event Theme once
M1's wiring lands.

**Inherited from event-platform-epic.** This epic inherits the URL
contract, theme route scoping, theme token discipline, in-place auth,
auth integration, and trust-boundary invariants from
[`event-platform-epic.md`](/docs/plans/event-platform-epic.md). M1's
ThemeScope wiring satisfies the "Deferred ThemeScope wiring" item from
event-platform-epic for the apps/web event-route shells, scoped to test
events; that invariant remains open for any future non-test-event slug
until the Madrona-launch epic lands real-event wiring.

## Open Questions Resolved By This Epic

The first-iteration scope does not knowingly resolve open questions
from `docs/open-questions.md`. Phase planning may surface specific
decisions; those are recorded in `docs/open-questions.md` in the same
PR that surfaces them.

## Open Questions Newly Opened

**Demo-mode write semantics for test-event slugs.** M3's first phase
owns this decision: read-only browse, functional with persistence and
reset, or sandbox-ephemeral. The choice cascades into M3+
implementation and into M4's seeded-codes / reset-story design. M3
phase planning records the decision and rationale.

**Configuration tour mechanism.** M5 owns this decision: annotated
screenshots inline on the marketing page, a sub-route walkthrough,
embedded short-loop videos / GIFs, or a live demo-mode admin against
real-but-resettable state. Mechanism choice cascades into M5
engineering surface. Decision recorded during M5 scoping; not blocking
M1–M3.

## Milestone Structure

Phase-level paragraphs below are pre-milestone-planning estimates. Per
AGENTS.md "Epic Drafting," milestone planning sessions own the canonical
phase shape, validation gate, documentation list, and self-review audit
set for each milestone. The per-milestone paragraphs here are the
estimate that informs each milestone planning session, not binding
specs. Where a milestone doc exists, that doc is canonical; the epic
paragraph is historical record.

### M1 — apps/web ThemeScope Wiring

**Goal.** Wire `<ThemeScope theme={getThemeForSlug(slug)}>` into apps/web
event-route shells (`/event/:slug/game`, `/event/:slug/admin`,
`/event/:slug/game/redeem`, `/event/:slug/game/redemptions`) so per-event
Themes registered in `shared/styles/themes/` (currently Harvest and
Riverside) apply on apps/web routes. Pulls forward the wiring originally
scoped to event-platform-epic M4 phase 4.1; the cross-app
theme-continuity check deferred from event-platform-epic M3 phase 3.3
lands here for test events.

**Phase shape (pre-milestone-planning estimate).** One phase wiring
`<ThemeScope>` in `apps/web/src/App.tsx`'s central routing dispatcher
per the M1 phase 1.5 invariant — no per-page wrapping. UI-review
captures of warm-cream → Harvest and warm-cream → Riverside transitions
on each event-scoped surface; cross-app theme-continuity capture pairs
for both test events. May split into per-route or per-event subphases if
review surface proves large; milestone planning re-derives.

### M2 — Home-Page Rebuild

**Goal.** Rebuild `apps/site/app/page.tsx` from a stub admin-CTA into
the demo entry point. Sections: hero with internal-honest framing,
two-event showcase cards previewing distinct themes, end-to-end Harvest
narrative, and three role-door entry points (Attendee / Organizer /
Volunteer) as live links to existing surfaces with honest "sign in or
wait for demo mode" framing on auth-gated targets.

**Phase shape (pre-milestone-planning estimate).** Likely 2–3 phases:
structural rebuild + hero / showcase, Harvest narrative section,
role-door entry points. Milestone planning re-derives. M2 lands without
depending on M3's demo-mode plumbing — role doors link to existing
auth-gated surfaces with the "sign in or wait for demo mode" copy until
M3 lands.

### M3 — Demo-Mode Auth Bypass For Test-Event Slugs

**Goal.** Make admin / redeem / redemptions surfaces reachable on
test-event slugs without sign-in. Real working UI, scoped strictly to
`harvest-block-party` and `riverside-jam`. Surfaces become reachable in
M3; the experience around those surfaces (seeded codes, reset story,
role-door framing) is M4 (deferred).

**Phase shape (pre-milestone-planning estimate).**

- Phase 3.1 — Decide demo-mode write semantics (read-only browse,
  functional with persistence and reset, or sandbox-ephemeral).
  Doc-only phase that records the chosen semantics, rationale, and
  rejected alternatives.
- Phase 3.2+ — Implement the chosen semantics: route guards on the
  test-event allowlist, RLS or service-role mediation for any
  bypass-mediated reads/writes, seeded data, and the reset story if
  applicable. Phase count re-derived during milestone planning once
  semantics are settled.

### M4 — Role-Door Surfaces And Redemption Seeding

**Status.** Out of first iteration. Deferred at epic drafting time.

**Goal.** Build the home-page role-door entry points (from M2) into
functional demo flows: pre-seeded redemption codes for the volunteer
booth, organizer monitoring view populated with realistic prior
redemptions, reset story that keeps the booth runnable for the next
visitor across the test-event slugs allowlisted in M3.

### M5 — Configuration Tour

**Status.** Out of first iteration. Deferred at epic drafting time.

**Goal.** Walkthrough of the admin authoring UI: question editor, draft
management, publish/unpublish flow. Mechanism decided during M5 scoping
(see "Open Questions Newly Opened").

### M6 — Behind-The-Scenes, Roadmap, Polish, Epic Close

**Status.** Out of first iteration. Deferred at epic drafting time.

**Goal.** Internal-partner-friendly section explaining the platform's
roles, theme registry, what is real vs stubbed; roadmap snippet; polish
pass; epic Status flip from `Proposed` to `Landed`.

## Backlog Impact

Items closed by this epic (when full scope including deferred milestones
lands):

- "Marketing/demo surface for the platform that surfaces test events
  end-to-end" — phase planning makes the entry explicit in
  `docs/backlog.md` if not already there

Items unblocked but not landed by this epic:

- Madrona-launch epic — demo expansion ships the apps/web ThemeScope
  wiring infrastructure (M1) that the original event-platform-epic M4
  phase 4.1 was going to ship; the Madrona-launch epic inherits this
  work and focuses on Madrona's `Theme` registration plus content
  authoring

Items added by this epic for post-epic work:

- demo-mode generalization beyond the test-event allowlist (post-epic)
- production-friendly demo-mode for partner-onboarding scenarios
  (post-epic; may be handled by the Madrona-launch epic or its
  successor)

## Documentation Currency PR Gate

Every PR in this epic verifies the relevant doc is updated in the same
change. The complete list of docs that must reflect the implemented
state by epic completion:

- `README.md` — capability set after demo expansion lands,
  internal-partner framing
- `docs/architecture.md` — apps/web ThemeScope wiring, demo-mode
  surface, test-event allowlist boundary
- `docs/operations.md` — demo-mode reset story (if M4 lands), any
  Vercel routing changes
- `docs/product.md` — demo expansion capability set per milestone
- `docs/open-questions.md` — close any questions resolved during
  execution
- `docs/backlog.md` — close completed items, add post-epic items
- `docs/styling.md` — apps/web theme wiring after M1
- This plan — flipped from `Proposed` to `Landed` in the M6 closing PR
  (deferred); first-iteration completion does not flip top-level Status
  alone

## Sizing Summary

Counts below are pre-milestone-planning estimates; per AGENTS.md "Epic
Drafting," each milestone's actual phase count and PR count are
re-derived by its milestone planning session against merged-in code.

First-iteration phases per milestone (estimate):

- M1 — 1 phase, 1 PR (may split to per-route subphases)
- M2 — 2–3 phases, 2–3 PRs
- M3 — 1 doc-only phase + N implementation phases, N+1 PRs (N depends
  on chosen demo-mode write semantics)

First-iteration estimate: 4–7 phases, 4–7 PRs.

Deferred milestones (M4–M6) are not sized at epic drafting time; sizing
happens when second-iteration scoping reopens them against what M1–M3
actually delivered.

The above is written under "one engineer focused on the epic with no
parallel tracks." Reader scales relative weight from phase and PR
counts; no engineer-day or t-shirt sizing is assigned.

## Risk Register

**Demo-mode security boundary.** Test-event allowlist is the
load-bearing security mechanism for M3+. A code path that resolves
"is this a test event" inconsistently between guard sites could silently
extend bypass to real events. Mitigation: declare the allowlist once and
have every guard site consume from it; M3 phase planning includes pgTAP
or equivalent assertions that allowlist membership is honored uniformly.

**Cross-app theme regressions.** M1 wires per-event Themes into apps/web
event-route shells that have rendered against warm-cream defaults since
the platform's start. UI-review captures may surface component-level
token gaps not anticipated by the existing token classification.
Mitigation: M1 lands as its own PR distinct from M2, review attention
focuses on the per-component theme rendering surface, and any token gaps
surfaced are recorded as themable/structural classification follow-ups
in `docs/styling.md`.

**Demo-mode write semantics blast radius.** Whichever of read-only /
functional-with-reset / sandbox-ephemeral is chosen in M3 phase 3.1
cascades into M4's seeded-codes design. Choosing
write-back-to-real-tables-with-flag introduces ongoing reset-cron
operational concerns; choosing sandbox-ephemeral introduces a parallel
state model; choosing read-only narrows demo fidelity. Mitigation: M3
phase 3.1 is doc-only, lets the decision marinate before any code
commits, and records rejected alternatives so future-us has the context
to revisit.

**M4–M6 deferral creep.** Deferred milestones can drift from the shape
that was assumed at first-iteration scoping. Mitigation: a
second-iteration scoping pass re-derives M4–M6 against what M1–M3
actually delivered; the paragraphs in the M4–M6 sections above are
estimate at deferral time, not binding spec.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) — the
  predecessor epic; this epic extends its M3-delivered platform with a
  marketing/demo experience and intervenes between M3's closing and
  Madrona launch
- [`planning-doc-location.md`](/docs/plans/planning-doc-location.md) —
  records the in-repo plan layout convention this epic uses
  (`docs/plans/epics/<slug>/`)
- `AGENTS.md` — agent behavior, planning depth rules, doc currency PR
  gate, validation honesty
- `docs/architecture.md` — current system shape and trust boundaries
- `docs/open-questions.md` — unresolved decisions
- `docs/backlog.md` — priority-ordered follow-up
- `docs/self-review-catalog.md` — named self-review audits per surface
