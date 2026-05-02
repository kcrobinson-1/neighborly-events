# ThemeScope Derived-Shade Cascade

## Status

Proposed.

## Context

Brand-tied derived shades (`--primary-surface`, `--primary-shadow`,
`--secondary-surface`, `--secondary-focus`, `--accent-surface`,
etc., enumerated in
[`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
lines 134-160) are defined on `:root` as
`color-mix(in srgb, var(--primary) 12%, transparent)` and similar
expressions. The styling design intent
([`docs/styling.md` §Color-Derivation Policy](/docs/styling.md))
assumes per-event themes influence these derived shades through the
brand-base override emitted by `<ThemeScope>`.

**Empirical CSS behavior contradicts the design intent.** When a
custom property's value contains a `var()` reference, browsers
substitute the `var()` at the declaration site and inherit the
substituted computed value to descendants. Inside
`<ThemeScope theme={harvestBlockPartyTheme}>`:

- `var(--primary)` resolves to Harvest pumpkin (`#b85c1c`) — direct
  consumers (button background, link color, heading accents) carry
  the per-event Theme correctly.
- `var(--primary-surface)` inherits the `:root`-substituted value
  `color-mix(in srgb, #d96b2b 12%, transparent)` (warm-cream
  pumpkin) — derived-shade consumers (tinted surface backgrounds,
  focus rings, glows) do NOT pick up the per-event Theme.

This was verified on `/event/harvest-block-party/admin` (M2 phase
2.2 wrap, live since admin landed) and on the three apps/web
event-route shells wrapped by demo-expansion epic M1 phase 1.1
(Harvest game / redeem / redemptions; same partial-Theme behavior).

The visible result on the test-event apps/web routes today is a
mostly-Theme-honest surface (brand colors apply on the dominant
visual elements) with subtly off derived-shade tints (surface
backgrounds, focus rings carry warm-cream tints regardless of
Theme).

## Goal

Make brand-tied derived shades re-evaluate per-`<ThemeScope>` so
the tinted surfaces, borders, focus rings, and shadows visually
follow the per-event Theme alongside the brand bases. After this
change, every `<ThemeScope>` site (apps/web event-route shells +
apps/site event landing) renders fully Theme-honest, not just
brand-base-honest.

## Contracts

### Derivation site moves out of `:root` into `themeToStyle`

[`shared/styles/themeToStyle.ts`](/shared/styles/themeToStyle.ts)
extends to compute literal derived-shade values from the input
`Theme`'s brand bases and emit them as additional CSS custom
properties on the `<ThemeScope>` wrapper element. The derivation
percentages stay the ones currently in `_tokens.scss` (12% surface,
14% strong, 24% border / shadow, etc.) and live in a single
shared list so apps/web and apps/site both produce identical
shades.

`apps/web/src/styles/_tokens.scss` keeps the `--primary-surface`
etc. fallback declarations on `:root` so non-`<ThemeScope>` apps/
web surfaces (the outer `.site-shell`, the demo-overview landing,
any future non-event route) continue to render against warm-cream
defaults. Inside `<ThemeScope>`, the inline-style emission
overrides the `:root` declarations per CSS specificity.

`docs/styling.md`'s "Color-Derivation Policy" section narrows the
"centralized in `:root`" claim to "centralized derivation logic;
emit site is `<ThemeScope>` for themed scopes, `:root` for non-
themed apps/web defaults."

### Theme model unchanged

The `Theme` type stays brand-bases-only — derived shades are
computed by `themeToStyle`, not authored. Theme registry entries
(`shared/styles/themes/*.ts`) need no change. The author-burden
ergonomics scoping decision documented in
[`docs/styling.md` §Color-Derivation Policy](/docs/styling.md)
holds.

## Files to touch

Estimate of expected diff shape:

- `shared/styles/themeToStyle.ts` — extend to compute and emit
  derived shades from brand bases
- `apps/web/src/styles/_tokens.scss` — derived-shade `:root`
  declarations stay (as fallbacks for non-`<ThemeScope>` surfaces);
  the comment narrows to describe the new role
- `docs/styling.md` — Color-Derivation Policy paragraph narrows
- `docs/architecture.md` — `<ThemeScope>` description updates if
  the derived-shade emit surface is named there

## Validation Gate

- `npm run lint`, `npm run build:web`, `npm run build:site` green
- Manual inspection of `--primary-surface` / `--secondary-focus` /
  `--accent-glow` values inside `<ThemeScope>` for both test events
  + Sage Civic platform Theme: each should resolve to the per-Theme
  brand base at the named percentage, not the warm-cream `:root`
  value
- UI-review capture pairs on the Harvest game route: today's
  partial-Theme rendering vs. the new full-Theme rendering, one
  screenshot pair per surface that visibly carries a derived shade
  (button-pressed surface tint, focus ring on form fields, panel
  glow on hover). Falsifier: any surface that visibly changed
  between captures should be visibly Theme-tinted post-change

## Out of Scope

- Reclassifying any token between themable and structural buckets
  (`docs/styling.md` table stays as-is)
- Adding new Theme fields (Theme stays brand-bases-only)
- Changing the derivation percentages
- Apps/site root layout's themeToStyle consumption — apps/site
  already uses `themeToStyle` directly on `<html>`, so the change
  flows through automatically with no apps/site-specific work

## Related Docs

- [`docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md) —
  surfaces this issue in its Risk Register; this plan is the
  follow-up that closes the partial-Theme-honesty gap
- [`docs/styling.md`](/docs/styling.md) — Color-Derivation Policy
- [`shared/styles/themeToStyle.ts`](/shared/styles/themeToStyle.ts) —
  emit site
- [`shared/styles/ThemeScope.tsx`](/shared/styles/ThemeScope.tsx) —
  consumer of `themeToStyle`
- [`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss) —
  derived-shade `:root` definitions (fallback role after this
  plan lands)
