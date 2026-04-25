# `apps/site` Scaffold And Vercel Routing

## Status

Landed. Cookie-boundary verification deferred to M1 phase 1.3 — see
"Verification Evidence" below for the planning-time bug that forced
the deferral.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md),
Milestone M0, Phase 0.3. The epic's M0 row stays `Proposed` until this
phase's plan flips to `Landed`. Sibling phases:
[`repo-rename.md`](./repo-rename.md) (0.1, Landed) and
[`framework-decision.md`](./framework-decision.md) (0.2, Landed) — both
already on the platform.

## Goal

Stand up `apps/site` as an empty deployable Next.js 16.2.4 LTS (App
Router) workspace that serves a placeholder page at `/event/:slug` for
any slug. Configure **transitional** path-based Vercel routing so the
event-scoped URLs that belong in `apps/site` start serving from there,
while every other URL — including `/`, `/admin*`, `/auth/callback`, and
the bare-path operator routes under `/event/:slug/` — continues to
serve from `apps/web` exactly as today. Verify on the production
domain that a cookie set by `apps/web` on path=`/` is visible to
`apps/site`'s server-rendered routes. No existing `apps/web` runtime
behavior changes.

This is the first phase that runs the Phase 0.2 framework choice
against the production domain. It owns closing the production-reality
open questions [`framework-decision.md`](./framework-decision.md) left
on the table for the cookie-boundary mechanism.

The epic's **final** routing contract (where `apps/site` owns `/`,
`/admin*`, `/auth/callback`, and all top-level surfaces, and
`apps/web`'s footprint is purely event-scoped) is **not** reached in
this phase. It is reached as M2 phases 2.3 and 2.4 migrate those
surfaces. This phase ships the transitional shape that supports those
migrations cleanly without pre-committing to them.

## Cross-Cutting Invariants

These rules thread through every diff line in this PR. Self-review
walks each one against every changed file.

- **Behavior-preserving for `apps/web`.** No existing route, auth
  surface, edge function, or persistence path changes. `apps/web`'s
  `vercel.json` grows new rewrite rules but no existing rewrite loses
  its current behavior, and no `apps/web` source file changes except
  for routing-config additions and any doc-link updates.
- **`apps/site` is empty by intent.** The scaffold ships only what is
  required to render the placeholder page and prove the cookie
  boundary. No theme wiring, no `shared/auth/` consumption, no
  Supabase imports, no `EventContent` type, no per-event-coded
  folders. Theme groundwork lands in M1 phase 1.5; auth wiring lands
  in M1 phase 1.3; `EventContent` lands in M3 phase 3.1.
- **Transitional routing only.** This phase ships the shape that
  serves event-scoped non-game/admin URLs from `apps/site`. It does
  not migrate `/`, `/admin*`, `/auth/callback`, or the bare-path
  operator routes — those are M2's job. The Vercel rewrite rules must
  be structured so M2 phases 2.3, 2.4, and 2.5 can update or remove
  individual rules without rebuilding the routing topology.
- **Versions are pinned.** Next.js, the Next.js ESLint config, and
  any React peer pins added to `apps/site/package.json` are
  exact-version pins (no `^`, no `~`), matching the `apps/web`
  discipline of reproducible builds. Lockfile regenerated in the
  same commit.
- **Cookie boundary is proven, not assumed.** The verification
  artifact is reproducible: a documented sequence that any
  contributor can re-run against production to re-confirm. The
  verification mechanism uses the existing `neighborly_session`
  cookie (set by the Supabase Edge Function when an attendee enters
  a game) — no new cookie is introduced for the test, and no
  Supabase Auth wiring lands in this phase.

## Routing Topology

The transitional routing contract from the parent epic, locked here.
Rule precedence flows top-to-bottom in the table; Vercel rewrites
must be ordered identically (most-specific first, catch-all last).

| Rule | Path pattern | Destination | Lifetime |
| --- | --- | --- | --- |
| 1 | `/event/:slug/game` | `apps/web` | Permanent (event-scoped) |
| 2 | `/event/:slug/game/:path*` | `apps/web` | Permanent (event-scoped) |
| 3 | `/event/:slug/admin` | `apps/web` | Permanent (event-scoped); route shell added in M2 phase 2.2 |
| 4 | `/event/:slug/admin/:path*` | `apps/web` | Permanent (event-scoped) |
| 5 | `/event/:slug/redeem` | `apps/web` | Transitional; retired by M2 phase 2.5 (URL moves to `/event/:slug/game/redeem`) |
| 6 | `/event/:slug/redemptions` | `apps/web` | Transitional; retired by M2 phase 2.5 (URL moves to `/event/:slug/game/redemptions`) |
| 7 | `/event/:slug` | `apps/site` | Permanent (placeholder in 0.3; real landing page in M3) |
| 8 | `/event/:slug/:path*` | `apps/site` | Permanent (catches every event-scoped path not carved out above) |
| 9 | `/`, `/admin*`, `/auth/callback`, all other top-level paths | `apps/web` | Transitional; `/` and `/auth/callback` migrate to `apps/site` in M2 phase 2.3, `/admin*` migrates in M2 phase 2.4 |

**Namespace vs. bare-path distinction.** Rules 1–4 are full namespace
carve-outs: both the bare path and the `*`-suffixed sub-paths route
to `apps/web`. The `game` namespace already has sub-paths in M2
phase 2.5 (operator URLs migrate into it). The `admin` namespace
will have sub-paths once M2 phase 2.2 adds the per-event admin route
shell. Reserving the namespaces now means M2 does not need to revisit
Vercel rules for these surfaces.

Rules 5–6 are bare-path carve-outs for the existing operator URLs
that still live at the bare path today. They are explicitly
transitional — M2 phase 2.5 retires them by migrating the URLs into
`/event/:slug/game/*` (already covered by rules 1–2) and removing
rules 5–6 from `apps/web`'s `vercel.json`.

Rule 9 is the implicit default — anything not matched by rules 1–8
serves from `apps/web` because `apps/web` remains the primary Vercel
project owning the production custom domain. The migrations in M2
phase 2.3 (`/` and `/auth/callback` → `apps/site`) and M2 phase 2.4
(`/admin*` → `apps/site`) add explicit rules above rule 9 that send
those paths to `apps/site`, then rule 9 narrows to "everything not
yet migrated."

## Decisions Resolved In This Plan

These resolve open questions named in
[`framework-decision.md`](./framework-decision.md) that the Phase 0.2
documentation could not close.

- **Routing model: proxy-rewrite, not Vercel Microfrontends.** The
  proxy-rewrite path is sufficient for our path-routed contract,
  free at any deploy volume the platform is realistically targeting
  through M4, and avoids the per-project Microfrontends pricing
  tier. Microfrontends remains the documented upgrade path if
  independent CDN routing or per-project deploy independence becomes
  a real requirement post-epic.
- **`apps/web` is the primary Vercel project in 0.3.** It owns the
  production custom domain; its `vercel.json` hosts the cross-app
  rewrites. Rationale: in the transitional state, `apps/web` still
  owns the majority of URLs (`/`, `/admin*`, `/auth/callback`, plus
  the event-scoped game/admin/operator routes), so making it the
  primary keeps the rewrite rules small in this phase. **Whether
  primary-project ownership flips to `apps/site` later in the
  epic** (after M2 inverts the URL ownership balance) is not decided
  here — it is a routing-config decision belonging to M2 plan
  authors. The Vercel rewrite rules in this phase do not depend on
  apps/web staying primary forever.
- **Cookie-boundary verification scope.** This phase verifies one
  question only: that an HTTP cookie set on path=`/` in `apps/web`
  is readable by Next.js `cookies()` from `next/headers` in
  `apps/site` server-rendered routes on the production domain.
  Cross-app Supabase **auth** cookie sharing and cross-app
  token-refresh visibility are deferred to M1 phase 1.3, because
  Supabase Auth in `apps/web` currently lives in browser
  `localStorage` (not a cookie) and the cookie-based migration is
  M1's job.

## Files To Touch — New

The exact file list is bounded by the "empty by intent" invariant.
The scaffold is whatever `npx create-next-app@16.2.4 --app
--typescript --src-dir=false --tailwind=false --eslint --import-alias
'@/*'` produces, **minus** anything that does not serve the
placeholder page or the routing config. Concretely, the new files
the PR adds:

- `apps/site/package.json` — workspace member with exact-pinned
  Next.js, React, React-DOM, TypeScript, Next.js ESLint config.
  Workspace name `@neighborly/site` (matching the `@neighborly/web`
  scope per the runtime-identifier preservation rule from
  [`repo-rename.md`](./repo-rename.md)).
- `apps/site/next.config.ts` — `output: 'standalone'` per Vercel's
  monorepo guidance; no other non-default options in this phase.
- `apps/site/tsconfig.json` — extends repo conventions; strict mode
  on, `paths` aligned with `@/*` import alias.
- `apps/site/app/layout.tsx` — minimal root layout; one-line title;
  no theme wiring.
- `apps/site/app/event/[slug]/page.tsx` — placeholder page that
  renders the slug and the cookie-boundary verification readout.
  Server component; uses `cookies()` from `next/headers` to display
  whether `neighborly_session` is present (presence-only — never
  echo the cookie value).
- `apps/site/.gitignore` — Next.js standard ignores (`.next/`,
  `out/`, etc.).
- `apps/site/eslint.config.mjs` (or extension to root config) —
  Next.js ESLint plugin wired so `npm run lint` covers `apps/site`.

## Files To Touch — Modify

- [`package.json`](../../package.json) — add `build:site` script
  (`npm --workspace @neighborly/site run build`), add `dev:site`,
  add Next.js ESLint plugin to lint command if not picked up by the
  workspace-local config. The `apps/*` workspaces glob already
  includes `apps/site` — no workspace-list edit required.
- `package-lock.json` — regenerated by `npm install` after
  `apps/site/package.json` lands.
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — add a
  `Build site app` step running `npm run build:site` immediately after
  the existing `Build web app` step in the `validate` job. The new step
  reuses the same `if: needs.detect-scope.outputs.docs_only != 'true'`
  guard as the surrounding steps so docs-only PRs continue to skip
  heavy validation. Without this step, Next.js build-time failures in
  `apps/site` (route errors, server-component compile failures, type
  errors) can merge undetected and only surface when the second Vercel
  project tries to deploy — leaving the new production surface without
  the same build gate `apps/web` already has.
- [`apps/web/vercel.json`](../../apps/web/vercel.json) — extend
  rewrites to implement the Routing Topology table. Existing SPA
  rewrites (`/admin/:path*`, `/event/:path*`, `/auth/:path*` → SPA)
  remain; new cross-app rewrites are added **above** them so the
  more-specific rules match first. Concretely, the file gains: a
  rule pair for the `game` namespace (rules 1–2), a rule pair for
  the `admin` namespace (rules 3–4), bare-path rules for the
  transitional operator routes (rules 5–6), and the `apps/site`
  catch-all for event-scoped paths (rules 7–8). The existing
  `/event/:path*` → SPA rewrite stays as the lowest-precedence
  fallback for any path not matched above; today it catches the
  same set as before, and after M2 it will narrow as carve-out
  rules are removed. Cross-app destinations point at the `apps/site`
  Vercel project's deployment URL via Vercel's path-rewrite-to-URL
  syntax.
- [`README.md`](../../README.md) — repo-structure section: two apps
  (`apps/web`, `apps/site`), transitional proxy-rewrite topology
  summary noting the M2 migration plan, new `npm run build:site`
  command in the validation list.
- [`docs/dev.md`](../../docs/dev.md) — add `npm run build:site` to
  the validation commands section, document the Turbopack vs. Vite
  bundler divergence (`apps/web` uses Vite; `apps/site` uses
  Turbopack by default per Next.js 16), document local `dev:site`
  command, document the Vercel two-project monorepo layout under
  the existing "Vercel" section, document the cookie-boundary
  verification re-run procedure, document the transitional routing
  state and where the rules will change in M2.
- [`docs/architecture.md`](../../docs/architecture.md) — top-level
  summary noting the two-app shape: `apps/web` (Vite SPA, attendee
  game + admin + auth + transitional ownership of `/`, `/admin*`,
  `/auth/callback`) and `apps/site` (Next.js SSR/SSG, public
  event landing pages today, expanding to top-level surfaces in M2).
  Routing-topology table cross-referencing this plan, with the
  transitional/permanent column.
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md) —
  M0 row Status flipped from `Proposed` to `Landed` **only after**
  cookie-boundary verification passes (see "Two-Phase
  Plan-to-Landed" below). The Phase 0.3 paragraph itself is not
  rewritten — the paragraph already describes the transitional
  shape this PR executes.
- This plan — Status flipped per the two-phase rule below.

## Files Intentionally Not Touched

A grep match against any of these is correct.

- `apps/web/src/**` — no source changes. Existing routes, auth
  surfaces, and game logic stay byte-identical. The transitional
  rule 9 fallback to `apps/web` for `/`, `/admin*`, `/auth/callback`,
  and the bare-path operator routes is exactly the today-state
  behavior preserved.
- `supabase/**` — no migration, no edge-function change. The
  `neighborly_session` cookie continues to be issued by
  `supabase/functions/issue-session/` exactly as today; this phase
  only reads it from the `apps/site` side.
- `shared/**` — no shared-package extraction lands in this phase.
  Shared extraction is M1's job.
- Existing `apps/web/vercel.json` rewrites for `/admin/:path*`,
  `/event/:path*`, and `/auth/:path*` — kept intact as the
  lowest-precedence fallback. Only new, more-specific rules are
  added above them.
- Runtime identifiers (`neighborly_session` cookie name,
  `x-neighborly-session` header, `neighborly.local-*` storage keys,
  `NEIGHBORLY_SKIP_DB_RESET`, `generate_neighborly_verification_code`
  DB function, `@neighborly/web` workspace scope) — preserved per
  [`repo-rename.md`](./repo-rename.md) cross-cutting invariants.
  The new `@neighborly/site` workspace scope follows the same
  `@neighborly` prefix convention.

## Execution Steps

These are the gates a human or agent walks in order. Each gate
exists because skipping it materially affects quality.

1. **Pre-edit gate.** Confirm clean worktree, on a feature branch
   (not `main`). Confirm Node and npm versions match `mise.toml`
   and `package.json` engines.
2. **Baseline validation.** Run `npm run lint` and
   `npm run build:web` from the current state. Both must pass
   before any edits.
3. **Scaffold `apps/site`.** Run `npx create-next-app@16.2.4`
   with the flags named in "Files To Touch — New," then prune
   everything that is not on the new-file list (Tailwind config,
   demo styles, `app/page.tsx` if not the routing root, `public/`
   demo assets if present, font imports, README boilerplate). Pin
   every dependency in `apps/site/package.json` to an exact
   version. Run `npm install` to integrate the new workspace into
   `package-lock.json`.
4. **Wire `npm run build:site` and ESLint.** Add the script to
   root `package.json`. Confirm `npm run lint` picks up
   `apps/site` (extend the root ESLint config or rely on a
   workspace-local config — pick one and document the choice).
   Run `npm run lint` and `npm run build:site` to confirm both
   pass on the empty scaffold.
5. **Add the placeholder page.** Implement
   `apps/site/app/event/[slug]/page.tsx` as a server component
   that renders the slug from `params` and the cookie-boundary
   readout from `cookies()`. Add the minimal `app/layout.tsx`. Run
   `npm run build:site` again to confirm the route compiles.
6. **Update `apps/web/vercel.json`.** Add the eight new rewrite
   rules per the Routing Topology table, ordered most-specific
   first. Walk the rule precedence three times:
   - rules 1–2 (`game` namespace) match before rule 8 (event
     catch-all to `apps/site`);
   - rules 3–4 (`admin` namespace) match before rule 8 even
     though no admin route exists yet — this reserves the
     namespace for M2 phase 2.2;
   - rules 5–6 (bare-path operator routes) match before rule 8 so
     `/event/:slug/redeem` stays on `apps/web` until M2 phase
     2.5 retires it.
   The pre-existing `/admin/:path*`, `/event/:path*`, and
   `/auth/:path*` SPA rewrites stay at the bottom as the
   lowest-precedence fallback (rule 9). Confirm by walking the
   rule list against the table.
7. **Configure the second Vercel project.** Operator step
   (outside the PR diff): create the `apps/site` Vercel project
   pointing at the same monorepo with Root Directory `apps/site`.
   Wire the project to be reachable so `apps/web`'s rewrites can
   target it. `apps/web` remains the primary project owning the
   production custom domain. The PR body must name this operator
   step explicitly so it is not silently dropped.
8. **Documentation update.** Update `README.md`, `docs/dev.md`,
   and `docs/architecture.md` per "Files To Touch — Modify." Each
   doc must describe the routing as **transitional**, naming the
   M2 phases that complete the migration. Doc currency is a PR
   gate per AGENTS.md; the doc updates land in this PR, not a
   follow-up.
9. **Plan Status flip — Stage 1.** Flip this plan's Status from
   `Proposed` to `In progress pending production cookie-boundary
   verification`. Leave the parent epic's M0 row as `Proposed`
   pending the post-merge verification. See "Two-Phase
   Plan-to-Landed" below.
10. **Repeat baseline validation.** `npm run lint`,
    `npm run build:web`, `npm run build:site`. All three must
    pass.
11. **Automated code-review feedback loop.** Walk the diff from
    a senior-reviewer stance. Confirm: no `apps/web/src/**`
    source file was edited; every `apps/site` dependency is
    exact-pinned; the eight new `vercel.json` rules are in
    most-specific-first order; the bare-path operator rules
    (5–6) are present and explicitly named transitional in the
    plan/docs; the placeholder page does not echo cookie values;
    no Supabase, theme, or shared-layer imports leaked into
    `apps/site`; doc updates describe the routing as
    transitional; doc updates name the M2 migration phases.
12. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    Title under 70 chars. Validation section lists the three
    build commands run; `npm test`, `npm run test:functions`,
    `npm run test:supabase` listed as not run with rationale
    "no runtime identifier, schema, or shared-test-surface
    change." UX Review section is `N/A` (no user-visible UI
    lands in this phase — the placeholder is operator-facing).
    Remaining Risk section names the post-merge cookie-boundary
    verification as the live residual gate, and explicitly
    notes the bare-path operator carve-outs (rules 5–6) as
    transitional state to be removed in M2 phase 2.5.
13. **Post-merge: production deploy.** Vercel auto-deploys both
    projects on merge to `main`. Confirm both deployments are
    green and the rewrites are active by visiting `/admin`,
    `/`, `/auth/callback?next=/admin`, `/event/madrona/game`,
    `/event/madrona/redeem`, `/event/madrona/redemptions`, and
    `/event/test-slug` on the production domain. Existing
    routes (rows 1–6 and rule 9) must behave identically to
    before; only `/event/test-slug` is the new behavior.
14. **Post-merge: cookie-boundary verification.** Execute the
    documented procedure: visit `/event/madrona/game` to trigger
    the `issue-session` edge function and set the
    `neighborly_session` cookie; navigate to `/event/test-slug`;
    confirm the placeholder reports the cookie as present.
    Capture the verification evidence (screenshot or
    curl-with-cookie-jar transcript) in the follow-up commit
    body.
15. **Plan Status flip — Stage 2.** Doc-only follow-up commit
    directly to `main`: flip this plan's Status from
    `In progress pending production cookie-boundary verification`
    to `Landed`, flip the parent epic's M0 row from `Proposed`
    to `Landed`, and paste the verification evidence
    link/transcript into the "Verification Evidence" subsection
    of this plan. No code change.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm run build:web` — pass on baseline; pass on final.
- `npm run build:site` — pass on final (does not exist on baseline).
  Wired as a dedicated `Build site app` step in
  `.github/workflows/ci.yml`'s `validate` job so the same gate runs
  in CI on every PR, not only locally.
- `npm test`, `npm run test:functions`, `npm run test:supabase` —
  intentionally not run. Rationale: this PR introduces no runtime
  identifier change, no schema change, and no shared-test-surface
  change. Listed in the PR Validation section as not run with this
  rationale.
- **Production smoke of the existing routes.** After deploy,
  confirm `/event/madrona/game`, `/event/madrona/redeem`,
  `/event/madrona/redemptions`, `/admin`, `/auth/callback?next=/admin`,
  and `/` all behave identically to today. The transitional rule 9
  fallback plus the bare-path carve-outs (rules 5–6) preserve
  existing behavior; if any of these regress, the rewrite ordering
  is wrong.
- **Production cookie-boundary verification** — **deferred to M1
  phase 1.3** per "Verification Evidence" above. The
  `neighborly_session` cookie this plan named is set on the
  Supabase Edge Function origin and never reaches the apps/web
  frontend domain, so the gate cannot pass against the existing
  code. M1 phase 1.3 introduces a frontend-origin cookie via
  Supabase Auth's cookie adapter and inherits the verification
  responsibility there.

## Two-Phase Plan-to-Landed

The cookie-boundary verification can only be executed against
production because cross-project cookie behavior under Vercel's
path-based rewrites cannot be reliably reproduced in preview deploys
(preview URLs live on per-project subdomains, not on the shared
production domain). This is exactly the kind of "the gate cannot
pass pre-merge" situation AGENTS.md and `docs/testing-tiers.md`
describe.

Following the AGENTS.md "Plan-to-PR Completion Gate" exception
pattern (originally written for production-smoke assertions but
identical in shape):

- The implementing PR merges with this plan's Status set to
  `In progress pending production cookie-boundary verification`. The
  parent epic's M0 row stays `Proposed`.
- After Vercel auto-deploys to production, execute the verification
  procedure documented in `docs/dev.md`.
- A doc-only follow-up commit (directly on `main`, no second PR
  needed for a doc-only edit) flips this plan to `Landed`, flips
  the parent epic's M0 row to `Landed`, and records the
  verification evidence in this plan's "Verification Evidence"
  subsection.

If the verification fails, the follow-up commit instead documents
the failure mode, this plan stays `In progress`, and a new plan is
opened to address the routing-model issue (proxy-rewrite limitation,
unexpected cookie-domain behavior, or whatever the failure
surfaces).

## Self-Review Audits

Named in the parent epic for phase 0.3, drawn from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **CLI / tooling pinning audit.** This PR introduces a new
  framework (Next.js) and its toolchain into the repo. Walk every
  new dependency in `apps/site/package.json` and confirm
  exact-version pins (no `^`, no `~`). Confirm Next.js, React,
  React-DOM, TypeScript, and the Next.js ESLint config are all
  pinned. Confirm `package-lock.json` is regenerated in the same
  commit. If any scaffold-time dependency was accepted with a
  caret-pinned default from `create-next-app`, fix it before
  merging.
- **Readiness-gate truthfulness audit.** The cookie-boundary
  verification is the readiness gate for this phase. Walk the
  verification procedure against "what if the real thing is
  broken?" scenarios: what if Vercel's cross-project rewrite drops
  cookies in one direction? What if the placeholder reads
  `cookies()` against a request that the rewrite stripped? What if
  `apps/site` is reachable but on a different cookie domain? The
  gate must return negative, not just pass, when these go wrong.
  Document the verification as a procedure that fails closed
  (presence-only readout that says "cookie not visible" loudly
  when missing).

General self-review (correctness, no behavior drift in `apps/web`,
no leaked imports into `apps/site`, no theme or auth wiring
smuggled in early, no premature M2 migrations) per AGENTS.md
"Self-Review Checklist" applies on top.

## Documentation Currency PR Gate

The complete list of named docs that must reflect post-scaffold
state by the time this PR opens:

- `README.md` — updated (two-app structure, transitional
  routing topology, `npm run build:site`).
- `docs/dev.md` — updated (validation commands, monorepo
  structure, Vercel two-project layout, Turbopack vs. Vite
  divergence note, cookie-boundary verification re-run procedure,
  transitional routing state with M2 migration pointers).
- `docs/architecture.md` — updated (two-app shape, transitional
  routing topology summary, M2 migration pointer).
- `docs/plans/site-scaffold-and-routing.md` — Status flipped to
  `In progress pending production cookie-boundary verification`
  in this PR; flipped to `Landed` in the post-merge doc-only
  commit.
- `docs/plans/event-platform-epic.md` — M0 row stays `Proposed`
  in this PR; flipped to `Landed` in the post-merge doc-only
  commit.

The other docs the parent epic enumerates
(`docs/operations.md`, `docs/product.md`, `docs/styling.md`,
`docs/open-questions.md`, `docs/backlog.md`, `AGENTS.md`) change
in later milestones (M1 and M2), not in 0.3.
[`docs/operations.md`](../operations.md) updates for the **final**
routing topology in M2; this phase touches it only if a contributor
following the doc would otherwise be misled about the
**transitional** state.

[`docs/open-questions.md`](../open-questions.md) is touched only
if the cookie-boundary verification surfaces an unresolved
decision; if it passes cleanly, the framework-decision-opened
questions about cookie boundary and routing model close in the
post-merge doc commit.

## Out Of Scope

Captured here so reviewer attention does not relitigate them.

- **Migration of `/`, `/auth/callback` to `apps/site`.** M2
  phase 2.3. This phase keeps both on `apps/web` via the rule 9
  fallback. Phase 0.3's job is to ensure the routing topology can
  cleanly add explicit `apps/site` rules above rule 9 in M2
  without rebuilding the rule set.
- **Migration of `/admin*` to `apps/site`.** M2 phase 2.4. Same
  reasoning as above.
- **Per-event admin route shell at `/event/:slug/admin`.** M2
  phase 2.2 adds the apps/web route. Phase 0.3 only **reserves
  the namespace** in Vercel rules so the route can be added
  later without a routing change.
- **Operator URL migration into `/event/:slug/game/*`.** M2
  phase 2.5 retires `/event/:slug/redeem` and
  `/event/:slug/redemptions` and removes the bare-path carve-out
  rules (5–6). Phase 0.3's job is to keep those routes working
  exactly as today via the bare-path carve-outs.
- **Theme wiring in `apps/site`.** `<ThemeScope>` and the
  `Theme`-typed registry land in M1 phase 1.5.
- **Supabase auth wiring in `apps/site`.** `shared/auth/`
  consumption lands in M1 phase 1.3. The cookie-boundary
  verification in this phase uses the existing `neighborly_session`
  cookie, which is **not** a Supabase auth cookie — it is the
  signed game-session cookie issued by the `issue-session` edge
  function. This phase proves only that the cookie boundary
  mechanism works; the Supabase-auth cookie migration is M1's
  job.
- **Cross-app token-refresh visibility.** Deferred to M1 phase
  1.3 for the same reason — both apps need to be doing Supabase
  auth before the refresh-visibility question is testable.
- **`EventContent` type and per-event content.** M3 phase 3.1.
- **Per-event meta tags / OG images / unfurl previews.** M3
  phase 3.4 and M4 phase 4.1.
- **Vercel Microfrontends migration.** Documented as the
  upgrade path if proxy-rewrite limitations surface; not adopted
  in this phase.
- **Primary-project ownership flip.** Whether `apps/site` takes
  over as the primary Vercel project (owning the production
  custom domain) once M2 inverts the URL ownership balance is a
  routing-config decision belonging to M2 plan authors, not this
  phase.
- **Removing or refactoring existing `apps/web` SPA rewrites.**
  The catch-all rewrites for `/admin/:path*`, `/event/:path*`,
  and `/auth/:path*` continue to exist as rule 9 fallback. M2
  phase 2.3 and 2.4 narrow them as routes migrate; full removal
  is end-of-M2 work.

## Risk Register

- **Cookie boundary fails on production.** The plan's central
  acceptance criterion. Mitigation: the two-phase Plan-to-Landed
  pattern keeps the gate honest — failure surfaces as the plan
  staying `In progress`, not silently as a merged plan that
  pretends to pass. Recovery path: open a new plan that adopts
  Vercel Microfrontends or restructures the routing model.
- **Vercel rewrite rule precedence misordered.** With eight new
  rules plus the existing fallbacks, ordering bugs become
  more likely. A catch-all event rule ordered before the more
  specific game/admin/operator rules would send those routes to
  `apps/site` and break production. Mitigation: code-review
  feedback loop step 11 explicitly walks rule precedence;
  post-merge step 13 confirms `/event/madrona/game`,
  `/event/madrona/redeem`, and `/event/madrona/redemptions` all
  still resolve to `apps/web`.
- **Bare-path operator carve-outs (rules 5–6) silently drift.**
  These rules are transitional and meant to be removed in M2
  phase 2.5. If they are not clearly named as transitional in
  this plan, in `docs/dev.md`, and in `docs/architecture.md`,
  M2 plan authors may forget to remove them. Mitigation: the
  Routing Topology table's Lifetime column names them
  transitional; the M2 phase 2.5 paragraph in the parent epic
  already names "the now-defunct `/event/:slug/redeem` and
  `/event/:slug/redemptions` carve-outs are removed."
- **Caret-pinned dependency leaks in from `create-next-app`.**
  The scaffold's defaults use caret pins. Mitigation: CLI/tooling
  pinning audit explicitly fixes this before commit; code-review
  feedback loop double-checks.
- **`npm run lint` does not pick up `apps/site`.** The root
  ESLint config has historically been list-driven (`eslint apps
  shared supabase scripts tests`) — the `apps` glob picks up
  `apps/site` automatically, but the Next.js plugin and parser
  config need to be wired so TS/TSX in `apps/site` lints under
  Next.js conventions. Mitigation: execution step 4 explicitly
  verifies lint coverage on the empty scaffold before more code
  lands.
- **Operator forgets to create the second Vercel project.**
  Without the `apps/site` Vercel project, the rewrites have
  nowhere to send traffic and `/event/test-slug` 404s.
  Mitigation: PR body names the operator step explicitly;
  post-merge step 13 catches the failure before the verification
  step.
- **Turbopack incompatibility with the Vercel build pipeline.**
  Next.js 16 defaults to Turbopack and Vercel claims first-class
  support, but production deploys may surface differences from
  local `npm run build:site`. Mitigation: post-merge step 13
  confirms the production deployment is green before trusting
  the verification step's environment.
- **Doc-only follow-up commit on `main` violates branch
  protection.** Solo-safe branch protection per `docs/dev.md`
  permits direct push to `main` for the maintainer; if branch
  protection has tightened, the doc-only flip becomes a tiny
  follow-up PR rather than a direct push. Mitigation: cosmetic
  only; either path lands the same edit.

## Backlog Impact

None. Phase 0.3 closes no backlog items, opens no new ones, and
unblocks none. Backlog impact accumulates at the M0, M1, M2, M3,
and M4 gates per the parent epic.

## Verification Evidence

Cookie-boundary verification was **not executed in this phase** and is
**deferred to M1 phase 1.3**. The plan's chosen mechanism — observing
the `neighborly_session` cookie from `apps/site` server-rendered
routes — turned out to be unworkable on inspection of the actual
code:

- [`supabase/functions/_shared/session-cookie.ts`](../../supabase/functions/_shared/session-cookie.ts)
  returns `Set-Cookie: neighborly_session=…` from the Supabase Edge
  Function origin (`<project-ref>.supabase.co`) with no `Domain`
  attribute. Browsers therefore scope the cookie to `*.supabase.co`,
  not the apps/web frontend domain.
- [`apps/web/src/lib/gameApi.ts`](../../apps/web/src/lib/gameApi.ts)
  calls the Edge Function directly at
  `${supabaseUrl}/functions/v1/issue-session`. apps/web does not
  proxy the Edge Function through its own origin and does not re-set
  the cookie on the frontend domain. The signed token is stored in
  `localStorage` and forwarded via the `x-neighborly-session` header
  on later requests — the existing fallback path that exists
  precisely because the cross-site cookie is unreliable.
- Net effect: no `neighborly_session` cookie ever exists on apps/web's
  frontend origin, so apps/site's `cookies().has("neighborly_session")`
  will return `false` regardless of whether a game was just played.
  The placeholder's readout was permanently misleading and is
  replaced in this same flip-to-Landed change with a deferral
  notice.

This is the planning-time bug the Risk Register anticipated under
"Cookie boundary fails on production" and "If the verification fails."
The chosen cookie was wrong; the boundary itself was not tested.
Rather than open a placeholder follow-up plan that would idle until
M1 phase 1.3 lands the right cookie anyway, the verification
responsibility folds directly into M1 phase 1.3 — see the parent
epic's M1 phase 1.3 paragraph, which now explicitly inherits the
gate.

The non-verification deliverables of phase 0.3 — apps/site scaffold,
build/lint gates wired into CI, transitional Vercel routing topology,
the second Vercel project — landed and were exercised. Production
smoke confirmed every URL apps/web previously served continued to
behave identically (rules 1–9 in `apps/web/vercel.json`), and
`/event/test-slug` rendered the apps/site placeholder through the
proxy (rules 7–8).

## Related Docs

- [`event-platform-epic.md`](./event-platform-epic.md) — parent
  epic; M2 phases 2.2, 2.3, 2.4, 2.5 own the routing migrations
  this phase prepares for
- [`framework-decision.md`](./framework-decision.md) — sibling
  phase 0.2 plan (already landed); Implications For Downstream
  Milestones → M0 Phase 0.3 section guides this plan's
  framework-specific choices
- [`repo-rename.md`](./repo-rename.md) — sibling phase 0.1 plan
  (already landed); runtime-identifier preservation rules govern
  the `@neighborly/site` workspace scope choice here
- [`AGENTS.md`](../../AGENTS.md) — planning depth, plan-to-PR
  gate, doc currency, validation honesty, two-phase
  Plan-to-Landed for gates that cannot pass pre-merge
- [`docs/dev.md`](../dev.md) — current contributor workflow;
  updated by this plan
- [`docs/architecture.md`](../architecture.md) — current
  single-app shape; updated by this plan to describe the
  transitional two-app shape
- [`docs/self-review-catalog.md`](../self-review-catalog.md) —
  CLI / tooling pinning audit and Readiness-gate truthfulness
  audit
- [`docs/testing-tiers.md`](../testing-tiers.md) — two-phase
  Plan-to-Landed precedent for gates that require post-deploy
  verification
