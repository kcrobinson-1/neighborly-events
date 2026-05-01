import type { Theme } from "../types.ts";

/**
 * Riverside Jam — second per-event Theme registered against the
 * shared theme registry (M3 phase 3.2, the Event Platform Epic).
 * Brand bases pick a cool maritime palette (deep teal primary, pale
 * sky-blue bg, warm amber accent) so the page reads obviously
 * distinct from both Sage Civic (cool sage-green) and Harvest Block
 * Party (warm pumpkin-amber). The contrast turns the
 * slug-agnostic-by-structure rendering pipeline 3.1 shipped into a
 * slug-agnostic-by-evidence claim a reviewer can verify by eye.
 *
 * Themable radii pick a third combination (20/14/8) distinct from
 * Sage Civic's 16/12/10 and Harvest's 12/8/6 so the radius flow
 * through the registry is visible across three Themes, not just two.
 *
 * Typography reuses the same `--font-inter` (body) and
 * `--font-fraunces` (heading) `next/font` variables apps/site's root
 * layout exposes via `next/font/google` — per-event font selection is
 * post-epic per [`docs/styling.md`](../../../docs/styling.md), so the
 * Theme stays valid without pulling new font declarations into the
 * root layout.
 */
export const riversideJamTheme: Theme = {
  // Brand bases — cool maritime palette.
  bg: "#eef4f7",
  surface: "#ffffff",
  surfaceStrong: "#ffffff",
  surfaceCard: "#ffffff",
  surfaceCardMuted: "#dde9ef",
  text: "#152a36",
  muted: "#4d6877",
  border: "rgba(21,42,54,0.10)",
  borderSoft: "rgba(21,42,54,0.08)",
  borderMuted: "rgba(21,42,54,0.10)",
  primary: "#1f5d72",
  secondary: "#174a5c",
  accent: "#d49b58",
  whiteWarm: "#f5fafc",
  whitePanel: "#f5fafc",
  whiteTint: "#e6f0f4",

  // Brand-tied gradient stops and admin surfaces.
  pageGradientStart: "rgba(238,244,247,1)",
  pageGradientEnd: "rgba(213,229,238,0.96)",
  heroStart: "rgba(238,244,247,1)",
  heroEnd: "rgba(213,229,238,0.96)",
  adminInputSurface: "#ffffff",
  draftRowSurface: "#ffffff",

  // Typography — inherits apps/site's `next/font` Inter + Fraunces.
  bodyFontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
  headingFontFamily: "var(--font-fraunces), Georgia, serif",

  // Themable radii — third combination distinct from Sage Civic
  // (16/12/10) and Harvest (12/8/6) so the radius flow through the
  // registry is visible in UI review across all three Themes.
  panelRadius: "20px",
  panelRadiusMobile: "20px",
  cardRadius: "14px",
  controlRadius: "8px",
};
