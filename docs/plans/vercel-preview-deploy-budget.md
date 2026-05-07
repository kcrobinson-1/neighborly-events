---
name: Vercel preview-deploy budget — implementation plan
description: Disable Vercel's automatic per-push preview deploys for branches and replace them with a manual-trigger flow gated by a required "preview-deploy" status check. Branches get exactly the previews they're explicitly asked for, docs-only PRs auto-pass, and the merge button stays grey until a preview has actually rendered.
type: implementation
status: Draft (recommended for implementation)
---

# Vercel preview-deploy budget — implementation plan

## Status

Draft. Recommended for implementation. Two earlier drafts of
this plan picked technical levers that didn't actually reduce
the deployment count or were disproportionate to the problem;
those rejections are recorded below so future readers
understand why the design landed here.

## Why earlier drafts were wrong

**Draft 1 (`ignoreCommand`).** Vercel's `ignoreCommand` runs
*after* Vercel has already created the deployment object in
response to a Git push. The deployment is then marked
canceled. The 100/day Hobby cap counts deployment objects, not
builds — so canceled deployments via Ignored Build Step still
consume the quota. Confirmed by Vercel maintainer in the
public Vercel discussion thread on canceled-deployment
counting (vercel/vercel discussion 5716). Auto-cancel-on-push
is the same shape — both produce a canceled deployment that
the quota counts.

**Draft 2 (full GHA-driven `vercel deploy`).** Replacing
Vercel's Git integration with a GitHub Actions workflow that
runs `vercel pull` / `vercel build` / `vercel deploy
--prebuilt` does reduce the count, but the build-out is
substantial (broad `VERCEL_TOKEN` management, custom
preview-URL plumbing, full reimplementation of what Vercel's
Git integration already does). Cost-vs-value did not justify
it against the obvious alternative of a Pro upgrade
($240/yr).

**This draft.** Keeps Vercel's Git integration, but flips
branch auto-deploys off and reuses Vercel's existing **deploy
hook** mechanism to fire previews on demand. The GHA
workflow is small — it gates a status check and posts to a
webhook URL — and the merge-button gating is the secondary
benefit that makes this worth doing on its own merits, not
just for cap relief.

## Problem

Hobby tier caps deployments at 100/day per account. Every
push to every PR creates 2 deployment objects (one per
Vercel project: `neighborly-events` for apps/web,
`neighborly-events-site` for apps/site), regardless of what
the diff touched. A docs-only push to a draft branch
consumes 2 of the 100 daily slots. The cap has been hit at
least once in the project's history, blocking a legitimate
preview build until the daily counter rolled.

Beyond the cap, there is no native gate ensuring a preview
deploy has actually been verified before merge — Vercel's
auto-attached check passes as soon as the build succeeds,
which is automatic on every push and unrelated to whether
anyone has looked at the preview.

## Goal

Two outcomes:

1. **Cap relief.** Branches consume Vercel deployment slots
   only when explicitly asked, not on every push.
2. **Required-preview gate.** Non-docs-only PRs cannot merge
   to `main` until a preview has been deployed and the
   trigger came from a human signal (comment, label, or
   ready-for-review event).

Stay on Hobby tier; preserve preview-URL ergonomics on PRs
via a sticky comment.

## Approach

Disable Vercel's Git integration for branches. Add a
GitHub Actions workflow that does two things:

- On every PR push: classify the diff. If docs-only, post
  the `preview-deploy` status check as `success` with
  description "no preview needed for docs-only changes." If
  not docs-only, post the check as `pending` with a
  human-readable description naming the trigger to fire it.
- On a trigger event (PR comment `/deploy-preview`, label
  `preview`, or `ready_for_review` transition): call Vercel's
  Deploy Hook for each affected project, poll the Vercel
  API for the resulting deployment URL, post a sticky PR
  comment with the URL(s), and flip `preview-deploy` to
  `success`.

A branch-protection rule on `main` requires `preview-deploy`
to be `success`, so the merge button stays grey until either
(a) the diff is docs-only or (b) a deploy has actually
rendered for the current head SHA.

## Mechanism

**Vercel config**

- `apps/web/vercel.json`: add
  `git.deploymentEnabled = { "main": true, "*": false }`.
  Production deploys on `main` continue via Vercel's normal
  Git path; everything else is silenced at Vercel's webhook
  handler so no deployment object is created.
- `apps/site/vercel.json`: create new file with the same
  `git.deploymentEnabled` config. (apps/site has no
  `vercel.json` today.)

**Vercel Deploy Hooks**

One Deploy Hook per project, created in the Vercel dashboard
(Settings → Git → Deploy Hooks). Each hook is a stable URL
that, when POSTed to with a `?ref=<branch>` query parameter,
creates a preview deployment for that branch's current HEAD.
Hook URLs go in repository secrets:

- `VERCEL_DEPLOY_HOOK_WEB`
- `VERCEL_DEPLOY_HOOK_SITE`

**Workflow**

A new `.github/workflows/preview-deploys.yml`:

- Triggers on `pull_request` (`opened`, `synchronize`,
  `reopened`, `ready_for_review`), `issue_comment` (PR
  comments only), and `pull_request` `labeled`.
- Job A — *gate*. Runs on `pull_request` push events.
  Computes the diff against the PR base, calls
  `scripts/vercel/classify-paths.sh` to label the change as
  `docs-only`, `web`, `site`, or `both`. Posts the
  `preview-deploy` GitHub status check on the PR head SHA:
  `success` for docs-only, `pending` otherwise. Records the
  classification result in a workflow output for Job B to
  reuse.
- Job B — *trigger*. Runs on a trigger event (one of:
  `issue_comment` matching `/deploy-preview`,
  `pull_request.labeled` with label `preview`, or
  `pull_request.ready_for_review`). Recomputes the diff and
  classification (event-source independence is cheap). For
  each affected project, POSTs to the project's Deploy Hook
  with `?ref=${{ pr.head.ref }}`. Polls the Vercel
  Deployments API filtered by branch + SHA until both
  expected deployments report `READY` or `ERROR`. Posts or
  updates a sticky PR comment with the resulting preview
  URL(s) keyed by a stable comment marker. Flips
  `preview-deploy` to `success` on the PR head SHA.
- A `concurrency` group keyed on the PR number with
  `cancel-in-progress: true` ensures rapid consecutive
  triggers cancel older runs before they post duplicate
  status checks or comments.

**Branch protection**

`main` branch protection requires the `preview-deploy`
status check. This is a one-time GitHub repository settings
change captured in the PR description.

**Path classification**

A change matching any of these globs marks the project as
affected:

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

*Docs-only (no project affected; `preview-deploy` check
auto-passes):*
- `docs/**`
- `supabase/**`
- `tests/**`, `playwright.*.config.ts`, `vitest.config.ts`
- `scripts/**` *except* `scripts/vercel/**`
- `.github/**` *except*
  `.github/workflows/preview-deploys.yml`
- `AGENTS.md`, `README.md`
- `eslint.config.mjs`
- `.gitignore`, `.vercelignore`

The classifier is conservative: a change matching *any*
project glob marks that project affected; only changes
matching *no* project globs are docs-only. Cross-project
changes (`shared/**`, root `package.json`, lockfile)
correctly mark both projects.

## Trigger choice

The workflow listens to all three trigger events; their
behaviors compose:

- **`/deploy-preview` PR comment.** Most explicit. Visible in
  the PR thread, easy to repeat after review feedback.
  Reviewers can also fire it.
- **`ready_for_review` transition.** Auto-fires when a draft
  PR is flipped to ready. Zero-effort for the common case
  ("open as draft → push 5× → mark ready").
- **`preview` label add.** Same effect as the comment, but
  the label persists in the PR header as a visible signal
  that a preview was requested.

Recommended default behavior: rely on `ready_for_review` for
the first deploy, comment `/deploy-preview` to re-trigger
after review feedback. The label is for cases where the
trigger needs to come from someone other than the author.

## Acceptance

Each scenario verified on a real PR before flipping Status
to Landed. Counts are deployment objects against the Hobby
quota, observed in the Vercel deployments view:

1. **Docs-only push, draft PR.** 0 deployment objects.
   `preview-deploy` check passes immediately as success
   with the docs-only description. Merge button enables
   once other required checks pass.
2. **apps/web-only push, draft PR.** 0 deployment objects.
   `preview-deploy` is pending. Merge button stays grey.
3. **apps/web-only PR, `/deploy-preview` comment.** 1
   deployment object (web only). Sticky comment shows web
   preview URL. `preview-deploy` flips to success. Merge
   button enables (assuming other checks).
4. **apps/site-only PR, `/deploy-preview` comment.** 1
   deployment object (site only). Sticky comment shows
   site preview URL.
5. **`shared/**` PR, `/deploy-preview` comment.** 2
   deployment objects (both projects). Sticky comment
   shows both URLs.
6. **PR flipped from draft to ready-for-review.** Triggers
   the same flow as comment trigger; deployment objects
   match the diff classification.
7. **Two consecutive `/deploy-preview` comments within 30
   seconds on the same PR.** At most 2 deployment objects
   per affected project (older run canceled by concurrency
   group before posting). Verifies cancel-in-progress.
8. **Push to PR after a successful trigger.** New
   `preview-deploy` check posted as pending on the new
   head SHA; the prior success on the old SHA does not
   count for branch protection on the new SHA. Merge button
   re-greys until next trigger.
9. **Merge to main.** Production deploys on both projects
   via Vercel's existing Git path; the workflow short-
   circuits on `main` and creates no extra deployment
   objects.

Verification method: read the deployment count from the
Vercel dashboard's project deployments view immediately
before and after each scenario push, plus the GitHub PR
status-checks UI for the merge-button state.

## Out of Scope

- Moving production deploys (`main` → prod) into GHA.
  `main`-pushes continue auto-deploying via Vercel's Git
  integration with `deploymentEnabled.main = true`.
- Replacing the sticky-comment surface with anything more
  elaborate. Vercel's Git-bot PR comments will likely stop
  appearing on branch pushes once `deploymentEnabled: false`
  is in effect for branches; the workflow's sticky comment
  replaces that surface.
- Pro upgrade as an alternative path. The recommendation
  below assumes Hobby; if circumstances change, the
  upgrade is a separate decision item.
- Custom-built deployment status checks beyond
  `preview-deploy`. Vercel's own per-build status checks
  (when present) continue to work for `main`.

## Failure modes and migration risks

**Cutover fragility.** During the transition, any window
where (a) Vercel Git is off for branches but (b) the GHA
workflow is broken or (c) branch protection requires the
new check that the workflow can't yet produce means PRs
get *zero* preview deploys *and* cannot merge. Mitigation:
land the workflow first with `deploymentEnabled` still
`true` for branches (workflow runs in shadow), then verify
the trigger flow on at least 3 PRs, then flip
`deploymentEnabled: false` and add the branch-protection
requirement in a follow-up commit.

**Concurrent-build limit on Hobby.** Hobby is limited to one
concurrent build per project. If a PR triggers both web
and site deploys, they run sequentially. A second trigger
landing during that window queues. Latency cost only.

**Deploy Hook ref handling.** Vercel's Deploy Hook deploys
the current HEAD of the branch named in the `ref` query
parameter. If a push lands between trigger fire and Vercel
reading the ref, Vercel deploys the newer SHA. Workflow
should record the SHA it expected and verify the resulting
deployment matches; on mismatch, fail the status check with
a clear message rather than silently approving the wrong
preview.

**Loss of Vercel auto-checks.** Vercel currently attaches a
"Vercel" status check on PRs. Once `deploymentEnabled: false`
is in effect for branches, that check stops appearing on
branch pushes. The workflow's `preview-deploy` check
replaces it. The doc-only auto-pass behavior is something
Vercel's check doesn't currently provide; this is a small
positive.

**Trigger spam.** A reviewer or contributor running
`/deploy-preview` repeatedly during a single review session
runs each trigger to completion (modulo concurrency
cancellation). Acceptable cost — the deploys are still
intentional and tied to human attention.

**Backlog branch-protection ordering.** If branch protection
is added before the workflow exists, all PRs immediately
become unmergeable. Cutover order: workflow first (in
shadow), verify, then flip Vercel config + add branch
protection in the same PR.

## Cost / value evaluation

**Current consumption (measured 2026-05-07).** Vercel API
shows ~26 deployments/day across both projects during
active development. ~12% of recent active days had commit
volume capable of pushing past 100/day under the current
config.

**Projected consumption under this design.** Deploy count =
(triggers per PR) × (projects affected by that diff). For
typical PRs at ~1.5 triggers per PR (mark-ready + one
re-trigger after feedback), 5 PRs/day, average 1.5 projects
affected per trigger ≈ ~11 preview deployments/day. Plus
production deploys on main merges (~5/day × 2 projects =
10/day). Total ~21/day, well under the 100/day cap with
substantial headroom.

**Implementation cost.** Order-of-magnitude: ~1 focused day.

- Workflow file with two jobs and three triggers.
- Path classifier shell script.
- Status-check write via the GitHub API.
- Sticky-comment via a maintained action (e.g.
  `marocchino/sticky-pull-request-comment`); do not write
  our own.
- Vercel API polling loop with timeout.
- Vercel config edits and dashboard Deploy Hook creation.
- Branch protection rule edit (manual, captured in PR
  description).

**Ongoing cost.** Classifier-table drift when paths change;
debugging when GHA flakes; occasional contributor
confusion about why a deploy didn't fire automatically.
Modest.

**Pro upgrade cost.** $240/yr per the public pricing page.
Lifts the cap entirely. Zero engineering. Does not
provide the merge-gate behavior.

**Recommendation: implement.** The cap relief alone is a
weak justification against the $240/yr alternative. The
combination of cap relief plus a required-preview gate
that doesn't exist on either Hobby or Pro tilts the
balance — the gate ensures that "the preview was actually
deployed for the current SHA before merge" is a structural
property of the workflow rather than a contributor-discipline
property. That property has independent value beyond the
specific Vercel-quota framing.

The lighter alternative (branch-pattern gating with a
naming convention) is cheaper but doesn't deliver the
merge-gate behavior either. If the merge-gate is dropped
from the goal, the recommendation flips back toward branch-
pattern gating or Pro upgrade.

## Notes

The cap was first hit during routine PR work; the daily
rolling counter rolled before the second push went through,
so fixes can be validated incrementally without waiting on
Vercel support.

The path-classification table is conservative by design:
when in doubt, classify as affected. The first draft of
this plan mis-classified `shared/db/types.ts` as docs-only;
apps/web's redemption code imports from `shared/db` at
build time, so any column-shape change must trigger a web
rebuild. That correction is preserved in the table above.

The Deploy Hook mechanism is documented at
`vercel.com/docs/deploy-hooks`. Vercel's
`git.deploymentEnabled` is documented at
`vercel.com/docs/project-configuration/git-configuration`.
