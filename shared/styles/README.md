# `shared/styles/`

Platform theme model shared across `apps/web` and `apps/site`. Owns
the `Theme` type, the universal `<ThemeScope>` React component, the
`getThemeForSlug` resolver, the platform Sage Civic Theme, and the
per-event Theme registry.

## What this module owns

- `Theme` — the TypeScript type whose field set defines the brand
  surface a per-event theme can override (brand bases, brand-tied
  gradient stops and admin surfaces, body and heading typography,
  panel/card/control radii, plus the optional brand fields below).
  Field set is the binding output of the token audit documented in
  [`docs/styling.md`](/docs/styling.md), extended by the Madrona
  redesign token vocabulary.
- `ThemeScope` — universal React component (no `'use client'`, no
  effects, no state) that emits the Theme as inline-style CSS custom
  properties on a `<div className="theme-scope">` wrapper. SSR-safe;
  apps/site renders it as a server component, apps/web renders it
  without hydration concerns.
- `getThemeForSlug(slug: string): Theme` — pure resolver. Returns
  the registered Theme if `slug` appears in
  [`themes/index.ts`](/shared/styles/themes/index.ts), otherwise the platform
  Sage Civic Theme.
- `platformTheme` — the platform Sage Civic Theme, consumed as
  apps/site's root-layout default and as the resolver fallback.
- `themes` — the per-event registry. Slug → Theme.

## Brand-only skin model

Per-event Themes specify only the brand surface — bases, typography,
radii, gradient stops. They do not redefine status colors (success
green stays green across themes), neutral drop-shadow, modal scrim,
spacing scale, motion timing, font weights, control sizes,
focus-ring width, or pill radius. Those live as platform-shared SCSS
variables in `apps/web/src/styles/_tokens.scss` and as parallel
structural values in apps/site.

Brand-tied derived shades (`--primary-surface`, `--secondary-focus`,
the alpha tints of brand bases) are **not** Theme fields. They are
declared in each app's `:root` block as `color-mix()` derivations of
the brand bases the Theme emits — option (a) with centralized
derivation per the audit. Per-event themes do not override derived
shades directly; if a future theme genuinely needs a non-standard
derivation, the resolution is to revise
[`docs/styling.md`](/docs/styling.md) and the `:root` policy in
a follow-up PR before the theme lands, not to add a typed escape
hatch in `Theme`.

## Optional brand fields

A `Theme` may set optional fields beyond the required surface:

- `headerBg` / `headerFg` (sticky event header bar, `--header-bg` /
  `--header-fg`), `surfaceBand` (tinted full-width band surface,
  `--surface-band`), `accentFontFamily` (short warm accent face,
  `--font-accent`).
- The quiz-surface vocabulary (Madrona redesign R4): `pageSurface`,
  `gridLine`, `panelSurface` / `panelBorder` / `panelShadow`,
  `pageHeadSurface` / `pageHeadRule` / `pageHeadMargin` /
  `pageHeadPadding`, `optionBorder` /
  `optionSelectedBorderColor` / `optionSelectedSurface`,
  `codeSurface` / `codeBorder`, `ctaSurface` / `ctaFg` /
  `ctaWarmSurface` / `ctaWarmFg`, and `sponsorLabel`. These let a
  theme trade the platform's floating-panel look for a flat
  full-bleed one (Madrona's cream page / putty page-head band /
  olive option rows) with no event-keyed branches in components.

A theme that omits an optional field renders byte-identically to the
pre-extension emission: `themeToStyle.ts` derives the default from
required fields (or the documented structural literal), and
apps/web's `:root` carries a matching `var()`-form fallback.
`pageHeadTitleSize` and `headingLetterSpacing` are the exception —
they are emitted only when set, because call sites carry per-site
structural fallbacks in `var(--…, fallback)` form. Existing themes
are not edited when an optional field lands. The classification and
default-derivation contract lives in
[`docs/styling.md`](/docs/styling.md) "Optional brand fields".

## Self-hosted event fonts

Font-family values in a Theme may name self-hosted faces. Event brand
fonts (Madrona: Bebas Neue, Poppins, Lora Italic) ship as woff2
duplicated per app — `apps/site/public/fonts/` and
`apps/web/public/fonts/`, with `FONT-LICENSES.txt` alongside — and
are declared in each app's `_fonts.scss` partial. `@font-face`
declarations are inert for themes whose stacks do not name them, so
non-Madrona events download no font bytes.

## No env or framework-specific imports

Anything imported from `shared/styles/` must be Vite-safe **and**
Next.js-safe. No `import.meta.env.*`, no `process.env.*`, no `window`
access, no module-level singleton. `<ThemeScope>` is universal React
with no `'use client'` directive. `bodyFontFamily` and
`headingFontFamily` are font-family value strings — when an app uses
`next/font` (apps/site), the platform Theme references the
`next/font` CSS variables (`var(--font-inter)`,
`var(--font-fraunces)`) which apps/site's root layout sets on
`<html>`.

## ThemeScope placement

ThemeScope is centralized in apps/web's
[`App.tsx`](/apps/web/src/App.tsx) routing dispatcher (not per-page),
and apps/site uses its framework-equivalent at
`apps/site/app/event/[slug]/layout.tsx`. Wiring sites in apps/web
cover the per-event admin, game, redeem, and redemptions routes;
apps/site wires ThemeScope on event landing pages.

## Source-of-truth split for `:root` defaults

apps/web's `:root` block (in
[`_tokens.scss`](/apps/web/src/styles/_tokens.scss)) carries
today's warm-cream values. apps/site's root layout emits the
platform Sage Civic Theme. The two are deliberately independent
sources, not a sync gap — apps/web's `:root` defaults remain in
place for any event-route shell whose slug does not resolve to a
registered Theme. Event-route shells whose slug DOES resolve render
against the registered Theme via the centralized `<ThemeScope>`
wraps.

## Reference

- [`docs/styling.md`](/docs/styling.md) — themable vs.
  structural classification, derivation policy, Theme model,
  procedure for adding a new theme
