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
it means whatever that id means the next time content is published. Every rule
below follows from that one fact.

**An id is an identity, and identities are never re-issued.** This holds at
both levels. Rewording keeps the existing id — the point of the scheme is that
wording can change freely. Replacing the thing itself mints an id that has
never been used on that event before. The test is one sentence: does a stored
answer from before the edit still mean what it meant? If yes, keep the id; if
no, the old id must be retired rather than reassigned.

Reassignment is the failure this prevents, and it is silent. `getOptionLabels`
resolves stored ids against whatever options exist now and drops the misses,
and the answer review resolves `answers[question.id]` before it resolves any
option. So an id handed to new content reads an old attendee's answer against
it and renders a confident wrong sentence, where a retired id would simply
fail to resolve and show nothing.

**Option ids are bare letters** — `a`, `b`, `c`, `d`, scoped per question by
the `(event_id, question_id, id)` primary key on `game_question_options`.
Option wording is the most-edited content here, and a *descriptive* id starts
lying the first time its label is reworded, silently, because the screen
renders the label. Carrying no description is not the same as carrying no
identity: after a semantic replacement the next letter is `e`, not the freed
`b`. Authored order is not display order — `shuffleGameOptions` permutes per
attempt and grading is id-based end to end.

Note one gap this rule cannot close on its own. Both of the admin editor's id
generators pick the lowest *currently unused* identifier — `createOptionId` a
letter, `createQuestionId` a `q{n}` — so deleting either a question or an
option and adding a replacement through the UI re-issues the freed id. The two
compound: a re-issued question id now meets option ids guaranteed to collide
with it, because every question's options are letters. The rule binds
seed-module authoring; the UI can still violate it, tracked in
[`docs/backlog.md`](/docs/backlog.md).

**Question ids are readable slugs** naming what the question asks, never what
its answer is.

**Adopting the scheme on an existing event is a one-time migration**, not an
application of the rule. Every stored answer for that event stops resolving at
once, because the ids it names no longer exist. That is acceptable only while
no attendee holds a completion snapshot worth preserving — before an event's
first night, or between seasons. Events published before the rule otherwise
keep their existing ids, which anchor real completion rows a rename would
silently reinterpret.

[`madrona-quiz-copy.md`](./madrona-quiz-copy.md) is the
editorial record for Madrona's question copy: the prompts, options,
explanations, and source lines as authored, plus what each source supports and
where two of them disagree. It exists because the seed module can say what the
copy is but not why a claim is worded the way it is, and the sources only earn
their place if the reasoning behind them is recoverable. It is not loaded by
anything and does not publish — `madrona-demo-game-content.ts` is what ships,
and wins if the two ever drift.

The extraction landed through
[`docs/plans/archive/m1/shared-events-foundation.md`](/docs/plans/archive/m1/shared-events-foundation.md).
