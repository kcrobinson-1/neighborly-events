# `shared/styles/`

Platform theme model shared across `apps/web` and `apps/site`. Owns
the `Theme` type, the universal `<ThemeScope>` React component, the
`getThemeForSlug` resolver, and the platform Sage Civic Theme. The
per-event registry was empty in M1 phase 1.5.2 and grew with M3
phase 3.2's test events and the
[Madrona demo-build epic](/docs/plans/epics/madrona-demo-build/epic.md)
M1 phase 1.1's Madrona registration.

## What this module owns

- `Theme` — the TypeScript type whose field set defines the brand
  surface a per-event theme can override (brand bases, brand-tied
  gradient stops and admin surfaces, body and heading typography,
  panel/card/control radii). Field set is the binding output of the
  M1 phase 1.5.1 audit
  ([`docs/styling.md`](/docs/styling.md)).
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
- `themes` — the per-event registry. Slug → Theme. Empty in 1.5.2.

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

Per the parent epic's "Deferred ThemeScope wiring" cross-cutting
invariant, ThemeScope is centralized in apps/web's
[`App.tsx`](/apps/web/src/App.tsx) routing dispatcher (not
per-page), and apps/site uses its framework-equivalent
(`apps/site/app/event/[slug]/layout.tsx` in M3 phase 3.1). 1.5.2
ships the component with **no production wiring**. Wiring sites:

- M2 phase 2.2 — apps/web per-event admin (`/event/:slug/admin`)
- M3 phase 3.1 — apps/site event landing pages
- demo-expansion epic M1 phase 1.1 — apps/web event routes (game,
  redeem, redemptions) wrapped in centralized `<ThemeScope>` blocks
- [Madrona demo-build epic](/docs/plans/epics/madrona-demo-build/epic.md)
  M1 phase 1.1 — Madrona's Theme registers under `slug=madrona`,
  driving the brand-launch visual transition from today's warm-cream
  defaults to Madrona's palette on every apps/web event-route shell
  resolving `slug=madrona`

## Source-of-truth split for `:root` defaults

apps/web's `:root` block (in
[`_tokens.scss`](/apps/web/src/styles/_tokens.scss)) carries
today's warm-cream values byte-identically. apps/site's root layout
emits the platform Sage Civic Theme. The two are deliberately
independent sources, not a sync gap — apps/web's `:root` defaults
remain in place for any event-route shell whose slug does not
resolve to a registered Theme. With Madrona registered (Madrona
demo-build epic M1 phase 1.1), apps/web event-route shells carrying
`slug=madrona` render against Madrona's palette via the centralized
`<ThemeScope>` wraps from demo-expansion epic M1 phase 1.1.

## Plan reference

- [`docs/plans/archive/m1/shared-styles-foundation.md`](/docs/plans/archive/m1/shared-styles-foundation.md)
  — phase 1.5 plan (subphase tables, execution steps, validation
  gate)
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  — parent epic (M1 phase 1.5 description carries the Sage Civic
  palette source of truth)
- [`docs/styling.md`](/docs/styling.md) — themable vs.
  structural classification, derivation policy, Theme model,
  procedure for adding a new theme
