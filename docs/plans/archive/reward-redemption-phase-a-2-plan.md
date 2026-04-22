# Reward Redemption — Phase A.2a Execution Plan

**Status:** Completed
**Parent design:** [`reward-redemption-mvp-design.md`](../reward-redemption-mvp-design.md)
**Predecessor:** [`reward-redemption-phase-a-1-plan.md`](./reward-redemption-phase-a-1-plan.md) — landed.
**Successor:** [`reward-redemption-phase-a-2b-plan.md`](./reward-redemption-phase-a-2b-plan.md).
A.2b owns the Edge Function wrappers, the attendee redemption-status read path,
and the HTTP-mapping handler coverage.
**Scope:** A.2a only — the trusted database mutation surface and the
scoped RLS read policies. After this PR merges, the database can redeem
and reverse entitlements through `SECURITY DEFINER` RPCs callable by
an authenticated JWT with the right event role, and
assigned operators can read their scoped entitlements through RLS. No
Edge Function, no frontend, no attendee-facing surface ships in this PR.

## Why A.2 Is Split

The parent design proposed A.2 as one PR covering RPCs, RLS, three Edge
Functions, and the attendee status read path. Reviewing the combined
diff proved too large to review as a single slice. Splitting along a
SQL-vs-TypeScript seam keeps redeem and reverse together (the design-doc
constraint against fragmenting them) while letting each PR be reviewed on
its own validation surface (pgTAP here; Deno + Vitest in A.2b).

A.2a corresponds to migration-sequence steps 3 and 4 in the parent
design's checklist item 10 (write RPCs, RLS policies). A.2b picks up
step 5 (Edge Functions + attendee read path).

## Goals

- `public.redeem_entitlement_by_code(p_event_id text, p_code_suffix text)`
  exists with the `SECURITY DEFINER` + row-locking + envelope contract
  specified below. Idempotent on an already-redeemed row.
- `public.reverse_entitlement_redemption(p_event_id text, p_code_suffix text,
  p_reason text default null)` exists with the same contract and the
  reverse-side authorization gate. Idempotent on an already-unredeemed row.
- Scoped RLS read policy on `public.game_entitlements` lets an assigned
  agent or organizer read only their event's entitlements; root admins
  read all. Existing service-role-mediated read paths keep working
  unchanged.
- Scoped RLS read policy on `public.event_role_assignments` lets a user
  read only their own assignments. Writes stay service-role-only (A.1).
- pgTAP proves state transitions, idempotency, authorization, cross-event
  non-leakage, row-locking semantics, and RLS visibility (including
  defense-in-depth misses).

## Non-Goals

- Any Edge Function. Client-originated calls land in A.2b.
- Any frontend surface. `/event/:slug/redeem`,
  `/event/:slug/redemptions`, and the attendee status poll are later
  phases.
- Shared TypeScript envelope type under `shared/`. A.2a's envelope lives
  entirely on the SQL side; A.2b owns the TS mirror.
- Role seeding. The `event_role_assignments` table stays empty; tests
  seed fixtures.
- Any change to A.1 artifacts (helpers, shape check, runbook).

## RPC Contracts

Both RPCs return `jsonb` with a `{ outcome, result, ... }` envelope and
use the A.1 permission helpers for authorization. Implementation details
(exact PL/pgSQL, local variable names, log format) are left to the
implementer; the contract below is what the pgTAP suite pins down.

### `redeem_entitlement_by_code`

- **Signature:** `(p_event_id text, p_code_suffix text) returns jsonb`
- **Language:** PL/pgSQL, `security definer`, `set search_path = public`
- **Grants:** revoke from `public`; revoke execute from `service_role`
  (a service-role client without a forwarded user JWT would fall through
  to `not_authorized` anyway); grant execute to `anon` and `authenticated`
  (anon relies on the null-JWT guard). Edge Function wrappers in A.2b
  must forward the caller's bearer token so `current_request_user_id`
  resolves to the real operator.
- **Authorization gate:**
  `public.is_agent_for_event(p_event_id) OR public.is_root_admin()`.
  A missing or unauthenticated JWT short-circuits to `not_authorized`.
- **Lookup scope:** `game_entitlements` rows with `event_id = p_event_id`
  and a `verification_code` matching the 4-digit suffix. Row-level lock
  (`for update`) on the matched row before any state check.
- **Outcomes:**
  - `{ outcome: 'success', result: 'redeemed_now', ... }` after a
    successful `unredeemed → redeemed` transition.
  - `{ outcome: 'success', result: 'already_redeemed', ... }` if the row
    is already `redeemed` when the lock is taken. Idempotent; no state
    change.
  - `{ outcome: 'failure', result: 'not_found' }` when no row matches,
    including the cross-event case (entitlement with same suffix under a
    different event).
  - `{ outcome: 'failure', result: 'not_authorized' }` when the caller
    fails the gate.
  - `{ outcome: 'failure', result: 'internal_error' }` on any unexpected
    exception; details go to the postgres log, not to the client.
- **Side effects on `redeemed_now`:** sets `redemption_status='redeemed'`,
  `redeemed_at=now()`, `redeemed_by=current_request_user_id()`,
  `redeemed_by_role` to `'root_admin'` when the caller is a root admin
  else `'agent'`, and `redeemed_event_id=event_id`. Matches the A.1
  shape check's redeemed-row invariants.

### `reverse_entitlement_redemption`

- **Signature:** `(p_event_id text, p_code_suffix text,
  p_reason text default null) returns jsonb`
- **Language / grants:** same as above.
- **Authorization gate:**
  `public.is_organizer_for_event(p_event_id) OR public.is_root_admin()`.
  Agents cannot reverse.
- **Lookup scope:** identical to redeem, including `for update`.
- **Outcomes:**
  - `{ outcome: 'success', result: 'reversed_now', ... }` on a
    `redeemed → unredeemed` transition.
  - `{ outcome: 'success', result: 'already_unredeemed' }` if the row is
    already `unredeemed` when the lock is taken. Idempotent.
  - `{ outcome: 'failure', result: 'not_found' }` — same contract as
    redeem.
  - `{ outcome: 'failure', result: 'not_authorized' }` — same contract.
  - `{ outcome: 'failure', result: 'internal_error' }` — same contract.
- **Side effects on `reversed_now`:** flips status back to `unredeemed`,
  clears all `redeemed_*` columns, sets `redemption_reversed_at=now()`,
  `redemption_reversed_by=current_request_user_id()`,
  `redemption_reversed_by_role` to `'root_admin'` or `'organizer'`, and
  stores `p_reason` (nullable) in `redemption_note`.

### Shared contract notes

- Lookup must scope by `event_id` before any state check so cross-event
  codes never leak. Implementation choice between a direct equality
  match on a reconstructed full code versus a pattern match on the
  suffix is up to the implementer; the pgTAP suite pins the observable
  behavior, not the SQL shape.
- Row-level locking is required so two concurrent redeem calls against
  the same row serialize into one `redeemed_now` and one
  `already_redeemed`. Same for concurrent reverses.
- The envelope carries enough metadata on success for the Phase B UI
  and Phase C attendee poll (e.g. `redeemed_at`, `redeemed_by_role`,
  `reversed_at`, `reversed_by_role`) but the exact field set is an
  A.2b concern — this phase only pins that the envelope includes the
  fields needed by the tests below and does not leak identity fields
  the parent design excluded.

## RLS Read Policies

### `public.game_entitlements`

- One authenticated read policy: an assigned agent, assigned organizer,
  or root admin may select a row whose `event_id` they are assigned to
  (or any row if root). Composed from the A.1 helpers so the read and
  write enforcement share one truth table.
- A.2a does **not** add any authenticated insert/update/delete policy.
  Writes stay on the RPC path.
- If `game_entitlements` does not already have RLS enabled, A.2a enables
  it in the same migration. The expected state is that all existing
  reads go through service-role-executed edge functions, so enabling RLS
  is behavior-preserving — the pre-edit gate includes verifying this
  and stopping to report if an unexpected authenticated read path
  surfaces.

### `public.event_role_assignments`

- One authenticated read policy: a user may select their own assignment
  rows; root admins may select any. A.1 left this table with RLS
  enabled and no authenticated policies; A.2a adds the self-read
  policy so future UI can answer "which events am I assigned to?"
  without a function round-trip.
- No authenticated write policy. `UPDATE` stays revoked from
  `service_role` per A.1.

## Migration Filenames

Continues the A.1 `20260421000000`/`000100`/`000200` sequence. Filenames
describe the surface, not the phase (AGENTS.md anti-pattern on
phase-named files):

- `20260421000300_add_redeem_entitlement_rpc.sql`
- `20260421000400_add_reverse_entitlement_redemption_rpc.sql`
- `20260421000500_add_redemption_rls_policies.sql`

One concern per file so selective rollback is clean.

## Rollout Sequence

1. **Baseline validation.** `npm run lint`, `npm test`,
   `npm run test:functions`, `npm run build:web` from `main` before the
   first edit. Stop and report on any red baseline.
2. **Commit 1 — Redeem RPC + pgTAP.** The first RPC migration plus a new
   `supabase/tests/database/redemption_rpc.test.sql` covering the
   redeem cases listed under "Tests" below. Validate with
   `npm run test:functions`.
3. **Commit 2 — Reverse RPC + pgTAP additions.** The second RPC
   migration and reverse-side cases appended to
   `redemption_rpc.test.sql`. Validate with `npm run test:functions`.
4. **Commit 3 — RLS read policies + pgTAP.** The policies migration
   plus a new `supabase/tests/database/redemption_rls.test.sql`.
   Validate with `npm run test:functions`.
5. **Automated code-review feedback loop.** Review the branch diff from
   a senior-engineer stance. Fix behavior drift, weak assertions, or
   envelope inconsistencies. Commit review fixes as a distinct commit
   when it clarifies history.
6. **Structure review.** Scan the two RPCs for duplicated
   authorization/lookup logic. Extract a small helper only if the
   duplication is clear and the extraction is small; otherwise log a
   follow-up in `docs/tracking/code-refactor-checklist.md` rather than
   widening this PR.
7. **Documentation currency sync.** Single commit touching:
   - `docs/plans/archive/reward-redemption-phase-a-1-plan.md` — flip the
     `**Status:**` field from `Not started` to `Completed` so the A.1
     plan doc reflects the landed state. This update was missed when
     A.1 merged and is caught up here.
   - `docs/architecture.md` — redemption RPCs and RLS in the backend /
     trust-boundary sections.
   - `docs/plans/reward-redemption-mvp-design.md` — note that Phase A.2
     is split into A.2a and A.2b; mark A.2a landed; leave A.2b open.
   - `docs/backlog.md` / `docs/open-questions.md` — update if A.2a
     answers or surfaces anything.
   Walk the "Doc Currency Is a PR Gate" list explicitly.
8. **Final validation.** `npm run lint`, `npm test`,
   `npm run test:functions`, `npm run build:web` on a clean tree. Apply
   the three migrations on a Supabase branch project when available and
   invoke each RPC directly through `psql` or the branch SQL editor
   with seeded role assignments; note any check that could not run.
9. **PR preparation.** Open the PR against `main` using the nine-section
   template. Flag contract changes (two new RPC surfaces, two new RLS
   policies, one RLS enablement if applicable). Note remaining risk:
   Phase A.2b Edge Functions do not exist yet, so no client path reaches
   the RPCs — the feature is inert in practice until A.2b lands and the
   Phase D runbook seeds assignments.

Intended commit boundary summary:

| # | Commit                                                | Validation                |
|---|-------------------------------------------------------|---------------------------|
| 1 | `feat(db): redeem_entitlement_by_code rpc`            | `npm run test:functions`  |
| 2 | `feat(db): reverse_entitlement_redemption rpc`        | `npm run test:functions`  |
| 3 | `feat(db): redemption rls read policies`              | `npm run test:functions`  |
| 4 | `docs: sync for redemption a.2a`                      | `npm run lint`, `npm run build:web` |

Review-fix commits, if any, land between 3 and 4.

## Tests

### `supabase/tests/database/redemption_rpc.test.sql`

Setup per case: seed an event, seed an entitlement with a known
verification code, seed `event_role_assignments` rows as needed, and
switch identity with `set_config('request.jwt.claims', …)`.

Redeem cases (what the suite must prove, not how):

- null JWT → `not_authorized`.
- Authenticated but unassigned → `not_authorized`.
- Agent assigned to a different event → `not_authorized`.
- Agent assigned, suffix does not exist → `not_found`.
- Agent assigned, suffix belongs to another event → `not_found`
  (cross-event non-leakage).
- Agent assigned, valid suffix, status `unredeemed` → `redeemed_now`;
  row state matches the A.1 shape check's redeemed-row invariants and
  `redeemed_by_role = 'agent'`.
- Root admin, valid suffix → `redeemed_now` with
  `redeemed_by_role = 'root_admin'`.
- Second redeem on the same row → `already_redeemed`; `redeemed_at`
  echoes the first call.
- Concurrency: two advisory-serialized sessions attempting redeem on
  the same row produce one `redeemed_now` and one `already_redeemed`,
  not two successes. Use whatever two-session pattern pgTAP provides in
  this repo; the assertion is about the observable outcome.

Reverse cases:

- null JWT → `not_authorized`.
- Authenticated but unassigned → `not_authorized`.
- Agent (not organizer) for the event → `not_authorized`.
- Organizer assigned to a different event → `not_authorized`.
- Organizer assigned, suffix does not exist → `not_found`.
- Organizer assigned, suffix belongs to another event → `not_found`.
- Organizer assigned, status `redeemed`, null reason → `reversed_now`;
  `redeemed_*` all null, `redemption_reversed_*` populated with
  `organizer`, `redemption_note` null.
- Organizer assigned, status `redeemed`, non-null reason → reason is
  stored verbatim in `redemption_note`.
- Organizer assigned, status already `unredeemed` → `already_unredeemed`.
- Root admin, status `redeemed` → `reversed_now` with
  `redemption_reversed_by_role = 'root_admin'`.
- Post-reverse redeem cycle: reverse a row, then redeem via an agent
  JWT; the redeem succeeds as `redeemed_now` (not `already_redeemed`),
  `redeemed_*` reflect the new cycle, `redemption_reversed_*` still
  hold the prior cycle's audit trail.

### `supabase/tests/database/redemption_rls.test.sql`

Setup: two events, one entitlement per event, one agent for event A,
one organizer for event B, one unassigned authenticated user.

- Agent for A selects from `game_entitlements` → sees only event A's
  row, not event B's.
- Organizer for B selects → sees only event B's row.
- Unassigned authenticated user → sees zero rows.
- `anon` → sees zero rows.
- Root admin → sees both rows.
- Agent for A selects from `event_role_assignments` → sees their own
  assignment row only, not the organizer's.
- Authenticated insert/update/delete on `event_role_assignments` →
  denied by RLS.

### Out of scope for A.2a

- Vitest envelope-mapping tests. The envelope is exercised only at the
  SQL level here; HTTP mapping lands in A.2b.
- `shared/redemption.ts` type. A.2b owns the TS mirror so the type and
  the Vitest coverage land in the same commit.

## Validation Expectations

- `npm run lint` — passes (docs-only markdown in A.2a's TypeScript surface).
- `npm test` — passes (no TS change, but guarded against incidental drift).
- `npm run test:functions` — passes with the two new pgTAP files.
- `npm run build:web` — passes.
- Manual: apply the three migrations to a Supabase branch project when
  available; invoke each RPC through `psql` or the SQL editor with
  representative JWT claims; confirm observable envelopes match the
  contract. Note explicitly in the PR if the branch project is not
  available locally.

## Risks and Mitigations

- **Security-definer RPCs overreach.** The `where` clauses plus the A.1
  helpers are the only gate. Mitigation: the pgTAP authorization matrix
  covers every role × event combination, including cross-role attempts
  (agent trying to reverse, organizer trying to redeem).
- **Cross-event non-leakage relies on SQL-level scoping only.** A.2b
  will add an Edge Function layer that must preserve the guarantee.
  Mitigation: A.2a's tests assert the `not_found` body shape is
  identical across unknown-code and cross-event cases so A.2b has a
  pinned contract to mirror.
- **Row-level locking semantics under Supabase's RPC wrapper.** A
  function call runs in a single transaction so the lock holds through
  the update. Mitigation: the concurrency test case exercises this.
- **RLS enablement on `game_entitlements` could surprise an existing
  read path.** Mitigation: the pre-edit gate audits existing reads. If
  any non-service-role caller reads the table today, stop and report
  rather than flipping RLS on inside this phase.
- **Reverse RPC allows reversing a redemption of arbitrary age.** This
  is the parent design's intentional policy for dispute handling; no
  mitigation needed, but the test suite asserts there is no time-window
  gate so a future author does not silently add one.

## Rollback Plan

Reverse of the forward sequence. A.2a adds only additive surfaces; rollback
is non-destructive and leaves A.1 intact.

1. Drop the two new RLS policies by name. If A.2a enabled RLS on
   `game_entitlements` itself, toggle it back only if the pre-A.2a state
   was disabled; otherwise leave it on.
2. Replace the two RPC bodies with a safe-error no-op
   (`raise exception 'redemption not enabled'`) rather than dropping
   them immediately, so a future A.2b redeploy cannot 500 against a
   missing function during a staged rollout. A final drop migration may
   follow once A.2b is also rolled back.
3. A.1 artifacts are untouched.

A partial rollback that keeps the RPCs and drops only the RLS policies
is safe: the RPCs are granted only to `anon` and `authenticated` (with
`service_role` EXECUTE revoked) and still enforce authorization through
the A.1 helpers + the null-JWT guard.

## Resolved Decisions

- **A.2 splits into A.2a (SQL) and A.2b (Edge Functions).** Keeps each
  PR reviewable on a single validation surface without fragmenting
  redeem and reverse, which the parent design explicitly forbade.
- **RPC input is `event_id`, not `event_slug`.** Matches the A.1 helper
  contract and avoids slug resolution inside a security-definer body.
- **Cross-event lookup returns `not_found`.** Inherited from parent
  design checklist item 6; pinned by the pgTAP suite here so A.2b has a
  contract to mirror.
- **Reversal reason is optional.** Inherited from checklist item 7.
- **RLS read policy on `game_entitlements` is one policy spanning all
  three redemption roles.** Simpler to audit than three separate
  policies and consistent with the "same helpers for read and write"
  principle.
- **`event_role_assignments` gains its self-read policy in A.2a.** A.1
  deliberately deferred this; A.2a adds it so A.2b (or a later UI
  phase) can query "my events" without a function round-trip.
- **Shared TS envelope type defers to A.2b.** A.2a has no TypeScript
  surface; adding `shared/redemption.ts` here would land dead code.

Open questions blocking A.2a: none. If one surfaces during
implementation (for example the RLS enablement audit uncovers an
unexpected read path), stop and extend this plan rather than widening
scope inline.

## Handoff After A.2a

- Redeem and reverse are callable through the database, but no
  client-facing path reaches them yet. The feature is inert.
- A.2b can build three Edge Functions against stable SQL contracts:
  `redeem-entitlement`, `reverse-entitlement-redemption`, and
  `get-redemption-status`.
- Phase B frontend and Phase C attendee polling remain gated on A.2b.
- Phase D role seeding remains gated on Phase B.
