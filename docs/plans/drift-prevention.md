# Documentation Drift Prevention

## Status

Proposed. Reframed from the sibling scoping doc's audit-add framing
into a consolidation pass after walking the plan against the
[`Agentic Practice Roadmap`](/docs/tracking/agentic-practice-roadmap.md)
— see Resolved Decisions below for the four open decisions the
scoping handed off and how the consolidation reframe changes
their resolutions.

## Context

The 2026-05-11 audit of the top-level canonical docs surfaced 13
findings of mechanical inaccuracy and editorial drift. The
corrections plan at
[`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
fixed the current drift across four implementing PRs but did not
address why the pre-push surfaces (the named-audit catalog at
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) and
the discipline list at
[`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md))
did not fire.

This plan addresses the prevention surface as a **consolidation**,
not a rule-addition. The scoping doc framed the work as
adding up to nine new catalog audits plus a new planning-rule
trap; the agentic-practice roadmap diagnoses exactly that shape
as the cascade producing rule-density compounding (Bet 2, Bet 3,
the A1 rule-retirement convention in
[`AGENTS.md`](/AGENTS.md) "Rule additions in `docs/agents/`").
Reframing as consolidation lets the same prevention coverage
land net-zero or net-negative on durable rule count: the
discipline-checklist items that already exist get **promoted to
named catalog audits and removed from the checklist**, and the
planning-rule extension folds into the existing
"Subset enumerated where the contract names a category" trap as
a generalization rather than a sibling addition.

The forward-looking rule-gap audits the scoping doc proposed
(migration-semantics-changed, new-migration, new-feature-route,
new-top-level-doc) **defer**. The catalog's Contributing gate is
an OR (two distinct PRs, or one P1 with a generalizing root
cause), and both arms are technically reachable for these four
classes; the deferral does not rest on either arm being
unreachable. It rests on the meta-argument from
[`Agentic Practice Roadmap`](/docs/tracking/agentic-practice-roadmap.md)
Bet 2 / Bet 3 / the A1 rule-retirement convention: invoking
either arm to land four simultaneous forward-looking audit-adds
is the gate-relaxation shape those bets exist to catch.

A prior attempt at the catalog-audits surface ran into exactly
this critique on 2026-05-12: six audits were drafted off the
single 2026-05-11 batch finding and closed without merging
after the agentic-practice analysis flagged the same
gate-relaxation pattern. The 2026-05-12 entry in the roadmap's
[`Log`](/docs/tracking/agentic-practice-roadmap.md) is the
durable record; the drafted audits remain on the
`docs/drift-prevention-catalog-audits` branch and become the
natural pull-forward artifact when any of the six classes
recurs on a second distinct PR. This plan's reframe lands the
enforcement-gap consolidation that the closed attempt did not
attempt and which the agentic-practice critique does not
catch.

## Goal

After this plan lands its full sequence:

- The named-audit catalog gains four new audits in a new
  Documentation drift section, each promoting one
  discipline-checklist item from periodic-review altitude to
  push-time altitude.
- The discipline checklist **loses** the four items each new
  audit promotes from; the audits fire at push-time and a
  duplicate periodic-review reminder is the additive-shape trap
  the roadmap diagnoses. The remaining checklist items (the
  ones no catalog audit covers cleanly — UX-facing flow
  changes, module-boundary additions, current-vs-target
  framing, shared-barrel-file documentation) stay in place;
  this is a partial retirement, not a checklist wipe.
- The planning-rule trap at
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  "Plans describe contracts, not implementation" titled
  "Subset enumerated where the contract names a category"
  **generalizes** to cover both the subset-enumerated failure
  (contract names a category, plan enumerates a subset) and
  the content-prescribed failure (contract is about shape,
  plan prescribes specific content). The revised trap subsumes
  both shapes under one entry, replacing the narrower existing
  prose.
- The Tier 5 backlog entry "Pre-push drift-prevention surfaces
  anchor on intended product state and right-grain contracts"
  at [`docs/backlog.md`](/docs/backlog.md) is removed in the
  follow-up close-out PR (which also flips this plan's Status
  to Landed and deletes the sibling scoping doc) per the
  Parallel-implementing-PRs exception named in Contracts below.

The net effect on durable rule count: four catalog audits added,
four checklist items removed, one existing trap revised to
cover an additional shape (no sibling trap added). This is
designed to produce a non-trivial Bet 2 numerator entry — the
first one since the 2026-05-08 cascade-fix per the
[`Log`](/docs/tracking/agentic-practice-roadmap.md) entry there.

The forward-looking rule-gap surfaces (migration-semantics,
new-migration, new-feature-route, new-top-level-doc) are
**Out Of Scope** for this plan; if those classes recur on a
second canonical-doc drift incident the catalog's Contributing
gate gets satisfied honestly. Until then, the corrections plan's
historical findings are sufficient signal for the four
enforcement-gap promotions but not for the four rule-gap adds.

## Cross-Cutting Invariants

- **Trigger patterns describe categories, not enumerated
  subsets.** Each new catalog Trigger names a class of diff
  (changes to routing config; changes to the validation-gate
  command list; expanded prose in an evergreen "what is" surface
  on a topic the other doc covers; edits to evergreen prose that
  add or fail to remove phase identifiers or future-tense
  status language) rather than a hand-rolled file list.
  Carrier-file enumeration lives in each audit's Check step,
  where the catalog-update PR verifies completeness against
  current code. The recurring trap is "F1 enumerated three
  files and missed
  [`apps/site/vercel.json`](/apps/site/vercel.json)" — caught
  in scoping, recorded here so the implementing PR doesn't
  reintroduce it.
- **Promoted items are removed from the discipline checklist,
  not pointer-replaced.** A one-line "see the audit" pointer in
  the checklist is the additive shape (same rule, two homes);
  full removal is the consolidation shape (same rule, one
  home). The plan binds removal.
- **The planning-rule trap revision is byte-for-shape, not
  byte-for-byte.** The existing trap's example list (privilege
  types, error classes, role names) carries forward into the
  revised wording as illustrations of the subset-enumerated
  shape; the content-prescribed shape gets its own one-sentence
  framing with a separate citation. The revision preserves the
  load-bearing intent of both shapes under one entry.

## Contracts

Two implementing PRs. PR 1 touches the catalog and the
discipline checklist together (consolidation requires both
surfaces to land in lock-step or the partial state is the
additive-shape trap). PR 2 touches the planning rule alone.
PR 1 and PR 2 are independent and may land in either order.

PR 1 and PR 2 are independent and either may merge first. This
plan invokes the **Parallel-implementing-PRs** exception in
[`Plan-to-PR Completion Gate`](/docs/agents/planning/plan.md):
the close-out (flip this plan's Status to Landed, delete the
sibling scoping doc, remove the parent backlog entry) lands in
a single-commit follow-up PR opened immediately after the last
implementing PR merges. Plan Status moves
`Proposed → In progress` when the first implementing PR
merges and `In progress → Landed` when the close-out PR
merges.

The exception is invoked rather than the same-PR default
because neither PR 1 nor PR 2 is clearly last-to-merge — both
can be drafted, reviewed, and revised in parallel — and a
last-to-merge drafter cannot retroactively add close-out
content to an already-reviewed PR at merge time without
re-triggering review.

### PR 1 — Catalog audits promoted from the discipline checklist (consolidation)

Goal: promote four discipline-checklist items to named catalog
audits in a new Documentation drift section, and remove the
promoted items from the checklist.

Surfaces:
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md),
[`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md).

Audits added, paired with the checklist item each retires:

- **Route or topology coupling audit** retires the
  "When routes, trust boundaries, or runtime ownership change,
  update `README.md`, `docs/architecture.md`, and `docs/dev.md`
  in the same pass" item under
  [`Keep Docs Coupled To Code Changes`](/docs/tracking/documentation-quality-checklist.md).
  Trigger: a commit touches Vercel rewrite or proxy config, or
  Next.js routing config, in either app. Catalog Example cites
  F1 (README and architecture-doc describing opposite Vercel
  topologies pre-corrections-plan-PR-1).
- **Validation-command coupling audit** retires the "When
  validation commands, CI behavior, or local setup change,
  update `docs/dev.md`, `docs/testing.md`, and any affected
  workflow docs together" item under the same checklist
  section. Trigger: a commit adds, renames, or removes an
  entry in the documented validation-gate command list (a new
  [`supabase/functions/<name>/`](/supabase/functions/)
  directory implicitly adding a new
  `deno check` target counts), **or** a commit changes CI
  workflow definitions under
  [`.github/workflows/`](/.github/workflows/) in a way that
  changes which commands run on PR, **or** a commit changes
  local-setup config (`mise.toml`, root devcontainer config).
  The audit's Trigger broadens to cover the retired item's
  full scope (validation commands + CI behavior + local
  setup) so the retirement is clean rather than partial.
  Catalog Example cites F7-F9 and F10 together (deno-check
  list incomplete in three docs; testing.md missing
  `build:site`); the CI-behavior and local-setup arms have no
  current historical Example and the catalog entry names that
  explicitly.
- **Canonical-owner duplication audit** retires the "Check
  whether docs duplicate the same procedure in multiple places
  instead of linking to one canonical owner" item under
  [`Review Checklist For Future Doc Passes`](/docs/tracking/documentation-quality-checklist.md).
  Trigger: a commit adds or expands prose in any canonical
  doc (the root [`README.md`](/README.md) and the canonical
  docs under [`docs/`](/docs/) that the Doc Ownership table
  marks as canonical "what is" prose) on a topic another
  canonical doc already covers in depth. The audit's Trigger
  broadens beyond the F11 architecture/dev pair to cover any
  canonical-doc duplication pair so the retirement is clean.
  Catalog Example cites F11 (architecture.md and dev.md
  duplicated coverage on three topics); the broader canonical-
  doc scope has no current historical Example beyond F11 and
  the catalog entry names that explicitly.
- **Phase-identifier and target-state-language audit** retires
  the "Check whether any 'future', 'later', or 'next' language
  should now be converted into either implemented behavior or
  an explicit open question" item under the same checklist
  section. Trigger: a commit edits an evergreen "what is"
  surface (root README, canonical architecture / dev / product
  / experience docs, or any doc the doc-index Doc Ownership
  table marks as canonical "what is" prose) and the edit
  either adds or fails to remove internal phase identifiers
  (phase names keyed to the milestone/phase rollout layer) or
  future-tense status language. Catalog Example cites F12
  (phase identifiers in three docs pre-corrections-plan-PR-3).

Contracts:

- Each new audit follows the catalog's existing
  Trigger / Check / Example shape per
  [`How to use`](/docs/self-review-catalog.md). The
  implementing PR writes the prose against that shape; this
  plan binds the audit name, the trigger pattern at category
  altitude, the carrier-file scope, and which historical
  finding the Example cites.
- The new Documentation drift section is positioned after
  Edge Functions & deployment config (the catalog's last
  existing section).
- The promoted checklist items are removed cleanly, not
  pointer-replaced. The replaced items in the checklist DO
  NOT gain "see catalog audit X" prose; the audit's existence
  is discoverable from the catalog's table of contents.
- The four enforcement-gap promotions satisfy the catalog's
  [`Contributing`](/docs/self-review-catalog.md) gate's "P1
  with generalizing root cause" line: each promoted rule
  already existed in the discipline checklist with a
  generalizing trigger; the F1, F7-F10, F11, F12 findings are
  the documented incidents that justify push-time-altitude
  promotion. The audits are not forward-looking adds; they
  are altitude shifts on rules with documented coverage.
- Net rule-count change for [`docs/agents/**`](/docs/agents/):
  zero (no `docs/agents/` files touched).
- Net rule-count change for the catalog plus the discipline
  checklist together: zero (+4 catalog, −4 checklist).

### PR 2 — Generalize the existing planning-rule trap

Goal: revise the existing
[`Subset enumerated where the contract names a category`](/docs/agents/planning/shared.md)
trap under "Plans describe contracts, not implementation" to
cover both the subset-enumerated shape and the
content-prescribed shape, without adding a sibling trap entry.

Surfaces:
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md).

Contracts:

- The existing trap entry is rewritten in place. The revised
  prose names two sub-shapes of the same failure mode:
  (a) **subset-enumerated** (contract names a category, plan
  enumerates a subset — privilege types, error classes, role
  names — leaving the rest of the category uncovered);
  (b) **content-prescribed** (contract is about shape, plan
  prescribes specific content — specific SQL posture text,
  specific prose, specific copy strings — exposing the
  plan-doc to the same factual drift the implementing doc
  would carry, with no benefit because the implementing PR
  can verify the shape against the authoritative carrier in
  the same change).
- The unified fix sentence covers both shapes: describe what
  the implementing doc must do (the shape or category), not
  which specific members or content satisfy it.
- The Example for the content-prescribed sub-shape cites the
  corrections-plan PR 2 contract at
  [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
  "PR 2 — Feedback feature documentation" as the good-shape
  pattern (the contract explicitly contracted shape-not-
  content discipline).
- Per the [`AGENTS.md`](/AGENTS.md) "Rule additions in
  `docs/agents/`" convention (A1, landed 2026-05-09): PR 2
  edits an existing rule rather than adding a new one. The PR
  body names this fact explicitly (option (b) under A1: no
  retirement because no addition). Reviewers can re-classify
  the revision as an addition if the revised prose reads as a
  net-new rule rather than a generalization of the existing
  one; the falsifier is whether a reader unfamiliar with both
  versions can tell from the revised text alone that the
  subset-enumerated shape is still being prescribed.
- The other two existing recurring traps under "Plans
  describe contracts, not implementation"
  (specific-source-named, trajectory-prescribed) are unchanged.

## Files To Touch

Estimate of the expected shape, per the
[`Plan content is a mix of rules and estimates`](/docs/agents/planning/shared.md)
rule. Implementation may revise when a structural call
requires deviating; deviations get the Estimate Deviations
callout in the PR body per the
[`Plan-to-PR Completion Gate`](/docs/agents/planning/plan.md).

New files: none.

Modified by PR 1:

- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — new Documentation drift section after Edge Functions &
  deployment config, with four audit entries.
- [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
  — four items removed (two from
  [`Keep Docs Coupled To Code Changes`](/docs/tracking/documentation-quality-checklist.md),
  two from
  [`Review Checklist For Future Doc Passes`](/docs/tracking/documentation-quality-checklist.md)).
- [`docs/plans/drift-prevention.md`](/docs/plans/drift-prevention.md)
  — Status flips `Proposed → In progress`. PR 2 carries the
  same flip; the second-to-merge resolves a trivial conflict
  (both sides want `In progress`).

Modified by PR 2:

- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  — existing "Subset enumerated where the contract names a
  category" trap rewritten in place to cover both
  subset-enumerated and content-prescribed sub-shapes.
- [`docs/plans/drift-prevention.md`](/docs/plans/drift-prevention.md)
  — Status flips `Proposed → In progress`. PR 1 carries the
  same flip; the second-to-merge resolves a trivial conflict
  (both sides want `In progress`).

Modified by the follow-up close-out PR (per the
Parallel-implementing-PRs exception named in the Contracts
preamble above):

- [`docs/plans/drift-prevention.md`](/docs/plans/drift-prevention.md)
  — this plan; Status flips from `In progress` to `Landed`.
- [`docs/plans/scoping/drift-prevention.md`](/docs/plans/scoping/drift-prevention.md)
  — sibling scoping doc; deleted per the scoping-doc-
  transience convention.
- [`docs/backlog.md`](/docs/backlog.md) — Tier 5 entry
  "Pre-push drift-prevention surfaces anchor on intended
  product state and right-grain contracts" removed.

Files intentionally not touched (estimate, not prohibition):

- The canonical docs themselves
  ([`docs/architecture.md`](/docs/architecture.md),
  [`docs/dev.md`](/docs/dev.md),
  [`docs/product.md`](/docs/product.md),
  [`docs/testing.md`](/docs/testing.md), the root
  [`README.md`](/README.md)). Drift in those docs was
  corrected by the sibling corrections plan; this plan
  prevents future drift but does not touch the canonical
  docs themselves.
- [`docs/README.md`](/docs/README.md). The Doc Ownership
  table is referenced by audit Triggers as a category marker;
  adding the audits does not edit the table.
- The four deferred rule-gap audit surfaces named in Out Of
  Scope.

## Commit Boundaries

Estimate of intended commit slicing within each PR, per
[`Planning Depth`](/docs/agents/planning/plan.md) "for PR-sized
work, name the intended commit boundaries before editing when
practical." The implementer may revise — these are estimates,
not contracts.

**PR 1.** Two commits, one per surface, so the diff reviews as
two independent passes rather than one entangled diff:

- Commit 1: catalog adds. New Documentation drift section in
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  with four audit entries.
- Commit 2: checklist removes. Four items removed from
  [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md);
  no other content change in the file. PR body cites Commit 1
  as the matching surface so a reviewer can see the
  consolidation pair without reading both commits in series.

**PR 2.** Single commit — in-place trap revision in
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
is one cohesive unit and splitting it would obscure the
revision-not-addition pattern.

**Close-out PR.** Single commit (the bookkeeping unit). Opens
immediately after the last implementing PR merges per the
Parallel-implementing-PRs exception named in the Contracts
preamble.

## Documentation Currency

This plan touches no canonical docs with status-oriented
sections (`Current State`, `Current status`, rollout status,
phase status). The catalog and discipline checklist have no
status sections; the planning rule has no status sections; the
plan doc itself carries the only Status block, and its flip is
already named in the Contracts preamble.

The Planning Depth documentation-current-state gate is
satisfied N/A — no canonical-doc status synchronization is
load-bearing on this plan's implementation. The "no canonical
docs change" claim in [Goal](/docs/plans/drift-prevention.md)
is the load-bearing assertion for this gate; if a future
implementing PR turns out to need a canonical-doc touch (e.g.,
the Doc Ownership table needs a row for a new top-level doc),
that's an estimate deviation per the PR-body callout, not a
doc-currency miss.

## Validation Gate

For each implementing PR (PR 1, PR 2):

- [`npm run lint`](/package.json) passes.
- [`npm run build:web`](/package.json) and
  [`npm run build:site`](/package.json) pass — the repo's
  standard validation gate per
  [`docs/dev.md`](/docs/dev.md) and the PR template, even
  though this is documentation-only work.

For PR 1 specifically:

- The four removed checklist items are not silently moved
  elsewhere in the checklist or the catalog under different
  names; consolidation means the item exists in exactly one
  place after the change.
- The new Documentation drift section's entries follow the
  catalog's existing Trigger / Check / Example layout.

For PR 2 specifically:

- The revised trap prose preserves the load-bearing intent of
  the existing subset-enumerated example list (privilege
  types, error classes, role names); a reader landing on the
  revised entry without seeing the diff can recognize the
  original shape's coverage.
- The PR body cites the A1 (b) justification (revision, not
  addition) per
  [`AGENTS.md`](/AGENTS.md) "Rule additions in `docs/agents/`".

For the follow-up close-out PR (per the
Parallel-implementing-PRs exception):

- This plan's Status flips `In progress → Landed`.
- The sibling scoping doc is deleted.
- The parent backlog entry is removed from
  [`docs/backlog.md`](/docs/backlog.md).
- The PR opens immediately after the last implementing PR
  merges; the drift window between merge and close-out PR
  opening should be on the order of minutes.

This is documentation-only work; no new tests, no new CI
checks. The Validation Gate is fully pre-merge — no
post-release validation check that would route this plan into
the two-phase landing exception in
[`Plan-to-PR Completion Gate`](/docs/agents/planning/plan.md).

## Self-Review Audits

For both implementing PRs:

- **Plan-doc review stance** per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md):
  the PR body carries the canonical Review Stance section.
- **Verified-by walk** per
  [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md):
  every load-bearing claim about the codebase or supporting
  services in the new audit entries (PR 1) or revised trap
  (PR 2) carries an inline citation to a code path or markdown
  section anchor.
- **Contract-altitude audit** per the first Cross-Cutting
  Invariant: each new Trigger is read against the
  category-altitude bar before commit; carrier-file
  enumeration is verified to live in Check, not in Trigger.

For PR 1 specifically:

- **Consolidation-completeness check.** For each removed
  checklist item, the implementing PR confirms the
  corresponding audit covers the item's full original scope
  (or the PR body names the partial-coverage carve-over). A
  removed item whose audit covers only part of its prose
  scope is a coverage gap, not a consolidation.

For PR 2 specifically:

- **Revision-not-addition check.** A reader who reads only
  the revised trap entry can identify both sub-shapes; the
  revision does not silently expand the trap's coverage
  beyond what the prose names.

## Out Of Scope

- **Forward-looking rule-gap audits.** The scoping doc's
  proposed migration-semantics-changed, new-migration,
  new-feature-route, and new-top-level-doc audits are not
  added by this plan. The catalog's
  [`Contributing`](/docs/self-review-catalog.md) gate is an
  OR: either two-or-more distinct PRs flag the class, or a
  single P1-severity finding has a clearly generalizing root
  cause. Both arms are technically reachable for these four
  classes — the corrections-plan PR series could be read as
  multiple distinct surfaces (first arm), or the 2026-05-11
  audit's findings could be read as P1-shaped with
  generalizing root causes (second arm). The deferral does
  not rest on either arm being unreachable; it rests on the
  meta-argument that invoking either arm to land four
  simultaneous forward-looking audit-adds is the
  gate-relaxation shape
  [`Agentic Practice Roadmap`](/docs/tracking/agentic-practice-roadmap.md)
  Bet 2 / Bet 3 framing names as the rule-density compounding
  failure mode. Honest satisfaction in the spirit of the
  Contributing gate waits for a second canonical-doc drift
  incident produced by genuinely different work, at which
  point either arm of the OR fires unambiguously and a
  follow-up plan adds whichever audit's class actually
  recurred. The classes are noted here so a future planner
  inherits the framing rather than re-deriving it.
- **CI-side grep gates and tooling.** A future effort may
  wire grep gates for the most mechanical of the deferred
  audits (new-top-level-doc and validation-command coupling
  are the strongest candidates); scoping that effort is not
  bound by this plan. The roadmap's diagnosis at
  [`Diagnosis (2026-05-07)`](/docs/tracking/agentic-practice-roadmap.md)
  "What is going less well" specifically calls out cases
  where a rule is the answer to what should be a code-side
  change — for these mechanical triggers, a grep gate is the
  cleaner shape than a catalog audit, and locking the audit
  shape now would foreclose that option.
- **Correcting any remaining canonical-doc drift.** The
  sibling corrections plan owns that surface.
- **Restructuring the catalog's existing sections, renaming
  existing audits, or dropping any existing audits.** The new
  Documentation drift section is additive; existing
  sections and entries are unchanged. The four checklist
  removals are the only retirements; remaining checklist
  items stay.
- **Sweeping the discipline checklist for other items that
  could be promoted to catalog audits.** Items the catalog
  audits in PR 1 do not cover (UX-facing flow changes,
  module-boundary additions, current-vs-target framing,
  shared-barrel-file documentation) stay in the checklist as
  periodic-review items; their promotion (or not) is a
  separate future scoping question.

## Risk Register

- **Removed checklist items leave a coverage gap.** A
  checklist item's prose may cover more than the catalog
  audit that promotes from it (the "routes, trust
  boundaries, or runtime ownership" item names three triggers;
  the catalog audit cleanly covers only the routing-config
  trigger). Mitigation: the PR 1 consolidation-completeness
  check above runs at commit time; the PR body names any
  partial-coverage carve-over and either tightens the audit
  to cover the gap or keeps the checklist item with the
  uncovered portion retained.
- **The trap revision in PR 2 reads as a net-new rule.**
  Generalizing an existing trap to cover an additional shape
  is structurally different from adding a sibling trap, but
  the revised prose may read as both shapes being "new" to a
  reviewer unfamiliar with the original. Mitigation: PR 2's
  body cites the original trap's existing prose as the
  revision baseline (a `git diff` view shows the in-place
  edit); the revision-not-addition self-review check above
  runs before commit.
- **Deferring the rule-gap audits loses prevention coverage
  for findings F2-F6 and F13.** The corrections plan fixed
  those findings; the prevention surface for those classes
  remains gapped until a second incident triggers the
  add-criterion honestly. Mitigation: accepted state. The
  alternative (adding the audits forward-looking on weak
  Contributing-gate satisfaction) imports exactly the
  compounding failure mode the roadmap diagnoses; the
  trade-off is a one-class-incident regression risk against
  ~four entries of additive rule-density.
- **Checklist item removals are reverted by a future
  contributor who reads the catalog audit and thinks the
  checklist should still carry the reminder.** Mitigation: the
  removed items are documented in PR 1's body with the
  promoting audit named, which becomes durable git history once
  PR 1 lands. A future audit pass that wants the checklist to
  re-acquire the item can read the PR history.

## Resolved Decisions

The four open decisions the sibling scoping doc handed off,
with resolutions updated against the
[`Agentic Practice Roadmap`](/docs/tracking/agentic-practice-roadmap.md):

1. **Grain-gap surface destination → revise the existing
   trap in
   [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
   "Plans describe contracts, not implementation".** The
   prior draft proposed a new sibling trap; reframing as a
   generalization of the existing
   "Subset enumerated where the contract names a category"
   trap satisfies the A1 (b) "no retirement because no
   addition" path under
   [`AGENTS.md`](/AGENTS.md) "Rule additions in
   `docs/agents/`" — the existing trap covers the broader
   failure mode (contract descent below the right altitude)
   once the content-prescribed shape is folded in.
2. **Forward-looking rule-gap adds → defer all four.** The
   prior draft argued the corrections-plan PRs constituted
   two distinct flagged surfaces; revisiting under the
   roadmap's Bet 3 framing, that argument is the
   gate-relaxation shape the bet exists to catch. Honest
   satisfaction waits for a second canonical-doc drift
   incident. The four classes are named in Out Of Scope.
3. **PR decomposition → two implementing PRs.** PR 1 is the
   catalog-plus-checklist consolidation (both surfaces land
   together because the partial state is the additive trap);
   PR 2 is the planning-rule revision. The third
   implementing PR the prior draft proposed (rule-gap catalog
   adds) drops out with Decision 2.
4. **Catalog section grouping → new "Documentation drift"
   section.** Unchanged from the prior draft. The four
   enforcement-gap promotions cluster as a class that does
   not fit any existing code-surface section.

## Backlog Impact

The Tier 5 backlog entry "Pre-push drift-prevention surfaces
anchor on intended product state and right-grain contracts" at
[`docs/backlog.md`](/docs/backlog.md) is the parent of this
plan. Its `Detail:` line was updated from `TBD` to point at
this plan in the plan-drafting PR; the entry itself is removed
in the follow-up close-out PR per the
Parallel-implementing-PRs exception in
[`Plan-to-PR Completion Gate`](/docs/agents/planning/plan.md).

No other backlog entries are affected.

## Related Docs

- [`docs/plans/scoping/drift-prevention.md`](/docs/plans/scoping/drift-prevention.md)
  — sibling scoping doc; deleted in the follow-up close-out
  PR.
- [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
  — sibling corrections plan; its findings are the historical
  examples each new audit's Example field cites.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — edited in PR 1; gains the new Documentation drift
  section.
- [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
  — edited in PR 1; four items removed.
- [`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
  — edited in PR 2; existing trap revised in place.
- [`docs/tracking/agentic-practice-roadmap.md`](/docs/tracking/agentic-practice-roadmap.md)
  — the roadmap that informed the consolidation reframe;
  this plan is designed to produce a Bet 2 numerator entry.
- [`AGENTS.md`](/AGENTS.md) "Rule additions in
  `docs/agents/`" — the A1 convention PR 2's PR body cites.
- [`docs/backlog.md`](/docs/backlog.md) — parent backlog
  entry; `Detail:` pointer updated in this plan's opening
  PR, entry removed in the follow-up close-out PR.
