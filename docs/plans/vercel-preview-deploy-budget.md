---
name: Vercel preview-deploy consumption on draft PRs — investigation
description: Investigation and decision plan for reducing Vercel Hobby-tier preview-deploy consumption on draft PRs after PR #205 hit the 100/day cap.
type: investigation
status: Draft
---

# Investigate and reduce Vercel preview-deploy consumption on draft PRs

## Problem

The Vercel Hobby tier caps deployments at 100/day per account. PR
#205 hit this ceiling (`api-deployments-free-per-day`, "more than
100") and blocked the preview build until the counter rolled over.
Current workflow triggers a preview build on every push to every PR
— including drafts and force-pushes — which burns budget fast on
iterative work that doesn't need a live preview.

## Goal

Reduce daily Vercel deployment count enough that draft-heavy days
don't hit the 100/day ceiling, without losing preview coverage on
PRs that are actually under review.

## Investigation

Walk through each lever, evaluate fit for this repo, and pick a
combination:

1. **Confirm project fan-out.** Check Vercel dashboard for how many
   projects are connected to `kcrobinson-1/neighborly-events`. If
   anything beyond `neighborly-events-site` is wired up, each push
   multiplies. Disconnect anything that shouldn't be deploying per
   push.

2. **Auto-cancel superseded builds.** Verify Project Settings →
   Git → "Automatically cancel outdated deployments" is enabled.
   Force-pushes (which this repo does — see #205's force-push to
   `feat/madrona-feedback-m1-phase-1-1`) should kill the in-flight
   build, not stack a second one.

3. **Ignored Build Step** (highest-leverage option for the draft
   case). Project Settings → Git → Ignored Build Step. Write a
   shell check that exits 0 (skip) when:
   - The PR is in draft state, OR
   - The diff touches only paths that don't affect the deployed
     site (e.g. `supabase/migrations/**`, `supabase/tests/**`,
     `docs/**`, `shared/db/types.ts`).

   PR #205 is a clean example of the second case — DB migration +
   pgTAP fixture + docs, zero apps/site impact, but still consumed
   a deployment slot. The check can use `VERCEL_GIT_COMMIT_REF`,
   `VERCEL_GIT_PREVIOUS_SHA`, and `git diff --name-only` to decide.

4. **Branch-level deployment gating in `vercel.json`.** Investigate
   whether `git.deploymentEnabled` (per-branch map or glob) is a
   cleaner expression than the Ignored Build Step for the draft
   case specifically. Compare ergonomics — the Ignored Build Step
   is more flexible (can inspect the diff) but `vercel.json` is
   more declarative.

5. **Commit-message skip convention.** Decide whether to adopt a
   `[skip-preview]` token in commit messages for known
   no-op-on-site commits (the 1.1 close-out doc commit on #205
   would qualify), and have the Ignored Build Step honor it.

## Acceptance

- A documented decision in `docs/` about which combination of the
  above is in effect, and why.
- The Ignored Build Step (or equivalent) is in place and verified
  by pushing a docs-only commit to a draft branch and confirming
  Vercel skips the build.
- A regression smoke test: a real apps/site change on a non-draft
  PR still triggers a preview deploy.
- Rough estimate of expected daily-deploy reduction, based on a
  week's worth of recent push history.

## Out of Scope

- Upgrading to Vercel Pro. The point of this item is to stay on
  Hobby; if investigation concludes the limits can't be made to
  fit the workflow, that's a separate decision item.
- Changing the GitHub Actions CI matrix. Vercel-only.

## Notes

PR #205 is the reference incident. The second push on that PR
(after force-push) succeeded, so the limit is a daily rolling cap,
not a hard account block — meaning fixes can be validated
incrementally without waiting on Vercel support.
