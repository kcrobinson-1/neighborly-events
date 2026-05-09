# Non-Blocking Feedback Mode (Game Events)

## Status

In draft.

## Context

Today an event author picks one of two answer-feedback behaviors when
configuring an event (the choice is stored on `game_events.feedback_mode`,
so it is per-event, not per any reusable game template):
`final_score_reveal` (no per-question feedback;
score revealed at the end) or `instant_feedback_required` (per-
question correctness feedback; the player must answer correctly to
advance). Both are end-points on a "tell me / don't tell me" axis,
and neither matches the third shape the product framing in
[`docs/experience.md`](/docs/experience.md) has anticipated as
"optional later: `instant_feedback_non_blocking`": after submit, the
player is told whether they were right, shown the correct answer
and any explanation, and advances regardless. The reveal is the
hook — the player learns the answer in the moment they cared,
without being gated on getting it right.

This plan lands that third mode end-to-end. It is opt-in at the
event-authoring level, alongside the existing two; existing events
keep whichever mode they have today. The work is small and
cross-cutting (DB constraint, shared types, draft parser, reducer
branch, two UI panels, admin dropdown, e2e/test fixtures); it is
not part of an epic and ships as a single PR per the cross-cutting
plan layout in
[`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md).

## Goal

After this plan lands, an event author can choose
`instant_feedback_non_blocking` from the Feedback Mode dropdown in
the admin event-details form. A player on an event configured that
way submits an answer and immediately sees a post-submit panel that
resolves the question, then advances to the next question with one
button regardless of whether their submission was right. Panel
content is case-specific:

- **Correct submission:** the panel renders identically to today's
  `instant_feedback_required` correct-feedback panel — sponsor
  fact if defined, else explanation, else the generic correct
  default copy. This is intentional inheritance: authors who
  attached a sponsor fact to a question want it surfaced when the
  player gets the question right, and that hook should not diverge
  between the two instant-feedback modes.
- **Wrong submission:** the panel names which option(s) were
  actually correct, then renders the question's `explanation`
  when present, falling back to a labelled generic ("The correct
  answer is X") when no explanation is defined. The wrong-case
  path does **not** route through `sponsorFact` — a sponsor brag
  attached to a missed question reads as a non-sequitur.

The player's score reflects whichever answer they actually
submitted (correct counts as 1, incorrect counts as 0; backend
re-scores from trusted published content as today). The two
existing modes' behavior is unchanged.

## Cross-Cutting Invariants

- The set of valid `FeedbackMode` values is the same string set in
  `shared/game-config/types.ts`, the `game_events_feedback_mode_check`
  CHECK constraint on `game_events`, the `expectFeedbackMode`
  parser, and the admin Feedback Mode `<select>`. Adding or removing
  a value requires updating all four sites in the same PR.
- A submitted answer in non-blocking mode is the player's final
  answer for that question and is persisted into reducer
  `state.answers` regardless of correctness — distinct from
  `instant_feedback_required` where wrong answers are transient
  retries and only the correct answer is stored.
- Backend score is re-derived server-side from
  `payload.answers` via `scoreAnswers` ([supabase/functions/complete-game/index.ts:148](supabase/functions/complete-game/index.ts:148)),
  so client-side storage of incorrect answers in non-blocking mode
  scores correctly without backend changes. **Verified by:**
  [supabase/functions/complete-game/index.ts:141-148](supabase/functions/complete-game/index.ts:141-148)
  ("The browser sends answers, but the server owns the
  authoritative result. We normalize the payload, recompute score
  from trusted published content").

## Contracts

### `FeedbackMode` union, DB CHECK constraint, draft parser

`shared/game-config/types.ts` extends the `FeedbackMode` union to
include the third value `instant_feedback_non_blocking`. **Verified
by:** [shared/game-config/types.ts:8-10](shared/game-config/types.ts:8-10)
(current two-value union shape).

A new migration widens the existing
`game_events_feedback_mode_check` constraint on `game_events` to
accept the third value alongside the two existing ones. The
constraint was originally created as
`quiz_events_feedback_mode_check` and renamed alongside the
broader quiz→game terminology rename; the IN-clause predicate
itself was untouched by the rename and still carries the original
two values today. **Verified by:**
[supabase/migrations/20260406130000_add_published_quiz_content.sql:21-22](supabase/migrations/20260406130000_add_published_quiz_content.sql:21-22)
(original predicate: `check (feedback_mode in
('final_score_reveal', 'instant_feedback_required'))`),
[supabase/migrations/20260418000000_rename_database_terminology_to_game.sql:53-54](supabase/migrations/20260418000000_rename_database_terminology_to_game.sql:53-54)
(constraint rename to current `game_events_feedback_mode_check`
name).

`shared/game-config/draft-question-parsing.ts`'s `expectFeedbackMode`
adds the third value to its accept-list and updates the error
message it throws to enumerate all three. **Verified by:**
[shared/game-config/draft-question-parsing.ts:12-29](shared/game-config/draft-question-parsing.ts:12-29)
(current two-value validator).

Read-paths (`shared/events/published.ts`,
`shared/game-config/db-content.ts`) consume the value through the
`FeedbackMode` type alias and need no change beyond the type
extension above. **Verified by:**
[shared/events/published.ts:26](shared/events/published.ts:26),
[shared/game-config/db-content.ts:13](shared/game-config/db-content.ts:13).

### Reducer: non-blocking submit always advances and stores the answer

The game-session reducer at
[apps/web/src/game/gameSessionState.ts](apps/web/src/game/gameSessionState.ts)
gains a code path that runs when `feedbackMode ===
"instant_feedback_non_blocking"`. Whether it is implemented as a
new `submitNonBlocking` action variant or as a third branch inside
the existing `submitRequired` handler is an implementer's call;
the contract is:

- The submit reducer transition normalizes the pending selection,
  writes it into `state.answers` for the current question (regardless
  of correctness), sets `feedbackKind` to `"correct"` or
  `"incorrect"` based on `answersMatch(submitted,
  correctAnswerIds)`, populates `feedbackMessage` per the
  case-specific rule below, and transitions to the post-submit
  feedback phase.
- **Feedback-message preference is case-specific.** In the
  `feedbackKind: "correct"` case, the message is sourced from
  `getQuestionFeedbackMessage` unchanged from
  `instant_feedback_required` today (`sponsorFact ?? explanation
  ?? default`). **Verified by:**
  [apps/web/src/game/gameUtils.ts:44-52](apps/web/src/game/gameUtils.ts:44-52).
  In the `feedbackKind: "incorrect"` (revealed) case, the message
  prefers `explanation` first, then a generic fallback that names
  the correct option label(s) (e.g., "The correct answer is X").
  The wrong-case path does **not** route through `sponsorFact` —
  a sponsor brag attached to a missed question reads as a non-
  sequitur. Add a non-blocking-specific helper (working name
  `getRevealedAnswerMessage`) rather than overloading
  `getQuestionFeedbackMessage`, so the existing helper's "after a
  correct answer" docstring stays accurate.
- The post-submit phase remains the gate before advancing. The
  existing phase is named `correct_feedback`
  ([apps/web/src/game/gameSessionState.ts:13-18](apps/web/src/game/gameSessionState.ts:13-18));
  whether to rename it (`answer_revealed` or similar) so it
  accurately covers both correct and incorrect cases is an
  implementer's call. If the rename happens, the
  selector/view-state field `isShowingCorrectFeedback` and any
  test references rename consistently in the same PR.
- The `goForwardAfterFeedback` action already advances from this
  phase and writes the completion-submit transition when the run
  ends. Its contract is unchanged for non-blocking mode.

The existing `submitRequired` and `submitFinalScore` paths are
untouched. **Verified by:**
[apps/web/src/game/gameSessionState.ts:154-217](apps/web/src/game/gameSessionState.ts:154-217)
(existing two-mode reducer branches),
[apps/web/src/game/gameUtils.ts:43-52](apps/web/src/game/gameUtils.ts:43-52)
(`getQuestionFeedbackMessage` precedent).

### Pre-game intro copy gains a third branch

[apps/web/src/game/components/GameIntroPanel.tsx:19-22](apps/web/src/game/components/GameIntroPanel.tsx:19-22)
today computes `modeDescription` from a strict two-way ternary:
`instant_feedback_required` renders "Answer correctly to unlock
the next question and a quick sponsor fact," and every other mode
falls through to "See your score after the last question." A new
mode added without touching this branch silently inherits the
score-reveal copy, which directly contradicts the immediate-reveal
behavior the new mode promises. Non-blocking mode must render its
own intro copy (working candidate: "See the answer right after
each question") via either a three-way branch, a `switch`, or a
`Record<FeedbackMode, string>` mapping — implementer's call. The
contract is that each `FeedbackMode` value resolves to its own
copy line, and exhaustiveness is enforced (the `switch` exits
unreachable, or the `Record` is fully populated, so a future
fourth mode added without touching this site fails to type-check
rather than silently falling through).

### Completion-panel answer-review stays scoped to `final_score_reveal`

[apps/web/src/game/components/GameCompletionPanel.tsx:74-75](apps/web/src/game/components/GameCompletionPanel.tsx:74-75)
gates the end-of-run answer-review section with
`Boolean(completion) && game.feedbackMode === "final_score_reveal"`.
The intent is "show the review only when the player hasn't
already seen their answers during play." For non-blocking mode
the player has seen each reveal at submit time, so the review
should stay hidden — and the existing positive-match expression
already produces this. The contract is that the expression
**remains a positive match on `final_score_reveal`** rather than
being broadened to `!== "instant_feedback_required"` or
`!== "instant_feedback_non_blocking"`; a future fourth mode that
genuinely needs the end-of-run review would opt in by extending
the positive list. A regression test in `GameCompletionPanel.test.tsx`
covers non-blocking mode with `Boolean(completion)` true and
asserts the answer-review section does **not** render.

### useGameSession dispatcher branches on the new mode

[apps/web/src/game/useGameSession.ts:126-139](apps/web/src/game/useGameSession.ts:126-139)
currently dispatches `submitFinalScore` when `feedbackMode ===
"final_score_reveal"` and `submitRequired` otherwise. The two-way
branch becomes a three-way branch (or stays two-way if the
non-blocking path reuses `submitRequired` with a discriminator —
implementer's call). The shape of the dispatched action is the
implementer's call; the contract is that the right reducer
transition fires for each mode value.

### Game UI: page-level render switch reaches both panels

[apps/web/src/pages/GamePage.tsx:121-128](apps/web/src/pages/GamePage.tsx:121-128)
today mounts only `CorrectAnswerPanel` when `isShowingCorrectFeedback`
fires. A sibling reveal panel (or an extended single panel that
branches on `feedbackKind`) is unreachable without updating this
conditional. The page already destructures `feedbackKind` from
`useGameSession` ([apps/web/src/pages/GamePage.tsx:32](apps/web/src/pages/GamePage.tsx:32)),
so the switch is wireable without hook changes. The contract is:

- If the implementer chooses the **two-component** shape
  (`CorrectAnswerPanel` + `AnswerRevealPanel`), the page-level
  conditional renders `CorrectAnswerPanel` when `feedbackKind ===
  "correct"` and `AnswerRevealPanel` when `feedbackKind ===
  "incorrect"`, both gated on the same post-submit-phase
  predicate that today is `isShowingCorrectFeedback` (or its
  renamed equivalent if the phase rename happens).
- If the implementer chooses the **one-component** shape (extend
  `CorrectAnswerPanel` to render both cases), the page-level
  conditional stays single-mount but passes `feedbackKind` and
  whatever else the component needs to render the reveal copy
  through; the component itself branches internally.

Either shape is acceptable; what is **not** acceptable is shipping
a sibling component without updating `GamePage.tsx`. Validation
gate cases (b) and (c) below are the falsifier — a forgotten
page-level switch surfaces as the wrong panel rendering on a
wrong submission.

### Post-submit panel: correct and revealed-incorrect cases

[apps/web/src/game/components/CorrectAnswerPanel.tsx](apps/web/src/game/components/CorrectAnswerPanel.tsx)
renders the post-submit success state in
`instant_feedback_required` today, displaying a "Correct" chip,
the sponsor (if any), and the feedback message. Non-blocking mode
adds an incorrect-but-revealed counterpart that names the player's
result, shows the correct answer label(s) (resolved from
`question.options` against `question.correctAnswerIds` via
`getOptionLabels`, **Verified by:**
[apps/web/src/game/gameUtils.ts:32-41](apps/web/src/game/gameUtils.ts:32-41)),
and renders the explanation. The two-vs-one component shape choice
is named in the page-level contract above; this section's contract
is what each rendered panel contains. Both correct and
revealed-incorrect renderings expose the same `Continue` / `See
your results` advance affordance.

[apps/web/src/game/components/CurrentQuestionPanel.tsx:60-65](apps/web/src/game/components/CurrentQuestionPanel.tsx:60-65)'s
inline `feedback-banner-error` "Try again" rendering remains
specific to `instant_feedback_required` retry-on-current-question
behavior. In non-blocking mode the player never sees that banner —
incorrect feedback comes through the post-submit panel instead.

For multi-select questions (`selectionMode: "multiple"`), the
reveal panel renders the full correct option set, not just one
option. **Verified by:**
[apps/web/src/game/gameUtils.ts:32-41](apps/web/src/game/gameUtils.ts:32-41)
(`getOptionLabels` returns labels in `optionIds` order; the
reveal panel orders by `correctAnswerIds`).

### Authoring UI: admin Feedback Mode dropdown gains the new option

[apps/web/src/admin/AdminEventDetailsForm.tsx:232-245](apps/web/src/admin/AdminEventDetailsForm.tsx:232-245)
adds a third `<option value="instant_feedback_non_blocking">` with
a human-readable label. The label copy is settled at implementation
time by looking at the rendered admin form alongside the two
existing labels ("Final score reveal," "Instant feedback
required") so the three read as a coherent set. Working candidate:
"Reveal answer and continue." Per the "Bans on surface require
rendering the consequence" rule in
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md),
the implementer renders the dropdown and confirms the three labels
read together before merging.

## Files to touch

Estimate of expected diff shape; implementation may revise
per the "Plan content is a mix of rules and estimates" rule in
[`docs/agents/planning/shared.md`](/docs/agents/planning/shared.md).

New:

- `supabase/migrations/<timestamp>_extend_game_events_feedback_mode_check.sql` —
  drops and recreates the CHECK constraint to include
  `instant_feedback_non_blocking`
- Optionally `apps/web/src/game/components/AnswerRevealPanel.tsx`
  — sibling to `CorrectAnswerPanel` for the revealed-incorrect
  case; only if the implementer chooses the two-component shape
- `tests/web/game/components/GameIntroPanel.test.tsx` — unit
  coverage for `modeDescription` rendering across all three
  `FeedbackMode` values (no test file exists for this component
  today; the new exhaustive branch warrants one)

Modify:

- `shared/game-config/types.ts` — extend `FeedbackMode` union
- `shared/game-config/draft-question-parsing.ts` — extend
  `expectFeedbackMode`
- `apps/web/src/game/gameSessionState.ts` — non-blocking submit
  branch; possible phase rename
- `apps/web/src/game/gameUtils.ts` — add the
  `getRevealedAnswerMessage` helper named in the reducer contract
  (explanation-first, sponsor-fact-never, with a labelled fallback)
- `apps/web/src/game/gameSessionSelectors.ts` — view-state field
  follow-through if the phase renames
- `apps/web/src/game/useGameSession.ts` — dispatcher branch on the
  new mode
- `apps/web/src/game/components/CorrectAnswerPanel.tsx` — extend
  for revealed-incorrect rendering, or keep as-is if a sibling
  component is added
- `apps/web/src/game/components/CurrentQuestionPanel.tsx` — only
  if the inline incorrect-feedback banner needs scoping more
  tightly to `_required`
- `apps/web/src/game/components/GameIntroPanel.tsx` — turn the
  two-way `modeDescription` branch into an exhaustive switch /
  mapping that names copy for the new mode
- `apps/web/src/game/components/GameCompletionPanel.tsx` — no
  code change expected; the positive-match expression at
  [`:74-75`](apps/web/src/game/components/GameCompletionPanel.tsx:74-75)
  already produces the right behavior for non-blocking mode
  (review stays hidden because the player saw reveals during
  play). Listed here for the reviewer's awareness so the
  expression's scope is not silently broadened during
  implementation
- `apps/web/src/pages/GamePage.tsx` — page-level render switch so
  the wrong-but-revealed panel is reachable (two-component shape)
  or `feedbackKind` flows through (one-component shape); see the
  page-level contract above
- `apps/web/src/admin/AdminEventDetailsForm.tsx` — add the
  dropdown option
- `tests/web/game/gameSessionState.test.ts` — non-blocking submit
  cases (correct stores answer; incorrect stores answer)
- `tests/web/game/gameUtils.test.ts` — `getRevealedAnswerMessage`
  cases (explanation present; explanation absent; multi-select
  fallback; sponsor-fact ignored)
- `tests/web/game/gameSessionSelectors.test.ts` — view-state for
  non-blocking
- `tests/web/game/useGameSession.test.ts` — dispatcher branch
- `tests/web/pages/GamePage.test.tsx` — page-level render
  coverage for non-blocking mode: correct-feedback case mounts
  `CorrectAnswerPanel`; incorrect-feedback case mounts the reveal
  variant (sibling component or extended panel) — assert against
  the rendered chip / heading / correct-answer-label so the
  assertion catches both two-component and one-component shapes
- `tests/web/game/components/GameCompletionPanel.test.tsx` —
  non-blocking-mode case asserts the answer-review section does
  not render (regression guard against the
  `final_score_reveal`-positive-match expression being broadened)
- `tests/web/admin/eventDetails.test.ts` — admin dropdown option
- `tests/shared/game-config/fixtures.ts`,
  `tests/shared/game-config/draft-content.test.ts`,
  `tests/shared/game-config/db-content.test.ts` — accept the third
  mode value
- `docs/experience.md` — flip the `instant_feedback_non_blocking`
  bullet from "optional later" to a landed mode in the
  three-mode list

Files intentionally not touched (estimate, not a ban):

- `supabase/functions/complete-game/**` — backend re-scores from
  trusted published content; no mode-specific code path
- `shared/events/published.ts`, `shared/game-config/db-content.ts`
  — typed via `FeedbackMode` alias; the type extension flows
  through automatically

## Validation Gate

- `npm run lint`, `npm run build:web`, `npm run build:site` green.
- `npm test` covers the new reducer/selector/dispatcher cases and
  the admin form option.
- Local Supabase stack: apply the new migration; confirm
  `game_events.feedback_mode = 'instant_feedback_non_blocking'`
  insert/update succeeds on a test row and rejects an unrelated
  string.
- Manual e2e in `dev:web`: configure a test event to
  `instant_feedback_non_blocking` and exercise the cases below.
  Before starting the run, the **pre-game intro panel** must
  render its non-blocking-mode copy (e.g., "See the answer right
  after each question"); falsifier here is the panel rendering
  the `final_score_reveal` fallback ("See your score after the
  last question"), which is what a forgotten three-way branch in
  `GameIntroPanel.tsx` would produce. After completing the run,
  the **completion panel** must **not** render the end-of-run
  answer-review section (the player has already seen each
  reveal); falsifier is the section appearing, which is what
  broadening the `final_score_reveal`-positive-match would
  produce. The test event must include at least one question
  with an `explanation` field, one without, and one multi-select
  question. Cases:
  - **(a) Correct answer with explanation present.** Submitting the
    right option shows the correct panel; the rendered body text
    is the question's `sponsorFact` if defined, else the
    `explanation`, else the generic correct-default copy
    (matching the existing `instant_feedback_required` rendering).
    A Continue button advances. Falsifier: the rendered body
    differs from the precedence order above, or no Continue
    affordance appears.
  - **(b) Wrong answer with explanation present.** Submitting a
    wrong option shows the reveal panel; the rendered body
    explicitly names the correct option label(s) **and** renders
    the question's `explanation`; the panel does **not** render
    `sponsorFact` even when one is defined on the question.
    Continue advances. Falsifier: the panel shows the user's
    selection as if correct, omits the correct-option label(s),
    inserts `sponsorFact`, or fails to advance.
  - **(c) Wrong answer with no `explanation` field.** Same as (b)
    but the body falls back to the generic "The correct answer
    is X" copy with the correct option label(s) interpolated. No
    sponsor copy appears. Falsifier: the panel renders an empty
    explanation slot, or the fallback copy omits the correct
    option label.
  - **(d) Multi-select question reveal.** A multi-select question's
    reveal renders the full correct option set, not a single
    label. Falsifier: only one correct option label appears, or
    the user's selection is conflated with the correct set.
  - End-of-run score equals the count of cases where the player
    actually submitted the correct option set, regardless of
    whether the reveal showed them the right answer afterward.
    Falsifier: score off-by-one against this count.
- Confirm by inspection that the two existing modes still behave
  as before (a `final_score_reveal` event still suppresses
  feedback until end; an `instant_feedback_required` event still
  blocks advance on incorrect).

## Self-Review Audits

By surface, drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- SQL migration: "Legacy-data precheck for constraint tightening"
  applied in reverse — this is a *widening* of the CHECK
  constraint, so all existing rows trivially satisfy the new
  predicate; the audit's protective check (no row violates the
  new rule) holds by construction. Note the direction in the
  migration prose.
- Frontend forms: "Dirty-state tracked-inputs" against the admin
  Feedback Mode dropdown — confirm the new option participates
  in dirty-state tracking the same way the existing two do (the
  field already does, this is a no-op confirmation, but worth
  walking).
- Frontend forms: "Unchanged-vs-explicit-write" against the admin
  save path — confirm switching an event to or from the new mode
  writes through.

## Documentation Currency

[docs/experience.md:319-323](docs/experience.md:319-323) currently
lists three modes with `instant_feedback_non_blocking` flagged as
"optional later." This PR removes the "optional later" qualifier
and presents all three modes as supported. Other docs that
mention the two existing modes by name
([docs/architecture.md](docs/architecture.md),
[docs/testing.md](docs/testing.md),
[docs/tracking/analytics-strategy.md](docs/tracking/analytics-strategy.md))
are read at PR time and updated only if they bind to the
two-mode set as a closed enumeration; passing references that
quote the existing values without claiming exhaustiveness do
not need touching.

## Out of Scope

- Per-question feedback-mode override (mode stays per-event).
- Letting the player retry after the reveal (the reveal is the
  resolution; retry would dilute it). If product wants a hybrid
  later, that's a fourth mode, not a switch on this one.
- Migrating any existing event to the new mode (mode selection is
  an authoring choice; existing events keep their current mode).
- Analytics on which questions trip players up in non-blocking
  mode. Per-question correctness is already in `submitted_answers`
  via the trusted server-side score path, so a future analytics
  surface can be built without changing this plan's scope.
- Backend changes to `complete-game` (none needed; `scoreAnswers`
  re-derives from trusted published content).

## Risk Register

- **Phase-rename churn.** If the implementer renames
  `correct_feedback` to `answer_revealed` (or similar) for
  accuracy, the rename touches the reducer, selectors, view-state
  field name, and several test files. Mitigation: keep the rename
  as a single commit so the diff is self-contained, and update
  references in lockstep.
- **Multi-select reveal copy.** The wrong-but-revealed panel for
  a multi-select question must render "the answers are X and Y"
  legibly when the correct set has multiple options. Mitigation:
  the validation-gate manual e2e step (d) above includes the
  multi-select case; if the rendered copy reads awkwardly, polish
  in the same PR.
- **Admin dropdown labels reading as a coherent triple.** Adding
  a third option may make the existing two labels read less
  clearly by contrast. Mitigation: the
  rendering-the-consequence step in the admin Authoring UI
  contract; if a relabel of the existing two is warranted, do it
  in this PR.

## Related Docs

- [`docs/experience.md`](/docs/experience.md) — three-mode product
  framing this plan lands the third leg of
- [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
  — cross-cutting-plan layout convention this doc follows
- [`shared/game-config/types.ts`](/shared/game-config/types.ts) —
  `FeedbackMode` union, `Question` shape with `explanation`
- [`apps/web/src/game/gameSessionState.ts`](/apps/web/src/game/gameSessionState.ts)
  — reducer the non-blocking branch lands in
- [`supabase/migrations/20260406130000_add_published_quiz_content.sql`](/supabase/migrations/20260406130000_add_published_quiz_content.sql)
  — original `quiz_events_feedback_mode_check` predicate
- [`supabase/migrations/20260418000000_rename_database_terminology_to_game.sql`](/supabase/migrations/20260418000000_rename_database_terminology_to_game.sql)
  — quiz→game terminology rename, including the constraint's
  current name `game_events_feedback_mode_check`
