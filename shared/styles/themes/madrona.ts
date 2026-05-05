import type { Theme } from "../types.ts";

/**
 * Madrona Music in the Playfield — first non-test per-event Theme
 * registered against the shared theme registry, landed by the
 * [Madrona demo-build epic](../../../docs/plans/epics/madrona-demo-build/epic.md)
 * M1 phase 1.1. Brand bases derive from the Madrona Neighborhood
 * Association's logo (committed at
 * [`apps/site/public/events/madrona/logo.png`](../../../apps/site/public/events/madrona/logo.png));
 * the seven letters of M-A-D-R-O-N-A each carry a distinct color, and
 * this Theme anchors on the M-blue as `primary`, the second-A red as
 * `secondary`, and the R-teal as `accent`. The three values are
 * pixel-sampled from the committed logo PNG.
 *
 * Typography reuses the same `--font-inter` (body) and
 * `--font-fraunces` (heading) `next/font` variables apps/site's root
 * layout exposes via `next/font/google` — per-event font selection is
 * post-epic per [`docs/styling.md`](../../../docs/styling.md), so the
 * Theme stays valid without pulling new font declarations into the
 * root layout.
 */
export const madronaTheme: Theme = {
  // Brand bases — Madrona indigo / red / teal anchored on the
  // logo's M, second-A, and R letters respectively. Neutrals
  // (text, muted, borders) carry the indigo undertone derived from
  // `primary`.
  bg: "#ffffff",
  surface: "#ffffff",
  surfaceStrong: "#ffffff",
  surfaceCard: "#ffffff",
  surfaceCardMuted: "#f3f1fa",
  text: "#1a1d33",
  muted: "#5b6280",
  border: "rgba(26,29,51,0.10)",
  borderSoft: "rgba(26,29,51,0.06)",
  borderMuted: "rgba(26,29,51,0.10)",
  primary: "#404e9d",
  secondary: "#cc2229",
  accent: "#84c2b6",
  whiteWarm: "#fefefe",
  whitePanel: "#ffffff",
  whiteTint: "#f8f8fb",

  // Brand-tied gradient stops and admin surfaces.
  pageGradientStart: "rgba(255,255,255,1)",
  pageGradientEnd: "rgba(243,241,250,0.96)",
  heroStart: "rgba(255,255,255,1)",
  heroEnd: "rgba(243,241,250,0.96)",
  adminInputSurface: "#ffffff",
  draftRowSurface: "#ffffff",

  // Typography — inherits apps/site's `next/font` Inter + Fraunces.
  bodyFontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
  headingFontFamily: "var(--font-fraunces), Georgia, serif",

  // Themable radii — match the existing test-event radii so the
  // Madrona render reads as platform-shaped without surprise.
  panelRadius: "12px",
  panelRadiusMobile: "12px",
  cardRadius: "8px",
  controlRadius: "6px",
};
