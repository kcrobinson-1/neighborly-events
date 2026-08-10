# Backlog

## Purpose

Single priority-ordered list of post-MVP follow-up work across all concern
areas. Each entry links to the detail file that explains the full context,
steps, and validation commands.

**How to use this file:**

- Start here to find the highest-priority next item.
- Read the linked detail file before starting any item.
- Keep this file focused on active work.
- When an item is complete, update the owning detail file and remove the item
  from this backlog instead of leaving closed history inline.
- Add new items in the correct tier with a one-line why and a `Detail:` link, `N/A`, or `TBD`.
- Frame entries by goal/problem, not solution. One illustrative option allowed; mark it as one option among several, not the prescription.
- `decision` items require a product or design choice before dev work can
  start. `dev`, `ux`, and `infra` items are ready to execute.

**Detail file locations:**

- Open questions and product decisions: [`docs/open-questions.md`](/docs/open-questions.md)
- Terminology migration planning: [`docs/plans/archive/terminology-migration-strategy.md`](/docs/plans/archive/terminology-migration-strategy.md)
- Admin live-status fix plan: [`docs/plans/archive/admin-live-status-plan.md`](/docs/plans/archive/admin-live-status-plan.md)
- Admin UX polish: [`docs/tracking/admin-ux-roadmap.md`](/docs/tracking/admin-ux-roadmap.md)
- Contributor workflow tooling: [`docs/tracking/dev-workflow-improvements.md`](/docs/tracking/dev-workflow-improvements.md)
- Continuous deployment roadmap: [`docs/tracking/continuous-deployment-roadmap.md`](/docs/tracking/continuous-deployment-roadmap.md)
- Security and abuse tracking: [`docs/tracking/security-and-abuse.md`](/docs/tracking/security-and-abuse.md)
- Code refactors: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)
- Test coverage rollout: [`docs/testing.md`](/docs/testing.md)
- Deferred authoring features: [`docs/plans/archive/quiz-authoring-plan.md`](/docs/plans/archive/quiz-authoring-plan.md)
- Release gates, quality-check methodology, and live release-blocking view: [`docs/tracking/release-readiness.md`](/docs/tracking/release-readiness.md)

---

## Tier 1 — Live Event Readiness

Must be resolved before QR codes are printed or the first real event runs.

- [ ] **`ux` Madrona focus ring is 1.77:1 — below the 3:1 non-text bar**
  `$focus-ring` is `3px solid var(--secondary-focus)`, and
  `--secondary-focus` is the derived **42% alpha mix** of
  `--secondary`, not the solid olive. On Madrona that composites to
  **1.77:1** against the cream page (1.72 on putty, 1.86 on
  near-white). [`_game-focus.scss`](/apps/web/src/styles/_game-focus.scss)
  applies the outline as the *only* focus treatment, so keyboard focus
  on quiz options, primary/secondary buttons, completion CTAs, and text
  links has nothing else carrying it. **Goal:** a keyboard user can see
  where focus is on every Madrona interactive surface. Note the shape
  of the cause before picking a fix: the solid `--secondary` clears the
  bar comfortably (4.87 on cream) and only the 42% derivation fails, so
  options include raising the mix percentage, pointing `$focus-ring` at
  a solid token, or adding a second non-color focus affordance — but
  the derived-shade percentage is shared with every theme, so changing
  it there is not Madrona-local. Tier 1: this is keyboard accessibility
  on the primary attendee flow. Measurements recorded in
  [`docs/styling.md`](/docs/styling.md).
  Detail: N/A

- [ ] **`ux` Featured-night outline is the sole state indicator at 1.67:1**
  `.event-landing-season-card-now`
  ([`_landing.scss:380`](/apps/site/app/styles/_landing.scss)) marks
  the featured night with `3px solid var(--accent)` and
  `outline-offset: 2px`, putting gold on the cream page at **1.67:1**,
  and
  [`LandingTonightSections.tsx`](/apps/site/components/event/LandingTonightSections.tsx)
  adds no visible label, no `aria-current`, and no visually-hidden
  text. So the only signal for "this is tonight" in the season strip is
  a below-threshold color outline — invisible to a low-vision user and
  absent for a screen-reader user. **Goal:** which night is featured is
  perceivable without relying on that outline. A text or icon marker
  would fix the semantic half and the contrast half at once, which is
  likely cheaper than re-coloring the outline; `aria-current` alone
  would fix only the screen-reader half. Tier 1: the season strip is on
  the landing page every attendee sees.
  Detail: N/A

- [ ] **`ux` Madrona form controls have no boundary treatment reaching 3:1**
  The flat cream palette removed the panel chrome that used to make
  inputs legible, and the alpha border left behind does not replace
  it. Measured: `--border-soft` composited on the input fill is
  **1.17:1** against that fill and **1.00:1** against the cream page
  behind it — effectively invisible — and the input fill itself is
  **1.18:1** against the page. Nothing visually identifies the control
  at the WCAG 1.4.11 3:1 bar. Affects the feedback textarea and email
  input ([`_event.scss:669`](/apps/site/app/styles/_event.scss)) —
  originally three controls across two routes, until the signup route
  and its identically-treated email input were removed. **Goal:**
  a sighted attendee can tell where the input is. One option among
  several is a per-theme control-boundary token that Madrona sets to
  an opaque olive or ink at 3:1+, leaving other themes on today's
  derived alpha border — but a heavier border, an inset fill contrast,
  or a filled control treatment all reach the same goal and differ in
  how much they disturb the poster look. Tier 1 because attendees hit
  the feedback form during the event; the measurement is
  recorded in [`docs/styling.md`](/docs/styling.md) so it does not
  need re-deriving.
  Detail: N/A

---

## Tier 2 — Operational Confidence

Reduce deployment risk and contributor friction before the live event.

- [ ] **`decision` Every Supabase Auth redirect entry wildcards its whole path**
  All nine entries in Authentication → URL Configuration → Redirect URLs
  take the form `<origin>/**`: the apps/web alias, the apps/site alias,
  six localhost and 127.0.0.1 variants, and the organizer domain.
  Supabase recommends an exact redirect path in production and reserves
  the globstar for development and preview URLs
  (https://supabase.com/docs/guides/auth/redirect-urls). What the
  breadth costs is the set of paths on each host to which a sign-in
  token may be delivered. **That cost is not uniform across the nine,
  and an earlier version of this entry understated it by treating them
  as one class.** For the three deployed origins the bound is real:
  each host is a literal, and every path on it is served by one of our
  own Vercel projects. For the six localhost and 127.0.0.1 entries it
  is not — any process listening on that port on a contributor's
  machine can serve the callback path and read the delivered sign-in
  token, which is a third-party surface inside the wildcard. The token
  is a developer's own, on their own machine, which is why this is a
  hygiene question rather than an incident; but the two classes deserve
  separate answers and the deployed-host argument does not carry the
  local ones. Nothing is known to be broken.
  **The globstar is a deliberate fix, not drift, and any narrowing
  proposal has to clear the bar that produced it.** `requestMagicLink`
  requests `/auth/callback?next=…`, not the bare path, and exact-match
  entries do not admit that query string — Supabase falls back to Site
  URL on every attempt. This repo hit exactly that and recorded it in
  `docs/plans/archive/m2/m2-phase-2-2-plan.md`, where the recorded fix
  was to switch to double-asterisk entries. So the naive narrowing
  (`<origin>/auth/callback`) is not an untried option, it is a known
  regression, and the repo's own docs recommended it for months after
  the console had stopped following them.
  **Goal:** decide whether a narrower entry that still admits the
  query-bearing callback is worth adopting, or whether the current
  breadth is accepted deliberately and documented as such — answered
  separately for the deployed origins and the local ones, since the
  exposure differs and so may the answer. Any candidate
  shape has to be tested against a real sign-in before it is adopted,
  not reasoned about from the wildcard syntax — that is the step whose
  absence produced the last regression. Note the cost of changing at
  all: the console has no diff, no review, and no test, so nine edits
  are nine chances to typo a value whose failure mode is a broken
  sign-in nobody notices until someone tries. Surfaced while documenting
  the organizer host's entry, when the repo's docs turned out to
  describe an exact-path convention no entry has ever followed.
  Detail: N/A

- [ ] **`dev` Run seeded game content through the shared runtime parser**
  `scripts/release/seed-game-content.cjs` upserts a draft and calls
  `publish_game_event_draft` after checking only identity and env-shape fields,
  so no shared invariant in `validateGameConfig` is enforced on that path. The
  database constraints are deliberately weaker than the TypeScript rules, so a
  seed can publish content that every reader then rejects — a seeded source
  line that is blank or carries a bare web address publishes cleanly and makes
  the draft unopenable in admin, since `parseAuthoringGameDraftContent` refuses
  it on read. The bypass predates per-question sources and covers every
  invariant, not just those; sources is where it first produces a
  publishes-then-fails-to-read outcome.
  **Call the parser, not just the validator.** `validateGameConfig`
  assumes an already-shaped `GameConfig` and checks structure only, so
  it is the wrong gate on its own for a seed module that reaches the
  script through `import()`. Node strips types without type-checking
  them, so nothing on that path establishes the shape the validator
  assumes. Measured: content with a numeric `prompt` and a numeric
  option `label` passes `validateGameConfig` and is refused by
  `parseAuthoringGameDraftContent` with "prompt must be a string" —
  and PostgreSQL's `->>` projection would turn that number into
  player-facing text. The parser also rejects everything the validator
  rejects (unresolvable correct-answer ids, duplicate option ids, a
  bare address in a source line all fail both), so it is the strict
  superset and the one to wire in.
  **No longer blocked.** This entry recorded the blocker as the script
  being plain CommonJS under `node` with no TypeScript loader. That has
  stopped being true: `node` imports `shared/game-config/index.ts`
  directly and resolves the shared entry points as functions, and
  `loadSeedConfig` in the same script already dynamic-`import()`s a
  TypeScript module for its `--content` argument. The remaining work is
  calling the parser, not reaching it.
  **Newly load-bearing.** If the admin question editor is retired,
  admin's parse-on-read stops catching bad seeded content and this
  becomes the only gate on the sole write path — which is the reason
  the gate has to be the parser. `computePublishChecklist` re-implements
  five question-level checks the shared surface also makes (at least one
  question, options present, a correct answer present, single-select
  having exactly one, correct-answer ids resolving to real options), so
  retiring the editor costs nothing there; what it costs is
  parse-on-read, and only wiring in the parser replaces that.
  Detail: N/A

- [ ] **`dev` One write path for question content**
  Question content has two authoring surfaces — the admin question
  editor and the seed module plus `scripts/release/seed-game-content.cjs`
  — and only the second is used. Every content-model change lands
  twice; per-question sources spent roughly half its diff on UI nobody
  opens. **Goal:** one place that can change what a player reads.
  Retiring question and option authoring is one option, keeping
  publish, unpublish, status, and event-details editing so day-of
  lifecycle control does not become a git operation. Blocked on the
  parser item above: retiring the editor removes parse-on-read, which
  is currently the only thing catching mistyped seeded content.
  Note one thing the decision resolves. The id-reuse entry below is a
  defect in both of that editor's id generators; retiring question and
  option authoring would close it by deletion rather than by fixing it,
  so the two should be sequenced together rather than fixed
  independently.
  Detail: N/A

- [ ] **`dev` The admin editor re-issues retired question and option ids**
  Both id generators in
  [`questionStructure.ts`](/apps/web/src/admin/questionStructure.ts)
  pick the lowest identifier not *currently* in use, so an id freed by a
  deletion is handed straight to different content. `createOptionId`
  returns the lowest unused letter: driven directly, a question with
  options `a`–`d` loses `a` and the next added option is issued `a`
  again, now labelled something else. `createQuestionId` returns the
  lowest unused `q{n}` and has the same hole, reachable through both Add
  Question and Duplicate Question.
  This breaks the identifier rule in
  [`shared/events/README.md`](/shared/events/README.md), which requires
  a replacement to take a never-used id. `game_completions.submitted_answers`
  stores ids and no labels; the answer review resolves
  `answers[question.id]` and then resolves option ids against whatever
  options exist now. So a re-issued id makes the review report an answer
  the attendee never gave, where a retired id would fail to resolve and
  show nothing.
  **The two generators compose, and that is what makes this worth
  fixing rather than tolerating.** A question-id collision used to be
  survivable by accident: stored answers carried per-question option
  slugs, so a re-issued `q1` met options whose ids could not match, and
  the review degraded visibly. Now that every question's options are
  `a`–`d`, a re-issued question id lands on option ids that are
  guaranteed to collide, and the two failures multiply into a confident
  wrong answer instead of a blank one.
  Concretely today: Madrona's five questions carry slugs, so `q1` reads
  as free and the first Add Question re-issues it — the exact id the
  identifier migration retired, and the key under which all existing
  Madrona completions store their first answer. Nothing has triggered it
  because the question editor has never been used on that event
  (`game_event_drafts.last_saved_by` is null) and the seed path never
  calls either generator.
  **Goal:** an id freed by a deletion is never handed to new content, at
  either level. The fix needs knowledge the draft does not carry — the
  draft holds only current content, so retired ids have to come from a
  stored high-water mark or from `game_event_versions` history, which is
  what makes this more than a one-line change. Seed-module authoring
  follows the rule today; this is the UI path that can still violate it.
  Pairs with the write path entry above, which may retire this editor
  outright.
  Detail: N/A

- [ ] **`dev` Assert allowlist-filtered zero-row access on `game_event_admin_status`**
  Slice 2 added view grant checks, but its pgTAP file still relies on underlying
  `game_event_drafts` RLS coverage for the “authenticated but not allowlisted
  sees zero rows” case. Add a direct view-level assertion so future view or
  policy changes cannot widen access silently.
  Detail: [`docs/plans/archive/admin-live-status-plan.md`](/docs/plans/archive/admin-live-status-plan.md)


- [ ] **`ux` Swap the Zac Lee sponsor lockup from DRAFT to final**
  The Madrona headliner-sponsor logo at
  `apps/site/public/events/madrona/sponsors/zac-lee.png` is a **DRAFT
  lockup**, landed as a placeholder so the per-night sponsor credit
  could ship on schedule. The reference in
  [`apps/site/events/madrona.ts`](/apps/site/events/madrona.ts) already
  documents this. Goal: the final mark replaces the draft before that
  sponsor's night. This is a content edit only — drop the final file
  at the same path, no code change — so it is safe to do after launch,
  but it must happen before the Zac Lee night rather than drifting to
  end of season.
  Detail: N/A

- [ ] **`decision` Post-season teardown for a finished event**
  After an event's final night, its landing page resolves to a
  season-wrap state (email list and donate emphasized, quiz still
  available) and stays there indefinitely — nothing expires it. That
  is the right immediate behavior, but no one has decided what a
  finished event should look like a month or a year later: whether the
  landing stays up as an archive, the quiz unpublishes, the masthead
  registration is removed, or the event is retired wholesale. Goal: a
  decided, repeatable end-of-season state so each event's teardown is
  not improvised. This is the first event to reach the question, so it
  is worth deciding once rather than per event.
  Detail: N/A

- [ ] **`dev` In-flight completion snapshot is discarded on content drift, defeating the server's replay path**
  `isValidSubmittingSnapshot` in
  [`gameSessionPersistence.ts`](/apps/web/src/game/gameSessionPersistence.ts)
  rejects a `submitting` snapshot whose content fingerprint no longer
  matches the published questions. But `complete-game` resolves a
  landed attempt from `(eventId, requestId, sessionId)` and returns
  **before** loading or validating current content — a short-circuit
  added specifically so drifted replays can still recover. So the
  client throws away a replayable request id for exactly the reason
  the server was built to tolerate. Concretely: an attendee submits,
  content is republished mid-flight, they reload, and instead of
  replaying the request id that may already have landed they get a
  fresh run. Republishing during an event is not hypothetical — the
  reward-language sweep republished madrona and harvest to v3 while
  live. **Goal:** a reload after a submission does not discard a
  request id the server would still honor. The fingerprint check is
  right for the `in progress` kind (stale answers against changed
  questions are genuinely unrecoverable) and wrong for `submitting`;
  splitting the two is one option. Note this is narrow — the
  entitlement is one-per-session so the code stays stable — but it
  costs the attendee a retake.
  Detail: N/A

- [ ] **`dev` A restored completion renders its answer review against whatever content is live now**
  The `complete` snapshot in
  [`gameSessionPersistence.ts`](/apps/web/src/game/gameSessionPersistence.ts)
  stores only `answers` and `completion` — no content fingerprint — and
  its restore path validates their shape and nothing else. The
  `in progress` and `submitting` kinds both carry a fingerprint and are
  discarded on drift; `complete` deliberately survives it, so the
  check-in code comes back after a republish. The answer review is
  rendered from those stored answers against the **currently loaded**
  game, so if questions or options changed underneath, the screen can
  attribute an answer to a different question, report "No answer
  recorded" for a question the attendee did answer, or pair a trusted
  score with a different question count and show something like `5 / 4`.
  Republishing while an event is live is not hypothetical — a reward-
  language sweep republished madrona and harvest to v3 mid-event. The
  exposure widened when the review stopped being gated on
  `final_score_reveal` and started rendering for every completion, so
  all three feedback modes now reach it rather than one. **Goal:** a
  returning attendee never sees their answers described against
  questions they did not answer, without losing the check-in code that
  the fingerprint-free snapshot exists to protect. Fingerprinting the
  review separately from the code, or persisting the reviewed questions
  alongside the answers, are two options among several — the shape
  depends on whether a drifted review should degrade to a score-only
  card or disappear. Pairs with the in-flight snapshot entry above:
  both are the same underlying question about which parts of a snapshot
  should survive content drift.
  Detail: N/A

- [ ] **`dev` Banned reward nouns are unenforced in admin-authored content**
  The product rule forbids "trinket" and "raffle"
  ([`product.md`](/docs/product.md)), and checked-in copy and seed
  content are swept. Admin-authored content is not: `validateGameConfig`
  checks question/answer structure only, and neither the save nor the
  publish path inspects wording, so an organizer can publish either
  noun in a prompt, explanation, option, or event field. The live rows
  were swept once by hand and nothing keeps them clean. **Goal:** the
  rule is enforced where content is authored rather than depending on
  a periodic manual sweep. Options differ in strictness and in who
  they interrupt — a publish-time validation error, a soft authoring
  warning, or a checklist item in the existing publish checklist —
  and the choice is a product call about how hard to block an
  organizer mid-publish.
  Detail: N/A

- [ ] **`dev` Wire the admin e2e suite into PR CI**
  `npm run test:e2e:admin` is excluded from both
  [`ci.yml`](/.github/workflows/ci.yml) and `validate:local`, so it
  runs only when a contributor remembers to run it — and it cannot run
  at all on a machine without a Docker runtime, which is the primary
  maintainer's situation (see [`dev.md`](/docs/dev.md) troubleshooting).
  The result is that a change to admin auth, allowlist checks, draft
  persistence, or publish/unpublish can reach `main` with no admin
  end-to-end coverage anywhere, and nothing surfaces that. **Goal:**
  admin e2e coverage is a property of the PR rather than of whose
  machine ran it. Sibling of the demo-mode bypass entry below; both
  are the same shape of gap and may be worth doing together.
  Detail: N/A

- [ ] **`dev` Wire demo-mode bypass Playwright suite into PR CI**
  `playwright.demo-mode-bypass.config.ts` exists and exercises the G9
  bypass-containment contract (read-only admin / redeem / redemptions
  surfaces on test-event slugs without sign-in, plus write-rejection
  via `evaluateDemoModeRejection`), but it runs only on demand from
  contributors. Add it to `.github/workflows/ci.yml` so the bypass
  contract is automated rather than relying on contributor recall.
  Detail: [`docs/tracking/release-readiness-current.md` — Pass 2026-05-04 G9 + Follow-ups](/docs/tracking/release-readiness-current.md)

- [ ] **`dev` Demo-mode misuse should be diagnosable from backend logs alone**
  `evaluateDemoModeRejection` in
  `supabase/functions/_shared/demo-mode-rejection.ts` returns a
  structured 403 response without writing a `console` log. The
  design (caller-visible failure surfacing to the UI) is correct for
  normal use, but accidental misuse on a real-event slug is invisible
  in Supabase Edge Function logs until UI feedback surfaces it. Goal:
  misuse is diagnosable from the backend logs alone without depending
  on UI feedback. One option: emit a structured log line (e.g.
  `{ event: "demo_mode_rejected", function, slug }`) at rejection
  time.
  Detail: [`docs/tracking/release-readiness-current.md` — Pass 2026-05-04 G6 + Follow-ups](/docs/tracking/release-readiness-current.md)

- [ ] **`dev` A revealed answer can be re-answered when back navigation is on**
  Either instant feedback mode reveals whether an answer was right
  before the player moves on. If the event also allows back navigation,
  returning to an answered question restores the stored selection into
  an editable state and submitting again overwrites the graded answer —
  so a player who reads "not quite" can walk back and score the point.
  Nothing in the shared config layer refuses the combination, and
  nothing in the play path refuses the second submit; the two settings
  are independently valid and only interact badly together. Madrona
  closes it as content by turning back navigation off
  ([`madrona-demo-game-content.ts`](/shared/events/madrona-demo-game-content.ts)),
  which works for one event and leaves the next author free to pick
  both. **Goal:** an organizer cannot ship a quiz where the revealed
  answer is re-answerable, whether or not they know the interaction
  exists. Refusing the combination in `validateGameConfig`, or locking a
  revealed question against resubmission regardless of navigation, are
  two options among several — the first is cheaper and forecloses a
  layout someone may legitimately want, the second is the general fix.
  Detail: N/A

- [ ] **`ux` A sponsor fact hides the explanation instead of accompanying it**
  Where a question sets `sponsorFact`, the reveal resolvers and the
  results review both prefer it and the question's `explanation` never
  renders on any surface — including, now, its sources. The two fields
  are not alternatives in any editorial sense: one is a sponsor's blurb,
  the other is why the answer is what it is, and an author filling in
  the first silently deletes the second from the screen. Nothing in
  admin says so. Madrona avoids it by carrying no sponsor facts at all,
  so the repo currently has no live instance and the shadowing is
  invisible to every test. **Goal:** setting a sponsor fact does not
  cost the player the explanation. Rendering both in a defined order, or
  merging the two fields entirely and letting sponsor attribution be its
  own slot, are two options among several — the choice is a product call
  about whether a sponsor blurb is content or chrome, and it should be
  made before a sponsored event is authored rather than after.
  Detail: N/A

- [ ] **`dev` No seeded demo exercises `final_score_reveal`**
  The three seeded demos were positioned to cover one feedback mode
  each, and
  [`riverside-jam-game-content.ts`](/shared/events/riverside-jam-game-content.ts)
  documents that split. Madrona moving to
  `instant_feedback_non_blocking` for its live event leaves it and
  Harvest Block Party on the same mode and `final_score_reveal` on none,
  so the mode that defers all feedback to the end — and the completion
  surfaces peculiar to it — no longer appears on any demo an organizer
  or reviewer can play. Nothing fails: the mode is still valid config
  and still unit-tested, it just has no live surface. **Goal:** every
  feedback mode is reachable on a seeded demo without hand-authoring an
  event. Moving Riverside to the uncovered mode, or adding a fourth
  seed, are two options among several — the first spends Riverside's
  `instant_feedback_required` coverage to buy this one and the second
  adds a demo to maintain, so the call depends on whether the seeded set
  is meant to be exhaustive or merely representative.
  Detail: N/A

- [ ] **`ux` No page emits a canonical link, and two hosts now serve the same content**
  [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) sets `title`
  and `metadataBase`; [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx)
  `generateMetadata` sets `openGraph`, `twitter`, and `robots`. Neither
  sets `alternates.canonical`, and Next.js emits `<link rel="canonical">`
  only from that field — it does not derive one from `openGraph.url` —
  so no route serves a canonical link. This was harmless while each
  page had one URL. Once an organizer domain serves the same event
  pages as the canonical alias (see
  [`docs/plans/madrona-organizer-subdomain-launch/`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md)),
  the identical content is reachable on two hosts with nothing telling
  a search engine they are one page rather than duplicates. **Goal:**
  each page declares one canonical URL. Note this is *not* the
  build-time ceiling the sibling entry describes: a canonical link
  naming one fixed origin is compatible with static rendering, so it
  is buildable today and independent of that decision.
  Detail: N/A

- [ ] **`ux` Organizer hosts can't get host-specific paths or share metadata**
  Two symptoms, one cause. On an organizer host such as
  `music.madrona.us`, (a) short paths are the entry form — typed,
  scanned, pasted — but the first tap inside the site drops the visitor
  onto `/event/<slug>/*` and leaves them there, and (b) a link shared
  from that host renders its preview with the canonical alias as the
  URL, because `og:url` names the site origin on every host. Title,
  description, and image are correct; only the displayed domain is
  not. (No canonical link is involved — none is emitted anywhere; see
  the preceding entry.)
  The shared cause is that [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx)
  declares `generateStaticParams`, so one HTML document serves every
  host, and the link-bearing components
  ([`EventHeader.tsx`](/apps/site/components/event/EventHeader.tsx),
  [`EventCTA.tsx`](/apps/site/components/event/EventCTA.tsx),
  [`EventDayOfLanding.tsx`](/apps/site/components/event/EventDayOfLanding.tsx),
  [`EventFeedbackCTA.tsx`](/apps/site/components/event/EventFeedbackCTA.tsx))
  render on the server with no request host to resolve a mount from —
  and `generateMetadata` runs at build time for the same reason, which
  is why the metadata symptom has the identical root. Nothing breaks —
  the long paths serve identically on the organizer host, and the
  shared previews carry the right content — so both are consistency
  issues, not reachability;
  [`docs/plans/madrona-organizer-subdomain-launch/`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md)
  C1 accepts them deliberately for one event. That plan drafted a phase
  to fix the navigation symptom and dropped it — see its Out Of Scope,
  "No phase 4" — so this entry describes a declined fix, not an
  unfinished one. **Goal:** a
  visitor who arrives on a short path stays on short paths through
  in-page navigation, and a link shared from an organizer host shows
  that host. Note the shape of the cause before picking a fix: the
  request host has to reach the code that emits the href and the
  metadata, and three shapes get it there. Rendering the event routes
  dynamically lets the server read the request host, at the cost of
  per-request rendering on the day-of landing page attendees load on
  cell data. Prerendering a per-host variant keeps static output and
  doubles the prerender set per organizer host. Marking the
  link-bearing components `"use client"` and correcting hrefs at
  hydration keeps the initial HTML on long paths — which is what
  crawlers and no-JS clients should see — and fixes the href before a
  visitor can click; `apps/site` already ships client components
  (including [`LandingTonightSections.tsx`](/apps/site/components/event/LandingTonightSections.tsx)),
  so it is an existing pattern, but it makes hrefs
  hydration-dependent, so a hydration mismatch degrades navigation
  silently rather than loudly, and it gives components that are plain
  server output today a client lifecycle.
  **The third shape fixes only the navigation symptom, not the
  metadata one** — `og:url` is read by crawlers that do not run JS, so
  no client-side correction reaches it. The call gets easier once
  there is a second organizer to weigh it against.
  Detail: N/A

- [ ] **`ux` The game route emits no share metadata**
  Event landing pages get title, description, `openGraph`, `twitter`, and
  an OG image from
  [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx)
  `generateMetadata`. The game route has no equivalent — it is served by
  the `apps/web` Vite SPA behind a proxy rewrite, and the SPA ships one
  static `index.html` for every route, so a pasted quiz link renders with
  whatever generic title that document carries. This was a latent gap
  while the only people reaching the quiz link were reaching it from the
  event page. The organizer-subdomain work at
  [`docs/plans/madrona-organizer-subdomain-launch/`](/docs/plans/madrona-organizer-subdomain-launch/madrona-organizer-subdomain-launch.md)
  puts a real event on a domain an organizer advertises, so the quiz link
  becomes one that attendees and volunteers paste to each other — with a
  preview that says nothing about the event. (That plan considered
  giving the quiz a short `/game` path on the organizer host and dropped
  it; the link people paste is the long path, and this gap is the same
  either way.)
  **Goal:** a quiz link pasted into a message renders with the event's
  name, description, and image. Note the shape of the cause before
  picking a fix: the metadata has to be emitted by whatever serves the
  document, and today that is the SPA rather than the Next.js app, so
  options split between giving `apps/site` a metadata-emitting route in
  front of the proxy and giving the SPA build per-event HTML — the call
  depends on how many events the platform expects to serve at once.
  Detail: N/A

---

## Tier 3 — Admin Authoring Polish

Improve the authoring experience before the organizer uses it to set up a real
event.

- [ ] **`ux` Organizers can clear test entitlements on a draft event without engineering help**
  Phase 2 of the unpublish-locks fix landed Strict — `event_code`
  rotation blocks when any entitlements exist for the event, even
  on an unpublished draft. The intended use case is organizers
  issuing a few test entitlements during pre-launch authoring (to
  walk through the redemption flow themselves), then deciding to
  rotate `event_code` before going live. Today there's no
  organizer-facing path to delete entitlements on a draft event;
  it falls back to engineer-mediated SQL — the same shape of gap
  the original Tier 1 unpublish-locks entry was created to close.
  Goal: organizers can clear test entitlements on draft events on
  their own, with copy that clearly distinguishes pre-launch test
  cleanup from operator-facing redemption flows so the affordance
  doesn't bleed into live-event surfaces.
  Detail: N/A

- [ ] **`cleanup` Remove orphan `generate-event-code` Edge Function**
  The admin "Regenerate" button surfaced random server-generated event
  codes via the `generate-event-code` Edge Function. The button was removed
  in the event_code rotation UX fix once the rotation flow itself made
  it clear there's no real use case for "pick me a random new prefix"
  (the rotation use case is "I want to type a specific new code"). The
  client wrapper and its unit test came out at the same time, but the
  Edge Function under [`supabase/functions/generate-event-code/`](/supabase/functions/generate-event-code)
  and its Deno tests at [`tests/supabase/functions/generate-event-code.test.ts`](/tests/supabase/functions/generate-event-code.test.ts)
  stayed in place because removing them requires a Supabase function-
  delete step on the deployed project, which is out of scope for a UI
  PR. Goal: the dead server code is removed from both the repo and the
  deployed Supabase project.
  Detail: N/A

- [ ] **`docs` Rewrite `database-backed-quiz-content.md` and `quiz-authoring-plan.md` to target terminology**
  These two plan docs still use the legacy pre-rename terminology (12 and 27
  occurrences respectively). All other docs were swept in Phases 1 and 5; these
  were deferred due to size. Rewrite narrative and headings to use
  `game`/`entitlement` names per the migration policy.
  Detail: [`docs/plans/archive/terminology-migration-map.md` — Documentation](/docs/plans/archive/terminology-migration-map.md)

- [x] **`ux` Mobile question editor layout**
  Rework the question editor stacking on narrow viewports so the question list,
  focused editor, and option controls do not crowd each other. The highest-value
  admin UX refinement before real authoring use.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Improve the mobile question editor layout](/docs/tracking/admin-ux-roadmap.md)

- [ ] **`ux` Desktop admin workspace hierarchy**
  Clarify the two-panel balance between the event summary, event-details form,
  and question editor on wide screens. Affects editing confidence before preview
  and publish controls add more surface to the same page.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Clarify the desktop admin workspace hierarchy](/docs/tracking/admin-ux-roadmap.md)

- [ ] **`dev` The quiz intro heading is developer-owned while the paragraph under it is organizer-owned**
  The intro panel renders a heading and the event's `intro` paragraph
  as one block of copy, but they come from different places. `intro`
  is a `game_events` column an organizer edits in `/admin` and
  `publish_game_event_draft` projects; the heading is a repo-side
  slug registry ([`shared/events/quizIntro.ts`](/shared/events/quizIntro.ts))
  that only a deploy can change. Two consequences: an organizer cannot
  retitle their own quiz, and a new event renders no heading until an
  engineer registers one. The pipes also diverge in time — a heading
  edit ships on deploy while a paragraph edit waits on a publish, so
  the two halves of one panel can disagree in between. **Goal:** the
  heading reaches players through the same authoring and publish path
  as the copy it sits on. The obvious option is a content field
  alongside `intro` (table column, publish-routine projection, draft
  and published mappers, admin form input) — one option among
  several, and the heaviest part is that the publish routine is
  re-issued in full by any migration that touches it. Registry entries
  become seed values for events that already exist.
  Detail: N/A

---

## Tier 4 — Post-MVP Features

Planned capabilities intentionally deferred from the MVP scope. Require product
prioritization before starting.

- [ ] **`ux` Manual attendee redemption-status refresh**
  Add a `Refresh status` affordance on the completion screen so an attendee can
  trigger a re-read without waiting for the next polling tick.
  Detail: [`docs/plans/archive/reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Timestamped attendee redeemed-state copy**
  Add redeemed-at time copy on the attendee completion screen, including the
  locale/timezone handling needed to make that timestamp trustworthy.
  Detail: [`docs/plans/archive/reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Attendee completion freshness and transient-error state**
  Surface lightweight freshness/error guidance on the completion screen so a
  long backend outage does not leave attendees staring at stale status with no
  explanation.
  Detail: [`docs/plans/archive/reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)

- [ ] **`ux` Reversal-aware attendee completion copy**
  Distinguish a row that flipped from redeemed back to unredeemed mid-session
  instead of falling back to the generic ready-for-check-in wording.
  Detail: [`docs/plans/archive/reward-redemption-phase-c-1-plan.md`](/docs/plans/archive/reward-redemption-phase-c-1-plan.md)

- [ ] **`dev` Admin draft preview** (Phase 4.5)
  Let an admin preview the attendee experience from the draft before publishing.
  Detail: [`docs/plans/archive/quiz-authoring-plan.md` — Phase 4.5](/docs/plans/archive/quiz-authoring-plan.md)

- [ ] **`dev` AI-assisted authoring** (Phase 4.7)
  AI-generated draft questions refined by the organizer.
  Detail: [`docs/plans/archive/quiz-authoring-plan.md` — Phase 4.7](/docs/plans/archive/quiz-authoring-plan.md)

- [ ] **`dev` Analytics and reporting**
  SQL views on `game_completions`, `game_entitlements`, and `game_starts`
  to produce per-event completion counts, score distributions, timing summaries,
  and sponsor question engagement. Follow-on: an organizer-facing reporting
  section in the admin workspace that surfaces those views for a selected event
  without requiring Supabase Studio access.
  Detail: [`docs/tracking/analytics-strategy.md`](/docs/tracking/analytics-strategy.md)

- [ ] **`ux` Organizer-managed agent assignment**
  Now that organizers have full event-scoped write access via M2's RLS
  broadening, add a way for an organizer to maintain event agents without
  requiring manual root-admin SQL edits. Unblocked by M2 phases 2.1 + 2.1.1
  + 2.1.2 (organizer authorization across PostgREST + Edge Functions).
  Detail: N/A

- [ ] **`dev` Richer publish controls**
  Expiry windows, scheduled publish, multiple games per event, and friendlier
  inactive-event behavior beyond immediate unpublish.
  Detail: [`docs/open-questions.md` — Authoring And Publishing](/docs/open-questions.md)

- [ ] **`ux` Event landing page for `/event/:slug`**
  Gameplay now lives on `/event/:slug/game`. Add an event landing surface at
  `/event/:slug` once the product starts supporting multiple experiences per
  event so navigation and URL contracts scale cleanly.
  Detail: [`docs/open-questions.md` — Product And Live Event Operation](/docs/open-questions.md)

- [ ] **`decision` Sponsor reporting requirements**
  Determine the minimum reporting slice sponsors actually need: simple inclusion
  proof, aggregate event totals, or question-level reporting.
  Detail: [`docs/open-questions.md` — Reporting And Sponsor Measurement](/docs/open-questions.md)

- [ ] **`decision` Demo-mode generalization beyond the test-event allowlist**
  M3 shipped a read-only demo-mode bypass scoped to the two
  `TEST_EVENT_SLUGS` (`harvest-block-party`, `riverside-jam`). The
  generalization question — how (and whether) demo-mode access
  extends past the hand-curated allowlist to a wider set of events
  or to a per-organizer opt-in — is deferred until partner feedback
  exposes a concrete need.
  Detail: [`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md` — Backlog Impact](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)

- [ ] **`decision` Production-friendly demo-mode for partner-onboarding scenarios**
  Today's M3 bypass is internal-partner-shaped (read-only, two test
  slugs, `noindex`). A production-friendly variant — partner-shareable
  demo state, real-feeling write affordances against scratch tables,
  and a reset story — is a separate scoping pass once partner
  feedback shapes the requirements.
  Detail: [`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md` — Backlog Impact](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)

- [ ] **`docs` Resolve the Madrona spec section citations, which point outside the repo**
  Twelve-plus committed source files cite the redesign by section
  number — "Madrona redesign spec §4" in
  `apps/site/app/styles/_landing.scss`, `EventDayOfLanding.tsx`,
  `EventLandingPage.tsx`, `apps/site/events/madrona.ts`; "spec §2" and
  "spec §3" across the two `_masthead.scss` partials and
  `shared/styles/_event-masthead.scss`; "experience spec §4" in
  `apps/web/src/game/gameUtils.ts`; "centerfold/poster SPECS palette"
  in `shared/styles/themes/madrona.ts`. No spec document exists in the
  repo — `find . -iname "*spec*" -name "*.md"` returns nothing — so a
  reader hitting any of these cannot open what it names. The
  consolidation that landed the redesign into the durable doc set
  (`docs/experience.md`, `docs/styling.md`, `docs/product.md`) is what
  made these stale: the sections they point at were superseded by prose
  that now lives in-repo, and several have since been edited away from
  what the spec said. Two of them are already wrong rather than merely
  unresolvable — the landing stylesheet and `EventDayOfLanding` cite
  §4 for a hero whose treatment this plan deliberately changed.
  Bounded: repoint each citation at the durable doc section that now
  owns the claim, or drop the reference where the surrounding comment
  already states it. Surfaced while sweeping for docs that conflict
  with the launch-corrections decisions.
  Detail: TBD

- [ ] **`dev` Finish making day-of donate externality content-owned**
  The cross-cutting invariant is that whether a link opens in a new
  browsing context is expressed in that link's own content shape and
  applied uniformly, with no component deciding it by naming a link
  slot. Four link shapes now honor that — `MastheadLink`,
  `EventLandingAction`, `CompletionCtaLink`, and the day-of volunteer
  section's `yearRound`. The donate slot does not: `EventContent.donate`
  carries no externality field, so `EventDayOfLanding` and the
  season-wrap action both hardcode `target="_blank"` by slot. It is
  correct for every event authoring donate today, which is why it has
  survived — the cost is that a future organization whose donation page
  lives on its own site is forced into a new tab it never asked for,
  and the invariant reads as satisfied while one slot is exempt.
  Bounded: add the field, derive the attributes at both call sites,
  and assert the same-tab case (the positive case passes either way, so
  only the negative one discriminates). Surfaced by review on the
  volunteer section, which had the same defect and was fixed there.
  The sponsor-logo and artist-link anchors are deliberately out of
  scope — those destinations are third-party by construction.
  Detail: TBD

- [ ] **`dev` Rewrite or close the feedback + subscription plugin item**
  This item was scoped around absorbing the standalone signup page at
  `/event/<slug>/signup` and an embeddable email-entry widget. That
  page has been removed from the platform, and the product position
  that replaced it is that the platform points at an organization's
  own list rather than running one — so the item's premise no longer
  holds and it cannot be worked as written. What survives is the
  organizer-facing half: the relocated feedback page, the in-product
  read + CSV export of `newsletter_opt_ins`, and the schema-namespace
  move from `public.*` to a plugin-specific schema. The write contract
  is unchanged — every writer calls the internal `subscribe_email`
  SECURITY DEFINER helper with a hardcoded `source_surface` literal,
  against the append-only `newsletter_opt_ins` log, gated by the
  `newsletter_enabled_events` registry — but the feedback form's
  checkbox is now its only public caller. Decide whether the
  organizer-facing remainder is worth a plugin or belongs in the admin
  workspace, then rewrite this item or close it.
  Detail: TBD

- [ ] **`dev` Decide how an event expresses which subpages it has**
  Today it cannot. Content presence gates the *render* but not the
  *route*: each event subroute's `generateStaticParams` enumerates the
  full registered-slug list, so every event prerenders every subpage
  and an event that never opted in still publishes a crawlable path
  showing an inline disabled state. The masthead cannot gate at all —
  it never receives `EventContent` and all its link slots are
  required. Removing the signup surface took the live instance of this
  away (two test events were publishing signup pages for a form
  neither authored) without answering the question. Trigger: a second
  non-test event wanting a different page set. Meets the multi-tenancy
  work in
  [`organization-isolation-roadmap.md`](/docs/tracking/organization-isolation-roadmap.md)
  eventually.
  Detail: N/A

---

## Tier 5 — Code Health And Tooling

Internal maintainability and contributor workflow. No user-facing impact.
Execute in any order.

- [ ] **`dev` Split `gameApi.ts` local fallback** (refactor score 8/10)
  Extract local prototype entitlement storage and completion into a separate
  module so the production Supabase path is easier to review.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `AdminQuestionEditor.tsx`** (refactor score 7/10)
  Extract `AdminQuestionList` and `AdminOptionEditor` so the top-level editor
  reads as buffer/save orchestration.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `capture-ui-review.cjs` admin mode** (refactor score 7/10)
  Extract admin-specific Supabase mocks and admin screenshot sequences into
  focused helper modules so the shared runner stays readable.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `AdminEventWorkspace.tsx`** (refactor score 6/10)
  Extract summary card, selected draft header, and action groups so the
  route-level component mainly coordinates layout and callbacks.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Split `adminGameApi.ts`** (refactor score 5/10)
  Extract shared transport and response helpers so the public exports focus on
  intent-specific admin operations.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Rename phase-named pgTAP test files** (refactor score 5/10)
  `supabase/tests/database/game_authoring_phase{2,3,5_1}_*.test.sql` are named
  after the authoring rollout phase that produced them, not the surface they
  test. Rename to `<feature>_<aspect>.test.sql` to match the convention set by
  `event_code_data_model.test.sql` and `redemption_data_model.test.sql`. Pure
  rename, behavior-preserving.
  Detail: [`docs/tracking/code-refactor-checklist.md`](/docs/tracking/code-refactor-checklist.md)

- [ ] **`dev` Stable PR screenshot upload path**
  Add `npm run ui:review:upload` backed by a scriptable durable provider so
  agents have a consistent, documented path for uploading UX review images.
  Detail: [`docs/tracking/dev-workflow-improvements.md` — Add a stable PR screenshot upload path](/docs/tracking/dev-workflow-improvements.md)

- [ ] **`dev` Resolve cross-app links from apps/web outside the site-origin proxy**
  Web-rendered links to site-owned routes (e.g. the masthead's Feedback link)
  resolve only behind the canonical-origin proxy; on the bare Vite dev server
  they fall to the SPA not-found page. Evaluate a Vite dev proxy or an
  origin-aware href helper. The completion-screen CTA was this item's worked
  example until both its destinations became external absolute URLs; the gap
  is unchanged but the example needs replacing.
  Detail: [`docs/tracking/dev-workflow-improvements.md` — Resolve cross-app links from apps/web outside the site-origin proxy](/docs/tracking/dev-workflow-improvements.md)

- [ ] **`db` Regenerate the DB artifacts after the signup-RPC drop, and gate them in CI**
  `shared/db/types.ts` and `shared/db/permissions.snapshot.md` both
  still declare `public.submit_newsletter_signup(text, text)`, which
  migration `20260807000000` dropped. Neither could be regenerated in
  the PR that dropped it: `npm run db:gen-types` and
  `npm run db:gen-permissions` both need a running local Supabase
  stack, and the primary maintainer's machine has no Docker runtime
  (see [`dev.md`](/docs/dev.md) "supabase start fails"). Nothing breaks
  — no code calls the removed RPC, so the stale type declaration is
  inert — but both artifacts currently misdescribe the database.
  **Goal:** run both generators on a machine with a working runtime and
  commit the result; expect a pure deletion in each. Worth pairing with
  the second half: CI runs `test:supabase` but has no drift check on
  either artifact, which is why this shipped silently rather than
  failing the PR. A check that regenerates and diffs would have caught
  it, and would catch the next one.
  Detail: N/A

- [ ] **`db` Test-entitlement deletion requires manual unwinding of circular FK**
  Deleting an event's entitlements today requires a three-step
  transaction — clear `first_completion_id` on entitlements, delete
  the related completions, then delete the entitlements — because
  `game_entitlements` and `game_completions` reference each other
  with double-`ON DELETE RESTRICT` FKs. Surfaced during walkthrough
  validation of the event_code rotation flow; the friction recurs
  every time a maintainer resets test state on a draft event. **Goal:**
  deleting an event's entitlements should be straightforward and not
  depend on the operator knowing the FK topology. Several approaches
  could reach that goal — for example, relaxing the back-edge FK
  (`game_entitlements_first_completion_fk`) to `ON DELETE SET NULL`
  collapses the unwind to a single ordered cascade while preserving
  the denormalization for normal reads, but cascade-deleting
  completions on entitlement delete, dropping the back-edge entirely
  and deriving the first-completion lookup on demand, or wrapping the
  unwind in a service-role helper are all worth comparing at scoping
  time.
  Detail: N/A

- [ ] **`dev` Share structural style tokens across apps**
  The structural token bucket has one named home and two unnamed
  ones: `$radius-pill: 999px` is declared in
  [`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss),
  while apps/site declares no SCSS variables at all and shared
  partials can consume neither app's token file — so the bare
  literal `999px` is repeated at
  [`apps/site/app/styles/_admin.scss:146`](/apps/site/app/styles/_admin.scss),
  [`apps/site/app/styles/_landing.scss:317`](/apps/site/app/styles/_landing.scss),
  and
  [`shared/styles/_event-masthead.scss:109`](/shared/styles/_event-masthead.scss).
  Three copies of one platform contract, with nothing that fails when
  they drift. **Goal:** a structural value has one authoring home that
  every app and shared partial reads, so drift is impossible rather
  than merely unlikely. Two shapes are worth comparing — a shared
  `_structural.scss` both apps `@use`, or a bridge to a
  `--radius-pill` custom property in each app's `:root` (mirroring the
  existing `--shadow: #{$shadow-panel}` bridge) — and they differ in
  whether shared partials can participate, which is the deciding
  question. Scope the sweep past the pill radius: the spacing scale
  and font weights are the same shape of duplication. Raised as a
  Codex P1 during the Madrona redesign and declined there as out of
  scope for a masthead PR; deliberately deferred past launch because
  it touches both apps' styling entrypoints.
  Detail: [`docs/styling.md` — Where the structural bucket actually lives](/docs/styling.md)

- [ ] **`infra` Investigate planning-doc location**
  The `/docs/plans/archive/` set keeps growing, plan-only and
  plan-archive-maintenance PRs inflate the repo PR count, and plan PRs need
  different review than code PRs. Codex review against in-repo code and
  Claude Code's single-repo model rule out moving the per-phase implementation
  contract to a sibling repo; the open question is whether discussion-style
  surfaces (epic framing, scoping back-and-forth, deferred decisions) can
  move to GitHub Discussions or similar without losing their protective check.
  Detail: [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)

- [ ] **`ux` Event details inline vs. dedicated route**
  Decide whether event details should remain in the selected workspace or move
  to a dedicated route once the page gets denser.
  Detail: [`docs/tracking/admin-ux-roadmap.md` — Decide whether event details should stay inline](/docs/tracking/admin-ux-roadmap.md)

- [ ] **`dev` Broader Playwright coverage**
  Add retry-after-401, backend failure states, and post-merge nightly integration
  scenarios once the core suite is stable.
  Detail: [`docs/testing.md` — Soon After / Later Only If Needed](/docs/testing.md)

- [ ] **`decision` Trust boundary for live events**
  Determine whether browser-session dedupe is sufficient once the product is
  used at real events or whether person-level or device-level controls are
  needed.
  Detail: [`docs/open-questions.md` — Trust Boundary And Abuse Controls](/docs/open-questions.md)
