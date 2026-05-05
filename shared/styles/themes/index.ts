import type { Theme } from "../types.ts";
import { harvestBlockPartyTheme } from "./harvest-block-party.ts";
import { madronaTheme } from "./madrona.ts";
import { riversideJamTheme } from "./riverside-jam.ts";

/**
 * Per-event Theme registry. Populated as per-event themes land:
 * M3 phase 3.1.1 added the first test event theme
 * (`harvest-block-party`) alongside the rendering pipeline; M3
 * phase 3.2 added the second test event theme (`riverside-jam`) to
 * prove multi-theme rendering; the
 * [Madrona demo-build epic](../../../docs/plans/epics/madrona-demo-build/epic.md)
 * registered Madrona at `madrona` in its M1 phase 1.1 as the first
 * non-test per-event Theme. See
 * [m3-site-rendering.md](../../../docs/plans/archive/m3/m3-site-rendering.md)
 * for the M3 phase shape. Slug → Theme. Any slug not present here
 * resolves to the platform Theme via `getThemeForSlug`.
 *
 * Adding a new theme: see
 * [`docs/styling.md`](../../../docs/styling.md) "Procedure For Adding
 * A New Theme."
 */
export const themes: Record<string, Theme> = {
  "harvest-block-party": harvestBlockPartyTheme,
  "madrona": madronaTheme,
  "riverside-jam": riversideJamTheme,
};
