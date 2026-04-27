# M2 Phase 2.2 — Scoping

## Goal

Add a new per-event admin route shell at `/event/:slug/admin` in apps/web,
authorized by `is_organizer_for_event(eventId) OR is_root_admin()`,
wrapping the existing game-content authoring UI (event-level fields,
question editor, draft save / publish / unpublish) inside
`<ThemeScope theme={getThemeForSlug(slug)}>`. The route is the first
apps/web consumer of `<ThemeScope>` and the first surface in the platform
that grants authoring access on a per-event basis rather than through the
root-admin allowlist. The legacy apps/web `/admin/events/:eventId`
deep-editor stays live as a redundant entry point until M2 phase 2.4
retires it; phase 2.2 does not change `/admin*` behavior.

## Inputs From Siblings

- **From phase 2.1 — broadened authorization on the authoring
  surface.** Per the resolution recorded in
  [m2-admin-restructuring.md](../m2-admin-restructuring.md)
  "Cross-Phase Decisions" §1 (corrected during 2.1.1 implementation),
  organizer authoring authorization flows in two shapes:
  - **Reads** flow through PostgREST under broadened RLS. Phase 2.1.1
    replaces the SELECT policies on `game_event_drafts` and
    `game_event_versions` with two-branch versions
    (`is_organizer_for_event(<id>) OR is_root_admin()`) so 2.2's
    per-event admin can `loadDraftEvent` / `loadDraftEventStatus`
    via the existing PostgREST paths. The
    `game_event_admin_status` security_invoker view inherits the
    broadened underlying-table reads automatically.
  - **Writes** flow through the four authoring Edge Functions
    (`save-draft`, `publish-draft`, `unpublish-event`,
    `generate-event-code`) under `service_role`, which bypasses RLS
    entirely. Phase 2.1.2 widens the in-handler authorization gate
    to accept organizer callers. The Edge Function gate is the
    load-bearing authorization point for organizer authoring writes
    — direct-PostgREST writes against authoring tables stay
    root-only because their existing INSERT/UPDATE/DELETE policies
    are unchanged.
  Phase 2.2 ships a UI that *appears* authorized for organizers;
  without 2.1.1 + 2.1.2 in place, organizer reads return zero rows
  (RLS filters drafts and versions) and organizer save/publish
  round-trips return 401/403 from the function layer. Phase 2.2 must
  merge after both 2.1.1 and 2.1.2; the dependency is hard.
- **From phase 2.1 — `authenticateEventOrganizerOrAdmin` Edge Function
  helper.** 2.1 lands a shared helper at
  `supabase/functions/_shared/event-organizer-auth.ts`
  (`authenticateEventOrganizerOrAdmin(request, eventId, ...)`) and
  migrates `save-draft`, `publish-draft`, `unpublish-event`, and
  `generate-event-code` to it. The four functions already accept an
  event identifier in their request bodies, so 2.2's transports
  consume the broadened functions without contract changes — no new
  payload field, no new edge function, no new shared/events surface.
- **From phase 2.1 — concrete staffing table.**
  `public.event_role_assignments` (created by
  [supabase/migrations/20260421000100_add_event_role_assignments.sql](../../../supabase/migrations/20260421000100_add_event_role_assignments.sql))
  is the staffing table 2.1 broadens; phase 2.2 reads through
  `is_organizer_for_event` against it but does not write to it.
- **From phase 2.1 — helper signature.** Per
  [m2-phase-2-1.md](m2-phase-2-1.md) Inputs, all three role helpers
  take `event_id text` (the `game_events.id` PK), not a slug. Phase
  2.2 resolves slug → event-id via the existing
  [authorizeRedemptions.ts](../../../apps/web/src/redemptions/authorizeRedemptions.ts)
  / [authorizeRedeem.ts](../../../apps/web/src/redeem/authorizeRedeem.ts)
  pattern (`game_events` lookup) before calling the helper.
- **From M1 phase 1.5.2 (Landed).**
  [shared/styles/ThemeScope.tsx](../../../shared/styles/ThemeScope.tsx),
  [shared/styles/getThemeForSlug.ts](../../../shared/styles/getThemeForSlug.ts),
  [shared/styles/themes/platform.ts](../../../shared/styles/themes/platform.ts),
  and the empty registry at
  [shared/styles/themes/index.ts](../../../shared/styles/themes/index.ts).
  `getThemeForSlug` returns the Sage Civic platform Theme for every
  slug through M3 — see "Cross-Cutting Invariants Touched" below.
- **From M1 phase 1.4 (Landed).** `shared/events/` admin surface:
  `getGameAdminStatus`, `loadDraftEvent`, `saveDraftEvent`,
  `publishDraftEvent`, `unpublishEvent`, `loadDraftEventStatus`,
  `generateEventCode`, plus the `DraftEventDetail` /
  `DraftEventSummary` types. Phase 2.2 reuses the function-call
  surface verbatim; the slug → event-id resolution is new.
- **From M1 phase 1.3 (Landed).** `shared/auth/` — `useAuthSession`,
  `requestMagicLink`, `signOut`, `SignInForm`, `AuthCallbackPage`.
  In-place auth re-uses `SignInForm` with route-specific copy.
- **From M1 phase 1.2 (Landed).** [shared/urls/routes.ts](../../../shared/urls/routes.ts)
  already exports `routes.eventAdmin(slug)` for forward-compatibility;
  the matcher and `validateNextPath` allow-list entry land in this
  phase per the epic ("their matchers and `validateNextPath` allow-list
  entries land with their consumers").
- **From M0 phase 0.3 (Landed).**
  [apps/web/vercel.json](../../../apps/web/vercel.json) already
  reserves `/event/:slug/admin` and `/event/:slug/admin/:path*` for
  apps/web. No vercel.json edit needed.

## Outputs Other Siblings Need

- **Pattern for in-place auth inside `<ThemeScope>`.** M3 phase 3.1
  (apps/site event landing) and M4 phase 4.1 (apps/web event-route
  ThemeScope wiring for game/redeem/redemptions) consume the same
  shape: themed shell wraps every auth state, not just the
  authenticated one.
- **Decision: TS-level organizer hook lands in `shared/auth/`.**
  Phase 2.1 explicitly raises this question to phase 2.2
  ([m2-phase-2-1.md](m2-phase-2-1.md) "Open Questions / Inter-phase
  coordination"); 2.2 answers yes — `useOrganizerForEvent(slug)` lands
  in `shared/auth/`, mirroring the SQL helper, per the epic's M1 phase
  1.3 note ("M2 phase 2.2 is the natural home for
  `useOrganizerForEvent` when it has a real consumer"). The hook
  resolves slug → event-id and runs the
  `is_organizer_for_event` / `is_root_admin` RPC round-trip with the
  retry-once-on-transient-failure pattern from
  [authorizeRedemptions.ts](../../../apps/web/src/redemptions/authorizeRedemptions.ts).
  Future organizer-scoped surfaces (post-epic agent assignment UI;
  potential M3 organizer landing-page editor) consume it.
- **Decision: deep-editor components stay in `apps/web/src/admin/`
  and are shared, not moved.** Phase 2.4 raises this question
  ([m2-phase-2-4.md](m2-phase-2-4.md) "Open Questions / Inter-phase
  coordination — Phase 2.2 deep-editor module ownership"); 2.2
  answers: keep `AdminEventDetailsForm`, `AdminQuestionEditor`,
  `AdminQuestionList`, `AdminQuestionFields`, `AdminOptionEditor`,
  `AdminPublishPanel`, `eventDetails.ts`, `publishChecklist.ts`,
  `questionBuilder.ts`, `questionFormMapping.ts`,
  `questionStructure.ts`, and `useSelectedDraft.ts` in their existing
  `apps/web/src/admin/` location. The new `EventAdminWorkspace`
  composes them for the per-event surface; phase 2.4's deletion only
  removes the platform-admin scaffolding (`AdminPageShell`,
  `AdminDashboardContent`, `AdminEventWorkspace`'s list branch,
  `useAdminDashboard`, `draftCreation.ts`). No move, no rename, so
  reviewer attention in 2.2 stays on the new files; phase 2.4's diff
  stays a clean surface-shrink.
- **No URL-contract changes.** `/event/:slug/admin` is already in the
  permanent URL contract; phase 2.2 makes the route real but does not
  reshape the contract for downstream phases.

## File Inventory

### shared/urls/

- [shared/urls/routes.ts](../../../shared/urls/routes.ts) — edit. Add
  `matchEventAdminPath(pathname)` mirroring `matchAdminEventPath` /
  `matchEventRedeemPath`.
- [shared/urls/validateNextPath.ts](../../../shared/urls/validateNextPath.ts)
  — edit. Extend the allow-list to accept `matchEventAdminPath` hits.
- [shared/urls/index.ts](../../../shared/urls/index.ts) — edit. Export
  `matchEventAdminPath`.
- `tests/shared/urls/` — edit or create. Cover the new matcher and the
  extended `validateNextPath` allow-list.

### shared/auth/

- `shared/auth/useOrganizerForEvent.ts` — create. Hook that runs the
  slug → event-id lookup plus the
  `is_organizer_for_event` / `is_root_admin` RPC round-trip with the
  retry-once-on-transient-failure pattern from
  [apps/web/src/redemptions/authorizeRedemptions.ts](../../../apps/web/src/redemptions/authorizeRedemptions.ts).
  Returns a `{ status, eventId?, eventCode? }` discriminated union.
- [shared/auth/index.ts](../../../shared/auth/index.ts) — edit. Export
  the new hook and its result type.
- `tests/shared/auth/useOrganizerForEvent.test.ts` — create. Cover
  loading → authorized, loading → role_gate (unknown slug), loading →
  role_gate (signed-in but unassigned), and transient-error retry.

### apps/web

- `apps/web/src/pages/EventAdminPage.tsx` — create. Route shell:
  resolves `useAuthSession`, then `useOrganizerForEvent(slug)`, wraps
  every state branch in `<ThemeScope theme={getThemeForSlug(slug)}>`,
  and reuses the existing authoring workspace from `apps/web/src/admin/`
  for the authorized/ready state.
- `apps/web/src/admin/EventAdminWorkspace.tsx` — create. Per-event
  workspace that drives one slug-resolved draft through the existing
  edit/save/publish/unpublish flow. Composed from the same building
  blocks `AdminEventWorkspace` already uses (`AdminEventDetailsForm`,
  `AdminQuestionList`, `AdminQuestionEditor`, `AdminPublishPanel`)
  without the draft-list / draft-mutation scaffolding that only the
  platform admin needs.
- `apps/web/src/admin/useEventAdminWorkspace.ts` — create. Per-event
  hook analogous to `useAdminDashboard` but seeded with one event-id
  resolved from the slug, omitting list-load and create/duplicate
  state. Delegates draft-detail editing to the existing
  `useSelectedDraft` hook so the Save/Publish/Unpublish state
  machines stay shared with `/admin/events/:eventId`.
- [apps/web/src/App.tsx](../../../apps/web/src/App.tsx) — edit. Add
  the `matchEventAdminPath` branch to `getPageContent` and route to
  `EventAdminPage`.
- `tests/web/pages/EventAdminPage.test.tsx` — create. Cover the
  signed-out, role-gate, transient-error, and authorized states; assert
  every state renders inside a `theme-scope` wrapper element.

### supabase/

- No SQL or edge-function changes in this phase. RLS broadening and
  edge-function authorization extension belong to phase 2.1.

### docs/

- [docs/architecture.md](../../architecture.md) — edit. Add the new
  per-event admin route to the frontend route inventory and to the
  Vercel routing topology table footnote.
- [docs/operations.md](../../operations.md) — edit. Note the new
  organizer-accessible authoring URL.
- The plan doc at `docs/plans/m2-phase-2-2-plan.md` is a downstream
  task, not part of this scoping.

### vercel.json

- [apps/web/vercel.json](../../../apps/web/vercel.json) — no edit.
  `/event/:slug/admin` and `/event/:slug/admin/:path*` are already
  rewritten to the SPA index by M0 phase 0.3.

## Contracts

- `routes.eventAdmin(slug: string): AppPath` — already exported. No
  shape change.
- `matchEventAdminPath(pathname: string): { slug: string } | null` —
  parses `/event/:slug/admin`, decodes the slug, returns null on
  mismatch or invalid encoding. Mirrors `matchEventRedeemPath`.
- `validateNextPath`: extends the allow-list so signed-in callers can
  return to `/event/:slug/admin` after magic-link round-trip.
- `useOrganizerForEvent(slug: string): { status: "loading" | "authorized" | "role_gate" | "transient_error"; eventId?: string; eventCode?: string; message?: string; retry: () => void }` —
  hook contract. `role_gate` collapses unknown-slug and
  signed-in-but-unassigned cases (matches the redeem/redemptions
  non-leaking gate). One automatic retry on transient failure;
  `retry()` re-arms manually after that.
- `EventAdminPage({ slug, onNavigate }): ReactNode` — page contract.
  Renders `<ThemeScope theme={getThemeForSlug(slug)}>` around every
  state branch, including signed-out, loading, role-gate, transient-
  error, and authorized.
- `EventAdminWorkspace` reuses the existing
  `AdminEventDetailsForm` / `AdminQuestionList` / `AdminQuestionEditor`
  / `AdminPublishPanel` building blocks; no new draft-content shape.

## Cross-Cutting Invariants Touched

- **Auth integration.** Uses `shared/auth/` for session, magic-link,
  sign-out, and the in-place sign-in form. No new Supabase client.
- **URL contract.** `/event/:slug/admin` is the permanent contract for
  per-event admin and was reserved by M0 phase 0.3; no other path
  changes.
- **Theme route scoping.** The route is under `/event/:slug/*`, so
  `<ThemeScope>` wrapping is required; the wrapping happens inside
  `App.tsx`'s routing dispatcher per the M1 phase 1.5.2 invariant
  ("ThemeScope placement in apps/web is centralized in `App.tsx`").
- **Deferred ThemeScope wiring.** Through M3, `getThemeForSlug` returns
  the Sage Civic platform Theme for every slug; the per-event admin
  therefore renders Sage Civic-themed for any event, including
  `madrona`, until M4 phase 4.1 registers Madrona's Theme. This is
  intentional and the plan doc must call it out so reviewers don't
  flag the lack of brand customization as a bug.
- **Trust boundary.** Frontend writes flow through the existing
  authoring edge functions backed by `is_admin() OR
  is_organizer_for_event(eventId)` (after phase 2.1); RLS on the
  underlying tables is the authoritative enforcement point. The new
  UI does not bypass either layer.
- **In-place auth.** All non-authorized states — signed-out, loading,
  role-gate, transient-error — render inside the same
  `<ThemeScope>`-wrapped shell as the authorized state. There is no
  redirect to a `/signin` page.
- **Per-event customization.** No per-event TypeScript code is added;
  the per-event surface is the slug-keyed Theme, which the registry
  already drives.

## Validation Gate

- `npm run lint`.
- `npm run build:web`.
- Vitest covering `matchEventAdminPath`, the extended
  `validateNextPath` allow-list, `useOrganizerForEvent` (signed-out,
  role-gate, transient-error retry, authorized), and the
  `EventAdminPage` state matrix (every state inside ThemeScope).
- Existing pgTAP suite still passes (no SQL change in this phase, but
  phase 2.1 must already be in place for organizer round-trips).
- Playwright capture covering: organizer signs in via the new route's
  in-place form; reaches the authorized authoring workspace; saves a
  draft; publishes; unpublishes. Plus a non-organizer signed-in user
  hitting the same URL and seeing the in-place role-gate.
- Manual verification: a root-admin can still author the same draft at
  the legacy `/admin/events/:eventId` route (redundant entry point
  preserved through phase 2.4).
- UI-review capture comparing per-event admin against `/admin` to
  confirm both surfaces render against Sage Civic and that no
  warm-cream apps/web `:root` token leaks into the themed shell.

## Self-Review Audits

Drawn from [docs/self-review-catalog.md](../../self-review-catalog.md);
the M2 paragraph already names these for phase 2.2.

### Frontend

- **Platform-auth-gate config audit.** The new route's auth gate +
  `validateNextPath` allow-list + Supabase Auth dashboard redirect URL
  list must agree on `/event/:slug/admin` for every environment.
- **Silent-no-op on missing lookup audit.** Slug → event-id resolution
  must surface "event not found" (collapsed into the role_gate copy
  per the redeem/redemptions precedent) rather than rendering an empty
  authorized shell against an undefined event id.
- **Error-surfacing for user-initiated mutations.** Save / publish /
  unpublish failures from the broadened-authorization edge functions
  must surface visibly in the per-event workspace; the existing
  `useSelectedDraft` save-state machine already does this, but the
  audit walks the new wiring.
- **Effect cleanup audit.** `useOrganizerForEvent` and any new effect
  in `EventAdminPage` must clean up cancellation tokens on unmount
  and on slug change.

### CI

- **Rename-aware diff classification.** This phase mostly adds new
  files; if any apps/web admin component is moved to be shared with
  the new workspace, the move must be classified rename-vs-edit so
  reviewers see content changes, not move noise.

## Resolved Decisions

All open questions for 2.2 are settled. See
[m2-admin-restructuring.md](../m2-admin-restructuring.md)
"Cross-Phase Decisions" for the full deliberation; this section
records the resolutions and the rejected alternatives.

- **`redeem_entitlement_by_code` organizer broadening → defer.** 2.1
  does not broaden the RPC's gate in M2. 2.2 introduces no redemption
  surface, so this resolution affects 2.2 only as confirmation that
  no organizer-redeem capability lands during M2.
  *Rejected: broaden in 2.1 — adds mass-redeem attack surface for
  zero in-epic feature value.*
- **Audit-log + versions writes via the broadened Edge Function
  path.** 2.1's resolution: writes flow through
  `publish_game_event_draft()` / `unpublish_game_event()` (invoked
  under service_role by the broadened Edge Function gate) rather
  than direct INSERT. The RPC bodies are unchanged. The "Inputs
  From Siblings" section above carries the updated wording; no 2.2
  contract changes.
  *Rejected: direct organizer INSERT on audit-log + versions —
  invariant-breaking.*
- **2.1's RLS scope narrowed to reads.** 2.1.1 ships SELECT
  broadening on `game_event_drafts` / `game_event_versions` plus
  `event_role_assignments` SELECT/INSERT/DELETE. 2.2's UI relies on
  this for the existing PostgREST read paths
  (`loadDraftEvent`, `loadDraftEventStatus`, `getGameAdminStatus`)
  to work for organizers. The plan author should not assume direct
  PostgREST writes against authoring tables are reachable for
  organizers — they go through Edge Functions.
  *Rejected: direct-PostgREST INSERT/UPDATE/DELETE broadening on
  authoring tables — silent no-op for UPDATE/DELETE due to
  SELECT-visibility coupling; no consumer for INSERT.*

Other previously-open questions on helper signature (slug vs
event-id), edge-function authorization shape, hook home
(`shared/auth/`), and `getGameAdminStatus` semantics are resolved by
[m2-phase-2-1.md](m2-phase-2-1.md) (helper signature; shared
`authenticateEventOrganizerOrAdmin`) and by 2.2's own File Inventory
and Contracts above (hook in `shared/auth/`; per-event route skips
`getGameAdminStatus` and gates on `useOrganizerForEvent`).

## Risks

- **Authorized-UI-without-write-access.** If 2.2 merges before 2.1's
  RLS broadening and edge-function widening, organizers see the full
  workspace but every save/publish round-trip fails at the function
  layer. Mitigation: hard ordering in PR sequencing, surfaced in the
  plan doc as an explicit dependency.
- **ThemeScope wrapping leaks layout.** The wrapper `<div>` may
  introduce unintended layout flow inside the existing `.admin-layout`
  / `.app-card` SCSS hierarchy. Mitigation: assert `display: contents`
  (or equivalent neutral wrapper styling) on `.theme-scope` in
  apps/web SCSS as part of this phase's diff.
- **Concurrent edit between legacy `/admin/events/:eventId` and
  `/event/:slug/admin`.** Both routes can author the same draft until
  2.4 retires the legacy entry. Today there is no optimistic
  concurrency token; last-writer-wins. Mitigation: call this out in
  the plan doc and accept it for the ~1 phase the redundancy lasts.
- **Slug → event-id silent-no-op.** A typo in the URL slug, a draft
  that has never been published (no `game_events` row yet), or a
  hard-deleted event all surface as `role_gate`. The phase deliberately
  collapses these to a non-leaking gate, but the plan doc must name
  the trade-off so reviewers don't read it as a bug.
- **`getGameAdminStatus` drift.** If the per-event admin route still
  calls `getGameAdminStatus` (the global root-admin allowlist) for
  any flow — e.g., a copied `dashboardState.unauthorized` branch from
  `useAdminDashboard` — an organizer who isn't on the root-admin
  allowlist will see "not allowlisted" copy on a route they *are*
  authorized for. Mitigation: `useOrganizerForEvent` is the single
  gate; the platform-allowlist branch is removed from the per-event
  flow. Phase 2.4's platform-admin keeps the allowlist semantics
  unchanged (root-admin only) per [m2-phase-2-4.md](m2-phase-2-4.md).
- **`validateNextPath` allow-list expansion.** Adding the new matcher
  must keep the open-redirect defense intact — the matcher must reject
  paths with embedded slashes or non-ASCII bytes after decoding.
  Mirror the existing matchers' decoding-and-validation discipline.
