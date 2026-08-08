# Madrona Quiz Revision 2 — Scoping

Transient scoping doc for
[`docs/plans/madrona-quiz-revision-2.md`](/docs/plans/madrona-quiz-revision-2.md).
Deletes at that plan's terminal PR. Per
[`docs/agents/planning/plan.md`](/docs/agents/planning/plan.md)
"Scoping owns / plan owns," this doc carries the deliberation and the
rejected alternatives; the file inventory, contracts, invariants,
validation procedures, and risks live in the plan and are not restated
here.

## Context

The Madrona Music in the Playfield quiz ships five neighborhood-history
questions. Revision 2 rewrites question 1 (the old one was wrong at the
premise level), replaces four explanations with sourced copy, strips
sponsor attribution from the quiz entirely, and — the load-bearing new
requirement — puts a visible, clickable source list under every
explanation. The quiz makes contested factual claims about the Black
Panther Party, a public sculpture's meaning, and a street renaming that
36 merchants sued to stop. Sources are what make those claims
trustworthy in front of a neighbor standing in a park, which is why the
source display is scoped as a first-class requirement rather than a
footnote.

## Decisions made at scoping time

### 1. Feedback mode becomes non-blocking instant feedback

The player submits an answer, sees correct-or-not plus the explanation
and its sources, then taps Continue. Wrong answers stay wrong.

This mode already exists end to end and is live on another event
(`Verified by:` [shared/game-config/types.ts:9-12](/shared/game-config/types.ts)
defines `instant_feedback_non_blocking`;
[apps/web/src/game/gameSessionState.ts:269-297](/apps/web/src/game/gameSessionState.ts)
implements the reveal transition;
[supabase/migrations/20260509170000_extend_game_events_feedback_mode_check.sql](/supabase/migrations/20260509170000_extend_game_events_feedback_mode_check.sql)
widened the database CHECK to accept it; the `harvest-block-party`
event runs on it in the live project). Choosing it means the launch
carries no new state-machine code.

**Rejected — `instant_feedback_required`.** A wrong answer holds the
player on the question until they get it right, so every finisher ends
at five of five and the score stops carrying information. It also
forces a player who does not know the answer to guess until the
interface relents, which reads as a worse experience than being told
the answer with a paragraph explaining it.

**Rejected — a new "reveal, then allow change" mode.** Net-new phase
transitions, net-new reducer actions, net-new persistence shape, and a
new arm on every feedback-mode branch, four days of work before a
launch, to reach a behavior the existing mode already approximates.

### 2. Back navigation turns off for this event

Non-blocking reveal plus back navigation is a scoring hole: after the
reveal the player continues to the next question, navigates back, and
resubmits the now-known answer, which overwrites the graded response
(`Verified by:`
[apps/web/src/game/gameSessionSelectors.ts:43-44](/apps/web/src/game/gameSessionSelectors.ts)
allows back navigation from any non-first question in the `question`
phase; [apps/web/src/game/gameSessionState.ts:191-205](/apps/web/src/game/gameSessionState.ts)
restores the stored selection on the way back;
[apps/web/src/game/gameSessionState.ts:269-297](/apps/web/src/game/gameSessionState.ts)
overwrites `answers` on the resubmit). Turning back navigation off for
Madrona is a content-level field on the event, so it closes the hole
for this launch without touching shared code.

The general fix — that no feedback mode which has already revealed an
answer should permit re-answering it — is a shared-code change that
also affects `harvest-block-party`, and it is deliberately out of this
plan's scope and recorded in the plan's Backlog Impact.

**Rejected — leave back navigation on and accept the hole.** The
reward gate rests on the completion record, so an inflated score is not
a fraud vector, but the quiz stops measuring what it claims to measure
and a player who notices loses trust in the score line on the results
screen.

### 3. Sources persist as an ordered list of restricted-markdown lines

Each question gains an ordered list of source entries. Each entry is
one line of a deliberately small markup: emphasis delimited by single
asterisks, and links in markdown's standard inline-link form. Anything
else in the line renders literally. Whether a link points at a PDF is
derived from the link target at render time rather than authored.

The shape is forced by the copy, not chosen for elegance. One entry
carries two links plus three runs of surrounding plain text. Two
entries are print books with no link at all. One entry's link text is
itself an italicized book title. A title-plus-URL pair cannot express
any of those three.

**Rejected — a structured segment array** (each entry an array of
typed text / emphasis / link objects). It removes the need for a
parser, but every source becomes a nested object graph to hand-author
in the seed module and an unusable editing experience in the admin
form, which is a plain-textarea surface
(`Verified by:` [apps/web/src/admin/AdminQuestionFields.tsx:163-184](/apps/web/src/admin/AdminQuestionFields.tsx),
where explanation and sponsor fact are both plain textareas).

**Rejected — full markdown via a dependency.** Pulls a renderer and its
sanitizer into the attendee bundle for two inline constructs, and
introduces a supply-chain and payload-size cost on a surface whose
whole design premise is a fast load on event Wi-Fi.

### 4. Sources project into a JSONB column, not a normalized table

The published projection gains one column on the questions table rather
than a fourth content table.

The projection tables are rebuilt wholesale on every publish — the
publish routine deletes and reinserts every question row for the event
(`Verified by:` [supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql:150-153](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql)),
so the ordering and integrity guarantees a child table would buy are
already supplied by the draft JSON that feeds the projection. A child
table would add a table, its row-level security policies, its grants, a
third projection insert, and a third read round-trip on the attendee
path, to hold display-only strings that are never queried, joined, or
filtered.

**Rejected — a `game_question_sources` child table.** Strictly more
database-level integrity, and it matches how answer options are stored.
Answer options earn that treatment because they are *graded* — the
correctness projection reads them
(`Verified by:` the same migration's option insert, which computes
`is_correct` by matching against the draft's correct-answer ids).
Sources are never read by any decision the backend makes.

**Rejected — leaving sources only in the draft JSON.** The attendee
read path hydrates from the projection tables, never from the draft
(`Verified by:` [shared/events/published.ts:133-160](/shared/events/published.ts)),
so sources that skip the projection never reach a player.

### 5. The end-of-quiz review renders in every feedback mode

Today the score card and per-question review render only in
`final_score_reveal` mode, and two tests assert the opposite for the
two instant modes on the stated rationale that reveals were already
shown during play
(`Verified by:` [apps/web/src/game/components/GameCompletionPanel.tsx:84-85](/apps/web/src/game/components/GameCompletionPanel.tsx);
[tests/web/game/components/GameCompletionPanel.test.tsx:264-311](/tests/web/game/components/GameCompletionPanel.test.tsx)).
Revision 2 reverses that call.

The rationale that produced the current behavior does not survive the
sources requirement. A source list seen once, mid-quiz, behind a
Continue button the player has already pressed, is not a citation a
player can return to. The results screen is the only durable surface in
the flow — it survives reload and revisit
(`Verified by:` [apps/web/src/game/useGameSession.ts:31-46](/apps/web/src/game/useGameSession.ts),
which restores a completed attempt from device storage) — which makes
it the right home for the full sourced record.

The reversal changes the completion screen for the two other events on
instant modes. That is accepted, and the two tests asserting the old
behavior are rewritten to assert the new one rather than deleted.

**Rejected — score and check-in code only.** Leaner screen; loses every
source the moment the player advances past the last reveal.

### 6. Sponsor attribution leaves the quiz as content, not as code

Every Madrona question's sponsor field goes empty and the one sponsor
fact is removed. The rendering capability stays, because other events
use it.

This has a non-obvious consequence worth naming: the reveal copy
prefers a sponsor fact over an explanation when both are present
(`Verified by:` [apps/web/src/game/gameUtils.ts:77-86](/apps/web/src/game/gameUtils.ts)).
Question 1 carries both today
(`Verified by:` [shared/events/madrona-demo-game-content.ts:55,67](/shared/events/madrona-demo-game-content.ts)),
so leaving the sponsor fact in place would show the sponsor line
instead of the new sourced explanation on the one question the revision
exists to fix.

### 7. The work ships as three sequential PRs, not one

Schema and shared shape; then rendering, results, and authoring; then
content. A fourth, doc-only close-out PR follows once the post-publish
checks pass; it carries no decisions and is not part of this
decomposition.

An earlier draft of this decision said one PR, on the reasoning that no
intermediate state has independent value. That reasoning was applied to
the wrong question. Independent stakeholder value is the discriminator
for the *doc level* — whether this is an epic, a milestone, or a task —
and it correctly says "one task." It is not the discriminator for PR
size, which the repository governs separately: `AGENTS.md` "Scope
Guardrails" asks for one tightly related file family per handoff,
allows combining only when items share the same files and the same
validation surface, and lists "mixed backend/frontend/UI work" among
its stop-and-report conditions. This change is mixed
backend/frontend/UI by construction. Under the rule that actually
governs, one PR fails.

Three reasons survive re-examination, in order of weight.

**The publish routine is shared infrastructure.** It is the single
function every event's publish runs through
(`Verified by:` [supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql:31](/supabase/migrations/20260423010000_rename_live_version_number_to_last_published_version_number.sql)),
so a defect in the replacement breaks publishing for events unrelated
to Madrona. Landing it alone means it is reviewed against its own
validation surface, promoted on its own, and exercised by the
post-release admin smoke against dedicated production fixtures before
any content rides on it. Landing it inside a thirty-file diff means the
first production exercise of the new routine and the first production
exercise of the new content are the same event.

**Every intermediate state is inert.** The usual argument against
splitting — half-shipped behavior — does not apply. A column with a
default that no content populates, a parser nothing calls, and a
renderer that renders nothing when the list is empty are all no-ops in
production. The split costs a short window of unused code, not a window
of wrong behavior.

**Copy and code decouple.** Content is the only PR that depends on
final wording. Putting it last means a late correction is a
one-file re-transcription rather than a rebase across the whole change,
which matters because copy is still moving at drafting time.

**Rejected — one PR.** Fewer CI cycles, one review, one PR body, and
the change is roughly a day of work. Real savings, and they are the
honest case for it. They lose to the first reason above: the savings
are process overhead, and what is bought is a production checkpoint on
the one component whose failure reaches other events.

**Rejected — two PRs, capability then content.** Decouples copy, which
is the pressure that surfaced this question, but leaves the publish
routine reviewed alongside SCSS and React in a twenty-five-file diff.
It solves the scheduling problem and not the risk problem.

**Rejected — four PRs, splitting the results-screen reversal out.** The
reversal is one line plus two rewritten tests in a file PR 2 already
edits for the render-site swap. A fourth PR would touch that file
twice. It is called out in PR 2's body instead, which gets the
attention without the second diff.

## Open decisions to make at plan-drafting

None. All seven decisions above are resolved; the plan's Status may go
to `Proposed` once its own promotion-gate walk passes.

## Plan structure handoff

One task plan, filed flat as a cross-cutting plan, N = 1 phase absorbed
inline. Three sequential implementing PRs, enumerated in the plan's
`## PR Sequence` section with commit boundaries mapped to them. No
phase plan files: the PRs are commit-level decomposition of one phase,
not phases in their own right, because none of them has independent
stakeholder value.

Because the PRs are strictly ordered and the last implementing PR is
knowable in advance, the plan does not invoke the Plan-to-PR Completion
Gate's "Parallel implementing PRs" exception.

It does invoke the other one. The plan's Validation Gate names two
checks that cannot run until Madrona content is published — opening
every source link from the built quiz, and a live play-through — and
publication follows the last implementing PR's merge. That is the
post-release-validation exception, so the last implementing PR merges at
`In progress pending live quiz verification` and a doc-only close-out PR
flips to `Landed`. The close-out therefore is not carried by the
last-to-merge implementing PR, which an earlier revision of this doc
asserted. The plan's Status block states both calls.

## Reality-check inputs the plan must verify

These are handed to the plan, which records the verified findings in
its own Reality-check inputs section rather than repeating them here:

- the publish routine's question insert and the exact draft-JSON keys
  it reads
- whether the admin save path preserves unknown question fields or
  rebuilds the question object field by field
- the attendee read path's explicit column lists
- whether the demo-mode read function or the completion function reads
  question rows in a way a new column disturbs
- the generated database types file and whether it is checked in
- the current feedback-mode CHECK constraint's accepted values
- the row-level-security and grant posture on the questions table, and
  whether a new column inherits it
- which tests assert the behaviors decisions 1, 2, and 5 change
