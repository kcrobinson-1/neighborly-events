# Production Admin Smoke Tracking

## Purpose

This document is the source of truth for the production admin smoke workflow:

- why the workflow exists
- what it validates
- what it intentionally does not validate
- which settings and secrets must exist outside the repo
- how rollout and promotion gates are handled
- how to triage failures

This workflow complements local admin e2e (`npm run test:e2e:admin`). It does not replace local deterministic validation.

## Problem Statement

Local admin e2e proves the shipped admin workflow against a local Supabase stack, but it cannot prove deployed production behavior for:

- real Supabase Auth redirect behavior on the deployed web origin
- production `public.admin_users` allowlist enforcement
- deployed `save-draft`, `publish-draft`, and `unpublish-event` function path wiring
- release-time timing and integration behavior between Vercel deployment and Supabase promotion

Without a production smoke run, a release can pass local and CI checks but still ship a broken admin surface.

## Scope

### In Scope

The production smoke workflow verifies all of the following against a dedicated production smoke admin and smoke event:

1. Admin magic-link auth/session setup to `/admin`
2. Allowlisted admin can access drafts and workspace
3. Draft save path succeeds and persists expected state
4. Publish path succeeds and makes `/event/:slug/game` live
5. Unpublish path succeeds and returns `/event/:slug/game` to unavailable state
6. A signed-in non-allowlisted account is denied admin authoring access

### Out Of Scope

The first production smoke version intentionally excludes:

- broad role matrix testing
- cross-browser matrix testing
- visual snapshot baselines
- broad production data mutation outside the dedicated smoke event
- PR CI execution against shared production infrastructure

## Environment And Secret Contract

The workflow runs in the GitHub `production` environment.

Current release-readiness status:

- GitHub `production` environment settings are configured.
- `Production Deployed-Surface Smoke` (renamed from `Production Admin
  Smoke` when the redemption operator phase landed) passed its admin
  phase on the release-readiness branch in run `24541137250`.
- Fixture emails and event identifiers have built-in defaults. Use the optional
  fixture override variables below only when the default dedicated smoke fixture
  needs to change.

### GitHub Environment Variables

Required:

- `PRODUCTION_SMOKE_BASE_URL`
  the canonical deployed origin for smoke browser checks — the apps/site
  project, not apps/web, since the runners poll `/admin` first and that
  route exists only on apps/site
- `PRODUCTION_SMOKE_SUPABASE_URL`
  production Supabase URL
- `PRODUCTION_SMOKE_PUBLISHABLE_DEFAULT_KEY`
  production publishable key used by the admin app

Optional fixture overrides:

- `PRODUCTION_SMOKE_ADMIN_EMAIL`
  dedicated allowlisted smoke admin account email; defaults to
  `production-smoke-admin@example.com`
- `PRODUCTION_SMOKE_DENIED_ADMIN_EMAIL`
  dedicated non-allowlisted smoke account email; defaults to
  `production-smoke-denied@example.com`
- `PRODUCTION_SMOKE_EVENT_ID`
  dedicated smoke event id; defaults to `production-smoke-event`
- `PRODUCTION_SMOKE_EVENT_SLUG`
  dedicated smoke event slug; defaults to `production-smoke-event`
- `PRODUCTION_SMOKE_EVENT_NAME`
  dedicated smoke event name; defaults to `Production Smoke Event`
- `PRODUCTION_SMOKE_ADMIN_REDIRECT_URL` (optional)
  defaults to `<PRODUCTION_SMOKE_BASE_URL>/auth/callback?next=/admin`
  when omitted

### GitHub Environment Secrets

- `PRODUCTION_SMOKE_SUPABASE_SERVICE_ROLE_KEY`
  service-role key used only for smoke fixture setup/readback assertions

### Supabase Runtime Requirements

- Auth Site URL and redirect URL allowlist must include the deployed
  `<origin>/auth/callback` entry used by smoke and admin sign-in
- `public.admin_users` allowlist must permit the smoke admin and deny the smoke denied user
- the deployed web origin used by smoke must be admitted by [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts) — either present in `defaultAllowedOrigins` (the canonical apps/site Vercel alias is) or added via the additive `EXTRA_ALLOWED_ORIGINS` env var
- `save-draft`, `publish-draft`, and `unpublish-event` must be deployed and healthy

## Dedicated Smoke Fixture Ownership

The smoke workflow mutates only dedicated smoke identities and one dedicated smoke event.

Ownership model:

- release owner: confirms production smoke settings and manually reruns when needed
- repo maintainers: keep workflow/scripts/docs in sync with current admin behavior
- operations owner: rotates smoke accounts/keys and maintains environment vars/secrets

Rules:

- never point smoke env vars at organizer-owned live events
- keep smoke event slug clearly namespaced and non-user-facing
- treat smoke identities as operational test users, not contributor personal accounts

## Risk Register And Mitigations

| Risk | Why it matters | Mitigation in current implementation | Deferred follow-up |
| --- | --- | --- | --- |
| Release timing false failures | Smoke can start before deployment is fully ready | Readiness polling with bounded timeout before Playwright run | Add richer deployment-state signal if needed |
| Overlapping runs | Manual + automatic runs could race and fight over publish state | Workflow concurrency lock and single worker | Separate smoke events for parallel lanes if needed |
| Secret leakage in logs | Magic links include one-time auth tokens | Mask generated magic-link URLs and avoid trace/video capture | Add stricter artifact scrubbing if new attachments are introduced |
| Production mutation churn | Smoke changes publish status and draft state | Mutate only dedicated smoke event and reset state idempotently at run start | Add rotation/retention automation |
| Flaky remote checks | Network/auth timing can make remote checks noisy | Deterministic selectors, bounded retries, explicit failure categories | Add automated issue routing or retries policy |

## Rollout Phases And Promotion Gates

### Phase 1 (Docs)

Status: complete in repo.

- tracking doc created
- references added in backlog/testing/operations

### Phase 2 (Manual foundation)

Status: complete in repo.

- production-capable smoke harness added
- manual `workflow_dispatch` path added
- concurrency lock, readiness polling, masking, idempotent fixture setup, and single-worker execution added
- contributor docs updated with manual run and triage flow

Promotion gate to Phase 3:

- multiple successful manual production runs
- failures, when forced, map clearly to actionable categories

### Phase 3 (Post-release automation)

Status: enabled in repo.

- automatic post-release trigger enabled after successful `Release`
- manual `workflow_dispatch` rerun path retained
- backlog item closed and docs aligned

## Failure Triage Runbook

Start in GitHub Actions job logs for `Production Deployed-Surface Smoke`.

1. **Readiness failure before Playwright starts**
   - likely deployment propagation or base URL misconfiguration
   - validate `PRODUCTION_SMOKE_BASE_URL` and deployed route health
   - the specific misconfiguration to rule out first: the base URL
     pointed at apps/web rather than the canonical apps/site origin.
     `/admin` is polled first and does not exist on apps/web, and the
     poller treats 404 as deployment propagation and retries, so it
     burns the full timeout before failing as
     `Timed out waiting for /admin. Last failure: Unexpected status 404` —
     a 404 in that line means wrong origin, not a slow deploy
2. **Auth redirect or session setup failure**
   - likely Supabase Auth Site URL/redirect mismatch
   - validate Auth URL settings and `PRODUCTION_SMOKE_ADMIN_REDIRECT_URL`
3. **Allowlist failure for smoke admin**
   - likely allowlist row drift or RLS/policy regression
   - inspect `public.admin_users` for smoke admin
4. **Expected deny check fails for denied user**
   - denied user may be accidentally allowlisted
   - ensure denied account remains inactive or absent in allowlist
5. **Save/publish/unpublish failure**
   - likely function deploy/config issue, RLS regression, or RPC failure
   - inspect Edge Function logs and recent release changes
6. **Public route state mismatch after publish/unpublish**
   - likely publish transaction drift or frontend route/data loading regression
   - verify event row state and slug mapping

Escalation owner order:

1. release owner on duty
2. repo maintainer for workflow/test harness
3. Supabase ops owner for project-level auth/secrets/runtime settings

## Residual Backlog Candidates

- auto-open issue or alert routing on smoke failure
- analytics/reporting exclusion for smoke event activity
- fixture rotation and retention automation for smoke identities/event
- broader remote smoke matrix only if operationally justified

## Operator Phase (Redemption)

The workflow runs a second phase after the admin phase that exercises
the redemption operator surfaces (`/event/:slug/game/redeem`,
`/event/:slug/game/redemptions`, including reverse-redemption) on the
same dedicated smoke event the admin phase mutates. The phase landed
to close the 2026-05-04 release-readiness pass G3 redemption gap and
runs against deployed Supabase + the deployed apps/web origin.

### Scope

In scope for the redemption phase:

1. Agent magic-link auth, suffix entry, and successful redemption
   round-trip on `/event/:slug/game/redeem`.
2. Re-redeem of the same code returns `Already redeemed` and
   service-role read-back confirms `redemption_status = "redeemed"`.
3. Organizer magic-link auth, list rendering, Redeemed-chip narrowing,
   suffix-search narrowing, and detail-sheet open/close on
   `/event/:slug/game/redemptions`.
4. Organizer reverses a redeemed row from the detail sheet and
   service-role read-back confirms `redemption_status = "unredeemed"`,
   `redemption_reversed_by_role = "organizer"`, and the reason string
   round-trips.

Out of scope for the redemption phase:

- demo-mode bypass surfaces (the smoke event is not in the test-event
  allowlist; bypass paths are covered separately by the Tier 2 backlog
  item "Wire demo-mode bypass Playwright suite into PR CI")
- real-event-slug redemption coverage (smoke only mutates the
  dedicated `production-smoke-event` slug; never touches a real-event
  row)
- multi-user role-matrix beyond one agent + one organizer

### Fixture Identities

Two dedicated smoke identities are managed alongside the admin and
denied-admin identities:

- `production-smoke-redeem-agent@example.com` — receives the
  `agent` role on the dedicated smoke event via
  `event_role_assignments`. Never `admin_users` allowlisted.
  Override via `PRODUCTION_SMOKE_REDEEM_AGENT_EMAIL`.
- `production-smoke-redemptions-organizer@example.com` — receives
  the `organizer` role on the dedicated smoke event via
  `event_role_assignments`. Never `admin_users` allowlisted.
  Override via `PRODUCTION_SMOKE_REDEMPTIONS_ORGANIZER_EMAIL`.

The role-assignments are scoped to the dedicated smoke event id, so
these identities have no privileges on real-event slugs.

### Environment Variables

The redemption phase's optional fixture override variables (all
prefixed `PRODUCTION_SMOKE_REDEEM_*` or
`PRODUCTION_SMOKE_REDEMPTIONS_*`) are catalogued in
[`operations.md`](/docs/operations.md) under the GitHub `production`
environment vars list. Defaults match the dedicated identities and
the local-fixture suffix conventions (`0427` for redeem;
`0701` / `0702` / `0703` for redeemed-by-me / redeemed-by-other /
reversed-by-me).

### State Coupling Between Phases

The admin phase ends with the dedicated smoke event unpublished
(reset for deterministic publish-assertion). The redemption phase
fixture re-publishes via the service-role client at start and seeds
its entitlement rows. After the redemption phase, the event remains
published — that's an acceptable terminal state because the
dedicated smoke event is internal-only and never user-facing.
Re-running the admin phase later resets to unpublished again.

Implication for contributors running smoke locally: do not run the
redemption smoke locally while a workflow run is in flight against
the same Supabase project. The workflow's
`concurrency: production-admin-smoke cancel-in-progress: false`
serializes runs within GitHub Actions but cannot serialize against
out-of-band local invocations. (Tier 5 production smoke env vars
should not be on contributor laptops anyway per
[`testing-tiers.md`](/docs/testing-tiers.md) Anti-Patterns.)

### Risks And Mitigations

| Risk | Why it matters | Mitigation in current implementation | Deferred follow-up |
| --- | --- | --- | --- |
| Deployed CORS regression breaks credentialed fetch | The fixture/spec rely on the deployed Edge Functions emitting `Access-Control-Allow-Credentials: true` and an exact-origin Allow-Origin via `supabase/functions/_shared/cors.ts` | Source-level audit during the implementing PR confirmed the shared helper emits credentialed CORS for origins admitted by `defaultAllowedOrigins` and the additive `EXTRA_ALLOWED_ORIGINS` extras; the post-merge run is the deployed-end observation | Add a Playwright `page.route` proxy mirroring the local-Supabase Kong workaround if the deployed CORS shape ever regresses |
| Fixture state coupling produces flakes | Admin ends with event unpublished; redemption re-publishes; a misordered or partially-failed run could observe transient state | Workflow concurrency lock; redemption fixture's `ensurePublishedSmokeEvent` is idempotent; contributor docs warn against local invocations during workflow runs | Tighten if observed in practice |
| Magic-link leakage in workflow logs | Two new magic links per run; one missing mask exposes a one-time auth token in public logs | The shared `maskValueForGitHubActions` helper masks both links before Playwright uses them, mirroring the admin fixture | Stricter artifact scrubbing if new attachments are introduced |
| Role-assignment scope drift | Smoke identities receiving `admin_users` rows would silently broaden their access | Self-review audit asserts these identities live in `event_role_assignments` only; smoke runs never touch `admin_users` for them | Periodic service-role read of `admin_users` to confirm |

### Failure Triage Runbook (Redemption Phase)

In addition to the admin-phase triage above:

7. **Redeem-route or redemptions-route readiness failure before
   Playwright starts**
   - likely deployment propagation, apps/web SPA route registration, or
     the site → plugin rewrite in `apps/site/next.config.ts` — these are
     apps/web routes reached through the proxy, so either project's
     deploy can break them
   - validate `PRODUCTION_SMOKE_BASE_URL` and that
     `/event/<slug>/game/redeem` and `…/redemptions` return
     2xx/3xx via curl
8. **Agent or organizer auth/redirect failure**
   - likely Supabase Auth Site URL / redirect mismatch; confirm
     `PRODUCTION_SMOKE_REDEEM_REDIRECT_URL` and
     `PRODUCTION_SMOKE_REDEMPTIONS_REDIRECT_URL` are
     allowlisted on the deployed Supabase project
9. **Redeem call fails with CORS error in the spec network trace**
   - likely deployed CORS regression; check
     `supabase/functions/_shared/cors.ts` (the canonical defaults) and
     the deployed `EXTRA_ALLOWED_ORIGINS` env var if the operator added
     extras beyond the defaults
10. **Reversal fails or persisted state mismatch**
    - likely RLS regression on `game_entitlements` or role-helper
      predicate drift; inspect
      `supabase/migrations/20260421000200_add_event_role_helpers.sql`
      and `supabase/migrations/20260421000500_add_redemption_rls_policies.sql`
      for recent changes; check Edge Function logs for
      `redeem-entitlement` and `reverse-entitlement-redemption`

## Related Files

- workflow: `.github/workflows/production-admin-smoke.yml` (display
  name: `Production Deployed-Surface Smoke`)
- admin-phase runner: `scripts/testing/run-production-admin-smoke.cjs`
- admin-phase config: `playwright.production-admin-smoke.config.ts`
- admin-phase spec: `tests/e2e/admin-production-smoke.spec.ts`
- admin-phase fixture: `tests/e2e/admin-auth-fixture.ts`
- redemption-phase runner: `scripts/testing/run-production-redemption-smoke.cjs`
- redemption-phase config: `playwright.production-redemption-smoke.config.ts`
- redemption-phase spec: `tests/e2e/redemption-production-smoke.spec.ts`
- redemption-phase fixture: `tests/e2e/redemption-production-smoke-fixture.ts`
- post-merge chain watcher: `scripts/release/post-merge-smoke-watch.cjs`
- shared CORS helper (audited for deployed credentialed-CORS): `supabase/functions/_shared/cors.ts`
