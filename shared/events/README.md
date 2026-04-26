# `shared/events/`

Shared event-domain reads, admin writes, and projection types live here.

This module owns remote Supabase event operations that must be reusable by both
frontend apps: public published-content reads, admin draft/status reads,
authenticated authoring function calls, and the types those flows return.

It deliberately does not own environment access, browser singleton lifecycle,
prototype fallback behavior, route building, or fixture lookup. Each app calls
`configureSharedEvents` once at startup with its env-derived providers before
using any exported event API.

The extraction landed through
[`docs/plans/shared-events-foundation.md`](../../docs/plans/shared-events-foundation.md).
