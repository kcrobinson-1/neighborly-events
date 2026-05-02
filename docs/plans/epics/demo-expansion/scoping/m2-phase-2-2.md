# Scoping — M2 phase 2.2 (end-to-end Harvest narrative section)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
absorbs into
[m2-home-page-rebuild.md](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md);
durable per-phase content absorbs into
`docs/plans/epics/demo-expansion/m2-phase-2-2-plan.md`.

## Phase summary

Phase 2.2 ships the milestone doc's "end-to-end Harvest
narrative" section as a third section composed into the
`.home-shell` foundation phase 2.1 just landed
([page.tsx](/apps/site/app/page.tsx) — `<main className="home-shell">`
currently containing
[`<HomeHero />`](/apps/site/components/home/HomeHero.tsx) and
[`<TwoEventShowcase />`](/apps/site/components/home/TwoEventShowcase.tsx)).
The narrative walks a partner through Harvest Block Party as the
worked example for the platform's three-role arc: what an
attendee experiences playing the game, what an organizer does
authoring questions and monitoring, what a volunteer does running
the redemption booth. It is descriptive prose grounded in
Harvest's existing `EventContent` data — text-and-color first per
the milestone's "Out-of-band assets" Settled-by-default decision —
not a screenshot tour, not an interactive preview, not a CTA
surface. The role-door entry points (2.3) are the click-through
layer; the narrative is the description layer.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
code citation that proves the load-bearing claim. These decisions
are absorbed into the plan's contract sections and out-of-scope
list during plan-drafting; the deliberation prose (rejected
alternatives) lives here through scoping's transient lifetime.

### 1. PR shape — single PR, with per-persona split fallback authorization [Resolved → Option A]

**What was decided.** Whether 2.2 ships as one PR (full narrative
+ section CSS + Phase Status update), as two PRs split along a
"narrative skeleton / per-persona content" seam, or as three PRs
(one per persona subsection).

**Why it mattered.** AGENTS.md "PR-count predictions need a
branch test" requires the phase planning session to re-derive the
milestone-doc estimate against actual scope. The milestone doc's
3-phase split estimates 2.2 as a single PR but explicitly
authorizes phase planning to revise.

**Options considered.**

1. **Single PR (Option A).** All scope in one change.
2. **Two PRs along a skeleton / content seam (Option B).** 2.2.1
   ships an empty narrative section with the per-persona
   skeleton; 2.2.2 fills in the persona prose against the
   honest-framing invariant.
3. **Three PRs along persona boundaries (Option C).** 2.2.1
   attendee, 2.2.2 organizer, 2.2.3 volunteer.

**Pros / cons.**

- *Option A.* Pro: smallest review-overhead total; reviewer sees
  the section composition + cumulative page length + per-persona
  copy honesty in one render. Aligns with the M1 phase 1.1 and
  M2 phase 2.1 single-PR precedent. Con: if persona-copy
  honesty drafting surfaces unexpected scope tension (e.g.,
  reviewer disputes per-persona framing across multiple rounds),
  the PR grows past branch-test thresholds.
- *Option B.* Pro: separates structural-shape review from
  copy-craft review. Con: 2.2.1 ships an empty narrative section
  visible on `/` between merges — the cumulative home page
  briefly carries a hollow "Harvest narrative" container with no
  content, which is a regression in partner-evaluator-visible
  honesty that "ship in reviewable chunks" does not justify.
- *Option C.* Pro: smallest per-PR diff. Con: per-persona
  splitting fragments one cohesive "end-to-end" narrative for no
  review benefit; the milestone Goal language "walks the reader
  from … through … so a partner sees the platform's arc" is
  load-bearing on the three-personas-together framing. Inflates
  milestone phase count to 5 against the milestone doc's
  3-phase estimate.

**Branch-test analysis (per AGENTS.md "PR-count predictions need
a branch test").**

Subsystems touched by Option A:
1. apps/site home-page route
   ([page.tsx](/apps/site/app/page.tsx) — adds one section
   `<HarvestNarrative />` import + composition).
2. apps/site home-page components (new
   `apps/site/components/home/HarvestNarrative.tsx` and likely
   one or more per-persona sub-components — plan-drafting decides
   whether per-persona is a separate file or inline blocks).
3. apps/site CSS surface
   ([globals.css](/apps/site/app/globals.css) — extend the
   `.home-shell` selector group with `.home-narrative` and
   per-persona scope classes).
4. Milestone-doc Phase Status table row update
   ([m2-home-page-rebuild.md](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
   — doc-only).

Four subsystems is below the AGENTS.md ">5 distinct subsystems"
threshold. LOC: page.tsx adds ~2-3 lines (one import, one JSX
node); narrative component family is ~150-300 LOC across 1-3
files (orchestrator + possibly per-persona blocks); CSS scope
is ~80-150 LOC of new selectors. Total substantive logic plausibly
brushes the ">300 LOC" threshold but stays in review-coherent
territory because every line is the *same* surface (the home
page narrative section) under one composition idiom — and copy
density is the load-bearing review surface, not structural
complexity.

**Came down to.** Whether the persona-copy honesty review is
genuinely review-distinct from the section-composition review.
It is not — the honesty rule binds individual sentences across
all three personas, so reviewing them together against the
[`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
invariant is more coherent than splitting them. The M2 phase 2.1
precedent (page-rebuild + visible surface + doc updates in one
PR) carries.

**Resolution.** **Option A (single PR).** The plan binds the
single-PR shape and names the validation procedure (cumulative
home-page capture, narrative-section close-up capture, per-persona
copy walk in self-review). Status flips Proposed → Landed in the
single PR per AGENTS.md "Plan-to-PR Completion Gate."

**Fallback authorization.** If implementation surfaces
copy-honesty review pressure beyond a reasonable in-PR review
surface — operationally defined as the narrative growing past 3
component files in `apps/site/components/home/` for
narrative-specific work, or the cumulative home page exceeding
~5 viewport heights at desktop (per the milestone doc's
"page-length sprawl" risk's operational threshold), or a
reviewer disputing per-persona auth-honesty framing across more
than two rounds — the implementer splits along an Option B seam
mid-flight: 2.2.1 ships the narrative skeleton + section CSS +
attendee subsection (the auth-unconstrained persona); 2.2.2
ships organizer + volunteer subsections with the M3-inherited
auth-honesty copy contract. This authorization is named here so
the implementer doesn't relitigate the call under review pressure.
The pre-implementation expectation is one PR; the M1 phase 1.1
and M2 phase 2.1 precedents put probability strongly on that
side.

**Verified by:**
[apps/site/app/page.tsx](/apps/site/app/page.tsx) (post-2.1
shape: `<main className="home-shell">` with two section children;
narrative becomes the third section);
[apps/site/components/home/](/apps/site/components/home/) (post-2.1
component family precedent for new section additions);
[m2-phase-2-1-plan.md](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
(predecessor single-PR shape for the same milestone).

### 2. Narrative shape — in-page section vs. sub-route [Resolved → in-page section]

**What was decided.** Whether the end-to-end Harvest narrative
lives as a section on `/` (one URL, scroll-down to read) or as
a sub-route like `/tour/harvest` (own scroll context, partner
clicks through to read).

**Why it mattered.** The milestone doc explicitly named this as
2.2-owned and provided the practical input: "the home-page
length after 2.1 lands is the practical input (a 600-pixel-tall
home page is fine; a 3000-pixel-tall page-of-everything is not)."

**Options considered.**

1. **In-page section on `/`.** The narrative renders below the
   two-event showcase; partner scrolls to read.
2. **Sub-route `/tour/harvest`** (or similar). The home page
   carries a "see the Harvest walkthrough" link; partner clicks
   through to a dedicated narrative page.
3. **Hybrid — short narrative summary on `/` + "read more" link
   to a sub-route with full-depth content.** Two-tier surface.

**Pros / cons.**

- *Option 1.* Pro: partner lands on `/` and sees the platform's
  arc by scrolling — no discovery click required. The milestone
  Goal language "without having to assemble it themselves" is
  load-bearing on this — a sub-route shape requires the partner
  to find and follow the link, which is exactly the assembly
  the Goal disclaims. Con: lengthens the home page; cumulative
  scroll after 2.2 + 2.3 land risks the page-length sprawl risk
  the milestone names.
- *Option 2.* Pro: own scroll context; home page stays short.
  Con: introduces a new navigation surface (a `/tour/harvest`
  route file plus its routing wiring); hides the narrative
  behind a click that defeats the "land and see the arc" framing;
  introduces a new noindex decision (does `/tour/harvest`
  index?) and potentially a new metadata-emit shape per the
  milestone's Internal-partner audience invariant.
- *Option 3.* Con: doubles maintenance — copy lives in two places
  and drifts; partner reading the summary may miss the "click
  for more" affordance and assume the summary IS the narrative.
  Combines the worst of options 1 and 2 (length pressure on `/`
  AND a new sub-route).

**Came down to.** Whether the milestone Goal's "without having
to assemble it themselves" framing binds the narrative to the
home page or merely binds the *content* to existing somewhere.
It binds to the home page — "the demo entry point internal
partners land on first when evaluating the platform" is the
home page, and "sees the platform's arc" without assembly means
the arc renders on the surface the partner already arrived at.
A sub-route shape is technically present but practically hidden.

**Page-length sprawl mitigation.** The risk is real but
addressable in the section's own composition: copy density,
gap rules, and per-persona scope can keep the narrative
section under ~2 viewport heights on desktop. The validation
gate captures the cumulative home page so reviewers see the
post-2.2 consequence per AGENTS.md "Bans on surface require
rendering the consequence." If the cumulative page is genuinely
unwieldy, plan-drafting (or implementation review) revises;
the page-length consequence is observable, not silent.

**Resolution.** **Option 1.** In-page section composed as the
third direct child of `<main className="home-shell">`, after
HomeHero and TwoEventShowcase. Plan-drafting names the section
CSS scope class (likely `.home-narrative`) per the existing
post-2.1 idiom — sections are direct children of `.home-shell`,
each with its own internal grid, auto-centered to
`width: min(100%, 1080px)` per the post-2.1 selector at
[`globals.css:685–849`](/apps/site/app/globals.css). The
validation gate captures the cumulative home page (full scroll
height) so the page-length sprawl risk is rendered, not silent.

**Verified by:**
[apps/site/app/page.tsx](/apps/site/app/page.tsx) (post-2.1
section-composition idiom: HomeHero + TwoEventShowcase as direct
section children);
[apps/site/app/globals.css:685–849](/apps/site/app/globals.css)
(post-2.1 `.home-shell` grid + `.home-shell > section` width
constraint that the new narrative section inherits);
[m2-home-page-rebuild.md "Harvest narrative section: in-page
section or sub-route?"](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone doc's deferred-to-phase-time decision this resolves).

### 3. Persona structure — three subsections (Attendee / Organizer / Volunteer) in a fixed linear order [Resolved → Option A]

**What was decided.** How the narrative breaks into subsections:
three persona-scoped subsections in the milestone Goal's order
(attendee → organizer → volunteer), one unified narrative without
explicit persona breaks, or a different breakdown (e.g., per
gameplay phase rather than per role).

**Options considered.**

1. **Three persona subsections, fixed linear order matching the
   milestone Goal language (attendee → organizer → volunteer).**
2. **One unified narrative paragraph weaving all three roles
   together** ("at Harvest Block Party an attendee scans a QR
   code while an organizer monitors, and a volunteer at the
   redemption booth …").
3. **Per-gameplay-phase breakdown** (setup phase / play phase /
   redemption phase) where each phase mentions which roles
   participate.
4. **Per-persona subsections in chronological event order**
   (organizer first because authoring happens before the event;
   attendee at event time; volunteer at redemption time).

**Pros / cons.**

- *Option 1.* Pro: directly satisfies the milestone Goal language
  ("how does an attendee play, an organizer author, a volunteer
  redeem"); each persona section scopes the auth-state-honesty
  copy to its own surface (decision 5 below); each subsection
  becomes a natural "what would I do as this role" story for a
  partner. Aligns with the role-door order 2.3 is expected to
  ship in (per the milestone Goal sentence). Con: persona-first
  structure de-emphasizes the time-sequence of an actual event
  (organizer authors *before* the event runs).
- *Option 2.* Pro: most narrative-prose-natural shape. Con:
  hides the per-role click-through hook (no clear seam where
  organizer's auth-honesty copy attaches); fights the
  three-role-doors composition 2.3 will mirror; harder to
  self-review for the role-door honesty invariant (the rule
  binds copy *per role*, not paragraph-level).
- *Option 3.* Con: phase-first reorders the milestone's
  role-first framing; the role-doors invariant binds per-role,
  not per-phase, so 2.3's role-doors would have a different
  structural skeleton than 2.2's narrative — costs cross-phase
  cohesion.
- *Option 4.* Pro: chronologically realistic. Con: the milestone
  Goal sentence orders attendee → organizer → volunteer, and
  the M2 deliverable list mirrors it; reordering creates a
  cosmetic mismatch between narrative order and role-door
  order without strong upside.

**Came down to.** Whether the narrative order should mirror the
milestone Goal's stated order, the role-doors order 2.3 will
ship, or a chronological alternative. The first two are the
same order and they reinforce each other; the chronological
alternative gains realism but breaks cross-phase cohesion.

**Resolution.** **Option 1. Three persona subsections in
fixed order: Attendee → Organizer → Volunteer.** Each subsection
scopes its own auth-state-honesty copy (decision 5) and aligns
1:1 with the role-doors 2.3 is expected to ship. Plan-drafting
decides per-subsection markup density (eyebrow + heading +
prose, vs. heading + prose, vs. inline list); scoping does not
prejudge.

**Verified by:**
[m2-home-page-rebuild.md Goal](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
("how does an attendee play, an organizer author, a volunteer
redeem" — milestone-stated persona order this scoping mirrors);
[epic.md M2 paragraph](/docs/plans/epics/demo-expansion/epic.md)
("three role-door entry points (Attendee / Organizer /
Volunteer)" — the role-doors order 2.3 inherits and this
narrative order matches).

### 4. Visual mechanism — text-and-color only [Resolved → no images, no live previews, no iframes]

**What was decided.** Whether the narrative shows what each
persona experiences via descriptive prose only, screenshots of
actually-rendered surfaces, illustrations / icons, or live
previews (iframes / interactive embeds).

**Options considered.**

1. **Text-and-color only.** Descriptive prose, possibly with
   typographic affordances (an eyebrow per persona, a heading,
   a paragraph or two of prose).
2. **Screenshots of the rendered surfaces** (apps/web game UI,
   admin workspace, redemption keypad) embedded inline.
3. **Illustrations / role icons** per persona.
4. **Live iframe previews** of the actual surfaces.
5. **Animated / video demo loops** per persona.

**Pros / cons.**

- *Option 1.* Pro: respects the milestone's "Out-of-band assets"
  Settled-by-default decision ("No new icon set, illustration,
  image, or video ships in M2"); zero asset-pipeline surface to
  add; fastest to land; partner can click through to live
  surfaces via the role-doors 2.3 will ship. Con: a partner
  reading "the attendee scans a QR code and answers questions"
  has to project what that looks like.
- *Option 2.* Con: violates the milestone's "Out-of-band assets"
  default by definition; screenshots ARE images even if they
  depict already-shipped surfaces. Also drags in capture
  conventions (which viewport, which event, which auth state),
  rotating-stale-screenshot maintenance burden, and asset
  pipeline decisions (where do they live, how are they served,
  optimized).
- *Option 3.* Con: same Out-of-band-assets violation as 2;
  introduces an icon system that has no other home-page
  consumer.
- *Option 4.* Con: iframes from apps/site to apps/web break the
  cross-app navigation invariant's "hard navigation" framing
  (an iframe is neither hard navigation nor cross-app —
  it's embedding); auth-gated surfaces would render the
  sign-in form inside the iframe, which is an absurd partner
  experience; and a 'use client' boundary is required for any
  interactive interaction with the iframe content.
- *Option 5.* Con: heaviest asset surface; same Out-of-band-
  assets violation; introduces video-pipeline decisions (where
  hosted, what fallback, what accessibility text).

**Came down to.** Whether the milestone's "Out-of-band assets"
default carries through 2.2's specific surface, or whether the
narrative section is the natural exception. It carries through —
the default exists exactly because asset addition cascades into
maintenance debt the demo iteration shouldn't take on, and the
narrative's job is to set framing for partners who can then
*click through* to live surfaces (via 2.3's role-doors) and see
the real thing rather than a static depiction.

**Resolution.** **Option 1. Text-and-color only.** No
screenshots, illustrations, icons, iframes, or videos in 2.2's
diff. Plan-drafting confirms the prose density makes the
"end-to-end" arc legible without visuals. The cumulative
narrative reads alongside the live surfaces 2.3's role-doors
link to: partners read the narrative for framing, click a
role-door for the actual experience.

If a future phase or epic surfaces a real "this needs a visual"
need, that is a follow-up decision — likely against the
"Out-of-band assets" default itself, recorded explicitly in the
relevant milestone planning session.

**Verified by:**
[m2-home-page-rebuild.md "Out-of-band assets" Settled-by-default](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone-level default this resolution honors);
[epic.md "Internal-partner audience"](/docs/plans/epics/demo-expansion/epic.md)
(the audience-honesty framing the prose-only call serves).

### 5. Auth-state-honest framing per persona [Resolved → per-subsection caveat naming the auth-gated state of the surface the persona uses]

**What was decided.** How each persona subsection acknowledges
the current auth-gated state of the surface the persona's
described actions correspond to. The milestone's "Role-door
honesty against current auth state" Cross-Phase Invariant binds:
"Until M3 lands demo-mode auth bypass for test-event slugs,
role-door targets in apps/web (admin authoring, redemption
booth, organizer monitoring) are auth-gated. M2 ships role-doors
that link to these targets with honest copy naming the auth
requirement." The narrative depicts and (via 2.3's role-doors)
links to the same surfaces; the same honesty rule applies to
narrative copy.

**Auth state today.**

- **Attendee** plays at `routes.game(slug)` →
  `/event/${slug}/game` ([routes.ts:25-40](/shared/urls/routes.ts)).
  No sign-in required for gameplay (apps/web's gameplay route
  is open today). Plan-drafting confirms by re-reading the
  route's guard at plan time per the reality-check gate; if
  apps/web has added gameplay sign-in since scoping, this
  decision flips on attendee.
- **Organizer** authors at `routes.eventAdmin(slug)` →
  `/event/${slug}/admin`. **Auth-gated** — sign-in form renders
  on unsigned state ([apps/web/src/pages/EventAdminPage.tsx](/apps/web/src/pages/EventAdminPage.tsx)
  guards via `useAuthSession()`; line in ~290-410 range; plan-drafting
  re-reads at plan time).
- **Volunteer** redeems at `routes.gameRedeem(slug)` →
  `/event/${slug}/game/redeem`. **Auth-gated**, same shape.

**Options considered.**

1. **Per-subsection auth-state caveat** in the persona's prose,
   naming the sign-in requirement and the M3-bypass-pending
   inheritance. Attendee subsection has no caveat (gameplay is
   open). Organizer and volunteer subsections each carry a
   one-clause caveat in the same paragraph as the persona's
   action description ("…the organizer signs in to author
   questions; until demo-mode bypass for test-event slugs lands,
   this requires a magic-link sign-in" or similar).
2. **One section-level auth caveat** at the top or bottom of
   the narrative naming "two of the three role surfaces require
   sign-in today." Single statement covering both organizer and
   volunteer.
3. **No caveat** in the narrative; rely on 2.3's role-doors to
   carry the auth-honesty copy (the invariant binds role-doors,
   so role-doors satisfy it; narrative is descriptive, not
   directing).
4. **Full sign-in walkthrough** as a fourth narrative subsection
   ("…and how the platform handles authentication today").

**Pros / cons.**

- *Option 1.* Pro: scopes honesty per persona, matching the
  per-role role-doors 2.3 will ship; a partner reading the
  organizer subsection sees the auth caveat at the same
  attention boundary as the surface's described action; sets
  the M3-inherited copy contract per persona, which 2.3's
  role-doors also inherit (cross-phase contract cohesion).
  Con: repeats the caveat clause twice (organizer + volunteer);
  partner may parse it as two separate constraints when it's
  one shared platform-wide gate.
- *Option 2.* Pro: single statement avoids repetition. Con:
  separates the caveat from the persona's action description;
  partner reads the organizer subsection without the auth
  context until they reach the section-level note; weakens
  per-role honesty.
- *Option 3.* Con: the role-door invariant's reason ("Drift to
  'Try it now' / 'Click to play' copy without an auth-gate
  caveat would mislead a partner into a sign-in dead-end") binds
  any surface that depicts or links to the auth-gated targets
  — including the narrative. A narrative that says "the
  organizer authors questions" without naming the sign-in
  requirement misleads even if no link is attached.
- *Option 4.* Con: a fourth subsection introduces structural
  asymmetry; the platform's auth shape isn't a "fourth role,"
  and elevating it to subsection status puts disproportionate
  emphasis on a temporary state that M3 closes.

**Came down to.** Whether the auth-honesty rule should attach
per-persona (where the partner's attention is already on the
relevant surface) or section-level (one note covering all
auth-gated targets). Per-persona attaches more reliably to the
partner's reading flow.

**Resolution.** **Option 1. Per-subsection auth-state caveat.**

- **Attendee subsection:** no caveat. Plan-drafting confirms
  the gameplay route is open at plan-drafting time per the
  reality-check input below. (If the route has been gated
  since scoping, the resolution flips: attendee subsection
  also carries a caveat.)
- **Organizer subsection:** caveat names the magic-link sign-in
  requirement and the M3-bypass-pending state. Exact phrasing
  defers to plan-drafting against the milestone-level "Sign in
  or wait for demo mode" framing the role-doors invariant binds;
  scoping records that the caveat MUST appear in the same
  attention boundary as the persona-action description (not
  hoisted to a footer or a global note).
- **Volunteer subsection:** same shape as organizer.

The caveat copy is the contract M3's PR inherits — when
demo-mode bypass for test-event slugs lands, M3 revises both
organizer and volunteer subsections (and 2.3's role-doors)
in the same change. The plan's Risk Register inherits the
milestone-level "Role-door copy drift between M2 and M3" risk
unchanged.

**Cross-phase coordination with 2.3.** 2.3's role-doors will
also carry per-role auth-honest copy. The narrative's
per-persona caveat and the role-door's auth-gate copy are not
expected to be byte-identical (different surfaces, different
density, different attention contexts) but MUST agree on the
substantive claim (two surfaces auth-gated today, M3 unblocks).
Cross-phase coordination at 2.3 plan-drafting time confirms the
agreement; this scoping doc names the expectation so 2.3's
session inherits it.

**Verified by:**
[m2-home-page-rebuild.md "Role-door honesty against current
auth state" Cross-Phase Invariant](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(the invariant this resolution applies to the narrative's
descriptive surface);
[shared/urls/routes.ts:25-40](/shared/urls/routes.ts) (the
three route builders the personas correspond to);
[apps/web/src/pages/EventAdminPage.tsx](/apps/web/src/pages/EventAdminPage.tsx)
and
[apps/web/src/pages/EventRedeemPage.tsx](/apps/web/src/pages/EventRedeemPage.tsx)
(the auth gates the caveats name; plan-drafting re-reads at plan
time).

### 6. Outbound link strategy from the narrative — none [Resolved → narrative is description-only; role-doors carry click-through]

**What was decided.** Whether each persona subsection carries
its own outbound link to the relevant live surface (apps/site
event landing, apps/web game/admin/redeem), no outbound links
at all, or a single shared "see this in action" link at the
section footer.

**Options considered.**

1. **No outbound links from the narrative.** Description-only;
   role-doors (2.3's scope) are the sole click-through layer.
2. **One outbound link per persona subsection** targeting the
   relevant live surface (attendee → game, organizer → admin,
   volunteer → redeem).
3. **One shared "see Harvest end-to-end" link at the section
   footer** targeting `/event/harvest-block-party` (the rich
   event landing).

**Pros / cons.**

- *Option 1.* Pro: cleanly separates 2.2 (descriptive) from 2.3
  (CTA / click-through); avoids duplicate outbound surfaces
  on the same home page (narrative + role-doors both linking to
  the same targets reads as an over-eager nudge); reduces the
  scope of the cross-app navigation invariant walk for 2.2's
  diff (no apps/web outbound links to audit; the only outbound
  links on `/` are the showcase cards' same-app
  `routes.eventLanding` from 2.1). Con: a partner reading the
  narrative cannot click directly from the organizer paragraph
  to the admin surface; they must scroll to the role-doors
  (2.3's scope) or the showcase cards (2.1's scope) for
  click-through.
- *Option 2.* Pro: in-flow click-through for partners actively
  reading. Con: doubles outbound link surface on the home page
  (3 narrative links + 3 role-door links pointing at the same
  three surfaces); creates synchronization risk between
  narrative-link copy and role-door copy (both must stay
  auth-honest, both must use hard navigation cross-app, etc.);
  inflates 2.2's cross-app navigation invariant walk.
- *Option 3.* Pro: lower link surface than option 2; one
  same-app link to a destination that already exists. Con:
  duplicates the showcase-card link 2.1 already ships
  (`routes.eventLanding("harvest-block-party")` → same target),
  giving the home page two cards-and-narrative links to the
  same destination; weakens the showcase's role as the
  "preview the event" surface.

**Came down to.** Whether the narrative's job is to describe or
direct. The milestone Goal language separates them: "two
test-event showcase cards (preview both registered Themes
side-by-side)" + "an end-to-end Harvest narrative walks the
reader" + "three role-door entry points (Attendee / Organizer /
Volunteer) link out to live surfaces." Showcase = preview /
same-app. Narrative = description. Role-doors = click-through /
cross-app. Each surface owns one job; layering click-through
into the description blurs the separation 2.3 will rely on.

**Resolution.** **Option 1. No outbound links from the
narrative.** The narrative section is descriptive prose only.
Click-through to live surfaces happens via the showcase cards
(2.1, same-app event landing) and the role-doors (2.3,
cross-app role surfaces). Self-review walks the narrative's
markup for any outbound `<a href>` or `<Link href>` and
confirms zero — a found outbound link is the falsifier.

**Cross-phase coordination with 2.3.** 2.3 inherits the
expectation that role-doors are the sole click-through path
to apps/web role surfaces from the home page. If 2.3's planning
session decides to inline some click-through into adjacent
text or summary bullets near the role-doors, that's 2.3's call
— 2.2 does not pre-empt it. But 2.2's narrative section itself
remains link-free.

**Verified by:**
[m2-home-page-rebuild.md Goal](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone-level surface-job separation: showcase / narrative /
role-doors);
[apps/site/components/home/EventShowcaseCard.tsx](/apps/site/components/home/EventShowcaseCard.tsx)
(2.1's same-app `routes.eventLanding` link — the existing
home-page outbound surface this resolution does not duplicate).

### 7. ThemeScope wrap shape — section-level, Harvest-resolved [Resolved → single `<ThemeScope>` wrap on the narrative section]

**What was decided.** Whether the narrative section renders under
the platform Sage Civic Theme (apps/site default), under
Harvest's Theme via a single section-level `<ThemeScope>` wrap,
or under per-subsection wraps (one per persona, all resolving
to Harvest).

**Options considered.**

1. **Single section-level `<ThemeScope theme={getThemeForSlug(harvestContent.themeSlug)}>` wrap.**
   The whole narrative reads in Harvest's brand-color family
   (pumpkin) per the milestone Goal language framing this as a
   *Harvest* narrative.
2. **Platform default (no wrap).** Narrative reads in Sage
   Civic Theme like the rest of `.home-shell` between
   per-card showcases.
3. **Per-subsection wraps,** all three resolving to Harvest's
   Theme.
4. **Per-persona-themed wraps** — attendee in Harvest, organizer
   in some "organizer" Theme, volunteer in some "volunteer"
   Theme.

**Pros / cons.**

- *Option 1.* Pro: communicates "this is Harvest's story"
  visually via the brand-color cohesion; mirrors the
  showcase-card per-event Theme wrapping pattern 2.1 already
  established at the section level (each card wraps the same
  way 2.2's section will, with 2.2's wrap broader scope); a
  cohesive Harvest-themed section visually distinguishes the
  narrative from the platform-default surfaces above it. Con:
  if 2.3's role-doors also carry per-event Theme on Harvest-
  related cards, the home page's brand-color rhythm becomes
  showcase (mixed) → narrative (Harvest) → role-doors (?), which
  may read as either coherent or fragmented depending on 2.3's
  call.
- *Option 2.* Pro: visually consistent with the rest of
  `.home-shell` between showcases. Con: erases the milestone-
  Goal-level Harvest framing; the section reads as
  "narrative-shaped" not "Harvest-shaped"; misses the
  multi-theme exercise's broader story (the showcase
  side-by-side establishes Harvest's color identity; the
  narrative reinforces it through cohesion).
- *Option 3.* Con: three independent wraps resolving to the
  same Theme is redundant work — `<ThemeScope>` produces
  identical CSS variable scope whether scoped once outer or
  three times nested. The work is structural noise. Single
  section wrap is the simpler equivalent.
- *Option 4.* Con: the "organizer Theme" / "volunteer Theme"
  concept doesn't exist in
  [`shared/styles/themes/`](/shared/styles/themes/); inventing
  per-role color identities is a wholly new design surface
  outside this phase's milestone scope.

**Came down to.** Whether the narrative is "Harvest-shaped" or
"section-shaped." The Goal language ("end-to-end Harvest
narrative" — Harvest is the subject) makes it Harvest-shaped.
Visual cohesion via Theme wrapping reinforces the framing
without adding any new design surface.

**Brand-token discipline carries.** The same brand-token rule
2.1 binds for showcase cards (consume `var(--primary)`,
`var(--secondary)`, `var(--accent)`, `var(--bg)` on
brand-bearing surfaces; do NOT consume derived shades like
`var(--primary-surface)` per the empirical pinning at
[`docs/plans/themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md))
applies to any narrative-section surface that carries
Harvest brand identity (eyebrow color, persona-section underline,
heading accent if any). The plan's Contracts section restates
this rule (or references the 2.1 plan's contract — plan-drafting
chooses which form is cleaner against the milestone-level
binding).

**Resolution.** **Option 1. Single section-level
`<ThemeScope theme={getThemeForSlug(harvestContent.themeSlug)}>`
wrap.** The narrative section's outermost component
(plan-drafting names it; likely `HarvestNarrative.tsx`)
applies the wrap once; subsections inherit. Brand-token
discipline applies to all brand-bearing surfaces inside the
wrap.

**Verified by:**
[apps/site/components/home/EventShowcaseCard.tsx](/apps/site/components/home/EventShowcaseCard.tsx)
(2.1's per-card `<ThemeScope>` wrap pattern this section-level
wrap mirrors at broader scope);
[shared/styles/themes/harvest-block-party.ts:30](/shared/styles/themes/harvest-block-party.ts)
(`primary: "#b85c1c"` — pumpkin, the visible brand-color
falsifier the validation gate inspects);
[docs/plans/themescope-derived-shade-cascade.md](/docs/plans/themescope-derived-shade-cascade.md)
(the empirical pinning the brand-token rule mitigates,
inherited from 2.1).

### 8. Data sourcing — read Harvest `EventContent` for grounding facts; hardcode prose [Resolved → mixed]

**What was decided.** Whether narrative copy is fully hardcoded
prose, fully derived from Harvest's `EventContent` registry
([apps/site/events/harvest-block-party.ts](/apps/site/events/)
via [apps/site/lib/eventContent.ts](/apps/site/lib/eventContent.ts)),
or a mix.

**Options considered.**

1. **Mixed sourcing.** Persona-flow prose ("the attendee scans
   a QR code and answers questions") is hardcoded in the
   component. Concrete grounding facts (event dates, location,
   schedule references, lineup callouts if mentioned) read from
   `harvestContent.hero.dates` / `.location` etc. so they stay
   in sync with the registry the showcase card and rich event
   landing already consume.
2. **Fully hardcoded prose** including any grounding facts.
3. **Fully data-driven** including persona descriptions
   (introducing new `EventContent` fields per persona).

**Pros / cons.**

- *Option 1.* Pro: respects the milestone's "Event content
  shape" Settled-by-default decision (no parallel home-page-
  only event-summary type); concrete facts stay in sync if
  Harvest's content updates; keeps the narrative-prose
  storytelling component-local. Con: the component imports
  Harvest content from the registry (one extra import) and
  partially binds copy to data shape.
- *Option 2.* Con: any change to Harvest's dates / location
  requires a narrative edit in addition to the registry edit;
  drift risk; violates the milestone-default's "single source
  of truth for event content" framing.
- *Option 3.* Con: introducing new `EventContent` fields ("how
  the attendee uses this event," "how the organizer authors
  this event," etc.) is a data-shape change scoped to the
  home-page narrative — exactly the parallel-home-page-only
  type the milestone-default rejects. Also pre-empts whether
  any future event would have *different* persona narratives,
  which is a hypothetical the demo iteration shouldn't try to
  solve.

**Came down to.** Whether the storytelling is per-event or
platform-level. It's platform-level — the narrative describes
the platform's three-role arc through Harvest as a worked
example; another event with different content would have the
same three-role arc, not a different one. So the persona-flow
prose is platform-level (component-local hardcoded) and the
grounding facts are event-level (registry-driven).

**Resolution.** **Option 1. Mixed.**

- Persona-flow prose: hardcoded in the narrative component(s).
- Grounding facts (event dates, location, optionally one
  lineup or schedule callout if the prose names a specific
  performer or session): read from Harvest's `EventContent`
  via the existing registry import shape 2.1's
  EventShowcaseCard already established.

Plan-drafting decides which specific fields the prose
references. Likely `harvestContent.hero.dates`,
`.hero.location`, possibly nothing else (over-binding to data
shape can make the prose read mechanically). The slug remains
hardcoded per decision 9 below.

**Verified by:**
[apps/site/components/home/EventShowcaseCard.tsx](/apps/site/components/home/EventShowcaseCard.tsx)
(2.1's pattern: card consumes `content.hero.tagline`,
`.hero.dates`, `.hero.location`, etc. — the precedent for
narrative grounding facts);
[apps/site/lib/eventContent.ts](/apps/site/lib/eventContent.ts)
(the EventContent type + registry the narrative component
imports from);
[m2-home-page-rebuild.md "Event content shape"
Settled-by-default](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(milestone-level rule against parallel home-page-only types).

### 9. Slug source — hardcode `harvest-block-party` [Resolved → mirrors 2.1's slug-list-source resolution]

**What was decided.** Whether the narrative component reads the
Harvest slug from a registry filter (e.g.,
`registeredEventSlugs` filtered by `testEvent === true` and
some narrative-event flag), the
[`featuredGameSlug`](/shared/game-config/constants.ts) constant,
or a hardcoded literal in the component.

**Came down to.** Same logic as 2.1's decision 4: the narrative
is Harvest-specific by design (the milestone Goal says "Harvest
narrative" verbatim, not "the test event with the
narrative-feature flag"); hardcoding the slug keeps future
test-event additions explicit (a third test event added to the
registry should not silently start narrating, which a
flag-driven filter could cause); and `featuredGameSlug` resolves
to `"first-sample"` per
[`shared/game-config/constants.ts:2`](/shared/game-config/constants.ts),
which is unregistered in apps/site's EventContent registry per
[`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
— same trap 2.1 walked.

**Resolution.** **Hardcode `"harvest-block-party"` in the
narrative component.** The component imports Harvest's content
from the registry by hardcoded slug:

```ts
import { harvestBlockPartyContent } from "@/events/harvest-block-party";
```

(Or whatever the existing registry's import shape is at
plan-drafting time; plan-drafting confirms.) No runtime slug
resolution; no `featuredGameSlug` consumption; no
flag-driven filter.

**Verified by:**
[shared/game-config/constants.ts:2](/shared/game-config/constants.ts)
(`featuredGameSlug = "first-sample"`, unregistered in apps/site;
trap inherited from 2.1);
[apps/site/components/home/TwoEventShowcase.tsx](/apps/site/components/home/TwoEventShowcase.tsx)
(2.1's same pattern: hardcoded slug list at the component level);
[m2-phase-2-1.md decision 4](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md)
(predecessor scoping decision this mirrors).

### 10. Validation procedure — narrative-section close-up + cumulative-page capture + auth-honesty self-review walk [Resolved]

**What was decided.** How the validation gate exercises the
narrative section's claims (Harvest-themed rendering visible,
auth-honesty copy correct per persona, cumulative page-length
acceptable).

**Why it mattered.** The milestone doc's "Page-length sprawl"
risk explicitly invokes AGENTS.md "Bans on surface require
rendering the consequence" for the cumulative home page. The
"Multi-theme rendering visible in showcase but broken in
practice" risk applies to the section-level ThemeScope wrap
(decision 7) — same falsifier as 2.1's brand-token discipline.
The "Role-door honesty" invariant binds per-persona copy
(decision 5) but has no curl-able falsifier — it's
human-judgment.

**Options considered.**

1. **Three captures + per-persona copy walk.** (a) Narrative-
   section close-up (desktop) showing the section reads in
   Harvest pumpkin + per-persona auth-honesty caveats visible.
   (b) Cumulative full-page capture (desktop, full scroll
   height) showing 2.1 + 2.2 cohesion and rendering the
   page-length consequence. (c) Narrow-viewport cumulative
   capture confirming the narrative section reflows responsively
   (matching 2.1's narrow-viewport gate). Per-persona auth-
   honesty self-review walk against the `Internal-partner
   audience` invariant; brand-color falsifier sentence in PR
   body's Validation section.
2. **One capture only** (cumulative full-page desktop). One
   artifact; reviewers eyeball everything in one frame.
3. **Tier 5 in-progress-pending Status** until a partner
   actually reads the narrative end-to-end.

**Pros / cons.**

- *Option 1.* Pro: separates the section-level claims (theme
  rendering, auth-honesty visible) from the cumulative-claim
  (page-length sprawl rendered); the narrow-viewport capture
  catches reflow regression introduced by the narrative's
  per-persona structure; per-persona copy walk covers what no
  capture can (copy-honesty is human-readable). Con: three
  artifacts plus a self-review walk is heavier than 2.1's two
  captures + falsifier sentence.
- *Option 2.* Con: a single full-page capture obscures the
  per-section detail (auth caveats may not be legible at
  thumbnail scale); doesn't catch narrow-viewport reflow.
- *Option 3.* Con: the section is pure JSX + CSS + content
  copy with no proxy / CDN / runtime variance between preview
  and prod; same rejection as 2.1 decision 5 and M1 phase 1.1.
  Status flips to `Landed` directly.

**Came down to.** Whether the cumulative-page-length capture
and the section-close-up are review-distinct artifacts or
redundant. They are distinct: the close-up exercises the
section's own claims (theme, copy, structure); the cumulative
exercises the milestone-level page-length sprawl risk. The
narrow-viewport capture is the responsive-reflow falsifier 2.1
established as a pattern.

**Resolution.** **Option 1.**

Validation Gate procedure:

1. **Narrative-section close-up (desktop).** One capture of the
   narrative section at desktop viewport, scoped to the section
   (a partner-evaluator-relevant frame) showing the
   Harvest-themed rendering and the three persona subsections
   with their auth-honesty caveats visible.
2. **Cumulative full-page capture (desktop).** One capture of
   the full home page (`/`) at desktop scroll, including hero
   + showcase + narrative top-to-bottom (or stitched if a
   single capture cannot capture the full scroll). Renders the
   post-2.2 page-length consequence per the milestone-level
   page-length sprawl risk.
3. **Narrow-viewport cumulative capture.** One capture at
   narrow viewport (≤480px or whatever pattern 2.1 settled —
   plan-drafting confirms) showing the narrative section
   reflows correctly: persona subsections stack into a single
   column readability; no overflow; auth-honesty caveats remain
   legible.
4. **Brand-color falsifier sentence in PR body.** Mirror of 2.1:
   *"the narrative section's brand-bearing surfaces (eyebrow,
   persona heading underline, accent rules) read in Harvest's
   pumpkin family
   ([`#b85c1c`](/shared/styles/themes/harvest-block-party.ts)
   and warm-shade derivations from `--primary`); rendering in
   warm-cream defaults — or in any other registered Theme — is
   the falsifier that the section-level `<ThemeScope>` wrap is
   not applying."*
5. **Per-persona auth-honesty self-review walk.** Self-review
   walks each persona subsection's copy against the
   [`Role-door honesty against current auth state`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
   invariant: attendee subsection has no auth caveat (gameplay
   is open today; plan-drafting reality-checks at plan time);
   organizer subsection names sign-in + M3-pending; volunteer
   subsection names sign-in + M3-pending.
6. **Internal-partner-honesty self-review walk.** Self-review
   walks every sentence of narrative prose against the
   [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
   invariant. No marketing-style aspirational copy ("the
   all-in-one platform for…") that overpromises against what
   M1–M3 actually deliver.
7. **Outbound-link audit (decision 6).** Self-review confirms
   zero outbound `<a href>` / `<Link href>` in the narrative
   section's diff.

The validation gate does **not** include a Tier 5 post-deploy
production check (same rationale as 2.1: pure JSX + CSS +
content copy change with no proxy / CDN / runtime variance).
Status flips to `Landed` in this PR.

The validation gate does **not** include a noindex falsifier
(2.1 already shipped the route-scoped `metadata.robots`; 2.2
inherits unchanged). The plan's
"Files intentionally not touched" list confirms the page-route
metadata-emit shape is not modified.

**Verified by:**
[harvest-block-party.ts:30](/shared/styles/themes/harvest-block-party.ts)
(`primary: "#b85c1c"` — pumpkin, the brand-color falsifier);
[m2-phase-2-1-plan.md Validation Gate](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
(predecessor capture-pair pattern this resolution narrows for
2.2's scope: section-close-up replaces the showcase pair; the
cumulative + narrow-viewport pair carries forward);
[m2-home-page-rebuild.md "Page-length sprawl" Cross-Phase
Risk](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
(the milestone-level risk this validation procedure renders).

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they require
reading docs and components against actually-merged code at
plan-time, not against the scoping snapshot:

- **Narrative copy direction and persona-flow language.** The
  exact words for each persona subsection. Plan-drafting writes
  them against the
  [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
  invariant (decision 5's framing). Likely shape per persona:
  one eyebrow + heading + 1–2 paragraphs, with the auth caveat
  inline in the same paragraph as the persona-action description
  (decision 5). Total prose density target: the cumulative
  narrative section reads in roughly 1–2 viewport heights at
  desktop. Plan-drafting drafts; reviewers refine.
- **Component-family shape.** Whether the narrative ships as
  one orchestrator file (`HarvestNarrative.tsx`) with persona
  subsections inline, or one orchestrator + three per-persona
  files (`AttendeeStory.tsx`, `OrganizerStory.tsx`,
  `VolunteerStory.tsx`), or some intermediate shape (one
  orchestrator + one shared `NarrativePersona` taking persona-
  specific props). Plan-drafting decides based on prose density
  and the per-persona auth-caveat structural call. The
  fallback authorization in decision 1 names ">3 component
  files for narrative-specific work" as a split-trigger threshold.
- **CSS organization.** Same call as 2.1 (extend
  [globals.css](/apps/site/app/globals.css) in place vs. new
  partial). 2.1 extended in place with `.home-shell`,
  `.home-hero`, `.home-showcase`. 2.2's `.home-narrative` and
  per-persona scope rules likely extend in place; plan-drafting
  measures the post-2.2 globals.css LOC and confirms.
- **Self-Review Audit set against
  [docs/self-review-catalog.md](/docs/self-review-catalog.md).**
  Plan-drafting walks the catalog against the actual 2.2 diff
  surface. 2.1's audit walk concluded "none apply" because the
  catalog scopes to SQL / Edge Function / async-lifecycle / save
  paths / operational scripts surfaces, none of which 2.1
  touched. 2.2 has the same diff-surface character (server JSX,
  CSS, doc); the same conclusion is likely. Plan-drafting
  re-confirms against the actual catalog at plan-time and
  records the conclusion explicitly.
- **Validation Gate command list.** Beyond the captures named in
  decision 10, the plan names `npm run lint`,
  `npm run build:site`, `npm run build:web` per the PR-template
  default, and any apps/site Playwright suites that exercise
  the home page. Plan-drafting reads `package.json` `scripts`
  and `scripts/testing/` per AGENTS.md "Prefer existing wrapper
  scripts."
- **Commit boundaries.** Likely 2 commits: (1) narrative
  component(s) + page.tsx wire-up + globals.css extension, (2)
  milestone-doc Phase Status row update. Plan-drafting finalizes
  against the actual edit shape; if narrative copy density
  warrants a split (e.g., copy-only commit separable from
  structural skeleton), 3 commits.
- **Whether to reference the 2.1 plan's brand-token discipline
  contract or restate it in 2.2's plan.** Decision 7 says brand-
  token discipline carries; plan-drafting decides whether to
  restate the contract or reference 2.1 plan's
  [Contracts → Brand-token discipline](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md)
  by name. AGENTS.md "Plans describe contracts, PRs contain
  code" plus the duplication-reduction discipline from
  scoping/plan ownership suggests reference-by-name is the
  cleaner call.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns / plan
owns":

- Status, Context preamble, Goal
- Cross-Cutting Invariants — **references the milestone doc's
  Cross-Phase Invariants** rather than restating; only names
  per-phase additions if any. **No per-phase additions
  anticipated** for 2.2: the 4 milestone-level invariants
  (internal-partner honesty, two-theme exercise on showcase,
  role-door honesty, cross-app navigation hard-nav) all bind
  directly. Two-theme exercise on showcase is N/A for 2.2's
  diff (the showcase shipped in 2.1, unchanged) but self-review
  still walks it as a no-op. Cross-app navigation is N/A for
  the narrative (decision 6: zero outbound links) but self-
  review walks every link site against the rule for completeness.
- Naming
- Contracts — names the section-level `<ThemeScope>` wrap shape
  (decision 7), the per-persona auth-honesty copy contract
  M3 inherits (decision 5), the data-sourcing rule (decision 8),
  the slug-source rule (decision 9), the no-outbound-links rule
  (decision 6), and the brand-token discipline rule (decision 7,
  inherited from 2.1).
- Files to touch (estimate-labeled per AGENTS.md "Plan content
  is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate (per decision 10)
- Self-Review Audits (likely empty against
  [docs/self-review-catalog.md](/docs/self-review-catalog.md);
  plan-drafting confirms)
- Documentation Currency PR Gate — **references the milestone
  doc's Documentation Currency map** for the file list; names
  this PR as the satisfier of the Phase Status row update entry
  only (README, architecture, product currency are the M2-closing
  phase's burden per the milestone doc).
- Out Of Scope (final)
- Risk Register — **references the milestone doc's Cross-Phase
  Risks** for milestone-level risks; names plan-implementation-
  level risks here. The "Page-length sprawl" milestone-level
  risk is load-bearing for 2.2 specifically; the plan's Risk
  Register refines it with the validation-gate cumulative
  capture procedure that mitigates it.
- Backlog Impact — **references the milestone doc's Backlog
  Impact**; this PR opens no new entries by design.

The duplication-reduction discipline above is intentional: the
plan binds milestone-level content by reference, not by
restatement.

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not from
the scoping snapshot, per AGENTS.md "Reality-check gate between
scoping and plan":

- **`apps/site/app/page.tsx` post-2.1 shape unchanged since
  scoping.** The plan's wire-up assumes the post-2.1 composition
  (`<main className="home-shell">` containing
  `<HomeHero />` + `<TwoEventShowcase />`) is the input. If a
  sibling PR has touched the file between 2.1 landing and 2.2
  drafting, the plan starts from whatever is on main.
- **`apps/site/components/home/` family unchanged since 2.1.**
  HomeHero, TwoEventShowcase, EventShowcaseCard files exist as
  2.1 shipped them. The narrative component family slots into
  the same directory.
- **`apps/site/app/globals.css` `.home-shell` selector group
  intact.** Specifically the `.home-shell > section` width
  constraint and the section grid-gap rules (post-2.1 lines
  ~685–849) — the new `.home-narrative` selector inherits the
  width auto-centering convention; if the convention has been
  refactored, the new selector adopts whichever pattern is
  canonical at plan-drafting time.
- **`apps/site/lib/eventContent.ts` and
  `apps/site/events/harvest-block-party.ts` shape unchanged.**
  Specifically: Harvest content registers with `testEvent: true`,
  `themeSlug` resolves to a registered Theme, and the
  `hero.dates` / `hero.location` fields the narrative grounds
  on are populated. Plan-drafting confirms by reading the
  on-disk file.
- **`shared/styles/themes/harvest-block-party.ts` brand-color
  values unchanged.** Decision 7's brand-color falsifier
  references `primary: "#b85c1c"`; if Harvest has been
  recolored, the falsifier sentence in the validation gate
  needs the new value.
- **Color-mix derived-shade cascade behavior in apps/site under
  `<ThemeScope>`.** 2.1 already verified this empirically (the
  showcase cards' brand-token discipline rule presupposes the
  pinning behavior recorded at
  [`docs/plans/themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md)).
  2.2 inherits the verification; plan-drafting does not need a
  fresh manual rendering check unless a sibling change has
  altered the derived-shade pipeline since 2.1. Plan-drafting
  greps `globals.css` for any `--*-surface` / `--*-shade`
  derived-token rules introduced post-2.1 that might affect
  brand-bearing surfaces.
- **apps/web auth-gate behavior on `/event/:slug/admin` and
  `/event/:slug/game/redeem`.** Decision 5 names both as
  auth-gated. Plan-drafting re-reads
  [`apps/web/src/pages/EventAdminPage.tsx`](/apps/web/src/pages/EventAdminPage.tsx)
  and
  [`apps/web/src/pages/EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx)
  (and
  [`apps/web/src/pages/EventRedemptionsPage.tsx`](/apps/web/src/pages/EventRedemptionsPage.tsx)
  if it surfaces in narrative copy) at plan time; if M3's
  demo-mode bypass has landed unexpectedly between 2.1 and 2.2
  (unlikely per the milestone doc's M3 sequencing), the
  organizer / volunteer auth caveats in decision 5 flip to
  reflect the new state.
- **apps/web `/event/:slug/game` open-route status.** Decision
  5 names attendee gameplay as no-auth-required. Plan-drafting
  re-reads
  [`apps/web/src/pages/GameRoutePage.tsx`](/apps/web/src/pages/GameRoutePage.tsx)
  (or whichever apps/web route handler owns gameplay at plan
  time) at plan time to confirm; if a guard has been added to
  gameplay since scoping, the attendee subsection also requires
  an auth caveat per decision 5's contingency.
- **`shared/urls/routes.ts` builders unchanged.** Decision 5's
  URL targets reference `routes.eventAdmin`, `routes.gameRedeem`,
  `routes.gameRedemptions`. Plan-drafting confirms the builders
  resolve as expected; if the route table has been retargeted,
  the auth-caveat copy may need to name the new path implicitly.
  (The narrative does not link to these routes per decision 6 —
  the URL paths are referenced for self-review's auth-gate
  reality-check, not for outbound link rendering.)
- **Phase 2.3 scoping doc status.** If 2.3's scoping or planning
  session is in-flight at 2.2 plan-drafting time, plan-drafting
  reads any 2.3 scratchpads per the
  [parallel-scoping coordination](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md)
  pattern: confirm 2.3's role-door auth-honest copy direction
  agrees with 2.2's per-persona caveat copy on the substantive
  claim (decision 5's cross-phase coordination paragraph).
  If 2.3 has not started, plan-drafting drafts 2.2 against
  decision 5's framing and 2.3 inherits the contract when its
  session opens.

## Cross-phase coordination — 2.2 ↔ 2.3

Per the milestone doc's "Plan-drafting cadence" exception
(2.2 and 2.3 are mutually independent and may plan-draft in
parallel), this scoping records expectations 2.3's planning
session inherits:

- **Auth-honesty substantive claim agreement.** The narrative's
  per-persona caveats (decision 5) and 2.3's role-door copy
  must agree that organizer + volunteer surfaces are sign-in-
  gated today and unblock when M3 lands. Phrasing density
  differs (narrative is descriptive prose, role-door is CTA
  copy) but the substantive claim does not.
- **Outbound-link surface separation.** 2.2's narrative carries
  no outbound links (decision 6). 2.3's role-doors are the
  click-through layer to apps/web role surfaces. If 2.3
  scoping disputes this split, that's its planning session's
  call; 2.2 commits to no-outbound-links unless 2.3 specifically
  requests inline-narrative-CTA additions to share click
  surface, which would route through this scoping's revision
  rather than 2.2's plan-drafting.
- **Theme rendering in adjacent sections.** 2.2's narrative
  scopes Harvest's Theme via section-level `<ThemeScope>`
  (decision 7). 2.3's role-doors may render under the platform
  default (the doors are per-PERSONA, not per-event) or under
  per-event Themes (if a card depicts Harvest specifically,
  per-event wrap). 2.3's planning decides; 2.2 does not
  pre-empt.
- **Section-stacking idiom.** 2.1 established the `.home-shell >
  section` pattern. 2.2 adds `.home-narrative` as a third
  section. 2.3 adds role-doors as a fourth section (or however
  many it ships). All sections inherit the post-2.1
  width-auto-center convention; no section refactor expected
  through M2.

## Related Docs

- [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  parent milestone doc; phase 2.2 row at the Phase Status table.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — parent
  epic; M2 paragraph at lines 199–218.
- [`m2-phase-2-1-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-1-plan.md) —
  predecessor phase plan; 2.2 plugs into the
  `.home-shell` foundation 2.1 landed and inherits the brand-
  token discipline contract for ThemeScope-wrapped surfaces.
- [`scoping/m2-phase-2-1.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md) —
  predecessor scoping doc; precedent for this scoping's
  structure (PR-shape branch test, section-composition idiom,
  ThemeScope wrap pattern, capture-pair validation gate).
- [`m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md) —
  earlier phase plan; precedent for capture-pair validation and
  brand-token discipline; this scoping does not depend on it
  directly but it's the source of the empirical pinning the
  brand-token rule mitigates.
- [`themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md) —
  follow-up that frames the derived-shade discipline rule
  decision 7 binds; M2 phase 2.2 does not depend on this
  follow-up landing first.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  predecessor epic; the rich event landing
  (`/event/<slug>`) the role-doors invariant references and
  2.1's showcase card already links to.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "Scoping
  owns / plan owns," "PR-count predictions need a branch test,"
  "Plans describe contracts, PRs contain code,"
  "Reality-check gate between scoping and plan," "Bans on
  surface require rendering the consequence."
