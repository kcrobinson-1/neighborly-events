import type { Theme } from "../types.ts";

/**
 * Madrona Music in the Playfield — poster-palette Theme for the 2026
 * Madrona redesign. Values are the centerfold/poster SPECS palette:
 * greens and yellows lead — cream page, dark-green primary, olive
 * secondary accent, gold highlight — replacing the earlier
 * logo-sampled blue/red/teal Theme. Red and purple from the poster
 * palette are garnish-only (stars, script welcome line, sponsor
 * label) and deliberately not brand bases; components that need them
 * own those accents.
 *
 * Typography is the poster set, self-hosted as woff2 in each app's
 * `public/fonts/` (`@font-face` in apps/site's `globals.scss` and
 * apps/web's `_fonts.scss`; OFL 1.1, see `FONT-LICENSES.txt`
 * alongside the font files): Bebas Neue for display/headings,
 * Poppins for body, Lora Italic for short warm accents via the
 * optional `accentFontFamily` field.
 */
export const madronaTheme: Theme = {
  // Brand bases — cream page, near-white flat surfaces, putty muted
  // band, warm ink text/neutrals, dark green / olive / gold.
  bg: "#f8e9c8",
  surface: "#fffdf2",
  surfaceStrong: "#fffdf2",
  surfaceCard: "#fffdf2",
  surfaceCardMuted: "#f1dfb8",
  text: "#3a3226",
  muted: "#6f6350",
  border: "rgba(58, 50, 38, 0.14)",
  borderSoft: "rgba(58, 50, 38, 0.09)",
  borderMuted: "rgba(58, 50, 38, 0.12)",
  primary: "#2e4a34",
  secondary: "#8b8b2e",
  accent: "#d9a62b",
  whiteWarm: "#fffdf2",
  whitePanel: "#fffdf2",
  whiteTint: "#fdf8e8",

  // Brand-tied gradient stops and admin surfaces. The page reads as
  // one continuous cream surface (no gradient); the hero gradient is
  // the madrona.us cream→peach.
  pageGradientStart: "#f8e9c8",
  pageGradientEnd: "#f8e9c8",
  heroStart: "#fff7ee",
  heroEnd: "#fdca8e",
  adminInputSurface: "#fffdf2",
  draftRowSurface: "rgba(255, 253, 242, 0.82)",

  // Typography — poster faces, self-hosted per app.
  bodyFontFamily: '"Poppins", "Avenir Next", "Segoe UI", sans-serif',
  headingFontFamily: '"Bebas Neue", "Avenir Next Condensed", "Arial Narrow", sans-serif',
  accentFontFamily: '"Lora", Georgia, serif',

  // Optional brand fields — sticky dark-green header bar with
  // near-white links; putty band surface.
  headerBg: "#2e4a34",
  headerFg: "#fffdf2",
  surfaceBand: "#f1dfb8",

  // Themable radii — the poster look is flatter than the platform
  // default; mock uses 10–14px rounding.
  panelRadius: "14px",
  panelRadiusMobile: "14px",
  cardRadius: "12px",
  controlRadius: "10px",
};
