# Madrona Launch Page Corrections Plan

## Status

`Landed`. Pre-launch corrections to the Madrona day-of attendee
surfaces, landed across two PRs before the 2026-08-11 opening
night: C1–C3 in the first, C4–C7 in the second, which also carries
this document. Drafted 2026-08-07 against organizer decisions of the
same date.
This plan explicitly invokes a scoping-doc skip and absorbs
`## Reality-check inputs` inline; the skip and the criteria it does not
satisfy are recorded in "Scoping-doc skip" below, and the header
variance is reported in the plan-doc PR body's `## Documentation`
section.

## Context

The Madrona day-of landing page is the surface an attendee opens while
standing on the grass at the Playfield. Four things on it are wrong for
that audience, and all four are cheap to correct before opening night.

The page calls the association's email list a "Newsletter." The
association already publishes a newsletter — a printed one, delivered in
the mail — so the word names the wrong thing, and the on-site signup
form it links to duplicates the association's real signup page, which
lives on Mailchimp and is already the canonical destination the
association points people at everywhere else. Two email lists is one too
many. No event on the platform wants an on-site signup surface, so the
surface comes out rather than being retired for one event.

The hero carries a line of accent-face copy that greets the visitor.
Everything below it already says where they are, and the treatment —
poster red, italic serif — reads as a different design system than the
sections beneath it. The page also carries an FAQ answering questions a
person asks *before* deciding to come, on a page they only reach once
they have already arrived.

The bottom of the page is the one place where an attendee who just had a
good evening can be asked for something. Today it ends with a footer
band. The association needs help on two different timescales — hands at
the concerts themselves, and volunteers for the association year-round —
and those are different asks with different destinations.

This plan covers those four corrections. It does not change the quiz,
the feedback flow, or the donation path, and it makes no change to the
data the platform stores.

## Goal

After this ships:

- Every attendee-facing affordance for the association's email list
  resolves to the association's Mailchimp signup page in a new browsing
  context, from the sticky masthead, the day-of landing action grid, the
  season-wrap action, and the quiz completion panel.
- No surface in either app uses the word "Newsletter" for the email
  list.
- The on-site email-signup surface no longer exists in the platform: the
  route, the form, its styles, and the `EventContent.newsletterSignup`
  shape are gone, and the paths that served it return the platform's
  not-found response for every slug.
- No anon-callable database function exists without a caller: the
  standalone signup RPC is dropped in the same change that removes its
  only caller.
- The opt-in log and its enablement registry are unchanged, and the
  feedback form's opt-in checkbox keeps working exactly as it does
  today.
- The day-of landing hero carries a quieter, body-face orientation line
  drawn from per-event Theme tokens, with no color literal added to the
  landing stylesheet.
- The day-of landing renders no FAQ for Madrona, while the generic
  template's FAQ section continues to render unchanged for the two test
  events.
- The day-of landing carries a volunteer section before the footer band,
  offering a night-of ask routed to the organizer and a year-round ask
  routed to the association's volunteer page, rendering only for events
  that author it, with the night-of ask absent once the season has
  ended.
- The quiz completion panel carries an optional volunteer item alongside
  the email-list and donation items, rendering only for events that
  author it.

## Scoping-doc skip

This plan does not qualify for the narrow-surface carve-out at
[`docs/agents/planning/plan.md:285-327`](/docs/agents/planning/plan.md):
it fails criterion 1 (it spans a UI surface and a backend-logic surface),
criterion 2 (the estimated non-test, non-generated file count exceeds
eight), criterion 3 (it removes an existing public RPC rather than adding
one), and criterion 4 (it introduces cross-cutting invariants that
multiple files must agree on). The scoping doc is skipped anyway, as an
explicit planner call, because the decisions a scoping doc exists to
surface were all settled with the organizer on 2026-08-07 against a
rendered mock of every variant, and because opening night is
2026-08-11. The carve-out's protective intent is preserved rather than
skipped: `## Reality-check inputs` below carries the falsifier protocol
against every load-bearing claim, per the same file's "Verification
protocols are not optional under this carve-out" rule at
[`docs/agents/planning/plan.md:329-338`](/docs/agents/planning/plan.md).

## Reality-check inputs

Retrieved 2026-08-07 against the working tree at `main`.

**Route availability is not per-event, despite reading that way.** Both
event subpages prerender for every registered slug regardless of whether
that event opted in, because each route's static-params function
enumerates the full registry
(`Verified by:` [apps/site/app/event/[slug]/signup/page.tsx:25-27](/apps/site/app/event/%5Bslug%5D/signup/page.tsx);
the same shape at [apps/site/app/event/[slug]/feedback/page.tsx:25-27](/apps/site/app/event/%5Bslug%5D/feedback/page.tsx)).
Content presence switches the render branch to an inline disabled state
rather than a not-found
(`Verified by:` [apps/site/app/event/[slug]/signup/page.tsx:95-110](/apps/site/app/event/%5Bslug%5D/signup/page.tsx)).
Two crawlable signup pages therefore ship today for events that never
authored the block. Removing the route removes those with it, which is
why full removal is cheaper than the per-event retirement this plan
originally contracted.

**The masthead cannot express externality and cannot gate an item.**
The link shape is a label and an href with no externality field
(`Verified by:` [shared/masthead/mastheadContent.ts:37-40](/shared/masthead/mastheadContent.ts)),
all four content slots are required
(`Verified by:` [shared/masthead/mastheadContent.ts:48-59](/shared/masthead/mastheadContent.ts)),
the nav item list is a hardcoded array inside the component
(`Verified by:` [shared/masthead/EventMasthead.tsx:81-85](/shared/masthead/EventMasthead.tsx)),
and the donate item's new-tab behavior is a hardcoded branch outside
that loop
(`Verified by:` [shared/masthead/EventMasthead.tsx:109-116](/shared/masthead/EventMasthead.tsx)).
The injected-link contract carries no target or rel
(`Verified by:` [shared/masthead/EventMasthead.tsx:13-18](/shared/masthead/EventMasthead.tsx)).
There is one supplier of injected components
(`Verified by:` [apps/site/components/event/SiteEventMasthead.tsx:37](/apps/site/components/event/SiteEventMasthead.tsx));
apps/web supplies none
(`Verified by:` [apps/web/src/App.tsx:252](/apps/web/src/App.tsx)).

**The landing action-grid destination is renderer-owned.** The tile's
href is composed from the slug inside the component and gated on the
signup form content
(`Verified by:` [apps/site/components/event/EventDayOfLanding.tsx:97-105](/apps/site/components/event/EventDayOfLanding.tsx)),
as is the season-wrap action
(`Verified by:` [apps/site/components/event/LandingTonightSections.tsx:201-208](/apps/site/components/event/LandingTonightSections.tsx)).
The action shape carries no href
(`Verified by:` [apps/site/lib/eventContent.ts:215-223](/apps/site/lib/eventContent.ts)).
The donate tile is the existing content-owned-destination precedent in
the same component
(`Verified by:` [apps/site/components/event/EventDayOfLanding.tsx:118](/apps/site/components/event/EventDayOfLanding.tsx)).

**The completion panel derives externality from persistence, not from
the link.** Both anchors take one target and rel computed solely from
whether the completed quiz state is confirmed on the device, and the
block's render gate names only two sections
(`Verified by:` [apps/web/src/game/components/GameCompletionPanel.tsx:89-101](/apps/web/src/game/components/GameCompletionPanel.tsx)).
The Madrona registry entry is shared by object identity with the
`first-sample` demo fixture
(`Verified by:` [shared/events/completionCta.ts:93-96](/shared/events/completionCta.ts)),
so any edit to one changes the other.

**The opt-in log outlives the signup surface.** The feedback form's
checkbox writes through the same helper into the same log table
(`Verified by:` [supabase/migrations/20260510000000_split_newsletter_opt_ins.sql:158-160](/supabase/migrations/20260510000000_split_newsletter_opt_ins.sql)),
whose foreign key targets the enablement registry under delete-restrict
(`Verified by:` [supabase/migrations/20260805000000_add_standalone_newsletter_signup.sql:98-105](/supabase/migrations/20260805000000_add_standalone_newsletter_signup.sql)),
and the checkbox's render gate reads only whether an email has been
typed
(`Verified by:` [apps/site/app/event/[slug]/feedback/FeedbackForm.tsx:43](/apps/site/app/event/%5Bslug%5D/feedback/FeedbackForm.tsx)).
The standalone RPC is a thin wrapper over that shared helper and is
granted to anonymous callers
(`Verified by:` [supabase/migrations/20260805000000_add_standalone_newsletter_signup.sql:127-144](/supabase/migrations/20260805000000_add_standalone_newsletter_signup.sql)).
Falsifier walked: the observation that would prove the log safe to drop
is no remaining writer, and the feedback write-through is exactly that
writer — so the log and registry stay and only the wrapper goes. A
procedure that checked only the signup form's callers could not have
distinguished those two, which is why the check ran against every caller
of the shared helper rather than every caller of the RPC.

**The FAQ is already presence-guarded at both consumers**, so emptying
Madrona's entries needs no renderer change to protect the two test
events
(`Verified by:` [apps/site/components/event/EventLandingPage.tsx:85](/apps/site/components/event/EventLandingPage.tsx);
[apps/site/components/event/EventDayOfLanding.tsx:138](/apps/site/components/event/EventDayOfLanding.tsx)).
The field is currently required
(`Verified by:` [apps/site/lib/eventContent.ts:342](/apps/site/lib/eventContent.ts)).
Nothing else consumes FAQ entries: no structured-data emitter, no
sitemap route, and route metadata reads only the meta block, so the
removal has no crawl surface. Falsifier walked: the observation that
would prove this wrong is an FAQ string appearing in built output for a
page other than the two generic-template events; the site build plus the
generic-template section suite discriminate that from a renderer no-op,
because the suite asserts the generic heading still renders for a
fixture that authors entries
(`Verified by:` [tests/site/event/sectionComponents.test.tsx:555-569](/tests/site/event/sectionComponents.test.tsx)).

**The hero line's treatment is documented as contrast-tuned to this
exact use.** The landing stylesheet's header states it carries no color
literals and names the welcome line as one of two consumers of the
garnish token
(`Verified by:` [apps/site/app/styles/_landing.scss:1-36](/apps/site/app/styles/_landing.scss)),
the rule pairs the garnish color with the accent face
(`Verified by:` [apps/site/app/styles/_landing.scss:80-86](/apps/site/app/styles/_landing.scss)),
and the theme documents the token's value as tuned against the hero
gradient's darkest stop specifically for this line
(`Verified by:` [shared/styles/themes/madrona.ts:81-86](/shared/styles/themes/madrona.ts);
token contract at [shared/styles/types.ts:79-86](/shared/styles/types.ts)).
Retiring the line's use of the token leaves the main-set stars as its
only consumer in this layout, which neither note says.

**The landing page changes state after the final concert.** The tonight
resolver returns a season-wrap branch that replaces the Tonight and
On-stage sections from the day after the last night
(`Verified by:` [apps/site/components/event/LandingTonightSections.tsx:186-223](/apps/site/components/event/LandingTonightSections.tsx)),
and the Madrona content documents that transition as beginning Aug 26
(`Verified by:` [apps/site/events/madrona.ts:74-78](/apps/site/events/madrona.ts)).
Falsifier walked: a volunteer section rendered outside that resolver's
branch survives into the wrap state. The observation that would prove a
naive implementation wrong is a night-of, time-specific ask still
rendering on Aug 26 alongside season-wrap copy — which a test that only
fakes a concert-day clock cannot surface, so the volunteer contract
below is asserted against a post-season clock as well.

**Tests pin the current shape at nine load-bearing sites.** The welcome
line's selector, string, and existence
(`Verified by:` [tests/site/event/dayOfLanding.test.tsx:73-90](/tests/site/event/dayOfLanding.test.tsx));
the four action-tile destinations
(`Verified by:` [tests/site/event/dayOfLanding.test.tsx:92-109](/tests/site/event/dayOfLanding.test.tsx));
the FAQ heading and a question string, together with the footer band's
volunteer sentence in the same case
(`Verified by:` [tests/site/event/dayOfLanding.test.tsx:217-241](/tests/site/event/dayOfLanding.test.tsx));
the presenting band's document position relative to the On-stage heading
(`Verified by:` [tests/site/event/dayOfLanding.test.tsx:136-153](/tests/site/event/dayOfLanding.test.tsx));
the season-wrap newsletter action
(`Verified by:` [tests/site/event/dayOfLanding.test.tsx:294-302](/tests/site/event/dayOfLanding.test.tsx));
the masthead's label and href
(`Verified by:` [tests/shared/masthead/mastheadContent.test.ts:17-18](/tests/shared/masthead/mastheadContent.test.ts));
the assertion that donate is the *only* new-tab item in the bar
(`Verified by:` [tests/shared/masthead/EventMasthead.test.tsx:53-66](/tests/shared/masthead/EventMasthead.test.tsx));
the completion CTA's same-tab-when-persisted posture
(`Verified by:` [tests/web/game/components/GameCompletionPanel.test.tsx:448-458 and 483-494](/tests/web/game/components/GameCompletionPanel.test.tsx));
and a registry invariant requiring every completion-CTA newsletter href
to match the on-site signup path shape for an enabled slug
(`Verified by:` [tests/shared/events/completionCta.test.ts:38-52](/tests/shared/events/completionCta.test.ts)).
That last one is written to fail exactly when a newsletter destination
stops being an on-site signup path, which is what this plan does
deliberately. It is a coverage relocation, not a deletion — see the
Validation Gate.

**The database suite asserts the surface being removed.** A pgTAP file
asserts the registry seed, the RPC's grants, and a live anonymous call
to the RPC
(`Verified by:` [supabase/tests/database/newsletter_signup_data_model.test.sql:56-60 and 132-172](/supabase/tests/database/newsletter_signup_data_model.test.sql)).
Its table, RLS, FK, and constraint cases cover structures this plan
keeps; only its RPC cases cover the structure this plan drops.

**No Playwright spec exercises the apps/site landing page.** Every e2e
spec targets the quiz app's routes; the day-of landing's coverage is
entirely Vitest. Falsifier walked: the observation that would prove this
wrong is an e2e failure on a route this plan touches; the full local
validation run discriminates that from a Vitest-only regression because
it runs both suites and reports them separately.

**The working tree carries two untracked paths on `main`** — a generated
repo map and a tools directory — which the branch-hygiene gate must
resolve before the first edit.

## Cross-Cutting Invariants

- **One email destination.** Every surface offering the association's
  email list resolves to the same content-owned external destination.
  No renderer derives an email-list destination from the event slug.
- **Externality is content-owned, not component-hardcoded.** Whether a
  link opens in a new browsing context is expressed in that link's own
  content shape and applied uniformly by the renderer. No component
  names a specific event, or a specific link slot, to decide it.
- **Render-when-present.** Every field this plan adds is optional at the
  type level and truthiness-guarded at each renderer, so an event that
  omits it renders byte-identically to the pre-change output, per
  [apps/site/lib/eventContent.ts:52-58](/apps/site/lib/eventContent.ts).
- **No color literals in the landing stylesheet.** Every surface, face,
  and mark added to
  [apps/site/app/styles/_landing.scss](/apps/site/app/styles/_landing.scss)
  resolves from a per-event Theme custom property, per that file's own
  header rule.

## Naming

- `landing.volunteer` — the optional day-of landing content block, a
  sibling of `landing.presentingSponsor` on `EventDayOfLandingContent`.
- `.event-landing-volunteer-*` — the CSS class family for the volunteer
  section, following the file's existing section-part convention.
- `volunteer` — the optional third section on `CompletionCtaContent`,
  shaped as the existing `CompletionCtaLink`.
- The externality field added to the masthead link shape, the landing
  action shape, and the completion CTA link shape carries the same name
  in all three places.

## Contracts

### C1 — Email-list destination

Every attendee-facing email-list affordance resolves to the
association's Mailchimp signup page, opened in a new browsing context
with a `noopener` relationship, on all four surfaces: the sticky
masthead nav item, the day-of landing action tile, the season-wrap
action, and the quiz completion panel. The destination is a single
content-owned value per surface registry; no renderer composes it from
the slug.

None of the four surfaces labels the affordance "Newsletter." The
association's newsletter is a printed mailer, and the label naming the
wrong artifact is the defect this contract exists to fix.

The Mailchimp page is the association's canonical signup destination
(`Verified by:` organizer decision 2026-08-07; the address is recorded
in Resolved Decisions below. The page disallows automated fetching, so
the plan records the organizer as the authority rather than claiming a
retrieved verification).

### C2 — Externality expressible in shared shapes

The masthead link shape can express that a destination is external and
opens in a new context, for any nav item rather than only the donate
pill, and the renderer applies that expression uniformly. After this
change no component branch decides externality by naming a link slot.

The completion panel's link rendering distinguishes two independent
reasons a link may open in a new context: a link that is external by
its own content, and a link opened in a new context because the
completed quiz state is not yet confirmed durable on the device. An
external link opens in a new context regardless of persistence state. A
same-origin link keeps the existing persistence-derived behavior
unchanged, so the protection that motivated it — never letting a
navigation destroy the only copy of an attendee's check-in code —
survives intact for every link that still needs it.

The masthead's active-state vocabulary no longer names a page that does
not exist. Both apps render the same masthead component and apps/web
supplies no injected link components; any change to the link contract
keeps that call site working without adding one.

### C3 — On-site email signup removed from the platform

The platform serves no on-site email-signup surface. The route, its
form component, its styles, and the `EventContent.newsletterSignup`
shape are removed, and the paths that served it return the platform's
not-found response for every slug rather than a rendered disabled
state. No event, registered or future, carries an unlinked signup page.

The standalone signup RPC is dropped in the same change that removes
its only caller, so no anon-callable database function is left without
one.

The opt-in log, its enablement registry, and the internal helper that
writes to it are unchanged, because the feedback form's opt-in checkbox
writes through them and its behavior is not in this plan's scope. The
database suite's coverage of those retained structures is retained;
only its coverage of the dropped function is removed, and the file's
name continues to describe what it covers.

### C4 — Hero orientation line

The day-of landing hero carries one short orientation line beneath the
masthead art, set in the body face at a small scale in a muted Theme
color, in sentence case. It does not use the accent face or the garnish
color.

The line's content remains a per-event content field, and the layout
remains platform-generic: the treatment change lands in the shared
landing stylesheet and becomes the platform default for every event
that adopts the day-of layout. That is intended — no event should
inherit Madrona's poster red for this line, which is the argument the
stylesheet's own header makes.

The garnish token's remaining consumer in this layout is the main-set
star mark. The two places documenting the token's value as tuned for
the hero line against the hero gradient's darkest stop are corrected to
describe the surfaces the token actually lands on.

### C5 — FAQ removed from the Madrona day-of page

The Madrona day-of landing renders no FAQ section and no FAQ heading.

The FAQ capability is unchanged at the platform level: the generic
template continues to render the section for the two test events, the
generic section component keeps its current behavior, and the content
type remains honest about whether entries are required or optional.

The day-of FAQ style rules become unreferenced by every currently
registered event. They are either removed or retained with the reason
stated in the file. If removed, the tap-target minimum their comment
documents for the footer contact link survives at the rule that still
needs it.

### C6 — Volunteer section on the day-of landing

The day-of landing renders a volunteer section between the season strip
and the footer band, only when the event's landing content authors it.
An event that omits the block renders byte-identically to the
pre-change output.

The section carries two distinct asks with two distinct destinations: a
night-of ask, whose destination is the organizer contact the event
already authors, and a year-round ask, whose destination is the
association's volunteer page as an external new-context link. The two
asks are distinguishable to a reader as different commitments, because
they are — the association's own volunteer page lists the year-round
Music in the Playfield role as a multi-month commitment, which is not
what a night-of ask is asking for
(`Verified by:` https://madrona.us/volunteers/, retrieved 2026-08-07,
which lists "Music in the Playfield Team" at 20 hours January–May
alongside an on-call role at flexible hours).

The night-of ask does not render once the season has ended. It resolves
against the same event-local clock the Tonight and season-wrap sections
resolve against, so it leaves the page in the same transition that
replaces the run-of-show. The year-round ask is unconditional and
survives that transition; the section as a whole renders in both
states.

The page makes the volunteer ask once. The footer band's existing
volunteer sentence and this section do not restate the same ask;
whichever carries it, the other does not duplicate it.

The section's surfaces, faces, and marks resolve from Theme tokens with
no color literal added. Interactive targets hold the 44px minimum the
file applies to every other tap target, and small text takes no opacity
reduction — both are standing rules of that stylesheet carried for
contrast reasons.

### C7 — Volunteer item on the quiz completion panel

The completion CTA registry can carry an optional volunteer section
alongside its email-list and donation sections, shaped identically to
them. The panel renders it when authored and omits it when absent.

The block's render gate accounts for the new section, so an event
authoring only a volunteer section still renders the block. Before this
change the gate named only two sections, which would silently drop such
an event.

The Madrona registry entry authors it. The demo fixture that shares the
Madrona entry by object identity therefore also renders it; that
sharing is either kept deliberately or broken deliberately, and the
choice is stated where the registry documents the alias.

## Resolved Decisions

Organizer decisions of 2026-08-07. The mock reviewed to reach them is
not a durable repo artifact, so the decisions are recorded here.

1. **Email-list destination.** The association's Mailchimp community
   email page at `https://mailchi.mp/madrona/madrona-neighborhood-association-community-email`
   is the canonical signup destination.
2. **On-site signup surface.** Removed from the platform, not retired
   per-event. No event calls for it.
3. **Email-list label.** The affordance is labelled as an email list and
   its supporting line describes neighborhood news from the association.
   The word "Newsletter" is retired from attendee surfaces.
4. **Hero line treatment.** The quiet body-face treatment, not a
   display-face heading and not removal of the line.
5. **Volunteer section shape.** Two separately-headed asks, each with
   its own action.
6. **Completion panel volunteer item.** In scope.
7. **Feedback form opt-in checkbox.** Unchanged, and expected to remain
   so past the 2026 season; addresses collected there reach the list by
   manual export. Recorded in Backlog Impact.

## PR Sequence

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Plan content is a mix of rules and estimates"; the implementer may
revise the split when a structural call requires deviating, recorded in
the PR body's `## Estimate Deviations` section. The contracts above are
rules and do not move with the split.

### PR 1 — Email list to Mailchimp, on-site signup removed

Satisfies C1, C2, C3. Touches the shared masthead shape and component,
the shared completion-CTA registry and the quiz completion panel, the
day-of landing action grid and season-wrap action, the landing content
type, the Madrona content module, the removed route tree, and one
migration.

The two shared-shape changes — externality on the masthead link, and a
content-owned destination for the landing action — ride here because
both are prerequisites of the destination change and neither is
independently reviewable without it.

### PR 2 — Day-of landing page copy and volunteer push

Satisfies C4, C5, C6, C7. Touches the Madrona content module, the
day-of landing layout and its stylesheet, the landing content type, the
completion-CTA registry and panel for the volunteer item, and the theme
token's contrast documentation.

C7 sits here rather than in PR 1 because it is a volunteer-ask change
and reviews with the other volunteer work, even though it touches a
file PR 1 also touches.

### Ordering rationale

PR 1 carries the factual error: a label naming the wrong artifact, a
live form competing with the association's real one, and two crawlable
pages advertising a feature no event has. It lands first so that if only
one PR makes opening night, it is the one fixing something wrong rather
than something improvable.

## Files To Touch

This list is the planner's pre-implementation estimate of the expected
diff shape per "Plan content is a mix of rules and estimates";
implementation may revise it when a structural call requires deviating,
recorded in the PR body's `## Estimate Deviations` section.

### New

One migration under [supabase/migrations/](/supabase/migrations/)
dropping the standalone signup function. No new source files: the
volunteer section is a block within the existing day-of landing layout
and its styles are rules within the existing landing stylesheet.

### Removed

[apps/site/app/event/[slug]/signup/](/apps/site/app/event/%5Bslug%5D/signup/)
in full, and the signup styles at
[apps/site/app/styles/_signup.scss](/apps/site/app/styles/_signup.scss)
with its registration in the app's style entrypoint.

### Modify

PR 1: [shared/masthead/mastheadContent.ts](/shared/masthead/mastheadContent.ts),
[shared/masthead/EventMasthead.tsx](/shared/masthead/EventMasthead.tsx),
[apps/site/components/event/SiteEventMasthead.tsx](/apps/site/components/event/SiteEventMasthead.tsx),
[shared/events/completionCta.ts](/shared/events/completionCta.ts),
[apps/web/src/game/components/GameCompletionPanel.tsx](/apps/web/src/game/components/GameCompletionPanel.tsx),
[apps/site/lib/eventContent.ts](/apps/site/lib/eventContent.ts),
[apps/site/components/event/EventDayOfLanding.tsx](/apps/site/components/event/EventDayOfLanding.tsx),
[apps/site/components/event/LandingTonightSections.tsx](/apps/site/components/event/LandingTonightSections.tsx),
[apps/site/events/madrona.ts](/apps/site/events/madrona.ts),
[shared/db/types.ts](/shared/db/types.ts) via the generator,
[supabase/tests/database/newsletter_signup_data_model.test.sql](/supabase/tests/database/newsletter_signup_data_model.test.sql),
and the five Vitest files named in the Reality-check inputs.

PR 2: [apps/site/lib/eventContent.ts](/apps/site/lib/eventContent.ts),
[apps/site/components/event/EventDayOfLanding.tsx](/apps/site/components/event/EventDayOfLanding.tsx),
[apps/site/components/event/LandingTonightSections.tsx](/apps/site/components/event/LandingTonightSections.tsx),
[apps/site/app/styles/_landing.scss](/apps/site/app/styles/_landing.scss),
[apps/site/events/madrona.ts](/apps/site/events/madrona.ts),
[shared/events/completionCta.ts](/shared/events/completionCta.ts),
[apps/web/src/game/components/GameCompletionPanel.tsx](/apps/web/src/game/components/GameCompletionPanel.tsx),
[shared/styles/themes/madrona.ts](/shared/styles/themes/madrona.ts),
[shared/styles/types.ts](/shared/styles/types.ts),
and the day-of landing and completion-panel Vitest files.

Reconciled to what PR 2 shipped. Six files beyond the estimate, each
pulled in by a contract the estimate already carried:

- [shared/events/madrona-facts.ts](/shared/events/madrona-facts.ts)
  — the volunteer URL is stated by both C6 and C7, which is the
  condition this module exists to serve.
- [apps/site/components/event/EventFAQ.tsx](/apps/site/components/event/EventFAQ.tsx)
  and [apps/site/components/event/EventLandingPage.tsx](/apps/site/components/event/EventLandingPage.tsx)
  — C5 made `faq` optional rather than empty, and both follow the
  type.
- [scripts/ui-review/capture-ui-review.cjs](/scripts/ui-review/capture-ui-review.cjs)
  — the Validation Gate requires a post-season capture, which the
  script could not produce. See the Validation Gate note below.
- [tests/site/event/sectionComponents.test.tsx](/tests/site/event/sectionComponents.test.tsx)
  and [tests/shared/events/completionCta.test.ts](/tests/shared/events/completionCta.test.ts)
  — the generic-template FAQ call site and the registry invariants.

Docs touched: [docs/experience.md](/docs/experience.md) (the layout's
section list, the completion CTA's externality sentence) and
[docs/styling.md](/docs/styling.md) (both garnish rows, the accent-face
row, and the contrast table's binding-constraint paragraph, which the
new hero pairing displaces).

### Intentionally not touched

An expectation, not a prohibition; the implementer may touch these with
rationale recorded as an estimate deviation.

- The opt-in log, the enablement registry, the internal write helper,
  and the feedback RPC — every migration except the one dropping the
  standalone function.
- [apps/site/app/event/[slug]/feedback/](/apps/site/app/event/%5Bslug%5D/feedback/).
  The opt-in checkbox is unchanged by organizer decision.
- [apps/site/events/harvest-block-party.ts](/apps/site/events/harvest-block-party.ts)
  and [apps/site/events/riverside-jam.ts](/apps/site/events/riverside-jam.ts).
  Their deliberate omission of the day-of layout is the structural
  falsifier for the render-when-present invariant.
- [apps/web/src/App.tsx](/apps/web/src/App.tsx). The masthead link
  contract change keeps this call site working without an injected
  component.

## Execution Steps

This section is an estimate per "Plan content is a mix of rules and
estimates"; the implementer may deviate with rationale recorded as an
Estimate Deviation. Each gate is a distinct step and none collapse into
another.

1. **Baseline validation.** Run the repo's local validation entry point
   and both app builds before any edit. A failure here stops the session
   and is reported rather than edited around.
2. **Branch hygiene.** Resolve the two untracked paths on `main` so they
   cannot mix into the diff, and move to a feature branch.
3. **Before-state UI capture.** Capture the day-of landing and the quiz
   completion panel at a mobile viewport before editing, per the repo's
   UI review workflow, so the PR carries a matched before/after pair at
   the same routes, states, viewport, and scroll context.
4. **Implementation, PR 1.** Contracts C1, C2, C3.
5. **Implementation, PR 2.** Contracts C4, C5, C6, C7.
6. **Self-review audits.** Run the audits named below at each commit
   boundary rather than once at the end.
7. **Automated code-review feedback.** Address findings on each PR; a
   finding naming a gap this plan should have contracted corrects the
   plan first and the code second.
8. **Documentation currency.** The gate below.
9. **After-state UI capture and final validation.** Re-run the full
   local validation surface, including the database suite for PR 1, and
   capture the matching after-state.
10. **PR preparation.** Both PR bodies carry every template section,
    with `## Estimate Deviations` filled or explicitly `N/A`, and the
    before/after captures in `## UX Review`.

### Commit boundaries

Estimate, same labeling as above.

PR 1 separates the shared-shape change from the destination change: one
commit makes externality expressible in the three link contracts with no
destination moved and no behavior changed; a second moves the four
destinations and removes the route tree and the content shape; a third
carries the migration and the database-suite edit; a fourth moves the
affected component-test coverage.

PR 2 separates the three landing changes — hero line, FAQ removal,
volunteer section — from the completion-panel volunteer item, so a
reviewer reading the landing diff is not also reading the quiz app.

As shipped, PR 2 carries five commits rather than four: the four
above, preceded by the UI-capture fix, which is a defect in the
review tooling rather than part of any contract and is reviewable on
its own.

## Validation Gate

Each procedure was walked for a falsifier it can distinguish from
neighboring failure modes.

- **Every email-list affordance reaches Mailchimp in a new context.**
  Component-level assertions at all four surfaces asserting the
  destination and the new-context attributes together. Falsifier: an
  affordance still resolving to an on-site path, or opening in the same
  tab. Asserting destination alone would not discriminate the second
  from success, so both are asserted in one case.
- **The masthead's externality is content-driven, not slot-driven.** The
  existing case asserting donate is the only new-tab item is rewritten
  to assert that exactly the items whose content declares externality
  open in a new context. Falsifier: an item hardcoded external by slot
  passes a slot-shaped assertion and fails a content-shaped one, which
  is why the assertion is rewritten rather than amended.
- **The completion panel's two reasons for a new context are
  independent.** Cases covering both persistence states crossed with
  both link kinds. Falsifier: an external link reverting to same-tab
  when the completed state is durable, which a single-state test cannot
  surface.
- **No path serves a signup page.** A route-level assertion that the
  removed path is not in the built route set, for every registered slug.
  Falsifier: a removal implemented by emptying the page body rather than
  deleting the route, which a rendered-output assertion alone would pass.
- **The registry invariant on completion-CTA email hrefs still protects
  something.** The existing case requiring every such href to be an
  on-site signup path is rewritten, not deleted, to assert the
  destination posture the registry now holds. Falsifier: the invariant
  silently becoming vacuous. Coverage is relocated rather than weakened,
  per the stop-and-report condition on deleting assertions.
- **The feedback opt-in path is unbroken.** The database suite's
  feedback write-through cases pass unchanged after the migration.
  Falsifier: a migration that drops the shared helper along with the
  wrapper; the feedback cases exercise the helper and the signup cases
  do not, so only the feedback cases discriminate them.
- **The two test events render byte-identically.** The existing
  structural-omission case plus the generic-template section suite.
  Falsifier: a change removing the FAQ everywhere rather than for
  Madrona; the generic-template suite asserts the heading still renders
  for a fixture with entries.
- **The night-of volunteer ask leaves with the season.** Assertions at a
  concert-day clock and at a post-season clock. Falsifier: a section
  rendered outside the resolver's branch, which a concert-day-only test
  cannot surface.
- **The landing stylesheet gained no color literal.** A diff read of
  that file against its own header rule at commit time, plus the site
  build. Falsifier: a literal that compiles fine and only shows as wrong
  branding on a future event — which no build can catch, which is why
  this is a diff-read gate.
- **The change reads correctly on a phone.** The mobile-first
  before/after capture pair. Falsifier: layout or contrast regressions
  that pass every assertion above.

This gate could not be run as written, and the fix landed in PR 2.
Site-mode capture pointed at `127.0.0.1`; `next dev` treats that as a
different origin from the `localhost` it binds and refuses its own dev
resources, so React never hydrated and every site capture ever taken
recorded the server-resolved state. The day-of layout picks its
section in a mount effect, so the post-season capture this gate
requires was not merely missing — it was unobtainable, and the
before/after pair would have compared two build-time states while
looking correct. The script now targets `localhost`, waits on
hydration as an observed precondition, and captures both clock states
per run.

Two further checks were run beyond what this section specified, both
because a passing assertion would not have distinguished success from
a silent no-op:

- **The season gate and the CTA render gate were mutation-tested.**
  Each was reverted to its pre-change form and the suite re-run, to
  confirm the new cases fail rather than pass vacuously. They fail on
  exactly one case each.
- **Tap targets were measured, not read back.** `getComputedStyle`
  echoes the authored declaration and cannot see an ancestor clipping
  the box. Every anchor in the volunteer section and the footer was
  probed with an `elementFromPoint` sweep on the live page; all
  deliver 44 rows of a 44px box.

Validation runs through the repo's wrapper scripts rather than raw tool
invocations: the local validation entry point, the lint entry point, the
Vitest entry point, the database-test entry point, both app build entry
points, the type generator, and the UI review capture entry point
(`Verified by:` [package.json](/package.json) scripts block, which
defines `validate:local`, `lint`, `test`, `test:db`, `build:site`,
`build:web`, `db:gen-types`, and `ui:review:capture`; the UI capture
expectation at
[docs/agents/workflows/ui-review.md:19-27](/docs/agents/workflows/ui-review.md)).

## Self-Review Audits

Audit names from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md);
implementer reads the catalog at implementation time and matches audit
names to the diff surfaces below.

SQL:

- **Grant/body contract audit:** the dropped function's grants are
  revoked with it and no grant survives its body.
- **Legacy-data precheck:** the retained log and registry keep every
  row; the migration removes a function, not data.
- **pgTAP output-format stability audit:** the database suite's plan
  count matches the cases that remain after the RPC cases are removed.

Frontend:

- **Effect cleanup audit:** the day-of landing's tonight resolver owns a
  one-shot post-hydration state read and a recurring interval. Both PRs
  bring that file into the diff, so self-review walks the effect set for
  cleanup and dependency correctness.
- **Error-surfacing for user-initiated mutations:** every destination in
  this plan is a link, so the expected outcome is that this audit does
  not apply. Recorded so the implementer confirms rather than assumes.

Documentation:

- **Route or topology coupling audit:** a route family is removed and
  four destinations move from same-origin to cross-origin. Self-review
  walks whether any routing or proxy documentation describes a topology
  the code no longer has.
- **Canonical-owner duplication audit:** the architecture, experience,
  and product docs each describe the newsletter surfaces. Self-review
  confirms one canonical owner per claim.
- **Validation-command coupling audit:** fires only if package scripts
  change.

Workflow:

- **Verified-by citation walk:** every `Verified by:` annotation in each
  PR's diff cites a path and line range retrieved fresh in the same
  response that wrote the citation.
- **Plan-to-PR Completion Gate:** every Goal bullet is satisfied in one
  of the two PRs or explicitly deferred in this plan with rationale.
- **Cross-cutting invariant walk:** each of the four invariants has at
  least one assertion naming it.

## Documentation Currency PR Gate

Docs with status-oriented or current-state sections this change makes
stale, updated before handoff:

- [docs/architecture.md](/docs/architecture.md) — the signup route
  entry, its gating description, the migration narrative describing the
  standalone signup surface, and the backend-surface function list.
- [docs/experience.md](/docs/experience.md) — the four-tile action grid
  description including its renderer-owned-destinations claim, which
  this plan deliberately reverses for one tile; the season-wrap
  description; and the completion CTA's same-tab rationale, which now
  has an external-link exception.
- [docs/product.md](/docs/product.md) — the current implemented slice's
  route inventory and its description of the feedback route's opt-in.
- [docs/styling.md](/docs/styling.md) and the two garnish-token contrast
  notes named in C4.
- [shared/db/permissions.snapshot.md](/shared/db/permissions.snapshot.md)
  — regenerated, not hand-edited.
- [docs/backlog.md](/docs/backlog.md) — see Backlog Impact.
- [docs/tracking/dev-workflow-improvements.md](/docs/tracking/dev-workflow-improvements.md)
  — the cross-app link item names the completion-screen newsletter CTA
  as its example, and a manual verification step tells the reader to
  click that CTA and land on the signup form.
- This plan's own Status, flipped by the second PR.

## Out Of Scope

Boundary calls, as final answers. Each deferred item names the trigger
that starts it.

- **The feedback form's newsletter opt-in checkbox.** Unchanged by
  organizer decision, and expected to stay that way past the 2026
  season. Addresses collected there reach the list by manual export
  after each concert. Trigger for revisiting: export volume becoming
  burdensome, or a season where the organizer is not the exporter.
- **Per-event subpage sets.** Today an event cannot express which pages
  it has. Content presence gates the *render* but not the *route*, so
  every event route prerenders for every slug; and the masthead cannot
  gate at all, because it never receives `EventContent` and all four of
  its link slots are required. This plan removes one surface rather than
  making the set variable. Trigger: a second non-test event wanting a
  different page set. Recorded in Backlog Impact so the question exists
  outside this plan.
- **The subscription plugin's scope.** The backlog item contemplating a
  feedback-plus-subscription plugin is scoped around absorbing the
  standalone signup page, which this plan deletes. Its premise no longer
  holds. Trigger: immediate — the item needs rewriting or closing
  regardless of when the plugin is built.
- **Documentation that misdescribes the platform.** The home page tells
  visitors organizers author schedule, lineup, sponsors, and FAQ in an
  admin workspace, which is not true of the shipped system; the
  demo-expansion epic cites a section of the open-questions doc that
  does not exist; the plugin concept is documented only in a landed
  routing plan and an archived decision record while the architecture
  doc describes plugin routing without defining a plugin; and the
  organization-isolation roadmap is unreferenced by any index. None of
  it is attendee-facing. Trigger: immediate, as a docs-only change on a
  week without a concert.
- **A Madrona-launch epic.** The parent demo-build epic terminates at M3
  and reassigns launch-readiness work to a future sibling epic that does
  not exist
  (`Verified by:` [docs/plans/epics/madrona-demo-build/epic.md:186-256](/docs/plans/epics/madrona-demo-build/epic.md)).
  This plan is filed flat as a cross-cutting plan rather than creating
  that epic four days before opening night.

## Risk Register

- **A destination this plan cannot fetch.** The Mailchimp page
  disallows automated retrieval. Mitigation: the destination is a single
  content-owned value in one place per surface registry, and the UI
  capture step includes following the link once by hand and confirming
  it lands on the association's signup form.
- **Coverage relocation read as coverage deletion.** Four existing
  assertions encode postures this plan deliberately reverses, and the
  database suite loses cases. Mitigation: each is rewritten in the same
  commit that changes the behavior, and the Validation Gate names each
  rewrite with its falsifier so a reviewer can tell relocation from
  weakening without reading the diff cold.
- **A route removal that strands a link.** Four surfaces link to the
  removed path today and a fifth renders its active state. Mitigation:
  the "no path serves a signup page" gate asserts against the built
  route set rather than against any one component, so a missed link
  surfaces as a build-time or route-level failure rather than a 404 an
  attendee finds on a Tuesday.
- **A platform-wide treatment change made for one event.** The hero
  line's new treatment lands in a platform-generic stylesheet.
  Mitigation: the treatment resolves entirely from Theme tokens, so an
  event wanting a different one changes its theme rather than the
  layout.
- **A volunteer ask that outlives the season.** Mitigation: C6 contracts
  the night-of ask against the same clock the run-of-show resolves
  against, and the Validation Gate asserts a post-season clock.
- **Two volunteer asks competing on one page.** Mitigation: C6 contracts
  that the page makes the ask once, and the existing footer assertion is
  the site that surfaces a violation.
- **The launch date.** Opening night is 2026-08-11, the first of three.
  Mitigation: the PR ordering places the factual correction first, so a
  slip loses the improvement rather than the fix; and copy-only
  revisions to the volunteer section and completion panel remain
  single-file content edits in the weeks between concerts.

## Backlog Impact

- **Opened.** Decide how an event expresses which subpages it has.
  Content presence gates the render but not the route, and the masthead
  cannot gate at all. Trigger: a second non-test event wanting a
  different page set.
- **Opened.** Rewrite or close the feedback-plus-subscription plugin
  item, whose scope is built around the signup page this plan deletes.
- **Opened.** Correct the platform documentation named in Out Of Scope,
  including the home-page narrative describing authoring the product
  does not support.
- **Changed.** The cross-app-link item names the completion-screen
  newsletter CTA as its worked example; that example becomes a
  cross-origin link and stops exercising the same-origin proxy problem.
  The underlying gap is unchanged and its example needs replacing.
- **Closed.** Nothing.

## Related Docs

- [docs/agents/planning/shared.md](/docs/agents/planning/shared.md) and
  [docs/agents/planning/plan.md](/docs/agents/planning/plan.md) — the
  rules this plan is drafted against.
- [docs/agents/reference/architecture-guardrails.md](/docs/agents/reference/architecture-guardrails.md)
  — mandatory pre-edit read for both PRs; Styling Token Discipline
  governs the landing stylesheet diff and Cross-app navigation governs
  the four moved destinations.
- [docs/agents/workflows/ui-review.md](/docs/agents/workflows/ui-review.md)
  — the before/after capture contract.
- [docs/self-review-catalog.md](/docs/self-review-catalog.md) — the
  audit definitions named above.
- [docs/plans/epics/madrona-demo-build/epic.md](/docs/plans/epics/madrona-demo-build/epic.md)
  — the parent effort whose milestones authored the content this plan
  corrects.
- [docs/plans/epics/madrona-feedback/epic.md](/docs/plans/epics/madrona-feedback/epic.md)
  — owner of the feedback form surface this plan leaves unchanged.
- [docs/plans/archive/newsletter-subscription-split.md](/docs/plans/archive/newsletter-subscription-split.md)
  — the archived decision record the retained migrations cite.
- [docs/tracking/organization-isolation-roadmap.md](/docs/tracking/organization-isolation-roadmap.md)
  — the multi-tenancy roadmap the subpage-set question will eventually
  meet.
