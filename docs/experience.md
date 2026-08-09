# Neighborhood Game — UX Philosophy and Experience

## Document Role

This doc describes how the product should feel and behave for users.

It should answer questions like:

- What should the experience feel like?
- What should the user flow look like?
- How should the interface be laid out on mobile?
- How should sponsors appear in the experience?
- What should the completion moment communicate?

Implementation details such as backend structure, data ownership, and stack choice belong in `architecture.md` and `dev.md`.
Cross-cutting unresolved UX and live-operation questions belong in `open-questions.md`.

## UX Philosophy

The product should feel like a neighborhood game booth that happens to live on a phone, not a survey that happens to offer a prize.

That philosophy leads to six core decisions:

1. Real-world first  
The experience must work for distracted people standing outdoors, often one-handed, in bright light, with inconsistent connectivity.

2. Game energy, not game complexity  
The interaction should feel playful, fast, and rewarding without introducing rules, instructions, or mechanics that need explanation.

3. One decision at a time  
Each screen should ask for exactly one meaningful action. Reading, selecting, and continuing should feel obvious at a glance.

4. Momentum over browsing  
The product should pull users forward with progress, pacing, and visual confidence. It should never feel like a long form or a website to explore.

5. Sponsor presence without sponsor drag  
Sponsors should feel like part of the event experience, not an interruption. Their presence should add local character, not friction.

6. Completion must feel official  
The final state has to be unmistakable so a volunteer can verify it in seconds and hand over the reward ticket with confidence.

## Product UX Principles

- Mobile-first is not a responsive afterthought. The phone experience is the product.
- Fast beats clever. Anything that adds interpretation cost should be removed.
- Short beats rich. Five to seven questions is enough.
- Legibility beats decoration. Outdoor readability matters more than visual density.
- Progress should always be visible.
- Error states should be rare, plain-language, and recoverable in one tap.

## Copy Experience

The product text should behave like a calm event host.

That means the copy should do four jobs well:

1. orient the user quickly
2. explain the next action plainly
3. keep the experience feeling short and official
4. avoid internal product or implementation jargon

### Who The Text Is For

The product has a few distinct reading contexts, and the copy should adapt to each one.

#### Demo Overview

The current `/` route is a demo overview, not the attendee entry point.

The likely reader is:

- an organizer previewing the concept
- a teammate reviewing the flow
- a sponsor or volunteer trying to understand what attendees will see

This reader may have little context. The text on the demo overview should:

- say clearly that this is a preview surface
- explain the product promise in plain language
- point people into a concrete attendee demo quickly
- avoid sounding like attendee instructions when the page is really for evaluation

#### Attendee Intro And Game Chrome

The real attendee arrives from a QR code, often standing outside, holding a phone with one hand, and giving the experience only a few seconds of patience.

The attendee likely knows:

- the event name
- that there is some kind of game or reward

The attendee may not know:

- how long the flow takes
- whether they need an account
- what happens after they finish

So the intro and shared game text should:

- confirm the time commitment immediately
- make the reward or completion outcome concrete
- keep every instruction short and directional
- sound human and confident, not promotional or technical

Answering these is the **event's** job, not the platform's. The intro
panel renders one piece of platform copy — the estimated-time chip,
which is derived from config and which no event could phrase better —
and otherwise composes event-owned content: a heading from the
`quizIntro` registry (`shared/events/quizIntro.ts`) and the event's
`intro` paragraph. It previously also rendered a heading built from
the entitlement label and a three-bullet list answering the "may not
know" items above in the platform's voice. Written once for every
event, that copy could not say anything true of the event rendering
it, and it restated a reward the page had already promised twice. An
event that registers no heading renders none.

#### Completion And Volunteer Handoff

The completion state has two readers:

- the attendee who wants to know whether they are done
- the volunteer who wants to verify completion in seconds

The text here should:

- feel official
- put the proof state first
- tell the attendee exactly what to show and where to go
- keep retake or review language secondary to the reward handoff

#### Error And Dead-End States

These readers are confused by definition. They may have tapped a bad link, lost the session, or opened the demo in an incomplete environment.

The text should:

- name the problem in plain language
- avoid blaming the user
- offer one obvious next step
- keep recovery language short enough to read under stress

### Desired End State For Product Text

Across the experience, the copy should follow these rules:

- Use demo language on preview surfaces and attendee language on game surfaces.
- Lead with what the user gets or does next, not with internal product framing.
- Prefer concrete phrases like "Start game", "Show this screen at the MNA booth", and "Start over" over abstract labels.
- Name the redemption place the same way on every surface an attendee reads. One physical table once called "the booth" above the quiz title, "the volunteer table" on the completion heading, and "the volunteer" on the code card is three names, and volunteers and printed signage cannot match all three. The name is event-owned content and lives in the `redemptionLocation` registry (`shared/events/redemptionLocation.ts`); surfaces compose from it rather than restating it. Events that register no location keep the platform's generic "the volunteer table" wording. The surviving surfaces are the completion heading and the code card — the quiz page head no longer names it, per the rule below.
- Promise the reward once per screen. The pre-start screen said it three times: a page-head line under the title, a panel heading composed from the entitlement label, and the event's own intro paragraph. Each was defensible alone and the stack read as filler. The event's intro paragraph is the one that survives, because it is the only one an event can write in its own voice.
- Keep buttons and helper text action-first and easy to scan from a distance.
- Use proof-oriented language on completion screens so the handoff feels trustworthy.
- Keep error messages recoverable first; any development-only setup detail should come after the user-facing explanation.

## Experience Structure

The attendee-facing experience should be extremely short and linear:

1. Entry screen
2. Question sequence
3. Completion / reward verification screen

There should not be a traditional marketing-style homepage in front of the game. The QR code should open directly into the event game experience, with only a minimal entry screen that confirms:

- event name
- short value proposition
- estimated time to complete
- reward
- primary CTA

Example entry promise: "Answer 6 quick questions, support local sponsors, and get a reward ticket in under 2 minutes."

## Event Landing Page (Day-Of Companion)

An event's landing page is the day-of companion to the organizer's own
marketing presence, not a second marketing site. Visitors arrive
already knowing what the event is — from a poster, a newsletter, or
the organizer's website — so the page never reintroduces it: no
address block, no what-is-this paragraph, no series-length subheader.
Its jobs, in order: orient you, show tonight, put the actions —
quiz, email list, feedback, donate — one tap away, and ask for a hand
on the way out.

Events opt into this layout by authoring `EventContent.landing`
(events without it keep the generic multi-section template). The
layout, top to bottom:

1. **Hero** — brand gradient, the event's masthead art inlined as
   SVG, and one short orientation line in the body face at a muted
   scale. Nothing else. The line names what the page carries rather
   than greeting the reader; the art above it already says where they
   are, and a second display face here read as a different design
   system than the sections beneath it.
2. **Action grid** — four big tiles (quiz / email list / feedback /
   donate), each with a one-line subtitle. Three destinations are
   renderer-owned so the grid can never disagree with the routes.
   The email-list tile is the exception: the platform serves no
   email-signup route to derive a destination from, so that tile's
   href is a content field and the tile renders only when the event
   authors one. Content that declares its destination external opens
   it in a new browsing context, which is how an attendee standing on
   the grass keeps the day-of page behind them.
3. **Tonight** — the featured night's date line and per-night
   run-of-show, resolved by `resolveTonight` in the event's own
   timezone: on a concert day the page shows that night until local
   midnight (post-show visitors still see tonight); other days show
   the next night retitled "Next concert"; after the final night the
   section becomes a season wrap-up emphasizing the email list and
   donate, while the quiz stays available. The page is statically
   prerendered, so the build-time state is baked in and a mount
   effect re-resolves against the device clock.
4. **Presenting sponsor band** — tinted full-width band naming the
   event-wide presenting sponsor, every night.
5. **On stage** — the featured night's artist: photo, accent-face
   tagline, short bio, verified-link chips (a chip's presence is a
   claim of verification), and the night's headliner-sponsor credit
   line.
6. **This season** — a compact strip of the season's nights with the
   featured night highlighted; the only nod to the series. Deep
   artist content lives one tap away or on the organizer's site.
7. **FAQ** (optional) — day-of practical answers only, per the
   no-reintroduction rule above. Madrona authors none: an FAQ
   answering what-is-this, how-much, and where-do-I-park is written
   for someone still deciding whether to come, on a page they only
   reach once they have. The section and its styles are kept for
   events that do have something to answer.
8. **Volunteer** (optional) — two separately-headed asks, because
   they are two different commitments: a night-of ask routed to the
   organizer contact the event already authors, and a year-round ask
   routed to the organization's own volunteer page as an external
   link. The night-of ask resolves against the same clock the
   run-of-show does and stops rendering once the season has ended,
   so the page never asks a reader to help at a concert that is not
   coming; the year-round ask and the section itself survive that
   transition. The page makes the volunteer ask once — an event
   authoring this section omits the footer's volunteer line.
9. **Footer** — dark brand band: banner line, the contact address,
   and optionally a line naming who puts the event on.

Reward-language rule, restated from the design spec because it binds
all surfaces including this one: the words "trinket" and "raffle"
appear nowhere. The canonical replacement phrasing is the generic
"show your code to the booth to claim a reward," and natural variants
of it are allowed — the rule bans the two nouns and the draw/chance
framing they imply, not every sentence but one. See
[`product.md`](/docs/product.md) "The Day-Of Companion Model."

## Should Each Question Be Its Own Page?

No. Each question should be a single visible card inside a lightweight SPA flow, not a separate hard-loaded page.

Why:

- It supports the product principle that the experience should feel instant.
- It avoids network-dependent page reloads at an outdoor event.
- It feels more like a game sequence and less like a form wizard.
- It keeps the user anchored in one consistent interface with visible progress.
- It aligns with the current architecture direction of a SPA frontend with a single fetch.

Important nuance: each question should still behave like its own step.

That means:

- only one question visible at a time
- clear progress indicator
- transition forward after an explicit submit action
- allow a back action so attendees can revisit and change previously submitted answers before finishing
- device-local state persistence so refreshes and navigating away restore the run instead of resetting it

So the right model is: one application shell, one card at a time, one step per view.

## Recommended User Flow

### A) Attendee Flow
1. Sees QR code or short link at the event
2. Lands on a simple entry screen with event title, time-to-complete, and reward CTA
3. Starts the game with one tap
4. Answers 5-7 questions, one card at a time
5. Can move backward during the game to review or change submitted answers
6. Sees a clear completion state with verification token or visual pattern
7. Shows the completion screen to a volunteer
8. Receives reward ticket
9. May optionally retake the game for fun or score improvement without earning another reward entry
10. Can leave the game and return later on the same device: the completed screen, answer review, and verification code come back without replaying

### B) Volunteer Flow
1. Sees attendee completion screen
2. Confirms visual proof quickly
3. Gives reward ticket

The volunteer should never need to navigate a dashboard or inspect answers.

### C) Organizer Flow
1. Creates event
2. Adds questions and sponsor attributions
3. Publishes the game
4. Shares QR code
5. Runs event with little or no live intervention

## Visual Direction

The visual system should feel local, warm, civic, and festive. It should not feel corporate, arcade-neon, or like generic startup SaaS.

### Color Approach

Use a small, high-contrast palette that reads well outdoors:

- Background: warm paper / cream `#F6F1E7`
- Primary text: deep evergreen `#1F3A32`
- Primary action: sunset orange `#D96B2B`
- Secondary accent: lake blue `#2F6F8F`
- Highlight / progress accent: marigold `#E3B23C`
- Success / completion: fresh green `#3F8F5A`

Rules:

- Keep the background light for daylight readability.
- Use dark text instead of light gray text.
- Use saturated accents sparingly so CTAs feel obvious.
- Allow event theming through a single accent override, but keep core contrast intact.

### Typography

Typography should feel friendly and event-like, not bureaucratic.

- Display or heading font: something with character and warmth
- Body font: highly legible sans serif
- Large type sizes by default
- Short line lengths on mobile

The tone should say "community event" rather than "application form."

## Layout System

### Mobile Layout

The default layout should be a vertically stacked, single-column flow sized for small phones.

Recommended structure:

- top area: event name + progress
- center: question card
- bottom: answer options and CTA

Layout rules:

- generous horizontal padding
- large tap targets
- plenty of spacing between options
- no dense header/navigation chrome
- no tiny footer links competing for attention
- no multi-column layouts on phones

Each question card should feel focused and self-contained, with:

- one short question prompt
- optional sponsor line or logo treatment
- 2-4 large answer buttons
- obvious next state

### Desktop / Large Screen Layout

Desktop should not become a wide dashboard. It should preserve the focused mobile rhythm.

Recommended behavior:

- center the experience in a narrow column or phone-frame canvas
- optionally place lightweight event context beside it on very large screens
- keep answer interactions and reading width similar to mobile

The experience should feel consistent across devices, not redesigned.

## Mobile Responsiveness Requirements

- All primary actions must be thumb-friendly.
- Minimum tap targets should feel comfortably large in motion.
- Text must remain readable in bright outdoor conditions.
- Progress, buttons, and completion proof must stay above the fold on common phone sizes.
- Animations should be subtle and fast, never blocking.
- The UI should tolerate slow or unstable connections after initial load.

Avoid:

- long scrolling pages
- multi-step forms with tiny inputs
- modal stacks
- hover-dependent interactions
- carousels or hidden gestures

## Interaction Design

The game should feel brisk and reassuring.

### Question Behavior

- Show one question at a time
- Favor tap-to-select interactions over typing
- Let the user change their selection before submitting
- Use an explicit submit CTA for each question
- For single-answer questions, allow only one selected answer at a time
- For multiple-answer questions, allow multiple selected answers before submit
- Allow the user to go back to earlier questions and resubmit before the game is complete
- Keep transitions quick and directional so users feel progress

## Game Feedback Modes

Different games may need different answer-feedback behavior. The product should support this as a game-level configuration rather than assuming every game behaves the same way.

Supported modes:

- `final_score_reveal`
- `instant_feedback_required`
- `instant_feedback_non_blocking`

Important requirement:

Any game using these modes needs a defined correct answer for each scored question.

The modes differ in what the attendee sees *during* play, not in what they can
read at the end. Every completed game shows the same completion screen: the
final score, a per-question review of their answers against the correct ones
with any explanation and its sources, and the verification code. An in-play
reveal is shown once, between questions, and cannot be returned to — so it is
not a substitute for the review, and the instant-feedback modes need the review
for the same reason final-score-reveal does.

### Final Score Reveal

In this mode, the attendee moves through the full game without interruption and sees the results at the end.

Recommended end state:

- final score
- correct answers
- the attendee's answers
- optional sponsor facts or explanations

This should be the default mode for most event games because it is the fastest and lowest-friction.

For this mode to work, each scored question must include a correct answer in the game configuration.

### Instant Feedback Required

In this mode, the attendee must answer correctly before moving on.

Recommended sequence:

1. attendee selects an answer
2. if the answer is wrong, the interface prompts them to try again
3. if the answer is correct, show a short confirmation such as "Correct"
4. optionally show a sponsor fact or company detail
5. continue to the next question

This mode makes the game feel more game-like and gives sponsors a natural educational moment, but it adds friction and should be used intentionally.

This mode depends on each question having a correct answer available at runtime.

### Instant Feedback Non-Blocking

In this mode, the attendee submits an answer and immediately sees whether they were right, the correct answer, and any explanation, then advances regardless of correctness.

Recommended sequence:

1. attendee selects an answer
2. on submit, the interface reveals correctness and the correct answer
3. for correct answers, surface the sponsor fact / explanation as in instant-feedback-required
4. for wrong answers, name the correct option(s) and render the question's explanation; do not surface the sponsor fact
5. continue to the next question

This mode preserves the educational hook of instant feedback without the friction of gating progress on getting questions right. Use it when the goal is "tell me the answer in the moment I cared" rather than "make me get it right."

This mode depends on each question having a correct answer available at runtime.

### Recommended UX Rules

- Keep one feedback mode consistent for an entire game.
- Do not mix required-correct and end-of-game scoring within the same MVP experience.
- Keep sponsor facts short and immediately relevant.
- If reward entry is based on completion, make that clear even when score is shown.
- Treat score as fun feedback unless the product intentionally changes its prize rules later.

### Progress

Progress should always be visible and concrete, such as:

- "Question 3 of 6"
- progress bar with clear step count

Users should never wonder how much is left.

### Sponsor Presentation

Sponsors should appear as part of the card, not as competing ad units.

Good patterns:

- "Sponsored by [Local Business]"
- small sponsor badge or logo lockup
- question copy connected naturally to the sponsor

Bad patterns:

- popups
- interstitial ads
- autoplay media
- multiple sponsor messages on one screen

### Sources

A question may carry sources — the references behind whatever claim it makes.
They render wherever the quiz presents an answer as settled: under the
explanation on both in-play reveals, and under the note on each card of the
end-of-game review. They do not appear on a question the attendee is still
answering; the retry prompt in instant-feedback-required mode is a hint, not a
citation.

Rules that make them worth reading:

- a source is a titled link, never a bare web address on screen
- the list carries a visible "Sources" label, quieter than the explanation
  above it but no smaller than the screen's other small copy
- a link that opens a PDF says so before it is followed
- links leave the platform, so they open in a new context

Sources exist because a neighborhood quiz makes contested local claims, and a
neighbor who knows one of them is wrong will otherwise discount all of them.
The point is to let someone check a single claim, not to look authoritative.

## Completion Screen

The completion screen is one of the most important moments in the product.

It should:

- feel celebratory but clear
- confirm that the user is done
- provide a simple visual signal for volunteers
- explain the final action in one sentence

Recommended elements:

- strong success headline
- reward-entry confirmation
- large verification token, badge, or timestamped proof state
- instruction naming the event's redemption location, such as "Show this screen at the MNA booth" — from the `redemptionLocation` registry, not written into the renderer

Before that official proof arrives, the app should show a dedicated completion-pending state immediately after the last answer is submitted.

Recommended pending-state rules:

- keep the completion screen visually distinct from game cards even while proof is still loading
- reserve the same proof area that will later show the verification token so the official state does not pop in late and shove the layout downward
- use one clear instruction such as "Keep this screen open while we generate your verification code"
- avoid showing retake, restart, or answer-review actions until the trusted completion response is ready
- if verification fails, replace the waiting state with a plain-language retry state and a single obvious retry action

If retakes are allowed, the completion state should also make the reward rule explicit:

- the attendee has already earned their reward entry
- retaking the game is allowed for fun, learning, or a better score
- retaking the game does not create an additional reward ticket

This screen should look materially different from the game cards so nobody mistakes it for another step.

### One Destination, Three Durable States

The game route is a single destination whose state persists on the device,
keyed to the client session. There is no separate results page:

- *Not started*: the route shows the intro screen.
- *In progress*: returning or reloading resumes at the question the attendee
  left, with earlier answers and the attempt's option order intact.
- *Completed*: the route IS the results — score, verification code, and the
  answer review render again on every return, without replaying. The code sits
  directly under the score and above the review: each reviewed question carries
  an explanation and its sources, so a code placed after the review lands
  several screens past the fold on a phone, and the code is what the attendee
  is standing at the booth to show.

Because the completed state is durable, a link out of the game that stays on
this platform navigates normally in the same tab; nothing on the completion
screen needs a new tab to protect the code. When device storage is unavailable
(private browsing, full quota), those links fall back to opening in a new tab
so navigation cannot discard the only copy of the code.

A link whose destination leaves the platform — the email list, donate, and
volunteer sections all do today — opens in a new browsing context regardless,
because the reason is
different: the attendee is standing at the event holding a check-in code, and
sending them off-platform in the same tab takes the screen a volunteer is about
to ask for. The two reasons are independent, so making the completed state
durable never silently returns an off-platform link to the same tab.
The only way to leave the completed state
is the explicit retake action, which carries the reassurance line "Retaking
never changes your code or your reward entry" — the backend keeps one reward
entry per session and returns the same verification code on every completion.

## Content Guidelines

- Questions should be short enough to scan in a few seconds.
- Avoid paragraph-length setup text.
- Keep answer choices concise.
- Use plain language over clever copy.
- If a sponsor wants more brand presence, give it through tasteful framing, not more words.

## UX Constraints

- No account creation
- No typing required for MVP
- No explanation required to start
- Redemption must be obvious
- Confusion equals failure

## UX Hand-Off to Engineering

The experience requirements that engineering must preserve are:

- the attendee flow should feel like one uninterrupted game sequence
- only one question should be visible at a time
- progress should always be visible
- the interface should remain usable in bright outdoor conditions on small phones
- refreshes and brief connectivity problems should not destroy confidence
- the final completion state should feel official and easy for volunteers to verify

The exact technical implementation of those requirements belongs in `architecture.md` and `dev.md`.
