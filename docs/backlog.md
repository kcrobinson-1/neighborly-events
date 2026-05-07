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

- Open questions and product decisions: [`docs/open-questions.md`](/docs/open-questions.md)
- Terminology migration planning: [`docs/plans/archive/terminology-migration-strategy.md`](/docs/plans/archive/terminology-migration-strategy.md)
- Admin live-status fix plan: [`docs/plans/archive/admin-live-status-plan.md`](/docs/plans/archive/admin-live-status-plan.md)
- Admin UX polish: [`docs/tracking/admin-ux-roadmap.md`](/docs/tracking/admin-ux-roadmap.md)
- Contributor workflow tooling: [`docs/tracking/dev-workflow-improvements.md`](/docs/tracking/dev-workflow-improvements.md)
- Continuous deployment planning: [`docs/plans/continuous-deployment-plan.md`](/docs/plans/continuous-deployment-plan.md)
- Security and abuse planning: [`docs/plans/security-and-abuse-plan.md`](/docs/plans/security-and-abuse-plan.md)
- Code refactors: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)
- Test coverage rollout: [`docs/testing.md`](/docs/testing.md)
- Deferred authoring features: [`docs/plans/archive/quiz-authoring-plan.md`](/docs/plans/archive/quiz-authoring-plan.md)
- Release gates, quality-check methodology, and live release-blocking view: [`docs/plans/release-readiness.md`](/docs/plans/release-readiness.md)

---

## Tier 1 — Live Event Readiness

Must be resolved before QR codes are printed or the first real event runs.

- [ ] **`dev` Event-code and slug locks survive unpublish (organizer UX gap)**
  The `game_event_draft_event_code_lock` and `game_event_draft_slug_lock`
  triggers gate on `old.last_published_version_number is not null`
  (`supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql:11-29`,
  originally `supabase/migrations/20260418050000_lock_event_code_after_publish.sql:15-22`
  and `supabase/migrations/20260415000000_add_quiz_event_draft_slug_lock_trigger.sql`).
  The column was renamed from `live_version_number` to
  `last_published_version_number` on 2026-04-23 because
  `unpublish_game_event`
  (`supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql:232-291`)
  only sets `game_events.published_at = null` and writes an audit row;
  it never clears `game_event_drafts.last_published_version_number`.
  Net effect: once an event has been published once, even after
  unpublish, even with zero entitlements ever issued, the event_code
  and slug are immutable forever. That contradicts the organizer
  expectation "edit code/slug until the game goes live." Live evidence
  during Madrona M2 phase 2.1 close-out (2026-05-06,
  `docs/plans/epics/madrona-demo-build/m2-phase-2-1-plan.md`): a
  `MAD → MIP` event-code rotation on a beta event with one stale
  unredeemed entitlement was blocked by the trigger and resolved only
  via a service-role `update ... set last_published_version_number =
  null` followed by re-seed. The fact that the workaround is manual
  SQL is the gap — organizers won't run service-role queries.

  **Phased fix.** Slug and event_code have different entitlement
  coupling and ship in separate phases. This entry is the parent;
  it stays open until both phases land.

  - **Phase 1: slug — shipped 2026-05-07.** Slug has no
    entitlement coupling, so the lock relaxed cleanly: trigger
    and Edge Function pre-check read `game_events.published_at`
    directly. Scoping in
    [`docs/plans/event-code-slug-unpublish-locks.md`](/docs/plans/event-code-slug-unpublish-locks.md).
  - **Phase 2: event_code — implementation pending.** Cannot
    relax the lock the same way as slug because the redeem and
    reverse RPCs construct the lookup key as
    `<current_event_code>-<suffix>`
    (`supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql:47-62`,
    `supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql:44-59`),
    so post-rotation `MAD-0001` returns `not_found` and
    unredeemed entitlements are stranded. Scoped in
    [`docs/plans/event-code-rotation-safety.md`](/docs/plans/event-code-rotation-safety.md);
    decision is **Strict** — block post-launch rotation when
    entitlements exist. Implementation handoff at the bottom of
    the scoping doc.

  Tier 1 because both halves bite organizers at the moment they
  want a final pre-launch correction (typo, brand swap, sponsor
  rename) and the only workaround today is engineer-mediated SQL.

- [ ] **`dev` Event slug routing is case-sensitive (silent 404 on capitalized URLs)**
  `/event/Madrona/game` (capital M) returns HTTP 200 but the SPA renders
  the not-found / empty state because the slug pulled from `useParams` is
  compared byte-for-byte against the lowercase DB slug `madrona`. The
  lowercase URL works. `curl -sI` shows both casings return 200 at the
  edge, so the breakage is application-layer rather than Vercel routing.
  A printed QR with an accidentally capitalized letter, or an attendee
  hand-typing a proper-noun slug, will silently break — the exact failure
  mode this tier gates. Slug extraction lives in the apps/web event
  pages: `apps/web/src/event/` (game route) and the
  `apps/web/src/pages/Event*.tsx` admin / redeem / redemptions surfaces
  that read `useParams`. Open question for the fix: client-side
  `.toLowerCase()` normalization at the extraction sites, or an edge 308
  redirect from any non-canonical casing to the lowercase form before
  the SPA mounts.

---

## Tier 2 — Operational Confidence

Reduce deployment risk and contributor friction before the live event.

- [ ] **`dev` Assert allowlist-filtered zero-row access on `game_event_admin_status`**
  Slice 2 added view grant checks, but its pgTAP file still relies on underlying
  `game_event_drafts` RLS coverage for the “authenticated but not allowlisted
  sees zero rows” case. Add a direct view-level assertion so future view or
  policy changes cannot widen access silently.
  Detail: [`docs/plans/archive/admin-live-status-plan.md`](/docs/plans/archive/admin-live-status-plan.md)

- [ ] **`decision` Canonical user-facing origin for the platform**
  `apps/web/vercel.json` defines apps/web as canonical with rewrites
  proxying `/`, `/event/:slug`, `/admin*`, `/auth/callback`, and `/_next/*`
  to apps/site, but apps/web's `/` rewrite isn't actually firing — the
  Vite SPA's `dist/index.html` preempts it — so visitors land on apps/site
  origin directly (preview URL or auto-generated host) where cross-app
  role-door links 404 on routes that exist only in apps/web. Symmetric
  rewrites in `apps/site/next.config.ts` mirroring apps/web's cross-app
  rules landed as the cheap unblock; this entry tracks the deeper design
  question of which origin is canonical and how to enforce it — fix
  apps/web's `/` rewrite, redirect direct apps/site access to apps/web,
  or formally adopt apps/site as canonical with full reverse proxy for
  apps/web routes.
  Detail: [`docs/architecture.md`](/docs/architecture.md)

- [ ] **`infra` Reduce Vercel preview-deploy consumption on draft PRs**
  PR #205 hit the Vercel Hobby 100/day deployment cap
  (`api-deployments-free-per-day`) and blocked the preview build
  until the counter rolled over. Every push on every PR — including
  drafts, force-pushes, and docs/migration-only commits with zero
  apps/site impact — currently triggers a preview deploy. Investigate
  the lever combination (project fan-out audit, auto-cancel-on-push,
  Ignored Build Step on draft state + path filter, `vercel.json`
  per-branch gating, optional `[skip-preview]` commit token), pick a
  combination, and land it. Out of scope: upgrading to Pro, GitHub
  Actions CI changes.
  Detail: [`docs/plans/vercel-preview-deploy-budget.md`](/docs/plans/vercel-preview-deploy-budget.md)

- [ ] **`dev` Wire demo-mode bypass Playwright suite into PR CI**
  `playwright.demo-mode-bypass.config.ts` exists and exercises the G9
  bypass-containment contract (read-only admin / redeem / redemptions
  surfaces on test-event slugs without sign-in, plus write-rejection
  via `evaluateDemoModeRejection`), but it runs only on demand from
  contributors. Add it to `.github/workflows/ci.yml` so the bypass
  contract is automated rather than relying on contributor recall.
  Detail: [`docs/tracking/release-readiness-current.md` — Pass 2026-05-04 G9 + Follow-ups](/docs/tracking/release-readiness-current.md)

- [ ] **`dev` Emit a structured log line on demo-mode rejection**
  `evaluateDemoModeRejection` in
  `supabase/functions/_shared/demo-mode-rejection.ts` returns a
  structured 403 response without writing a `console` log. The
  intentional design (caller-visible failure surfacing to the UI) holds
  for normal use, but accidental misuse on a real-event slug is
  invisible in Supabase Edge Function logs until UI feedback surfaces
  it. Add a single structured log line (`{ event: "demo_mode_rejected",
  function, slug }`) so misuse is diagnosable from the backend logs
  alone.
  Detail: [`docs/tracking/release-readiness-current.md` — Pass 2026-05-04 G6 + Follow-ups](/docs/tracking/release-readiness-current.md)

---

## Tier 3 — Admin Authoring Polish

Improve the authoring experience before the organizer uses it to set up a real
event.

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
  Detail: [`docs/plans/analytics-strategy.md`](/docs/plans/analytics-strategy.md)

- [ ] **`ux` Organizer-managed agent assignment**
  Now that organizers have full event-scoped write access via M2's RLS
  broadening, add a way for an organizer to maintain event agents without
  requiring manual root-admin SQL edits. Unblocked by M2 phases 2.1 + 2.1.1
  + 2.1.2 (organizer authorization across PostgREST + Edge Functions).
  Detail: [`docs/plans/event-platform-epic.md` — Open Questions Resolved By This Epic](/docs/plans/event-platform-epic.md)

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

- [ ] **`ux` ThemeScope derived-shade cascade**
  Brand-tied derived shades (`--primary-surface`, `--secondary-focus`, etc.)
  defined on `:root` via `color-mix()` do not re-evaluate per `<ThemeScope>`
  — only the brand bases (`--primary`, `--secondary`, `--accent`) carry the
  per-event Theme to descendants. Result on test-event apps/web routes
  (Harvest game / redeem / redemptions wrapped in demo-expansion epic M1
  phase 1.1, plus the M2 phase 2.2 admin route): dominant brand colors apply
  but tinted surface backgrounds, focus rings, and glows stay warm-cream.
  Move the derivation into `themeToStyle` so each `<ThemeScope>` emits its
  own derived shades.
  Detail: [`docs/plans/themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md)

- [ ] **`dev` Stable PR screenshot upload path**
  Add `npm run ui:review:upload` backed by a scriptable durable provider so
  agents have a consistent, documented path for uploading UX review images.
  Detail: [`docs/tracking/dev-workflow-improvements.md` — Add a stable PR screenshot upload path](/docs/tracking/dev-workflow-improvements.md)

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
