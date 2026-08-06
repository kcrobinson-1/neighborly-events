/**
 * Per-event brand surface that `<ThemeScope>` emits as CSS custom
 * properties. Field set is the binding output of the M1 phase 1.5.1
 * token audit; see [`docs/styling.md`](../../docs/styling.md) for the
 * themable / structural classification table and the derivation
 * policy that keeps brand-tied derived shades (surfaces, borders,
 * glows, shadows) out of this type — those are computed by
 * `themeToStyle.ts` via `color-mix()` from the brand bases below.
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
  // etc.) are computed by `themeToStyle.ts` from these bases.
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
  // a self-hosted `@font-face` family, or a system stack for legacy
  // apps/web defaults). `headingFontFamily` doubles as the display
  // family (headings, nav, times, buttons) for themes that carry a
  // dedicated display face.
  bodyFontFamily: string;
  headingFontFamily: string;

  // Optional brand fields (Madrona redesign vocabulary). Optional so
  // existing themes render byte-identically without edits: when a
  // theme omits a field, `themeToStyle.ts` derives the default from
  // the required fields noted below, and apps/web's `:root` carries
  // the equivalent `var()`-form fallback. See `docs/styling.md`
  // "Optional brand fields".
  //
  // `headerBg` / `headerFg` — sticky event header bar background and
  // foreground (`--header-bg` / `--header-fg`; default `primary` /
  // `whiteWarm`).
  headerBg?: string;
  headerFg?: string;
  // `surfaceBand` — tinted full-width band surface (inner page-head
  // bands, sponsor bands, code block; the Madrona spec's "putty").
  // `--surface-band`; default `surfaceCardMuted`.
  surfaceBand?: string;
  // `accentFontFamily` — short warm accent face (welcome line, artist
  // taglines; Madrona uses Lora Italic). `--font-accent`; default
  // `bodyFontFamily`.
  accentFontFamily?: string;

  // Themable radii. Pill radius (999px) is structural and stays in
  // platform SCSS — it does not theme.
  panelRadius: string;
  panelRadiusMobile: string;
  cardRadius: string;
  controlRadius: string;
};
