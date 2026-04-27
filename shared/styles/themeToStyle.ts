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
 * Brand-tied derived shades (`--primary-surface`, etc.) are computed
 * in `:root` via `color-mix()` from the brand bases this function
 * emits, not here.
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
    "--font-body": theme.bodyFontFamily,
    "--font-heading": theme.headingFontFamily,
    "--radius-panel": theme.panelRadius,
    "--radius-panel-mobile": theme.panelRadiusMobile,
    "--radius-card": theme.cardRadius,
    "--radius-control": theme.controlRadius,
  };
}
