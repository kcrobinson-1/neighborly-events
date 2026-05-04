# Release Readiness — Pass History

## Document Role

This file is the **append-only archive** of release-readiness quality-check
passes. The most recent pass lives in
[`/docs/tracking/release-readiness-current.md`](/docs/tracking/release-readiness-current.md);
methodology and gate definitions live in
[`/docs/plans/release-readiness.md`](/docs/plans/release-readiness.md).

Editing rules:

- when a new pass runs, move the prior `release-readiness-current.md` entry
  here verbatim and prepend it above the previous most-recent entry
- never edit existing entries; if a follow-up resolves something a pass
  flagged, capture that in the next pass's entry, not by mutating history
- keep entries chronologically ordered, newest at the top, oldest at the
  bottom

## Pass 2026-04-17 (Scoped — Dimension 2 Documentation Audit)

**Reviewer:** docs/code-doc-audit Codex session
**Release target:** Madrona Music in the Playfield
**Scope:** Documentation-only follow-up for the Tier 5 code-documentation audit backlog item

**Documentation:**

- Completed a scoped code-documentation audit artifact at
  [`docs/tracking/code-documentation-audit.md`](/docs/tracking/code-documentation-audit.md), covering
  `shared/game-config`, `apps/web/src/lib`, `apps/web/src/admin`,
  `apps/web/src/game`, `supabase/functions`, and `supabase/migrations`.
- Classified findings as `Required`, `Optional`, and `Noise` with rationale and
  opened PR-sized remediation slices A-E.
- This pass was audit-only; no implementation code-documentation edits were
  applied yet.

**Follow-ups opened:**

- Tier 5 remediation slices in [`backlog.md`](/docs/backlog.md) for Slice A (admin),
  B (shared barrel), C (browser API), D (edge function boundaries), and E
  (migration/RPC invariants).

## Pass 2026-04-16

**Reviewer:** coordinator Codex thread
**Release target:** Madrona Music in the Playfield
**Release candidate commit:** 0265683, with follow-up smoke-evidence docs-only status update pending

**Gates:**

- G1 Trust-path: met for the coordinator branch — `npm run validate:local` passed, including `npm run test:supabase`, the real local `issue-session` plus `complete-game` integration path, and 90 pgTAP database tests
- G2 Attendee e2e: met for the coordinator branch — `npm run test:e2e` passed 3 mobile Chromium attendee smoke tests after the default Playwright config was restricted to `mobile-smoke.spec.ts`
- G3 Admin production smoke: met — GitHub run `24541137250` passed on the release-readiness branch after fixture defaults and GitHub `production` environment settings were configured
- G4 Starts + completion instrumentation: met — `npm run validate:local` exercised start-row Deno tests, local Supabase integration, and pgTAP; release workflow run `24537097693` successfully applied migrations and deployed functions at `d08f65e`, which already contained `20260416000000_add_game_starts.sql` and `20260416010000_add_game_starts_event_fk.sql`; `70977d6` is docs-only and its release job was skipped
- G5 Release-blocking open questions: met — Madrona pre-launch volunteer handoff uses the current completion screen plus verification code; stronger proof treatment is deferred until after this release
- G6 Observability: met for the coordinator branch — the live monitoring runbook in [operations.md](/docs/operations.md#live-monitoring-and-log-triage) identifies the manual operator surfaces, and `Production Admin Smoke` run `24541137250` now provides the release-candidate deployed admin signal
- G7 Docs currency: met for the coordinator branch — Dimension 2 doc-currency audit completed, with stale README release-flow and production-smoke status docs updated
- G8 PR CI depth: not met — no PR CI evidence exists for the coordinator branch yet; `.github/workflows/ci.yml` covers lint, unit tests, Deno function tests, local Supabase integration/database tests, build, and function `deno check`, while attendee Playwright smoke in PR CI remains tracked in [backlog.md](/docs/backlog.md)

**Test coverage:**

- `npm run validate:local` initially failed because `npm run test:e2e` picked up admin and production-smoke specs requiring `TEST_SUPABASE_SERVICE_ROLE_KEY`; fixed in this branch by restricting the default Playwright config to `mobile-smoke.spec.ts`.
- After that fix, `npm run validate:local` passed end to end: lint; 23 Vitest files / 175 tests; 34 Deno Edge Function tests; 3 attendee mobile Playwright smoke tests; local Supabase integration and pgTAP database tests; `npm run build:web`; and `deno check` for `issue-session`, `complete-game`, `save-draft`, `publish-draft`, and `unpublish-event`.
- `npm run test:e2e:admin` passed 1 local Supabase-backed admin Playwright test covering save, publish, unpublish, and public route verification.
- `Production Admin Smoke` run `24541137250` passed on the release-readiness branch, covering deployed admin auth, allowlist denial, draft save, publish, unpublish, and public route state against the dedicated production smoke fixture.
- Proposed Test Inventory still matches the current suite at a high level: shared-domain tests, frontend session/API/page tests, Deno Edge Function tests, pgTAP database tests, attendee mobile smoke, local admin e2e, and production admin smoke harness all exist. The known gaps remain attendee Playwright smoke in PR CI and broader Playwright retry/backend-failure coverage, both already tracked in [testing.md](/docs/testing.md) or [backlog.md](/docs/backlog.md).

**Documentation:**

- Dimension 2 audit completed for doc-currency triggers, status-oriented docs,
  area readmes, and boundary comments in the largest source files.
- `README.md` release flow was stale because it described CI, Vercel deploy,
  and Supabase release promotion but omitted the production admin smoke
  workflow. Updated it to include the post-release smoke validation step.
- `production-admin-smoke-tracking.md` described the workflow and environment
  contract but did not name the current release-readiness status. Updated it to
  record that release candidate `70977d6` has no successful production smoke
  evidence yet and points to the Tier 1 backlog item.
- Area readmes for `apps/web/src/game/`, `apps/web/src/admin/`, and
  `shared/game-config/` still match the current module ownership at a
  documentation level.
- Boundary comments for trust, persistence, and publish entrypoints in the
  largest source files are present where needed: `issue-session`,
  `complete-game`, `save-draft`, `publish-draft`, `gameApi`, and
  `adminGameApi` document the non-obvious trust, fallback, or auth-token
  behavior that affects future maintainers.

**Monitoring, logging, observability:**

- Dimension 3 audit completed for Edge Function error responses, browser API
  error surfacing, release workflow state, production smoke state, and current
  operator surfaces.
- Edge Functions currently return distinguishable HTTP statuses and structured
  JSON errors for important failure branches rather than writing explicit
  `console` logs. That posture is deliberate for the MVP: caller-visible
  failures surface to the UI, while Supabase platform request/function logs
  remain the backend investigation surface. The one deliberately swallowed
  server-side failure is `issue-session` start tracking; comments explain that
  `game_starts` is best-effort observability and must not block session
  issuance.
- Browser-visible failures are not silently dropped: attendee start errors and
  completion retry states surface through `GamePage`, and admin API failures
  throw user-facing messages consumed by the admin dashboard state.
- Live-event operator path is now documented in
  [operations.md — Live Monitoring And Log Triage](/docs/operations.md#live-monitoring-and-log-triage):
  check the latest `Production Admin Smoke` workflow result first; inspect
  Vercel deployment/runtime logs for frontend route availability; inspect
  Supabase Edge Function logs for `issue-session`, `complete-game`,
  `save-draft`, `publish-draft`, and `unpublish-event`; then verify Supabase
  table activity in `game_starts`, `game_completions`, and
  `game_entitlements` for the event.
- Analytics-critical data is present in code and local validation:
  `issue-session` records `game_starts`, and completions/entitlements are
  persisted through the trusted RPC. Production promotion evidence exists from
  release workflow run `24537097693` on commit `d08f65e`, which already included
  the starts migrations; `70977d6` was docs-only and its release job was
  skipped.
- Production admin smoke is now operational for this branch: GitHub run
  `24541137250` passed after the GitHub `production` environment settings and
  smoke fixture defaults were aligned.

**Cleanliness:**

- Dimension 4 audit completed for largest source files, architecture guardrails,
  and database enforcement behind public/origin-gated writes.
- Largest `.ts`/`.tsx` source files in the audited areas are currently:
  `questionBuilder.ts` (467), `useSelectedDraft.ts` (443),
  `AdminQuestionEditor.tsx` (438), `AdminEventWorkspace.tsx` (397),
  `draft-content.ts` (358), `gameApi.ts` (321), `useAdminDashboard.ts`
  (306), `gameSessionState.ts` (275), `publish-draft/index.ts` (263),
  `sample-games.ts` (256), and `adminGameApi.ts` (234).
- Existing refactor checklist coverage already tracks `questionBuilder.ts`,
  `AdminQuestionEditor.tsx`, `AdminEventWorkspace.tsx`,
  `draft-content.ts`, `gameApi.ts`, `useAdminDashboard.ts`,
  `sample-games.ts`, and `adminGameApi.ts` where appropriate.
- New follow-up opened in [code-refactor-checklist.md](/docs/tracking/code-refactor-checklist.md):
  split selected draft publish/unpublish state from draft loading and save
  state in `apps/web/src/admin/useSelectedDraft.ts`.
- Architecture guardrails still hold at the reviewed boundaries: visual/admin
  interaction logic remains in `apps/web/src`, shared quiz validation/scoring
  remains in `shared/game-config`, and trust/session/persistence/entitlement
  writes remain in `supabase/functions` plus `supabase/migrations`.
- Public or origin-gated backend writes have DB-level enforcement: completion
  writes go through `complete_game_and_award_entitlement` with unique
  request/attempt and one-entitlement constraints; `game_starts` has a unique
  `(event_id, client_session_id)` pair plus an event FK; draft writes have
  primary-key/slug constraints plus the slug-lock trigger; publish/unpublish go
  through transactional RPCs with audit rows and published-content constraints.

**Efficiency:**

- Dimension 5 audit completed for attendee network/state flow, Edge Function
  hot paths, database query/index coverage, and build output.
- Bundle baseline from `npm run validate:local` / `npm run build:web`:
  `dist/assets/index-DYmuva_Y.js` 459.21 kB / gzip 128.82 kB, and
  `dist/assets/index-BqpJ_O73.css` 13.21 kB / gzip 3.57 kB. This is the first
  recorded release-readiness bundle measurement, so there is no prior-pass
  trend comparison yet.
- Attendee path does not show redundant completion writes: `useGameSession`
  guards completion submission by `completionRequestId`, retry reuses the same
  request id, and `gameApi` performs at most one session re-bootstrap after a
  401 before replaying the same completion request.
- Edge Function hot paths are appropriately narrow for the MVP: session
  issuance performs one best-effort start upsert after session verification;
  completion loads the published event and parallel question/option rows, then
  persists through one RPC; publish/unpublish route through transactional RPCs.
- Database query paths have suitable constraints/indexes for hundreds of
  attendees per event: route lookups use unique `game_events.slug`, published
  content reads use `event_id`-leading primary keys, completions and
  entitlements use `(event_id, client_session_id)` indexes/constraints, and
  `game_starts` uses unique `(event_id, client_session_id)` plus an event FK.
- No new performance follow-up opened in this pass.

**Release-blocking open questions:**

- Dimension 6 audit completed against [open-questions.md](/docs/open-questions.md)
  and `decision` entries in [backlog.md](/docs/backlog.md).
- Release-blocking question resolved after the pass: for the Madrona pre-launch
  release milestone, the current completion screen plus verification code is
  sufficient for volunteer raffle handoff. Stronger proof treatment is deferred
  until after this release.
- Not release-blocking for this target: QR entry route. `experience.md`
  already says QR codes should open directly into the event game experience,
  and `/event/:slug/game` exists for that purpose; the long-term question of whether
  this should always be the production entry contract remains open in
  [open-questions.md](/docs/open-questions.md).
- Not release-blocking for this target, deferred as tracked follow-ups:
  staging/branch Supabase promotion path, sponsor reporting requirements,
  organizer roles/root admin UI, richer publish controls, multi-quiz events,
  and stronger trust-boundary/abuse controls.

**Go/no-go:** no-go — PR CI evidence is still pending for this branch.

**Follow-ups opened:**

- Resolved after pass: production admin smoke settings were configured and
  `Production Admin Smoke` run `24541137250` passed on the release-readiness
  branch.
- Resolved after pass: volunteer verification affordance for Madrona recorded in
  [backlog.md](/docs/backlog.md) and [open-questions.md](/docs/open-questions.md).
- Refactor candidate: split selected draft publish/unpublish state from draft
  loading and save state in [code-refactor-checklist.md](/docs/tracking/code-refactor-checklist.md).
