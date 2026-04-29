# `shared/urls/`

Canonical route table, route matchers, and post-auth `next=`
validation shared across `apps/web` and `apps/site`.

## What this module owns

- The `AppPath` literal-union type — every legal URL the platform
  serves, narrowed to literal types so navigation calls are
  type-checked at the call site.
- The `routes` object — one builder or constant per route family
  (`home`, `admin`, `adminEvent(id)`, `eventLanding(slug)`,
  `eventAdmin(slug)`, `game(slug)`, `eventRedeem(slug)`,
  `eventRedemptions(slug)`, `authCallback`). Builders return
  `AppPath` literals so consumers never see widened `string`.
- The four pathname matchers used by `apps/web`'s router and by
  `validateNextPath` (`matchAdminEventPath`, `matchGamePath`,
  `matchEventRedeemPath`, `matchEventRedemptionsPath`) and the
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

- Matchers for `eventLanding` and `eventAdmin`. Those routes are
  consumed in M2 phase 2.2 (`eventAdmin`) and M3 (`eventLanding`);
  their matchers and `validateNextPath` allow-list entries land
  with the consumers.
- Operator-route renames (`eventRedeem`/`eventRedemptions` →
  `gameRedeem`/`gameRedemptions`). Those land with the URL change
  in M2 phase 2.5 so builder name and URL stay aligned at every
  gate.
- Server-side next-path validation. Deferred until a concrete
  server-side consumer surfaces; apps/site's current callback route
  uses the browser-only shared component.

## Plan reference

[`docs/plans/shared-urls-foundation.md`](../../docs/plans/shared-urls-foundation.md).
