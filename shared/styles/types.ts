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

  // Quiz-surface vocabulary (Madrona redesign R4). Same optionality
  // contract: omitted fields derive defaults in `themeToStyle.ts`
  // that reproduce the pre-extension rendering, mirrored by
  // `var()`-form fallbacks in apps/web's `:root`.
  //
  // `pageSurface` — full CSS `background` value for the page field
  // (`--page-surface`). Default: the layered glow-and-gradient
  // recipe derived from `accent`, `secondary`, `pageGradientStart`,
  // `bg`, and `pageGradientEnd`. A flat theme sets a single color.
  pageSurface?: string;
  // `gridLine` — backdrop grid line color (`--grid-line`). Default:
  // the existing `text` 4% derived shade. `transparent` hides the
  // grid.
  gridLine?: string;
  // `panelSurface` / `panelBorder` / `panelShadow` — attendee quiz
  // panel chrome (`--panel-surface`, `--panel-border`,
  // `--panel-shadow`), consumed only by the quiz panels; operator
  // surfaces keep the structural `.panel` chrome on every theme.
  // Surface/border defaults: `surface` and `1px solid <border>`.
  // `panelShadow` is deliberately bound to the literal `"none"`
  // (shadow *posture*, not a recipe): composite shadow recipes stay
  // platform-shared structural, so a theme may only remove the
  // panel shadow, never redefine it. A flat theme sets
  // `transparent` / `none` / `none` to de-bubble.
  panelSurface?: string;
  panelBorder?: string;
  panelShadow?: "none";
  // Page-head band (`--page-head-surface`, `--page-head-rule`,
  // `--page-head-posture`→margin/padding). Defaults render no band:
  // `transparent`, `none`, plain flow. A banded theme sets a band
  // surface (typically `surfaceBand`), a bottom-rule border
  // shorthand, and `pageHeadPosture: "band"`. The posture is a
  // bounded literal: the full-bleed margin and band padding are
  // structural constants owned by `themeToStyle.ts` /
  // `_game-panels.scss`, so themes cannot inject arbitrary layout
  // metrics.
  pageHeadSurface?: string;
  pageHeadRule?: string;
  pageHeadPosture?: "band";
  // `pageHeadTitleSize` (`--page-head-title-size`) and
  // `headingLetterSpacing` (`--heading-letter-spacing`) are emitted
  // ONLY when set — call sites carry their structural fallbacks in
  // `var(--…, fallback)` form, so there is no derived default and no
  // `:root` declaration.
  pageHeadTitleSize?: string;
  headingLetterSpacing?: string;
  // Answer option rows (`--option-border`,
  // `--option-selected-border-color`, `--option-selected-surface`).
  // Defaults: `1px solid <border>` and the secondary 56% / 18%
  // derived shades.
  optionBorder?: string;
  optionSelectedBorderColor?: string;
  optionSelectedSurface?: string;
  // Completion code block (`--code-surface`, `--code-border`).
  // Defaults: the success/secondary layered recipe over `whiteTint`,
  // and `1px solid` the structural success border.
  codeSurface?: string;
  codeBorder?: string;
  // Completion CTA buttons (`--cta-surface`, `--cta-fg`) and the
  // warm variant used by the donate action (`--cta-warm-surface`,
  // `--cta-warm-fg`). Defaults: secondary 14% / `secondary`; the
  // warm pair falls back to the resolved base pair.
  ctaSurface?: string;
  ctaFg?: string;
  ctaWarmSurface?: string;
  ctaWarmFg?: string;
  // `sponsorLabel` — sponsor attribution line color
  // (`--sponsor-label`). Default: `text`.
  sponsorLabel?: string;

  // Themable radii. Pill radius (999px) is structural and stays in
  // platform SCSS — it does not theme.
  panelRadius: string;
  panelRadiusMobile: string;
  cardRadius: string;
  controlRadius: string;
};
