# Test-Event Noindex Uniformity — Implementation Plan

## Status

Landed.

This is a small post-M3-close follow-up. The decision walked in
[`test-event-noindex-uniformity.md`](/docs/plans/test-event-noindex-uniformity.md)
(Option B, confirmed 2026-05-04) is implemented in the same PR
that flips this plan's Status. The deliberation lives in the
decision doc; this plan owns the implementation contract and the
doc-currency map.

## Context

After M3 phase 3.3.2 closed (PR #170), the test-event surface
coverage on the two test slugs (`harvest-block-party`,
`riverside-jam`) was uniformly `noindex`'d across the apps/site
landing and the three apps/web bypass-rendered surfaces (admin,
redeem, redemptions) — *except* for the gameplay route
`/event/:slug/game`, which was the lone outlier. The M3 plan's
"gameplay route is unchanged" framing read as preservation-of-
prior-state language, not active product design — apps/web had
no `noindex` story at all before M3, so the gameplay-route's
indexability was an artifact of that, not a deliberate choice.

The decision doc walked the question; the product owner
confirmed no partner-discovery scenario requires test-event
gameplay routes to be search-discoverable; Option B is the
chosen shape.

## Goal

Collapse the apps/web `noindex` config to a single catchall
entry covering every URL under a test-event slug, replacing the
6-entry surface-enumerated shape PR #170 shipped. Specifically:

- `apps/web/vercel.json` `headers` array drops from six entries
  to one. The single entry's `source` is
  `/event/:slug(harvest-block-party|riverside-jam)/:path*`,
  emitting `X-Robots-Tag: noindex, nofollow`.
- The Vitest enforcement test at
  `tests/web/demo-mode-bypass-noindex.test.ts` rewrites to assert
  the single-entry shape, the slug-list byte-equivalence with
  `TEST_EVENT_SLUGS` (unchanged contract), the catchall source
  shape `/event/:slug(...)/:path*`, positive coverage against
  concrete bypass + gameplay paths under both test slugs, and
  negative coverage against real-event slugs.
- Real-event slugs (`madrona-launch-day` and any future non-test
  slug) remain fully indexable — the regex constraint excludes
  them, and the Vitest negative-coverage assertions enforce that
  property at CI time.
- The decision doc's Status flips `Open` → `Resolved` (Option B
  chosen, 2026-05-04).
- The Tier 4 backlog entry that pointed at the decision doc
  closes (removed from `docs/backlog.md`) per the backlog
  convention.
- Doc-currency updates: `docs/architecture.md` apps/web app-
  section paragraph + apps/site metadata-section paragraph are
  revised to name the catchall instead of the per-surface list;
  `README.md` and `docs/product.md` "current implemented slice"
  bullets are revised similarly.
- This plan's Status flips `Proposed` → `Landed` in the same PR.

After this PR merges, the test-event surface is uniformly
internal-partner-shaped end-to-end: every URL under a test slug
is invisible to public search at parity strength across both
apps/site (server-rendered `robots`) and apps/web (edge-emitted
`X-Robots-Tag`).

## Non-Goals

This plan does NOT touch:

- **The M3 milestone doc or M3 phase plans.** Those are durable
  historical records of what M3 contracted at the time. The
  contract change happens post-M3-close, in this plan; M3's docs
  remain accurate as a historical record. (The architecture doc,
  README, and product doc are exceptions because they describe
  the *current* state, not the M3-time state.)
- **Real-event noindex behavior.** `madrona-launch-day` and any
  future real-event slug remain fully indexable. The negative-
  coverage Vitest assertions enforce this.
- **The apps/site `generateMetadata` `robots` emit.** Unchanged.
  The apps/site test-event landing was already noindex; this PR
  does not modify that mechanism.
- **The apps/web bypass dispatch logic.** The page-component
  bypass branches in `EventAdminPage`, `EventRedeemPage`, and
  `EventRedemptionsPage` are unchanged. The bypass-rendered
  surfaces still render via `DemoModeBanner` + `DemoMode*View`;
  only the noindex coverage broadens.
- **Server-side write rejection (`evaluateDemoModeRejection`).**
  Unchanged.
- **Playwright fixture.** Unchanged. The Playwright fixture
  asserts surface rendering on bypass routes, not noindex
  headers; that contract is independent of the catchall change.

## Naming

No new identifiers, classes, files, or migrations. The single
remaining identifier worth naming for cross-doc reference is
the `:slug(harvest-block-party|riverside-jam)` regex constraint
— same load-bearing slug-list hand-mirror surface as before,
now appearing in one source instead of six.

## Contracts

### apps/web noindex emit (catchall shape)

`apps/web/vercel.json` `headers` array contains exactly one
entry:

```json
{
  "source": "/event/:slug(harvest-block-party|riverside-jam)/:path*",
  "headers": [
    { "key": "X-Robots-Tag", "value": "noindex, nofollow" }
  ]
}
```

Path-to-regexp `:path*` is "zero or more path segments separated
by `/`," so the single source matches `/event/<test-slug>` plus
every URL under it (admin, admin/, admin/sub-path,
game, game/, game/redeem, game/redemptions, and any future
surface added under a test slug). Non-test slugs do not match
the `:slug(...)` regex constraint and receive no
`X-Robots-Tag` header.

`Verified by:`
[`apps/web/vercel.json`](/apps/web/vercel.json) (the catchall
entry as shipped);
[Vercel docs on path-to-regexp `source` semantics](https://vercel.com/docs/project-configuration/vercel-json#headers)
(named-parameter regex constraints + `:path*` zero-or-more
matching);
[`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts)
(`TEST_EVENT_SLUGS` source of truth that the regex constraint
hand-mirrors).

### Hand-mirror enforcement test (single-entry shape)

`tests/web/demo-mode-bypass-noindex.test.ts` reads
`apps/web/vercel.json` and asserts:

- **Entry count.** Exactly one `headers` entry.
- **Header.** That entry's `headers[]` array contains exactly
  one element with `key === "X-Robots-Tag"` and
  `value === "noindex, nofollow"`.
- **Source shape.** That entry's `source` matches
  `/^\/event\/:slug\([^)]+\)\/:path\*$/` — explicitly enforces
  the catchall shape so a future drift to per-surface
  enumeration without re-decision fails CI.
- **Slug-list byte-equivalence.** The `:slug(...)` regex
  constraint group is byte-equivalent to `TEST_EVENT_SLUGS.join("|")`
  after sorting both sides alphabetically. (Same drift-guard
  contract as the M3-time test; only the shape changed.)
- **Positive coverage.** A synthesized matcher equivalent to the
  catchall regex matches every concrete path in
  `PATHS_THAT_MUST_INHERIT_NOINDEX` — bypass surfaces, gameplay
  routes, trailing-slash variants, and a future-bypass-surface
  placeholder under both test slugs.
- **Negative coverage.** The synthesized matcher does NOT match
  any path in `PATHS_THAT_MUST_NOT_INHERIT_NOINDEX` — real-event
  surfaces (`/event/madrona-launch-day/admin`, etc.) stay
  indexable.

The test runs under `npm run test` (Vitest default; `tests/**/*.test.ts`
glob).

`Verified by:`
[`tests/web/demo-mode-bypass-noindex.test.ts`](/tests/web/demo-mode-bypass-noindex.test.ts)
(the single-entry assertions as shipped);
[`shared/events/testEventAllowlist.ts:18-21`](/shared/events/testEventAllowlist.ts)
(`TEST_EVENT_SLUGS` array literal — the source of truth the
test reads against);
[`docs/plans/test-event-noindex-uniformity.md`](/docs/plans/test-event-noindex-uniformity.md)
(the decision-doc framing for why the catchall shape is the
right contract).

### Decision-doc + backlog closure

- `docs/plans/test-event-noindex-uniformity.md` Status flips
  `Open` → `Resolved (Option B chosen, 2026-05-04)`. The
  options walkthrough below the Status block remains as the
  durable record of the deliberation.
- `docs/backlog.md` Tier 4 entry "**`decision` Test-event
  gameplay-route noindex uniformity**" is removed per the
  backlog convention.
- This plan's Status flips `Proposed` → `Landed` in-PR.

### Doc-currency map

- **`README.md`** — current bullet says the apps/web edge emits
  `X-Robots-Tag` on the bypass-eligible URL paths; revised to
  say every URL under a test-event slug.
- **`docs/architecture.md`** — apps/web app-section paragraph
  (currently names the six-entry shape after PR #170) revised to
  name the catchall covering every URL under a test slug.
  apps/site metadata-section paragraph (currently names the
  three demo-mode bypass-rendered surfaces) revised to name the
  uniform-test-event-slug coverage.
- **`docs/product.md`** — "current implemented slice" bullet
  revised similarly.
- **NOT edited:**
  - **`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`**
    — historical record of M3-time contract; the Goal section's
    "gameplay route is unchanged" framing was accurate at M3-
    close and remains accurate as a historical record. Updating
    it would be revising history.
  - **`docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md`**
    — same reasoning. The plan documents the M3-time 6-entry
    decision; this PR's catchall is a post-M3 follow-up, not a
    revision of the M3 contract.
  - **`docs/operations.md`, `docs/styling.md`, `docs/dev.md`,
    `docs/open-questions.md`, `docs/self-review-catalog.md`** —
    no operational, styling, dev-workflow, open-question, or
    audit surface added by this change.

## Files To Touch

### New

- `docs/plans/test-event-noindex-uniformity-plan.md` — this
  file. Status flips through `Proposed` → `Landed` in the
  implementing PR.

### Modify

- `apps/web/vercel.json` — collapse 6 `headers` entries to 1
  catchall.
- `tests/web/demo-mode-bypass-noindex.test.ts` — rewrite for
  single-entry shape per Contracts above.
- `docs/plans/test-event-noindex-uniformity.md` — flip Status
  `Open` → `Resolved`; record the decision rationale.
- `docs/backlog.md` — remove the Tier 4 decision entry pointing
  at the decision doc.
- `docs/architecture.md` — revise apps/web app-section paragraph
  + apps/site metadata-section paragraph per doc-currency map.
- `README.md` — revise the demo-mode bullet per doc-currency map.
- `docs/product.md` — revise the demo-mode bullet per doc-
  currency map.

### Intentionally not touched

Per the Non-Goals + Contracts "Doc-currency map":

- `docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`
- `docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md`
- `docs/plans/epics/demo-expansion/epic.md`
- `apps/site/app/event/[slug]/page.tsx` (apps/site noindex
  precedent unchanged)
- `apps/web/src/admin/DemoModeAdminView.tsx`,
  `apps/web/src/redemptions/DemoModeRedemptionsView.tsx`,
  `apps/web/src/redeem/DemoModeRedeemView.tsx` (bypass-rendered
  surfaces unchanged)
- `apps/web/src/pages/EventAdminPage.tsx`,
  `apps/web/src/pages/EventRedeemPage.tsx`,
  `apps/web/src/pages/EventRedemptionsPage.tsx` (bypass dispatch
  unchanged)
- `shared/events/testEventAllowlist.ts` (allowlist source of
  truth unchanged; consumed by the rewritten Vitest test)
- `tests/e2e/demo-mode-bypass.spec.ts`,
  `playwright.demo-mode-bypass.config.ts` (Playwright fixture
  unchanged — it covers surface rendering, not noindex headers)
- `supabase/functions/_shared/demo-mode-rejection.ts` (write-side
  rejection unchanged)
- `docs/operations.md`, `docs/styling.md`, `docs/dev.md`,
  `docs/open-questions.md`, `docs/self-review-catalog.md`

## Execution Steps

1. **Collapse `apps/web/vercel.json`** from 6 paired entries to
   1 catchall entry.
2. **Rewrite `tests/web/demo-mode-bypass-noindex.test.ts`** for
   the single-entry shape. Assertions: entry count, header
   key/value, catchall source shape, slug-list byte-equivalence,
   positive coverage walk, negative coverage walk.
3. **Run `npm run test`** and confirm the rewritten test passes
   alongside the rest of the suite.
4. **Resolve `test-event-noindex-uniformity.md`** — flip Status
   `Open` → `Resolved`; record the decision.
5. **Land the doc-currency map** — `README.md`,
   `docs/architecture.md`, `docs/product.md`. Re-read each
   paragraph in context to confirm the catchall framing reads
   accurately.
6. **Remove the Tier 4 backlog entry** pointing at the decision
   doc (decision now made; backlog convention says remove
   completed items).
7. **Flip this plan's Status** `Proposed` → `Landed` once
   implementation is in.
8. **Run the Validation Gate** end-to-end: `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm run test`,
   `npm run test:e2e:demo-mode-bypass`.
9. **Render bypass surfaces in the apps/web dev server** and
   confirm no visible regression — the catchall change is at the
   edge layer; rendered surface should be identical to the
   post-PR-#170 state for every URL.

## Commit Boundaries

Two commits, mirroring the implementation/docs split:

1. **`refactor(web): collapse demo-mode noindex headers to single catchall covering all test-event surfaces`**
   — `apps/web/vercel.json` 6→1 + `tests/web/demo-mode-bypass-noindex.test.ts`
   single-entry rewrite.
2. **`docs: resolve test-event-noindex-uniformity decision (Option B) and land implementation plan`**
   — decision-doc Status flip + this plan creation as `Landed` +
   `README.md` / `docs/architecture.md` / `docs/product.md`
   doc-currency edits + `docs/backlog.md` entry removal.

## Validation Gate

**Automated checks:**

- `npm run lint` — passes.
- `npm run build:web` — passes (apps/web Vite build is
  unaffected; the only change is config-shaped).
- `npm run build:site` — passes (apps/site Next.js build is
  unaffected; doc-currency edits are markdown-only).
- `npm run test` — passes (470+ tests; the rewritten Vitest
  enforcement test is the meaningful change).
- `npm run test:e2e:demo-mode-bypass` — passes (Playwright
  surface assertions unchanged; webServer is Vite which doesn't
  emit `vercel.json` headers anyway, so no behavior change).

**Manual-verify checklist:**

- **Render the apps/web bypass surfaces** in the dev server.
  Confirm `DemoModeBanner` + the read-only callout render
  identically to PR #170's rendered state on
  `/event/harvest-block-party/admin`,
  `/event/harvest-block-party/game/redeem`, and
  `/event/harvest-block-party/game/redemptions`. The catchall
  change is at the edge layer; rendered output should be
  identical because the SPA still serves the same components on
  the same routes.
- **Inspect the Vercel-emitted noindex header** via `curl -sI`
  against the PR's Vercel preview deploy URL. Test the full
  uniform-coverage claim: each of admin / game/redeem /
  game/redemptions / **game** must carry `X-Robots-Tag: noindex, nofollow`
  on both `harvest-block-party` and `riverside-jam` (8 curls);
  the negative cases — non-test slug `/event/madrona-launch-day/admin`
  and `/event/madrona-launch-day/game` — must NOT carry the
  header (2 curls). The gameplay-route positive case is the
  load-bearing new behavior in this PR; the others confirm no
  regression. Record curl outputs in the PR body's Validation
  section.

## Self-Review Audits

The diff surface is one config edit + one test rewrite + a
handful of doc-currency edits. The relevant audits:

- **Allowlist-drift audit (inherited from milestone-level
  Cross-Phase Risk).** The catchall regex constraint
  `:slug(harvest-block-party|riverside-jam)` continues to be the
  hand-mirror surface. The Vitest byte-equivalence assertion
  catches drift between this regex and `TEST_EVENT_SLUGS`. No
  new bypass-eligibility predicate sites are introduced — the
  diff has zero TS guard-site additions. Real-event slugs are
  protected by the negative-coverage test cases.
- **Falsifiability audit (inherited).** The Vitest
  positive-coverage walk fails CI if the catchall shape is
  weakened (e.g., reverted to per-surface enumeration without
  re-decision). The negative-coverage walk fails CI if the
  catchall accidentally widens to non-test slugs. Together
  they pin both ends of the contract.
- **Doc-historicity audit (this-plan-internal).** Confirms the
  M3 milestone doc, M3 phase plans, and epic doc are NOT
  modified by this PR (per the Non-Goals framing — those are
  historical records of M3-time contracts and should not be
  retroactively rewritten). The architecture doc, README, and
  product doc are EXCEPTIONS because they describe current state.

## Documentation Currency PR Gate

Per AGENTS.md "Plan-to-PR Completion Gate":

- **`README.md`** — satisfied (demo-mode bullet revised to name
  uniform-test-event-slug coverage).
- **`docs/architecture.md`** — satisfied (apps/web app-section
  + apps/site metadata-section paragraphs revised).
- **`docs/product.md`** — satisfied (current-implemented-slice
  bullet revised).
- **`docs/backlog.md`** — satisfied (Tier 4 decision entry
  removed).
- **`docs/plans/test-event-noindex-uniformity.md`** — satisfied
  (Status flipped `Open` → `Resolved`; decision recorded).
- **`docs/plans/test-event-noindex-uniformity-plan.md`** (this
  file) — satisfied (Status flipped `Proposed` → `Landed`).
- **NOT edited (intentional):** `docs/operations.md`,
  `docs/styling.md`, `docs/dev.md`, `docs/open-questions.md`,
  `docs/self-review-catalog.md`,
  `docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`,
  `docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md`,
  `docs/plans/epics/demo-expansion/epic.md`.

## Out Of Scope

- **Reopening the gameplay-route indexability question.** The
  decision doc resolved Option B; this plan implements it.
  Re-litigation requires a new decision doc or scoping pass.
- **Surface-granular header customization.** The catchall shape
  forecloses (without further refactor) per-surface header
  differences (e.g., adding `nosnippet` only to admin). The
  decision doc walked this trade-off; not a load-bearing need
  today.
- **Real-event slug noindex.** Real events stay fully indexable;
  the regex constraint excludes them. Any future product
  decision about real-event noindex is its own scoping pass.
- **Migrating M3 milestone-doc / phase-plan language to "uniform
  noindex" framing.** Those are historical records; the post-M3
  follow-up is captured here, not retroactively in M3's docs.
- **Generalizing demo-mode beyond the test-event allowlist.**
  Already deferred at M3-close as a post-epic backlog item; not
  affected by this change.

## Risk Register

- **Path-to-regexp version drift on the Vercel side.** The
  catchall depends on Vercel's `:path*` semantics (zero-or-more
  segments separated by `/`) staying stable. Mitigation: the
  manual-verify `curl -sI` checklist exercises the gameplay
  route positive case explicitly, so any Vercel-side semantics
  shift would be caught at preview-deploy time pre-merge.
  Falsifier: the gameplay route's preview-deploy response is
  missing `X-Robots-Tag` despite the catchall shape being
  config-correct.
- **Loss of surface-granular control becomes load-bearing
  later.** If a future need wants per-surface header differences
  (e.g., `nosnippet` on admin only), the catchall has to be
  unwound back to surface enumeration. Mitigation: the
  unwinding is a small refactor (reverse of this PR's
  collapse); the explicit-list shape is recoverable from this
  plan's history if needed. Probability: low —
  `noindex, nofollow` is the policy across all bypass surfaces
  today and the apps/site precedent uses the same uniform value.
- **Future bypass surface added under a test slug inherits
  noindex without explicit author thought.** The catchall covers
  every URL under a test slug, including surfaces that haven't
  been authored yet. **In context this is a feature** (uniform
  internal-partner-audience invariant) rather than a bug — the
  decision doc walked this explicitly. Mitigation: any author
  who wants a future test-slug surface to be indexable now has
  to make an explicit decision to exclude it, which is the
  correct default direction.

## Backlog Impact

**Items closed by this PR:**

- The Tier 4 `decision` entry "Test-event gameplay-route noindex
  uniformity" in `docs/backlog.md` (added in PR #172) is
  removed per the backlog convention.
- The `test-event-noindex-uniformity.md` decision doc Status
  flips to `Resolved`.

**Items unblocked by this PR:**

- None. This is a small, self-contained follow-up; the
  internal-partner-audience invariant integrity is now
  end-to-end uniform, but no downstream work was waiting on it.

**Items added by this PR for post-PR work:**

- None.

## Related Docs

- [`docs/plans/test-event-noindex-uniformity.md`](/docs/plans/test-event-noindex-uniformity.md)
  — sibling decision doc; owns the deliberation prose; Status
  flips `Open` → `Resolved` in the same PR as this plan flips
  `Proposed` → `Landed`.
- [`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
  — M3 milestone doc (historical, unchanged).
- [`docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-3-2-plan.md)
  — phase 3.3.2 plan (historical, unchanged); documented the
  M3-time 6-entry shape this PR collapses.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — config under
  the catchall collapse.
- [`tests/web/demo-mode-bypass-noindex.test.ts`](/tests/web/demo-mode-bypass-noindex.test.ts)
  — Vitest enforcement test; rewritten for single-entry shape.
- [`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts)
  — `TEST_EVENT_SLUGS` source of truth (unchanged); consumed by
  the rewritten Vitest test.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
  — apps/site `generateMetadata` `robots` precedent; unchanged.
- [`AGENTS.md`](/AGENTS.md) — Plan-to-PR Completion Gate, Plan
  content is a mix of rules and estimates, Bans on surface
  require rendering the consequence (applied to copy, not
  applicable here), Scope Guardrails.
