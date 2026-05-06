# Cross-Level Planning Rules

Cross-level rules that bind every plan-drafting session regardless
of level (epic / milestone / phase / cross-cutting plan / plan-to-PR
close-out). Per-level files
([`epic.md`](./epic.md), [`milestone.md`](./milestone.md),
[`phase.md`](./phase.md)) **reference** these rules; they do not
duplicate them. The Plan-to-PR Completion Gate (Status lifecycle,
Estimate Deviations, soft-commitment ban) lives below in this file
because it is a cross-level rule too — it binds every plan with a
Status block.

If a rule below feels load-bearing only at one level, that's a
signal to move it to the per-level file rather than restate it
here. The discipline is: if a rule binds two or more planning
levels, it lives here once.

## Planning Depth

When asked to make a plan, do not compress the workflow to an arbitrary short
step count.

- include every execution gate that materially affects quality, even if that
  makes the plan longer than five steps
- keep baseline validation, branch hygiene, implementation, automated
  code-review feedback, documentation cleanup, final validation, and PR
  preparation as separate steps when they are all relevant
- for implementation plans, include an explicit documentation-current-state gate:
  identify which docs with status-oriented sections (for example `Current
  State`, `Current status`, rollout status, or phase status) are affected, and
  include updating them as a required step before handoff
- do not merge steps just to keep the plan visually compact
- if a new required step is added, insert it at the correct point in the
  sequence without weakening or collapsing the surrounding steps
- for implementation plans, make the plan decision-complete enough that another
  engineer or agent can execute it without inventing missing gates, validation,
  or handoff work
- for PR-sized work, name the intended commit boundaries before editing when
  practical, and keep review-fix commits distinct when they clarify the history
- name the self-review audits that apply to this PR's diff surfaces, drawn
  from [`docs/self-review-catalog.md`](/docs/self-review-catalog.md). The
  plan should list audit names by surface (SQL / frontend / CI / runbook)
  so the implementer runs them at commit boundaries rather than
  rediscovering review feedback at PR-review time

## Plan code minimalism

Keep plans at the level of contracts and prose, not implementation
detail. One-line function signatures, short type declarations, and
short file-path references are fine; full function bodies, multi-line
shell pipelines, SCSS rule bodies, or any code block longer than
roughly five lines is implementation that belongs in the PR, not the
plan. Plans attract code review; every bug in a code snippet inside a
plan costs a review round on the plan doc itself before the
implementation even starts, which is pure churn.

**Code shapes in plans are directional pseudocode.** Whatever code-
shaped content the five-line rule above admits — a backticked
field-value pair, a one-line type signature, a short expression — is
*shape*, not source. It communicates contract structure (what field
exists where, what shape it takes, how it relates to other fields),
not exact syntax. The implementer translates shapes into
syntactically-correct code at PR time, against the surrounding prose
that frames the shape. Agents reviewing a plan-doc PR (Claude,
Codex, similar bots, human reviewers) apply this stance directly
from this rule: focus on shape-level questions — is the right field
named? does the shape match what the prose around it describes? is
the contract self-consistent? — not on syntax-level findings
(template-literal quotes, shell precedence, missing imports,
semicolons). The five-line rule caps how much code-shaped content
lives here even under this framing; this rule shifts the reviewer's
stance on whatever content the cap admits.

**Author-side falsifier — would a reviewer find a syntax bug?**
The five-line cap is necessary but not sufficient: short snippets
can still attract syntax-level review when they contain exact
syntax the implementer must transcribe verbatim. Before committing
any code-shaped content, ask: could a careful reviewer find a
syntax bug in this snippet? If yes, the content is exact syntax
(not directional shape), regardless of length, and belongs in the
implementation PR. Patterns that consistently fail this test: SQL
policy bodies and subqueries with column references, function-call
expressions with literal arguments the implementer cannot
mechanically derive from the surrounding prose, regex literals,
JSON / object literals with field-value pairs that must match a
downstream consumer exactly, multi-statement shell pipelines.
Replace each with prose that names the contract structure
("policy resolves slug → event_id by joining through `game_events`,"
not a `using (...)` body; "the script invokes the publish RPC with
the same `event_id` and an actor uuid," not the call expression).
A self-flag is the strongest signal that this rule is firing: if
you find yourself writing a parenthetical like "implementer audits
this against the actual parser diagnostic," "alias the row
reference if the database surfaces ambiguity," or "adjust if X"
next to a code snippet, that uncertainty *is* the rule firing —
delete the snippet, keep (and tighten) the prose. Annotating a
snippet with a "fix this later" note doesn't satisfy the rule; it
just hands reviewers more code to review, and them finding the
very thing the annotation flagged is the predictable outcome.
Recurring trap (M1 phase 1.1 planning, 2026-05-06): a phase plan's
SELECT-policy contract included a 3-line scalar-subquery SQL body
— short enough to slip under the line cap but exact-syntax enough
that an unqualified column reference made the subquery
tautological and runtime-broken; the author noticed the ambiguity
at write time and added a parenthetical fix-later annotation
instead of removing the snippet, and Codex review caught the very
ambiguity the annotation flagged. The shape-not-syntax test plus
the self-flag check would have caught it regardless of line count.

When a reviewer comment targets a code snippet inside a plan, the
correction is to **remove or summarize the snippet**, not to fix the
code in place. Code-correctness iteration belongs in the PR that
implements the plan. Exception: if the comment surfaces a genuine
design flaw whose phrasing happens to be code (e.g. an ordering
race, an invariant violation), fix the *prose contract* in the plan
and move the code to the implementation PR — don't fix both in the
plan.

## Cross-Cutting Invariants section

List the cross-cutting invariants that thread through multiple files
in their own `## Cross-Cutting Invariants` subsection, distinct from
per-file contracts. Per-file contracts describe what one module does;
cross-cutting invariants describe relationships that must hold
simultaneously at every call site and break silently when one site
drifts (examples: "a shared reference clock advances on every
user action that changes filtered output," "every dialog exposes
an accessible name via `aria-label` or `aria-labelledby`," "derived
state for modal return-focus must survive the close transition,
not null out with the trigger state"). Aim for 2–4 one-line
invariants. Without naming these, implementer self-review checks
each file in isolation and misses bugs that only appear when two
sites disagree about the same rule; reviewer rounds then rediscover
the gap one call site at a time. The plan's job is to name the rule
once so self-review can walk every site against it.

## Plan content is a mix of rules and estimates — label which is which

A plan doc carries two kinds of content: **rules** that
bind the implementation (Cross-Cutting Invariants, Contracts,
Validation Gate, Self-Review Audits, Out Of Scope deferrals) and
**estimates** of what the implementation will look like (file
inventory under "Files to touch — new / modify / intentionally
not touched," step counts, commit boundaries, sometimes
per-section LOC predictions). Estimates are the planner's best
guess at plan time about scope shape; reality during
implementation may surface that an estimate was wrong without
any rule being wrong. Plan authors **must** structure the doc
so the distinction is visible to both human reviewers and
implementing agents:

- Sections that bind (Cross-Cutting Invariants, Contracts,
  Validation Gate, Goal, Self-Review Audits, Risk Register
  mitigations, Out Of Scope) are rule-shaped by section name and
  don't need extra labeling.
- Sections that estimate ("Files to touch — new," "Files to
  touch — modify," "Files intentionally not touched," "Execution
  steps" sequencing, "Commit boundaries") **must** carry a one-
  line preface naming them as estimates of the expected shape,
  explicitly admitting that implementation may revise them when
  a structural call requires deviating. The list `Files
  intentionally not touched` is the recurring trap — its name
  reads as a hard prohibition but the underlying claim is
  "we don't expect to need to touch these," not "implementation
  must not touch these." Same for "intended commit boundaries":
  the planner's split is an estimate of cohesive review chunks;
  the implementer can refine.
- Implementers reading a plan: distinguish before deviating.
  Deviating from a rule means the rule is wrong and the plan
  needs to be revised in this PR before the deviation lands;
  deviating from an estimate is normal and is handled via the
  "Estimate Deviations" callout in the PR body (see the
  "Plan-to-PR Completion Gate" section below). When the call
  is unclear, ask.
- Recurring trap (M3 phase 3.1.2 implementation, 2026-05-01):
  implementer initially read "Files intentionally not touched:
  section components" as a hard ban and inlined a duplicated
  25-line date formatter inside the new OG image helper rather
  than extract it from `EventHeader.tsx` into a shared util
  consumed by both. User correction landed mid-implementation;
  the formatter was extracted in a follow-up commit. Pre-existing
  plans drafted before this rule are not retroactively non-
  conforming; plans drafted from this point forward must label
  their estimative sections per the bullet above

## `In draft` → `Proposed` promotion gate

Plan-drafting is not required to be a single pass. A multi-pass
session can lay out the plan's structure with explicit deferrals,
then resolve them, then flip Status. While the plan is in the
resolution-pending phase, it carries Status `In draft`; flipping
to `Proposed` claims the plan is ready for code review —
contracts are decision-complete, the doc is internally coherent,
and load-bearing claims are verified. The flip is the natural
moment for a comprehensive self-review pass:

- **Read end-to-end as a coherent whole.** Re-read the full plan
  + scoping doc in order. Look for contradictions between sections
  (a contract claim that conflicts with a Risk Register mitigation,
  a decision in the scoping doc whose framing no longer matches a
  later decision's resolution, a Files To Touch entry that
  contradicts a contract, a multi-step contract whose ordering
  doesn't match its own test contract).
- **Decision-completeness on Contracts.** Walk Contracts for
  deferral phrases ("plan-drafting picks," "final spelling at plan
  time," "shape decided later," or any deferral that names
  plan-drafting itself as the resolver). Each must be resolved
  concretely, explicitly authorized by another rule (e.g., "Bans
  on surface require rendering the consequence" authorizes UX-copy
  deferral to render-time), or moved to the scoping doc's "Open
  decisions to make at plan-drafting" handoff. Plan-drafting is
  the moment that produced the plan; a contract that defers to
  "plan-drafting" defers to a moment that does not exist.
- **Walk the broadened `Verified by:` rule against every
  load-bearing claim.** The rule is named below; the promotion
  gate is when it gets applied universally rather than to whichever
  claims happened to feel "technical" during drafting.
- **Re-confirm the scoping doc's reality-check inputs against
  current code.** Line numbers, file existence, configuration
  shapes, and other inputs that drift from scoping → plan-drafting
  are reflected in the plan; stale references are updated.

Failures surface either as resolutions (apply edits before
flipping) or as plan-blockers that the user must triage before
the flip happens. A plan flipped to `Proposed` without this walk
is the same shape of drift as a plan flipped to `Landed` without
satisfying its Validation Gate — the Status claim is wrong. Plans
drafted before this rule are not retroactively non-conforming;
plans drafted from this point forward run the gate before the
`Proposed` flip.

## "Verified by:" annotations on load-bearing claims

Load-bearing claims in the plan about the codebase or supporting
services (including SQL contracts, RPC behavior, TypeScript / Edge
Function contracts, validation-procedure claims, dev-tool semantics,
URL contracts and route topology, copy that names artifacts or
destinations, framework / vendor behavior — Vercel rewrites and
CDN ordering, Supabase RLS / auth / config semantics, Next.js
conventions, Deno / Vite / Playwright runtime semantics — and any
other claim asserting something specific about how the codebase or
an external service behaves) **must** carry an inline "Verified
by:" reference to the source that proves them. Acceptable sources:
a code citation (file path + line number, not "per scoping doc" or
"per epic"), generated test output, an already-merged sibling
artifact, or the upstream / vendor documentation URL for claims
about external-service behavior the codebase doesn't contain proof
of. Claims that cannot carry a verification reference are
re-phrased as assumptions (clearly tagged as such) or removed.
This is not formatting preference — it is the protective check
that keeps the reality-check gate (named in
[`phase.md`](./phase.md) "Reality-check gate between scoping and
plan") from being rolled back during plan-drafting. The trigger
enumeration is illustrative, not exhaustive: the rule binds any
load-bearing claim about the codebase or supporting services, and
agents do not get to argue "my claim isn't on the list, so the
rule doesn't apply."

## Quote labels whose enforcement depends on exact-match matching

When a plan references a label whose value is checked or queried
by exact-string match (Status strings used for plan-state tracking,
branch naming conventions automation watches for, exact phrases a
rule forbids paraphrasing of), copy-paste from the source with a
`path:line` citation rather than retyping. Paraphrasing silently
weakens rules whose enforcement value depends on the exact string.

Recurring trap: [`docs/testing-tiers.md`](/docs/testing-tiers.md)
"Plan-to-Landed Gate" requires Status `In progress pending prod
smoke` and explicitly forbids paraphrase ("this exact string, not
`Landed` and not a paraphrase"); plan authors retyping have produced
descriptive variants that break the rule's queryability invariant.

Ordinary identifiers (env-var names, file paths, function names,
fixture names) do not need this treatment — code blocks and
adjacent file references already carry the spelling, and citing
every identifier adds noise without protective value. Citation is
required only when the plan claims something specific about an
identifier's wording, when the plan is the artifact introducing it,
or when downstream automation or status tracking depends on its
exact spelling. Apply the same exact-match discipline to trigger
clauses: when citing a rule's trigger ("the trigger that catches
this plan"), read every clause and quote the one that catches your
case, not the first one that looks relevant.

## Falsifiability check on each load-bearing claim

For every claim the plan presents as load-bearing pre-merge proof
("step N validates Z," "fixture X covers Y," "passing `build:web`
confirms Q"), walk through the falsifier in your head: what
observation would prove the claim wrong, and could the named
procedure surface that observation? If the exercise reveals the
validation is ambiguous (multiple causes produce the same
observation, the named procedure cannot distinguish them),
tighten the procedure and record the tightened version with its
discriminator. If the falsifier is obvious and the procedure
clearly catches it, the exercise is its own reward — no recording
needed; most validation bullets fall in this category.

Recurring trap that *should* have been caught and recorded:
"`/auth/callback` returning 404 from `vercel dev` proves the new
proxy rule fires" had no discriminating falsifier — every other
failure mode (rule missing, malformed rewrite, local-no-match)
also produces 404, so the test could not distinguish the desired
signal from the failures it was meant to catch. The fix was an
identity-fingerprint procedure that captures positive + negative
response signatures and asserts against both. The load-bearing
case is exactly when the exercise changes the procedure.

## Anti-pattern: planning artifacts that only cite each other

If the plan, scoping doc, and milestone doc all cite each other
for the same load-bearing claim, the claim is unverified. Fluent
cross-doc citation is not verification. Each load-bearing claim
needs at least one citation to actual code, generated test output,
an already-merged sibling artifact, or upstream / vendor
documentation for external-service-behavior claims the codebase
doesn't contain proof of.

## Plan-to-PR Completion Gate

The gate that an implementing PR walks before merge, and the
Status lifecycle that gate produces. Applies to:

- the implementing-PR walk (loaded by
  [`workflows/plan-implementation.md`](../workflows/plan-implementation.md))
- plan-drafting at phase level when the plan's Validation Gate is
  scoped (the post-release-validation exception below informs how
  Validation Gate is named — see [`phase.md`](./phase.md))
- the Plan-to-Landed close-out session (the doc-only follow-up PR
  that flips Status when post-release validation passes)

A PR that implements a plan must leave the plan in a terminal state.
"Most of the plan" is not "the plan." A plan doc that still says
`Proposed` or `In progress` after its implementation merges is drift,
and drift compounds into follow-up PRs that re-review the same
decisions.

- before opening the PR, walk every Goal, Test, Validation step, and
  Self-Review audit named in the plan; for each one confirm it is
  either satisfied in the PR or explicitly deferred **in the plan
  itself** with written rationale. Deferrals live in the plan, not in
  the PR body, not in an issue, not as an unwritten promise
- flip the plan's Status line from `Proposed` / `In progress` to
  `Landed` in the same PR that implements it. Plans in active
  multi-pass drafting may carry an interim `In draft` Status before
  `Proposed`; the `In draft` → `Proposed` flip is gated by the
  promotion-gate rule above ("`In draft` → `Proposed` promotion
  gate"). Do not record commit SHAs in the Status block — `git log`
  and `git blame` are authoritative for navigating from plan to
  history, and recording SHAs creates a chicken-and-egg problem (the
  SHA isn't known until after merge, which forces a follow-up commit
  whose only purpose is to record the previous commit's SHA).
  Same-PR flip is the default whenever the plan's Validation Gate
  can be fully satisfied pre-merge. Exception: plans whose
  Validation Gate names a check that can only run post-release
  (Tier 5 production smoke is the canonical case) land in two
  phases per [`docs/testing-tiers.md`](/docs/testing-tiers.md)
  "Plan-to-Landed Gate For Plans With Post-Release Validation" — the
  implementing PR merges with Status `In progress pending <validation-name>`,
  where the name is a stable, exact-match label for the specific check
  (the canonical Tier 5 case is exactly `In progress pending prod smoke`;
  see testing-tiers.md for non-smoke precedents); a follow-up doc-only
  commit flips Status to `Landed` and records the post-release
  validation run URL once the post-release run passes. The run URL is
  durable external evidence, unlike a commit SHA which is already in
  git. This is the single authoritative status rule for that case; do
  not invent additional states or leave the flip to an informal
  post-merge promise
- ban soft-commitment words in plans: "optional but recommended,"
  "consider adding," "nice to have," "probably should." A requirement
  is either in-scope or deferred — there is no third option. Soft
  commitments silently relax under review pressure and reappear as
  reviewer findings after merge
- if a reviewer flags a gap that should have been named at plan time,
  fix the plan first (tighten the requirement or defer with rationale),
  then address the gap. Do not carry the gap as a post-merge follow-up
  without updating the plan
- if a plan requirement cannot be fully satisfied in the intended PR,
  split the plan along a phase boundary before merging partial work so
  each phase's Status can flip independently, rather than merging a
  partially-satisfied plan and tracking the remainder informally
- **Call out estimate deviations in the PR body, and update the
  plan to match what shipped.** When implementation diverges from
  an estimate-shaped section of the plan ("Files intentionally not
  touched" ended up touched, "Files to touch — new" missed a file,
  contract bullets gained a requirement, intended commit boundaries
  reshuffled, an execution step was unnecessary or had to be
  split), two things must happen in the same PR:
  - The **PR body** names the deviation explicitly under a
    `## Estimate Deviations` heading inserted immediately after
    `## Documentation` (or `N/A` if no deviations). Each entry is
    one or two sentences naming the estimative section, the
    actual outcome, and why the call was the right one — enough
    that a reviewer can audit the deviation without reading the
    diff cold. This is the rationale and audit trail.
  - The **plan doc** is updated so its estimate-shaped sections
    describe what actually shipped, not the pre-implementation
    guess. Walk every estimate-shaped section ("Files to touch —
    new / modify / intentionally not touched," per-module
    Contracts, Execution steps, Commit boundaries) and reconcile
    each against the merged diff. A plan that says "Files
    intentionally not touched: X" after we shipped an X edit is
    the same shape of drift the Status-flip rule already forbids
    — the plan must describe the implemented system, not the
    pre-implementation guess. The PR body says *why we deviated*;
    the plan says *what shipped*.
  Distinct from the rule-deviation path above: rule deviations
  (a Cross-Cutting Invariant turning out to be wrong, a contract
  that can't be satisfied, a Validation Gate command that doesn't
  exercise what it claims) require the plan rule itself to be
  rewritten in the same PR; estimate deviations require the
  estimate-shaped section to be updated to match reality, plus
  the PR-body callout. Pre-existing PR templates do not need the
  Estimate Deviations heading until they are next edited; PRs
  opened from this point forward must include the section, and
  plan-implementing PRs must reconcile the plan with what shipped
  per the bullet above
