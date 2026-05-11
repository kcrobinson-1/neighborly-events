# ThemeScope Derived-Shade Cascade

## Status

Landed.

### Plan-to-Landed walk

- **Goal — derived shades re-evaluate per-`<ThemeScope>`.** Satisfied.
  `themeToStyle.ts` now emits resolved-hex `color-mix()` literals for
  every derived shade on the `<ThemeScope>` wrapper. Computed-value
  sweep confirms `--primary-surface` resolves to the per-Theme base
  hex on all four apps/web ThemeScope-wrapped routes (Harvest admin,
  game, redeem, redemptions; Riverside game) and on apps/site Sage
  Civic platform landing.
- **Contract — derivation site moves to `themeToStyle`.** Satisfied.
  String-passthrough strategy implemented: `themeToStyle` builds
  `color-mix(in srgb, <theme-base-hex> N%, transparent)` literals
  with the resolved hex baked in, sidestepping the `var()`
  inheritance trap. `:root` declarations in `_tokens.scss` retained
  as fallback for non-`<ThemeScope>` apps/web surfaces; comment
  narrowed to describe the new role.
- **Contract — Theme model unchanged.** Satisfied. No new fields on
  `Theme`; theme registry entries unchanged.
- **Validation Gate — lint + build:web + build:site green.**
  Satisfied.
- **Validation Gate — computed-value inspection across both test
  events + Sage Civic platform Theme.** Satisfied. Falsifier
  confirmed: apps/web `/` (no `<ThemeScope>`) retains warm-cream
  `:root` fallback (`--primary-surface` resolves to
  `color-mix(in srgb, #d96b2b 12%, transparent)`).
- **Validation Gate — UI-review capture pairs across four apps/web
  ThemeScope shells + apps/site Sage Civic landing.** Satisfied at
  the headline-pair strictness (Harvest game pre/post) plus
  spot-checks on Harvest admin, Riverside game, and Sage Civic
  landing post-fix. Visible delta on the headline pair: the
  "Open attendee demo" derived-shade button shifts from cool
  grey-blue (pre-fix, `:root` blue secondary leaking) to warm
  pumpkin (post-fix, Harvest secondary correctly applied).

### Out-of-scope finding surfaced during verification

Verification turned up an unrelated structural-color leak: the
error-state `<h1>` rendered inside `<ThemeScope>` (`This event
admin isn't available right now.` / `This game couldn't load right
now.`) computes `rgb(31, 58, 50)` regardless of Theme, despite
the wrapper correctly setting `--text` to the per-Theme value.
That `<h1>` is hardcoded to a non-themable color rather than
consuming `var(--text)`. Out of scope for this plan (which targets
the derived-shade cascade specifically); a future task can move
the error-page typography onto themable variables.

## Context

Brand-tied derived shades (`--primary-surface`, `--primary-shadow`,
`--secondary-surface`, `--secondary-focus`, `--accent-surface`,
`--text-disabled-surface`, `--grid-line`, etc., enumerated in
[`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
lines 148-170) are defined on `:root` as
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

The empirical-verification artifact lives in the M1 phase 1.1
Risk Register at
[`docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md`](/docs/plans/epics/demo-expansion/m1-phase-1-1-plan.md)
lines 454-469, captured against `/event/harvest-block-party/game`
after the M1 wrap landed. The same partial-Theme behavior was
observed earlier on `/event/harvest-block-party/admin` (M2 phase
2.2) and applies to all four apps/web event-route shells now
wrapped by `<ThemeScope>` (admin, game, redeem, redemptions —
[`apps/web/src/App.tsx`](/apps/web/src/App.tsx) lines 61-141).

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

The full set in scope: every `:root` declaration at
[`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
lines 148-170, including the two `--text`-derived shades
(`--text-disabled-surface`, `--grid-line`) — `--text` is themable,
so its derivatives must re-evaluate per-`<ThemeScope>` for the
same reason. The structural composite `--shadow` (line 176) is
not in scope; it derives from the SCSS `$shadow-panel` literal,
not a themable base.

The derivation strategy is string passthrough: emit
`color-mix(in srgb, <theme-base-hex> 12%, transparent)` as a
literal string with the resolved hex baked in (no `var()`
reference, so no inheritance trap). The browser still performs
the blend; only the substitution site moves.

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
- `tests/shared/styles/ThemeScope.test.tsx` — flips the
  `:root`-derivation assertion at line 88 to assert derived shades
  appear on the wrapper's inline style; new test exercises the
  per-Theme value computation
- `docs/styling.md` — Color-Derivation Policy paragraph narrows
- `docs/architecture.md` — `<ThemeScope>` description updates if
  the derived-shade emit surface is named there

## Validation Gate

- `npm run lint`, `npm run build:web`, `npm run build:site` green
- Manual inspection of `--primary-surface` / `--secondary-focus` /
  `--accent-glow` / `--text-disabled-surface` values inside
  `<ThemeScope>` for both test events + Sage Civic platform Theme:
  each should resolve to the per-Theme brand base at the named
  percentage, not the warm-cream `:root` value. This is the
  load-bearing correctness check — visible-but-subtle rendering
  is right-by-construction once computed values match.
- UI-review capture pairs covering all four apps/web ThemeScope-
  wrapped shells (admin, game, redeem, redemptions on the Harvest
  test event) plus apps/site (Sage Civic platform landing): one
  screenshot pair per surface that visibly carries a derived shade
  (button-pressed surface tint, focus ring on form fields, panel
  glow on hover, draft-row tint on admin, selected-row highlight
  on admin). Falsifier: any surface that visibly changed between
  captures should be visibly Theme-tinted post-change; any surface
  outside `<ThemeScope>` (apps/web `.site-shell`, demo-overview
  landing) should be byte-identical between captures.

## Out of Scope

- Reclassifying any token between themable and structural buckets
  (`docs/styling.md` table stays as-is)
- Adding new Theme fields (Theme stays brand-bases-only)
- Changing the derivation percentages
- Migrating `--shadow` ([_tokens.scss line 176](/apps/web/src/styles/_tokens.scss))
  — structural composite from `$shadow-panel`, not themable
- Apps/site root layout's themeToStyle consumption — apps/site
  already uses `themeToStyle` directly on `<html>`, so the change
  flows through to apps/site automatically; gate still captures
  apps/site to confirm

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
