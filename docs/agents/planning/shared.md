# Cross-Level Planning Rules

Cross-level rules that bind every plan-drafting session regardless
of level (epic / milestone / task plan / phase plan). Per-level
files ([`epic.md`](./epic.md), [`milestone.md`](./milestone.md),
[`plan.md`](./plan.md)) **reference** these rules; they do not
duplicate them. Rules that bind only at the implementation layer
(task plans and phase plans) — Planning Depth, the
`` `In draft` → `Proposed` `` promotion gate, the Plan-to-PR
Completion Gate — live in [`plan.md`](./plan.md), not here,
because epic and milestone docs do not consume those gates.

If a rule below feels load-bearing only at one level, that's a
signal to move it to the per-level file rather than restate it
here. The discipline is: if a rule binds two or more planning
levels, it lives here once.

Four of the rules below — `Plan-doc review stance`,
`Cross-Cutting Invariants section`, `"Verified by:" annotations
on load-bearing claims`, `Falsifiability check on each
load-bearing claim` — bind every level but mean different things
at each. Each carries a closing cross-walk line naming what the
rule means at epic / milestone / plan level. The cross-walks
describe per-level interpretation, not additional per-level
binding; they do not re-introduce the per-level duplication trap
the demoted-rules split was designed to avoid.

## Plans describe contracts, not implementation

A plan describes what the implementation must achieve — the
conditions that must hold for the implementation to satisfy the
plan. The implementation is the specific choices the implementer
makes to satisfy the contract.

When plan content descends to the level of implementation choice,
one of two failure modes follows:

- **The plan no longer fully covers the contract.** When a plan
  names a subset of a category, only the named subset is
  constrained; the rest of the category is left uncovered.
- **The plan contradicts the implementer's reasonable choice.**
  When a plan prescribes a specific sequence or technique, it
  contradicts the implementation the moment the implementer's
  reasonable choice differs.

Either failure mode is a sign the plan was written below the
right altitude: above it, the contract is invariant under the
implementer's reasonable choices; below it, it isn't.

The protective intent is structural, not formatting preference —
implementation-shaped content in plans attracts implementation-
shaped review, which compounds the rule layer rather than the
product. The agentic-practice diagnosis at
[`docs/tracking/agentic-practice-roadmap.md`](/docs/tracking/agentic-practice-roadmap.md)
named this cascade explicitly: plan-doc LOC ran roughly 64k
against ~34k product code at the early-May 2026 snapshot, with
no rule-deletion PRs in `docs/agents/` for the prior month, and
the prior structural-only form of this rule had accreted a
falsifier check, a directional-pseudocode framing, a data-
structure carve-out, and a self-flag heuristic to triage "is
this snippet acceptable."

### Structural surface

**No fenced code blocks of any kind in plan or scoping docs.**
Inline backticks for identifiers, file paths with optional
`:line` suffixes, and one-line type or function names embedded
in prose are fine — those are citations, not code under
contract. **Inline backticks for executable expressions or
predicate spellings are still code, even at one line** — a
literal predicate, a regex literal, or a function-body fragment
attracts the same code-shaped review fenced blocks do and
belongs in the implementing PR alongside them. Anything more
belongs in the PR that implements the plan (commit message,
code, comment), not in the plan doc itself.

### Reviewer-fix discipline

When a reviewer flags content that violates this rule, the
response is shape-specific:

- **Structural violation (code-shaped content in a plan):**
  remove or summarize the snippet. Do not fix the code in place.
  Code-correctness iteration belongs in the PR that implements
  the plan.
- **Altitude violation (plan descended to implementation
  choice):** loosen the prescription to contract altitude. Do not
  patch the technique in place. Patching makes the plan hostage
  to the next implementation choice; loosening makes the plan
  resilient.

Exception in either case: if the comment surfaces a genuine
design flaw whose phrasing happens to be code or technique (an
ordering race, an invariant violation, a coverage gap), fix the
prose contract in the plan and move the code or technique to
the implementation PR — don't fix both in the plan.

### Recurring traps

Illustrative examples of the rule's failure mode in practice.
Not an exhaustive list; new traps are appended as they're found.

- **Subset enumerated where the contract names a category.** A
  plan enumerates a specific subset of a category (privilege
  types, error classes, role names) when the contract calls for
  the full category. Only the enumerated subset is constrained;
  the rest is left uncovered. The fix is to describe the category,
  not name its current members.
- **Specific source named where the contract is about coverage.**
  A plan names a specific introspection source (catalog view,
  library function) when the contract is about behavior the
  source must produce. When the named source's coverage gap
  exposes itself, the prescribed technique no longer satisfies
  the contract. The fix is to describe what coverage the source
  must produce, not which source is used.
- **Trajectory prescribed where only the end state is in the
  contract.** A plan describes a specific sequence of
  intermediate steps — what order to do things, what commands to
  run, how to decompose the work — when the contract is only
  about what must hold at the end. Trajectory is the
  implementer's choice; the contract is the post-implementation
  state. Over-prescribing trajectory either contradicts the
  implementer's reasonable choice (creating internal-coherence
  bugs) or imports middle-state commitments the plan shouldn't
  care about. The fix is to describe the end state and let the
  implementer pick the trajectory. State transitions that ARE in
  the contract — a validation gate that must pass before a
  subsequent step, an output that a later step consumes, an
  artifact that must reach a specific state before another can
  act on it — are contract states, not trajectory; Planning
  Depth's requirement to "insert steps at the correct point in
  the sequence" applies to those contract states and does not
  extend to prescribing trajectory between them.

### Forward-only application

Pre-existing plans drafted before this rule (in either its
structural-only form or this consolidated form) are not
retroactively non-conforming. Plans drafted from this point
forward stay at contract altitude across all sections; reviewers
may flag descents to implementation choice as a structural issue
rather than reviewing the specific technique. The companion
rule on the reviewer side lives in the next section.

## Plan-doc review stance

Plan- and scoping-doc PRs carry the same review hazard the
"Plans describe contracts, not implementation" rule above
addresses on the supply side: code-trained reviewers default to
line-level findings (syntax-shaped, command-ordering-shaped)
even on prose-shaped content, and the cascade compounds when
each finding produces either a snippet patch or a new rule. The
supply-side fix (no code blocks, no technique prescription) is
cheaper if the demand-side stance is also explicit, so reviewers
don't reach for the wrong toolkit at review-open time.

A PR whose primary diff is in `docs/plans/**` (plan doc or
scoping doc) carries a `## Review Stance` section in the PR
body. Canonical wording, which the PR may copy verbatim or
adapt to the doc's content:

> **Review Stance.** Review for: factual accuracy of claims
> about the codebase and supporting services (with attention to
> `Verified by:` citations); internal coherence between
> contract / invariant / validation sections; decision-
> completeness on Contracts; that estimate-shaped sections are
> labeled per the "Plan content is a mix of rules and
> estimates" rule in `shared.md`; that load-bearing claims pass
> the "Falsifiability check" rule in the same file. **Do not
> review for line-level correctness** on identifiers, signatures,
> commands, or implementation sequencing embedded in prose — per
> "Plans describe contracts, not implementation" in `shared.md`,
> fenced code blocks and technique prescriptions belong in the
> implementing PR, and anything short enough to live inline in
> prose is a citation, not code or technique under contract.

The stance lives in the PR body (where reviewers see it at
review-open time), not in the plan doc itself. Adding it to the
durable doc would be its own form of bloat — every plan and
scoping doc would carry the same paragraph. The PR body is the
natural place because the stance shifts the *review interaction*,
not the durable artifact. Tracking-doc PRs under
`docs/tracking/**` already carry an equivalent stance per the
[agentic-practice roadmap](/docs/tracking/agentic-practice-roadmap.md)
precedent; this rule extends the pattern to the plan and scoping
surfaces where the cascade originates.

Pre-existing plans without this header are not retroactively
non-conforming. Plan- and scoping-doc PRs opened from this point
forward include the section.

**Per-level cross-walk.** The same Review Stance binds every
level; what shifts is the load-bearing surface the stance
protects. At epic level the stance keeps reviewers from
prescribing per-milestone scope or per-phase technique that
hasn't been planned yet. At milestone level the stance keeps
reviewers from prescribing per-phase trajectory or per-PR
contracts that belong to the per-phase plan. At plan level the
stance keeps reviewers from prescribing per-file technique or
implementation sequencing that belongs to the implementing PR.

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

**Per-level cross-walk.** At epic level, the invariants thread
across milestones — a capability constraint multiple milestones
must respect, or a posture decision that binds the whole arc. At
milestone level, the invariants thread across phases — a contract
every phase must preserve, or a coordination rule that binds the
phase set. At plan level, the invariants thread across files
within the plan's implementing PR(s) — the original framing of
this rule.

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
  "Estimate Deviations" callout in the PR body (see
  [`plan.md`](./plan.md) "Plan-to-PR Completion Gate"). When the
  call is unclear, ask.
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
a code citation (file path with optional symbol or section anchor,
or `:N-M` line range — see "Anchor preference" below), generated
test output, an already-merged sibling artifact, or the upstream /
vendor documentation URL for claims about external-service behavior
the codebase doesn't contain proof of. "Per scoping doc" or "per
epic" are not acceptable verification sources. Claims that cannot
carry a verification reference are re-phrased as assumptions
(clearly tagged as such) or removed. This is not formatting
preference — it is the protective check that keeps the
reality-check gate (named in [`phase.md`](./phase.md)
"Reality-check gate between scoping and plan") from being rolled
back during plan-drafting. The trigger enumeration is illustrative,
not exhaustive: the rule binds any load-bearing claim about the
codebase or supporting services, and agents do not get to argue
"my claim isn't on the list, so the rule doesn't apply."

**Anchor preference: prefer symbol- or section-anchored references
over `:N-M` line ranges when the cited target has a stable name.**
Function names, JSON key paths, exported symbols, markdown section
headings — any stable identifier the cited file already carries —
survive structural edits to the file (a strip of unrelated lines
shifts every `:N-M` citation but doesn't move the symbol). Line
numbers remain permitted (and remain required at write time per
the retrieve-before-citing rule) but should be treated as
**directional navigation aids, not exact contracts** — line
numbers drift as files get edited, and there is no docs-equivalent
of an IDE's "rename all references" tool to keep them in sync
across the plan tree. Reviewers do **not** flag stale or imprecise
`:N-M` citations as findings; the symbolic content of the
surrounding prose is the load-bearing anchor, and an off-by-N line
range is a navigation hint to refresh, not a review issue. This
preference is not a prohibition: paragraph-level precision inside a
long section, files without stable named targets (plain config,
flat SQL), and citations the author judges clearer with line
numbers all stay valid uses.

**Per-level cross-walk.** At epic level, citations target
capability framing and external constraints (vendor docs that
define the capability surface, prior-art product decisions, the
upstream policies the epic depends on). At milestone level,
citations target cross-phase coordination decisions and the
upstream/downstream contracts the milestone locks. At plan
level, citations target code, generated test output, or vendor
docs for the specific contracts the plan binds — the original
framing of this rule.

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

**Per-level cross-walk.** At epic level, the falsifier targets
capability and constraint claims ("would shipping M2 alone
surface this constraint?" "would the named upstream dependency
remove this capability?"). At milestone level, the falsifier
targets claims about cross-phase coupling and sequencing
rationale ("can phase X actually consume what phase Y
produces?"). At plan level, the falsifier targets validation
procedures and per-contract claims as the rule body's examples
illustrate — the original framing of this rule.

## Decompose options into shapes before analyzing

When a Choose-One decision (scoping decision, framework / library
choice, alternative-evaluation in a Risk Register) lays out the
candidate set, the first step is **enumeration**, not analysis.
Each named option can hide multiple sub-shapes with materially
different cost/benefit profiles. Before accepting or rejecting any
option, ask: **are there sub-shapes — variants of how this option
could be implemented — that would change the analysis?** Decompose
first, then analyze each shape on its own merits.

The recurring failure mode is category-level analysis: the option's
category name is treated as a single thing, the rejection rationale
holds against one shape that happens to be in the category, and
sibling shapes slip through unevaluated. The decision looks
well-reasoned in retrospect because the rationale holds against the
strawman it cited — the failure is invisible until implementation
surfaces a constraint (or unlocks a benefit) that an unevaluated
sibling shape would have caught.

Categories that frequently hide multiple shapes: "server-mediated
write" hides "SECURITY DEFINER RPC via `.rpc()`" and "Edge Function
wrapping the RPC"; "abstraction" hides extracted-helper,
shared-module, and full class hierarchy; "framework integration"
hides minimal adapter, wrapper-with-escape-hatch, and full rewrite;
"caching layer" hides per-request, per-session, and shared CDN. If
a candidate's name covers more than one viable shape, split it
before scoring.

Recurring trap: madrona feedback scoping framed the submission-path
decision as "direct anon insert" vs "Server Action" vs "Edge
Function." Option (c) "Edge Function" was actually two distinct
shapes — "SECURITY DEFINER RPC called via `.rpc()`" (no separate
runtime, same round-trip count as direct insert) and "Edge Function
wrapping the RPC" (separate Deno runtime, multi-write
orchestration). Both were treated as one. The heavier shape was
rightly rejected; its lighter sibling was never decomposed out of
the category. The chosen option shipped a PostgREST/grant
interaction (`INSERT … RETURNING` requires `SELECT`, anon was
INSERT-only) that the RPC-alone shape would have sidestepped at
scoping time. See
[supabase/migrations/20260506000000_add_feedback_tables.sql](/supabase/migrations/20260506000000_add_feedback_tables.sql)
for the grant posture and
[supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql](/supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql)
for the RPC pattern that was conflated.

Pre-existing scoping decisions are not retroactively non-conforming;
scoping sessions opened from this point forward decompose options
into shapes before locking the candidate set.

## Anti-pattern: planning artifacts that only cite each other

If the plan, scoping doc, and milestone doc all cite each other
for the same load-bearing claim, the claim is unverified. Fluent
cross-doc citation is not verification. Each load-bearing claim
needs at least one citation to actual code, generated test output,
an already-merged sibling artifact, or upstream / vendor
documentation for external-service-behavior claims the codebase
doesn't contain proof of.

## `Deferred` status for paused planning

Plans, milestone docs, and scoping docs whose drafting is
intentionally paused — typically because the work has been
resequenced behind other milestones, an upstream dependency
hasn't decided yet, or the deliverable has been moved to a
future epic — carry Status `Deferred` (exact-match canonical
token), optionally followed by an em-dash and freeform
human-readable context: `Deferred — <reason>`.

The canonical `Deferred` prefix is what status-tracking
queries match against; the post-em-dash reason is freeform
context for humans, NOT exact-match-checked. Examples:

- `Deferred — final milestone of the epic; not yet next-up`
- `Deferred — pending decision on cross-app routing`
- `Deferred — moved to future organizer-reading epic`

While Deferred, the doc's content is **non-prescriptive**:
future planning sessions that resume the work re-derive every
goal, sequencing, decision, invariant, and risk against the
actually-merged code at resume time and are not bound by the
choices recorded in the deferred draft. The protective intent
is the recurring trap a Deferred state otherwise hides: a
future planner reads the deferred doc, treats its decisions
as settled because they look complete, and silently inherits
assumptions that the original drafting session never expected
to bind. Authors of a Deferred doc must state the
non-prescriptive framing explicitly in the doc's leading
prose so the future reader can't miss it.

State transitions out of `Deferred`:

- **`Deferred` → `In draft` (resumption).** When the work
  becomes next-up, the resuming planner flips Status back to
  `In draft` and re-runs the `` `In draft` → `Proposed` ``
  promotion gate from scratch (see
  [`plan.md`](./plan.md) "`` `In draft` → `Proposed` ``
  promotion gate"). The previous deliberation becomes input to
  consider, not contract to respect.
- **`Deferred` → (deletion).** If the work is cancelled
  outright (epic re-scoped to drop it, or absorbed by a
  different epic), the doc is deleted in the same PR that
  records the cancellation rationale; the deferred content
  survives in git history.

Do not invent additional states adjacent to `Deferred` (e.g.
`Deferred draft`, `Deferred — non-prescriptive`,
`Paused`, `On hold`, `Frozen`). The em-dash freeform reason
is the supported affordance for context. This rule is the
exact-match label discipline above applied to the Status
lifecycle: `Deferred` is the canonical token, and adjacent
descriptive variants break queryability the same way
paraphrased `In progress pending prod smoke` did before its
exact-match rule landed.
