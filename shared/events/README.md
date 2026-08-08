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
