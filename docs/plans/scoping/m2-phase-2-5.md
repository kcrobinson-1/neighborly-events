# M2 Phase 2.5 — Scoping

## Goal

Migrate the two operator routes from their bare `/event/:slug/*` URLs into
the `/event/:slug/game/*` namespace owned by apps/web:
`/event/:slug/redeem` becomes `/event/:slug/game/redeem` and
`/event/:slug/redemptions` becomes `/event/:slug/game/redemptions`. The
phase is a pure URL migration — page component files keep their names
(`EventRedeemPage`, `EventRedemptionsPage` per M4 phase 4.1's
references), the `shared/urls/` builders and matchers rename to
`gameRedeem` / `gameRedemptions` so builder name and URL stay aligned at
every gate (per the M1 phase 1.2 contract), and the `vercel.json`
carve-outs for the now-defunct bare paths are removed because the
`/event/:slug/game/*` namespace carve-out from M0 phase 0.3 already
covers the new URLs. Hard cutover with no backward-compat redirects.
ThemeScope wrapping for these route shells stays deferred to M4 phase
4.1; phase 2.5 introduces no new visual or behavioral change.

## Inputs From Siblings

- **From M0 phase 0.3 (Landed).** The `/event/:slug/game` and
  `/event/:slug/game/:path*` rewrites in
  [apps/web/vercel.json](../../../apps/web/vercel.json) (rules 1–2)
  already route the migrated URLs to apps/web. Phase 2.5 deletes the
  now-redundant rules 5–6 (`/event/:slug/redeem` and
  `/event/:slug/redemptions`) without adding new namespace coverage.
- **From M1 phase 1.2 (Landed).** [shared/urls/routes.ts](../../../shared/urls/routes.ts)
  exports `routes.eventRedeem(slug)`, `routes.eventRedemptions(slug)`,
  `matchEventRedeemPath`, `matchEventRedemptionsPath`, and the
  corresponding `AppPath` literal-union members
  (`/event/${string}/redeem`, `/event/${string}/redemptions`); plus
  [shared/urls/validateNextPath.ts](../../../shared/urls/validateNextPath.ts)'s
  allow-list entries for both matchers. The shared-urls plan
  explicitly defers the `gameRedeem`/`gameRedemptions` rename to this
  phase ("the rename to `gameRedeem`/`gameRedemptions` lands with the
  URL change in M2 phase 2.5 so builder name and URL stay aligned at
  every gate").
- **From phase 2.1 ([m2-phase-2-1.md:95–101](m2-phase-2-1.md)).**
  Designates 2.5 as M2's terminal phase: 2.5's PR flips the epic's
  M2 status-row to `Landed` and closes the post-MVP
  authoring-ownership entry in
  [docs/open-questions.md](../../open-questions.md). 2.5 adopts
  this convention.
- **From phase 2.3 ([m2-phase-2-3.md:242–250](m2-phase-2-3.md)).**
  2.3 owns the host-side rewrite of
  [tests/e2e/redeem-auth-fixture.ts](../../../tests/e2e/redeem-auth-fixture.ts)
  and [tests/e2e/redemptions-auth-fixture.ts](../../../tests/e2e/redemptions-auth-fixture.ts)
  when `/auth/callback` moves to apps/site. 2.5 only edits the
  path component of `next=`; the host part is 2.3's surface, and
  2.5's plan doc lifts whichever shape 2.3 lands.
- **From phase 2.2, 2.4.** Nothing.

## Outputs Other Siblings Need

- **Final URL strings for the operator routes.** M4 phase 4.1's
  `<ThemeScope>` wiring in apps/web's [App.tsx](../../../apps/web/src/App.tsx)
  dispatcher targets `EventRedeemPage at its /game/redeem URL` and
  `EventRedemptionsPage at its /game/redemptions URL`; the epic
  already names these renamed URLs verbatim, so 2.5 is the phase that
  lands them. After 2.5, no further URL change happens to these routes
  in this epic.
- **Renamed `shared/urls/` builder + matcher names.** Any future caller
  (post-epic agent assignment UI, M3 phase 3.3 cross-app navigation
  polish, M4 phase 4.1 ThemeScope wiring) imports `routes.gameRedeem`
  / `routes.gameRedemptions` and
  `matchGameRedeemPath` / `matchGameRedemptionsPath`.
- **No new URL contract.** The `/event/:slug/game/*` namespace was
  reserved by M0 phase 0.3 and is permanent. 2.5 does not reshape the
  URL contract for downstream phases beyond moving these two routes
  into it.
- **M2 milestone closure.** As M2's terminal phase (per 2.1's
  scoping), 2.5's PR flips the epic's M2 status row to `Landed` and
  closes the post-MVP authoring-ownership entry in
  `docs/open-questions.md`. M3 phase 3.3 and M4 phase 4.1 read M2's
  status as the gate for their own ThemeScope-continuity work.

## File Inventory

### shared/urls/

- [shared/urls/routes.ts](../../../shared/urls/routes.ts) — edit.
  Rename builders `eventRedeem`/`eventRedemptions` →
  `gameRedeem`/`gameRedemptions` (URLs change to `/game/redeem` and
  `/game/redemptions`); rename matchers
  `matchEventRedeemPath`/`matchEventRedemptionsPath` →
  `matchGameRedeemPath`/`matchGameRedemptionsPath` (suffix constants
  follow); update `AppPath` literal-union members to the new
  variants.
- [shared/urls/validateNextPath.ts](../../../shared/urls/validateNextPath.ts)
  — edit. Update the two matcher imports and allow-list branches;
  surrounding logic unchanged.
- [shared/urls/index.ts](../../../shared/urls/index.ts) — edit.
  Re-export the renamed entries.

### apps/web

- [apps/web/src/App.tsx](../../../apps/web/src/App.tsx) — edit.
  Update the two matcher imports and dispatch branches; page
  component imports and JSX unchanged.
- [apps/web/src/pages/EventRedeemPage.tsx](../../../apps/web/src/pages/EventRedeemPage.tsx)
  — edit. Update the JSDoc URL references
  (`/event/:slug/redeem` → `/event/:slug/game/redeem`) at the file
  header and the route-shell export. No behavior or component-name
  change.
- [apps/web/src/pages/EventRedemptionsPage.tsx](../../../apps/web/src/pages/EventRedemptionsPage.tsx)
  — edit. Same JSDoc URL update for the redemptions monitoring URL.

### Tests

All edits below are URL-string updates from the bare paths to
`/game/redeem` and `/game/redemptions`; no behavior or assertion
shape changes.

- [tests/shared/urls/routes.test.ts](../../../tests/shared/urls/routes.test.ts)
  — edit. Updates for the two renamed builders and matchers.
- [tests/shared/urls/validateNextPath.test.ts](../../../tests/shared/urls/validateNextPath.test.ts)
  — edit. Four assertions at lines 84–104.
- [tests/web/App.test.tsx](../../../tests/web/App.test.tsx) — edit.
  Redeem-route dispatch pathname at line 73.
- [tests/web/pages/EventRedeemPage.test.tsx](../../../tests/web/pages/EventRedeemPage.test.tsx)
  / [EventRedemptionsPage.test.tsx](../../../tests/web/pages/EventRedemptionsPage.test.tsx)
  — edit. Magic-link `next` assertions (lines 91 and 185).
- [tests/e2e/redeem-auth-fixture.ts](../../../tests/e2e/redeem-auth-fixture.ts)
  / [redemptions-auth-fixture.ts](../../../tests/e2e/redemptions-auth-fixture.ts)
  — edit. Magic-link `next` URL constants (lines 30 and 31).
- [tests/e2e/mobile-smoke.redeem.spec.ts](../../../tests/e2e/mobile-smoke.redeem.spec.ts)
  / [mobile-smoke.redemptions.spec.ts](../../../tests/e2e/mobile-smoke.redemptions.spec.ts)
  — edit. `page.goto` and `toHaveURL` patterns.

### supabase/

- No SQL or edge-function changes. Edge-function URL paths
  (`redeem-entitlement`, `reverse-entitlement-redemption`,
  `get-redemption-status`) are independent of the frontend route
  URLs and stay where they are.

### docs/

- [docs/architecture.md](../../architecture.md) — edit. URL ownership
  prose (line 59), `EventRedeemPage` / `EventRedemptionsPage`
  route-inventory entries (lines 93, 97), `next=` snippets in the
  redeem and redemptions sections (lines 609, 614, 635, 640–641),
  and the Vercel routing topology table — delete rules 5 and 6,
  renumber remaining rules, and delete the bare-path-operator
  carve-out footnote. Phases 2.3 and 2.4 also rewrite this table;
  2.5's edits compose on top of whichever state lands first (see
  the inter-phase coordination open question below).
- [docs/dev.md](../../dev.md) — edit. apps/web URL list (lines
  54–55) and the rule-precedence walk-through (lines 791–807) drop
  the bare-path operator references.
- [docs/product.md](../../product.md) — edit. URL strings at line 47.
- [README.md](../../../README.md) — edit. URL references at lines
  32, 36, 67.
- [docs/plans/event-platform-epic.md](../event-platform-epic.md) —
  edit. Flip the M2 row in the milestone-status table from
  `Proposed` to `Landed`; rewrite the phase 2.5 paragraph to mark
  Status `Landed` per the Plan-to-PR Completion Gate. (Phase 2.1's
  scoping designates 2.5 as M2's terminal phase, so this flip is
  unconditional.)
- [docs/open-questions.md](../../open-questions.md) — edit. Close
  the "Post-MVP authoring ownership and permission management"
  entry (current location around line 31). The epic resolves it in
  M2; the close-out lands here per 2.1's scoping.
- The plan doc at `docs/plans/m2-phase-2-5-plan.md` is a downstream
  task, not part of this scoping.

### vercel.json

- [apps/web/vercel.json](../../../apps/web/vercel.json) — edit.
  Delete the `/event/:slug/redeem` and `/event/:slug/redemptions`
  rewrites (rules 5 and 6 in source order). The `/event/:slug/game`
  and `/event/:slug/game/:path*` carve-outs at rules 1–2 already
  cover the new URLs; the cross-app `/event/:slug/:path*` rewrite at
  current rule 8 sits below them in file order so the new URLs
  match rules 1–2 before reaching the apps/site proxy.

## Contracts

- `routes.gameRedeem(slug: string): AppPath` returns
  `/event/${encodeURIComponent(slug)}/game/redeem`; replaces
  `routes.eventRedeem`. `routes.gameRedemptions(slug)` mirrors for
  `/game/redemptions`.
- `matchGameRedeemPath(pathname): { slug: string } | null` parses
  `/event/:slug/game/redeem`, decodes the slug, rejects empty slug
  and embedded slashes after decoding. Mirrors today's
  `matchEventRedeemPath`; only the suffix constant changes.
  `matchGameRedemptionsPath` mirrors for `/game/redemptions`.
- `AppPath` literal-union swaps `/event/${string}/redeem` and
  `/event/${string}/redemptions` for the `/game/`-prefixed
  variants; `AuthNextPath` follows automatically.
- `validateNextPath`: allow-list shape unchanged; only the two
  matcher imports rename.
- `EventRedeemPage` / `EventRedemptionsPage` props and exports
  unchanged — the slug-prop contract is identical, the JSDoc URL
  strings are the only edits inside the page files.

## Cross-Cutting Invariants Touched

- **URL contract.** Phase 2.5 *exercises* the `/event/:slug/game/*`
  namespace contract by completing the move it was designed for.
  After this phase merges, no `/event/:slug/redeem` or
  `/event/:slug/redemptions` URL exists anywhere in the codebase or
  the routing config; the `/game/*` namespace is the sole owner.
- **Auth integration.** `validateNextPath`'s open-redirect defense
  must continue to admit only the renamed paths — the four
  matchers' existing decoding-and-validation discipline (reject
  embedded slashes after decoding, reject empty slugs) carries
  over verbatim.
- **Theme route scoping.** No new ThemeScope wrapping. The migrated
  routes continue to render against apps/web's warm-cream `:root`
  defaults; their `<ThemeScope>` wiring stays deferred to M4 phase
  4.1, which already names the migrated URLs.
- **Deferred ThemeScope wiring.** Phase 2.5 does not register
  Madrona's `Theme`, does not wrap the operator route shells, and
  does not reach into apps/web's `App.tsx` ThemeScope-placement
  seam. The deferral remains intact and the M4 phase 4.1 wiring
  contract is unchanged.
- **Trust boundary.** No SQL, RLS, or edge-function change. The
  operator routes continue to call `redeem-entitlement`,
  `reverse-entitlement-redemption`, and the existing PostgREST
  reads under the same authorization model. Phase 2.5 does not
  cross the trust boundary.
- **In-place auth.** The page-shell sign-in surface is unchanged;
  only the `next=` URL the magic-link request emits is rewritten.

## Validation Gate

- `npm run lint` and `npm run build:web`.
- Vitest covering the renamed builders/matchers (incl. empty-slug
  and embedded-slash rejection), the `validateNextPath` allow-list
  at the new URLs, the `App.tsx` route-dispatch branch, and
  `EventRedeemPage`/`EventRedemptionsPage` magic-link `next=`
  emitting the `/game/redeem` and `/game/redemptions` paths.
- Playwright `mobile-smoke.redeem.spec.ts` and
  `mobile-smoke.redemptions.spec.ts` exercise the new URLs
  end-to-end against a real Supabase backend; fixtures'
  magic-link `next=` paths match.
- Manual: bare-path URLs (`/event/<slug>/redeem`,
  `/event/<slug>/redemptions`) hit apps/site rather than apps/web
  — confirms the `vercel.json` carve-out removal. No
  backward-compat redirect in scope.
- Manual: magic-link round-trip from
  `/auth/callback?next=/event/<slug>/game/redeem` (and
  `/game/redemptions`) lands on the operator page; stale `next=`
  at the bare path falls back to `routes.home`.
- Supabase Auth dashboard redirect-URL allow-list audited per
  environment.

## Self-Review Audits

Drawn from [docs/self-review-catalog.md](../../self-review-catalog.md);
the M2 paragraph already names these for phases 2.3 / 2.4 / 2.5.

### Frontend

- **Rename-aware diff classification.** The phase renames
  `routes.eventRedeem` → `routes.gameRedeem`,
  `routes.eventRedemptions` → `routes.gameRedemptions`,
  `matchEventRedeemPath` → `matchGameRedeemPath`,
  `matchEventRedemptionsPath` → `matchGameRedemptionsPath`, and
  rewrites URL string literals across tests, e2e fixtures, and docs.
  Reviewer attention should land on the small content edits (the
  `vercel.json` rule deletion, the `AppPath` member rename, the
  matcher `suffix` constants, the page-file JSDoc URL strings) and
  not on the bulk rename noise. Use `git diff --name-status` and the
  rename-aware classifier per the catalog rule.
- **Platform-auth-gate config audit.** The Supabase Auth dashboard
  redirect-URL allow-list, the `validateNextPath` allow-list, and
  the `vercel.json` rewrites must all agree on the new
  `/event/:slug/game/redeem` and `/event/:slug/game/redemptions`
  URLs across every environment (local, preview, production). Walk
  the three lists side-by-side before merge.

### CI

- **Rename-aware diff classification.** Any docs-only or scoped-test
  CI gate (e.g., a future "skip heavy tests on docs-only diffs"
  detector) must classify this branch as code-touching, since the
  rename touches `shared/urls/`, `apps/web/src/App.tsx`, the page
  files, and `vercel.json`.

### Runbook

- No SQL grants, function-body changes, or operational scripts in
  this phase, so the SQL/runbook audits do not apply.

## Open Questions

### Inter-phase coordination

- **`vercel.json` and architecture-table edit composition with 2.3
  and 2.4.** Phase 2.3 ([m2-phase-2-3.md:110–116, 157–162](m2-phase-2-3.md))
  adds apps/site `/auth/callback` and `/` proxies and locks a rule
  ordering; phase 2.4 ([m2-phase-2-4.md:112–119](m2-phase-2-4.md))
  adds apps/site `/admin*` proxies and removes `/admin/:path*`
  from the SPA fallback. Both also rewrite the architecture
  topology table. Phase 2.5's rule-5–6 deletions and renumbering
  compose cleanly, but the surviving rule list and table row
  numbers shift with merge order. 2.5's plan doc re-derives both
  against the merged-in state of 2.3 and 2.4, not today's repo.

### Epic-level

- **Cross-app smoke for the bare-path retirement.** The epic does
  not specify whether the now-retired bare-path URLs should serve a
  deliberate 404 from apps/site, fall through apps/site's
  catch-all, or emit a deliberate "this URL moved to /game/redeem"
  message. The default scoping assumption is "let apps/site's
  ordinary unknown-route response handle them" — no per-URL
  handling on either side. Plan-drafting confirms or revisits.

## Risks

- **Stale `next=` in Supabase Auth Site URL.** Magic-link redirects
  pointing at bare-path operator URLs land on apps/site (now
  unknown), and `validateNextPath` falls back to `routes.home`; the
  operator never reaches the redeem page. Mitigation: per-env
  dashboard audit during PR prep.
- **Forgotten URL literal.** A missed `/event/<slug>/redeem` string
  passes locally because the apps/web SPA rule 9 fallback still
  rewrites the path to `/index.html` and mounts the not-found page,
  which a wrong test assertion can mask. Mitigation: grep
  `/event/.*/redeem` and `/event/.*/redemptions` across the entire
  repo before handoff.
- **`AppPath` literal-union drift.** A stale
  `/event/${string}/redeem` template literal anywhere fails the
  type-check; `npm run build:web` surfaces drift immediately.
- **vercel.json rule reordering.** Deleting rules 5–6 must not move
  the cross-app `/event/:slug/:path*` rule above the `/game/*`
  carve-outs, or the new operator URLs proxy to apps/site instead
  of apps/web. The manual validation step catches this.
- **Cross-environment dashboard drift.** Each Supabase environment
  has its own redirect-URL allow-list; missing one leaves
  preview-origin organizers at a redirect-rejected error.
  Mitigation: per-env audit in the PR's Validation section.
- **M2-status-flip premature.** Per 2.1's scoping 2.5 is M2's
  terminal phase, but if 2.5 merges before 2.1/2.2/2.3/2.4 (e.g.,
  re-sequenced due to dependency drift), flipping M2 to `Landed`
  is wrong. Mitigation: at PR-prep time, walk every other M2
  phase's epic Status; flip only when all four are `Landed`.
