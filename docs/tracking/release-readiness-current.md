# Release Readiness — Current Pass

## Document Role

This file holds the **most recent** release-readiness quality-check pass.
Methodology, gate definitions, and how-to-run-a-pass instructions live in
[`/docs/plans/release-readiness.md`](/docs/plans/release-readiness.md).

When a new pass runs:

1. Move the existing entry below into
   [`/docs/tracking/release-readiness-history.md`](/docs/tracking/release-readiness-history.md)
   verbatim — do not edit prior pass entries; they are an append-only record.
2. Replace this file's pass entry with the new one, using the template in
   `release-readiness.md` "Template For A New Pass."
3. Update the Status Snapshot pointer at the top of `release-readiness.md`
   if needed.

This file is overwritten at every pass. The history file is append-only.

## Pass 2026-05-04

**Reviewer:** Claude Opus 4.7 release-readiness session
**Release target:** Madrona Music in the Playfield (initial validation
target); demo-mode bypass surfaces on `harvest-block-party` and
`riverside-jam` are also in scope as platform-readiness signal
**Release candidate commit:** `0ec68cd` (current `main` HEAD)

This pass refreshed the methodology to cover repo state that did not exist
at doc establishment (apps/site, the cross-app proxy rewrites, the
redemption MVP, demo-mode auth bypass, the `_shared/` Edge Function
helpers, the new `release.yml` workflow) before walking the gates against
the release candidate.

**Methodology refresh:**

- Owner-doc list expanded to cite reward-redemption-mvp-design.md,
  security-and-abuse-plan.md, continuous-deployment-plan.md,
  cloud-agent-reliability-plan.md, and the active epic docs.
- Scope and Release-Target checklist now name the cross-app rewrite,
  the redemption MVP, the event-scoped role helpers, and demo-mode
  bypass containment.
- Release Gates: G1/G3/G4 broadened to include redemption RPCs and
  event-scoped role enforcement; G6 broadened to include both Vercel
  projects and the cross-app rewrite; G7 doc list expanded to include
  the active epic doc(s) and reward-redemption-mvp-design.md; G8 now
  names `release.yml` and the `build:site` step; new gate **G9**
  added for demo-mode bypass containment.
- Methodology dimensions 1–5 refreshed to cover all 10 deployed Edge
  Functions, the new Playwright runners (`test:e2e:demo-mode-bypass`,
  `test:e2e:redeem`, `test:e2e:redemptions`), the new largest-files
  list (top entry now `EventRedemptionsPage.tsx` at 733 lines, plus
  `apps/site/app/(authenticated)/admin/page.tsx` at 572 lines), and
  the test-event allowlist as a single-source-of-truth surface.

**Gates:**

- G1 Trust-path: **met** for HEAD — `ci.yml` run `25306127496` on
  commit `0ec68cd` ran lint, unit tests (51 files / 470 tests), Deno
  function tests (121 tests), and `npm run test:supabase` (local
  Supabase integration + pgTAP) all green; locally re-confirmed lint,
  `npm test` (470 tests), `deno check` of all 10 Edge Functions, and
  builds for both apps.
- G2 Attendee e2e: **met** for HEAD — same `ci.yml` run includes
  `npm run test:e2e:attendee:trusted-backend`. Local re-run of the
  attendee Playwright smoke was not performed in this pass because the
  CI evidence on the release commit is canonical for this gate.
- G3 Admin production smoke + redemption operator path: **partially
  met** — `production-admin-smoke.yml` run `25306366196` on `0ec68cd`
  passed (admin auth → save → publish → unpublish, exercising the
  cross-app `/admin` rewrite); `release.yml` run `25306340650`
  promoted migrations and Vercel deploys without error. The
  redemption operator path (`/event/:slug/game/redeem` and
  `/event/:slug/game/redemptions`) is **not** included in production
  smoke today — `npm run test:e2e:redeem` and `test:e2e:redemptions`
  exist as local-only runners. Treat this as a **gap to close before
  the first event that ships volunteer redemption**, recorded as a
  follow-up below.
- G4 Starts + completion + redemption instrumentation: **met** —
  `release.yml` `25306340650` applied every migration through
  `20260427010000_broaden_event_scoped_rls.sql` to production
  Supabase; locally, the Deno function tests exercise the
  `redeem_entitlement` / `reverse_entitlement_redemption` RPC
  contracts and the demo-mode 403 short-circuit branch on every
  affected function (save-draft, publish-draft, unpublish-event,
  redeem-entitlement, reverse-entitlement-redemption).
- G5 Release-blocking open questions: **met** —
  [open-questions.md](/docs/open-questions.md) currently lists zero
  release-blocking entries; the residual M0 phase 0.3 verification
  questions track against the event-platform epic, not the Madrona
  launch milestone.
- G6 Observability: **met** for the audit walk — the live-event
  runbook in [`operations.md`](/docs/operations.md#live-monitoring-and-log-triage)
  now covers Vercel logs for both projects, the cross-app rewrite,
  Supabase Edge Function logs across all 10 deployed functions, and
  the redemption tables; `release:watch-smoke` provides post-merge
  chain evidence. The deliberate gap is that demo-mode rejection
  through `evaluateDemoModeRejection` is silent on the backend
  (returns 403 without a log line); recorded as a Tier 2 candidate
  follow-up rather than release-blocking because real-event slugs
  cannot trigger the rejection by definition.
- G7 Docs currency: **met** — `docs/architecture.md`,
  `docs/dev.md`, `docs/operations.md`, `docs/testing.md`,
  `README.md`, `docs/backlog.md`, `docs/open-questions.md`, and the
  active epic doc(s) under `docs/plans/epics/` all reflect the
  shipped state of apps/site, cross-app rewrites, demo-mode bypass,
  and the redemption MVP. This pass updated the methodology and
  gate language in
  [`release-readiness.md`](/docs/plans/release-readiness.md) to
  match.
- G8 PR CI depth: **met with one residual gap** — `ci.yml` covers
  lint, unit, Deno function tests, local Supabase integration +
  pgTAP, attendee-trusted-backend Playwright smoke, both `build:web`
  and `build:site`, and Deno checks for issue-session, complete-game,
  save-draft, generate-event-code, publish-draft, and
  unpublish-event. **Gap: PR CI does not run `deno check` against
  `read-demo-event`, `get-redemption-status`, `redeem-entitlement`,
  or `reverse-entitlement-redemption`.** Locally re-confirmed all 10
  type-check cleanly on HEAD, so this is a coverage gap rather than a
  current breakage. Recorded as a Tier 1 follow-up: extend `ci.yml`
  to deno-check every function under `supabase/functions/*/index.ts`
  rather than naming each one explicitly.
- G9 Demo-mode bypass containment: **met for the manually-walked
  evidence; not yet automated in PR CI** —
  `evaluateDemoModeRejection` is wired into save-draft, publish-draft,
  unpublish-event, redeem-entitlement, and
  reverse-entitlement-redemption, with Deno tests covering each
  function's three demo-mode branches (rejection, defer-to-401,
  defer-to-auth-gate) — confirmed via local
  `npm run test:functions`. The catchall `X-Robots-Tag` header in
  [`apps/web/vercel.json`](/apps/web/vercel.json) was unified for all
  test-event paths in PR #172. The Playwright suite
  `playwright.demo-mode-bypass.config.ts` exists and runs locally on
  demand but is not part of `ci.yml`. Recorded as a Tier 2 follow-up.

**Test coverage:**

- Locally ran `npm run lint` (clean), `npm test` (51 files / 470
  tests passing), `npm run build:web` (ok; bundle below), `npm run
  build:site` (ok; 11 static routes generated), `deno check` for
  every function under `supabase/functions/*/index.ts` (10 of 10
  pass), and `npm run test:functions` (121 Deno function tests
  passing). `npm run test:supabase`, `test:e2e:admin`,
  `test:e2e:demo-mode-bypass`, `test:e2e:redeem`, and
  `test:e2e:redemptions` were **not** re-run locally in this pass
  because they require a local Supabase stack; CI evidence on HEAD
  covers `test:supabase` and the attendee-trusted-backend smoke, and
  `production-admin-smoke.yml` covers the admin path on the deployed
  surface.
- `test:e2e:demo-mode-bypass`, `test:e2e:redeem`, and
  `test:e2e:redemptions` are **not** wired into `ci.yml`; they
  remain local-on-demand runners. Tracked as follow-ups below.

**Documentation:**

- This pass refreshed the release-readiness methodology in place
  (Owner Docs, Scope, Release Gates, all five Methodology dimensions,
  and the dated-pass template's Gates list) in
  [`release-readiness.md`](/docs/plans/release-readiness.md).
- `docs/architecture.md` and `docs/operations.md` already describe
  the cross-app routing model, demo-mode bypass, and redemption
  surfaces; `docs/dev.md` already names the Vite/Next.js bundler
  split. No new doc-currency edits were required during this pass.

**Monitoring, logging, observability:**

- The Vercel-Supabase-GitHub-Actions runbook in
  [`operations.md`](/docs/operations.md#live-monitoring-and-log-triage)
  is the current operator surface for both projects; it covers the
  cross-app `/admin` rewrite as part of the production smoke
  interpretation.
- Demo-mode rejection (`evaluateDemoModeRejection` in
  `supabase/functions/_shared/demo-mode-rejection.ts`) returns a
  structured 403 without an explicit `console` log. Recorded as a
  Tier 2 candidate observability improvement: a single structured
  log line on rejection would surface accidental misuse on a
  real-event slug before UI feedback does.

**Cleanliness:**

- Largest-file re-measurement at HEAD (excluding `node_modules`,
  `.next`, `dist`):
  `apps/web/src/pages/EventRedemptionsPage.tsx` (733),
  `shared/db/types.ts` (662, generated),
  `apps/site/app/(authenticated)/admin/page.tsx` (572),
  `apps/web/src/admin/useSelectedDraft.ts` (549),
  `supabase/functions/read-demo-event/index.ts` (494),
  `apps/web/src/pages/EventRedeemPage.tsx` (471),
  `apps/web/src/redemptions/RedemptionDetailSheet.tsx` (468),
  `supabase/functions/save-draft/index.ts` (467),
  `apps/web/src/pages/EventAdminPage.tsx` (447),
  `apps/web/src/redemptions/useReverseRedemption.ts` (335),
  `supabase/functions/publish-draft/index.ts` (315),
  `apps/web/src/admin/questionStructure.ts` (310),
  `apps/web/src/admin/AdminEventDetailsForm.tsx` (302),
  `supabase/functions/reverse-entitlement-redemption/index.ts` (298),
  `shared/events/admin.ts` (288),
  `supabase/functions/redeem-entitlement/index.ts` (276),
  `apps/web/src/game/gameSessionState.ts` (275).
- Five of the largest files are redemption-MVP / demo-mode surfaces
  (EventRedemptionsPage, EventRedeemPage, RedemptionDetailSheet,
  read-demo-event, useReverseRedemption). The
  `EventAdminWorkspace.tsx` / `useAdminDashboard.ts` /
  `questionBuilder.ts` files cited in the 2026-04-16 pass have all
  shrunk or moved as the admin-restructuring milestone landed —
  reflected in the refreshed list above.
- Architecture guardrails reviewed and intact at this scope:
  visual/admin/redemption logic in `apps/web/src`; landing/event-detail
  SSR in `apps/site/app/`; quiz definitions/scoring in
  `shared/game-config`; test-event allowlist in `shared/events/`;
  trust/persistence/redemption logic in `supabase/functions` and
  `supabase/migrations`; cross-app routing declared in
  `apps/web/vercel.json`. No new architectural drift recorded.
- Public-write backend endpoints retain database-level enforcement:
  completion via `complete_game_and_award_entitlement` (unique
  request/attempt and one-entitlement constraints); `game_starts`
  unique `(event_id, client_session_id)` + event FK; draft writes
  via primary-key/slug-lock trigger; publish/unpublish through
  transactional RPCs; redemption mutations through SECURITY DEFINER
  RPCs (`redeem_entitlement`, `reverse_entitlement_redemption`)
  with the redemption RLS policies as defense-in-depth.

**Efficiency:**

- Bundle measurement at HEAD (`npm run build:web`):
  `dist/assets/index-CUa35Clh.js` 518.91 kB / gzip 142.85 kB,
  `dist/assets/index-B0I089uA.css` 23.15 kB / gzip 4.88 kB.
  This is **+59.70 kB raw / +14.03 kB gzip** vs. the 2026-04-16
  baseline (459.21 kB / 128.82 kB). The growth is attributable to
  the redemption-MVP pages (`EventRedemptionsPage` 733 lines,
  `EventRedeemPage` 471 lines, `RedemptionDetailSheet` 468 lines,
  plus the redemption client surfaces) shipping into the same SPA
  bundle. Vite emits a "chunks larger than 500 kB" warning
  recommending dynamic-import code-splitting; recorded as a Tier 2
  candidate follow-up rather than release-blocking because the
  attendee mobile path is not on the redemption code path and the
  redemption surface is volunteer-side over Wi-Fi.
- `npm run build:site` produced 11 static routes
  (`/`, `/_not-found`, `/admin`, `/auth/callback`, `/event/[slug]`
  static-generated for `harvest-block-party` and `riverside-jam`,
  plus the OG/Twitter image variants for the same two events).
- No new query-shape or index concern recorded for this pass; the
  redemption queue paths are indexed via the redemption migrations
  and the event-role-assignments helper RPCs.

**Release-blocking open questions:**

- None. [open-questions.md](/docs/open-questions.md) currently has
  no items mirrored as release-blocking. The M0 phase 0.3
  verification questions remain open against the event-platform
  epic but not against the Madrona launch milestone.

**Go/no-go:** **go for the platform's current state on HEAD
`0ec68cd`**, conditional on the named follow-ups landing before the
**first live event that ships volunteer redemption** (currently
Madrona Music in the Playfield). The two release-relevant gaps that
are not blocking *today* but should be closed before that event
runs are: (1) extending PR CI to `deno check` every Edge Function
under `supabase/functions/*/`, and (2) adding redemption
operator-path coverage to `production-admin-smoke.yml` (or an
equivalent post-deploy check) so the volunteer flow is exercised
against the deployed backend, not only locally.

**Follow-ups opened:**

- **Tier 1, PR CI deno-check coverage:** extend
  `.github/workflows/ci.yml` to `deno check` every function under
  `supabase/functions/*/index.ts` (today it explicitly names six and
  silently skips `read-demo-event`, `get-redemption-status`,
  `redeem-entitlement`, `reverse-entitlement-redemption`). Track
  in [`backlog.md`](/docs/backlog.md).
- **Tier 1, redemption operator path on deployed surface:** add a
  smoke check (in `production-admin-smoke.yml` or a parallel
  workflow) that the redemption lookup + mark-as-redeemed +
  reverse-redemption path round-trips against the production
  fixture event before the first event that ships volunteer
  redemption. Track in [`backlog.md`](/docs/backlog.md).
- **Tier 2, demo-mode bypass Playwright in CI:** wire
  `playwright.demo-mode-bypass.config.ts` into `ci.yml` so the G9
  bypass-containment evidence is automated rather than
  contributor-on-demand. Track in [`backlog.md`](/docs/backlog.md).
- **Tier 2, demo-mode rejection log line:** emit a structured log
  line from `evaluateDemoModeRejection` when it returns a 403, so
  accidental misuse on a real-event slug is visible in Supabase
  Edge Function logs. Track in [`backlog.md`](/docs/backlog.md).
- **Tier 2, web bundle code-splitting:** the redemption-MVP pages
  pushed `apps/web/dist/assets/index-*.js` past Vite's 500 kB
  warning threshold. Evaluate dynamic-import code-splitting for the
  redemption pages so the attendee path stays lean. Track in
  [`code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md).
