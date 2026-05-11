# M1 phase 1.1 — Madrona Theme registration + minimal Madrona content module

## Status

Landed.

## Context

This phase ships the brand foundation for Madrona Music in the
Playfield on the Neighborly Events platform — the first time
`/event/madrona` resolves to a real Madrona-themed page rather
than the warm-cream platform Sage Civic fallback. It registers
the Madrona Theme in the shared registry, seeds a placeholder
Madrona content module so the page actually renders end-to-end,
and enforces `noindex` so the demo URL stays out of search until
the future Madrona-launch epic is ready to flip it.

Why now: per the parent
[Madrona demo-build epic](/docs/plans/epics/madrona-demo-build/epic.md),
the neighborhood association needs a real-feeling demo URL to
courte bands and sponsors before launch; getting Madrona's brand
applying on the platform — even against placeholder content — is
the foundation every subsequent phase (M1 phase 1.2 shape
extensions, M2 gameplay wiring, M3 real content authoring)
exercises against. Without this phase, every later phase is
testing infrastructure changes against a hypothetical slug.

What this touches at the conceptual level: the shared theme
registry and resolver (one new Theme literal, one registry
entry, header-comment updates), the apps/site content registry
and event landing route (one new content module, one registry
entry, one optional metadata field added to `EventContent`'s
`meta` shape so non-test events can opt into `noindex` without
violating the epic invariant that Madrona is not a test event),
and several documentation surfaces that still describe Madrona
Theme registration as the predecessor `madrona-launch` epic's
M4 phase 4.1 deferred work. Apps/web is unchanged — the existing
[`<ThemeScope>`](/apps/web/src/App.tsx) wraps from the
demo-expansion epic's M1 phase 1.1 inherit Madrona's Theme the
moment the registry maps `madrona` → `madronaTheme`.

## Goal

After this PR:

- `shared/styles/themes/madrona.ts` exists and exports
  `madronaTheme: Theme` with the palette resolved in
  scoping/m1-phase-1-1.md decision 1;
- [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
  registers `"madrona": madronaTheme` so
  [`getThemeForSlug`](/shared/styles/getThemeForSlug.ts) returns
  Madrona's Theme for `slug=madrona` instead of the platform
  Sage Civic fallback;
- `apps/site/events/madrona.ts` exists and exports
  `madronaContent: EventContent` with placeholder content rich
  enough to render every section component
  (`EventHeader`, `EventLineup`, `EventSchedule`, `EventSponsors`,
  `EventFAQ`, `EventCTA`, `EventFooter`) non-degraded;
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  registers the Madrona content module so
  [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx)'s
  `generateStaticParams` and `getEventContentBySlug` pick it up;
- the `EventContent` type carries a new optional
  `meta.robots?: "noindex"` field, and the page route's
  `generateMetadata` honors it alongside the existing
  `testEvent`-driven path so non-test events can opt into
  `noindex` without violating epic invariant 3;
- `madrona.ts`'s `meta.robots` is set to `"noindex"` so
  `/event/madrona` and the `opengraph-image` / `twitter-image`
  routes that share the segment ship `<meta name="robots"
  content="noindex, nofollow">` until the future Madrona-launch
  epic flips it;
- the Madrona logo at
  [`apps/site/public/events/madrona/logo.png`](/apps/site/public/events/madrona/logo.png)
  (committed during scoping) renders on the event header
  alongside `hero.name`;
- doc-currency rewrites land — every `M4 phase 4.1` /
  `M4 phase 4.2` reference that names Madrona Theme registration
  or content authoring as deferred work points at this epic
  instead, and the milestone doc's Phase Status row 1.1 flips
  `Plan-pending` → `Landed` with this PR's number;
- cross-app theme-continuity is captured for `slug=madrona`:
  apps/site `/event/madrona` (PR Vercel preview) and apps/web
  `/event/madrona/game` (also PR Vercel preview, rendering
  against the existing centralized `<ThemeScope>` wrap that
  picks up Madrona's Theme automatically) carry the same Madrona
  palette in side-by-side capture pairs attached to the PR body.

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
  updates are render-when-present (binds phase 1.2; this phase
  ships no section component changes).

**No per-phase additions** beyond what the milestone and epic
already bind. The plan does add one phase-level rule worth
recording for self-review:

- **`meta.robots` extension stays neutral with respect to the
  donation/feedback child epics.** The new optional field
  `meta.robots?: "noindex"` is named for SEO posture, not for
  donation or feedback content shape; epic invariant 2 (no
  foreclosure) is preserved because no donation- or feedback-
  shaped name lives in the field's spelling. Self-review
  confirms the field's value type is the literal string
  `"noindex"` (not a generic `string`, which would invite
  later overload), and the field is placed inside `meta` (which
  is SEO-scoped) rather than at the top level (which is
  content-scoped).

## Naming

- **Madrona Theme literal — `madronaTheme`.** Exported from
  `shared/styles/themes/madrona.ts`; consumed by
  `shared/styles/themes/index.ts` under the registry key
  `"madrona"`.
- **Madrona content literal — `madronaContent`.** Exported from
  `apps/site/events/madrona.ts`; consumed by
  `apps/site/lib/eventContent.ts` under the registry key derived
  from `madronaContent.slug = "madrona"`.
- **Palette table.** The full 27-field palette is the
  scoping/m1-phase-1-1.md decision 1 table.
  Plan-time pixel-exact pinning happens against the committed
  logo at
  [`apps/site/public/events/madrona/logo.png`](/apps/site/public/events/madrona/logo.png);
  if pixel-sampling shifts a hex value by more than `±0x06` per
  channel from the scoping eyeball, the implementer updates the
  scoping table in the same commit and the PR body's
  `## Estimate Deviations` section names the shift with the
  pixel-sampled values as evidence.
- **Madrona logo asset path.** Committed at
  [`apps/site/public/events/madrona/logo.png`](/apps/site/public/events/madrona/logo.png).
  The phase 1.1 plan's `EventHeader` extension references it via
  the public path `/events/madrona/logo.png` (Next.js serves
  `public/` at the URL root; the `events/` subdirectory is the
  path segment).
- **`meta.robots` field.** New optional field on
  `EventContent.meta`; literal-typed as `?: "noindex"` (only
  literal value the field admits in this phase; future
  posture additions go through phase planning, not by widening
  this field's value type ad-hoc).
- **Capture pair set.** Six in-app pairs (3 apps/web event-route
  shells × 2 themes — but for this phase the comparison is
  **warm-cream-default → Madrona** for `slug=madrona` only, not
  cross-event Harvest/Riverside; the demo-expansion epic M1
  phase 1.1 already exercised the multi-theme capture set for
  the test events) reduces to **3 in-app pairs** for the three
  apps/web event-route shells (game, redeem, redemptions) on
  `slug=madrona` only. Plus **2 cross-app pairs**: apps/site
  `/event/madrona` (PR preview) vs. apps/web
  `/event/madrona/game` (PR preview). Plus **1 admin in-app
  pair**: apps/web `/event/madrona/admin` warm-cream → Madrona.
  Total: 6 captures (4 in-app + 2 cross-app), attached to the
  PR body's Validation section with per-pair match-assertion
  sentences.

## Contracts

### Madrona Theme literal contract

`shared/styles/themes/madrona.ts` exports a `madronaTheme: Theme`
that conforms to the
[`Theme` type at shared/styles/types.ts:16-61](/shared/styles/types.ts).
All 27 fields are populated; values come from the
scoping decision 1 palette table
with pixel-exact pinning against the committed logo at
plan-implementation time.

The header docstring follows the precedent of
[`shared/styles/themes/harvest-block-party.ts`](/shared/styles/themes/harvest-block-party.ts):
short paragraph naming the event and its brand inspiration
(Madrona Neighborhood Association's logo; reused on `next/font`
Inter + Fraunces from the apps/site root layout per
[`docs/styling.md`](/docs/styling.md)'s "per-event font selection
is post-epic" framing).

### Theme registry contract

[`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
gains:

- a `madronaTheme` import from `./madrona.ts`;
- a `"madrona": madronaTheme` entry in the `themes` literal,
  inserted alphabetically between `harvest-block-party` and
  `riverside-jam`;
- a header-comment phrasing update so the comment no longer
  implies Madrona registration is pending (the comment already
  references the demo-build epic; the update narrows from
  "adds Madrona at `madrona` in its M1" to a phrasing that
  records the registration as having shipped in this epic's M1
  phase 1.1 — exact wording at edit time against the on-disk
  comment).

The `Record<string, Theme>` shape is unchanged.

### Resolver header-comment contract

[`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts)
header docstring lines 5-16 currently end with "Madrona in M4
phase 4.1) without changing any consumer." The phrase "M4 phase
4.1" rewrites to point at this epic and phase
(`Madrona demo-build epic M1 phase 1.1` is the exact landing
site once this PR merges). The resolver's behavior (
`themes[slug] ?? platformTheme`) is unchanged; the change is
documentation-only on this file.

### `EventContent.meta.robots` contract

[`apps/site/lib/eventContent.ts:32-36`](/apps/site/lib/eventContent.ts)
`meta` field gains one new optional sub-field:

```
meta: {
  title: string;
  description: string;
  openGraphType?: "website" | "article";
  robots?: "noindex";  // ← new
}
```

The literal value type `"noindex"` is deliberate: it is the
only posture this phase admits; future posture additions (e.g.,
`"index, follow, max-snippet:0"`) go through phase planning,
not by widening the field's value type ad-hoc.

The `EventContent` header docstring gains a paragraph naming
the field:

> `meta.robots`, when set to `"noindex"`, instructs the page
> route's `generateMetadata` to emit
> `robots: { index: false, follow: false }` regardless of
> `testEvent`. This lets non-test events opt into `noindex`
> for demo-phase posture without setting `testEvent: true`
> (which carries other consequences — disclaimer banner,
> demo-mode auth bypass eligibility — that demo-mode events
> like Madrona must not adopt; see the
> [Madrona demo-build epic](/docs/plans/epics/madrona-demo-build/epic.md)
> invariant 3).

### `generateMetadata` contract

[`apps/site/app/event/[slug]/page.tsx:69-71`](/apps/site/app/event/[slug]/page.tsx)
currently emits:

```
robots: content.testEvent ? { index: false, follow: false } : undefined,
```

The contract widens to honor `meta.robots`:

```
robots: (content.testEvent || content.meta.robots === "noindex")
  ? { index: false, follow: false }
  : undefined,
```

The header-comment paragraph at lines 35-40 (which currently
describes the `robots: { index: false, follow: false }` ship
condition as "when `content.testEvent === true`") gains a
sentence acknowledging the `meta.robots === "noindex"` path.

The existing `opengraph-image` and `twitter-image` segment-
colocated routes inherit the page's metadata cascade per Next.js
conventions; no edit needed there.

### Madrona content module contract

`apps/site/events/madrona.ts` exports `madronaContent:
EventContent` conforming to the existing shape (no field
extensions in this phase except where the new `meta.robots`
field is set).

Required field values:

- `slug: "madrona"`
- `themeSlug: "madrona"` (matches the registry key — same
  pattern as `harvest-block-party` and `riverside-jam`)
- `testEvent` is **omitted** (not set to `false`) — consistent
  with the convention that the field is set positively only
  for test events, and absent for non-test events. This is the
  testEvent-explicit-vs-omitted decision the scoping doc
  handed off; the plan resolves to **omit**.
- `meta.title`, `meta.description`, `meta.robots: "noindex"`
- `hero.name: "Madrona Music in the Playfield"` (the canonical
  event name per madrona.us); `hero.tagline`, `hero.dates`
  (placeholder three-night-festival range — exact dates picked
  at implementation time against the most recent
  Madrona Music in the Playfield year on madrona.us, with
  `Verified by:` to that source URL); `hero.location`
  ("Madrona Park / Madrona Playfield, Seattle" or similar —
  pinned at implementation time)
- `schedule.days[]` carries three placeholder days, each with
  2-3 placeholder sessions; `performerSlug` cross-references
  the placeholder lineup for at least one session per day so
  the lineup-↔-schedule cross-reference renders
- `lineup[]` carries three placeholder bands with placeholder
  bios, set times referencing the schedule
- `sponsors[]` carries 4-5 placeholder sponsors with
  `logoSrc` pointing at placeholder SVGs colocated in
  `apps/site/public/events/madrona/sponsors/` (paths created
  during implementation; placeholder SVGs are the same
  monochrome shape as the existing test-event sponsor SVGs)
- `faq[]` carries 4-5 placeholder Q&A entries — at minimum
  one entry that explicitly reads as "this is a demo URL,
  not yet live" so the page itself surfaces the demo posture
  alongside the `noindex` meta (mitigating the milestone-doc
  Risk Register entry "Placeholder content reads as a launch
  announcement")
- `cta.label` and `cta.sublabel` set to placeholder strings
  pointing at the future game route (`/event/madrona/game` —
  M2 wires the actual gameplay; phase 1.1's CTA copy is
  placeholder)
- `footer.attribution` carries the standard Neighborly Events
  attribution

The `Verified by:` for the Madrona event-name and date
placeholders is the
[madrona.us "Music in the Playfield" event card](https://madrona.us/wp-content/uploads/2024/02/musicnew-1024x682.png)
referenced in the WebFetch results during scoping; the
implementer re-fetches at implementation time to pin the
canonical placeholder dates against the most current Madrona
'25 or '26 program if visible on madrona.us.

### Content registry contract

[`apps/site/lib/eventContent.ts:73-85`](/apps/site/lib/eventContent.ts)
gains:

- a `madronaContent` import from `../events/madrona.ts`;
- a `[madronaContent.slug]: madronaContent` entry in the
  `eventContentBySlug` literal (same pattern as the existing
  test events; alphabetical order has `harvest-block-party`,
  `madrona`, `riverside-jam`).

The `getEventContentBySlug` and `registeredEventSlugs` exports
are unchanged. The header docstring's reference to "M3 phase
3.2 (second test event) and M4 phase 4.2 (Madrona)" rewrites to
remove the M4 reference and point at this epic and phase.

### Logo placement contract on EventHeader

The Madrona logo at
[`apps/site/public/events/madrona/logo.png`](/apps/site/public/events/madrona/logo.png)
renders on `EventHeader` above the existing `hero.name` text
when the event provides a `meta.logoSrc` field. The shape
extension required:

- `EventContent.meta.logoSrc?: string` — optional path to a
  logo asset in `apps/site/public/`.
- `EventContent.meta.logoAlt?: string` — required when
  `logoSrc` is set (the type system enforces the pair via a
  conditional comment, but the shape uses two optional fields
  with a self-review-walked invariant rather than a complex
  conditional type — simpler for invariant 4's
  render-when-absent check).
- `EventHeader.tsx` consumes both fields when present; renders
  an `<img>` above `hero.name` with `alt` set to `logoAlt`. When
  either field is absent, the existing render output is
  unchanged byte-for-byte (the load-bearing falsifier for
  invariant 4 with `harvest-block-party` and `riverside-jam`
  rendering unchanged).

This is a phase 1.1 shape addition that the scoping decision 3
deviation acknowledges: scoping said "phase 1.1 ships against
the existing `EventContent` shape; phase 1.2 owns the type
extension." The deviation is bounded:
- Two single-field meta-scoped optional additions (`robots`,
  `logoSrc` + `logoAlt`), all under `meta`, all literal-typed
  or string-typed with self-review-walked invariants.
- Not the band/sponsor depth pass that scoping decision 3
  scoped to phase 1.2.
- Justified: the logo asset is committed in this phase
  (decision 2), and not rendering it would mean the demo URL
  shows Madrona's Theme palette without Madrona's brand mark —
  which regresses the visual-distinctness gate the milestone
  doc names load-bearing.

The PR body's `## Estimate Deviations` section names this
deviation explicitly.

## Files to touch

This list is the planner's pre-implementation estimate of the
expected diff shape per AGENTS.md "Plan content is a mix of
rules and estimates"; implementation may revise when a
structural call requires deviating, recorded in the PR body's
`## Estimate Deviations` section.

### New

- `shared/styles/themes/madrona.ts` — Madrona Theme literal
  per Madrona Theme literal contract above.
- `apps/site/events/madrona.ts` — Madrona content module per
  Madrona content module contract above.
- `apps/site/public/events/madrona/sponsors/*.svg` — 4-5
  placeholder sponsor SVGs (monochrome, same shape conventions
  as `apps/site/public/test-events/harvest-block-party/*.svg`);
  exact filenames picked during implementation against the
  placeholder sponsor names chosen for `madronaContent.sponsors`.
- (Already committed during scoping)
  [`apps/site/public/events/madrona/logo.png`](/apps/site/public/events/madrona/logo.png).

### Modify

- [shared/styles/themes/index.ts](/shared/styles/themes/index.ts) —
  Madrona Theme registry entry + comment phrasing update per
  Theme registry contract.
- [shared/styles/getThemeForSlug.ts](/shared/styles/getThemeForSlug.ts) —
  resolver header-comment update per resolver header-comment
  contract.
- [shared/styles/themes/platform.ts](/shared/styles/themes/platform.ts) —
  two header-comment refs to "M4 phase 4.1" rewrite to point at
  this epic and phase.
- [shared/styles/README.md](/shared/styles/README.md) — three
  refs to "M4 phase 4.1" rewrite (lines 7, 74, 88 per current
  grep; re-verify line numbers at edit time).
- [apps/site/lib/eventContent.ts](/apps/site/lib/eventContent.ts) —
  `EventContent.meta.robots` field addition + content registry
  entry + header-comment update per `meta.robots` contract,
  content registry contract, and Doc Currency below.
- [apps/site/lib/eventContent.ts](/apps/site/lib/eventContent.ts) —
  also `meta.logoSrc?: string` + `meta.logoAlt?: string` per
  Logo placement contract.
- [apps/site/components/event/EventHeader.tsx](/apps/site/components/event/EventHeader.tsx) —
  optional `<img>` render above `hero.name` per Logo placement
  contract; preserved render output when `meta.logoSrc` absent.
- [apps/site/app/event/[slug]/page.tsx](/apps/site/app/event/[slug]/page.tsx) —
  `generateMetadata` widening per `generateMetadata` contract;
  header-comment paragraph at lines 35-40 sentence addition.
- [apps/site/events/harvest-block-party.ts](/apps/site/events/harvest-block-party.ts) —
  header comment "Madrona in M4 omits the field" rewrites to
  reference this epic.
- [apps/site/events/riverside-jam.ts](/apps/site/events/riverside-jam.ts) —
  same comment update.
- [docs/styling.md](/docs/styling.md) — line 237 ref to "M4
  phase 4.1" rewrites; "Procedure For Adding A New Theme"
  re-verified by re-reading the procedure section and updating
  any registration-site references that name the predecessor
  epic.
- [docs/architecture.md](/docs/architecture.md) — verify and
  update any registration-site references that name the
  predecessor epic; the line 75 `madrona-launch-day` reference
  is a stable test slug and stays.
- [docs/plans/archive/event-platform-epic.md](/docs/plans/archive/event-platform-epic.md) —
  multiple "M4 phase 4.1" / "M4 phase 4.2" inline refs (8 lines
  surfaced in the grep) re-verified at edit time; some may
  already be cleaned by the epic-creation PR — re-grep
  authoritatively at PR-time.
- [docs/tracking/release-readiness.md](/docs/tracking/release-readiness.md) —
  the milestone-doc Doc Currency map names this file as
  potentially carrying refs; re-grep at PR-time and update any
  surfaced refs.
- [docs/product.md](/docs/product.md) — verify "Initial
  deployment" framing matches what M1 ships (a demo URL, not a
  live launch); update if needed.
- [docs/plans/epics/madrona-demo-build/m1-brand-foundation.md](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md) —
  Phase Status row 1.1: Status `Plan-pending` → `Landed`, PR
  column points at this PR. **Status flip from `Proposed` →
  `Landed` for the milestone doc itself defers to the terminal
  M1 PR per the milestone Doc Currency map** — phase 1.1 is not
  the terminal M1 PR if 1.2 / 1.3 ship after.
- docs/plans/epics/madrona-demo-build/scoping/m1-phase-1-1.md —
  Status `Scoping in progress` → `Absorbed into plan` (or
  similar terminal label); the file deletes in batch with
  sibling scoping docs at the milestone-terminal PR per
  AGENTS.md.
- [docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md](/docs/plans/epics/madrona-demo-build/m1-phase-1-1-plan.md) —
  this plan's Status flips `Proposed` → `Landed` at PR-merge
  time, with the PR number recorded.
- [README.md](/README.md) — re-grep for any "ThemeScope" /
  "warm-cream" / "Madrona-launch" / "M4 phase 4.1" references
  in the capability description; if surfaced, edit. Default
  expectation: no edit needed (per the milestone-doc estimate).

### Intentionally not touched

- [shared/events/testEventAllowlist.ts](/shared/events/testEventAllowlist.ts)
  — `TEST_EVENT_SLUGS` does not gain `madrona` (epic invariant
  3 falsifier check; self-review walks the diff to confirm).
- `apps/web/**` — no apps/web wrap changes; the centralized
  wraps from demo-expansion epic M1 phase 1.1 inherit Madrona's
  Theme automatically.
- `apps/site/components/event/EventLineup.tsx`,
  `EventSponsors.tsx`, `EventSchedule.tsx`, `EventFAQ.tsx`,
  `EventCTA.tsx`, `EventFooter.tsx` — no section component
  changes in this phase. The render-when-present invariant for
  the new band/sponsor depth fields is phase 1.2's scope.
- `apps/site/app/event/[slug]/opengraph-image.tsx` and
  `twitter-image.tsx` — no edits; the segment metadata cascade
  delivers `noindex` automatically per Next.js conventions.
- Test fixtures referencing `madrona-launch-day` as a stable
  real-event slug (`tests/web/demo-mode-bypass-noindex.test.ts`,
  `tests/shared/events/testEventAllowlist.test.ts`,
  `tests/supabase/functions/read-demo-event.test.ts`,
  `tests/e2e/demo-mode-bypass.spec.ts`) — `madrona-launch-day`
  is a deliberately-stable test slug per the CLAUDE.md note;
  no rewrite.
- `docs/plans/archive/redemption-operator-deployed-smoke-plan.md` and
  `docs/plans/test-event-noindex-uniformity*.md` — uses
  `madrona-launch-day` as a stable test slug; no rewrite.
- `docs/plans/archive/**` — landed historical artifacts; do
  not retroactively rewrite.
- Any Supabase migration, Edge Function, or RPC — phase 1.1
  has no SQL or backend-function surface.
- Any test additions or modifications. The phase ships no new
  test fixtures; the existing
  [`tests/site/event-rendering.test.ts`](/tests/site/event-rendering.test.ts)
  (or whichever test file covers the apps/site event pipeline
  per current state) likely picks up Madrona automatically via
  `registeredEventSlugs`. If implementation surfaces that the
  existing test scaffolds explicitly enumerate slugs, the
  enumeration extends; this is an estimate, re-derived at
  implementation time. Per AGENTS.md's "Files to touch is an
  estimate" rule, touching a test file would be recorded as an
  Estimate Deviation, not as a rule violation.

## Execution Steps

This sequence is the planner's pre-implementation estimate of
the expected execution shape per AGENTS.md "Plan content is a
mix of rules and estimates"; the implementer may refine.

1. **Branch hygiene.** Worktree off the current branch
   (`plan/m1-brand-foundation-draft`). Branch rename to a
   semantic slug per the AGENTS.md / memory rule
   "Rename auto-generated worktree branches to a semantic slug"
   — likely `feat/madrona-m1-phase-1-1` or
   `plan/madrona-m1-phase-1-1`.
2. **Baseline validation.** `npm run lint`, `npm run build:web`,
   `npm run build:site` (the site build is required because
   apps/site is touched per memory rule).
3. **Reality-check re-run.** Re-verify every line-number
   citation in
   scoping/m1-phase-1-1.md §Reality-check inputs
   against current code. Pin the palette pixel-exact via
   color-picker pass against
   `apps/site/public/events/madrona/logo.png`. Re-grep for
   stale "M4 phase 4.1" / "M4 phase 4.2" / "madrona-launch
   epic" references and reconcile against the doc-currency map.
4. **Pin canonical placeholder Madrona dates and location.**
   Re-fetch madrona.us's "Music in the Playfield" event card or
   the most recent Madrona event page; record the canonical
   placeholder dates and location in `madronaContent.hero` with
   a `Verified by:` source URL.
5. **Author `shared/styles/themes/madrona.ts`.** Theme literal
   with all 27 fields, header docstring per Madrona Theme
   literal contract.
6. **Wire registry entry.** Edit
   `shared/styles/themes/index.ts` per Theme registry contract.
7. **Source-comment updates.** `getThemeForSlug.ts`,
   `themes/platform.ts`, `shared/styles/README.md` rewrites.
8. **Author `apps/site/events/madrona.ts`.** Content module
   per Madrona content module contract; placeholder sponsor
   SVGs created in `apps/site/public/events/madrona/sponsors/`.
9. **`EventContent` shape additions.** `meta.robots`,
   `meta.logoSrc`, `meta.logoAlt` per the contracts; header
   docstring paragraph addition.
10. **`generateMetadata` widening.** Page route per the
    `generateMetadata` contract; header comment update.
11. **`EventHeader.tsx` logo render.** Per Logo placement
    contract; render-when-present invariant walk against
    `harvest-block-party` and `riverside-jam` (which omit
    `meta.logoSrc`) — both must render byte-for-byte unchanged.
12. **Wire content registry entry.** Edit
    `apps/site/lib/eventContent.ts` per content registry
    contract.
13. **Doc updates.** Per doc-edit contracts: `docs/styling.md`,
    `docs/architecture.md`, `docs/plans/archive/event-platform-epic.md`
    surfaced refs, `docs/tracking/release-readiness.md`,
    `docs/product.md` if needed, harvest/riverside header
    comments, README.md grep verification.
14. **Validation pre-deploy.** `npm run lint` +
    `npm run build:web` + `npm run build:site` confirm green.
15. **Open draft PR.** Vercel produces preview URL on push.
    Mark as draft so review attention is on Validation captures
    first.
16. **Capture pairs.** Six captures total (3 in-app
    warm-cream→Madrona on the apps/web event-route shells, 1
    in-app on the apps/web admin shell, 2 cross-app
    apps/site→apps/web for `slug=madrona`). Each pair carries a
    one-sentence match-assertion in the PR body's Validation
    section. Per the milestone-doc cross-app continuity
    invariant, capture timestamps must be within N minutes of
    the latest deploys (or the procedure carries a build-id
    assertion).
17. **`noindex` falsifier.** `curl -sS <preview-url>/event/madrona | grep -c 'noindex'`
    on the PR's Vercel preview returns ≥1. The same procedure
    against `<preview-url>/event/harvest-block-party` returns
    ≥1 (testEvent path still works) and against any non-test,
    non-`meta.robots` slug returns 0 (the falsifier).
18. **Token-correction triage.** If any in-app capture shows
    visible regression beyond brand-color shift (a component
    reads wrong-bucket; a hard-coded color survives), apply
    one-line `_tokens.scss` / component edits per the
    milestone-doc token-classification invariant. Decisions
    that ripple beyond one-line edits surface as focused
    follow-up backlog items per AGENTS.md "Plan-to-PR
    Completion Gate," and the PR-body Risk Register section
    records the deferral.
19. **Status flips.** Phase Status row 1.1 in the milestone
    doc updates `Plan-pending` → `Landed`; this plan's Status
    flips `Proposed` → `Landed`; the scoping doc's Status
    flips to `Absorbed into plan` (the doc itself stays in the
    repo until the milestone-terminal PR deletes it in batch).
20. **Self-review pass.** Walk the audit set in "Self-Review
    Audits" below; AGENTS.md "Plan-to-PR Completion Gate"
    walk; AGENTS.md "Doc Currency PR Gate" walk; AGENTS.md
    "Estimate Deviations" walk against this plan's
    estimate-shaped sections.
21. **PR ready for review.** Mark out of draft.

If at step 18 the token-correction blast radius blows past the
in-PR threshold, the implementer splits along a 1.1.1 / 1.1.2
seam authorized by the milestone doc's Phase Status table
(estimate-shaped authorization, recorded in the PR body's
Estimate Deviations section).

## Commit Boundaries

Pre-implementation estimate per AGENTS.md "Plan content is a
mix of rules and estimates":

- **Commit 1 — Theme registration + resolver/comment updates.**
  `shared/styles/themes/madrona.ts` (new), `themes/index.ts`,
  `getThemeForSlug.ts`, `themes/platform.ts`, `README.md`
  (shared/styles).
- **Commit 2 — `EventContent` shape additions + page route.**
  `apps/site/lib/eventContent.ts` (type + content registry +
  comment), `apps/site/app/event/[slug]/page.tsx`
  (generateMetadata + comment).
- **Commit 3 — Madrona content module + placeholder sponsor
  SVGs + EventHeader logo render.** `apps/site/events/madrona.ts`
  (new), `apps/site/public/events/madrona/sponsors/*.svg` (new),
  `apps/site/components/event/EventHeader.tsx`,
  `apps/site/events/harvest-block-party.ts` and `riverside-jam.ts`
  (header comment refresh).
- **Commit 4 — Doc updates + Status flips.** `docs/styling.md`,
  `docs/architecture.md`, `docs/plans/archive/event-platform-epic.md`,
  `docs/tracking/release-readiness.md`, `docs/product.md` (if
  needed), `README.md` (if needed),
  `m1-brand-foundation.md` (Phase Status row),
  `m1-phase-1-1-plan.md` (Status flip),
  `scoping/m1-phase-1-1.md` (Status flip).
- **Optional Commit 5+ — review-fix commits.** Per AGENTS.md
  "PR-sized work, name the intended commit boundaries before
  editing when practical, and keep review-fix commits distinct
  when they clarify the history."

The four-commit shape produces clean review chunks: brand
infrastructure (commits 1-2), content (commit 3), narrative
(commit 4). Reviewers can verify each chunk independently.

## Validation Gate

The validation procedure that proves this PR ships its goal:

- **`npm run lint`** — green.
- **`npm run build:web`** — green.
- **`npm run build:site`** — green; the apps/site touch
  requires this gate per the project memory rule "build:site
  whenever apps/site is touched."
- **Manual capture pairs in PR body's Validation section.**
  Six captures: 4 in-app on apps/web (game / redeem /
  redemptions warm-cream → Madrona, plus admin warm-cream →
  Madrona) + 2 cross-app on apps/site `/event/madrona` vs.
  apps/web `/event/madrona/game`. Each carries a one-sentence
  match-assertion. Procedure passes if every assertion is
  observably true; falsifier is "any pair shows the warm-cream
  fallback persisting on `/event/madrona*`, or apps/site and
  apps/web diverge on the same `slug=madrona` URL."
- **`noindex` falsifier (curl).** Three runs against the PR's
  Vercel preview deployment:
  1. `curl -sS <preview-url>/event/madrona | grep -c
     'noindex'` returns ≥1 (positive: Madrona's `meta.robots`
     fires).
  2. `curl -sS <preview-url>/event/harvest-block-party | grep
     -c 'noindex'` returns ≥1 (positive: existing `testEvent`
     path still fires).
  3. `curl -sS <preview-url>/event/<a-non-test-non-madrona-slug-if-one-exists>
     | grep -c 'noindex'` returns 0 (falsifier: non-test,
     non-`meta.robots` events do not noindex). If no such slug
     exists in the registry at PR-time, the implementer
     records "no slug exists to falsify against; falsifier
     covered by the existing test-event-noindex-uniformity
     test fixture's negative case."
- **Plan-to-PR Completion Gate walk.** Every Goal,
  Self-Review audit, Validation step, and Documentation
  Currency entry is satisfied or explicitly deferred-with-
  rationale-in-this-plan before the PR opens.
- **Estimate Deviations callout in PR body.** Per AGENTS.md,
  the PR body names any deviation from this plan's estimate-
  shaped sections (Files to touch, Execution Steps, Commit
  Boundaries) under `## Estimate Deviations`, or `N/A` if
  none. Anticipated deviation: scoping decision 3 said "phase
  1.1 ships against the existing `EventContent` shape; phase
  1.2 owns the type extension," but this plan adds three
  meta-scoped optional fields (`robots`, `logoSrc`, `logoAlt`)
  for noindex enforcement and logo placement. The deviation
  rationale (named in this plan's Logo placement contract and
  the `meta.robots` contract) gets restated in the PR body's
  Estimate Deviations section.

The validation gate does **not** include a Tier 5 post-deploy
production check. The Madrona Theme registration plus
`EventContent` shape addition plus `generateMetadata` widening
plus content module plus EventHeader logo render are all
verifiable against the PR's Vercel preview deployment;
preview-deployment-based verification is the canonical tier per
[`docs/testing-tiers.md`](/docs/testing-tiers.md). Status flips
to `Landed` in this PR.

## Self-Review Audits

Walk the named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
against this PR's diff surfaces. The diff covers:

1. **TypeScript / Edge Function contracts** — `Theme` literal
   conformance (`shared/styles/themes/madrona.ts`),
   `EventContent` shape addition (`apps/site/lib/eventContent.ts`),
   `generateMetadata` widening (page route).
2. **Frontend save paths / lifecycle / async** — none. The
   page route is a Server Component; no save paths, no
   client-side state.
3. **SQL migrations / Edge Functions / runbook** — none.
4. **Operational scripts / CI** — none.
5. **Frontend rendering / structural-classification** —
   `EventHeader` optional logo render; capture pairs verify the
   visual outcome.

The catalog's audits are scoped primarily to SQL / Edge
Function / save-path / lifecycle / CI / runbook surfaces;
**frontend rendering / structural-classification** audits apply
where they exist. The implementer confirms this enumeration
during self-review and records "the catalog audits in scope
for this diff are <list>" in the PR body's Self-Review section,
alongside the milestone-doc-level walks listed below:

- **Epic invariant 1 walk** — no `/series/*` namespace claim,
  no Madrona-specific globals; Madrona Theme registers
  slug-keyed.
- **Epic invariant 2 walk** — `meta.robots`, `meta.logoSrc`,
  `meta.logoAlt` are SEO/presentation-scoped, not band/sponsor-
  scoped; donation/feedback child epic shape door stays open.
- **Epic invariant 3 walk** — `madronaContent.testEvent` is
  omitted (not `false`, not `true`); `TEST_EVENT_SLUGS`
  unchanged; no test-event disclaimer banner code path
  introduced.
- **Epic invariant 4 walk** — `harvest-block-party` and
  `riverside-jam` event pages render byte-for-byte unchanged;
  capture pairs against the test events confirm.
- **Milestone invariant: cross-app theme-continuity** —
  capture pairs confirm.
- **Milestone invariant: `noindex` from phase 1.1 onward** —
  curl falsifier confirms.
- **Milestone invariant: token-classification bucket integrity** —
  capture review surfaces no wrong-bucket tokens, or any
  surfaced are resolved per scoping decision-equivalent in this
  plan's Risk Register.
- **Milestone invariant: render-when-present** — covered by
  invariant 4 walk above.

If any walk surfaces a finding, the implementer fixes it in
this PR (per AGENTS.md "if a reviewer flags a gap that should
have been named at plan time, fix the plan first").

## Documentation Currency PR Gate

This PR satisfies the milestone-doc Documentation Currency map
entries owned by phase 1.1; the file-by-file edit shape is
named in the Files to touch and Contracts sections above. No
doc deferral.

The grep-authority procedure: at PR-time, the implementer runs
`grep -rn "M4 phase 4\.1\|M4 phase 4\.2\|madrona-launch epic\|Madrona-launch epic\|epics/madrona-launch/" --include="*.ts" --include="*.tsx" --include="*.md"`
across the repo and reconciles every surfaced reference. Test
fixtures referencing `madrona-launch-day` (a stable test slug
distinct from the predecessor epic name) are excluded — the
grep filter must not match `madrona-launch-day`. Archive docs
(`docs/plans/archive/**`) are excluded — historical artifacts
do not retroactively rewrite.

## Out Of Scope

Final, not deliberation. Items here are explicitly excluded
from this PR's diff:

- **Real Madrona content authoring.** Bands, sponsors, schedule
  with real names and dates — M3's scope. Phase 1.1 ships
  placeholder content rich enough to render every section
  component non-degraded.
- **Gameplay wiring against `slug=madrona`.** M2's scope.
  Phase 1.1's `madronaContent.cta` points at the future game
  route as placeholder copy.
- **Band / sponsor depth field extensions.** Phase 1.2's scope.
  Phase 1.1 ships only the SEO-scoped `meta.robots` and the
  presentation-scoped `meta.logoSrc` / `meta.logoAlt` shape
  additions, which are bounded and disjoint from band/sponsor
  depth.
- **Apps/web wrapping changes.** Already shipped in
  demo-expansion epic M1 phase 1.1; Madrona inherits.
- **`testEventAllowlist.ts` modifications.** Epic invariant 3.
- **`docs/styling.md` Themable / Structural classification
  table restructuring.** One-line value adjustments in
  `_tokens.scss` ship if surfaced during capture review (per
  the milestone-doc token-classification invariant);
  rule-shape ripples surface as backlog with rationale.
- **Visual-diff tooling (Playwright pixel-diff baselines).**
  Out of scope; manual capture pairs are the validation tier
  per the demo-expansion epic M1 phase 1.1 precedent.
- **Tier 5 in-progress-pending Status pattern.** This phase's
  validation is preview-deployment-based; the Status flips to
  `Landed` directly.
- **Per-event font selection.** Madrona reuses Inter +
  Fraunces from the apps/site root layout per `docs/styling.md`'s
  "per-event font selection is post-epic" framing.
- **Apps/web noindex enforcement.** Apps/web's event-route
  shells render the same Madrona Theme via the inherited
  ThemeScope wraps, but apps/web shells aren't crawlable
  surfaces that need `noindex` (they're behind the SPA route
  shell, not server-rendered HTML); the apps/site
  `/event/madrona` route is the load-bearing crawl surface.
  The future Madrona-launch epic re-evaluates if this changes.
- **Madrona favicon for `/event/madrona`.** Out of scope; the
  apps/site root favicon applies. If the future Madrona-launch
  epic decides Madrona warrants a custom favicon, that's its
  scope.
- **Bringing in the placeholder sponsor logos as real Madrona
  sponsor logos.** M3's scope. The 4-5 placeholder SVGs in
  `apps/site/public/events/madrona/sponsors/` are demo content,
  not real sponsor assets.

## Risk Register

Phase-implementation-level risks not already covered by the
milestone-doc Cross-Phase Risks (which inherit by reference):

- **Pixel-sampled palette diverges materially from eyeball.**
  The scoping doc's eyeball-sampled hex values (`#3F4796`,
  `#E04335`, `#5FB6B0`, etc.) may shift during the
  implementation-time color-picker pass against the committed
  logo PNG. Mitigation: the Naming section above bounds
  acceptable shift to `±0x06` per channel; shifts beyond that
  threshold get recorded in the scoping table update + PR-body
  Estimate Deviations callout. Shifts within threshold update
  the scoping table silently (the table is the canonical
  record).
- **Placeholder sponsor SVGs read as real sponsors.** External
  viewers of the demo URL during M1 see 4-5 placeholder sponsor
  logos in `apps/site/public/events/madrona/sponsors/`.
  Mitigation: at least one `madronaContent.faq` entry
  explicitly says "this is a demo URL; sponsors and bands TBD";
  combined with `noindex` and the demo-sharing model from the
  epic, the risk is bounded. Phase 1.1 implementer picks the
  exact FAQ wording.
- **`generateMetadata` widening regression.** The OR-of-two-
  conditions extension to the existing `robots` ternary could
  silently break the existing `testEvent` path if the boolean
  precedence is wrong or if the parens shift. Mitigation: the
  curl falsifier in the Validation Gate exercises both paths
  (Madrona via `meta.robots`, harvest-block-party via
  `testEvent`) and a non-noindex slug as the negative case;
  the falsifier directly tests both arms of the OR.
- **EventHeader logo render regresses test-event landings.**
  When `EventHeader.tsx` adds the conditional logo render, an
  implementation that places the conditional in the wrong JSX
  tree could shift the `hero.name` rendering position even
  when `meta.logoSrc` is absent (e.g., wrapping `hero.name` in
  a new `<div>` that adds margin via existing CSS). Mitigation:
  the render-when-present invariant walk against
  `harvest-block-party` and `riverside-jam` is the load-bearing
  falsifier; capture pairs of those test events confirm
  byte-for-byte equivalence.
- **Cross-app capture-pair freshness false positive.** Same
  shape as the milestone-doc risk; mitigation inherits. The
  capture procedure includes a build-id assertion or capture
  timestamps within N minutes of the latest deploys.
- **Doc-currency grep miss.** The grep procedure for stale
  "M4 phase 4.x" references runs at PR-time. If new
  references land between plan-time and PR-time, they should
  surface in the grep; if the grep filter accidentally excludes
  a legitimate hit (e.g., a typo in the regex), the reference
  ships stale. Mitigation: the grep procedure is named
  explicitly in this plan; the implementer runs it from a
  clean shell and records the match list in the PR body's
  Documentation Currency section. Reviewer can re-run the
  grep against the PR's branch to falsify.

## Backlog Impact

- **Closes:** nothing in
  [`docs/backlog.md`](/docs/backlog.md). Per the milestone-doc
  Backlog Impact, M1 doesn't close existing backlog entries.
- **Unblocks:** phase 1.2 (`EventContent` band/sponsor depth
  field extensions) — phase 1.1 establishes the registration
  + content-module pattern phase 1.2 extends. M2 (gameplay
  wiring against `slug=madrona`) — phase 1.1 establishes the
  slug as a registered content surface. Future Madrona-launch
  epic — `meta.robots` field provides the seam to flip
  Madrona's `noindex` posture by editing one line in
  `madrona.ts` (not by rewriting any platform code).
- **Opens:**
  - Anticipated: a `docs/backlog.md` entry for the future
    Madrona-launch epic's `noindex` flip mechanism, recording
    that the seam is `madronaContent.meta.robots` (set
    `"noindex"` to keep noindexed; remove the field to make
    indexable).
  - Anticipated: a `docs/backlog.md` entry for replacing
    placeholder sponsor SVGs with real sponsor logos in M3.
    May or may not surface depending on whether the placeholder
    SVG inventory is small enough to absorb into M3's authoring
    pass without backlog tracking.
  - Possible: a token-classification rule-shape follow-up if
    capture review surfaces structural mis-classification
    beyond one-line correction (analogous to demo-expansion
    epic M1 phase 1.1's
    [themescope-derived-shade-cascade.md](/docs/plans/archive/themescope-derived-shade-cascade.md)
    spinout).

## Related Docs

- [`m1-brand-foundation.md`](/docs/plans/epics/madrona-demo-build/m1-brand-foundation.md)
  — parent milestone doc. Owns Cross-Phase Invariants,
  Cross-Phase Risks, Documentation Currency map, Backlog Impact
  this plan binds by reference.
- `scoping/m1-phase-1-1.md`
  — scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the three settled-at-scoping decisions
  (palette, logo commit, phase scope split) absorbed into this
  plan; deletes in batch with sibling scoping docs at the
  milestone-terminal PR.
- [`epic.md`](/docs/plans/epics/madrona-demo-build/epic.md) —
  parent epic. M1 paragraph in Milestone Structure (lines
  213-221), Sizing Summary M1 line, Cross-Cutting Invariants
  this plan binds.
- [`docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md)
  — sibling phase plan; canonical reference for the apps/web
  ThemeScope wrap inheritance, the cross-app capture-pair
  validation pattern, and the token-classification correction
  precedent.
- [`shared/styles/types.ts`](/shared/styles/types.ts) — `Theme`
  type definition; the new `madronaTheme` literal must conform
  to all 27 fields.
- [`shared/styles/themes/harvest-block-party.ts`](/shared/styles/themes/harvest-block-party.ts)
  and
  [`riverside-jam.ts`](/shared/styles/themes/riverside-jam.ts)
  — test-event Theme literals; the new `madrona.ts` mirrors
  the structural shape (header docstring conventions, field
  ordering, `next/font` reuse).
- [`apps/site/events/harvest-block-party.ts`](/apps/site/events/harvest-block-party.ts)
  and
  [`riverside-jam.ts`](/apps/site/events/riverside-jam.ts) —
  test-event content modules; the new `madrona.ts` mirrors
  the structural shape (header docstring, section coverage,
  `EventContent` field population).
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx)
  — page route that this plan widens for `meta.robots`.
- [`apps/site/components/event/EventHeader.tsx`](/apps/site/components/event/EventHeader.tsx)
  — section component this plan extends for the optional logo
  render.
- [`AGENTS.md`](/AGENTS.md) — Plan-to-PR Completion Gate, Doc
  Currency PR Gate, Estimate Deviations callout, "Plan content
  is a mix of rules and estimates."
