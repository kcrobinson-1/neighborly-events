# M2 Phase 2.5.1 — Code Rename + Tests + Dashboard Allow-List Audit

## Status

Proposed.

Sub-phase of M2 phase 2.5 — see
[`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) (umbrella) for the
phase-level context, sequencing rationale, cross-sub-phase
invariants, phase-level Out of Scope, and cross-sub-phase risks.

**Position in sequence.** First of three. 2.5.2 cannot draft or
merge until this sub-phase is `Landed` — see the umbrella's
"Bare-path UX gap between 2.5.1 and 2.5.2 merges" risk and its
strict-serial sequencing diagram.

**Single PR.** Branch-test sketch — `shared/urls/`: 4 modifies
(`routes.ts`, `validateNextPath.ts`, `index.ts`, `README.md`);
apps/web: 3 modifies (`App.tsx`, `EventRedeemPage.tsx`,
`EventRedemptionsPage.tsx`); tests: 8 modifies (2 unit + 3
`tests/web/*` + 2 e2e fixtures + 2 mobile-smoke specs); plan
Status: 1 (this file). ~16 files. ~2 distinct subsystems
(shared rename, apps/web consumers + tests). Behavior-preserving
for the new operator URLs; bare-path URLs render apps/web's
not-found page during the gap until 2.5.2's vercel cutover.

## Context

This sub-phase makes apps/web answer the new operator URLs
(`/event/:slug/game/redeem` and `/event/:slug/game/redemptions`)
and stops answering the bare paths. The
[`shared/urls/`](../../shared/urls) builders and matchers rename
in lockstep with the URL change so the M1 phase 1.2 deferral
(builder name and URL aligned at every gate) closes here. The
e2e fixtures and the magic-link `next=` emission flip to the new
URLs in the same change so the tests stay green and the
sign-in round-trip lands on the right page from this point
forward. The Vercel routing config and the local auth-e2e proxy
are untouched in this sub-phase — that's 2.5.2's surface.

It's the first sub-phase because the rename is the load-bearing
correctness change; once apps/web answers the new URLs, the
production routing cutover (2.5.2) is mechanical, and the doc
cleanup + M2 closure (2.5.3) is paperwork against an
already-correct codebase. Splitting the rename out gives reviewers
a "diff is rename + URL string substitution + new dispatcher
branch" mental model with no production-routing edit mixed in.

What this sub-phase touches: the shared route module; the apps/web
dispatcher and the two operator page files (JSDoc + magic-link
`next=` only); all unit tests covering the renamed surfaces; the
e2e fixtures and mobile-smoke specs; the shared/urls README; and
the per-environment Supabase Auth dashboard redirect-URL allow-list
(operational config, not a file edit).

What this sub-phase doesn't touch:
[`apps/web/vercel.json`](../../apps/web/vercel.json), the local
auth-e2e dev-server proxy
([`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)),
its unit test, [`docs/operations.md`](../operations.md), or any
URL-ownership-shape doc — those are 2.5.2's surface. Doc currency
for page-behavior + API-shape descriptions defers to 2.5.3.

## Goal

Land the `shared/urls/` operator-route rename, retarget apps/web's
dispatcher and magic-link emission to the new URLs, and update
every test asserting against the operator-route URL family. After
merge, `/event/<slug>/game/redeem` and
`/event/<slug>/game/redemptions` reach the operator pages
end-to-end through the existing apps/web carve-out at vercel.json
rules 1–2 (`/event/:slug/game/:path*`); bare URLs reach apps/web
through the still-present rules 5–6 carve-outs but render the
not-found page because the dispatcher no longer matches them. The
production routing cutover that flips bare URLs to apps/site is
2.5.2.

Operator behavior preserved verbatim: same sign-in surface, same
authorization model, same Edge Function calls. Only the URL
strings the dispatcher and magic-link emit change.

## Cross-Cutting Invariants Touched

These are sub-phase-local. See the umbrella for cross-sub-phase
rules.

- **Build-sequencing constraint inside the rename commit.** The
  `shared/urls/` rename and the apps/web consumers (`App.tsx`,
  the two page files) must move together — a tip with the shared
  module renamed but the dispatcher still importing the old name
  fails `npm run build:web`; the inverse fails the same way.
  Implementer locks the commit shape: shared rename + dispatcher
  edit + page-file edits in one commit. This is the
  load-bearing-rename commit.
- **Magic-link `next=` flips at the same merge as the dispatcher
  match.** The `routes.gameRedeem(slug)` call replaces
  `routes.eventRedeem(slug)` in the same change as the
  dispatcher's `matchGameRedeemPath` swap. A tip where the
  magic-link emits `/game/redeem` but the dispatcher only matches
  `/redeem` (or vice versa) breaks the post-callback round-trip.
  Same commit as the build-sequencing constraint above.
- **Supabase Auth dashboard pre-merge audit per environment.**
  The dashboard redirect-URL allow-list per environment must
  admit `/event/:slug/game/redeem` and
  `/event/:slug/game/redemptions` before this PR merges,
  otherwise post-merge magic-link requests fall back to
  `routes.home`. Audit covers local, preview, production. Captured
  in the PR's Validation section.
- **No `<ThemeScope>` wrap added.** The dispatcher edit swaps
  matcher names but keeps the unwrapped JSX shape verbatim. The
  M4 phase 4.1 wrap deferral stays intact.

## Naming

No new files. All edits modify existing files. The renames are:

- `routes.eventRedeem` → `routes.gameRedeem`
- `routes.eventRedemptions` → `routes.gameRedemptions`
- `matchEventRedeemPath` → `matchGameRedeemPath`
- `matchEventRedemptionsPath` → `matchGameRedemptionsPath`
- `AppPath` member `` `/event/${string}/redeem` `` →
  `` `/event/${string}/game/redeem` ``
- `AppPath` member `` `/event/${string}/redemptions` `` →
  `` `/event/${string}/game/redemptions` ``
- Suffix constants inside the two matchers: `"/redeem"` →
  `"/game/redeem"` and `"/redemptions"` → `"/game/redemptions"`
  (the `prefix` constant `${routes.gamePrefix}/` stays verbatim)

`AuthNextPath` re-derives automatically through the existing
`Exclude<AppPath, "/auth/callback">` definition; no edit there.

The page component files (`EventRedeemPage`,
`EventRedemptionsPage`) keep their names, exports, props, and
behavior. M4 phase 4.1's epic paragraph already names them at
their post-2.5 URLs verbatim.

## Contracts

Each contract carries an inline "Verified by:" reference per
AGENTS.md.

**[`shared/urls/routes.ts`](../../shared/urls/routes.ts) (modify).**
Rename builders and matchers per the Naming section. The matcher
function bodies are byte-identical to today modulo the `suffix`
constant; the prefix constant (`${routes.gamePrefix}/`), the
slice/decode/validate pipeline, and the empty-slug + embedded-slash
rejection branches stay verbatim. Update the `AppPath`
literal-union members for the two routes. Verified by:
[`shared/urls/routes.ts:8-9,35-38,132-206`](../../shared/urls/routes.ts#L8).

**[`shared/urls/validateNextPath.ts`](../../shared/urls/validateNextPath.ts) (modify).**
Update the two matcher imports at lines 3–4 to the renamed names
and the two allow-list branches at lines 58–64. Surrounding logic
is unchanged. Verified by:
[`shared/urls/validateNextPath.ts:1-9,58-64`](../../shared/urls/validateNextPath.ts#L1).

**[`shared/urls/index.ts`](../../shared/urls/index.ts) (modify).**
Re-export the renamed matchers (`matchGameRedeemPath`,
`matchGameRedemptionsPath`) in place of the old names. Other
re-exports stay verbatim. Verified by:
[`shared/urls/index.ts:12-22`](../../shared/urls/index.ts#L12).

**[`shared/urls/README.md`](../../shared/urls/README.md) (modify).**
Update the `routes` builder list at line 13 (`eventRedeem(slug)` →
`gameRedeem(slug)`, `eventRedemptions(slug)` →
`gameRedemptions(slug)`) and the matcher list at line 18
(`matchEventRedeemPath` → `matchGameRedeemPath`,
`matchEventRedemptionsPath` → `matchGameRedemptionsPath`). Delete
the "Operator-route renames" entry under "What is intentionally
absent" at lines 49–52 — the deferral resolves in this PR. Verified
by:
[`shared/urls/README.md:13,18,49-52`](../../shared/urls/README.md#L13).

**[`apps/web/src/App.tsx`](../../apps/web/src/App.tsx) (modify).**
Update the matcher imports at lines 9–10 and the two dispatch
branches at lines 41–63. Page-component imports stay verbatim;
the JSX inside each branch (the page render with the
`key={matched.slug}` pattern) stays verbatim; no `<ThemeScope>`
wrap added. Verified by:
[`apps/web/src/App.tsx:1-15,40-63`](../../apps/web/src/App.tsx#L1).

**[`apps/web/src/pages/EventRedeemPage.tsx`](../../apps/web/src/pages/EventRedeemPage.tsx) (modify).**
JSDoc URL strings at lines 101 and 358 update from
`/event/:slug/redeem` to `/event/:slug/game/redeem`. The
magic-link `next=` builder call at line 384 updates from
`routes.eventRedeem(slug)` to `routes.gameRedeem(slug)`. The
import on line 23
(`import { routes, type AuthNextPath } from "../../../../shared/urls";`)
imports the `routes` symbol, which does not rename — only the
property access on `routes` at the call site changes. No behavior
or prop change. Verified by:
[`apps/web/src/pages/EventRedeemPage.tsx:23,101,358,384`](../../apps/web/src/pages/EventRedeemPage.tsx#L23).

**[`apps/web/src/pages/EventRedemptionsPage.tsx`](../../apps/web/src/pages/EventRedemptionsPage.tsx) (modify).**
Mirror edit: JSDoc URL strings at lines 119 and 615 update to
`/event/:slug/game/redemptions`; the magic-link `next=` builder
call at line 645 updates to `routes.gameRedemptions(slug)`. The
`routes` import is unchanged for the same reason as
`EventRedeemPage.tsx`. Verified by:
[`apps/web/src/pages/EventRedemptionsPage.tsx:119,615,645`](../../apps/web/src/pages/EventRedemptionsPage.tsx#L119).

**[`tests/shared/urls/routes.test.ts`](../../tests/shared/urls/routes.test.ts) (modify).**
Update the matcher imports at lines 3–6 to the renamed names. In
the "redeem routes" describe block at lines 61–83, update
`routes.eventRedeem` → `routes.gameRedeem`,
`matchEventRedeemPath` → `matchGameRedeemPath`, and the URL
literals to the `/game/redeem` shape (including the negative
assertion for the redemptions path at line 80). Mirror edits in
the "redemptions monitoring routes" describe block at lines
85–113. The "event admin routes" describe block at lines 28–59
contains a `/event/madrona-music-2026/redeem` rejection assertion
at line 50 that updates to `/event/madrona-music-2026/game/redeem`
— keep the rejection invariant. The "game routes" describe block
at lines 10–26 is untouched. Verified by:
[`tests/shared/urls/routes.test.ts:1-114`](../../tests/shared/urls/routes.test.ts#L1).

**[`tests/shared/urls/validateNextPath.test.ts`](../../tests/shared/urls/validateNextPath.test.ts) (modify).**
Update the four allow-list assertions at lines 85–107: each pair
(bare slug, URL-encoded slug) updates input + expected output to
the `/game/`-prefixed form. The `rejectedInputs` list and the
torture test are unchanged. Verified by:
[`tests/shared/urls/validateNextPath.test.ts:85-107`](../../tests/shared/urls/validateNextPath.test.ts#L85).

**[`tests/web/App.test.tsx`](../../tests/web/App.test.tsx) (modify).**
Update the redeem-route dispatch test's `pathname` mock at line 47
from `/event/madrona-music-2026/redeem` to
`/event/madrona-music-2026/game/redeem`. (The scoping doc named
line 73; the load-bearing target is the redeem-route `it` block,
currently at lines 44–53. Reality-check at edit time and edit the
URL literal inside the redeem-route `it` block.) The per-event
admin `it` block at lines 55–76 is unchanged. Verified by:
[`tests/web/App.test.tsx:44-53`](../../tests/web/App.test.tsx#L44).

**[`tests/web/pages/EventRedeemPage.test.tsx`](../../tests/web/pages/EventRedeemPage.test.tsx) (modify).**
Update the `next` assertion at line 91 from
`/event/madrona-music-2026/redeem` to
`/event/madrona-music-2026/game/redeem`. Verified by:
[`tests/web/pages/EventRedeemPage.test.tsx:91`](../../tests/web/pages/EventRedeemPage.test.tsx#L91).

**[`tests/web/pages/EventRedemptionsPage.test.tsx`](../../tests/web/pages/EventRedemptionsPage.test.tsx) (modify).**
Mirror edit: update the `next` assertion at line 185 from
`/event/madrona-music-2026/redemptions` to
`/event/madrona-music-2026/game/redemptions`. Verified by:
[`tests/web/pages/EventRedemptionsPage.test.tsx:185`](../../tests/web/pages/EventRedemptionsPage.test.tsx#L185).

**[`tests/e2e/redeem-auth-fixture.ts`](../../tests/e2e/redeem-auth-fixture.ts) (modify).**
Update the `defaultRedirectUrl` constant at line 30 from
`http://127.0.0.1:4173/auth/callback?next=/event/first-sample/redeem`
to `http://127.0.0.1:4173/auth/callback?next=/event/first-sample/game/redeem`.
The host part stays verbatim. Verified by:
[`tests/e2e/redeem-auth-fixture.ts:29-30`](../../tests/e2e/redeem-auth-fixture.ts#L29).

**[`tests/e2e/redemptions-auth-fixture.ts`](../../tests/e2e/redemptions-auth-fixture.ts) (modify).**
Mirror edit at line 30 (or line 31 — reality-check at edit time):
update to `next=/event/first-sample/game/redemptions`. Verified by:
[`tests/e2e/redemptions-auth-fixture.ts:29-31`](../../tests/e2e/redemptions-auth-fixture.ts#L29).

**[`tests/e2e/mobile-smoke.redeem.spec.ts`](../../tests/e2e/mobile-smoke.redeem.spec.ts) (modify).**
Update the `page.goto` URL at line 18 and the `toHaveURL`
assertion at line 24 from `/event/${fixture.eventSlug}/redeem` to
`/event/${fixture.eventSlug}/game/redeem`. The fixture interface
and other assertions stay verbatim. Verified by:
[`tests/e2e/mobile-smoke.redeem.spec.ts:18,24`](../../tests/e2e/mobile-smoke.redeem.spec.ts#L18).

**[`tests/e2e/mobile-smoke.redemptions.spec.ts`](../../tests/e2e/mobile-smoke.redemptions.spec.ts) (modify).**
Mirror edits: `page.goto` URL at line 12 and `toHaveURL` patterns
at lines 21 and 77 update to the `/game/redemptions` shape.
Verified by:
[`tests/e2e/mobile-smoke.redemptions.spec.ts:12,21,77`](../../tests/e2e/mobile-smoke.redemptions.spec.ts#L12).

**This plan (modify, terminal step).** Status flips from
`Proposed` to `Landed` in the implementing PR per AGENTS.md
"Plan-to-PR Completion Gate."

## Files To Touch

### Modify (shared)

- [`shared/urls/routes.ts`](../../shared/urls/routes.ts)
- [`shared/urls/validateNextPath.ts`](../../shared/urls/validateNextPath.ts)
- [`shared/urls/index.ts`](../../shared/urls/index.ts)
- [`shared/urls/README.md`](../../shared/urls/README.md)

### Modify (apps/web)

- [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx)
- [`apps/web/src/pages/EventRedeemPage.tsx`](../../apps/web/src/pages/EventRedeemPage.tsx)
- [`apps/web/src/pages/EventRedemptionsPage.tsx`](../../apps/web/src/pages/EventRedemptionsPage.tsx)

### Modify (tests)

- [`tests/shared/urls/routes.test.ts`](../../tests/shared/urls/routes.test.ts)
- [`tests/shared/urls/validateNextPath.test.ts`](../../tests/shared/urls/validateNextPath.test.ts)
- [`tests/web/App.test.tsx`](../../tests/web/App.test.tsx)
- [`tests/web/pages/EventRedeemPage.test.tsx`](../../tests/web/pages/EventRedeemPage.test.tsx)
- [`tests/web/pages/EventRedemptionsPage.test.tsx`](../../tests/web/pages/EventRedemptionsPage.test.tsx)
- [`tests/e2e/redeem-auth-fixture.ts`](../../tests/e2e/redeem-auth-fixture.ts)
- [`tests/e2e/redemptions-auth-fixture.ts`](../../tests/e2e/redemptions-auth-fixture.ts)
- [`tests/e2e/mobile-smoke.redeem.spec.ts`](../../tests/e2e/mobile-smoke.redeem.spec.ts)
- [`tests/e2e/mobile-smoke.redemptions.spec.ts`](../../tests/e2e/mobile-smoke.redemptions.spec.ts)

### Modify (plan Status)

- This plan — Status flips from `Proposed` to `Landed`.

### Files intentionally not touched

- [`apps/web/vercel.json`](../../apps/web/vercel.json) — owned by 2.5.2.
- [`scripts/testing/run-auth-e2e-dev-server.cjs`](../../scripts/testing/run-auth-e2e-dev-server.cjs)
  and
  [`tests/scripts/run-auth-e2e-dev-server.test.ts`](../../tests/scripts/run-auth-e2e-dev-server.test.ts)
  — owned by 2.5.2.
- [`docs/operations.md`](../operations.md),
  [`docs/architecture.md`](../architecture.md),
  [`docs/dev.md`](../dev.md) — URL-shape and page-behavior doc
  edits split across 2.5.2 and 2.5.3; this sub-phase only edits
  [`shared/urls/README.md`](../../shared/urls/README.md) which
  reads as part of the load-bearing module change.
- [`docs/product.md`](../product.md),
  [`README.md`](../../README.md),
  [`docs/open-questions.md`](../open-questions.md),
  [`docs/backlog.md`](../backlog.md) — owned by 2.5.3.
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md)
  M2 row, [`docs/plans/m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  Status — owned by 2.5.3.
- M2 scoping docs under
  [`scoping/`](./scoping/) — batch deletion in 2.5.3.
- Edge Functions, migrations,
  [`shared/auth/`](../../shared/auth),
  [`shared/db/`](../../shared/db),
  [`shared/events/`](../../shared/events),
  [`shared/styles/`](../../shared/styles), apps/site source.

## Execution Steps

1. **Pre-edit gate.** Confirm clean worktree, feature branch
   (not `main`), and that the umbrella's
   "Hard dependencies on landed siblings" pre-conditions hold
   (the `routes.eventRedeem` / `routes.eventRedemptions` builders
   still exist in
   [`shared/urls/routes.ts`](../../shared/urls/routes.ts) and the
   apps/web dispatcher still imports `matchEventRedeemPath` /
   `matchEventRedemptionsPath`). Re-read the umbrella's "Cross-
   Cutting Invariants" and this plan's Contracts section. Confirm
   no other PR is in flight against
   [`shared/urls/routes.ts`](../../shared/urls/routes.ts).
2. **Baseline validation.** `npm run lint`, `npm test`,
   `npm run build:web`, `npm run build:site`,
   `npm run test:functions`. All must pass before any edit.
3. **Repo-wide grep audit.**

   ```
   grep -rn "/event/.*/redeem\|/event/.*/redemptions" \
     --include="*.ts" --include="*.tsx" --include="*.cjs" \
     --include="*.json" --include="*.md" \
     --exclude-dir=node_modules --exclude-dir=archive .
   ```

   Cross-check against the "Files To Touch" inventory plus the
   sub-phase split (files this sub-phase doesn't touch but 2.5.2
   or 2.5.3 will). Re-grep
   `routes\.eventRedeem\|routes\.eventRedemptions\|matchEventRedeem\|matchEventRedemptions`.
   Any miss is either intentional (in
   [`docs/plans/scoping/`](./scoping/) or
   [`docs/plans/m2-phase-2-*`](./m2-phase-2-1-plan.md), retrospective
   description) or a real miss to add to the inventory.
4. **Pre-merge: Supabase Auth dashboard allow-list audit per
   environment.** For each Supabase environment (local, preview,
   production), confirm the redirect-URL allow-list contains
   `/event/:slug/game/redeem` and
   `/event/:slug/game/redemptions` in addition to the existing
   entries. The audit must complete before this PR merges,
   otherwise post-merge magic-link requests fall back to
   `routes.home`. Captured in the PR's Validation section as a
   per-env check.
5. **Shared/urls rename + apps/web consumer edits.** Edit
   [`shared/urls/routes.ts`](../../shared/urls/routes.ts),
   [`shared/urls/validateNextPath.ts`](../../shared/urls/validateNextPath.ts),
   [`shared/urls/index.ts`](../../shared/urls/index.ts),
   [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx),
   [`apps/web/src/pages/EventRedeemPage.tsx`](../../apps/web/src/pages/EventRedeemPage.tsx),
   [`apps/web/src/pages/EventRedemptionsPage.tsx`](../../apps/web/src/pages/EventRedemptionsPage.tsx)
   per the Contracts section. Single commit per the build-
   sequencing constraint. `npm run build:web` confirms compilation.
6. **Test updates.** Update all `tests/shared/urls/*`,
   `tests/web/*`, `tests/e2e/*` files per the Contracts section.
   `npm test` confirms unit tests pass.
7. **shared/urls/README.md update.** Edit the `routes` builder
   list, matcher list, and "What is intentionally absent" entry.
8. **Local apps/web smoke.** Run `npm run dev:web`. Visit
   `http://localhost:5173/event/<seeded-slug>/game/redeem` and
   `/event/<seeded-slug>/game/redemptions` directly — both should
   render the operator page shells (signed-out state) identically
   to today's `/redeem` / `/redemptions` rendering. Visit the
   bare paths `/event/<seeded-slug>/redeem` and
   `/event/<seeded-slug>/redemptions` — both should render
   apps/web's not-found page. (The bare-path render against
   apps/web's not-found instead of apps/site's is the umbrella's
   "Bare-path UX gap" risk — intentional, gap closes when 2.5.2
   merges.)
9. **Local auth e2e exercise.** Run
   `npm run test:e2e:redeem` and `npm run test:e2e:redemptions`
   ([`package.json:27-28`](../../package.json#L27)). The wrappers
   provision the local Supabase Docker stack, forward the local
   service-role key, start the auth-e2e dev-server proxy, and
   exercise the renamed routes through the magic-link round-trip.
10. **Validation re-run.** All baseline commands from step 2 must
    pass.
11. **Code-review feedback loop.** Walk the diff against every
    Cross-Cutting Invariant Touched and every Self-Review Audit
    named below. Apply fixes; commit review-fix changes separately
    per AGENTS.md Review-Fix Rigor.
12. **Plan-to-PR Completion Gate.** Walk every Goal item, every
    Cross-Cutting Invariant, every Validation Gate command, and
    every Self-Review Audit. Confirm each is satisfied or
    deferred. Flip Status to `Landed`.
13. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 characters
    (suggested:
    `feat(m2-2.5.1): rename routes.gameRedeem* + retarget dispatcher`).
    Validation section names every command run + the per-env
    Supabase Auth dashboard audit. PR description names the
    "Bare-path UX gap" risk and links to 2.5.2 as the cutover that
    closes it.

## Commit Boundaries

1. **Shared rename + apps/web consumer edits.** Single commit
   per the build-sequencing constraint. Includes
   [`shared/urls/routes.ts`](../../shared/urls/routes.ts),
   [`shared/urls/validateNextPath.ts`](../../shared/urls/validateNextPath.ts),
   [`shared/urls/index.ts`](../../shared/urls/index.ts),
   [`apps/web/src/App.tsx`](../../apps/web/src/App.tsx), and the
   two page files.
2. **Test updates.** Single commit; depends on commit 1's shared
   rename for the matcher imports. Includes all
   `tests/shared/urls/*`, `tests/web/*`, `tests/e2e/*` files.
3. **shared/urls/README + plan Status flip.** Single commit;
   Status flip lands here as the closure commit.
4. **Review-fix commits.** As needed.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final at every
  commit's tip.
- `npm run build:site` — pass on baseline; pass on final
  (unchanged).
- `npm run test:functions` — pass on baseline; pass on final
  (unchanged).
- pgTAP via `npm run test:db` — pass on baseline; pass on final
  (unchanged).
- **`npm run test:e2e:redeem` and `npm run test:e2e:redemptions`
  via the canonical wrappers** ([`package.json:27-28`](../../package.json#L27)).
  Pre-merge load-bearing for the matcher rename and the
  magic-link `next=` swap.
- **Local apps/web dev-server smoke (Execution step 8).** New
  URLs render the operator pages; bare URLs render apps/web's
  not-found page. Pre-merge load-bearing for the dispatcher swap.
- **Manual: Supabase Auth dashboard redirect-URL allow-list
  audit per environment (Execution step 4).** Pre-merge
  load-bearing for the magic-link `next=` flip.

**No production smoke gate.** Per the umbrella's Status: 2.5
does not touch any production-smoke fixture. This sub-phase
lands under the regular Tier 1–4 gate.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md).

### Frontend

- **Rename-aware diff classification**
  ([catalog §Rename-aware diff classification](../self-review-catalog.md#L354)).
  This sub-phase renames `routes.eventRedeem` /
  `routes.eventRedemptions` and `matchEventRedeem*` /
  `matchEventRedemptions*` and rewrites URL string literals across
  tests, fixtures, and the shared/urls README. The bulk of the
  diff is mechanical. **Reviewer attention should land on the
  small content edits**: the `AppPath` literal-union member
  changes, the matcher `suffix` constants
  ([`shared/urls/routes.ts:136,174`](../../shared/urls/routes.ts#L136)),
  the page-file JSDoc URL strings, and the magic-link `next=`
  builder swap. Use `git diff --name-status` and the
  rename-aware classifier per the catalog rule.
- **Platform-auth-gate config audit**
  ([catalog §Platform-auth-gate config audit](../self-review-catalog.md)).
  Two of the three independent allow-lists update in this
  sub-phase: `validateNextPath`'s allow-list (covered by
  [`tests/shared/urls/validateNextPath.test.ts`](../../tests/shared/urls/validateNextPath.test.ts))
  and the Supabase Auth dashboard per environment (Execution
  step 4 manual). The third (apps/web/vercel.json) doesn't change
  in this sub-phase — rule 2's `/event/:slug/game/:path*` carve-out
  already covers the new URLs.

### CI

- **Rename-aware diff classification.** Any docs-only or
  scoped-test CI gate must classify this branch as code-touching;
  the rename touches `shared/urls/`, `apps/web/src/App.tsx`, the
  page files, and tests. A docs-only classifier would skip the
  load-bearing build / unit / e2e gates.

### Runbook

- No SQL or operational scripts in this sub-phase. The Supabase
  Auth dashboard audit is the one operational surface; covered
  above under Frontend.

## Documentation Currency PR Gate

- [`shared/urls/README.md`](../../shared/urls/README.md) — `routes`
  builder list, matcher list, "What is intentionally absent" entry
  per Contracts.
- This plan — Status flips to `Landed`.
- All other doc surfaces (architecture, dev, operations, product,
  README, open-questions, backlog) defer to 2.5.2 or 2.5.3 per
  the umbrella's "Documentation Currency" subsection.

## Out Of Scope

Sub-phase-local exclusions. See umbrella for phase-level Out of
Scope.

- **Vercel rewrite config edits.** Owned by 2.5.2.
- **Local auth-e2e dev-server proxy edits.** Owned by 2.5.2.
- **URL-ownership-shape doc edits** (architecture topology,
  dev.md rule walkthrough, operations.md auth dashboard
  description). Owned by 2.5.2.
- **Page-behavior + API-shape doc edits** (architecture route
  inventory, auth-flow narrative, dev.md routes builder list,
  product.md, README, M2 closure surface). Owned by 2.5.3.
- **Bare-path retirement post-deploy verification.** Owned by
  2.5.2 (the cutover that introduces the production behavior
  change).
- **M2 closure** (epic row flip, milestone Status flips,
  open-questions close, backlog updates, scoping batch delete).
  Owned by 2.5.3.

## Risk Register

Sub-phase-local risks. See umbrella for cross-sub-phase risks.

- **Bare-path UX gap pre-2.5.2.** Bare URLs reach apps/web (still
  carved out via vercel.json rules 5–6) but the dispatcher
  renders the not-found page because no branch matches. Gap
  closes when 2.5.2 merges. Mitigation: PR description names the
  gap so reviewers don't flag the apps/web 404 as a regression;
  the gap is bounded by 2.5.2's merge cadence (umbrella's strict-
  serial sequencing).
- **Magic-link `next=` flip + dashboard audit slip.** If the
  Supabase Auth dashboard audit (Execution step 4) misses an
  environment, post-merge magic-link requests in that environment
  fall back to `routes.home`. Mitigation: per-env audit captured
  in PR's Validation section; the "all three environments
  audited" line is a load-bearing pre-merge gate.
- **Rename-only commit accidentally drops a consumer.** A missed
  consumer of the old builder/matcher names fails the type check.
  Mitigation: Execution step 3's repo-wide grep + `npm run
  build:web` after each commit.
- **Test-asserted URL string outside the file inventory.** If an
  e2e spec or unit test asserts the bare path inline (not via
  the fixture's `defaultRedirectUrl`), the test fails post-merge.
  Mitigation: the grep at Execution step 3 covers `tests/`
  exhaustively; any miss surfaces in `npm test` or the e2e
  wrapper run.

## Backlog Impact

- No backlog edits in this sub-phase. M2 closure (close + unblock)
  lands in 2.5.3.

## Related Docs

- [`m2-phase-2-5-plan.md`](./m2-phase-2-5-plan.md) — umbrella;
  this PR's Status flip + sequencing + the cross-sub-phase
  narrative 2.5.2 and 2.5.3 will draft against.
- 2.5.2 and 2.5.3 sub-phase plans — not yet drafted per the
  umbrella's "Just-in-time sub-phase drafting" rule. 2.5.2
  drafts after this PR lands; 2.5.3 drafts after 2.5.2 lands
  and its post-deploy verification passes.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone; Phase Status row updates as each sub-phase ships.
- [`shared-urls-foundation.md`](./shared-urls-foundation.md) —
  M1 phase 1.2 plan; the deferral this sub-phase resolves.
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../AGENTS.md) — workflow rules.
