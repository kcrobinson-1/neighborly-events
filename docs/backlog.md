# Backlog

## Purpose

Single priority-ordered list of post-MVP follow-up work across all concern
areas. Each entry links to the detail file that explains the full context,
steps, and validation commands.

**How to use this file:**

- Start here to find the highest-priority next item.
- Read the linked detail file before starting any item.
- Keep this file focused on active work.
- When an item is complete, update the owning detail file and remove the item
  from this backlog instead of leaving closed history inline.
- Add new items in the correct tier with a one-line why and a detail link.
- `decision` items require a product or design choice before dev work can
  start. `dev`, `ux`, and `infra` items are ready to execute.

**Detail file locations:**

- Open questions and product decisions: [`docs/open-questions.md`](./open-questions.md)
- Terminology migration planning: [`docs/plans/archive/terminology-migration-strategy.md`](./plans/archive/terminology-migration-strategy.md)
- Admin live-status fix plan: [`docs/plans/admin-live-status-plan.md`](./plans/admin-live-status-plan.md)
- Admin UX polish: [`docs/tracking/admin-ux-roadmap.md`](./tracking/admin-ux-roadmap.md)
- Contributor workflow tooling: [`docs/tracking/dev-workflow-improvements.md`](./tracking/dev-workflow-improvements.md)
- Continuous deployment planning: [`docs/plans/continuous-deployment-plan.md`](./plans/continuous-deployment-plan.md)
- Security and abuse planning: [`docs/plans/security-and-abuse-plan.md`](./plans/security-and-abuse-plan.md)
- Code refactors: [`docs/tracking/code-refactor-checklist.md`](./tracking/code-refactor-checklist.md)
- Test coverage rollout: [`docs/testing.md`](./testing.md)
- Deferred authoring features: [`docs/plans/archive/quiz-authoring-plan.md`](./plans/archive/quiz-authoring-plan.md)
- Release gates, quality-check methodology, and live release-blocking view: [`docs/plans/release-readiness.md`](./plans/release-readiness.md)

---

## Tier 1 — Live Event Readiness

Must be resolved before QR codes are printed or the first real event runs.

- [ ] **`ux` Admin live status must match public route availability**
  Slices 1 and 2 landed the correctness fix plus the admin read-model cleanup.
  Keep this item in Tier 1 until the remaining Slice 3 non-live action follow-up
  is resolved and the parent
  [`docs/plans/admin-live-status-plan.md`](./plans/admin-live-status-plan.md)
  sequence reaches its terminal state.
  Detail: [`docs/plans/admin-live-status-plan.md`](./plans/admin-live-status-plan.md)

---

## Tier 2 — Operational Confidence

Reduce deployment risk and contributor friction before the live event.

- [ ] **`dev` Admin UI-review capture mode**
  Add `npm run ui:review:capture -- --mode admin` (or a sibling script) so
  admin UX PRs have a documented screenshot path that does not write production
  data. Without this, each admin UX PR improvises its own screenshot approach.
  Detail: [`docs/tracking/dev-workflow-improvements.md` — Add an admin UI-review capture mode](./tracking/dev-workflow-improvements.md)

- [ ] **`infra` Surface CI step logs in PR comments on failure**
  AI coding agents working inside a session can't authenticate to the Actions
  logs API, so a failing PR CI run leaves the agent without the real
  diagnostic. Add an `if: failure()` step to the CI workflow that tails the
  first failing step and posts it as a PR comment, so PR activity webhooks
  relay the log back into the session automatically.
  Detail: [`docs/tracking/dev-workflow-improvements.md` — Surface CI step logs in PR comments on failure](./tracking/dev-workflow-improvements.md)

- [ ] **`dev` Assert allowlist-filtered zero-row access on `game_event_admin_status`**
  Slice 2 added view grant checks, but its pgTAP file still relies on underlying
  `game_event_drafts` RLS coverage for the “authenticated but not allowlisted
  sees zero rows” case. Add a direct view-level assertion so future view or
  policy changes cannot widen access silently.
  Detail: [`docs/plans/admin-live-status-plan.md`](./plans/admin-live-status-plan.md)

---

## Tier 3 — Admin Authoring Polish

Improve the authoring experience before the organizer uses it to set up a real
event.

- [ ] **`docs` Rewrite `database-backed-quiz-content.md` and `quiz-authoring-plan.md` to target terminology**
  These two plan docs still use legacy `quiz`/`raffle` language (12 and 27
  occurrences respectively). All other docs were swept in Phases 1 and 5; these
  were deferred due to size. Rewrite narrative and headings to use
  `game`/`entitlement` names per the migration policy.
  Detail: [`docs/plans/archive/terminology-migration-map.md` — Documentation](./plans/archive/terminology-migration-map.md)

- [ ] **`ux` Mobile question editor layout**
  Rework the question editor stacking on narrow viewports so the question list,
  focused editor, and option controls do not crowd each other. The highest-value
  admin UX refinement before real authoring use.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Improve the mobile question editor layout](./tracking/admin-ux-roadmap.md)

- [ ] **`ux` Desktop admin workspace hierarchy**
  Clarify the two-panel balance between the event summary, event-details form,
  and question editor on wide screens. Affects editing confidence before preview
  and publish controls add more surface to the same page.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Clarify the desktop admin workspace hierarchy](./tracking/admin-ux-roadmap.md)

---

## Tier 4 — Post-MVP Features

Planned capabilities intentionally deferred from the MVP scope. Require product
prioritization before starting.

- [ ] **`dev` Visibility-aware attendee redemption polling**
  Pause the attendee completion-screen poll while the tab is hidden and force
  one immediate refresh on resume so long-lived hidden tabs do not keep making
  unnecessary requests.
  Detail: [`docs/plans/reward-redemption-phase-c-1-plan.md`](./plans/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Manual attendee redemption-status refresh**
  Add a `Refresh status` affordance on the completion screen so an attendee can
  trigger a re-read without waiting for the next polling tick.
  Detail: [`docs/plans/reward-redemption-phase-c-1-plan.md`](./plans/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Timestamped attendee redeemed-state copy**
  Add redeemed-at time copy on the attendee completion screen, including the
  locale/timezone handling needed to make that timestamp trustworthy.
  Detail: [`docs/plans/reward-redemption-phase-c-1-plan.md`](./plans/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Attendee completion freshness and transient-error state**
  Surface lightweight freshness/error guidance on the completion screen so a
  long backend outage does not leave attendees staring at stale status with no
  explanation.
  Detail: [`docs/plans/reward-redemption-phase-c-1-plan.md`](./plans/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Reversal-aware attendee completion copy**
  Distinguish a row that flipped from redeemed back to unredeemed mid-session
  instead of falling back to the generic ready-for-check-in wording.
  Detail: [`docs/plans/reward-redemption-phase-c-1-plan.md`](./plans/reward-redemption-phase-c-1-plan.md)

- [ ] **`dev` Admin draft preview** (Phase 4.5)
  Let an admin preview the attendee experience from the draft before publishing.
  Detail: [`docs/plans/archive/quiz-authoring-plan.md` — Phase 4.5](./plans/archive/quiz-authoring-plan.md)

- [ ] **`dev` AI-assisted authoring** (Phase 4.7)
  AI-generated draft questions refined by the organizer.
  Detail: [`docs/plans/archive/quiz-authoring-plan.md` — Phase 4.7](./plans/archive/quiz-authoring-plan.md)

- [ ] **`dev` Analytics and reporting**
  SQL views on `game_completions`, `game_entitlements`, and `game_starts`
  to produce per-event completion counts, score distributions, timing summaries,
  and sponsor question engagement. Follow-on: an organizer-facing reporting
  section in the admin workspace that surfaces those views for a selected event
  without requiring Supabase Studio access.
  Detail: [`docs/plans/analytics-strategy.md`](./plans/analytics-strategy.md)

- [ ] **`decision` Post-MVP authoring ownership and permission model**
  Decide whether post-MVP authoring should stay managed
  (root-admin-created events with manual organizer assignment) or move toward a
  self-serve model where organizers can create and own their own events. This
  decision should set the permission-management direction before any broader
  root-admin or organizer self-service UX is built. Current working posture:
  keep provisioning manual for now.
  Detail: [`docs/open-questions.md` — Authoring And Publishing](./open-questions.md)

- [ ] **`ux` Organizer-managed agent assignment**
  If the post-MVP operating model supports organizer-owned event operations,
  add a way for an organizer to maintain event agents without requiring manual
  root-admin SQL edits. Blocked on the broader authoring ownership decision.
  Detail: [`docs/open-questions.md` — Authoring And Publishing](./open-questions.md)

- [ ] **`dev` Richer publish controls**
  Expiry windows, scheduled publish, multiple games per event, and friendlier
  inactive-event behavior beyond immediate unpublish.
  Detail: [`docs/open-questions.md` — Authoring And Publishing](./open-questions.md)

- [ ] **`ux` Event landing page for `/event/:slug`**
  Gameplay now lives on `/event/:slug/game`. Add an event landing surface at
  `/event/:slug` once the product starts supporting multiple experiences per
  event so navigation and URL contracts scale cleanly.
  Detail: [`docs/open-questions.md` — Product And Live Event Operation](./open-questions.md)

- [ ] **`decision` Sponsor reporting requirements**
  Determine the minimum reporting slice sponsors actually need: simple inclusion
  proof, aggregate event totals, or question-level reporting.
  Detail: [`docs/open-questions.md` — Reporting And Sponsor Measurement](./open-questions.md)

---

## Tier 5 — Code Health And Tooling

Internal maintainability and contributor workflow. No user-facing impact.
Execute in any order.

- [ ] **`dev` Split `gameApi.ts` local fallback** (refactor score 8/10)
  Extract local prototype entitlement storage and completion into a separate
  module so the production Supabase path is easier to review.
  Detail: [`docs/tracking/code-refactor-checklist.md`](./tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `AdminQuestionEditor.tsx`** (refactor score 7/10)
  Extract `AdminQuestionList` and `AdminOptionEditor` so the top-level editor
  reads as buffer/save orchestration.
  Detail: [`docs/tracking/code-refactor-checklist.md`](./tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `capture-ui-review.cjs` admin mode** (refactor score 7/10)
  Extract admin-specific Supabase mocks and admin screenshot sequences into
  focused helper modules so the shared runner stays readable.
  Detail: [`docs/tracking/code-refactor-checklist.md`](./tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `AdminEventWorkspace.tsx`** (refactor score 6/10)
  Extract summary card, selected draft header, and action groups so the
  route-level component mainly coordinates layout and callbacks.
  Detail: [`docs/tracking/code-refactor-checklist.md`](./tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `adminGameApi.ts`** (refactor score 5/10)
  Extract shared transport and response helpers so the public exports focus on
  intent-specific admin operations.
  Detail: [`docs/tracking/code-refactor-checklist.md`](./tracking/code-refactor-checklist.md)

- [ ] **`dev` Rename phase-named pgTAP test files** (refactor score 5/10)
  `supabase/tests/database/game_authoring_phase{2,3,5_1}_*.test.sql` are named
  after the authoring rollout phase that produced them, not the surface they
  test. Rename to `<feature>_<aspect>.test.sql` to match the convention set by
  `event_code_data_model.test.sql` and `redemption_data_model.test.sql`. Pure
  rename, behavior-preserving.
  Detail: [`docs/tracking/code-refactor-checklist.md`](./tracking/code-refactor-checklist.md)

- [ ] **`dev` Stable PR screenshot upload path**
  Add `npm run ui:review:upload` backed by a scriptable durable provider so
  agents have a consistent, documented path for uploading UX review images.
  Detail: [`docs/tracking/dev-workflow-improvements.md` — Add a stable PR screenshot upload path](./tracking/dev-workflow-improvements.md)

- [ ] **`ux` Event details inline vs. dedicated route**
  Decide whether event details should remain in the selected workspace or move
  to a dedicated route once the page gets denser.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Decide whether event details should stay inline](./tracking/admin-ux-roadmap.md)

- [ ] **`dev` Broader Playwright coverage**
  Add retry-after-401, backend failure states, and post-merge nightly integration
  scenarios once the core suite is stable.
  Detail: [`docs/testing.md` — Soon After / Later Only If Needed](./testing.md)

- [ ] **`decision` Trust boundary for live events**
  Determine whether browser-session dedupe is sufficient once the product is
  used at real events or whether person-level or device-level controls are
  needed.
  Detail: [`docs/open-questions.md` — Trust Boundary And Abuse Controls](./open-questions.md)
