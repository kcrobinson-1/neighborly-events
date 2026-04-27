import type { Theme } from "../types.ts";

/**
 * Platform Sage Civic Theme. apps/site's root layout emits these as
 * inline CSS custom properties on `<html>`; `getThemeForSlug`
 * returns this Theme for any slug not registered in
 * [`themes/index.ts`](./index.ts) (i.e., every slug through M3 phase
 * 3.2's test events and through M4 phase 4.1 when Madrona registers).
 *
 * Source-of-truth values live in the parent epic
 * ([`docs/plans/event-platform-epic.md`](../../../docs/plans/event-platform-epic.md))
 * M1 phase 1.5 description; cross-referenced in
 * [`docs/styling.md`](../../../docs/styling.md). apps/web's `:root`
 * defaults (today's warm-cream values) are deliberately not driven
 * by this Theme — they live byte-identically in
 * [`apps/web/src/styles/_tokens.scss`](../../../apps/web/src/styles/_tokens.scss)
 * until M4 phase 4.1 wires apps/web event routes to ThemeScope.
 *
 * `bodyFontFamily` and `headingFontFamily` reference CSS variables
 * that apps/site sets via `next/font` on `<html>`; the values resolve
 * once those variables are in scope on the root element.
 */
export const platformTheme: Theme = {
  // Brand bases — Sage Civic palette.
  bg: "#f3f4ee",
  surface: "#ffffff",
  surfaceStrong: "#ffffff",
  surfaceCard: "#ffffff",
  surfaceCardMuted: "#ffffff",
  text: "#232a26",
  muted: "#5d6862",
  border: "rgba(35,42,38,0.10)",
  borderSoft: "rgba(35,42,38,0.08)",
  borderMuted: "rgba(35,42,38,0.10)",
  primary: "#2c5e4f",
  secondary: "#2c5e4f",
  accent: "#c46f3e",
  whiteWarm: "#ffffff",
  whitePanel: "#ffffff",
  whiteTint: "#ffffff",

  // Brand-tied gradient stops and admin surfaces.
  pageGradientStart: "rgba(243,244,238,1)",
  pageGradientEnd: "rgba(232,236,228,0.96)",
  heroStart: "rgba(243,244,238,1)",
  heroEnd: "rgba(232,236,228,0.96)",
  adminInputSurface: "#ffffff",
  draftRowSurface: "#ffffff",

  // Typography — `next/font` Inter (body) and Fraunces (heading).
  // The `--font-inter` / `--font-fraunces` variables are exposed by
  // apps/site's root layout via `next/font/google`'s `variable`
  // option; these values resolve to the loaded fonts at runtime.
  bodyFontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
  headingFontFamily: "var(--font-fraunces), Georgia, serif",

  // Themable radii — Sage Civic uses tighter radii than apps/web's
  // chunky warm-cream defaults.
  panelRadius: "16px",
  panelRadiusMobile: "16px",
  cardRadius: "12px",
  controlRadius: "10px",
};
