import type { Theme } from "./types.ts";

/**
 * Maps a `Theme` to a record of CSS custom property names →
 * font-family / color / radius values. Consumed by:
 *
 * - `<ThemeScope>` to set `style={…}` on its wrapper `<div>`
 * - apps/site's root layout to set `style={…}` on `<html>`
 *
 * The keys use the flat naming convention from
 * [`docs/styling.md`](../../docs/styling.md) (no `--theme-` prefix).
 *
 * Brand-tied derived shades (`--primary-surface`,
 * `--secondary-focus`, `--accent-glow`, `--text-disabled-surface`,
 * etc.) are emitted here using the string-passthrough strategy:
 * each value is a literal `color-mix(in srgb, <hex> N%, transparent)`
 * with the resolved brand-base hex baked in. `:root` declarations
 * in `apps/web/src/styles/_tokens.scss` keep equivalent
 * `var()`-form fallbacks for non-`<ThemeScope>` surfaces; the
 * inline-style emission overrides them inside themed scopes per
 * CSS specificity.
 *
 * Returns a plain string-valued record so consumers can cast to
 * `CSSProperties` for inline-style usage; React's
 * `CSSProperties` does not type-check unknown `--*` keys, so the
 * cast is the standard idiom.
 */
export function themeToStyle(theme: Theme): Record<string, string> {
  return {
    "--bg": theme.bg,
    "--surface": theme.surface,
    "--surface-strong": theme.surfaceStrong,
    "--surface-card": theme.surfaceCard,
    "--surface-card-muted": theme.surfaceCardMuted,
    "--text": theme.text,
    "--muted": theme.muted,
    "--border": theme.border,
    "--border-soft": theme.borderSoft,
    "--border-muted": theme.borderMuted,
    "--primary": theme.primary,
    "--secondary": theme.secondary,
    "--accent": theme.accent,
    "--white-warm": theme.whiteWarm,
    "--white-panel": theme.whitePanel,
    "--white-tint": theme.whiteTint,
    "--page-gradient-start": theme.pageGradientStart,
    "--page-gradient-end": theme.pageGradientEnd,
    "--hero-start": theme.heroStart,
    "--hero-end": theme.heroEnd,
    "--admin-input-surface": theme.adminInputSurface,
    "--draft-row-surface": theme.draftRowSurface,

    // Optional brand fields — defaults derived from required fields
    // so themes that omit them render byte-identically to the
    // pre-vocabulary-extension emission. Percent-free derivations:
    // plain fallbacks, not `color-mix()`. Must stay in sync with the
    // `var()`-form fallbacks in `apps/web/src/styles/_tokens.scss`.
    "--header-bg": theme.headerBg ?? theme.primary,
    "--header-fg": theme.headerFg ?? theme.whiteWarm,
    "--surface-band": theme.surfaceBand ?? theme.surfaceCardMuted,
    "--font-body": theme.bodyFontFamily,
    "--font-heading": theme.headingFontFamily,
    "--font-accent": theme.accentFontFamily ?? theme.bodyFontFamily,
    "--radius-panel": theme.panelRadius,
    "--radius-panel-mobile": theme.panelRadiusMobile,
    "--radius-card": theme.cardRadius,
    "--radius-control": theme.controlRadius,

    // Brand-tied derived shades. Percentages must stay in sync
    // with `apps/web/src/styles/_tokens.scss` lines 148-170.
    "--primary-surface": mix(theme.primary, 12),
    "--primary-surface-strong": mix(theme.primary, 14),
    "--primary-border": mix(theme.primary, 24),
    "--primary-shadow": mix(theme.primary, 24),

    "--secondary-surface": mix(theme.secondary, 10),
    "--secondary-surface-strong": mix(theme.secondary, 14),
    "--secondary-surface-selected": mix(theme.secondary, 18),
    "--secondary-surface-pending": mix(theme.secondary, 12),
    "--secondary-border-subtle": mix(theme.secondary, 18),
    "--secondary-border-pending": mix(theme.secondary, 24),
    "--secondary-border-selected": mix(theme.secondary, 56),
    "--secondary-focus": mix(theme.secondary, 42),
    "--secondary-glow": mix(theme.secondary, 22),

    "--accent-surface": mix(theme.accent, 18),
    "--accent-surface-muted": mix(theme.accent, 14),
    "--accent-surface-pending": mix(theme.accent, 12),
    "--accent-border": mix(theme.accent, 26),
    "--accent-glow": mix(theme.accent, 28),

    "--text-disabled-surface": mix(theme.text, 18),
    "--grid-line": mix(theme.text, 4),
  };
}

function mix(base: string, percent: number): string {
  return `color-mix(in srgb, ${base} ${percent}%, transparent)`;
}
