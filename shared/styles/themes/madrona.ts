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
 *
 * **Contrast-adjusted values.** Three values are deliberately shifted
 * from the poster/centerfold SPECS palette because the literal poster
 * colors cannot carry text at WCAG AA on screen — print has no such
 * requirement, so the spec never had to resolve it. Each shift stays
 * inside its own hue; the page reads as the same palette:
 *
 * - `secondary` olive `#8b8b2e` → `#68681f`. The poster olive sits in
 *   a luminance dead zone: 3.53:1 under near-white text and 3.00:1 as
 *   text on the cream page — *neither* a light nor a dark foreground
 *   reaches 4.5:1 against it, so no pairing could fix it. Now 5.74:1
 *   and 4.87:1 respectively.
 * - `muted` `#6f6350` → `#655a48`, so muted body text clears 4.5:1 on
 *   the putty band (was 4.47:1) as well as on cream.
 * - `accent` gold `#d9a62b` → `#e0b040`, so gold text on the dark
 *   green header and footer clears 4.5:1 (was 4.40:1). This also
 *   lifts the shared masthead's brand name and donate pill, which
 *   read gold-on-dark-green from these same tokens.
 *
 * Reverting any of these is a one-line edit here, but doing so
 * reintroduces the AA failures on every madrona surface.
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
  // Secondary text. Deepened from the poster's `#6f6350` so it
  // clears WCAG AA for normal text on every madrona surface — the
  // putty band is the tightest (5.1:1; `#6f6350` measured 4.47:1
  // there), cream 5.6:1, near-white 6.6:1. The quiz restyle and the
  // landing rebuild arrived at this same value independently.
  muted: "#655a48",
  border: "rgba(58, 50, 38, 0.14)",
  borderSoft: "rgba(58, 50, 38, 0.09)",
  borderMuted: "rgba(58, 50, 38, 0.12)",
  primary: "#2e4a34",
  secondary: "#68681f",
  accent: "#e0b040",
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

  // Quiz-surface vocabulary (R4 de-bubbling): one continuous flat
  // cream page — no glow gradients, no backdrop grid, no floating
  // panel chrome. Values mirror the madrona-experience mock's Quiz
  // and Quiz·Done views.
  pageSurface: "#f8e9c8",
  gridLine: "transparent",
  panelSurface: "transparent",
  panelBorder: "none",
  panelShadow: "none",

  // Putty page-head band with a gold bottom rule, bled to the
  // viewport edges via the bounded band posture; Bebas display
  // sizing with the poster tracking.
  pageHeadSurface: "#f1dfb8",
  pageHeadRule: "3px solid #d9a62b",
  pageHeadPosture: "band",
  pageHeadTitleSize: "2rem",
  headingLetterSpacing: "0.06em",

  // Olive-bordered option rows; selected = dark-green border over a
  // darker-cream fill.
  optionBorder: "2.5px solid #8b8b2e",
  optionSelectedBorderColor: "#2e4a34",
  optionSelectedSurface: "#ede3c2",

  // Booth check-in code block: putty surface, gold border.
  codeSurface: "#f1dfb8",
  codeBorder: "2.5px solid #d9a62b",

  // Completion CTAs: gold Newsletter and warm-orange Donate (the
  // poster's warm accent — garnish-tier, so it lives here rather
  // than as a brand base). Foregrounds are deepened past the mock's
  // pairings to clear WCAG AA for normal text: deep green on gold
  // (6.5:1), deep warm ink on orange (5.5:1) — the mock's
  // near-white-on-orange measured 2.9:1.
  ctaSurface: "#d9a62b",
  ctaFg: "#1c2e20",
  ctaWarmSurface: "#d9822b",
  ctaWarmFg: "#2a2016",

  // Sponsor attribution line — the poster's purple, label-only.
  sponsorLabel: "#6b4e8e",

  // Themable radii — the poster look is flatter than the platform
  // default; mock uses 10–14px rounding.
  panelRadius: "14px",
  panelRadiusMobile: "14px",
  cardRadius: "12px",
  controlRadius: "10px",
};
