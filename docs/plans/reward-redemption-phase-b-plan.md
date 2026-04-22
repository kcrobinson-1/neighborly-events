# Reward Redemption — Phase B Overview Plan

**Status:** Proposed — not started. This is a phase overview that names
the sub-phase boundaries and the prerequisites each sub-phase inherits.
Full execution plans for each sub-phase are drafted separately, close to
their implementation time, following the Phase A precedent
([A.1](./archive/reward-redemption-phase-a-1-plan.md),
[A.2a](./archive/reward-redemption-phase-a-2-plan.md),
[A.2b](./archive/reward-redemption-phase-a-2b-plan.md)).
**Parent design:** [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md)
**Predecessor:** [`reward-redemption-phase-a-2b-plan.md`](./archive/reward-redemption-phase-a-2b-plan.md)
— landed; the trusted backend endpoints (`redeem-entitlement`,
`reverse-entitlement-redemption`, `get-redemption-status`) are callable.
**Scope:** Phase B only — the mobile operator UI for the redemption MVP.
Phase C (attendee completion-screen polling) and Phase D (role seeding
plus volunteer dry run) remain separate phases.

## Why Phase B Exists

A.2b landed the trusted HTTP surface for redeem, reverse, and attendee
status reads, but nothing in the frontend yet consumes it. Phase B adds
the two operator-facing routes called out in the parent design:

- `/event/:slug/redeem` — fast 4-digit code entry and redeem action for
  event-scoped **agents**
- `/event/:slug/redemptions` — mobile monitoring and dispute-resolution
  list for event-scoped **organizers** (plus agents in read-only mode if
  that falls out of the implementation naturally) and root admins

These routes deploy inert at first: no nav entry, no `/admin` link, no
role seeding. They become usable only after Phase D seeds the event's
agent and organizer assignments through the reviewed
[`supabase/role-management/`](../../supabase/role-management/README.md)
runbook.

## Why Phase B Splits Into Two Sub-Phases

`/event/:slug/redeem` and `/event/:slug/redemptions` share no UI surface
beyond the sign-in shell and the event-context header. Their UX
priorities diverge:

- **B.1 (redeem)** is a rapid-entry tool. The design doc locks a
  split-screen layout with a persistent numeric keypad, a minimal
  status/result card, and a single-dominant-action flow. Review attention
  should focus on keypad behavior, 4-digit validation, result-state
  handling, and network-error recovery under live-event pressure.
- **B.2 (monitoring)** is a dispute-resolution surface. It adds sticky
  filters, suffix search, paginated list loading, a bottom-sheet detail
  view, and a reversal confirmation flow with optional reason entry.
  Review attention should focus on list pagination, filter state
  preservation, reversal authorization UX, and the audit-trail copy.

Merging these into one PR would dilute both reviews. Splitting them
mirrors the A.2a/A.2b seam (one validation runner per PR, one dominant
behavior per PR) and keeps either sub-phase shippable and reviewable on
its own.

## Sub-Phase Summary

| Sub-phase | Route | Primary users | Primary actions | Detail plan |
|-----------|-------|---------------|-----------------|-------------|
| **B.1** | `/event/:slug/redeem` | agents (+ root admin) | lookup, redeem | drafted before B.1 implementation as `reward-redemption-phase-b-1-plan.md` |
| **B.2** | `/event/:slug/redemptions` | organizers (+ root admin) | list, filter, search, view, reverse | drafted before B.2 implementation as `reward-redemption-phase-b-2-plan.md` |

## Prerequisites

Phase B does not start until all three prerequisites are in `main`:

1. **[Auth sign-in generalization](./auth-signin-generalization-plan.md).**
   B.1 and B.2 both sign users in through a role-neutral shell rather
   than the admin-labelled form. Landing the generalization first keeps
   B.1's diff focused on redemption UX and B.2's diff focused on
   monitoring UX rather than auth plumbing.
2. **[A.2b](./archive/reward-redemption-phase-a-2b-plan.md).** *Landed.* The
   three Edge Functions and `shared/redemption.ts` contracts are in
   place. B.1 and B.2 consume them unchanged. Any discovered need to
   evolve the HTTP contract is a stop-and-report moment that reopens the
   A.2b boundary rather than widening Phase B.
3. **Event-code prerequisite.** *Landed.* `game_events.event_code` and
   the per-event `UNIQUE (event_id, verification_code)` constraint are
   in place (migrations `20260418030000`–`20260418070000`), so B.1 can
   rely on single-column suffix lookup in the locked event scope and
   B.2 can trust that `event_code` is already populated for every event.

## Sub-Phase Scope Boundaries

### B.1 — `/event/:slug/redeem`

In scope:

- Event-scoped route wiring and sign-in gate via the generalized
  `SignInForm` with redemption-specific copy.
- Role check: `is_agent_for_event(slug)` (or root admin). Users who
  sign in without the role see a "not authorized for this event" state,
  not a bounce to `/admin`.
- Mobile split-screen layout: top half = event-context badge + 4-digit
  preview + result card; bottom half = persistent numeric keypad with
  clear/backspace/submit.
- Input normalization matching the design doc: trim, `^\d{4}$`
  enforcement client-side and server-side (server-side already enforced
  by `redeem-entitlement`).
- `redeem-entitlement` invocation with the three view states from
  §"UX philosophy for `/event/:slug/redeem`": before/ready,
  success (redeemed / already redeemed), rejected (not found /
  not authorized / network).
- "Redeem Next Code" next-step CTA on success; explicit "Try again" /
  "Clear" on failure.

Out of scope for B.1:

- Monitoring list, filters, search, detail sheet, reversal — all B.2.
- Attendee completion-screen polling — Phase C.
- Role seeding, runbook execution — Phase D.
- Any realtime subscription, offline queue, or multi-event picker.
- Any admin-nav link pointing at the route.

Open items the B.1 detail plan must settle before implementation:

- Exact keypad SCSS token reuse vs. new tokens (prefer existing tokens
  per [`AGENTS.md`](../../AGENTS.md) § Styling Token Discipline).
- Whether the "not authorized for this event" state reuses the existing
  admin "access denied" copy pattern or introduces a redemption-specific
  variant.
- Whether B.1 introduces a Playwright mobile-viewport smoke covering
  lookup + redeem, or defers smoke to a single Phase B combined suite.
- Whether B.1 ships a focused Vitest file for keypad state or relies on
  Playwright + component review.

### B.2 — `/event/:slug/redemptions`

In scope:

- Event-scoped route wiring and sign-in gate, same generalized shell.
- Role check: `is_organizer_for_event(slug)` (or root admin) for the
  reversal path; read access may also extend to agents if the detail
  plan decides that serves dispute handling without weakening the
  reversal gate.
- Mobile information architecture from the design doc: locked event
  context, sticky search/filter bar, default newest-first sort,
  bottom-sheet detail view.
- Filter chips: `Last 15m`, `Redeemed`, `Reversed`, `By me`.
- Bounded single fetch of the most recent N records per event
  (default `N = 500` per design doc §5); client-side filtering and
  suffix search operate against that cached slice.
- Reversal flow inside the detail bottom sheet: confirmation step with
  code + event + prior status summary, optional reason input,
  invocation of `reverse-entitlement-redemption`, post-action refetch.
- Error handling per design doc §8: non-dismissive inline banner with
  `Retry`, one automatic retry with ~2s backoff, offline banner via
  `navigator.onLine`, "last updated at" freshness timestamp in the
  monitoring header.

Out of scope for B.2:

- Cursor/keyset pagination — named as a post-MVP upgrade path in the
  design doc §5. B.2 ships the bounded-N fetch with the
  "showing most recent N" affordance.
- Cross-device cache invalidation or shared client cache with B.1.
- Realtime subscriptions; monitoring remains operator-driven refresh.
- Attendee-facing surfaces.

Open items the B.2 detail plan must settle before implementation:

- Default value of `N` after confirming it against the anticipated
  pilot-event volume (design doc §5 states `N = 500` as a tunable
  default subject to validation before first use).
- Exact reversal confirmation copy and whether the reason input ships
  as a textarea or single-line input for MVP.
- Whether agents see `/event/:slug/redemptions` at all in MVP
  (read-only) or whether only organizers and root admins reach it.
- Whether B.2 ships its own Playwright monitoring smoke, extends B.1's
  suite, or defers to a combined Phase B smoke run.
- Whether the "By me" filter resolves against the Supabase Auth
  `user.id` client-side, and what happens when `redeemed_by` is null
  for rows created by a root admin.

## Shared Concerns Across B.1 And B.2

The following concerns should land identically across both sub-phases
so each sub-phase plan can inherit them rather than re-deciding:

- **Sign-in shell.** Both routes consume the generalized `SignInForm`
  from [`auth-signin-generalization-plan.md`](./auth-signin-generalization-plan.md)
  with redemption-specific copy ("Sign in to redeem codes" / "Sign in
  to review redemptions"). Magic-link return always lands on
  `/auth/callback?next=...`, which validates the `next` path through
  `validateNextPath` and client-routes to the requesting route. Each
  Phase B sub-phase extends `AppPath` in
  [`apps/web/src/routes.ts`](../../apps/web/src/routes.ts) with its
  new route literal, adds the route matcher to `validateNextPath`'s
  allow-list, and adds positive-case Vitest assertions for the new
  route. `AuthNextPath`'s `Exclude` narrowing is automatic, so
  sub-phases do not maintain a parallel destination type. No Supabase
  Auth dashboard change is required.
- **Role-gate rendering.** Authenticated-but-unassigned callers see a
  role-gate state in-place, not a redirect. The state copy does not
  disclose whether the event exists, matching the design doc §6
  non-leakage policy.
- **Event-context header.** Both routes render a locked event badge
  derived from `game_events` for the URL slug. The acronym prefix
  (`event_code`) is shown, never user-entered.
- **Transport.** Both routes call the A.2b Edge Functions unchanged.
  The request body shapes and response envelopes come from
  [`shared/redemption.ts`](../../shared/redemption.ts); no new shared
  contract module is introduced.
- **Error surfacing.** All user-initiated mutations use inline banners
  with a `Retry` action. No `void promise` chains. The
  `Error-surfacing for user-initiated mutations` self-review audit
  applies to both sub-phase diffs.
- **Styling tokens.** Prefer existing tokens from
  [`apps/web/src/styles/_tokens.scss`](../../apps/web/src/styles/_tokens.scss).
  Introduce new tokens only when a value is reused across both B.1 and
  B.2 (e.g., result-card surfaces, status-badge palettes). Token
  introductions should be explicit in the relevant sub-phase plan.

## Out Of Scope For Phase B Entirely

- Attendee completion-screen polling and `Refresh status` affordance —
  Phase C consumes the session-bound `get-redemption-status` endpoint.
- Role seeding through the runbook — Phase D, per design doc §10 step 7.
- Volunteer dry run — Phase D, per design doc §10 step 8.
- Any realtime subscription path. Design doc §"Attendee Status Update
  Strategy" locks polling for MVP.
- Any role-management UI. Design doc §"MVP role-management decision"
  locks direct SQL inserts via the runbook.
- Event-scoped analytics or reporting. Tracked separately under
  [`docs/plans/analytics-strategy.md`](./analytics-strategy.md).

## Rollout Sequence At The Phase Level

1. **Land the auth generalization.** Merge
   [`auth-signin-generalization-plan.md`](./auth-signin-generalization-plan.md)
   to `main`. Confirm `/admin` behavior unchanged in production smoke.
2. **Draft the B.1 detail plan.** Write
   `reward-redemption-phase-b-1-plan.md` with a locked target shape,
   rollout sequence, tests, self-review audits, and open-items
   resolution, following the A.2b plan template.
3. **Implement B.1.** Land `/event/:slug/redeem` behind an unadvertised
   entry (no nav link). Validate per the B.1 plan's stated commands.
4. **Draft the B.2 detail plan.** Same template, scoped to monitoring
   and reversal.
5. **Implement B.2.** Land `/event/:slug/redemptions` behind an
   unadvertised entry.
6. **Update `docs/backlog.md` and `docs/architecture.md`** as each
   sub-phase lands, per
   [`AGENTS.md`](../../AGENTS.md) § "Doc Currency Is a PR Gate".
7. **Hand off to Phase C.** Phase B does not block Phase C; the
   attendee status endpoint is already live and Phase C can run in
   parallel with B.2 if operator scheduling allows.

Phase B does not implement Phase D. Role seeding and the volunteer dry
run wait for both B.1 and B.2 to land so the dry-run script can exercise
the full operator surface.

## Deployment Gates At The Phase Level

Each sub-phase inherits the design doc §10 step 6 gate:

- `npm run lint`, `npm run build:web`, `npm test` pass.
- A mobile-viewport Playwright smoke exercises the sub-phase's
  dominant flow against local Supabase + local Edge Functions with
  seeded agent/organizer fixtures. Whether B.1 and B.2 each own a smoke
  file or whether the two share one file is a sub-phase-plan decision.
- No new Edge Function, migration, or RPC lands under Phase B. If a
  need appears, stop and reopen the A.2a/A.2b boundary instead of
  folding SQL or HTTP contract changes into Phase B silently.

## Self-Review Audits At The Phase Level

Each sub-phase plan names the audits its diff triggers. At minimum the
phase anticipates:

- **Frontend/browser surface.**
  `Error-surfacing for user-initiated mutations` applies to every
  mutation path in both sub-phases.
- **Frontend/browser surface.** `Dirty-state tracked-inputs audit`
  applies to the B.2 reversal form if it carries multi-field state.
- **CI / validation surface.** `Readiness-gate truthfulness audit`
  applies if a sub-phase adds a new smoke helper, doctor probe, or
  readiness check.
- **SQL surface sentinel.** `Grant/body contract audit` and
  `Legacy-data precheck for constraint tightening` apply only if a
  sub-phase unexpectedly touches SQL; that scope drift should stop the
  sub-phase and reopen A.2a rather than proceed.

## Risks And Mitigations

- **Phase B surfaces a missing HTTP contract.** If B.1 or B.2
  discovers the A.2b envelope cannot support a required UX state (for
  example, a distinct "offline" response vs. a generic 5xx), the
  correct action is to stop and reopen A.2b, not widen Phase B. The
  sub-phase plans state this explicitly.
- **Role seeding readiness surprise.** If operators expect the routes
  to work immediately after Phase B merges, they will see a role-gate
  state. Mitigation: the Phase D runbook is the canonical path, and
  neither sub-phase advertises the route in nav.
- **Auth plumbing creep.** Without the generalization phase landing
  first, Phase B diffs would mix auth rename work with redemption UX.
  Mitigation: the auth generalization is an explicit prerequisite.
- **Styling-token drift.** Introducing many redemption-specific tokens
  inside Phase B risks cross-sub-phase collision. Mitigation: tokens
  shared across B.1 and B.2 land in the sub-phase that needs them
  first, and the second sub-phase reuses rather than re-defines.
- **Cross-event leakage copy.** The design doc §6 non-leakage policy is
  easy to accidentally regress in the rejected-state copy. Mitigation:
  every rejected-state string is explicitly reviewed against the
  non-leakage contract during the sub-phase code-review feedback loop.

## Rollback Strategy

Phase B is frontend-only. Rollback per sub-phase is a revert of that
sub-phase's PR; no database, Edge Function, or migration state needs
reversing. The unadvertised-entry deployment posture means a rollback
does not strand any user flow: users who were never nav-linked to the
routes see nothing change.

If a rollback leaves dangling generalized auth primitives without a
consumer, that is still acceptable — the admin shell remains a valid
consumer of `SignInForm`, `useAuthSession`, and `authApi`. The
generalization stays useful on its own.

## Resolved Decisions

- **Phase B ships as two sub-phases: B.1 redeem and B.2 monitoring.**
  Confirmed above.
- **Prerequisite ordering.** Auth generalization lands first; A.2b is
  already landed; event-code prerequisite is already landed. No other
  prerequisite work gates Phase B.
- **Role-gate UX.** Authenticated-but-unassigned callers see an
  in-place state that does not leak event existence. Redirecting to
  `/admin` is explicitly rejected.
- **Single vs. shared cache.** B.1 holds no lookup cache between codes;
  B.2 refetches on explicit user action plus post-mutation. Cross-route
  cache sharing is not introduced in Phase B (design doc §8).
- **Unadvertised deployment.** Both routes deploy without nav linkage
  until role seeding in Phase D.

## Open Questions For The Sub-Phase Plans

These questions are **not** resolved at the Phase B overview level.
Each sub-phase plan is expected to resolve its own:

- Whether agents read `/event/:slug/redemptions` in MVP (B.2).
- Final `N` for the bounded monitoring fetch (B.2).
- Smoke-test partitioning: per-sub-phase vs. combined Phase B (both).
- Whether B.1 introduces focused Vitest for keypad state (B.1).
- Reversal reason input shape (single line vs. textarea) (B.2).
- Shared token additions vs. sub-phase-local styles (both).

If any of these turns into a design-boundary change (for example,
agents gaining write access in B.2), stop and reopen the parent design
doc rather than deciding inside the sub-phase plan.

## Handoff After Phase B

- `/event/:slug/redeem` and `/event/:slug/redemptions` render correctly
  for authorized callers on a mobile viewport.
- The unadvertised-entry posture means the product surface is
  unchanged for attendees and admins until Phase D seeds roles.
- Phase C can ship the attendee polling surface at any time; it has no
  blocking dependency on Phase B.
- Phase D can run the volunteer dry run once both B.1 and B.2 are in
  `main` and the pilot event's role assignments have been applied
  through the runbook.
