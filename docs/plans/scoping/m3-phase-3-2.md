# M3 Phase 3.2 — Scoping

## Status

Transient scoping artifact for M3 phase 3.2 ("Second test event with
distinct theme") per the M3 milestone doc
([m3-site-rendering.md](/docs/plans/m3-site-rendering.md)) and
[AGENTS.md](/AGENTS.md) "Phase Planning Sessions." This doc plus its
sibling scoping docs delete in batch in M3 phase 3.3's PR per the
milestone doc's "Phase Status" subsection. The durable contract for
3.2 lives in
[`m3-phase-3-2-plan.md`](/docs/plans/m3-phase-3-2-plan.md);
this scoping doc is the input that plan compresses from.

Per AGENTS.md "Phase Planning Sessions → Scoping owns / plan owns,"
this doc carries deliberation prose with rejected alternatives, the
open decisions handoff, plan-structure handoff, and reality-check
inputs the plan must verify — content with no audience after the
plan lands. File inventory, contracts, cross-cutting invariants,
validation gate, self-review audits, and risks live in the plan and
are not restated here.

## Phase summary in one paragraph

3.1 (3.1.1 + 3.1.2) shipped the apps/site `/event/[slug]` rendering
pipeline against one registered test event (`harvest-block-party`)
on one registered Theme. The pipeline is intentionally
slug-agnostic — every per-event surface (page route, OG image,
Twitter image) reads the registry through `registeredEventSlugs` so
adding a new event is a registry-extension diff with no rendering-
layer changes. 3.2 proves multi-theme rendering by adding a second
test event content module, a second per-event Theme registered
under a distinct slug, and the supporting public-asset placeholders
the new content references. Inheritance is the load-bearing claim:
the OG image, Twitter image, page prerender, robots-noindex meta,
and disclaimer banner all light up automatically for the new slug
without per-event wiring. M3 phase 3.3 then closes the milestone by
documenting the now-proven multi-theme platform shape in
architecture.md and README.md.

## Decisions made at scoping time

These resolve the open decisions named in the M3 milestone doc and
the 3.1 scoping/plan docs that 3.2 inherits. Each decision lists
rejected alternatives with rationale and a `Verified by:` cite to
the code that grounded the call. Implementation specifics (file
paths, contract shapes, validation procedures) live in the plan;
this section explains *why* those choices are correct, not *what*
they are.

### Phase shape → pure additive PR; no rendering-layer changes

The 3.1 scoping doc's [PR-split decision](/docs/plans/scoping/m3-phase-3-1.md)
sketched 3.2 as adding "the second event and second theme to prove
multi-theme variety." Walking the merged 3.1 surface against that
sketch confirms the diff shape: every per-slug entry point already
reads the registry through `registeredEventSlugs`. Adding a new
slug entry to `eventContentBySlug`
([apps/site/lib/eventContent.ts lines 81-83](/apps/site/lib/eventContent.ts))
extends the prerender list for `Page`, `opengraph-image`, and
`twitter-image` by construction:

- Page route's `generateStaticParams` consumes `registeredEventSlugs`
  ([apps/site/app/event/[slug]/page.tsx lines 18-20](/apps/site/app/event/%5Bslug%5D/page.tsx)).
- OG image route's `generateStaticParams` consumes
  `registeredEventSlugs`
  ([apps/site/app/event/[slug]/opengraph-image.tsx lines 46-48](/apps/site/app/event/%5Bslug%5D/opengraph-image.tsx)).
- Twitter image route's `generateStaticParams` consumes
  `registeredEventSlugs`
  ([apps/site/app/event/[slug]/twitter-image.tsx lines 35-37](/apps/site/app/event/%5Bslug%5D/twitter-image.tsx)).
- `<TestEventDisclaimer>` renders inside `EventLandingPage` whenever
  `content.testEvent` is truthy
  ([apps/site/components/event/EventLandingPage.tsx line 28](/apps/site/components/event/EventLandingPage.tsx)),
  so setting `testEvent: true` on the new content module is the only
  wiring required.
- `robots: { index: false, follow: false }` ships from
  `generateMetadata` whenever `content.testEvent` is truthy
  ([apps/site/app/event/[slug]/page.tsx lines 69-71](/apps/site/app/event/%5Bslug%5D/page.tsx)).

**Decision.** 3.2 ships as a pure additive PR: new theme module,
theme-registry extension, new content module, registry extension,
sponsor-logo SVGs under a new public-asset directory, and tripwire
test updates. **No section component changes, no page route changes,
no OG image generator changes, no `EventContent` shape changes, no
apps/web changes, no DB/auth surface.** If implementation surfaces a
need for any rendering-layer change (e.g., the new event reveals an
`EventContent` field gap), that is a **rule deviation** triggering
either a `EventContent`-evolution sub-PR per the M3 milestone doc's
"`EventContent` type stability" cross-phase invariant or a scope
split per AGENTS.md "Stop-And-Report Conditions."

### Second test event slug → `riverside-jam`

Constraints (per the M3 milestone doc's "Test event slugs are
descriptive, not generic" settled-by-default and the 3.1 scoping
doc's same rule): a season-flavor or location-flavor name that
lands in unfurl caches as a plausible neighborhood-event identity.
Must not collide with the harvest test event slug or the existing
quiz fixtures (`first-sample`, `sponsor-spotlight`,
`community-checklist` — verified at
[shared/game-config/sample-games.ts lines 113-194](/shared/game-config/sample-games.ts)).
Should signal a *different season and setting* from
`harvest-block-party` so the visual contrast between the two test
events tells a clear story rather than reading as two takes on the
same event.

The 3.1 scoping doc named `winter-makers-market` and `riverside-jam`
as illustrative options. Walking both:

- `winter-makers-market`: winter neighborhood market. Conventional
  winter palette is evergreen + crimson + warm white, which puts
  evergreen too close to Sage Civic's deep-forest primary
  (`#2c5e4f` per
  [shared/styles/themes/platform.ts line 35](/shared/styles/themes/platform.ts)).
  Avoiding evergreen forces the winter palette into icy-blue +
  silver territory, which is fine but loses the seasonal-resonance
  argument for picking "winter" in the first place.
- `riverside-jam`: summer outdoor music festival on a river or
  waterfront. The maritime palette space (deep teal/navy primary,
  warm sand accent, cool pale-blue surfaces) is naturally distant
  from both Sage Civic's cool sage-green and Harvest's warm
  pumpkin-amber, with no risk of either palette pulling the new
  Theme back toward the existing two.

**Decision.** `riverside-jam`. Descriptive, distinct from harvest,
distinct from quiz fixtures, and the implied palette space gives
the implementer a wide visual margin against both already-shipped
Themes. The implementer may swap to an equivalent descriptive slug
(e.g., `harborside-jam`, `bayfront-jam`) at implementation time
without re-opening the plan provided every site that names the
slug — content module, theme module, registry, asset path, both
tripwire tests, the OG image visual capture, the Slack unfurl
capture URL — re-rolls together. Generic candidates
(`test-event-b`, `second-event`) are rejected up-front by the
descriptive-not-generic rule.

### Second test event Theme → cool maritime palette, visually distinct from both prior Themes

The end-to-end multi-theme rendering proof depends on a reader
being able to look at `/event/harvest-block-party` and
`/event/riverside-jam` side by side and see two clearly different
visual identities, both clearly different from apps/site's
platform Sage Civic. If the new Theme reads as "yet another warm
neutral" or "yet another cool sage variant," 3.2's whole reason
for existing collapses.

Two non-trivial axes the implementer eyeballs at plan time:

- **Hue contrast.** The brand-base primary should sit in a hue
  family neither already-shipped Theme uses. Sage Civic primary is
  cool-green-leaning (`#2c5e4f`); Harvest primary is warm-orange-
  leaning (`#b85c1c` per
  [shared/styles/themes/harvest-block-party.ts line 30](/shared/styles/themes/harvest-block-party.ts)).
  Riverside-jam should land in cool-blue-leaning territory — deep
  teal or deep navy — so all three primaries occupy distinct hue
  regions on the color wheel.
- **Background warm-vs-cool.** Sage Civic bg is a warm pale sage
  (`#f3f4ee`); Harvest bg is a warm cream-pumpkin (`#fdf3e8`).
  Both bgs read warm. Riverside should read cool — pale sky-blue
  or pale slate — so the bg alone signals "different theme" before
  any primary surface comes into view.

**Decision.** Cool maritime palette: deep teal/navy primary, warm
sand or amber accent (for clear pop against teal), pale sky-blue or
pale slate background, deep navy text, cool-tinted whites. The plan
locks specific hex values; this scoping doc records the rationale
for the palette family.

The plan also picks distinct themable radii (`panelRadius`,
`cardRadius`, `controlRadius`) so the third Theme's radii flow
visibly through the registry just like Harvest's did against Sage
Civic. Sage Civic uses 16/12/10; Harvest uses 12/8/6; Riverside can
pick a third combination (e.g., 20/14/8 for a chunkier panel feel)
to make the "radii flow through the registry, not just colors" check
provable across three Themes rather than two.

A "reuse Harvest's Theme with a slug alias" alternative is rejected
on its face: it would make multi-theme rendering visually
unprovable — the whole point of 3.2 is registering a *second*
distinct visual identity, not a second slug pointing at the first.

### Test asset path convention → `apps/site/public/test-events/<slug>/`

Established by 3.1.1 at
[apps/site/public/test-events/harvest-block-party/](/apps/site/public/test-events/harvest-block-party)
(the directory holding the five harvest sponsor SVGs the harvest
content module references). The 3.1 scoping doc explicitly named
this convention so M4's Madrona assets can land at
`apps/site/public/events/madrona/` with no collision; 3.2 inherits
the convention without re-litigating.

**Decision.** New sponsor logos live at
`apps/site/public/test-events/riverside-jam/<sponsor>.svg`. Each is
a placeholder neutral SVG sized under ~2 KB per the 3.1 scoping
doc's bloat mitigation. The sponsor logo *aesthetic* (line weight,
color treatment, geometric vs. literal motif) is implementer choice
within the neutral-placeholder constraint; the test event will not
ship real third-party logos.

### Tripwire-test updates → required, called out in plan contracts

Two existing tests carry exact-match `Object.keys.sort()` /
`registeredEventSlugs.sort()` assertions whose intent is to fire
when the registry changes:

- [tests/site/event/eventContent.test.ts lines 35-39](/tests/site/event/eventContent.test.ts)
  asserts `registeredEventSlugs.sort()` equals
  `["harvest-block-party"]`. Adding `riverside-jam` to the registry
  trips this assertion.
- [tests/shared/styles/getThemeForSlug.test.ts lines 23-29](/tests/shared/styles/getThemeForSlug.test.ts)
  asserts `Object.keys(themes).sort()` equals
  `["harvest-block-party"]` and explicitly comments itself as a
  "Tripwire" requiring "an explicit per-slug resolution case above
  so resolver behavior is verified, not asserted by code reasoning."

**Decision.** Both tripwire updates are *required*, not optional,
and the plan's Contracts section names them explicitly. The
`getThemeForSlug` test must gain (a) a per-slug resolution case
asserting the new theme resolves under its slug and (b) the
updated `Object.keys.sort()` expectation. The `eventContentBySlug`
test must gain (a) a known-slug-returns-content case for the new
slug and (b) the updated `registeredEventSlugs.sort()` expectation.
The "registered content's slug field matches its registry key" case
already covers any future slug by structure — no new assertion
needed there.

A "skip the tripwire updates and rely on `npm test` to surface
them" alternative is rejected: the implementer would land
mid-implementation broken-test commits, and reviewer attention
would re-derive that these are tripwires rather than real
regressions. Calling them out in the plan's Contracts surfaces them
as deliberate updates with intended new assertions, not failures.

### `EventContent` shape evolution → not expected; rule-deviation path if needed

The M3 milestone doc's "`EventContent` type stability" cross-phase
invariant ([m3-site-rendering.md lines 159-169](/docs/plans/m3-site-rendering.md))
permits 3.2 to evolve the type if the second event surfaces a
content-shape gap, but only backwards-shape-compatibly so M4
inherits cleanly. The 3.1 scoping doc's Madrona-fit walk
([scoping/m3-phase-3-1.md lines 451-487](/docs/plans/scoping/m3-phase-3-1.md))
audited the type against schedule depth, sponsor tiering, FAQ
content, image alts, and date/time strings. Walking those again
against `riverside-jam`'s plausible content shape:

- Schedule with multiple days and per-day sessions: covered.
- Lineup with set times cross-referencing schedule days: covered.
- Sponsors with logo + link, optional `tier`: covered.
- FAQ as plain-text Q&A: covered.
- CTA copy with optional sublabel: covered.
- Optional `footer.attribution` override: covered.
- Optional `hero.tagline`: covered.

**Decision.** No `EventContent` evolution expected. If
implementation surfaces a gap (e.g., the riverside event content
needs to convey a multi-stage festival shape the type can't
express), the plan's Risk Register names the rule-deviation path:
extend `EventContent` backwards-shape-compatibly in 3.2's PR, walk
the harvest content module to confirm it still validates, update
the M3 milestone doc's invariant note. This is the same path the
type was scoped to permit; calling it out in the Risk Register
keeps reviewer attention from treating an evolution as scope creep
if it lands.

### PR shape → single PR; no sub-phase split

Branch test per AGENTS.md "PR-count predictions need a branch
test." Estimated diff surface:

- 1 new theme module (~50 lines, follows
  [shared/styles/themes/harvest-block-party.ts](/shared/styles/themes/harvest-block-party.ts)
  shape).
- 1 modified theme registry (~3 lines).
- 1 new content module (~150-200 lines, follows
  [apps/site/events/harvest-block-party.ts](/apps/site/events/harvest-block-party.ts)
  shape and depth).
- 1 modified registry in `eventContent.ts` (~3 lines).
- 4-5 new sponsor SVGs (~8-10 KB total).
- 2 modified test files (~10 lines each).
- 1 modified milestone-doc row + 1 modified plan-status flip.

Total: well under the 300-LOC substantive-logic threshold and
spanning two coherent subsystems (theme registry +
event-content registry) that review on the same axis (registry
extension under proven contracts). No 3.2.1/3.2.2 sub-phase
split is justified.

### M3 milestone-doc update → flip 3.2 row + record this scoping doc cite

The M3 milestone doc's Phase Status table
([m3-site-rendering.md lines 70-74](/docs/plans/m3-site-rendering.md))
currently shows 3.2 as `Proposed` with no plan link. The plan-
drafting commit (this PR's first commit) updates the row to point
at the new plan with `Proposed` status; the implementing PR's
final commit flips Status to `Landed` and adds the PR link per
AGENTS.md "Plan-to-PR Completion Gate."

The milestone doc's `Sequencing` Mermaid graph and Cross-Phase
Invariants are unchanged by 3.2 — the invariants already named
3.2's behavior ("3.2's second event module ... consume the same
type without contract changes"). No milestone-doc rule edits.

## Open decisions to make at plan-drafting

These are open questions left for the plan to resolve.

- **Final theme hex values for riverside-jam.** The cool maritime
  palette family is locked above; the plan picks specific bases
  for `bg`, `surface`, `surfaceCard`, `text`, `muted`, `border`,
  `primary`, `secondary`, `accent`, `whiteWarm`/`whitePanel`/
  `whiteTint`, `pageGradientStart/End`, `heroStart/End`, plus the
  three radii. The plan lists them as a contract block; the
  implementer eyeballs against Sage Civic and Harvest in UI review
  and may swap any base if the rendered page reads visually too
  close to either prior Theme — the swap is an estimate deviation
  per AGENTS.md, not a rule deviation, provided the cool-maritime
  palette family stays.
- **Riverside content depth and copy.** The plan sketches the
  fictional event (number of days, lineup composition, sponsor
  list, FAQ topics). Implementer picks final names and copy at
  implementation time within the sketch. Constraint: every
  `EventContent` field exercised, same depth as harvest so the
  multi-theme proof rests on equivalent content density rather
  than a sparse vs. dense visual asymmetry.
- **Sponsor SVG count and aesthetic.** Plan locks "4-6 neutral
  placeholder SVGs"; the exact count and the aesthetic
  (geometric monogram vs. simplified pictogram) is implementer
  choice. The harvest event ships five neutral monograms at
  ~1-2 KB each as the precedent.
- **Per-event UI-review capture set.** The plan names the
  required UI-review captures: a desktop + mobile pair of the new
  event landing page, plus the OG image PNG capture. Optional
  extras (a side-by-side Harvest/Riverside contrast capture for
  the multi-theme proof) are implementer choice.
- **Slack unfurl capture for the new event.** Plan locks "one
  consumer-client unfurl capture per the M3 milestone doc's
  bounded scope, on the new event." The implementer reuses the
  cache-bust pattern documented in the 3.1.2 plan
  ([m3-phase-3-1-2-plan.md](/docs/plans/m3-phase-3-1-2-plan.md))
  rather than re-deriving it.

## Plan structure handoff

The plan at
[`docs/plans/m3-phase-3-2-plan.md`](/docs/plans/m3-phase-3-2-plan.md)
matches the structure of the just-landed
[`m3-phase-3-1-2-plan.md`](/docs/plans/m3-phase-3-1-2-plan.md) with
sections in this order:

1. Status (with terminal-PR note: 3.2's PR flips both this plan's
   Status and the M3 milestone doc's Phase 3.2 row to `Landed`)
2. Plain-language Context preamble (per AGENTS.md "Plan opens
   with a plain-language context preamble") plus the verbatim
   "Reading this plan: code shapes are directional pseudocode"
   boilerplate per AGENTS.md "Planning Depth"
3. Goal
4. Cross-Cutting Invariants
5. Naming
6. Contracts
7. Cross-Cutting Invariants Touched (epic-level)
8. Files to touch — new
9. Files to touch — modify
10. Files intentionally not touched
11. Execution steps
12. Commit boundaries
13. Validation Gate
14. Self-Review Audits
15. Documentation Currency PR Gate
16. Out Of Scope
17. Risk Register
18. Backlog Impact
19. Related Docs

Estimative sections (Files to touch new/modify/intentionally not
touched, Execution steps, Commit boundaries) carry the one-line
"estimate, not rule" preface per AGENTS.md "Plan content is a mix
of rules and estimates — label which is which."

## Reality-check inputs the plan must verify

The plan's load-bearing technical claims need "Verified by:" cites
to actual code or generated output, per AGENTS.md "'Verified by:'
annotations on technical claims." The candidates the plan should
hit:

- The page route's `generateStaticParams` consumes
  `registeredEventSlugs` so the new slug auto-prerenders — verify by
  reading
  [apps/site/app/event/[slug]/page.tsx lines 12-20](/apps/site/app/event/%5Bslug%5D/page.tsx).
- The OG image route's `generateStaticParams` does the same — verify
  by reading
  [apps/site/app/event/[slug]/opengraph-image.tsx lines 38-48](/apps/site/app/event/%5Bslug%5D/opengraph-image.tsx).
- The Twitter image route's `generateStaticParams` does the same —
  verify by reading
  [apps/site/app/event/[slug]/twitter-image.tsx lines 29-37](/apps/site/app/event/%5Bslug%5D/twitter-image.tsx).
- `<TestEventDisclaimer>` renders for any `content.testEvent: true`
  without per-slug coupling — verify by reading
  [apps/site/components/event/EventLandingPage.tsx line 28](/apps/site/components/event/EventLandingPage.tsx)
  and
  [apps/site/components/event/TestEventDisclaimer.tsx](/apps/site/components/event/TestEventDisclaimer.tsx).
- `robots: { index: false, follow: false }` ships server-rendered
  whenever `content.testEvent: true` — verify by reading
  [apps/site/app/event/[slug]/page.tsx lines 69-71](/apps/site/app/event/%5Bslug%5D/page.tsx).
- The OG image generator reads `content.themeSlug` (not the URL
  slug) so a new event whose `themeSlug !== slug` would still get
  the right Theme — verify by reading
  [apps/site/lib/eventOgImage.tsx lines 33-42](/apps/site/lib/eventOgImage.tsx).
- The page route does the same for the ThemeScope wrap — verify by
  reading
  [apps/site/app/event/[slug]/page.tsx lines 99-109](/apps/site/app/event/%5Bslug%5D/page.tsx).
- `getThemeForSlug` resolves a registered slug to its Theme and
  falls back to platform for unregistered — verify by reading
  [shared/styles/getThemeForSlug.ts](/shared/styles/getThemeForSlug.ts)
  and the existing tripwire at
  [tests/shared/styles/getThemeForSlug.test.ts lines 23-29](/tests/shared/styles/getThemeForSlug.test.ts).
- The `eventContentBySlug` registry shape and the
  `registeredEventSlugs` derivation — verify by reading
  [apps/site/lib/eventContent.ts lines 73-100](/apps/site/lib/eventContent.ts).
- The `Theme` type fields (the new Theme module must populate every
  required field) — verify by reading
  [shared/styles/types.ts](/shared/styles/types.ts).
- The harvest-block-party theme's shape and field set as the pattern
  reference — verify by reading
  [shared/styles/themes/harvest-block-party.ts](/shared/styles/themes/harvest-block-party.ts).
- The harvest-block-party content module's depth as the pattern
  reference for the riverside content module — verify by reading
  [apps/site/events/harvest-block-party.ts](/apps/site/events/harvest-block-party.ts).
- `apps/site/public/test-events/<slug>/` as the established asset
  path — verify by reading
  [apps/site/public/test-events/harvest-block-party/](/apps/site/public/test-events/harvest-block-party).
- The vitest include glob covers the existing `tests/site/event/`
  files, so updating them in place needs no config change — verify
  by reading [vitest.config.ts](/vitest.config.ts).
- `npm run lint` covers `apps/site` via the workspace script —
  verify by reading [package.json line 17](/package.json).
- `npm run build:site` covers Next.js production build (the
  load-bearing prerender gate) — verify by reading
  [package.json line 16](/package.json).
- The "Procedure For Adding A New Theme" the new Theme follows —
  verify by reading
  [docs/styling.md lines 319-346](/docs/styling.md).
- The 3.1.2 plan's `metadataBase` resolution behavior so the
  riverside event's OG image and twitter:image URLs absolute-resolve
  for free — verify by reading
  [apps/site/app/layout.tsx lines 59-103](/apps/site/app/layout.tsx).

## Related Docs

- [m3-site-rendering.md](/docs/plans/m3-site-rendering.md) — M3
  milestone doc; cross-phase invariants, decisions, risks.
- [event-platform-epic.md](/docs/plans/event-platform-epic.md) —
  parent epic; M3 phase paragraphs are pre-milestone-planning
  estimate per the milestone doc.
- [m3-phase-3-1-1-plan.md](/docs/plans/m3-phase-3-1-1-plan.md) —
  3.1.1 plan (rendering pipeline + first test event + basic SSR
  meta). 3.2 inherits the rendering contracts unchanged.
- [m3-phase-3-1-2-plan.md](/docs/plans/m3-phase-3-1-2-plan.md) —
  3.1.2 plan (per-event OG image, twitter-image, `metadataBase`,
  `openGraph.url`, unfurl verification). 3.2 inherits the image
  pipeline by adding a slug.
- [m3-phase-3-2-plan.md](/docs/plans/m3-phase-3-2-plan.md) — 3.2
  plan; durable contract this scoping doc compresses to.
- [docs/plans/scoping/m3-phase-3-1.md](/docs/plans/scoping/m3-phase-3-1.md) —
  3.1.1's scoping doc. Records the slug + theme conventions 3.2
  inherits. Deletes in batch with this doc in 3.3's PR.
- [docs/plans/scoping/m3-phase-3-1-2.md](/docs/plans/scoping/m3-phase-3-1-2.md) —
  3.1.2's scoping doc. Records the OG image + `metadataBase`
  decisions 3.2 inherits. Same batch-deletion in 3.3.
- [shared-styles-foundation.md](/docs/plans/shared-styles-foundation.md) —
  M1 phase 1.5 plan; ThemeScope contract and `getThemeForSlug`
  resolver. The procedure for adding a new theme rooted there.
- [docs/styling.md](/docs/styling.md) — themable / structural
  classification; "Procedure For Adding A New Theme" the new Theme
  follows verbatim.
- [docs/self-review-catalog.md](/docs/self-review-catalog.md) —
  audit name source (consumed by the plan's Self-Review Audits
  section).
- [apps/site/AGENTS.md](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder (3.2 does not introduce any new
  framework API surface, so the only docs the plan needs to
  re-confirm against are the file-convention docs already cited by
  3.1.2's plan).
- [AGENTS.md](/AGENTS.md) — Phase Planning Sessions rules
  (including the "Scoping owns / plan owns" split this doc
  follows), Plan-to-PR Completion Gate, "Verified by:"
  annotation rule, "Plan content is a mix of rules and estimates"
  rule (the plan's estimate-shaped sections must carry the
  one-line preface).
