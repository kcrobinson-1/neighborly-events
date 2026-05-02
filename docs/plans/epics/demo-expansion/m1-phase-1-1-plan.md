# M1 phase 1.1 — apps/web ThemeScope wiring + cross-app theme-continuity check

## Status

Proposed.

## Context

Two apps in this repo serve event surfaces — apps/site renders
the marketing/landing experience, apps/web renders the attendee
quiz, the volunteer redemption booth, the organizer redemption
monitor, and the per-event admin authoring UI. Both apps share
one theme registry under `shared/styles/`. apps/site already
renders per-event Themes on its event landing route from
event-platform-epic M3 phase 3.1, and apps/web's per-event admin
route (`/event/:slug/admin`) already does too from M2 phase 2.2.
The three remaining apps/web event-route shells —
`/event/:slug/game`, `/event/:slug/game/redeem`, and
`/event/:slug/game/redemptions` — render against apps/web's
warm-cream `:root` defaults regardless of which event the URL
names. Visiting the Harvest Block Party game route looks
identical to visiting the Riverside Jam game route.

This phase closes that gap. The demo-expansion epic surfaces the
two test events to internal partners; without per-event Themes
applying on apps/web event-route shells, the visual distinction
the epic depends on is broken on three of the four apps/web
shells a partner will see. The phase also closes a loose end
from the prior epic — the cross-app theme-continuity check that
event-platform-epic M3 phase 3.3 deferred to M4 phase 4.1 lands
here for the two test events, because once the apps/web wrap
ships, the check is a static visual comparison performable
against the PR's preview deployment.

The change touches apps/web's routing dispatcher (one file, three
mechanical wrap additions mirroring the existing admin wrap), two
source-comment surfaces that describe the deferred-wiring state,
and a handful of project docs. apps/site is unchanged. The theme
registry, the resolver, and the auth shape are unchanged.

## Goal

Wrap the three apps/web event-route shells listed above in
`<ThemeScope theme={getThemeForSlug(slug)}>` from
[App.tsx](/apps/web/src/App.tsx)'s routing dispatcher, mirroring
the existing admin wrap shape. After this PR, all four apps/web
event-route shells render under `<ThemeScope>`, the two test
events visibly carry their per-event Themes on apps/web, the
cross-app theme-continuity check passes for both test events,
and project docs describing the deferred-wiring state reflect
the partial closure.

## Cross-Cutting Invariants

This phase binds the five milestone-level invariants from
[m1-themescope-wiring.md §Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md)
verbatim — centralized wrap site, `getThemeForSlug` as the only
resolver, cross-app theme-continuity for the two test events,
token-classification bucket integrity, and no URL / auth /
allowlist scope creep. **No per-phase additions.**

The plan also inherits the URL contract, theme route scoping,
and theme token discipline invariants from the parent epic and
predecessor epic per the milestone doc's "Inherited from upstream
invariants" paragraph; self-review walks each against this
phase's diff.

## Naming

- **Wrap shape** — the JSX pattern this phase replicates:
  `<ThemeScope theme={getThemeForSlug(matched.slug)}>...</ThemeScope>`
  wrapping a page component's return value, mirroring the
  existing admin wrap at
  [App.tsx:24-31](/apps/web/src/App.tsx).
- **In-app capture pair** — a screenshot pair on the same
  apps/web route comparing today's warm-cream-default rendering
  against the per-event Themed rendering after the wrap lands.
  Six total: 3 routes × 2 themes (Harvest, Riverside).
- **Cross-app capture pair** — a screenshot pair on the same
  test event slug comparing apps/site `/event/<slug>` (prod)
  against apps/web `/event/<slug>/game` (PR preview). Two total:
  one per test event.
- **Token-classification correction** — a one-line edit to
  `_tokens.scss` (a brand base value adjusted) or to a component
  file (a hard-coded color replaced with `var(--…)`) that
  resolves a visible-Theme-honesty break surfaced during in-app
  capture review. Scoping decision 3
  ([scoping/m1-phase-1-1.md](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md))
  bounds the in-PR scope.

## Contracts

### Wrap-shape contract (per-route)

For each of the three currently-unwrapped match blocks in
[App.tsx:35-65](/apps/web/src/App.tsx), the return statement
becomes:

```tsx
<ThemeScope theme={getThemeForSlug(matched.slug)}>
  <PageComponent key={matched.slug} onNavigate={navigate} slug={matched.slug} />
</ThemeScope>
```

where `matched` is the route-specific match object and
`PageComponent` is `GameRoutePage` / `EventRedeemPage` /
`EventRedemptionsPage`. The `key={matched.slug}` and the props
list match the existing usage byte-for-byte; only the wrapping
changes. Imports already cover `ThemeScope` and `getThemeForSlug`
from
[App.tsx:13](/apps/web/src/App.tsx); no new imports needed.

### Source-comment contracts

- **[ThemeScope.tsx:27-33](/shared/styles/ThemeScope.tsx)
  wiring-sites list.** Replace the bullet `apps/web event routes
  wire in M4 phase 4.1 alongside Madrona's Theme registration
  (centralized in App.tsx's routing dispatcher per the M1 phase
  1.5 invariant)` with a bullet that records both the M1 phase
  2.2 admin wrap (already named on the next line — preserve
  unchanged) and a new bullet naming demo-expansion epic M1
  phase 1.1 as the wiring site for game / redeem / redemptions.
  The "centralized in App.tsx's routing dispatcher" qualifier
  stays.
- **[apps/web/src/styles/_tokens.scss:11-16](/apps/web/src/styles/_tokens.scss)
  header comment.** The block currently reads "Per the parent
  epic's deferred-ThemeScope-wiring invariant, apps/web routes
  render against these `:root` values until M4 phase 4.1." The
  replacement narrows the deferred-wiring framing: apps/web
  event-route shells now wrap in `<ThemeScope>` (demo-expansion
  M1 phase 1.1) and resolve per-event Themes from the registry
  for test events; non-test-event slugs continue to resolve to
  the platform Sage Civic Theme via `getThemeForSlug`'s
  fallback, so apps/web's `:root` block remains the source-of-
  truth for non-test-event apps/web defaults until a future
  Madrona-class theme registration. Plan-drafting writes the
  exact replacement against the on-disk lines.

### Doc-edit contracts

The full doc-currency map lives in
[m1-themescope-wiring.md §Documentation Currency](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md).
This PR satisfies every entry. Per-file edit shapes:

- **[docs/styling.md](/docs/styling.md)** — two paragraph
  rewrites. Lines around 334-337 ("apps/web event routes (game,
  redeem, redemptions) wire in M4 phase 4.1") become "wire in
  demo-expansion epic M1 phase 1.1; apps/web is now fully
  ThemeScope-wrapped on event-route shells." Lines around
  393-397 (apps/web `:root` warm-cream defaults remain in place
  until M4 phase 4.1) narrow to "remain in place for non-test-
  event slugs until a future per-event Theme registers." The
  Themable / Structural classification table is not touched.
- **[docs/architecture.md](/docs/architecture.md)** — paragraph
  rewrite around lines 380-391. The "render against apps/web's
  warm-cream `:root` defaults until M4 phase 4.1" framing
  narrows: apps/web event-route shells now wrap; warm-cream
  `:root` defaults still cover non-test-event slugs. The
  registry comment "M4 phase 4.1 adds Madrona" stays accurate
  (M1 of demo-expansion does not register a non-test Theme).
- **[README.md](/README.md)** — re-verify by grep for
  "ThemeScope" / "warm-cream" / "deferred"; if the README's
  current capability description references the deferred-wiring
  state, the sentence updates. The plan-drafting agent runs the
  grep and writes either the edit or "no edit needed" under
  this contract.
- **[docs/plans/event-platform-epic.md](/docs/plans/event-platform-epic.md)** —
  partial-closure footnote on the "Deferred ThemeScope wiring"
  invariant at lines 152-165. The invariant text stays; an
  added closing paragraph or footnote records that demo-
  expansion epic M1 phase 1.1 closes the apps/web event-route
  wrap for test events; Madrona's Theme registration remains
  open for the future Madrona-launch epic. The M4 phase 4.1
  paragraph elsewhere in the doc trims its scope to "Madrona
  Theme registration" (the wrap is no longer M4 phase 4.1's
  scope to ship).
- **[docs/plans/epics/demo-expansion/epic.md](/docs/plans/epics/demo-expansion/epic.md)** —
  Milestone Status table M1 row flips `Proposed` → `Landed`.
- **[docs/plans/epics/demo-expansion/m1-themescope-wiring.md](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md)** —
  top-level Status flips `Proposed` → `Landed`; Phase Status
  row 1.1 updates Status `Plan-pending` → `Landed` and PR
  column points at this PR.

## Files to touch

This list is the planner's pre-implementation estimate of the
expected diff shape per AGENTS.md "Plan content is a mix of
rules and estimates"; implementation may revise when a
structural call requires deviating, recorded in the PR body's
`## Estimate Deviations` section.

### New

None expected.

### Modify

- [apps/web/src/App.tsx](/apps/web/src/App.tsx) — three wrap
  additions per the wrap-shape contract above
- [shared/styles/ThemeScope.tsx](/shared/styles/ThemeScope.tsx) —
  wiring-sites comment update per source-comment contract
- [apps/web/src/styles/_tokens.scss](/apps/web/src/styles/_tokens.scss) —
  header comment update per source-comment contract
- [docs/styling.md](/docs/styling.md) — paragraph rewrites per
  doc-edit contract
- [docs/architecture.md](/docs/architecture.md) — paragraph
  rewrite per doc-edit contract
- [docs/plans/event-platform-epic.md](/docs/plans/event-platform-epic.md) —
  "Deferred ThemeScope wiring" partial-closure footnote + M4
  phase 4.1 paragraph scope trim
- [docs/plans/epics/demo-expansion/epic.md](/docs/plans/epics/demo-expansion/epic.md) —
  Milestone Status row update
- [docs/plans/epics/demo-expansion/m1-themescope-wiring.md](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md) —
  Status flip + Phase Status row update
- [README.md](/README.md) — pending grep verification
  (plan-drafting confirms whether an edit is needed)

### Intentionally not touched

- [shared/styles/getThemeForSlug.ts](/shared/styles/getThemeForSlug.ts) —
  resolver and fallback unchanged
- `shared/styles/themes/*.ts` — theme registry unchanged
- [shared/styles/themeToStyle.ts](/shared/styles/themeToStyle.ts) —
  emit shape unchanged
- `apps/site/**` — apps/site rendering unchanged
- `apps/web/src/pages/*` — page components unchanged (the wrap
  is added at the dispatcher, not inside pages, per the
  centralized-wrap-site invariant)
- `tests/e2e/**` — no test changes; existing tests run against
  wrapped routes via Vercel preview / local dev and should pass
  without modification (the wrap is a `<div className="theme-
  scope">` that does not interpose locator semantics)
- `supabase/**` — out of scope
- `docs/styling.md` Themable / Structural classification table —
  no row changes (token-classification corrections, if any, are
  one-line value edits that don't restructure the table; rule-
  shape ripple defers per scoping decision 3)

## Execution Steps

This sequence is the planner's pre-implementation estimate of
the expected execution shape per AGENTS.md "Plan content is a
mix of rules and estimates"; the implementer may refine.

1. **Branch hygiene.** Off `main` (clean worktree). Branch name
   follows repo convention `plan/<slug>` — likely
   `plan/m1-phase-1-1-themescope-wiring`.
2. **Baseline validation.** `npm run lint`, `npm run build:web`
   (confirm green pre-edit).
3. **Reality-check re-run.** Re-verify the inputs named in
   [scoping/m1-phase-1-1.md §Reality-check inputs](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md):
   App.tsx shape, registry contents, getThemeForSlug fallback,
   ThemeScope source comment, doc paragraph locations, color-mix
   derived-shade cascade (manual check on
   `/event/harvest-block-party/admin` confirming Harvest's
   derived shades render correctly today).
4. **Wrap diff in App.tsx.** Three additions per wrap-shape
   contract.
5. **Source-comment updates.** ThemeScope.tsx wiring-sites
   list; `_tokens.scss` header comment.
6. **Validation pre-deploy.** `npm run lint` + `npm run build:web`
   confirm green.
7. **Open draft PR.** Vercel produces preview URL on push.
8. **Capture pairs.** Six in-app pairs (warm-cream-default
   captured from main pre-merge; Themed captured from PR
   preview) + two cross-app pairs (apps/site prod vs apps/web
   PR preview, one per test event). Attach to PR body's
   Validation section with the per-pair match-assertion
   sentences from the wrap-shape contract.
9. **Token-correction triage.** If any in-app pair shows visible
   regression beyond brand-color shift (a component reads
   wrong-bucket; a hard-coded color survives), apply one-line
   `_tokens.scss` / component edits per scoping decision 3.
   Decisions that ripple beyond one-line edits surface as
   focused follow-up backlog items, named in the PR body's Risk
   Register section, and the M1 PR proceeds with the deferral
   recorded.
10. **Doc updates.** Per doc-edit contracts above. Plan-drafting-
    time line numbers re-verified against on-disk content; sed-
    -like surgical edits, not full-file rewrites.
11. **Status flips.** Epic.md M1 row → `Landed`; milestone-doc
    Status → `Landed`; phase-status row → `Landed` with this
    PR's number filled in.
12. **Self-review pass.** Walk the audit set named in
    "Self-Review Audits" below; AGENTS.md "Plan-to-PR
    Completion Gate" walk; AGENTS.md "Doc Currency PR Gate"
    walk; AGENTS.md "Estimate Deviations" walk against this
    plan's estimate-shaped sections.
13. **PR ready for review.** Mark out of draft.

If at step 9 the token-correction blast radius blows past the
in-PR threshold defined in scoping decision 1's fallback
authorization, the implementer splits along the Option B seam
named there. The PR-body Estimate Deviations section records
the split.

## Commit Boundaries

Pre-implementation estimate per AGENTS.md "Plan content is a
mix of rules and estimates":

- **Commit 1 — wrap diff + source-comment updates + token
  corrections.** App.tsx, ThemeScope.tsx, `_tokens.scss`, plus
  any one-line component / SCSS edits surfaced during step 9.
  This commit ships the code change cohesively for review.
- **Commit 2 — doc updates + Status flips.** styling.md,
  architecture.md, README.md (if needed), event-platform-
  epic.md, epic.md, milestone doc. Doc-only, no code, separable
  from the code review.
- **Optional Commit 3+ — review-fix commits.** Per AGENTS.md
  "PR-sized work, name the intended commit boundaries before
  editing when practical, and keep review-fix commits distinct
  when they clarify the history."

## Validation Gate

The validation procedure that proves this PR ships its goal:

- `npm run lint` — green.
- `npm run build:web` — green; the wrap diff compiles, no new
  TypeScript errors, no new SCSS warnings.
- **Manual capture pairs in PR body's Validation section.** Six
  in-app pairs + two cross-app pairs per the wrap-shape
  contract and scoping decision 5. Each pair carries a one-
  sentence match-assertion. The procedure passes if every
  assertion is observably true; the falsifier is "any pair
  shows visually mismatched themes — a per-event Theme that
  reads as warm-cream instead of Harvest/Riverside, an
  apps/web preview that diverges from prod apps/site for the
  same test slug."
- **Plan-to-PR Completion Gate walk.** Every Goal, Self-Review
  audit, Validation step, and Documentation Currency entry is
  satisfied or explicitly deferred-with-rationale-in-this-plan
  before the PR opens.
- **Estimate Deviations callout in PR body.** Per AGENTS.md, the
  PR body names any deviation from this plan's estimate-shaped
  sections (Files to touch, Execution Steps, Commit Boundaries)
  under `## Estimate Deviations`, or `N/A` if none.

The validation gate does **not** include a Tier 5 post-deploy
production check. Scoping decision 1 verified that the wrap is
a pure JSX rendering change with no routing/proxy/CDN-config
variance between preview and prod, so preview-deployment-based
verification is the canonical tier per
[`docs/testing-tiers.md`](/docs/testing-tiers.md). Status flips
to `Landed` in this PR, not `In progress pending prod smoke`.

## Self-Review Audits

Walk the named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
against this PR's diff surfaces. The diff covers exactly two
surfaces — apps/web routing JSX (3-line additions × 3 sites) and
documentation prose. The catalog's audits are scoped to SQL
migrations, Edge Functions, frontend forms / save paths,
frontend lifecycle / async, CI / testing infrastructure, and
operational scripts; **none** apply to a presentational JSX wrap
without effects, state, or save paths.

The implementer confirms this enumeration during self-review and
records "no catalog audits apply to this diff surface" in the PR
body's Self-Review section, alongside the milestone-doc-level
sanity walk listed below:

- **Centralized-wrap-site invariant** — no event-route page
  component imports `<ThemeScope>` directly after this PR; all
  wraps live in `App.tsx`.
- **Resolver-uniformity invariant** — every wrap site passes
  `matched.slug` to `getThemeForSlug` with no special-casing.
- **Token-classification bucket integrity** — capture review
  surfaces no wrong-bucket tokens, or any surfaced are
  resolved per scoping decision 3.
- **No URL / auth / allowlist scope creep** — diff stays within
  the modify-list above; no Vercel routing changes, no
  `vercel.json` edits, no test-event-allowlist code introduced.

If any walk surfaces a finding, the implementer fixes it in
this PR (per AGENTS.md "if a reviewer flags a gap that should
have been named at plan time, fix the plan first").

## Documentation Currency PR Gate

Reference:
[m1-themescope-wiring.md §Documentation Currency](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md).

This PR satisfies every entry in the milestone-level map. The
file-by-file edit shape is named in the doc-edit contracts
above. No doc deferral.

## Out Of Scope

Final, not deliberation. Items here are explicitly excluded from
this PR's diff:

- Per-event Theme registration for non-test-event slugs (Madrona
  or any other). The future Madrona-launch epic owns this; the
  apps/web wrap that lands here is the infrastructure
  inheritance, but no new Theme registers in this PR.
- Token-classification table restructuring in
  `docs/styling.md`. One-line value adjustments in
  `_tokens.scss` ship per scoping decision 3; rule-shape
  ripples defer to a focused follow-up.
- Visual-diff tooling (Playwright pixel-diff baselines).
  Rejected in scoping decision 2; defer until the repo grows
  visual-diff baselines for other reasons.
- Tier 5 in-progress-pending Status pattern. Rejected in
  scoping decision 1; this PR flips to `Landed` directly.
- Any apps/site change. apps/site already wraps event routes
  from M3 phase 3.1; nothing in apps/site needs editing.
- Any auth, routing, or test-event-allowlist code introduction.
  Demo-mode auth bypass + slug allowlist is M3's scope.
- E2E test additions or modifications. The wrap does not
  interpose locator semantics; existing Playwright suites
  continue to pass without changes.
- Per-event admin route re-wrap. The route already wraps from
  M2 phase 2.2; no edit.

## Risk Register

Reference:
[m1-themescope-wiring.md §Cross-Phase Risks](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md)
for milestone-level risks (component-level token gaps, cross-
app continuity false positives from caching, single-PR ambition
vs. review coherence, Madrona-launch inheritance assumption,
`docs/styling.md` drift).

Plan-implementation-level risks not already covered:

- **Token-correction blast radius mid-flight.** Step 9 of
  Execution Steps surfaces the trigger; scoping decision 1's
  fallback authorization names the response (Option B split).
  The mitigation is named-and-bounded; this is residual risk
  rather than uncovered risk.
- **Vercel preview build difference from prod.** Vercel preview
  builds use the production bundle (`npm run build:web`
  equivalent) and serve the same CSS / JS. The wrap is a pure
  rendering change with no proxy/CDN-config impact, so the
  preview-vs-prod difference is functionally zero for this
  PR's verification claims. Mitigation: the validation gate
  documents the PR-preview-vs-prod-apps/site comparison
  explicitly so a reviewer can audit the procedure.
- **Color-mix derived-shade regression at runtime.** The
  reality-check confirms CSS spec lazy-evaluation of
  `var()`-bearing custom properties causes brand-tied derived
  shades (e.g., `--primary-surface`) computed in `:root` to
  re-evaluate against an inner-scope `--primary` override. The
  admin wrap on `/event/:slug/admin` is the existence proof —
  it has shipped since M2 phase 2.2 and Harvest renders its
  derived shades correctly today. Mitigation: step 3's reality-
  check re-run includes a manual check on
  `/event/harvest-block-party/admin` to confirm the existence
  proof still holds at plan-drafting time.

## Backlog Impact

Reference:
[m1-themescope-wiring.md §Backlog Impact](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md).
This PR satisfies the milestone-level closures and unblocks per
that map. No phase-level additions.

## Related Docs

- [`m1-themescope-wiring.md`](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md) —
  parent milestone doc. Owns Cross-Phase Invariants,
  Documentation Currency map, Cross-Phase Risks, Backlog Impact
  this plan binds by reference.
- [`scoping/m1-phase-1-1.md`](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md) —
  scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the five scoping decisions absorbed
  above; deletes in batch with sibling scoping docs at the
  milestone-terminal PR.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — parent
  epic. M1 row flips to `Landed` in this PR.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  predecessor epic. "Deferred ThemeScope wiring" invariant
  partial-closure footnoted in this PR.
- [`m3-phase-3-3-plan.md`](/docs/plans/m3-phase-3-3-plan.md) —
  cross-app verification precedent.
- [`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md) —
  M2 phase 2.2 admin-wrap precedent (single-PR shape, source
  for the wrap pattern this plan mirrors).
- [`AGENTS.md`](/AGENTS.md) — Plan-to-PR Completion Gate, Doc
  Currency PR Gate, Estimate Deviations callout, Plan content
  is a mix of rules and estimates.
