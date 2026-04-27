import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Fraunces, Inter } from "next/font/google";

import { platformTheme, themeToStyle } from "../../../shared/styles";

import "./globals.css";

/**
 * Inter (body) and Fraunces (heading) loaded as variable fonts via
 * `next/font` with build-time download. The `variable` option
 * exposes the CSS custom property names the platform Sage Civic
 * Theme references (`var(--font-inter)`, `var(--font-fraunces)` —
 * see [`shared/styles/themes/platform.ts`](../../../shared/styles/themes/platform.ts)).
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Neighborly Events",
};

/**
 * Root layout — emits the Sage Civic platform Theme as inline-style
 * CSS custom properties on `<html>`, alongside `next/font`'s CSS
 * variable wiring via `className`. Routes outside `/event/:slug/*`
 * render against these defaults; M3 phase 3.1 wraps event landing
 * in `<ThemeScope>` to layer per-event Themes on top.
 *
 * apps/site is **not** a `<ThemeScope>` site at the root level per
 * the parent epic's "Theme route scoping" invariant — `<ThemeScope>`
 * is only used inside `/event/:slug/*` namespaces, and the root
 * layout sets the platform palette directly so routes that have
 * not yet wrapped (in 1.5.2, all of them) still render with Sage
 * Civic identity.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable}`}
      style={themeToStyle(platformTheme) as CSSProperties}
    >
      <body>{children}</body>
    </html>
  );
}
