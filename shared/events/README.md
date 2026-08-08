# `shared/events/`

Shared event-domain reads, admin writes, and projection types live here.

This module owns remote Supabase event operations that must be reusable by both
frontend apps: public published-content reads, admin draft/status reads,
authenticated authoring function calls, and the types those flows return.

It deliberately does not own environment access, browser singleton lifecycle,
prototype fallback behavior, route building, or fixture lookup. Each app calls
`configureSharedEvents` once at startup with its env-derived providers before
using any exported event API.

A few small per-event constant modules also live here and are imported
directly (not through the configured provider surface): the demo-mode
test-event allowlist ([`testEventAllowlist.ts`](./testEventAllowlist.ts)),
seedable demo game content, and the completion-screen CTA registry
([`completionCta.ts`](./completionCta.ts)).

## Question and option identifiers

`game_completions.submitted_answers` stores question and option ids and no
labels, so an id is the only surviving record of what an attendee picked, and
it means whatever that id means the next time content is published. Seed
content follows two rules that point opposite ways for that reason.

**Option ids describe nothing** — bare letters (`a`, `b`, `c`, `d`), scoped per
question by the `(event_id, question_id, id)` primary key on
`game_question_options`. Option wording is the most-edited content here, and a
descriptive id starts lying the first time its label is reworded, silently,
because the screen renders the label. Bare letters are also what the admin
editor's `createOptionId` generates, so seed modules and admin-authored drafts
converge rather than drift. Authored order is not display order:
`shuffleGameOptions` permutes per attempt and grading is id-based end to end.

**Question ids describe the question, and are never reused** — a readable slug
naming what the question asks, never what its answer is. Replacing a question
mints a new slug; rewording a prompt keeps the existing one. The test is
whether a stored answer from before the edit still means what it meant. This
matters because the answer review resolves `answers[question.id]` before it
resolves any option, so a reused question id reads the old question's stored
answer against the new question's options and renders a confident wrong
sentence instead of failing visibly.

Both bind new and replaced content. Events published before the rule keep their
existing ids, which anchor real completion rows a rename would silently
reinterpret.

[`madrona-quiz-revision-2-copy.md`](./madrona-quiz-revision-2-copy.md) is the
editorial record for Madrona's question copy: the prompts, options,
explanations, and source lines as authored, plus what each source supports and
where two of them disagree. It exists because the seed module can say what the
copy is but not why a claim is worded the way it is, and the sources only earn
their place if the reasoning behind them is recoverable. It is not loaded by
anything and does not publish — `madrona-demo-game-content.ts` is what ships,
and wins if the two ever drift.

The extraction landed through
[`docs/plans/archive/m1/shared-events-foundation.md`](/docs/plans/archive/m1/shared-events-foundation.md).
