# Madrona Quiz Revision 2 Plan

## Status

`Proposed`. Revision 2 of the Madrona Music in the Playfield quiz —
new question 1, sourced explanations on all five questions, sponsor
attribution removed, per-question feedback moved inline, and a visible
source list under every explanation. Scoped to land across three
sequential PRs before the Madrona launch, per `## PR Sequence` below.
PR 3 is knowable in advance as last to merge, so it carries the
close-out — the Status flip to `Landed` and the scoping-doc deletion —
and the "Parallel implementing PRs" exception in the Plan-to-PR
Completion Gate is deliberately not invoked. Status moves to
`In progress` when PR 1 merges. Drafted 2026-08-08 against the
revision-2 copy authority described in C1; promoted from `In draft` the
same day after the promotion gate's walk — end-to-end coherence re-read,
Contracts checked for deferral phrases, every `Verified by:` claim
re-opened against current code, and the reality-check inputs
re-confirmed. Question wording still under correction does not hold the
promotion: no contract depends on a specific string, C1 makes the deck
the authority, and the content that consumes it is PR 3. Sibling
scoping doc at
[`docs/plans/scoping/madrona-quiz-revision-2.md`](/docs/plans/scoping/madrona-quiz-revision-2.md)
carries the deliberation and rejected alternatives. This plan adds
three sections not on the per-level list, `## Reality-check inputs`,
`## Resolved Decisions`, and `## PR Sequence`; the header variance is
reported in this plan-doc PR body's `## Documentation` section. Commit
boundaries are
carried as a subsection of `## Execution Steps` rather than as a
top-level section, which is a placement choice within a listed
optional section and not a variance.

## Context

The Madrona quiz is five questions a neighbor answers on a phone while
standing in a park, and it is the first thing many of them will ever
see this platform do. Revision 2 exists because the quiz as written
makes claims it cannot back. Question 1 asked what the neighborhood is
named after and answered "the madrone tree," which skips a step and is
contradicted by the parks-history record. Question 5's explanation
asserted a West-Coast renaming wave that does not survive contact with
the sources. Four of the five explanations were written without
citations at all.

The fix is not only better copy. This quiz states, to an audience that
lives on these streets, where the Black Panther Party served breakfast,
what a public sculpture's animals stand for, and how a street named for
a railroad magnate came to be named for Dr. King over merchant
litigation. Those claims are worth making and they are worth sourcing.
A player who wants to check one should be able to tap a real link,
titled with the name of the piece, without leaving the quiz — and
should still be able to find it after finishing. That is what makes
this a change to the product and not only to a content file.

Three surfaces move. The quiz's feedback timing changes so an
explanation arrives right after the answer instead of at the end. The
per-question and end-of-quiz result views both gain a source list under
the explanation. The published content model gains a place to put
sources, which means the draft payload, the publish projection, the
attendee read path, and the admin authoring form all learn about a
field they do not have today. Sponsor attribution comes off the quiz
entirely — the sponsor slot never sold this year and the printed sign
is already unsponsored, so the screen and the sign now agree.

## Goal

After this ships:

- A player answering a Madrona question sees, immediately after
  submitting, whether they were right, the explanation, and the
  explanation's sources, without a second tap.
- Every source renders as a real list entry under a labelled heading in
  the same view as the explanation, not behind a disclosure, a tooltip,
  a hover state, or a collapsed expander.
- Every sourced link is an anchor whose visible text is the title of
  the piece; no source renders as a bare address or as an
  undifferentiated word like "here."
- The two print-book sources render as plain text entries in the same
  list rather than being dropped or given an invented address.
- A link to a PDF is distinguishable from a link to a web page before
  the player taps it.
- Book and report titles keep their italics wherever they appear.
- Finishing the quiz still shows the score and the check-in code, and
  now also shows every question with its answer, explanation, and
  sources, so the citations survive the end of the run.
- A Madrona player sees no sponsor name anywhere in the quiz.
- Answering a question and then navigating back to change the answer is
  not possible in the Madrona quiz.
- An organizer editing a Madrona question in the admin workspace can
  read and edit its sources, and saving an unrelated field does not
  destroy them.
- The published Madrona content is reachable by the same publish path
  used for every other event, with no event-specific branch anywhere in
  shared or backend code.

## Reality-check inputs

Verified 2026-08-08 against the repository at `main` and against the
live Supabase project.

**The publish routine rebuilds question rows wholesale from named
draft-JSON keys.** It deletes every question row for the event, then
re-inserts from the draft content's questions array, reading each field
by explicit key — a key absent from that list is silently dropped on
publish, not carried through (`Verified by:`
[supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql:150-175](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql),
whose question insert names event id, id, display order, sponsor,
prompt, selection mode, explanation, and sponsor fact and nothing
else; confirmed against the deployed function body in the live project
on the same date). Consequence: sources must be added to that insert
or they never reach a player, no matter how correct the draft is.

*Falsifier walked:* the observation that would prove this wrong is a
published question row carrying a field the insert does not name.
Reading the migration alone cannot surface a later redefinition, so
the deployed function body was read from the live project as well and
matches the migration.

**The admin save path rebuilds each question object field by field.**
Question canonicalization constructs a new object from an explicit
field list rather than spreading the existing question, so any field
not in that list is dropped the moment an organizer saves any question
edit (`Verified by:`
[apps/web/src/admin/questionFormMapping.ts:106-129](/apps/web/src/admin/questionFormMapping.ts)
for the canonicalizer, and
[apps/web/src/admin/questionFormMapping.ts:150-181](/apps/web/src/admin/questionFormMapping.ts)
for the form-values applier, which has the same shape). Consequence:
without an admin-side change, an organizer fixing a typo in a prompt
silently deletes eighteen citations.

**The attendee read path selects explicit column lists.** Both the
event query and the question query name their columns rather than
selecting everything (`Verified by:`
[shared/events/published.ts:106-160](/shared/events/published.ts)).
Consequence: a new column is invisible to the player until it is added
to that list.

**Neither the demo-mode read function nor the completion function
reads question content rows.** The demo-mode function reads the admin
status view and redemption rows only (`Verified by:`
[supabase/functions/read-demo-event/index.ts:188-250](/supabase/functions/read-demo-event/index.ts)).
Consequence: neither is in this change's blast radius.

**The generated database types file is checked in and regenerated by a
named script.** The questions table's generated row type enumerates
today's eight columns (`Verified by:`
[shared/db/types.ts:436-467](/shared/db/types.ts)), and
[package.json](/package.json) scripts define `db:gen-types` as the
regeneration entry point. Consequence: the migration is not complete
until that file is regenerated in the same commit.

**The feedback-mode CHECK constraint already accepts the target
value.** The constraint was widened to three values, non-blocking
instant feedback among them (`Verified by:`
[supabase/migrations/20260509170000_extend_game_events_feedback_mode_check.sql](/supabase/migrations/20260509170000_extend_game_events_feedback_mode_check.sql)),
and the live project currently has one event published on that value.
Consequence: the mode change is content, not schema.

**Row-level security and grants on the questions table are row-scoped
and table-scoped respectively, so a new column inherits both.** The
read policy gates on the parent event being published and the grant is
a table-level select to the anonymous, authenticated, and service
roles (`Verified by:`
[supabase/migrations/20260406130000_add_published_quiz_content.sql](/supabase/migrations/20260406130000_add_published_quiz_content.sql),
policy and grant blocks, carried forward through the terminology
rename in
[supabase/migrations/20260418000000_rename_database_terminology_to_game.sql](/supabase/migrations/20260418000000_rename_database_terminology_to_game.sql)).
Consequence: the migration adds no policy and no grant.

*Falsifier walked:* the observation that would prove this wrong is a
column-level privilege on the table that a new column would not
inherit. Reading the migration's grant statements is not sufficient on
its own to rule that out, so the live privilege posture was read from
the project's catalog and shows table-level grants with no
column-scoped entries.

**Two tests assert the behavior decision 5 reverses.** The completion
panel's answer review is gated to the final-score-reveal mode, and two
tests assert its absence in each instant mode, with a comment giving
the rationale (`Verified by:`
[apps/web/src/game/components/GameCompletionPanel.tsx:84-85](/apps/web/src/game/components/GameCompletionPanel.tsx);
[tests/web/game/components/GameCompletionPanel.test.tsx:264-311](/tests/web/game/components/GameCompletionPanel.test.tsx)).
Consequence: those two tests are rewritten to assert the new
behavior, not deleted, and the stale rationale comment is replaced.

**The reveal copy prefers a sponsor fact over an explanation.** The
correct-answer message resolver returns the sponsor fact when one is
present and only falls through to the explanation otherwise
(`Verified by:` [apps/web/src/game/gameUtils.ts:77-86](/apps/web/src/game/gameUtils.ts)),
and Madrona's question 1 carries both today (`Verified by:`
[shared/events/madrona-demo-game-content.ts:55-68](/shared/events/madrona-demo-game-content.ts)).
Consequence: removing the sponsor fact is required for the new
explanation to render at all, not merely for tidiness.

**Back navigation lets a revealed answer be re-answered.** Back
navigation is permitted from any non-first question in the question
phase, restores the stored selection, and a resubmit overwrites the
recorded answer (`Verified by:`
[apps/web/src/game/gameSessionSelectors.ts:39-44](/apps/web/src/game/gameSessionSelectors.ts);
[apps/web/src/game/gameSessionState.ts:191-205](/apps/web/src/game/gameSessionState.ts);
[apps/web/src/game/gameSessionState.ts:269-297](/apps/web/src/game/gameSessionState.ts)).
Consequence: with instant reveal on, back navigation must be off for
this event, per C8.

**The completed state is durable on the device.** A completed attempt
restores from device storage on remount (`Verified by:`
[apps/web/src/game/useGameSession.ts:31-46](/apps/web/src/game/useGameSession.ts)).
Consequence: the results screen is a returnable surface, which is what
makes it a valid long-term home for the citations.

**All eighteen source links were retrieved and confirmed live on
2026-08-08**, with titles and author attributions matching the copy
authority named in C1 (`Verified by:` the revision-2 copy authority's
own verification note of that date). This is a same-day verification
and is re-run as a Validation Gate item rather than trusted forward.

## Cross-Cutting Invariants

- **Explanation and sources are one unit.** Every surface that renders
  a question's explanation renders that question's sources directly
  beneath it, from the same rendering module, under the same heading.
  There are three such surfaces (correct reveal, incorrect reveal,
  end-of-quiz review) and they must not drift.
- **No source ever renders as a bare address.** A source entry whose
  link markup is malformed, or whose link target is not an ordinary web
  address, renders as plain text — never as a raw address string and
  never as an anchor.
- **Every source anchor opens in a new context with the browser's
  opener protections applied**, so a player never loses their place in
  the quiz.
- **Sources survive every write path.** Draft parse, admin save, draft
  validation, publish projection, and attendee read each preserve the
  ordered source list; a question that had sources before any one of
  those operations has the same sources after it.

## Naming

- `sources` — the new optional field on the shared question type, and
  the new column on the published questions table. Same name at both
  ends deliberately; the projection reads it by that key.
- `questionNarrative.ts` — new pure module under the shared game-config
  module, owning explanation paragraph segmentation and source-line
  parsing, exported from the shared entrypoint. It lives in shared
  rather than in the web app because draft validation and the renderer
  must agree on which link targets are acceptable, and the
  no-duplicated-business-rules guardrail in
  [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  forbids two implementations of that rule.
- `QuestionExplanation.tsx` — new presentational component under the
  web game module's components folder, rendering the explanation
  paragraphs plus the source list.
- `.question-sources` — the class-name family for the source list, its
  heading, its entries, and the PDF marker.
- `Sources` — the visible heading above every source list. Exact
  string; the invariant above and the tests both name it.

## Contracts

### C1 — Copy authority and content scope

The revision-2 copy lands in the repository as a content deck at
`shared/events/madrona-quiz-revision-2-copy.md`, adjacent to the seed
module that consumes it. The deck is the authority for prompts, answer
option labels, explanations, and source lines; the seed module is
transcribed from it and must match it exactly.

The deck covers all five questions. Question 1 is rewritten with a new
prompt, four new option labels, and a two-paragraph explanation.
Questions 2 through 5 keep their existing option labels and receive
replaced explanations. Every question gains a source list. The deck
carries no sponsor line and no per-question sponsor attribution.

The deck's editorial commentary is not player-facing and does not enter
the seed module.

### C2 — Shared question shape

The shared question type gains an optional ordered list of source
lines. Absent and empty are equivalent and both mean "this question
shows no source list." The field is optional at the type level so that
every other event's content remains valid without edits.

Draft parsing accepts the field, rejects a non-list value, rejects a
non-string entry, and rejects an entry that is empty once surrounding
whitespace is removed. Draft validation rejects a source entry
containing link markup whose target is not an ordinary web address, so
an unsafe target cannot be saved, published, or reach a renderer. The
draft-to-runtime mapper carries the field through unchanged.

Rejecting at parse time is the enforcement point for authored content;
the renderer's plain-text fallback in the second cross-cutting
invariant is the independent second line, not a substitute for it.

### C3 — Published projection

The published questions table gains a column holding the ordered
source list, non-null, defaulting to the empty list, constrained so
that its value is a list and every entry in it is a string. Existing
rows take the default; no backfill runs, because the publish routine
replaces every question row for an event on each publish.

The publish routine's question insert reads the source list from the
draft content by the same key name and substitutes the empty list when
the key is absent. No new table, no new policy, no new grant: the
read policy is row-scoped to the parent event's published state and
the select grant is table-level, both of which a new column inherits.

The generated database types file is regenerated so it describes the
new column.

### C4 — Attendee read path

The published-content question query names the new column in its
column list, and the row-to-runtime mapper carries it into the shared
question shape, treating a null or absent value as the empty list.

### C5 — Rendering

A new pure module in shared owns two transformations and holds no
React. It is the single implementation of the link-target rule: draft
validation and the renderer both consume it, so an entry that
validation rejects and an entry the renderer degrades are the same
entry by construction rather than by two rules kept in step.

- An explanation string becomes an ordered list of paragraphs, split on
  blank lines, with surrounding whitespace removed and empty paragraphs
  discarded.
- A source line becomes an ordered list of inline pieces: plain text,
  emphasized text, and links carrying visible text plus a target. Link
  visible text may itself be emphasized. A link whose target is not an
  ordinary web address is returned as plain text carrying the original
  visible text. Malformed markup is returned as plain text. The module
  reports, per link, whether the target names a PDF, so the renderer
  can mark it without the author doing so.

A new presentational component renders an explanation's paragraphs
followed by, when the question has sources, a labelled list beneath
them. The label is the exact string named in Naming. Each entry is a
list item. Links render as anchors that open in a new context with
opener protections applied; PDF links carry a visible marker adjacent
to the link text and an accessible equivalent for assistive
technology.

The three existing render sites — the correct-answer reveal, the
incorrect-answer reveal, and the end-of-quiz answer review — each
render this one component in place of their current single-paragraph
explanation rendering. No site renders sources by any other means.

### C6 — Results screen

The score card and the per-question answer review render whenever a
completion result exists, in every feedback mode. The verification
block, the completion call to action, and the retake affordance are
unchanged in placement and behavior.

Each review card shows the player's answer, the correct answer, a
correct-or-not status, the explanation, and the sources, in that
order.

### C7 — Admin authoring

The question form gains a sources field, edited as one line per source
in a plain multi-line text input, consistent with how the explanation
and sponsor-fact fields are edited today.

The field participates in the form's dirty-state tracking, is included
in the values built when a question is loaded into the form, is
included when form values are applied back to draft content, and is
included in save-time canonicalization. Blank lines are discarded on
save; a field left entirely empty saves as no sources.

The load-bearing requirement is the negative one: saving a question
after editing any other field preserves that question's sources
unchanged.

### C8 — Madrona event content

The Madrona event's feedback mode becomes non-blocking instant
feedback. Back navigation is turned off for the event. Every Madrona
question's sponsor is empty and no Madrona question carries a sponsor
fact. Retake stays on and the intro, summary, entitlement label,
estimated minutes, and event code are unchanged.

The seed module is the repository-side bootstrap, not the live content;
the live event renders the published rows. The change reaches players
only when the seed is run against the target environment and the draft
is published, per the Execution Steps.

### C9 — Styling

The source list is styled through a new partial registered with the
existing game style aggregator, using existing design tokens only. No
new custom property is defined and no color literal is introduced.

Source text is visually subordinate to the explanation and no smaller
than the size the rest of the page uses for small text; no new size is
introduced. Text and link contrast both meet the 4.5:1 bar under the
Madrona theme.

Source links are inline within a sentence, so the platform's
control-height minimum does not apply to them and is not claimed. What
is required instead: entries carry enough line spacing that two links
in the same entry are separably tappable, and every entry wraps without
horizontal overflow at 320 pixels wide.

## Resolved Decisions

Deliberation and rejected alternatives live in the sibling scoping doc;
these are the settled calls the implementation is bound to.

1. **Feedback mode.** Non-blocking instant feedback, an existing mode,
   over must-get-it-right or a net-new mode.
2. **Back navigation.** Off for Madrona, as a content field, rather
   than a shared-code fix to the reveal-then-re-answer hole.
3. **Source format.** An ordered list of restricted-markdown lines
   supporting emphasis and inline links, over a structured segment
   array or a markdown dependency.
4. **Source storage.** One JSONB column on the published questions
   table, over a child table.
5. **Results screen.** The per-question review renders in every
   feedback mode, reversing the current gate.
6. **Sponsor removal.** Content-level: sponsor and sponsor fact go
   empty on Madrona questions; the rendering capability stays for
   other events.
7. **Question 2's option set.** The four existing option labels stay,
   per the copy authority's instruction that only question 1 gets new
   distractors. The near-collision between one distractor and the
   church's 1969 name is recorded in the Risk Register.
8. **PR count.** Three sequential implementing PRs — schema and shared
   shape, then rendering and authoring, then content — rather than one.
   The decisive reason is that the publish routine is shared
   infrastructure every event's publish runs through, and splitting
   gives it its own review and its own post-release smoke before any
   content depends on it.

## PR Sequence

Estimate per the rules-and-estimates rule cited under Files To Touch;
the contracts do not move with the split. The PRs are strictly ordered
— each depends on the type or column the previous one introduced — so
"last to merge" is knowable in advance and PR 3 carries the close-out.

### PR 0 — this plan and the copy deck

Docs-only. This plan, the sibling scoping doc, and the copy deck named
in C1.

The deck lands here rather than with the content it feeds, for two
reasons. C1 names it as the copy authority, and a plan whose authority
file does not exist is a dangling reference for anyone reviewing PR 1.
And leaving it untracked through PRs 1 and 2 would put an unrelated
uncommitted file in the worktree at the start of each of them, which
the Pre-Edit Gate treats as a stop condition. Copy corrections after
this land as ordinary doc commits on PR 3's branch.

Carries the `## Review Stance` paragraph in its PR body, per the
plan-doc review-stance rule; that paragraph does not go in the plan
itself.

### PR 1 — schema, shared shape, read path

Satisfies C2, C3, C4, and the parser half of C5.

The column, its constraint, the replacement publish routine, the
regenerated database types, the shared source-line parser, the optional
question field with its parsing and validation, and both mappers. Ships
nothing a player can see: no content has sources, so every new code
path is inert in production.

This PR exists on its own because the publish routine is the highest
blast radius in the change. It is the one function every event's
publish runs through, so a defect in it breaks publishing for events
that have nothing to do with Madrona. Reviewed alone and promoted
alone, it gets the post-release admin smoke as a real production signal
before any content depends on it. Bundled into a thirty-file diff, it
gets neither.

### PR 2 — rendering, results screen, authoring, styling

Satisfies the rendering half of C5, plus C6, C7, and C9.

The explanation-and-sources component, all three render sites, the
results-screen gate reversal, the admin sources field, and the style
partial.

This PR carries the one behavior change that is visible before any
Madrona content lands: the per-question review now renders for
`riverside-jam` and `harvest-block-party` too. That is intended per
decision 5, and it is named in the PR body so it is reviewed as a
deliberate change rather than noticed as a side effect.

### PR 3 — Madrona content and close-out

Satisfies C8, and carries the close-out.

The seed module transcription against the deck PR 0 landed, the
documentation currency updates, this plan's Status flip to `Landed`,
and the deletion of the sibling scoping doc. Followed by the
seed-and-publish run and the live play-through.

This is the only copy-dependent PR. It is last so that copy still under
correction never blocks the capability work, and so that the first
production exercise of the new column happens before, not with, the
first production exercise of the new content.

### Ordering rationale

PR 2 renders a field PR 1 adds to the shared type, and PR 3 authors
content that both preceding PRs must already support. Serial ordering
is therefore forced by the code, not chosen for process reasons. The
sequencing choice that *is* discretionary is where the content sits —
last rather than first — and that is what buys the decoupling from
copy.

## Files To Touch

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Plan content is a mix of rules and estimates"; the implementer may
revise it when a structural call requires deviating, recorded in the
PR body's `## Estimate Deviations` section. The contracts above are
rules and do not move with the estimate.

### New

- a migration under [supabase/migrations/](/supabase/migrations/)
  adding the sources column, its constraint, and the replacement
  publish routine
- `shared/game-config/questionNarrative.ts` — the pure module of C5,
  re-exported from [shared/game-config/index.ts](/shared/game-config/index.ts)
- `apps/web/src/game/components/QuestionExplanation.tsx` — the
  component of C5
- `apps/web/src/styles/_game-sources.scss` — the partial of C9
- `shared/events/madrona-quiz-revision-2-copy.md` — the copy deck of
  C1, landing in PR 0 with this plan rather than with the content it
  feeds
- `tests/shared/game-config/questionNarrative.test.ts`
- `tests/web/game/components/QuestionExplanation.test.tsx`
- `supabase/tests/database/game_question_sources.test.sql`
- this plan and its sibling scoping doc

### Modify

- [shared/game-config/types.ts](/shared/game-config/types.ts) — the
  optional field of C2
- [shared/game-config/draft-question-parsing.ts](/shared/game-config/draft-question-parsing.ts)
  and [shared/game-config/draft-json.ts](/shared/game-config/draft-json.ts)
  — parsing and per-entry rejection
- [shared/game-config/game-validation.ts](/shared/game-config/game-validation.ts)
  — the link-target rejection of C2
- [shared/game-config/draft-content.ts](/shared/game-config/draft-content.ts)
  — carry-through in the draft-to-runtime mapper
- [shared/game-config/db-content.ts](/shared/game-config/db-content.ts)
  — the published row type and the row-to-runtime mapper of C4
- [shared/events/published.ts](/shared/events/published.ts) — the
  column list of C4
- [shared/events/madrona-demo-game-content.ts](/shared/events/madrona-demo-game-content.ts)
  — the content of C8, transcribed from the C1 deck
- [shared/db/types.ts](/shared/db/types.ts) — regenerated, not
  hand-edited
- [apps/web/src/admin/questionFormMapping.ts](/apps/web/src/admin/questionFormMapping.ts)
  and [apps/web/src/admin/AdminQuestionFields.tsx](/apps/web/src/admin/AdminQuestionFields.tsx)
  — C7
- [apps/web/src/game/components/CorrectAnswerPanel.tsx](/apps/web/src/game/components/CorrectAnswerPanel.tsx),
  [apps/web/src/game/components/AnswerRevealPanel.tsx](/apps/web/src/game/components/AnswerRevealPanel.tsx),
  and [apps/web/src/game/components/GameCompletionPanel.tsx](/apps/web/src/game/components/GameCompletionPanel.tsx)
  — the three render sites of C5 plus the gate change of C6
- [apps/web/src/styles/_game.scss](/apps/web/src/styles/_game.scss) —
  register the new partial
- [tests/shared/game-config/draft-content.test.ts](/tests/shared/game-config/draft-content.test.ts),
  [tests/shared/game-config/db-content.test.ts](/tests/shared/game-config/db-content.test.ts),
  [tests/shared/game-config/game-validation.test.ts](/tests/shared/game-config/game-validation.test.ts),
  [tests/shared/events/published.test.ts](/tests/shared/events/published.test.ts),
  [tests/web/admin/questionBuilder.test.ts](/tests/web/admin/questionBuilder.test.ts),
  [tests/web/game/components/GameCompletionPanel.test.tsx](/tests/web/game/components/GameCompletionPanel.test.tsx),
  [tests/scripts/seed-game-content.test.ts](/tests/scripts/seed-game-content.test.ts)
- [supabase/tests/database/game_authoring_phase3_publish_projection.test.sql](/supabase/tests/database/game_authoring_phase3_publish_projection.test.sql)
  — projection coverage for the new column
- [README.md](/README.md), [docs/architecture.md](/docs/architecture.md),
  [shared/game-config/README.md](/shared/game-config/README.md),
  [apps/web/src/game/README.md](/apps/web/src/game/README.md) — per the
  Documentation Currency PR Gate

### Intentionally not touched

An expectation, not a prohibition; the implementer may touch these with
rationale recorded as an estimate deviation.

- [apps/web/src/game/gameSessionState.ts](/apps/web/src/game/gameSessionState.ts)
  and [apps/web/src/game/gameSessionSelectors.ts](/apps/web/src/game/gameSessionSelectors.ts)
  — no new phase, no new transition; the mode and back-navigation
  changes are content fields the existing machine already reads
- [supabase/functions/complete-game/index.ts](/supabase/functions/complete-game/index.ts)
  — grading and entitlement are unchanged
- [supabase/functions/read-demo-event/index.ts](/supabase/functions/read-demo-event/index.ts)
  — reads no question content rows
- [apps/site/](/apps/site/) — the landing page states no quiz content
- [apps/web/src/game/shuffleGameOptions.ts](/apps/web/src/game/shuffleGameOptions.ts)
  — option ordering is unaffected by a question-level field

## Execution Steps

Estimate, same labeling as the file inventory above.

1. **Baseline.** Confirm a clean worktree, branch off `main`, and run
   the repository's local validation entry point before editing.
2. **Land the copy deck** at the C1 path, transcribed from the
   revision-2 copy authority, and re-retrieve all eighteen links,
   recording the retrieval date in the deck.
3. **Shared shape first.** Add the optional field, its parsing, its
   per-entry and link-target rejection, and the two mappers, with tests
   for each rejection case.
4. **Migration.** Add the column, its constraint, and the replacement
   publish routine; regenerate the database types file in the same
   commit; add the pgTAP coverage for projection and constraint.
5. **Read path.** Extend the published question column list and its
   mapper.
6. **Rendering.** Build the pure narrative module against its tests
   first, then the component, then swap all three render sites onto it
   in the same commit so the first cross-cutting invariant is never
   momentarily false.
7. **Results gate.** Remove the feedback-mode gate on the review block
   and rewrite the two tests that assert the old behavior, replacing
   the stale rationale comment.
8. **Admin authoring.** Add the field to the form values, the loader,
   the applier, the canonicalizer, and the form itself, with a test
   that proves an unrelated edit preserves sources.
9. **Madrona content.** Update the seed module per C8 from the deck.
10. **Styling.** Add the partial, register it, and measure contrast and
    tap targets against the Madrona theme at mobile widths.
11. **Documentation.** Walk the Documentation Currency PR Gate below.
12. **Self-review.** Run the named audits at their commit boundaries.
13. **Full validation.** Run the Validation Gate end to end.
14. **Publish.** Seed and publish against the target environment, then
    play the live quiz on a phone before calling it done.

### Commit boundaries

Estimate. Steps 1 and 3 through 5 are PR 1; steps 6 through 8 and 10
are PR 2; steps 2, 9, 11, and 14 are PR 3. Steps 12 and 13 run per PR
against that PR's own surface.

Within PR 1: the shared parser and its tests; the question shape,
parsing, and validation; the migration plus regenerated types plus
database tests; the read path. Within PR 2: the component and all three
render sites in one commit; the results gate and its rewritten tests;
admin authoring; styling. Within PR 3: the copy deck; the seed
transcription; documentation; the close-out commit that flips Status
and deletes the scoping doc. Review-fix commits stay distinct.

The rendering module, the component, and all three render sites landing
in one commit is a rule, not an estimate: the first cross-cutting
invariant must not be false on any landed commit.

## Validation Gate

Each procedure below was walked for a falsifier it can distinguish from
neighboring failure modes.

Every PR runs lint, the unit suite, and the builds. The Supabase suite
and the database test gate PR 1. The mobile-width and contrast
inspections gate PR 2. The link check, the live play-through, and the
post-release admin smoke on PR 1's promotion all gate PR 3 — the
play-through cannot run before content is published, and publishing
content onto an unsmoked publish routine is the ordering this split
exists to prevent.

- **Repository lint passes.** *Falsifier:* an unused import or a type
  error introduced by the new optional field at a call site that
  destructures questions.
- **The unit suite passes**, including the new narrative-module,
  component, parsing, validation, mapping, and admin-preservation
  tests. *Falsifier:* a source line that round-trips through admin save
  with entries missing, which the C7 preservation test asserts against
  directly rather than inferring from a passing save.
- **The edge-function suite passes.** *Falsifier:* a completion payload
  shape changed by the new field. Expected to be unaffected; the run is
  the check, not the assumption.
- **The Supabase suite passes against a local stack**, including the
  new database test. That test asserts three things separately: that a
  published question carries the sources projected from its draft, that
  a draft question with no sources projects the empty list rather than
  null, and that a non-list value is rejected by the constraint.
  *Falsifier:* a constraint that accepts a list containing a non-string
  entry, which the first two assertions cannot surface and the third is
  written to catch.
- **Both application builds pass.**
- **The full local validation flow passes**, including the browser
  suite.
- **All eighteen source links resolve**, checked by opening each one
  from the built quiz rather than from the deck, so the check exercises
  the parser and the renderer as well as the address. *Falsifier:* a
  link that resolves when pasted into a browser but renders with a
  truncated or mis-parsed target in the quiz — which a deck-side link
  check cannot surface and an in-quiz check can.
- **Mobile inspection at 320 and 390 pixels wide** on a reveal panel
  with the longest source list and on the end-of-quiz review: no
  horizontal overflow, tap targets meet the platform minimum, and line
  length stays readable. *Falsifier:* an entry that fits at 390 and
  overflows at 320, which a single-width check cannot surface.
- **Measured contrast** of source text and source links against the
  Madrona theme's surface meets 4.5:1. *Falsifier:* a token that
  passes on the platform default theme and fails under Madrona, which
  is why the measurement is taken under the event's own theme.
- **A full play-through of the live Madrona quiz on a phone** after
  publish: five questions, an explanation and sources after each,
  no sponsor name anywhere, no back affordance, and the complete
  review plus check-in code at the end. *Falsifier:* content that
  validates in the seed module but was never published, which every
  preceding check would pass and only a live play-through catches.

The canonical local entry points are the repository's own scripts, not
lower-level invocations. Two boundaries of the full local flow wrapper
are load-bearing here and are stated rather than assumed: it starts the
local Supabase stack transitively through the Supabase suite, but it
does **not** install the browser runtime — it fails fast when the
browser is absent, and provisioning is the separate local-setup script,
which is run first. It also builds the attendee app only, so the site
build named above is run as its own command rather than being folded
into the flow.

## Self-Review Audits

Drawn from [`docs/self-review-catalog.md`](/docs/self-review-catalog.md),
run at the commit boundaries named above.

**SQL:**

- *CHECK-constraint NULL-handling audit* — the new constraint's
  behavior when the column holds a JSON null versus a SQL null versus
  an empty list, all three stated explicitly.
- *Grant/body contract audit* — the replacement publish routine runs
  with definer rights; confirm its privilege surface is unchanged from
  the routine it replaces and that no new grant was needed.
- *Legacy-data precheck for constraint tightening* — the column is
  added with a default and existing rows are replaced on next publish;
  record the verdict rather than skipping the audit.
- *pgTAP output-format stability audit* — for the new database test.

**Frontend:**

- *Dirty-state tracked-inputs audit* — the new sources input must
  register in dirty-state tracking, or the save button stays disabled
  after a sources-only edit.
- *Post-save reconciliation audit* — the form's post-save state
  reflects the canonicalized sources, including discarded blank lines.
- *Unchanged-vs-explicit-write audit* — an unrelated question edit
  writes the existing sources back unchanged rather than omitting the
  key.

**Documentation:**

- *Canonical-owner duplication audit* — the copy deck is the single
  owner of the revision-2 strings; the plan describes contracts and
  does not restate the copy.
- *Validation-command coupling audit* — the commands named in the
  Validation Gate are the repository's current entry points.

**Plan-local, not from the catalog:**

- *Cross-cutting invariant walk* — each of the four invariants in this
  plan has at least one assertion naming it. Borrowed as a convention
  from
  [`docs/plans/madrona-launch-page-corrections.md`](/docs/plans/madrona-launch-page-corrections.md),
  which runs the same walk; the catalog carries no entry by this name.

## Documentation Currency PR Gate

- [README.md](/README.md) — the current-milestone feature list
  enumerates quiz capabilities and does not mention per-question
  sources.
- [docs/architecture.md](/docs/architecture.md) — the published-content
  data model description gains the new column.
- [shared/game-config/README.md](/shared/game-config/README.md) — the
  module map describes the question shape.
- [apps/web/src/game/README.md](/apps/web/src/game/README.md) — the
  internal structure list and testing layout gain the new module,
  component, and their tests.
- [shared/events/README.md](/shared/events/README.md) — gains the copy
  deck as a sibling artifact of the seed module.

## Out Of Scope

- **A shared fix for re-answering a revealed question.** C8 closes it
  for Madrona with a content field. The general fix touches the session
  state machine and another live event. *Trigger:* the next event that
  wants both instant reveal and back navigation.
- **Sources on any event other than Madrona.** The field is available
  to every event; no other event's content is edited here. *Trigger:*
  an organizer authoring sources in the admin workspace.
- **A rich editor for source lines in the admin workspace.** C7 ships a
  plain multi-line input consistent with the neighboring fields.
  *Trigger:* organizer feedback that the line format is error-prone.
- **Rendering emphasis or links anywhere other than source lines.**
  Prompts, option labels, and explanations stay plain text; only the
  explanation's paragraph segmentation changes. *Trigger:* copy that
  needs a link inside an explanation body.
- **Analytics on source-link taps.** *Trigger:* a decision to measure
  whether citations are used.

## Risk Register

- **A distractor on question 2 sits close to the church's 1969 name.**
  The copy authority instructs that only question 1 gets new
  distractors, and the explanation names both the present-day and the
  1969 name. *Mitigation:* the near-collision is recorded here so a
  post-launch review can revisit it with play data rather than
  guesswork.
- **A source link dies between the deck's retrieval date and the
  event.** *Mitigation:* the Validation Gate re-retrieves every link
  from the built quiz at implementation time; a dead citation is worse
  than none, so a link that has died is replaced or its entry becomes a
  plain-text citation before publish.
- **An organizer edits a question in the admin workspace and loses
  sources.** This is the sharpest failure mode in the change.
  *Mitigation:* C7's negative requirement, its dedicated test, and the
  unchanged-vs-explicit-write audit, which together assert the
  preservation directly rather than inferring it.
- **The results-screen reversal surprises the two other events on
  instant modes.** *Mitigation:* the reversal is deliberate and
  recorded as decision 5; the two tests asserting the old behavior are
  rewritten rather than deleted, so the new behavior is asserted for
  every mode.
- **The seed module and the live published content drift.** The seed is
  a bootstrap; the live event renders published rows an organizer can
  edit. *Mitigation:* the Validation Gate's live play-through is the
  check that what shipped is what plays.
- **The three-PR split buys a production checkpoint that only pays off
  if someone waits for it.** The whole case for landing the publish
  routine alone is the post-release admin smoke it earns; a session
  that merges all three PRs back to back and publishes immediately has
  paid the split's overhead and taken none of its benefit.
  *Mitigation:* the smoke gate is named in the Validation Gate as a
  precondition on PR 3 rather than as a nice-to-have, and PR 3's own
  checks cannot run before publish anyway, which puts the wait on the
  critical path rather than beside it.
- **The restricted markup invites authors to expect full markdown.**
  *Mitigation:* unsupported markup renders literally rather than
  failing, so the worst outcome is visible in preview rather than a
  broken page.

## Backlog Impact

- **Opened.** A shared-code item for the reveal-then-re-answer hole,
  scoped to every feedback mode that reveals an answer, referencing
  this plan's Out Of Scope entry.
- **Changed.** Nothing.
- **Closed.** Nothing.

## Related Docs

- [`docs/plans/scoping/madrona-quiz-revision-2.md`](/docs/plans/scoping/madrona-quiz-revision-2.md)
  — the sibling scoping doc; deletes at this plan's terminal PR.
- [`docs/plans/madrona-launch-page-corrections.md`](/docs/plans/madrona-launch-page-corrections.md)
  — the parallel pre-launch correction pass on the day-of landing
  surfaces.
- [`docs/styling.md`](/docs/styling.md) — the token classification and
  the Madrona theme's measured contrast table that C9 is checked
  against.
- [`docs/experience.md`](/docs/experience.md) — the attendee-flow
  target the feedback-timing change is serving.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) — the
  audits named above.
- [`docs/testing.md`](/docs/testing.md) — the coverage expectations and
  validation commands the Validation Gate is built from.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) — the tier map,
  which names which tier is a valid gate for which decision.
