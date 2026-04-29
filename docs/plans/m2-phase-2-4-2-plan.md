# M2 Phase 2.4.2 — Flip Routing And Retarget E2E To Cross-App Shape

## Status

Proposed. **Two-phase Plan-to-Landed Gate For Plans That Touch
Production Smoke** from [`docs/testing-tiers.md`](../testing-tiers.md).
Both trigger clauses apply: this PR (1) extends/modifies production
smoke assertions — the URL pattern in
[`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
changes from `/admin/events/${eventId}` to `/event/${eventSlug}/admin`
— and (2) depends on production smoke as final verification — the
apps/web → apps/site proxy for `/admin*` is unverifiable pre-merge by
construction
([`apps/web/vercel.json`](../../apps/web/vercel.json) destinations are
absolute production URLs).

The implementing PR merges with Status `In progress pending prod smoke`
(the rule's exact required string, not `Landed` and not a paraphrase);
a doc-only follow-up commit flips Status to `Landed` after the
post-release `Production Admin Smoke` run is green and records the
run URL inline as durable external evidence.

Sub-phase of M2 phase 2.4 — see
[`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella) for the
phase-level context, sequencing rationale, cross-sub-phase invariants,
phase-level Out of Scope, and cross-sub-phase risks.

**Position in sequence.** Second of three serial sub-phases. Cannot
draft or merge until 2.4.1 is in main: this PR's Vercel proxy flip
sends production `/admin*` requests at apps/site, which only resolves
correctly if 2.4.1's
`apps/site/app/(authenticated)/admin/page.tsx` already shipped.
Cannot merge before 2.4.3 because 2.4.3's apps/web deletion would
leave production with no `/admin` resolver if the proxy flip hasn't
already happened (and reverting 2.4.2 must remain feasible without
having to revert 2.4.3 too — see umbrella Risk Register).

**Single PR.** Branch-test sketch — apps/web: 1 modify (`vercel.json`);
tooling: 2 modifies (`run-auth-e2e-dev-server.cjs`, `capture-ui-review.cjs`);
tests: 2 modifies (`admin-workflow.admin.spec.ts`,
`admin-production-smoke.spec.ts`); docs: 3-4 modifies (architecture,
operations, dev, README currency check); plan: this file's Status flip.
~10 files total. Production behavior changes in this PR.

## Context

This is the cutover PR. After 2.4.1 added the new platform admin to
apps/site (and left it unreachable from production), this PR flips the
Vercel routing so production `/admin` resolves to apps/site instead of
apps/web. The legacy apps/web `AdminPage` is still in source after this
PR — it's just no longer reachable in production. 2.4.3 deletes it.

The PR also retargets the end-to-end Playwright fixtures and the local
auth e2e proxy that backs them, because the URL flow they walk now
crosses two apps mid-test: a user lands on apps/site `/admin`, clicks
`Open workspace`, hard-navigates to apps/web `/event/${slug}/admin` for
the deep editor, then comes back to apps/site `/admin`. The fixtures
already exercise this exact flow at the user-action level (click `Open
workspace`, expect URL match); only the URL pattern changes.

This is the smallest possible piece of work that moves production from
the legacy admin to the new one. Bundling it with the new-page
implementation (2.4.1) or the legacy-deletion (2.4.3) would put more
diff under the production-smoke gate than necessary and make
post-deploy regressions harder to bisect.

What this PR touches:

- The Vercel same-origin proxy (`apps/web/vercel.json`) — gains
  `/admin` and `/admin/:path*` proxy-rewrites pointing at apps/site,
  loses the legacy `/admin/:path*` SPA fallback to apps/web's
  `index.html`.
- The local auth e2e dev server — its `isSiteRequest` routing widens
  to send `/admin*` to apps/site too, so contributors running
  Playwright admin specs locally exercise the same cross-app shape
  as production.
- The two Playwright admin specs — their URL assertions retarget from
  `/admin/events/${eventId}` (legacy apps/web URL) to
  `/event/${eventSlug}/admin` (apps/web deep editor, the new
  navigation target after `Open workspace`). Visible copy and ARIA
  locators stay stable per the cross-sub-phase ARIA-stability
  invariant.
- The UI-review capture script — its workspace-screenshot URLs
  retarget similarly.
- Documentation that names URL ownership (architecture, operations,
  dev) — updates to reflect that apps/site now owns `/admin*`.

What this PR doesn't touch: any apps/web admin source files (the
legacy `AdminPage`, `AdminDashboardContent`, etc. stay in source
through this PR — 2.4.3 deletes them); `shared/urls/` (its
deprecated route family lives on through this PR — 2.4.3 removes
it); the apps/site admin page itself (2.4.1 owns its
implementation).

## Goal

Flip production `/admin*` from the legacy apps/web SPA to the
apps/site implementation 2.4.1 added, and retarget the local auth
e2e fixtures + production smoke fixture to walk the new cross-app
URL shape. After this PR's deploy and the post-release smoke run go
green, root-admins land on apps/site `/admin` (not apps/web) when
they sign in, the `Open workspace` button navigates them to apps/web
`/event/:slug/admin` (the deep editor from phase 2.2), and the
production smoke assertions verify the round-trip end-to-end against
the deployed origin.

## Cross-Cutting Invariants Touched

These are sub-phase-local. See the umbrella for cross-sub-phase
rules.

- **Production smoke fixture URL retargeting.** The PR modifies
  [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
  URL assertions but does not change the fixture setup
  ([`tests/e2e/admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts)
  unchanged) — `redirectTo` still points at
  `/auth/callback?next=/admin`, the magic-link round-trip semantics
  are unchanged, only the post-`Open workspace` URL shape changes.
- **Auth-cookie boundary preserved.** Cookie is set host-only (no
  `Domain=` attribute, per
  [`shared/db/client.ts:48-66`](../../shared/db/client.ts#L48)).
  The Vercel proxy-rewrite preserves the request host so
  `Set-Cookie` from apps/site lands on apps/web's frontend domain.
  This was verified end-to-end in M2 phase 2.3's deploy; the same
  proxy mechanism handles `/admin*` here. The post-release smoke
  run implicitly re-verifies because the fixture's magic-link
  round-trip cannot complete unless the cookie lands on the right
  host.

## Naming

No new files in this PR. All edits are to files that already exist.

## Contracts

**`apps/web/vercel.json` (modify).** Apply two changes to the
rewrites array (current state per
[`apps/web/vercel.json`](../../apps/web/vercel.json)):

1. **Remove** the rule at array position 9: `{ "source":
   "/admin/:path*", "destination": "/index.html" }`.
2. **Add** two new proxy-rewrites: `{ "source": "/admin",
   "destination": "https://neighborly-events-site.vercel.app/admin" }`
   and `{ "source": "/admin/:path*", "destination":
   "https://neighborly-events-site.vercel.app/admin/:path*" }`.
   Position them adjacent to the existing apps/site cross-app
   proxies (after `/_next/:path*`, alongside `/auth/callback` /
   `/`). Exact placement is locked by the implementer at edit time;
   correctness does not depend on position because no other rule
   competes for `/admin*` after the SPA fallback removes. Verified
   by: tracing the post-edit array against the negative test "no
   earlier rule matches `/admin*`" with the existing rule set —
   the only `/admin*`-matching rule pre-edit is the SPA fallback
   being removed.

The `/_next/:path*` proxy (existing from 2.3) covers apps/site's
asset path resolution for the new `/admin` page; no new asset-proxy
rule is needed.

**`scripts/testing/run-auth-e2e-dev-server.cjs` (modify).** Two
changes:

1. **`isSiteRequest()`** (currently lines 47-56) — extend to
   include `/admin` and `/admin/...` paths in the apps/site routing
   branch. The post-edit predicate matches `/`, `/?...`,
   `/auth/callback`, `/auth/callback?...`, `/_next/...`,
   `/__nextjs...`, `/admin`, `/admin?...`, `/admin/...`. Verified
   by: reading the function pre-edit and writing one falsifying
   sentence per branch (e.g., "if `/admin/foo` doesn't match,
   the auth e2e proxy sends it to apps/web and the test fixture
   404s instead of reaching apps/site").
2. **`handleReadyRequest()`** (currently line 97) — change the
   apps/web upstream probe from `requestUpstream("/admin", webPort)`
   to a probe that targets apps/site at `/admin` (since apps/site
   now owns the URL). The probe verifies that branch-local apps/site
   serves the new `/admin` page; success means the route is
   reachable and the bootstrap seam ran. The webPort probe stays
   for an apps/web-served URL — `/event/community-checklist/game`
   or similar — so the readiness check still confirms both servers
   are up. Implementer chooses the apps/web probe path at edit time
   from the existing apps/web URL set.

**`tests/e2e/admin-workflow.admin.spec.ts` (modify).** Three URL
assertions retarget. After the edits:

- Line 65: `await expect(page).toHaveURL(new RegExp(`/event/${fixture.eventSlug}/admin$`));`
  (was: `/admin/events/${fixture.eventId}$`).
- Line 91: `await page.goto(`/event/${fixture.eventSlug}/admin`, { waitUntil: "networkidle" });`
  (was: `/admin/events/${fixture.eventId}`).
- Line 125: same pattern as line 65.

Every other assertion stays unchanged. The ARIA / copy stability
invariant guarantees `Game draft access` heading, `Event workspace
summary` aria region, `${eventName} event` card label, `Open
workspace` / `Open live game` / `Duplicate` button names,
`${liveCount} live` summary text, `Live v…` / `Draft only` status
text, `aria-disabled="true"` + `aria-describedby` discipline,
`Status: Draft only` text, `Slug: ${eventSlug}` text (latter on
apps/web deep-editor side, post-2.2, unchanged), and `Back to all
events` button text all still resolve. Verified by: 2.4.1's local
apps/site exercise diffs every state branch's visible copy + ARIA
against
[`apps/web/src/admin/AdminDashboardContent.tsx`](../../apps/web/src/admin/AdminDashboardContent.tsx);
when 2.4.1 lands as merged code, the fixture re-check at this
sub-phase's pre-edit gate confirms the diff stayed clean.

**`tests/e2e/admin-production-smoke.spec.ts` (modify).** Same
retargeting as `admin-workflow.admin.spec.ts`:

- Line 72: `/event/${fixture.eventSlug}/admin$` regex (was:
  `/admin/events/${fixture.eventId}$`).
- Line 95: `page.goto(`/event/${fixture.eventSlug}/admin`)` (was:
  `/admin/events/${fixture.eventId}`).
- Line 123: same pattern as line 72.

Other assertions unchanged. The fixture
([`admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts))
is unchanged.

**`scripts/ui-review/capture-ui-review.cjs` (modify).** Workspace
URL retargeting:

- The legacy `${baseUrl}/admin/events/${encodeURIComponent(...)}`
  patterns at lines 634, 639-640, 835 retarget to
  `${baseUrl}/event/${encodeURIComponent(slug)}/admin`. The slug
  comes from the fixture's `eventSlug`; if the fixture exposes only
  `eventId`, the script either looks up the slug from the seeded
  draft or accepts a separate fixture field (implementer chooses
  at edit time).
- Captures of the bare `/admin` URL (lines 567, 576, 600, 618, 906)
  survive unchanged — `baseUrl` continues to be apps/web's origin,
  the proxy serves apps/site `/admin` through it. For local runs,
  the script must point at the auth e2e proxy origin (port 4173,
  not the plain `npm run dev:web` Vite origin) so `/admin*`
  resolves to apps/site. The implementer adds an inline comment
  header to the script naming this so a future contributor doesn't
  hit a confusing 404 by running against `dev:web` directly.

**`docs/architecture.md` (modify).** Update URL ownership shape:
apps/site now owns `/admin*` in addition to `/` and `/auth/callback`
from 2.3; apps/web's transitional ownership shrinks to
`/event/:slug/*` (game / admin / redeem / redemptions). Concrete
edits — line 30 (transitional ownership parenthetical), line 51 in
operations.md style (Vercel routing topology table — match line
numbers from the merged-in state at edit time), the apps/web
`/admin` route adapter description (delete the description, since
the route is no longer apps/web-owned in production), the apps/site
landing description (extend with `/admin` ownership). The apps/web
admin module description that references both platform-admin and
deep-editor surfaces stays — 2.4.3 owns the rewrite for
apps/web's module ownership.

**`docs/operations.md` (modify).** Update line 51 (`SPA route
rewrites for /admin, /event/:slug/game, …`) to drop `/admin` from
the SPA list and note the apps/site cross-app proxy carries it.
Update lines 174-175 (the `next=` allow-list example) — note that
`/admin/events/:eventId` is no longer an example; `/admin` stays in
the list (still a valid post-sign-in destination). Line 261
(`PRODUCTION_SMOKE_BASE_URL/admin` curl example) is unchanged in
URL but the response now resolves through apps/site; add a
parenthetical noting this. Line 289 (Supabase dashboard
redirect-URL list) — the `/admin` URL is unchanged; only the
resolving framework changes; no dashboard edit required.

**`docs/dev.md` (modify).** Update the apps/web URL list to
exclude `/admin*` (apps/site owns it now); update the Vercel
two-project rule precedence walk-through (the rules added/removed
in this PR); update the auth e2e proxy sub-section to reflect the
widened `isSiteRequest` set. Concrete line numbers identified at
implementation time against the merged-in state of dev.md.

**`README.md` (currency check).** Confirm no line still names
`/admin` as apps/web-owned. If any do, fix in this PR.

## Files To Touch

### Modify

- [`apps/web/vercel.json`](../../apps/web/vercel.json) — proxy
  flip per Contracts.
- [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
  — `isSiteRequest` widening + readiness probe retarget.
- [`tests/e2e/admin-workflow.admin.spec.ts`](../../tests/e2e/admin-workflow.admin.spec.ts)
  — three URL assertions retarget.
- [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
  — three URL assertions retarget.
- [`scripts/ui-review/capture-ui-review.cjs`](../../scripts/ui-review/capture-ui-review.cjs)
  — workspace URL retargeting + local-run header comment.
- [`docs/architecture.md`](../architecture.md) — URL ownership
  shape; Vercel routing topology table.
- [`docs/operations.md`](../operations.md) — SPA rewrites list,
  `next=` allow-list example, smoke `curl` example context.
- [`docs/dev.md`](../dev.md) — apps/web URL list, rule precedence
  walk-through, auth e2e proxy sub-section.
- [`README.md`](../../README.md) — currency check; edit only if
  lines still name `/admin` as apps/web-owned.
- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella) —
  Sub-phase Status table row for 2.4.2 updates to `In progress
  pending prod smoke` with PR link in this PR; updates to `Landed`
  with second PR link in the doc-only follow-up commit.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status table row for 2.4 stays `Proposed` (the umbrella
  flips when all three sub-phases land).
- This plan — Status flips from `Proposed` to `In progress pending
  prod smoke` in the implementing PR; flips to `Landed` in the
  doc-only follow-up commit.

### Files intentionally not touched

- Apps/site source — 2.4.1 owns the implementation. This PR does
  not edit
  [`apps/site/app/(authenticated)/admin/page.tsx`](../../apps/site/app/(authenticated)/admin/page.tsx),
  [`apps/site/lib/setupEvents.ts`](../../apps/site/lib/setupEvents.ts),
  or
  [`apps/site/components/SharedClientBootstrap.tsx`](../../apps/site/components/SharedClientBootstrap.tsx).
  If 2.4.1's ARIA / copy needs adjustment to satisfy the e2e specs,
  the fix lands in 2.4.1 (re-opened) before 2.4.2 merges — not in
  2.4.2 itself.
- Apps/web admin source — 2.4.3 owns the deletion. The legacy
  `AdminPage` etc. stay in source through this PR (dead code post-
  cutover but still compiled).
- [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx) — 2.4.3
  removes the `/admin` and `/admin/events/:eventId` route branches.
  They remain through 2.4.2 — the apps/web SPA still has handlers
  for these URLs, but the proxy never forwards them to apps/web.
- [`shared/urls/`](../../shared/urls) — 2.4.3.
- Edge Functions, migrations,
  [`shared/auth/`](../../shared/auth),
  [`shared/db/`](../../shared/db) — no change.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree, feature branch (not
   `main`), and that **2.4.1 has merged to main** — the apps/site
   `/admin` page must exist in source for this PR's proxy flip to
   resolve correctly. Re-read the umbrella's Sequencing section,
   2.4.1's plan, and 2.3's plan (specifically the Validation Gate
   section that established the `vercel dev` identity-fingerprint
   procedure — the same procedure applies here for rule-order
   verification). Re-run the reality-check gate: confirm 2.4.1's
   merged ARIA / copy matches what the e2e specs expect (the diff
   from 2.4.1's local exercise in step 6 of that plan is the
   reference).
2. **Baseline validation.** Run `npm run lint`, `npm test`,
   `npm run test:functions`, `npm run build:web`, and
   `npm run build:site`. All must pass before any edit. Capture a
   `npm run ui:review:capture:admin` snapshot of the existing
   apps/web `/admin` event-list and apps/web `/admin/events/${eventId}`
   workspace states (the latter still resolving via the apps/web
   SPA at this point) so the PR description has a before
   reference.
3. **Vercel proxy flip.** Edit
   [`apps/web/vercel.json`](../../apps/web/vercel.json) per the
   Contracts section: remove the `/admin/:path*` SPA rule, add
   `/admin` and `/admin/:path*` proxy-rewrites. `npm run lint`
   confirms JSON is well-formed (the lint script doesn't gate on
   JSON, but the file must parse for `vercel.json` to apply at
   deploy).
4. **Auth e2e proxy retarget.** Edit
   [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
   `isSiteRequest()` and `handleReadyRequest()` per the Contracts
   section.
5. **e2e spec URL retargeting.** Edit
   [`tests/e2e/admin-workflow.admin.spec.ts`](../../tests/e2e/admin-workflow.admin.spec.ts)
   and
   [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
   per the Contracts section. Three assertions per file.
6. **UI review script retargeting.** Edit
   [`scripts/ui-review/capture-ui-review.cjs`](../../scripts/ui-review/capture-ui-review.cjs)
   per the Contracts section. Add the inline comment header noting
   local runs need the auth e2e proxy origin for `/admin*`.
7. **Local auth e2e exercise.** With apps/site env vars set, run
   `npx playwright test --config playwright.admin.config.ts`. The
   auth e2e proxy starts apps/web (Vite, port 4173) and apps/site
   (Next dev), routes `/admin*` + `/auth/callback` + `/_next/*` +
   `/` to apps/site and everything else to apps/web. The
   `admin-workflow.admin.spec.ts` test exercises the full
   save / publish / unpublish round-trip through the post-cutover
   URL contract: `/admin` (apps/site) → `Open workspace` →
   `/event/${slug}/admin` (apps/web) → save / publish / unpublish
   through the proxied authoring functions → `/admin` again. Pass
   means the cross-app navigation, ARIA / copy stability, and the
   `installAuthoringFunctionProxy` setup all work end-to-end on the
   local origins. **Load-bearing pre-merge** — this is the strongest
   pre-merge integration check because the auth e2e proxy
   reproduces the cross-app routing on local origins where
   `vercel dev` cannot.
8. **`vercel dev` rule-order regression check** (negative-control
   procedure inherited from
   [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) Execution step
   14 / Validation Gate). The check verifies (a) existing rules
   still fire correctly, (b) the new `/admin` and `/admin/:path*`
   rules fire (response carries the deployed-apps/site identity
   headers — `x-vercel-id`, `server: Vercel`, etc. — distinguishing
   "rule fired and reached deployed apps/site" from "local-no-match"
   and from "rule missing"), and (c) `/admin` no longer hits
   apps/web's SPA fallback (the deleted rule). The check **cannot**
   validate the new `/admin*` proxy rules end-to-end because
   `apps/web/vercel.json` destinations are absolute production
   URLs; under `vercel dev` the proxy hits the deployed apps/site
   (which has the new `/admin` route post-2.4.1 merge), but
   anything specific to this PR's deploy isn't reflected in
   deployed apps/site until this PR itself deploys. Capture the
   curl outputs in the PR validation section as the load-bearing
   fingerprint.
9. **Documentation pass.** Edit
   [`docs/architecture.md`](../architecture.md),
   [`docs/operations.md`](../operations.md),
   [`docs/dev.md`](../dev.md), and check
   [`README.md`](../../README.md) per the Contracts section. Walk
   the [`AGENTS.md`](../../AGENTS.md) "Doc Currency Is a PR Gate"
   triggers. Update the umbrella's Sub-phase Status table row for
   2.4.2 to `In progress pending prod smoke` (preparing for the
   in-progress flip in step 11).
10. **Validation re-run.** All baseline commands from step 2 must
    pass. `npm run lint`, `npm test`, `npm run build:web`,
    `npm run build:site`. The `admin-workflow.admin.spec.ts` and
    `admin-production-smoke.spec.ts` files now reference URLs that
    resolve correctly post-cutover; they cannot run as full
    end-to-end tests without the auth e2e proxy (the spec is type-
    checked by `npm run lint`, exercised end-to-end by the
    Playwright run in step 7).
11. **Code-review feedback loop.** Walk the diff against every
    Cross-Cutting Invariant Touched and every Self-Review Audit
    named below. Apply fixes; commit review-fix changes separately
    per AGENTS.md Review-Fix Rigor.
12. **Plan-to-PR completion gate (in-progress).** Walk every Goal,
    Cross-Cutting Invariant, Validation Gate command, and
    Self-Review Audit. Confirm each is satisfied or deferred to
    the post-release smoke run. Flip Status from `Proposed` to
    **`In progress pending prod smoke`** in the same PR — the
    rule's exact required string per
    [`docs/testing-tiers.md`](../testing-tiers.md), not a
    paraphrase. The `Landed` flip lands in step 14's doc-only
    follow-up commit.
13. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters
    (suggested: `feat(m2-2.4.2): flip /admin routing to apps/site`).
    Validation section lists every command actually run plus the
    step-7 local auth e2e exercise and the step-8 rule-order
    regression check; explicitly notes that cross-project end-to-end
    verification of the new `/admin*` proxy rules is deferred to
    the post-release `Production Admin Smoke` run (step 14) per
    the two-phase Plan-to-Landed Gate. UX Review: include
    before/after screenshots of `/admin` (apps/web AdminPage →
    apps/site `/admin` page from 2.4.1), captured by running the
    auth e2e proxy and walking the same fixture state for both.
    The deep-editor screenshots (apps/web `/event/:slug/admin`)
    do not need re-capture (phase 2.2 surface unchanged).
    Remaining Risk: every cross-project end-to-end assertion is
    deferred to the post-release smoke run; the doc-only follow-up
    commit (step 14) is the gate that actually flips Status to
    `Landed`.
14. **Post-release `Production Admin Smoke` run (release-owner
    activity — load-bearing gate).** After the PR merges and
    Vercel deploys both apps to production, the release owner
    triggers (or waits for) the `Production Admin Smoke` workflow
    run per
    [`docs/tracking/production-admin-smoke-tracking.md`](../tracking/production-admin-smoke-tracking.md).
    The workflow runs the modified
    [`tests/e2e/admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
    end-to-end on the production origin. The fixture cannot pass
    post-deploy unless the `apps/web/vercel.json` proxy correctly
    routes `/admin` to apps/site, the auth cookie lands on apps/web's
    frontend host, the apps/site `/admin` page renders the
    workspace with the new ARIA / copy contract, the `Open
    workspace` button hard-navigates to `/event/${slug}/admin`
    (apps/web deep editor from 2.2), the deep editor saves /
    publishes / unpublishes via the authoring functions, and direct
    navigation to `/event/${slug}/admin` reaches the deep editor.
    The smoke run URL is the durable external evidence the
    Plan-to-Landed Gate requires. If the smoke run fails, file a
    focused follow-up rather than treating Status as flippable.
15. **Plan Status follow-up (doc-only commit).** Once the
    `Production Admin Smoke` run from step 14 passes green, open
    a doc-only commit on a follow-up branch that:
    - Flips this plan's Status from `In progress pending prod
      smoke` to `Landed`.
    - Records the smoke run URL inline in the Status section.
    - Updates the umbrella's Sub-phase Status table row for 2.4.2
      to `Landed` with both PR links.
    - Updates
      [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
      Phase Status table row for 2.4 — stays `Proposed` (umbrella
      flips when all three sub-phases land).
    The follow-up commit's PR description references the smoke
    run URL as the source of truth.

## Commit Boundaries

1. **Vercel proxy flip + tooling retarget.**
   [`apps/web/vercel.json`](../../apps/web/vercel.json) edit,
   [`run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
   `isSiteRequest()` + ready-probe edits,
   [`admin-workflow.admin.spec.ts`](../../tests/e2e/admin-workflow.admin.spec.ts)
   + [`admin-production-smoke.spec.ts`](../../tests/e2e/admin-production-smoke.spec.ts)
   URL retargeting,
   [`capture-ui-review.cjs`](../../scripts/ui-review/capture-ui-review.cjs)
   workspace URL retarget. Single commit; this is the load-bearing
   cutover commit. Bisect-friendly: any cutover regression localizes
   here.
2. **Documentation pass.**
   [`docs/architecture.md`](../architecture.md) /
   [`docs/operations.md`](../operations.md) /
   [`docs/dev.md`](../dev.md) edits + [`README.md`](../../README.md)
   currency check + the umbrella's Sub-phase Status row update +
   this plan's Status flip from `Proposed` to **`In progress
   pending prod smoke`**. Single commit. **Not** the `Landed`
   flip — that ships in the step-15 doc-only follow-up commit.
3. **Review-fix commits.** As needed, kept distinct per AGENTS.md
   Review-Fix Rigor.
4. **Doc-only Status follow-up (separate branch + PR).** Per
   step 15, lands after the post-release smoke run passes green.
   Single commit on a follow-up branch; the implementing PR stays
   at `In progress pending prod smoke` until this commit merges.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. The Playwright
  spec changes are picked up by lint + type-check, not by `npm
  test` (which runs vitest); end-to-end exercise is in step 7.
- `npm run test:functions` — pass on baseline; pass on final
  (unchanged).
- `npm run build:web` — pass on baseline; pass on final.
- `npm run build:site` — pass on baseline; pass on final.
- pgTAP suite — pass on baseline; pass on final via
  `npm run test:db`. No SQL change.
- **Local auth e2e exercise per Execution step 7** — load-bearing
  pre-merge for the cross-app navigation contract +
  `Open workspace` retargeting + ARIA / copy stability + auth e2e
  proxy `isSiteRequest` widening + readiness probe retarget. The
  auth e2e proxy reproduces the production cross-app proxy on local
  origins, exercising what `vercel dev` cannot reach. The full
  `admin-workflow.admin.spec.ts` save / publish / unpublish
  round-trip is the integration check.
- **`vercel dev` rule-order regression check per Execution step 8**
  — load-bearing pre-merge for "the new `/admin*` proxy rules
  don't shadow existing routes and actually fire (not local-no-match
  404)." Uses the identity-fingerprint procedure from
  [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md); the apps/site
  positive signature and the local-no-match negative control are
  the load-bearing assertions.
- **Post-release `Production Admin Smoke` run per Execution step
  14 — load-bearing gate, deferred to production by construction.**
  Per [`docs/testing-tiers.md`](../testing-tiers.md) "Plan-to-
  Landed Gate For Plans That Touch Production Smoke," 2.4.2 ships
  under the two-phase gate. Both trigger clauses apply (extends
  smoke assertions + depends on production smoke as final
  verification); either alone would suffice. The implementing PR
  merges with Status `In progress pending prod smoke`; the
  doc-only follow-up commit (Execution step 15) flips Status to
  `Landed` after the smoke run is green and records the run URL
  inline.
- Existing e2e fixtures
  ([`admin-auth-fixture.ts`](../../tests/e2e/admin-auth-fixture.ts),
  [`redeem-auth-fixture.ts`](../../tests/e2e/redeem-auth-fixture.ts),
  [`redemptions-auth-fixture.ts`](../../tests/e2e/redemptions-auth-fixture.ts))
  — must continue to pass. Magic-link redirect URLs unchanged; the
  auth e2e proxy widens to route `/admin*` to apps/site so the
  round-trip resolves correctly post-cutover.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md).

### Frontend / e2e

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../self-review-catalog.md#L354)).
  The two e2e specs are not renamed; their URL assertions retarget.
  Reviewers see one Vercel proxy flip + e2e URL pattern updates +
  doc updates; not a refactor.

### CI / build

- **Readiness-gate truthfulness audit**
  ([catalog §Readiness-gate truthfulness audit](../self-review-catalog.md#L373)).
  The auth e2e proxy's readiness check now probes apps/site at
  `/admin` (and a still-apps/web URL for the apps/web side). The
  audit confirms the probe actually exercises what it claims —
  hitting `/admin` against the apps/site dev server returns the new
  page (post-2.4.1), not a 404 from a misrouted probe; hitting the
  apps/web URL against the apps/web dev server returns the SPA
  fallback. Both branches must succeed before Playwright starts.
- **CLI / tooling pinning audit**
  ([catalog §CLI / tooling pinning audit](../self-review-catalog.md#L331)).
  No new dependencies in this PR. Audit confirms the lockfile
  doesn't drift.

### Runbook

- **Platform-auth-gate config audit**
  ([catalog §Platform-auth-gate config audit](../self-review-catalog.md#L446)).
  Three configuration surfaces:
  - **`supabase/config.toml`** — re-confirmed unchanged
    ([`supabase/config.toml:9-19`](../../supabase/config.toml#L9)).
  - **Supabase Auth dashboard redirect-URL list** — `/auth/callback?next=/admin`
    is unchanged; only the resolving framework for `/admin`
    changes. No dashboard edit required. The PR description names
    this assertion explicitly.
  - **apps/site Vercel project env vars** — already set by 2.3's
    [#120](https://github.com/kcrobinson-1/neighborly-events/pull/120)
    follow-up. The new `/admin` page consumes the same
    `NEXT_PUBLIC_SUPABASE_*` values; no additional env-var
    configuration required.

## Documentation Currency PR Gate

- [`docs/architecture.md`](../architecture.md) — URL ownership
  shape; Vercel routing topology table.
- [`docs/operations.md`](../operations.md) — SPA rewrites list,
  smoke `curl` example context, `next=` allow-list example.
- [`docs/dev.md`](../dev.md) — apps/web URL list, rule precedence
  walk-through, auth e2e proxy sub-section.
- [`README.md`](../../README.md) — currency check; edit only if
  needed.
- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) (umbrella) —
  Sub-phase Status row for 2.4.2 updates to `In progress pending
  prod smoke` in this PR; updates to `Landed` in the doc-only
  follow-up commit.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status table row for 2.4 stays `Proposed`.
- This plan — Status flips from `Proposed` to `In progress pending
  prod smoke` in this PR; flips to `Landed` in the doc-only
  follow-up commit.
- The 2.4.3 plan, the apps/web admin module ownership update in
  [`docs/architecture.md`](../architecture.md), and SCSS prune
  documentation are owned by 2.4.3, not this PR.

## Out Of Scope

Sub-phase-local exclusions. See umbrella for phase-level Out of
Scope.

- **apps/web platform-admin deletion.** 2.4.3.
- **`shared/urls` deprecation.** 2.4.3.
- **apps/web SCSS prune.** 2.4.3.
- **apps/web `App.tsx` admin route branch removal.** 2.4.3.
- **apps/site admin page implementation.** 2.4.1 (already merged
  by the time this PR opens).
- **Per-event Theme registration on the new `/admin` page.**
  Deferred to M4 phase 4.1.

## Risk Register

Sub-phase-local risks. See umbrella for cross-sub-phase risks.

- **Vercel rule ordering mishap.** Misordering would either shadow
  the new `/admin*` proxy with the deleted SPA fallback (defeating
  the cutover) or shadow the surviving event-scoped rules.
  Mitigation: Contracts section pins the rule placement; Execution
  step 8's identity-fingerprint check confirms each post-flip rule
  fires correctly; Execution step 14's post-deploy smoke run is
  the load-bearing verification.
- **Auth e2e proxy readiness probe breaks Playwright.** If the
  retargeted readiness probe fails (apps/site dev server not yet
  serving the new `/admin` page, or the apps/web probe URL doesn't
  exist), Playwright's `webServer` config waits forever. Mitigation:
  Execution step 7's first run validates the readiness signal works
  correctly before any test runs; if it hangs, the implementer
  fixes the probe before declaring step 7 complete.
- **e2e fixture URL retarget reveals 2.4.1 ARIA / copy drift.** If
  2.4.1's local apps/site exercise missed an ARIA / copy difference
  from the apps/web baseline, this PR's local auth e2e exercise
  surfaces it as a Playwright failure. Mitigation: the fix lands in
  2.4.1 (re-opened or follow-up PR) before 2.4.2 merges, not in
  2.4.2 itself — keeps each PR's verb clean (this PR is "flip
  wiring," not "fix the new page"). The fix is small (string
  edit); the cost of the round-trip is real but bounded.
- **Cookie-boundary regression.** Cookie set host-only by
  [`shared/db/client.ts:48-66`](../../shared/db/client.ts#L48); the
  Vercel proxy preserves the request host. If a proxy implementation
  surprise rewrites the host, `Set-Cookie` lands on the apps/site
  domain instead of apps/web's frontend domain. Mitigation: the
  post-release smoke run implicitly verifies because
  `admin-auth-fixture.ts`'s magic-link round-trip cannot complete
  unless the cookie lands on the right host. This was verified
  end-to-end in 2.3's deploy; the same proxy mechanism handles
  `/admin*` here.
- **Production smoke run takes longer than expected to schedule.**
  The release owner triggers the smoke run; if scheduling slips,
  the implementing PR sits at `In progress pending prod smoke` for
  a long window. Mitigation: the named Status string keeps the
  drift visible; AGENTS.md memory rule on Plan-to-PR Completion
  Gate forbids paraphrasing the in-progress label, so this state
  is queryable.

## Backlog Impact

- No backlog entries open or close in this PR.

## Related Docs

- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) — umbrella.
- [`m2-phase-2-4-1-plan.md`](./m2-phase-2-4-1-plan.md) — sibling
  sub-phase (the new page); must be in main before this PR drafts
  or merges.
- [`m2-phase-2-4-3-plan.md`](./m2-phase-2-4-3-plan.md) — sibling
  sub-phase (deletion); must not merge until this PR is `Landed`
  (post-smoke).
- [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) — Landed sibling;
  identity-fingerprint procedure for `vercel dev` rule-order
  checks; auth e2e proxy precedent.
- [`docs/testing-tiers.md`](../testing-tiers.md) — Tier 5 production
  smoke and the two-phase Plan-to-Landed Gate.
- [`docs/tracking/production-admin-smoke-tracking.md`](../tracking/production-admin-smoke-tracking.md)
  — production smoke workflow ownership.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules.
