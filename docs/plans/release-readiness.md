# Release Readiness

## Document Role

This is the canonical release-readiness **methodology** for the Neighborly
Events repo. It defines how to perform a senior-engineer-grade quality
check before a release candidate is considered ready to run a real event
against real attendees, the gates that must be met, and the candidate
improvements to the methodology itself.

The pass results live in two sibling files:

- [`/docs/tracking/release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
  — the most recent quality-check pass (overwritten at each pass)
- [`/docs/tracking/release-readiness-history.md`](/docs/tracking/release-readiness-history.md)
  — the append-only archive of prior passes

This split keeps the methodology stable and short-to-read while letting
pass evidence accumulate without bloating the plan. When you change the
methodology, edit this file. When you record what happened during a pass,
edit `release-readiness-current.md`.

Use this doc when:

- a release candidate is being prepared for a named live event target (today
  that means Madrona Music in the Playfield; after that, the next organizer
  deployment)
- a change lands that touches the trust boundary, authoring path, publish
  pipeline, mobile attendee flow, or any production runtime configuration
- a contributor or agent needs to understand which release-blocking items are
  still open and where they are tracked

This doc is the release-readiness view. It is not the detail tracker for any
single dimension. Deep tracking lives in the peer docs that already own each
concern, and each section below links to the owning doc. When a new finding
maps onto an existing tracker, add it there and only reference it from here.

Owner docs this file coordinates:

- [backlog.md](/docs/backlog.md) — priority-ordered follow-up work
- [testing.md](/docs/testing.md) — test strategy, coverage snapshot, testing todo list
- [code-refactor-checklist.md](/docs/tracking/code-refactor-checklist.md) — behavior-preserving refactor tasks
- [documentation-quality-checklist.md](/docs/tracking/documentation-quality-checklist.md) — docs maintenance
- [open-questions.md](/docs/open-questions.md) — unresolved product/UX/architecture decisions
- [analytics-strategy.md](/docs/plans/analytics-strategy.md) — analytics rollout and the only current telemetry surface
- [operations.md](/docs/operations.md) — platform-managed settings and production responsibilities
- [production-admin-smoke-tracking.md](/docs/tracking/production-admin-smoke-tracking.md) — post-release smoke triage
- [dev.md](/docs/dev.md) — validation commands and local workflow source of truth
- [reward-redemption-mvp-design.md](/docs/plans/reward-redemption-mvp-design.md) — role/auth model and entitlement-redemption surface that ships in the current MVP
- [security-and-abuse-plan.md](/docs/plans/security-and-abuse-plan.md) — trust-boundary follow-ups beyond the MVP gate
- [continuous-deployment-plan.md](/docs/plans/continuous-deployment-plan.md) — release-pipeline evolution context for `release.yml` + `production-admin-smoke.yml`
- [cloud-agent-reliability-plan.md](/docs/plans/cloud-agent-reliability-plan.md) — agent-tooling reliability work that intersects PR CI evidence
- [epics/madrona-demo-build/epic.md](/docs/plans/epics/madrona-demo-build/epic.md) — current real-event work (demo-build phase: Theme registration, content authoring, end-to-end attendee journey through a stakeholder-shareable demo URL); launch readiness deferred to a far-future Madrona-launch sibling
- [epics/demo-expansion/epic.md](/docs/plans/epics/demo-expansion/epic.md) — completed M1–M3 (ThemeScope wiring, home rebuild, demo-mode auth bypass) that shipped between this doc's establishment and the next pass

## Scope And Release Target

This doc is bounded to the current MVP stage. It evaluates readiness to run the
existing experience at a real event, not readiness for a general-purpose
analytics platform, multi-tenant authoring product, or high-volume scaling
scenario.

Release-target checklist:

- the attendee mobile flow works end to end against the deployed backend
- the apps/site landing and event-detail pages, and the cross-app proxy
  rewrites in `apps/web/vercel.json` that thread `/`, `/admin`, and
  `/event/:slug` between the two Vercel projects, work end to end against
  deployed infrastructure
- organizers can author, publish, and unpublish events through the deployed
  admin surface
- the redemption MVP (volunteer redeem flow at `/event/:slug/game/redeem`,
  the queue at `/event/:slug/game/redemptions`, and the demo-mode read-only
  variants on test slugs) works against the deployed backend and is gated by
  the event-scoped roles (agent, organizer, root admin) defined in the
  reward-redemption design
- completion trust, entitlement uniqueness, redemption idempotency, role-based
  access enforcement, and publish atomicity are proven against real database
  behavior, not mocked
- demo-mode auth bypass on test-event slugs (`harvest-block-party`,
  `riverside-jam`) is enforced consistently on writes (rejected by the
  shared `evaluateDemoModeRejection` helper) and on indexing (single-catchall
  `X-Robots-Tag: noindex` covers all test-event surfaces)
- operational visibility is sufficient to notice and diagnose a failure during
  or shortly after a real event, across both Vercel projects and the expanded
  Edge Function surface
- every release-blocking open question has a decision or an explicit deferral

Out of scope for this doc:

- broad role/permission design beyond the event-scoped MVP roles already
  shipped (deferrals: analytics dashboards, cross-event comparisons,
  organizer self-service onboarding, root-admin UI)
- infrastructure-as-code settings migration (see the future option note in
  [operations.md](/docs/operations.md))
- demo-expansion epic milestones M4 (role-door redemption seeding), M5
  (configuration tour), and M6 (behind-the-scenes / polish), which are
  explicit deferrals in
  [epics/demo-expansion/epic.md](/docs/plans/epics/demo-expansion/epic.md)

## Status Snapshot

Update this section at the start of every quality check pass so the doc never
lags behind the reviewed state. This is the section the doc-currency PR gate
in [AGENTS.md](/AGENTS.md) reads first.

| Field | Value |
| --- | --- |
| Doc established | 2026-04-16 |
| Last full pass | 2026-05-04 — see [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md) |
| Last methodology refresh | 2026-05-04 — broadened to cover apps/site, cross-app rewrites, the expanded Edge Function surface (read-demo-event, generate-event-code, get-redemption-status, redeem-entitlement, reverse-entitlement-redemption), the redemption MVP, demo-mode auth bypass, and the new `release.yml` workflow |
| Current release target | Madrona Music in the Playfield (initial validation target); demo-mode bypass surfaces on test-event slugs (`harvest-block-party`, `riverside-jam`) are also in scope as platform-readiness signal |
| Current go/no-go | **no-go** as of 2026-05-04 — three gates unmet (G3, G8, G9); see [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md) for evidence |
| Blocking items summary | redemption operator path not exercised on deployed surface (G3); PR CI deno-check skips 4 of 10 Edge Functions (G8); demo-mode bypass Playwright suite not run for the release candidate (G9); see [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md) |

Each pass overwrites
[`release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
with new findings (after archiving the prior pass to
[`release-readiness-history.md`](/docs/tracking/release-readiness-history.md)),
and updates this snapshot to point at the new pass.

## How This Doc Works

This is a living doc, but its **methodology** sections (gates, dimensions,
template) are intended to evolve slowly and deliberately. Pass evidence
lives in the sibling tracking docs so this file can stay the canonical
reference.

Editing rules:

- when a quality check pass runs, update
  [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
  with the new pass's findings (overwriting the prior pass after archiving
  it), and update [Status Snapshot](#status-snapshot) here to point at the
  new pass — that is the only edit a routine pass makes to this file
- before overwriting `release-readiness-current.md`, move its existing pass
  entry verbatim to the top of
  [`release-readiness-history.md`](/docs/tracking/release-readiness-history.md)
  — the history file is append-only, never edited in place
- when a finding maps onto an existing tracker (`backlog.md`,
  `testing.md`, `code-refactor-checklist.md`, `open-questions.md`, or
  `documentation-quality-checklist.md`), add it there first, then reference
  the item from `release-readiness-current.md`; do not duplicate the
  tracking surface
- if a pass surfaces a *methodology* gap (a missing gate, a dimension that
  no longer matches the codebase, a release bar that is too loose or too
  strict), record the proposed change under
  [Methodology Roadmap](#methodology-roadmap) in this file, decide it in a
  later edit, and only then update the affected sections of the methodology
- do not mark a release gate as met on the basis of "tests pass" alone —
  confirm the target shape, coverage, or behavioral claim the gate actually
  describes, consistent with the Refactor Completion Proof and Validation
  Honesty rules in [AGENTS.md](/AGENTS.md)
- keep this doc branch-ready: if a methodology change lands partway, do
  not leave aspirational claims in the Release Gates table — finish the
  edit or revert

Cadence guidance:

- run a full pass before every release candidate that is intended to run a
  live event
- run a scoped pass on any PR that changes the trust boundary, authoring path,
  publish pipeline, mobile attendee flow, CI, migrations, or production
  platform configuration — scoped means the Methodology dimension(s) actually
  touched by the change, not the whole doc
- do not treat routine feature PRs as needing a full pass; rely on the per-PR
  validation already required by [AGENTS.md](/AGENTS.md) and
  [dev.md](/docs/dev.md)

## Release Gates

Each gate below must be met before a release candidate is considered ready
for a live event. A gate is met when the named evidence exists, not merely
when tests pass.

At the current product-lifecycle stage a "release" is a self-imposed
sanity check on the health of the implementation — there is one operator
and no external SLA — so a no-go verdict is a truthful self-report, not
an externally-enforced block. That stance does **not** lower the bar for
when a gate counts as met:

- **Gate definitions describe the evidence good looks like, not the
  evidence we have right now.** A gap that should be evidence and isn't
  yet (a missing test, a missing deployed-surface check, a missing log
  line) makes the gate **not met** for this pass — even if the work to
  close the gap is tracked in `backlog.md`. The pass entry names the
  gap, the backlog item drives the fix, and a future pass flips the
  gate to met when the evidence actually exists. Silently rescoping a
  gate to its currently-implementable subset would let unmet criteria
  pass under a quieter label.
- **Gate definitions evolve when the underlying contract changes, not
  when a pass is unable to meet them.** Methodology-level changes to a
  gate's evidence column (new tools available, deprecated scope, etc.)
  belong in the same PR that ships the underlying change, with the
  candidate tracked under [Methodology Roadmap](#methodology-roadmap)
  until that PR lands. A pass that finds a gate unmet records the gap,
  not a gate edit.

| # | Gate | Evidence required | Tracker of record |
| --- | --- | --- | --- |
| G1 | Trust-path behavior is validated against real Supabase, not mocks only | `npm run test:supabase` passes locally; pgTAP confirms entitlement uniqueness, request idempotency, verification-code stability, redemption idempotency (`redeem_entitlement` / `reverse_entitlement_redemption` RPCs), and event-scoped role helpers (`is_agent_for_event`, `is_organizer_for_event`, `is_root_admin`) | [testing.md — Trust-Path Validation Strategy](/docs/testing.md) |
| G2 | Attendee mobile flow works end to end in a real browser | `npm run test:e2e` passes and the captured mobile smoke sequence covers intro → answer → completion → direct route load on `/event/:slug/game` | [testing.md — UX And End-To-End Browser Flow](/docs/testing.md) |
| G3 | Admin authoring, publish, unpublish, and the redemption operator surfaces work against deployed production | Both phases of the `Production Deployed-Surface Smoke` workflow have passed for the release candidate commit (`npm run test:e2e:admin:production-smoke` followed by `npm run test:e2e:redemption:production-smoke` against deployed Supabase + the deployed apps/web origin, automatic on release or via `workflow_dispatch`). The admin phase exercises the cross-app `apps/web` → `apps/site` `/admin` rewrite. The redemption phase exercises the agent redeem path (`/event/:slug/game/redeem`), the organizer list/filter/sheet path (`/event/:slug/game/redemptions`), and the organizer reverse-redemption path against the dedicated production smoke event. | [production-admin-smoke-tracking.md](/docs/tracking/production-admin-smoke-tracking.md) |
| G4 | Completion, starts, and redemption instrumentation is in place for the event | `game_starts`, `game_completions`, `game_entitlements`, and the redemption columns/RPCs populate correctly in a local Supabase run; the production Supabase project has every migration through `20260427010000_broaden_event_scoped_rls.sql` applied before attendees arrive | [analytics-strategy.md — Phase 1 Implementation Plan](/docs/plans/analytics-strategy.md) and [reward-redemption-mvp-design.md](/docs/plans/reward-redemption-mvp-design.md) |
| G5 | Release-blocking open questions are either decided or explicitly deferred | Each item mirrored under the **Release-blocking open questions** subheading of the current pass entry in [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md) has a linked decision or a recorded post-event deferral, per the mirror contract in [Release-Blocking Open Questions](#release-blocking-open-questions) below; the pass also confirms that no item in [open-questions.md](/docs/open-questions.md) that should be release-blocking is missing from that mirror | [open-questions.md](/docs/open-questions.md) |
| G6 | Operational visibility is sufficient to detect a live event failure | The observability review in [3. Monitoring, Logging, And Observability](#3-monitoring-logging-and-observability) has been completed against the release candidate, including both Vercel projects (`apps/web` and `apps/site`), the cross-app rewrite path, and the expanded Edge Function surface; any resulting gaps are in `backlog.md` with a Tier 1 or Tier 2 placement or explicitly deferred | [analytics-strategy.md](/docs/plans/analytics-strategy.md) and this doc |
| G7 | Docs describe the implemented state of the release candidate | The doc currency walkthrough in [AGENTS.md — Doc Currency Is a PR Gate](/AGENTS.md) has been executed for the release branch; `README.md`, `docs/architecture.md`, `docs/dev.md`, `docs/testing.md`, `docs/operations.md`, `docs/backlog.md`, `docs/open-questions.md`, the active epic doc(s) under `docs/plans/epics/`, and `docs/plans/reward-redemption-mvp-design.md` match the shipped code | [documentation-quality-checklist.md](/docs/tracking/documentation-quality-checklist.md) |
| G8 | PR CI covers the pre-release change set at a meaningful depth | For non-doc changes, lint, unit, `npm run test:functions` (Deno runtime tests), `deno check` over every function under `supabase/functions/*/index.ts`, `npm run test:supabase` (local Supabase integration + pgTAP), attendee-trusted-backend Playwright smoke, and both web (`build:web`) and site (`build:site`) builds pass on the release candidate commit via `.github/workflows/ci.yml`; the `release.yml` workflow then promotes Supabase migrations + Vercel deploys, and `production-admin-smoke.yml` validates the deployed admin surface. The `deno check` requirement covers all functions under the directory (including `read-demo-event`, `get-redemption-status`, `redeem-entitlement`, `reverse-entitlement-redemption`), not only the ones currently named in `ci.yml`. Docs-only pull requests still produce the required CI check but intentionally short-circuit heavy validation, and markdown/docs-only commits to `main` do not trigger production release. Any intentional gap is a known item in `backlog.md` | [testing.md — Where Tests Should Run](/docs/testing.md) and [backlog.md Tier 2](/docs/backlog.md) |
| G9 | Demo-mode auth bypass on test-event slugs is consistent and contained | `npm run test:e2e:demo-mode-bypass` passes on the release candidate; the `evaluateDemoModeRejection` helper in `supabase/functions/_shared/` rejects writes on test slugs across `save-draft`, `publish-draft`, `unpublish-event`, `redeem-entitlement`, and `reverse-entitlement-redemption`; the single catchall `X-Robots-Tag: noindex, nofollow` header in `apps/web/vercel.json` covers every `/event/(harvest-block-party|riverside-jam)/:path*` route, and `apps/site` emits parallel `robots: { index: false, follow: false }` metadata on the matching routes | [test-event-noindex-uniformity-plan.md](/docs/plans/test-event-noindex-uniformity-plan.md) and [epics/demo-expansion/m3-demo-mode-auth-bypass.md](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) |

Gate status is recorded in
[`release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
at each pass. Do not edit this table when a gate is met for a single pass —
edit the pass entry instead, so the table stays a durable definition rather
than a snapshot.

## Quality Check Methodology

Each dimension below has the same shape:

- Scope: what the dimension covers and what it does not
- How to run: concrete commands and walks that produce the evidence
- Where findings live: which tracker the result belongs in
- Release bar: what must be true for this dimension to clear

Follow the dimensions in order. Later dimensions assume the earlier ones are
current.

### 1. Test Coverage

Scope:

- unit tests for the shared quiz domain and frontend seams
- integration tests for Edge Function request/response behavior and
  real-Supabase trust-path flows
- end-to-end smoke tests for the attendee mobile flow and the admin authoring
  flow, local and production
- pgTAP tests for database-level rules
- manual checks that are only worth running close to a live event (for
  example, QR code scan → published slug → completion on a real phone)

This dimension does not cover load testing, broad cross-browser matrices, or
visual regression. Those are intentionally deferred per
[testing.md — What Is Overkill Right Now](/docs/testing.md).

How to run:

1. Run `npm run validate:local` from a clean start. This is the integrated
   local gate: lint (over `apps/web`, `apps/site`, `shared`, `supabase`,
   `scripts`, `tests`), unit tests, Deno function tests over every function
   under `supabase/functions/*/`, attendee Playwright smoke, local Supabase
   integration + pgTAP, the web build, the site build (when the runner has
   been refreshed for both apps; if not, run `npm run build:site` separately),
   and `deno check` for each Edge Function.
2. Run `npm run test:e2e:admin` against the local Supabase stack to exercise
   admin auth, allowlist, draft save, publish, unpublish, and public route
   state.
3. Run `npm run test:e2e:demo-mode-bypass` to confirm the test-event admin,
   redeem, and redemptions surfaces render their read-only demo variants
   without sign-in, and that demo-mode writes are rejected by the shared
   `evaluateDemoModeRejection` helper.
4. Run `npm run test:e2e:redeem` and `npm run test:e2e:redemptions` against a
   live (non-test) event to exercise the redemption-operator path on
   `/event/:slug/game/redeem` and the volunteer queue on
   `/event/:slug/game/redemptions`, including reverse-redemption.
5. After merge and deploy, confirm both phases of the `Production
   Deployed-Surface Smoke` workflow ran successfully against the release
   commit (or trigger a `workflow_dispatch` rerun). The admin phase
   implicitly exercises the cross-app `/admin` rewrite from
   `apps/web/vercel.json` to `apps/site`; the redemption phase
   exercises the deployed redeem and redemptions operator surfaces.
   See [production-admin-smoke-tracking.md](/docs/tracking/production-admin-smoke-tracking.md).
6. Walk the [Proposed Test Inventory in testing.md](/docs/testing.md) against the
   current repo and list any item that is no longer representative of the
   shipped behavior. This is the step that catches "tests passed but coverage
   drifted" situations.
7. For any change touching the trust boundary, cross-check against the
   "What Needs Coverage → Supabase Edge Functions" and "What Needs Coverage →
   Supabase Database" sections of `testing.md` and verify each item is still
   exercised. Cover all 10 deployed Edge Functions: `issue-session`,
   `complete-game`, `save-draft`, `publish-draft`, `unpublish-event`,
   `generate-event-code`, `read-demo-event`, `get-redemption-status`,
   `redeem-entitlement`, and `reverse-entitlement-redemption`.
8. For each user-facing path in scope of the release (attendee featured flow,
   attendee spotlight wrong-answer path, direct route load, admin draft save,
   admin publish, admin unpublish, post-publish public route change,
   redemption lookup + mark-as-redeemed, reverse-redemption, and the
   demo-mode read-only variants on test slugs), record the exact manual
   confirmation — if any — that was run on real hardware against deployed
   infrastructure. Distinguish manual checks from automated coverage.

Where findings live:

- missing automated tests: add to [testing.md — Todo List](/docs/testing.md) with
  an appropriate tier, and link from [backlog.md](/docs/backlog.md) if it is
  release-blocking
- new known-flaky tests: add under
  [testing.md — Known Flaky Tests](/docs/testing.md)
- manual checks required before release: record under the **Test
  coverage** subheading of the current pass entry in
  [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md),
  noting the pass date and the hardware used

Release bar (see G1, G2, G3, G8):

- trust-path integration is clean on the release commit
- attendee mobile smoke is clean on the release commit
- admin local e2e is clean on the release commit
- admin production smoke has run against the release commit
- every release-blocking gap named in the pass is either closed or explicitly
  deferred with a Tier 1/Tier 2 entry in [backlog.md](/docs/backlog.md)

### 2. Code Documentation And Comments

Scope:

- repo-level docs in `README.md` and `docs/`
- file-level responsibility headers for large, route-level, orchestration, or
  boundary modules whose ownership is not obvious from the filename alone
- TSDoc/JSDoc or concise inline comments at shared domain, trust, persistence,
  migration, API, and workflow boundaries
- area readmes where module ownership would otherwise be non-obvious
- comments that explain non-obvious logic or constraint rules

This dimension does not require coverage metrics, blanket JSDoc on every
symbol, or a generated documentation site. The repo intentionally keeps docs
human-edited, per
[documentation-quality-checklist.md](/docs/tracking/documentation-quality-checklist.md).

The project standard is: document intent, contracts, invariants, and
non-obvious failure behavior at durable boundaries; document file
responsibility when module ownership is not obvious; do not document obvious
implementation details that names and TypeScript types already explain.

How to run:

1. Walk every trigger in
   [AGENTS.md — Doc Currency Is a PR Gate](/AGENTS.md) against the release
   branch. For each named doc, confirm it reflects the shipped state.
2. Open the top ~15 largest source files (see the size observation under
   [4. Code Cleanliness And Quality](#4-code-cleanliness-and-quality)) and
   audit file-level responsibility, public function, hook, constant, and
   type-level comments for the following:
   - large, route-level, orchestration, or boundary modules have a short
     file-level header when a reader cannot quickly infer what the file owns
     and does not own
   - exported symbols at shared domain, trust, persistence, authorization,
     idempotency, completion verification, entitlement, publish, unpublish, API
     client, or workflow boundaries have a comment or self-explanatory
     contract that names intent, invariants, and failure modes
   - non-obvious behavior (for example best-effort inserts, retry semantics,
     canonical answer shape, local prototype fallback, smoke-only fixtures, or
     magic-link redirect assumptions) is documented at its definition
   - deprecated or transitional behavior (for example the local prototype
     fallback in `apps/web/src/lib/gameApi.ts`, or the demo-mode
     read-only variants in `apps/web/src/pages/EventAdminPage.tsx`,
     `EventRedeemPage.tsx`, `EventRedemptionsPage.tsx`) is clearly labeled
   - comments do not merely restate names, types, or straightforward control
     flow
3. Confirm area readmes still describe the current module ownership for any
   area that has been restructured since the last pass. The areas worth
   checking now: `apps/web/src/game/`, `apps/web/src/admin/`,
   `apps/web/src/redemptions/` (added with the redemption MVP),
   `apps/web/src/pages/` (route-level pages including `EventRedeemPage`,
   `EventRedemptionsPage`, `EventAdminPage`, `GameRoutePage`, `GamePage`),
   `apps/site/app/`, `apps/site/components/`, `apps/site/events/`,
   `shared/game-config/`, `shared/events/`, and `supabase/functions/_shared/`
   (cross-function helpers for CORS, demo-mode rejection, and operator auth).
4. Verify `docs/open-questions.md` no longer includes questions that have been
   answered in code since the last pass, and verify newly introduced
   unresolved decisions are captured there.
5. Confirm status-oriented sections (`Current State`, `Current status`, rollout
   status, phase status) in every touched doc reflect the release-candidate
   state rather than the pre-change state.

Where findings live:

- missing inline comments: fix in the same PR that introduced the undocumented
  behavior; if discovered post-hoc, record a short item under the
  **Documentation** subheading of the current pass entry in
  [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
  and resolve it before the release candidate ships
- broad comment-coverage uncertainty: add a bounded audit item to
  [backlog.md](/docs/backlog.md) that requires a gap list and remediation plan
  before implementation
- docs drift: add to
  [documentation-quality-checklist.md](/docs/tracking/documentation-quality-checklist.md)
  under the appropriate subsection, and update any stale doc in the same PR as
  the discovering change when practical
- missing area readmes or ownership docs: add a bounded task to
  [documentation-quality-checklist.md](/docs/tracking/documentation-quality-checklist.md)

Release bar (see G7):

- every doc named under [AGENTS.md — Doc Currency Is a PR Gate](/AGENTS.md)
  that the release branch should have touched has been updated
- no new exported seam at a shared domain, trust, persistence, authorization,
  idempotency, completion verification, entitlement, API, publish, unpublish,
  or workflow boundary ships without either self-explanatory types/names or a
  short TSDoc/JSDoc/inline comment that explains its intent and failure
  behavior
- no large route-level, orchestration, or boundary module ships with ambiguous
  file ownership; if ownership is not obvious from the filename and exports, it
  has a short file-level responsibility header
- `open-questions.md` has been reviewed for newly answered or newly opened
  items

### 3. Monitoring, Logging, And Observability

Scope:

- structured logging or event emission inside Edge Functions
- browser-side error capture for the attendee and admin flows
- health and uptime signals reachable by the operator during a live event
- post-event forensic data (completions, starts, entitlements, timing)

This dimension covers what is available today and what would need to exist to
notice and diagnose a failure at a live event. It does not mandate adopting a
commercial SDK; it does require a recorded decision about what the operator
would do if a live event looked broken at minute five.

Current posture (refreshed 2026-05-04):

- there is no third-party error tracking, session replay, or product analytics
  SDK integrated into either app
- the only server-side telemetry surface is the best-effort
  `game_starts` insert from `issue-session`; completion data lives in
  `game_completions` and `game_entitlements`; redemption state lives in
  `game_entitlements` (`redeemed_at`, `redemption_code`, `redemption_notes`)
  and is mutated through `redeem-entitlement` /
  `reverse-entitlement-redemption` (RPC-wrapped, audit-row-emitting)
- demo-mode rejection on test-event slugs runs through the shared
  `evaluateDemoModeRejection` helper in `supabase/functions/_shared/`; the
  rejection currently returns a structured 403 response and does not produce
  an explicit log line
- runtime observability relies on Supabase platform logs for Edge Functions
  and Postgres, plus Vercel deployment logs for both the `apps/web` and
  `apps/site` Vercel projects (the cross-app rewrite from
  `apps/web/vercel.json` to `apps/site` adds a routing surface that can fail
  independently of either app's deploy)
- no alerting or uptime monitor is configured by the repo; the
  `Production Deployed-Surface Smoke` workflow plus `release.yml`
  post-merge promotion are the closest equivalents and run only after
  release, not continuously

How to run:

1. Review the Edge Function source under `supabase/functions/*/index.ts` and
   confirm every failure branch that matters operationally (invalid origin,
   invalid session, rejected payload, database write failure) produces either
   a distinguishable response code or a deliberate log line — not a silent
   swallow. The current code generally returns structured responses without
   logging; confirm whether that is still the intended posture.
2. Review `apps/web/src/lib/gameApi.ts`, `apps/web/src/lib/adminGameApi.ts`,
   and the redemption client surfaces under `apps/web/src/redemptions/` plus
   the redemption pages (`EventRedeemPage`, `EventRedemptionsPage`) for error
   paths reachable by real users. Confirm unexpected failures surface to the
   UI instead of being dropped, the local prototype fallback path is still
   gated on `VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK`, and demo-mode 403s from
   the backend produce a recognizable banner / read-only state rather than
   a generic error.
3. Confirm the production Supabase project has every migration through
   `20260427010000_broaden_event_scoped_rls.sql` applied before the first
   live event. The release-blocking ones are `game_starts` (start data is
   permanently unrecoverable otherwise — see
   [analytics-strategy.md](/docs/plans/analytics-strategy.md)) and the
   redemption series (`20260421000000_add_redemption_columns.sql` →
   `20260421000500_add_redemption_rls_policies.sql`), without which the
   redemption operator path cannot run.
4. Walk the operator runbook for a live event in
   [operations.md — Live Monitoring And Log Triage](/docs/operations.md#live-monitoring-and-log-triage):
   which dashboards or queries would the on-call contributor open at minute
   five if attendees reported the flow was broken? A recorded answer is the
   deliverable; absence of an answer is the finding.
5. Identify the smallest useful observability improvement that would reduce
   time-to-diagnose at a live event. Candidates worth evaluating:
   - a single structured-log line in each Edge Function error branch (across
     all 10 deployed functions, not just the original 5)
   - a browser error boundary in `apps/web/src/` and a parallel one in
     `apps/site/app/` that report unhandled React errors
   - an uptime or synthetic check for the published `/event/:slug/game` route,
     the `/event/:slug` event-detail page on `apps/site`, the `/admin`
     cross-app rewrite, and for the `issue-session` and `redeem-entitlement`
     endpoints
   - a pre-event Supabase query that confirms every required migration is
     applied (game_starts, redemption series, broaden_event_scoped_rls) and
     at least one completion + redemption can round-trip from a staging device
   - emitting a structured log line when `evaluateDemoModeRejection` rejects a
     write (today the rejection is silent on the backend, which makes
     accidental misuse on a real-event slug invisible until UI feedback)
6. Decide for the current release whether the identified improvement is a
   release-blocker, a Tier 1 item in [backlog.md](/docs/backlog.md), or an
   explicit deferral. Record that decision.

Where findings live:

- observability gaps: add a Tier 1 or Tier 2 item to
  [backlog.md](/docs/backlog.md) with a link to this doc for context
- operator runbook content: keep the durable runbook in
  [operations.md — Live Monitoring And Log Triage](/docs/operations.md#live-monitoring-and-log-triage)
  and summarize release-specific evidence under the **Monitoring,
  logging, observability** subheading of the current pass entry in
  [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
- analytics-adjacent gaps: add to
  [analytics-strategy.md](/docs/plans/analytics-strategy.md) in the relevant phase

Release bar (see G6):

- the operator knows what they would look at if a live event appeared broken
- Edge Function failure branches are either deliberately silent with a
  recorded reason or produce a diagnosable signal
- analytics-critical data that is unrecoverable after the event (starts,
  completions) is collected

### 4. Code Cleanliness And Quality

Scope:

- file size and responsibility locality
- duplicated logic across frontend and backend
- test-to-code coupling that would block future changes
- lint and type-check hygiene
- consistency with the repo's architecture guardrails in
  [AGENTS.md](/AGENTS.md) and
  [architecture.md](/docs/architecture.md)

This dimension does not try to enforce stylistic preferences beyond the repo's
existing lint and TypeScript settings.

How to run:

1. Run `npm run lint`, `npm test`, `npm run build:web`, and the Deno
   `deno check` commands from [dev.md](/docs/dev.md). A clean run is a
   precondition for the rest of this dimension.
2. Re-check the top ~15 largest `.ts`/`.tsx` source files under
   `apps/web/src/`, `apps/site/`, `shared/`, and `supabase/functions/` for
   single-responsibility issues. When this pass was last run (2026-05-04),
   the top files by size were roughly:
   - `apps/web/src/pages/EventRedemptionsPage.tsx` (733)
   - `shared/db/types.ts` (662, generated; excluded from refactor judgement)
   - `apps/site/app/(authenticated)/admin/page.tsx` (572)
   - `apps/web/src/admin/useSelectedDraft.ts` (549)
   - `supabase/functions/read-demo-event/index.ts` (494)
   - `apps/web/src/pages/EventRedeemPage.tsx` (471)
   - `apps/web/src/redemptions/RedemptionDetailSheet.tsx` (468)
   - `supabase/functions/save-draft/index.ts` (467)
   - `apps/web/src/pages/EventAdminPage.tsx` (447)
   - `apps/web/src/redemptions/useReverseRedemption.ts` (335)
   - `supabase/functions/publish-draft/index.ts` (315)
   - `apps/web/src/admin/questionStructure.ts` (310)
   - `apps/web/src/admin/AdminEventDetailsForm.tsx` (302)
   - `supabase/functions/reverse-entitlement-redemption/index.ts` (298)
   - `shared/events/admin.ts` (288)
   - `supabase/functions/redeem-entitlement/index.ts` (276)
   - `apps/web/src/game/gameSessionState.ts` (275)

   Re-collect this list at each pass (for example, `wc -l` via bash against
   the tracked source directories) because the shape changes as refactor
   items land. Treat generated files such as `shared/db/types.ts` as out
   of scope for refactor decisions but keep them visible so unexpected
   regenerated growth is noticed.
3. For each oversized file, map it against
   [code-refactor-checklist.md](/docs/tracking/code-refactor-checklist.md). If it is
   already in that checklist, do nothing. If it is a new candidate, add it
   there with the specific responsibility problem, the desired target shape,
   and the minimum validation command — following the rules in that file.
4. Walk the architecture guardrails in [AGENTS.md](/AGENTS.md) and confirm
   no guardrail has silently drifted:
   - visual and interaction logic for the attendee/admin/redemption SPA
     stays in `apps/web/src`; visual and interaction logic for the public
     landing and event-detail SSR pages stays in `apps/site/app/` and
     `apps/site/components/`
   - shared styling tokens stay in `apps/web/src/styles/_tokens.scss` and
     the parallel platform defaults in `shared/styles/themes/platform.ts`
     consumed by `apps/site`
   - quiz definitions, catalog, validation, and scoring logic stay in
     `shared/game-config`
   - test-event allowlist stays in `shared/events/` and is the single
     source of truth consumed by demo-mode rejection (`supabase/functions/_shared/demo-mode-rejection.ts`),
     `read-demo-event`, and the apps/web demo-mode UI branches
   - trust, session, persistence, entitlement, and redemption logic stay in
     `supabase/functions` (including the new `_shared/` helpers) and
     `supabase/migrations`
   - business rules are not casually duplicated across frontend and backend
     (or across `apps/web` and `apps/site`)
   - the local browser-only completion fallback is not treated as production
     backend behavior
   - cross-app routing remains expressed declaratively in `apps/web/vercel.json`
     rewrites; per-route logic that needs to live in only one app does not
     leak into the other
5. Confirm that every DB write reachable from a public or origin-gated
   endpoint has DB-level referential integrity or constraints, not only
   application-layer validation. This is the hard rule in
   [AGENTS.md — Pre-Edit Gate](/AGENTS.md).
6. Look for recent commits that fixed a bug by adding application-layer
   validation where a migration-level constraint would have been more durable.
   Flag any such case for follow-up as a schema hardening task.

Where findings live:

- file-size and split candidates: add to
  [code-refactor-checklist.md](/docs/tracking/code-refactor-checklist.md)
- architectural drift: fix in the PR that introduced it when discovered
  in-review; record a short entry under the **Cleanliness** subheading of
  the current pass entry in
  [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
  when discovered after the fact, and either resolve or open a tracker
  before the release candidate ships
- missing DB-level constraints: record in
  [backlog.md](/docs/backlog.md) under the appropriate tier; treat as
  release-blocking if the write is reachable from a public endpoint

Release bar:

- lint, unit, function tests, build, and Deno checks all clean on the release
  commit
- no new file over ~400 lines has been added without a split plan recorded in
  [code-refactor-checklist.md](/docs/tracking/code-refactor-checklist.md)
- no architectural guardrail from [AGENTS.md](/AGENTS.md) has drifted
  since the last pass
- every public-write backend endpoint is still referentially protected at the
  database level

### 5. Code Efficiency And Performance

Scope:

- browser-side rendering and network efficiency on the mobile attendee path
- Edge Function latency and dependency footprint
- database query shape and index coverage for the publish, complete, and
  analytics-adjacent surfaces
- bundle size and cold-start cost for the frontend

This dimension is intentionally scoped to the MVP: no synthetic load testing,
no profiler-driven micro-optimizations, no bundle-size regressions framework.
The goal is to catch obvious inefficiencies before a live event, not to
optimize ahead of evidence.

How to run:

1. Read `apps/web/src/lib/gameApi.ts` and `apps/web/src/game/useGameSession.ts`
   and confirm the attendee path does not do redundant network calls, stash
   duplicate state, or retain listeners that should be cleaned up between
   questions.
2. Run `npm run build:web` and `npm run build:site` and record the reported
   bundle / route-level output sizes in the current pass entry's
   **Efficiency** subheading. Flag any meaningful increase over the
   previously recorded size (compare against the most recent prior entry
   in
   [`release-readiness-history.md`](/docs/tracking/release-readiness-history.md)).
3. Spot-check Edge Function handlers in `supabase/functions/*/index.ts` for
   needless work on the hot path — for example, redundant database reads
   before a known write, or JSON parses that could be avoided on the
   unauthenticated/rejected branch. Pay particular attention to
   `read-demo-event` (unauthenticated read shim; should fail fast on
   non-allowlisted slugs), `redeem-entitlement` and
   `reverse-entitlement-redemption` (parse-then-auth ordering with the
   demo-mode 403 short-circuit must not double-parse the body), and the
   `_shared/redemption-operator-auth.ts` helper.
4. Review `supabase/migrations/` for indexes that would be touched by:
   - the funnel query in [analytics-strategy.md](/docs/plans/analytics-strategy.md)
     (starts → completions → entitlements)
   - the admin authoring path (draft read by `event_id`, publish transaction)
   - the public route lookup by `slug`
   - the redemption queue and lookup paths
     (`game_entitlements` by `event_id` plus `redemption_code` /
     `redeemed_at`, and `event_role_assignments` by `(user_id, event_id)`)
   Confirm a planned live-event traffic volume (hundreds of attendees per
   event) will not require an unindexed scan.
5. Note any non-obvious inefficiency that was observed in practice but not
   fixed in the PR that introduced it.

Where findings live:

- concrete inefficiencies: add to [backlog.md](/docs/backlog.md) if
  release-relevant, or to
  [code-refactor-checklist.md](/docs/tracking/code-refactor-checklist.md) if the fix is
  behavior-preserving and small
- bundle size observations: record under the **Efficiency** subheading of
  the current pass entry in
  [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
  with the measurement, so trend is visible across passes (the prior
  measurement is one click away in
  [`release-readiness-history.md`](/docs/tracking/release-readiness-history.md))

Release bar:

- no known inefficiency on the attendee path or on the trust-path Edge
  Functions would realistically degrade a live event at the target volume
- bundle size has not grown without a recorded reason
- database queries on the publish, complete, and public route paths are
  indexed

### 6. Open Questions

Scope:

- product, UX, trust, authoring, workflow, and operations decisions that
  materially affect release readiness
- open questions discovered during the current pass

This dimension does not try to re-decide items already answered in code or
docs.

How to run:

1. Read [open-questions.md](/docs/open-questions.md) end to end. For each entry,
   decide one of:
   - still open and not release-blocking for the current target — leave
     as-is
   - still open and release-blocking for the current target — mirror it
     into the **Release-blocking open questions** subheading of the
     current pass entry in
     [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md),
     with a link back to the canonical entry, per the contract under
     [Release-Blocking Open Questions](#release-blocking-open-questions)
     below
   - answered in code, docs, or platform configuration — remove or update the
     entry in `open-questions.md` in the same PR
2. Confirm any new unresolved decision surfaced during this pass is captured
   in `open-questions.md` before the pass closes, per
   [AGENTS.md](/AGENTS.md).
3. For each decision listed in `backlog.md` as `decision`, confirm whether it
   is expected to be decided before the release target. If yes, mirror it
   into the current pass entry under the same **Release-blocking open
   questions** subheading.

Where findings live:

- canonical tracking is [open-questions.md](/docs/open-questions.md)
- release-blocking mirror lives in the **Release-blocking open
  questions** subheading of the current pass entry in
  [`release-readiness-current.md`](/docs/tracking/release-readiness-current.md);
  the [Release-Blocking Open Questions](#release-blocking-open-questions)
  subsection in this file owns the contract, not the data

Release bar (see G5):

- every question mirrored in the current pass entry's **Release-blocking
  open questions** subheading is either decided (and linked to the
  decision) or explicitly deferred with a named owner and post-event plan

#### Release-Blocking Open Questions

This subsection owns the **contract** for how items from
[open-questions.md](/docs/open-questions.md) are mirrored as release
blockers. The actual list — which can be empty — lives in the
**Release-blocking open questions** subheading of the current pass entry
in
[`release-readiness-current.md`](/docs/tracking/release-readiness-current.md),
not here, so that data and mirror cannot drift across passes.

Mirror contract:

- only items already present in
  [open-questions.md](/docs/open-questions.md) qualify; do not invent
  new entries during a pass
- mirror the title and a link back to the canonical entry; do not
  duplicate the question body
- drop a mirrored entry when the underlying question is decided,
  answered in code, or explicitly deferred past the current release
  target
- if an entry is deferred, record the deferral decision and owner
  directly in [open-questions.md](/docs/open-questions.md); the next
  pass entry will then naturally drop the mirror

## Pass Template

Pass entries live in
[`/docs/tracking/release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
(latest only) and
[`/docs/tracking/release-readiness-history.md`](/docs/tracking/release-readiness-history.md)
(append-only archive). Use the template below to start a new pass.

Copy this template into `release-readiness-current.md` (after archiving the
prior pass to history) and fill it in as the pass progresses.

```markdown
## Pass YYYY-MM-DD

**Reviewer:** <name or agent run id>
**Release target:** <event name or "general hardening">
**Release candidate commit:** <short sha>

**Gates:**

- G1 Trust-path: <met | not met — link to evidence>
- G2 Attendee e2e: <met | not met>
- G3 Admin production smoke + redemption operator path: <met | not met>
- G4 Starts + completion + redemption instrumentation: <met | not met>
- G5 Release-blocking open questions: <met | not met>
- G6 Observability: <met | not met>
- G7 Docs currency: <met | not met>
- G8 PR CI depth: <met | not met>
- G9 Demo-mode bypass containment: <met | not met>

**Test coverage:**

- <gap or confirmation, link to tracker>

**Documentation:**

- <gap or confirmation, link to tracker>

**Monitoring, logging, observability:**

- <gap or confirmation, link to tracker>

**Cleanliness:**

- <gap or confirmation, link to tracker>

**Efficiency:**

- <measurement or concern>

**Release-blocking open questions:**

- <short reference list, linking into open-questions.md>

**Go/no-go:** <go | no-go, with a one-sentence reason>

**Follow-ups opened:**

- <link to backlog/tracker item created by this pass>
```

## Methodology Roadmap

This section tracks candidate improvements to the **methodology itself**
— missing gates, dimensions that no longer match the codebase, release
bars that are too loose or too strict. It is distinct from
per-pass findings: pass-level "this gate was not met for that release"
goes in `release-readiness-current.md`; methodology-level "this gate's
*definition* should change going forward" goes here.

Editing rules:

- a candidate enters this list when a pass surfaces a methodology gap,
  or when a contributor proposes a structural change to the gates or
  dimensions
- a candidate is resolved by editing the affected sections of this file
  and removing the entry, or by recording an explicit deferral with
  rationale
- do not let candidates linger here as soft commitments; either decide
  them in a near-term pass or close them with a written deferral

Candidates currently open:

- **G3 evidence column wording when the deployed-surface redemption
  smoke ships.** G3 today accepts redemption-side evidence as either a
  manual walk on a non-test slug or a local
  `test:e2e:redeem`/`test:e2e:redemptions` run against the same backend
  the production smoke uses. When the Tier 1 backlog item "Add
  redemption operator path to deployed-surface smoke" lands, the same
  PR should tighten G3 so deployed-smoke coverage replaces the
  manual/local fallbacks rather than sitting alongside them — the
  fallbacks exist to keep G3 reachable today, not as a permanent
  parallel evidence path.
- **Decide how cross-app routing failures count.** G6 covers both
  Vercel projects and the cross-app rewrite at the operator-runbook
  level, but no gate currently requires *automated* evidence that
  the rewrites resolve correctly post-deploy beyond what the admin
  production smoke run incidentally exercises. Decide whether to
  add a synthetic check for the apps/web → apps/site rewrites or
  treat the smoke run's incidental coverage as sufficient for the
  current MVP.
- **Decide whether M0 phase 0.3 verification questions
  (cookie/token boundary across path-routed Vercel projects) become
  release-blocking when the next real-event milestone (Madrona)
  ships sign-in-gated surfaces.** Today they are scoped to the
  event-platform epic, not the launch milestone. The Madrona launch
  epic's milestone-planning session is the right forum to decide
  this; record the outcome here when it lands.

## Related Docs

- [release-readiness-current.md](/docs/tracking/release-readiness-current.md) — the most recent pass results (overwritten at each pass)
- [release-readiness-history.md](/docs/tracking/release-readiness-history.md) — append-only archive of prior passes
- [AGENTS.md](/AGENTS.md) — agent behavior, pre-edit gate, doc currency PR gate, validation honesty rules
- [dev.md](/docs/dev.md) — contributor workflow source of truth
- [testing.md](/docs/testing.md) — test strategy, coverage snapshot, testing todo list
- [backlog.md](/docs/backlog.md) — priority-ordered follow-up across all concerns
- [open-questions.md](/docs/open-questions.md) — unresolved decisions
- [code-refactor-checklist.md](/docs/tracking/code-refactor-checklist.md) — behavior-preserving refactor candidates
- [documentation-quality-checklist.md](/docs/tracking/documentation-quality-checklist.md) — docs maintenance checklist
- [analytics-strategy.md](/docs/plans/analytics-strategy.md) — analytics and the only current telemetry surface
- [operations.md](/docs/operations.md) — platform-managed settings
- [production-admin-smoke-tracking.md](/docs/tracking/production-admin-smoke-tracking.md) — post-release smoke coverage and triage
- [reward-redemption-mvp-design.md](/docs/plans/reward-redemption-mvp-design.md) — role/auth model and entitlement-redemption surface
- [security-and-abuse-plan.md](/docs/plans/security-and-abuse-plan.md) — trust-boundary follow-ups beyond the MVP gate
- [continuous-deployment-plan.md](/docs/plans/continuous-deployment-plan.md) — release-pipeline evolution context
- [cloud-agent-reliability-plan.md](/docs/plans/cloud-agent-reliability-plan.md) — agent-tooling reliability work that intersects PR CI evidence
