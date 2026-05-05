# Scoping — M1 phase 1.3 (Placeholder Madrona content depth pass exercising the extended shape)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
already lives in
[m1-brand-foundation.md](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md);
durable per-phase content absorbs into
`docs/plans/epics/madrona-demo-build/m1-phase-1-3-plan.md` once
that plan drafts (conditional on 1.2 not absorbing 1.3 — see
[Phase summary](#phase-summary) below and
[scoping decision 5](#5-phase-13-may-not-ship-at-all--collapse-into-12-is-authorized-in-advance-constraint-not-resolution)).

## Phase summary

Phase 1.3 ships the placeholder-content depth pass against the
band and sponsor literals in
[`apps/site/events/madrona.ts`](/apps/site/events/madrona.ts):
the additive optional fields phase 1.2 lands on
`EventContent.lineup[number]` and `EventContent.sponsors[number]`
(`imageSrc?` / `imageAlt?`, `extendedBio?`, `featuredQuote?`,
`externalLinks?`, `shortDescription?`, `socialLinks?`) get
populated against placeholder bands and sponsors with a
mixed-population shape — at least one band carries all five new
fields, at least one sponsor carries both new fields, the rest
populate a varied subset — so the capture pair against
`/event/madrona*` shows the section component renderers
exercising the new fields end-to-end. The validation surface is
the rendered-Madrona capture pair plus the byte-for-byte falsifier
on the test events (`harvest-block-party`, `riverside-jam`)
continuing to render unchanged because 1.3 does not touch them.

Phase 1.3 does **not** extend `EventContent` further (1.2's
scope), does **not** alter renderer behavior (1.2's scope), does
**not** author real Madrona content (M3's scope), and does
**not** seed any non-Madrona event with the new fields (epic
invariant 4 binding rule).

**Phase 1.3 may not ship at all.** The milestone doc authorizes
in advance the collapse of 1.3 into 1.2 if the 1.2 implementer's
estimate of the depth-population diff at phase-1.2-execution time
is small enough that splitting produces review churn rather than
review coherence
([m1-brand-foundation.md §Phase Status](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md);
[m1-phase-1-2-plan.md §Execution Steps step 4](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md)).
The collapse is decided in the 1.2 PR; this scoping doc serves
two purposes accordingly:

1. **If 1.2 collapses 1.3.** This doc is the depth-population
   shape the 1.2 implementer absorbs — they read the
   [Decisions made at scoping time](#decisions-made-at-scoping-time)
   and
   [Open decisions to make at plan-drafting](#open-decisions-to-make-at-plan-drafting)
   below as the framework for the placeholder-content extension
   committed in the 1.2 PR. No 1.3 plan drafts; this doc deletes
   at the milestone-terminal PR alongside sibling scoping docs.
2. **If 1.2 ships standalone.** This doc is the standard
   pre-plan-drafting handoff. The 1.3 plan-drafting session
   absorbs the settled decisions, resolves the open decisions
   against post-1.2 code state, and ships the placeholder
   content as its own PR.

Both paths are valid; the milestone doc binds neither.

## Inputs from prior phase

Per AGENTS.md "Phase Planning Sessions" — drafting may begin
while the prior phase is still in implementation/review provided
each pending input cites a concrete surface. Phase 1.2 plan is
`Proposed` ([PR #183](https://github.com/kcrobinson-1/neighborly-events/pull/183))
but the 1.2 implementation PR has not opened at scoping-open
time. The following pending decisions from 1.2 must settle
before this phase's plan can promote past `In draft` (or before
1.2 collapses 1.3, in which case no 1.3 plan drafts):

- **Whether 1.2 absorbs 1.3 (the collapse decision).** Authorized
  in advance per
  [m1-brand-foundation.md §Phase Status](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md);
  decided at
  [m1-phase-1-2-plan.md §Execution Steps step 4](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md)
  by reading post-1.1 `madrona.ts` and estimating the
  depth-population diff size. Pending input surface: the 1.2
  implementation PR's `## Estimate Deviations` section names the
  call. If the call is "collapse," 1.3 plan never drafts; if the
  call is "ship standalone," 1.3 plan drafting proceeds against
  the post-1.2 state.
- **Final field names as actually shipped in 1.2.** The 1.2 plan's
  §Naming names six fields with rationale-per-name preserved:
  `imageSrc?` + `imageAlt?`, `extendedBio?`,
  `featuredQuote?: { text; attribution? }`, `externalLinks?`,
  `shortDescription?`, `socialLinks?`. The 1.2 plan §Risk Register
  names "field-naming churn after PR opens" as a real possibility
  — a reviewer rebuttal at 1.2 PR-time could rename a field
  before merge. Pending input surface: the merged 1.2 PR's
  `apps/site/lib/eventContent.ts` `EventContent.lineup[number]`
  and `sponsors[number]` literals. 1.3 plan-drafting reads them
  as the contract it populates.
- **Renderer affordances as actually shipped in 1.2.** The 1.2
  plan §Naming names the JSX render order, conditional-render
  shape, and ClassName conventions for each new field. Pending
  input surface: the merged 1.2 PR's `EventLineup.tsx` and
  `EventSponsors.tsx`. 1.3's capture pairs run against the
  renderers as actually shipped, not as the 1.2 plan estimates
  them.
- **Post-1.2 state of `apps/site/events/madrona.ts`.** Two cases:
  - If 1.2 collapsed and absorbed the depth-population pass,
    `madrona.ts` already carries populated new fields; 1.3 is
    moot.
  - If 1.2 shipped standalone, `madrona.ts` is unchanged from
    phase 1.1's seeded shape (six placeholder bands, five
    placeholder sponsors, FAQ entry naming the page as a demo);
    1.3 populates the new fields on top of that.
  Pending input surface: the merged 1.2 PR's
  `apps/site/events/madrona.ts` (modified or unchanged depending
  on collapse).
- **Test fixture state as actually shipped in 1.2.** The 1.2 plan's
  §Test fixture extension contract names per-field positive- and
  negative-case tests in
  [`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx).
  Pending input surface: the merged 1.2 PR's test file. 1.3 does
  not extend the test fixture (see scoping decision 4 below) but
  reads the file at plan-drafting to confirm 1.2's coverage shape
  matches the assertion that 1.3 is content-only.

If any of these still-pending inputs has not settled by phase 1.3
plan-drafting time, the plan stays `In draft` until they do, per
AGENTS.md "`In draft` → `Proposed` promotion gate." The collapse
input is the gating one — until 1.2 ships, 1.3 plan-drafting
cannot start in earnest because the alternative (collapse) means
no plan should exist.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
source that proves the load-bearing claim. Decisions absorb into
the plan's contract sections during plan-drafting (or into the
1.2 PR's depth-population commit if 1.2 collapses); deliberation
prose (rejected alternatives) stays here through the scoping
doc's transient lifetime.

### 1. Phase 1.3 ships content-only — no shape changes, no renderer changes [Resolved]

**What was decided.** Phase 1.3's diff is exclusively
[`apps/site/events/madrona.ts`](/apps/site/events/madrona.ts)
content extension plus doc-currency edits (Phase Status flips,
this scoping doc's Status flip, the plan doc's Status flip). No
edits to `EventContent` shape, no edits to `EventLineup.tsx` or
`EventSponsors.tsx`, no new SCSS classes, no new test fixtures.

**Why it mattered.** The milestone doc's phase boundaries split
shape extensions from content depth pass deliberately
([m1-brand-foundation.md §Sequencing "Why 1.2 before 1.3"](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)):
"The shape extensions in 1.2 must land before placeholder content
can be authored against the extended shape. Reversing produces
dead placeholder content that gets rewritten when the type
changes." A phase-1.3 diff that touches shape or renderers
re-opens 1.2's invariant-2 audit (no foreclosure of
donation/feedback child epics) and the byte-for-byte falsifier on
test events for no review-coherence reason. If a 1.3-time
discovery surfaces a needed shape or renderer adjustment, the
proper triage path is: surface as a follow-up PR (or, if
discovered before 1.2 merges, fold into 1.2's diff per the
milestone-doc token-classification invariant's one-line-edit
discipline) rather than expand 1.3's scope.

**Verified by:**
- [m1-phase-1-2-plan.md §Files to touch](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md)
  for the conditional `apps/site/events/madrona.ts` modification
  contract that 1.3 inherits if 1.2 ships standalone
- [m1-brand-foundation.md §Sequencing](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
  for the phase-boundary rationale
- [apps/site/events/madrona.ts](/apps/site/events/madrona.ts)
  for the post-1.1 content module that 1.3 extends — six
  placeholder bands, five placeholder sponsors, FAQ entry
  surfacing the demo posture in page-visible copy

**Options considered.**

1. **Content-only diff (chosen).** `apps/site/events/madrona.ts`
   plus doc-currency. No shape, no renderer, no test fixture.
2. **Content + renderer-style adjustments.** If the 1.2 capture
   pair surfaces visual rough edges (e.g., the
   `event-lineup-quote` `<blockquote>` defaults bleed into card
   rhythm), 1.3 could batch the SCSS adjustments alongside the
   placeholder content.
3. **Content + token-classification ripples.** Same shape as
   option 2, focused on `_tokens.scss`.

**Pros / cons.**

- *Option 1 (chosen).* Pro: keeps the diff surface tightly scoped
  to authoring; review attention focuses on placeholder-text
  voice and field-distribution sensibility, not code quality.
  Con: any visual rough edge surfaced by the capture pair becomes
  a follow-up PR rather than batching into 1.3.
- *Option 2 (rejected).* Pro: one fewer PR if visual adjustments
  surface. Con: defeats the phase boundary; the SCSS adjustments
  belong in 1.2 (where the renderer changes were introduced) per
  the milestone-doc token-classification invariant's one-line-edit
  discipline. If they surface during 1.2 implementation they fold
  into 1.2; if they surface only against populated content (which
  1.2's capture pair against `/event/madrona*` would also catch
  if 1.2 collapses), the proper fix is the 1.2 PR. If they
  surface only after 1.2 merges and during 1.3 capture-pair work
  (i.e., the populated rendering exposes a gap that the
  unpopulated rendering hid), the fix path is a focused follow-up
  PR — exactly the shape the milestone-doc Cross-Phase Risks name
  for token-classification ripples beyond one-line correction.
- *Option 3 (rejected).* Same shape as option 2; same rationale.

### 2. Mixed-population shape adopted from 1.2 plan §Madrona placeholder-content extension contract [Resolved as constraint]

**What was decided.** The placeholder-content depth pass populates
new fields with the mixed-population shape the 1.2 plan's
conditional contract names: at least one band populates all five
new band-depth fields (`imageSrc`, `imageAlt`, `extendedBio`,
`featuredQuote`, `externalLinks`); at least one sponsor populates
both new sponsor-depth fields (`shortDescription`, `socialLinks`);
remaining bands and sponsors populate a varied subset (one band
with image only, one with `extendedBio` + `featuredQuote`, one
with `externalLinks` only, etc.) so the capture pair against
`/event/madrona*` shows mixed-population rendering as the
load-bearing visual demonstration.

**Why it mattered.** The mixed-population shape is the load-bearing
falsifier for invariant 4 (render-when-present, not
require-when-absent) under populated-content conditions. A pass
that populates all five new fields on every band would not
distinguish "renderer renders the new field when present" from
"renderer renders the new field unconditionally" — the capture
pair would show every card uniformly populated. Mixed-population
exercises both branches: the populated-field card shows the
renderer's affordance, the unpopulated-field card shows the
renderer's render-when-present discipline. The byte-for-byte
falsifier on test events (`harvest-block-party`, `riverside-jam`)
remains the structural anchor — those events populate no new
fields so they continue to render unchanged — but mixed-population
within Madrona's own lineup adds visual proof that the renderer
handles the in-between case (some cards with new fields, others
without) without grid-layout regression or cross-card visual
chrome bleed.

The 1.2 plan's §Madrona placeholder-content extension contract is
the authoritative source for this shape; phase 1.3 inherits it
verbatim. If 1.2 collapses, the 1.2 implementer absorbs the same
contract.

**Verified by:**
- [m1-phase-1-2-plan.md §Madrona placeholder-content extension contract](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md)
  for the authoring-time contract: "at least one band has all 5
  new fields populated; the other bands populate a varied mix
  (one with image only, one with extendedBio + featuredQuote,
  one with externalLinks only) so the capture pair shows
  mixed-population rendering. At least one sponsor has both new
  fields populated; others vary."
- [docs/plans/epics/madrona-demo-build/epic.md:172-184](/docs/plans/epics/madrona-demo-build/epic.md)
  for invariant 4 binding the render-when-present rule across
  every consumer
- [apps/site/events/madrona.ts:133-170](/apps/site/events/madrona.ts)
  for the post-1.1 lineup of six placeholder bands and
  [apps/site/events/madrona.ts:171-207](/apps/site/events/madrona.ts)
  for the five placeholder sponsors that the depth pass populates
  against

**Options considered.**

1. **Mixed-population per the 1.2 plan's contract (chosen).** At
   least one band with all five fields, others vary; at least one
   sponsor with both fields, others vary.
2. **Uniform full-population.** Every band populates every new
   field; every sponsor populates every new field. Capture pair
   shows every card with maximum content.
3. **Single all-fields-populated entry, all others omit new fields.**
   One band populates all five fields, the other five bands omit
   them entirely; one sponsor populates both, the other four
   sponsors omit them entirely.
4. **Population by tier or call-out.** Headline bands / Hosting
   sponsors populate the new fields; Supporting sponsors and
   middle-of-bill bands do not. Reads as "tier-correlates-with-depth"
   editorial signal.

**Pros / cons.**

- *Option 1 (chosen).* Pro: distinguishes "renderer renders when
  present" from "renderer renders unconditionally" because absent
  fields exist within the same lineup as populated ones; the
  unit-test negative cases 1.2 ships are the structural falsifier,
  the mixed-population capture pair is the visual confirmation.
  Pro: gives M3 a varied editorial baseline to author against
  rather than a fully-populated fixture that M3 would have to
  triage entry by entry. Con: requires authoring decisions about
  which entries get which fields — see open decisions below.
- *Option 2 (rejected).* Pro: simpler authoring (every entry gets
  every field). Con: capture pair shows uniform population,
  which proves the renderer renders when present but does not
  prove render-when-present (vs. render-unconditionally). The
  unit-test negative cases cover the distinction, but the
  capture-pair visual proof is weaker. Also: M3 receives a
  fully-populated fixture and has to remove fields per band based
  on real-content availability, which is more work than
  populating selectively.
- *Option 3 (rejected).* Pro: clearest minimum demonstration —
  one example of each new field is enough to validate the
  renderer affordance. Con: the capture pair shows one fully-
  populated card and five logo-only cards (sponsors) or
  name-bio-only cards (bands), which reads as accidental rather
  than illustrative; reviewers can't tell whether the depth pass
  is intentional-with-mixed-population or skeleton-of-future-work.
- *Option 4 (rejected).* Pro: editorial signal that maps tier to
  depth (Hosting sponsor gets full description; Supporting
  sponsor gets logo-only). Con: introduces an editorial
  convention not present in the platform shape — sponsor `tier`
  exists, but tier-correlates-with-depth-fields is not a
  documented or enforced rule. M3 should be free to author
  against any sponsor regardless of tier without inheriting an
  unspoken "Supporting tier means logo-only" convention from the
  placeholder content.

### 3. Placeholder framing posture: relies on existing FAQ entry from phase 1.1 [Resolved]

**What was decided.** The placeholder-content depth pass does NOT
embed "demo placeholder" or similar disclaimer prefixes into
the new field values themselves (e.g., the `extendedBio` does
not begin with "[Placeholder bio for stakeholder review:]";
the `featuredQuote.attribution` is not "[Demo placeholder
attribution]"). The mitigation for the milestone-doc risk
"Placeholder content reads as a launch announcement" rests on
two existing layers, not a per-field disclaimer:

1. **Page-visible FAQ entry** — phase 1.1 seeded the first FAQ
   entry naming the page as a stakeholder demo: "Not yet. This
   page is a stakeholder demo … the lineup, sponsors, and FAQ
   shown here are placeholder content for preview purposes. The
   page is set to `noindex` so it stays out of search until the
   real launch."
2. **SSR `noindex` meta** — the `meta.robots: "noindex"` field
   that phase 1.1 enforced on `/event/madrona*` keeps the URL
   out of search engines during the demo phase.

Field-value voice may use names and prose that read as plausible
neighborhood-band material (mirroring the `bio` voice phase 1.1
established with "A three-piece acoustic group rooted in Pacific
Northwest folk songwriting") without the per-field disclaimer.

**Why it mattered.** The milestone doc's Cross-Phase Risk
"Placeholder content reads as a launch announcement" was
mitigated centrally during phase 1.1 (the FAQ entry plus the
`noindex` meta). Per-field "[demo placeholder]" prefixes would
clutter every render, read as un-shippable content (M3 would
have to scrub every prefix when authoring real values), and
duplicate a mitigation already in place. The FAQ entry is the
load-bearing surface for in-page disclosure; the `noindex` meta
is the load-bearing surface for search-indexing protection. A
third per-field layer adds drafting-time burden without
mitigation value the first two don't already provide.

**Verified by:**
- [apps/site/events/madrona.ts:209-213](/apps/site/events/madrona.ts)
  for the FAQ entry naming the page as a stakeholder demo
  (phase 1.1 seeded; comment on the file at lines 22-27 names
  the mitigation explicitly)
- [apps/site/events/madrona.ts:41](/apps/site/events/madrona.ts)
  for the `meta.robots: "noindex"` field phase 1.1 set
- [docs/plans/epics/madrona-demo-build/m1-brand-foundation.md §Cross-Phase Risks](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
  for the "Placeholder content reads as a launch announcement"
  risk and the framing that phase 1.1 owned the mitigation
  choice

**Options considered.**

1. **No per-field disclaimer; rely on FAQ + noindex (chosen).**
2. **Per-field disclaimer prefix.** Every populated new field
   begins with `[Placeholder for stakeholder review]` or similar
   bracketed framing.
3. **Per-band/per-sponsor disclaimer line as a separate field
   call-out.** A new `disclaimer?: string` field at the literal
   level renders as a subtle footnote.

**Pros / cons.**

- *Option 1 (chosen).* Pro: clean visual rendering; M3 doesn't
  have to scrub disclaimer prefixes when authoring real content;
  mitigation is centrally placed in surfaces that already exist
  (FAQ + meta). Con: a viewer who skipped the FAQ entry might
  misread the field values as real (mitigation: the `noindex`
  meta is the load-bearing protection, not visual disclosure).
- *Option 2 (rejected).* Pro: maximally explicit per-field
  disclosure. Con: visual clutter on every render; M3 has to
  scrub every prefix; duplicates the FAQ/meta mitigation; no
  precedent in the existing test events
  ([`harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts)
  / [`riverside-jam.ts`](/apps/site/events/riverside-jam.ts)
  carry no per-field disclaimers despite being labeled as test
  events).
- *Option 3 (rejected).* Pro: structured disclosure surface that
  M3 sets to `undefined` per entry as authoring completes. Con:
  out of scope — the new field shape is settled in 1.2 and adding
  a `disclaimer?:` field at the lineup/sponsors literal level is
  a phase 1.2 invariant-2 question (would a future donation/
  feedback epic want a `disclaimer?:` field for itself?). Phase
  1.3 explicitly does not extend the type per scoping decision 1.

### 4. No new test fixture changes in 1.3 [Resolved]

**What was decided.** Phase 1.3 does not extend
[`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx).
Phase 1.2 ships positive-case and negative-case unit tests per
new field group (per its §Test fixture extension contract); 1.3's
diff is content authoring, which is exercised via capture pairs
against `/event/madrona*`, not via unit tests against
`madronaContent`.

**Why it mattered.** Loading the actual `madronaContent` module
into a unit test and asserting against rendered output couples
the test fixtures to the authored placeholder values that M3
will replace. Every M3 authoring change would force a unit-test
update for assertions about specific bio strings, quote text,
or external-link labels — which is test-fixture maintenance work
that the test does not buy any structural confidence not already
provided by the renderer-against-synthetic-fixture tests phase
1.2 ships.

The byte-for-byte falsifier on test events
(`harvest-block-party`, `riverside-jam` rendering unchanged)
stays load-bearing — it remains the structural anchor for
invariant 4 across the 1.3 diff because 1.3 does not touch the
test events. Phase 1.3's validation gate adds the
mixed-population capture pair against `/event/madrona*` as the
visual proof that the populated rendering reads correctly; the
unit-test layer does not need 1.3-specific additions.

**Verified by:**
- [m1-phase-1-2-plan.md §Test fixture extension contract](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md)
  for the per-field positive-/negative-case tests phase 1.2 ships
- [tests/site/event/sectionComponents.test.tsx](/tests/site/event/sectionComponents.test.tsx)
  for the existing test file structure (the `baseContent`
  fixture and per-component describe blocks; phase 1.2 extends
  these, phase 1.3 does not)
- [docs/testing-tiers.md](/docs/testing-tiers.md) for the
  testing tier governance — Tier 1 unit tests against synthetic
  fixtures are the canonical layer for renderer-shape
  assertions; capture pairs are the canonical layer for
  rendered-content assertions

**Options considered.**

1. **No test fixture changes in 1.3 (chosen).**
2. **Add a smoke test that loads `madronaContent` and asserts
   the lineup / sponsors arrays render without throwing.** A
   single integration test that imports `madronaContent` and
   renders `<EventLineup performers={madronaContent.lineup} />`
   and `<EventSponsors sponsors={madronaContent.sponsors} />`
   under React Testing Library, asserting only that no error is
   thrown.
3. **Add per-band / per-sponsor unit assertions against specific
   placeholder values.** E.g., a test that asserts the
   first band's `extendedBio` renders into a specific number of
   `<p>` elements based on the placeholder's `\n\n` count.

**Pros / cons.**

- *Option 1 (chosen).* Pro: keeps the test fixture stable across
  M3 authoring changes; the renderer-against-synthetic-fixture
  tests phase 1.2 ships are the structural confidence layer;
  capture pairs are the visual confidence layer for populated
  content. Con: a regression in `madronaContent`'s structural
  validity (e.g., a malformed `featuredQuote` shape with `text:
  undefined`) would surface only at render time. Mitigation: the
  TypeScript type-check catches structural-validity regressions
  at build time; the `npm run build:site` validation gate is
  green-required.
- *Option 2 (rejected).* Pro: catches a class of regression
  where `madronaContent`'s authored shape silently violates the
  type at runtime (e.g., a string with embedded null bytes that
  the type system can't detect). Con: low value because the
  TypeScript type-check covers structural validity at build
  time; the runtime render of `madronaContent` happens at
  `/event/madrona` page generation in `next build`, which is
  the green-required validation. The integration test would add
  a duplicate structural check at a different layer.
- *Option 3 (rejected).* Pro: catches per-value regressions like
  a paragraph splitter that mishandles a specific edge case in
  the placeholder copy. Con: every M3 authoring change breaks
  the test; the test is more about authoring than about
  rendering. The renderer-extension edge cases (paragraph
  splitter on `\n\n\n\n`, etc.) are 1.2's test fixture concerns
  per [m1-phase-1-2-plan.md §Risk Register](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md).

### 5. Phase 1.3 may not ship at all — collapse-into-1.2 is authorized in advance [Constraint, not resolution]

**What was decided.** The decision-frame this scoping doc operates
under: phase 1.3's existence is conditional on the 1.2
implementer's collapse call. If 1.2 absorbs the depth-population
pass into its diff (per
[m1-phase-1-2-plan.md §Execution Steps step 4](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md)),
phase 1.3 does not ship as a separate PR — no plan drafts, no
implementation, no 1.3 PR. The scoping doc deletes at the
milestone-terminal PR alongside sibling scoping docs regardless.

The 1.2 implementer's call rests on the depth-population diff
size estimated against post-1.1 `madrona.ts`. Per the 1.2 plan:
"If the addition is bounded to ~24 placeholder string values and
a few placeholder image paths, collapse; record in
`## Estimate Deviations` section of the PR body."

**Why it mattered.** This rule constrains 1.3 plan-drafting in two
ways:

1. **1.3 plan-drafting cannot start in earnest until 1.2 ships.**
   AGENTS.md "Phase Planning Sessions" allows next-phase scoping
   to begin during prior-phase implementation, but the load-
   bearing pending input here is binary (collapse vs. ship
   standalone) and a wrong-direction draft is wasted work. The
   scoping doc itself can ship now (it informs the 1.2 collapse
   decision and survives either path); the plan doc waits.
2. **This scoping doc serves the 1.2 implementer's collapse
   decision.** If the 1.2 implementer reads this doc and the
   depth-population shape (mixed-population, ~24 placeholder
   values per the 1.2 plan estimate) reads as small enough to
   absorb into 1.2 without bloating the diff, they collapse.
   The settled-at-scoping decisions above (content-only,
   mixed-population, no per-field disclaimer, no test fixture
   changes) are the framework they absorb. The open decisions
   below (image strategy, distribution specifics, voice) are
   what they decide concretely if they collapse.

**Verified by:**
- [m1-brand-foundation.md §Phase Status](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
  for the in-advance collapse authorization: "Phase 1.3 may
  collapse into 1.2 at phase-planning time if the placeholder-
  content depth pass is small enough that splitting it from the
  shape extensions produces review churn rather than review
  coherence; the collapse is authorized in advance and recorded
  in the collapsing phase's plan as an Estimate Deviation."
- [m1-phase-1-2-plan.md §Execution Steps step 4](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md)
  for the call-time procedure: "Decide on 1.3 collapse. Read
  post-1.1 `apps/site/events/madrona.ts`; estimate the diff
  size of populating the new fields against placeholder bands
  and sponsors. If the addition is bounded to ~24 placeholder
  string values and a few placeholder image paths, collapse;
  record in `## Estimate Deviations` section of the PR body."

### 6. No apps/web changes in 1.3 [Resolved]

**What was decided.** Phase 1.3 ships zero apps/web edits, same
shape as 1.2's
[scoping decision 5](/docs/plans/epics/madrona-demo-build/scoping/m1-phase-1-2.md).
The placeholder-content depth pass touches only
`apps/site/events/madrona.ts` and doc-currency surfaces; apps/web
does not consume `lineup[]` or `sponsors[]` arrays in any route
shell, so there is no apps/web surface that the depth-population
content needs to render against.

**Why it mattered.** Same rationale as 1.2 scoping decision 5 —
the cross-app theme-continuity invariant for `slug=madrona` is
established by phase 1.1's capture pairs and unaffected by
content-shape changes within `lineup[]` / `sponsors[]`. Phase 1.3
has no reason to touch apps/web; the rule is recorded explicitly
to make the audit trail durable.

**Verified by:**
- [docs/plans/epics/madrona-demo-build/scoping/m1-phase-1-2.md §5](/docs/plans/epics/madrona-demo-build/scoping/m1-phase-1-2.md)
  for the precedent and the apps/web grep result (zero matches
  for `\.lineup` or `\.sponsors`); 1.3 plan-drafting re-greps to
  falsify drift if any apps/web feature lands between 1.2 and
  1.3
- [apps/web/src/App.tsx](/apps/web/src/App.tsx) for the existing
  centralized `<ThemeScope>` wraps that pick up Madrona's Theme
  unchanged regardless of `madronaContent`'s lineup/sponsors
  population

## Open decisions to make at plan-drafting

These need resolution during phase 1.3 plan-drafting (or, if 1.2
collapses, during 1.2 implementation step 4 of the depth-population
commit). They are not load-bearing on phase 1.3 scoping but the
plan cannot promote past `In draft` until they settle.

- **Whether 1.3 ships at all.** Settles in the 1.2 PR per the
  collapse decision. If "collapse," 1.3 plan never drafts; if
  "ship standalone," 1.3 plan drafting proceeds. The other open
  decisions below apply equally to either path.
- **Image asset strategy for `imageSrc`.** Three candidates:
  - **Skip** — leave `imageSrc` and `imageAlt` unpopulated for
    every band. Renderer renders no `<img>` element. Capture pair
    tests the renderer's "no image present" branch but does not
    exercise the populated-with-image case against
    `/event/madrona`.
  - **Single shared placeholder image** — commit one generic
    placeholder SVG (e.g., a music-note motif consistent with
    Madrona Theme colors) at a path like
    `apps/site/public/events/madrona/bands/placeholder.svg`;
    populate `imageSrc` on the all-fields-populated band and any
    other bands the distribution call gives an image to.
  - **Per-band placeholder images** — commit one placeholder SVG
    per band that gets `imageSrc` populated, at paths like
    `apps/site/public/events/madrona/bands/<band-slug>.svg`. M3
    replaces with real photos.
  Constraint: the all-fields-populated band must populate
  `imageSrc` (per scoping decision 2 — at least one band has all
  five new fields), so option (skip) is incompatible with the
  mixed-population shape unless we redefine "all five fields" to
  exclude the image. Plan-drafting picks against the validation-
  gate shape (does the capture pair need a populated `<img>` to
  prove the renderer's image branch?) and the M3-handoff surface
  (does M3 inherit a per-band SVG inventory or one shared
  placeholder?). Default lean: single shared placeholder SVG —
  satisfies the capture-pair populated-image requirement without
  committing per-band images that M3 will overwrite anyway.
- **Specific placeholder text for `extendedBio`, `featuredQuote`,
  `externalLinks`, `shortDescription`, `socialLinks`.** Authoring
  decisions at plan-drafting time. Constraint: voice continues
  the existing `bio` voice phase 1.1 established (e.g., "A
  three-piece acoustic group rooted in Pacific Northwest folk
  songwriting"). External link `href` values use
  `https://example.com/...` per the existing sponsor `href`
  precedent
  ([apps/site/events/madrona.ts:176](/apps/site/events/madrona.ts)
  and similar) so the renderer's `target="_blank"
  rel="noopener noreferrer"` exercise does not navigate to live
  third-party domains.
- **Distribution of populated fields across the six bands.** The
  1.2 plan §Madrona placeholder-content extension contract names
  illustrative shapes ("one with image only, one with extendedBio
  + featuredQuote, one with externalLinks only"). Plan-drafting
  picks specific bands per shape; the shape itself is the
  contract. Anticipated distribution (subject to plan-drafting
  refinement):
  | Band | imageSrc/Alt | extendedBio | featuredQuote | externalLinks |
  |------|-------------|-------------|---------------|---------------|
  | Cedar & Salt | yes | yes | yes | yes |
  | Lake Washington Brass | yes | — | — | yes |
  | Arboretum Strings | — | yes | yes | — |
  | Roosevelt Way Soul Revue | yes | yes | — | — |
  | Eastlake Ensemble | — | — | yes | yes |
  | The Madrona Park Headliners | yes | yes | yes | — |

  Distribution rationale: every new field appears on three to
  four of the six bands; every band populates two to four new
  fields; the all-fields-populated band (Cedar & Salt) opens the
  series so it reads naturally as the depth example.
- **Distribution of populated fields across the five sponsors.**
  Anticipated distribution (subject to plan-drafting refinement):
  | Sponsor | shortDescription | socialLinks |
  |---------|------------------|-------------|
  | Madrona Neighborhood Association | yes | yes |
  | Lake Washington Boulevard Bakery | yes | — |
  | Arboretum Coffee Roasters | yes | yes |
  | Eastlake Print Shop | — | yes |
  | Cedar Cycle Co-op | — | — |

  Distribution rationale: the all-fields-populated sponsor
  (Madrona Neighborhood Association) is the host, which reads
  naturally as the most-described entry; one sponsor (Cedar
  Cycle Co-op) populates neither so the capture pair shows the
  logo-only branch within the populated lineup.
- **Validation gate refinement.** Anticipated to mirror 1.2's
  shape: `npm run lint`, `npm run build:web`, `npm run build:site`,
  `npm test`, plus capture pairs in the PR body. Capture pairs:
  - **Test-event byte-for-byte falsifier (load-bearing).** Same
    pre-/post- pair shape as 1.2 against
    `/event/harvest-block-party` and `/event/riverside-jam`'s
    lineup and sponsors sections; zero visual delta required.
    Phase 1.3 ships no test-event edits so the falsifier is
    near-trivial, but the formal capture confirms invariant 4
    from the 1.3 diff's perspective.
  - **Madrona populated-content capture (load-bearing for 1.3).**
    Pair shape: pre-1.3 `/event/madrona` lineup and sponsors
    sections (showing post-1.2 unpopulated rendering) vs.
    post-1.3 (showing populated rendering with mixed-population
    variety). The mixed-population shape is the visual
    demonstration that the renderer handles
    in-between-population correctly without grid-layout
    regression or visual chrome bleed across cards of varying
    height.
  Plan-drafting confirms the capture-pair count (likely 4 pairs:
  2 test-event, 2 Madrona).
- **Per-PR commit shape.** Anticipated 1-2 commits — placeholder
  content extension (one commit), doc-currency + status flips
  (one commit). Plan-drafting picks against actual diff at
  phase-1.3-start.
- **`featuredQuote.attribution` voice.** Real-feeling (e.g.,
  "—Cedar & Salt, after sound check at last year's series") or
  generic (e.g., "—the band")? Plan-drafting picks. Constraint:
  reads as plausibly authored, not as bracket-disclaimed
  per scoping decision 3.
- **`externalLinks` `label` voice and platform coverage.**
  Per-band plan-drafting choice. Constraint: covers a varied
  spread of platform types (Spotify, Bandcamp, Instagram,
  YouTube, band website) so the renderer's `<ul>` of `<a>`
  exercise reads as a real external-presence list rather than a
  monotone "Spotify, Spotify, Spotify."
- **`socialLinks` `label` voice and platform coverage.** Same
  per-sponsor choice; same constraint (varied spread across
  Instagram, LinkedIn, Facebook, brand website).

## Plan structure handoff

If 1.3 ships standalone, the phase 1.3 plan adopts the standard
phase-plan section set per AGENTS.md "Phase Planning Sessions →
Plan owns" — Status, Context, Goal, Cross-Cutting Invariants,
Naming, Contracts, Files to touch, Execution Steps, Commit
Boundaries, Validation Gate, Self-Review Audits, Documentation
Currency PR Gate, Out Of Scope, Risk Register, Backlog Impact,
Related Docs.

The plan's **Naming** section is small — no new field names or
type-shape spellings; the section references the 1.2 plan's
§Naming as the contract 1.3 populates against, and names voice
constraints (existing `bio` voice; `https://example.com/...` for
all external `href` values; mixed-population shape).

The plan's **Contracts** section names:
- The
  [`apps/site/events/madrona.ts`](/apps/site/events/madrona.ts)
  extension contract: which fields populated on which entries;
  the mixed-population shape settled at scoping; the image
  strategy decided at plan-drafting (per the open decision
  above); the voice convention.
- (If applicable per the image strategy decision) The
  `apps/site/public/events/madrona/bands/` asset commit contract:
  filenames, dimensions, format (SVG default), the placeholder
  status disclosed in commit message.
- Doc-currency rewrites: milestone doc Phase Status row 1.3
  flip to `Landed`, this scoping doc Status flip to
  `Absorbed into plan`, the 1.3 plan's Status flip to `Landed`.

The plan's **Self-Review Audits** section walks the four epic
Cross-Cutting Invariants plus the four milestone-level
invariants from
[m1-brand-foundation.md §Cross-Phase Invariants](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
against the diff surface (which is small — `madrona.ts` content
extension only). Invariant 4 (render-when-present) is
load-bearing in a different shape than for 1.2: 1.3's diff does
not touch renderers, so the byte-for-byte falsifier on test
events continues to hold trivially; the load-bearing
load-from-1.3 audit is the mixed-population capture pair against
`/event/madrona*` showing the renderer handles in-between
population correctly. Invariant 2 (no foreclosure of donation/
feedback child epics) is not load-bearing on 1.3 because 1.3
ships no shape changes; the audit walks regardless to confirm
the placeholder content's voice does not lock in editorial
conventions a future donation/feedback epic would have to
unwind.

The plan's **Validation Gate** mirrors 1.2's shape with the
capture-pair refinement named in the open decisions above. The
load-bearing addition specific to 1.3 is the
mixed-population capture pair against `/event/madrona`'s lineup
and sponsors sections.

The plan's **Risk Register** anticipates these phase-implementation
risks (not already covered by the milestone-doc Cross-Phase
Risks):

- **Distribution table drift.** The anticipated distribution
  tables in the open decisions above are estimates; plan-drafting
  refines against the actual band/sponsor count and which entries
  read as natural depth examples.
- **Per-band image asset commit shape.** If plan-drafting picks
  per-band placeholder SVGs, the asset commit becomes a fixture-
  inventory question (filenames matching band slugs, consistent
  dimensions, etc.); if shared placeholder, the commit is one
  file. Plan-drafting picks accordingly.
- **`externalLinks` `href` URL plausibility.** All `href` values
  are `https://example.com/...` per scoping decision constraint;
  a future audit pass at M3 (real content) replaces them. The
  risk: a reviewer might rebut the "use example.com everywhere"
  rule against the existing sponsor `href` precedent that points
  at `https://example.com/madrona-neighborhood-association` —
  same shape, but the audit confirms the precedent is followed.
- **Placeholder content reads as launch announcement (residual).**
  Mitigated by the FAQ entry + `noindex` per scoping decision 3;
  residual risk if a viewer skips the FAQ. The mitigation is
  centrally placed; 1.3 does not add per-field disclosure.

The plan's **Backlog Impact** anticipates:
- **Closes:** nothing in
  [`docs/backlog.md`](/docs/backlog.md).
- **Unblocks:** M3 (real content authoring) reads the populated
  fields as the editorial baseline to replace; the
  mixed-population shape gives M3 a varied starting point rather
  than a fully-populated or fully-empty fixture.
- **Opens:** anticipated follow-up backlog candidates if any
  surface during 1.3 implementation (e.g., a per-band image
  asset inventory follow-up if the placeholder image strategy
  surfaces M3 questions about consistent format / dimensions).

## Reality-check inputs

The plan must verify these against current code at plan-drafting
time, not against this scoping doc's citations (which may drift
between scoping and plan-drafting, especially since 1.2 lands
between scoping-open and plan-draft):

- **Post-1.2 state of `apps/site/events/madrona.ts`.** Two cases:
  - If 1.2 collapsed and absorbed the depth-population pass,
    `madrona.ts` already carries populated new fields; 1.3 plan
    never drafts.
  - If 1.2 shipped standalone, `madrona.ts` is unchanged from
    phase 1.1's seeded shape; 1.3 populates the new fields on
    top of the unchanged shape. Plan-drafting re-reads the file
    to confirm no incidental edit landed.
- **Post-1.2 state of `apps/site/lib/eventContent.ts`
  `EventContent.lineup[number]` and `sponsors[number]` literals.**
  Confirm the field names match 1.2 plan §Naming as actually
  shipped. Specifically: confirm `imageSrc?` + `imageAlt?`,
  `extendedBio?`, `featuredQuote?: { text; attribution? }`,
  `externalLinks?: Array<{ label; href }>`,
  `shortDescription?`, `socialLinks?: Array<{ label; href }>`
  are present with the spellings the 1.2 plan settled. The 1.2
  plan §Risk Register names "field-naming churn after PR opens"
  as a real possibility — a reviewer rebuttal at 1.2 PR-time
  could rename a field. If a name shifted, 1.3 plan-drafting
  uses the actually-shipped name.
- **Post-1.2 state of
  [`EventLineup.tsx`](/apps/site/components/event/EventLineup.tsx)
  and
  [`EventSponsors.tsx`](/apps/site/components/event/EventSponsors.tsx).**
  Confirm the renderer affordances landed per the 1.2 plan
  §Naming.renderer-surface-choices. Specifically: confirm the
  conditional render order, the `imageAlt` fallback to
  `performer.name`, the `featuredQuote.attribution` partial
  render path, the `externalLinks` array `<ul>`-of-`<a>` pattern
  with `target="_blank" rel="noopener noreferrer"`. 1.3's capture
  pairs run against the renderers as actually shipped.
- **Post-1.2 state of
  [`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx).**
  Confirm 1.2 shipped per-field positive- and negative-case
  tests. 1.3 does not extend the file (per scoping decision 4)
  but reads it to confirm the structural-falsifier coverage
  matches the assertion that 1.3 is content-only.
- **Post-1.2 state of
  [`apps/site/app/styles/_event.scss`](/apps/site/app/styles/_event.scss).**
  Confirm the new SCSS rules for the new classNames (per 1.2
  plan §Naming.classname-conventions) landed. 1.3 does not edit
  this file; it relies on the 1.2-shipped rules to render
  populated content correctly.
- **Inventory of
  [`apps/site/public/events/madrona/`](/apps/site/public/events/madrona/).**
  Phase 1.1 committed `logo.png` and a `sponsors/` subdirectory
  with five sponsor SVGs
  (`madrona-neighborhood-association.svg`,
  `lake-washington-boulevard-bakery.svg`,
  `arboretum-coffee-roasters.svg`, `eastlake-print-shop.svg`,
  `cedar-cycle-co-op.svg`). No `bands/` subdirectory exists at
  scoping time. If the image strategy decision picks
  per-band or single-shared placeholder, plan-drafting names the
  asset commit shape (file paths, dimensions, format).
- **Donation/feedback child epic re-grep.** Re-check
  `docs/plans/epics/madrona-donation/` and
  `docs/plans/epics/madrona-feedback/` directories at
  plan-drafting time. Neither exists at scoping time
  (confirmed); if either has been authored between scoping and
  plan-drafting, walk every settled field-shape signal in those
  docs against the placeholder content's voice. Specifically:
  if a child epic's shape signals a `description` or `links[]`
  field at the lineup/sponsors level, the placeholder content's
  use of `extendedBio` / `externalLinks` / `shortDescription` /
  `socialLinks` may need a voice audit to confirm no editorial
  pre-emption.
- **Apps/web `lineup[]` / `sponsors[]` consumers.** Re-grep
  `apps/web/` for `\.lineup` and `\.sponsors`; confirm zero
  matches still hold at plan-drafting time. If any apps/web
  feature lands between 1.2 and 1.3 that reads these arrays,
  the plan's "no apps/web changes" decision re-opens.
- **Apps/site home-page demo showcase consumers.** Re-grep
  `apps/site/components/home/` for `lineup` and `sponsors`
  reads (vs. prose mentions). The 1.2 plan's reality-check
  inputs included this surface; 1.3 inherits the assumption
  that only prose mentions exist (no array reads). If an array
  read has surfaced, the showcase may render Madrona's
  populated lineup or sponsors — visual consequence is a
  capture-pair concern (does the showcase render the populated
  fields without layout regression?).
- **The 1.2 PR's `## Estimate Deviations` section.** Read at
  plan-drafting time to confirm the collapse decision was
  recorded. If the section says "1.3 collapsed into 1.2," 1.3
  plan-drafting does not happen and this scoping doc deletes
  at the milestone-terminal PR.
- **AGENTS.md "Estimate Deviations" rule.** Confirm the rule's
  section heading (the plan's PR body's `## Estimate
  Deviations` section is the canonical surface for any
  deviation from this plan's estimate-shaped sections, e.g.,
  the distribution tables in the open decisions above shifting
  during plan-drafting or implementation).

The grep procedure for any stale "M4 phase 4.x" or
"madrona-launch epic" references across the repo: phase 1.1 owned
the bulk of those rewrites and phase 1.2 inherits a re-grep step
per
[m1-phase-1-2-plan.md §Documentation Currency PR Gate](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md);
1.3 inherits the same re-grep step against the post-1.2 state of
the repo. The expected result is zero matches outside the
`madrona-launch-day` test slug exclusion.
