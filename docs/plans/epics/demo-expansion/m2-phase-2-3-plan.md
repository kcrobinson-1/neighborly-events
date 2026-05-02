# M2 phase 2.3 — apps/site home-page role-door entry points + M2 closure

## Status

Proposed.

## Context

apps/site's home page after [phase 2.1](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
ships hero + two-event showcase + noindex; after
[phase 2.2](/docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md)
adds the end-to-end Harvest narrative as a third section. A
partner reading the home page top-to-bottom sees what the
platform is, sees the two test events with theme-distinct
previews, and sees the platform's three-role arc (attendee →
organizer → volunteer) through Harvest as the worked example —
but cannot click through from the home page directly into any of
the three role-shaped surfaces in apps/web. The role-shaped
surfaces (gameplay shell, per-event admin authoring, volunteer
redemption booth) live behind apps/web URLs that are reachable
only by typing the URL or clicking the rich-event-landing CTA
two layers in.

This phase closes the M2 milestone with two changes that ship in
the same PR. First: a fourth direct-child section under
`<main className="home-shell">` housing three "role-door" entry
points (Attendee / Organizer / Volunteer), each a card with
copy that honestly names the auth state of its target and a
single hard-navigation `<a href>` that crosses into apps/web.
Second: M2 closure work — README + architecture + product
currency updates so they describe the post-M2 home-page surface
inventory; Phase Status table 2.3 row flip; milestone doc
top-level Status flip `Proposed` → `Landed`; epic Milestone
Status table M2 row flip `Proposed` → `Landed`; batch deletion
of the three transient scoping docs (2.1 / 2.2 / 2.3) per the
milestone-terminal cleanup rule.

The role-door section renders under the apps/site root layout's
platform Sage Civic Theme (no per-section `<ThemeScope>` wrap)
per scoping decision 10. The role-door cards consume no per-
event Themes; the persona-as-platform-concept framing decision 6
locks is the editorial point. Brand-color rhythm across the
post-M2 home page is intentional: hero (platform) → showcase
(mixed per-card per-event Themes) → narrative (single Harvest
section wrap) → role-doors (platform). M3 inherits the
auth-state honesty copy contract this phase ships and revises
the Organizer + Volunteer caveats when the test-event demo-mode
bypass lands; Attendee copy is unchanged.

The change touches one apps/site route file (one-line append to
the existing `<main>` composition), introduces two new files in
the `apps/site/components/home/` family (`RoleDoors.tsx` section
wrapper + shared `RoleDoorCard.tsx` instantiated three times),
extends the apps/site CSS surface under `.home-roles*` selectors
in the existing `.home-shell` scope, updates README +
architecture + product currency paragraphs that describe the
home-page surface, flips three Status entries (milestone-doc
Phase Status row + milestone-doc top-level Status + epic
Milestone Status table), and deletes the three scoping docs.
apps/web is not touched; the three role-door targets are
existing apps/web routes ([`/event/:slug/game`](/apps/web/src/pages/GamePage.tsx),
[`/event/:slug/admin`](/apps/web/src/pages/EventAdminPage.tsx),
[`/event/:slug/game/redeem`](/apps/web/src/pages/EventRedeemPage.tsx))
that the role-doors hard-navigate to via the apps/web Vercel
rewrite layer.

**Parallelism vs M2-closer responsibility.** Per
[m2-home-page-rebuild.md §Sequencing](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md),
2.2 and 2.3 are independent of each other in implementation
work — neither phase touches the other's files or CSS scope —
so plan-drafting and the implementation work itself may proceed
on parallel branches if separate attention is available. **PR/
merge order is constrained, however**: this plan binds 2.3 as
the M2-closing PR, which means 2.3's PR opens only after 2.2 has
merged to main. The constraint is the closer commitment (a
milestone-doc design call), not a technical dependency: 2.3
could implement against an apps/site main that doesn't yet
include 2.2's narrative section — the role-doors would still
work — but the cumulative-page validation capture and the
"M2 is complete" framing both depend on 2.2 having already
landed. If product pressure ever requires 2.3 to ship before
2.2, the closer responsibility transfers to whichever phase
ships last via a plan revision in the same PR (not informally);
plan-time expectation is the recommended order holds.

## Goal

Add the three role-door entry points and close the M2 milestone.
After this PR:

- the home page renders a fourth section after the Harvest
  narrative containing three role-door cards (Attendee /
  Organizer / Volunteer) in a responsive 3-column grid that
  stacks single-column on narrow viewports
- the Attendee card copy says "Play the demo" (or equivalent)
  with no auth caveat; its primary link hard-navigates to
  `routes.game("harvest-block-party")` (apps/web, public route)
- the Organizer card copy names the magic-link sign-in
  requirement and the M3-bypass-pending state; its primary link
  hard-navigates to `routes.eventAdmin("harvest-block-party")`
  (apps/web, auth-gated)
- the Volunteer card copy names the magic-link sign-in
  requirement and the M3-bypass-pending state; its primary link
  hard-navigates to `routes.gameRedeem("harvest-block-party")`
  (apps/web, auth-gated)
- the role-doors section renders under the apps/site root layout
  Sage Civic Theme (no `<ThemeScope>` wrap) per scoping decision
  10; the persona vocabulary "Attendee / Organizer / Volunteer"
  is the title-level surface and is consistent with the
  milestone doc + epic
- README, [docs/architecture.md](/docs/architecture.md), and
  [docs/product.md](/docs/product.md) describe the post-M2
  home-page surface inventory (hero + two-event showcase +
  Harvest narrative + role-doors) instead of the pre-M2 stub
- the milestone doc's Phase Status table 2.3 row flips
  `Plan-pending` → `Landed`, points at this plan, and points at
  this PR
- the milestone doc's top-level Status flips
  `Proposed` → `Landed`
- the epic's Milestone Status table M2 row flips
  `Proposed` → `Landed`
- the three transient scoping docs
  ([2.1](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md),
  [2.2](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md),
  [2.3](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md))
  are deleted per the milestone-terminal cleanup rule
- the home-page route's `metadata.robots` noindex emit (shipped
  in 2.1) is unchanged; validation gate's curl falsifier
  re-confirms it survived the role-door section addition

The PR does not register a new Theme, does not introduce
demo-mode auth bypass, does not touch apps/web, does not modify
2.1's hero / showcase or 2.2's narrative, does not consume
[`featuredGameSlug`](/shared/game-config/constants.ts), and does
not edit the page-route metadata-emit shape.

## Cross-Cutting Invariants

This phase binds the four milestone-level invariants from
[m2-home-page-rebuild.md §Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
verbatim — internal-partner honesty, two-theme exercise on
showcase, role-door honesty against current auth state, and
cross-app navigation uses hard navigation. **No per-phase
additions.**

- **Internal-partner honesty.** Load-bearing — every role-door
  card's copy walks against this invariant. The auth-honest
  caveats on Organizer + Volunteer are exactly what the
  invariant's "honest about real vs. stubbed" language requires
  for surfaces that link to auth-gated targets.
- **Two-theme exercise on showcase.** **N/A** for 2.3's diff —
  role-doors are persona-shaped (not per-event) and consume no
  per-event Themes. Self-review walks it as a no-op for
  completeness per the milestone doc's "Self-review walks each
  one against every phase's actual changes": grep the diff for
  `EventShowcaseCard`, `home-showcase`, and `ThemeScope`
  inside `apps/site/components/home/`; expect zero changes
  outside the new role-doors files (and zero `ThemeScope`
  imports in any new role-doors file per scoping decision 10).
- **Role-door honesty against current auth state.** Load-bearing
  — this is the phase's primary editorial contract. The
  per-role copy contract below ships the M3-inherited copy
  shape: Attendee no caveat (gameplay public); Organizer +
  Volunteer carry the magic-link sign-in caveat with
  M3-bypass-pending framing. The substantive claim agrees with
  2.2's per-persona narrative caveats per the
  [2.3 scoping cross-phase coordination](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md)
  section.
- **Cross-app navigation uses hard navigation.** Load-bearing —
  all three role-door primary links target apps/web routes
  behind the apps/web Vercel rewrite. Each link is a plain
  `<a href={routes.X(slug)}>`, not a Next.js `<Link>` and not
  `useRouter().push()`, per the
  [`EventCTA.tsx:7-10`](/apps/site/components/event/EventCTA.tsx)
  source-comment precedent and AGENTS.md
  "Cross-app destinations need hard navigation, not client-side
  navigation."

The plan also inherits the URL contract, theme route scoping,
theme token discipline, and trust-boundary invariants from the
parent epic and predecessor epics per the milestone doc's
"Inherited from upstream invariants" paragraph; self-review
walks each against this phase's diff (mostly no-op walks given
the surface).

## Naming

- **`.home-roles`** — top-level CSS scope class on the
  role-doors section's outer `<section>` element. Mirrors the
  existing `.home-hero` (2.1), `.home-showcase` (2.1), and
  `.home-narrative` (2.2) section-class convention. The
  selector is a direct child of `.home-shell` and inherits the
  `.home-shell > section` width-auto-center rule.
- **`.home-roles-grid`** — the responsive grid container inside
  `.home-roles` that lays out the three `RoleDoorCard`
  instances. `grid-template-columns: 1fr` on narrow viewports
  (single-column stack); `grid-template-columns: repeat(3, 1fr)`
  at the desktop breakpoint. Mirrors the
  `.home-showcase-grid` responsive idiom 2.1 established at
  [`globals.css:758-768`](/apps/site/app/globals.css) (extended
  from 2-column to 3-column).
- **`.home-roles-card`** (or implementer-equivalent) — the
  per-card scope class on each `RoleDoorCard` instance. Carries
  the card's border, padding, hover/focus states, and link
  affordance.
- **Role-door card** — one of the three persona cards inside
  the role-doors section. Each is a `RoleDoorCard` invocation
  with persona-specific props (eyebrow / title / description /
  href / optional auth caveat).
- **Auth caveat** — the optional one-clause sentence-fragment
  rendered inside Organizer and Volunteer cards naming the
  magic-link sign-in requirement and the M3-bypass-pending
  state. Attendee card has no caveat.
- **M2 closure** — collective term for this PR's milestone-
  closing work: README + architecture + product currency
  updates, milestone-doc Phase Status row flip + top-level
  Status flip, epic Milestone Status table M2 row flip, and
  batch deletion of the three transient scoping docs.

## Contracts

### Role-doors section composition

The role-doors section is a single direct child of
`<main className="home-shell">`, added after `<HomeHero />`,
`<TwoEventShowcase />`, and `<HarvestNarrative />`:

```tsx
<RoleDoors />
```

`RoleDoors.tsx` exports a server component rendering an outer
`<section className="home-roles">` containing a section header
(eyebrow + title + optional one-line framing) and a
`<div className="home-roles-grid">` containing three
`<RoleDoorCard>` invocations. The three invocations are inlined
in source order (Attendee → Organizer → Volunteer) to match the
milestone doc + epic vocabulary order.

The section does **not** wrap its content in a `<ThemeScope>`
per scoping decision 10. The `RoleDoors.tsx` component does
**not** import `ThemeScope` or `getThemeForSlug` — a missing
import is the structural falsifier check.

### RoleDoorCard component shape

`RoleDoorCard.tsx` exports a server component with prop shape
`{ eyebrow, title, description, href, authCaveat? }` — each
field a `string`, with `authCaveat` optional. The substantive
contract is one shared component invoked three times;
implementer may refine field naming or add fields if copy
drafting surfaces a need.

The component renders a card markup pattern mirroring 2.1's
[`EventShowcaseCard`](/apps/site/components/home/EventShowcaseCard.tsx)
shape (eyebrow → heading → body text → optional caveat → link
affordance). The outer element is a single `<a>` (not a
`<button>` / `<div>` with click handler) so the entire card is
a hard-navigation link surface, with `href={href}` taking the
full `routes.X(slug)` URL string from the call site.

The `authCaveat` prop is rendered as a `<p>` inside the card
when present and omitted entirely when absent. The Attendee
invocation passes no `authCaveat`; Organizer + Volunteer
invocations both pass one.

The component does **not** use `<Link>` from `next/link`. Plain
`<a href>` is the load-bearing choice per the cross-app
hard-navigation invariant — all three call-site `href` values
resolve to apps/web routes behind the Vercel rewrite, and a
`<Link>` would keep the SPA on apps/site and never re-enter
the proxy. The component's source comment names the rationale
(mirrors
[`EventCTA.tsx:7-10`](/apps/site/components/event/EventCTA.tsx)).

### Per-role URL target contract

The three call sites in `RoleDoors.tsx` invoke the URL builders
from [`shared/urls/routes.ts`](/shared/urls/routes.ts) per
scoping decision 3:

- **Attendee:** `routes.game("harvest-block-party")` →
  `/event/harvest-block-party/game` (apps/web, public)
- **Organizer:** `routes.eventAdmin("harvest-block-party")` →
  `/event/harvest-block-party/admin` (apps/web, auth-gated)
- **Volunteer:** `routes.gameRedeem("harvest-block-party")` →
  `/event/harvest-block-party/game/redeem` (apps/web,
  auth-gated)

The slug `"harvest-block-party"` is declared once in
`RoleDoors.tsx` as a const at the top of the file (not
duplicated three times across call sites) so swapping the
demo's anchor event is a one-line change. The slug is
hardcoded — not consumed from
[`featuredGameSlug`](/shared/game-config/constants.ts)
(unregistered apps/web concern), not derived from
`registeredEventSlugs` filtered by `testEvent === true`. Same
hardcoding rationale as 2.1's slug-list-source contract: future
test-event additions should require an explicit home-page edit
rather than silently start surfacing.

The contract does **not** add a role-named alias (e.g.,
`routes.gameVolunteer`) to
[`shared/urls/routes.ts`](/shared/urls/routes.ts) per the
scoping doc's open-decisions resolution. The existing
`gameRedeem` builder is the canonical name; a role-named alias
would split the URL surface for no contract reason.

### Per-role auth-honesty copy contract

Each card's copy treats auth state per the shape decision 5
locks; exact wording is implementer-drafted at copy time. The
substantive contract is the auth-gate acknowledgment, not a
specific phrasing.

- **Attendee card — no auth caveat.** Title: "Attendee" (per
  decision 6). Eyebrow / description prose names the persona
  and the gameplay action (e.g., "Play the demo and answer
  questions") without mentioning sign-in. The `authCaveat`
  prop is omitted at the call site. Reality-check input: the
  apps/web gameplay route at
  [`routes.game(slug)`](/apps/web/src/pages/GamePage.tsx) is
  open today (no `useAuthSession()` reference). If
  implementation re-reads the route at start and finds a guard
  has been added, the Attendee card adopts the same
  `authCaveat` shape as Organizer + Volunteer and the
  implementer records the contingency under PR
  `## Estimate Deviations`.
- **Organizer card — auth caveat naming sign-in + M3
  bypass-pending.** Title: "Organizer" (per decision 6).
  Eyebrow / description prose names the persona and the admin
  authoring action. The `authCaveat` prop carries one clause
  naming the magic-link sign-in requirement and the
  M3-bypass-pending state ("Sign in or wait for demo-mode
  access" framing per the milestone doc's invariant phrasing).
  Reality-check input:
  [`apps/web/src/pages/EventAdminPage.tsx:132,143-157`](/apps/web/src/pages/EventAdminPage.tsx)
  guards via `useAuthSession()` + `useOrganizerForEvent(slug)`.
- **Volunteer card — auth caveat, same shape as Organizer.**
  Title: "Volunteer" (per decision 6). Eyebrow / description
  prose names the persona and the redemption-booth action. The
  `authCaveat` prop matches the Organizer shape. Reality-check
  input:
  [`apps/web/src/pages/EventRedeemPage.tsx:132-161`](/apps/web/src/pages/EventRedeemPage.tsx)
  guards via `useAuthSession()` + `authorizeRedeem(slug)`.

The `authCaveat` copy is the contract M3's PR inherits — when
demo-mode bypass for test-event slugs lands, M3's plan-drafting
revises the Organizer + Volunteer caveats (and 2.2's narrative
per-persona caveats) in the same change. Attendee copy is
unchanged. The plan's Risk Register inherits the milestone-
level "Role-door copy drift between M2 and M3" risk unchanged.

### Cross-app navigation contract

All three role-door primary links use plain `<a href>` with
the URL string from the per-role URL target contract above.
Self-review confirms no `<Link>` import in `RoleDoors.tsx` or
`RoleDoorCard.tsx` and no `useRouter` / `useRouter().push` /
`useRouter().replace` / `history.pushState` reference in either
file (a grep over the new files for `from "next/link"`,
`useRouter`, and `pushState` returning zero matches is the
falsifier check).

The cross-app navigation invariant binds at every outbound link
in the home page; this contract scopes the invariant for 2.3's
diff. The invariant is also satisfied by 2.1's
[`EventShowcaseCard`](/apps/site/components/home/EventShowcaseCard.tsx)
(plain `<a href={routes.eventLanding(content.slug)}>` for a
same-app destination — `<Link>` would also be valid there
because the destination is same-app, but the existing
implementation uses `<a>`) and by 2.2's narrative section
(no outbound links per the no-outbound-links contract). 2.3's
role-doors are the cross-app click-through layer; 2.1's
showcase cards are the same-app click-through layer; 2.2's
narrative is link-free.

### No-`<ThemeScope>`-wrap contract

The role-doors section renders under the apps/site root
layout's platform Sage Civic Theme. `RoleDoors.tsx` and
`RoleDoorCard.tsx` do **not** import `ThemeScope` or
`getThemeForSlug`. The card's brand-bearing surfaces (border
accent, link affordance color, eyebrow color, optional hover
state) consume the platform Theme's brand-tied tokens
(`var(--primary)`, `var(--secondary)`, `var(--accent)`,
`var(--bg)`) which resolve to the Sage Civic values defined at
[`shared/styles/themes/platform.ts`](/shared/styles/themes/platform.ts)
via `:root` substitution.

This contract is load-bearing in two ways:
1. it satisfies the persona-as-platform-concept framing
   decision 6 commits to (the role-doors are not "Harvest's
   roles," they are platform roles exemplified through Harvest
   as the worked example)
2. it makes the post-M2 home-page brand-color rhythm
   intentional and reviewable — hero (platform) → showcase
   (mixed per-card per-event Themes) → narrative (single
   Harvest section wrap) → role-doors (platform). The
   cumulative-page capture in the validation gate is the
   reviewable artifact for the rhythm.

A `<ThemeScope>` wrap on `RoleDoors.tsx` or any
`RoleDoorCard.tsx` invocation is the structural falsifier for
this contract.

### Brand-token discipline (inherited from 2.1, scoped to platform tokens)

Inherits from the
[2.1 plan's brand-token discipline contract](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
unchanged in *shape*, applied to platform-Theme rendering: any
brand-bearing surface inside `.home-roles*` selectors consumes
`var(--primary)`, `var(--secondary)`, `var(--accent)`, or
`var(--bg)`; **not** derived shades like
`var(--primary-surface)` / `var(--secondary-focus)` /
`var(--*-shade)`. Background tints, hover states, and other
non-brand-bearing surfaces may use whatever the design needs
but are not load-bearing.

The discipline applies even though the role-doors section
renders under the platform default (no per-event
`<ThemeScope>` wrap) because:
1. it future-proofs against any future per-event role-door
   variant (if scope rotates, the brand-token rule is already
   in place)
2. it keeps the role-doors visually consistent with 2.1's
   showcase cards and 2.2's narrative section, which do bind
   the rule for per-event Themes
3. it doesn't cost anything — `var(--primary)` resolves to the
   platform Sage Civic Theme value at `:root`, which is the
   same value the `var(--primary-surface)` derived shade pins
   to anyway under the platform Theme

### M2 closure documentation contract

This PR updates three documentation surfaces beyond the Status
flips, per scoping decision 8:

- **[README.md](/README.md):** the platform-landing description
  paragraphs at lines 22-23 and 71-72 (current text describes
  "a static platform landing in apps/site plus published demo
  game routes" / "Platform landing, platform admin, auth
  callback, and public event landing pages built with Next.js
  16") are revised to describe the post-M2 home page as an
  internal-partner-facing demo entry point with hero +
  two-event showcase + Harvest narrative + role-doors. The
  edit is paragraph-bounded; structural rewrites are out of
  scope.
- **[docs/architecture.md](/docs/architecture.md):** line
  210-211 (current text: "Static platform landing at `/`, with
  a CTA into `/admin`") is revised to describe the post-M2
  surface inventory. Lines 31-32, 62-66, and 939 are read at
  implementation time and revised only if their current
  framing is contradicted by the post-M2 page (re-grep at
  implementation start).
- **[docs/product.md](/docs/product.md):** line 38 (current
  bullet: "a demo-overview landing page at `/`") is revised to
  match the post-M2 surface; the bullet is paragraph-bounded.

The implementer re-greps each doc at implementation time to
confirm the cited lines are still the right edit target (a
sibling PR may have already updated some between scoping and
implementation). If a doc has already been updated to describe
the post-M2 surface, the corresponding currency entry is a
no-op.

[`docs/dev.md`](/docs/dev.md),
[`docs/operations.md`](/docs/operations.md),
[`docs/styling.md`](/docs/styling.md), and
[`docs/open-questions.md`](/docs/open-questions.md) are
**not** touched by this PR. The M2 phase set introduces no
local-dev workflow, no operational concern, no
token-classification change, and no open-question close. The
implementer confirms by greping each doc for home-page
references at implementation time; if any doc surfaces a
reference that the post-M2 page contradicts, the implementer
records the doc-currency surprise as an estimate deviation
and either updates it inline or defers to a follow-up
(plan-time expectation: no surprise).

### Status-flip and scoping-deletion contract

The PR flips three Status entries and deletes the three
scoping docs in the doc commit:

- **[m2-home-page-rebuild.md Phase Status table](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md):**
  the 2.3 row's **Plan** column links this plan doc; the
  **Status** column flips `Plan-pending` → `Landed`; the **PR**
  column points at this PR. Per AGENTS.md "do not record
  commit SHAs," the table records "this PR" rather than a SHA
  in the same way 2.1 and 2.2 already do.
- **[m2-home-page-rebuild.md top-level Status](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md):**
  flips `Proposed` → `Landed`. (M2 milestone doc's Validation
  Gate is fully satisfiable pre-merge per the milestone doc;
  no `In progress pending prod smoke` Tier-5 deferral applies.)
- **[demo-expansion epic Milestone Status table](/docs/plans/epics/demo-expansion/epic.md):**
  the M2 row's **Status** column flips `Proposed` → `Landed`.
  Per the epic's Milestone Status section, "every implementing
  PR is responsible for flipping the corresponding row's
  status in the same change."
- **Scoping doc deletions:** the three transient scoping docs
  ([scoping/m2-phase-2-1.md](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md),
  [scoping/m2-phase-2-2.md](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md),
  [scoping/m2-phase-2-3.md](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md))
  are deleted. Per AGENTS.md "Phase Planning Sessions" and the
  milestone doc's "Output set" rule, scoping docs delete in
  batch at the milestone-terminal PR. The plan docs (2.1, 2.2,
  2.3) are durable and remain.

## Files to touch

This list is the planner's pre-implementation estimate of the
expected diff shape per AGENTS.md "Plan content is a mix of
rules and estimates"; implementation may revise when a
structural call requires deviating, recorded in the PR body's
`## Estimate Deviations` section.

### New

- `apps/site/components/home/RoleDoors.tsx` — server component
  rendering the role-doors section. Renders an outer
  `<section className="home-roles">` containing a section
  header (eyebrow + title + optional one-line framing) and a
  `<div className="home-roles-grid">` containing three
  inline `<RoleDoorCard>` invocations in source order
  Attendee → Organizer → Volunteer. Declares the
  `harvest-block-party` slug as a top-of-file const consumed
  by all three invocations. Imports
  [`routes`](/shared/urls/routes.ts) from
  `shared/urls/routes.ts`. Does **not** import `ThemeScope`
  or `getThemeForSlug`. No props (content is hardcoded copy at
  this iteration). Plan-drafting estimate: ~50-90 LOC.
- `apps/site/components/home/RoleDoorCard.tsx` — server
  component rendering one role-door card per the
  RoleDoorCard component shape contract above. Outer element
  is a single `<a href={href}>` with the card markup as
  children (eyebrow + title + description + optional caveat +
  link affordance). Does **not** import `ThemeScope`,
  `getThemeForSlug`, or `next/link`. Plan-drafting estimate:
  ~40-70 LOC.

### Modify

- [`apps/site/app/page.tsx`](/apps/site/app/page.tsx) — adds
  one `import` line for `RoleDoors` and one JSX node composing
  it as the fourth section child of
  `<main className="home-shell">`, after `<HomeHero />`,
  `<TwoEventShowcase />`, and `<HarvestNarrative />` (assumes
  2.2 has landed; reality-check confirms). Plan-drafting
  estimate: +2-3 LOC; no other change to `metadata` /
  structure / surrounding JSX. The page-route metadata-emit
  shape from 2.1 is unchanged.
- [`apps/site/app/globals.css`](/apps/site/app/globals.css) —
  extends with `.home-roles`, `.home-roles-grid`, and
  `.home-roles-card` (or implementer-equivalent) selector
  groups plus any brand-bearing-surface rules (eyebrow color,
  card border accent, link affordance color, hover/focus
  states). Plan-drafting estimate: 50-100 LOC. Extends in
  place per the same minimal-surprise call 2.1 and 2.2 made;
  if LOC overshoots, the implementer may introduce
  `apps/site/app/home.css` as a partial imported by globals.css
  and records the deviation in the PR's
  `## Estimate Deviations`.
- [`README.md`](/README.md) — paragraph-bounded edits to lines
  22-23 and 71-72 per the M2 closure documentation contract.
  Plan-drafting estimate: ~10-30 LOC of prose changes.
- [`docs/architecture.md`](/docs/architecture.md) — paragraph-
  bounded edit to line 210-211; lines 31-32, 62-66, 939
  re-greped at implementation time for additional necessary
  edits. Plan-drafting estimate: ~10-40 LOC of prose changes.
- [`docs/product.md`](/docs/product.md) — bullet-bounded edit
  to line 38. Plan-drafting estimate: ~3-8 LOC of prose
  changes.
- [`docs/plans/epics/demo-expansion/m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  Phase Status row 2.3 update + top-level Status flip per the
  Status-flip contract above.
- [`docs/plans/epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  Milestone Status table M2 row flip per the Status-flip
  contract above.

### Delete

- [`docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md) —
  per the milestone-terminal scoping-deletion rule.
- [`docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md) —
  same.
- [`docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md) —
  same. (Drafted in this same PR; deleted in the same PR per
  the milestone-terminal cleanup rule. The doc's deliberation
  prose has no audience after the milestone closes.)

### Intentionally not touched

- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) —
  root metadata, the platform-Theme emit on `<html>`, and font
  wiring are unchanged. The home page's `metadata` export
  cascade behavior is 2.1's responsibility and inherited.
- [`apps/site/app/page.tsx`](/apps/site/app/page.tsx)
  `metadata` export — the route-scoped
  `robots: { index: false, follow: false }` 2.1 shipped is
  unchanged.
- `apps/site/components/home/HomeHero.tsx`,
  `apps/site/components/home/TwoEventShowcase.tsx`,
  `apps/site/components/home/EventShowcaseCard.tsx`,
  `apps/site/components/home/HarvestNarrative.tsx` (and any
  `NarrativePersona.tsx` 2.2 may have introduced) — 2.1 and
  2.2 components unchanged; the role-doors are a sibling
  section, not a refactor.
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — `EventContent` type and registry unchanged; the role-doors
  do not consume `EventContent` (the persona vocabulary is
  hardcoded; the slug is a string const).
- `apps/site/events/harvest-block-party.ts` — Harvest content
  unchanged; no fields added.
- `apps/site/components/event/**` — rich event landing
  components unchanged; the role-doors do not reuse them.
- `shared/styles/themes/*.ts` — theme registry unchanged.
- [`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts)
  — resolver unchanged; the role-doors do not consume it per
  the no-`<ThemeScope>`-wrap contract.
- [`shared/styles/index.ts`](/shared/styles/index.ts) —
  unchanged.
- [`shared/urls/routes.ts`](/shared/urls/routes.ts) — route
  builders consumed by the role-doors but not modified. No
  role-named alias added per the per-role URL target contract.
- [`shared/game-config/constants.ts`](/shared/game-config/constants.ts)
  — `featuredGameSlug` left as-is.
- `apps/web/**` — M2 invariant: apps/site-only diff.
- `supabase/**` — out of scope.
- `tests/**` — no test changes; the role-doors render as
  server components with no interactive surface to e2e at this
  phase. Self-review confirms no existing Playwright suite
  asserts against `/`'s post-M2 markup that would now fail.
- [`docs/dev.md`](/docs/dev.md),
  [`docs/operations.md`](/docs/operations.md),
  [`docs/styling.md`](/docs/styling.md),
  [`docs/open-questions.md`](/docs/open-questions.md),
  [`docs/backlog.md`](/docs/backlog.md) — not expected to
  need updates; implementer re-greps at implementation time
  per the M2 closure documentation contract.
- [`docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md),
  [`docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md) —
  predecessor plan docs are durable and remain unchanged.
  Their Status entries already say `Landed` (2.1) /
  `Proposed` (2.2 — flips when 2.2's PR ships, separately).

## Execution Steps

This sequence is the planner's pre-implementation estimate of
the expected execution shape per AGENTS.md "Plan content is a
mix of rules and estimates"; the implementer may refine.

1. **Branch hygiene.** Off `main` (clean worktree). Branch name
   follows repo convention `plan/<slug>` — likely
   `plan/m2-phase-2-3-role-doors-and-m2-closure`.
2. **Baseline validation.** `npm run lint`, `npm run build:site`,
   `npm run build:web` (confirm green pre-edit).
3. **Reality-check re-run.** Re-verify the inputs named in
   [scoping/m2-phase-2-3.md §Reality-check inputs](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md):
   2.2 ship status (decides whether the cumulative-page
   capture targets the post-2.2 page or whether the PR opens
   only after 2.2 has merged); page.tsx shape unchanged since
   2.1; components/home/ family unchanged (or extended by 2.2
   in expected shape); routes.ts builders unchanged; apps/web
   admin / redeem auth-gate behavior unchanged (still gated;
   M3 hasn't landed); apps/web gameplay route still open
   (decision 5 contingency); apps/site `/admin` still owned by
   apps/site; EventCTA hard-navigation precedent unchanged;
   `.home-shell` scope intact; apps/web sign-in form copy
   unchanged (vocabulary precedent for the auth caveat
   phrasing); README + architecture.md + product.md
   home-page paragraphs at the cited lines still describe the
   pre-M2 surface (a sibling PR may have already updated some
   — no-op the corresponding currency entry if so);
   `metadata.robots` block unchanged.
4. **Component scaffolds.** Create
   `apps/site/components/home/RoleDoors.tsx` and
   `apps/site/components/home/RoleDoorCard.tsx` with the
   skeleton exports + section/card structure (eyebrow / title /
   description / link placeholders, three call-site
   invocations) so the page.tsx import resolves before copy
   drafting. Confirm no `ThemeScope` / `next/link` imports are
   added.
5. **Page wire-up.** Add the `import` and JSX node to
   [`apps/site/app/page.tsx`](/apps/site/app/page.tsx); confirm
   the page composes hero + showcase + narrative + role-doors
   with `npm run build:site`.
6. **Role-door copy drafting.** Draft the section header (one
   eyebrow + one title + optional one-line framing) and the
   three card copy sets (eyebrow + title + description ±
   caveat) against the
   [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
   invariant and the per-role auth-honesty copy contract.
   Persona titles use "Attendee" / "Organizer" / "Volunteer"
   verbatim per decision 6. Auth caveats on Organizer +
   Volunteer use the milestone doc's "Sign in or wait for
   demo mode" framing (or implementer-refined equivalent that
   names sign-in + M3-bypass-pending). Substantive claim
   agrees with 2.2's per-persona narrative caveats per the
   [scoping cross-phase coordination](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md)
   section; phrasing density may differ.
7. **CSS extension.** Add `.home-roles`, `.home-roles-grid`,
   and per-card selectors to
   [`globals.css`](/apps/site/app/globals.css). The
   `.home-shell > section` width rule from 2.1 covers width-
   auto-centering; `.home-roles` adds internal vertical
   spacing; `.home-roles-grid` adds the responsive
   `repeat(3, 1fr)` desktop / `1fr` mobile grid; per-card
   selectors add border / padding / hover-focus / link
   affordance using brand-tied tokens only per the brand-token
   discipline contract. Plan-drafting confirms breakpoint
   matches 2.1's `.home-showcase-grid` precedent (likely 720px
   or whatever 2.1 settled on; implementer re-reads at
   implementation time).
8. **M2 closure doc currency.** Update
   [`README.md`](/README.md),
   [`docs/architecture.md`](/docs/architecture.md), and
   [`docs/product.md`](/docs/product.md) per the M2 closure
   documentation contract. Re-grep each doc at edit time to
   confirm the cited lines are still the right edit target.
9. **M2 closure Status flips and scoping deletions.** Update
   [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
   Phase Status row 2.3 + top-level Status; update
   [`epic.md`](/docs/plans/epics/demo-expansion/epic.md)
   Milestone Status table M2 row; delete
   [scoping/m2-phase-2-1.md](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md),
   [scoping/m2-phase-2-2.md](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md),
   [scoping/m2-phase-2-3.md](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md).
10. **Pre-deploy validation.** `npm run lint`,
    `npm run build:site`, `npm run build:web` confirm green.
11. **Open draft PR.** Vercel produces the apps/site preview
    URL on push.
12. **Capture set (per Validation Gate below).** Three
    captures: role-doors-section close-up (desktop + narrow
    viewport, 2 captures), cumulative full-page (desktop, 1
    capture). Run `curl -s -L <preview-url>/ | grep -i 'name="robots"'`
    and confirm `noindex, nofollow` still emits. All attach to
    PR body's Validation section.
13. **Self-review walk.** Walk the audits below against the
    actual diff before marking the PR ready.

## Commit Boundaries

Pre-implementation estimate per AGENTS.md "Plan content is a
mix of rules and estimates":

- **Commit 1 — role-door section component(s) + page wire-up +
  CSS.** `apps/site/components/home/RoleDoors.tsx`,
  `apps/site/components/home/RoleDoorCard.tsx`,
  `apps/site/app/page.tsx` composition addition,
  `apps/site/app/globals.css` extension. Ships the visible
  structural change cohesively.
- **Commit 2 — M2 closure docs + Status flips + scoping
  deletions.** [`README.md`](/README.md),
  [`docs/architecture.md`](/docs/architecture.md),
  [`docs/product.md`](/docs/product.md),
  [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
  (Phase Status row + top-level Status), epic.md (Milestone
  Status table), and the three scoping doc deletions. Doc-only,
  separable from the code review.
- **Optional Commit 3+ — review-fix commits.** Per AGENTS.md,
  review-fix commits stay distinct when they clarify history.

If component scope grows beyond the estimate (per scoping
decision 1's fallback authorization — section component
exceeding ~150 LOC, or the per-role copy contracts diverging
enough that one role's review attention masks another's, or
the M2 closure doc updates touching more than the named three
files), the implementer splits along an Option C seam mid-
flight: 2.3.1 ships all three role-doors + section CSS; 2.3.2
ships M2 closure docs + Status flips + scoping deletions. The
implementer records the deviation in the PR body's
`## Estimate Deviations`.

## Validation Gate

The validation procedure that proves this PR ships its goal:

- `npm run lint` — green.
- `npm run build:site` — green; the rebuilt route compiles, no
  new TypeScript errors, no metadata-cascade warnings from
  Next.js.
- `npm run build:web` — green per the PR-template default; the
  diff does not touch apps/web but the build runs as a
  regression guard.
- **Role-doors section close-up capture (desktop) in PR body's
  Validation section.** One desktop-viewport screenshot scoped
  to the role-doors section showing the three cards in the
  3-column grid with their persona titles, body copy, and
  per-role auth-state framing visible (Organizer + Volunteer
  caveats; Attendee no caveat). The PR body names the
  per-role-target-URL falsifier:
  *"each card's `href` matches the per-role URL target
  contract: Attendee → `/event/harvest-block-party/game`,
  Organizer → `/event/harvest-block-party/admin`, Volunteer →
  `/event/harvest-block-party/game/redeem`. A mismatched href
  on any card is the falsifier."*
- **Role-doors section close-up capture (narrow viewport) in
  PR body's Validation section.** One narrow-viewport
  screenshot (≤480px, matching 2.1's narrow-viewport pattern)
  showing the three role-door cards stack into a single
  column. The narrow-viewport falsifier:
  *"role-door cards remain side-by-side at narrow width
  (responsive contract regression), or any card overflows the
  viewport, or the auth caveats are clipped or unreadable."*
- **Cumulative full-page capture (desktop) in PR body's
  Validation section.** One desktop-viewport screenshot of `/`
  at full scroll height (or stitched if a single capture
  cannot capture the full scroll) showing hero + showcase +
  narrative + role-doors cohesively. Renders the post-M2
  page-length consequence per AGENTS.md "Bans on surface
  require rendering the consequence" for the milestone-level
  "Page-length sprawl" risk; closes the M2-closing-phase
  cumulative-page walk per the milestone doc. The PR body
  names the page-length sprawl falsifier:
  *"the cumulative home page after M2 reads as a coherent
  four-section partner-evaluator surface; a page that scrolls
  past ~6 viewport heights on desktop or that buries any
  section below excessive padding is the sprawl falsifier."*
  Renders the brand-color-rhythm consequence per the
  no-`<ThemeScope>`-wrap contract: showcase (mixed per-card)
  → narrative (Harvest section wrap) → role-doors (platform
  default). The PR body names the rhythm-coherence falsifier:
  *"the cumulative page reads as intentional brand-color
  rhythm rather than as a jarring shift between Harvest
  pumpkin (narrative) and platform Sage Civic (role-doors).
  If the rhythm reads jarring, the PR may revise the
  no-wrap call per scoping decision 10's reviewability
  paragraph."*
- **Noindex curl falsifier (re-confirm).**
  `curl -s -L <preview-url>/ | grep -i 'name="robots"'` returns
  `<meta name="robots" content="noindex, nofollow" />`. Output
  recorded in the PR body. Procedure inherited from 2.1's
  Validation Gate; re-run because 2.3 modifies page.tsx and
  the re-confirm closes the regression-by-omission falsifier.
- **Per-role auth-honesty self-review walk.** Self-review walks
  each role-door card's copy against the
  [`Role-door honesty against current auth state`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
  invariant per the per-role auth-honesty copy contract:
  Attendee card has no auth caveat (gameplay open today);
  Organizer card carries sign-in + M3-pending caveat; Volunteer
  card same. Substantive-claim agreement with 2.2's narrative
  per-persona caveats walked per the
  [scoping cross-phase coordination](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md)
  section.
- **Internal-partner-honesty self-review walk.** Self-review
  walks every word of role-door copy against the
  [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
  invariant. No marketing-style "Click to play!" framing;
  honest persona-action descriptions with auth caveats where
  the target requires sign-in.
- **Cross-app navigation invariant audit.** Self-review greps
  the new component(s) for `from "next/link"`, `useRouter`,
  `pushState`, and `replaceState`, confirming zero matches.
  Self-review walks each role-door card's outbound `<a href>`
  to confirm it uses a plain anchor with the contract's URL
  string.
- **Brand-token discipline audit.** Self-review greps the new
  globals.css block for `var(--primary-surface)`,
  `var(--secondary-focus)`, `var(--accent-shade)` (and other
  derived shades) inside `.home-roles*` selectors, confirming
  zero matches on brand-bearing surfaces.
- **No-`<ThemeScope>`-wrap structural audit.** Self-review
  greps the new files for `ThemeScope` and `getThemeForSlug`
  imports, confirming zero matches.
- **Doc-currency walk.** Self-review confirms README +
  architecture.md + product.md describe the post-M2 surface
  inventory; greping each doc for the pre-M2 wording from the
  M2 closure documentation contract returns zero matches.
- **Status-flip walk.** Self-review confirms the milestone
  doc's Phase Status row 2.3 reads `Landed`, the milestone
  doc's top-level Status reads `Landed`, and the epic's
  Milestone Status table M2 row reads `Landed` after the
  edits.
- **Scoping-deletion walk.** Self-review confirms the three
  scoping doc files are absent from the post-PR tree:
  `ls docs/plans/epics/demo-expansion/scoping/` returns an
  empty (or absent) directory listing.
- **Plan-to-PR Completion Gate walk.** Every Goal, Self-Review
  audit, Validation step, Documentation Currency entry, and
  Status flip is satisfied or explicitly deferred-with-
  rationale-in-this-plan before the PR opens.
- **Estimate Deviations callout in PR body.** Per AGENTS.md,
  the PR body names any deviation from this plan's
  estimate-shaped sections (Files to touch, Execution Steps,
  Commit Boundaries) under `## Estimate Deviations`, or `N/A`
  if none.

The validation gate does **not** include a Tier 5 post-deploy
production check (same rationale as 2.1 and 2.2: pure JSX +
CSS + content-copy change with no proxy / CDN / runtime
variance between preview and prod). Status flips to `Landed`
in this PR.

## Self-Review Audits

Walk the named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
against this PR's diff surfaces. The diff covers seven surfaces
— apps/site component family addition (server JSX), apps/site
route composition edit (1-line addition), apps/site CSS
extension, three doc currency edits (README + architecture +
product), Status-flip edits (milestone doc + epic), scoping
doc deletions, and the milestone-doc Phase Status row update —
none of which involve SQL migrations, Edge Functions, async /
lifecycle code, save paths, or operational scripts. The
catalog's audits are scoped to those concerns; **none** apply.

The implementer confirms this enumeration during self-review
and records "no catalog audits apply to this diff surface" in
the PR body's Self-Review section, alongside the milestone-
doc-level sanity walks listed in the Validation Gate above
(per-role auth-honesty, internal-partner honesty, cross-app
navigation, brand-token discipline, no-`<ThemeScope>`-wrap,
doc currency, Status flips, scoping deletions).

If any walk surfaces a finding, the implementer fixes it in
this PR (per AGENTS.md "if a reviewer flags a gap that should
have been named at plan time, fix the plan first").

## Documentation Currency PR Gate

Reference:
[m2-home-page-rebuild.md §Documentation Currency](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md).

This PR is the M2-closing PR per the milestone doc's
Documentation Currency map and satisfies every M2-doc-named
entry:

- [`README.md`](/README.md) — capability set after M2 ✓ (per
  the M2 closure documentation contract)
- [`docs/architecture.md`](/docs/architecture.md) — apps/site
  responsibilities + home-page section inventory ✓
- [`docs/product.md`](/docs/product.md) — current capability
  description ✓
- [`docs/plans/epics/demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  Milestone Status M2 row flip ✓ (per the Status-flip contract)
- [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  Phase Status row 2.3 + top-level Status flip ✓

[`docs/dev.md`](/docs/dev.md),
[`docs/operations.md`](/docs/operations.md),
[`docs/styling.md`](/docs/styling.md), and
[`docs/open-questions.md`](/docs/open-questions.md) are
**not** updated by this PR per the M2 closure documentation
contract (no local-dev workflow change, no operational
concern, no token-classification change, no open-question
close). The implementer re-greps each at implementation time
and records "no surface drift surfaced" in the PR body.

[`docs/backlog.md`](/docs/backlog.md) is not knowingly touched
by this PR; if implementation surfaces follow-up entries, the
implementer adds them per AGENTS.md "Feature-Time Cleanup And
Refactor Debt Capture" and records the addition in the PR
body.

## Out Of Scope

Final, not deliberation. Items here are explicitly excluded
from this PR's diff:

- Demo-mode auth bypass for test-event slugs (M3's scope;
  Organizer + Volunteer caveats name the M3 inheritance).
- Madrona Theme registration (future Madrona-launch epic).
- New test events beyond Harvest and Riverside (epic's "Out
  Of Scope").
- A generalized demo-mode framework for non-test events
  (epic's "Out Of Scope").
- Production-grade billing / account management / organization
  shapes (epic's "Out Of Scope").
- Per-event admin theme editor UI (deferred from
  event-platform-epic).
- Admin-authored sponsor / schedule / lineup / FAQ data tables
  (deferred from event-platform-epic).
- Out-of-band assets (icons, illustrations, images, videos).
  The milestone doc's "Out-of-band assets" Settled-by-default
  decision defers asset additions; the role-doors are
  text-and-color first.
- A role-named URL alias in
  [`shared/urls/routes.ts`](/shared/urls/routes.ts) (e.g.,
  `routes.gameVolunteer`). Per the per-role URL target
  contract, the existing `gameRedeem` builder is the canonical
  name; no alias added.
- A per-event role-door variant or a slug-picker that lets
  partners choose Riverside instead of Harvest. Decision 3
  binds Harvest as the single anchor event for role-doors;
  Riverside surfaces only via 2.1's showcase card.
- A `'use client'` boundary anywhere in the role-doors files.
  Server-rendered end-to-end; no interactivity beyond hard
  navigation.
- Modifying the page-route metadata-emit shape. The 2.1-
  shipped `metadata.robots` is unchanged; the validation
  gate's curl falsifier confirms.
- Any change to apps/web. The M2 invariant binds: apps/site-
  only diff.
- Any change to existing 2.1 / 2.2 components or CSS. The
  role-doors are a sibling section, not a refactor.

## Risk Register

Reference:
[m2-home-page-rebuild.md §Cross-Phase Risks](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
for milestone-level risks (role-door copy drift M2↔M3,
cross-app navigation `<Link>` reflexes, page-length sprawl,
multi-theme visible-but-broken, demo-overview content loss).

The "Page-length sprawl" milestone-level risk is load-bearing
for 2.3 specifically (this is the M2-closing phase); this
plan's Validation Gate's cumulative full-page capture renders
the consequence per AGENTS.md "Bans on surface require
rendering the consequence." If the cumulative capture surfaces
a sprawl finding, the implementer addresses it in this PR
(likely by tightening role-door copy density or section
padding) rather than deferring.

The "Role-door copy drift between M2 and M3" milestone-level
risk is also load-bearing for 2.3; the per-role auth-honesty
copy contract above is its mitigation. M3's plan-drafting
inherits the contract.

The "Cross-app navigation regressions from `<Link>` reflexes"
milestone-level risk is load-bearing for 2.3 specifically (all
three role-door targets are cross-app); the cross-app
navigation contract + the cross-app navigation invariant audit
are the mitigation.

Plan-implementation-level risks not already covered:

- **Brand-color rhythm reads as jarring rather than
  intentional.** Scoping decision 10 commits to no-wrap; the
  cumulative-page capture renders the consequence. Mitigation:
  the validation gate's cumulative capture is the reviewable
  artifact; if reviewer judges the rhythm jarring rather than
  intentional, the PR may revise the no-wrap call (the call is
  testable on the rendered page, not pre-committed under
  reviewer pressure).
- **Brand-token discipline drift in role-doors-section CSS.**
  Same trap as 2.1 and 2.2: a CSS rule consuming
  `var(--primary-surface)` on a brand-bearing surface pins to
  the apps/site `:root` substitution. Even though the
  role-doors render under platform default (no per-event
  Theme), the brand-token discipline contract above binds the
  rule for future-proofing. Mitigation: the brand-token
  discipline audit greps the new globals.css block for
  derived-shade tokens; the role-doors-section close-up
  capture is the observable falsifier.
- **Role-door copy honesty drift.** "Honest about what is real
  vs. stubbed" is a copy-craft task, not a code rule. The
  implementer drafts the exact card copy against the
  invariant; reviewers can challenge specific phrasings.
  Mitigation: self-review walks each card against the
  [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
  invariant; if any card reads as marketing aspiration, it
  rewrites in the same PR.
- **Component-family scope growth.** Two new files
  (RoleDoors + RoleDoorCard) is the estimate; if the
  implementer extracts a per-role component during copy
  drafting, the file count grows. Mitigation: scoping decision
  4 binds the single-shared-component shape; an extraction
  to per-role components is a contract violation, not an
  implementation choice. If the implementer surfaces a
  legitimate need (e.g., the cards' markup genuinely diverges),
  fix the plan first per AGENTS.md and record the deviation.
- **CSS organization growth.** The estimate is to extend
  [`globals.css`](/apps/site/app/globals.css) in place; if
  `.home-roles*` selectors push globals.css past a
  comfortable size, the implementer may introduce a partial.
  Mitigation: same as 2.1 and 2.2 — apps/site has no current
  partial-import precedent in globals.css, so a partial is a
  structural deviation worth recording in
  `## Estimate Deviations`.
- **Reality-check input drift between scoping and
  implementation start.** Auth-gate behavior on apps/web admin
  / redeem / gameplay routes can change between scoping and
  implementation. Mitigation: execution step 3 re-runs the
  reality-check at implementation start; the per-role
  auth-honesty copy contract names contingencies if any auth
  state has shifted (Attendee adopts caveat shape if gameplay
  has been gated; Organizer / Volunteer caveats no-op if
  bypass landed early outside this epic).
- **2.2 ship-order skew.** The plan binds 2.3 as the M2-closer
  per the Context section's parallelism-vs-closer paragraph and
  the milestone doc's Sequencing section. This means 2.3's PR
  opens after 2.2 has merged to main. The constraint is the
  closer commitment (closure-burden is in *this* plan; splitting
  it across a PR shipping before 2.2 would split the closure
  story), not a technical dependency on 2.2's section JSX.
  Mitigation: execution step 3's reality-check confirms 2.2
  ship status before the PR opens; if 2.2 has not yet landed,
  the implementer waits for 2.2 to merge. If product pressure
  flips the order such that 2.3 must ship first, the closer
  responsibility transfers to whichever phase ships last via a
  plan revision in the same PR (not informally) — the revision
  moves the closure-burden contracts (M2 closure documentation,
  Status-flip and scoping-deletion) to the new closer's plan
  and out of this plan; the role-door section remains here. The
  plan-time expectation is the recommended ship order holds
  (2.1 → 2.2 → 2.3).
- **Sibling PR drift on the home page surface.** A sibling
  refactor between scoping and implementation could
  restructure
  [`apps/site/app/page.tsx`](/apps/site/app/page.tsx) or the
  `apps/site/components/home/` family in a way that the
  append-to-main rule and CSS-extension rule no longer match.
  Mitigation: execution step 3's reality-check re-reads the
  page and component tree; if structural drift surfaces, the
  implementer adapts the rules to whatever is canonical at
  implementation time and records the deviation.
- **Doc-currency edit-target drift.** The cited line numbers
  in README + architecture + product may have shifted between
  scoping and implementation. Mitigation: execution step 8
  re-greps each doc at edit time to find the current right
  edit target; if a doc has been already updated to describe
  the post-M2 surface, the corresponding currency entry is a
  no-op recorded in the PR body.

## Backlog Impact

Reference:
[m2-home-page-rebuild.md §Backlog Impact](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md).

This PR closes the M2 milestone; the home-page-rebuild
capability is complete after this PR ships. The epic-level
"rebuilt home page that surfaces the two test events with
theme-distinct previews and frames the platform honestly"
capability closes when this PR lands.

The epic's Milestone Status table M2 row flips
`Proposed` → `Landed`; the top-level epic Status remains
`Proposed` per the epic's "When M1–M3 show `Landed`, the
first-iteration scope is complete" rule and "the top-level
Status of this epic does not flip to `Landed` from
first-iteration close alone." M3 still has to ship for the
first-iteration to close.

If implementation surfaces new follow-up entries (post-MVP
features like richer role-door interactivity, per-role landing
pages with deeper persona context, Riverside-anchored
role-door variants, etc.), the implementer adds them to
[`docs/backlog.md`](/docs/backlog.md) per AGENTS.md "Feature-
Time Cleanup And Refactor Debt Capture" and records the
addition in the PR body.

## Related Docs

- [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  parent milestone doc. Owns Cross-Phase Invariants,
  Documentation Currency map, Cross-Phase Risks, Cross-Phase
  Decisions, and Backlog Impact this plan binds by reference.
  Top-level Status flips in this PR.
- [`scoping/m2-phase-2-3.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-3.md) —
  scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the ten scoping decisions absorbed
  above; deletes in this same PR per the milestone-terminal
  cleanup rule.
- [`m2-phase-2-1-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
  — predecessor plan. Provides the `.home-shell` foundation
  this phase plugs into, the section-component composition
  idiom this phase mirrors, the brand-token discipline
  contract this phase inherits by reference, the responsive-
  grid pattern this phase extends from 2-column to 3-column,
  and the noindex curl falsifier procedure this phase reuses.
- [`m2-phase-2-2-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md)
  — sibling plan. Provides the per-persona auth-honesty copy
  contract this phase agrees with substantively (different
  surface, same substantive claim). The "Auth-caveat copy
  drift between narrative and role-doors before 2.3 lands"
  risk in 2.2's plan is mitigated by this phase's per-role
  auth-honesty copy contract.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic. M2 paragraph at lines 199-218; Milestone Status
  table M2 row flips in this PR.
- [`m1-themescope-wiring.md`](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md)
  — predecessor milestone doc. M1 supplied the apps/web
  ThemeScope wiring on the role-door target surfaces (admin,
  redeem) so partners clicking through see per-event Themed
  apps/web shells.
- [`themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md)
  — follow-up that frames the derived-shade discipline rule
  the brand-token discipline contract above binds by reference.
  M2 phase 2.3 does not depend on this follow-up landing first;
  the no-`<ThemeScope>`-wrap contract sidesteps the cascade
  issue entirely for this phase.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  — predecessor epic. Delivered the apps/web admin / redeem /
  gameplay surfaces the role-doors target.
- [`apps/site/components/event/EventCTA.tsx`](/apps/site/components/event/EventCTA.tsx)
  — apps/site → apps/web cross-app hard-navigation precedent
  (plain `<a href={routes.X(slug)}>`). The cross-app
  navigation contract above mirrors this pattern.
- [`apps/site/components/home/EventShowcaseCard.tsx`](/apps/site/components/home/EventShowcaseCard.tsx)
  — predecessor card composition pattern; RoleDoorCard mirrors
  the eyebrow → heading → body → link affordance shape at
  similar density.
- [`shared/urls/routes.ts`](/shared/urls/routes.ts) — URL
  builders the role-doors consume (`game`, `eventAdmin`,
  `gameRedeem`).
- [`apps/web/src/pages/GamePage.tsx`](/apps/web/src/pages/GamePage.tsx)
  — Attendee target; public; basis for Attendee no-caveat
  copy.
- [`apps/web/src/pages/EventAdminPage.tsx`](/apps/web/src/pages/EventAdminPage.tsx)
  — Organizer target; auth-gated; basis for Organizer caveat
  copy.
- [`apps/web/src/pages/EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx)
  — Volunteer target; auth-gated; basis for Volunteer caveat
  copy.
- [`apps/site/CLAUDE.md`](/apps/site/CLAUDE.md) and
  [`apps/site/AGENTS.md`](/apps/site/AGENTS.md) — "This is NOT
  the Next.js you know." Implementation reads relevant
  Next.js docs in `node_modules/next/dist/docs/` if the
  role-doors surface any Next.js-specific API uncertainty
  (none anticipated for a server component composing existing
  components and emitting plain `<a>` anchors).
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, Plan-to-PR
  Completion Gate, Doc Currency PR Gate, Cross-app destinations
  need hard navigation, Bans on surface require rendering the
  consequence.
