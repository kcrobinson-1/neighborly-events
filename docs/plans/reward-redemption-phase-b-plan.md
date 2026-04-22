# Reward Redemption — Phase B Overview Plan

**Status:** In progress — B.1 landed in
[`reward-redemption-phase-b-1-plan.md`](./reward-redemption-phase-b-1-plan.md);
B.2a landed in
[`reward-redemption-phase-b-2a-plan.md`](./reward-redemption-phase-b-2a-plan.md);
B.2b is not started. This overview names the remaining sub-phase
boundaries and the prerequisites each sub-phase inherits. Full
execution plans for each sub-phase are drafted separately, close to
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
  list for event-scoped **organizers** and root admins. Agents do not
  reach this route in MVP (resolved in the B.2a plan; reason: design
  doc §Role And Access Model, plus avoiding a doubled gate test matrix
  for no dispute-handling win)

These routes deploy inert at first: no nav entry, no `/admin` link, no
role seeding. They become usable only after Phase D seeds the event's
agent and organizer assignments through the reviewed
[`supabase/role-management/`](../../supabase/role-management/README.md)
runbook.

## Why Phase B Splits Into Three Sub-Phases

`/event/:slug/redeem` and `/event/:slug/redemptions` share no UI surface
beyond the sign-in shell and the event-context header. Their UX
priorities diverge, and the monitoring route itself splits cleanly
along a read-vs-write seam:

- **B.1 (redeem)** is a rapid-entry tool. The design doc locks a
  split-screen layout with a persistent numeric keypad, a minimal
  status/result card, and a single-dominant-action flow. Review attention
  should focus on keypad behavior, 4-digit validation, result-state
  handling, and network-error recovery under live-event pressure.
- **B.2a (monitoring — read-only)** is the dispute-verification
  surface. It adds the locked event header, sticky filters, suffix
  search, bounded list fetch via direct RLS-scoped `game_entitlements`
  reads, and a view-only bottom-sheet detail view. Review attention
  should focus on list ordering under the reversed-row data shape,
  filter state preservation, cross-event non-leakage in search, and
  freshness behavior.
- **B.2b (monitoring — reversal)** adds the reverse CTA inside the
  existing detail sheet, a confirmation step with optional reason
  input, the `reverse-entitlement-redemption` mutation wiring, and
  post-action refetch. Review attention should focus on reversal
  authorization UX, confirmation-copy non-leakage, idempotency
  surfacing (`already_unredeemed`), and race conditions between the
  single-row re-read and the list refetch.

Merging B.1 and B.2 into one PR would dilute both reviews. Merging B.2a
and B.2b into one PR would mix read UX with mutation UX, so the
high-stakes reversal review (authorization, audit-trail copy, envelope
mapping) competes with filter-chip minutiae. Splitting three ways
mirrors the A.2a/A.2b seam (one dominant behavior per PR) and keeps
each sub-phase shippable and reviewable on its own. B.2a ships a
monitoring surface that is useful without reversal (organizers verify
disputes read-only; root-admin SQL remains the reversal escape hatch
until B.2b lands), consistent with the design doc's direct-SQL
role-management posture.

## Sub-Phase Summary

| Sub-phase | Route | Primary users | Primary actions | Detail plan |
|-----------|-------|---------------|-----------------|-------------|
| **B.1** | `/event/:slug/redeem` | agents (+ root admin) | lookup, redeem | [`reward-redemption-phase-b-1-plan.md`](./reward-redemption-phase-b-1-plan.md) (Landed) |
| **B.2a** | `/event/:slug/redemptions` (read-only) | organizers (+ root admin) | list, filter, search, view | [`reward-redemption-phase-b-2a-plan.md`](./reward-redemption-phase-b-2a-plan.md) (Landed) |
| **B.2b** | `/event/:slug/redemptions` (reversal) | organizers (+ root admin) | reverse, confirm, optional reason | drafted before B.2b implementation as `reward-redemption-phase-b-2b-plan.md` |

## Prerequisites

Phase B does not start until all three prerequisites are in `main`:

1. **[Auth sign-in generalization](./auth-signin-generalization-plan.md).**
   All three sub-phases sign users in through a role-neutral shell
   rather than the admin-labelled form. Landing the generalization
   first keeps each sub-phase's diff focused on its dominant behavior
   rather than auth plumbing.
2. **[A.2b](./archive/reward-redemption-phase-a-2b-plan.md).** *Landed.* The
   three Edge Functions and `shared/redemption.ts` contracts are in
   place. B.1 and B.2b consume them unchanged (B.2a consumes only the
   A.2a RLS read surface, not an Edge Function). Any discovered need
   to evolve the HTTP contract is a stop-and-report moment that
   reopens the A.2b boundary rather than widening Phase B.
3. **Event-code prerequisite.** *Landed.* `game_events.event_code` and
   the per-event `UNIQUE (event_id, verification_code)` constraint are
   in place (migrations `20260418030000`–`20260418070000`), so B.1 can
   rely on single-column suffix lookup in the locked event scope and
   B.2a/B.2b can trust that `event_code` is already populated for
   every event.

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

- Monitoring list, filters, search, view-only detail sheet — all
  B.2a. Reversal CTA, confirmation, reason input — all B.2b.
- Attendee completion-screen polling — Phase C.
- Role seeding, runbook execution — Phase D.
- Any realtime subscription, offline queue, or multi-event picker.
- Any admin-nav link pointing at the route.

Landed decisions from B.1:

- The route ships behind direct URL entry only. There is no nav link,
  `/admin` link, role seeding, monitoring behavior, or attendee polling
  in the B.1 diff.
- The page reuses the existing auth shell, adds a focused
  `apps/web/src/redeem/` module set, and keeps route authorization to
  exactly `authorized`, `role_gate`, and `transient_error`.
- Styling reuses existing SCSS tokens and isolates redeem-specific
  layout/component rules in `apps/web/src/styles/_redeem.scss`.
- B.1 owns both a focused Vitest keypad-state suite and a dedicated
  mobile-viewport Playwright smoke backed by local Supabase plus local
  Edge Functions.

### B.2a — `/event/:slug/redemptions` (read-only monitoring)

In scope:

- Event-scoped route wiring and sign-in gate, same generalized shell.
- Role check: `is_organizer_for_event(eventId)` or `is_root_admin()`.
  Agents do not reach the route in MVP — the design doc §Role And
  Access Model scopes the monitoring route to organizers and root
  admins only, and splitting read-vs-write access by role would double
  the gate test matrix for no dispute-handling value.
- Mobile information architecture from the design doc: locked event
  context, sticky search/filter bar, default newest-first sort,
  view-only bottom-sheet detail view.
- Filter chips: `Last 15m`, `Redeemed`, `Reversed`, `By me`.
- Bounded single fetch of the most recent `N = 500` records per event
  via a direct Supabase client `.select()` against `game_entitlements`
  (protected by the A.2a RLS read policy); client-side filtering and
  suffix search operate against that cached slice.
- Error handling per design doc §8: non-dismissive inline banner with
  `Retry`, one automatic retry with ~2s backoff, offline banner via
  `navigator.onLine`, "last updated at" freshness timestamp in the
  monitoring header.

Out of scope for B.2a:

- Reversal flow in every form — reverse CTA, confirmation dialog,
  reason input, `reverse-entitlement-redemption` invocation,
  post-reversal refetch, single-row re-read. All deferred to B.2b.
- Cursor/keyset pagination — named as a post-MVP upgrade path in the
  design doc §5. B.2a ships the bounded-N fetch with the
  "showing most recent N" affordance.
- Cross-device cache invalidation or shared client cache with B.1.
- Realtime subscriptions; monitoring remains operator-driven refresh.
- Attendee-facing surfaces.
- Extracting a shared `resolveEventContext` helper from B.1's
  `authorizeRedeem.ts`. The B.2a `authorizeRedemptions.ts` parallels
  the B.1 file; a post-B.2b cleanup task captures the extraction when
  all three consumers are in place.

Resolved for B.2a (previously open at the phase-overview level):

- `N = 500` default, with a visible "showing most recent N" banner
  when the cap is hit.
- Organizer + root admin only; no agent read access.
- B.2a ships its own mobile-viewport Playwright smoke
  (`mobile-smoke.redemptions.spec.ts`) with a dedicated backend-backed
  runner, mirroring the B.1 precedent.
- "By me" matches `redeemed_by = user.id` in B.2a. B.2b expands the
  predicate to include `redemption_reversed_by = user.id`.

### B.2b — `/event/:slug/redemptions` (reversal)

In scope:

- Reverse CTA inside the existing B.2a detail bottom sheet, gated by
  `is_organizer_for_event(eventId)` or `is_root_admin()` and by
  current row state (`redemption_status = 'redeemed'`).
- Confirmation step with code + event + prior status summary.
- Optional reason input (single-line, not required per design doc §7).
- Invocation of `reverse-entitlement-redemption` with the caller's
  bearer token; map the A.2b envelope to success
  (`reversed_now` / `already_unredeemed`) and failure
  (`not_found` / `not_authorized`) states.
- Post-action behavior: single-row re-read for the detail sheet
  followed by a list refetch; "last updated at" reflects the list
  refetch.
- Expand the "By me" filter to match `redeemed_by = user.id OR
  redemption_reversed_by = user.id`.

Out of scope for B.2b:

- Any backend change. If B.2b discovers the A.2b envelope cannot
  support a required reversal UX state, stop and reopen A.2b.
- Multi-row reversal, bulk operations, or undo of a reversal.
- Changes to the read-only monitoring surface B.2a landed.

Open items the B.2b detail plan must settle before implementation:

- Exact reversal confirmation copy against the non-leakage contract.
- Whether the reason input enforces a max length at the UI level.
- Whether the post-action refetch reuses the same cached slice or
  re-issues the full bounded fetch.

## Shared Concerns Across Sub-Phases

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
- **Transport.** Mutation paths call the A.2b Edge Functions unchanged
  (`redeem-entitlement` in B.1; `reverse-entitlement-redemption` in
  B.2b), with request bodies and response envelopes coming from
  [`shared/redemption.ts`](../../shared/redemption.ts). The
  monitoring list in B.2a reads `game_entitlements` directly through
  the browser Supabase client, protected by the A.2a RLS read policy
  and an explicit `.eq("event_id", eventId)` scope. No new Edge
  Function, RPC, migration, or shared contract module lands under
  Phase B.
- **Error surfacing.** All user-initiated mutations use inline banners
  with a `Retry` action. No `void promise` chains. The
  `Error-surfacing for user-initiated mutations` self-review audit
  applies to both sub-phase diffs.
- **Styling tokens.** Prefer existing tokens from
  [`apps/web/src/styles/_tokens.scss`](../../apps/web/src/styles/_tokens.scss).
  Introduce new tokens only when a value is reused across sub-phases
  (e.g., status-badge palettes shared by the B.2a list and the B.2b
  detail-sheet confirmation). The first sub-phase to need a token
  introduces it, later sub-phases reuse rather than re-define. Token
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
2. **B.1 detail plan drafted and landed.**
   `reward-redemption-phase-b-1-plan.md` is now the terminal record for
   the direct-entry redeem route and its validation surface.
3. **B.1 implemented.** `/event/:slug/redeem` now ships behind an
   unadvertised entry (no nav link) and validates per the B.1 plan's
   stated commands.
4. **B.2a detail plan drafted.**
   [`reward-redemption-phase-b-2a-plan.md`](./reward-redemption-phase-b-2a-plan.md)
   is the terminal record for the read-only monitoring surface.
5. **Implement B.2a.** Land `/event/:slug/redemptions` as a read-only
   monitoring surface behind an unadvertised entry.
6. **Draft the B.2b detail plan.** Same template, scoped to the
   reversal surface layered into the detail sheet B.2a shipped.
7. **Implement B.2b.** Land the reversal CTA + confirmation flow.
8. **Update `docs/backlog.md` and `docs/architecture.md`** as each
   sub-phase lands, per
   [`AGENTS.md`](../../AGENTS.md) § "Doc Currency Is a PR Gate".
9. **Hand off to Phase C.** Phase B does not block Phase C; the
   attendee status endpoint is already live and Phase C can run in
   parallel with B.2a/B.2b if operator scheduling allows.

Phase B does not implement Phase D. Role seeding and the volunteer dry
run wait for B.1, B.2a, and B.2b to all land so the dry-run script can
exercise the full operator surface.

## Deployment Gates At The Phase Level

Each sub-phase inherits the design doc §10 step 6 gate:

- `npm run lint`, `npm run build:web`, `npm test` pass.
- A mobile-viewport Playwright smoke exercises the sub-phase's
  dominant flow against local Supabase — with local Edge Functions
  booted only when the sub-phase's flow calls one (B.1's redeem
  path does; B.2a's read-only monitoring does not; B.2b calls
  `reverse-entitlement-redemption`, so it does). Each sub-phase owns
  its own smoke file and backend-backed runner (B.1 →
  `test:e2e:redeem`; B.2a → `test:e2e:redemptions`; B.2b extends or
  replaces B.2a's spec per its own plan).
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
  applies to the B.2a filter bar (chips + search input) and to the
  B.2b reversal confirmation form if it carries multi-field state.
- **CI / validation surface.** `Readiness-gate truthfulness audit`
  applies if a sub-phase adds a new smoke helper, doctor probe, or
  readiness check.
- **SQL surface sentinel.** `Grant/body contract audit` and
  `Legacy-data precheck for constraint tightening` apply only if a
  sub-phase unexpectedly touches SQL; that scope drift should stop the
  sub-phase and reopen A.2a rather than proceed.

## Risks And Mitigations

- **Phase B surfaces a missing HTTP contract.** If B.1, B.2a, or B.2b
  discovers the A.2a RLS read surface or the A.2b Edge Function
  envelope cannot support a required UX state (for example, a
  distinct "offline" response vs. a generic 5xx, or a column the
  monitoring list needs that RLS does not expose), the correct action
  is to stop and reopen A.2a or A.2b, not widen Phase B. The
  sub-phase plans state this explicitly.
- **Role seeding readiness surprise.** If operators expect the routes
  to work immediately after Phase B merges, they will see a role-gate
  state. Mitigation: the Phase D runbook is the canonical path, and
  neither sub-phase advertises the route in nav.
- **Auth plumbing creep.** Without the generalization phase landing
  first, Phase B diffs would mix auth rename work with redemption UX.
  Mitigation: the auth generalization is an explicit prerequisite.
- **Styling-token drift.** Introducing many redemption-specific tokens
  inside Phase B risks cross-sub-phase collision. Mitigation: shared
  tokens land in the sub-phase that needs them first, and later
  sub-phases reuse rather than re-define (e.g., B.2a introduces the
  status-badge palette; B.2b's detail-sheet confirmation reuses it).
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

- **Phase B ships as three sub-phases: B.1 redeem, B.2a read-only
  monitoring, B.2b reversal.** Confirmed above; the B.2 split along
  the read-vs-write seam mirrors the A.2a/A.2b precedent.
- **Prerequisite ordering.** Auth generalization lands first; A.2b is
  already landed; event-code prerequisite is already landed. No other
  prerequisite work gates Phase B.
- **Role-gate UX.** Authenticated-but-unassigned callers see an
  in-place state that does not leak event existence. Redirecting to
  `/admin` is explicitly rejected.
- **Single vs. shared cache.** B.1 holds no lookup cache between codes;
  B.2a refetches on explicit user action and initial mount; B.2b
  refetches after a successful reversal. Cross-route cache sharing is
  not introduced in Phase B (design doc §8).
- **Unadvertised deployment.** All three routes deploy without nav
  linkage until role seeding in Phase D.
- **Monitoring transport.** B.2a reads `game_entitlements` directly
  through the browser Supabase client, protected by the A.2a RLS read
  policy. No new Edge Function, RPC, or migration lands in B.2a or
  B.2b. The reversal surface in B.2b calls the already-landed A.2b
  `reverse-entitlement-redemption` Edge Function unchanged.

## Open Questions For The Sub-Phase Plans

These questions are **not** resolved at the Phase B overview level.
Each sub-phase plan is expected to resolve its own:

- Smoke-test partitioning: per-sub-phase vs. combined Phase B (all).
- Shared token additions vs. sub-phase-local styles (all).
- Reversal reason input shape (single line vs. textarea) (B.2b).

If any of these turns into a design-boundary change (for example,
agents gaining write access in B.2b), stop and reopen the parent
design doc rather than deciding inside the sub-phase plan.

## Handoff After Phase B

- `/event/:slug/redeem` and `/event/:slug/redemptions` render correctly
  for authorized callers on a mobile viewport, with reversal wired up
  once B.2b lands.
- The unadvertised-entry posture means the product surface is
  unchanged for attendees and admins until Phase D seeds roles.
- Phase C can ship the attendee polling surface at any time; it has no
  blocking dependency on Phase B.
- Phase D can run the volunteer dry run once B.1, B.2a, and B.2b are
  all in `main` and the pilot event's role assignments have been
  applied through the runbook.
