# Scoping — Drift-Prevention Surfaces

## Context

The 2026-05-11 audit of the top-level canonical docs surfaced 13
findings of mechanical inaccuracies and editorial drift (the
findings are enumerated in
[`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
"Why This Plan"). The corrections plan is in flight — its PR 1
landed factual corrections for several findings (Vercel topology,
migration inventory, lock semantics, `deno check` Edge Function
list) but does not address why the pre-push surfaces — the named-
audit catalog at
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) and
the discipline list at
[`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
— did not fire on any of the findings.

This scoping doc classifies the findings against three gap
classes (enforcement-gap, rule-gap, grain-gap), names the open
decisions plan-drafting needs to make, and hands off a recommended
plan structure for the catalog updates (or other-surface updates)
that follow. The Tier 5 backlog entry
"Pre-push drift-prevention surfaces anchor on intended product
state and right-grain contracts" in
[`docs/backlog.md`](/docs/backlog.md) is the parent.

The quality bar this scoping anchors on, restated from the
backlog entry: "does the doc describe the intended product state
correctly, and does any plan-doc contract specify the right
grain?" Cross-doc consistency is a tripwire, not the bar.
Matching docs encode wrong state just as easily as right; the
authoritative source (SQL migrations, route configs, code) plus
named design intent (policy comments, commit messages, plan docs)
is what audit triggers and checks point at.

## Decisions made at scoping time

### Three gap classes are the right taxonomy

The findings split three ways: a rule exists but did not fire
(**enforcement-gap**); no rule covers the trigger (**rule-gap**);
or a plan-doc contract prescribes content rather than shape
(**grain-gap**). The first two distinguish how a future drift
surface gets prevented (promote an existing rule vs. add a new
one). The third names a different failure-mode class — content-
shaped plan-doc contracts carry the same factual exposure as the
doc text they prescribe.

Verified by: the rule layer at
[docs/self-review-catalog.md "Contributing"](/docs/self-review-catalog.md)
distinguishes "exists and didn't fire" from "doesn't exist" via
its add-criterion ("flagged on two or more distinct PRs" vs. a
new entry); and the corrections plan's feedback-feature contract
at
[docs/plans/docs-canonical-corrections.md "PR 2 — Feedback feature documentation"](/docs/plans/docs-canonical-corrections.md)
explicitly contracts shape-not-content discipline ("RLS and grant
posture described per-table per-role from the post-hardening
state"), illustrating the grain-gap class.

### Finding classification

F1–F13 numbered in the order they appear in the corrections
plan's "Why This Plan" section. Classification rests on the
natural reading of the existing rule prose cited; the rationale
sentence in each entry names what the rule covers and where the
audit gap lives.

- **F1 — README vs. architecture Vercel-topology mismatch.**
  Enforcement-gap. The "Keep Docs Coupled To Code Changes" item
  on routes / trust boundaries / runtime ownership covers the
  trigger but lives at periodic-review altitude, not push-time.
  Verified by:
  [docs/tracking/documentation-quality-checklist.md "Keep Docs Coupled To Code Changes"](/docs/tracking/documentation-quality-checklist.md).
- **F2 — slug-lock prose describes wrong trigger.** Rule-gap. No
  existing rule covers "SQL migration changes trigger or
  constraint semantics → check `docs/architecture.md` for prose
  describing prior semantics." Verified by absence: the
  discipline checklist's
  [Keep Docs Coupled To Code Changes](/docs/tracking/documentation-quality-checklist.md)
  items name routes, validation commands, UX flows, and module
  boundaries — not data-model invariants in prose.
- **F3 — event-code lock prose describes wrong trigger and
  omits the entitlements-guard arm.** Rule-gap. Same shape as
  F2, with the additional both-arms-named-separately failure
  mode: when the corrected shape is an OR over two named
  conditions, prose that names one without the other reads as
  canonical even when stale.
- **F4 — `architecture.md` migration inventory stops at an old
  migration.** Rule-gap. No existing rule covers
  "new SQL migration → check inventory list in
  `docs/architecture.md`." Closely related to but distinct from
  [`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md),
  which targets grants and policies, not the file-level
  inventory.
- **F5 — feedback feature undocumented in `product.md`.** Rule-
  gap. No existing rule covers "new shipped feature route →
  product doc carries a description sourced from the route file
  and supporting migrations."
- **F6 — feedback feature undocumented in `architecture.md`.**
  Rule-gap. Companion to F5 on the architecture surface; same
  trigger.
- **F7, F8, F9 — `deno check` Edge Function list incomplete in
  `dev.md`, `testing.md`, `README.md`.** Enforcement-gap. The
  "when validation commands, CI behavior, or local setup change,
  update `docs/dev.md`, `docs/testing.md`, and any affected
  workflow docs together" item naturally covers adding new
  `deno check` targets — a new entry in the validation-command
  list IS a validation-command change. The rule exists; it lives
  at periodic-review altitude. (Reclassified from rule-gap after
  review feedback on the original scoping doc; the prior reading
  artificially narrowed the rule to renames.) Verified by:
  [docs/tracking/documentation-quality-checklist.md "Keep Docs Coupled To Code Changes"](/docs/tracking/documentation-quality-checklist.md).
- **F10 — `testing.md` missing `npm run build:site`.**
  Enforcement-gap. Same rule as F7-F9; `build:site` shipped in
  `dev.md` and `README.md` but not `testing.md`.
- **F11 — `architecture.md` and `dev.md` carry duplicated
  coverage on three topics.** Enforcement-gap. The
  [docs/README.md](/docs/README.md) "Editing Rule Of Thumb" and
  the discipline-checklist item "Check whether docs duplicate
  the same procedure in multiple places instead of linking to
  one canonical owner" both fire on this class in principle.
  Verified by:
  [docs/tracking/documentation-quality-checklist.md "Review Checklist For Future Doc Passes"](/docs/tracking/documentation-quality-checklist.md).
- **F12 — internal phase identifiers in `architecture.md`,
  `dev.md`, `README.md`.** Enforcement-gap with overlap into
  rule-gap. The existing item on "future / later / next"
  language covers the same family but not phase identifiers
  specifically; a single audit covers both shapes under one
  trigger. Verified by:
  [docs/tracking/documentation-quality-checklist.md "Review Checklist For Future Doc Passes"](/docs/tracking/documentation-quality-checklist.md).
- **F13 — doc index omits four active top-level docs.** Rule-
  gap. No existing rule covers "new top-level `.md` directly
  under `docs/` → add to the Doc Ownership table in
  `docs/README.md`."

Summary: F1, F7-F12 are enforcement-gap (rule exists, didn't
fire at push time); F2-F6, F13 are rule-gap (no rule covers the
trigger); none classify as grain-gap retrospectively because the
findings live in canonical docs, not in plan-doc contracts.

### Audit shapes (handed off as plan-structure inputs, not contracts)

The plan-drafter will lock contracts at audit-name / trigger /
check level; the shapes named here are scoping's input to that
drafting. Each shape names which finding(s) it covers and the
proposed trigger/check pattern, not the catalog entry's full
prose.

Enforcement-gap promotions (rule already exists; promote to
named audit so it fires at push time):

- Route or topology change → README / architecture / dev
  coupling audit (covers F1). Trigger pattern: commit touches
  Vercel rewrite / proxy config or Next.js routing config in
  either app. The catalog-update PR enumerates the carrier
  files at audit-Check altitude; scoping describes the category
  per the
  [Subset-enumerated-where-the-contract-names-a-category trap](/docs/agents/planning/shared.md)
  in shared.md "Plans describe contracts, not implementation."
- Validation-command coupling audit (covers F7-F9 and F10).
  Trigger pattern: commit adds, renames, or removes an entry in
  the documented validation-gate command list — including
  adding new `deno check` targets when a new
  `supabase/functions/<name>/` directory ships.
- Canonical-owner duplication audit (covers F11). Trigger
  pattern: commit adds or expands prose in
  `docs/architecture.md` or `docs/dev.md` on a topic already
  covered in the other.
- Phase-identifier and target-state-language audit (covers
  F12). Trigger pattern: commit edits an evergreen "what is"
  surface; check for phase identifiers (`M[0-9] phase`,
  `Phase [0-9A-Z]`) plus future-tense language ("future,"
  "later," "next") under one trigger.

Rule-gap new audits (no rule today; new entry warranted under
catalog Contributing if the destination is the catalog —
see Open decision 1 below):

- Migration-semantics-changed → architecture-prose audit
  (covers F2, F3). Trigger pattern: new SQL migration creates,
  alters, or drops a trigger / constraint / RLS policy / RPC
  that supersedes prior semantics. Both arms of OR-composed
  triggers named separately.
- New-migration → architecture-inventory audit (covers F4).
  Trigger pattern: new file under `supabase/migrations/`;
  check whether any inventory list in `docs/architecture.md`
  carries it.
- New-feature-route → product-and-architecture-coverage audit
  (covers F5, F6). Trigger pattern: new route file under
  `apps/site/app/` or `apps/web/src/` representing a feature.
- New-top-level-doc → doc-index audit (covers F13). Trigger
  pattern: new `.md` directly under `docs/` (depth 1); check
  it appears in the Doc Ownership table.

Grain-gap proposal stays at "name the failure-mode class," not
a pre-resolved audit-add — see Open decision 1.

## Open decisions to make at plan-drafting

These decisions are deferred to plan-drafting rather than
resolved here, either because they depend on contracts the
plan-drafter locks or because pre-resolving them now would
import process commitments the future task plan can't yet bind.

1. **Grain-gap surface destination.** The grain-gap failure
   mode (plan-doc contracts prescribing content rather than
   shape) needs a named pre-push surface, but the destination
   isn't pre-decided. Candidates: a named audit in
   [`docs/self-review-catalog.md`](/docs/self-review-catalog.md);
   a discipline-list entry in
   [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md);
   a new rule in [`docs/agents/planning/`](/docs/agents/planning/)
   (likely [`shared.md`](/docs/agents/planning/shared.md) under
   the existing "Plans describe contracts, not implementation"
   rule, as a recurring trap). Plan-drafter picks at lock time.
   The catalog Contributing gate
   ([docs/self-review-catalog.md "Contributing"](/docs/self-review-catalog.md))
   binds only if the catalog is chosen — under that gate, the
   plan-drafter must argue either that the corrections-plan PRs
   themselves constitute two distinct flagged surfaces (PR 1's
   migration prose corrections + PR 2's explicit shape-not-
   content contract) or accept the gate as a blocker until a
   real plan-doc-level incident lands.
2. **Should prevention be added against a hypothetical class
   at all?** Distinct from the destination question: even if a
   surface fits, is forward-looking rule-addition warranted
   without a real incident? The catalog's Contributing rule
   answers "no" by default; the planning-rule destination
   answers "yes" by precedent (the trajectory-prescription
   trap was added prospectively after the structural-only rule
   accreted carve-outs). Plan-drafter decides; this scoping
   doesn't pre-resolve.
3. **PR decomposition for the catalog-side audits.** Single
   bundled PR per gap class? One PR per audit? Mixed? The
   plan structure handoff below names a recommended order; the
   plan-drafter picks the cut.
4. **Section grouping in the catalog.** Existing catalog
   sections are SQL migrations & RPCs, Frontend forms & save
   paths, Frontend lifecycle & async, CI & testing
   infrastructure, Operational scripts & runbooks, Edge
   Functions & deployment config. The new audits don't fit any
   cleanly — documentation drift is a new class. New
   "Documentation drift" section vs. extending an existing
   one? Plan-drafter decides.

## Plan structure handoff

These are scoping's inputs to plan-drafting, not contracts.
The plan-drafter may revise based on what surfaces during
plan-doc drafting.

- **Recommended decomposition order.** Tighten / promote
  existing rules to named audits first (enforcement-gap fixes
  for F1, F7-F12 — five proposed audits). Add new audits for
  rule-gap findings second (F2-F6, F13 — four proposed audits).
  Resolve the grain-gap open decisions third (separate plan or
  separate phase). The order is "lowest community-review
  novelty first" — enforcement-gap promotions are recognized
  rules; rule-gap audits are new; grain-gap is novel. Order is
  non-binding.
- **Single task plan vs. N≥2 phases.** Each audit could be a
  task plan, or each gap class could be a phase under one task
  plan, or all could be one task plan with phases-per-audit.
  Plan-drafter picks based on whether the catalog-update PRs
  share enough cross-cutting invariants to warrant the
  orchestration layer.
- **Implementation isn't catalog-only.** The grain-gap
  destination decision may route the rule to
  [`docs/agents/planning/`](/docs/agents/planning/) instead of
  the catalog; the plan-drafter shouldn't pre-commit catalog as
  the destination during plan-drafting.

## Reality-check inputs

These are the existing rule surfaces the plan-drafter will
verify against before locking contracts. Stale references
should be refreshed at plan-drafting time.

- [docs/tracking/documentation-quality-checklist.md "Keep Docs Coupled To Code Changes"](/docs/tracking/documentation-quality-checklist.md)
  — the discipline-checklist items several enforcement-gap
  fixes promote from.
- [docs/tracking/documentation-quality-checklist.md "Review Checklist For Future Doc Passes"](/docs/tracking/documentation-quality-checklist.md)
  — periodic-review items overlapping with F11 (duplication)
  and F12 (future-tense language).
- [docs/self-review-catalog.md "Contributing"](/docs/self-review-catalog.md)
  — the add-criterion that binds if the grain-gap destination
  is the catalog.
- [docs/self-review-catalog.md "How to use"](/docs/self-review-catalog.md)
  — the Trigger / Check / Example shape new entries follow.
- [docs/README.md](/docs/README.md) "Editing Rule Of Thumb"
  — the duplication rule F11 promotes from.
- [docs/agents/planning/shared.md "Plans describe contracts, not implementation"](/docs/agents/planning/shared.md)
  — the rule the grain-gap class would extend if the
  destination is the planning rule set.
- [docs/plans/docs-canonical-corrections.md "Why This Plan"](/docs/plans/docs-canonical-corrections.md)
  — the 13 findings; classification rests on their current
  framing.
- [docs/plans/db-permissions-snapshot.md](/docs/plans/db-permissions-snapshot.md)
  — sibling effort targeting the source-of-truth layer for
  grants and policies; audits proposed here ride on whatever
  snapshot surface that effort lands.

The corrections-plan PR 1 landed factual corrections for F1,
F2, F3, F4, F7-F9 already; F5, F6, F10, F11, F12, F13 are
either still outstanding or covered by later corrections-plan
PRs in flight. The prevention work is forward-looking
regardless — the findings are historical examples whether or
not their canonical-doc state still carries the drift.
