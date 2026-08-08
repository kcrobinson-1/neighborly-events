# Madrona Quiz Revision 2 Plan

## Status

`Proposed`. Revision 2 of the Madrona Music in the Playfield quiz —
new question 1, sourced explanations on all five questions, sponsor
attribution removed, per-question feedback moved inline, and a visible
source list under every explanation.

Scoped to land across three sequential implementing PRs after the
docs-only PR that carries this plan, per `## PR Sequence` below. PR 3
is knowable in advance as last to merge, so it carries the close-out —
the Status flip to `Landed` and the scoping-doc deletion — and the
"Parallel implementing PRs" exception in the Plan-to-PR Completion Gate
is deliberately not invoked. Status moves to `In progress` when PR 1
merges.

Drafted 2026-08-08 against the revision-2 copy authority described in
C1; promoted from `In draft` the same day after the promotion gate's
walk. Question wording still under correction does not hold the
promotion: no contract depends on a specific string, C1 makes the deck
the authority, and the content that consumes it is PR 3.

Sibling scoping doc at
[`docs/plans/scoping/madrona-quiz-revision-2.md`](/docs/plans/scoping/madrona-quiz-revision-2.md)
carries the deliberation and rejected alternatives.

**Header variance**, reported in this plan-doc PR body's
`## Documentation` section. Three sections not on the per-level list are
added: `## Reality-check inputs`, `## Resolved Decisions`, and
`## PR Sequence`. One listed-optional section is skipped:
`## Execution Steps`. The per-level guidance admits it "when implementer
ordering beyond Commit Boundaries is needed," and here it is not — the
ordering has two other homes already (`## PR Sequence` for the PR and
commit decomposition, and the implementation guide under `tmp/` for the
step-by-step). Carrying a third rendering of one ordering is what
produced two review findings on this plan's first fix round, each a
sibling site left stale by an edit to another. Commit decomposition
lives inside each PR's entry in `## PR Sequence` rather than as a
separate top-level section, for the same reason.

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

The sculpture question is the case in miniature. HistoryLink, the
obvious authority, says the animals have their paws on a book; there is
no book, and the Seattle Public Library's own page for the branch
describes the arrangement correctly. A neighbor who walks past the
statue would have caught it. Sources are what let that neighbor check
one claim instead of quietly discounting all five.

Three surfaces move. The quiz's feedback timing changes so an
explanation arrives right after the answer instead of at the end. The
per-question and end-of-quiz result views both gain a source list under
the explanation. The published content model gains a place to put
sources, which means the draft payload, the publish projection, both
published-content read paths, and the admin authoring form all learn
about a field they do not have today. Sponsor attribution comes off the
quiz entirely — the sponsor slot never sold this year and the printed
sign is already unsponsored, so the screen and the sign now agree.

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
prompt, selection mode, explanation, and sponsor fact and nothing else;
confirmed against the deployed function body in the live project on the
same date). Consequence: sources must be added to that insert or they
never reach a player, no matter how correct the draft is.

*Falsifier walked:* the observation that would prove this wrong is a
published question row carrying a field the insert does not name.
Reading the migration alone cannot surface a later redefinition, so the
deployed function body was read from the live project as well and
matches the migration.

**There are two published-question read paths, and the second is an
Edge Function.** Both name explicit column lists as independent literals
with no mechanism holding them together. The browser reads through
[shared/events/published.ts:133-160](/shared/events/published.ts); the
completion function reads through
[supabase/functions/_shared/published-game-loader.ts:24-33](/supabase/functions/_shared/published-game-loader.ts),
whose only importer is
[supabase/functions/complete-game/dependencies.ts:8](/supabase/functions/complete-game/dependencies.ts).
The Edge Function's question query casts its result with an unchecked
assertion (`Verified by:`
[supabase/functions/_shared/published-game-loader.ts:77-82](/supabase/functions/_shared/published-game-loader.ts)),
so widening the shared row type produces no compile error at that call
site: a column omitted there fails silently at runtime instead of at
build time. Consequence: a new column is invisible to a player until it
is added to both lists, the loader is inside PR 1's scope, and the two
lists want one owner.

*Falsifier walked:* an earlier revision of this plan claimed the
completion function reads no question rows, verified by reading
`complete-game/index.ts`. That procedure cannot surface a loader one
import hop away in `dependencies.ts`, and it did not. The procedure that
does: search the whole functions tree for the table name and follow
every importer of what it finds. Recorded because the weaker check
looked sufficient and was not.

**The demo-mode read function reads no question content rows.** It reads
the admin status view and redemption rows only (`Verified by:`
[supabase/functions/read-demo-event/index.ts:188-250](/supabase/functions/read-demo-event/index.ts)).
Consequence: it is outside this change's blast radius.

**The admin save path rebuilds each question object field by field.**
Question canonicalization constructs a new object from an explicit field
list rather than spreading the existing question, so any field not in
that list is dropped the moment an organizer saves any question edit
(`Verified by:`
[apps/web/src/admin/questionFormMapping.ts:106-129](/apps/web/src/admin/questionFormMapping.ts)
for the canonicalizer, and
[apps/web/src/admin/questionFormMapping.ts:150-181](/apps/web/src/admin/questionFormMapping.ts)
for the form-values applier, which has the same shape). Consequence:
without an admin-side change, an organizer fixing a typo in a prompt
silently deletes eighteen citations.

**The admin end-to-end suite does not currently exercise any field but
the prompt.** Its one test fills the event name and the question prompt,
saves, publishes, checks the live route, and unpublishes (`Verified by:`
[tests/e2e/admin-workflow.admin.spec.ts:51-99](/tests/e2e/admin-workflow.admin.spec.ts)).
Consequence: naming that suite as the gate on sources preservation
without extending it produces a gate that cannot fail on the risk it was
named for. C7 requires the extension.

**The generated database types file is checked in and regenerated by a
named script.** The questions table's generated row type enumerates
today's eight columns (`Verified by:`
[shared/db/types.ts:436-467](/shared/db/types.ts)), and
[package.json](/package.json) scripts define `db:gen-types` as the
regeneration entry point. Consequence: the migration is not complete
until that file is regenerated in the same commit.

**The admin end-to-end command is excluded from every automatic gate.**
It is named as the command to run when a change can affect admin auth,
allowlist checks, draft persistence, publish/unpublish behavior,
Supabase Auth configuration, or the admin UI, and is stated to be in
neither CI nor the full local validation flow (`Verified by:`
[docs/dev.md:591-609](/docs/dev.md)). Consequence: PR 1 changes publish
behavior and PR 2 changes the admin UI and draft persistence, so both
name it explicitly or it never runs.

**The feedback-mode CHECK constraint already accepts the target value.**
The constraint was widened to three values, non-blocking instant
feedback among them (`Verified by:`
[supabase/migrations/20260509170000_extend_game_events_feedback_mode_check.sql](/supabase/migrations/20260509170000_extend_game_events_feedback_mode_check.sql)),
and the live project currently has one event published on that value.
Consequence: the mode change is content, not schema.

**Row-level security and grants on the questions table are row-scoped
and table-scoped respectively, so a new column inherits both.** The read
policy gates on the parent event being published and the grant is a
table-level select to the anonymous, authenticated, and service roles
(`Verified by:`
[supabase/migrations/20260406130000_add_published_quiz_content.sql](/supabase/migrations/20260406130000_add_published_quiz_content.sql),
policy and grant blocks, carried forward through the terminology rename
in
[supabase/migrations/20260418000000_rename_database_terminology_to_game.sql](/supabase/migrations/20260418000000_rename_database_terminology_to_game.sql)).
Consequence: the migration adds no policy and no grant.

*Falsifier walked:* the observation that would prove this wrong is a
column-level privilege on the table that a new column would not inherit.
Reading the migration's grant statements is not sufficient on its own to
rule that out, so the live privilege posture was read from the project's
catalog and shows table-level grants with no column-scoped entries.

**Two tests assert the behavior decision 5 reverses.** The completion
panel's answer review is gated to the final-score-reveal mode, and two
tests assert its absence in each instant mode, with a comment giving the
rationale (`Verified by:`
[apps/web/src/game/components/GameCompletionPanel.tsx:84-85](/apps/web/src/game/components/GameCompletionPanel.tsx);
[tests/web/game/components/GameCompletionPanel.test.tsx:264-311](/tests/web/game/components/GameCompletionPanel.test.tsx)).
Consequence: those two tests are rewritten to assert the new behavior,
not deleted, and the stale rationale comment is replaced.

**The reveal copy prefers a sponsor fact over an explanation.** The
correct-answer message resolver returns the sponsor fact when one is
present and only falls through to the explanation otherwise (`Verified
by:` [apps/web/src/game/gameUtils.ts:77-86](/apps/web/src/game/gameUtils.ts)),
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
authority named in C1 (`Verified by:` the copy authority's own
verification note of that date). This is a same-day verification and is
re-run as a Validation Gate item on PR 3 rather than trusted forward.

## Cross-Cutting Invariants

- **Explanation and sources are one unit.** Every surface that renders a
  question's explanation renders that question's sources directly
  beneath it, from the same rendering module, under the same heading.
  There are three such surfaces — correct reveal, incorrect reveal,
  end-of-quiz review — and they must not drift.
- **No source ever renders as a bare address.** Neither a refused link
  target nor a malformed link's address reaches the screen. C2 rejects
  both at authoring time; the renderer's plain-text degrade path is the
  second line, not the first.
- **Every source anchor opens in a new context with the browser's
  opener protections applied**, so a player never loses their place in
  the quiz.
- **Sources survive every write path.** Draft parse, admin save, draft
  validation, publish projection, and published read each preserve the
  ordered source list; a question that had sources before any one of
  those operations has the same sources after it.
- **Every published-question read path selects the same column set.**
  There are two — the browser read and the completion function's loader
  — and neither the type system nor the test suite catches a
  disagreement between them, because the Edge Function query casts its
  result rather than inferring it. C4 makes the set a single exported
  constant both consume, so this holds by construction rather than by
  anyone remembering it.

Five invariants rather than the two-to-four the per-level guidance
suggests. The fifth is the direct product of a review finding on this
plan — the loader was originally listed as not touched — and naming it
is what keeps the same omission from recurring at the next read path.

## Naming

- `sources` — the new optional field on the shared question type, and
  the new column on the published questions table. Same name at both
  ends deliberately; the projection reads it by that key.
- `PUBLISHED_GAME_QUESTION_COLUMNS` — the shared constant of C4, owned
  by the shared game-config module and consumed by both read paths.
- `questionNarrative.ts` — new pure module under the shared game-config
  module, owning explanation paragraph segmentation and source-line
  parsing, exported from the shared entrypoint. It lives in shared
  rather than in the web app because draft validation and the renderer
  must agree on which link targets are acceptable, and the
  no-duplicated-business-rules guardrail in
  [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  forbids two implementations of that rule.
- `QuestionExplanation.tsx` — new presentational component under the web
  game module's components folder, rendering the explanation paragraphs
  plus the source list.
- `.question-sources` — the class-name family for the source list, its
  heading, its entries, and the PDF marker.
- `Sources` — the visible label above every source list. Exact string;
  the first invariant and the component tests both name it.

## Contracts

### C1 — Copy authority and content scope

The revision-2 copy lives in the repository as a content deck at
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

The deck also records the date its links were last retrieved. PR 3
updates that date to the date its own link check ran.

### C2 — Shared question shape

The shared question type gains an optional ordered list of source lines.
Absent and empty are equivalent and both mean "this question shows no
source list." The field is optional at the type level so that every
other event's content remains valid without edits.

Draft parsing accepts the field, rejects a non-list value, rejects a
non-string entry, and rejects an entry that is empty once surrounding
whitespace is removed. The draft-to-runtime mapper carries the field
through unchanged.

Draft validation rejects a source entry on two grounds:

- link markup whose target is not an ordinary web address, so an unsafe
  target cannot be saved, published, or reach a renderer
- an address appearing anywhere outside recognized link markup

The second rule exists because rejecting only inside recognized markup
leaves the second invariant false for text the parser does not recognize
as a link at all. An entry with an unclosed link — a missing closing
parenthesis is the realistic authoring slip — matches nothing, falls to
the plain-text path, and prints its address on screen. No amount of care
inside the link branch prevents that; rejecting the entry at authoring
time does.

Rejecting at parse and validation time is the enforcement point for
authored content; the renderer's plain-text degrade path is the
independent second line, not a substitute for it.

### C3 — Published projection

The published questions table gains a column holding the ordered source
list, non-null, defaulting to the empty list, constrained so that its
value is a list and every entry in it is a string. Existing rows take
the default; no backfill runs, because the publish routine replaces
every question row for an event on each publish.

The publish routine's question insert reads the source list from the
draft content by the same key name and substitutes the empty list when
the key is absent or holds a JSON null.

No new table, no new policy, no new grant: the read policy is row-scoped
to the parent event's published state and the select grant is
table-level, both of which a new column inherits.

The generated database types file is regenerated so it describes the new
column.

### C4 — Published-question read paths

The set of question columns the published projection is read by becomes
a single exported constant owned by the shared game-config module, and
both read paths consume it: the browser read and the completion
function's loader. Neither restates the column names.

The new column is added to that constant, so both paths pick it up from
one edit. The row-to-runtime mapper carries the value into the shared
question shape, treating a null or absent value as the empty list.

Making the set a shared constant is in scope here rather than deferred.
The two literal lists are what allowed the loader to be missed at
drafting time, and adding a column to one of two hand-maintained lists
is the same defect waiting for its next occasion. The Edge Function's
query casts rather than infers its row type, so nothing else in the
build would catch it.

The completion function's grading, entitlement, and idempotency
behavior are unchanged. It is in this contract because it reads question
rows, not because it does anything with sources.

### C5 — Rendering

A new pure module in shared owns two transformations and holds no React.
It is the single implementation of the link-target rule: draft
validation and the renderer both consume it, so an entry that validation
rejects and an entry the renderer degrades are the same entry by
construction rather than by two rules kept in step.

- An explanation string becomes an ordered list of paragraphs, split on
  blank lines, with surrounding whitespace removed and empty paragraphs
  discarded.
- A source line becomes an ordered list of inline pieces: plain text,
  emphasized text, and links carrying visible text plus a target. Link
  visible text may itself be emphasized. A link whose target is not an
  ordinary web address is returned as plain text carrying the original
  visible text. Malformed markup is returned as plain text. The module
  reports, per link, whether the target names a PDF, so the renderer can
  mark it without the author doing so.

Alongside the pieces, the module reports two findings validation
consumes and the renderer ignores: the link targets it refused, and any
address it found in the plain-text remainder. Both are reports rather
than throws, because the renderer must still produce something safe for
content that predates the rule or arrives from a path validation did not
cover.

A new presentational component renders an explanation's paragraphs
followed by, when the question has sources, a labelled list beneath
them. The label is the exact string named in Naming. Each entry is a
list item. Links render as anchors that open in a new context with
opener protections applied; PDF links carry a visible marker adjacent to
the link text and an accessible equivalent for assistive technology.

The three existing render sites — the correct-answer reveal, the
incorrect-answer reveal, and the end-of-quiz answer review — each render
this one component in place of their current single-paragraph
explanation rendering. No site renders sources by any other means.

### C6 — Results screen

The score card and the per-question answer review render whenever a
completion result exists, in every feedback mode. The verification
block, the completion call to action, and the retake affordance are
unchanged in placement and behavior.

Each review card shows the player's answer, the correct answer, a
correct-or-not status, the explanation, and the sources, in that order.

### C7 — Admin authoring

The question form gains a sources field, edited as one line per source
in a plain multi-line text input, consistent with how the explanation
and sponsor-fact fields are edited today.

The field participates in the form's dirty-state tracking, is included
in the values built when a question is loaded into the form, is included
when form values are applied back to draft content, and is included in
save-time canonicalization. Blank lines are discarded on save; a field
left entirely empty saves as no sources.

The load-bearing requirement is the negative one: saving a question
after editing any other field preserves that question's sources
unchanged.

That requirement is asserted twice, at two altitudes, because one
altitude cannot catch the other's failure. A unit assertion over the
mapping functions catches a field dropped in canonicalization. An
end-to-end assertion catches an input that is not wired to the form at
all — which every mapping test passes. So the admin end-to-end spec
gains both halves: source lines entered in the new field survive a save
and a draft reload, and a subsequent edit to the prompt alone leaves
them unchanged. Without that extension, naming the admin suite as this
contract's gate names a gate that cannot fail on the risk it was named
for.

### C8 — Madrona event content

The Madrona event's feedback mode becomes non-blocking instant feedback.
Back navigation is turned off for the event. Every Madrona question's
sponsor is empty and no Madrona question carries a sponsor fact. Retake
stays on and the intro, summary, entitlement label, estimated minutes,
and event code are unchanged.

The seed module is the repository-side bootstrap, not the live content;
the live event renders the published rows. The change reaches players
only when the seed is run against the target environment and the draft
is published.

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
is required instead: entries carry enough line spacing that two links in
the same entry are separably tappable, and every entry wraps without
horizontal overflow at 320 pixels wide.

## Resolved Decisions

Deliberation and rejected alternatives live in the sibling scoping doc;
these are the settled calls the implementation is bound to.

1. **Feedback mode.** Non-blocking instant feedback, an existing mode,
   over must-get-it-right or a net-new mode.
2. **Back navigation.** Off for Madrona, as a content field, rather than
   a shared-code fix to the reveal-then-re-answer hole.
3. **Source format.** An ordered list of restricted-markdown lines
   supporting emphasis and inline links, over a structured segment array
   or a markdown dependency.
4. **Source storage.** One JSONB column on the published questions
   table, over a child table.
5. **Results screen.** The per-question review renders in every feedback
   mode, reversing the current gate.
6. **Sponsor removal.** Content-level: sponsor and sponsor fact go empty
   on Madrona questions; the rendering capability stays for other
   events.
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
the contracts do not move with the split. The PRs are strictly ordered —
each depends on the type, constant, or column the previous one
introduced — so "last to merge" is knowable in advance and PR 3 carries
the close-out.

### PR 0 — this plan and the copy deck

Docs-only. This plan, the sibling scoping doc, and the copy deck named
in C1.

The deck lands here rather than with the content it feeds, for two
reasons. C1 names it as the copy authority, and a plan whose authority
file does not exist is a dangling reference for anyone reviewing PR 1.
And leaving it untracked through PRs 1 and 2 would put an unrelated
uncommitted file in the worktree at the start of each of them, which the
Pre-Edit Gate treats as a stop condition. Copy corrections after this
land as ordinary doc commits on PR 3's branch.

Carries the `## Review Stance` paragraph in its PR body, per the
plan-doc review-stance rule; that paragraph does not go in the plan
itself.

### PR 1 — schema, shared shape, both read paths

Satisfies C2, C3, C4, and the parser half of C5.

*Commits.* The shared parser and its tests; the question shape, parsing,
and validation; the migration plus the replacement publish routine plus
regenerated types plus the database test; the shared column constant
with the two read paths that consume it.

Ships nothing a player can see: no content has sources, so every new
code path is inert in production.

This PR exists on its own because the publish routine is the highest
blast radius in the change. It is the one function every event's publish
runs through, so a defect in it breaks publishing for events that have
nothing to do with Madrona. Reviewed alone and promoted alone, it gets
the post-release admin smoke as a real production signal before any
content depends on it. Bundled into a thirty-file diff, it gets neither.

### PR 2 — rendering, results screen, authoring, styling

Satisfies the rendering half of C5, plus C6, C7, and C9.

*Commits.* The component and all three render sites together; the
results-screen gate reversal with its two rewritten tests; admin
authoring including the end-to-end extension C7 requires; the style
partial.

The component and all three render sites landing in one commit is a
rule, not an estimate: the first cross-cutting invariant must not be
false on any landed commit.

This PR carries the one behavior change visible before any Madrona
content lands: the per-question review now renders for `riverside-jam`
and `harvest-block-party` too. That is intended per decision 5, and it
is named in the PR body so it is reviewed as a deliberate change rather
than noticed as a side effect.

### PR 3 — Madrona content and close-out

Satisfies C8, and carries the close-out.

*Commits.* The seed module transcription against the deck PR 0 landed,
with any copy correction committed to the deck first on this branch; the
documentation currency updates; the close-out commit that flips Status
to `Landed` and deletes the sibling scoping doc. Followed by the
seed-and-publish run and the live play-through.

This is the only copy-dependent PR. It is last so that copy still under
correction never blocks the capability work, and so that the first
production exercise of the new column happens before, not with, the
first production exercise of the new content.

### Ordering rationale

PR 2 renders a field PR 1 adds to the shared type, and PR 3 authors
content that both preceding PRs must already support. Serial ordering is
therefore forced by the code, not chosen for process reasons. The
sequencing choice that *is* discretionary is where the content sits —
last rather than first — and that is what buys the decoupling from copy.

## Files To Touch

This section is an estimate per
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md)
"Plan content is a mix of rules and estimates"; the implementer may
revise it when a structural call requires deviating, recorded in the PR
body's `## Estimate Deviations` section. The contracts above are rules
and do not move with the estimate.

### New

- a migration under [supabase/migrations/](/supabase/migrations/) adding
  the sources column, its constraint, and the replacement publish
  routine — PR 1
- `shared/game-config/questionNarrative.ts` — the pure module of C5,
  re-exported from
  [shared/game-config/index.ts](/shared/game-config/index.ts) — PR 1
- `supabase/tests/database/game_question_sources.test.sql` — PR 1
- `tests/shared/game-config/questionNarrative.test.ts` — PR 1
- `apps/web/src/game/components/QuestionExplanation.tsx` — the component
  of C5 — PR 2
- `tests/web/game/components/QuestionExplanation.test.tsx` — PR 2
- `apps/web/src/styles/_game-sources.scss` — the partial of C9 — PR 2
- `shared/events/madrona-quiz-revision-2-copy.md` — the copy deck of C1
  — PR 0
- this plan and its sibling scoping doc — PR 0

### Modify

- [shared/game-config/types.ts](/shared/game-config/types.ts) — the
  optional field of C2
- [shared/game-config/draft-question-parsing.ts](/shared/game-config/draft-question-parsing.ts)
  and [shared/game-config/draft-json.ts](/shared/game-config/draft-json.ts)
  — parsing and per-entry rejection
- [shared/game-config/game-validation.ts](/shared/game-config/game-validation.ts)
  — the two rejection grounds of C2
- [shared/game-config/draft-content.ts](/shared/game-config/draft-content.ts)
  — carry-through in the draft-to-runtime mapper
- [shared/game-config/db-content.ts](/shared/game-config/db-content.ts) —
  the published row type, the row-to-runtime mapper, and the shared
  column constant of C4
- [shared/events/published.ts](/shared/events/published.ts) — consumes
  the shared column constant instead of its own literal list
- [supabase/functions/_shared/published-game-loader.ts](/supabase/functions/_shared/published-game-loader.ts)
  — the second read path of C4, same change; surfaced by review, not by
  the original draft
- [shared/db/types.ts](/shared/db/types.ts) — regenerated, not
  hand-edited
- [apps/web/src/admin/questionFormMapping.ts](/apps/web/src/admin/questionFormMapping.ts)
  and [apps/web/src/admin/AdminQuestionFields.tsx](/apps/web/src/admin/AdminQuestionFields.tsx)
  — C7
- [tests/e2e/admin-workflow.admin.spec.ts](/tests/e2e/admin-workflow.admin.spec.ts)
  — the end-to-end half of C7's preservation requirement
- [apps/web/src/game/components/CorrectAnswerPanel.tsx](/apps/web/src/game/components/CorrectAnswerPanel.tsx),
  [apps/web/src/game/components/AnswerRevealPanel.tsx](/apps/web/src/game/components/AnswerRevealPanel.tsx),
  and [apps/web/src/game/components/GameCompletionPanel.tsx](/apps/web/src/game/components/GameCompletionPanel.tsx)
  — the three render sites of C5 plus the gate change of C6
- [apps/web/src/styles/_game.scss](/apps/web/src/styles/_game.scss) —
  register the new partial
- [shared/events/madrona-demo-game-content.ts](/shared/events/madrona-demo-game-content.ts)
  — the content of C8, transcribed from the C1 deck
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
  [apps/web/src/game/README.md](/apps/web/src/game/README.md),
  [shared/events/README.md](/shared/events/README.md) — per the
  Documentation Currency PR Gate

### Intentionally not touched

An expectation, not a prohibition; the implementer may touch these with
rationale recorded as an estimate deviation.

- [apps/web/src/game/gameSessionState.ts](/apps/web/src/game/gameSessionState.ts)
  and [apps/web/src/game/gameSessionSelectors.ts](/apps/web/src/game/gameSessionSelectors.ts)
  — no new phase, no new transition; the mode and back-navigation
  changes are content fields the existing machine already reads
- [supabase/functions/complete-game/index.ts](/supabase/functions/complete-game/index.ts)
  and [supabase/functions/complete-game/dependencies.ts](/supabase/functions/complete-game/dependencies.ts)
  — grading, entitlement, and idempotency are unchanged. The function is
  nonetheless affected through the loader it imports, which is in the
  Modify list above; "not touched" here means these two files, not the
  function's blast radius
- [supabase/functions/read-demo-event/index.ts](/supabase/functions/read-demo-event/index.ts)
  — reads no question content rows
- [apps/site/](/apps/site/) — the landing page states no quiz content
- [apps/web/src/game/shuffleGameOptions.ts](/apps/web/src/game/shuffleGameOptions.ts)
  — option ordering is unaffected by a question-level field

## Validation Gate

Each procedure below was walked for a falsifier it can distinguish from
neighboring failure modes.

**Every implementing PR** runs lint, the unit suite, and both
application builds. The full local validation flow does not cover the
site build, so that command is run on its own.

**PR 1 also runs:**

- **The edge-function suite and a type check on the completion
  function.** *Falsifier:* the loader's column list and the shared
  constant disagreeing after the constant is introduced. The loader's
  query casts its row type, so nothing in the web build surfaces this;
  the Deno-side check is the only thing that reads that file.
- **The Supabase suite against a local stack, including the new database
  test.** That test asserts four things separately: that a published
  question carries the sources projected from its draft in order; that a
  draft question with no sources projects the empty list rather than
  null; that the constraint rejects a non-list value; and that the
  constraint rejects a list containing a non-string entry. *Falsifier:*
  a constraint that validates only the outer type — assertions one
  through three all pass against it, and only the fourth distinguishes
  it.
- **The admin end-to-end suite.** PR 1 replaces the publish routine,
  which is publish behavior, and that suite is excluded from both CI and
  the full local flow. *Falsifier:* a replacement routine that satisfies
  every unit and database assertion but fails against a real publish
  through the admin UI.

**PR 2 also runs:**

- **The admin end-to-end suite, extended per C7.** The existing spec
  edits the event name and the question prompt only, so it passes
  unchanged against a sources field that was never wired up.
  *Falsifier:* a sources input absent from the form's change handling —
  which every mapping-level unit test passes and only a real form
  interaction catches. The extension is what makes this gate capable of
  failing; naming the command without it is a gate that cannot.
- **Mobile inspection at 320 and 390 pixels wide,** on a reveal panel
  with a long fixture source list and on the results review: no
  horizontal overflow, tap targets separable, line length readable.
  *Falsifier:* an entry that fits at 390 and overflows at 320, which a
  single-width check cannot surface.
- **Measured contrast** of source text and source links against the
  Madrona theme's cream and putty surfaces. *Falsifier:* a token that
  passes on the platform default theme and fails under Madrona, which is
  why the measurement is taken under the event's own theme.

**PR 3 also runs, after merge and publish:**

- **All eighteen source links resolve,** checked by opening each one from
  the built quiz rather than from the deck, so the check exercises the
  parser and the renderer as well as the address. *Falsifier:* a link
  that resolves when pasted into a browser but renders with a truncated
  or mis-parsed target in the quiz — which a deck-side check cannot
  surface and an in-quiz check can. The deck's recorded retrieval date is
  updated to the date this ran.
- **A full play-through of the live Madrona quiz on a phone:** five
  questions, an explanation and sources after each, no sponsor name
  anywhere, no back affordance, and the complete review plus an
  event-code-prefixed check-in code at the end. *Falsifier:* content that
  validates in the seed module but was never published, which every
  preceding check would pass and only a live play-through catches.

**Ordering gate between PR 1 and PR 3.** The production admin smoke on
PR 1's release must pass before PR 3 publishes content. It exercises
publish against dedicated production fixtures, and it is the production
signal on the replaced publish routine that the three-PR split exists to
buy. Publishing content onto an unsmoked publish routine spends the
split's cost and takes none of its benefit.

The canonical local entry points are the repository's own scripts, not
lower-level invocations. Two boundaries are load-bearing and are stated
rather than assumed: the full local flow starts the local Supabase stack
transitively through the Supabase suite, but it does not install the
browser runtime — it fails fast when the browser is absent, and
provisioning is the separate local-setup script.

## Self-Review Audits

Drawn from [`docs/self-review-catalog.md`](/docs/self-review-catalog.md),
run at the commit boundaries named in each PR's entry.

**SQL, on PR 1's migration commit:**

- *CHECK-constraint NULL-handling audit* — the new constraint's behavior
  when the column holds a JSON null versus a SQL null versus an empty
  list, all three stated explicitly.
- *Grant/body contract audit* — the replacement publish routine runs
  with definer rights; confirm its privilege surface is unchanged from
  the routine it replaces and that no new grant was needed.
- *Legacy-data precheck for constraint tightening* — the column is added
  with a default and existing rows are replaced on next publish; record
  the verdict rather than skipping the audit.
- *pgTAP output-format stability audit* — for the new database test.

**Frontend, on PR 2's authoring commit:**

- *Dirty-state tracked-inputs audit* — the new sources input must
  register in dirty-state tracking, or the save button stays disabled
  after a sources-only edit.
- *Post-save reconciliation audit* — the form's post-save state reflects
  the canonicalized sources, including discarded blank lines.
- *Unchanged-vs-explicit-write audit* — an unrelated question edit writes
  the existing sources back unchanged rather than omitting the key.

**Documentation, on PR 3's docs commit:**

- *Canonical-owner duplication audit* — the copy deck is the single owner
  of the revision-2 strings; this plan describes contracts and does not
  restate the copy.
- *Validation-command coupling audit* — the commands named in the
  Validation Gate are the repository's current entry points.

**Plan-local, not from the catalog:**

- *Cross-cutting invariant walk* — each of the five invariants in this
  plan has at least one assertion naming it. Borrowed as a convention
  from
  [`docs/plans/madrona-launch-page-corrections.md`](/docs/plans/madrona-launch-page-corrections.md),
  which runs the same walk; the catalog carries no entry by this name.
- *Gate-capability check* — for each command named in the Validation
  Gate, name the assertion inside it that would fail if the contract it
  gates were violated. A gate with no such assertion is removed or
  extended, never left standing. This one exists because review caught
  the admin suite being named as a gate it could not fail; the catalog's
  vacuous-pass entry covers pgTAP privilege assertions specifically and
  does not reach this case.

## Documentation Currency PR Gate

Walked on PR 3, which carries the documentation commit.

- [README.md](/README.md) — the current-milestone feature list
  enumerates quiz capabilities and does not mention per-question sources.
- [docs/architecture.md](/docs/architecture.md) — the published-content
  data model description gains the new column.
- [shared/game-config/README.md](/shared/game-config/README.md) — the
  module map describes the question shape and gains the narrative module.
- [apps/web/src/game/README.md](/apps/web/src/game/README.md) — the
  internal structure list and testing layout gain the new component and
  its test.
- [shared/events/README.md](/shared/events/README.md) — gains the copy
  deck as a sibling artifact of the seed module.

## Out Of Scope

- **A shared fix for re-answering a revealed question.** C8 closes it for
  Madrona with a content field. The general fix touches the session state
  machine and another live event. *Trigger:* the next event that wants
  both instant reveal and back navigation.
- **Sources on any event other than Madrona.** The field is available to
  every event; no other event's content is edited here. *Trigger:* an
  organizer authoring sources in the admin workspace.
- **A rich editor for source lines in the admin workspace.** C7 ships a
  plain multi-line input consistent with the neighbouring fields.
  *Trigger:* organizer feedback that the line format is error-prone.
- **Rendering emphasis or links anywhere other than source lines.**
  Prompts, option labels, and explanations stay plain text; only the
  explanation's paragraph segmentation changes. *Trigger:* copy that
  needs a link inside an explanation body.
- **Folding the event and option column sets behind shared constants.**
  C4 does this for the question set only, which is the one a review
  finding proved can drift. *Trigger:* a column added to either of the
  other two sets.
- **Analytics on source-link taps.** *Trigger:* a decision to measure
  whether citations are used.

## Risk Register

- **A distractor on question 2 sits close to the church's 1969 name.**
  The copy authority instructs that only question 1 gets new distractors,
  and the explanation names both the present-day and the 1969 name.
  *Mitigation:* the near-collision is recorded here so a post-launch
  review can revisit it with play data rather than guesswork.
- **A source link dies between the deck's retrieval date and the event.**
  *Mitigation:* PR 3 re-opens every link from the built quiz; a link that
  has died is replaced or its entry becomes a plain-text citation before
  publish.
- **An organizer edits a question in the admin workspace and loses
  sources.** The sharpest failure mode in the change. *Mitigation:* C7's
  negative requirement asserted at two altitudes — mapping-level unit
  coverage and a real form interaction end to end — plus the
  unchanged-vs-explicit-write audit.
- **The results-screen reversal surprises the two other events on instant
  modes.** *Mitigation:* deliberate per decision 5, named in PR 2's body,
  and the two tests asserting the old behavior are rewritten rather than
  deleted.
- **The three-PR split buys a production checkpoint that only pays off if
  someone waits for it.** *Mitigation:* the smoke gate is a stated
  precondition on PR 3 rather than advice, and PR 3's own checks cannot
  run before publish anyway, which puts the wait on the critical path
  rather than beside it.
- **The seed module and the live published content drift.** The seed is a
  bootstrap; the live event renders published rows an organizer can edit.
  *Mitigation:* PR 3's live play-through is the check that what shipped
  is what plays.
- **The restricted markup invites authors to expect full markdown.**
  *Mitigation:* unsupported markup renders literally rather than failing,
  and an address left outside link markup is rejected at authoring time
  with a message naming the fix.

## Backlog Impact

- **Opened.** A shared-code item for the reveal-then-re-answer hole,
  scoped to every feedback mode that reveals an answer, referencing this
  plan's Out Of Scope entry.
- **Changed.** Nothing.
- **Closed.** Nothing.

## Related Docs

- [`docs/plans/scoping/madrona-quiz-revision-2.md`](/docs/plans/scoping/madrona-quiz-revision-2.md)
  — the sibling scoping doc; deletes at this plan's terminal PR.
- [`docs/plans/madrona-launch-page-corrections.md`](/docs/plans/madrona-launch-page-corrections.md)
  — the parallel pre-launch correction pass on the day-of landing
  surfaces.
- [`docs/styling.md`](/docs/styling.md) — the token classification and
  the Madrona theme's measured contrast table that C9 is checked against.
- [`docs/experience.md`](/docs/experience.md) — the attendee-flow target
  the feedback-timing change is serving.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) — the
  audits named above.
- [`docs/testing.md`](/docs/testing.md) — the coverage expectations and
  validation commands the Validation Gate is built from.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) — the tier map, which
  names which tier is a valid gate for which decision.
- [`docs/dev.md`](/docs/dev.md) — the admin end-to-end command and its
  stated exclusions from CI and the full local flow.
