---
name: Vercel preview-deploy budget — implementation plan
description: Move preview deploys from Vercel's Git integration to a GitHub Actions workflow with a path-aware diff filter, so each push creates exactly the deployment objects it needs (and nothing else counts against the Hobby 100/day cap).
type: implementation
status: Draft (pending value-vs-effort evaluation)
---

# Vercel preview-deploy budget — implementation plan

## Status

Draft. Pending a go/no-go decision after a value-vs-effort
evaluation. The previous draft of this plan picked
`ignoreCommand` as the primary lever; that was wrong on its
premise — see "Why the previous draft was wrong" below — and
the corrected option space points to a much heavier lift. This
revision lays out the full mechanism so the cost can be weighed
against alternatives (Pro upgrade, do-nothing, branch-pattern
gating) before any code lands.

## Why the previous draft was wrong

Vercel's `ignoreCommand` (and the dashboard's "Ignored Build
Step") runs *after* Vercel has already created the deployment
object in response to a Git push. The deployment is then marked
canceled. The 100/day Hobby cap counts deployment objects, not
builds — so canceled deployments via Ignored Build Step still
consume the quota. Confirmed by Vercel maintainer in
vercel/vercel discussion #5716: "Currently: yes. Canceled
deployments via the Ignored Build Step are counted."

The same applies to Vercel's "automatically cancel outdated
deployments" auto-cancel feature.

To reduce the count, the gate has to live *upstream* of
Vercel's Git webhook — i.e., the deployment can never be
created in the first place.

## Problem

Hobby tier caps deployments at 100/day per account. Every push
to every PR creates 2 deployment objects (one per Vercel
project: `neighborly-events` for apps/web,
`neighborly-events-site` for apps/site), regardless of what the
diff touched. A single doc-only push to a draft branch
consumes 2 of the 100 daily slots. PR #205 hit the cap and
blocked the legitimate preview build until the counter rolled.

## Goal

Reduce the daily deployment count to ~1:1 with pushes that
actually change deployable code, while preserving preview-URL
ergonomics on PRs. Stay on Hobby tier unless the cost of
this approach exceeds the cost of upgrading.

## Approach

Disable Vercel's Git integration for branch pushes. Create
deployments instead from a GitHub Actions workflow that:

1. Runs on every PR push (and on `main` for production).
2. Computes the diff against the PR base.
3. Classifies changed files into web-relevant, site-relevant,
   both, or neither.
4. Calls `vercel deploy` (via the Vercel CLI authenticated
   with a repo secret) once per affected project, zero times
   if neither.
5. Posts or updates a sticky PR comment with the preview URLs.

Net effect: deployment objects = number of affected projects
across the push, never 2 unconditionally and never 0 when a
real change exists.

## Mechanism

**Vercel config changes**

- `apps/web/vercel.json`: add `git.deploymentEnabled` set to
  `{ "main": true, "*": false }`. Production deploys on main
  push continue via Vercel's normal Git path; everything else
  is gated to GHA.
- `apps/site/vercel.json`: create new file with the same
  `git.deploymentEnabled` config. (apps/site has no
  `vercel.json` today.)

**Workflow**

A new `.github/workflows/preview-deploys.yml`:

- Triggers on `pull_request` (`opened`, `synchronize`,
  `reopened`, `ready_for_review`) and `push` to `main` (the
  latter only as a backstop; main pushes also auto-deploy via
  Vercel's Git path, so the workflow short-circuits when it
  detects it's running on `main`).
- A `concurrency` group keyed on the PR number with
  `cancel-in-progress: true`, so a second push during an
  in-flight run cancels the older run before it can call
  `vercel deploy` — preventing duplicate deployment objects
  from being created on rapid consecutive pushes.
- Computes changed files via
  `git diff --name-only ${{ github.event.pull_request.base.sha }}...HEAD`.
- Invokes `scripts/vercel/classify-paths.sh` (new) which reads
  the diff list on stdin and prints `web`, `site`, both, or
  nothing on stdout, based on the path-classification table
  below.
- For each project that classifier names: runs `vercel pull`,
  `vercel build`, `vercel deploy --prebuilt` against that
  project, capturing the resulting URL.
- Calls a sticky-comment action to post the URL(s) on the PR,
  scoped by a stable comment marker so consecutive runs update
  the same comment rather than spamming.

**Secrets and IDs**

Repository secrets:

- `VERCEL_TOKEN` — account or scoped-deploy token.
- `VERCEL_ORG_ID` — repo variable, not a secret.
- `VERCEL_PROJECT_ID_WEB`, `VERCEL_PROJECT_ID_SITE` — repo
  variables.

Workflow permissions: `pull-requests: write` (for the sticky
comment), `contents: read`.

**Path classification**

A change matching any of these globs marks the project as
affected:

*apps/web (`neighborly-events`):*
- `apps/web/**`
- `shared/**`
- `package.json`, `package-lock.json`
- `tsconfig*.json` at repo root
- `.node-version`, `.nvmrc`, `mise.toml`
- `apps/web/vercel.json`, `.github/workflows/preview-deploys.yml`,
  `scripts/vercel/**`

*apps/site (`neighborly-events-site`):*
- `apps/site/**`
- `shared/**`
- `package.json`, `package-lock.json`
- `tsconfig*.json` at repo root
- `.node-version`, `.nvmrc`, `mise.toml`
- `apps/site/vercel.json`, `.github/workflows/preview-deploys.yml`,
  `scripts/vercel/**`

*Always-skip (no project affected):*
- `docs/**`
- `supabase/**`
- `tests/**`, `playwright.*.config.ts`, `vitest.config.ts`
- `scripts/**` *except* `scripts/vercel/**`
- `.github/**` *except* `.github/workflows/preview-deploys.yml`
- `AGENTS.md`, `README.md`
- `eslint.config.mjs`
- `.gitignore`, `.vercelignore`

Cross-project changes (`shared/**`, root `package.json`,
lockfile, etc.) correctly mark both projects as affected; this
is the single case where the workflow creates 2 deployments
per push, and that's correct.

## Acceptance

Verified on a real PR before the plan flips to Landed. Each
scenario lists the expected deployment-object count for the
quota:

1. **Docs-only push to a draft branch** → 0 deployment objects
   created. Sticky comment reads "no preview-affecting change
   in this push".
2. **apps/web-only push** → 1 deployment object (web only).
   Sticky comment shows the web preview URL.
3. **apps/site-only push** → 1 deployment object (site only).
   Sticky comment shows the site preview URL.
4. **`shared/**` push** → 2 deployment objects (both
   projects). Sticky comment shows both URLs.
5. **Two pushes within 30 seconds** → at most 2 deployment
   objects total per affected project (older run canceled
   before its `vercel deploy` runs). Verifies the
   `concurrency` group works.
6. **Merge to main** → production deploys on both projects via
   Vercel's existing Git path; the workflow's `main` branch
   short-circuits and creates no extra deployment objects.

Verification method: read the deployment count from the Vercel
dashboard's project deployments view immediately before and
after each scenario push.

## Out of Scope

- Moving production deploys (`main` → prod) into GHA.
  `main`-pushes continue auto-deploying via Vercel's Git
  integration with `deploymentEnabled.main = true`. A future
  consolidation could move main into GHA too for symmetry, but
  that's a separate decision and adds production-path risk.
- Replacing Vercel's auto-attached PR-comment preview URLs
  with anything beyond a sticky-comment action. Vercel's
  Git-bot comments will likely stop appearing on branch pushes
  once `deploymentEnabled: false` is in effect for branches;
  the workflow's sticky comment replaces that surface.
- Pro upgrade. If this plan's effort is judged not worth the
  return, the fallback is a separate decision item to upgrade.

## Failure modes and migration risks

**The transition is fragile.** During the cutover, any window
where (a) Vercel Git is off for branches but (b) the GHA
workflow is broken or missing means PRs get *zero* preview
deploys. Mitigation: land the workflow first with
`deploymentEnabled` still `true` for branches (the workflow
runs in shadow, doesn't gate anything), verify it produces
correct deploys for at least 3 PRs, *then* flip
`deploymentEnabled: false` in a follow-up commit.

**Concurrent-build limit on Hobby.** Hobby is limited to one
concurrent build per project. If a PR push triggers both web
and site deploys, they run sequentially, and a second PR
landing during that window queues. Not a blocker — just a
latency fact.

**Token scope.** `VERCEL_TOKEN` is broad. A scoped token
limited to the two project IDs is preferable; verify Vercel
supports project-scoped tokens at the time of implementation.
If not, the token must be treated as a high-value secret with
rotation tracked separately.

**Sticky-comment action choice.** Don't write our own; use a
maintained one (e.g. `marocchino/sticky-pull-request-comment`)
to avoid building yet another piece of infra to maintain.

**Loss of Vercel auto-checks on PRs.** Vercel currently
attaches a status check to PRs ("Vercel — Deployment ready").
Once Git integration is off for branches, that check stops
attaching. The GHA workflow's own status becomes the gate.
Tradeoff: lose one column of the GitHub status UI.

## Cost / value evaluation

**Current consumption (measured 2026-05-07).** Vercel API
shows the most recent 20 web-project deploys span ~36 hours
(timestamps 1778133462 → 1778176105), giving ~13 deploys/day
on web alone. The site project mirrors this 1:1 — every web
push also creates a site deployment regardless of diff. So
the steady-state burn rate is **~26 deployments/day across
both projects** during active development.

**Cap-pressure days.** Local commit-per-day distribution
across the last 33 active days (commits, not pushes — pushes
are typically lower because of local batching, but the upper
bound is informative):

- Median day: 32 commits → ~64 deploys/day under current
  config (commits as upper bound on pushes).
- p75: 39 commits → ~78 deploys/day.
- p95: 60 commits → ~120 deploys/day (would exceed cap).
- Max: 83 commits → ~166 deploys/day.
- 4 of 33 days (~12%) had commit volume capable of pushing
  past 100 deploys.

The single observed cap-hit (PR #205) is consistent with this
shape — it's a low-probability event per push, but the
probability is non-trivial on busy days.

**Implementation cost.** Order-of-magnitude estimate:

- Initial: ~1–2 focused days for the workflow, classifier,
  sticky-comment plumbing, and the shadow-then-flip cutover.
- Ongoing: classifier-table drift when paths change, token
  rotation, debugging when GHA flakes, and the loss of
  Vercel's auto-attached PR check column.

**Pro upgrade cost.** $20/mo = $240/yr per the public
pricing page. Removes the cap entirely; zero engineering.

**Lighter alternative — branch-pattern gating.** With
`git.deploymentEnabled: { "main": true, "<convention>/*":
false }` and a branch-naming convention (e.g. `wip/`,
`plan/`, `docs/`), Vercel skips deployment creation for
branches matching the pattern at zero engineering cost. This
relies on contributors adopting the prefix and only catches
some pushes — but it's hours of work, not days. Probably
captures ~30–50% of current waste with no infrastructure.

**The honest take.** This is a $240/yr problem that the
plan above costs ~$2k+ of engineering time (initial + first
year of maintenance, at conservative day-rates) to solve
fully. The plan is the right *technical* answer for staying
on Hobby; it is not the right *economic* answer unless one of:

- Pro upgrade is unacceptable for non-cost reasons (it
  isn't, in this case).
- The workflow has secondary value beyond cap relief — e.g.
  a future deploy-gating policy that needs custom logic Vercel
  can't express. There's no current line of sight to such a
  use case.
- The hit rate is dramatically underestimated and we'd
  blow through Pro's deployment limits too. (Pro is 6,000
  deploys/month vs. Hobby's ~3,000; comfortably above current
  burn.)

Recommendation: **don't implement this plan.** Either
upgrade to Pro (cleanest), or land the lightweight
branch-pattern gating as a stopgap and accept occasional
cap-hits during heavy days. Keep this plan in the repo as
the documented technical answer if circumstances change.

## Notes

PR #205 is the reference incident. The second push on that PR
succeeded once the daily counter rolled, so the limit is a
daily rolling cap, not a hard account block — fixes can be
validated incrementally.

The path-classification table is conservative by design: when
in doubt, classify as affected. The earlier draft of this plan
mis-classified `shared/db/types.ts` as always-skip; apps/web's
redemption code imports from `shared/db` at build time, so any
column-shape change must trigger a web rebuild. That correction
is preserved in the table above.
