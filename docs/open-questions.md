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
[Release-Blocking Open Questions in `release-readiness.md`](./release-readiness.md#release-blocking-open-questions).
Do not duplicate the question body there; mirror the title and link back to
this file.

## Product And Live Event Operation

- Should live event QR codes always route directly to event/game entry surfaces
  while `/` becomes a marketing page post-MVP?
  Current behavior is `/` preview plus `/game/:slug` attendee route; long-term
  URL contract is not finalized.
  Preferred direction: evolve toward an event landing model where
  `/event/:slug` is the event entry surface and gameplay lives on
  `/event/:slug/game`.

## Authoring And Publishing

No currently open questions in this section under the current tracking rule.
Authoring/publishing follow-up work is already represented as direct backlog
items and should be tracked there rather than duplicated here.

## Reporting And Sponsor Measurement

No currently open questions in this section under the current tracking rule.
Recommended first metrics and sponsor-proof baseline are documented in
[`analytics-strategy.md`](./analytics-strategy.md), and implementation priority
is tracked in [`backlog.md`](./backlog.md).

## Development And Release Workflow

- What is the phased path from current local-validation-plus-direct-production
  releases to a safer continuous deployment model?
  Ownership and planning now live in
  [`continuous-deployment-plan.md`](./continuous-deployment-plan.md), including
  beta/gamma targets, staged database strategy, and compatibility guardrails.
- The supported full-browser UI-review path for backend-backed preview
  environments is now documented in [`dev.md`](./dev.md) (local app +
  Playwright capture, preferring configured remote Supabase for full trust-path
  browser review).

## Trust Boundary And Abuse Controls

- Is browser-session dedupe enough once the product is used at real events, or
  will live usage require person-level or device-level abuse controls?
  The current MVP intentionally uses a lighter no-login trust boundary and does
  not yet answer how much stronger it needs to become.
  Follow-up direction: maintain a dedicated security notes doc that tracks
  abuse/threat scenarios against both system integrity and game integrity.
