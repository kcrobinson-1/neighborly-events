# Scoping — M3 phase 3.1 (Demo-mode data-access-semantics decision, doc-only)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
absorbs into
[m3-demo-mode-auth-bypass.md](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
durable per-phase content (the canonical decision record with
rationale and rejected alternatives, the second-iteration B/C
deferral framing, the contracts the implementing PR consumes)
absorbs into
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md).

## Phase summary

Phase 3.1 is a doc-only decision phase. The deliverable is a
written record of the demo-mode data-access semantics M3 ships
on the test-event slugs (`harvest-block-party`, `riverside-jam`),
covering both the read side (how RLS-gated data reaches the
unauthenticated visitor on the bypass-target surfaces) and the
write side (whether bypassed surfaces accept writes at all and
how mutation attempts are signaled to the visitor). Per the M3
milestone doc the decision also cascades into the 3.2+ phase
split, which 3.1 either commits to or explicitly defers to
3.2's plan-drafting branch test. No code lands in 3.1's PR;
the doc-only artifact set is the plan doc, milestone-doc
edits (Phase Status row, Cross-Phase Decisions section, two
correctness fixes surfaced during deliberation), and an
[`docs/open-questions.md`](/docs/open-questions.md) entry
removal.

## Two-tier framing — what actually required deliberation

This scoping doc separates the items 3.1 walked into three
buckets, in honest contrast to "everything is a decision with
options + pros + cons" structure earlier scoping docs in this
epic used. The split exists because phase 3.1's milestone-doc
billing ("the doc-only decision phase that owns multiple
decisions") oversold the deliberation: only one item was
genuinely open. The rest fell out of decision 1, fell out of
AGENTS.md rules, or were reality-check findings rather than
deliberation outputs.

The intent is that future doc-only decision phases lean against
this precedent: triage upfront which open questions need real
deliberation vs. which can be one-line rule-applications, and
let the artifact's structure reflect that triage. Inflated
deliberation structure on items where the answer was determined
adds review burden without adding durable value; the load-bearing
record on rule-applications is "what + why + cite," not "options
+ pros/cons + came-down-to."

The three buckets:

- **Decisions requiring deliberation** — items where the answer
  was genuinely open and the conversation moved the framing.
  Full deliberation structure (options, pros/cons, came-down-to,
  resolution, `Verified by:` citations).
- **Decisions that fell out of rules, scope, or the headline**
  — items where the answer was determined by AGENTS.md, by an
  earlier decision, or by the absence of a real alternative.
  Compact form: outcome, what made it fall out, `Verified by:`
  citation.
- **Reality-check findings to land in the same PR** — items
  surfaced by the reality-check pass against the milestone
  doc's load-bearing claims, requiring correction per AGENTS.md
  "Plan-to-PR Completion Gate." Not decisions phase 3.1 was
  opened to resolve.

## Decisions requiring deliberation

### 1. Data-access semantics — read-only browse for M3, B/C deferred to second-iteration scoping [Resolved → Option A as iteration scope, B and C as live second-iteration candidates]

**What was decided.** Which of three demo-mode data-access
semantics governs the bypassed surfaces:

- **A — read-only browse.** Bypassed pages render but writes are
  rejected.
- **B — functional with persistence and reset.** Writes land in
  real tables; a reset story keeps the booth runnable.
- **C — sandbox-ephemeral.** Parallel/ephemeral state; real
  tables untouched.

**Why it mattered.** The headline open question of M3, opened by
the epic and named for resolution by 3.1 (per the M3 milestone
doc Cross-Phase Decisions → Deferred to phase-time entry). The
choice cascades into 3.2+ implementation surface, M4's
seeded-codes / reset-story design, and the read-mediation
sub-decision below.

**Options considered.**

1. **Read-only browse (Option A).** Cheapest. Read mediation on
   surfaces whose data fetches are RLS-gated; all five mutation
   Edge Functions short-circuit to a 403 "demo mode is
   read-only" response when slug is in the allowlist. Demo
   fidelity for the partner: visit the surfaces, see what's
   there, can't try anything.
2. **Functional with persistence and reset (Option B).** Highest
   demo fidelity (partner edits a draft, publishes, redeems,
   reverses). Costs: audit-field surgery on writes (`save-draft`
   writes `last_saved_by = auth.userId`; the publish/unpublish
   RPCs write `published_by` / `actor_id`), Edge Function auth
   gates get a slug-allowlist bypass branch, plus a reset story
   (cron / on-demand button / on-page-load) and seeded data.
   State persists across visitors until reset.
3. **Sandbox-ephemeral (Option C).** Highest blast radius.
   Either `demo_*` mirror tables or session-scoped storage,
   plus an Edge Function fork that routes demo reads/writes to
   the sandbox. Real tables stay pristine. Each visitor gets a
   fresh booth (no reset coordination), but the implementation
   cost is the largest of the three. Worth noting: the
   `complete-game` / `issue-session` /
   `get-redemption-status` precedent already operates with
   session-scoped state via signed cookies, so "session-scoped"
   is more grounded than "mirror tables" if Option C is ever
   implemented.

**Came down to.** Whether 3.1 should commit to a final
endpoint or treat A as a checkpoint with B vs. C deferred to
second-iteration scoping. The deliberation surfaced two
load-bearing observations:

- **The epic already structures M3 → M4 as a roadmap, not a
  destination pick.** The epic-level "M4 — Role-Door Surfaces
  And Redemption Seeding" description is essentially Option B
  (pre-seeded redemption codes, populated organizer monitoring,
  reset story). The epic also says M4–M6 reopening is "a
  separate scoping decision (a second-iteration pass against
  what M1–M3 actually delivered)." That deferral is the epic
  acknowledging it doesn't want to commit to B's exact shape
  now — it wants M3 to land, partner reactions to come back,
  and then decide what M4 looks like (and whether M4 is still
  the right shape, or whether second-iteration scoping reveals
  C is the better second step).
  `Verified by:` [epic.md:24-28](/docs/plans/epics/demo-expansion/epic.md)
  ("M4–M6 are explicit deferrals at the time of epic drafting;
  reopening them is a separate scoping decision (a
  second-iteration pass against what M1–M3 actually
  delivered)…");
  [epic.md:256-264](/docs/plans/epics/demo-expansion/epic.md)
  (M4 description matches Option B's shape).
- **A → B is fully additive; B → C throws out work.** What A
  ships (allowlist constant, page-component bypass branches,
  read-side mediation, UI demo signaling, noindex on apps/web,
  M2 role-door copy revision) all carries forward unchanged
  into B. The only delta is replacing the 403 short-circuits
  in five Edge Functions with real write paths plus
  audit-field handling and a reset story; the 403 branches are
  ~5 lines each and cheap to delete. By contrast B → C throws
  out the audit-field surgery and the reset story — both are
  the *expensive* part of B, and going A → B → C means paying
  for them twice. A → C directly is cheaper than A → B → C.

**Resolution.** **A is M3's iteration scope.** B and C are
explicitly NOT rejected — they are deferred to the
second-iteration scoping pass that the epic already
contemplates for M4–M6, against partner feedback from the
M3-shipped surfaces. The plan doc is the canonical record of
this framing per fell-out item D below. The decision record
states A as M3's scope; B and C as live second-iteration
candidates; the rationale (epic structure already implies a
roadmap, partner reactions are the load-bearing input we don't
have yet, committing now would be premature against AGENTS.md
"Defer rather than over-resolve"); and the second-iteration
triggers that should reopen the question (partner feedback on
whether read-only is enough, or whether they want to
try-it-yourself, or whether they want to co-walk through with
reset coordination).

**Verified by:**
[epic.md:148-178](/docs/plans/epics/demo-expansion/epic.md)
("Open Questions Newly Opened" → "Demo-mode data-access
semantics for test-event slugs" — the question 3.1 resolves);
[m3-demo-mode-auth-bypass.md:418-446](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(Cross-Phase Decisions → Deferred to phase-time → "Demo-mode
data-access semantics" entry as it stood at scoping read time —
the decision-ownership pointer 3.1 closes; the entry is
removed in 3.1's PR and replaced with a "Settled at
phase-time" subsection per fell-out item D below); AGENTS.md
"Defer rather than over-resolve" rule (Phase Planning Sessions
section).

## Decisions that fell out of rules, scope, or the headline

These are items the milestone doc framed as decisions phase 3.1
owned, plus sub-decisions raised during deliberation, where the
answer was determined by an earlier decision or by an AGENTS.md
rule rather than by deliberation. Each carries the load-bearing
record (outcome, what made it fall out, citation) without the
options/pros/cons structure deliberation 1 needed.

### A. Read-mediation pattern → Edge Function read shim

**Cascade from decision 1.** The roadmap framing (A as
checkpoint with B/C as live second-iteration candidates) made
option-preservation the load-bearing criterion. The Edge
Function shim is option-preserving for both A→B and A→C — the
shim's data source stays on real tables for B and switches to
sandbox tables for C; the mediation point itself stays put.
The two alternatives the milestone doc named are both lossy
under at least one path:

- *Anon-RLS broadening with `is_test_event_slug(event_id)` SQL
  helper* — option-preserving for B, but lossy for C
  (broadening becomes dead RLS surface once sandbox owns
  reads). Also forces the SQL-ingest sub-decision earliest.
- *Pre-published public views* — lossy for C (views deprecate
  when sandbox arrives) and security-fragile (view grants are
  permanent unless explicitly revoked; filter mistakes silent).

The reality-check pass found that the shim is also non-novel:
three existing functions (`complete-game`, `issue-session`,
`get-redemption-status`) already accept callers without a
Supabase user JWT via the shared `readVerifiedSession` helper.
That removes the "novel mechanism" cost the milestone doc
suggested would apply.

**Surface refinement worth surfacing.** The mediation surface
is finer-grained than the milestone doc's "the data each
surface fetches" framing implies (correction (b) below): admin
needs mediation on 2 read paths, redemptions on 1, redeem on 0.
This refinement carries into the plan doc's Contracts item 4
and is the canonical record of the surface that 3.2+ has to
mediate.

**Verified by:**
[supabase/config.toml:1-29](/supabase/config.toml) (all nine
Edge Functions run with `verify_jwt = false`);
[supabase/functions/_shared/session-cookie.ts:136](/supabase/functions/_shared/session-cookie.ts)
(`readVerifiedSession` is the shared helper for cookie-verified
unauthenticated callers);
[supabase/functions/complete-game/index.ts:84](/supabase/functions/complete-game/index.ts),
[supabase/functions/issue-session/index.ts:130](/supabase/functions/issue-session/index.ts),
[supabase/functions/get-redemption-status/index.ts:165](/supabase/functions/get-redemption-status/index.ts)
(three existing instances of the cookie-verified-unauthenticated
pattern);
[useOrganizerForEvent.ts:67-72](/shared/auth/useOrganizerForEvent.ts)
(admin's slug-resolution read against `game_event_drafts` —
2-paths-needed source);
[authorizeRedemptions.ts:31-35](/apps/web/src/redemptions/authorizeRedemptions.ts)
(redemptions' slug-resolution read against `game_events` —
1-path-needed source);
[authorizeRedeem.ts:31-35](/apps/web/src/redeem/authorizeRedeem.ts)
(redeem's slug-resolution read against `game_events` —
0-paths-needed source).

### B. Write-side server response → 403 with structured error body

**Mechanical: the alternatives are wrong on different axes.**
405 ("Method Not Allowed") inverts the semantic — the resource
DOES support writes, just not for *this* caller. 400 misclassifies
the failure (the request is well-formed; what's wrong is the
caller's authorization context). 200 lies. 403 with a structured
body (`{error: "demo_mode_read_only", ...}`) lets the UI switch
on the error code rather than parse a message string. Working
error code; final spelling owned by phase 3.2+ when it touches
the five mutation Edge Functions.

**Verified by:** HTTP semantics; the UI-switch-on-code
requirement implies a structured body, not just a status; the
five mutation-function call sites where the short-circuit branch
sits beside the existing manual auth gate
([`save-draft/index.ts:351`](/supabase/functions/save-draft/index.ts),
[`publish-draft/index.ts:173`](/supabase/functions/publish-draft/index.ts),
[`unpublish-event/index.ts:124`](/supabase/functions/unpublish-event/index.ts),
[`redeem-entitlement/index.ts:178`](/supabase/functions/redeem-entitlement/index.ts),
[`reverse-entitlement-redemption/index.ts:204`](/supabase/functions/reverse-entitlement-redemption/index.ts)).

### C. Write-side client UX → contract bound, shape deferred to phase 3.2+

**Rule application.** AGENTS.md "Bans on surface require
rendering the consequence" binds: deciding disabled-with-tooltip
vs. hidden vs. click-and-error from doc-only context risks
shipping a banned-surface state that doesn't survive contact
with the rendered components (a disabled state may not exist on
every control; hiding may break layout; click-and-error may
produce surprise). The contract — "UI must communicate the
read-only state on mutation controls; the visitor never sees a
mutation control that appears actionable but silently does
nothing" — is bindable now. The shape is owned by 3.2+
plan-drafting against rendered components.

**Verified by:** AGENTS.md "Bans on surface require rendering
the consequence" (Phase Planning Sessions section).

### D. Decision-record location → plan doc canonical, milestone doc points to it

**Rule application.** AGENTS.md "Scoping owns / plan owns"
assigns durable per-phase content to the plan; AGENTS.md
"anti-pattern: planning artifacts that only cite each other"
plus the M3-phase-3.1-precedent ~4,300-line trap warn against
both-doc duplication. The milestone doc's existing Cross-Phase
Decisions structure ("Settled by default" + "Deferred to
phase-time") accommodates a peer "Settled at phase-time"
subsection that points to the plan doc as canonical without
restructuring. Future doc-only phases that settle deferred
milestone-doc decisions follow the same pattern.

**Verified by:** AGENTS.md "Scoping owns / plan owns" (Phase
Planning Sessions section); AGENTS.md "anti-pattern: planning
artifacts that only cite each other";
[m3-demo-mode-auth-bypass.md:347-521](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(Cross-Phase Decisions section as it stood at scoping read
time — the section the new "Settled at phase-time" subsection
joins).

### E. 3.2+ phase split → defer to 3.2 plan-drafting branch test

**Rule application + threshold-counting.** AGENTS.md "PR-count
predictions need a branch test" requires re-deriving against
actually-merged code. The branch-test count comes back right at
the threshold (8 subsystems if pgTAP and the M2 closer revision
count separately — past >5; ~300–400 substantive LOC — at the
>300 boundary), which is exactly the condition the rule exists
to defer until the implementer can count real LOC. The
milestone doc's Phase Status note already authorizes the 3.2
row to grow; the working estimate stays at 1 PR with a 2-PR
fallback along the read-side / write-side seam pre-named so
3.2 doesn't relitigate the seam shape.

**Verified by:** AGENTS.md "PR-count predictions need a branch
test" (Phase Planning Sessions section); AGENTS.md "PR-count
predictions are not contracts" (Milestone Planning Sessions
section);
[m3-demo-mode-auth-bypass.md:99-165](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(Phase Status note — the milestone session already authorized
the row to grow at 3.1's plan-drafting time).

### F. PR shape for 3.1 itself → single doc-only PR

**Mechanical: no real seam.** Doc-only decision phases produce
the scoping doc and the plan doc together because the plan doc
IS the implementing artifact — there is no separate
implementation step for the scoping work to precede. Splitting
into 3.1.1 (scoping) and 3.1.2 (plan + milestone edits +
open-questions edit) buys nothing and adds a review round.
Scoping doc still deletes in batch with sibling scoping docs
at the M3-terminal PR per AGENTS.md, NOT in this PR.

**Verified by:** AGENTS.md "Phase Planning Sessions → Output
set" (scoping deletes in batch at milestone-terminal PR; the
rule does not exempt doc-only phases from producing a scoping
doc, but it also does not require them to ship in separate
PRs from their plan).

## Reality-check findings to land in the same PR

These are NOT decisions phase 3.1 was opened to resolve. They
are findings from the reality-check pass that surfaced gaps in
the milestone doc's load-bearing claims. AGENTS.md
"Plan-to-PR Completion Gate" requires the corrections in the
same PR that surfaces them, which makes 3.1's PR the natural
landing site.

### Correction (a): unauthenticated-Edge-Function-precedent claim refuted

The milestone-doc claim "the absence of any existing precedent
for unauthenticated Edge Function mediation in
`supabase/functions/`" (under Cross-Phase Decisions → Deferred
to phase-time → "Demo-mode data-access semantics," reality-check
inputs paragraph as it stood at scoping read time) is refuted.
All nine Edge Functions run with `verify_jwt = false` per
[`supabase/config.toml:1-29`](/supabase/config.toml); three of
them (`complete-game`, `issue-session`,
`get-redemption-status`) accept callers without a Supabase user
JWT via the shared `readVerifiedSession` helper at
[`_shared/session-cookie.ts:136`](/supabase/functions/_shared/session-cookie.ts).
The four authoring functions and two redemption-operator
functions require authenticated callers via the
`authenticateEventOrganizerOrAdmin` /
`authenticateRedemptionOperator` helpers and are the
exception, not the platform rule. Replacement framing absorbs
into the plan doc Contracts item 8 and the milestone-doc
edit it binds.

### Correction (b): read-mediation surface count refined

The milestone-doc Goal-section framing that "the data each
surface fetches (admin's `loadDraftEvent` against
`game_event_drafts`, redemptions' list query against
`game_entitlements`) is RLS-gated and currently denies anonymous
reads" — and the implicit framing throughout that all three
bypassed surfaces need read mediation — is refined to:

- **Admin** — 2 read paths need mediation. The slug → event-id
  resolution lookup at
  [`useOrganizerForEvent.ts:67-72`](/shared/auth/useOrganizerForEvent.ts)
  reads `game_event_drafts` (anon SELECT denied); the page's
  subsequent `loadDraftEventSummary(eventId)` call reads
  `game_event_drafts` again.
- **Redemptions** — 1 read path needs mediation. The
  slug → event-id resolution at
  [`authorizeRedemptions.ts:31-35`](/apps/web/src/redemptions/authorizeRedemptions.ts)
  reads `game_events` (anon-readable for published events);
  `fetchRedemptionSlices(eventId)` reads `game_entitlements`
  (anon SELECT denied) and needs the shim.
- **Redeem** — 0 read paths need mediation. The mount-time
  effect at
  [`EventRedeemPage.tsx:129-178`](/apps/web/src/pages/EventRedeemPage.tsx)
  calls `authorizeRedeem(slug)`, which reads `game_events`
  only (anon-readable for published events) and calls the
  `is_agent_for_event` / `is_root_admin` RPCs (which return
  `false` for anon — the bypass branch in 3.2+ skips that
  response without needing a mediated read).

Replacement framing absorbs into the plan doc Contracts item 9
and the milestone-doc Goal-section edit it binds.

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they
require reading docs against actually-merged code at
plan-time, not against the scoping snapshot:

- **Sentence-level milestone-doc edits.** The plan doc's
  Files-to-touch contract for the milestone doc names the
  exact paragraphs to edit (Cross-Phase Decisions
  "Deferred to phase-time" entry that gets removed or
  back-pointed; the new "Settled at phase-time" subsection
  shape; the two correctness-fix targets; the Phase Status
  table 3.1 row update). Plan-drafting greps the milestone
  doc against the on-disk content because line numbers
  drift; the scoping snapshot read on 2026-05-03 found the
  Cross-Phase Decisions section starting around
  [m3-demo-mode-auth-bypass.md:347](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
  and the relevant entry around lines 418–446.
- **`docs/open-questions.md` removal contract.** Plan-drafting
  re-reads
  [`docs/open-questions.md`](/docs/open-questions.md) to
  confirm the section header and content match what
  scoping read on 2026-05-03 (lines 111–134 — the entire
  "Demo Expansion Epic — M3 Demo-Mode Data Access"
  section, including the
  "Demo-mode data-access semantics for test-event slugs"
  subsection beneath it).
- **Self-Review Audit set against
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md).**
  Plan-drafting walks the catalog against the actual 3.1
  diff surface. Likely-relevant audits: none of the SQL
  audits, none of the Edge Function audits, possibly the
  doc-currency audit (if one exists). The audit set may be
  empty or near-empty; that is allowed and named in the
  plan if so.
- **Validation Gate command list.** 3.1 ships only doc
  edits; the validation surface is doc-build / lint-style
  rather than test-suite. Plan-drafting reads
  `package.json` `scripts` per AGENTS.md "Prefer existing
  wrapper scripts" to identify the doc-shaped checks
  (markdown lint, link-check, etc., if they exist).
- **Commit boundaries.** Likely two commits: (1) scoping
  doc + plan doc, (2) milestone-doc edits +
  open-questions.md edit. Plan-drafting finalizes against
  the actual edit shape.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns /
plan owns":

- Status, Context preamble (per AGENTS.md plain-language
  opening rule), Goal
- Cross-Cutting Invariants — **references the milestone
  doc's Cross-Phase Invariants** rather than restating;
  only names per-phase additions if any. For this
  doc-only phase, the per-phase additions are the
  option-preservation invariants binding 3.2+ (the
  read-shim's data source must allow a switch to sandbox
  without restructuring; the write-side 403 short-circuits
  must allow replacement with real write paths without
  restructuring the surrounding auth flow).
- Naming
- Contracts — names the canonical decision record
  contract (decision 1's outcome from above; the cascade
  outcomes A through F as the surrounding decisions; the
  two corrections as their own contract items); the
  milestone-doc edit contract; the
  `docs/open-questions.md` removal contract.
- Files to touch (estimate-labeled per AGENTS.md "Plan
  content is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate
- Self-Review Audits
- Documentation Currency PR Gate — **references the
  milestone doc's Documentation Currency map** for the
  full M3-set list; names this PR as the satisfier for the
  open-questions.md closure and the milestone-doc Phase
  Status row update only.
- Out Of Scope (final)
- Risk Register — **references the milestone doc's
  Cross-Phase Risks** for milestone-level risks; names
  3.1-implementation-level risks here (the load-bearing
  one being "the decision record gets misread by 3.2+
  plan-drafting").
- Backlog Impact — **references the milestone doc's
  Backlog Impact**; names 3.1-specific backlog impact
  here (the second-iteration-trigger items added under
  Backlog).

The duplication-reduction discipline above is intentional:
the plan binds milestone-level content by reference, not
by restatement. This is exactly the M3-phase-3.1-precedent
trap AGENTS.md "Scoping owns / plan owns" calls out
(scoping + plan together ran ~4,300 lines because both
docs carried the full coverage). 3.1's plan is doc-only;
the durable content is the decision record contract, not
restated invariants or risks.

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not
from the scoping snapshot, per AGENTS.md "Reality-check
gate between scoping and plan":

- **`supabase/config.toml` shape unchanged since scoping.**
  The unauthenticated-Edge-Function-precedent claim
  fell-out item A relies on assumes all nine functions still
  have `verify_jwt = false` and that `complete-game`,
  `issue-session`, and `get-redemption-status` still use
  `readVerifiedSession`.
- **`useOrganizerForEvent.ts` still resolves slug via
  `game_event_drafts`.** Fell-out item A's surface refinement
  (admin needs 2 read paths mediated) depends on the
  current resolver shape at lines 67–72. If the hook has
  been refactored to read `game_events` instead, the
  refinement collapses.
- **`authorizeRedeem.ts` and `authorizeRedemptions.ts`
  still resolve via `game_events`.** Same falsifier:
  redeem's "0 read paths" and redemptions' "1 read path"
  framings depend on the current `game_events`-anchored
  resolution shape at lines 31–35 in each.
- **The five mutation Edge Functions still call their
  manual auth helpers at the cited line numbers.**
  Fell-out item B's "where the allowlist short-circuit
  branch will sit" framing depends on the current call
  sites.
- **The milestone doc's Cross-Phase Decisions section
  paragraph locations.** The Open-decisions handoff above
  lists scoping-read line numbers; plan-drafting greps for
  the actual on-disk positions because line numbers drift.
- **The `docs/open-questions.md` section content unchanged
  since scoping.** Plan-drafting confirms lines 111–134
  still contain the "Demo Expansion Epic — M3 Demo-Mode
  Data Access" section before binding the removal
  contract.

## Process precedent this scoping doc sets

The two-tier framing above is the load-bearing precedent
this scoping doc sets, beyond the headline decision
record. Future doc-only decision phases inherit the
discipline: triage the milestone-named decisions upfront,
distinguish genuinely-open-and-deliberation-worthy from
falls-out-of-rules-or-cascades, and use the compact form
on the latter. The reverse-trap that motivated this
restructure (scoping and plan inflated to ~4,300 lines on
3.1's earlier drafts because every decision got the full
options/pros/cons treatment regardless of whether it was
genuinely open) generalizes: structure-as-deliberation on
items where the answer was determined adds review burden
without adding durable value.

The compact form's load-bearing record is **outcome + what
made it fall out + `Verified by:` citation**. The compact
form is NOT a license to skip the citation — every
fell-out item still names what code or AGENTS.md rule
made the answer obvious, because that is what makes the
record reproducible to a future reader.

If a future doc-only decision phase finds that all of its
milestone-named decisions are genuinely open (not just one
of them), full deliberation structure on each is correct.
The discipline is "structure follows actual deliberation
shape," not "always use the compact form."

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; Phase Status table 3.1 row at
  lines 99–112; Cross-Phase Decisions section at
  lines 347–521 (the section 3.1's PR edits).
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic; M3 paragraph at lines 229–254;
  "Open Questions Newly Opened" → "Demo-mode data-access
  semantics" entry at lines 156–170 (the question 3.1
  resolves); the M4 paragraph at lines 256–264
  (essentially Option B's shape — the implicit roadmap
  reference decision 1 walks).
- [`scoping/m1-phase-1-1.md`](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md) —
  in-repo scoping-doc precedent; this doc keeps its
  outer-section structure (Status, Phase summary, Open
  decisions to make at plan-drafting, Plan structure
  handoff, Reality-check inputs, Related Docs) and
  diverges only in the decisions-section structure to
  reflect the two-tier triage.
- [`docs/open-questions.md`](/docs/open-questions.md) —
  carries the "Demo Expansion Epic — M3 Demo-Mode Data
  Access" entry 3.1's PR removes (lines 111–134 at
  scoping-read time).
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions,
  "Defer rather than over-resolve," "Scoping owns / plan
  owns," "PR-count predictions need a branch test,"
  "Plan-to-PR Completion Gate," "Bans on surface require
  rendering the consequence," "anti-pattern: planning
  artifacts that only cite each other."
