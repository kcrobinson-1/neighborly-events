# `shared/events/` Foundation Extraction

## Status

Proposed.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md),
Milestone M1, Phase 1.4. Sibling phases: 1.1 `shared/db/` — Landed,
1.2 `shared/urls/` — Landed, 1.3 `shared/auth/` — Landed,
1.5 `shared/styles/` — Proposed. The epic's M1 row stays `Proposed`
until 1.5 also lands.

This plan flips to `Landed` when its single implementation PR merges.

## Goal

Stand up `shared/events/` as the canonical home for event-domain
operations — public reads, admin reads, admin writes, and the
projection types that thread through both — currently in
[`apps/web/src/lib/gameContentApi.ts`](../../apps/web/src/lib/gameContentApi.ts)
and
[`apps/web/src/lib/adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts).
After this phase lands, no app holds duplicate event-domain logic;
both `apps/web` (today) and `apps/site` (M2 phase 2.4 platform admin,
M3 phase 3.1 public landing pages) consume the same primitives.

Behavior-preserving for `apps/web`. PostgREST query shapes, error
messages, return types, and call-site behavior stay byte-identical.
No new validation commands, no schema changes, no edge-function
changes.

## Cross-Cutting Invariants

These rules thread through every diff line in this phase. Self-review
walks each one against every changed file, not only the file that
first triggered the rule.

- **Behavior-preserving for `apps/web`.** Migrated functions produce
  byte-identical PostgREST queries, byte-identical error message
  strings, and byte-identical return shapes. The prototype-fallback
  branch in `loadPublishedGameBySlug` and `listPublishedGameSummaries`
  preserves exactly the same DEV-mode-plus-flag behavior, including
  the `getGameBySlug` fixture lookup and the `featuredGameSlug`
  sort precedence.
- **No env or framework-specific imports inside `shared/events/`.**
  Anything imported from `shared/events/` must be Vite-safe **and**
  Next.js-safe. `shared/events/` does not read `import.meta.env.*`
  or `process.env.*`, does not access `window`, does not hold a
  module-level singleton client, and does not import from
  `apps/web/...`. Per-app DI follows the
  [`shared/auth/`](../../shared/auth) precedent: a
  `configureSharedEvents(providers)` registration that each app
  invokes once at startup before any `shared/events/` symbol is
  consumed.
- **Prototype-fallback decision stays in `apps/web`.** The
  `isPrototypeFallbackEnabled()` gate and the `getGameBySlug` /
  `games` fixture lookups are Vite-coupled DEV-mode behavior.
  `shared/events/` exposes pure remote-Supabase functions; the
  fallback decision and the fixture lookup live in the apps/web
  binding modules. apps/site has no fallback and never consumes
  the fixture data.
- **Admin operations stay authenticated through `shared/auth/`.**
  `getAccessToken()` from
  [`shared/auth/api.ts`](../../shared/auth/api.ts) is the
  cross-app primitive. `shared/events/admin.ts` imports it
  directly from `shared/auth/`; it does not depend on apps/web.
- **Type narrowing preserved.** The `AdminEventStatus` literal
  union, the `Tables<"...">` row projections, the
  `PublishedGameSummary` shape, and the
  `DraftEventSummary` / `DraftEventDetail` /
  `DraftEventStatusSnapshot` types all survive the move with
  their narrowing intact. The build's strict TypeScript pass is
  the load-bearing check.

## Naming

- The shared module is `shared/events/`. The slice owns
  event-domain CRUD; sibling `shared/db/` owns SDK-level Supabase
  wiring (env-agnostic factory and types); sibling `shared/auth/`
  owns authentication. The URL builder
  `routes.eventLanding(slug)` from
  [`shared/urls/`](../../shared/urls) is a URL concern, not an
  event-domain concern; no naming conflict.
- The DI entry point is `configureSharedEvents(providers)`,
  mirroring `configureSharedAuth(providers)` from
  [`shared/auth/configure.ts`](../../shared/auth/configure.ts).
  The provider shape is described in "Responsibility Split"
  below; treat the exact field names as implementer-resolved
  detail under the contract that they expose Supabase config,
  the typed client, and the missing-config error message.
- Function and type names move verbatim from their current
  apps/web locations. No rename in this phase.

## Deferred — code that does not exist today

Two items the parent epic's earlier draft listed for this phase
are explicitly deferred because the code does not exist in the
repository today. The current epic paragraph reflects this; the
deferrals are restated here so reviewer attention does not
relitigate them.

- **Slug-format validation.** No `validateSlug` / `isValidSlug` /
  client-side regex exists in `apps/web/src` or `shared/`. Format
  is enforced by convention and the DB column's uniqueness. If a
  future phase needs a client-side validator, the most likely
  caller is M3 phase 3.1 (`apps/site` event content lookup);
  defining the contract there with a real consumer is preferred
  over inventing one in this phase without a use case.
- **Publish-window logic.** No scheduled-publish or expiry feature
  exists in code; the only "is published" gate is
  `published_at IS NOT NULL` on PostgREST reads. Scheduled-publish
  remains post-epic per the parent epic's Out Of Scope and the
  archived
  [`database-backed-quiz-content.md`](./archive/database-backed-quiz-content.md)
  follow-up note.

## Responsibility Split

- **`shared/events/published.ts`** owns the public read surface:
  `loadPublishedGameBySlug(slug)` and
  `listPublishedGameSummaries()`, the
  `PublishedGameSummary` type, and the private fetch helpers
  (`createPostgrestUrl`, `fetchPostgrestRows`,
  `mapGameToSummary`, `compareGameSummaries`). The functions
  read providers (Supabase config, the missing-config message,
  the `featuredGameSlug` sort key) through
  `readSharedEventsProviders()`. The fixture-fallback branch is
  **not** here — it lives in the apps/web binding module.
- **`shared/events/admin.ts`** owns the admin surface: the
  read functions (`getGameAdminStatus`,
  `listDraftEventSummaries`, `loadDraftEvent`,
  `loadDraftEventStatus`), the write functions
  (`saveDraftEvent`, `generateEventCode`, `publishDraftEvent`,
  `unpublishEvent`), and the projection types
  (`AdminEventStatus`, `DraftEventSummary`, `DraftEventDetail`,
  `DraftEventStatusSnapshot`, `PublishDraftResult`,
  `UnpublishEventResult`, `SaveDraftEventResult`) plus the
  `mapDraftSummary` helper and the `callAuthoringFunction` /
  `createFunctionUrl` helpers. Functions read providers through
  `readSharedEventsProviders()` and import `getAccessToken`
  directly from
  [`shared/auth/`](../../shared/auth). No prototype-fallback
  branch — admin only works against real Supabase, same as
  today.
- **`shared/events/configure.ts`** owns the DI surface:
  `SharedEventsProviders` type, `configureSharedEvents(next)`,
  `readSharedEventsProviders()`, and `_resetSharedEventsForTests()`.
  The provider shape carries (1) a typed Supabase client getter,
  (2) a `SupabaseConfig` getter, (3) a missing-config-message
  getter, and (4) a `featuredGameSlug` getter (consumed by
  `compareGameSummaries`'s sort precedence). Mirrors the shape
  and ergonomics of
  [`shared/auth/configure.ts`](../../shared/auth/configure.ts).
- **`shared/events/index.ts`** is the public barrel. Re-exports
  the read and admin functions, the projection types,
  `configureSharedEvents`, `_resetSharedEventsForTests`, and
  the `SharedEventsProviders` type.
- **`shared/events/README.md`** is the ownership note in the same
  shape as
  [`shared/auth/README.md`](../../shared/auth/README.md): what
  the module owns, the no-env / no-singleton constraint, the
  configure-once contract, and a link back to this plan.
- **[`apps/web/src/lib/setupEvents.ts`](../../apps/web/src/lib/setupEvents.ts)** —
  new file, side-effect module. Calls `configureSharedEvents`
  once at startup with apps/web's Vite-coupled providers
  (`getBrowserSupabaseClient`, `getSupabaseConfig`,
  `getMissingSupabaseConfigMessage`, `featuredGameSlug`).
  Imported for side-effect from
  [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx),
  alongside the existing `setupAuth` import. Per the
  shared/auth precedent, tests do not import this module —
  shared/events tests call `configureSharedEvents` directly with
  mock providers.
- **[`apps/web/src/lib/gameContentApi.ts`](../../apps/web/src/lib/gameContentApi.ts)** —
  shrinks to a thin binding module that owns the
  prototype-fallback decision. Exports
  `loadPublishedGameBySlug` and `listPublishedGameSummaries` as
  thin wrappers: when `isPrototypeFallbackEnabled()` returns
  true, return the fixture-data result directly; otherwise
  delegate to the shared function. Re-exports the
  `PublishedGameSummary` type from `shared/events/`. No
  PostgREST logic remains.
- **[`apps/web/src/lib/adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts)** —
  shrinks to a pure re-export shim from `shared/events/`.
  Mirrors the
  [`apps/web/src/lib/authApi.ts`](../../apps/web/src/lib/authApi.ts)
  precedent: holds no logic of its own, exists so existing
  apps/web call sites can keep importing the admin functions
  and types from a stable apps/web path while the
  implementation lives in `shared/events/`. The
  `setupEvents.ts` side-effect handles the configure-once wire-up.
- **Call sites in `apps/web`.** No import-path changes for the 11
  consumers identified during scoping. They keep importing from
  `apps/web/src/lib/gameContentApi.ts` and
  `apps/web/src/lib/adminGameApi.ts`. The binding-module pattern
  preserves the apps/web import surface, same as the
  `shared/auth/` extraction did for `authApi.ts`.

## Files to touch — new

- `shared/events/published.ts` — public read functions, types,
  and helpers per the responsibility split.
- `shared/events/admin.ts` — admin read/write functions, types,
  and helpers per the responsibility split.
- `shared/events/configure.ts` — `SharedEventsProviders` type,
  `configureSharedEvents`, `readSharedEventsProviders`, and
  `_resetSharedEventsForTests`. Modeled on
  [`shared/auth/configure.ts`](../../shared/auth/configure.ts).
- `shared/events/index.ts` — public barrel.
- `shared/events/README.md` — ownership note in the same shape as
  [`shared/auth/README.md`](../../shared/auth/README.md) and
  [`shared/db/README.md`](../../shared/db/README.md).
- `apps/web/src/lib/setupEvents.ts` — side-effect configuration
  module. Modeled on
  [`apps/web/src/lib/setupAuth.ts`](../../apps/web/src/lib/setupAuth.ts).
- `tests/shared/events/published.test.ts` — focused tests for the
  public read surface (the fixture-fallback path stays tested at
  the apps/web binding-module layer; this file covers the
  remote-Supabase code paths with mocked fetch).
- `tests/shared/events/admin.test.ts` — focused tests for the
  admin reads, writes, and projection mapping. The portions of
  [`tests/web/lib/adminGameApi.test.ts`](../../tests/web/lib/adminGameApi.test.ts)
  that exercise the moved functions relocate here, with imports
  pointed at `shared/events/` and `configureSharedEvents` called
  with mock providers in the suite's setup. The test runner's
  existing
  [`vitest.config.ts`](../../vitest.config.ts) include glob
  (`tests/**/*.test.{ts,tsx}`) already covers `tests/shared/`,
  so no config change is required.

## Files to touch — modify

- [`apps/web/src/lib/gameContentApi.ts`](../../apps/web/src/lib/gameContentApi.ts) —
  shrinks to a binding module per the responsibility split.
  Owns the prototype-fallback decision; delegates remote work to
  `shared/events/published.ts`.
- [`apps/web/src/lib/adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts) —
  shrinks to a pure re-export shim from `shared/events/`. Holds
  no logic of its own.
- [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx) — adds
  the `setupEvents` side-effect import alongside the existing
  `setupAuth` import. The two configures are independent; order
  between them is not load-bearing.
- [`tests/web/lib/adminGameApi.test.ts`](../../tests/web/lib/adminGameApi.test.ts) —
  the portions covering moved functions relocate to
  `tests/shared/events/admin.test.ts`. Whatever apps/web-only
  surface remains (binding-module wiring, if any) keeps a
  correspondingly trimmed test file; if nothing remains the
  file is deleted.
- [`docs/architecture.md`](../architecture.md) — the shared-layer
  description gains a `shared/events/` bullet under the same
  heading the `shared/db/`, `shared/urls/`, and `shared/auth/`
  extractions added. The bullet names what the module owns and
  the configure-once DI contract.
- [`docs/dev.md`](../dev.md) — extended only if existing prose
  names a per-app rule about event-data imports that should now
  include `shared/events/`. No new validation command in this
  phase.
- This plan — flipped from `Proposed` to `Landed` in the
  implementation PR.

## Files intentionally not touched

- [`shared/db/`](../../shared/db) — already owns the SDK-level
  Supabase wiring and the `Tables<"...">` types `shared/events/`
  consumes. No change.
- [`shared/auth/`](../../shared/auth) — `getAccessToken` is
  imported by `shared/events/admin.ts` exactly as
  [`apps/web/src/lib/adminGameApi.ts`](../../apps/web/src/lib/adminGameApi.ts)
  imports it today. No change to `shared/auth/`.
- [`shared/urls/`](../../shared/urls),
  [`shared/game-config/`](../../shared/game-config),
  [`shared/redemption.ts`](../../shared/redemption.ts) — different
  shared modules, no event-domain concerns. No change.
- [`apps/site/`](../../apps/site) — does not consume
  `shared/events/` in this phase. First cross-app consumer is
  M2 phase 2.4 (platform admin in apps/site) or M3 phase 3.1
  (event landing page lookup), whichever lands first. No
  apps/site source changes here.
- [`apps/web/src/lib/supabaseBrowser.ts`](../../apps/web/src/lib/supabaseBrowser.ts) —
  stays as the Vite-coupled adapter over `shared/db/` per the
  phase 1.1 boundary. No env-reading or singleton-lifecycle
  helpers move into `shared/events/`; the per-app provider
  pattern preserves that boundary.
- [`supabase/functions/`](../../supabase/functions) — admin
  authoring functions consumed by `shared/events/admin.ts` are
  unchanged. Out of scope.
- [`apps/web/src/data/games.ts`](../../apps/web/src/data/games.ts) —
  the `featuredGameSlug` re-export and the
  `shared/game-config/sample-fixtures` indirection stay as
  fixture concerns. The apps/web binding module's
  prototype-fallback path imports them; `shared/events/` does
  not.
- E2E spec files and fixtures under
  [`tests/e2e/`](../../tests/e2e) — no `shared/events/` symbols
  consumed. No change.
- Doc prose references to event-domain operations in
  [`docs/architecture.md`](../architecture.md),
  [`docs/operations.md`](../operations.md), and elsewhere —
  describe the contract; not consumers.
- Runtime identifiers preserved per
  [`repo-rename.md`](./repo-rename.md) cross-cutting invariants.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree, on a feature branch
   (not `main`). Confirm Node and npm match `mise.toml` /
   `package.json` engines.
2. **Baseline validation.** Run `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`. All must pass before any edits.
3. **Create `shared/events/configure.ts`.** Define
   `SharedEventsProviders`, `configureSharedEvents`,
   `readSharedEventsProviders`, and
   `_resetSharedEventsForTests`. Model body on
   [`shared/auth/configure.ts`](../../shared/auth/configure.ts).
4. **Create `shared/events/published.ts`.** Move
   `loadPublishedGameBySlug`, `listPublishedGameSummaries`,
   `PublishedGameSummary`, and the private helpers. Replace
   direct `getSupabaseConfig()` calls with provider reads. The
   prototype-fallback branch is removed from these functions —
   they are pure remote-Supabase code in this module.
5. **Create `shared/events/admin.ts`.** Move all admin reads,
   writes, projection types, and helpers. Replace direct
   `getSupabaseConfig()` / `getBrowserSupabaseClient()` /
   `readSupabaseErrorMessage` access with provider reads
   (`readSupabaseErrorMessage` already lives in `shared/db/` and
   continues to import from there). Import `getAccessToken`
   from `shared/auth/`.
6. **Create `shared/events/index.ts` and
   `shared/events/README.md`.** Public barrel and ownership note.
7. **Create `apps/web/src/lib/setupEvents.ts`.** Side-effect
   module that calls `configureSharedEvents` with apps/web's
   Vite-coupled providers. Add the side-effect import to
   [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx).
8. **Shrink the apps/web binding modules.**
   `apps/web/src/lib/gameContentApi.ts` becomes the
   prototype-fallback-aware binding module;
   `apps/web/src/lib/adminGameApi.ts` becomes a pure re-export
   shim. Keep their existing top-of-file comments accurate to the
   new responsibility split.
9. **Move and split the admin tests.** Move the portions of
   [`tests/web/lib/adminGameApi.test.ts`](../../tests/web/lib/adminGameApi.test.ts)
   covering moved functions to
   `tests/shared/events/admin.test.ts`. Update imports to
   `shared/events/`; call `configureSharedEvents` with mock
   providers in the suite's setup (or `beforeEach`); call
   `_resetSharedEventsForTests` in `afterEach`. Add focused
   coverage for the moved read surface in
   `tests/shared/events/published.test.ts`.
10. **Run focused validation.** `npm test -- tests/shared/events/published.test.ts`
    and `npm test -- tests/shared/events/admin.test.ts`. Both files
    are guaranteed to exist post-move; targeting them by path avoids
    a zero-match failure if the now-trimmed
    `tests/web/lib/adminGameApi.test.ts` is deleted entirely (allowed
    by "Files to touch — modify"). Any apps/web binding-module tests
    that remain are exercised by the full `npm test` run in step 12.
11. **Documentation update.** Update
    [`docs/architecture.md`](../architecture.md), the parent
    epic's milestone-status row if it should change (M1 stays
    `Proposed` until 1.5 also lands; this phase only flips its
    own plan's Status), and this plan's Status. Doc currency is
    a PR gate per
    [`AGENTS.md`](../../AGENTS.md).
12. **Repeat full validation.** `npm run lint`,
    `npm run build:web`, `npm run build:site`, `npm test`,
    `npm run test:functions`. All must pass.
13. **Automated code-review feedback loop.** Walk the diff from
    a senior-reviewer stance. Confirm: no `import.meta.env` /
    `process.env` / `window` reference inside `shared/events/`;
    no `apps/web/...` import inside `shared/events/`; the
    `AdminEventStatus` literal union, the `Tables<"...">`
    projections, and the `PublishedGameSummary` shape survive
    the move; every existing apps/web consumer's imports still
    resolve; the prototype-fallback branch behaves identically
    in DEV-mode-with-flag and is gone everywhere else.
14. **Plan-to-PR completion gate.** Walk every Goal,
    Cross-Cutting Invariant, Validation step, and Self-Review
    audit named in this plan. Confirm each is satisfied or
    explicitly deferred in this plan with rationale. Flip the
    plan-level Status to `Landed` in the same PR.
15. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 chars. Validation section lists the five
    standard commands. Target Shape Evidence section names the
    responsibility split and references this plan. UX Review
    section is `N/A` (no user-visible behavior changes).
    Remaining Risk: configure-ordering — the `setupEvents`
    side-effect must run before any consumer's first call.
    Verified by the existing `setupAuth` precedent and the
    `readSharedEventsProviders()` throw-on-unconfigured guard.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final. The
  build's TypeScript pass is the load-bearing check that
  `AdminEventStatus`, `Tables<"...">` row projections, and
  `PublishedGameSummary` narrowing survived the move.
- `npm run build:site` — pass on baseline; pass on final. No
  `apps/site` source touched, but the build must still work and
  must not pick up any apps/web-only import inadvertently
  exposed through `shared/events/`.
- `npm test` — pass on baseline; pass on final. Includes the
  moved and new tests in `tests/shared/events/`.
- `npm run test:functions` — pass on baseline; pass on final
  (no edge-function source touched, but the runner is part of
  the repo's standard validation set).

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **Rename-aware diff classification.** The phase moves the
  bulk of two `apps/web/src/lib/` files into `shared/events/`
  and relocates portions of one test file into
  `tests/shared/events/`. The diff must classify as
  rename-vs-edit so reviewers see content changes (the
  provider-read replacements, the `setupEvents.ts` wire-up, the
  binding-module shrink) rather than move noise. Where a
  function moved verbatim, the PR description names that
  explicitly.
- **Effect cleanup audit.** No effects are added or relocated
  by this phase. The shared functions are pure async fetch /
  PostgREST builders; no subscriptions, no async lifecycle. The
  audit is named here for completeness against the M1 audit
  pattern; nothing actionable.
- **Error-surfacing for user-initiated mutations.** The admin
  write paths (`saveDraftEvent`, `generateEventCode`,
  `publishDraftEvent`, `unpublishEvent`) must keep their
  user-facing error message strings byte-identical across the
  move. Self-review walks each `throw new Error(...)` site.
- **CLI / tooling pinning audit.** No new CLI or framework
  dependency is introduced by this phase. Named for
  completeness; nothing new to pin.

## Documentation Currency PR Gate

Named docs that must reflect the implemented state by the time
the PR opens:

- [`README.md`](../../README.md) — touched only if the
  monorepo-structure prose names the new `shared/events/`
  directory at the layout level. If the existing README's
  `shared` bullet covers it without naming sub-directories, no
  edit is required.
- [`docs/architecture.md`](../architecture.md) — updated to
  add the `shared/events/` shared-layer bullet, the
  configure-once DI contract, and the
  prototype-fallback-stays-in-apps/web boundary.
- [`docs/dev.md`](../dev.md) — updated only if existing prose
  names a per-app rule about event-data imports that should
  now include `shared/events/`.
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md) —
  the phase 1.4 paragraph already reflects the implemented
  scope (updated in the same branch as this plan). M1 row
  stays `Proposed` until 1.5 also lands.
- [`AGENTS.md`](../../AGENTS.md) — not touched by phase 1.4.
  The styling-token-discipline update is M1 phase 1.5.
- This plan — Status flipped to `Landed` in the implementation
  PR.

## Out Of Scope

Captured here so reviewer attention does not relitigate them.

- **Slug-format validation.** Deferred per "Deferred — code
  that does not exist today" above.
- **Publish-window logic.** Deferred per "Deferred — code that
  does not exist today" above.
- **`shared/styles/` and theme groundwork.** M1 phase 1.5.
- **`apps/site` consumption of `shared/events/`.** First
  cross-app consumer is M2 phase 2.4 (platform admin) or M3
  phase 3.1 (event landing page lookup), whichever lands
  first. No apps/site source is touched in this phase.
- **Consolidating `configureSharedAuth` and
  `configureSharedEvents` into a single shared-runtime
  configure step.** Each shared module owns its own DI today.
  If a future phase wants a unified `configureSharedRuntime`,
  it can extract one without touching consumer code.
- **Edge-function changes.** Admin authoring functions
  (`save-draft`, `generate-event-code`, `publish-draft`,
  `unpublish-event`, `is_admin` RPC) are consumed unchanged.
  Out of scope for the entire phase.
- **Renaming `apps/web/src/lib/gameContentApi.ts` /
  `adminGameApi.ts`.** The files keep their names so the 11
  apps/web consumers do not need import-path swaps. Renaming
  for the post-extraction "binding module" responsibility is a
  cosmetic concern; deferred.

## Risk Register

- **Configure-ordering bug.** A consumer that reaches
  `shared/events/` before `setupEvents.ts` has run would hit
  the `readSharedEventsProviders()` throw. Mitigation: same
  pattern as `shared/auth/` (already in production); the
  side-effect import in
  [`apps/web/src/main.tsx`](../../apps/web/src/main.tsx) runs
  before any React tree mounts, and the throw-on-unconfigured
  guard surfaces the bug loudly rather than producing
  undefined behaviour. Tests register their own providers in
  `beforeEach`.
- **Prototype-fallback regression.** The fallback branch is
  the most likely site for a behavior drift, because it must
  preserve exactly the DEV-mode-plus-flag behavior and the
  `featuredGameSlug` sort precedence. Mitigation: the apps/web
  binding module's wrapper functions are tested at the
  apps/web layer (focused coverage added or preserved); the
  shared functions are tested in pure remote-Supabase mode
  with mocked fetch.
- **Type narrowing regresses during the move.**
  `AdminEventStatus`, `Tables<"...">` row projections, and the
  `mapDraftSummary` return shape rely on intersecting the
  generated DB types with non-null assertions. A reviewer
  patching the move could drop a `NonNullable<...>` or widen
  a literal union to `string` and silently regress the
  narrowing. Mitigation: the strict TypeScript pass in
  `npm run build:web` flags any widening immediately, since
  consumer call sites assign function returns into the
  narrowed types; the cross-cutting invariant names the rule
  explicitly so self-review walks for it.
- **Test-mock import-path drift.** The moved tests import from
  `shared/events/` instead of `apps/web/src/lib/adminGameApi`.
  Any `vi.mock` calls that today reference the apps/web path
  by string need to point at the new location. Mitigation: the
  focused test runs in execution step 10 catch any unforeseen
  mock dependency; the implementer audits `vi.mock` usage
  during the move.
- **Re-export shim drift in apps/web.** The apps/web binding
  modules become thin shims; a future contributor unaware of
  the binding-module pattern might inline logic back into
  them, fragmenting the responsibility. Mitigation: the
  top-of-file comment in each binding module restates the
  responsibility split (read-side: prototype fallback only;
  admin: pure re-export); same precedent as
  [`apps/web/src/lib/authApi.ts`](../../apps/web/src/lib/authApi.ts).

## Backlog Impact

Phase 1.4 closes no backlog items, opens no new ones, and
unblocks none. Backlog impact accumulates at the M1 gate per
the parent epic.

## Related Docs

- [`event-platform-epic.md`](./event-platform-epic.md) —
  parent epic; M1 milestone owns the foundation extraction.
  Sibling phase plans:
  [`shared-db-foundation.md`](./shared-db-foundation.md),
  [`shared-urls-foundation.md`](./shared-urls-foundation.md),
  [`shared-auth-foundation.md`](./shared-auth-foundation.md).
- [`shared-auth-foundation.md`](./shared-auth-foundation.md) —
  prior phase's plan. Established the `configureShared*`
  per-app DI pattern and the binding-module re-export shape
  this plan inherits.
- [`shared-db-foundation.md`](./shared-db-foundation.md) —
  earlier phase's plan. Established the
  Vite-coupled-adapter-over-shared-SDK boundary that this
  plan preserves rather than collapsing.
- [`AGENTS.md`](../../AGENTS.md) — planning depth, plan-to-PR
  completion gate, doc currency, validation honesty, scope
  guardrails.
- [`docs/dev.md`](../dev.md) — current contributor workflow.
- [`docs/architecture.md`](../architecture.md) — current
  shape with the two-app split and shared layer; updated by
  this plan to describe `shared/events/`.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  named audits applied at this phase's gate.
- [`repo-rename.md`](./repo-rename.md) — runtime-identifier
  preservation rules carry over here.
