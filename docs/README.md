# Documentation Guide

This repo uses a small set of docs with intentionally different roles.

Use this page when you are deciding where to start reading or where a future doc change belongs.

## Folder Layout

The docs are organized by how each file is used, not by topic:

- `docs/` (flat): canonical evergreen docs that describe the current system.
  These are the files readers reach for most often and that `AGENTS.md` links to
  directly.
- `docs/plans/`: forward-looking design, strategy, and roadmap docs for bounded
  work that has not yet fully shipped. Includes feature plans, cross-cutting
  migrations, and release-readiness methodology.
- `docs/plans/archive/`: plans whose work has landed. Kept for historical
  context, not for active tracking.
- `docs/tracking/`: running-state checklists, audits, and trackers. These files
  grow and get items checked off as work happens.

When a new doc is added, place it by role: if it describes "what is", it is
flat; if it describes "what we will build next", it is a plan; if it is a
checklist or a running tracker, it is in `tracking/`.

## Start Here

If you want:

- a quick project overview and setup entrypoint, start with [../README.md](/README.md)
- the problem, users, goals, and success criteria, read [product.md](/docs/product.md)
- the intended attendee and organizer experience, read [experience.md](/docs/experience.md)
- the current system shape, trust boundaries, the Vercel routing topology,
  and the Supabase Auth surface (including the `@supabase/ssr` cookie
  internals), read [architecture.md](/docs/architecture.md)
- the local workflow, validation commands, release flow, or troubleshooting
  steps — including the dev-workflow-specific guidance that follows from the
  auth surface described in architecture.md — read [dev.md](/docs/dev.md)
- the named audits to run on a diff before push, read [self-review-catalog.md](/docs/self-review-catalog.md)
- the redemption MVP design (operator flow, RPC envelope, reversal model), read [redemption-design.md](/docs/redemption-design.md)
- the platform token classification, color-derivation policy, and per-event Theme model, read [styling.md](/docs/styling.md)
- the testing-tier map (which tier gates which decision), read [testing-tiers.md](/docs/testing-tiers.md)
- the testing strategy, current coverage snapshot, command-selection matrix, and rollout plan, read [testing.md](/docs/testing.md)
- the platform ownership model and live monitoring runbook for GitHub, Vercel, and Supabase, read [operations.md](/docs/operations.md)
- the prioritized post-MVP follow-up work across all concern areas, read [backlog.md](/docs/backlog.md)
- the unresolved product, UX, and workflow decisions, read [open-questions.md](/docs/open-questions.md)
- proposed improvements to local validation, screenshot, PR, and agent workflow,
  read [tracking/dev-workflow-improvements.md](/docs/tracking/dev-workflow-improvements.md)
- the analytics strategy, tool recommendations, and dashboard goals, read [tracking/analytics-strategy.md](/docs/tracking/analytics-strategy.md)
- the documentation maintenance plan, read [tracking/documentation-quality-checklist.md](/docs/tracking/documentation-quality-checklist.md)
- the living release readiness plan and quality-check methodology, read [tracking/release-readiness.md](/docs/tracking/release-readiness.md)

## Doc Ownership

Use these boundaries to keep the docs tidy:

- `README.md`
  repo overview, current milestone snapshot, quick-start entrypoint, and links to deeper docs
- `docs/product.md`
  why the product exists, who it serves, what success looks like, and what stays out of scope
- `docs/experience.md`
  UX goals, interaction rules, attendee flow, volunteer flow, and visual direction
- `docs/architecture.md`
  current implementation shape, runtime flow, data ownership, trust boundaries,
  the Vercel routing topology, and the Supabase Auth surface (including the
  `@supabase/ssr` cookie internals)
- `docs/dev.md`
  how engineers work in the repo today: setup, validation, release flow,
  troubleshooting, and the dev-workflow-specific guidance that follows from
  the auth surface (test patterns, e2e proxy, cookie-boundary verification recipe)
- `docs/self-review-catalog.md`
  named, reusable audits to run on a diff before push — each audit has a
  specific trigger, concrete check steps, and a past incident example
- `docs/redemption-design.md`
  reward-redemption MVP design: operator flow, RPC envelope, reversal model,
  and authorization model
- `docs/styling.md`
  binding token classification, color-derivation policy, and per-event `Theme`
  model
- `docs/testing-tiers.md`
  cross-cutting map of testing tiers — what each tier catches, where it runs,
  and which decisions it can gate
- `docs/testing.md`
  what to test, where tests should run, what to mock, and what is intentionally overkill right now
- `docs/operations.md`
  what is repo-managed versus manually maintained across platforms, plus the
  current live monitoring and log-triage runbook
- `docs/backlog.md`
  single priority-ordered list of post-MVP follow-up work across all concern
  areas, with one detail file per entry
- `docs/open-questions.md`
  unresolved decisions that should stay explicit instead of being guessed in canonical docs
- `docs/tracking/dev-workflow-improvements.md`
  concrete follow-up tasks for improving local validation, screenshot capture,
  PR evidence, and agent workflow
- `docs/tracking/analytics-strategy.md`
  end goal of analytics, approaches, evaluation criteria, third-party tool guidance, and dashboard goals
- `docs/tracking/documentation-quality-checklist.md`
  recurring documentation maintenance checklist and quality-improvement plan
- `docs/tracking/code-refactor-checklist.md`
  small behavior-preserving refactor tasks for oversized files that have clear
  split points
- `docs/tracking/release-readiness.md`
  living release readiness plan and senior-engineer quality-check methodology;
  coordinates with the other trackers rather than duplicating them

## Editing Rule Of Thumb

When two docs seem likely to overlap:

- put the deeper explanation in the doc that owns the topic
- keep the other doc short and link to the owner
- prefer one canonical setup or release procedure instead of repeating the same steps in multiple places

That keeps the docs easier to scan at the end of a milestone and easier to trust at the start of the next one.
