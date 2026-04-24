# Development Workflow Improvements

## Purpose

Track bounded improvements to contributor and agent workflow that are valuable
but not required for the current feature branch.

Use this file for process, automation, validation, screenshot, and PR-review
workflow tasks that are too concrete for `open-questions.md` but are not
behavior-preserving code refactors.

## Candidate Tasks

### Add a stable PR screenshot upload path

Status: open

Value:

- avoids agents discovering screenshot hosts during PR creation
- makes UX-facing PR descriptions consistently reviewable
- keeps generated screenshots out of `main` while still producing stable image
  URLs for GitHub Markdown
- reduces dependence on anonymous upload services that may be rate-limited,
  paused, temporary, or blocked

Recommended shape:

- add a repo-supported upload command, for example `npm run ui:review:upload`
- back the command with a small script under `scripts/ui-review/`
- upload selected files from `tmp/ui-review/<run>/` to one stable provider
- print Markdown image snippets or a PR-ready screenshot section
- document the supported provider and required local environment variables in
  `docs/dev.md`
- update `AGENTS.md` to say agents must use the supported upload path and should
  not try undocumented anonymous hosts during PR creation

Stable provider options to evaluate:

- Vercel Blob or Cloudflare R2 public bucket, preferred for a scriptable,
  agent-friendly workflow with durable URLs
- Supabase Storage public bucket, reasonable because the project already uses
  Supabase but potentially undesirable if review artifacts should stay separate
  from app backend resources
- GitHub Pages on a dedicated screenshots branch, stable and GitHub-native but
  stores generated artifacts in Git history and needs cleanup policy
- GitHub Actions artifacts plus PR comment, repo-native but less useful for
  inline PR-body image review and may expire

Open questions:

- Which storage provider should own PR-only review artifacts?
- What credential should local agents use, and where should contributors obtain
  it?
- Should screenshot URLs be permanent, time-limited, or cleaned up after PR
  merge?
- Should the upload script edit the PR body directly, print Markdown for manual
  review, or support both modes?
- Should CI also upload screenshots for specific UI test jobs, or should this
  remain a local PR-author workflow?

Steps to complete:

1. Choose the storage provider and retention policy.
2. Add a self-checking upload script under `scripts/ui-review/` that fails with
   clear setup guidance when credentials are missing.
3. Add an npm wrapper such as `ui:review:upload`.
4. Document setup, command usage, output format, retention, and failure handling
   in `docs/dev.md`.
5. Update `AGENTS.md` to require the supported upload path for UX-facing PR
   screenshots and to stop rather than improvising with random hosts when the
   path is unavailable.
6. Validate from a fresh local screenshot folder by uploading at least two PNGs
   and embedding the returned URLs in a test PR or draft PR.

Minimum validation:

- `npm run ui:review:capture`
- `npm run ui:review:upload -- tmp/ui-review/<run>`
- confirm the returned image URLs render in a GitHub PR description or comment

### Add an admin UI-review capture mode

Status: landed (5df06c5 mock fix; this PR closes the item)

Implemented as `npm run ui:review:capture:admin` (also reachable as
`npm run ui:review:capture -- --mode admin`). Captures 14 mocked
states across mobile and desktop viewports: sign-in, all-events list,
selected-event editor, client-side validation error, save success,
save error, question editor, signed-in-but-not-allowlisted, and the
draft-only workspace variant. Documented in
[`docs/dev.md` "Admin UI review"](../dev.md). Referenced from the PR
screenshot workflow in `AGENTS.md` "UI Review Runs" and from
[`docs/testing-tiers.md`](../testing-tiers.md) Tier 4.

Resolved decisions:

- The admin mode lives inside the existing
  `scripts/ui-review/capture-ui-review.cjs` as `--mode admin` rather
  than a sibling script. Splitting the file is tracked separately at
  refactor-checklist score 7/10
  ([`docs/tracking/code-refactor-checklist.md`](./code-refactor-checklist.md))
  and is not blocking.
- The mocked draft fixture is inline in the script. Sharing it with a
  test fixture module is deferred — the admin capture and the test
  suite have not yet drifted, and inline keeps the capture script
  readable as a single artifact.
- The capture is fully Playwright-mocked. Supporting a real disposable
  Supabase admin environment is deferred — the existing local Supabase
  CLI workflow already covers admin-write smoke testing for engineers
  who need it, and the Tier 5 production smoke covers post-deploy
  admin behavior. Adding a third capture mode would duplicate
  responsibility without closing a gap that current admin UX PRs hit.
- Phase 4.2 create + duplicate captures are deferred. The current 14
  states cover the editor surfaces a UX PR typically needs to evidence;
  the create/duplicate transitions land back on the workspace editor,
  which is already captured. If a future Phase 4.2 PR needs the
  in-flight create form or duplicate confirmation states, that PR can
  extend the script's `captureAdminWorkspaceStates`.
- Console-error capture and pre-screenshot selector waits together
  satisfy the "console-error and blank-page checks" requirement.
  Each capture function attaches a `page.on("console")` listener that
  logs error-type messages, and each screenshot is gated on a
  selector that only renders once the relevant state has actually
  loaded (e.g. `.admin-details-form`, `.admin-message-success`,
  `.admin-message-error`, "Event workspace" heading). A blank or
  stuck page fails the `waitFor` instead of producing a misleading
  screenshot.

Validation run on this branch: `npm run dev:web:local` +
`npm run ui:review:capture:admin` produced all 14 screenshots from
a clean dev-server start; `npm run lint` is green. The capture
exposed and fixed a real bug in the admin mock (commit 5df06c5)
where the `game_event_drafts*` route returned the entire fixture
array on `.maybeSingle()` calls, tripping PGRST116 and rendering
the workspace error state. Without this validation pass the bug
would have shipped silently.

### Surface CI step logs in PR comments on failure

Status: open

Value:

- AI coding agents working inside a session cannot authenticate to the GitHub
  Actions logs API, so when a PR CI run fails with a test error, the agent has
  no direct way to see the actual failing assertion, stack trace, or SQL error.
  Without that context, the next fix has to be a guess, and a blind guess tends
  to stack more speculative commits that later need to be reverted.
- Copying log output into chat every failure works as a short-term fallback but
  is high-friction for the human and easy to forget across sessions.
- One automated comment per failing CI run keeps the real diagnostic visible in
  the PR thread, where PR activity webhooks already relay it back to the agent.

Recommended shape:

- add a final step to the `Lint, Tests, Build, and Supabase Checks` job in
  `.github/workflows/ci.yml` that runs on `if: failure()`
- use `actions/github-script` (or equivalent) with the automatically provided
  `GITHUB_TOKEN` to fetch the current run's job logs
- tail the last ~200 lines of the first failing step so the comment stays small
- post the tail as a PR comment scoped to `pull_request` events only, so push
  builds on `main` do not produce comments
- prefix the comment with the failing step name and link to the job URL
- do not attempt to distinguish flakes from real failures in the first version;
  every failure gets a comment

Open questions:

- Should the comment be edited in place across subsequent runs on the same PR
  head, or should each new failure produce a new comment? Latter is simpler;
  former reduces thread noise but adds coordination.
- Should any content be redacted before posting? Current CI jobs run against
  local ephemeral Supabase and do not touch production secrets, so leakage risk
  is low; revisit if a future step starts handling real credentials.

Steps to complete:

1. Draft the new workflow step in `.github/workflows/ci.yml`.
2. Test by opening a throwaway PR with a deliberately failing assertion and
   confirm a useful log tail lands as a comment.
3. Update `AGENTS.md` to point at the PR comment as the canonical source of
   post-CI debugging context, replacing the current "ask the human to paste the
   log" fallback.

Minimum validation:

- a throwaway failing PR produces a comment that includes the failing step
  name, a job-URL link, and a readable log tail
- a passing PR produces no comment
- `npm run lint`
