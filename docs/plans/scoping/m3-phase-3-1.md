# M3 Phase 3.1 — Scoping

## Status

Transient scoping artifact for M3 phase 3.1 ("Rendering pipeline + first
test event + SSR meta") per the M3 milestone doc
([m3-site-rendering.md](/docs/plans/m3-site-rendering.md)) and
[AGENTS.md](/AGENTS.md) "Phase Planning Sessions." This doc plus its
sibling scoping docs delete in batch in M3 phase 3.3's PR per the
milestone doc's "Phase Status" subsection. The durable contract for
3.1 lives in [m3-phase-3-1-plan.md](/docs/plans/m3-phase-3-1-plan.md);
this scoping doc is the input that plan compresses from.

## Phase summary in one paragraph

Replace the apps/site `/event/[slug]` placeholder with a real
data-driven landing page: define an `EventContent` TypeScript shape
that covers everything M4's Madrona will need to author, build a
Server-Component rendering template that consumes any
`EventContent` instance, ship the first descriptive-slug test event
(content module + registered Theme) so the rendering pipeline is
end-to-end provable inside this phase's PR(s), and emit per-event
SSR metadata (title, description, robots, Open Graph base) from a
single `generateMetadata` resolver. Test events ship with a
disclaimer banner and `robots: { index: false, follow: false }`
metadata so they cannot leak into search caches. M3 phase 3.2 will
add the second test event + theme on top of this contract; M4 phase
4.2 will author Madrona content against the same `EventContent`
type without contract changes.

## Decisions made at scoping time

These are the cross-phase decisions the M3 milestone doc explicitly
deferred to 3.1 plan-drafting; resolving them here so the plan can
record them as "Verified by:" code citations rather than open
deliberation.

### `EventContent` type location → `apps/site/lib/eventContent.ts`

The M3 milestone doc names the trade-off: `shared/events/` (extraction
precedent, optionality for an apps/web back-to-landing CTA) vs.
`apps/site/`-internal placement (colocated with consumer; keeps
`shared/events/` DB-only). Reading the actual current shape:

- [shared/events/index.ts](/shared/events/index.ts) exports six
  symbols, all DB-touching:
  `configureSharedEvents`, `readSharedEventsProviders`,
  `listPublishedGameSummaries`, `loadPublishedGameBySlug`, the
  full admin write surface (`saveDraftEvent`, `publishDraftEvent`,
  …), and `createStarterDraftContent` /
  `createDuplicatedDraftContent`. Every one resolves through
  `configureSharedEvents`'s provider seam, which exists *because*
  shared/events/ touches Supabase. `EventContent` modules are
  pure-TypeScript imports with no DB or auth surface, so adding the
  type here introduces a new responsibility class to a layer
  currently dedicated to one.
- The only consumer through M4 is apps/site
  ([apps/site/app/event/[slug]/page.tsx](/apps/site/app/event/%5Bslug%5D/page.tsx)
  is the first; M4 phase 4.2's
  `apps/site/events/madrona.ts` is the second). apps/web has no
  speculated consumer in the epic; the "back-to-landing CTA could
  show the event title" hypothesis is not on any plan.

**Decision.** Type and lookup live at
`apps/site/lib/eventContent.ts`, with content modules under
`apps/site/events/<slug>.ts`. If apps/web ever needs to introspect
`EventContent` (a real, not hypothetical, consumer), promotion to
`shared/events/` is a one-PR move at that point: rename the file,
adjust the imports, no behavior change. Speculative pre-promotion
into `shared/events/` would dilute the layer's DB-only character
for a consumer that does not exist.

### og:image strategy → defer to phase 3.1.2

This phase splits into two PRs (see "PR split decision" below).
3.1.1 ships `generateMetadata` emitting title, description,
`openGraph.{title,description,type,siteName}` (text fields only;
no `openGraph.url`), `twitter.card = 'summary_large_image'`, and
`robots: { index: false, follow: false }` for test events.
og:image, twitter:image, `openGraph.url`, and `metadataBase`
configuration are co-deferred to 3.1.2 because Next.js 16
hard-errors at build on a URL-based metadata field with a relative
value when `metadataBase` is unset (verified by
[`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` line 428](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md):
"Using a relative path in a URL-based `metadata` field without
configuring a `metadataBase` will cause a build error"). The
canonical-origin choice that `metadataBase` needs is the same
source the absolute og:image URL needs, and apps/site sits behind
a Vercel rewrite from the apps/web hostname so neither
`process.env.VERCEL_URL` (apps/site's deployment URL) nor a naive
hardcoded value is obviously right — the choice deserves focused
review attention against og:image rather than getting locked early
on a half-related axis. 3.1.2 also picks up the unfurl-cache quirks
the M3 milestone doc names as a cross-phase risk.

3.1.1 unfurls produce a title-and-description card without an
image and without a canonical-URL link target — consumer clients
fall back to the request URL for the link, which is correct. The
intermediate state is acceptable — title and description carry
the "demo event for platform testing" framing through the Open
Graph description field, so the unfurl is honest about what is
being shared.

### PR split decision → 3.1.1 + 3.1.2

Branch test per AGENTS.md "PR-count predictions need a branch test":
the file inventory below crosses 12+ source files spanning
EventContent type, lookup, ~7 section components, page route,
disclaimer banner, generateMetadata, theme registration, content
module, and tests. Bundling og:image generation (a Next.js 16
file-convention or `ImageResponse` route) into the same PR pulls
social-crawler verification, image-asset bytes (or an OG-image route
runtime), and per-platform image-dimension semantics into the same
review surface as the rendering pipeline. These review on different
axes — the rendering pipeline reviews against the `EventContent`
contract and component composition; og:image reviews against
crawler caches and image generation/asset semantics.

**Split:**

- **Phase 3.1.1.** Rendering pipeline + first test event (content +
  Theme) + ThemeScope wrap + disclaimer banner + basic
  `generateMetadata` (title, description, openGraph
  text-fields, `twitter:card = summary_large_image`,
  `robots: { index: false, follow: false }` for test events).
- **Phase 3.1.2.** og:image strategy decision and implementation
  (file convention vs. ImageResponse route vs. static asset),
  twitter-image, `metadataBase` configuration with its
  canonical-origin source decision, `openGraph.url` (which
  becomes resolvable once `metadataBase` lands), unfurl
  validation against at least one consumer client (Slack or
  iMessage), and cross-crawler cache-bust pattern documented in
  the plan's validation procedure.

The split also keeps each PR's review surface bounded enough to
self-review honestly within the AGENTS.md "Cap" guidance for phase
planning (~90 minutes scope + plan). 3.1.1's plan is what this
session produces; 3.1.2's plan-drafting session runs after 3.1.1
merges, just-in-time per the milestone doc's "Plan-drafting cadence"
rule.

### First test event slug → `harvest-block-party`

Constraints (per the M3 milestone doc's "Test event slugs are
descriptive, not generic" settled-by-default): a season-flavor or
location-flavor name that lands in production unfurl caches as a
plausible demo identity. The slug must not collide with the
existing quiz fixtures
([shared/game-config/sample-games.ts:113-194](/shared/game-config/sample-games.ts))
which use `first-sample`, `sponsor-spotlight`, and
`community-checklist`. `harvest-block-party` is descriptive (clear
neighborhood-event flavor), distinct from the quiz fixtures, and
authentic-feeling enough that a leaked unfurl preview would not
embarrass the platform.

The implementer may swap to an equivalent descriptive slug (e.g.,
`winter-makers-market`, `riverside-jam`) at implementation time
without re-opening the plan; what's binding is the descriptive-not-
generic rule from the milestone doc, not the literal token. The
slug is referenced inline in plan, content module, theme registry,
URL fixtures, and tests; the plan names it as the canonical
identifier so all those sites stay consistent.

### First test event Theme → distinct enough from Sage Civic to be visually obvious

The end-to-end rendering proof depends on a reader being able to
look at `/event/harvest-block-party` and see that it is *not*
Sage Civic-themed (otherwise ThemeScope is invisible inside this
phase's diff). The Theme picks brand bases that contrast clearly
with Sage Civic's `#2c5e4f` deep-forest primary and `#c46f3e`
rust accent. Working values for plan-drafting (final values land
in the plan's contract):

```
bg          autumn warm cream / pumpkin pale
primary     burnt-orange / deep amber (NOT Sage Civic's deep-forest)
accent      maple red or gold (NOT Sage Civic's rust)
text        dark warm brown (vs. Sage Civic's charcoal-green)
border      warm-brown rgba alpha
heroStart   warm cream gradient stop
heroEnd     warmer cream gradient stop
panel/card/control radii — slightly different from Sage Civic's
  16/12/10 to surface that radii flow through the registry, not
  just colors. E.g., 12/8/6.
```

The phase 3.2 second test event picks a *third* visually-distinct
palette so that 3.2's PR proves multi-theme rendering against two
non-platform Themes side by side. The exact palette for 3.2 is
3.2's call, not 3.1's.

### Disclaimer banner placement → top of page, server-rendered, non-dismissible

Top-of-page placement guarantees the banner is visible above any
section on first paint (mobile and desktop), without depending on
scroll. Server-rendered means the banner is in the SSR HTML, so
crawlers and headless validators see it (matching the
server-rendered noindex meta). Non-dismissible because the banner
is a permanent label on test events, not a one-time disclosure;
dismissibility would imply the banner is supposed to be hideable,
which contradicts the test-event invariant. Copy: "Demo event for
platform testing. Not a real public event." (Final copy is
implementer choice but must convey both halves: "this is a test"
and "the people, dates, and content are fictional.")

The banner component lives at
`apps/site/components/event/TestEventDisclaimer.tsx` and is rendered
inside the `EventLandingPage` template gated on
`EventContent.testEvent === true`. Madrona's content module will
omit `testEvent` (or set it to `false`) and the banner won't render.
The banner is **not** a Theme-driven component — its visual is a
neutral platform-status surface (yellow / amber background, dark
text), distinct from the per-event brand colors, so a casual reader
recognizes it as a platform message rather than an event element.
The exact styling lives in `apps/site/app/globals.css` so it
inherits no per-event surface tokens.

## File inventory

### New — apps/site/lib

- `apps/site/lib/eventContent.ts`. Defines the `EventContent` type
  and `getEventContentBySlug(slug: string): EventContent | null`.
  Imports content modules from `apps/site/events/<slug>.ts` via a
  small registry (an explicit slug → module map; not a directory
  scan, because Next.js bundling and tree-shaking work best with
  static imports). Returning `null` lets the route call
  `notFound()` from `next/navigation` for unknown slugs. The
  resolver is synchronous — content modules are static imports.

### New — apps/site/events

- `apps/site/events/<first-slug>.ts`. The first test event content
  module exporting a `EventContent` constant. Content depth
  exercises every `EventContent` field per the M3 milestone doc's
  "Test event content depth" trade-off ("the first test event
  carries enough structure to exercise every `EventContent`
  field"): at least 2 schedule days, 4+ lineup entries with set
  times, 4+ sponsors with logos and links, 4+ FAQ entries, full CTA
  copy, theme slug pointer.

  Sponsor logos for test content are placeholder neutral SVGs
  (committed under `apps/site/public/test-events/<slug>/`) — no
  real third-party logos. The content is fictional but
  realistic-feeling.

### New — apps/site/components/event

The section components. All Server Components by default; one or
two client islands as noted. Naming follows
`Event<Section>.tsx` for grep-ability.

- `apps/site/components/event/EventLandingPage.tsx`. Top-level
  template. Takes one prop (`content: EventContent`), composes the
  sections in order, wraps in a `<main>`. Renders the
  `TestEventDisclaimer` when `content.testEvent` is truthy.
- `apps/site/components/event/EventHeader.tsx`. Hero header —
  event name, tagline, dates, location, primary CTA (into game).
- `apps/site/components/event/EventSchedule.tsx`. Schedule
  rendering. Multi-day events with per-day session lists.
  Server-rendered HTML; no client island.
- `apps/site/components/event/EventLineup.tsx`. Lineup rendering —
  performer names, set times, optional bio paragraphs.
  Server-rendered.
- `apps/site/components/event/EventSponsors.tsx`. Sponsor grid
  with logo + link. Server-rendered (logos are `<img>` or
  `next/image` with explicit dimensions; no Carousel client island
  in 3.1.1 — judged unnecessary against the test-event content
  depth).
- `apps/site/components/event/EventFAQ.tsx`. FAQ rendering. Uses
  HTML `<details>` / `<summary>` for expand/collapse so no
  JavaScript is required for interactivity — Server Component.
  This avoids a client-island for the simplest interactivity case;
  if a future event needs richer FAQ behavior (analytics on open,
  controlled state), a client island gets added then.
- `apps/site/components/event/EventCTA.tsx`. Bottom CTA into the
  game route. Plain `<a href={routes.game(slug)}>` — Server
  Component, no `next/link`. The CTA's destination is owned by
  apps/web behind the Vercel proxy, so the navigation must be a
  full document load, not a client-side navigation that stays in
  apps/site. See "Cross-Cutting Invariants" below.
- `apps/site/components/event/EventFooter.tsx`. Footer with
  platform attribution and link back to the platform landing page.
- `apps/site/components/event/TestEventDisclaimer.tsx`.
  Server-rendered disclaimer banner. Renders only when called.

### New — apps/site/app/event/[slug]

- `apps/site/app/event/[slug]/page.tsx`. **Wholesale rewrite** of
  the existing placeholder page (currently the cookie-boundary
  presence-check from M1 phase 1.3.2). New shape: Server Component
  awaiting `params`, calling `getEventContentBySlug`, returning
  `notFound()` for unknown slugs, rendering
  `<ThemeScope theme={getThemeForSlug(slug)}><EventLandingPage
  content={...} slug={...} /></ThemeScope>`. Exports
  `generateMetadata`. Exports `generateStaticParams` so the test
  event(s) prerender at build time.

  The placeholder's cookie-boundary presence-check is **deleted**.
  Its purpose (verifying the M1 phase 1.3.2 cookie adapter was
  reading correctly across the proxy boundary) was a one-time
  verification gate, not an ongoing diagnostic surface. The
  presence-check pattern is preserved in git history; the docs
  reference (in
  [shared-auth-foundation.md](/docs/plans/shared-auth-foundation.md))
  remains accurate because it points at git history, not the live
  source.

### New — shared/styles/themes

- `shared/styles/themes/<first-slug>.ts`. The first test event
  Theme. Picks brand bases visually distinct from Sage Civic per
  the "First test event Theme" decision above.

### Modified

- `shared/styles/themes/index.ts`. Register the first test event
  Theme: `{ "<first-slug>": harvestBlockPartyTheme }`.
- `apps/site/app/globals.css`. New section-specific CSS — header
  hero, schedule grid, lineup list, sponsor grid, FAQ details
  styling, CTA button, footer, disclaimer banner. All consume
  themable CSS custom properties (`--bg`, `--surface`,
  `--primary`, etc.) so the per-event Theme drives the visual.
  Disclaimer banner intentionally bypasses themable surface
  tokens (uses an inline color recipe) so it reads as platform
  status across every theme.

### New — tests

- `tests/site/event/eventContent.test.ts`. Vitest coverage for
  `getEventContentBySlug`: known slug returns the content,
  unknown slug returns `null`. Server Component rendering itself
  is exercised through `npm run build:site` rather than vitest
  (Server Components do not render in jsdom; Next.js build is the
  authoritative gate).
- `tests/site/event/sectionComponents.test.tsx`. Vitest renders
  the section components against synthetic `EventContent` props
  and asserts presence of key fields (event name in header,
  schedule day labels, sponsor names, FAQ questions, CTA href).
  These are component-level smoke tests proving the sections
  consume the `EventContent` shape correctly. They render outside
  Next.js' Server Component runtime (vitest jsdom), so the
  components' Server-Component-ness is irrelevant — they're plain
  React functions that take props and return JSX.
- `tests/shared/styles/getThemeForSlug.test.ts`. **Extend** the
  existing test file to add a case asserting the first test
  event slug resolves to the registered Theme rather than the
  platform fallback. The existing file's location is verified at
  [tests/shared/styles/getThemeForSlug.test.ts](/tests/shared/styles/getThemeForSlug.test.ts).

  No new test for the registry barrel itself — the registry is a
  data file, not behavior, and the resolver test covers the
  through-line.

The vitest include glob at
[vitest.config.ts:18](/vitest.config.ts) is `tests/**/*.test.ts`
+ `tests/**/*.test.tsx`, so the new `tests/site/event/`
directory is picked up without config change.

### Intentionally not touched

- `shared/events/*` — no extraction of `EventContent` into
  shared/events/ per the location decision above.
- `shared/urls/routes.ts` — `routes.eventLanding(slug)` already
  exists from M1 phase 1.2 (verified at
  [shared/urls/routes.ts:29](/shared/urls/routes.ts) line 29).
  No matcher needed — apps/site's `/event/[slug]/page.tsx` is
  the consumer, not a path-matching dispatcher; Next.js' file
  router resolves the route directly.
- `apps/web/*` — no apps/web change. Phase 3.1 is an apps/site
  addition; cross-app navigation polish is M3 phase 3.3.
- `apps/web/vercel.json` — no edit. The
  `/event/:slug` and `/event/:slug/:path*` rewrites to
  `apps/site` are already in place from M0 phase 0.3 (verified
  at [apps/web/vercel.json](/apps/web/vercel.json) lines 20-26;
  the `/event/:slug/game*` and `/event/:slug/admin*` carve-outs
  on lines 4-17 keep apps/web ownership of those subnamespaces
  and run before the apps/site fall-through).
- `apps/site/app/(authenticated)/*` — no change. Event landing
  is public; the `(authenticated)` group is for `/admin` and
  `/auth/callback`.
- `apps/site/components/SharedClientBootstrap.tsx` — no change.
  Event landing does not need shared client providers because
  the page is server-rendered and the section components have
  no client-side auth dependency. (If FAQ or another section
  becomes a client island later, that island wraps in
  `SharedClientBootstrap` only if it actually consumes
  `shared/auth/`; nothing in the 3.1.1 component set does.)

## Contracts

### `EventContent` type

Madrona-shaped sketch driving the contract. Final field set lands
in the plan; this is the working draft against which the plan
audits Madrona-fit per the M3 milestone doc's "Cross-Phase Risks
→ `EventContent` type underfit for Madrona" mitigation.

```text
EventContent
  slug                 string             URL slug for the event
  themeSlug            string             registry key for getThemeForSlug
  testEvent            boolean (optional) renders disclaimer + noindex when true
  meta:
    title              string             <head> title and og:title
    description        string             <meta description> and og:description
    openGraphType      "event" | "website" og:type (default "website")
  hero:
    name               string             event display name
    tagline            string (optional)
    dates              { start: ISO date, end: ISO date }
    location           string             human-readable venue/area
  schedule:
    days[]:
      date             ISO date           per-day grouping
      label            string (optional)  human label like "Day 1"
      sessions[]:
        time           string             local time string ("3:00 PM")
        title          string
        description    string (optional)
        performerSlug  string (optional)  cross-references lineup[].slug
  lineup[]:
    slug               string             internal id for cross-reference
    name               string             performer/act display name
    bio                string (optional)
    setTimes[]:
      day              ISO date           cross-references schedule.days[].date
      time             string             local time
  sponsors[]:
    name               string
    logoSrc            string             path under /public/...
    logoAlt            string             accessibility text
    href               string             sponsor link (https://...)
    tier               string (optional)  "presenting" | "supporting" | etc.
  faq[]:
    question           string
    answer             string (markdown-ish plain text; no rich rendering in 3.1)
  cta:
    label              string             CTA button text ("Play the game")
    sublabel           string (optional)  smaller copy under the button
  footer:
    attribution        string (optional)  optional per-event override; defaults
                                          to platform attribution
```

Madrona-fit walk per the milestone doc invariant:

- Multi-day schedule with overlapping sets: the `schedule.days[].sessions[]`
  structure plus `lineup[].setTimes[]` lets a single performer have
  two sets across two days without duplicating performer metadata.
  If Madrona has *overlapping* sets within a single day (two
  stages playing at the same time), the milestone doc named that
  as a possible underfit case — that's "stage" structure not
  modeled in 3.1's draft. Resolution path: if M4 surfaces a
  multi-stage stage, 3.1's `sessions[]` evolves to add an
  optional `stage: string` field; backwards-shape-compatible
  because every existing session has no stage. This is the
  intended evolution path, not a 3.1 gap.
- Sponsor tiering: `tier` field is optional so test events can
  omit it; Madrona can populate `"presenting"`, `"supporting"`,
  etc. The rendering layer in `EventSponsors` groups by tier when
  present and renders flat when absent — that's a 3.1
  implementation detail to confirm at plan-drafting against the
  test event content, since the test event will not exercise
  tiering unless content depth chooses to.
- FAQ rich content: 3.1 ships plain-text answers. If Madrona
  needs rich content (links, lists, bold), `answer` evolves to a
  union of `string | RichContent` with `RichContent` being a
  small set of inline marks. 3.1 does not pre-build that union;
  it's only added when there's a real consumer.
- Image alt text: each `sponsors[].logoAlt` is required (not
  optional) because crawler accessibility must work; an
  optional-with-default path would silently ship missing alts
  on a content-author oversight.
- Date and time string typing: `start` / `end` / `day` are ISO
  date strings ("2026-08-15"), times are human strings
  ("3:00 PM"). 3.1 does not introduce a Date object or a
  parser; the rendering layer treats them as opaque strings.
  Locale and timezone are platform-implicit (event-local), per
  the M3 milestone doc's silent-by-default scope. If M4 surfaces
  a multi-timezone event (unlikely for a Madrona summer event
  but possible), evolution path is to add a `timezone` field
  alongside `dates`; backwards-shape-compatible.

### `getEventContentBySlug(slug: string): EventContent | null`

Synchronous function. Resolves slug against an explicit slug → module
map. Returns `null` for unknown slugs. The map is a literal:

```text
const eventContentBySlug: Record<string, EventContent> = {
  "<first-slug>": harvestBlockPartyContent,
};
```

3.2 adds the second event by extending the map; M4 phase 4.2 adds
`madrona`. Static imports keep tree-shaking and bundle analysis
predictable; a directory scan would defeat both.

### Page route — `apps/site/app/event/[slug]/page.tsx`

```text
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return Object.keys(eventContentBySlug).map(slug => ({ slug }));
}

export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const content = getEventContentBySlug(slug);
  if (!content) return {};
  return {
    title: content.meta.title,
    description: content.meta.description,
    openGraph: {
      title: content.meta.title,
      description: content.meta.description,
      type: content.meta.openGraphType ?? "website",
      siteName: "Neighborly Events",
      // openGraph.url omitted in 3.1.1 — adding it requires
      // metadataBase (Next.js 16 build-errors otherwise; see
      // line 428 of node_modules/next's generate-metadata
      // docs). Lands in 3.1.2 alongside og:image.
    },
    twitter: { card: "summary_large_image" },
    robots: content.testEvent
      ? { index: false, follow: false }
      : undefined,
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const content = getEventContentBySlug(slug);
  if (!content) notFound();
  return (
    <ThemeScope theme={getThemeForSlug(slug)}>
      <EventLandingPage content={content} slug={slug} />
    </ThemeScope>
  );
}
```

Behavior contract:

- Unknown slug → `notFound()` → Next.js' default 404 (or a
  per-segment `not-found.tsx` if 3.1 ships one — see "Open
  decisions" below). The 404 renders against apps/site's `:root`
  Sage Civic, outside `<ThemeScope>`.
- `generateStaticParams` returns the registered test event slugs,
  so they prerender at `next build` time. Other slugs are not
  prerendered; they 404 at request time. Madrona will join the
  prerender set when its content module lands in M4 phase 4.2.
- Robots metadata uses Next.js 16's `Metadata.robots` shape with
  `{ index: false, follow: false }` for test events. This emits
  `<meta name="robots" content="noindex, nofollow">` server-side
  — verified by the Next.js docs at
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` lines 551-579](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md).
  Critically, this is server-rendered and present in the SSR
  HTML — crawlers that don't execute JavaScript still see it,
  satisfying the M3 milestone doc's "noindex meta is server-
  rendered, not client-rendered after hydration" invariant.

### `EventLandingPage({ content, slug }): ReactNode`

Top-level template. Composes:

1. `<TestEventDisclaimer />` if `content.testEvent`
2. `<EventHeader content={content} slug={slug} />`
3. `<EventSchedule schedule={content.schedule} />`
4. `<EventLineup lineup={content.lineup} schedule={content.schedule} />`
5. `<EventSponsors sponsors={content.sponsors} />`
6. `<EventFAQ faq={content.faq} />`
7. `<EventCTA cta={content.cta} slug={slug} />`
8. `<EventFooter footer={content.footer} />`

Section visibility: any section whose corresponding content array
is empty is omitted entirely (no empty section heading). 3.1 does
not introduce a section-reordering mechanism — section order is
fixed by the template. M4's Madrona either matches this section
order or 4.2's plan justifies a per-event override.

### `<a href>` for cross-app CTA

`EventCTA` renders a plain `<a href={routes.game(slug)}>...</a>`,
not `<Link>` from `next/link`. The destination is owned by
apps/web behind a Vercel proxy
([apps/web/vercel.json](/apps/web/vercel.json) lines 4-7
reserves `/event/:slug/game` and `/event/:slug/game/:path*` for
apps/web). Next.js' `<Link>` would emit an `<a>` plus client-side
soft-navigation behavior; for cross-origin-via-proxy destinations
the soft path can race or stay inside apps/site. A plain `<a href>`
is unconditional hard navigation — the browser submits a full
document load, the Vercel rewrite layer fires, and apps/web
receives the request. This matches the M3 milestone doc's
cross-app CTA invariant ("hard navigation from site to web event
routes ... `window.location.assign()` or framework-equivalent
hard navigation that exits the SPA").

For Server Components, plain `<a>` is the framework-equivalent
hard navigation; `window.location.assign()` is the client-component
form (used in
[apps/site/app/(authenticated)/admin/page.tsx:540](/apps/site/app/(authenticated)/admin/page.tsx)
where the surrounding component is a client `"use client"`
component and a button click handler triggers the navigation).
`EventCTA` is a Server Component, so plain `<a>` is the natural
form.

### `<ThemeScope>` wrap location → page route, not layout

The wrap lives in `apps/site/app/event/[slug]/page.tsx` rather
than a `apps/site/app/event/[slug]/layout.tsx` because:

- The wrap depends on the `params.slug` which is most naturally
  available in the page component.
- A layout-level wrap would also need to await `params`, and
  Next.js 16 layouts and pages both support async `params`, but
  putting it in the page keeps the wrap colocated with the
  rendering it themes.
- No sibling routes under `/event/[slug]/` exist in apps/site
  (the operator + admin routes are owned by apps/web; subroutes
  like `/event/[slug]/sponsors` are not on any plan), so a
  layout's "wrap shared across siblings" benefit is not load-bearing.

The wrap is centralized in this single file rather than per-section.
The M2 phase 2.2 invariant (apps/web ThemeScope wrapping
centralized in `App.tsx`'s match branch) translates to apps/site
as: each per-event route's ThemeScope wrapping happens once at
the route component, not per-section. Section components do not
re-wrap.

## Cross-Cutting Invariants

These thread multiple files in this phase and break silently when
one site drifts. Self-review walks each one against every changed
file, not only the file that first triggered the rule.

- **`EventContent` is the single source of truth for per-event
  visible data.** Every section component takes its data from
  `EventContent` (passed down via props), not from per-section
  globals or per-section data files. 3.2's second event and M4's
  Madrona consume the same path; no section component grows a
  per-event override mechanism.
- **Server-side noindex for test events.** `robots: { index:
  false, follow: false }` ships through `generateMetadata`,
  which Next.js renders into the SSR HTML before any
  hydration. Crawlers that don't execute JavaScript still see
  it. A client-side `<meta>` injection (e.g., a `useEffect` that
  appends to `document.head`) would silently regress this
  invariant; no client-side meta-injection patterns ship in this
  phase.
- **Hard navigation on every cross-app CTA.** Every CTA, link, or
  button whose destination is owned by apps/web uses plain `<a>`
  in Server Components or `window.location.assign()` in client
  components — never `<Link>`, `useRouter().push`, or
  `history.pushState`. The destinations from `apps/site` event
  landing into `apps/web`'s game route are the only such
  destinations in 3.1; 3.3 documents the full pattern in
  architecture.md.
- **ThemeScope wraps the whole rendered tree exactly once per
  route.** The wrap is in
  `apps/site/app/event/[slug]/page.tsx`'s render output. Section
  components do not re-wrap. The 404 path (unknown slug) does
  not wrap (renders against platform `:root`). The disclaimer
  banner renders inside the wrap so it inherits the per-event
  Theme tokens — *but* its own rule set in `globals.css` opts
  out of the brand surface to read as a platform-status banner
  across every theme.
- **No per-event-coded section components.** Section components
  are content-shape-driven (every component takes
  `EventContent` field props), not slug-driven. A
  `if (slug === "harvest-block-party") render X` pattern is
  banned; if Madrona needs a section the test event doesn't,
  evolve `EventContent` once and let both events render the
  same component shape.

## Validation surface

What `npm run build:site` and `npm run lint` exercise pre-merge,
and what they don't.

- **`npm run lint`** — runs ESLint over `apps/web`, `shared`,
  `supabase`, `scripts`, `tests`, then runs apps/site's lint via
  the workspace script. Verified at
  [package.json:17](/package.json). The new
  `apps/site/components/event/*` and `apps/site/lib/eventContent.ts`
  files are covered by the `npm --workspace @neighborly/site run
  lint` half. The new `tests/site/event/*` files are covered by
  the `apps/web ... tests` half.
- **`npm run build:site`** — Next.js production build. This is
  the load-bearing gate for Server Components: any TypeScript
  error, missing `'use client'` annotation, illegal hook usage in
  a Server Component, or invalid `Metadata` shape surfaces here.
  `generateStaticParams` runs at build time, so the test event
  pre-renders and a content-module shape mismatch (e.g., a typo
  in `harvestBlockPartyContent` that omits `meta.title`) fails
  the build.
- **`npm test`** (vitest) — covers `getEventContentBySlug` and
  the section components rendering against synthetic
  `EventContent` props. Does **not** cover the page route's
  Server Component (Server Components don't render in jsdom; the
  build pass is the gate there).
- **`npm run build:web`** — included for the no-regression check.
  Phase 3.1.1 does not touch apps/web source, so this should
  pass identically to baseline.
- **What none of these cover.** The cross-app proxy boundary
  (`/event/<slug>` → apps/site, `/event/<slug>/game` → apps/web)
  is exercised by `vercel dev` against a production-built
  apps/site, per the M2 phase 2.3 reality-check trap recorded in
  AGENTS.md. The plan should name a manual cross-app capture as
  the load-bearing proof that the CTA navigation works end-to-end
  in the production-shaped local environment, not assume
  `npm run dev:site` covers it.

  Specifically: dev server (`next dev`) self-serves
  `/_next/*` and the route directly, so a missing or broken
  proxy rule won't surface. The reality-check is `next build &&
  next start` at apps/site + `vercel dev` at apps/web rewrites
  pointed at production-built apps/site.
- **Unfurl preview.** Out of scope for 3.1.1 (deferred to 3.1.2);
  the title/description preview will work in 3.1.1 but the og:image
  will not.

## Risks

Phase-level risks; cross-phase risks live in the M3 milestone
doc.

- **`EventContent` underfit surfaces only at M4 plan time.** If
  a Madrona-shape gap (multi-stage, sponsor tiering edge case,
  rich-FAQ, multi-timezone) goes unnoticed in 3.1.1's plan
  review and only surfaces when M4 phase 4.2 plan-drafting
  starts, the type evolves and 3.1.1 + 3.1.2 + 3.2 modules
  update for the new shape. Mitigation: 3.1.1's plan includes
  a Madrona-fit walk against the M4 phase 4.2 description in
  the parent epic, not deferred to plan review. Anyone reviewing
  the plan can falsify the fit by naming a Madrona content
  field the type can't carry.
- **First test event Theme too close to Sage Civic.** If the
  Theme's brand bases are too similar to Sage Civic, a reader
  cannot visually verify ThemeScope is doing anything. The
  whole "rendering pipeline + first test event" bundling
  argument depends on the visual proof being clear. Mitigation:
  the plan picks brand bases with named visual contrast (warm
  autumn against cool sage) and the implementer captures a
  ThemeScope-on / ThemeScope-off comparison if the visual
  difference is subtle. UI-review captures (mobile + desktop)
  are the load-bearing verification.
- **`<details>` / `<summary>` styling drift across browsers.** FAQ
  uses native `<details>` for keyboard accessibility and zero-JS
  expand/collapse. Default styling differs across browsers
  (marker shape, focus ring, expand animation). Mitigation:
  globals.css normalizes the marker, focus, and content layout
  enough to read intentional rather than browser-default. The
  alternative (custom client-island accordion) ships more JS
  and risks accessibility drift; this is the right trade for
  the FAQ surface.
- **Static asset bloat from sponsor logos.** Test events ship
  placeholder neutral logos as committed SVGs. If those assets
  grow large, the apps/site bundle and deploy size grow.
  Mitigation: SVG with text-only glyphs sized under ~2 KB each;
  the test event has 4-6 sponsor logos so total asset
  contribution is well under 20 KB committed.
- **Server Component → client island scope creep during
  implementation.** A reviewer or implementer might be tempted
  to convert the FAQ or sponsor grid into a client island for
  smoother interactivity. Mitigation: the plan names the
  Server-Component-by-default invariant explicitly. Any client
  island added during implementation must satisfy a "scoped
  client island inside the server-rendered page, not by
  hoisting the route to a fully-client component" check from
  the M3 milestone invariant.
- **Plan-time decision of og:image strategy leaks back into
  3.1.1.** If 3.1.2's plan-drafting surfaces a constraint that
  retroactively requires a 3.1.1 change (e.g., the og:image
  route depends on `EventContent.meta` carrying an additional
  field that 3.1.1 didn't ship), 3.1.2's plan-drafting either
  stops and asks for a 3.1.3 (or post-3.1.1 follow-up) plan,
  or 3.1.1 is updated and re-merged. Mitigation: 3.1.1's
  `EventContent.meta` includes only the fields the basic Open
  Graph metadata needs (title, description, type); og-image-
  related fields land in 3.1.2 if needed. The deferral is
  explicit and the surface area is bounded.
- **Disclaimer banner contrast against the brand background.**
  The banner's "platform status" styling needs to read clearly
  against the per-event Theme's `--bg`. If the Theme picks a
  warm-yellow background and the banner picks warm-yellow
  status, contrast fails. Mitigation: the banner's color
  recipe is fixed (yellow-amber background, dark text) and the
  Theme picks a non-yellow bg. The implementer captures a
  banner-on-Theme UI review for the first test event.

## Open decisions to make at plan-drafting

These are open questions the plan should resolve, not the
scoping doc. Listing them so the plan-drafter doesn't miss any.

- **Section component layout primitives.** Whether sections use
  CSS Grid, Flexbox, or a combination. Today's
  [apps/site/app/globals.css](/apps/site/app/globals.css) uses
  Grid for the landing-shell. Decision belongs to plan time
  against the actual section content depth.
- **Whether to ship a per-segment `not-found.tsx`.** Next.js 16
  supports `apps/site/app/event/[slug]/not-found.tsx` for a
  segment-scoped 404 UI; the alternative is the global 404. The
  segment-scoped 404 could be themed (using the platform Sage
  Civic since no slug context exists) and on-brand, but adds
  a file. Decision belongs to plan time against whether the
  default Next.js 404 is acceptable for a noindex'd test event.
- **Test event asset path convention.** Whether sponsor logos
  go under `apps/site/public/test-events/<slug>/` or
  `apps/site/public/events/<slug>/`. The test-events
  segregation makes the noindex/test posture clearer and lets
  Madrona's M4 assets land at `events/madrona/` with no
  collision. Decision belongs to plan time.
- **First test event Theme exact values.** Working-draft palette
  is sketched above; the plan picks final brand-base hex values
  and runs them through the Sage Civic contrast walk before
  publishing.
- **Whether `EventContent.cta.label` defaults or is required.**
  Required is the safer call (no fallback that silently ships a
  generic CTA), but the test event will need to pick a label
  (e.g., "Play the Harvest Block Party game"). Decision belongs
  to plan time.

## Plan structure handoff

The plan at `docs/plans/m3-phase-3-1-plan.md` should match the
structure of recent landed plans (M2 phase 2.2 plan as the
pattern reference) with sections in this order:

1. Status (with PR-split note: 3.1.1 is the implementation
   surface this plan covers; 3.1.2's plan drafts after 3.1.1
   merges)
2. Plain-language Context preamble (per AGENTS.md "Plan opens
   with a plain-language context preamble" — name what this
   phase is, why now, what surfaces it touches at the
   conceptual level before any implementation specifics)
3. Goal
4. Cross-Cutting Invariants
5. Naming
6. Contracts (with `EventContent` final shape, lookup
   signature, page route exports, section component prop
   contracts)
7. Cross-Cutting Invariants Touched (epic-level)
8. Files to touch — new
9. Files to touch — modify
10. Files intentionally not touched
11. Execution steps (pre-edit gate, baseline, edits in commit
    boundaries below, validation re-run, UI review, doc
    update, automated review feedback, plan-to-PR completion
    gate, PR preparation)
12. Commit boundaries
13. Validation Gate
14. Self-Review Audits (drawn from
    [docs/self-review-catalog.md](/docs/self-review-catalog.md);
    candidates for this phase: Effect cleanup audit (only
    if a client island ships, which the scoping doesn't
    expect; conditional), Readiness-gate truthfulness audit
    (the noindex-via-`generateMetadata` claim must be
    verified by curling raw HTML, not browser DOM), CLI /
    tooling pinning audit (any new dependency introduced —
    e.g., if the `next/og` `ImageResponse` is pulled forward,
    or if a markdown renderer ships for FAQ — pinned
    explicitly; 3.1.1 expects no new deps), Rename-aware
    diff classification (the page.tsx wholesale rewrite
    deletes the placeholder presence-check; reviewer attention
    should land on the new content, not on the move noise))
15. Documentation Currency PR Gate (the M3 milestone doc names
    [docs/architecture.md](/docs/architecture.md),
    [README.md](/README.md), and
    [docs/dev.md](/docs/dev.md) as 3.3-owned; 3.1.1 does not
    own milestone-level doc updates but does flip its plan's
    Status; the milestone doc's row for 3.1 updates from
    `Proposed` to `Landed` in 3.1.1's PR or in 3.1.2's PR
    depending on phase split)
16. Out Of Scope
17. Risk Register
18. Backlog Impact (none expected for 3.1.1)
19. Related Docs

## Reality-check inputs the plan must verify

The plan's load-bearing technical claims need "Verified by:" cites
to actual code or generated output, per AGENTS.md "'Verified by:'
annotations on technical claims." The candidates the plan should
hit:

- The `Metadata.robots: { index: false, follow: false }` shape
  emits `<meta name="robots" content="noindex, nofollow">`
  server-side — verify by reading
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` lines 551-579](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)
  and by curling `next start`'s raw HTML for the test event
  route during validation.
- `routes.eventLanding(slug)` already exists in
  [shared/urls/routes.ts:29](/shared/urls/routes.ts) — verify
  by reading the file. (No matcher needed; Next.js' file router
  handles `/event/[slug]` resolution.)
- The Vercel rewrite for `/event/:slug` and `/event/:slug/:path*`
  routes to apps/site — verify by reading
  [apps/web/vercel.json](/apps/web/vercel.json) lines 20-26 with
  the `/event/:slug/game*` and `/event/:slug/admin*` carve-outs
  on lines 4-17 winning earlier in evaluation order.
- `getThemeForSlug` returns the registered Theme for a registry
  hit — verify by reading
  [shared/styles/getThemeForSlug.ts](/shared/styles/getThemeForSlug.ts).
  The registry merge from 3.1.1 picks up the new Theme
  automatically.
- `<ThemeScope>` works as a Server Component (no `'use client'`,
  no effects) — verify by reading
  [shared/styles/ThemeScope.tsx](/shared/styles/ThemeScope.tsx).
- The vitest include glob covers `tests/site/` — verify by
  reading [vitest.config.ts:18](/vitest.config.ts) (`include:
  ["tests/**/*.test.ts", "tests/**/*.test.tsx"]`).
- Plain `<a href>` is hard navigation in Next.js Server Components
  (no client-side navigation hijacking from `<Link>` since `<a>`
  is not `<Link>`) — verify by the Next.js documented behavior of
  `next/link` (`<Link>` opts in to soft navigation, plain `<a>`
  does not).
- The placeholder page's cookie-boundary presence-check
  references the M1 phase 1.3.2 plan — verify by reading the
  current
  [apps/site/app/event/[slug]/page.tsx](/apps/site/app/event/%5Bslug%5D/page.tsx).
  The doc reference at the bottom of the placeholder will be
  removed in the rewrite; the
  [shared-auth-foundation.md](/docs/plans/shared-auth-foundation.md)
  doc's verification evidence stands on git history, not the
  live source.

## Related Docs

- [m3-site-rendering.md](/docs/plans/m3-site-rendering.md) — M3
  milestone doc; cross-phase invariants, decisions, risks.
- [event-platform-epic.md](/docs/plans/event-platform-epic.md) —
  parent epic; M3 phase paragraph (pre-milestone-planning
  estimate) at lines 712-779.
- [shared-styles-foundation.md](/docs/plans/shared-styles-foundation.md)
  — M1 phase 1.5 plan; ThemeScope contract and the apps/site
  Sage Civic root layout the per-event ThemeScope wrap layers
  on top of.
- [docs/styling.md](/docs/styling.md) — themable / structural
  classification; "Procedure For Adding A New Theme" the first
  test event Theme follows.
- [docs/self-review-catalog.md](/docs/self-review-catalog.md) —
  audit name source for the plan's Self-Review Audits section.
- [apps/site/AGENTS.md](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder; the plan reads
  `node_modules/next/dist/docs/` before locking framework API
  names.
- [AGENTS.md](/AGENTS.md) — Phase Planning Sessions rules,
  Plan-to-PR Completion Gate, "Verified by:" annotation rule.
