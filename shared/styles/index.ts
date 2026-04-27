/**
 * Public `shared/styles/` entrypoint. Owns the platform's theme
 * model: the `Theme` type, the universal `<ThemeScope>` React
 * component, the `getThemeForSlug` resolver, the platform Sage Civic
 * `Theme`, and the per-event registry.
 *
 * Per-event brand-tied derived shades (`--primary-surface`, etc.)
 * live in each app's `:root` block as `color-mix()` derivations of
 * the brand bases — they are not Theme fields. Status colors,
 * neutral drop-shadow, modal scrim, spacing, motion, font weights,
 * control sizes, focus-ring metrics, pill radius, and composite
 * shadow / focus recipes are platform-shared and not Theme fields.
 *
 * See [`docs/styling.md`](../../docs/styling.md) for the binding
 * classification, the color-derivation policy, the Theme model, and
 * the procedure for adding a new theme.
 */

export { ThemeScope, type ThemeScopeProps } from "./ThemeScope.tsx";
export { themeToStyle } from "./themeToStyle.ts";
export { getThemeForSlug } from "./getThemeForSlug.ts";
export { platformTheme } from "./themes/platform.ts";
export { themes } from "./themes/index.ts";
export type { Theme } from "./types.ts";
