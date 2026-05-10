# Canonical User-Facing Origin

## Status

Proposed.

## Context

The platform deploys two Vercel projects out of one monorepo: `apps/web`
(Vite SPA, attendee game and per-event admin) and `apps/site`
(Next.js App Router, public landings, platform admin, auth callback,
home / role-doors). Today both projects sit at customer-reachable
origins — `apps/web` at `https://neighborly-scavenger-game-web.vercel.app`
and `apps/site` at `https://neighborly-events-site.vercel.app` — with
cross-app rewrites threading routes between them in both directions.

The current routing topology treats `apps/web` as the canonical primary:
its `vercel.json` carries the bulk of the rewrites, proxying
`/`, `/admin*`, `/auth/callback`, `/_next/*`, `/event/:slug`, and
`/event/:slug/:path*` to `apps/site`, while reserving `/event/:slug/game*`
and `/event/:slug/admin*` for its own SPA. `apps/site/next.config.ts`
adds the reverse-direction rewrites that landed as the cheap unblock
when the home page's role-door links surfaced as a regression on
`apps/site` origin: `/event/:slug/game*`, `/event/:slug/admin*`, and
`/assets/*` proxy to `apps/web`. The home-page `/` rewrite from
`apps/web` to `apps/site` is preempted on `apps/web` origin by the
Vite SPA's emitted `dist/index.html`, per the backlog entry's note —
which is one of the symptoms motivating this plan.
**Verified by:** [`apps/web/vercel.json`](/apps/web/vercel.json),
[`apps/site/next.config.ts:53-86`](/apps/site/next.config.ts),
[`docs/backlog.md:80-93`](/docs/backlog.md).

Product framing settled with the user: the **site is the product**,
the **game is one plugin** that some events use, and additional
standalone apps following the same shape (sharing backend, auth, and
styling but living in their own deployments) are expected over time.
The long-term direction is that customers see one canonical site
origin; plugins have no customer-facing origin of their own and are
embedded into the site's URL space. The embedding mechanism for the
game is settled at **proxy rewrite** (resolved during this scoping
pass — see "Investigations resolved in-PR"); future plugins inherit
that default and may revisit only if their own constraints warrant.
This plan resolves the **game-specific case** in a way that's
compatible with future plugins, without designing a generic plugin
platform.

There is no platform-owned custom domain today and none in flight.
The architecture doc's claim that "`apps/web` is the primary Vercel
project owning the production custom domain"
([`docs/architecture.md:32-35`](/docs/architecture.md)) is **stale
framing** that this plan corrects: today's customer-reachable URLs
are exactly the two `*.vercel.app` hosts above, with no platform-
owned domain layered on top. The canonical site origin in this
plan's end state is therefore `apps/site`'s `*.vercel.app`
alias — not a placeholder for a real domain.

The first real-event launch model (Madrona Music in the Playfield)
is **per-event subdomain CNAME**, organizer-owned: Madrona points
`music.madrona.us` at `apps/site`'s Vercel project as a per-domain
custom alias resolving to the `/event/madrona` route family. Future
event organizers follow the same pattern. The platform itself
neither owns nor brokers a top-level customer domain. The plan is
written in terms of "the canonical site origin" so the sequencing
survives any future shift if a platform-owned domain ever does
arrive, but no phase below depends on one materializing.

## Goal

After this plan lands its full sequence:

- Customers see exactly one canonical origin: `apps/site`'s
  `*.vercel.app` alias (today: `https://neighborly-events-site.vercel.app`).
  Every shared customer-visible URL — landing page, event landings,
  admin entry, auth callback, role-door navigations — resolves on
  this single origin. Per-event organizer subdomains (Madrona's
  `music.madrona.us`, future organizers' equivalents) CNAME to the
  same `apps/site` project as additional aliases; the topology
  treats them as siblings of the canonical alias rather than as a
  separate canonical surface.
- The game (`apps/web` deployment) is reached **only** through the
  canonical site origin in normal use. Its plugin-owned route
  prefixes (`/event/:slug/game*`, `/event/:slug/admin*`) are routed
  from the canonical origin into the plugin's deployment via **proxy
  rewrite** — the same shape today's `apps/site/next.config.ts`
  already uses for the cheap-unblock case
  ([`apps/site/next.config.ts:64-86`](/apps/site/next.config.ts)).
  Iframe embedding and runtime federation were considered and
  rejected by the user during this scoping pass; proxy rewrite is
  the settled mechanism for the game and the default for future
  plugins (each plugin's onboarding may revisit if its constraints
  warrant).
- The plugin's deployment origin (`apps/web`'s `*.vercel.app`)
  remains technically reachable but is not advertised as a
  customer-facing URL. No active lockdown (no redirect, no
  tombstone): there is no live traffic today, no launched site, and
  no external stale links to protect against. If that calculus
  changes in the future (organic search picks up the URL, an
  external link surfaces, or the plugin URL otherwise accumulates
  customer-bound traffic), a redirect or tombstone can be added
  then; this plan does not pre-emptively build it.
- The bidirectional cross-app rewrite topology is gone:
  `apps/web/vercel.json` carries no proxy to `apps/site`, and
  `apps/site/next.config.ts` carries proxy rewrites only in the
  site → plugin direction. The asymmetry that motivated the cheap-
  unblock entry (`apps/site/next.config.ts:27-52`) resolves into a
  one-direction routing layer that future plugins can extend without
  re-litigating which origin is canonical.
- The auth callback origin is the canonical site origin, not the
  plugin origin. Magic-link `emailRedirectTo` composes against the
  canonical origin (the user is signing in on the canonical origin in
  the first place), and the Supabase Auth dashboard's redirect-URL
  allowlist names the canonical origin's `/auth/callback` rather than
  the plugin's.
- `NEXT_PUBLIC_SITE_ORIGIN` (currently documented in
  [`apps/site/.env.example:3-9`](/apps/site/.env.example) as
  "set this to apps/web's hostname") is reframed: it is the canonical
  site origin in the new topology, which on Vercel production
  resolves to `apps/site`'s primary alias rather than `apps/web`'s.
  The `metadataBase` resolution path in
  [`apps/site/app/layout.tsx:29-90`](/apps/site/app/layout.tsx) keeps
  its current shape but its production-required value flips with the
  topology.
- The Edge Function CORS allowlist admits the canonical site
  origin and Vercel-generated preview / branch aliases of the
  `apps/site` project (so per-PR preview deploys keep working
  end-to-end against Edge Functions), and no longer admits the
  stale plugin origin by default. Today's helper at
  [`supabase/functions/_shared/cors.ts:11-24`](/supabase/functions/_shared/cors.ts)
  performs exact-string matching against an enumerated allowlist
  and cannot match preview-alias patterns as written; delivering
  this contract therefore requires a small helper update in
  Phase 2. The matching strategy is an implementation detail picked
  at Phase 2's per-phase plan-drafting time, not by this scoping
  plan.

## End state — concretely

Below is the routing-topology end state, route by route. **This
section is a binding contract**, not an estimate. Any phase that
ships a transitional shape must explicitly name the deviation as an
intermediate state and what later phase converges to this final
shape.

| Customer-visible route | Resolves on | Mechanism |
| --- | --- | --- |
| `/` | Canonical site origin (`apps/site`) | Native Next.js route |
| `/admin*` | Canonical site origin (`apps/site`) | Native Next.js route |
| `/auth/callback` | Canonical site origin (`apps/site`) | Native Next.js route (client component, owns route physically). **Verified by:** [`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/%28authenticated%29/auth/callback/page.tsx) and [`docs/architecture.md:241-244`](/docs/architecture.md). |
| `/event/:slug` (landing) | Canonical site origin (`apps/site`) | Native Next.js route, SSR per-slug. **Verified by:** [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx). |
| `/event/:slug/feedback` | Canonical site origin (`apps/site`) | Native Next.js route, prerendered per registered slug. **Verified by:** [`apps/site/app/event/[slug]/feedback/page.tsx`](/apps/site/app/event/%5Bslug%5D/feedback/page.tsx). |
| `/event/:slug/opengraph-image`, `/event/:slug/twitter-image` | Canonical site origin (`apps/site`) | Native Next.js file-convention metadata routes (background unfurl-consumer fetches, not customer-clickable). **Verified by:** [`apps/site/app/event/[slug]/opengraph-image.tsx`](/apps/site/app/event/%5Bslug%5D/opengraph-image.tsx), [`apps/site/app/event/[slug]/twitter-image.tsx`](/apps/site/app/event/%5Bslug%5D/twitter-image.tsx). |
| `/event/:slug/game*` | Plugin (`apps/web`), routed through canonical site origin | Proxy rewrite from `apps/site` to `apps/web`, matching the shape already present at [`apps/site/next.config.ts:65-72`](/apps/site/next.config.ts) |
| `/event/:slug/admin*` | Plugin (`apps/web`), routed through canonical site origin | Same mechanism as `/event/:slug/game*` |
| `/event/:slug/game/redeem` | Plugin (`apps/web`), routed through canonical site origin | Subsumed by `/event/:slug/game*` |
| `/event/:slug/game/redemptions` | Plugin (`apps/web`), routed through canonical site origin | Subsumed by `/event/:slug/game*` |
| **Default rule:** any other event-scoped path not carved out for the plugin (`/event/:slug/<future-route>`) | Canonical site origin (`apps/site`) | Native Next.js route. Future apps/site additions under `/event/[slug]/...` inherit this row without requiring a plan amendment; the protective intent is that the plugin carve-outs above are the **only** event-scoped exceptions, and any new event-scoped surface defaults to apps/site-native. |
| `/_next/*` | Canonical site origin (`apps/site`) | Native Next.js asset path |
| `/assets/*` (Vite hashed bundles) | Plugin (`apps/web`), routed through canonical site origin | Same mechanism as `/event/:slug/game*` |
| Plugin-deployment-origin direct access (`*.vercel.app/...`) | Reachable, no lockdown | Resolved during this scoping pass — see "Investigations resolved in-PR" |
| **Test-event noindex coverage** for `harvest-block-party`, `riverside-jam`, `madrona` | Both apps emit `noindex, nofollow` at parity strength on every URL under those slugs (canonical-site landings via `generateMetadata` `robots`; plugin paths via apps/web's `headers` block) | apps/web's `headers` block at [`apps/web/vercel.json:59-72`](/apps/web/vercel.json) is **preserved** through Phase 2; apps/site's `generateMetadata` emit is unchanged. Pairing is load-bearing for both plugin-origin direct hits and canonical-origin proxied paths under `/event/:slug/{game,admin}*` (Vercel proxy rewrites propagate the destination's response headers). |

Status code expectations: cross-origin embedding via proxy rewrite
preserves the customer-visible URL (status code is whatever the
plugin's render returns — typically 200). No status-code change
applies to direct plugin-origin access — that surface is unchanged
by this plan.

## Cross-cutting invariants

Rules that thread through multiple files (rewrite configs, env vars,
auth flow, allowlists) and break silently if any one site drifts.
The End State table above prescribes per-route topology; these
invariants prescribe what stays true across the whole topology
through every phase.

- **Single canonical front door.** The canonical site origin
  (`apps/site` Vercel project's primary alias) is the only customer-
  advertised origin. Plugin origins (`apps/web`'s `*.vercel.app` and
  any future plugin's deployment URL) remain technically reachable
  but are never advertised, hardcoded into customer-visible URLs, or
  surfaced as link destinations. Drift looks like a hardcoded plugin
  URL leaking into apps/site code, an env-var default re-pointing at
  the plugin origin, or a doc instruction telling contributors to
  share the plugin URL.
- **Origin-agnostic shared route table.** [`shared/urls/routes.ts`](/shared/urls/routes.ts)
  remains the single origin-agnostic route map both apps consume;
  per-app code never composes route strings inline against a
  hardcoded origin. This is what lets the canonical-origin flip be
  purely structural — no per-app route rewrites needed. Drift looks
  like an `apps/web` or `apps/site` file building an absolute URL
  by concatenating an origin string with a hand-written path.
- **Test-event noindex parity across both apps.** `noindex, nofollow`
  coverage on the test/demo event slugs (`harvest-block-party`,
  `riverside-jam`, `madrona`) is paired: apps/site emits via
  `generateMetadata` `robots` on test-event landings; apps/web emits
  via the `headers` block at
  [`apps/web/vercel.json:59-72`](/apps/web/vercel.json) for every
  URL under those slugs. Both must hold simultaneously — breaking
  either side leaks indexability silently on the surface that side
  covers (apps/site landings, or plugin paths reached either via
  direct plugin-origin access or via the canonical-origin proxy
  whose response inherits the plugin's headers).
- **Auth-callback origin equals canonical site origin.**
  `requestMagicLink` composes `emailRedirectTo` against
  `window.location.origin`
  ([`shared/auth/api.ts:44-49`](/shared/auth/api.ts)); the Supabase
  Auth dashboard's redirect-URL allowlist must list that exact
  origin; therefore the customer must sign in from the canonical
  origin for the magic-link return to land on a Next.js-rendered
  callback rather than failing the allowlist check. Drift looks
  like the dashboard allowlist diverging from the deployed
  canonical origin, or any sign-in entry point hosted on a
  non-canonical origin.

## Path to end state

The phased path below is **estimate-shaped**: each phase's scope and
ordering is the planner's best guess at scoping time, and per-phase
plan-drafting may revise either when a structural call surfaces a
better split. The contract is the end state above; what's estimative
here is the sequencing.

### Phase 1 — Verify `apps/site` is self-sufficient on its own origin

**What this phase does.** Audit and patch any gap that prevents
`apps/site` from being a complete customer experience on its own
origin **without** the cross-app routing favors it currently receives
through `apps/web/vercel.json`. This is preparation: nothing customer-
visible changes, but the topology becomes shippable for Phase 2.

**Pre-state.** Today's bidirectional topology. `apps/site` origin is
reachable directly (e.g., the auto-generated `*.vercel.app` host or
preview URLs), where role-door links work via the cheap-unblock
reverse rewrites already in place. `apps/web` is the canonical
primary per architecture-doc framing.
**Verified by:** [`docs/architecture.md:32-35`](/docs/architecture.md),
[`apps/site/next.config.ts:65-86`](/apps/site/next.config.ts).

**Post-state.** `apps/site` origin renders every public surface
end-to-end (home, landings, admin, auth callback, role-door
navigations into `apps/web`-owned routes) without depending on
`apps/web/vercel.json` rewrites. The cheap-unblock reverse
rewrites stay in place; nothing is removed yet.

**Phase 1 likely covers** (estimative): a smoke pass of the apps/site
origin against the canonical surfaces, fixes for any
relative-path or absolute-URL leakage that assumes the apps/web
origin, and (likely) no production-config changes. Concrete file
inventory deferred to per-phase plan-drafting.

**Dependencies.** None blocking. Can ship today.

### Phase 2 — Flip the canonical pointer

**What this phase does.** Make the canonical customer URL point at
the `apps/site` Vercel project. Move all public-routing responsibility
into `apps/site/next.config.ts`. Strip the **cross-app proxy
rewrites** from `apps/web/vercel.json`; preserve the SPA rewrites
**and** the test-event `X-Robots-Tag` `headers` block at
[`apps/web/vercel.json:59-72`](/apps/web/vercel.json) untouched, so
the noindex coverage that pairs with apps/site's `generateMetadata`
`robots` emit on test-event landings continues to apply at parity
strength on both plugin-origin direct hits and canonical-origin
proxied paths.

**Pre-state.** Phase 1 complete: `apps/site` origin is self-sufficient.

**Post-state.** Customers reaching the canonical URL land on
`apps/site`. `/event/:slug/game*` and similar plugin paths are
embedded from `apps/site` into the plugin via proxy rewrite (the
settled embedding mechanism — see "Investigations resolved in-PR").
The
auth callback resolves on the canonical origin natively (no cross-
project proxy). The Supabase Auth redirect-URL allowlist is updated
to name the canonical origin's `/auth/callback`.
`NEXT_PUBLIC_SITE_ORIGIN`'s production value flips to the canonical
origin (`apps/site`'s primary alias on Vercel; the real domain when
that rolls). The Edge Function CORS allowlist
([`supabase/functions/_shared/cors.ts:1-8`](/supabase/functions/_shared/cors.ts))
is updated to admit the canonical site origin and Vercel-generated
preview / branch aliases of the `apps/site` project. Today's helper
matches via exact-string `Set.has(...)` and cannot match preview-
alias patterns as written, so this phase includes a small helper
update; the matching strategy itself is picked at this phase's
per-phase plan-drafting time, not here.

**Dependencies.** No Vercel custom-domain action required — there is
no platform-owned domain (resolved during this scoping pass; see
"Investigations resolved in-PR"). The canonical-origin "flip" is
purely structural: rewrite reshape, env-var update, dashboard
allowlist update, CORS allowlist update. The customer-facing change
is a communications one — the URL we share for internal-partner
demos changes from whatever surface points at `apps/web` today to
`apps/site`'s `*.vercel.app` alias.

**Phase 2 likely covers** (estimative): rewrite-rule reshape in both
projects (preserving apps/web's `headers` block per the post-state
above), env-var flip, Supabase dashboard update, CORS allowlist
update, hardcoded-URL sweep (the inventory below names the touch
points), and the doc-currency sweep below. Concrete file inventory
deferred to per-phase plan-drafting.

**Doc-currency update set** (rule-shaped, not estimative): Phase 2
must update at least the following docs in the same PR as the
topology flip, because each one carries instructions that go stale
the instant the canonical pointer flips:

- [`docs/dev.md`](/docs/dev.md) — the repo workflow source of
  truth. Carries stale `NEXT_PUBLIC_SITE_ORIGIN` guidance at
  [`docs/dev.md:881-892`](/docs/dev.md) ("It must be apps/web's
  hostname (not apps/site's), because apps/site sits behind an
  apps/web Vercel rewrite") plus the broader "apps/web is the
  primary Vercel project owning the production custom domain"
  framing at [`docs/dev.md:794-810`](/docs/dev.md) and the
  cookie-boundary verification narrative around
  [`docs/dev.md:897-927`](/docs/dev.md). All three sections invert
  with Phase 2.
- [`docs/architecture.md`](/docs/architecture.md) — the topology
  table at [`docs/architecture.md:951-1002`](/docs/architecture.md)
  describes today's bidirectional-rewrite shape; the "apps/web is
  the primary Vercel project owning the production custom domain"
  framing at [`docs/architecture.md:32-35`](/docs/architecture.md)
  is stale (already noted as such in this plan's Context).
- [`apps/site/.env.example`](/apps/site/.env.example) — the
  comment block at lines 3-9 says "Set this to apps/web's
  hostname"; flips with Phase 2.

The doc updates land **alongside** the implementing PR, not as a
follow-up doc-only PR — the Plan-to-PR Completion Gate's
documentation-current-state requirement makes this a same-PR
obligation rather than a deferred clean-up.

### No Phase 3 (plugin-origin lockdown not needed)

Earlier drafts of this plan carried a Phase 3 to choose and
implement a lockdown for direct access to the plugin's `*.vercel.app`
origin (308 redirect / 410 tombstone / passthrough). That phase is
removed: the user confirmed during this scoping pass that the site
is unlaunched, no live traffic exists, and no external links to the
plugin origin are in the wild. There is nothing to protect against
today.

The plugin's deployment origin remains reachable post-Phase-2 with
the auth-callback caveat noted in "End state" — this is an accepted
state, not an unaddressed one. If the calculus ever changes (organic
search picks the URL up, an external link surfaces, or the plugin
URL otherwise accumulates customer-bound traffic), a future plan
can add a redirect or tombstone then; this plan does not pre-emptively
build the mechanism.

### No Phase 4 (custom-domain rollout removed from this plan)

Earlier drafts of this plan carried a Phase 4 for a platform-owned
custom-domain rollout. That phase is removed: no platform-owned
domain is in flight, and the launch model uses per-event
organizer-owned subdomain CNAMEs onto the `apps/site` Vercel project
(the Madrona launch is the worked example). Per-event subdomain
onboarding is each event's own concern, owned by the organizer plus
whoever wires the Vercel-side custom-alias addition; it does not
belong to the canonical-origin plan. If a platform-owned domain
ever does materialize later, the topology this plan establishes
absorbs it without further restructuring — pointing a new alias at
the same `apps/site` Vercel project is additive.

## Investigations resolved in-PR

The following items were resolved by reading code and vendor docs
during this scoping pass; they do **not** carry into "Open questions."

- **Cross-app rewrite inventory.** Both `apps/web/vercel.json` (12
  rules total — see [`apps/web/vercel.json:9-58`](/apps/web/vercel.json))
  and `apps/site/next.config.ts` (5 rules — see
  [`apps/site/next.config.ts:64-86`](/apps/site/next.config.ts)) read
  end-to-end and inventoried in the End State table above.
- **`apps/web/vercel.json` carries more than rewrites.** Lines 59-72
  hold the `headers` block emitting `X-Robots-Tag: noindex, nofollow`
  for the three test/demo event slug patterns (harvest-block-party,
  riverside-jam, madrona). This pairs with apps/site's
  `generateMetadata` `robots` emit on test-event landings to keep
  test-event URLs invisible to search across both apps at parity
  strength. The headers block is preserved through Phase 2 — the
  earlier draft's "strip apps/web/vercel.json to SPA rewrites only"
  wording is corrected to "strip the cross-app proxy rewrites;
  preserve SPA rewrites and headers." Surfaced by reviewer Codex
  feedback on this PR. **Verified by:**
  [`apps/web/vercel.json:59-72`](/apps/web/vercel.json),
  [`docs/architecture.md`](/docs/architecture.md) noindex-uniformity
  framing.
- **Native apps/site route enumeration.** Walked the apps/site app
  tree (`find apps/site/app -name "page.tsx" -o -name "route.ts"`)
  to confirm every customer-visible native route is named in the
  End State table. Found: `/`, `/admin`, `/auth/callback`,
  `/event/:slug` (landing), and `/event/:slug/feedback` plus the
  `opengraph-image` / `twitter-image` file-convention metadata
  routes under `/event/:slug/`. The feedback route was missed in
  the first table draft and surfaced by reviewer Codex feedback on
  this PR; it works today only because `apps/web/vercel.json:31-33`'s
  broad `/event/:slug/:path*` catch-all proxies it through to
  apps/site, and works post-Phase-2 because apps/site is canonical
  and renders it natively. Adding the row plus the **default rule**
  (any other event-scoped path → native apps/site) makes the table
  contract resilient to future apps/site additions without
  amendment.
- **Hardcoded-URL touch points across the repo.** Three production-
  affecting files name a `*.vercel.app` URL: `apps/web/vercel.json`
  (7 occurrences of `neighborly-events-site.vercel.app` across the
  cross-app rewrite destinations),
  `apps/site/next.config.ts:53` (the `APPS_WEB_ORIGIN` constant), and
  `supabase/functions/_shared/cors.ts:7` (default-allowed-origin
  when `ALLOWED_ORIGINS` env is unset). All three flip with the
  topology change in Phase 2. **Verified by:** repo-wide grep
  inventoried during this scoping pass.
- **Auth-callback ownership.** `apps/site` owns `/auth/callback`
  physically as a client route at
  [`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/%28authenticated%29/auth/callback/page.tsx);
  `apps/web` reaches it today only via proxy rewrite at
  [`apps/web/vercel.json:51-53`](/apps/web/vercel.json). Once Phase 2
  flips the canonical origin, the proxy is removable because the
  customer is already on `apps/site`. **Verified by:**
  [`docs/architecture.md:241-244`](/docs/architecture.md),
  [`apps/web/vercel.json:51-53`](/apps/web/vercel.json).
- **Auth-redirect origin composition.** `requestMagicLink` composes
  `emailRedirectTo` against `window.location.origin`, not a hardcoded
  origin or a build-time env var. So magic-link return URLs follow
  whichever origin the user signed in on. **Verified by:**
  [`shared/auth/api.ts:44-49`](/shared/auth/api.ts). Implication:
  signing in from the plugin origin (post-Phase-2 direct access)
  would compose a redirect to `<plugin-origin>/auth/callback` —
  which the Supabase Auth dashboard probably won't have
  allowlisted, so the email flow would fail. This is the
  theoretical failure mode named in the Risk Register; with no
  active lockdown shipped today, the failure is accepted as
  "would only manifest if a customer somehow navigated to the
  plugin's `*.vercel.app` URL and attempted sign-in there."
- **Supabase config assertions.** `supabase/config.toml` carries no
  origin-bound URL configuration; only `verify_jwt` toggles per
  Edge Function. Auth callback URLs / Site URL settings live in the
  Supabase dashboard (operator-managed), not in repo. **Verified
  by:** [`supabase/config.toml`](/supabase/config.toml) (32 lines,
  full read).
- **Vercel platform-feature ceiling on direct-origin access blocking.**
  Vercel does not expose a no-cost mechanism for fully blocking
  direct access to a deployment's auto-generated `*.vercel.app` host
  while allowing proxied traffic. Trusted-IPs (Enterprise) gates
  by IP; Verified Proxy is for placing a proxy in front of the
  full project, not gating which host on the project answers.
  **Verified by:**
  [Vercel — Methods to Protect Deployments](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments),
  [Vercel — Trusted IPs](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/trusted-ips),
  [Vercel community thread on alias removal](https://community.vercel.com/t/remove-vercel-deployment-aliases/2674).
  Practical implication: any future lockdown of the plugin origin
  (not in scope for this plan) would have to operate at the
  **application layer** (vercel.json `redirects`, `headers`, or app-
  level middleware), not at the platform layer. Cited so a future
  planner doesn't mis-assume a Vercel feature exists for this.
- **No platform-owned custom domain today or in flight; launch
  model is per-event organizer subdomain CNAME.** Resolved by user
  during this scoping pass: there is no platform-owned domain in
  flight, and the assumed first real launch (Madrona) is a CNAME
  of `music.madrona.us` pointing at `apps/site`'s Vercel project.
  The architecture doc's claim at
  [`docs/architecture.md:32-35`](/docs/architecture.md) that
  "`apps/web` is the primary Vercel project owning the production
  custom domain" is stale framing this plan corrects. Implication:
  Phase 2 carries no Vercel-level domain-reassignment dependency;
  the canonical-origin flip is purely structural.
- **Embedding mechanism for the game is proxy rewrite.** Resolved
  by user during this scoping pass: iframe rejected (the user
  stated it is not the right choice), runtime federation not
  pursued, and the current proxy-rewrite shape works as expected.
  The settled mechanism for the game is the same proxy-rewrite
  pattern already present at
  [`apps/site/next.config.ts:64-86`](/apps/site/next.config.ts).
  Future plugins inherit this default; each plugin's onboarding
  may revisit if its constraints warrant.
- **No active lockdown needed for plugin-origin direct access.**
  Resolved by user during this scoping pass: the site is
  unlaunched, no live traffic exists today, and no external stale
  links are in the wild. The plugin's `*.vercel.app` origin remains
  reachable post-Phase-2 with no redirect / tombstone / advertised
  status; if the calculus changes later (search-engine pickup,
  external links accumulate), a follow-up plan can add a mechanism
  then. This plan ships nothing for that case pre-emptively.
- **`NEXT_PUBLIC_SITE_ORIGIN` semantics.** Today's `apps/site`
  documentation and runtime resolution treat this var as
  "apps/web's canonical custom-domain origin" — which makes
  `apps/site`'s `metadataBase` (and therefore the OG / Twitter
  unfurl URLs) point at `apps/web`'s host so unfurl clicks land on
  the apps/web-canonical proxy entry. Post-Phase-2, the variable
  retains its name but its production value flips to the new
  canonical (`apps/site`-canonical) origin. The variable's resolver
  ([`apps/site/app/layout.tsx:59-90`](/apps/site/app/layout.tsx)) is
  unchanged in shape; only its expected value in production
  flips. The `apps/site/.env.example:3-9` comment text is stale on
  Phase 2 day and gets updated alongside the topology change.

## Open questions

These need user / team input before per-phase scoping can lock its
contracts.

1. **Supabase Auth dashboard redirect-URL update mechanics.** The
   dashboard's allowlist is operator-managed and lives outside the
   repo. Confirm: who has access to update it, and is there a
   change-window concern (i.e., can old + new origins be in the
   allowlist simultaneously during cutover, or does the flip leave
   any in-flight magic links broken)? Likely a non-issue (the
   allowlist is additive), but Phase 2 scoping confirms before
   committing to a change-window.
2. **Where the `metadataBase` rule lives.** Phase 2 flips
   `NEXT_PUBLIC_SITE_ORIGIN`'s production value but keeps the
   resolver's shape. Confirm whether the resolver's documentation
   ([`apps/site/app/layout.tsx:29-58`](/apps/site/app/layout.tsx))
   needs a structural rewrite to reflect the canonical-origin
   semantics, or just a value-flip + comment update. Estimate-shaped
   call; per-phase plan-drafting picks.

## Out of scope

- Implementing any phase named in "Path to end state." This PR is
  scoping-only; per-phase plan-drafting and implementation are
  follow-ups.
- Committing to specific embedding mechanisms for **future plugins
  beyond the game**. The user's framing limits this plan to the
  game-specific case. Future plugins inherit the canonical-origin
  topology this plan establishes; their embedding mechanism is each
  plugin's own scoping question.
- Per-event organizer subdomain onboarding (the Madrona
  `music.madrona.us` CNAME and successor analogues). Each event's
  subdomain wiring belongs to that event's launch track, not to this
  plan; the canonical-origin topology this plan establishes already
  receives those subdomains as additional `apps/site` Vercel-project
  aliases without further restructuring.
- Future platform-owned custom-domain rollout. None is in flight; if
  one materializes later, it lands as an additional `apps/site` alias
  and slots into the topology this plan establishes.
- Generic "plugin platform" design — registration model, shared
  component contracts beyond what already exists in `shared/`,
  developer-experience tooling for plugin onboarding. Aspirational
  context only; this plan does not prefigure the platform shape.
- Migration of existing analytics / SEO surfaces (sitemap, robots.txt,
  structured data) to the new canonical origin. Each phase touches
  what it must; a comprehensive SEO audit is a separate concern.

## Risk register

- **Vercel offers no platform-level "block direct origin access"
  primitive on this plan tier.** Mitigation: this plan does not
  attempt origin-level blocking; the user confirmed no lockdown is
  needed today (no live traffic, no stale links). If a future plan
  does need to lock the plugin origin down, it operates at the
  application layer (vercel.json `redirects` / `headers`, or app
  middleware), not the platform layer. The platform-tier ceiling is
  cited so a future planner doesn't mis-assume a Vercel feature
  exists for this. **Verified by:**
  [Vercel — Methods to Protect Deployments](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments).
- **Supabase Auth redirect-URL allowlist is operator-managed and
  lives outside the repo.** A misconfigured cutover (new origin not
  in allowlist before flip; old origin removed too eagerly) breaks
  every magic-link sign-in for the duration. Mitigation: Phase 2's
  scoping checklist names the allowlist update as a pre-flip step,
  with both origins coexisting in the allowlist across the change
  window. The change is additive (Supabase Auth supports multiple
  redirect URLs), so no in-flight link is invalidated by adding the
  new origin; old-origin removal happens after Phase 2 stabilizes.
- **External links to the plugin's origin could accumulate post-launch
  even though none exist today.** No active mitigation: the user
  confirmed the site is unlaunched, no live traffic exists, and no
  stale links are in the wild. The accepted state is "monitor; if
  external traffic to the plugin URL ever shows up, address then."
  This is an explicit deferral, not an oversight.
- **`window.location.origin`-derived auth flow assumes the user is
  on the canonical origin at sign-in time.** Post-Phase-2, a
  signed-out user who somehow reaches the plugin origin directly
  composes a magic-link redirect to `<plugin-origin>/auth/callback`
  — which fails (allowlist). Mitigation: this is theoretical given
  no live traffic today; the failure mode would manifest only if
  someone actively navigates to the plugin's `*.vercel.app` URL and
  attempts sign-in there. Accepted state for the current launch
  posture; a future redirect / tombstone (if added) resolves it.
  **Verified by:** [`shared/auth/api.ts:44-49`](/shared/auth/api.ts).
- **`NEXT_PUBLIC_SITE_ORIGIN` value flip during Phase 2 is a
  metadata-correctness risk.** A misconfigured production env after
  the flip ships OG image / unfurl URLs pointing at the wrong
  origin, and the resolver throws at build time when the var is
  unset on production
  ([`apps/site/app/layout.tsx:65-72`](/apps/site/app/layout.tsx)) —
  so a missing-value misconfiguration is loud rather than silent.
  Mitigation: Phase 2's checklist names the env-var update on
  `apps/site`'s Vercel project as part of the cutover, validated by
  a post-deploy meta-tag spot-check. The build-time throw catches
  unset; the spot-check catches misset.
- **Per-plugin noindex `headers`-block maintenance cost compounds as
  plugins multiply.** Today's pattern (apps/web's vercel.json carries
  its own `X-Robots-Tag` headers block with a regex that hand-mirrors
  `TEST_EVENT_SLUGS`) works for one plugin. Each future plugin would
  inherit the same shape — its own headers block, its own hand-copied
  regex — and the manual sync between code's `TEST_EVENT_SLUGS` and
  per-plugin vercel.json regexes drifts on every test-slug add or
  remove. Mitigation: accepted state for the canonical-origin plan;
  the centralizing alternative (apps/site middleware emitting noindex
  for proxied test-event paths) becomes the right shape **only** if
  one of two conditions holds: (1) plugin-origin direct access is
  locked down (the deferred Phase-3 work), so apps/site can speak
  authoritatively for the only customer-reachable surface, or (2)
  plugin count multiplies enough that per-plugin headers-block bloat
  starts hurting in practice. Neither condition holds today, and the
  paired-emission shape is endorsed by the architecture doc as
  parity-strength coverage. Recorded so a future planner inherits
  the conditions rather than re-deriving them.

## Related docs

- [`docs/backlog.md:80-93`](/docs/backlog.md) — backlog entry this plan
  resolves; carries the original three-options framing.
- [`docs/architecture.md:32-35`](/docs/architecture.md),
  [`docs/architecture.md:951-1002`](/docs/architecture.md) —
  current Vercel routing topology and the "transitional" framing
  the architecture doc calls out for the bidirectional-rewrite shape.
- [`docs/dev.md:794-810`](/docs/dev.md),
  [`docs/dev.md:881-892`](/docs/dev.md),
  [`docs/dev.md:897-927`](/docs/dev.md) — repo workflow source of
  truth; named in Phase 2's doc-currency update set above because
  each section carries instructions that invert with the
  canonical-origin flip.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — the apps/web
  rewrite layer this plan reshapes (cross-app proxy rewrites
  stripped; SPA rewrites and the test-event `headers` block at
  lines 59-72 preserved).
- [`apps/site/next.config.ts`](/apps/site/next.config.ts) — the
  apps/site rewrite layer this plan grows into the single routing
  authority.
- [`shared/urls/routes.ts`](/shared/urls/routes.ts) — the central
  origin-agnostic route map both apps consume; unchanged by this
  plan but cited because the plan's coherence depends on the
  routes already being origin-agnostic.
- [`apps/site/components/home/RoleDoors.tsx`](/apps/site/components/home/RoleDoors.tsx) —
  the home-page links whose 404 symptom drove the cheap-unblock
  reverse rewrites in `apps/site/next.config.ts`.
- [`shared/auth/api.ts`](/shared/auth/api.ts),
  [`apps/site/app/(authenticated)/auth/callback/page.tsx`](/apps/site/app/%28authenticated%29/auth/callback/page.tsx) —
  auth-callback ownership and origin-composition mechanics.
- [`supabase/functions/_shared/cors.ts`](/supabase/functions/_shared/cors.ts) —
  Edge Function CORS allowlist that flips with Phase 2.
- [`apps/site/.env.example`](/apps/site/.env.example),
  [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) —
  `NEXT_PUBLIC_SITE_ORIGIN` semantics and resolver.
- [`docs/plans/planning-doc-location.md`](/docs/plans/planning-doc-location.md) —
  in-repo plan layout convention; this plan follows the
  cross-cutting-plan path (`docs/plans/<name>.md`).
