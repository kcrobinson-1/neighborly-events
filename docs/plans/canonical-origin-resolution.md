# Canonical User-Facing Origin

## Status

In draft.

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
embedded into the site's URL space via a mechanism that's not yet
chosen between proxy rewrites, iframes, and runtime federation. This
plan resolves the **game-specific case** in a way that's compatible
with future plugins, without designing a generic plugin platform.

The two `*.vercel.app` URLs above are not final; both will eventually
move to a real domain (today's domain situation is itself an open
question — see "Open questions" below). The plan is written in terms
of "the canonical site origin" and "the plugin's deployment origin"
so the sequencing survives the eventual domain rollout.

## Goal

After this plan lands its full sequence:

- Customers see exactly one canonical origin (today's
  `apps/site` `*.vercel.app` until the real domain rolls; the real
  domain after that). Every shared customer-visible URL — landing
  page, event landings, admin entry, auth callback, role-door
  navigations — resolves on this single origin.
- The game (`apps/web` deployment) is reached **only** through the
  canonical site origin. Its plugin-owned route prefixes
  (`/event/:slug/game*`, `/event/:slug/admin*`) are routed from the
  canonical origin into the plugin's deployment via a mechanism named
  in Phase 2 (default proposal: proxy rewrite, matching the existing
  shape; final choice is one of the deferred decisions).
- Direct customer access to the plugin's deployment origin (anyone
  hitting `https://neighborly-scavenger-game-web.vercel.app/...` or a
  branch-alias variant) lands on a deterministic non-canonical-origin
  state — either a redirect to the canonical origin's equivalent path,
  or a tombstone — chosen in Phase 3 from the options laid out in
  "Open questions."
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
- The Edge Function CORS allowlist is updated alongside the topology
  change so `Access-Control-Allow-Origin` continues to admit only the
  canonical origin and its preview / branch-alias siblings, not the
  stale plugin origin.

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
| `/event/:slug` (landing) | Canonical site origin (`apps/site`) | Native Next.js route, SSR per-slug |
| `/event/:slug/game*` | Plugin (`apps/web`), routed through canonical site origin | Embedding mechanism (Phase 2 deferred decision; default proposal: proxy rewrite from `apps/site` to `apps/web`, matching the shape already present at [`apps/site/next.config.ts:65-72`](/apps/site/next.config.ts)) |
| `/event/:slug/admin*` | Plugin (`apps/web`), routed through canonical site origin | Same mechanism as `/event/:slug/game*` |
| `/event/:slug/game/redeem` | Plugin (`apps/web`), routed through canonical site origin | Subsumed by `/event/:slug/game*` |
| `/event/:slug/game/redemptions` | Plugin (`apps/web`), routed through canonical site origin | Subsumed by `/event/:slug/game*` |
| `/_next/*` | Canonical site origin (`apps/site`) | Native Next.js asset path |
| `/assets/*` (Vite hashed bundles) | Plugin (`apps/web`), routed through canonical site origin | Same mechanism as `/event/:slug/game*` |
| Plugin-deployment-origin direct access (`*.vercel.app/...`) | Tombstone or redirect (Phase 3 deferred decision) | See "Open questions" |

Status code expectations: cross-origin embedding via proxy rewrite
preserves the customer-visible URL (status code is whatever the
plugin's render returns — typically 200). Direct-access lockdown in
Phase 3 emits 308 (preferred over 301 to preserve method on the
unlikely chance of a non-GET hitting the deployment origin) **iff**
that phase chooses the redirect option. The exact code is one of the
Phase 3 open questions; preference for 308 is recorded here for the
implementer to follow unless overridden.

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
into `apps/site/next.config.ts`. Strip `apps/web/vercel.json` to its
own SPA rewrites only.

**Pre-state.** Phase 1 complete: `apps/site` origin is self-sufficient.

**Post-state.** Customers reaching the canonical URL land on
`apps/site`. `/event/:slug/game*` and similar plugin paths are
embedded from `apps/site` via the chosen embedding mechanism. The
auth callback resolves on the canonical origin natively (no cross-
project proxy). The Supabase Auth redirect-URL allowlist is updated
to name the canonical origin's `/auth/callback`.
`NEXT_PUBLIC_SITE_ORIGIN`'s production value flips to the canonical
origin (`apps/site`'s primary alias on Vercel; the real domain when
that rolls). The Edge Function CORS allowlist
([`supabase/functions/_shared/cors.ts:1-8`](/supabase/functions/_shared/cors.ts))
is updated to admit the canonical origin and its branch / preview
siblings rather than the stale plugin origin.

**Dependencies.** Coordinates with whoever holds the canonical URL
pointer today. If a real custom domain is in use today and points at
`apps/web`, this phase requires a Vercel-level domain reassignment to
`apps/site` (separate track per the user's framing — see "Out of
scope"). If today's customer-facing URL is the auto-generated
`*.vercel.app` host (per the user's prompt framing), the equivalent
flip is "communicate the new URL," not a Vercel-config change. The
phase's scoping doc resolves this dependency.

**Phase 2 likely covers** (estimative): rewrite-rule reshape in both
projects, env-var flip, Supabase dashboard update, CORS allowlist
update, hardcoded-URL sweep (the inventory below names the touch
points). Concrete file inventory deferred to per-phase plan-drafting.

### Phase 3 — Lock down direct plugin-origin access

**What this phase does.** Decide and implement what happens when a
customer reaches the plugin's deployment origin directly (stale
bookmark, in-the-wild link, search-engine straggler). Three options
to evaluate at phase-scoping time, deliberately framed as concrete
mechanisms rather than aspirations:

- **Redirect** (308) every customer-bound path on the plugin's origin
  to the canonical origin's equivalent path. Mechanism: `redirects`
  in `apps/web/vercel.json` (matches Vercel's documented redirect
  feature; status code configurable — 308 preserves method, 301 is
  the SEO-equivalent permanent code; default proposal is 308 unless
  Phase 3 scoping surfaces a reason to prefer 301). **Verified by:**
  [Vercel redirect docs](https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects)
  apply at the Next.js layer; the `vercel.json` redirect schema is
  the analog for Vite SPAs.
- **Tombstone** (410 Gone) every customer-bound path on the plugin's
  origin to a static "this URL has moved" page. Mechanism: a small
  static fallback in `apps/web` plus a vercel.json rule that catches
  every non-internal route. Stronger SEO-deindex signal than 308.
- **Passthrough** — leave the plugin origin reachable; rely on the
  canonical-origin `<link rel="canonical">` and structured-data hints
  to consolidate SEO. Lowest-effort but leaves stale bookmarks
  silently divergent from canonical-origin behavior (e.g., the auth
  callback won't work, since `requestMagicLink` composes against
  `window.location.origin`).
  **Verified by:** [`shared/auth/api.ts:45-47`](/shared/auth/api.ts).

**Pre-state.** Phase 2 complete: canonical origin is `apps/site`,
plugin-origin direct access is reachable but produces undefined-
correctness behavior (auth callback proxy gone, role-door links
might be okay through the existing reverse rewrites if those stay).

**Post-state.** Plugin-origin direct access has a deterministic,
named behavior. `apps/web/vercel.json` no longer contains any
proxy-to-`apps/site` rule; the cheap-unblock entries are removed
because their purpose is satisfied by the canonical-origin routing
in Phase 2.

**Dependencies.** Coordinates with the SEO discoverability story for
the plugin URL — the open question of how-aggressive-to-block
factors in. Phase 3 scoping resolves this against actual analytics
data on plugin-origin traffic at the time the phase opens.

### Phase 4 (potentially deferred) — Custom-domain rollout

**What this phase does.** Point a real custom domain at the
`apps/site` Vercel project, retire the `*.vercel.app` URL as the
canonical advertised customer URL.

**Pre-state and dependencies.** This is a separate track per the
user's framing; it depends on domain-acquisition work outside this
plan's scope. Sequenced here for completeness — once a real domain
exists, the canonical-origin work above absorbs it without further
restructuring (the topology is already shaped to receive it). If the
real domain rolls before Phase 2, it slots into Phase 2 directly;
if after, Phase 4 simply updates the canonical-origin pointer one
more time.

**Post-state.** Customers see `https://<real-domain>/...`. Both
`*.vercel.app` URLs become deployment-only artifacts.

**Out of scope for this plan.** See "Out of scope" below.

## Investigations resolved in-PR

The following items were resolved by reading code and vendor docs
during this scoping pass; they do **not** carry into "Open questions."

- **Cross-app rewrite inventory.** Both `apps/web/vercel.json` (12
  rules total — see [`apps/web/vercel.json:9-58`](/apps/web/vercel.json))
  and `apps/site/next.config.ts` (5 rules — see
  [`apps/site/next.config.ts:64-86`](/apps/site/next.config.ts)) read
  end-to-end and inventoried in the End State table above.
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
  signing in from the plugin origin (post-Phase-2 stale bookmark)
  composes a redirect to `<plugin-origin>/auth/callback` — which the
  Supabase Auth dashboard probably won't have allowlisted, so the
  email flow would fail. This is one of the considerations Phase 3
  weighs when choosing redirect vs tombstone vs passthrough.
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
  Practical implication: Phase 3's lockdown options operate at the
  **application layer** (vercel.json `redirects`, `headers`, or app-
  level middleware), not at the platform layer.
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

1. **What is the canonical customer URL today, and is there a real
   domain in flight?** Architecture doc says `apps/web` "owns the
   production custom domain"
   ([`docs/architecture.md:32-35`](/docs/architecture.md)); the
   user's prompt framing said "today the auto-generated `*.vercel.app`
   host." Reconcile: does a real domain exist that points at
   `apps/web` today? If yes, Phase 2's "flip the pointer" is a
   Vercel-level domain reassignment. If no, Phase 2 is a
   communications change ("the canonical URL is now this site
   `*.vercel.app`"). The answer changes the cost and
   coordination shape of Phase 2 substantially.
2. **Embedding mechanism for the game (and pattern for future
   plugins).** Three concrete options: (a) proxy rewrite from
   canonical origin to plugin origin (matches today's shape; the
   default proposal); (b) iframe embed inside an `apps/site` shell
   page; (c) runtime federation (module federation, micro-frontends,
   or similar). The choice has downstream implications for SEO,
   asset-path resolution, auth-cookie scope, and how a future plugin
   onboards. The user's framing says this is aspirational context
   and not to design a generic platform here, so the call for the
   game-specific case can be "pick proxy rewrite for parity with
   today" without locking the generic answer; explicit confirmation
   from the user keeps the call from being inferred.
3. **Behavior on direct plugin-origin access.** Phase 3's choice
   between (a) 308 redirect, (b) 410 tombstone, (c) passthrough — see
   the phase description above. SEO posture and analytics on plugin-
   origin traffic at the time the phase opens both factor in.
4. **Whether the plugin's `*.vercel.app` is deployed as customer-
   facing at all post-canonical-origin.** Operationally, the plugin
   needs a deployment URL for the canonical-origin proxy / iframe /
   federation mechanism to point at. That deployment URL is by
   nature reachable. The question is whether we explicitly advertise
   or operate around it as a customer-facing URL. Implicitly, Phase 3
   already chooses for the canonical case; this question is whether
   the team wants to go further (e.g., move the plugin off Vercel
   to a host that isn't a customer-facing CDN, or use Vercel's
   Trusted IPs feature on Enterprise). Likely deferred to a later
   plan; tracked here so it doesn't lurk.
5. **Supabase Auth dashboard redirect-URL update mechanics.** The
   dashboard's allowlist is operator-managed and lives outside the
   repo. Confirm: who has access to update it, and is there a
   change-window concern (i.e., can old + new origins be in the
   allowlist simultaneously during cutover, or does the flip leave
   any in-flight magic links broken)? Likely a non-issue (the
   allowlist is additive), but Phase 2 scoping confirms before
   committing to a change-window.
6. **Where the `metadataBase` rule lives.** Phase 2 flips
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
- Custom-domain rollout (Phase 4 above). Sequenced for completeness
  but executed as a separate track. The canonical-origin work in
  Phases 1–3 absorbs a real domain whenever it rolls without further
  restructuring.
- Generic "plugin platform" design — registration model, shared
  component contracts beyond what already exists in `shared/`,
  developer-experience tooling for plugin onboarding. Aspirational
  context only; this plan does not prefigure the platform shape.
- Migration of existing analytics / SEO surfaces (sitemap, robots.txt,
  structured data) to the new canonical origin. Each phase touches
  what it must; a comprehensive SEO audit is a separate concern.

## Risk register

- **Vercel offers no platform-level "block direct origin access"
  primitive on this plan tier.** The Phase 3 lockdown is application-
  layer (vercel.json `redirects` / `headers`, or app middleware), not
  platform-layer. Mitigation: Phase 3 scoping picks an application-
  layer option that suffices for the actual SEO and abuse posture;
  the Trusted-IPs option is named in "Open questions" as a future
  consideration if the application-layer lockdown turns out to leak.
  **Verified by:**
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
- **Stale bookmarks / external links pointing at the plugin's origin
  survive in the wild long-tail.** Even with Phase 3's lockdown,
  external surfaces (search results, embedded link unfurls, partner-
  shared QR codes) may retain plugin-origin URLs. Mitigation: Phase 3
  picks a redirect (308) over a tombstone (410) if the long-tail
  matters more than the SEO-deindex signal; the redirect preserves
  the path so most stale links resolve to a working canonical-origin
  equivalent. The opposite tradeoff (tombstone wins on SEO) is also
  defensible; Phase 3 decides.
- **`window.location.origin`-derived auth flow assumes the user is
  on the canonical origin at sign-in time.** Post-Phase-2, a
  signed-out user reaching the plugin origin directly composes a
  magic-link redirect to `<plugin-origin>/auth/callback` — which
  fails (allowlist), then succeeds only via the canonical-origin
  proxy / redirect chain. Mitigation: Phase 3's lockdown converts
  plugin-origin entry into a canonical-origin redirect before the
  sign-in form is even reachable. The redirect option (308) handles
  this cleanly; passthrough does not, which weighs against
  passthrough. **Verified by:** [`shared/auth/api.ts:44-49`](/shared/auth/api.ts).
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

## Related docs

- [`docs/backlog.md:80-93`](/docs/backlog.md) — backlog entry this plan
  resolves; carries the original three-options framing.
- [`docs/architecture.md:32-35`](/docs/architecture.md),
  [`docs/architecture.md:951-1002`](/docs/architecture.md) —
  current Vercel routing topology and the "transitional" framing
  the architecture doc calls out for the bidirectional-rewrite shape.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — the apps/web
  rewrite layer this plan strips.
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
