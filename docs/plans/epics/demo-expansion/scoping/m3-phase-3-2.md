# Scoping — M3 phase 3.2 (demo-mode bypass: read side)

## Status

Scoping in progress. This is a transient artifact per AGENTS.md
"Phase Planning Sessions"; deletes in batch with sibling scoping
docs at the milestone-terminal PR. Durable cross-phase content
absorbs into
[m3-demo-mode-auth-bypass.md](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
durable per-phase content absorbs into
[`m3-phase-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-2-plan.md).

## Phase summary

Phase 3.2 ships the **read side** of M3's demo-mode auth bypass:
the shared test-event allowlist constant, page-component bypass
branches in the three apps/web bypass-target surfaces
(`/event/:slug/admin`, `/event/:slug/game/redeem`,
`/event/:slug/game/redemptions`), an Edge Function read shim that
serves RLS-gated reads to allowlist-allowed unauthenticated
visitors with service-role privileges, the demo-mode disclaimer
cue on bypass-rendered surfaces, and the enforcement assertions
that prove a non-test slug cannot resolve through the bypass
branch. The settled data-access semantics (read-only browse, Edge
Function shim for reads, 403 + structured body for writes) come
from
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts items 1–7; this phase translates that contract into the
read-side surface.

The **write side** — the five mutation Edge Functions'
`demo_mode_read_only` 403 short-circuit branches, the apps/web
mutation-control disabled-state UI, the apps/web noindex emit
(novel mechanism per AGENTS.md "Spike before plan for novel
mechanisms"), the M2 role-door copy revision, and the M3-closing
documentation currency — is phase 3.3's scope. The 2-PR split
along the read-side / write-side seam was pre-authorized in
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts item 7; scoping decision 1 below runs the AGENTS.md
"PR-count predictions need a branch test" pass and confirms the
split.

## Decisions made at scoping time

Each decision below carries a `Verified by:` reference to the
code citation that proves the load-bearing claim. These
decisions absorb into the plan's contract sections and out-of-
scope list during plan-drafting; the deliberation prose
(rejected alternatives) lives here through scoping's transient
lifetime.

### 1. PR shape — 2-PR split along the read-side / write-side seam [Resolved → Option B]

**What was decided.** Whether M3's implementation phase ships as
one PR (3.2 absorbs allowlist + page bypass + read shim + write
rejection + UI signaling + noindex + M3 closer), as two PRs along
the read-side / write-side seam pre-authorized by 3.1 (3.2 read
side; 3.3 write side + closer), or some other split.

**Why it mattered.**
[`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts item 7 deferred this decision to 3.2's plan-drafting
branch test. The milestone doc's
[Phase Status table](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
keeps a single 3.2 row pending this decision; if 3.2 splits, the
table grows to two rows at 3.2's plan-drafting time. AGENTS.md
"PR-count predictions need a branch test" requires the phase
planning session to re-derive the milestone-doc estimate against
actual scope.

**Options considered.**

1. **Single PR (Option A).** 3.2 absorbs everything: allowlist +
   page-component bypass branches + read shim + 5 mutation Edge
   Functions' 403 short-circuits + apps/web demo-mode UI on both
   read-rendering and mutation controls + apps/web noindex emit
   + M2 role-door copy revision in apps/site + M3-closing doc
   currency.
2. **2-PR split along read-side / write-side seam (Option B —
   the 3.1 pre-authorized fallback).**
   - 3.2: shared allowlist constant, apps/web page-component
     bypass branches, Edge Function read shim, apps/web demo-mode
     disclaimer cue on the read-rendering surface, allowlist-
     enforcement test assertions.
   - 3.3: 5 mutation Edge Functions' 403 short-circuits, apps/web
     mutation-control disabled-state UI, apps/web noindex emit,
     M2 role-door copy revision in apps/site, full M3-closing
     doc currency (README, architecture, product, operations
     conditional, styling conditional, backlog, milestone-doc
     Status, epic Milestone Status table).
3. **3-PR split (read / write / closer).** 3.2 read; 3.3 write;
   3.4 noindex + M2 copy revision + doc currency.
4. **Per-surface split (admin / redeem / redemptions).** 3.2,
   3.3, 3.4 each ship one surface end-to-end (bypass + read
   mediation + write rejection + UI signaling).

**Pros / cons.**

- *Option A.* Pro: minimal review-overhead total; reviewer sees
  the whole bypass surface in one place; copy revision lands
  alongside the bypass it documents. Con: subsystems-touched
  count exceeds AGENTS.md's >5 split threshold by a wide margin
  (see Branch-test analysis below); review attention diffuses
  across heterogeneous concerns (route guards, server auth gates,
  UI states, novel head-tag mechanism, cross-app copy).
- *Option B.* Pro: read-side and write-side are distinct review
  surfaces (route-level + read-shim wiring vs. server-side
  rejection branches + mutation-control UI + cross-app closure);
  the seam is the same one
  [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
  Contracts item 7 pre-authorized after milestone-session
  trade-off analysis; 3.2 ships a coherent intermediate state
  (bypass-rendered surfaces with data-only views — no mutation
  controls present per decision 5 — defended on the server by
  today's existing 401 path until 3.3 hardens to structured
  403). Con: two review rounds for one capability; cross-phase
  coordination cost (3.3's plan-drafting reads 3.2's merged
  code).
- *Option C.* Pro: maximum review focus per PR. Con: 3.4 would
  carry only "noindex + copy revision + doc currency," which is
  too small to justify a third PR; the M3-closer fits naturally
  alongside 3.3's write-rejection work.
- *Option D.* Pro: per-surface review attention. Con: the
  shared allowlist constant and the cross-cutting demo-mode UI
  cue land in *every* surface PR, producing duplicate review
  surface and three smaller PRs none of which are independently
  shippable (the allowlist constant cannot land in a surface PR
  without consumers).

**Branch-test analysis (per AGENTS.md "PR-count predictions need
a branch test").**

Subsystems touched if Option A absorbs all M3 implementation:
1. Shared allowlist constant module (new under `shared/`)
2. apps/web page-component bypass branches (`EventAdminPage`,
   `EventRedeemPage`, `EventRedemptionsPage`)
3. Edge Function read shim (new function or new endpoints) +
   `supabase/config.toml` `verify_jwt = false` declaration
4. apps/web demo-mode read-rendering UI (banner + read-only
   workspace variant)
5. Edge Function write rejection branches across the 5 mutation
   functions (`save-draft`, `publish-draft`, `unpublish-event`,
   `redeem-entitlement`, `reverse-entitlement-redemption`)
6. apps/web client mutation paths (slug carriage in request body,
   if the chosen 403 differentiation pattern requires it)
7. apps/web demo-mode UI signaling on mutation controls
   (disabled-with-tooltip / hidden / click-and-error per
   [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
   Contracts item 6)
8. apps/web noindex emit (novel mechanism — apps/web has no
   existing head-tag injection per the reality-check below)
9. apps/site M2 role-door copy revision
   ([`RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx))
10. Test infrastructure (allowlist constant unit test +
    read-shim allowlist-gate test + write-rejection structured-
    error tests + e2e fixture asserting bypass branch does not
    fire on a non-test slug)
11. Doc currency: README, architecture, product, operations
    (conditional), styling (conditional), backlog, milestone-doc
    Status flip, epic Milestone Status table flip

11 distinct subsystems is well above AGENTS.md's >5 split
threshold. Substantive logic LOC: page bypass branches ~30 lines
each × 3 + allowlist constant ~10 + read shim ~150–200 + UI cue
component ~50 + read-only workspace variant ~80 + mutation
disable wiring ~30 × 3 + write rejection branches ~15 × 5 +
noindex emit mechanism ~30 + slug request-body wiring ~10 × 5 +
tests ~150–250. Estimated total well above 300 LOC. The branch
test names Option B as required.

Subsystems if 3.2 ships read side only:
1. Shared allowlist constant module (new)
2. apps/web page-component bypass branches (3 files; demo-mode
   read-only workspace render-path)
3. Edge Function read shim + `supabase/config.toml`
4. apps/web demo-mode disclaimer cue on read-rendering surface
5. Test infrastructure (allowlist + read-shim + bypass-branch
   guard tests)

5 subsystems — at the threshold but cohesive around
"unauthenticated visitors on test slugs see read-mediated data
inside a clearly demo-marked surface." The disclaimer cue lives
with the read-rendering work because no bypass-rendered surface
should ship without it (cross-phase invariant 3 in the milestone
doc binds "no bypass-rendered surface presents itself as if the
visitor signed in normally").

**Came down to.** Whether 3.2 ships an internally-coherent
intermediate state on its own, or whether 3.3 is needed for the
state to be honest. The intermediate state is coherent: bypass-
rendered surfaces show read-only data via data-only variant
components that contain no mutation controls (per decision 5
below — the disabled-state shape is deferred to 3.3 by stripping
mutation controls entirely from 3.2's render path), today's
existing 401 from the unmodified mutation Edge Functions still
rejects any direct write attempt that bypasses the (absent)
client UI (until 3.3 hardens to structured 403), and the
disclaimer cue makes the demo status honest. So 3.2 is
shippable as a coherent state, and the branch test forces the
split.

**Resolution.** **Option B (2-PR split: 3.2 read side, 3.3 write
side + closer).** 3.2's plan binds the read-side scope; 3.3's
plan-drafting runs just-in-time after 3.2 lands per AGENTS.md
"Phase Planning Sessions" cadence and against
[`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)'s
Phase Status table grown to two rows at this scoping session's
milestone-doc edit (decision 8 below).

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts items 1–7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(the data-access-semantics contract this phase implements;
specifically item 7's pre-authorized 2-PR fallback);
[`m3-demo-mode-auth-bypass.md` Phase Status](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the milestone doc's row-count estimate that this scoping session
re-derives);
AGENTS.md "PR-count predictions need a branch test" rule.

### 2. Bypass-branch trigger semantics — fires only when slug ∈ allowlist AND session is signed-out [Resolved → Option B]

**What was decided.** When the page-component bypass branch
fires: on every test-slug request regardless of session state, on
unauthenticated test-slug requests only, or on some other
combination.

**Why it mattered.** The milestone doc's Cross-Phase Invariant
"Real events never receive bypass under any code path" binds the
bypass-eligibility gate to slug-membership only. But it does not
specify what happens to *signed-in* requests on test slugs — the
trust boundary stays where it is for non-test events; for test
events, "signed-in user on a test slug" is an unspecified case
the implementation has to pick.

**Options considered.**

1. **Bypass fires on every test-slug request (Option A).**
   `slug ∈ allowlist` triggers demo-mode rendering regardless of
   sessionState — signed-in users on test slugs see the same
   read-only demo surface as anonymous visitors.
2. **Bypass fires only when test-slug AND signed-out
   (Option B).** `slug ∈ allowlist && sessionState.status ===
   "signed_out"` triggers demo-mode rendering; signed-in users
   on test slugs continue through the existing
   `useOrganizerForEvent` / `authorizeRedeem` /
   `authorizeRedemptions` role gates (and may see a normal
   organizer experience if they're an organizer of the test
   event, or a role-denied banner otherwise).
3. **Bypass fires only when test-slug AND a future
   `?demo=1` query parameter is asserted.** A signed-out visitor
   without the parameter sees `SignInForm` as today; with the
   parameter, the bypass branch fires.

**Pros / cons.**

- *Option A.* Pro: single rendering path per slug — signed-in vs.
  signed-out doesn't matter for test events. Con: contradicts
  the 3.1 contract's symmetric server-side rule (write rejection
  fires on "allowlist match AND no auth context is present" —
  signed-in users go through normal auth and can mutate); a
  signed-in user who is a real organizer of the test event would
  unexpectedly see read-only when they expected their actual
  authoring view.
- *Option B.* Pro: symmetric with the 3.1 server-side rule
  (`Verified by:`
  [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md))
  — bypass fires on the client when bypass would fire on the
  server; signed-in users go through real auth on both sides;
  organizers of the test event retain the real authoring
  experience. Con: requires the bypass branch to compose with
  the existing auth state machine rather than short-circuit
  before it.
- *Option C.* Pro: gives signed-in users a way to preview the
  demo experience without signing out. Con: introduces a URL
  parameter as a bypass-trigger ingredient — the milestone doc's
  Cross-Phase Invariant explicitly forbids this ("no environment
  flag, URL parameter, request header asserted by the client, or
  session-scoped flag is permitted to substitute for or AND-with
  allowlist membership"); this option violates the rule.

**Came down to.** Whether server-client symmetry on the bypass
trigger is worth deferring an "unrealistic but possible" case
(signed-in user on a test slug who isn't an organizer of it).
The symmetry reasoning is load-bearing: the 3.1 server contract
already names "no auth context is present" as the trigger; the
client-side bypass should match that exact predicate so the
rendering and rejection sides agree on when demo mode applies.

**Resolution.** **Option B.** Bypass branch fires on
`isTestEventSlug(slug) && sessionState.status === "signed_out"`.
Signed-in users on test slugs continue through the existing
auth state machine — they see the role gate's verdict, exactly
as they would today. The plan binds this composition shape in
the bypass-branch contract per the
[plan structure handoff below](#plan-structure-handoff).

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(server-side trigger: "allowlist matches and no auth context is
present");
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariants → "Real
events never receive bypass" / "no environment flag, URL
parameter, request header"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(bans Option C's URL-parameter ingredient);
[`EventAdminPage.tsx:390-408`](/apps/web/src/pages/EventAdminPage.tsx),
[`EventRedeemPage.tsx:432-447`](/apps/web/src/pages/EventRedeemPage.tsx),
[`EventRedemptionsPage.tsx:693-707`](/apps/web/src/pages/EventRedemptionsPage.tsx)
(the existing `signed_out` branches the bypass branch composes
beside).

### 3. Allowlist constant location and shape — `shared/events/testEventAllowlist.ts` exporting both a tuple and a predicate [Resolved → Option B]

**What was decided.** Where the new shared TypeScript constant
lives, what symbol(s) it exports, and how guard sites consume
it. Owned by phase 3.2+ per the milestone doc's
[`Cross-Phase Decisions → Deferred to phase-time → "Allowlist
constant location"`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
entry.

**Why it mattered.** The milestone doc's first cross-phase
invariant binds "single source of truth, exposed to every guard
site by an enforced path." 3.2 introduces the constant, and the
location + shape choice cascades into every consumer 3.2 and
3.3 add. Wrong location creates import friction; wrong shape
creates per-call-site typing gymnastics.

**Options considered.**

1. **`shared/config/testEventAllowlist.ts` exporting a
   `readonly string[]` tuple (Option A).** New `shared/config/`
   directory; minimal export.
2. **`shared/events/testEventAllowlist.ts` exporting both a
   `TEST_EVENT_SLUGS` `as const` tuple and an
   `isTestEventSlug(slug: string): boolean` predicate
   (Option B).** Co-locate with existing `shared/events/` (which
   already houses event-related shared helpers); export both a
   data shape (for cases that need to enumerate, e.g., tests) and
   an ergonomic predicate (for the typical `if
   (isTestEventSlug(slug))` guard-site pattern).
3. **Co-locate under
   `shared/styles/themes/index.ts`'s existing slug Record (Option
   C).** Use the existing keys of the `themes` Record as the
   allowlist source of truth; export
   `Object.keys(themes)` as the allowlist.
4. **Per-app allowlist mirrored across `apps/web/` and
   `supabase/functions/_shared/` (Option D).** Each consumer
   carries its own copy of the constant; an exact-match CI test
   prevents drift.

**Pros / cons.**

- *Option A.* Pro: minimal surface; predicate inlines at call
  sites as `TEST_EVENT_SLUGS.includes(slug)`. Con: every guard
  site repeats `.includes(...)`, which is a string-comparison
  pattern that's easy to typo and hard to grep for. New
  `shared/config/` directory is unjustified — existing
  `shared/events/` already has the right scope.
- *Option B.* Pro: predicate is named and greppable
  (`isTestEventSlug` is searchable across the codebase, both
  TypeScript and Edge Functions); tuple stays available for
  enumerations (test fixtures, type-level discriminators).
  `shared/events/` is the natural location: existing siblings
  like `shared/events/index.ts` (verified during reality-check)
  already group event-shaped helpers; adding the test-event
  allowlist there is consistent.
- *Option C.* Pro: leverages existing shared module; no new
  file. Con: couples the **theme registry** ("which slugs have
  per-event Themes") with the **bypass allowlist** ("which slugs
  receive demo-mode bypass") — these are two distinct concepts
  that happen to overlap today (both are `harvest-block-party` +
  `riverside-jam`) but could diverge later (e.g., a future test
  event that uses the platform default theme, or a real event
  with a per-event Theme). Tight coupling here would be a
  trap.
- *Option D.* Pro: each app/runtime owns its own constant; no
  cross-runtime import. Con: violates the milestone-doc cross-
  phase invariant ("single source of truth, exposed to every
  guard site by an enforced path") — even with a CI drift test,
  two physical locations are not "single source." The shared
  module structure under `shared/` is exactly the consolidation
  point this invariant points to.

**Came down to.** Whether the allowlist conceptually belongs
with the theme registry (Option C) or as its own allowlist-
shaped concept (Option B). The bypass and the Theme are
independent capabilities that today happen to apply to the same
two slugs; coupling them is the trap. Option B keeps them
independent; future divergence (a new test event that uses the
platform Theme, or a real event with a per-event Theme) does not
require unwiring Option C's coupling.

**Resolution.** **Option B.** New file
`shared/events/testEventAllowlist.ts` exporting:

- `export const TEST_EVENT_SLUGS = ["harvest-block-party",
  "riverside-jam"] as const;` — `readonly` tuple, type
  `readonly ["harvest-block-party", "riverside-jam"]`
- `export type TestEventSlug = (typeof TEST_EVENT_SLUGS)[number];`
  — string-literal union of the two slugs
- `export function isTestEventSlug(slug: string): slug is
  TestEventSlug { return (TEST_EVENT_SLUGS as readonly
  string[]).includes(slug); }` — predicate with a type guard so
  guard-site narrowing is type-safe

Edge Functions import via the same path
(`../../../shared/events/testEventAllowlist.ts` resolved through
Deno's relative-import shape, mirroring how
[`get-redemption-status/index.ts:5`](/supabase/functions/get-redemption-status/index.ts)
already imports `../../../shared/redemption.ts`).

**Verified by:**
[`shared/redemption.ts`](/shared/redemption.ts) and
[`get-redemption-status/index.ts:5`](/supabase/functions/get-redemption-status/index.ts)
(the cross-runtime `shared/`-imported-by-Deno-Edge-Functions
precedent the new module follows);
[`shared/styles/themes/index.ts:20-21`](/shared/styles/themes/index.ts)
(the existing slug-Record location Option C would have reused;
inspected to confirm the coupling concern is real);
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(single source of truth requirement Option D would have
violated).

### 4. Demo-mode disclaimer cue on read-rendering surface — top-of-page banner reusing apps/site `TestEventDisclaimer` semantics, ported to apps/web SCSS [Resolved → Option A]

**What was decided.** What the visible "this is demo mode"
signpost looks like on bypass-rendered apps/web surfaces. Owned
by phase 3.2+ per the milestone doc's
[`Cross-Phase Decisions → Deferred to phase-time → "Demo-mode
signaling pattern in UI"`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
entry. 3.2 resolves the read-side shape; 3.3 owns the
mutation-control treatment (per decision 5 below).

**Why it mattered.** Cross-Phase Invariant 3 of the milestone
doc binds "no bypass-rendered surface presents itself as if the
visitor signed in normally." Without a visible demo-mode
signpost, an internal partner could mistake the read-only browse
for an authenticated experience and (justifiably) be confused
when mutation controls don't work.

**Options considered.**

1. **Top-of-page banner reusing apps/site
   `TestEventDisclaimer` semantics, ported to apps/web SCSS
   (Option A).** Same banner pattern apps/site already shows on
   `/event/<slug>` for test events
   (`Verified by:` apps/site `TestEventDisclaimer` per
   [`docs/architecture.md`](/docs/architecture.md) trust-boundary
   / disclaimer reference); copy adapted to "you're viewing a
   demo of the X experience for the Y event; sign in for the
   real workspace" (exact copy plan-time). Lives at the top of
   each bypass-rendered shell (`EventAdminShell`,
   `RedeemShell`, `RedemptionsShell`) inside the bypass branch.
2. **Page-title prefix + in-section callout (Option B).** Title
   prefix `"[Demo] "` plus a per-section ribbon next to each
   primary panel.
3. **Persistent corner ribbon (Option C).** Fixed-position
   element pinned to a corner of the viewport across the whole
   bypass-rendered surface.
4. **Inline copy in the existing page header (Option D).**
   No new component; the existing page-title area's copy
   adapts to "Manage this event (demo)" / "Redeem event codes
   (demo)" / "Review redemptions (demo)" with no banner element.

**Pros / cons.**

- *Option A.* Pro: pattern-match with apps/site's
  `TestEventDisclaimer` — internal partners arriving from
  apps/site already know what the banner means; one consistent
  signal across the marketing/landing → bypass-rendered flow.
  The cross-app demo-signaling continuity is exactly what
  Cross-Phase Invariant 3 binds. Con: introduces a new
  apps/web component (small surface; the existing apps/web SCSS
  partials under `apps/web/src/styles/` accommodate it).
- *Option B.* Pro: more in-context — each section explains
  itself. Con: title prefix is easy to miss on long pages
  (admin workspace scrolls); per-section ribbons fragment the
  signal across multiple visual elements rather than one
  honest top-of-page declaration.
- *Option C.* Pro: always visible. Con: novel UX pattern not
  used elsewhere in the platform (no existing fixed-position
  ribbons in apps/web or apps/site); breaks the "match the
  apps/site pattern" reasoning Option A relies on.
- *Option D.* Pro: no new component; minimal diff. Con: too
  subtle — "(demo)" in a page title is a low-information signal
  for a partner who doesn't know the platform's auth shape.
  AGENTS.md "Bans on surface require rendering the consequence"
  applies in reverse: before *omitting* an explicit demo signal,
  prove the subtle signal is sufficient — and a partner-audience
  read of "Manage this event (demo)" leaves "what does demo
  mean?" answered only by the absence-of-controls discovery,
  which is exactly what the disclaimer should explain up front.

**Came down to.** Whether cross-app pattern continuity (apps/site
banner ↔ apps/web banner on the same bypass surface set) was
worth the new-component cost. Yes — partners walk the
home-page → role-door → bypass-rendered surface flow, and the
banner pattern is the load-bearing honesty signal at every step
of that walk.

**Resolution.** **Option A.** A new apps/web component (working
name `DemoModeBanner`; final naming owned by plan-drafting)
renders at the top of the bypass branch in each of the three
shells. Copy contract carries the demo-status declaration
(per-surface + per-event) and the read-only signal; **no
in-banner sign-in link**. A first draft of the Copy contract
included a `[Sign in](#)` affordance pointing at "the real
workspace," but plan-drafting reality-check refuted that
shape: each page's `SignInForm` renders inline at the same
slug-scoped URL when `sessionState.status === "signed_out"`
(`Verified by:`
[`EventAdminPage.tsx:390-408`](/apps/web/src/pages/EventAdminPage.tsx),
[`EventRedeemPage.tsx:432-447`](/apps/web/src/pages/EventRedeemPage.tsx),
[`EventRedemptionsPage.tsx:693-707`](/apps/web/src/pages/EventRedemptionsPage.tsx)),
not via redirect to a separate sign-in route, so a link to
"the real workspace" would navigate to the URL the visitor is
already on, satisfy the bypass-branch trigger predicate again,
and re-render the bypass branch — a no-op loop. apps/web
exposes no non-slug-scoped sign-in landing
(`Verified by:`
[`apps/web/src/App.tsx`](/apps/web/src/App.tsx) — only the
four event-route shells), so the sign-in affordance has no
escape destination on apps/web today. Resolution: drop the
in-banner link; visitors who want to sign in do so out-of-band.
Exact wording on the demo-status copy is owned by plan-drafting
against rendered components per AGENTS.md "Bans on surface
require rendering the consequence."

The 3.3 mutation-control disabled-state treatment (per decision 5
below) layers onto the read-rendering surface this banner
introduces.

**Verified by:**
[`apps/site/components/event/TestEventDisclaimer.tsx`](/apps/site/components/event/TestEventDisclaimer.tsx)
(the apps/site precedent — uses `role="note"` and a
`test-event-disclaimer` className; this phase's apps/web banner
ports the same semantic shape);
[`apps/web/src/styles/`](/apps/web/src/styles) (existing SCSS
partial conventions the new component composes against);
[`EventAdminPage.tsx:67-107`](/apps/web/src/pages/EventAdminPage.tsx),
[`EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx)
`RedeemShell`,
[`EventRedemptionsPage.tsx`](/apps/web/src/pages/EventRedemptionsPage.tsx)
`RedemptionsShell` (the three shells the banner mounts inside;
each carries a `<section className="panel">` body suitable for
top-of-shell banner insertion).

### 5. Mutation-control disabled-state shape on bypass-rendered surfaces — deferred to phase 3.3 [Resolved → Defer to 3.3]

**What was decided.** What the read-only state on mutation
controls looks like (disabled-with-tooltip / hidden /
click-and-error / per-surface combination) is owned by phase
3.2+ per
[`m3-phase-3-1-plan.md` Contracts item 6](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md);
the question is whether 3.2 settles it or 3.3 does, given the
2-PR split in decision 1.

**Why it mattered.** AGENTS.md "Bans on surface require
rendering the consequence" requires the chosen shape to be
verified by rendering it. The shape is best chosen against
the actually-rendered components in the bypass-branch
read-rendering path — which 3.2 introduces.

**Options considered.**

1. **3.2 settles the mutation-control shape (Option A).** 3.2
   plan-drafting picks disabled-with-tooltip vs. hidden vs.
   click-and-error against rendered components and ships the
   chosen shape; 3.3 builds the server-side 403 path matching
   it.
2. **3.3 settles the mutation-control shape (Option B).** 3.2
   ships the bypass branch with mutation controls **fully
   removed from the read-only surface** (the read-only render
   path simply doesn't include them). 3.3 then re-introduces
   them in the disabled-with-tooltip / hidden / click-and-error
   shape it picks, alongside the server-side 403 that defends
   against any way the controls *could* be used.
3. **3.2 settles the shape; 3.3 hardens it (Option C — hybrid).**
   3.2 picks disabled-with-tooltip and ships the controls in
   that shape; 3.3 just adds the server-side 403 (no client
   change). 3.2 commits the shape; 3.3 doesn't revisit.

**Pros / cons.**

- *Option A.* Pro: 3.2 plan-drafting has the rendered
  components in front of it (since 3.2 ships the read-only
  surface); the choice is grounded against actual UI. Con:
  3.2 commits to the shape before 3.3's server-side
  `demo_mode_read_only` error code is implementation-tested;
  if 3.3's plan-drafting surfaces a UX gap (e.g.,
  disabled-with-tooltip is fine for buttons but not for
  freeform input fields), 3.2's choice has to be revisited
  in 3.3's PR per AGENTS.md "Plan-to-PR Completion Gate."
- *Option B.* Pro: clean seam — 3.2's read-only surface
  literally has no mutation controls (matches the "read-only
  browse" intent at its strongest), so the disabled-shape
  decision can be made by 3.3 against the full write-side
  picture. Con: 3.3 has to introduce mutation controls back
  into the bypass branch, which means 3.2's read-only
  surface and 3.3's mutation-disabled surface are visibly
  different intermediate states; review attention has to
  catch the regression-shape if 3.3's reintroduction
  diverges from the existing signed-in workspace.
- *Option C.* Pro: minimal 3.3 client surface (just the 403);
  3.2 owns the visible shape end-to-end. Con: same as Option
  A's con — 3.2 commits to a shape without the server-side
  error-code wiring being tested against it.

**Came down to.** Whether 3.2 should preview the mutation-
control shape (Option A/C) or strip mutation controls entirely
to defer the choice (Option B). The trade is "early
commitment to a shape, with revision-cost-if-wrong" vs.
"clean seam at the cost of two visible intermediate states."

The decision-logic that resolves it: **3.3's plan-drafting
runs against 3.2's merged code per AGENTS.md "Phase Planning
Sessions" cadence. 3.2's read-only surface needs to *look*
read-only for 3.2 to be a coherent shippable state — which
means 3.2 has to do *something* with mutation controls. The
cheapest thing 3.2 can do is hide/remove them (Option B's
direction), preserving 3.3's freedom to choose the
disabled-state shape against the broader write-side picture.**

If 3.3's plan-drafting concludes disabled-with-tooltip is
right, 3.3's PR adds the controls back in that shape; if
3.3 picks hidden, 3.2's hide-them choice was correct
already and 3.3 just hardens the server. Option B's worst
case (rework if 3.3 picks disabled-with-tooltip) is
cheaper than Option A/C's worst case (full re-shape if
3.3 surfaces a gap during write-side implementation),
because Option B's rework adds controls (a localized
diff) whereas Option A/C's rework rewires existing
controls (a more invasive diff).

**Resolution.** **Defer to 3.3.** 3.2 ships the bypass branch
with **mutation controls removed from the read-only render
path** — the existing `SignedInEventAdminFlow` /
`SignedInRedeemFlow` / `SignedInRedemptionsFlow` are not
rendered on the bypass branch; instead, a new read-only
variant component renders only the data view (admin: published
event description + draft preview; redemptions: the merged
redemption list; redeem: the keypad's display of recent codes
or a "no codes yet" empty state). 3.3's plan-drafting picks
the mutation-control disabled-state shape against the
rendered read-only variant, against the server-side
`demo_mode_read_only` error code, and against all five
mutation paths uniformly.

3.2's plan binds this contract: "the bypass-rendered surface
exposes data views only; mutation controls are not present in
3.2's diff." 3.3's plan re-derives the disabled-state shape
and adds controls back in the chosen shape.

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts item 6](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(the contract this defers to 3.3 owns the resolution of);
AGENTS.md "Bans on surface require rendering the consequence"
(applies to *both* 3.2 and 3.3 — 3.2 verifies the data-only
read-only surface looks coherent without mutation controls;
3.3 verifies the chosen disabled-state shape looks coherent
with them).

### 6. Edge Function read shim shape — one new function with `surface` discriminator [Resolved → Option A]

**What was decided.** Whether the read shim is one new Edge
Function with a `surface: "admin" | "redemptions"` discriminator
in the request body, two new functions (one per surface), or new
endpoints on existing functions. Owned by phase 3.2+ per
[`m3-phase-3-1-plan.md` Contracts item 3](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md).

**Why it mattered.** Each new endpoint adds a deployment and
config surface (`supabase/config.toml` `verify_jwt = false`
declaration, CORS origin handling per
[`_shared/cors.ts`](/supabase/functions/_shared/cors.ts), Deno
test fixture, e2e wiring). Multiplying endpoints multiplies
each.

**Options considered.**

1. **One new Edge Function with `surface` discriminator
   (Option A).** Working name `demo-mode-read`. Request body:
   `{ slug: string, surface: "admin" | "redemptions",
   payload: { ... } }`. Function validates allowlist + dispatches
   to per-surface read paths internally. One deployment, one
   config entry, one CORS line.
2. **Two new Edge Functions (Option B).** `demo-admin-load` and
   `demo-redemptions-load`. Each function single-purpose;
   slimmer per-function code; clearer endpoint names.
3. **New endpoints on existing functions (Option C).** Extend
   the authoring functions (`save-draft`, `publish-draft`) to
   accept anonymous read requests; extend a redemption-side
   function (or `complete-game`) for the redemption read.
4. **Reuse the Supabase REST API with broader anon RLS policies
   (Option D).** Add allowlist-scoped anon SELECT policies to
   `game_event_drafts` and `game_entitlements`; the apps/web
   browser client reads directly without an Edge Function shim.

**Pros / cons.**

- *Option A.* Pro: one function = one deployment surface, one
  config entry, one CORS line, one test fixture; the
  `surface` discriminator is a small switch internally and
  scoping decision 5 below confirms only two surfaces need
  mediation (admin: 2 read paths; redemptions: 1 read path
  per
  [`m3-phase-3-1-plan.md` Contracts item 4](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md));
  `redeem` needs zero per the same contract item. Adding a
  third surface later is one new branch, not a new function.
  Con: the function's responsibility-set is broader than each
  existing Edge Function (most existing functions are
  single-purpose).
- *Option B.* Pro: each function is single-purpose; tight scope
  per file. Con: doubles deployment / config surface; doubles
  Deno test surface; the allowlist-check code path duplicates
  across two function bodies (which the milestone doc's
  cross-phase invariant 1 already binds against duplication —
  even if the duplication is "inside two Edge Functions instead
  of two TypeScript guard sites," the same drift risk applies).
- *Option C.* Pro: no new functions. Con: couples
  authentication-required paths with anonymous-allowed paths
  inside one function body; the existing
  `authenticateEventOrganizerOrAdmin` /
  `authenticateRedemptionOperator` gates would need
  conditional bypassing; high review-risk for a structurally
  cleaner alternative.
- *Option D.* Pro: zero Edge Function additions. Con: phase
  3.1 explicitly chose Edge-Function-mediated reads
  specifically *because* the alternative (anon RLS broadening)
  introduces the
  [Risk Register](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
  "RLS broadening accidentally extends to non-test events"
  blast radius and a SQL helper-function dependency that
  introduces a SECURITY DEFINER review surface 3.1 deliberately
  avoided. This option re-opens 3.1's settled decision —
  rejected by 3.1's settled record at
  [`m3-phase-3-1-plan.md` Contracts item 3](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md).

**Came down to.** Single function with discriminator vs. two
single-purpose functions. The single-function shape minimizes
deployment surface and consolidates the allowlist-check code
path; the surface set is small enough (two real surfaces) that
the discriminator branch is light. Future scaling (a third
surface for, e.g., a draft list) extends the discriminator
without spawning a new function.

**Resolution.** **Option A.** One new Edge Function (working
name `demo-mode-read`; final naming owned by plan-drafting)
under `supabase/functions/demo-mode-read/`. Request body shape:
`{ slug: string, surface: "admin" | "redemptions", payload: {
  ... } }`. Function:

1. Validates `slug` is a string and `isTestEventSlug(slug)`
   returns true. If not, return HTTP 403 with structured body
   (working error code `not_in_demo_allowlist`).
2. Branches on `surface` and dispatches to the per-surface read
   path:
   - `admin`: returns the slug → event-id resolution against
     `game_event_drafts` and the draft data load (the two read
     paths
     [`m3-phase-3-1-plan.md` Contracts item 4](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
     names for admin)
   - `redemptions`: returns the merged redemption-list slice
     (the one read path
     [`m3-phase-3-1-plan.md` Contracts item 4](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
     names for redemptions)
3. Uses service-role privileges (`createClient(supabaseUrl,
   serviceRoleKey)` per the
   [`get-redemption-status/index.ts:44-49`](/supabase/functions/get-redemption-status/index.ts)
   precedent) and bypasses RLS.
4. Returns the per-surface payload shape that the apps/web
   bypass-branch code expects (the existing `loadDraftEvent`
   and `fetchRedemptionSlices` return shapes are the targets;
   plan-drafting confirms the exact shapes against the
   on-disk modules).

apps/web's existing fetcher conventions
([`fetchRedemptionSlices`](/apps/web/src/redemptions/redemptionsData.ts:33-70))
are not modified; instead, the bypass branch in each page
component calls a new client-side helper (working name
`fetchDemoModeRead` or per-surface variants — plan-time) that
invokes the new Edge Function. The existing fetchers remain
the signed-in path.

**Verified by:**
[`get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts)
(complete precedent for an unauthenticated Edge Function with
service-role reads, dependency-injection shape, CORS handling,
and `verify_jwt = false` config);
[`supabase/config.toml:1-29`](/supabase/config.toml) (verified
during reality-check: every existing function declares
`verify_jwt = false`; new function follows the pattern);
[`m3-phase-3-1-plan.md` Contracts items 3 and 4](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(read-mediation pattern + read-mediation surface);
[`fetchRedemptionSlices`](/apps/web/src/redemptions/redemptionsData.ts)
(the existing redemptions fetcher whose return shape the
`surface: "redemptions"` mode mirrors).

### 7. Test-event-allowlist enforcement assertion — Vitest unit tests + Edge Function Deno test + e2e fixture asserting bypass does not fire on non-test slug [Resolved → Option B]

**What was decided.** Which testing surface(s) the test-event-
allowlist enforcement assertion lands on. Owned by phase 3.2+
per the milestone doc's
[`Cross-Phase Decisions → Deferred to phase-time → "Test-event-
allowlist enforcement assertion"`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
entry, with the Risk Register naming "pgTAP or equivalent
assertions" as the mitigation for the demo-mode-security-
boundary risk.

**Why it mattered.** The first cross-phase invariant binds
"single source of truth, exposed to every guard site by an
enforced path" — the enforcement assertion is what fails CI on
drift. Without it, a future guard site that accidentally
hard-codes `"harvest-block-party"` instead of importing the
shared constant would pass review.

**Options considered.**

1. **pgTAP test against a SQL helper function (Option A).** The
   milestone doc names this as a candidate. With 3.1 settling
   on Edge-Function-mediated reads, no SQL helper is anticipated
   (per the milestone-doc deferred entry's update); this option
   becomes inapplicable.
2. **Vitest unit tests against the shared allowlist constant +
   Deno test against the Edge Function shim's allowlist-gate
   path + Playwright e2e fixture asserting the bypass branch
   does not fire on a non-test slug (Option B).** Three layers:
   - Vitest unit test: `isTestEventSlug` returns true for the
     two test slugs and false for representative non-test
     candidates (real-event slug shape, empty string, similar-
     looking strings like `harvest-block-partyy`)
   - Deno test against `demo-mode-read`: returns 403 with
     `not_in_demo_allowlist` code when called with a non-test
     slug; returns the per-surface payload when called with a
     test slug
   - Playwright e2e fixture: visiting `/event/<some-real-slug>/admin`
     while signed-out continues to render `SignInForm` (no bypass
     branch fires); visiting `/event/harvest-block-party/admin`
     while signed-out renders the bypass branch with the demo-mode
     banner present
3. **Vitest only (Option C).** Skip the Deno and Playwright
   surfaces; rely on unit tests of the shared constant.
4. **Playwright e2e only (Option D).** Skip unit and Deno
   surfaces; rely on integration coverage of the user-visible
   path.

**Pros / cons.**

- *Option A.* Inapplicable per scope of 3.1's settled decision.
- *Option B.* Pro: each layer catches a different drift class —
  unit test catches changes to the constant or predicate
  semantics; Deno test catches changes to the Edge Function
  allowlist-gate code path; e2e fixture catches end-to-end
  regressions where the page-component bypass branch fires
  unexpectedly. The three-layer coverage matches AGENTS.md's
  "PR-count predictions need a branch test" discipline applied
  to risk surfaces. Con: three test additions in one PR; the
  Playwright fixture takes longer to author than the others.
- *Option C.* Pro: low-cost. Con: misses the cross-runtime
  drift case (a TypeScript guard site that forgot to consume
  the constant; the unit test on the constant itself would
  pass).
- *Option D.* Pro: end-to-end fidelity. Con: slow signal;
  doesn't catch the unit-level drift class.

**Came down to.** Whether one test layer is enough or whether
the security-boundary risk warrants belt-and-suspenders
coverage. The milestone doc's Risk Register names the failure
mode explicitly: "a code path that resolves 'is this a test
event' inconsistently between guard sites silently extends
bypass to real events." The three-layer coverage maps to the
three drift classes (constant-level, function-level,
integration-level).

**Resolution.** **Option B.** All three layers ship in 3.2's
PR:

1. Vitest unit test under
   `tests/shared/events/testEventAllowlist.test.ts` against
   `TEST_EVENT_SLUGS` and `isTestEventSlug`.
2. Deno test under
   `tests/supabase/functions/demo-mode-read.test.ts` (or
   `supabase/functions/demo-mode-read/__tests__/`, matching the
   existing Deno test convention — plan-time confirms by
   inspecting `tests/supabase/functions/`'s shape).
3. Playwright e2e fixture under
   `tests/e2e/demo-mode-bypass/` (new subdirectory matching
   `tests/e2e/`'s existing per-feature shape) with two
   scenarios: bypass fires on test slug (positive case) +
   bypass does not fire on non-test slug (negative case).

Plan-drafting confirms the exact `tests/` paths and runner
conventions per AGENTS.md "Prefer existing wrapper scripts"
against `package.json` `scripts` and `scripts/testing/`.

**Verified by:**
`tests/supabase/functions/` directory shape (verified during
reality-check; existing Deno tests for the 9 existing functions
follow the per-function-test-file convention);
`tests/e2e/` directory shape (verified during reality-check; 12
existing per-feature subdirectories);
[`m3-demo-mode-auth-bypass.md` Risk Register → "Allowlist drift
between guard sites"](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
[`m3-phase-3-1-plan.md` Contracts item 3](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
(no SQL helper anticipated, so pgTAP is not the right tool).

### 8. Milestone-doc Phase Status table edit — grow from 1 row to 2 rows in 3.2's PR [Resolved]

**What was decided.** When the milestone doc's Phase Status
table grows from one row (3.2 alone) to two rows (3.2 + 3.3) per
[`m3-phase-3-1-plan.md` Contracts item 7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)'s
"the milestone doc's Phase Status table grows accordingly at
3.2's plan-drafting time" instruction.

**Resolution.** **3.2's planning-session PR.** This scoping
session's milestone-doc edit grows the table to two rows. The
3.2 row's Plan column points at `m3-phase-3-2-plan.md`; Status
is `Proposed`; PR column is `_pending_`. The 3.3 row's Plan
column is `_pending 3.3 phase planning_`; Status is `Proposed`;
PR column is `_pending_`. 3.3's row updates as 3.3's plan drafts
(after 3.2 lands).

**Verified by:**
[`m3-phase-3-1-plan.md` Contracts item 7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md);
[`m3-demo-mode-auth-bypass.md` Phase Status](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
(the on-disk table this scoping session edits).

## Open decisions to make at plan-drafting

These intentionally defer to plan-drafting because they require
reading on-disk content against actually-merged code at plan-
time, not against the scoping snapshot:

- **Exact Edge Function naming** — `demo-mode-read` vs. another
  name consistent with `supabase/functions/`'s existing naming
  pattern (verb-noun style: `complete-game`, `issue-session`,
  `get-redemption-status`, `redeem-entitlement`,
  `reverse-entitlement-redemption`). Plan-drafting greps the
  directory for the prevailing convention.
- **Per-surface read payload schemas** — the exact shape
  `demo-mode-read` returns for `surface: "admin"` and
  `surface: "redemptions"`. Plan-drafting reads the existing
  `loadDraftEvent`-style call site in
  [`useEventAdminWorkspace`](/apps/web/src/admin/useEventAdminWorkspace.ts)
  and the shape `fetchRedemptionSlices` returns at
  [`redemptionsData.ts:33-70`](/apps/web/src/redemptions/redemptionsData.ts)
  (verified during reality-check) and binds the payload schemas
  to match.
- **Read-only variant component shape per surface** — what the
  bypass branch's read-only render looks like for admin
  (probably the published-event description + a draft preview;
  matching the data the read shim returns), redeem (probably the
  keypad shell with no input + an empty-state hint; or omit the
  redeem surface from 3.2 because
  [`m3-phase-3-1-plan.md` Contracts item 4](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
  notes redeem needs 0 read paths — but it does still need the
  bypass branch to fire, just without read mediation), and
  redemptions (the merged list view, presentation-only). Plan-
  drafting reads the existing signed-in flows
  ([`SignedInEventAdminFlow`](/apps/web/src/pages/EventAdminPage.tsx),
  [`SignedInRedeemFlow`](/apps/web/src/pages/EventRedeemPage.tsx),
  [`SignedInRedemptionsFlow`](/apps/web/src/pages/EventRedemptionsPage.tsx))
  and identifies the data-only subset to render.
- **Self-Review Audit set** against
  [`docs/self-review-catalog.md`](/docs/self-review-catalog.md).
  Plan-drafting walks the catalog. Likely-relevant audits:
  Edge Function authorization-shape audit (yes — new Edge
  Function with allowlist-membership gate); frontend lifecycle
  / async audit (probably — the bypass branch's read-shim call
  is an async data load); rename-aware diff classification
  (no — no renames). Plan-drafting confirms.
- **Validation Gate command list.** Beyond `npm run lint` and
  `npm run build:web`, the plan names the test runners:
  `npm run test` (Vitest), `npm run test:functions` (Deno —
  per-existing wrapper at
  [`scripts/testing/run-supabase-tests.cjs`](/scripts/testing)),
  and the Playwright e2e wrapper for the new fixture
  (`npm run test:e2e:admin` / `:redeem` / `:redemptions` are
  per-surface wrappers; the new fixture may need its own wrapper
  or composes into one of them). Plan-drafting reads
  `package.json` `scripts` and `scripts/testing/` per AGENTS.md
  "Prefer existing wrapper scripts."
- **Commit boundaries.** Likely shape: (1) shared allowlist
  module + tests; (2) Edge Function read shim + tests +
  config.toml entry; (3) apps/web bypass branches + read-only
  variants + DemoModeBanner + e2e fixture. Plan-drafting
  finalizes against the actual edit shape.
- **Doc-edit shape for the "intentionally not touched" docs in
  3.2.** The full M3 doc-currency map is owned by phase 3.3
  (M3-closer); 3.2 lands no doc-currency edits per the milestone
  doc's Documentation Currency section, except for the
  milestone-doc Phase Status table (decision 8) and this plan +
  scoping doc themselves. Plan-drafting confirms the absence of
  3.2-owned doc-currency edits.

## Plan structure handoff

The plan owns these sections per AGENTS.md "Scoping owns / plan
owns":

- Status, Context preamble, Goal
- Cross-Cutting Invariants — **references the milestone doc's
  Cross-Phase Invariants**; names per-phase additions if any.
  3.2-specific candidate additions: "the bypass-branch trigger
  predicate is the AND of `isTestEventSlug(slug)` and
  `sessionState.status === "signed_out"` at every page-component
  bypass site" (decision 2); "mutation controls are absent from
  the bypass-rendered surface in 3.2's diff" (decision 5; 3.3
  re-introduces them). Plan-drafting confirms whether these
  belong as per-phase invariants or as plan-level contracts.
- Naming — `TEST_EVENT_SLUGS`, `isTestEventSlug`,
  `TestEventSlug`, `demo-mode-read`, `DemoModeBanner`,
  read-only variant component names (per-surface; plan-time)
- Contracts — bypass-branch contract (per-page-component shape:
  `if (isTestEventSlug(slug) && sessionState.status ===
  "signed_out") { return <DemoModeShell ... />; }` inserted
  before the existing `signed_out` branch); allowlist-module
  contract (named exports per decision 3); read-shim contract
  (request body shape, response payload per surface,
  allowlist-gate behavior per decision 6); demo-mode banner
  contract (mount site per shell, copy contract per decision 4);
  enforcement-assertion contract (three test layers per
  decision 7); milestone-doc Phase Status edit contract
  (decision 8)
- Files To Touch (estimate-labeled per AGENTS.md "Plan content
  is a mix of rules and estimates")
- Execution Steps (estimate-labeled)
- Commit Boundaries (estimate-labeled)
- Validation Gate
- Self-Review Audits
- Documentation Currency PR Gate — **references the milestone
  doc's Documentation Currency map**; names this PR as
  satisfying only the milestone-doc Phase Status table edit
  (decision 8) plus the scoping/plan doc creation; the broader
  doc-currency map is 3.3's responsibility
- Out Of Scope (final)
- Risk Register — **references the milestone doc's Cross-Phase
  Risks**; names plan-implementation-level risks here
- Backlog Impact — **references the milestone doc's Backlog
  Impact**; names per-phase additions if any

The duplication-reduction discipline is intentional: the plan
binds milestone-level content by reference, not by restatement.

## Reality-check inputs the plan must verify

Plan-drafting re-verifies these at plan-drafting time, not from
the scoping snapshot, per AGENTS.md "Reality-check gate between
scoping and plan":

- **`apps/web/src/App.tsx` shape unchanged since scoping.** The
  routing dispatcher's three bypass-target match blocks at
  lines 21–33, 45–57, 59–71 (verified 2026-05-03 during scoping)
  are the entry points the bypass branches fire from. The
  bypass branch lives inside each page component, not in
  `App.tsx`; `App.tsx` itself is not modified by 3.2.
- **Page-component `signed_out` branch line numbers.** Scoping
  read these on 2026-05-03:
  [`EventAdminPage.tsx:390-408`](/apps/web/src/pages/EventAdminPage.tsx),
  [`EventRedeemPage.tsx:432-447`](/apps/web/src/pages/EventRedeemPage.tsx),
  [`EventRedemptionsPage.tsx:693-707`](/apps/web/src/pages/EventRedemptionsPage.tsx).
  Plan-drafting re-greps because line numbers drift.
- **`useAuthSession` and `useOrganizerForEvent` shape unchanged.**
  The bypass branch composes alongside the existing auth state
  machine (decision 2); plan-drafting confirms the
  `sessionState.status === "signed_out"` discriminant still
  exists at
  [`shared/auth/useAuthSession.ts`](/shared/auth/useAuthSession.ts)
  and that the page components still consume it via direct
  destructure.
- **`get-redemption-status` Edge Function shape unchanged.**
  The new `demo-mode-read` function uses the same DI pattern,
  CORS shape, and service-role-client construction. Plan-
  drafting re-reads
  [`get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts)
  end-to-end at plan-time and binds the new function's contract
  against the on-disk pattern.
- **`supabase/config.toml` `verify_jwt = false` declaration
  pattern.** Verified during scoping that all 9 existing
  functions declare it; the new `demo-mode-read` function
  follows. Plan-drafting confirms the declaration block format.
- **Existing test infrastructure paths.** Scoping verified
  `tests/shared/`, `tests/supabase/functions/`, and
  `tests/e2e/` exist; plan-drafting re-confirms paths and
  reads `package.json` `scripts` for the canonical wrapper
  invocations.
- **Existing shared module conventions.** Scoping verified
  `shared/events/` exists alongside `shared/auth/`,
  `shared/db/`, `shared/styles/`, `shared/urls/`; plan-drafting
  re-confirms `shared/events/` is the right location for the
  new `testEventAllowlist.ts` module.
- **`fetchRedemptionSlices` return shape.** Verified during
  scoping at
  [`redemptionsData.ts:33-70`](/apps/web/src/redemptions/redemptionsData.ts);
  plan-drafting binds the read-shim's `surface: "redemptions"`
  payload to match.
- **Admin draft-load fetcher shape.** Plan-drafting reads
  [`useEventAdminWorkspace`](/apps/web/src/admin/useEventAdminWorkspace.ts)
  at plan-time to identify the canonical admin draft-load
  fetcher (the `loadDraftEvent`-style call) and binds the
  read-shim's `surface: "admin"` payload to match.
- **apps/site `TestEventDisclaimer` for cross-app banner-pattern
  reference.** Decision 4 binds the apps/web `DemoModeBanner` as
  a port of apps/site's `TestEventDisclaimer`; plan-drafting
  reads the on-disk apps/site component to bind the copy /
  visual contract for the apps/web port.

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; phase 3.2 row at the Phase Status
  table; Cross-Phase Invariants the plan binds by reference;
  Cross-Phase Decisions ("Settled at phase-time" subsection
  3.1 added; "Deferred to phase-time" entries this scoping
  session resolves).
- [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md) —
  predecessor phase plan. Contracts items 1–7 are the
  data-access-semantics contract this phase's plan implements;
  item 7's pre-authorized 2-PR fallback is the seam decision 1
  takes.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — parent
  epic; M3 paragraph; Risk Register entry "Demo-mode security
  boundary" the enforcement-assertion in decision 7 mitigates.
- [`m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md) +
  [`scoping/m1-phase-1-1.md`](/docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md) —
  precedent for the scoping/plan split shape this scoping
  session mirrors.
- [`apps/web/src/App.tsx`](/apps/web/src/App.tsx) — apps/web
  routing dispatcher; the entry points to the three bypass-
  target page components.
- [`shared/auth/useAuthSession.ts`](/shared/auth/useAuthSession.ts) —
  the auth state machine the bypass branch composes alongside.
- [`get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts) —
  the unauthenticated-Edge-Function precedent the new read
  shim mirrors.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit catalog plan-drafting walks against this phase's diff
  surface.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-count
  predictions need a branch test," "Scoping owns / plan owns,"
  "Reality-check gate between scoping and plan," "Bans on
  surface require rendering the consequence," "Defer rather
  than over-resolve."
