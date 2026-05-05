# UI Review Workflow

Per-session-type playbook for capturing UI screenshots and building
PR screenshot evidence. Layer this on top of
[`implementation.md`](./implementation.md) when the change modifies
UX, layout, interaction flow, or user-facing copy.

## UI Review Runs

If you validate the UI by running the app locally and taking screenshots:

- use Playwright rather than code-only visual guesses whenever browser automation is feasible
- prefer a real browser pass over code-only visual guesses
- use a mobile viewport first because the attendee flow is mobile-first
- confirm direct route loading as well as the main click-through flow
- capture the key states you are reviewing, not just the landing page

If a change modifies UX, layout, interaction flow, or user-facing copy in a meaningful way:

- capture relevant before screenshots before editing when browser automation is feasible
- capture matching after screenshots after the implementation is complete
- use the same routes, states, viewport, and scroll context for the before/after pair whenever practical
- include a before/after comparison in the pull request description, not just a prose summary
- treat this as part of the expected review flow for UX-facing pull requests, not as an optional polish step

Prefer the reusable capture workflow already in the repo:

- keep reusable automation logic in [`scripts/ui-review/`](/scripts/ui-review/)
- use [`scripts/ui-review/capture-ui-review.cjs`](/scripts/ui-review/capture-ui-review.cjs) as the default screenshot workflow
- extend that script when future verification needs new routes, states, or capture scenarios instead of creating one-off temp scripts unless the task is truly experimental

Expected setup and execution:

- start the web app locally, usually on `http://127.0.0.1:4173`
- make sure Playwright and its browser dependency are available
- if Chromium has not been installed yet, run `npx playwright install chromium`
- run `npm run ui:review:capture`
- for admin-facing PRs, run `npm run ui:review:capture:admin` instead;
  it intercepts Supabase requests with Playwright route mocks so no
  production data is read or written. Setup and captured states are
  documented in [`docs/dev.md`](/docs/dev.md) "Admin UI review."

Backend nuance:

- prefer remote Supabase-backed UI review when the project env vars are configured locally
- the normal backend-backed review path is a configured remote Supabase project tested from a local frontend via `npm run dev:web` or `npm run dev:web:local`
- if you use remote Supabase from a local web app, make sure the project `ALLOWED_ORIGINS` secret includes the local origin you are using
- if `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are not configured locally, run UI review against the Vite dev server, not a production preview build
- the browser-only completion fallback is development-only and should only be used when explicitly enabled with `VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK=true`
- when you need a fixed host and port for Playwright, prefer `npm run dev:web:local`

Deployment expectations:

- use pull requests plus GitHub CI before merging to `main`
- treat dashboard-only production edits as out of bounds unless they are immediately reconciled back into repo migrations or function source

The capture script supports future reuse:

- it writes screenshots into a timestamped folder under `tmp/ui-review/`
- it accepts `--base-url` when the local app is running on a different origin
- it accepts `--output-dir` when a task needs a specific artifact location

Recommended UX-change screenshot process:

1. Run the capture flow before making changes and save the images in a dedicated timestamped folder such as `tmp/ui-review/<timestamp>-before/`.
2. Make the UX change.
3. Run the same capture flow again and save the images in a separate folder such as `tmp/ui-review/<timestamp>-after/`.
4. Select the key comparison images for the PR, usually mobile-first screens and any important error, completion, or edge states touched by the change.
5. Keep the raw screenshots in `tmp/` only; do not move them into tracked repo paths.

Treat screenshot artifacts as temporary analysis output.

- write screenshots under `tmp/`
- do not commit generated screenshots
- make sure the output path is ignored by git before finishing

Do not let one screenshot run overwrite or mix with another accidentally.

The default expectation is one timestamped subfolder per run. Only reuse an existing output directory if the task explicitly benefits from overwriting a prior capture set.

Before finishing a UI-review task, make sure you do not leave behind ambiguous mixed runs that make later analysis harder.

## Pull Request Screenshot Process

When a PR should show screenshots, do not satisfy that by committing image artifacts into the repository.

Use this process instead:

1. Capture the images into `tmp/ui-review/` as described above.
2. Upload only the selected PR images to an external image host so the PR description can reference them by URL.
3. A working example used in this repo is:

```bash
curl -F "reqtype=fileupload" -F "fileToUpload=@tmp/ui-review/<run>/<image>.png" \
  https://catbox.moe/user/api.php
```

4. Paste the returned image URLs into the PR body with normal Markdown image syntax.
5. Keep the local screenshots untracked and temporary; do not add them to git, and do not create tracked docs-only image folders just to support the PR description.

This keeps the repo aligned with the rule that generated screenshots live under `tmp/` and are not committed, while still making before/after comparisons visible in review.

## UI self-review

The general self-review checklist lives in
[`implementation.md`](./implementation.md) "Self-Review Checklist."
For UI changes, additionally confirm:

- the flow still feels mobile-first and one-step-at-a-time
- direct route loading still works
- progress, answer selection, submission, and completion states still make sense
- browser tests still use realistic interactions unless there is a documented reason not to
