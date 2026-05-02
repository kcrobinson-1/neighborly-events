# Scoping — M1 phase 1.1 (apps/web ThemeScope wiring + cross-app theme-continuity check)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
absorbs into
[m1-themescope-wiring.md](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md);
durable per-phase content absorbs into
`docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md`.

## Phase summary

Phase 1.1 wraps the three apps/web event-route shells that do not
yet render under `<ThemeScope>` —
`/event/:slug/game`, `/event/:slug/game/redeem`, and
`/event/:slug/game/redemptions` — by extending
[apps/web/src/App.tsx](/apps/web/src/App.tsx)'s routing dispatcher
with the same wrap shape the per-event admin route already
carries. The wrap consumes the existing
[`getThemeForSlug`](/shared/styles/getThemeForSlug.ts) resolver,
so per-event Themes already in the registry (Harvest Block Party,
Riverside Jam) apply on apps/web for the test events; non-test
slugs continue to resolve to the platform Sage Civic Theme via
the resolver's existing fallback. The phase also runs the
cross-app theme-continuity check deferred from event-platform-
epic M3 phase 3.3, scoped to the two test events. Doc-currency
updates land in the same PR.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
code citation that proves the load-bearing claim. These
decisions are absorbed into the plan's contract sections and
out-of-scope list during plan-drafting; the deliberation prose
(rejected alternatives) lives here through scoping's transient
lifetime.

### 1. PR shape — single PR, no Tier 5 follow-up [Resolved → Option A]

**What was decided.** Whether 1.1 ships as one PR (wrap diff +
UI captures + cross-app continuity check + doc updates + Status
flips), as two PRs split along a "wrap / verification + closure"
seam mirroring M3 phase 3.3, as a per-event split (Harvest then
Riverside), or as a per-route split (game / redeem / redemptions
separately).

**Why it mattered.** AGENTS.md "PR-count predictions need a
branch test" requires the phase planning session to re-derive
the milestone-doc estimate against actual scope. The milestone
doc explicitly authorizes a 1.1.1 / 1.1.2 split as a fallback if
implementation surfaces unexpected blast radius; scoping has to
make the upfront call.

**Options considered.**

1. **Single PR (Option A).** All scope in one change.
2. **Two PRs along a code/verification seam (Option B).** 1.1.1
   ships the wrap diff + per-route per-event UI captures (warm-
   cream → Harvest, warm-cream → Riverside on each newly-wrapped
   route). 1.1.2 is doc-only, ships the cross-app continuity
   check + the doc-currency updates + Status flips. Inspired by
   M3 phase 3.3 (cross-app verification + M3 closure as its own
   PR).
3. **Per-event split (Option C).** 1.1.1 ships the wrap diff
   plus Harvest captures + Harvest cross-app pair; 1.1.2 ships
   Riverside captures + Riverside cross-app pair + doc updates
   + Status flips.
4. **Per-route split (Option D).** 1.1.1 game; 1.1.2 redeem;
   1.1.3 redemptions.

**Pros / cons.**

- *Option A.* Pro: smallest review-overhead total; reviewer sees
  wrap intent + visual proof + doc accuracy in one place; aligns
  with the M2 phase 2.2 precedent (admin wrap + token corrections
  shipped in one PR per
  [m2-admin-restructuring.md](/docs/plans/archive/m2/m2-admin-restructuring.md)
  Phase Status row 2.2). Con: if implementation surfaces
  unexpected token-correction blast radius, the PR grows past
  AGENTS.md branch-test thresholds and forces a mid-flight split.
- *Option B.* Pro: clean separation of code review (1.1.1) from
  doc-and-verification review (1.1.2); review attention focused
  on each concern. Con: the cross-app continuity check is doable
  in 1.1.1's Vercel preview deployment + production apps/site
  side-by-side (the wrap is what enables the check; nothing else
  blocks running it pre-merge), so 1.1.2 has no validation work
  that 1.1.1 cannot already perform; net cost is two review
  rounds for one cohesive change. The M3 phase 3.3 precedent
  doesn't apply: 3.3 carried substantive doc-update narrative
  (multi-theme rendering capability described in
  `docs/architecture.md` and `README.md`) plus a cross-app
  navigation walkthrough that exercised real cross-app session
  cookies — its PR-shape was driven by content size and a
  manual production walk-through, not by mechanical separation.
  M1's cross-app continuity check is a static visual comparison
  with no auth-cookie surface.
- *Option C.* Pro: explicit per-event review attention. Con: the
  wrap diff applies to *all* slugs simultaneously through
  `getThemeForSlug(matched.slug)`, so the wrap necessarily lands
  in 1.1.1 and 1.1.2 has no code change. Reduces to Option B
  with a different label.
- *Option D.* Pro: hypothetically smallest per-PR diff. Con: the
  three wraps share one `if`-block region in
  [App.tsx:35-65](/apps/web/src/App.tsx); splitting them across
  three PRs is artificial code-fragmentation for no review
  benefit. The mechanical wrap is reviewed as a single shape
  match against the existing admin wrap.

**Branch-test analysis (per AGENTS.md "PR-count predictions need
a branch test").**

Subsystems touched by Option A:
1. apps/web routing dispatcher
   ([App.tsx](/apps/web/src/App.tsx)).
2. Doc surface (`docs/styling.md`,
   `docs/architecture.md`, `README.md`,
   `docs/plans/event-platform-epic.md`,
   `docs/plans/epics/demo-expansion/epic.md`,
   `docs/plans/epics/demo-expansion/m1-themescope-wiring.md`).
3. Source-comment surface
   ([ThemeScope.tsx](/shared/styles/ThemeScope.tsx) wiring-sites
   list; [_tokens.scss](/apps/web/src/styles/_tokens.scss) header
   comment if it claims the deferred-wiring invariant).

Three subsystems is well below the AGENTS.md ">5 distinct
subsystems" split threshold. LOC: wrap diff is ~12 lines of JSX
(three near-mirror copies of the admin wrap on
[App.tsx:24-31](/apps/web/src/App.tsx)); doc updates are
sentence-level rewrites at known paragraphs; comment updates
are localized. Total substantive logic well below the ">300 LOC"
threshold.

**Came down to.** Whether the cross-app continuity check truly
requires a deployed-only seam. It does not — Vercel preview
deployments build the production bundle of apps/web, the wrap is
a pure JSX change with no proxy/CDN configuration impact, and
the continuity comparison is "apps/site `/event/<slug>` (prod)
vs apps/web `/event/<slug>/game` (PR preview)" which is
performable pre-merge. Without a real deployed-only seam, Option
B is overhead without value.

**Resolution.** **Option A (single PR).** The plan binds the
Vercel preview deployment as the apps/web side of the cross-app
continuity comparison, with production apps/site as the
apps/site side. Status flips Proposed → Landed in the single PR
per AGENTS.md "Plan-to-PR Completion Gate," not via a Tier 5
in-progress-pending pattern.

**Fallback authorization.** If implementation surfaces token-
correction blast radius beyond a reasonable in-PR review surface
— operationally defined as >5 component files needing token
fixes, or >100 LOC of `_tokens.scss` / SCSS partial edits, or
classification corrections that ripple into `docs/styling.md`'s
Themable / Structural table beyond a row tweak — the implementer
splits along an Option B seam mid-flight: 1.1.1 ships the wrap
+ token corrections + per-route per-event captures; 1.1.2 ships
cross-app continuity + doc updates + Status flips. This
authorization is named here so the implementer doesn't relitigate
the call under review pressure. The pre-implementation
expectation is one PR; the M2 phase 2.2 admin-wrap precedent
puts probability strongly on that side.

**Verified by:**
[App.tsx:24-31](/apps/web/src/App.tsx) (existing admin wrap,
the shape new wraps mirror);
[App.tsx:35-65](/apps/web/src/App.tsx) (the three unwrapped
return statements);
[m2-admin-restructuring.md Phase Status](/docs/plans/archive/m2/m2-admin-restructuring.md)
(M2 phase 2.2 shipped admin wrap as a single PR — #113/#114
listed against the umbrella plan in the Phase Status table).

### 2. Cross-app theme-continuity validation procedure [Resolved → manual capture pairs against PR preview + prod apps/site]

**What was decided.** How the plan's Validation Gate exercises
the cross-app theme-continuity claim ("apps/site `/event/<slug>`
and apps/web `/event/<slug>/game` render the same per-event
Theme for both test events").

**Options considered.**

1. **Manual capture pairs against PR preview deployment + prod
   apps/site**, mirroring M3 phase 3.3's manual production walk-
   through pattern but adapted: apps/web side is the PR's Vercel
   preview, apps/site side is production. Reviewer compares two
   screenshots per test event for visual Theme match.
2. **Automated visual diff** (Playwright + pixel-diff against a
   stored baseline). New tooling surface; precedent does not
   exist in-repo.
3. **Procedural check with explicit falsifier**: assert via
   browser DevTools that `getComputedStyle(document.body)`'s
   `--primary` resolves to the Theme's brand `primary` value on
   both apps. Code-not-pixel comparison.
4. **Tier 5 post-deploy production walk-through** with Status
   `In progress pending cross-app theme-continuity check` per
   AGENTS.md `docs/testing-tiers.md`.

**Pros / cons.**

- *Option 1.* Pro: matches M3 phase 3.3 precedent shape;
  reviewer can audit the captured pairs as a PR-attached
  artifact; falsifier is "do the two captures show different
  Themes" which is observation-direct. Con: pixel-level
  inspection is human-judgment, not strict bytes; CDN/cache
  surprise on apps/site side could pass with stale assets, but
  apps/site has not changed since M3 phase 3.2 so cache state is
  stable.
- *Option 2.* Pro: deterministic; no subjective judgment. Con:
  introduces visual-diff tooling not present in the repo
  (Playwright config has e2e tests but no visual baselines);
  scope expansion for one assertion. Defer until repo grows
  visual-diff baselines for other reasons.
- *Option 3.* Pro: code-level proof; immune to anti-aliasing /
  font-rendering differences; falsifier is a string equality.
  Con: doesn't catch component-level rendering issues a human
  capture would catch (e.g., a component that consumes a
  hard-coded color and looks wrong despite `--primary` resolving
  correctly). The continuity check exists for visible-Theme
  honesty, not just CSS-variable plumbing.
- *Option 4.* Pro: zero extra setup; production fidelity. Con:
  the wrap is a JSX change with no routing/proxy/CDN-config
  variance between preview and prod, so prod adds nothing
  Tier 5 normally protects against; the in-progress-pending seam
  becomes a follow-up doc commit for no real validation work.
  AGENTS.md's Tier 5 examples (cookie-domain assertions, proxy-
  rule-precedence checks) are the canonical Tier 5 cases — pure
  JSX-rendering changes don't fit.

**Came down to.** Whether code-level CSS-variable assertion
(option 3) captures the visible-Theme-honesty intent. It does
not — a component consuming a hard-coded color renders wrong
under a Theme even if `--primary` resolves correctly at
`document.body`, and the captured comparison is exactly the
artifact a reviewer needs to certify visible match.

**Resolution.** **Option 1.** Validation Gate procedure: deploy
the PR (Vercel produces the preview URL automatically), open
apps/site `/event/harvest-block-party` (prod) and apps/web
`/event/harvest-block-party/game` (preview) side-by-side,
capture each, attach to the PR. Repeat for `riverside-jam`. The
PR body's Validation section names both pairs and a one-sentence
match assertion per pair. The plan's Validation Gate spells
out the falsifier ("a reviewer comparing the pair sees a
different Theme — different brand color, different page
gradient, different panel radius") so the procedure has an
observable failure mode.

The same procedure also produces the per-route-per-event UI
captures the milestone doc names (warm-cream → Harvest, warm-
cream → Riverside on each newly-wrapped apps/web route). The
plan's Validation Gate consolidates: 6 in-app capture pairs
(3 routes × 2 themes, before/after) plus 2 cross-app pairs
(2 themes × apps/site-vs-apps/web), 8 captures total in the
PR's Validation section.

**Verified by:**
[m3-phase-3-3-plan.md](/docs/plans/m3-phase-3-3-plan.md)
established the manual production walk-through pattern for
cross-app verification (lines 462+ describe the falsifier
discipline).

### 3. Token-classification correction scope [Resolved → ship one-line corrections in PR; defer rule-shape ripple]

**What was decided.** What happens if self-review surfaces a
component on the newly-wrapped routes consuming a hard-coded
brand color, the wrong-bucket token, or a stale apps/web `:root`
default, given that those components render correctly under
warm-cream defaults but break visibly under Harvest or
Riverside.

**Options considered.**

1. Ship every correction in this PR.
2. Ship one-line corrections in this PR; defer corrections that
   ripple into `docs/styling.md`'s classification table or
   `_tokens.scss`'s rule shape to a focused follow-up PR.
3. Defer all corrections to backlog items; ship the wrap with
   visible Theme breakage.

**Resolution.** **Option 2.** One-line `_tokens.scss` value
adjustments and one-line component-file edits ship in the M1 PR
with rationale in commit messages. Corrections that require
adding a new themable token, reclassifying a structural token to
themable (or vice versa), or restructuring `:root`'s derived-
shade computation defer to a focused follow-up PR; the M1 PR
records these in the plan's Risk Register entry "token-
classification corrections deferred" with rationale. Option 3
contradicts the AGENTS.md "Bans on surface require rendering the
consequence" rule (visible regression as a shipped state).
Option 1 risks ballooning the M1 PR past branch-test thresholds
for one-off classification work that would benefit from focused
review attention.

**Verified by:** AGENTS.md Styling Token Discipline rule
("decide its bucket against the binding classification in
docs/styling.md").

### 4. `<ThemeScope>` source comment update [Resolved → add demo-expansion M1 wiring-site]

**What was decided.** Whether the `<ThemeScope>` source comment
at [ThemeScope.tsx:27-33](/shared/styles/ThemeScope.tsx) gets
updated to record demo-expansion M1 as the apps/web event-route
wiring site.

**Resolution.** **Update.** The current comment names "apps/web
event routes wire in M4 phase 4.1 alongside Madrona's Theme
registration"; M1 of demo-expansion ships the wrap before the
Madrona-launch epic exists, so the wiring-sites list rewrites:
keep the M2 phase 2.2 admin entry, keep the M3 phase 3.1
apps/site landing entry, replace the M4 phase 4.1 entry with
"apps/web event routes (game, redeem, redemptions) wire in
demo-expansion epic M1 phase 1.1." Any future Madrona-launch
epic registers Madrona's `Theme` as an additional bullet (or
revises this comment as part of its own M4-phase-4.1 plan); the
two concerns separate.

**Verified by:**
[ThemeScope.tsx:27-33](/shared/styles/ThemeScope.tsx) (existing
comment text);
[event-platform-epic.md:152-165](/docs/plans/event-platform-epic.md)
(the "Deferred ThemeScope wiring" invariant the comment
mirrors).

### 5. UI capture format for review attention [Resolved → 6 in-app pairs + 2 cross-app pairs as PR Validation section attachments]

**What was decided.** What artifact format the PR's Validation
section uses for the visible-Theme-honesty check.

**Resolution.** **Capture pairs attached to the PR's
Validation section, named by route + theme.** Eight captures
total: warm-cream-default vs Harvest on `/event/harvest-block-
party/game`, `/event/harvest-block-party/game/redeem`,
`/event/harvest-block-party/game/redemptions` (3 in-app pairs);
warm-cream-default vs Riverside on the same three routes for
`riverside-jam` (3 in-app pairs); apps/site `/event/harvest-
block-party` vs apps/web `/event/harvest-block-party/game`
(1 cross-app pair); same for `riverside-jam` (1 cross-app
pair). The before/after pairs use the existing admin route
(which already wraps and renders Harvest correctly today as a
verification anchor) as the implicit consistency check —
the new wraps must match the admin wrap's rendering for the
same slug.

The reviewer-facing assertion in the PR body is one sentence per
pair ("Harvest theme applies on /game; warmer pumpkin/amber than
warm-cream default"). The falsifier is "the colors visually
match warm-cream rather than the per-event Theme." No pixel-
level diff tooling required.

**Verified by:**
[harvest-block-party.ts](/shared/styles/themes/harvest-block-party.ts)
(brand bases visibly distinct from apps/web warm-cream
[`_tokens.scss:99-114`](/apps/web/src/styles/_tokens.scss): pumpkin
`#b85c1c` vs warm-cream `#d96b2b` — both warm but distinct
enough that a reviewer can see the shift by eye).

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they require
reading docs and components against actually-merged code at
plan-time, not against the scoping snapshot:

- **Sentence-level edits in `docs/styling.md`,
  `docs/architecture.md`, `docs/plans/event-platform-epic.md`,
  and `README.md`** to reflect the wrap landing. Plan-drafting
  greps each file against the current main, identifies the
  paragraphs naming "M4 phase 4.1" / "deferred ThemeScope
  wiring" / "warm-cream defaults", and writes per-file edit
  contracts in the plan's File Inventory. The scoping snapshot
  (read on 2026-05-01) found the relevant paragraphs at
  `docs/styling.md:334-337`, `docs/styling.md:393-397`,
  `docs/architecture.md:380-385`, `docs/architecture.md:388-391`,
  and `docs/plans/event-platform-epic.md:152-165`; plan-drafting
  re-verifies these still match.
- **Source-comment edits in
  [ThemeScope.tsx](/shared/styles/ThemeScope.tsx) and
  [_tokens.scss](/apps/web/src/styles/_tokens.scss).** Decision 4
  resolves the intent; plan-drafting writes the exact replacement
  text against the on-disk content.
- **Self-Review Audit set against
  [docs/self-review-catalog.md](/docs/self-review-catalog.md).**
  Plan-drafting walks the catalog against the actual M1 diff
  surface. Likely-relevant audits: none of the SQL audits,
  none of the Edge Function audits, possibly the "Effect cleanup
  audit" (no — wrap is presentational with no effects), possibly
  the "Rename-aware diff classification" audit (no — no renames).
  The audit set may be empty or near-empty; that is allowed and
  named in the plan if so.
- **Validation Gate command list.** Beyond the manual capture
  pairs, the plan names `npm run lint`, `npm run build:web`, and
  any apps/web Playwright suites that exercise the newly-wrapped
  routes. Plan-drafting reads `package.json` `scripts` and
  `scripts/testing/` per AGENTS.md "Prefer existing wrapper
  scripts."
- **Commit boundaries.** Likely two commits: (1) wrap + source-
  comment updates + any token corrections, (2) doc updates +
  Status flips + epic / milestone-doc row updates. Plan-drafting
  finalizes against the actual edit shape.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns / plan
owns":

- Status, Context preamble, Goal
- Cross-Cutting Invariants — **references the milestone doc's
  Cross-Phase Invariants** rather than restating; only names
  per-phase additions if any. For this single-phase milestone,
  no per-phase additions are anticipated.
- Naming
- Contracts — names the wrap-shape contract (single-line:
  `<ThemeScope theme={getThemeForSlug(slug)}>` wrapping the
  three return statements) and the doc-edit contracts
- Files to touch (estimate-labeled per AGENTS.md "Plan content
  is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate
- Self-Review Audits
- Documentation Currency PR Gate — **references the milestone
  doc's Documentation Currency map** for the file list; names
  this PR as the satisfier
- Out Of Scope (final)
- Risk Register — **references the milestone doc's Cross-Phase
  Risks** for milestone-level risks; names plan-implementation-
  level risks here
- Backlog Impact — **references the milestone doc's Backlog
  Impact**; this PR satisfies it

The duplication-reduction discipline above is intentional: the
plan binds milestone-level content by reference, not by
restatement. If a milestone-level invariant or risk turns out to
need per-phase nuance, the plan adds the nuance and points back
to the milestone-level rule it refines.

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not from
the scoping snapshot, per AGENTS.md "Reality-check gate between
scoping and plan":

- **`apps/web/src/App.tsx` shape unchanged since scoping.** The
  wrap-shape contract assumes the existing dispatcher exposes
  one return statement per match block at lines 35-65 (game,
  redeem, redemptions). If the file has been refactored, the
  wrap target may have moved.
- **`shared/styles/themes/index.ts` registry contains both test
  events.** Both Harvest and Riverside must be registered for
  the cross-app continuity check to find Themes; plan-drafting
  re-verifies.
- **`getThemeForSlug` fallback semantics unchanged.** The plan
  binds non-test-event slugs resolving to the platform Sage
  Civic Theme via the existing fallback at
  [getThemeForSlug.ts:18-20](/shared/styles/getThemeForSlug.ts).
- **`<ThemeScope>` source comment text unchanged since scoping.**
  Decision 4's edit is byte-replacement against the current
  comment lines; plan-drafting re-verifies the lines and
  re-derives the replacement text.
- **`docs/styling.md` and `docs/architecture.md` paragraph
  locations.** The Open-decisions handoff above lists scoping-
  read line numbers; plan-drafting greps for the actual on-disk
  positions because line numbers drift.
- **Color-mix derived-shade cascade behavior.** The plan binds
  the assumption that brand-tied derived shades (`--primary-
  surface`, `--secondary-focus`, etc.) computed in `:root` via
  `color-mix()` re-evaluate against the inner-scope brand bases
  emitted by `<ThemeScope>` (CSS spec lazy-evaluation of
  `var()`-bearing custom properties). The admin route's existing
  wrap on
  [App.tsx:24-31](/apps/web/src/App.tsx) is the existence proof;
  plan-drafting confirms the admin route renders Harvest's
  derived shades correctly today (manual check during plan-
  drafting on `/event/harvest-block-party/admin`) before binding
  the wrap-shape contract for the three new routes.

## Related Docs

- [`m1-themescope-wiring.md`](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md) —
  parent milestone doc; phase 1.1 row at the Phase Status table.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — parent
  epic; M1 paragraph at lines 180-198.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  predecessor epic; "Deferred ThemeScope wiring" invariant at
  lines 152-165 narrows partially in M1's PR.
- [`m3-phase-3-3-plan.md`](/docs/plans/m3-phase-3-3-plan.md) —
  cross-app verification precedent.
- [`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md) —
  M2 phase 2.2 admin-wrap precedent (single-PR shape).
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-count
  predictions need a branch test," "Scoping owns / plan owns,"
  "Reality-check gate between scoping and plan."
