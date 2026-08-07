# Neighborhood Game — Product Overview

## Document Role

This doc explains why the product should exist, who it serves, what success looks like, and what stays out of scope.

Related docs:

- `experience.md` covers the attendee, volunteer, and organizer experience
- `architecture.md` covers system shape, data, and backend responsibilities
- `dev.md` covers implementation choices, tooling, and milestone sequencing
- `open-questions.md` tracks unresolved product and operating decisions that the repo should not guess

## Purpose
A mobile-first neighborhood game designed for local events (concerts, fairs, markets) that drives sponsor engagement and reward participation through a short, interactive game experience. Organizers control all content and sponsorships, enabling lightweight fundraising without adding operational complexity.

## Problem
Neighborhood associations have limited, low-friction ways to:
- Generate meaningful sponsor revenue beyond logos and banners
- Engage attendees during events in a way that feels fun and optional
- Connect local businesses to the community in a measurable way

Existing tools (forms, generic trivia platforms) are not designed for in-person, mobile, event-based engagement.

## Solution
Provide a fast, mobile-native game experience that:
- Feels like a lightweight game, not a form
- Takes under 2 minutes to complete
- Rewards completion with a reward entry
- Embeds sponsor visibility directly into questions

Organizers configure the game, sell sponsored questions to local businesses, and use the game as both an engagement and fundraising tool.

## Current Implemented Slice

Today the repo implements:

- an internal-partner demo home page at `/` (hero + two-event
  showcase + end-to-end Harvest narrative + Attendee/Organizer/
  Volunteer role-door cards)
- published attendee game routes at `/event/:slug/game`
- backend-verified completion with one entitlement per event/session pair
- attendee completion-screen polling that reflects redeemed vs
  unredeemed state from the trusted backend while the completion result
  stays open
- shared game correctness, validation, and scoring logic
- an organizer-facing admin workspace at `/admin` for drafting, editing, publishing, and unpublishing events
- `game_starts` table and session-issuance write so analytics has the funnel denominator (starts → completions → entitlements) before the first live event
- an authenticated agent-facing redeem route at `/event/:slug/game/redeem` for fast booth-side code entry, and an authenticated organizer-facing monitoring + reversal route at `/event/:slug/game/redemptions` for dispute handling (list, filter, search, reverse with optional reason), both direct-URL only until role seeding
- a read-only demo-mode bypass on the auth-gated event surfaces (admin, redeem, redemptions) for the two test-event slugs (`harvest-block-party`, `riverside-jam`), reaching internal-partner demos without sign-in; mutations stay rejected server-side, and every apps/web URL under a test-event slug — bypass surfaces and the gameplay route alike — emits `noindex` uniformly at parity with the apps/site test-event landings, keeping test events invisible to public search end-to-end
- a public per-event attendee-feedback route at `/event/:slug/feedback` for end-of-event feedback (star + N/A ratings across content-authored dimensions, optional free-text, optional email, and an optional mailing-list opt-in tied to that email), available for events whose per-event content module carries a feedback block (unknown slugs render 404; known slugs without feedback content render a friendly disabled-state), with submissions durably persisted to a feedback-submissions table — gated server-side at submit time by a slug-keyed registry FK — and, when the attendee opts in, a separate append-only consent log written in the same transaction for organizer review
- a **day-of companion** event landing page for events that author it, plus a shared event masthead that renders the same nav bar across both apps — see "The Day-Of Companion Model" below

### The Day-Of Companion Model

The Madrona redesign settled what an event's own surfaces are *for*,
and the answer binds the product, not just one event's design:

- **The landing page is a day-of companion, not a second marketing
  site.** Visitors arrive already knowing what the event is — from a
  poster, a newsletter, the organizer's own site. The page therefore
  never reintroduces the event: no address block, no what-is-this
  paragraph, no series-length subheader. It welcomes you, shows
  tonight, and puts the actions one tap away. The organizer's
  marketing presence keeps the job of explaining the event; competing
  with it would be both redundant and worse.
- **Tonight is resolved, not authored.** Events author their nights
  once; the page resolves which one is "tonight" against the event's
  own timezone, holds it until local midnight so post-show visitors
  still see the right night, and falls back to a season wrap-up after
  the final night. No organizer edits the page day-to-day.
- **The quiz is one destination with three durable states**, not a
  flow that can be lost. Leaving the quiz and coming back returns you
  where you were — including to a completed result with its check-in
  code intact. This is what lets every surface link freely to every
  other one.
- **The platform points at an organization's email list; it does not
  run one.** An organization at this scale already has a list on a
  mail provider, and a second in-platform signup form competes with
  the one it puts on every poster. So the email-list affordance is a
  content-owned external destination on every surface that offers it,
  and the platform serves no signup route. The one thing the platform
  does own is the opt-in checkbox on the feedback form, because that
  address arrives as part of feedback the organizer already asked for;
  those reach the list by export.
- **Sponsors get two placements, and they mean different things.** An
  event-wide *presenting* sponsor appears on every night; a *headliner*
  sponsor is credited per night alongside that night's artist. Both are
  content, not code.
- **Reward language bans two nouns.** "Trinket" and "raffle" are
  forbidden. This is a product rule rather than a per-event style
  preference, but be precise about what enforces it, because the
  enforcement is uneven: checked-in copy and seed content are swept and
  stay swept because the repo is reviewed. **Admin-authored content is
  not validated at all** — `validateGameConfig` checks question and
  answer structure only, and neither the save nor the publish path
  inspects wording, so an organizer can type "raffle" into a prompt,
  explanation, option, or event field and it will publish. The live
  rows were swept once by hand (33/33 questions) and nothing keeps them
  clean. For authored content this is guidance backed by review, not a
  guarantee; adding a canonical server-side check is a tracked
  follow-up. The canonical replacement phrasing is the generic "show
  your code to the booth to claim a reward," but **natural variants are
  expected and allowed**: shipped copy says "your reward entry is now
  recorded," "you're checked in for the reward," and seeds
  `entitlementLabel` as "reward ticket." What the rule forbids is the
  two banned nouns and the promise structure they carry (a draw, a
  chance to win), not any particular sentence.

What remains as future product work:

- admin draft preview (let an organizer see the attendee experience before publishing)
- organizer-visible reporting surface for post-event metrics
- richer live-event operations (slug expiry, scheduled publish, multi-game events)

## Target Users

### Primary (Buyer / Operator)
- Neighborhood association organizers
- Event coordinators for local community events

### End Users
- Event attendees (families, individuals at concerts/fairs)

### Indirect Stakeholders
- Local business sponsors

## Core Value Proposition

### For Organizers
- New, simple fundraising mechanism tied to engagement
- Minimal setup and operational overhead
- Reusable year over year

### For Attendees
- Quick, fun activity during the event
- Chance to win a reward prize
- Discover local businesses in a low-pressure way

### For Sponsors
- Active engagement (not passive logo placement)
- Association with a community experience
- Potential for recall and foot traffic

## Product Principles
1. Mobile-first, outdoor-ready  
2. Zero friction  
3. Short and engaging  
4. Feels like a game, not a form  
5. Operationally simple  

## Non-Goals (MVP)
- Building a generalized SaaS platform  
- Complex analytics dashboards  
- Strong anti-fraud systems  
- Payments or billing infrastructure  

## Context of First Use
Initial deployment target: Madrona Music in the Playfield (Seattle neighborhood concert series). A demo-build phase precedes the live deployment: the [Madrona demo-build epic](/docs/plans/epics/madrona-demo-build/epic.md) builds a stakeholder-shareable demo of the Madrona experience, and a future Madrona-launch sibling epic owns the live event launch (volunteer training, QR poster production, production smoke run, real attendee operations).

This event will serve as the primary validation environment for:
- Participation rate
- Sponsor willingness to pay
- Operational simplicity
- Real-world UX performance

## Definition of Success (Initial Event)
- Attendees can discover, complete, and redeem the game without assistance  
- Volunteers can verify completion easily  
- Organizers can set up the experience in under 1 hour  
- At least one sponsor expresses willingness to pay for inclusion in future events  

---

# Success Criteria

## Event-Level KPIs
- ≥30% of estimated attendees start the game  
- ≥70% of participants complete the game  
- At least 1–3 sponsors express willingness to pay for inclusion in a future event  

## UX KPIs
- Median completion time ≤ 2 minutes  
- Page load / transition time feels instantaneous (<500ms perceived delay)  
- After the last answer, the app immediately shows a stable verification-in-progress state with explicit wait guidance until official proof is ready  
- No critical errors during event usage  

## Operational KPIs
- Organizer setup time ≤ 1 hour  
- Volunteers can be trained in ≤ 2 minutes  
- No real-time technical intervention required during event
