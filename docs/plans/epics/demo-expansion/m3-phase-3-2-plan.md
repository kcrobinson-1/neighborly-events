# M3 phase 3.2 — Demo-mode bypass: read side

## Status

Proposed.

## Context

The demo-expansion epic surfaces two test events
(`harvest-block-party`, `riverside-jam`) to internal partners
through a marketing/demo experience. M2's home page surfaces
role-door cards into apps/web's authenticated surfaces — admin
authoring, redemption booth, redemption monitoring — with copy
that says "sign in or wait for demo mode" because those surfaces
require auth today. M3 makes those three surfaces reachable for
unauthenticated visitors on the test slugs only, so a partner
walking the role doors can see the full platform shape end-to-end.

This phase ships the **read side** of that bypass. The settled
data-access semantics from
[m3-phase-3-1-plan.md](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts items 1–6 are read-only browse with reads mediated by
an Edge Function shim that holds service-role privileges; this
phase introduces the shared test-event allowlist constant, the
page-component bypass branches in the three target surfaces, the
Edge Function read shim itself, the demo-mode disclaimer cue
that signposts the bypass-rendered surfaces honestly, and the
test assertions that make the allowlist boundary CI-enforceable.
The phase is a coherent shippable state on its own: bypass-
rendered surfaces show read-only data, mutation controls are
absent from the read-only render path (decision 5 in
[scoping/m3-phase-3-2.md](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md)),
and any direct mutation attempt from a hypothetical script
defeats today's existing 401 — exactly the same trust boundary
real events have today.

The **write side** — the five mutation Edge Functions'
`demo_mode_read_only` 403 short-circuit branches, the apps/web
mutation-control disabled-state UI, the apps/web noindex emit
(novel mechanism), the M2 role-door copy revision, and the
M3-closing documentation currency — is phase 3.3's scope. The
2-PR split was pre-authorized in
[m3-phase-3-1-plan.md](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
Contracts item 7 and confirmed by this phase's branch test in
[scoping/m3-phase-3-2.md](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md)
decision 1.

Surfaces this phase touches at the conceptual level: a new
shared TypeScript module under `shared/events/`, three apps/web
page components in `apps/web/src/pages/`, a new apps/web
component for the demo-mode banner, three new read-only variant
components for the per-surface render path, a new Edge Function
under `supabase/functions/demo-mode-read/`, the
`supabase/config.toml` declaration for the new function, and
three test surfaces (Vitest unit test, Deno function test,
Playwright e2e fixture). Doc surface is intentionally narrow:
this phase edits only the milestone doc's Phase Status table to
grow it from one row to two; the broader M3-closing doc-currency
map is 3.3's responsibility.

## Goal

Make the three apps/web bypass-target surfaces reachable for
unauthenticated visitors on the two test-event slugs, with
service-role-mediated reads serving the data each surface needs
to render in read-only form, behind a clearly-signposted demo-
mode disclaimer banner, with CI-enforceable assertions that the
bypass branch never fires on a non-test slug. After this PR:

- `/event/harvest-block-party/admin`,
  `/event/harvest-block-party/game/redeem`,
  `/event/harvest-block-party/game/redemptions`, and the same
  three paths under `/event/riverside-jam/...`, mount for an
  unauthenticated visitor in a read-only render path. No
  `SignInForm` interception fires on those URL combinations.
- The same six URLs continue to render `SignInForm` for any
  signed-out visitor who reaches them via a non-test slug
  (e.g., `/event/madrona-launch-day/admin` retains today's
  behavior unchanged).
- Signed-in visitors on test slugs continue through the
  existing `useOrganizerForEvent` / `authorizeRedeem` /
  `authorizeRedemptions` role gates — the bypass branch is
  AND-gated on `sessionState.status === "signed_out"`, mirroring
  the server-side rejection trigger from
  [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md).
- The bypass-rendered surface carries a top-of-page demo-mode
  disclaimer banner that names the demo status honestly.
- The shared `TEST_EVENT_SLUGS` constant + `isTestEventSlug`
  predicate exist at one location and are imported by every
  TypeScript guard site introduced in this phase (the three
  page-component bypass branches and the new Edge Function's
  allowlist gate).
- A Vitest unit test, a Deno Edge Function test, and a
  Playwright e2e fixture each independently fail CI if the
  bypass branch fires on a non-test slug.

After 3.2 merges, 3.3's plan-drafting runs against this merged
code per
[`m3-demo-mode-auth-bypass.md` Sequencing](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
"Plan-drafting cadence" and ships the write side + M3 closure.

## Cross-Cutting Invariants

This phase binds the four milestone-level invariants from
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
verbatim — single-source-of-truth allowlist, real events never
receive bypass, cross-app demo signaling stays honest,
cross-milestone copy contract revision lands with bypass (the
fourth invariant binds the M2 role-door copy revision in M3's
**closing** PR, which is 3.3 per scoping decision 1; 3.2's diff
does not touch the M2 role-door cards). The plan also inherits
the URL contract, theme route scoping, theme token discipline,
in-place auth, auth integration, and trust-boundary invariants
from the parent epic per the milestone doc's "Inherited from
upstream invariants" paragraph.

**Per-phase additions** (specific to this phase's diff
surface):

- **Bypass-branch trigger predicate is the AND of allowlist
  membership and signed-out state.** Every page-component
  bypass branch this phase introduces fires on
  `isTestEventSlug(slug) && sessionState.status === "signed_out"`
  and only on that exact predicate. No additional ingredient
  (URL parameter, query string, header, env var, build flag,
  or session-scoped flag) participates in the trigger; per
  [`m3-demo-mode-auth-bypass.md` Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
  the Cross-Phase Invariant 2 ban applies here. The
  signed-out conjunct is the client-side mirror of the
  server-side "no auth context is present" predicate from
  [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md);
  binding both sides to the same predicate keeps the
  rendering and rejection sides in agreement on when demo mode
  applies.

- **Bypass-rendered read-only render path contains no mutation
  controls.** The three new read-only variant components
  introduced by this phase render data-only views — admin
  shows the published event description plus a draft preview;
  redemptions shows the merged redemption list; redeem shows
  the keypad shell with no input affordance. Mutation controls
  (Save buttons, publish/unpublish toggles, redeem submit, the
  reverse-redemption affordance) are absent from this phase's
  diff. Phase 3.3 re-introduces them in the chosen
  disabled-state shape per
  [`m3-phase-3-1-plan.md` Contracts item 6](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md);
  3.2's read-only variants do not anticipate the disabled-state
  shape so 3.3's plan-drafting has full freedom to pick.

## Naming

- **`TEST_EVENT_SLUGS`** — `as const` tuple of the two
  test-event slug literals; type
  `readonly ["harvest-block-party", "riverside-jam"]`. Single
  source of truth per Cross-Phase Invariant 1.
- **`TestEventSlug`** — string-literal union derived from
  `TEST_EVENT_SLUGS`; type `(typeof TEST_EVENT_SLUGS)[number]`.
- **`isTestEventSlug`** — predicate
  `(slug: string) => slug is TestEventSlug`. The greppable
  guard-site name; every TypeScript guard site this phase
  introduces consumes the predicate, not the tuple, except
  test fixtures that need to enumerate.
- **`demo-mode-read`** — the new Edge Function (working name;
  final spelling owned by plan-drafting against
  `supabase/functions/`'s prevailing verb-noun convention).
  Validates allowlist server-side, dispatches by `surface`
  discriminator, returns RLS-gated reads with service-role
  privileges.
- **`DemoModeBanner`** — the new apps/web component (working
  name; final spelling plan-time) rendered at the top of the
  bypass branch in each of the three shells. Carries the
  "you're viewing a demo of X for Y" copy contract.
- **`DemoModeAdminView` / `DemoModeRedeemView` /
  `DemoModeRedemptionsView`** — working names for the three
  per-surface read-only variant components (final spellings
  plan-time). Each renders the data-only subset of its
  signed-in counterpart's content. Mounts inside the existing
  shell (`EventAdminShell` / `RedeemShell` / `RedemptionsShell`)
  alongside the `DemoModeBanner`.
- **`fetchDemoModeRead`** — working name for the apps/web
  client-side helper that invokes `demo-mode-read`.
  Per-surface variants (`fetchDemoModeAdmin`,
  `fetchDemoModeRedemptions`) are an alternative shape;
  plan-drafting picks against the call-site shape.
- **`not_in_demo_allowlist`** — working error code returned
  by `demo-mode-read` when the request's `slug` is not in
  the allowlist. Distinct from `demo_mode_read_only` (3.3's
  write-rejection error code per
  [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)).

## Contracts

### Bypass-branch contract (per page component)

Each of the three target page components gains a bypass branch
**before** the existing `signed_out` branch. The shape is
uniform:

```tsx
if (isTestEventSlug(slug) && sessionState.status === "signed_out") {
  return (
    <ExistingShell {...shellPropsForBypass}>
      <DemoModeBanner surface="admin|redeem|redemptions" slug={slug} />
      <DemoMode<Surface>View slug={slug} />
    </ExistingShell>
  );
}
```

Insertion sites (line numbers re-verified at plan-drafting
time per the reality-check inputs in
[scoping/m3-phase-3-2.md](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md);
scoping snapshot read 2026-05-03):

- [`EventAdminPage.tsx:390-408`](/apps/web/src/pages/EventAdminPage.tsx) —
  bypass branch sits before the existing `signed_out` block;
  composes inside `EventAdminShell` with `isSignedIn={false}`,
  `isSigningOut={false}`, and the existing `onNavigateHome`
  callback.
- [`EventRedeemPage.tsx:432-447`](/apps/web/src/pages/EventRedeemPage.tsx) —
  bypass branch sits before the existing `signed_out` block;
  composes inside `RedeemShell` with the existing
  `onNavigateHome` callback. The `surface="redeem"` mode of
  the read shim is **not** invoked (per
  [`m3-phase-3-1-plan.md` Contracts item 4](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
  redeem needs zero read paths); `DemoModeRedeemView` renders
  static keypad-shell content without a fetch.
- [`EventRedemptionsPage.tsx:693-707`](/apps/web/src/pages/EventRedemptionsPage.tsx) —
  bypass branch sits before the existing `signed_out` block;
  composes inside `RedemptionsShell`.

The bypass branch fires only when both conjuncts hold; other
sessionState statuses (`missing_config`, `loading`, `signed_in`)
fall through to today's behavior. The `signed_in` fall-through
preserves the existing role-gate behavior for organizers of test
events who happen to be signed in.

The bypass branch does not modify the existing inline auth
state machine for non-test slugs. Real-event slugs continue
through the existing `signed_out` → `SignInForm` path verbatim.

### Allowlist module contract

New file `shared/events/testEventAllowlist.ts` exports:

- `TEST_EVENT_SLUGS` — `readonly ["harvest-block-party",
  "riverside-jam"]` `as const` tuple
- `TestEventSlug` — string-literal union type
  `(typeof TEST_EVENT_SLUGS)[number]`
- `isTestEventSlug(slug: string): slug is TestEventSlug` —
  predicate with type guard

The two slug literals appear **only** in this file. Every
TypeScript guard site introduced by this phase imports
`isTestEventSlug` (not the tuple) and consumes the predicate,
so the slug-literal-comparison code path lives at one site.
Existing slug literal occurrences cataloged during scoping
(`shared/styles/themes/index.ts:20-21`,
`apps/site/lib/eventContent.ts:73-74`,
`apps/site/events/harvest-block-party.ts`,
`apps/site/events/riverside-jam.ts`,
`apps/site/components/home/HarvestNarrative.tsx`,
`apps/site/components/home/TwoEventShowcase.tsx`,
`apps/site/components/home/RoleDoors.tsx`) are **content-shaped
references** (theme registry, content registry, narrative
references, the M2 home-page hardcoded `DEMO_EVENT_SLUG` in
[RoleDoors.tsx:25](/apps/site/components/home/RoleDoors.tsx) which
the
[RoleDoors.tsx file comment lines 8-12](/apps/site/components/home/RoleDoors.tsx)
deliberately keeps hardcoded so future test-event additions
require an explicit home-page edit) and are **not allowlist
guard sites**; this phase does not refactor them to consume the
allowlist. The Cross-Phase Invariant binds new guard sites,
not pre-existing content references.

### Edge Function read shim contract

New Edge Function `supabase/functions/demo-mode-read/` (or final
naming per plan-drafting) following the structural shape of
[`get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts)
verbatim — dependency-injection-shaped handler factory, CORS
handling via `_shared/cors.ts`, `verify_jwt = false` declaration
in `supabase/config.toml`, `createClient(supabaseUrl,
serviceRoleKey)` for service-role reads.

**Request body shape:**

```
{
  "slug": string,
  "surface": "admin" | "redemptions",
  "payload": <surface-specific>
}
```

**Allowlist gate:**

The function's first validation step (after method and CORS
checks) is `isTestEventSlug(payload.slug)`. If false, return
HTTP 403 with body:

```
{
  "error": "not_in_demo_allowlist",
  "message": "Demo-mode reads are only available for test events."
}
```

**Per-surface dispatch:**

- `surface: "admin"` — resolves slug to event_id against
  `game_event_drafts`, then loads the draft data and the
  published event metadata. Response payload mirrors the data
  shape `useEventAdminWorkspace`'s `loadDraftEvent`-style
  fetcher returns today (exact shape bound at plan-drafting
  time after re-reading
  [`useEventAdminWorkspace`](/apps/web/src/admin/useEventAdminWorkspace.ts)).
- `surface: "redemptions"` — resolves slug to event_id against
  `game_events` (anon-allowed for published events; the
  service-role client is used uniformly), then runs the merged
  redemption-list query
  ([`fetchRedemptionSlices`](/apps/web/src/redemptions/redemptionsData.ts:33-70)
  return shape: `RedemptionRow[]` capped at
  `REDEMPTIONS_FETCH_LIMIT`).

**Response on success:** HTTP 200 with the per-surface payload
shape. **Response on read failure:** HTTP 500 with a generic
error body (matching
[`get-redemption-status/index.ts:206-211`](/supabase/functions/get-redemption-status/index.ts)
precedent).

The function does **not** consume any caller credential
(neither Supabase user JWT nor the signed session cookie
`get-redemption-status` reads). Allowlist membership is the
sole authorization check. This is consistent with the
[`m3-phase-3-1-plan.md` Contracts item 3](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
record: the read shim "validates the allowlist server-side and
returns RLS-gated data with service-role privileges."

### Demo-mode banner contract

New apps/web component (working name `DemoModeBanner`) renders
at the top of the bypass branch in each of the three shells.

**Mount site:** inside the existing
`EventAdminShell` / `RedeemShell` / `RedemptionsShell`'s body
slot, above the per-surface read-only variant component.

**Props:**

- `surface: "admin" | "redeem" | "redemptions"` — discriminator
  for the per-surface copy
- `slug: TestEventSlug` — for the per-event copy

**Copy contract** (working — finalized at plan-drafting against
the rendered component per AGENTS.md "Bans on surface require
rendering the consequence"):

> You're viewing a demo of [the event-authoring workspace |
> the redemption booth | redemption monitoring] for [Harvest
> Block Party | Riverside Jam]. This is read-only. [Sign in](#)
> to manage this event for real.

Per-event copy uses the event's display name from the existing
content module (apps/site `events/<slug>.ts` is not consumed by
apps/web today; the display name is hardcoded in the banner's
copy or resolved through a small lookup helper — plan-drafting
picks). The "Sign in" link points at the page's existing
`SignInForm` URL (the same `/event/<slug>/<surface>?next=…`
pattern the rest of the platform uses, unchanged).

**Visual contract:** ports the apps/site
`TestEventDisclaimer` semantic shape (alert role, distinct
background tone signaling caution-without-warning) into apps/web
SCSS. Plan-drafting reads the apps/site component at plan-time
and binds the visual contract against the on-disk shape.

### Per-surface read-only variant component contracts

Three new components, one per shell. Each renders only the
data-visible portion of its signed-in counterpart's content;
mutation controls (Save, Publish, Unpublish, Submit, Reverse,
input fields that drive mutations) are absent.

- **`DemoModeAdminView`** — renders the published event title
  + description + a preview of the draft questions / prizes /
  schedule data. Reads via `fetchDemoModeRead({ slug, surface:
  "admin" })`. Loading state matches the existing
  `EventAdminShell` loading shape.
- **`DemoModeRedeemView`** — renders the keypad-shell layout
  with no input affordance and a brief explanation that
  redemption codes are read-only in demo mode. No fetch; the
  component is fully static beyond the slug-derived copy.
- **`DemoModeRedemptionsView`** — renders the merged
  redemption-list view, presentation-only (no row-detail sheet
  with mutation actions). Reads via `fetchDemoModeRead({ slug,
  surface: "redemptions" })`.

Each component takes the slug as a prop and is unaware of the
auth state (the bypass branch's `sessionState.status ===
"signed_out"` conjunct is the page-component-level gate; the
variant components are unconditional renderers).

### Enforcement-assertion contract

Three independent test layers, each ships in this phase's PR:

1. **Vitest unit test**
   `tests/shared/events/testEventAllowlist.test.ts`. Asserts:
   - `TEST_EVENT_SLUGS` contains exactly
     `["harvest-block-party", "riverside-jam"]` and no other
     entries
   - `isTestEventSlug("harvest-block-party") === true`
   - `isTestEventSlug("riverside-jam") === true`
   - `isTestEventSlug("madrona-launch-day") === false`
   - `isTestEventSlug("") === false`
   - `isTestEventSlug("harvest-block-partyy") === false`
     (regression coverage against suffix-match drift)
2. **Deno Edge Function test**
   `tests/supabase/functions/demo-mode-read.test.ts` (or the
   path matching the existing convention; plan-drafting
   confirms by inspecting `tests/supabase/functions/`'s
   shape). Asserts:
   - Request with `slug: "madrona-launch-day"` (or any
     non-test slug) returns HTTP 403 with body
     `{ "error": "not_in_demo_allowlist", ... }`
   - Request with `slug: "harvest-block-party"` and
     `surface: "admin"` returns HTTP 200 with the expected
     payload shape (mocked DB response via the DI pattern)
   - Request with `slug: "harvest-block-party"` and
     `surface: "redemptions"` returns HTTP 200 with the
     expected payload shape (mocked DB response)
   - Request with malformed body (missing slug, missing
     surface, unknown surface value) returns HTTP 400
3. **Playwright e2e fixture** under
   `tests/e2e/demo-mode-bypass/` (plan-drafting confirms the
   path against the existing `tests/e2e/` shape). Two
   scenarios:
   - Visiting `/event/<some-real-slug>/admin` while signed-out
     renders `SignInForm` (no bypass branch fires; the existing
     auth-state-machine path is unchanged)
   - Visiting `/event/harvest-block-party/admin` while
     signed-out renders the bypass branch with the
     `DemoModeBanner` present (asserted via locator on the
     banner's `role="alert"` and the banner copy)

### Milestone-doc Phase Status table edit contract

This phase's PR edits
[`m3-demo-mode-auth-bypass.md` Phase Status table](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
to grow it from one row (3.2 alone) to two rows (3.2 + 3.3) per
[`m3-phase-3-1-plan.md` Contracts item 7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)'s
"the milestone doc's Phase Status table grows accordingly at
3.2's plan-drafting time" instruction. Pre-edit row state and
post-edit row state:

- **Pre-edit (current state):** one 3.2 row with title
  "Implement chosen demo-mode bypass + M3 closure," Plan
  column `_pending 3.2 phase planning_`, Status `Proposed`,
  PR `_pending`.
- **Post-edit (this phase's milestone-doc edit):** two rows.
  3.2 row with title "Demo-mode bypass — read side," Plan
  column linking to
  `m3-phase-3-2-plan.md` (this file), Status `Proposed`, PR
  `_pending`. 3.3 row with title "Demo-mode bypass — write
  side + M3 closure," Plan column `_pending 3.3 phase
  planning_`, Status `Proposed`, PR `_pending`. The post-table
  prose paragraph naming the M3-closing responsibility
  ("travels with whichever phase ships last") is updated to
  refer to 3.3 explicitly now that the split is settled.

When this PR merges, 3.2's Status flips `Proposed` → `Landed`
in the same PR per AGENTS.md "Plan-to-PR Completion Gate."

## Files To Touch

This list is the planner's **estimate** of the expected diff
shape per AGENTS.md "Plan content is a mix of rules and
estimates"; implementation may revise when a structural call
requires deviating, recorded in the PR body's
`## Estimate Deviations` section.

### New

- `shared/events/testEventAllowlist.ts` — the shared allowlist
  module per the allowlist-module contract.
- `tests/shared/events/testEventAllowlist.test.ts` — Vitest
  unit test per the enforcement-assertion contract layer 1.
- `supabase/functions/demo-mode-read/index.ts` — the new Edge
  Function read shim per the read-shim contract. The path may
  vary if `supabase/functions/` uses a different per-function
  layout (some functions split test-only fixtures into
  subdirectories); plan-drafting confirms against the existing
  shape.
- `tests/supabase/functions/demo-mode-read.test.ts` — Deno
  Edge Function test per the enforcement-assertion contract
  layer 2.
- `apps/web/src/components/DemoModeBanner.tsx` (final path
  plan-time) — the new banner component per the banner
  contract.
- `apps/web/src/admin/DemoModeAdminView.tsx` (final path
  plan-time) — admin read-only variant per the variant
  contract.
- `apps/web/src/redeem/DemoModeRedeemView.tsx` — redeem
  read-only variant per the variant contract.
- `apps/web/src/redemptions/DemoModeRedemptionsView.tsx` —
  redemptions read-only variant per the variant contract.
- `apps/web/src/lib/fetchDemoModeRead.ts` (final path
  plan-time) — apps/web client-side helper that invokes
  `demo-mode-read`.
- `tests/e2e/demo-mode-bypass/` — new Playwright fixture
  directory per the enforcement-assertion contract layer 3.
  The exact file shape (one spec file, multiple) follows
  `tests/e2e/`'s existing per-feature shape; plan-drafting
  confirms.
- `apps/web/src/styles/_demo-mode.scss` (or partial inclusion
  in an existing partial; plan-drafting picks) — SCSS for
  the demo-mode banner and read-only variants per the
  visual contract.

### Modify

- [`apps/web/src/pages/EventAdminPage.tsx`](/apps/web/src/pages/EventAdminPage.tsx) —
  bypass branch insertion per the bypass-branch contract.
  Imports for `isTestEventSlug`, `DemoModeBanner`, and
  `DemoModeAdminView` added.
- [`apps/web/src/pages/EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx) —
  bypass branch insertion per the bypass-branch contract.
- [`apps/web/src/pages/EventRedemptionsPage.tsx`](/apps/web/src/pages/EventRedemptionsPage.tsx) —
  bypass branch insertion per the bypass-branch contract.
- [`supabase/config.toml`](/supabase/config.toml) —
  `[functions.demo-mode-read] verify_jwt = false` declaration
  added, mirroring the existing 9 declarations.
- [`docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  Phase Status table grows from 1 row to 2 rows per the
  milestone-doc Phase Status edit contract; the post-table
  prose paragraph updates accordingly. Status flip on the
  3.2 row from `Proposed` → `Landed` happens in this same
  PR at merge time.

### Intentionally not touched

This list is the planner's **estimate** of files this phase
does not need to touch per AGENTS.md "Plan content is a mix of
rules and estimates" — the list reads as guidance, not as a
hard prohibition. If implementation surfaces a structural call
that requires touching one of these, the deviation lands per
the "Estimate Deviations" callout.

- [`apps/web/src/App.tsx`](/apps/web/src/App.tsx) — the routing
  dispatcher's match blocks remain unchanged. The bypass branch
  lives inside the page components, not the dispatcher. The
  ThemeScope wraps M1 phase 1.1 added still surround all four
  event-route shells; bypass-rendered surfaces inherit them.
- [`shared/auth/useAuthSession.ts`](/shared/auth/useAuthSession.ts) —
  the auth state machine is unchanged; the bypass branch
  composes alongside its `signed_out` discriminant.
- [`shared/auth/useOrganizerForEvent.ts`](/shared/auth/useOrganizerForEvent.ts),
  [`apps/web/src/redeem/authorizeRedeem.ts`](/apps/web/src/redeem/authorizeRedeem.ts),
  [`apps/web/src/redemptions/authorizeRedemptions.ts`](/apps/web/src/redemptions/authorizeRedemptions.ts) —
  the per-event role hooks are unchanged. Signed-in visitors
  on test slugs still consume them.
- [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts),
  [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts),
  [`apps/site/events/`](/apps/site/events/) — content-shaped
  slug literals remain hardcoded per the allowlist-module
  contract's "content references are not guard sites"
  framing.
- [`apps/site/components/home/RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx) —
  the M3-closer copy revision (the "wait for demo-mode access
  in M3" → revised copy) is phase 3.3's deliverable per the
  milestone-doc Cross-Phase Invariant 4 and the
  [milestone-doc Sequencing](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
  arrow `M2 --> P32` framing (which now points at 3.3 because
  the M3-closing responsibility lands with the last-shipping
  phase per
  [`m3-phase-3-1-plan.md` Contracts item 7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)).
  3.2 does not touch this file.
- The five mutation Edge Functions (`save-draft`,
  `publish-draft`, `unpublish-event`, `redeem-entitlement`,
  `reverse-entitlement-redemption`) — the
  `demo_mode_read_only` 403 short-circuit branches are 3.3's
  scope per
  [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
  + scoping decision 1.
- All apps/web mutation paths and request-payload constructors —
  3.3 picks whether to carry slug in the request body for the
  403 differentiation pattern; 3.2 does not edit mutation paths.
- All apps/web head-tag handling — the noindex emit for
  bypass-rendered routes is 3.3's deliverable. apps/web has
  no existing head-tag injection mechanism (verified during
  scoping reality-check); 3.3 picks the mechanism per AGENTS.md
  "Spike before plan for novel mechanisms."
- `README.md`, `docs/architecture.md`, `docs/product.md`,
  `docs/operations.md`, `docs/styling.md`, `docs/backlog.md`
  — the M3-closing doc-currency map is 3.3's responsibility per
  [`m3-demo-mode-auth-bypass.md` Documentation Currency](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md).
- The epic Milestone Status table at
  [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — flips
  M3 row `Proposed` → `Landed` only when the M3-closing PR
  merges (3.3), not when 3.2 merges.
- Top-level Status of
  [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  flips `Proposed` → `Landed` at M3 close (3.3), not at 3.2
  merge. 3.2's PR only flips the **3.2 row's** Status in the
  Phase Status table.

## Execution Steps

This sequence is the planner's **estimate** of the expected
execution shape per AGENTS.md "Plan content is a mix of rules
and estimates"; the implementer may refine.

1. **Branch hygiene.** Off `main` (clean worktree). Branch name
   follows repo convention — likely
   `plan/m3-phase-3-2-demo-mode-read-side`.
2. **Baseline validation.** `npm run lint`, `npm run build:web`
   (confirm green pre-edit).
3. **Reality-check re-run.** Re-verify the inputs named in
   [scoping/m3-phase-3-2.md → Reality-check inputs](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md).
   Specifically: page-component `signed_out` line ranges,
   `useAuthSession` shape, `get-redemption-status` shape,
   `supabase/config.toml` declaration pattern,
   `tests/supabase/functions/`'s naming convention,
   `tests/e2e/`'s per-feature directory shape,
   `useEventAdminWorkspace`'s draft-load fetcher shape,
   `fetchRedemptionSlices` return shape, apps/site
   `TestEventDisclaimer` visual contract.
4. **Allowlist module + unit test.** Create
   `shared/events/testEventAllowlist.ts` per the contract;
   create
   `tests/shared/events/testEventAllowlist.test.ts` per
   enforcement-assertion contract layer 1. Run Vitest.
5. **Edge Function read shim + Deno test.** Create
   `supabase/functions/demo-mode-read/index.ts` mirroring the
   `get-redemption-status` DI pattern; add the `[functions.demo-
   mode-read]` block to `supabase/config.toml`. Create the Deno
   test per layer 2. Run `npm run test:functions` (or the
   actual existing wrapper — plan re-confirms).
6. **apps/web bypass-branch wiring.** Edit the three page
   components per the bypass-branch contract. Create
   `DemoModeBanner`, the three `DemoMode*View` components, and
   `fetchDemoModeRead`. Create the `_demo-mode.scss` partial
   (or extend an existing one). Run `npm run lint` +
   `npm run build:web`.
7. **Visual review of banner + variants.** Run
   `npm run dev:web` (or the local apps/web dev server
   wrapper — plan-time re-confirms) and load
   `/event/harvest-block-party/admin` and
   `/event/harvest-block-party/game/redemptions` while
   signed-out. Confirm the banner renders, the read-only
   variants render data, no mutation controls are visible. Per
   AGENTS.md "Bans on surface require rendering the
   consequence," the absence of mutation controls is
   verified visually before declaring 3.2 complete.
8. **e2e fixture.** Create the Playwright fixture per layer 3.
   Run via the canonical wrapper (plan-drafting picks against
   `package.json` `scripts` per AGENTS.md "Prefer existing
   wrapper scripts" — likely a new wrapper for the bypass
   suite, or composition into one of `:admin`, `:redeem`,
   `:redemptions`).
9. **Milestone-doc Phase Status table edit.** Grow the table
   from 1 row to 2 rows per the milestone-doc edit contract.
10. **Status flip.** This plan's Status `Proposed` → `Landed`
    in the same PR.
11. **Validation pre-PR.** Re-run `npm run lint`,
    `npm run build:web`, `npm run test`, the Deno function
    runner, and the new e2e fixture. All green.
12. **Open PR.** Vercel produces preview URL on push. PR body
    names the Validation Gate procedure outcomes, the
    `## Estimate Deviations` callout (or `N/A`), and the
    Self-Review Audit findings.
13. **Self-review pass.** Walk the audits named in
    "Self-Review Audits" below; AGENTS.md "Plan-to-PR
    Completion Gate" walk; the four milestone-doc Cross-Phase
    Invariants walked against this PR's diff per the milestone
    doc's "self-review walks each one against every phase's
    actual changes" instruction. Of those four, invariants 1
    (single source of truth) and 2 (real events never receive
    bypass) are directly bound by this phase's code; invariant
    3 (cross-app demo signaling) is bound by the
    `DemoModeBanner` mount; invariant 4 (cross-milestone copy
    contract) is satisfied by 3.3, not by this phase, and the
    walk records "the invariant binds 3.3, not 3.2" rather
    than asserting it is unrelated.
14. **PR ready for review.**

## Commit Boundaries

Pre-implementation **estimate** per AGENTS.md "Plan content is
a mix of rules and estimates":

- **Commit 1 — shared allowlist module + unit test.**
  `shared/events/testEventAllowlist.ts` + the Vitest test.
  Self-contained; reviewable as a one-file plus one-test
  surface.
- **Commit 2 — Edge Function read shim + Deno test +
  config.toml.** `supabase/functions/demo-mode-read/`,
  `supabase/config.toml` declaration, Deno test fixture.
  Reviewable as a coherent server-side surface.
- **Commit 3 — apps/web bypass branches + variants + banner +
  helper + SCSS.** The three page components' bypass branches,
  the four new components (banner + three variants), the
  client helper, the SCSS partial. Reviewable as the apps/web
  read-rendering surface.
- **Commit 4 — Playwright e2e fixture.** The new fixture
  directory under `tests/e2e/`.
- **Commit 5 — milestone-doc Phase Status edit + Status flip.**
  Doc-only commit; separable from the code review.
- **Optional Commit 6+ — review-fix commits.** Per AGENTS.md
  "PR-sized work, name the intended commit boundaries before
  editing when practical, and keep review-fix commits distinct
  when they clarify the history."

## Validation Gate

The validation procedure that proves this PR ships its goal:

- **`npm run lint`** — green. The bypass branches and new
  components type-check; no new TypeScript errors.
- **`npm run build:web`** — green. The wrap diff compiles, no
  new SCSS warnings.
- **`npm run test`** (Vitest) — green. The new
  `testEventAllowlist` unit test passes; no existing test
  regresses.
- **Deno Edge Function test** (`npm run test:functions` or
  whichever wrapper exists per `package.json` `scripts` —
  plan-drafting confirms) — green. The new
  `demo-mode-read.test.ts` passes; no existing function
  test regresses.
- **Playwright e2e fixture** (the canonical wrapper for the
  new fixture — plan-drafting picks against `package.json`
  `scripts` and `scripts/testing/`) — green. Both scenarios
  pass: the bypass-fires-on-test-slug positive case and the
  bypass-does-not-fire-on-real-slug negative case.
- **Manual visual check on Vercel preview deployment.**
  Visit `/event/harvest-block-party/admin`,
  `/event/harvest-block-party/game/redeem`, and
  `/event/harvest-block-party/game/redemptions` while
  signed-out; confirm the `DemoModeBanner` renders at the top
  of each shell, the read-only variant renders, and no
  mutation controls are visible. Repeat for `riverside-jam`.
  Visit `/event/<some-non-test-slug>/admin` (e.g., a
  hypothetical `madrona-launch-day` if registered, otherwise
  any non-allowlist slug) and confirm `SignInForm` renders as
  today. Capture pairs attached to the PR body's Validation
  section. The procedure's falsifier is "any test-slug URL
  shows `SignInForm` instead of the demo banner, OR any
  non-test slug URL shows the demo banner instead of
  `SignInForm`, OR a mutation control is visible on a
  bypass-rendered surface."
- **Plan-to-PR Completion Gate walk.** Every Goal, Self-Review
  audit, Validation step, and Documentation Currency entry
  named in this plan is satisfied or explicitly deferred-with-
  rationale-in-this-plan before the PR opens.
- **Estimate Deviations callout in PR body.** Per AGENTS.md,
  the PR body names any deviation from this plan's estimate-
  shaped sections (Files to touch, Execution Steps, Commit
  Boundaries) under `## Estimate Deviations`, or `N/A` if
  none.

The validation gate does **not** include a Tier 5 post-deploy
production check. The bypass branch is a pure JSX+fetcher
change with one new Edge Function; the Edge Function deploys
through the standard Supabase pipeline; preview-deployment-
based verification is the canonical tier per
[`docs/testing-tiers.md`](/docs/testing-tiers.md). Status flips
to `Landed` in this PR, not `In progress pending prod smoke`.

## Self-Review Audits

Plan-drafting walks
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
against this PR's diff surfaces and records the findings here.
The diff covers four surfaces — apps/web routing (page
components + new components), Edge Function (new function with
service-role reads + allowlist gate), test infrastructure
(Vitest + Deno + Playwright), and a focused doc edit
(milestone-doc Phase Status). Likely-relevant audits at scoping
time:

- **Edge Function authorization-shape audit** — the new
  function asserts allowlist membership as the sole
  authorization check; service-role reads bypass RLS. The
  audit walks: is the allowlist check the *first* validation
  after method/CORS? Is the service-role-key path scoped only
  to the post-allowlist-check branch? Are RLS-gated rows the
  function returns deliberately scoped to test events?
- **Frontend lifecycle / async audit** — the bypass branch's
  `fetchDemoModeRead` call is an async data load; the
  variant components manage their own loading / error states.
  The audit walks: are loading states rendered? Are error
  states rendered with falsifiable copy? Is there an effect-
  cleanup path if the component unmounts mid-fetch?
- **Cross-app destination navigation audit** — the
  `DemoModeBanner`'s "Sign in" link points at the existing
  page's `SignInForm` URL. The audit walks: is the link
  destination in-app (the same apps/web SPA route, so a
  client-side `<a>` is correct), or cross-app (would need
  hard-navigation per AGENTS.md "Cross-app destinations need
  hard navigation")?
- **CI / testing infrastructure audit** — three new test
  surfaces. The audit walks: do the tests run via the
  canonical wrapper scripts? Is the fixture directory at the
  conventional path? Does the e2e fixture clean up after
  itself? Does the Deno test mock its dependencies via the
  existing DI pattern rather than reaching for a different
  testing shape?

Plan-drafting confirms which catalog audits actually apply at
plan-time and refines this list. The implementer walks the
catalog at PR time; if any named audit applies that wasn't
anticipated, the discovery is recorded and walked, not absorbed
silently.

The implementer also walks the milestone-doc-level invariants
(per the Execution Steps step 13 self-review pass):

- **Cross-Phase Invariant 1 — single source of truth** — the
  bypass branches, the Edge Function allowlist gate, and the
  test fixtures all import `isTestEventSlug` from
  `shared/events/testEventAllowlist.ts`; no slug literal
  appears at any guard site introduced by this phase.
- **Cross-Phase Invariant 2 — real events never receive
  bypass** — the bypass branch fires only on
  `isTestEventSlug(slug) && sessionState.status ===
  "signed_out"`; no environment flag, URL parameter, header,
  or session-scoped flag participates in the trigger; the
  e2e fixture's negative scenario exercises the
  non-test-slug case.
- **Cross-Phase Invariant 3 — cross-app demo signaling stays
  honest** — the `DemoModeBanner` renders at the top of every
  bypass-rendered shell with copy that names the demo status.
- **Cross-Phase Invariant 4 — cross-milestone copy contract** —
  binds 3.3, not 3.2. The walk records the deferral; no
  3.2 diff touches the M2 role-door cards.

## Documentation Currency PR Gate

Reference:
[`m3-demo-mode-auth-bypass.md` Documentation Currency](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md).

This PR satisfies these entries from that map:

- **This milestone doc — Phase Status table** — grown from 1
  row to 2 rows per the milestone-doc Phase Status edit
  contract (the milestone doc's Documentation Currency entry
  for the milestone doc itself names "Phase Status table
  updates as each phase's plan drafts"; this scoping session
  is the 3.2 plan-drafting moment).

This PR does **not** satisfy any of the other milestone-doc
Documentation Currency entries (README, architecture,
operations, product, styling, backlog, milestone-doc
top-level Status, epic Milestone Status table, M2 role-door
copy contract revision). Those are 3.3's responsibility per
the milestone doc's "Owned by the M3-closing phase" assignments
and the
[`m3-phase-3-1-plan.md` Contracts item 7](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md)
"M3-closing responsibility travels with whichever phase ships
last" rule.

## Out Of Scope

Final, not deliberation. Items here are explicitly excluded
from this PR's diff:

- Edge Function write rejection branches in the five mutation
  functions (`save-draft`, `publish-draft`, `unpublish-event`,
  `redeem-entitlement`, `reverse-entitlement-redemption`).
  Phase 3.3 owns the `demo_mode_read_only` 403 short-circuit
  per
  [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md).
- Mutation-control disabled-state UI on bypass-rendered
  surfaces. Phase 3.3 picks the disabled-with-tooltip /
  hidden / click-and-error shape per
  [`m3-phase-3-1-plan.md` Contracts item 6](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md);
  3.2's read-only variants render no mutation controls at
  all per scoping decision 5.
- apps/web noindex emit on bypass-rendered routes. Novel
  mechanism (apps/web has no existing head-tag injection
  per scoping reality-check); phase 3.3 picks the mechanism
  per AGENTS.md "Spike before plan for novel mechanisms."
- The M2 role-door copy revision in
  [`apps/site/components/home/RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx) —
  M3-closing deliverable per Cross-Phase Invariant 4 and
  scoping decision 1.
- Slug carriage in mutation request bodies. The 403
  differentiation pattern (slug-in-body vs.
  slug-from-event-id-lookup) is 3.3's plan-drafting choice.
- The full M3-closing doc-currency map (README, architecture,
  operations, product, styling, backlog, milestone-doc
  top-level Status, epic Milestone Status table). Phase 3.3
  ships these per the milestone doc's
  [Documentation Currency](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
  assignments.
- A demo-mode-state-reset surface, seeded redemption codes,
  pre-populated organizer monitoring data. M4 deliverables;
  the milestone-doc Goal section explicitly lists these as
  what M3 does **not** ship.
- Demo-mode generalization beyond the test-event allowlist
  (per-tenant config, plugin hook, admin "register an event
  as demo-mode" surface). Epic Out-Of-Scope; post-epic backlog
  item.
- Tier 5 in-progress-pending Status pattern. The bypass branch
  is preview-deployable + verifiable end-to-end pre-merge;
  Status flips directly to `Landed` per AGENTS.md "Plan-to-PR
  Completion Gate" default.
- Refactoring pre-existing slug literals in
  `shared/styles/themes/index.ts`,
  `apps/site/lib/eventContent.ts`,
  `apps/site/events/`,
  `apps/site/components/home/HarvestNarrative.tsx`,
  `apps/site/components/home/TwoEventShowcase.tsx`,
  `apps/site/components/home/RoleDoors.tsx`. These are
  content-shaped references, not allowlist guard sites
  (per the allowlist-module contract); refactoring them to
  consume the allowlist would couple content semantics with
  bypass semantics, exactly the trap the milestone doc's
  Cross-Phase Decision "Allowlist constant lives in code, not
  in env config" reasoning flags.
- pgTAP test for allowlist enforcement. The
  Edge-Function-mediated read pattern phase 3.1 settled
  introduces no SQL helper that would consume the allowlist;
  pgTAP is the wrong tool for the failure mode this phase's
  Vitest + Deno + Playwright coverage protects against. This
  rules out the milestone-doc-Risk-Register-named "pgTAP or
  equivalent assertions" mitigation in its pgTAP form; the
  three Vitest + Deno + e2e layers are the "or equivalent"
  satisfier.

## Risk Register

Reference:
[`m3-demo-mode-auth-bypass.md` Cross-Phase Risks](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
for milestone-level risks (allowlist drift between guard sites;
3.1's chosen semantics shifts during 3.2 implementation; RLS
broadening accidentally extends to non-test events; copy
contract revision missed at M3 closure; M4 pulls forward into
M3 unintentionally).

Plan-implementation-level risks not already covered:

- **Read-only variant component scope creep.** Each
  `DemoMode<Surface>View` renders the data-only subset of its
  signed-in counterpart's content. The risk is that
  implementation reaches for "and we should also surface X"
  on the read-only variant — e.g., adding a partial schedule
  preview when the signed-in admin shows the full schedule —
  pulling work that belongs in M4's "richer demo data shape"
  backlog item into 3.2. *Mitigation:* the variant contract
  binds "data-only subset of the signed-in counterpart's
  content"; self-review walks the diff against the contract;
  any extension that surfaces during implementation goes to
  the M4 backlog, not into 3.2.

- **Edge Function payload schema divergence from apps/web
  fetcher expectations.** The read shim returns per-surface
  payloads that the bypass-branch components expect to match
  the existing fetchers' return shapes
  (`useEventAdminWorkspace`'s draft-load shape; the
  `RedemptionRow[]` shape from
  [`fetchRedemptionSlices`](/apps/web/src/redemptions/redemptionsData.ts)).
  If the function's shape drifts from the fetcher's shape,
  the variant components surface type errors at build time
  (caught by `npm run build:web`) or runtime errors at the
  preview deploy. *Mitigation:* plan-drafting reads the
  on-disk fetchers and binds the function's payload schemas
  against them with named TypeScript types reused on both
  sides (the function imports the apps/web type, or a shared
  type lives under `shared/`); the Deno test fixture asserts
  the response shape matches.

- **Bypass branch composes incorrectly with the existing auth
  state machine.** The bypass branch sits before the
  existing `signed_out` block but after the
  `missing_config` and `loading` blocks. If the implementer
  inserts it at the wrong site, signed-out test-slug visitors
  could see `SignInForm` (insertion too late) or
  signed-in / loading-state visitors could see the bypass
  branch (insertion too early). *Mitigation:* the
  bypass-branch contract binds the insertion point relative
  to the existing `signed_out` check; the Playwright fixture
  exercises the test-slug-signed-out path and the
  non-test-slug-signed-out path, catching either misplacement.
  The signed-in case is exercised manually during the visual
  review step (the implementer signs in to the staging-
  account during preview verification, confirms test-slug
  signed-in still goes to the role gate).

- **Visual review false-pass on missing mutation controls.**
  AGENTS.md "Bans on surface require rendering the
  consequence" applies: the read-only variants must look
  read-only end-to-end. The risk is that a glance-pass
  misses a mutation control buried in a sub-section (e.g.,
  the redemptions list might have inline "reverse" affordances
  on each row that a top-of-page review doesn't notice).
  *Mitigation:* the visual review step (Execution Steps
  step 7) walks each rendered surface against its signed-in
  counterpart explicitly — the falsifier is "any control
  that mutates state is reachable on the read-only render
  path"; the e2e fixture asserts the absence of specific
  mutation-control locators (Save buttons, publish toggles,
  redeem submit, reverse-row affordances) by name.

- **Allowlist module location refactored after 3.2 lands.**
  The decision to put the module under `shared/events/`
  (scoping decision 3) is based on existing shared-module
  conventions verified at scoping time. If a future
  refactor moves shared modules around, the import paths
  this phase introduces would break. *Mitigation:* not
  3.2's risk — the import paths point at a module that
  exists at PR-merge time; future refactors update import
  paths as part of their own scope.

## Backlog Impact

Reference:
[`m3-demo-mode-auth-bypass.md` Backlog Impact](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
for milestone-level backlog impact.

Items closed by 3.2's PR:

- None at the phase level. The milestone-level "demo-mode
  access to admin / redeem / redemptions surfaces for
  test-event slugs without sign-in" capability is partially
  delivered by 3.2 (read-rendering reachable; write-side
  hardening pending 3.3) but the capability entry closes only
  when M3 ships in full at 3.3.

Items unblocked by 3.2's PR (but not landed):

- Phase 3.3 plan-drafting becomes runnable against the
  canonical merged read-side surface — the page-component
  bypass branches, the Edge Function read shim, the
  `DemoModeBanner`, and the read-only variants are real
  artifacts 3.3's plan-drafting reads (per AGENTS.md "Phase
  Planning Sessions" cadence) when picking the
  mutation-control disabled-state shape and the noindex
  emit mechanism.

Items added by 3.2's PR for post-M3 work:

- None at the phase level. The post-epic items already named
  in the epic Backlog Impact (demo-mode generalization beyond
  test-event allowlist; production-friendly demo-mode for
  partner-onboarding scenarios) remain unchanged.

The 3.1 plan's "partner-feedback capture mechanism for
demo-mode surfaces" backlog addition stays an open
M3-closing-phase deliverable per
[`m3-phase-3-1-plan.md` Backlog Impact](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md);
3.2 does not edit `docs/backlog.md`.

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc. Owns Cross-Phase Invariants,
  Documentation Currency map, Cross-Phase Risks, Backlog
  Impact this plan binds by reference.
- [`scoping/m3-phase-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md) —
  scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the eight scoping decisions absorbed
  above; deletes in batch with sibling scoping docs at the
  milestone-terminal PR per AGENTS.md "Phase Planning
  Sessions → Output set."
- [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md) —
  predecessor phase plan. Contracts items 1–7 are the
  data-access-semantics contract this phase implements.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic. Risk Register entry "Demo-mode security
  boundary" the enforcement-assertion contract mitigates.
- [`m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md) —
  precedent for scoping/plan split shape and references-not-
  restatement discipline.
- [`apps/web/src/App.tsx`](/apps/web/src/App.tsx) — apps/web
  routing dispatcher; intentionally not touched, but its
  ThemeScope wraps M1 phase 1.1 added still apply to
  bypass-rendered surfaces.
- [`apps/web/src/pages/EventAdminPage.tsx`](/apps/web/src/pages/EventAdminPage.tsx),
  [`apps/web/src/pages/EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx),
  [`apps/web/src/pages/EventRedemptionsPage.tsx`](/apps/web/src/pages/EventRedemptionsPage.tsx)
  — the three page components whose `signed_out` branches the
  bypass branch composes beside.
- [`shared/auth/useAuthSession.ts`](/shared/auth/useAuthSession.ts) —
  the auth state machine the bypass branch's signed-out
  conjunct discriminates against.
- [`supabase/functions/get-redemption-status/index.ts`](/supabase/functions/get-redemption-status/index.ts) —
  the unauthenticated-Edge-Function precedent the new
  `demo-mode-read` shim mirrors.
- [`supabase/config.toml`](/supabase/config.toml) — the file
  the new `[functions.demo-mode-read]` declaration extends.
- [`apps/web/src/redemptions/redemptionsData.ts`](/apps/web/src/redemptions/redemptionsData.ts) —
  the existing redemptions fetcher whose return shape the
  read shim's `surface: "redemptions"` payload mirrors.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit catalog walked at PR time.
- [`docs/testing-tiers.md`](/docs/testing-tiers.md) — tier
  reference for the Validation Gate's "preview-deployment-
  based verification is canonical, no Tier 5 follow-up"
  framing.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions,
  Plan-to-PR Completion Gate, "Plan content is a mix of rules
  and estimates," Estimate Deviations callout, "Bans on
  surface require rendering the consequence," "PR-count
  predictions need a branch test," "Cross-app destinations
  need hard navigation," "Prefer existing wrapper scripts."
