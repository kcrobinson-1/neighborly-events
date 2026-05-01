# M2 Phase 2.5.3 — Doc Cleanup, M2 Closure, And Scoping Batch Deletion

## Status

Landed.

Sub-phase of M2 phase 2.5 — see
[`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) (umbrella) for the
phase-level context, sequencing rationale, cross-sub-phase invariants,
phase-level Out of Scope, and cross-sub-phase risks.

**Position in sequence.** Third and final sub-phase of 2.5. Cannot
draft or merge until 2.5.2 has flipped to `Landed` (post-deploy
deployed-origin verification captured) — see the umbrella's "2.5.2
reverted but 2.5.3 already merged" risk
([`m2-phase-2-5-plan.md:469-482`](./m2-phase-2-5-plan.md#L469)).
Strict-serial sequencing is enforced at PR-open time: the implementer
confirms 2.5.2's plan Status reads `Landed` (not the intermediate
`In progress pending deployed-origin verification`) before opening
this PR. As of plan-drafting,
[`m2-phase-2-5-2-plan.md:5`](./m2-phase-2-5-2-plan.md#L5) reads
`Landed.` per `git log` commits `b27daf9` (Status flip) and `c377a9d`
(verification-procedure documentation), so the gate passes.

**This is M2's terminal sub-phase.** Per the umbrella
([`m2-phase-2-5-plan.md:99-104`](./m2-phase-2-5-plan.md#L99)) and the
milestone doc
([`m2-admin-restructuring.md:50-53`](./m2-admin-restructuring.md#L50)),
2.5.3's PR carries the M2-row flip in
[`event-platform-epic.md:19`](../../event-platform-epic.md#L19) and the
top-level Status flip in
[`m2-admin-restructuring.md:5`](./m2-admin-restructuring.md#L5).

**Single PR.** Branch-test sketch — durable docs: 5 modifies
([`docs/architecture.md`](../../../architecture.md),
[`docs/dev.md`](../../../dev.md), [`docs/product.md`](../../../product.md),
[`README.md`](../../../../README.md), [`docs/open-questions.md`](../../../open-questions.md));
backlog: 1 modify ([`docs/backlog.md`](../../../backlog.md)); plans: 4
modifies ([`docs/plans/event-platform-epic.md`](../../event-platform-epic.md),
[`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md),
[`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md), this
file); link-rewrites: ~9 plan files touched to rewrite scoping-doc
links per the umbrella's link-rewrite contract; deletes: 5 scoping
doc files. ~20 files total. Single subsystem (durable docs +
plan/scoping cleanup); no code, no test, no config, no production
behavior change. The single load-bearing edit family is the
link-rewrite contract — every other change is mechanical text update
or status flip.

## Context

This sub-phase carries the doc-currency tail of the 2.5 phase and
closes M2. After 2.5.2 retired the apps/web bare-path operator
carve-outs in production, every doc surface that still describes
operator routes by their pre-rename URL or builder name is drift —
the architecture route inventory, dev.md's routes builder list,
product.md's capability bullet, the README's apps/web ownership
prose, and architecture.md's auth-flow narrative all still name
`/event/:slug/redeem` and `/event/:slug/redemptions` (pre-2.5.1
URLs) or `eventRedeem(slug)` / `eventRedemptions(slug)` /
`matchEventRedeemPath` / `matchEventRedemptionsPath` (pre-2.5.1
builder/matcher names). 2.5.1's load-bearing module change kept its
doc surface to
[`shared/urls/README.md`](../../../../shared/urls/README.md); 2.5.2's
load-bearing routing change kept its doc surface to URL-ownership
shape (architecture topology table, dev rule walkthrough,
operations dashboard prose). The umbrella's "Doc currency split
across sub-phases" invariant
([`m2-phase-2-5-plan.md:343-354`](./m2-phase-2-5-plan.md#L343))
explicitly assigned page-behavior + API-shape doc surfaces to this
sub-phase so the cutover and rename PRs stayed reviewer-focused on
their load-bearing edits.

It's the right moment for this cleanup because the entire 2.5 URL
contract progression is now durable in production: the apps/web
dispatcher, the shared URL contract, the magic-link `next=` flow,
the production Vercel rule table, and the local auth-e2e fixture
all describe the new `/event/:slug/game/redeem` and
`/event/:slug/game/redemptions` URLs in code. Holding the doc
drift any longer means every contributor reading the platform's
narrative still encounters the old URL strings and the old
builder names, which silently lies about the as-shipped state.
M2 closure also depends on this PR — 2.5.3 carries the epic's M2
row flip, the milestone doc's Status flip, the open-question
close, the backlog unblock, and the M2 scoping batch deletion.

What this sub-phase touches:

- **Page-behavior + API-shape docs** — architecture route
  inventory entries for `EventRedeemPage` / `EventRedemptionsPage`,
  architecture auth-flow narrative URL strings,
  architecture runtime-flow URL strings, the dev.md routes builder
  list, product.md's operator-route capability bullet, and the
  README's apps/web ownership prose + capability bullets.
- **M2 closure surface** — the epic's M2 row,
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)'s
  top-level Status + Phase Status table 2.5 row,
  [`docs/open-questions.md`](../../../open-questions.md)'s post-MVP
  authoring-ownership entry, and
  [`docs/backlog.md`](../../../backlog.md)'s organizer-managed agent
  assignment entry.
- **M2 scoping batch deletion + link-rewrite** — the five M2
  scoping docs delete; every surviving link to them across the
  M2 plan-doc family rewrites to a durable target per the
  umbrella's link-rewrite contract.
- **Plan Status flips** — this plan's Status flips to `Landed` in
  the implementing PR; the umbrella's Status flips to `Landed`;
  the milestone doc's top-level Status flips to `Landed`; the
  epic's M2 row flips to `Landed`.

What this sub-phase doesn't touch: any code, any test, any
configuration, any Edge Function, any migration, any
[`shared/urls/`](../../../../shared/urls) module file, any apps/web or
apps/site source, any production-smoke fixture,
[`shared/urls/README.md`](../../../../shared/urls/README.md) (already
updated in 2.5.1 per the umbrella's "Doc currency split" — the
routes/matcher list there reads the post-rename names verbatim
per `git log` commit `c5e2994`), or
[`docs/operations.md`](../../../operations.md) (the Supabase Auth
dashboard prose updated in 2.5.2). No production behavior
change beyond the already-shipped 2.5.1 + 2.5.2 cutover.

## Goal

Land the doc-currency edits the umbrella's "Doc currency split"
invariant assigned to this sub-phase, close the open-question and
unblock the backlog entry per the epic's "Open Questions Resolved
By This Epic"
([`event-platform-epic.md:166-172`](../../event-platform-epic.md#L166)),
delete the five M2 scoping docs in batch (with the link-rewrite
contract from
[`m2-phase-2-5-plan.md:579-648`](./m2-phase-2-5-plan.md#L579)
satisfied for every surviving link), flip the epic's M2 row to
`Landed`, flip the milestone doc's top-level Status + 2.5 Phase
Status row to `Landed` (also correcting the table-row drift on
2.1 where the current `Proposed` value contradicts
[`m2-phase-2-1-plan.md:5`](./m2-phase-2-1-plan.md#L5)'s `Landed.`),
flip the umbrella's Status to `Landed`, and flip this plan's
Status to `Landed` per the regular Plan-to-PR Completion Gate
(no production-smoke gate, no two-phase Status flip — this
sub-phase ships entirely doc-only against an already-verified
cutover, per
[`m2-phase-2-5-plan.md:82-87`](./m2-phase-2-5-plan.md#L82)).

No production behavior change. No code change. No test change.
Trust boundary unchanged across the entire phase.

## Cross-Cutting Invariants Touched

These are sub-phase-local. See the umbrella for cross-sub-phase
rules.

- **No code or test edits.** The diff is purely doc-currency,
  status-flip, and scoping-batch-delete content. Any code-touching
  or test-touching change is out of scope and indicates a missed
  edit elsewhere — escalate before continuing rather than
  expanding scope.
- **Link-rewrite contract is load-bearing.** Per
  [`m2-phase-2-5-plan.md:579-648`](./m2-phase-2-5-plan.md#L579),
  every surviving link to a scoping doc must rewrite to a durable
  target before the scoping docs delete. The rewrite commit
  precedes the deletion commit so every intermediate tip leaves no
  broken link. Verified by repo-wide grep both before and after
  the rewrite.
- **Status-flip ordering is observable.** The four Status surfaces
  flip in sequence at the same commit boundary (epic M2 row,
  milestone-doc top-level, milestone-doc 2.5 row, umbrella plan,
  this plan). 2.1 row-drift correction
  ([`m2-admin-restructuring.md:43`](./m2-admin-restructuring.md#L43)
  reads `Proposed` against
  [`m2-phase-2-1-plan.md:5`](./m2-phase-2-1-plan.md#L5)'s
  `Landed.`) lands in the same commit as the 2.5 flip — the
  milestone doc's Phase Status table is wholly current at the end
  of the commit, not partially current.
- **Doc-currency completeness gate.** A repo-wide grep for bare-path
  operator URL strings (`/event/.*/redeem`, `/event/.*/redemptions`)
  and for the deprecated builder/matcher names (`eventRedeem`,
  `eventRedemptions`, `matchEventRedeemPath`,
  `matchEventRedemptionsPath`) runs both before this sub-phase
  starts (baseline; expected hits are this sub-phase's edit
  targets) and after the doc edits commit (final; expected hits
  are zero outside historical archives, plan-history references,
  and PR/commit message references that legitimately preserve
  pre-rename text). Surviving hits in durable docs are misses;
  surviving hits in plans/scoping/archives are intentional history.

## Naming

No new files. No symbol renames in this sub-phase (the rename
surface settled in 2.5.1; no code edits in 2.5.3).

## Contracts

Each contract carries an inline "Verified by:" reference per
AGENTS.md.

**[`docs/architecture.md`](../../../architecture.md) (modify, page-behavior + auth-flow + runtime-flow surfaces).**
Three surfaces update in this sub-phase per the umbrella's
"Documentation Currency" subsection
([`m2-phase-2-5-plan.md:557-571`](./m2-phase-2-5-plan.md#L557)):

- **Route inventory entries** at lines 92–106. The
  `EventRedeemPage` entry's URL string updates from
  `/event/:slug/redeem` to `/event/:slug/game/redeem`; the
  `EventRedemptionsPage` entry's URL string updates from
  `/event/:slug/redemptions` to `/event/:slug/game/redemptions`.
  Page-behavior prose stays verbatim — the entries describe what
  the pages do, not where they live, and only the URL line edits.
- **`shared/urls/` module description** at lines 261–279. The
  `routes` builder list and the matcher list update from the
  pre-rename names (`eventRedeem(slug)`, `eventRedemptions(slug)`,
  `matchEventRedeemPath`, `matchEventRedemptionsPath`) to the
  post-rename names (`gameRedeem(slug)`, `gameRedemptions(slug)`,
  `matchGameRedeemPath`, `matchGameRedemptionsPath`). The
  surrounding prose about open-redirect defense and browser-only
  constraints stays verbatim.
- **Direct-entry operator route narratives** at lines 664–738.
  The `/event/:slug/redeem` headings and prose URL strings update
  to `/event/:slug/game/redeem`; the `/event/:slug/redemptions`
  parallel updates to `/event/:slug/game/redemptions`. Auth-flow
  references at lines 672 (`next=/event/:slug/redeem`) and 698–699
  (`/event/:slug/redeem` + `next=/event/:slug/redemptions`) update
  to the post-rename URLs. Behavior prose stays verbatim.

Verified by:
[`docs/architecture.md:92-97`](../../../architecture.md#L92),
[`docs/architecture.md:266-270`](../../../architecture.md#L266),
[`docs/architecture.md:664-738`](../../../architecture.md#L664), and
[`shared/urls/routes.ts:35-38,133,171`](../../../../shared/urls/routes.ts#L35)
(authoritative post-rename names per 2.5.1's `git log` commit
`ac3b4ee`).

**[`docs/dev.md`](../../../dev.md) (modify, routes-builder-list surface).**
Single surface updates in this sub-phase: the routes builder
enumeration at lines 208–213. The list updates from `home`,
`admin`, `adminEvent(id)`, `eventLanding(slug)`,
`eventAdmin(slug)`, `game(slug)`, `eventRedeem(slug)`,
`eventRedemptions(slug)`, `authCallback` to `home`, `admin`,
`gamePrefix`, `eventLanding(slug)`, `eventAdmin(slug)`,
`game(slug)`, `gameRedeem(slug)`, `gameRedemptions(slug)`,
`authCallback`, mirroring
[`shared/urls/routes.ts:25-40`](../../../../shared/urls/routes.ts#L25).
The drop of `adminEvent(id)` corrects pre-existing drift —
[`shared/urls/routes.ts`](../../../../shared/urls/routes.ts) no longer
exports `adminEvent` per 2.4.3's deletion (`git log` shows the
removal landed in commit `bd8e2f4` for PR #126), and the dev.md
list went stale at that point. Bundling this correction with the
2.5 rename edit is touch-once-fix-once: the line being edited is
the same line that carries the stale `adminEvent(id)` reference;
splitting would require revisiting the same line in a follow-up
PR for no incremental review value. Verified by:
[`docs/dev.md:208-213`](../../../dev.md#L208) and
[`shared/urls/routes.ts:25-40`](../../../../shared/urls/routes.ts#L25).

**[`docs/product.md`](../../../product.md) (modify, capability-bullet surface).**
Single bullet updates: the operator-route capability bullet at
line 47, currently
`an authenticated agent-facing redeem route at `/event/:slug/redeem` for fast booth-side code entry, and an authenticated organizer-facing monitoring + reversal route at `/event/:slug/redemptions` for dispute handling`,
updates to use `/event/:slug/game/redeem` and
`/event/:slug/game/redemptions`. Behavior prose ("for fast
booth-side code entry," "for dispute handling," "list, filter,
search, reverse with optional reason," "both direct-URL only
until role seeding") stays verbatim. Verified by:
[`docs/product.md:47`](../../../product.md#L47).

**[`README.md`](../../../../README.md) (modify, capability-bullets + Repo Shape surfaces).**
Two surfaces update:

- **Capability bullets** at lines 32–40. The redeem-route bullet
  ("an authenticated direct-entry redeem route at
  `/event/:slug/redeem`") updates to `/event/:slug/game/redeem`;
  the monitoring-route bullet ("an authenticated direct-entry
  monitoring + reversal route at `/event/:slug/redemptions`")
  updates to `/event/:slug/game/redemptions`. Surrounding prose
  stays verbatim.
- **Repo Shape apps/web ownership prose** at lines 63–67. The
  current text reads `the event-scoped /event/:slug/game and /event/:slug/admin namespaces, and the transitional bare-path operator routes /event/:slug/redeem and /event/:slug/redemptions.`.
  The "and the transitional bare-path operator routes …"
  appendage deletes — apps/web now owns purely the two terminal
  namespaces (`/event/:slug/game/*` and `/event/:slug/admin`),
  matching the umbrella's "URL contract progression" invariant
  ([`m2-phase-2-5-plan.md:328-342`](./m2-phase-2-5-plan.md#L328)).

Verified by:
[`README.md:32-40`](../../../../README.md#L32) and
[`README.md:63-67`](../../../../README.md#L63).

**[`docs/open-questions.md`](../../../open-questions.md) (modify, close authoring-ownership entry).**
The "Post-MVP authoring ownership and permission management"
section at lines 29–54 closes per the epic's "Open Questions
Resolved By This Epic"
([`event-platform-epic.md:166-172`](../../event-platform-epic.md#L166)).
The resolution: M2's 2.1 RLS broadening + 2.1.2 Edge Function
broadening landed full organizer write capability for
event-scoped data through PostgREST + Edge Functions. The
section heading + body delete (the working-assumptions list
no longer applies — organizers can now manage their own event
content). The "Authoring And Publishing" parent section retains
its heading because future questions can land beneath it; if no
questions remain, the parent section also reads "No currently
open questions in this section under the current tracking rule"
matching the existing pattern at lines 25–27, 58–61, 65–68, and
72–75. Verified by:
[`docs/open-questions.md:29-54`](../../../open-questions.md#L29) and
[`docs/plans/event-platform-epic.md:166-172`](../../event-platform-epic.md#L166).

**[`docs/backlog.md`](../../../backlog.md) (modify, unblock organizer-agent-assignment entry).**
The "Organizer-managed agent assignment" entry at lines 140–144
unblocks. The current text reads
`Blocked on the broader authoring ownership decision.`; that
sentence updates to record the unblock per the umbrella's
"Backlog Impact" subsection
([`m2-phase-2-5-plan.md:521-532`](./m2-phase-2-5-plan.md#L521))
and the milestone doc's "Backlog Impact" subsection
([`m2-admin-restructuring.md:680-683`](./m2-admin-restructuring.md#L680)).
Replacement reads:
`Unblocked by M2's organizer RLS broadening (phases 2.1 + 2.1.1 + 2.1.2). Implementation is a focused post-epic follow-up.`
Detail link to `docs/open-questions.md` removes (the section
closes); replacement detail link points to
[`docs/plans/event-platform-epic.md`](./plans/event-platform-epic.md)
"Open Questions Resolved By This Epic" or stays absent. Adjacent
backlog entries unchanged. The companion
`Post-MVP authoring ownership and permission model` decision
entry at lines 131–138 also closes — its detail link to
`docs/open-questions.md` no longer resolves once the section
deletes. Resolution: the decision entry checks off (since the
decision is now made and recorded in the epic) and the entry
text updates to record the resolution outcome ("self-serve
direction confirmed; organizers have full event-scoped write
access via M2's RLS broadening"), with the detail link pointing
to [`docs/plans/event-platform-epic.md`](./plans/event-platform-epic.md)
"Open Questions Resolved By This Epic." Verified by:
[`docs/backlog.md:131-144`](../../../backlog.md#L131) and
[`docs/plans/event-platform-epic.md:166-172`](../../event-platform-epic.md#L166).

**[`docs/plans/event-platform-epic.md`](../../event-platform-epic.md) (modify, M2 row flip).**
The milestone status table row for M2 at line 19 flips from
`Proposed` to `Landed`. The other rows (M0 Landed, M1 Landed, M3
Proposed, M4 Proposed) stay verbatim. The top-level Status at
line 5 (`Proposed.`) stays `Proposed.` — that flip is owned by
M4's terminal PR per
[`event-platform-epic.md:23-24`](../../event-platform-epic.md#L23)
("When all five rows show `Landed`, the top-level Status above
flips from `Proposed` to `Landed` in the same PR that lands M4").
Verified by:
[`docs/plans/event-platform-epic.md:5,15-24`](../../event-platform-epic.md#L5).

**[`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md) (modify, milestone-doc closure).**
Three surfaces update:

- **Top-level Status** at line 5: `Proposed.` flips to `Landed.`
  per the umbrella's terminal-flip rule
  ([`m2-phase-2-5-plan.md:99-104`](./m2-phase-2-5-plan.md#L99)).
- **Phase Status table row 2.5** at line 47: `Proposed` flips to
  `Landed`, PR column gains the link to this PR's GitHub URL.
- **Phase Status table row 2.1** at line 43: `Proposed` flips to
  `Landed` (drift correction;
  [`m2-phase-2-1-plan.md:5`](./m2-phase-2-1-plan.md#L5) reads
  `Landed.` per `git log` commit `b16a432` from PR #112). The
  PR column gains the corresponding PR link
  ([#112](https://github.com/kcrobinson-1/neighborly-events/pull/112)
  per [`m2-phase-2-1-plan.md:11`](./m2-phase-2-1-plan.md#L11)).
  The drift correction is included here because the milestone
  doc's Phase Status table is the surface 2.5.3 lands the M2
  closure flip on; leaving 2.1 row stale alongside the 2.5 flip
  would publish a contradictory final state. Touch-once-fix-once:
  same surface, same review pass.

The Phase Status preamble paragraph at line 49 ("Each row updates
as the phase's plan drafts and as its PR merges") stays verbatim.
The transient-scoping-docs note at lines 55–60 updates to record
that the batch deletion has happened in this sub-phase — see the
"Documentation Currency" surface below for the parallel umbrella
update. Verified by:
[`docs/plans/m2-admin-restructuring.md:5,43,47,55-60`](./m2-admin-restructuring.md#L5)
and [`docs/plans/m2-phase-2-1-plan.md:5,11`](./m2-phase-2-1-plan.md#L5).

**[`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) (modify, umbrella closure + scoping-batch-delete record).**
Three surfaces update:

- **Status block** at lines 8–11: the sub-phase Status table row
  for 2.5.3 updates to `Landed` with the PR link; the umbrella's
  preamble Status (`Proposed (umbrella).`) flips to
  `Landed (umbrella).` because all three sub-phases now show
  `Landed`.
- **Documentation Currency — Scoping doc batch deletion** at
  lines 579–648: the link-rewrite contract section updates from
  forward-looking ("must be rewritten") to past-tense
  ("rewrote in this PR"); the explicit mid-document references to
  the to-be-deleted scoping docs at lines 124–125, 583, 643, and
  656 either remove (if the scoping doc was the sole referent) or
  rewrite to durable equivalents (typically the milestone doc's
  Cross-Phase Decisions section or the appropriate sibling plan
  doc). Specific rewrite targets enumerated in the link-rewrite
  inventory section below.
- **Related Docs** at lines 656–663: the scoping/m2-phase-2-5.md
  entry rewrites to a plain-text path reference with explanatory
  prose per the link-rewrite contract option 3.

The umbrella's strict-serial "2.5.3 cannot draft or merge until
2.5.2 is `Landed`" gate has been satisfied (per Status above);
the umbrella's prose describing that gate stays verbatim because
it documents the rule that governed 2.5.3's drafting, not a
forward-looking constraint. Verified by:
[`docs/plans/m2-phase-2-5-plan.md:8-11`](./m2-phase-2-5-plan.md#L8),
[`docs/plans/m2-phase-2-5-plan.md:579-648`](./m2-phase-2-5-plan.md#L579),
[`docs/plans/m2-phase-2-5-plan.md:656-663`](./m2-phase-2-5-plan.md#L656).

**M2 Scoping doc deletions.** The five scoping docs delete in
batch per the milestone doc's batch-deletion rule
([`m2-admin-restructuring.md:55-60`](./m2-admin-restructuring.md#L55)):

- `docs/plans/scoping/m2-phase-2-1.md`
- `docs/plans/scoping/m2-phase-2-2.md`
- `docs/plans/scoping/m2-phase-2-3.md`
- `docs/plans/scoping/m2-phase-2-4.md`
- `docs/plans/scoping/m2-phase-2-5.md`

The deletions land in a commit that comes **after** the
link-rewrite commit so every intermediate tip leaves no broken
link. Plain-text paths above (no clickable link) avoid creating
broken links inside this plan once the targets delete. See git
history for the pre-deletion content of any of the five.

**Link-rewrite inventory.** Per the umbrella's link-rewrite
contract
([`m2-phase-2-5-plan.md:589-648`](./m2-phase-2-5-plan.md#L589)).
**This sub-phase biases every rewrite toward option 3** (plain-text
path reference with explanatory prose) rather than walking each
link case-by-case for option 1 vs. 2 vs. 3 selection. The bias is
load-bearing: a follow-up PR archives the M2 plan-doc set
post-2.5.3 (tracked in
[`docs/backlog.md`](../../../backlog.md) under the new "Archive M2 plan
docs" entry this PR adds), and option-1 rewrites that point at
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
sections will need re-resolution when the milestone doc itself
archives. Option 3 is durable across the archive move because git
history is the rewrite target, not a path that changes. Option 3
also satisfies the umbrella's "every absorbed claim has a
surviving home before the source deletes" protective check — git
history is the surviving home.

| Source file | Hit count | Rewrite approach |
| --- | --- | --- |
| [`docs/plans/m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) | 4 | All option 3. |
| [`docs/plans/m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md) | 3 | All option 3. |
| [`docs/plans/m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md) | 3 | All option 3. |
| [`docs/plans/m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md) | 4 | All option 3. |
| [`docs/plans/m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) | 3 | All option 3. |
| [`docs/plans/m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) | 2 | Both option 3. |
| [`docs/plans/m2-phase-2-4-1-plan.md`](./m2-phase-2-4-1-plan.md) | 1 | Option 3. |
| [`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) | 5 | All option 3 except the umbrella's own Doc Currency batch-delete contract section (lines 579–648), which rewrites to past-tense prose acknowledging the deletion happened with the option-3 bias. |
| [`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md) | 2 | Phase Status notice (lines 56–57) + Related Docs (lines 696–697): rewrite to past-tense prose recording the batch deletion. |
| **Total** | **27** | (matches the umbrella's grep estimate per pre-edit `grep -rn "scoping/m2-phase-2-" --include="*.md" --exclude-dir=archive .`, excluding self-references inside this 2.5.3 plan and inside the to-be-deleted scoping docs themselves.) |

The standard option-3 replacement text (with minor variations
for context fit):
`(scoping doc deleted in M2 phase 2.5.3's batch deletion — see git history for the pre-deletion content)`.

**This plan (modify, terminal step in the implementing PR).**
Status flips from `Proposed` to `Landed` in this PR per the
regular Plan-to-PR Completion Gate (no production-smoke gate, no
two-phase Status flip — the umbrella's Status section
[`m2-phase-2-5-plan.md:82-87`](./m2-phase-2-5-plan.md#L82)
exempts 2.5.3 from the two-phase pattern because it ships
doc-only against an already-verified cutover).

## Files To Touch

### Modify (durable docs)

- [`docs/architecture.md`](../../../architecture.md) — page-behavior
  route inventory + `shared/urls/` module description + auth-flow
  narrative + runtime-flow URL strings.
- [`docs/dev.md`](../../../dev.md) — routes builder list (with stale
  `adminEvent(id)` correction).
- [`docs/product.md`](../../../product.md) — operator-route capability
  bullet URL strings.
- [`README.md`](../../../../README.md) — capability bullets +
  Repo Shape apps/web ownership prose.
- [`docs/open-questions.md`](../../../open-questions.md) — close
  Post-MVP authoring-ownership entry.
- [`docs/backlog.md`](../../../backlog.md) — close Post-MVP authoring
  ownership decision entry; unblock organizer-managed agent
  assignment entry.

### Modify (plans + closure)

- [`docs/plans/event-platform-epic.md`](../../event-platform-epic.md) —
  M2 row flip to `Landed`.
- [`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  top-level Status flip + Phase Status table row flips for 2.5
  (closure) and 2.1 (drift correction) + transient-scoping-docs
  prose update.
- [`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) —
  Status block flip (umbrella + 2.5.3 row) + Documentation
  Currency past-tense rewrite + Related Docs rewrite.
- This plan — Status flips from `Proposed` to `Landed`.

### Modify (link-rewrite contract — sibling plan files)

- [`docs/plans/m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) — 4 links rewrite.
- [`docs/plans/m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md) — 3 links rewrite.
- [`docs/plans/m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md) — 3 links rewrite.
- [`docs/plans/m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md) — 4 links rewrite.
- [`docs/plans/m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) — 3 links rewrite.
- [`docs/plans/m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) — 2 links rewrite.
- [`docs/plans/m2-phase-2-4-1-plan.md`](./m2-phase-2-4-1-plan.md) — 1 link rewrite.

### Delete (M2 scoping docs)

- `docs/plans/scoping/m2-phase-2-1.md`
- `docs/plans/scoping/m2-phase-2-2.md`
- `docs/plans/scoping/m2-phase-2-3.md`
- `docs/plans/scoping/m2-phase-2-4.md`
- `docs/plans/scoping/m2-phase-2-5.md`

### Files intentionally not touched

- Any code, test, configuration, Edge Function, migration, or
  shell script — this sub-phase is doc-only.
- [`shared/urls/`](../../../../shared/urls) (module + README) — already
  updated in 2.5.1 per umbrella's "Doc currency split."
- [`docs/operations.md`](../../../operations.md) — Supabase Auth
  dashboard prose updated in 2.5.2 per umbrella's "Doc currency
  split."
- The 2.5.1 + 2.5.2 sub-phase plans
  ([`m2-phase-2-5-1-plan.md`](./m2-phase-2-5-1-plan.md),
  [`m2-phase-2-5-2-plan.md`](./m2-phase-2-5-2-plan.md)) — already
  in `Landed` Status; no re-edit. Their internal scoping-doc
  references are inventoried in the link-rewrite table above
  only if they exist; pre-edit grep confirms whether either has
  any.
- Sibling Landed plans
  ([`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md),
  [`m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md),
  [`m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md),
  [`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md),
  [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md),
  [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md),
  [`m2-phase-2-4-1-plan.md`](./m2-phase-2-4-1-plan.md),
  [`m2-phase-2-4-2-plan.md`](./m2-phase-2-4-2-plan.md),
  [`m2-phase-2-4-3-plan.md`](./m2-phase-2-4-3-plan.md)) — Status
  blocks unchanged; only the link-rewrite contract touches their
  scoping-doc references where they exist.
- Production-smoke fixtures
  ([`scripts/testing/run-production-admin-smoke.cjs`](../../../../scripts/testing/run-production-admin-smoke.cjs)
  and the production-admin-smoke playwright config at
  [`playwright.production-admin-smoke.config.ts`](../../../../playwright.production-admin-smoke.config.ts))
  — out of scope for the entire 2.5 phase.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree, feature branch (not
   `main`). Confirm 2.5.2's plan Status reads `Landed` (not the
   intermediate `In progress pending deployed-origin verification`)
   per the umbrella's strict-serial sequencing rule. Confirm 2.1,
   2.2, 2.3, 2.4 plan Status all read `Landed` per the M2-row-flip
   precondition (per
   [`m2-phase-2-5-plan.md:484-491`](./m2-phase-2-5-plan.md#L484)
   "M2-status-flip premature" risk). Re-read the umbrella's
   "Cross-Cutting Invariants," "Documentation Currency," "Risk
   Register" "2.5.2 reverted but 2.5.3 already merged" entry, and
   "Documentation Currency — Scoping doc batch deletion"
   link-rewrite contract.
2. **Baseline validation.** Run `npm run lint` and
   `npm run build:web`. All must pass before any edit. (No
   `npm test` or `npm run test:functions` or `npm run build:site`
   strictly required because this sub-phase makes no code or test
   change, but running them is still cheap insurance against an
   unrelated regression on `main` that would otherwise surface as
   a CI failure on the PR. The Validation Gate names the minimum
   commands; the implementer can run more.)
3. **Repo-wide grep audit (baseline).** Run two greps and capture
   the output:
   - `grep -rn "/event/[^/]*/redeem\b\|/event/[^/]*/redemptions\b" --include="*.md" --include="*.ts" --include="*.tsx" --include="*.cjs" --include="*.json" --exclude-dir=node_modules --exclude-dir=archive .`
   - `grep -rn "scoping/m2-phase-2-" --include="*.md" --exclude-dir=archive .`

   The first surfaces every bare-path operator URL string still
   in durable docs (expected hits: this sub-phase's edit
   targets); the second surfaces every scoping-doc link
   (expected hits: 23 across 8 plan files). Cross-check survivors
   against the "Files To Touch" inventory; any survivor outside
   the inventory is a real miss and escalates before editing.
4. **Page-behavior + builder-name doc edits.** Edit
   [`docs/architecture.md`](../../../architecture.md),
   [`docs/dev.md`](../../../dev.md), [`docs/product.md`](../../../product.md),
   [`README.md`](../../../../README.md) per the Contracts section.
   `npm run build:web` confirms no SCSS or asset reference broke.
   Re-grep the touched files for any remaining bare-path operator
   URL strings or pre-rename builder/matcher names; any survivor
   is either an intentional history reference (in a plan or
   archived doc) or a missed edit.
5. **Open-question close + backlog unblock.** Edit
   [`docs/open-questions.md`](../../../open-questions.md) and
   [`docs/backlog.md`](../../../backlog.md) per the Contracts section.
   Verify the cross-references between the two stay consistent
   (the backlog's detail-link targets either point to a
   surviving section or rewrite to a durable target like the
   epic's "Open Questions Resolved By This Epic").
6. **Link-rewrite contract walk.** For each of the 23 scoping-doc
   links surfaced by step 3, classify as option 1 (rewrite to
   milestone doc Cross-Phase Decisions / Invariants / Risks
   section), option 2 (rewrite to a sibling plan-doc section),
   or option 3 (plain-text path reference with explanatory
   prose). Edit each source file to apply the rewrite. After all
   rewrites, re-grep with the same pattern from step 3; the only
   surviving hits should be inside the still-existing scoping
   docs themselves (which delete in step 8) or this plan's
   inventory table — durable surfaces have zero scoping-doc
   links.
7. **Plan + milestone + epic Status flips.** Edit
   [`docs/plans/event-platform-epic.md`](../../event-platform-epic.md)
   line 19 to flip M2 row from `Proposed` to `Landed`. Edit
   [`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   line 5 (top-level Status), line 43 (2.1 row drift correction
   with PR link), and line 47 (2.5 row Status + PR link). Edit
   [`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md)
   Status block (lines 8–11), Documentation Currency past-tense
   rewrite (lines 579–648), and Related Docs (lines 656–663).
   Edit this plan's Status from `Proposed` to `Landed`.
8. **M2 scoping batch deletion.** Delete the five scoping docs
   listed in "Files To Touch — Delete (M2 scoping docs)". Run a
   final repo-wide grep with the step 3 patterns; the only
   surviving hits should be in plan files where the rewrite from
   step 6 left a deliberate plain-text path reference (option 3)
   that does not resolve to a real file — confirm the prose
   around such hits explicitly says "deleted" or "see git
   history."
9. **Validation re-run.** Run `npm run lint` and
   `npm run build:web` (the Validation Gate's pre-merge load).
   Both must pass.
10. **Code-review feedback loop.** Walk the diff against every
    Cross-Cutting Invariant Touched and every Self-Review Audit
    named below. Apply fixes; commit review-fix changes
    separately per AGENTS.md Review-Fix Rigor.
11. **Plan-to-PR completion gate.** Walk every Goal,
    Cross-Cutting Invariant, Validation Gate command, and
    Self-Review Audit. Confirm each is satisfied or deferred
    with rationale.
12. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../../../.github/pull_request_template.md).
    Title under 70 characters (suggested:
    `docs(m2-2.5.3): close M2 — doc currency, scoping cleanup, status flips`).
    PR description names the M2 closure, the link-rewrite
    contract walk, and the scoping batch deletion. Validation
    section names every command run. Target Shape Evidence:
    enumerate the four flipped Status surfaces and the
    before/after scoping-doc count (5 → 0). Remaining Risk:
    name the link-rewrite false-negatives risk if any plan
    file's scoping reference uses a non-standard relative
    path that the grep missed.

## Commit Boundaries

1. **Page-behavior + builder-name doc edits.** Single commit
   covering [`docs/architecture.md`](../../../architecture.md),
   [`docs/dev.md`](../../../dev.md), [`docs/product.md`](../../../product.md),
   [`README.md`](../../../../README.md). Mechanical text rewrites; no
   structural change.
2. **Open-question close + backlog unblock.** Single commit
   covering [`docs/open-questions.md`](../../../open-questions.md) and
   [`docs/backlog.md`](../../../backlog.md). Logically a single change
   (close the question; record the consequence in backlog) so
   they belong together.
3. **Link-rewrite contract walk.** Single commit covering all 8
   plan files whose scoping references rewrite. The link-rewrite
   commit must precede the deletion commit; reviewer can
   independently inspect each rewrite's classification.
4. **M2 scoping batch deletion.** Single commit covering the
   five scoping doc deletions. Comes after commit 3 so every
   intermediate tip leaves no broken link.
5. **Status flips (epic + milestone + umbrella + this plan).**
   Single commit landing all four status flips together. The
   atomic-flip pattern is load-bearing: the milestone doc's
   Phase Status table is wholly current at the end of this
   commit.
6. **Review-fix commits.** As needed, kept distinct per AGENTS.md
   Review-Fix Rigor.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final
  (unchanged — no apps/web source is edited; this is doc-only).
- **No production smoke gate.** Per the umbrella's Status
  section, no 2.5 sub-phase touches any production-smoke
  fixture; this sub-phase ships doc-only against an
  already-verified cutover.
- **Repo-wide grep audit per Execution step 8.** Pre-merge
  load-bearing for the doc-currency completeness and
  link-rewrite invariants. The only surviving bare-path
  operator URL strings should be in plans / archives / commit
  messages (intentional history); the only surviving
  scoping-doc references should be in plan files where the
  rewrite from step 6 left a deliberate plain-text path with
  explanatory prose.

**Falsifier discipline (per AGENTS.md "Phase Planning Sessions
— Falsifiability check on each load-bearing claim").** The
repo-wide grep audit's discriminating falsifier: the
expected-hits set after step 8 is enumerable by category
(plans, archives, commit messages); a hit in any other
category is a real miss. The grep result is binary
(matches present / absent), but the cross-check against the
expected-hits enumeration is what distinguishes "real miss"
from "intentional history."

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../../../self-review-catalog.md).

### Runbook

- **Doc-currency completeness audit.** Walk every doc surface
  the umbrella's "Doc currency split across sub-phases"
  invariant assigned to 2.5.3 and confirm each named surface
  edits. The umbrella's
  [Documentation Currency 2.5.3 entry](./m2-phase-2-5-plan.md#L557)
  enumerates: architecture route inventory entries,
  architecture auth-flow narrative URL strings, `shared/urls/`
  module description, dev.md routes builder list, product.md
  capability bullet URL strings, README operator-route URL refs,
  open-questions close, backlog close + unblock, epic M2 row
  flip, milestone doc Phase Status row + top-level Status flip,
  umbrella Status flip, this plan's Status flip. The audit
  walks each entry against the diff.
- **Link-rewrite contract audit.** Walk every hit in the
  pre-edit `grep -rn "scoping/m2-phase-2-"` baseline against
  the post-edit grep. Confirm zero scoping-doc hits remain in
  durable docs (architecture, dev, product, README,
  open-questions, backlog) and that every plan-doc surviving
  hit (if any) has explanatory prose explicitly recording the
  deletion. The audit verifies the umbrella's link-rewrite
  contract was satisfied, not just that the deletions
  happened.
- **Status-flip ordering audit.** Confirm the four Status
  surfaces all flipped in the same commit (commit 5 above):
  epic M2 row, milestone-doc top-level + 2.5 row + 2.1
  drift correction, umbrella, this plan. Partial flips would
  publish a contradictory final state — e.g., umbrella `Landed`
  but milestone doc still `Proposed` would imply the milestone
  is not closed even though every sub-phase is. The
  atomic-flip pattern is the protective check.

### CI

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../../../self-review-catalog.md#L354)).
  This sub-phase's diff is mostly mechanical text edits; the
  five scoping-doc deletions are pure deletes. The classifier
  should mark the branch as docs-only — no code, no test, no
  config, no production behavior change.

## Documentation Currency PR Gate

- [`docs/architecture.md`](../../../architecture.md) — page-behavior
  route inventory (lines 92–106), `shared/urls/` module
  description (lines 261–279), auth-flow narrative + runtime
  flow URL strings (lines 664–738) per Contracts.
- [`docs/dev.md`](../../../dev.md) — routes builder list (lines
  208–213) per Contracts.
- [`docs/product.md`](../../../product.md) — operator-route capability
  bullet (line 47) per Contracts.
- [`README.md`](../../../../README.md) — capability bullets (lines
  32–40) + Repo Shape apps/web ownership prose (lines 63–67) per
  Contracts.
- [`docs/open-questions.md`](../../../open-questions.md) — Post-MVP
  authoring-ownership entry (lines 29–54) closes per Contracts.
- [`docs/backlog.md`](../../../backlog.md) — Post-MVP authoring
  ownership decision entry (lines 131–138) closes; organizer-
  managed agent assignment entry (lines 140–144) unblocks per
  Contracts.
- [`docs/plans/event-platform-epic.md`](../../event-platform-epic.md) —
  M2 row flip per Contracts.
- [`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  top-level Status + Phase Status table 2.1 + 2.5 rows + scoping
  batch-delete prose per Contracts.
- [`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) —
  Status block + Documentation Currency past-tense rewrite +
  Related Docs per Contracts.
- This plan — Status flips from `Proposed` to `Landed` per the
  regular Plan-to-PR Completion Gate.
- [`docs/operations.md`](../../../operations.md),
  [`shared/urls/README.md`](../../../../shared/urls/README.md) — no
  edit. URL-ownership-shape prose updated in 2.5.2; routes /
  matcher list updated in 2.5.1.

## Out Of Scope

Sub-phase-local exclusions. See umbrella for phase-level Out of
Scope.

- **Code edits, test edits, configuration edits.** This
  sub-phase is doc-only by design.
- **`shared/urls/README.md` re-edit.** Already current per 2.5.1.
- **`docs/operations.md` re-edit.** Already current per 2.5.2.
- **Top-level epic Status flip.** Owned by M4's terminal PR
  per [`event-platform-epic.md:23-24`](../../event-platform-epic.md#L23);
  this PR flips only the M2 row.
- **Sibling plan Status edits.** Sibling sub-phase plans
  (2.5.1, 2.5.2, all 2.x) have already-`Landed` Status; this
  sub-phase does not re-edit them. Only the link-rewrite
  contract touches their scoping-doc references where they
  exist.
- **Production-smoke fixture changes.** Per the umbrella's
  Status section, no 2.5 sub-phase modifies any production-smoke
  fixture.
- **`<ThemeScope>` wiring on operator routes.** Deferred to M4
  phase 4.1 per the umbrella's invariant.
- **Trust-boundary changes.** No SQL, no RLS, no Edge Function,
  no `shared/auth/` edit.
- **Re-litigating "Backward-compat redirects for the bare paths."**
  Resolved by default in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Settled by default" — no per-URL handler on apps/site for
  the retired bare paths.

## Risk Register

Sub-phase-local risks. See umbrella for cross-sub-phase risks.

- **Missed bare-path URL string in a doc surface.** A doc
  surface the umbrella's "Doc currency split" assigned to 2.5.3
  could escape the edit pass if the implementer's grep query
  doesn't catch its phrasing (e.g., a URL string broken across
  two lines, or wrapped in different code-fence styling).
  Mitigation: the repo-wide grep at Execution step 3 uses two
  parallel patterns (one for `/event/.*/redeem` and one for
  `/event/.*/redemptions`) and re-runs at step 4 after the edit
  pass; the grep audit at step 8 is the final pre-merge check.
- **Link-rewrite false-negatives.** A scoping-doc link in an
  unexpected location (e.g., a plan's commit-history-style
  reference, a non-`./` relative path, or a docs-archive
  reference outside the grep's `--exclude-dir=archive`) could
  escape the rewrite pass. Mitigation: the pre-edit grep at
  step 3 establishes the baseline of 23 hits; the post-edit
  grep at step 8 confirms zero hits remain in durable docs,
  and any surviving hit in plan files matches the contract's
  option 3 plain-text path reference pattern.
- **Status-flip atomicity slip.** If commit 5 (the atomic
  Status-flip commit) is split across multiple commits, an
  intermediate tip publishes a contradictory state (e.g.,
  umbrella `Landed` but milestone doc 2.5 row still `Proposed`).
  Mitigation: Commit Boundaries names this as a single commit;
  the implementer keeps the four files (epic, milestone,
  umbrella, this plan) staged together.
- **2.5.2 reverted post-2.5.3 merge.** Per umbrella's
  cross-sub-phase risk: 2.5.3 carries the M2-row flip, but the
  flip is wrong if 2.5.2 reverts and the cutover is no longer
  deployed. Mitigation: strict-serial sequencing (Pre-Edit Gate
  confirms 2.5.2 reads `Landed`, not the intermediate Status);
  any post-2.5.3 2.5.2 revert is a separate incident with its
  own Status flip back to `In progress pending deployed-origin
  verification` and a corresponding M2-row flip back to
  `Proposed`. The risk is small: the deployed-origin
  verification has captured (2.5.2 commit `b27daf9`).
- **Pre-existing 2.1 row drift not corrected.** If the
  implementer flips 2.5 row to `Landed` without correcting the
  2.1 row drift in the same commit, the milestone doc's Phase
  Status table publishes `Proposed` for 2.1 alongside `Landed`
  for 2.5 even though
  [`m2-phase-2-1-plan.md:5`](./m2-phase-2-1-plan.md#L5) reads
  `Landed.`. Mitigation: Contracts section explicitly names the
  drift correction; Self-Review's "Status-flip ordering audit"
  walks each Phase Status row against the linked plan's actual
  Status.
- **`adminEvent(id)` correction in dev.md drift outside scope.**
  The dev.md routes builder list at line 210 includes
  `adminEvent(id)`, which 2.4.3's deletion of the
  `routes.adminEvent` family rendered stale. Bundling this
  correction with the 2.5 rename edit risks expanding scope
  beyond the umbrella's "page-behavior + API-shape" assignment.
  Mitigation: the line being edited is the same line carrying
  the stale entry; touch-once-fix-once is more
  review-economical than splitting; the Contracts section
  names the bundling explicitly so reviewers can challenge if
  the scope feels stretched.
- **Open-questions section's parent-section emptying.** Closing
  the Post-MVP authoring-ownership entry leaves the "Authoring
  And Publishing" parent section possibly empty (depending on
  whether other open questions exist there at edit time).
  Mitigation: Contracts section names the existing pattern
  (parent section retains heading + reads "No currently open
  questions in this section under the current tracking rule")
  per the matching pattern at lines 25–27.

## Backlog Impact

- **Closes:** "Post-MVP authoring ownership and permission model"
  decision entry at
  [`docs/backlog.md:131-138`](../../../backlog.md#L131) per the epic's
  "Open Questions Resolved By This Epic"
  ([`event-platform-epic.md:166-172`](../../event-platform-epic.md#L166)).
- **Unblocks:** "Organizer-managed agent assignment" entry at
  [`docs/backlog.md:140-144`](../../../backlog.md#L140) per the
  umbrella's "Backlog Impact" subsection.
- **Adds:** "Archive M2 plan docs" entry under the `dev` tag in
  [`docs/backlog.md`](../../../backlog.md). Scope: move the 14 M2
  plan-doc files
  ([`m2-admin-restructuring.md`](./m2-admin-restructuring.md),
  [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md),
  [`m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md),
  [`m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md),
  [`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md),
  [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md),
  [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md),
  [`m2-phase-2-4-1-plan.md`](./m2-phase-2-4-1-plan.md),
  [`m2-phase-2-4-2-plan.md`](./m2-phase-2-4-2-plan.md),
  [`m2-phase-2-4-3-plan.md`](./m2-phase-2-4-3-plan.md),
  [`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md),
  [`m2-phase-2-5-1-plan.md`](./m2-phase-2-5-1-plan.md),
  [`m2-phase-2-5-2-plan.md`](./m2-phase-2-5-2-plan.md), and this
  plan) under a `docs/plans/archive/m2/` (or equivalent) tree;
  rewrite cross-references from any surviving doc surface that
  still points into the M2 set (epic, README, any doc that names
  an M2 plan path). The follow-up PR's load-bearing
  responsibility is link consistency across the move; pure git
  history of the moved files is preserved by `git mv`.
- **No other new backlog items expected.** This sub-phase ships
  no novel code surface; the link-rewrite contract walk is
  enclosed in the umbrella's already-named contract.

## Related Docs

- [`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) — umbrella;
  this PR's Status flip + the M2-closure narrative this
  sub-phase consumes + the link-rewrite contract this
  sub-phase satisfies.
- [`m2-phase-2-5-1-plan.md`](./m2-phase-2-5-1-plan.md),
  [`m2-phase-2-5-2-plan.md`](./m2-phase-2-5-2-plan.md) —
  Landed sibling sub-phases; the rename + cutover this
  sub-phase doc-currency reflects.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  M2 milestone; top-level Status + Phase Status table flips in
  this PR. Link-rewrite contract receiver for option-1
  rewrites.
- [`event-platform-epic.md`](../../event-platform-epic.md) — parent
  epic; M2 row flips in this PR; "Open Questions Resolved By
  This Epic" is the source of the open-question close + backlog
  unblock decisions.
- [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md),
  [`m2-phase-2-1-1-plan.md`](./m2-phase-2-1-1-plan.md),
  [`m2-phase-2-1-2-plan.md`](./m2-phase-2-1-2-plan.md),
  [`m2-phase-2-2-plan.md`](./m2-phase-2-2-plan.md),
  [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md),
  [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) — Landed
  sibling phase plans; link-rewrite contract receivers for
  scoping-doc reference rewrites.
- [`docs/self-review-catalog.md`](../../../self-review-catalog.md) —
  audit name source.
- [`docs/testing-tiers.md`](../../../testing-tiers.md) — production-
  smoke tier reference; the two-phase Plan-to-Landed Gate does
  not apply to this sub-phase per the umbrella's Status
  section.
- [`AGENTS.md`](../../../../AGENTS.md) — workflow rules; Doc Currency
  Is a PR Gate, Plan-to-PR Completion Gate, Verified-by
  annotations.
