# Continuous Deployment Plan

## Document Role

This document owns the plan for moving from the current low-scale release
workflow to a safer, increasingly automated continuous deployment model.

Use this doc to track:

- target end state for deployment automation
- phased milestones (`beta` -> `gamma` -> `continuous deployment`)
- decisions about staged database strategy
- guardrails for frontend/backend compatibility during rollout

This document is planning guidance, not a release checklist. Day-to-day release
gates remain in [`release-readiness.md`](./release-readiness.md).

## Current State

Today the repo primarily relies on:

- local validation (`npm run validate:local` and focused commands)
- PR CI for core checks
- direct promotion to the production Supabase project
- production smoke validation after deploy

This is acceptable at current scale, but it leaves limited safety margin for
schema mistakes and compatibility regressions.

## Why This Matters (At Low Scale)

Even at low traffic, deployment failures are costly because:

- live events have fixed windows and limited recovery time
- database migrations are stateful and harder to roll back than frontend code
- one broken release can block both attendee and organizer workflows

The plan should improve safety without introducing enterprise-only process
overhead.

## Target Milestones

### Beta (near-term safety baseline)

Goals:

- consistent preview deployments for every PR/branch
- required PR checks before merge to production branch
- explicit deployment ownership and rollback playbook

Exit criteria:

- protected production branch with required checks enabled
- no direct production pushes outside approved workflow
- deployment runbook documented and tested

### Gamma (staged confidence)

Goals:

- stable pre-production environment for backend validation
- migration rehearsal before production
- clear promotion path from tested artifact/commit to production

Exit criteria:

- staging strategy chosen and in use (persistent staging project or equivalent)
- migration + smoke checks run against staging before production
- production promotion requires successful staged validation

### Continuous Deployment (steady-state target)

Goals:

- automated production deployment on merge to production branch
- staged checks enforced automatically
- minimal manual steps except approvals for high-risk changes

Exit criteria:

- production deployments are pipeline-driven by default
- approval gates apply only where risk justifies them
- rollback is documented and fast enough for live-event operations

## Scope Decisions To Make

### 1) Staged database strategy

Options:

- Supabase preview/persistent branches for pre-production validation
- separate persistent staging Supabase project

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
3. introduce one staging backend path (branch or project) for migration rehearsal
4. require staged validation for backend-affecting changes
5. automate production deploy on merge once staged flow is reliable

## Tracking And Ownership

- Backlog tracker:
  [`backlog.md` — Tier 2 decision on staging/branch promotion path](./backlog.md)
- Related open-question ownership:
  [`open-questions.md` — Development And Release Workflow](./open-questions.md)

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
