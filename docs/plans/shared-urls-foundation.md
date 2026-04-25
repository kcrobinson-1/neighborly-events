# `shared/urls/` Foundation Extraction

## Status

Proposed.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md),
Milestone M1, Phase 1.2. The epic's M1 row stays `Proposed` until every
phase 1.x plan flips to `Landed`. Sibling phases (1.1 `shared/db/` —
Landed, 1.3 `shared/auth/`, 1.4 `shared/events/`, 1.5 `shared/styles/`)
own their own plans.

This plan flips to `Landed` when its single PR merges.

## Goal

Stand up `shared/urls/` as the canonical home for the route table,
route matchers, and post-auth `next=` validation that today live in
[`apps/web/src/routes.ts`](../../apps/web/src/routes.ts) and
[`apps/web/src/auth/validateNextPath.ts`](../../apps/web/src/auth/validateNextPath.ts).
After this phase lands, no app holds a duplicate route table or
duplicate next-path allowlist; both `apps/web` (today) and `apps/site`
(later phases) can consume the same primitives.

The phase also adds two builder entries the parent epic names but that
have no consumer in `apps/web` today:

- `routes.eventLanding(slug)` → `/event/:slug` — consumed by M3 when
  `apps/site` renders event landing pages.
- `routes.eventAdmin(slug)` → `/event/:slug/admin` — consumed by M2
  phase 2.2 when the per-event admin route shell mounts in `apps/web`.

Their matchers and their entries in `validateNextPath`'s allowlist land
with the consumers in their owning phases, not in this phase.

Behavior-preserving for `apps/web`. No URL string changes, no
`validateNextPath` allowlist changes, no router-dispatch changes.

## Cross-Cutting Invariants

These rules thread through every diff line in this phase. Self-review
walks each one against every changed file, not only the file that
first triggered the rule.

- **Behavior-preserving for `apps/web`.** Migrated call sites produce
  byte-identical URL strings, byte-identical `validateNextPath`
  return values, and byte-identical router dispatch. Anything
  observable from outside the migrated modules stays the same.
- **`AppPath` literal-type narrowing preserved.** Each builder
  returns the corresponding `AppPath` literal type today; the
  `as const` on the `routes` object stays. The narrowing is
  load-bearing for `validateNextPath`'s return type and for type-safe
  navigation.
- **No env or framework-specific imports inside `shared/urls/`.**
  Anything imported from `shared/urls/` must be Vite-safe **and**
  Next.js-safe. The one browser API the module touches —
  `window.location.origin` inside `validateNextPath` — is a
  client-only concern and must be documented as such in the
  `shared/urls/` README so future server-side callers see the
  constraint upfront.
- **`validateNextPath` allowlist unchanged.** This phase moves the
  function and its matchers; it does not extend the allowlist. New
  matchers for `eventLanding` and `eventAdmin` land in the phases
  that mount those routes.

## Naming

The exported object stays named `routes` (matching today's `apps/web`
identifier). The parent epic's `urls.platformAdmin()` style is
illustrative; keeping `routes` avoids a 13-file find-and-replace whose
only justification is matching epic prose. The directory
`shared/urls/` takes its name from the URL concern it owns, not from
the export name — same precedent as `shared/db/` exporting
`createBrowserSupabaseClient` rather than `db.create*`.

## Operator-route builder names

The parent epic's phase 1.2 paragraph names builders
`urls.gameRedeem(slug)` and `urls.gameRedemptions(slug)`. Those names
presume the post-M2-phase-2.5 URL contract
(`/event/:slug/game/redeem`, `/event/:slug/game/redemptions`). Phase
2.5 hard-cutovers the URLs themselves. To keep builder name and URL
aligned at every gate, this phase keeps the today-shape builders
`routes.eventRedeem(slug)` and `routes.eventRedemptions(slug)`
returning current URLs (`/event/:slug/redeem`,
`/event/:slug/redemptions`); phase 2.5 renames the builder and its
matcher in lockstep with the URL change. The parent epic's phase 1.2
paragraph is tightened in the same PR that lands this phase to
reflect the deferred rename.

## Responsibility Split

- **`shared/urls/routes.ts`** owns the `AppPath` type, the `routes`
  object (today's eight entries plus the two new builders for
  `eventLanding` and `eventAdmin`), the `AuthNextPath` type, the
  `normalizePathname` helper, and the four route matchers that exist
  today (`matchAdminEventPath`, `matchGamePath`,
  `matchEventRedeemPath`, `matchEventRedemptionsPath`). No matchers
  for the new builders are added in this phase.
- **`shared/urls/validateNextPath.ts`** owns the open-redirect
  defense: a pure function that parses a raw `next` string against
  `window.location.origin`, applies the existing allowlist, and
  returns an `AuthNextPath`. Identical body to today, identical
  allowlist.
- **`shared/urls/index.ts`** is the public barrel. Re-exports
  `AppPath`, `AuthNextPath`, `routes`, the four matchers,
  `normalizePathname`, and `validateNextPath`.
- **`shared/urls/README.md`** is the ownership note: what
  `shared/urls/` owns, the browser-only constraint on
  `validateNextPath`, the naming decision (`routes` vs. `urls`), and
  a link back to this plan.
- **Call sites in `apps/web`** swap their import paths from
  `apps/web/src/routes` and `apps/web/src/auth/validateNextPath` to
  `shared/urls/`. No call-site logic changes. The single hardcoded
  `/auth/callback?next=...` literal in
  [`apps/web/src/lib/authApi.ts`](../../apps/web/src/lib/authApi.ts)
  is rewritten to compose `routes.authCallback` with the query
  string, so no app-side file holds a bare URL literal for any of
  the seven route families.

## Files to touch — new

- `shared/urls/routes.ts` — the route table, matchers,
  `normalizePathname`, `AppPath`, and `AuthNextPath`. Adds
  `routes.eventLanding(slug)` and `routes.eventAdmin(slug)` entries;
  matchers for those builders are not added in this phase.
- `shared/urls/validateNextPath.ts` — verbatim move from today's
  apps/web file. Imports `routes` and the matchers from `./routes`.
- `shared/urls/index.ts` — public barrel re-exporting the surface
  named under "Responsibility Split."
- `shared/urls/README.md` — short ownership note in the same shape
  as
  [`shared/db/README.md`](../../shared/db/README.md): what the
  module owns, the browser-only constraint on `validateNextPath`,
  the `routes` naming decision, and a link to this plan.
- `tests/shared/urls/routes.test.ts` — the existing
  `tests/web/routes.test.ts` body moved verbatim, import paths
  updated to point at `shared/urls/`. The test runner must already
  pick up `tests/shared/**/*.test.ts`; if the existing
  [`vitest.config.ts`](../../vitest.config.ts) include glob does
  not cover that path, the include glob is widened in the same
  commit.

## Files to touch — modify

- [`apps/web/src/routes.ts`](../../apps/web/src/routes.ts) — deleted.
  Its 13+ in-app consumers update their import paths to
  `shared/urls/`. Any consumer that today reaches into a re-exported
  symbol through this file's path is updated in the same commit.
- [`apps/web/src/auth/validateNextPath.ts`](../../apps/web/src/auth/validateNextPath.ts) —
  deleted. Its single consumer
  ([`apps/web/src/auth/AuthCallbackPage.tsx`](../../apps/web/src/auth/AuthCallbackPage.tsx))
  imports from `shared/urls/`.
- [`apps/web/src/auth/types.ts`](../../apps/web/src/auth/types.ts) —
  the `AuthNextPath` type is removed; the file's other auth-state
  types stay (those are `shared/auth/` phase 1.3 scope). Consumers
  of `AuthNextPath`
  ([`apps/web/src/lib/authApi.ts`](../../apps/web/src/lib/authApi.ts)
  and the auth-callback page) update their import paths to
  `shared/urls/`.
- [`apps/web/src/lib/authApi.ts`](../../apps/web/src/lib/authApi.ts) —
  the bare `/auth/callback?next=...` URL composition is rewritten to
  use `routes.authCallback` plus the query string, removing the last
  hardcoded literal in `apps/web` source. `requestMagicLink`'s
  signature, `emailRedirectTo` value, and Supabase call shape stay
  byte-identical.
- The remaining apps/web consumers of `routes`, the matchers, and
  `validateNextPath` (the survey for this phase enumerated 13 source
  files plus the auth-callback page; the implementer walks every one
  in the same commit). Each consumer's edit is a one-line
  import-path swap; no logic changes.
- [`tests/web/routes.test.ts`](../../tests/web/routes.test.ts) —
  deleted (moved to `tests/shared/urls/routes.test.ts`).
- [`tests/web/auth/AuthCallbackPage.test.tsx`](../../tests/web/auth/AuthCallbackPage.test.tsx) —
  import paths updated to `shared/urls/`. The test stays in its
  current `tests/web/auth/` location because it tests an apps/web
  page component, not the shared module directly.
- [`docs/architecture.md`](../architecture.md) — the shared-layer
  description gains a `shared/urls/` bullet under the same heading
  the shared/db extraction added. The bullet names what the module
  owns and that `validateNextPath` is browser-only.
- [`docs/dev.md`](../dev.md) — if the contributor workflow notes any
  rule about importing routes (the existing prose around
  `shared/db/` is the precedent), the rule is extended to cover
  `shared/urls/`. No new validation command is introduced in this
  phase.
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md) —
  phase 1.2 paragraph tightened on three points: (1) builder names
  for the operator routes are `eventRedeem`/`eventRedemptions` in
  this phase, with the rename to `gameRedeem`/`gameRedemptions`
  deferred to phase 2.5 alongside the URL change; (2) `eventLanding`
  and `eventAdmin` matchers and `validateNextPath` allowlist
  entries are deferred to the phases that mount those routes; (3)
  the exported object is named `routes`, with `urls.*` in the
  paragraph treated as illustrative. M1 row stays `Proposed`.
- This plan — flipped from `Proposed` to `Landed` in the same PR.

## Files intentionally not touched

- [`shared/db/`](../../shared/db) — different shared module, already
  landed; no change.
- [`shared/game-config/`](../../shared/game-config) and
  [`shared/redemption.ts`](../../shared/redemption.ts) — different
  shared modules, no URL concerns; no change.
- [`apps/site/`](../../apps/site) — does not consume `shared/urls/`
  in this phase. Cross-app navigation lands in M3 phase 3.3; the
  auth-callback migration to `apps/site` is M2 phase 2.3. No
  `apps/site` source changes here.
- [`supabase/functions/`](../../supabase/functions) — zero hardcoded
  references to the URL families this phase owns (verified during
  scoping). Out of scope for the entire phase.
- E2E spec files and fixtures under
  [`tests/e2e/`](../../tests/e2e) — Playwright `page.goto` calls and
  magic-link fixture URLs hardcode strings such as
  `/event/first-sample/game` and
  `/auth/callback?next=/event/first-sample/redeem`. Those are test
  data describing the URL contract under test, not consumers of the
  builder layer. Migrating them would couple the e2e suite to a
  shared-package import path without removing real-world risk;
  they stay as literals. The phase 1.2 invariant "no hardcoded URL
  literal in `apps/web` source" excludes test data by intent.
- Doc prose references to URL strings in
  [`docs/architecture.md`](../architecture.md),
  [`docs/operations.md`](../operations.md), and
  [`docs/dev.md`](../dev.md) — those describe the URL contract; they
  are not consumers of the builder layer.
- Runtime identifiers (`neighborly_session` cookie,
  `x-neighborly-session` header, `neighborly.local-*` storage keys,
  `@neighborly/web` workspace scope) — preserved per
  [`repo-rename.md`](./repo-rename.md) cross-cutting invariants.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree, on a feature branch
   (not `main`). Confirm Node and npm match `mise.toml` /
   `package.json` engines.
2. **Baseline validation.** Run `npm run lint`, `npm run build:web`,
   `npm run build:site`, `npm test`, `npm run test:functions`. All
   must pass before any edits.
3. **Create `shared/urls/`.** Add the four new files
   (`routes.ts`, `validateNextPath.ts`, `index.ts`, `README.md`)
   per "Files to touch — new." `routes.ts` includes today's content
   plus the two new builder entries (`eventLanding`,
   `eventAdmin`); no new matchers. `validateNextPath.ts` is a
   verbatim body move with import paths pointed at `./routes`.
4. **Move the routes test.** Move
   `tests/web/routes.test.ts` to `tests/shared/urls/routes.test.ts`.
   If `vitest.config.ts`'s include glob does not already cover
   `tests/shared/**/*.test.ts`, widen it in the same commit. Run
   `npm test -- routes` and confirm the moved file is picked up and
   passes.
5. **Migrate apps/web consumers.** Walk every `apps/web/src/**`
   file that imports from `apps/web/src/routes` or
   `apps/web/src/auth/validateNextPath` and update its import path
   to `shared/urls/`. Update
   [`apps/web/src/lib/authApi.ts`](../../apps/web/src/lib/authApi.ts)
   to compose `routes.authCallback` with the query string instead
   of the bare `/auth/callback?next=...` literal. Remove the
   deprecated apps/web files in the same commit.
6. **Migrate `AuthNextPath`.**
   [`apps/web/src/auth/types.ts`](../../apps/web/src/auth/types.ts)
   loses the `AuthNextPath` type. Its consumers
   ([`authApi.ts`](../../apps/web/src/lib/authApi.ts),
   [`AuthCallbackPage.tsx`](../../apps/web/src/auth/AuthCallbackPage.tsx),
   [`EventRedemptionsPage.tsx`](../../apps/web/src/pages/EventRedemptionsPage.tsx))
   import it from `shared/urls/`.
7. **Run focused validation.** `npm test -- routes`,
   `npm test -- AuthCallbackPage`. Both must pass without rewriting
   assertion bodies.
8. **Documentation update.** Update
   [`docs/architecture.md`](../architecture.md),
   [`docs/dev.md`](../dev.md), the parent epic's phase 1.2
   paragraph (per the three tightening points named in
   "Files to touch — modify"), and this plan's Status. Doc currency
   is a PR gate per `AGENTS.md`.
9. **Repeat full validation.** `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`. All must pass.
10. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance. Confirm: no `import.meta.env` or
    `process.env` reference inside `shared/urls/`; no Vite-only or
    Next.js-only import inside `shared/urls/`; the `as const`
    narrowing on the `routes` object survives the move; every
    existing apps/web consumer's imports still resolve; the e2e
    fixture URL literals are intentionally untouched per
    "Files Intentionally Not Touched."
11. **Plan-to-PR completion gate.** Walk every Goal, Cross-Cutting
    Invariant, Validation step, and Self-Review audit named in
    this plan. Confirm each is satisfied or explicitly deferred in
    this plan with rationale. Flip the plan-level Status to
    `Landed` in the same PR.
12. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 chars. Validation section lists `npm run lint`,
    `npm test`, `npm run test:functions`, `npm run build:web`,
    `npm run build:site` — all run. Target Shape Evidence section
    names the responsibility split and references this plan. UX
    Review section is `N/A` (no user-visible behavior changes).
    Remaining Risk: type-narrowing preservation on the `routes`
    object is the load-bearing invariant and is verified by the
    existing test surface plus the build's strict type check.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final. The
  build's TypeScript pass is the load-bearing check that
  `AppPath` narrowing survived the move.
- `npm run build:site` — pass on baseline; pass on final (no
  `apps/site` source touched, but the build must still work).
- `npm test` — pass on baseline; pass on final. The moved
  `routes.test.ts` and the unchanged
  `AuthCallbackPage.test.tsx` cover the migration surface.
- `npm run test:functions` — pass on baseline; pass on final
  (no edge-function source touched, but the runner is part of
  the repo's standard validation set).

## Self-Review Audits

Named in the parent epic for phase 1.2 by inheritance from M1's
audit pattern, drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **Rename-aware diff classification.** The phase moves
  `apps/web/src/routes.ts`, `apps/web/src/auth/validateNextPath.ts`,
  and `tests/web/routes.test.ts` into `shared/urls/` and
  `tests/shared/urls/`. The diff must classify as rename-vs-edit
  so reviewers see content changes (the two new builder entries,
  the import-path edits in consumers, the `authApi.ts` literal
  rewrite), not move noise. Where a function moved verbatim, the
  PR description names that explicitly.
- **CLI / tooling pinning audit.** No new CLI or framework
  dependency is introduced by this phase. The audit is named here
  for completeness against the M1 audit pattern; nothing new to
  pin.
- **Effect cleanup audit.** No effects are added or relocated by
  this phase. `validateNextPath` is a pure function; the move
  does not introduce any subscription or async lifecycle. The
  audit is named here for completeness against the M1 audit
  pattern; nothing actionable.

## Documentation Currency PR Gate

Named docs that must reflect the implemented state by the time the
PR opens:

- [`README.md`](../../README.md) — touched only if the
  monorepo-structure prose names the new `shared/urls/` directory at
  the layout level. If the existing README's `shared` bullet covers
  it without naming sub-directories, no edit is required.
- [`docs/architecture.md`](../architecture.md) — updated to add the
  `shared/urls/` shared-layer bullet and the browser-only
  constraint on `validateNextPath`.
- [`docs/dev.md`](../dev.md) — updated only if existing prose names
  a per-app rule about route imports that should now include
  `shared/urls/`.
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md) —
  phase 1.2 paragraph tightened per "Files to touch — modify."
  M1 row stays `Proposed`.
- [`AGENTS.md`](../../AGENTS.md) — not touched by phase 1.2. The
  styling-token-discipline update is M1 phase 1.5.
- This plan — Status flipped to `Landed` in the same PR.

## Out Of Scope

Captured here so reviewer attention does not relitigate them.

- **`shared/auth/` extraction** (Supabase Auth wiring,
  session-restore primitives, role-resolution hooks, magic-link
  flow, in-place auth shell). M1 phase 1.3.
- **`shared/events/` extraction** (event lookup by slug, status
  helpers, slug validation, publish-window logic). M1 phase 1.4.
- **`shared/styles/` and theme groundwork.** M1 phase 1.5.
- **`apps/site` consumption of `shared/urls/`.** First cross-app
  consumer is the auth-callback migration in M2 phase 2.3 (and
  in-app navigation polish in M3 phase 3.3). No `apps/site` source
  is touched in this phase.
- **Operator-route URL change** (`/event/:slug/redeem` →
  `/event/:slug/game/redeem`,
  `/event/:slug/redemptions` → `/event/:slug/game/redemptions`).
  M2 phase 2.5. The builder rename
  (`eventRedeem`/`eventRedemptions` → `gameRedeem`/
  `gameRedemptions`) lands with the URL change in that phase.
- **Matchers for `eventLanding` and `eventAdmin`.** Land with the
  routes that mount them: `eventAdmin` in M2 phase 2.2,
  `eventLanding` cross-app handling in M2 phase 2.3 / M3 phase
  3.3 as appropriate.
- **`validateNextPath` allowlist additions** for `eventAdmin` or
  cross-app `eventLanding` redirects. Land with the consumers in
  the phases above.
- **E2E fixture URL literals.** Test data describing the URL
  contract under test, not consumers of the builder layer.
- **Doc prose URL references.** Describe the contract; not
  consumers.

## Risk Register

- **`AppPath` narrowing regresses during the move.** Each builder
  returns an `AppPath` literal type; the `as const` on the
  `routes` object is what enables that narrowing. A reviewer
  patching the move could drop the assertion or restructure the
  exported shape and silently widen the return type to `string`,
  which would break `validateNextPath`'s return-type guarantee
  without any runtime symptom in tests. Mitigation: the strict
  TypeScript pass in `npm run build:web` flags any widening
  immediately, since `AuthCallbackPage` and other consumers
  assign builder returns into `AuthNextPath` or `AppPath` slots;
  the cross-cutting invariant names the rule explicitly so
  self-review walks for it.
- **`window.location.origin` access leaks into a server-side
  caller.** `validateNextPath` is browser-only by construction.
  A future `apps/site` server-side code path that imports the
  function will fail at runtime under SSR. Mitigation: the
  README ownership note documents the constraint upfront; the
  Cross-Cutting Invariant "no env or framework-specific imports"
  is extended in this plan to call out the browser-API edge.
  Server-side next-path validation, if needed in M2 phase 2.3,
  is a separate seam (parameterizing `origin` rather than
  reading from `window`); deferred until a concrete server-side
  consumer surfaces.
- **Mock-import path drift in tests.** No `vi.mock` calls today
  reference the routes or validateNextPath modules by string
  path (verified during scoping); the move does not require
  test-mock surgery. Mitigation: the focused test runs in
  step 7 catch any unforeseen mock dependency.
- **Vitest include glob does not pick up `tests/shared/`.**
  `tests/shared/urls/routes.test.ts` is the first file to land
  under `tests/shared/`. If the existing
  [`vitest.config.ts`](../../vitest.config.ts) include glob is
  `tests/web/**/*.test.{ts,tsx}` (or similar), the moved test
  silently goes uncovered. Mitigation: step 4 runs the focused
  test command after the move; the implementer widens the
  include glob in the same commit if needed and verifies the
  test count increases by the moved file's assertions.
- **Epic-paragraph tightening drifts from the implementation.**
  The phase 1.2 paragraph tightening (operator-route builder
  names, deferred matchers, `routes` vs. `urls` naming) is
  load-bearing for future readers of the epic. Mitigation:
  the tightening lands in the same PR as the code, and the
  Plan-to-PR Completion Gate explicitly walks the
  parent-epic edit before merge.

## Backlog Impact

Phase 1.2 closes no backlog items, opens no new ones, and
unblocks none. Backlog impact accumulates at the M1 gate per the
parent epic.

## Related Docs

- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M1 milestone owns the foundation extraction; sibling
  phases 1.1, 1.3, 1.4, 1.5 own their own plans.
- [`shared-db-foundation.md`](./shared-db-foundation.md) — the
  prior phase's plan and template precedent for module layout,
  README ownership note, and per-app adapter pattern.
- [`AGENTS.md`](../../AGENTS.md) — planning depth, plan-to-PR
  completion gate, doc currency, validation honesty, scope
  guardrails.
- [`docs/dev.md`](../dev.md) — current contributor workflow.
- [`docs/architecture.md`](../architecture.md) — current shape
  with the two-app split; updated by this plan to describe the
  new `shared/urls/` layer.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  named audits applied at this phase's gate.
- [`repo-rename.md`](./repo-rename.md) — runtime-identifier
  preservation rules carry over here (cookie names, header
  names, storage keys, workspace scope).
