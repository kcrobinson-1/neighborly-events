# M2 Phase 2.5.3 — Doc Cleanup + M2 Closure + Scoping Batch Delete

## Status

Proposed. Tier 1–4 gate (no production smoke); deletes
already-stale doc surface and flips milestone-closure state.

Sub-phase of M2 phase 2.5 — see
[`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) (umbrella) for
the phase-level context, sequencing rationale, cross-sub-phase
invariants, phase-level Out of Scope, and cross-sub-phase risks.

**Position in sequence.** Third and final sub-phase. Cannot draft
or merge until 2.5.2 has flipped to `Landed` AND its post-deploy
manual verification ran green — see the umbrella's
"2.5.2 reverted but 2.5.3 already merged" risk and the strict-
serial sequencing diagram. Strict-serial sequencing is enforced
at PR-open time: the implementer confirms the umbrella's
Sub-phase Status row for 2.5.2 reads `Landed` AND the post-deploy
verification evidence (PR comment or doc-only follow-up commit
linked from 2.5.2's PR) shows green before opening this PR.

**Single PR.** Branch-test sketch — page-behavior + API-shape
docs: 5 modifies (`docs/architecture.md`, `docs/dev.md`,
`docs/product.md`, `README.md`, `shared/urls/README.md`); M2
closure docs: 2 modifies (`docs/open-questions.md`,
`docs/backlog.md`); plan/milestone/epic Status flips: 4 edits
(`event-platform-epic.md` M2 row, `m2-admin-restructuring.md`
Phase Status + top-level Status, umbrella
`m2-phase-2-5-plan.md` Status, this plan's Status); scoping
batch deletion: 5 deletes
(`scoping/m2-phase-2-1.md`..`m2-phase-2-5.md`). ~16 files. Pure
documentation pass + state-flip + dead-doc cleanup against an
already-deployed cutover; no observable production behavior
change.

## Context

This is the cleanup PR. After 2.5.2 flipped production routing
for the bare paths and updated the URL-ownership-shape docs
(architecture topology table, dev.md rule walkthrough,
operations.md auth dashboard), the remaining doc surface — page
inventory entries, auth-flow narrative URL strings, the
`shared/urls/` builder/matcher description, the routes builder
list in dev.md, the product capability bullet, the README
operator-route refs — still reads bare-path URLs against
deployed `/game/`-prefixed reality. This PR pulls those forward.
It also closes the M2 milestone: the post-MVP authoring-ownership
open question that the epic's "Open Questions Resolved By This
Epic" subsection records as "resolved by M2"; the corresponding
backlog item; the "Organizer-managed agent assignment" backlog
unblock; the epic's M2 row; the milestone doc's top-level Status;
and the milestone doc's Phase Status row for 2.5. Finally, this
PR batch-deletes the five M2 scoping docs per the milestone
doc's "Phase Status" rule ("delete in batch when the milestone's
full set of plans exists, not when each individual plan lands").

It's the third PR because it can't safely land without the
production cutover (2.5.2) being verifiably green first. The M2
row flip claims "M2 is fully shipped"; that claim is false if
2.5.2's deployed cutover surfaces a Vercel-routing problem and
gets reverted. Splitting the closure out as its own PR — one
that only opens after 2.5.2 is `Landed` and its post-deploy
verification passed — preserves the revert path: 2.5.2 reverts
cleanly without touching 2.5.3's M2-row flip.

What this PR touches:
- The doc surfaces describing operator-route page behavior +
  `shared/urls/` API shape (architecture, dev, product, README,
  shared/urls README).
- The M2 closure surface (open-questions entry close, backlog
  item close + unblock, epic M2 row flip, milestone Status +
  Phase Status flip, umbrella Status flip).
- The five M2 scoping docs (batch deletion).
- This plan's Status flip.

What this PR doesn't touch: any code surface, any test surface,
any URL ownership shape doc that 2.5.2 already updated, the
[`docs/operations.md`](../operations.md) Supabase Auth dashboard
description (2.5.2 owns), or any apps/site source.

## Goal

Bring all documentation current with the post-cutover URL family;
close the M2 milestone formally per the epic's "Open Questions
Resolved By This Epic" subsection and the milestone doc's
sequencing rules; batch-delete the M2 scoping docs that have
served their purpose. After merge, reading
[`docs/architecture.md`](../architecture.md),
[`docs/dev.md`](../dev.md),
[`docs/product.md`](../product.md), and
[`README.md`](../../README.md) in any order describes the
deployed system accurately; the epic's Milestone Status table
reads M2 as `Landed`; the
[`docs/plans/scoping/`](./scoping/) directory contains no M2
scoping docs.

No observable production behavior change. The doc edits describe
state that landed in 2.5.1 and 2.5.2; the Status flips reflect
state that landed in 2.5.1, 2.5.2, and the prior M2 phases; the
scoping deletion removes transient artifacts that the M2 plans
have absorbed.

## Cross-Cutting Invariants Touched

These are sub-phase-local. See the umbrella for cross-sub-phase
rules.

- **M2 row flip safety.** The
  [`event-platform-epic.md`](./event-platform-epic.md) M2 row
  flip and the
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  top-level Status flip both claim M2 is fully shipped. The
  Pre-Edit Gate confirms 2.1, 2.2, 2.3, 2.4, 2.5.1, and 2.5.2
  all show `Landed` in their respective Status surfaces; if any
  one is not `Landed`, this PR cannot open.
- **Doc-grep audit catches missed bare-path strings.** Per the
  umbrella's "Doc-currency drift across sub-phases" risk: a
  missed `/event/<slug>/redeem` or `/event/<slug>/redemptions`
  string anywhere in
  [`docs/`](../) outside `docs/plans/scoping/` (deleted in this
  PR) and `docs/plans/m2-phase-2-*` (intentionally retrospective)
  is a doc-currency miss. The Execution Steps include a final
  repo-wide grep that catches any string the per-Contract edits
  missed.
- **Scoping deletion is unconditional.** Per the milestone doc's
  "Phase Status" rule, the M2 scoping docs delete in batch when
  the full set of M2 plans exists. With 2.5.1, 2.5.2, and 2.5.3
  plans drafted (and 2.5.3 itself being the implementing PR
  that lands the deletion), the precondition is met. No
  per-scoping-doc deferral.

## Naming

No new files. All edits modify existing files; the scoping batch
delete removes five files.

## Contracts

Each contract carries an inline "Verified by:" reference per
AGENTS.md.

**[`docs/architecture.md`](../architecture.md) (modify).**
Three editing surfaces in this PR (URL ownership prose at lines
60–63 and Vercel routing topology table at lines 893–906 already
landed in 2.5.2):

1. The route-inventory entries at lines 95–104
   (`EventRedeemPage` "for `/event/:slug/redeem`",
   `EventRedemptionsPage` "for `/event/:slug/redemptions`")
   rewrite to the `/game/redeem` and `/game/redemptions` URLs.
2. The `shared/urls` description at lines 268–273 updates the
   `routes` builder list (`eventRedeem(slug)` →
   `gameRedeem(slug)`, `eventRedemptions(slug)` →
   `gameRedemptions(slug)`) and the matcher list
   (`matchEventRedeemPath` → `matchGameRedeemPath`,
   `matchEventRedemptionsPath` → `matchGameRedemptionsPath`).
3. The auth-flow narrative at lines 668–705 (the
   "Direct-entry operator redeem route" and "Direct-entry
   operator monitoring + reversal route" sections) updates every
   URL string reference (`/event/:slug/redeem` and
   `/event/:slug/redemptions`, plus the
   `next=/event/:slug/redeem` and `next=/event/:slug/redemptions`
   snippets in the `validateNextPath` walk-through) to the
   `/game/`-prefixed form. The narrative content
   (authorization model, Edge Function call contract, state-
   machine behavior) is unchanged.

**Reality-check at edit time** by re-reading
[`docs/architecture.md`](../architecture.md) before editing —
2.5.2 edited the file and small drift is expected. The
load-bearing edit-pass instruction is "delete every remaining
`/event/:slug/redeem` and `/event/:slug/redemptions` URL string
literal and replace with the `/game/`-prefixed form; update the
`shared/urls` builder/matcher list to the renamed names." Verified
by:
[`docs/architecture.md:95-104,268-273,668-705`](../architecture.md#L95).

**[`docs/dev.md`](../dev.md) (modify).**
The `routes` builder list at lines 213–214 updates per the
`shared/urls/README.md` edit pattern (`eventRedeem(slug)` →
`gameRedeem(slug)`, `eventRedemptions(slug)` →
`gameRedemptions(slug)`). The apps/web URL list at lines 50–55
and the rule-precedence walk-through at lines 791–807 already
landed in 2.5.2. Verified by:
[`docs/dev.md:213-214`](../dev.md#L213).

**[`docs/product.md`](../product.md) (modify).**
Update the URL strings at line 47 (the operator-routes
capability bullet describing the agent-facing redeem route at
`/event/:slug/redeem` and the organizer-facing
monitoring/reversal route at `/event/:slug/redemptions`) to the
`/game/`-prefixed shapes. Behavior prose is unchanged. Verified
by:
[`docs/product.md:47`](../product.md#L47).

**[`README.md`](../../README.md) (modify).**
Update the operator-route URL references at lines 32 and 36
("authenticated direct-entry redeem route at
`/event/:slug/redeem`", "authenticated direct-entry monitoring +
reversal route at `/event/:slug/redemptions`") to the
`/game/`-prefixed forms, and the "Repo Shape" apps/web ownership
prose at lines 65–68 ("transitional bare-path operator routes
`/event/:slug/redeem` and `/event/:slug/redemptions`") deletes —
apps/web's footprint reads as `/event/:slug/game` and
`/event/:slug/admin` only. Verified by:
[`README.md:32,36,65-68`](../../README.md#L32).

**[`shared/urls/README.md`](../../shared/urls/README.md)
(currency check).** 2.5.1 already updated this file's
`routes` builder list, matcher list, and "What is intentionally
absent" entry. Confirm at edit-time that no surviving line still
names `eventRedeem` / `eventRedemptions` / `matchEventRedeem*` /
`matchEventRedemptions*`. If 2.5.1 missed any, fix here. Verified
by:
[`shared/urls/README.md`](../../shared/urls/README.md) — full
file walk.

**[`docs/open-questions.md`](../open-questions.md) (modify).**
Close the "Post-MVP authoring ownership and permission management"
entry at lines 31–54 per the epic's "Open Questions Resolved By
This Epic" subsection (resolved by M2 — permissive organizer RLS
plus the recorded direction toward self-serve). The repo's
convention for resolved sections (per the precedent set by
"Product And Live Event Operation" at lines 23–27 and
"Reporting And Sponsor Measurement" at lines 56–61) is to delete
the entry's body and replace it with a one-paragraph resolution
note that begins "No currently open questions in this section
under the current tracking rule." and points at the resolving
change. Replacement text (subject to small wording polish at
edit time): "No currently open questions in this section under
the current tracking rule. Resolved by M2's permissive organizer
RLS and the recorded self-serve direction; see
[`m2-admin-restructuring.md`](./plans/m2-admin-restructuring.md)
and the
[event platform epic](./plans/event-platform-epic.md) 'Open
Questions Resolved By This Epic' subsection. Implementation
priority for the unblocked
'Organizer-managed agent assignment' follow-up is tracked in
[`backlog.md`](./backlog.md)." Verified by:
[`docs/open-questions.md:23-54`](../open-questions.md#L23).

**[`docs/backlog.md`](../backlog.md) (modify).**
Two edits:

1. Mark the "Organizer-managed agent assignment" item at lines
   140–144 as unblocked. The repo's convention for unblocking is
   to delete the "Blocked on the broader authoring ownership
   decision." sentence and add a one-line "Unblocked by M2's
   permissive organizer RLS — implementable as a focused
   post-epic follow-up" pointer; confirm at edit time against
   the precedent set by other unblocked items.
2. Close the "Post-MVP authoring ownership and permission model"
   item at lines 131–138 (the backlog mirror of the
   open-questions entry). Either delete the bullet or convert
   it to a "(Closed by M2)" stub per the backlog's existing
   closed-item convention; confirm at edit time.

Verified by:
[`docs/backlog.md:131-144`](../backlog.md#L131).

**[`docs/plans/event-platform-epic.md`](./event-platform-epic.md) (modify).**
Flip the M2 row in the Milestone Status table at line 19 from
`Proposed` to `Landed` per the epic's "Milestone Status" rule
("Per AGENTS.md 'Plan-to-PR Completion Gate,' every implementing
PR is responsible for flipping the corresponding row's status in
the same change"). The 2.5 paragraph at lines 631–644 stays as
descriptive prose for the epic-internal phase contract — no
in-paragraph status flip is added. The epic's top-level Status
block at line 5 stays `Proposed` — per the epic, "When all five
rows show `Landed`, the top-level Status above flips from
`Proposed` to `Landed` in the same PR that lands M4." 2.5.3 only
owns the M2 row flip. Verified by:
[`docs/plans/event-platform-epic.md:15-21`](./event-platform-epic.md#L15).

**[`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md) (modify).**
Two edits: (a) the Phase Status table row for 2.5 at line 47
updates Status from `Proposed` to `Landed` and PR from `—` to
the umbrella's terminal sub-phase PR link (this PR's link); the
Plan column already links the umbrella per the milestone doc's
"Each row updates as the phase's plan drafts" rule; (b) the
top-level Status block at lines 5–8 flips from `Proposed` to
`Landed`. The sequencing, cross-phase invariants, cross-phase
decisions, and risks sections stay verbatim. Verified by:
[`docs/plans/m2-admin-restructuring.md:5-8,47`](./m2-admin-restructuring.md#L5).

**[`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md)
(umbrella, modify).** Top-level Status flips from `Proposed
(umbrella)` to `Landed (umbrella)`. Sub-phase Status table
updates 2.5.3's row to `Landed` with the implementing PR link
(2.5.1's and 2.5.2's rows update as those PRs merge,
respectively, per the umbrella's sub-phase plan flips — by the
time this PR drafts, both should already read `Landed` with
their PR links). Verified by:
[`docs/plans/m2-phase-2-5-plan.md:5-13`](./m2-phase-2-5-plan.md#L5).

**Scoping batch deletion.** Delete:
- [`docs/plans/scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md)
- [`docs/plans/scoping/m2-phase-2-2.md`](./scoping/m2-phase-2-2.md)
- [`docs/plans/scoping/m2-phase-2-3.md`](./scoping/m2-phase-2-3.md)
- [`docs/plans/scoping/m2-phase-2-4.md`](./scoping/m2-phase-2-4.md)
- [`docs/plans/scoping/m2-phase-2-5.md`](./scoping/m2-phase-2-5.md)

Per the
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
"Phase Status" rule, "Per-phase scoping docs at
[`scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md) through
[`scoping/m2-phase-2-5.md`](./scoping/m2-phase-2-5.md) are
transient. They delete in batch (with this doc absorbing their
durable cross-phase content) when all five M2 plans exist; the
deletion lands in the 2.5 PR or a focused cleanup PR." With 2.5.3
being the cleanup-PR slot, the deletion lands here. Pre-deletion
audit: confirm no surviving doc outside
[`docs/plans/m2-phase-2-*`](./m2-phase-2-1-plan.md) and
[`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md)
links into the scoping docs (the plan-doc family naturally cites
the scoping docs as the source-of-truth-at-draft-time; those
references stay as historical pointers, but if any non-plan doc
links a scoping doc, that link breaks at deletion). Run:

```
grep -rn "docs/plans/scoping/m2-phase-2-" \
  --include="*.md" --exclude-dir=archive --exclude-dir=node_modules .
```

The expected post-grep hits are:
- The five scoping docs themselves (about to delete).
- The M2 plan-doc family (`m2-phase-2-1-plan.md` through
  `m2-phase-2-5-plan.md`, sub-phase plans, and umbrella) —
  intentionally retrospective references; stay as historical
  pointers (the linked file no longer exists post-deletion, but
  per AGENTS.md's "git log is authoritative for navigating from
  plan to history," broken links to deleted-by-design files in
  retrospective plan-doc citations are acceptable; the alternative
  — rewriting every plan's Related Docs at deletion time — is
  busywork without protective value).
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  intentional retrospective reference in the same spirit; the
  rule that promises this deletion lives there too, so the
  reference is self-documenting.
- The 2.4 plan family that names `scoping/m2-phase-2-4.md` as
  "transient; deletes in the M2 terminal cleanup" — same
  retrospective treatment.

If any non-plan doc (architecture, dev, product, etc.) links a
scoping doc, that link must be rewritten before deletion. The
expected count is zero.

**This plan (modify, terminal step).** Status flips from
`Proposed` to `Landed` per AGENTS.md "Plan-to-PR Completion
Gate."

## Files To Touch

### Modify (page-behavior + API-shape docs)

- [`docs/architecture.md`](../architecture.md)
- [`docs/dev.md`](../dev.md)
- [`docs/product.md`](../product.md)
- [`README.md`](../../README.md)
- [`shared/urls/README.md`](../../shared/urls/README.md)
  (currency check; 2.5.1 already edited)

### Modify (M2 closure surface)

- [`docs/open-questions.md`](../open-questions.md)
- [`docs/backlog.md`](../backlog.md)
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md)
- [`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md)
- [`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md)
  (umbrella)

### Modify (plan Status)

- This plan — Status flips from `Proposed` to `Landed`.

### Delete (scoping batch)

- [`docs/plans/scoping/m2-phase-2-1.md`](./scoping/m2-phase-2-1.md)
- [`docs/plans/scoping/m2-phase-2-2.md`](./scoping/m2-phase-2-2.md)
- [`docs/plans/scoping/m2-phase-2-3.md`](./scoping/m2-phase-2-3.md)
- [`docs/plans/scoping/m2-phase-2-4.md`](./scoping/m2-phase-2-4.md)
- [`docs/plans/scoping/m2-phase-2-5.md`](./scoping/m2-phase-2-5.md)

### Files intentionally not touched

- All code surfaces — owned by 2.5.1 and 2.5.2.
- All test surfaces — owned by 2.5.1.
- [`docs/operations.md`](../operations.md) Supabase Auth dashboard
  description — owned by 2.5.2.
- [`docs/architecture.md`](../architecture.md) URL ownership
  prose at lines 60–63 + Vercel routing topology table at lines
  893–906 — owned by 2.5.2.
- [`docs/dev.md`](../dev.md) apps/web URL list at lines 50–55 +
  rule-precedence walk-through at lines 791–807 — owned by 2.5.2.
- M0 / M1 plan docs, scoping docs, and archive.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree, feature branch
   (not `main`), and that **2.5.2 has flipped to `Landed` AND
   its post-deploy bare-path retirement check ran green** per
   the umbrella's Sub-phase Status table (the post-deploy
   evidence lives in 2.5.2's PR, either as a comment or a
   doc-only follow-up commit). Re-confirm 2.1, 2.2, 2.3, 2.4,
   2.5.1, and 2.5.2 all show `Landed` in their respective
   Status surfaces; if any one is not `Landed`, do not open
   this PR. Re-read the umbrella, 2.5.2's plan, the milestone
   doc's "Phase Status" rule on scoping deletion, and the
   epic's "Open Questions Resolved By This Epic" subsection.
2. **Baseline validation.** `npm run lint`, `npm test`,
   `npm run build:web`, `npm run build:site`,
   `npm run test:functions`. All must pass before any edit.
   (No code change in this PR; the gates are sanity.)
3. **Pre-edit grep audit.** Run:

   ```
   grep -rn "/event/.*/redeem\|/event/.*/redemptions\|eventRedeem\|eventRedemptions\|matchEventRedeem\|matchEventRedemptions" \
     --include="*.md" \
     --exclude-dir=node_modules --exclude-dir=archive .
   ```

   The hits are the work surface for this PR's doc pass.
   Cross-check against the "Files To Touch — Modify" list.
   Expected hits: the five doc files this PR edits, the
   shared/urls README (currency check), the plan-doc family
   (retrospective references; stay), and the scoping docs
   (deleted in this PR). Any other hit is a missed file to add
   to the inventory.
4. **Page-behavior + API-shape doc updates.** Edit
   [`docs/architecture.md`](../architecture.md),
   [`docs/dev.md`](../dev.md),
   [`docs/product.md`](../product.md),
   [`README.md`](../../README.md), and confirm
   [`shared/urls/README.md`](../../shared/urls/README.md) per
   the Contracts section. Reality-check line numbers at edit
   time.
5. **M2 closure docs.** Edit
   [`docs/open-questions.md`](../open-questions.md) (close
   entry), [`docs/backlog.md`](../backlog.md) (close + unblock).
6. **Pre-deletion grep for scoping doc references.** Run the
   `grep -rn "docs/plans/scoping/m2-phase-2-" ...` from the
   Contracts section. Confirm no non-plan doc references the
   about-to-delete scoping docs. If any does, rewrite the link
   or stub before deleting.
7. **Scoping batch deletion.** Delete the five scoping docs.
8. **Plan + milestone + epic Status flips.** Edit
   [`event-platform-epic.md`](./event-platform-epic.md) M2 row;
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   Phase Status row + top-level Status; umbrella
   [`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) Status +
   sub-phase row; this plan's Status. Per the Contracts section.
9. **Post-edit grep audit.** Re-run the grep from step 3 against
   the post-edit state. Expected hits:
   - The plan-doc family (retrospective references stay).
   - The deleted scoping doc *paths* should now appear only as
     broken links inside the plan-doc family (acceptable per
     the scoping-deletion contract above).
   - No surviving non-plan doc should contain
     `/event/.*/redeem` or `/event/.*/redemptions` strings or
     the `eventRedeem*` / `matchEventRedeem*` identifiers. If
     any does, fix in this PR.
10. **Validation re-run.** All baseline commands from step 2
    must pass. (Lint is the load-bearing gate for the doc
    pass — markdown formatting + link validity if linting
    covers them.)
11. **Code-review feedback loop.** Walk the diff against every
    Cross-Cutting Invariant Touched and every Self-Review Audit.
12. **Plan-to-PR Completion Gate.** Walk every Goal item, every
    Cross-Cutting Invariant, every Validation Gate command, and
    every Self-Review Audit. Confirm satisfied or deferred.
    Flip Status to `Landed`.
13. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters
    (suggested:
    `chore(m2-2.5.3): close M2 — doc cleanup + scoping deletion`).
    Validation section names every command run; PR description
    notes that this PR carries M2's milestone-row flip and the
    scoping doc batch deletion.

## Commit Boundaries

1. **Page-behavior + API-shape doc updates.** Single commit;
   includes
   [`docs/architecture.md`](../architecture.md),
   [`docs/dev.md`](../dev.md),
   [`docs/product.md`](../product.md),
   [`README.md`](../../README.md), and any
   [`shared/urls/README.md`](../../shared/urls/README.md)
   currency-check fix.
2. **M2 closure docs.** Single commit;
   [`docs/open-questions.md`](../open-questions.md) +
   [`docs/backlog.md`](../backlog.md).
3. **Scoping batch deletion.** Single commit; the five scoping
   doc deletes.
4. **Plan + milestone + epic Status flips.** Single commit;
   the closure commit. Includes
   [`event-platform-epic.md`](./event-platform-epic.md) M2 row,
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
   Phase Status row + top-level Status, umbrella
   [`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) Status +
   sub-phase row, this plan's Status flip.
5. **Review-fix commits.** As needed.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final (sanity; no test
  change).
- `npm run build:web` — pass on baseline; pass on final
  (sanity; no source change).
- `npm run build:site` — pass on baseline; pass on final
  (sanity; no source change).
- `npm run test:functions` — pass on baseline; pass on final
  (sanity).
- pgTAP via `npm run test:db` — pass on baseline; pass on final
  (sanity).
- **Pre-deletion + post-edit grep audits (Execution steps 6 and
  9).** Pre-merge load-bearing for the doc-currency invariant
  and the scoping-deletion link check.

**No production smoke gate.** This PR makes no observable
production behavior change; it edits docs and flips Status.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md).

### Frontend / docs

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../self-review-catalog.md#L354)).
  This PR is doc-only + scoping deletes + Status flips.
  **Reviewer attention should land on**: the M2 closure surface
  (epic row, milestone Status, open-questions entry, backlog
  entries — these are state assertions about the milestone, not
  prose updates); the scoping batch deletion (confirm only the
  five M2 scoping files delete, no plan doc accidentally
  included); the open-questions resolution note text (matches the
  precedent set by other resolved sections); the post-edit grep
  result (no surviving bare-path string outside intentional plan
  retrospectives).

### CI

- **Rename-aware diff classification.** Any docs-only or
  scoped-test CI gate that *would* skip this branch under a
  "docs-only" rule is acceptable here: this PR is genuinely
  docs-only + state flips. The validation gate explicitly notes
  the build/unit/test gates are sanity, not load-bearing.

### Runbook

- No SQL or operational scripts in this sub-phase.

## Documentation Currency PR Gate

- All doc files named in Contracts.
- Open-questions and backlog entries closed/unblocked.
- Epic + milestone Status surfaces flipped.
- Umbrella + this plan Status flipped.
- Scoping batch deletion completed.

## Out Of Scope

Sub-phase-local exclusions. See umbrella for phase-level Out of
Scope.

- **Code edits.** All code surfaces (shared, apps/web, scripts,
  tests) landed in 2.5.1 and 2.5.2.
- **URL ownership shape doc edits.** Already landed in 2.5.2
  (architecture topology table, top-level URL ownership prose;
  dev.md apps/web URL list and rule walkthrough; operations.md
  Supabase Auth dashboard description).
- **Production behavior changes.** None. The cutover landed in
  2.5.2.
- **Plan-doc family rewrites against deleted scoping doc
  links.** Per the Contracts section's scoping-deletion rule:
  retrospective references in the plan-doc family are
  acceptable as historical pointers; rewriting them is busywork
  without protective value (git history is the source of truth).
- **M0 or M1 milestone closure surfaces.** Only the M2 row
  flips. The epic's top-level Status stays `Proposed` (flips
  with M4 per the epic's own rule).

## Risk Register

Sub-phase-local risks. See umbrella for cross-sub-phase risks.

- **2.5.2 reverted but 2.5.3 already merged.** This PR's
  Pre-Edit Gate enforces strict-serial sequencing: confirm 2.5.2's
  Sub-phase Status row reads `Landed` AND its post-deploy
  verification ran green before opening this PR. If 2.5.2
  reverts post-2.5.3 merge, the M2 row reads `Landed` but the
  cutover isn't deployed, which is a state-falsification.
  Mitigation: do not open this PR until 2.5.2's post-deploy
  evidence is in. The umbrella's Status table is the source of
  truth for sequencing.
- **Scoping deletion breaks an unanticipated link.** Mitigation:
  Execution step 6's grep catches non-plan-doc references before
  the deletion commit.
- **Doc-pass misses a bare-path string.** Mitigation: Execution
  step 9's post-edit grep against the same regex set; any
  surviving hit outside the plan-doc retrospective set fixes in
  this PR before merge.
- **Open-questions / backlog convention drift.** The
  resolution-note format and the unblock-format must match the
  precedent set by other entries in the same files. Mitigation:
  Contracts section names the precedent files; reality-check at
  edit time confirms the chosen format matches.
- **Umbrella Status flip premature.** The umbrella's Status
  flips to `Landed (umbrella)` only when all three sub-phases
  show `Landed` in the umbrella's Sub-phase Status table.
  Mitigation: the umbrella Sub-phase rows for 2.5.1 and 2.5.2
  should already read `Landed` with PR links by the time this
  PR opens; this PR adds 2.5.3's row update + the umbrella's
  top-level flip in the same commit. If 2.5.1 or 2.5.2's row
  somehow reads not-`Landed`, abort the umbrella flip in
  Execution step 8 and investigate.

## Backlog Impact

- **Closed by this PR.** "Post-MVP authoring ownership and
  permission model" — resolved by M2's permissive organizer
  RLS per the epic's "Open Questions Resolved By This Epic."
- **Unblocked by this PR.** "Organizer-managed agent
  assignment" — feasible after 2.1's RLS broadening with no
  further authorization work; implementation lands as a focused
  post-epic follow-up.
- **No new backlog items expected from this PR.**

## Related Docs

- [`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) — umbrella;
  this PR's Status flip + sequencing + the closure of the M2
  milestone.
- [`m2-phase-2-5-1-plan.md`](./m2-phase-2-5-1-plan.md) — sibling
  Landed sub-phase (must be `Landed` before this PR opens).
- [`m2-phase-2-5-2-plan.md`](./m2-phase-2-5-2-plan.md) — sibling
  Landed sub-phase (must be `Landed` AND post-deploy verified
  before this PR opens).
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  M2 milestone; Phase Status row + top-level Status flips to
  `Landed` in this PR.
- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M2 row flips to `Landed` in this PR.
- [`m2-phase-2-4-3-plan.md`](./m2-phase-2-4-3-plan.md) — Landed
  sibling; precedent for the cleanup-PR pattern (2.4.3 deleted
  legacy code post-cutover; this PR closes M2 post-cutover).
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules.
