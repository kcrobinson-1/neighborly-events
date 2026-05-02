# M2 phase 2.1 — apps/site home-page structural rebuild + hero + two-event showcase

## Status

Landed.

## Context

apps/site's home page at
[`apps/site/app/page.tsx`](/apps/site/app/page.tsx) is a 17-line
stub: an eyebrow, a title, one body sentence, and an
`Open admin workspace` CTA. It dates from event-platform-epic
M2 phase 2.3, when apps/web's pre-migration `/` demo-overview
content was subsumed into a placeholder while the rest of
apps/site stood up. Internal partners evaluating the platform
land on this stub first.

This phase rebuilds that surface into the structural foundation
M2 plugs sections into. The rebuild ships a partner-honest hero
that frames what the platform is and what is real vs. stubbed at
this iteration boundary, plus a two-event showcase that previews
both registered Themes side-by-side (Harvest Block Party in
pumpkin, Riverside Jam in teal-blue). It introduces the
home-page-scoped `.home-shell` CSS namespace, ships the noindex
metadata the milestone doc requires, and seeds the milestone
doc's Phase Status table. The Harvest narrative section (2.2)
and the role-door entry points (2.3) plug into the shell 2.1
lands; both stay out of this PR.

The change touches one apps/site route file (full rewrite from
17 lines), introduces a new `apps/site/components/home/` family
mirroring the existing
[`apps/site/components/event/`](/apps/site/components/event/)
section-per-file convention, extends the apps/site CSS surface
under `.home-shell`, and adds a route-scoped `metadata.robots`
emit. apps/web is not touched; the theme registry, the resolver,
the auth shape, and the route table are unchanged.

## Goal

Replace
[`apps/site/app/page.tsx`](/apps/site/app/page.tsx)'s 17-line
stub with a server-rendered home page composed of a hero section
and a two-event showcase. After this PR:

- the home page frames the platform honestly (what is real, what
  is stubbed) for an internal-partner audience
- the showcase renders Harvest and Riverside cards side-by-side
  on desktop viewports, each wrapped in `<ThemeScope>` against
  its own `themeSlug`, so both Themes are visibly distinct in
  the same screenful
- each showcase card links to its apps/site rich event landing
  via `routes.eventLanding(slug)` (same-app navigation)
- the home-page route emits
  `<meta name="robots" content="noindex, nofollow" />` from
  server-rendered metadata
- the milestone doc's Phase Status table 2.1 row flips
  `Plan-pending` → `Landed` and points at this PR

The PR does not register a new Theme, does not introduce
demo-mode auth bypass, does not touch apps/web, does not ship
the Harvest narrative or the role-door entry points, and does
not consume `featuredGameSlug` (an apps/web-side constant that
points to an unregistered slug).

## Cross-Cutting Invariants

This phase binds the four milestone-level invariants from
[m2-home-page-rebuild.md §Cross-Phase Invariants](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
verbatim — internal-partner honesty, two-theme exercise on
showcase, role-door honesty against current auth state, and
cross-app navigation uses hard navigation. **No per-phase
additions.**

Role-door honesty is N/A for 2.1's diff (role doors are 2.3
scope) but self-review still walks it as a no-op for completeness
per the milestone doc's "Self-review walks each one against
every phase's actual changes." Cross-app navigation is similarly
N/A for the showcase cards (target is same-app
`/event/<slug>`), but self-review walks every outbound link in
the rebuilt home page against the rule.

The plan also inherits the URL contract, theme route scoping,
and theme token discipline invariants from the parent epic and
predecessor epic per the milestone doc's "Inherited from upstream
invariants" paragraph; self-review walks each against this
phase's diff.

## Naming

- **`.home-shell`** — top-level CSS scope class on the
  rebuilt home page's `<main>` element. Mirrors the existing
  `.landing-shell` / `.admin-shell` / `.auth-callback-shell`
  convention at
  [`globals.css:52-149`](/apps/site/app/globals.css).
- **Showcase card** — the per-event preview tile rendered inside
  the showcase. Each card is wrapped independently in
  `<ThemeScope>` so the two cards display distinct Themes
  side-by-side.
- **Brand-tied tokens** — `--primary`, `--secondary`, `--accent`,
  and `--bg`. These are the Theme-driven custom properties the
  showcase-card brand surface (border, button background, eyebrow
  color, header underline) reads. **Derived shades** (e.g.,
  `--primary-surface`, `--secondary-focus`) pin to the
  apps/site `:root` substitution and do not re-evaluate inside
  `<ThemeScope>` per the empirical finding recorded at
  [`docs/plans/themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md);
  the showcase card avoids them on brand-bearing surfaces.

## Contracts

### Page-route metadata-emit shape

The rebuilt
[`apps/site/app/page.tsx`](/apps/site/app/page.tsx) exports a
`metadata` constant of type `Metadata` that adds (does not
replace) `robots`:

```ts
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
```

Per Next.js' segment-cascade
([`generate-metadata.md` lines 1326-1328](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)),
the home page's `metadata` export is shallowly merged with
[`layout.tsx:100-103`](/apps/site/app/layout.tsx)'s
`{ title, metadataBase }`. The page's `metadata` defines only
`robots`, so the layout's `title` and `metadataBase` survive
unmodified; the final `<head>` carries all three. The contract
prohibits overriding `title` or `metadataBase` from the page
route — that would break the OG-image pipeline's single-source-
of-truth assumption documented at
[`layout.tsx:92-99`](/apps/site/app/layout.tsx).

### Showcase-card wrap shape

Each showcase card is rendered inside its own `<ThemeScope>`
wrap that resolves the per-event Theme from the registry:

```tsx
<ThemeScope theme={getThemeForSlug(content.themeSlug)}>
  {/* card markup consuming brand-tied tokens */}
</ThemeScope>
```

The wrap input is `content.themeSlug`, **not** the URL slug, per
the milestone doc's "Theme resolution reads `content.themeSlug`,
not the URL slug" Settled-by-default decision and the existing
[`event/[slug]/page.tsx:106`](/apps/site/app/event/[slug]/page.tsx)
contract. Independent per-card wraps are load-bearing: a single
outer `<ThemeScope>` that the two cards share would render both
cards under one Theme, silently regressing the milestone
doc's "Two-theme exercise on showcase" invariant.

### Brand-token discipline

Showcase-card visual elements that carry Theme identity (border,
button background, eyebrow color, header underline) consume
brand-tied tokens (`var(--primary)`, `var(--secondary)`,
`var(--accent)`, `var(--bg)`). They do **not** consume derived
shades like `var(--primary-surface)` or `var(--secondary-focus)`.
Background tints, hover states, and other non-brand-bearing
surfaces may use whatever the design needs but are not load-
bearing for the two-theme visible distinction.

This rule mitigates the milestone doc's "Multi-theme rendering
visible in showcase but broken in practice" Cross-Phase Risk
and aligns with the empirical finding recorded at
[`docs/plans/themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md).

### Showcase-card link contract

Each card's primary link uses
[`routes.eventLanding(slug)`](/shared/urls/routes.ts) — same-app
destination resolving to `/event/${encodeURIComponent(slug)}`.
The link is a plain `<a href>` or Next.js `<Link href>`
(implementer choice; both work because the destination is
same-app). The card does **not** link directly to apps/web;
partners enter the gameplay shell via the rich event landing's
existing CTA at
[`EventCTA.tsx:24`](/apps/site/components/event/EventCTA.tsx),
which already hard-navigates correctly.

### Slug list source

The rebuilt page hardcodes the two test slugs
(`harvest-block-party` and `riverside-jam`) as a const literal at
the top of the page or in a co-located `apps/site/components/home/`
file. The page does **not** consume
[`featuredGameSlug`](/shared/game-config/constants.ts) (apps/web
concern, value is `"first-sample"` which is unregistered in
apps/site's EventContent registry) and does **not** filter
[`registeredEventSlugs`](/apps/site/lib/eventContent.ts) by
`testEvent === true`. Hardcoding is the deliberate call: the
showcase shape is "two events side-by-side," not "every test
event"; future test-event additions should require an explicit
home-page edit rather than silently break the side-by-side
layout.

### Phase Status seed

The PR updates the milestone-doc Phase Status row for 2.1:

- **Plan** column → relative link to this plan doc
- **Status** column → flips `Plan-pending` → `Landed`
- **PR** column → the PR number for this change

Rows for 2.2 and 2.3 stay `Plan-pending`. The doc-only edit
ships in the doc commit.

## Files to touch

This list is the planner's pre-implementation estimate of the
expected diff shape per AGENTS.md "Plan content is a mix of
rules and estimates"; implementation may revise when a
structural call requires deviating, recorded in the PR body's
`## Estimate Deviations` section.

### New

- `apps/site/components/home/HomeHero.tsx` — server component
  rendering the hero section (eyebrow, title, partner-honest
  framing copy). No props (content is hardcoded copy at this
  iteration).
- `apps/site/components/home/TwoEventShowcase.tsx` — server
  component that imports the two test-event content modules and
  composes two `EventShowcaseCard` instances inside a responsive
  `.home-showcase` grid.
- `apps/site/components/home/EventShowcaseCard.tsx` — server
  component for a single per-event card. Wraps its markup in
  `<ThemeScope theme={getThemeForSlug(content.themeSlug)}>` per
  the per-card wrap-shape contract; consumes
  `content.meta.title`, `content.hero.tagline`,
  `content.hero.dates`, `content.hero.location`, and
  `content.slug` (for the link).

### Modify

- [`apps/site/app/page.tsx`](/apps/site/app/page.tsx) — full
  rewrite from 17-line stub to compose `<main className="home-shell">`
  containing `<HomeHero />` and `<TwoEventShowcase />`. Adds the
  `metadata` export per the page-route metadata-emit contract.
- [`apps/site/app/globals.css`](/apps/site/app/globals.css) —
  extend with a `.home-shell` selector group plus `.home-hero`
  and `.home-showcase` (and per-card class) styles. Plan-drafting
  estimate: 80–150 LOC. The existing globals.css is 677 lines
  and flat; extension is the
  minimal-surprise call. If LOC overshoots, the implementer may
  introduce `apps/site/app/home.css` as a partial imported by
  globals.css and records the deviation in the PR's
  `## Estimate Deviations`.
- [`docs/plans/epics/demo-expansion/m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  Phase Status row 2.1 update per the Phase Status seed contract.

### Intentionally not touched

- [`apps/site/app/layout.tsx`](/apps/site/app/layout.tsx) — root
  metadata (`title`, `metadataBase`) and the platform-Theme
  emit on `<html>` are unchanged. The page's `metadata` export
  cascades alongside.
- [`apps/site/lib/eventContent.ts`](/apps/site/lib/eventContent.ts)
  — EventContent type and registry unchanged; the showcase reads
  the existing shape.
- `apps/site/events/*.ts` — event content modules unchanged; no
  fields added.
- `apps/site/components/event/**` — rich event landing
  components unchanged; the home page does not reuse them.
- `shared/styles/themes/*.ts` — theme registry unchanged.
- [`shared/styles/getThemeForSlug.ts`](/shared/styles/getThemeForSlug.ts)
  — resolver unchanged; the showcase consumes it via the
  existing export.
- [`shared/urls/routes.ts`](/shared/urls/routes.ts) — route table
  unchanged; the showcase card consumes `routes.eventLanding`.
- [`shared/game-config/constants.ts`](/shared/game-config/constants.ts)
  — `featuredGameSlug` left as-is (apps/web consumer remains).
- `apps/web/**` — M2 invariant: apps/site-only diff.
- `supabase/**` — out of scope.
- `tests/**` — no test changes; the home page is a server
  component with no interactive surface to e2e at this phase.
  Self-review confirms no existing Playwright suite asserts
  against `/`'s current stub copy that would now fail.
- `docs/architecture.md`, `docs/product.md`, `README.md` — owned
  by the M2-closing phase per the milestone doc's Documentation
  Currency map; not touched here.

## Execution Steps

This sequence is the planner's pre-implementation estimate of
the expected execution shape per AGENTS.md "Plan content is a
mix of rules and estimates"; the implementer may refine.

1. **Branch hygiene.** Off `main` (clean worktree). Branch name
   follows repo convention `plan/<slug>` — likely
   `plan/m2-phase-2-1-home-page-rebuild`.
2. **Baseline validation.** `npm run lint`, `npm run build:site`
   (confirm green pre-edit).
3. **Reality-check re-run.** Re-verify the inputs named in
   [scoping/m2-phase-2-1.md §Reality-check inputs](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md):
   page.tsx shape unchanged (17 lines), eventContent registry
   contains both test events with `testEvent: true`, theme
   brand-color values unchanged, layout.tsx still does not emit
   `robots`, `.{name}-shell` convention intact, derived-shade
   cascade behavior matches the M1-recorded empirical pinning.
   Manual rendering check on the existing
   `/event/harvest-block-party` route (apps/site dev server)
   confirms `var(--primary)` re-evaluates inside
   `<ThemeScope>` to Harvest pumpkin before binding the
   showcase-card brand-token contract for new components.
4. **Component scaffolds.** Create the three `apps/site/components/home/`
   files with skeleton exports (named props, no markup yet) so
   imports resolve before page composition.
5. **Page rebuild.** Rewrite `apps/site/app/page.tsx` to compose
   the new components inside `<main className="home-shell">` and
   add the `metadata` export per the page-route metadata-emit
   contract.
6. **Hero markup.** Implement `HomeHero` with the partner-honest
   framing copy (explanation-first hero copy with an honesty
   caveat — what is real, what is stubbed at this iteration).
   The implementer drafts the exact words against the epic's
   "Internal-partner audience" invariant and the milestone doc's
   Goal section.
7. **Showcase markup.** Implement `TwoEventShowcase` and
   `EventShowcaseCard` per the wrap-shape, brand-token, and
   link contracts. Hardcode the slug list per the slug-list-
   source contract.
8. **CSS.** Add `.home-shell`, `.home-hero`, `.home-showcase`,
   and showcase-card selectors to
   [`globals.css`](/apps/site/app/globals.css). Responsive grid:
   side-by-side cards on desktop (≥720px or matching apps/site
   convention if one exists), single column below.
9. **Pre-deploy validation.** `npm run lint` + `npm run build:site`
   + `npm run build:web` confirm green.
10. **Open draft PR.** Vercel produces the apps/site preview URL
    on push.
11. **Multi-theme captures (desktop + narrow viewport).** Two
    captures of `/`: one at desktop showing both showcase cards
    side-by-side, one at narrow viewport showing the cards
    stacked into a single column. Both attach to PR body's
    Validation section with the brand-color falsifier sentence
    per the validation-gate procedure; the narrow-viewport
    capture additionally exercises the responsive grid contract.
12. **Noindex curl falsifier.**
    `curl -s -L <preview-url>/ | grep -i 'name="robots"'` —
    confirm the response carries
    `<meta name="robots" content="noindex, nofollow" />`. Record
    output in PR body's Validation section.
13. **Doc commit.** Update milestone-doc Phase Status row per
    the Phase Status seed contract.
14. **Self-review walk.** Walk the audits below against the
    actual diff before marking the PR ready.

## Commit Boundaries

Pre-implementation estimate per AGENTS.md "Plan content is a
mix of rules and estimates":

- **Commit 1 — page rebuild + components + CSS + noindex.**
  `apps/site/app/page.tsx`, three new
  `apps/site/components/home/*.tsx` files, `apps/site/app/globals.css`
  extension. Ships the visible structural change cohesively.
- **Commit 2 — milestone-doc Phase Status seed.**
  `docs/plans/epics/demo-expansion/m2-home-page-rebuild.md` row
  update. Doc-only, separable from the code review.
- **Optional Commit 3+ — review-fix commits.** Per AGENTS.md,
  review-fix commits stay distinct when they clarify history.

If component scope grows beyond the estimate (per scoping
decision 1's fallback authorization), the implementer splits
into 2.1.1 / 2.1.2 mid-flight and records the deviation.

## Validation Gate

The validation procedure that proves this PR ships its goal:

- `npm run lint` — green.
- `npm run build:site` — green; the rebuilt route compiles, no
  new TypeScript errors, no metadata-cascade warnings from
  Next.js.
- `npm run build:web` — green per the PR-template default; the
  diff does not touch apps/web but the build runs as a regression
  guard.
- **Multi-theme capture in PR body's Validation section
  (desktop).** One desktop-viewport screenshot of `/` (≥720px,
  or whatever breakpoint the implementer settles on) showing
  both showcase cards side-by-side in the same frame. The PR
  body names the brand-color falsifier:
  *"the Harvest card's brand surface (border / button / eyebrow)
  reads in a pumpkin family
  ([`#b85c1c`](/shared/styles/themes/harvest-block-party.ts) and
  warmer-shade derivations); the Riverside card's reads in a
  teal-blue family
  ([`#1f5d72`](/shared/styles/themes/riverside-jam.ts) and
  cooler-shade derivations). Both cards rendering in warm-cream
  defaults — or both rendering in the same per-event Theme — is
  the falsifier that the per-card `<ThemeScope>` wrap is not
  applying."*
- **Narrow-viewport capture in PR body's Validation section.**
  One narrow-viewport screenshot of `/` (≤480px, or a
  representative mobile baseline) showing the showcase stacked
  into a single column. The same brand-color falsifier from the
  desktop capture applies — both Themes must remain visibly
  distinct after the layout change. The narrow-viewport
  falsifier adds: *"cards remain side-by-side at narrow width
  (responsive contract regression), or one card overflows the
  viewport, or one card disappears at narrow width."* This
  capture exercises the responsive grid contract named in the
  Files-to-touch CSS estimate; without it, the responsive
  behavior is shipped but unverified.
- **Noindex curl falsifier.**
  `curl -s -L <preview-url>/ | grep -i 'name="robots"'` returns
  `<meta name="robots" content="noindex, nofollow" />`. Output
  recorded in PR body's Validation section. Server-rendered emit
  per the metadata-emit contract; a missing or absent line is
  the falsifier.
- **Plan-to-PR Completion Gate walk.** Every Goal, Self-Review
  audit, Validation step, and Documentation Currency entry is
  satisfied or explicitly deferred-with-rationale-in-this-plan
  before the PR opens.
- **Estimate Deviations callout in PR body.** Per AGENTS.md, the
  PR body names any deviation from this plan's estimate-shaped
  sections (Files to touch, Execution Steps, Commit Boundaries)
  under `## Estimate Deviations`, or `N/A` if none.

The validation gate does **not** include a Tier 5 post-deploy
production check. Scoping decision 5 verified that the rebuild
is a pure JSX + CSS + metadata change with no proxy / CDN /
runtime variance between preview and prod, so preview-deployment
verification is the canonical tier per
[`docs/testing-tiers.md`](/docs/testing-tiers.md). Status flips
to `Landed` in this PR, not `In progress pending prod smoke`.

## Self-Review Audits

Walk the named audits from
[`docs/self-review-catalog.md`](/docs/self-review-catalog.md)
against this PR's diff surfaces. The diff covers four surfaces —
apps/site route rebuild (server JSX), apps/site component family
(server JSX), apps/site CSS extension, and milestone-doc
prose — none of which involve SQL migrations, Edge Functions,
async / lifecycle code, save paths, or operational scripts. The
catalog's audits are scoped to those concerns; **none** apply.

The implementer confirms this enumeration during self-review and
records "no catalog audits apply to this diff surface" in the PR
body's Self-Review section, alongside the milestone-doc-level
sanity walks listed below:

- **Internal-partner honesty invariant.** Hero copy walked
  against the epic's
  [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
  invariant. No marketing-style aspirational copy
  ("the all-in-one platform for…"); explanation-first framing
  with an honest caveat about what is real vs. stubbed at this
  iteration.
- **Two-theme exercise on showcase invariant.** Both showcase
  cards render under independent `<ThemeScope>` wraps reading
  `content.themeSlug` from each event's content module; the
  brand-token contract is honored on both cards; the captured
  validation pair shows the two cards in distinct brand-color
  families.
- **Brand-token discipline.** Every showcase-card style rule
  bearing brand identity reads `var(--primary)`,
  `var(--secondary)`, `var(--accent)`, or `var(--bg)`; no
  `var(--primary-surface)` / `var(--secondary-focus)` /
  `var(--*-shade)` on brand-bearing surfaces.
- **Cross-app navigation invariant (no-op walk).** The home
  page's outbound links target apps/site `/event/<slug>` (via
  `routes.eventLanding(slug)`) — same-app destinations. Self-
  review confirms no link points at an apps/web destination
  without using a plain `<a href>` (no `<Link>` /
  `useRouter().push()` to apps/web).
- **Role-door honesty invariant (no-op walk).** No role-door
  surface ships in this PR. Self-review confirms.
- **Theme route scoping invariant.** `<ThemeScope>` wraps land
  on the showcase cards (per the per-card wrap-shape contract),
  not at the page-`<main>` level; the rest of the home page
  renders against the platform Sage Civic Theme set on
  `<html>` by [`layout.tsx:127-128`](/apps/site/app/layout.tsx).
- **Server-component-only check.** No `'use client'` directive
  in any new file; the home page is server-rendered end-to-end.
  No `useEffect` / `useState` / event handlers; no Request-time
  APIs (`cookies()`, `headers()`, `searchParams`) that would
  flip the route from SSG to SSR.

If any walk surfaces a finding, the implementer fixes it in
this PR (per AGENTS.md "if a reviewer flags a gap that should
have been named at plan time, fix the plan first").

## Documentation Currency PR Gate

Reference:
[m2-home-page-rebuild.md §Documentation Currency](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md).

This PR satisfies the **Phase Status seed** entry only. The
README, architecture.md, and product.md entries are owned by
the M2-closing phase (2.3) per the milestone doc; this PR
explicitly defers them with rationale recorded here.

The milestone-doc Phase Status table row for 2.1 ships in the
doc commit per the Phase Status seed contract above.

## Out Of Scope

Final, not deliberation. Items here are explicitly excluded from
this PR's diff:

- The Harvest narrative section (2.2's scope).
- The three role-door entry points and their auth-state-honest
  copy (2.3's scope).
- Demo-mode auth bypass for test-event slugs (M3's scope).
- Madrona Theme registration (future Madrona-launch epic).
- README, architecture.md, and product.md updates (M2-closing
  phase per the milestone doc).
- Out-of-band assets (icons, illustrations, images, videos). The
  milestone doc's "Out-of-band assets" Settled-by-default
  decision defers asset additions; the home page is text-and-
  color first at this iteration.
- Visual-diff tooling (Playwright pixel-diff baselines). Rejected
  in scoping decision 5 for the same reason as M1 phase 1.1.
- Tier 5 in-progress-pending Status pattern. Rejected in scoping
  decision 5; this PR flips to `Landed` directly.
- Any apps/web change. The milestone doc's apps/site-only scope
  guard binds.
- E2E test additions. The home page has no interactive surface
  warranting Playwright coverage at this phase.
- `featuredGameSlug` consumption. Rejected in scoping decision 4
  (the constant is unregistered in apps/site's content registry
  and is an apps/web legacy concern).
- Reading from `registeredEventSlugs` filtered by `testEvent`.
  Rejected in scoping decision 4 in favor of hardcoding the
  two slugs to keep future test-event additions explicit.
- Layout-level `robots` emit. Rejected in scoping decision 6 in
  favor of route-scoped emit.

## Risk Register

Reference:
[m2-home-page-rebuild.md §Cross-Phase Risks](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md)
for milestone-level risks (role-door copy drift M2↔M3, cross-app
navigation `<Link>` reflexes, page-length sprawl, multi-theme
visible-but-broken, demo-overview content loss).

Plan-implementation-level risks not already covered:

- **Brand-token discipline drift mid-implementation.** The
  showcase-card component is the first new apps/site surface
  consuming brand-tied tokens since the M1-recorded derived-
  shade pinning behavior was empirically verified. A reviewer
  pulling from older muscle-memory ("use `--primary-surface` for
  background tints") could introduce a derived-shade reference
  on a brand-bearing surface that pins to warm-cream regardless
  of the per-card `<ThemeScope>` wrap. Mitigation: the brand-
  token discipline contract above names the rule; the self-
  review audit walks every showcase-card style rule against it;
  the multi-theme capture in the validation gate is the
  observable falsifier.
- **Component-family scope growth.** Three new
  `apps/site/components/home/*.tsx` files is the estimate; the
  implementer may surface a need for a fourth (e.g., a shared
  `EventShowcaseCardLink` if the link surface deserves
  isolation). Mitigation: scoping decision 1's fallback
  authorization names the 2.1.1 / 2.1.2 split if scope grows
  past the in-PR review surface; the implementer records any
  deviation in `## Estimate Deviations`.
- **CSS organization growth.** The estimate is to extend
  [`globals.css`](/apps/site/app/globals.css) in place; if
  `.home-shell` selectors push globals.css past a comfortable
  size, the implementer may introduce a partial. Mitigation:
  apps/site has no current partial-import precedent in
  globals.css, so a partial is a structural deviation worth
  recording in `## Estimate Deviations`.
- **Hero copy honesty drift in plan-to-PR.** "Honest about what
  is real vs. stubbed" is a copy-craft task, not a code rule.
  The implementer drafts the exact words against the invariant;
  reviewers can challenge specific phrasings. Mitigation:
  self-review walks the copy against the
  [`Internal-partner audience`](/docs/plans/epics/demo-expansion/epic.md)
  invariant; if any sentence reads as marketing aspiration, it
  rewrites in the same PR.
- **Vercel preview build difference from prod.** Vercel preview
  builds use the production bundle (`next build` equivalent for
  apps/site) and serve the same CSS / JS. The rebuild is a
  pure JSX + CSS + metadata change with no proxy / CDN-config
  impact, so the preview-vs-prod difference is functionally
  zero for this PR's verification claims. Mitigation: the
  validation gate documents the preview-deployment verification
  surface explicitly so a reviewer can audit the procedure.

## Backlog Impact

Reference:
[m2-home-page-rebuild.md §Backlog Impact](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md).
This PR satisfies no milestone-level closure on its own; the
home-page-rebuild capability closes when the full M2 set lands
(2.1 + 2.2 + 2.3). M2's milestone-level Backlog Impact map binds
unchanged. No phase-level additions opened by this PR.

If implementation surfaces new follow-up entries (post-MVP
features like richer card interactivity, additional event
preview surfaces, etc.), the implementer adds them to
[`docs/backlog.md`](/docs/backlog.md) per AGENTS.md "Feature-
Time Cleanup And Refactor Debt Capture" and records the
addition in the PR body.

## Related Docs

- [`m2-home-page-rebuild.md`](/docs/plans/epics/demo-expansion/m2-home-page-rebuild.md) —
  parent milestone doc. Owns Cross-Phase Invariants,
  Documentation Currency map, Cross-Phase Risks, and Backlog
  Impact this plan binds by reference.
- [`scoping/m2-phase-2-1.md`](/docs/plans/epics/demo-expansion/scoping/m2-phase-2-1.md) —
  scoping doc for this phase. Owns the rejected-alternatives
  deliberation prose for the eight scoping decisions absorbed
  above; deletes in batch with sibling scoping docs at the
  milestone-terminal PR.
- [`epic.md`](/docs/plans/epics/demo-expansion/epic.md) — parent
  epic. M2 paragraph at lines 199-218.
- [`m1-themescope-wiring.md`](/docs/plans/epics/demo-expansion/m1-themescope-wiring.md) —
  predecessor milestone doc. M1 supplied the apps/web
  ThemeScope wiring the showcase's "click-through" story
  depends on visually.
- [`m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md) —
  predecessor plan. Single-PR shape, capture-pair validation,
  brand-token discipline precedent.
- [`themescope-derived-shade-cascade.md`](/docs/plans/themescope-derived-shade-cascade.md) —
  M1-surfaced follow-up that frames the derived-shade discipline
  rule the brand-token contract above binds. M2 phase 2.1 does
  not depend on this follow-up landing first.
- [`event-platform-epic.md`](/docs/plans/event-platform-epic.md) —
  predecessor epic. M2 phase 2.3 of *that* epic delivered the
  current `/` stub this phase rebuilds.
- [`apps/site/app/event/[slug]/page.tsx`](/apps/site/app/event/[slug]/page.tsx) —
  precedent for route-scoped `metadata.robots` (lines 69-71)
  and per-route `<ThemeScope>` wrap (line 106).
- [`apps/site/components/event/EventLandingPage.tsx`](/apps/site/components/event/EventLandingPage.tsx) —
  precedent for section-per-component composition that the new
  `apps/site/components/home/` family mirrors.
- [`apps/site/CLAUDE.md`](/apps/site/CLAUDE.md) and
  [`apps/site/AGENTS.md`](/apps/site/AGENTS.md) — "This is NOT
  the Next.js you know." Implementation reads
  [`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`](/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)
  before binding the metadata-emit contract.
- [`AGENTS.md`](/AGENTS.md) — Phase Planning Sessions, Plan-to-PR
  Completion Gate, Doc Currency PR Gate, Bans on surface require
  rendering the consequence.
