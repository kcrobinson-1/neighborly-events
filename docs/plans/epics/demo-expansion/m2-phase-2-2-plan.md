# M2 phase 2.2 — end-to-end Harvest narrative section

## Status

Proposed.

## Context

apps/site's home page after [phase 2.1](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
ships two sections — a partner-honest hero and a two-event
showcase exercising both registered Themes side-by-side. A
partner landing on `/` sees what the platform is and what events
exist, but does not see the platform's three-role arc — what an
attendee playing a game experiences, what an organizer authoring
that game does, what a volunteer redeeming prizes does. They
have to assemble that picture themselves by clicking through to
auth-gated surfaces (admin, redemption booth) and being bounced
to a sign-in wall, or by reading code.

This phase ships an end-to-end Harvest narrative section as the
third direct child of `<main className="home-shell">` so a
partner reading the home page top-to-bottom sees the platform's
arc through Harvest as the worked example. The narrative is
descriptive prose grounded in Harvest's existing `EventContent`
data — no screenshots, no illustrations, no live previews per
the milestone doc's "Out-of-band assets" Settled-by-default
decision. Cross-app click-through to live surfaces is the
[role-doors phase (2.3)](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)'s
job; the narrative carries no outbound links of its own.

The change touches one apps/site route file (one-line composition
edit), introduces a new `apps/site/components/home/HarvestNarrative*`
file or files mirroring 2.1's section-per-component convention,
extends `.home-shell`'s CSS surface with a `.home-narrative`
selector group, and updates the milestone-doc Phase Status row.
apps/web is not touched; the theme registry, the resolver, the
auth shape, and the route table are unchanged.

## Goal

Compose a third section — `<HarvestNarrative />` — into
[`apps/site/app/page.tsx`](/apps/site/app/page.tsx) below the
existing `<TwoEventShowcase />`. After this PR:

- the home page presents a three-section partner-evaluator arc
  (hero → showcase → narrative) on `/` that a partner reads
  top-to-bottom without clicking anywhere
- the narrative walks the platform's three-role arc through
  Harvest Block Party as the worked example: attendee plays,
  organizer authors, volunteer redeems
- the narrative section renders under Harvest's Theme via a
  single section-level `<ThemeScope theme={getThemeForSlug(harvestContent.themeSlug)}>`
  wrap, so brand-bearing surfaces inside the section read in
  Harvest's pumpkin family
- per-persona auth-state-honest copy on the organizer and
  volunteer subsections names the magic-link sign-in requirement
  and the M3-pending demo-mode bypass, per the milestone doc's
  "Role-door honesty against current auth state" invariant
- the narrative carries zero outbound links; click-through to
  live surfaces is the role-doors (2.3) and showcase (2.1) job
- the milestone doc's Phase Status table 2.2 row flips
  `Plan-pending` → `Landed` and points at this PR

The PR does not register a new Theme, does not introduce
demo-mode auth bypass, does not touch apps/web, does not ship
the role-door entry points (2.3's scope), and does not consume
`featuredGameSlug`.

## Cross-Cutting Invariants

This phase binds the four milestone-level invariants from
[m2-home-page-rebuild.md §Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
verbatim — internal-partner honesty, two-theme exercise on
showcase, role-door honesty against current auth state, and
cross-app navigation uses hard navigation. **No per-phase
additions.**

Two-theme exercise on showcase is N/A for 2.2's diff (the
showcase shipped in 2.1 unchanged) but self-review walks it as
a no-op against 2.2's CSS extension to confirm no
showcase-section selector is regressed. Cross-app navigation is
N/A by construction (per the no-outbound-links contract below)
but self-review walks every link site in the narrative-section
diff against the rule for completeness. Role-door honesty is
load-bearing for 2.2's per-persona auth caveats.

The plan also inherits the URL contract, theme route scoping,
and theme token discipline invariants from the parent epic and
predecessor epic per the milestone doc's "Inherited from
upstream invariants" paragraph; self-review walks each against
this phase's diff.

## Naming

- **`.home-narrative`** — top-level CSS scope class on the
  narrative section's outer element. Mirrors the existing
  `.home-hero` / `.home-showcase` convention 2.1 introduced at
  [`globals.css:685–849`](/apps/site/app/globals.css). The
  selector is a direct child of `.home-shell` and inherits the
  `.home-shell > section` width-auto-center rule.
- **Persona subsection** — one of three blocks inside
  `.home-narrative` describing what an attendee, organizer, or
  volunteer does. Plan-drafting estimate: each subsection
  carries an eyebrow + heading + 1–2 paragraphs of prose, with
  the auth caveat inline in the persona-action paragraph for
  organizer and volunteer. Implementer refines density during
  copy drafting.
- **Brand-bearing surface (inside the narrative section)** —
  any visible element whose color carries Harvest's Theme
  identity: the section eyebrow, the persona-subsection
  heading underline (if used), or any accent rule on a
  decorative element. These consume `var(--primary)`,
  `var(--secondary)`, `var(--accent)`, or `var(--bg)` per the
  brand-token discipline contract below. Body prose color is
  not brand-bearing — text consumes whatever the platform's
  base text-color rule already provides.
- **Auth caveat** — the one-clause sentence-fragment per
  persona subsection naming the magic-link sign-in requirement
  and the M3-pending demo-mode-bypass state. Lives in the same
  paragraph as the persona-action description, not hoisted to
  a section footer or global note.

## Contracts

### Section-level `<ThemeScope>` wrap shape

The narrative section's outermost component wraps its content in
a single `<ThemeScope>` resolving Harvest's Theme:

```tsx
<ThemeScope theme={getThemeForSlug(harvestBlockPartyContent.themeSlug)}>
  {/* narrative section markup: eyebrow, header, three persona subsections */}
</ThemeScope>
```

The wrap input is `harvestBlockPartyContent.themeSlug`, **not**
the literal slug `"harvest-block-party"`, per the milestone
doc's "Theme resolution reads `content.themeSlug`, not the URL
slug" Settled-by-default decision and the existing
[`event/[slug]/page.tsx:106`](/apps/site/app/event/[slug]/page.tsx)
contract.

A single section-level wrap is load-bearing: per-subsection
wraps would produce identical CSS-variable scope (all three
resolving to Harvest's Theme) at structural-noise cost; a
no-wrap shape would erase the milestone-Goal-level Harvest
framing and render the section under platform Sage Civic Theme
defaults.

### Brand-token discipline (inherited from 2.1)

Inherits from the
[2.1 plan's brand-token discipline contract](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
unchanged: brand-bearing surfaces inside the narrative section
consume `var(--primary)`, `var(--secondary)`, `var(--accent)`,
or `var(--bg)`. They do **not** consume derived shades like
`var(--primary-surface)` or `var(--secondary-focus)`, which
pin to the apps/site `:root` substitution and do not
re-evaluate inside `<ThemeScope>` per the empirical finding at
[`docs/plans/themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md).

### Per-persona auth-honesty copy contract

Each persona subsection's prose treats auth state per the
following per-persona expectations. The exact phrasing is
implementer-drafted; the substantive contract is the auth-gate
acknowledgment, not a specific wording.

- **Attendee subsection — no auth caveat.** Prose describes
  the attendee's gameplay flow without mentioning sign-in.
  Reality-check input: the apps/web gameplay route at
  `routes.game(slug)` → `/event/${slug}/game` is open today
  (no sign-in required). If implementation re-reads
  [`apps/web/src/pages/GameRoutePage.tsx`](/apps/web/src/pages/GameRoutePage.tsx)
  at implementation start and finds a guard has been added,
  the attendee subsection adopts the same auth caveat shape as
  organizer / volunteer, and the implementer records the
  contingency under PR `## Estimate Deviations`.
- **Organizer subsection — auth caveat naming sign-in + M3
  bypass-pending.** Prose describes the organizer's authoring
  flow and includes a one-clause caveat in the same paragraph
  as the action description. Substantive claim: organizer's
  apps/web admin surface
  ([`routes.eventAdmin(slug)`](/shared/urls/routes.ts) →
  `/event/${slug}/admin`) requires a magic-link sign-in today;
  M3 ships demo-mode bypass for test-event slugs that removes
  the gate. Reality-check input:
  [`apps/web/src/pages/EventAdminPage.tsx`](/apps/web/src/pages/EventAdminPage.tsx)
  guards via `useAuthSession()` (current shape: sign-in form
  on unsigned-in state).
- **Volunteer subsection — auth caveat, same shape as
  organizer.** Substantive claim: volunteer's apps/web
  redemption booth at
  [`routes.gameRedeem(slug)`](/shared/urls/routes.ts) →
  `/event/${slug}/game/redeem` requires sign-in today; M3
  unblocks. Reality-check input:
  [`apps/web/src/pages/EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx)
  guards via `useAuthSession()`.

The auth-caveat copy is the contract M3's PR inherits — when
demo-mode bypass for test-event slugs lands, M3's plan-drafting
revises both the organizer and volunteer subsections (and 2.3's
role-doors) in the same change. The plan's Risk Register
inherits the milestone-level "Role-door copy drift between M2
and M3" risk unchanged.

### No-outbound-links contract

The narrative section emits zero outbound `<a href>` /
`<Link href>` elements. Click-through to live surfaces is the
showcase cards' job (2.1, same-app event landing) and the
role-doors' job (2.3, cross-app role surfaces). Self-review
audits the narrative section's diff for any anchor / link
element and confirms zero — a found outbound link is the
falsifier.

This contract scopes the cross-app navigation invariant to a
no-op walk for 2.2: the rule binds, but the diff carries no
links to walk.

### Data-sourcing contract

The narrative component imports Harvest's `EventContent` from
the existing registry by hardcoded slug:

```ts
import { harvestBlockPartyContent } from "@/events/harvest-block-party";
```

(Implementer adopts whatever the existing registry's import
shape is at implementation start.) Concrete grounding facts
referenced in narrative prose — event dates, location, optionally
one schedule or lineup callout — read from
`harvestBlockPartyContent.hero.dates` /
`.hero.location` / etc. so they stay in sync with the registry
the showcase card and rich event landing already consume.
Persona-flow prose (the platform's three-role arc) is hardcoded
in the narrative component because it describes platform-level
behavior, not event-level data.

The component does **not** consume
[`featuredGameSlug`](/shared/game-config/constants.ts) (apps/web
concern, value is `"first-sample"` which is unregistered in
apps/site's EventContent registry per
[`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)),
does **not** filter `registeredEventSlugs` by `testEvent === true`,
and does **not** introduce a parallel home-page-only
event-summary type. Hardcoding the slug is the deliberate call:
the milestone Goal binds the narrative to Harvest specifically;
future test-event additions should require an explicit
home-page edit rather than silently start narrating.

### Phase Status update

The PR updates the milestone-doc Phase Status row for 2.2:

- **Plan** column → relative link to this plan doc
- **Status** column → flips `Plan-pending` → `Landed`
- **PR** column → the PR number for this change

Rows for 2.3 stay `Plan-pending`. The doc-only edit ships in the
doc commit.

## Files to touch

This list is the planner's pre-implementation estimate of the
expected diff shape per AGENTS.md "Plan content is a mix of
rules and estimates"; implementation may revise when a
structural call requires deviating, recorded in the PR body's
`## Estimate Deviations` section.

### New

- `apps/site/components/home/HarvestNarrative.tsx` — server
  component rendering the narrative section. Wraps its content
  in the section-level `<ThemeScope>` per the wrap-shape
  contract; imports `harvestBlockPartyContent` per the
  data-sourcing contract; renders an outer
  `<section className="home-narrative">` containing an eyebrow,
  a section header, and three persona subsections (attendee →
  organizer → volunteer). No props (content is hardcoded copy +
  registry-grounded facts at this iteration). Plan-drafting
  estimate: ~120-220 LOC depending on copy density.
- *(possible)* `apps/site/components/home/NarrativePersona.tsx`
  — server component for one persona subsection if the three
  subsections share enough markup shape to warrant extraction.
  Takes per-persona props: `eyebrow`, `heading`, prose children
  or a content slot, optional `authCaveat` text. Plan-drafting
  estimate: ~30-60 LOC if introduced. The implementer decides
  during copy drafting whether the three subsections share
  enough shape to warrant extraction or whether each persona's
  prose is structurally distinct enough that inline blocks
  inside `HarvestNarrative.tsx` are the cleaner shape. The
  fallback authorization in scoping decision 1 names ">3
  component files for narrative-specific work" as a
  split-trigger threshold.

### Modify

- [`apps/site/app/page.tsx`](/apps/site/app/page.tsx) — adds one
  `import` line for `HarvestNarrative` and one JSX node
  composing it as the third section child of
  `<main className="home-shell">`, after `<HomeHero />` and
  `<TwoEventShowcase />`. Plan-drafting estimate: +2-3 LOC; no
  other change to `metadata` / structure / surrounding JSX. The
  page-route metadata-emit shape from 2.1 is unchanged.
- [`apps/site/app/globals.css`](/apps/site/app/globals.css) —
  extends with a `.home-narrative` selector group plus
  per-persona-subsection rules (likely a `.narrative-persona`
  scope class or similar) and any brand-bearing-surface rules
  (eyebrow color, heading underline if used). Plan-drafting
  estimate: 60-120 LOC. The post-2.1 globals.css extends in
  place per the same minimal-surprise call 2.1 made; if LOC
  overshoots, the implementer may introduce
  `apps/site/app/home.css` as a partial imported by globals.css
  and records the deviation in the PR's `## Estimate
  Deviations` (matches the contingency 2.1's plan named).
- [`docs/plans/epics/demo-expansion/m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
  — Phase Status row 2.2 update per the Phase Status update
  contract above.

### Intentionally not touched

- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) —
  root metadata, the platform-Theme emit on `<html>`, and font
  wiring are unchanged. The home page's `metadata` export
  cascade behavior is 2.1's responsibility and inherited.
- [`apps/site/app/page.tsx`](/apps/site/app/page.tsx)
  `metadata` export — the route-scoped
  `robots: { index: false, follow: false }` 2.1 shipped is
  unchanged. 2.2's modification to page.tsx adds only the
  narrative-section composition; the `metadata` export is left
  alone.
- `apps/site/components/home/HomeHero.tsx`,
  `apps/site/components/home/TwoEventShowcase.tsx`,
  `apps/site/components/home/EventShowcaseCard.tsx` — 2.1's
  components unchanged; the narrative is a sibling section,
  not a refactor of existing surfaces.
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — `EventContent` type and registry unchanged; the narrative
  reads the existing shape.
- `apps/site/events/harvest-block-party.ts` — Harvest content
  unchanged; no fields added.
- `apps/site/components/event/**` — rich event landing
  components unchanged; the narrative does not reuse them.
- `shared/styles/themes/*.ts` — theme registry unchanged.
- [`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts)
  — resolver unchanged; the narrative consumes it via the
  existing export.
- [`shared/urls/routes.ts`](/shared/urls/routes.ts) — route
  table unchanged; the narrative renders no outbound links per
  the no-outbound-links contract, so route builders are not
  consumed even though the auth-caveat reality-checks reference
  the routes by name.
- [`shared/game-config/constants.ts`](/shared/game-config/constants.ts)
  — `featuredGameSlug` left as-is.
- `apps/web/**` — M2 invariant: apps/site-only diff.
- `supabase/**` — out of scope.
- `tests/**` — no test changes; the home page is a server
  component with no interactive surface to e2e at this phase.
  Self-review confirms no existing Playwright suite asserts
  against `/`'s narrative-section markup that would now fail
  (none expected, since the narrative is new).
- `docs/architecture.md`, `docs/product.md`, `README.md` —
  owned by the M2-closing phase per the milestone doc's
  Documentation Currency map; not touched here.

## Execution Steps

This sequence is the planner's pre-implementation estimate of
the expected execution shape per AGENTS.md "Plan content is a
mix of rules and estimates"; the implementer may refine.

1. **Branch hygiene.** Off `main` (clean worktree). Branch name
   follows repo convention `plan/<slug>` — likely
   `plan/m2-phase-2-2-harvest-narrative`.
2. **Baseline validation.** `npm run lint`, `npm run build:site`
   (confirm green pre-edit).
3. **Reality-check re-run.** Re-verify the inputs named in
   [scoping/m2-phase-2-2.md §Reality-check inputs](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md):
   page.tsx post-2.1 shape unchanged; components/home/ family
   unchanged; globals.css `.home-shell` selector group intact;
   eventContent registry has Harvest with `testEvent: true` and
   populated `hero.dates` / `.location`; theme brand-color
   values unchanged; `apps/web` admin / redeem auth-gate
   behavior unchanged (still gated; M3 hasn't landed); apps/web
   gameplay route still open (decision 5 contingency). Manual
   check of the existing `/event/harvest-block-party` rendering
   confirms `var(--primary)` re-evaluates inside `<ThemeScope>`
   to Harvest pumpkin (inherits 2.1's verification — only
   re-run if globals.css derived-shade rules have changed since
   2.1 landed).
4. **Component scaffolds.** Create
   `apps/site/components/home/HarvestNarrative.tsx` with the
   skeleton export + section structure (eyebrow placeholder,
   header placeholder, three persona placeholders) so the
   page.tsx import resolves before copy drafting.
5. **Page wire-up.** Add the `import` and JSX node to
   [`apps/site/app/page.tsx`](/apps/site/app/page.tsx); confirm
   the page composes hero + showcase + narrative with
   `npm run build:site`.
6. **Narrative copy drafting.** Draft the section header and
   the three persona subsections' prose against the
   [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
   invariant. Per persona: eyebrow, heading, 1–2 paragraphs.
   Organizer and volunteer paragraphs include the auth caveat
   inline per the per-persona auth-honesty copy contract.
   Grounding facts (event dates / location / optional schedule
   or lineup callout) read from `harvestBlockPartyContent`
   per the data-sourcing contract.
7. **Per-persona extraction decision.** If during copy drafting
   the three persona subsections share enough markup shape, the
   implementer extracts a `NarrativePersona.tsx` component;
   otherwise inline blocks stay in `HarvestNarrative.tsx`. Plan-
   drafting prefers no extraction unless markup shape genuinely
   recurs. Implementer records the choice in the PR.
8. **CSS.** Add `.home-narrative` and per-persona-subsection
   selectors to
   [`globals.css`](/apps/site/app/globals.css). The
   `.home-shell > section` width rule from 2.1 covers
   width-auto-centering; `.home-narrative` adds internal grid
   gap, persona-subsection spacing, eyebrow styling, and any
   brand-bearing-surface rules (consuming brand-tied tokens
   only per the brand-token discipline contract).
9. **Pre-deploy validation.** `npm run lint`, `npm run build:site`,
   `npm run build:web` confirm green.
10. **Open draft PR.** Vercel produces the apps/site preview
    URL on push.
11. **Capture set (per Validation Gate below).** Three
    captures: narrative-section close-up (desktop), cumulative
    full-page (desktop), narrow-viewport cumulative. All
    attach to PR body's Validation section.
12. **Doc commit.** Update milestone-doc Phase Status row per
    the Phase Status update contract.
13. **Self-review walk.** Walk the audits below against the
    actual diff before marking the PR ready.

## Commit Boundaries

Pre-implementation estimate per AGENTS.md "Plan content is a
mix of rules and estimates":

- **Commit 1 — narrative component(s) + page wire-up + CSS.**
  `apps/site/components/home/HarvestNarrative.tsx` (and
  optionally `NarrativePersona.tsx`),
  `apps/site/app/page.tsx` composition addition,
  `apps/site/app/globals.css` extension. Ships the visible
  structural change cohesively.
- **Commit 2 — milestone-doc Phase Status update.**
  `docs/plans/epics/demo-expansion/m2-home-page-rebuild.md` row
  update. Doc-only, separable from the code review.
- **Optional Commit 3+ — review-fix commits.** Per AGENTS.md,
  review-fix commits stay distinct when they clarify history.

If component scope grows beyond the estimate (per scoping
decision 1's fallback authorization — >3 component files for
narrative-specific work, cumulative home page exceeding ~5
viewport heights at desktop, or persona-copy-honesty review
pressure across more than two rounds), the implementer splits
into 2.2.1 / 2.2.2 mid-flight along the
narrative-skeleton / persona-content seam (skeleton + attendee
in 2.2.1, organizer + volunteer in 2.2.2 with the M3-inherited
auth-honesty copy contract) and records the deviation.

## Validation Gate

The validation procedure that proves this PR ships its goal:

- `npm run lint` — green.
- `npm run build:site` — green; the rebuilt route compiles, no
  new TypeScript errors, no metadata-cascade warnings from
  Next.js.
- `npm run build:web` — green per the PR-template default; the
  diff does not touch apps/web but the build runs as a
  regression guard.
- **Narrative-section close-up capture (desktop) in PR body's
  Validation section.** One desktop-viewport screenshot scoped
  to the narrative section showing the Harvest-themed rendering
  and the three persona subsections with their auth-honesty
  caveats visible. The PR body names the brand-color falsifier:
  *"the narrative section's brand-bearing surfaces (eyebrow,
  persona-heading underline, accent rules) read in Harvest's
  pumpkin family
  ([`#b85c1c`](/shared/styles/themes/harvest-block-party.ts)
  and warm-shade derivations from `--primary`); rendering in
  warm-cream defaults — or in any other registered Theme — is
  the falsifier that the section-level `<ThemeScope>` wrap is
  not applying."*
- **Cumulative full-page capture (desktop) in PR body's
  Validation section.** One desktop-viewport screenshot of `/`
  at full scroll height (or stitched if a single capture cannot
  capture the full scroll) showing hero + showcase + narrative
  cohesively. Renders the post-2.2 page-length consequence per
  AGENTS.md "Bans on surface require rendering the consequence"
  for the milestone-level "Page-length sprawl" risk. The PR
  body names the page-length sprawl falsifier:
  *"the cumulative home page after 2.2 reads as a coherent
  three-section partner-evaluator surface; a page that scrolls
  past ~5 viewport heights on desktop or that buries the
  narrative below excessive showcase-section padding is the
  sprawl falsifier."*
- **Narrow-viewport cumulative capture in PR body's Validation
  section.** One narrow-viewport screenshot of `/` (≤480px,
  matching 2.1's narrow-viewport pattern) showing the narrative
  section reflows correctly: persona subsections stack into a
  single column readability; no overflow; auth-honesty caveats
  remain legible. The narrow-viewport falsifier:
  *"persona subsections remain side-by-side at narrow width
  (responsive contract regression), or any subsection overflows
  the viewport, or the auth caveats are clipped or unreadable."*
- **Per-persona auth-honesty self-review walk.** Self-review
  walks each persona subsection's copy against the
  [`Role-door honesty against current auth state`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
  invariant per the per-persona auth-honesty copy contract:
  attendee subsection has no auth caveat (gameplay open today);
  organizer subsection names sign-in + M3-pending; volunteer
  subsection names sign-in + M3-pending.
- **Internal-partner-honesty self-review walk.** Self-review
  walks every sentence of narrative prose against the
  [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
  invariant. No marketing-style aspirational copy
  ("the all-in-one platform for…") that overpromises against
  what M1–M3 actually deliver.
- **No-outbound-links audit.** Self-review confirms zero
  outbound `<a href>` / `<Link href>` in the narrative
  section's diff per the no-outbound-links contract. A grep of
  the new component(s) for `href=` returning zero results is
  the falsifier check.
- **Plan-to-PR Completion Gate walk.** Every Goal, Self-Review
  audit, Validation step, and Documentation Currency entry is
  satisfied or explicitly deferred-with-rationale-in-this-plan
  before the PR opens.
- **Estimate Deviations callout in PR body.** Per AGENTS.md,
  the PR body names any deviation from this plan's
  estimate-shaped sections (Files to touch, Execution Steps,
  Commit Boundaries) under `## Estimate Deviations`, or `N/A`
  if none.

The validation gate does **not** include a Tier 5 post-deploy
production check (same rationale as 2.1: pure JSX + CSS +
content-copy change with no proxy / CDN / runtime variance
between preview and prod). Status flips to `Landed` in this PR.

The validation gate does **not** include a noindex curl
falsifier (2.1 already ships the route-scoped
`metadata.robots`; 2.2 does not modify the metadata-emit shape
per the Files-intentionally-not-touched list).

## Self-Review Audits

Walk the named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
against this PR's diff surfaces. The diff covers four surfaces
— apps/site component family addition (server JSX), apps/site
route composition edit (1-line addition), apps/site CSS
extension, and milestone-doc prose — none of which involve SQL
migrations, Edge Functions, async / lifecycle code, save paths,
or operational scripts. The catalog's audits are scoped to
those concerns; **none** apply.

The implementer confirms this enumeration during self-review
and records "no catalog audits apply to this diff surface" in
the PR body's Self-Review section, alongside the milestone-doc-
level sanity walks listed below:

- **Internal-partner honesty invariant.** Narrative prose
  walked against the epic's
  [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
  invariant. No marketing-style aspirational copy
  ("the all-in-one platform for…"); explanation-first framing
  with honest acknowledgment of auth-gated targets per the
  per-persona auth-honesty copy contract.
- **Two-theme exercise on showcase invariant (no-op walk).**
  2.2's diff does not touch
  [`apps/site/components/home/EventShowcaseCard.tsx`](/apps/site/components/home/EventShowcaseCard.tsx),
  [`apps/site/components/home/TwoEventShowcase.tsx`](/apps/site/components/home/TwoEventShowcase.tsx),
  or the showcase CSS rules; self-review confirms by greping
  the diff for `EventShowcaseCard` and `home-showcase` and
  finding zero changes outside the expected files.
- **Role-door honesty invariant.** Per-persona auth-honesty
  copy walk per the per-persona auth-honesty copy contract:
  attendee subsection (no caveat, contingent on gameplay route
  remaining open per reality-check); organizer subsection
  (caveat names sign-in + M3 bypass-pending); volunteer
  subsection (same shape).
- **Cross-app navigation invariant (no-op walk).** Self-review
  greps the new component(s) for `href=` and `<Link` and
  confirms zero outbound links per the no-outbound-links
  contract. The narrative section's only "outbound" surface is
  conceptual (the auth caveats reference apps/web routes by
  name in prose, not as markup links).
- **Brand-token discipline.** Every brand-bearing-surface
  style rule reads `var(--primary)`, `var(--secondary)`,
  `var(--accent)`, or `var(--bg)`; no `var(--primary-surface)`
  / `var(--secondary-focus)` / `var(--*-shade)` on
  brand-bearing surfaces. Greping the new globals.css block
  for `--primary-surface`, `--secondary-focus`, `--accent-shade`
  and confirming no matches inside `.home-narrative` selectors
  is the falsifier check.
- **Theme route scoping invariant.** `<ThemeScope>` wrap lands
  at the narrative-section level (per the wrap-shape contract),
  not at the page-`<main>` level; the rest of the home page
  renders against the platform Sage Civic Theme set on
  `<html>` by [`layout.tsx:127-128`](/apps/site/app/layout.tsx).
- **Server-component-only check.** No `'use client'` directive
  in any new file; the narrative is server-rendered end-to-end.
  No `useEffect` / `useState` / event handlers; no Request-time
  APIs (`cookies()`, `headers()`, `searchParams`) that would
  flip the route from SSG to SSR.
- **Page-length sprawl walk.** The cumulative home-page
  capture (per Validation Gate) renders the consequence;
  self-review confirms the post-2.2 page reads as a coherent
  three-section partner-evaluator surface and is not a
  scroll-tax document.

If any walk surfaces a finding, the implementer fixes it in
this PR (per AGENTS.md "if a reviewer flags a gap that should
have been named at plan time, fix the plan first").

## Documentation Currency PR Gate

Reference:
[m2-home-page-rebuild.md §Documentation Currency](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md).

This PR satisfies the **Phase Status update** entry only. The
README, architecture.md, and product.md entries are owned by
the M2-closing phase (2.3) per the milestone doc; this PR
explicitly defers them with rationale recorded here.

The milestone-doc Phase Status table row for 2.2 ships in the
doc commit per the Phase Status update contract.

## Out Of Scope

Final, not deliberation. Items here are explicitly excluded
from this PR's diff:

- The three role-door entry points and their auth-state-honest
  copy (2.3's scope).
- Demo-mode auth bypass for test-event slugs (M3's scope).
- Madrona Theme registration (future Madrona-launch epic).
- README, architecture.md, and product.md updates (M2-closing
  phase per the milestone doc).
- Out-of-band assets (icons, illustrations, images, videos).
  The milestone doc's "Out-of-band assets" Settled-by-default
  decision defers asset additions; the narrative is
  text-and-color first per scoping decision 4.
- Visual-diff tooling (Playwright pixel-diff baselines).
  Rejected in scoping decision 10 for the same reason as 2.1.
- Tier 5 in-progress-pending Status pattern. Rejected in
  scoping decision 10; this PR flips to `Landed` directly.
- Any apps/web change. The milestone doc's apps/site-only
  scope guard binds.
- E2E test additions. The narrative has no interactive
  surface warranting Playwright coverage at this phase.
- `featuredGameSlug` consumption. Rejected in scoping
  decision 9 (mirrors 2.1's rejection — constant is
  unregistered in apps/site's content registry).
- Reading from `registeredEventSlugs` filtered by `testEvent`.
  Rejected in scoping decision 9 in favor of hardcoding the
  Harvest slug.
- Outbound `<a href>` / `<Link href>` in the narrative section.
  Rejected in scoping decision 6; click-through is the
  showcase / role-doors job.
- Per-persona Theme variation (different Theme per persona).
  Rejected in scoping decision 7; one section-level Harvest
  Theme wrap.
- Sub-route shape for the narrative (`/tour/harvest`).
  Rejected in scoping decision 2 in favor of in-page section.
- Screenshots / illustrations / live-preview iframes per
  persona. Rejected in scoping decision 4.
- New `EventContent` fields. Rejected in scoping decision 8;
  the narrative grounds on existing fields only.
- Modifications to 2.1's components or to the page-route
  `metadata.robots` emit. Out of scope per
  Files-intentionally-not-touched.

## Risk Register

Reference:
[m2-home-page-rebuild.md §Cross-Phase Risks](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
for milestone-level risks (role-door copy drift M2↔M3,
cross-app navigation `<Link>` reflexes, page-length sprawl,
multi-theme visible-but-broken, demo-overview content loss).

The "Page-length sprawl" milestone-level risk is load-bearing
for 2.2 specifically; this plan's Validation Gate's cumulative
full-page capture renders the consequence per AGENTS.md "Bans
on surface require rendering the consequence." If the
cumulative capture surfaces a sprawl finding, the implementer
addresses it in this PR (likely by tightening copy density or
section padding) rather than deferring.

Plan-implementation-level risks not already covered:

- **Auth-caveat copy drift between narrative and role-doors
  before 2.3 lands.** Decision 5 names the substantive auth
  claim that the narrative's per-persona caveats and 2.3's
  role-door copy must agree on. If 2.2 lands before 2.3 starts
  drafting, 2.3's planning session inherits the narrative's
  caveat phrasing as the contract; if 2.2 and 2.3 plan-draft in
  parallel, cross-phase coordination at plan-drafting time
  confirms agreement. Mitigation: scoping doc's Cross-phase
  coordination section names the expectation; 2.3's planning
  session inherits it.
- **Brand-token discipline drift in narrative-section CSS.**
  Same trap as 2.1: a CSS rule consuming `var(--primary-surface)`
  on a brand-bearing surface pins to warm-cream regardless of
  the section-level `<ThemeScope>` wrap. Mitigation: the
  brand-token discipline contract above names the rule (by
  reference to 2.1's contract); the self-review audit grep
  confirms no derived-shade tokens appear in `.home-narrative`
  selectors; the narrative-section close-up capture is the
  observable falsifier.
- **Persona-copy honesty drift.** "Honest about what is real
  vs. stubbed" is a copy-craft task, not a code rule. The
  implementer drafts the exact persona prose against the
  invariant; reviewers can challenge specific phrasings.
  Mitigation: self-review walks every sentence against the
  [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
  invariant; if any sentence reads as marketing aspiration,
  it rewrites in the same PR. The fallback authorization in
  Commit Boundaries names ">2 rounds of copy-honesty review
  pressure" as a split-trigger threshold so the implementer
  doesn't relitigate the call indefinitely.
- **Component-family scope growth.** One narrative file is
  the estimate; the implementer may extract a
  `NarrativePersona` shared component if the three subsections
  share enough markup shape. Mitigation: scoping decision 1's
  fallback authorization names the 2.2.1 / 2.2.2 split if
  scope grows past three new component files for
  narrative-specific work; the implementer records any
  deviation in `## Estimate Deviations`.
- **CSS organization growth.** The estimate is to extend
  [`globals.css`](/apps/site/app/globals.css) in place; if
  `.home-narrative` selectors push globals.css past a
  comfortable size, the implementer may introduce a partial.
  Mitigation: same as 2.1's Risk Register entry — apps/site
  has no current partial-import precedent in globals.css, so a
  partial is a structural deviation worth recording in
  `## Estimate Deviations`.
- **Reality-check input drift between scoping and
  implementation start.** Auth-gate behavior on apps/web admin
  / redeem / gameplay routes can change between scoping and
  implementation. Mitigation: execution step 3 re-runs the
  reality-check at implementation start; decision 5's
  contingencies name the response if any auth state has shifted.

## Backlog Impact

Reference:
[m2-home-page-rebuild.md §Backlog Impact](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md).
This PR satisfies no milestone-level closure on its own; the
home-page-rebuild capability closes when the full M2 set lands
(2.1 + 2.2 + 2.3). M2's milestone-level Backlog Impact map binds
unchanged. No phase-level additions opened by this PR.

If implementation surfaces new follow-up entries (post-MVP
features like richer narrative interactivity, additional
persona depth, screenshots / illustrations as a future
deliverable, etc.), the implementer adds them to
[`docs/backlog.md`](/docs/backlog.md) per AGENTS.md "Feature-
Time Cleanup And Refactor Debt Capture" and records the
addition in the PR body.

## Related Docs

- [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  parent milestone doc. Owns Cross-Phase Invariants,
  Documentation Currency map, Cross-Phase Risks, and Backlog
  Impact this plan binds by reference.
- [`scoping/m2-phase-2-2.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md)
  — scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the ten scoping decisions absorbed
  above; deletes in batch with sibling scoping docs at the
  milestone-terminal PR.
- [`m2-phase-2-1-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
  — predecessor plan. Provides the `.home-shell` foundation
  this phase plugs into, the section-component composition
  idiom this phase mirrors, the brand-token discipline contract
  this phase inherits by reference, and the capture-pair
  validation pattern this phase extends.
- [`scoping/m2-phase-2-1.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md)
  — predecessor scoping doc. Records the section-composition
  pattern, the per-card `<ThemeScope>` wrap (this phase scopes
  one wrap to the section instead), and the responsive-grid
  capture pattern.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — parent
  epic. M2 paragraph at lines 199-218.
- [`m1-themescope-wiring.md`](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md)
  — predecessor milestone doc. M1 supplied the apps/web
  ThemeScope wiring the narrative's organizer / volunteer
  subsections reference contextually (the auth-gated apps/web
  surfaces M1 themed).
- [`themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md)
  — follow-up that frames the derived-shade discipline rule
  the brand-token discipline contract above binds by reference.
  M2 phase 2.2 does not depend on this follow-up landing first.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  — predecessor epic. Delivered the apps/web admin / redeem /
  gameplay surfaces the narrative's persona subsections
  reference.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx)
  — precedent for `<ThemeScope>` wrap consuming
  `content.themeSlug` (line 106) — the narrative's
  section-level wrap mirrors this resolver-uniformity pattern
  at broader scope.
- [`apps/site/CLAUDE.md`](/apps/site/CLAUDE.md) and
  [`apps/site/AGENTS.md`](/apps/site/AGENTS.md) — "This is NOT
  the Next.js you know." Implementation reads relevant
  Next.js docs in `node_modules/next/dist/docs/` if the
  narrative surfaces any Next.js-specific API uncertainty
  (none anticipated for a server component composing existing
  components).
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, Plan-to-PR
  Completion Gate, Doc Currency PR Gate, Bans on surface
  require rendering the consequence.
