# `shared/styles/` Foundation Extraction

## Status

Proposed.

**Parent epic:** [`event-platform-epic.md`](./event-platform-epic.md),
Milestone M1, Phase 1.5. The epic's M1 row stays `Proposed` until every
phase 1.x plan flips to `Landed`. Sibling phases:
[`shared-db-foundation.md`](./shared-db-foundation.md) (1.1, Landed),
[`shared-urls-foundation.md`](./shared-urls-foundation.md) (1.2, Landed),
[`shared-auth-foundation.md`](./shared-auth-foundation.md) (1.3, Landed),
[`shared-events-foundation.md`](./shared-events-foundation.md) (1.4, Landed).

This plan flips to `Landed` after both subphases below land. Each subphase
is its own PR; each subphase's status row inside this plan flips when its
PR merges. Same two-subphase pattern phases 1.1 and 1.3 used, for the same
reason: the two deliverables have different risk profiles. Subphase 1.5.1
is a doc-only audit whose output is binding for the implementation;
subphase 1.5.2 is a structural refactor of apps/web's SCSS plus a new
shared-package surface plus apps/site visual identity. Reviewers walk
those surfaces with different attention; bundling them dilutes both.

| Subphase | Scope | Status |
| --- | --- | --- |
| 1.5.1 | Token audit + new `docs/styling.md` (doc-only) | Proposed |
| 1.5.2 | `shared/styles/` scaffolding, Sage Civic platform palette, apps/web SCSS migration, apps/site root layout | Proposed |

This plan inherits the **production cookie-boundary verification gate**
named in the epic's M1 validation section. That gate was already
satisfied in [`shared-auth-foundation.md`](./shared-auth-foundation.md)
subphase 1.3.2 against the real frontend-origin auth cookie; nothing in
phase 1.5 touches authentication, so the gate is asserted-still-satisfied
rather than re-run. Subphase 1.5.2's PR cites the existing 1.3.2 evidence
when flipping the epic's M1 row to `Landed`.

## Goal

Stand up `shared/styles/` as the canonical home for the platform's theme
model: the `Theme` TypeScript type, the `<ThemeScope>` React component,
the `getThemeForSlug` resolver, and the platform's own Sage Civic Theme
object as the default for any unregistered slug. Migrate the themable
subset of apps/web's SCSS tokens (per the 1.5.1 audit) to CSS custom
properties so a future per-event Theme object can override them by setting
those properties on a scoped wrapper. Adopt the Sage Civic palette as
apps/site's root layout visual identity via `next/font` (Inter + Fraunces)
and inline-style emission.

**Madrona's `Theme` object and the apps/web event-route ThemeScope wiring
are deliberately deferred to M4 phase 4.1.** The previous epic draft put
both in 1.5.2, which forced a "placeholder Madrona theme = today's
warm-cream values" double pass to satisfy the no-visual-diff gate. With
the deferral, 1.5.2 ships pure infrastructure plus apps/site's platform
identity; the apps/web event-route visual transition (warm-cream →
Madrona's real palette) lands in M4 alongside the Madrona content as the
intentional brand launch. The cascade of this deferral through M2 phase
2.2, M2 phase 2.5, and M4 phase 4.1 is captured in the parent epic.

Behavior-preserving for `apps/web`: every existing route renders
byte-identically because today's warm-cream SCSS values become the
apps/web `:root` CSS-custom-property defaults, and no apps/web event
route is wrapped in `<ThemeScope>` in this phase. The `apps/site`
placeholder gains visible platform identity for the first time — that is
the only user-visible visual change in 1.5.2.

## Cross-Cutting Invariants

These rules thread through every diff line in every subphase. Self-review
walks each one against every changed file in every PR, not only the file
that first triggered the rule.

- **Brand-only skin model.** Events configure their brand surface
  (brand colors, body and heading font families, accent radii, hero
  gradient stops). Status colors (success / redemption status), neutral
  shadows, structural spacing, motion, and z-index stay
  platform-shared. The 1.5.1 audit produces the binding per-token
  classification.
- **Theme route scoping.** `<ThemeScope>` wraps content only on routes
  under `/event/:slug/*`. Routes outside that namespace render against
  neutral `:root` defaults set by their host app's root stylesheet or
  layout. Phase 1.5.2 ships the `<ThemeScope>` component but does **not**
  wire it into any apps/web route; M2 phase 2.2 is the first apps/web
  consumer (per-event admin), M3 phase 3.1 is the first apps/site
  consumer (event landing pages), M4 phase 4.1 wires the existing
  apps/web event routes (game, redeem, redemptions).
- **ThemeScope placement is centralized in apps/web's
  [`App.tsx`](../../apps/web/src/App.tsx) routing dispatcher.** Per-page
  wrapping was rejected during scoping: the invariant is a routing-layer
  rule (URL determines theme), self-review of one dispatcher beats
  self-review of N pages, and M2 / M4 additions stay symmetric.
  apps/site uses its framework-equivalent
  (`apps/site/app/event/[slug]/layout.tsx` in M3 phase 3.1).
- **Theme token discipline.** Themable visual tokens are exposed as CSS
  custom properties and consumed via `var(--token-name)`. Structural
  tokens stay as SCSS variables. Tokens are classified into one bucket,
  not split across both. (Parent epic invariant; this phase makes it
  enforceable.)
- **No env or framework-specific imports inside `shared/styles/`.**
  Anything imported from `shared/styles/` must be Vite-safe **and**
  Next.js-safe. The `<ThemeScope>` component is universal React with no
  `'use client'` directive — it emits inline-style CSS custom properties
  on a wrapper element, which is SSR-safe and requires no React state.
  No `import.meta.env.*`, no `process.env.*`, no `window` access, no
  module-level singleton.
- **No visual diff on existing apps/web routes.** Today's warm-cream
  SCSS values become the apps/web `:root` CSS-custom-property defaults
  encoded byte-identically. The validation gate is a UI-review capture
  pair (before, after) on the existing apps/web routes asserting no
  pixel diff outside anti-aliasing tolerance.

## Naming

- **Module:** `shared/styles/`. Distinct from per-app SCSS
  ([`apps/web/src/styles/`](../../apps/web/src/styles)) which still owns
  apps/web's structural SCSS partials and the apps/web `:root` block.
- **Component:** `ThemeScope`. Universal React component; takes a
  `theme: Theme` prop and renders `children` inside a wrapper element
  whose inline style sets the theme's CSS custom properties.
- **Resolver:** `getThemeForSlug(slug: string): Theme`. Returns the
  registered `Theme` for the slug, or the platform default for any
  unregistered slug. In phase 1.5.2 no per-event themes are registered,
  so every slug resolves to the platform default. M4 phase 4.1
  registers Madrona; M3 phase 3.2 registers test-event themes.
- **Platform Theme:** `shared/styles/themes/platform.ts`. Future
  per-event themes follow the same `<slug>.ts` shape (Madrona's lands
  in M4 at `shared/styles/themes/madrona.ts`).
- **Type:** `Theme` in `shared/styles/types.ts`.
- **CSS custom property names:** flat (`--bg`, `--primary`,
  `--font-body`), matching the existing apps/web `:root` names already
  consumed by 13 SCSS partials. No `--theme-` prefix; rejected during
  scoping because the rename would touch every partial without changing
  meaning.

## Subphase 1.5.1 — Token audit (doc-only)

**Scope.** Walk every token in
[`apps/web/src/styles/_tokens.scss`](../../apps/web/src/styles/_tokens.scss):
~50 colors, 12 spacing values, 4 panel/card/control radii (plus the pill),
3 composite shadows, the font stack, two font weights, four control
sizes, the interactive transition composite, and the focus-ring composite.
Classify each token into one of two buckets:

- **Per-event brand themable** → migrates to a CSS custom property in
  1.5.2; the corresponding `Theme` field exists and per-event themes
  may override it. Examples expected to land here: brand colors
  (`$color-primary`, `$color-secondary`, `$color-accent`), brand-tied
  neutrals (`$color-bg`, `$color-text`, `$color-muted`,
  `$color-surface*`, the warm-white family), hero gradient stops, font
  stack, brand-tied panel/card/control radii.
- **Platform-shared structural** → stays a SCSS variable in
  apps/web; not present in `Theme`. Examples expected to land here:
  spacing scale (`$space-*`), status palette
  (`$color-success`, `$color-status-redeemed-*`,
  `$color-status-reversed-*`), structural shadows
  (`$color-shadow`, `$color-grid-line`, `$color-backdrop-mask`),
  font weights, control sizes, focus ring, interactive transition,
  pill radius, motion durations.

The list above is a hypothesis to be confirmed or refined by the audit, not
a pre-empt. Tokens whose classification is non-obvious (the derived
secondary/primary surface tints `$color-{primary,secondary,accent}-{surface,
border,glow,shadow,…}`, the composite `$shadow-*` shadows, the
`$color-text-disabled-surface` family) are walked individually and the
rationale recorded.

**Color-derivation policy.** The audit also lands the policy for derived
color tokens. Two candidate shapes both fit the brand-only skin model:
(a) the `Theme` exposes only brand bases (~10 fields) and CSS derives
tints/borders/shadows on consumption via `color-mix()`; (b) the `Theme`
exposes every shade as its own field and theme authors populate each.
The audit picks one and records the rationale; 1.5.2 implements
accordingly. The choice has the largest scoping multiplier on 1.5.2 and
must not be left implicit.

**Deliverable.** New
[`docs/styling.md`](../styling.md) covering:

1. Themable vs structural classification table — one row per token, today's
   value, classification, and a one-line rationale where
   non-obvious.
2. Color-derivation policy — option (a) vs (b) above, chosen and
   justified.
3. The `Theme` model — what shape `shared/styles/` exposes, what fields
   each per-event Theme populates, what stays in SCSS.
4. Procedure for adding a new theme — register a new
   `shared/styles/themes/<slug>.ts` exporting a `Theme` object,
   include it in the registry barrel, no other wiring required (the
   resolver picks it up by slug).
5. The platform Sage Civic Theme — the values implemented in 1.5.2,
   recorded for cross-reference (these are also embedded in the
   parent epic at the M1 phase 1.5 description).

**Boundary.** No code changes. The classification table is binding for
1.5.2's migration — any token misclassification surfaced during 1.5.2
sends a doc fix back to `docs/styling.md` in the same PR before the
implementation.

**One PR.**

## Subphase 1.5.2 — `shared/styles/` implementation, Sage Civic platform palette, apps/web SCSS migration

**Scope.**

1. **`shared/styles/` scaffolding.** Modules per the responsibility split
   below: `Theme` type, `<ThemeScope>` component, `getThemeForSlug`
   resolver, platform Theme, registry, public barrel, README.
2. **Platform Sage Civic palette.** Encoded in
   `shared/styles/themes/platform.ts` per the values in the parent epic's
   M1 phase 1.5 description. apps/site's root layout consumes the platform
   Theme via inline-style emission of CSS custom properties on `<html>` or
   `<body>`. `next/font` integration loads Inter (body) and Fraunces
   (heading) as variable fonts with build-time download.
3. **apps/web SCSS migration.** Themable tokens in
   [`apps/web/src/styles/_tokens.scss`](../../apps/web/src/styles/_tokens.scss)
   migrate from `$color-*` SCSS variables to CSS custom properties on
   `:root`. **Default values are today's warm-cream values, encoded
   byte-identically.** The 13 consuming partials update references from
   `$color-…` to `var(--…)` for migrated tokens. Structural tokens (per
   1.5.1 audit) stay as SCSS variables. apps/web routes remain
   un-themed in this phase; the apps/web `:root` defaults serve every
   apps/web route directly.
4. **Component tests.**
   `tests/shared/styles/ThemeScope.test.tsx` renders synthetic test
   themes inside `<ThemeScope>` and asserts CSS custom properties are
   emitted on the wrapper element with the expected values, that
   nested children inherit them, and that two ThemeScope wrappers can
   nest with the inner overriding.
   `tests/shared/styles/getThemeForSlug.test.ts` asserts platform
   default returned for unregistered slugs and is updated to assert
   per-slug resolution when M4 registers Madrona.
5. **AGENTS.md "Styling Token Discipline" rewrite.** Section
   reorganized to introduce themable/structural classification before
   the "use a token" guidance. Themable = CSS custom properties via
   `var(--…)`; structural = SCSS variables. Points at
   [`docs/styling.md`](../styling.md) for the binding classification
   table.

**Deliberately out of scope (deferred to M4 phase 4.1).**

- **No `shared/styles/themes/madrona.ts`.** That file is created in M4.
- **No apps/web event-route ThemeScope wiring.** The parent epic moves
  this to M4 in the same PR that lands Madrona's Theme; that PR is
  where apps/web event routes visually shift from today's warm-cream
  values to Madrona's real palette.
- **No apps/site event-route ThemeScope wiring.** That belongs to M3
  phase 3.1 alongside real apps/site event content.

**Sage Civic platform palette.** The exact values are embedded in the
parent epic at the M1 phase 1.5 description (so the values live with the
phase that owns them). Cross-referenced here for the implementer's
convenience but the epic is the source of truth.

**Validation gate.**
- `npm run lint`
- `npm run build:web`
- `npm run build:site`
- `npm test` (full suite, including new `tests/shared/styles/` files)
- `npm run test:functions` (no edge-function changes; smoke check)
- UI-review capture before edits and after on apps/web routes; assert
  no visual diff outside anti-aliasing tolerance. Routes covered:
  `/`, `/admin`, `/auth/callback`, `/event/<test-slug>/game`,
  `/event/<test-slug>/redeem`, `/event/<test-slug>/redemptions`.
- apps/site placeholder rendered manually after edits to confirm Sage
  Civic palette + Inter + Fraunces apply correctly. This is the only
  intentional visual change in 1.5.2.
- Production cookie-boundary verification gate: assert satisfied per
  1.3.2 evidence; nothing in 1.5.2 touches auth cookies.

## Responsibility Split

- **`shared/styles/types.ts`** — defines the `Theme` type with the field
  set the 1.5.1 audit identified. Expected (subject to audit):
  brand color set (the brand bases per the chosen derivation policy),
  `bodyFontFamily`, `headingFontFamily`, `panelRadius`, `cardRadius`,
  `controlRadius`, `heroGradientStart`, `heroGradientEnd`. Pure type
  module; no runtime values.
- **`shared/styles/themes/platform.ts`** — exports the platform
  Sage Civic Theme object. Sole `Theme`-shaped export.
- **`shared/styles/themes/index.ts`** — registry barrel.
  `themes: Record<string, Theme>` mapping slug → Theme. In 1.5.2 the
  registry is empty (`{}`); M4 phase 4.1 adds the Madrona entry.
- **`shared/styles/getThemeForSlug.ts`** — resolver function.
  `getThemeForSlug(slug)` returns `themes[slug] ?? platformTheme`.
  Pure function, no side effects.
- **`shared/styles/ThemeScope.tsx`** — universal React component.
  Renders `<div style={…CSS custom properties from theme…}>{children}</div>`
  with the inline style emitting one CSS custom property per `Theme`
  field. No effects, no state, no `'use client'`. SSR-safe.
- **`shared/styles/index.ts`** — public barrel. Re-exports `Theme`,
  `ThemeScope`, `getThemeForSlug`, the platform Theme, and the registry.
- **`shared/styles/README.md`** — ownership note in the same shape as
  [`shared/auth/README.md`](../../shared/auth/README.md): what the
  module owns, the no-env / no-framework-imports constraint, the
  brand-only skin model, the placement-in-`App.tsx` invariant, and a
  link back to this plan.
- **[`apps/web/src/styles/_tokens.scss`](../../apps/web/src/styles/_tokens.scss)**
  — the themable subset migrates to CSS custom properties on `:root`.
  Today's warm-cream values are encoded byte-identically. Structural
  SCSS variables stay. The `:root` block is the source-of-truth for
  apps/web's defaults; deliberately separate from
  `shared/styles/themes/platform.ts` (which is apps/site's
  source-of-truth) because apps/web carries today's warm-cream legacy
  defaults until M4 wraps its event routes in ThemeScope. Treating
  these as two independent sources is intentional, not a sync gap.
- **[`apps/web/src/styles/_*.scss`](../../apps/web/src/styles)** (13
  partials) — references migrated from `$color-…` to `var(--…)` for
  every token classified themable by the 1.5.1 audit. Structural
  references unchanged.
- **[`apps/site/app/layout.tsx`](../../apps/site/app/layout.tsx)** —
  imports the platform Theme from `shared/styles/`, emits its CSS
  custom properties as inline style on `<html>` (or equivalent root
  element), wires `next/font` for Inter (body) and Fraunces (heading).
  This is the first apps/site route with real visual identity.
- **[`AGENTS.md`](../../AGENTS.md)** — the "Styling Token Discipline"
  section (currently lines 65–82) is rewritten to introduce
  themable/structural classification before the existing "use a token"
  guidance. Points at `docs/styling.md`.
- **[`docs/architecture.md`](../architecture.md)** — the shared-layer
  description gains a `shared/styles/` bullet under the same heading
  the `shared/db/`, `shared/urls/`, `shared/auth/`, and `shared/events/`
  extractions added.
- **[`docs/dev.md`](../dev.md)** — extended only if the apps/site
  visual-identity change requires a new local-validation step. No new
  validation command expected.
- **[`docs/styling.md`](../styling.md)** — new in 1.5.1. Updated in
  1.5.2 only if the implementation surfaced an audit gap that requires
  a doc fix.
- **This plan** — Status flips on each subphase merge.
- **Parent epic** — M1 row flips to `Landed` in the 1.5.2 PR.

## Files intentionally not touched

- **[`shared/db/`](../../shared/db),
  [`shared/urls/`](../../shared/urls),
  [`shared/auth/`](../../shared/auth),
  [`shared/events/`](../../shared/events)** — sibling shared modules; no
  styling concerns. No changes.
- **[`apps/web/src/App.tsx`](../../apps/web/src/App.tsx)** — ThemeScope
  wiring deferred to M4 phase 4.1. App.tsx unchanged in 1.5.2.
- **[`apps/web/src/pages/GameRoutePage.tsx`](../../apps/web/src/pages/GameRoutePage.tsx),
  [`apps/web/src/pages/EventRedeemPage.tsx`](../../apps/web/src/pages/EventRedeemPage.tsx),
  [`apps/web/src/pages/EventRedemptionsPage.tsx`](../../apps/web/src/pages/EventRedemptionsPage.tsx)**
  — event-route page components stay un-wrapped. M4 wires them.
- **[`apps/site/app/event/[slug]/page.tsx`](../../apps/site/app/event/[slug]/page.tsx)**
  — placeholder event page; no per-event theme wiring in 1.5.2 (M3
  phase 3.1 owns it). Inherits the platform palette via the root
  layout.
- **`shared/styles/themes/madrona.ts`** — does not exist in 1.5.2;
  created in M4 phase 4.1.
- **[`supabase/`](../../supabase)** — no backend touched.

## Execution steps

1. **Pre-edit gate.** Confirm clean worktree, on a feature branch (not
   `main`). Confirm Node and npm versions match
   [`mise.toml`](../../mise.toml) / [`package.json`](../../package.json).
2. **Baseline validation.** Run `npm run lint`, `npm run build:web`,
   `npm run build:site`, `npm test`. All must pass before any edits.
3. **(1.5.1)** Walk every token in `_tokens.scss`. Produce the
   classification table; resolve the color-derivation policy; draft
   `docs/styling.md` covering classification, derivation policy, the
   `Theme` model, the procedure for adding a theme, and a
   cross-reference to the platform Sage Civic values in the parent
   epic.
4. **(1.5.1)** Self-review the audit against the file: every token
   classified, no token doubly-bucketed, every non-obvious case
   rationalized.
5. **(1.5.1)** Open and merge the 1.5.1 PR. Flip the 1.5.1 row in the
   subphase table to `Landed`.
6. **(1.5.2)** Re-run baseline validation on a fresh feature branch.
7. **(1.5.2)** Capture before-state UI-review screenshots on the apps/web
   routes named in the validation gate.
8. **(1.5.2)** Create `shared/styles/` scaffolding: `Theme` type, platform
   Theme, registry, resolver, `<ThemeScope>` component, public barrel,
   README.
9. **(1.5.2)** Add focused component tests at `tests/shared/styles/`.
10. **(1.5.2)** Migrate apps/web themable SCSS tokens to CSS custom
    properties on `:root`, byte-identical values.
11. **(1.5.2)** Update consuming SCSS partials to `var(--…)` for migrated
    tokens.
12. **(1.5.2)** Wire `next/font` and Sage Civic palette emission into
    apps/site's root layout.
13. **(1.5.2)** Rewrite AGENTS.md "Styling Token Discipline" section.
14. **(1.5.2)** Update `docs/architecture.md` shared-layer description to
    include `shared/styles/`.
15. **(1.5.2)** Capture after-state UI-review screenshots on the same
    apps/web routes; confirm no visual diff. Capture apps/site
    placeholder for visual-evidence-of-change.
16. **(1.5.2)** Run full validation: `npm run lint`,
    `npm run build:web`, `npm run build:site`, `npm test`,
    `npm run test:functions`.
17. **(1.5.2)** Self-review per the audits below and per AGENTS.md
    "Self-Review Checklist."
18. **(1.5.2)** Open the 1.5.2 PR. Flip the 1.5.2 row in the subphase
    table to `Landed`, this plan's overall Status to `Landed`, and the
    parent epic's M1 row to `Landed` in the same PR (citing the 1.3.2
    evidence for the inherited cookie-boundary gate).

## Self-Review Audits

From [`docs/self-review-catalog.md`](../self-review-catalog.md), the audits
that match the diff surfaces in this phase:

- **Rename-aware diff classification.** 1.5.2 introduces bulk renames in
  apps/web SCSS partials (`$color-…` → `var(--…)`) that should classify
  as moves rather than content changes; reviewer attention should land
  on the small content diffs (the new shared module, the `:root` block
  changes, the apps/site root layout) rather than on the bulk renames.
- **Effect cleanup audit.** `<ThemeScope>` ships with no effects in the
  inline-style approach; if 1.5.2 introduces React state or effects in
  the implementation, the audit applies and cleanup paths must be
  verified.
- **CLI / tooling pinning audit.** `next/font` is part of `next` (no new
  dep), but Inter and Fraunces are pulled from Google Fonts via
  `next/font/google` — verify the font versions resolve deterministically
  per Next.js 16's pinning behavior. Any new shared-package dependency
  introduced is pinned.
- **Readiness-gate truthfulness audit.** The "no visual diff" gate
  claim must reflect actual UI-review captures, not asserted-by-code
  reasoning. The cookie-boundary gate citation must reference 1.3.2's
  actual evidence run, not be re-asserted.

## Risk Register

- **Audit reveals a token class we hadn't anticipated.** Mitigation:
  1.5.1's PR-level review attention is the place to surface that;
  1.5.2 doesn't begin until 1.5.1 lands.
- **Color-derivation policy choice forces a larger 1.5.2 surface than
  expected.** If the audit picks option (a) — derive in CSS via
  `color-mix()` — every consuming SCSS partial that reads a derived
  surface (e.g., `$color-secondary-surface`) needs a `color-mix()`
  rewrite, not a flat `var(--…)` rename. Mitigation: 1.5.1 walks
  representative consumers when picking the policy; the doc rationale
  must address consumer-rewrite cost, not just `Theme`-author cost.
- **`next/font` integration regression in apps/site.** First time
  apps/site loads custom fonts. Mitigation: `next/font` is the
  standard Next.js 16 path; the apps/site placeholder is the validation
  surface and is small enough to inspect manually.
- **Bulk SCSS renames mask a hand-edit.** A token rename across 13
  partials could hide a one-off content edit in the same diff.
  Mitigation: the rename audit named above is run; 1.5.2's commit
  boundaries separate the bulk rename from any content-change commit.
- **AGENTS.md rewrite reviewer attention.** The Styling Token Discipline
  prose change attracts separate review attention from the code change.
  Mitigation: separate commit for the AGENTS.md rewrite.
- **No visual diff gate failure due to SCSS interpolation precision.**
  CSS custom properties resolved via `var(--…)` are runtime
  substitutions; SCSS-time computed values may differ at the byte level
  even when visually identical. Mitigation: pixel-tolerance gate
  (anti-aliasing tolerance) rather than byte-equal HTML.
- **apps/site placeholder visual change interpreted as a regression.**
  Today the placeholder renders unstyled browser default; 1.5.2 makes
  it Sage Civic. Mitigation: 1.5.2's PR User Behavior section names
  this as the only intentional visual change.

## Documentation

Per AGENTS.md "Doc Currency Is a PR Gate," every doc with a status-oriented
section that this phase touches must reflect the implemented state by the
1.5.2 PR's merge:

- **`docs/styling.md`** — new in 1.5.1.
- **[`docs/architecture.md`](../architecture.md)** — shared-layer
  description gains `shared/styles/` bullet (1.5.2).
- **[`AGENTS.md`](../../AGENTS.md)** — "Styling Token Discipline" section
  rewritten (1.5.2).
- **[`docs/plans/event-platform-epic.md`](./event-platform-epic.md)** —
  M1 phase 1.5 description rewritten in this plan's branch alongside
  the cascade edits to M2 phase 2.2, M2 phase 2.5, and M4 phase 4.1.
  M1 row in the milestone status table flips to `Landed` when 1.5.2
  merges.
- **This plan** — Status flips on each subphase merge.

## Related Docs

- [`AGENTS.md`](../../AGENTS.md) — agent behavior, planning depth,
  doc currency PR gate, Styling Token Discipline (rewritten in 1.5.2)
- [`docs/dev.md`](../dev.md) — contributor workflow source of truth
- [`docs/architecture.md`](../architecture.md) — current system shape
- [`docs/self-review-catalog.md`](../self-review-catalog.md) — named
  self-review audits per surface
- [`docs/plans/event-platform-epic.md`](./event-platform-epic.md) —
  parent epic
- [`docs/plans/framework-decision.md`](./framework-decision.md) —
  Next.js 16 App Router decision; describes `shared/styles/` as
  universal (the `<ThemeScope>` component matches that spec)
- [`shared/auth/README.md`](../../shared/auth/README.md),
  [`shared/events/README.md`](../../shared/events/README.md) — sibling
  module READMEs (precedent for `shared/styles/README.md` shape)
