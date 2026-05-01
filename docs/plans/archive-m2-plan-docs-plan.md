# Archive M2 Plan Docs

## Status

Proposed.

## Context

M2 closed when phase 2.5.3 merged in [#133](https://github.com/kcrobinson-1/neighborly-events/pull/133): every Phase Status row in
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md) reads
`Landed`, the milestone doc's top-level Status reads `Landed`, and the
[epic's M2 row](./event-platform-epic.md#L19) reads `Landed`. The 14 M2
plan-doc files now sit in `docs/plans/` next to the active milestone
docs (M3, M4) that future work drafts against. Holding closed-milestone
plans in the active namespace makes the active set noisier with every
landed milestone — by M3's terminal PR there would be ~20 closed M2/M3
plans crowding the new-work surface, and the implicit "this directory
is the active plan set" cue contributors and agents already use to
orient themselves erodes.

The 2.5.3 plan named this archive move as the follow-up that resolves
its own deliberate option-3 link-rewrite bias: every M2-internal
scoping-doc reference rewrote to plain-text path prose specifically
because option-1 rewrites pointing at
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md) sections
would need re-resolution when the milestone doc itself archives. That
follow-up is this PR.

This task touches docs only — no code, no test, no configuration, no
runtime behavior. The load-bearing edit is link consistency across the
move: 14 file renames via `git mv` (history-preserving), bulk
relative-path rewrites inside the moved files (the new path depth adds
one level), and four surviving doc surfaces with M2 references that
update to point at the archive location.

## Goal

Move the 14 M2 plan-doc files from `docs/plans/` into a new
`docs/plans/archive/m2/` subdirectory via `git mv` so blame and history
follow each file. Rewrite every relative link inside the moved files so
the link still resolves at the new depth. Rewrite every reference from
surviving doc surfaces (epic, milestone-list-style trackers,
`AGENTS.md`, `docs/open-questions.md`, `docs/backlog.md`) so
post-archive readers reach the moved files. Remove the
"Archive M2 plan docs" entry from
[`docs/backlog.md`](../backlog.md) since this PR completes it.

After the PR:

- `docs/plans/` no longer contains any `m2-*` plan files and no
  longer contains this plan; the active plan set surfaces the active
  milestones (M3, M4) and durable plans unmuddied by closed-milestone
  history or by the transient plan that produced the archive.
- `docs/plans/archive/m2/` contains the 14 M2 plan files **plus this
  plan**. Intra-M2 cross-links resolve (sibling files in the same new
  directory). Out-of-folder links resolve (relative paths adjusted by
  two levels). This plan moves alongside the M2 set rather than
  staying in the active namespace because (a) it documents the M2
  archival action and is thematically cohesive with the artifacts it
  archived, (b) most of its `./m2-…` references stay valid as
  sibling references in the new directory rather than needing a
  separate rewrite pass, and (c) it has no further reuse value once
  M2 is archived — leaving it in `docs/plans/` would clutter the
  active namespace exactly the way the M2 plan-doc set does today.
- Every reference in surviving doc surfaces (epic, AGENTS.md,
  open-questions) points at the archive location.
- The backlog entry removes; this plan's Status flips to `Landed`
  before it self-archives.

Single PR. No production behavior change. No code, test, config, or
migration touched.

**Out of scope for this PR — archive M0 / M1 plans.** The backlog entry
is explicit: M0 ([`framework-decision.md`](./framework-decision.md),
[`site-scaffold-and-routing.md`](./site-scaffold-and-routing.md)) and
M1 ([`shared-auth-foundation.md`](./shared-auth-foundation.md),
[`shared-db-foundation.md`](./shared-db-foundation.md),
[`shared-events-foundation.md`](./shared-events-foundation.md),
[`shared-styles-foundation.md`](./shared-styles-foundation.md),
[`shared-urls-foundation.md`](./shared-urls-foundation.md)) plans
archive when their respective milestones close. M0 and M1 are already
landed per the epic's milestone status table, so they could move now —
but bundling expands scope beyond the requested backlog item, mixes
three independent decisions ("when does M0 archive," "when does M1
archive," "where does the archive convention nest") into one PR, and
the per-milestone archive moves are independently reviewable.

## Cross-Cutting Invariants

These rules thread every diff line in this PR. Self-review walks each
one against every changed file, not just the file the rule was first
triggered on.

- **History preservation via `git mv`.** Every move uses `git mv`, not
  delete + create. PRs that retroactively move docs without `git mv`
  break `git log --follow` and `git blame` lineage, which the M2
  authors will reach for when revisiting decisions. A `git log
  --follow` spot-check on one moved file after the move commit
  confirms history follows.
- **Sibling intra-M2 links unchanged.** All 14 files move into the same
  new directory together, so any `](./m2-...)` link from one moved
  file to another stays valid as-is. The `./` prefix continues to mean
  "sibling in this directory" — the directory is just deeper now.
  Self-review confirms no accidental rewrite of these links.
- **Up-tree links gain two `../` levels.** Moving from `docs/plans/`
  (depth 2) to `docs/plans/archive/m2/` (depth 4) adds **two**
  directory levels, so every relative path that starts with `..` needs
  two more `..` segments to resolve to the same absolute target.
  Mechanically: `](../X)` → `](../../../X)` in every moved file (a
  bulk replacement of the literal substring `](../` with `](../../../`
  also correctly handles deeper paths — `](../../X)` becomes
  `](../../../../X)` because only the leading `](../` is matched).
  The replacement is global within each file because every `](../*)`
  link's target is *outside* the M2 set (architecture docs, code
  paths, root-level files) and stays put. Off-by-one in this rule is
  the highest-likelihood silent regression: a `+1` rewrite resolves
  paths to `docs/plans/archive/`, not to `docs/`. Self-review's
  link-consistency audit walks at least one rewritten link per file
  to disk to catch this if it slipped.
- **Same-`docs/plans/` `./` links rewrite to `../../`.** Moved files
  also reference siblings in the *original* `docs/plans/` directory:
  [`event-platform-epic.md`](./event-platform-epic.md) (epic, stays),
  [`shared-auth-foundation.md`](./shared-auth-foundation.md),
  [`shared-events-foundation.md`](./shared-events-foundation.md),
  [`shared-styles-foundation.md`](./shared-styles-foundation.md),
  [`shared-urls-foundation.md`](./shared-urls-foundation.md), and
  [`site-scaffold-and-routing.md`](./site-scaffold-and-routing.md).
  Each of those `](./X.md)` links rewrites to `](../../X.md)`. The
  enumeration is closed — every `./` reference inside an M2 file
  either points at another M2 file (stays as `./`) or at one of the
  six listed targets (rewrites to `../../`). Self-review's link audit
  walks the closed enumeration against the post-move grep.
- **No content edits beyond link rewrites and Status flip.** Doc-only
  archive moves do not invite scope expansion: no rewriting of frozen
  PR/commit URLs, no reformatting, no "while I'm here" cleanup. Any
  content change beyond mechanical relative-path rewrites and this
  plan's Status flip is out of scope and indicates drift.

## Files To Touch

### Move (14 files via `git mv` to `docs/plans/archive/m2/`)

- `docs/plans/m2-admin-restructuring.md`
- `docs/plans/m2-phase-2-1-plan.md`
- `docs/plans/m2-phase-2-1-1-plan.md`
- `docs/plans/m2-phase-2-1-2-plan.md`
- `docs/plans/m2-phase-2-2-plan.md`
- `docs/plans/m2-phase-2-3-plan.md`
- `docs/plans/m2-phase-2-4-plan.md`
- `docs/plans/m2-phase-2-4-1-plan.md`
- `docs/plans/m2-phase-2-4-2-plan.md`
- `docs/plans/m2-phase-2-4-3-plan.md`
- `docs/plans/m2-phase-2-5-plan.md`
- `docs/plans/m2-phase-2-5-1-plan.md`
- `docs/plans/m2-phase-2-5-2-plan.md`
- `docs/plans/m2-phase-2-5-3-plan.md`

Plain-text paths above (no clickable link) avoid creating broken links
inside this plan once the targets move. The new directory
(`docs/plans/archive/m2/`) is created implicitly by the first `git mv`.

### Modify (link rewrites within moved files)

Every moved file gets two passes of relative-path rewrites:

- **Up-tree paths.** Replace `](../` with `](../../../` everywhere
  (adding two `..` segments per the depth math in the Cross-Cutting
  Invariant). Covers every reference to docs
  (`../architecture.md` → `../../../architecture.md`), code
  (`../../apps/...` → `../../../../apps/...`,
  `../../shared/...` → `../../../../shared/...`,
  `../../supabase/...` → `../../../../supabase/...`), and root-level
  files (`../../AGENTS.md` → `../../../../AGENTS.md`,
  `../../README.md` → `../../../../README.md`,
  `../../.github/...` → `../../../../.github/...`). Pre-edit grep
  counts ~931 occurrences across the 14 files; the literal-string
  replacement is unambiguous — every `](../...)` link in the M2
  plan-doc set targets something outside the M2 set and stays put.
- **Same-directory `./` paths to non-M2 siblings.** Replace
  `](./event-platform-epic.md` → `](../../event-platform-epic.md`,
  `](./site-scaffold-and-routing.md` →
  `](../../site-scaffold-and-routing.md`, and each of the four
  `](./shared-*-foundation.md` references with the matching
  `](../../shared-*-foundation.md` rewrite. The closed enumeration
  (epic, M0 site-scaffold, four M1 foundations) is verified against
  the pre-edit grep.

Sibling M2 references (`](./m2-admin-restructuring.md...)`,
`](./m2-phase-2-X-Y-plan.md...)`) stay verbatim — the sibling files
move alongside.

### Modify (link rewrites in surviving doc surfaces)

These four files retain references into the M2 set after the move and
must rewrite each reference to the archive path.

- **[`AGENTS.md`](../../AGENTS.md)** — single reference at line 256
  citing the M2 milestone doc as a Mermaid-graph example. Updates from
  `docs/plans/m2-admin-restructuring.md` to
  `docs/plans/archive/m2/m2-admin-restructuring.md`. The example is
  still valid (the graph still demonstrates the contract); only the
  path resolves to the archived location. Verified by:
  [`AGENTS.md:256`](../../AGENTS.md#L256).
- **[`docs/open-questions.md`](../open-questions.md)** — single
  reference at line 36 in the "Authoring And Publishing" section's
  resolution prose pointing at the M2 milestone doc as the resolution
  source. Updates to `./plans/archive/m2/m2-admin-restructuring.md`.
  Verified by: [`docs/open-questions.md:36`](../open-questions.md#L36).
- **[`docs/plans/event-platform-epic.md`](./event-platform-epic.md)** —
  two prose-narrative references at lines 546 and 583 pointing at the
  M2 milestone doc. Both rewrite from `./m2-admin-restructuring.md`
  to `./archive/m2/m2-admin-restructuring.md`. The earlier draft of
  this plan also claimed a line-19 row-link rewrite, but the milestone
  status table at lines 15–20 has only `Milestone | Status` columns —
  no plan-link column exists on the M2 row, so there is no link to
  rewrite there. Verified by:
  [`docs/plans/event-platform-epic.md:546,583`](./event-platform-epic.md#L546)
  and `grep -nE 'm2-(admin-restructuring|phase-2-)' docs/plans/event-platform-epic.md`
  returning exactly those two hits.
- **[`docs/backlog.md`](../backlog.md)** — the "Archive M2 plan docs"
  entry at lines 194–211 removes entirely (this PR completes it).
  No other M2 references in the backlog survive the entry removal.
  Verified by: [`docs/backlog.md:194`](../backlog.md#L194).

### Modify + move (this plan, self-archive)

- **This plan** — Status flips from `Proposed` to `Landed` per the
  Plan-to-PR Completion Gate, then self-archives via
  `git mv docs/plans/archive-m2-plan-docs-plan.md docs/plans/archive/m2/`.
  In-file relative-path rewrites apply per the same rules as the M2
  set with the following per-link enumeration (this plan's references
  differ slightly from the M2 plans' because it cites `repo-rename.md`
  and `archive/quiz-authoring-plan.md`, neither of which appears in
  the M2 set):
  - `](./m2-admin-restructuring.md)`,
    `](./m2-phase-2-5-3-plan.md)` — stay verbatim. Sibling references
    in the new `archive/m2/` directory; both targets moved alongside
    in earlier execution steps.
  - `](./event-platform-epic.md…)` → `](../../event-platform-epic.md…)`
    (epic stays in `docs/plans/`).
  - `](./framework-decision.md)` →
    `](../../framework-decision.md)` (M0 plan stays in `docs/plans/`
    until its own archive PR).
  - `](./repo-rename.md)` → `](../../repo-rename.md)` (M0 plan,
    same as above).
  - `](./archive/quiz-authoring-plan.md)` →
    `](../quiz-authoring-plan.md)`. Special case: target is in
    `docs/plans/archive/`, new location is `docs/plans/archive/m2/`,
    so the new relative path is one level up to the parent
    `archive/` directory. Not covered by the bulk
    `](./` → `](../../` rule because the target is one level deeper
    than the other `./X.md` references.
  - `](../X)` → `](../../../X)` everywhere — same `+2 levels` rule
    as the M2 set, applied to this plan's references to
    `../backlog.md`, `../open-questions.md`, `../architecture.md`,
    `../dev.md`, `../operations.md`, `../product.md`,
    `../self-review-catalog.md`, `../../AGENTS.md`,
    `../../README.md`, `../../.github/pull_request_template.md`.
  - HTTPS URLs (e.g., `https://github.com/…`) stay verbatim. They
    are not relative paths.

  Verified by enumeration against
  `grep -oE '\]\([^)]+\)' docs/plans/archive-m2-plan-docs-plan.md | sort -u`
  at edit time; the closed enumeration above covers every unique
  link target the plan currently emits.

### Files intentionally not touched

- **M0 plans** (`framework-decision.md`,
  `site-scaffold-and-routing.md`) and **M1 plans**
  (`shared-auth-foundation.md`, `shared-db-foundation.md`,
  `shared-events-foundation.md`, `shared-styles-foundation.md`,
  `shared-urls-foundation.md`) — out of scope per backlog and
  Goal-section explanation.
- **Existing `docs/plans/archive/`** files — already archived; no
  links into the M2 set per pre-edit grep.
- **Code, tests, configuration, migrations, edge functions, scripts,
  styles** — this PR is doc-only.
- **Frozen PR / commit URL references** inside any moved file — those
  anchor specific git history (per the
  [`docs/plans/repo-rename.md`](./repo-rename.md) precedent) and stay
  verbatim.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree, feature branch (this
   plan should already be on its own branch — `git mv` operations on
   `main` violate the Pre-Edit Gate). Confirm M2's terminal status
   per [`m2-admin-restructuring.md`](./m2-admin-restructuring.md):
   every Phase Status row reads `Landed`, top-level Status reads
   `Landed`, and the
   [epic M2 row](./event-platform-epic.md#L19) reads `Landed`. If any
   row reads otherwise, escalate — this PR is premature.
2. **Baseline validation.** Run `npm run lint` and `npm run build:web`
   from a clean state. Both must pass before any edit. (Doc-only PRs
   don't strictly need either, but a clean-baseline run rules out
   pre-existing failures on `main` that would otherwise surface as CI
   failures on this PR.)
3. **Repo-wide grep audit (baseline).** Capture the output of:
   - `grep -rEn 'm2-(admin-restructuring|phase-2-)' --include="*.md" --include="*.ts" --include="*.tsx" --include="*.cjs" --include="*.json" --include="*.sql" --exclude-dir=node_modules .` — every text reference to an M2 plan filename, regardless of path-prefix style (`docs/plans/m2-…`, `./plans/m2-…`, `./m2-…`, `../plans/m2-…`, bare `m2-…` in prose, etc.). The filename regex is the load-bearing match because it does not depend on what path prefix precedes the filename. Expected hits: the four surviving doc surfaces under "Files To Touch — Modify (link rewrites in surviving doc surfaces)," this plan, and the 14 moved files themselves (intra-M2 cross-references). The earlier draft of this plan used `grep -rn "docs/plans/m2-"` and `\]\((\./|\.\./)?m2-[^)]+\)` patterns that silently missed the open-questions.md `./plans/m2-admin-restructuring.md` link (the markdown pattern's optional-group anchored `m2-` immediately after `./` or `../`, with nothing in between, so `./plans/m2-…` did not match). The filename-anchored regex above does not have that blind spot.
   - `grep -rEn '\]\([^)]*m2-(admin-restructuring|phase-2-)[^)]*\)' --include="*.md" .` — every markdown link whose href contains an M2 filename, no matter the prefix. Use this for the link-form view of the same set.
   - `grep -hE '\]\(\./[^)]+\)' docs/plans/m2-admin-restructuring.md docs/plans/m2-phase-2-*.md | grep -oE '\]\(\./[^)]+\)' | sort -u | grep -v 'm2-'` — closed-enumeration check that the only `./X.md` refs to non-M2 siblings inside moved files match the six expected targets (epic, M0 site-scaffold, four M1 foundations). Any unexpected target escalates before editing.
4. **`git mv` the 14 files.** One `git mv` per file (or one bulk
   command) into `docs/plans/archive/m2/`. Confirm `git status`
   shows 14 renames and zero adds/deletes. Run `git log --follow
   docs/plans/archive/m2/m2-phase-2-1-plan.md | head` as a spot
   check that history follows.
5. **Up-tree path rewrites inside moved files.** For each of the 14
   moved files, replace every literal `](../` with `](../../../`
   (adding two `..` segments — the `+2 levels` rule from the
   Cross-Cutting Invariant). The mechanical replacement is
   unambiguous: the leading `](../ ` of every relative link gets the
   two-level prefix bump regardless of how many `..` segments
   followed in the original. Spot-check at least one rewritten link
   per file against disk (`ls` of the resolved absolute path) — a
   `+1` instead of `+2` mistake resolves to
   `docs/plans/archive/...`, not the intended target, and the grep
   alone won't catch it because the rewritten paths are
   syntactically valid.
6. **Same-directory non-M2 `./` rewrites inside moved files.** Replace
   `](./event-platform-epic.md` → `](../../event-platform-epic.md`,
   `](./site-scaffold-and-routing.md` →
   `](../../site-scaffold-and-routing.md`, and the four
   `](./shared-*-foundation.md` patterns. After the rewrite, re-run
   the closed-enumeration grep from step 3; the only `]( ./X.md)`
   link targets should be M2 siblings.
7. **Surviving doc surface rewrites.** Edit
   [`AGENTS.md`](../../AGENTS.md) line 256,
   [`docs/open-questions.md`](../open-questions.md) line 36, and
   [`docs/plans/event-platform-epic.md`](./event-platform-epic.md)
   lines 19, 546, and 583 per Contracts. Re-run the filename-anchored
   grep from step 3; every surviving link href containing an M2
   filename should either resolve under `docs/plans/archive/m2/`
   (the rewritten target) or live inside a moved file as an intra-M2
   cross-reference (which still resolves because the moved files now
   sit alongside each other in `archive/m2/`). The earlier-draft
   blind spot — `./plans/m2-admin-restructuring.md` in
   open-questions.md — is the canonical example of a link the
   filename-anchored regex catches but the prefix-anchored regex
   missed.
8. **Backlog entry removal + plan Status flip.** Delete the
   "Archive M2 plan docs" entry from
   [`docs/backlog.md`](../backlog.md) (lines 194–211). Flip this
   plan's Status from `Proposed` to `Landed` while the file is still
   at `docs/plans/archive-m2-plan-docs-plan.md`. The flip happens
   pre-self-archive so reviewers see the Status transition as a
   diff hunk on the file at its drafting location, not as a write
   into the archive directory.
9. **Self-archive this plan.** `git mv
   docs/plans/archive-m2-plan-docs-plan.md docs/plans/archive/m2/`
   and apply the per-link rewrites enumerated under "Files To Touch
   — Modify + move (this plan, self-archive)." Confirm
   `git status --short` adds one `R` rename to the staged set and
   that the rewrites resolve to existing paths
   (`ls ../../event-platform-epic.md` from the archive location,
   etc., or by inspecting the rendered file). Bundle the move with
   the in-file rewrites in one commit per the same rule that
   bundled the M2 move + rewrite — splitting publishes a tip with
   stale links inside this plan.
10. **Validation re-run.** Run `npm run lint` and `npm run build:web`
    again; both must pass. Run a final repo-wide grep audit per
    step 3's filename-anchored patterns; cross-check survivors
    against the expected set (now: archived M2 files + this plan in
    its archived location + intentional history in PR/commit prose).
11. **Code-review feedback loop.** Walk the diff against every
    Cross-Cutting Invariant and every Self-Review Audit named below.
    Apply fixes; commit review-fix changes separately per
    [`AGENTS.md`](../../AGENTS.md) Review-Fix Rigor.
12. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation Gate command, and Self-Review Audit.
    Confirm each is satisfied or deferred with rationale **inside
    this plan** (which now lives at its archive path). Deferrals do
    not live in PR body or follow-up issues.
13. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters (suggested:
    `docs: archive M2 plan docs + self-archive this plan`). Body
    fills every section (per memory: 9-section template). Validation
    section names every command run; Target Shape Evidence enumerates
    the 14 M2 file moves plus the 15th self-archive move plus
    before/after counts: `docs/plans/m2-*` (14 → 0 in active,
    0 → 14 in `docs/plans/archive/m2/`) and this plan (1 → 0 in
    active, 0 → 1 in `docs/plans/archive/m2/`). Remaining Risk:
    link false-negatives if any reference uses an unusual
    relative-path style the grep missed.

## Commit Boundaries

Six commits, kept distinct so review can independently verify each
mechanical step. Pre-merge tip after each commit leaves no broken
internal links — moves bundle with their in-file rewrites
specifically to avoid an intermediate tip where moved files have
stale relative paths.

1. **Add this plan doc.** `docs/plans/archive-m2-plan-docs-plan.md`
   added with Status `Proposed`. (Already present from the planning
   session; the implementing PR may include this commit or treat the
   plan as merged-on-main from a prior PR — see the note below.)
2. **`git mv` 14 M2 files + in-file relative-path rewrites.** The
   atomic move-and-rewrite commit for the M2 set. Bundles the 14
   file moves with the bulk relative-path rewrites inside each moved
   file. Splitting into "move first, rewrite second" would publish
   an intermediate tip where the 14 files at their new path have
   broken `../` links; bundling avoids that.
3. **Surviving doc surface link rewrites.** `AGENTS.md`,
   `docs/open-questions.md`, `docs/plans/event-platform-epic.md`.
   Reviewer can independently verify each surface against the
   archive paths.
4. **Backlog entry removal + this plan's Status flip.** Removes the
   completed backlog entry and flips this plan's Status to `Landed`
   while the file is still at `docs/plans/archive-m2-plan-docs-plan.md`.
   Single commit since both surfaces close together. Does *not*
   self-archive yet — that's the next commit, kept distinct so the
   Status transition shows as an in-place diff and the move shows as
   a separate `R` rename.
5. **Self-archive this plan.** `git mv` to
   `docs/plans/archive/m2/` plus the per-link rewrites enumerated
   under "Files To Touch — Modify + move (this plan, self-archive)."
   Single commit; same atomic move-and-rewrite rule as commit 2.
6. **Review-fix commits.** As needed, kept distinct per
   [`AGENTS.md`](../../AGENTS.md) Review-Fix Rigor.

**Note on commit 1.** If this plan was added to `main` in a prior
plan-drafting PR (matching the recent precedent of `7779949 docs(m2-2.5):
draft 2.5.3 plan + link from umbrella row`), the implementing PR's
branch base already has the plan and commit 1 is a no-op. If this
plan is being added on the same branch as the implementation, commit
1 is the first commit on the branch.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final
  (unchanged — no apps/web source is edited; this is doc-only).
- **Repo-wide grep audit per Execution step 3 / 9.** Pre-merge
  load-bearing for the link-consistency invariant. Use the
  filename-anchored regex
  (`grep -rEn 'm2-(admin-restructuring|phase-2-)' …`) — *not* a
  prefix-anchored pattern that requires `docs/plans/m2-…` or
  anchors `m2-` directly after `./`/`../`. The prefix-anchored
  alternatives silently miss styles like
  `./plans/m2-admin-restructuring.md` (open-questions.md) or any
  future link that wraps the M2 filename in a different path
  prefix. After the rewrite, every surviving hit must either point
  under `docs/plans/archive/m2/` (the rewritten target) or sit
  inside a moved file as an intra-M2 cross-reference. Any other
  surviving hit — text reference, link href, or otherwise — is a
  real miss.
- **`git log --follow` spot-check.** Run on at least one moved file
  after the move commit lands. History must extend back through the
  pre-move commits (e.g., the 2.5.3 commits, the 2.5 umbrella
  drafting, the original phase plan creation).
- **Markdown link spot-check.** Render at least three moved files in
  a markdown viewer (or use a markdown link-checker tool if
  available locally) and click through one `../` link, one `./`
  M2-sibling link, and one `../../` rewritten link per file. Any
  404 escalates.

**Falsifier discipline.** The grep audit's discriminating falsifier:
the expected-hits set after the rewrite is enumerable (moved files
under archive path + four surviving doc surfaces + intentional
history in PR/commit prose). A hit in any other category — for
example, an unmoved `docs/plans/m2-*` text reference inside a
durable doc — is a real miss. The grep result alone is not the
proof; the cross-check against the expected-hits enumeration is.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md).

### Runbook

- **Link-consistency audit.** Walk every pre-edit grep hit from
  step 3 against the post-edit grep from step 10. Confirm every
  rewritten link resolves to an existing path on disk — not just
  syntactically, but by `ls`-ing at least one resolved relative
  path per moved file. This is the protective check for the
  path-depth off-by-one risk: a `+1 levels` mistake produces
  syntactically-valid links that all resolve to
  `docs/plans/archive/<wrong>` instead of the intended target, and
  the grep alone cannot distinguish the right resolution from the
  wrong one. Confirm zero references to the pre-archive M2 paths
  remain in durable surfaces (epic, AGENTS.md, open-questions,
  backlog, tracking docs).
- **Closed-enumeration audit.** The Cross-Cutting Invariants name
  six non-M2 `./` link targets inside the M2 set's moved files
  (epic, M0 site-scaffold, four M1 foundations). The "Files To
  Touch — Modify + move (this plan, self-archive)" subsection adds
  three more targets specific to this plan (`repo-rename.md`,
  `framework-decision.md`, `archive/quiz-authoring-plan.md`). The
  audit walks each named target against the post-edit grep and
  confirms (a) every reference rewrote per its column in the
  enumeration, and (b) no new non-listed `./` target surfaces in
  the diff. A new target in the diff means the enumeration was
  incomplete and the rewrite missed something.
- **`git mv` audit.** Confirm `git status --short` shows exactly
  15 `R` (rename) entries (14 M2 files + this plan's
  self-archive) across the relevant commits and zero `D` + `A`
  pairings. The latter would indicate a delete-and-recreate that
  breaks `git log --follow` and `git blame` lineage. Spot-check
  `git log --follow docs/plans/archive/m2/m2-phase-2-1-plan.md`
  and `git log --follow docs/plans/archive/m2/archive-m2-plan-docs-plan.md`
  after the relevant commits land; both must show pre-move
  history.

### CI

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../self-review-catalog.md#L354)).
  This PR's diff is mostly file moves with mechanical text edits.
  The classifier should mark the branch as docs-only — no code,
  no test, no config, no production behavior change. Any
  mis-classification suggests a non-doc file accidentally entered
  the diff (e.g., a `vercel.json` rewrite touched along the way).

## Documentation Currency PR Gate

- **[`docs/plans/event-platform-epic.md`](./event-platform-epic.md)** —
  M2 row plan-link rewrites; prose-narrative milestone-doc references
  rewrite. Per Contracts.
- **[`docs/open-questions.md`](../open-questions.md)** — resolution
  reference rewrites. Per Contracts.
- **[`docs/backlog.md`](../backlog.md)** — "Archive M2 plan docs"
  entry removes. Per Contracts.
- **[`AGENTS.md`](../../AGENTS.md)** — Mermaid-example reference
  rewrites. Per Contracts.
- **This plan** — Status flips from `Proposed` to `Landed` per the
  regular Plan-to-PR Completion Gate.
- **[`README.md`](../../README.md),
  [`docs/architecture.md`](../architecture.md),
  [`docs/dev.md`](../dev.md),
  [`docs/product.md`](../product.md),
  [`docs/operations.md`](../operations.md)** — no edit required.
  Pre-edit grep confirms zero references to the M2 plan-doc set in
  these surfaces (M2's doc-currency tail in 2.5.3 already swept these
  for terminology, not plan-doc paths).
- **`docs/tracking/*` and `docs/plans/archive/*`** — no edit
  required. Pre-edit grep confirms zero references.

## Out Of Scope

- **Archiving M0 / M1 plans.** Per backlog entry and Goal-section
  explanation. Each milestone archives in its own follow-up PR.
- **Renaming or restructuring archived M2 file contents.** This PR
  preserves the moved files as-is; future cleanup of stale
  cross-references inside archived plans (e.g., the two pre-existing
  broken `./plans/event-platform-epic.md` typos in
  `m2-phase-2-5-3-plan.md` lines 320 and 331) is a separate
  housekeeping task.
- **Top-level epic Status flip.** Owned by M4's terminal PR per
  [`event-platform-epic.md:23-24`](./event-platform-epic.md#L23).
- **Trust-boundary changes.** No SQL, no RLS, no Edge Function,
  no `shared/auth/` edit.
- **Production-smoke fixture changes.** Doc-only PR.
- **Backlog reorganization beyond removing the "Archive M2 plan
  docs" entry.** Adjacent backlog entries are not touched.

## Risk Register

- **Link false-negatives from unusual relative-path styles.** A
  reference using a path style the prefix-anchored grep blind-spots
  (e.g., `./plans/m2-…`, `../plans/m2-…`, `docs/plans/m2-…` inside
  prose, or a bare-name reference inside a code fence) was the
  original draft's exact failure mode — the
  open-questions.md `./plans/m2-admin-restructuring.md` link did not
  match `\]\((\./|\.\./)?m2-[^)]+\)` because the regex required
  `m2-` immediately after the optional `./`/`../`, with no
  intervening segment. Mitigation: step 3's filename-anchored grep
  (`m2-(admin-restructuring|phase-2-)`) does not depend on path
  prefix and catches every reference to an M2 filename regardless
  of what precedes it. The post-edit grep at step 10 is the final
  pre-merge sanity check. If a survivor surfaces post-merge in CI
  or rendered docs, fix forward in a one-line follow-up PR — single
  broken link is recoverable, not a revert candidate.
- **Path-depth off-by-one in the bulk rewrite.** The most subtle
  failure mode: the rewrite uses `+1 levels` (`](../../`) instead
  of `+2 levels` (`](../../../`). Every rewritten path resolves
  syntactically (no broken markdown), so no parser flags it; but
  every link points at `docs/plans/archive/<wrong>` instead of
  `docs/<right>` or `<repo-root>/<right>`. The grep audit cannot
  catch this because it audits which references survive, not where
  the rewritten ones resolve. Mitigation: Execution step 5's
  spot-check requires resolving at least one rewritten link per
  moved file against disk (`ls` of the resolved absolute path).
  The Self-Review link-consistency audit walks the same check.
- **`git mv` lineage break if implementer uses `mv` + `git add`.**
  The shell `mv` command followed by `git add` produces a delete +
  create pair; `git log --follow` and `git blame` lose lineage.
  Mitigation: Execution step 4 names `git mv` explicitly; Self-Review
  audit confirms `git status --short` shows `R` entries.
- **Intermediate tip with broken links.** If commit 2 splits into
  "move first, rewrite second," the intermediate tip publishes the
  14 moved files with stale `../X` links. Mitigation: Commit
  Boundaries names the bundled move-and-rewrite as commit 2; the
  implementer keeps the file moves and the in-file rewrites staged
  together.
- **`archive/m2/` subfolder vs flat `archive/`.** The backlog entry
  says "or equivalent." This plan picks the nested
  `docs/plans/archive/m2/` subfolder over the flat
  `docs/plans/archive/` (matching existing archived plans like
  [`quiz-authoring-plan.md`](./archive/quiz-authoring-plan.md))
  because the M2 set is large enough (14 files) that flattening
  would dominate the archive directory's listing and obscure
  unrelated archived plans, and because nesting reserves a slot for
  M0 / M1 / M3 / M4 archive moves to follow the same shape. The
  nested choice is what drives the `+2 levels` rewrite rule —
  switching to flat would change every rewrite to `+1 level`. If a
  reviewer prefers flat, the change is mechanical but not trivial
  (~1k path rewrites), so the choice is settled in this plan rather
  than left open at PR-review time.
- **Pre-existing broken links inside moved files inherited
  unchanged.** `m2-phase-2-5-3-plan.md` lines 320 and 331 contain
  pre-existing typo links (`./plans/event-platform-epic.md`) that
  were already broken at their original location. After the move,
  these stay broken (the typo would resolve to
  `docs/plans/archive/m2/plans/event-platform-epic.md` which doesn't
  exist either). Mitigation: out-of-scope per Goal — fixing
  pre-existing typos expands scope. Self-Review audit names them
  explicitly so the implementer doesn't accidentally "fix" them
  during the rewrite pass and create a confusing mixed diff.

## Related Docs

- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone doc; moves to archive in this PR. Source of M2's closed
  Status.
- [`m2-phase-2-5-3-plan.md`](./m2-phase-2-5-3-plan.md) — M2's
  terminal sub-phase; "Backlog Impact" subsection adds the backlog
  entry this PR completes.
- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M2 row plan-link rewrites in this PR.
- [`docs/backlog.md`](../backlog.md) — backlog entry removes in
  this PR.
- [`docs/open-questions.md`](../open-questions.md) — resolution
  reference rewrites in this PR.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules; Doc Currency
  Is a PR Gate, Plan-to-PR Completion Gate. The Mermaid-graph
  example reference at line 256 rewrites in this PR.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`repo-rename.md`](./repo-rename.md) — precedent for doc-only
  textual-rewrite PRs that explicitly leave frozen URL references
  alone.
