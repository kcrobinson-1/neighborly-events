# Scoping — M2 phase 2.1 (apps/site home-page structural rebuild + hero + two-event showcase)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
absorbs into
[m2-home-page-rebuild.md](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md);
durable per-phase content absorbs into
`docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md`.

## Phase summary

Phase 2.1 rebuilds
[apps/site/app/page.tsx](/apps/site/app/page.tsx) from today's
17-line `Open admin workspace` stub into the structural foundation
the rest of M2 plugs sections into: a partner-honest hero and a
two-event showcase that exercises both registered Themes
side-by-side (Harvest pumpkin vs. Riverside teal blue). The PR
introduces the home-page-scoped CSS shell, ships the noindex
metadata the milestone doc requires, and seeds the milestone
doc's Phase Status table with the actually-shipping phase shape.
The Harvest narrative section (2.2) and the role-door entry
points (2.3) are explicitly out of scope and slot into the shell
2.1 lands.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
code citation that proves the load-bearing claim. These
decisions are absorbed into the plan's contract sections and
out-of-scope list during plan-drafting; the deliberation prose
(rejected alternatives) lives here through scoping's transient
lifetime.

### 1. PR shape — single PR, with 2.1.1 / 2.1.2 fallback authorization [Resolved → Option A]

**What was decided.** Whether 2.1 ships as one PR (page rebuild
+ hero + two-event showcase + noindex + shell CSS + Phase Status
seed), as two PRs split along a "structural shell / showcase
exercise" seam, or as three PRs along route / hero / showcase
boundaries.

**Why it mattered.** AGENTS.md "PR-count predictions need a
branch test" requires the phase planning session to re-derive
the milestone-doc estimate against actual scope. The milestone
doc's 3-phase split estimates 2.1 as a single PR but explicitly
authorizes phase planning to revise.

**Options considered.**

1. **Single PR (Option A).** All scope in one change.
2. **Two PRs along a structural / exercise seam (Option B).**
   2.1.1 ships the page rebuild, hero, noindex, and `.home-shell`
   CSS scope (no theme-distinct surface yet — page renders under
   the platform Sage Civic Theme as today). 2.1.2 ships the
   two-event showcase + the multi-theme validation gate.
3. **Three PRs along route / hero / showcase (Option C).**
   2.1.1 ships the route rebuild + noindex; 2.1.2 ships the
   hero; 2.1.3 ships the showcase.

**Pros / cons.**

- *Option A.* Pro: smallest review-overhead total; reviewer sees
  structural intent + visible surface + theme exercise together
  in one render. Aligns with the M1 phase 1.1 single-PR
  precedent. Con: if showcase-card composition surfaces
  unexpected scope tension, the PR grows past branch-test
  thresholds.
- *Option B.* Pro: clean scaffolding / exercise separation. Con:
  2.1.1 ships a hero-only home page with *less* partner-visible
  value than today's stub (the stub at least has an admin CTA;
  hero-only has no link out), introducing a temporary
  navigation regression between merges that "ship in reviewable
  chunks" does not justify.
- *Option C.* Pro: smallest per-PR diff. Con: hero and showcase
  share the same `.home-shell` CSS scope and the same
  page-component composition site; splitting fragments one
  cohesive surface for no review benefit. Inflates milestone
  phase count to 5 against the milestone doc's 3-phase
  estimate.

**Branch-test analysis (per AGENTS.md "PR-count predictions need
a branch test").**

Subsystems touched by Option A:
1. apps/site home-page route
   ([apps/site/app/page.tsx](/apps/site/app/page.tsx) — full
   rebuild from 17 lines).
2. apps/site CSS surface
   ([apps/site/app/globals.css](/apps/site/app/globals.css) or a
   new partial — plan-drafting decides).
3. apps/site home-page components (new
   `apps/site/components/home/` family for hero + showcase + card
   — directory does not exist today;
   [apps/site/components/event/](/apps/site/components/event/) is
   the precedent for the section-per-component organization).
4. apps/site Next.js metadata surface (the home-page route's
   `metadata` export — file-local, not a layout edit).
5. Milestone-doc Phase Status table seed
   ([m2-home-page-rebuild.md](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
   row updates — doc-only).

Five subsystems is at the AGENTS.md ">5 distinct subsystems"
threshold but does not exceed it. LOC: page rebuild is a full
rewrite of a 17-line file (~80–150 lines for hero + showcase
composition); new component family is ~150–250 LOC across 3 files
(HomeHero, TwoEventShowcase, EventShowcaseCard); CSS scope is
~80–150 LOC of new selectors. Total substantive logic plausibly
brushes against the ">300 LOC" threshold but stays in
review-coherent territory because every line is the *same*
surface (the home page) under one composition idiom.

**Came down to.** Whether the showcase exercise is genuinely
review-distinct from the structural rebuild. It is not — the
showcase IS the structural foundation's first visible payoff,
and reviewing the page-component composition idiom together with
the per-event-Themed card it produces is more coherent than
splitting them. The M1 phase 1.1 precedent (wrap diff + visual
proof + doc updates in one PR) carries.

**Resolution.** **Option A (single PR).** The plan binds the
single-PR shape and names the validation gate procedure (one
capture of the home page rendered with both showcase cards
visible, plus the noindex curl falsifier). Status flips Proposed
→ Landed in the single PR per AGENTS.md "Plan-to-PR Completion
Gate."

**Fallback authorization.** If implementation surfaces composition
or scope tension beyond a reasonable in-PR review surface —
operationally defined as >5 component files in the new
`components/home/` directory, or >250 LOC of `.home-shell` CSS,
or the showcase-card component growing a per-event-content shape
distinct from `EventContent` (which would constitute a
content-shape contract violation per the milestone doc's
"Event content shape" Settled-by-default decision and warrants
its own focused review) — the implementer splits along an
Option B seam mid-flight: 2.1.1 ships shell + hero + noindex;
2.1.2 ships the two-event showcase + multi-theme validation
gate. This authorization is named here so the implementer
doesn't relitigate the call under review pressure. The
pre-implementation expectation is one PR; the M1 phase 1.1
precedent puts probability strongly on that side.

**Verified by:**
[apps/site/app/page.tsx](/apps/site/app/page.tsx) (17-line stub
that fully rewrites);
[apps/site/components/event/](/apps/site/components/event/)
(precedent for section-component organization in apps/site —
EventLandingPage composes EventHeader, EventSchedule,
EventLineup, EventSponsors, EventFAQ, EventCTA, EventFooter as
separate component files);
[m1-phase-1-1-plan.md](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md)
(predecessor single-PR shape).

### 2. Two-event showcase rendering shape [Resolved → side-by-side cards on desktop, stacked on narrow viewports]

**What was decided.** Whether the two-event showcase renders as
side-by-side cards on a desktop viewport that stack on mobile,
two stacked rows on every viewport, a tabbed interface (Harvest
tab / Riverside tab), or a featured-secondary asymmetric
arrangement (one prominent card + one smaller).

**Why it mattered.** The milestone doc's "Two-theme exercise on
showcase" Cross-Phase Invariant requires both Themes to be
"visibly distinguishable in the captured validation pair." Any
shape that hides one Theme behind interaction or asymmetrically
privileges one Theme silently regresses the multi-theme rendering
capability the showcase exists to demonstrate.

**Options considered.**

1. **Side-by-side cards on desktop, stacked on narrow viewports
   (responsive grid).** Both Themes visible in one screenful on a
   typical partner-evaluator viewport.
2. **Stacked rows on every viewport.** Vertically verbose; both
   Themes still visible above-the-fold on tall viewports but the
   side-by-side comparison disappears.
3. **Tabbed interface (Harvest tab / Riverside tab).** One
   Theme visible at a time; the other lives behind a click.
4. **Featured-secondary asymmetric.** One card prominent, one
   smaller; implicitly privileges the featured event.

**Pros / cons.**

- *Option 1.* Pro: both Themes co-visible in one frame on
  desktop; the side-by-side comparison IS the multi-theme
  exercise the invariant binds. Con: requires responsive Grid /
  Flexbox shape, one extra layer of selector complexity beyond
  today's flat globals.css.
- *Option 2.* Pro: simplest CSS. Con: a partner scrolling never
  sees both Themes in one frame of attention; weakens the
  visible multi-theme evidence.
- *Option 3.* Pro: handles arbitrarily many events. Con:
  invariant explicitly requires both Themes co-visible; tabs
  hide one behind a click. Also drags in a `'use client'`
  boundary the milestone doc's Framework default flags as
  phase-time-only when interactivity is genuinely needed — it
  isn't here.
- *Option 4.* Pro: differentiates editorial weight. Con: no
  editorial reason to privilege Harvest or Riverside; the epic
  treats them as peer test events.

**Came down to.** Whether the side-by-side comparison is the
load-bearing visual claim the invariant binds. It is — the
"two visibly distinguishable Themes side-by-side" framing is
verbatim from the milestone doc's invariant and the epic's
two-event-showcase paragraph. Stacked rows lose this; tabs lose
this; featured-secondary mischaracterizes it.

**Resolution.** **Option 1.** Side-by-side cards on viewports
≥ 720px (typical breakpoint; plan-drafting confirms exact
threshold against any conventions established in apps/site or
inherits a sensible default), stacking to single column below
that. The validation gate captures the desktop layout (both
themes visible in one frame).

**Verified by:**
[harvest-block-party.ts:30](/shared/styles/themes/harvest-block-party.ts)
(`primary: "#b85c1c"` — pumpkin) vs
[riverside-jam.ts:36](/shared/styles/themes/riverside-jam.ts)
(`primary: "#1f5d72"` — teal-blue): the brand-color contrast is
the visible exercise the side-by-side shape demonstrates.

### 3. Showcase-card link target [Resolved → apps/site `/event/<slug>` (rich event landing)]

**What was decided.** Where each showcase card's primary link
target points: apps/site `/event/<slug>` (the rich event landing
already shipping from event-platform-epic M3 phase 3.1) or
apps/web `/event/<slug>/game` (the attendee gameplay surface
M1 phase 1.1 just added ThemeScope wiring to).

**Options considered.**

1. **apps/site `/event/<slug>` (rich event landing).** Same-app
   navigation; partner sees the full event landing context (hero,
   schedule, lineup, sponsors, FAQ, CTA into game) before
   choosing to enter the gameplay flow.
2. **apps/web `/event/<slug>/game` (attendee gameplay).**
   Cross-app navigation; partner lands directly in the
   attendee-side gameplay shell.
3. **Split CTA per card** (primary link to event landing,
   secondary link to game). Two outbound paths per card.

**Pros / cons.**

- *Option 1.* Pro: matches the natural partner-evaluation funnel
  (event context before gameplay); the rich event landing
  already includes its own CTA into `/event/<slug>/game`
  ([EventCTA.tsx:24](/apps/site/components/event/EventCTA.tsx)),
  so gameplay is one click away; same-app navigation. Con:
  partner makes two clicks to reach the gameplay shell.
- *Option 2.* Pro: shortest path to "what does the platform
  actually do." Con: bypasses the rich event landing
  event-platform-epic M3 invested in; partners arrive at
  `/event/<slug>/game` cold. Triggers the cross-app
  hard-navigation invariant per card (enforceable, but added
  surface).
- *Option 3.* Pro: lets partners choose their depth. Con:
  doubles per-card link surface; turns each card into a small
  navigation menu, weakening the emphatic single-destination
  framing.

**Came down to.** Whether the showcase's job is "introduce the
event" or "demo the gameplay." The milestone doc frames the
showcase as a "preview" that exercises both Themes side-by-side
— a preview of *the events*, not of the gameplay. The rich
event landing is the natural deeper layer; the home-page
showcase card is the surface, the event landing is the depth,
and the gameplay shell is the action. Single-target into the
event landing matches that layering.

**Resolution.** **Option 1.** Each showcase card's primary link
points to apps/site `/event/<slug>` via
[`routes.eventLanding(slug)`](/shared/urls/routes.ts). Same-app
navigation; plan-drafting decides `<Link>` vs `<a>` (`<Link>`
likely the right call for SPA prefetch on a same-app destination,
but the milestone doc's "Cross-app navigation uses hard
navigation" invariant is N/A for this destination). The home
page itself does not link directly to apps/web — partners
funnel through the event landing's existing CTA, which already
hard-navigates to apps/web per
[EventCTA.tsx:7-10](/apps/site/components/event/EventCTA.tsx)'s
source comment.

**Verified by:**
[apps/site/components/event/EventCTA.tsx:24](/apps/site/components/event/EventCTA.tsx)
(existing apps/site → apps/web hard-navigation pattern, which
this resolution intentionally does not duplicate at the home-page
layer);
[shared/urls/routes.ts:25-39](/shared/urls/routes.ts) (the
`routes.eventLanding(slug)` and `routes.game(slug)` builders;
this resolution uses `eventLanding`).

### 4. `featuredGameSlug` treatment on the home page [Resolved → not consumed]

**What was decided.** Whether the home page's hero or showcase
consumes the
[`featuredGameSlug`](/shared/game-config/constants.ts) constant,
picks events directly from
[`registeredEventSlugs`](/apps/site/lib/eventContent.ts), or
hardcodes the slug list.

**Why it mattered.** The milestone doc explicitly named this as
phase-2.1-owned because the constant exists in
`shared/game-config/constants.ts` and could plausibly bind the
home page's "featured event" surface. Phase planning has to
decide whether to reach for it.

**Options considered.**

1. **Do not consume `featuredGameSlug`; pick both Harvest and
   Riverside directly from the apps/site EventContent registry.**
2. **Consume `featuredGameSlug` as the "featured" of the two,
   render the second event in a smaller secondary slot.**
3. **Consume `featuredGameSlug` as the *only* showcased event;
   defer the two-event surface entirely.**

**Pros / cons.**

- *Option 1.* Pro: keeps the home page coupled to the apps/site
  EventContent registry (the milestone doc's "Event content
  shape" default). Con: home page either hardcodes the two
  slugs or filters `registeredEventSlugs` by `testEvent === true`.
- *Option 2.* Con: the constant resolves to `"first-sample"`
  ([shared/game-config/constants.ts:2](/shared/game-config/constants.ts))
  — **not registered** in apps/site's EventContent registry
  (only `harvest-block-party` and `riverside-jam` are per
  [eventContent.ts:82-85](/apps/site/lib/eventContent.ts)). The
  constant exists for apps/web's legacy generic-game routing
  ([apps/web/src/data/games.ts:12](/apps/web/src/data/games.ts)),
  not for the apps/site test-event surface. Coupling the home
  page to it would silently break the moment the apps/web side
  repoints the constant.
- *Option 3.* Con: violates the milestone doc's "Two-theme
  exercise on showcase" Cross-Phase Invariant by definition.

**Came down to.** Whether the `featuredGameSlug` constant is the
right input for an apps/site home page. It is not — its value
points outside the EventContent registry the home page reads
from, and its semantics ("highlight the apps/web sample game")
do not match the home page's purpose ("preview the demo's two
test events").

**Resolution.** **Option 1.** The home page does **not** consume
`featuredGameSlug`. Plan-drafting decides between hardcoding the
two test slugs in the page component vs. deriving them from
`registeredEventSlugs` filtered by `testEvent === true`. Both
approaches are valid; the call rests on whether future test-event
additions (which the epic explicitly defers) want a touchpoint at
the home page or remain home-page-content-decision only. Lean
toward hardcoding the two slugs as the structural call (the
showcase shape is "two events side-by-side," not "all test
events"; a third test event added to the registry should not
silently break the side-by-side layout — it should require an
explicit home-page edit). Plan-drafting confirms.

**Verified by:**
[shared/game-config/constants.ts:2](/shared/game-config/constants.ts)
(`featuredGameSlug = "first-sample"` — value is not a registered
EventContent slug);
[apps/site/lib/eventContent.ts:82-85](/apps/site/lib/eventContent.ts)
(EventContent registry registers only `harvestBlockPartyContent`
and `riversideJamContent`);
[apps/web/src/data/games.ts:12](/apps/web/src/data/games.ts) and
[apps/web/src/lib/setupEvents.ts:19](/apps/web/src/lib/setupEvents.ts)
(apps/web is the actual consumer of the constant).

### 5. Validation procedure for the multi-theme exercise [Resolved → single capture of side-by-side showcase + per-token falsifier check]

**What was decided.** How the plan's Validation Gate exercises
the showcase's two-theme rendering claim.

**Why it mattered.** The milestone doc's "Multi-theme rendering
visible in showcase but broken in practice" Cross-Phase Risk
warns that a showcase card consuming a derived shade like
`var(--primary-surface)` for its background tint will render
warm-cream regardless of the per-event Theme wrapping the card.
The validation procedure has to inspect tokens that **do**
re-evaluate, not derived shades.

**Options considered.**

1. **Single capture of the desktop showcase (both cards
   visible) + a per-card falsifier statement naming which token
   the eyeballed color comes from.** One artifact, one assertion
   pair.
2. **Two captures (one per card rendered in isolation) + a
   side-by-side third capture.** Three artifacts; per-card
   isolation rules out "this Theme appears to apply because of
   sibling-card spillover."
3. **DevTools `getComputedStyle` assertion on each card's brand
   color.** Code-level proof; immune to anti-aliasing /
   font-rendering differences.
4. **Tier 5 post-deploy production walk-through** with a Status
   `In progress pending multi-theme verification` per AGENTS.md
   `docs/testing-tiers.md`.

**Pros / cons.**

- *Option 1.* Pro: matches M1 phase 1.1's capture-pair pattern;
  ThemeScope wraps each card independently (no spillover), so
  one capture suffices; the per-token falsifier closes the
  derived-shade trap. Con: pixel-level inspection is human-
  judgment, but Harvest-pumpkin vs. Riverside-teal-blue is a
  warm-vs-cool hue contrast observable by eye.
- *Option 2.* Con: redundant — the side-by-side capture IS the
  multi-theme exercise; isolated captures add review surface
  without new evidence. M1 phase 1.1's cross-app continuity
  check already established per-Theme correctness in isolation.
- *Option 3.* Con: same trap M1 phase 1.1 rejected (its scoping
  decision 5) — a card with a hard-coded color renders wrong
  despite `--primary` resolving correctly; the visible capture
  is the right artifact for visible-Theme honesty.
- *Option 4.* Con: pure JSX + CSS change with no proxy / CDN /
  runtime variance between preview and prod; AGENTS.md's Tier 5
  examples don't fit pure rendering changes. Validates against
  M1 phase 1.1's same rejection.

**Came down to.** Whether one capture is enough evidence to
falsify the "both Themes apply" claim. It is — the single
desktop capture shows both cards in one frame; if both cards
show the same brand color (warm-cream defaults, or both Harvest,
or both Riverside), the falsifier fires by inspection. The
per-token falsifier statement in the plan body ("each card's
border / accent / button uses `var(--primary)` or `var(--accent)`,
not a derived shade like `var(--primary-surface)`") names exactly
which token's color the reviewer eyeballs.

**Resolution.** **Option 1.** Validation Gate procedure: deploy
the PR (Vercel produces the preview URL automatically); capture
the `/` desktop rendering; attach to the PR. The PR body's
Validation section names the brand-color falsifier ("the two
showcase cards visibly differ in brand color: Harvest pumpkin
`#b85c1c`-family vs. Riverside teal-blue `#1f5d72`-family — a
matching warm-cream rendering across both cards is the falsifier
that the per-event Theme is not applying"). The plan binds the
token-discipline rule for showcase-card components: brand-tied
visual elements (border, button background, eyebrow color) read
`var(--primary)`, `var(--secondary)`, or `var(--accent)`; derived
shades like `var(--primary-surface)` and `var(--secondary-focus)`
are out of scope for the showcase-card brand surface until the
[derived-shade cascade follow-up](/docs/plans/themescope-derived-shade-cascade.md)
lands. Self-review walks each showcase-card brand rule against
this binding.

The validation procedure also doubles as the noindex falsifier
(see decision 6): a `curl -s -L <preview>/ | grep -i robots` that
shows `noindex, nofollow` confirms the metadata emit landed.

**Verified by:**
[harvest-block-party.ts:30](/shared/styles/themes/harvest-block-party.ts)
(`primary: "#b85c1c"`) vs
[riverside-jam.ts:36](/shared/styles/themes/riverside-jam.ts)
(`primary: "#1f5d72"`) — distinct enough hue contrast that
visible-distinction by inspection is reliable;
[m1-phase-1-1.md decision 5](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md)
(predecessor capture-pair pattern; this resolution narrows to a
single capture because cross-app continuity is already
established).

### 6. Noindex implementation shape [Resolved → page-route `metadata.robots`]

**What was decided.** Where the home page's noindex metadata
emit lands: in the home-page route's `metadata` export, in the
root layout (site-wide), in `public/robots.txt`, or via a
client-side `<meta>` injection.

**Came down to.** Route-scoped vs. site-scoped. The epic's
"Internal-partner audience" invariant binds the *home page*, not
the entire apps/site — conflating them at the layout level is a
scope overreach (`/event/<slug>` already ships a `testEvent`-
conditional noindex per
[event/[slug]/page.tsx:69-71](/apps/site/app/event/[slug]/page.tsx),
and future non-test-event apps/site routes such as Madrona's
public landing in a later epic will want to index). `robots.txt`
is a parallel advisory surface (no reason to add another path
when in-HTML metadata is the canonical emit). Client-side
`<meta>` injection would not be applied at fetch time — the
[event/[slug]/page.tsx:35-40](/apps/site/app/event/[slug]/page.tsx)
source comment explicitly warns against this trap.

**Resolution.** **Route-scoped `metadata.robots` on the home-page
route.** Plan-drafting writes the exact emit shape (a one-line
`robots: { index: false, follow: false }` block on the
home-page route's `metadata` export), confirming the cascade
behavior — the home page's `metadata` export only **adds** the
`robots` block to the layout's existing `title` + `metadataBase`
per Next.js' segment-cascade rules. Validation-gate falsifier:
`curl -s -L <preview>/ | grep -i 'name="robots"'` shows
`noindex, nofollow`.

**Verified by:**
[apps/site/app/event/[slug]/page.tsx:35-40](/apps/site/app/event/[slug]/page.tsx)
(source-comment server-rendered emit rationale);
[apps/site/app/event/[slug]/page.tsx:69-71](/apps/site/app/event/[slug]/page.tsx)
(existing route-scoped pattern this mirrors);
[apps/site/app/layout.tsx:100-103](/apps/site/app/layout.tsx)
(root `metadata` confirms no current `robots` emit).

### 7. Page-scoped CSS shell name [Resolved → `.home-shell`]

**What was decided.** The CSS scope class wrapping the rebuilt
home page's content. The milestone doc's "Root layout /
typography / palette" Settled-by-default decision delegates the
exact name to phase 2.1.

**Resolution.** **`.home-shell`.** Mirrors the existing
`.landing-shell` / `.admin-shell` / `.auth-callback-shell`
convention at
[apps/site/app/globals.css:52-149](/apps/site/app/globals.css).
Reusing `.landing-shell` would couple the rebuild to the
shared selectors that group it with sign-in / admin shells,
complicating future divergence. The CSS-organization call
(extend
[globals.css](/apps/site/app/globals.css) in place vs. introduce
a partial) defers to plan-drafting per AGENTS.md "Scoping owns /
plan owns."

**Verified by:**
[apps/site/app/globals.css:52-149](/apps/site/app/globals.css)
(existing `.{name}-shell` convention with shared grouped
selectors).

### 8. Confirm or revise the milestone doc's 3-phase split [Resolved → confirmed; 3-phase split holds]

**What was decided.** Whether the milestone doc's
2.1 / 2.2 / 2.3 phase split is the right shape, or whether
phase planning revises per the milestone doc's named
2-phase-shape (combine 2.1 + 2.3) or 4-phase-shape (split 2.3
per-role) alternatives. AGENTS.md "PR-count predictions need a
branch test" requires the re-derivation.

**Came down to.** Whether the role-door entry points share
enough composition surface with 2.1's hero / showcase to fold
into one PR. They share card-composition shape, but role-door
*content* (auth-state honesty copy per role, the M3-inherited
copy contract) is distinct from the showcase's two-Theme
exercise; combining mixes a "first visible structural surface"
review with a "honesty-copy contract M3 inherits" review.
Separation is the right shape. The 4-phase variant is
unnecessary unless 2.3 surfaces per-role scope tension at its
own planning session.

**Resolution.** **3-phase split confirmed.** 2.1 ships
structural rebuild + hero + showcase; 2.2 ships Harvest
narrative; 2.3 ships role-doors + M2 closure. 2.2 and 2.3 are
mutually independent and may plan-draft in parallel once 2.1
lands per the milestone doc's "Plan-drafting cadence."

Phase 2.1's PR seeds the milestone-doc Phase Status table per
AGENTS.md "Plan-to-PR Completion Gate": the 2.1 row's Plan
column links the plan doc and Status flips from `Plan-pending`
→ `Landed`; 2.2 and 2.3 rows stay `Plan-pending`.

**Verified by:**
[m2-home-page-rebuild.md Phase Status discussion](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone doc names the 2-phase and 4-phase alternatives;
this scoping evaluates and confirms the 3-phase shape).

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they require
reading docs and components against actually-merged code at
plan-time, not against the scoping snapshot:

- **Hero copy direction.** The internal-partner-honesty invariant
  binds the framing; plan-drafting writes the exact words. Likely
  shape: explanation-first ("Neighborly Events is a platform for
  sponsor-friendly neighborhood event games. Today's demo
  surfaces two test events…") with an honesty caveat in the
  same paragraph or a follow-up sub-paragraph naming what is
  real (the rendered event landings, the two registered Themes,
  the platform's authenticated admin) vs. what is stubbed at this
  iteration (no live attendees, no production sponsors,
  test-only data). Plan-drafting reads the epic's
  "Internal-partner audience" invariant and the milestone doc's
  Goal section and writes copy that walks both.
- **Showcase-card component composition.** Plan-drafting decides
  the JSX shape of the per-event showcase card: which fields
  from `EventContent` it consumes (likely `meta.title`,
  `hero.tagline`, `hero.dates`, `hero.location`, the `themeSlug`),
  and which token-discipline rules apply. The card MUST be wrapped
  in `<ThemeScope theme={getThemeForSlug(content.themeSlug)}>` per
  the milestone doc's "Theme resolution reads `content.themeSlug`,
  not the URL slug" Settled-by-default decision; the wrap is the
  per-card scope that lets the two cards render distinct Themes
  side-by-side.
- **Slug list source.** Decision 4 leans toward hardcoding the two
  test slugs in the page component; plan-drafting confirms against
  the actual on-disk
  [eventContent.ts](/apps/site/lib/eventContent.ts)'s registered
  slug count and `testEvent` flag presence. If `registeredEventSlugs`
  filtered by `testEvent === true` happens to resolve to exactly
  Harvest + Riverside today and the architectural pressure favors
  dynamic resolution, plan-drafting may pivot.
- **CSS organization (extend globals.css vs new partial).**
  Decision 7 names `.home-shell` as the scope class but defers
  the organizational call (extend
  [globals.css](/apps/site/app/globals.css) in place vs. introduce
  `apps/site/app/home.css` or similar partial). Plan-drafting
  measures the post-rebuild LOC against the existing
  globals.css's 677 lines and decides; the AGENTS.md guidance on
  partials per surface is the deciding rule.
- **Self-Review Audit set against
  [docs/self-review-catalog.md](/docs/self-review-catalog.md).**
  Plan-drafting walks the catalog against the actual 2.1 diff
  surface. Likely-relevant audits: "Effect cleanup audit" (no —
  page is a server component, no effects); "Rename-aware diff
  classification" (no — no renames); "Cross-app navigation seam
  audit" (yes — the showcase cards link to apps/site
  destinations, but plan-drafting walks every link site
  including any incidental hero-CTA additions); "Token-
  classification audit" (yes — the showcase cards consume
  brand-tied tokens that must respect the derived-shade
  discipline named in decision 5). The audit set may be small;
  that is allowed and named in the plan if so.
- **Validation Gate command list.** Beyond the home-page capture
  and the noindex curl falsifier, the plan names `npm run lint`,
  `npm run build:web`, and any apps/site Playwright suites that
  exercise the home page. Plan-drafting reads `package.json`
  `scripts` and `scripts/testing/` per AGENTS.md "Prefer existing
  wrapper scripts."
- **Commit boundaries.** Likely 2 commits: (1) page rebuild +
  hero + showcase + `.home-shell` CSS + noindex metadata, (2)
  milestone-doc Phase Status seed. Plan-drafting finalizes
  against the actual edit shape; if the showcase component
  family is structurally distinct from the page-route rebuild,
  a 3-commit shape (component family / page composition / doc
  seed) reads more cohesively.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns / plan
owns":

- Status, Context preamble, Goal
- Cross-Cutting Invariants — **references the milestone doc's
  Cross-Phase Invariants** rather than restating; only names
  per-phase additions if any. **No per-phase additions
  anticipated** for 2.1: the 4 milestone-level invariants
  (internal-partner honesty, two-theme exercise on showcase,
  role-door honesty, cross-app navigation hard-nav) all bind
  directly. Role-door honesty is N/A for 2.1 (role doors are 2.3
  scope) but the plan still walks it as a no-op for completeness
  per the milestone doc's "Self-review walks each one against
  every phase's actual changes."
- Naming
- Contracts — names the showcase-card wrap shape (per-card
  `<ThemeScope theme={getThemeForSlug(content.themeSlug)}>`),
  the noindex metadata-emit shape (one-line `metadata.robots`
  block), the showcase-card link contract
  (`routes.eventLanding(slug)`), and the brand-token discipline
  rule from decision 5.
- Files to touch (estimate-labeled per AGENTS.md "Plan content
  is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate
- Self-Review Audits
- Documentation Currency PR Gate — **references the milestone
  doc's Documentation Currency map** for the file list; names
  this PR as the satisfier of the Phase Status seed entry only
  (README, architecture, product currency are the closing-phase's
  burden per the milestone doc).
- Out Of Scope (final)
- Risk Register — **references the milestone doc's Cross-Phase
  Risks** for milestone-level risks; names plan-implementation-
  level risks here. The "Multi-theme rendering visible in
  showcase but broken in practice" milestone-level risk is
  load-bearing for 2.1 specifically; the plan's Risk Register
  refines the milestone-level entry with the brand-token
  discipline rule that mitigates it.
- Backlog Impact — **references the milestone doc's Backlog
  Impact**; this PR opens no new entries by design (the home-page
  visible exercise of the multi-theme capability closes
  incidentally as part of the milestone, not as a separate
  backlog item).

The duplication-reduction discipline above is intentional: the
plan binds milestone-level content by reference, not by
restatement.

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not from
the scoping snapshot, per AGENTS.md "Reality-check gate between
scoping and plan":

- **`apps/site/app/page.tsx` shape unchanged since scoping.** The
  rebuild assumes a 17-line stub. If a sibling PR has touched
  the file (unlikely in M2-pre-2.1 but possible), the rebuild
  starts from whatever is on main.
- **`apps/site/lib/eventContent.ts` registry contains both test
  events with `testEvent: true`.** Plan-drafting greps the
  registered slug list and confirms both Harvest and Riverside
  resolve to `EventContent` with the `testEvent` flag set;
  decision 4's resolution (and decision 5's brand-color
  comparison) depend on both being present and flagged.
- **`shared/styles/themes/` registry contains both per-event
  Themes with the brand-color values cited in decision 5.**
  Plan-drafting re-reads both files; if a theme has been
  recolored, the brand-color falsifier in the validation gate
  needs the new values.
- **`apps/site/app/event/[slug]/page.tsx` `metadata.robots`
  pattern unchanged.** Decision 6's resolution mirrors this
  pattern; if the event-route metadata shape has been refactored
  (e.g., to a shared metadata helper), 2.1 follows whichever
  on-disk pattern is canonical at plan-drafting time.
- **`shared/urls/routes.ts` `eventLanding` builder still
  resolves to apps/site `/event/<slug>`.** Decision 3's
  resolution depends on this destination being same-app; if
  the route table has been retargeted, the cross-app navigation
  invariant flips from N/A to applicable.
- **`apps/site/app/layout.tsx` does not currently emit
  `robots`.** Plan-drafting confirms the layout's `metadata`
  export is unchanged since scoping; if a sibling PR has added
  a layout-level `robots`, decision 6's resolution becomes a
  no-op (or the layout-level rule needs to be backed out).
- **`apps/site/app/globals.css` `.{name}-shell` convention is
  intact.** The `.landing-shell`, `.admin-shell`,
  `.auth-callback-shell` selector grouping at lines 52-149 is
  the convention `.home-shell` mirrors; plan-drafting confirms
  no refactor has restructured the CSS organization in a way
  that makes the new shell class odd-one-out.
- **Color-mix derived-shade cascade behavior in apps/site under
  `<ThemeScope>`.** The same derived-shade-pinning issue
  M1 phase 1.1 ran into in apps/web applies to apps/site
  showcase cards: a card consuming `var(--primary-surface)` for
  background tint will pin to the platform Sage Civic
  derived-shade values regardless of the per-card `<ThemeScope>`
  wrap. The existing apps/site
  [`/event/[slug]`](/apps/site/app/event/[slug]/page.tsx) wrap
  is the existence proof for `--primary` / `--accent` /
  `--secondary` re-evaluation under apps/site `<ThemeScope>`;
  plan-drafting confirms by manual check of the
  `/event/harvest-block-party` rendering at plan-drafting time
  before binding the showcase-card brand-token contract.
- **Next.js metadata cascade behavior on the home-page route.**
  Decision 6 binds that the page's `metadata.robots` block adds
  to the layout's existing `title` + `metadataBase` rather than
  replacing them. Plan-drafting reads the relevant Next.js docs
  in `node_modules/next/dist/docs/` per
  [apps/site/AGENTS.md](/apps/site/AGENTS.md)'s "This is NOT the
  Next.js you know" rule before binding the exact emit shape.

## Related Docs

- [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  parent milestone doc; phase 2.1 row at the Phase Status table.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — parent
  epic; M2 paragraph at lines 199-218.
- [`m1-themescope-wiring.md`](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md) —
  predecessor milestone doc; cross-app theme-continuity already
  satisfied for both test events, so 2.1's validation gate does
  not duplicate that check.
- [`m1-phase-1-1.md`](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md) —
  sibling scoping doc precedent for this scoping's structure
  (PR-shape branch test, capture-pair validation, derived-shade
  trap).
- [`m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md) —
  predecessor plan precedent for the per-phase plan that 2.1's
  drafting produces.
- [`themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md) —
  the M1-surfaced follow-up that frames the derived-shade
  discipline rule decision 5 binds; M2 phase 2.1 does not
  depend on this follow-up landing first.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  predecessor epic; M2 phase 2.3 of *that* epic delivered the
  current `/` stub this phase rebuilds (lines 152-165 + the
  paragraph naming "preserved the demo-overview content").
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-count
  predictions need a branch test," "Scoping owns / plan owns,"
  "Reality-check gate between scoping and plan."
