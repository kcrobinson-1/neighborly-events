# `shared/urls/`

Canonical route table, route matchers, and post-auth `next=`
validation shared across `apps/web` and `apps/site`.

## What this module owns

- The `AppPath` literal-union type — every legal URL the platform
  serves, narrowed to literal types so navigation calls are
  type-checked at the call site.
- The `routes` object — one builder or constant per route family
  (`home`, `admin`, `eventLanding(slug)`, `eventAdmin(slug)`,
  `game(slug)`, `gameRedeem(slug)`, `gameRedemptions(slug)`,
  `authCallback`). Builders return `AppPath` literals so consumers
  never see widened `string`.
- The pathname matchers used by `apps/web`'s router and by
  `validateNextPath` (`matchEventAdminPath`, `matchGamePath`,
  `matchGameRedeemPath`, `matchGameRedemptionsPath`) and the
  `normalizePathname` helper they share.
- The `AuthNextPath` type — `Exclude<AppPath, "/auth/callback">`,
  used by `requestMagicLink` and `validateNextPath` to keep
  callback self-loops out of the type system.
- `validateNextPath(rawNext)` — open-redirect defense for the raw
  `next` query parameter received at `/auth/callback`. Pure
  function modulo `window.location.origin` access; **browser-only**
  (see below).

## Browser-only constraint on `validateNextPath`

`validateNextPath` reads `window.location.origin` to enforce the
same-origin check. That makes it client-only. M2 phase 2.3 kept
`/auth/callback` as a client component in apps/site, so no
server-side seam exists yet — do not import `validateNextPath` from
a Next.js server component or RSC context.

## Naming

The exported object is named `routes`. The parent epic's
`urls.platformAdmin()` style is illustrative only; the directory
name `shared/urls/` describes the URL concern this module owns,
matching the same precedent as `shared/db/` exporting
`createBrowserSupabaseClient` rather than `db.create*`.

## What is intentionally absent

- A matcher for `eventLanding`. The route is consumed in M3; its
  matcher and `validateNextPath` allow-list entry land with the
  consumer.
- Server-side next-path validation. Deferred until a concrete
  server-side consumer surfaces; apps/site's current callback route
  uses the browser-only shared component.
- The deprecated `/admin/events/:eventId` family
  (`routes.adminEvent`, `routes.adminEventsPrefix`,
  `matchAdminEventPath`). Removed in M2 phase 2.4.3 — the
  platform-admin module that consumed the family lives on apps/site
  at `/admin*`, and per-event editing reaches drafts through
  `/event/:slug/admin`.

## Plan reference

[`docs/plans/shared-urls-foundation.md`](../../docs/plans/shared-urls-foundation.md).
