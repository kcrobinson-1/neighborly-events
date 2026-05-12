# Drift-Prevention Surface Scoping

## Status

Proposed. Scoping pass over the 13 findings surfaced by the
2026-05-11 audit of the top-level canonical docs, classifying each
finding against three gap classes (enforcement-gap, rule-gap,
grain-gap) and naming the catalog updates the implementation PRs
should make. The scoping doc itself is the basis for one or more
catalog-update PRs; it does not implement those PRs. Closes out by
archiving in place at `docs/plans/drift-prevention-scoping.md`
(Status flipped to `Landed`) once the catalog-update PRs the doc
proposes have all merged.

## Goal

A future maintainer touching the surfaces named in the 2026-05-11
audit — Vercel topology, slug and event-code lock semantics, the
migration inventory, the feedback feature, the `deno check` Edge
Function list, the `build:site` validation command, deduplicated
`architecture.md`/`dev.md` topics, phase-identifier prose, and the
doc index — has a named self-review audit at push time that surfaces
the drift before review.

The audits ask "does the doc describe the intended product state
correctly, and does any plan-doc contract specify the right grain?"
— not "do the canonical docs say the same things as each other?" The
authoritative source (SQL migrations, route configs, code) plus
named design intent (policy comments, commit messages, plan docs) is
the quality bar; cross-doc consistency is a useful tripwire but
matching docs encode wrong state just as easily as right.

## Gap classes

**Enforcement-gap.** A rule exists (as a discipline-checklist item
in [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
or as embedded guidance in [`docs/agents/`](/docs/agents/) or
[`docs/README.md`](/docs/README.md)) but didn't fire on the actual
push that introduced the drift. Common cause: the rule lives where
it gets read at periodic-review time, not at every-commit time.
Fix: promote the rule to a named entry in
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) with
a concrete trigger and check so the audit fires on diffs that touch
the relevant surface.

**Rule-gap.** No rule today covers the trigger. Fix: add a new
self-review-catalog audit with trigger, check, and the 2026-05-11
audit as the past incident reference.

**Grain-gap.** Plan-doc contracts that prescribe content (a
specific SQL fragment, a specific posture string, a specific prose
line) rather than shape (per-table per-role described from
migrations; both arms of an OR-composed trigger named separately).
Content-shaped contracts carry the same factual exposure as the
doc text they prescribe and defer no verification work to PR-review
time, where SQL-level fact-checking belongs. None of the 13
findings classify as grain-gap retrospectively — they live in
canonical docs, not in plan-doc contracts — but the class is the
durable failure mode the corrections plan's feedback-feature
contract names by example ("posture described per-table per-role
from the migrations") and the in-place sibling effort at
[`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md)
targets at the source-of-truth layer. The catalog should carry an
audit that flags content-shaped clauses in plan-doc PRs.

## Per-finding classification

Findings are numbered F1–F13 in the order they appear in the
"Why This Plan" section of
[`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md).
Each finding is classified with the existing rule that should have
fired (for enforcement-gap) or marked as rule-gap where no
existing rule covers it. A finding may carry more than one class
when it has more than one failure mode.

- **F1 — README and architecture describe opposite Vercel
  topologies.** Class: enforcement-gap. The discipline-checklist
  item "when routes, trust boundaries, or runtime ownership
  change, update `README.md`, `docs/architecture.md`, and
  `docs/dev.md` in the same pass"
  ([`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
  "Keep Docs Coupled To Code Changes") should have fired when the
  Vercel topology flipped to apps/site-canonical. The rule lives
  in a periodic-review checklist, not in the named self-review
  catalog, so it does not fire reliably on the push that
  introduces the change.

- **F2 — `architecture.md` slug lock prose describes wrong
  trigger.** Class: rule-gap. No rule today covers "new SQL
  migration changes trigger or constraint semantics → check
  `architecture.md` for prose that describes the prior semantics."
  The discipline-checklist item on routes/trust/runtime is scoped
  narrower than data-model invariants described in prose.

- **F3 — `architecture.md` event-code lock prose describes wrong
  trigger and omits the entitlements-guard arm.** Class: rule-gap.
  Same shape as F2 and additionally illustrates the
  *both-arms-named-separately* failure mode: the corrected shape
  has two trigger conditions joined by OR, and prose that names
  one without the other reads as canonical even when stale. A
  grain-gap-style rule on plan-doc contracts would have flagged
  this if the prose had been introduced via a plan-doc clause;
  here the prose lived directly in `architecture.md`, so the
  rule-gap framing is primary.

- **F4 — `architecture.md` migration inventory stops at an old
  migration.** Class: rule-gap. No rule today covers "new SQL
  migration → check inventory listing in `architecture.md`." This
  is the table-of-contents shape of drift: the inventory grows
  but no audit fires when a migration lands without an inventory
  entry. Closely related to the sibling effort in
  [`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md)
  but distinct — the snapshot effort targets grant and policy
  state, not the file-level migration index.

- **F5 — feedback feature undocumented in `product.md`.** Class:
  rule-gap. No rule today covers "new shipped feature route
  → product doc carries a description sourced from the route file
  and supporting migrations." The closest existing rule is the
  discipline item on local readmes, which is about module-level
  ownership, not product-doc coverage.

- **F6 — feedback feature undocumented in `architecture.md`.**
  Class: rule-gap. Companion to F5 on the architecture surface.
  Triggers the same way (new feature → architecture doc carries
  shape, RLS posture, RPC indirection rationale). Fits as the
  same audit as F5 if the trigger is "new feature route file
  under `apps/site/` or `apps/web/`," with the check walking both
  `product.md` and `architecture.md` for coverage.

- **F7 — `deno check` Edge Function list incomplete in `dev.md`.**
  Class: rule-gap with overlap into enforcement-gap. No rule
  today covers "new directory under `supabase/functions/` →
  validation-gate command list updated wherever the list
  appears." The discipline-checklist item on "validation commands
  change" is narrowly about renamed or restructured commands, not
  new validation-gate entries; the practical effect is the same
  drift, so promotion of the validation-coupling item is one fix
  path and a new dedicated audit is the other.

- **F8 — `deno check` Edge Function list incomplete in
  `testing.md`.** Class: same as F7. A single audit covers F7,
  F8, and F9 if the check walks every doc that carries the
  validation-gate list rather than enumerating the carriers
  inline.

- **F9 — `deno check` Edge Function list incomplete in
  `README.md`.** Class: same as F7 and F8.

- **F10 — `testing.md` missing `npm run build:site`.** Class:
  enforcement-gap. The discipline-checklist item "when validation
  commands, CI behavior, or local setup change, update
  `docs/dev.md`, `docs/testing.md`, and any affected workflow
  docs together" should have fired when `build:site` was added.
  `dev.md` and `README.md` got the addition; `testing.md` did
  not. Same shape as F1: the rule exists but lives where it does
  not fire on every push that introduces the change.

- **F11 — `architecture.md` and `dev.md` carry duplicated coverage
  of the Vercel routing layout, the Supabase Auth surface, and
  the `@supabase/ssr` cookie internals.** Class: enforcement-gap.
  The "Editing Rule Of Thumb" in
  [`docs/README.md`](/docs/README.md) and the
  discipline-checklist item "Check whether docs duplicate the
  same procedure in multiple places instead of linking to one
  canonical owner" both fire on this class of drift in principle.
  Both live in review-checklist locations rather than push-time
  audit locations, so they did not catch the duplication
  accreting across edits.

- **F12 — internal phase identifiers in `architecture.md`
  (13 hits), `dev.md` (12 hits), and `README.md` (5 hits).**
  Class: enforcement-gap with overlap into rule-gap. The
  discipline-checklist item "Check whether any 'future', 'later',
  or 'next' language should now be converted into either
  implemented behavior or an explicit open question" is the
  closest existing rule and would have fired on phase identifiers
  if it lived as a named audit — phase identifiers
  (`M[0-9] phase`, `Phase A.2a`, "Phase 4.5 deferred post-MVP")
  are project-tracking jargon in the same family as "later" /
  "next." The rule-gap arm: the existing item names future-tense
  language specifically; it does not name internal phase
  identifiers as a category. A named audit should cover both
  shapes — future-tense language *and* internal phase identifiers
  — under one trigger.

- **F13 — `docs/README.md` Doc Ownership table omits four active
  top-level docs.** Class: rule-gap. No rule today covers "new
  top-level `.md` directly under `docs/` → add to the Doc
  Ownership table in `docs/README.md`." The doc-index drift
  accretes one missing entry at a time across feature PRs; the
  only existing surface that would catch it is a periodic audit,
  not a push-time check.

## Per-class proposals

### Enforcement-gap fixes (F1, F10, F11, F12 enforcement arm)

The pattern: a discipline-checklist item is the right rule but
lives in
[`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
where it is read at periodic-review time, not at every-push time.
Fix: promote each item to a named entry in
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) with
trigger, check, and the 2026-05-11 audit as the past-incident
reference. The discipline-list item stays where it is; the catalog
entry is the load-bearing pre-push surface and the discipline-list
item remains the periodic-review fallback.

Audit-name-level proposals (not full entries):

- **Route or topology change → README/architecture/dev coupling
  audit** (covers F1). Trigger: a commit touches
  `apps/web/vercel.json`, `apps/site/next.config.ts`, the Vercel
  root config, or any other routing or proxy config. Check: walk
  `README.md`, `docs/architecture.md`, and `docs/dev.md` for prose
  that describes the topology being changed; either update in the
  same commit or defer with a named follow-up.
- **Validation-command coupling audit** (covers F10). Trigger: a
  commit adds, renames, or removes an entry in the documented
  validation-gate command list (whether in `package.json`
  scripts, CI workflows, or doc-side `deno check` / `npm run`
  lists). Check: walk every doc that carries the validation-gate
  list and confirm the list matches the new state.
- **Canonical-owner duplication audit** (covers F11). Trigger: a
  commit adds or expands prose in `docs/architecture.md` or
  `docs/dev.md` covering a topic that already has prose in the
  other doc. Check: grep both files for the topic identifier; if
  both carry coverage, name one owner and convert the other to a
  link.
- **Phase-identifier and target-state-language audit** (covers
  F12). Trigger: a commit edits an evergreen "what is" surface
  (the root `README.md`, `docs/architecture.md`, `docs/dev.md`,
  or any other canonical doc that describes current state rather
  than rollout plans). Check: grep the diff for internal phase
  identifiers (`M[0-9] phase`, `Phase [0-9A-Z]`, `Phase A.2a`),
  future-tense language ("future," "later," "next"), and other
  rollout-tracking artifacts; convert each to either
  implemented-behavior prose or an open-question reference. The
  plan-doc surfaces under `docs/plans/` and `docs/tracking/` are
  explicitly out of scope — phase identifiers belong there.

### Rule-gap audits (F2, F3, F4, F5, F6, F7, F8, F9, F12 rule-gap arm, F13)

New named entries in
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md).
Each proposal below names the trigger and check at the level of
detail the implementation PR needs to draft the full entry against
the catalog's existing Trigger / Check / Example shape, with the
2026-05-11 audit as the past incident:

- **Migration-semantics-changed → architecture-prose audit**
  (covers F2, F3). Trigger: a commit adds a new SQL migration
  that creates, alters, or drops a trigger, constraint, RLS
  policy, or RPC body that supersedes prior semantics. Check:
  grep `docs/architecture.md` for prose that describes the prior
  semantics; either update in the same commit, defer with a named
  follow-up, or note that the prose intentionally describes the
  relaxed shape. The check applies to both arms of an
  OR-composed trigger: if the corrected shape has two named
  conditions joined by OR, both must be named in the doc prose
  (this covers F3's missing entitlements-guard arm).
- **New-migration → architecture-inventory audit** (covers F4).
  Trigger: a commit adds a file under `supabase/migrations/`.
  Check: confirm the migration appears in any inventory or
  index-style list in `docs/architecture.md`. If the inventory
  carries a stop-line (e.g., "through `<filename>`"), update it
  to the new last migration. Closely related to the sibling
  [`db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md)
  effort, but distinct — the snapshot effort targets grant and
  policy state, not the file-level migration index.
- **New-feature-route → product-and-architecture-coverage audit**
  (covers F5, F6). Trigger: a commit adds a new route file under
  `apps/site/app/` or `apps/web/src/` that represents a new
  attendee- or organizer-visible feature (not a sub-route of an
  existing feature). Check: walk `docs/product.md` and
  `docs/architecture.md` for coverage of the feature; if neither
  carries it, name the owning doc and add a description sourced
  from the route file and supporting migrations or Edge
  Functions.
- **New-Edge-Function → validation-gate-list audit** (covers F7,
  F8, F9). Trigger: a commit adds a new directory under
  `supabase/functions/` other than `_shared`. Check: walk every
  doc that carries a `deno check` (or equivalent Edge Function
  validation) command list and confirm the new function is
  named. The illustrative carriers today are `docs/dev.md`,
  `docs/testing.md`, and `README.md`; the check walks whatever
  set exists at audit time rather than enumerating them inline.
- **New-top-level-doc → doc-index audit** (covers F13). Trigger:
  a commit adds a new `.md` file directly under `docs/`
  (depth 1 only; `docs/agents/`, `docs/plans/`, `docs/tracking/`,
  and other subtrees are out of scope). Check: confirm the new
  doc appears in the Doc Ownership table in
  [`docs/README.md`](/docs/README.md). Past incident: the
  2026-05-11 audit found four omissions (`redemption-design.md`,
  `styling.md`, `testing-tiers.md`, `backlog.md`).

The F12 rule-gap arm is folded into the phase-identifier audit
proposed under enforcement-gap fixes above: the trigger covers
both future-tense language (the existing rule's wording) and
internal phase identifiers (the rule-gap extension).

### Grain-gap audit (forward-looking)

A new named entry in
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md).
Lives under a new section grouping for plan-doc contracts or
under existing planning-related guidance — the implementation
PR's choice.

- **Plan-doc contract grain audit.** Trigger: a commit edits a
  doc under `docs/plans/**` (plan, scoping, milestone, epic) and
  the diff introduces a Contract / Cross-Cutting Invariant /
  Validation Gate clause that names a specific SQL fragment,
  posture string, or other content-shaped artifact whose accuracy
  would be checkable against code. Check: re-phrase the clause to
  describe shape, not content. Rewrite shapes: "anon and
  authenticated both revoked on table X" becomes "describe
  per-table per-role posture from the post-hardening migrations";
  "the trigger fires while the event is currently live OR while
  any `game_entitlements` row exists" becomes "name both trigger
  arms separately; do not inline the predicate"; "the RPC body
  returns a specific column name" becomes "name the failure-mode
  column read by the RPC; do not inline the identifier." The rule
  covers any clause whose accuracy a future PR reviewer would
  need SQL or code in front of them to confirm — exactly the
  verification PR review is structured to perform on the
  implementing PR, not on the plan doc itself.

No plan-doc-level past incident is named today; the rule is added
prospectively because the 2026-05-11 audit illustrated the class
of risk in canonical docs and the same shape is the failure mode
the corrections plan's feedback-feature contract explicitly
avoids.

## Anchoring framing reminder

Catalog updates inheriting from this scoping doc should be
anchored on the quality bar named in the
[`docs/backlog.md`](/docs/backlog.md) entry: "does the doc
describe the intended product state correctly, and does any
plan-doc contract specify the right grain?" Cross-doc consistency
is a tripwire, not the bar. Matching docs encode wrong state just
as easily as right; the authoritative source (SQL migrations,
route configs, code) plus named design intent (policy comments,
commit messages, plan docs) is the actual quality bar.

The audit triggers and checks proposed above point at
authoritative sources by design — migration files, route config
files, Edge Function directories, `package.json` — not at
sibling-doc state. A future implementer drafting the catalog
entries should resist re-framing checks as "compare doc A and
doc B for match"; the check shape is "open the source-of-truth
file and confirm the doc carries its current state." The
canonical-owner duplication audit is the one exception — its
trigger genuinely is cross-doc duplication — and that audit's
check still names the source-of-truth call ("name one owner and
convert the other to a link") rather than treating matching prose
as the success state.

## Implementation sequencing

The catalog-update PRs should land in this order. The ordering is
an estimate of the path of least review friction, not a hard
prerequisite chain — a later PR can land out of order if the
implementer judges the dependency is loose.

1. **Tighten existing checklist items first.** The four
   enforcement-gap audits (F1, F10, F11, F12 enforcement arm)
   ship as promotions of existing rules. They carry the lowest
   community-review novelty because each is a named version of a
   rule the team already operates against. Bundling all four
   into one PR is acceptable if the scope stays under a single
   reviewable diff; splitting per-audit is also acceptable.
2. **Add new audits for rule-gap findings.** F2/F3, F4, F5/F6,
   F7/F8/F9, F12 rule-gap arm, and F13. Each audit is genuinely
   new and benefits from being reviewable on its own merits. Per
   the catalog's Contributing rule, each new audit carries
   trigger, check, and an example reference; the 2026-05-11
   audit is the example for every entry.
3. **Add the grain-gap audit last.** It is the newest rule in
   the set — no existing rule covers the pattern, and plan-doc
   surfaces have a smaller corpus to validate the rule against.
   Landing it after the canonical-doc audits gives the rule
   shakedown time against ongoing plan-doc PRs before it binds
   future work.

## Out of scope

- Drafting the actual catalog entries. Triggers and checks are
  named at proposal level only; the catalog-update PRs draft
  each entry against the catalog's existing Trigger / Check /
  Example shape.
- CI grep gates and tooling. The
  [`docs/backlog.md`](/docs/backlog.md) entry names CI-side
  enforcement as a parallel path, not a substitute. Mechanized
  triggers (a commit-hook grep that fires when a new file lands
  under `supabase/functions/` without a corresponding
  `deno check` list entry, for example) may be added separately;
  this scoping doc focuses on the human-readable catalog
  surfaces.
- Restructuring [`docs/agents/`](/docs/agents/) or rewriting the
  discipline list at
  [`documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md).
  The catalog updates proposed above add named audits without
  removing discipline-list items; the catalog surface is the
  load-bearing fix.
- Sibling efforts already in flight. The
  [`db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md)
  effort targets the source-of-truth layer for grants and
  policies; the audits proposed here ride on whatever snapshot
  surface that effort lands. The audits' triggers point at
  migration files today; if the snapshot effort lands a derived
  artifact, future revisions can re-anchor.

## Related docs

- [`docs/plans/docs-canonical-corrections.md`](/docs/plans/docs-canonical-corrections.md)
  — the corrections plan that captured the 13 findings.
  Sequenced ahead of this scoping doc so the corrections inform
  the prevention work.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — the named-audit catalog that gains the entries proposed
  here.
- [`docs/tracking/documentation-quality-checklist.md`](/docs/tracking/documentation-quality-checklist.md)
  — the discipline list that several of the enforcement-gap
  fixes promote from.
- [`docs/plans/db-permissions-snapshot.md`](/docs/plans/db-permissions-snapshot.md)
  — sibling prevention effort already scoped, targeting the
  source-of-truth layer.
- [`docs/backlog.md`](/docs/backlog.md) — the Tier 5 entry whose
  `Detail:` pointer this doc resolves.
