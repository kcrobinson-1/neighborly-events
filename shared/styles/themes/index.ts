import type { Theme } from "../types.ts";

/**
 * Per-event Theme registry. Populated as per-event themes land:
 * M3 phase 3.1 adds the first test event theme alongside the
 * rendering pipeline; M3 phase 3.2 adds the second test event
 * theme to prove multi-theme rendering; M4 phase 4.1 adds Madrona
 * at `madrona`. See [m3-site-rendering.md](../../../docs/plans/m3-site-rendering.md)
 * for the M3 phase shape. Slug → Theme. Empty in M1 phase 1.5.2 —
 * every slug resolves to the platform Theme via `getThemeForSlug`.
 *
 * Adding a new theme: see
 * [`docs/styling.md`](../../../docs/styling.md) "Procedure For Adding
 * A New Theme."
 */
export const themes: Record<string, Theme> = {};
