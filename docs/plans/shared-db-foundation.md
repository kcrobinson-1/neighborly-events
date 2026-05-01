# `shared/db/` Foundation Extraction

## Status

Landed.

**Parent epic:** [`event-platform-epic.md`](/docs/plans/event-platform-epic.md),
Milestone M1, Phase 1.1. The epic's M1 row stays `Proposed` until every
phase 1.x plan flips to `Landed`. Sibling phases (1.2 `shared/urls/`,
1.3 `shared/auth/`, 1.4 `shared/events/`, 1.5 `shared/styles/`) own
their own plans.

This plan flips to `Landed` after both subphases below land. Each
subphase is its own PR; each subphase's status row inside this plan
flips when its PR merges. Same two-phase pattern phase 1.5 uses (see
the epic's Sizing Summary line for 1.5 — this phase mirrors it and
the epic update in subphase 1.1.1 names 1.1.1/1.1.2 the same way).

The decision to subphase is grounded in the two deliverables having
different risk profiles. Subphase 1.1.1 is a load-bearing singleton
extraction across an env-source seam; subphase 1.1.2 introduces a new
generated artifact and a CLI-driven workflow. Reviewers walk those
surfaces with different attention; bundling them dilutes both.

| Subphase | Scope | Status |
| --- | --- | --- |
| 1.1.1 | Supabase client factory extraction | Landed |
| 1.1.2 | Generated TypeScript types from Supabase schema | Landed |

## Goal

Stand up `shared/db/` as the canonical home for the Supabase client
factory and the generated DB row types for the domain shapes the parent
epic names (event, draft, organizer/agent role records). After this
phase lands, no app holds a duplicate Supabase client wiring or
duplicate row-type definition for those shapes; both `apps/web`
(today) and `apps/site` (after M1 phase 1.3) can consume the same
primitives.

Runtime validation schemas (Zod or equivalent) are deliberately not in
scope per the parent epic's Phase 1.1 paragraph — they are deferred to
a focused follow-up motivated by a concrete runtime-validation gap
(edge function input validation is the most likely first consumer),
not introduced speculatively as foundation work.

Behavior-preserving for `apps/web`. No runtime behavior, request
shape, persistence path, or authorization rule changes. The seam is
the only thing that changes.

## Cross-Cutting Invariants

These rules thread through every diff line in every subphase. Self-review
walks each one against every changed file in every PR, not only the
file that first triggered the rule.

- **Behavior-preserving for `apps/web`.** The migrated call sites
  produce byte-identical network requests, byte-identical thrown
  error messages, and byte-identical singleton lifecycle. Anything
  observable from outside the migrated module stays the same.
- **Env access stays at the app boundary.** `shared/db/` never reads
  `import.meta.env.*` or `process.env.*` directly. Each app supplies
  its env-derived config to the shared factory through a thin
  per-app adapter. `apps/web`'s adapter is the only adapter that
  ships in this phase; `apps/site`'s adapter lands in M1 phase 1.3.
- **One client per process.** Singleton invariant survives the
  extraction: a given `apps/web` page session still gets exactly one
  `SupabaseClient` instance for browser reads, exactly as today. The
  singleton lives on the app side of the seam (not in `shared/db/`)
  so future SSR consumers can choose their own per-request lifecycle.
- **No new framework-specific dependencies inside `shared/db/`.**
  Anything imported from `shared/db/` must be Vite-safe **and**
  Next.js-safe. No Vite-only globals, no Next.js-only imports, no
  `"use client"` directives.
- **Generated types are not edited by hand.** The output of
  `supabase gen types typescript` is checked in verbatim. Drift is
  surfaced by re-running the generation script, not by manual
  patches.

## Subphase 1.1.1 — Supabase Client Factory Extraction

**Status:** Landed.

### Subphase goal

Move the browser Supabase client factory from
`apps/web/src/lib/supabaseBrowser.ts` into `shared/db/`, with an
explicit env-source seam so the same factory can be reused by
`apps/site` in M1 phase 1.3 without touching the shared module.
Migrate every existing `apps/web` consumer to import from
`shared/db/` (directly or via the per-app adapter — the responsibility
split is below). Behavior-preserving.

### Responsibility split

- **`shared/db/client.ts`** owns the SDK-level wiring: a
  `createBrowserSupabaseClient(config)` factory that takes
  `{ supabaseUrl, supabaseClientKey }` and returns a configured
  `SupabaseClient`, plus the helpers that depend only on a config
  object (`createSupabaseAuthHeaders`, `readSupabaseErrorMessage`).
  No env access. No singleton state.
- **`shared/db/index.ts`** is the public barrel. Re-exports the
  factory, helpers, and the `SupabaseConfig` shape.
- **`apps/web/src/lib/supabaseBrowser.ts`** narrows to a Vite-only
  adapter: reads `import.meta.env`, owns the singleton, exposes
  `getBrowserSupabaseClient()` and `getSupabaseConfig()` with the
  same signatures as today, plus the prototype-fallback gate
  (`isPrototypeFallbackEnabled`, `getMissingSupabaseConfigMessage`,
  `isEnabledFlag`, `getEnvironmentValue`) which are intrinsically
  Vite-coupled and stay in `apps/web`.
- **Call sites** are not touched in this subphase. The apps/web
  adapter re-exports `createSupabaseAuthHeaders` and
  `readSupabaseErrorMessage` from `shared/db/`, so every existing
  import line continues to resolve unchanged. No call site reaches
  into `shared/db/client.ts` for the factory directly — the factory
  is an apps-side concern. Migrating call sites to import the
  helpers from `shared/db/` directly is a separate cleanup that can
  ride along with subphase 1.1.2 if its diff stays small, or live
  as a future low-risk PR; it is not required by this subphase's
  behavior-preserving goal.

### Files to touch — new

- `shared/db/client.ts` — factory + auth-header helper +
  error-message reader. No env access; no singleton.
- `shared/db/index.ts` — barrel re-exporting the public surface.
- `shared/db/README.md` — short ownership note: what `shared/db/`
  owns, what stays in app-side adapters, link back to this plan.

### Files to touch — modify

- [`apps/web/src/lib/supabaseBrowser.ts`](/apps/web/src/lib/supabaseBrowser.ts) —
  narrow to the Vite adapter shape described above. The `createClient`
  call moves to `shared/db/client.ts`; this file imports the factory
  and binds it to the Vite config getter. Keeps the singleton.
  Re-exports `createSupabaseAuthHeaders` and `readSupabaseErrorMessage`
  from `shared/db/` for any call site that imports them through this
  module today (avoids touching every call site for purely
  re-export-path reasons).
- [`apps/web/src/lib/adminGameApi.ts`](/apps/web/src/lib/adminGameApi.ts) —
  imports unchanged in shape; verify the helpers it consumes still
  resolve through the adapter.
- [`apps/web/src/lib/authApi.ts`](/apps/web/src/lib/authApi.ts) —
  same.
- [`apps/web/src/lib/gameApi.ts`](/apps/web/src/lib/gameApi.ts) —
  same.
- [`apps/web/src/lib/gameContentApi.ts`](/apps/web/src/lib/gameContentApi.ts) —
  same.
- [`apps/web/src/redemptions/redemptionsData.ts`](/apps/web/src/redemptions/redemptionsData.ts) —
  same.
- [`apps/web/src/redemptions/authorizeRedemptions.ts`](/apps/web/src/redemptions/authorizeRedemptions.ts) —
  same.
- [`apps/web/src/redeem/authorizeRedeem.ts`](/apps/web/src/redeem/authorizeRedeem.ts) —
  same.
- [`tests/web/lib/adminGameApi.test.ts`](/tests/web/lib/adminGameApi.test.ts) —
  the existing `vi.mock("../../../apps/web/src/lib/supabaseBrowser", …)`
  call still points at the adapter; confirm the mocked `getBrowserSupabaseClient`
  export still satisfies every code path. No test rewrite is intended;
  if the adapter narrows the export surface, the mock object narrows
  the same way.
- [`docs/architecture.md`](/docs/architecture.md) — describe the new
  `shared/db/` layer responsibility (factory + helpers, env-agnostic),
  the per-app adapter pattern, and the Vite/Next.js boundary the
  seam is designed to cross. The "Top-Level Layout" `shared` entry
  expands one bullet about `shared/db/`.
- [`docs/dev.md`](/docs/dev.md) — add a one-paragraph note that
  Supabase-using browser code goes through the per-app adapter, not
  through `shared/db/client.ts` directly. No new validation command
  in this subphase.
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  update the Phase 1.1 paragraph to name subphases 1.1.1 and 1.1.2
  in place of the current "One PR." sentence. Update the Sizing
  Summary line for M1 from "5 phases (phase 1.5 contains 2
  subphases as separate PRs), 6 PRs" to "5 phases (phase 1.1 and
  phase 1.5 each contain 2 subphases as separate PRs), 7 PRs".
  M1 row stays `Proposed`.
- This plan — flip subphase 1.1.1's row to `Landed` in the same PR.

### Files intentionally not touched

- [`shared/game-config/`](/shared/game-config) and
  [`shared/redemption.ts`](/shared/redemption.ts) — different
  shared modules; not consolidating in this phase. Their consumers'
  imports do not change.
- [`apps/site/`](/apps/site) — does not consume `shared/db/`
  until M1 phase 1.3. No `apps/site` source changes in 1.1.x.
- [`supabase/functions/`](/supabase/functions) — server-side
  Deno Supabase clients are a separate seam. Out of scope for the
  entire 1.1.x phase.
- [`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts) —
  constructs a service-role client for fixture setup. Different concern
  from the browser factory; not migrated.
- The generic PostgREST helpers `fetchPostgrestRows` and
  `createPostgrestUrl` in
  [`apps/web/src/lib/gameContentApi.ts`](/apps/web/src/lib/gameContentApi.ts).
  The parent epic's Phase 1.1 paragraph mentions "any existing typed
  query helpers"; in practice the only candidates are these two, and
  their single consumer (`apps/web` published-content reads via raw
  fetch with auth headers) has no second cross-app consumer in scope
  for M1 — `apps/site` will use the SDK client through `shared/db/`,
  not raw PostgREST fetches. Moving them now would be speculative
  consolidation. They stay in `apps/web` until a concrete second
  consumer surfaces.
- Runtime identifiers (`neighborly_session` cookie, `x-neighborly-session`
  header, `neighborly.local-*` storage keys, `@neighborly/web` workspace
  scope) — preserved per
  [`repo-rename.md`](/docs/plans/repo-rename.md) cross-cutting invariants.

### Execution steps

1. **Pre-edit gate.** Confirm clean worktree, on a feature branch
   (not `main`). Confirm Node and npm match `mise.toml` /
   `package.json` engines.
2. **Baseline validation.** Run `npm run lint`, `npm run build:web`,
   `npm run build:site`, `npm test`. All must pass before any edits.
3. **Create `shared/db/`.** Add the new files per "Files to touch —
   new" with the responsibility split above. No app-side import
   changes yet.
4. **Narrow the apps/web adapter.** Edit
   `apps/web/src/lib/supabaseBrowser.ts` to import from `shared/db/`
   and own only the Vite-coupled state (env reading, singleton,
   prototype-fallback gate). Run `npm run lint` and
   `npm run build:web` after this commit; both must pass.
5. **Spot-check call sites.** Walk every consumer named under "Files
   to touch — modify" and confirm imports still resolve. Most files
   should not need an edit; any file that reaches into a moved
   helper through a stale path is updated in this same commit.
6. **Run the focused test surface.** `npm test -- adminGameApi`
   exercises the existing mocks; it must pass without rewriting the
   mock factory's shape.
7. **Documentation update.** Update `docs/architecture.md`,
   `docs/dev.md`, the parent epic's phase 1.1 paragraph, the
   parent epic's Sizing Summary line, and this plan's subphase
   1.1.1 status row. Doc currency is a PR gate per AGENTS.md.
8. **Repeat full validation.** `npm run lint`, `npm run build:web`,
   `npm run build:site`, `npm test`. All must pass.
9. **Automated code-review feedback loop.** Walk the diff from a
   senior-reviewer stance. Confirm: no `import.meta.env` or
   `process.env` reference inside `shared/db/`; no Vite or
   Next.js-specific import inside `shared/db/`; the singleton
   stays in the apps/web adapter; every existing consumer's
   imports still resolve; mocks in `tests/web/lib/adminGameApi.test.ts`
   still cover every path; no `apps/site` source touched.
10. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation step, and Self-Review audit named in this
    subphase. Confirm each is satisfied or explicitly deferred in
    this plan with rationale. Flip subphase 1.1.1's row to
    `Landed`. Plan-level Status stays `Proposed` until subphase
    1.1.2 lands.
11. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](/.github/pull_request_template.md).
    Title under 70 chars. Validation section lists `npm run lint`,
    `npm test`, `npm run test:functions`, `npm run build:web`,
    `npm run build:site` — all run. Target Shape Evidence section
    names the responsibility split and references this plan. UX
    Review section is `N/A` (no user-visible behavior changes).
    Remaining Risk: no live runtime risk; the singleton lifecycle
    is the load-bearing invariant and is verified by the existing
    test surface.

### Validation gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final.
- `npm run build:site` — pass on baseline; pass on final (no
  `apps/site` source touched, but the build must still work).
- `npm test` — pass on baseline; pass on final. The
  `tests/web/lib/adminGameApi.test.ts` mocks specifically must
  continue to cover every path.
- `npm run test:functions` — pass on baseline; pass on final
  (no edge-function source touched, but the runner exists and
  is part of the repo's standard validation set).

### Self-review audits

Named in the parent epic for phase 1.1, drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md):

- **Rename-aware diff classification.** This subphase moves
  `createClient` and two helper functions out of
  `apps/web/src/lib/supabaseBrowser.ts` into `shared/db/client.ts`.
  The diff must classify as rename-vs-edit so reviewers see content
  changes, not move noise. Where a function moved verbatim, the
  PR description names that explicitly so reviewers do not re-read
  unchanged code.
- **Effect cleanup audit.** The auth subscription primitives
  (`subscribeToAuthState`) stay in `apps/web/src/lib/authApi.ts`
  in this subphase; this subphase is browser-client extraction
  only. The audit applies if any subscription's lifecycle
  accidentally crosses into `shared/db/` — confirm no
  `onAuthStateChange` or similar long-lived listener is created in
  shared code.
- **CLI / tooling pinning audit.** No new CLI or framework
  dependency is introduced by this subphase. The audit is named
  here only because it applies to phase 1.1 as a whole; subphase
  1.1.2 is where the audit actually does work (Supabase CLI pin
  for type generation).

## Subphase 1.1.2 — Generated TypeScript Types

**Status:** Landed.

### Subphase goal

Generate the canonical Supabase `Database` TypeScript type from the
local schema and check it into `shared/db/types.ts`. Type-thread the
generated `Database` parameter through the client factory introduced
in subphase 1.1.1 and through the few existing call sites where
hand-written row types overlap the generated shape (admin draft and
status reads). Migrate other call sites incrementally as later phases
touch them; the rule "no app holds a duplicate type definition" applies
to the named shapes in this phase, not to every PostgREST select in the
codebase.

### Responsibility split

- **`shared/db/types.ts`** — verbatim output of
  `supabase gen types typescript`. Never edited by hand. Generated
  comment at the top names the regen command.
- **`shared/db/client.ts`** — the factory becomes
  `createBrowserSupabaseClient(config): SupabaseClient<Database>`,
  parameterized on the generated `Database` type so PostgREST calls
  are typed downstream.
- **Existing hand-written row types** that overlap the generated
  shape get migrated this phase only where the type is the
  authoritative downstream consumer:
  - `DraftEventRow` in `apps/web/src/lib/adminGameApi.ts` →
    `Tables<"game_event_drafts">`
  - `DraftEventStatusRow` in `apps/web/src/lib/adminGameApi.ts` →
    derived from `Views<"game_event_admin_status">`
  - `RedeemEventRow` and `RedemptionsEventRow` (byte-identical
    duplicates) → consolidated to a `Pick<Tables<"game_events">,
    "id" | "event_code">` derived type, with the duplication removed.
  - `PublishedGameEventRow` / `PublishedGameQuestionRow` /
    `PublishedGameOptionRow` in
    [`shared/game-config/db-content.ts`](/shared/game-config/db-content.ts)
    are intentionally **not** rewritten — `shared/game-config/` is a
    different shared module, and rewriting its types is not the
    scope of phase 1.1. The plan explicitly leaves them alone.

### Tooling contract

- `package.json` adds a `db:gen-types` script invoking
  `supabase gen types typescript --local --schema public` with the
  output redirected to `shared/db/types.ts`. The script is documented
  in `docs/dev.md` as a contributor command, not a CI gate.
- The Supabase CLI version is pinned via `mise.toml` if it is not
  already; if it is, this phase confirms the pin is still current.
  The CLI / tooling pinning audit covers this.
- No CI step is added that runs the type generator. Drift is caught
  at the next manual regen by a contributor; later phases (M2) may
  formalize a CI step when migrations land more frequently.

### Files to touch — new

- `shared/db/types.ts` — generated artifact.

### Files to touch — modify

- `shared/db/client.ts` — accept `Database` type parameter; export
  `SupabaseClient<Database>`.
- `shared/db/index.ts` — re-export `Database` and selected helper
  types (`Tables`, `Views`, `Enums`) from
  `@supabase/supabase-js`.
- [`apps/web/src/lib/supabaseBrowser.ts`](/apps/web/src/lib/supabaseBrowser.ts) —
  thread `Database` parameter through the singleton accessor.
- [`apps/web/src/lib/adminGameApi.ts`](/apps/web/src/lib/adminGameApi.ts) —
  replace `DraftEventRow` and `DraftEventStatusRow` with derived
  generated types.
- [`apps/web/src/redeem/authorizeRedeem.ts`](/apps/web/src/redeem/authorizeRedeem.ts) —
  replace `RedeemEventRow` with the consolidated derived type from
  `shared/db/`.
- [`apps/web/src/redemptions/authorizeRedemptions.ts`](/apps/web/src/redemptions/authorizeRedemptions.ts) —
  replace `RedemptionsEventRow` with the same consolidated derived
  type. The two byte-identical duplicates collapse to one.
- [`package.json`](/package.json) — add `db:gen-types` script.
- [`docs/dev.md`](/docs/dev.md) — document `db:gen-types` and the regen
  workflow (when to run, where the output lands, what to do if the
  diff is large).
- [`docs/architecture.md`](/docs/architecture.md) — note that
  `shared/db/types.ts` is the generated source of truth for DB row
  shapes, and that `shared/game-config/db-content.ts`'s row types
  remain authoritative for the published-content surface during
  this phase.
- This plan — flip subphase 1.1.2's row to `Landed` and flip the
  plan-level Status from `Proposed` to `Landed` in the same PR
  (this is the last subphase). The parent epic's M1 row stays
  `Proposed` until the remaining 1.x phase plans (1.2, 1.3, 1.4,
  1.5) flip `Landed`.

### Files intentionally not touched

- [`shared/game-config/db-content.ts`](/shared/game-config/db-content.ts) —
  the `PublishedGame*Row` types stay as hand-written. Rewriting them
  is out of scope for phase 1.1 (different shared module, different
  consumer split). A future phase may consolidate; this plan does
  not.
- [`apps/web/src/redemptions/types.ts`](/apps/web/src/redemptions/types.ts) —
  the `RedemptionRow` type is consumed by app-side rendering code
  that does not touch the Supabase client directly. Out of scope.
- [`supabase/functions/`](/supabase/functions) — Deno-side type
  generation is a separate seam. Out of scope.

### Validation gate

- `npm run lint`, `npm run build:web`, `npm run build:site`,
  `npm test`, `npm run test:functions` — all pass on baseline and
  on final.
- `npm run db:gen-types` runs locally and produces a stable diff.
  If a diff appears unrelated to schema state, the type generator
  is misconfigured and the issue is fixed before merging.

### Self-review audits

- **CLI / tooling pinning audit.** This subphase introduces a new
  CLI dependency (the Supabase CLI's type generator). Confirm the
  CLI version is pinned in `mise.toml` (or the equivalent), and
  confirm `package.json`'s `db:gen-types` script does not float
  the CLI version.
- **Rename-aware diff classification.** Hand-written row types
  removed in favor of generated derivations show up as deletions
  with paired additions; the PR description names the renames
  explicitly so reviewers see the migration.

## Validation Gate (Phase-Wide)

The phase-wide validation gate is the union of each subphase's gate.
A subphase's PR cannot merge until its own gate passes; the plan-level
Status flip to `Landed` requires every subphase row to read `Landed`.

- `npm run lint`
- `npm run build:web`
- `npm run build:site`
- `npm test`
- `npm run test:functions`

## Documentation Currency PR Gate

Across the two subphases, these named docs must reflect the
implemented state by the time each subphase's PR opens:

- [`README.md`](/README.md) — touched only if the
  monorepo-structure prose names the new `shared/db/` directory at
  the layout level. If the existing README's `shared` bullet covers
  it without naming sub-directories, no edit is required for 1.1.x.
- [`docs/architecture.md`](/docs/architecture.md) — updated in 1.1.1
  (new shared layer responsibility) and 1.1.2 (generated types as
  source of truth).
- [`docs/dev.md`](/docs/dev.md) — updated in 1.1.1 (per-app adapter
  pattern note) and 1.1.2 (`db:gen-types` workflow).
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  updated in 1.1.1 to name subphases 1.1.1 and 1.1.2 and update the
  Sizing Summary line for M1; M1 row stays `Proposed`.
- [`AGENTS.md`](/AGENTS.md) — not touched by phase 1.1. The
  styling-token-discipline update is M1 phase 1.5.
- This plan — each subphase's row flips on its own PR; plan-level
  Status flips to `Landed` in subphase 1.1.2's PR.

## Out Of Scope

Captured here so reviewer attention does not relitigate them.

- **`shared/auth/` extraction.** M1 phase 1.3.
- **`shared/urls/` extraction.** M1 phase 1.2.
- **`shared/events/` extraction** (event lookup by slug, status
  helpers, slug validation, publish-window logic). M1 phase 1.4.
  The lookup logic stays in apps/web until 1.4.
- **`shared/styles/` and theme groundwork.** M1 phase 1.5.
- **Cookie-boundary verification inherited from M0 phase 0.3.**
  M1 phase 1.3.
- **`apps/site` consumption of `shared/db/`.** M1 phase 1.3 (auth
  integration is the first cross-app consumer).
- **Server-side Supabase clients in `apps/site`** (RSC client,
  cookie-bound client, service-role client). M1 phase 1.3 and M2.
- **Runtime validation schemas (Zod or equivalent).** Per the
  parent epic's Phase 1.1 paragraph, runtime validation is deferred
  to a focused follow-up motivated by a concrete runtime-validation
  gap. The most likely first consumer is edge function input
  validation (e.g., `save-draft`, `publish-draft`, `redeem-entitlement`
  request bodies), which is a Deno-runtime concern with its own
  trust boundary, not a cross-app browser concern. The follow-up
  is opened when that consumer is being built, not now.
- **Migrating `PublishedGame*Row` types out of
  `shared/game-config/db-content.ts`.** Different shared module;
  out of scope for phase 1.1.
- **Type-level coupling between `Database` and the published-content
  row types in `shared/game-config/db-content.ts`.** Out of scope.
- **Generic PostgREST helpers (`fetchPostgrestRows`,
  `createPostgrestUrl`) in `apps/web/src/lib/gameContentApi.ts`.**
  See subphase 1.1.1's "Files Intentionally Not Touched" — no
  cross-app second consumer in scope for M1.
- **Service-role client used by `tests/e2e/admin-auth-fixture.ts`.**
  Different concern from the browser factory; not migrated.

## Risk Register

- **Vite/Next env divergence sneaks into `shared/db/`.** A
  contributor patches `shared/db/client.ts` and reaches for
  `import.meta.env` because the call site they came from used it.
  Mitigation: Cross-Cutting Invariant "env access stays at the
  app boundary"; self-review walks every changed file for env
  access; ESLint's existing `shared/**/*.ts` configuration scopes
  globals so a Vite-only global there fails lint.
- **Singleton lifecycle drifts during the move.** The current
  module-scoped singleton in `apps/web/src/lib/supabaseBrowser.ts`
  is load-bearing — a second `createClient` call in the same page
  session would break Supabase Auth's session restore. Mitigation:
  responsibility split keeps the singleton in the apps/web adapter,
  not in `shared/db/`. The existing
  `tests/web/lib/adminGameApi.test.ts` mock surface exercises the
  accessor and would catch a regression that broke the singleton
  contract.
- **Mock-import path drift in tests.** Existing
  `vi.mock("../lib/supabaseBrowser", …)` calls in
  `tests/web/lib/adminGameApi.test.ts` depend on the adapter's
  current export shape. Mitigation: the responsibility split
  intentionally keeps `getBrowserSupabaseClient` and
  `getSupabaseConfig` exported from
  `apps/web/src/lib/supabaseBrowser.ts`; the test's mock object
  is unchanged.
- **Generated types diff is large the first time.** The first
  `supabase gen types typescript` run produces a chunky file.
  Mitigation: subphase 1.1.2 lands the generated artifact in its
  own PR with an explicit "this is the generated baseline" note in
  the PR description, separate from the type-threading edits.
- **Generated types drift.** Schema migrations land but no
  contributor regenerates `shared/db/types.ts`. The hand-written
  call sites still compile against stale generated types until
  someone notices. Mitigation: subphase 1.1.2 documents
  `db:gen-types` in `docs/dev.md` as part of the migration
  workflow. A formal CI check is explicitly out of scope for 1.1.2
  (M2 may add one when migrations land more frequently); until
  then, drift is an accepted limitation tracked by the next
  contributor who runs the script.
- **Tooling pin drift.** Adding the Supabase CLI changes
  `mise.toml`. Mitigation: subphase 1.1.2 regenerates pinned
  config in the same commit and the CLI / tooling pinning audit
  runs at that subphase's gate.

## Backlog Impact

Phase 1.1 closes no backlog items, opens no new ones, and unblocks
none. Backlog impact accumulates at the M1 gate per the parent epic.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) — parent epic;
  M1 milestone owns the foundation extraction; sibling phases 1.2,
  1.3, 1.4, 1.5 own their own plans
- [`AGENTS.md`](/AGENTS.md) — planning depth, plan-to-PR
  completion gate, doc currency, validation honesty, scope guardrails
- [`docs/dev.md`](/docs/dev.md) — current contributor workflow;
  updated by this plan
- [`docs/architecture.md`](/docs/architecture.md) — current shape
  with the two-app split; updated by this plan to describe the
  shared layer
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  named audits applied at every subphase's gate
- [`repo-rename.md`](/docs/plans/repo-rename.md) — runtime-identifier
  preservation rules carry over here (cookie names, header names,
  storage keys, workspace scope)
