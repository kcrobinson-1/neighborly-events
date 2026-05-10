# Canonical Origin Resolution — Phase 2 Scoping

This is the transient scoping doc for Phase 2 of the cross-cutting plan
at [`docs/plans/canonical-origin-resolution.md`](/docs/plans/canonical-origin-resolution.md).
The durable phase plan lives at
[`docs/plans/canonical-origin-resolution-phase-2-plan.md`](/docs/plans/canonical-origin-resolution-phase-2-plan.md).
Per the scoping-doc transience convention, this doc deletes when the
cross-cutting plan reaches its terminal state (after Phase 2 lands).

Per the scoping-doc Status convention codified in this same PR's
[`docs/agents/planning/phase.md`](/docs/agents/planning/phase.md) update,
this scoping doc carries no Status block — `In draft → Proposed → Landed`
is the plan-doc lifecycle, not the scoping-doc lifecycle.

## One-paragraph summary

Phase 2 ships the canonical-pointer flip: customer-reachable URLs now
resolve through apps/site's primary alias, with apps/web's plugin
deployment reached only via one-direction proxy rewrites from apps/site.
Concretely, the cross-app proxy rewrites are stripped from
[`apps/web/vercel.json`](/apps/web/vercel.json) (preserving the SPA
rewrites and the test-event `X-Robots-Tag` `headers` block at lines
59-72); [`apps/site/next.config.ts`](/apps/site/next.config.ts) keeps
its existing site → plugin rewrites as the canonical layer;
`NEXT_PUBLIC_SITE_ORIGIN`'s production value flips to apps/site's
primary alias; the Supabase Auth dashboard's redirect-URL allowlist
gains apps/site's `/auth/callback`;
[`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts)
gains pattern-matching support so apps/site's preview/branch aliases
are admitted alongside the canonical alias, and the enumerated default
set drops apps/web in favor of apps/site; and the doc-currency sweep
updates `docs/dev.md`, `docs/architecture.md`, and
`apps/site/.env.example` so they describe the post-flip topology
rather than today's. The metadataBase resolver in
[`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) keeps its
shape; its inline comment block and throw message are rewritten so
the prose explains the apps/site-canonical world rather than the
apps/web-canonical world.

## Operational reality calibration

The cross-cutting plan's wording around "customers" and the cutover
risks in its Risk Register reflect the launched-state world. Today, no
customers exist: the platform is unlaunched, no live traffic exists,
no external links to either origin are in the wild, and the only
person who has navigated to either origin is the maintainer.
This scoping locks that reality into the Phase 2 plan's operational
checklist:

- The Supabase Auth allowlist update does not need an additive coexistence
  window. The maintainer signs in fresh after the flip; nothing
  in-flight is at risk.
- There is no communications change to coordinate. The "new URL"
  reduces to a note the maintainer keeps for themselves and shares
  with the Madrona organizer at launch onboarding.
- The auth-callback failure mode named in the cross-cutting plan's
  Risk Register (signed-out user reaches plugin origin and attempts
  sign-in) is purely theoretical right now and stays theoretical
  through Phase 2. No active mitigation ships in this phase.

These calibrations operationalize the cross-cutting plan; they do not
contradict it. The cross-cutting plan stays forward-correct as written.
**Verified by:** [`docs/plans/canonical-origin-resolution.md:476-483`](/docs/plans/canonical-origin-resolution.md)
("No active lockdown needed for plugin-origin direct access" — the
user-confirmed reality on which this calibration rests),
[`docs/plans/canonical-origin-resolution.md:557-571`](/docs/plans/canonical-origin-resolution.md)
(the Risk Register entries this calibration relaxes for current
posture).

## Decisions made at scoping time

### Decision 1: CORS matching strategy is project-scoped pattern matching

The cross-cutting plan binds the contract — admit canonical site
origin and Vercel-generated preview / branch aliases of the apps/site
project — and explicitly defers the matching mechanism to per-phase
plan-drafting per
[`docs/plans/canonical-origin-resolution.md:130-134`](/docs/plans/canonical-origin-resolution.md).
The candidate strategies are:

1. **Exact-string match against an enumerated set, expanded.**
   Today's helper uses an exact-string membership check against an
   enumerated allowlist. Extending this to cover preview aliases
   would require regenerating the allowlist on every preview deploy
   or naming all possible aliases ahead of time — neither is
   workable, since Vercel mints a new alias per branch and per
   deploy.
2. **Permissive `*.vercel.app` pattern.** Admits any deployment on
   the platform, not just apps/site's preview aliases. A malicious
   or unrelated Vercel project on a different account could call
   the Edge Functions with credentials.
3. **Project-scoped pattern matching.** Admits origins that match
   the apps/site Vercel project's preview-alias shape — i.e., the
   project's stable name token in the hostname plus the `.vercel.app`
   suffix. Vercel's preview-alias naming includes the project name
   as the hostname prefix and the platform suffix is structurally
   fixed, so this admits exactly the apps/site project's
   preview/branch aliases without admitting unrelated Vercel
   deployments.
4. **Known-pattern enumeration (regex per known alias shape).**
   Equivalent admission set to (3), but more verbose and harder to
   audit.

**Chose: option 3.** Project-scoped pattern matching anchored to
the apps/site Vercel project's stable name token, alongside
continuing exact-string match for the enumerated localhost set +
the canonical production alias. Reasoning: (a) the admission set
is exactly what the contract names — apps/site's preview/branch
aliases plus the canonical alias, no more — without overmatching
to unrelated projects; (b) the implementation stays small alongside
the existing exact-match check; (c) survives branch-name churn and
Vercel's preview-naming variants without per-deploy maintenance;
(d) the project-name token is stable across the project's lifetime
— renaming the Vercel project would break the match, which is a
deliberate property (a project rename is a config event that
should require a CORS revisit anyway).

The strategy is recorded at this layer; the precise predicate
spelling is the implementing PR's responsibility — per the "Plan
code minimalism" rule's inline-code clause, predicate spellings
belong with the implementation. The implementing PR delivers the
helper change with branch-test coverage that proves the
admission-set matches the contract, including the negative-test
contract requirement named in the Phase 2 plan's Validation Gate
(an alias from a hypothetical sibling Vercel project whose name
shares apps/site's prefix is rejected).

**Verified by:**
[`supabase/functions/_shared/cors.ts:1-24`](/supabase/functions/_shared/cors.ts)
(today's helper shape — `defaultAllowedOrigins` Set + `ALLOWED_ORIGINS`
env-var override + exact-string `Set.has` check at `getAllowedOrigin`),
[Vercel — Generated URLs](https://vercel.com/docs/deployments/generated-urls)
(authoritative on Vercel's preview-alias hostname formats:
`<project>-<unique-id>-<scope>.vercel.app`,
`<project>-git-<branch>-<scope>.vercel.app`, both prefixed with the
project name and suffixed with `.vercel.app`).

### Decision 2: Operational cutover is single-step, no coexistence window

The cross-cutting plan's Risk Register at
[`docs/plans/canonical-origin-resolution.md:557-565`](/docs/plans/canonical-origin-resolution.md)
names the additive-coexistence pattern as the mitigation for
operator-managed Supabase Auth allowlist cutover. That mitigation
assumes live traffic at cutover time — every magic-link sign-in for
the duration would otherwise break.

Per the operational reality calibration above, today's reality is
exactly one user (the maintainer) with no in-flight magic links to
preserve. The cutover collapses to:

1. Update `NEXT_PUBLIC_SITE_ORIGIN` on the apps/site Vercel project
   Production environment to apps/site's primary alias.
2. Update `ALLOWED_ORIGINS` in the Supabase project to admit
   apps/site's primary alias (and drop the stale apps/web alias).
3. Add apps/site's `/auth/callback` to the Supabase Auth dashboard's
   redirect-URL allowlist (and remove apps/web's `/auth/callback`).
4. Merge the implementing PR; Vercel redeploys both projects; the
   topology flips.

The maintainer re-signs-in if the existing session breaks. No
additive window, no staged removal, no comms-coordination step. If
the maintainer's existing session survives the redeploy (likely —
the cookie is on the canonical site origin; signing in originally
worked through whichever surface), no re-sign-in is needed at all.

This is a deliberate calibration of the cross-cutting plan for
current posture, not a contradiction of it. If launch happens before
Phase 2 ships, this scoping decision flips back to the cross-cutting
plan's additive-coexistence shape; the trigger is "live customer
traffic exists." Today it does not.

**Verified by:**
[`docs/plans/canonical-origin-resolution.md:556-571`](/docs/plans/canonical-origin-resolution.md)
(the Risk Register's additive-window mitigation that this decision
relaxes for current posture),
[`docs/plans/canonical-origin-resolution.md:476-483`](/docs/plans/canonical-origin-resolution.md)
("No active lockdown needed for plugin-origin direct access" — the
user-confirmed reality this calibration rests on).

### Decision 3: metadataBase resolver doc shape is a structural rewrite, not a wording tweak

The resolver at
[`apps/site/app/layout.tsx:29-90`](/apps/site/app/layout.tsx) carries
two prose surfaces that go stale with Phase 2:

- **Inline comment block at lines 28-58** — explains why production
  must be set to "apps/web's canonical custom-domain origin" by
  citing apps/site's position behind apps/web's Vercel rewrite. The
  cited rationale is the inverse of the post-Phase-2 world, where
  apps/site is canonical and apps/web reaches it only through
  one-direction rewrites.
- **Throw message at lines 67-72** — names "apps/web's canonical
  custom-domain origin" as the value-shape the operator must set,
  with a `docs/dev.md` cite to the apps/site environment-variables
  section that Phase 2's doc-currency sweep also rewrites.

Both surfaces are **load-bearing prose**, not formatting. A reader
encountering the comment block post-Phase-2 with only the production
value flipped would be told to set the var to apps/web's hostname
while a working production deploy points it at apps/site's — the
disagreement breaks the comment's protective check the next time an
operator-rotation or fresh-onboarding read happens.

**Chose: structural rewrite of both surfaces.** The comment block
gets reframed around the canonical-origin concept (the var names
the canonical user-facing origin; on production it resolves to
apps/site's primary alias because that's the canonical origin
post-Phase-2; preview behavior is unchanged). The throw message
loses its apps/web reference and points to the post-Phase-2
`docs/dev.md` section. The resolver function body is unchanged —
the `process.env.NEXT_PUBLIC_SITE_ORIGIN` read, the production
throw, the preview branch-URL fallback, and the local fallback all
keep their current shape.

The `m3-phase-3-1-2.md` cite at lines 37-38 (the original scoping
that resolved metadataBase source for production) becomes
historically interesting but not load-bearing for the post-Phase-2
explanation; the rewrite drops it from the explanatory prose.
git history preserves the original rationale for anyone tracing
why the resolver shape exists.

**Verified by:**
[`apps/site/app/layout.tsx:28-90`](/apps/site/app/layout.tsx) (full
resolver and its comment / throw prose, read this scoping pass),
[`docs/plans/canonical-origin-resolution.md:484-495`](/docs/plans/canonical-origin-resolution.md)
("`NEXT_PUBLIC_SITE_ORIGIN` semantics" investigation entry — names
the resolver shape as unchanged but expected value as flipped).

### Decision 4: Phase 2 plan owns the Supabase Auth dashboard step as an out-of-repo manual action

Supabase Auth dashboard configuration lives outside the repo (operator-
managed via the Supabase web console). The cross-cutting plan's open
question 1 at
[`docs/plans/canonical-origin-resolution.md:502-509`](/docs/plans/canonical-origin-resolution.md)
asks who has access and whether a coexistence-window concern exists.

Resolution: the maintainer has full access (single-contributor repo
posture), and per Decision 2 above no coexistence window is needed
today. The Phase 2 plan's operational checklist names the dashboard
update as a step the maintainer performs at cutover; the Validation
Gate names a post-deploy magic-link sign-in attempt against the
canonical origin as the falsifier. The dashboard change is not
diff-able and does not appear in the PR; it is a step in the cutover
runbook the plan owns.

The cross-cutting plan stays the binding contract on what the
allowlist must contain post-Phase-2 (canonical site origin's
`/auth/callback` per
[`docs/plans/canonical-origin-resolution.md:108-113`](/docs/plans/canonical-origin-resolution.md));
this scoping decides only that Phase 2 owns the operational step that
brings the dashboard into compliance.

**Verified by:**
[`docs/plans/canonical-origin-resolution.md:502-509`](/docs/plans/canonical-origin-resolution.md)
(the open question this decision resolves),
[`docs/plans/canonical-origin-resolution.md:108-113`](/docs/plans/canonical-origin-resolution.md)
(the binding contract on the post-Phase-2 allowlist contents).

### Decision 5: `docs/dev.md` Cookie-Boundary section reframes around apps/site origin, not deletion

The Cookie-Boundary verification section at
[`docs/dev.md:894-934`](/docs/dev.md) describes how to verify cookies
set on apps/web's frontend domain are visible to apps/site through
the rewrite. The historical context is preserved: the section explains
the M0 phase 0.3 deferred-to-M1-phase-1.3.2 trail, then names the
@supabase/ssr frontend-origin cookie adapter that resolved it.

Phase 2 inverts which origin is canonical; the cookie story now
operates entirely within apps/site (no cross-app rewrite to verify
through). The candidate shapes for the section's update are:

1. **Delete the section entirely.** The boundary verification became
   a non-issue once the cookie adapter was in place; post-Phase-2
   there is no cross-app boundary to verify.
2. **Reframe the section around apps/site origin.** Keep the
   `@supabase/ssr` adapter explanation as the substantive content
   (still load-bearing — explains the cookie name and why
   `cookies()` reads work). Drop the procedural verification steps
   that name apps/web origin as the sign-in surface; replace with
   apps/site origin. Keep the historical context paragraph but
   reframe the cross-app-rewrite mention as a past topology.
3. **Move the section to architecture.md.** The cookie-adapter
   explanation belongs in architecture rather than dev.md if the
   procedural steps go away.

**Chose: option 2 (reframe).** The cookie-adapter explanation is
load-bearing onboarding content for anyone working on auth or
session mechanics, and dev.md is where contributors look for
session-related questions. Deletion would lose the explanation;
moving to architecture would split the auth context between two
docs without a forcing reason. The procedural steps update to name
apps/site as the sign-in surface (which it already is at the
component-level — `/admin` lives natively at apps/site). The
historical paragraph stays factual: the boundary historically lived
across apps/web → apps/site via rewrite; post-Phase-2 it collapses
to within-apps/site.

**Verified by:**
[`docs/dev.md:894-934`](/docs/dev.md) (the section under decision,
read this scoping pass),
[`apps/site/app/(authenticated)/admin/page.tsx`](/apps/site/app/%28authenticated%29/admin/page.tsx)
(`/admin` is natively apps/site's, not proxied through apps/web —
confirms the apps/site origin reframe is structurally accurate
post-Phase-2).

### Decision 6: `docs/dev.md` "Local-dev story for `/auth/callback` e2e fixtures" stays untouched

The section at
[`docs/dev.md:836-863`](/docs/dev.md) describes the local
[`scripts/testing/run-auth-e2e-dev-server.cjs`](/scripts/testing/run-auth-e2e-dev-server.cjs)
proxy that mirrors the production routing layer for e2e fixtures.
The script's responsibility is to keep local fixtures working
against whichever production routing layer exists.

The section's prose currently describes the apps/web-as-frontend-host
shape ("the production path now enters through the apps/web frontend
host and proxies the callback route to apps/site"). Post-Phase-2,
the production path enters through apps/site directly.

**Chose: do not touch this section in Phase 2's plan.** The local
e2e proxy script may need to flip its routing equivalently —
`/auth/callback` should resolve against apps/site directly without
the apps/web hop — but that script-level change is **implementation
work** beyond the doc-currency scope. The script and its prose stay
internally consistent today; flipping the prose without flipping
the script would create a doc-claims-script-doesn't gap. Both flip
together, in their own follow-up plan or as an Estimate Deviation
inside Phase 2 if the implementer finds the script's local proxy
already breaks once the production canonical pointer flips.

The Phase 2 plan names this section in "Files intentionally not
touched" with this rationale.

**Verified by:**
[`docs/dev.md:836-863`](/docs/dev.md) (section under decision, read
this scoping pass),
[`scripts/testing/run-auth-e2e-dev-server.cjs`](/scripts/testing/run-auth-e2e-dev-server.cjs)
(the script the section describes — its routing topology is the
binding constraint).

### Decision 7: `docs/architecture.md:32-35` framing is rewritten in-place, topology table at lines 951-1002 is rewritten as well

The cross-cutting plan flags both surfaces as stale framing. The
candidate shapes:

1. **Rewrite both surfaces in place** to describe the post-Phase-2
   topology. This is the natural fit because the architecture doc
   is a "current state" doc — the M2 transitional language at
   lines 970-977 already invited the eventual flip.
2. **Add a "Vercel routing topology — historical" appendix** that
   preserves the pre-Phase-2 table for archaeological readers.

**Chose: option 1 (in-place rewrite of both).** The architecture
doc explicitly describes current-state, not historical-state; the
M2-transitional framing is invitation to update once the inversion
ships. git history is the historical archive; an inline historical
appendix would compound the architecture doc's size without serving
a current reader's question.

The rewrites preserve the doc's section structure: the topology
table at lines 979-992 keeps its 12-row shape with destinations
and lifetimes flipped to the apps/site-canonical world. Rule 7's
"transitional" annotation goes away (no more SPA fallback —
apps/site owns the default). The framing paragraph at lines 32-35
flips "apps/web is the primary Vercel project owning the production
custom domain" to name apps/site as the canonical site origin and
explain that no platform-owned custom domain exists today.

**Verified by:**
[`docs/architecture.md:32-35`](/docs/architecture.md) (framing
under decision, read this scoping pass),
[`docs/architecture.md:951-1002`](/docs/architecture.md) (topology
table under decision, read this scoping pass),
[`docs/plans/canonical-origin-resolution.md:144-160`](/docs/plans/canonical-origin-resolution.md)
(the End State table that the rewritten topology table
mirrors / inherits from).

### Decision 8: Plan-doc location follows Phase 1's precedent

Phase 1's
[`docs/plans/scoping/canonical-origin-resolution-phase-1.md`](/docs/plans/scoping/canonical-origin-resolution-phase-1.md)
Decision 1 set the layout: durable plan at
`docs/plans/canonical-origin-resolution-phase-N-plan.md` (sibling of
the parent plan), transient scoping at
`docs/plans/scoping/canonical-origin-resolution-phase-N.md`. This
matches the pre-convention scoping path and keeps the cross-cutting
plan's phase-plan siblings co-located.

Phase 2 follows the same precedent without re-litigating the
convention. The convention question itself is open per
[`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md)'s
"Goal" section, but as Phase 1 noted, this scoping pass picks
reasonably and moves on rather than re-litigating during phase
work.

**Verified by:**
[Phase 1 scoping Decision 1 in `docs/plans/scoping/canonical-origin-resolution-phase-1.md`](/docs/plans/scoping/canonical-origin-resolution-phase-1.md),
[`docs/plans/planning-doc-location.md:14-50`](/docs/plans/planning-doc-location.md)
(the open convention question this decision defers on).

## Reality-check inputs the plan verifies

The phase plan's Contracts and Files To Touch sections rest on the
following observations, each retrieved during this scoping pass:

- **Cross-app proxy rewrites in apps/web/vercel.json span lines
  26-57.** The 7 entries with absolute apps/site destinations
  (rules 5, 6, 8, 9, 10, 11, 12 in the cross-cutting plan's
  topology mapping) are the strip-target. The SPA rewrites at
  lines 9-25 (rules 1-4) and the test-event headers block at
  lines 59-72 are preserved. The rule-7 SPA-fallback at lines
  34-37 (`/event/:path*` → `/index.html`) is part of the SPA
  rewrites and stays.
- **apps/site/next.config.ts rewrites at lines 63-86 are the
  shape Phase 2 retains.** Five entries, all site → plugin,
  matching the contract for what the canonical site routes
  through to the plugin. No additions needed; the existing
  set covers `/event/:slug/{game,admin}*` and `/assets/*`
  per the cross-cutting plan's End State table.
- **CORS helper at supabase/functions/_shared/cors.ts:1-24 is
  exact-string only.** The `defaultAllowedOrigins` Set has 5
  entries (4 localhost variants + apps/web's primary alias);
  the `getAllowedOrigin` function uses `Set.has(...)` directly.
  Adding suffix-and-prefix matching is a small isolated change
  to the helper's matching logic; the env-var override path is
  unchanged.
- **metadataBase resolver at apps/site/app/layout.tsx:29-103.**
  The function `resolveMetadataBaseOrigin` runs at module load
  time; reads `NEXT_PUBLIC_SITE_ORIGIN`; throws on production
  if unset; on preview falls back to `VERCEL_BRANCH_URL` /
  `VERCEL_URL`; otherwise uses `http://localhost:3000`. The
  resolver shape is unchanged by Phase 2; only its expected
  production value flips, and the inline prose around it
  rewrites per Decision 3.
- **apps/site/.env.example at lines 1-9** has 3 vars
  (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`,
  `NEXT_PUBLIC_SITE_ORIGIN`) plus the 5-line comment above the
  third var. The comment is the only stale prose in the file;
  the var-name structure is unchanged by Phase 2.
- **docs/dev.md sections at lines 791-805, 807-834, 894-934.**
  Three regions: the "Vercel" subsection (791-805), the
  "Vercel two-project monorepo layout" subsection (807-834),
  the "Cookie-boundary verification" subsection (894-934).
  Plus the "apps/site environment variables" subsection at
  lines 865-892 carrying the apps/web-canonical hostname
  guidance for `NEXT_PUBLIC_SITE_ORIGIN`. All four invert
  with Phase 2.
- **docs/architecture.md sections at lines 32-35 and 951-1002.**
  Two regions: the framing paragraph in the platform overview
  (32-35) and the Vercel routing topology section with its
  12-row table (951-1002). Both invert with Phase 2.
- **Three production files name `*.vercel.app` URLs.** The
  cross-cutting plan's investigation entry already enumerated
  this set; this scoping pass re-grepped to confirm:
  [`apps/web/vercel.json`](/apps/web/vercel.json) (7 absolute-URL
  rewrite destinations to apps/site, all stripped),
  [`apps/site/next.config.ts:53`](/apps/site/next.config.ts) (the
  `APPS_WEB_ORIGIN` constant — its presence stays since Phase 2's
  retained site → plugin rewrites still need a destination origin;
  what flips is only the cross-cutting plan's claim about which
  origin is canonical, not the constant's existence), and
  [`supabase/functions/_shared/cors.ts:7`](/supabase/functions/_shared/cors.ts)
  (default-allowed origin — flipped per CORS allowlist update).

**Verified by:** in-session reads of each file cited above:
[`apps/web/vercel.json:1-73`](/apps/web/vercel.json),
[`apps/site/next.config.ts:1-89`](/apps/site/next.config.ts),
[`supabase/functions/_shared/cors.ts:1-46`](/supabase/functions/_shared/cors.ts),
[`apps/site/app/layout.tsx:1-133`](/apps/site/app/layout.tsx),
[`apps/site/.env.example:1-9`](/apps/site/.env.example),
[`docs/dev.md:791-934`](/docs/dev.md),
[`docs/architecture.md:25-90`](/docs/architecture.md),
[`docs/architecture.md:945-1002`](/docs/architecture.md).

## Plan structure handoff

The phase plan owns: Status, Context, Goal, Cross-Cutting Invariants
(referenced from cross-cutting plan, not duplicated verbatim),
Naming, Contracts (full final shape), Files to touch (estimative),
Execution Steps (estimative), Commit Boundaries (estimative),
Validation Gate, Self-Review Audits, Documentation Currency PR Gate,
Out Of Scope, Risk Register, and Backlog Impact. This scoping doc
does not duplicate any of those sections; the phase plan is the
durable artifact.

The CORS matching mechanism chosen in Decision 1 is referenced from
the plan's Contracts as "the matching mechanism chosen at scoping
time" per the "Plan code minimalism" rule, with the mechanism's
shape recorded above in this scoping doc rather than restated in
the plan.
