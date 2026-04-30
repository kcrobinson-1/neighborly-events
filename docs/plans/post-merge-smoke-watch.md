# Post-Merge Smoke Watch Automation

## Status

Proposed.

## Goal

Replace the manual "paste the smoke run URL when it's green" step in the
two-phase **Plan-to-Landed Gate For Plans That Touch Production Smoke**
(per [`docs/testing-tiers.md`](../testing-tiers.md)) with a focused
watcher script that, given a merge commit SHA:

1. Watches the post-merge GitHub Actions chain (CI → Release →
   Production Admin Smoke) keyed to that commit.
2. Reports stage-by-stage progress to stdout.
3. On green: prints the smoke run URL on its own line for easy capture.
4. On any failure: prints the failed-step logs and exits non-zero.

After this lands, an implementer (human or AI) can run a single command
after merge, walk away, and either (a) get the URL ready to paste into
the doc-only Step 16 commit, or (b) get the failure surfaced for
triage — no out-of-band browser navigation to find run IDs, no manual
paste of the URL into Claude Code sessions.

## Why Now

Surfaced during M2 phase 2.4.2's close-out cycle. The Step 16 doc-only
follow-up commit needs the smoke run URL inline as durable external
evidence per the gate. The implementer paused mid-session to grab the
URL from the Actions tab, reload the conversation context, and continue.
That friction is small once but recurring across every plan that ships
under the two-phase gate. A focused script consolidates the `gh` CLI
incantations and the failure-handling shape into one reusable artifact
with a stable npm-script name.

This entry is also adjacent to the existing Tier 2 backlog item "Surface
CI step logs in PR comments on failure" — both reduce the friction of
AI coding sessions reading GitHub Actions state without browser context.

## Context

After a PR merges to `main`, the project's workflow chain fires:

1. **CI** on push to main.
2. **Release** on `workflow_run: { workflow: CI, conclusion: success }`.
3. **Production Admin Smoke** on `workflow_run: { workflow: Release,
   conclusion: success }`.

Each stage takes roughly 5-10 minutes; total chain is ~15-30 minutes
wall time. The current manual flow is to watch the Actions tab, run
ad-hoc `gh run list`, or wait for email/Slack notification, then copy
the smoke run URL or the failed-step logs by hand.

The watcher bridges the chain: for a given merge SHA, it walks each
stage in order and emits structured stdout updates. The script does NOT
auto-flip the plan Status — generation of the doc-only follow-up commit
remains owner-driven. The script's job is to supply the durable
external evidence the gate requires.

## Contracts

### Invocation

`node scripts/release/post-merge-smoke-watch.cjs <merge-sha> [--workflow <name>] [--deadline-minutes <N>]`

- `<merge-sha>` (required): the merge commit SHA on `main`. Used to
  filter workflow runs by `headSha`.
- `--workflow` (optional, default `production-admin-smoke.yml`): the
  final-stage workflow file to watch for. Allows future gates that
  aren't smoke-specific to reuse the watcher.
- `--deadline-minutes` (optional, default `45`): hard upper bound on
  total wait time. Exits non-zero with a deadline-exceeded message if
  the chain hasn't completed by then.

`npm run release:watch-smoke -- <merge-sha>` is the canonical wrapper.
Per [`AGENTS.md`](../../AGENTS.md) "Phase Planning Sessions" →
"Prefer existing wrapper scripts over lower-level CLI invocations,"
plans that reference this watcher should name the npm script, not the
underlying `node scripts/...` invocation.

### Output (stdout)

Structured progress lines, one stage at a time, plus a load-bearing
final URL line on green. Example shape:

```
[ci] succeeded (run 12345)
[release] succeeded (run 12346)
[smoke] succeeded (run 12347)
SMOKE_URL=https://github.com/<org>/<repo>/actions/runs/12347
```

The final `SMOKE_URL=…` line is emitted on its own line so callers
(Claude Code sessions, jq pipelines, shell capture) can extract it
without parsing the surrounding progress noise.

### Output (stderr)

Diagnostic noise from `gh` CLI calls (auth warnings, rate-limit
notices). Errors that prevent the watcher from continuing
(auth failure, network error, deadline exceeded) write a single
human-readable line to stderr before the non-zero exit.

### Exit codes

- `0` — smoke succeeded, `SMOKE_URL=…` printed.
- `1` — any stage failed; failed-step logs printed to stdout,
  diagnostic to stderr.
- `2` — deadline exceeded before the final stage completed; partial
  progress printed.
- `3` — invocation error (missing SHA, malformed flag, `gh` not
  authenticated).

### gh CLI dependency

The script shells out to `gh` (already required by other release
procedures). Pre-flight check: `gh auth status` with non-zero exit →
script exits 3 with a clear message naming the missing auth.

### Workflow chain assumption

Discovery reads `.github/workflows/*.yml` at runtime, builds the
dependency DAG from `on.workflow_run.workflows` references, and finds
the path from CI to the named `--workflow`. Hard-coding the chain
shape is rejected so future workflow restructuring doesn't silently
break the watcher.

### Failure-mode handling

Per [`AGENTS.md`](../../AGENTS.md) "Review-Fix Rigor" → "Could this
make a successful operation look failed?":

- **Stage didn't trigger within a reasonable window.** Don't fail
  immediately; poll up to 5 minutes per stage with 15-second
  intervals. The chain is asynchronous and the next stage might just
  be queueing.
- **Stage triggered multiple times for the same SHA.** Take the
  most-recent run; report the run ID in stdout so the operator can
  investigate if surprising.
- **Smoke succeeded but on a `workflow_dispatch` rather than the
  chain.** The `headSha` filter includes manual dispatches; the
  script does not try to distinguish trigger source. Operator
  validates the run is the right one — the URL is the durable
  artifact regardless of trigger.

## Files To Touch

### Create

- [`scripts/release/post-merge-smoke-watch.cjs`](../../scripts/release/post-merge-smoke-watch.cjs)
  — the watcher.
- [`tests/scripts/post-merge-smoke-watch.test.ts`](../../tests/scripts/post-merge-smoke-watch.test.ts)
  — unit coverage for the SHA filter, stage-detection, output
  formatting, deadline handling, and exit-code branches. Stubs `gh`
  via an injectable runner per the existing pattern in
  [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
  export shape.

### Modify

- [`package.json`](../../package.json) — add `release:watch-smoke`
  script wrapping the `.cjs` invocation.
- [`docs/dev.md`](../dev.md) — short subsection under the release
  process naming the watcher and when to use it. Two paragraphs
  maximum.
- [`docs/testing-tiers.md`](../testing-tiers.md) "Plan-to-Landed
  Gate For Plans That Touch Production Smoke" — single-sentence note
  that `npm run release:watch-smoke -- <sha>` is the recommended way
  to capture the run URL for the doc-only follow-up commit.

### Files intentionally not touched

- The Step 16 doc-only follow-up commit pattern itself. Plans still
  describe their Status flip in their own prose; the script just
  supplies the URL.
- The CI / Release / Smoke workflow files. The watcher consumes the
  existing chain; no workflow change.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final, with the new unit
  test exercising SHA filter, stage-detection, output formatting,
  and exit-code branches against a stubbed `gh` runner.
- Manual smoke against a recent merged PR: run
  `npm run release:watch-smoke -- <sha>` against an
  actually-completed chain; confirm it reports `succeeded` for each
  stage and prints `SMOKE_URL=` matching the actual run.
- Manual failure injection: run against a SHA whose smoke run failed
  historically (or a deliberately-broken test branch); confirm exit
  1 + failed-step logs.

## Out Of Scope

- **Auto-flip the plan Status.** Owner-driven; the script provides
  URL, owner writes the commit. Could be revisited if usage patterns
  warrant.
- **Slack / email / push notifications.** Stdout is the only output
  sink. Bounds the v1 surface; future enhancement if needed.
- **Watching CI on non-main branches** (PR-side feature branches).
  The chain only fires on main, so the watcher's domain is
  post-merge.
- **Replacing `gh run watch` with a custom HTTP poll.** `gh run
  watch` already handles polling efficiently; reimplementing is
  wasted surface.
- **Caching results across reruns.** Workflow runs are immutable, so
  re-invoking with the same SHA is idempotent. A cache layer would
  add surface without saving meaningful time.

## Risk Register

- **GitHub workflow chain restructured.** If the project reorders or
  removes the `workflow_run` chain, the script's discovery loop
  needs to adapt. Mitigation: discovery reads workflow YAML at
  runtime rather than hard-coding stage names; fails gracefully with
  a clear "no chain found from CI to `<final>`" message.
- **gh CLI breaking changes.** The script relies on `gh run list /
  view / watch` JSON shape. Mitigation: pin `gh` minimum version in
  pre-flight; surface clear error if the JSON shape changes.
- **Auth drift mid-run.** If gh's auth token expires partway
  through, mid-stage `gh` calls fail. Mitigation: pre-flight
  `gh auth status` at start; if fails mid-run, exit 1 with the gh
  error plus the partial-progress trail. Operator re-auths and
  re-runs (idempotent).
- **Chain takes longer than 45 minutes.** Default deadline. Operator
  can override with `--deadline-minutes`. Mitigation: clear
  deadline-exceeded message names which stage was waiting.
- **Operator runs the watcher against the wrong SHA.** The merge SHA
  is on the implementer to provide. Mitigation: the script's first
  output line echoes the SHA and the chain it's watching, so the
  operator can sanity-check before walking away.

## Backlog Impact

- This plan adds one Tier 2 entry to
  [`docs/backlog.md`](../backlog.md) ("`infra` Automate post-merge
  smoke watch + URL capture"). The entry closes when this plan
  lands.

## Related Docs

- [`docs/testing-tiers.md`](../testing-tiers.md) — "Plan-to-Landed
  Gate For Plans That Touch Production Smoke" defines the two-phase
  gate this script automates evidence-capture for.
- [`docs/tracking/production-admin-smoke-tracking.md`](../tracking/production-admin-smoke-tracking.md)
  — production smoke workflow ownership and triage runbook.
- [`docs/operations.md`](../operations.md) — release process where
  this script slots in.
- [`AGENTS.md`](../../AGENTS.md) "Phase Planning Sessions" — the
  wrapper-script preference rule this script answers, so plans
  naming smoke-evidence capture can name
  `npm run release:watch-smoke …` rather than raw `gh run`
  invocations.
