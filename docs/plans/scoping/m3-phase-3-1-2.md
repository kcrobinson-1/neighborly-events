# M3 Phase 3.1.2 — Scoping

## Status

Transient scoping artifact for M3 phase 3.1.2 ("og:image generation,
twitter-image, `metadataBase`, `openGraph.url`, unfurl-cache
verification") per the M3 milestone doc
([m3-site-rendering.md](/docs/plans/m3-site-rendering.md)) and
[AGENTS.md](/AGENTS.md) "Phase Planning Sessions." This doc plus its
sibling scoping docs delete in batch in M3 phase 3.3's PR per the
milestone doc's "Phase Status" subsection. The durable contract for
3.1.2 will live in `docs/plans/m3-phase-3-1-2-plan.md`; this scoping
doc is the input the plan compresses from.

## Phase summary in one paragraph

3.1.1 shipped the `/event/[slug]` rendering pipeline with text-only
SSR metadata (title, description, Open Graph text fields,
`twitter:card`, `robots: noindex` for test events), explicitly
deferring og:image, twitter-image, `metadataBase` configuration, and
`openGraph.url` to 3.1.2. Those four items co-defer because Next.js
16 hard-errors at build on a relative URL-valued metadata field when
`metadataBase` is unset (verified at
[`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` line 428](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)),
and the canonical-origin source `metadataBase` needs is the same
source absolute og:image URLs need. 3.1.2 ships the four items
together: generates a per-event Open Graph image (and the parallel
Twitter card image) via Next.js 16's file-convention `next/og`
`ImageResponse` route at `apps/site/app/event/[slug]/opengraph-image.tsx`
and `…/twitter-image.tsx`; sets `metadataBase` once on the root
layout from a `NEXT_PUBLIC_SITE_ORIGIN` env var (registered in
`next.config.ts`'s `env` block to clear the Turbopack substitution
trap from M2 phase 2.3); adds `openGraph.url` to the page route's
`generateMetadata` as a relative path that resolves against
`metadataBase`; and captures an unfurl preview from at least one
consumer client (Slack's debugger is the chosen target; rationale
below) plus a curl falsifier asserting absolute-URL meta values
pre-hydration. 3.1.2's PR is also the terminal child of 3.1, so it
flips the M3 milestone doc's Phase Status row for 3.1 from
`Proposed` to `Landed`.

## Decisions made at scoping time

These are the open decisions named in the M3 milestone doc and the
3.1.1 plan's Out Of Scope list; resolving them here so the plan can
record them as "Verified by:" code citations rather than open
deliberation.

### og:image strategy → Next.js 16 file-convention `opengraph-image.tsx` with `next/og` `ImageResponse`

Three options the milestone doc named, evaluated against actual code:

- **Static asset under `apps/site/public/test-events/<slug>/og.png`.**
  Each event would need a hand-authored 1200×630 PNG committed to the
  repo, plus a `twitter:image` parallel. Image content (event name,
  dates, theme color) is decoupled from `EventContent` — a reader
  changing `content.hero.dates` updates the page text but not the
  unfurl image. The 3.1.1 plan's "EventContent is the single source
  of truth for per-event visible data" cross-cutting invariant
  silently breaks because the OG image becomes a per-event side
  channel that has to be re-authored every time content changes.
  Test-event content depth (every `EventContent` field exercised) is
  the explicit 3.1.1 invariant; a static asset that doesn't reflect
  that depth is honest about the test posture but defeats the
  Madrona-fit walk because M4's Madrona OG image would also need
  hand-authoring.
- **Dynamic API route at `apps/site/app/api/og/route.tsx`.** A
  Route Handler that takes `?slug=<slug>` and returns an
  `ImageResponse`. The `og:image` meta value is then an absolute URL
  pointing at this route. Two costs: the route runs at request time
  every time a crawler requests the image (not statically optimized
  unless cache headers are set explicitly), and the URL has to be
  composed at metadata-emit time (which is where `metadataBase`
  comes in). The "Static generation friendliness" cross-cutting
  invariant from 3.1.1 (no Request-time APIs in the page route)
  doesn't directly apply to a separate route, but the spirit does:
  generating the image at request time pays a runtime cost on
  every crawl for content that is fixed at build time.
- **Next.js 16 file convention
  `apps/site/app/event/[slug]/opengraph-image.tsx`.** A
  segment-colocated specialized Route Handler that the framework
  treats as a metadata source. Per the docs at
  [`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md` lines 89-94](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md):
  "Generated images are statically optimized (generated at build
  time and cached) unless they use Request-time APIs or uncached
  data." The default export receives `params` (a Promise in v16
  per the version-history table), so the slug is available the same
  way the page route receives it. Next.js auto-emits the `og:image`,
  `og:image:width`, `og:image:height`, `og:image:type`, and
  `og:image:alt` meta tags from the route's exports plus the
  generated image's URL — the page's `generateMetadata` does not
  set `openGraph.images` directly. The same pattern holds for
  `twitter-image.tsx`.

**Decision.** File convention. Each registered slug from
`registeredEventSlugs` prerenders an OG image at build time alongside
the page itself; M3 phase 3.2's second event picks up image
generation by default; M4 phase 4.2's Madrona inherits the pattern
without further wiring. Image content reads from `EventContent` (event
name, dates, location, theme background color) so there is no slug-
special-cased rendering path — the same content-shape-driven invariant
the page renderer obeys. The Static optimization gives free
build-time prerender; the file-convention auto-emission means no
manual `og:image` meta wiring on the page route. Bundle-size limit
of 500 KB per `ImageResponse` (per
[`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` line 51](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md))
is an honest constraint the implementation must respect — fonts and
embedded assets together must stay under that ceiling.

### twitter-image strategy → parallel file convention sharing one generator

The milestone doc names "twitter-image: parallel decision to og:image;
likely shares the same generator." Reading
[`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md` lines 84-87](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md):
`twitter-image` is the same file-convention class as
`opengraph-image`, with the same `(.js|.ts|.tsx)` form, the same
`alt` / `size` / `contentType` config exports, and the same default
1200×630 dimensions for the typical use case. Output meta tags
differ only in property names (`twitter:image*` vs. `og:image*`).

**Decision.** Both files exist as
`apps/site/app/event/[slug]/opengraph-image.tsx` and
`apps/site/app/event/[slug]/twitter-image.tsx`. Both import a
shared generator helper at `apps/site/lib/eventOgImage.tsx` that
returns the React element each `ImageResponse` wraps. This keeps the
visual identity locked to one source — a content-author or theme
change cannot drift one image type from the other. The two files
themselves are thin: each exports `alt`, `size`, `contentType`, and a
default function that calls the helper and returns
`new ImageResponse(...)`. The helper is the load-bearing module that
3.2 and M4 phase 4.2 inherit unchanged.

A "single file re-exporting from another" alternative would be
slightly less code but breaks the file-convention contract — Next.js
needs each file to export its own default function at the right
segment path; you cannot point both meta tags at one file. Two thin
files plus a shared helper is the right shape.

### `metadataBase` source → `NEXT_PUBLIC_SITE_ORIGIN` env var via `next.config.ts` `env` block

Three options from the milestone doc, evaluated:

- **Hardcoded production hostname.** The simplest option. Set
  `metadataBase: new URL('https://<apps/web-domain>')` directly in
  the root layout. Two costs: (1) any apps/web custom-domain rename
  forces a code change (the
  [docs/plans/repo-rename.md](/docs/plans/repo-rename.md) record
  confirms one rename has already been considered); (2) the local
  dev server emits production URLs in meta tags, which is
  cosmetically wrong even if functionally harmless (dev is never
  crawled). Hardcoded values also conflate "what is production" with
  "what does the build run against," which is exactly the kind of
  fragility env vars exist to solve.
- **`process.env.VERCEL_URL`.** Vercel injects this at build time
  for both Vercel projects independently. Reading
  [apps/web/vercel.json](/apps/web/vercel.json) lines 20-26: apps/site
  sits behind a Vercel rewrite from apps/web; users see the
  apps/web hostname in their address bar, not apps/site's. So
  `process.env.VERCEL_URL` evaluated inside apps/site resolves to
  apps/site's deployment URL (e.g.,
  `neighborly-events-site.vercel.app`), which is the *wrong*
  hostname for unfurl previews — a Slack/iMessage user clicking the
  unfurl card would land on apps/site directly instead of going
  through apps/web's Vercel rewrite layer. The 3.1.1 plan's "Cross-
  Cutting Invariants Touched" subsection explicitly names this:
  "the canonical user-facing origin is apps/web's hostname." Using
  `VERCEL_URL` from apps/site silently breaks that.
- **`NEXT_PUBLIC_SITE_ORIGIN` env var.** Set per environment. In the
  Vercel apps/site project's Production env, the value is apps/web's
  canonical custom-domain origin
  (e.g., `https://neighborly-scavenger-game-web.vercel.app` —
  the operator-set value at deploy time, picked from
  [apps/web/vercel.json](/apps/web/vercel.json) and the
  [docs/plans/site-scaffold-and-routing.md](/docs/plans/site-scaffold-and-routing.md)
  routing topology; the implementer reads the live alias from the
  Vercel dashboard at PR time rather than hardcoding a value here in
  the scoping doc). In `apps/site/.env.local` the value is whatever
  local origin the developer is testing against (typically
  `http://localhost:3000` for `next dev`, or a local apps/web origin
  if the contributor is exercising the cross-app proxy from
  `vercel dev`). Build-time fallback when the env var is unset:
  `http://localhost:3000` so `next build` does not hard-error in CI
  or local dev when the var is missing — the unset case is
  acceptable for non-production builds since Vercel's Production env
  is the only place metaBase value matters for unfurls.

**Decision.** Env var, named `NEXT_PUBLIC_SITE_ORIGIN`, registered in
`apps/site/next.config.ts`'s `env` block per the existing Turbopack
workaround. The recurring trap recorded in
[apps/site/next.config.ts](/apps/site/next.config.ts) lines 1-25
(Turbopack rewrites `process.env.NEXT_PUBLIC_*` lookups before
Next.js' substitution pass): any new `NEXT_PUBLIC_*` var has to go
through the `env` block or it ends up as an empty runtime lookup
against polyfilled `process`. The 3.1.2 plan must wire this var
through `next.config.ts`'s `env` block alongside the existing
Supabase pair — not as an afterthought, since failing to do so means
`metadataBase` resolves to `http://localhost:3000` at production
runtime (the fallback) and every unfurl URL points at localhost.

The env var is **public** (`NEXT_PUBLIC_`) because it embeds in the
client-bundled metadata, but the value (apps/web's hostname) is
already public information — apps/web's URL is what users type into
their address bar. There is no secret leakage.

`metadataBase` is set **once** in
[apps/site/app/layout.tsx](/apps/site/app/layout.tsx) (root layout's
existing `export const metadata: Metadata = { title: ... }`),
following the documented best practice in
[`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` line 424](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md):
"`metadataBase` is typically set in root `app/layout.js` to apply
to URL-based `metadata` fields across all routes." Per-route
`generateMetadata` does not override it; the page route adds
`openGraph.url` as a relative path (`/event/${slug}`) and the
framework composes the absolute URL.

### `openGraph.url` → relative path resolved against `metadataBase`

`openGraph.url` is a URL-based field; with `metadataBase` set, the
relative form `/event/${slug}` resolves to
`<NEXT_PUBLIC_SITE_ORIGIN>/event/${slug}`. The page's
`generateMetadata` adds it inside the existing `openGraph` block
already shipped in 3.1.1.

The url field has only one user-facing consumer: the `og:url` meta
tag, which Slack/iMessage/X show as the canonical link target on the
unfurl card. Without it, consumer clients fall back to the request
URL (also correct, but inconsistent across clients — some normalize
trailing slashes, some don't, some strip query strings). Setting it
explicitly removes per-client variation.

### Unfurl-cache verification → one-time PR-body capture from Slack debugger + curl-based gate

Three options the user prompt named:

- **One-time check captured in the PR body.** Slack's debugger at
  https://api.slack.com/robots (note: that page redirects to the
  Slack platform docs; the actual debugger endpoint is
  https://api.slack.com/methods/links.unfurl, but the canonical
  Slack-side tool is the "Link Unfurl Tester" inside the Slack app
  for a real workspace, or the public-facing "Slack Block Kit
  Builder" for static preview). For 3.1.2 the implementer captures a
  Slack unfurl by pasting the test event URL
  (`<NEXT_PUBLIC_SITE_ORIGIN>/event/harvest-block-party`) into a
  Slack DM-to-self in a workspace they control, screenshots the
  preview, and includes it in the PR body. Equivalent flow on X/
  Twitter: the X "Card Validator" (URL withheld here because X's
  product surface for this has churned; the implementer finds the
  current-equivalent in the X developer docs at PR time).
- **Reusable script under `scripts/unfurl-check.cjs`.** Would be a
  curl-plus-OG-meta-tag-extractor that the validation gate could
  re-run automatically. But Slack's actual unfurl behavior is
  cached server-side and not directly scriptable without an OAuth-
  scoped Slack app — the script could only validate "the meta tags
  exist with absolute URLs," which a curl one-liner already covers.
  Building a separate script for that level of check duplicates the
  curl-based gate without adding value.
- **Curl-based assertion in the validation gate.** Already the
  pattern 3.1.1 uses for the noindex falsifier (3.1.1 plan
  Validation Gate "Server-rendered noindex check"). Extending it
  for 3.1.2: assert that `og:image`, `twitter:image`, and `og:url`
  meta tags are present with absolute URL values
  (`https://...` or `http://...`, not relative paths). This is the
  "no `metadataBase` regression" falsifier — if the env var ever
  goes empty in production and the localhost fallback ships, every
  meta URL becomes `http://localhost:3000/...` and the curl catches
  it pre-merge.

**Decision.** Both the one-time PR-body capture (Slack only — X/
Twitter card validator is a "nice but not required" extension; one
consumer is the M3 milestone doc's named scope) **and** the curl-
based absolute-URL gate. Reusable script is rejected: it would only
duplicate the curl gate without unfurl-cache awareness, and Slack's
unfurl behavior cannot be exercised from a script without auth.

The cache-bust pattern from the M3 milestone doc's "Cross-Phase
Risks → Unfurl validation depends on third-party crawler caches"
(append `?v=<timestamp>` to the URL during validation iterations)
is documented in the 3.1.2 plan's validation procedure so future
repeat checks are reproducible.

## File inventory

### New — apps/site/app/event/[slug]

- `apps/site/app/event/[slug]/opengraph-image.tsx`. Specialized
  Route Handler per Next.js 16 file convention. Exports `alt: string`
  (e.g., the event's `meta.title`), `size: { width: 1200, height:
  630 }`, `contentType: 'image/png'`, and a default async function
  that takes `params: Promise<{ slug: string }>`, awaits, resolves
  via `getEventContentBySlug`, returns `notFound()` for unknown
  slugs (so the file convention does not generate an image for
  unregistered slugs at build time), and returns
  `new ImageResponse(<EventOgImage content={...} />, { ...size })`.
  The framework auto-emits `og:image*` meta tags on the page route
  the file is colocated with.
- `apps/site/app/event/[slug]/twitter-image.tsx`. Parallel file with
  identical shape; default export wraps the same `<EventOgImage>`
  React element in `new ImageResponse(...)`. Auto-emits
  `twitter:image*` meta tags. The visual content is identical to the
  OG image — Slack and X both render 1200×630 cards from these
  fields, so duplicating the visual is correct rather than wasteful.

### New — apps/site/lib

- `apps/site/lib/eventOgImage.tsx`. Shared React module exporting an
  `EventOgImage` component (or function returning a React element)
  that takes an `EventContent` slice and renders the visual the
  `ImageResponse` wraps: event name, formatted dates, location,
  theme background color (resolved from
  `getThemeForSlug(content.themeSlug)` like the page route does),
  platform attribution. Server-Component-style render — no hooks, no
  effects, no client-only APIs. The `next/og` runtime is Satori-
  based per
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` lines 49-50](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md):
  "Only flexbox and a subset of CSS properties are supported.
  Advanced layouts (e.g. `display: grid`) will not work." So the
  visual layout uses `display: flex` exclusively; no grid, no
  position-absolute hacks beyond what Satori supports.

### Modified

- [apps/site/app/layout.tsx](/apps/site/app/layout.tsx) — extend
  the existing `metadata` export with `metadataBase: new URL(...)`.
  The URL constructor takes
  `process.env.NEXT_PUBLIC_SITE_ORIGIN ?? 'http://localhost:3000'`.
  The fallback is documented inline so a reader understands why
  unset is acceptable in dev/CI but production env must set the var.
- [apps/site/next.config.ts](/apps/site/next.config.ts) — extend
  the `env` block with
  `NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? ''`
  (the empty-string default mirrors the existing Supabase pair). The
  inline comment block on the existing `env` block already documents
  the Turbopack-substitution-trap rationale — the new entry follows
  the same pattern without comment duplication.
- [apps/site/.env.example](/apps/site/.env.example) — document the
  new var alongside the existing Supabase pair with a short comment
  about apps/web hostname being the canonical origin (not apps/site's).
- [apps/site/app/event/[slug]/page.tsx](/apps/site/app/event/%5Bslug%5D/page.tsx)
  — add `openGraph.url: `/event/${slug}`` to the existing
  `generateMetadata` return. Do **not** add `openGraph.images` or
  `twitter.images` — Next.js' file convention auto-emits both, and
  duplicating risks emitting two `og:image` meta tags or having the
  page-level value override the file-convention value (the docs at
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` lines 1328-1358](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)
  describe the segment-cascade: deeper-segment metadata overrides
  shallower; explicit `openGraph.images` from `generateMetadata` and
  the file-convention emission both target the same segment, and
  the resolution order is undefined — safer to set neither and let
  the file convention own image meta).
- [docs/dev.md](/docs/dev.md) "apps/site environment variables"
  section — document the new `NEXT_PUBLIC_SITE_ORIGIN` var with the
  same shape as the existing `NEXT_PUBLIC_SUPABASE_*` entries
  (where to set it locally, where in the Vercel project, why it
  matters).
- [docs/plans/m3-site-rendering.md](/docs/plans/m3-site-rendering.md)
  Phase Status table — flip the 3.1 row's `Status` column from
  `Proposed` to `Landed` (3.1.2 is the terminal child of 3.1).
  Update the row's `PR` column to include the 3.1.2 PR number
  alongside the 3.1.1 reference.
- This scoping doc and the 3.1.2 plan doc — both gain Status updates
  through the implementing PR's Plan-to-PR Completion Gate flip.

### Intentionally not touched

- `apps/site/events/harvest-block-party.ts` — no content change.
  The `EventContent` shape that 3.1.1 shipped covers everything
  the OG image generator needs (name, dates, location, themeSlug);
  no new field is added in 3.1.2.
- `apps/site/lib/eventContent.ts` — `EventContent` shape unchanged.
  Per the M3 milestone doc cross-cutting invariant "Per-event SSR
  meta from one resolver," metadata richer than `EventContent`
  carries lives on the type; 3.1.2 does not surface a new field
  because the OG image renders from existing fields.
- `apps/site/components/event/*` — no section component change.
  The OG image generator is its own React tree (Satori-renderable
  flexbox layout); the page renderer is unchanged.
- `apps/site/public/test-events/harvest-block-party/*` — no asset
  change. The OG image is generated, not authored. The existing
  sponsor-logo SVGs remain as-is.
- `apps/site/app/(authenticated)/*` — no auth-route change.
- `apps/web/*` — no apps/web change. Cross-app navigation polish
  is M3 phase 3.3.
- [apps/web/vercel.json](/apps/web/vercel.json) — no edit. The
  `/_next/:path*` rewrite already proxies the file-convention
  output (the OG image route lives under `/event/:slug/opengraph-image`,
  which falls under the `/event/:slug/:path*` apps/site rewrite
  on lines 24-26). No new proxy rule needed.
- [shared/styles/themes/*](/shared/styles/themes) — no theme
  change. The OG image reads existing Theme tokens via
  `getThemeForSlug`.
- pgTAP, Edge Functions, supabase migrations — no SQL or function
  change.

## Contracts

### `EventOgImage({ content }): ReactNode`

Module: `apps/site/lib/eventOgImage.tsx`. Pure render function
returning a React element the `ImageResponse` constructor wraps.

- Visual layout: `display: flex` only (Satori constraint per
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` line 50](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md)).
- Background: solid color from the resolved Theme's brand background
  base (`bg` field on the Theme), so Harvest Block Party renders
  warm-pumpkin-pale and Madrona will render its own brand bg when
  registered.
- Foreground content: event display name (`content.hero.name`,
  large), tagline if present (medium), formatted date range (small),
  location (small), platform attribution at the bottom edge
  ("Neighborly Events").
- No external font loading in 3.1.2. Satori has built-in font
  fallbacks; loading custom fonts via `fetch` to Google Fonts inside
  the route would add network calls at build time. If the rendered
  text looks visibly wrong with the default fallback, the
  implementer adds a font load — but the default path is "use the
  built-in fallback and accept the platform-default look for test
  events."
- No client interactivity, no state, no effects. The function is
  pure and synchronous.

The function takes `EventContent` (full content), not a sub-slice,
so future extensions (e.g., a sponsor-logo strip on the OG image)
can read additional fields without changing the contract.

### `apps/site/app/event/[slug]/opengraph-image.tsx`

```ts
export const alt: string;          // = content.meta.title
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({ params }: { params: Promise<{ slug: string }> }): Promise<ImageResponse>;
```

Behavior:
- Awaits `params`, calls `getEventContentBySlug(slug)`. Calls
  `notFound()` from `next/navigation` for unknown slugs so the
  file-convention prerender skips them (matches the page route's
  unknown-slug behavior).
- Returns `new ImageResponse(<EventOgImage content={content} />, { ...size })`.
  Bundle-size constraint: fonts + helper module + ImageResponse
  output stays under 500 KB (per Next.js docs limit). 3.1.2's
  no-custom-fonts decision keeps this comfortably under the cap.
- Static generation: no Request-time API calls (`cookies()`,
  `headers()`, `searchParams`); the route prerenders at `next build`
  time alongside the page. The build log lists the OG image route as
  prerendered for each registered slug.

### `apps/site/app/event/[slug]/twitter-image.tsx`

Identical shape to `opengraph-image.tsx` except the file path
implies Twitter-specific meta emission. The default function calls
the same `<EventOgImage>` helper. Practically the same image bytes
get generated twice at build time — that's acceptable for a small
test-event registry (one slug today, two by 3.2's end, three by
M4); if the registry grows large enough that double generation
becomes a meaningful cost, the implementer extracts a memoized
helper. For 3.1.2 the duplication is honest and simple.

### Page route — `apps/site/app/event/[slug]/page.tsx`

`generateMetadata` adds one new field inside the existing
`openGraph` block:

```ts
openGraph: {
  // existing fields from 3.1.1: title, description, type, siteName
  url: `/event/${slug}`,  // resolves against metadataBase to <origin>/event/<slug>
}
```

No `openGraph.images`, no `twitter.images`, no `metadataBase` on
this route (per the file-convention / root-layout decisions above).

### Root layout — `apps/site/app/layout.tsx`

`metadata` export gains `metadataBase`:

```ts
export const metadata: Metadata = {
  title: "Neighborly Events",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "http://localhost:3000",
  ),
};
```

Behavior contract:
- The `URL` constructor accepts a string URL; per the docs at
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` lines 401, 444](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)
  the field type is `URL`, not `string`. `new URL('http://...')`
  is the documented form.
- Local fallback is `http://localhost:3000`. CI without the env
  var set still builds — Next.js does not require `metadataBase` to
  point at the *real* production origin at build time, only that
  it be a valid URL.
- Production deploy: the Vercel apps/site project's Production env
  has `NEXT_PUBLIC_SITE_ORIGIN` set to apps/web's canonical origin.
  The implementer reads the live alias at PR time and sets it via
  the Vercel dashboard or CLI — the value is *not* hardcoded into
  any source file.

### `next.config.ts` env entry

```ts
env: {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
  NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "",
}
```

The empty-string fallback at the `env` level is fine because the
root-layout fallback (`'http://localhost:3000'`) wraps the empty
case via `??` — `??` short-circuits on `""` only if the empty
string itself is the default, which is not the case here:
`process.env.NEXT_PUBLIC_SITE_ORIGIN` resolves to `""` from the
`env` block when the parent env is unset, and `"" ?? "..."` does
**not** apply the default (because `""` is not nullish — only
`null` or `undefined` trigger `??`). The root-layout
expression must therefore be `||` not `??`, or the `env` block
default must be a non-empty string.

**Resolution.** Use `process.env.NEXT_PUBLIC_SITE_ORIGIN ||
'http://localhost:3000'` in the root layout (logical-OR, not
nullish-coalescing), so an empty-string substitution still falls
back to the dev URL. This is a real falsifiability hazard the
plan must name explicitly with a verified test (the "Verified by:"
on the layout's choice of operator should be a build-then-curl
that confirms `og:image` is absolute under the empty-env path —
otherwise the operator picks silently the wrong way and ships
broken meta).

### Validation surface

`npm run build:site` is the load-bearing gate. The build log must
show the OG image route prerendering for each registered slug:

```
Route (app)
├ ● /event/[slug]
│   └ /event/harvest-block-party
├ ● /event/[slug]/opengraph-image
│   └ /event/harvest-block-party/opengraph-image
└ ● /event/[slug]/twitter-image
    └ /event/harvest-block-party/twitter-image
```

(Exact build-log shape verified by the implementer against the
real run; the scoping doc does not commit to the literal log
output.)

`npm run lint`, `npm test`, `npm run test:functions`,
`npm run build:web` — pass on baseline; pass on final. 3.1.2 does
not touch apps/web source or tests beyond the metadata wiring.

## Cross-Cutting Invariants

These thread multiple files in 3.1.2 and break silently when one
site drifts. Self-review walks each one against every changed file.

- **`metadataBase` is set once on the root layout, nowhere else.**
  Per-route `generateMetadata` does not override it; per-route
  metadata uses relative paths that the framework resolves. A
  future plan adding a route-specific `metadataBase` shifts the
  contract and breaks the "single source of truth for canonical
  origin" assumption.
- **`NEXT_PUBLIC_SITE_ORIGIN` reads through `next.config.ts`'s `env`
  block.** Any direct `process.env.NEXT_PUBLIC_SITE_ORIGIN` lookup
  in source falls through Turbopack's `process` polyfill and
  resolves to empty at runtime, per the trap recorded at
  [apps/site/next.config.ts lines 1-25](/apps/site/next.config.ts).
  The new var must be added to the `env` block in the same edit
  that introduces the source lookup.
- **OG and Twitter images render the same content.** Both file-
  convention routes import `EventOgImage` from
  `apps/site/lib/eventOgImage.tsx`. A future change to the visual
  identity edits the shared helper; neither file embeds layout
  inline. Drift between the two cards (e.g., OG carries a sponsor
  strip but Twitter does not) is a contract violation unless a
  later plan explicitly justifies divergence.
- **Image generators are static-optimized.** Neither
  `opengraph-image.tsx` nor `twitter-image.tsx` calls a
  Request-time API (`cookies()`, `headers()`, `searchParams`,
  uncached `fetch`). The build log confirms each route as
  prerendered alongside the page, not request-time. Adding a
  Request-time call silently flips the route to dynamic and
  defeats the unfurl-preview goal stated in the M3 milestone doc.
- **The OG image reads `EventContent` only.** No slug-special-cased
  rendering, no per-event globals, no per-event override file. The
  3.1.1 invariant "EventContent is the single source of truth for
  per-event visible data" extends to image content; the
  Madrona-fit walk for OG image content is identical to the
  Madrona-fit walk for the page renderer.
- **Theme resolution reads `content.themeSlug`, not the URL slug.**
  The 3.1.1 audit "Theme-resolution-via-themeSlug" applies inside
  the OG image generator the same way it applies inside the page
  route. Resolving via the URL slug silently falls back to the
  platform Theme for any event whose `themeSlug !== slug` — the OG
  image would render Sage Civic warm-cream instead of the intended
  brand bg, and the contract violation is invisible at runtime.
- **No new section in `EventContent`.** 3.1.2 does not add a
  `meta.ogImageAlt` or `meta.ogImageOverride` field to the type.
  If a future event needs richer OG content (e.g., a custom alt
  text differing from `meta.title`, or a per-event background
  image override), that landed in a separate plan; 3.1.2 ships
  the simplest end-to-end pipeline against existing fields.

## Validation surface

What `npm run build:site` and `npm run lint` exercise pre-merge,
and what they don't.

- **`npm run lint`.** ESLint over apps/site picks up the new
  `apps/site/lib/eventOgImage.tsx`, `…/opengraph-image.tsx`,
  `…/twitter-image.tsx` files. The eslint-config-next ruleset
  (apps/site/package.json devDependency at version 16.2.4) covers
  the file-convention shapes.
- **`npm run build:site`.** The load-bearing gate. Verifies (a)
  TypeScript shape of `Metadata.metadataBase`, (b) the
  `ImageResponse` import resolves and the `next/og` runtime is
  available, (c) Satori-renderable JSX inside `EventOgImage` (any
  `display: grid` or unsupported CSS surfaces here as a runtime
  build error), (d) bundle size of each generated image stays
  under 500 KB, (e) every registered slug prerenders the
  opengraph-image and twitter-image routes alongside the page.
- **`npm test`.** No new vitest cases are required for 3.1.2's
  surface. Server-Component file-convention routes don't render
  in jsdom (same constraint 3.1.1 acknowledged for the page
  route); the build pass is the gate. If the implementer adds a
  vitest case for `EventOgImage` rendering against synthetic
  `EventContent`, that's incidental coverage — the load-bearing
  proof is the build + a UI-review capture of the actual rendered
  PNG. Neither vitest nor build can prove the image *looks*
  right; that's where the UI-review comes in.
- **`npm run test:functions`.** No edge-function source change.
- **Server-rendered absolute-URL check (curl falsifier).** Run
  the local `next build && next start` pair and curl the raw HTML
  for the test event route. The grep must produce three meta tags
  with absolute URLs:

  ```
  <meta property="og:url" content="https://...">
  <meta property="og:image" content="https://.../event/harvest-block-party/opengraph-image">
  <meta name="twitter:image" content="https://.../event/harvest-block-party/twitter-image">
  ```

  All three values must be absolute (start with `https://` or
  `http://`, not `/`). If the env var was unset and the localhost
  fallback ships, the values are
  `http://localhost:3000/...` — which is "absolute" but wrong;
  the production-build run uses
  `NEXT_PUBLIC_SITE_ORIGIN=https://...` set in the local env so
  the curl shows the production-shaped form. The curl output is
  captured in the PR body's Validation section.
- **OG image visual inspection.** Open
  `http://localhost:3000/event/harvest-block-party/opengraph-image`
  in a browser against the production-built `next start` server,
  capture the PNG, include it in the PR body. Per AGENTS.md "Bans
  on surface require rendering the consequence" — text-only meta
  exists in 3.1.1; 3.1.2's load-bearing claim is "the unfurl now
  has an image," which a curl cannot prove. The image must be
  visually plausible (event name legible, theme bg readable, no
  overlapping text or clipped content).
- **Slack unfurl capture.** Paste the production deploy URL
  (post-merge) into Slack DM-to-self in a workspace the
  implementer controls; screenshot the unfurl preview; post the
  screenshot to the PR description. This is the consumer-end
  proof; the curl gate proves meta-tag correctness, the Slack
  capture proves the consumer client renders the meta correctly.

  **Pre-merge alternative** for when post-merge access is
  awkward: an unfurl preview against the deploy preview URL
  Vercel attaches to the PR, captured before merge. The
  protective check is "a real consumer-client renders our meta
  correctly," not "the merge is gated on prod"; either form
  satisfies it.

  Cache-bust pattern: append `?v=<timestamp>` to the URL during
  iteration so Slack does not serve a cached preview from a
  prior iteration. Document this in the validation procedure for
  reproducibility per the M3 milestone doc's risk on third-party
  caches.
- **What none of these cover.** `next dev` cannot prove
  static-optimization correctness — `next dev` always runs the
  routes dynamically on every request. The build-log inspection
  in `npm run build:site` is the gate that confirms each route
  prerendered. If a future change introduces an inadvertent
  Request-time call, the build log shows the route as
  request-time-only and the implementer catches it pre-merge.

## Self-Review Audits

Drawn from
[docs/self-review-catalog.md](/docs/self-review-catalog.md) and
matched to 3.1.2's diff surfaces.

### Frontend

- **Readiness-gate truthfulness audit.** The curl-based
  absolute-URL check is the load-bearing falsifier for the
  `metadataBase`-actually-applied claim. The PR body captures
  the curl output, not just a statement that it was run.
  Without captured output, a reviewer cannot distinguish
  "metadataBase resolved correctly" from "metadataBase
  silently fell back to localhost and the meta values are
  wrong."
- **Theme-resolution-via-themeSlug audit.** Walk the OG image
  generator's call to `getThemeForSlug` (inside
  `EventOgImage`) and confirm it passes `content.themeSlug`,
  not the URL slug. Same trap as 3.1.1: a wrong call passes
  the harvest-block-party UI-review unchanged (because
  `themeSlug === slug` for this event) but breaks 3.2 + M4
  silently when divergent. The audit is diff-walk only — no
  vitest case, since the generator runs inside the file-
  convention route which vitest does not render.
- **Effect cleanup audit.** Vacuously satisfied — the OG
  image generator is pure render with no effects, no async
  beyond the top-level `await params`, no subscriptions.

### CI & testing infrastructure

- **CLI / tooling pinning audit.** 3.1.2 is expected to
  introduce zero new dependencies. `next/og` is part of `next`
  16.2.4 (already pinned in
  [apps/site/package.json](/apps/site/package.json)). The
  contract relies on already-shipped deps. If implementation
  surfaces a need for a new package (unlikely; built-in font
  fallbacks suffice for a test event), it lands pinned per
  AGENTS.md and the PR description names it.
- **Rename-aware diff classification.** All file-convention
  files are net-new (`opengraph-image.tsx`, `twitter-image.tsx`,
  `eventOgImage.tsx`). The page route and root layout are
  modifications. `git diff --name-status` should show A entries
  for the new files and M entries for the modifies; no R
  entries.

## Risks

Phase-level risks; cross-phase risks live in the M3 milestone
doc.

- **Empty-env-var fallback ships to production.** If the
  Vercel apps/site project's Production env does not set
  `NEXT_PUBLIC_SITE_ORIGIN` (operator oversight), the
  `process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  'http://localhost:3000'` expression in the root layout
  resolves to localhost, every meta URL becomes
  `http://localhost:3000/...`, and unfurls break silently.
  Mitigation: the curl falsifier in the validation gate runs
  against a production-shaped local environment with the env
  var set; the post-merge production curl on the Slack
  unfurl URL surfaces the regression in seconds. The plan
  also names "verify the Vercel apps/site Production env has
  `NEXT_PUBLIC_SITE_ORIGIN` set" as a pre-merge operator
  check.
- **Turbopack substitution trap regression.** If the new
  `NEXT_PUBLIC_SITE_ORIGIN` lookup is added to source without
  the `next.config.ts` `env` block update, Turbopack rewrites
  `process` to a polyfill before Next.js' substitution sees
  it, and the lookup resolves to empty. Mitigation: the plan's
  Cross-Cutting Invariant names the requirement explicitly;
  the validation procedure's curl falsifier catches the
  regression because the localhost fallback ships.
- **Satori CSS subset surfaces at build.** `next/og`
  internally uses Satori, which supports only flexbox and a
  subset of CSS (per
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` lines 49-50](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md)).
  `display: grid` and many advanced features fail at build.
  Mitigation: the `EventOgImage` layout uses flexbox only;
  the implementer reads the Satori CSS subset documentation
  before authoring (the link in the docs goes to
  https://github.com/vercel/satori#css). Build failures are
  loud and obvious; the risk is confusion about which features
  are supported, not silent breakage.
- **ImageResponse bundle exceeds 500 KB.** Per
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md` line 51](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md).
  Without custom font loading, 3.1.2's bundle should be well
  under the limit (Satori built-in fonts + small JSX +
  ImageResponse output). Risk: a future plan that adds custom
  fonts pushes over the limit. Mitigation: out-of-scope for
  3.1.2; if a future plan adds custom fonts, the size check
  comes with that plan.
- **Slack/iMessage cache survives the merge.** If the test
  event URL was unfurled into Slack during 3.1.1's review
  (without an OG image), Slack caches the image-less preview
  for hours-to-days. Even after 3.1.2 ships the image, a
  reviewer pasting the same URL sees the cached image-less
  preview. Mitigation: the validation procedure documents the
  cache-bust pattern (append `?v=<timestamp>`); the PR-body
  unfurl capture uses the cache-bust form. The reviewer does
  not relitigate "the image is missing" against a stale cache.
- **OG image text contrast against Theme bg fails.** The
  `EventOgImage` renders text on top of `theme.bg`. If the
  text color (defaulting to `theme.text`) and bg are too
  similar (low contrast), the unfurl image is hard to read.
  Mitigation: `EventOgImage` uses fixed contrast pairs
  derived from the Theme — e.g., bg is `theme.bg` but text
  is `theme.text` only when their contrast ratio is high
  enough; otherwise text falls back to a neutral high-
  contrast value (`#1a1a1a` against light bg, `#fafafa`
  against dark bg). The implementer eyeballs the captured
  PNG against Harvest Block Party's warm-cream bg + dark-
  brown text; if contrast reads fine without a fallback,
  the simpler "always use `theme.text`" path ships. The
  fallback is added only if needed, against actual rendered
  output.
- **`og:image` meta-tag duplication via page-level
  `openGraph.images` fallback.** If the implementer
  accidentally adds `openGraph.images` to the page route's
  `generateMetadata` alongside the file-convention route,
  Next.js may emit two `og:image` meta tags (one from each
  source) or have one override the other in unspecified
  order. Mitigation: the plan explicitly names "do not add
  `openGraph.images` or `twitter.images`" as a contract; the
  curl falsifier asserts exactly one `og:image` and one
  `twitter:image` meta tag in the rendered HTML.
- **`metadataBase` set on the page route shadows root layout.**
  If the implementer adds `metadataBase` to the page route's
  `generateMetadata` (perhaps reading the M3 milestone doc
  context that the canonical-origin source is a per-route
  decision), the page-level value shadows the root layout's
  per the segment-cascade. Mitigation: the plan's
  Cross-Cutting Invariant names "metadataBase set once on
  root layout, nowhere else"; self-review walks the diff
  against every metadata-emitting site to confirm the rule.
- **OG image testing depends on `next start`, not `next dev`.**
  `next dev` runs routes dynamically; the static-optimization
  contract is invisible there. A 3.1.2 contributor who
  validates only against `next dev` cannot prove the build-
  time-prerendered claim. Mitigation: the validation
  procedure explicitly names `next build && next start` as
  the run mode; the build log inspection step proves the
  prerender count.

## Open decisions to make at plan-drafting

These are open questions the plan should resolve, not the
scoping doc.

- **`EventOgImage` layout details.** Exact font sizes, paddings,
  positioning of event name vs. dates vs. location vs.
  attribution. The plan picks values against the actual
  rendered PNG; UI-review captures the load-bearing
  verification.
- **Whether to load a custom font for the OG image.** The
  scoping decision says "not in 3.1.2 unless the default
  fallback looks visibly broken." The plan re-confirms after
  the implementer eyeballs the first build's output. If a
  custom font is added, the plan names the bundle-size budget
  and which font weights ship.
- **Whether `EventOgImage` accepts the resolved Theme as a
  prop or resolves it internally.** Both are reasonable; the
  trade-off is helper-coupling vs. caller-responsibility. The
  plan picks one based on the file-convention call site
  shape (which already has access to the Theme via
  `getThemeForSlug` from the resolved content).
- **Exact value of `NEXT_PUBLIC_SITE_ORIGIN` for production.**
  Read from the live Vercel apps/web project alias at PR time
  (the value is operator-set, not authored). The plan's PR
  body validation step names "set Vercel apps/site Production
  env `NEXT_PUBLIC_SITE_ORIGIN` to the value `<copied from
  apps/web's primary alias>`" so reviewer attention does not
  relitigate the canonical-origin decision.
- **Whether the curl falsifier asserts strict pattern (e.g.,
  exact-match `https://<expected-origin>/event/...`) or just
  absoluteness.** Strict pattern catches more regression
  classes (wrong origin) but couples the validation script to
  a hardcoded value the implementer must update on rename;
  absoluteness-only is loose but stable. The plan picks
  absoluteness-only with a comment that documents the
  strict-pattern alternative as a future tightening.

## Plan structure handoff

The plan at `docs/plans/m3-phase-3-1-2-plan.md` should match the
structure of the just-renamed
[m3-phase-3-1-1-plan.md](/docs/plans/m3-phase-3-1-1-plan.md) with
sections in this order:

1. Status (with terminal-PR note: 3.1.2 flips both this plan's
   Status and the M3 milestone doc's Phase 3.1 row to `Landed`)
2. Plain-language Context preamble (per AGENTS.md "Plan opens
   with a plain-language context preamble" — name what this
   phase is, why now, what surfaces it touches at the conceptual
   level before any implementation specifics)
3. Goal
4. Cross-Cutting Invariants
5. Naming
6. Contracts (with `metadataBase` source decision, file-convention
   route shapes, `EventOgImage` helper signature, env-var wiring)
7. Cross-Cutting Invariants Touched (epic-level)
8. Files to touch — new
9. Files to touch — modify
10. Files intentionally not touched
11. Execution steps (pre-edit gate, baseline, edits in commit
    boundaries below, validation re-run, UI review, doc update,
    automated review feedback, plan-to-PR completion gate, PR
    preparation)
12. Commit boundaries
13. Validation Gate
14. Self-Review Audits (drawn from
    [docs/self-review-catalog.md](/docs/self-review-catalog.md);
    candidates: Readiness-gate truthfulness audit (curl falsifier),
    Theme-resolution-via-themeSlug audit (extends to OG image
    generator), Effect cleanup audit (vacuous), CLI / tooling
    pinning audit (no new deps expected), Rename-aware diff
    classification (all-A/M, no R entries))
15. Documentation Currency PR Gate (the M3 milestone doc names
    architecture.md, README.md, dev.md as 3.3-owned; 3.1.2 owns
    its own plan Status flip and the milestone doc's Phase 3.1
    Status row flip — the latter because 3.1.2 is the terminal
    child of 3.1; 3.1.2 also adds the new env-var entry to
    docs/dev.md "apps/site environment variables")
16. Out Of Scope
17. Risk Register
18. Backlog Impact (none expected)
19. Related Docs

## Reality-check inputs the plan must verify

The plan's load-bearing technical claims need "Verified by:" cites
to actual code or generated output, per AGENTS.md "'Verified by:'
annotations on technical claims." The candidates the plan should
hit:

- The Next.js 16 file-convention pattern for `opengraph-image.tsx`
  (exports, default function shape, auto-meta-emission) — verify
  by reading
  [`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md)
  lines 78-94 (generation pattern) and 217-264 (props + config
  exports + return type).
- The `ImageResponse` constructor shape and Satori CSS subset —
  verify by reading
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md)
  lines 7-37 (constructor signature) and lines 47-52 (behavior
  + bundle limit + supported features).
- The `metadataBase` field type, set-once-at-root rule, and
  build-error behavior on relative URLs without it — verify by
  reading
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)
  lines 392-429 (metadataBase reference) and line 428 (the
  build-error rule).
- The Turbopack `process.env.NEXT_PUBLIC_*` substitution trap —
  verify by reading
  [apps/site/next.config.ts lines 1-25](/apps/site/next.config.ts)
  (the existing comment block + Supabase entries are the binding
  precedent).
- The Vercel rewrite topology (apps/web hostname is canonical,
  apps/site sits behind it) — verify by reading
  [apps/web/vercel.json](/apps/web/vercel.json) lines 20-26 and
  the `/_next/:path*` rewrite on line 32-33.
- The page route's existing `generateMetadata` shape (the new
  `openGraph.url` field plugs into the existing `openGraph`
  block) — verify by reading
  [apps/site/app/event/[slug]/page.tsx](/apps/site/app/event/%5Bslug%5D/page.tsx)
  lines 49-67.
- The root layout's existing `metadata` export (the new
  `metadataBase` field plugs into the existing object) — verify
  by reading
  [apps/site/app/layout.tsx lines 28-30](/apps/site/app/layout.tsx).
- The 3.1.1 plan's "Cross-Cutting Invariants Touched" subsection
  naming canonical-origin as apps/web's hostname — verify by
  reading
  [docs/plans/m3-phase-3-1-1-plan.md lines 351-357](/docs/plans/m3-phase-3-1-1-plan.md)
  (the existing co-deferral rationale).

## Related Docs

- [m3-site-rendering.md](/docs/plans/m3-site-rendering.md) — M3
  milestone doc; cross-phase invariants, decisions, risks. The
  Phase 3.1 row's `Status` column flips to `Landed` in 3.1.2's PR
  (3.1.2 is the terminal child).
- [event-platform-epic.md](/docs/plans/event-platform-epic.md) —
  parent epic; M3 phase paragraphs are pre-milestone-planning
  estimate (the milestone doc is canonical).
- [m3-phase-3-1-1-plan.md](/docs/plans/m3-phase-3-1-1-plan.md) —
  3.1.1 (rendering pipeline + first test event + basic SSR
  meta); records the og:image / metadataBase / openGraph.url /
  unfurl-validation co-deferral that 3.1.2 picks up. 3.1.2's plan
  inherits 3.1.1's contract for `EventContent`,
  `getEventContentBySlug`, `getThemeForSlug`, and the page route
  shape.
- [docs/plans/scoping/m3-phase-3-1.md](/docs/plans/scoping/m3-phase-3-1.md)
  — 3.1.1's scoping doc; records the original PR-split decision
  and the og:image deferral. Deletes in batch with this scoping
  doc in 3.3's PR.
- [shared-styles-foundation.md](/docs/plans/shared-styles-foundation.md)
  — M1 phase 1.5 plan; ThemeScope contract and the
  `getThemeForSlug` resolver the OG image generator consumes.
- [docs/styling.md](/docs/styling.md) — themable / structural
  classification; `EventOgImage` reads themable tokens (`bg`,
  `text`, `primary`).
- [docs/self-review-catalog.md](/docs/self-review-catalog.md) —
  audit name source.
- [apps/site/AGENTS.md](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder. The plan reads
  `node_modules/next/dist/docs/` for the metadata-API and
  file-convention surfaces it touches.
- [AGENTS.md](/AGENTS.md) — Phase Planning Sessions rules,
  Plan-to-PR Completion Gate, Doc Currency PR Gate, "Verified
  by:" annotation rule, "Bans on surface require rendering the
  consequence" rule (which makes the OG image visual capture and
  Slack unfurl capture load-bearing for 3.1.2).
