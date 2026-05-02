# Scoping — M2 phase 2.3 (apps/site home-page role-door entry points + M2 closure)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
absorbs into
[m2-home-page-rebuild.md](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md);
durable per-phase content absorbs into
`docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md`.

## Phase summary

Phase 2.3 adds three "role-door" entry points to the apps/site
home page (Attendee / Organizer / Volunteer) and carries the M2
milestone's closure work: README + architecture + product
currency updates, the M2 milestone-doc Status flip
`Proposed` → `Landed`, and the epic Milestone Status table M2
row flip `Proposed` → `Landed`. After 2.3 a partner can land on
`/`, see the hero + two-event showcase + Harvest narrative
(2.1 + 2.2), and click into one of three role-shaped surfaces in
apps/web — gameplay (no auth), admin authoring (auth-gated),
volunteer redemption booth (auth-gated) — each with copy that
honestly names the auth state of its target until M3 lands the
test-event demo-mode bypass.

The role-door section plugs into the `.home-shell` CSS scope
2.1 introduced and lives below 2.2's narrative section in the
same `<main>`. apps/web is not edited by this phase; the three
role-door targets are existing apps/web routes
([`/event/:slug/game`](/apps/web/src/pages/GamePage.tsx),
[`/event/:slug/admin`](/apps/web/src/pages/EventAdminPage.tsx),
[`/event/:slug/game/redeem`](/apps/web/src/pages/EventRedeemPage.tsx))
that the role-doors hard-navigate to via the apps/web Vercel
rewrite layer. M3 inherits the auth-state honesty copy 2.3
ships and updates it when the test-event bypass lands.

**Sibling-phase state at scoping time.** 2.2's plan landed
([m2-phase-2-2-plan.md](/docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md),
Status `Proposed`); its implementation PR has not yet shipped.
2.3 scoping inherits 2.2's locked decisions (per-persona
caveats, narrative is link-free, narrative wraps in Harvest
Theme) and resolves the cross-phase expectations 2.2 left for
2.3's planning session — see the
[Cross-phase coordination — 2.2 ↔ 2.3](#cross-phase-coordination--22--23)
section below.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
code citation that proves the load-bearing claim. These
decisions are absorbed into the plan's contract sections and
out-of-scope list during plan-drafting; the deliberation prose
(rejected alternatives) lives here through scoping's transient
lifetime.

### 1. PR shape — single PR, with per-role split fallback authorization [Resolved → Option A]

**What was decided.** Whether 2.3 ships as one PR (three role-
doors + section CSS + M2 closure docs + Status flips), as
per-role sub-phases per the milestone doc's named 4-phase
variant (`2.3.1 Attendee / 2.3.2 Organizer / 2.3.3 Volunteer`),
or as two PRs along a "role-doors / M2 closure docs" seam.

**Why it mattered.** AGENTS.md "PR-count predictions need a
branch test" requires the phase planning session to re-derive
the milestone-doc estimate against actual scope. The milestone
doc explicitly authorizes 2.3 to split per-role "if any role's
entry surface grows beyond a single card (for example,
Volunteer's entry point may want honest demo-mode framing copy
that benefits from focused review)."

**Options considered.**

1. **Single PR (Option A).** All scope in one change.
2. **Per-role sub-phases (Option B).** 2.3.1 ships Attendee
   role-door + section shell (and Status table seed for the
   sub-phases); 2.3.2 ships Organizer role-door; 2.3.3 ships
   Volunteer role-door + M2 closure docs + Status flips.
3. **Two PRs along role-doors / closure-docs (Option C).**
   2.3.1 ships all three role-doors; 2.3.2 ships README +
   architecture + product currency updates and M2 Status flips.

**Pros / cons.**

- *Option A.* Pro: smallest review-overhead total; reviewer sees
  the three role-doors as one composed surface (the side-by-side
  comparison is itself the editorial point — "here are the three
  roles the platform serves") and the M2 closure burden lands as
  one coherent change with the closing surface. Aligns with the
  M1 phase 1.1 / M2 phase 2.1 single-PR precedent. Con: if any
  role's copy or composition surfaces unexpected scope tension,
  the PR grows past branch-test thresholds.
- *Option B.* Pro: per-role focused review of honesty-copy
  contracts (especially Volunteer's auth-gated framing). Con:
  inflates milestone phase count from 3 to 5 against the
  milestone doc's 3-phase estimate; 2.3.1 ships an
  intermediate-state home page with one role-door visible (no
  editorial story — partners would reasonably ask "what about
  the other roles?"); fragments one cohesive section across
  three reviews. The role-doors share a single section component
  and CSS scope, so per-role review is per-card review of the
  same component, not per-component review of distinct surfaces.
- *Option C.* Pro: separates "code change" review from "doc
  currency" review. Con: the M2 closure docs *describe* the
  shipping role-doors; reviewing them apart from the role-doors
  forces the reviewer to context-switch between the merged
  role-door PR and the doc-currency PR. Inflates milestone phase
  count to 4 with no clear review benefit. The
  Plan-to-PR Completion Gate already requires the implementing
  PR to flip Status in the same change — splitting the docs into
  a separate PR makes the closure burden doubly indirect.

**Branch-test analysis (per AGENTS.md "PR-count predictions need
a branch test").**

Subsystems touched by Option A:
1. apps/site home-page route
   ([apps/site/app/page.tsx](/apps/site/app/page.tsx) — append
   `<RoleDoors />` section to existing `<main>`).
2. apps/site home-page components — new
   `apps/site/components/home/RoleDoors.tsx` plus a per-role
   card component (single shared component or three per-role
   components — plan-drafting decides per decision 4 below).
3. apps/site CSS surface
   ([apps/site/app/globals.css](/apps/site/app/globals.css) — new
   `.home-roles*` selectors under the `.home-shell` scope).
4. Milestone-doc Phase Status table 2.3 row flip + Status flip;
   epic Milestone Status table M2 row flip.
5. Doc currency: [README.md](/README.md),
   [docs/architecture.md](/docs/architecture.md),
   [docs/product.md](/docs/product.md) — narrative updates
   reflecting the post-M2 home-page surface inventory.

Five subsystems is at the AGENTS.md ">5 distinct subsystems"
threshold but does not exceed it. LOC: role-door section is one
section component (~30 LOC) + three card invocations or one
shared card component (~50 LOC); CSS additions are ~50–100 LOC
under `.home-roles*`; doc currency updates touch a handful of
paragraphs across three files (~30–50 LOC of doc edits);
Status-flip table edits are ~5 LOC across two doc files. Total
substantive logic ~150–250 LOC, well below the ">300 LOC"
threshold. Doc currency edits dominate the diff line count but
each doc's edit is a tightly-bounded paragraph-or-two
replacement, not a structural rewrite.

**Came down to.** Whether the M2 closure docs are review-
distinct from the role-door code or part of the same coherent
change. They are part of the same change — the docs *describe*
the shipping surface, and reviewing the doc edits without seeing
the surface they describe is exactly the context-switch the
Plan-to-PR Completion Gate exists to avoid. The M1 phase 1.1
and M2 phase 2.1 precedents (single PR, code + doc currency +
Status flip together) carry forward.

**Resolution.** **Option A (single PR).** The plan binds the
single-PR shape and names the validation gate procedure (capture
of the role-door section in isolation + capture of the
cumulative full home page after 2.2 has landed + outbound-link
audit + noindex curl falsifier). Status flips Proposed →
Landed in the single PR per AGENTS.md "Plan-to-PR Completion
Gate."

**Fallback authorization.** If implementation surfaces
composition or scope tension beyond a reasonable in-PR review
surface — operationally defined as the section component
exceeding ~150 LOC, or the per-role copy contracts diverging
enough that one role's review attention masks another's, or the
M2 closure doc updates touching more than the named three
files — the implementer splits along an Option C seam mid-
flight: 2.3.1 ships all three role-doors + section CSS; 2.3.2
ships M2 closure docs + Status flips. (Per-role splits per
Option B remain a non-default; choose Option C over Option B if
splitting becomes necessary.) This authorization is named here
so the implementer doesn't relitigate the call under review
pressure. The pre-implementation expectation is one PR; the M1
phase 1.1 / M2 phase 2.1 precedents put probability strongly on
that side.

**Verified by:**
[apps/site/app/page.tsx:19-26](/apps/site/app/page.tsx)
(2.1-shipped page composition; 2.3 appends one section);
[apps/site/components/home/](/apps/site/components/home/)
(existing 3-file home component family —
HomeHero / TwoEventShowcase / EventShowcaseCard — that 2.3
extends);
[m2-phase-2-1-plan.md](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
(predecessor single-PR shape that landed via PR #153).

### 2. Role-door layout shape [Resolved → three side-by-side cards on desktop, stacked on narrow viewports]

**What was decided.** Whether the three role-doors render as a
horizontal row of three cards on desktop (responsive stack on
mobile), three vertically-stacked rows on every viewport, a
two-column-plus-one asymmetric layout, or another shape.

**Why it mattered.** The shape drives the JSX structure and the
new `.home-roles*` CSS surface. The milestone doc's
"Internal-partner honesty" invariant binds the editorial weight
each role gets — a layout that privileges one role implicitly
mischaracterizes the platform's role model.

**Options considered.**

1. **Three side-by-side cards on viewports ≥ desktop breakpoint,
   stacking single-column on narrow viewports (responsive grid).**
   Mirrors the side-by-side pattern 2.1's two-event showcase
   established (which also responsive-stacks below 720px).
2. **Three stacked rows on every viewport.** Simpler CSS;
   verbose vertically.
3. **Two-column-plus-one asymmetric (e.g., Attendee row, then
   Organizer + Volunteer side-by-side).** Privileges Attendee
   editorially.
4. **Tabbed interface (Attendee tab / Organizer tab / Volunteer
   tab).** One role visible at a time.

**Pros / cons.**

- *Option 1.* Pro: three roles visible in one frame on desktop,
  consistent with 2.1's responsive grid idiom; partner sees the
  three-role editorial story at a glance. Con: requires a
  three-column grid (`grid-template-columns: repeat(3, 1fr)`) at
  the desktop breakpoint, one new selector layer beyond 2.1's
  two-column. Three columns may compress card content on
  mid-width viewports (~720–960px); plan-drafting confirms the
  breakpoint and considers whether the grid needs an
  intermediate two-column step.
- *Option 2.* Pro: simplest CSS. Con: a partner scrolling never
  sees the three-role editorial story in one frame; weakens the
  "three doors, one platform" framing that justifies grouping
  the roles into a section in the first place.
- *Option 3.* Con: no editorial reason to privilege Attendee
  over Organizer or Volunteer; the epic treats them as peer
  role-doors. Asymmetry would mischaracterize the role model.
- *Option 4.* Con: hides two roles behind clicks; same trap 2.1
  rejected for the showcase (decision 2 there). Drags in a
  `'use client'` boundary the milestone doc's Framework default
  flags as phase-time-only when interactivity is genuinely
  needed — it isn't here. Also undermines the "three doors
  visible at once" editorial story.

**Came down to.** Whether the three-roles-side-by-side framing
is the load-bearing visual claim. It is — the milestone doc's
"three role-door entry points" framing is structurally parallel
to 2.1's "two-event showcase" framing, and the responsive-grid
idiom 2.1 established is the natural shape for 2.3's parallel
section.

**Resolution.** **Option 1.** Three cards in a responsive grid:
`grid-template-columns: repeat(3, 1fr)` at the desktop
breakpoint, single-column below. Plan-drafting confirms the
exact breakpoint against 2.1's `.home-showcase-grid` precedent
and decides whether an intermediate two-column step is needed
for mid-width viewports.

**Verified by:**
[apps/site/app/globals.css:758-768](/apps/site/app/globals.css)
(2.1's `.home-showcase-grid` responsive-grid precedent: 1-column
mobile, 2-column desktop with 24px gap — 2.3 mirrors the idiom
with 3 columns at desktop);
[m2-phase-2-1.md decision 2](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md)
(predecessor responsive-grid resolution this mirrors).

### 3. Per-role target URL choices [Resolved → Attendee → routes.game(slug); Organizer → routes.eventAdmin(slug); Volunteer → routes.gameRedeem(slug)]

**What was decided.** Which URL each role-door's primary link
points to. The role-door is the editorial framing ("this is
where an Attendee enters") and the URL is the destination
contract.

**Why it mattered.** Each role has multiple plausible
destinations, and each destination has a different auth state
that the role-door's copy must honestly name (per the milestone
doc's "Role-door honesty against current auth state" Cross-Phase
Invariant). The choice cascades into the validation gate
(outbound-link audit) and into the M3 inheritance contract (M3
revises copy when bypass lands, so M3's plan needs to know which
URLs were claimed).

**Per-role options considered.**

**Attendee.**
1. `routes.game(harvest-block-party)` (apps/web gameplay shell)
   — single test event hardcoded.
2. `routes.eventLanding(harvest-block-party)` (apps/site rich
   event landing) — same-app navigation; rich landing has its
   own CTA into gameplay.
3. Both test events offered — two CTAs ("Play Harvest" / "Play
   Riverside"), or a slug-picker.

**Organizer.**
1. `routes.eventAdmin(harvest-block-party)` (apps/web per-event
   admin authoring) — direct into the per-event editor.
2. `routes.admin` (apps/site root admin list) — entry into the
   platform admin list page where organizers pick an event.
3. Both — primary link to one, secondary link to the other.

**Volunteer.**
1. `routes.gameRedeem(harvest-block-party)` (apps/web volunteer
   redemption booth) — single test event hardcoded.
2. Both test events offered.
3. `routes.gameRedemptions(harvest-block-party)` (apps/web
   organizer redemption-monitoring view) — distinct surface
   intended for organizers monitoring redemption activity, not
   volunteers performing redemptions.

**Pros / cons by role.**

- *Attendee Option 1.* Pro: shortest path to "what does the
  attendee actually do" — the gameplay shell is the experience.
  Cross-app to apps/web; binds the cross-app hard-navigation
  invariant. Public route with no auth gate
  ([GamePage.tsx](/apps/web/src/pages/GamePage.tsx) has zero
  `useAuthSession` references), so Attendee's role-door copy
  honestly says "Play now" or similar — no auth caveat. Con:
  bypasses the rich event landing 2.1's showcase already funnels
  partners through; the role-door section sits *below* the
  showcase, so partners who want event context already have it
  from the cards above.
- *Attendee Option 2.* Con: 2.1's showcase cards already point
  here (decision 3 in 2.1's scoping). Duplicating the destination
  in the role-door section adds two surfaces with the same
  target, which mis-frames "the role-door is the entry into the
  Attendee experience" — the role-door becomes a redundant
  showcase repeat.
- *Attendee Option 3.* Con: introduces a slug-picker UI element
  for one role-door; over-builds the section's editorial weight
  and creates per-role asymmetry (Organizer / Volunteer would
  also need pickers, or the section reads inconsistently). The
  three-role-doors framing is "one card per role," not "one card
  per role per event."
- *Organizer Option 1.* Pro: direct entry into the admin
  surface organizers actually use day-to-day; cross-app to
  apps/web; binds cross-app hard-navigation. Auth-gated
  ([EventAdminPage.tsx:132,143-157](/apps/web/src/pages/EventAdminPage.tsx)),
  so Organizer's role-door copy carries the auth-state honesty
  caveat. Con: hardcodes one test-event slug.
- *Organizer Option 2.* Con: apps/site `/admin` is the platform
  admin *list* (multi-event), not a single event's authoring
  view. Same-app navigation, but the destination is "pick an
  event" rather than "do organizer work." Auth-gated under
  apps/site's `(authenticated)` layout group at
  [apps/site/app/(authenticated)/admin/page.tsx](/apps/site/app/(authenticated)/admin/page.tsx),
  so the auth-state caveat still applies but the editorial
  framing is one indirection further from "this is what an
  organizer does." Considered: pointing the role-door at
  `routes.admin` may also drift toward implying the platform has
  multi-event organizer accounts in production, which it does
  not — `/admin` is currently a root-admin platform surface, not
  a per-organizer view (per [apps/site/app/(authenticated)/admin/page.tsx:113](/apps/site/app/(authenticated)/admin/page.tsx)).
- *Organizer Option 3.* Con: doubles the role-door's link
  surface; turns the door into a small navigation menu and
  weakens the single-destination framing the role-door section
  exists to provide.
- *Volunteer Option 1.* Pro: direct entry into the redemption
  booth, which IS the volunteer surface; cross-app to apps/web;
  binds cross-app hard-navigation. Auth-gated
  ([EventRedeemPage.tsx:132-161](/apps/web/src/pages/EventRedeemPage.tsx)),
  so Volunteer's role-door copy carries the auth-state honesty
  caveat. Con: hardcodes one test-event slug.
- *Volunteer Option 2.* Con: same as Attendee Option 3 — adds
  a slug-picker for one role-door and creates per-role
  asymmetry.
- *Volunteer Option 3.* Con: `routes.gameRedemptions` is the
  organizer monitoring view, not the volunteer-side surface.
  Mis-routing volunteers to the monitoring view would be a
  copy/destination mismatch.

**Came down to.** Whether the role-doors are "one card per
role pointing at the canonical role-shaped surface" or "a small
navigation menu per role offering multiple paths." The milestone
doc's "three role-door entry points" framing implies single
canonical destinations, and the per-role asymmetry consideration
above (slug-pickers for some roles but not others, or
multi-link cards for some but not others) makes the
single-canonical-destination shape the clean call.

**Slug picking.** All three event-scoped destinations
(`routes.game`, `routes.eventAdmin`, `routes.gameRedeem`) need a
slug; per the single-canonical-destination resolution, all three
hardcode to `harvest-block-party`. Hardcoding to Harvest matches
the milestone doc's "end-to-end Harvest narrative" framing for
2.2 — a partner reads the Harvest narrative and then clicks into
role-shaped surfaces for the same event, maintaining narrative
continuity. Plan-drafting confirms the slug constant is shared
between role-door cards (declared once, consumed three times) so
swapping the demo's anchor event is a one-line change.

**Resolution.**
- **Attendee:** `routes.game("harvest-block-party")`. Public
  route; copy says "Play the demo" or similar with no auth
  caveat.
- **Organizer:** `routes.eventAdmin("harvest-block-party")`.
  Auth-gated; copy carries the auth-state honesty caveat the
  Cross-Phase Invariant binds.
- **Volunteer:** `routes.gameRedeem("harvest-block-party")`.
  Auth-gated; copy carries the auth-state honesty caveat.

The cross-app hard-navigation invariant applies to all three
destinations (all three are apps/web routes behind the apps/web
Vercel rewrite). Plan-drafting writes the exact link shape
(`<a href={routes.X(slug)}>`) per the apps/site → apps/web
precedent at
[`EventCTA.tsx:24`](/apps/site/components/event/EventCTA.tsx).

**Cross-phase agreement with 2.2 decision 6.** 2.2 ships zero
outbound links from the narrative; the narrative is descriptive
prose only. With this resolution, the home page after M2 has
exactly one outbound-link surface per concern: 2.1's showcase
cards carry the same-app `routes.eventLanding(slug)` links
into the rich event landings; 2.3's three role-doors carry the
cross-app `routes.{game,eventAdmin,gameRedeem}(slug)` links
into apps/web role surfaces. The role-doors are the **sole**
cross-app click-through layer from `/`, confirming the surface-
job separation 2.2 commits to.

**Verified by:**
[apps/web/src/pages/GamePage.tsx](/apps/web/src/pages/GamePage.tsx)
(no `useAuthSession` reference — gameplay is public; verified by
grep);
[apps/web/src/pages/EventAdminPage.tsx:132,143-157](/apps/web/src/pages/EventAdminPage.tsx)
(`useAuthSession()` + `useOrganizerForEvent(slug)` gate);
[apps/web/src/pages/EventRedeemPage.tsx:132-161](/apps/web/src/pages/EventRedeemPage.tsx)
(`useAuthSession()` + `authorizeRedeem(slug)` gate);
[shared/urls/routes.ts:33-36](/shared/urls/routes.ts) (the
`game`, `eventAdmin`, `gameRedeem` builders);
[apps/site/components/event/EventCTA.tsx:7-10,24](/apps/site/components/event/EventCTA.tsx)
(apps/site → apps/web hard-navigation precedent — plain `<a>`,
not `<Link>`);
[apps/site/app/(authenticated)/admin/page.tsx:113](/apps/site/app/(authenticated)/admin/page.tsx)
(apps/site `/admin` is the platform admin list, not a per-event
authoring view — basis for rejecting Organizer Option 2 alone).

### 4. Per-card component shape — single shared card component vs three per-role cards [Resolved → single shared `RoleDoorCard`]

**What was decided.** Whether the three role-doors render via a
single shared `RoleDoorCard` component instantiated three times
with different props (label / target / copy / auth-caveat flag),
or three distinct per-role components
(`AttendeeRoleDoor` / `OrganizerRoleDoor` / `VolunteerRoleDoor`)
that each compose their own JSX.

**Options considered.**

1. **Single shared `RoleDoorCard` component with role-shaped
   props.** Mirrors how
   [EventShowcaseCard](/apps/site/components/home/EventShowcaseCard.tsx)
   (one component, two invocations) compose 2.1's two-event
   showcase.
2. **Three per-role components.** One per role, with
   role-specific JSX.
3. **Inline JSX in `RoleDoors.tsx` section.** No per-card
   component at all — the three cards live as three sibling JSX
   blocks inside the section.

**Pros / cons.**

- *Option 1.* Pro: one component to test, one CSS class set
  (`.home-role-door-card` and friends), three editorial
  invocations. Mirrors the 2.1 EventShowcaseCard precedent
  exactly. The role-doors are structurally identical (eyebrow
  label / role title / one-paragraph framing / one outbound
  link) — the per-role variation lives in props, not in
  component structure. Con: the auth-caveat copy is conditional
  per role (Attendee has none; Organizer / Volunteer carry the
  caveat); plan-drafting decides the prop shape that expresses
  this without growing into a flag-soup.
- *Option 2.* Con: 3× the component count for no per-role
  structural divergence; inflates `apps/site/components/home/`
  with sibling files that are 90% identical. Easier to drift
  when the role-door pattern wants a tweak (e.g., a hover
  affordance change has to happen in three places).
- *Option 3.* Con: no reuse, no test surface, more JSX in one
  file. The pattern is sufficiently structural to deserve its
  own component the way EventShowcaseCard does for the
  two-event showcase.

**Came down to.** Whether the per-role variation is structural
or editorial. It is editorial — same shape, different copy and
target. The single-shared-component precedent applies.

**Resolution.** **Option 1.** A single
`apps/site/components/home/RoleDoorCard.tsx` component
instantiated three times by
`apps/site/components/home/RoleDoors.tsx` (the section wrapper).
Plan-drafting decides the exact prop shape — likely
`{ eyebrow, title, description, href, authCaveat? }` where
`authCaveat` is an optional string that renders inside the card
when present. Plan-drafting also decides whether `href` carries
typing that distinguishes same-app vs cross-app destinations
(probably no — all three role-door targets are cross-app, so a
type distinction would be over-built for the current shape).

**Verified by:**
[apps/site/components/home/EventShowcaseCard.tsx](/apps/site/components/home/EventShowcaseCard.tsx)
(2.1 single-shared-component precedent: one component, two
invocations from
[TwoEventShowcase](/apps/site/components/home/TwoEventShowcase.tsx)).

### 5. Auth-state honesty copy contract [Resolved → role-specific framing per target's auth gate; "Sign in to <X>" pattern for auth-gated targets]

**What was decided.** The exact copy contract for each
role-door's auth-state honesty. The milestone doc's "Role-door
honesty against current auth state" Cross-Phase Invariant binds
the rule ("e.g., 'Sign in or wait for demo mode'") and names
this as the contract M3 inherits.

**Why it mattered.** This is the load-bearing copy contract M3
revises when the test-event demo-mode bypass lands. Locking the
shape in 2.3's plan gives M3 a single concrete target instead
of a re-deliberation surface. The contract also has an
editorial honesty dimension — overpromising at 2.3 ("Try the
admin now!") would lead a partner into a sign-in dead-end.

**Options considered.**

1. **Role-specific framing per target's auth state.**
   Attendee's gameplay is public — copy says "Play the demo" or
   similar with no auth caveat. Organizer / Volunteer are
   auth-gated — copy says "Sign in to <do the role's thing>"
   with an explicit "(or wait for demo-mode access)" addendum.
2. **Uniform "sign in or wait for demo mode" caveat across all
   three roles.** Same caveat regardless of whether the target
   is auth-gated.
3. **No auth caveat anywhere; rely on the target page's
   existing sign-in form to honor the gate.**

**Pros / cons.**

- *Option 1.* Pro: each role's copy honestly describes its
  target's actual auth state at this iteration boundary; partners
  hit the door, see the framing, and the experience matches.
  M3's revision contract is per-role: revise Organizer + Volunteer
  copy when the bypass lands; Attendee copy is unchanged because
  Attendee was already public. Con: per-role copy variation;
  plan-drafting writes three slightly-different framings.
- *Option 2.* Con: dishonest for Attendee — the gameplay
  surface has zero auth gate today, so "sign in or wait for
  demo mode" mischaracterizes the experience the door opens
  into. Partners would sign in for no reason or wait for a bypass
  that isn't needed. Misframes the platform's role model
  (Attendee has always been public; auth lives at the
  organizer/volunteer trust boundary).
- *Option 3.* Con: violates the milestone doc's invariant
  explicitly ("Drift to 'Try it now' / 'Click to play' copy
  without an auth-gate caveat would mislead a partner into a
  sign-in dead-end"). Auto-rejected.

**Came down to.** Whether the auth caveat is uniform per
section or per role's actual gate. Per-role is the honesty
position — the Cross-Phase Invariant says copy must "name the
auth requirement" *for auth-gated targets*; Attendee has no
auth requirement, so the rule does not require a caveat there.

**Resolution.** **Option 1.** Plan-drafting writes the exact
copy per role; the contract this scoping locks is the *shape*:

- **Attendee** (target: gameplay shell, public): no auth
  caveat. Copy frames the door as "play the demo" with no
  sign-in mention.
- **Organizer** (target: per-event admin authoring,
  auth-gated): auth caveat present. Copy frames the door as
  "sign in to [author this event] (or wait for demo-mode
  access)" or similar — the "(or wait for demo-mode access)"
  parenthetical is the M3-inheritable caveat M3 removes when
  the bypass lands.
- **Volunteer** (target: redemption booth, auth-gated): same
  caveat shape as Organizer.

M3's plan inherits this contract: M3 revises Organizer and
Volunteer copy to drop the auth caveat (and may add a
"demo-mode active" framing) in the same PR that lands the
bypass; Attendee copy is unchanged. The plan body's Risk
Register restates the M2-doc-noted "role-door copy drift between
M2 and M3" risk with this concrete contract as the mitigation.

**Cross-phase agreement with 2.2 decision 5.** 2.2 ships
per-persona auth-state caveats *in the narrative prose* on the
same substantive claim shape: Attendee no caveat, Organizer +
Volunteer carry the magic-link sign-in caveat with M3-bypass-
pending framing. The narrative caveat and the role-door caveat
are not expected to be byte-identical (different surfaces,
different density, different attention contexts) but MUST agree
on the substantive claim — same role-set, same auth gates, same
M3-bypass-pending. M3's PR revises both surfaces in the same
change. See the
[Cross-phase coordination — 2.2 ↔ 2.3](#cross-phase-coordination--22--23)
section below for the bidirectional record.

**Verified by:**
[m2-home-page-rebuild.md "Role-door honesty against current auth state"](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone-doc Cross-Phase Invariant);
[apps/web/src/pages/GamePage.tsx](/apps/web/src/pages/GamePage.tsx)
(no auth-gate present — basis for Attendee's no-caveat
framing);
[apps/web/src/pages/EventAdminPage.tsx:25-29](/apps/web/src/pages/EventAdminPage.tsx)
("Sign in to manage this event" — apps/web vocabulary
precedent for the "sign in to <X>" framing 2.3's Organizer
copy mirrors);
[apps/web/src/pages/EventRedeemPage.tsx:31-35](/apps/web/src/pages/EventRedeemPage.tsx)
("Sign in to redeem codes" — same vocabulary precedent for
Volunteer);
[m2-home-page-rebuild.md "Role-door copy drift between M2 and M3"](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone-doc Cross-Phase Risk; this resolution is its
mitigation);
[scoping/m2-phase-2-2.md decision 5](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md)
(sibling-phase per-persona caveat resolution; substantive-claim
agreement counterpart this resolution agrees with).

### 6. Role label vocabulary — introduce "Attendee / Organizer / Volunteer" at the role-door surface [Resolved → introduce here]

**What was decided.** Whether the role-door section uses the
role labels "Attendee," "Organizer," "Volunteer" verbatim from
the epic and milestone doc, or whether it adopts apps/web's
existing surface vocabulary ("event authoring," "redemption,"
"redemption monitoring"), or whether it invents a new
home-page-level vocabulary.

**Why it mattered.** Code reconnaissance confirmed apps/web
does **not** currently use "Attendee / Organizer / Volunteer"
as user-facing labels — the eyebrow text on its sign-in
surfaces describes the *surface* ("Event authoring,"
"Redemption," "Redemption monitoring"), not the role. The
home-page role-doors are the first surface that names the
role-as-actor. If the home page adopts vocabulary that doesn't
appear elsewhere, partners might be unsure which role-door
maps to which surface.

**Options considered.**

1. **Use "Attendee / Organizer / Volunteer" verbatim.** The
   epic and milestone doc both use these labels; the home page
   makes them user-facing.
2. **Adopt apps/web's surface vocabulary at the role-door
   level** ("Event authoring," "Redemption," "Game"). Each
   door's title matches the surface it opens.
3. **Combine: title with role label, sub-eyebrow with surface
   name** ("Attendee / Play the demo," "Organizer / Author
   events," "Volunteer / Redeem codes").

**Pros / cons.**

- *Option 1.* Pro: matches the epic's role-door framing
  (the role IS the editorial point, not the surface);
  internal-partner audience reads roles before surfaces; the
  vocabulary asks "who are you in this story?" before "what do
  you do?" Con: introduces vocabulary not yet present in
  apps/web; partner clicking through lands on surfaces with
  different copy ("Sign in to manage this event," not "sign in
  as Organizer"). The mismatch is small (the surfaces' own
  copy still makes sense), but it exists.
- *Option 2.* Con: the role-doors aren't surface entries — they
  are role-shaped framings of which platform pieces serve which
  audiences. "Event authoring" describes a surface; "Organizer"
  describes a person. The home-page editorial story is "the
  platform serves three kinds of people," and surface-named
  role-doors lose that framing.
- *Option 3.* Pro: bridges both vocabularies — partner reads
  role first, then surface. Con: more copy density per card;
  more decision space for the plan to pin down (which font /
  styling for each tier).

**Came down to.** Whether the role-door section's job is to
frame *people* or to frame *surfaces*. The epic and milestone
doc both frame people ("attendee/organizer/volunteer roles");
the role-door section is the user-facing rendering of that
framing. Surface vocabulary lives on the destination page
itself.

**Resolution.** **Option 1.** Role-door titles use "Attendee,"
"Organizer," "Volunteer" verbatim. Each card's body copy
naturally references the surface the door opens (e.g.,
"Organizer" card body might say "Sign in to author this event").
Plan-drafting writes the exact copy; the contract this scoping
locks is the role-label vocabulary at the title level.

The Option 3 hybrid (eyebrow with surface name above the role
title) is **not** rejected as wrong — plan-drafting may opt
into it if the resulting copy reads more clearly. The contract
binds only: titles use the role labels.

**Verified by:**
[apps/web/src/pages/EventAdminPage.tsx:25,29](/apps/web/src/pages/EventAdminPage.tsx)
("Event authoring" eyebrow + "Sign in to manage this event"
heading — confirms apps/web uses surface-not-role vocabulary,
which the role-doors intentionally diverge from);
[m2-home-page-rebuild.md Goal section](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
("three role-door entry points (Attendee / Organizer /
Volunteer)" — milestone-doc role-label vocabulary verbatim);
[demo-expansion epic.md Goal section](/docs/plans/epics/demo-expansion/epic.md)
("threads visitors through attendee/organizer/volunteer
roles" — epic-level vocabulary).

### 7. Validation gate procedure for role-doors + cumulative page render [Resolved → role-door section capture + cumulative full-page capture (post-2.2) + outbound-link audit + noindex falsifier]

**What was decided.** What the plan's Validation Gate exercises
to confirm 2.3's claims hold.

**Why it mattered.** Three load-bearing claims need exercise:
(a) the three role-doors render as a side-by-side grid on
desktop and stack on mobile (decision 2 binds the layout
contract); (b) the outbound links go to the correct apps/web
URLs and use hard navigation per the cross-app invariant; (c)
the cumulative home page (hero + showcase + Harvest narrative
+ role-doors) doesn't bloat past partner-readability per the
milestone-doc page-length-sprawl risk.

**Options considered.**

1. **Role-door section capture (desktop + narrow viewport) +
   cumulative full-page capture (post-2.2) + outbound-link
   audit + noindex curl falsifier.** Four artifacts; each
   targets one load-bearing claim.
2. **Role-door section capture only.** Skip the cumulative-page
   check; rely on visual inspection of the section in isolation.
3. **DevTools `Network` tab inspection of each outbound
   link's HTTP response.** Confirms the apps/web Vercel rewrite
   layer fires (200 from apps/web, not 404 from apps/site).
4. **Tier 5 production smoke** with a `Status: In progress
   pending prod smoke` per
   [`docs/testing-tiers.md`](/docs/testing-tiers.md).

**Pros / cons.**

- *Option 1.* Pro: each artifact targets one claim; the
  cumulative-page capture closes the page-length-sprawl risk;
  the outbound-link audit closes the cross-app navigation
  invariant; the noindex falsifier is the same procedure 2.1
  established and reusing it costs nothing. Con: depends on 2.2
  having landed (the cumulative-page capture isn't meaningful
  if the Harvest narrative isn't there).
- *Option 2.* Con: leaves the page-length-sprawl risk
  unverified at exactly the phase that owns the closing surface
  walk per the milestone-doc risk's mitigation
  ("the phase planning session for the last shipped phase
  (likely 2.3) walks the cumulative page length per AGENTS.md
  'Bans on surface require rendering the consequence'").
- *Option 3.* Con: redundant — the apps/web Vercel rewrite has
  been in production since event-platform-epic M3 phase 3.3 and
  the outbound-link audit (visual inspection of each link's
  `href` value against the route table) confirms the link shape
  is correct. Network-level verification adds cost without
  closing a load-bearing claim that visual audit doesn't
  already close. (M2 phase 2.1's plan rejected the same option
  for the showcase-card links per
  [m2-phase-2-1-plan.md](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md).)
- *Option 4.* Con: pure JSX + CSS change with no proxy / CDN /
  runtime variance between Vercel preview and prod; AGENTS.md
  Tier 5 examples don't fit pure rendering changes. Same
  rejection as 2.1 decision 5 Option 4.

**Came down to.** Whether the cumulative-page capture is
load-bearing. It is — the milestone-doc risk explicitly names
2.3 as the closing-phase walker, and skipping that walk would
fail the same "Bans on surface require rendering the
consequence" rule the milestone doc invokes.

**Resolution.** **Option 1.** Validation Gate procedure: deploy
the PR (Vercel produces the preview URL automatically); capture
(a) the role-door section in isolation (desktop + narrow
viewport, 2 captures); capture (b) the cumulative full home
page rendered top-to-bottom (one capture, desktop only — the
cumulative-page check is about overall length and section flow,
not per-section responsive shape); attach all three to the PR.
Visual audit each role-door's `href` against the resolution-3
target table (Attendee → `routes.game("harvest-block-party")`,
Organizer → `routes.eventAdmin("harvest-block-party")`,
Volunteer → `routes.gameRedeem("harvest-block-party")`). Run
`curl -s -L <preview>/ | grep -i 'name="robots"'` and confirm
the `noindex, nofollow` emit still lands (same falsifier as
2.1; reused unchanged).

**2.2 land-order dependency.** The cumulative-page capture
requires 2.2 to have landed. If 2.3 ships before 2.2 for any
reason (the milestone doc's recommended order is 2.1 → 2.2 →
2.3, but 2.2 and 2.3 are independent and may plan-draft in
parallel), the cumulative-page capture is N/A and the page-
length-sprawl risk transfers to whichever phase ships last.
Plan-drafting names this as a precondition: "open this PR after
2.2 has merged to main." If product pressure flips the order,
the plan is revised to either (a) defer the cumulative-page
capture to a separate doc-only PR after 2.2 lands, or (b)
transfer M2 closure responsibility to whichever phase ships
last. The default expectation is the recommended ship order
holds.

**Verified by:**
[apps/site/components/home/EventShowcaseCard.tsx:35-37](/apps/site/components/home/EventShowcaseCard.tsx)
(the `<a href={routes.X(slug)}>` shape this validation audits);
[m2-home-page-rebuild.md "Page-length sprawl"](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone-doc Cross-Phase Risk that names the cumulative-page
capture as 2.3-phase-owned);
[m2-phase-2-1-plan.md Validation Gate](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
(noindex curl falsifier and capture-pair pattern reused).

### 8. M2 closure documentation scope [Resolved → README + architecture + product, plus Status flips on milestone doc and epic]

**What was decided.** Which docs the M2-closing PR (this phase)
must update beyond the Status flips. The milestone doc's
Documentation Currency section names README + architecture +
product as M2-closing-phase-owned; this scoping confirms or
refines.

**Why it mattered.** AGENTS.md "Documentation Currency PR Gate"
binds: every PR ensures relevant docs match the implemented
state. The closing PR has the broadest doc currency burden in
M2 because it's the surface where the home page is "complete"
(hero + showcase + narrative + role-doors).

**Confirmation per doc.**

- **[README.md](/README.md).** Lines 22–23 currently describe
  the apps/site landing as "a static platform landing in
  apps/site plus published demo game routes" and lines 71–72
  as "Platform landing, platform admin, auth callback, and
  public event landing pages built with Next.js 16." The post-
  M2 home page is no longer a generic "static platform landing"
  — it's the demo entry point for internal partners with hero,
  two-event showcase, Harvest narrative, and three role-doors.
  Plan-drafting rewrites the relevant paragraphs to describe
  the post-M2 surface.
- **[docs/architecture.md](/docs/architecture.md).** Line
  210–211 currently says "Static platform landing at `/`, with
  a CTA into `/admin`." This is post-2.1 outdated (the page is
  no longer a single-CTA stub). Lines 31–32, 62–66, 939 also
  reference the platform landing in shape that may need
  refinement. Plan-drafting reads the doc and updates the
  paragraphs that describe the home page; bounded edit, not a
  structural rewrite.
- **[docs/product.md](/docs/product.md).** Line 38 says "a
  demo-overview landing page at `/`" — outdated; post-M2 the
  demo-overview *is* the page (no longer a stub above which
  demo content lives). Plan-drafting rewrites the bullet.
- **[docs/dev.md](/docs/dev.md).** No update expected — M2
  introduces no new local-dev workflow. Plan-drafting confirms
  by greping the doc for home-page references.
- **[docs/operations.md](/docs/operations.md).** No update
  expected — no operational concern introduced. Plan-drafting
  confirms.
- **[docs/styling.md](/docs/styling.md).** No update expected
  — M2 introduces no token-classification change. Plan-drafting
  confirms.
- **[docs/open-questions.md](/docs/open-questions.md).** No
  update expected — no open question closed. Plan-drafting
  confirms.
- **[docs/backlog.md](/docs/backlog.md).** No update expected
  by the milestone doc; plan-drafting may surface follow-up
  entries (richer interactivity, per-role landing pages,
  etc.) that get added per AGENTS.md "Feature-Time Cleanup And
  Refactor Debt Capture."

**Status-flip burden in this PR.**

- [m2-home-page-rebuild.md Phase Status table](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md):
  2.3 row Status flips `Plan-pending` → `Landed`, Plan column
  links the plan doc, PR column links this PR.
- [m2-home-page-rebuild.md top-level Status](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md):
  flips `Proposed` → `Landed`.
- [demo-expansion epic.md Milestone Status table](/docs/plans/epics/demo-expansion/epic.md):
  M2 row Status flips `Proposed` → `Landed`.
- The 2.2 row should be `Landed` already at this point (2.2
  ships before 2.3 per the recommended order); plan-drafting
  confirms at PR-open time and reconciles if 2.2 hasn't merged
  yet.

**Resolution.** README + architecture + product currency
updates; Status flips on milestone doc (Phase Status table 2.3
row + top-level Status) and epic (Milestone Status table M2
row). Other docs confirmed not-touched by plan-drafting at
plan time.

**Verified by:**
[README.md:22-23,71-72](/README.md) (current apps/site
landing description — outdated post-M2);
[docs/architecture.md:210-211](/docs/architecture.md)
(current home-page description — outdated post-2.1);
[docs/product.md:38](/docs/product.md) (current home-page
bullet — outdated post-M2);
[m2-home-page-rebuild.md Documentation Currency section](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone-doc binding for which docs the closing phase owns).

### 9. Confirm or revise the milestone doc's 3-phase split [Resolved → confirmed; 3-phase split holds; per-role split fallback authorized in decision 1]

**What was decided.** Whether the milestone doc's
2.1 / 2.2 / 2.3 phase split is the right shape, or whether
phase planning revises per the milestone doc's named
2-phase-shape (combine 2.1 + 2.3) or 4-phase-shape (split 2.3
per-role) alternatives. AGENTS.md "PR-count predictions need a
branch test" requires the re-derivation. 2.1's scoping already
confirmed the 3-phase split from its perspective; this scoping
re-confirms from 2.3's perspective.

**Came down to.** Whether the role-doors share enough
composition surface with 2.2's Harvest narrative to fold into
one PR. They do not — the role-doors are role-shaped framings
of platform surfaces (cards with outbound links), the Harvest
narrative is content-shaped editorial (paragraphs of text
walking through one event's full arc). Different review
attention; merging them masks each. The 4-phase variant (split
2.3 per-role) is rejected as the default per decision 1
(per-role review of three structurally-identical cards
fragments one cohesive section), but the per-role split
authorization remains as a mid-flight fallback if a role's
copy or composition surfaces unexpected scope tension.

**Resolution.** **3-phase split confirmed.** 2.1 ships
structural rebuild + hero + showcase (already landed); 2.2
ships Harvest narrative; 2.3 ships role-doors + M2 closure.
The mid-flight fallback to a per-role 4-phase split or a
role-doors / closure-docs 4-phase split is named in decision 1
above.

**Verified by:**
[m2-home-page-rebuild.md Phase Status discussion](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone doc names the 2-phase and 4-phase alternatives;
2.1 scoping decision 8 confirmed from 2.1's perspective; this
re-confirms from 2.3's perspective).

### 10. ThemeScope wrap shape on the role-doors section [Resolved → no wrap; platform Sage Civic Theme (apps/site default)]

**What was decided.** Whether the role-doors section renders
under the platform Sage Civic Theme (no `<ThemeScope>` wrap),
under Harvest's Theme via a single section-level
`<ThemeScope>` wrap (matching 2.2's narrative section pattern),
or under per-card wraps (each role-door wrapped independently,
all resolving to Harvest given decision 3's URL targets).

**Why it mattered.** 2.2's scoping doc explicitly defers this
to 2.3 (the cross-phase coordination section's "Theme rendering
in adjacent sections" expectation: *"2.3's role-doors may render
under the platform default (the doors are per-PERSONA, not
per-event) or under per-event Themes (if a card depicts Harvest
specifically, per-event wrap). 2.3's planning decides; 2.2 does
not pre-empt"*). The post-2.2-2.3 brand-color rhythm becomes
showcase (mixed per-card, Harvest pumpkin + Riverside teal-blue
side-by-side) → narrative (single Harvest pumpkin wrap) →
role-doors (?). 2.2 decision 7's pros/cons noted this could
"read as either coherent or fragmented depending on 2.3's call."
The decision also affects how the persona framing (decision 6's
"Attendee / Organizer / Volunteer" vocabulary) reads visually —
persona names against a Harvest Theme implicitly couple persona
to event in a way persona names against the platform default
do not.

**Options considered.**

1. **No wrap (platform Sage Civic Theme).** Role-doors render
   in apps/site's root-layout default Theme like the rest of
   `.home-shell` between themed sections.
2. **Section-level Harvest wrap.** Mirror 2.2's narrative
   pattern: a single
   `<ThemeScope theme={getThemeForSlug(harvestContent.themeSlug)}>`
   wrap on the role-doors section, since all three doors target
   Harvest URLs (decision 3).
3. **Per-card wraps,** each role-door wrapped independently in
   `<ThemeScope theme={getThemeForSlug("harvest-block-party")}>`.
   Same effective rendering as option 2 (all three resolve to
   Harvest), but structured per-card.
4. **Per-event mix per door** (e.g., Attendee in Harvest,
   Organizer in Riverside, Volunteer in Harvest — or some
   other allocation). Currently moot because decision 3 binds
   all three door targets to `harvest-block-party`; would
   require revisiting decision 3 to gain meaning.

**Pros / cons.**

- *Option 1.* Pro: matches the role-doors' editorial framing —
  these are PERSONA surfaces (Attendee / Organizer / Volunteer
  per decision 6's vocabulary), not event-shaped surfaces;
  persona-shaped is a platform-level concept independent of
  which event currently anchors the demo. Brand-color rhythm
  becomes intentional: showcase establishes per-event Theme
  variety, narrative reinforces Harvest cohesion as the worked
  example, role-doors return to platform-neutral as the
  platform-level role surfaces. Future-proof if the demo's
  anchor event ever rotates from Harvest (the role-doors keep
  reading as "the platform's persona doors" rather than "the
  hardcoded Harvest persona doors"). Con: visually breaks
  Harvest cohesion between the narrative section and the
  role-doors immediately below; partner reading top-to-bottom
  shifts from pumpkin (narrative) to platform Sage Civic
  (role-doors). Whether that reads as coherent rhythm or jarring
  break is reviewer judgment on the cumulative-page capture.
- *Option 2.* Pro: visual continuity with the narrative
  immediately above; the home page's bottom-half reads in
  cohesive Harvest brand color; reinforces "all this leads into
  Harvest." Con: weakens the persona-as-platform-concept
  framing decision 6 commits to — partner reading "Attendee" in
  pumpkin Harvest context may parse it as "Harvest's attendee"
  rather than "the platform's attendee role exemplified through
  Harvest"; fragility under future anchor-event rotation (a
  hardcoded Harvest wrap would mis-signal if the anchor event
  ever changes); also re-uses the multi-Theme rendering
  exercise that the milestone-doc invariant says was satisfied
  by the showcase (decision 7's "two-theme exercise" coverage
  notes this is N/A for 2.3).
- *Option 3.* Con: structurally redundant — three independent
  wraps resolving to the same Theme produce identical CSS
  variable scope to one outer wrap; same trap 2.2 decision 7
  rejected for "Per-subsection wraps." Adds component-shape
  noise without changing rendering.
- *Option 4.* Con: out of scope. Decision 3 binds all three
  cards to Harvest; per-event mix would require revisiting
  decision 3, which the role-door framing (single anchor event
  per the milestone-doc Goal language) does not motivate.

**Came down to.** Whether the role-doors are "Harvest's persona
doors" (event-shaped framing) or "the platform's persona doors,
anchored on Harvest as the worked example" (persona-shaped
framing). Decision 6 commits to persona-shaped vocabulary
("Attendee," not "Harvest Attendee"); Theme rendering should
match the framing. The brand-color rhythm argument cuts both
ways (option 1 reads as intentional rhythm or jarring break;
option 2 reads as cohesive bottom-half or persona-event
conflation), and the cumulative-page capture in the validation
gate (decision 7) lets the M2-closing reviewer judge directly
on the rendered page rather than from prose.

**Resolution.** **Option 1. No `<ThemeScope>` wrap.** The
role-doors section renders under the apps/site root layout's
platform Sage Civic Theme. The intentional brand-color rhythm
across the post-M2 home page is: hero (platform default) →
showcase (mixed per-card per-event Themes) → narrative (single
Harvest section wrap) → role-doors (platform default). Per-event
Theme variety up top exercises the multi-theme capability;
anchor-event cohesion in the middle reinforces Harvest as the
worked example; persona-platform neutrality at the bottom
frames the role-doors as platform-level surfaces. The
cumulative-page capture (decision 7) is the reviewable artifact
for the rhythm; if the closing PR's reviewer judges the rhythm
jarring rather than intentional, the closing PR may revise
(this scoping does not commit to a specific Theme shift under
reviewer pressure — the call is testable on the rendered page).

**Verified by:**
[scoping/m2-phase-2-2.md decision 7](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md)
(2.2's "single section-level Harvest wrap on the narrative"
resolution — establishes the pumpkin visual identity of the
section *immediately above* the role-doors that this decision's
brand-color-rhythm framing leans on);
[scoping/m2-phase-2-2.md "Cross-phase coordination — 2.2 ↔ 2.3"](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md)
(the explicit deferral of role-doors-section Theme rendering
that this decision answers);
[apps/site/components/home/EventShowcaseCard.tsx](/apps/site/components/home/EventShowcaseCard.tsx)
(2.1's per-card `<ThemeScope>` wrap pattern that the showcase's
"mixed per-card" rhythm component is built from);
[apps/site/app/layout.tsx:100-103](/apps/site/app/layout.tsx)
(the root-layout platform Sage Civic Theme emit that role-doors
inherit when no per-section wrap is added).

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they require
reading docs and components against actually-merged code at
plan-time, not against the scoping snapshot:

- **Exact per-role copy strings.** Decision 5 binds the shape
  (Attendee no caveat, Organizer + Volunteer carry the
  M3-inheritable auth caveat) and decision 6 binds the
  vocabulary (titles use Attendee / Organizer / Volunteer
  verbatim). Plan-drafting writes the exact words for each
  card's title, body paragraph, and link affordance text.
  Plan-drafting reads the apps/web sign-in form copy at
  [EventAdminPage.tsx:25-29](/apps/web/src/pages/EventAdminPage.tsx),
  [EventRedeemPage.tsx:31-35](/apps/web/src/pages/EventRedeemPage.tsx),
  and the milestone doc's "Internal-partner audience"
  invariant; copy walks both at plan time.
- **Slug constant declaration site.** Decision 3 binds
  `harvest-block-party` for all three event-scoped destinations;
  plan-drafting decides whether the slug is declared as a const
  inside `RoleDoors.tsx` or imported from a shared location
  (e.g., the EventContent registry). Lean toward
  declaring-locally as the simplest call; plan-drafting confirms
  against any apps/site convention for "anchor demo event slug"
  that may exist or emerge.
- **Card-component prop shape.** Decision 4 binds a single
  `RoleDoorCard` component; plan-drafting decides the exact
  prop shape (`{ eyebrow?, title, description, href,
  authCaveat? }` is the leading candidate). The `authCaveat`
  field's type and rendering pattern (string vs ReactNode, where
  it lives in the card's visual hierarchy) plan-drafts at
  plan time.
- **CSS organization (extend globals.css in place vs new
  partial).** 2.1 chose to extend globals.css in place (post-2.1
  the file is 849 lines per code reconnaissance). 2.3 adds
  ~50–100 LOC of `.home-roles*` selectors. Plan-drafting
  measures the post-2.3 LOC and decides whether to introduce a
  partial — likely no, since the 2.1 + 2.3 home-page CSS
  surface is one cohesive scope and splitting it into a partial
  would fragment review attention, but plan-drafting confirms
  against any AGENTS.md guidance on CSS partial size that may
  apply.
- **Self-Review Audit set against
  [docs/self-review-catalog.md](/docs/self-review-catalog.md).**
  Plan-drafting walks the catalog against the actual 2.3 diff
  surface. Likely-relevant audits: "Cross-app navigation seam
  audit" (yes — three role-door links target apps/web, and the
  invariant is load-bearing); "Token-classification audit"
  (probably no — role-doors do not consume per-event Themes,
  so brand-token discipline is N/A); "Effect cleanup audit"
  (no — section is a server component with no effects);
  "Rename-aware diff classification" (no — no renames). The
  audit set may be small; that is allowed and named in the
  plan if so.
- **Validation Gate command list.** Beyond the captures and
  curl falsifier in decision 7, the plan names `npm run lint`,
  `npm run build:web`, and any apps/site Playwright suites
  exercising the home page. Plan-drafting reads `package.json`
  `scripts` and `scripts/testing/` per AGENTS.md "Prefer
  existing wrapper scripts."
- **Commit boundaries.** Likely 2 commits: (1) role-door
  section component + RoleDoorCard + page composition + CSS,
  (2) M2 closure docs (README + architecture + product) + Status
  flips. Plan-drafting finalizes against the actual edit shape;
  if doc currency edits surface unexpected scope (e.g., a doc
  needs more than a paragraph rewrite), plan may pivot to a
  3-commit shape (component / page composition / docs+flips).
- **Whether to register a `routes.gameVolunteer` builder or
  similar role-named alias.** The Volunteer role-door's target
  is `routes.gameRedeem(slug)`; the route name doesn't include
  "volunteer." If plan-drafting wants a role-named alias for
  legibility, it adds it to `shared/urls/routes.ts`. Lean
  toward no — the existing `gameRedeem` builder is the
  canonical name and adding a role-named alias would split
  the URL surface for no contract reason. Plan-drafting
  confirms.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns / plan
owns":

- Status, Context preamble, Goal
- Cross-Cutting Invariants — **references the milestone doc's
  Cross-Phase Invariants** rather than restating; only names
  per-phase additions if any. **No per-phase additions
  anticipated** for 2.3: the 4 milestone-level invariants
  (internal-partner honesty, two-theme exercise on showcase,
  role-door honesty, cross-app navigation hard-nav) all bind
  directly. Two-theme exercise on showcase is N/A for 2.3
  (role-doors are not per-event Themed surfaces) but the plan
  still walks it as a no-op for completeness per the milestone
  doc's "Self-review walks each one against every phase's actual
  changes." Cross-app navigation is highly applicable (all three
  role-door targets are cross-app); role-door honesty is
  load-bearing for this phase specifically.
- Naming
- Contracts — names the per-role target URL contract (decision
  3), the per-role copy honesty shape (decision 5), the
  RoleDoorCard component shape (decision 4), the role-label
  vocabulary (decision 6), the responsive-grid layout (decision
  2), the role-doors-section Theme rendering (decision 10's
  no-wrap resolution), and the M3 inheritance contract for copy
  revision.
- Files to touch (estimate-labeled per AGENTS.md "Plan content
  is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate
- Self-Review Audits
- Documentation Currency PR Gate — names the README +
  architecture + product currency updates (decision 8) and the
  Status-flip burden on the milestone doc and the epic.
- Out Of Scope (final)
- Risk Register — **references the milestone doc's Cross-Phase
  Risks** for milestone-level risks; restates "Role-door copy
  drift between M2 and M3" with decision 5's contract as the
  mitigation. Adds plan-implementation-level risks here. The
  "Page-length sprawl" milestone-level risk is load-bearing for
  2.3 specifically; the plan's Risk Register refines it with
  the cumulative-page capture procedure (decision 7) as the
  mitigation.
- Backlog Impact — **references the milestone doc's Backlog
  Impact**; this PR may open follow-up entries during plan-
  drafting (decision 9 leaves room for richer interactivity,
  per-role landing pages, etc.).

The duplication-reduction discipline above is intentional: the
plan binds milestone-level content by reference, not by
restatement.

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not from
the scoping snapshot, per AGENTS.md "Reality-check gate between
scoping and plan":

- **2.2 ship status at plan-drafting time.** 2.2's plan landed
  at scoping time (Status `Proposed`); its implementation PR
  has not yet shipped. If 2.2's implementation has landed by
  the time 2.3's plan drafts, the cumulative-page capture
  (decision 7) targets the post-2.2 page; if 2.2's
  implementation has not yet landed, the plan binds the
  precondition "open this PR after 2.2 has merged to main" or
  transfers M2 closure responsibility per decision 7's
  land-order paragraph. Plan-drafting reads
  [m2-home-page-rebuild.md Phase Status table](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
  and reconciles.
- **2.2 plan's locked decisions unchanged since 2.3 scoping.**
  2.3 inherits 2.2 decision 5 (per-persona caveats) and
  decision 6 (no narrative outbound links) as cross-phase
  contracts via the
  [Cross-phase coordination — 2.2 ↔ 2.3](#cross-phase-coordination--22--23)
  section. If 2.2's plan has been revised between scoping and
  plan-drafting (e.g., a review-fix changed the per-persona
  caveat shape or added an outbound link), plan-drafting
  re-reads
  [m2-phase-2-2-plan.md](/docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md)
  and reconciles 2.3's contracts. If 2.2's implementation has
  landed and the persona caveat copy turned out to differ from
  the plan's framing, 2.3's role-door copy still needs to agree
  on the substantive claim — plan-drafting reads the merged
  narrative copy at that point, not the plan's contract alone.
- **`apps/site/app/page.tsx` shape unchanged since 2.1
  landed.** 2.3 appends `<RoleDoors />` to the existing
  `<main>`; if a sibling PR (2.2 or otherwise) has restructured
  the page, 2.3's append-to-main rule may need refinement.
- **`apps/site/components/home/` family unchanged since 2.1
  landed.** 2.3 introduces `RoleDoors.tsx` and `RoleDoorCard.tsx`
  alongside the existing 3-file family
  (HomeHero / TwoEventShowcase / EventShowcaseCard); if 2.2 has
  added new files here (e.g., `HarvestNarrative.tsx` per 2.2's
  plan), 2.3 mirrors 2.2's organization.
- **`shared/urls/routes.ts` `game`, `eventAdmin`, `gameRedeem`
  builders unchanged.** Decision 3's URL contract depends on
  these builders resolving to the apps/web routes named in this
  scoping; if any has been retargeted (cross-app boundary
  shifted, or a builder removed), the contract needs update.
- **apps/web `/event/:slug/{game,admin,game/redeem}` routes'
  auth gates unchanged.** Decision 5's per-role honesty copy
  depends on the gameplay shell remaining public and the admin
  + redeem surfaces remaining auth-gated. If a sibling PR has
  adjusted any auth gate (e.g., a demo-mode bypass landed
  outside this epic, or auth was added to gameplay), decision
  5's per-role copy contract needs update.
- **apps/site `/admin` route still owned by apps/site (not
  re-migrated to apps/web).** Decision 3 rejects Organizer
  Option 2 (`routes.admin` as the destination) on the basis of
  apps/site being the admin-list owner; if the route ownership
  has flipped, the basis changes (though Option 1's resolution
  still holds — the per-event editor at
  `routes.eventAdmin(slug)` is the more direct destination
  regardless).
- **EventCTA hard-navigation precedent unchanged.** Decision 3's
  reference to `<a href={routes.X(slug)}>` mirrors
  [EventCTA.tsx:24](/apps/site/components/event/EventCTA.tsx);
  if EventCTA has been refactored to use a different navigation
  pattern, plan-drafting follows whichever pattern is canonical
  at plan-drafting time.
- **`apps/site/app/globals.css` `.home-shell` scope intact.**
  2.3's `.home-roles*` selectors plug into the `.home-shell`
  scope 2.1 introduced; if a refactor has restructured the
  home-page CSS, 2.3 follows the new shape.
- **apps/web sign-in form copy unchanged.** Decision 5's
  reference to "Sign in to manage this event" /
  "Sign in to redeem codes" as the apps/web vocabulary
  precedent depends on those exact strings; if apps/web has
  rephrased, plan-drafting reads the current strings before
  binding the role-door copy shape.
- **README + docs/architecture.md + docs/product.md home-page
  paragraphs unchanged.** Decision 8's currency-burden scope
  depends on the specific lines cited; plan-drafting re-greps
  to confirm the paragraphs that need rewriting are still the
  cited lines (a sibling PR may have already updated some).
- **Next.js metadata cascade behavior on the home-page route
  unchanged.** 2.3 does not modify the noindex emit; the
  validation gate's curl falsifier confirms the 2.1-shipped
  emit still holds. Plan-drafting confirms `apps/site/app/page.tsx`'s
  `metadata.robots` block is unchanged.

## Cross-phase coordination — 2.2 ↔ 2.3

2.2's scoping doc named three expectations 2.3's planning
session inherits per the milestone doc's "Plan-drafting cadence"
exception (2.2 and 2.3 are mutually independent and may
plan-draft in parallel). 2.2's plan landed before 2.3 scoping
started; 2.2's implementation has not yet shipped at scoping
time. This section records 2.3's resolution to each expectation
so the bidirectional record is complete and 2.2's expectations
are visibly satisfied. (2.2's scoping doc is transient and
deletes at the milestone-terminal PR per AGENTS.md "Phase
Planning Sessions"; the durable record of these resolutions
lives in this section through scoping's lifetime and absorbs
into the 2.3 plan's contracts at plan-drafting time.)

- **Auth-honesty substantive claim agreement.** 2.2 ships
  per-persona auth-state caveats in the narrative prose
  ([m2-phase-2-2 scoping decision 5](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md)):
  Attendee no caveat (gameplay public), Organizer + Volunteer
  carry the magic-link sign-in caveat with M3-bypass-pending
  framing in the same attention boundary as the persona-action
  description. **2.3's resolution (decision 5).** Role-door
  copy agrees on the substantive claim — Attendee no caveat,
  Organizer + Volunteer carry the "(or wait for demo-mode
  access)" caveat. Phrasing density differs (narrative is
  descriptive prose; role-door is CTA copy at higher density),
  but the substantive claim — same role-set, same auth gates,
  same M3-bypass-pending — is identical. M3's PR revises both
  surfaces in the same change.
- **Outbound-link surface separation.** 2.2 ships zero
  outbound links from the narrative
  ([m2-phase-2-2 scoping decision 6](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md)):
  the narrative is descriptive prose only; role-doors are the
  sole click-through layer to apps/web role surfaces from the
  home page. **2.3's resolution (decision 3 + decision 7).**
  Confirms — three role-door cards, each with one outbound
  cross-app link, are the cross-app click-through layer; the
  narrative remains link-free; 2.1's showcase cards retain
  their same-app `routes.eventLanding` links into rich event
  landings. Each home-page surface owns one click-through
  concern: showcase = same-app event landings; role-doors =
  cross-app role surfaces; narrative = none. The validation
  gate's outbound-link audit (decision 7) walks the role-door
  section's `href` values; it is also the scoping-time check
  that 2.3 does not inadvertently re-introduce outbound links
  in the narrative or duplicate the showcase's same-app
  destinations.
- **Theme rendering in adjacent sections.** 2.2 ships a single
  section-level Harvest `<ThemeScope>` wrap on the narrative
  ([m2-phase-2-2 scoping decision 7](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md))
  and explicitly defers the role-doors-section Theme rendering
  to 2.3 (2.2 cross-phase coord section: *"2.3's role-doors
  may render under the platform default (the doors are
  per-PERSONA, not per-event) or under per-event Themes."*).
  **2.3's resolution (decision 10).** No `<ThemeScope>` wrap
  on the role-doors section; platform Sage Civic Theme
  (apps/site root-layout default). The post-M2 home-page
  brand-color rhythm is intentional: hero (platform) →
  showcase (mixed per-card per-event Themes) → narrative
  (single Harvest section wrap) → role-doors (platform). The
  cumulative-page capture (decision 7) is the reviewable
  artifact for the rhythm; if the closing PR's reviewer judges
  it jarring, the closing PR may revise.

**Section-stacking idiom (informational, no per-phase
decision required).** 2.1 established `.home-shell > section`;
2.2 adds `.home-narrative` as a third direct-child section;
2.3 adds the role-doors section as the fourth (likely
`.home-roles` or `.home-role-doors` — plan-drafting names).
All sections inherit the post-2.1 width-auto-center and
section-padding conventions; no section-shell refactor is
anticipated through M2.

## Related Docs

- [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  parent milestone doc; phase 2.3 row at the Phase Status
  table; "Role-door honesty against current auth state" and
  "Cross-app navigation uses hard navigation" Cross-Phase
  Invariants are load-bearing for this phase.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — parent
  epic; M2 paragraph at lines 199–218; M2 row in the Milestone
  Status table flips at this phase's PR.
- [`m2-phase-2-1.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md) —
  sibling scoping doc precedent for this scoping's structure
  (PR-shape branch test, capture-pair validation, decision-
  format with `Verified by:` references).
- [`m2-phase-2-1-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md) —
  predecessor plan precedent for the per-phase plan that 2.3's
  drafting produces; the noindex curl falsifier and capture-
  pair pattern reuse from this plan.
- [`scoping/m2-phase-2-2.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-2.md) —
  sibling scoping doc; cross-phase coordination expectations
  2.3 inherits and resolves in the
  [Cross-phase coordination — 2.2 ↔ 2.3](#cross-phase-coordination--22--23)
  section above (decisions 5 / 6 / 7 there bind the
  substantive-claim agreement, outbound-link surface
  separation, and adjacent-section Theme deferral that
  decisions 5 / 3 + 7 / 10 here resolve).
- [`m2-phase-2-2-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md) —
  sibling phase plan; durable record of 2.2's locked decisions
  and risk-register inheritance (the "Auth-caveat copy drift
  between narrative and role-doors before 2.3 lands" risk
  there is mitigated by decision 5 here + the cross-phase
  coordination section).
- [`m1-phase-1-1.md`](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md) —
  sibling scoping doc precedent (decision 5's brand-color
  derived-shade trap; not load-bearing for 2.3 since role-doors
  are not per-event Themed).
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  predecessor epic; M2 phase 2.3 of *that* epic delivered the
  apps/web → apps/site `/` migration this M2 phase 2.3 builds
  the closing surface for.
- [`apps/site/app/page.tsx`](/apps/site/app/page.tsx) — the
  page this phase appends `<RoleDoors />` to.
- [`apps/site/components/home/`](/apps/site/components/home/) —
  the component family this phase extends (adds `RoleDoors.tsx`
  and `RoleDoorCard.tsx`).
- [`apps/site/components/event/EventCTA.tsx`](/apps/site/components/event/EventCTA.tsx) —
  apps/site → apps/web cross-app hard-navigation precedent
  (decision 3's link-shape source).
- [`shared/urls/routes.ts`](/shared/urls/routes.ts) — URL
  builders the role-door targets consume (`game`,
  `eventAdmin`, `gameRedeem`).
- [`apps/web/src/pages/GamePage.tsx`](/apps/web/src/pages/GamePage.tsx) —
  Attendee target; public (no auth gate); basis for decision 5's
  no-caveat Attendee copy.
- [`apps/web/src/pages/EventAdminPage.tsx`](/apps/web/src/pages/EventAdminPage.tsx) —
  Organizer target; auth-gated; basis for decision 5's
  Organizer caveat copy.
- [`apps/web/src/pages/EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx) —
  Volunteer target; auth-gated; basis for decision 5's
  Volunteer caveat copy.
- [`apps/site/CLAUDE.md`](/apps/site/CLAUDE.md) and
  [`apps/site/AGENTS.md`](/apps/site/AGENTS.md) — "This is NOT
  the Next.js you know" — plan-drafting must read
  `node_modules/next/dist/docs/` for relevant Next.js APIs
  before naming them in contracts (no new APIs anticipated
  for 2.3, but the rule applies if plan-drafting reaches for
  one).
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-count
  predictions need a branch test," "Scoping owns / plan owns,"
  "Reality-check gate between scoping and plan,"
  "Cross-app destinations need hard navigation,"
  "Plan-to-PR Completion Gate."
