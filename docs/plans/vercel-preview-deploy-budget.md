---
name: Vercel preview-deploy budget — implementation plan
description: Reduce Vercel Hobby-tier preview-deploy consumption by gating each project's preview build on a per-project path filter (`ignoreCommand` in `vercel.json`) and verifying auto-cancel-on-push is enabled.
type: implementation
status: Ready
---

# Vercel preview-deploy budget — implementation plan

## Status

Ready to implement. Decision walked below; PR is unblocked.

## Problem

The Vercel Hobby tier caps deployments at 100/day per account.
PR #205 hit this ceiling (`api-deployments-free-per-day`, "more
than 100") and blocked the preview build until the counter rolled
over. Every push to every PR — including drafts, force-pushes, and
docs-only commits — currently triggers preview builds on **both**
Vercel projects (`neighborly-events` for apps/web,
`neighborly-events-site` for apps/site), so a one-line doc edit
spends 2 of the 100 daily slots.

## Goal

Cut daily preview-deploy consumption enough that draft-heavy days
don't hit the 100/day ceiling, without losing preview coverage on
PRs that actually change deployed code.

## Decision

Two levers, in combination:

1. **Per-project path filter via `ignoreCommand`.** Each Vercel
   project's `vercel.json` declares an `ignoreCommand` that runs a
   shared script (`scripts/vercel/should-deploy.sh <project>`).
   The script inspects the diff between `VERCEL_GIT_PREVIOUS_SHA`
   and `HEAD`; if no changed file matches the project's input
   globs, it exits 0 (skip the build). Otherwise exit 1 (build).
   When `VERCEL_GIT_PREVIOUS_SHA` is missing (first build on a
   branch), default to building.

2. **Auto-cancel superseded builds.** Verify Project Settings →
   Git → "Automatically cancel outdated deployments" is enabled
   on both projects. This is a one-checkbox confirmation, not a
   code change.

Levers explicitly **rejected**:

- *Draft-state gate.* Doesn't fit the "open as draft, push 5×,
  flip to ready" workflow; would push contributors to flip ready
  earlier and defeat the gate, and would block sharing draft
  preview links for early feedback.
- *`[skip-preview]` commit token.* Relies on author memory;
  redundant once the path filter exists; two mechanisms doing
  the same job is unnecessary review surface.
- *`vercel.json` `git.deploymentEnabled` per-branch.* Strictly
  weaker than the path filter — branch-name globs can't see
  *what* changed, only *where*.

## Project inputs

A change to any path matching the project's input globs forces a
build for that project. The lists below are conservative — when
in doubt, classify as an input.

**apps/web (`neighborly-events`) inputs:**

- `apps/web/**`
- `shared/**` (apps/web imports from `shared/auth`, `shared/db`,
  `shared/events`, `shared/game-config`, `shared/redemption`,
  `shared/styles`, `shared/urls`)
- `package.json`, `package-lock.json`
- `tsconfig*.json` at repo root
- `.node-version`, `.nvmrc`, `mise.toml`
- `scripts/vercel/**` (the ignore script itself — a change to
  the gate must trigger a build so the new gate gets exercised)

**apps/site (`neighborly-events-site`) inputs:**

- `apps/site/**`
- `shared/**` (apps/site imports from `shared/auth`,
  `shared/events`, `shared/styles`, `shared/urls`)
- `package.json`, `package-lock.json`
- `tsconfig*.json` at repo root
- `.node-version`, `.nvmrc`, `mise.toml`
- `scripts/vercel/**`

**Always-skip (not an input to either project):**

- `docs/**`
- `supabase/**` (migrations, tests, edge functions — runtime is
  the DB and Supabase functions, not the Vercel projects)
- `tests/**`, `playwright.*.config.ts`, `vitest.config.ts`
- `scripts/**` *except* `scripts/vercel/**`
- `.github/**`
- `AGENTS.md`, `README.md`
- `eslint.config.mjs`
- `.gitignore`, `.vercelignore`

Cross-project changes (e.g. `shared/**`, root `package.json`)
correctly fan out to both projects — both need to rebuild.

## Implementation contract

- `apps/web/vercel.json` adds an `ignoreCommand` field invoking
  `bash scripts/vercel/should-deploy.sh web`.
- `apps/site/vercel.json` is created with `ignoreCommand`
  invoking `bash scripts/vercel/should-deploy.sh site`. (apps/site
  has no `vercel.json` today.)
- `scripts/vercel/should-deploy.sh` takes one argument
  (`web` or `site`), reads `VERCEL_GIT_PREVIOUS_SHA` from the
  environment, and runs `git diff --name-only $PREVIOUS_SHA HEAD`
  to enumerate changed files. It matches each file against the
  argument's input-glob list (the lists above) and exits 0 if
  zero matches, exit 1 otherwise. Default to exit 1 (build) if:
  - `VERCEL_GIT_PREVIOUS_SHA` is empty or unset (first build on
    branch), or
  - `git diff` returns non-zero (treat as "can't tell, build").
- Auto-cancel verification is a manual dashboard check captured
  in the PR description (screenshot or note), not a code change.

## Acceptance

All four scenarios verified on a real PR before flipping Status
to Landed:

1. **Docs-only push to a draft branch** → 0 preview deploys.
   Both projects skip. (The `vercel-preview-deploy-budget.md`
   close-out commit on the implementing PR is itself the
   regression smoke for this case.)
2. **apps/web-only push** → 1 preview deploy (web project
   builds, site project skips).
3. **apps/site-only push** → 1 preview deploy (site project
   builds, web project skips).
4. **`shared/**` push** → 2 preview deploys (both projects
   build).

For false-skip protection: if a script bug ever causes a real
apps/web or apps/site change to be skipped, the PR's tier-3+
test gates (Playwright, production smokes) would still catch the
deployed-behavior regression once the build runs — but the
acceptance scenarios above pin the gate's behavior at merge
time so we don't ship a silently-broken filter.

Auto-cancel-on-push verified at the dashboard for both
projects, captured in the PR description.

## Out of Scope

- Upgrading to Vercel Pro. This plan exists because we're
  staying on Hobby; if the path filter doesn't bring daily
  consumption under 100, that's a separate decision item.
- Changing the GitHub Actions CI matrix. Vercel-only.
- Project fan-out audit. The two known projects
  (`neighborly-events`, `neighborly-events-site`) are the
  expected set; if dashboard inspection during implementation
  reveals additional projects, disconnect them as part of this
  PR and note in the description.

## Notes

PR #205 is the reference incident. The second push on that PR
(after force-push) succeeded once the daily counter rolled
over, so the limit is a daily rolling cap, not a hard account
block — fixes can be validated incrementally.

The `ignoreCommand` runs from the project's Vercel-configured
Root Directory (e.g. `apps/web/`), but `git diff` operates
against the full repo regardless of cwd, so the script can
check paths across the whole tree.
