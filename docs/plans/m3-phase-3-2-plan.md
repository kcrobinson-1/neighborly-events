# M3 Phase 3.2 — Second Test Event With Distinct Theme

## Status

Proposed.

3.2 is the middle phase of M3 ("Site Rendering Infrastructure With
Test Events"). It registers a second test event content module
(`riverside-jam`) and a second per-event Theme so the rendering
pipeline 3.1 shipped is exercised across two visually-distinct
identities. The 3.2 row in the M3 milestone doc's Phase Status table
flips from `Proposed` to `Landed` in this plan's PR; this plan's
Status flips from `Proposed` to `Landed` in the same PR per
[`AGENTS.md`](/AGENTS.md) "Plan-to-PR Completion Gate." No commit
SHAs are recorded in the row (`git log` and `git blame` are
authoritative).

**Parent epic:** [`event-platform-epic.md`](/docs/plans/event-platform-epic.md),
Milestone M3, Phase 3.2.
**Milestone doc:** [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md).
**Sibling phases:** 3.1 (rendering pipeline + first test event +
SSR meta, split into 3.1.1 + 3.1.2) — Landed; 3.3 (cross-app
navigation verification + M3 closure) — Proposed.

**Hard dependencies on `main`.** 3.2 builds directly on 3.1.1's and
3.1.2's already-merged surfaces:

- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)'s
  `EventContent` type, `eventContentBySlug` registry, and
  `registeredEventSlugs` derivation (3.2 extends the registry; the
  derivation propagates).
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)'s
  `generateStaticParams`, `generateMetadata`, and `Page` (consumed
  unchanged; the new slug auto-prerenders).
- [`apps/site/app/event/[slug]/opengraph-image.tsx`](/apps/site/app/event/%5Bslug%5D/opengraph-image.tsx)
  and
  [`apps/site/app/event/[slug]/twitter-image.tsx`](/apps/site/app/event/%5Bslug%5D/twitter-image.tsx)
  (consumed unchanged; the new slug auto-prerenders both image
  routes).
- [`apps/site/lib/eventOgImage.tsx`](/apps/site/lib/eventOgImage.tsx)
  (the shared OG image renderer; consumed unchanged).
- [`apps/site/components/event/EventLandingPage.tsx`](/apps/site/components/event/EventLandingPage.tsx)
  and the section components it composes (consumed unchanged; the
  disclaimer banner renders for any `content.testEvent: true`).
- [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
  registry (3.2 extends with one entry).
- [`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts)
  resolver (consumed unchanged; the new slug resolves to the new
  Theme by lookup).
- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx)'s
  `metadataBase` (consumed unchanged; the new event's OG and
  twitter image URLs absolute-resolve against the same base).

**Scoping inputs.** This plan compresses from
[`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md),
which records the slug, palette family, additive-PR-shape, and
tripwire-test decisions. The scoping doc deletes in batch in M3
phase 3.3's PR.

## Context

3.1 shipped the apps/site `/event/[slug]` rendering pipeline against
one registered test event (`harvest-block-party`) on one registered
Theme (warm autumn pumpkin/amber). The pipeline is intentionally
slug-agnostic — every per-event surface (page route, OG image
generator, Twitter image generator, robots noindex meta, disclaimer
banner) reads the registry through `registeredEventSlugs` and
`getThemeForSlug` so adding a new event is a registry-extension diff
with no rendering-layer changes. Inside 3.1's PRs, that
slug-agnosticism is asserted by code structure but not yet *proven*
by a second registered consumer — a reader cannot tell from one
event whether the registered Theme is doing real work or whether
the page would render the same way on the platform Sage Civic
fallback.

3.2 is the multi-theme proof. It adds a second test event content
module (a fictional summer riverside music festival, `riverside-jam`)
and a second per-event Theme on a cool maritime palette obviously
distinct from both Sage Civic and Harvest. The new event renders
its own Theme by virtue of the existing `<ThemeScope>` wrap; the OG
image and Twitter image prerender automatically because both routes
enumerate from `registeredEventSlugs`; the disclaimer banner and
robots noindex meta both light up because `testEvent: true` is set;
the openGraph URL absolute-resolves because the root layout's
`metadataBase` already covers every segment-and-below path.

This is being done now because **M3 phase 3.3's documentation update
to architecture.md and README.md describes a multi-theme rendering
platform as a current capability**, and writing those descriptions
against a one-Theme proof would record speculative copy that can't
be verified by inspection. 3.2 turns the slug-agnostic-by-structure
claim into a slug-agnostic-by-evidence claim that 3.3 can describe
honestly. M4 phase 4.2 (Madrona content) then registers a third
slug + Theme against the same proven contracts.

The surfaces this phase touches at the conceptual level: the
per-event Theme registry (one new entry), the per-event content
registry (one new entry), one new content module exercising every
`EventContent` field with riverside-flavored copy, one new public-
asset directory holding the new event's sponsor placeholder logos,
two existing tripwire tests (each carries an exact-match assertion
on the registry's contents that fires by design when the registry
changes), and the M3 milestone doc + this plan's Status block. **No
DB changes, no auth changes, no apps/web changes, no URL contract
changes, no `EventContent` shape changes, no rendering-layer
changes, no new dependencies.**

### Reading this plan: code shapes are directional pseudocode

> Inline code shapes in this plan (field-value pairs, type
> signatures, expressions, short snippets) communicate contract
> *shape* — what field exists where, what shape it takes, how it
> relates to other fields — not exact source. The implementer
> translates shapes into syntactically-correct code at PR time,
> against the surrounding prose. Reviewers (human or automated)
> should focus on shape-level questions (missing field, wrong
> relationship, contract self-inconsistent), not syntax-level ones
> (template-literal quotes, shell precedence, missing imports,
> semicolons). The five-line rule from AGENTS.md "Planning Depth"
> still caps how much code-shaped content lives here.

## Goal

Land a second registered test event, `riverside-jam`, with its own
per-event Theme on a cool maritime palette obviously distinct from
both apps/site's Sage Civic platform Theme and the
`harvest-block-party` Theme that 3.1 shipped. The new event is
discoverable only by direct URL (no platform-wide event-discovery
surface exists yet), ships with `<meta name="robots" content="noindex,
nofollow">` server-rendered, displays the test-event disclaimer
banner above the hero, and inherits the OG image and Twitter card
pipeline by registry extension alone — no rendering-layer changes.
The 3.2 row in the M3 milestone doc flips from `Proposed` to
`Landed` in this PR.

The phase is a pure addition. No surface from 3.1 changes shape;
the rendering pipeline, image generators, page route, section
components, root layout, and `EventContent` type are all consumed
unchanged.

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file, not just the file that first
triggered the rule.

- **3.2 is a pure additive PR; no rendering-layer changes.** Section
  components in
  [`apps/site/components/event/`](/apps/site/components/event), the
  page route at
  [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx),
  the OG image generator at
  [`apps/site/lib/eventOgImage.tsx`](/apps/site/lib/eventOgImage.tsx),
  the file-convention image routes at
  [`apps/site/app/event/[slug]/opengraph-image.tsx`](/apps/site/app/event/%5Bslug%5D/opengraph-image.tsx)
  and
  [`apps/site/app/event/[slug]/twitter-image.tsx`](/apps/site/app/event/%5Bslug%5D/twitter-image.tsx),
  the root layout's `metadataBase` at
  [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx), the
  `EventContent` type and resolver at
  [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  (the `eventContentBySlug` *literal* extends; the type, the
  resolver function, and `parseEventDate` do not change), and
  apps/web entirely all stay untouched. If implementation surfaces
  a need to touch any of those surfaces, that is a **rule
  deviation** triggering an in-PR plan-doc update per AGENTS.md
  "Plan-to-PR Completion Gate" — not an estimate deviation handled
  via the PR body. The Risk Register names the most likely
  rule-deviation case (`EventContent` shape gap) and its handling
  path.
- **Slug spelling is identical at every site.** The string
  `"riverside-jam"` appears as the new theme registry key, the new
  content module's `slug` field, the new content module's
  `themeSlug` field, the new content registry key, the new public
  asset subdirectory name, and both tripwire tests' expected new
  values. A typo at any one site silently degrades behavior —
  `themeSlug` mismatch falls back to platform Theme via
  `getThemeForSlug` (verified by reading
  [`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts)),
  asset path mismatch breaks `<img>` `src` attributes, registry
  key mismatch surfaces only when the page route's
  `getEventContentBySlug` returns null on the URL the user typed.
  Self-review walks the slug string at every site.
- **Both tripwire tests update in the same commit as the
  registry extension that trips them.** Splitting the registry
  extension from the tripwire-test update would land a
  `npm test`-failing intermediate commit per
  [`tests/site/event/eventContent.test.ts` lines 35-39](/tests/site/event/eventContent.test.ts)
  and
  [`tests/shared/styles/getThemeForSlug.test.ts` lines 23-29](/tests/shared/styles/getThemeForSlug.test.ts).
  The "Each commit must independently typecheck and lint"
  property the 3.1.2 plan named applies — extended here to cover
  npm test for any commit that touches the registries those
  tests gate.
- **Every `EventContent` field is exercised at depth comparable
  to harvest-block-party.** The multi-theme proof rests on
  visually-equivalent content density across the two test events
  (≥2 schedule days with ≥4 sessions per day, ≥4 lineup entries
  with set times, ≥4 sponsors with logos and links, ≥4 FAQ
  entries, full CTA copy, footer attribution override, hero
  tagline). A sparse second event would let the visual contrast
  between the two events read as "one is more populated than the
  other" rather than "two distinct identities on the same
  template." Verified by reading the harvest content density at
  [`apps/site/events/harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts).
- **`testEvent: true` is set on the new content module.** Without
  it the disclaimer banner and the `robots: { index: false,
  follow: false }` meta both silently no-op, and a fictional test
  event leaks into search indexes and unfurl caches as a real
  event. Verified by reading
  [`apps/site/components/event/EventLandingPage.tsx` line 28](/apps/site/components/event/EventLandingPage.tsx)
  and
  [`apps/site/app/event/[slug]/page.tsx` lines 69-71](/apps/site/app/event/%5Bslug%5D/page.tsx).

## Naming

- New theme module: `shared/styles/themes/riverside-jam.ts`
  exporting the `riversideJamTheme` constant typed as `Theme`.
- New content module: `apps/site/events/riverside-jam.ts` exporting
  the `riversideJamContent` constant typed as `EventContent`.
- New asset directory:
  `apps/site/public/test-events/riverside-jam/` holding 4-6
  placeholder neutral SVG sponsor logos.
- Slug used at every site: `riverside-jam` (kebab-case, descriptive,
  distinct from `harvest-block-party` and from the quiz fixture
  slugs `first-sample`, `sponsor-spotlight`, `community-checklist`
  per
  [`shared/game-config/sample-games.ts` lines 113-194](/shared/game-config/sample-games.ts)).
- Sponsor SVG filename pattern: `<sponsor-slug>.svg` (kebab-case,
  matching the harvest precedent at
  [`apps/site/public/test-events/harvest-block-party/`](/apps/site/public/test-events/harvest-block-party)).

## Contracts

### `riversideJamTheme: Theme`

Module: `shared/styles/themes/riverside-jam.ts` (new). A `Theme`
object populated per the type defined at
[`shared/styles/types.ts`](/shared/styles/types.ts).

Palette family — cool maritime, visually distinct from both
[`shared/styles/themes/platform.ts`](/shared/styles/themes/platform.ts)
(Sage Civic, cool sage-green primary `#2c5e4f`) and
[`shared/styles/themes/harvest-block-party.ts`](/shared/styles/themes/harvest-block-party.ts)
(warm pumpkin-amber primary `#b85c1c`):

- `primary` lands in deep teal / deep navy territory (e.g.,
  `#1f5d72` — implementer locks the exact value at implementation
  time against the rendered hero gradient and the OG image
  contrast). Specifically not green-leaning (would read as Sage
  Civic) and not orange-leaning (would read as Harvest).
- `bg` reads cool — pale sky-blue or pale slate (e.g., `#eef4f7`).
  Specifically not warm — both Sage Civic and Harvest bg read
  warm; Riverside bg reading warm collapses one axis of the
  visual distinction.
- `accent` reads warm — amber, sand, or coral (e.g., `#d49b58`)
  for clear pop against the cool primary.
- `text`, `muted`, and `border` derive from a deep cool base
  (deep navy / charcoal-blue) so the typography reads on the
  cool bg without contrast strain.
- Typography reuses `var(--font-inter)` (body) and
  `var(--font-fraunces)` (heading) per the harvest precedent;
  per-event font selection is post-epic per
  [`docs/styling.md`](/docs/styling.md).
- Themable radii pick a third combination distinct from Sage
  Civic's 16/12/10 and Harvest's 12/8/6 — e.g., 20/14/8 — so the
  third Theme proves radii flow through the registry across
  three distinct sets, not just two.
- Brand-tied derived shades (`--primary-surface`, etc.) are not
  Theme fields per
  [`docs/styling.md` lines 339-346](/docs/styling.md); they
  derive automatically in `:root` from the brand bases.

The exact hex values are implementer choice within the family
constraints above; the implementer eyeballs against the harvest +
Sage Civic UI captures and may swap any base if the rendered page
reads visually too close to either prior Theme. A swap is an
estimate deviation per AGENTS.md, not a rule deviation, provided
the cool-maritime palette family stays.

### `themes` registry extension

Module: [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
(modified). The existing `themes` literal extends with one entry:

`"riverside-jam": riversideJamTheme,`

The barrel's existing JSDoc already names M3 phase 3.2 as the
adding phase ("M3 phase 3.2 adds the second test event theme to
prove multi-theme rendering" — verified at
[`shared/styles/themes/index.ts` lines 5-9](/shared/styles/themes/index.ts));
no comment edit is needed beyond the entry addition.

### `riversideJamContent: EventContent`

Module: `apps/site/events/riverside-jam.ts` (new). A fictional
two-day summer riverside music festival populated to the depth
described under Cross-Cutting Invariants above. Required field-
level shape:

- `slug: "riverside-jam"`
- `themeSlug: "riverside-jam"` (matches the registered Theme key)
- `testEvent: true`
- `meta.title` and `meta.description` carrying riverside-flavored
  framing including a "demo content for platform testing" beat in
  the description so the unfurl preview signals test-event status
  to anyone who shares the URL externally before clicking through.
- `hero.name`, `hero.tagline`, `hero.dates` (a real two-day range
  in 2026 — implementer picks a summer date range, e.g., a July
  weekend, distinct from the harvest September 26-27, 2026 dates),
  `hero.location`.
- `schedule.days` covering the two festival days with ≥4 sessions
  per day. At least one session per day cross-references a
  performer via `performerSlug` so the `lineup[].slug` ↔
  `schedule.days[].sessions[].performerSlug` cross-reference is
  populated (matches harvest precedent).
- `lineup` covering ≥4 performers with `bio` and `setTimes`
  cross-referencing `schedule.days[].date`.
- `sponsors` covering 4-6 placeholder neutral sponsors with
  `logoSrc: "/test-events/riverside-jam/<sponsor-slug>.svg"`,
  `logoAlt`, `href`, and a mix of `tier` values so the
  `EventSponsors` tier-grouping path is exercised (matches harvest
  precedent — harvest has Headline + Supporting tiers).
- `faq` covering ≥4 entries including "Is this a real event?" or
  equivalent first entry making the test-event status explicit
  (matches harvest precedent at
  [`apps/site/events/harvest-block-party.ts` lines 161-165](/apps/site/events/harvest-block-party.ts)).
- `cta.label` and optional `cta.sublabel` matching the riverside
  framing.
- `footer.attribution` providing a per-event override (the
  default `EventFooter` attribution is platform-generic per
  [`apps/site/components/event/EventFooter.tsx` line 4](/apps/site/components/event/EventFooter.tsx)).

### `eventContentBySlug` registry extension

Module: [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
(modified). The existing `eventContentBySlug` literal extends with
one entry, following the harvest precedent at lines 81-83:

`[riversideJamContent.slug]: riversideJamContent,`

The import statement at the top of the file extends with the new
content module import. No other edit; the JSDoc above the literal
already names M3 phase 3.2 as the adding phase ("M3 phase 3.2
extends the literal with the second test event" — verified at
[`apps/site/lib/eventContent.ts` lines 75-80](/apps/site/lib/eventContent.ts)).

`registeredEventSlugs` (the `Object.keys(...)` derivation at
line 100) extends automatically; no edit there.

### `tests/shared/styles/getThemeForSlug.test.ts` tripwire update

Module: [`tests/shared/styles/getThemeForSlug.test.ts`](/tests/shared/styles/getThemeForSlug.test.ts)
(modified). Two changes:

- A new per-slug resolution case parallel to the existing
  harvest-block-party case at lines 15-21: asserts referential
  identity (`toBe`, not deep-equal) of `getThemeForSlug("riverside-jam")`
  against the imported `riversideJamTheme`. The import statement
  for `riversideJamTheme` extends accordingly.
- The tripwire `Object.keys(themes).sort()` expectation at
  lines 27-28 updates from `["harvest-block-party"]` to
  `["harvest-block-party", "riverside-jam"]`. The existing comment
  at lines 24-27 already names this update path ("when a phase
  registers a new per-event Theme, this assertion updates
  alongside an explicit per-slug resolution case above").

### `tests/site/event/eventContent.test.ts` tripwire update

Module: [`tests/site/event/eventContent.test.ts`](/tests/site/event/eventContent.test.ts)
(modified). Two changes:

- A new per-slug case under `describe("getEventContentBySlug")`
  parallel to the harvest case at lines 11-17: asserts
  `getEventContentBySlug("riverside-jam")` returns the imported
  `riversideJamContent` by referential identity. The import
  statement for `riversideJamContent` extends accordingly. The
  existing "registered content's slug field matches its registry
  key" case at lines 25-32 covers the new event by structure
  (since it reads `content.slug` off a known slug); no new
  assertion needed there.
- The tripwire `registeredEventSlugs.sort()` expectation at
  lines 36-38 updates from `["harvest-block-party"]` to
  `["harvest-block-party", "riverside-jam"]`.

The "returns null for unknown slugs" case at lines 19-23 already
asserts `getEventContentBySlug("madrona")` returns null; that
remains correct (Madrona doesn't register until M4) and no edit
is needed there.

## Cross-Cutting Invariants Touched

Beyond the per-phase invariants above, the following epic-level
invariants apply:

- **URL contract.** The new event lives at
  `/event/riverside-jam` with auto-generated children at
  `/event/riverside-jam/opengraph-image` and
  `/event/riverside-jam/twitter-image`. All three fall under
  [`apps/web/vercel.json`](/apps/web/vercel.json)'s
  `/event/:slug/:path*` rewrite to apps/site (lines 24-26); no new
  proxy rule is needed. Verified by: reading the existing rewrite.
  3.2 makes no apps/web change.
- **Theme route scoping.** The page route's `<ThemeScope>` wrap at
  [`apps/site/app/event/[slug]/page.tsx` lines 105-109](/apps/site/app/event/%5Bslug%5D/page.tsx)
  resolves the per-event Theme via
  `getThemeForSlug(content.themeSlug)`, picking up the new Theme
  by registry lookup with no per-event wiring. Verified by:
  reading the wrap.
- **Per-event customization.** Events configure through data and
  theme; the new event's identity is a content module + a Theme
  registration, no new code path. The same property the M3
  milestone doc names as the cross-phase invariant
  ("`EventContent` type stability") and that 3.1.2 confirmed at
  the OG image layer.
- **Trust boundary.** No backend write, no DB read, no client
  input handling. The new event is a TS data module + a TS Theme
  module + static SVG assets. No trust-boundary surface.
- **In-place auth / Auth integration.** No auth surface. The
  event landing page is public, same as the rest of apps/site's
  `/event/:slug` namespace.
- **Cross-app theme continuity is deferred to M4 phase 4.1.** The
  riverside event renders its registered Theme on apps/site; a
  user clicking through the CTA into apps/web's
  `/event/riverside-jam/game` lands on apps/web's warm-cream
  `:root` defaults until M4 phase 4.1 wires apps/web event-route
  ThemeScope. The M3 milestone doc names this asymmetry and
  permits it for noindex'd test events
  ([m3-site-rendering.md lines 357-370](/docs/plans/m3-site-rendering.md)).
  3.2 inherits the deferral; no apps/web change is in scope.

## Files to touch — new

> Estimate-shaped per AGENTS.md "Plan content is a mix of rules and
> estimates — label which is which." Implementation may revise the
> file inventory when a structural call requires it; deviations are
> handled via the PR body's `## Estimate Deviations` section per
> AGENTS.md "Plan-to-PR Completion Gate."

- `shared/styles/themes/riverside-jam.ts` — `riversideJamTheme`
  constant per the contract above. Follows the harvest theme module
  shape at
  [`shared/styles/themes/harvest-block-party.ts`](/shared/styles/themes/harvest-block-party.ts).
- `apps/site/events/riverside-jam.ts` — `riversideJamContent`
  constant per the contract above. Follows the harvest content
  module shape at
  [`apps/site/events/harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts).
- `apps/site/public/test-events/riverside-jam/<sponsor-slug>.svg`
  files (4-6 SVGs) — placeholder neutral logos for the riverside
  sponsors. Sized under ~2 KB each per the asset-bloat mitigation
  the 3.1 scoping doc named.

## Files to touch — modify

> Estimate-shaped; same caveat as the "new" list above.

- [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
  — extend the `themes` literal with the new `"riverside-jam":
  riversideJamTheme` entry plus the corresponding import.
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — extend the `eventContentBySlug` literal with the new
  `[riversideJamContent.slug]: riversideJamContent` entry plus the
  corresponding import.
- [`tests/shared/styles/getThemeForSlug.test.ts`](/tests/shared/styles/getThemeForSlug.test.ts)
  — add the per-slug resolution case for `riverside-jam` and update
  the `Object.keys(themes).sort()` tripwire expectation per the
  contract.
- [`tests/site/event/eventContent.test.ts`](/tests/site/event/eventContent.test.ts)
  — add the per-slug case for `riverside-jam` and update the
  `registeredEventSlugs.sort()` tripwire expectation per the
  contract.
- [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
  — Phase Status table's 3.2 row: `Plan` column gets the link to
  this plan; `Status` column flips from `Proposed` to `Landed`;
  `PR` column gets the 3.2 PR number.
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.

## Files intentionally not touched

> Estimate-shaped; reconciled against what shipped per the
> Plan-to-PR Completion Gate. The list reflects the
> "pure additive PR; no rendering-layer changes" cross-cutting
> invariant — touching any of these signals a rule deviation
> (the cross-cutting invariant is wrong) requiring an in-PR
> plan-doc update before the deviation lands.

- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)'s
  `EventContent` *type definition* and `getEventContentBySlug`
  *function body* — only the `eventContentBySlug` literal extends
  per the modify list above. A type-shape change is the named
  rule-deviation case under the Risk Register.
- [`apps/site/lib/eventOgImage.tsx`](/apps/site/lib/eventOgImage.tsx)
  — no edit. The OG image renders the new event automatically by
  reading `content.themeSlug` and `content`'s fields.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
  — no edit. `generateStaticParams`, `generateMetadata`, and
  `Page` all consume the registry through derivation.
- [`apps/site/app/event/[slug]/opengraph-image.tsx`](/apps/site/app/event/%5Bslug%5D/opengraph-image.tsx)
  — no edit. `generateStaticParams` reads from
  `registeredEventSlugs`.
- [`apps/site/app/event/[slug]/twitter-image.tsx`](/apps/site/app/event/%5Bslug%5D/twitter-image.tsx)
  — no edit. Same.
- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) —
  `metadataBase` already covers the new event's URL paths; no
  edit.
- [`apps/site/app/globals.css`](/apps/site/app/globals.css) — no
  edit. The `event-*` CSS rules consume themable tokens
  (`var(--bg)`, `var(--primary)`, etc.) flowing in from
  `<ThemeScope>` against the new Theme. The disclaimer banner's
  fixed-color recipe still reads as platform status across the
  new Theme per the rule already established by harvest.
- [`apps/site/lib/eventDateFormat.ts`](/apps/site/lib/eventDateFormat.ts)
  — no edit. The shared date formatter handles any ISO date range
  the new event content names.
- All section components in
  [`apps/site/components/event/`](/apps/site/components/event)
  (`EventLandingPage.tsx`, `EventHeader.tsx`, `EventSchedule.tsx`,
  `EventLineup.tsx`, `EventSponsors.tsx`, `EventFAQ.tsx`,
  `EventCTA.tsx`, `EventFooter.tsx`, `TestEventDisclaimer.tsx`) —
  no edit. The new event consumes them through `EventLandingPage`
  by data only.
- [`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts)
  — no edit. Resolver reads the registry by lookup; the new Theme
  is picked up automatically.
- [`shared/styles/themes/platform.ts`](/shared/styles/themes/platform.ts)
  and
  [`shared/styles/themes/harvest-block-party.ts`](/shared/styles/themes/harvest-block-party.ts)
  — no edit. The new Theme is a peer addition.
- [`shared/styles/types.ts`](/shared/styles/types.ts) — no edit.
  The new Theme populates the existing `Theme` type unchanged.
- [`apps/site/events/harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts)
  — no edit. The first event content module is unchanged.
- [`apps/site/public/test-events/harvest-block-party/`](/apps/site/public/test-events/harvest-block-party)
  — no edit. The new event ships its own asset subdirectory.
- [`apps/web/`](/apps/web) entirely — no edit. Cross-app theme
  continuity is M4 phase 4.1's surface per the epic's "Deferred
  ThemeScope wiring" invariant.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — no edit.
  Existing `/event/:slug/:path*` rewrite covers the new event.
- [`apps/site/next.config.ts`](/apps/site/next.config.ts) — no
  edit. No new env var, no Turbopack-substitution surface.
- [`apps/site/.env.example`](/apps/site/.env.example) — no edit.
- pgTAP, supabase migrations, Edge Functions — no SQL or function
  change.
- [`docs/architecture.md`](/docs/architecture.md),
  [`README.md`](/README.md),
  [`docs/dev.md`](/docs/dev.md),
  [`docs/styling.md`](/docs/styling.md),
  [`docs/open-questions.md`](/docs/open-questions.md),
  [`docs/backlog.md`](/docs/backlog.md) — no change. All owned by
  M3 phase 3.3 per
  [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)'s
  "Documentation Currency" section.
- [`docs/plans/m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md)
  and
  [`docs/plans/m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md)
  — no edit. Both already `Landed`; 3.2 does not retroactively
  edit sibling plans.
- [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md)
  — no edit. Deletes in batch with the rest of M3's scoping docs
  in 3.3's PR per the milestone doc.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)'s
  M3 row — stays `Proposed`. The epic's M3 row flips to `Landed`
  only in 3.3's PR (M3 closure).

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and a feature branch
   (not `main`). Confirm 3.1.1 and 3.1.2 are fully landed
   (`git log --oneline main` shows
   [PR #142](https://github.com/kcrobinson-1/neighborly-events/pull/142)
   as ancestor of this branch's base — already verified by the
   M3 milestone doc's Phase Status table). Read this plan, then
   the M3 milestone doc
   ([`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)),
   the scoping doc
   ([`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md)),
   the 3.1.1 and 3.1.2 plans (for the rendering and image-pipeline
   contracts this phase inherits), the harvest theme module
   ([`shared/styles/themes/harvest-block-party.ts`](/shared/styles/themes/harvest-block-party.ts))
   and the harvest content module
   ([`apps/site/events/harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts))
   as the shape references, and the apps/site Next.js 16 reminder
   ([`apps/site/AGENTS.md`](/apps/site/AGENTS.md)) before editing.
2. **Baseline validation.** Run `npm run lint`, `npm test`,
   `npm run build:web`, `npm run build:site`, `npm run test:functions`,
   and the repo's pgTAP runner (`npm run test:db` per
   [`docs/dev.md`](/docs/dev.md)). All must pass before any edit.
   Capture a fresh UI-review snapshot of
   `/event/harvest-block-party` (mobile + desktop) — the baseline
   for the multi-theme side-by-side comparison in step 11. Capture
   a fresh OG image snapshot of the harvest event for the same
   baseline.
3. **Theme module + theme registry + tripwire test (one commit
   boundary — see "Commit boundaries").** Author
   `shared/styles/themes/riverside-jam.ts` per the contract above.
   Edit
   [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
   adding the `"riverside-jam": riversideJamTheme` entry and the
   import. Edit
   [`tests/shared/styles/getThemeForSlug.test.ts`](/tests/shared/styles/getThemeForSlug.test.ts)
   adding the per-slug resolution case and updating the
   `Object.keys.sort()` expectation. Run `npm run lint`,
   `npm test`, and `npm run build:site`; all three must pass.
4. **Sponsor SVG assets (one commit boundary).** Author 4-6
   placeholder neutral SVGs at
   `apps/site/public/test-events/riverside-jam/<sponsor-slug>.svg`.
   Each under ~2 KB. Run `npm run build:site`; the build must
   pass (the assets ship as static files; the build doesn't fail
   on their presence).
5. **Content module + content registry + tripwire test (one
   commit boundary).** Author `apps/site/events/riverside-jam.ts`
   per the contract above. Edit
   [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
   adding the `[riversideJamContent.slug]: riversideJamContent`
   entry and the import. Edit
   [`tests/site/event/eventContent.test.ts`](/tests/site/event/eventContent.test.ts)
   adding the per-slug case and updating the
   `registeredEventSlugs.sort()` expectation. Run `npm run lint`,
   `npm test`, and `npm run build:site`; all three must pass. The
   build log must show prerender entries for `/event/riverside-jam`,
   `/event/riverside-jam/opengraph-image`, and
   `/event/riverside-jam/twitter-image` alongside the
   harvest entries (one entry per registered slug per route).
6. **Validation re-run.** All baseline commands from step 2 must
   still pass. Specifically: `npm run lint`, `npm test`,
   `npm run build:web`, `npm run build:site`,
   `npm run test:functions`, `npm run test:db`.
7. **Server-rendered noindex falsifier (curl).** Run `next build`
   to completion in apps/site, start `next start` in the
   background, wait until the port is listening before curling
   (the wait-until-listening step is load-bearing — the same
   reasoning as the 3.1.2 plan's curl falsifier), curl
   `/event/riverside-jam`'s raw HTML, grep for
   `<meta name="robots"` and confirm the value contains
   `noindex` and `nofollow` (the harvest event's existing 3.1.1
   falsifier is the precedent — verify the exact emit shape Next.js
   produces against the harvest output before asserting against
   the new event), kill the server. Capture the grep output for
   the PR body's Validation section. This is the falsifier for the
   `testEvent: true → robots noindex` claim and protects against a
   future regression where someone forgets to set `testEvent` on a
   new event module.
8. **OG image visual capture.** Open
   `http://localhost:3000/event/riverside-jam/opengraph-image`
   in a browser against the same production-built `next start`
   server. Save the PNG to `tmp/ui-review/<timestamp>-3-2/` per
   AGENTS.md "Pull Request Screenshot Process." Confirm visually:
   - Event name renders legibly
   - Tagline (if present) renders below
   - Date range and location render
   - Theme background color is the riverside cool maritime palette
     (visually distinct from harvest's warm pumpkin-cream and from
     Sage Civic's pale sage)
   - Text contrast is readable against the bg
   - "Neighborly Events" platform attribution is visible
   - No clipped or overlapping content
   - Image dimensions match `size = { width: 1200, height: 630 }`
9. **Multi-theme side-by-side UI capture (the load-bearing
   visual proof for 3.2).** Capture the new event's landing page
   (mobile + desktop) and pair it with the harvest baseline from
   step 2. Save to the same `tmp/ui-review/<timestamp>-3-2/`.
   The two events must read as visually distinct identities — if
   the implementer cannot tell them apart at a glance, the Theme
   palette is too close to either Sage Civic or Harvest and a
   theme-base swap (per the contract above's allowance) is in
   order before the PR opens.
10. **Slack unfurl capture.** Paste the deploy-preview URL Vercel
    attaches to the PR (e.g.,
    `https://neighborly-events-site-<branch>.vercel.app/event/riverside-jam`)
    into a Slack DM-to-self in a workspace the implementer
    controls. Apply the cache-bust pattern
    (append `?v=<timestamp>`) per the 3.1.2 plan's documented
    procedure to ensure Slack does not serve a cached preview from
    prior unfurl iterations. Screenshot the unfurl card; upload to
    a hosting service per AGENTS.md "Pull Request Screenshot
    Process"; paste the URL into the PR body's UX Review section.
    Confirm:
    - Unfurl card shows the new OG image (cool maritime palette)
    - Title and description match the new event's `meta.title` /
      `meta.description`
    - Site name ("Neighborly Events") shows
    - Card link target is the apps/web canonical origin (proves
      `og:url` resolved correctly against `metadataBase`)
11. **Documentation update.** Walk
    [`AGENTS.md`](/AGENTS.md) "Doc Currency Is a PR Gate"
    triggers:
    - [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
      — flip the 3.2 Phase Status row's `Status` column from
      `Proposed` to `Landed`; populate the `Plan` column with the
      link to this plan; populate the `PR` column with the 3.2
      PR number.
    - This plan — Status flips from `Proposed` to `Landed`.
    - [`docs/architecture.md`](/docs/architecture.md) — no
      change. Owned by 3.3.
    - [`README.md`](/README.md) — no change. Owned by 3.3.
    - [`docs/dev.md`](/docs/dev.md) — no change. No new
      validation commands.
    - [`docs/styling.md`](/docs/styling.md) — no change. The
      "Procedure For Adding A New Theme" was followed verbatim;
      no procedure edit.
    - [`docs/open-questions.md`](/docs/open-questions.md) — no
      change. Owned by 3.3.
    - [`docs/backlog.md`](/docs/backlog.md) — no change.
    - [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
      M3 row — stays `Proposed`. Flips to `Landed` only in 3.3's
      PR.
    - [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md)
      — no edit. Deletes in batch in 3.3's PR.
    - [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)
      and
      [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md)
      — no edit. Same batch-deletion in 3.3.
    - [`docs/plans/m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md)
      and
      [`docs/plans/m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md)
      — no edit.
12. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against the Cross-Cutting Invariants
    above and each Self-Review Audit named below. Apply fixes in
    place; commit review-fix changes separately when that clarifies
    history per [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.
13. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation Gate command, and Self-Review Audit
    named in this plan. Confirm each is satisfied or explicitly
    deferred in this plan with rationale. Flip Status from
    `Proposed` to `Landed` in this plan; flip the milestone doc's
    3.2 row from `Proposed` to `Landed` (already covered by step
    11 — re-verify the edits shipped).
14. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](/.github/pull_request_template.md).
    Title under 70 characters (e.g., "M3 phase 3.2: second test
    event with riverside-jam Theme"). Validation section lists
    every command actually run plus the curl output from step 7.
    UX Review: include the OG image PNG capture from step 8, the
    multi-theme side-by-side capture from step 9, and the Slack
    unfurl capture from step 10. Estimate Deviations section names
    any file deviations from the inventory above (the most likely
    case is sponsor SVG count differing from the 4-6 estimate or
    a theme base swap inside the cool-maritime family).

## Commit boundaries

Commit slices named upfront. Each commit must independently lint,
typecheck, build, and pass `npm test`. The "tripwire test bundles
with the registry edit that trips it" rule is the binding shape.

> Estimate-shaped per AGENTS.md "Plan content is a mix of rules and
> estimates"; implementer may refine if a different split clarifies
> history.

1. **Theme module + theme registry extension + getThemeForSlug
   tripwire test update.** Files:
   `shared/styles/themes/riverside-jam.ts` (new),
   [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
   (modified),
   [`tests/shared/styles/getThemeForSlug.test.ts`](/tests/shared/styles/getThemeForSlug.test.ts)
   (modified). Single commit; lint/test/build/test pass as a
   unit. The Theme is registered but no consumer references the
   new slug yet, so apps/site renders identically to baseline at
   this commit.
2. **Sponsor SVG placeholders.** Files:
   `apps/site/public/test-events/riverside-jam/<sponsor-slug>.svg`
   (4-6 new files). Single commit; no test impact, build still
   passes. Assets are dead until commit 3 references them, marked
   by the directory name making the consumer obvious.
3. **Content module + content registry extension +
   eventContentBySlug tripwire test update.** Files:
   `apps/site/events/riverside-jam.ts` (new),
   [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
   (modified),
   [`tests/site/event/eventContent.test.ts`](/tests/site/event/eventContent.test.ts)
   (modified). Single commit; lint/test/build/test pass as a
   unit. After this commit the build log shows the new prerender
   entries; the rendered HTML at `/event/riverside-jam` carries
   the per-event meta tags, the disclaimer banner, and the
   `noindex` robots meta.
4. **Documentation update.** Files: this plan (Status flip),
   [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
   (Phase Status row update). Single commit.
5. **Review-fix commits.** As needed during step 12 of execution,
   kept distinct from the substantive implementation commits per
   [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline (with `["harvest-block-party"]`
  tripwire expectations); pass on final (with
  `["harvest-block-party", "riverside-jam"]` tripwire
  expectations). Both updated tripwire tests must pass; the new
  per-slug resolution and per-slug content-lookup cases must
  pass.
- `npm run build:web` — pass on baseline; pass on final. 3.2
  does not touch apps/web source.
- `npm run build:site` — pass on baseline; pass on final. The
  load-bearing gate. Build log must show
  `/event/[slug]`, `/event/[slug]/opengraph-image`, and
  `/event/[slug]/twitter-image` in the prerender list with one
  entry per registered slug — i.e., entries for both
  `harvest-block-party` and `riverside-jam` on each route.
- `npm run test:functions` — pass on baseline; pass on final. No
  Edge Function source change.
- `npm run test:db` (pgTAP suite) — pass on baseline; pass on
  final. No SQL change.
- **Server-rendered noindex falsifier** per Execution step 7:
  curl raw HTML for `/event/riverside-jam`, grep for the robots
  meta, confirm `noindex` is present pre-hydration. Output
  captured in the PR body. This is the falsifier for the
  `testEvent: true → robots noindex` claim and protects against
  the regression class where someone forgets to set `testEvent`
  on a new event module.
- **OG image visual capture** per Execution step 8. The rendered
  PNG must look visually plausible and read as the new Theme.
  Captured in the PR body's UX Review section.
- **Multi-theme side-by-side UI capture** per Execution step 9.
  The two test events must read as visually distinct identities.
  Captured in the PR body's UX Review section.
- **Slack unfurl capture** per Execution step 10. The
  consumer-end proof. Captured in the PR body's UX Review
  section.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) and
matched to this phase's diff surfaces.

### Frontend

- **Theme-resolution-via-themeSlug audit.** Walk the new content
  module's `themeSlug` field and confirm it spells
  `"riverside-jam"` exactly, matching the registered theme key.
  Walk the page route's wrap at
  [`apps/site/app/event/[slug]/page.tsx` line 106](/apps/site/app/event/%5Bslug%5D/page.tsx)
  and the OG image generator's resolution at
  [`apps/site/lib/eventOgImage.tsx` line 38](/apps/site/lib/eventOgImage.tsx)
  to confirm both still pass `content.themeSlug` (not the URL
  slug). Same trap as 3.1.1 / 3.1.2: a wrong call on either site
  passes the new event's UI-review unchanged because
  `themeSlug === slug` for the test event, but breaks M4 silently
  when divergent.
- **Slug-identity audit.** Walk the string `"riverside-jam"` at
  every site (theme registry key, content module's `slug` field,
  content module's `themeSlug` field, content registry key
  computed via `[riversideJamContent.slug]`, public asset
  subdirectory `apps/site/public/test-events/riverside-jam/`,
  both updated tripwire tests' expected new strings). All eight
  sites must spell the slug identically. A single typo silently
  degrades behavior per the cross-cutting invariant.
- **Test-event posture audit.** Confirm `testEvent: true` is set
  on the new content module. Confirm the rendered HTML at
  `/event/riverside-jam` carries both the disclaimer banner
  (visual capture in step 9) and the robots noindex meta (curl
  output in step 7). The `testEvent` flag controls both surfaces;
  forgetting it silently regresses both the visual disclosure and
  the crawler exclusion.
- **Tripwire-test-update audit.** Walk both updated test files
  and confirm the new assertions distinguish "registry contains
  the new slug" (the `Object.keys.sort()` /
  `registeredEventSlugs.sort()` expectations) from "resolver maps
  the new slug to the new theme/content" (the per-slug `toBe`
  cases). Both classes are needed: the sort-expectation alone
  proves the registry was edited; the per-slug case proves the
  edited entry resolves correctly. Either class alone leaves
  half the regression surface uncovered.
- **OG image / page hero visual contrast audit.** Compare the
  riverside OG image PNG (step 8) and the riverside event landing
  page (step 9) against both Sage Civic and Harvest baselines. If
  the riverside palette reads visually too close to either prior
  Theme, swap a base hex per the contract's allowance and
  re-capture. The audit is the load-bearing falsifier for the
  multi-theme proof; without it, "the new Theme is distinct" is
  asserted by code reasoning rather than by inspection.
- **Effect cleanup audit.** Vacuously satisfied. 3.2 ships zero
  client islands and zero `useEffect` calls. The new content
  module is pure data; the new theme module is pure data; the
  test updates are synchronous.

### CI & testing infrastructure

- **CLI / tooling pinning audit.** 3.2 introduces zero new
  dependencies. The new files are TypeScript (theme module,
  content module, both already-imported test files) and SVG
  (sponsor logos). The contract relies on already-shipped deps
  (the `Theme` type, the `EventContent` type, vitest, the
  Next.js bundler). If implementation surfaces a need for a new
  package (very unlikely; the harvest precedent established that
  the existing dependency set covers the full pipeline), it
  lands pinned per AGENTS.md and the PR description names it
  explicitly.
- **Rename-aware diff classification.** All new files (theme
  module, content module, sponsor SVGs) are net-new — `git diff
  --name-status` should show `A` entries for them. Modifications
  to the two registries, the two tripwire tests, the milestone
  doc, and this plan should show `M` entries. No `R` (rename)
  entries; nothing moves.
- **Readiness-gate truthfulness audit.** The Validation Gate
  names four load-bearing manual checks (curl noindex falsifier,
  OG image PNG capture, multi-theme side-by-side capture, Slack
  unfurl capture) in addition to the automated suite. The PR
  body captures the actual outputs (grep stdout, image files,
  Slack screenshot) — not just statements that the checks were
  run. Without captured output, a reviewer cannot distinguish
  "the multi-theme proof rendered" from "the new Theme silently
  fell back to platform Sage Civic and looks identical to the
  baseline."

## Documentation Currency PR Gate

Per [`AGENTS.md`](/AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
  Phase Status table — Phase 3.2 row's `Status` column flips
  from `Proposed` to `Landed`; `Plan` column gets the link to
  this plan; `PR` column gets the 3.2 PR number.
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.
- [`docs/architecture.md`](/docs/architecture.md) — no change.
  Owned by 3.3.
- [`README.md`](/README.md) — no change. Owned by 3.3.
- [`docs/dev.md`](/docs/dev.md) — no change. No new validation
  commands or workflow changes.
- [`docs/styling.md`](/docs/styling.md) — no change. The
  "Procedure For Adding A New Theme" was followed verbatim; the
  doc itself does not need an edit.
- [`docs/open-questions.md`](/docs/open-questions.md) — no
  change. Owned by 3.3.
- [`docs/backlog.md`](/docs/backlog.md) — no change.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  M3 row — stays `Proposed`. Flips to `Landed` only in 3.3's PR.
- [`docs/plans/m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md)
  and
  [`docs/plans/m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md)
  — no edit. Both already `Landed`; 3.2 does not retroactively
  edit sibling plans.
- [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md)
  and the two sibling 3.1 scoping docs — no edit. All three
  delete in batch in 3.3's PR per the milestone doc.

## Out Of Scope

Deliberately excluded from this phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **Section component changes or rendering-pipeline changes.**
  Resolution: out of 3.2 per the "pure additive PR" cross-cutting
  invariant. If implementation surfaces a need (e.g., the
  riverside event content needs a multi-stage section the
  template doesn't have), the rule-deviation path is to either
  defer the new event's affected content or update the rendering
  layer in a sub-PR with the in-PR plan-doc rewrite the rule-
  deviation path requires.
- **`EventContent` type evolution.** Resolution: not expected per
  the M3 milestone doc's "`EventContent` type stability"
  cross-phase invariant; the riverside content shape exercises
  every existing field at depth comparable to harvest. If a gap
  surfaces, the Risk Register names the rule-deviation path
  (extend backwards-shape-compatibly in 3.2's PR, walk the
  harvest content to confirm it still validates).
- **OG image content evolution per-event.** Resolution: out of
  3.2 per the 3.1.2 plan's invariant "The OG image reads
  `EventContent` only" — no per-event override mechanism. The
  riverside event's OG image renders from existing fields exactly
  like the harvest event.
- **Custom font loading for OG image.** Resolution: out of 3.2.
  3.1.2's "Satori built-in font fallback is fine for test events"
  default carries forward; the implementer eyeballs the rendered
  PNG against the new palette and only escalates to a font load
  if the rendered text reads unacceptable. The default path is
  no font load.
- **Cross-app theme continuity verification.** Resolution: out of
  3.2 per the M3 milestone doc's "Cross-app theme-continuity is
  not an M3 gate" invariant. The riverside event renders its
  registered Theme on apps/site; clicking through to apps/web's
  game route lands on warm-cream `:root` defaults until M4 phase
  4.1 wires apps/web event-route ThemeScope. The disclaimer
  banner already signals "demo event for platform testing" so
  the cross-app visual jump on test events is acceptable.
- **Apps/web changes.** Resolution: out of 3.2. No source code
  in `apps/web/` is touched; the existing
  [`apps/web/vercel.json`](/apps/web/vercel.json) rewrite
  `/event/:slug/:path*` covers the new event's URL paths
  unchanged.
- **Architecture.md / README.md / open-questions.md / backlog.md
  updates.** Resolution: all owned by 3.3 per the M3 milestone
  doc's "Documentation Currency" section. 3.2 does not write
  rendering-pipeline-platform documentation; that's 3.3's job
  after 3.2 lands the multi-theme proof.
- **Reusable unfurl-validation script.** Resolution: out of 3.2
  per the same rationale 3.1.2 recorded — Slack's actual unfurl
  behavior requires an OAuth-scoped Slack app, and the curl
  falsifier alone duplicates without adding value.
- **Slack unfurl capture for additional consumer clients (X,
  iMessage, LinkedIn).** Resolution: out of 3.2 per the M3
  milestone doc's bound on unfurl validation ("one consumer
  client" to avoid platform-by-platform compatibility scope
  creep). 3.2 captures Slack only, matching 3.1.2.
- **Per-event font selection for the riverside Theme.**
  Resolution: out of 3.2 per
  [`docs/styling.md`](/docs/styling.md) — per-event font
  selection is post-epic. The riverside Theme reuses the
  apps/site root layout's `next/font` Inter + Fraunces variables
  exactly like harvest does.
- **Static og:image asset alternative for the riverside event.**
  Resolution: out of 3.2 per 3.1.2's file-convention strategy
  decision — the file-convention `opengraph-image.tsx` route
  prerenders one image per registered slug at build time, which
  is exactly the right shape for the new event with no extra
  work.
- **Strict-pattern curl assertion (exact-match origin) for the
  noindex falsifier.** Resolution: out of 3.2. The grep for
  `noindex` in the robots meta is a positive-presence check; a
  strict-pattern assertion would couple the validation script to
  Next.js' exact emit shape, which already surfaced as variable
  during 3.1.1 review. The looser presence check matches the
  3.1.1 precedent.
- **Post-deploy production smoke for the riverside event's
  unfurl URL.** Resolution: out of 3.2 per the same rationale
  3.1.2 recorded — production smoke tier runs against the
  deployed origin per
  [`docs/testing-tiers.md`](/docs/testing-tiers.md), and 3.2's
  gate is pre-merge curl + Slack unfurl capture against the
  Vercel deploy preview. If a recurring smoke check is desirable,
  it lands in a separate plan (likely M3 phase 3.3 or later).
- **Cross-app navigation polish from the riverside event into
  apps/web.** Resolution: M3 phase 3.3 owns cross-app nav
  verification per the milestone doc.

## Risk Register

- **Theme palette reads visually too close to Sage Civic or
  Harvest at first build.** Mitigation: the multi-theme
  side-by-side UI capture (Execution step 9) is the load-bearing
  falsifier; if the implementer cannot tell the riverside event
  apart from harvest at a glance, the contract permits a base-hex
  swap inside the cool-maritime family before the PR opens. The
  contract names hue and warm/cool axes both Themes must satisfy
  to anchor the implementer's eye.
- **`themeSlug` divergence from `slug` causes silent fall-back to
  platform Theme.** If the implementer types `themeSlug:
  "riverside-jam"` but the theme registry key reads
  `"riverside_jam"` (or vice versa), `getThemeForSlug` returns
  the platform Sage Civic Theme and the new event renders against
  it — visually indistinguishable from "the Theme didn't take"
  and from "I forgot to register the Theme." Mitigation: the
  Slug-Identity audit walks every site explicitly; the OG image
  PNG capture surfaces a Sage Civic-themed render immediately;
  the per-slug resolution case in the updated `getThemeForSlug`
  test asserts referential identity (`toBe`), not deep equality,
  so a typo at the consumer side fails the test even if the
  rendered HTML looks plausible at first glance.
- **One of the two registries forgotten.** Adding only the theme
  registry entry leaves the page route returning `notFound()`
  for `/event/riverside-jam` (because `getEventContentBySlug`
  returns null); adding only the content registry entry leaves
  the page route rendering against platform Sage Civic. Both
  failures are visually obvious on first manual check, but
  forgetting one delays the PR. Mitigation: the Commit boundaries
  bundle each registry edit with its tripwire test update; the
  build log inspection in step 5 names the prerender entries
  that must show; the multi-theme side-by-side UI capture in
  step 9 surfaces a Sage-Civic-themed riverside event
  immediately.
- **Tripwire test updates forgotten or partial.** If the
  implementer adds the registry entry without updating the
  tripwire test's `sort()` expectation, `npm test` fails the
  commit. If the implementer updates the `sort()` expectation
  without adding the per-slug resolution case, the tripwire
  passes but the new Theme's resolver behavior is asserted by
  code reasoning rather than by inspection. Mitigation: the
  Tripwire-Test-Update Audit walks both updates explicitly; the
  Contracts section names both classes of update as required.
- **Sponsor SVG missing or path typo causes broken `<img>`
  404s.** A typo in `logoSrc` (e.g., `riverside_jam` instead of
  `riverside-jam`, or a wrong sponsor filename) renders broken
  image icons on the page. Mitigation: the page-level UI capture
  in step 9 surfaces broken images visually; the curl falsifier
  in step 7 incidentally catches a 404 if the implementer extends
  it to grep `<img src=` (not required by the contract but a
  reasonable extension at implementation time).
- **`EventContent` shape gap surfaces only at riverside content
  authoring.** If the riverside content needs a field the type
  doesn't have (e.g., a "stage" field for multi-stage festivals,
  a "performer headshot" field), the implementer faces the
  rule-deviation choice: extend `EventContent` backwards-shape-
  compatibly in this PR + walk harvest to confirm it still
  validates, or rephrase the riverside content to fit the
  existing shape. Mitigation: the M3 milestone doc explicitly
  permits backwards-compatible evolution; the Cross-Cutting
  Invariants Touched section names the path. The harvest content
  module exercises a range of shapes (multi-day schedule, lineup
  with set-time cross-references, sponsor tiering, optional
  performer bios) deep enough that a riverside shape gap is
  unlikely.
- **`testEvent: true` forgotten on the new content module.** If
  the implementer copies the harvest module shape but drops the
  `testEvent` field, the new event ships *without* the disclaimer
  banner *and* without the robots noindex meta — both
  simultaneously. A fictional event then leaks into search caches
  as a real event. Mitigation: the Test-Event-Posture Audit walks
  both surfaces explicitly; the curl falsifier in step 7 catches
  the missing noindex; the UI capture in step 9 catches the
  missing disclaimer.
- **Slack/iMessage cache survives the merge.** If the riverside
  event URL was unfurled into Slack at any point during draft-PR
  review (with a 404 or partial preview), Slack caches that
  state. Mitigation: the Slack unfurl capture (step 10) uses the
  cache-bust `?v=<timestamp>` pattern documented in 3.1.2's plan
  so reviewer attention does not relitigate "the unfurl is
  broken" against a stale cache. Post-merge, anyone who unfurled
  early may need to re-paste with a fresh cache-bust to see the
  shipped state.
- **Theme palette OG image text contrast fails against the new
  cool maritime bg.** If the deep teal `primary` and the deep
  navy `text` are too close in luminance against a pale-blue
  `bg`, the OG image text becomes hard to read. Mitigation: the
  OG image visual capture (step 8) surfaces the contrast directly;
  the implementer eyeballs and swaps `text` to a darker base or
  the `bg` to a lighter base if needed. Same risk class as the
  3.1.2 plan named for harvest; same mitigation.
- **Asset bloat from sponsor SVGs.** Per the 3.1 scoping doc's
  bloat mitigation. Each SVG sized under ~2 KB; total
  contribution under ~12 KB committed for 4-6 sponsors.
  Mitigation: the implementer reads each SVG's file size before
  committing.
- **Build-log prerender count regression.** If a future Next.js
  upgrade silently changes the file-convention prerender behavior
  (e.g., starts treating routes with `generateStaticParams` as
  Dynamic by default), the new event's image routes might skip
  prerender. Mitigation: out of scope for 3.2 (this is a future-
  Next.js-version risk); the build log inspection in step 5
  catches the current Next.js behavior at this commit. The
  risk transfers to whichever plan upgrades Next.js.

## Backlog Impact

None. The "Event landing page for /event/:slug" backlog item closes
with M4 phase 4.2 (Madrona content), not with M3 infrastructure
phases. M3's "platform shape exists" goal needs all three M3 phases
to land — 3.1 (rendering pipeline), 3.2 (multi-theme proof, this
phase), and 3.3 (closure + cross-app nav verification) — before
the milestone closes.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  parent epic; M3 phase paragraphs are pre-milestone-planning
  estimate per the milestone doc.
- [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md) —
  M3 milestone doc; cross-phase invariants, decisions, risks.
  3.2's PR flips the Phase Status table's 3.2 row to `Landed`.
- [`m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md) —
  3.1.1 plan (rendering pipeline + first test event + basic SSR
  meta). 3.2 inherits the rendering contracts and the
  `EventContent` shape unchanged.
- [`m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md) —
  3.1.2 plan (per-event OG image, twitter-image, `metadataBase`,
  `openGraph.url`, unfurl verification). 3.2 inherits the
  image pipeline and unfurl-validation procedure unchanged.
- [`docs/plans/scoping/m3-phase-3-2.md`](/docs/plans/scoping/m3-phase-3-2.md) —
  scoping doc this plan compresses from. Records the slug,
  palette family, additive-PR-shape, and tripwire-test decisions
  plus the open decisions for plan-drafting. Deletes in batch in
  3.3's PR alongside the other M3 scoping docs.
- [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)
  and
  [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md) —
  3.1's scoping docs; record the slug + theme conventions and the
  image-pipeline decisions 3.2 inherits. Same batch-deletion in
  3.3.
- [`shared-styles-foundation.md`](/docs/plans/shared-styles-foundation.md)
  — M1 phase 1.5 plan; ThemeScope contract and `getThemeForSlug`
  resolver. The procedure for adding a new theme rooted there.
- [`docs/styling.md`](/docs/styling.md) — themable / structural
  classification; "Procedure For Adding A New Theme" the new
  Theme follows verbatim (no procedure edit needed in this phase).
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit name source.
- [`apps/site/AGENTS.md`](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder. 3.2 does not introduce any new
  framework API surface; the file-convention image routes and
  the page route's `Metadata` shape were locked at 3.1.2 land
  time.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions rules,
  Plan-to-PR Completion Gate, Doc Currency PR Gate, "Verified
  by:" annotation rule, "Plan content is a mix of rules and
  estimates" rule, "Bans on surface require rendering the
  consequence" rule (which makes the OG image visual capture and
  the multi-theme side-by-side capture load-bearing for 3.2).
