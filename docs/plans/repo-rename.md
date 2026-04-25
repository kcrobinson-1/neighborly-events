# Repo Rename — `neighborly-scavenger-game` → `neighborly-events`

## Status

Proposed.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md),
Milestone M0, Phase 0.1. The epic's M0 row stays `Proposed` until phase 0.3
lands; this plan governs phase 0.1 only.

## Goal

Rename the GitHub repo and every **current-state** textual reference to
the old repo or product name inside the codebase. The internal product
identity is **Neighborly Events** and the GitHub repo becomes
**`neighborly-events`**. No code logic changes. No runtime identifier
changes. One PR.

Historical references that point to specific git history — commit and
PR URLs embedded in [`docs/self-review-catalog.md`](../self-review-catalog.md)
and `docs/plans/archive/*.md` — are explicitly **out of scope**. Those
URLs anchor frozen evidence (specific commits, specific PR
conversations); GitHub auto-redirects them and rewriting them would
mix textual cleanup of the historical record with the current-state
rename. They are listed under "Files Intentionally Not Touched" below
so the boundary is named, not implied.

## Approach

Change in place via `gh repo rename`. GitHub auto-redirects the old URL
for clones, refs, and the ~40 hardcoded `github.com/kcrobinson-1/neighborly-scavenger-game/...`
links inside [`docs/self-review-catalog.md`](../self-review-catalog.md)
and archived plans, so those do not need to change. A new repo is
explicitly rejected because it would discard issue history, PR history,
GitHub Actions run history, branch protection, and the existing Vercel
git integration for no benefit.

The Vercel project rename is **deferred** — the project name
(`neighborly-scavenger-game-web`, surfaced as the fallback origin in
[`supabase/functions/_shared/cors.ts`](../../supabase/functions/_shared/cors.ts))
is decoupled from the GitHub repo name, production runs on a custom
domain via `ALLOWED_ORIGINS`, and the rename PR stays purely textual.

The local working directory rename is purely operator-side and is not
part of the PR.

## Cross-Cutting Invariants

These rules thread through every diff line in this PR. Self-review walks
each one against every changed file.

- **Behavior-preserving rename.** Every diff line is a textual
  replacement of `neighborly-scavenger-game` (or the human-readable
  "Neighborly Scavenger Game") with `neighborly-events` (or "Neighborly
  Events"). No identifier, type, test assertion, or code-logic change
  rides along. Any non-textual diff is a scope error.
- **The `neighborly` runtime identifier prefix is preserved literally.**
  The cookie name `neighborly_session`, the header
  `x-neighborly-session`, the `neighborly.local-*` storage keys, the
  `NEIGHBORLY_SKIP_DB_RESET` env var, the
  `generate_neighborly_verification_code` DB function, and the
  `@neighborly/web` workspace package name **stay unchanged**. A grep
  match for `neighborly` against any of these is correct — leave it. If
  this rule is violated the rename has silently turned into a
  cookie-invalidating, session-breaking, migration-requiring change.
- **Plan-to-PR completion.** This plan's Status flips from `Proposed` to
  `Landed` in the same PR that implements the rename. The parent epic's
  M0 row stays `Proposed` (only flipped when M0 phase 0.3 lands).

## Files To Touch

Confirmed via `grep -i 'neighborly[ -]?scavenger'`. No file paths are
renamed in this PR.

**In-repo identity.**
- [`package.json`](../../package.json) — root `name` field.
- `package-lock.json` — root `name` field, regenerated via `npm install`
  after the root `package.json` edit.
- [`supabase/config.toml`](../../supabase/config.toml) — `project_id`
  (cosmetic; the local Supabase CLI link is decoupled from the live
  Supabase project).

**User-visible product copy.**
- [`apps/web/index.html`](../../apps/web/index.html) — `<title>` and the
  `<meta name="description">` tag.
- [`README.md`](../../README.md) — top-level title and lead paragraph
  product description.

**Docs that reference the product or repo by name.**
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md) — two
  surfaces, both rewritten in this PR per the AGENTS.md Plan-to-PR
  Completion Gate (when reality diverges from a plan's predicted
  scope, the plan is updated, not silently exceeded):
  1. The platform-repo intro line (currently line 42, "The repo
     currently named `neighborly-scavenger-game` becomes the platform
     repo…") rewritten to past-tense, post-rename phrasing.
  2. The entire **Phase 0.1 — Repo rename** paragraph (currently
     lines 161–166) rewritten to describe what phase 0.1 actually
     executed, not what it predicted. The current paragraph names
     "all package manifests in workspaces, CI workflow files,
     `AGENTS.md` references" as in-scope; investigation showed
     `apps/web/package.json` keeps `@neighborly/web` as a deliberately
     preserved brand prefix, no CI workflow file references the old
     name, and `AGENTS.md` does not reference the old name. The
     rewritten paragraph names the actual touched surfaces (root
     `package.json`, `package-lock.json`, `apps/web/index.html`,
     `README.md`, `supabase/config.toml`, three doc files, this
     plan), names the deliberately preserved prefixes, and references
     this plan as the executed contract. M0's Status row stays
     `Proposed`; only the phase 0.1 paragraph and intro line change.
- [`docs/plans/release-readiness.md`](./release-readiness.md) — first
  paragraph product reference.
- [`docs/plans/analytics-strategy.md`](./analytics-strategy.md) —
  Document Role and End Goal product references.

**This plan.**
- `docs/plans/repo-rename.md` — Status flipped from `Proposed` to
  `Landed` in the same PR.

## Files Intentionally Not Touched

A grep match against any of these is correct. Self-review must not
"fix" these.

- Runtime identifiers: `neighborly_session` cookie, `x-neighborly-session`
  header, `neighborly.local-*` storage keys, `NEIGHBORLY_SKIP_DB_RESET`
  env var, `generate_neighborly_verification_code` DB function — all
  enumerated under cross-cutting invariants above.
- Workspace package name `@neighborly/web` in
  [`apps/web/package.json`](../../apps/web/package.json) and the four
  `npm --workspace @neighborly/web` script references in the root
  `package.json`.
- The error string `"Missing root element for Neighborly web app."` in
  [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx) — refers to the
  app, not the repo.
- The Vercel default-origin fallback
  `https://neighborly-scavenger-game-web.vercel.app` in
  [`supabase/functions/_shared/cors.ts`](../../supabase/functions/_shared/cors.ts)
  — the Vercel project rename is deferred; this URL remains valid until
  Vercel renames the project.
- All `https://github.com/kcrobinson-1/neighborly-scavenger-game/...`
  links in [`docs/self-review-catalog.md`](../self-review-catalog.md)
  and `docs/plans/archive/*.md` — GitHub auto-redirects from the old
  repo URL.
- Workflow files in `.github/workflows/*.yml` — none reference the old
  repo name.

## Operator Steps Outside The PR

These are GitHub and local-environment actions, not diff lines.

1. After the PR is approved and merged to `main`, run
   `gh repo rename neighborly-events` (or rename via the GitHub UI).
   GitHub creates a redirect from the old URL effective immediately.
2. Update the local clone remote: `git remote set-url origin
   git@github.com:kcrobinson-1/neighborly-events.git`. Other contributors
   do the same for their clones; the redirect keeps `git fetch` working
   in the meantime.
3. Verify the Vercel git integration auto-followed the rename
   (Vercel tracks repos by ID, so the link should remain intact). If
   Vercel surfaces a reauth banner, reauth.
4. Optionally rename the local working directory from
   `neighborly-scavenger-game` to `neighborly-events`. Cosmetic; not
   tied to the PR.

## Out Of Scope (Captured As Follow-Ups If Needed)

- **Vercel project rename.** Renaming the Vercel project from
  `neighborly-scavenger-game-web` to `neighborly-events-web` would also
  require updating the fallback origin in
  `supabase/functions/_shared/cors.ts`. Deferred to a separate operator
  task with a single follow-up PR for the cors fallback edit if and
  when the Vercel rename happens.
- **Runtime identifier renames** (cookie name, header, DB function,
  storage keys, env var, npm scope). Not in scope by design — see
  cross-cutting invariants.
- **Updating archived doc GitHub URLs.** GitHub redirect handles them;
  changing them would mix textual cleanup with this PR.
- **Public brand decisions for `apps/site`.** The user-facing brand for
  Madrona and future events is decided at M4 launch, separately from
  this internal rename.

## Commit Boundaries

Single commit by default (the change is small and homogeneous — pure
textual replacement plus the plan flip). Split into two commits only if
the regenerated `package-lock.json` diff produces noisy line churn that
benefits from being isolated:

- Commit A — rename in source files (`package.json`, `apps/web/index.html`,
  `README.md`, `supabase/config.toml`, the three doc references) plus
  flip this plan's Status to `Landed`.
- Commit B — `package-lock.json` regeneration from `npm install`.

Decide at edit time based on lockfile diff size.

## Execution Steps

These are the gates a human or agent walks in order. Each gate is
present because skipping it has burned this repo before.

1. **Pre-edit gate.** Confirm clean worktree, on a feature branch (not
   `main`). Confirm the rename target name is `neighborly-events` and
   the runtime identifier preservation rule is understood.
2. **Baseline validation.** Run `npm run lint` and `npm run build:web`
   from the current state to confirm a green starting point. If either
   fails before edits, stop and report instead of editing.
3. **Source-file rename.** Apply the textual replacements enumerated in
   the "Files To Touch — In-repo identity" and "User-visible product
   copy" sections. No other edits.
4. **Doc reference rename, with parent-epic phase 0.1 paragraph
   rewrite.** Apply textual replacements in
   `docs/plans/release-readiness.md` and `docs/plans/analytics-strategy.md`
   per the "Files To Touch" enumeration. Then handle
   [`docs/plans/event-platform-epic.md`](./event-platform-epic.md) as
   two distinct edits, not a textual replace:
   - Rewrite the platform-repo intro line (currently line 42) from
     "The repo currently named `neighborly-scavenger-game` becomes the
     platform repo…" to past-tense, post-rename phrasing that reads
     coherently as the durable narrative of the platform.
   - **Rewrite the entire Phase 0.1 paragraph (currently lines 161–166)
     in place.** The current paragraph names predicted scope; the
     rewritten paragraph names *executed* scope. New paragraph must:
     name the actual touched surfaces (root `package.json`,
     `package-lock.json`, `apps/web/index.html`, `README.md`,
     `supabase/config.toml`, the three doc files, this plan); name
     the deliberately preserved prefixes (`@neighborly/web` workspace
     scope, all `neighborly` runtime identifiers) with one-line
     rationale; reference this plan
     ([`repo-rename.md`](./repo-rename.md)) as the executed contract;
     keep the "No code logic changes. One PR." closer. The paragraph
     stays present-tense in the same way phase 0.2's already-landed
     paragraph stays present-tense — past-tense conversion is not the
     goal; matching reality is.
   M0's milestone Status row stays `Proposed` per the parent epic's
   own rule (M0 only flips when phase 0.3 lands).
5. **Lockfile regeneration.** Run `npm install` to regenerate
   `package-lock.json` so the lockfile's root `name` field matches the
   new `package.json` name. Stage the diff.
6. **Plan Status flip.** Change this plan's Status from `Proposed` to
   `Landed` in the same edit pass. Do not record a commit SHA per the
   AGENTS.md Plan-to-PR Completion Gate.
7. **Repeat baseline validation.** Run `npm run lint` and
   `npm run build:web` again on the post-edit state. Both must pass.
   No new test runs are introduced; existing tests should be unaffected
   because no runtime identifier changed.
8. **Automated code-review feedback loop.** Walk the diff from a
   senior-reviewer stance. Specifically check:
   - every source-file diff line is a textual rename and nothing else;
     no runtime identifier accidentally moved; no
     `apps/web/src/lib/*` storage key or DB migration touched;
   - the parent epic's M0 milestone Status row was **not** flipped
     (only this plan was);
   - the parent epic's Phase 0.1 paragraph was rewritten to describe
     executed scope, not pre-execution scope — the words
     "all package manifests in workspaces," "CI workflow files," and
     "AGENTS.md references" no longer appear in the paragraph if they
     do not match what was actually changed;
   - the rewritten paragraph names the deliberately preserved
     `@neighborly/web` scope and the `neighborly` runtime-identifier
     prefix with rationale, so a future reader does not re-litigate
     them;
   - no archived-plan GitHub URL was changed; the
     [`docs/self-review-catalog.md`](../self-review-catalog.md)
     example anchors are byte-identical to baseline.
   Apply any review fixes, rerun lint+build, and commit review fixes
   separately if a separate commit improves the history.
9. **Documentation currency check.** Walk the AGENTS.md "Doc Currency
   Is a PR Gate" trigger list. For phase 0.1: `README.md` (yes —
   updated), `docs/plans/event-platform-epic.md` (yes — updated; M0
   row stays `Proposed`), `docs/plans/release-readiness.md` and
   `docs/plans/analytics-strategy.md` (yes — updated). The remaining
   docs the parent epic enumerates (`docs/architecture.md`,
   `docs/dev.md`, `docs/operations.md`, `docs/product.md`,
   `docs/styling.md`, `docs/open-questions.md`, `docs/backlog.md`)
   change in later M0/M1 phases, not in 0.1.
10. **Final validation.** `npm run lint` and `npm run build:web` from
    a clean shell on the final commit state.
11. **Self-review against named audits.** See the Self-Review Audits
    section below.
12. **PR preparation.** Open the PR using the
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md)
    9-section template. Title under 70 chars. Validation section lists
    `npm run lint` and `npm run build:web` checked off; `npm test`,
    `npm run test:functions`, `npm run test:supabase` listed as not
    run with the rationale "no runtime identifier or behavior change."
    Contract And Scope section explicitly states this is behavior
    preserving and lists no contract changes. UX Review section is
    `N/A` (browser tab title text changes are not UX flow changes; if
    the reviewer disagrees, capture before/after screenshots of the
    tab title only). Remaining Risk: Vercel project rename is the
    follow-up; see "Operator Steps Outside The PR" for the post-merge
    sequence.
13. **Post-merge operator action.** After merge to `main`, execute the
    four operator steps in "Operator Steps Outside The PR" above in
    order. Verify the redirect by clicking an old self-review-catalog
    link.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final.
- `npm test`, `npm run test:functions`, `npm run test:supabase` —
  intentionally not run. Rationale: this PR introduces no runtime
  identifier changes, no schema changes, and no test-relevant logic
  changes. Tests would exercise the same identifiers and code paths
  before and after. Listed in the PR body Validation section as not
  run with this rationale.
- Post-merge: confirm the GitHub redirect resolves an old PR URL,
  confirm `git fetch` works against the redirected remote, confirm
  Vercel's most recent deploy preview built successfully against the
  renamed repo.

## Self-Review Audits

Named in the parent epic for phase 0.1, drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **Rename-aware diff classification.** This PR is a multi-surface
  change touching `package.json` (config), `apps/web/index.html` (web
  app), `supabase/config.toml` (Supabase config), and several `docs/`
  files. The CI scope detector at
  [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) classifies
  by file path and may treat doc-heavy diffs as "docs only," skipping
  heavy validation. Verify the detector classifies this PR for **full
  validation** (because of `package.json`, `apps/web/index.html`, and
  `supabase/config.toml`) by inspecting the CI run on the PR before
  merging. If the detector misclassifies, treat that as the audit's
  observed regression and fix the detector before merging this PR.

General self-review (correctness, regressions in attendee flow, stale
inline comments, missing validation, complete call-site coverage) per
AGENTS.md "Self-Review Checklist" applies on top of the named audit.

## Documentation Currency PR Gate

The complete list of named docs that must reflect post-rename state by
the time this PR opens:

- `README.md` — updated (title + lead paragraph).
- `docs/plans/event-platform-epic.md` — updated (lines 42 and 162; M0
  row stays `Proposed`).
- `docs/plans/release-readiness.md` — updated (first paragraph).
- `docs/plans/analytics-strategy.md` — updated (Document Role + End
  Goal paragraphs).
- `docs/plans/repo-rename.md` — Status flipped to `Landed`.

The other docs the parent epic enumerates (`docs/architecture.md`,
`docs/dev.md`, `docs/operations.md`, `docs/product.md`,
`docs/styling.md`, `docs/open-questions.md`, `docs/backlog.md`,
`AGENTS.md`) change in later phases (M0 phase 0.3 and M1), not 0.1.

## Backlog Impact

None. Phase 0.1 closes no backlog items, opens no new ones, and
unblocks none. Backlog impact accumulates at the M0, M1, M2, M3, and M4
gates per the parent epic.

## Risk Register

- **Runtime identifier accidentally renamed.** A grep replace against
  `neighborly` instead of `neighborly-scavenger-game` would silently
  rename the cookie, header, DB function, storage keys, env var, or
  npm scope — invalidating live sessions, breaking CORS, or breaking
  test fixtures. Mitigation: cross-cutting invariant 2 above; the
  enumerated "Files Intentionally Not Touched" list; the code-review
  feedback loop step explicitly checks for this; lockfile regeneration
  is the only sanctioned tool that touches multiple files at once.
- **CI scope detector misclassifies as docs-only.** Mitigation: the
  Rename-aware diff classification audit above.
- **Vercel git integration drops the rename.** Vercel tracks repos by
  ID, so the integration should auto-follow. Mitigation: operator step
  3 explicitly verifies, with reauth as the documented fallback.
- **Contributor with a stale clone pushes against the old name.**
  GitHub redirect keeps `git push` working transparently, but the
  contributor will see a "this repo has moved" notice. Mitigation: not
  required — the redirect does the work.

## Related Docs

- [`event-platform-epic.md`](./event-platform-epic.md) — parent epic
- [`framework-decision.md`](./framework-decision.md) — sibling phase
  0.2 plan (already landed) for naming-convention reference
- [`AGENTS.md`](../../AGENTS.md) — planning depth, plan-to-PR gate,
  doc currency, validation honesty
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  Rename-aware diff classification audit
