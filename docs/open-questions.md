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
[Release-Blocking Open Questions in `release-readiness.md`](./plans/release-readiness.md#release-blocking-open-questions).
Do not duplicate the question body there; mirror the title and link back to
this file.

## Product And Live Event Operation

No currently open questions in this section under the current tracking rule.
Product/live-event follow-up direction is represented as direct backlog items,
including the event landing route model, and should be tracked there.

## Authoring And Publishing

### Post-MVP authoring ownership and permission management

We do not yet have a clear enough post-MVP product direction to choose the
right permission-management model for event authoring and staffing.

Open decision:

- should the product become self-serve, where a new user can sign up, create
  their own event, become its organizer, and later manage event-scoped roles
  such as agents?
- or should event setup remain a managed workflow, where a root admin creates
  the initial event and assigns organizer access manually?

Current operating assumption until that direction is clearer:

- event creation and initial organizer assignment remain manual/root-admin-led
- there is no self-serve account or event creation flow yet
- organizer-managed agent assignment UX is explicitly deferred from the current
  milestone
- current schema and API work should avoid assuming only root admins can ever
  manage agents, so a later organizer-managed path remains available

Revisit this after the post-MVP operating model and go-to-market direction are
clearer. Execution priority is tracked in [`backlog.md`](./backlog.md).

## Reporting And Sponsor Measurement

No currently open questions in this section under the current tracking rule.
Recommended first metrics and sponsor-proof baseline are documented in
[`analytics-strategy.md`](./plans/analytics-strategy.md), and implementation priority
is tracked in [`backlog.md`](./backlog.md).

## Development And Release Workflow

No currently open questions in this section under the current tracking rule.
Workflow direction and remaining implementation are tracked in
[`continuous-deployment-plan.md`](./plans/continuous-deployment-plan.md),
[`dev.md`](./dev.md), and [`backlog.md`](./backlog.md).

## Trust Boundary And Abuse Controls

No currently open questions in this section under the current tracking rule.
Trust-boundary and abuse-control planning now lives in
[`security-and-abuse-plan.md`](./plans/security-and-abuse-plan.md), and concrete
hardening work should be tracked via [`backlog.md`](./backlog.md).

## Event Platform Epic — Phase 0.3 Verification

Surfaced by [`framework-decision.md`](./plans/framework-decision.md) (Event
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

### Supabase Proxy interaction with Vercel rewrites

If the Vercel-level rewrite happens before the Next.js Proxy (middleware)
runs, the Proxy's cookie-refresh behavior on `apps/web` paths may not be
observable from `apps/site` reads. Phase 0.3 verifies that token refresh
in `apps/web` is reflected in `apps/site` server-rendered responses.

### Streaming-metadata behavior for HTML-limited bots

Next.js auto-detects `facebookexternalhit` and similar HTML-limited bots
and serves them full `<head>` metadata at the cost of TTFB. The
behavioral envelope (which bots, which fields) is not exhaustively
documented. M3 phase 3.4 validates against at least one real unfurl
client.

### Proxy-rewrite project vs. Vercel Microfrontends

Two documented routing models for path-routed multi-project deploys
under one domain. The proxy-rewrite path is lower-cost and simpler; the
Microfrontends path adds CDN-level routing observability and per-project
deploy independence (with dedicated pricing). M0 phase 0.3 chooses
between them based on routing-feature needs surfaced during the
scaffold, and updates [`docs/operations.md`](./operations.md) with the
chosen topology.
