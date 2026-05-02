import type { CSSProperties, ReactNode } from "react";
import { themeToStyle } from "./themeToStyle.ts";
import type { Theme } from "./types.ts";

export type ThemeScopeProps = {
  theme: Theme;
  children: ReactNode;
};

/**
 * Universal React wrapper that emits a `Theme` as CSS custom
 * properties on a `<div>`. SSR-safe — no `'use client'`, no effects,
 * no state — so apps/site can render it as a server component and
 * apps/web can render it without hydration concerns.
 *
 * The wrapper element is a `<div>` rather than a Fragment because
 * CSS custom properties cascade through the DOM, not through React
 * Fragments. The class name `theme-scope` exists for layout
 * targeting from SCSS (e.g., a parent that wants to set `display:
 * contents` on it); it carries no styling itself.
 *
 * Brand-tied derived shades (`--primary-surface`, etc.) are not
 * Theme fields and are not emitted here — they are computed in
 * `:root` via `color-mix()` from the brand bases. See
 * [`docs/styling.md`](../../docs/styling.md) for the binding model.
 * Note: derived shades inherit the `:root`-substituted value into
 * descendants and do not re-evaluate against a `<ThemeScope>`'s
 * brand-base override. Direct `var(--primary)` consumers carry the
 * per-event Theme; derived-shade consumers carry the apps/web
 * `:root` warm-cream (or apps/site Sage Civic) defaults. Closing
 * this gap is tracked in
 * [`docs/plans/themescope-derived-shade-cascade.md`](../../docs/plans/themescope-derived-shade-cascade.md).
 *
 * Wiring sites:
 * - apps/web per-event admin (`/event/:slug/admin`) wires in M2
 *   phase 2.2
 * - apps/web event routes (game, redeem, redemptions) wire in
 *   demo-expansion epic M1 phase 1.1 (centralized in `App.tsx`'s
 *   routing dispatcher per the M1 phase 1.5 invariant)
 * - apps/site event landing wraps in M3 phase 3.1
 *
 * apps/site's root layout uses [`themeToStyle`](./themeToStyle.ts)
 * directly (without the wrapper `<div>`) to set CSS custom
 * properties on `<html>` — see "Theme route scoping" in the parent
 * epic for why the root layout is not a `<ThemeScope>` site.
 */
export function ThemeScope({ theme, children }: ThemeScopeProps) {
  return (
    <div className="theme-scope" style={themeToStyle(theme) as CSSProperties}>
      {children}
    </div>
  );
}
