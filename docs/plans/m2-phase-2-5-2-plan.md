# M2 Phase 2.5.2 — Vercel Cutover + Local Proxy + URL-Shape Doc Currency

## Status

Landed. The implementing PR
([#131](https://github.com/kcrobinson-1/neighborly-events/pull/131))
shipped with Status `In progress pending deployed-origin verification`;
this doc-only commit records the post-deploy verification evidence and
flips Status to `Landed`.

### Deployed-origin verification evidence

Manual deployed-origin shell-fingerprint check run against
`https://neighborly-scavenger-game-web.vercel.app` on 2026-04-30
post-deploy. Both branches of the load-bearing claim hold:

The verification ran two commands per URL: `curl -sI <url>` for
the response-header fingerprint (Vercel routing-layer signals
that are HEAD-visible: `x-matched-path`, `content-disposition`,
status code) followed by `curl -s <url> | grep -oE
"_next/static|src=\"/assets/"` for the response-body fingerprint
(bundle markers that only appear in a GET response body, not in
HEAD output). Both signals must agree to count as proof on
either side; a mismatch (e.g., apps/site headers but apps/web
body markers, or vice versa) would have indicated a partial
proxy regression and failed the check.

- **Retired bare paths reach apps/site's unknown-route response.**
  `curl -sI` of `/event/production-smoke-event/redeem` and
  `/event/production-smoke-event/redemptions` both return HTTP
  404 with `content-disposition: inline; filename="404"` and
  `x-matched-path: /404` — the apps/site Next.js routing-layer
  fingerprint. `curl -s` of the same URLs piped through the grep
  above shows `_next/static` references in the HTML body — the
  apps/site bundle marker. Confirms the cross-app
  `/event/:slug/:path*` rule (post-cutover rule 6) catches the
  bare paths and proxies them to apps/site, where the Next.js
  unknown-route response handles them per the umbrella's "No
  backward-compat redirect" invariant and the
  [milestone doc](./m2-admin-restructuring.md) "Settled by
  default" decision.
- **New operator URLs reach apps/web's operator pages.**
  `curl -sI` of `/event/production-smoke-event/game/redeem` and
  `/event/production-smoke-event/game/redemptions` both return
  HTTP 200 with `content-disposition: inline; filename="index.html"`
  — apps/web's Vite SPA shell served by the rule 2
  `/event/:slug/game/:path*` carve-out. `curl -s` of the same
  URLs piped through the grep above shows `src="/assets/`
  references in the HTML body — the apps/web Vite bundle marker.
  Confirms the rule-ordering invariant: the apps/web carve-outs
  match before the cross-app rule, so `/game/redeem` and
  `/game/redemptions` reach apps/web rather than getting proxied
  to apps/site.

The combined shell-fingerprint discriminator (apps/site
`_next/static` + `x-matched-path` vs. apps/web `src="/assets/` +
`filename="index.html"`) distinguished the desired signal from
every plausible failure mode, per the plan's Validation Gate
falsifier discipline. A misorder would have surfaced as an
apps/web shell on the bare paths or an apps/site shell on the new
operator URLs; neither was observed.

The release smoke run that paired with this deploy passed
([`Production Admin Smoke`](../../scripts/testing/run-production-admin-smoke.cjs)),
confirming the cutover did not regress the apps/web `/admin`
auth-flow path that runs through the same `vercel.json`. 2.5's
phase footprint is independent of the smoke fixture by design (per
the umbrella's Status section), so the smoke pass is a
no-regression signal rather than a load-bearing verifier.

Sub-phase of M2 phase 2.5 — see
[`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) (umbrella) for the
phase-level context, sequencing rationale, cross-sub-phase
invariants, phase-level Out of Scope, and cross-sub-phase risks.

**Position in sequence.** Second of three. 2.5.1 is `Landed` (the
`shared/urls/` rename, the dispatcher swap, the magic-link `next=`
flip, and the test/fixture URL updates are in main per `git log`
commits `ac3b4ee` / `09bd7cc` / `c5e2994`). 2.5.3 cannot draft or
merge until this sub-phase reaches `Landed` per the umbrella's
"2.5.2 reverted but 2.5.3 already merged" risk and its strict-serial
sequencing diagram.

**Two-phase Status flip.** Per the umbrella's Status section, this
plan ships under a non-prod-smoke variant of the
[`docs/testing-tiers.md`](../testing-tiers.md) "Plan-to-Landed Gate
For Plans That Touch Production Smoke" pattern. The implementing PR
merges with this plan's Status reading
`In progress pending deployed-origin verification` (exact string;
no paraphrase). After deploy, the implementer runs the manual
deployed-origin check (bare paths reach apps/site's unknown-route
response; new operator URLs reach apps/web's operator pages) and
flips Status to `Landed` in a separate doc-only commit (or the PR
comment + doc-only commit) — never in the implementing PR itself.
The umbrella Status section names the load-bearing reason: the
cross-app proxy can only be observed against the real Vercel
routing layer post-deploy, because
[`apps/web/vercel.json`](../../apps/web/vercel.json) destinations
are absolute production URLs and any local `vercel dev` run
proxies to *deployed* apps/site rather than the branch-local
instance.

**Single PR.** Branch-test sketch — apps/web: 1 modify
([`vercel.json`](../../apps/web/vercel.json)); scripts/testing: 1
modify
([`run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs));
tests: 1 modify
([`run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts));
docs: 3 modifies
([`architecture.md`](../architecture.md), [`dev.md`](../dev.md),
[`operations.md`](../operations.md)); plan Status: 1 (this file).
~7 files. ~2 distinct subsystems (production routing config + local
proxy fixture; URL-ownership-shape docs). The cutover is the one
load-bearing edit; the rest are doc currency that depends on it.

## Context

This sub-phase deletes the apps/web Vercel rewrite carve-outs that
still keep the bare `/event/:slug/redeem` and
`/event/:slug/redemptions` URLs answering inside the apps/web SPA.
After 2.5.1, the apps/web SPA dispatcher no longer matches those
bare URLs (a request that reaches apps/web through the carve-out
renders apps/web's not-found page); deleting the carve-outs lets the
cross-app `/event/:slug/:path*` rule beneath them proxy the bare
URLs to apps/site so the retired URLs respond with apps/site's
ordinary unknown-route shell instead. The local auth-e2e
dev-server proxy gets a parallel widening so the local
dev-server fixture stays production-faithful, and the URL-ownership-
shape docs (architecture topology table, apps/web URL list,
rule-precedence walkthrough, Supabase Auth dashboard description)
update in lockstep with the deleted rules.

It's the right moment for this cutover because 2.5.1 already moved
apps/web's dispatch surface and the magic-link `next=` emission to
the new `/event/:slug/game/redeem` and
`/event/:slug/game/redemptions` URLs in main, so the bare paths
serve no apps/web purpose now — they only widen apps/web's
production URL footprint past its terminal shape. Holding the bare-
path carve-outs would leave the umbrella's "URL contract
progression" invariant unenforced (apps/web's footprint stays at
"`/event/:slug/game/*` + `/event/:slug/admin` + two transitional
operator URLs" instead of shrinking to its terminal "`/event/:slug/
game/*` + `/event/:slug/admin`" shape) and force every doc reader
to remember that "and also these two transitional URLs" caveat.

What this sub-phase touches: the apps/web Vercel routing config
(2 rule deletions only — no rule additions, no rule reorders); the
local auth-e2e dev-server proxy + its unit test (parallel widening
of the bare-path branch); and the URL-ownership-shape docs. What it
doesn't touch: any apps/web or apps/site source, any
[`shared/`](../../shared) module, any Edge Function, any SQL, any
test other than the one dev-server unit test, any page-behavior
or `shared/urls/` API-shape doc surface (deferred to 2.5.3 per the
umbrella's "Doc currency split across sub-phases" invariant), and
any production-smoke fixture.

## Goal

Land the apps/web Vercel rewrite cutover and the local auth-e2e
dev-server proxy update so bare `/event/:slug/redeem` and
`/event/:slug/redemptions` URLs flow through apps/web's cross-app
`/event/:slug/:path*` rule to apps/site's unknown-route response
(production parity); the local auth-e2e proxy fixture mirrors the
new production behavior so any local round-trip through the bare
paths reaches the local apps/site dev server. URL-ownership-shape
docs update in the same PR. Plan Status flips to
`In progress pending deployed-origin verification` at merge; the
post-deploy manual check captures the deployed-origin evidence and
a separate doc-only commit flips Status to `Landed`.

Operator behavior preserved verbatim at the new URLs: the new
`/event/:slug/game/redeem` and `/event/:slug/game/redemptions`
URLs continue to reach apps/web through rule 2's
`/event/:slug/game/:path*` carve-out (which already covers them
post-2.5.1), with the same dispatcher branches, page chrome,
sign-in surface, authorization model, and Edge Function calls.
The only behavior change is at the bare paths, which transition
from "apps/web SPA → not-found page" to "apps/site → unknown-
route response."

## Cross-Cutting Invariants Touched

These are sub-phase-local. See the umbrella for cross-sub-phase
rules.

- **Vercel rule-ordering invariant.** Per the
  [milestone doc](./m2-admin-restructuring.md) "Cross-Phase Risks
  — Vercel rule-ordering misordering across 2.3, 2.4, 2.5":
  deleting rules 5–6 must not move the cross-app
  `/event/:slug/:path*` rule (current rule 8, becoming rule 6
  post-edit) above the `/event/:slug/game` /
  `/event/:slug/game/:path*` carve-outs (rules 1–2). Vercel honors
  source order; the post-edit ordering must keep the apps/web
  carve-outs strictly before the cross-app rule. Implementer
  performs deletions in place — no other rule-block edits in the
  same diff.
- **Local auth-e2e proxy widening must not catch the apps/web
  carve-outs.** The
  [`isSiteRequest`](../../scripts/testing/run-auth-e2e-dev-server.cjs#L47)
  branch added in this sub-phase routes bare event-scoped paths
  to the local apps/site dev server **only** when the path is not
  inside the `/event/:slug/game(/...)?` or
  `/event/:slug/admin(/...)?` apps/web carve-outs. A loose pattern
  would also send `/event/<slug>/game/redeem` to apps/site,
  silently breaking the e2e fixtures that 2.5.1 already retargeted
  to the new operator URLs. The unit test additions cover both the
  positive (carve-out paths still apps/web) and negative (bare
  paths now apps/site) sides.
- **No apps/web or apps/site source edit.** The cutover happens
  entirely in routing + fixture + docs surfaces. apps/web's
  dispatcher, both operator pages, the apps/site app router, and
  every `shared/` module stay untouched.
- **No production-smoke fixture change.** Per the umbrella Status
  section, the existing
  [`Production Admin Smoke`](../../scripts/testing/run-production-admin-smoke.cjs)
  exercises `/auth/callback?next=/admin` and never reaches the
  operator route family — this sub-phase neither extends nor
  modifies it.

## Naming

No new files. All edits modify existing files. No symbol renames in
this sub-phase (the rename surface settled in 2.5.1).

## Contracts

Each contract carries an inline "Verified by:" reference per
AGENTS.md.

**[`apps/web/vercel.json`](../../apps/web/vercel.json) (modify, load-bearing).**
Delete the two bare-path operator carve-out rule blocks: today's
rule 5 (`{"source": "/event/:slug/redeem", "destination": "/index.html"}`)
and rule 6 (`{"source": "/event/:slug/redemptions", "destination": "/index.html"}`).
The surviving rules retain their source order — rules 1–4
(`/event/:slug/game`, `/event/:slug/game/:path*`,
`/event/:slug/admin`, `/event/:slug/admin/:path*`) stay verbatim;
today's rules 7–15 shift up to become rules 5–13 by deletion alone.
The cross-app `/event/:slug/:path*` rule (today's rule 8, becoming
rule 6) stays strictly below rules 1–4 so the
`/event/:slug/game/redeem` and `/event/:slug/game/redemptions` URLs
match rule 2 before reaching rule 6. No rule additions; no
destination edits; no `dest` reorders. Verified by:
[`apps/web/vercel.json:19-26`](../../apps/web/vercel.json#L19) (the
two rule blocks to delete) and
[`apps/web/vercel.json:1-18,27-58`](../../apps/web/vercel.json#L1)
(the surviving rule blocks whose order is preserved).

**[`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs) (modify).**
Widen the `isSiteRequest` predicate at lines 47–59 so bare event-
scoped paths route to the local apps/site dev server *unless* the
path is inside an apps/web carve-out
(`/event/:slug/game(/...)?` or `/event/:slug/admin(/...)?`). The
shape stays a pure URL-prefix check (no regex helper added). The
existing site-owned branches (`/`, `/auth/callback`, `/_next/`,
`/__nextjs`, `/admin*`) stay verbatim. Verified by:
[`scripts/testing/run-auth-e2e-dev-server.cjs:47-59`](../../scripts/testing/run-auth-e2e-dev-server.cjs#L47).

**[`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts) (modify).**
Extend the existing "leaves event-scoped paths on apps/web"
describe block at lines 34–39 with positive assertions for the
post-cutover apps/web carve-outs
(`/event/first-sample/game/redeem`,
`/event/first-sample/game/redemptions`,
`/event/first-sample/game/...` deeper paths,
`/event/first-sample/admin`,
`/event/first-sample/admin/events/...`). Add a parallel "routes
retired bare event-scoped paths to apps/site" describe block (or
extend an existing block) with `isSiteRequest("/event/first-sample/redeem") === true`
and the redemptions counterpart. Existing assertions for `/`,
`/auth/callback`, `/_next/...`, `/__nextjs...`, `/admin`, the
`/__auth-e2e-ready` readiness path, and the proxy-shape contract
stay verbatim. Verified by:
[`tests/scripts/run-auth-e2e-dev-server.test.ts:14-40`](../../tests/scripts/run-auth-e2e-dev-server.test.ts#L14).

**[`docs/architecture.md`](../architecture.md) (modify, URL-ownership-shape only).**
Two surfaces update in this sub-phase per the umbrella's
"Documentation Currency" subsection:

- **Top-level URL-ownership prose** at the
  [Top-Level Layout section](../architecture.md#L57): drop the
  "and the transitional bare-path operator routes
  `/event/:slug/redeem` and `/event/:slug/redemptions`" appendage
  from the apps/web ownership sentence at lines 59–63 and the
  current-architecture summary at lines 28–35. apps/web's URL
  ownership reads as `/event/:slug/game/*` and
  `/event/:slug/admin` — the two terminal namespaces.
- **Vercel routing topology table** at lines 884–917: delete the
  rule 5 and rule 6 rows (the bare-path operator carve-outs);
  renumber the surviving rows; delete the trailing "The
  bare-path operator carve-outs (rules 5–6) and the rule 9
  fallback are explicitly transitional" note's reference to
  rules 5–6 (the rule 9 fallback narrowing remains — it shifts
  to rule 7 in the post-cutover numbering).

Page-behavior surfaces (the `EventRedeemPage` /
`EventRedemptionsPage` route-inventory entries at lines 95–109,
the auth-flow narrative URL strings, and the runtime request flow)
defer to 2.5.3 per the umbrella's "Doc currency split across
sub-phases" invariant. Verified by:
[`docs/architecture.md:28-35`](../architecture.md#L28),
[`docs/architecture.md:59-63`](../architecture.md#L59),
[`docs/architecture.md:884-917`](../architecture.md#L884).

**[`docs/dev.md`](../dev.md) (modify, URL-ownership-shape only).**
Two surfaces update in this sub-phase:

- **apps/web URL list** at lines 52–55: drop "and the transitional
  bare-path operator routes `/event/:slug/redeem` and
  `/event/:slug/redemptions`."
- **Vercel rule-precedence walkthrough** at lines 795–812: delete
  the rule 3 entry (`/event/:slug/redeem` and
  `/event/:slug/redemptions` → apps/web), renumber the surviving
  bullets, and update the "transitional carve-outs" closing prose
  at lines 809–812 to reflect that the bare-path retirement is
  complete and only the rule N SPA fallback narrowing remains.

The auth-e2e fixture description at lines 814–836 stays verbatim;
its proxy-routing prose at lines 826–830 already names the
generic "every other app path (event-scoped URLs)" branch. The
`/event/:slug/game` references in the readiness check description
also stay verbatim (the readiness check exercises an apps/web URL
that is unaffected by this cutover). Verified by:
[`docs/dev.md:52-55`](../dev.md#L52),
[`docs/dev.md:795-812`](../dev.md#L795),
[`docs/dev.md:826-830`](../dev.md#L826).

**[`docs/operations.md`](../operations.md) (modify, URL-ownership-shape only).**
The Supabase Auth dashboard redirect-URL allow-list description
at lines 169–176 currently lists every authenticated route
behind `/auth/callback?next=…`, including the now-retired
bare-path operator URLs (`/event/:slug/redeem` and
`/event/:slug/redemptions`). Update the per-environment Auth URL
configuration list to name `/event/:slug/game/redeem` and
`/event/:slug/game/redemptions` as the operator-route entries
(matching what 2.5.1's pre-merge dashboard audit added) and drop
the bare-path entries from the listed examples. The surrounding
sentence at line 173 ("a single entry per environment — every
authenticated route returns through `/auth/callback?next=…`")
stays verbatim. Verified by:
[`docs/operations.md:169-176`](../operations.md#L169).

**This plan (modify, terminal step in the implementing PR).**
Status flips from `Proposed` to
`In progress pending deployed-origin verification` (exact
string per the umbrella's two-phase pattern; no paraphrase).
The flip to `Landed` happens in a separate doc-only commit after
the post-deploy manual verification captures.

## Files To Touch

### Modify (apps/web routing config)

- [`apps/web/vercel.json`](../../apps/web/vercel.json)

### Modify (local auth-e2e fixture)

- [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
- [`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts)

### Modify (URL-ownership-shape docs)

- [`docs/architecture.md`](../architecture.md)
- [`docs/dev.md`](../dev.md)
- [`docs/operations.md`](../operations.md)

### Modify (plan Status — implementing PR)

- This plan — Status flips from `Proposed` to
  `In progress pending deployed-origin verification`.

### Modify (plan Status — post-deploy doc-only commit)

- This plan — Status flips from
  `In progress pending deployed-origin verification` to `Landed`.

### Files intentionally not touched

- [`shared/urls/`](../../shared/urls), apps/web source, apps/site
  source, Edge Functions, migrations, `shared/auth/`,
  `shared/db/`, `shared/events/`, `shared/styles/` — owned by
  2.5.1 (already merged) or out of scope across all 2.5
  sub-phases.
- All test files except
  [`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts)
  — the e2e fixtures and unit tests for the operator route family
  retargeted to the new URLs in 2.5.1.
- [`docs/architecture.md`](../architecture.md) page-behavior
  surfaces (route-inventory entries, auth-flow narrative URL
  strings, runtime request flow), [`docs/dev.md`](../dev.md)
  routes builder list, [`docs/product.md`](../product.md),
  [`README.md`](../../README.md),
  [`docs/open-questions.md`](../open-questions.md),
  [`docs/backlog.md`](../backlog.md),
  [`docs/plans/event-platform-epic.md`](./event-platform-epic.md),
  [`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md),
  [`docs/plans/m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md),
  M2 scoping docs under [`scoping/`](./scoping/) — owned by
  2.5.3 per the umbrella's "Doc currency split across
  sub-phases."
- Production-smoke fixtures at
  [`scripts/testing/run-production-admin-smoke.cjs`](../../scripts/testing/run-production-admin-smoke.cjs)
  and the production-admin-smoke playwright config at
  [`playwright.production-admin-smoke.config.ts`](../../playwright.production-admin-smoke.config.ts)
  — out of scope for the entire 2.5 phase.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree, feature branch (not
   `main`). Confirm 2.5.1 is `Landed` in
   [`m2-phase-2-5-1-plan.md`](./m2-phase-2-5-1-plan.md) Status (the
   umbrella's strict-serial sequencing requires this), and that
   the apps/web dispatcher and `shared/urls/` already serve the
   new URLs (a 5-second `git log -- shared/urls/routes.ts` +
   `git grep "matchGameRedeemPath" apps/web/src/App.tsx` confirms).
   Re-read the umbrella's "Cross-Cutting Invariants" and this
   plan's Contracts section. Confirm no other PR is in flight
   against [`apps/web/vercel.json`](../../apps/web/vercel.json) or
   [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs).
2. **Baseline validation.** `npm run lint`, `npm test`,
   `npm run build:web`, `npm run build:site`,
   `npm run test:functions`. All must pass before any edit.
3. **Repo-wide grep audit.** Run
   `grep -rn "/event/.*/redeem\|/event/.*/redemptions" \
   --include="*.ts" --include="*.tsx" --include="*.cjs" \
   --include="*.json" --include="*.md" \
   --exclude-dir=node_modules --exclude-dir=archive .` and
   cross-check survivors against the "Files To Touch" inventory
   plus the sub-phase split. The `/game/redeem` and
   `/game/redemptions` matches are expected post-2.5.1; bare
   `/redeem` / `/redemptions` matches outside this sub-phase's
   inventory are doc-currency leftovers for 2.5.3 (intentional)
   or real misses (escalate before editing).
4. **vercel.json cutover.** Edit
   [`apps/web/vercel.json`](../../apps/web/vercel.json) per the
   Contracts section: delete the two bare-path rule blocks. Run
   `npm run build:web` to confirm no syntactic regression. Re-run
   the unit-test suite to confirm no test depends on the deleted
   rules.
5. **Local proxy widening.** Edit
   [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
   per the Contracts section, then update
   [`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts)
   with the new positive + negative assertions. `npm test`
   confirms the unit-test additions pass.
6. **URL-ownership-shape doc updates.** Edit
   [`docs/architecture.md`](../architecture.md),
   [`docs/dev.md`](../dev.md), and
   [`docs/operations.md`](../operations.md) per the Contracts
   section. Re-grep the touched files for any remaining bare-
   path operator URL references; any survivor is either a
   page-behavior surface that defers to 2.5.3 (intentional) or
   a missed edit.
7. **Local auth e2e exercise.** Run
   `npm run test:e2e:redeem` and `npm run test:e2e:redemptions`
   ([`package.json:27-28`](../../package.json#L27)). The
   wrappers provision the local Supabase Docker stack, forward
   the local service-role key, start the auth-e2e dev-server
   proxy (now widened per step 5), and exercise the renamed
   routes through the magic-link round-trip. The e2e fixtures
   already target the new `/game/redeem` and `/game/redemptions`
   URLs (per 2.5.1's edits at
   [`tests/e2e/redeem-auth-fixture.ts:30`](../../tests/e2e/redeem-auth-fixture.ts#L30)
   and
   [`tests/e2e/redemptions-auth-fixture.ts:30-31`](../../tests/e2e/redemptions-auth-fixture.ts#L29)),
   so the e2e wrappers exercise the post-cutover apps/web carve-
   outs through the widened local proxy. The integration-side
   confirmation that the local proxy widening preserves the
   carve-out routing.
8. **Local apps/web smoke through the auth-e2e proxy.** Optional
   sanity confirmation: with the auth-e2e dev-server running,
   curl the bare paths and confirm the response matches apps/site
   on both sides of the discriminator — `curl -sI
   "http://127.0.0.1:4173/event/first-sample/redeem"` for the
   header fingerprint (Next.js routing-layer signals, not the Vite
   SPA shell), then `curl -s
   "http://127.0.0.1:4173/event/first-sample/redeem" | grep -oE
   "_next/static|src=\"/assets/"` for the body fingerprint
   (`_next/static` markers, not `src="/assets/`). Repeat for
   `/event/first-sample/redemptions`. Then curl the new operator
   URLs (`/event/first-sample/game/redeem`,
   `/event/first-sample/game/redemptions`) the same way and
   confirm the response matches apps/web on both sides
   (`filename="index.html"` headers + `src="/assets/` body). This
   is local-only confirmation; the load-bearing observation runs
   against the deployed Vercel routing layer in step 11.
9. **Validation re-run.** All baseline commands from step 2 must
   pass.
10. **Code-review feedback loop.** Walk the diff against every
    Cross-Cutting Invariant Touched and every Self-Review Audit
    named below. Apply fixes; commit review-fix changes
    separately per AGENTS.md Review-Fix Rigor.
11. **PR preparation, merge, and post-deploy verification.** Open
    the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters (suggested:
    `chore(m2-2.5.2): retire bare-path operator carve-outs from apps/web vercel.json`).
    Validation section names every command run + the local
    auth-e2e wrappers. PR description names the umbrella's
    two-phase Status pattern explicitly so the reviewer
    understands the merge-time Status string and the post-deploy
    flip to `Landed`. Plan Status flips from `Proposed` to
    `In progress pending deployed-origin verification` in the
    same PR. After merge + deploy, run the manual deployed-origin
    check (curl the bare paths against the production apps/web
    origin and confirm apps/site response shell; curl the new
    operator URLs and confirm apps/web operator-page shell).
    Capture evidence (response headers + status codes) inline in
    the PR (a comment) or as a doc-only follow-up commit linked
    from the PR. The Status flip from
    `In progress pending deployed-origin verification` to
    `Landed` happens in that doc-only follow-up commit.

## Commit Boundaries

1. **vercel.json cutover.** Single commit deleting the two bare-
   path rule blocks. The smallest possible blast-radius commit
   for the load-bearing routing change — bisects unambiguously
   if a regression surfaces post-deploy.
2. **Local auth-e2e proxy widening + unit-test additions.**
   Single commit; the proxy edit and the test additions belong
   together so the test coverage lands in lockstep with the
   behavior change.
3. **URL-ownership-shape doc updates.** Single commit covering
   `docs/architecture.md`, `docs/dev.md`, and
   `docs/operations.md`. Doc-currency edits split from the code
   commits keep the diff easy to review at the routing level
   without doc churn mixed in.
4. **Plan Status flip to `In progress pending deployed-origin
   verification`.** Single commit; closure for the implementing
   PR.
5. **Review-fix commits.** As needed.
6. **Post-deploy: plan Status flip to `Landed`.** Doc-only
   commit landing after the deployed-origin verification runs.
   Lives outside the implementing PR per the umbrella's
   two-phase pattern.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final, including the
  new auth-e2e dev-server proxy assertions.
- `npm run build:web` — pass on baseline; pass on final.
- `npm run build:site` — pass on baseline; pass on final
  (unchanged — apps/site source is not edited).
- `npm run test:functions` — pass on baseline; pass on final
  (unchanged).
- pgTAP via `npm run test:db` — pass on baseline; pass on final
  (unchanged).
- **`npm run test:e2e:redeem` and `npm run test:e2e:redemptions`
  via the canonical wrappers**
  ([`package.json:27-28`](../../package.json#L27)). Pre-merge
  load-bearing for the local proxy widening: the wrappers
  exercise the post-cutover carve-out routing through the local
  proxy, and a regression in the proxy edit fails them.
- **Manual: deployed-origin verification (post-deploy).** Run
  two curl invocations per URL — `curl -sI <url>` for the
  response headers (`x-matched-path`, `content-disposition`,
  status) and `curl -s <url> | grep -oE
  "_next/static|src=\"/assets/"` for the response-body bundle
  markers — because HEAD responses do not include the body and
  GET responses provide both. The headers-only and body-only
  signals must agree on each URL. Run the pair against the bare
  paths (`/event/<seeded-slug>/redeem`,
  `/event/<seeded-slug>/redemptions`) and confirm both signals
  match apps/site's unknown-route response (Next.js routing-
  layer headers including `x-matched-path`; `_next/static`
  references in the body — apps/site's `/event/:slug`
  placeholder shell, or the apps/site catch-all 404, whichever
  apps/site emits today for unrecognized event-scoped paths).
  Run the same pair against the new operator URLs
  (`/event/<seeded-slug>/game/redeem`,
  `/event/<seeded-slug>/game/redemptions`) and confirm both
  signals match apps/web's operator pages
  (`content-disposition: filename="index.html"` headers;
  `src="/assets/` references in the body — Vite SPA shell). This
  is the load-bearing post-deploy check and the load-bearing
  reason this plan ships under the two-phase Status pattern.
  Failure on either signal is a deployment-blocking issue.

**Falsifier discipline (per AGENTS.md "Phase Planning Sessions —
Falsifiability check on each load-bearing claim").** The deployed-
origin check distinguishes the desired signal (cutover succeeded)
from likely failure modes through the response-shell fingerprint:
the apps/site Next.js response carries `x-vercel-id` /
`x-matched-path` headers and an `<html>` shell with Next.js asset
references; the apps/web Vite SPA response carries Vite-built
asset references and a different `<html>` shape. A wrong-shell
response on either side surfaces unambiguously. A 404 status with
the apps/web SPA shell on the bare paths (the failure mode if the
deletion didn't take effect) is distinct from a 404 status with
apps/site's shell (the success mode); the manual check captures
both shape and status, not status alone.

**No production smoke gate.** Per the umbrella's Status section,
2.5.2 does not touch any production-smoke fixture. The two-phase
Status flip is the substitute load-bearing claim that the
deployed-origin verification has been captured.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md).

### Frontend

- **Vercel rewrite ordering audit**
  ([catalog §Vercel rewrite ordering audit](../self-review-catalog.md)).
  Walk the post-edit `vercel.json` rule list against the
  invariant in this plan's Cross-Cutting Invariants section:
  rules 1–4 (apps/web carve-outs for `game` and `admin`
  namespaces) stay strictly above the cross-app
  `/event/:slug/:path*` rule (now rule 6). The rule 7 SPA
  fallback (`/event/:path*` → `/index.html`, narrowing as
  carve-outs settle) sits below the cross-app rule. The
  surviving rule list reads, in source order:
  1. `/event/:slug/game` → apps/web SPA
  2. `/event/:slug/game/:path*` → apps/web SPA
  3. `/event/:slug/admin` → apps/web SPA
  4. `/event/:slug/admin/:path*` → apps/web SPA
  5. `/event/:slug` → apps/site
  6. `/event/:slug/:path*` → apps/site
  7. `/event/:path*` → apps/web SPA fallback
  8. `/_next/:path*` → apps/site
  9. `/admin` → apps/site
  10. `/admin/:path*` → apps/site
  11. `/auth/callback` → apps/site
  12. `/` → apps/site
- **Platform-auth-gate config audit**
  ([catalog §Platform-auth-gate config audit](../self-review-catalog.md)).
  Three independent allow-lists must agree on the renamed
  operator URLs across every environment:
  `validateNextPath`'s allow-list (already updated in 2.5.1 and
  covered by `tests/shared/urls/validateNextPath.test.ts`); the
  Supabase Auth dashboard per environment (audited in 2.5.1's
  pre-merge gate); and apps/web's `vercel.json` (this sub-phase's
  surface). Confirm the dashboard audit captured in 2.5.1's
  Validation section is still load-bearing — no environment-
  specific drift between 2.5.1 merge and 2.5.2 merge.

### CI

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../self-review-catalog.md#L354)).
  This sub-phase's diff is small but mixed: a JSON config file,
  a JS proxy file, a TS test file, and three docs. No symbol
  renames; the bulk of the diff is content changes (rule
  deletions, predicate widening, doc prose). The classifier
  should mark the branch as code-touching, not docs-only,
  because [`apps/web/vercel.json`](../../apps/web/vercel.json)
  changes alter production routing.

### Runbook

- **Vercel routing topology table currency**
  ([catalog §Vercel routing topology table currency](../self-review-catalog.md)).
  The doc-table edits in
  [`docs/architecture.md`](../architecture.md) and
  [`docs/dev.md`](../dev.md) walk the post-edit `vercel.json` row
  by row. The Vercel rewrite ordering audit above and this audit
  cross-check each other: the audit asserts the source order is
  correct; this audit asserts the docs describe that source
  order accurately.

## Documentation Currency PR Gate

- [`docs/architecture.md`](../architecture.md) — top-level URL-
  ownership prose (lines 28–35, 59–63) and the Vercel routing
  topology table (lines 884–917) per Contracts.
- [`docs/dev.md`](../dev.md) — apps/web URL list (lines 52–55)
  and the Vercel rule-precedence walkthrough (lines 795–812) per
  Contracts.
- [`docs/operations.md`](../operations.md) — Supabase Auth
  dashboard redirect-URL allow-list description (lines 169–176)
  per Contracts.
- This plan — Status flips to
  `In progress pending deployed-origin verification` in the
  implementing PR; flips to `Landed` in a separate doc-only
  commit after the post-deploy verification.
- All other doc surfaces (architecture page-behavior surfaces,
  dev.md routes builder list, product.md, README,
  open-questions.md, backlog.md, epic + milestone Status flips,
  M2 scoping batch deletion) defer to 2.5.3 per the umbrella's
  "Documentation Currency" subsection.

## Out Of Scope

Sub-phase-local exclusions. See the umbrella for phase-level Out
of Scope.

- **`shared/urls/` edits.** The rename surface settled in 2.5.1;
  this sub-phase touches no
  [`shared/urls/`](../../shared/urls) file.
- **apps/web or apps/site source edits.** The dispatcher and the
  page files settled in 2.5.1; this sub-phase introduces no
  source change in either app.
- **Per-URL handler on apps/site for the retired bare paths.**
  Per the umbrella's "No backward-compat redirect for the bare
  paths, ever" invariant and the
  [milestone doc](./m2-admin-restructuring.md) "Settled by
  default" entry on cross-app smoke for bare-path retirement —
  apps/site's ordinary unknown-route response is the answer; no
  per-URL handler.
- **Page-behavior + API-shape doc edits.** The architecture
  route-inventory entries (lines 95–109), auth-flow narrative
  URL strings, runtime request flow, dev.md routes builder list,
  product.md capability bullet, README operator-route refs,
  shared/urls/README routes/matcher list, open-questions.md
  close, backlog.md close + unblock, epic M2 row flip, milestone
  Status flips, umbrella Status flip, and M2 scoping batch
  deletion — owned by 2.5.3 per the umbrella's "Documentation
  Currency" subsection.
- **Production-smoke fixture changes.** Per the umbrella's
  Status section, no 2.5 sub-phase modifies any production-smoke
  fixture; the existing
  [`Production Admin Smoke`](../../scripts/testing/run-production-admin-smoke.cjs)
  is independent of this phase.
- **`<ThemeScope>` wiring on operator routes.** Deferred to M4
  phase 4.1 per the umbrella's invariant. The operator routes
  continue to render against apps/web's warm-cream `:root`
  defaults across this sub-phase.
- **Trust-boundary changes.** No SQL, no RLS, no Edge Function,
  no `shared/auth/` edit. The trust boundary stays where it
  settled before phase 2.5 opened.

## Risk Register

Sub-phase-local risks. See the umbrella for cross-sub-phase
risks.

- **vercel.json deletion accidentally reorders surviving rules.**
  A misapplied edit could move the cross-app
  `/event/:slug/:path*` rule (today's rule 8) above the
  `/event/:slug/game/:path*` carve-out (rule 2), which would
  proxy the new operator URLs to apps/site instead of apps/web.
  Mitigation: the deletion is two contiguous rule-block
  removals — implementer keeps the diff to those two blocks
  only and re-reads the surviving rule list against the
  Self-Review Audit's "post-edit rule list" enumeration before
  committing. The post-deploy deployed-origin check at step 11
  is the integration-side catch.
- **Local auth-e2e proxy widening too loose, breaks e2e
  fixtures.** A pattern that catches `/event/:slug/game/redeem`
  alongside `/event/:slug/redeem` would route the new operator
  URLs to the local apps/site dev server; the e2e fixtures
  would fail because the apps/web operator pages aren't there.
  Mitigation: the unit test additions in
  [`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts)
  cover both the positive (carve-out paths still apps/web) and
  negative (bare paths now apps/site) sides; the e2e wrappers
  in step 7 catch any miscalibration end-to-end.
- **Doc-currency drift across 2.5.2 / 2.5.3.** A bare-path
  operator URL string in a doc surface that 2.5.3 owns gets
  missed at 2.5.3 plan-drafting time. Mitigation: 2.5.3's
  pre-edit gate runs a repo-wide
  `grep -rn "/event/.*/redeem\|/event/.*/redemptions"` that
  surfaces every survivor — this sub-phase's grep audit at
  step 3 captures the pre-2.5.2 baseline so 2.5.3's grep can
  diff against expected-carryover (page-behavior surfaces) vs.
  unexpected-survivor (real miss).
- **Post-deploy verification slip.** A merged
  `In progress pending deployed-origin verification` plan that
  never gets the post-deploy flip leaves the plan in a non-
  terminal state and blocks 2.5.3 from opening per the
  umbrella's "2.5.2 reverted but 2.5.3 already merged" risk.
  Mitigation: the post-deploy check is a 5-minute curl exercise
  against the production apps/web origin; the implementer runs
  it within an hour of the deploy completing and lands the
  doc-only `Landed` flip the same day. The strict-serial
  sequencing rule means 2.5.3 cannot draft or merge against an
  `In progress pending deployed-origin verification` Status —
  the gate is queryable.
- **Bare-path bookmark population surfaces post-deploy.** If
  any external system (operator-shared link, printed booth
  card, Slack pin) still points at a bare-path operator URL,
  post-cutover those clicks land on apps/site's unknown-route
  response. Mitigation: per the umbrella's "No backward-compat
  redirect for the bare paths, ever" invariant, the response is
  intentional — a focused follow-up adds an apps/site per-URL
  handler if observed bookmark population justifies it. Not a
  re-litigated in-phase decision.

## Backlog Impact

- No backlog edits in this sub-phase. M2 closure (close +
  unblock) lands in 2.5.3.

## Related Docs

- [`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) — umbrella;
  this PR's Status flip + the cross-sub-phase narrative this
  sub-phase consumes.
- [`m2-phase-2-5-1-plan.md`](./m2-phase-2-5-1-plan.md) —
  predecessor sub-phase (Landed); the rename + dispatcher swap
  + magic-link `next=` flip + test/fixture URL updates this
  sub-phase composes on top of.
- 2.5.3 sub-phase plan — drafts after this sub-phase reaches
  `Landed` per the umbrella's "Just-in-time sub-phase drafting"
  rule.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone; "Vercel rule-ordering misordering across 2.3, 2.4,
  2.5" cross-phase risk + "Cross-app smoke for bare-path
  retirement" cross-phase decision this sub-phase consumes.
- [`m2-phase-2-3-plan.md`](./m2-phase-2-3-plan.md) — landed
  precedent for the two-phase Status pattern; the
  "Production verification evidence" section structure this
  sub-phase's post-deploy flip mirrors.
- [`m2-phase-2-4-plan.md`](./m2-phase-2-4-plan.md) — landed
  precedent for an apps/web `vercel.json` edit composing with
  prior-phase edits; verifies the rule-ordering invariant in
  this sub-phase's Self-Review Audits.
- [`site-scaffold-and-routing.md`](./site-scaffold-and-routing.md)
  — M0 phase 0.3 plan; established the
  `/event/:slug/game/*` apps/web carve-out (rules 1–2) the new
  operator URLs match before reaching the cross-app rule.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`docs/testing-tiers.md`](../testing-tiers.md) — production-
  smoke tier reference; the two-phase Plan-to-Landed Gate's
  exact-string Status invariant this sub-phase mirrors with a
  non-prod-smoke variant.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules; Phase
  Planning Sessions, Doc Currency Is a PR Gate, Verified-by
  annotations, exact-match label discipline.
