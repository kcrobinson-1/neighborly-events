# Validation Reference

Topic-organized constraint set covering: per-area validation
commands, validation honesty, continuous validation, PR readiness,
regression discipline, and testing-tiers discipline.

Loaded **mid-session** (Continuous Validation: run checks before
each commit on multi-file or non-trivial work) and **at end-of-
session** (PR Readiness, Validation Honesty) by
[`workflows/implementation.md`](../workflows/implementation.md)
and [`workflows/plan-implementation.md`](../workflows/plan-implementation.md).
The `npm run lint` / `npm run build:web` / `deno check` commands
named below also fire mid-session per the Continuous Validation
cadence — they are not end-of-session-only.

## Validation Expectations

Run the checks relevant to the area you changed.

For frontend or shared TypeScript changes, run:

```bash
npm run lint
npm run build:web
```

For frontend style changes, also make sure the SCSS entrypoint still builds through the normal frontend build:

```bash
npm run build:web
```

For Supabase edge function changes, run:

```bash
deno check --no-lock supabase/functions/issue-session/index.ts
deno check --no-lock supabase/functions/complete-game/index.ts
```

If you changed both frontend/shared code and Supabase code, run both sets of checks.

If you could not run a relevant check, say so explicitly and explain why.

For pull requests into `main`, expect GitHub CI to run the same validation via [`.github/workflows/ci.yml`](/.github/workflows/ci.yml).

### Validation Honesty

Do not overstate what was validated.

- Run the validation commands named by the task or checklist before handoff.
- If you added a new test command, validation surface, or workflow step, prefer to run it locally before opening or updating a PR.
- If you added a new top-level validation path, run the integrated repo command that is supposed to cover it, not just the new subcommand in isolation.
- If a validation command depends on local services or runners, exercise it from a clean start when practical, not only from a warm reused state.
- If a new validation step cannot be run locally, call out the exact blocker in the handoff and PR description.
- Do not describe a branch as fully validated if any newly introduced check has not been exercised end to end.
- If docs describe a test as covering the "real" backend or browser path, make sure the implementation actually does that. If the test runs in fallback or mocked mode, document that precisely.
- If baseline validation failed and the task was stopped before edits, report
  that as a baseline failure, not as a failed implementation.

### Continuous Validation

Do not wait until the end of a large change to discover that the branch drifted.

- for multi-file or non-trivial work, run the relevant checks before each commit, not only before handoff
- when code movement changes test layout, confirm the normal repo runners still pick up the affected tests
- when adding a new test file pattern or directory, make sure the configured runner includes it
- if a step cannot yet pass validation, shrink the step until it can

### PR Readiness

Treat pull requests as reviewable engineering work, not speculative drafts with known unverified edges hidden inside them.

- Before opening or updating a PR, confirm that all docs the branch should have touched are current (see [`reference/documentation-currency.md`](./documentation-currency.md) "Doc Currency Is a PR Gate").
- Before opening or updating a PR, make sure every new script or validation command added by the branch is runnable by a contributor following repo docs.
- If a PR is intentionally still exploratory, keep it clearly framed as draft work and do not present it as merge-ready.
- For new test runners or test directories, confirm the existing runners do not accidentally pick them up or conflict with them.
- If a helper script depends on local tools such as Docker, Deno, Playwright, or the Supabase CLI, either make the script self-checking with clear failure messages or document the setup in the same change.
- For new helper scripts that start local services or background processes, validate teardown as well as setup so CI cannot hang after the assertions already passed.
- Prefer fixing local workflow blockers in the repo when reasonable instead of relying on CI to be the first real execution environment.

The PR body template that every PR must use lives in
[`reference/pr-template.md`](./pr-template.md) "PR Body Template."

### Regression Discipline

When a change touches testing infrastructure, validation commands, CI, or local setup, review it for operational regressions in addition to product regressions.

- make sure new validation commands do not silently depend on undeclared local state
- make sure new validation commands work from both fresh-start and warm-start local states when that distinction matters
- make sure browser tests are deterministic about which backend path they exercise
- make sure helper scripts are safe to rerun and fail with actionable guidance
- make sure helper scripts emit enough progress logging and bounded timeouts to debug CI stalls
- make sure CI does not pay heavyweight setup costs earlier than necessary
- make sure local validation steps do not mutate workspace state in ways that break later commands

### Test Boundary Discipline

A unit test should fail when the unit's contract is violated and pass otherwise.
If unrelated data — a new event slug, a new feature flag, a new sample fixture,
a new config entry, a new sponsor record, a new draft event — requires editing
the test, the test boundary is wrong: the test is asserting against data that
lives outside its unit's contract.

Before opening or updating a PR that adds or modifies tests, walk every
modified or added test through this question:

  **"If a contributor added an unrelated <thing in this domain> tomorrow,
  would this test need editing?"**

If the answer is yes, the test is data-coupled. Refactor before opening the
PR. Common fixes:

- **Mock the cross-boundary input.** When the test verifies algorithm or
  matcher behavior, build a synthetic config / fixture / input set inside
  the test rather than reading the live artifact. Live-artifact reads belong
  in shape-correctness tests, not in algorithm tests.
- **Parametrize over the source-of-truth constant.** When the test
  legitimately cares about a domain set (e.g., a TypeScript allowlist
  consumed by both application code and platform config), iterate over the
  constant rather than hardcoding members. Adding to the constant then
  automatically extends the walk.
- **Assert the load-bearing invariant, not the specific population.** When
  two surfaces must mirror each other (a TypeScript allowlist and a regex
  in a JSON config, a database column and a UI field, a `shared/` constant
  and a per-app projection), assert byte-equivalence between them — that
  catches real drift. Adding to one without updating the other still fails
  the test; adding to an unrelated slot in either surface does not.
- **Separate format from algorithm.** Format / shape correctness tests run
  against the live artifact and assert structural rules (every entry has
  the shape we expect). Algorithm tests run against synthetic inputs and
  assert behavior (the matcher matches what it should). Mixing them couples
  the test to whatever data is in the artifact today.

If the test legitimately needs to enumerate domain data — e.g., a regression
fixture for a specific historical bug — leave a comment naming what triggers
a future edit so the next contributor sees the trap before tripping it.

Recurring trap: a unit test reads a live config (`apps/web/vercel.json`,
`shared/events/*`, a fixture file, a migration list), hardcodes the
slugs / flags / fixtures present today, and breaks every time someone adds
an unrelated entry. The fix is to assert the contract that links the
source-of-truth constant to the config (catches real drift) and to test the
matching algorithm against synthetic inputs (independent of what's in the
config at any point in time).

### Testing Tiers Discipline

Plan authors and reviewers must distinguish tiers that are valid pre-merge
gates from tiers that are not. The full tier map lives in
[`docs/testing-tiers.md`](/docs/testing-tiers.md).

The two rules that trip up plan authors most often:

- **Plans may gate merge only on tiers the implementer can actually execute
  against the pre-merge state of the code.** Production smoke (Tier 5) runs
  against the deployed origin. Any new smoke assertion a plan adds cannot
  pass against production until the plan's code is deployed. Plans that
  extend production smoke assertions land in two phases: code merged with
  plan `In progress pending prod smoke`, then plan flipped to `Landed`
  after the post-release smoke run is green. Do not gate the merge on a
  check that can only pass post-deploy. The same two-phase gate applies
  to any other plan whose Validation Gate names a check that can only
  run post-release; see [`docs/testing-tiers.md`](/docs/testing-tiers.md)
  "Plan-to-Landed Gate For Plans With Post-Release Validation" and
  [`planning/shared.md`](../planning/shared.md) "Plan-to-PR
  Completion Gate" for the Status-flip semantics.
- **Plans must not require contributors to configure production credentials
  on local laptops.** `PRODUCTION_SMOKE_*` env vars, production admin
  fixture emails, and production service-role keys live in the GitHub
  `production` environment per
  [`docs/tracking/production-admin-smoke-tracking.md`](/docs/tracking/production-admin-smoke-tracking.md).
  They are owned by the release/ops owner. A plan that implicitly requires
  them on the implementer's laptop is misrouting validation — the fix is
  to adjust the plan's validation section, not to provision production
  secrets to developers.
