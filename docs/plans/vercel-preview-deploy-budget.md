---
name: Vercel preview-deploy budget — implementation plan
description: Disable Vercel's automatic per-push preview deploys for branches and replace them with a manual-trigger flow gated by a required "preview-deploy" status check. Branches get exactly the previews they're explicitly asked for, docs-only PRs auto-pass, and the merge button stays grey until a preview has actually rendered.
type: implementation
status: Proposed
---

# Vercel preview-deploy budget — implementation plan

## Status

Proposed. Two earlier drafts picked levers that didn't
actually reduce the deployment count or were
disproportionate to the problem; the in-PR commit history
preserves the design walk.

## Why earlier drafts were wrong

**Draft 1 (`ignoreCommand`).** Vercel's `ignoreCommand` runs
after the deployment object has already been created. The
Hobby 100/day cap counts deployment objects, so canceled-via-
ignore deployments still consume quota. Per Vercel maintainer
in vercel/vercel discussion 5716. Auto-cancel-on-push is the
same shape.

**Draft 2 (full GHA-driven `vercel deploy`).** Replacing
Vercel's Git integration with a workflow that runs the full
build pipeline locally would work but the build-out is
disproportionate to the problem against a $240/yr Pro upgrade.

**This draft.** Keeps Vercel's Git integration. Disables
auto-deploys on branches. Triggers previews from a small GHA
workflow that calls Vercel's deployment-creation API on a
human signal. Vercel still owns building. The merge-gate
behavior (no merge until preview is verified for the head
SHA) is the secondary benefit that makes this worth doing on
its own merits.

## Problem

Hobby caps deployments at 100/day. Every push to any branch
creates 2 deployment objects (one per Vercel project)
regardless of diff content. The cap has been hit at least
once, blocking a legitimate preview build.

There is no native gate ensuring a preview was actually
deployed and verified before merge — Vercel's auto-attached
check passes as soon as the build succeeds, unrelated to
whether anyone has looked at the preview.

## Goal

Two outcomes:

1. **Cap relief.** Branches consume Vercel quota only when
   explicitly requested.
2. **Required-preview gate.** Non-docs PRs cannot merge to
   `main` until a preview has been deployed for the current
   head SHA, triggered by a human signal.

Stay on Hobby. Preserve preview-URL ergonomics.

## Approach

Disable Vercel's Git integration for branches. Add a small
GitHub Actions workflow with two jobs:

- **Gate** (every PR push): classify the diff. If docs-only,
  set the required `preview-deploy` status check on the head
  SHA to success immediately. Otherwise set it to pending.
- **Trigger** (on PR comment, label, or ready-for-review):
  for each project the diff affects, ask Vercel's API to
  create a preview deployment pinned to the PR head SHA at
  trigger time. Wait for each to settle. Update a sticky PR
  comment. Set `preview-deploy` to success only if every
  affected project's deployment reached the ready state.

Cutover swaps the two existing Vercel-attached required
checks on `main` for `preview-deploy`, atomically with the
config flip that disables branch deploys.

## Contracts the implementation must honor

These are the load-bearing invariants. Implementation
specifics (endpoint paths, field names, env var spellings,
timeout values, action versions) belong in the implementing
PR.

- **SHA pinning.** The deployment Vercel creates must be
  bound to the PR's exact head SHA captured at trigger time,
  not whatever the branch HEAD becomes during the run. The
  status check is set on the same SHA. If a new push lands
  during a trigger run, that newer SHA is unaffected by this
  run's outcome. The create-deployment endpoint's
  `gitSource` schema for `type: "github"` takes both `ref`
  (branch name, required) and `sha` (commit hash, optional)
  as separate fields; the implementation passes the PR head
  branch as `ref` and the PR head SHA as `sha`. Verify
  empirically with a curl call before the cutover that the
  resulting deployment object's `meta.githubCommitSha`
  matches the requested SHA.
- **Terminal-state contract.** The required check is set to
  success only when every affected project's deployment
  reaches the ready state. Failure or cancellation in any
  project, or the polling step exceeding a reasonable
  timeout, sets the check to failure with enough context
  (project name, inspector URL) to act on.
- **Atomic cutover.** The config flip that disables branch
  deploys and the ruleset edit that swaps the required
  Vercel checks for `preview-deploy` ride together in one
  PR. The "Vercel checks vanished but ruleset still demands
  them" window must not exist.
- **Trusted-actor only.** Triggers fire only when the actor
  is a repo collaborator (owner, member, or collaborator
  status). Comments, labels, and ready-for-review
  transitions from non-collaborators no-op.
- **Stale results can't leak.** Status checks are SHA-keyed.
  A new push posts a fresh pending check on the new SHA;
  the old SHA's prior success is irrelevant to merge.

## Path classification

A change matching any of these globs marks the project as
affected. Conservative by design: when in doubt, classify
as affected.

*apps/web (`neighborly-events`):*
- `apps/web/**`
- `shared/**`
- `package.json`, `package-lock.json`
- `tsconfig*.json` at repo root
- `.node-version`, `.nvmrc`, `mise.toml`
- `apps/web/vercel.json`,
  `.github/workflows/preview-deploys.yml`,
  `scripts/vercel/**`

*apps/site (`neighborly-events-site`):*
- `apps/site/**`
- `shared/**`
- `package.json`, `package-lock.json`
- `tsconfig*.json` at repo root
- `.node-version`, `.nvmrc`, `mise.toml`
- `apps/site/vercel.json`,
  `.github/workflows/preview-deploys.yml`,
  `scripts/vercel/**`

*Docs-only (no project affected; check auto-passes):*
- `docs/**`
- `supabase/**`
- `tests/**`, `playwright.*.config.ts`, `vitest.config.ts`
- `scripts/**` *except* `scripts/vercel/**`
- `.github/**` *except*
  `.github/workflows/preview-deploys.yml`
- `AGENTS.md`, `README.md`
- `eslint.config.mjs`
- `.gitignore`, `.vercelignore`

Cross-project changes (`shared/**`, root `package.json`,
lockfile) correctly mark both projects.

## Acceptance

Verified on real PRs before flipping Status to Landed.
Counts are deployment objects observed in the Vercel
dashboard.

| Scenario | Deployments | `preview-deploy` after trigger |
|---|---|---|
| Docs-only push | 0 | success (auto) |
| Single-project push, no trigger | 0 | pending |
| Single-project push, trigger fires, build succeeds | 1 | success |
| Cross-project push, trigger fires, both succeed | 2 | success |
| Trigger fires, one project's build fails | up to 2 | failure |
| Trigger fires, deployment exceeds polling timeout | up to 2 | failure |
| New push lands after a successful trigger | adds 0 | pending on new SHA |
| Two triggers within 30s on same PR | ≤ 2 per project | success on latest |
| Trigger from non-collaborator | 0 | unchanged (no-op) |
| Merge to `main` | per Vercel Git path | n/a (workflow short-circuits) |

## Cutover

Two phases. First a shadow phase that proves the workflow
works without gating anything; then an atomic flip.

1. **Shadow.** Land the workflow with branch auto-deploys
   still on and the ruleset unchanged. The workflow produces
   `preview-deploy` but nothing requires it. Verify behavior
   on at least three PRs covering docs-only, single-project,
   and cross-project diffs.
2. **Flip.** In one PR: set `git.deploymentEnabled` to
   `false` for branches in both `vercel.json` files; edit
   the `main` ruleset to remove the two Vercel-attached
   required checks and add `preview-deploy`. The CI check
   stays. Capture the ruleset before/after in the PR
   description.

If the cutover proves problematic, rollback is the inverse:
restore the ruleset and re-enable branch deploys. The
workflow can stay running in shadow indefinitely without
side effects.

## Out of Scope

- Moving production deploys (`main` → prod) into the
  workflow. Vercel's Git path keeps owning production.
- Pro upgrade as an alternative path. If circumstances
  change, that becomes a separate decision.
- Replacing the sticky-comment surface with anything beyond
  a maintained third-party action.

## Failure modes

- **Cutover lock-up.** If the ruleset edit lands without
  the workflow producing the new check correctly, all PRs
  go unmergeable. Mitigation: shadow phase verifies the
  check produces the right values for at least three PRs
  before the atomic flip.
- **SHA drift.** If the implementation reads the head SHA
  more than once across the run (trigger time vs. deploy
  time vs. status-check time) and they disagree, the gate
  can approve the wrong code. Mitigation: capture once at
  trigger time, pass through.
- **Token exposure.** The deployment-creation API requires
  a long-lived Vercel credential. Scope as narrowly as
  Vercel supports at implementation time. Document
  rotation. Treat as high-value secret.
- **Concurrent-build queueing within a project.** Vercel's
  per-project build queue may serialize concurrent
  deployments for the same project depending on the
  project's build-queue configuration. Cross-project
  triggers (web + site) run independently in parallel.
  Latency cost only when it manifests.

## Cost / value

**Current consumption (measured 2026-05-07).** Vercel API
shows ~26 deployments/day across both projects during
active development. ~12% of recent active days had commit
volume capable of pushing past 100/day under the current
config.

**Projected consumption.** Triggers per PR × projects per
trigger. At ~1.5 triggers per PR, 5 PRs/day, 1.5 projects
per trigger ≈ ~11 preview deployments/day. Plus production
on main merges. Comfortably under 100.

**Implementation cost.** Order of magnitude: ~1 focused
day. Workflow file, classifier, status-check call,
sticky-comment integration, polling loop, Vercel config
edits, ruleset swap.

**Pro upgrade cost.** $240/yr. Lifts the cap. Doesn't
provide the merge-gate.

**Recommendation: implement.** The merge-gate behavior is
the part Pro can't deliver and is the load-bearing
justification. Cap relief is a side effect.

## Notes

The first draft mis-classified `shared/db/types.ts` as
docs-only; it's a build-time import in apps/web's
redemption code, so any column-shape change must trigger a
rebuild. Correction preserved in the table above.

External docs referenced during scoping: Vercel deploy
hooks (rejected — branch-bound at creation, no SHA-pinning
support), Vercel `git.deploymentEnabled`, Vercel
deployment-creation API, GitHub repository rulesets.

## Verifications

Each load-bearing claim with the source it was checked
against during scoping (2026-05-07).

- **Hobby cap is 100 deployments/day; Pro is 6,000/day.**
  Verbatim from the comparison table on
  `vercel.com/docs/plans/hobby` (row "Deployments per day").
- **Pro plan price is $20 per user per month.** Same page,
  upgrade section: "Each member incurs a $20 per user /
  month charge." For a single-user team this is $240/yr.
- **`ignoreCommand` cancellations count toward the
  deployment quota.** Vercel maintainer answer in
  vercel/vercel discussion 5716: "Currently: yes. Canceled
  deployments via the Ignored Build Step are counted."
- **`git.deploymentEnabled` accepts boolean or per-branch
  object with minimatch globs.** Verbatim configuration
  examples on `vercel.com/docs/project-configuration/git-
  configuration`, including the `{ "main": true,
  "internal-*": false }` shape this plan uses.
- **Vercel deploy hooks are bound to a single branch at
  creation; there is no documented `?ref` override.**
  Confirmed by reading `vercel.com/docs/deploy-hooks` —
  only `?buildCache=false` is documented as a query
  parameter; other vendor community threads on the topic
  reach the same conclusion. Reason for rejecting hooks
  as the trigger mechanism.
- **Create-deployment endpoint's `gitSource` for `type:
  "github"` exposes `ref` and `sha` as separate fields,
  with `ref` required and `sha` optional.** Read directly
  from the OpenAPI schema embedded in
  `vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment`.
- **GitHub commit status checks are SHA-keyed.** The status
  API endpoint is `POST /repos/{owner}/{repo}/statuses/{sha}`
  per `docs.github.com/en/rest/commits/statuses`; the docs
  also note "a limit of 1000 statuses per sha and context
  within a repository," confirming SHA-scoped storage.
- **`author_association` enum values include `OWNER`,
  `MEMBER`, `COLLABORATOR`, `CONTRIBUTOR`,
  `FIRST_TIME_CONTRIBUTOR`, `FIRST_TIMER`, `MANNEQUIN`,
  `NONE`.** Per the GraphQL `CommentAuthorAssociation`
  enum at
  `docs.github.com/en/graphql/reference/enums#commentauthorassociation`.
  The trust gate's allowlist (`OWNER`, `MEMBER`,
  `COLLABORATOR`) is a subset of these.
- **Repository rulesets allow required-status-checks
  parameters editable via `gh api`.** Verified live against
  this repo: `gh api repos/kcrobinson-1/neighborly-events/
  rules/branches/main` returns the current
  `required_status_checks` array (three checks: `Lint,
  Tests, Build, and Supabase Checks`,
  `Vercel – neighborly-events-site`,
  `Vercel – neighborly-scavenger-game-web`). The cutover
  swap is a `PUT` against the ruleset's parameters.
- **Two Vercel projects exist for this repo, no fan-out.**
  Verified live via Vercel API
  `list_projects(team_YwnqllS85KRGPzNSqOBlzxa7)`:
  `neighborly-scavenger-game-web` (apps/web) and
  `neighborly-events-site` (apps/site).
- **`apps/web/vercel.json` exists; `apps/site/vercel.json`
  does not.** Verified by `ls` against the working tree.
  The cutover creates the apps/site file.
- **`shared/db` is a build-time import in apps/web.**
  `grep -rn "from .*shared/db" apps/web` finds three
  importers: [redemptions/authorizeRedemptions.ts](apps/web/src/redemptions/authorizeRedemptions.ts),
  [redeem/authorizeRedeem.ts](apps/web/src/redeem/authorizeRedeem.ts),
  [lib/supabaseBrowser.ts](apps/web/src/lib/supabaseBrowser.ts).
  Justifies the path-classifier rule that any
  `shared/**` change marks apps/web affected.

Findings that surfaced during verification:

- **The earlier draft's claim "Hobby allows one concurrent
  build per project" is not supported by Vercel's Hobby
  plan documentation.** The Hobby page lists build
  execution minutes, vCPUs, and memory but does not name a
  concurrency limit. Build-queue configuration is a
  per-project setting (`SKIP_NAMESPACE_QUEUE` vs
  `WAIT_FOR_NAMESPACE_QUEUE`) not a Hobby-tier
  restriction. The failure-modes section was reworded
  accordingly.
- **The earlier draft framed cross-project triggers as
  "running sequentially," which is also unsupported.**
  Different projects have independent build queues. Two
  projects (web + site) deploying from the same trigger
  parallelize. Reworded.
