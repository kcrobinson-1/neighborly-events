/**
 * Per-event brand surface that `<ThemeScope>` emits as CSS custom
 * properties. Field set is the binding output of the M1 phase 1.5.1
 * token audit; see [`docs/styling.md`](../../docs/styling.md) for the
 * themable / structural classification table and the derivation
 * policy that keeps brand-tied derived shades (surfaces, borders,
 * glows, shadows) out of this type — those are computed in `:root`
 * via `color-mix()` from the brand bases below.
 *
 * Status colors, neutral drop-shadow, modal scrim, spacing scale,
 * motion, font weights, control sizes, focus-ring metrics, pill
 * radius, and composite shadow/focus recipes are **not** Theme
 * fields. They live as platform-shared SCSS variables (apps/web) or
 * a parallel structural module (apps/site).
 */
export type Theme = {
  // Brand bases — `--bg`, `--surface`, `--surface-strong`,
  // `--surface-card`, `--surface-card-muted`, `--text`, `--muted`,
  // `--border`, `--border-soft`, `--border-muted`, `--primary`,
  // `--secondary`, `--accent`, `--white-warm`, `--white-panel`,
  // `--white-tint`. Brand-tied derived shades (`--primary-surface`,
  // etc.) are computed in `:root` from these bases.
  bg: string;
  surface: string;
  surfaceStrong: string;
  surfaceCard: string;
  surfaceCardMuted: string;
  text: string;
  muted: string;
  border: string;
  borderSoft: string;
  borderMuted: string;
  primary: string;
  secondary: string;
  accent: string;
  whiteWarm: string;
  whitePanel: string;
  whiteTint: string;

  // Brand-tied gradient stops and admin surfaces.
  pageGradientStart: string;
  pageGradientEnd: string;
  heroStart: string;
  heroEnd: string;
  adminInputSurface: string;
  draftRowSurface: string;

  // Typography. `bodyFontFamily` and `headingFontFamily` are
  // font-family values consumers can feed into `font-family:` directly
  // (typically a CSS variable injected by `next/font` for apps/site,
  // or a system stack for legacy apps/web defaults).
  bodyFontFamily: string;
  headingFontFamily: string;

  // Themable radii. Pill radius (999px) is structural and stays in
  // platform SCSS — it does not theme.
  panelRadius: string;
  panelRadiusMobile: string;
  cardRadius: string;
  controlRadius: string;
};
