# Scoping — M1 phase 1.2 (`EventContent` shape extensions + section component renderer updates)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
already lives in
[m1-brand-foundation.md](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md);
durable per-phase content absorbs into
`docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md` once
that plan drafts.

## Phase summary

Phase 1.2 extends [`EventContent`](/apps/site/lib/eventContent.ts)
with the band and sponsor depth fields the parent epic's scoping
session committed to —
[band image, link list, longer bio, featured quote; sponsor short
description, social links](/docs/plans/epics/madrona-demo-build/epic.md) —
as additive optional fields, and extends
[`EventLineup.tsx`](/apps/site/components/event/EventLineup.tsx)
and [`EventSponsors.tsx`](/apps/site/components/event/EventSponsors.tsx)
to render the new fields when present. The load-bearing falsifier
is the existing test events (`harvest-block-party`,
`riverside-jam`) rendering byte-for-byte unchanged — the same
shape that proves epic invariant 4 (`render-when-present, not
require-when-absent`) holds across every consumer.

Phase 1.2 does **not** author real Madrona content (M3's scope)
and does **not** seed the new fields into Madrona's placeholder
content unless the milestone-doc-authorized 1.3 collapse fires
(see open decision below).

## Inputs from prior phase

Per AGENTS.md "Phase Planning Sessions" — drafting may begin
while the prior phase is still in implementation/review provided
each pending input cites a concrete surface. Phase 1.1 has not
merged at scoping-open time; the following pending decisions
from 1.1 must settle before this phase's plan can promote past
`In draft`:

- **`EventContent` shape after 1.1's `meta.{robots,logoSrc,logoAlt}`
  additions land.** Phase 1.1 plan adds three meta-scoped optional
  fields per
  [m1-phase-1-1-plan.md §`EventContent.meta.robots` contract and
  Logo placement contract](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md);
  phase 1.2 builds on top of that shape, not the pre-1.1 shape.
  Pending input surface: the merged `apps/site/lib/eventContent.ts`
  in the 1.1 PR's terminal commit; concretely re-read at
  plan-drafting time.
- **`EventLineup.tsx` post-1.1 state.** 1.1 ships no edits to
  this file per
  [m1-phase-1-1-plan.md §Files to touch / Intentionally not
  touched](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md);
  re-confirm at plan-drafting that no incidental edit landed
  (token-correction triage, prop-shape adjustment, etc.).
- **`EventSponsors.tsx` post-1.1 state.** Same.
- **`apps/site/events/madrona.ts` exists and registers under
  `slug=madrona`.** 1.1 ships this module; 1.2's renderer-
  extension capture pairs run against `/event/madrona*` for the
  Madrona-themed reading of the new fields. Pending input
  surface: the merged `apps/site/events/madrona.ts` file; re-read
  at plan-drafting.
- **Madrona's placeholder lineup/sponsors arrays.** Phase 1.1's
  Madrona content module contract names "three placeholder bands
  with placeholder bios" and "4-5 placeholder sponsors with
  `logoSrc` pointing at placeholder SVGs"
  ([m1-phase-1-1-plan.md §Madrona content module contract](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md));
  1.2's renderer extensions exercise these arrays. If 1.1 ships
  fewer/more entries than estimate, 1.2's plan adapts.
- **Whether phase 1.3 collapses into 1.2.** Authorized in advance
  by [m1-brand-foundation.md §Phase Status](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md);
  the call rests on the size of the Madrona depth-population pass
  at phase-1.2-start. Pending input surface: phase 1.2 plan-
  drafting session decides; named in plan §Estimate Deviations
  if the collapse fires.

If any of these still-pending inputs has not settled by phase 1.2
plan-drafting time, the plan stays `In draft` until they do, per
AGENTS.md "`In draft` → `Proposed` promotion gate."

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
source that proves the load-bearing claim. Decisions absorb into
the plan's contract sections during plan-drafting; deliberation
prose (rejected alternatives) stays here through the scoping
doc's transient lifetime.

### 1. New band/sponsor fields land as additive `?: T` optional [Resolved]

**What was decided.** Every new field on
`EventContent.lineup[number]` and `EventContent.sponsors[number]`
is declared as `?: T` optional. No required fields, no required
tuples (e.g., "if `image`, then `imageAlt`"), no shape-conditional
type unions. Renderers consume each field with a truthiness
guard before rendering.

**Why it mattered.** Epic Cross-Cutting Invariant 4 binds every
`EventContent` consumer to render gracefully when new fields are
absent
([epic.md §Cross-Cutting Invariants 4](/docs/plans/epics/madrona-demo-build/epic.md));
the load-bearing falsifier is `harvest-block-party` and
`riverside-jam` rendering byte-for-byte unchanged after 1.2
merges. Required-tuple types (e.g., a discriminated union that
forces both `image` and `imageAlt` together) silently fail this
falsifier the moment a real event omits one half — and the
type-system error surfaces at the wrong layer (the type-check
fails, not the render). Optional-with-self-review-walked-pairing
is the precedent set by phase 1.1's
[`meta.logoSrc` / `meta.logoAlt`](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md)
pair (decision recorded there as: "the shape uses two optional
fields with a self-review-walked invariant rather than a complex
conditional type — simpler for invariant 4's render-when-absent
check").

**Verified by:**
- [apps/site/lib/eventContent.ts:55-67](/apps/site/lib/eventContent.ts)
  for the existing `lineup[]` and `sponsors[]` literal types
  this phase extends additively
- [docs/plans/epics/madrona-demo-build/epic.md:172-184](/docs/plans/epics/madrona-demo-build/epic.md)
  for invariant 4 binding the additive-optional rule across
  every consumer
- [docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md)
  §Logo placement contract for the precedent of two-optional-
  fields-with-self-review-walked-pairing instead of a
  conditional type

**Options considered.**

1. **Additive `?: T` optional fields with self-review-walked
   pairing rules (chosen).** New fields like `imageSrc?:`,
   `imageAlt?:`, `quote?:`, etc. land as optional; renderer
   guards on truthiness; self-review confirms paired fields
   (image + alt, etc.) are populated together at content-author
   time.
2. **Discriminated union types for paired fields.** E.g.,
   `image?: { src: string; alt: string }` as a single optional
   object so the type system enforces the pairing.
3. **Required fields with empty-string sentinels.** Fields are
   `string` (not `string?`) but the renderer treats `""` as
   absent.
4. **Required fields with explicit `null`.** Fields are
   `string | null`; renderer checks `!= null`.

**Pros / cons.**

- *Option 1 (chosen).* Pro: matches phase 1.1 precedent
  precisely; the falsifier (test events render byte-for-byte
  unchanged) is the cleanest possible — if a field is undefined,
  the renderer skips it. Con: type system does not enforce that
  paired fields (image + alt, quote + attribution) appear
  together; relies on self-review-walked invariants and a
  reviewer reading content modules. Mitigation: the renderer
  itself can render-when-`image`-is-set-but-skip-alt-fallback by
  defaulting `alt` to `name`, which makes the pairing
  recoverable rather than load-bearing.
- *Option 2 (rejected).* Pro: type-safe; impossible to ship
  `image.src` without `image.alt`. Con: nests the field one
  level deeper than the existing flat `lineup[]` and
  `sponsors[]` shapes; deviates from phase 1.1's precedent
  ([decision context: m1-phase-1-1-plan.md picked optional-
  pair over conditional-type for `meta.logoSrc/Alt`](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md)).
  An inconsistent shape choice across two adjacent phases of
  the same milestone reads as drift — readers wonder whether
  the difference is meaningful.
- *Option 3 (rejected).* Pro: type signature is simpler
  (no `?: T`). Con: `""` as sentinel makes invariant 4's
  byte-for-byte falsifier harder to enforce — an event that
  populated the field with `""` would render differently than
  one that omitted it, but the type system would say they're
  identical. The falsifier should match the type-system shape;
  optional fields are the type-system match for "absent."
- *Option 4 (rejected).* Pro: explicit `null` is a clearer
  signal than `undefined` to some readers. Con: no precedent
  in `EventContent` today; would introduce a one-off
  convention in 1.2 that the rest of the type doesn't follow.

### 2. Section component renderer updates are render-when-present, not require-when-absent [Resolved]

**What was decided.** When 1.2 extends `EventLineup.tsx` and
`EventSponsors.tsx` to render new band and sponsor depth
fields, the rendered output for an event that omits the new
fields equals the pre-1.2 output byte-for-byte. The structural
falsifier is the existing test events:
[`harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts)
and [`riverside-jam.ts`](/apps/site/events/riverside-jam.ts)
populate the existing required fields (`name`, `setTimes`) and
existing optional fields (`bio`, `tier`) but not the new fields
this phase adds — they continue to render exactly as today.

**Why it mattered.** Already binding via
[m1-brand-foundation.md §Cross-Phase Invariants](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
("Section component renderer updates are render-when-present,
not require-when-absent"); restating here so 1.2's plan can
treat it as a direct contract rather than re-derive at
plan-time. Implementation pattern follows the existing
truthiness-guarded conditional renders at
[`EventLineup.tsx:24-26`](/apps/site/components/event/EventLineup.tsx)
(the existing `bio` guard) and the implicit guard at
[`EventLineup.tsx:27-33`](/apps/site/components/event/EventLineup.tsx)
(the `setTimes.length > 0` guard) — new fields use the same
shape of conditional.

**Verified by:**
- [apps/site/components/event/EventLineup.tsx:24-26](/apps/site/components/event/EventLineup.tsx)
  for the existing `performer.bio ? ... : null` pattern that
  new band-depth field renders mirror
- [apps/site/components/event/EventLineup.tsx:27-33](/apps/site/components/event/EventLineup.tsx)
  for the existing `performer.setTimes.length > 0` pattern
  that array-typed new fields (e.g., link list) mirror
- [apps/site/components/event/EventSponsors.tsx:35-41](/apps/site/components/event/EventSponsors.tsx)
  for the existing single-`<img>` per-sponsor render that new
  sponsor-depth fields extend without restructuring
- [apps/site/events/harvest-block-party.ts:97-159](/apps/site/events/harvest-block-party.ts)
  and
  [apps/site/events/riverside-jam.ts:102-167](/apps/site/events/riverside-jam.ts)
  for the populated test-event arrays that anchor the
  byte-for-byte falsifier

### 3. Field-name neutrality vs. donation/feedback child epics [Resolved as constraint, not naming]

**What was decided.** Phase 1.2's new field names must not
occupy field-spelling space that the donation or feedback
child epics may need on `EventContent` or its nested types.
Specific bans (recurring traps from the milestone doc's
[Cross-Phase Risks](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)):

- No generic `link[]` / `links[]` at the `lineup[number]` or
  `sponsors[number]` level that the donation epic might want
  for donation-CTA links. Sponsor "social links" must spell
  itself with social-link-specific naming
  (e.g., `socialLinks[]`, `socials[]`, or platform-keyed
  shape) so a future donation field can also live as
  `donationLink` / `donate` without collision.
- No generic `description` field at `lineup[number]` or
  `sponsors[number]`. Sponsor "short description" must spell
  itself with descriptor-specific naming (e.g.,
  `shortDescription`, `tagline`, `summary`) so feedback or
  donation epics can also place a `description` if they
  want one.
- No generic `quote` field at top level. Band "featured
  quote" must spell itself at the band-level
  (`lineup[number].quote` is fine because it's nested under
  the band; the ban is on a top-level `EventContent.quote`).

**Why it mattered.** Epic invariant 2 binds the milestone to
not foreclose donation/feedback child epic shape needs. The
milestone-doc Cross-Phase Risks register names the exact
recurring trap as: "a band-depth field that names itself
ambiguously (e.g., a generic `link[]` that the donation epic
might want for donation-CTA links, or a generic `description`
field where both child epics may want their own description) —
the field name's specificity is the lever."

The donation and feedback child epic scoping notes are not yet
authored as of this doc's open time
(see Reality-check inputs below); 1.2's plan re-greps for any
that have appeared between scoping and plan-drafting and walks
this rule against any settled signal that surfaces. Until then,
the rule operates on field-naming specificity alone.

**Concrete naming is plan-drafting work, not scoping work.**
This decision sets the constraint; the plan proposes specific
field names against the constraint and walks epic invariant 2
in self-review.

**Verified by:**
- [docs/plans/epics/madrona-demo-build/epic.md:158-164](/docs/plans/epics/madrona-demo-build/epic.md)
  for invariant 2 binding the no-foreclosure rule
- [docs/plans/epics/madrona-demo-build/m1-brand-foundation.md](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
  §Cross-Phase Risks for the recurring-trap framing
  ("a band-depth field that names itself ambiguously …")
- The absence of `docs/plans/epics/madrona-donation/` and
  `docs/plans/epics/madrona-feedback/` directories in the
  current repo state — confirmed at scoping time; re-confirmed
  by the plan's reality-check pass

### 4. Test fixture (`tests/site/event/sectionComponents.test.tsx`) extends to cover new fields [Resolved as scope, not test design]

**What was decided.** Phase 1.2 adds at least one positive-case
test (new fields populated → renderer renders them) and at least
one negative-case test (new fields omitted → renderer renders
nothing for them) per new field group, in
[`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx).
The negative-case tests are the non-render-regression falsifier
that anchors invariant 4 alongside the byte-for-byte capture-
pair check against the test events.

**Why it mattered.** Without a test that asserts "absent field
renders nothing in the DOM," a future regression that always
renders an empty `<div>` (or empty `<ul>`, etc.) for the new
field would pass the type-check, pass the existing test-event
test fixtures (which still don't populate the new fields after
this phase), and pass the manual capture-pair gate (the empty
`<div>` may not be visually distinguishable). The unit-test
falsifier closes that gap.

**Concrete test-name and assertion shape is plan-drafting work,
not scoping.**

**Verified by:**
- [tests/site/event/sectionComponents.test.tsx](/tests/site/event/sectionComponents.test.tsx)
  for the existing fixture (`baseContent`) and the existing
  unit-test pattern (lines per test exploration done at
  scoping; re-confirmed at plan-drafting against current
  state)
- [docs/testing-tiers.md](/docs/testing-tiers.md) for the
  tiers that govern which test infrastructure the new tests
  attach to (Tier 1 unit tests in the same file is the
  precedent the existing fixture sets)

### 5. No apps/web wrap or rendering changes [Resolved]

**What was decided.** Phase 1.2 ships zero apps/web edits. The
new band and sponsor depth fields live on `EventContent` and
render in apps/site `/event/[slug]` section components only.
Apps/web does not consume `lineup[]` or `sponsors[]` arrays in
any route shell (game, redeem, redemptions, admin) per the
reality-check survey done at scoping time
([survey result: zero apps/web matches for `\.lineup` or
`\.sponsors`](/apps/web/src/App.tsx)); the cross-app theme-
continuity gate that 1.1 owns runs against page-level Theme
application, not against per-band field rendering.

**Why it mattered.** The milestone-doc cross-app theme-
continuity invariant for `slug=madrona` is already established
by 1.1's capture pairs. 1.2's surface is purely apps/site
type-and-renderer; mixing apps/web changes into a phase whose
diff is tightly scoped to the section-component-renderer surface
broadens review attention away from invariant 4's load-bearing
falsifier.

**Verified by:**
- Grep across `apps/web/` for `\.lineup` and `\.sponsors` —
  zero matches (confirmed at scoping; plan re-greps to falsify
  drift if any apps/web feature lands between scoping and
  plan-drafting)
- [apps/web/src/App.tsx](/apps/web/src/App.tsx) for the
  centralized `<ThemeScope>` wraps already shipped by
  demo-expansion epic M1 phase 1.1; per
  [m1-brand-foundation.md §Cross-Phase Decisions / Settled by
  default](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md),
  M1 ships no apps/web wrapping change

## Open decisions to make at plan-drafting

These need resolution during phase 1.2 plan-drafting; they are
not load-bearing on phase 1.2 scoping but the plan cannot
promote past `In draft` until they settle.

- **Concrete field names and shapes for each new band depth
  field.** The epic names four band-depth concepts: image, link
  list, longer bio, featured quote. Plan-drafting picks the
  spellings within the constraints in scoping decision 3 above:
  - **Band image** — single optional `imageSrc?: string`
    paired with `imageAlt?: string` (mirroring phase 1.1's
    `meta.logoSrc/Alt` precedent), or a nested
    `image?: { src; alt; caption? }` object with explicit
    pairing? Constraint: scoping decision 1 favors flat optional
    fields over nested objects for shape consistency with the
    existing flat `lineup[]` literal.
  - **Link list** — array shape candidates:
    `links?: Array<{ label: string; href: string }>` (generic),
    `socialLinks?: Array<{ platform: string; href: string }>`
    (platform-keyed), or a typed-platform union
    (`{ kind: "spotify" | "bandcamp" | "instagram" | ...; href }`).
    Constraint: scoping decision 3 bans generic `links[]` at the
    band level if the donation child epic might want it for
    donation-CTA links; band-specific naming
    (e.g., `bandLinks`, `externalLinks`) sidesteps that
    collision.
  - **Longer bio** — single string field (plain text /
    multi-paragraph via `\n\n` convention), markdown, or
    structured `paragraphs?: string[]`? Constraint: invariant 2
    forbids a generic `description` at the band level if either
    child epic may want it; `extendedBio?: string` /
    `fullBio?: string` / `longBio?: string` are candidates that
    sidestep that. Renderer surface is plan-drafting work.
  - **Featured quote** — single `quote?: string`, paired
    `quote?: { text; attribution? }`, or array
    `quotes?: Array<{ text; attribution? }>`? Constraint:
    plan-drafting picks against the placeholder Madrona
    content's needs (see open decision below on phase 1.3
    collapse).
- **Concrete field names and shapes for each new sponsor depth
  field.** The epic names two sponsor-depth concepts: short
  description, social links.
  - **Short description** — single `shortDescription?: string`,
    `tagline?: string`, `summary?: string`? Constraint:
    invariant 2 forbids a generic `description` at the sponsor
    level. Renderer surface is plan-drafting work — does the
    sponsor card grow a text affordance under the logo, or does
    the link wrap an expanded card?
  - **Social links** — same shape question as band link list;
    same naming-specificity constraint
    (`socialLinks[]` is fine because "social" is the descriptor;
    `links[]` alone is banned). Per-sponsor link list reuses or
    diverges from per-band link list shape — plan-drafting picks
    consistency-vs-specificity.
- **Renderer surface for new band depth fields.** Inline
  in the existing card layout (image above name, quote below
  bio, links inline at the bottom)? Or a "more" / expandable
  affordance? Constraint: invariant 4 — render-when-present;
  test events render unchanged. If "expandable" implies a
  client-side toggle, the components shift from server-only
  to client (`"use client"` directive); that's a structural
  change worth naming explicitly in the plan.
- **Renderer surface for new sponsor depth fields.** Same
  question for sponsors. The current sponsor card is a logo-
  only grid; adding text fields (short description, social
  links) requires either growing the card vertically or
  shifting to a different list shape. Plan-drafting decides
  against the actual visual implication. Consider that
  test-event sponsors don't populate the new fields, so their
  cards stay logo-only — verify visually that mixed-grid
  rendering (some cards with new fields, some without) does
  not look broken.
- **Whether phase 1.3 collapses into 1.2.** Authorized in
  advance per
  [m1-brand-foundation.md §Phase Status](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md).
  The collapse means 1.2's PR also seeds Madrona's placeholder
  lineup and sponsors with the new fields populated (so the
  capture pairs against `/event/madrona*` show the new fields
  rendering). Decision rests on whether the depth-population
  pass against placeholder Madrona content adds
  meaningful diff — if it's 4 placeholder bands × 4 fields and
  4 sponsors × 2 fields = ~24 placeholder string values, the
  collapse likely fires; if the depth pass requires real-feeling
  prose (which is M3 territory), the split holds. Plan-drafting
  decides against actual Madrona content state at phase-1.2-
  start. The collapse is recorded as an
  [Estimate Deviation](/AGENTS.md) in the absorbing phase plan.
- **Test fixture extension shape.** Does
  [`sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx)
  gain new test cases inside the existing `EventLineup` /
  `EventSponsors` describe blocks, or new top-level describe
  blocks for the new fields? Constraint: scoping decision 4
  binds the positive + negative case requirement; structural
  organization is plan-drafting work.
- **Whether `EventLineup.tsx` and `EventSponsors.tsx` shift
  from server-only to client-rendered.** The current components
  are server-rendered by default (no `"use client"` directive,
  no hooks, no event handlers). If a renderer choice for new
  fields requires interactivity (e.g., expandable bio, lightbox
  for band images), the structural shift is non-trivial and
  worth naming explicitly. Default lean: stay server-only;
  expanded surfaces use CSS `:hover` / `:focus` / `details/summary`
  rather than client-side state. Plan-drafting picks against
  actual renderer-surface choice.
- **Per-PR commit shape.** Plan-drafting picks against actual
  diff at phase-1.2-start. Anticipated estimate: one commit for
  type extensions, one commit for renderer extensions, one
  commit for test fixture extensions, one commit for
  doc-currency + status flips — same four-commit shape phase
  1.1 estimates, adapted.

## Plan structure handoff

Phase 1.2 plan adopts the standard phase-plan section set per
AGENTS.md "Phase Planning Sessions → Plan owns" — Status,
Context, Goal, Cross-Cutting Invariants, Naming, Contracts,
Files to touch, Execution Steps, Commit Boundaries, Validation
Gate, Self-Review Audits, Documentation Currency PR Gate, Out
Of Scope, Risk Register, Backlog Impact, Related Docs.

The plan's **Naming** section absorbs the concrete field names
the plan-drafting session picks for each band-depth and sponsor-
depth field (per the open decisions above). The deliberation
prose for any rejected naming alternatives lives in the plan's
Naming subsection itself if it's load-bearing on the chosen
name's defensibility, or stays out of the plan if the choice is
unambiguous after constraint application.

The plan's **Contracts** section names:
- The `EventContent.lineup[number]` extension shape (full
  exact field set with types).
- The `EventContent.sponsors[number]` extension shape.
- The `EventLineup.tsx` renderer extension contract (which
  fields render where, conditional on what truthiness check).
- The `EventSponsors.tsx` renderer extension contract (same).
- The `tests/site/event/sectionComponents.test.tsx` fixture
  extension contract (positive-case and negative-case
  assertions per new field group).
- (If phase 1.3 collapses) The
  `apps/site/events/madrona.ts` placeholder-content extension
  contract for populating the new fields against placeholder
  bands and sponsors.

The plan's **Self-Review Audits** section walks the four epic
Cross-Cutting Invariants plus the four milestone-level
invariants from
[m1-brand-foundation.md §Cross-Phase Invariants](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
against the diff surface. Invariant 2 (no foreclosure of
donation/feedback child epics) is the load-bearing audit for
this phase — the plan's audit walks every new field name
against the constraint in scoping decision 3.

The plan's **Validation Gate** mirrors the precedent set by
phase 1.1 (npm lint + build:web + build:site + manual capture
pairs); the load-bearing addition is the byte-for-byte
falsifier check against the existing test-event landings
(harvest-block-party and riverside-jam render unchanged), which
the plan's Execution Steps name explicitly. Capture-pair shape:
two pairs comparing pre-1.2 and post-1.2 renders of the same
test-event landing; one pair comparing
`/event/madrona`'s lineup section before vs. after if 1.3
collapses (so the "new fields render when populated" reads
against actual Madrona content rather than a synthetic
fixture).

## Reality-check inputs

The plan must verify these against current code at
plan-drafting time, not against this scoping doc's citations
(which may drift between scoping and plan-drafting, especially
since 1.1 lands between scoping-open and plan-draft):

- **`apps/site/lib/eventContent.ts` `EventContent` type.**
  Re-read the full type at plan-drafting; confirm 1.1's
  `meta.{robots,logoSrc,logoAlt}` additions landed as planned;
  confirm `lineup[]` and `sponsors[]` literal shapes are
  unchanged from current scoping-time state (lines 55-67) so
  the extension target is what scoping assumed.
- **`apps/site/components/event/EventLineup.tsx` and
  `EventSponsors.tsx`.** Re-read; confirm 1.1 made no incidental
  edits (1.1's plan names neither file as touched); confirm
  the truthiness-guard precedents at the cited lines remain
  the pattern the new fields' renders mirror. Note: 1.1 ships
  `EventHeader.tsx` edits, which means `_event.scss` may carry
  any new/adjusted classNames — confirm the scss file's state
  to make sure renderer extensions for 1.2 don't collide with
  1.1's logo render.
- **`apps/site/events/harvest-block-party.ts` and
  `riverside-jam.ts`.** Re-read both files' lineup and sponsors
  arrays; confirm field population is unchanged from scoping-
  time state. The byte-for-byte falsifier rests on these
  modules being structurally identical pre- and post-1.2.
- **`apps/site/events/madrona.ts`** (post-1.1). Read fully to
  confirm placeholder lineup and sponsors landed as 1.1's plan
  estimates; the renderer-extension capture pairs that include
  `/event/madrona*` rest on this file's existence.
- **`tests/site/event/sectionComponents.test.tsx`.** Re-read
  the full file; confirm the existing `baseContent` fixture
  shape and the per-component describe-block organization. The
  plan's test-fixture extension contract rests on this layout.
- **Donation/feedback child epic scoping docs.** Re-check
  `docs/plans/epics/madrona-donation/` and
  `docs/plans/epics/madrona-feedback/` directories at plan-
  drafting time; if either has been authored between scoping
  and plan-drafting, walk every settled field-shape signal in
  those docs against the field names the plan proposes. If
  neither has surfaced, the plan's invariant 2 audit rests on
  field-naming specificity alone (per scoping decision 3).
- **Apps/web `lineup[]` / `sponsors[]` consumers.** Re-grep
  `apps/web/` for `\.lineup` and `\.sponsors`; confirm zero
  matches still hold at plan-drafting time. If any apps/web
  feature lands between scoping and plan-drafting that reads
  these arrays, the plan's "no apps/web changes" decision
  re-opens.
- **Apps/site home-page demo showcase consumers.** Re-grep
  `apps/site/components/home/` for `lineup` and `sponsors`;
  confirm only prose mentions, not array reads, hold at plan-
  drafting time. Confirmed at scoping: `HomeHero.tsx` line 30
  and `HarvestNarrative.tsx` line 78 are prose mentions, not
  array reads.
- **`shared/styles/_tokens.scss` and `apps/site/app/styles/_event.scss`
  surface.** Re-read both files' band-card and sponsor-card-
  related sections; the renderer extensions may need new
  classNames or use existing ones. Constraint: per
  [docs/styling.md](/docs/styling.md) "Two Buckets," extensions
  use existing themable tokens (`--surface-card`,
  `--border-soft`, `--radius-card`); new tokens are out of
  scope unless the renderer surface picked at plan-drafting
  has a load-bearing reason. Phase 1.1 may have adjusted these
  files for the logo render — re-confirm state.
- **AGENTS.md "Estimate Deviations" rule.** Confirm the rule's
  section heading (the plan's PR body's `## Estimate
  Deviations` section is the canonical surface for the
  collapse-of-1.3-into-1.2 deviation if it fires).

The grep procedure for any stale "M4 phase 4.x" references
across the repo runs at plan-drafting time as part of the doc-
currency rebaseline; phase 1.1 owns the bulk of those rewrites
per
[m1-phase-1-1-plan.md §Documentation Currency PR Gate](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md),
but if any references survive into 1.2's slice (e.g., references
specifically tied to `EventContent` shape extensions), the plan
records them.
