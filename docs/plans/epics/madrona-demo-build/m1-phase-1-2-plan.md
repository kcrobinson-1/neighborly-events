# M1 phase 1.2 — `EventContent` shape extensions + section component renderer updates

## Status

Landed 2026-05-04. Phase 1.3 collapsed into this PR per the
milestone-doc-authorized deviation
([m1-brand-foundation.md `## Phase Status`](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md));
the per-PR rationale was recorded in the merging PR's
`## Estimate Deviations` section.

The `In draft` → `Proposed` promotion gate was satisfied at
promotion time:

- **Phase 1.1 merged 2026-05-04**
  ([m1-phase-1-1-plan.md](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md)).
  Post-1.1 state of `apps/site/lib/eventContent.ts`,
  `EventLineup.tsx`, `EventSponsors.tsx`, and
  `apps/site/events/madrona.ts` is observable. Reality-check
  inputs re-confirmed at promotion: `EventContent` type now
  starts at line 49 (header docstring expanded for 1.1's
  `meta.{robots,logoSrc,logoAlt}` paragraph); `lineup[]`
  literal at lines 79-83 and `sponsors[]` literal at lines
  85-92; renderers structurally unchanged (only doc-currency
  comment rewrites in `EventSponsors.tsx`); `madrona.ts`
  exists with placeholder content per the 1.1 plan's contract.
- **Naming decisions settled.** The proposed field names —
  `imageSrc?` + `imageAlt?`, `extendedBio?`,
  `featuredQuote?: { text; attribution? }`, `externalLinks?`,
  `shortDescription?`, `socialLinks?` — were walked at plan-draft
  time (landed 2026-05-04) with no rebuttal; they are the
  contract this plan ships against.
- **Donation/feedback child epic re-grep confirmed neither
  has scoped.** `docs/plans/epics/madrona-donation/` and
  `docs/plans/epics/madrona-feedback/` directories do not
  exist at promotion time; the invariant-2 audit operates on
  field-naming specificity alone (per scoping decision 3).

## Context

Phase 1.2 ships the second half of M1's brand-foundation work:
the `EventContent` type's band and sponsor literals gain depth
fields agreed at the parent epic's scoping session — band image,
external links, longer bio, featured quote; sponsor short
description, social links — and the apps/site renderers that
consume `lineup[]` and `sponsors[]` extend to render the new
fields when they are populated. The load-bearing falsifier the
phase commits to is that the existing test events
(`harvest-block-party`, `riverside-jam`) render byte-for-byte
unchanged after the merge — proving epic invariant 4
(`render-when-present, not require-when-absent`) holds across
every consumer of the extended literals.

Why now: per the parent
[Madrona demo-build epic](/docs/plans/epics/madrona-demo-build/epic.md)
and the
[M1 milestone doc](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md),
M1's brand foundation is what M3's real Madrona content authoring
operates against; if the shape extensions land in M3 alongside
real-content authoring, the review surface entangles two
concerns (shape change + content authoring) and the
content-authoring loop with the neighborhood association is
gated on shape decisions that are not yet settled. Landing the
shape extensions during M1 — against the placeholder Madrona
content phase 1.1 ships — keeps the M3 review surface tight on
prose-and-image authoring rather than type churn. M2 (gameplay
wiring) and the donation/feedback child epics inherit a
shape-stable `EventContent` from the moment 1.2 merges.

What this touches at the conceptual level: the shared content-
shape contract (`apps/site/lib/eventContent.ts`'s `EventContent`
type, specifically the `lineup[number]` and `sponsors[number]`
literal shapes), two apps/site section components that render
the lineup and sponsors arrays, the unit-test fixture that
covers those components, and (depending on whether phase 1.3
collapses into 1.2 — see open decision in scoping) Madrona's
placeholder content module. Apps/web is unchanged; the apps/web
event-route shells do not consume `lineup[]` or `sponsors[]`
arrays, only `EventContent` at the page-level Theme cascade.

## Goal

After this PR:

- `EventContent.lineup[number]` carries the band-depth optional
  fields named in §Naming below — image, external links, longer
  bio, featured quote — as `?: T` optional fields per scoping
  decision 1
  (`Verified by:`
  scoping/m1-phase-1-2.md §Decisions made at scoping time);
- `EventContent.sponsors[number]` carries the sponsor-depth
  optional fields — short description, social links — as `?: T`
  optional fields, same rule;
- [`EventLineup.tsx`](/apps/site/components/event/EventLineup.tsx)
  renders each new band-depth field with a truthiness guard
  matching the existing `bio` and `setTimes.length > 0`
  precedents
  (`Verified by:`
  [EventLineup.tsx:24-26 and 27-33](/apps/site/components/event/EventLineup.tsx)
  for the existing guard patterns; post-1.1 state confirmed
  unchanged at promotion);
- [`EventSponsors.tsx`](/apps/site/components/event/EventSponsors.tsx)
  renders each new sponsor-depth field with the same guard
  pattern;
- the existing test events
  ([`harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts)
  and
  [`riverside-jam.ts`](/apps/site/events/riverside-jam.ts))
  render byte-for-byte unchanged, validating epic invariant 4 —
  the load-bearing falsifier walked in §Validation Gate;
- [`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx)
  gains positive-case tests (new fields populated → renderer
  renders them) and negative-case tests (new fields omitted →
  renderer renders nothing for them) per scoping decision 4;
- (if phase 1.3 collapses into 1.2 per the open decision in
  scoping) `apps/site/events/madrona.ts` extends its placeholder
  lineup and sponsors to populate the new fields against
  placeholder bands and sponsors, so the capture pairs against
  `/event/madrona*` show the extended renderers exercising the
  new fields end-to-end;
- doc-currency: any reference in the M1 doc-currency map that
  names phase 1.2 specifically as the type-extension site is
  rewritten to point at this PR; the milestone doc's Phase
  Status row 1.2 (and 1.3 if collapsed) flips to `Landed` with
  this PR's number.

Phase 1.2 does **not** author real Madrona content (M3's scope),
does **not** wire gameplay against `slug=madrona` (M2's scope),
and does **not** ship apps/web changes (scoping decision 5).

## Cross-Cutting Invariants

This phase binds the four parent-epic invariants and the four
milestone-level invariants verbatim by reference; self-review
walks each against this PR's diff:

- The four epic-level invariants from
  [docs/plans/epics/madrona-demo-build/epic.md:143-185](/docs/plans/epics/madrona-demo-build/epic.md):
  no foreclosure of '27 native series; no foreclosure of
  donation/feedback child epics; Madrona is not a test event;
  every `EventContent` consumer renders gracefully when new
  band/sponsor fields are absent.
- The four milestone-level invariants from
  [m1-brand-foundation.md §Cross-Phase Invariants](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md):
  cross-app theme-continuity for `slug=madrona`; `noindex`
  enforced from phase 1.1 onward; token-classification bucket
  integrity for the new Theme; section component renderer
  updates are render-when-present (this phase's load-bearing
  invariant — see §Self-Review Audits).

**Load-bearing for this phase: invariant 2 + invariant 4.**
Invariant 2 (no foreclosure of donation/feedback child epics) is
the load-bearing audit for the Naming decisions in §Naming below
— every new field name is walked against the constraint in
scoping decision 3.
Invariant 4 (render-when-present) is load-bearing on every
renderer-extension contract in §Contracts — the byte-for-byte
falsifier against the test events is the structural anchor.

**No per-phase additions** beyond what the milestone and epic
already bind.

## Naming

Settled. The following spellings are the contract this plan
ships against; they were walked at plan-draft review time
(landed 2026-05-04) with no rebuttal under the constraints in
scoping decision 3 — no foreclosure of donation/feedback child
epics.
Rationale per name is preserved so future readers can
reconstruct the choice without diving back into the review
thread.

### Band depth fields

Added to `EventContent.lineup[number]`:

- **`imageSrc?: string`** + **`imageAlt?: string`** — paired
  optional fields for the band image. Mirrors phase 1.1's
  `meta.logoSrc/Alt` precedent (flat optional pair with self-
  review-walked pairing rather than nested object); aligns with
  scoping decision 1 (additive optional, no nested objects for
  shape-consistency with the flat literal).
  - **Renderer fallback:** if `imageSrc` is present and
    `imageAlt` is absent, the renderer falls back to
    `performer.name` for the alt text (recoverable pairing,
    not load-bearing per scoping decision 1's mitigation note).
  - **Why not generic `image?: { src; alt; caption? }`:** nested
    objects fight the existing flat-literal shape; deviates from
    1.1's precedent.
- **`extendedBio?: string`** — longer bio. Naming-specificity
  defense: a generic `description?` would foreclose the
  feedback/donation child epics' potential `description` needs
  on `lineup[number]`; `extendedBio` is band-specific.
  Multi-paragraph convention: `\n\n`-separated paragraphs the
  renderer splits with a deterministic transform; markdown is
  out of scope for 1.2 (no markdown infrastructure exists in
  apps/site today).
  - **Why not `longBio?` / `fullBio?`:** synonymous; `extendedBio`
    reads as additive (extends `bio`) rather than replacing it,
    which matches the renderer's behavior (both render when
    present).
- **`featuredQuote?: { text: string; attribution?: string }`** —
  nested object. The pair of `text` and optional `attribution`
  is conceptually one field and `attribution` is meaningless
  without `text`; nesting communicates this. Naming-specificity:
  `quote` alone risks ambiguity (a future donation appeal might
  want a quote field); `featuredQuote` reads as band-specific
  framing.
  - **Why nested here but flat for `imageSrc`/`imageAlt`:** the
    image pair has a recoverable fallback (`alt` defaults to
    `name`); the quote pair does not (`attribution` without
    `text` is meaningless). Nesting communicates the
    "attribution requires text" semantic the type system
    cannot enforce on flat optional fields.
- **`externalLinks?: Array<{ label: string; href: string }>`** —
  array of band-external links (Spotify, Bandcamp, Soundcloud,
  band website, social media). Naming-specificity: scoping
  decision 3 explicitly bans a generic `links[]` at
  `lineup[number]`; `externalLinks` reads as band-specific
  external presence. Each entry carries a human-readable
  `label` (e.g., "Spotify", "Bandcamp", "Website") and the
  `href`; renderer renders them as a `<ul>` of `<a>` links.
  - **Why not platform-keyed (`{ platform: "spotify" | ...; href }`):**
    over-specifies; locks the type to a closed enum that adds
    type-system friction every time a band uses a platform not
    in the union. The `label` string keeps authoring flexible
    while preserving the constraint that the link is band-
    external (not e.g. donation-link).

### Sponsor depth fields

Added to `EventContent.sponsors[number]`:

- **`shortDescription?: string`** — sponsor short description.
  Naming-specificity: a generic `description?` is banned by
  scoping decision 3; `shortDescription` reads as a sponsor-
  card-specific summary distinct from any future
  feedback/donation epic descriptions. Renderer renders below
  the logo; the sponsor card grows vertically.
  - **Why not `tagline?` / `summary?`:** `tagline` is sometimes
    used for branded slogans rather than descriptive copy;
    `summary` reads more like "executive summary" than
    "short prose about this sponsor." `shortDescription` is
    descriptively neutral and unambiguous.
- **`socialLinks?: Array<{ label: string; href: string }>`** —
  sponsor's social presence (Instagram, LinkedIn, Facebook,
  brand website if not already in `href`). Same shape as bands'
  `externalLinks` for consistency; different name because the
  semantic role differs (sponsors' link primary is `href` —
  their main brand site; `socialLinks` is supplemental social
  presence).
  - **Why a different name from bands' `externalLinks`:** the
    sponsor card's primary link is already `href`; the new
    array is supplemental and "social-presence-flavored." A
    band has no analogous primary link (the band card has no
    `href` field), so its supplemental array is more naturally
    called "external links."
  - **Why not unify under one name across bands and sponsors:**
    the semantic role differs; merging would force a generic
    name (`links[]`) banned by scoping decision 3.

### Renderer surface choices

`EventLineup.tsx` per-band card extends to render new fields in
this order (top to bottom inside the `<li>`):

1. `<img className="event-lineup-image" src={imageSrc} alt={imageAlt ?? name} />`
   when `imageSrc` is present (above `<h3>`).
2. `<h3 className="event-lineup-name">{name}</h3>` (existing).
3. `<p className="event-lineup-bio">{bio}</p>` when `bio` is
   present (existing).
4. `<div className="event-lineup-extended-bio">{paragraphs}</div>`
   when `extendedBio` is present, with paragraphs as
   `extendedBio.split("\n\n").map(p => <p>{p}</p>)`.
5. `<blockquote className="event-lineup-quote">` when
   `featuredQuote` is present, with `<p>{text}</p>` and (if
   `attribution`) `<cite>{attribution}</cite>`.
6. `<ul className="event-lineup-external-links">` when
   `externalLinks` is non-empty, with each entry as
   `<li><a href={href} target="_blank" rel="noopener noreferrer">{label}</a></li>`.
7. `<p className="event-lineup-set-times">...</p>` (existing).

`EventSponsors.tsx` per-sponsor card extends to render new
fields below the existing `<img>` link, inside the existing
`<li className="event-sponsors-item">`:

1. Existing `<a><img /></a>` link (unchanged).
2. `<p className="event-sponsors-short-description">{shortDescription}</p>`
   when `shortDescription` is present.
3. `<ul className="event-sponsors-social-links">` when
   `socialLinks` is non-empty, with each entry as
   `<li><a href={href} target="_blank" rel="noopener noreferrer">{label}</a></li>`.

**Why no expandable / `<details>/<summary>` affordance:**
keeping the components server-only avoids the structural shift
to `"use client"`. The cards grow vertically when fields are
populated; absent fields render nothing (no empty container,
no placeholder DOM); test events stay logo-only or
name-bio-set-times-only.

**ClassName conventions** match the existing
`event-lineup-*` and `event-sponsors-*` BEM-ish prefixes; new
SCSS rules in
[`apps/site/app/styles/_event.scss`](/apps/site/app/styles/_event.scss)
use the existing themable tokens (`--surface-card`,
`--border-soft`, `--radius-card`) per scoping decision 5's
constraint that no new tokens land in 1.2 unless surfaced as
load-bearing.

## Contracts

### `EventContent.lineup[number]` extension contract

[`apps/site/lib/eventContent.ts:79-83`](/apps/site/lib/eventContent.ts)
(post-1.1 line range; re-verify at edit time) gains four new
optional fields after `bio?: string`:

```
lineup: Array<{
  slug: string;
  name: string;
  bio?: string;
  imageSrc?: string;       // ← new
  imageAlt?: string;       // ← new
  extendedBio?: string;    // ← new
  featuredQuote?: { text: string; attribution?: string };  // ← new
  externalLinks?: Array<{ label: string; href: string }>;  // ← new
  setTimes: Array<{ day: string; time: string }>;
}>;
```

Field ordering: new optional fields land grouped after `bio?`
and before `setTimes` (the only required-after-optionals field
in the literal), so the type reads "core identity → optional
descriptive depth → set-times performance metadata."

The `EventContent` header docstring at
[`apps/site/lib/eventContent.ts:1-26`](/apps/site/lib/eventContent.ts)
gains a paragraph naming the new band-depth and sponsor-depth
fields and the render-when-present discipline. Exact wording at
edit time; see §Documentation Currency PR Gate.

### `EventContent.sponsors[number]` extension contract

[`apps/site/lib/eventContent.ts:85-92`](/apps/site/lib/eventContent.ts)
(post-1.1 line range; re-verify at edit time) gains two new
optional fields after `tier?: string`:

```
sponsors: Array<{
  name: string;
  logoSrc: string;
  logoAlt: string;
  href: string;
  tier?: string;
  shortDescription?: string;  // ← new
  socialLinks?: Array<{ label: string; href: string }>;  // ← new
}>;
```

### `EventLineup.tsx` renderer extension contract

The extended JSX render order is named in §Naming above. Each
new field is guarded by its own truthiness check, mirroring the
existing `performer.bio ? ... : null` pattern at
[`EventLineup.tsx:24-26`](/apps/site/components/event/EventLineup.tsx).
Array fields use `.length > 0` mirroring the existing
`performer.setTimes.length > 0` pattern at
[`EventLineup.tsx:27-33`](/apps/site/components/event/EventLineup.tsx).

The component remains server-only (no `"use client"`, no hooks,
no event handlers). External link `<a>` elements carry
`target="_blank" rel="noopener noreferrer"` per the precedent at
[`EventSponsors.tsx:67-72`](/apps/site/components/event/EventSponsors.tsx).

### `EventSponsors.tsx` renderer extension contract

Same shape as the lineup contract; new fields render below the
existing `<a><img /></a>` block inside the existing
`<li className="event-sponsors-item">`. No edit to
`groupSponsorsByTier` (lines 11-33); the grouping logic remains
tier-based and the new fields are per-sponsor rendering, not
per-group.

### Test fixture extension contract

[`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx)
gains:

- **Per band-depth field** (5 fields: imageSrc/Alt as a pair,
  extendedBio, featuredQuote, externalLinks): one positive-case
  test asserting the renderer renders the populated field, and
  one negative-case test asserting the renderer renders nothing
  for the absent field.
- **Per sponsor-depth field** (2 fields): same pair of tests.
- **`imageAlt` fallback**: one test asserting that when
  `imageSrc` is present and `imageAlt` is absent, the rendered
  `<img>`'s `alt` equals the performer's `name`.
- **`featuredQuote` partial**: one test asserting that when
  `featuredQuote.text` is present and `attribution` is absent,
  the `<blockquote>` renders the `<p>` but not the `<cite>`.

The existing `baseContent` fixture is extended with the new
fields populated for the positive-case tests; the negative-case
tests use a synthetic fixture that omits each field.
Alternatively (plan-drafting picks at implementation time), the
positive-case tests construct per-test fixtures that populate
only the field under test. The choice is reviewer-stylistic and
named here as a permitted shape, not a binding contract.

### Madrona placeholder-content extension contract (conditional)

If scoping's open decision on phase 1.3 collapse
fires (collapse: 1.2 absorbs 1.3), then
[`apps/site/events/madrona.ts`](/apps/site/events/madrona.ts)'s
placeholder lineup and sponsors arrays gain populated values for
each new field on at least one entry, sufficient to exercise
each new renderer affordance against `/event/madrona*` capture
pairs. Authoring-time decisions:

- At least one band has all 5 new fields populated; the other
  bands populate a varied mix (one with image only, one with
  extendedBio + featuredQuote, one with externalLinks only) so
  the capture pair shows mixed-population rendering.
- At least one sponsor has both new fields populated; others
  vary.
- Placeholder values are explicitly placeholder (the
  `madronaContent.faq` already names "this is a demo URL" per
  the
  [phase 1.1 plan](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md);
  the phase 1.2 placeholder values do not need to repeat the
  framing).

If the collapse does not fire, `madrona.ts` is intentionally
not touched in 1.2; phase 1.3 owns the depth-population pass.
Recorded in the PR body's `## Estimate Deviations` section per
AGENTS.md.

## Files to touch

This list is the planner's pre-implementation estimate of the
expected diff shape per AGENTS.md "Plan content is a mix of
rules and estimates"; implementation may revise when a
structural call requires deviating, recorded in the PR body's
`## Estimate Deviations` section.

### New

- None. The phase ships type extensions and renderer
  extensions, not new files. (If 1.3 collapses, no new files
  either — `madrona.ts` is modified, not added; phase 1.1
  shipped it.)

### Modify

- [apps/site/lib/eventContent.ts](/apps/site/lib/eventContent.ts)
  — `EventContent.lineup[number]` extension + `sponsors[number]`
  extension + header-docstring paragraph addition per
  Contracts.
- [apps/site/components/event/EventLineup.tsx](/apps/site/components/event/EventLineup.tsx)
  — five new conditional renders per the renderer extension
  contract; component header docstring gains a sentence naming
  the render-when-present discipline.
- [apps/site/components/event/EventSponsors.tsx](/apps/site/components/event/EventSponsors.tsx)
  — two new conditional renders per the renderer extension
  contract; same docstring update.
- [apps/site/app/styles/_event.scss](/apps/site/app/styles/_event.scss)
  — new SCSS rules for the new classNames named in §Naming
  (`event-lineup-image`, `event-lineup-extended-bio`,
  `event-lineup-quote`, `event-lineup-external-links`,
  `event-sponsors-short-description`,
  `event-sponsors-social-links`); use existing themable tokens
  per scoping decision 5.
- [tests/site/event/sectionComponents.test.tsx](/tests/site/event/sectionComponents.test.tsx)
  — positive- and negative-case tests per the test fixture
  extension contract; `baseContent` fixture extension.
- [docs/plans/epics/madrona-demo-build/m1-brand-foundation.md](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
  — Phase Status row 1.2: Status `Plan-pending` → `Landed`, PR
  column points at this PR. If 1.3 collapses, row 1.3's
  Status flips to `Collapsed into 1.2` (or similar terminal
  label).
- [docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md](/docs/plans/epics/madrona-demo-build/m1-phase-1-2-plan.md)
  — this plan's Status flips `Proposed` → `Landed` at PR-merge
  time, with the PR number recorded.
- docs/plans/epics/madrona-demo-build/scoping/m1-phase-1-2.md
  — Status `Scoping in progress` → `Absorbed into plan` (or
  similar terminal label); the file deletes in batch with
  sibling scoping docs at the milestone-terminal PR.
- (Conditional, if 1.3 collapses)
  [apps/site/events/madrona.ts](/apps/site/events/madrona.ts)
  — placeholder content extensions per the Madrona
  placeholder-content extension contract.

### Intentionally not touched

- [apps/site/events/harvest-block-party.ts](/apps/site/events/harvest-block-party.ts)
  and
  [apps/site/events/riverside-jam.ts](/apps/site/events/riverside-jam.ts)
  — not extended with the new fields. The byte-for-byte
  falsifier rests on these modules being structurally identical
  pre- and post-1.2; populating the new fields would defeat the
  falsifier. Test events serve the platform-test role; M3 may
  revisit if the platform demo expands to show test events with
  depth fields populated, but that's not 1.2's scope.
- `apps/web/**` — zero apps/web edits per scoping decision 5.
  The cross-app theme-continuity invariant established by 1.1
  does not regress because 1.2 ships no apps/web change.
- [shared/styles/_tokens.scss](/shared/styles/_tokens.scss) —
  no new tokens. Renderer extensions use existing themable
  tokens per scoping decision 5's constraint. If implementation
  surfaces a token-classification gap (a new card affordance
  reads wrong-bucket), the fix is a one-line `_tokens.scss` /
  component edit per the milestone-doc token-classification
  invariant; rule-shape ripples surface as backlog.
- [shared/styles/themes/madrona.ts](/shared/styles/themes/madrona.ts)
  and
  [shared/styles/themes/index.ts](/shared/styles/themes/index.ts)
  — no Theme edits. The Madrona Theme literal landed in phase
  1.1 and applies unchanged.
- [apps/site/components/event/EventHeader.tsx](/apps/site/components/event/EventHeader.tsx),
  `EventSchedule.tsx`, `EventFAQ.tsx`, `EventCTA.tsx`,
  `EventFooter.tsx` — no other section component edits. The
  shape extensions touch only `lineup[]` and `sponsors[]`.
- [shared/events/testEventAllowlist.ts](/shared/events/testEventAllowlist.ts)
  — `TEST_EVENT_SLUGS` does not change (epic invariant 3).
- Any Supabase migration, Edge Function, or RPC — phase 1.2
  has no SQL or backend-function surface.

## Execution Steps

This sequence is the planner's pre-implementation estimate of
the expected execution shape per AGENTS.md "Plan content is a
mix of rules and estimates"; the implementer may refine.

1. **Branch hygiene.** Worktree off main (1.1 merged 2026-05-04).
   Branch rename to a semantic slug per the AGENTS.md / memory
   rule "Rename auto-generated worktree branches to a semantic
   slug" — likely `feat/madrona-m1-phase-1-2`.
2. **Baseline validation.** `npm run lint`, `npm run build:web`,
   `npm run build:site` (the site build is required because
   apps/site is touched per memory rule).
3. **Reality-check re-run.** Re-verify every line-number
   citation in
   scoping/m1-phase-1-2.md §Reality-check inputs
   against current code. Re-grep
   `docs/plans/epics/madrona-donation/` and
   `docs/plans/epics/madrona-feedback/` for any child-epic
   scoping content that has appeared between scoping and now;
   if found, walk this plan's Naming section against any
   settled signal in those docs.
4. **Decide on 1.3 collapse.** Read post-1.1
   `apps/site/events/madrona.ts`; estimate the diff size of
   populating the new fields against placeholder bands and
   sponsors. If the addition is bounded to ~24 placeholder
   string values and a few placeholder image paths, collapse;
   record in `## Estimate Deviations` section of the PR body.
5. **Type extensions.** Edit
   `apps/site/lib/eventContent.ts` per the Contracts section;
   field ordering as named in §Contracts; header docstring
   paragraph addition.
6. **Renderer extensions.** Edit `EventLineup.tsx` and
   `EventSponsors.tsx` per the renderer extension contracts;
   walk render-when-present at every new conditional.
7. **SCSS additions.** Edit `_event.scss` with new rules for
   the new classNames; reuse existing themable tokens.
8. **Test fixture extensions.** Edit
   `sectionComponents.test.tsx` per the test fixture extension
   contract; positive- and negative-case per new field group;
   `imageAlt` fallback test; `featuredQuote` partial test.
9. **(If 1.3 collapses) Madrona placeholder-content extension.**
   Edit `apps/site/events/madrona.ts` per the conditional
   contract.
10. **Validation pre-deploy.** `npm run lint` +
    `npm run build:web` + `npm run build:site` confirm green;
    `npm test` runs the new unit tests.
11. **Open draft PR.** Vercel produces preview URL on push.
    Mark as draft so review attention is on Validation captures
    first.
12. **Capture-pair set.** Per §Validation Gate below: two pairs
    comparing pre-1.2 and post-1.2 renders of the test-event
    landings (`/event/harvest-block-party` and
    `/event/riverside-jam`) to confirm byte-for-byte
    equivalence; one pair (or two if 1.3 collapses) showing the
    new renderers exercising new fields against
    `/event/madrona`'s lineup and sponsors sections.
13. **Token-correction triage.** If any in-app capture shows
    visible regression beyond brand-color-shift (a new card
    affordance reads wrong-bucket; a hard-coded color survives),
    apply one-line `_tokens.scss` / component edits per the
    milestone-doc token-classification invariant. Decisions
    that ripple beyond one-line edits surface as focused
    follow-up backlog items per AGENTS.md "Plan-to-PR
    Completion Gate."
14. **Status flips.** Phase Status rows 1.2 (and 1.3 if
    collapsed) in the milestone doc update to `Landed`; this
    plan's Status flips `Proposed` → `Landed`; the scoping
    doc's Status flips to `Absorbed into plan`.
15. **Self-review pass.** Walk the audit set in §Self-Review
    Audits below; AGENTS.md "Plan-to-PR Completion Gate" walk;
    AGENTS.md "Doc Currency PR Gate" walk; AGENTS.md "Estimate
    Deviations" walk against this plan's estimate-shaped
    sections.
16. **PR ready for review.** Mark out of draft.

## Commit Boundaries

Pre-implementation estimate per AGENTS.md "Plan content is a
mix of rules and estimates":

- **Commit 1 — Type extensions.**
  `apps/site/lib/eventContent.ts` (lineup[number] extension +
  sponsors[number] extension + header docstring update).
- **Commit 2 — Renderer extensions + SCSS.**
  `apps/site/components/event/EventLineup.tsx`,
  `apps/site/components/event/EventSponsors.tsx`,
  `apps/site/app/styles/_event.scss`.
- **Commit 3 — Test fixture extensions.**
  `tests/site/event/sectionComponents.test.tsx` (positive- and
  negative-case tests; `baseContent` fixture extension).
- **Commit 4 — (If 1.3 collapses) Madrona placeholder content.**
  `apps/site/events/madrona.ts` placeholder population.
- **Commit 5 — Doc updates + Status flips.**
  `m1-brand-foundation.md` (Phase Status rows),
  `m1-phase-1-2-plan.md` (Status flip),
  `scoping/m1-phase-1-2.md` (Status flip).
- **Optional Commit 6+ — review-fix commits.** Per AGENTS.md
  "PR-sized work, name the intended commit boundaries before
  editing when practical, and keep review-fix commits distinct
  when they clarify the history."

The four-or-five-commit shape produces clean review chunks:
type (commit 1), rendering (commits 2-3), content (commit 4 if
collapsed), narrative (commit 5).

## Validation Gate

The validation procedure that proves this PR ships its goal:

- **`npm run lint`** — green.
- **`npm run build:web`** — green.
- **`npm run build:site`** — green; the apps/site touch
  requires this gate per the project memory rule "build:site
  whenever apps/site is touched."
- **`npm test` against `tests/site/event/sectionComponents.test.tsx`**
  — every new positive-case, negative-case, fallback, and
  partial test passes.
- **Manual capture pairs in PR body's Validation section.**
  - **Test-event byte-for-byte falsifier (load-bearing).** Two
    capture pairs: pre-1.2 vs. post-1.2 render of
    `/event/harvest-block-party` and
    `/event/riverside-jam`'s lineup and sponsors sections,
    each with a match-assertion sentence. Procedure passes if
    every pair shows zero visual delta. Falsifier: any visual
    delta on the test-event landings means a renderer
    extension is rendering when fields are absent (regressing
    invariant 4).
  - **Madrona positive-case capture (1+ pairs).** One pair
    showing `/event/madrona`'s lineup section before vs.
    after the renderer extensions exercise the new fields. If
    1.3 has collapsed, also one pair for the sponsors section.
    The capture asserts the new-field renders are visually
    correct and read as Madrona-themed (Theme cascade
    unchanged from 1.1).
- **Plan-to-PR Completion Gate walk.** Every Goal,
  Self-Review audit, Validation step, and Documentation
  Currency entry is satisfied or explicitly deferred-with-
  rationale-in-this-plan before the PR opens.
- **Estimate Deviations callout in PR body.** Per AGENTS.md,
  the PR body names any deviation from this plan's estimate-
  shaped sections (Files to touch, Execution Steps, Commit
  Boundaries) under `## Estimate Deviations`, or `N/A` if
  none. Anticipated deviation candidate: phase 1.3 collapse
  decision; field-naming changes if reviewer rebuts a
  proposed name; child-epic scoping signal that surfaces
  during plan-drafting and shifts a name.

The validation gate does **not** include a Tier 5 post-deploy
production check. The type extensions and renderer extensions
are verifiable against the PR's Vercel preview deployment plus
the unit tests; preview-deployment-based verification plus
Tier 1 unit tests is the canonical tier per
[`docs/testing-tiers.md`](/docs/testing-tiers.md). Status flips
to `Landed` in this PR.

## Self-Review Audits

Walk the named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
against this PR's diff surfaces. The diff covers:

1. **TypeScript / Edge Function contracts** — `EventContent`
   shape extensions; renderer prop-shape adapts to new fields.
2. **Frontend save paths / lifecycle / async** — none. The
   page route is a Server Component; renderers are server-only;
   no save paths, no client-side state.
3. **SQL migrations / Edge Functions / runbook** — none.
4. **Operational scripts / CI** — none.
5. **Frontend rendering / structural-classification** — five
   new band-depth conditional renders + two new sponsor-depth
   conditional renders + corresponding SCSS additions; capture
   pairs verify the visual outcome and the byte-for-byte
   falsifier verifies invariant 4.

The catalog's audits are scoped primarily to SQL / Edge
Function / save-path / lifecycle / CI / runbook surfaces;
**frontend rendering / structural-classification** audits apply
where they exist. The implementer confirms this enumeration
during self-review and records "the catalog audits in scope
for this diff are <list>" in the PR body's Self-Review section,
alongside the milestone-doc-level walks listed below:

- **Epic invariant 1 walk** — no `/series/*` namespace claim,
  no Madrona-specific globals; new fields are on `EventContent`
  shared shape, not Madrona-specific.
- **Epic invariant 2 walk (load-bearing for this phase).** Walk
  every new field name (`imageSrc`, `imageAlt`, `extendedBio`,
  `featuredQuote`, `externalLinks`, `shortDescription`,
  `socialLinks`) against the constraint in
  scoping decision 3:
  none collide with names a future donation- or feedback-child-
  epic shape might want. If the donation or feedback child
  epic scoping has surfaced between scoping and PR, walk
  every settled signal in those docs against the proposed
  names.
- **Epic invariant 3 walk** — `TEST_EVENT_SLUGS` unchanged;
  `madronaContent.testEvent` (if 1.3 collapses) remains
  unset; no test-event disclaimer banner introduced.
- **Epic invariant 4 walk (load-bearing for this phase).** The
  byte-for-byte falsifier against `harvest-block-party` and
  `riverside-jam` rendering captures; negative-case unit tests
  that absent fields render nothing in the DOM.
- **Milestone invariant: cross-app theme-continuity** — no
  apps/web edits; capture pair for Madrona shows palette
  unchanged from 1.1.
- **Milestone invariant: `noindex` from phase 1.1 onward** —
  `madronaContent.meta.robots = "noindex"` (set in 1.1)
  unchanged; curl falsifier optional (already proven by 1.1's
  validation gate).
- **Milestone invariant: token-classification bucket integrity**
  — new SCSS rules consume only existing themable tokens;
  capture review surfaces any wrong-bucket consumption
  surfacing for resolution per scoping decision 5.
- **Milestone invariant: render-when-present** — covered by
  invariant 4 walk above plus negative-case unit tests.

If any walk surfaces a finding, the implementer fixes it in
this PR (per AGENTS.md "if a reviewer flags a gap that should
have been named at plan time, fix the plan first").

## Documentation Currency PR Gate

This PR satisfies the milestone-doc Documentation Currency map
entries owned by phase 1.2:

- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — header docstring paragraph addition naming the band-depth
  and sponsor-depth fields and the render-when-present
  discipline. The doc-currency map names this file as owned by
  1.1 (registry/comment) and 1.2 (shape extension); 1.2 owns
  the type-extension paragraph.
- This plan — Status flips `Proposed` → `Landed` at PR-merge
  time.
- Scoping doc — Status flips to `Absorbed into plan`.
- Milestone doc — Phase Status row 1.2 (and 1.3 if collapsed)
  flips to `Landed`.

The grep procedure: at PR-time, run
`grep -rn "Madrona-launch\|madrona-launch epic\|epics/madrona-launch/" --include="*.ts" --include="*.tsx" --include="*.md"`
across the repo and reconcile any surfaced reference. Phase 1.1
landed the bulk of these rewrites; 1.2's grep should return
zero outside the test-fixture exclusions
(`madrona-launch-day` is a stable test slug; archive docs are
excluded per the AGENTS.md doc-currency rules). If new
references surface (added between 1.1 merge and 1.2 PR), 1.2
addresses them.

[`docs/styling.md`](/docs/styling.md) — no edit expected
unless §Naming surfaces a token-classification question that
requires updating "Two Buckets" guidance. Plan-drafting
re-verifies by reading the relevant section at edit time.

[`docs/dev.md`](/docs/dev.md), [`docs/operations.md`](/docs/operations.md),
[`docs/experience.md`](/docs/experience.md), and
[`README.md`](/README.md) are not knowingly touched by 1.2;
PR-time re-verification by grep against the post-1.1 state of
the files.

## Out Of Scope

Final, not deliberation. Items here are explicitly excluded
from this PR's diff:

- **Real Madrona content authoring.** Bands, sponsors,
  schedule with real names, dates, prose, photos — M3's scope.
  Phase 1.2 ships type extensions and (conditionally on 1.3
  collapse) placeholder content populating the new fields.
- **Gameplay wiring against `slug=madrona`.** M2's scope.
- **Apps/web edits of any kind.** Per scoping decision 5.
- **Test event population of new fields.**
  `harvest-block-party.ts` and `riverside-jam.ts` continue to
  omit the new fields; the byte-for-byte falsifier rests on
  this.
- **New `EventContent` consumers.** Phase 1.2 extends existing
  consumers (`EventLineup.tsx`, `EventSponsors.tsx`); no new
  consumers introduced.
- **Markdown rendering for `extendedBio`.** Plain-text
  multi-paragraph (split on `\n\n`) is the convention for 1.2;
  markdown infrastructure (a markdown parser, sanitizer, etc.)
  is out of scope for this phase. M3 may revisit if real
  Madrona content needs richer formatting.
- **Lightbox / modal for band images.** Plain `<img>` per the
  precedent at
  [`EventSponsors.tsx:73-77`](/apps/site/components/event/EventSponsors.tsx)
  (the deliberate plain-`<img>`-not-`next/image` choice from
  M3 phase 3.1.1). If a future phase needs `next/image` for
  band images specifically, the upgrade is local.
- **Visual-diff tooling (Playwright pixel-diff baselines) for
  the byte-for-byte falsifier.** Out of scope; manual
  capture-pair comparison is the validation tier per the
  demo-expansion epic M1 phase 1.1 precedent. The unit-test
  negative cases provide the structural falsifier the manual
  comparison may miss.
- **Tier 5 post-deploy production check.** The phase's
  validation is preview-deployment-based plus Tier 1 unit
  tests; Status flips to `Landed` in this PR.
- **`docs/styling.md` "Two Buckets" classification table
  restructuring.** One-line value adjustments in `_tokens.scss`
  ship if surfaced during capture review (per the
  milestone-doc token-classification invariant); rule-shape
  ripples surface as backlog with rationale.
- **Per-event font selection.** Madrona reuses Inter +
  Fraunces from the apps/site root layout per
  [`docs/styling.md`](/docs/styling.md)'s "per-event font
  selection is post-epic" framing.

## Risk Register

Phase-implementation-level risks not already covered by the
milestone-doc Cross-Phase Risks (which inherit by reference):

- **Field-naming churn after PR opens.** A reviewer may rebut
  a proposed field name (e.g., `extendedBio` vs.
  `longBio` vs. `fullBio`) and the rename ripples through the
  type, both renderers, the test fixture, and (if collapsed)
  Madrona's placeholder content. Mitigation: the §Naming
  section above carries rationale per name so the rebuttal
  surfaces against the rationale, not the name in isolation;
  the rename-ripple is mechanical (find/replace across the
  diff surface) and bounded.
- **Renderer extension changes test-event rendering.** A
  conditional render that mistakenly evaluates as truthy when
  the field is absent (e.g., `performer.imageSrc !== undefined`
  instead of just `performer.imageSrc`) would render an empty
  `<img>` for every band missing an image — defeating the
  byte-for-byte falsifier. Mitigation: every new conditional
  uses the existing truthy-coercion pattern
  (`performer.imageSrc ? ... : null`); the negative-case unit
  tests assert the absent-field render is empty; the
  byte-for-byte capture pair is the structural falsifier.
- **`extendedBio` paragraph splitter regresses on edge cases.**
  `text.split("\n\n")` returns `[""]` for an empty string and
  splits on `\n\n\n\n` as `["text", "", "text"]` (an empty
  paragraph). Mitigation: the renderer filters `paragraphs`
  through `.filter(p => p.trim().length > 0)` before mapping;
  tests cover the empty-string and triple-newline edge cases
  if they're plausible (the current `bio` field is
  single-paragraph by convention; `extendedBio` may not see
  these edge cases against placeholder content but real-content
  authoring in M3 might).
- **Sponsor card vertical growth breaks grid layout.** The
  existing `event-sponsors-grid` uses
  `grid-template-columns: repeat(auto-fill, minmax(160px, 1fr))`
  (per
  [`EventSponsors.tsx`'s SCSS](/apps/site/app/styles/_event.scss)
  — re-confirmed at edit time). Sponsor cards growing
  vertically (when populated) shift to varying heights, which
  CSS Grid handles by row-height = max-height-of-row. If the
  visual outcome is uneven (some sponsors very tall, others
  logo-only and short), capture review surfaces the gap and
  the implementer aligns via `align-items: start` or similar
  one-line CSS edit. Larger restructuring (e.g., shifting from
  grid to flex, two-column layout) is out of scope for 1.2 and
  would surface as a follow-up backlog item.
- **`featuredQuote` rendering in `<blockquote>` adds default
  browser styling.** Browsers apply default margin / indent to
  `<blockquote>`; capture pair against test events confirms
  the default styling does not regress card visual rhythm.
  Mitigation: SCSS rule for `.event-lineup-quote` resets
  margin / sets explicit styling; one-line CSS.
- **`externalLinks` and `socialLinks` shape divergence.** The
  two arrays share shape (`{ label; href }`) but live on
  different literals with different field names. A future
  phase or child epic that wants to share rendering logic
  across both might want to extract a shared type or
  component. Mitigation: out of scope for 1.2; recorded as a
  potential follow-up if both arrays grow more behavior than
  the simple `<ul>` of `<a>` rendering 1.2 ships.
- **1.3 collapse decision regret.** If 1.2 ships standalone
  (no collapse) and the depth-population pass turns out to be
  trivial, the split was review churn; if 1.2 collapses and
  the depth-population pass is heavier than estimated, the
  PR bloats. Mitigation: the milestone-doc Phase Status
  authorization is in advance; the call rests on
  reading post-1.1 `madrona.ts` and estimating concretely
  before committing the diff. Recording the call in
  `## Estimate Deviations` makes the rationale durable.
- **Donation/feedback child epic surfaces a colliding name.**
  Between plan promotion (now) and PR-time, the donation or
  feedback child epic could be scoped and surface a settled
  field shape that collides with one of the settled names
  (e.g., the donation epic decides it wants `socialLinks` for
  sponsor donation handles). Mitigation: the reality-check
  re-grep at plan-implementation step 3 catches
  this; the rename is mechanical.

## Backlog Impact

- **Closes:** nothing in
  [`docs/backlog.md`](/docs/backlog.md). Per the milestone-doc
  Backlog Impact, M1 doesn't close existing backlog entries.
- **Unblocks:** M3 (real Madrona content authoring against the
  extended `EventContent` shape) — phase 1.2 establishes the
  type the M3 authoring pass populates with real bands,
  sponsors, prose, photos, quotes, and links. The donation
  and feedback child epics — once scoped — also inherit the
  M1 shape extensions per epic invariant 2; the field-naming
  specificity preserved here keeps the donation/feedback shape
  door open.
- **Opens:** anticipated follow-up backlog candidates surfaced
  during 1.2 implementation:
  - A markdown-rendering follow-up if M3 real-content
    authoring decides plain-text `\n\n` paragraph splitting is
    too constrained for real band bios. The follow-up would
    introduce a markdown parser at the
    `EventLineup.tsx` / `EventSponsors.tsx` boundary; out of
    scope for 1.2 but a reasonable M3 surface or independent
    follow-up.
  - A `next/image` upgrade follow-up if M3 real-content
    authoring decides Madrona band images need responsive
    sizing or lazy-loading; the upgrade is local to the two
    components.
  - A shared-shape extraction follow-up if `externalLinks` and
    `socialLinks` grow common rendering or behavior beyond
    the simple `<ul>` of `<a>` rendering 1.2 ships.
  - A token-classification rule-shape follow-up if capture
    review surfaces structural mis-classification beyond
    one-line correction (analogous to demo-expansion epic M1
    phase 1.1's
    [themescope-derived-shade-cascade.md](/docs/plans/themescope-derived-shade-cascade.md)
    spinout).

## Related Docs

- [`m1-brand-foundation.md`](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
  — parent milestone doc. Owns Cross-Phase Invariants,
  Cross-Phase Risks, Documentation Currency map, Backlog
  Impact this plan binds by reference. Phase Status row 1.2
  authorizes the 1.3-collapse-into-1.2 deviation in advance.
- `scoping/m1-phase-1-2.md`
  — scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the five settled-at-scoping decisions
  (additive-optional shape, render-when-present, field-name
  neutrality, test fixture extension, no apps/web changes)
  absorbed into this plan; deletes in batch with sibling
  scoping docs at the milestone-terminal PR.
- [`epic.md`](/docs/plans/epics/madrona-demo-build/epic.md) —
  parent epic. Cross-Cutting Invariants 2 and 4 are
  load-bearing for this phase; Sizing Summary M1 line
  authorizes 2-3 PRs across the milestone.
- [`m1-phase-1-1-plan.md`](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md)
  — sibling phase plan; canonical reference for the
  flat-optional-pair precedent (`meta.logoSrc/Alt`) that
  `imageSrc/Alt` mirrors and the additive-optional-with-self-
  review-walked-pairing pattern.
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — `EventContent` type and content registry; phase 1.2
  extends `lineup[number]` and `sponsors[number]`.
- [`apps/site/components/event/EventLineup.tsx`](/apps/site/components/event/EventLineup.tsx)
  and
  [`apps/site/components/event/EventSponsors.tsx`](/apps/site/components/event/EventSponsors.tsx)
  — section components extended with new conditional renders.
- [`tests/site/event/sectionComponents.test.tsx`](/tests/site/event/sectionComponents.test.tsx)
  — unit-test fixture extended with positive-, negative-,
  fallback-, and partial-case tests.
- [`apps/site/events/harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts)
  and
  [`apps/site/events/riverside-jam.ts`](/apps/site/events/riverside-jam.ts)
  — test event content modules; the byte-for-byte falsifier
  rests on these rendering unchanged.
- [`apps/site/events/madrona.ts`](/apps/site/events/madrona.ts)
  — Madrona content module shipped by phase 1.1; conditionally
  extended in phase 1.2 if 1.3 collapses.
- [`docs/styling.md`](/docs/styling.md) — token-classification
  authority for any corrections that surface during 1.2
  self-review; "Two Buckets" guidance.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
  — audit-name source for the Self-Review Audits section.
- [`AGENTS.md`](/AGENTS.md) — phase planning rules,
  Plan-to-PR Completion Gate, Doc Currency PR Gate, "PR-count
  predictions need a branch test," "Plan content is a mix of
  rules and estimates."
