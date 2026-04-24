# Testing Tiers

This document names the distinct testing tiers this repo uses, where each
runs, who owns the environment, what class of regression it catches, and —
critically — which tier is a valid gate for which decision.

Individual test commands are documented elsewhere: `docs/dev.md` for local
workflow, `docs/operations.md` for release operations, and
`docs/tracking/production-admin-smoke-tracking.md` for production smoke.
This doc is the cross-cutting map so plan authors and reviewers do not have
to reconstruct it from the individual docs.

## Tier Overview

| Tier | Environment | Owner | Valid pre-merge gate? |
| --- | --- | --- | --- |
| 1. Pre-edit baseline | Contributor laptop | Contributor | Yes, and required |
| 2. Pre-PR handoff | Contributor laptop | Contributor | Yes, and required |
| 3. CI on PR | GitHub Actions | Repo | Yes, and required |
| 4. UI review | Contributor laptop (Playwright) | Contributor | Yes, for UX-affecting PRs |
| 5. Post-release production smoke | GitHub `production` environment, deployed app | Release / ops owner | **No — this is a Plan-to-Landed gate, not a merge gate** |

## Tier 1 — Pre-Edit Baseline

Confirm the tree is green before changes so later failures are attributable
to the work in progress, not to pre-existing red.

Who runs it: the contributor, before the first edit for any non-trivial task.
What runs: the relevant subset of `npm run lint`, `npm run build:web`,
`npm test`, `npm run test:functions`, and the deno `--no-lock` checks for any
edge function surface expected to be touched. Exact commands by surface live
in `docs/dev.md`. When it fails: stop and report; do not edit. See AGENTS.md
"Pre-Edit Gate."

## Tier 2 — Pre-PR Handoff

Prove the branch is ready for review against the contributor's local
environment.

Who runs it: the contributor, at each commit boundary and before opening or
updating a PR. What runs: the PR template's checklist — `npm run lint`,
`npm test`, `npm run test:functions`, `npm run build:web`, plus any e2e
relevant to the diff's surface (e.g. `npm run test:e2e:admin` for admin
changes). What it catches: most unit, type, lint, build, and local-integration
regressions. When it fails: fix before opening or updating the PR. Do not
ship red and rely on CI to catch it.

## Tier 3 — CI On PR

Run the merge-gate validation in a clean environment independent of
contributor laptops, on every PR targeting `main`.

Who runs it: GitHub Actions, via `.github/workflows/ci.yml`. What runs:
a superset of Tier 2 — `npm run lint`, `npm test`,
`npm run test:functions`, `npm run test:supabase` (local Supabase
integration and database tests), `npm run test:e2e:attendee:trusted-backend`
(Playwright smoke against a trusted backend), `npm run build:web`, and
`deno check --no-lock` against six named edge functions:
`issue-session`, `complete-game`, `save-draft`, `generate-event-code`,
`publish-draft`, and `unpublish-event`. The remaining edge functions in
`supabase/functions/` (currently `redeem-entitlement`,
`reverse-entitlement-redemption`, and `get-redemption-status`) do not
have a Tier 3 `deno check` step today; plan authors touching those
should not assume CI type-checks them and should run the relevant
`deno check --no-lock` locally as part of Tier 1 or Tier 2. Docs-only
changes (paths under `docs/` or any `*.md`) skip the entire validate
job by design — the workflow detects scope upfront and gates every
validation step on non-docs-only changes.

What it catches: local-environment drift ("works on my machine"), missing
lockfile updates, test files the contributor's runner missed, and
integration regressions (Supabase DB tests, Playwright trusted-backend
smoke) that the Tier 2 subset run on a contributor laptop does not always
exercise. Valid pre-merge gate: yes. Red CI is a merge blocker.

## Tier 4 — UI Review

Catch UX, layout, interaction-flow, and user-facing-copy regressions that
unit tests cannot see.

Who runs it: the contributor, when the PR touches UX, layout, interaction,
or user-facing copy in a meaningful way. What runs: `npm run ui:review:capture`
via Playwright, mobile viewport first, against a local web app. Full
workflow in `docs/dev.md` and AGENTS.md "UI Review Runs." Valid pre-merge
gate: yes for UX-affecting PRs, with before/after screenshots linked in the
PR body per AGENTS.md "Pull Request Screenshot Process."

## Tier 5 — Post-Release Production Smoke

Catch deploy-time integration gaps that structurally cannot be reproduced
off of production infrastructure — Supabase Auth Site URL and redirect
allowlist drift, `public.admin_users` allowlist regressions, edge function
deploy/config drift, Vercel ↔ Supabase promotion timing, and route
availability on the deployed origin.

Who owns it: the release owner and ops owner. The workflow runs in the
GitHub `production` environment; secrets and environment variables live
there, not on contributor laptops. Full ownership model and env var list in
`docs/tracking/production-admin-smoke-tracking.md`.

What runs: `Production Admin Smoke`
(`.github/workflows/production-admin-smoke.yml`), which invokes
`npm run test:e2e:admin:production-smoke` against
`PRODUCTION_SMOKE_BASE_URL` — the deployed web origin. It mutates only a
dedicated smoke event and dedicated smoke admin/denied accounts.

When it runs: automatically via `workflow_run` on successful `Release`
completion against `main`, or manually via `workflow_dispatch` for reruns
and release-owner-initiated checks.

What it catches: everything Tiers 1–4 cannot see because they do not run
against the real deployed origin with real production Supabase.

**Valid pre-merge gate: no.** Production smoke runs against already-deployed
code. Any new smoke assertion added by a PR cannot pass against production
until that PR is deployed. Gating a merge on production smoke is
structurally impossible for changes that extend smoke assertions and
operationally wrong for any change, because:

- production smoke env vars are owned by the release/ops owner, not
  contributors, and should not be replicated onto contributor laptops
- the workflow is designed to run post-`Release`, not pre-merge
- requiring a smoke run pre-merge conflates "is this PR mergeable" with
  "did this change reach production cleanly," which are different questions

### Plan-to-Landed Gate For Plans That Touch Production Smoke

Plans that extend production smoke assertions, or that depend on production
smoke as final verification, land in two phases:

1. **Merge phase.** Tiers 1–4 pass. PR merges. The plan's Status is
   `In progress pending prod smoke` — this exact string, not `Landed`
   and not a paraphrase. One authoritative label keeps the carve-out
   deterministic and plan-state queryable.
2. **Landed phase.** `Release` deploys the change. The post-release
   `Production Admin Smoke` run — automatic or release-owner-dispatched —
   passes against production. The plan's Status flips to `Landed` in a
   follow-up doc commit that records both the implementing commit SHAs and
   the production smoke run URL.

This is the carve-out AGENTS.md's Plan-to-PR Completion Gate points to
for plans that extend Tier 5 assertions. The implementing PR still leaves
the plan in a named, non-drift state — `In progress pending prod smoke`
with the implementing SHAs recorded — rather than a soft post-merge
promise. The `Landed` flip lives in the follow-up doc commit that records
the production smoke run URL, not in an issue or an unwritten agreement.
Production verification is a release-owner activity downstream of the
merge, so the status flip is too.

Plans that do **not** touch production smoke do not need this two-phase
structure. Tier 1–4 handoff validation is sufficient.

## Which Tier Catches Which Class Of Regression

- unit / type / lint regressions → Tiers 1–3
- local-integration regressions against local Supabase → Tiers 2–3
- UX / layout / copy regressions → Tier 4
- deployed-origin integration regressions (Supabase Auth redirects,
  allowlist drift, edge function deploy/config drift, Vercel ↔ Supabase
  promotion) → Tier 5

If a regression class is not covered by any tier the plan gates on, name
that gap in the plan's validation section rather than assuming it is
covered.

## Anti-Patterns

- gating a PR merge on Tier 5. See "Plan-to-Landed Gate" above.
- requiring contributors to configure `PRODUCTION_SMOKE_*` env vars,
  production admin fixture emails, or production service-role keys on
  local laptops to satisfy a plan's validation. Those values live in the
  GitHub `production` environment and are owned by the release/ops owner.
- adding production smoke env vars to `apps/web/.env.example`. That file
  is the Vite frontend dev example; smoke env is orthogonal and placing
  a service-role key next to Vite-bundled variables invites a future leak.
- treating a Tier 4 screenshot pass as a substitute for Tier 5.
  Screenshots prove the UI renders; they do not prove deployed Supabase
  Auth, allowlist, or edge function behavior.

## Related Docs

- `docs/dev.md` — per-tier command reference and local workflow
- `docs/operations.md` — release and production operations
- `docs/tracking/production-admin-smoke-tracking.md` — Tier 5 details, env
  ownership, failure triage
- `AGENTS.md` — "Validation Expectations" and "Plan-to-PR Completion Gate"
