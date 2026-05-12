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
- Add new items in the correct tier with a one-line why and a `Detail:` link, `N/A`, or `TBD`.
- Frame entries by goal/problem, not solution. One illustrative option allowed; mark it as one option among several, not the prescription.
- `decision` items require a product or design choice before dev work can
  start. `dev`, `ux`, and `infra` items are ready to execute.

**Detail file locations:**

- Open questions and product decisions: [`docs/open-questions.md`](/docs/open-questions.md)
- Terminology migration planning: [`docs/plans/archive/terminology-migration-strategy.md`](/docs/plans/archive/terminology-migration-strategy.md)
- Admin live-status fix plan: [`docs/plans/archive/admin-live-status-plan.md`](/docs/plans/archive/admin-live-status-plan.md)
- Admin UX polish: [`docs/tracking/admin-ux-roadmap.md`](/docs/tracking/admin-ux-roadmap.md)
- Contributor workflow tooling: [`docs/tracking/dev-workflow-improvements.md`](/docs/tracking/dev-workflow-improvements.md)
- Continuous deployment roadmap: [`docs/tracking/continuous-deployment-roadmap.md`](/docs/tracking/continuous-deployment-roadmap.md)
- Security and abuse tracking: [`docs/tracking/security-and-abuse.md`](/docs/tracking/security-and-abuse.md)
- Code refactors: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)
- Test coverage rollout: [`docs/testing.md`](/docs/testing.md)
- Deferred authoring features: [`docs/plans/archive/quiz-authoring-plan.md`](/docs/plans/archive/quiz-authoring-plan.md)
- Release gates, quality-check methodology, and live release-blocking view: [`docs/tracking/release-readiness.md`](/docs/tracking/release-readiness.md)

---

## Tier 1 — Live Event Readiness

Must be resolved before QR codes are printed or the first real event runs.

_No open items._

---

## Tier 2 — Operational Confidence

Reduce deployment risk and contributor friction before the live event.

- [ ] **`dev` Assert allowlist-filtered zero-row access on `game_event_admin_status`**
  Slice 2 added view grant checks, but its pgTAP file still relies on underlying
  `game_event_drafts` RLS coverage for the “authenticated but not allowlisted
  sees zero rows” case. Add a direct view-level assertion so future view or
  policy changes cannot widen access silently.
  Detail: [`docs/plans/archive/admin-live-status-plan.md`](/docs/plans/archive/admin-live-status-plan.md)


- [ ] **`dev` Wire demo-mode bypass Playwright suite into PR CI**
  `playwright.demo-mode-bypass.config.ts` exists and exercises the G9
  bypass-containment contract (read-only admin / redeem / redemptions
  surfaces on test-event slugs without sign-in, plus write-rejection
  via `evaluateDemoModeRejection`), but it runs only on demand from
  contributors. Add it to `.github/workflows/ci.yml` so the bypass
  contract is automated rather than relying on contributor recall.
  Detail: [`docs/tracking/release-readiness-current.md` — Pass 2026-05-04 G9 + Follow-ups](/docs/tracking/release-readiness-current.md)

- [ ] **`dev` Demo-mode misuse should be diagnosable from backend logs alone**
  `evaluateDemoModeRejection` in
  `supabase/functions/_shared/demo-mode-rejection.ts` returns a
  structured 403 response without writing a `console` log. The
  design (caller-visible failure surfacing to the UI) is correct for
  normal use, but accidental misuse on a real-event slug is invisible
  in Supabase Edge Function logs until UI feedback surfaces it. Goal:
  misuse is diagnosable from the backend logs alone without depending
  on UI feedback. One option: emit a structured log line (e.g.
  `{ event: "demo_mode_rejected", function, slug }`) at rejection
  time.
  Detail: [`docs/tracking/release-readiness-current.md` — Pass 2026-05-04 G6 + Follow-ups](/docs/tracking/release-readiness-current.md)

---

## Tier 3 — Admin Authoring Polish

Improve the authoring experience before the organizer uses it to set up a real
event.

- [ ] **`ux` Organizers can clear test entitlements on a draft event without engineering help**
  Phase 2 of the unpublish-locks fix landed Strict — `event_code`
  rotation blocks when any entitlements exist for the event, even
  on an unpublished draft. The intended use case is organizers
  issuing a few test entitlements during pre-launch authoring (to
  walk through the redemption flow themselves), then deciding to
  rotate `event_code` before going live. Today there's no
  organizer-facing path to delete entitlements on a draft event;
  it falls back to engineer-mediated SQL — the same shape of gap
  the original Tier 1 unpublish-locks entry was created to close.
  Goal: organizers can clear test entitlements on draft events on
  their own, with copy that clearly distinguishes pre-launch test
  cleanup from operator-facing redemption flows so the affordance
  doesn't bleed into live-event surfaces.
  Detail: N/A

- [ ] **`cleanup` Remove orphan `generate-event-code` Edge Function**
  The admin "Regenerate" button surfaced random server-generated event
  codes via the `generate-event-code` Edge Function. The button was removed
  in the event_code rotation UX fix once the rotation flow itself made
  it clear there's no real use case for "pick me a random new prefix"
  (the rotation use case is "I want to type a specific new code"). The
  client wrapper and its unit test came out at the same time, but the
  Edge Function under [`supabase/functions/generate-event-code/`](/supabase/functions/generate-event-code)
  and its Deno tests at [`tests/supabase/functions/generate-event-code.test.ts`](/tests/supabase/functions/generate-event-code.test.ts)
  stayed in place because removing them requires a Supabase function-
  delete step on the deployed project, which is out of scope for a UI
  PR. Goal: the dead server code is removed from both the repo and the
  deployed Supabase project.
  Detail: N/A

- [ ] **`docs` Rewrite `database-backed-quiz-content.md` and `quiz-authoring-plan.md` to target terminology**
  These two plan docs still use legacy `quiz`/`raffle` language (12 and 27
  occurrences respectively). All other docs were swept in Phases 1 and 5; these
  were deferred due to size. Rewrite narrative and headings to use
  `game`/`entitlement` names per the migration policy.
  Detail: [`docs/plans/archive/terminology-migration-map.md` — Documentation](/docs/plans/archive/terminology-migration-map.md)

- [x] **`ux` Mobile question editor layout**
  Rework the question editor stacking on narrow viewports so the question list,
  focused editor, and option controls do not crowd each other. The highest-value
  admin UX refinement before real authoring use.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Improve the mobile question editor layout](/docs/tracking/admin-ux-roadmap.md)

- [ ] **`ux` Desktop admin workspace hierarchy**
  Clarify the two-panel balance between the event summary, event-details form,
  and question editor on wide screens. Affects editing confidence before preview
  and publish controls add more surface to the same page.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Clarify the desktop admin workspace hierarchy](/docs/tracking/admin-ux-roadmap.md)

---

## Tier 4 — Post-MVP Features

Planned capabilities intentionally deferred from the MVP scope. Require product
prioritization before starting.

- [ ] **`ux` Manual attendee redemption-status refresh**
  Add a `Refresh status` affordance on the completion screen so an attendee can
  trigger a re-read without waiting for the next polling tick.
  Detail: [`docs/plans/archive/reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Timestamped attendee redeemed-state copy**
  Add redeemed-at time copy on the attendee completion screen, including the
  locale/timezone handling needed to make that timestamp trustworthy.
  Detail: [`docs/plans/archive/reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Attendee completion freshness and transient-error state**
  Surface lightweight freshness/error guidance on the completion screen so a
  long backend outage does not leave attendees staring at stale status with no
  explanation.
  Detail: [`docs/plans/archive/reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Reversal-aware attendee completion copy**
  Distinguish a row that flipped from redeemed back to unredeemed mid-session
  instead of falling back to the generic ready-for-check-in wording.
  Detail: [`docs/plans/archive/reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)

- [ ] **`dev` Admin draft preview** (Phase 4.5)
  Let an admin preview the attendee experience from the draft before publishing.
  Detail: [`docs/plans/archive/quiz-authoring-plan.md` — Phase 4.5](/docs/plans/archive/quiz-authoring-plan.md)

- [ ] **`dev` AI-assisted authoring** (Phase 4.7)
  AI-generated draft questions refined by the organizer.
  Detail: [`docs/plans/archive/quiz-authoring-plan.md` — Phase 4.7](/docs/plans/archive/quiz-authoring-plan.md)

- [ ] **`dev` Analytics and reporting**
  SQL views on `game_completions`, `game_entitlements`, and `game_starts`
  to produce per-event completion counts, score distributions, timing summaries,
  and sponsor question engagement. Follow-on: an organizer-facing reporting
  section in the admin workspace that surfaces those views for a selected event
  without requiring Supabase Studio access.
  Detail: [`docs/tracking/analytics-strategy.md`](/docs/tracking/analytics-strategy.md)

- [ ] **`ux` Organizer-managed agent assignment**
  Now that organizers have full event-scoped write access via M2's RLS
  broadening, add a way for an organizer to maintain event agents without
  requiring manual root-admin SQL edits. Unblocked by M2 phases 2.1 + 2.1.1
  + 2.1.2 (organizer authorization across PostgREST + Edge Functions).
  Detail: N/A

- [ ] **`dev` Richer publish controls**
  Expiry windows, scheduled publish, multiple games per event, and friendlier
  inactive-event behavior beyond immediate unpublish.
  Detail: [`docs/open-questions.md` — Authoring And Publishing](/docs/open-questions.md)

- [ ] **`ux` Event landing page for `/event/:slug`**
  Gameplay now lives on `/event/:slug/game`. Add an event landing surface at
  `/event/:slug` once the product starts supporting multiple experiences per
  event so navigation and URL contracts scale cleanly.
  Detail: [`docs/open-questions.md` — Product And Live Event Operation](/docs/open-questions.md)

- [ ] **`decision` Sponsor reporting requirements**
  Determine the minimum reporting slice sponsors actually need: simple inclusion
  proof, aggregate event totals, or question-level reporting.
  Detail: [`docs/open-questions.md` — Reporting And Sponsor Measurement](/docs/open-questions.md)

- [ ] **`decision` Demo-mode generalization beyond the test-event allowlist**
  M3 shipped a read-only demo-mode bypass scoped to the two
  `TEST_EVENT_SLUGS` (`harvest-block-party`, `riverside-jam`). The
  generalization question — how (and whether) demo-mode access
  extends past the hand-curated allowlist to a wider set of events
  or to a per-organizer opt-in — is deferred until partner feedback
  exposes a concrete need.
  Detail: [`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md` — Backlog Impact](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)

- [ ] **`decision` Production-friendly demo-mode for partner-onboarding scenarios**
  Today's M3 bypass is internal-partner-shaped (read-only, two test
  slugs, `noindex`). A production-friendly variant — partner-shareable
  demo state, real-feeling write affordances against scratch tables,
  and a reset story — is a separate scoping pass once partner
  feedback shapes the requirements.
  Detail: [`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md` — Backlog Impact](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)

- [ ] **`dev` Feedback + subscription plugin scoping**
  Scoping pass for a single absorbed surface that owns: a standalone
  newsletter signup page, an embeddable email-entry widget for event
  homepages, the relocated feedback page, the in-product organizer
  read + CSV export of `newsletter_opt_ins`, and the schema-namespace
  move from `public.*` to a plugin-specific schema. The data shape
  and write contract are settled — every public surface calls the
  internal `subscribe_email` SECURITY DEFINER helper with a hardcoded
  `source_surface` literal, against the append-only
  `newsletter_opt_ins` log. The plugin scoping decides UI shape,
  embedding mechanism, namespace placement, and per-surface trigger
  / copy / UX.
  Detail: TBD

---

## Tier 5 — Code Health And Tooling

Internal maintainability and contributor workflow. No user-facing impact.
Execute in any order.

- [ ] **`dev` Split `gameApi.ts` local fallback** (refactor score 8/10)
  Extract local prototype entitlement storage and completion into a separate
  module so the production Supabase path is easier to review.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `AdminQuestionEditor.tsx`** (refactor score 7/10)
  Extract `AdminQuestionList` and `AdminOptionEditor` so the top-level editor
  reads as buffer/save orchestration.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `capture-ui-review.cjs` admin mode** (refactor score 7/10)
  Extract admin-specific Supabase mocks and admin screenshot sequences into
  focused helper modules so the shared runner stays readable.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `AdminEventWorkspace.tsx`** (refactor score 6/10)
  Extract summary card, selected draft header, and action groups so the
  route-level component mainly coordinates layout and callbacks.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `adminGameApi.ts`** (refactor score 5/10)
  Extract shared transport and response helpers so the public exports focus on
  intent-specific admin operations.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Rename phase-named pgTAP test files** (refactor score 5/10)
  `supabase/tests/database/game_authoring_phase{2,3,5_1}_*.test.sql` are named
  after the authoring rollout phase that produced them, not the surface they
  test. Rename to `<feature>_<aspect>.test.sql` to match the convention set by
  `event_code_data_model.test.sql` and `redemption_data_model.test.sql`. Pure
  rename, behavior-preserving.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Stable PR screenshot upload path**
  Add `npm run ui:review:upload` backed by a scriptable durable provider so
  agents have a consistent, documented path for uploading UX review images.
  Detail: [`docs/tracking/dev-workflow-improvements.md` — Add a stable PR screenshot upload path](/docs/tracking/dev-workflow-improvements.md)

- [ ] **`db` Test-entitlement deletion requires manual unwinding of circular FK**
  Deleting an event's entitlements today requires a three-step
  transaction — clear `first_completion_id` on entitlements, delete
  the related completions, then delete the entitlements — because
  `game_entitlements` and `game_completions` reference each other
  with double-`ON DELETE RESTRICT` FKs. Surfaced during walkthrough
  validation of the event_code rotation flow; the friction recurs
  every time a maintainer resets test state on a draft event. **Goal:**
  deleting an event's entitlements should be straightforward and not
  depend on the operator knowing the FK topology. Several approaches
  could reach that goal — for example, relaxing the back-edge FK
  (`game_entitlements_first_completion_fk`) to `ON DELETE SET NULL`
  collapses the unwind to a single ordered cascade while preserving
  the denormalization for normal reads, but cascade-deleting
  completions on entitlement delete, dropping the back-edge entirely
  and deriving the first-completion lookup on demand, or wrapping the
  unwind in a service-role helper are all worth comparing at scoping
  time.
  Detail: N/A

- [ ] **`db` Current grants and RLS policies are knowable without reading every migration in order**
  `shared/db/types.ts` captures row shapes via `npm run db:gen-types`,
  but grants, RLS policies, the per-table RLS-enabled flag, function
  `SECURITY DEFINER`/`INVOKER` setting, and function `EXECUTE` grants
  are not surfaced anywhere in the repo — they are a delta-derived
  projection across 30+ migration files. A reader who lands on the
  original migration for a feature sees its initial grants and
  policies; a reader who lands on a later migration sees them revised.
  The truth requires reading both in order. This failure mode has
  already caused doc inaccuracies during canonical-correction passes,
  where feature posture was described in the pre-revocation or
  pre-relaxation shape because the original migration was treated as
  authoritative in isolation. **Goal:** a maintainer can answer "what
  grants and RLS policies are in force on table X today" from a single
  in-repo source, not by walking every migration. Several approaches
  could reach that goal — a generated artifact alongside `types.ts`
  (e.g., `shared/db/permissions.snapshot.md` or `.ts`), a runtime
  helper that queries `pg_policies` /
  `information_schema.role_table_grants`, a CI gate that fails when
  migrations land without an updated snapshot, or some combination —
  are all worth comparing at scoping time.
  Detail: [`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md)

- [ ] **`docs` Pre-push drift-prevention surfaces anchor on intended product state and right-grain contracts**
  The docs-canonical-corrections plan
  ([`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md))
  corrects 13 instances of canonical-doc drift but does not address
  why the existing pre-push surfaces — the named-audit catalog at
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) and
  the discipline list at
  [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
  — did not fire on any of them. The findings split three ways:
  enforcement-gaps (rules exist as discipline-tracker entries but not
  as catalog audits — e.g. routes-changed-in-same-pass,
  future-language conversion, active→archive ban); rule-gaps (no
  rule covers the trigger today — new SQL migration → architecture
  inventory; new Edge Function → validation-gate command list; new
  top-level doc → doc-index entry; terminology rename → cross-doc
  propagation); and grain-gaps (plan-doc contracts that specify
  *content* — specific SQL posture, specific prose — rather than
  *shape* carry the same factual exposure as the doc text they
  prescribe, deferring no verification work to PR-review time where
  SQL-level fact-checking belongs). **Goal:** before push, drift
  triggers surface framed as "does the doc describe the intended
  product state correctly, and does any plan-doc contract specify
  the right grain?" — not "do the canonical docs match each other?"
  Cross-doc consistency is a useful tripwire but matching docs
  encode wrong state just as easily as right; the authoritative
  source (SQL migrations, route configs, code) plus named design
  intent (policy comments, commit messages, plan docs) is the
  actual quality bar. One option among several: a sibling scoping
  doc audits the three gap classes against the findings, classifies
  each, and proposes catalog refinements plus new entries
  accordingly; CI-side grep gates and tooling are a parallel path,
  not a substitute. Sequences after the corrections plan merges so
  the findings inform the prevention scoping rather than racing it.
  Detail: TBD

- [ ] **`infra` Investigate planning-doc location**
  The `/docs/plans/archive/` set keeps growing, plan-only and
  plan-archive-maintenance PRs inflate the repo PR count, and plan PRs need
  different review than code PRs. Codex review against in-repo code and
  Claude Code's single-repo model rule out moving the per-phase implementation
  contract to a sibling repo; the open question is whether discussion-style
  surfaces (epic framing, scoping back-and-forth, deferred decisions) can
  move to GitHub Discussions or similar without losing their protective check.
  Detail: [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)

- [ ] **`ux` Event details inline vs. dedicated route**
  Decide whether event details should remain in the selected workspace or move
  to a dedicated route once the page gets denser.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Decide whether event details should stay inline](/docs/tracking/admin-ux-roadmap.md)

- [ ] **`dev` Broader Playwright coverage**
  Add retry-after-401, backend failure states, and post-merge nightly integration
  scenarios once the core suite is stable.
  Detail: [`docs/testing.md` — Soon After / Later Only If Needed](/docs/testing.md)

- [ ] **`decision` Trust boundary for live events**
  Determine whether browser-session dedupe is sufficient once the product is
  used at real events or whether person-level or device-level controls are
  needed.
  Detail: [`docs/open-questions.md` — Trust Boundary And Abuse Controls](/docs/open-questions.md)
