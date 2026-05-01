import type { Theme } from "../types.ts";

/**
 * Harvest Block Party — first per-event Theme registered against the
 * shared theme registry (M3 phase 3.1.1, the Event Platform Epic).
 * Brand bases pick warm autumn pumpkin/amber/maple tones to read
 * obviously distinct from Sage Civic's cool sage/forest palette so a
 * reviewer can verify by eye that `<ThemeScope>` is acting on the
 * `/event/harvest-block-party` route.
 *
 * Typography reuses the same `--font-inter` (body) and
 * `--font-fraunces` (heading) `next/font` variables apps/site's root
 * layout exposes via `next/font/google` — per-event font selection is
 * post-epic per [`docs/styling.md`](../../../docs/styling.md), so the
 * Theme stays valid without pulling new font declarations into the
 * root layout.
 */
export const harvestBlockPartyTheme: Theme = {
  // Brand bases — warm autumn palette.
  bg: "#fdf3e8",
  surface: "#ffffff",
  surfaceStrong: "#ffffff",
  surfaceCard: "#ffffff",
  surfaceCardMuted: "#fbeedb",
  text: "#3a2616",
  muted: "#7a5b3f",
  border: "rgba(58,38,22,0.10)",
  borderSoft: "rgba(58,38,22,0.08)",
  borderMuted: "rgba(58,38,22,0.10)",
  primary: "#b85c1c",
  secondary: "#9a4a13",
  accent: "#d4942b",
  whiteWarm: "#fffaf2",
  whitePanel: "#fffaf2",
  whiteTint: "#fff5e6",

  // Brand-tied gradient stops and admin surfaces.
  pageGradientStart: "rgba(253,243,232,1)",
  pageGradientEnd: "rgba(248,228,201,0.96)",
  heroStart: "rgba(253,243,232,1)",
  heroEnd: "rgba(248,228,201,0.96)",
  adminInputSurface: "#ffffff",
  draftRowSurface: "#ffffff",

  // Typography — inherits apps/site's `next/font` Inter + Fraunces.
  bodyFontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
  headingFontFamily: "var(--font-fraunces), Georgia, serif",

  // Themable radii — slightly tighter than Sage Civic so the radius
  // flow through the registry is visible in UI review.
  panelRadius: "12px",
  panelRadiusMobile: "12px",
  cardRadius: "8px",
  controlRadius: "6px",
};
