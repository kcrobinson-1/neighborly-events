# Operations Guide

## Purpose

This document tracks which platform settings should be treated as repo-managed source of truth and which settings should continue to be maintained manually in GitHub, Vercel, and Supabase.

Use it when:

- setting up a fresh deployment from a fork
- checking whether a dashboard edit should instead be a repo change
- monitoring or triaging a live event
- reviewing what still has to be configured manually after merge-driven releases are in place

Contributor workflow details live in `dev.md`. Current system shape lives in `architecture.md`.

## Ownership Rule Of Thumb

Use this default:

- if a setting changes application behavior and can be represented safely in source control, prefer making it repo-managed
- if a setting is a secret, account-level control, billing/admin choice, or platform ownership detail, keep it manual and document it here

For this project today, that means:

- prefer repo changes for workflows, rewrites, migrations, functions, and function config
- keep secrets and platform-admin settings out of the repo
- avoid dashboard-only production hotfixes unless they are immediately reconciled back into source control

## Settings Ownership Matrix

| Platform | Repo-managed now | Manually maintained now |
| --- | --- | --- |
| GitHub | workflows, validation logic | branch protection, rulesets, required checks, reviewer policy, Actions secrets, environment approvals |
| Vercel | `vercel.json`, frontend build config | project creation, domains, env var values, deployment protection, team access |
| Supabase | `config.toml`, migrations, Edge Function source | project creation, runtime secret values, Auth URL settings, admin allowlist membership, org membership, billing, dashboard-only admin settings |

## Repo-Managed Settings

### GitHub

- [`.github/workflows/ci.yml`](/.github/workflows/ci.yml)
  CI behavior and required validation logic
- [`.github/workflows/release.yml`](/.github/workflows/release.yml)
  production Supabase promotion flow after successful CI on `main`
- [`.github/workflows/production-admin-smoke.yml`](/.github/workflows/production-admin-smoke.yml)
  production admin smoke validation after successful release, with manual reruns

### Vercel

- [`apps/web/vercel.json`](/apps/web/vercel.json)
  SPA route rewrites for `/event/:slug/game` and the per-event admin
  route at `/event/:slug/admin` (organizer-or-admin authoring), plus
  proxy rewrites for apps/site-owned `/`, `/auth/callback`, `/admin*`,
  and event landing URLs
- [`apps/web/package.json`](/apps/web/package.json)
  frontend build commands
- [`apps/web/vite.config.ts`](/apps/web/vite.config.ts)
  Vite build behavior that determines what Vercel builds and serves

### Supabase

- [`supabase/config.toml`](/supabase/config.toml)
  Edge Function config that belongs in Supabase CLI configuration
- [`supabase/migrations`](/supabase/migrations)
  database schema, RPCs, and backend hardening
- [`supabase/functions`](/supabase/functions)
  Edge Function runtime code

### Contributor Setup Contract

- [`apps/web/.env.example`](/apps/web/.env.example)
  local frontend env contract
- [`apps/site/.env.example`](/apps/site/.env.example)
  local apps/site public Supabase env contract
- [`README.md`](/README.md)
  project entrypoint and quick-start guidance
- [`docs/dev.md`](/docs/dev.md)
  workflow, validation, release, and troubleshooting guidance
- [`docs/tracking/production-admin-smoke-tracking.md`](/docs/tracking/production-admin-smoke-tracking.md)
  production admin smoke rollout policy, fixture ownership, and triage runbook

## Manually Maintained Settings

### GitHub

- branch protection or rulesets for `main`
- required status checks
- required reviewers or conversation resolution settings
- repository merge policy
- GitHub Actions secrets:
  - `SUPABASE_ACCESS_TOKEN`
  - `SUPABASE_DB_PASSWORD`
  - `SUPABASE_PROJECT_REF`
- GitHub `production` environment vars and secrets for the production
  deployed-surface smoke (admin + redemption operator phases):
  - required vars:
    - `PRODUCTION_SMOKE_BASE_URL`
    - `PRODUCTION_SMOKE_SUPABASE_URL`
    - `PRODUCTION_SMOKE_PUBLISHABLE_DEFAULT_KEY`
  - optional admin-phase fixture override vars:
    - `PRODUCTION_SMOKE_ADMIN_EMAIL`
    - `PRODUCTION_SMOKE_DENIED_ADMIN_EMAIL`
    - `PRODUCTION_SMOKE_EVENT_ID`
    - `PRODUCTION_SMOKE_EVENT_SLUG`
    - `PRODUCTION_SMOKE_EVENT_NAME`
    - `PRODUCTION_SMOKE_ADMIN_REDIRECT_URL`
  - optional redemption-phase fixture override vars:
    - `PRODUCTION_SMOKE_REDEEM_AGENT_EMAIL`
    - `PRODUCTION_SMOKE_REDEEM_REDIRECT_URL`
    - `PRODUCTION_SMOKE_REDEEM_SUFFIX`
    - `PRODUCTION_SMOKE_REDEMPTIONS_ORGANIZER_EMAIL`
    - `PRODUCTION_SMOKE_REDEMPTIONS_REDIRECT_URL`
    - `PRODUCTION_SMOKE_REDEMPTIONS_REDEEMED_BY_ME_SUFFIX`
    - `PRODUCTION_SMOKE_REDEMPTIONS_REDEEMED_BY_OTHER_SUFFIX`
    - `PRODUCTION_SMOKE_REDEMPTIONS_REVERSED_BY_ME_SUFFIX`
  - optional readiness tuning vars:
    - `PRODUCTION_SMOKE_READY_TIMEOUT_MS`
    - `PRODUCTION_SMOKE_READY_POLL_MS`
  - secrets:
    - `PRODUCTION_SMOKE_SUPABASE_SERVICE_ROLE_KEY`
- optional GitHub `production` environment approvals or reviewers

Why manual for now:

- workflows are repo-managed, but branch protection, environment approvals, and secret values still live in GitHub settings

Phase 1 baseline settings for this repo's solo-operator workflow:

- keep pull requests optional on `main`
- do not require reviewer approvals
- allow force pushes for repository owner use cases such as docs-history cleanup
- block branch deletion on `main`
- require these status checks on `main`:
  - `Lint, Tests, Build, and Supabase Checks` (job from the `CI` workflow)
  - `Vercel` (Vercel deploy check) — keeps merges gated on a successful
    Vercel build for the same SHA; recorded as the Phase 1 Vercel-before-CI
    decision in
    [`continuous-deployment-roadmap.md`](/docs/tracking/continuous-deployment-roadmap.md)
- monitor `Release / Sync Supabase Production` as the post-CI production
  deployment gate; it runs after successful CI on `main` and should not be a
  pre-merge required branch check
- treat `Production Deployed-Surface Smoke / Smoke Admin On Production` as
  post-release operational confidence, not a pre-merge required check
  (the workflow runs both admin and redemption operator smoke phases on
  the dedicated smoke event)

CI docs-only trigger policy:

- `.github/workflows/ci.yml` always runs on pull requests so the required CI
  check appears even for docs-only changes
- docs-only pull requests short-circuit the heavy validation steps inside the CI
  workflow after a lightweight scope-detection pass
- docs-only pushes to `main` still do not run CI and therefore do not trigger
  the production Supabase release workflow
- any non-doc change continues to run full CI validation before release

### Vercel

- Vercel project creation and linking
- project root/build settings for the deployed app
- domains and DNS
- deployment protection settings
- environment variable values:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- access control, team membership, and billing settings

Why manual for now:

- `vercel.json` and frontend build config belong in the repo, but project linkage, secret values, domain ownership, and account-level controls do not

### Supabase

- Supabase project creation
- org/team membership and billing settings
- runtime secret values:
  - `SESSION_SIGNING_SECRET`
- runtime non-secret config (optional, additive):
  - `EXTRA_ALLOWED_ORIGINS` — comma-separated extras unioned with the
    in-code `defaultAllowedOrigins` set in
    [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts).
    Leave unset unless you have origins to admit beyond the defaults
    (the canonical apps/site Vercel alias, the localhost dev hosts, and
    each launched per-event organizer origin are already in defaults).
    Cannot remove a default origin. A launched origin belongs in the
    in-code list, not here: an allowlist is authorization surface
    rather than a secret, so it belongs where it is reviewed and
    diffable, and this variable is additive and environment-local.
    Reach for it for a temporary or machine-local extra.
  - `APPS_SITE_VERCEL_SCOPE` — Vercel team slug; opts in to admitting
    apps/site preview/branch aliases scoped to that team. Independent
    of `EXTRA_ALLOWED_ORIGINS`.
- Auth URL configuration for magic-link sign-in:
  - deployed web origin as the Supabase Auth Site URL
  - local `<origin>/auth/callback` redirect URL
  - deployed `<origin>/auth/callback` redirect URL
  - a single entry per environment — every authenticated route returns
    through `/auth/callback?next=…` (`/admin`, `/event/:slug/game`,
    `/event/:slug/admin`, `/event/:slug/game/redeem`, and
    `/event/:slug/game/redemptions`)
- operational allowlist membership in `public.admin_users`
- any dashboard-managed settings not represented by migrations, functions, or `config.toml`

Why manual for now:

- migrations, functions, and function config are repo-friendly
- secret values, Auth URL settings, and environment-specific admin membership are not appropriate to store in the repo

## Fresh Deployment Checklist

For a new deployment from a fork:

1. Create a new Supabase project.
2. Run the repo-backed Supabase bootstrap commands from [`dev.md`](/docs/dev.md).
3. Create a new Vercel project for the `apps/web` app.
4. Create a new Vercel project for the `apps/site` app and point the
   absolute rewrite destinations in `apps/web/vercel.json` at its
   production alias.
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
   in the apps/web Vercel project.
6. Add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` in the apps/site
   Vercel project.
7. Set `SESSION_SIGNING_SECRET` in Supabase. CORS allowlist origins
   live in code at
   [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts);
   only set the optional `EXTRA_ALLOWED_ORIGINS` /
   `APPS_SITE_VERCEL_SCOPE` env vars if you need extras beyond the
   canonical defaults. Editing that list is a code change that is not
   live until the edge functions are redeployed — see "Origin Admission
   Is Only As Complete As The Deploy" below.
8. Set the Supabase Auth Site URL to the deployed web origin and add
   `<origin>/auth/callback` as a redirect URL for each of your local
   and deployed origins.
9. Insert at least one normalized admin email into `public.admin_users`.
10. Recreate the desired GitHub branch protection and Actions secret
   configuration, including the `SUPABASE_ACCESS_TOKEN`,
   `SUPABASE_DB_PASSWORD`, and `SUPABASE_PROJECT_REF` release secrets.

## Origin Admission Is Only As Complete As The Deploy

The CORS allowlist in
[`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts)
is compiled into every deployable edge function, so admitting an
origin is a code change that takes effect one function at a time, as
each is redeployed. Three consequences an operator cannot infer from
the diff:

- **Merging is not deploying.** The entry is live only after
  `.github/workflows/release.yml` runs, which it does on a completed
  CI run against `main`.
- **A partial deploy is the failure mode.** Membership is resolved
  from the **import graph**, not from a search for the module's path:
  some functions reach the allowlist through
  `_shared/authoring-http.ts` or their own `dependencies.ts` rather
  than importing it themselves, so a path search under-reports and
  silently drops them. The release workflow runs
  `supabase functions deploy` with no function argument — the
  all-functions form — so the normal merge path covers the set by
  construction. A hand-run deploy is the case that has to name every
  function, and a partial one leaves the origin rejected on whatever
  it missed.
- **The deployed set outlives the repo.** `supabase functions deploy`
  creates and updates; it never deletes. A function renamed or removed
  in the repo stays deployed, frozen at the last bundle it shipped —
  including that bundle's copy of the allowlist, which from then on
  stops tracking `cors.ts` altogether. So the deployed set is a
  superset of `supabase/functions/`, and a stale member can go on
  admitting origins the allowlist retired, or rejecting the current
  one, with nothing in the repo to say so.

Both failure shapes are silent until someone reaches the surface that
was missed: an attendee passes session issuance, plays the whole quiz,
and takes a rejection at completion; an organizer signs in and finds
the authoring actions rejected the same way. Verify by sending a
preflight from the origin to **each** deployed function and confirming
the origin is echoed in `Access-Control-Allow-Origin` — a
single-function probe cannot distinguish "the allowlist is right" from
"the allowlist is right and every function has it."

Enumerate that probe set from `supabase functions list --project-ref
<ref>`, not from `supabase/functions/`: the filesystem cannot show you
a function the repo no longer has, which is the one most likely to be
carrying a stale allowlist. An entry with no counterpart in the repo
is an orphan — reconcile it with `supabase functions delete <slug>`,
which is not reversible from the repo, since no source remains to
redeploy.

## Live Monitoring And Log Triage

Current pre-launch posture:

- there is no dedicated live monitoring dashboard, uptime monitor, alerting
  service, or third-party error tracking SDK configured in the repo
- the release operator monitors manually through GitHub Actions, Vercel, and
  Supabase
- the `Production Deployed-Surface Smoke` workflow is the strongest
  deployed-path signal currently available — it runs admin authoring +
  redemption operator phases against the dedicated smoke event after
  release or by manual dispatch; it is not continuous monitoring

Use this runbook during a live event or final pre-event check when someone
reports that the site, quiz start, completion flow, or admin publishing is not
working.

### First Signal: Production Smoke

When you have the merge commit SHA in hand (typical for the doc-only
follow-up commit required by the Plan-to-Landed Gate), prefer
`npm run release:watch-smoke -- <merge-sha>` for evidence capture. It
walks the `CI` → `Release` → `Production Deployed-Surface Smoke` chain, prints
stage-by-stage progress, and emits a `SMOKE_URL=<run-url>` line on green
smoke or the failed-step logs on any-stage failure — see
[`dev.md`](/docs/dev.md) "Watching The Post-Merge Chain."

Otherwise (operator triage with no merge SHA, or follow-up on a
`workflow_dispatch` rerun), start with GitHub Actions:

1. Open the `Production Deployed-Surface Smoke` workflow.
2. Check the latest run for the release candidate or `main`.
3. If needed, run it manually with `workflow_dispatch`.
4. Read the failing step before changing platform settings.

Interpretation:

- readiness failures usually point at Vercel deployment propagation, a bad
  `PRODUCTION_SMOKE_BASE_URL`, or route availability
- auth/session failures usually point at Supabase Auth Site URL, redirect URLs,
  or session setup
- save/publish/unpublish failures usually point at Supabase Edge Functions,
  database policies, RPCs, or function secrets
- public route state failures usually point at frontend data loading, published
  event state, or slug mapping

Detailed smoke-specific triage lives in
[`production-admin-smoke-tracking.md`](/docs/tracking/production-admin-smoke-tracking.md).

### Site And Frontend Checks: Vercel

Use Vercel for deployment and frontend availability questions:

1. Open the Vercel project for the web app.
2. Confirm the latest production deployment points at the expected Git commit.
3. Inspect deployment build logs if the site did not deploy.
4. Inspect runtime or project logs if a route loads incorrectly or returns an
   unexpected status.
5. Confirm the production URL from `PRODUCTION_SMOKE_BASE_URL` loads:

```bash
curl -I "$PRODUCTION_SMOKE_BASE_URL"
curl -I "${PRODUCTION_SMOKE_BASE_URL%/}/admin"
curl -I "${PRODUCTION_SMOKE_BASE_URL%/}/event/production-smoke-event/game"
curl -I "${PRODUCTION_SMOKE_BASE_URL%/}/event/production-smoke-event/game/redeem"
curl -I "${PRODUCTION_SMOKE_BASE_URL%/}/event/production-smoke-event/game/redemptions"
```

`/admin` resolves through the apps/web → apps/site cross-app proxy
rewrite (see `apps/web/vercel.json`), so a 200 response indicates both
the proxy rule fired and apps/site's platform admin page rendered.
`/event/<slug>/game/redeem` and `/event/<slug>/game/redemptions` are
SPA routes served directly by apps/web; the deployed-surface smoke
walks both phases (admin authoring + redemption operator) on the
dedicated smoke event.

Notes:

- this app is a Vite SPA, so most attendee/admin behavior runs in the browser
  and will not produce rich Vercel server logs
- Vercel logs are still useful for deployment state, build errors, route
  rewrites, and static asset availability
- browser console/network errors on an affected device are useful evidence when
  Vercel says the deployment is healthy

### Backend Checks: Supabase

Use Supabase for backend behavior, auth, function errors, and persisted event
activity.

Open the production Supabase project and inspect:

- Edge Function logs for:
  - `issue-session`
  - `complete-game`
  - `save-draft`
  - `publish-draft`
  - `unpublish-event`
- Auth configuration:
  - Site URL is the deployed web origin
  - redirect URLs include the deployed `/admin` origin
- project secrets:
  - `SESSION_SIGNING_SECRET`
- non-secret runtime config (in code at
  [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts);
  also `EXTRA_ALLOWED_ORIGINS` / `APPS_SITE_VERCEL_SCOPE` env vars if
  the operator opted into extras)
- database logs when Edge Function logs indicate an RPC, policy, or migration
  failure

Function-specific interpretation:

- `issue-session` failures affect game start and usually involve origin
  allowlisting, event availability, request validation, or the best-effort
  `game_starts` write
- `complete-game` failures affect final verification and usually involve a
  missing/invalid session, answer validation, or completion/entitlement writes
- `save-draft`, `publish-draft`, and `unpublish-event` failures affect admin
  authoring and usually involve Supabase Auth, admin allowlist policy, draft
  persistence, or publish-state RPCs

### Database Activity Queries

Run these in the production Supabase SQL editor when you need to confirm
whether users are reaching the backend. Replace placeholders before running.

Recent game starts:

```sql
select
  event_id,
  count(*) as starts,
  max(issued_at) as latest_start
from public.game_starts
group by event_id
order by latest_start desc;
```

Recent completions:

```sql
select
  event_id,
  count(*) as completions,
  max(completed_at) as latest_completion
from public.game_completions
group by event_id
order by latest_completion desc;
```

Active entitlements:

```sql
select
  event_id,
  count(*) as active_entitlements
from public.game_entitlements
where status = 'active'
group by event_id
order by active_entitlements desc;
```

Event funnel by slug:

```sql
select
  e.id,
  e.slug,
  count(distinct s.client_session_id) as starts,
  count(distinct c.client_session_id) as completed_sessions,
  count(distinct r.client_session_id) filter (where r.status = 'active') as active_entitlements
from public.game_events e
left join public.game_starts s on s.event_id = e.id
left join public.game_completions c on c.event_id = e.id
left join public.game_entitlements r on r.event_id = e.id
where e.slug = '<event-slug>'
group by e.id, e.slug;
```

Smoke fixture state:

```sql
select
  id,
  slug,
  case when published_at is null then 'unpublished' else 'published' end as publish_state,
  published_at,
  updated_at
from public.game_events
where slug = 'production-smoke-event';
```

### Minute-Five Triage Path

If attendees report that the event is broken:

1. Check whether the production URL and event route load in a browser.
2. Check the latest `Production Deployed-Surface Smoke` run.
3. If the site does not load, inspect Vercel deployment/build/runtime logs.
4. If the quiz loads but cannot start, inspect `issue-session` logs and query
   `game_starts`.
5. If the game starts but cannot complete, inspect `complete-game` logs and
   query `game_completions` plus `game_entitlements`.
6. If admin save/publish/unpublish is broken, inspect the admin Edge Function
   logs and Auth/allowlist configuration.
7. Record whether the failure is a deployment issue, frontend route issue,
   Supabase Auth/config issue, Edge Function issue, database/RPC issue, or data
   issue before changing settings.

If the event needs stronger operational coverage after this pre-launch
milestone, the next step is a separate observability project: uptime checks,
alert routing, browser error capture, and lightweight event reporting.

## Current Operating Discipline

For this repo today:

- treat `supabase/migrations/`, `supabase/functions/`, and `supabase/config.toml` as the backend source of truth
- treat GitHub workflow files as the source of truth for CI and release automation
- treat Vercel environment variable values and Supabase secret values as platform-managed
- treat production smoke fixture settings as manually managed production-environment configuration described in [`production-admin-smoke-tracking.md`](/docs/tracking/production-admin-smoke-tracking.md)
- avoid manual production edits that do not get reconciled back into the repository

## Future Option

If the project grows into heavier operational complexity, consider a deliberate settings-as-code pass with Terraform or OpenTofu across GitHub, Vercel, and Supabase.

That should be treated as a separate infrastructure project, not as an ad hoc extension of the current MVP repo.
