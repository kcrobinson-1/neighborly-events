import { themes } from "./themes/index.ts";
import { platformTheme } from "./themes/platform.ts";
import type { Theme } from "./types.ts";

/**
 * Resolves the Theme for an event slug. Returns the registered Theme
 * if the slug appears in [`themes/index.ts`](./themes/index.ts);
 * otherwise returns the platform Sage Civic Theme.
 *
 * In M1 phase 1.5.2 the registry is empty, so every slug resolves to
 * the platform Theme. Per-event themes register over time (test
 * events in M3 phase 3.2; Madrona in M4 phase 4.1) without changing
 * any consumer — the resolver picks them up by slug.
 */
export function getThemeForSlug(slug: string): Theme {
  return themes[slug] ?? platformTheme;
}
