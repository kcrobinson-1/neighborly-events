# M3 Phase 3.1.1 — Rendering Pipeline + First Test Event + Basic SSR Meta

## Status

Landed.

This plan covers M3 phase 3.1's first PR (3.1.1) under the split
recorded in
[`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)
"PR split decision": rendering pipeline, first test event content +
Theme, ThemeScope wrap on the route, disclaimer banner, and basic
`generateMetadata` (title, description, Open Graph text fields,
`twitter:card`, server-rendered `robots: noindex` for test events).
og:image generation, twitter-image, `metadataBase` configuration,
`openGraph.url`, and unfurl-cache verification all land in 3.1.2 in
a separate plan that drafts after 3.1.1 merges. The `metadataBase`
choice is co-deferred with og:image because both decisions hinge on
the same canonical-origin source of truth and Next.js 16 hard-errors
at build on a relative URL-valued metadata field when `metadataBase`
is unset.

The 3.1 row in the M3 milestone doc's Phase Status table flips from
`Proposed` to `Landed` in 3.1.2's PR (the phase as a whole is not
"done" until both 3.1.1 and 3.1.2 ship); 3.1.1's PR updates the row
to point its `Plan` column at this plan and its `PR` column at the
3.1.1 PR number, but the `Status` column stays `Proposed` because
the phase as a whole is mid-flight. No commit SHAs are recorded in
the row per [`AGENTS.md`](/AGENTS.md) "Plan-to-PR Completion Gate"
(`git log` and `git blame` are authoritative for navigating from
plan to history).

**Parent epic:** [`event-platform-epic.md`](/docs/plans/event-platform-epic.md),
Milestone M3, Phase 3.1.
**Milestone doc:** [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md).
**Sibling phases:** 3.2 (second test event + distinct theme) —
Proposed; 3.3 (cross-app navigation verification + M3 closure) —
Proposed. The epic's M3 row stays `Proposed` until 3.3 lands.

**Hard dependency on M2 already-merged.** Per the M3 milestone doc
"Sequencing" subsection, M2's admin restructuring is the upstream
dependency: 3.1.1 builds on the apps/site Next.js 16 app already
shipped (M2 phase 2.4.1 added the `(authenticated)/admin/page.tsx`
shape; M2 phase 2.4.3 finalized routing) and on the
[`<ThemeScope>`](/shared/styles/ThemeScope.tsx) primitive shipped
in M1 phase 1.5.2. Both are in `main`; 3.1.1's PR is gated on neither
new sibling.

**Scoping inputs.** This plan compresses from
[`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md),
which records the full file inventory walk, the EventContent
location decision, the og:image deferral rationale, the PR split
deliberation, and the slug + Theme decisions. The scoping doc deletes
in batch in M3 phase 3.3's PR per the milestone doc.

## Context

This phase ships the *rendering pipeline* for the event platform's
first real public surface. Until now, apps/site has been a deployable
shell: a Sage-Civic-themed root layout, a placeholder cookie-boundary
presence-check at `/event/[slug]`, a platform-admin page at `/admin`,
and an auth callback. None of those surfaces render event content.
3.1.1 turns `/event/[slug]` into a data-driven landing page that
renders any event from a TypeScript content module under
`apps/site/events/` through a single rendering template. The first
test event — a fictional "Harvest Block Party" — ships in the same
PR as the pipeline, with its own per-event Theme registered against
the shared theme registry, so a reader can visit
`/event/harvest-block-party` and see the rendering pipeline working
end to end against a non-Sage-Civic palette.

This is being done now because the platform shape has been
clearable-of-MVP for two milestones; M3 is the milestone where the
public landing surface stops being conceptual and starts existing.
The Madrona launch in M4 depends on it: M4 phase 4.2 authors
Madrona's content as a TypeScript module against the *same*
`EventContent` type defined here, against the *same* rendering
template defined here, against the *same* theme-registry pattern
exercised here. Without a frozen contract from 3.1, M4's content
authoring would relitigate type and template decisions under launch
deadline pressure.

The surfaces this phase touches at the conceptual level: the public
event landing page (at `/event/<slug>` for any slug with a registered
content module), the per-event Theme registry (one new entry), the
shared `<ThemeScope>` primitive (first apps/site consumer), and a
small set of vitest tests covering the new lookup + section
component contracts. No DB changes, no auth changes, no apps/web
changes, no URL contract changes.

## Goal

Land an apps/site rendering pipeline at `/event/[slug]` that
renders any event from a TypeScript content module via a single
template, prove it end-to-end with the first test event
(`harvest-block-party`) and its registered Theme, and emit
per-event SSR metadata (title, description, Open Graph text
fields, `twitter:card`, `robots: noindex` for test events) from a
single `generateMetadata` resolver. The `EventContent` type defined
in this phase is the binding contract that M3 phase 3.2 and M4
phase 4.2 consume without contract changes.

The phase is a pure addition to apps/site. The placeholder
cookie-boundary presence-check at
[`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
is replaced wholesale; its purpose (one-time M1 phase 1.3.2
verification) is satisfied and recorded in
[`shared-auth-foundation.md`](/docs/plans/shared-auth-foundation.md)
"Verification Evidence."

## Cross-Cutting Invariants

These rules thread every diff line in the phase. Self-review walks
each one against every changed file, not just the file that first
triggered the rule.

- **`EventContent` is the single source of truth for per-event
  visible data.** Every section component takes its data from
  `EventContent` props (passed down from the page). No section
  component reads a per-event globals file, a slug-keyed lookup
  inside its own body, or a per-section content module. 3.2's
  second event and M4's Madrona consume the same path; if a
  section needs new data, the data lives on `EventContent`, not
  on a side channel.
- **Server-side noindex for test events.** `robots: { index:
  false, follow: false }` ships through `generateMetadata`,
  which Next.js 16 renders into the SSR HTML before any
  hydration. A client-side `<meta>` injection (e.g., a
  `useEffect` that appends to `document.head`) silently regresses
  this invariant; no client-side meta-injection patterns ship in
  this phase. Crawlers that don't execute JavaScript still see
  the noindex.
- **Hard navigation on every cross-app CTA.** Every link or
  button whose destination is owned by apps/web uses plain `<a>`
  (Server Components) or `window.location.assign()` (client
  components) — never `<Link>` from `next/link`,
  `useRouter().push`, or `history.pushState`. The only such
  destination this phase introduces is the
  `/event/<slug>/game` CTA from `EventCTA`.
- **ThemeScope wraps the whole rendered tree exactly once per
  route.** The wrap lives in
  [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)'s
  render output. Section components never re-wrap. The
  `notFound()` 404 path renders outside `<ThemeScope>` against
  the platform Sage Civic `:root` defaults — that is intentional
  and parallels the M2 phase 2.2 invariant for in-place themed
  shells (the 404 has no slug to resolve a Theme against). The
  disclaimer banner renders *inside* the wrap so its CSS rule
  set can opt out of brand-surface tokens explicitly to read as
  a platform-status banner.
- **No per-event-coded section components.** Section components
  are content-shape-driven, not slug-driven. A
  `if (slug === "harvest-block-party") render X` pattern is
  banned; if Madrona needs a section the test event doesn't,
  evolve `EventContent` once and let both events render the same
  component shape.
- **Theme resolution reads `content.themeSlug`, not the URL
  slug.** Every site that calls `getThemeForSlug` for a per-event
  Theme passes `content.themeSlug` (read off the resolved
  `EventContent`), not `params.slug`. The two are equal for the
  first test event and would be equal for any one-event-per-Theme
  registration, but the contract permits two events to share a
  Theme registered under one key (e.g., a hypothetical seasonal
  pair sharing one brand theme). Resolving via the URL slug
  silently falls back to the platform Theme for any event with
  `themeSlug !== slug`, masking the contract violation behind
  `getThemeForSlug`'s defined platform fallback. The single
  per-event call site in 3.1.1 lives in
  `apps/site/app/event/[slug]/page.tsx`; 3.2 and M4 inherit the
  rule.
- **Static generation friendliness.** The page route does not
  call any Next.js Request-time API (`cookies()`, `headers()`,
  `searchParams`). `generateStaticParams` lists every registered
  test event slug so apps/site prerenders each event at
  `next build` time. Adding a Request-time call would silently
  flip the route from SSG to SSR, defeating the unfurl-preview
  goal stated in the M3 milestone doc.

## Naming

- Type and lookup: `apps/site/lib/eventContent.ts` exporting
  `type EventContent`, `getEventContentBySlug(slug: string):
  EventContent | null`, and the registered slug list (used by
  `generateStaticParams`). Naming follows
  `apps/site/lib/setupAuth.ts` / `setupEvents.ts` convention —
  flat module under `lib/` with a domain-named filename.
- Content modules: `apps/site/events/<slug>.ts` exporting a
  named const matching the slug
  (`export const harvestBlockPartyContent: EventContent = {...}`).
- First test event Theme: `shared/styles/themes/harvest-block-party.ts`
  exporting `harvestBlockPartyTheme` of type
  [`Theme`](/shared/styles/types.ts).
- Section components: `apps/site/components/event/Event<Section>.tsx`
  for each section. Filename ASCII per the apps/site convention
  visible at
  [`apps/site/components/SharedClientBootstrap.tsx`](/apps/site/components/SharedClientBootstrap.tsx).
- Disclaimer: `apps/site/components/event/TestEventDisclaimer.tsx`.
- Tests: `tests/site/event/<unit>.test.ts(x)` — surface-named, not
  phase-named, per the AGENTS.md anti-pattern note. The
  `tests/site/` subtree is new in this phase; vitest's existing
  include glob picks it up unchanged.

## Contracts

### `EventContent` type

Defined in `apps/site/lib/eventContent.ts`. Madrona-fit walk
recorded in the scoping doc; the type below is the contract this
plan binds.

```ts
type EventContent = {
  slug: string;
  themeSlug: string;
  testEvent?: boolean;
  meta: {
    title: string;
    description: string;
    openGraphType?: "website" | "article";
  };
  hero: {
    name: string;
    tagline?: string;
    dates: { start: string; end: string }; // ISO yyyy-mm-dd
    location: string;
  };
  schedule: {
    days: Array<{
      date: string; // ISO yyyy-mm-dd
      label?: string;
      sessions: Array<{
        time: string; // human local-time, e.g. "3:00 PM"
        title: string;
        description?: string;
        performerSlug?: string;
      }>;
    }>;
  };
  lineup: Array<{
    slug: string;
    name: string;
    bio?: string;
    setTimes: Array<{ day: string; time: string }>;
  }>;
  sponsors: Array<{
    name: string;
    logoSrc: string;
    logoAlt: string;
    href: string;
    tier?: string;
  }>;
  faq: Array<{ question: string; answer: string }>;
  cta: { label: string; sublabel?: string };
  footer?: { attribution?: string };
};
```

Behavior contract:

- `slug` matches the URL slug and is also the registry key in
  `eventContentBySlug`. Every event module's `slug` field MUST
  match its filename (`apps/site/events/<slug>.ts`) and its
  registry key.
- `themeSlug` is the key passed to `getThemeForSlug`. For the
  first test event, `themeSlug === slug === "harvest-block-party"`,
  but the contract intentionally permits a content module to
  reference a Theme registered under a different key (e.g.,
  multiple events sharing one Theme). 3.1.1 does not exercise
  the divergent case; it ships when a real consumer needs it.
- `testEvent === true` triggers the disclaimer banner and the
  `robots: { index: false, follow: false }` metadata. Madrona
  in M4 omits the field; the test event sets it.
- `meta.openGraphType` defaults to `"website"`. Reserved for
  future events that prefer `"article"` semantics; test event
  uses the default.
- ISO date strings (`hero.dates.start`, `hero.dates.end`,
  `schedule.days[].date`, `lineup[].setTimes[].day`) are
  treated as opaque strings by the rendering layer in this
  phase. No `Date` parsing, no timezone math. If M4 surfaces a
  multi-timezone event, evolution adds an optional `timezone`
  field on `hero.dates`; backwards-shape-compatible.
- `lineup[].setTimes[].day` cross-references
  `schedule.days[].date`. The renderer does not enforce the
  cross-reference (no validation in this phase); content authors
  are responsible. If a lineup entry references a nonexistent
  day, the schedule renders without that performer line —
  honest degraded state. A future content-validator helper is
  out of scope for 3.1.1.
- `schedule.days[].sessions[].performerSlug` cross-references
  `lineup[].slug`. Same non-enforcement posture.
- `sponsors[].logoAlt` is **required** (non-optional) so
  accessibility cannot silently regress on a content-author
  oversight.
- Empty arrays render as omitted sections (no empty section
  heading). The renderer does not display "No sponsors" or
  similar copy.

### `getEventContentBySlug(slug: string): EventContent | null`

Synchronous resolver in `apps/site/lib/eventContent.ts`.
Implementation detail: an explicit registry literal mapping
slug → module, populated with one entry in 3.1.1. 3.2 extends
the literal; M4 phase 4.2 adds `madrona`. Static imports keep
tree-shaking and Next.js bundle analysis predictable.

```ts
import { harvestBlockPartyContent } from "../events/harvest-block-party";

const eventContentBySlug: Record<string, EventContent> = {
  [harvestBlockPartyContent.slug]: harvestBlockPartyContent,
};

export function getEventContentBySlug(slug: string): EventContent | null {
  return eventContentBySlug[slug] ?? null;
}

export const registeredEventSlugs = Object.keys(eventContentBySlug);
```

The `registeredEventSlugs` export is consumed by
`generateStaticParams` so the prerender list stays in sync with
the registry by construction.

### Page route — `apps/site/app/event/[slug]/page.tsx`

Wholesale rewrite. New shape (Server Component, async `params`):

```ts
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getEventContentBySlug,
  registeredEventSlugs,
} from "../../../lib/eventContent";
import { getThemeForSlug, ThemeScope } from "../../../../../shared/styles";
import { routes } from "../../../../../shared/urls";
import { EventLandingPage } from "../../../components/event/EventLandingPage";
```

- `generateStaticParams()` → returns `registeredEventSlugs.map(slug => ({ slug }))`.
- `generateMetadata({ params })` → awaits `params`, resolves
  content; returns `{}` for unknown slugs (Next.js falls back to
  layout metadata); for known slugs returns:
  - `title`: `content.meta.title`
  - `description`: `content.meta.description`
  - `openGraph`: `{ title, description, type, siteName }` —
    text fields only, no `url`. `openGraph.url` is a URL-based
    field, and Next.js 16 hard-errors at build time on a
    relative URL value when `metadataBase` is unset (verified by
    [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` line 428](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md):
    "Using a relative path in a URL-based `metadata` field
    without configuring a `metadataBase` will cause a build
    error"). Setting an absolute `openGraph.url` requires
    knowing the canonical user-facing origin, which is the
    apps/web hostname (apps/site sits behind a Vercel rewrite),
    not apps/site's deployment URL — that decision is the same
    decision og:image needs. Co-deferring both to 3.1.2 keeps
    the `metadataBase` choice land in one place. 3.1.1's Open
    Graph card unfurls with title + description + site name,
    no canonical URL — consumer clients fall back to the
    request URL for the link target, which is correct.
  - `twitter`: `{ card: "summary_large_image" }` — placeholder
    until 3.1.2 lands the image; the card type is correct
    forward-looking and harmless without an image (consumer
    clients fall back to a small unfurl).
  - `robots`: `content.testEvent ? { index: false, follow: false } : undefined`.

  No `metadataBase` is set anywhere in this phase. Adding it
  to either the page or the root layout requires committing to
  the canonical-origin source (an env var, a hardcoded
  production hostname, or `process.env.VERCEL_URL` — each with
  trade-offs the og:image work also has to weigh). 3.1.1's
  metadata fields stay text-only so the `metadataBase` decision
  surfaces naturally in 3.1.2 against the og:image surface
  rather than locking a choice early on a half-related axis.
- Default export `Page({ params })` → awaits `params`, resolves
  content, calls `notFound()` if `null`, otherwise returns
  `<ThemeScope theme={getThemeForSlug(content.themeSlug)}><EventLandingPage
  content={content} slug={slug} /></ThemeScope>`.

  Theme resolution uses **`content.themeSlug`**, not the URL
  `slug`, so the contract permission for two events to share a
  Theme registered under one key (named in the `EventContent`
  type behavior contract above) actually works. Resolving via
  `slug` would silently fall back to the platform Theme for any
  event whose `themeSlug !== slug`, masking the
  contract-violation behind `getThemeForSlug`'s defined platform
  fallback.

The route does NOT call `cookies()`, `headers()`, or
`searchParams` to preserve SSG (see Cross-Cutting Invariants).

### `EventLandingPage({ content, slug }): ReactNode`

Top-level template in
`apps/site/components/event/EventLandingPage.tsx`. Server
Component. Composes section components in fixed order:

1. `<TestEventDisclaimer />` if `content.testEvent`
2. `<EventHeader content={content} slug={slug} />`
3. `<EventSchedule schedule={content.schedule} />` — omitted if
   `content.schedule.days.length === 0`
4. `<EventLineup lineup={content.lineup} />` — omitted if
   `content.lineup.length === 0`
5. `<EventSponsors sponsors={content.sponsors} />` — omitted if
   empty
6. `<EventFAQ faq={content.faq} />` — omitted if empty
7. `<EventCTA cta={content.cta} slug={slug} />`
8. `<EventFooter footer={content.footer} />`

Section omission is the renderer's responsibility, not the
section component's. Each section component assumes its prop is
non-empty when rendered.

### Section components

All Server Components by default. Each takes the relevant
`EventContent` slice as props plus, where needed, the slug for CTA
links.

- `EventHeader({ content, slug })` — renders hero name, optional
  tagline, formatted dates ("Aug 15-17, 2026" — formatting handled
  inline against the ISO strings; no date library), location, and
  the primary CTA `<a href={routes.game(slug)}>{content.cta.label}</a>`
  (the same CTA copy renders here and in `EventCTA` at the bottom;
  duplication is intentional so users above the fold and at the
  bottom both see it).
- `EventSchedule({ schedule })` — renders each day as a section
  with `<h2>` for the day label (or formatted date) and a list of
  sessions (`<dl>` of `<dt>` time + session title and `<dd>` for
  description; semantic markup so screen readers can navigate).
- `EventLineup({ lineup })` — renders performers as a list with
  name, optional bio, and set-times list ("Aug 15 — 3:00 PM,
  Aug 16 — 7:00 PM"). No cross-link to schedule sessions in 3.1.1
  (the data already supports it via `performerSlug`, but adding
  the cross-link UX in 3.1.1 expands surface; it can land
  later).
- `EventSponsors({ sponsors })` — renders sponsor logos as a
  grid. Each sponsor is an `<a href>` wrapping a `<picture>` /
  `<img>` with the logo. Plain `<img>` (not `next/image`) for
  3.1.1 to keep static image handling simple; if M4 phase 4.2
  needs `next/image` for performance, the upgrade is local.
  `tier` grouping: if any sponsor has a `tier`, the grid groups
  by tier with `<h3>` headings; otherwise flat grid.
- `EventFAQ({ faq })` — renders each FAQ as a native
  `<details><summary>` pair so expand/collapse works without
  JavaScript and meets keyboard accessibility expectations
  out of the box. `globals.css` normalizes the marker, focus
  ring, and content layout so default-browser styling does not
  surprise readers.
- `EventCTA({ cta, slug })` — renders a centered `<a
  href={routes.game(slug)}>{cta.label}</a>` with optional
  sublabel below. Same hard-navigation rule as `EventHeader`.
- `EventFooter({ footer })` — renders the platform attribution
  (or `footer.attribution` if set) and a link back to `/`.
- `TestEventDisclaimer()` — renders a banner with copy "Demo
  event for platform testing. Not a real public event." Banner
  visual is platform-status styling (yellow/amber background,
  dark text) that intentionally bypasses themable surface tokens
  so it reads as a platform message across every Theme.

### `harvestBlockPartyTheme: Theme`

In `shared/styles/themes/harvest-block-party.ts`. Brand bases
chosen for clear visual contrast against the Sage Civic platform
palette so a reader can verify ThemeScope is acting:

- `bg`: warm pumpkin pale (e.g., `#fdf3e8`) vs. Sage Civic's
  `#f3f4ee` warm pale sage
- `primary`: deep amber/burnt-orange (e.g., `#b85c1c`) vs. Sage
  Civic's `#2c5e4f` deep forest
- `accent`: maple gold (e.g., `#d4942b`) vs. Sage Civic's
  `#c46f3e` rust
- `text`: dark warm brown (e.g., `#3a2616`) vs. Sage Civic's
  `#232a26` charcoal-green
- `border`: warm-brown alpha (e.g., `rgba(58,38,22,0.10)`) vs.
  Sage Civic's `rgba(35,42,38,0.10)`
- Themable radii: 12 / 8 / 6 (panel / card / control) vs. Sage
  Civic's 16 / 12 / 10 — different enough that a reader sees
  radii flow through the registry.
- Typography: same `var(--font-inter)` body and
  `var(--font-fraunces)` heading as Sage Civic in 3.1.1, because
  the per-event-font story is post-epic per
  [`docs/styling.md`](/docs/styling.md). Reusing the Sage Civic
  font references keeps the Theme valid without pulling new
  `next/font` declarations into the apps/site root layout.

Final exact hex values land in the implementation; the implementer
audits them against
[`docs/styling.md`](/docs/styling.md)'s contrast and
brand-surface guidance and against Sage Civic to confirm the
visual difference is obvious in UI-review captures.

### Theme registry entry

`shared/styles/themes/index.ts`:

```ts
import { harvestBlockPartyTheme } from "./harvest-block-party";

export const themes: Record<string, Theme> = {
  "harvest-block-party": harvestBlockPartyTheme,
};
```

`getThemeForSlug` resolves `harvest-block-party` to the new
Theme; every other slug falls back to the platform Theme — see
[`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts).

## Cross-Cutting Invariants Touched

Beyond the per-phase invariants in the section above, the
following epic-level invariants apply:

- **URL contract.** `/event/:slug` routes to apps/site per
  [`apps/web/vercel.json`](/apps/web/vercel.json) lines 20-26.
  No other URL contract changes in this phase. Verified by:
  reading
  [`apps/web/vercel.json`](/apps/web/vercel.json).
- **Theme route scoping.** The route is under `/event/:slug/*`,
  so `<ThemeScope>` wrapping is required; centralized in the
  page route. Verified by: the wrap is present in the page
  component's render output.
- **Per-event customization.** Events are configured through
  data and theme. The first test event ships as a TS module +
  Theme registry entry, no per-event code paths.
- **In-place auth.** The page is public; no auth gating.
  In-place auth doesn't apply directly. The 404 path
  (`notFound()`) renders against platform Sage Civic — the
  framework default — without a `<ThemeScope>` wrap because
  there is no slug to resolve. No redirect to a `/signin` page
  ever happens.
- **Trust boundary.** The page does not perform any backend
  write. It reads only from in-bundle TypeScript modules. No
  trust-boundary surface.
- **Auth integration.** No auth surface in this phase. The
  shared `<ThemeScope>` is the only `shared/*` import the route
  exercises; no Supabase client is constructed in the page or
  in any section.

## Files to touch — new

- `apps/site/lib/eventContent.ts` — `EventContent` type, the
  `eventContentBySlug` registry, `getEventContentBySlug`, and
  `registeredEventSlugs` per the contract above.
- `apps/site/events/harvest-block-party.ts` — first test event
  content module exporting `harvestBlockPartyContent: EventContent`
  with full structural depth: 2 schedule days, 4+ lineup entries
  with set times, 4-6 sponsors with logos and links, 4+ FAQ
  entries, full CTA copy, `themeSlug: "harvest-block-party"`,
  `testEvent: true`. Sponsor logos referenced from
  `apps/site/public/test-events/harvest-block-party/<name>.svg`.
- `apps/site/public/test-events/harvest-block-party/<name>.svg`
  — placeholder neutral SVG sponsor logos (4-6 files; text-only
  glyphs sized under ~2 KB each so total committed asset size
  stays under ~15 KB).
- `apps/site/components/event/EventLandingPage.tsx` — top-level
  template per the contract.
- `apps/site/components/event/EventHeader.tsx` — hero header
  including primary CTA.
- `apps/site/components/event/EventSchedule.tsx` — schedule
  rendering.
- `apps/site/components/event/EventLineup.tsx` — lineup
  rendering.
- `apps/site/components/event/EventSponsors.tsx` — sponsor grid
  with optional tier grouping.
- `apps/site/components/event/EventFAQ.tsx` — FAQ as native
  `<details>` / `<summary>` pairs.
- `apps/site/components/event/EventCTA.tsx` — bottom CTA into
  the game route.
- `apps/site/components/event/EventFooter.tsx` — footer.
- `apps/site/components/event/TestEventDisclaimer.tsx` — banner
  rendered when `content.testEvent` is truthy.
- `shared/styles/themes/harvest-block-party.ts` — first test
  event Theme.
- `tests/site/event/eventContent.test.ts` — vitest coverage:
  `getEventContentBySlug("harvest-block-party")` returns the
  module; unknown slug returns `null`; `registeredEventSlugs`
  contains `"harvest-block-party"`; the registered content's
  `slug` matches its registry key.
- `tests/site/event/sectionComponents.test.tsx` — vitest
  coverage rendering each section against synthetic
  `EventContent` slice props and asserting key fields render:
  hero name in EventHeader; day labels in EventSchedule;
  performer names in EventLineup; sponsor link `href`s and
  `alt` text in EventSponsors; FAQ questions inside `<summary>`
  in EventFAQ; CTA link `href` resolves to
  `routes.game(slug)` in EventCTA; disclaimer banner copy in
  TestEventDisclaimer. Empty-array section omission is asserted
  via EventLandingPage rendering with empty `lineup` /
  `sponsors` / `faq` and the absence of those section headings.

## Files to touch — modify

- [`shared/styles/themes/index.ts`](/shared/styles/themes/index.ts)
  — register `harvest-block-party` → `harvestBlockPartyTheme`.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
  — wholesale rewrite per the page-route contract above. The
  cookie-boundary presence-check and the `AUTH_COOKIE_PATTERN`
  regex are deleted; the M1 phase 1.3.2 verification evidence
  remains available in
  [`shared-auth-foundation.md`](/docs/plans/shared-auth-foundation.md)
  "Verification Evidence" and in git history.
- [`apps/site/app/globals.css`](/apps/site/app/globals.css) —
  add new section-specific CSS rules (`.event-shell`,
  `.event-hero`, `.event-schedule`, `.event-lineup`,
  `.event-sponsors`, `.event-faq`, `.event-cta`, `.event-footer`,
  `.test-event-disclaimer`) consuming themable CSS custom
  properties (`--bg`, `--surface`, `--primary`, `--font-body`,
  `--font-heading`, etc.) so per-event Themes drive the visual
  through `<ThemeScope>`. The `.test-event-disclaimer` rule
  uses inline color recipes (e.g., `background:
  #fff3cd; color: #5b3e00;`) instead of themable tokens so the
  banner reads as a platform-status banner across every Theme.
- [`tests/shared/styles/getThemeForSlug.test.ts`](/tests/shared/styles/getThemeForSlug.test.ts)
  — extend with a positive case for `harvest-block-party`
  resolving to the registered Theme rather than the platform
  fallback.
- This plan — Status flips from `Proposed` to `Landed` in the
  implementing PR (3.1.1's PR), with the milestone doc's M3
  Phase Status row for 3.1 staying `Proposed` because the phase
  as a whole is not done until 3.1.2 lands.

## Files intentionally not touched

- `shared/events/*` — no extraction of `EventContent` into
  shared/events/ per the scoping doc's location decision.
- [`shared/urls/routes.ts`](/shared/urls/routes.ts) — no
  matcher needed; Next.js' file router resolves `/event/[slug]`.
  `routes.eventLanding` already exists from M1 phase 1.2.
- `apps/web/*` — no apps/web change. Cross-app navigation
  polish is M3 phase 3.3.
- [`apps/web/vercel.json`](/apps/web/vercel.json) — no edit;
  the rewrite topology is already correct from M0 phase 0.3 and
  M2 phase 2.3.
- `apps/site/app/(authenticated)/*` — no change. Event landing
  is public; the authenticated route group is for `/admin` and
  `/auth/callback`.
- [`apps/site/components/SharedClientBootstrap.tsx`](/apps/site/components/SharedClientBootstrap.tsx)
  — no change. Event landing is a Server Component with no
  client-side auth dependency, so no shared client provider
  bootstrap is needed.
- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) — no
  change. The root layout sets the platform Sage Civic Theme
  on `<html>`; per-event ThemeScope wraps inside the route, not
  at root.
- `apps/site/next.config.ts` — no edit. No new
  `NEXT_PUBLIC_*` env-substitution surfaces; the existing
  Supabase env passthrough is sufficient.
- pgTAP, Edge Functions, supabase migrations — no SQL or
  function change.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree and a feature
   branch (not `main`). Confirm M2 is fully landed
   (`git log --oneline main` shows the M2 phase 2.5 merge as
   ancestor of this branch's base — verified by reading the
   M3 milestone doc's "Phase Status" subsection, which already
   asserts the M2 dependency). Read this plan, then the M3
   milestone doc
   ([`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)),
   the scoping doc
   ([`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)),
   and the apps/site Next.js 16 reminder
   ([`apps/site/AGENTS.md`](/apps/site/AGENTS.md)) before
   editing.
2. **Baseline validation.** Run `npm run lint`,
   `npm run build:web`, `npm run build:site`, `npm test`,
   `npm run test:functions`, and the repo's pgTAP runner
   (`npm run test:db` per [`docs/dev.md`](/docs/dev.md)).
   All must pass before any edit. Capture a fresh UI-review
   snapshot of the existing apps/site `/event/<any-slug>`
   placeholder and the Sage-Civic-themed apps/site `/admin`
   for one fixture event (mobile and desktop) — the
   placeholder snapshot is the before pair for the page-route
   wholesale rewrite; the `/admin` snapshot is the
   no-visual-regression cross-check that 3.1.1 does not
   accidentally affect Sage Civic surfaces.
3. **`shared/styles/themes/harvest-block-party.ts`.** Author
   the Theme with brand bases visually distinct from Sage
   Civic per the contract. Run the values through a contrast
   walk against the disclaimer banner's fixed yellow/amber
   recipe (banner must remain readable on the warm-cream
   background of this Theme). Land
   `tests/shared/styles/getThemeForSlug.test.ts` extension in
   the same commit; re-run `npm test` to confirm the
   resolver picks up the new entry.
4. **`shared/styles/themes/index.ts` registration.** Add the
   one-line entry per the contract. The lint and type
   pass through `npm run build:site` confirm the registry
   typing.
5. **`apps/site/lib/eventContent.ts`.** Define the
   `EventContent` type, the resolver
   (`getEventContentBySlug`), and the `registeredEventSlugs`
   export per the contract. The registry literal
   (`eventContentBySlug`) is initialized as `{}` at this
   commit — the empty-`Record<string, EventContent>` literal
   typechecks, lints clean, and faithfully represents
   "registry exists, no events registered yet." A one-line
   comment names commit 6 as the site that registers
   `harvestBlockPartyContent` so a reader of this commit's
   diff sees the intended seam, not orphaned scaffolding.
   Land `tests/site/event/eventContent.test.ts` in the same
   commit, asserting only what this commit ships:
   `getEventContentBySlug("any-slug") === null` for any input
   string, and `registeredEventSlugs` is an empty array. The
   registered-slug round-trip case
   (`getEventContentBySlug("harvest-block-party")` returns
   the content, `registeredEventSlugs` contains
   `"harvest-block-party"`, content's `slug` field matches
   its registry key) is added to the same test file in
   commit 6 when the content module lands. This split keeps
   each commit's tests true on the code that exists at that
   commit — no stubs, no synthetic content, no
   "tests pass against a future state" hand-wave.

   The order between this step and step 6 (content module)
   is dependent: the type ships first so the content module
   has a target shape; if the content module surfaces a type
   gap, this step's commit gets amended in the same branch
   before the content module commit lands.
6. **`apps/site/events/harvest-block-party.ts` and SVG
   assets.** Author the content module and commit the
   placeholder SVG assets under
   `apps/site/public/test-events/harvest-block-party/`. Run
   `npm run build:site` to confirm the module typechecks
   against `EventContent` and the page route's
   `generateStaticParams` enumeration picks it up.
7. **Section components.** Implement
   `EventLandingPage.tsx`, `EventHeader.tsx`,
   `EventSchedule.tsx`, `EventLineup.tsx`,
   `EventSponsors.tsx`, `EventFAQ.tsx`, `EventCTA.tsx`,
   `EventFooter.tsx`, and `TestEventDisclaimer.tsx`.
   Server Components by default; no `"use client"` directive
   on any. Land
   `tests/site/event/sectionComponents.test.tsx` in the same
   commit. The vitest tests render section components in
   jsdom against synthetic prop slices — these are plain
   React functions taking props, so the
   Server-Component-ness does not affect testability.
8. **`apps/site/app/globals.css` extension.** Add the new
   section-specific rules. Each rule is a small block; the
   total CSS addition should stay under ~150 lines for 3.1.1
   (if it grows substantially larger, split into a separate
   `apps/site/app/event/event.css` module and import it from
   `globals.css` — decision made in implementation against
   the actual rule volume). The disclaimer banner's color
   recipe is fixed and not theme-derivable.
9. **Page route wholesale rewrite.** Replace
   [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
   per the contract. Verify the import paths against the
   project structure: shared imports use the
   `../../../../../shared/...` form already established by
   [`apps/site/app/(authenticated)/admin/page.tsx`](/apps/site/app/%28authenticated%29/admin/page.tsx)
   lines 6-22. The `Page` component awaits `params`,
   resolves content, calls `notFound()` on miss, and returns
   the `<ThemeScope>`-wrapped `<EventLandingPage>`.
   `generateMetadata` and `generateStaticParams` ship in the
   same file.
10. **Validation re-run.** All baseline commands from step 2
    must still pass. `npm run build:site` must show
    `harvest-block-party` in the prerendered route list (Next.js
    logs the prerendered routes during `next build`; the plan
    does not commit to capturing the exact log output, but the
    implementer reads it to confirm the prerender happened).
11. **Server-rendered noindex verification.** Run the local
    production-build pair and curl the raw HTML to confirm
    `<meta name="robots" content="noindex, nofollow">` is
    present pre-hydration:

    ```sh
    cd apps/site && npx next build && npx next start &
    SITE_PID=$!
    sleep 4
    curl -s http://localhost:3000/event/harvest-block-party | \
      grep -o '<meta name="robots"[^>]*>'
    kill $SITE_PID
    ```

    The grep must produce `<meta name="robots" content="noindex, nofollow"/>`
    (or equivalent Next.js whitespace variant). Curl reads raw
    server HTML, not browser DOM after hydration; this is the
    falsifier for the M3 milestone doc's
    "noindex meta is server-rendered, not client-rendered" risk.
    Capture the curl output in the PR body's Validation section.
12. **Cross-app CTA local exercise.** Start the apps/web
    `vercel dev` proxy and the apps/site production build
    side by side per the M2 phase 2.3 reality-check
    pattern (M2 phase 2.3's plan recorded the trap that
    `vercel dev` proxies to *production* apps/site by
    default — for a local cross-app run, the proxy
    destination must point at the local apps/site instead).
    Visit `http://localhost:5173/event/harvest-block-party`
    via the apps/web origin, confirm the page renders with
    the Harvest Block Party Theme, click the CTA, and confirm
    a hard navigation to `/event/harvest-block-party/game`
    that resolves to apps/web's existing game shell (or the
    apps/web "game not available" copy if the slug doesn't
    have a corresponding `game_events` row, which is fine —
    the load-bearing assertion is that the proxy fires and the
    URL change is a hard navigation, not a soft client-side
    push).

    If the cross-app local exercise is procedurally too
    expensive (vercel CLI absolute-destination override is
    fragile per the M2 phase 2.3 trap recording), the
    implementer falls back to: capturing the server HTML for
    the CTA `<a href="...">` to confirm it points at
    `/event/harvest-block-party/game`, and running
    `npm run dev:site` + manually navigating to the CTA URL
    in a browser pointed at apps/site's port to confirm the
    href is generated correctly. The cross-app proxy
    behavior itself is exercised end-to-end by 3.3's
    cross-app navigation verification phase, so 3.1.1 does
    not have to be the load-bearing site for the proxy gate.
13. **UI-review captures.** Capture the new
    `/event/harvest-block-party` route in mobile and
    desktop viewports. Confirm:
    - Disclaimer banner is visible above the hero
    - Header shows event name, dates, location, primary CTA
    - Schedule renders day labels and sessions
    - Lineup shows performer names and set times
    - Sponsors render with logos visible (no broken images)
    - FAQ items expand on click (`<details>` works)
    - Bottom CTA has same `routes.game(slug)` href
    - Footer renders attribution
    - Per-event Theme is visually distinct from Sage Civic
      (warm autumn vs. cool sage) — the cross-Theme
      comparison is the load-bearing verification for the
      ThemeScope plumbing
    - The `apps/site/admin` Sage-Civic-themed page is
      unchanged from baseline (no leak from the new route's
      Theme)

    Use [`scripts/ui-review/capture-ui-review.cjs`](/scripts/ui-review/capture-ui-review.cjs)
    if its existing route inventory covers the new event
    landing route; otherwise extend the script in this PR
    (add the new route to its capture list) per AGENTS.md
    "extend that script when future verification needs new
    routes."
14. **Documentation update.** Walk
    [`AGENTS.md`](/AGENTS.md) "Doc Currency Is a PR Gate"
    triggers:
    - [`docs/architecture.md`](/docs/architecture.md) — the
      M3 milestone doc names this as 3.3-owned. 3.1.1 does
      *not* edit architecture.md; the rendering pipeline,
      `EventContent` shape, and test-event posture are
      described in 3.3's PR alongside multi-theme proof from
      3.2. 3.1.1's diff being silent on architecture.md is
      intentional, not an oversight.
    - [`README.md`](/README.md) — owned by 3.3 per the
      milestone doc; 3.1.1 does not touch.
    - [`docs/dev.md`](/docs/dev.md) — owned by 3.3 only if
      the M3 set introduces new validation commands; 3.1.1
      adds no new commands (`npm run build:site` already
      covers SSG validation), so 3.1.1 does not touch.
    - [`docs/styling.md`](/docs/styling.md) — no edit. The
      "Procedure For Adding A New Theme" section already
      describes the registry pattern this phase exercises;
      no policy change.
    - [`docs/open-questions.md`](/docs/open-questions.md) —
      no edit. The "Event landing route model" entry closes
      with M4 phase 4.2 jointly with M3 (per the milestone
      doc's Documentation Currency subsection); 3.3 records
      M3's contribution as in-progress. 3.1.1 does not flip
      it.
    - [`docs/backlog.md`](/docs/backlog.md) — no edit. The
      "Event landing page for /event/:slug" entry closes
      with M4 phase 4.2; M3 ships infrastructure only.
    - [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
      Phase Status table — update the 3.1 row's `Plan`
      column to point at this plan when the plan-drafting
      commit lands; update the row's `PR` column with the
      3.1.1 PR number when the implementing PR opens. The
      `Status` column stays `Proposed` because the phase as
      a whole is not done until 3.1.2 lands.
    - This plan — Status flips from `Proposed` to `Landed`
      in the implementing PR.
    - [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
      M3 row — stays `Proposed` (its flip lands with 3.3).
15. **Automated code-review feedback loop.** Walk the diff
    from a senior-reviewer stance against the Cross-Cutting
    Invariants above and each Self-Review Audit named below.
    Apply fixes in place; commit review-fix changes
    separately when that clarifies history per
    [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.
16. **Plan-to-PR completion gate.** Walk every Goal,
    Cross-Cutting Invariant, Validation Gate command, and
    Self-Review Audit named in this plan. Confirm each is
    satisfied or explicitly deferred in this plan with
    rationale. Flip Status from `Proposed` to `Landed` in
    the same PR.
17. **PR preparation.** Open the PR using
    [`.github/pull_request_template.md`](/.github/pull_request_template.md).
    Title under 70 characters
    (e.g., "M3 phase 3.1.1: apps/site event landing pipeline + Harvest Block Party").
    Validation section lists every command actually run plus
    the curl output from step 11. UX Review: include the new
    event landing captures from step 13 (mobile + desktop)
    plus the cross-Theme comparison (Sage Civic vs. Harvest
    Block Party). Remaining Risk: og:image deferred to 3.1.2;
    cross-app proxy verification deferred to 3.3; first test
    event renders Sage Civic-themed in apps/web's per-event
    admin until M4 (per the epic's "Deferred ThemeScope
    wiring" invariant — apps/web admin's slug-to-Theme
    resolution will pick up `harvest-block-party` when M4
    wires apps/web event-route ThemeScope, but the test event
    has no DB row so apps/web admin's
    `is_organizer_for_event` check returns false for any
    user and the route never renders authoring content; this
    matches the M3 milestone doc's "ThemeScope wrapping
    discipline" invariant note about test-slug registry
    resolution being harmless on the apps/web admin side).

## Commit boundaries

Per [`AGENTS.md`](/AGENTS.md) "Planning Depth," commit slices
named upfront. Each commit must independently typecheck and
lint; vitest runs at the boundary that produces the relevant
tests.

1. **Theme registration.**
   `shared/styles/themes/harvest-block-party.ts` plus
   `shared/styles/themes/index.ts` registry edit plus
   `tests/shared/styles/getThemeForSlug.test.ts` extension.
   Single commit; the Theme has no consumer until commit 4
   below, but the registry edit is small and the test
   coverage lives next to the resolver.
2. **Event content type, resolver, and empty registry.**
   `apps/site/lib/eventContent.ts` exporting
   `EventContent`, `getEventContentBySlug`, and
   `registeredEventSlugs`, with `eventContentBySlug`
   initialized as `{}` (empty literal, no imports of
   not-yet-existing modules). A one-line comment names
   commit 3 as the site that registers
   `harvestBlockPartyContent`. Plus
   `tests/site/event/eventContent.test.ts` asserting only
   what this commit ships:
   `getEventContentBySlug("harvest-block-party") === null`
   (and any other slug → `null`),
   `registeredEventSlugs.length === 0`. This commit
   typechecks (empty `Record<string, EventContent>` is
   valid), lints clean (no unused imports, no dangling
   references), and its tests pass against the code that
   exists at this commit. No TODO comment in source — the
   one-line "commit 3 registers the first event" comment
   is forward-reference signposting, not a placeholder for
   broken state.
3. **Event content module, assets, and registry
   population.** `apps/site/events/harvest-block-party.ts`
   exporting `harvestBlockPartyContent: EventContent`,
   placeholder SVG sponsor logos under
   `apps/site/public/test-events/harvest-block-party/`, and
   the `eventContent.ts` edit that imports
   `harvestBlockPartyContent` and registers it in
   `eventContentBySlug`. Extends
   `tests/site/event/eventContent.test.ts` with the
   round-trip assertions:
   `getEventContentBySlug("harvest-block-party")` returns
   the content module, `registeredEventSlugs` contains
   `"harvest-block-party"`, the returned content's `slug`
   field matches the registry key. After this commit the
   registry is populated and the round-trip path is
   covered; a reader walking commits 2 → 3 sees the
   intermediate empty state, the addition of the content
   module, and the re-export of the new registry behavior
   in one focused diff.
4. **Section components.** All
   `apps/site/components/event/*` files plus
   `tests/site/event/sectionComponents.test.tsx`. Single
   commit; the components form one tightly-coupled unit
   (the page route in commit 6 imports them as a set).
5. **globals.css extension.** Section-specific CSS rules.
   Single commit; no test coverage (CSS is verified by
   UI-review captures, not unit tests).
6. **Page route rewrite.**
   `apps/site/app/event/[slug]/page.tsx` wholesale rewrite.
   Single commit; the new route is the consumer that ties
   commits 1-5 together, so this commit moves the system
   from "scaffolding present but unused" to "live route
   serving content."
7. **Documentation update.** This plan's Status flip plus
   the milestone doc's Phase Status table edit. Single
   commit.
8. **Review-fix commits.** As needed during step 15, kept
   distinct from the substantive implementation commits per
   [`AGENTS.md`](/AGENTS.md) Review-Fix Rigor.

## Validation Gate

- `npm run lint` — pass on baseline; pass on final.
- `npm test` — pass on baseline; pass on final. New test
  files: `tests/site/event/eventContent.test.ts`,
  `tests/site/event/sectionComponents.test.tsx`. Extended
  files: `tests/shared/styles/getThemeForSlug.test.ts`. The
  default vitest include glob at
  [`vitest.config.ts:18`](/vitest.config.ts) (`tests/**/*.test.ts`
  + `tests/**/*.test.tsx`) covers the new files; no config
  change required.
- `npm run build:web` — pass on baseline; pass on final.
  Phase 3.1.1 does not touch apps/web source.
- `npm run build:site` — pass on baseline; pass on final.
  This is the load-bearing gate for Server Component
  semantics, the `Metadata` type shape, the
  `generateStaticParams` enumeration, and the
  `EventContent` type-check against the first content
  module. The build log must show
  `/event/harvest-block-party` in the prerendered route
  list.
- `npm run test:functions` — pass on baseline; pass on
  final. No edge-function source change.
- pgTAP suite — pass on baseline; pass on final. No SQL
  change.
- **Server-rendered noindex check** per Execution step 11:
  curl raw HTML for the test event route and grep for
  `<meta name="robots" content="noindex, nofollow">`. The
  output is captured in the PR's Validation section. This
  is the falsifier for the cross-cutting invariant
  "server-side noindex for test events"; without this curl,
  a regression where the meta is client-rendered after
  hydration would slip past every other gate.
- **UI-review captures** per Execution step 13: new event
  landing route in mobile and desktop, plus the
  Sage-Civic-themed `/admin` for the no-visual-regression
  cross-check. Captured pair for the ThemeScope-on (Harvest
  Block Party Theme) vs. ThemeScope-off (Sage Civic
  fallback for any unregistered slug — the implementer
  proves this by visiting `/event/<unregistered-slug>` if
  3.1.1 has not yet hardened the unknown-slug path to
  `notFound()`; otherwise the comparison is between
  Harvest Block Party and the platform admin / landing
  surfaces, both of which render against Sage Civic).
- **Cross-app CTA local exercise** per Execution step 12 —
  best-effort. The load-bearing assertion is that the CTA
  href is `/event/harvest-block-party/game` (which the
  vitest `EventCTA` test asserts unconditionally). The
  end-to-end proxy gate is M3 phase 3.3's responsibility,
  not 3.1.1's.

## Self-Review Audits

Drawn from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md) and
matched to this phase's diff surfaces.

### Frontend

- **Effect cleanup audit.** Conditional. The plan's
  contracts ship Server Components only with no
  `useEffect`. If a client island lands during
  implementation (against the cross-cutting invariant —
  unlikely), this audit applies to its effects. If no
  client island ships, the audit is satisfied vacuously.
  The PR body confirms which case applies.
- **Readiness-gate truthfulness audit.** The
  server-rendered noindex check (Validation Gate step) is
  the readiness claim that needs to reflect a real run.
  The PR body's Validation section captures the curl
  output, not just a statement that it was run. Without
  the captured output, a reviewer cannot distinguish
  "the noindex is server-rendered" from "the noindex was
  client-injected and the curl returned nothing."
- **Theme-resolution-via-themeSlug audit.** Walk every
  per-event call to `getThemeForSlug` in this phase's diff
  and confirm it passes `content.themeSlug` (the field on
  the resolved `EventContent`), not `params.slug`. The
  trap: `getThemeForSlug` falls back to the platform Theme
  on any unregistered key, so passing the URL slug to a
  registry that's keyed under a different `themeSlug`
  silently renders Sage Civic instead of the intended
  Theme — no error, no log, the contract violation is
  invisible at runtime. For 3.1.1 the single call site is
  in `apps/site/app/event/[slug]/page.tsx`; the harvest
  test event has `themeSlug === slug`, so a wrong call
  passes the harvest-only UI-review captures unchanged
  while breaking 3.2 + M4 silently. The audit is
  diff-walk only — no vitest case, since the call site is
  inside a Server Component that vitest doesn't render
  (the build-time gate covers type shape, not behavior at
  this seam).

### CI & testing infrastructure

- **CLI / tooling pinning audit.** Phase 3.1.1 is expected
  to introduce zero new dependencies in
  `apps/site/package.json` or root `package.json`. The
  contract relies on already-shipped deps: `next` 16.2.4,
  `react` 19.2.4, `next/font/google` (already imported by
  the root layout), `next/navigation` (built into `next`).
  If implementation surfaces a need for a new package
  (unlikely; the markdown-renderer hypothetical is
  out-of-scope per the type contract), it lands pinned per
  AGENTS.md and the PR description names it explicitly.
- **Rename-aware diff classification.** The page route
  rewrite at
  [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/%5Bslug%5D/page.tsx)
  is a wholesale rewrite, not a rename. `git diff
  --name-status` should show one `M` entry for that file
  with substantive content change; reviewer attention
  should land on the new content (Server Component
  shape, generateMetadata, `<ThemeScope>` wrap), not on a
  move artifact. New files (`apps/site/lib/`,
  `apps/site/events/`, `apps/site/components/event/`,
  `shared/styles/themes/harvest-block-party.ts`) show as
  `A` entries; SVG asset additions show as `A` entries.
  No `R` entries should appear; if any do, the diff has
  drifted off the contract.

## Documentation Currency PR Gate

Per [`AGENTS.md`](/AGENTS.md) "Doc Currency Is a PR Gate," the
relevant doc updates this branch must carry:

- [`docs/architecture.md`](/docs/architecture.md) — no
  change. Owned by 3.3 per the milestone doc's
  "Documentation Currency" subsection.
- [`README.md`](/README.md) — no change. Owned by 3.3.
- [`docs/dev.md`](/docs/dev.md) — no change. No new
  validation command; the existing
  `npm run lint` / `npm test` / `npm run build:site`
  flow covers the new files unchanged.
- [`docs/styling.md`](/docs/styling.md) — no change. The
  "Procedure For Adding A New Theme" section already
  describes the registry pattern; 3.1.1 exercises it
  without policy change.
- [`docs/open-questions.md`](/docs/open-questions.md) —
  no change. The "Event landing route model" entry's
  in-progress note is 3.3's responsibility per the
  milestone doc.
- [`docs/backlog.md`](/docs/backlog.md) — no change.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  M3 row — stays `Proposed`.
- [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md)
  Phase Status table — Phase 3.1 row's `Plan` column
  points at this plan; `PR` column gets the 3.1.1 PR
  number on PR open. `Status` column stays `Proposed`
  until 3.1.2 also lands.
- This plan — Status flips from `Proposed` to `Landed` in
  the implementing PR.
- [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md)
  — no edit. The scoping doc deletes in batch in M3 phase
  3.3's PR per the milestone doc's "Phase Status"
  subsection; 3.1.1 does not delete it because 3.1.2's
  plan-drafting will read it.

## Out Of Scope

Deliberately excluded from this phase. Each entry references the
resolution path so reviewer attention does not relitigate them.

- **og:image and twitter-image generation.** Resolution: M3
  phase 3.1.2's plan-drafting decides the strategy
  (Next.js `opengraph-image.tsx` file convention vs.
  dynamic `next/og` `ImageResponse` route vs. static
  asset). 3.1.1 ships the basic Open Graph text fields
  and `twitter:card = summary_large_image`; the image
  itself lands in 3.1.2.
- **`metadataBase` configuration and `openGraph.url`.**
  Resolution: M3 phase 3.1.2, co-deferred with og:image.
  Next.js 16 hard-errors at build on relative URL-valued
  metadata fields when `metadataBase` is unset (verified
  by
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` line 428](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)).
  The canonical-origin source for `metadataBase` (env var,
  hardcoded production hostname, or `process.env.VERCEL_URL`
  with the apps/web-vs-apps/site rewrite asymmetry handled)
  is the same source the absolute og:image URL needs, so
  bundling both into 3.1.2 lets the trade-off get decided
  once. 3.1.1 ships text-only Open Graph fields (title,
  description, type, siteName), no `url`.
- **Unfurl preview validation against Slack / iMessage.**
  Resolution: M3 phase 3.1.2. Without an og:image, the
  unfurl is title-and-description-only; meaningful unfurl
  validation requires the image, so the validation lives
  with the image.
- **Cross-app proxy verification end-to-end.**
  Resolution: M3 phase 3.3. 3.1.1's CTA href correctness
  is asserted by vitest; the proxy boundary is exercised
  in 3.3's plan against actually-merged 3.1 + 3.2 code.
- **Second test event with distinct theme.** Resolution:
  M3 phase 3.2. 3.1.1 ships one test event so the
  rendering pipeline is end-to-end provable; multi-theme
  proof is 3.2's job.
- **`docs/architecture.md` rendering-pipeline write-up.**
  Resolution: M3 phase 3.3 owns the architecture.md
  update describing `EventContent`, the rendering
  template, and the cross-app ThemeScope asymmetry. 3.1.1's
  diff is silent on architecture.md by design — the doc
  describes settled platform contracts, and the contract
  is not "settled" until both 3.1 and 3.2 ship and the
  multi-theme proof exists.
- **Per-event metadata override mechanism.** Resolution:
  out of epic per the M3 milestone doc cross-cutting
  invariant "Per-event SSR meta from one resolver." If
  Madrona surfaces a need for richer metadata than
  `EventContent.meta` carries, the type evolves once.
- **`next/image` for sponsor logos.** Resolution: 3.1.1
  ships plain `<img>` for sponsor logos. If M4 phase 4.2
  needs `next/image` performance for Madrona's sponsor
  logos, the upgrade is local to `EventSponsors.tsx` and
  does not change the `EventContent` shape.
- **FAQ rich-content rendering.** Resolution: 3.1.1 ships
  plain-text FAQ answers. Rich-content support
  (markdown, links, lists) lands when a real consumer
  needs it.
- **Theme content authoring through admin.** Resolution:
  out of epic per the parent epic's "Out Of Scope"
  paragraph; per-event Themes ship as TypeScript modules
  through M3 and M4.
- **`/event/:slug/admin` rendering Madrona's brand.**
  Resolution: M4 phase 4.1. apps/web per-event admin's
  Theme resolution picks up Madrona when the registry
  entry lands, not before.
- **Slug-format validation helper.** Resolution: per the
  M1 phase 1.4 plan's "What is **not** extracted" list,
  no `validateSlug` helper exists today. 3.1.1 receives
  the slug from Next.js' file router, which has already
  pattern-matched against the route segment. The
  `notFound()` path catches unknown slugs without a
  format validator; if a format validator becomes useful,
  it lands when a consumer drives the contract.

## Risk Register

- **`EventContent` underfit for Madrona.** The risk that the
  type defined here cannot represent Madrona's real content
  shape. Mitigation: the contract above has been
  Madrona-fit-walked against the parent epic's M4 phase 4.2
  description (multi-day schedule, lineup with set times,
  sponsor logos and links, FAQ, CTA copy, theme slug). The
  scoping doc records explicit evolution paths for the
  most likely surprise vectors (multi-stage stages,
  sponsor tiering edge cases, rich FAQ, multi-timezone)
  and confirms each is backwards-shape-compatible. Any
  reviewer who can name a specific Madrona content field
  the contract cannot carry blocks the merge until the
  contract evolves; the test is concrete, not vibe-based.
- **First test event Theme too close to Sage Civic.** If
  the brand bases drift toward Sage Civic during
  authoring, the visual proof of ThemeScope is weak.
  Mitigation: the Theme picks brand bases with named
  semantic contrast (warm autumn vs. cool sage); the
  UI-review captures (Execution step 13) include an
  explicit comparison capture, and the implementer
  re-picks values if the contrast does not read clearly.
- **Server-rendered noindex regression.** The "noindex is
  server-rendered" invariant could regress silently if
  the metadata path turns dynamic (e.g., a future change
  introduces a `cookies()` call that flips the page out
  of SSG into SSR with the meta still emitted but only
  on first request). Mitigation: the curl falsifier in
  Validation Gate step 11 catches this; the captured
  output is the load-bearing evidence in the PR.
- **Cross-app proxy boundary breaks the CTA at deploy
  time.** The local `vercel dev` cross-app exercise
  (Execution step 12) is best-effort; the true
  end-to-end proxy gate is M3 phase 3.3. If a deploy-
  time misconfiguration breaks the CTA, the test event
  is noindex'd so SEO impact is zero, but the demo
  experience suffers. Mitigation: 3.3's plan picks up
  this gate; 3.1.1's risk surface is bounded to "the
  href is correct," which vitest covers.
- **Disclaimer banner contrast against the Theme bg.**
  The banner's fixed yellow/amber recipe could clash
  with a future Theme's `bg` (e.g., a yellow-toned
  Theme would make the banner blend in). Mitigation:
  Harvest Block Party's `bg` is warm-pumpkin pale, not
  yellow; the banner remains distinguishable. 3.2's
  second test event picks a non-yellow `bg` (the
  scoping doc names the Theme distinctness as 3.2's
  concern). Long-term, if a Theme genuinely needs a
  yellow background, the banner recipe revisits then.
- **Server Component → client island scope creep during
  implementation.** A reviewer or implementer might
  convert FAQ or sponsor grid into a client island for
  smoother interactivity. Mitigation: the cross-cutting
  invariant "no per-event-coded section components"
  combined with "Server-rendered first paint" from the
  M3 milestone doc binds this. Any client island added
  must justify itself against the page being SSG-only,
  and the FAQ specifically uses native `<details>` to
  avoid the trade.
- **Section omission silently hides content authoring
  errors.** The renderer omits empty sections (per
  contract), which is correct for content-shape
  flexibility but could hide a content-author oversight
  (e.g., `lineup: []` accidentally shipped instead of
  `lineup: [actualLineup]`). Mitigation: not enforced in
  3.1.1. The first test event ships with all sections
  populated; if Madrona ships an empty section, the
  rendering is honest about the absence rather than
  faking content. A future content-validator step is a
  post-epic concern.
- **Static asset path collisions with apps/site
  conventions.** Test event assets land under
  `apps/site/public/test-events/<slug>/`. If apps/site
  adds a top-level `test-events` route in the future,
  there's a static-asset-vs-route collision. Mitigation:
  no such route is on any plan; if one lands later, the
  test-events asset path migrates to a different
  prefix. The plan does not pre-defend against
  speculative future routes.
- **Madrona's `<ThemeScope>` registry pickup vs. apps/web
  admin route.** When M4 registers Madrona's Theme, the
  Theme also resolves for apps/web's per-event admin at
  `/event/madrona/admin`. That's intended. The same
  applies retroactively to `harvest-block-party`: if
  someone visits `/event/harvest-block-party/admin`
  during M3, apps/web's admin renders the Harvest Block
  Party Theme. But the route's
  `is_organizer_for_event(<event-id>)` check fails for
  any user because no `game_event_drafts` row exists for
  the test slug, so the route renders the role-gate
  state inside the Harvest Block Party shell —
  intentional and harmless per the M3 milestone doc's
  "ThemeScope wrapping discipline" invariant. The PR
  body's Remaining Risk section names this explicitly so
  reviewer attention does not relitigate it.

## Backlog Impact

None. The "Event landing page for /event/:slug" backlog item
closes with M4 phase 4.2 (Madrona content), not with M3
infrastructure phases.

## Related Docs

- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  parent epic; M3 phase paragraphs at lines 712-779 are
  pre-milestone-planning estimate (the epic still lists a
  4-phase shape including a defunct Phase 3.4); the M3
  milestone doc is canonical.
- [`m3-site-rendering.md`](/docs/plans/m3-site-rendering.md) —
  M3 milestone doc; cross-phase invariants, decisions,
  risks. The 3-phase canonical shape (3.1, 3.2, 3.3) lives
  here.
- [`docs/plans/scoping/m3-phase-3-1.md`](/docs/plans/scoping/m3-phase-3-1.md) —
  scoping doc this plan compresses from. Records the
  EventContent location decision, the og:image deferral,
  the PR split rationale, the slug + Theme decisions, and
  the open decisions for plan-drafting. Deletes in batch in
  3.3's PR.
- [`shared-styles-foundation.md`](/docs/plans/shared-styles-foundation.md) —
  M1 phase 1.5 plan; ThemeScope contract and the apps/site
  Sage Civic root layout this phase wraps inside.
- [`docs/styling.md`](/docs/styling.md) — themable /
  structural classification; "Procedure For Adding A New
  Theme" the first test event Theme follows.
- [`docs/self-review-catalog.md`](/docs/self-review-catalog.md) —
  audit name source.
- [`apps/site/AGENTS.md`](/apps/site/AGENTS.md) — Next.js 16
  breaking-change reminder. The plan reads
  `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`
  before locking the `Metadata.robots` shape and
  `next/dist/docs/01-app/03-api-reference/04-functions/generate-static-params.md`
  before locking `generateStaticParams`'s return shape.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions rules,
  Plan-to-PR Completion Gate, Doc Currency PR Gate, "Verified
  by:" annotation rule.
