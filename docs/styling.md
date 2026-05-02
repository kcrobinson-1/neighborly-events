# Styling Tokens And Themes

## Status

Audit landed in M1 phase 1.5.1 of the Event Platform Epic. The
classification and color-derivation policy below are **binding** for
the implementation in M1 phase 1.5.2; any token misclassification
surfaced during 1.5.2 sends a doc fix back here in the same PR before
the implementation continues. See
[`docs/plans/shared-styles-foundation.md`](/docs/plans/shared-styles-foundation.md)
and the parent epic
[`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md)
for context.

## Purpose

Two things need to be true at once for the platform's styling layer:

- per-event branding can override colors, typography, hero gradient
  stops, and panel/card/control radii without touching SCSS
- platform-wide structural concerns (spacing, motion, status meaning,
  modal scrim, focus-ring metrics, drop-shadow neutrals) stay constant
  across events

This doc names which tokens fall into which bucket, the policy for
deriving brand-tied surface tints, the `Theme` model that
`shared/styles/` exposes, and the procedure for adding a new theme.

It does **not** cover when to add a new token at all — that decision
lives in [`AGENTS.md`](/AGENTS.md) "Styling Token Discipline."

## Two Buckets

Every token in
[`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
is classified into one of two buckets. No token is split across both.

- **Per-event brand themable.** Migrates to a CSS custom property in
  M1 phase 1.5.2; the corresponding `Theme` field exists and per-event
  themes may override it. Consumed in SCSS as `var(--…)`.
- **Platform-shared structural.** Stays a SCSS variable in
  apps/web; not present in `Theme`. Consumed in SCSS as `$…`. May be
  bridged into a CSS custom property in apps/web's `:root` for
  consumer ergonomics (e.g., today's `--shadow`), but never
  overridden by `<ThemeScope>`.

The shorthand: **themable = brand surface; structural = platform
contract**. Status colors, modal scrim, neutral drop-shadow, spacing
scale, motion timing, focus-ring metrics, and font weights are
platform contracts. Brand bases, brand-tied neutrals, brand-tied
gradient stops, brand-tied radii, and brand typography are themable.

## Classification Table

Today's `apps/web` warm-cream values are listed for cross-reference;
they are the values M1 phase 1.5.2 encodes byte-identically as the
apps/web `:root` defaults so existing routes render unchanged. The
platform Sage Civic values are recorded under "Platform Sage Civic
Theme" below; per-event theme values land later (Madrona in M4 phase
4.1).

### Brand bases — themable

| Token | Today's apps/web value | Theme field | CSS custom property | Notes |
| --- | --- | --- | --- | --- |
| `$color-bg` | `#f6f1e7` | `bg` | `--bg` | Page background. |
| `$color-surface` | `rgba(255,252,245,0.92)` | `surface` | `--surface` | Default panel surface. |
| `$color-surface-strong` | `rgba(255,249,239,0.98)` | `surfaceStrong` | `--surface-strong` | Modal / sticky / emphasized panels. |
| `$color-surface-card` | `rgba(255,250,243,0.9)` | `surfaceCard` | `--surface-card` | Card-shaped panels (admin rows, redeem cards, redemptions cards). |
| `$color-surface-card-muted` | `rgba(255,250,243,0.88)` | `surfaceCardMuted` | `--surface-card-muted` | Muted card variant (landing). |
| `$color-text` | `#1f3a32` | `text` | `--text` | Primary text. |
| `$color-muted` | `#53645e` | `muted` | `--muted` | Secondary text. |
| `$color-border` | `rgba(31,58,50,0.12)` | `border` | `--border` | Default border. (Today's `:root` also exposes this as `--surface-border`; 1.5.2 renames to `--border` for naming alignment.) |
| `$color-border-soft` | `rgba(31,58,50,0.09)` | `borderSoft` | `--border-soft` | Lighter border (mixin default). |
| `$color-border-muted` | `rgba(31,58,50,0.1)` | `borderMuted` | `--border-muted` | Mid-weight border (admin/redeem/redemptions rows, progress track). |
| `$color-primary` | `#d96b2b` | `primary` | `--primary` | Brand primary. |
| `$color-secondary` | `#2f6f8f` | `secondary` | `--secondary` | Brand secondary (interactive accent — selection, focus). |
| `$color-accent` | `#e3b23c` | `accent` | `--accent` | Brand accent. |
| `$color-white-warm` | `#fff8f1` | `whiteWarm` | `--white-warm` | Brand-tied warm white (button label foreground). |
| `$color-white-panel` | `#fffaf3` | `whitePanel` | `--white-panel` | Brand-tied warm white (panel surface). |
| `$color-white-tint` | `#fffef9` | `whiteTint` | `--white-tint` | Brand-tied warm white (game completion / redeem highlight). |

### Brand-tied gradient stops and admin surfaces — themable

| Token | Today's apps/web value | Theme field | CSS custom property | Notes |
| --- | --- | --- | --- | --- |
| `$color-page-gradient-start` | `#fbf7ef` | `pageGradientStart` | `--page-gradient-start` | Page background gradient stop. |
| `$color-page-gradient-end` | `#efe4cf` | `pageGradientEnd` | `--page-gradient-end` | Page background gradient stop. |
| `$color-hero-surface-start` | `rgba(255,250,242,0.98)` | `heroStart` | `--hero-start` | Hero panel gradient stop. |
| `$color-hero-surface-end` | `rgba(247,241,231,0.95)` | `heroEnd` | `--hero-end` | Hero panel gradient stop. |
| `$color-admin-input-surface` | `rgba(255,252,245,0.98)` | `adminInputSurface` | `--admin-input-surface` | Admin input field surface. Brand-tied warm white at near-opaque alpha. |
| `$color-draft-row-surface` | `rgba(255,250,243,0.82)` | `draftRowSurface` | `--draft-row-surface` | Admin draft list row surface. Brand-tied warm white. |

### Brand-tied derived shades — themable, derived from brand bases

These are pure alpha tints of `$color-primary`, `$color-secondary`, or
`$color-accent`, plus two text-derived overlay tints. Per the
**color-derivation policy** below, M1 phase 1.5.2 emits these as CSS
custom properties in `:root` derived from the corresponding base via
`color-mix()`, so per-event themes only specify brand bases and the
derived shades follow automatically. SCSS consumers continue to read
flat `var(--…)` references — no `color-mix()` call sites in
partials.

| Today's token | Today's value | Derives from | Mix percentage | CSS custom property |
| --- | --- | --- | --- | --- |
| `$color-primary-surface` | `rgba(217,107,43,0.12)` | `--primary` | 12% | `--primary-surface` |
| `$color-primary-surface-strong` | `rgba(217,107,43,0.14)` | `--primary` | 14% | `--primary-surface-strong` |
| `$color-primary-border` | `rgba(217,107,43,0.24)` | `--primary` | 24% | `--primary-border` |
| `$color-primary-shadow` | `rgba(217,107,43,0.24)` | `--primary` | 24% | `--primary-shadow` |
| `$color-secondary-surface` | `rgba(47,111,143,0.1)` | `--secondary` | 10% | `--secondary-surface` |
| `$color-secondary-surface-strong` | `rgba(47,111,143,0.14)` | `--secondary` | 14% | `--secondary-surface-strong` |
| `$color-secondary-surface-selected` | `rgba(47,111,143,0.18)` | `--secondary` | 18% | `--secondary-surface-selected` |
| `$color-secondary-surface-pending` | `rgba(47,111,143,0.12)` | `--secondary` | 12% | `--secondary-surface-pending` |
| `$color-secondary-border-subtle` | `rgba(47,111,143,0.18)` | `--secondary` | 18% | `--secondary-border-subtle` |
| `$color-secondary-border-pending` | `rgba(47,111,143,0.24)` | `--secondary` | 24% | `--secondary-border-pending` |
| `$color-secondary-border-selected` | `rgba(47,111,143,0.56)` | `--secondary` | 56% | `--secondary-border-selected` |
| `$color-secondary-focus` | `rgba(47,111,143,0.42)` | `--secondary` | 42% | `--secondary-focus` |
| `$color-secondary-glow` | `rgba(47,111,143,0.22)` | `--secondary` | 22% | `--secondary-glow` |
| `$color-accent-surface` | `rgba(227,178,60,0.18)` | `--accent` | 18% | `--accent-surface` |
| `$color-accent-surface-muted` | `rgba(227,178,60,0.14)` | `--accent` | 14% | `--accent-surface-muted` |
| `$color-accent-surface-pending` | `rgba(227,178,60,0.12)` | `--accent` | 12% | `--accent-surface-pending` |
| `$color-accent-border` | `rgba(227,178,60,0.26)` | `--accent` | 26% | `--accent-border` |
| `$color-accent-glow` | `rgba(227,178,60,0.28)` | `--accent` | 28% | `--accent-glow` |
| `$color-text-disabled-surface` | `rgba(31,58,50,0.18)` | `--text` | 18% | `--text-disabled-surface` |
| `$color-grid-line` | `rgba(31,58,50,0.04)` | `--text` | 4% | `--grid-line` |

`$color-text-disabled-surface` and `$color-grid-line` are the same
RGB as `$color-text` at low alpha — the disabled-button overlay
visually inherits the foreground color, and the layout grid pattern
is a low-opacity foreground tint. Both are themable so they track the
brand text color when a per-event Theme overrides it.

### Typography — themable (family); structural (weights)

| Token | Today's apps/web value | Bucket | Theme field | CSS custom property |
| --- | --- | --- | --- | --- |
| `$font-stack` | `"Avenir Next", "Segoe UI", sans-serif` | Themable | `bodyFontFamily` | `--font-body` |
| (no heading split today) | (defaults to body) | Themable | `headingFontFamily` | `--font-heading` |
| `$font-weight-semibold` | `600` | Structural | — | (stays SCSS) |
| `$font-weight-bold` | `700` | Structural | — | (stays SCSS) |

apps/web today does not split body and heading typography — every
heading uses `$font-stack`. The Theme type still exposes
`headingFontFamily` so apps/site (Sage Civic uses Fraunces) and
future per-event themes can split. apps/web's `:root` defaults
`--font-heading` to the same value as `--font-body` so byte-identical
rendering holds.

Font weights are platform-shared because semibold/bold weight
conventions are typographic structure, not brand: a per-event theme
that wanted to shift its emphasis weight would do so by swapping the
font family, not by re-defining what "semibold" means.

### Themable radii

| Token | Today's apps/web value | Theme field | CSS custom property | Notes |
| --- | --- | --- | --- | --- |
| `$radius-panel` | `28px` | `panelRadius` | `--radius-panel` | Brand-tied (large surfaces). |
| `$radius-panel-mobile` | `24px` | `panelRadiusMobile` | `--radius-panel-mobile` | Mobile variant of panel radius — same theming axis. |
| `$radius-card` | `22px` | `cardRadius` | `--radius-card` | Brand-tied (card surfaces). |
| `$radius-control` | `18px` | `controlRadius` | `--radius-control` | Brand-tied (buttons, inputs). |

### Structural — platform-shared

These stay as SCSS variables in apps/web and are not present in the
`Theme` type. Where a CSS custom property already exists (today's
`--shadow`), it stays as a structural bridge defined in `:root` from
its SCSS composite — not a Theme field.

| Token | Today's apps/web value | Reason it is structural |
| --- | --- | --- |
| `$color-success` | `#3f8f5a` | Status meaning (green = success) is a platform contract; per-event themes do not redefine "success." |
| `$color-success-surface` | `rgba(63,143,90,0.16)` | Derived from success status. |
| `$color-success-surface-muted` | `rgba(63,143,90,0.12)` | Derived from success status. |
| `$color-success-border` | `rgba(63,143,90,0.18)` | Derived from success status. |
| `$color-status-redeemed-surface` | `$color-success-surface` | Status badge palette (B.2a redemption monitoring). Today aliases success-surface; stays platform-shared. |
| `$color-status-redeemed-foreground` | `#2a6a40` | Status badge foreground. |
| `$color-status-reversed-surface` | `$color-accent-surface-muted` | Status badge palette (B.2b reversal). Today aliases accent-surface-muted as a coincidence of MVP-era reuse; **decoupled in 1.5.2 to a literal `rgba(227,178,60,0.14)`** so reversed-status meaning does not silently shift when a per-event Theme overrides accent. |
| `$color-status-reversed-foreground` | `#8a6a1c` | Status badge foreground. |
| `$color-shadow` | `rgba(42,42,42,0.12)` | Neutral gray drop-shadow color; not brand. |
| `$color-backdrop-mask` | `rgba(0,0,0,0.35)` | Modal scrim; pure black at low alpha; not brand. |
| `$space-1` … `$space-12` | `4px` … `28px` | Spacing scale; structural rhythm. |
| `$space-site-bottom` | `40px` | Page bottom padding; structural layout. |
| `$control-min-height` | `64px` | Mobile-first tap target floor; structural. |
| `$progress-track-height` | `10px` | Progress bar height; structural. |
| `$token-block-min-height` | `184px` | Token-block min height; structural. |
| `$token-spinner-size` | `16px` | Spinner size; structural. |
| `$radius-pill` | `999px` | Pill shape is the same on every theme; not brand-overridable. |
| `$shadow-panel` | `0 24px 60px $color-shadow` | Composite of structural offset/blur and the structural neutral shadow color. **Today's `--shadow` custom property bridge stays** as a non-themable convenience definition in `:root`. |
| `$shadow-primary` | `0 16px 28px $color-primary-shadow` | Composite of structural offset/blur and the **themable** `--primary-shadow` derived shade. The composite stays SCSS; the color slot becomes `var(--primary-shadow)` so the shadow color tracks the brand primary on per-event themes. |
| `$shadow-selected` | `inset 0 0 0 1px $color-secondary-border-subtle, 0 10px 18px $color-secondary-surface` | Composite of structural metrics and **themable** brand-secondary derived shades. The composite stays SCSS; color slots become `var(--secondary-border-subtle)` and `var(--secondary-surface)` so the selection treatment tracks the brand secondary on per-event themes. |
| `$transition-interactive` | `transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease` | Motion timing is platform-shared. |
| `$focus-ring` | `3px solid $color-secondary-focus` | Composite of structural ring width and **themable** `--secondary-focus`. The composite stays SCSS; the color slot becomes `var(--secondary-focus)` so the focus ring tracks the brand secondary on per-event themes. |

### A third pattern — SCSS composites around themable colors

`$shadow-primary`, `$shadow-selected`, and `$focus-ring` are
inherently composite: structural metrics (offset, blur, ring width)
combined with brand-tied colors. Splitting these into either bucket
loses information. The compromise:

- **The composite stays as a SCSS variable** so the structural
  metrics remain platform-shared and authors do not specify `0 10px
  18px …` per theme.
- **The color slot inside the composite uses `var(--…)` references**
  to themable derived shades, so per-event Themes still influence the
  composite's color through the underlying base override.

This is not a third bucket; it's a recipe: composites whose color
slots resolve at runtime via `var(--…)`. The composite itself is
classified as structural (it is not a Theme field), but the color
component remains themable through the base it derives from.

## Color-Derivation Policy

The audit picks **option (a) with centralized derivation**: per-event
Themes specify only the brand bases (~10 fields plus typography and
radii), and CSS derives every brand-tied surface / border / glow /
shadow tint via `color-mix()` definitions in `:root`. SCSS consumers
read flat `var(--…)` references — no `color-mix()` call sites in
SCSS partials.

The two candidates the plan named were:

- **(a) bases + CSS-derived shades.** Theme exposes ~10 brand bases;
  derived shades come from `color-mix()`.
- **(b) enumerated shades.** Theme exposes every shade as its own
  field; per-event theme authors populate ~30 fields per theme.

Option (a) is chosen because:

1. **Theme author burden scales.** The epic ships 3–4 themes within
   its own boundary (Sage Civic platform palette in 1.5.2; two test
   event themes in M3 phases 3.1 and 3.2 — see
   [m3-site-rendering.md](/docs/plans/m3-site-rendering.md); Madrona
   in M4 phase 4.1) and many more after. ~10 fields per theme vs ~30 compounds in author
   ergonomics across that horizon.
2. **Visual consistency by construction.** Brand-tied surfaces always
   derive from the corresponding brand base, so an author cannot
   accidentally desync (for example) `secondary-surface` from
   `secondary` by editing only one and forgetting the other.
3. **Consumer rewrite is one-time and bounded.** The plan's risk
   register flags option (a)'s per-consumer rewrite cost across 13
   SCSS partials. **Centralizing the derivation in `:root` dodges
   this**: derived shades become `:root` custom properties whose
   values are `color-mix(...)` expressions, and SCSS consumers
   continue to read flat `var(--…)` references. The 1.5.2 SCSS
   partial diff is therefore a flat `$color-…` → `var(--…)` rename,
   not a `color-mix()` rewrite at every call site.

The browser-support cost is acceptable: `color-mix()` is supported in
Chromium 111+, Firefox 113+, and Safari 16.2+, all of which fall
inside the project's modern-evergreen target.

The byte-identical guarantee for apps/web's existing routes holds
because today's derived shades are pure alpha tints of their bases at
the percentages listed in the "Brand-tied derived shades" table:
`color-mix(in srgb, var(--secondary) 10%, transparent)` produces
exactly `rgba(47,111,143,0.10)` for today's `--secondary` =
`#2f6f8f`.

## The `Theme` Model

`shared/styles/types.ts` defines the `Theme` TypeScript type with the
themable fields named above. M1 phase 1.5.2 implements it. Expected
shape:

```text
Theme {
  // Brand bases
  bg, surface, surfaceStrong, surfaceCard, surfaceCardMuted,
  text, muted, border, borderSoft, borderMuted,
  primary, secondary, accent,
  whiteWarm, whitePanel, whiteTint,

  // Brand-tied gradient stops and admin surfaces
  pageGradientStart, pageGradientEnd,
  heroStart, heroEnd,
  adminInputSurface, draftRowSurface,

  // Typography
  bodyFontFamily, headingFontFamily,

  // Radii
  panelRadius, panelRadiusMobile, cardRadius, controlRadius,
}
```

The exact field names and grouping are 1.5.2 implementation
detail; the audit binds the field set, not the literal type
declaration.

Every field corresponds to a flat CSS custom property
(`--token-name`, no `--theme-` prefix — see "Naming" in
[`shared-styles-foundation.md`](/docs/plans/shared-styles-foundation.md)).
`<ThemeScope theme={…}>` emits the CSS custom properties as inline
style on a wrapper element. Brand-tied derived shades
(`--secondary-surface`, etc.) are not Theme fields; they are
declared in `:root` as `color-mix()` derivations of the brand
bases.

Status colors, modal scrim, neutral drop-shadow, spacing scale, motion
timing, font weights, control sizes, focus-ring metrics, pill radius,
`$shadow-panel`, `$shadow-selected`, `$shadow-primary`,
`$focus-ring`, and `$transition-interactive` are **not** Theme
fields. They live as SCSS variables (and, for the composites whose
color slots reference themable shades via `var(--…)`, are recipes
that read both buckets).

For apps/site, the platform Sage Civic Theme defines the same
themable fields; structural values (status, spacing, motion, etc.)
are emitted by apps/site's root layout from a structural source —
exact storage shape (separate `shared/styles/structural.ts` module,
constants in `shared/styles/themes/platform.ts`, or apps/site SCSS)
is a 1.5.2 implementation decision and does not affect the
classification this doc binds.

## Procedure For Adding A New Theme

1. Pick the brand decisions: ~10 brand colors (the bases), the body
   and heading font families, the panel/card/control radii, the
   page-gradient and hero-gradient stops, the brand-tied warm-white
   variants, and the brand-tied admin surfaces (admin input, draft
   row).
2. Create `shared/styles/themes/<slug>.ts` exporting a `Theme` object
   populated with those values. Use
   [`shared/styles/themes/platform.ts`](/shared/styles/themes/platform.ts)
   (Sage Civic) as the shape reference once 1.5.2 lands.
3. Add the new theme to the registry barrel at
   `shared/styles/themes/index.ts` mapping slug → Theme.
4. No further wiring required: `getThemeForSlug(slug)` resolves the
   new theme by slug; routes that already wrap in `<ThemeScope>`
   pick it up automatically. The first per-event apps/web routes
   wired to ThemeScope land in M2 phase 2.2 (per-event admin); the
   first apps/site event route lands in M3 phase 3.1; apps/web event
   routes (game, redeem, redemptions) wire in demo-expansion epic M1
   phase 1.1. apps/web is now fully ThemeScope-wrapped on
   event-route shells.

Brand-tied derived shades (`--primary-surface`,
`--secondary-focus`, etc.) follow automatically from the brand bases
via `color-mix()` in `:root`. **They are not `Theme` fields and
per-event themes do not override them directly.** The `Theme` type
intentionally cannot represent such an override, which is the whole
point of option (a) with centralized derivation: visual consistency
is enforced by construction, and the only knob a theme author turns
is the brand base.

If a future per-event theme genuinely requires a derived shade that
does not match the standard alpha percentage of its base (a
desaturated surface, a tinted-toward-warm border), that is a signal
that the audit's policy is wrong for that derivation, not that the
theme needs an escape hatch. The resolution path is to revise this
doc and the `:root` derivation policy in a follow-up — and the
revision should consider whether the standard alpha applies less
universally than the current model assumes — before the new theme
lands. No theme on the epic's M3 / M4 horizon (Sage Civic, the M3
test events, Madrona) has surfaced such a need.

## Platform Sage Civic Theme

These values land in `shared/styles/themes/platform.ts` and apps/site's
root layout in M1 phase 1.5.2. They are recorded here for
cross-reference; the parent epic
[`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md) M1
phase 1.5 description is the source of truth for the values
themselves.

```text
Colors
  bg          #f3f4ee   warm pale sage
  surface     #ffffff   panels
  text        #232a26   charcoal-green
  muted       #5d6862
  primary     #2c5e4f   deep forest
  accent      #c46f3e   rust
  success     #3a7d4d   (structural status; not a Theme field)
  border      rgba(35,42,38,0.10)
  hero-start  rgba(243,244,238,1)
  hero-end    rgba(232,236,228,0.96)

Typography (apps/site, via next/font)
  body        Inter (variable)
  heading     Fraunces (variable)

Radii (themable subset)
  panel       16px
  card        12px
  control     10px
  pill        999px (structural — stays as SCSS, not in Theme)
```

apps/web keeps today's `$font-stack` (Avenir Next system stack) and
today's chunky panel/card/control radii through 1.5.2. apps/web's
`:root` is not Sage Civic-themed; apps/web event-route shells now
wrap in `<ThemeScope>` (admin from event-platform-epic M2 phase
2.2; game / redeem / redemptions from demo-expansion epic M1 phase
1.1) and resolve per-event Themes from the registry for registered
slugs. Non-test-event slugs continue to resolve to the platform
Sage Civic Theme via `getThemeForSlug`'s fallback, so apps/web's
warm-cream `:root` defaults remain in place for non-test-event
slugs until a future per-event Theme registers (the future Madrona-
launch epic owns Madrona's `Theme` registration). Sage Civic
landing in apps/site in 1.5.2 was the only intentional visual
change in that phase.

## Related Docs

- [`AGENTS.md`](/AGENTS.md) — Styling Token Discipline (rule for
  when to add a token; updated in 1.5.2 to point here for the
  themable/structural binding)
- [`docs/plans/shared-styles-foundation.md`](/docs/plans/shared-styles-foundation.md)
  — phase 1.5 plan (subphase tables, execution steps, validation
  gate)
- [`docs/plans/event-platform-epic.md`](/docs/plans/event-platform-epic.md)
  — parent epic; M1 phase 1.5 carries the Sage Civic palette source
  of truth
- [`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
  — current token source for apps/web (today's warm-cream values
  preserved byte-identically through 1.5.2)
