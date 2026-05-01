# M2 Phase 2.2 — Per-Event Admin Route Shell

## Status

Landed.

Followed the two-phase "Plan-to-Landed Gate For Plans That Touch
Production Smoke" pattern from
[`docs/testing-tiers.md`](../../../testing-tiers.md): the implementing
PR ([#113](https://github.com/kcrobinson-1/neighborly-events/pull/113))
plus a follow-up slug-resolution fix
([#114](https://github.com/kcrobinson-1/neighborly-events/pull/114))
shipped with Status `In progress pending prod verification`; this
doc-only commit records the post-deploy verification evidence and
flips Status to `Landed`.

### Production verification evidence

Walked four URL/keying combinations against the deployed
production origin signed in as a root admin, against the
`community-checklist-2026` test event (event id) /
`community-checklist` (slug):

| URL | Observed | Why this is the expected behavior |
| --- | --- | --- |
| `/admin/events/community-checklist-2026` | Legacy admin loads the workspace | Route keyed on event id — works as before this phase |
| `/event/community-checklist-2026/admin` | In-place role-gate ("Not available for this event") | Route keyed on slug; the input string is the event id, not the slug, so the drafts-table lookup returns no row → non-leaking role-gate (Cross-Cutting Invariant: "slug → event-id resolution leaks no information") |
| `/admin/events/community-checklist` | Legacy admin's "event workspace not found" | Route keyed on event id; the input string is the slug, so `dashboardState.drafts` (keyed on event id) has no match — existing behavior, unchanged by this phase |
| `/event/community-checklist/admin` | **Workspace renders correctly** with the same composed editor (`AdminEventDetailsForm` + `AdminQuestionEditor` + `AdminPublishPanel`) as the legacy admin | Route keyed on slug; resolves to event id via `game_event_drafts.id` (the [#114](https://github.com/kcrobinson-1/neighborly-events/pull/114) fix path); `is_root_admin()` says yes; per-event workspace seeded by `loadDraftEventSummary` |

The walk verifies, end to end on production, every load-bearing
contract this phase ships:

- The Vercel routing dispatcher routes `/event/:slug/admin` to
  apps/web's per-event admin (URL-contract invariant).
- The page-level state machine reaches the authorized branch via
  `useOrganizerForEvent` for an admin caller, without calling
  `getGameAdminStatus` (single-per-event-auth-gate invariant).
- The slug → event-id resolution succeeds against
  `game_event_drafts` for a draft-only event (the
  [#114](https://github.com/kcrobinson-1/neighborly-events/pull/114)
  fix; before that PR, even root admins role-gated on draft-only
  events).
- The non-authorized inputs (id-as-slug, slug-as-id) collapse
  correctly to their respective non-leaking gates.
- Visual parity with the legacy admin holds (same editor
  components composed the same way) — the redundant-entry-point
  comparison this phase's plan named is implicit in the workspace
  rendering correctly with the same chrome.

### Validation that ran during implementation

- `npm run lint` — pass
- `npm run build:web` — pass
- `npm run build:site` — pass
- `npm test` — 47 files / 473 tests, all pass
- `npm run test:functions` — 83 deno tests, all pass
- pgTAP suite — unchanged from M2 phase 2.1 (no SQL edits in
  this phase or in [#114](https://github.com/kcrobinson-1/neighborly-events/pull/114))

The local-Supabase manual round-trip described in Execution step
11 was attempted but blocked by a separate operator-side
Supabase Auth allow-list configuration issue
([Redirect URLs allow-list mismatch](https://supabase.com/docs/guides/auth/redirect-urls):
exact-match entries don't admit the `?next=` query string, so
Supabase fell back to Site URL on every local sign-in attempt).
The fix is to use double-asterisk wildcard entries
(`http://localhost:5173/**`, etc.) per the Supabase doc's
local-dev guidance; not a code issue and not a blocker for this
phase. The four-URL walk above exercises the same end-to-end
contract against the production origin where the allow-list is
configured correctly.

The vitest matrix at
[`tests/web/pages/EventAdminPage.test.tsx`](../../../../tests/web/pages/EventAdminPage.test.tsx)
and
[`tests/shared/auth/useOrganizerForEvent.test.ts`](../../../../tests/shared/auth/useOrganizerForEvent.test.ts)
exercises the organizer-only path of the OR gate (organizer
true + admin false → authorized) symmetrically with the
admin-only path (organizer false + admin true → authorized) at
the unit level. The production walk verified the admin path
end-to-end; the organizer path is logically symmetric (single
OR-shape over two parallel RPC calls; same 2.1.1 RLS broadening
covers both branches). A manual organizer-fixture round-trip is
deferred to whoever next needs to seed an organizer assignment
in production for any reason — at that point exercising the
flow becomes free, and there's no current operational driver to
seed it just for this verification.

**Parent epic:** [`event-platform-epic.md`](../../event-platform-epic.md),
Milestone M2, Phase 2.2. Sibling phases: 2.1 RLS broadening + Edge
Function organizer gate — Landed
([`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md));
2.3 `/auth/callback` and `/` migration — Proposed; 2.4 platform admin
migration — Proposed; 2.5 `/game/*` URL migration — Proposed. The
epic's M2 row stays `Proposed` until 2.5 also lands.

**Hard dependency on 2.1 already-merged.** Per
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
"Cross-Phase Risks → Phase ordering violation," merging this phase
before 2.1.1 + 2.1.2 ships a UI that *appears* organizer-authorized but
returns zero rows on every read (RLS filters drafts and versions) and
401/403 on every save/publish round-trip (the four authoring functions
still gate on `is_admin` only). 2.1.1 + 2.1.2 are both Landed; this
plan assumes both are in `main` before the 2.2 PR opens.

**Scoping inputs:** the per-phase scoping doc this plan compressed
from (`docs/plans/scoping/m2-phase-2-2.md`, deleted in M2 phase
2.5.3 batch deletion — see git history for the pre-deletion file
inventory, contracts walkthrough, and Resolved Decisions section);
[`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
"Cross-Phase Decisions" §1, §3, and "Settled by default" for the
audit-log-via-RPC, apps/site auth idiom, and combined-helper
deliberation; the Resolved Decisions for the
hook-home (`shared/auth/`) and helper-signature
(slug-resolved-to-event-id) settled defaults this plan inherits.

## Goal

Add a new per-event admin route at `/event/:slug/admin` in apps/web,
authorized by `is_organizer_for_event(<event-id>)` OR
`is_root_admin()`, that wraps the existing draft-detail authoring UI
(event-level fields, question editor, publish / unpublish) inside
`<ThemeScope theme={getThemeForSlug(slug)}>`. The route is the first
apps/web consumer of `<ThemeScope>` and the first surface in the
platform that grants authoring access on a per-event basis rather
than through the global root-admin allowlist.

The legacy apps/web `/admin/events/:eventId` deep-editor stays live
as a redundant entry point; phase 2.2 does not change `/admin*`
behavior. M2 phase 2.4 retires the legacy entry when it migrates
`/admin` to apps/site.

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file, not just the file that first
triggered the rule.

- **In-place themed shell across every state.** `<ThemeScope
  theme={getThemeForSlug(slug)}>` wraps every state branch the route
  can render — `missing_config`, `loading`, `signed_out`,
  `role_gate`, `transient_error`, and `authorized` — not only the
  authorized state. The wrapping happens in the route component
  itself, not inside the workspace child, so signing out, switching
  slugs, or hitting a transient error does not flash an unthemed
  shell.
- **Single per-event auth gate.** Authorization is decided exactly
  once per (slug, session) pair by `useOrganizerForEvent(slug)`; the
  route does **not** call `getGameAdminStatus()` /
  `is_admin`. An organizer who is not on the platform `is_admin`
  allowlist must reach the authorized state without hitting an
  "unauthorized" branch. The `dashboardState.unauthorized` branch
  from `useAdminDashboard` does not exist in the per-event flow.
- **ThemeScope wrapping is centralized in apps/web's routing
  dispatcher.** Per the M1 phase 1.5 invariant, every apps/web event
  route's `<ThemeScope>` wrapping happens in the central [`App.tsx`
  routing dispatcher](../../../../apps/web/src/App.tsx) — not per-page —
  so the M4 phase 4.1 site that wraps game/redeem/redemptions is
  symmetric with the M2 phase 2.2 site that wraps per-event admin.
  The `EventAdminPage` component does not re-wrap; its parent
  match-branch in `App.tsx` does.
- **Slug → event-id resolution leaks no information.** Unknown-slug,
  hard-deleted-event, signed-in-but-unassigned, and missing-`auth.users`-row
  cases all collapse to the same `role_gate` state. The role-gate copy
  does not distinguish them, mirroring the
  [`authorizeRedemptions.ts`](../../../../apps/web/src/redemptions/authorizeRedemptions.ts)
  / [`authorizeRedeem.ts`](../../../../apps/web/src/redeem/authorizeRedeem.ts)
  precedent.
- **Per-branch error semantics for the composed RPCs.** The hook
  runs `is_organizer_for_event` and `is_root_admin` in parallel.
  Either branch returning a transport-level error transitions the
  hook to `transient_error` (one automatic retry, then user-visible
  retry button). Either branch returning a non-boolean payload is
  treated as a transient error, not silently coerced. Both branches
  returning `false` is the signed-in-but-unassigned `role_gate` —
  not an error. Mirrors the `authorizeRedemptions` per-branch
  treatment so reviewer attention does not relitigate the shape.

## Naming

- New page component: `apps/web/src/pages/EventAdminPage.tsx`. Mirrors
  [`EventRedemptionsPage.tsx`](../../../../apps/web/src/pages/EventRedemptionsPage.tsx)
  / [`EventRedeemPage.tsx`](../../../../apps/web/src/pages/EventRedeemPage.tsx)
  shape: route-level component takes `{ onNavigate, slug }`, owns the
  session / authorization state machine, renders an in-place
  `SignInForm` for signed-out callers, and delegates the authorized
  state to a workspace child.
- New per-event workspace: `apps/web/src/admin/EventAdminWorkspace.tsx`.
  Composes the existing
  [`AdminEventDetailsForm`](../../../../apps/web/src/admin/AdminEventDetailsForm.tsx),
  [`AdminQuestionEditor`](../../../../apps/web/src/admin/AdminQuestionEditor.tsx),
  and [`AdminPublishPanel`](../../../../apps/web/src/admin/AdminPublishPanel.tsx)
  for one slug-resolved draft.
- New per-event hook: `apps/web/src/admin/useEventAdminWorkspace.ts`.
  Per-event analog to [`useAdminDashboard`](../../../../apps/web/src/admin/useAdminDashboard.ts);
  accepts a resolved `eventId`, seeds a single-draft dashboard state,
  and delegates the load/save/publish lifecycle to the existing
  [`useSelectedDraft`](../../../../apps/web/src/admin/useSelectedDraft.ts)
  hook.
- New shared auth hook: `shared/auth/useOrganizerForEvent.ts`. Returns
  a `UseOrganizerForEventState` discriminated union (`loading` /
  `authorized` / `role_gate` / `transient_error`).
- New shared events helper: `loadDraftEventSummary(eventId)` in
  [`shared/events/admin.ts`](../../../../shared/events/admin.ts). Reads
  one row from `game_event_admin_status` by event id and returns a
  `DraftEventSummary | null`. The existing
  [`loadDraftEvent`](../../../../shared/events/admin.ts) does the same
  status-by-id read internally before fetching the draft content;
  the new helper exposes that read for callers that need only the
  summary.
- New URL matcher: `matchEventAdminPath(pathname)` in
  [`shared/urls/routes.ts`](../../../../shared/urls/routes.ts), exported
  through [`shared/urls/index.ts`](../../../../shared/urls/index.ts).
  Mirrors [`matchAdminEventPath`](../../../../shared/urls/routes.ts) /
  [`matchEventRedeemPath`](../../../../shared/urls/routes.ts) decoding
  discipline (slash rejection, `decodeURIComponent` failure
  handling).
- Test file naming follows the surface-not-phase convention
  (`AGENTS.md` Anti-Patterns): the test files name what they cover
  (`useOrganizerForEvent.test.ts`, `EventAdminPage.test.tsx`,
  `routes.test.ts` extension), not the phase that produced them.

## Contracts

**`routes.eventAdmin(slug: string): AppPath`.** Already exported by
[`shared/urls/routes.ts`](../../../../shared/urls/routes.ts) for
forward-compatibility (M1 phase 1.2). Shape unchanged; this phase
adds the matcher and the route consumer.

**`matchEventAdminPath(pathname: string): { slug: string } | null`.**
Parses `/event/:slug/admin`, decodes the slug, returns `null` on
mismatch, embedded slash, empty slug, or `decodeURIComponent`
failure. Decoding discipline mirrors the existing matchers verbatim.

**`validateNextPath` allow-list.** Extended to admit
`matchEventAdminPath` hits, so a magic-link round-trip with
`?next=/event/<slug>/admin` returns to the per-event admin route
rather than falling back to `routes.home`. The matcher's slash and
encoding rejection is the open-redirect defense; no additional
checks are added at the `validateNextPath` boundary.

**`useOrganizerForEvent(slug: string): UseOrganizerForEventState`.**

```ts
type UseOrganizerForEventState =
  | { status: "loading" }
  | { status: "authorized"; eventId: string }
  | { status: "role_gate" }
  | { status: "transient_error"; message: string; retry: () => void };
```

Behavior contract:

- The hook is browser-only and depends on a configured `shared/auth/`
  + `shared/db/` providers pair (apps/web's startup wiring already
  satisfies this).
- On mount and on `slug` change, the hook resolves slug → event-id
  via `from("game_event_drafts").select("id").eq("slug", slug)` with
  `.maybeSingle()`, then runs
  `rpc("is_organizer_for_event", { target_event_id })` and
  `rpc("is_root_admin")` in parallel. Resolution reads
  `game_event_drafts` (always-present row from creation; SELECT
  broadened to organizers + admins by M2 phase 2.1.1) rather than
  `game_events` (only published events) so draft-only events are
  reachable for any authorized caller, including root admins.
- An unknown slug or both RPC branches returning `false` collapses to
  `role_gate` — no leak.
- A transport error or non-boolean payload from either RPC branch
  triggers one automatic retry after a short delay (mirrors
  `authorizeRedemptions`'s 2-second default; expose the same
  `retryDelayMs` option for testability), then transitions to
  `transient_error` with a user-visible `retry` callback.
- Slug change while a probe is in-flight cancels the in-flight
  request and re-runs against the new slug. The hook's effect
  cleanup must set the cancellation flag the same way
  `EventRedemptionsPage`'s `SignedInRedemptionsFlow` does.
- The hook does not depend on the `useAuthSession` state machine —
  it assumes the caller renders it only when `useAuthSession`
  reports `signed_in`. Mirrors the `SignedInRedemptionsFlow`
  separation.

**`EventAdminPage({ onNavigate, slug }): ReactNode`.** Route-level
component. Renders inside `<ThemeScope
theme={getThemeForSlug(slug)}>` (wrapping happens in `App.tsx`'s
match branch, not inside this component). State machine:

- `useAuthSession()` → `missing_config` / `loading` / `signed_out`
  produce the corresponding in-place themed shells, including a
  `SignInForm` for `signed_out` callers with copy specific to
  per-event admin (see Naming below). The `SignInForm` requests
  magic links with `next: routes.eventAdmin(slug)`.
- On `signed_in`, renders a `SignedInEventAdminFlow` child that
  invokes `useOrganizerForEvent(slug)` and renders one of:
  `loading`, `role_gate`, `transient_error`, `authorized`. The
  authorized branch renders the new `EventAdminWorkspace`.
- Sign-out is wired through the same `signOut` adapter
  `useAdminDashboard` already uses, with the same in-place
  error-banner copy on failure.

**`EventAdminWorkspace({ eventId, slug, ... }): ReactNode`.**
Per-event workspace. Composes
[`AdminEventDetailsForm`](../../../../apps/web/src/admin/AdminEventDetailsForm.tsx),
[`AdminQuestionEditor`](../../../../apps/web/src/admin/AdminQuestionEditor.tsx),
and [`AdminPublishPanel`](../../../../apps/web/src/admin/AdminPublishPanel.tsx)
for one slug-resolved draft. No draft list, no create / duplicate
buttons, no platform-admin "back to all events" link — only the
single-event edit / publish / unpublish surface. Drives state via
`useEventAdminWorkspace(eventId)`.

**`useEventAdminWorkspace(eventId: string)`.** Per-event hook. On
mount and on `eventId` change:

1. Calls `loadDraftEventSummary(eventId)` to seed a one-row
   dashboard state.
2. Synthesizes a `dashboardState`-shaped object with
   `status: "ready"`, `email: <session email>`, and
   `drafts: [<the one summary>]`.
3. Delegates to
   [`useSelectedDraft`](../../../../apps/web/src/admin/useSelectedDraft.ts)
   (existing hook) for the load / edit / save / publish / unpublish
   lifecycle. The synthetic dashboardState's `drafts` list is the
   `visibleDraftIdSet` `useSelectedDraft` keys on; this satisfies
   the existing dependency without a hook refactor.
4. Surfaces a transient-error banner + retry control if the seed
   read fails. The retry resets the seed and re-runs.

The hook does not call `getGameAdminStatus()` / `is_admin` (the
broadened RLS plus the prior `useOrganizerForEvent` gate is the
authorization point) and does not call `listDraftEventSummaries()`
(broadened SELECT means an organizer-of-many would over-fetch;
the focused `loadDraftEventSummary` is a one-row read).

**`loadDraftEventSummary(eventId: string): Promise<DraftEventSummary | null>`.**
New focused read in
[`shared/events/admin.ts`](../../../../shared/events/admin.ts). Selects
the same `game_event_admin_status` columns
`listDraftEventSummaries` selects, filters by `event_id`, and
returns `null` on no-match. The existing `loadDraftEvent` already
performs this status-by-id read internally before fetching draft
content; the new helper makes the read directly callable without
duplicating the row-mapping. No change to existing callers' import
paths or behavior.

**`shared/auth/useOrganizerForEvent` exports.** The new hook and
its `UseOrganizerForEventState` type re-export through
[`shared/auth/index.ts`](../../../../shared/auth/index.ts) so apps/web
consumes it via `import { useOrganizerForEvent } from "../auth"`
(matching the existing `useAuthSession` re-export pattern through
[`apps/web/src/auth/index.ts`](../../../../apps/web/src/auth/index.ts);
see the apps/web binding-module pattern from M1 phase 1.3.1).

**`apps/web/src/auth/index.ts` binding.** Re-export the new hook
and type alongside the existing `useAuthSession` /
`SignInForm` / `MagicLinkState` re-exports so per-event admin
imports stay symmetric with the redemption surfaces.

## Cross-Cutting Invariants Touched

Beyond the per-phase invariants in the section above, the
following epic-level invariants apply:

- **Auth integration.** Uses `shared/auth/` for session, magic-link
  request, sign-out, the in-place sign-in form, and now the
  organizer role hook. No new Supabase client; no inline role
  predicate. Verified by:
  [`shared/auth/index.ts`](../../../../shared/auth/index.ts) re-export
  list (the new hook lands here, not in `apps/web/src/auth/`).
- **URL contract.** `/event/:slug/admin` is the permanent contract
  reserved by M0 phase 0.3 in
  [`apps/web/vercel.json`](../../../../apps/web/vercel.json) lines 11–18.
  No other URL contract changes in this phase.
- **Theme route scoping.** The route is under `/event/:slug/*`, so
  `<ThemeScope>` wrapping is required; centralized in
  [`apps/web/src/App.tsx`](../../../../apps/web/src/App.tsx)'s match
  branch per the M1 phase 1.5 invariant.
- **Deferred ThemeScope wiring.** Through M3, `getThemeForSlug`
  returns the platform Sage Civic Theme for every slug (verified by
  [`shared/styles/themes/index.ts`](../../../../shared/styles/themes/index.ts)
  being an empty registry). Per-event admin renders Sage
  Civic-themed for any event including `madrona` until M4 phase 4.1
  registers Madrona's `Theme`. This is intentional, not a bug; the
  Risk Register and the PR description both call it out so
  reviewers don't relitigate the absence of brand customization.
- **Trust boundary.** Frontend writes flow through the four authoring
  Edge Functions whose authorization gates were broadened in M2
  phase 2.1.2 (`save-draft`, `publish-draft`, `unpublish-event`,
  `generate-event-code`); RLS on `game_event_drafts` /
  `game_event_versions` is the authoritative read enforcement
  point. The new UI does not bypass either layer.
- **In-place auth.** Every protected state — signed-out, loading,
  role-gate, transient-error — renders inside the same
  `<ThemeScope>`-wrapped shell as the authorized state. There is no
  redirect to a `/signin` page.
- **Per-event customization.** No per-event TypeScript code is
  added; the per-event surface is the slug-keyed Theme from the
  registry.

## Files to touch — new

- `shared/auth/useOrganizerForEvent.ts` — new hook implementing the
  `UseOrganizerForEventState` contract above. Slug → event-id
  lookup against `game_event_drafts` (covers both draft-only and
  published events), then parallel RPCs against
  `is_organizer_for_event` and `is_root_admin`. One automatic
  retry on transient failure with a configurable `retryDelayMs`
  matching `authorizeRedemptions`'s 2-second default; a manual
  `retry` callback exposed in the `transient_error` branch.
- `tests/shared/auth/useOrganizerForEvent.test.ts` — Vitest
  coverage for: unknown-slug → role_gate; signed-in-but-unassigned
  → role_gate; transport error on event lookup → automatic retry,
  second failure surfaces transient_error; both branches return
  false → role_gate; either RPC branch returns non-boolean →
  transient_error; organizer-only true → authorized; root-admin-only
  true → authorized; both true → authorized; cancellation on slug
  change while a probe is in-flight does not race the prior result.
- `apps/web/src/pages/EventAdminPage.tsx` — route-level page
  component. Owns the session-state machine and the magic-link
  request handler with `next: routes.eventAdmin(slug)`. Renders a
  `SignedInEventAdminFlow` child for `signed_in` callers that
  invokes `useOrganizerForEvent` and dispatches to either the
  in-place `role_gate` / `transient_error` shell or the
  `EventAdminWorkspace`.
- `apps/web/src/admin/EventAdminWorkspace.tsx` — per-event
  workspace. Composes the existing
  `AdminEventDetailsForm` / `AdminQuestionEditor` /
  `AdminPublishPanel`. No draft-list, create, duplicate, refresh,
  or "back to all events" affordances.
- `apps/web/src/admin/useEventAdminWorkspace.ts` — per-event hook.
  Calls `loadDraftEventSummary(eventId)` to seed a single-draft
  dashboard state, then composes
  [`useSelectedDraft`](../../../../apps/web/src/admin/useSelectedDraft.ts)
  for load / edit / save / publish / unpublish.
- `tests/web/pages/EventAdminPage.test.tsx` — Vitest coverage for:
  `missing_config` shell; `loading` shell; `signed_out` rendering
  the `SignInForm` with per-event copy; `role_gate` shell with the
  non-leaking copy; `transient_error` shell with retry button;
  `authorized` flow rendering the workspace and forwarding events
  through; assertion that every state renders inside an element
  with class name `theme-scope`.
- `tests/web/admin/useEventAdminWorkspace.test.ts` — unit coverage
  for: seed read success → ready dashboardState forwarded to
  selected-draft hook; seed read returns null → not-found state;
  seed read throws → transient-error state with retry that
  re-arms the seed.
- `tests/shared/urls/routes.test.ts` — extend the existing test
  file with cases covering `matchEventAdminPath` (positive,
  embedded-slash rejection, empty-slug rejection, `decodeURIComponent`
  failure rejection).
- `tests/shared/urls/validateNextPath.test.ts` — extend with
  positive coverage for `next=/event/:slug/admin` returning that
  pathname unchanged.

## Files to touch — modify

- [`shared/urls/routes.ts`](../../../../shared/urls/routes.ts) — add
  `matchEventAdminPath` mirroring the existing matchers.
- [`shared/urls/validateNextPath.ts`](../../../../shared/urls/validateNextPath.ts)
  — add the `matchEventAdminPath` allow-list branch.
- [`shared/urls/index.ts`](../../../../shared/urls/index.ts) — export
  `matchEventAdminPath`.
- [`shared/auth/index.ts`](../../../../shared/auth/index.ts) — export
  the new hook and its result type.
- [`apps/web/src/auth/index.ts`](../../../../apps/web/src/auth/index.ts)
  — re-export the new hook and result type from `shared/auth/`
  (mirrors the existing `useAuthSession` re-export pattern).
- [`shared/events/admin.ts`](../../../../shared/events/admin.ts) — add
  `loadDraftEventSummary(eventId): Promise<DraftEventSummary | null>`
  built on the existing `mapDraftSummary` helper and the same
  status-by-id read shape `loadDraftEvent` already uses.
- [`shared/events/index.ts`](../../../../shared/events/index.ts) —
  export `loadDraftEventSummary`.
- [`apps/web/src/lib/adminGameApi.ts`](../../../../apps/web/src/lib/adminGameApi.ts)
  — re-export `loadDraftEventSummary` (binding-module pattern from
  M1 phase 1.4).
- [`apps/web/src/App.tsx`](../../../../apps/web/src/App.tsx) — add the
  `matchEventAdminPath` branch to `getPageContent` and wrap the
  `EventAdminPage` render in `<ThemeScope
  theme={getThemeForSlug(matched.slug)}>`. The match-branch wrap
  is the centralized ThemeScope site for the per-event admin route
  per the M1 phase 1.5 invariant; M4 phase 4.1 will add symmetric
  wraps for the existing game / redeem / redemptions branches.
- [`apps/web/src/styles/_overrides.scss`](../../../../apps/web/src/styles)
  (or the appropriate existing partial — confirmed at
  implementation time) — add `.theme-scope { display: contents; }`
  so the wrapper `<div>` does not introduce unintended layout flow
  inside `.admin-layout` / `.app-card`. The shared `<ThemeScope>`
  component documents this expectation in its JSDoc; this phase
  ships the apps/web SCSS rule that satisfies it. (The exact
  partial is decided during implementation against the structure
  in
  [`apps/web/src/styles/_tokens.scss`](../../../../apps/web/src/styles/_tokens.scss)
  and its sibling partials; the rule lands in a partial that is
  unconditionally imported through
  [`apps/web/src/styles.scss`](../../../../apps/web/src/styles.scss).)
- [`docs/architecture.md`](../../../architecture.md) — add the new
  per-event admin route to the frontend route inventory and to the
  Vercel routing topology table footnote.
- [`docs/operations.md`](../../../operations.md) — add a one-line entry
  documenting the new organizer-accessible authoring URL and the
  fact that organizer access is event-scoped (not platform-wide).
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.

## Files intentionally not touched

- `supabase/migrations/*` — no SQL change. The RLS broadening 2.2
  consumes shipped in 2.1.1.
- `supabase/functions/*` — no Edge Function change. The
  organizer-or-admin authorization gate shipped in 2.1.2's
  `authenticateEventOrganizerOrAdmin` helper migration.
- [`apps/web/src/admin/useAdminDashboard.ts`](../../../../apps/web/src/admin/useAdminDashboard.ts),
  [`apps/web/src/admin/AdminDashboardContent.tsx`](../../../../apps/web/src/admin/AdminDashboardContent.tsx),
  [`apps/web/src/admin/AdminEventWorkspace.tsx`](../../../../apps/web/src/admin/AdminEventWorkspace.tsx),
  [`apps/web/src/admin/AdminPageShell.tsx`](../../../../apps/web/src/admin/AdminPageShell.tsx),
  [`apps/web/src/admin/draftCreation.ts`](../../../../apps/web/src/admin/draftCreation.ts),
  [`apps/web/src/pages/AdminPage.tsx`](../../../../apps/web/src/pages/AdminPage.tsx)
  — kept verbatim. Phase 2.4 owns the platform-admin scaffolding
  shrink (deleting `AdminDashboardContent`, `AdminPageShell`, the
  `useAdminDashboard` draft-list / create / duplicate state, and
  `draftCreation`); phase 2.2 must not reshape those files
  opportunistically. The deep-editor primitives
  (`AdminEventDetailsForm`, `AdminQuestionEditor`,
  `AdminQuestionList`, `AdminQuestionFields`,
  `AdminOptionEditor`, `AdminPublishPanel`, `eventDetails.ts`,
  `publishChecklist.ts`, `questionBuilder.ts`,
  `questionFormMapping.ts`, `questionStructure.ts`,
  `useSelectedDraft.ts`) stay in `apps/web/src/admin/` per the
  scoping doc's "Outputs Other Siblings Need" subsection
  (`docs/plans/scoping/m2-phase-2-2.md`, deleted in M2 phase
  2.5.3 batch deletion; see git history for the pre-deletion
  content) so phase 2.4's diff stays a clean surface-shrink
  rather than a mixed move/edit.
- [`apps/web/vercel.json`](../../../../apps/web/vercel.json) — no edit.
  `/event/:slug/admin` and `/event/:slug/admin/:path*` were
  reserved for apps/web by M0 phase 0.3 (lines 11–18); the SPA
  fallback already routes them to `/index.html`.
- [`apps/site/*`](../../../../apps/site) — no apps/site change. Phase 2.2
  is an apps/web addition; apps/site involvement begins in 2.3.
- `shared/styles/*` — no shared/styles change. The `<ThemeScope>`
  component, `getThemeForSlug` resolver, and platform Theme all
  ship in M1 phase 1.5.2 as inert primitives ready for the M2
  phase 2.2 wiring.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and a feature branch
   (not `main`). Confirm 2.1.1 + 2.1.2 are both in `main`
   (`git log --oneline main | grep -i "phase 2.1"` should show two
   merge commits before this branch's base). Read this plan, then
   [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) and
   the M1 phase 1.5.2 plan (the per-phase scoping doc that fed
   this plan, `docs/plans/scoping/m2-phase-2-2.md`, was deleted in
   M2 phase 2.5.3 batch deletion — see git history if needed)
   ([`shared-styles-foundation.md`](../../shared-styles-foundation.md))
   for the ThemeScope wrapping conventions before editing.
2. **Baseline validation.** Run `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`, and the repo's pgTAP runner of record
   (`npm run test:db` per [`docs/dev.md`](../../../dev.md)). All must
   pass before any edit. Capture a fresh UI-review snapshot of the
   existing `/admin/events/:eventId` deep editor for one fixture
   draft (mobile and desktop viewports) — this is the before pair
   for the redundant-entry-point comparison.
3. **shared/urls extension.** Add `matchEventAdminPath` in
   [`shared/urls/routes.ts`](../../../../shared/urls/routes.ts) and
   extend [`shared/urls/validateNextPath.ts`](../../../../shared/urls/validateNextPath.ts)
   to admit it. Export the matcher through
   [`shared/urls/index.ts`](../../../../shared/urls/index.ts). Land the
   new test cases in `tests/shared/urls/routes.test.ts` and
   `tests/shared/urls/validateNextPath.test.ts` in the same
   commit; re-run `npm test` in scope-mode to confirm the new
   matcher tests pass and existing tests stay green.
4. **shared/events read.** Add `loadDraftEventSummary(eventId)` in
   [`shared/events/admin.ts`](../../../../shared/events/admin.ts). Reuse
   the existing `mapDraftSummary` helper and the
   `game_event_admin_status` projection columns from
   `listDraftEventSummaries`. Export through
   [`shared/events/index.ts`](../../../../shared/events/index.ts) and
   re-export from
   [`apps/web/src/lib/adminGameApi.ts`](../../../../apps/web/src/lib/adminGameApi.ts).
   No other consumer change.
5. **shared/auth hook.** Implement
   `shared/auth/useOrganizerForEvent.ts` per the contract above.
   Cancellation discipline: a `let isCancelled = false;` flag set
   in the effect cleanup, mirrored against every async branch
   (event lookup, parallel RPC, retry timeout). Export through
   [`shared/auth/index.ts`](../../../../shared/auth/index.ts); re-export
   from [`apps/web/src/auth/index.ts`](../../../../apps/web/src/auth/index.ts).
   Land `tests/shared/auth/useOrganizerForEvent.test.ts` in the
   same commit. Tests use the existing `vitest` mock pattern from
   [`tests/shared/auth/api.test.ts`](../../../../tests/shared/auth/api.test.ts)
   for the Supabase client provider; no new test-harness scaffolding.
6. **Per-event hook.** Implement
   `apps/web/src/admin/useEventAdminWorkspace.ts`. Synthesize the
   `dashboardState` shape `useSelectedDraft` reads (a structural
   subset is enough — `useSelectedDraft` only walks
   `dashboardState.status` and `dashboardState.drafts`). Pass the
   existing `useSelectedDraft` `onUpdateDraftsList` updater so
   saves and publishes round-trip into the synthesized state.
   Land `tests/web/admin/useEventAdminWorkspace.test.ts` in the
   same commit.
7. **Workspace component.** Implement
   `apps/web/src/admin/EventAdminWorkspace.tsx` composing
   `AdminEventDetailsForm`, `AdminQuestionEditor`, and
   `AdminPublishPanel`. The component is intentionally smaller than
   `AdminEventWorkspace` because the per-event surface omits the
   draft list, create / duplicate, and "back to all events"
   affordances. Reuse the existing message-kind and busy-flag
   helpers from
   [`AdminEventWorkspace`](../../../../apps/web/src/admin/AdminEventWorkspace.tsx)
   in place — extract a shared helper only if the duplication
   crosses the AGENTS.md "feature-time cleanup" threshold (more
   than three occurrences with diverging intent). The default is
   in-place duplication, which is acceptable here per the same
   rule.
8. **Page component.** Implement
   `apps/web/src/pages/EventAdminPage.tsx`. The state-machine
   skeleton mirrors
   [`EventRedemptionsPage.tsx`](../../../../apps/web/src/pages/EventRedemptionsPage.tsx)
   — a top-level component handling the session state, a
   `SignedInEventAdminFlow` child handling the authorization
   state, and an authorized-only render of `EventAdminWorkspace`.
   Sign-in copy: per-event "Sign in to manage this event" framing,
   with a sub-copy line clarifying that organizer access is event-
   scoped. Sign-out wires through the same
   [`signOut` adapter](../../../../apps/web/src/lib/authApi.ts) the
   platform admin uses.
9. **App.tsx routing dispatch.** Add the `matchEventAdminPath`
   branch to `getPageContent` in
   [`apps/web/src/App.tsx`](../../../../apps/web/src/App.tsx). The match
   branch returns
   `<ThemeScope theme={getThemeForSlug(matched.slug)}><EventAdminPage ... /></ThemeScope>`
   — the wrap is in the dispatcher, not in the page component, per
   the M1 phase 1.5 centralization invariant. Add the
   `tests/web/pages/EventAdminPage.test.tsx` coverage in the same
   commit; the page test asserts the `theme-scope` wrapper class
   on every state branch using
   `@testing-library/react`'s `container.querySelector`.
10. **SCSS leak guard.** Add `.theme-scope { display: contents; }`
    (or equivalent neutral wrapper styling — confirm against the
    final SCSS partial structure during implementation) so the
    wrapper `<div>` does not break `.admin-layout` /
    `.app-card`'s flexbox / grid layout. UI-review captures from
    step 14 are the load-bearing verification.
11. **Function-level local exercise.** With local Supabase
    running, seed an organizer assignment for a fixture user
    against a test event:
    `insert into public.event_role_assignments(event_id, user_id, role) values ('<event-id>', '<user-id>', 'organizer');`.
    Sign in as that user via magic link (apps/web Vite dev origin),
    visit `/event/<slug>/admin`, and walk: load → edit → save
    (round-trips through `save-draft`) → publish → unpublish → sign
    out. Confirm that an unrelated authenticated user hitting the
    same URL renders the in-place `role_gate` shell, not an empty
    workspace. Confirm that an unknown slug renders `role_gate`
    too. The manual exercise is the load-bearing test for the
    organizer round-trip; Playwright fixtures inherit the
    `vercel dev` requirement that 2.3 introduces, so the
    Playwright capture in step 13 is a pre-`vercel dev` capture
    that runs against the apps/web dev origin.
12. **Validation re-run.** All baseline commands from step 2 must
    still pass. Type-check passes through `npm run build:web`;
    Vitest passes through `npm test`.
13. **Playwright capture.** Capture: organizer signs in via the
    new route's in-place form, reaches the authorized authoring
    workspace, saves a draft, publishes, unpublishes; non-organizer
    signed-in user hitting the same URL sees the in-place
    role-gate. Capture mobile and desktop viewports per the AGENTS
    UI-review process. Use
    [`scripts/ui-review/capture-ui-review.cjs`](../../../../scripts/ui-review/capture-ui-review.cjs)
    or its admin variant
    (`npm run ui:review:capture:admin`) extended for the new route
    if the existing script does not already cover it; if it
    requires extension, the extension lands in the same PR per
    AGENTS "extend that script when future verification needs new
    routes."
14. **UI-review redundant-entry-point comparison.** Capture the
    same draft via the legacy `/admin/events/:eventId` deep editor
    and the new `/event/<slug>/admin` route side-by-side. Both
    must render against Sage Civic without warm-cream apps/web
    `:root` token leak (the only paint difference between the two
    surfaces is the route-level chrome — the draft-detail
    components themselves are reused).
15. **Documentation update.** Edit
    [`docs/architecture.md`](../../../architecture.md) to add the new
    route to the frontend inventory and the Vercel routing
    topology footnote. Edit
    [`docs/operations.md`](../../../operations.md) for the
    organizer-accessible authoring URL one-liner. Walk the
    [`AGENTS.md`](../../../../AGENTS.md) "Doc Currency Is a PR Gate"
    triggers: `docs/architecture.md` updates because the apps/web
    URL inventory grew; `docs/operations.md` updates because a new
    organizer-accessible URL exists; `docs/product.md` does not
    update (organizer self-serve authoring becomes user-visible
    when 2.4 retires the legacy entry, not now); `docs/dev.md`
    does not update (no new validation command); `docs/backlog.md`
    does not update (the
    organizer-managed-agent-assignment unblock lands with 2.5);
    `docs/open-questions.md` does not update (the post-MVP
    authoring-ownership entry closes with 2.5);
    [`event-platform-epic.md`](../../event-platform-epic.md) M2 row
    stays `Proposed` (its flip lands with 2.5).
16. **Automated code-review feedback loop.** Walk the diff from a
    senior-reviewer stance against the Cross-Cutting Invariants
    above and each Self-Review Audit named below. Apply fixes in
    place; commit review-fix changes separately when that clarifies
    history per [`AGENTS.md`](../../../../AGENTS.md) Review-Fix Rigor.
17. **Plan-to-PR completion gate.** Walk every Goal,
    Cross-Cutting Invariant, Validation Gate command, and
    Self-Review Audit named in this plan. Confirm each is
    satisfied or explicitly deferred in this plan with rationale.
    Flip Status from `Proposed` to `Landed` in the same PR.
18. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](../../../../.github/pull_request_template.md).
    Title under 70 characters. Validation section lists every
    command actually run. UX Review: include the
    redundant-entry-point comparison captures from step 14 (mobile
    + desktop) and the new-route state-matrix captures from step
    13. Remaining Risk: legacy + new entry-point concurrent edit
    until 2.4 retires the legacy entry; per-event admin renders
    Sage Civic-themed for `madrona` until M4 phase 4.1 registers
    the Madrona Theme.

## Commit boundaries

Per [`AGENTS.md`](../../../../AGENTS.md) "Planning Depth," commit slices
named upfront:

1. **shared/urls extension.** `matchEventAdminPath` + the
   `validateNextPath` allow-list extension + the new test cases
   in `tests/shared/urls/`. Single commit; tests land alongside the
   matcher.
2. **shared/events seed read.** `loadDraftEventSummary` in
   [`shared/events/admin.ts`](../../../../shared/events/admin.ts), the
   index export, the apps/web binding-module re-export. Single
   commit; the helper has no consumer until commit 4 below.
3. **shared/auth organizer hook.** `useOrganizerForEvent` plus
   the index re-exports plus the test file. Single commit;
   apps/web binding-module re-export piggybacks here.
4. **apps/web per-event admin surface.** The new
   `EventAdminPage`, `EventAdminWorkspace`,
   `useEventAdminWorkspace`, the `App.tsx` dispatcher branch with
   the centralized `<ThemeScope>` wrap, the SCSS leak guard, and
   the test files. Single commit; the page has no reachable URL
   without the dispatcher branch and no rendered children without
   the workspace.
5. **Documentation update.** `docs/architecture.md`,
   `docs/operations.md`, plan Status flip. Single commit.
6. **Review-fix commits.** As needed during step 16, kept distinct
   from the substantive implementation commits per AGENTS
   Review-Fix Rigor.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. New test files:
  `tests/shared/auth/useOrganizerForEvent.test.ts`,
  `tests/web/pages/EventAdminPage.test.tsx`,
  `tests/web/admin/useEventAdminWorkspace.test.ts`. Extended files:
  `tests/shared/urls/routes.test.ts`,
  `tests/shared/urls/validateNextPath.test.ts`. The default vitest
  include glob (`tests/**/*.test.{ts,tsx}`) already covers the new
  files; no config change required.
- `npm run build:web` — pass on baseline; pass on final.
- `npm run build:site` — pass on baseline; pass on final. No
  apps/site source change; build pass confirms shared-package
  imports stay clean.
- `npm run test:functions` — pass on baseline; pass on final. No
  edge-function source change in this phase; the gate confirms 2.1.2's
  gate is still wired correctly.
- pgTAP suite — pass on baseline; pass on final. No SQL change in
  this phase; the gate confirms 2.1.1's broadened policies still
  pass after rebase.
- Manual organizer round-trip per Execution step 11 — **deferred
  to production** per the two-phase Plan-to-Landed Gate. The
  implementing PR merges with Status `In progress pending prod
  verification`; the post-deploy round-trip on the production
  origin (an organizer-fixture user signing in, loading a draft,
  saving, publishing, unpublishing on `/event/<slug>/admin`)
  satisfies this gate. A doc-only follow-up commit flips Status
  to `Landed` and records the verification evidence URL (the
  `Production Admin Smoke` workflow run that includes the new
  route, or a manual capture, whichever the release operator
  chooses).
- Playwright capture per Execution step 13 covering: organizer
  authorized state, organizer save → publish → unpublish round-trip,
  non-organizer role-gate, signed-out in-place form — **deferred
  to production**. The vitest matrix in `EventAdminPage.test.tsx`
  already covers the state-machine branches at the component
  level; the deferred capture is the end-to-end auth-cookie-real
  verification that only the production origin can satisfy
  without per-developer Supabase-dashboard configuration.
- UI-review redundant-entry-point comparison per Execution step
  14 — **deferred to production**. The captured pair lands in
  the doc-only follow-up commit alongside the Status flip.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](../../../self-review-catalog.md) and
matched to this phase's diff surfaces. The M2 paragraph in
[`event-platform-epic.md`](../../event-platform-epic.md) already names
the Platform-auth-gate, Silent-no-op-on-missing-lookup,
Error-surfacing-for-user-initiated-mutations,
Rename-aware-diff-classification, and CLI-tooling-pinning audits as
applicable.

### Frontend

- **Platform-auth-gate config audit.** The new route's auth gate
  pairs with two configuration surfaces: the
  `validateNextPath` allow-list (extended in this phase) and the
  Supabase Auth dashboard's redirect-URL list (operator-managed,
  per [`docs/operations.md`](../../../operations.md)). The dashboard's
  list must include `/event/:slug/admin` for every environment
  before the magic-link round-trip works end-to-end. The PR body's
  "Remaining Risk" section names this as a deploy-time check the
  release owner must run.
- **Silent-no-op on missing lookup audit.** Slug → event-id
  resolution, signed-in-but-unassigned, and missing-`auth.users`
  cases all collapse to `role_gate`. The audit walks: an unknown
  slug must not render an empty authorized shell against an
  undefined event id; a hard-deleted event must not let the
  workspace mount with stale state; a slug change while a probe is
  in-flight must cancel the prior probe rather than racing.
- **Error-surfacing for user-initiated mutations.** Save / publish
  / unpublish failures from the broadened authorization edge
  functions must surface visibly in the per-event workspace.
  `useSelectedDraft`'s save-state machine already does this; the
  audit confirms the new wiring forwards the failure messages
  through `EventAdminWorkspace` without swallowing them.
- **Effect cleanup audit.** `useOrganizerForEvent` and any new
  effect in `EventAdminPage` / `useEventAdminWorkspace` must clean
  up on unmount and on slug change. Specifically: the slug-change
  cleanup must cancel the in-flight event lookup *and* the
  parallel RPC promises, not only one of them; the retry timeout
  must be cleared on unmount.
- **Composed auth predicate per-branch error semantics.** Per the
  Cross-Cutting Invariants above. Walk every branch: organizer
  RPC error + root RPC success → transient_error;
  organizer RPC success + root RPC error → transient_error;
  organizer RPC false + root RPC false → role_gate;
  organizer RPC non-boolean + root RPC any → transient_error;
  both true → authorized. The test file asserts each
  branch.

### CI & testing infrastructure

- **Rename-aware diff classification.** This phase mostly adds new
  files. No deep-editor component is moved or renamed (per the
  intentional non-touch list above). `git diff --name-status`
  output should show pure `A` / `M` entries; if any `R` shows up,
  the diff has drifted into 2.4's surface and the
  AGENTS.md Anti-Patterns rule applies — stop and split.
- **CLI / tooling pinning audit.** No new dependencies introduced
  in this phase. If implementation surfaces a need for a new
  package (unlikely), it must land pinned per AGENTS.md
  Versioning And Dependency Discipline; the PR description names
  it explicitly.
- **Readiness-gate truthfulness audit.** Validation gate's manual
  organizer round-trip (Execution step 11) and the UI-review
  captures (Execution step 13) must reflect real runs, not code
  reasoning. The PR body's Validation section calls out the
  organizer-fixture user id and event id used so the run is
  reproducible.

## Documentation Currency PR Gate

Per [`AGENTS.md`](../../../../AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/architecture.md`](../../../architecture.md) — frontend route
  inventory adds the per-event admin route; Vercel routing
  topology footnote covers the existing reservation. Trust-boundary
  text already reflects organizer write capability after 2.1.2; no
  re-edit required there.
- [`docs/operations.md`](../../../operations.md) — adds a one-line entry
  documenting the new organizer-accessible authoring URL.
- [`docs/product.md`](../../../product.md) — no change. The implemented
  capability set surfaces to organizers only when 2.4 retires the
  legacy entry and surfaces a discoverable per-event admin URL;
  through 2.2 the route exists but is not surfaced in product UX.
- [`docs/dev.md`](../../../dev.md) — no change. No new validation command;
  the existing `npm run lint` / `npm test` / `npm run build:web`
  flow covers the new files unchanged.
- [`docs/open-questions.md`](../../../open-questions.md) — no change. The
  post-MVP authoring-ownership entry closes with M2's terminal PR
  (2.5) per the epic's "Open Questions Resolved By This Epic"
  paragraph.
- [`docs/backlog.md`](../../../backlog.md) — no change. The
  organizer-managed-agent-assignment unblock is recorded with M2's
  terminal PR (2.5).
- [`event-platform-epic.md`](../../event-platform-epic.md) — M2 row
  stays `Proposed`. Its flip lands with 2.5.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) —
  Phase Status table row for 2.2 updates from `not yet drafted` to
  the path of this plan when the plan-drafting commit lands; the
  same row updates from `Proposed` to `Landed` and gains a PR link
  when the implementing PR merges.
- This plan — Status flips from `Proposed` to `Landed`.

## Out Of Scope

Deliberately excluded from this phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **Direct organizer INSERT on `game_event_audit_log` and
  `game_event_versions`.** Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §1: writes flow through
  `publish_game_event_draft()` / `unpublish_game_event()` invoked
  under service_role by the broadened Edge Function gate. 2.2
  consumes this transparently — the existing
  [`publishDraftEvent`](../../../../shared/events/admin.ts) /
  [`unpublishEvent`](../../../../shared/events/admin.ts) helpers call
  the broadened functions without knowing that the underlying
  authorization mechanism changed.
- **Combined SQL helper RPC
  `is_admin_or_organizer_for_event(eventId)`.** Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions / Settled by default": no combined helper.
  `useOrganizerForEvent` composes `is_organizer_for_event` and
  `is_root_admin` client-side.
- **Organizer-managed agent assignment UI.** The post-epic
  follow-up that 2.1.1's `event_role_assignments` INSERT/DELETE
  policies unblock. 2.2 reads through `is_organizer_for_event`
  but does not write to `event_role_assignments`.
- **`/admin/events/:eventId` redirect to `/event/:slug/admin`.**
  Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §7: phase 2.4 removes the legacy URL
  with a 404, not a redirect. 2.2 keeps the legacy entry alive as
  a redundant entry point.
- **Slug-format validation helper in `shared/events/`.** Per
  M1 phase 1.4's "What is **not** extracted" list, `validateSlug`
  / `isValidSlug` does not exist today and lands when a real
  consumer drives the contract. 2.2 receives the slug from the
  router after `matchEventAdminPath`'s decoding, which already
  rejects slash-bearing and undecodable paths; a separate format
  validator would be unjustified surface.
- **Per-event organizer-redeem capability.** Resolution in
  [`m2-admin-restructuring.md`](./m2-admin-restructuring.md)
  "Cross-Phase Decisions" §2: the redeem RPC's
  `is_agent_for_event OR is_root_admin` gate stays unchanged
  through M2. 2.2 introduces no redemption surface.
- **`/event/:slug/admin` ThemeScope rendering Madrona's brand.**
  Resolved by the epic's "Deferred ThemeScope wiring" invariant:
  Madrona's `Theme` registers in M4 phase 4.1, not M2. The route
  renders Sage Civic-themed for `slug=madrona` through M3 by
  design.

## Risk Register

- **Authorized-UI-without-write-access.** If 2.2 merges before 2.1
  lands (it will not, per the hard ordering above, but the risk is
  named for completeness), organizers see the full workspace but
  every save / publish round-trip fails at the function layer.
  Mitigation: the Status block at the top of this plan declares
  the dependency; the Pre-edit Gate (Execution step 1) verifies
  both 2.1.1 and 2.1.2 are in `main` before any edit.
- **ThemeScope wrapping leaks layout.** The wrapper `<div>` may
  introduce unintended layout flow inside the existing
  `.admin-layout` / `.app-card` SCSS hierarchy. Mitigation:
  Execution step 10 lands the `display: contents` rule; the
  UI-review redundant-entry-point comparison in step 14 is the
  load-bearing verification.
- **Concurrent edit between legacy `/admin/events/:eventId` and
  `/event/:slug/admin`.** Both routes drive
  `useSelectedDraft` against the same `loadDraftEvent` /
  `saveDraftEvent` calls. Today there is no optimistic
  concurrency token; last-writer-wins. Mitigation: the redundancy
  lasts ~1 phase (2.4 retires the legacy entry). The PR body's
  Remaining Risk section names this; reviewer attention treats
  the redundancy as a bounded interim, not a permanent two-write
  surface.
- **Slug → event-id silent-no-op.** A typo in the URL slug or a
  hard-deleted draft surface as `role_gate`. The phase
  deliberately collapses these to a non-leaking gate per the
  Cross-Cutting Invariants. Reviewer attention should not read
  this as a bug; the role-gate copy is uniform across cases by
  design.

  *Sub-case: drafts that have never been published — resolved.*
  An earlier draft of this plan documented this as an accepted
  trade-off (slug → event-id resolution read `game_events`,
  which only contains published events, so draft-only events
  role-gated even root admins). Production verification of the
  initial implementation surfaced the gap immediately —
  signed-in root admins hit `role_gate` for the
  `community-checklist-2026` draft-only event because the
  slug → `game_events` lookup returned no row before the
  `is_root_admin()` RPC ever fired. The accepted-trade-off was
  wrong: the per-event admin must reach draft-only events for
  the same reason root admins reach them via the legacy
  `/admin/events/:eventId` route, and 2.1.1 already broadened
  `game_event_drafts.SELECT` to organizers + admins, so reading
  the drafts table for slug resolution preserves the same
  security posture. Fix landed: `useOrganizerForEvent` now
  resolves slug via
  `from("game_event_drafts").select("id").eq("slug", slug)`,
  covering both draft-only and published events for any
  authorized caller. The
  `event_role_assignments.event_id`-equals-`game_events.id`
  identity holds because the draft's `id` is itself the event
  id (drafts and events share the same primary-key namespace);
  no migration needed.

- **`getGameAdminStatus` drift into the per-event flow.** If a
  copied `dashboardState.unauthorized` branch from
  `useAdminDashboard` leaks into `useEventAdminWorkspace`, an
  organizer who is not on the root-admin allowlist sees "not
  allowlisted" copy on a route they *are* authorized for.
  Mitigation: `useOrganizerForEvent` is the single gate; the
  per-event hook does not call `getGameAdminStatus` (per the
  Cross-Cutting Invariants and Files Intentionally Not Touched).
  The `EventAdminPage.test.tsx` matrix asserts no
  "not allowlisted" copy renders for the authorized state.
- **`validateNextPath` allow-list expansion.** Adding the new
  matcher must keep the open-redirect defense intact. Mitigation:
  `matchEventAdminPath` mirrors the existing matchers' decoding
  + slash-rejection discipline verbatim; the new
  `validateNextPath.test.ts` cases cover both positive and
  open-redirect-attempt inputs.
- **Per-event admin scope drift into post-MVP authoring.** 2.2's
  workspace reuses the existing apps/web authoring components.
  Reviewers may pressure 2.2 to fix unrelated authoring issues
  opportunistically. Mitigation: this plan names the deep-editor
  components as in-place reuse, not opportunistic refactor;
  AGENTS.md Scope Guardrails apply. Any review feedback that
  would broaden the diff into the deep-editor primitives gets
  deferred to a focused follow-up rather than absorbed into 2.2.
- **`shared/events/admin.ts` surface growth.** Adding
  `loadDraftEventSummary` is a small addition but expands the
  exported surface. Mitigation: the new helper is colocated with
  the existing read helpers, follows the same `mapDraftSummary`
  pattern, and ships with binding-module re-export from
  apps/web's existing path. No call-site migration required.

## Backlog Impact

- "Organizer-managed agent assignment" stays *unblocked but not
  landed*. 2.2 does not change the unblock recorded by 2.1.1's
  `event_role_assignments` policies; the entry in
  [`docs/backlog.md`](../../../backlog.md) is updated with M2's terminal
  PR (2.5) per the milestone doc.

## Related Docs

- [`event-platform-epic.md`](../../event-platform-epic.md) — parent
  epic; M2 paragraph at lines 544–669.
- [`m2-admin-restructuring.md`](./m2-admin-restructuring.md) — M2
  milestone doc; cross-phase decisions, sequencing, invariants.
- `docs/plans/scoping/m2-phase-2-2.md` — scoping doc this plan
  compressed from (deleted in M2 phase 2.5.3 batch deletion; see
  git history for the pre-deletion content).
- [`m2-phase-2-1-plan.md`](./m2-phase-2-1-plan.md) — sibling phase
  whose RLS broadening + Edge Function gate this phase consumes.
- [`shared-styles-foundation.md`](../../shared-styles-foundation.md) —
  M1 phase 1.5 plan; ThemeScope component contract and the
  centralization-in-`App.tsx` invariant 2.2 inherits.
- [`docs/styling.md`](../../../styling.md) — themable-vs-structural token
  classification this phase consumes (no new tokens added).
- [`docs/self-review-catalog.md`](../../../self-review-catalog.md) —
  audit name source.
- [`AGENTS.md`](../../../../AGENTS.md) — workflow rules, Plan-to-PR
  Completion Gate, Doc Currency PR Gate.
