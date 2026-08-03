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

The extraction landed through
[`docs/plans/archive/m1/shared-events-foundation.md`](/docs/plans/archive/m1/shared-events-foundation.md).
