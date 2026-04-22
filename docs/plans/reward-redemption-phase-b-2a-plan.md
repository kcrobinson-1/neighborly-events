# Reward Redemption — Phase B.2a Execution Plan

**Status:** Landed in commits `c1b60a2`, `f6980fc`, `ff8dc65`, `9eb544c`, `19993fb`, `4accef3`, and `9b68f03`.
**Parent overview:** [`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md)
**Parent design:** [`reward-redemption-mvp-design.md`](./reward-redemption-mvp-design.md)
**Predecessors (all landed):**
[`auth-signin-generalization-plan.md`](./auth-signin-generalization-plan.md),
[`reward-redemption-phase-a-2b-plan.md`](./archive/reward-redemption-phase-a-2b-plan.md),
[`reward-redemption-phase-b-1-plan.md`](./reward-redemption-phase-b-1-plan.md),
[`event-code-prerequisite-plan.md`](./archive/event-code-prerequisite-plan.md).
**Successor (drafted separately before its implementation time):**
`reward-redemption-phase-b-2b-plan.md` — layers the reverse CTA,
confirmation flow, and `reverse-entitlement-redemption` invocation into
the detail sheet this phase lands.
**Scope:** Phase B.2a only — the `/event/:slug/redemptions` mobile
monitoring route as a **read-only** dispute-verification surface. No
reversal CTA, no reversal confirmation, no `reverse-entitlement-redemption`
invocation, no attendee polling, no role seeding, no new Edge Function /
RPC / migration.

## Why B.2a Exists

B.1 shipped `/event/:slug/redeem` so agents can redeem codes. Nothing
yet gives organizers a dispute-resolution view: an attendee who claims
"I was already redeemed" or "the agent said it failed but I think it
went through" forces the organizer to read rows directly from the
database. B.2a adds the mobile monitoring surface the design doc locks
at `/event/:slug/redemptions`, with the listing, filtering, and
verification flows needed to handle disputes in the booth without
falling back to SQL.

B.2a ships inert: no nav link, no `/admin` link, no role seeding, and
no reversal capability. The route is reachable only by direct URL and
only by event-scoped organizers or root admins. Reversal stays on
direct-SQL runbook operation until B.2b lands the reverse CTA and
confirmation flow on top of the detail sheet B.2a introduces. This
mirrors the unadvertised-entry deployment posture locked in the Phase
B overview and the MVP design doc §10 step 6.

## Summary

Add one new client route, `/event/:slug/redemptions`, gated by the
generalized sign-in shell. When an authenticated caller is an
organizer for the slug's event (or a root admin), render a mobile
monitoring surface: locked event-context header, sticky filter/search
bar, newest-first list of redemption events (redeemed or reversed
rows), and a view-only bottom-sheet detail view.

The list data source is a direct browser Supabase client `.select()`
against `public.game_entitlements`, protected by the A.2a RLS read
policy that already permits organizer reads scoped to the row's
`event_id`. Two bounded fetches (a redeemed slice ordered by
`redeemed_at` and a reversed slice ordered by
`redemption_reversed_at`, each `.limit(500)`) merge client-side into
one cached slice of the most recent dispute-activity events; PostgREST
`.order()` cannot express `COALESCE(...)`, so the merge is explicit.
The merged slice is filtered client-side by the four chips
(`Last 15m`, `Redeemed`, `Reversed`, `By me`) and by a suffix-first
search input. No new Edge Function, RPC, or migration lands in B.2a.
No mutation surface is introduced — reversal is entirely B.2b's
responsibility.

When an authenticated caller is not an organizer or root admin for the
slug, render the same non-leaking role-gate state B.1 uses. When no
caller is signed in, render `SignInForm` with monitoring-specific copy
and return through `/auth/callback?next=` pointing back at the
monitoring route.

After this phase merges, the organizer monitoring surface is reachable
by direct URL. B.2b layers the reversal flow into the detail sheet
B.2a ships. Phase C and Phase D proceed independently.

## Goals

- `/event/:slug/redemptions` renders correctly for authorized callers
  on a mobile viewport: locked event header, sticky filter/search bar,
  newest-first list, view-only bottom-sheet detail view.
- Unauthenticated callers see `SignInForm` with monitoring-specific
  copy; magic-link return lands on `/auth/callback?next=` and routes
  back to the same `/event/:slug/redemptions`.
- Authenticated-but-unassigned callers see an in-place role-gate
  state whose copy does not reveal whether the event exists.
- Authenticated callers whose authorization resolver fails with a
  transient error see a retryable inline banner instead of the
  role-gate copy, matching the three-verdict shape B.1 established.
- List fetch pulls the 500 most recent dispute-activity rows for the
  locked event as a client-side merge of two PostgREST `.select()`
  queries (redeemed slice ordered by `redeemed_at`, reversed slice
  ordered by `redemption_reversed_at`, each `.limit(500)`), both
  protected by the A.2a RLS read policy. The merged slice is sorted
  client-side by
  `COALESCE(redemption_reversed_at, redeemed_at) DESC, id DESC`,
  deduped by `id` (preferring the redeemed-slice record), and
  truncated to 500.
- Filter chips (`Last 15m`, `Redeemed`, `Reversed`, `By me`) and
  suffix-first search operate client-side against the cached slice
  with no server round-trip per filter change.
- A "showing most recent 500" affordance renders when the fetch
  returns exactly 500 rows, without leaking any cross-event hint.
- The monitoring header shows a "last updated at" timestamp that
  anchors to the last successful fetch; an explicit refresh action
  triggers a refetch.
- `AppPath`, `routes`, and `validateNextPath` recognize the new route
  so the sign-in return round-trip works and cannot open-redirect.
- Focused Vitest files pin the suffix-search parser, the chip filter,
  the bottom-sheet focus-trap behavior, and the page-level
  signed-out / role-gate / authorized / transient-error branches.
- A mobile-viewport Playwright smoke exercises the dominant flow
  (sign in, load list, apply chip filter, open detail sheet, close)
  against local Supabase with a seeded organizer fixture. B.2a does
  not need `functions serve`; see the runner note in § "Target
  Structure / Tests".
- The Phase B.2a plan doc flips `Status` to `Landed` in the same PR
  that implements it, with the implementing commit SHAs recorded.
- Touched docs (`docs/architecture.md`, `docs/backlog.md`, the Phase B
  overview's sub-phase summary, `docs/tracking/code-refactor-checklist.md`
  for the deferred shared-resolver extraction) reflect the implemented
  state before handoff.

## Non-Goals

- Any reversal surface: reverse CTA, confirmation dialog, reason
  input, `reverse-entitlement-redemption` invocation, post-reversal
  refetch, single-row re-read. All B.2b.
- Extraction of a shared `resolveEventContext` helper from B.1's
  `authorizeRedeem.ts`. B.2a lands `authorizeRedemptions.ts` as a
  parallel file; a post-B.2b refactor checklist task owns the
  extraction once all three consumers exist.
- Attendee completion-screen polling or `Refresh status` affordance —
  Phase C.
- Role seeding, runbook execution, volunteer dry run — Phase D.
- Any new Edge Function, RPC, migration, or SQL change. If B.2a
  discovers a need, stop and reopen the A.2a/A.2b boundary.
- Cursor/keyset pagination (design doc §5 post-MVP path).
- Cross-device cache invalidation or shared client cache with B.1.
- Realtime subscriptions; monitoring is operator-driven refresh only.
- Agent read access. Design doc §Role And Access Model scopes the
  monitoring route to organizers and root admins only.
- Any multi-event picker, cross-event list, or event-scope switcher
  embedded in the monitoring page.
- Any nav entry, admin link, or marketing surface pointing at
  `/event/:slug/redemptions`.
- Any attempt to distinguish "event does not exist" from "you are not
  authorized" in UI copy. Both collapse into one role-gate state.
- Any display of the `redemption_note` column in B.2a. The note is
  authored only through the reversal flow B.2b adds; B.2a rows either
  have a null note or a note that reflects a prior reversal cycle —
  surfacing either in the read-only view is out of scope.

## Locked Contracts

### Route surface

- `AppPath` gains `` `/event/${string}/redemptions` `` alongside the
  existing `` `/event/${string}/redeem` `` and `` `/event/${string}/game` ``
  literals.
- `routes` gains `eventRedemptions(slug: string): AppPath`, mirroring
  the shape of `routes.eventRedeem(slug)` (percent-encoded slug
  segment).
- A new matcher `matchEventRedemptionsPath(pathname: string)` returns
  `{ slug } | null`, mirroring `matchEventRedeemPath`.
- `validateNextPath` adds a positive branch for the new matcher so
  `/event/:slug/redemptions` is an accepted post-sign-in destination.
  `AuthNextPath`'s `Exclude<AppPath, "/auth/callback">` narrowing
  picks up the new literal automatically; no parallel type is
  introduced.

No Supabase Auth dashboard change is required. `/auth/callback` is
already in the redirect URL allowlist; the magic-link redirect is
computed at call time from `routes.authCallback` plus the validated
`next`.

### Sign-in copy

`SignInForm` is consumed unchanged with B.2a-specific copy:

- `eyebrow`: "Redemption monitoring"
- `heading`: "Sign in to review redemptions"
- `emailLabel`: "Email"
- `emailPlaceholder`: "organizer@example.com"
- `emailInputId`: `redemptions-signin-email`
- `submitLabelIdle`: "Send sign-in link"
- `submitLabelPending`: "Sending..."

The exact strings are part of the contract so the Playwright smoke
can assert them directly rather than pinning component internals.

### Authorization gate

For an authenticated caller and a URL slug, the route resolves
exactly one of three verdicts before any list fetch runs. The
three-verdict shape mirrors B.1 exactly so the transient-read failure
path does not collapse into the role-gate state.

- **authorized** — the `game_events` read by slug returns a row
  **and** `public.is_organizer_for_event(event_id)` or
  `public.is_root_admin()` returns true. List fetch proceeds; event
  badge shows the locked `event_code`.
- **role_gate** — a definitive "no" answer: the `game_events` read
  succeeds but returns no row for the slug, **or** the read returns
  a row and both role RPCs return false. Renders the single
  non-leaking copy block below. Both definitive-no branches share one
  render path so the design doc §6 non-leakage policy and the Phase
  B overview's "does not disclose whether the event exists" rule
  hold.

  > **Not available for this event.** Your account is not set up to
  > review redemptions here. If you think this is a mistake, check
  > with the event organizer.

- **transient_error** — the `game_events` read or either role RPC
  fails with a network error, timeout, 5xx response, or a
  shape-unexpected body. Renders the inline retry banner with a
  single automatic retry at ~2s backoff before the banner persists.
  Never renders the role-gate copy; a transient failure must not be
  reported as a permission denial.

The authorization gate runs client-side against existing surfaces
only. No new Edge Function, RPC, or migration lands in B.2a. The
implementer consumes existing readable surfaces: a `game_events` read
for `(event_id, event_code)` resolution by slug, plus
`public.is_organizer_for_event(text)` and `public.is_root_admin()`
RPCs through the Supabase browser client with the caller's JWT.

B.2a does **not** refactor B.1's `authorizeRedeem.ts` to extract a
shared resolver. B.2a lands `authorizeRedemptions.ts` as a parallel
file that mirrors `authorizeRedeem.ts` with the organizer RPC swapped
in. The extraction becomes a bounded post-B.2b task once all three
consumers (`authorizeRedeem`, `authorizeRedemptions`, and any B.2b
reversal-side gate) exist; capturing it in
[`docs/tracking/code-refactor-checklist.md`](../tracking/code-refactor-checklist.md)
is part of B.2a's documentation step.

### List data source and fetch contract

- Transport: direct browser Supabase client `.select()` against
  `public.game_entitlements`, protected by the A.2a RLS read policy
  (migration `20260421000500_add_redemption_rls_policies.sql`) that
  grants authenticated organizers / agents / root admins read access
  scoped to the row's `event_id`.
- The fetch is not mediated by any Edge Function. No Edge Function,
  RPC, or migration is added. If the RLS policy or the column set
  proves insufficient during implementation, stop and reopen A.2a —
  do not widen B.2a.
- Explicit `.eq("event_id", eventId)` scoping is load-bearing in
  addition to RLS: an organizer with multi-event assignments can read
  rows from multiple events under RLS, and the monitoring page must
  render only the locked event's rows.
- Activity shape: rows with `redemption_status = 'redeemed'` or
  `redemption_reversed_at IS NOT NULL` — the two populations of
  "dispute-relevant activity." Never-redeemed rows are excluded from
  the monitoring surface; they are inventory, not dispute events.
- Query partitioning: the Supabase / PostgREST `.order()` API accepts
  a single column name plus options; it does not accept a composite
  expression like `COALESCE(redemption_reversed_at, redeemed_at)`.
  The A.1 check constraint forces a reversed row's `redeemed_at` to
  null, so sorting by `redeemed_at DESC NULLS LAST` alone on a single
  fetch pushes all reversed rows to the tail of the cached slice and
  drops them off the cap at scale. B.2a therefore issues **two
  bounded fetches** and merges client-side:
  1. **Redeemed slice.**
     `.eq("event_id", eventId)
      .eq("redemption_status", "redeemed")
      .order("redeemed_at", { ascending: false, nullsFirst: false })
      .limit(500)` — served by the existing
     `(event_id, redeemed_at DESC NULLS LAST)` B-tree index.
  2. **Reversed slice.**
     `.eq("event_id", eventId)
      .not("redemption_reversed_at", "is", null)
      .order("redemption_reversed_at", { ascending: false, nullsFirst: false })
      .limit(500)` — served by an event-scoped scan per design doc §5
     ("`Reversed` pattern intentionally served by event-scoped scans
     in MVP"). At MVP scale (hundreds to low-thousands of rows per
     event) this runs in milliseconds.
- Merge semantics: dedupe by `id` — a row that was redeemed →
  reversed → redeemed again appears in both slices because its
  `redemption_status = 'redeemed'` AND its `redemption_reversed_at`
  from the prior cycle is still populated. When a duplicate surfaces,
  prefer the record from the redeemed slice (current redeem cycle is
  authoritative for display). Then sort the merged set client-side
  by `COALESCE(redemption_reversed_at, redeemed_at) DESC, id DESC`,
  then truncate to the 500-row cap. Do not replace the two-query
  merge with a single-column server sort to "simplify" — that
  silently hides reversed rows behind the cap and is a correctness
  regression.
- The `useRedemptionsList` hook issues the two queries in parallel,
  surfaces a single fetch-failed state if either query fails, and
  re-issues both on retry. Client-side merge/sort/truncate is
  factored into a pure `mergeRedemptionSlices(redeemed, reversed,
  cap)` helper so the merge logic is testable without mocking
  PostgREST.
- Cap constant: `REDEMPTIONS_FETCH_LIMIT = 500`, exported from
  `apps/web/src/redemptions/useRedemptionsList.ts` and used for both
  per-slice `.limit(500)` and the post-merge truncation.
- When the post-merge truncated slice has exactly 500 rows, the
  "showing most recent N" affordance renders with this copy:

  > **Showing the most recent 500 redemption events.** Older records
  > are not shown. Narrow the filters or scroll to the top of the
  > list for the latest activity.

  Mention of a specific other event, code, or operator is
  prohibited; the banner must stay at the per-event aggregate level.
- Columns selected: `id`, `verification_code`, `event_id`,
  `redemption_status`, `redeemed_at`, `redeemed_by`,
  `redeemed_by_role`, `redemption_reversed_at`,
  `redemption_reversed_by`, `redemption_reversed_by_role`. The
  `redemption_note` column is not selected in B.2a (non-goal).

### List-row shape

Each row renders:

- **Code.** The full event-prefixed code (`${event_code}-${suffix}`)
  is computed client-side from the locked `event_code` and the row's
  `verification_code`, not trusted to any per-row field. If the
  locked `event_code` and the `verification_code` do not agree on
  the acronym prefix, the row is hidden and a client-side assertion
  is logged in development; this is a defense-in-depth check because
  the `.eq("event_id", eventId)` scope should make this impossible.
- **Status badge.** Derived from the row's columns, not a trusted
  server-rendered label:
  - `redemption_status = 'redeemed'` → `Redeemed`
  - `redemption_status = 'unredeemed'` AND `redemption_reversed_at
    IS NOT NULL` → `Reversed`
  - any other shape is a defense-in-depth `Unknown` rendering with a
    muted treatment; rows with this shape are excluded by the
    activity filter in the fetch query and should not reach the list.
- **Timestamp.** The more recent of `redemption_reversed_at` and
  `redeemed_at` (i.e. the same key used in the sort), formatted in
  the operator's local timezone.
- **Actor hint.** Role + self-vs-other, never an email lookup.
  - Role label map: `agent` → "Agent", `organizer` → "Organizer",
    `root_admin` → "Root admin", null / unknown role → "Unknown".
    Per the `RedeemedByRole` and `ReversedByRole` types in
    [`shared/redemption.ts`](../../shared/redemption.ts) and the A.2a
    RPC bodies
    ([redeem](../../supabase/migrations/20260421000300_add_redeem_entitlement_rpc.sql),
    [reverse](../../supabase/migrations/20260421000400_add_reverse_entitlement_redemption_rpc.sql)),
    redeems write `agent` or `root_admin` and reversals write
    `organizer` or `root_admin`. Agents never appear as reversers;
    organizers never appear as redeemers. `formatActor.ts` accepts
    the full union so one helper renders both sides of a row.
  - For redeemed rows: if `redeemed_by === session.user.id`, render
    `"You (<label>)"` using the role label map; otherwise render
    just the role label. `redeemed_by = null` pairs with
    `redeemed_by_role = null` per the A.1 redeemed-row shape check,
    so that combination renders "Unknown."
  - For reversed rows: same shape on `redemption_reversed_by` /
    `redemption_reversed_by_role`. B.2a does not yet write reversal
    actors, so these values come from prior direct-SQL reversal
    activity, if any. Self-vs-other matches on the reversed side
    render "You (organizer)" / "You (root admin)" for organizer /
    root-admin callers; agents cannot match the reversal side
    because they cannot reverse.

Row actions in B.2a: `View details` only. The `Reverse` action does
not exist in B.2a — it lands in B.2b's detail sheet.

### Filter chips

Four chips, all toggle-style (mutually non-exclusive except where
logically overlapping):

- **`Last 15m`** — matches rows where the activity timestamp
  (`COALESCE(redemption_reversed_at, redeemed_at)`) is within the
  last 15 minutes of a clock value captured at render time. The
  reference clock refreshes on every page render (not on an
  interval), so toggling the chip off and on re-evaluates the cutoff;
  a separate auto-ticking timer is explicitly out of scope.
- **`Redeemed`** — matches rows where `redemption_status = 'redeemed'`.
- **`Reversed`** — matches rows where `redemption_reversed_at IS NOT
  NULL`. A row that was reversed and then redeemed again would not
  appear as `Reversed` because `redemption_reversed_at` would be null
  again per the A.2a reverse RPC semantics; this is a correct
  reflection of "reversed right now," not "has ever been reversed."
- **`By me`** — matches rows where `redeemed_by === session.user.id`.
  In B.2a this predicate intentionally does **not** include
  `redemption_reversed_by`: an organizer does not redeem in B.2a,
  so "By me" is usually empty for organizer accounts. B.2b expands
  the predicate to include `redemption_reversed_by = session.user.id`
  once the reversal flow is live. This expansion is an explicit
  B.2b contract, not a silent behavior shift.

Multiple chips combine via AND. The filter state is client-local;
toggling a chip never refetches.

### Suffix-first search

Client-side only, pure function over the cached slice. Input
normalization per design doc §6:

1. Trim leading/trailing whitespace; uppercase the full input.
2. If the normalized input is empty, return "no search filter
   applied" (all rows pass).
3. If the normalized input matches `^\d{4}$` (pure suffix), match
   against the last four digits of each row's `verification_code`.
4. If the normalized input matches `^[A-Z]+\s*-?\s*\d{4}$` (acronym
   plus suffix, with optional dash and whitespace), split into
   `(acronym, suffix)`. If `acronym === lockedEventCode`, match the
   suffix as in case 3. If `acronym !== lockedEventCode`, the search
   produces **no matches** — do not render an error, do not leak
   that the code might exist elsewhere. This implements the design
   doc §6 cross-event non-leakage contract at the search layer.
5. Any other shape is treated as "partial input" and no filter is
   applied, so the user sees the full list while they continue
   typing. Submit-gating behavior for a dedicated search button is
   out of scope; the filter updates on input change.

The parser is a pure function so it is covered by a dedicated Vitest
suite; the list rendering consumes its output.

### Detail bottom sheet (view-only)

A mobile bottom-sheet component built fresh in B.2a because the
codebase does not yet have a dialog / modal / sheet primitive.

Contract:

- Opens from a `View details` tap on any list row. The activating
  row's `id` is captured as `returnFocusTargetId` on open.
- Scrim covers the rest of the page; tapping the scrim closes the
  sheet. `Escape` also closes the sheet.
- On mount, focus moves to a `Close` button at the top of the sheet;
  a focus trap keeps tab traversal inside the sheet. On close, focus
  returns to the row's `View details` button.
- Rendered content in B.2a: full event-prefixed code, status badge,
  activity timestamp (long-form), redeemed actor hint (if
  `redemption_status = 'redeemed'`), reversed actor hint (if
  `redemption_reversed_at IS NOT NULL`). Both actor hints may render
  on the same row when a prior reversal cycle applies.
- B.2a renders no action button inside the sheet beyond `Close`. The
  sheet is stateless about action content; B.2b adds a `Reverse`
  button to the sheet's footer without changing the sheet's shell
  contract.
- The sheet does not refetch data on open. The displayed values come
  from the cached list slice. If the row was updated externally
  since the last list fetch, the values reflect the cached slice,
  not the database. B.2b's single-row re-read after a successful
  reversal extends this behavior; B.2a does not own any re-read
  semantics.

### Error surfacing and freshness

Per design doc §8:

- **Fetch failure.** A failed initial fetch or refresh renders a
  non-dismissive inline banner with a `Retry` action. One automatic
  retry at ~2s backoff fires before the banner persists. The
  role-gate copy block is never rendered in place of a fetch
  failure; the page distinguishes "I could not load the list" from
  "you cannot see the list."
- **Offline.** When `navigator.onLine === false`, the refresh action
  renders disabled with an "You are offline" explanation. On
  reconnect, a single reconcile fetch is issued before re-enabling
  actions. The attendee completion-screen poll pattern from design
  doc §8 is not adopted in B.2a because monitoring is
  operator-driven refresh only.
- **Freshness.** A "last updated at" timestamp renders in the
  monitoring header, anchored to the completion time of the last
  successful fetch. It never anchors to a failed fetch.
- **Explicit refresh.** A refresh control in the monitoring header
  triggers a refetch. Chip filter changes and search input changes
  do **not** refetch; they re-filter the cached slice.

### Styling tokens

- Reuse existing tokens from
  [`apps/web/src/styles/_tokens.scss`](../../apps/web/src/styles/_tokens.scss)
  for colors, spacing, radii, and shadows wherever a token exists.
  B.1 did not promote redemption-specific palettes to tokens, so
  B.2a inherits the same token layer.
- New tokens introduced in B.2a (with a B.2b reuse commitment, so
  they are not sub-phase-local values):
  - `$color-status-redeemed-surface` and a matching foreground token
    for the `Redeemed` badge.
  - `$color-status-reversed-surface` and a matching foreground token
    for the `Reversed` badge.
  The reversal confirmation dialog in B.2b reuses the reversed
  palette; the reason for introducing them in B.2a is to avoid
  sub-phase palette drift, not to front-load B.2b work.
- Layout values that are genuinely one-off for the monitoring screen
  (e.g. sticky-bar offsets, bottom-sheet peek height) stay local to
  `apps/web/src/styles/_redemptions.scss` and are not promoted to
  tokens.
- New tokens and the reasoning for each go in the commit message of
  the commit that introduces them, not buried in the general
  implementation commit.

## Target Structure

Define responsibilities up front so implementation does not sprawl.

### `apps/web/src/routes.ts`

- extend `AppPath` with the new literal
- add `routes.eventRedemptions(slug)` helper
- add `matchEventRedemptionsPath(pathname)` matcher following the
  shape of `matchEventRedeemPath`

### `apps/web/src/auth/validateNextPath.ts`

- add the positive branch that accepts `/event/:slug/redemptions` via
  the new matcher
- no change to the bypass-vector reject list

### `apps/web/src/pages/EventRedemptionsPage.tsx` (new)

- matches the `/event/:slug/redemptions` route from `App.tsx` and owns
  the page shell
- composes `useAuthSession` with the authorization resolver, the list
  fetch, the filter state, and the detail-sheet state
- renders exactly one of: missing-config state, loading state,
  signed-out `SignInForm`, role-gate state, authorized monitoring
  surface

### `apps/web/src/redemptions/` (new directory)

- `authorizeRedemptions.ts` — parallels B.1's `authorizeRedeem.ts`
  with the organizer RPC swapped in; emits `authorized`, `role_gate`,
  or `transient_error` with the same retry dance. Deliberately
  duplicates B.1 rather than refactoring to a shared resolver; the
  extraction is deferred to a post-B.2b cleanup task.
- `useRedemptionsList.ts` — issues the two bounded fetches against
  `game_entitlements` (redeemed slice + reversed slice) in parallel,
  feeds the results through `mergeRedemptionSlices`, owns the
  refresh-on-demand cache, tracks the "last updated at" timestamp,
  and surfaces the `Retry` / auto-retry envelope.
- `mergeRedemptionSlices.ts` — pure function
  `(redeemed: Row[], reversed: Row[], cap: number) => Row[]` that
  dedupes by `id` (preferring the redeemed-slice record), sorts by
  `COALESCE(redemption_reversed_at, redeemed_at) DESC, id DESC`,
  and truncates to `cap`. Factored out so the merge logic is
  testable without mocking PostgREST.
- `RedemptionsFilterBar.tsx` — renders the sticky filter/search bar
  on top of the list (four chips + search input).
- `useRedemptionsFilters.ts` — the client-side filter state machine
  (chip toggles, search input, reset), pure except for reading the
  render-time clock for `Last 15m`.
- `filterRedemptions.ts` — the pure filter function consumed by the
  list; covered by focused Vitest.
- `parseSearchInput.ts` — the suffix-first search parser covered by
  focused Vitest (design doc §6 normalization).
- `RedemptionsList.tsx` — newest-first list view, renders the
  "showing most recent N" affordance when the cached slice has 500
  rows, and delegates row rendering to `RedemptionRow.tsx`.
- `RedemptionRow.tsx` — list-row rendering per the locked shape.
- `RedemptionDetailSheet.tsx` — the view-only bottom-sheet shell
  described above. Built fresh because no dialog/modal/sheet
  primitive exists in the repo. Contract is stateless about action
  content so B.2b adds a `Reverse` button in its footer without
  changing the shell.
- `formatActor.ts` — pure function that renders the actor hint from
  `(role, by, currentUserId)` into
  `"You (<label>)"` / `"Agent"` / `"Organizer"` / `"Root admin"` /
  `"Unknown"`. Accepts the union of redeem and reverse roles
  (`agent | organizer | root_admin | null`) so the same helper
  renders both the redeemed-by and reversed-by sides of a row.
  Shared by B.2a rows/sheet and B.2b's reversal confirmation.

If any of these files grows past the size where review becomes hard,
extract further within the B.2a diff rather than widening the phase.

### `apps/web/src/styles/_redemptions.scss` (new)

- imports and composes existing tokens
- owns the monitoring layout (sticky header, sticky filter bar,
  scrollable list), the bottom-sheet shell styles, and the list-row
  treatments
- is imported from `apps/web/src/styles.scss` alongside the other
  feature partials

### `apps/web/src/styles/_tokens.scss`

- adds `$color-status-redeemed-surface`, `$color-status-reversed-surface`,
  and their matching foreground tokens, with the reasoning in the
  commit message that introduces them

### `apps/web/src/App.tsx`

- route table gains a `matchEventRedemptionsPath` branch that renders
  `EventRedemptionsPage`
- no other pages change

### Tests

- `tests/web/routes.test.ts` — add cases for `routes.eventRedemptions`,
  `matchEventRedemptionsPath` round-trip, and URL-encoded slugs
- `tests/web/auth/validateNextPath.test.ts` — add positive cases for
  `/event/:slug/redemptions` and a URL-encoded variant; re-run the
  full rejected-inputs table with no new accepted input beyond the
  named route
- `tests/web/redemptions/parseSearchInput.test.ts` — empty input,
  pure-suffix, acronym-plus-suffix match, acronym-plus-suffix
  mismatch (cross-event non-leakage), partial input, whitespace and
  dash normalization, case normalization
- `tests/web/redemptions/filterRedemptions.test.ts` — each chip in
  isolation, combined chips (AND), `By me` with `redeemed_by =
  null`, `Reversed` on a row whose `redemption_reversed_at` has been
  cleared by a subsequent redeem, `Last 15m` at the boundary
- `tests/web/redemptions/mergeRedemptionSlices.test.ts` —
  redeemed-only slice returns sorted by `redeemed_at DESC`;
  reversed-only slice returns sorted by `redemption_reversed_at
  DESC`; a row that lives in both slices (redeem → reverse →
  redeem) is deduped by `id` with the redeemed-slice record kept;
  the merged result is sorted by
  `COALESCE(redemption_reversed_at, redeemed_at) DESC, id DESC`;
  truncation to `cap` applies after dedupe and sort, not before
- `tests/web/redemptions/formatActor.test.ts` — each (role, by,
  currentUserId) combination, including null cases
- `tests/web/redemptions/RedemptionDetailSheet.test.tsx` — open/close,
  scrim-tap close, Escape close, focus trap, return-focus target,
  view-only rendering with no `Reverse` button present
- `tests/web/redemptions/RedemptionsList.test.tsx` — empty state,
  happy-path list rendering, "showing most recent N" affordance at
  exactly 500 rows, row-action `View details` opens the sheet
- `tests/web/pages/EventRedemptionsPage.test.tsx` — signed-out
  renders `SignInForm` with the locked copy; authorized caller
  renders the list; role-gate caller (slug returns no row, and
  signed-in caller without organizer/root-admin role) both produce
  identical DOM; transient-error caller renders the retry banner and
  not the role-gate copy; after simulated automatic retry success,
  the page transitions to authorized list state without a manual
  reload
- `tests/e2e/mobile-smoke.redemptions.spec.ts` (new Playwright spec,
  mobile viewport) — sign in as a seeded organizer, observe the
  list of mixed redeemed + reversed rows, toggle the `Redeemed`
  chip to verify client-side filtering, type a pure-suffix search
  value to narrow to a single row, open the detail sheet, close via
  scrim tap

Playwright harness — B.2a **adds** a dedicated backend-backed harness
rather than reusing `npm run test:e2e` or `npm run test:e2e:redeem`.
B.1 established the pattern; B.2a mirrors it so the redemption spec
and the monitoring spec can be run independently:

- `playwright.redemptions.config.ts` (new) — `testDir: "./tests/e2e"`,
  `testMatch: "**/mobile-smoke.redemptions.spec.ts"`, `iPhone 13`
  device, `VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK=false`, forwards
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
  from the environment;
- `scripts/testing/run-redemptions-e2e-tests.cjs` (new) — follows
  the shape of `scripts/testing/run-redeem-e2e-tests.cjs` but omits
  `functions serve`. B.2a's flows make no Edge Function calls:
  [`AuthCallbackPage.tsx`](../../apps/web/src/pages/AuthCallbackPage.tsx)
  and [`authApi.ts`](../../apps/web/src/auth/authApi.ts) drive magic-link
  exchange through Supabase Auth directly, the authorization probe
  uses PostgREST RPCs (`is_organizer_for_event`, `is_root_admin`),
  and the monitoring list is a direct PostgREST `.select()`. The
  runner ensures local Supabase is running, applies the
  seeded-organizer fixture, runs
  `playwright --config=playwright.redemptions.config.ts`, tears down.
  If implementation discovers an Edge Function dependency (for
  example, a future auth callback change that invokes
  `issue-session`), stop and revisit rather than silently adding
  `functions serve` to the runner.
- `package.json` gains `"test:e2e:redemptions":
  "node scripts/testing/run-redemptions-e2e-tests.cjs"`.

The seeded-organizer fixture is heavier than B.1's single-code
fixture because the monitoring list needs content to exercise:

- one `game_events` row with an `event_code`
- at least three `game_entitlements` rows in the `redeemed` state
  with different `redeemed_at` timestamps — one with `redeemed_by =
  testUser.id`, one with `redeemed_by` another user, one with
  `redeemed_by = null`
- at least one `game_entitlements` row in the reversed state
  (`redemption_status = 'unredeemed'`,
  `redemption_reversed_at IS NOT NULL`, `redemption_reversed_by` and
  `redemption_reversed_by_role` populated). Seeded by direct insert
  because the A.1 check constraint permits unredeemed rows with
  reversal metadata populated; no A.2a RPC is needed to produce this
  shape.
- one `event_role_assignments` row granting `testUser` the `organizer`
  role for the event

If the fixture requires anything beyond inserts into already-landed
tables (a new Edge Function, a new RPC, or a migration), stop and
reopen the Phase A boundary rather than widening B.2a.

## Rollout Sequence

1. **Baseline validation.** On the feature branch before the first
   implementation edit, run `npm run lint`, `npm test`,
   `npm run test:functions`, and `npm run build:web`. Stop and
   report on any pre-existing failure.
2. **Commit 1 — Route surface.** Extend `AppPath`, add
   `routes.eventRedemptions`, add `matchEventRedemptionsPath`,
   extend `validateNextPath`, add the matching Vitest cases.
   Validate with `npm run lint`, `npm test`, and `npm run build:web`.
3. **Commit 2 — Page shell + auth gate.** Add `EventRedemptionsPage`
   and `authorizeRedemptions.ts`, wire into `App.tsx`, render the
   signed-out `SignInForm` with the locked copy and
   `next=/event/:slug/redemptions`, plus the role-gate and
   transient-error branches with placeholder authorized content.
   Lands the Vitest coverage for the signed-out, role-gate, and
   transient-error paths. Validate with `npm run lint`, `npm test`,
   and `npm run build:web`.
4. **Commit 3 — List fetch.** Add `useRedemptionsList.ts` and
   `mergeRedemptionSlices.ts`, wire the two-query merge against
   `game_entitlements` (redeemed slice + reversed slice) with
   client-side dedupe / sort / truncate, the "last updated at"
   timestamp, and the fetch-error banner with one automatic retry.
   Ships the `mergeRedemptionSlices` Vitest suite in this commit so
   the merge contract is pinned before row rendering lands. The
   authorized branch renders a minimal list of rows (raw fields, no
   styling yet) and the "showing most recent N" affordance. Validate
   with `npm run lint`, `npm test`, and `npm run build:web`.
5. **Commit 4 — Filter bar + search + status tokens.** Add
   `RedemptionsFilterBar`, `useRedemptionsFilters`,
   `filterRedemptions`, `parseSearchInput`, and the focused Vitest
   suites. Introduce `$color-status-redeemed-surface` /
   `$color-status-reversed-surface` and the matching foreground
   tokens in the same commit so status-badge styling can land
   without retroactive token churn. Validate with `npm run lint`,
   `npm test`, and `npm run build:web`.
6. **Commit 5 — List row + styling.** Add `RedemptionRow`,
   `formatActor`, and the new SCSS partial. The authorized branch
   now renders the list rows with status badges, timestamps, and
   actor hints. Validate with `npm run lint`, `npm test`, and
   `npm run build:web`.
7. **Commit 6 — Detail sheet.** Add `RedemptionDetailSheet`, wire
   `View details` to open it, and land the focus-trap / Escape /
   scrim-close behavior and the Vitest coverage. Validate with
   `npm run lint`, `npm test`, and `npm run build:web`.
8. **Commit 7 — Playwright mobile smoke.** Add
   `tests/e2e/mobile-smoke.redemptions.spec.ts`,
   `playwright.redemptions.config.ts`,
   `scripts/testing/run-redemptions-e2e-tests.cjs`, and the
   `test:e2e:redemptions` entry in `package.json`. Land the
   seeded-organizer fixture as inserts into already-landed tables
   only (`game_events`, `game_entitlements`,
   `event_role_assignments`). Exercise it end-to-end locally
   against local Supabase (no `functions serve` — see the runner
   note) via `npm run test:e2e:redemptions`. Stop and report if the
   fixture requires a new Edge Function, RPC, or migration, or if
   implementation discovers that a B.2a flow actually does call an
   Edge Function — both are Phase A boundary reopens, not B.2a
   steps.
9. **Automated code-review feedback loop.** Review the branch diff
   from a senior-engineer stance for:
   - open-redirect drift in `validateNextPath`,
   - any code path that distinguishes "event not found" from "not
     authorized" in a way the user sees,
   - cross-event leakage in the search parser's mismatch path (the
     mismatch must produce empty results, never a "code exists
     elsewhere" hint),
   - silent `void promise` chains in fetch and refresh handlers,
   - rows that slip through the activity filter (never-redeemed
     rows must not render in the list),
   - the two-query merge being silently collapsed into a single
     `redeemed_at DESC NULLS LAST` fetch to "simplify" (correctness
     regression — reversed rows would disappear from the cap),
   - the merge helper preferring the reversed-slice record on dedupe
     (wrong — the redeemed-slice record is the current cycle and the
     authoritative display),
   - `.eq("event_id", eventId)` presence on the fetch,
   - token drift against `_tokens.scss`.
   Land review-fix commits separately when that makes the history
   easier to audit.
10. **Self-review audits.** Walk the named audits from
    [`docs/self-review-catalog.md`](../self-review-catalog.md) that
    apply to this diff's surfaces (see § "Self-Review Audits" below).
11. **Documentation currency sync.** Update in-branch, not in a
    follow-up:
    - this plan doc — flip `Status` from `Proposed — not started.`
      to `Landed in commits <SHA list>.` and replace "Proposed" /
      "not started" in every reference to current phase state;
    - [`reward-redemption-phase-b-plan.md`](./reward-redemption-phase-b-plan.md)
      sub-phase summary row for B.2a — flip the `(Proposed)`
      marker to `(Landed)` and verify no other prose in the
      overview still describes B.2a as "not started";
    - [`docs/architecture.md`](../architecture.md) — add the new
      route under the runtime-flow section, document the direct-RLS
      read path for the monitoring list, and note the unadvertised
      entry posture;
    - [`docs/tracking/code-refactor-checklist.md`](../tracking/code-refactor-checklist.md) —
      add a `Candidate Tasks` entry for the deferred shared-resolver
      extraction (target: extract `resolveEventContext` from
      `apps/web/src/redeem/authorizeRedeem.ts` and
      `apps/web/src/redemptions/authorizeRedemptions.ts` once B.2b
      lands and all three consumers exist); validation command and
      concrete responsibility problem stated per the checklist's
      rules;
    - [`docs/product.md`](../product.md) — only if the implemented
      capability set actually changed from the pre-branch narrative;
      otherwise leave unchanged and say so in the PR body.

    `docs/backlog.md` is intentionally not in the update list: as of
    this plan's draft, the backlog holds no Phase B.2a entry (phase
    status for redemption lives in the plan docs, not the backlog).
    If a backlog item has been added by the time B.2a merges, update
    it then; if not, add no backlog churn.
12. **Final validation.** On a clean tree, run `npm run lint`,
    `npm test`, `npm run test:functions`, and `npm run build:web`.
    Run the new Playwright spec with `npm run test:e2e:redemptions`
    against a local Supabase stack with the seeded organizer fixture
    (no `functions serve`). Do not substitute `npm run test:e2e`
    (prototype-fallback env; wrong spec match) or
    `npm run test:e2e:redeem` (agent fixture, not organizer). If any
    validation cannot be run locally, state the blocker explicitly
    in the PR's Validation section.
13. **Plan-to-PR completion gate.** Walk every Goal, Test, and
    Self-Review audit in this plan and confirm each is either
    satisfied in the PR or explicitly deferred **in this plan doc**
    with written rationale. No soft-commitment language ("optional
    but recommended", "nice to have", "consider adding") remains in
    this plan by merge time.
14. **PR preparation.** Open a PR against `main` using the template
    in [`.github/pull_request_template.md`](../../.github/pull_request_template.md).
    State explicitly that B.2a is read-only and inert: direct URL
    works, no nav link is added, root admin is the only caller who
    can reach the route until Phase D seeds an organizer.

Intended commit boundary summary:

| # | Commit | Validation |
|---|--------|------------|
| 1 | `feat(web): add /event/:slug/redemptions route surface` | `npm run lint`, `npm test`, `npm run build:web` |
| 2 | `feat(web): add EventRedemptionsPage sign-in + role gate` | `npm run lint`, `npm test`, `npm run build:web` |
| 3 | `feat(web): add redemptions list fetch` | `npm run lint`, `npm test`, `npm run build:web` |
| 4 | `feat(web): add redemptions filter bar and status tokens` | `npm run lint`, `npm test`, `npm run build:web` |
| 5 | `feat(web): render redemption list rows and actor hints` | `npm run lint`, `npm test`, `npm run build:web` |
| 6 | `feat(web): add view-only redemption detail sheet` | `npm run lint`, `npm test`, `npm run build:web` |
| 7 | `test(e2e): add mobile smoke for /event/:slug/redemptions` | `npm run lint`, `npm test`, `npm run test:e2e:redemptions` |
| 8 | `docs: flip phase b.2a status and sync architecture` | `npm run lint`, `npm test`, `npm run build:web` |

Review-fix commits, if any, land between 7 and 8.

## Tests

### `tests/web/routes.test.ts`

What the suite must prove:

- `routes.eventRedemptions(slug)` returns
  `` `/event/${encoded slug}/redemptions` ``.
- `matchEventRedemptionsPath` returns `{ slug }` for a valid path and
  `null` for admin, redeem, game, home, and malformed paths.
- URL-encoded slugs round-trip through `routes.eventRedemptions` +
  `matchEventRedemptionsPath` without double encoding.
- `matchEventRedeemPath` still matches `/event/:slug/redeem` and does
  not accidentally match `/event/:slug/redemptions` — the suffix
  guard is exact.

### `tests/web/auth/validateNextPath.test.ts`

What the suite must prove:

- `/event/some-slug/redemptions` round-trips as an accepted
  `AuthNextPath`.
- A URL-encoded slug variant round-trips.
- None of the existing bypass vectors start passing because of the
  new branch (re-run the full rejected-inputs table; no new
  allow-list additions beyond the named one).

### `tests/web/redemptions/parseSearchInput.test.ts`

What the suite must prove:

- empty / whitespace-only input returns a "no filter" sentinel
- `"0427"` returns `{ suffix: "0427" }`
- `"mad-0427"` with `lockedEventCode: "MAD"` returns
  `{ suffix: "0427" }`
- `"MAD 0427"` with `lockedEventCode: "MAD"` returns
  `{ suffix: "0427" }`
- `"MAD-0427"` with `lockedEventCode: "FALL"` returns a "no-match"
  sentinel (cross-event non-leakage); the test explicitly asserts
  that the parser does not throw, does not return a distinct
  `"exists in another event"` shape, and does not produce any
  user-visible error
- `"04"` (partial) returns the "no filter" sentinel
- `"XYZ999"` (non-matching shape) returns the "no filter" sentinel

### `tests/web/redemptions/filterRedemptions.test.ts`

What the suite must prove:

- `Redeemed` chip keeps only rows with `redemption_status =
  'redeemed'`
- `Reversed` chip keeps only rows with `redemption_reversed_at !==
  null`
- `Last 15m` chip keeps only rows whose activity timestamp is within
  15 minutes of the provided reference clock (timestamps at exactly
  15 minutes old fall outside)
- `By me` with `currentUserId: "user-a"` matches rows where
  `redeemed_by === "user-a"`; rows with `redeemed_by = null` do not
  match, regardless of `currentUserId`
- Combined `Redeemed` + `By me` is an AND (both must hold)
- Combined chips + a search `{ suffix: "0427" }` narrows by suffix
  match on `verification_code`
- A search "no-match" sentinel returns an empty result regardless of
  chip state

### `tests/web/redemptions/formatActor.test.ts`

What the suite must prove:

- `{ by: "user-a", role: "agent" }` with `currentUserId: "user-a"`
  renders `"You (agent)"`
- `{ by: "user-a", role: "organizer" }` with `currentUserId: "user-a"`
  renders `"You (organizer)"`
- `{ by: "user-a", role: "root_admin" }` with `currentUserId: "user-a"`
  renders `"You (root admin)"`
- `{ by: "user-b", role: "agent" }` with `currentUserId: "user-a"`
  renders `"Agent"`
- `{ by: "user-b", role: "organizer" }` renders `"Organizer"`
- `{ by: "user-b", role: "root_admin" }` renders `"Root admin"`
- `{ by: null, role: null }` renders `"Unknown"`
- `{ by: null, role: "agent" }` renders `"Agent"` (role-only fallback)

### `tests/web/redemptions/RedemptionDetailSheet.test.tsx`

What the suite must prove:

- Sheet mounts closed; open prop renders it open
- Focus moves to `Close` button on open; tab traversal does not
  escape the sheet (focus trap)
- Scrim click closes the sheet; `Escape` key closes the sheet
- On close, focus returns to the element identified by
  `returnFocusTargetId`
- View-only rendering: no element with `role="button"` and text
  `"Reverse"` is present in B.2a's sheet
- Renders the full event-prefixed code, status badge, timestamp, and
  actor hints from the provided row

### `tests/web/redemptions/RedemptionsList.test.tsx`

What the suite must prove:

- Empty array renders the empty-state copy (no rows, no "showing
  most recent N" affordance, no error banner)
- A list of fewer than 500 rows renders each row with the expected
  badge / timestamp / actor shape
- A list of exactly 500 rows renders the "showing most recent 500"
  affordance
- Clicking a row's `View details` opens the bottom sheet with that
  row's data
- A row whose `event_code` derived prefix does not agree with its
  `verification_code` acronym is hidden (defense-in-depth case)

### `tests/web/pages/EventRedemptionsPage.test.tsx`

What the suite must prove:

- missing-config state renders the locked missing-config copy
  (inherited from `useAuthSession`).
- signed-out renders `SignInForm` with the B.2a copy block verbatim
  and requests a magic link with `next=/event/<slug>/redemptions`.
- authorized caller renders the list and the locked event badge
  with the resolved `event_code`.
- role-gate caller renders exactly the locked role-gate copy block
  and renders no list, no event-existence hint, and no link to
  `/admin`. A test fixture for a slug whose `game_events` read
  returns no row and a separate fixture for a signed-in caller who
  holds neither role both produce identical DOM — the non-leakage
  contract is proven, not asserted by inspection.
- transient-error caller (resolver read fails with a network /
  5xx / shape error) renders the retry banner with a visible
  `Retry` action and does **not** render the role-gate copy block.
  After one simulated automatic retry success, the page transitions
  to the authorized list state without a manual reload.
- list fetch error after authorization renders the fetch-error
  banner with `Retry`, not the role-gate copy.
- explicit refresh action triggers a new fetch and updates the
  "last updated at" timestamp on success.
- `navigator.onLine === false` puts the refresh button into its
  disabled "You are offline" treatment.

### `tests/e2e/mobile-smoke.redemptions.spec.ts`

What the spec must prove, under a mobile viewport against local
Supabase (no `functions serve` — see the runner note under § "Target
Structure / Tests") with a seeded organizer fixture:

- Direct URL load of `/event/<slug>/redemptions` renders `SignInForm`.
- Magic-link sign-in (stubbed through the existing e2e harness for
  `/auth/callback`, matching the B.1 fixture pattern) lands on
  `/event/<slug>/redemptions` authorized.
- The list renders the seeded mix of redeemed and reversed rows,
  newest-first by activity timestamp.
- Toggling the `Redeemed` chip narrows the list to redeemed rows
  without issuing a network request (a fetch-counter assertion or a
  network-recording check pins this).
- Typing a pure-suffix value that matches exactly one seeded row
  narrows the list to that row.
- Tapping `View details` on that row opens the bottom sheet; the
  sheet shows the full event-prefixed code; there is no `Reverse`
  button in the sheet.
- Tapping the scrim closes the sheet; focus returns to the row's
  `View details` control.

## Self-Review Audits

Run the applicable named audits from
[`docs/self-review-catalog.md`](../self-review-catalog.md):

- **Frontend/browser surface — `Error-surfacing for user-initiated
  mutations`.** B.2a has no mutations, but the authorization probe,
  list fetch, and refresh are all user-initiated async actions whose
  failure paths must surface visibly with a recovery affordance.
  Walk the click handlers and resolver call sites for silent
  `void promise` chains.
- **Frontend/browser surface — `Post-save reconciliation audit`.**
  B.2a does not save anything, so the audit reduces to a single
  check: no code path constructs list-row display values from a
  client clock or a submitted payload; every displayed value comes
  from the fetch response body.
- **Frontend/browser surface — `Dirty-state tracked-inputs audit`.**
  The filter bar owns multi-field state (four chip toggles plus a
  search input). Walk the state machine to confirm chip state
  persists across refresh, that the search input's partial shapes
  do not silently reset chip state, and that the `Last 15m` cutoff
  re-evaluates correctly when the chip is toggled off and on.
- **CI / validation surface — `Readiness-gate truthfulness audit`.**
  The new Playwright spec introduces a readiness probe for the
  local Edge Function stack; confirm the probe returns negative
  when the stack is not ready rather than accepting any response
  (including 404) as "ready".
- **SQL surface sentinel — `Grant/body contract audit`.** If
  implementation unexpectedly touches any SQL GRANT, RPC body, or
  migration, stop and reopen the A.2a/A.2b boundary. B.2a is a
  frontend-only phase.
- **SQL surface sentinel — `Legacy-data precheck for constraint
  tightening`.** Does not apply: B.2a tightens no constraint.

## Validation Expectations

- `npm run lint` — passes.
- `npm test` — passes with the new Vitest files.
- `npm run test:functions` — passes; B.2a should not regress the
  landed A.2b Deno suite even though it adds no new function tests.
- `npm run build:web` — passes.
- `npm run test:e2e:redemptions` — passes against local Supabase
  with the seeded organizer fixture, exercising
  `mobile-smoke.redemptions.spec.ts` under
  `playwright.redemptions.config.ts` with
  `VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK=false`. B.2a's flows make no
  Edge Function calls, so the runner does not boot `functions serve`
  — see the runner note in § "Target Structure / Tests".
  `npm run test:e2e` alone is insufficient (wrong spec match,
  prototype-fallback env); `npm run test:e2e:redeem` alone is
  insufficient (agent fixture, not organizer).
- Manual sanity: on a local dev server, direct-load
  `/event/<slug>/redemptions` while signed out and confirm the
  sign-in copy; sign in as an agent (not organizer, not root admin)
  and confirm the role-gate copy block renders and no
  event-existence hint leaks; simulate a transient read failure
  (e.g. briefly block the Supabase origin) and confirm the retry
  banner renders instead of the role-gate copy; type
  `OTHER-0427` in the search input on an event whose locked
  `event_code` is not `OTHER` and confirm the list narrows to zero
  rows with no visible error.

If any named validation cannot be run locally, call out the exact
blocker in the PR's Validation section rather than claiming success.

## Risks and Mitigations

- **Reversed rows hidden by the sort.** Sorting by `redeemed_at DESC
  NULLS LAST` alone on a single fetch would push reversed rows
  (where `redeemed_at = null` after the A.2a reverse RPC) to the tail
  of the cached slice and drop them off the 500-row boundary at
  scale. Supabase `.order()` cannot express `COALESCE(...)` so the
  naive single-query fix is not available. Mitigation: two bounded
  fetches (redeemed slice ordered by `redeemed_at`; reversed slice
  ordered by `redemption_reversed_at`), merged client-side by
  `mergeRedemptionSlices` and sorted by
  `COALESCE(redemption_reversed_at, redeemed_at) DESC, id DESC`.
  Self-review audit step 9 names "collapsing the two-query merge
  into a single-column server sort" as a specific regression to
  guard against.
- **Never-redeemed rows polluting the list.** Without the activity
  filter, the list would show every entitlement in the event
  (hundreds of unredeemed rows), burying dispute-relevant rows.
  Mitigation: the fetch `WHERE` clause is
  `redemption_status = 'redeemed' OR redemption_reversed_at IS NOT
  NULL`; the filter-chip UI has no "Unredeemed" chip to invite
  reinstatement.
- **Role-gate copy leaks event existence.** Any divergence between
  the "slug not readable" branch and the "not authorized" branch is
  a non-leakage regression. Mitigation: one copy block, one render
  path, and an `EventRedemptionsPage.test.tsx` assertion that walks
  both failure modes and expects identical DOM.
- **Cross-event search leakage.** Typing `OTHER-0427` on an event
  whose locked `event_code` is `MAD` must not reveal that the
  `OTHER-0427` code exists elsewhere. Mitigation: `parseSearchInput`
  collapses a mismatched acronym into a "no-match" sentinel, never a
  distinct error shape; the Vitest suite pins this contract.
- **Open-redirect regression via `next`.** Any allow-list expansion
  in `validateNextPath` is a security boundary change. Mitigation:
  the new branch goes through `matchEventRedemptionsPath` only; the
  full bypass-vector table from
  [`validateNextPath.test.ts`](../../tests/web/auth/validateNextPath.test.ts)
  is re-run unchanged with no new accepted input beyond the named
  route.
- **Bottom-sheet focus leak.** A fresh bottom-sheet implementation
  without a focus trap allows tab traversal to escape into the list
  behind the scrim, which is a mobile accessibility regression and
  a B.2b hazard (the reversal confirmation inside the sheet must
  stay focused). Mitigation: the detail-sheet Vitest asserts the
  focus trap explicitly and the return-focus target.
- **Multi-event organizer reading wrong event's rows.** An
  organizer with assignments on two events could see both events'
  rows if the fetch relied only on RLS. Mitigation:
  `.eq("event_id", eventId)` is explicit in the fetch; the
  self-review audit names this. RLS is defense in depth, not the
  primary scope.
- **401 drift mid-session.** A caller whose Supabase session expires
  between sign-in and refresh will see a raw 401 from PostgREST.
  Mitigation: the fetch-error banner treats 401 as a transient
  failure with a `Retry` action and a single automatic retry, and
  falls through to the sign-in surface if the retry fails — not a
  silent crash.
- **Scale beyond MVP.** Event-scoped scans for `Reversed`, `By me`,
  and suffix search are fast at hundreds to low-thousands of rows
  but will degrade once a single event produces tens of thousands
  of rows. Mitigation: the design doc §5 post-MVP upgrade path
  (keyset pagination, partial/functional indexes) is the documented
  next step. The "showing most recent 500" banner is the
  operator-facing signal that the cap was hit.
- **Token creep.** The two new status tokens must have a B.2b reuse
  commitment to justify being tokens rather than local values.
  Mitigation: introduce them with the reasoning in the commit
  message, and verify B.2b's detail-sheet reversal confirmation
  consumes them before B.2b lands.
- **Scope drift into B.2b, Phase C, or Phase D.** A reviewer asking
  for "just a small reverse button" or "just a seeded role" reopens
  a phase boundary. Mitigation: all three are explicit non-goals
  above; stop-and-report if any such request lands.

## Rollback Plan

B.2a is frontend-only and deploys inert.

1. Revert the merge commit (or the B.2a PR commit range). The admin
   shell, game route, B.1 redeem route, and auth callback all keep
   working because the new route is additive and the
   `validateNextPath` change is purely an allow-list extension.
2. No database rollback is required: B.2a does not change schema,
   RPCs, RLS, or Edge Functions.
3. No Supabase dashboard change is required: `/auth/callback` is
   already in the redirect URL allowlist and no new entry is
   introduced by B.2a.
4. If the revert leaves `routes.eventRedemptions` or the new matcher
   unused, that is acceptable: the admin shell, B.1 redeem route,
   and auth primitives remain consumers of the shared infrastructure.
5. The two new status tokens added in `_tokens.scss` are unused by
   remaining code after a revert; they can stay until a follow-up
   cleanup removes them, or be removed in the revert itself — B.2a
   does not promise either posture.

## Resolved Decisions

- **B.2a is read-only.** Reversal is entirely B.2b's responsibility,
  no matter how small the reverse surface feels. Merging the two
  dilutes review attention across reads and mutations.
- **Agent read access is out of scope in MVP.** Design doc §Role And
  Access Model scopes `/event/:slug/redemptions` to organizers and
  root admins; splitting read vs. write access by role would double
  the gate test matrix without a dispute-handling win.
- **`N = 500` with a "showing most recent N" banner.** Matches
  design doc §5; the constant is centralized so it is a one-line
  tuning change later.
- **Fetch uses a two-query merge, not a single COALESCE-sorted
  query.** PostgREST's `.order()` does not accept a composite
  expression, so B.2a issues separate redeemed-slice and
  reversed-slice queries and merges client-side, sorting the
  combined set by `COALESCE(redemption_reversed_at, redeemed_at)
  DESC, id DESC` and truncating to 500. A single `redeemed_at DESC
  NULLS LAST` query hides reversed rows behind the cap.
- **Activity filter is `redemption_status = 'redeemed' OR
  redemption_reversed_at IS NOT NULL`.** Monitoring is dispute
  resolution, not inventory.
- **`By me` excludes `redemption_reversed_by` in B.2a.** B.2b
  expands the predicate when the reversal flow lands; the expansion
  is an explicit B.2b contract, not a silent shift.
- **Bottom-sheet primitive is built fresh in B.2a.** No
  dialog/modal/sheet primitive exists in the repo; the
  view-only sheet contract is designed to accept B.2b's `Reverse`
  action without changing the shell.
- **Two new status tokens land in B.2a.** `$color-status-redeemed-surface`
  and `$color-status-reversed-surface` (and their foreground pairs)
  have a B.2b reuse commitment.
- **Shared `resolveEventContext` extraction is deferred.**
  `authorizeRedemptions.ts` parallels `authorizeRedeem.ts`; the
  extraction is captured as a post-B.2b
  `docs/tracking/code-refactor-checklist.md` entry.
- **Own Playwright smoke, own runner.** Mirrors B.1's precedent;
  `npm run test:e2e:redemptions` is distinct from both
  `npm run test:e2e` (wrong spec match, prototype-fallback env) and
  `npm run test:e2e:redeem` (agent fixture, not organizer).
- **B.2a does not advertise the route.** No nav link, no `/admin`
  link. Phase D is the only rollout trigger.

## Open Questions Blocking B.2a

None. If implementation discovers that the contracts above cannot be
delivered against the landed A.2a RLS surface without a new Edge
Function, RPC, migration, or SQL grant, stop and reopen the Phase B
overview plus A.2a rather than widening B.2a.

## Handoff After B.2a

- `/event/:slug/redemptions` is reachable by direct URL, deploys
  inert, and renders correctly for authorized, role-gated,
  transient-error, and signed-out callers on a mobile viewport as a
  read-only monitoring surface.
- The detail bottom sheet is in place with a stable contract; B.2b
  adds the `Reverse` action to the sheet's footer and layers the
  confirmation flow on top without changing the shell.
- The list fetch, filter state, and search machinery are covered by
  focused Vitest and exercised end-to-end by the new Playwright
  spec.
- B.2b inherits the locked `authorizeRedemptions.ts` pattern and
  extends the `By me` filter predicate to include
  `redemption_reversed_by`; no other B.2a contract changes in B.2b.
- Phase C can ship the attendee polling surface at any time; it
  shares no UI surface with B.2a.
- Phase D can seed a pilot event's organizer assignments through the
  runbook once B.2b also lands, after which a real organizer can
  complete a full dispute-handling flow (verify + reverse) on a
  phone.
