# Styling Tokens And Themes

## Status

Living reference for the platform's token classification, color-derivation
policy, and per-event `Theme` model. The classification and color-derivation
policy below are **binding**: token misclassification surfaced during
implementation work sends a doc fix back here in the same PR.

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
lives in
[`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
"Styling Token Discipline."

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
Theme" below; per-event theme values land in their own
`shared/styles/themes/<slug>.ts` files (Madrona registered in the
[Madrona demo-build epic](/docs/plans/epics/madrona-demo-build/epic.md)
M1 phase 1.1).

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

### Optional brand fields — themable, default-derived

Added by the Madrona redesign token-vocabulary extension. These
`Theme` fields are **optional**: a theme that omits one renders
byte-identically to the pre-extension emission because the default is
derived from required fields. The derivation is centralized in
`shared/styles/themeToStyle.ts` (plain fallbacks, not `color-mix()`),
and apps/web's `:root` carries the equivalent `var()`-form fallback
for surfaces outside `<ThemeScope>`. Existing themes
(`harvest-block-party`, `riverside-jam`, platform Sage Civic) are
deliberately not edited when a new optional field lands.

| Theme field | CSS custom property | Default when omitted | Notes |
| --- | --- | --- | --- |
| `headerBg` | `--header-bg` | `primary` | Sticky event header bar background. |
| `headerFg` | `--header-fg` | `whiteWarm` | Header bar foreground / link color. |
| `surfaceBand` | `--surface-band` | `surfaceCardMuted` | Tinted full-width band surface (inner page-head band, sponsor band, code block — the Madrona spec's "putty"). |
| `accentFontFamily` | `--font-accent` | `bodyFontFamily` | Short warm accent face (welcome line, artist taglines). |
| `accentGarnish` | `--accent-garnish` | `secondary` | Small-decoration accent: short script/accent lines and emphasis marks (the day-of landing's welcome line and main-set stars). Scoped to marks and short lines, never a fill or large surface — garnish colors in a poster palette usually have the least contrast headroom. A theme that sets it owns checking it against the surfaces it lands on, including the darkest stop of any gradient the text overlaps. |
| `pageSurface` | `--page-surface` | layered recipe from `accent` / `secondary` glows + `pageGradientStart` / `bg` / `pageGradientEnd` | Full CSS `background` value for the page field. Painted by apps/web's `.site-shell` inside `<ThemeScope>`. A flat theme sets a single color. |
| `gridLine` | `--grid-line` | `text` at 4% (the existing derived shade) | Backdrop grid line color; `transparent` hides the grid. |
| `panelSurface` | `--panel-surface` | `surface` | Quiz panel background. Consumed only by the attendee quiz panels (`.intro-panel` / `.question-panel` / `.completion-panel`); operator surfaces keep the structural `.panel` chrome on every theme. |
| `panelBorder` | `--panel-border` | `1px solid` `border` | Quiz panel border (full border shorthand); same scope as `panelSurface`. |
| `panelShadow` | `--panel-shadow` | `0 24px 60px rgba(42,42,42,0.12)` (the structural `$shadow-panel` recipe) | Quiz panel shadow **posture** — the field is type-bound to the literal `"none"`, so a theme can only remove the shadow; the composite recipe itself stays structural. Same scope as `panelSurface`. |
| `pageHeadSurface` | `--page-head-surface` | `transparent` | Quiz page-head band background. |
| `pageHeadRule` | `--page-head-rule` | `none` | Page-head bottom rule (border shorthand). |
| `pageHeadPosture` | `--page-head-margin` + `--page-head-padding` | plain flow (`0` / `0`) | Bounded literal `"band"`: expands to the structural full-bleed margin (`0 calc(50% - 50vw)`) and band padding (`18px`) owned by `themeToStyle.ts` — themes cannot inject arbitrary layout metrics. `.site-shell`'s `overflow-x: clip` contains the vw-bleed's scrollbar overhang. Beneath the event masthead apps/web overrides the margin's top term only (`_masthead.scss`), lifting the band flush against the bar. |
| `pageHeadTitleSize` | `--page-head-title-size` | *(not emitted)* | Emitted only when set; call sites carry structural `var(--…, fallback)` fallbacks. |
| `headingLetterSpacing` | `--heading-letter-spacing` | *(not emitted)* | Emitted only when set; display-face tracking. Call sites carry structural fallbacks (e.g. the topbar h1's `-0.04em`). |
| `optionBorder` | `--option-border` | `1px solid` `border` | Answer option row border (full border shorthand). |
| `optionSelectedBorderColor` | `--option-selected-border-color` | `secondary` at 56% | Selected option border color. |
| `optionSelectedSurface` | `--option-selected-surface` | `secondary` at 18% | Selected option fill. |
| `codeSurface` | `--code-surface` | success/secondary layered recipe over `whiteTint` | Check-in code block background. |
| `codeBorder` | `--code-border` | `1px solid rgba(63,143,90,0.18)` (structural `$color-success-border`) | Check-in code block border (full border shorthand). |
| `ctaSurface` | `--cta-surface` | `secondary` at 14% | Completion CTA button background. |
| `ctaFg` | `--cta-fg` | `secondary` | Completion CTA button foreground. |
| `ctaWarmSurface` | `--cta-warm-surface` | resolved `ctaSurface` | Warm CTA variant (donate) background. |
| `ctaWarmFg` | `--cta-warm-fg` | resolved `ctaFg` | Warm CTA variant (donate) foreground. |
| `sponsorLabel` | `--sponsor-label` | `text` | Sponsor attribution line color. |

The `pageSurface` / `panelShadow` / `codeSurface` / `codeBorder`
defaults embed structural literals (`$shadow-panel`,
`$color-success-surface`, `$color-success-border`) — the derivation
in `themeToStyle.ts` and the `var()`-form fallbacks in apps/web's
`:root` must stay in sync with those SCSS constants.

Optional fields stay themable-bucket tokens; the optionality is an
authoring ergonomic, not a third bucket. A new optional field must
name its default derivation in `types.ts`, implement it in
`themeToStyle.ts`, and mirror it in apps/web's `:root` block in the
same change. Two fields (`pageHeadTitleSize`,
`headingLetterSpacing`) instead use **conditional emission**: they
are omitted from the emission entirely when unset, because their
call sites carry per-site structural fallbacks in
`var(--…, fallback)` form that an unconditional default would
override; they correspondingly have no `:root` declaration.

### Brand-tied derived shades — themable, derived from brand bases

These are pure alpha tints of `$color-primary`, `$color-secondary`, or
`$color-accent`, plus two text-derived overlay tints. Per the
**color-derivation policy** below, derived shades are emitted as CSS
custom properties via `color-mix()` from the corresponding base, so
per-event themes only specify brand bases and the derived shades
follow automatically. The emit site is `<ThemeScope>` for themed
scopes (resolved-hex literals on the wrapper element) and `:root`
for non-themed apps/web defaults (fallback `var()`-form
declarations). SCSS consumers continue to read flat `var(--…)`
references — no `color-mix()` call sites in partials.

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
| — (no legacy SCSS alias) | — | `--accent` | 55% | `--accent-rule` |
| — (no legacy SCSS alias) | — | `--text` | 28% | `--text-shadow` |

`$color-text-disabled-surface` and `$color-grid-line` are the same
RGB as `$color-text` at low alpha — the disabled-button overlay
visually inherits the foreground color, and the layout grid pattern
is a low-opacity foreground tint. Both are themable so they track the
brand text color when a per-event Theme overrides it.

`--accent-rule` (dotted section rules and row separators) and
`--text-shadow` (the hard-offset shadow color under raised action
tiles) were added with the day-of landing layout in apps/site; they
post-date the migration audit, so they have no legacy `$…` alias —
they exist only as emitted custom properties.

### Typography — themable (family); structural (weights)

| Token | Today's apps/web value | Bucket | Theme field | CSS custom property |
| --- | --- | --- | --- | --- |
| `$font-stack` | `"Avenir Next", "Segoe UI", sans-serif` | Themable | `bodyFontFamily` | `--font-body` |
| (no heading split today) | (defaults to body) | Themable | `headingFontFamily` | `--font-heading` |
| (no accent face today) | (defaults to body) | Themable | `accentFontFamily` (optional) | `--font-accent` |
| `$font-weight-semibold` | `600` | Structural | — | (stays SCSS) |
| `$font-weight-bold` | `700` | Structural | — | (stays SCSS) |

`headingFontFamily` doubles as the **display** family — a theme with
a dedicated display face (Madrona's Bebas Neue for headings, nav,
times, buttons) carries it there; there is no separate display field.
Event brand faces are self-hosted woff2 files duplicated per app
(`apps/site/public/fonts/`, `apps/web/public/fonts/`, licenses
alongside) and declared via each app's `_fonts.scss` partial —
`@font-face` declarations are inert for themes whose font stacks do
not name them.

apps/web consumes `--font-heading` on its display surfaces (the
topbar / not-found `h1`, the quiz intro and completion headings, the
check-in code, and the final score) — the Madrona redesign R4 quiz
restyle bound these call sites. apps/web's `:root` defaults
`--font-heading` to the same value as `--font-body`, so unthemed
surfaces render exactly as before; inside `<ThemeScope>` a theme's
declared heading face renders (Madrona's Bebas; Sage Civic / test
events fall back to their declared serif stacks because the
`next/font` variables they reference exist only in apps/site). The
question prompt deliberately stays on the body face — it is reading
copy, not display type.

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

The audit picks **option (a) with centralized derivation logic**:
per-event Themes specify only the brand bases (~10 fields plus
typography and radii), and the derivation produces every brand-tied
surface / border / glow / shadow tint via `color-mix()`. The emit
site is `<ThemeScope>` for themed scopes — `themeToStyle.ts` bakes
the resolved brand-base hex into a literal `color-mix()` string on
the wrapper element so descendants inherit per-Theme values rather
than the `:root`-substituted form. `:root` keeps fallback `var()`-
form declarations for apps/web surfaces outside `<ThemeScope>` (the
outer `.site-shell`, the demo-overview landing). SCSS consumers
read flat `var(--…)` references — no `color-mix()` call sites in
SCSS partials.

The two candidates the plan named were:

- **(a) bases + CSS-derived shades.** Theme exposes ~10 brand bases;
  derived shades come from `color-mix()`.
- **(b) enumerated shades.** Theme exposes every shade as its own
  field; per-event theme authors populate ~30 fields per theme.

Option (a) is chosen because:

1. **Theme author burden scales.** The platform horizon ships several
   themes (Sage Civic platform palette, two test event themes —
   `harvest-block-party` and `riverside-jam` —, Madrona, and more
   after). ~10 fields per theme vs ~30 compounds in author ergonomics
   across that horizon.
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

  // Optional brand fields (default-derived; see the
  // "Optional brand fields" table)
  headerBg?, headerFg?, surfaceBand?, accentFontFamily?,

  // Optional quiz-surface vocabulary (Madrona redesign R4;
  // default-derived, same table). panelShadow and pageHeadPosture
  // are bounded literals ("none" / "band"), not free-form values.
  pageSurface?, gridLine?,
  panelSurface?, panelBorder?, panelShadow?,
  pageHeadSurface?, pageHeadRule?, pageHeadPosture?,
  pageHeadTitleSize?, headingLetterSpacing?,   // conditional emission
  optionBorder?, optionSelectedBorderColor?, optionSelectedSurface?,
  codeSurface?, codeBorder?,
  ctaSurface?, ctaFg?, ctaWarmSurface?, ctaWarmFg?,
  sponsorLabel?,
}
```

The exact field names and grouping are 1.5.2 implementation
detail; the audit binds the field set, not the literal type
declaration.

Every field corresponds to a flat CSS custom property
(`--token-name`, no `--theme-` prefix).
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

### Where the structural bucket actually lives

The **themable** half is symmetric across the apps: apps/site's root
layout emits the platform Sage Civic Theme's custom properties, both
apps read flat `var(--…)`, and nothing brand-tied is duplicated.

The **structural** half is not symmetric, and this doc previously
described an intent rather than the code. Stated plainly:

- **apps/web** has the one named home — every structural value is a
  SCSS variable declared in
  [`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
  and consumed as `$…`, exactly as the table above describes.
- **apps/site has no structural token file.** Its SCSS declares and
  consumes no SCSS variables at all — every structural value (spacing,
  radii, weights, motion) is written as a literal at its call site.
  There is no `shared/styles/structural.ts` module and no apps/site
  equivalent of `_tokens.scss`.
- **Shared partials under `shared/styles/`** are in the same position
  for a structural reason: they are `@use`d by both apps and the two
  apps' token files are independent, so a shared partial can consume
  neither. They also write structural literals.

So the structural bucket has one named home and two unnamed ones. The
concrete instance is the pill radius: `$radius-pill: 999px` is declared
once in apps/web's `_tokens.scss`, and the bare literal `999px` is
repeated at
[`apps/site/app/styles/_admin.scss:146`](/apps/site/app/styles/_admin.scss),
[`apps/site/app/styles/_landing.scss:317`](/apps/site/app/styles/_landing.scss),
and
[`shared/styles/_event-masthead.scss:109`](/shared/styles/_event-masthead.scss).
Three copies of one platform contract, with nothing that fails when
they drift.

This does **not** change the classification this doc binds — a value's
bucket is a statement about who may override it, not about whether a
consumer happens to inline it, and `999px` is structural in all three
places. What it changes is the mental model: do not read "structural"
as "there is a parallel apps/site structural module to edit." There
isn't one. Adding a structural value today means writing a literal in
apps/site and in any shared partial that needs it.

Closing the duplication is tracked as a post-launch item in
[`docs/backlog.md`](/docs/backlog.md) (Tier 5, "Share structural style
tokens across apps"); it is deliberately not resolved here, because
picking between a shared `_structural.scss` and a per-app
custom-property bridge is a design call, not a doc fix.

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
lands. None of the current themes (Sage Civic, the test events
`harvest-block-party` and `riverside-jam`, Madrona) has surfaced such
a need.

## Platform Sage Civic Theme

These values are the source of truth for the platform's Sage Civic
palette, consumed from `shared/styles/themes/platform.ts` by
apps/site's root layout.

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
today's chunky panel/card/control radii. apps/web's `:root` is not
Sage Civic-themed; apps/web event-route shells wrap in
`<ThemeScope>` and resolve per-event Themes from the registry for
registered slugs. Non-test-event slugs continue to resolve to the
platform Sage Civic Theme via `getThemeForSlug`'s fallback, so
apps/web's warm-cream `:root` defaults remain in place for
non-test-event slugs until a future per-event Theme registers (the
[Madrona demo-build epic](/docs/plans/epics/madrona-demo-build/epic.md)
owns Madrona's `Theme` registration).

## Madrona Event Theme — Measured Contrast

Source of truth for Madrona's WCAG AA verification. The palette itself
is [`shared/styles/themes/madrona.ts`](/shared/styles/themes/madrona.ts);
this section records **what was measured and what it came out to**, so
that a later session reads a number instead of running another contrast
pass. Four independent passes have already been run across the redesign
slices and all four reached the same values — that is the cost this
table exists to stop.

If you change a Madrona color, re-measure the rows it appears in and
update this table in the same change. Do not add a color to the theme
whose rows you have not measured.

**Method.** WCAG 2.x relative-luminance ratios over opaque sRGB hex
pairs. Bars applied: **4.5:1** for normal text (AA 1.4.3), **3:1** for
UI components and graphical objects that carry meaning (AA 1.4.11).
Purely decorative graphics that carry no information are exempt from
1.4.11 and are marked as such. Alpha-composited tokens (the `border*`
fields, which are `rgba` over varying surfaces) are not in this table —
they are borders on already-passing surfaces, not information carriers.

### Text pairings — 4.5:1 bar

| Foreground | Background | Ratio | Where |
| --- | --- | --- | --- |
| ink `#3a3226` (`text`) | cream `#f8e9c8` (`bg`) | **10.50** | Body copy on the page field. |
| ink `#3a3226` | putty `#f1dfb8` (`surfaceBand`) | **9.61** | Body copy inside the tinted band. |
| muted `#655a48` (`muted`) | putty `#f1dfb8` | **5.14** | **Tightest muted pairing on any Madrona surface** — this is the row that sets the `muted` value. |
| muted `#655a48` | cream `#f8e9c8` | **5.62** | Secondary copy on the page field. |
| muted `#655a48` | near-white `#fffdf2` (`surface`) | **6.62** | Secondary copy on flat panels. |
| near-white `#fffdf2` (`headerFg`) | dark green `#2e4a34` (`headerBg`) | **9.60** | Masthead + footer nav links. |
| gold `#e0b040` (`accent`) | dark green `#2e4a34` | **4.87** | Masthead brand name and active-item underline. |
| dark green `#2e4a34` | gold `#e0b040` | **4.87** | Masthead **Donate pill** (gold fill, green label). |
| deep green `#1c2e20` (`ctaFg`) | gold `#e0b040` (`ctaSurface`) | **7.15** | Completion-screen Newsletter CTA. |
| deep ink `#2a2016` (`ctaWarmFg`) | poster orange `#d9822b` (`ctaWarmSurface`) | **5.45** | Completion-screen **Donate CTA** — see the donate note below. |
| olive `#68681f` (`secondary`) | cream `#f8e9c8` | **4.87** | Olive as text on the page field. |
| near-white `#fffdf2` | olive `#68681f` | **5.74** | Near-white text on an olive fill. |
| garnish red `#a52f24` (`accentGarnish`) | cream `#f8e9c8` | **5.77** | Main-set stars (13px marks). |
| garnish red `#a52f24` | hero gradient darkest stop `#fdca8e` (`heroEnd`) | **4.62** | Script welcome line where it overlaps the gradient's darkest point. |
| purple `#6b4e8e` (`sponsorLabel`) | putty `#f1dfb8` | **5.15** | Sponsor attribution line in the presenting-sponsor band. |
| purple `#6b4e8e` | cream `#f8e9c8` | **5.63** | Sponsor credit line on the page field. |

Every text row clears 4.5:1. The binding constraints are the two rows
at 4.87 and the muted-on-putty row at 5.14 — those have the least
headroom and are the first to break if a surface is re-tinted.

### Non-text pairings — 3:1 bar, and the decorative exemption

| Element | Pairing | Ratio | Verdict |
| --- | --- | --- | --- |
| Answer option-row border (`optionBorder`, 2.5px olive) | `#68681f` on cream `#f8e9c8` | **4.87** | Passes 1.4.11 — it delineates a control boundary, so the bar applies and is met. |
| Gold section rules and row separators | `#e0b040` on putty `#f1dfb8` | **1.53** | **Exempt.** Decorative separator only. |
| Gold section rules | `#e0b040` on cream `#f8e9c8` | **1.67** | **Exempt.** Same. |

The gold rules are the one place Madrona sits far below 3:1, and it is
deliberate. They are poster garnish — the page-head band's bottom rule,
the dotted section separators, the code block's border. None of them
conveys information that is not already conveyed by heading text,
spacing, and the band's own tint change, which is the condition WCAG
1.4.11 exempts. **A gold rule may never become the sole indicator of
state** (focus, selection, error, active nav). Focus and selection use
the olive and dark-green treatments above precisely because those clear
the bar.

### The donate decision

Two different surfaces are both called "donate" and they have
different palettes — this has caused confusion more than once:

- The **masthead Donate pill** is gold (`--accent` fill, `--header-bg`
  green label), 4.87:1.
- The **completion-screen Donate CTA** is poster orange
  (`ctaWarmSurface` `#d9822b`) with a deepened ink foreground
  (`ctaWarmFg` `#2a2016`), 5.45:1.

The orange fill is an organizer decision — poster orange is the
brand's warm accent and the organizer wanted donate to read warm
rather than gold, distinct from the newsletter CTA next to it. The
fill is therefore fixed; the foreground is what moved.

**White (or near-white) on poster orange is banned.** The design
mock paired `#fffdf2` on `#d9822b`, which measures **2.87:1** — it
fails the normal-text bar outright and cannot be rescued by weight or
size at this button's type scale. Deepening the foreground to
`#2a2016` was the fix. If a future surface wants orange, it takes a
dark foreground.

### Values that were replaced, and why

Recording the rejects matters as much as the accepted values: without
them, the poster palette looks like the obvious choice and gets
re-proposed. Each shift stays inside its own hue, so the page still
reads as the poster palette.

| Poster value | Measured | Shipped as | Now | Why it could not stand |
| --- | --- | --- | --- | --- |
| olive `#8b8b2e` | **3.00** on cream / **3.53** under near-white | `#68681f` | 4.87 / 5.74 | A genuine **luminance dead zone**: neither a light nor a dark foreground reaches 4.5:1 against it, so no pairing could have fixed it — the color itself had to move. |
| gold `#d9a62b` | **4.40** on dark green | `#e0b040` | 4.87 | Gold text on the header and footer missed the bar. |
| muted `#6f6350` | **4.47** on putty | `#655a48` | 5.14 | Missed the bar on the putty band specifically; passed everywhere else. |
| garnish red `#c43b2f` | **3.49** on `heroEnd` / **4.36** on cream | `#a52f24` | 4.62 / 5.77 | Welcome line over the gradient's darkest stop, and the 13px stars. |
| near-white `#fffdf2` on orange | **2.87** | foreground → `#2a2016` | 5.45 | See the donate note above. |

Print has no contrast requirement, which is why the poster palette
never had to resolve any of this and why the design spec does not
mention it. Reverting any of these is a one-line edit in `madrona.ts`
that silently reintroduces the failure on every Madrona surface.

**Two figures in circulation are stale.** Earlier notes report
`5.67:1` for "ink on gold" and `1.69:1` for gold rules on putty. Both
were measured against the **pre-shift poster gold `#d9a62b`**, so
neither describes a shipped surface:

- Gold rules on putty are **1.53:1** with today's `accent`, not 1.69
  (the row above).
- "Ink on gold" is not a pairing that ships at all. Body ink
  `#3a3226` on today's gold would be 6.28:1, but neither gold button
  uses it — the masthead pill uses the header green (4.87) and the
  completion CTA uses `ctaFg` (7.15).

If you find those older numbers, they are not a contradiction of this
table; they predate the gold shift.

## Related Docs

- [`docs/agents/reference/architecture-guardrails.md`](/docs/agents/reference/architecture-guardrails.md)
  — Styling Token Discipline (rule for when to add a token; points
  here for the themable/structural binding)
- [`apps/web/src/styles/_tokens.scss`](/apps/web/src/styles/_tokens.scss)
  — current token source for apps/web (today's warm-cream values)
