# M3 Phase 3.3.1 — Demo-Mode Bypass: Write-Side Server Rejection

## Status

Landed.

The promotion-gate self-review walked the plan + scoping doc
end-to-end on 2026-05-03 and resolved each plan-drafting
deferral, including a load-bearing factoring change to the
helper shape (returns body-not-Response so the helper composes
against both CORS patterns the five mutation functions use)
surfaced during the walk. The implementing PR flipped Status to
`Landed` per AGENTS.md "Plan-to-PR Completion Gate." No commit
SHAs in the Status block.

## Context

Phase 3.3.1 ships the **server-side write-rejection** half of
M3's demo-mode auth bypass. The matching **client UI + noindex
emit + M3 closer** half ships in phase 3.3.2 (plan-drafting
runs after 3.3.1 merges per AGENTS.md "Phase Planning Sessions"
cadence).

The 3.3.1 / 3.3.2 split is the user-named seam in
[`scoping/m3-phase-3-3-1.md` decision 1](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md):
3.3.1 isolates the trust-boundary work (helper shape +
auth-vs-parse ordering normalization on the two redemption
functions), and 3.3.2 ships the browser-shape work (disabled-
state UI, noindex hook, M2 copy, doc currency, Status flips).
The original combined 3.3 plan briefly drafted on this branch
(commit b666078) is superseded by this split.

The server-side contract — HTTP 403 with structured error body
keyed by `demo_mode_read_only` against the AND of "the
request's `eventId` resolves to an allowlist slug" and "no auth
context is present" — comes from
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts item 5. This phase implements that contract uniformly
across all five mutation Edge Functions.

What this phase touches at the conceptual level: server-side
trust boundary across five Edge Functions, plus a new shared
helper. No client changes, no doc-currency closer edits, no
schema changes, no migrations. The diff surface is
`supabase/functions/_shared/demo-mode-rejection.ts` (new) +
five `index.ts` edits + five `*.test.ts` extensions + the
milestone-doc Phase Status table edit + this plan's Status flip.

## Goal

Land the server-side demo-mode write rejection across all five
mutation Edge Functions with uniform helper invocation
ordering. Specifically:

- Each of the five mutation Edge Functions returns HTTP 403
  with the structured body
  `{ "error": "demo_mode_read_only", "message": "Demo mode —
  sign in to make changes." }` when invoked against a
  test-event slug by an unauthenticated caller, and continues
  to its existing auth gate for every other case.
- The helper invocation sits at the same logical position in
  every function: after request-body parse + validation, before
  the existing auth-gate call.
- The two redemption functions (`redeem-entitlement`,
  `reverse-entitlement-redemption`) are reordered from auth-
  first to parse-first (parse → demo-rejection → auth) to
  achieve uniform helper-invocation ordering. The reorder is
  audited specifically for trust-boundary regressions.
- The five existing per-function Deno tests under
  `tests/supabase/functions/` each gain demo-mode 403
  assertions covering: anon caller on a test slug → structured
  403; anon caller on a non-test slug → existing 401; signed-in
  caller on a test slug → continues to existing auth gate.
  The two reordered functions also gain assertions that an
  **anon** caller passing an invalid payload now sees the
  payload-validation 400 (newly surfaced by the reorder;
  previously the 401 fired first because auth ran before
  parse, so anon callers never reached payload validation
  regardless of payload shape).
- The milestone doc's Phase Status table grows from the single
  3.3 row to two rows (3.3.1 + 3.3.2); the 3.3.1 row Status
  flips `Proposed` → `Landed` with PR column populated; the
  3.3.2 row stays `Proposed` with `_pending_` until 3.3.2's
  plan drafts.
- This plan's Status flips `Proposed` → `Landed`.

After 3.3.1 merges, 3.3.2 plan-drafting becomes runnable
against the merged server-rejection surface. The M3 milestone
doc's top Status remains `Proposed` until 3.3.2 closes M3.

## Cross-Cutting Invariants

This phase binds the four milestone-level invariants from
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
verbatim — single-source-of-truth allowlist, real events never
receive bypass, cross-app demo signaling stays honest,
cross-milestone copy contract revision lands with bypass (the
fourth invariant binds the M2 role-door copy revision in M3's
**closing** PR, which is 3.3.2 per scoping decision 1; 3.3.1's
diff does not touch the M2 role-door cards). The plan also
inherits the URL contract, theme route scoping, theme token
discipline, in-place auth, auth integration, and trust-
boundary invariants from the parent epic per the milestone
doc's "Inherited from upstream invariants" paragraph.

**Per-phase additions** (specific to this phase's diff
surface):

- **Server-side slug derivation, never client-side claim.** The
  `demo_mode_read_only` 403 short-circuit predicate is
  evaluated against the slug *resolved from the request's
  `eventId` server-side*, not against any slug field in the
  request body. The five mutation Edge Functions do not accept
  a `slug` body field; the `evaluateDemoModeRejection` shared
  helper performs the `eventId → slug` lookup against
  `game_events` with service-role privileges. Per Cross-Phase
  Invariant 1, server-side resolution is the enforced path.
- **Demo-mode rejection helper is the single canonical site
  for the resolve-slug + check-allowlist + check-no-auth-
  context sequence.** No mutation Edge Function may inline any
  of the four steps (slug resolve, allowlist check, no-auth-
  context check, structured-403 format) outside the shared
  helper. Per Cross-Phase Invariant 1's "no per-site
  duplication."
- **All five mutation Edge Functions invoke the helper between
  payload parse and existing auth gate, in that exact order.**
  Today three functions (the authoring trio: `save-draft`,
  `publish-draft`, `unpublish-event`) already parse before
  authing; two functions (the redemption pair:
  `redeem-entitlement`,
  `reverse-entitlement-redemption`) auth before parsing. This
  phase reorders the two redemption functions to the
  parse-first shape so helper invocation is uniform. After
  this phase merges, no mutation Edge Function may regress to
  auth-before-parse without breaking the invariant.
- **The structured 403 body's `error` field is exactly
  `demo_mode_read_only` on every function.** The error code is
  client-switchable; the `message` field is human-readable
  copy and may evolve, but the `error` field is the contract.

## Naming

- **`evaluateDemoModeRejection`** — the new shared helper at
  `supabase/functions/_shared/demo-mode-rejection.ts`. Async
  function; accepts the request, the validated `eventId`, and
  a service-role Supabase admin client; returns either `null`
  (caller continues to its existing auth gate) or a
  `DemoModeRejectionBody` (the rejection-body shape; caller
  wraps with its own HTTP 403 response composition).
- **`DemoModeRejectionBody`** — the exported type
  `{ error: "demo_mode_read_only"; message: string }`. The
  `error` field is bound; the `message` field is plan-bound
  to "Demo mode — sign in to make changes." per Contracts
  "Helper shape" step 4.
- **`demo_mode_read_only`** — the structured-error-body
  `error` field. Final spelling matches the 3.1-named
  contract (`Verified by:`
  [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md));
  unchanged here.
- **`noAuthContext`** (working) — the helper's internal
  predicate name for "no `Authorization` Bearer token in the
  request headers." This mirrors exactly what the existing
  auth gates the helper composes against accept as auth
  context — `event-organizer-auth.ts:64`,
  `redemption-operator-auth.ts:14-23`, and `admin-auth.ts:7`
  all read auth via `readBearerToken` only; signed session
  cookies are not part of the mutation Edge Functions' auth
  surface (those are checked by the player-session functions
  `complete-game`, `issue-session`, `get-redemption-status`
  via `readVerifiedSession`, none of which are in this
  phase's diff). Predicate symmetry between the helper's
  no-auth-context check and the auth gates' positive auth
  check is the load-bearing property — if the helper checked
  *more* than the auth gate (e.g., also rejected callers
  carrying a player session cookie), demo-mode rejection
  would fire on requests the auth gate would have rejected
  with 401 anyway, leaking nothing useful and shifting the
  status code; if the helper checked *less*, a future auth-
  context shape (e.g., adding session-cookie auth to a
  mutation function) would silently let demo-mode rejection
  miss the new shape.

## Contracts

### Helper shape (`evaluateDemoModeRejection`)

The shared helper at
`supabase/functions/_shared/demo-mode-rejection.ts` exports an
async function with the signature
`evaluateDemoModeRejection(args: { request: Request; eventId:
string; supabaseAdmin: SupabaseClient }): Promise<DemoModeRejectionBody | null>`,
plus the `DemoModeRejectionBody` type
`{ error: "demo_mode_read_only"; message: string }` exported
alongside the function. Returning `null` means "not in demo
mode — caller continues to its existing auth gate"; returning
a body means "demo mode rejection — caller wraps with HTTP
403 using its own response composition."

The body-not-Response return type is the **load-bearing
factoring decision** of this helper. The five mutation
functions today use two different CORS-response patterns:

- The three authoring functions (`save-draft`,
  `publish-draft`, `unpublish-event`) use the
  `_shared/authoring-http.ts` wrapper which provides
  `context.jsonResponse(status, body)` —
  CORS handled internally by the wrapper.
- The two redemption functions (`redeem-entitlement`,
  `reverse-entitlement-redemption`) use a function-local
  `jsonResponse(status, body, origin, createCorsHeaders)`
  helper with explicit `origin` extraction and the injected
  `dependencies.createCorsHeaders` factory.

A `Response`-returning helper would need either a
CORS-formatter callback in its arguments (couples the helper
to CORS) or an in-helper duplicate of the wrapper's behavior
(couples the helper to one of the two patterns and leaves the
other functions unable to use it without re-wrapping). The
body-only return punts response composition to the caller,
which already knows its own pattern. Each call site composes
~3 lines: `const demoBody = await evaluateDemoModeRejection(...);
if (demoBody) return <function's existing 403 wrapper>(demoBody);`

The helper:

1. **Reads the `Authorization` header for a Bearer token.**
   Returns `null` if a Bearer token is present (caller
   continues to its existing auth gate; demo-mode rejection
   does not apply to authenticated callers). The Bearer-token
   check matches `readBearerToken` in
   [`event-organizer-auth.ts:5-14`](/supabase/functions/_shared/event-organizer-auth.ts),
   [`redemption-operator-auth.ts:14-23`](/supabase/functions/_shared/redemption-operator-auth.ts),
   and [`admin-auth.ts:7-15`](/supabase/functions/_shared/admin-auth.ts) —
   the helper either inlines the same shape or imports a
   shared `readBearerToken` extracted at implementation time
   (per the existing helpers' "Bearer-token reading is
   duplicated rather than extracted from `admin-auth.ts` so
   the two helpers stay independently auditable" comment at
   [`event-organizer-auth.ts:20-22`](/supabase/functions/_shared/event-organizer-auth.ts),
   the duplication-vs-extraction trade is conscious; the
   implementing PR picks against that comment's reasoning).
2. **Resolves slug from `eventId`** via
   `supabaseAdmin.from("game_events").select("slug").eq("id",
   eventId).maybeSingle()`. If the row is missing or the query
   errors, returns `null` — defer to the existing auth gate's
   missing-event handling.
3. **Checks allowlist membership** via `isTestEventSlug` from
   `shared/events/testEventAllowlist.ts`. If false, returns
   `null`.
4. **Else, returns the rejection body**
   `{ error: "demo_mode_read_only", message: "Demo mode —
   sign in to make changes." }`.

The Bearer-token check fires **first** as a cheap escape
hatch — most authenticated requests skip the DB SELECT
entirely. The DB SELECT only fires when no Bearer is present,
which already implies the request would fail the auth gate.

The signature and behavior above are the final contract —
plan-drafting confirmed during the promotion-gate walk. The
implementing PR may adjust naming for stylistic consistency
with sibling helpers; those adjustments surface in the PR
body's `## Estimate Deviations` section per AGENTS.md
"Plan-to-PR Completion Gate"; the behavior is bound and may
not change without a plan amendment.

### Per-function helper invocation

Every mutation Edge Function invokes
`evaluateDemoModeRejection` at the **same logical position**:
after request-body parse + validation, before the existing
auth-gate call. If the helper returns a body, the function
wraps it with HTTP 403 using its own response composition
(per the Helper-shape "body-not-Response" rationale above):

- The three authoring functions (`save-draft`,
  `publish-draft`, `unpublish-event`) call
  `context.jsonResponse(403, demoBody)` — the
  `_shared/authoring-http.ts` wrapper handles CORS
  internally.
- The two redemption functions (`redeem-entitlement`,
  `reverse-entitlement-redemption`) call the function-local
  `jsonResponse(403, demoBody, origin, dependencies.createCorsHeaders)`
  — the same shape the existing 401 paths in those functions
  already use (`Verified by:`
  [`redeem-entitlement/index.ts:184-191`](/supabase/functions/redeem-entitlement/index.ts),
  [`reverse-entitlement-redemption/index.ts:210-216`](/supabase/functions/reverse-entitlement-redemption/index.ts)).

If the helper returns `null`, the function continues to its
existing auth gate unchanged.

The five call sites (line numbers are scoping-snapshot
estimates re-verified at plan-drafting):

- **`supabase/functions/save-draft/index.ts`** — already
  parse-first
  ([line 321-330](/supabase/functions/save-draft/index.ts) parse;
  [line 340-349](/supabase/functions/save-draft/index.ts)
  rawContentId extraction;
  [line 351](/supabase/functions/save-draft/index.ts)
  `authenticateEventOrganizerOrAdmin`). Helper invoked between
  rawContentId extraction (line 349) and the auth-gate call
  (line 351). The pre-auth `rawContentId` extraction at lines
  340-349 — and the explicit CPU-amplification-boundary
  comment at lines 332-339 — stay exactly as today; the
  `parseAuthoringGameDraftContent` work continues to fire only
  after auth. The helper uses `rawContentId` as the `eventId`
  argument.
- **`supabase/functions/publish-draft/index.ts`** — already
  parse-first
  ([line 162-171](/supabase/functions/publish-draft/index.ts)
  parse; [line 173](/supabase/functions/publish-draft/index.ts)
  auth). Helper invoked between parse (line 171) and auth
  (line 173). Uses `payload.eventId`.
- **`supabase/functions/unpublish-event/index.ts`** — already
  parse-first
  ([line 113-122](/supabase/functions/unpublish-event/index.ts)
  parse; [line 124](/supabase/functions/unpublish-event/index.ts)
  auth). Helper invoked between parse (line 122) and auth
  (line 124). Uses `payload.eventId`.
- **`supabase/functions/redeem-entitlement/index.ts`** —
  currently auth-first
  ([line 178](/supabase/functions/redeem-entitlement/index.ts)
  auth; [line 193-204](/supabase/functions/redeem-entitlement/index.ts)
  parse). **Reordered:** payload parse + validation block at
  current lines 193-204 moves above the auth-gate call at
  current line 178; helper invoked between the new parse
  position and the auth-gate call. Uses `payload.eventId`.
- **`supabase/functions/reverse-entitlement-redemption/index.ts`**
  — currently auth-first
  ([line 204](/supabase/functions/reverse-entitlement-redemption/index.ts)
  auth; [line 219-230](/supabase/functions/reverse-entitlement-redemption/index.ts)
  parse). **Reordered:** payload parse + validation block at
  current lines 219-230 moves above the auth-gate call at
  current line 204; helper invoked between the new parse
  position and the auth-gate call. Uses `payload.eventId`.

Configuration plumbing on the redemption functions (the
`supabaseUrl` / `serviceRoleKey` / `supabaseClientKey` checks
at lines 165-176 of redeem-entitlement and 191-202 of reverse-
entitlement-redemption) stays in its current position — those
checks fire before any payload work and continue to do so;
they are environment validations, not auth or parse work.

### Auth-vs-parse ordering normalization

The two redemption functions are reordered from auth-first to
parse-first. Reorder mechanics:

- **`redeem-entitlement/index.ts`:** the four-line block
  `const payload = validateRedeemPayload(await
  request.json().catch(() => null)); if (!payload) { return
  jsonResponse(400, ...); }` (current lines 193-204) moves
  above the auth-gate call (current line 178). The new
  helper invocation lands between this moved block and the
  auth-gate call.
- **`reverse-entitlement-redemption/index.ts`:** same shape;
  the parse block at current lines 219-230 moves above the
  auth-gate call at current line 204.

The reorder is **safe** because:

- `validateRedeemPayload`
  ([`redeem-entitlement/index.ts:86-110`](/supabase/functions/redeem-entitlement/index.ts))
  and `validateReversePayload`
  ([`reverse-entitlement-redemption/index.ts:95-135`](/supabase/functions/reverse-entitlement-redemption/index.ts))
  are pure shape checks: typeof guards, regex match
  (`^[0-9]{4}$` on the four-digit code suffix), and trim. No
  database reads, no parse-tree walks, no allocation of
  meaningful size. They do NOT perform CPU-amplification-
  class work pre-auth the way `save-draft`'s
  `parseAuthoringGameDraftContent` would —
  [`save-draft/index.ts:332-339`](/supabase/functions/save-draft/index.ts)'s
  explicit CPU-amplification-boundary comment is the load-
  bearing reasoning for keeping `parseAuthoringGameDraftContent`
  post-auth there; no analogous expensive parse exists in the
  redemption validators.
- The existing 401 path is preserved — for an unauthenticated
  caller on a non-test slug, the helper returns `null` and
  the auth gate fires the existing 401. The only behavior
  change for unauthenticated callers on non-test slugs is
  that the payload validation 400 may now fire *before* the
  401 if the payload is invalid; this is the more honest
  response shape and is asserted by the new Deno test cases
  per Contracts "Test surface."
- The trust boundary on real events is unchanged: the helper
  returns `null` for non-allowlist slugs; the existing auth
  gate runs as today.

The reorder is audited specifically per Self-Review Audits
"Auth-vs-parse-ordering audit."

### Test surface (per-function Deno test extensions)

Each existing per-function Deno test under
`tests/supabase/functions/` gains demo-mode assertions:

- **`tests/supabase/functions/save-draft.test.ts`** — adds:
  - Anon caller, eventId resolves to allowlist slug → 403,
    body has `error: "demo_mode_read_only"`.
  - Anon caller, eventId resolves to non-allowlist slug →
    existing 401 unchanged.
  - Signed-in caller, eventId resolves to allowlist slug →
    continues to existing auth gate; 403 NOT returned (the
    existing auth-success path still fires).
- **`tests/supabase/functions/publish-draft.test.ts`** — same
  three assertions.
- **`tests/supabase/functions/unpublish-event.test.ts`** —
  same three.
- **`tests/supabase/functions/redeem-entitlement.test.ts`** —
  the same three plus a fourth: **anon** caller with invalid
  payload → 400 fires (the case the reorder newly exposes;
  previously the 401 fired first because auth ran before parse,
  so anon callers never reached payload validation; today
  authenticated callers with invalid payloads already see 400
  because auth succeeds first then validation runs, so the
  authenticated case is unchanged).
- **`tests/supabase/functions/reverse-entitlement-redemption.test.ts`**
  — same four assertions.

The helper's unit-level coverage is implicit through the five
integration paths; a separate unit test file is unnecessary.

### Doc-currency edits (3.3.1's scope)

3.3.1 owns only:

- **`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`**:
  - Phase Status table grows from the single 3.3 row to
    two rows (3.3.1 + 3.3.2) per scoping decision 8.
  - 3.3.1 row Status: `Proposed` → `Landed`; PR column
    populated.
  - Sequencing paragraph receives a minor addition naming the
    3.3 → 3.3.1 + 3.3.2 split, parallel to the 3.2-time row-
    growth note.
- **`docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md`**
  Status: `Proposed` → `Landed`.

3.3.1 does **not** touch:

- README, architecture, product, backlog, styling, operations
  (M3-closing edits — owned by 3.3.2).
- Milestone-doc top Status (M3 still in progress at 3.3.1
  merge — flips at 3.3.2's merge).
- Epic Milestone Status table M3 row (M3 still in progress —
  flips at 3.3.2's merge).
- `docs/open-questions.md` (closed by 3.1).
- `m2-phase-2-3-plan.md` (confirmation pass owned by 3.3.2).

### Status flips

Atomic with this phase's implementing PR:

- This plan: `Proposed` → `Landed` (in the implementing
  PR's Status edit per AGENTS.md "Plan-to-PR Completion Gate";
  the `In draft` → `Proposed` flip was completed on 2026-05-03
  during the promotion-gate self-review).
- `m3-demo-mode-auth-bypass.md` Phase Status table 3.3.1 row
  Status: `Proposed` → `Landed` with PR column populated.

Validation Gate fully satisfiable pre-merge (no Tier 5 split).

## Files To Touch

This list is an **estimate** of the expected file inventory
per AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may revise it when a structural call requires
deviation; deviations are reported via the PR body's
`## Estimate Deviations` callout. Estimate scope is what
scoping read on 2026-05-03; plan-drafting re-verifies at
implementation time.

### New

- `supabase/functions/_shared/demo-mode-rejection.ts` — the
  new `evaluateDemoModeRejection` helper, plus the exported
  `DemoModeRejectionBody` type and the structural
  `DemoModeRejectionSupabaseAdmin = Pick<ReturnType<typeof
  createClient>, "from">` type alias used to type the
  `supabaseAdmin` parameter (the alias avoids the lint
  `no-explicit-any` triggered by `SupabaseClient<any, any,
  any>`; behavior unchanged).
- `tests/supabase/functions/demo-mode-rejection.test.ts` —
  six-case helper unit-test file (Bearer present, allowlist +
  anon, non-allowlist + anon, missing row, transient query
  error, non-Bearer Authorization). Added during
  implementation: the per-function tests stub
  `evaluateDemoModeRejection` so they cannot make real network
  calls under the project's `--allow-env --no-lock` Deno test
  permissions, which means the plan's "implicit through the
  five integration paths" coverage claim does not hold; the
  unit-test file restores direct coverage of the helper's own
  logic.
- `docs/plans/epics/demo-expansion/m3-phase-3-3-1-plan.md` —
  this file. Originally introduced in PR #166 at the
  `In draft` → `Proposed` promotion gate; this PR's edit is
  the Status flip to `Landed` plus the estimate reconciliation
  in this section.
- `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md`
  — the scoping doc, also introduced in PR #166. Not edited
  by this PR; deletes in batch at 3.3.2's PR per
  Documentation Currency PR Gate.

### Modify

- `supabase/functions/save-draft/index.ts` — invoke helper
  between rawContentId extraction and auth.
- `supabase/functions/publish-draft/index.ts` — invoke helper
  between parse and auth.
- `supabase/functions/unpublish-event/index.ts` — invoke helper
  between parse and auth.
- `supabase/functions/redeem-entitlement/index.ts` — reorder
  parse above auth; invoke helper between parse and auth.
- `supabase/functions/reverse-entitlement-redemption/index.ts`
  — same reorder + helper invocation.
- `tests/supabase/functions/save-draft.test.ts` — extend per
  Contracts "Test surface."
- `tests/supabase/functions/publish-draft.test.ts` — same.
- `tests/supabase/functions/unpublish-event.test.ts` — same.
- `tests/supabase/functions/redeem-entitlement.test.ts` —
  extend with the four assertions including the new
  payload-400 case.
- `tests/supabase/functions/reverse-entitlement-redemption.test.ts`
  — same four-assertion extension.
- `tests/supabase/functions/authoring-helpers.ts` — exports a
  shared `noopEvaluateDemoModeRejection` constant the three
  authoring tests share. Added during implementation; not in
  the original Files To Touch estimate. The DRY constant
  replaces three otherwise-identical inline async-no-op stubs
  added at the new `evaluateDemoModeRejection` dependency
  property across `save-draft.test.ts`, `publish-draft.test.ts`,
  and `unpublish-event.test.ts`.
- `docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`
  — 3.3.1 row Status flip (`Proposed` → `Landed`) + PR column
  populated. The Phase Status table row growth (3.3 → 3.3.1 +
  3.3.2) and the Sequencing paragraph addition naming the
  3.3.1/3.3.2 split shipped with the scoping doc in PR #166;
  this PR does not re-grow the row or re-add the prose.

### Intentionally not touched

This list is an **estimate** of files the planner expects
implementation does not need to touch. Per AGENTS.md "Plan
content is a mix of rules and estimates," touching one of
these is a structural call the implementer is authorized to
make if the right shape requires it; deviations land in the
PR's `## Estimate Deviations` section.

- `shared/events/testEventAllowlist.ts` — the 3.2-shipped
  allowlist; consumed by the helper via import. Not modified.
- `supabase/functions/_shared/event-organizer-auth.ts`,
  `supabase/functions/_shared/redemption-operator-auth.ts`,
  `supabase/functions/_shared/cors.ts`,
  `supabase/functions/_shared/authoring-http.ts` —
  existing helpers; the new helper consumes the CORS helper
  for response shaping and reads the same `Authorization`
  header pattern the auth gates do, but does not modify
  them. `_shared/session-cookie.ts` is intentionally NOT
  consumed — the mutation Edge Functions don't accept signed
  session cookies as auth context, so the helper doesn't
  check them.
- `supabase/functions/read-demo-event/index.ts` — the 3.2
  read shim; unchanged.
- All apps/web files — 3.3.2's scope; 3.3.1 is server-only.
- All apps/site files — 3.3.2's scope; 3.3.1 does not touch
  apps/site.
- `apps/web/src/demo/DemoModeBanner.tsx`, the read-only
  variants, the SCSS partial — 3.3.2's scope.
- `tests/e2e/demo-mode-bypass.spec.ts` — 3.3.2 extends; 3.3.1
  does not.
- `supabase/config.toml` — unchanged (no new functions).
- `package.json`, `vercel.json` — unchanged.
- README, architecture, product, backlog, styling,
  operations, dev, open-questions — 3.3.2 owns the M3 closer;
  3.3.1 does not edit these.
- `m3-demo-mode-auth-bypass.md` top Status — flips at 3.3.2.
- `epic.md` — flips at 3.3.2.
- `m2-phase-2-3-plan.md` — 3.3.2 confirmation pass.

## Execution Steps

This list is an **estimate** of the expected step ordering
per AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may resequence; deviations land in the PR's
`## Estimate Deviations` section.

1. **Author the helper** at
   `supabase/functions/_shared/demo-mode-rejection.ts` per
   Contracts "Helper shape."
2. **Wire the helper into the three parse-first authoring
   functions** (`save-draft`, `publish-draft`,
   `unpublish-event`). Add the helper invocation; no reorder
   needed.
3. **Extend the three authoring functions' Deno tests** with
   the three demo-mode assertions per Contracts "Test
   surface." Run `npm run test:functions`; the three function
   tests pass.
4. **Reorder `redeem-entitlement/index.ts`** parse above auth;
   wire the helper invocation between. Read
   [`validateRedeemPayload`](/supabase/functions/redeem-entitlement/index.ts)
   first to confirm the validator is cheap (per Contracts
   "Auth-vs-parse ordering normalization" safety reasoning).
5. **Reorder `reverse-entitlement-redemption/index.ts`** parse
   above auth; wire the helper invocation between. Same cheap-
   validator confirmation.
6. **Extend the two redemption functions' Deno tests** with
   the four demo-mode assertions including the new payload-
   400 case. Run `npm run test:functions`; all five mutation
   function tests pass.
7. **Run the Self-Review Audit set** per Self-Review Audits.
   Specifically: composed-predicate auth-shape audit (the
   helper composes before auth gate); auth-vs-parse-ordering
   audit (the two redemption reorders).
8. **Edit the milestone doc** Phase Status table to grow the
   3.3 row to 3.3.1 + 3.3.2; add the Sequencing paragraph
   addition per Contracts "Doc-currency edits."
9. **Flip Status blocks** per Contracts "Status flips": this
   plan, the 3.3.1 milestone-doc row.
10. **Walk the Plan-to-PR Completion Gate** — every Goal,
    Test, Validation step, Self-Review audit named here is
    satisfied or explicitly deferred-with-rationale in this
    plan.
11. **Open the PR** with the canonical body template per
    AGENTS.md.

## Commit Boundaries

This list is an **estimate** of the expected commit shape per
AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may reshuffle; deviations land in the PR's
`## Estimate Deviations` section.

1. **`feat(supabase): add evaluateDemoModeRejection shared
   helper`** — `_shared/demo-mode-rejection.ts`.
2. **`feat(supabase): wire demo-mode 403 short-circuit into
   authoring Edge Functions`** — three `index.ts` edits
   (`save-draft`, `publish-draft`, `unpublish-event`) +
   three `*.test.ts` extensions.
3. **`refactor(supabase): reorder redemption functions to
   parse-then-auth and wire demo-mode 403 short-circuit`** —
   two `index.ts` edits (`redeem-entitlement`,
   `reverse-entitlement-redemption`) + two `*.test.ts`
   extensions covering the demo-mode 403 + the newly-
   surfaced payload-400 case.
4. **`docs(plans): close M3 phase 3.3.1 — flip Status to
   Landed; grow milestone-doc Phase Status row to 3.3.1 +
   3.3.2`** — milestone-doc edits + this plan's Status flip
   + scoping doc retention (deletes in batch at 3.3.2's PR).

## Validation Gate

Per AGENTS.md "Plan-to-PR Completion Gate," all checks below
must pass before merge.

**Automated checks:**

- `npm run lint` — passes.
- `npm run build:web` — passes (no apps/web changes; ensures
  shared module imports resolve cleanly).
- `npm run test` — passes (Vitest; no apps/web unit tests
  added in 3.3.1 but the existing suite must stay green).
- `npm run test:functions` — passes (Deno; the five extended
  per-function test files run; all assertions pass).

**Manual-verify checklist (per AGENTS.md "Bans on surface
require rendering the consequence"):**

3.3.1 ships no user-visible UI surface; manual-verify is
limited to:

- **Inspect the helper's response** for one demo-mode
  rejection case via curl or `supabase functions serve`
  (which exists per `package.json` if it does — plan-drafting
  confirms). Send a `POST /save-draft` with a body containing
  an `eventId` (or `content.id` for save-draft) that resolves
  to `harvest-block-party` from an unauthenticated client;
  confirm the response is HTTP 403, body
  `{ "error": "demo_mode_read_only", "message": "Demo mode
  — sign in to make changes." }`. Repeat for one redemption
  function (e.g., `redeem-entitlement`) to confirm the reorder
  works end-to-end.
- **Inspect a real-event 401 case** to confirm no regression:
  send the same shape with an `eventId` that resolves to a
  non-allowlist slug; confirm the response is the existing
  401.

**Plan-to-PR Completion Gate walk:**

- Every Goal bullet is satisfied or deferred-with-rationale.
- Every Contracts entry is satisfied or deferred-with-
  rationale.
- Every Cross-Cutting Invariant is honored against the diff.
- Every Self-Review Audit is run.
- Every Documentation Currency PR Gate entry is landed.
- This plan's Status flipped from `Proposed` to `Landed` in
  the same PR.
- The milestone-doc Phase Status table 3.3.1 row Status
  flipped to `Landed` in the same PR.
- The PR body's `## Estimate Deviations` section names every
  deviation from the estimate-shaped sections (Files To
  Touch, Execution Steps, Commit Boundaries) or reads `N/A`.

## Self-Review Audits

Plan-drafting walks
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
at implementation time and binds the relevant audits here.
Likely-relevant audits (estimate, per scoping decision
"Open decisions"):

- **Composed-predicate auth-shape audit.** The five mutation
  Edge Functions receive a new shared rejection helper
  composed before existing auth gates; verify gate placement
  and per-branch error semantics. Specifically: when the
  helper's slug-resolution SELECT errors transiently, the
  helper returns `null` to defer to the existing auth gate;
  the audit confirms this branch is documented and that the
  transient-failure case doesn't accidentally bypass the
  rejection. Composed predicates over multiple async calls
  must name per-branch error treatment so transient failures
  on one branch don't silently grant or silently deny.
- **Auth-vs-parse-ordering audit.** The two redemption
  functions reorder parse above auth. The audit walks each
  reorder for trust-boundary regressions: confirm no
  payload-parse path is itself expensive enough to warrant
  pre-auth gating (analogous to `save-draft`'s
  CPU-amplification boundary); confirm no payload field
  carries auth-relevant state that the auth gate consumes;
  confirm the newly-surfaced payload-validation 400 fires for
  anon callers with invalid payloads on the two reordered
  functions (previously they received 401 because auth ran
  before parse).
- **Allowlist-drift audit.** The helper consumes
  `isTestEventSlug` from the shared module; confirm no
  per-site slug literals are introduced anywhere in the diff
  (the new helper, the five Edge Function bodies, the five
  test files). Per
  [`m3-demo-mode-auth-bypass.md` Cross-Phase Risks → "Allowlist
  drift between guard sites"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md).

Plan-drafting confirms the audit set against the on-disk
catalog and replaces this estimate with the final list during
the promotion-gate walk.

## Documentation Currency PR Gate

3.3.1 owns only the milestone-doc Phase Status row updates and
this plan's Status flip per Contracts "Doc-currency edits."
Every other entry in the milestone doc's
[Documentation Currency map](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
is owned by 3.3.2 (the M3-closer); 3.3.1 explicitly defers
each per AGENTS.md "Plan-to-PR Completion Gate"'s
"requirement is either in-scope or deferred" rule.

The four scoping docs under
`docs/plans/epics/demo-expansion/scoping/` (the three earlier
ones plus
`docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md`,
plus
`docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-2.md`
when 3.3.2 drafts) delete in batch at 3.3.2's PR per AGENTS.md
"Phase Planning Sessions → Output set." 3.3.1 does **not**
delete any scoping doc.

## Out Of Scope

This phase explicitly does NOT ship:

- **The apps/web mutation-control disabled-state UI.** Owned
  by 3.3.2.
- **The apps/web noindex emit.** Owned by 3.3.2; mechanism
  choice depends on the strength-of-guarantee question
  3.3.2's scoping resolves first per the milestone-doc
  Cross-Phase Decisions → "noindex emit shape on apps/web
  bypass-rendered routes" entry.
- **The Playwright e2e fixture extension.** Owned by 3.3.2.
- **The M2 role-door copy revision in apps/site.** Owned by
  3.3.2; the M2 copy stays as shipped until 3.3.2 lands.
- **README, architecture, product, backlog, styling, operations
  doc-currency edits.** All owned by 3.3.2.
- **Milestone-doc top Status flip.** Stays `Proposed` after
  3.3.1 merges; flips at 3.3.2.
- **Epic Milestone Status table M3 row flip.** Stays
  `Proposed` after 3.3.1 merges; flips at 3.3.2.
- **`m2-phase-2-3-plan.md` confirmation pass.** Owned by
  3.3.2.
- **Demo-mode write paths against real tables.** Per the
  3.1-bound read-only-for-M3 invariant; B-shaped functionality
  is deferred to a second-iteration M4–M6 scoping pass.
- **Sandbox tables for demo-mode mutations.** Same.
- **Demo-mode allowlist generalization.** Two slugs only.
- **A demo-mode reset story.** No reset-cron, no operator
  script.
- **Pre-populated redemption codes for the demo.** No seeded
  data.
- **A demo-mode framework helper that other apps could
  consume.** apps/web + supabase-functions specific.
- **Changes to `apps/web/src/App.tsx` routing.** Bypass
  branches are page-component-internal.
- **Changes to existing Edge Function auth-gate helpers
  (`event-organizer-auth.ts`, `redemption-operator-auth.ts`).**
  The new helper composes beside them, not inside them.
- **A second-pass partner-feedback capture mechanism.** Named
  in the 3.1 plan's Backlog Impact as a post-M3 backlog item;
  remains a post-epic item.

## Risk Register

References the milestone doc's
[Cross-Phase Risks](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
plan-implementation-level risks named here.

- **Auth-vs-parse reorder opens new attack surface on the
  redemption functions.** The two redemption functions are
  reordered from auth-first to parse-first; the new ordering
  exposes payload-validation work to unauthenticated callers.
  Mitigation: confirmed at plan-drafting that
  `validateRedeemPayload`
  ([`redeem-entitlement/index.ts:86-110`](/supabase/functions/redeem-entitlement/index.ts))
  and `validateReversePayload`
  ([`reverse-entitlement-redemption/index.ts:95-135`](/supabase/functions/reverse-entitlement-redemption/index.ts))
  are pure shape checks (typeof + regex + trim) with no
  CPU-amplification and no auth-relevant state; the
  Self-Review "Auth-vs-parse-ordering audit" walks the reorder
  specifically. The risk surfaces if a future change to either
  validator introduces expensive work — the audit's existence
  in `docs/self-review-catalog.md` is the trip-wire that
  future changes are gated against.
- **Transient SELECT failure on `game_events` interacts with
  the existing auth gate's failure semantics.** The helper
  returns `null` on missing-row or query-error, deferring to
  the auth gate. Confirmed at plan-drafting that both auth-
  gate helpers fail-closed: `authenticateEventOrganizerOrAdmin`
  ([`event-organizer-auth.ts:30-101`](/supabase/functions/_shared/event-organizer-auth.ts))
  returns `unauthenticated` on missing/invalid token, and
  `forbidden` on RPC error per its explicit per-branch
  treatment comment at lines 69-75; `authenticateRedemptionOperator`
  ([`redemption-operator-auth.ts:26-58`](/supabase/functions/_shared/redemption-operator-auth.ts))
  returns `unauthenticated` on token-validation failure with
  no fail-open path. So the helper-returns-null → auth-gate
  composition is safe: a transient SELECT failure on
  `game_events` defers to the auth gate, which then either
  authenticates the caller normally (real auth context
  present) or rejects with 401/403 (no auth context). The
  Self-Review "Composed-predicate auth-shape audit" walks
  this transient-failure-per-branch case explicitly.
- **CORS-pattern divergence between the authoring trio and
  the redemption pair leaves one of the function-pattern
  groups un-CORS'd by the new 403.** The five mutation
  functions use two different CORS-response patterns
  (authoring trio uses `context.jsonResponse` from the
  `authoring-http.ts` wrapper; redemption pair uses a local
  `jsonResponse` with explicit `origin` +
  `dependencies.createCorsHeaders`). Mitigation: the helper
  returns the rejection body only — not a `Response` — so each
  call site composes its own 403 wrapping using its existing
  per-function CORS pattern (per Contracts "Per-function
  helper invocation"). The implementation walks each call
  site against the existing 401 path's response composition
  and mirrors the same shape with status 403 and the demo-
  mode body.

## Backlog Impact

References the milestone doc's
[Backlog Impact](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
and the epic's
[Backlog Impact](/docs/plans/epics/demo-expansion/epic.md).

**Items closed by 3.3.1's PR:**

- None at the milestone or epic level. The "demo-mode access
  to admin / redeem / redemptions surfaces for test-event
  slugs without sign-in" capability closes only when M3
  ships in full at 3.3.2's merge.

**Items unblocked by 3.3.1's PR:**

- Phase 3.3.2 plan-drafting becomes runnable against the
  merged server-rejection surface — the helper, the per-
  function 403 short-circuits, and the structured error code
  are real artifacts 3.3.2's plan-drafting reads (per
  AGENTS.md "Phase Planning Sessions" cadence) when picking
  the disabled-state error-handling shape and when extending
  the e2e fixture for noindex + disabled-state assertions.

**Items added by 3.3.1's PR for post-M3 work:**

- None at the phase level. The post-epic items already named
  in the epic Backlog Impact (demo-mode generalization beyond
  test-event allowlist; production-friendly demo-mode for
  partner-onboarding scenarios) remain unchanged. The
  partner-feedback capture mechanism backlog item the 3.1
  plan named stays open as a post-M3 deliverable; 3.3.2 may
  surface or revise.

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; phase 3.3.1 row at the Phase Status
  table flips to `Landed` at this PR's Status edit.
- [`scoping/m3-phase-3-3-1.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-3-1.md) —
  scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the eight scoping decisions absorbed
  above; deletes in batch at 3.3.2's PR.
- [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md) —
  predecessor phase plan. Contracts items 1–7 are the
  data-access-semantics contract; item 5 is the server-side
  403 + structured body contract this phase implements.
- [`m3-phase-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-2-plan.md) —
  predecessor phase plan. Allowlist module shipped here is the
  immediate input this phase consumes via `isTestEventSlug`.
- [`scoping/m3-phase-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md) —
  predecessor phase scoping doc; deletes in batch at 3.3.2's
  PR.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic; M3 paragraph; Risk Register entry "Demo-mode
  security boundary" the per-function 403 + the five Deno
  test extensions mitigate.
- [`apps/web/src/demo/DemoModeBanner.tsx`](/apps/web/src/demo/DemoModeBanner.tsx),
  [`apps/web/src/admin/DemoModeAdminView.tsx`](/apps/web/src/admin/DemoModeAdminView.tsx),
  [`apps/web/src/redeem/DemoModeRedeemView.tsx`](/apps/web/src/redeem/DemoModeRedeemView.tsx),
  [`apps/web/src/redemptions/DemoModeRedemptionsView.tsx`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx)
  — 3.2-shipped surfaces; 3.3.1 does not modify them
  (3.3.2's scope).
- [`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts) —
  the 3.2-shipped allowlist; consumed by
  `evaluateDemoModeRejection`.
- [`supabase/functions/_shared/event-organizer-auth.ts`](/supabase/functions/_shared/event-organizer-auth.ts),
  [`supabase/functions/_shared/redemption-operator-auth.ts`](/supabase/functions/_shared/redemption-operator-auth.ts),
  [`supabase/functions/_shared/admin-auth.ts`](/supabase/functions/_shared/admin-auth.ts) —
  the auth gates the helper composes before; their
  `readBearerToken` shape is what the helper's
  `noAuthContext` predicate mirrors.
- [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts) —
  CORS helper the new helper's 403 response composes against.
- [`get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts) —
  service-role-client construction precedent.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit catalog plan-drafting walks against this phase's diff
  surface.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-count
  predictions need a branch test" (and "PR-count predictions
  are not contracts"), "Scoping owns / plan owns,"
  "Reality-check gate between scoping and plan,"
  "Plan-to-PR Completion Gate,"
  "`In draft` → `Proposed` promotion gate,"
  "Plan content is a mix of rules and estimates."
