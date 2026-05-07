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
  Create Deployment REST API once per affected project,
  scoped to the PR's exact head SHA; poll until each
  deployment terminates; post a sticky PR comment with the
  URL(s); set `preview-deploy` to `success` only if every
  expected deployment reached `READY`, otherwise `failure`
  with a description naming what failed.

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

**Triggering deploys**

Vercel's Deploy Hook mechanism is **not** suitable here:
hooks are bound to a fixed branch at creation time and have
no documented `ref` override (only `buildCache=false`). Using
hooks would deploy whatever branch the hook was created
against, not the PR's head SHA — `preview-deploy` could pass
on code unrelated to the PR.

Use Vercel's Create Deployment REST API instead:

- Endpoint: `POST https://api.vercel.com/v13/deployments`
- Auth: bearer token in `VERCEL_TOKEN` repo secret. Scoped
  as narrowly as Vercel supports at implementation time
  (team-scoped is the floor; project-scoped is preferable
  if available).
- Body: `name` = project name; `gitSource` = `{ type:
  'github', repo, org, ref: <PR_HEAD_SHA> }`. Passing the
  exact SHA (not the branch name) makes the deployment's
  source unambiguous and immune to races with subsequent
  pushes.
- Project IDs surfaced via repo variables
  `VERCEL_PROJECT_ID_WEB` and `VERCEL_PROJECT_ID_SITE`;
  `VERCEL_ORG_ID` likewise as a variable.

Vercel still owns the build itself — the workflow only
creates the deployment record and waits for it to settle.
No `vercel pull` / `vercel build` / `vercel deploy
--prebuilt` plumbing is needed.

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
  classification (event-source independence is cheap).
  Records the PR's head SHA at trigger time and uses it for
  the rest of the run. For each affected project, calls
  `POST /v13/deployments` with the head SHA in `gitSource.ref`,
  authenticated by `VERCEL_TOKEN` and scoped to
  `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID_*`. Captures the
  deployment ID returned by the create call and polls
  `GET /v13/deployments/{id}` against that exact ID — using
  the deployment ID (not a branch+SHA filter) means the
  polling target is unambiguous regardless of how many
  deployments share the branch and SHA. Polls until the
  deployment reaches a terminal state (`READY`, `ERROR`,
  `CANCELED`) or the polling timeout (10 minutes per
  project). Updates a sticky PR comment keyed by a stable
  marker, listing per-project status and URL where
  applicable.

  Status-check contract — the gate must distinguish three
  outcomes:

  - **All affected projects reached `READY`.** Set
    `preview-deploy` on the head SHA to `success`. Sticky
    comment lists each project's URL.
  - **Any affected project reached `ERROR` or `CANCELED`.**
    Set `preview-deploy` to `failure` with a description
    naming which project(s) failed and a link to the
    deployment inspector URL. Sticky comment surfaces the
    failure same way.
  - **Polling timeout for any affected project.** Set
    `preview-deploy` to `failure` with description "preview
    deploy did not terminate within timeout — re-trigger
    after investigating." Sticky comment names the project
    and provides the inspector URL for the in-flight
    deployment.

  In every case the status check is set on the SHA recorded
  at trigger time. If the PR has since received new
  pushes, Job A's pending check on the newer SHA still
  blocks merge — branch protection compares against the
  current head, so stale results cannot leak through.
- A `concurrency` group keyed on the PR number with
  `cancel-in-progress: true` ensures rapid consecutive
  triggers cancel older runs before they post duplicate
  status checks or comments.

**Branch protection — required-checks swap**

The repo's current `main` ruleset requires three status
checks: `Lint, Tests, Build, and Supabase Checks` (CI),
`Vercel – neighborly-events-site`, and `Vercel –
neighborly-scavenger-game-web`. The two Vercel checks are
auto-attached by Vercel's Git integration and will **stop
appearing on PR branch pushes** the moment
`git.deploymentEnabled: false` is set for branches —
without removing them from the ruleset, every PR becomes
permanently unmergeable on the new head SHA.

The cutover swap, applied in the same PR that flips
`deploymentEnabled`:

- Remove `Vercel – neighborly-events-site` from required
  checks.
- Remove `Vercel – neighborly-scavenger-game-web` from
  required checks.
- Add `preview-deploy` as a required check.
- Keep `Lint, Tests, Build, and Supabase Checks` unchanged.

The Vercel auto-checks on `main` itself (production
deploys) keep working because `deploymentEnabled.main =
true` — but the checks are scoped to PR branch pushes for
required-checks purposes, so removing them from the
ruleset doesn't affect production deploy verification.

The ruleset edit can be made via the GitHub web UI or
`gh api PUT /repos/{owner}/{repo}/rulesets/{id}`; capture
the before/after JSON in the implementing PR's
description.

**Trigger authorization**

The `/deploy-preview` comment, the `preview` label add, and
the `ready_for_review` transition all consume Vercel
deployment quota and run with secrets accessible. Restrict
who can fire them:

- For `issue_comment` events, gate on
  `github.event.comment.author_association` being one of
  `OWNER`, `MEMBER`, or `COLLABORATOR`. Reject all other
  values (`NONE`, `FIRST_TIMER`, `FIRST_TIME_CONTRIBUTOR`,
  `CONTRIBUTOR`) with a no-op (no status-check change, no
  deploy).
- For `pull_request` events (label / ready-for-review),
  gate on `github.event.pull_request.author_association`
  with the same allowlist. The PR author and the actor
  performing the label/transition can differ; gate on the
  *actor* (`github.event.sender.login` cross-checked against
  collaborator status) when the two diverge.
- The workflow uses `pull_request` (not
  `pull_request_target`), so PRs from forks have no access
  to secrets in the first place. If a future change ever
  switches to `pull_request_target`, the trigger
  authorization above becomes load-bearing for security
  rather than just quota — flag the change as
  security-sensitive in review.

The repo is currently a single-contributor private repo,
so the practical attack surface is small. The gate ships
with the workflow regardless so the trust model holds if
the repo opens up later.

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
9. **Build-failure preview.** Trigger a deploy on a PR
   whose code fails its build (e.g. introduce a TS error
   on apps/web). Vercel deployment terminates as `ERROR`.
   `preview-deploy` flips to `failure` (not `success`),
   sticky comment names the failed project and links to
   the inspector URL, merge button stays grey.
10. **Polling timeout.** Simulate a deploy that does not
    terminate within the 10-minute timeout (e.g. by
    artificially shortening the timeout to a few seconds
    in a test run). `preview-deploy` flips to `failure`
    with a clear "did not terminate within timeout"
    description. Merge button stays grey.
11. **Partial success across projects.** Trigger a
    `shared/**` change where apps/web builds successfully
    but apps/site fails (e.g. site-specific build error).
    `preview-deploy` flips to `failure`; sticky comment
    shows the web URL (since the deployment did succeed)
    and surfaces the site failure. Merge button stays
    grey.
12. **Untrusted comment trigger.** Have an account whose
    `author_association` is `NONE` or `CONTRIBUTOR`
    comment `/deploy-preview` on a PR (simulate via test
    account or `act`-style local mock). Workflow no-ops:
    no deploy fires, `preview-deploy` is unchanged, sticky
    comment is not updated. (On a single-contributor
    private repo this is a defensive verification — there's
    no actual untrusted commenter today.)
13. **Merge to main.** Production deploys on both projects
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

**Cutover fragility.** Three things must change in lockstep:
(a) `git.deploymentEnabled` flips to `false` for branches,
(b) the ruleset's required checks swap the two Vercel
auto-checks for `preview-deploy`, and (c) the GHA workflow
is producing `preview-deploy` correctly for every diff
shape. Any window where one of these three lags means PRs
either get zero preview deploys or become permanently
unmergeable.

Cutover sequence:

1. Land the workflow first with `deploymentEnabled` still
   `true` for branches and the ruleset unchanged. The
   workflow runs in *shadow* — it produces a
   `preview-deploy` status check that nothing requires.
   Verify the trigger flow on at least 3 PRs of varying
   shape (docs-only, single-project, both-project) and
   confirm `preview-deploy` settles correctly.
2. In a second PR, atomically: flip `deploymentEnabled` to
   `false` for branches in both `vercel.json` files, and
   update the ruleset to remove the two Vercel checks and
   add `preview-deploy`. These edits land together so the
   "Vercel checks vanish but ruleset still requires them"
   window doesn't exist.

**Concurrent-build limit on Hobby.** Hobby is limited to one
concurrent build per project. If a PR triggers both web
and site deploys, they run sequentially. A second trigger
landing during that window queues. Latency cost only.

**Token scope and rotation.** `VERCEL_TOKEN` is a long-lived
credential. At implementation time, prefer the narrowest
scope Vercel supports (project-scoped if available, else
team-scoped). Document the token's location and rotation
procedure inline in the workflow file or a sibling README so
the secret doesn't become orphaned. Treat the token as a
high-value secret in incident response.

**SHA pinning matters.** The Create Deployment REST API call
sends the head SHA, not the branch name, so the deployed code
is unambiguous regardless of subsequent pushes. The workflow
must record the head SHA at trigger time and use it
consistently in (a) the deploy API call's `gitSource.ref`
and (b) the status-check target SHA. The polling step uses
the deployment ID returned from (a), not a branch+SHA
filter, eliminating any ambiguity from the API side.

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

**Untrusted comment commands.** The `issue_comment` event
fires on any PR comment matching `/deploy-preview`,
including comments from outside collaborators on a
hypothetical future public state of the repo. The trigger
authorization gate (see Mechanism → Trigger
authorization) rejects comments whose
`author_association` is not in `OWNER`/`MEMBER`/
`COLLABORATOR`. Without this gate, any commenter could
consume Vercel quota or, if the workflow ever switches to
`pull_request_target`, exfiltrate secrets via PR-supplied
code paths.

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
- Vercel config edits and `VERCEL_TOKEN` provisioning.
- Ruleset edit on `main` to swap the two Vercel checks for
  `preview-deploy` (manual via web UI or `gh api`, captured
  before/after in the cutover PR description).

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

Deploy Hooks are documented at
`vercel.com/docs/deploy-hooks` — see "Why earlier drafts
were wrong" above for why they don't fit this design (no
SHA-pinned deploys; hooks are bound to the branch selected
at hook-creation time). The Create Deployment REST API is
documented at `vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment`.
Vercel's `git.deploymentEnabled` is documented at
`vercel.com/docs/project-configuration/git-configuration`.
