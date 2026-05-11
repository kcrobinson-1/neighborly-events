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

**Review stance for this doc.** Review for whether the diagnosis is
factually accurate, whether bets are measurable and worth running,
whether action-layer entries describe real candidate moves, and
whether sections are internally coherent. **Do not review for
line-level code correctness.** Any commands, queries, or paths
referenced inside prose are illustrations of procedures, not code
under contract; if a procedure is unclear in prose, flag the
prose, not the syntax. This stance is the experiment for tracking
docs that the [Diagnosis](#diagnosis-2026-05-07) below names as
needing a different review path than feature PRs — the line-level
finding loop on plan- and tracking-doc PRs is a known driver of
process bloat in this repo.

## Terminology

Terms that are load-bearing in this doc, defined once so the
Diagnosis and Bets sections can use them without re-explaining.

**Bet.** A measurable conjecture in the form *"doing X will move
metric M toward target T."* Distinct from a rule (binds behavior),
a goal (expected to succeed), and a plan (contracts an
implementation). Three properties make something a bet rather than
one of those:

- the target is a reasoned guess, not a contract — missing it is
  information about whether the conjecture was right, not a
  failure to comply;
- it carries a counting procedure (the **Measure** field) so it
  is falsifiable;
- it has an **If failing** branch — when the metric stops moving,
  revise or drop the bet rather than tightening enforcement to
  force the metric.

**LOC.** Raw line count from `wc -l` (or equivalent), counting every
line in the file including blanks, frontmatter, comments, and
markdown structure. Not "significant lines of code" or any
formatter-aware measure. The choice is deliberate: this doc tracks
*reading cost* and *review surface*, both of which scale with raw
lines, not with semantic content. Using a sophisticated measure
would let a bet's target be moved by reformatting rather than by
the underlying behavior change the bet is trying to drive.

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
  ~14 minutes. 171/212 merged within an hour.
- LOC ratio at this date:
  - Product code (`apps/`, `shared/`, `supabase/` source): ~33,880 LOC
  - Tests (`tests/`, `supabase/tests/`): ~24,584 LOC
  - Plan docs (`docs/plans/**.md`): ~63,948 LOC
- Process docs: [`AGENTS.md`](/AGENTS.md) 231 lines;
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  503 lines; [`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md)
  365 lines. Memory index: 29 entries.
- Latest evidence point: M1 phase 1.2 of the Madrona feedback child
  epic landed a 449-line scoping doc + 657-line plan doc to ship
  roughly 239 lines of implementation (a 49-line section component,
  33 lines added to the `EventContent` type, 44 lines of SCSS, 109
  lines of tests, and 4 lines of composition wiring). Plan-tree LOC
  exceeded the code it produced by roughly 4.6×.

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
  retrieve-before-citing rule came from a real recall-citation
  failure (three load-bearing line-number citations on the same
  artifact, all wrong from recall rather than retrieval) and
  meaningfully changed practice.
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
- **"Fix it with a memory" overuse.** A recent column-name
  fabrication (a service-role assertion helper referenced a
  non-existent column; escaped local validation and only failed at
  Tier 5 production smoke) produced a *process* memory rule. The
  faster fix would have been generated-types-as-import in the
  assertion helper. Watch for cases where a rule is the answer to
  what should be a one-line code change.

### Verdict

Individual practices: ~80th percentile.
Process-to-product proportion: ~30th percentile.
The gap to close is not "more rules" but "ship the smallest thing that
proves it" + aggressive consolidation of the rules already written.

### Sources for this snapshot

- Git history and PR list against `origin/main` at 2026-05-07.
- LOC totals across files under the named paths, using standard
  recursive line-counting tools:
  - Plan docs: all markdown under [`docs/plans/`](/docs/plans/).
  - Product code: TypeScript / TSX / SCSS / SQL under
    [`apps/`](/apps/), [`shared/`](/shared/), and
    [`supabase/`](/supabase/), excluding generated types.
  - Tests: all source under [`tests/`](/tests/) and
    `supabase/tests/`.
- Read of [`AGENTS.md`](/AGENTS.md), the
  [`docs/agents/`](/docs/agents/) router tree, sample epic /
  milestone / phase / scoping docs in
  [`docs/plans/epics/madrona-feedback/`](/docs/plans/epics/madrona-feedback/),
  the PR template, the self-review catalog, sample Codex review
  threads, and the contributor's local agent memory index.

## Bets

See [Terminology](#terminology) for the definition of *bet*. Each
entry below leads with the one-sentence "doing X will move M toward
T" form, then expands into the metric, the target, the current
value, and the fallback if the bet doesn't hold.

### Bet 1: Plan LOC stays under code LOC

**Bet:** Tighter phase-plan discipline (Bets 3 + 4) will move per-epic
plan-doc LOC at or below code+test LOC.
**Ties to:** "Process-to-product ratio is upside-down."
**Measure:** at each epic close-out, sum lines added under
`docs/plans/epics/<epic>/` and compare to lines added under
`apps/`, `shared/`, `supabase/` (excluding generated types) and `tests/`
across the epic's lifetime.
**Target:** plan LOC ≤ code+test LOC across the epic.
**Today:** Madrona feedback M1 phases 1.1 + 1.2 + 1.3 added ≥3000
plan LOC against substantially less code+test. Likely fails for the
current epic; the bet is "next epic does better."
**If failing:** start with the phase-plan length cap (Bet 4) and the
rule-budget gate (Bet 3); revisit if neither moves the ratio.

### Bet 2: Rules get deleted, not just added

**Bet:** Running explicit consolidation passes on `shared.md` and
`phase.md` will move the monthly rule-deletion / rule-addition PR
ratio in `docs/agents/` to ≥ 0.3.
**Ties to:** "Rule-density compounding" / no PR has deleted a rule.
**Measure:** per calendar month, enumerate merge commits that touch
`docs/agents/**` and classify each by net line-count delta (positive
or negative). Net line direction is a **proxy** for rule
addition/deletion, not a literal count: a wording-cleanup PR with
no rule changes counts as deletion-shaped, and a PR that adds a
rule while consolidating prose elsewhere may net negative. The
proxy is directionally accurate because the cascade this bet
measures produces both rules *and* the prose justifying them;
either reduction is the discipline the bet wants, and a
rule-add-with-consolidation PR netting negative reflects exactly
the pattern Bet 3 is trying to encourage. If the proxy starts
producing systematically misleading signal — e.g., a string of
net-negative PRs that don't actually retire any rule — revise the
Measure or rename the Bet to reflect what's actually being
tracked. Standard git tooling against the `docs/agents/` path
suffices for the enumeration.
**Target:** ratio ≥ 0.3 (≥ 1 deletion PR per ~3 addition PRs) within
two months.
**Today:** ratio ≈ 0 in the last 30 days.
**If failing:** consolidation isn't generating real merges; switch to
hard line caps on `shared.md` / `phase.md` and force consolidation
when caps are hit.

### Bet 3: New rules name a rule they retire

**Bet:** Requiring rule-adding PRs to cite a deletion or merge in
their PR body will move ≥ 50% of such PRs to carry one.
**Ties to:** "every Codex finding becomes a new rule."
**Measure:** every PR that adds a new rule to `docs/agents/**`
either (a) names a rule it deletes or merges into the new one, or
(b) explicitly explains why no rule could be retired. Self-imposed
convention, not an automated gate.
**Target:** ≥ 50% of rule-adding PRs carry a deletion or merge by the
next quarterly review.
**Today:** ~0%.
**If failing:** the convention wasn't strong enough — move toward an
explicit cap (e.g. `shared.md` ≤ 350 lines, `phase.md` ≤ 250 lines)
and treat additions over the cap as blocking.

### Bet 4: Phase plans fit in 400 lines

**Bet:** Drafting phase plan docs against a soft length cap will move
plan-doc LOC ≤ 400 (and matching scoping doc ≤ 250) without losing
contract decision-completeness.
**Ties to:** "the plan layer is eating the implementation."
**Measure:** for phase plan docs in
`docs/plans/epics/*/m*-phase-*-plan.md`, LOC at merge time. Soft cap,
not enforced by CI.
**Target:** ≤ 400 lines for any phase plan doc; ≤ 250 lines for the
matching scoping doc when one exists.
**Today:** recent phase plans have run 563–815 lines; scoping docs
449–539.
**If failing:** the cap is the bet — re-test on the next phase
draft. The likely outcome is that decision prose compresses fine and
only contract enumerations need longer form.

### Bet 5: A human reviews every milestone

**Bet:** Recruiting one informal external reviewer will move
human-review-touchpoints-per-milestone to ≥ 1.
**Ties to:** "Single-author + bot review loop has no human pushback."
**Measure:** at each milestone close-out, was there ≥ 1 PR review
comment from a human reviewer who is not the author?
**Target:** ≥ 1 per milestone within the next two milestones; ideally
a recurring informal reviewer.
**Today:** 0.
**If failing:** the loop is structural — no amount of in-repo rule
tightening substitutes for an outside voice. Fallback is a deliberate
pre-merge "self-review as a hostile outsider" pass; the right move is
finding a human.

### Bet 6: Memory index stops growing

**Bet:** Running periodic `consolidate-memory` passes will move
month-over-month agent-memory-index entry count to ≤ 0 growth for
two consecutive months.
**Ties to:** "Memory index growing only via additions."
**Measure:** count of entries in the agent memory index file (the
index that loads into every Claude session, distinct from the
underlying memory files) at the start vs end of each month. The
index lives in the contributor's local Claude state, not in this
repo, so the metric is checkable by the contributor but not
reproducible from the repo alone — same shape as Bet 5.
**Target:** after the next consolidation pass, month-over-month
growth ≤ 0 sustained for two consecutive months.
**Today:** 30 entries, growing.
**If failing:** consolidation isn't merging; check whether new
entries are genuinely new patterns or restatements of existing ones,
and either tighten the existing entry or accept that the failure
mode is "memory writes are the cheap action."

## Action Layer

Bets above are *measurements*. Without something that actually
changes contributor or agent behavior, no measurement moves. This
section tracks **candidate instruction-surface edits and behavior
changes** that, if landed, would plausibly move one or more bets.

Treat this as a backlog, not a plan. Entries are not ordered, not
committed to, and not a checklist to work through. Pick one when
it fits naturally; some will sit here indefinitely; some will
turn out to be wrong and get marked dropped. The roadmap is
deliberately not specifying sequence — that's how the contributor
preserves discretion at planning moments.

Entry shape:
- **Edit** — what concrete change, in which file
- **Activates** — which bet(s) this would move
- **Status** — `candidate` / `in progress` / `landed (date)` /
  `dropped (date, reason)`
- **Notes** — rationale, blockers, prior art (1–3 lines)

When an entry lands, leave it here with `landed (date)` and a
one-line outcome — the roadmap is the durable record of what was
tried, not just what's pending. Items that turn out to be wrong
stay as `dropped` with the reason; deletion loses the prior-art
signal.

### A1: Insert the rule-retirement convention into AGENTS.md

**Edit:** add one sentence to `AGENTS.md` (or
`docs/agents/planning/shared.md`) requiring that any PR adding a
rule to `docs/agents/**` either name a rule it deletes or merges
into the new one, or explicitly state in the PR body why no rule
could be retired.
**Activates:** Bet 3 (directly), Bet 2 (over time).
**Status:** landed (2026-05-09).
**Notes:** smallest possible diff (one sentence in one file) with
the largest footprint — loads on every planning session. Without
this, Bet 3 is a roadmap-only convention that no agent sees at the
moment of rule-addition. Outcome: landed as a new "Rule additions
in `docs/agents/`" section in `AGENTS.md` (~7 lines). Trigger
scope is `docs/agents/**`, not `AGENTS.md` itself, matching the
original Bet 3 framing; expanding the trigger to cover `AGENTS.md`
would be a separate move.

### A2: Lightweight phase-planning path

**Edit:** add a "skip the scoping doc" carve-out to
`docs/agents/planning/phase.md` for narrow-surface phases (one
route or one TypeScript field or one migration with no behavior
fork). Carve-out shape: planner explicitly invokes the exception
when the criteria hold; default direction stays "scoping first."
(Original framing called for making narrow-surface the default
with explicit opt-in to scoping; revised at landing because
under-scoping silently ships wrong assumptions while over-scoping
just costs author time — see Outcome below.)
**Activates:** Bet 4 (directly), Bet 1 (over time).
**Status:** landed (2026-05-10).
**Notes:** `phase.md` currently assumes every phase needs both
docs. Phase 1.2 specifically — one TypeScript field + one
section component — is the headline case: qualifies for the
lightweight path under any reasonable threshold, but the
contributor wrote a 657-line plan doc plus a 449-line scoping
doc for it anyway. Sibling phases 1.1 and 1.3 do not cleanly
qualify (see Outcome below) — earlier drafts of this entry
carried a "would all have qualified" framing imported uncritically
from the diagnosis prose; the concrete-threshold walk reveals
that hand-wavy applicability claims over-estimate carve-out
reach. **Outcome:** landed as a new "Narrow-surface
phases may skip the scoping doc" bullet in `phase.md` (~58 lines)
with five enumerated criteria (single subsystem, ≤8 files, no new
public-API contract, no new cross-cutting invariant, no novel
mechanism). Final shape was the **carve-out** (planner explicitly
invokes the exception), not a default flip — under-scoping
silently ships wrong assumptions, over-scoping just costs author
time; the asymmetry favored the safer default. The verification-
protocols-are-not-optional clause from the 2026-05-10 cap-fit
findings is embedded inline. Empirical-fit walk against M1
phases 1.1 (does not qualify, RLS / grants invariants), 1.2
(qualifies), 1.3 (borderline) is preserved in-rule as ground
truth.

### A3: Sharpen the lightweight-vs-full threshold in implementation.md

**Edit:** rewrite the "Lightweight vs full structured" section of
`docs/agents/workflows/implementation.md` with a concrete
threshold (file count, surface count, schema-touch yes/no) and put
the lightweight path first.
**Activates:** Bet 1, Bet 4 (over time).
**Status:** landed (2026-05-10).
**Notes:** current threshold reads as fuzzy and tilted toward
full structured. **Outcome:** rewrote the section's gate with
five concrete criteria (≤5 files, single subsystem, no public-API
change, no schema change at all, local test surface). The
Lightweight Path / Full Structured Path numbered steps are
unchanged — only the gate tightens. A3's cutoffs are deliberately
stricter than A2's because A3 governs unplanned implementation
work (commit / validation discipline) while A2 governs scoping
artifact necessity for planned phases — different decisions,
different cutoffs, same threshold family. Landed in the same PR
as A2 to prevent drift on the shared criteria definitions.

### A4: Consolidation pass on shared.md

**Edit:** one PR that net-decreases line count in
`docs/agents/planning/shared.md` by merging redundant rules and
removing carve-outs whose original triggers have stopped firing
(e.g. carve-outs added for a single Codex finding that hasn't
recurred).
**Activates:** Bet 2 (directly — produces the first numerator
entry), Bet 1 (over time, by reducing the rules that justify
long plans).
**Status:** partially landed (2026-05-08).
**Notes:** the 2026-05-08 cascade-fix Log entry below ran a
narrow A4-shaped consolidation on the "Plan code minimalism"
section: stripped the data-structure carve-out, the directional-
pseudocode framing, the author-side falsifier check, and the M1
phase 1.1 anecdote; added the companion "Plan-doc review stance"
section. Net delta on `shared.md`: 503 → 489 lines. This produced
the first deletion-PR numerator for Bet 2. Remaining A4 surface
(broader merge of redundant rules across the rest of `shared.md`
and `phase.md`) still gated as before — worth running after one
or two consecutive months of no carve-out triggers fire on the
remaining rules.

### A5: Narrow the AGENTS.md mandatory pre-edit reads

**Edit:** narrow the trigger surface in
`AGENTS.md` "Mandatory pre-edit reads" so docs-only edits to
`docs/tracking/`, `docs/backlog.md`, and similar lightweight
surfaces don't fire `architecture-guardrails.md`.
**Activates:** indirectly enables faster docs-only sessions, no
direct bet move.
**Status:** candidate.
**Notes:** lower priority than A1–A4 because the failure it
addresses (unnecessary reads on lightweight docs PRs) is friction
on the contributor's time, not on bet metrics. Worth doing if
A2/A3 land first — at that point the lightweight path is real and
this edit makes it actually lightweight.

### A6: Codex-feedback escalation ladder

**Edit:** add a section to
`docs/agents/workflows/review-fixes.md` naming an explicit ladder
for Codex findings — *fix only* → *self-review audit entry* →
*plan-doc rule* → *AGENTS.md rule* — with rising bar at each
step (e.g. ≥ 2 distinct PR occurrences before promoting from
"fix only" to "audit entry"; ≥ 1 occurrence after the audit
entry exists before promoting to a plan-doc rule).
**Activates:** Bet 2, Bet 3, Bet 6 (the same pattern produces
memory bloat too).
**Status:** candidate.
**Notes:** the self-review catalog already requires ≥ 2 PR
occurrences before adding an audit; this edit extends the same
discipline to the layers above (rules) and below (raw fixes).

### A7: First-draft plan against Bet 4 caps

**Edit:** none to instructions — a behavior commitment. Draft the
next phase plan (whatever phase comes after the Madrona feedback
M1 work in flight) against the soft cap of ≤ 400 lines for the
plan and ≤ 250 for the scoping doc, and log what survived,
what got cut, and what (if anything) genuinely needed the longer
form.
**Activates:** Bet 4 (directly), Bet 1 (over time).
**Status:** candidate.
**Notes:** this is the empirical version of A2/A3 — proves the
cap is reachable before the instructions are edited to require
it. Outcome lands as a Log entry below. Scoped to phase plans;
the cross-cutting sibling is A7a.

### A7a: First-pass cross-cutting plan / scoping doc against an artifact-appropriate cap

**Edit:** none to instructions — a behavior commitment. Sibling
to A7, scoped to cross-cutting docs (filed at
`docs/plans/<name>.md`, not under an epic). The next cross-cutting
plan or scoping doc drafted is drafted against an artifact-
appropriate cap, and the Log entry records what survived, what
got cut, and per-section LOC.
**Activates:** Bet 1 (over time); informs A2 / A3 threshold
design for the cross-cutting doc class.
**Status:** candidate.
**Notes:** the 2026-05-10 retroactive exercise on
[`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
(650 lines) and the newsletter-subscription-split scoping doc
(948 lines, since deleted per the transient-scoping-doc convention)
found Bet 4's flat caps wildly wrong for this class
— a 250-line cap on a 7-decision scoping doc forces removing all
rejected-alternative reasoning, all Reality-check inputs, and all
pivot history. The hypothesis A7a tests: the right cap shape for
cross-cutting is **per-section, not per-doc** (e.g., "each
decision in a scoping doc ≤ 80 lines," "each Investigation in a
plan ≤ 12 lines"). Verification protocols (Reality-check inputs)
should be carved out as not-bloat. See the 2026-05-10 Log entry
for the full exercise.

### A8: Codify a tracking/planning-doc drafting template

**Edit:** capture a paste-able three-phase drafting template (Phase
1 *gather* — list inputs and read fresh, mark anything that would
require invention as an open question; Phase 2 *draft* — tight
prose, no code-block bloat, open questions are first-class; Phase
3 *audit* — walk unsupported claims, internal contradictions, soft
commitments, drift from conversation, and citations) somewhere
durable. Candidate locations: a dedicated doc under
`docs/agents/workflows/`, a Claude skill the contributor can
invoke, or inline in `docs/agents/planning/shared.md` if it
generalizes to plan docs as well.
**Activates:** no direct bet move; quality lever for any future
tracking or plan doc.
**Status:** candidate.
**Notes:** template emerged from a session in early May 2026 and
was used implicitly during the audit pass on this roadmap (which
caught one significant factual error and several smaller drift
issues before this PR went out). Without a durable home it gets
re-derived each session. Six known gaps to address before
codifying:

1. Scope is tracking-doc-only by framing (the prior-art template
   below opens with "Draft `docs/tracking/<filename>.md`..."). The
   underlying principles generalize to plan docs and scoping docs;
   either rewrite the template to be doc-type-agnostic or fork
   into tracking and plan-doc variants.
2. The audit lacks a scope-creep / unauthorized-addition check —
   it catches what's there but not what shouldn't be (e.g. five
   sections agreed on, seven written).
3. Source classification in the audit should require *surfacing*
   the source (a quoted span or a `path:line` reference), not just
   classifying claims as conversation- / file- / inferred-sourced.
   Self-classification is unfalsifiable; surfacing isn't.
4. "Drift from conversation" needs an operational rule for lossy
   recall — "if a commitment can't be quoted from a specific
   message, downgrade to an open question." Without this the
   check is aspirational.
5. The "carrying from memory" footer is a portability leak: it
   names five rules the user holds mentally that aren't in the
   prompt text. For non-Claude contexts the rules need to live in
   the prompt itself, not in the user's head.
6. ~~The code-block rule lacks the data-structure carve-out the
   contributor's existing memory has; if the template generalizes
   to plan docs, that carve-out becomes load-bearing.~~ Resolved
   2026-05-08 — the data-structure carve-out was deleted from
   both the contributor's memory rule and from
   `docs/agents/planning/shared.md` "Plan code minimalism" as
   part of the cascade-fix structural change (see Log entry
   below). The honest version of the rule is now "no fenced code
   blocks of any kind in plan or scoping docs," which means the
   template's existing five-line cap is now looser than the
   plan-doc rule it would generalize to (the template still
   admits ≤5-line blocks; the plan-doc rule admits none) and
   needs tightening if the codification fork lands.

Prior-art template (verbatim from the originating session — keep
embedded so the next codification pass can address the gaps
against the actual source rather than re-derive):

> Draft `docs/tracking/<filename>.md` with the structure and
> content we agreed on in this conversation. Treat this drafting
> as three phases:
>
> **Phase 1 — gather.** Before writing anything, list the inputs
> you'll rely on: the agreed-on section structure, the agreed-on
> bullet content, and any code/state claims. For any code/state
> claim, read the file this session — do not rely on
> earlier-in-buffer recall. If a claim would require inventing
> detail beyond what's in the conversation or the code, do not
> invent it; mark it as an open question.
>
> **Phase 2 — draft.** Write the doc. Keep prose tight; no code
> blocks longer than ~5 lines. No ephemeral identifiers (PR
> numbers, commit hashes, "this PR" placeholders). Open questions
> and TBDs are first-class content — leaving a section open is
> correct; fabricating to fill it is not.
>
> **Phase 3 — audit.** Re-read the whole doc end-to-end and
> produce a checklist:
>
> - **Unsupported claims:** for every load-bearing assertion,
>   classify it as (a) sourced from this conversation, (b) sourced
>   from a file I read this session, or (c) inferred. If (c),
>   downgrade to an open question or remove.
> - **Internal contradictions:** does any section contradict
>   another? (Common: section 3 commits to a decision that section
>   5's workstreams quietly walk back.)
> - **Soft commitments:** any "should," "might," "we plan to"
>   language attached to things stated as decisions elsewhere?
>   Reconcile.
> - **Drift from conversation:** for each architectural
>   commitment, does the wording match what was actually said, or
>   has it softened/expanded? Snap back to the conversation's
>   wording.
> - **Citations:** any `path:line` references? If yes, were they
>   produced from a tool read this session? If not, remove or
>   re-verify.
>
> Report the audit checklist results inline before declaring done.
> If the audit found nothing, say so explicitly — that's a
> positive signal, not filler.
>
> I'm already carrying the following from memory, but it can be
> good to analyze the following options for things to codify in
> non-Claude contexts:
>
> - Plans/tracking docs describe contracts, not implementation;
>   no code-block bloat
> - Citations must be retrieved in the same session, never
>   recalled
> - Load-bearing claims need adversarial verification of the
>   actual code path
> - No ephemeral coordination identifiers in durable docs
> - "Verbatim" means bytes when copying anything

## Log

Append-only. Each entry: date + 1–3 bullets on what moved, what
didn't, and any change to the diagnosis or bets. Do not edit
prior entries.

### 2026-05-10 — A2 + A3 landed: narrow-surface phase carve-out + concrete lightweight thresholds

- **A2 landed.** Added "Narrow-surface phases may skip the
  scoping doc" carve-out to `docs/agents/planning/phase.md`
  (~58 lines). A phase qualifies as narrow-surface when ALL of:
  single subsystem, ≤8 files, no new public-API contract, no
  new cross-cutting invariant, no novel mechanism. Structurally
  parallel to the existing "Doc-only decision phases" carve-out
  (also an explicitly-invoked exception to the same scoping-
  mandatory rule). Default direction stays "scoping first"; the
  carve-out is invoked, not defaulted. Verification protocols
  (Reality-check inputs) are explicitly non-optional even on the
  carve-out path — the form compresses (inline in the plan), the
  falsifier function does not.
- **A3 landed.** Rewrote `docs/agents/workflows/implementation.md`
  "Lightweight vs full structured" section's gate. Five concrete
  criteria (≤5 files, single subsystem, no public-API change, no
  schema change at all, local test surface) replace three fuzzy
  examples. The Lightweight / Full Structured numbered steps are
  unchanged — only the gate tightens. A3's cutoffs are deliberately
  stricter than A2's because A3 governs unplanned implementation
  work (commit / validation discipline) while A2 governs scoping
  artifact necessity for planned phases — different decisions,
  different cutoffs, same threshold family.
- **Effect on bets.** Bet 4 (phase plans fit in 400 lines) gains
  its first inflow-side mechanism: the carve-out routes qualifying
  phases past the scoping-doc step, and the Reality-check-inputs
  carve-out preserves verification protocols. The next narrow-
  surface phase drafted is the empirical test; if the carve-out
  fires (and produces a tighter plan doc), Bet 4 advances. If it
  under-fires (planners default to full scoping even when phases
  qualify), the cutoffs revise — that's the bet's "If failing"
  branch in advance.
- **Net rule-count change in `docs/agents/`.** +1 (the narrow-
  surface carve-out). The implementation.md rewrite tightens an
  existing section's threshold without adding a parallel rule. Per
  the A1 rule-retirement convention (landed 2026-05-09 per the
  prior Log entry), the implementing PR carries the (b)
  justification — both edits are exceptions to or refinements of
  existing rules; no rule could honestly be retired by them.

**Action Layer follow-through.** A2 marked landed (2026-05-10).
A3 marked landed (2026-05-10). A7 / A7a remain as the empirical-
input items that calibrate future revisions to the cutoffs.

### 2026-05-10 — retroactive cap-fit exercise on two cross-cutting docs

Ran the empirical version of A7 retroactively on two recently-
landed cross-cutting docs to test whether Bet 4's caps generalize
to that class. Findings inform A7a (added to Action Layer in this
same PR).

**Subjects.**

- [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md)
  — 650-line cross-cutting plan. Bet 4 plan cap is ≤ 400.
- The newsletter-subscription-split scoping doc — 948-line
  cross-cutting scoping doc, since deleted per the
  transient-scoping-doc convention. Bet 4 scoping cap is ≤ 250.

**Findings.**

- **Cross-cutting plans need a different cap from phase plans.**
  The canonical-origin doc's compressibility ceiling without
  load-bearing loss is roughly 500–520 lines. Forcing 400 trims
  one or two of the knowledge-dense Investigations (encoded
  knowledge that costs work to re-derive: Vercel platform-feature
  ceiling, embedding-mechanism rationale, `NEXT_PUBLIC_SITE_ORIGIN`
  semantics) plus the deliberate "No Phase 3 / No Phase 4"
  decisions. Bet 4's 400 cap is roughly 25% too tight for this
  class.
- **Cross-cutting scoping docs need a *much* different cap.** The
  newsletter doc has a real ceiling around 700. The 250 cap is
  roughly 3× too tight. At 250, the only survivable structure is
  title + chosen option + one-paragraph rationale per decision;
  rejected alternatives, came-down-to analysis, pivot history, and
  Reality-check inputs all get gutted. The doc loses the *why* of
  every decision, the falsifier protocol the implementing pass
  needs, and the institutional learning recorded in pivot history
  (Decision 2's two-pivot history is exactly the shape this
  roadmap values).
- **Per-section caps fit the data better than per-doc caps.**
  Scoping-doc LOC scales with decision count (the newsletter
  doc's roughly 660-line decisions section ≈ 7 decisions × ~95
  lines each, structurally driven). A flat per-doc cap measures
  the wrong axis; per-section caps ("each decision ≤ 80 lines,"
  "each Investigation ≤ 12 lines") compress real bloat without
  forcing structural loss.
- **Verification protocols are not bloat.** The 98-line Reality-
  check inputs section in the newsletter doc was the single
  largest "would be cut at the cap, would be a disaster to cut"
  surface across both docs. Any A2 / A3 / A7a design needs an
  explicit carve-out: the falsifier-list shape is the visible
  artifact of the falsifiability and reality-check rules in
  `shared.md` and protects against shipping against unverified
  assumptions.

**Effect on bets.** Bet 4 unchanged in scope — its Measure is the
phase-plan path glob, and the exercise found Bet 4's framing
doesn't *generalize*, not that it's wrong on its own surface. A2
and A3 inputs widened: both consume this Log entry at planning
time; neither's Notes are pre-decorated, in keeping with the
"every finding becomes a rule" anti-pattern the diagnosis flags.

**Action Layer follow-through.** A7a added (cross-cutting sibling
to A7). A7's Notes tightened with a one-sentence scope clarifier
pointing at A7a.

### 2026-05-09 — A1 landed: rule-retirement convention in `AGENTS.md`

- **Added "Rule additions in `docs/agents/`" section to
  `AGENTS.md`.** Rule-adding PRs to `docs/agents/**` must either
  (a) name a retired rule or (b) state in the PR body why no rule
  could be retired. ~7 lines added to `AGENTS.md`; no other
  durable rule files touched.
- **Effect on bets.** Bet 3 (rule-retirement convention) is no
  longer roadmap-only — the convention now loads on every session
  that reads `AGENTS.md` (i.e., every non-trivial session). Bet 2
  (rule-deletion ratio) is unchanged as a measurement; whether the
  convention actually moves the inflow rate is the bet itself. A1
  is the inflow-side complement to the 2026-05-08 outflow-side
  fix; together they're the durable shape, not the
  consolidation-only treadmill.
- **Trigger scope.** The rule's trigger is `docs/agents/**`, not
  `AGENTS.md` itself, matching the original A1 / Bet 3 framing.
  This PR adds a rule to `AGENTS.md`, so the new rule does not
  fire on its own introduction. Expanding the trigger to cover
  `AGENTS.md` would be a separate move; deferred until / unless
  `AGENTS.md` itself starts compounding.

### 2026-05-08 — structural fix to break the code-shape review cascade

- **Stripped the data-structure carve-out from `shared.md`
  "Plan code minimalism."** The carve-out admitted code-shaped
  content under the framing "shape isn't syntax," which
  reviewers don't actually distinguish; this was the cascade's
  entry point. New rule: no fenced code blocks of any kind in
  plan or scoping docs — inline backticks for identifiers and
  short signatures stay fine. Same change applied to the
  contributor's auto-memory rule. Removed alongside the carve-
  out: the directional-pseudocode framing, the author-side
  falsifier check, and the M1 phase 1.1 SQL-subquery anecdote.
  All three existed to triage "is this snippet acceptable" —
  unnecessary once the answer is "no fenced code blocks."
- **Added `shared.md` "Plan-doc review stance"** as the
  companion rule on the demand side. Plan- and scoping-doc PRs
  now include a `## Review Stance` section in the PR body that
  names what reviewers should and shouldn't focus on. Header
  lives in the PR body, not the durable doc — shifting the
  review interaction without bloating every plan with the same
  paragraph. Tracking-doc PRs already carried an equivalent
  stance per this roadmap's own precedent; the new rule
  generalizes it to the plan and scoping surfaces where the
  cascade actually originates.
- **Net delta on `shared.md`**: 503 → 489 lines (−14). The
  removed Plan code minimalism sub-rules collapsed from ~100
  lines to ~44; the new Plan-doc review stance adds ~46. First
  non-zero numerator entry for Bet 2's monthly rule-deletion /
  rule-addition ratio.

**Effect on bets.** Bet 2 (rule-deletion ratio) gets its first
numerator entry. Bet 3 (rule-retirement convention) remains a
roadmap-only convention until A1 lands. Bets 2 and 3 should
now move faster than the original "two-month" target predicted
because the cascade's most-recurring rule-addition trigger
(code-shape Codex findings on plan docs) has been removed at
its source. Bet 1 (plan LOC ≤ code+test LOC per epic) is not
directly affected, but the removed sub-rules contributed to
the rule load that justified long plans, so this fix reduces a
downstream pressure on Bet 1 and Bet 4.

**Audit done as part of the fix.** Walked `shared.md` and
`phase.md` for other rules driven by code-shape Codex findings
on plan docs. None found beyond the sub-rules removed here —
the cascade's surface area was concentrated in "Plan code
minimalism." Other rules respond to genuinely-different
planning-discipline learnings (URL retargets, wrapper-script
preference, hard navigation for cross-app destinations,
locator stability after a URL retarget, doc-only phase carve-
out, etc.). Flagged as a future A4-pass candidate, **not**
deleted in this fix: the explicit trigger enumeration inside
the "Verified by:" annotations rule is redundant with the
section's own "trigger enumeration is illustrative, not
exhaustive" catch-all sentence. Worth deleting once the
broader A4 gating timeline elapses without the enumeration's
specific surfaces re-firing — premature here.

**Action Layer follow-through.** A4 marked partially landed.
A8 gap 6 (the carve-out gap) marked resolved.

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
