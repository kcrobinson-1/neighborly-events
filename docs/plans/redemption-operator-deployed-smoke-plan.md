# Redemption Operator Deployed-Surface Smoke — Implementation Plan

## Status

Landed.

> **Post-landing note (2026-05-10).** The Supabase Edge Function CORS
> env var named `ALLOWED_ORIGINS` referenced below was renamed to
> `EXTRA_ALLOWED_ORIGINS` and made additive (unioned with the in-code
> `defaultAllowedOrigins`) in a follow-up PR. The smoke-related
> guidance below is unchanged in substance — only the env var name and
> merge semantics differ. The CORS allowlist now lives in code at
> [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts);
> operators no longer set the env var unless they have origins to
> admit beyond the canonical defaults.

Post-release `Production Deployed-Surface Smoke` run on the hot-fix
merge SHA `533a326` passed both phases (admin + redemption operator):
[run 25345598914](https://github.com/kcrobinson-1/neighborly-events/actions/runs/25345598914).
The original PR #177 merge SHA `6b449f6` smoke run
([25344866968](https://github.com/kcrobinson-1/neighborly-events/actions/runs/25344866968))
caught a fabricated `redemption_reversal_reason` column in
`assertReversalPersisted`; PR #178 corrected it to the actual
`redemption_note` column per
[`supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql`](/supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql).
The Plan-to-Landed gate's "next successful auto-run on the hot-fix
merge SHA is the Tier 5 evidence" path closed cleanly.

This is a Tier 1 follow-up from the 2026-05-04 release-readiness
pass; G3 was recorded **not met** because the deployed-surface
smoke covers admin auth → save → publish → unpublish but does not
exercise the redemption operator path. The deliberation lives in
[`docs/tracking/release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
(Pass 2026-05-04 G3 + Follow-ups); this plan owns the
implementation contract. Three contract calls confirmed
2026-05-04 by the product owner: (1) reuse the existing
`production-smoke-event` rather than introducing a separate
redemption-only event; (2) extend the existing
`smoke-admin-production` job with a sequential redemption step
rather than spinning a sibling job; (3) rename the workflow
display name from `Production Admin Smoke` to `Production
Deployed-Surface Smoke` to reflect the broader scope.

Because this plan extends Tier 5 production smoke assertions, it
follows the Plan-to-Landed two-phase gate per
[`docs/testing-tiers.md`](/docs/testing-tiers.md) "Plan-to-Landed
Gate For Plans With Post-Release Validation": the implementing
PR flips Status `Proposed` → `In progress pending prod smoke`
(canonical exact-match label), then a follow-up doc commit flips
to `Landed` after the post-release `Production Deployed-Surface
Smoke` run on the merge SHA passes, recording that run's URL in
the same commit.

## Context

Today the deployed-surface smoke (`production-admin-smoke.yml`,
runner [`scripts/testing/run-production-admin-smoke.cjs`](/scripts/testing/run-production-admin-smoke.cjs))
walks one Playwright spec
([`tests/e2e/admin-production-smoke.spec.ts`](/tests/e2e/admin-production-smoke.spec.ts))
that proves the admin allowlist, magic-link auth, save-draft,
publish-draft, and unpublish-event paths against the deployed
Supabase project + the deployed apps/web origin. The redemption
operator surfaces — `/event/:slug/game/redeem`,
`/event/:slug/game/redemptions`, and the reverse-redemption flow
inside the redemptions detail sheet — are only exercised by
on-demand local runners (`npm run test:e2e:redeem` and
`npm run test:e2e:redemptions`) against a local Supabase stack.

That gap is acceptable today because the only published events on
production are the test slugs (`harvest-block-party`,
`riverside-jam`) plus the dedicated production smoke event. It
becomes a release blocker the moment a real-event slug ships
volunteer redemption — the first such event is **Madrona Music in
the Playfield** (slug `madrona-launch-day`). At that point a
deployed-Supabase regression in `redeem-entitlement`,
`reverse-entitlement-redemption`, `get-redemption-status`, the
redemption RLS policies, the role-helper predicates
(`is_agent_for_event`, `is_organizer_for_event`,
`is_root_admin`), the apps/web operator routes, or the
cross-app rewrite landing on those routes could ship to a real
event without a deterministic post-release signal. The local
on-demand runners do not catch deployed-only regressions, and
manual operator walkthroughs against the deployed surface do not
scale across releases.

This plan adds a deployed-surface smoke phase that round-trips the
operator workflow: agent looks up an event-scoped code, marks it
redeemed, organizer opens the redemptions list, narrows via
chip + search, opens the detail sheet, reverses the redemption,
and the fixture asserts persisted state via the service-role
client. Everything runs against the deployed Supabase project +
deployed apps/web origin on the dedicated production smoke event
already maintained for the admin smoke.

## Goal

Add a redemption-operator phase to the deployed-surface smoke
that round-trips the three operator paths (lookup-and-redeem,
list-and-filter, reverse-redemption) against the production
Supabase project + deployed apps/web origin on the dedicated
production smoke event, gated to run after the admin phase passes
in the same workflow run, and re-runnable manually via
`workflow_dispatch`. Specifically:

- The existing `.github/workflows/production-admin-smoke.yml`
  workflow gains a redemption smoke step (or a sibling job in the
  same workflow file — see Contracts) that runs
  `npm run test:e2e:redemption:production-smoke` after the admin
  smoke step succeeds, with the same `production` environment
  scope and the same readiness-poll preamble.
- A new `npm run test:e2e:redemption:production-smoke` script
  runs a new runner
  `scripts/testing/run-production-redemption-smoke.cjs` that
  validates env, polls the deployed redemption routes for
  readiness, then runs Playwright against a new config
  `playwright.production-redemption-smoke.config.ts` matching a
  new spec `tests/e2e/redemption-production-smoke.spec.ts`.
- The new spec has three test cases mirroring the local
  on-demand specs without the local-only Edge Function CORS
  proxy: (1) agent redeems an event-scoped code and the
  re-redeem returns `Already redeemed`; (2) organizer loads the
  monitoring list and narrows via the Redeemed chip + suffix
  search; (3) organizer reverses a redeemed row from the detail
  sheet end-to-end. Each test asserts deployed-Supabase state
  via the service-role client.
- A new fixture
  `tests/e2e/redemption-production-smoke-fixture.ts` operates
  against the deployed Supabase project: it ensures the
  production smoke event is **published** (re-publishing via the
  service-role client because the admin phase ends with the event
  unpublished), reads the persisted `event_code`, dedupes-and-
  inserts the agent + organizer role assignments, seeds the four
  entitlements the spec needs (one for the redeem flow, three
  for the redemptions flow), and generates dedicated agent +
  organizer magic links.
- Two new dedicated production smoke identities are introduced:
  `production-smoke-redeem-agent@example.com` (event-scoped
  `agent` role, never `admin_users` allowlisted) and
  `production-smoke-redemptions-organizer@example.com` (event-
  scoped `organizer` role, never `admin_users` allowlisted). They
  remain limited to the dedicated smoke event by the role-
  assignments table and never receive `admin_users` rows.
- `docs/tracking/production-admin-smoke-tracking.md` is renamed
  or expanded to cover the redemption phase under the same
  ownership / triage / risk model. The Tier 1 backlog entry is
  removed in the same PR per the backlog convention. The
  release-readiness pass entry dated 2026-05-04 gains a brief
  amendment noting that the next pass can flip G3's redemption
  half to met via this workflow rather than via local re-runs.

After this PR merges, post-release `production-admin-smoke.yml`
runs cover both admin authoring and redemption operator paths
against the deployed surface, closing the G3 redemption gap
before Madrona Music in the Playfield ships.

## Non-Goals

This plan does NOT touch:

- **Local on-demand runners.** `npm run test:e2e:redeem` and
  `npm run test:e2e:redemptions` continue to exist and continue
  to use their existing fixtures and the local-Supabase Kong
  CORS proxies. The production smoke is additive.
- **Demo-mode bypass surfaces.** The deployed test-event slugs
  (`harvest-block-party`, `riverside-jam`) and the
  bypass-rendering paths in `EventRedeemPage` /
  `EventRedemptionsPage` are not exercised here. The G9 bypass
  contract is covered separately by the Tier 2 backlog item
  "Wire demo-mode bypass Playwright suite into PR CI".
- **Edge Function source code.** `redeem-entitlement`,
  `reverse-entitlement-redemption`, and
  `get-redemption-status` remain unchanged. The smoke validates
  their deployed wiring; it does not refactor them.
- **Redemption RLS policies and role helpers.**
  `is_agent_for_event`, `is_organizer_for_event`,
  `is_root_admin`, and the `game_entitlements` policies remain
  unchanged. The smoke validates them transitively.
- **Apps/web operator UI.** `EventRedeemPage`,
  `EventRedemptionsPage`, the redemption status badges, the
  detail sheet, and the reversal modal remain unchanged. The
  smoke asserts on the rendered selectors that already exist.
- **The role matrix beyond agent + organizer.** The smoke
  exercises one user per role on the dedicated smoke event.
  Broader matrix testing remains an `Intentionally Not Covered
  Yet` item in `docs/testing.md`.
- **Real-event-slug coverage.** The smoke only mutates the
  dedicated `production-smoke-event` slug; it never touches a
  real event row.
- **PR CI integration.** The redemption smoke runs post-release
  and on `workflow_dispatch`, never against shared production
  infrastructure from a PR. (Same scope choice as the admin
  smoke.)

## Naming

No new TypeScript types or shared identifiers. Names worth
calling out for cross-doc reference:

- **`production-smoke-redeem-agent@example.com`** — dedicated
  smoke identity for the agent role on the smoke event. Mirrors
  the local fixture's `redeem-smoke-agent@example.com` shape;
  prefixed `production-` to make GitHub-environment ownership
  explicit and avoid collision with local-fixture seeded users
  in any shared test database.
- **`production-smoke-redemptions-organizer@example.com`** —
  dedicated smoke identity for the organizer role on the smoke
  event. Same naming rationale.
- **`PRODUCTION_SMOKE_REDEEM_AGENT_EMAIL`** /
  **`PRODUCTION_SMOKE_REDEMPTIONS_ORGANIZER_EMAIL`** — optional
  GitHub-environment overrides for the two emails above.
  Defaults match the names above so a default-config GitHub
  `production` environment requires no new vars to run the
  workflow.
- **`PRODUCTION_SMOKE_REDEEM_REDIRECT_URL`** /
  **`PRODUCTION_SMOKE_REDEMPTIONS_REDIRECT_URL`** — optional
  overrides for the magic-link redirect targets. Default to
  `<PRODUCTION_SMOKE_BASE_URL>/auth/callback?next=/event/<slug>/game/redeem`
  and the redemptions equivalent when omitted.
- **`PRODUCTION_SMOKE_REDEEM_SUFFIX`,
  `PRODUCTION_SMOKE_REDEMPTIONS_REDEEMED_BY_ME_SUFFIX`,
  `..._REDEEMED_BY_OTHER_SUFFIX`,
  `..._REVERSED_BY_ME_SUFFIX`** — optional 4-digit suffix
  overrides matching the local-fixture pattern. Defaults follow
  the local fixtures (`0427`, `0701`, `0702`, `0703`).

The dedicated smoke event continues to use its existing id /
slug / event_code (`production-smoke-event` /
`production-smoke-event` / one of `SMK`/`SMA`/`SMB`/`SMC`/`SMD`
already allocated by the admin fixture). The redemption fixture
reads the persisted `event_code` and never reallocates it.

## Contracts

### Workflow shape (`.github/workflows/production-admin-smoke.yml`)

The workflow keeps its existing trigger (`workflow_dispatch` plus
post-release `workflow_run` on `Release`), its existing
`production-admin-smoke` concurrency group with
`cancel-in-progress: false`, and its existing `production`
environment scope. The redemption phase is added as a new step
in the existing `smoke-admin-production` job, sequenced after the
existing "Run production admin smoke" step. The new step:

- Re-uses the same checkout, Node setup, npm install, and
  Playwright Chromium install already in the job.
- Adds the new optional env vars listed under Naming to the job
  `env` block, each pulled from the matching `vars`/`secrets`
  entry in the `production` environment, defaulting to empty
  strings so the runner script can apply its built-in defaults
  when GitHub-environment overrides are absent.
- Runs `npm run test:e2e:redemption:production-smoke`.
- On failure, uploads
  `tmp/playwright/test-results-production-redemption-smoke` as
  a separate artifact (mirrors the existing admin artifact
  shape).

Job rename is out of scope; the existing `smoke-admin-production`
job name is retained even though it now runs both phases. The
workflow's display name (`Production Admin Smoke`) is renamed to
`Production Deployed-Surface Smoke` in the same edit so the
GitHub Actions UI labels reflect the broader scope without
breaking the existing concurrency group string. The job step
names disambiguate the two phases at the run-log level.

`Verified by:`
[`.github/workflows/production-admin-smoke.yml`](/.github/workflows/production-admin-smoke.yml)
(existing workflow shape — single job, sequenced steps,
concurrency group, env injection from `production`);
[`scripts/testing/run-production-admin-smoke.cjs`](/scripts/testing/run-production-admin-smoke.cjs)
(readiness-poll preamble pattern reused by the new runner);
[GitHub Actions docs on `workflow_run` triggers and environment
secrets](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run).

### Runner (`scripts/testing/run-production-redemption-smoke.cjs`)

Mirrors `run-production-admin-smoke.cjs` modulo the routes it
polls and the Playwright config it invokes:

- Reads `PRODUCTION_SMOKE_BASE_URL` (required), the same
  `TEST_SUPABASE_URL` /
  `TEST_SUPABASE_SERVICE_ROLE_KEY` /
  `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` already validated by
  the admin runner, plus the new redemption-specific optional
  vars.
- Defaults the redemption-specific env vars when missing so the
  runner is usable from a developer machine with the smoke
  service-role key but no GitHub environment.
- Polls `/event/<slug>/game/redeem` and
  `/event/<slug>/game/redemptions` (in addition to `/admin` and
  `/event/<slug>/game` already polled implicitly by the admin
  runner — but those run earlier in the workflow so re-polling
  them here is unnecessary; the redemption runner only polls
  the two redemption routes). Same poll cadence and timeout
  envs as the admin runner
  (`PRODUCTION_SMOKE_READY_POLL_MS` /
  `PRODUCTION_SMOKE_READY_TIMEOUT_MS`).
- Invokes `npx playwright test -c playwright.production-redemption-smoke.config.ts`.

`Verified by:`
[`scripts/testing/run-production-admin-smoke.cjs`](/scripts/testing/run-production-admin-smoke.cjs)
(reference shape: env validation, readiness polling, Playwright
launch);
[`scripts/testing/utils.cjs`](/scripts/testing/utils.cjs)
(`logStep`, `run` helpers reused).

### Playwright config (`playwright.production-redemption-smoke.config.ts`)

Mirrors `playwright.production-admin-smoke.config.ts`:

- `testDir: "./tests/e2e"`, `testMatch:
  "**/redemption-production-smoke.spec.ts"`.
- `outputDir:
  "tmp/playwright/test-results-production-redemption-smoke"`
  (matches the artifact path the workflow uploads on failure).
- `fullyParallel: false`, `workers: 1` — the spec mutates a
  single dedicated event row, so single-worker is required.
- `retries: process.env.CI ? 1 : 0` (matches admin smoke).
- `use.baseURL = process.env.PRODUCTION_SMOKE_BASE_URL`.
- One project: `mobile-chromium-redemption-production-smoke`
  using `devices["iPhone 13"]` (matches the local
  `mobile-chromium-redeem` and `mobile-chromium-redemptions`
  device profiles).
- Throws at module load if `PRODUCTION_SMOKE_BASE_URL` is
  missing (matches the admin config's pre-flight check).

### Spec (`tests/e2e/redemption-production-smoke.spec.ts`)

Three test cases inside a single `test.describe("production
redemption smoke", ...)` block. The spec adapts the two local
on-demand specs by:

- Importing fixture builders from
  `tests/e2e/redemption-production-smoke-fixture.ts` instead of
  the local-only fixtures.
- **Skipping** the Edge Function CORS proxies
  (`installRedeemFunctionProxy`,
  `installRedemptionsFunctionProxy`). Deployed Supabase emits
  `Access-Control-Allow-Credentials: true` and a specific
  `Access-Control-Allow-Origin` against the deployed apps/web
  origin via the project's `ALLOWED_ORIGINS` setting; the
  local-Supabase Kong-CORS workaround the local fixtures install
  is unnecessary on production. The deployed-CORS assumption is
  itself worth verifying as a self-review audit (see Self-Review
  Audits "Deployed CORS audit" below).
- Asserting persisted state via the same service-role-client
  helpers used by the local fixtures (re-exported from the new
  fixture), so each test ends in a deterministic
  state-readback.

Test cases:

1. **`agent redeems an event-scoped code through the deployed
   mobile operator route`** — agent magic-link sign-in, enter
   suffix, click `Redeem code`, assert `Redeemed` heading +
   service-role-asserted `redemption_status = "redeemed"` with
   `redeemed_by_role = "agent"`. Re-enter the same suffix,
   click `Redeem code`, assert `Already redeemed` heading +
   service-role-asserted `redemption_status` still
   `"redeemed"`.
2. **`organizer loads the monitoring list and narrows via chip
   plus search on the deployed surface`** — organizer
   magic-link sign-in, assert all three seeded rows render,
   toggle the `Redeemed` chip and assert the reversed row falls
   away client-side, run a suffix search and assert only one
   row remains, open the detail sheet for the surviving row,
   close it.
3. **`organizer reverses a redeemed row from the detail sheet
   end-to-end on the deployed surface`** — organizer magic-link
   sign-in, narrow via search, open detail sheet, click
   `Reverse redemption`, fill reason, confirm reversal, assert
   the in-sheet status badge flips to `Reversed` and the
   `Reverse redemption` button disappears, close, clear search,
   toggle the `By me` chip, re-open the detail sheet, assert
   the reversed state persists. Service-role assertion confirms
   `redemption_status = "unredeemed"`,
   `redemption_reversed_by_role = "organizer"`, and the reason
   string round-trips.

The spec's Playwright-selector contract (heading text, chip
labels, search-box `aria-label`, button names, dialog role)
matches the existing local specs byte-for-byte except for the
removed proxy installs; the rendered SPA is the same code on
both surfaces.

`Verified by:`
[`tests/e2e/mobile-smoke.redeem.spec.ts`](/tests/e2e/mobile-smoke.redeem.spec.ts)
(redeem-flow selectors, suffix-entry helper);
[`tests/e2e/mobile-smoke.redemptions.spec.ts`](/tests/e2e/mobile-smoke.redemptions.spec.ts)
(list/filter/sheet/reverse selectors and assertion shape);
[`apps/web/src/redeem/EventRedeemPage.tsx`](/apps/web/src/redeem/EventRedeemPage.tsx)
and
[`apps/web/src/redemptions/EventRedemptionsPage.tsx`](/apps/web/src/redemptions/EventRedemptionsPage.tsx)
(the rendered UI surface the selectors target — the spec does
not modify these files; it asserts against them).

### Fixture (`tests/e2e/redemption-production-smoke-fixture.ts`)

A single module exporting two builder functions and the
service-role assertion helpers re-exported for spec use:

- `ensureRedeemProductionSmokeFixture()` — returns
  `{ eventCode, eventId, eventSlug, magicLinkUrl, redeemSuffix,
  verificationCode }` (same shape as the local
  `RedeemFixture`).
- `ensureRedemptionsProductionSmokeFixture()` — returns
  `{ eventCode, eventId, eventSlug, magicLinkUrl,
  organizerUserId, redeemedByMe, redeemedByOther, reversedByMe }`
  (same shape as the local `RedemptionsFixture`).
- `assertRedeemOutcomePersisted(verificationCode, expected,
  eventId)` — re-exported from the local fixture or duplicated
  inline depending on the audit walk (see Risk Register
  "Fixture duplication vs. shared helper" below).

Both builders share a private `ensurePublishedSmokeEvent()`
helper that:

- Reads the `game_events` row for the smoke event id.
- Asserts the row exists and has a non-null `event_code`. If
  either is false, the fixture throws with a message pointing
  at the admin smoke as the upstream fixture-setup path. The
  admin smoke (which runs first in the workflow) creates the
  row and allocates `event_code`; the redemption fixture is
  never the first to populate the row.
- Re-publishes the row by setting `published_at = now()` if it
  is null (the admin smoke ends with `published_at = null`),
  preserving the existing `slug` and other fields. This
  re-publish runs via the service-role client and never
  through the publish-draft Edge Function — the deployed
  publish-draft path is already validated by the admin phase;
  the redemption phase just needs the event to be live, not
  to re-validate publish.
- Returns the persisted `event_code` and `slug` for use by the
  caller.

Each builder then mirrors the local fixture pattern: dedupe-
and-insert the role assignment for its dedicated smoke
identity, dedupe-and-insert its entitlement seed rows, and
generate a magic link via `auth.admin.generateLink`. The magic
link is masked into GitHub Actions logs via the existing
`maskValueForGitHubActions` pattern.

State coupling between phases: the redemption phase mutates the
same dedicated event the admin phase mutates. The admin phase
ends with `published_at = null`; the redemption phase
re-publishes it. After the redemption phase ends, the event
remains published — that's an acceptable terminal state because
the dedicated smoke event is internal-only and never user-
facing. (Re-running the admin phase later resets to unpublished
again.) This intentional state coupling is recorded in
`docs/tracking/production-admin-smoke-tracking.md` (see Doc-
currency map).

`Verified by:`
[`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts)
(reference fixture: env reads, service-role client construction,
magic-link generation + masking, role-table dedupe-and-insert
pattern);
[`tests/e2e/redeem-auth-fixture.ts`](/tests/e2e/redeem-auth-fixture.ts)
(reference fixture: agent role assignment, single entitlement
seed, redeem-outcome assertion);
[`tests/e2e/redemptions-auth-fixture.ts`](/tests/e2e/redemptions-auth-fixture.ts)
(reference fixture: organizer role assignment, three entitlement
seeds with explicit `redeemed_at` / `redemption_reversed_at`
values);
[`supabase/migrations/20260421000200_add_event_role_helpers.sql`](/supabase/migrations/20260421000200_add_event_role_helpers.sql)
(role-helper predicates the seeded role assignments must
satisfy);
[`supabase/migrations/20260421000500_add_redemption_rls_policies.sql`](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql)
(RLS policies that gate redemption read/write access; the
seeded role assignments + magic-link sign-in unlock the same
predicates the spec exercises).

### `package.json` script

Add `"test:e2e:redemption:production-smoke": "node
scripts/testing/run-production-redemption-smoke.cjs"` in the
same lexical neighborhood as the existing
`test:e2e:admin:production-smoke` entry. No new dependencies.

### Doc-currency map

- **`docs/operations.md`** — extend the post-release smoke
  paragraph (currently names admin-only smoke) to name both
  admin and redemption phases. Update the curl-based runtime-
  health snippet to include
  `${PRODUCTION_SMOKE_BASE_URL}/event/<slug>/game/redeem` and
  `…/game/redemptions` alongside the existing `/admin` and
  `/event/<slug>/game` lines. Update the GitHub `production`
  environment vars and secrets bullet to name the new optional
  vars.
- **`docs/testing.md`** — add the new script
  `npm run test:e2e:redemption:production-smoke` to the
  `release-readiness validation` command list. Add a new row to
  the Developer Test Guide table for "Production redemption
  smoke" mirroring the existing "Production admin smoke" row.
  Update the Coverage Snapshot "Covered Today" section to add
  "production redemption smoke (manual + post-release workflow)
  against dedicated smoke event + agent + organizer
  identities". Move "comprehensive production role-matrix
  testing beyond dedicated smoke users" stays under
  `Intentionally Not Covered Yet` (no edit needed).
- **`docs/tracking/production-admin-smoke-tracking.md`** — the
  doc title and most prose stay; an "Operator Phase" section is
  added covering scope, fixture identities, env vars/secrets,
  ownership, risks, and triage runbook for the redemption
  phase. Renaming the file is **out of scope** to keep diff
  noise low; the file's current name remains accurate as the
  primary tracking surface for the now-bi-phase workflow.
- **`docs/tracking/release-readiness-current.md`** — append a
  short note under the 2026-05-04 G3 entry noting that the
  redemption half is closed by this PR for future passes.
  Status flip of G3 to "met" happens in the next
  release-readiness pass that observes a green
  `production-admin-smoke.yml` run including both phases —
  not in this PR.
- **`docs/backlog.md`** — remove the Tier 1 entry "Add
  redemption operator path to deployed-surface smoke" per the
  backlog convention.
- **`docs/architecture.md`** — apps/web app-section paragraph
  already names the redemption operator routes; no edit needed.
  Cross-app rewrite section already names the deployed-surface
  smoke as the post-release validator; revise to name both
  phases.
- **`README.md`** — current implemented-slice bullet does not
  name the deployed-surface smoke; no edit needed.
- **NOT edited:**
  - **`AGENTS.md`** — no new agent rules introduced.
  - **`docs/dev.md`** — no contributor-workflow change.
  - **`docs/styling.md`, `docs/open-questions.md`,
    `docs/self-review-catalog.md`** — no surface added.
  - **`docs/plans/release-readiness.md`** — gate methodology
    unchanged; this PR exercises G3 rather than redefining it.

## Files To Touch

### New

- `docs/plans/redemption-operator-deployed-smoke-plan.md` —
  this file. Status flow: `In draft` → `Proposed` (on user
  sign-off, complete) → `In progress pending prod smoke` (in
  the implementing PR) → `Landed` (in the follow-up doc
  commit on `main` after the post-release smoke run on the
  merge SHA passes both phases).
- `tests/e2e/redemption-production-smoke.spec.ts` — three test
  cases per Contracts above.
- `tests/e2e/redemption-production-smoke-fixture.ts` — the two
  builder functions, the shared `ensurePublishedSmokeEvent`
  helper, the service-role assertion helpers.
- `playwright.production-redemption-smoke.config.ts` — config
  per Contracts.
- `scripts/testing/run-production-redemption-smoke.cjs` —
  runner per Contracts.

### Modify

- `.github/workflows/production-admin-smoke.yml` — add
  redemption smoke step + new env injections + new artifact
  upload; rename workflow `name:` from `Production Admin
  Smoke` to `Production Deployed-Surface Smoke`. Concurrency
  group string and job name unchanged.
- `scripts/release/post-merge-smoke-watch.cjs` — update the
  `STAGES[2].workflowName` string from `"Production Admin
  Smoke"` to `"Production Deployed-Surface Smoke"` to match
  the renamed workflow. The watcher matches `gh run` records
  by exact-string equality with `run.workflowName`, so the
  rename and the watcher edit MUST land in the same commit
  to avoid a silent watcher break on the next post-merge run.
- `package.json` — add the
  `test:e2e:redemption:production-smoke` script.
- `docs/operations.md` — extend the post-release smoke
  paragraph + curl snippet + production-environment vars/
  secrets bullet per doc-currency map.
- `docs/testing.md` — add the new script to the validation
  command list, add a Developer Test Guide row, update the
  Coverage Snapshot.
- `docs/tracking/production-admin-smoke-tracking.md` — append
  the Operator Phase section.
- `docs/tracking/release-readiness-current.md` — append the
  short note under the 2026-05-04 G3 entry.
- `docs/backlog.md` — remove the Tier 1 entry per the backlog
  convention.

### Intentionally not touched

Per the Non-Goals + Contracts above:

- `tests/e2e/redeem-auth-fixture.ts`,
  `tests/e2e/redemptions-auth-fixture.ts` — local on-demand
  fixtures unchanged. The new production fixture stands alone;
  cross-fixture shared-helper extraction is deferred (see Risk
  Register "Fixture duplication vs. shared helper").
- `tests/e2e/admin-auth-fixture.ts`,
  `tests/e2e/admin-production-smoke.spec.ts`,
  `playwright.production-admin-smoke.config.ts`,
  `scripts/testing/run-production-admin-smoke.cjs` — admin
  smoke artifacts unchanged.
- `apps/web/src/redeem/EventRedeemPage.tsx`,
  `apps/web/src/redemptions/EventRedemptionsPage.tsx`,
  `apps/web/src/redeem/DemoModeRedeemView.tsx`,
  `apps/web/src/redemptions/DemoModeRedemptionsView.tsx` —
  rendered surfaces the spec asserts against; no UI changes.
- `supabase/functions/redeem-entitlement/`,
  `supabase/functions/reverse-entitlement-redemption/`,
  `supabase/functions/get-redemption-status/` — Edge Function
  source unchanged.
- `supabase/migrations/20260421000200_add_event_role_helpers.sql`,
  `supabase/migrations/20260421000500_add_redemption_rls_policies.sql`,
  `supabase/migrations/20260427010000_broaden_event_scoped_rls.sql`
  — RLS / role-helper migrations unchanged.
- `playwright.redeem.config.ts`,
  `playwright.redemptions.config.ts`,
  `tests/e2e/mobile-smoke.redeem.spec.ts`,
  `tests/e2e/mobile-smoke.redemptions.spec.ts` — local on-
  demand artifacts unchanged.
- `apps/web/vercel.json`, `apps/site/next.config.ts` —
  cross-app rewrite unchanged.
- `.github/workflows/ci.yml`, `.github/workflows/release.yml`
  — workflows unchanged.
- `docs/plans/release-readiness.md`,
  `docs/plans/planning-doc-location.md`,
  `docs/plans/event-platform-epic.md` — plan docs unchanged.
- `AGENTS.md` — no new rules.
- `docs/architecture.md` redemption-routes prose, `README.md`
  implemented-slice bullet — already accurate.

## Execution Steps

1. **Add the new fixture
   `tests/e2e/redemption-production-smoke-fixture.ts`** —
   `ensureRedeemProductionSmokeFixture`,
   `ensureRedemptionsProductionSmokeFixture`, the shared
   `ensurePublishedSmokeEvent` helper, and the assertion
   helpers per Contracts. Reference the local fixtures for the
   role-assignment dedupe pattern, entitlement-seed pattern,
   magic-link generation, and GitHub Actions masking.
2. **Add the new spec
   `tests/e2e/redemption-production-smoke.spec.ts`** — three
   test cases per Contracts above. Verify selector parity with
   the local specs by diffing the new spec against
   `mobile-smoke.redeem.spec.ts` and
   `mobile-smoke.redemptions.spec.ts`; the only intentional
   differences are the fixture import path and the absence of
   `installRedeemFunctionProxy` /
   `installRedemptionsFunctionProxy` calls.
3. **Add `playwright.production-redemption-smoke.config.ts`**
   per Contracts.
4. **Add `scripts/testing/run-production-redemption-smoke.cjs`**
   per Contracts. Verify against the admin runner that the env
   validation, readiness-poll loop, and Playwright invocation
   shapes match.
5. **Add the
   `test:e2e:redemption:production-smoke` script to
   `package.json`.**
6. **Extend `.github/workflows/production-admin-smoke.yml`** —
   rename the workflow, add the redemption step, add the new
   env injections, add the new artifact upload step. Run
   `actionlint` (if configured locally) or paste-validate the
   YAML against GitHub's workflow schema. Verify the
   concurrency-group string, job name, and existing admin step
   are preserved unchanged.
7. **Run local fixture-sanity checks** — `npm run test:e2e:redeem`
   and `npm run test:e2e:redemptions` against local Supabase
   to confirm the rendered apps/web surfaces still match the
   selector contract the new production spec inherits. Skip if
   no apps/web changes have landed since the last green run.
8. **Run the doc-currency edits** — `docs/operations.md`,
   `docs/testing.md`,
   `docs/tracking/production-admin-smoke-tracking.md`,
   `docs/tracking/release-readiness-current.md`,
   `docs/backlog.md`. Re-read each paragraph in context to
   confirm the bi-phase framing reads accurately.
9. **Flip this plan's Status `Proposed` → `In progress pending
   prod smoke`** as part of the implementing PR's doc commit
   (the canonical Tier 5 Plan-to-Landed label per
   `docs/testing-tiers.md`).
10. **Open the PR.** Per the Plan-to-PR Completion Gate, the
    PR body walks every Goal/Contract/Validation entry to
    satisfied-or-deferred-or-pending-prod-smoke and bans
    soft-commitment language. The Validation section attaches
    the Tier 1–3 outputs and explicitly names Tier 5 as the
    post-release gate, not a pre-merge requirement.
11. **Post-merge: capture the Tier 5 run URL** via
    `npm run release:watch-smoke -- <merge-sha>` per
    `docs/dev.md` "Watching The Post-Merge Chain." The watcher
    reports the `Production Deployed-Surface Smoke` run URL on
    the merge SHA. If both phases pass, proceed to step 12. If
    either phase fails, file a hot-fix PR; the plan stays
    `In progress pending prod smoke` until a clean post-merge
    run lands.
12. **Follow-up doc commit on `main`** — flip this plan's
    Status `In progress pending prod smoke` → `Landed`,
    record the captured run URL in the same commit, and land
    the `docs/tracking/release-readiness-current.md` next-pass
    note that observes the green bi-phase smoke run as G3's
    redemption-half evidence. Per `docs/testing-tiers.md`, the
    `Landed` flip lives in the follow-up doc commit, not in
    an issue or unwritten agreement.

## Commit Boundaries

Three commits across two PRs (the implementing PR and the
follow-up doc commit per the Plan-to-Landed gate):

**Implementing PR:**

1. **`test(e2e): add redemption operator phase to deployed-surface smoke`**
   — fixture + spec + Playwright config + runner +
   `package.json` script + workflow extension. The workflow
   `name:` rename and the matching
   `scripts/release/post-merge-smoke-watch.cjs` `STAGES[2]`
   string update ride together in this commit because they
   must land atomically: a workflow rename without the
   watcher edit silently breaks `release:watch-smoke` on the
   next post-merge run.
2. **`docs: cover redemption operator phase under deployed-surface smoke`**
   — operations.md, testing.md (including the workflow-name
   audit's string updates),
   production-admin-smoke-tracking.md, backlog.md, this
   plan's Status flip from `Proposed` to `In progress
   pending prod smoke`.

**Follow-up doc commit on `main` (post-release):**

3. **`docs: land redemption operator deployed-surface smoke plan and record run URL`**
   — this plan's Status flips from `In progress pending
   prod smoke` to `Landed` with the captured run URL;
   `docs/tracking/release-readiness-current.md` next-pass
   note appended naming the green bi-phase smoke run as
   G3's redemption-half evidence.

## Validation Gate

This plan follows the Plan-to-Landed two-phase gate per
[`docs/testing-tiers.md`](/docs/testing-tiers.md). Pre-merge
validation is Tiers 1–4; Tier 5 production smoke is the post-
release gate that promotes the plan from `In progress pending
prod smoke` to `Landed`. Production smoke env vars (notably
`PRODUCTION_SMOKE_*` and the smoke service-role key) live in
the GitHub `production` environment and are NOT required on
contributor laptops; Tier 5 testing-tiers Anti-Patterns name
this explicitly.

**Pre-merge gate — Tiers 1–4:**

- `npm run lint` — passes.
- `npm run build:web` — passes (no apps/web source changes;
  Vite build is unaffected).
- `npm run build:site` — passes (no apps/site source changes).
- `npm run test` — passes (no shared/unit test changes; the new
  tests are Playwright e2e and run via their own command).
- **Local on-demand redemption fixture sanity** — run
  `npm run test:e2e:redeem` and `npm run test:e2e:redemptions`
  against a local Supabase stack (Tier 2). The new production
  spec selectors should be byte-equivalent to the local specs
  except for the proxy-install absence; running the local
  specs catches selector regressions in the rendered apps/web
  surfaces the production spec asserts against. The local
  specs are not changed by this PR; this is a confidence-only
  re-run to verify the SPA still matches the spec selector
  contract.
- **Tier 3 CI on PR** — `.github/workflows/ci.yml` passes,
  including its `npm run test:supabase`, attendee trusted-
  backend Playwright, and existing `deno check` coverage. The
  new production-smoke artifacts are not exercised by Tier 3
  (CI does not run the new script and does not type-check the
  new spec via Tier 3 today; that gap is consistent with the
  existing `mobile-smoke.redeem.spec.ts` and
  `mobile-smoke.redemptions.spec.ts` posture and is recorded
  as a known limit, not closed by this plan).
- **Tier 4 UI review** — N/A. This plan adds tests + workflow +
  fixture + docs; it does not modify rendered UI. The PR body
  notes the N/A explicitly.

**Plan-to-Landed gate — Tier 5 post-release:**

- The auto-triggered `production-admin-smoke.yml` run on the
  merge SHA must succeed for both phases (admin + redemption)
  end-to-end. Capture via
  `npm run release:watch-smoke -- <merge-sha>` per
  [`docs/dev.md`](/docs/dev.md) "Watching The Post-Merge
  Chain"; the captured run URL is the Tier 5 evidence
  recorded in the follow-up doc commit that flips this plan
  to `Landed`.
- If the auto-run fails on either phase, the plan stays
  `In progress pending prod smoke` and a hot-fix PR addresses
  the failure. The next successful auto-run on the hot-fix
  merge SHA is the Tier 5 evidence.

**Manual-verify checklist (release/ops owner, post-release):**

- **Observe the post-merge `Production Deployed-Surface Smoke`
  run** via `release:watch-smoke` and confirm both phase
  steps log green. The release/ops owner has the
  `production`-environment access required to triage failures
  per `docs/tracking/production-admin-smoke-tracking.md`'s
  failure-triage runbook (which the implementing PR extends to
  cover the redemption phase).
- **Spot-check the dedicated smoke event state** after the
  run via service-role read against `game_events` and
  `game_entitlements` rows for the smoke event id. The
  redemption fixture leaves the event published with
  redeemed-then-reversed entitlement rows; the admin smoke
  alone left it unpublished. Either terminal state is
  acceptable for the dedicated smoke event; the spot-check
  exists to confirm the run mutated only the smoke fixture
  rows.

## Self-Review Audits

Run before opening the PR:

- **Deployed CORS audit.** Verify by reading
  `supabase/functions/_shared/cors.ts` (or the equivalent
  per-function CORS construction code) and the deployed
  Supabase project's `ALLOWED_ORIGINS` setting per
  `docs/operations.md` that the deployed Edge Functions
  (`redeem-entitlement`, `reverse-entitlement-redemption`)
  emit CORS headers compatible with credentialed Chromium
  fetches from the deployed apps/web origin:
  `Access-Control-Allow-Credentials: true` and a non-wildcard
  `Access-Control-Allow-Origin`. The local fixtures install
  proxies precisely because the local Kong stack does not. If
  the source-level audit shows wildcard CORS or missing
  Allow-Credentials, the implementing PR adds a Playwright
  `page.route` proxy to the production fixture mirroring the
  local proxies before the post-merge smoke runs. Falsifier:
  the source-level reading shows wildcard CORS, missing
  Allow-Credentials, or a configurable that depends on a
  deployed-environment variable the audit cannot verify from
  the repo. The Tier 5 post-release run is the observation
  that confirms the audit's source-level reading translates to
  deployed behavior.
- **Fixture-state-coupling audit.** Verify that the redemption
  fixture's `ensurePublishedSmokeEvent` re-publish does not
  collide with a concurrent admin smoke run on the same event.
  The workflow's `concurrency: production-admin-smoke
  cancel-in-progress: false` enforces serialization within the
  GitHub Actions environment, but a contributor running the
  local invocation while a workflow run is in-flight could
  race. The admin smoke's `ensureAdminE2eFixture` resets
  `published_at = null` at start; if the redemption fixture
  ran while the admin spec was mid-publish, the read-back
  could observe a transient state. Falsifier: a documented
  scenario where the two fixtures interleave produces a wrong
  assertion. Mitigation: documented in the Operator Phase
  section of `production-admin-smoke-tracking.md` —
  contributors must not run the local redemption smoke
  invocation while a workflow run is in-flight.
- **Magic-link masking audit.** Verify that both the agent and
  organizer magic links are masked into GitHub Actions logs
  via `::add-mask::` before the spec uses them. The local
  fixtures already mask; the new fixture must too. Falsifier:
  a workflow run log dump containing an unmasked
  `?token_hash=...` magic-link query string.
- **Role-assignment scope audit.** Verify that the agent and
  organizer dedicated smoke identities never receive
  `admin_users` rows. They have event-scoped roles via
  `event_role_assignments`, not global admin via
  `admin_users`. The smoke event is the only event where
  these identities have any privileges. Falsifier: a
  service-role read of `admin_users` showing the agent or
  organizer email.
- **Spec-selector parity audit.** Diff the new spec against
  `mobile-smoke.redeem.spec.ts` and
  `mobile-smoke.redemptions.spec.ts`. Confirm the only
  intentional differences are (a) the fixture import path,
  (b) the absence of `installRedeemFunctionProxy` /
  `installRedemptionsFunctionProxy` calls, and (c) any
  test-name prefixing for production-smoke clarity.
  Selector text, role labels, dialog assertions, and
  service-role read-back assertions must be byte-equivalent
  modulo those three differences. Falsifier: a third
  intentional divergence not captured in the audit walk
  (e.g., a different chip name) that signals UI drift the
  local specs missed.
- **Workflow-name audit.** Renaming `name: Production Admin
  Smoke` to `Production Deployed-Surface Smoke` has one
  known consumer that matches by exact-string equality:
  `scripts/release/post-merge-smoke-watch.cjs` `STAGES[2]`,
  which the implementing PR updates in the same commit (see
  Files To Touch / Modify). The audit walks the rest:
  - `gh run list --workflow="Production Admin Smoke"` style
    invocations in `docs/operations.md`,
    `docs/tracking/production-admin-smoke-tracking.md`,
    `docs/dev.md`, and any other doc — grep all
    `docs/**/*.md` and `scripts/**/*` for the literal
    `"Production Admin Smoke"` string before merge; rewrite
    each to `"Production Deployed-Surface Smoke"` (or to
    `--workflow=production-admin-smoke.yml` for any
    invocations that prefer the file-path keyer, which is
    rename-stable).
  - The post-release `workflow_run` trigger in this
    workflow file keys on the `Release` workflow's name,
    not on this workflow's name, so the trigger is
    unaffected.
  - Concurrency group string (`production-admin-smoke`) is
    unchanged so in-flight run cancellation behavior is
    unaffected.
  - GitHub badges or external links pointing to this
    workflow path resolve by file path, not display name,
    so they are unaffected.
  Falsifier: the pre-merge grep finds a literal
  `"Production Admin Smoke"` reference outside this audit's
  named consumers that the implementing PR has not updated.

## Documentation Currency PR Gate

Per AGENTS.md "Plan-to-PR Completion Gate" and the Plan-to-
Landed two-phase gate per
[`docs/testing-tiers.md`](/docs/testing-tiers.md), this
section names what the implementing PR and the follow-up doc
commit each land. Items are listed in their pre-edit state;
each line names the edit that makes the line satisfied and
which commit (implementing PR vs. follow-up doc commit)
performs that edit. No item is asserted satisfied until its
edit is in tree.

**Edited in the implementing PR:**

- **`docs/operations.md`** — post-release smoke paragraph +
  curl snippet + production-environment vars/secrets bullet
  revised per the doc-currency map; references to "Production
  Admin Smoke" updated to "Production Deployed-Surface Smoke"
  per the workflow-name audit. Satisfied by the implementing
  PR.
- **`docs/testing.md`** — new
  `npm run test:e2e:redemption:production-smoke` script added
  to the validation command list; Developer Test Guide row
  added; Coverage Snapshot updated. Satisfied by the
  implementing PR.
- **`docs/tracking/production-admin-smoke-tracking.md`** —
  Operator Phase section appended; "Production Admin Smoke"
  string references updated to "Production Deployed-Surface
  Smoke" per the workflow-name audit. Satisfied by the
  implementing PR.
- **`docs/backlog.md`** — Tier 1 entry "Add redemption
  operator path to deployed-surface smoke" removed per the
  backlog convention. Satisfied by the implementing PR.
- **`docs/plans/redemption-operator-deployed-smoke-plan.md`**
  (this file) — Status flipped `Proposed` → `In progress
  pending prod smoke`. Satisfied by the implementing PR; the
  `Landed` flip is the follow-up doc commit's responsibility,
  not the implementing PR's.

**Edited in the follow-up doc commit (post-release):**

- **`docs/plans/redemption-operator-deployed-smoke-plan.md`**
  (this file) — Status flipped `In progress pending prod
  smoke` → `Landed`; the post-release `Production
  Deployed-Surface Smoke` run URL captured via
  `npm run release:watch-smoke -- <merge-sha>` is recorded
  in the same commit. Satisfied by the follow-up doc commit
  only after the post-release run on the merge SHA passes
  both phases.
- **`docs/tracking/release-readiness-current.md`** — note
  appended under the 2026-05-04 G3 entry that the redemption
  half is now closed by an observed green bi-phase smoke
  run, with the run URL referenced. Satisfied by the
  follow-up doc commit.

**NOT edited (intentional, in either commit):** `AGENTS.md`,
`docs/dev.md`, `docs/architecture.md`, `docs/styling.md`,
`docs/open-questions.md`, `docs/self-review-catalog.md`,
`README.md`, `docs/product.md`,
`docs/plans/release-readiness.md`,
`docs/plans/planning-doc-location.md`,
`docs/plans/event-platform-epic.md`,
`docs/plans/cloud-agent-reliability-plan.md`,
`docs/testing-tiers.md` (already accurately covers the gate
this plan invokes).

## Out Of Scope

- **Real-event-slug coverage.** The smoke runs only against the
  dedicated `production-smoke-event` slug. Madrona Music in the
  Playfield (`madrona-launch-day`) and any future real event
  slug remain out of scope — adding them would mutate
  organizer-owned event data, which the smoke fixture
  ownership model explicitly forbids. Real-event observability
  is covered by the operations runbook + Supabase logs, not by
  the smoke.
- **Demo-mode bypass coverage.** The Tier 2 backlog item "Wire
  demo-mode bypass Playwright suite into PR CI" handles G9 on
  the test-event slugs (`harvest-block-party`,
  `riverside-jam`). This plan does not exercise the bypass
  paths.
- **Role-matrix expansion.** Smoke covers one agent + one
  organizer + one root_admin (transitively, via the admin
  phase). Multi-user or denied-role cases stay
  `Intentionally Not Covered Yet` per `docs/testing.md`.
- **Auto-issue routing on smoke failure.** The existing admin-
  smoke residual-backlog item (auto-open issue or alert routing
  on smoke failure) covers both phases when it lands. No
  separate item needed.
- **Cross-browser matrix.** Mobile Chromium only, matching the
  admin smoke and local fixtures.
- **Visual snapshot baselines.** Selector-based assertions only,
  matching the admin smoke.
- **Migrating the local on-demand fixtures to share a base
  helper with the production fixture.** A code-DRY refactor is
  conceivable (the role-assignment dedupe + magic-link
  generation + masking helpers are repeated across the four
  fixtures), but it lands as its own follow-up if and when the
  duplication becomes a maintenance pain. See Risk Register
  "Fixture duplication vs. shared helper".
- **Renaming `production-admin-smoke-tracking.md` → broader
  name.** Diff noise without value. The doc title prose is
  revised; the file name stays.

## Risk Register

- **Deployed CORS does not match the local fixture's
  proxy-skip assumption.** If the deployed Edge Functions emit
  wildcard CORS or omit `Allow-Credentials`, the spec's bare
  `fetch` calls fail Chromium's credentialed-CORS check and
  the smoke fails on arrival in the post-merge run.
  **Mitigation:** the source-level Deployed CORS audit in
  Self-Review Audits reads the Edge Functions' shared CORS
  helper and the operations doc's `ALLOWED_ORIGINS` setting
  before merge; if the source reading flags risk, the
  implementing PR adds a Playwright `page.route` proxy to the
  production fixture mirroring the local proxies before
  merging, and the plan's Contracts update accordingly. The
  post-merge auto-triggered run is the first end-to-end
  observation; failure routes to a hot-fix PR per the
  Plan-to-Landed gate. Falsifier: the source audit observes
  wildcard CORS or missing Allow-Credentials, OR the post-
  merge run fails with a CORS error in the spec's network
  trace.
- **Fixture-state coupling between admin and redemption
  phases produces flakes.** The admin phase ends with
  `published_at = null`; the redemption phase re-publishes.
  A misordered run, a partial admin failure, or concurrent
  contributor invocations could observe transient state.
  **Mitigation:** workflow concurrency lock serializes runs;
  the redemption fixture's `ensurePublishedSmokeEvent` is
  idempotent (re-publish only if null); contributor docs
  warn against local invocations while a workflow run is
  in-flight. Falsifier: a documented run produces a transient-
  state assertion failure.
- **Magic-link leakage in workflow logs.** Two new magic
  links per run; one missing mask call exposes a one-time
  auth token in public log output. **Mitigation:** mask
  audit in Self-Review Audits; both fixtures share the same
  `maskValueForGitHubActions` helper used by the admin
  fixture (proven shape). Falsifier: a log dump reveals a
  `?token_hash=` query string.
- **Fixture duplication vs. shared helper.** The role-
  assignment dedupe + magic-link generation + masking
  pattern is now repeated across four fixtures (admin,
  local-redeem, local-redemptions, production-redemption).
  Extracting a shared helper risks coupling the on-demand
  local path to the production-smoke path; not extracting
  risks future drift. **Mitigation:** keep them separate for
  now; revisit when the next fixture is added (the shape will
  be more obvious then). The production fixture is the sole
  new file in this PR; existing fixtures are unchanged.
  Falsifier: a future fixture-shape change requires
  parallel edits across all four fixtures.
- **Workflow rename breaks something.** The workflow display
  name change `Production Admin Smoke` → `Production
  Deployed-Surface Smoke` is a known break for
  `scripts/release/post-merge-smoke-watch.cjs` (`STAGES[2]`
  matches `gh run` records by exact-string `workflowName`
  equality), addressed by editing the script in the same
  commit. The Self-Review "Workflow-name audit" above walks
  every other potential consumer (docs, scripts, badges,
  the `workflow_run` trigger, the concurrency group). The
  `workflow_run` trigger keys on `Release`, not this
  workflow's name; concurrency group string is unchanged;
  GitHub badges resolve by file path. **Mitigation:** the
  pre-merge grep audit catches any string-keyed consumer
  the watcher edit doesn't already cover. Falsifier: a
  post-merge run completes successfully but
  `release:watch-smoke` reports the smoke stage as
  unmatched / waiting indefinitely. If triggered, drop the
  rename and revert the watcher edit; the workflow is
  functional under either name and the rename is
  cosmetic.
- **GitHub `production` environment vars/secrets drift.**
  The new optional vars + the assumed-existing
  service-role key must be present in the GitHub
  `production` environment for the workflow to succeed.
  **Mitigation:** the runner script defaults the optional
  vars to placeholder strings that the fixture interprets;
  the service-role key is already required for the admin
  phase, so no new secret is needed. The implementing PR
  pings the operations owner to confirm the agent and
  organizer email vars are either set or left to default.
  Falsifier: the post-merge auto-run fails with "Missing
  required environment variable" on a redemption-specific
  var.

## Backlog Impact

**Items closed by this PR:**

- The Tier 1 `dev` entry "Add redemption operator path to
  deployed-surface smoke" in `docs/backlog.md` is removed per
  the backlog convention.
- G3 of the next release-readiness pass can flip the
  redemption half to met.

**Items unblocked by this PR:**

- **Madrona Music in the Playfield ship readiness.** The
  release-readiness gate methodology lists G3 as a release-
  blocking gate; closing the redemption half on the deployed
  surface clears the last redemption-specific G3 blocker for
  the first event that ships volunteer redemption.

**Items added by this PR for post-PR work:**

- **Auto-issue routing on smoke failure** (already a residual
  in `production-admin-smoke-tracking.md`; now applies to
  both phases, not just admin). No new backlog entry needed
  — the existing residual covers both.
- **Cross-fixture shared-helper refactor** (deferred per the
  Risk Register entry; not added to backlog yet because the
  duplication is not painful enough to justify a tracked
  item; revisit when the next fixture is added).

## Related Docs

- [`docs/backlog.md`](/docs/backlog.md) — Tier 1 entry
  closed by this PR.
- [`docs/tracking/release-readiness-current.md`](/docs/tracking/release-readiness-current.md)
  — Pass 2026-05-04 G3 entry that drives this plan; next pass
  flips redemption half to met.
- [`docs/tracking/production-admin-smoke-tracking.md`](/docs/tracking/production-admin-smoke-tracking.md)
  — primary tracking surface for the now-bi-phase workflow;
  Operator Phase section appended.
- [`.github/workflows/production-admin-smoke.yml`](/.github/workflows/production-admin-smoke.yml)
  — workflow extended with the redemption phase.
- [`scripts/testing/run-production-admin-smoke.cjs`](/scripts/testing/run-production-admin-smoke.cjs)
  — reference shape for the new redemption runner.
- [`tests/e2e/admin-auth-fixture.ts`](/tests/e2e/admin-auth-fixture.ts),
  [`tests/e2e/redeem-auth-fixture.ts`](/tests/e2e/redeem-auth-fixture.ts),
  [`tests/e2e/redemptions-auth-fixture.ts`](/tests/e2e/redemptions-auth-fixture.ts)
  — reference fixtures the new production fixture mirrors.
- [`tests/e2e/admin-production-smoke.spec.ts`](/tests/e2e/admin-production-smoke.spec.ts),
  [`tests/e2e/mobile-smoke.redeem.spec.ts`](/tests/e2e/mobile-smoke.redeem.spec.ts),
  [`tests/e2e/mobile-smoke.redemptions.spec.ts`](/tests/e2e/mobile-smoke.redemptions.spec.ts)
  — reference specs the new production spec adapts.
- [`supabase/migrations/20260421000200_add_event_role_helpers.sql`](/supabase/migrations/20260421000200_add_event_role_helpers.sql),
  [`supabase/migrations/20260421000500_add_redemption_rls_policies.sql`](/supabase/migrations/20260421000500_add_redemption_rls_policies.sql)
  — role-helper predicates + redemption RLS policies the smoke
  validates transitively.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) — Tier 5
  scope, Anti-Patterns (env vars stay in GitHub `production`,
  not on contributor laptops), and the Plan-to-Landed
  two-phase gate (`In progress pending prod smoke` → `Landed`)
  this plan invokes.
- [`scripts/release/post-merge-smoke-watch.cjs`](/scripts/release/post-merge-smoke-watch.cjs)
  — `STAGES[2].workflowName` matches the renamed workflow's
  display name; the watcher edit must land in the same
  commit as the workflow rename.
- [`AGENTS.md`](/AGENTS.md) — Plan-to-PR Completion Gate,
  Plan content is a mix of rules and estimates, Scope
  Guardrails.
- [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)
  — In-Repo Layout Convention; this plan is cross-cutting
  (not part of an epic) and lives at `docs/plans/<name>.md`.
