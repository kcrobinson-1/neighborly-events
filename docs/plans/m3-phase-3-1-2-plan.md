# M3 Phase 3.1.2 — og:image, twitter-image, `metadataBase`, `openGraph.url`, Unfurl Verification

## Status

Landed.

3.1.2 is the second and terminal child of M3 phase 3.1 (the first
child, 3.1.1, landed in
[PR #139](https://github.com/kcrobinson-1/neighborly-events/pull/139)).
This plan covers the four items 3.1.1 explicitly co-deferred:
per-event Open Graph image generation, the parallel Twitter card
image, `metadataBase` configuration on the root layout, and
`openGraph.url` on the page route — plus a Slack unfurl preview
capture as the consumer-end proof per AGENTS.md "Bans on surface
require rendering the consequence."

The 3.1 row in the M3 milestone doc's Phase Status table flips from
`Proposed` to `Landed` in 3.1.2's PR (the phase as a whole becomes
`done` only when both children ship; 3.1.1's PR left it
`Proposed`). This plan's Status flips from `Proposed` to `Landed`
in the same implementing PR per
[`AGENTS.md`](/AGENTS.md) "Plan-to-PR Completion Gate." No commit
SHAs are recorded in the row (`git log` and `git blame` are
authoritative).

**Parent epic:** [`event-platform-epic.md`](/docs/plans/event-platform-epic.md),
Milestone M3, Phase 3.1 (children 3.1.1 + 3.1.2).
**Milestone doc:** [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md).
**Sibling phase:** 3.1.1 (rendering pipeline + first test event +
basic SSR meta) — Landed.

**Hard dependencies on `main`.** 3.1.2 builds directly on 3.1.1's
already-merged surfaces:

- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)'s
  existing `generateMetadata` (3.1.2 adds one new field to the
  existing `openGraph` block).
- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx)'s
  existing `metadata` export (3.1.2 adds `metadataBase`).
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)'s
  `EventContent` shape and `getEventContentBySlug` resolver
  (consumed unchanged by the OG image generator).
- The `harvest-block-party` test event content module and its
  registered Theme (the OG image renders against this content +
  Theme; 3.2's second event will inherit the OG image pipeline).

**Scoping inputs.** This plan compresses from
[`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md),
which records the file-convention vs. dynamic-route vs. static-asset
trade-off, the `NEXT_PUBLIC_SITE_ORIGIN` env-var decision, the
shared-generator decision for OG and Twitter images, and the unfurl
verification approach. The scoping doc deletes in batch in M3 phase
3.3's PR.

## Context

3.1.1 shipped a working `/event/[slug]` rendering pipeline with
text-only SSR metadata: title, description, Open Graph text fields,
`twitter:card = summary_large_image`, and `robots: noindex` for
test events. Anyone who paste a `/event/harvest-block-party` URL
into Slack today gets a working unfurl card with the title and
description — but no preview image. The `og:image`, `twitter:image`,
`og:url`, and `metadataBase` were co-deferred to this phase because
Next.js 16 hard-errors at build on relative URL-valued metadata
fields when `metadataBase` is unset, and the canonical-origin
source `metadataBase` needs is the same source absolute og:image
URLs need. Splitting them across two PRs would have decided the
canonical-origin question twice; bundling them here lets it land
once.

This is being done now because 3.2 (second test event with a
distinct theme) inherits the image pipeline by default — adding a
new event slug auto-prerenders an OG image without any plan
changes — so 3.1.2 must land before 3.2's plan-drafting starts.
M4's Madrona launch consumes the same pipeline against Madrona
content; the unfurl-preview goal stated in the M3 milestone doc
gates Madrona's "is the launch share-ready" check on this image
existing.

The surfaces this phase touches at the conceptual level: the public
event landing page's social-preview metadata (Open Graph and
Twitter card), the apps/site environment-variable surface (one new
public var carrying the canonical origin), the apps/site root
layout (one new metadata field), and the unfurl-validation
procedure (a curl falsifier plus a Slack consumer-client capture).
No DB changes, no auth changes, no apps/web changes, no URL
contract changes, no `EventContent` shape changes.

### Reading this plan: code shapes are directional pseudocode

> Inline code shapes in this plan (field-value pairs, type
> signatures, expressions, short snippets) communicate contract
> *shape* — what field exists where, what shape it takes, how it
> relates to other fields — not exact source. The implementer
> translates shapes into syntactically-correct code at PR time,
> against the surrounding prose. Reviewers (human or automated)
> should focus on shape-level questions (missing field, wrong
> relationship, contract self-inconsistent), not syntax-level ones
> (template-literal quotes, shell precedence, missing imports,
> semicolons). The five-line rule from AGENTS.md "Planning Depth"
> still caps how much code-shaped content lives here.

## Goal

Land per-event Open Graph and Twitter card images at
`/event/[slug]/opengraph-image` and `/event/[slug]/twitter-image`
via Next.js 16's file-convention `next/og` `ImageResponse` route
pattern, set `metadataBase` once on the root layout from a
`NEXT_PUBLIC_SITE_ORIGIN` env var (registered through
`next.config.ts`'s `env` block per the existing Turbopack
substitution-trap workaround), add `openGraph.url` to the page
route's `generateMetadata` as a relative path resolved against
`metadataBase`, and capture a Slack unfurl preview of the
production deploy URL as the consumer-end proof. The 3.1 row in
the M3 milestone doc flips from `Proposed` to `Landed` in this
PR.

The phase is a pure addition to apps/site. No surface from 3.1.1
changes shape; the page route gains one field, the root layout
gains one field, the env-var surface gains one var.

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file, not just the file that first
triggered the rule.

- **`metadataBase` is set once on the root layout, nowhere else.**
  Per-route `generateMetadata` does not override it; per-route
  metadata uses relative paths the framework resolves. A future
  plan that adds a route-specific `metadataBase` shifts the
  contract and breaks the "single source of truth for canonical
  origin" assumption. 3.1.2's only `metadataBase` site is
  [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx).
- **`NEXT_PUBLIC_SITE_ORIGIN` reads through `next.config.ts`'s
  `env` block.** Any direct `process.env.NEXT_PUBLIC_SITE_ORIGIN`
  lookup in source falls through Turbopack's `process` polyfill
  and resolves to empty at runtime per the trap recorded at
  [`apps/site/next.config.ts` lines 1-25](/apps/site/next.config.ts).
  The new var is added to the `env` block in the same edit that
  introduces the source lookup; the lookup itself uses the
  literal `process.env.NEXT_PUBLIC_SITE_ORIGIN` form Next.js'
  substitution requires.
- **Empty-env fallback uses logical-OR, not nullish-coalescing.**
  The root layout reads
  `process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000'`,
  not `??`. The `env` block in `next.config.ts` substitutes empty
  string (`""`) when the parent env is unset; `??` does not
  short-circuit on `""` because empty-string is not nullish, so
  `??` would let an empty `metadataBase` URL constructor argument
  ship and the build hard-errors. The plan's load-bearing
  falsifier for this invariant is the curl gate against an
  empty-env build (see Validation Gate).
- **OG and Twitter images render the same content.** Both
  file-convention routes import `EventOgImage` from
  `apps/site/lib/eventOgImage.tsx`. A future change to the visual
  identity edits the shared helper; neither file embeds layout
  inline. Drift between the two cards is a contract violation
  unless a later plan explicitly justifies divergence.
- **Image generators are static-optimized.** Neither
  `opengraph-image.tsx` nor `twitter-image.tsx` calls a
  Request-time API (`cookies()`, `headers()`, `searchParams`,
  uncached `fetch`). The build log confirms each route as
  prerendered alongside the page. Adding a Request-time call
  silently flips the route to dynamic and defeats the
  unfurl-preview goal stated in the M3 milestone doc.
- **The OG image reads `EventContent` only.** No slug-special-
  cased rendering, no per-event globals, no per-event override
  file. The 3.1.1 invariant "EventContent is the single source of
  truth for per-event visible data" extends to image content.
- **Theme resolution reads `content.themeSlug`, not the URL slug.**
  Same trap as 3.1.1's audit. The OG image generator's call to
  `getThemeForSlug` passes `content.themeSlug`, not `params.slug`.
- **No `openGraph.images` or `twitter.images` on the page
  route.** Next.js' file-convention auto-emits both meta tags
  from the route files; setting them on the page-level
  `generateMetadata` risks duplicate or unspecified-order
  emission per the segment-cascade rules
  ([`generate-metadata.md` lines 1328-1358](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)).
  The page route adds only `openGraph.url`.

## Naming

- File-convention routes: `apps/site/app/event/[slug]/opengraph-image.tsx`
  and `apps/site/app/event/[slug]/twitter-image.tsx`. Next.js 16
  reserves these exact filenames per
  [`opengraph-image.md` lines 78-94](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md).
- Shared helper: `apps/site/lib/eventOgImage.tsx` exporting the
  `EventOgImage` React component. `.tsx` suffix because the file
  contains JSX.
- Env var: `NEXT_PUBLIC_SITE_ORIGIN`. The `NEXT_PUBLIC_` prefix
  is the Next.js convention for client-readable env vars; `SITE`
  references apps/site (the project that reads the var); `ORIGIN`
  matches the WHATWG URL terminology and signals "scheme + host +
  port," not "full URL."

## Contracts

### `EventOgImage({ content }): ReactNode`

Module: [`apps/site/lib/eventOgImage.tsx`](/apps/site/lib/eventOgImage.tsx)
(new). Pure render function returning a React element the
`ImageResponse` constructor wraps.

Behavior contract:

- Takes the full `EventContent` (not a sub-slice) so future
  extensions can read additional fields without changing the
  signature.
- Resolves the per-event Theme internally via
  `getThemeForSlug(content.themeSlug)`. Reads `theme.bg`,
  `theme.text`, and `theme.primary` for the visual.
- Visual content: event display name (large), tagline if present
  (medium), formatted date range (small), location (small),
  platform attribution at the bottom edge ("Neighborly Events").
- Layout: `display: flex` only. Satori (the rendering engine
  inside `next/og`) supports a CSS subset that excludes
  `display: grid` and many advanced layouts per
  [`image-response.md` line 50](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md).
  The plan does not commit to exact font sizes, paddings, or
  positioning; those are picked at implementation time against
  the actual rendered PNG.
- No font loading, no async beyond what the caller provides. The
  function is pure and synchronous. Satori's built-in font
  fallback handles text rendering.
- No client APIs, no hooks, no effects.
- Date formatting reads from
  [`apps/site/lib/eventDateFormat.ts`](/apps/site/lib/eventDateFormat.ts)'s
  `formatHeroDateRange` — the same util the page header consumes.
  The shared helper was added during 3.1.2 implementation; see
  the "Files to touch — new" entry for `eventDateFormat.ts`.

### `apps/site/app/event/[slug]/opengraph-image.tsx`

Specialized Route Handler per Next.js 16 file convention. Exports:

- `alt: string` — module-level static export per Next.js' file
  convention (see
  [`opengraph-image.md` lines 263-273](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md)
  — `alt` is a `const` evaluated once at module load and cannot
  read route params at request time; per-route-instance dynamic
  alt would require `generateImageMetadata`, which is rejected
  for 3.1.2 because the rendered image already carries
  per-event content visually and a generic alt is sufficient
  for screen readers and crawlers). Wording is implementer
  choice; "Neighborly Events — event preview" or similar
  generic platform-level phrasing satisfies the shape. Emits
  as `<meta property="og:image:alt">`.
- `size = { width: 1200, height: 630 }` — emits as
  `og:image:width` + `og:image:height`.
- `contentType = 'image/png'` — emits as `og:image:type`.
- `default async function Image({ params }: { params: Promise<{ slug: string }> }): Promise<ImageResponse>`
  — receives the route params at request time (per
  [`opengraph-image.md` lines 217-243, 528](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md);
  `params` is a Promise in v16). The default function is the
  per-event surface (resolves slug to content, renders the
  per-event image); `alt` is the platform-level surface (one
  static value across all events).
- `generateStaticParams(): Array<{ slug: string }>` — enumerates
  every registered event slug from `registeredEventSlugs` so the
  build prerenders one image per event. Without this, the route
  is treated as Dynamic (`ƒ`) and rendered on every crawl,
  defeating the static-optimization invariant. Added during
  3.1.2 implementation (not in the original contract); the
  static-optimization bullet below was right about the
  *condition* (no Request-time API calls) but missed that
  file-convention routes inheriting a dynamic segment also need
  their own enumeration.

Behavior contract:

- Awaits `params`, calls `getEventContentBySlug(slug)`. Calls
  `notFound()` from `next/navigation` for unknown slugs so the
  file-convention prerender skips them (matches the page route's
  unknown-slug behavior; the build does not emit an image for
  registered-but-unresolvable slugs).
- Returns
  `new ImageResponse(<EventOgImage content={content} />, { ...size })`.
- Bundle size stays under the Satori 500 KB cap per
  [`image-response.md` line 51](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md).
  No font loading in 3.1.2 keeps this comfortably under the
  ceiling.
- Static generation: no Request-time API calls. The route
  prerenders at `next build` time alongside the page; the build
  log lists the OG image route as prerendered for each
  registered slug.
- Auto-emits `<meta property="og:image">`,
  `<meta property="og:image:width">`,
  `<meta property="og:image:height">`,
  `<meta property="og:image:type">`,
  `<meta property="og:image:alt">` per
  [`opengraph-image.md` lines 36-41, 209-215](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md).
  The image URL composes from `metadataBase` + the route path.

### `apps/site/app/event/[slug]/twitter-image.tsx`

Identical shape to `opengraph-image.tsx`, including the
`generateStaticParams` export that enumerates registered slugs
for build-time prerender. The default function calls the same
`<EventOgImage>` element wrapped in `new ImageResponse(...)`.
Auto-emits `<meta name="twitter:image*">` fields per
[`opengraph-image.md` lines 47-52](/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md).

The two file-convention routes generate the same image bytes twice
at build time — acceptable for the test-event registry's small
size; the duplication is honest and simple. If the registry grows
large enough that double-generation becomes a meaningful build-
time cost, a later plan extracts a memoized helper.

### Page route — `apps/site/app/event/[slug]/page.tsx`

`generateMetadata` adds one new field inside the existing
`openGraph` block: `url: '/event/${slug}'` (relative path resolved
against `metadataBase`). No other change.

The relative-path form is documented at
[`generate-metadata.md` line 396](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md):
"`metadataBase` allows URL-based `metadata` fields defined in the
**current route segment and below** to use a **relative path**
instead of an otherwise required absolute URL."

The page route does **not** add `openGraph.images` or
`twitter.images` (per the cross-cutting invariant above).

### Root layout — `apps/site/app/layout.tsx`

`metadata` export gains `metadataBase`. The single field added:
`metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000')`.

Behavior contract:

- The `URL` constructor accepts a string. The argument is read
  through Next.js' `env` substitution (the var is registered in
  `next.config.ts`'s `env` block per the cross-cutting
  invariant), so at build time the literal string substitutes
  before bundling.
- Local fallback `http://localhost:3000` keeps the build green
  in dev and CI when the env var is unset. Production deploy
  must set the var to apps/web's canonical origin via the
  Vercel apps/site project's Production environment.
- Logical-OR `||` (not `??`) per the cross-cutting invariant:
  empty-string substitution must fall back to the dev URL.

### `next.config.ts` env entry

The existing `env` block extends with one new line:
`NEXT_PUBLIC_SITE_ORIGIN: process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "",`
following the existing Supabase-pair pattern. The empty-string
fallback at this layer is fine because the root-layout `||`
expression catches the empty case (per the cross-cutting
invariant).

The existing inline comment block on the `env` block already
documents the Turbopack substitution-trap rationale; the new
line follows the same pattern without comment duplication.

### `apps/site/.env.example`

Documents `NEXT_PUBLIC_SITE_ORIGIN` alongside the existing
Supabase pair. Short comment names apps/web's hostname as the
canonical origin (not apps/site's), referencing
[`apps/web/vercel.json`](/apps/web/vercel.json) for the proxy
topology.

### `docs/dev.md` "apps/site environment variables"

Existing section gains `NEXT_PUBLIC_SITE_ORIGIN` documented in
the same shape as the existing
`NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` entries: where to
set it locally, where in the Vercel project, why it matters
(canonical origin for Open Graph URL composition).

## Cross-Cutting Invariants Touched

Beyond the per-phase invariants above, the following epic-level
invariants apply:

- **URL contract.** The OG image and Twitter image routes live
  under `/event/:slug/opengraph-image` and
  `/event/:slug/twitter-image`. Both fall under
  [`apps/web/vercel.json`](/apps/web/vercel.json)'s
  `/event/:slug/:path*` rewrite to apps/site (lines 24-26); no
  new proxy rule is needed. The `og:url` and `og:image` meta
  values resolve against apps/web's canonical origin per the
  `metadataBase` decision; users clicking the unfurl land on
  apps/web's hostname, which proxies to apps/site for the actual
  page render. Verified by: reading
  [`apps/web/vercel.json`](/apps/web/vercel.json) lines 20-26.
- **Theme route scoping.** The OG image generator wraps no
  `<ThemeScope>` (image generation is a different render tree;
  Theme tokens are read directly via `getThemeForSlug` and
  applied as inline CSS in the Satori layout). The page route's
  `<ThemeScope>` wrap from 3.1.1 is unchanged. Verified by:
  reading
  [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
  lines 99-103 (the existing wrap).
- **Per-event customization.** Events configure through data and
  theme; the OG image content reads from `EventContent` exactly
  like the page renderer. No per-event code path.
- **Trust boundary.** The OG image generators perform no backend
  write, read no DB, accept no client input beyond the
  framework-provided `params`. No trust-boundary surface.
- **In-place auth.** No auth surface. Image routes are public,
  same as the page route they belong to.
- **Auth integration.** No auth surface; no Supabase client
  construction in the OG image generators or the helper.

## Files to touch — new

> Estimate-shaped, reconciled against what shipped per AGENTS.md
> "Plan-to-PR Completion Gate → Call out estimate deviations and
> update the plan to match what shipped." See the implementing
> PR's `## Estimate Deviations` for rationale on additions below.

- `apps/site/lib/eventOgImage.tsx` — `EventOgImage` React
  component per the contract above.
- `apps/site/app/event/[slug]/opengraph-image.tsx` —
  file-convention OG image route per the contract.
- `apps/site/app/event/[slug]/twitter-image.tsx` —
  file-convention Twitter image route per the contract.
- `apps/site/lib/eventDateFormat.ts` — shared
  `formatHeroDateRange` util consumed by both the page header
  and the OG image so the two surfaces cannot drift on a
  content change. Added during implementation (not in the
  original estimate); the plan-time intent had the formatter
  inlined in `EventOgImage` next to the existing copy in
  `EventHeader.tsx`, but the duplication was deemed structurally
  wrong and the helper extracted to a single source.

## Files to touch — modify

> Estimate-shaped; reconciled against what shipped (see note
> above the "new" list).

- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) — add
  `metadataBase` field to the existing `metadata` export per the
  contract.
- [`apps/site/next.config.ts`](/apps/site/next.config.ts) — add
  `NEXT_PUBLIC_SITE_ORIGIN` to the existing `env` block.
- [`apps/site/.env.example`](/apps/site/.env.example) — document
  `NEXT_PUBLIC_SITE_ORIGIN` alongside the existing Supabase pair.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
  — add `openGraph.url` field to the existing `openGraph` block
  in `generateMetadata`.
- [`apps/site/components/event/EventHeader.tsx`](/apps/site/components/event/EventHeader.tsx)
  — replace the file-private `formatHeroDateRange` helper with
  an import from `apps/site/lib/eventDateFormat.ts`. Originally
  estimated as not-touched (see "Files intentionally not
  touched" below) on the assumption the OG image's date
  formatter would be inlined; surfaced during implementation
  as the right place for the shared helper.
- [`docs/dev.md`](/docs/dev.md) "apps/site environment variables"
  section — document `NEXT_PUBLIC_SITE_ORIGIN`.
- [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
  — flip the Phase Status table's 3.1 row `Status` column from
  `Proposed` to `Landed`; update the row's `PR` column to include
  the 3.1.2 PR number alongside the 3.1.1 reference.
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.

Cross-cutting process artifacts updated in the same PR (not
3.1.2-specific contract changes):
- [`AGENTS.md`](/AGENTS.md) — adds the "Plan content is a mix of
  rules and estimates" rule under Phase Planning Sessions and the
  "Call out estimate deviations" rule under Plan-to-PR Completion
  Gate. Triggered mid-implementation by the same `EventHeader.tsx`
  deviation; landed in this PR rather than a follow-up so the
  rule the plan now cites is in effect at land time.
- [`.github/pull_request_template.md`](/.github/pull_request_template.md)
  — adds the `## Estimate Deviations` section between
  Documentation and UX Review.

## Files intentionally not touched

> Estimate-shaped; reconciled against what shipped. The original
> list included `apps/site/components/event/*` ("no section
> component change"); implementation deviated on
> `EventHeader.tsx` for the shared-helper extraction documented
> above. The remaining entries below were estimated correctly —
> nothing in the merged diff touches them.

- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — `EventContent` shape unchanged. Per the M3 milestone doc
  cross-cutting invariant "Per-event SSR meta from one
  resolver," richer-than-current metadata lives on the type;
  3.1.2 does not surface a new field because the OG image
  renders from existing fields. If Madrona surfaces a need for
  custom OG content (alt text divergent from `meta.title`, a
  per-event background-image override), it lands when a real
  consumer needs it.
- `apps/site/events/harvest-block-party.ts` — no content change.
- Other `apps/site/components/event/*` files (besides
  `EventHeader.tsx`, which was touched per the modify list
  above) — no section component change. The OG image is its
  own React tree; the page renderer is otherwise unchanged.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)'s
  page component (the default export) — only `generateMetadata`
  changes; the route component itself is unchanged.
- `apps/site/public/test-events/harvest-block-party/*` — no
  asset change.
- `apps/site/app/(authenticated)/*` — no auth-route change.
- `apps/web/*` — no apps/web change.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — no edit;
  the existing `/event/:slug/:path*` rewrite covers the new
  image routes.
- [`shared/styles/themes/*`](/shared/styles/themes) — no theme
  change. The OG image reads existing Theme tokens.
- [`docs/architecture.md`](/docs/architecture.md) — owned by 3.3
  per the M3 milestone doc.
- [`README.md`](/README.md) — owned by 3.3.
- pgTAP, Edge Functions, supabase migrations — no SQL or
  function change.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and a feature
   branch (not `main`). Confirm 3.1.1 is fully landed
   (`git log --oneline main` shows
   [PR #139](https://github.com/kcrobinson-1/neighborly-events/pull/139)
   as ancestor of this branch's base — already verified by the
   M3 milestone doc's Phase Status table). Read this plan, then
   the M3 milestone doc
   ([`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)),
   the scoping doc
   ([`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md)),
   and the apps/site Next.js 16 reminder
   ([`apps/site/AGENTS.md`](/apps/site/AGENTS.md)) before
   editing.
2. **Baseline validation.** Run `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`, and the repo's pgTAP runner
   (`npm run test:db` per [`docs/dev.md`](/docs/dev.md)). All
   must pass before any edit. Capture a fresh UI-review snapshot
   of `/event/harvest-block-party` (mobile + desktop) — the
   before pair for the no-visual-regression check on the page
   itself.
3. **Env var wiring.** Edit
   [`apps/site/next.config.ts`](/apps/site/next.config.ts)
   adding the `NEXT_PUBLIC_SITE_ORIGIN` line to the `env`
   block. Edit
   [`apps/site/.env.example`](/apps/site/.env.example) with the
   new var documented. Edit
   [`docs/dev.md`](/docs/dev.md) "apps/site environment
   variables" section. Set the local
   [`apps/site/.env.local`](/apps/site/.env.local) to the
   apps/web local origin the implementer is testing against
   (typically `http://localhost:3000` for `next dev`); not
   committed — `.env.local` is git-ignored. Run `npm run
   build:site` after this commit to confirm the build still
   passes; the var is read but not yet referenced anywhere
   load-bearing, so the build behaves identically to baseline.
4. **`metadataBase` on root layout.** Edit
   [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx)
   adding `metadataBase` to the existing `metadata` export per
   the contract. Use logical-OR `||` for the empty-fallback
   per the cross-cutting invariant. Run `npm run build:site`;
   the build must pass with the new field. No new meta tags
   yet appear in the rendered HTML because no URL-based
   metadata field uses the new base — `metadataBase` itself
   does not emit a meta tag.
5. **`openGraph.url` on page route.** Edit
   [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
   adding the `url` field inside the existing `openGraph`
   block. Run `npm run build:site` and `next start` against
   the build; curl the test event route and confirm
   `<meta property="og:url" content="<absolute URL>" />` is
   present.
6. **`EventOgImage` shared helper.** Author
   `apps/site/lib/eventOgImage.tsx` per the contract.
   Server-Component-style render with no hooks. Use
   `display: flex` exclusively (Satori constraint). Read the
   Theme via `getThemeForSlug(content.themeSlug)`. Vitest
   does not test this helper directly (Server Component
   rendering without jsdom); the build pass plus the OG image
   visual capture are the gates. The implementer may add an
   incidental vitest test if it helps, but the load-bearing
   proof is the rendered PNG.
7. **`opengraph-image.tsx` and `twitter-image.tsx`.** Author
   both file-convention routes per the contract. Each file is
   thin — just the config exports plus a default function that
   resolves content via `getEventContentBySlug`, calls
   `notFound()` for unknown slugs, and returns
   `new ImageResponse(<EventOgImage content={content} />, { ...size })`.
   Run `npm run build:site` and confirm the build log lists
   both new routes as prerendered alongside the page route for
   each registered slug (one entry per slug per route).
8. **Validation re-run.** All baseline commands from step 2
   must still pass. The build log must show
   `/event/[slug]/opengraph-image` and
   `/event/[slug]/twitter-image` in the prerender list with
   one entry per registered slug
   (`/event/harvest-block-party/opengraph-image`,
   `/event/harvest-block-party/twitter-image`).
9. **Server-rendered absolute-URL check (curl falsifier).**
   With `NEXT_PUBLIC_SITE_ORIGIN` set to a production-shaped
   value (e.g. `https://example.test`) for both phases, run
   `next build` to completion in apps/site, then start
   `next start` in the background, wait until the port is
   listening before curling, curl the test event route's raw
   HTML, grep for `og:url`, `og:image`, and `twitter:image`
   meta tags, assert each carries an absolute URL value
   (`https://example.test/...`, not `/...` and not the
   localhost fallback), and kill the server. The wait-until-
   listening step is load-bearing — backgrounding the whole
   build-and-start pipeline and `sleep`-ing instead races the
   build on slower machines and lets curl fire before the
   server is ready, which silently passes the falsifier with
   empty grep output rather than confirming the meta tags.
   The actual shell lands in the implementing PR; this plan
   names the contract, not the script. The grep output
   (showing three lines with absolute URLs) is captured in
   the PR body's Validation section. This is the falsifier
   for the `metadataBase`-actually-applied claim and the
   empty-env fallback regression risk.
10. **OG image visual capture.** Open
    `http://localhost:3000/event/harvest-block-party/opengraph-image`
    in a browser against the same production-built `next start`
    server. Save the PNG to `tmp/ui-review/<timestamp>-3-1-2/`
    per AGENTS.md "Pull Request Screenshot Process." Confirm
    visually:
    - Event name renders legibly
    - Tagline (if present) renders below
    - Date range and location render
    - Theme background color is the Harvest Block Party
      warm-pumpkin pale (visually distinct from Sage Civic)
    - Text contrast is readable against the bg
    - "Neighborly Events" platform attribution is visible
    - No clipped or overlapping content
    - Image dimensions match `size = { width: 1200, height: 630 }`
11. **Slack unfurl capture.** Paste the deploy preview URL
    Vercel attaches to the PR (e.g.,
    `https://neighborly-events-site-<branch>.vercel.app/event/harvest-block-party`)
    into a Slack DM-to-self in a workspace the implementer
    controls. Apply the cache-bust pattern (append
    `?v=<timestamp>`) to ensure Slack does not serve a cached
    image-less preview from prior 3.1.1 iterations. Screenshot
    the unfurl card; upload to a hosting service per AGENTS.md
    "Pull Request Screenshot Process"; paste the URL into the
    PR body's UX Review section. Confirm:
    - Unfurl card shows the OG image
    - Title and description from 3.1.1's metadata are unchanged
    - Site name ("Neighborly Events") shows
    - Card link target is the apps/web canonical origin (proves
      `og:url` resolved correctly against `metadataBase`)
12. **Documentation update.** Walk
    [`AGENTS.md`](/AGENTS.md) "Doc Currency Is a PR Gate"
    triggers:
    - [`docs/dev.md`](/docs/dev.md) — `NEXT_PUBLIC_SITE_ORIGIN`
      added to the "apps/site environment variables" section
      (already covered by execution step 3; verify the edit
      shipped).
    - [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
      — flip the 3.1 Phase Status row from `Proposed` to
      `Landed`; update the `PR` column to include the 3.1.2 PR
      number.
    - [`docs/architecture.md`](/docs/architecture.md) — no
      change. Owned by 3.3.
    - [`README.md`](/README.md) — no change. Owned by 3.3.
    - [`docs/styling.md`](/docs/styling.md) — no change. The
      OG image reads existing Theme tokens; no new themable
      surface.
    - [`docs/open-questions.md`](/docs/open-questions.md) —
      no change. Owned by 3.3.
    - [`docs/backlog.md`](/docs/backlog.md) — no change.
    - [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
      M3 row — stays `Proposed`. The epic's M3 row flips to
      `Landed` only in 3.3's PR.
    - This plan — Status flips from `Proposed` to `Landed` in
      the implementing PR.
    - [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md)
      — no edit. Deletes in batch with the rest of M3's
      scoping docs in 3.3's PR.
    - [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)
      — no edit. Same batch-deletion in 3.3.
13. **Automated code-review feedback loop.** Walk the diff
    from a senior-reviewer stance against the Cross-Cutting
    Invariants above and each Self-Review Audit named below.
    Apply fixes in place; commit review-fix changes
    separately when that clarifies history per
    [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.
14. **Plan-to-PR completion gate.** Walk every Goal,
    Cross-Cutting Invariant, Validation Gate command, and
    Self-Review Audit named in this plan. Confirm each is
    satisfied or explicitly deferred in this plan with
    rationale. Flip Status from `Proposed` to `Landed` in the
    same PR; flip the milestone doc's 3.1 row from `Proposed`
    to `Landed` in the same PR.
15. **Pre-merge operator check: Vercel Production env.**
    Before merging, confirm the apps/site Vercel project's
    Production environment has `NEXT_PUBLIC_SITE_ORIGIN` set
    to apps/web's canonical custom-domain origin (read from
    the Vercel apps/web project's primary alias). The PR body
    names this as a load-bearing pre-merge step; if the env
    var is unset in production at merge time, every unfurl
    URL ships with the localhost fallback.
16. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](/.github/pull_request_template.md).
    Title under 70 characters
    (e.g., "M3 phase 3.1.2: per-event OG image, twitter-image,
    metadataBase").  Validation section lists every command
    actually run plus the curl output from step 9. UX Review:
    include the OG image PNG capture from step 10 plus the
    Slack unfurl capture from step 11. Remaining Risk:
    confirm the Vercel Production env was set per step 15;
    note Slack/iMessage cache may still show stale
    image-less previews for URLs that were unfurled during
    3.1.1's review (cache-bust the URL when re-checking).

## Commit boundaries

Commit slices named upfront. Each commit must independently
typecheck and lint; the build re-runs at boundaries that
introduce metadata-emitting code.

1. **Env var wiring + docs.**
   [`apps/site/next.config.ts`](/apps/site/next.config.ts) `env`
   block extension,
   [`apps/site/.env.example`](/apps/site/.env.example), and
   [`docs/dev.md`](/docs/dev.md) "apps/site environment
   variables" section update. Single commit; no source code
   reads the var yet so the build is unchanged.
2. **`metadataBase` on root layout.**
   [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) gains
   the new field. Single commit; the build still passes
   because `metadataBase` alone emits no meta tag.
3. **`openGraph.url` on page route.**
   [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
   gains one field inside the existing `openGraph` block.
   Single commit. After this commit the rendered HTML carries
   `<meta property="og:url" content="<absolute URL>" />` for
   the test event route — verify with curl.
4. **`EventOgImage` shared helper.**
   `apps/site/lib/eventOgImage.tsx` lands. Single commit; no
   call site exists yet so the helper is dead code at this
   commit, marked by a one-line comment naming commit 5 as
   the consumer (per the 3.1.1 plan's commit-2-3 split
   precedent).
5. **`opengraph-image.tsx` and `twitter-image.tsx`.**
   Both file-convention routes land. Single commit; the
   `EventOgImage` helper from commit 4 becomes live. After
   this commit the build log shows the new prerendered
   routes and the rendered HTML carries the auto-emitted
   `og:image*` and `twitter:image*` meta tags.
6. **Documentation update.** This plan's Status flip plus
   the milestone doc's Phase Status table edit. Single
   commit.
7. **Review-fix commits.** As needed during step 13, kept
   distinct from the substantive implementation commits per
   [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. No new vitest
  cases required for 3.1.2's surface; if the implementer adds
  one for `EventOgImage` rendering, it's incidental coverage.
- `npm run build:web` — pass on baseline; pass on final. 3.1.2
  does not touch apps/web source.
- `npm run build:site` — pass on baseline; pass on final. The
  load-bearing gate. Build log must show
  `/event/[slug]/opengraph-image` and
  `/event/[slug]/twitter-image` in the prerender list with one
  entry per registered slug.
- `npm run test:functions` — pass on baseline; pass on final.
  No edge-function source change.
- pgTAP suite — pass on baseline; pass on final. No SQL change.
- **Server-rendered absolute-URL check** per Execution step 9:
  curl raw HTML for the test event route, grep for `og:url`,
  `og:image`, `twitter:image` meta tags, confirm all three
  values are absolute URLs (start with `https://` or
  `http://`, not `/`). Output captured in the PR body. This
  is the falsifier for the `metadataBase`-actually-applied
  claim and the empty-env fallback regression.
- **OG image visual capture** per Execution step 10. The
  rendered PNG must look visually plausible. Captured in the
  PR body's UX Review section.
- **Slack unfurl capture** per Execution step 11. The
  consumer-end proof. Captured in the PR body's UX Review
  section.
- **Vercel Production env operator check** per Execution
  step 15. Pre-merge confirmation that
  `NEXT_PUBLIC_SITE_ORIGIN` is set in the apps/site Vercel
  project's Production environment. Named in the PR body's
  Remaining Risk section.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) and
matched to this phase's diff surfaces.

### Frontend

- **Readiness-gate truthfulness audit.** The curl-based
  absolute-URL check (Validation Gate step) is the load-bearing
  falsifier for the `metadataBase`-actually-applied claim. The
  PR body captures the curl output, not just a statement that
  it was run. Without captured output, a reviewer cannot
  distinguish "metadataBase resolved correctly" from
  "metadataBase silently fell back to localhost and the meta
  values are wrong."
- **Theme-resolution-via-themeSlug audit.** Walk the OG image
  generator's call to `getThemeForSlug` (inside
  `EventOgImage`) and confirm it passes `content.themeSlug`,
  not the URL slug. Same trap as 3.1.1: a wrong call passes
  the harvest-block-party UI-review unchanged (because
  `themeSlug === slug` for this event) but breaks 3.2 + M4
  silently when divergent. Diff-walk only — no vitest case.
- **Effect cleanup audit.** Vacuously satisfied. The OG image
  generators are pure render functions, no `useEffect`, no
  subscriptions, no async beyond top-level `await params`.

### CI & testing infrastructure

- **CLI / tooling pinning audit.** 3.1.2 introduces zero new
  dependencies. `next/og` ships with `next` 16.2.4 already
  pinned at
  [`apps/site/package.json`](/apps/site/package.json). The
  contract relies on already-shipped deps. If implementation
  surfaces a need for a new package (unlikely; Satori
  built-in fonts cover the test event), it lands pinned per
  AGENTS.md and the PR description names it explicitly.
- **Rename-aware diff classification.** All file-convention
  files are net-new
  (`apps/site/app/event/[slug]/opengraph-image.tsx`,
  `…/twitter-image.tsx`, `apps/site/lib/eventOgImage.tsx`).
  The page route, root layout, `next.config.ts`,
  `.env.example`, and `docs/dev.md` are modifications.
  `git diff --name-status` should show `A` entries for the
  new files and `M` entries for the modifies; no `R` entries.

## Documentation Currency PR Gate

Per [`AGENTS.md`](/AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/dev.md`](/docs/dev.md) — `NEXT_PUBLIC_SITE_ORIGIN`
  documented in the "apps/site environment variables" section.
  This is a 3.1.2 ownership item.
- [`docs/plans/m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
  Phase Status table — Phase 3.1 row's `Status` column flips
  to `Landed`; `PR` column gets the 3.1.2 PR number alongside
  the 3.1.1 reference.
- [`docs/architecture.md`](/docs/architecture.md) — no change.
  Owned by 3.3.
- [`README.md`](/README.md) — no change. Owned by 3.3.
- [`docs/styling.md`](/docs/styling.md) — no change.
- [`docs/open-questions.md`](/docs/open-questions.md) — no
  change. Owned by 3.3.
- [`docs/backlog.md`](/docs/backlog.md) — no change.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  M3 row — stays `Proposed` (epic flip is 3.3's job).
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR.
- [`docs/plans/m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md)
  — no change. 3.1.1 is already `Landed`; 3.1.2 does not
  retroactively edit it.
- [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md)
  and
  [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)
  — no edit. Both delete in batch in 3.3's PR per the
  milestone doc.

## Out Of Scope

Deliberately excluded from this phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **Custom font loading in the OG image.** Resolution: 3.1.2
  ships with Satori's built-in font fallback. If the rendered
  text does not look acceptable on the first build, the
  implementer adds a custom font load and the bundle-size
  budget is tracked in the PR body. The default path is
  "platform-default font is fine for test events."
- **Per-event OG image content overrides on `EventContent`.**
  Resolution: out of 3.1.2 per the cross-cutting invariant
  "The OG image reads `EventContent` only" with no new field.
  If Madrona surfaces a need (custom alt text, background
  image override), that's a separate `EventContent` evolution
  in M4 phase 4.2 or later.
- **OG image generation for the platform landing page (`/`)
  and the platform admin (`/admin`).** Resolution: out of M3
  scope. The M3 milestone doc defines unfurl-validation
  scope at the per-event landing surface; platform routes are
  a separate concern. If a future plan needs platform-route
  OG images, the same file-convention pattern applies one
  level up at the layout's segment.
- **Cross-platform unfurl validation (Slack + X + iMessage +
  LinkedIn + …).** Resolution: 3.1.2 captures Slack only. The
  M3 milestone doc explicitly bounds unfurl-validation to
  "one consumer client" to avoid platform-by-platform
  compatibility scope creep. If a future plan needs to
  cover X or LinkedIn-specific quirks, that's a separate
  bounded effort.
- **Reusable unfurl-validation script.** Resolution: 3.1.2
  uses a manual Slack-debugger capture for the consumer-end
  proof and a curl falsifier for the meta-tag-correctness
  gate. A reusable script that automates Slack's actual
  unfurl behavior would require an OAuth-scoped Slack app
  (out of scope for an MVP-stage repo); the curl falsifier
  alone duplicates without adding value beyond what 3.1.1's
  similar curl gate already covers.
- **Static og:image asset alternative.** Resolution: out of
  3.1.2 per the file-convention strategy decision in the
  scoping doc. Static-asset OG images decouple image content
  from `EventContent`, breaking the
  "EventContent is the single source of truth" invariant.
- **Dynamic OG image route via `apps/site/app/api/og`.**
  Resolution: out of 3.1.2 per the static-optimization
  strategy decision. A dynamic route runs at request time
  with no build-time prerender, which is the wrong shape for
  test events with fixed content known at build time.
- **`metadataBase` set per-route instead of root layout.**
  Resolution: out of 3.1.2 per the Cross-Cutting Invariant
  "metadataBase set once on root layout, nowhere else." A
  per-route `metadataBase` would shift the canonical-origin
  contract and break the single-source-of-truth assumption.
- **Strict-pattern curl assertion (exact-match origin).**
  Resolution: out of 3.1.2. The curl gate asserts URL
  absoluteness only; a strict pattern (`https://<expected-
  origin>/event/...`) would couple the validation script to a
  hardcoded value that drifts on rename. The looser
  absoluteness assertion is stable and catches the real
  regression class (empty-env fallback shipping localhost).
  If a future plan needs strict origin pinning, that's a
  separate hardening effort.
- **`docs/architecture.md` write-up of OG image pipeline.**
  Resolution: M3 phase 3.3 owns the architecture.md update
  describing the rendering pipeline plus the OG image
  pipeline.
- **Post-deploy production smoke for unfurl URLs.** Resolution:
  out of 3.1.2. Production smoke tier runs against the
  deployed origin per
  [`docs/testing-tiers.md`](/docs/testing-tiers.md); 3.1.2's
  gate is pre-merge curl + a Slack unfurl capture against the
  Vercel deploy preview. If a recurring smoke check is
  desirable (catching a future regression where Vercel
  Production env loses the var), that's a separate plan in
  the M3 phase 3.3 surface or post-epic.
- **`apps/web/vercel.json` rewrite changes.** Resolution: not
  needed. The existing `/event/:slug/:path*` rewrite covers
  the new file-convention routes (`/event/:slug/opengraph-image`
  and `/event/:slug/twitter-image`).

## Risk Register

- **Empty-env-var fallback ships to production.** If the
  Vercel apps/site project's Production env does not set
  `NEXT_PUBLIC_SITE_ORIGIN` (operator oversight), the
  `process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000'`
  expression resolves to localhost and every meta URL becomes
  `http://localhost:3000/...`, which breaks unfurls silently.
  Mitigation: the curl falsifier in the validation gate
  catches the empty-env case during local verification; the
  Slack unfurl capture against the Vercel deploy preview
  catches it pre-merge as the consumer-end proof; the PR
  body's pre-merge operator check (Execution step 15) names
  the Vercel env-set as a load-bearing manual step.
- **Turbopack substitution trap regression.** If the new
  `NEXT_PUBLIC_SITE_ORIGIN` lookup is added to source without
  the `next.config.ts` `env` block update, Turbopack rewrites
  `process` to a polyfill before Next.js' substitution sees
  it, and the lookup resolves to empty. Mitigation: the plan's
  Cross-Cutting Invariant names the requirement explicitly;
  the validation procedure's curl falsifier catches the
  regression because the localhost fallback ships.
- **`??` vs. `||` operator regression on the empty-env
  fallback.** If the implementer uses nullish-coalescing
  (`??`) instead of logical-OR (`||`) for the fallback, an
  empty-string substitution does not trigger the fallback
  (because `""` is not nullish), and the `URL` constructor
  receives an empty string and throws at build time.
  Mitigation: the cross-cutting invariant names this trap
  explicitly; the curl falsifier against an empty-env build
  catches it as a build failure.
- **Satori CSS subset surfaces at build.** `next/og`
  internally uses Satori, which supports only flexbox and a
  CSS subset per
  [`image-response.md` lines 49-50](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md).
  Mitigation: `EventOgImage` uses `display: flex`
  exclusively; the implementer reads the Satori subset doc
  before authoring. Build failures on unsupported CSS are
  loud; the risk is confusion about what's supported, not
  silent breakage.
- **ImageResponse bundle exceeds 500 KB.** Per
  [`image-response.md` line 51](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md).
  Without custom font loading, 3.1.2's bundle stays
  comfortably under the limit. Risk: a future plan that adds
  custom fonts pushes over. Mitigation: out of scope for
  3.1.2; the risk transfers to whichever plan adds fonts.
- **Slack/iMessage cache survives the merge.** If the test
  event URL was unfurled into Slack during 3.1.1's review
  (without an OG image), Slack caches the image-less preview
  for hours. Even after 3.1.2 ships, a reviewer pasting the
  same URL sees the cached preview. Mitigation: the
  validation procedure documents the cache-bust pattern
  (append `?v=<timestamp>`); the PR-body unfurl capture uses
  the cache-bust form so reviewer attention does not
  relitigate "the image is missing" against a stale cache.
- **OG image text contrast against Theme bg fails.** The
  `EventOgImage` renders text on top of `theme.bg`. If the
  text color and bg are too similar, the unfurl image is
  hard to read. Mitigation: the implementer eyeballs the
  captured PNG against Harvest Block Party's warm-cream bg +
  dark-brown text. If contrast reads poorly, the helper
  switches to a fixed contrast pair (e.g., dark text on
  light bg, light text on dark bg) and the implementer
  re-captures.
- **`og:image` meta-tag duplication via accidental page-level
  `openGraph.images`.** If the implementer adds
  `openGraph.images` to the page route alongside the
  file-convention emission, the rendered HTML may carry two
  `og:image` meta tags or have one override the other in
  unspecified order. Mitigation: the cross-cutting invariant
  names "no `openGraph.images` or `twitter.images` on the
  page route"; the curl falsifier asserts exactly one
  `og:image` and one `twitter:image` meta tag in the
  rendered HTML. Self-review walks the page route's
  `generateMetadata` against this rule.
- **`metadataBase` set on the page route shadows root
  layout.** If the implementer adds `metadataBase` to the
  page route's `generateMetadata`, the page-level value
  shadows the root layout's per the segment-cascade.
  Mitigation: the cross-cutting invariant names "metadataBase
  set once on root layout, nowhere else"; self-review walks
  the diff against every metadata-emitting site.
- **`next dev` cannot prove static-optimization.** A
  contributor validating only against `next dev` cannot
  prove the build-time-prerendered claim because dev runs
  routes dynamically. Mitigation: the validation procedure
  explicitly names `next build && next start` as the run
  mode; the build log inspection step proves the prerender
  count.
- **Vercel deploy-preview URL host differs from production
  origin.** The Slack unfurl capture against a deploy-preview
  URL will show the deploy-preview host as `og:url`, not the
  production origin. That's correct behavior but may surprise
  a reviewer expecting the production origin. Mitigation: the
  PR body's UX Review section names the deploy-preview
  context explicitly so the reviewer reads the unfurl
  correctly. Post-merge a follow-up Slack capture against
  production confirms the production origin (this is part of
  Execution step 15's pre-merge operator check, not a
  separate post-merge gate).

## Backlog Impact

None. The "Event landing page for /event/:slug" backlog item
closes with M4 phase 4.2 (Madrona content), not with M3
infrastructure phases. The "platform shape exists" goal of M3
needs both 3.1 (rendering pipeline) and 3.2 (multi-theme proof)
to land before 3.3 closes the milestone.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  parent epic; M3 phase paragraphs are pre-milestone-planning
  estimate.
- [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md) —
  M3 milestone doc; cross-phase invariants, decisions, risks.
  3.1.2's PR flips the Phase Status table's 3.1 row to
  `Landed`.
- [`m3-phase-3-1-1-plan.md`](/docs/plans/m3-phase-3-1-1-plan.md)
  — sibling phase plan for 3.1.1 (rendering pipeline + first
  test event + basic SSR meta). Records the og:image / metadataBase
  / openGraph.url / unfurl-validation co-deferral that 3.1.2
  picks up. 3.1.2 inherits 3.1.1's contracts unchanged.
- [`docs/plans/scoping/m3-phase-3-1-2.md`](/docs/plans/scoping/m3-phase-3-1-2.md) —
  scoping doc this plan compresses from. Records the og:image
  strategy, `metadataBase` source, twitter-image, and unfurl
  verification decisions plus the open decisions for plan-
  drafting. Deletes in batch in 3.3's PR alongside other M3
  scoping docs.
- [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md) —
  3.1.1's scoping doc; records the original PR-split decision.
  Same batch-deletion in 3.3.
- [`shared-styles-foundation.md`](/docs/plans/shared-styles-foundation.md)
  — M1 phase 1.5 plan; ThemeScope contract and the
  `getThemeForSlug` resolver the OG image generator consumes
  via the shared helper.
- [`docs/styling.md`](/docs/styling.md) — themable / structural
  classification; `EventOgImage` reads themable tokens
  (`bg`, `text`, `primary`).
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit name source.
- [`apps/site/AGENTS.md`](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder. The plan reads
  `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/opengraph-image.md`,
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/image-response.md`,
  and
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
  before locking framework API names.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions rules,
  Plan-to-PR Completion Gate, Doc Currency PR Gate, "Verified
  by:" annotation rule, "Bans on surface require rendering the
  consequence" rule (which makes the OG image visual capture
  and Slack unfurl capture load-bearing for 3.1.2).
