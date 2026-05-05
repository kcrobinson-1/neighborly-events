# Scoping — M1 phase 1.1 (Madrona Theme registration + minimal Madrona content module)

## Status

Absorbed into plan. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
absorbs into
[m1-brand-foundation.md](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md);
durable per-phase content absorbs into
`docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md` once
that plan drafts.

## Phase summary

Phase 1.1 ships the Madrona Theme as a registered per-event Theme
under `shared/styles/themes/madrona.ts` and `slug=madrona` in
[`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts),
extends
[`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)'s
content registry with a new `apps/site/events/madrona.ts` module
seeded with minimal placeholder Madrona content (placeholder
bands, sponsors, schedule, FAQ — sufficient to render every
section component non-degraded), enforces `<meta name="robots"
content="noindex">` on `/event/madrona*`, and runs a cross-app
theme-continuity check for `slug=madrona` (apps/site
`/event/madrona` vs. apps/web `/event/madrona/game`). Phase 1.1
does **not** extend the `EventContent` type itself — that is
phase 1.2's scope; phase 1.1 ships against the existing shape so
the cross-app continuity gate operates on the brand foundation
without entangling the shape extension.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
source that proves the load-bearing claim. These decisions
absorb into the plan's contract sections during plan-drafting;
the deliberation prose (rejected alternatives) lives here
through scoping's transient lifetime.

### 1. Madrona Theme palette concrete values [Resolved]

**What was decided.** The Madrona Theme is derived from the
Madrona Neighborhood Association's existing logo on
[madrona.us](https://madrona.us/) as inspiration, **not** an
exact match to the site's existing styling. The logo carries
seven letters in seven distinct colors (M-A-D-R-O-N-A); we
anchor the Theme on the M-blue as primary, the second A-red as
secondary, and the R-teal as accent. The full palette and the
remaining letter colors live in the logo image itself rather
than in additional Theme fields — the Theme stays disciplined
on three brand bases per the existing
[`Theme` shape](/shared/styles/types.ts).

**Why it mattered.** Per the milestone doc's "Madrona Theme
palette concrete values" deferred decision and the parent
epic's Risk Register entry "Madrona Theme palette discussion
blocks M1 engineering," the palette must settle before phase
1.1 plan-drafting begins. The decision artifact is
`Verified by:`'d below.

**Concrete palette.** Pixel-sampled from the committed logo PNG at
plan-implementation time (PR-time `sharp`-based pass over each
letter region; values updated from scoping eyeball where shift was
beyond the ±0x06 / channel bound named in the phase plan's Naming
section, with pixel-sampled values authoritative going forward):

| Field | Value | Source |
| --- | --- | --- |
| `bg` | `#ffffff` | Pure white per user direction |
| `surface` | `#ffffff` | — |
| `surfaceStrong` | `#ffffff` | — |
| `surfaceCard` | `#ffffff` | — |
| `surfaceCardMuted` | `#f3f1fa` | Very pale lavender-white, M-blue undertone |
| `text` | `#1a1d33` | Near-black with indigo undertone matching the (slightly bluer) pinned `primary` |
| `muted` | `#5b6280` | Cool gray, indigo undertone |
| `border` | `rgba(26,29,51,0.10)` | Derived from `text` |
| `borderSoft` | `rgba(26,29,51,0.06)` | — |
| `borderMuted` | `rgba(26,29,51,0.10)` | — |
| `primary` | `#404e9d` | Madrona M-blue (logo letter 1) — pixel-sampled (was `#3F4796` eyeball) |
| `secondary` | `#cc2229` | Madrona second-A red (logo letter 7) — pixel-sampled (was `#E04335` eyeball) |
| `accent` | `#84c2b6` | Madrona R-teal (logo letter 4) — pixel-sampled (was `#5FB6B0` eyeball; the eyeball read the dark anti-aliased letter edges; the inner letter is noticeably lighter) |
| `whiteWarm` | `#fefefe` | — |
| `whitePanel` | `#ffffff` | — |
| `whiteTint` | `#f8f8fb` | Very subtle indigo undertone |
| `pageGradientStart` | `rgba(255,255,255,1)` | — |
| `pageGradientEnd` | `rgba(243,241,250,0.96)` | Subtle lavender-white fade |
| `heroStart` | `rgba(255,255,255,1)` | — |
| `heroEnd` | `rgba(243,241,250,0.96)` | — |
| `adminInputSurface` | `#ffffff` | — |
| `draftRowSurface` | `#ffffff` | — |
| `bodyFontFamily` | `var(--font-inter), system-ui, -apple-system, sans-serif` | Reuse apps/site root layout's `next/font` Inter |
| `headingFontFamily` | `var(--font-fraunces), Georgia, serif` | Reuse apps/site root layout's `next/font` Fraunces (Fraunces' transitional-serif feel pairs reasonably with the Madrona logo's slab serif; per-event font selection is post-epic per `docs/styling.md`) |
| `panelRadius` | `12px` | Matches existing test-event radii |
| `panelRadiusMobile` | `12px` | — |
| `cardRadius` | `8px` | — |
| `controlRadius` | `6px` | — |

**Logo letter colors (pixel-sampled at plan-implementation time, all
7).** Recorded for phase 1.2 reference in case the section component
renderer updates ever want to surface additional Madrona accents.
The seven values are the per-letter inner-region averages from the
committed PNG (3749×808, sampled across the letter's center 50%
horizontal × middle 40% vertical):

| Letter | Hex (pixel-sampled) | Notes |
| --- | --- | --- |
| M | `#404e9d` | deep indigo / royal blue → Theme `primary` |
| A (1st) | `#d3572b` | burnt orange / terra-cotta |
| D | `#da7f6f` | dusty rose / coral |
| R | `#84c2b6` | muted teal → Theme `accent` |
| O | `#a4c74c` | lime / yellow-green |
| N | `#e9b170` | warm peach / tan |
| A (2nd) | `#cc2229` | vermillion red → Theme `secondary` |

**Verified by:**
- [apps/site/public/events/madrona/logo.png](/apps/site/public/events/madrona/logo.png)
  for the source image the palette derives from (committed to
  the repo as part of decision 2 below so future plan-drafting
  and pixel-exact pinning do not require re-fetching from
  madrona.us)
- [shared/styles/types.ts:16-61](/shared/styles/types.ts) for
  the `Theme` field set this palette must populate exactly
- [shared/styles/themes/harvest-block-party.ts](/shared/styles/themes/harvest-block-party.ts)
  for the structural precedent (field-by-field shape, comment
  conventions, `next/font` reuse) the new
  `shared/styles/themes/madrona.ts` mirrors
- [apps/site/app/layout.tsx:3](/apps/site/app/layout.tsx) for
  the `Fraunces, Inter` `next/font` import the Theme's
  `bodyFontFamily` / `headingFontFamily` consume

**Options considered.**

1. **Anchor on M-blue + warm secondary + cool accent (chosen).**
   Primary = `#3F4796`, secondary = `#E04335`, accent = `#5FB6B0`.
2. **Anchor on M-blue + orange-A secondary instead of red-A.**
   Primary = `#3F4796`, secondary = `#C44E2C`, accent = `#5FB6B0`.
3. **Anchor on M-blue + green-O accent instead of teal-R.**
   Primary = `#3F4796`, secondary = `#E04335`, accent = `#9DBE3E`.
4. **Multi-color celebration — distribute logo colors as
   gradient stops or per-section accents.** Theme carries
   primary + secondary + accent as above, plus the Theme's
   `pageGradientStart` / `heroStart` / `heroEnd` shift to use
   non-blue letter colors as gradient stops for visual
   richness.
5. **Pixel-match the live madrona.us styling** (deep blue
   banner, transparent black footer, etc.) one-to-one.

**Pros / cons.**

- *Option 1 (chosen).* Pro: red-A is the loudest warm color in
  the logo and provides the strongest contrast against the
  M-blue, which avoids the "another harvest event" cross-app
  capture-pair confusion that orange-A would create against the
  existing
  [`harvestBlockPartyTheme.primary` = `#b85c1c`](/shared/styles/themes/harvest-block-party.ts).
  Teal-R is analogous-ish to the indigo M-blue and reads as a
  quiet, brand-coherent accent for badges and links rather than
  competing with primary/secondary. Con: red-A is the rightmost
  letter and could be read as a "second M" anchor instead of a
  contrast accent if the logo crops oddly; mitigated by the
  cross-app capture-pair gate naming the Madrona-distinct
  palette.
- *Option 2 (rejected).* Pro: orange-A is the second-leftmost
  letter; reading the logo left-to-right, M-blue → orange-A
  feels like a "natural" hierarchy. Con: the Harvest Block
  Party Theme already uses a warm pumpkin-orange `primary`
  (`#b85c1c`) per
  [shared/styles/themes/harvest-block-party.ts:30](/shared/styles/themes/harvest-block-party.ts);
  Madrona-orange + Harvest-orange in the cross-app capture-pair
  set risks reading as "the platform leans warm-cream/orange
  for events" rather than "every event has a distinct brand,"
  which regresses the demo-expansion epic's load-bearing
  visual-distinctness gate.
- *Option 3 (rejected).* Pro: green-O is the punchiest single
  color in the logo and could read more "alive" than teal-R.
  Con: green is a heavy semantic color in product UI (success
  states, validation green) and the platform's structural
  status-color tokens are already green-family per
  [`docs/styling.md`](/docs/styling.md); promoting green-O to
  Theme accent risks color-collision with status surfaces.
  Teal-R does not have this collision.
- *Option 4 (rejected for M1; possible for M3).* Pro: visual
  richness; the multi-color logo is the brand. Con: gradients
  with non-anchor colors trade the load-bearing visual
  discipline (one obvious primary, one obvious contrast) for
  decoration; the `harvest-block-party` and `riverside-jam`
  precedents both use single-anchor gradients and the M1 PR
  inherits that discipline. Worth revisiting in M3 once the
  full attendee journey is wired and the gradient surface is
  visible against real content rather than placeholder.
- *Option 5 (rejected).* Pro: faithful to the Madrona
  Neighborhood Association's existing styling. Con: the user's
  framing was explicit — "this is inspiration, we're not
  matching exactly, though we'll probably bring in the
  logo" — pixel-matching the live site overrides that framing
  and bakes one-version-of-madrona.us into our Theme, which
  drifts every time their site re-skins.

### 2. Madrona logo committed to the repo [Resolved]

**What was decided.** The Madrona logo PNG fetched from
`https://madrona.us/wp-content/uploads/2023/08/cropped-cropped-newnotreelogoroy.png`
is committed to the repo at
`apps/site/public/events/madrona/logo.png` (89.2 KB).
Permission: noted by the user as "no question of permission;
this event is their event" — Madrona Music in the Playfield is
hosted by the same Madrona Neighborhood Association whose
brand mark this is.

**Why it mattered.** Without a committed copy, every future
plan-drafting and pixel-exact palette pinning round-trips
through `webfetch` of madrona.us, which (a) produces drift if
the upstream PNG re-renders, (b) costs a network call per
re-derivation, and (c) breaks if `cropped-cropped-newnotreelogoroy.png`
is ever renamed upstream. Committing pins provenance.

**Verified by:**
- [apps/site/public/events/madrona/logo.png](/apps/site/public/events/madrona/logo.png)
  — committed file, 89.2 KB, source URL recorded above
- [apps/site/public/test-events/harvest-block-party/](/apps/site/public/test-events/harvest-block-party/)
  for the existing public-asset-by-event-slug convention this
  decision parallels (the divergence: Madrona is not a test
  event per epic invariant 3, so the directory is
  `events/madrona/` rather than `test-events/madrona/`)

**Path-naming alternative considered and rejected.**
`apps/site/public/madrona/logo.png` (flat by slug) was
rejected because it does not parallel the existing
`test-events/<slug>/` pattern; future non-test events
(post-Madrona) would need either a different convention or
a top-level slug-collision risk with `apps/site/app/<slug>`
routes.

### 3. Phase 1.1 ships against the existing `EventContent` shape; phase 1.2 owns the type extension [Resolved]

**What was decided.** Phase 1.1's `apps/site/events/madrona.ts`
content module conforms to the current
[`EventContent` type](/apps/site/lib/eventContent.ts:28-71)
without using the new band depth or sponsor depth fields phase
1.2 will add. The content seeded in 1.1 is enough to render
every existing section component (`EventLineup`, `EventSponsors`,
`EventSchedule`, `EventFAQ`, `EventCTA`, `EventFooter`,
`EventHeader`) end-to-end with placeholder data; phase 1.2 then
extends the shape and adds the depth fields where appropriate;
phase 1.3 (or phase 1.2's collapse) extends the placeholder
content to exercise the new fields.

**Why it mattered.** The milestone doc's
"Why 1.1 before 1.2" sequencing rationale rests on phase 1.1
producing a real `/event/madrona` route that shape-extension
review can target. If phase 1.1 also extends the type, the
review surface entangles two concerns (Theme registration +
shape change) and the cross-app theme-continuity gate
operates against a moving target.

**Verified by:**
- [apps/site/lib/eventContent.ts:28-71](/apps/site/lib/eventContent.ts)
  for the current shape phase 1.1 conforms to
- [m1-brand-foundation.md §Phase Status](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
  for the milestone-doc phase split and the explicit
  authorization for phase 1.3 to collapse into 1.2 if the
  depth pass is small

## Open decisions to make at plan-drafting

These need resolution during phase 1.1 plan-drafting; they are
not load-bearing on phase 1.1 scoping but the plan cannot
promote past `In draft` until they settle.

- **Logo placement on `/event/madrona*` UI surfaces.** Where
  does `apps/site/public/events/madrona/logo.png` actually
  render? Candidates: event header (replacing or accompanying
  the `hero.name` text), event CTA (chip / button visual), as
  the page favicon for `/event/madrona`, or some combination.
  Default lean: event header above `hero.name`. Plan-drafting
  picks against an actual render of `EventHeader.tsx` with the
  logo placed.
- **`noindex` enforcement mechanism.** Milestone doc enumerated
  three options: Next.js per-page `metadata.robots`, middleware,
  or `robots.txt` carve-out. Plan-drafting reads
  [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx)
  and chooses the option that minimally diverges from the
  existing test-event noindex pattern (test events set
  `testEvent: true` which triggers the SSR meta — but Madrona is
  not a test event, so the existing path doesn't apply
  unchanged). Constraint: the mechanism must not interfere with
  the future Madrona-launch epic flipping to indexable.
- **Cross-app theme-continuity validation procedure for
  `slug=madrona`.** Inherit demo-expansion epic M1 phase 1.1's
  eight-capture pattern (6 in-app + 2 cross-app) verbatim, or
  refine. Constraint: the procedure must include a freshness
  check (build-id assertion or capture timestamps within N
  minutes of the latest deploys) per the milestone doc's risk
  on cross-app continuity false positives from caching.
- **Initial placeholder content in `apps/site/events/madrona.ts`.**
  Phase 1.1 plan owns the placeholder schedule (Madrona Music
  in the Playfield is real on madrona.us; reasonable lean is
  three placeholder concert dates with placeholder bands and
  sponsors), placeholder FAQ entries, and placeholder CTA copy.
  Constraint per milestone-doc invariant: placeholder content
  must not read as a launch announcement; either the `noindex`
  posture alone is sufficient or the placeholder copy itself
  flags itself as placeholder ("Lineup TBD — demo content shown
  for preview" in a hero subline). Phase 1.1 plan picks.
- **Whether `apps/site/events/madrona.ts` sets `testEvent`
  explicitly to `false` (vs. omits the field).** Both are
  shape-correct (`testEvent` is `?: boolean`); the explicit
  form is clearer to readers but the omitted form is more
  consistent with the test events that DO set the field
  positively. Plan-drafting picks. Either way, epic invariant
  3 is honored — what matters is that `madrona.ts` does not
  set `testEvent: true`.

## Plan structure handoff

Phase 1.1 plan adopts the standard phase-plan section set per
AGENTS.md "Phase Planning Sessions → Plan owns" — Status,
Context, Goal, Cross-Cutting Invariants, Naming, Contracts,
Files to touch, Execution Steps, Commit Boundaries, Validation
Gate, Self-Review Audits, Documentation Currency PR Gate, Out
Of Scope, Risk Register, Backlog Impact, Related Docs.

The plan's **Naming** section absorbs the palette table from
this scoping doc's decision 1 as the canonical record. The
deliberation prose (Options considered, Pros / cons, rejected
alternatives) does NOT absorb — it deletes when this scoping
doc deletes at the milestone-terminal PR. The plan's
**Contracts** section names the `Theme` literal shape
(`shared/styles/themes/madrona.ts`), the registry/resolver
insertions (`shared/styles/themes/index.ts`), and the
`apps/site/events/madrona.ts` shape conformance contract.

The plan's **Self-Review Audits** section walks the four epic
Cross-Cutting Invariants plus the four milestone-level
invariants from
[m1-brand-foundation.md §Cross-Phase Invariants](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
against the diff surface; the
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
audit set scopes to SQL / Edge Function / save-path / lifecycle
/ CI / runbook surfaces, none of which phase 1.1's diff
touches, so the catalog likely contributes the empty set
(re-confirmed at plan-drafting time).

## Reality-check inputs

The plan must verify these against current code at
plan-drafting time, not against this scoping doc's citations
(which may drift between scoping and plan-drafting):

- [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
  registry literal shape — confirm the `Record<string, Theme>`
  pattern still holds; confirm the registry comment block's
  reference to this epic still resolves
- [`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts)
  resolver — confirm the `themes[slug] ?? platformTheme`
  fallback is unchanged; the file's header comment currently
  says "Madrona in M4 phase 4.1" and is on the doc-currency map
- [`shared/styles/types.ts`](/shared/styles/types.ts) `Theme`
  field set — re-confirm all 27 fields the palette must
  populate; if a new field has been added between scoping and
  plan-drafting, the palette gains a value for it
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  static-import pattern, registry literal, and header comment —
  confirm the static-import shape; confirm the comment's
  reference to "M4 phase 4.2 (Madrona)" is still on the
  doc-currency rewrite list
- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx)
  `next/font` declarations — confirm `Fraunces` and `Inter` are
  imported with the `variable` option exposing
  `--font-fraunces` / `--font-inter` CSS custom properties at
  the layout level
- [`apps/web/src/App.tsx`](/apps/web/src/App.tsx) inherited
  ThemeScope wraps — re-confirm the four wraps still exist
  unchanged (admin, game, redeem, redemptions); the line
  numbers `61-67 / 75-77 / 85-109 / 117-141` are estimates and
  may drift
- [`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts)
  — confirm `TEST_EVENT_SLUGS` does not contain `madrona`
  (epic invariant 3 falsifier check)
- [`apps/site/components/event/EventLineup.tsx`](/apps/site/components/event/EventLineup.tsx)
  and
  [`apps/site/components/event/EventSponsors.tsx`](/apps/site/components/event/EventSponsors.tsx)
  — confirm both render gracefully against an `EventContent`
  whose `lineup[]` and `sponsors[]` arrays carry only the
  current required fields (the load-bearing falsifier for
  invariant 4)
- Stale "M4 phase 4" / "M4 phase 4.1" / "M4 phase 4.2" /
  "Madrona-launch" references across the codebase — re-grep at
  plan-drafting time; the doc-currency map must include every
  surfaced reference, not only the ones named in the milestone
  doc
- Madrona logo file at
  [`apps/site/public/events/madrona/logo.png`](/apps/site/public/events/madrona/logo.png)
  — confirm the file exists and is accessible; this is the
  palette's `Verified by:` source
- Pixel-exact color sampling from the logo file at
  plan-drafting time — eyeball-sampled hex values in the
  palette table above are good-enough for scoping but pin
  pixel-exact at plan time using a color-picker pass against
  the committed PNG
