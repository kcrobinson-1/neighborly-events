# M3 Phase 3.3 — Demo-Mode Bypass Write Side + M3 Closure

## Status

In draft.

This plan is in active multi-pass drafting per AGENTS.md
"`In draft` → `Proposed` promotion gate." The pending resolution
is the apps/web noindex emit mechanism spike per Contracts
section "noindex emit (`useNoindex()`)" — a 30-minute throwaway
spike that exercises the chosen `useNoindex()` hook against
`vercel dev` to confirm meta-tag presence under React's
render-then-effect lifecycle and StrictMode double-invocation.
On spike completion (or fallback to react-helmet-async if a
dealbreaker surfaces), this plan flips `In draft` → `Proposed`
after the comprehensive promotion-gate self-review. The
implementing PR then flips `Proposed` → `Landed` per AGENTS.md
"Plan-to-PR Completion Gate." No commit SHAs are recorded in
the Status block (`git log` and `git blame` are authoritative).

## Context

Phase 3.3 closes M3 of the demo-expansion epic. The milestone's
goal — make the three currently-auth-gated apps/web event-route
surfaces (`/event/:slug/admin`, `/event/:slug/game/redeem`,
`/event/:slug/game/redemptions`) reachable without sign-in on the
two test-event slugs (`harvest-block-party`, `riverside-jam`),
read-only — was partially delivered by 3.2 (the read side is
reachable; mutation controls are absent from the bypass-rendered
surface; mutations against the existing 401-defended Edge
Functions still bounce). 3.3 ships the missing pieces:

1. **Five mutation Edge Functions' `demo_mode_read_only` 403
   short-circuit branches.** Each function gains a server-side
   rejection branch (HTTP 403, structured body) before its
   existing auth gate when the request's `eventId` resolves to
   an allowlist slug AND no auth context is present. The
   resolve + check + format logic is encapsulated in a new
   shared helper to avoid 5-function duplication.
2. **apps/web mutation-control disabled-state UI on the three
   bypass-rendered surfaces.** Each mutation control
   (admin Save / Publish / Unpublish / Confirm / Cancel,
   redeem keypad submit, redemptions reverse / confirm-reversal /
   retry) re-introduces into the bypass branch in
   disabled-with-tooltip state. The partner walking the demo
   sees the workspace's full shape with controls inert — a
   demo of the workspace, not a demo of the data.
3. **apps/web noindex emit on bypass-rendered routes.** A new
   `useNoindex()` hook injects `<meta name="robots"
   content="noindex, nofollow">` into the document head for the
   duration of the bypass branch's mount. Mirrors the
   apps/site test-event noindex posture.
4. **M2 role-door copy revision in apps/site.** The "Sign in to
   manage this event (or wait for demo-mode access in M3)" copy
   on the home-page Organizer + Volunteer cards revises to
   strip the M3 wait reference and add a one-sentence demo entry
   pointing at `/event/harvest-block-party/{admin,game/redeem}`.
5. **Full M3-closing documentation currency.** README capability
   paragraph; architecture trust-boundary paragraph; product
   current-capability paragraph; backlog confirmation pass;
   milestone-doc top Status flip; milestone-doc Phase Status
   table 3.3 row Status flip; epic Milestone Status table M3
   row flip; this plan's Status flip.

What this phase touches at the conceptual level: server-side
rejection, client-side disabled-state UI, head-tag injection,
home-page copy, doc currency, Status flips. No schema changes,
no migrations.

## Goal

Close M3. Land the demo-mode write side and the M3-closing doc
currency in one PR. Specifically:

- Each of the five mutation Edge Functions returns HTTP 403 with
  the structured body `{ "error": "demo_mode_read_only",
  "message": "..." }` when invoked against a test-event slug
  by an unauthenticated caller, and continues to its existing
  auth gate for every other case.
- Each of the three bypass-rendered surfaces displays its full
  signed-in workspace shape with every mutation control in
  disabled-with-tooltip state.
- Every bypass-rendered route emits
  `<meta name="robots" content="noindex, nofollow">` for the
  duration of the bypass branch's mount; non-bypass routes
  emit no such tag.
- The apps/site home-page Organizer + Volunteer cards no longer
  reference "M3" and offer a one-sentence demo entry to the
  Harvest workspace / redemption booth.
- Every doc-currency entry in the M3 milestone doc's
  Documentation Currency map that names "the M3-closing phase"
  is satisfied or explicitly deferred-with-rationale (per
  scoping decision 7).
- The milestone doc's top Status flips `Proposed` → `Landed`;
  the Phase Status table 3.3 row flips `Proposed` → `Landed`
  with PR column populated; the epic's Milestone Status table
  M3 row flips `Proposed` → `Landed`. This plan's Status flips
  `Proposed` → `Landed`.

After 3.3 merges, M3 is closed. The demo-expansion epic's
first-iteration scope (M1–M3) is complete; M4–M6 remain
explicit deferrals per the epic's framing.

## Cross-Cutting Invariants

This phase binds the four milestone-level invariants from
[`m3-demo-mode-auth-bypass.md` Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
verbatim — single-source-of-truth allowlist, real events never
receive bypass, cross-app demo signaling stays honest,
cross-milestone copy contract revision lands with bypass (the
fourth invariant binds the M2 role-door copy revision in the
M3-closing PR, which is this phase's PR — Contracts section
"M2 role-door copy revision" satisfies it). The plan also
inherits the URL contract, theme route scoping, theme token
discipline, in-place auth, auth integration, and trust-
boundary invariants from the parent epic per the milestone
doc's "Inherited from upstream invariants" paragraph.

**Per-phase additions** (specific to this phase's diff
surface):

- **Server-side slug derivation, never client-side claim.** The
  `demo_mode_read_only` 403 short-circuit predicate is
  evaluated against the slug *resolved from the request's
  `eventId` server-side*, not against any slug field in the
  request body. The five mutation Edge Functions do not accept
  a `slug` body field; the `evaluateDemoModeRejection` shared
  helper performs the `eventId → slug` lookup against
  `game_events` with service-role privileges and gates the
  rejection on the resolved slug. Per
  [`m3-demo-mode-auth-bypass.md` Cross-Phase Invariant 1](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)'s
  "single source of truth, exposed to every guard site by an
  enforced path" — server-side resolution is the enforced path.
- **No mutation control on a bypass-rendered surface is
  rendered in an enabled state under any code path.** The
  bypass-branch render path threads a `demo` mode through
  every mutation control, setting `disabled` and an
  `aria-disabled` attribute plus a tooltip. The signed-in
  render path is unchanged. A regression in this invariant
  (an enabled mutation control in the bypass branch) is the
  failure mode the per-surface manual-verify checklist in the
  Validation Gate catches.
- **The `noindex` meta tag is present on every bypass-rendered
  route for the duration of the bypass branch's mount, and
  absent everywhere else.** The `useNoindex()` hook adds the
  tag on mount and removes it on unmount; non-bypass routes
  never add it. The e2e fixture extension covers the
  presence/absence assertion.

## Naming

- **`evaluateDemoModeRejection`** — the new shared helper at
  `supabase/functions/_shared/demo-mode-rejection.ts`. Async
  function; takes the request, the validated `eventId`, and a
  service-role Supabase admin client; returns either `null`
  (continue to the existing auth gate) or a `Response` (the
  structured 403). Final spelling owned by plan-drafting against
  the on-disk `_shared/` conventions; the working name is bound.
- **`demo_mode_read_only`** — the structured-error-body `error`
  field on the 403 response. Final spelling matches the
  3.1-named contract (`Verified by:`
  [`m3-phase-3-1-plan.md` Contracts item 5](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md));
  unchanged here.
- **`useNoindex()`** — the new apps/web hook at
  `apps/web/src/demo/useNoindex.ts` (path co-locates with
  `DemoModeBanner.tsx`; plan-drafting may relocate to
  `apps/web/src/lib/` if the apps/web shared-utility convention
  prefers that directory — `Verified by:` plan-drafting reads
  the on-disk apps/web utility-helper layout). On mount, appends
  `<meta name="robots" content="noindex, nofollow">` to
  `document.head`; on unmount, removes the appended element.
- **`mode: "demo" | "live"`** — the prop name threaded through
  the per-surface mutation-control components if the plan picks
  Path 2 (parameterize the existing signed-in flow) per scoping
  decision 3. If Path 1 is picked (extend the demo-mode
  variant components), the `disabled` state is computed inside
  each variant component without a prop. Plan-drafting picks
  the path and binds the naming accordingly.
- **`useNoindexOptions`** (working) — if the `useNoindex()` hook
  needs a configuration parameter (e.g., `nofollow` opt-out for
  future variants), the options shape lands here. Default: no
  options; the hook is parameter-free and emits both `noindex`
  and `nofollow` per the milestone-doc inheritance from
  apps/site's noindex posture.

## Contracts

### Server-side 403 short-circuit (the five mutation Edge Functions)

Each of the five mutation Edge Functions invokes the new shared
helper `evaluateDemoModeRejection` immediately after request-body
validation and before the existing auth-gate call. If the helper
returns a `Response` (the structured 403), the function returns
that response. If the helper returns `null`, the function
continues to its existing auth gate unchanged.

Call site insertion order:

1. CORS preflight handling (existing; unchanged).
2. Request method validation (existing; unchanged).
3. Request body parse + validation (existing; unchanged) —
   produces the validated `eventId`.
4. **New:** `evaluateDemoModeRejection({ request, eventId,
   supabaseAdmin })` — if non-null, return the helper's
   `Response`.
5. Existing auth gate (`authenticateEventOrganizerOrAdmin` for
   the three authoring functions, `authenticateRedemptionOperator`
   for the two redemption functions; unchanged).
6. Function body (existing; unchanged).

The five call sites:

- `supabase/functions/save-draft/index.ts` — insertion at the
  current `authenticateEventOrganizerOrAdmin` call site
  (`Verified by:`
  [`save-draft/index.ts:351`](/supabase/functions/save-draft/index.ts);
  plan re-greps at implementation time).
- `supabase/functions/publish-draft/index.ts` — insertion at
  the current `authenticateEventOrganizerOrAdmin` call site
  (`Verified by:`
  [`publish-draft/index.ts:173`](/supabase/functions/publish-draft/index.ts)).
- `supabase/functions/unpublish-event/index.ts` — insertion at
  the current `authenticateEventOrganizerOrAdmin` call site
  (`Verified by:`
  [`unpublish-event/index.ts:124`](/supabase/functions/unpublish-event/index.ts)).
- `supabase/functions/redeem-entitlement/index.ts` — insertion
  at the current `authenticateRedemptionOperator` call site
  (`Verified by:`
  [`redeem-entitlement/index.ts:178`](/supabase/functions/redeem-entitlement/index.ts)).
- `supabase/functions/reverse-entitlement-redemption/index.ts`
  — insertion at the current `authenticateRedemptionOperator`
  call site (`Verified by:`
  [`reverse-entitlement-redemption/index.ts:204`](/supabase/functions/reverse-entitlement-redemption/index.ts)).

The structured 403 response body is JSON
`{ "error": "demo_mode_read_only", "message": "<copy>" }` with
the appropriate CORS headers (per `_shared/cors.ts` conventions).
The `<copy>` is per-function context; plan-drafting picks the
exact text against partner-honesty concerns. Working contract:
each function's `<copy>` names the action (save / publish /
unpublish / redeem / reverse) and points at sign-in as the path
to perform it.

### Server-side slug resolution (`evaluateDemoModeRejection`)

The shared helper at
`supabase/functions/_shared/demo-mode-rejection.ts` exports an
async function with the working signature
`evaluateDemoModeRejection(args: { request: Request; eventId:
string; supabaseAdmin: SupabaseClient }): Promise<Response |
null>`. The helper:

1. **Resolves slug from `eventId`** via
   `supabaseAdmin.from("game_events").select("slug").eq("id",
   eventId).maybeSingle()`. If the row is missing (event_id
   does not resolve) or the query errors, returns `null` —
   defer to the existing auth gate's missing-event handling.
2. **Checks allowlist membership** via `isTestEventSlug` from
   `shared/events/testEventAllowlist.ts`. If false, returns
   `null`.
3. **Checks no-auth-context** — defined as the AND of: no
   `Authorization` header bearing a JWT, AND no signed session
   cookie verifiable via `_shared/session-cookie.ts`'s
   `readVerifiedSession`. If either auth context is present,
   returns `null`.
4. **Else, returns the structured 403 `Response`** with JSON
   body and CORS headers.

The helper is the **single canonical site** for the resolve +
check + format sequence per Cross-Cutting Invariant "Demo-mode
rejection helper is the single canonical site." Per-function
duplication of any of the four steps is banned.

The auth-gate helpers (`_shared/event-organizer-auth.ts`,
`_shared/redemption-operator-auth.ts`) are NOT augmented to
handle the demo-mode branch — separation of concerns is
preserved per scoping decision 4 Option C rejection.

### Mutation-control disabled-state UI (the three bypass-rendered surfaces)

The bypass branch in each of the three page components renders
the signed-in workspace shape with every mutation control in
**disabled-with-tooltip** state. The shape is uniform across
all five mutation controls (admin Save / Publish / Unpublish /
Confirm / Cancel; redeem keypad submit; redemptions reverse /
confirm-reversal / retry). Each disabled control:

- Has the HTML `disabled` attribute set.
- Has `aria-disabled="true"` set for assistive-tech parity.
- Renders a tooltip on hover/focus with copy "Demo mode — sign
  in to make changes." (Working text; plan-drafting refines
  against rendered components.)
- On click, no action fires (browser-native disabled-button
  semantics; the `onClick` handler is not invoked).

**Path choice (Path 1 vs Path 2 per scoping decision 3 open
handoff):** plan-drafting picks at implementation time against
the existing component complexity:

- **Path 1.** Extend `DemoModeAdminView`, `DemoModeRedeemView`,
  and `DemoModeRedemptionsView` to render the signed-in
  workspace shape with disabled controls. Each variant
  component duplicates structural shape from its
  signed-in counterpart but threads `disabled={true}` through
  every mutation control.
- **Path 2.** Parameterize the existing signed-in flow
  components (`SignedInEventAdminFlow`, `SignedInRedeemFlow`,
  `SignedInRedemptionsFlow` — final names per the on-disk
  modules) with a `mode: "demo" | "live"` prop. The bypass
  branch renders the signed-in flow with `mode="demo"`; the
  signed-in render path renders with `mode="live"`. The prop
  threads through to each mutation control's `disabled`
  expression as an additional condition.

The contract this section binds is the **disabled-with-tooltip
shape**, not the path that achieves it.

### Per-surface mutation control inventory

The disabled-with-tooltip treatment applies to every mutation
control on each of the three bypass-rendered surfaces. The
inventory below is the contract (no mutation control may be
omitted); paths and line numbers are estimates the plan
re-verifies at implementation time:

- **admin** — five controls:
  - Save: [`AdminEventDetailsForm.tsx:286-292`](/apps/web/src/admin/AdminEventDetailsForm.tsx)
  - Publish: [`AdminPublishPanel.tsx:76-83`](/apps/web/src/admin/AdminPublishPanel.tsx)
  - Unpublish (initial): [`AdminPublishPanel.tsx:105-112`](/apps/web/src/admin/AdminPublishPanel.tsx)
  - Confirm unpublish: [`AdminPublishPanel.tsx:118-127`](/apps/web/src/admin/AdminPublishPanel.tsx)
  - Cancel unpublish: [`AdminPublishPanel.tsx:128-136`](/apps/web/src/admin/AdminPublishPanel.tsx)
- **redeem** — one control:
  - Keypad submit: [`RedeemKeypad.tsx:71-78`](/apps/web/src/redeem/RedeemKeypad.tsx).
    The keypad's digit + clear + backspace buttons are NOT
    mutation controls (they edit the local input state and do
    not call any Edge Function); they remain enabled in the
    bypass branch so the partner can interact with the keypad
    UI shape. Only the submit affordance is disabled.
- **redemptions** — three controls:
  - Reverse (initial): [`RedemptionDetailSheet.tsx:350-356`](/apps/web/src/redemptions/RedemptionDetailSheet.tsx)
  - Confirm reversal: [`RedemptionDetailSheet.tsx:442-450`](/apps/web/src/redemptions/RedemptionDetailSheet.tsx)
  - Retry reversal: [`RedemptionDetailSheet.tsx:423-429`](/apps/web/src/redemptions/RedemptionDetailSheet.tsx)

Total: nine disabled controls across three surfaces.

### noindex emit (`useNoindex()`)

A new apps/web hook at `apps/web/src/demo/useNoindex.ts` (or
`apps/web/src/lib/useNoindex.ts` per plan-drafting's
shared-utility-convention check). The hook signature is
parameter-free: `useNoindex(): void`. On mount, the hook
appends a new `<meta name="robots" content="noindex,
nofollow">` element to `document.head`; on unmount, the hook
removes the appended element by reference. The hook is called
unconditionally inside each of the three bypass-branch render
paths, so React's rules-of-hooks are satisfied (the hook is
called at the top of the bypass-branch render code path).

The hook composes a `useEffect` that:

1. On mount, creates a `HTMLMetaElement` via
   `document.createElement("meta")`, sets `name="robots"` and
   `content="noindex, nofollow"`, appends it to
   `document.head`.
2. The effect's cleanup function removes the appended element
   from `document.head` by reference.

**StrictMode handling.** apps/web's `<StrictMode>` wrapping
(`Verified by:` plan-drafting reads `apps/web/src/main.tsx`)
double-invokes effects in development. The hook handles this
by tracking the appended element via a ref and asserting that
the element to remove on cleanup is the same one mount
created — so a second StrictMode mount that creates a second
element doesn't leave the first orphaned. Plan-drafting binds
the exact ref-based pattern after the spike confirms the
implementation shape.

**Spike requirement (per AGENTS.md "Spike before plan for
novel mechanisms").** Before this plan flips `In draft` →
`Proposed`, plan-drafting runs a 30-minute throwaway spike on
a `spike/m3-phase-3-3-noindex` branch (deleted post-spike).
The spike implements `useNoindex()` end-to-end, exercises it
from a bypass-branch render against the apps/web dev runner,
and confirms via DOM inspection that:

- The meta tag is present in `document.head` when the bypass
  branch renders.
- The meta tag is absent when a non-bypass route renders.
- StrictMode's double-effect-invocation does not leave
  duplicate or orphaned tags.
- The unmount cleanup runs when the user transitions out of
  the bypass branch (e.g., signs in mid-visit).

If the spike surfaces a dealbreaker, this plan revises the
mechanism to **react-helmet-async** (the explicit fallback per
scoping decision 5) and records the dependency-addition
tradeoff in this Contracts section.

### M2 role-door copy revision

Edit one file: [`apps/site/components/home/RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx).

- **Organizer card** (current copy at
  `RoleDoors.tsx:47-53`): the description's parenthetical "(or
  wait for demo-mode access in M3)" is removed; a one-sentence
  demo entry is added after the existing description. Working
  copy: "Sign in to manage this event. Or browse the [Harvest
  demo workspace](/event/harvest-block-party/admin) without
  signing in." Final wording owned by plan-drafting against the
  rendered home page per AGENTS.md "Bans on surface require
  rendering the consequence."
- **Volunteer card** (current copy at `RoleDoors.tsx:54-60`):
  same shape — strip the parenthetical, add a one-sentence
  demo entry. Working copy: "Sign in to redeem codes. Or try
  the [Harvest demo redemption booth](/event/harvest-block-party/game/redeem)
  without signing in."
- **Attendee card** (`RoleDoors.tsx:41-46`): unchanged. The
  Attendee target was always public; M3 does not change that.

The link element shape (plain anchor vs. styled secondary CTA)
is plan-drafting's call against the home page's existing link
conventions. The slug used in both demo links is
`harvest-block-party` to keep the home-page narrative coherent.

### M3 doc-currency edits

Per scoping decision 7's per-doc resolution:

- **`README.md`** — paragraph addition or edit at the
  capability-description section. Working contract: the
  paragraph names that demo-mode access has landed on the two
  test-event slugs (`harvest-block-party`, `riverside-jam`),
  read-only, allowlist-gated, with noindex + disclaimer banner
  posture. Plan-drafting reads the on-disk README to find the
  insertion point.
- **`docs/architecture.md`** — paragraph addition or edit at
  the trust-boundary section. Working contract: the test-event
  allowlist constant (`shared/events/testEventAllowlist.ts`) is
  the load-bearing security mechanism for the bypass; the
  apps/web bypass branch + Edge Function read shim
  (`read-demo-event` from 3.2) + Edge Function 403 short-
  circuit (the new `_shared/demo-mode-rejection.ts` helper) form
  the surface; the `noAuthContext` predicate inside the helper
  is the server-side enforcement. Plan-drafting reads the
  trust-boundary section to find the insertion point.
- **`docs/product.md`** — paragraph addition or edit at the
  current-capability description. Working contract: post-M3,
  the three role surfaces (admin, redeem, redemptions) are
  partner-reachable on the two test slugs; the data shown is
  read-only; the disabled mutation controls communicate "what
  an organizer would do" without performing it; what is real
  (data fetched from real tables via the read shim) vs.
  stubbed (none). Plan-drafting reads the current-capability
  section to find the insertion point.
- **`docs/operations.md`** — **skipped.** Justified per
  scoping decision 7: 3.1 chose read-only browse, which leaves
  operations unchanged.
- **`docs/styling.md`** — **skipped.** Justified per scoping
  decision 7: the demo-mode signaling (banner + disabled-state
  controls) composes existing tokens; no new token
  classification. Plan-drafting confirms by reading
  [`apps/web/src/styles/_demo-mode.scss`](/apps/web/src/styles/_demo-mode.scss).
- **`docs/backlog.md`** — confirmation pass. Working contract:
  confirm the post-epic items the epic Backlog Impact named
  ("demo-mode generalization beyond the test-event allowlist,"
  "production-friendly demo-mode for partner-onboarding
  scenarios") are present. If absent, add. The
  partner-feedback capture mechanism backlog item the 3.1 plan
  named is also confirmed and remains as a post-epic item.
- **`docs/open-questions.md`** — out of scope. Closed by 3.1.
- **`docs/dev.md`** — out of scope. Excluded by milestone doc.
- **`m3-demo-mode-auth-bypass.md`** (the milestone doc) — top
  Status block: `Proposed` → `Landed`; Phase Status table 3.3
  row Status: `Proposed` → `Landed` with PR column populated.
- **`epic.md`** (the demo-expansion epic) — Milestone Status
  table M3 row Status: `Proposed` → `Landed`. Top Status
  unchanged.
- **`m2-phase-2-3-plan.md`** — confirmation pass per the
  milestone-doc Documentation Currency entry. Plan-drafting
  walks the M2 plan's role-door copy contract section to
  confirm that the M2 copy revision shipped here satisfies
  the M2-declared M3 inheritance. No edit to the M2 plan.

### Status flips

Atomic with the implementing PR:

- This plan: `In draft` → `Proposed` (pre-PR, after spike +
  promotion-gate self-review) → `Landed` (in the implementing
  PR's Status edit, per AGENTS.md "Plan-to-PR Completion Gate").
- `m3-demo-mode-auth-bypass.md` top Status: `Proposed` →
  `Landed` (in the same PR).
- `m3-demo-mode-auth-bypass.md` Phase Status table 3.3 row
  Status: `Proposed` → `Landed` with PR column populated (in
  the same PR).
- `epic.md` Milestone Status table M3 row Status: `Proposed`
  → `Landed` (in the same PR).

Validation Gate fully satisfiable pre-merge (no Tier 5 split);
the post-merge production walk-through is part of the
Validation Gate's manual-verify checklist but does not gate
the Status flip.

## Files To Touch

This list is an **estimate** of the expected file inventory
per AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may revise it when a structural call requires
deviation; deviations are reported via the PR body's
"Estimate Deviations" callout per AGENTS.md "Plan-to-PR
Completion Gate." Estimate scope is what scoping read on
2026-05-03; plan-drafting re-verifies at implementation time.

### New

- `supabase/functions/_shared/demo-mode-rejection.ts` — the
  new shared helper with `evaluateDemoModeRejection`.
- `apps/web/src/demo/useNoindex.ts` (or `apps/web/src/lib/useNoindex.ts`
  per plan-time convention check) — the new hook.
- `docs/plans/epics/demo-expansion/m3-phase-3-3-plan.md` —
  this file.

(The five mutation-function Deno test files already exist
under `tests/supabase/functions/` — `save-draft.test.ts`,
`publish-draft.test.ts`, `unpublish-event.test.ts`,
`redeem-entitlement.test.ts`,
`reverse-entitlement-redemption.test.ts`. The new demo-mode
test cases extend each existing file; see Files To Touch →
Modify below.)

### Modify

- `supabase/functions/save-draft/index.ts` — invoke the new
  helper at the existing auth-gate call site
  (`Verified by:` [line 351](/supabase/functions/save-draft/index.ts);
  re-greps at implementation time).
- `supabase/functions/publish-draft/index.ts` — same.
- `supabase/functions/unpublish-event/index.ts` — same.
- `supabase/functions/redeem-entitlement/index.ts` — same.
- `supabase/functions/reverse-entitlement-redemption/index.ts`
  — same.
- `tests/supabase/functions/save-draft.test.ts` — extend with
  the demo-mode 403 test cases per Contracts "Server-side 403
  short-circuit" and scoping decision 8.
- `tests/supabase/functions/publish-draft.test.ts` — same.
- `tests/supabase/functions/unpublish-event.test.ts` — same.
- `tests/supabase/functions/redeem-entitlement.test.ts` —
  same.
- `tests/supabase/functions/reverse-entitlement-redemption.test.ts`
  — same.
- `apps/web/src/admin/DemoModeAdminView.tsx` (Path 1) OR
  `apps/web/src/pages/EventAdminPage.tsx` + the signed-in flow
  components (Path 2) — re-introduce the five admin mutation
  controls in disabled-with-tooltip state.
- `apps/web/src/redeem/DemoModeRedeemView.tsx` (Path 1) OR the
  signed-in redeem flow (Path 2) — re-introduce the keypad
  shell with disabled submit.
- `apps/web/src/redemptions/DemoModeRedemptionsView.tsx`
  (Path 1) OR the signed-in redemptions flow (Path 2) —
  re-introduce the three reverse-related controls in
  disabled-with-tooltip state.
- `apps/web/src/pages/EventAdminPage.tsx` —
  add `useNoindex()` call inside the bypass branch.
- `apps/web/src/pages/EventRedeemPage.tsx` — same.
- `apps/web/src/pages/EventRedemptionsPage.tsx` — same.
- `tests/e2e/demo-mode-bypass.spec.ts` — extend the existing
  3.2 fixture with: (a) noindex meta-tag presence on a bypass
  route + absence on a non-bypass route; (b) at least one
  disabled mutation control per surface.
- `apps/site/components/home/RoleDoors.tsx` — M2 copy revision
  per Contracts "M2 role-door copy revision."
- `README.md` — capability-paragraph edit per Contracts "M3
  doc-currency edits."
- `docs/architecture.md` — trust-boundary paragraph edit.
- `docs/product.md` — current-capability paragraph edit.
- `docs/backlog.md` — post-epic items confirmation pass.
- `docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md`
  — top Status flip + Phase Status table 3.3 row Status flip.
- `docs/plans/epics/demo-expansion/epic.md` — Milestone Status
  table M3 row flip.

### Delete

- `docs/plans/epics/demo-expansion/scoping/m1-phase-1-1.md`,
  `docs/plans/epics/demo-expansion/scoping/m3-phase-3-1.md`,
  `docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md`,
  `docs/plans/epics/demo-expansion/scoping/m3-phase-3-3.md` —
  batch deletion of every M3-and-prior phase scoping doc per
  AGENTS.md "Phase Planning Sessions → Output set" (scoping
  docs delete in batch at the milestone-terminal PR).

### Intentionally not touched

This list is an **estimate** of files the planner expects
implementation does not need to touch. Per AGENTS.md "Plan
content is a mix of rules and estimates," touching one of these
is a structural call the implementer is authorized to make if
the right shape requires it; deviations land in the PR's
`## Estimate Deviations` section.

- `shared/events/testEventAllowlist.ts` — the 3.2-shipped
  allowlist; consumed by `evaluateDemoModeRejection` via
  import. Not modified.
- `supabase/functions/_shared/event-organizer-auth.ts`,
  `supabase/functions/_shared/redemption-operator-auth.ts`,
  `supabase/functions/_shared/session-cookie.ts`,
  `supabase/functions/_shared/cors.ts` — existing helpers;
  `evaluateDemoModeRejection` consumes
  `readVerifiedSession` and the CORS helper but does not
  modify them.
- `supabase/functions/read-demo-event/index.ts` — the 3.2
  read shim; unchanged.
- `apps/web/src/demo/DemoModeBanner.tsx` — the 3.2 banner;
  unchanged (the banner already says "this is read-only" and
  composes naturally with the disabled-state controls 3.3
  introduces).
- `apps/web/src/styles/_demo-mode.scss` — the 3.2 SCSS partial;
  unchanged unless plan-drafting surfaces a need for tooltip
  styling that doesn't compose existing tokens.
- `supabase/config.toml` — unchanged (no new functions; the
  existing 9 + 3.2's `read-demo-event` set is unchanged).
- Any apps/web routing dispatcher (`apps/web/src/App.tsx`) —
  unchanged.
- Any apps/site page or component except `RoleDoors.tsx`.
- `docs/dev.md`, `docs/operations.md`, `docs/styling.md`,
  `docs/open-questions.md` — per Contracts "M3 doc-currency
  edits" deferrals or out-of-scope assignments.

## Execution Steps

This list is an **estimate** of the expected step ordering
per AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may resequence; deviations land in the PR's
`## Estimate Deviations` section.

1. **Pre-implementation: noindex spike.** Per AGENTS.md
   "Spike before plan for novel mechanisms" and Contracts
   "noindex emit (`useNoindex()`)." Spike on
   `spike/m3-phase-3-3-noindex`; confirm or revise the
   `useNoindex()` mechanism; flip this plan's Status from
   `In draft` to `Proposed` after the comprehensive promotion-
   gate self-review per AGENTS.md "`In draft` → `Proposed`
   promotion gate."
2. **Author the shared helper** at
   `supabase/functions/_shared/demo-mode-rejection.ts` per
   Contracts "Server-side slug resolution."
3. **Author the five Deno tests** under
   `tests/supabase/functions/` (one per mutation function)
   per Contracts "Server-side 403 short-circuit" and
   scoping decision 8.
4. **Wire the helper into the five mutation Edge Functions**
   per Contracts "Server-side 403 short-circuit." Run the
   per-function Deno tests; they pass.
5. **Pick Path 1 vs Path 2** for the disabled-state UI per
   Contracts "Mutation-control disabled-state UI." Plan-
   drafting reads each demo-mode variant component and each
   signed-in flow to inform the call.
6. **Implement the disabled-state UI** across the three
   surfaces. Manual-verify against `vercel dev` each surface
   per Contracts "Per-surface mutation control inventory."
7. **Implement `useNoindex()` and integrate into the three
   bypass branches** per Contracts "noindex emit." Extend
   `tests/e2e/demo-mode-bypass.spec.ts` per scoping decision 8.
8. **Apply the M2 role-door copy revision** in
   `apps/site/components/home/RoleDoors.tsx` per Contracts
   "M2 role-door copy revision." Manual-verify on the apps/site
   preview.
9. **Apply the M3 doc-currency edits** per Contracts "M3
   doc-currency edits": README, architecture, product, backlog.
10. **Flip Status blocks** per Contracts "Status flips": this
    plan, the milestone doc, the epic doc.
11. **Delete the four scoping docs** in batch per Files To
    Touch → Delete.
12. **Run the Validation Gate** per the section below.
13. **Walk the Plan-to-PR Completion Gate** — every Goal,
    Test, Validation step, Self-Review audit named here is
    satisfied or explicitly deferred-with-rationale in this
    plan.
14. **Open the PR** with the canonical body template per
    AGENTS.md.

## Commit Boundaries

This list is an **estimate** of the expected commit shape per
AGENTS.md "Plan content is a mix of rules and estimates."
Implementation may reshuffle; deviations land in the PR's
`## Estimate Deviations` section.

1. **`feat(supabase): add evaluateDemoModeRejection shared
   helper for demo-mode write rejection`** —
   `_shared/demo-mode-rejection.ts` + a unit test if the helper
   is unit-testable in isolation.
2. **`feat(supabase): wire demo-mode 403 short-circuit into
   mutation Edge Functions`** — the five `index.ts` edits + the
   five Deno tests.
3. **`feat(web): re-introduce mutation controls in bypass
   branch as disabled-with-tooltip`** — Path 1 or Path 2 edits
   across the three surfaces.
4. **`feat(web): emit noindex on bypass-rendered routes via
   useNoindex hook`** — `useNoindex.ts` + bypass-branch
   integration + e2e fixture extension.
5. **`feat(site): revise role-door copy after M3 demo-mode
   landing`** — `RoleDoors.tsx`.
6. **`docs: land M3 demo-expansion documentation currency
   updates`** — README, architecture, product, backlog.
7. **`docs(plans): close M3 demo-expansion — flip plan +
   milestone-doc + epic Status to Landed; delete scoping docs`**
   — Status flips + scoping doc batch deletion.

## Validation Gate

Per AGENTS.md "Plan-to-PR Completion Gate," all checks below
must pass before merge.

**Automated checks:**

- `npm run lint` — passes.
- `npm run build:web` — passes.
- `npm run test` — passes (Vitest, including any apps/web
  unit tests added).
- `npm run test:functions` — passes (Deno, including the five
  new mutation-function tests).
- The Playwright e2e wrapper for `tests/e2e/demo-mode-bypass.spec.ts`
  (final command per `package.json` `scripts` and
  `scripts/testing/`; plan-drafting reads to confirm the
  canonical wrapper invocation) — passes including the new
  noindex + disabled-state assertions.

**Manual-verify checklist (per AGENTS.md "Bans on surface
require rendering the consequence"):**

Run apps/web on `vercel dev` (or the apps/web dev runner per
`package.json` `scripts`). For each test slug
(`harvest-block-party`, `riverside-jam`):

- **`/event/<slug>/admin`** — bypass branch renders;
  DemoModeBanner present at top; the workspace shape is
  visible (event-details form, publish panel); each of the
  five mutation controls (Save, Publish, Unpublish, Confirm,
  Cancel) renders in disabled state with the tooltip on
  hover/focus; the noindex meta tag is present in
  `<head>` (browser devtools Elements panel).
- **`/event/<slug>/game/redeem`** — bypass branch renders;
  DemoModeBanner present; the keypad shell is visible; digit
  + clear + backspace buttons work locally; the submit
  affordance renders in disabled state with the tooltip; the
  noindex meta tag is present.
- **`/event/<slug>/game/redemptions`** — bypass branch
  renders; DemoModeBanner present; the merged redemption
  list is visible; clicking a row opens the detail sheet; the
  three reverse-related controls (Reverse, Confirm reversal,
  Retry) each render in disabled state with the tooltip; the
  noindex meta tag is present.

For a non-test slug (any real event with a published draft, OR
a non-existent slug):

- **`/event/<non-test-slug>/admin`** signed-out — `SignInForm`
  renders (no bypass branch fires); no noindex meta tag
  present.

For the apps/site home page:

- **`/`** — Organizer card description reads "Sign in to
  manage this event. Or browse the [Harvest demo workspace]
  ..." (or final wording); Volunteer card description reads
  similarly; Attendee card description unchanged; the demo
  links navigate to `/event/harvest-block-party/admin` and
  `/event/harvest-block-party/game/redeem` respectively.

**Plan-to-PR Completion Gate walk:**

- Every Goal bullet is satisfied or deferred-with-rationale.
- Every Contracts entry is satisfied or deferred-with-rationale.
- Every Cross-Cutting Invariant is honored against the diff.
- Every Self-Review Audit is run.
- Every Documentation Currency PR Gate entry is landed.
- This plan's Status flipped from `Proposed` to `Landed` in
  the same PR.
- The milestone doc + epic Status flips landed in the same PR.
- The PR body's `## Estimate Deviations` section names every
  deviation from the estimate-shaped sections (Files To
  Touch, Execution Steps, Commit Boundaries) or reads `N/A`.

## Self-Review Audits

Plan-drafting walks
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
at implementation time and binds the relevant audits here.
Likely-relevant audits (estimate, per scoping decision 9
"Open decisions"):

- **Composed-predicate auth-shape audit.** The five mutation
  Edge Functions receive a new shared rejection helper composed
  before existing auth gates; verify gate placement, error-
  response shape, and per-branch error semantics
  (transient-failure-per-branch matters per the
  [composed-auth memory rule](/Users/kyle/.claude/projects/-Users-kyle-workspace-neighborly-scavenger-game/memory/feedback_composed_auth_error_semantics.md) —
  if the slug-resolution SELECT errors transiently, the
  helper returns `null` to defer to the existing auth gate;
  the audit confirms this branch is documented).
- **Error-surfacing for user-initiated mutations.** The
  disabled-with-tooltip state is the surface for the rejection
  contract; the audit confirms the tooltip copy, ARIA
  semantics, and that no enabled mutation control reaches a
  bypass-rendered surface under any code path.
- **Rename-aware diff classification.** Path 1 vs Path 2
  picks may rename or restructure `DemoModeAdminView` /
  `DemoModeRedeemView` / `DemoModeRedemptionsView`; the audit
  walks the diff for clean rename classification.
- **Doc-currency audit.** The doc-currency map is a
  spread-out edit set (README, architecture, product,
  backlog, milestone-doc, epic-doc, this plan); the audit
  walks each to confirm landed status.

Plan-drafting confirms the audit set against the on-disk
catalog and replaces this estimate with the final list.

## Documentation Currency PR Gate

Per AGENTS.md "Doc Currency PR Gate" and the milestone doc's
[Documentation Currency map](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md),
every entry assigned to "the M3-closing phase" is satisfied or
explicitly deferred in this plan per Contracts "M3 doc-
currency edits." Specifically:

- README, architecture, product: edited per Contracts.
- backlog: confirmation pass per Contracts.
- styling, operations: justified deferrals per scoping
  decision 7.
- open-questions: closed by phase 3.1; out of scope for 3.3.
- dev: explicitly excluded by milestone doc.
- milestone-doc top Status, milestone-doc Phase Status table
  3.3 row, epic Milestone Status table M3 row, this plan's
  Status: flipped per Contracts "Status flips."
- M2 phase 2.3 plan role-door copy contract: confirmation
  pass per Contracts "M3 doc-currency edits"; the M2 plan is
  not edited.

The four scoping docs under
`docs/plans/epics/demo-expansion/scoping/` delete in batch
per Files To Touch → Delete.

## Out Of Scope

This phase explicitly does NOT ship:

- **Demo-mode write paths against real tables.** Per the
  3.1-bound read-only-for-M3 invariant; B-shaped functionality
  is deferred to a second-iteration M4–M6 scoping pass.
- **Sandbox tables for demo-mode mutations.** Per the same
  invariant; C-shaped functionality is deferred.
- **Demo-mode allowlist generalization.** Two slugs
  (`harvest-block-party`, `riverside-jam`) only; no third
  slug, no per-tenant config, no admin surface for
  registering demo events. Per the milestone doc's
  Cross-Phase Decisions → "No demo-mode framework
  generalization."
- **A demo-mode reset story.** No reset-cron, no operator
  script. Per the M4 deferral.
- **Pre-populated redemption codes for the demo.** No seeded
  data. Per the M4 deferral.
- **A demo-mode framework helper that other apps could
  consume.** The mechanisms here (allowlist, bypass branches,
  shared helper, disabled-state UI, noindex hook) are
  apps/web + supabase-functions specific; no
  generalization layer.
- **A `/dev/` surface or admin panel that surfaces demo-mode
  state.** No demo-state management UI.
- **Anything beyond `RoleDoors.tsx` in apps/site.** The
  test-event landing pages and the rest of apps/site stay as
  shipped by event-platform-epic M3 phases 3.1, 3.2, and
  demo-expansion epic M2.
- **Changes to `apps/web/src/App.tsx` routing.** The bypass
  branch lives inside each page component, not in the
  dispatcher.
- **Changes to existing Edge Function auth-gate helpers**
  (`event-organizer-auth.ts`, `redemption-operator-auth.ts`).
  The new `evaluateDemoModeRejection` composes beside them,
  not inside them.
- **A second-pass partner-feedback capture mechanism.** Named
  in the 3.1 plan's Backlog Impact as a post-M3 backlog item;
  remains a post-epic item per scoping decision 7.

## Risk Register

References the milestone doc's
[Cross-Phase Risks](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md);
plan-implementation-level risks named here.

- **Drift between the slug-resolution SELECT and the existing
  auth gate's event resolution.** The new helper SELECTs
  `slug` from `game_events` for the demo-mode predicate; the
  existing auth gates may also SELECT from `game_events` for
  their own predicates (organizer relationship, etc.). If the
  two SELECTs target different rows or different consistency
  views (e.g., one reads from a draft view), the demo-mode
  predicate could mis-match the auth-gate's view of the event.
  Mitigation: both SELECTs use service-role privileges (which
  bypass RLS), and `game_events.id` is the canonical primary
  key — the lookup is deterministic. Plan-drafting confirms by
  reading the existing auth-gate helpers to ensure they
  resolve event identity in a compatible way.
- **Path 1 vs Path 2 picks the wrong path.** If Path 1 (extend
  demo-mode variants) is picked but the structural duplication
  with the signed-in flows is too high, the diff inflates; if
  Path 2 (parameterize the signed-in flows) is picked but the
  signed-in flow components are tightly coupled to the
  signed-in auth state machine, the prop threading inflates.
  Mitigation: plan-drafting reads each component before picking;
  the path can be revised in the implementing PR per
  AGENTS.md "Plan-to-PR Completion Gate" if implementation
  surfaces a wrong call.
- **`useNoindex()` spike surfaces a dealbreaker.** The hook's
  React-StrictMode interaction or the meta-tag-cleanup
  semantics could prove tricky. Mitigation: the spike is the
  early surface; if the hook approach is unworkable, the
  fallback to `react-helmet-async` is a known-good library
  with the dependency-addition tradeoff explicitly recorded.
- **The disabled-state tooltip text is wrong for the surface
  context.** A uniform "Demo mode — sign in to make changes"
  may read awkwardly on the keypad submit ("make changes" is
  vague for "redeem code") or on the redemptions reverse
  ("make changes" is vague for "reverse a redemption").
  Mitigation: plan-drafting refines per-control tooltip
  copy if the uniform text reads poorly; the manual-verify
  checklist surfaces it.
- **The M2 role-door demo-link slug is the wrong slug.** Both
  demo links point at `harvest-block-party`; if the home page's
  primary narrative shifts (e.g., a future content change
  features `riverside-jam` more prominently), the demo links
  could feel inconsistent. Mitigation: this is a content-
  alignment risk, not a security or correctness risk; the M2
  copy can be revised in a future content PR if the narrative
  shifts.
- **The doc-currency edits drift from what shipped.** The
  README + architecture + product paragraphs describe the
  post-3.3 surface; if 3.3's implementation shape diverges
  from the contracts here (e.g., `useNoindex()` becomes
  `react-helmet-async`), the prose must reflect what shipped.
  Mitigation: doc-currency edits land late in the PR, after
  the implementation diff is complete; the PR's
  `## Estimate Deviations` section forces alignment.

## Backlog Impact

References the milestone doc's
[Backlog Impact](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md)
and the epic's
[Backlog Impact](/docs/plans/epics/demo-expansion/epic.md).

**Items closed by 3.3's PR:**

- The milestone-level "demo-mode access to admin / redeem /
  redemptions surfaces for test-event slugs without sign-in"
  capability closes (M3's full delivery is observed by the
  epic's Milestone Status table M3 row flipping to `Landed`).

**Items unblocked by 3.3's PR:**

- M4 (role-door surfaces and redemption seeding, deferred at
  epic drafting time) becomes implementable on top of M3's
  bypass + allowlist + write-rejection infrastructure.
- The "second-iteration scoping pass against what M1–M3
  actually delivered" the epic Risk Register flagged becomes
  runnable, with M3's settled contracts as the grounding.

**Items added by 3.3's PR for post-M3 work:**

- None at the phase level beyond the post-epic items the
  epic Backlog Impact already named; 3.3 confirms those are
  present in `docs/backlog.md` per Contracts "M3 doc-
  currency edits."
- The 3.1 plan's "partner-feedback capture mechanism for
  demo-mode surfaces" backlog addition stays an open
  post-epic item.

## Related Docs

- [`m3-demo-mode-auth-bypass.md`](/docs/plans/epics/demo-expansion/m3-demo-mode-auth-bypass.md) —
  parent milestone doc; this phase closes M3 by flipping its
  top Status and Phase Status table 3.3 row to `Landed`.
- [`scoping/m3-phase-3-3.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-3.md) —
  scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the nine scoping decisions absorbed
  above; deletes in batch with sibling scoping docs at this
  phase's PR.
- [`m3-phase-3-1-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-1-plan.md) —
  predecessor phase plan. Contracts items 5 (server-side 403
  + structured body) + 6 (client-side disabled-state, deferred
  to 3.3) + 7 (3.3 as M3-closer) are the data-access-semantics
  contract this phase implements.
- [`m3-phase-3-2-plan.md`](/docs/plans/epics/demo-expansion/m3-phase-3-2-plan.md) —
  predecessor phase plan. The read-side surface (allowlist
  module, page-component bypass branches, Edge Function read
  shim, `DemoModeBanner`, read-only variants) is the
  immediate input this phase reads against.
- [`scoping/m3-phase-3-2.md`](/docs/plans/epics/demo-expansion/scoping/m3-phase-3-2.md) —
  predecessor phase scoping doc. Decision 5 deferred the
  mutation-control disabled-state shape to 3.3; decision 1's
  branch-test analysis named the 3.3 expected scope this
  phase ships; deletes in batch at this phase's PR.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) —
  parent epic; M3 paragraph; Milestone Status table M3 row
  this phase flips to `Landed`. The epic's first-iteration
  scope (M1–M3) is complete after this phase merges.
- [`m2-phase-2-3-plan.md`](/docs/plans/epics/demo-expansion/m2-phase-2-3-plan.md) —
  the M2 plan that introduced the current role-door copy and
  named the M3-closer revision as its handoff.
- [`apps/web/src/demo/DemoModeBanner.tsx`](/apps/web/src/demo/DemoModeBanner.tsx) —
  the 3.2 banner; composes naturally with the disabled-state
  controls 3.3 introduces.
- [`apps/web/src/admin/DemoModeAdminView.tsx`](/apps/web/src/admin/DemoModeAdminView.tsx),
  [`apps/web/src/redeem/DemoModeRedeemView.tsx`](/apps/web/src/redeem/DemoModeRedeemView.tsx),
  [`apps/web/src/redemptions/DemoModeRedemptionsView.tsx`](/apps/web/src/redemptions/DemoModeRedemptionsView.tsx)
  — the 3.2 demo-mode views; either extended (Path 1) or
  replaced (Path 2) by this phase.
- [`apps/web/src/pages/EventAdminPage.tsx`](/apps/web/src/pages/EventAdminPage.tsx),
  [`apps/web/src/pages/EventRedeemPage.tsx`](/apps/web/src/pages/EventRedeemPage.tsx),
  [`apps/web/src/pages/EventRedemptionsPage.tsx`](/apps/web/src/pages/EventRedemptionsPage.tsx)
  — the three page-component bypass branches; this phase adds
  `useNoindex()` calls.
- [`apps/site/components/home/RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx)
  — the M2 role-door cards; this phase revises Organizer +
  Volunteer copy.
- [`shared/events/testEventAllowlist.ts`](/shared/events/testEventAllowlist.ts) —
  the 3.2-shipped allowlist; consumed by
  `evaluateDemoModeRejection`.
- [`supabase/functions/_shared/session-cookie.ts`](/supabase/functions/_shared/session-cookie.ts) —
  the existing `readVerifiedSession` helper used by the new
  helper's no-auth-context check.
- [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts) —
  the CORS helper the new helper's 403 response composes
  against.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit catalog plan-drafting walks against this phase's diff
  surface.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, "PR-count
  predictions need a branch test," "Scoping owns / plan owns,"
  "Reality-check gate between scoping and plan," "Bans on
  surface require rendering the consequence," "Defer rather
  than over-resolve," "Spike before plan for novel
  mechanisms," "`In draft` → `Proposed` promotion gate,"
  "Plan-to-PR Completion Gate," "Plan content is a mix of
  rules and estimates."
