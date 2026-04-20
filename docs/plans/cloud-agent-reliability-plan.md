# Cloud Agent Reliability Plan

## Document Role

This plan defines how cloud-based coding agents (currently OpenAI Codex cloud)
should enter, validate, and execute work in this repository without being
blocked by toolchain drift, missing dependencies, or ambiguous failure
handling. It exists because a real agent run was blocked by `deno: not found`
during baseline validation, and the root cause was environment shape, not a
repo bug.

Use this doc when:

- a cloud agent run stops with a missing-tool or wrong-version error
- the toolchain (Node, Deno, Supabase CLI, Playwright browsers, etc.) is being
  bumped, and we need to keep the cloud agent, local dev, and CI in sync
- the agent behavior policy in `AGENTS.md` needs a precise rule for how to
  react to an environment failure
- we are evaluating whether to stay on Codex cloud or add a local-execution
  fallback

Owner docs this file coordinates:

- [dev.md](../dev.md) — validation commands and local workflow source of truth
- [../../AGENTS.md](../../AGENTS.md) — agent behavior and decision discipline
- [testing.md](../testing.md) — validation surface the agent runs against
- [operations.md](../operations.md) — platform-managed settings
- [backlog.md](../backlog.md) — priority-ordered follow-up work

## Problem Statement

Cloud coding agents run in a container image we do not fully control. Today
that image is OpenAI's `codex-universal`, which carries Node and common
package managers but does not carry everything this repo needs out of the box
(notably Deno, which drives `supabase/functions` tests and linting). When the
agent runs baseline validation, commands like `npm run test:functions` fail
with `deno: not found` and the run is blocked.

The failure is environmental, not logical. The risk of the current shape is
twofold:

1. An agent may stop at baseline and never attempt the real work, wasting the
   run.
2. Worse, an agent may be given permissive recovery rules ("install whatever
   is missing"), succeed against a silently wrong toolchain, and report green
   on work that was actually validated against unpinned versions.

This plan targets both failure modes. The cloud agent should always enter a
known-good environment, and when it cannot, it should stop loudly rather than
self-heal into a misleading green.

## Guiding Principles

1. **Pin everything.** Node, Deno, Supabase CLI, Playwright, and any other
   tool the validation surface depends on are pinned to exact versions in a
   single source of truth.
2. **Fix the environment, not the runtime.** Install and version management
   belong in the pre-agent setup phase. The agent itself only verifies.
3. **Verify, don't heal.** The preflight check (`doctor`) reports drift and
   stops the run. It does not quietly rebuild the environment during an
   agent's task.
4. **Narrow recovery only.** The agent may recover from a small, explicit
   list of documented failure modes. Anything else stops the run and reports
   with diagnostic output attached.
5. **One startup ritual across surfaces.** Local dev, CI, and the cloud agent
   read the same pinned-version file and run the same doctor check.

## Constraint: Codex Cloud Does Not Expose Base-Image Control

As of April 2026, Codex cloud does not support customer-supplied base images.
Customer-supplied images are a known feature request on OpenAI's forum, but
they are not shipped. The supported customization surface is:

- a **setup script** that runs before the agent, with internet access
- an optional **maintenance script** that runs when a cached container is
  resumed
- **environment variables and secrets**, including `CODEX_ENV_*` vars that
  tell `codex-universal` which language versions to activate
- **container state caching** for up to 12 hours, auto-invalidated when any
  of the above change

This plan targets that surface. Anything that would have been baked into a
custom image is instead placed in the setup script and verified by doctor.
Install cost is absorbed by the 12-hour cache, so in practice the setup
script runs cold roughly once per workday per environment, not per task.

## Phase 1 — Pinned Toolchain And Setup Script

Add a single authoritative tool-versions file. The two viable choices for
this repo are:

- **mise (`mise.toml` or `.tool-versions`).** Third-party version manager
  from the `asdf` lineage, written in Rust. Lightweight, in-repo, covers
  language runtimes and CLIs (Node, Deno). Recommended default.
- **Explicit pins in the setup script.** No extra tool, each CLI installed
  and verified inline. Acceptable if we want to avoid adding a third-party
  dependency, at the cost of more boilerplate.

Write `scripts/codex-setup.sh`. Responsibilities:

1. Install `mise` (or direct-install pinned CLIs).
2. Run `mise install` to materialize every pinned tool version.
3. Run `npm ci` to install node dependencies from the pinned lockfile.
4. Run `scripts/doctor.sh` as the final step so setup itself fails if the
   environment is not in spec.

Point Codex's Environment settings at this script. The `.node-version` and
`.nvmrc` files already in the repo stay aligned with whichever pin the
tool-versions file declares.

Use `CODEX_ENV_NODE_VERSION` (and siblings) where they shorten the setup
script by pre-activating language runtimes in `codex-universal`. The setup
script then only needs to fill in tools the universal image does not carry,
chiefly Deno at the pinned version.

## Phase 2 — Doctor As Verifier

Write `scripts/doctor.sh`. Responsibilities:

- check every required CLI is on PATH
- check each CLI's version matches the pinned value
- check project-level prerequisites that the agent assumes (for example that
  `node_modules` is present and lockfile-consistent, that `supabase/functions`
  imports resolve under the pinned Deno)
- exit with distinct codes per failure class:
  - `0` — environment OK
  - `10` — a pinned tool is missing
  - `11` — a pinned tool is the wrong version
  - `12` — project dependencies are missing or out of sync
  - `20` — a required secret or environment variable is missing
  - `99` — unknown / unclassified failure

Doctor never installs anything. Installation belongs in the setup script.
A doctor failure at agent time means the cache is stale, the setup script
did not finish cleanly, or a pin drifted — all of which deserve human
attention.

Make `npm run doctor` a thin wrapper around `scripts/doctor.sh`, and wire it
as a prerequisite of the aggregate validation command the agent is expected
to run.

## Phase 3 — AGENTS.md Failure-Handling Clause

Replace any current "stop and report on baseline failure" guidance with a
more precise rule. Proposed text:

> Before any validation command, run `npm run doctor`. If it exits `0`,
> proceed. If it exits with a code listed in
> `docs/plans/recoverable-agent-failures.md`, perform the documented
> recovery action exactly once and rerun doctor. For any other exit code,
> stop and report. The report must include doctor's stderr and the last 50
> lines of the failing command's stderr.

Add `docs/plans/recoverable-agent-failures.md` with a deliberately short
starter list. The recommended starting entry is:

- `code 12` (project deps missing or out of sync) → run `npm ci` and rerun
  doctor

Do not add a blanket recovery for missing tools (`code 10`). A missing tool
usually means the setup script is stale or the cache was not rebuilt after a
pin change, both of which are signals a human should see.

## Phase 4 — Local Parity Against codex-universal

Add `scripts/test-codex-setup.sh`:

1. Pull the `codex-universal` image (published for exactly this purpose).
2. Mount the repo into a fresh container.
3. Run `scripts/codex-setup.sh` inside the container.
4. Run `scripts/doctor.sh` and the baseline validation commands.
5. Exit non-zero on any failure.

Wire this into CI as a pre-merge check on changes that touch the setup
script, the tool-versions file, `package.json`, `deno.json`, or the doctor
script. This replaces the "update the base image" phase from earlier
drafts and catches setup-script drift before a real Codex run hits it.

## Phase 5 — Shared Startup Ritual

Document the ritual in `docs/dev.md` under a new "First command in a fresh
environment" section:

```
mise install
npm ci
npm run doctor
```

Local contributors, CI, and the Codex setup script all resolve through the
same pinned tool-versions file. Three surfaces reading from one source of
truth is fine; three surfaces with three bespoke install scripts is how
drift re-enters.

## Phase 6 — Cloud Agent Prompt Template

Update the recurring cloud-agent prompt template so it:

- assumes the environment is already prepared by the setup script
- runs `npm run doctor` first
- recovers only from the failure modes listed in
  `docs/plans/recoverable-agent-failures.md`, and only once
- otherwise stops, reports doctor output plus the failing command's stderr,
  and does not attempt any broader install or fix

The prompt must not grant a general license to install CLIs. That class of
permission is how misleading-green runs happen.

## Phase 7 — Drift Detection

Add a scheduled job (weekly is sufficient to start) that:

1. Runs `scripts/test-codex-setup.sh` against the current `main`.
2. Opens an issue if doctor does not come up green.

This catches the most likely regression: a pin bump that updated local and
CI but did not rebuild the cloud agent's cache, or a `codex-universal`
update that shifted an assumption the setup script quietly depended on.

## Fallback Path: Local Or Self-Hosted Execution

Document this path. Do not build it yet.

Codex cloud will structurally fail to support certain classes of work:
system packages `codex-universal` does not ship, internal networks the cloud
runner cannot reach, or compliance contexts that forbid code leaving the
environment. If we hit any of those, the escape hatches are:

- **Claude Code or Codex CLI running locally.** Same pinned tool-versions
  file, same doctor script, so task prompts transfer without rewriting.
- **A self-hosted GitHub Actions runner with a real Dockerfile.** Swaps the
  Codex subscription surface for compute and maintenance overhead.

Devin is explicitly not a fallback here. Its value proposition is maximum
autonomy at the cost of environment control, which is the opposite of what
this plan is optimizing for.

Add a one-line pointer in `docs/dev.md` so contributors know the fallback
exists, with a note that switching is a deliberate choice, not an
auto-recovery path.

## Acceptance Checks

The plan is done when all of the following hold:

1. A fresh Codex run, first invocation after a cache invalidation, comes up
   green end-to-end with no agent-side installs.
2. Deleting Deno from the pinned list and redeploying causes the next run's
   doctor to fail with a specific `code 10` "missing tool: deno (expected
   <version>)" message and stop before any validation command runs.
3. `scripts/test-codex-setup.sh` run locally reproduces the Codex
   environment faithfully enough that it catches setup-script bugs before
   they reach a real cloud run.
4. Local dev, CI, and the Codex setup script all resolve the same Node and
   Deno versions, sourced from one file.
5. `AGENTS.md` contains the precise failure-handling clause from Phase 3,
   and `docs/plans/recoverable-agent-failures.md` exists with the starter
   list.

## Costs And Trade-offs

**Dollars.** No additional recurring spend. The plan works within whichever
ChatGPT tier the repo is already paying for (Plus, Pro $100, or Pro $200);
it makes the existing cloud-task budget more productive by reducing
dead-end runs.

**Latency.** Cold setup-script runs take a few minutes. The 12-hour cache
means this is paid roughly once per workday per environment, plus once per
setup-script change. Keep the setup script fast — prefer binary installs
over builds from source — to limit this.

**Engineering time.** A half to a day and a half of focused work to
implement Phases 1–6, depending on how much is drafted up front vs.
iterated on. Phase 7 is incremental.

**Lock-in.** Choosing mise adds a third-party binary to the startup ritual.
If that proves undesirable, the same plan works with explicit inline pins
in the setup script; only the implementation details change.

## Open Questions

- Which tool-versions manager do we adopt: mise (recommended) or explicit
  inline pins? Track resolution in `docs/open-questions.md`.
- Do we want the drift-detection job weekly or per-PR? Weekly is cheaper
  and sufficient until we see a drift incident; per-PR is stricter.
- Should the cloud-agent prompt template live in the repo (versioned,
  reviewed) or in the Codex environment settings UI (easier to update,
  harder to audit)? Prefer in-repo.
