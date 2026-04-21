# Reward Redemption — Phase A.2b Execution Plan

**Status:** Not started
**Parent design:** [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md)
**Predecessor:** [`reward-redemption-phase-a-2-plan.md`](./reward-redemption-phase-a-2-plan.md) — landed.
**Scope:** Phase A.2b only — the Edge Function wrappers around the stable A.2a
SQL surface, the attendee `get-redemption-status` read path, the shared
TypeScript contract module under `shared/`, and the handler test coverage for
HTTP mapping and trust-boundary behavior. No frontend route, polling UI, or
role seeding ships in this phase.

## Why A.2b Exists

A.2a deliberately stopped at the database boundary so SQL review could stay
focused on RPC semantics, row locking, and RLS. A.2b picks up the additive
TypeScript/backend surface that clients will eventually call:

- `redeem-entitlement`
- `reverse-entitlement-redemption`
- `get-redemption-status`

The phase stays bounded by keeping all browser UI work out of scope. Phase B
owns the operator routes and Phase C owns attendee polling/refresh behavior.

## Summary

Add three Edge Functions that sit on top of the stable A.2a contracts:

- operator-facing redeem and reverse wrappers that validate request shape,
  distinguish unauthenticated from unauthorized callers, and map the SQL
  `{ outcome, result }` envelopes to deterministic HTTP statuses
- an attendee-facing redemption-status endpoint that uses the existing signed
  browser session, scoped by `eventId`, to read the current entitlement state
  for that event/session pair
- a shared transport contract module in `shared/` so later frontend phases and
  the Edge Functions read from one TypeScript source of truth

After this phase merges, the trusted backend path for redemption is callable
through HTTP, but no user-visible routes consume it yet.

## Goals

- `supabase/functions/redeem-entitlement/index.ts` exists and wraps
  `public.redeem_entitlement_by_code(...)` without changing the A.2a SQL
  contract.
- `supabase/functions/reverse-entitlement-redemption/index.ts` exists and wraps
  `public.reverse_entitlement_redemption(...)` without changing the A.2a SQL
  contract.
- `supabase/functions/get-redemption-status/index.ts` exists and returns the
  current redemption state for the verified signed browser session and the
  requested `eventId`.
- `shared/redemption.ts` exists and owns the transport-level contracts used by
  the new handlers.
- Deno handler tests prove request validation, auth/session gates, HTTP status
  mapping, and event/session scoping.
- The plan and nearby redemption docs agree on the locked A.2b contract.

## Non-Goals

- Any frontend route, view, polling hook, or attendee completion-panel change.
- Any new SQL migration, RPC shape change, or RLS change. If A.2b discovers a
  missing SQL contract, stop and report instead of widening the phase back into
  A.2a.
- Any agent lookup list, monitoring list, pagination, or `/event/:slug/*`
  screen. Those land in later phases.
- Any new CI workflow, top-level validation script, or Playwright flow unless a
  very small additive helper is clearly worth the review cost.
- Role seeding or dry-run operations. Those remain later rollout steps.

## Locked Contracts

### Shared type module

`shared/redemption.ts` is the single TypeScript contract module for A.2b. It
owns:

- request payload types for `redeem-entitlement`,
  `reverse-entitlement-redemption`, and `get-redemption-status`
- response/envelope types for redeem and reverse, mirroring the A.2a RPC result
  vocabulary
- attendee status response types for `get-redemption-status`

It does **not** own fetch clients, browser polling hooks, React state, or SQL
types copied from migrations.

### `redeem-entitlement`

- **Method:** `POST` only
- **Origin gate:** same allowed-origin policy used by existing Edge Functions
- **Authentication:** bearer token required
- **Request body:** `{ eventId: string, codeSuffix: string }`
- **Input normalization:**
  - trim `eventId`
  - trim `codeSuffix`
  - require `codeSuffix` to match exactly four ASCII digits
- **Persistence path:** call `public.redeem_entitlement_by_code(...)` through a
  Supabase client that forwards the caller's bearer token
- **HTTP mapping:**
  - `200` with the success envelope on `redeemed_now` or `already_redeemed`
  - `403` with `{ error, details: 'not_authorized' }` on RPC
    `not_authorized`
  - `404` with `{ error, details: 'not_found' }` on RPC `not_found`
  - `500` with `{ error, details: 'internal_error' }` on RPC
    `internal_error` or any unexpected no-data path
- **Unauthenticated vs unauthorized split:**
  - missing or invalid bearer token is `401`
  - valid bearer token that lacks the event role is `403`

### `reverse-entitlement-redemption`

- **Method / origin / auth:** same as `redeem-entitlement`
- **Request body:** `{ eventId: string, codeSuffix: string, reason?: string | null }`
- **Input normalization:**
  - trim `eventId`
  - trim `codeSuffix`
  - require exactly four ASCII digits
  - normalize blank `reason` to `null`
  - otherwise pass the trimmed reason through unchanged; A.2b does not invent a
    new length/content policy
- **Persistence path:** call
  `public.reverse_entitlement_redemption(...)` through a forwarded-user JWT
  client
- **HTTP mapping:**
  - `200` with the success envelope on `reversed_now` or
    `already_unredeemed`
  - `403` / `404` / `500` with the same `details` codes described above
  - `401` for missing or invalid bearer token before the RPC call

### `get-redemption-status`

- **Method:** `POST` only
- **Origin gate:** same allowed-origin policy used by `issue-session` and
  `complete-game`
- **Authentication:** existing signed browser session from cookie or
  `x-neighborly-session`
- **Request body:** `{ eventId: string }`
- **Locked trust rule:** lookup is bound to `(event_id, client_session_id)`
  where `client_session_id` comes only from the verified signed session. The
  endpoint does **not** accept a code, code suffix, completion id, or any other
  attendee-supplied lookup key.
- **Read path:** service-role query against `public.game_entitlements`,
  scoped by `event_id` and verified `client_session_id`
- **Response body on success:**

```ts
{
  verificationCode: string;
  redemptionStatus: "unredeemed" | "redeemed";
  redeemedAt: string | null;
  redemptionReversedAt: string | null;
}
```

- **HTTP mapping:**
  - `200` when an entitlement exists for that event/session pair, including the
    normal `unredeemed` state
  - `401` when the signed session is missing or invalid
  - `404` when no entitlement exists for that event/session pair
  - `500` on unexpected query failure or malformed persistence result

## Target Structure

Define responsibilities up front so the phase does not turn into open-ended
handler duplication.

### `shared/redemption.ts`

- transport-level request/response types only
- small pure helpers only if they reduce duplication across handlers/tests
- no browser storage, no `fetch`, no React, no Supabase client creation

### `supabase/functions/_shared/redemption-operator-auth.ts`

- reads the bearer token
- verifies whether the token is structurally present and resolves to a real
  Supabase Auth user
- exposes the verified token and user id to redeem/reverse handlers
- owns the `401` distinction; event-role authorization remains the RPC's job

If this helper grows beyond auth + token verification, stop and split the
extracted responsibility deliberately.

### `supabase/functions/redeem-entitlement/index.ts`

- request parsing and code-suffix validation
- call into the A.2a redeem RPC via a user-context client
- map the stable SQL envelope to HTTP response status/body

### `supabase/functions/reverse-entitlement-redemption/index.ts`

- request parsing and optional-reason normalization
- call into the A.2a reverse RPC via a user-context client
- map the stable SQL envelope to HTTP response status/body

### `supabase/functions/get-redemption-status/index.ts`

- request parsing (`eventId`)
- signed-session verification using the existing shared session helper
- event/session-scoped entitlement read
- attendee-status response shaping

### Tests

- `tests/supabase/functions/redeem-entitlement.test.ts`
- `tests/supabase/functions/reverse-entitlement-redemption.test.ts`
- `tests/supabase/functions/get-redemption-status.test.ts`

No browser/unit test file is planned unless a pure helper in `shared/` merits
direct coverage.

## Rollout Sequence

1. **Baseline validation.** `npm run lint`, `npm test`, `npm run test:functions`,
   and `npm run build:web` on the branch before the first implementation edit.
   Stop and report on any pre-existing failure.
2. **Commit 1 — Shared contracts + redeem wrapper.** Add
   `shared/redemption.ts`, any minimal operator-auth helper, the redeem handler,
   and its Deno tests. Validate with `npm run test:functions` plus
   `deno check --no-lock supabase/functions/redeem-entitlement/index.ts`.
3. **Commit 2 — Reverse wrapper.** Add the reverse handler and its Deno tests.
   Validate with `npm run test:functions` plus
   `deno check --no-lock supabase/functions/reverse-entitlement-redemption/index.ts`.
4. **Commit 3 — Attendee status endpoint.** Add `get-redemption-status` and its
   Deno tests. If the phase touches `_shared/session-cookie.ts` or `_shared/cors.ts`,
   also validate `deno check --no-lock supabase/functions/issue-session/index.ts`
   and `deno check --no-lock supabase/functions/complete-game/index.ts`.
5. **Automated code-review feedback loop.** Review the diff from a
   senior-engineer stance for auth-boundary mistakes, 401-vs-403 drift, session
   scoping mistakes, stale error bodies, and overexposed response fields. Land
   review-fix commits separately when that makes the history easier to audit.
6. **Structure review.** Compare redeem and reverse for shared parsing/auth
   duplication. Extract only a small, obvious seam; otherwise log follow-up debt
   rather than widening A.2b.
7. **Documentation currency sync.** Update the parent design and predecessor
   plan so they reference the actual A.2b plan doc and the final test/contract
   wording used here. Update `docs/architecture.md` and any other triggered doc
   only if the implemented shape differs from current narrative.
8. **Final validation.** Run `npm run lint`, `npm test`,
   `npm run test:functions`, and `npm run build:web` on a clean tree. Run
   `deno check --no-lock` on all three new function entrypoints, plus
   `issue-session` / `complete-game` if shared helpers changed.
9. **Manual backend verification.** Against a local stack or Supabase branch
   project, exercise:
   - redeem with valid agent token
   - redeem with unauthorized token
   - reverse with valid organizer token
   - attendee status before redeem, after redeem, and after reverse using the
     same signed session
   Note explicitly if this environment is unavailable locally.
10. **PR preparation.** Open a PR against `main` using the required template.
    Call out that A.2b is additive backend work only: new HTTP surfaces, no new
    frontend route behavior yet.

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `feat(functions): add redeem entitlement wrapper` | `npm run test:functions`, `deno check --no-lock supabase/functions/redeem-entitlement/index.ts` |
| 2 | `feat(functions): add reverse redemption wrapper` | `npm run test:functions`, `deno check --no-lock supabase/functions/reverse-entitlement-redemption/index.ts` |
| 3 | `feat(functions): add attendee redemption status endpoint` | `npm run test:functions`, `deno check --no-lock supabase/functions/get-redemption-status/index.ts` |
| 4 | `docs: sync redemption a.2b planning` | `npm run lint`, `npm run build:web` |

Review-fix commits, if any, land between 3 and 4.

## Tests

### `tests/supabase/functions/redeem-entitlement.test.ts`

What the suite must prove:

- `OPTIONS` returns the shared CORS policy.
- non-POST methods return `405`.
- disallowed origin returns `403`.
- missing server config returns `500`.
- missing bearer token returns `401`.
- invalid bearer token returns `401`.
- malformed body or non-4-digit suffix returns `400`.
- RPC `redeemed_now` returns `200` with the success envelope.
- RPC `already_redeemed` returns `200` with the success envelope.
- RPC `not_authorized` returns `403`.
- RPC `not_found` returns `404`.
- RPC `internal_error` or null-data path returns `500`.
- the RPC call is made with the caller's bearer token forwarded, not a
  service-role-only client.

### `tests/supabase/functions/reverse-entitlement-redemption.test.ts`

What the suite must prove:

- same origin/method/config/auth gates as redeem
- blank `reason` normalizes to `null`
- non-blank `reason` is passed through trimmed
- RPC `reversed_now` returns `200`
- RPC `already_unredeemed` returns `200`
- RPC `not_authorized` / `not_found` / `internal_error` map to
  `403` / `404` / `500`

### `tests/supabase/functions/get-redemption-status.test.ts`

What the suite must prove:

- `OPTIONS`, method, origin, and config gates mirror existing session-bound
  functions
- missing or invalid signed session returns `401`
- malformed body returns `400`
- no entitlement for `(eventId, sessionId)` returns `404`
- unredeemed entitlement returns `200` with
  `redemptionStatus='unredeemed'` and null `redeemedAt`
- redeemed entitlement returns `200` with
  `redemptionStatus='redeemed'` and populated `redeemedAt`
- reversed entitlement returns `200` with
  `redemptionStatus='unredeemed'` and populated `redemptionReversedAt`
- event scoping is enforced at lookup time: a session that has an entitlement
  under event A gets `404` when requesting event B

## Self-Review Audits

Run the applicable named audits from [`docs/self-review-catalog.md`](../self-review-catalog.md):

- **Edge Function / shared-contract surface:** standard senior-engineer review
  plus a no-drift check against the A.2a envelope contract. No existing catalog
  entry maps one-to-one to pure HTTP-envelope wiring, so this phase relies on
  the explicit contract tables above.
- **CI / validation surface:** `Readiness-gate truthfulness audit` if the phase
  adds any new helper script, integration probe, or readiness check.
- **Frontend/browser surface:** `Error-surfacing for user-initiated mutations`
  only if the scope expands into `apps/web/src/lib/gameApi.ts` or any user-facing
  consumer. If that happens unexpectedly, update the plan before implementation
  continues.
- **SQL surface sentinel:** `Grant/body contract audit` if implementation
  uncovers a need to touch SQL grants or RPC bodies. That scope drift should be
  treated as a stop-and-report moment, not folded silently into A.2b.

## Validation Expectations

- `npm run lint` — passes.
- `npm test` — passes; A.2b should not regress the existing Vitest surface even
  if it adds no new browser tests.
- `npm run test:functions` — passes with the three new Deno handler test files.
- `npm run build:web` — passes.
- `deno check --no-lock supabase/functions/redeem-entitlement/index.ts` —
  passes.
- `deno check --no-lock supabase/functions/reverse-entitlement-redemption/index.ts`
  — passes.
- `deno check --no-lock supabase/functions/get-redemption-status/index.ts` —
  passes.
- If shared session or CORS helpers change, also run:
  - `deno check --no-lock supabase/functions/issue-session/index.ts`
  - `deno check --no-lock supabase/functions/complete-game/index.ts`
- Manual: invoke all three new endpoints against a local stack or Supabase
  branch project and confirm the observable statuses and bodies match the locked
  contract.

## Risks and Mitigations

- **401 vs 403 collapse.** If the wrappers rely only on RPC `not_authorized`,
  invalid bearer tokens become indistinguishable from valid-but-unassigned
  callers. Mitigation: verify the bearer token before the RPC call and reserve
  `403` for the role gate outcome.
- **Service-role context accidentally bypasses the caller JWT.** A raw
  service-role client would either fail the A.2a grant/body contract or execute
  under the wrong claims. Mitigation: tests assert that redeem/reverse call the
  RPC through a forwarded-user-token client.
- **Attendee status lookup leaks beyond the signed session boundary.**
  Accepting a code or querying without `eventId` would create a new probe
  surface. Mitigation: lock the request body to `{ eventId }` and query only by
  `(event_id, client_session_id)`.
- **Function-test runner drift from the parent design wording.** The parent
  design originally called out Vitest for HTTP mapping, but this repo's Edge
  Function handler tests run under Deno. Mitigation: A.2b treats Deno tests as
  the primary function-runner contract and uses Vitest only if a later browser
  consumer appears.

## Rollback Plan

A.2b is additive. Rollback is function- and docs-only.

1. Redeploy the previous Edge Function set, or remove the three new functions
   from the deployed project if they have not been consumed yet.
2. Remove `shared/redemption.ts` only after the functions and any future caller
   have been rolled back together.
3. Revert the A.2b docs updates so the parent design and predecessor plan do
   not point at a phase that is no longer active.
4. No database rollback is required because A.2b does not change schema, RPC
   bodies, or RLS.

## Resolved Decisions

- **Attendee status is session-bound.** `get-redemption-status` authenticates
  via the existing signed browser session and accepts only `eventId` in the
  body.
- **A.2b does not ship frontend UI.** The backend endpoints land first; Phase B
  and Phase C consume them later.
- **Operator wrappers validate bearer tokens up front.** Missing/invalid token
  is `401`; event-role denial stays `403`.
- **A.2b uses Deno tests for Edge Function handlers.** Vitest remains available
  for future browser/shared consumers but is not the primary function test
  runner in this phase.

Open questions blocking A.2b: none. If implementation discovers that a stable
HTTP contract cannot be delivered without changing the A.2a SQL surface, stop
and reopen the design boundary instead of widening this phase inline.

## Handoff After A.2b

- The backend exposes three stable HTTP endpoints for the redemption MVP.
- Phase B can build operator UI against the redeem and reverse endpoints.
- Phase C can build attendee polling/refresh behavior against the session-bound
  status endpoint.
- Phase D role seeding and the volunteer dry run remain blocked on the later UI
  phases, not on backend transport work.
