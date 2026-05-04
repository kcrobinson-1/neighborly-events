# Surface CI Step Logs In PR Comments On Failure

## Status

Landed.

## Goal

When the `Lint, Tests, Build, and Supabase Checks` job in
[`.github/workflows/ci.yml`](/.github/workflows/ci.yml) fails on a
`pull_request` event, post one PR comment whose body carries:

1. The name of the first failing step and its enclosing job.
2. A link to the job-run page on GitHub.
3. The last ~200 lines of that failing step's stdout/stderr inside a
   collapsed `<details>` block.

After this lands, an AI coding agent reading the PR thread (or a human
without browser access to the Actions tab) can read the real failing
assertion, stack trace, or SQL error directly from the PR conversation
that the agent's session already receives via PR activity webhooks. No
copy-paste from a maintainer needed.

## Why Now

The Tier 2 backlog entry "`infra` Surface CI step logs in PR comments
on failure" in [`docs/backlog.md`](/docs/backlog.md) describes the
recurring failure mode this plan closes: AI coding agents working
inside a session cannot authenticate to the GitHub Actions logs API,
so a failing PR CI run leaves the agent without the real diagnostic.
The repo's existing debugging rule requires the agent to stop after
at most one speculative attempt when CI logs are not accessible and
ask the human to paste the log content; every PR that lands more
than one push and trips CI currently pays that human-in-the-loop
tax.

This entry is also adjacent to the already-landed
[`docs/plans/archive/post-merge-smoke-watch.md`](/docs/plans/archive/post-merge-smoke-watch.md)
— both reduce friction of AI coding sessions reading GitHub Actions
state without browser context. The two are independent: the
post-merge watcher targets the post-Release smoke chain on `main`;
this plan targets the per-PR CI failure surface.

## Context

The CI workflow has one substantive job (`validate`) gated by a
docs-only-detector job (`detect-scope`). On a non-docs-only PR, the
validate job runs Lint → Tests → Edge Function Deno tests → Supabase
integration → Playwright trusted-backend smoke → web build → site
build → six per-function `deno check` invocations. Verified by:
[`.github/workflows/ci.yml:85`](/.github/workflows/ci.yml:85),
[`.github/workflows/ci.yml:126`](/.github/workflows/ci.yml:126),
[`.github/workflows/ci.yml:130`](/.github/workflows/ci.yml:130),
[`.github/workflows/ci.yml:138`](/.github/workflows/ci.yml:138),
[`.github/workflows/ci.yml:142`](/.github/workflows/ci.yml:142), and
[`.github/workflows/ci.yml:146`](/.github/workflows/ci.yml:146).

Any one of those steps can fail. The reporter has to identify *which*
step failed, find the failed step's logs, take a small tail, and post
that tail to the PR.

GitHub Actions makes job-step logs available through the Actions API
(and via the preinstalled `gh` CLI) **after the job concludes**. From
inside the same job, the job's own log file is still being written
and is not readable through `gh run view --log-failed`. The reliable
shape is therefore a separate downstream job, gated on `failure()`,
that runs only after the validate job has completed — at which point
`gh run view --log-failed ${{ github.run_id }}` returns the failed
steps' captured output for the whole run.

The repository already requires `gh >= 2.89.0` for log/JSON parsing
in operational scripts. Verified by
[`docs/plans/archive/post-merge-smoke-watch.md`](/docs/plans/archive/post-merge-smoke-watch.md)
"gh CLI dependency" and the runbook reference in
[`docs/dev.md`](/docs/dev.md). This plan inherits that pin.

The CI workflow currently fires on `pull_request` (any branch) and on
`push` to `main` with a `paths-ignore` filter for docs. Verified by:
[`.github/workflows/ci.yml:3`](/.github/workflows/ci.yml:3),
[`.github/workflows/ci.yml:4`](/.github/workflows/ci.yml:4),
[`.github/workflows/ci.yml:5`](/.github/workflows/ci.yml:5),
[`.github/workflows/ci.yml:6`](/.github/workflows/ci.yml:6), and
[`.github/workflows/ci.yml:8`](/.github/workflows/ci.yml:8). The new
reporter must scope to `pull_request` only — there is no PR for a
push to `main`, so a `gh pr comment` call with no PR target would
fail and add noise.

## Cross-Cutting Invariants

- The reporter never runs on a `push` event. A failed `main` build
  has no PR thread to comment into; the maintainer reads the run
  directly. The reporter's `if:` clause and any contracts derived
  from it must agree on this scope rule.
- The reporter never runs when `detect-scope.outputs.docs_only ==
  'true'`. Docs-only PRs skip every heavy validation step in
  [`.github/workflows/ci.yml`](/.github/workflows/ci.yml), so any
  job-level failure on a docs-only PR is by construction a
  pre-validation failure (e.g. a `detect-scope` shell error) that
  surfacing wouldn't help debug.
- One CI failure produces at most one PR comment per CI run. The
  reporter is the single comment-writer; no other workflow step or
  job creates per-failure comments.
- The comment body must include a job-URL link and the failing step
  name. A comment that only carries a log tail without the
  failing-step header forces the reader back to the Actions tab,
  defeating the purpose.

## Contracts

### Job shape

A new top-level job in
[`.github/workflows/ci.yml`](/.github/workflows/ci.yml), named
`report-ci-failure`. The job:

- `needs: [detect-scope, validate]`
- `runs-on: ubuntu-latest`
- `if: failure() && github.event_name == 'pull_request' && needs.detect-scope.outputs.docs_only != 'true'`
- `permissions:` block scoped to the minimum required:
  - `issues: write` — load-bearing. `gh pr comment` posts a PR
    conversation comment via the GitHub issue-comments endpoint
    (`POST /repos/{owner}/{repo}/issues/{issue_number}/comments`),
    not via a PR-specific endpoint, so the comment-post call
    fails with HTTP 403 if only `pull-requests: write` is granted.
  - `pull-requests: write` — kept for intent clarity (the surface
    being commented on is a PR) and to leave headroom for any
    follow-up that uses PR-review-thread or PR-label endpoints.
  - `actions: read` — to fetch logs and the jobs list.
  - `contents: read` — default; explicit for clarity.
- `env:` exposes `GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` so the
  preinstalled `gh` CLI authenticates against the run's repository
  without further setup.

The `needs: [validate]` dependency is what guarantees the validate
job has reached a terminal state, so its step logs are available to
`gh run view --log-failed`. Without this dependency the reporter
could race the validate job's log upload.

### gh CLI version pin

The reporter shells out to `gh run view --log-failed` and
`gh api …/jobs`. Pre-flight in the first reporter step:
`gh --version` must report at least `2.89.0` before any log fetch or
API call. Below that, the reporter exits non-zero with a clear
message naming the missing pin. This matches the standard already
enforced by
[`docs/plans/archive/post-merge-smoke-watch.md`](/docs/plans/archive/post-merge-smoke-watch.md).

The Ubuntu runner image is the source of `gh`; the pin is enforced
at runtime so a runner-image regression below 2.89.0 fails loudly
instead of silently parsing a different JSON shape.

**Repo context on every gh subcommand that needs one.** The
reporter job does not check out the repository, so `gh` has no
local git remote to infer the target repo from. Every `gh`
subcommand that resolves a repo target (`gh run view`, `gh pr
comment`, etc.) must pass `--repo "$OWNER_REPO"` explicitly. `gh
api` calls that hit an absolute path (`repos/${OWNER_REPO}/…`) do
not need the flag because the path itself names the repo. Without
explicit `--repo`, the call returns "no default remote" and the
surrounding `|| true` swallows the failure into an empty log,
producing a comment with no diagnostic content — exactly the
outcome the reporter exists to prevent.

### Failed-step identification

The reporter calls
`gh api repos/${{ github.repository }}/actions/runs/${{ github.run_id }}/jobs`
and picks the first job with `conclusion == "failure"` whose `name
== "Lint, Tests, Build, and Supabase Checks"`. From that job it
extracts:

- `id` — the numeric job ID, used to scope the log fetch to that
  one job rather than the whole run.
- `html_url` — the linkable job-run page used in the comment header.
- The first step under `steps[]` with `conclusion == "failure"`,
  taking its `name` as the failing-step label.

If no failed job named `Lint, Tests, Build, and Supabase Checks`
exists in the run (e.g. `detect-scope` failed standalone), the
reporter posts a degraded comment whose header says "CI failed
before validation" and links to the run's overall page. This keeps
the "every failure produces a comment" guarantee from drifting
silently when the failure shape is unexpected.

### Log tail

The reporter must deliver a tail that actually corresponds to the
step named in the comment header. `gh run view --log-failed` over a
whole run can interleave output from multiple failed steps in
different jobs, so the run-scoped invocation is rejected by this
contract.

Required tactic:

1. Run `gh run view --log-failed --job <validate-job-id>` so the
   stream is bounded to the validate job's failed steps.
2. The `gh run view --log` output prefixes every line with the
   tab-delimited tuple `<job>\t<step>\t<timestamp>\t<line>`. Filter
   the stream so only lines whose `<step>` column equals the
   named failing step's `name` survive. An `awk -F'\t'
   '$2 == STEP'` form (or equivalent) is sufficient; the contract
   names the field semantics, not the exact incantation.
3. Take the last 200 lines via `tail -n 200`. The 200-line cap is
   fixed in v1; tuning is out of scope until reviewer feedback
   shows it is materially wrong.

If the step-name filter yields zero matching lines (the prefix
format drifted, the step name has tab-incompatible characters, or
some other surprise), the reporter falls back to the unfiltered
job-scoped tail and the comment summary text changes from "Last
200 lines of failed-step output" to "Last 200 lines from failed
steps in `<job name>` — first failed step was `<step name>` but
its output could not be isolated." That keeps the comment honest
about precision rather than misattributing other-step output to
the named step.

The tail is wrapped in a fenced code block (no language tag, since
CI logs mix shells, JS, SQL, and Deno output) inside a `<details>`
block so the comment collapses by default and keeps the PR thread
readable.

### Comment shape

The comment body has two parts. First, a single header line of
plain text (no emoji): the literal `CI failed:` followed by the
backticked step name, the literal `in`, the backticked job name,
an em-dash, and a markdown link reading `run logs` whose href is
the failed job's `html_url`. Second, a `<details>` block whose
`<summary>` reads `Last 200 lines of failed-step output` (or the
fallback summary defined in the Log tail contract when step-name
isolation fails), containing a fenced code block (no language
tag, since CI logs mix shells, JS, SQL, and Deno output) holding
the log tail. The `gh pr comment` call uses `--body-file` against
a temp file written by the previous step, so log content with
backticks does not need shell escaping.

### Comment posting

`gh pr comment ${{ github.event.pull_request.number }} --body-file
<tmp-path>`. Each PR CI failure produces a *new* comment; the
reporter does not edit a previous comment in place in v1.

This decision resolves the open question recorded in
[`docs/tracking/dev-workflow-improvements.md`](/docs/tracking/dev-workflow-improvements.md)
"Surface CI step logs in PR comments on failure" → "Should the
comment be edited in place across subsequent runs on the same PR
head, or should each new failure produce a new comment?" V1 picks
new-each-time because:

1. Every failure produces a fresh PR-activity webhook, which is the
   exact signal the agent's session is listening for. An edited
   comment may not refire that webhook depending on integration
   shape.
2. Marker-based "find existing comment by hidden HTML marker, edit
   it" coordination is a foot-gun if multiple in-flight CI runs
   ever interleave on the same PR (e.g. a force-push while a
   previous run is still completing).
3. Thread noise on a long-failing PR is a real but bounded concern;
   no reviewer has flagged it yet, and the marker-based replace
   path remains available as a follow-up if it becomes one.

If thread noise becomes a complaint, replace-by-marker is a
follow-up plan, not a v1 deferral; the in-tree contract above
documents the v1 shape as final until the follow-up is scoped.

### Fork-PR limitation

GitHub's automatic `GITHUB_TOKEN` is read-only on workflows
triggered by a `pull_request` event from a fork. The
`gh pr comment` call would therefore fail on a fork PR. The
repository currently has no merged fork contributions; this
limitation is recorded in the Risk Register below and not solved
in v1. The reporter does not pre-check the fork case; if the
comment-post call fails, the reporter exits non-zero and the
maintainer sees the post-validation failure inline in the run.

## Files To Touch

### Create

None. The plan adds workflow steps, not a new file.

### Modify

- [`.github/workflows/ci.yml`](/.github/workflows/ci.yml) — add the
  `report-ci-failure` job described in the Contracts section above,
  including its `permissions:` block and the `gh` version pre-flight.
- [`docs/dev.md`](/docs/dev.md) — short subsection under the
  CI/contributor-workflow section documenting that the reporter
  runs only on `pull_request` events, that it leaves no comment on
  passing PRs, that the canonical agent reading is the PR comment
  itself, and that the reporter shipped without a pre-merge
  throwaway-failure exercise — so if the first real failing PR
  after the reporter's merge produces no comment or a malformed
  comment, that is a same-day patch surface, not a stable contract.
  Two paragraphs maximum.
- `AGENTS.md` "Debugging Discipline" — replace the "If CI logs
  are not accessible from inside the session, stop after at most
  one speculative attempt and ask the human for the log content"
  fallback with a pointer to the failure-comment as the canonical
  source of post-CI debugging context. Keep the
  one-speculative-attempt cap as a backstop for the case where
  the reporter itself fails or the comment is missing for any
  reason.
- [`docs/backlog.md`](/docs/backlog.md) — remove the Tier 2 entry
  "`infra` Surface CI step logs in PR comments on failure"
  entirely. The implementing PR is the same PR that flips this
  plan's Status from `Proposed` to `Landed`, so the entry's
  removal and the Status flip happen in the same commit; there is
  no intermediate "entry pointing at this plan" state, no separate
  link-update commit, and no leftover entry after the plan lands.
  This matches the Backlog Impact section below.
- [`docs/tracking/dev-workflow-improvements.md`](/docs/tracking/dev-workflow-improvements.md)
  "Surface CI step logs in PR comments on failure" — collapse the
  candidate-task block to a brief pointer at this plan, matching the
  pattern other promoted entries follow.

### Files intentionally not touched

- The validate job's per-step `if: needs.detect-scope.outputs.docs_only != 'true'`
  pattern. The reporter is a sibling job, so it carries its own
  guard rather than duplicating per-step guards inside the
  validate job.
- [`.github/workflows/release.yml`](/.github/workflows/release.yml)
  and
  [`.github/workflows/production-admin-smoke.yml`](/.github/workflows/production-admin-smoke.yml).
  Failures in those workflows fire on `main` post-merge, not on a
  PR; the post-merge smoke watcher already covers the operator
  surface for that case.
- The PR comment author identity. The default `github-actions[bot]`
  is fine; remapping to a custom bot is not load-bearing.
- Comment-edit / replace-by-marker logic. Explicitly v2 if needed;
  see Contracts → Comment posting.
- Redaction of log content before posting. See Out Of Scope.

## Execution Steps

1. **Baseline validation.** From a clean checkout of `main`, run
   `npm run lint` and confirm green. Any failure here is a baseline
   issue and must be triaged before edits begin, not chased
   through this plan's diff.
2. **Branch hygiene.** Cut the implementation branch from `main`
   with no in-flight stash or partial work. The plan's one-commit
   landing depends on a clean starting tree.
3. **Add the reporter job.** Edit
   [`.github/workflows/ci.yml`](/.github/workflows/ci.yml) to
   append the `report-ci-failure` job per the Contracts section
   (Job shape, gh CLI version pin, Failed-step identification,
   Log tail, Comment shape, Comment posting, Fork-PR limitation).
   Verify the YAML parses by re-reading it; do not push and rely
   on CI parse-time errors as the first signal.
4. **Update `AGENTS.md` "Debugging Discipline."** Replace the
   human-paste fallback prose with the PR-comment-canonical
   pointer; keep the one-speculative-attempt cap as a backstop
   for the case where the reporter itself fails or the comment
   is missing.
5. **Update [`docs/dev.md`](/docs/dev.md).** Add the two-paragraph
   subsection per Files To Touch — naming the `pull_request`-only
   scope, the no-comment-on-pass guarantee, the canonical-agent-
   reading framing, and the unvalidated-at-landing note.
6. **Remove the backlog entry.** Delete the Tier 2 "`infra`
   Surface CI step logs in PR comments on failure" entry from
   [`docs/backlog.md`](/docs/backlog.md). Same commit as the
   workflow and docs edits above.
7. **Collapse the tracking candidate-task.** Replace the existing
   "Surface CI step logs in PR comments on failure" candidate-task
   block in
   [`docs/tracking/dev-workflow-improvements.md`](/docs/tracking/dev-workflow-improvements.md)
   with a brief pointer at this plan, mirroring the pattern other
   promoted entries follow in that file.
8. **Run the Self-Review Audits.** Walk the CLI / tooling pinning
   audit and the Readiness-gate truthfulness audit named in
   "Self-Review Audits" below against the merged diff. The
   readiness-gate walk replaces the runtime exercise the
   Validation Gate explicitly skips, so this step must produce
   notes the reviewer can read, not just an internal check.
9. **Documentation-current-state gate.** Walk every doc with a
   status-oriented section that this PR touches and confirm it
   reflects the implemented state, not pre-implementation:
   - this plan's Status block (about to flip in the next step)
   - the backlog Tier 2 entry (now removed)
   - the dev-workflow-improvements candidate block (now a pointer)
   - any other status-bearing doc the diff turned out to touch.
10. **Flip the plan Status.** Edit this plan doc's Status block
    from `Proposed.` to `Landed.` in the same commit. Per the
    Plan-to-PR Completion Gate, no separate doc-only follow-up
    commit is needed because the Validation Gate runs pre-merge.
11. **Final validation.** Run `npm run lint` once more on the
    implementation branch's tip. Confirm green.
12. **Open the PR.** Use the repo PR template verbatim. Fill
    `## Validation` with `npm run lint` plus the explicit
    unvalidated-against-real-failure note required by the
    Validation Gate. Fill `## Estimate Deviations` per the
    template; if no estimate-shaped section of this plan
    deviated, write `N/A`.

## Commit Boundaries

One implementation commit is sufficient: add the workflow job,
update `AGENTS.md` and `docs/dev.md`, update the backlog and the
tracking pointer together. Splitting docs from workflow would land
the workflow without its canonical reading guidance, which is the
exact friction this plan is closing.

The plan's Status flips to `Landed` in the same PR that ships the
workflow change. There is no post-release validation phase; per
the Validation Gate below, the reporter ships explicitly
unvalidated against a real failure, and the first real failing
PR after merge is the de facto first exercise. That is acceptable
because the surface is dev-workflow tooling on a single-contributor
project, not a user-facing or trust-boundary surface, and any
reporter bug surfaces inside the reporter's own job rather than
breaking the validate job's signal.

## Validation Gate

The validation surface is intentionally minimal. Setting up a
throwaway deliberately-failing branch to exercise the reporter
end-to-end pre-merge is more friction than the dev-workflow
payoff justifies; the reporter is shipped explicitly unvalidated
against a real CI failure and the next real failing PR after
merge is treated as the first exercise.

- `npm run lint` — pass on baseline; pass on final.
- Static walkthrough: read the merged `ci.yml` diff against this
  plan's Contracts section and confirm the `if:` clause, the
  `permissions:` block, the `gh` pre-flight, the failed-job lookup,
  the log-tail extraction, and the `gh pr comment` invocation match
  the contract verbatim. This is review against the contract, not
  execution.
- Reasoning walk: trace the four scenarios the reporter must
  handle correctly — a failing non-docs-only PR (comment expected),
  a passing PR (no reporter job), a docs-only PR (no reporter
  job), a failing push to `main` (no reporter job). The reviewer
  must be able to point to the workflow expression that gates each
  case rather than relying on runtime evidence.

The PR body's Validation section must say plainly that the
reporter was not exercised against a real CI failure pre-merge,
that the next real failing PR is the first exercise, and that
the reporter's own job step will surface a non-zero exit if the
reporter itself is broken. Do not describe the reporter as
"validated" or "tested end-to-end" — that overstates what was run.

## Self-Review Audits

- **CI & testing infrastructure — CLI / tooling pinning audit.**
  Applies because the reporter parses `gh` JSON (`gh api …/jobs
  --jq`) and `gh run view --log-failed` text. Confirm `gh >= 2.89.0`
  is enforced as a runtime pre-flight in the reporter, the
  documented requirement matches the runtime check, and the JSON
  fields the reporter touches (`name`, `conclusion`, `html_url`,
  `steps[].name`, `steps[].conclusion`) are stable in 2.89.0+.
- **CI & testing infrastructure — Readiness-gate truthfulness
  audit.** Applies because the reporter's "first failed job, first
  failed step" identification is itself a readiness-style decision:
  it tells the reader "this is the failure to look at." Walk
  scenarios where the reporter would mislead — a job whose name
  changes upstream, a multi-step failure where the first failed
  step is a setup step rather than the actually-broken assertion,
  a failure outside the validate job — and confirm the comment
  either names the failure faithfully or falls back to the
  degraded "CI failed before validation" header rather than
  misattributing the failure. Because the Validation Gate ships
  the reporter unvalidated, this audit replaces a runtime
  exercise; the reviewer must reason about each scenario against
  the workflow expression rather than relying on a recorded
  throwaway-failure run.

## Out Of Scope

- **Redaction of log content.** Current CI jobs run against local
  ephemeral Supabase, Playwright Chromium, and `npm`/`deno` checks.
  None handle production secrets or real customer data. V1 posts
  the raw log tail. If a future CI step starts handling real
  credentials, the redaction question is reopened — see Risk
  Register below.
- **Edit-in-place / replace-by-marker comment coordination.** V1
  posts a new comment per failure. See Contracts → Comment posting
  for the resolution rationale.
- **Per-step granularity beyond "first failed step."** A failure
  that cascades across multiple steps still reports only the
  first. Reading the linked job page covers the rest.
- **Distinguishing flaky failures from real failures.** Every
  failure gets a comment in v1.
- **Forking the reporter into a reusable composite action.** The
  reporter is intentionally inline in `ci.yml`; promoting it to a
  shared action waits until a second workflow needs the same
  surface (none currently does).
- **Cross-platform reporter shell.** The Ubuntu runner is the only
  target.
- **Re-running tests automatically on failure.** The reporter
  reads logs, it does not re-run.
- **Comment style customization (badges, emoji, formatting
  variants).** Plain-text header per the Comment shape contract.
- **Pre-merge throwaway-failure exercise.** A deliberately-failing
  branch could exercise the reporter end-to-end before merge but
  is not required. The dev-workflow payoff does not justify the
  branch-and-revert friction; the next real failing PR after
  merge is the first exercise. See Validation Gate above for the
  honesty requirement on the PR body.

## Risk Register

- **GitHub Actions JSON shape drift.** The reporter parses
  `gh api …/jobs` output. Mitigation: enforce `gh >= 2.89.0` in
  the reporter pre-flight, document the pin in `docs/dev.md`, and
  run the CLI / tooling pinning audit before handoff. The fields
  the reporter uses are core Actions API fields and have been
  stable across recent `gh` releases.
- **Validate-job rename or split.** The reporter looks up the
  failing job by exact name `Lint, Tests, Build, and Supabase
  Checks`. If `ci.yml` renames or splits that job without
  updating the reporter, the reporter falls back to the degraded
  "CI failed before validation" header, which still posts a
  useful link to the run page but loses step-level fidelity.
  Mitigation: the contract names the job string explicitly so the
  reviewer of any future `ci.yml` rename catches the
  reporter-side update.
- **CI step starts handling production secrets.** V1 does not
  redact log content. If a future CI step (e.g. a smoke test
  against a non-ephemeral environment, a release-side step
  promoted into PR CI) starts touching real credentials, raw log
  posting becomes a leak vector. Mitigation: when adding any such
  step, the reviewer must either revoke the reporter's surface
  for that step or add a redaction layer; the contract above
  records this as a tracked precondition rather than a silent
  assumption.
- **Fork PRs.** `GITHUB_TOKEN` is read-only on fork-triggered
  `pull_request` runs, so `gh pr comment` would fail. Mitigation:
  the repository currently does not accept fork contributions,
  and the reporter's failure surfaces as a non-zero exit on the
  reporter job, which is visible in the Actions tab. If the
  project later opens to forks, the reporter needs a fork-aware
  branch (likely a `pull_request_target` reporter job with
  hardened permissions) — out of scope for v1.
- **Comment churn on long-failing PRs.** A PR that pushes ten
  failing iterations gets ten comments. Mitigation: documented
  acceptance per Contracts → Comment posting. Replace-by-marker
  is a follow-up if and when this becomes a real complaint.
- **Reporter itself fails (auth, network, gh regression).** The
  validate job's failure remains visible on the Actions tab even
  if the reporter does not post a comment. The reporter's own
  exit status is visible in the workflow run, and the in-repo
  debugging rule retains its one-speculative-attempt cap as a
  backstop, so a missing comment does not silently degrade the
  rule into "guess freely."
- **Reporter ships with a latent bug because it was not exercised
  against a real failure.** The Validation Gate accepts an
  unvalidated landing; a copy-paste error in the contract, a
  wrong `gh` flag, or a permissions-block typo could cause the
  reporter to exit non-zero on the first real failing PR.
  Mitigation: the reporter is a sibling job, so its failure does
  not break the validate-job signal; the reporter's own exit
  status is visible on the Actions tab; and the maintainer's next
  CI failure naturally exercises the surface and will surface any
  bug for a same-day patch. Acceptable trade because dev-workflow
  tooling for a single-contributor project does not warrant the
  pre-merge exercise overhead.

## Backlog Impact

- Closes the Tier 2 entry "`infra` Surface CI step logs in PR
  comments on failure" in
  [`docs/backlog.md`](/docs/backlog.md). Backlog removal happens in
  the implementing PR per the file's "When an item is complete,
  update the owning detail file and remove the item from this
  backlog instead of leaving closed history inline" rule.
- Promotes the candidate-task block in
  [`docs/tracking/dev-workflow-improvements.md`](/docs/tracking/dev-workflow-improvements.md)
  "Surface CI step logs in PR comments on failure" to a brief
  pointer at this plan, matching the file's pattern for promoted
  entries.

## Related Docs

- [`docs/backlog.md`](/docs/backlog.md) — Tier 2 entry this plan
  closes.
- [`docs/tracking/dev-workflow-improvements.md`](/docs/tracking/dev-workflow-improvements.md)
  — candidate-task block this plan supersedes.
- [`docs/plans/archive/post-merge-smoke-watch.md`](/docs/plans/archive/post-merge-smoke-watch.md)
  — adjacent post-merge surface; same `gh >= 2.89.0` pin and
  same agent-readability motivation, different workflow chain.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  CLI / tooling pinning and Readiness-gate truthfulness audits
  that apply to this PR's diff surface.
- [`.github/workflows/ci.yml`](/.github/workflows/ci.yml) — the
  workflow this plan modifies.
