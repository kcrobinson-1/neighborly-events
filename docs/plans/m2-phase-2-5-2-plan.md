# M2 Phase 2.5.2 — Vercel Cutover + Local Proxy + URL-Shape Doc Currency

## Status

Proposed.

Sub-phase of M2 phase 2.5 — see
[`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) (umbrella) for
the phase-level context, sequencing rationale, cross-sub-phase
invariants, phase-level Out of Scope, and cross-sub-phase risks.

**Position in sequence.** Second of three. Cannot draft or merge
until 2.5.1 is `Landed` — see the umbrella's sequencing diagram
and the "Hard dependencies on landed siblings" subsection. 2.5.3
cannot draft until this sub-phase is `Landed` AND its post-deploy
manual verification ran green — see "M2-status-flip premature"
risk in the umbrella.

**Single PR.** Branch-test sketch — routing config: 1 modify
(`apps/web/vercel.json`); local proxy: 1 modify
(`scripts/testing/run-auth-e2e-dev-server.cjs`) + 1 modify
(`tests/scripts/run-auth-e2e-dev-server.test.ts`); URL-shape
docs: 3 modifies (`docs/architecture.md`, `docs/dev.md`,
`docs/operations.md`); plan Status: 1 (this file). ~7 files.
~2 distinct subsystems (production routing + local-proxy-faithful-
to-it; doc currency for URL ownership shape). The cutover is the
load-bearing edit; everything else in this PR follows the cutover
to keep doc and local-test state synchronous with production.

## Context

This sub-phase is the production routing cutover. The
`apps/web/vercel.json` carve-outs at rules 5–6
(`/event/:slug/redeem` and `/event/:slug/redemptions` →
`/index.html`) delete; the bare paths now flow through the
cross-app `/event/:slug/:path*` proxy at rule 8 (renumbered to
rule 6 post-edit) and serve apps/site's ordinary unknown-route
response per the
[milestone doc](./m2-admin-restructuring.md) "Settled by default"
entry on cross-app smoke for bare-path retirement. The local
auth-e2e dev-server proxy
([`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs))
is the test infrastructure that mirrors Vercel's routing on local
origins; its `isSiteRequest` decision function widens to match the
new production behavior, with a matching unit test update. The
docs that describe URL ownership shape — the architecture topology
table, the architecture top-level URL ownership prose, the dev.md
rule walkthrough, the operations.md Supabase Auth dashboard
description — update in the same PR so doc state matches deployed
reality.

It's the second sub-phase because the cutover is the
load-bearing risk surface in 2.5: `apps/web/vercel.json`'s rule
order is the one place a careless reorder could proxy the new
operator URLs to apps/site instead of apps/web (per the
[milestone doc](./m2-admin-restructuring.md) "Cross-Phase Risks
— Vercel rule-ordering misordering across 2.3, 2.4, 2.5"). Splitting
the cutover into its own PR concentrates reviewer attention on the
~6-line vercel.json diff and the ~5-line dev-server proxy diff —
the surfaces that matter — and isolates them from the rename
diff (2.5.1) and the cleanup paperwork (2.5.3). It also gives the
cutover its own bisect boundary if a post-deploy regression
surfaces.

What this sub-phase touches: the Vercel rewrite config; the local
auth-e2e dev-server proxy and its unit test; the doc surfaces
whose accuracy depends on the cutover (URL ownership shape).

What this sub-phase doesn't touch: any apps/web source
([`shared/urls/`](../../shared/urls), apps/web/src), the e2e
fixtures, the apps/site source, or any doc surface describing
page behavior or `shared/urls/` API shape (those are 2.5.3's).

## Goal

Land the production routing cutover that flips bare operator URLs
from apps/web's SPA fallback (rendering not-found because the
dispatcher no longer matches them, post-2.5.1) to apps/site's
ordinary unknown-route response. Keep the local auth-e2e
dev-server proxy production-faithful so the `tests/scripts/`
unit-test contract remains a meaningful production-fidelity
check. Land the doc currency that describes the post-cutover
routing topology so the architecture, dev, and operations docs
match deployed reality from this PR forward.

After merge:
- New operator URLs (`/event/<slug>/game/redeem`,
  `/event/<slug>/game/redemptions`) reach apps/web via existing
  rule 2 (`/event/:slug/game/:path*`). Unchanged from 2.5.1.
- Bare URLs (`/event/<slug>/redeem`, `/event/<slug>/redemptions`)
  reach apps/site via the renumbered cross-app rule 6
  (`/event/:slug/:path*`) and serve apps/site's unknown-route
  response. **This is the production behavior change.**
- The local auth-e2e dev-server proxy mirrors production: bare
  event-scoped paths flow to apps/site; `/event/<slug>/game/...`
  and `/event/<slug>/admin/...` stay on apps/web.
- Architecture topology table reads the post-cutover rule
  inventory; dev.md rule walkthrough matches; operations.md
  Supabase Auth dashboard description names the new URLs only.

## Cross-Cutting Invariants Touched

These are sub-phase-local. See the umbrella for cross-sub-phase
rules.

- **Vercel rule order preserved.** Deleting rules 5–6 must not
  reorder the surviving rules. Vercel applies rewrites in source
  order ("first match wins" per
  [`docs/architecture.md`](../architecture.md) "Vercel Routing
  Topology"); a careless edit that moves the cross-app
  `/event/:slug/:path*` rule above the `/event/:slug/game(/...)?`
  carve-outs would proxy the new operator URLs to apps/site
  instead of apps/web. Mitigation: the post-edit rule table in
  Contracts pins the surviving order; pre-merge code review diffs
  the file against the contracted shape.
- **Local proxy must except apps/web carve-outs from the
  bare-path-to-site branch.** The new `isSiteRequest` branch
  routes bare event-scoped paths
  (`/event/<slug>/something-not-game-or-admin`) to apps/site, but
  must NOT match `/event/<slug>/game(/...)?` or
  `/event/<slug>/admin(/...)?` — those stay on apps/web,
  matching production rule 1–4. A loose pattern silently breaks
  every fixture run that goes through the operator URLs.
  Mitigation: the unit test at
  [`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts)
  adds positive assertions for the new operator URLs (must stay
  on apps/web) alongside the flipped bare-path assertions.
- **Doc currency synchronous with cutover.** The
  architecture topology table, dev.md rule walkthrough, and
  operations.md Supabase Auth dashboard description all describe
  routing shape. They edit in this PR (not deferred to 2.5.3) so
  doc state is never out of sync with deployed routing.

## Naming

No new files. All edits modify existing files; vercel.json
deletions remove two source-order rules.

## Contracts

Each contract carries an inline "Verified by:" reference per
AGENTS.md.

**[`apps/web/vercel.json`](../../apps/web/vercel.json) (modify).**
Delete the two bare-path carve-out rules at current lines 19–26
(rules 5 and 6 in source order:
`{ "source": "/event/:slug/redeem", "destination": "/index.html" }`
and the `/event/:slug/redemptions` mirror). Every other rule
stays verbatim. After deletion the surviving rules in source
order are:

| New # | Old # | Path pattern | Destination |
| --- | --- | --- | --- |
| 1 | 1 | `/event/:slug/game` | apps/web SPA |
| 2 | 2 | `/event/:slug/game/:path*` | apps/web SPA |
| 3 | 3 | `/event/:slug/admin` | apps/web SPA |
| 4 | 4 | `/event/:slug/admin/:path*` | apps/web SPA |
| 5 | 7 | `/event/:slug` | apps/site Vercel project |
| 6 | 8 | `/event/:slug/:path*` | apps/site Vercel project |
| 7 | 9 | `/event/:path*` (SPA fallback) | apps/web SPA |
| 8 | 10 | `/_next/:path*` | apps/site Vercel project |
| 9 | 11 | `/admin` | apps/site Vercel project |
| 10 | 12 | `/admin/:path*` | apps/site Vercel project |
| 11 | 13 | `/auth/callback` | apps/site Vercel project |
| 12 | 14 | `/` | apps/site Vercel project |

The new operator URLs `/event/<slug>/game/redeem` and
`/event/<slug>/game/redemptions` match new rule 2
(`/event/:slug/game/:path*`) before reaching the cross-app rule
6 (`/event/:slug/:path*`); the bare-path URLs no longer match
any apps/web carve-out, fall through to new rule 6, and proxy to
apps/site's ordinary unknown-route response. Verified by:
[`apps/web/vercel.json:1-60`](../../apps/web/vercel.json#L1)
(current rule order; reality-check at edit time, the file may
have small drift since 2.5.1 doesn't touch it).

**[`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs) (modify).**
The `isSiteRequest(url)` decision function at lines 47–59
currently returns `false` for any `/event/<slug>/*` URL. After
this edit it returns `true` for any `/event/<slug>/*` URL
**except** the apps/web carve-outs
(`/event/<slug>/game`, `/event/<slug>/game/...`,
`/event/<slug>/admin`, `/event/<slug>/admin/...`). Concrete
shape: add a regex or substring check that matches event-scoped
paths and excludes the two apps/web carve-out namespaces. Example
implementation (final shape at edit time):

```js
function isSiteRequest(url) {
  if (
    url === "/" ||
    url.startsWith("/?") ||
    url === "/auth/callback" ||
    url.startsWith("/auth/callback?") ||
    url.startsWith("/_next/") ||
    url.startsWith("/__nextjs") ||
    url === "/admin" ||
    url.startsWith("/admin?") ||
    url.startsWith("/admin/")
  ) {
    return true;
  }

  // After M2 phase 2.5.2: bare-path event-scoped URLs route to
  // apps/site, mirroring production. apps/web keeps the
  // /event/:slug/game(/...)? and /event/:slug/admin(/...)?
  // carve-outs.
  if (url.startsWith("/event/")) {
    const path = url.split("?")[0];
    const segments = path.split("/").slice(2); // strip "" and "event"
    const subPath = segments.slice(1).join("/"); // segments after :slug
    if (subPath === "game" || subPath.startsWith("game/")) return false;
    if (subPath === "admin" || subPath.startsWith("admin/")) return false;
    return true;
  }

  return false;
}
```

(Final code shape lives in the implementing PR per AGENTS.md
"Plans describe contracts, PRs contain code." The contract is
"bare event-scoped paths to apps/site; game / admin carve-outs
to apps/web.") Verified by:
[`scripts/testing/run-auth-e2e-dev-server.cjs:47-59`](../../scripts/testing/run-auth-e2e-dev-server.cjs#L47).

**[`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts) (modify).**
The "leaves event-scoped paths on apps/web" test at lines 34–39
currently asserts both bare paths return `false` from
`isSiteRequest`. After edit:
- Update the two bare-path assertions to expect `true` (now route
  to apps/site).
- Add positive assertions: `isSiteRequest("/event/first-sample/game/redeem")`
  returns `false`, `isSiteRequest("/event/first-sample/game/redemptions")`
  returns `false` (apps/web carve-outs preserved).
- Existing `/event/first-sample/game` and
  `/event/first-sample/admin` assertions stay verbatim — both
  still return `false` (apps/web carve-outs).
- Optionally rename the `it` description from "leaves event-scoped
  paths on apps/web" to something like "routes bare event-scoped
  paths to apps/site, keeps game/admin carve-outs on apps/web"
  to match the post-edit contract.
Verified by:
[`tests/scripts/run-auth-e2e-dev-server.test.ts:34-39`](../../tests/scripts/run-auth-e2e-dev-server.test.ts#L34).

**[`docs/operations.md`](../operations.md) (modify).**
Update the Supabase Auth dashboard redirect-URL allow-list
description at lines 174–177: the per-environment entry list
currently names `/admin`, `/event/:slug/game`,
`/event/:slug/admin`, `/event/:slug/redeem`,
`/event/:slug/redemptions`. After edit it reads `/admin`,
`/event/:slug/game`, `/event/:slug/admin`,
`/event/:slug/game/redeem`, `/event/:slug/game/redemptions` — the
two bare-path entries swap for their `/game/`-prefixed
equivalents. The "single entry per environment" framing stays
verbatim. (Note: the actual dashboard configuration update happened
in 2.5.1's pre-merge audit; this edit is the doc-side description
catching up to the audit's outcome.) Verified by:
[`docs/operations.md:174-177`](../operations.md#L174).

**[`docs/architecture.md`](../architecture.md) (modify).**
Two editing surfaces in this PR (route inventory and auth-flow
narrative defer to 2.5.3):

1. The apps/web URL ownership prose at lines 60–63 ("transitional
   bare-path operator routes `/event/:slug/redeem` and
   `/event/:slug/redemptions`") deletes — apps/web's footprint
   is now purely `/event/:slug/game` and `/event/:slug/admin`.
2. The "Vercel Routing Topology" table at lines 893–906 deletes
   rows 5 and 6 and renumbers the surviving rows per the
   table in the
   [`apps/web/vercel.json`](../../apps/web/vercel.json) Contract
   above. Delete the post-table footnote prose at lines 905–906
   that names "the bare-path operator carve-outs (rules 5–6)" —
   the carve-outs are gone. The "rule 9" SPA-fallback footnote
   reference renumbers to rule 7 post-edit.

**The line numbers above are scoping-time;** reality-check at
edit-time by re-reading
[`docs/architecture.md`](../architecture.md) before editing — the
file may have small drift. The load-bearing edit-pass instruction
is "delete the bare-path mentions in the top-level layout
section; renumber the topology table to match
[`apps/web/vercel.json`](../../apps/web/vercel.json) post-edit."
Verified by:
[`docs/architecture.md:60-63,893-906`](../architecture.md#L60).

**[`docs/dev.md`](../dev.md) (modify).**
Two editing surfaces in this PR (the routes builder list at
lines 213–214 defers to 2.5.3):

1. The apps/web URL list at lines 50–55 deletes the "transitional
   bare-path operator routes" mention; apps/web owns
   `/event/:slug/game` and `/event/:slug/admin` only.
2. The rule-precedence walk-through at lines 791–807 updates: the
   numbered list drops the bullet for "rule 3"
   (`/event/:slug/redeem` and `/event/:slug/redemptions` →
   apps/web SPA, transitional), the post-list narrative drops
   the "bare-path operator carve-outs" reference, and the
   "rule 5 fallback" reference renumbers if the bullet count
   shifts. After edit, the walk-through bullet sequence is:
   1. game; 2. admin; 3. `/event/:slug` and `/event/:slug/:path*`
   → apps/site; 4. `/event/:path*` SPA fallback (transitional);
   5. `_next`; 6. `/admin*` → apps/site; 7. `/auth/callback` and
   `/` → apps/site.

Verified by:
[`docs/dev.md:50-55,791-807`](../dev.md#L50).

**This plan (modify, terminal step).** Status flips from
`Proposed` to `Landed` in the implementing PR per AGENTS.md
"Plan-to-PR Completion Gate."

## Files To Touch

### Modify (routing config + local proxy)

- [`apps/web/vercel.json`](../../apps/web/vercel.json)
- [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
- [`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts)

### Modify (URL-shape docs)

- [`docs/operations.md`](../operations.md)
- [`docs/architecture.md`](../architecture.md) (URL ownership
  prose + Vercel routing topology table only; route inventory
  and auth-flow narrative defer to 2.5.3)
- [`docs/dev.md`](../dev.md) (apps/web URL list + rule
  walkthrough only; routes builder list defers to 2.5.3)

### Modify (plan Status)

- This plan — Status flips from `Proposed` to `Landed`.

### Files intentionally not touched

- `shared/urls/` and apps/web source — owned by 2.5.1.
- `tests/shared/urls/`, `tests/web/`, `tests/e2e/*-fixture.ts`,
  `tests/e2e/mobile-smoke.*` — owned by 2.5.1.
- [`docs/architecture.md`](../architecture.md) route inventory
  entries (lines 95–104), `shared/urls` description (lines
  268–273), auth-flow narrative (lines 668–705) — owned by 2.5.3
  (page-behavior + API-shape).
- [`docs/dev.md`](../dev.md) routes builder list (lines 213–214)
  — owned by 2.5.3.
- [`docs/product.md`](../product.md), [`README.md`](../../README.md),
  [`docs/open-questions.md`](../open-questions.md),
  [`docs/backlog.md`](../backlog.md) — owned by 2.5.3.
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md)
  M2 row, [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  Status — owned by 2.5.3.
- M2 scoping docs under [`scoping/`](./scoping/) — batch deletion
  in 2.5.3.
- Edge Functions, migrations, apps/site source.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree, feature branch
   (not `main`), and that **2.5.1 has flipped to `Landed`** per
   the umbrella's Sub-phase Status table. Re-read the umbrella
   and 2.5.1's plan. Run the reality-check gate: confirm
   [`apps/web/vercel.json`](../../apps/web/vercel.json) still has
   the bare-path carve-outs at rules 5–6 and the post-edit rule
   table in Contracts matches the file's current state minus
   those two rules.
2. **Baseline validation.** `npm run lint`, `npm test`,
   `npm run build:web`, `npm run build:site`,
   `npm run test:functions`. All must pass before any edit.
3. **vercel.json + local proxy + unit test.** Edit
   [`apps/web/vercel.json`](../../apps/web/vercel.json) per the
   Contracts section (delete rules 5–6). Edit
   [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
   to widen `isSiteRequest`. Edit
   [`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts)
   per Contracts. `npm test` confirms the unit test passes.
4. **Local apps/web smoke (pre-merge production-fidelity check
   for the cutover).** Run `npm run dev:web`. Visit
   `http://localhost:5173/event/<seeded-slug>/game/redeem` and
   `/event/<seeded-slug>/game/redemptions` directly — both should
   render the operator pages (signed-out state). Visit the bare
   paths directly — both should render apps/web's not-found page
   (the SPA fallback rewrites the path to `/index.html`, the
   dispatcher matches no branch). The local apps/web check cannot
   exercise the cross-app proxy behavior (the bare paths going
   to apps/site in production); that gate runs post-deploy.
5. **Local auth e2e exercise.** Run
   `npm run test:e2e:redeem` and `npm run test:e2e:redemptions`
   ([`package.json:27-28`](../../package.json#L27)). The
   auth-e2e dev-server proxy now mirrors production routing for
   the bare paths; the e2e fixtures (already retargeted in 2.5.1)
   exercise the new operator URLs and should pass identically.
6. **URL-shape doc updates.** Edit
   [`docs/operations.md`](../operations.md),
   [`docs/architecture.md`](../architecture.md) (URL ownership
   prose + topology table), and
   [`docs/dev.md`](../dev.md) (apps/web URL list + rule
   walkthrough) per the Contracts section. Reality-check line
   numbers at edit time.
7. **Validation re-run.** All baseline commands from step 2 must
   pass.
8. **Code-review feedback loop.** Walk the diff against every
   Cross-Cutting Invariant Touched and every Self-Review Audit.
9. **Plan-to-PR Completion Gate.** Walk every Goal item, every
   Cross-Cutting Invariant, every Validation Gate command, and
   every Self-Review Audit. Confirm satisfied or deferred. Flip
   Status to `Landed`.
10. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters
    (suggested:
    `feat(m2-2.5.2): retire bare-path operator URLs from apps/web`).
    Validation section names every command run; PR description
    names the post-deploy manual gate as the load-bearing
    verification and links to 2.5.3 as the cleanup PR that opens
    only after the post-deploy check passes.
11. **Post-merge manual gate.** After the PR merges and the
    apps/web Vercel project deploys, run the manual deployed-
    origin check (Validation Gate "Manual: bare-path retirement
    on the deployed origin"). Capture the result inline in the
    PR (a comment or a doc-only follow-up commit). If the check
    surfaces a regression, fix forward in a focused follow-up
    PR rather than reverting — reverting would re-introduce the
    bare-path carve-outs and revert the cutover, which is not
    the desired path. (No `In progress pending prod smoke`
    Status state — see umbrella's Status note. The Status
    flipped to `Landed` at merge; the post-deploy gate is a
    verification, not a Status precondition.)

## Commit Boundaries

1. **vercel.json + local proxy + unit test.** Single commit;
   the cutover, the local-proxy mirror, and the matching unit-test
   update belong together so every commit's tip is internally
   consistent.
2. **URL-shape doc updates.** Single commit;
   [`docs/operations.md`](../operations.md),
   [`docs/architecture.md`](../architecture.md) (top-level prose
   + topology table), [`docs/dev.md`](../dev.md) (apps/web URL
   list + rule walkthrough).
3. **Plan Status flip.** Single commit; the closure commit.
4. **Review-fix commits.** As needed.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. The
  `tests/scripts/run-auth-e2e-dev-server.test.ts` update must
  pass.
- `npm run build:web` — pass on baseline; pass on final
  (vercel.json doesn't affect build but the gate is sanity).
- `npm run build:site` — pass on baseline; pass on final
  (unchanged).
- `npm run test:functions` — pass on baseline; pass on final
  (unchanged).
- pgTAP via `npm run test:db` — pass on baseline; pass on final
  (unchanged).
- **Local apps/web dev-server smoke (Execution step 4).** New
  URLs render the operator pages; bare URLs render apps/web's
  not-found page (the production-cutover behavior diverges to
  apps/site's unknown-route response, verified post-deploy).
- **`npm run test:e2e:redeem` and `npm run test:e2e:redemptions`
  via the canonical wrappers** ([`package.json:27-28`](../../package.json#L27)).
  The auth-e2e dev-server proxy now mirrors production routing;
  the e2e fixtures (retargeted in 2.5.1) exercise the new URLs.
- **Manual: bare-path retirement on the deployed origin
  (post-deploy, Execution step 11).** Hit
  `https://<deployed-origin>/event/<seeded-slug>/redeem` and
  `/redemptions` and confirm each lands on apps/site's ordinary
  unknown-route response (not on apps/web's not-found page).
  **Falsifier walk:** the failure mode the check guards against
  is a leftover apps/web rewrite intercepting the bare path
  before the cross-app rule fires, which would render apps/web's
  `NotFoundPage` instead of apps/site's. The discriminator
  between the two responses is the response shell — apps/site's
  Next.js framework chrome vs. apps/web's `NotFoundPage`
  component — and the response headers (`x-vercel-id` /
  `server` differ across the two Vercel projects). The check is
  load-bearing because the cross-app proxy can't be exercised
  pre-merge: `apps/web/vercel.json` destinations are absolute
  production URLs (per 2.3's plan, the same constraint that
  forced the 2.4.2 production-smoke pattern), so any local
  `vercel dev` run proxies the bare path to *deployed* apps/site
  rather than the branch-local instance.
- **Manual: magic-link round-trip on the deployed origin
  (post-deploy).** With a seeded operator account, request a
  magic link from the new `/event/<slug>/game/redeem` page and
  confirm the link's `next=/event/<slug>/game/redeem` round-trips
  through `/auth/callback` (apps/site-owned per 2.3) back to the
  operator page in the signed-in state. Mirror for
  `/game/redemptions`. Repeat with a stale `next=` at the bare
  path (`/auth/callback?next=/event/<slug>/redeem`); confirm the
  fallback to `routes.home` per `validateNextPath`'s
  unknown-pathname branch. The bare-path stale-`next` case is the
  open-redirect-defense check.

**No production smoke gate.** Per the umbrella's Status: 2.5
does not touch any production-smoke fixture. This sub-phase
lands under the regular Tier 1–4 gate plus the post-deploy
manual gate.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md).

### Frontend / routing

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../self-review-catalog.md#L354)).
  The vercel.json diff is purely deletion (rules 5–6); the
  topology table edit is row deletion + renumbering. **Reviewer
  attention should land on**: the surviving rule order in
  vercel.json (compare against the post-edit table in Contracts);
  the `isSiteRequest` widening's carve-out exception logic (must
  exclude `/event/<slug>/game(/...)?` and
  `/event/<slug>/admin(/...)?`); the topology table renumbering
  (every footnote referencing a rule number must update).
- **Platform-auth-gate config audit**
  ([catalog §Platform-auth-gate config audit](../self-review-catalog.md)).
  The third independent allow-list (apps/web/vercel.json) updates
  in this sub-phase. The other two (validateNextPath allow-list
  + Supabase Auth dashboard) updated in 2.5.1. Walk all three
  side-by-side: rule 2's `/event/:slug/game/:path*` covers the
  new operator URLs; the dashboard admits the new URLs (audited
  pre-2.5.1-merge); validateNextPath admits the new URLs (covered
  by `tests/shared/urls/validateNextPath.test.ts`).

### CI

- **Rename-aware diff classification.** Any docs-only or
  scoped-test CI gate must classify this branch as code-touching;
  the diff touches `apps/web/vercel.json`,
  `scripts/testing/`, and a unit test. A docs-only classifier
  would skip the load-bearing build / unit / e2e gates.

### Runbook

- The post-deploy manual gate (Execution step 11) is the
  operational surface. Captured in PR validation; falsifier
  walk-through is documented above.

## Documentation Currency PR Gate

- [`docs/operations.md`](../operations.md) — Supabase Auth
  dashboard redirect-URL allow-list URL family per Contracts.
- [`docs/architecture.md`](../architecture.md) — URL ownership
  prose at top-level layout + Vercel routing topology table
  per Contracts.
- [`docs/dev.md`](../dev.md) — apps/web URL list + rule
  walkthrough per Contracts.
- This plan — Status flips to `Landed`.
- All other doc surfaces (architecture route inventory + auth
  narrative + shared/urls description, dev.md routes builder
  list, product, README, open-questions, backlog, M2 closure)
  defer to 2.5.3.

## Out Of Scope

Sub-phase-local exclusions. See umbrella for phase-level Out
of Scope.

- **`shared/urls/` rename + apps/web source edits.** Owned by
  2.5.1.
- **e2e fixture / mobile-smoke spec edits.** Owned by 2.5.1.
- **Page-behavior + API-shape doc edits** (architecture route
  inventory + auth narrative + shared/urls description, dev.md
  routes builder list, product, README). Owned by 2.5.3.
- **M2 closure** (epic row flip, milestone Status flips,
  open-questions close, backlog updates, scoping batch delete).
  Owned by 2.5.3.

## Risk Register

Sub-phase-local risks. See umbrella for cross-sub-phase risks.

- **Vercel rule-ordering misorder breaks the new operator URLs.**
  See umbrella's "Vercel rule-ordering misorder" risk for the
  full description. Mitigation pinned in this sub-phase: the
  post-edit rule table in Contracts is the source of truth;
  pre-merge code review diffs the file; the post-deploy manual
  check exercises both URL families (new URL must reach apps/web,
  bare path must reach apps/site).
- **Local proxy carve-out exception too loose.** If the
  `isSiteRequest` widening matches `/event/<slug>/game/redeem`
  as bare-path, the dev-server proxy routes the operator URL to
  apps/site silently. The e2e fixtures fail because the operator
  page never loads. Mitigation: the unit test addition asserts
  positive cases for `/game/redeem` and `/game/redemptions`
  (must return `false` from `isSiteRequest`); the e2e wrapper
  run is the integration-side catch.
- **Cross-project proxy unverifiable pre-merge.**
  [`apps/web/vercel.json`](../../apps/web/vercel.json) destinations
  are absolute production URLs, so any local `vercel dev` run
  proxies bare paths to *deployed* apps/site rather than the
  branch-local instance. The cross-app routing change can only
  be observed post-deploy. Mitigation: the post-deploy manual
  gate is the load-bearing verification (Execution step 11);
  the local apps/web smoke confirms the apps/web side of the
  contract pre-merge.
- **Doc-currency drift between this PR and 2.5.3.** Between
  this PR landing and 2.5.3 landing,
  [`docs/architecture.md`](../architecture.md) describes the
  cutover-correct topology table but the route inventory at
  lines 95–104 still names the bare paths; same kind of drift
  for the other doc surfaces 2.5.3 owns. Acceptable because
  the gap is bounded by 2.5.3's merge cadence (umbrella's
  strict-serial sequencing) and the surfaces 2.5.3 owns are
  page-behavior descriptions, not routing-topology, so the
  drift is consistent (the bare paths are dead but the
  description hasn't caught up). Sub-phase-local mitigation:
  this PR's description names the deferred edits and links to
  2.5.3.
- **Architecture-table renumbering drift.** The
  [`docs/architecture.md`](../architecture.md) topology table
  reads as the source of truth for the dev.md rule walkthrough.
  Inconsistency between the two surfaces falsifies AGENTS.md
  "Doc Currency Is a PR Gate." Mitigation: edit both surfaces in
  the same documentation commit (commit 2); cross-check the
  post-edit row count and rule order against
  [`apps/web/vercel.json`](../../apps/web/vercel.json) in the
  same commit.

## Backlog Impact

- No backlog edits in this sub-phase. M2 closure (close +
  unblock) lands in 2.5.3.

## Related Docs

- [`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) — umbrella;
  this PR's Status flip + sequencing.
- [`m2-phase-2-5-1-plan.md`](./m2-phase-2-5-1-plan.md) — sibling
  Landed sub-phase (must be `Landed` before this PR opens).
- [`m2-phase-2-5-3-plan.md`](./m2-phase-2-5-3-plan.md) — sibling
  Proposed sub-phase (cleanup + M2 closure; cannot draft until
  this PR is `Landed` AND post-deploy verification ran green).
- [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) — Landed
  sibling; same cross-project-proxy-unverifiable-pre-merge
  constraint applied to its callback move.
- [`m2-phase-2-4-2-plan.md`](./m2-phase-2-4-2-plan.md) — Landed
  sibling; precedent for the cross-project proxy cutover with
  post-deploy verification (2.4.2 used the production-smoke
  fixture; 2.5.2 uses a manual deployed-origin check because
  no fixture covers the bare-path retirement).
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone; Phase Status row updates as each sub-phase ships.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules.
