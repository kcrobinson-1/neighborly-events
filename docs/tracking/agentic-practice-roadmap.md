# Agentic Practice Roadmap

## Purpose

Track long-running improvements to *how the contributor and agents work in
this repo*, distinct from product features and code refactors. The thesis
is in the [Diagnosis](#diagnosis-2026-05-07) below: the repo's
agentic-process scaffolding is mature in shape but compounding faster
than the product, and the failure mode is rules-and-plans growth
outpacing shipped code.

This file is intentionally lighter than the docs under
[`docs/plans/`](/docs/plans/). It carries no Plan-to-PR Completion Gate,
no Status lifecycle, no scoping doc, no per-bet phase plan. Treat it as
a roadmap a single reader walks every couple of months — not as a
contract reviewers gate against.

Sibling tracking docs cover narrower surfaces:

- [`dev-workflow-improvements.md`](./dev-workflow-improvements.md) — concrete
  contributor-tooling tasks (screenshot upload, CI helpers).
- [`code-refactor-checklist.md`](./code-refactor-checklist.md) — small
  behavior-preserving refactors.
- [`admin-ux-roadmap.md`](./admin-ux-roadmap.md) — product-facing admin
  polish.

This doc lives alongside them because it tracks improvements the same
way; it differs in that the *subject* is process, not product. When a
bet below produces a concrete bounded task (e.g. "delete N memory
entries" or "consolidate planning/shared.md to ≤ 300 lines"), prefer
landing it as an ordinary docs PR rather than promoting it into a
plan-tree.

## Diagnosis (2026-05-07)

External review of the repo at this date by an agent reviewing only the
public artifacts (commits, PRs, plan docs, agent infrastructure, memory
index). Captured here verbatim-ish so subsequent reviews can compare
against the original observation rather than re-deriving it. Diagnosis
sections are append-only — if a future review disagrees, append a new
`## Diagnosis (YYYY-MM-DD)` section rather than editing this one.

### Snapshot

- Repo age: 5 weeks (2026-04-03 → 2026-05-07).
- Commits: 1029 on `main`. PRs merged: 212. Single human contributor
  (`kcrobinson-1`) plus automated reviewer (`chatgpt-codex-connector`,
  reviewed ~75% of PRs).
- PR mix: 84 docs / 39 feat / 14 fix / others. Median PR open time:
  ~14 minutes. 171/209 merged within an hour.
- LOC ratio at this date:
  - Product code (`apps/`, `shared/`, `supabase/` source): ~33,880 LOC
  - Tests (`tests/`, `supabase/tests/`): ~24,584 LOC
  - Plan docs (`docs/plans/**.md`): ~63,948 LOC
- Process docs: [`AGENTS.md`](/AGENTS.md) 231 lines;
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  503 lines; [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
  365 lines. Memory index: 29 entries.
- Latest evidence point: M1 phase 1.3 of the Madrona feedback child
  epic landed a 539-line scoping doc + 815-line plan doc + 287-line
  migration + a section component, for one form route + one DB column
  set. Plan-tree LOC for one phase exceeded the code+SQL it produced.

### What is being done well

- **Router pattern.** [`AGENTS.md`](/AGENTS.md) is short and routes to
  topic-organized constraint sets in [`docs/agents/`](/docs/agents/).
  The session-type table tells an agent which files to load before
  editing. This is the right shape.
- **Plan-to-PR Completion Gate.** Status lifecycle with exact-match
  tokens, banned-soft-commitment-words rule, Estimate Deviations
  callout. Mature.
- **Self-review catalog with contribution gate.**
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  requires two distinct PR occurrences before adding an audit, and a
  removal rule for audits superseded by automation. Right shape for
  institutional learning.
- **Incident-driven memory.** Memory entries are dated, structured
  with **Why:** / **How to apply:**, cite concrete PR incidents. The
  retrieve-before-citing rule (memory `feedback_retrieve_before_citing.md`)
  came from a real PR-#193 failure and meaningfully changed practice.
- **PR hygiene.** Conventional commits throughout; 10-section PR body
  template; reviewer-comment replies cite the fix SHA on the comment
  thread. Worktree workflow real and adopted.
- **Scope-aware CI.** [`.github/workflows/ci.yml`](/.github/workflows/ci.yml)
  detects docs-only PRs and skips heavy validation. Author noticed
  the 40% docs-PR mix and adapted the gate.
- **Tier-based testing pyramid.** Tier 5 production smoke gate
  produces a durable run-URL claim, so plans can land "pending prod
  smoke" without losing the post-merge step.

### What is going less well

- **Process-to-product ratio is upside-down.** Plan docs (~64k LOC) >
  product code (~34k LOC). Phase 1.2 of the Madrona feedback epic
  used 449 + 653 lines of scoping + plan to add one optional
  TypeScript field and one section component. Phase 1.3 used 539 +
  815 lines for one form route + DB. The plan layer is eating the
  implementation.
- **Single-author + bot review loop has no human pushback.** Codex is
  a competent line-level reviewer but cannot say "this is too much
  process." With no external voice, every Codex finding becomes a new
  rule, every rule grows a carve-out
  ([`shared.md`](/docs/agents/planning/shared.md) "Plan code
  minimalism" now contains the data-structure carve-out and the
  author-side falsifier check), and the rulebook compounds. Across
  the last month, no PR has *deleted* a rule from
  [`docs/agents/`](/docs/agents/).
- **Rule-density compounding.** [`shared.md`](/docs/agents/planning/shared.md)
  503 lines, [`phase.md`](/docs/agents/planning/phase.md) 365 lines,
  with cross-refs that read like legal citations. New rules surface
  to patch single Codex findings rather than because they
  generalize.
- **Plans citing plans.** The author already wrote a memory rule
  about "planning artifacts that only cite each other are
  unverified," and the plans are still full of "per the milestone
  doc's collapse-rejection paragraph" prose. Self-aware of the trap,
  still in it.
- **PR ceremony for an audience of one.** Median 14-minute open time;
  >80% merged within an hour by the author. The Plan-to-PR
  Completion Gate is theater for a single reader. Self-merge with a
  bot is a fine equilibrium for velocity; the failure mode is
  pretending it is multi-stakeholder review.
- **Scope graph mutating faster than it resolves.** In one month: M4
  was deferred → moved to a sibling epic stub → superseded by
  `madrona-demo-build` → demo-expansion epic intervened →
  `madrona-feedback` appeared as a child epic of `madrona-demo-build`.
  Planning docs respond by re-citing each other rather than
  collapsing.
- **"Fix it with a memory" overuse.** PR #178 (column-name
  fabrication) produced a *process* memory rule. The faster fix
  would have been generated-types-as-import in the assertion helper.
  Watch for cases where a rule is the answer to what should be a
  one-line code change.

### Verdict

Individual practices: ~80th percentile.
Process-to-product proportion: ~30th percentile.
The gap to close is not "more rules" but "ship the smallest thing that
proves it" + aggressive consolidation of the rules already written.

### Sources for this snapshot

- `git log` and `gh pr list` against `origin/main` at 2026-05-07.
- `wc -l` against [`docs/plans/`](/docs/plans/),
  [`apps/`](/apps/), [`shared/`](/shared/), [`supabase/`](/supabase/),
  [`tests/`](/tests/).
- Read of [`AGENTS.md`](/AGENTS.md), the
  [`docs/agents/`](/docs/agents/) router tree, sample epic /
  milestone / phase / scoping docs in
  [`docs/plans/epics/madrona-feedback/`](/docs/plans/epics/madrona-feedback/),
  the PR template, the self-review catalog, sample Codex review
  threads, and the memory index.

## Bets

Each bet names a measurable change, the diagnosis finding it ties to,
and the target metric. Bets are not contracts — if a bet stops moving
or measures the wrong thing, log it as a failed bet and either revise
or drop. Targets are reasoned guesses; missing them is information,
not failure.

### Bet 1: plan-doc LOC growth ≤ code+test LOC growth, per epic

**Ties to:** "Process-to-product ratio is upside-down."
**Measure:** at each epic close-out, sum lines added under
`docs/plans/epics/<epic>/` and compare to lines added under
`apps/`, `shared/`, `supabase/` (excluding generated types) and `tests/`
across the epic's lifetime.
**Target:** plan LOC ≤ code+test LOC across the epic.
**Today:** Madrona feedback M1 phases 1.1 + 1.2 + 1.3 added ≥3000
plan LOC against substantially less code+test. Likely fails for the
current epic; the bet is "next epic does better."
**If failing:** start with the cap on phase plan-doc length (see
Bet 4) and the rule-budget gate (Bet 3); revisit if neither moves
the ratio.

### Bet 2: rule-deletion vs rule-addition ratio in `docs/agents/`

**Ties to:** "Rule-density compounding" / no PR has deleted a rule.
**Measure:** per calendar month, count PRs that net-decrease line
count in `docs/agents/**` against PRs that net-increase. Use
`gh pr list --search "path:docs/agents"` plus `git log --stat`.
**Target:** ratio ≥ 0.3 (i.e. at least one rule-deletion PR for every
~3 rule-addition PRs) within two months.
**Today:** ratio ≈ 0 in the last 30 days.
**If failing:** schedule an explicit consolidation pass on
`shared.md` and `phase.md` with the goal of merging redundant rules
and removing carve-outs whose original triggers no longer apply.

### Bet 3: rule-budget gate on new rules added to `docs/agents/`

**Ties to:** "every Codex finding becomes a new rule."
**Measure:** every PR that adds a new rule to `docs/agents/**` should
either (a) name a rule it deletes or merges into the new one, or (b)
explicitly call out in the PR body why no rule could be retired. This
is a self-imposed convention, not an automated gate.
**Target:** by the next quarterly review, ≥ 50% of rule-adding PRs
carry a deletion or merge.
**Today:** ~0%.
**If failing:** the rule wasn't strong enough — move toward an
explicit cap (e.g. `shared.md` ≤ 350 lines, `phase.md` ≤ 250 lines)
and force consolidation when caps are hit.

### Bet 4: phase-plan-doc length cap

**Ties to:** "the plan layer is eating the implementation."
**Measure:** for phase plan docs in `docs/plans/epics/*/m*-phase-*-plan.md`,
LOC at merge time. Soft cap, not enforced by CI.
**Target:** ≤ 400 lines for any phase plan doc; ≤ 250 lines for the
matching scoping doc when one exists.
**Today:** recent phase plans have run 563–815 lines, scoping docs
449–539.
**If failing:** the cap is the bet — re-test by drafting the next
phase against the cap and seeing what survives. The likely outcome is
that decision prose compresses fine and only contract enumerations
need the longer form.

### Bet 5: external human reviewer touchpoint per milestone

**Ties to:** "Single-author + bot review loop has no human pushback."
**Measure:** at each milestone close-out, was there ≥ 1 PR review
comment from a human reviewer who is not the author?
**Target:** ≥ 1 per milestone within the next two milestones; ideally
a recurring informal reviewer.
**Today:** 0.
**If failing:** the loop is structural — no amount of in-repo rule
tightening fixes the absence of an outside voice. The fallback is a
deliberate pre-merge "self-review as a hostile outsider" pass, but
the right move is finding a human.

### Bet 6: memory index size, net of consolidation passes

**Ties to:** "Memory index growing only via additions."
**Measure:** count of entries in `MEMORY.md` (not the underlying
files — the index, which is what loads into context) at the start vs
end of each month.
**Target:** after the next consolidation pass, month-over-month
growth ≤ 0 sustained for two consecutive months. Passes happen
through the `consolidate-memory` skill.
**Today:** 29 entries, growing.
**If failing:** consolidation isn't merging; check whether new
entries are genuinely new patterns or restatements of existing ones,
and either tighten the existing entry or accept that the failure
mode is "memory writes are the cheap action."

## Log

Append-only. Each entry: date + 1–3 bullets on what moved, what
didn't, and any change to the diagnosis or bets. Do not edit
prior entries.

- *No log entries yet. Next review trigger options below.*

### Re-review triggers

Run a re-review at any of the following — not on a calendar:

- end of an epic (Madrona feedback M1, M2, demo-expansion, etc.)
- after Madrona '26 has run a real attendee event
- when the memory index passes 35 entries
- when any single planning doc passes 1000 lines
- when one of the bets has clearly settled (target hit, or two
  months of no movement on a metric)
- on explicit request from the contributor

A re-review reads the latest snapshot stats fresh, walks each Bet's
target against current measurement, appends a Log entry, and may
append a new `## Diagnosis (YYYY-MM-DD)` section if the underlying
analysis has shifted.
