# Open Questions

## Purpose

This file tracks unresolved decisions that materially affect product, UX,
architecture, operations, or contributor workflow.

Use it when:

- a doc would otherwise be forced to guess
- the code clearly supports groundwork but not the final decision
- a reviewer or future contributor needs to know which questions are still open

If a question is answered in code, docs, or platform setup, update or remove it
here in the same change.

When a quality check pass runs against an upcoming release, the subset of these
items that blocks the current release target is mirrored under
[Release-Blocking Open Questions in `release-readiness.md`](/docs/plans/release-readiness.md#release-blocking-open-questions).
Do not duplicate the question body there; mirror the title and link back to
this file.

## Product And Live Event Operation

No currently open questions in this section under the current tracking rule.
Product/live-event follow-up direction is represented as direct backlog items,
including the event landing route model, and should be tracked there.

## Authoring And Publishing

No currently open questions in this section under the current tracking rule.
Post-MVP authoring ownership resolved in M2 (organizer RLS broadening +
authoring Edge Functions accept organizer callers); see
[`event-platform-epic.md`](/docs/plans/event-platform-epic.md) "Open Questions
Resolved By This Epic" and the M2 milestone doc
[`m2-admin-restructuring.md`](/docs/plans/archive/m2/m2-admin-restructuring.md). Outstanding
authoring follow-up work is tracked in [`backlog.md`](/docs/backlog.md).

## Reporting And Sponsor Measurement

No currently open questions in this section under the current tracking rule.
Recommended first metrics and sponsor-proof baseline are documented in
[`analytics-strategy.md`](/docs/plans/analytics-strategy.md), and implementation priority
is tracked in [`backlog.md`](/docs/backlog.md).

## Development And Release Workflow

No currently open questions in this section under the current tracking rule.
Workflow direction and remaining implementation are tracked in
[`continuous-deployment-plan.md`](/docs/plans/continuous-deployment-plan.md),
[`dev.md`](/docs/dev.md), and [`backlog.md`](/docs/backlog.md).

## Trust Boundary And Abuse Controls

No currently open questions in this section under the current tracking rule.
Trust-boundary and abuse-control planning now lives in
[`security-and-abuse-plan.md`](/docs/plans/security-and-abuse-plan.md), and concrete
hardening work should be tracked via [`backlog.md`](/docs/backlog.md).

## Event Platform Epic — Phase 0.3 Verification

Surfaced by [`framework-decision.md`](/docs/plans/framework-decision.md) (Event
Platform Epic, M0 phase 0.2). Each item is a hypothesis from the
documentation that M0 phase 0.3 must verify on the production domain
before subsequent milestones depend on it.

### Cookie boundary across path-routed Vercel projects

Vercel's knowledge base does not document cookie behavior across multi-
project rewrites under one domain. Web-platform fundamentals say a
cookie set on `example.com/` (path=`/`) is sent to every request under
that domain regardless of which Vercel project handles a path, but the
interaction with Vercel's rewrite/Microfrontends header rewriting is
unverified. Phase 0.3 verifies end-to-end that a session cookie set in
`apps/web` is readable by `apps/site` on the production domain.

### Cross-app token-refresh visibility

`apps/web` (Vite SPA) refreshes Supabase JWTs via the browser-side
`@supabase/supabase-js` auto-refresh, with no server middleware.
`apps/site` (Next.js) refreshes JWTs via a `@supabase/ssr` Next.js
middleware that runs on every request to `apps/site`. Each refresh path
writes the auth cookie independently. The risk is that one app's
refresh is not observable by the other on the next cross-app
navigation — for example, a token refreshed by `apps/site`'s
middleware is not picked up by the next `apps/web` browser request, or
vice versa. Phase 0.3 verifies end-to-end that a token refreshed in
either app is observable by a subsequent server-rendered or
browser-side read in the other app.

### Streaming-metadata behavior for HTML-limited bots

Next.js auto-detects `facebookexternalhit` and similar HTML-limited bots
and serves them full `<head>` metadata at the cost of TTFB. The
behavioral envelope (which bots, which fields) is not exhaustively
documented. M3 phase 3.1 validates against at least one real unfurl
client (per [m3-site-rendering.md](/docs/plans/m3-site-rendering.md);
the original 4-phase epic estimate placed unfurl validation in a
since-superseded phase 3.4).

### Proxy-rewrite project vs. Vercel Microfrontends

Two documented routing models for path-routed multi-project deploys
under one domain. The proxy-rewrite path is lower-cost and simpler; the
Microfrontends path adds CDN-level routing observability and per-project
deploy independence (with dedicated pricing). M0 phase 0.3 chooses
between them based on routing-feature needs surfaced during the
scaffold, and updates [`docs/operations.md`](/docs/operations.md) with the
chosen topology.

## Demo Expansion Epic — M3 Demo-Mode Data Access

Surfaced by [`demo-expansion/epic.md`](/docs/plans/epics/demo-expansion/epic.md)
"Open Questions Newly Opened" and canonically framed by
[`demo-expansion/m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
"Cross-Phase Decisions → Deferred to phase-time." Phase 3.1 of M3
owns the resolution.

### Demo-mode data-access semantics for test-event slugs

The demo-mode auth bypass M3 lands on the test-event slugs
(`harvest-block-party`, `riverside-jam`) removes the page-level
`SignInForm` interception, but the bypassed surfaces' data fetches
(admin's `loadDraftEvent` against `game_event_drafts`, redemptions'
list query against `game_entitlements`) are RLS-gated and currently
deny anonymous reads. Phase 3.1 settles which of three options
governs reads and writes: read-only browse, functional with
persistence and reset, or sandbox-ephemeral. The decision cascades
into M3's implementation phase shape, the read-mediation pattern
(anon-RLS broadening scoped by allowlist, Edge Function read shim,
pre-published public views, or another), and M4's seeded-codes /
reset-story design. Phase 3.1's PR records the chosen semantics,
rationale, and rejected alternatives in its plan doc, and removes
this entry from `open-questions.md` in the same PR.
