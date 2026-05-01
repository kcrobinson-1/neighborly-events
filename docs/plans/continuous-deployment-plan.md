# Continuous Deployment Plan

## Document Role

This document owns the plan for moving from the current low-scale release
workflow to a safer, increasingly automated continuous deployment model.

Use this doc to track:

- target end state for deployment automation
- delivery phases (`Phase 1` -> `Phase 2` -> `Phase 3`)
- environment model (`preview`, `staging`, `production`)
- decisions about staged backend strategy
- guardrails for frontend/backend compatibility during rollout

This document is planning guidance, not a release checklist. Day-to-day release
gates remain in [`release-readiness.md`](/docs/plans/release-readiness.md).

## Current State

Today the repo primarily relies on:

- local validation (`npm run validate:local` and focused commands)
- PR CI for core checks
- direct promotion to the production Supabase project
- production smoke validation after deploy

The repo is currently operating in `Phase 1` under the environment model
described below: `preview` and `production` exist today, while a stable
`staging` environment is explicitly deferred until its cost and operator burden
are justified.

This is acceptable at current scale, but it leaves limited safety margin for
schema mistakes and compatibility regressions.

## Why This Matters (At Low Scale)

Even at low traffic, deployment failures are costly because:

- live events have fixed windows and limited recovery time
- database migrations are stateful and harder to roll back than frontend code
- one broken release can block both attendee and organizer workflows

The plan should improve safety without introducing enterprise-only process
overhead.

## Environment Model

### Preview

Purpose:

- consistent preview deployments for every PR/branch
- quick UI validation before merge

Not for:

- migration rehearsal
- stable backend release gating

### Staging

Purpose:

- stable pre-production environment for backend validation
- migration rehearsal before production
- stable auth, origin, and smoke-test rehearsal

Requirements:

- non-production frontend target
- non-production Supabase target
- separate secrets and auth/origin configuration from production

Current status:

- deferred for now
- future implementation remains open between a separate persistent staging
  project and Supabase branching once account tier and operator cost justify it

### Production

Purpose:

- live attendee and organizer traffic
- real event operations

## Delivery Phases

### Phase 1 (near-term safety baseline)

Goals:

- required CI checks for production-targeting changes
- explicit deployment ownership and rollback playbook
- safer direct promotion to production without adding more long-lived
  environments

Exit criteria:

- protected production branch with required checks enabled
- direct production pushes constrained by required checks and deployment workflow
- deployment runbook documented and tested

### Phase 2 (staged confidence)

Goals:

- add one stable `staging` environment
- rehearse backend-affecting changes before production
- define a clear promotion path from tested commit to production

Exit criteria:

- staging strategy chosen and in use (persistent staging project or equivalent)
- migration + smoke checks run against staging before production
- production promotion requires successful staged validation for
  backend-affecting changes

### Phase 3 (continuous deployment)

Goals:

- automated production deployment on merge to production branch
- staged checks enforced automatically
- minimal manual steps except approvals for high-risk changes

Exit criteria:

- production deployments are pipeline-driven by default
- approval gates apply only where risk justifies them
- rollback is documented and fast enough for live-event operations

## Scope Decisions To Make

### 1) Stable staging backend strategy

Options:

- separate persistent staging Supabase project
- Supabase preview/persistent branches for pre-production validation

Selection criteria for this repo:

- low maintenance burden
- predictable migration behavior
- clear secret/env separation from production
- low cost and low operator overhead

### 2) Promotion model

Options:

- rebuild-on-promote (verify commit identity and env parity)
- promote verified preview artifact/commit with production env

Selection criteria:

- reproducibility
- operational simplicity
- clear audit trail in CI/deployment logs

### 3) Approval and branch protections

Required baseline:

- protected production branch
- required status checks before merge
- environment protections for production deployments

### Solo-safe Phase 1 profile (current operating model)

This repo is currently operated by one maintainer, so Phase 1 guardrails should
prioritize release safety without mandatory multi-reviewer workflows.

Recommended `main` settings:

- pull requests: optional (do not require PRs)
- reviewer approvals: not required
- branch protection: enabled for `main`
- required status checks: enabled for `main`
- force push: allowed for repository owner to support docs-history cleanup
- deletion: blocked for `main`

Required branch checks (use the exact workflow check names from this repo):

- `Lint, Tests, Build, and Supabase Checks` (job from the `CI` workflow)
- `Vercel` (Vercel deploy check) — Phase 1 decision: gate merges to `main`
  on a successful Vercel build for the same SHA in lieu of moving Vercel
  production promotion behind CI

Production deployment gate:

- `Release / Sync Supabase Production` runs after successful `CI` on `main`
  and should be monitored as the production promotion gate, not configured as a
  pre-merge required branch check

Conditional/operational checks (not always required on every push):

- `Production Admin Smoke / Smoke Admin On Production` (post-deploy confidence
  gate for production health)

Docs-only trigger policy:

- docs-only pull requests still run the required CI workflow, but the workflow
  short-circuits heavy validation after a lightweight scope-detection pass so
  branch protection still sees the expected check
- markdown/docs-only commits to `main` do not trigger CI, so they also do not
  trigger the production Supabase release workflow
- any change outside docs runs the full CI validation suite before production
  release can run

Release target integrity:

- require production release workflow runs to resolve an explicit target SHA
  from `workflow_run.head_sha` (CI-completion trigger) or `github.sha`
  (manual `workflow_dispatch`) and confirm that SHA was tested by a
  successful `CI` push run on `main`
- on the `workflow_run` trigger the confirmation is structural: the job's
  `if:` condition admits only `conclusion == 'success' && event == 'push'`,
  so the triggering CI run is by construction a successful main CI push
  run; an additional API re-query for the same fact is redundant and was
  removed after it flaked (eventual-consistency lag returned an empty
  result set for a CI run that demonstrably existed within minutes of CI
  completion)
- on the `workflow_dispatch` trigger the workflow runs an explicit
  `actions/runs?head_sha=...` API check, since dispatch can pick any SHA
- keep production deploy pinned to the validated target SHA rather than a
  moving branch head

### Phase 1 completion checklist

After the Phase 1 guardrail workflow changes merge, finish the milestone with
these platform and proof-run steps:

- configure GitHub `main` branch protection or ruleset settings:
  - keep pull requests optional and do not require reviewer approvals
  - block branch deletion
  - allow owner force-push if preserving docs-history cleanup remains useful
  - require `Lint, Tests, Build, and Supabase Checks / Lint, Tests, Build, and Supabase Checks`
- configure or verify the GitHub `production` environment:
  - confirm `Release` and `Production Admin Smoke` use the `production`
    environment
  - confirm release secrets exist: `SUPABASE_ACCESS_TOKEN`,
    `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_REF`
  - confirm production smoke vars and secrets exist, including
    `PRODUCTION_SMOKE_BASE_URL`, `PRODUCTION_SMOKE_SUPABASE_URL`,
    `PRODUCTION_SMOKE_PUBLISHABLE_DEFAULT_KEY`, and
    `PRODUCTION_SMOKE_SUPABASE_SERVICE_ROLE_KEY`
  - keep production environment approval disabled for solo Phase 1 unless a
    deliberate manual pause before Supabase deployment is desired
- verify Vercel production behavior:
  - production deploys remain tied to `main`
  - preview deployments remain enabled for branches and pull requests
  - production env vars point at production Supabase:
    `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - Vercel-before-CI decision for Phase 1: require the `Vercel` deploy check as
    a pre-merge status check on `main` so commits cannot land without a
    successful Vercel build for the same SHA; this is kept in place of moving
    Vercel production promotion behind CI for the Phase 1 milestone and should
    be revisited in Phase 2 if stronger gating between build success and
    production promotion is needed
- verify Supabase production settings:
  - no Supabase staging project, branching setup, or account upgrade is required
    for Phase 1
  - production function secrets exist: `SESSION_SIGNING_SECRET` and
    `ALLOWED_ORIGINS`
  - `ALLOWED_ORIGINS` includes the production Vercel origin
  - Supabase Auth Site URL and redirect URLs include the production `/admin`
    origin
  - at least one active admin email exists in `public.admin_users`
- run Phase 1 acceptance checks after merge:
  - push or merge a non-doc change and confirm full `CI` runs
  - confirm `Release / Sync Supabase Production` runs only after successful `CI`
  - confirm release checks out and deploys the validated target SHA
  - push a docs-only change and confirm `CI` and Supabase release do not run
  - run `Production Admin Smoke / Smoke Admin On Production` after a release
    and confirm it passes
- test the operator runbook once:
  - trigger production smoke manually from GitHub Actions
  - confirm smoke failure artifacts would upload on failure
  - walk the first triage locations in `operations.md`: GitHub Actions, Vercel
    deployment state, Supabase function logs, and database state

## Compatibility Strategy (Frontend + Backend)

Use backward-compatible rollout patterns by default:

- prefer additive migrations first (new columns/tables/paths)
- deploy code that can read old + new schema during transition windows
- backfill data before removing old fields
- remove deprecated schema only after all runtime paths stop using it

For potentially breaking backend changes:

1. expand schema (non-breaking)
2. deploy compatibility code
3. validate in staging/preview
4. switch writes/reads to new path
5. contract (cleanup) in later migration

## What To Avoid For Now

Given current scale and team size, avoid:

- multi-layer environment sprawl without clear ownership
- heavy bespoke release orchestration tooling
- non-reproducible dashboard-only schema edits
- coupling release safety to manual memory rather than CI/config gates
- introducing new infra that is harder to operate than the app itself

## Initial Recommended Path (Low-Scale Pragmatic)

1. enforce protected production branch + required checks
2. keep preview deployments for PR validation
3. introduce one `staging` backend path (project or branch-backed environment)
   for migration rehearsal when budget and operator cost justify it
4. require staged validation for backend-affecting changes once `staging`
   exists
5. automate production deploy on merge once the staged flow is reliable

## Tracking And Ownership

- Backlog tracker:
  [`backlog.md` — Tier 2 decision on stable staging backend path](/docs/backlog.md)
- Related open-question ownership:
  [`open-questions.md` — Development And Release Workflow](/docs/open-questions.md)

## External References (Best-Practice Inputs)

- Supabase maturity model:
  https://supabase.com/docs/guides/deployment/maturity-model
- Supabase branching:
  https://supabase.com/docs/guides/deployment/branching
- Supabase migration workflow:
  https://supabase.com/docs/guides/deployment/database-migrations
- GitHub protected branches:
  https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub environments/deployment protections:
  https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- Vercel environments:
  https://vercel.com/docs/deployments/custom-environments
- Vercel Git deployment model:
  https://vercel.com/docs/deployments/git
- Vercel preview promotion:
  https://vercel.com/docs/deployments/promote-preview-to-production
- Expand/contract migration pattern:
  https://www.prisma.io/docs/guides/database/data-migration
